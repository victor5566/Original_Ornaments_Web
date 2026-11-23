// PayPal webhooks: PayPal tells us about payments, refunds, chargebacks and disputes, including
// ones made outside this site (e.g. a refund from the PayPal dashboard).
//   POST /api/paypal/webhook (app.js). Register that URL in the PayPal developer dashboard
//   (Apps & Credentials > the app > Webhooks) and put its Webhook ID in backend/.env as PAYPAL_WEBHOOK_ID.
// Every event is checked with PayPal's signature before anything is changed, and saved once in
// payment_events (PayPal sends the same event again until we answer 200).
const crypto = require("crypto");
const zlib = require("zlib");
const { transaction } = require("../../db");
const { orderById } = require("./orders");
const { markPaid, captureMatches, applyRefund, sendPaidEmail } = require("./payments");

// PayPal's signing certificates, by URL. Only https URLs on paypal.com are fetched.
const certs = new Map();
async function certificate(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !(u.hostname === "paypal.com" || u.hostname.endsWith(".paypal.com"))) {
    throw new Error(`Webhook certificate URL not on paypal.com: ${u.hostname}`);
  }
  const hit = certs.get(u.href);
  if (hit && Date.now() < hit.validTo) return hit.cert;
  const res = await fetch(u, { redirect: "error" });
  if (!res.ok) throw new Error(`Webhook certificate download failed: ${res.status}`);
  const cert = new crypto.X509Certificate(await res.text());
  const validTo = Date.parse(cert.validTo);
  if (!(Date.parse(cert.validFrom) <= Date.now() && Date.now() < validTo)) throw new Error("Webhook certificate is not valid now");
  if (certs.size > 20) certs.clear();
  certs.set(u.href, { cert, validTo });
  return cert;
}

// PayPal's self-verification: SHA256withRSA over "<transmission id>|<time>|<webhook id>|<CRC32 of the raw body>"
async function verifySignature(headers, raw, { webhookId = process.env.PAYPAL_WEBHOOK_ID, getCert = certificate } = {}) {
  if (!webhookId) {
    console.error("PayPal webhook received, but PAYPAL_WEBHOOK_ID is not set in backend/.env");
    return false;
  }
  const id = headers["paypal-transmission-id"];
  const time = headers["paypal-transmission-time"];
  const certUrl = headers["paypal-cert-url"];
  const sig = headers["paypal-transmission-sig"];
  const algo = headers["paypal-auth-algo"];
  if (!id || !time || !certUrl || !sig || (algo && algo !== "SHA256withRSA")) return false;
  const message = `${id}|${time}|${webhookId}|${zlib.crc32(raw)}`;
  const cert = await getCert(certUrl);
  return crypto.verify("sha256", Buffer.from(message), cert.publicKey, Buffer.from(sig, "base64"));
}

// The capture a refund or reversal belongs to (its "up" link), or the resource itself
function captureIdOf(resource) {
  const up = resource?.links?.find((l) => l.rel === "up" && /\/captures\//.test(l.href));
  return up ? up.href.match(/\/captures\/([^/?]+)/)[1] : resource?.id;
}

async function paymentWhere(db, column, value) {
  if (typeof value !== "string" || !value) return null;
  const { rows } = await db.query(`SELECT * FROM payments WHERE ${column} = $1`, [value]);
  return rows[0] ?? null;
}

// One event, inside a transaction. Returns what to do after the commit (the paid email).
async function apply(db, event) {
  const r = event.resource ?? {};
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      // Normally finishPayPal has done this already; this catches a capture whose answer we missed
      const payment = await paymentWhere(db, "provider_order_id", r.supplementary_data?.related_ids?.order_id);
      if (!payment) return { note: "no matching payment" };
      if (!captureMatches(payment, r)) {
        console.error(`Webhook: capture ${r.id} doesn't match payment ${payment.payment_id}`, r.amount);
        return { orderId: payment.order_id, note: "amount differs" };
      }
      const markedPaid = await markPaid(db, payment, r.id, r);
      return { orderId: payment.order_id, email: markedPaid ? payment : null };
    }
    case "PAYMENT.CAPTURE.DENIED": {
      const payment = await paymentWhere(db, "provider_order_id", r.supplementary_data?.related_ids?.order_id);
      if (payment && payment.status === "ready") {
        await db.query("UPDATE payments SET status = 'failed', raw_response = $2 WHERE payment_id = $1", [payment.payment_id, r]);
      }
      return { orderId: payment?.order_id };
    }
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      const payment = await paymentWhere(db, "payment_key", captureIdOf(r));
      if (!payment) return { note: "no matching payment" };
      const reversal = event.event_type === "PAYMENT.CAPTURE.REVERSED";
      const result = await applyRefund(db, payment, {
        id: r.id,
        status: r.status || "COMPLETED",
        usd: r.amount?.value ?? payment.amount,
        currency: r.amount?.currency_code,
        reason: reversal ? "reversal" : "refund",
        note: r.note_to_payer,
        raw: r,
      });
      if (reversal) console.warn(`Order ${payment.order_id}: PayPal reversed the payment (chargeback?). Refunded so far: $${result.refunded}`);
      return { orderId: payment.order_id };
    }
    default: {
      // Disputes and anything else: saved in payment_events for us to look at
      const captureId = r.disputed_transactions?.[0]?.seller_transaction_id;
      const payment = await paymentWhere(db, "payment_key", captureId);
      if (event.event_type?.startsWith("CUSTOMER.DISPUTE")) {
        console.warn(`PayPal dispute ${r.dispute_id ?? ""} (${event.event_type}) for capture ${captureId ?? "?"}: check the PayPal Resolution Center`);
      }
      return { orderId: payment?.order_id };
    }
  }
}

// Handles a verified event. Returns false when it was already handled before.
async function handleEvent(event) {
  if (typeof event?.id !== "string" || typeof event.event_type !== "string") throw new Error("Not a PayPal event");
  const outcome = await transaction(async (db) => {
    const saved = await db.query(
      `INSERT INTO payment_events (provider_event_id, event_type, payload) VALUES ($1, $2, $3)
       ON CONFLICT (provider_event_id) DO NOTHING RETURNING payment_event_id`,
      [event.id, event.event_type, event]
    );
    if (saved.rowCount === 0) return null; // seen before
    const result = await apply(db, event);
    if (result.orderId) {
      await db.query("UPDATE payment_events SET order_id = $2 WHERE payment_event_id = $1", [saved.rows[0].payment_event_id, result.orderId]);
    }
    return result;
  });
  if (!outcome) return false;
  if (outcome.email) {
    const order = await orderById(outcome.email.order_id);
    sendPaidEmail(order, outcome.email.amount).catch((err) =>
      console.error(`Order ${order.order_number}: confirmation email not sent:`, err.message)
    );
  }
  return true;
}

module.exports = { verifySignature, handleEvent, captureIdOf };
