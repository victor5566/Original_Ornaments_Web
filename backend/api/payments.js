// Paying an order with PayPal, in US dollars:
//   1. startPayPal: the server makes a PayPal order for orders.total, converted at store_settings.usd_krw_rate,
//      with the shipping address from the checkout form
//   2. the buyer approves it in the PayPal window
//   3. finishPayPal: the server captures it, checks the amount, marks the order "paid" and sends the email
// The amount always comes from the database, never from the browser.
// markPaid and applyRefund are shared with the webhooks (api/webhooks.js) and scripts/refund.js.
const { pool, transaction } = require("../../db");
const { loadSettings } = require("./catalog");
const { toUsd, InputError } = require("./pricing");
const { orderByToken, orderLines, placedInPreorder, addressLine, findOrder } = require("./orders");
const paypal = require("./paypal");
const { sendOrderEmail } = require("./mail");

const notFound = () => new InputError("Order not found.", "주문을 찾을 수 없어요.");
const alreadyPaid = () => new InputError("This order is already paid.", "이미 결제된 주문이에요.");
const expired = () =>
  new InputError(
    "This order was cancelled because it wasn't paid in time. Please place a new order.",
    "결제 기한이 지나 주문이 취소되었어요. 다시 주문해 주세요."
  );

const cents = (usd) => Math.round(Number(usd) * 100);
const dollars = (c) => (c / 100).toFixed(2);

// The order's address in PayPal's format. Korean road addresses
// start with the province and the city/district, which PayPal requires for KR.
function paypalShipping(o) {
  const cut = (s, n) => (s ? String(s).slice(0, n) : undefined);
  let area1 = o.region;
  let area2 = o.city;
  if (o.country === "KR") {
    const parts = (o.address1 || "").trim().split(/\s+/);
    area1 = parts[0];
    area2 = /[시군구]$/.test(parts[1] ?? "") ? parts[1] : parts[0]; 
  }
  return {
    type: "SHIPPING",
    name: { full_name: cut(o.recipient_name, 300) },
    address: {
      address_line_1: cut(o.address1, 300),
      address_line_2: cut(o.address2, 300),
      admin_area_2: cut(area2, 120),
      admin_area_1: cut(area1, 300),
      postal_code: cut(o.postal_code, 60),
      country_code: o.country,
    },
  };
}

async function startPayPal(number, token, lang) {
  const order = await orderByToken(number, token);
  if (!order) throw notFound();
  if (order.status === "cancelled") throw expired();
  if (order.status !== "pending") throw alreadyPaid();

  const settings = await loadSettings();
  const usd = toUsd(order.total, settings.usd_krw_rate);
  let created;
  try {
    created = await paypal.createOrder({ number, usd, lang, shipping: paypalShipping(order) });
  } catch (err) {
    // PayPal didn't accept the address: still let the customer pay, without it
    const addressProblem =
      err instanceof paypal.PayPalError && err.status === 422 && err.body?.details?.some((d) => d.field?.includes("/shipping"));
    if (!addressProblem) throw err;
    console.warn(`Order ${number}: PayPal refused the shipping address, paying without it:`, err.message);
    created = await paypal.createOrder({ number, usd, lang });
  }
  await pool.query(
    `INSERT INTO payments (order_id, provider, method, provider_order_id, amount, currency, exchange_rate, status, raw_response)
     VALUES ($1, 'paypal', 'paypal', $2, $3, 'USD', $4, 'ready', $5)`,
    [order.order_id, created.id, usd, settings.usd_krw_rate, created]
  );
  return { id: created.id };
}

// True when the capture took the whole amount of our payment row, in its currency
function captureMatches(payment, capture) {
  return (
    capture?.status === "COMPLETED" &&
    capture.amount?.currency_code === payment.currency &&
    cents(capture.amount?.value) === cents(payment.amount)
  );
}

// Records a completed capture. Returns true when this call moved the order to "paid"
// (so only one caller sends the email). A paid capture wins over the unpaid-order cleanup.
async function markPaid(db, payment, captureId, raw) {
  await db.query(
    `UPDATE payments SET status = 'approved', payment_key = $2, approved_at = COALESCE(approved_at, now()), raw_response = $3
      WHERE payment_id = $1 AND status IN ('ready', 'failed', 'approved')`,
    [payment.payment_id, captureId, raw]
  );
  const updated = await db.query(
    "UPDATE orders SET status = 'paid' WHERE order_id = $1 AND status IN ('pending', 'cancelled')",
    [payment.order_id]
  );
  return updated.rowCount === 1;
}

async function finishPayPal(number, token, paypalOrderId) {
  const order = await orderByToken(number, token);
  if (!order) throw notFound();
  if (order.status !== "pending") return findOrder(number, token); // paid or cancelled: just show it

  const { rows } = await pool.query(
    "SELECT * FROM payments WHERE order_id = $1 AND provider_order_id = $2",
    [order.order_id, typeof paypalOrderId === "string" ? paypalOrderId : ""]
  );
  const payment = rows[0];
  if (!payment) throw new InputError("This payment doesn't match the order.", "주문과 맞지 않는 결제예요.");

  let result;
  try {
    result = await paypal.captureOrder(paypalOrderId);
  } catch (err) {
    if (!(err instanceof paypal.PayPalError)) throw err;
    await pool.query("UPDATE payments SET status = 'failed', raw_response = $2 WHERE payment_id = $1", [payment.payment_id, err.body]);
    const e = new InputError(
      "PayPal couldn't take the payment. Please try again, or use another card or account.",
      "PayPal 결제가 완료되지 않았어요. 다시 시도하거나 다른 카드·계정을 사용해 주세요.",
      "payment"
    );
    e.retry = err.issue === "INSTRUMENT_DECLINED";
    throw e;
  }

  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  if (result.status !== "COMPLETED" || !captureMatches(payment, capture)) {
    await pool.query("UPDATE payments SET status = 'failed', raw_response = $2 WHERE payment_id = $1", [payment.payment_id, result]);
    console.error(`Order ${number}: PayPal capture not complete or amount differs`, capture?.status, capture?.amount);
    throw new InputError(
      "The payment could not be confirmed. Please contact us before trying again.",
      "결제를 확인하지 못했어요. 다시 시도하기 전에 문의해 주세요.",
      "payment"
    );
  }

  const markedPaid = await transaction((db) => markPaid(db, payment, capture.id, result));

  // Only the request that marked the order paid sends the email (two captures at once send it once)
  if (markedPaid) {
    sendPaidEmail(order, payment.amount).catch((err) =>
      console.error(`Order ${number}: confirmation email not sent:`, err.message)
    );
  }
  return findOrder(number, token);
}

// Saves a PayPal refund (from scripts/refund.js or a webhook; the same refund twice is saved once),
// then sets the payment and order status from the refunds that went through:
//   all of it back -> payments "cancelled", orders "refunded"; part of it -> payments "partial_cancelled".
// reason: "refund" (we gave it back) or "reversal" (PayPal took it back, e.g. a chargeback).
async function applyRefund(db, payment, { id, status, usd, currency, reason, note, raw }) {
  await db.query(
    `INSERT INTO refunds (payment_id, provider_refund_id, amount, currency, status, reason, note, raw_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (provider_refund_id) DO UPDATE SET status = EXCLUDED.status, raw_response = EXCLUDED.raw_response`,
    [payment.payment_id, id, usd, currency || "USD", String(status || "pending").toLowerCase(), reason, note ?? null, raw]
  );
  const { rows } = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS done FROM refunds WHERE payment_id = $1 AND status = 'completed'",
    [payment.payment_id]
  );
  const done = cents(rows[0].done);
  if (done <= 0) return { refunded: "0.00", full: false };
  const full = done >= cents(payment.amount);
  await db.query(
    `UPDATE payments SET status = $2::varchar, cancelled_at = CASE WHEN $2::varchar = 'cancelled' THEN now() ELSE cancelled_at END
      WHERE payment_id = $1`,
    [payment.payment_id, full ? "cancelled" : "partial_cancelled"]
  );
  if (full) await db.query("UPDATE orders SET status = 'refunded' WHERE order_id = $1", [payment.order_id]);
  return { refunded: dollars(done), full };
}

// The confirmation email, built from the saved order
async function sendPaidEmail(order, usd) {
  const settings = await loadSettings();
  const lines = await orderLines(order.order_id);
  const intlUndecided = order.country !== "KR" && settings.shipping_fee_intl == null;
  await sendOrderEmail({
    number: order.order_number,
    lang: order.lang,
    quote: {
      phase: placedInPreorder(order) ? "preorder" : "launch",
      lines,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: intlUndecided ? null : order.shipping_fee,
      total: order.total,
      pouchGift: { eligible: order.pouch_gift },
    },
    usd,
    customer: order,
    address: addressLine(order),
    settings,
    token: order.access_token,
  });
}

module.exports = { startPayPal, finishPayPal, markPaid, captureMatches, applyRefund, sendPaidEmail, paypalShipping, cents, dollars };
