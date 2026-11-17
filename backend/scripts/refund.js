// Refund a PayPal payment, from backend/:
//   node scripts/refund.js OO-2026-0007              shows what would be refunded (nothing is sent)
//   node scripts/refund.js OO-2026-0007 --yes        refunds everything that is left
//   node scripts/refund.js OO-2026-0007 10.00 --yes  refunds $10.00
//   add --note "Damaged in transit" for a message to the buyer
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { pool } = require("../db/pool");
const { refundOrder } = require("../lib/operations");

const args = process.argv.slice(2);
let yes = false;
let note;
const plain = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--yes") yes = true;
  else if (args[i] === "--note") note = args[++i];
  else plain.push(args[i]);
}
const [number, usd] = plain;

(async () => {
  if (!number) throw new Error("Usage: node scripts/refund.js <order number> [amount in USD] [--note \"…\"] [--yes]");
  if (usd != null && !/^\d+(\.\d{1,2})?$/.test(usd)) throw new Error(`Not an amount: ${usd}`);
  console.log(`PayPal: ${process.env.PAYPAL_ENV === "live" ? "LIVE (real money)" : "sandbox"}`);
  const result = await refundOrder(number, { usd, note, dryRun: !yes });
  console.log(result);
  if (!yes) console.log("Nothing was refunded. Add --yes to refund.");
})()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
