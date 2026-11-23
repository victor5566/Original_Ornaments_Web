// Cancel PayPal orders left unpaid for UNPAID_ORDER_HOURS (default 24), from the repo root:
//   npm run cancel-unpaid
// server.js also does this every hour by itself.
require("../app"); // first: makes client/node_modules resolvable and loads backend/.env
const { pool } = require("../../db");
const { cancelUnpaidOrders, UNPAID_HOURS } = require("../api/operations");

cancelUnpaidOrders()
  .then((numbers) => console.log(`Unpaid for over ${UNPAID_HOURS} h, cancelled: ${numbers.length ? numbers.join(", ") : "none"}`))
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
