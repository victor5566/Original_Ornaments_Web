// PayPal webhooks (api/webhooks.js), mounted at /api before express.json: the signature covers the raw body.
// 400 for a bad signature; 500 makes PayPal send the event again later.
const express = require("express");
const { verifySignature, handleEvent } = require("../api/webhooks");

const router = express.Router();

router.post("/paypal/webhook", express.raw({ type: "application/json", limit: "100kb" }), async (req, res) => {
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

module.exports = router;
