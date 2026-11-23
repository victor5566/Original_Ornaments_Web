// Mark an order shipped and send its tracking number to PayPal, from the repo root:
//   npm run ship -- OO-2026-0007 KPOST 1234567890123
//   npm run ship -- OO-2026-0007 "CJ Logistics" 1234567890 --notify
// The carrier is a PayPal carrier code (KPOST, KR_KOREA_POST, LOTTE, EMS, DHL, UPS, FEDEX…) or a name.
// --notify: PayPal also emails the buyer.
require("../app"); // first: makes client/node_modules resolvable and loads backend/.env
const { pool } = require("../../db");
const { shipOrder } = require("../api/operations");

const args = process.argv.slice(2);
const [number, carrier, trackingNumber] = args.filter((a) => !a.startsWith("--"));

(async () => {
  if (!trackingNumber) throw new Error("Usage: npm run ship -- <order number> <carrier> <tracking number> [--notify]");
  console.log(`PayPal: ${process.env.PAYPAL_ENV === "live" ? "LIVE" : "sandbox"}`);
  console.log(await shipOrder(number, { carrier, trackingNumber, notify: args.includes("--notify") }));
})()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
