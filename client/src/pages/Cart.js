import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MAX_QTY, useCart } from "../cart/CartContext";
import { PageState, QtyStepper } from "../components/Bits";
import { ExchangeModal } from "../components/ExchangePolicy";
import Ornament from "../components/Ornament";
import { indexCatalog, useCatalog } from "../hooks/useCatalog";
import { useQuote } from "../hooks/useQuote";
import { useLang } from "../i18n/LangContext";

export default function Cart() {
  const { catalog, error } = useCatalog();
  const cart = useCart();
  const { ko, t, won, shortDate } = useLang();
  // The Korean site ships within Korea, so its cart can show the shipping fee; the English site asks for the country at checkout
  const { quote } = useQuote(cart.items, ko ? "KR" : null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const navigate = useNavigate();
  const index = useMemo(() => indexCatalog(catalog), [catalog]);

  if (!catalog) return <PageState error={error} />;

  const min = catalog.pouchGift.minPieces;
  const full = won(catalog.prices.fullCollection);
  const ships = shortDate(catalog.preorder.shipsFrom);
  const { minPieces: discountMin, percent } = catalog.discount;
  const freeOver = catalog.shipping.freeOver;

  return (
    <div className="oo-container pt-10 pb-24 sm:pt-16">
      <h1 className="oo-h1">{t("Your Cart", "장바구니")}</h1>

      {cart.items.length === 0 ? (
        <div className="mt-12 border-t border-dark pt-12">
          <p className="oo-lead text-muted">{t("Your cart is empty.", "장바구니가 비어 있어요.")}</p>
          <Link to="/#collection" className="oo-btn oo-btn-gold mt-6">
            {t("Choose your light", "올해의 빛 고르기")}
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_21rem] lg:gap-12">
          <div>
            {quote?.pouchGift && !quote.pouchGift.eligible && (
              <div className="flex flex-col gap-4 border border-gold-line p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="oo-small flex gap-3 text-strong">
                  <span aria-hidden="true" className="text-gold">
                    ✦
                  </span>
                  {t(
                    `Add ${quote.pouchGift.needed} more and we'll wrap each in a suede pouch. (Pre-order gift from ${min} pieces)`,
                    `${quote.pouchGift.needed}개 더 담으면 스웨이드 파우치에 담아 드려요. (프리오더 기간 ${min}개부터 증정)`
                  )}
                </p>
                <Link to="/#collection" className="oo-btn oo-btn-gold shrink-0 px-5 py-2.5 text-sm">
                  {t("Choose one more", "하나 더 고르기")}
                </Link>
              </div>
            )}
            {quote?.pouchGift?.eligible && (
              <p className="oo-small flex gap-3 border border-gold-line p-5 text-strong">
                <span aria-hidden="true" className="text-gold">
                  ✦
                </span>
                {t(
                  "Each piece will be wrapped in a suede pouch. (Pre-order gift)",
                  "모든 오너먼트를 스웨이드 파우치에 담아 드려요. (프리오더 증정)"
                )}
              </p>
            )}

            <ul className="mt-2">
              {cart.items.map((item) => {
                const product = index.get(item.sku);
                const line = quote?.lines.find((l) => l.sku === item.sku);
                return (
                  <CartLine
                    key={item.sku}
                    item={item}
                    product={product}
                    line={line}
                    year={catalog.year}
                    collection={catalog.collection}
                    onQty={(q) => cart.setQty(item.sku, q)}
                    onRemove={() => cart.remove(item.sku)}
                  />
                );
              })}
            </ul>

            <label className="oo-small mt-6 flex cursor-pointer items-center gap-3 text-strong">
              <input
                type="checkbox"
                checked={cart.gift}
                onChange={(e) => cart.setGift(e.target.checked)}
                className="size-5 accent-gold"
              />
              {t("This is a gift. Leave out the price.", "선물이에요. 가격표를 빼 주세요.")}
            </label>
          </div>

          <aside className="h-fit border border-dark bg-deep p-6 sm:p-8" aria-label={t("Order summary", "주문 요약")}>
            <h2 className="oo-label">{t("Order summary", "주문 요약")}</h2>
            <dl className="oo-small mt-5 space-y-3">
              <Row term={t("Subtotal", "상품 금액")} value={quote ? won(quote.subtotal) : "…"} />
              {quote?.discount > 0 && (
                <Row
                  term={t(`${percent}% off ${discountMin} or more`, `${discountMin}개 이상 ${percent}% 할인`)}
                  value={`−${won(quote.discount)}`}
                />
              )}
              <Row
                term={t("Shipping", "배송비")}
                value={quote?.shippingFee != null ? won(quote.shippingFee) : t("Calculated at checkout", "결제 단계에서 안내")}
              />
            </dl>

            <div className="oo-caption mt-4 space-y-0.5">
              {ko && freeOver != null && (
                <p className="mb-3">{`${won(freeOver)} 초과 주문 무료 배송 · 버건디 상자 기본 포함`}</p>
              )}
              {catalog.phase === "preorder" ? (
                <>
                  <p className="!text-gold">
                    {t(
                      `During pre-order: free suede pouches from ${min} pieces`,
                      `프리오더 기간: ${min}개부터 스웨이드 파우치 증정`
                    )}
                  </p>
                  <p className="!text-gold">
                    {t(
                      `After launch: ${percent}% off ${discountMin} or more · all 16 for ${full}`,
                      `출시 후: ${discountMin}개부터 ${percent}% · 16개 풀 컬렉션 ${full}`
                    )}
                  </p>
                </>
              ) : (
                <p className="!text-gold">
                  {t(
                    `${percent}% off ${discountMin} or more · all 16 for ${full}`,
                    `${discountMin}개부터 ${percent}% · 16개 풀 컬렉션 ${full}`
                  )}
                </p>
              )}
              <p>{t("Discounts don't stack", "할인은 중복되지 않아요")}</p>
            </div>
            {!ko && (
              <p className="oo-caption mt-4">
                Prices in Korean won (KRW). [Duties and taxes may apply outside Korea.] Burgundy box included.
              </p>
            )}

            <div className="mt-6 flex items-baseline justify-between border-t border-dark pt-6">
              <span className="oo-small text-strong">{t("Total", "합계")}</span>
              <span className="oo-price-l">{quote ? won(quote.total) : "…"}</span>
            </div>
            <button
              type="button"
              className="oo-btn oo-btn-gold mt-6 w-full py-3.5"
              disabled={!quote}
              onClick={() => navigate("/checkout")}
            >
              {t("Check out", "주문하기")}
            </button>
            {catalog.phase === "preorder" && (
              <p className="oo-caption mt-4 text-center">
                {t(
                  `Pre-order price ${won(catalog.prices.singlePreorder)} applied.`,
                  `사전예약가 ${won(catalog.prices.singlePreorder)}이 적용되었습니다.`
                )}
                <br />
                {t(`Ships from ${ships}, in order placed.`, `${ships}부터 주문 순서대로 보내 드립니다.`)}
              </p>
            )}

            <div className="oo-caption mt-6 border-t border-dark pt-6">
              {t(
                "Natural nacre varies in grain and color from piece to piece; this is not a defect. Damage or defects reported with photos within 48 hours of delivery are exchanged free.",
                "천연 자개라 결과 빛깔이 하나하나 다르며, 이는 불량이 아닙니다. 파손·불량은 배송 완료 후 48시간 안에 사진으로 접수하면 무료 교환됩니다."
              )}
              <br />
              <button type="button" className="oo-link mt-1" onClick={() => setPolicyOpen(true)}>
                {t("Exchange policy", "교환 기준")}
              </button>
            </div>
          </aside>
        </div>
      )}

      <ExchangeModal open={policyOpen} onClose={() => setPolicyOpen(false)} contactEmail={catalog.contactEmail} />
    </div>
  );
}

function Row({ term, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-strong">{term}</dt>
      <dd className="text-right text-strong">{value}</dd>
    </div>
  );
}

function CartLine({ item, product, line, year, collection, onQty, onRemove }) {
  const { t, pick, won } = useLang();
  const name = product ? pick(product, "name") : item.sku;
  const isSingle = product?.kind === "single";
  const subtitle = isSingle
    ? `Glow · ${year} ${collection}`
    : product?.kind === "set"
      ? t(`${product.pieces} pieces · ${product.chapterName}`, `${product.pieces}개 · ${product.chapterNameKo}`)
      : t(`${product?.pieces ?? 16} pieces · ${year} ${collection}`, `${product?.pieces ?? 16}개 · ${year} ${collection}`);

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-dark py-6">
      <Ornament slug={isSingle ? item.sku : null} name={isSingle ? name : t("Set", "세트")} className="w-24 shrink-0 sm:w-28" />
      <div className="min-w-0 flex-1">
        {isSingle ? (
          <Link to={`/product/${item.sku}`} className="oo-design-name !text-xl sm:!text-2xl hover:text-gold-yellow">
            {name}
          </Link>
        ) : (
          <p className="font-display text-xl text-gold italic sm:text-2xl">{name}</p>
        )}
        <p className="oo-small mt-1 text-body">{subtitle}</p>
        <button type="button" className="oo-caption mt-2 underline underline-offset-2 hover:text-gold" onClick={onRemove}>
          {t("Remove", "삭제")}
        </button>
      </div>
      <div className="flex w-full items-center justify-between gap-6 sm:w-auto">
        <QtyStepper value={item.qty} onChange={onQty} max={MAX_QTY} label={t(`Quantity of ${name}`, `${name} 수량`)} />
        <span className="oo-price-s min-w-24 text-right">{line ? won(line.lineTotal) : "…"}</span>
      </div>
    </li>
  );
}
