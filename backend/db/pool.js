
const { Pool, types } = require("pg");


types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({ max: 10, connectionTimeoutMillis: 5000 });

pool.on("error", (err) => console.error("PostgreSQL pool error:", err.message));

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, transaction };
