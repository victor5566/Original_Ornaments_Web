// The shop's JSON routes, mounted at /api: catalog, cart totals, orders, PayPal payment and sign-ups.
const express = require("express");
const { pool } = require("../../db");
const { loadCatalog } = require("../api/catalog");
const { quote } = require("../api/pricing");
const { createOrder, findOrder } = require("../api/orders");
const { subscribe } = require("../api/subscribers");
const { startPayPal, finishPayPal } = require("../api/payments");

const router = express.Router();

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

router.get("/health", handle(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, db: true });
}));

// Chapters, designs, sets and prices
router.get("/catalog", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await loadCatalog());
}));

// Cart totals. Body: { items: [{ sku, qty }], country } (country: ISO code or null; decides shipping)
router.post("/quote", handle(async (req, res) => {
  const country = typeof req.body?.country === "string" && /^[A-Z]{2}$/.test(req.body.country) ? req.body.country : null;
  const { quote: q } = await quote(req.body?.items, country);
  res.json(q);
}));

// Place an order. Body: { lang, items, gift, agreed, payment, customer: {...checkout form}, sameRecipient, shipAsGift }
// Answers with the order complete page data and a token for its private link.
router.post("/orders", rateLimit(10, 10), handle(async (req, res) => {
  res.status(201).json(await createOrder(req.body ?? {}));
}));

// The order complete page again (after a reload): /api/orders/<number>?t=<token>
router.get("/orders/:number", handle(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const order = await findOrder(req.params.number, req.query.t);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}));

// PayPal, step 1: a PayPal order for this order's total in USD. Answers { id } for the PayPal buttons.
router.post("/orders/:number/paypal", rateLimit(20, 10), handle(async (req, res) => {
  res.json(await startPayPal(req.params.number, req.query.t, req.body?.lang));
}));

// PayPal, step 2: after the buyer approves, take the money. Body: { lang, paypalOrderId }.
// Answers with the order complete page data (status "paid").
router.post("/orders/:number/paypal/capture", rateLimit(20, 10), handle(async (req, res) => {
  res.json(await finishPayPal(req.params.number, req.query.t, req.body?.paypalOrderId));
}));

// "Notify me" sign-up. Body: { lang, email, agreed }
router.post("/subscribe", rateLimit(5, 10), handle(async (req, res) => {
  await subscribe(req.body ?? {});
  res.status(201).json({ ok: true });
}));

module.exports = router;
