const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const api = require("./app"); // first: makes client/node_modules resolvable
const express = require("express");
const helmet = require("helmet");

const PORT = Number(process.env.SERVE_PORT) || 3000;
const BUILD = path.join(__dirname, "..", "client", "build");

const app = express();

// A fresh nonce for every page. The PayPal SDK adds inline scripts and styles; it marks them with this
// nonce (read from <meta name="csp-nonce">), so the policy allows them without allowing any inline code.
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});
const nonce = (req, res) => `'nonce-${res.locals.nonce}'`;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
        styleSrc: ["'self'", "https://fonts.googleapis.com", nonce],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "https://t1.kakaocdn.net", "https://www.paypal.com", "https://*.paypal.com", "https://*.paypalobjects.com", nonce],
        frameSrc: ["https://postcode.map.kakao.com", "http://postcode.map.kakao.com", "https://*.paypal.com"],
        connectSrc: ["'self'", "https://*.paypal.com"],
        imgSrc: ["'self'", "data:", "https://*.paypal.com", "https://*.paypalobjects.com"],
        styleSrcAttr: ["'unsafe-inline'"],
      },
    },
    strictTransportSecurity: false,
  })
);
app.use(api);
if (fs.existsSync(BUILD)) {
  app.use(express.static(BUILD, { index: false }));
  app.get("*", (req, res, next) => {
    fs.readFile(path.join(BUILD, "index.html"), "utf8", (err, page) => {
      if (err) return next(err);
      res.set("Cache-Control", "no-store");
      res.type("html").send(page.replace("<head>", `<head><meta name="csp-nonce" content="${res.locals.nonce}">`));
    });
  });
} else {
  console.warn(`No site build in ${BUILD}: serving the API only (run npm run build first)`);
}

app.listen(PORT, () => console.log(`Original Ornaments listening on http://localhost:${PORT}`));

// Every hour: cancel PayPal orders left unpaid for UNPAID_ORDER_HOURS (api/operations.js)
const { cancelUnpaidOrders, UNPAID_HOURS } = require("./api/operations");
const cleanUp = () =>
  cancelUnpaidOrders().then(
    (numbers) => numbers.length && console.log(`Unpaid for over ${UNPAID_HOURS} h, cancelled: ${numbers.join(", ")}`),
    (err) => console.error("Unpaid order cleanup failed:", err.message)
  );
setTimeout(cleanUp, 60 * 1000).unref();
setInterval(cleanUp, 60 * 60 * 1000).unref();
