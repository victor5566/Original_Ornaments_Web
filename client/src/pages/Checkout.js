import { useCallback, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { ErrorText, PageState } from "../components/Bits";
import { ExchangeModal } from "../components/ExchangePolicy";
import Ornament from "../components/Ornament";
import PostcodeSearch from "../components/PostcodeSearch";
import { indexCatalog, useCatalog } from "../hooks/useCatalog";
import { useQuote } from "../hooks/useQuote";
import { useLang } from "../i18n/LangContext";
import { postJson } from "../lib/api";

const COUNTRIES = [
  ["KR", "South Korea"],
  ["JP", "Japan"],
  ["TW", "Taiwan"],
  ["HK", "Hong Kong"],
  ["SG", "Singapore"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
];

// The English site takes international cards and wallets; the Korean site the Korean ones (from the Korean mockup)
const PAYMENTS = {
  en: [
    ["card", "Credit card"],
    ["paypal", "PayPal"],
    ["applepay", "Apple Pay"],
    ["googlepay", "Google Pay"],
  ],
  ko: [
    ["card", "신용카드"],
    ["kakaopay", "카카오페이"],
    ["naverpay", "네이버페이"],
    ["tosspay", "토스페이"],
  ],
};

const EMPTY = {
  // both forms
  email: "",
  phone: "",
  address: "",
  address2: "",
  postalCode: "",
  // English form
  country: "KR",
  firstName: "",
  lastName: "",
  city: "",
  state: "",
  senderName: "", // buyer's name when shipping to someone else as a gift
  // Korean form
  name: "",
  recipientName: "",
  recipientPhone: "",
  memo: "",
};

export default function Checkout() {
  const { catalog, error } = useCatalog();
  const cart = useCart();
  const { lang, ko, t, pick, won, shortDate } = useLang();
  const navigate = useNavigate();
  const index = useMemo(() => indexCatalog(catalog), [catalog]);

  const [form, setForm] = useState(EMPTY);
  // Shipping depends on the country: always Korea on the Korean site
  const { quote } = useQuote(cart.items, ko ? "KR" : form.country);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const closePostcode = useCallback(() => setPostcodeOpen(false), []);
  const pickAddress = useCallback(({ postalCode, address }) => {
    setForm((f) => ({ ...f, postalCode, address }));
    // Next: the detail address (apartment, unit)
    setTimeout(() => document.getElementById("address2")?.focus(), 0);
  }, []);
  const [shipAsGift, setShipAsGift] = useState(false);
  const [sameRecipient, setSameRecipient] = useState(true);
  const [payment, setPayment] = useState("card");
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  if (cart.items.length === 0 && !sending) return <Navigate to="/cart" replace />;
  if (!catalog) return <PageState error={error} />;

  const field = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  // Saves the order (POST /api/orders); the server checks the form and prices the cart.
  // Payment is not connected yet, so the order is saved as "pending".
  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setSendError(new Error(t("Please agree to the terms and the exchange policy.", "주문 내용과 교환 기준에 동의해 주세요.")));
      document.getElementById("agree")?.focus();
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const { token, ...order } = await postJson("/api/orders", {
        lang,
        items: cart.items.map(({ sku, qty }) => ({ sku, qty })),
        gift: cart.gift,
        agreed,
        payment,
        customer: form,
        sameRecipient,
        shipAsGift,
      });
      cart.clear();
      // The token makes the complete page's link private, and lets it reload
      navigate(`/order/${order.number}?t=${token}`, { replace: true, state: { order } });
    } catch (err) {
      setSending(false);
      setSendError(err);
      if (err.field) document.getElementById(err.field)?.focus();
    }
  };

  // Switching language can leave a payment id the other list doesn't have; fall back to card
  const payments = PAYMENTS[lang];
  const paymentLabel = (payments.find(([id]) => id === payment) ?? payments[0])[1];
  const abroad = !ko && form.country !== "KR";

  return (
    <form onSubmit={submit} className="oo-container grid gap-10 pt-6 pb-24 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <div>
        <h1 className="oo-h1 mt-4">{t("Checkout", "주문하기")}</h1>

        {ko ? (
          <KoreanAddressForm
            field={field}
            sameRecipient={sameRecipient}
            setSameRecipient={setSameRecipient}
            onFindAddress={() => setPostcodeOpen(true)}
          />
        ) : (
          <EnglishAddressForm field={field} shipAsGift={shipAsGift} setShipAsGift={setShipAsGift} />
        )}

        <fieldset className="mt-12">
          <legend className="oo-h3 !font-normal">{t("3. Payment", "3. 결제 수단")}</legend>
          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            role="radiogroup"
            aria-label={t("Payment method", "결제 수단")}
          >
            {payments.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={payment === id}
                onClick={() => setPayment(id)}
                className={`h-12 border text-sm font-medium transition-colors ${
                  payment === id ? "border-gold bg-dark text-strong" : "border-line text-body hover:border-line-strong"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="oo-caption mt-3">
            {t(
              "[Payment not connected yet: the order is saved without payment.]",
              "[결제는 아직 연결되지 않았어요. 주문만 저장됩니다.]"
            )}
          </p>
        </fieldset>
      </div>

      <aside className="h-fit border border-dark bg-deep p-6 sm:p-8 lg:sticky lg:top-6" aria-label={t("Your order", "주문 상품")}>
        <h2 className="oo-label">{t("Your order", "주문 상품")}</h2>
        <ul className="mt-5 space-y-4">
          {cart.items.map((item) => {
            const product = index.get(item.sku);
            const line = quote?.lines.find((l) => l.sku === item.sku);
            const single = product?.kind === "single";
            return (
              <li key={item.sku} className="flex items-center gap-4">
                <Ornament slug={single ? item.sku : null} name="" className="w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={single ? "oo-design-name !text-sm" : "font-display text-base text-gold italic"}>
                    {product ? pick(product, "name") : item.sku}
                  </p>
                  <p className="oo-micro">
                    {single ? "Glow" : t(`${product?.pieces ?? ""} pieces`, `${product?.pieces ?? ""}개`)} ·{" "}
                    {t("Qty", "수량")} {item.qty}
                  </p>
                </div>
                <span className="oo-small text-strong">{line ? won(line.lineTotal) : "…"}</span>
              </li>
            );
          })}
        </ul>

        <dl className="oo-small mt-6 space-y-2 border-t border-dark pt-6">
          <div className="flex justify-between">
            <dt>{t("Subtotal", "상품 금액")}</dt>
            <dd className="text-strong">{quote ? won(quote.subtotal) : "…"}</dd>
          </div>
          {quote?.discount > 0 && (
            <div className="flex justify-between">
              <dt>
                {t(
                  `${catalog.discount.percent}% off ${catalog.discount.minPieces} or more`,
                  `${catalog.discount.minPieces}개 이상 ${catalog.discount.percent}% 할인`
                )}
              </dt>
              <dd className="text-strong">−{won(quote.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{t("Shipping", "배송비")}</dt>
            <dd className="text-strong">
              {/* null: the international rate isn't decided yet */}
              {!quote ? "…" : quote.shippingFee != null ? won(quote.shippingFee) : t("[To be confirmed]", "[배송비]")}
            </dd>
          </div>
          {abroad && (
            <div className="flex justify-between gap-4">
              <dt>Duties and taxes</dt>
              <dd className="text-right text-strong">[Calculated by country]</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex items-baseline justify-between border-t border-dark pt-6">
          <span className="oo-small text-strong">{t("Total (KRW)", "합계")}</span>
          <span className="oo-price-l">{quote ? won(quote.total) : "…"}</span>
        </div>

        <label className="oo-caption mt-6 flex cursor-pointer gap-3 !text-body">
          <input
            id="agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setSendError(null);
            }}
            className="mt-0.5 size-4 shrink-0 accent-gold"
          />
          <span>
            {t(
              "I agree to the terms of service and privacy policy. I understand that natural variation in nacre is not a defect, and that damage or defects must be reported with photos within 48 hours of delivery to be exchanged.",
              "주문 내용, 이용약관, 개인정보 수집에 동의합니다. 천연 자개의 결과 빛깔 차이는 불량이 아니며, 파손·불량은 배송 완료 후 48시간 안에 사진으로 접수해야 교환됨을 확인했습니다."
            )}{" "}
            <button type="button" className="oo-link" onClick={() => setPolicyOpen(true)}>
              {t("Exchange policy", "교환 기준")}
            </button>
          </span>
        </label>

        {sendError && (
          <div className="mt-6">
            <ErrorText error={sendError} />
          </div>
        )}
        <button type="submit" className="oo-btn oo-btn-gold mt-6 w-full py-3.5" disabled={!quote || sending}>
          {sending
            ? t("Placing order…", "주문하는 중…")
            : t(`Pay with ${paymentLabel}`, `${paymentLabel}로 ${quote ? won(quote.total) : ""} 결제하기`)}
        </button>

        <p className="oo-caption mt-4 text-center">
          {quote?.phase === "preorder"
            ? t(
                `Pre-order price applied · ships from ${shortDate(catalog.preorder.shipsFrom)}, in order placed.`,
                `사전예약가 적용 · ${shortDate(catalog.preorder.shipsFrom)}부터 주문 순서대로 발송`
              )
            : t("Ships in order placed.", "주문 순서대로 발송")}{" "}
          {abroad && "[International shipping dates vary.]"}
        </p>
        <p className="oo-caption mt-4 text-center">
          <Link to="/cart" className="underline underline-offset-2 hover:text-gold">
            {t("Back to cart", "장바구니로 돌아가기")}
          </Link>
        </p>
      </aside>

      <ExchangeModal open={policyOpen} onClose={() => setPolicyOpen(false)} contactEmail={catalog.contactEmail} />
      <PostcodeSearch open={postcodeOpen} onClose={closePostcode} onSelect={pickAddress} />
    </form>
  );
}

// English site: contact, then an international address with country
function EnglishAddressForm({ field, shipAsGift, setShipAsGift }) {
  return (
    <>
      <fieldset className="mt-12">
        <legend className="oo-h3 !font-normal">1. Contact</legend>
        <div className="mt-6 space-y-5">
          <Field label="Email">
            <input required type="email" autoComplete="email" className="oo-field" {...field("email")} />
          </Field>
          <Field label="Phone">
            <input type="tel" autoComplete="tel" className="oo-field" {...field("phone")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-12">
        <legend className="oo-h3 !font-normal">2. Shipping address</legend>
        <div className="mt-6 space-y-5">
          <Field label="Country / region">
            <select autoComplete="country" className="oo-field" {...field("country")}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name">
              <input required autoComplete="given-name" className="oo-field" {...field("firstName")} />
            </Field>
            <Field label="Last name">
              <input required autoComplete="family-name" className="oo-field" {...field("lastName")} />
            </Field>
          </div>
          <Field label="Address">
            <input required autoComplete="address-line1" className="oo-field" {...field("address")} />
          </Field>
          <Field label="Apartment, suite, etc. (optional)">
            <input autoComplete="address-line2" className="oo-field" {...field("address2")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City">
              <input required autoComplete="address-level2" className="oo-field" {...field("city")} />
            </Field>
            <Field label="State / province">
              <input autoComplete="address-level1" className="oo-field" {...field("state")} />
            </Field>
            <Field label="Postal code">
              <input autoComplete="postal-code" className="oo-field" {...field("postalCode")} />
            </Field>
          </div>
          <label className="oo-small flex cursor-pointer items-center gap-3 text-strong">
            <input
              type="checkbox"
              checked={shipAsGift}
              onChange={(e) => setShipAsGift(e.target.checked)}
              className="size-5 accent-gold"
            />
            Ship to someone else as a gift
          </label>
          {shipAsGift && (
            <>
              <p className="oo-caption">Enter the recipient's name and address above. We'll leave the price out of the box.</p>
              <Field label="Your name (the sender)">
                <input required autoComplete="name" className="oo-field" {...field("senderName")} />
              </Field>
            </>
          )}
        </div>
      </fieldset>
    </>
  );
}

// Korean site: orderer, then recipient with a Korean address (postal code search, detail address, delivery memo)
function KoreanAddressForm({ field, sameRecipient, setSameRecipient, onFindAddress }) {
  return (
    <>
      <fieldset className="mt-12">
        <legend className="oo-h3 !font-normal">1. 주문하는 분</legend>
        <div className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="이름">
              <input required autoComplete="name" className="oo-field" {...field("name")} />
            </Field>
            <Field label="휴대폰 번호">
              <input required type="tel" autoComplete="tel" placeholder="010-0000-0000" className="oo-field" {...field("phone")} />
            </Field>
          </div>
          <Field label="이메일">
            <input required type="email" autoComplete="email" className="oo-field" {...field("email")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-12">
        <legend className="oo-h3 !font-normal">2. 받는 분</legend>
        <div className="mt-6 space-y-5">
          <label className="oo-small flex cursor-pointer items-center gap-3 text-strong">
            <input
              type="checkbox"
              checked={sameRecipient}
              onChange={(e) => setSameRecipient(e.target.checked)}
              className="size-5 accent-gold"
            />
            주문하는 분과 같아요
          </label>
          {!sameRecipient && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="받는 분 이름">
                <input required autoComplete="shipping name" className="oo-field" {...field("recipientName")} />
              </Field>
              <Field label="받는 분 휴대폰 번호">
                <input required type="tel" placeholder="010-0000-0000" className="oo-field" {...field("recipientPhone")} />
              </Field>
            </div>
          )}
          <Field label="우편번호">
            <div className="flex gap-3">
              <input required autoComplete="postal-code" className="oo-field" {...field("postalCode")} />
              <button
                type="button"
                className="oo-btn oo-btn-outline shrink-0 rounded-[2px] px-5 text-sm"
                onClick={onFindAddress}
              >
                주소 찾기
              </button>
            </div>
          </Field>
          <Field label="주소" id="address">
            <input required autoComplete="address-line1" className="oo-field" {...field("address")} />
          </Field>
          <Field label="상세 주소" id="address2">
            <input autoComplete="address-line2" className="oo-field" {...field("address2")} />
          </Field>
          <Field label="배송 메모" id="memo">
            <input placeholder="예: 문 앞에 놓아 주세요" className="oo-field" {...field("memo")} />
          </Field>
        </div>
      </fieldset>
    </>
  );
}

// Label above a field. The id comes from the field inside, or from `id` when the field is wrapped.
function Field({ label, id, children }) {
  const htmlFor = id || children.props.id || children.props.children?.[0]?.props?.id;
  return (
    <div>
      <label htmlFor={htmlFor} className="oo-small mb-2 block text-strong">
        {label}
      </label>
      {children}
    </div>
  );
}
