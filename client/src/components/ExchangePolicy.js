import { useEffect, useRef } from "react";
import { useLang } from "../i18n/LangContext";
import { Placeholder, SparkleList } from "./Bits";

// Exchange policy text in both languages, shared by the product page section and the pop-up from Cart and Checkout.
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
    reportWithin: "Report within 48 hours of delivery.",
    howToReport: (email) => [
      `Send at least 2 photos showing the box and both sides of the ornament to ${email || "[email]"}.`,
      "Once confirmed, we replace it with the same design, or refund if it has sold out. We cover shipping both ways.",
      "Reports after 48 hours, or damage from use, cannot be exchanged. Change-of-mind returns follow [separate terms].",
    ],
    photos: [
      {
        label: "Photo needed\nTwo pieces of the same design side by side",
        caption: "The same design, a different rainbow on each piece",
      },
      {
        label: "Photo needed\nReal sample, close up",
        src: "/photos/nacre-sample.png",
        caption: "Real sample, close up. Wavy grain and fine lines are natural to nacre",
      },
      {
        label: "Photo needed\nOne piece shot straight on and at an angle",
        caption: "Color shifts with viewing angle and light",
      },
    ],
  },
  ko: {
    nacre:
      "자개는 조개 껍데기 안쪽에서 빛을 내는 얇은 층입니다. 조개마다, 같은 조개 안에서도 자리마다 결과 색이 달라서 " +
      "같은 디자인이라도 똑같은 두 개는 없습니다. 사진과 결이나 빛깔이 달라 보이는 건 불량이 아니라 천연 자개라는 표시예요.",
    variation: ["결의 방향과 무늬가 상세 사진과 다른 경우", "자개 고유의 가는 선, 점, 미세한 색 얼룩"],
    defects: ["깨짐, 금, 조각 떨어짐", "자개 들뜸이나 디자인 인쇄 불량", "걸이 고리·리본 불량", "주문과 다른 디자인 배송"],
    reportWithin: "배송 완료 후 48시간 안에 접수해 주세요.",
    howToReport: (email) => [
      `상자와 제품 앞뒷면이 모두 보이는 사진 2장 이상을 ${email || "[이메일/카카오톡 채널]"}로 보내 주세요.`,
      "확인 후 같은 디자인으로 교환합니다. 재고가 없으면 환불하며, 왕복 배송비는 저희가 부담합니다.",
      "48시간이 지나거나 사용 중 생긴 파손은 교환이 어렵습니다. 단순 변심 반품은 [별도 기준]을 따릅니다.",
    ],
    photos: [
      {
        label: "예시 사진 필요\n같은 디자인 2개를\n나란히 찍은 사진",
        caption: "같은 디자인도 무지개빛이 하나하나 달라요",
      },
      {
        label: "예시 사진 필요\n실제 샘플 확대",
        src: "/photos/nacre-sample.png",
        caption: "실제 샘플 확대. 물결 같은 결과 가는 선은 자개 고유의 무늬예요",
      },
      {
        label: "예시 사진 필요\n같은 제품을 정면과\n비스듬히 찍은 사진 2장",
        caption: "보는 각도와 조명에 따라 색이 바뀌어요",
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
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {photos.map((p) => (
        <figure key={p.caption}>
          <Placeholder label={p.label} src={p.src} imgClass="object-contain" className="aspect-square text-[11px]" />
          <figcaption className={`oo-micro mt-2 ${captionClass}`}>{p.caption}</figcaption>
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


export function ExchangeModal({ open, onClose, contactEmail }) {
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
            <Heading title={t("Damage & defects", "파손·불량")} note={t("Free exchange", "무료 교환")} />
            <SparkleList items={policy.defects} className="mt-3" itemClass="oo-body text-strong" />
          </section>

          <section className="mt-6 border-t border-dark pt-6">
            <Heading title={t("How to report", "접수 방법")} note={t("Within 48 hours of delivery", "배송 완료 후 48시간 안")} />
            <SparkleList items={policy.howToReport(contactEmail)} className="mt-3" itemClass="oo-body text-strong" />
          </section>

          <button type="button" onClick={onClose} className="oo-btn oo-btn-gold mt-8 w-full py-3.5">
            {t("Got it", "확인했어요")}
          </button>
        </div>
      </div>
    </div>
  );
}
