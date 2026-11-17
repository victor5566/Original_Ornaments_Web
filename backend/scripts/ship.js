// Mark an order shipped and send its tracking number to PayPal, from backend/:
//   node scripts/ship.js OO-2026-0007 KPOST 1234567890123
//   node scripts/ship.js OO-2026-0007 "CJ Logistics" 1234567890 --notify
// The carrier is a PayPal carrier code (KPOST, KR_KOREA_POST, LOTTE, EMS, DHL, UPS, FEDEX…) or a name.
// --notify: PayPal also emails the buyer.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { pool } = require("../db/pool");
const { shipOrder } = require("../lib/operations");

const args = process.argv.slice(2);
const [number, carrier, trackingNumber] = args.filter((a) => !a.startsWith("--"));

(async () => {
  if (!trackingNumber) throw new Error("Usage: node scripts/ship.js <order number> <carrier> <tracking number> [--notify]");
  console.log(`PayPal: ${process.env.PAYPAL_ENV === "live" ? "LIVE" : "sandbox"}`);
  console.log(await shipOrder(number, { carrier, trackingNumber, notify: args.includes("--notify") }));
})()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
