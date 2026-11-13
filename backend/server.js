const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const api = require("./app");

const PORT = Number(process.env.SERVE_PORT) || 3000;
const BUILD = path.join(__dirname, "..", "client", "build");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null,
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "https://t1.kakaocdn.net"],
        frameSrc: ["https://postcode.map.kakao.com", "http://postcode.map.kakao.com"],
        styleSrcAttr: ["'unsafe-inline'"],
      },
    },
    strictTransportSecurity: false,
  })
);
app.use(api);
if (fs.existsSync(BUILD)) {
  app.use(express.static(BUILD));
  app.get("*", (req, res) => res.sendFile(path.join(BUILD, "index.html")));
} else {
  console.warn(`No site build in ${BUILD}: serving the API only (run npm run build first)`);
}

app.listen(PORT, () => console.log(`Original Ornaments listening on http://localhost:${PORT}`));
