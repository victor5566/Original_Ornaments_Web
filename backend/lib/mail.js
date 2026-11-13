// Order confirmation email. Settings come from backend/.env:
//   SMTP_HOST, SMTP_PORT (465 = TLS from the start, otherwise STARTTLS), SMTP_USER, SMTP_PASS,
//   MAIL_FROM ("Original Ornaments <hello@…>"), SITE_URL (for the order link, e.g. https://…)
// Without SMTP_HOST no mail is sent: the email is written to the server log instead.
const nodemailer = require("nodemailer");

const TZ = "Asia/Seoul";
let transport;

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

const won = (n, ko) => (ko ? `${Number(n).toLocaleString("ko-KR")}원` : `₩${Number(n).toLocaleString("en-US")}`);
const shortDate = (iso, ko) =>
  new Date(iso).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: ko ? "long" : "short", day: "numeric", timeZone: TZ });
const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);


function compose({ number, lang, quote: q, customer, address, settings, token }) {
  const ko = lang === "ko";
  const t = (en, k) => (ko ? k : en);
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  const blocks = [];
  const para = (text) => blocks.push({ type: "p", text });
  const rows = (items) => blocks.push({ type: "rows", items });

  para(t(`Hello ${customer.orderer_name},`, `${customer.orderer_name}님, 안녕하세요.`));
  para(t(`Thank you. We have received your order ${number}.`, `주문해 주셔서 감사합니다. 주문번호 ${number}로 접수되었습니다.`));
  if (q.phase === "preorder" && settings.ships_from) {
    const date = shortDate(settings.ships_from, ko);
    para(t(
      `This is a pre-order. Once production is done, it ships in its burgundy box from ${date}, in the order placed.`,
      `프리오더 주문입니다. 생산이 끝나면 버건디 상자에 담아 ${date}부터 주문 순서대로 보내 드릴게요.`
    ));
  }

  rows(q.lines.map((l) => [`${ko ? l.nameKo : l.name} × ${l.qty}`, won(l.lineTotal, ko)]));
  const totals = [[t("Subtotal", "상품 금액"), won(q.subtotal, ko)]];
  if (q.discount > 0) totals.push([t("Discount", "할인"), `−${won(q.discount, ko)}`]);
  totals.push([t("Shipping", "배송비"), q.shippingFee != null ? won(q.shippingFee, ko) : t("[To be confirmed]", "[추후 안내]")]);
  totals.push([t("Total", "합계"), won(q.total, ko)]);
  rows(totals);

  // Order notes: pre-order gift, gift wrapping, duties
  if (q.pouchGift?.eligible) {
    para(t("✦ Pre-order gift: each piece will be wrapped in a suede pouch.", "✦ 프리오더 증정: 모든 오너먼트를 스웨이드 파우치에 담아 드려요."));
  }
  if (customer.is_gift) {
    para(t("✦ Gift: the price will be left out of the box.", "✦ 선물 포장: 상자에 가격표를 넣지 않아요."));
  }
  if (customer.country !== "KR") {
    para("[Duties and taxes may apply outside Korea.]");
  }

  rows([
    [t("Ship to", "받는 분"), customer.recipient_name],
    [t("Address", "배송지"), address],
  ]);

  if (site) {
    para(t(`View your order: ${site}/order/${number}?t=${token}`, `주문 확인: ${site}/order/${number}?t=${token}`));
  }
  if (settings.contact_email) {
    para(t(`Questions? Reply to this email or write to ${settings.contact_email}.`, `문의는 ${settings.contact_email}로 보내 주세요.`));
  }
  para("Original Ornaments · Collect the Lights.");

  const subject = t(`Your Original Ornaments order ${number}`, `[Original Ornaments] 주문이 접수되었습니다 (${number})`);
  const text = blocks
    .map((b) => (b.type === "p" ? b.text : b.items.map(([a, v]) => `${a}: ${v}`).join("\n")))
    .join("\n\n");
  const html = `<div style="font-family:Georgia,serif;max-width:560px;color:#222;line-height:1.6">${blocks
    .map((b) =>
      b.type === "p"
        ? `<p>${escape(b.text)}</p>`
        : `<table style="width:100%;border-top:1px solid #ccc;margin:16px 0;border-collapse:collapse">${b.items
            .map(([a, v]) => `<tr><td style="padding:6px 0">${escape(a)}</td><td style="padding:6px 0;text-align:right">${escape(v)}</td></tr>`)
            .join("")}</table>`
    )
    .join("")}</div>`;
  return { subject, text, html };
}

async function sendOrderEmail(order) {
  const mail = compose(order);
  const smtp = getTransport();
  if (!smtp) {
    console.log(`Order ${order.number}: SMTP not set up, email not sent. It would read:\n${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  await smtp.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: order.customer.orderer_email,
    replyTo: order.settings.contact_email || undefined,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

module.exports = { sendOrderEmail, compose };
