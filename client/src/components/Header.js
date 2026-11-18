import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { useLang } from "../i18n/LangContext";

const navClass = ({ isActive }) => `oo-nav whitespace-nowrap transition-colors hover:text-gold ${isActive ? "text-gold" : "text-strong"}`;

// variant: "full" (site nav), "checkout" (Back to cart), "minimal" (logo only).
// Phones show the logo, the cart and a menu button; the other links open below the header.
export default function Header({ variant = "full" }) {
  const { count } = useCart();
  const { t, ko, toggle } = useLang();
  const { pathname, hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the phone menu on a new page and with Escape
  useEffect(() => setMenuOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Shows the other language's name: 한국어 on the English site, EN on the Korean one
  const langButton = (className) => (
    <button
      type="button"
      onClick={toggle}
      lang={ko ? "en" : "ko"}
      aria-label={ko ? "Switch to English" : "한국어로 보기"}
      className={`oo-nav whitespace-nowrap text-subtle transition-colors hover:text-gold ${className}`}
    >
      {ko ? "EN" : "한국어"}
    </button>
  );

  return (
    <header className="relative z-30">
      <div className="oo-container flex h-16 items-center justify-between gap-4 sm:h-20">
        <Link to="/" className="min-w-0 shrink" aria-label={t("Original Ornaments home", "Original Ornaments 홈")}>
          <img src="/brand/logo-horizontal.png" alt="original ✦ ornaments" className="h-5 w-auto max-w-full min-[400px]:h-6 sm:h-7" />
        </Link>

        {variant === "full" && (
          <nav className="flex shrink-0 items-center gap-5 sm:gap-7" aria-label={t("Main", "주 메뉴")}>
            <Link to="/#collection" className="oo-nav hidden whitespace-nowrap text-strong transition-colors hover:text-gold md:inline">
              {t("2026 Collection", "2026 컬렉션")}
            </Link>
            <NavLink to="/story" className={(s) => `${navClass(s)} hidden sm:inline`}>
              {t("Our Story", "이야기")}
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => `oo-nav whitespace-nowrap text-gold ${isActive ? "underline underline-offset-4" : ""}`}
            >
              {t("Cart", "장바구니")} ({count})
            </NavLink>
            {langButton("hidden sm:inline")}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="phone-menu"
              aria-label={menuOpen ? t("Close menu", "메뉴 닫기") : t("Open menu", "메뉴 열기")}
              className="-mr-2 flex h-10 w-10 items-center justify-center text-strong hover:text-gold sm:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </nav>
        )}

        {variant === "checkout" && (
          <Link to="/cart" className="oo-nav shrink-0 whitespace-nowrap text-strong underline underline-offset-4 hover:text-gold">
            {t("Back to cart", "장바구니로 돌아가기")}
          </Link>
        )}
      </div>

      {variant === "full" && menuOpen && (
        <div id="phone-menu" className="absolute inset-x-0 top-full border-y border-line bg-black sm:hidden">
          <nav className="oo-container flex flex-col py-2" aria-label={t("Menu", "메뉴")}>
            <Link to="/#collection" className="oo-nav border-b border-line/60 py-4 text-strong hover:text-gold">
              {t("2026 Collection", "2026 컬렉션")}
            </Link>
            <NavLink to="/story" className={(s) => `${navClass(s)} border-b border-line/60 py-4`}>
              {t("Our Story", "이야기")}
            </NavLink>
            {langButton("py-4 text-left")}
          </nav>
        </div>
      )}
    </header>
  );
}
