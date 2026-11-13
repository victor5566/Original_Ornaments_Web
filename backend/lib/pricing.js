// Prices a cart from the database. The browser only sends product codes and quantities;
// every price is looked up here.
const { pool } = require("../db/pool");
const { loadSettings, unitPrice } = require("./catalog");

const MAX_QTY = 20;
const MAX_LINES = 30;

// A problem with what the customer sent: answered with 400 and a message in their language
class InputError extends Error {
  constructor(en, ko, field) {
    super(en);
    this.ko = ko ?? en;
    this.field = field;
  }
}

// [{ sku, qty }] from the request -> merged, checked list
function readItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new InputError("Your cart is empty.", "장바구니가 비어 있어요.");
  if (items.length > MAX_LINES) throw new InputError("Too many items in the cart.", "장바구니에 상품이 너무 많아요.");
  const merged = new Map();
  for (const item of items) {
    const sku = typeof item?.sku === "string" ? item.sku.trim() : "";
    const qty = item?.qty;
    if (!sku || sku.length > 50 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new InputError("A cart item is not valid.", "장바구니 상품 정보가 올바르지 않아요.");
    }
    merged.set(sku, Math.min((merged.get(sku) ?? 0) + qty, MAX_QTY));
  }
  return [...merged].map(([sku, qty]) => ({ sku, qty }));
}

// After launch: launch_discount_percent off the single designs when the cart holds at least
// launch_discount_min_pieces single pieces. Sets and the full collection already have their own
// price, so they get nothing extra ("discounts don't stack"). No discount during the pre-order.
function discountFor(lines, settings) {
  if (settings.phase !== "launch") return 0;
  const singles = lines.filter((l) => l.kind === "single");
  const pieces = singles.reduce((n, l) => n + l.qty, 0);
  if (pieces < settings.launch_discount_min_pieces) return 0;
  const amount = singles.reduce((n, l) => n + l.lineTotal, 0);
  return Math.round((amount * settings.launch_discount_percent) / 100);
}

// Shipping for a country. null when the country isn't known yet (cart page on the English site)
// or the international rate hasn't been decided.
function shippingFor(country, goods, settings) {
  if (!country) return null;
  if (country === "KR") {
    const free = settings.free_shipping_over != null && goods > settings.free_shipping_over;
    return free ? 0 : settings.shipping_fee_kr;
  }
  return settings.shipping_fee_intl;
}

// Returns the quote, plus `products` (sku -> row) for saving an order.
// Codes that aren't on sale are listed in `missing` and left out of the totals.
// `country` (ISO code, or null) decides the shipping fee.
async function quote(rawItems, country = null, db = pool) {
  const items = readItems(rawItems);
  const settings = await loadSettings(db);
  const { rows } = await db.query(
    `SELECT p.product_id, p.product_code, p.type, p.name_en, p.name_ko, p.price, p.preorder_price,
            COALESCE((SELECT SUM(quantity) FROM set_items s WHERE s.set_product_id = p.product_id), 1)::int AS pieces
       FROM products p
      WHERE p.product_code = ANY($1) AND p.active`,
    [items.map((i) => i.sku)]
  );
  const products = new Map(rows.map((r) => [r.product_code, r]));

  const lines = [];
  const missing = [];
  for (const item of items) {
    const p = products.get(item.sku);
    if (!p) {
      missing.push(item.sku);
      continue;
    }
    const price = unitPrice(p, settings.phase);
    lines.push({
      sku: p.product_code,
      kind: p.type,
      name: p.name_en,
      nameKo: p.name_ko ?? p.name_en,
      qty: item.qty,
      pieces: p.pieces * item.qty,
      unitPrice: price,
      lineTotal: price * item.qty,
    });
  }

  const pieces = lines.reduce((n, l) => n + l.pieces, 0);
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const discount = discountFor(lines, settings);
  const shippingFee = shippingFor(country, subtotal - discount, settings); // null: shown as "to be confirmed"
  const needed = Math.max(0, settings.pouch_min_pieces - pieces);

  return {
    quote: {
      phase: settings.phase,
      lines,
      missing,
      pieces,
      subtotal,
      discount,
      shippingFee,
      total: subtotal - discount + (shippingFee ?? 0),
      pouchGift: settings.phase === "preorder" ? { eligible: needed === 0, needed } : null,
    },
    products,
    settings,
  };
}

module.exports = { quote, InputError };
