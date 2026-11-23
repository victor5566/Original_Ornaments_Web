// Store operations that run on the server only (no order link token): the unpaid-order cleanup
// (started by server.js) and the scripts in backend/scripts (refund, ship).
const { pool, transaction } = require("../../db");
const paypal = require("./paypal");
const { applyRefund, cents, dollars } = require("./payments");

const UNPAID_HOURS = Number(process.env.UNPAID_ORDER_HOURS) || 24;

// Cancels PayPal orders still unpaid after UNPAID_ORDER_HOURS (default 24). Skips an order whose
// buyer opened PayPal in the last hour. Orders saved before PayPal (payment_method not 'paypal')
// are left alone. Returns the cancelled order numbers.
async function cancelUnpaidOrders(hours = UNPAID_HOURS) {
  const { rows } = await pool.query(
    `UPDATE orders o SET status = 'cancelled'
      WHERE o.status = 'pending' AND o.payment_method = 'paypal'
        AND o.created_at < now() - make_interval(hours => $1)
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id
                         AND (p.payment_key IS NOT NULL OR p.created_at > now() - interval '1 hour'))
      RETURNING o.order_number`,
    [hours]
  );
  return rows.map((r) => r.order_number);
}

async function paidOrder(number) {
  const { rows } = await pool.query(
    `SELECT o.order_id, o.order_number, o.status AS order_status, o.total, p.*
       FROM orders o JOIN payments p ON p.order_id = o.order_id
      WHERE o.order_number = $1 AND p.payment_key IS NOT NULL
        AND p.status IN ('approved', 'partial_cancelled', 'cancelled')
      ORDER BY p.approved_at DESC LIMIT 1`,
    [number]
  );
  if (!rows[0]) throw new Error(`${number}: no PayPal payment taken for this order`);
  return rows[0];
}

async function refundable(payment) {
  const { rows } = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS used, COUNT(*)::int AS n FROM refunds WHERE payment_id = $1 AND status IN ('completed', 'pending')",
    [payment.payment_id]
  );
  return { left: cents(payment.amount) - cents(rows[0].used), count: rows[0].n };
}

// Refunds `usd` (e.g. "10.00"; all that is left when empty). dryRun: only says what it would do.
async function refundOrder(number, { usd, note, dryRun = true } = {}) {
  const payment = await paidOrder(number);
  const { left, count } = await refundable(payment);
  if (left <= 0) throw new Error(`${number}: already fully refunded`);
  const amount = usd == null ? left : cents(usd);
  if (!Number.isInteger(amount) || amount <= 0 || amount > left) {
    throw new Error(`${number}: the amount must be more than $0 and at most $${dollars(left)}`);
  }
  const plan = { number, captureId: payment.payment_key, paid: payment.amount, refund: dollars(amount), leftAfter: dollars(left - amount) };
  if (dryRun) return { ...plan, dryRun: true };

  const result = await paypal.refundCapture(payment.payment_key, {
    usd: dollars(amount),
    note,
    requestId: `refund-${payment.payment_id}-${count + 1}`,
  });
  const saved = await transaction((db) =>
    applyRefund(db, payment, {
      id: result.id,
      status: result.status,
      usd: result.amount?.value ?? dollars(amount),
      currency: result.amount?.currency_code,
      reason: "refund",
      note,
      raw: result,
    })
  );
  return { ...plan, paypalStatus: result.status, refundId: result.id, refundedSoFar: saved.refunded, full: saved.full };
}

// Sends the tracking number to PayPal (shown to the buyer there) and marks the order shipped
async function shipOrder(number, { carrier, trackingNumber, notify = false }) {
  if (!carrier || carrier.length > 50) throw new Error("Give the carrier: a PayPal code (KPOST, LOTTE, DHL, UPS, EMS…) or its name");
  if (!trackingNumber || trackingNumber.length > 50) throw new Error("Give the tracking number (50 characters at most)");
  const payment = await paidOrder(number);
  if (!["paid", "preparing", "shipped"].includes(payment.order_status)) {
    throw new Error(`${number}: the order is ${payment.order_status}, not ready to ship`);
  }
  const result = await paypal.addTracking(payment.provider_order_id, {
    captureId: payment.payment_key,
    trackingNumber,
    carrier,
    notify,
  });
  await pool.query(
    `UPDATE orders SET status = 'shipped', carrier = $2, tracking_number = $3, shipped_at = COALESCE(shipped_at, now())
      WHERE order_id = $1`,
    [payment.order_id, carrier, trackingNumber]
  );
  return { number, carrier, trackingNumber, paypalStatus: result.status };
}

module.exports = { cancelUnpaidOrders, refundOrder, shipOrder, UNPAID_HOURS };
