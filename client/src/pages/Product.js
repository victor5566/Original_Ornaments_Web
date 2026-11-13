import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { PageState, Placeholder, QtyStepper, SparkleList } from "../components/Bits";
import { ExchangeModal, NacrePhotos, usePolicy } from "../components/ExchangePolicy";
import Ornament from "../components/Ornament";
import { useAddLabel, useOrderButtons } from "../components/SetCard";
import { useCatalog } from "../hooks/useCatalog";
import { useLang } from "../i18n/LangContext";
import { lastDay } from "../lib/format";
import NotFound from "./NotFound";

// Gallery views after the front image
const VIEWS = {
  en: ["Back", "Nacre close-up", "In hand", "On the tree"],
  ko: ["뒷면", "자개 결 접사", "손에 든 컷", "트리에 건 컷"],
};

export default function Product() {
  const { slug } = useParams();
  const { catalog, error } = useCatalog();
  if (!catalog) return <PageState error={error} />;

  const chapter = catalog.chapters.find((c) => c.designs.some((d) => d.slug === slug));
  const design = chapter?.designs.find((d) => d.slug === slug);
  if (!design) return <NotFound />;

  // key: a new design starts with quantity 1 and the first view
  return <ProductView key={slug} catalog={catalog} chapter={chapter} design={design} />;
}

function ProductView({ catalog, chapter, design }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const { lang, t, pick, won, shortDate } = useLang();
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const set = useOrderButtons(chapter.set.sku);
  const setAddLabel = useAddLabel(set.added);
  const preorder = catalog.phase === "preorder";
  const { preorder: dates, prices } = catalog;
  const NAME = design.name.toUpperCase();
  const chapterName = pick(chapter, "name");
  const views = VIEWS[lang];

  useEffect(() => {
    document.title = `${NAME} · Original Ornaments`;
  }, [NAME]);

  const addToCart = () => {
    add(design.sku, qty);
    navigate("/cart");
  };

  const start = shortDate(dates.start);
  const end = shortDate(lastDay(dates.end));
  const range = `${start}–${t(end.replace(/^\w+ /, ""), end.replace(/^\d+월 /, ""))}`;
  const ships = shortDate(dates.shipsFrom);
  const until = shortDate(lastDay(dates.end));

  return (
    <>
      <div className="oo-container">
        <nav aria-label={t("Breadcrumb", "위치")} className="oo-micro flex flex-wrap gap-2 !text-muted">
          <Link to="/#collection" className="underline underline-offset-2 hover:text-gold">
            {catalog.collection}
          </Link>
          <span aria-hidden="true">/</span>
          <span>
            Chapter {chapter.numeral} · {chapterName}
          </span>
          <span aria-hidden="true">/</span>
          <span className="text-strong">{NAME}</span>
        </nav>

        <div className="mt-6 grid gap-10 pb-24 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="relative flex aspect-square items-center justify-center bg-deep">
              {view === 0 ? (
                <Ornament slug={design.slug} name={design.name} className="w-[72%]" />
              ) : (
                <Placeholder label={views[view - 1]} className="size-[72%] rounded-full" />
              )}
              <p className="oo-micro absolute right-4 bottom-3 left-4 !text-[11px]">
                {t(
                  "[6-second product loop · light sweeps the nacre, then the ornament turns to its back]",
                  "[제품 영상 6초 루프 · 빛이 자개 위를 지나간 뒤 뒷면으로 돌아감]"
                )}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
              {[t("Front", "정면"), ...views].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setView(i)}
                  aria-label={t(`Show ${label.toLowerCase()}`, `${label} 보기`)}
                  aria-pressed={view === i}
                  className={`flex aspect-square items-center justify-center border p-1 ${
                    view === i ? "border-gold" : "border-dashed border-line-strong"
                  }`}
                >
                  {i === 0 ? (
                    <Ornament slug={design.slug} name="" className="w-[80%]" />
                  ) : (
                    <span className="oo-micro !text-[10px] leading-tight">[{label}]</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:max-w-md">
            <p className="oo-eyebrow">
              {catalog.year} · Chapter {chapter.numeral}
            </p>
            <h1 className="oo-product-name mt-4 uppercase">{design.name}</h1>
            <p className="oo-design-line mt-4 !text-2xl text-strong">{pick(design, "line")}</p>
            <p className="oo-lead mt-5 text-body">
              {pick(design, "story") || t(`[Story for ${NAME}: to be written]`, `[${NAME} 이야기: 작성 예정]`)}
            </p>

            <div className="mt-6 border border-line p-5">
              <p className="font-display text-2xl text-gold italic">{catalog.version.name}</p>
              <p className="oo-micro mt-1 !text-muted">{pick(catalog.version, "description")}</p>
            </div>

            <div className="mt-6 flex items-baseline justify-between border-t border-dark pt-6">
              <span className="oo-small text-muted">
                {preorder ? t("Pre-order price", "사전예약가") : t("Price", "판매가")}
              </span>
              <span className="oo-price-xl !text-3xl">{won(prices.current)}</span>
            </div>
            {preorder && (
              <p className="oo-micro mt-3 text-right !text-gold">
                {t(
                  `Pre-order price ${won(prices.singlePreorder)} · until ${until} · ${won(prices.single)} after launch`,
                  `사전예약가 ${won(prices.singlePreorder)} · ${until}까지 · 출시 후 판매가 ${won(prices.single)}`
                )}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <QtyStepper value={qty} onChange={setQty} />
              <button type="button" className="oo-btn oo-btn-gold flex-1" onClick={addToCart}>
                {t("Add to cart", "장바구니에 담기")}
              </button>
            </div>

            <SparkleList
              className="mt-6"
              itemClass="oo-caption !text-body"
              items={[
                preorder
                  ? t(
                      `Pre-order (${range}) orders ship from ${ships}, in the order they were placed.`,
                      `프리오더(${range}) 주문은 ${ships}부터 먼저 주문한 순서대로 보내 드립니다.`
                    )
                  : t("Ships in its burgundy box, in the order placed.", "버건디 상자에 담아 주문 순서대로 보내 드립니다."),
                t(
                  `Made in ${catalog.year} only. When the season ends, this design moves to the archive.`,
                  `${catalog.year}년에만 만드는 디자인입니다. 시즌이 끝나면 아카이브로 남습니다.`
                ),
                t(
                  "Arrives in a burgundy box with an 11 × 11 cm pamphlet inside.",
                  "버건디 상자에 담겨 갑니다. 상자 안에 11×11cm 팸플릿이 함께 들어 있습니다."
                ),
              ]}
            />

            <div className="mt-6 border border-line p-5">
              <p className="font-display text-xl text-gold italic">
                {pick(chapter.set, "name")} · {t(`${chapter.set.pieces} pieces`, `${chapter.set.pieces}개`)}
              </p>
              <p className="oo-micro mt-1 !text-muted">
                {chapter.designs.map((d) => d.name.toUpperCase()).join(" · ")} ·{" "}
                {t(
                  `4 suede pouches · ${won(chapter.set.price)} (10% off)`,
                  `스웨이드 파우치 4개 · ${won(chapter.set.price)} (10% 할인)`
                )}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <button type="button" className="oo-btn oo-btn-outline px-5 py-2 text-sm" onClick={set.order}>
                  {t("Order the set", "세트 바로 주문")}
                </button>
                <button type="button" className="oo-link oo-small" onClick={set.addOnly} aria-live="polite">
                  {setAddLabel}
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-dark pt-6">
              <h2 className="oo-label">{t("Details", "제품 정보")}</h2>
              <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2">
                {pick(catalog, "details").map(([term, value]) => (
                  <div key={term} className="contents">
                    <dt className="oo-caption">{term}</dt>
                    <dd className="oo-caption !text-body">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-6 border border-gold-line p-4">
              <p className="oo-caption font-medium !text-gold">
                {t("No two pieces of nacre are alike", "자개는 하나하나 다릅니다")}
              </p>
              <p className="oo-caption mt-1 !text-body">
                {t(
                  "Grain, color and natural lines or flecks vary from shell to shell. No piece will match the photos exactly, and this is not a defect.",
                  "결, 빛깔, 자연스러운 선과 점은 조개마다 다르게 나타납니다. 사진과 똑같은 제품은 없으며, 이는 불량이 아닙니다."
                )}{" "}
                <button type="button" className="oo-link" onClick={() => setPolicyOpen(true)}>
                  {t("See exchange policy", "교환 기준 보기")}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <CareAndExchange contactEmail={catalog.contactEmail} />
      <MoreFromChapter chapter={chapter} current={design.slug} />
      <ExchangeModal open={policyOpen} onClose={() => setPolicyOpen(false)} contactEmail={catalog.contactEmail} />
    </>
  );
}

function CareAndExchange({ contactEmail }) {
  const { t } = useLang();
  const policy = usePolicy();
  return (
    <section className="bg-deep py-20 sm:py-24">
      <div className="oo-container">
        <p className="oo-eyebrow">Care &amp; Exchange</p>
        <h2 className="oo-h2 mt-3">{t("Natural variation & exchanges", "자개 개체차와 교환 안내")}</h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h3 className="oo-label">{t("Same design, a light all its own.", "같은 디자인, 하나뿐인 빛")}</h3>
            <p className="oo-body mt-3 text-body">{policy.nacre}</p>
          </div>
          <NacrePhotos captionClass="!text-muted" />
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="border border-dark bg-black p-6">
            <h3 className="oo-label !text-base">
              {t("Natural variation (not eligible for exchange)", "자연스러운 개체차 (교환 대상 아님)")}
            </h3>
            <SparkleList items={policy.variation} className="mt-4" itemClass="oo-small text-body" />
          </div>
          <div className="border border-dark bg-black p-6">
            <h3 className="oo-label !text-base">{t("Damage & defects (free exchange)", "파손·불량 (무료 교환)")}</h3>
            <SparkleList items={policy.defects} className="mt-4" itemClass="oo-small text-body" />
          </div>
          <div className="bg-dark p-6">
            <h3 className="oo-label !text-base">{t("How to report", "접수 방법")}</h3>
            <SparkleList
              items={[policy.reportWithin, ...policy.howToReport(contactEmail)]}
              className="mt-4"
              itemClass="oo-small text-body"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MoreFromChapter({ chapter, current }) {
  const { t, pick } = useLang();
  const others = chapter.designs.filter((d) => d.slug !== current);
  const name = pick(chapter, "name");
  return (
    <section className="bg-black py-20 sm:py-24">
      <div className="oo-container">
        <h2 className="oo-h2">{t(`More lights from ${name}`, `${name}의 다른 빛`)}</h2>
        <ul className="mt-12 grid grid-cols-3 gap-4 sm:gap-10">
          {others.map((d) => (
            <li key={d.slug} className="text-center">
              <Link to={`/product/${d.slug}`} className="group block">
                <Ornament
                  slug={d.slug}
                  name={d.name}
                  className="mx-auto w-full max-w-48 transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <p className="oo-design-name mt-5 !text-sm sm:!text-lg">{d.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
