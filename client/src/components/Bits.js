import { useLang } from "../i18n/LangContext";

// A dashed box standing in for a photo or video that does not exist yet.
// Pass src once the image exists; the label (minus its "Photo needed" line) becomes the alt text.
export function Placeholder({ label, className = "", src, imgClass = "object-cover" }) {
  if (src) {
    const alt = label.replace(/^(Photo( needed)?|사진|예시 사진 필요)\n/, "").replace(/\n/g, " ");
    return <img src={src} alt={alt} className={`w-full ${imgClass} ${className}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center border border-dashed border-line-strong bg-deep/60 p-4 text-center ${className}`}
    >
      <span className="oo-caption whitespace-pre-line">[{label}]</span>
    </div>
  );
}

// List with gold sparkles as bullets
export function SparkleList({ items, className = "", itemClass = "oo-small" }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className={`flex gap-3 ${itemClass}`}>
          <span aria-hidden="true" className="mt-[0.1em] shrink-0 text-gold">
            ✦
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function QtyStepper({ value, onChange, max = 20, label }) {
  const { t } = useLang();
  return (
    <div
      className="inline-flex h-12 items-center rounded-full border border-gold-line"
      role="group"
      aria-label={label || t("Quantity", "수량")}
    >
      <button
        type="button"
        className="h-full w-11 text-lg text-strong disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={t("Decrease", "수량 줄이기")}
      >
        −
      </button>
      <span className="w-8 text-center text-strong" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="h-full w-11 text-lg text-strong disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t("Increase", "수량 늘리기")}
      >
        +
      </button>
    </div>
  );
}

// Loading and error states while the catalog loads
export function PageState({ error }) {
  const { t } = useLang();
  return (
    <div className="oo-container py-32 text-center">
      {error ? (
        <>
          <p className="oo-h3">{t("The shop couldn't load", "페이지를 불러오지 못했어요")}</p>
          <p className="oo-small mt-3 text-muted">{error.message}</p>
          <button type="button" className="oo-btn oo-btn-outline mt-6" onClick={() => window.location.reload()}>
            {t("Try again", "다시 시도")}
          </button>
        </>
      ) : (
        <p className="oo-tagline animate-pulse">Collect the Lights.</p>
      )}
    </div>
  );
}

export function ErrorText({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="oo-small text-error">
      {error.message || String(error)}
    </p>
  );
}
