// Saves an order: checks the checkout form, prices the cart from the database and writes
// orders + order_items in one transaction. Payment is not connected yet, so orders stay "pending".
const crypto = require("crypto");
const { pool, transaction } = require("../db/pool");
const { quote, InputError } = require("./pricing");
const { sendOrderEmail } = require("./mail");

const COUNTRIES = new Set(["KR", "JP", "TW", "HK", "SG", "US", "CA", "GB", "AU"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENTS = {
  en: new Set(["card", "paypal", "applepay", "googlepay"]),
  ko: new Set(["card", "kakaopay", "naverpay", "tosspay"]),
};


function particle(word, withFinal, without) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code < 11172 && code % 28 !== 0 ? withFinal : without);
}

// Reads one text field from the form: trimmed, length-checked, required unless optional
function reader(form) {
  return (key, max, en, ko, { optional = false } = {}) => {
    const value = typeof form?.[key] === "string" ? form[key].trim() : "";
    if (!value) {
      if (optional) return null;
      throw new InputError(`Please enter ${en}.`, `${particle(ko, "을", "를")} 입력해 주세요.`, key);
    }
    if (value.length > max) {
      throw new InputError(`This field is too long (${max} characters at most).`, `${particle(ko || "입력한 내용", "이", "가")} 너무 길어요.`, key);
    }
    return value;
  };
}

// Checkout form -> columns of `orders`. The Korean and English forms ask for different fields.
// Set RELAXED to true to require only the name and email (handy for testing).
const RELAXED = false;

function readCustomer(body) {
  const form = body.customer;
  const field = reader(form);
  const ko = body.lang === "ko";
  const opt = { optional: RELAXED };
  const always = { optional: true };
  let c;

  if (ko) {
    const name = field("name", 100, "your name", "이름");
    const phone = field("phone", 30, "your phone number", "휴대폰 번호", opt);
    const same = body.sameRecipient !== false;
    c = {
      orderer_name: name,
      orderer_phone: phone,
      orderer_email: field("email", 255, "your email", "이메일"),
      recipient_name: same ? name : field("recipientName", 100, "the recipient's name", "받는 분 이름", opt) ?? name,
      recipient_phone: same ? phone : field("recipientPhone", 30, "the recipient's phone number", "받는 분 휴대폰 번호", opt),
      country: "KR",
      postal_code: field("postalCode", 20, "the postal code", "우편번호", opt),
      address1: field("address", 255, "the address", "주소", opt),
      address2: field("address2", 255, "", "", always),
      city: null,
      region: null,
      delivery_note: field("memo", 500, "", "", always),
    };
  } else {

    const first = field("firstName", 50, "the first name", "이름");
    const last = field("lastName", 50, "the last name", "성", opt);
    const shipName = [first, last].filter(Boolean).join(" ");
    const sender = body.shipAsGift === true ? field("senderName", 100, "your name", "보내는 분 이름") : null;
    const country = typeof form?.country === "string" ? form.country : "";
    if (!COUNTRIES.has(country)) throw new InputError("Please choose a country.", "국가를 선택해 주세요.", "country");
    c = {
      orderer_name: sender ?? shipName,
      orderer_phone: field("phone", 30, "", "", always),
      orderer_email: field("email", 255, "your email", "이메일"),
      recipient_name: shipName,
      recipient_phone: null,
      country,
      postal_code: field("postalCode", 20, "", "", always),
      address1: field("address", 255, "the address", "주소", opt),
      address2: field("address2", 255, "", "", always),
      city: field("city", 100, "the city", "도시", opt),
      region: field("state", 100, "", "", always),
      delivery_note: null,
    };
  }

  if (!EMAIL.test(c.orderer_email)) throw new InputError("Please check the email address.", "이메일 주소를 확인해 주세요.", "email");
  return { ...c, is_gift: body.gift === true || body.shipAsGift === true };
}

// The address as one line, for the order complete page
function addressLine(c) {
  if (c.country === "KR" && c.city == null) {
    return [c.postal_code && `(${c.postal_code})`, c.address1, c.address2].filter(Boolean).join(" ");
  }
  return [c.address1, c.address2, c.city, c.region, c.postal_code, c.country].filter(Boolean).join(", ");
}

// "OO-2026-0042": year (Korea time) + a counter that restarts every year. The counter row is
// locked until the order's transaction ends, so two orders never get the same number.
async function nextOrderNumber(db) {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date()));
  const { rows } = await db.query(
    `INSERT INTO order_counters (year, last_number) VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE SET last_number = order_counters.last_number + 1
     RETURNING last_number`,
    [year]
  );
  return `OO-${year}-${String(rows[0].last_number).padStart(4, "0")}`;
}

async function createOrder(body) {
  const lang = body?.lang === "ko" ? "ko" : "en";
  if (body.agreed !== true) {
    throw new InputError(
      "Please agree to the terms and the exchange policy.",
      "주문 내용과 교환 기준에 동의해 주세요.",
      "agree"
    );
  }
  const payment = PAYMENTS[lang].has(body.payment) ? body.payment : "card";
  const customer = readCustomer({ ...body, lang });
  const token = crypto.randomBytes(24).toString("hex");

  const order = await transaction(async (db) => {
    const { quote: q, products, settings } = await quote(body.items, customer.country, db);
    if (q.missing.length > 0 || q.lines.length === 0) {
      throw new InputError(
        "Some items in your cart are no longer available. Please check your cart.",
        "장바구니에 더 이상 판매하지 않는 상품이 있어요. 장바구니를 확인해 주세요."
      );
    }

    const number = await nextOrderNumber(db);
    const { rows } = await db.query(
      `INSERT INTO orders (order_number, lang, orderer_name, orderer_phone, orderer_email,
                           recipient_name, recipient_phone, country, postal_code, address1, address2,
                           city, region, delivery_note, subtotal, discount, shipping_fee, total,
                           pouch_gift, is_gift, payment_method, terms_agreed_at, access_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
               $19, $20, $21, now(), $22)
       RETURNING order_id`,
      [
        number, lang,
        customer.orderer_name, customer.orderer_phone, customer.orderer_email,
        customer.recipient_name, customer.recipient_phone, customer.country, customer.postal_code,
        customer.address1, customer.address2, customer.city, customer.region, customer.delivery_note,
        q.subtotal, q.discount, q.shippingFee ?? 0, q.total,
        q.pouchGift?.eligible === true, customer.is_gift, payment, token,
      ]
    );

    const id = rows[0].order_id;
    for (const line of q.lines) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_code, name_snapshot, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, products.get(line.sku).product_id, line.sku, line.name, line.unitPrice, line.qty, line.lineTotal]
      );
    }

    return {
      page: completePage({
        number,
        preorder: q.phase === "preorder",
        shipsFrom: settings.ships_from,
        lines: q.lines,
        pieces: q.pieces,
        total: q.total,
        pouchGift: q.pouchGift?.eligible === true,
        customer,
      }),
      email: { lang, quote: q, customer, address: addressLine(customer), settings, token },
    };
  });

  // The confirmation email goes out after the order is saved; a mail problem never fails the order
  sendOrderEmail({ number: order.page.number, ...order.email }).catch((err) =>
    console.error(`Order ${order.page.number}: confirmation email not sent:`, err.message)
  );
  return { ...order.page, token };
}

// What the order complete page shows
function completePage({ number, preorder, shipsFrom, lines, pieces, total, pouchGift, customer }) {
  return {
    number, preorder, shipsFrom, lines, pieces, total, pouchGift,
    isGift: customer.is_gift === true,
    shipTo: customer.recipient_name,
    address: addressLine(customer),
  };
}

// An order for its complete page, opened again from the link (/order/<number>?t=<token>).
// Returns null unless the token matches.
async function findOrder(number, token) {
  if (typeof number !== "string" || typeof token !== "string" || token.length !== 48) return null;
  const { rows } = await pool.query(
    `SELECT o.*, s.ships_from, s.preorder_end FROM orders o CROSS JOIN store_settings s WHERE o.order_number = $1`,
    [number]
  );
  const order = rows[0];
  if (!order?.access_token) return null;
  const a = Buffer.from(order.access_token);
  const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const items = await pool.query(
    `SELECT i.product_code, i.name_snapshot, i.unit_price, i.quantity, i.line_total,
            COALESCE(p.type, 'single') AS type, COALESCE(p.name_ko, i.name_snapshot) AS name_ko,
            COALESCE((SELECT SUM(quantity) FROM set_items s WHERE s.set_product_id = p.product_id), 1)::int AS pieces
       FROM order_items i LEFT JOIN products p ON p.product_id = i.product_id
      WHERE i.order_id = $1 ORDER BY i.order_item_id`,
    [order.order_id]
  );
  const lines = items.rows.map((r) => ({
    sku: r.product_code,
    kind: r.type,
    name: r.name_snapshot,
    nameKo: r.name_ko,
    qty: r.quantity,
    pieces: r.pieces * r.quantity,
    unitPrice: r.unit_price,
    lineTotal: r.line_total,
  }));
  return completePage({
    number: order.order_number,
    preorder: order.preorder_end != null && order.created_at < order.preorder_end, // placed before the pre-order closed
    shipsFrom: order.ships_from,
    lines,
    pieces: lines.reduce((n, l) => n + l.pieces, 0),
    total: order.total,
    pouchGift: order.pouch_gift,
    customer: order,
  });
}

module.exports = { createOrder, findOrder };
