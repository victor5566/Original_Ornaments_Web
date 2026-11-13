import { useState } from "react";
import { useLang } from "../i18n/LangContext";


export default function Ornament({ slug, name, className = "" }) {
  const [missing, setMissing] = useState(false);
  const { t } = useLang();

  if (missing || !slug) {
    return (
      <div
        role="img"
        aria-label={t(`${name} ornament (image to come)`, `${name} 오너먼트 (이미지 준비 중)`)}
        className={`flex aspect-square items-center justify-center rounded-full border border-gold-line bg-[radial-gradient(circle_at_35%_30%,#3a1820,#0b0b0b_72%)] ${className}`}
      >
        <div className="flex flex-col items-center gap-2 px-2 text-center">
          <img src="/brand/sparkle.png" alt="" className="w-[14%] min-w-3 opacity-80" />
          {name && <span className="oo-micro uppercase tracking-[0.2em]">[{name}]</span>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={`/ornaments/${slug}.png`}
      alt={name ? t(`${name} ornament`, `${name} 오너먼트`) : ""}
      onError={() => setMissing(true)}
      className={`aspect-square rounded-full object-cover ${className}`}
    />
  );
}
