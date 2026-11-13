import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorText, PageState, Placeholder, SparkleList } from "../components/Bits";
import Moon from "../components/Moon";
import Ornament from "../components/Ornament";
import SetCard, { useAddLabel, useDiscountNote, useOrderButtons } from "../components/SetCard";
import { useCatalog } from "../hooks/useCatalog";
import { useLang } from "../i18n/LangContext";
import { postJson } from "../lib/api";
import { lastDay } from "../lib/format";

const POEM = {
  en: [
    "On the longest night of the year, a small spell opens the forest path.",
    "Follow the reindeer to a castle where candles are lit and snow drifts past the glass.",
    "On Christmas Day in the morning, the white cat wanders to where the swans glide.",
    "Where the angel's lantern falls, the night becomes a cathedral of light.",
    "Mother-of-pearl remembers that light, and keeps it in rainbow colors.",
    "Choose this year's light, and add it to your collection.",
  ],
  ko: [
    "일 년 중 가장 긴 밤, 작은 마법 하나가 숲길을 엽니다.",
    "순록을 따라 닿은 성에는 촛불이 켜지고, 창밖엔 눈꽃이 내립니다.",
    "크리스마스 날 아침에, 하얀 고양이는 백조가 노래하듯 헤엄치는 곳으로.",
    "천사의 등불이 닿는 순간, 밤은 빛의 성당이 됩니다.",
    "자개는 그 밤의 빛을 기억해, 무지개색으로 간직합니다.",
    "올해의 빛 하나를 골라, 당신의 컬렉션에 더하세요.",
  ],
};

// Each chapter sits a shade deeper into burgundy than the one before
const CHAPTER_BG = ["bg-black", "bg-deep", "bg-dark", "bg-burgundy"];

export default function Home() {
  const { catalog, error } = useCatalog();
  if (!catalog) return <PageState error={error} />;

  return (
    <>
      <Hero catalog={catalog} />
      <Preorder catalog={catalog} />
      <Poem />
      <div id="collection" className="scroll-mt-4">
        {catalog.chapters.map((chapter, i) => (
          <Chapter key={chapter.slug} chapter={chapter} catalog={catalog} bg={CHAPTER_BG[i % CHAPTER_BG.length]} />
        ))}
      </div>
      <FullCollection catalog={catalog} />
      <OneOfAKind catalog={catalog} />
      <TheBox />
      <YourLights />
      <Archive />
    </>
  );
}

function Hero({ catalog }) {
  const { t } = useLang();
  const candle = catalog.chapters[1]?.designs[0];
  return (
    <section className="oo-container grid items-center gap-12 pt-10 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-16">
      <div>
        <p className="oo-eyebrow">{catalog.year} Christmas Collection</p>
        <h1 className="oo-hero mt-5">The Magical Night</h1>
        <p className="oo-lead mt-6 max-w-md font-serif text-body">
          {t(
            "On the longest night of the year, a magic quietly wakes. Choose this year's light from sixteen ornaments made of real mother-of-pearl.",
            "일 년 중 가장 긴 밤, 아무도 모르게 마법이 깨어납니다. 진짜 자개로 만든 열여섯 개의 빛 중 올해의 하나를 골라 보세요."
          )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#collection" className="oo-btn oo-btn-gold">
            {t("Choose your light", "올해의 빛 고르기")}
          </a>
          <Link to="/story" className="oo-btn oo-btn-outline">
            {t("Read the story", "이야기 보기")}
          </Link>
        </div>
        <p className="oo-tagline mt-8">Collect the Lights.</p>
      </div>
      <Moon className="mx-auto w-full max-w-[34rem]">
        {candle && <Ornament slug={candle.slug} name={candle.name} className="w-[78%]" />}
      </Moon>
    </section>
  );
}

function Preorder({ catalog }) {
  const { t, won, shortDate, dayDate } = useLang();
  const { preorder, prices } = catalog;
  const ends = dayDate(lastDay(preorder.end));
  const ships = shortDate(preorder.shipsFrom);
  return (
    <section className="oo-container pb-24">
      <p className="oo-eyebrow">Pre-order</p>
      <h2 className="oo-h2 mt-3">{t("One pre-order in November", "11월, 한 번의 프리오더")}</h2>
      <p className="oo-small mt-2 text-muted">
        {t(`Ships from ${ships}, in the order placed.`, `${ships}부터 주문하신 순서대로 보내 드립니다.`)}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="bg-rose p-6 sm:p-8">
          <p className="oo-micro uppercase tracking-[0.2em] !text-gold">{t("Pre-order", "프리오더")}</p>
          <p className="oo-lead mt-3 text-strong">
            {dayDate(preorder.start)} – {ends}
          </p>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-2xl text-strong">
              {t(`Pre-order price ${won(prices.singlePreorder)}`, `사전예약가 ${won(prices.singlePreorder)}`)}
            </span>
            <span className="oo-micro !text-muted">{t(`Ends ${ends}`, `${ends} 마감`)}</span>
          </p>
          <SparkleList
            className="mt-5"
            itemClass="oo-caption !text-muted"
            items={[
              t(`The ${catalog.year} designs are made this year only`, `${catalog.year}년 디자인은 올해만 만듭니다`),
              t("Ships in the order placed", "먼저 주문한 순서대로 발송"),
              t(`Shipping begins ${ships}`, `발송 시작 ${ships}`),
            ]}
          />
        </div>
        <div className="bg-burgundy p-6 sm:p-8">
          <p className="oo-micro uppercase tracking-[0.2em] !text-gold">{t("After launch", "출시 후")}</p>
          <p className="oo-lead mt-3 text-strong">{t("Once the pre-order closes", "프리오더 마감 이후")}</p>
          <p className="mt-4 font-display text-2xl text-strong">
            {t(`Price ${won(prices.single)}`, `판매가 ${won(prices.single)}`)}
          </p>
        </div>
      </div>
    </section>
  );
}

function Poem() {
  const { lang } = useLang();
  return (
    <section className="bg-gradient-to-b from-deep to-burgundy/70 py-24 text-center sm:py-32">
      <div className="oo-container">
        <img src="/brand/star.png" alt="" className="mx-auto h-8 w-auto" />
        <div
          className={`mt-8 space-y-1 text-strong ${
            lang === "ko" ? "font-serif text-base leading-loose sm:text-lg" : "font-display text-lg italic sm:text-xl"
          }`}
        >
          {POEM[lang].map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="oo-tagline mt-8">Collect the Lights.</p>
      </div>
    </section>
  );
}

function Chapter({ chapter, catalog, bg }) {
  const { t, pick, won } = useLang();
  return (
    <section className={`${bg} py-20 sm:py-24`} aria-labelledby={`chapter-${chapter.slug}`}>
      <div className="oo-container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="oo-eyebrow">Chapter {chapter.numeral}</p>
            <h2 id={`chapter-${chapter.slug}`} className="oo-h2 mt-3">
              {pick(chapter, "name")}
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="oo-small text-body">{pick(chapter, "intro")}</p>
            <p className="oo-micro mt-1">{pick(catalog, "setNote")}</p>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {chapter.designs.map((d) => (
            <li key={d.slug} className="text-center">
              <Link to={`/product/${d.slug}`} className="group block">
                <Ornament
                  slug={d.slug}
                  name={d.name}
                  className="mx-auto w-full max-w-56 transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <p className="oo-design-name mt-6 !text-base sm:!text-lg">{d.name}</p>
              </Link>
              <p className="oo-design-line mt-2 !text-base text-body">{pick(d, "line")}</p>
              <p className="oo-micro mt-2">
                {catalog.phase === "preorder" ? t("Pre-order", "사전예약가") : t("Price", "판매가")}{" "}
                {won(catalog.prices.current)}
              </p>
            </li>
          ))}
        </ul>

        <SetCard set={chapter.set} contents={pick(catalog, "setContents")} className="mt-14" />
      </div>
    </section>
  );
}

function FullCollection({ catalog }) {
  const { t, won } = useLang();
  const { order, addOnly, added } = useOrderButtons(catalog.full.sku);
  const discountNote = useDiscountNote();
  const addLabel = useAddLabel(added);
  const n = catalog.full.pieces;
  return (
    <section className="bg-burgundy pb-24">
      <div className="oo-container grid items-center gap-10 border-t border-gold-line/30 pt-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="oo-eyebrow">The full collection</p>
          <h2 className="oo-h2 mt-3 !text-[2rem]">{t(`The full collection · ${n} pieces`, `전체 컬렉션 · ${n}개`)}</h2>
          <p className="oo-small mt-3 text-body">
            {t("All four chapter sets in one large outer box.", "네 챕터 세트를 큰 외박스 하나에 담아 보냅니다.")}
          </p>
          <SparkleList
            className="mt-4"
            itemClass="oo-caption !text-muted"
            items={[
              t(`All ${n} designs of ${catalog.year}`, `${catalog.year}년 디자인 ${n}개 모두`),
              t("Four chapter sets in one outer box", "챕터 세트 4개를 외박스 하나에"),
              t("Private sale: early access to next year's edition", "Private sale: 내년 에디션을 먼저 살 수 있는 권리"),
            ]}
          />
        </div>
        <Placeholder
          label={t(
            "Image\nFull collection: four sets in the outer box",
            "이미지 자리\n풀 컬렉션 2단 싸바리 박스\n16개가 2×2로 놓인 모습 · 큰 2단 싸바리 박스 · 큰 리본"
          )}
          className="aspect-[4/3]"
        />
        <div className="md:text-right">
          <p className="oo-price-xl">{won(catalog.full.price)}</p>
          <p className="oo-micro mt-2">{discountNote}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 md:justify-end">
            <button type="button" className="oo-btn oo-btn-gold px-5 py-2.5 text-sm" onClick={order}>
              {t(`Order all ${n}`, "전체 바로 주문")}
            </button>
            <button type="button" className="oo-link oo-small" onClick={addOnly} aria-live="polite">
              {addLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OneOfAKind({ catalog }) {
  const { t, pick, won } = useLang();
  const y = catalog.year;
  const points = [
    [
      t("Real mother-of-pearl", "진짜 자개"),
      t(
        "Every shell has its own grain, so a different rainbow appears at every angle of light.",
        "조개 한 장 한 장의 결이 달라, 빛을 받는 각도마다 다른 무지개가 떠오릅니다."
      ),
    ],
    [
      t("A gold-foil back", "금박으로 새긴 뒷면"),
      t(
        `On the front, mother-of-pearl that turns to rainbow as the light moves. On the back, our mark and the year ${y} in gold foil.`,
        `앞면에는 빛 따라 무지개빛으로 변하는 자개를, 뒷면에는 금박 로고와 ${y}을 새겼습니다.`
      ),
    ],
    [
      t("This year only", "올해만의 빛"),
      t(
        `The sixteen designs of ${y} are made this year only. When the season ends, they move to the archive.`,
        `${y}년의 열여섯 디자인은 올해만 만듭니다. 시즌이 끝나면 아카이브로 남습니다.`
      ),
    ],
  ];
  return (
    <section className="bg-cream py-20 text-plum sm:py-24">
      <div className="oo-container">
        <p className="oo-eyebrow !text-crimson">One of a kind</p>
        <h2 className="oo-h2 mt-3 !text-plum">{t("Same design, but one-of-a-kind", "같은 디자인, 하나뿐인 빛")}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {points.map(([title, text]) => (
            <div key={title} className="border-t border-plum/30 pt-5">
              <h3 className="font-display text-xl text-plum">{title}</h3>
              <p className="oo-small mt-2 text-plum/80">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 bg-burgundy p-6 text-strong sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-3xl italic">The {y} Light</p>
            <p className="oo-micro mt-1 !text-muted">{pick(catalog.version, "description")}</p>
          </div>
          <p className="font-display text-xl sm:text-2xl">
            {t(
              `Pre-order ${won(catalog.prices.singlePreorder)} · ${won(catalog.prices.single)} after launch`,
              `사전예약가 ${won(catalog.prices.singlePreorder)} · 출시 후 ${won(catalog.prices.single)}`
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function TheBox() {
  const { t } = useLang();
  return (
    <section className="bg-deep py-20 sm:py-24">
      <div className="oo-container grid items-center gap-10 md:grid-cols-2">
        <Placeholder
          label={t("Photo\nThe burgundy box, lid open", "사진\n뚜껑을 연 버건디 상자")}
          src="/photos/box.jpg"
          className="aspect-square"
        />
        <div>
          <p className="oo-eyebrow">The box</p>
          <h2 className="oo-h2 mt-3 !text-[2rem]">{t("The light begins before you open it", "열기 전부터 시작되는 빛")}</h2>
          <p className="oo-small mt-3 text-body">
            {t(
              "Every ornament arrives in a burgundy box. Beneath the insert sits an 11 × 11 cm pamphlet.",
              "모든 오너먼트는 버건디 상자에 담겨 갑니다. 상자 인서트 아래에는 11×11cm 팸플릿이 함께 들어 있습니다."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function YourLights() {
  const { t } = useLang();
  const tag = <span className="text-gold">#collectthelights</span>;
  return (
    <section className="bg-black py-20 sm:py-24">
      <div className="oo-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="oo-h2">{t("Your Lights", "당신의 빛")}</h2>
          <p className="oo-small text-muted">
            {t(<>Show us your light on the tree with {tag}</>, <>트리에 걸린 당신의 빛을 {tag} 로 보여 주세요.</>)}
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Placeholder key={n} label={t(`Customer photo ${n}`, `고객 사진 ${n}`)} className="aspect-[3/4]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Archive() {
  const { lang, t } = useLang();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Saves the address for next year's announcement (POST /api/subscribe)
  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      await postJson("/api/subscribe", { lang, email, agreed });
      setDone(true);
    } catch (err) {
      setError(err);
      document.getElementById(err.field === "agree" ? "archive-agree" : "archive-email")?.focus();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-dark py-20 text-center sm:py-28">
      <div className="oo-container">
        <p className="oo-eyebrow">The archive</p>
        <h2 className="oo-h2 mt-4">{t("2026, the first light", "2026, 첫 번째 빛")}</h2>
        <p className="oo-lead mx-auto mt-4 max-w-2xl text-[#e1d5c7]">
          {t(
            "A new light joins the archive every year. Be the first to know when next year's arrives.",
            "해마다 새로운 빛이 이곳에 하나씩 쌓입니다. 다음 해의 빛이 도착하면 가장 먼저 알려 드릴게요."
          )}
        </p>
        {done ? (
          <p className="oo-tagline mt-10">
            {t("Thank you. We'll write when the next light arrives.", "고맙습니다. 다음 빛이 도착하면 알려 드릴게요.")}
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-10 max-w-[33rem]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="archive-email" className="sr-only">
                {t("Email address", "이메일 주소")}
              </label>
              <input
                id="archive-email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                placeholder={t("Email address", "이메일 주소")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error?.field === "email" || undefined}
                className="oo-field h-12 rounded-full !border-gold !bg-transparent px-6"
              />
              <button type="submit" className="oo-btn oo-btn-gold h-12 shrink-0 px-8" disabled={sending}>
                {sending ? t("Sending…", "보내는 중…") : t("Notify me", "다음 빛 알림 받기")}
              </button>
            </div>
            <label className="oo-caption mt-4 flex cursor-pointer gap-3 px-1 text-left">
              <input
                id="archive-agree"
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-gold [color-scheme:dark]"
              />
              <span>
                {t(
                  "I agree to receive an email when next year's light arrives. We keep only your email address, use it only for this, and delete it when you unsubscribe.",
                  "다음 해의 빛 출시 소식을 이메일로 받는 데 동의합니다. (수집 항목: 이메일 주소 · 이용 목적: 신제품 출시 알림 · 보유 기간: 수신 거부 시까지)"
                )}
              </span>
            </label>
            <div className="mt-3 text-left">
              <ErrorText error={error} />
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
