// The API, under /api. client/src/setupProxy.js mounts this app on the dev server,
// and server.js mounts it in production.
//   - routes/webhook.js: PayPal webhooks (raw body, so before express.json)
//   - routes/shop.js: catalog, cart totals, orders, PayPal payment, sign-ups
const path = require("path");
const Module = require("module");

const ROOT = path.join(__dirname, "..");

// backend/ and ../db.js sit outside client/, so let them resolve packages from client/node_modules
const CLIENT_MODULES = path.join(ROOT, "client", "node_modules");
if (!(process.env.NODE_PATH || "").split(path.delimiter).includes(CLIENT_MODULES)) {
  process.env.NODE_PATH = [CLIENT_MODULES, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();
}

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const { InputError } = require("./api/pricing");
const webhookRoutes = require("./routes/webhook");
const shopRoutes = require("./routes/shop");

const app = express();

app.disable("x-powered-by");

const api = express.Router();

api.use(webhookRoutes);
api.use(express.json({ limit: "20kb" }));
api.use(shopRoutes);

api.use((req, res) => res.status(404).json({ message: "Not found" }));


api.use((err, req, res, next) => {
  const ko = req.body?.lang === "ko";
  if (err instanceof InputError) {
    return res.status(400).json({ message: ko ? err.ko : err.message, field: err.field, retry: err.retry || undefined });
  }
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ message: "The request could not be read." });
  }
  console.error(`${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    message: ko ? "잠시 후 다시 시도해 주세요. (서버 오류)" : "Something went wrong on our side. Please try again.",
  });
});

app.use("/api", api);

module.exports = app;
