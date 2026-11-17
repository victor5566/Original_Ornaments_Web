// Cancel PayPal orders left unpaid for UNPAID_ORDER_HOURS (default 24), from backend/:
//   node scripts/cancel-unpaid.js
// server.js also does this every hour by itself.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { pool } = require("../db/pool");
const { cancelUnpaidOrders, UNPAID_HOURS } = require("../lib/operations");

cancelUnpaidOrders()
  .then((numbers) => console.log(`Unpaid for over ${UNPAID_HOURS} h, cancelled: ${numbers.length ? numbers.join(", ") : "none"}`))
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
