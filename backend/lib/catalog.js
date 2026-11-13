
const { pool } = require("../db/pool");

// Store settings. `phase` is the effective phase: once the pre-order end date has passed,
// the store switches to "launch" by itself, without anyone editing the database.
async function loadSettings(db = pool) {
  const { rows } = await db.query("SELECT * FROM store_settings LIMIT 1");
  const settings = rows[0];
  if (!settings) throw new Error("store_settings is empty: run backend/db/seed.sql");
  if (settings.phase === "preorder" && settings.preorder_end && Date.now() >= settings.preorder_end.getTime()) {
    settings.phase = "launch";
  }
  return settings;
}

// Unit price for a product row in the current phase
function unitPrice(product, phase) {
  return phase === "preorder" && product.preorder_price != null ? product.preorder_price : product.price;
}

async function loadCatalog() {
  const [settings, chapters, products, pieces] = await Promise.all([
    loadSettings(),
    pool.query("SELECT * FROM chapters ORDER BY sort_order, chapter_id"),
    pool.query("SELECT p.*, c.chapter_code FROM products p LEFT JOIN chapters c ON c.chapter_id = p.chapter_id WHERE p.active ORDER BY p.sort_order, p.product_id"),
    pool.query("SELECT set_product_id, SUM(quantity)::int AS pieces FROM set_items GROUP BY set_product_id"),
  ]);
  const piecesOf = new Map(pieces.rows.map((r) => [r.set_product_id, r.pieces]));

  const singles = products.rows.filter((p) => p.type === "single");
  const sets = products.rows.filter((p) => p.type === "set");
  const full = products.rows.find((p) => p.type === "full");
  const first = singles[0];

  const bundle = (p) =>
    p && {
      sku: p.product_code,
      name: p.name_en,
      pieces: piecesOf.get(p.product_id) ?? 0,
      price: unitPrice(p, settings.phase),
      ko: { name: p.name_ko ?? p.name_en },
    };

  return {
    collection: settings.collection,
    year: settings.year,
    phase: settings.phase,
    preorder: {
      start: settings.preorder_start?.toISOString() ?? null,
      end: settings.preorder_end?.toISOString() ?? null,
      shipsFrom: settings.ships_from,
    },
    prices: {
      single: first?.price ?? 0,
      singlePreorder: first?.preorder_price ?? first?.price ?? 0,
      chapterSet: sets[0]?.price ?? 0,
      fullCollection: full?.price ?? 0,
      current: first ? unitPrice(first, settings.phase) : 0,
    },
    pouchGift: { minPieces: settings.pouch_min_pieces },
    discount: { minPieces: settings.launch_discount_min_pieces, percent: settings.launch_discount_percent },
    shipping: {
      feeKr: settings.shipping_fee_kr,
      freeOver: settings.free_shipping_over, // Korea: free when the order is over this
      feeIntl: settings.shipping_fee_intl, // null: not decided yet
    },
    contactEmail: settings.contact_email,
    chapters: chapters.rows.map((c) => ({
      slug: c.chapter_code,
      numeral: c.numeral,
      cover: c.cover_code,
      name: c.name_en,
      intro: c.intro_en,
      storyLine: c.story_line_en,
      ko: { name: c.name_ko, intro: c.intro_ko, storyLine: c.story_line_ko },
      designs: singles
        .filter((p) => p.chapter_id === c.chapter_id)
        .map((p) => ({
          slug: p.url_code,
          sku: p.product_code,
          chapter: c.chapter_code,
          name: p.name_en,
          short: p.short_name ?? undefined,
          line: p.line_en,
          story: p.story_en ?? undefined,
          ko: { line: p.line_ko, story: p.story_ko ?? undefined },
        })),
      set: bundle(sets.find((s) => s.chapter_id === c.chapter_id)),
    })),
    full: bundle(full),
  };
}

module.exports = { loadCatalog, loadSettings, unitPrice };
