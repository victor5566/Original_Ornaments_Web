import { useState } from "react";
import { useLang } from "../i18n/LangContext";


export const photoUrl = (slug, view = "front") =>
  view === "back" ? "/ornaments/photo/back.webp" : `/ornaments/photo/${slug}${view === "front" ? "" : `-${view}`}.webp`;

// The ornament's front: the photo, else the illustration, else a placeholder disc
export default function Ornament({ slug, name, className = "" }) {
  const [failed, setFailed] = useState([]);
  const { t } = useLang();
  const src = slug && [photoUrl(slug), `/ornaments/${slug}.png`].find((s) => !failed.includes(s));

  if (!src) {
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
      key={src}
      src={src}
      alt={name ? t(`${name} ornament`, `${name} 오너먼트`) : ""}
      onError={() => setFailed((f) => [...f, src])}
      className={`aspect-square rounded-full object-cover ${className}`}
    />
  );
}
