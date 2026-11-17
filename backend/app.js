// The API, under /api. client/src/setupProxy.js mounts this app on the dev server,
// and server.js mounts it in production.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const { pool } = require("./db/pool");
const { loadCatalog } = require("./lib/catalog");
const { quote, InputError } = require("./lib/pricing");
const { createOrder, findOrder } = require("./lib/orders");
const { subscribe } = require("./lib/subscribers");
const { startPayPal, finishPayPal } = require("./lib/payments");
const { verifySignature, handleEvent } = require("./lib/webhooks");

const app = express();

app.disable("x-powered-by");

const api = express.Router();

// PayPal webhooks (lib/webhooks.js). Before express.json: the signature covers the raw body.
// 400 for a bad signature; 500 makes PayPal send the event again later.
api.post("/paypal/webhook", express.raw({ type: "application/json", limit: "100kb" }), async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || !(await verifySignature(req.headers, req.body))) {
      console.warn("PayPal webhook with a missing or wrong signature: ignored");
      return res.status(400).json({ message: "Bad signature" });
    }
    await handleEvent(JSON.parse(req.body.toString("utf8")));
    res.json({ ok: true });
  } catch (err) {
    console.error("PayPal webhook failed:", err);
    res.status(500).json({ message: "Webhook failed" });
  }
});

api.use(express.json({ limit: "20kb" }));


const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

// At most `max` requests per visitor (IP address) in `minutes`. 
function rateLimit(max, minutes) {
  const windowMs = minutes * 60 * 1000;
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of hits) if (times.every((t) => now - t > windowMs)) hits.delete(ip);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const times = (hits.get(req.ip) ?? []).filter((t) => now - t < windowMs);
    if (times.length >= max) {
      const ko = req.body?.lang === "ko";
      return res.status(429).json({
        message: ko ? "잠시 후 다시 시도해 주세요." : "Too many tries. Please wait a few minutes and try again.",
      });
    }
    times.push(now);
    hits.set(req.ip, times);
    next();
  };
}

api.get("/health", handle(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, db: true });
}));

// Chapters, designs, sets and prices
api.get("/catalog", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await loadCatalog());
}));

// Cart totals. Body: { items: [{ sku, qty }], country } (country: ISO code or null; decides shipping)
api.post("/quote", handle(async (req, res) => {
  const country = typeof req.body?.country === "string" && /^[A-Z]{2}$/.test(req.body.country) ? req.body.country : null;
  const { quote: q } = await quote(req.body?.items, country);
  res.json(q);
}));

// Place an order. Body: { lang, items, gift, agreed, payment, customer: {...checkout form}, sameRecipient, shipAsGift }
// Answers with the order complete page data and a token for its private link.
api.post("/orders", rateLimit(10, 10), handle(async (req, res) => {
  res.status(201).json(await createOrder(req.body ?? {}));
}));

// The order complete page again (after a reload): /api/orders/<number>?t=<token>
api.get("/orders/:number", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const order = await findOrder(req.params.number, req.query.t);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}));

// PayPal, step 1: a PayPal order for this order's total in USD. Answers { id } for the PayPal buttons.
api.post("/orders/:number/paypal", rateLimit(20, 10), handle(async (req, res) => {
  res.json(await startPayPal(req.params.number, req.query.t, req.body?.lang));
}));

// PayPal, step 2: after the buyer approves, take the money. Body: { lang, paypalOrderId }.
// Answers with the order complete page data (status "paid").
api.post("/orders/:number/paypal/capture", rateLimit(20, 10), handle(async (req, res) => {
  res.json(await finishPayPal(req.params.number, req.query.t, req.body?.paypalOrderId));
}));

// "Notify me" sign-up. Body: { lang, email, agreed }
api.post("/subscribe", rateLimit(5, 10), handle(async (req, res) => {
  await subscribe(req.body ?? {});
  res.status(201).json({ ok: true });
}));

api.use((req, res) => res.status(404).json({ message: "Not found" }));


api.use((err, req, res, next) => {
  const ko = req.body?.lang === "ko";
  if (err instanceof InputError) {
    return res.status(400).json({ message: ko ? err.ko : err.message, field: err.field, retry: err.retry || undefined });
  }
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ message: "The request could not be read." });
  }
  console.error(`${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    message: ko ? "잠시 후 다시 시도해 주세요. (서버 오류)" : "Something went wrong on our side. Please try again.",
  });
});

app.use("/api", api);

module.exports = app;
