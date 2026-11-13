import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { useLang } from "../i18n/LangContext";


export function useDiscountNote() {
  const { t } = useLang();
  return t(
    "10% off 4 or more · all 16 for ₩400,000 · discounts don't stack",
    "4개부터 10% · 16개 풀 컬렉션 400,000원 · 할인은 중복되지 않아요"
  );
}

// "Order the set" adds it and opens the cart; "Add to cart" only adds it.
// `added` is true for a moment after "Add to cart", so the button can say so.
export function useOrderButtons(sku) {
  const { add } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  return {
    added,
    order: () => {
      add(sku);
      navigate("/cart");
    },
    addOnly: () => {
      add(sku);
      setAdded(true);
    },
  };
}


export function useAddLabel(added) {
  const { t } = useLang();
  return added ? t("Added ✓", "담았어요 ✓") : t("Add to cart", "장바구니에 담기");
}

// The set row under each chapter on the home page
export default function SetCard({ set, contents, className = "" }) {
  const { order, addOnly, added } = useOrderButtons(set.sku);
  const { t, pick, won } = useLang();
  const discountNote = useDiscountNote();
  const addLabel = useAddLabel(added);

  return (
    <div
      className={`flex flex-col gap-5 border border-gold-line bg-black/20 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div>
        <p className="font-display text-xl text-gold italic">
          {pick(set, "name")} · {t(`${set.pieces} pieces`, `${set.pieces}개`)}
        </p>
        <p className="oo-micro mt-1 text-muted">{contents}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
        <div className="lg:text-right">
          <p className="oo-price-l">{won(set.price)}</p>
          <p className="oo-micro">{discountNote}</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="oo-btn oo-btn-gold px-5 py-2.5 text-sm" onClick={order}>
            {t("Order the set", "세트 바로 주문")}
          </button>
          <button type="button" className="oo-link oo-small min-w-20 text-left" onClick={addOnly} aria-live="polite">
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
