// "Notify me" sign-ups from the home page (The archive section): people who want an email
// when next year's light arrives. Signing up again with the same address only refreshes it,
// and re-subscribes someone who had opted out.
const { pool } = require("../db/pool");
const { InputError } = require("./pricing");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function subscribe(body) {
  const lang = body?.lang === "ko" ? "ko" : "en";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 255 || !EMAIL.test(email)) {
    throw new InputError("Please check the email address.", "이메일 주소를 확인해 주세요.", "email");
  }
  if (body.agreed !== true) {
    throw new InputError(
      "Please agree to receive the email.",
      "알림 수신에 동의해 주세요.",
      "agree"
    );
  }
  await pool.query(
    `INSERT INTO subscribers (email, lang, source, consented_at) VALUES ($1, $2, 'archive', now())
     ON CONFLICT ((lower(email))) DO UPDATE
       SET lang = EXCLUDED.lang, consented_at = now(), unsubscribed_at = NULL`,
    [email, lang]
  );
}

module.exports = { subscribe };
