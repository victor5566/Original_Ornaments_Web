import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LangContext";

// Korean address search: the free Kakao (Daum) postcode service, shown inside a window on the page.
// The script loads only when the window first opens.
const SCRIPT = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loading = null;

function loadScript() {
  if (window.daum?.Postcode) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        loading = null;
        s.remove();
        reject(new Error("Address search could not load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// onSelect({ postalCode, address }) gets the chosen road address, with the building name for apartments
export default function PostcodeSearch({ open, onClose, onSelect }) {
  const boxRef = useRef(null);
  const closeRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    let live = true;
    const box = boxRef.current;
    const before = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    loadScript().then(
      () => {
        if (!live || !box) return;
        new window.daum.Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (data) => {
            let address = data.roadAddress || data.jibunAddress || data.address;
            const extra = [data.bname && /[동로가]$/.test(data.bname) ? data.bname : "", data.apartment === "Y" ? data.buildingName : ""]
              .filter(Boolean)
              .join(", ");
            if (data.roadAddress && extra) address += ` (${extra})`;
            onSelect({ postalCode: data.zonecode, address });
            onClose();
          },
        }).embed(box);
      },
      () => live && setFailed(true)
    );

    return () => {
      live = false;
      document.removeEventListener("keydown", onKey);
      if (box) box.innerHTML = "";
      before?.focus?.();
    };
  }, [open, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="flex h-full items-center justify-center px-4 py-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="postcode-title"
          className="flex h-[min(36rem,100%)] w-full max-w-[32rem] flex-col border border-burgundy bg-deep p-5 sm:p-6"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="postcode-title" className="oo-label">
              {t("Find address", "주소 찾기")}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("Close", "닫기")}
              className="flex size-10 items-center justify-center rounded-full border border-line-strong text-strong hover:border-gold"
            >
              ✕
            </button>
          </div>
          {failed ? (
            <p role="alert" className="oo-small mt-6 text-error">
              {t(
                "Address search isn't available right now. Please type the address yourself.",
                "주소 검색을 불러오지 못했어요. 주소를 직접 입력해 주세요."
              )}
            </p>
          ) : (
            <div ref={boxRef} className="mt-4 min-h-0 flex-1 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
}
