// PayPal Orders API (v2). Settings come from backend/.env:
//   PAYPAL_ENV ("sandbox" or "live"), PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
const BASE = () =>
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cached = { token: null, until: 0 };

// An error from PayPal, with its error name and first issue (e.g. INSTRUMENT_DECLINED)
class PayPalError extends Error {
  constructor(status, body) {
    const issue = body?.details?.[0]?.issue;
    super(`PayPal ${status}: ${body?.name || "error"}${issue ? ` (${issue})` : ""}`);
    this.status = status;
    this.issue = issue || body?.name;
    this.body = body;
  }
}

async function accessToken() {
  if (cached.token && Date.now() < cached.until) return cached.token;
  const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("PayPal is not set up: add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to backend/.env");
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PayPalError(res.status, body);
  cached = { token: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return cached.token;
}

async function post(path, data, requestId) {
  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PayPalError(res.status, body);
  return body;
}

// A PayPal order for the amount the buyer will approve. `usd` is a string such as "18.64".
// `shipping` (optional): the address from our checkout form. PayPal shows it to the buyer, who can't
// change it, and keeps it on the transaction (Seller Protection needs the parcel sent there).
function createOrder({ number, usd, lang, shipping }) {
  return post("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: number,
        invoice_id: number, // PayPal refuses a second payment with the same invoice ID
        description: `Original Ornaments ${number}`,
        amount: { currency_code: "USD", value: usd },
        ...(shipping ? { shipping } : {}),
      },
    ],
    application_context: {
      brand_name: "Original Ornaments",
      shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
      user_action: "PAY_NOW",
      locale: lang === "ko" ? "ko-KR" : "en-US",
    },
  });
}

function captureOrder(paypalOrderId) {
  return post(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, null, `capture-${paypalOrderId}`);
}

// Gives money back for a capture. `usd` like "10.00"; leave it out to refund what is left.
// `requestId` makes a retry safe: PayPal answers the same request ID with the same refund.
function refundCapture(captureId, { usd, note, requestId }) {
  return post(
    `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    {
      ...(usd ? { amount: { currency_code: "USD", value: usd } } : {}),
      ...(note ? { note_to_payer: note } : {}),
    },
    requestId
  );
}

// The parcel's tracking number, shown to the buyer in PayPal. `carrier` is a PayPal carrier code
// (KPOST, LOTTE, DHL, UPS, EMS…); any other name is sent as OTHER with the name.
function addTracking(paypalOrderId, { captureId, trackingNumber, carrier, notify }) {
  const code = /^[A-Z0-9_]+$/.test(carrier) ? carrier : "OTHER";
  return post(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/track`, {
    capture_id: captureId,
    tracking_number: trackingNumber,
    carrier: code,
    ...(code === "OTHER" ? { carrier_name_other: carrier } : {}),
    notify_payer: notify === true,
  });
}

module.exports = { createOrder, captureOrder, refundCapture, addTracking, PayPalError };
