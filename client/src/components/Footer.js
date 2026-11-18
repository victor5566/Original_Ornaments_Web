import { Link } from "react-router-dom";
import { useLang } from "../i18n/LangContext";

// Site footer: the badge, the contact line and the business details Korean online shops must show.
// Text in [brackets] is placeholder copy until the business is registered.
export default function Footer({ contactEmail }) {
  const { t } = useLang();
  const email = contactEmail || t("[Contact email]", "[연락처 이메일]");
  return (
    <footer className="border-t border-deep bg-black">
      <div className="oo-container py-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" aria-label={t("Original Ornaments home", "Original Ornaments 홈")}>
            <img src="/brand/badge.png" alt="original ✦ ornaments" className="h-20 w-auto sm:h-24" />
          </Link>
          <p className="oo-small text-muted">Collect the Lights. · original-ornaments.com</p>
        </div>
        <div className="oo-micro mt-8 space-y-1 !text-subtle">
          <p>
            {t(
              "Business name [Business name] · Representative [Name] · Business registration no. [000-00-00000] · Mail-order business no. [2026-OOOO-0000]",
              "상호 [상호] · 대표 [대표자] · 사업자등록번호 [000-00-00000] · 통신판매업 신고번호 [제2026-OOOO-0000호]"
            )}
          </p>
          <p>
            {t(
              <>Address [Business address] · Phone [+82-00-0000-0000] · {email} · Buyer protection [Escrow service confirmation]</>,
              <>주소 [사업장 주소] · 전화 [000-0000-0000] · {email} · 구매안전서비스 [에스크로 가입 확인]</>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
