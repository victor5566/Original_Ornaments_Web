import { Link, NavLink } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { useLang } from "../i18n/LangContext";

const navClass = ({ isActive }) => `oo-nav transition-colors hover:text-gold ${isActive ? "text-gold" : "text-strong"}`;

// variant: "full" (site nav), "checkout" (Back to cart), "minimal" (logo only)
export default function Header({ variant = "full" }) {
  const { count } = useCart();
  const { t, ko, toggle } = useLang();

  return (
    <header className="oo-container flex h-20 items-center justify-between gap-4">
      <Link to="/" className="shrink-0" aria-label={t("Original Ornaments home", "Original Ornaments 홈")}>
        <img src="/brand/logo-horizontal.png" alt="original ✦ ornaments" className="h-6 w-auto sm:h-7" />
      </Link>

      {variant === "full" && (
        <nav className="flex items-center gap-4 sm:gap-7" aria-label={t("Main", "주 메뉴")}>
          <Link to="/#collection" className="oo-nav hidden text-strong transition-colors hover:text-gold sm:inline">
            {t("2026 Collection", "2026 컬렉션")}
          </Link>
          <NavLink to="/story" className={navClass}>
            {t("Our Story", "이야기")}
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => `oo-nav text-gold ${isActive ? "underline underline-offset-4" : ""}`}>
            {t("Cart", "장바구니")} ({count})
          </NavLink>
          {/* Shows the other language's name: 한국어 on the English site, EN on the Korean one */}
          <button
            type="button"
            onClick={toggle}
            lang={ko ? "en" : "ko"}
            aria-label={ko ? "Switch to English" : "한국어로 보기"}
            className="oo-nav text-subtle transition-colors hover:text-gold"
          >
            {ko ? "EN" : "한국어"}
          </button>
        </nav>
      )}

      {variant === "checkout" && (
        <Link to="/cart" className="oo-nav text-strong underline underline-offset-4 hover:text-gold">
          {t("Back to cart", "장바구니로 돌아가기")}
        </Link>
      )}
    </header>
  );
}
