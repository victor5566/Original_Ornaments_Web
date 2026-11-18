import { useEffect, useRef } from "react";
import { useLang } from "../i18n/LangContext";
import { Placeholder, SparkleList } from "./Bits";

// Exchange policy text in both languages, shared by the product page section and the pop-up from Cart and Checkout.
// report: how to report, on the product page. reportModal: the same in the pop-up, whose last line also says
// damage after delivery isn't covered.
const POLICY = {
  en: {
    nacre:
      "Mother-of-pearl is the thin, luminous layer inside a shell. Its grain and color change from shell to shell, " +
      "and even across one shell, so no two pieces of the same design are alike. If the grain or color looks " +
      "different from the photos, that is a sign of real nacre, not a defect.",
    variation: [
      "Grain direction or pattern differs from the product photos",
      "Fine lines, flecks or faint color patches natural to nacre",
    ],
    defects: [
      "Breaks, cracks or chipped pieces",
      "Lifting nacre or a printing defect in the design",
      "A faulty hanging loop or ribbon",
      "The wrong design delivered",
    ],
    report: [
      "Photos of the box and both sides of the ornament uploaded in our request form within 48 hours of delivery get the fastest help.",
      "Damage or defects present on arrival are replaced with the same design or refunded. We cover shipping both ways.",
      "Change-of-mind returns are accepted within 7 days of delivery.",
    ],
    reportModal: [
      "Photos of the box and both sides of the ornament uploaded in our request form within 48 hours of delivery get the fastest help.",
      "Damage or defects present on arrival are replaced with the same design or refunded. We cover shipping both ways.",
      "Damage after delivery is not covered. Change-of-mind returns are accepted within 7 days of delivery.",
    ],
    photos: [
      {
        label: "Photo\nTiny dark flecks in the nacre",
        src: "/photos/nacre-flecks.webp",
        caption: "Tiny dark flecks are traces left as the shell grew",
      },
      {
        label: "Photo\nReal sample, close up",
        src: "/photos/nacre-close-up.webp",
        caption: "Real sample, close up. Wavy grain and fine lines are natural to nacre",
      },
      {
        label: "Photo\nTwo pieces of the same design side by side",
        src: "/photos/nacre-compare.webp",
        caption: "The same design, a different rainbow on each piece",
      },
    ],
  },
  ko: {
    nacre:
      "자개는 조개 껍데기 안쪽에서 빛을 내는 얇은 층입니다. 조개마다, 같은 조개 안에서도 자리마다 결과 색이 달라서 " +
      "같은 디자인이라도 똑같은 두 개는 없습니다. 사진과 결이나 빛깔이 달라 보이는 건 불량이 아니라 천연 자개라는 표시예요.",
    variation: ["결의 방향과 무늬가 상세 사진과 다른 경우", "자개 고유의 가는 선, 점, 미세한 색 얼룩"],
    defects: ["깨짐, 금, 조각 떨어짐", "자개 들뜸이나 디자인 인쇄 불량", "걸이 고리·리본 불량", "주문과 다른 디자인 배송"],
    report: [
      "받으신 뒤 48시간 안에 상자와 제품 앞뒷면 사진을 신청 창에 올려 주시면 가장 빠르게 처리해 드립니다.",
      "받을 때 이미 있던 파손·불량은 같은 디자인으로 교환하거나 환불해 드립니다. 왕복 배송비는 저희가 부담합니다.",
      "단순 변심 반품은 받은 날부터 7일 안에 가능합니다.",
    ],
    reportModal: [
      "받으신 뒤 48시간 안에 상자와 제품 앞뒷면 사진을 신청 창에 올려 주시면 가장 빠르게 처리해 드립니다.",
      "받을 때 이미 있던 파손·불량은 같은 디자인으로 교환하거나 환불해 드립니다. 왕복 배송비는 저희가 부담합니다.",
      "받은 뒤 생긴 파손은 대상이 아닙니다. 단순 변심 반품은 받은 날부터 7일 안에 가능합니다.",
    ],
    photos: [
      {
        label: "사진\n자개의 작은 반점",
        src: "/photos/nacre-flecks.webp",
        caption: "작은 반점은 조개가 자라며 남긴 흔적이에요",
      },
      {
        label: "사진\n실제 샘플 확대",
        src: "/photos/nacre-close-up.webp",
        caption: "실제 샘플 확대. 물결 같은 결과 가는 선은 자개 고유의 무늬예요",
      },
      {
        label: "사진\n같은 디자인 2개를 나란히 찍은 사진",
        src: "/photos/nacre-compare.webp",
        caption: "같은 디자인도 무지개빛이 하나하나 달라요",
      },
    ],
  },
};

export function usePolicy() {
  const { lang } = useLang();
  return POLICY[lang];
}

export function NacrePhotos({ className = "", captionClass = "text-muted" }) {
  const { photos } = usePolicy();
  return (
    // Phones: one row per photo, caption beside it. Wider screens: three columns, caption below.
    <div className={`grid gap-4 sm:grid-cols-3 sm:gap-3 ${className}`}>
      {photos.map((p) => (
        <figure key={p.caption} className="flex items-center gap-4 sm:block">
          <div className="w-32 shrink-0 sm:w-auto">
            <Placeholder label={p.label} src={p.src} imgClass="object-cover" className="aspect-square text-[11px]" />
          </div>
          <figcaption className={`oo-micro sm:mt-2 ${captionClass}`}>{p.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Heading({ title, note }) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-lg font-medium text-strong">{title}</span>
      <span className="oo-small font-normal text-gold">{note}</span>
    </h3>
  );
}


export function ExchangeModal({ open, onClose }) {
  const closeRef = useRef(null);
  const { t } = useLang();
  const policy = usePolicy();

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-overlay backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="flex min-h-full items-start justify-center px-4 py-10 sm:py-16">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exchange-title"
          className="relative w-full max-w-[38rem] border border-burgundy bg-deep p-6 sm:p-9"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("Close", "닫기")}
            className="absolute top-6 right-6 flex size-11 items-center justify-center rounded-full border border-line-strong text-strong hover:border-gold"
          >
            ✕
          </button>

          <p className="oo-eyebrow">Care &amp; Exchange</p>
          <h2 id="exchange-title" className="oo-h2 mt-3 pr-14 !text-[2rem]">
            {t("Exchange policy", "교환 기준")}
          </h2>
          <p className="oo-body mt-3 text-muted">
            {t(
              "Natural nacre varies from shell to shell. Here is what we can and can't exchange.",
              "천연 자개라 조개마다 결과 빛깔이 다릅니다. 교환 여부는 아래 기준으로 정해요."
            )}
          </p>

          <section className="mt-6 border-t border-dark pt-6">
            <Heading title={t("Natural variation", "자연스러운 개체차")} note={t("Not eligible for exchange", "교환 대상 아님")} />
            <p className="oo-body mt-3 text-strong">{policy.nacre}</p>
            <NacrePhotos className="mt-4" />
            <SparkleList items={policy.variation} className="mt-4" itemClass="oo-body text-strong" />
          </section>

          <section className="mt-6 border-t border-dark pt-6">
            <Heading title={t("Damage & defects", "파손·불량")} note={t("Free replacement or refund", "무료 교환·환불")} />
            <SparkleList items={policy.defects} className="mt-3" itemClass="oo-body text-strong" />
          </section>

          <section className="mt-6 border-t border-dark pt-6">
            <Heading title={t("How to report", "접수 방법")} note={t("Photos within 48 hours recommended", "48시간 안 접수 권장")} />
            <SparkleList items={policy.reportModal} className="mt-3" itemClass="oo-body text-strong" />
          </section>

          <button type="button" onClick={onClose} className="oo-btn oo-btn-gold mt-8 w-full py-3.5">
            {t("Got it", "확인했어요")}
          </button>
        </div>
      </div>
    </div>
  );
}
