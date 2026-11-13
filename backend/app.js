// The API, under /api. client/src/setupProxy.js mounts this app on the dev server,
// and server.js mounts it in production.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const { pool } = require("./db/pool");
const { loadCatalog } = require("./lib/catalog");
const { quote, InputError } = require("./lib/pricing");
const { createOrder, findOrder } = require("./lib/orders");

const app = express();

app.disable("x-powered-by");

const api = express.Router();
api.use(express.json({ limit: "20kb" }));


const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

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
api.post("/orders", handle(async (req, res) => {
  res.status(201).json(await createOrder(req.body ?? {}));
}));

// The order complete page again (after a reload): /api/orders/<number>?t=<token>
api.get("/orders/:number", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const order = await findOrder(req.params.number, req.query.t);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}));

api.use((req, res) => res.status(404).json({ message: "Not found" }));


api.use((err, req, res, next) => {
  const ko = req.body?.lang === "ko";
  if (err instanceof InputError) {
    return res.status(400).json({ message: ko ? err.ko : err.message, field: err.field });
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
