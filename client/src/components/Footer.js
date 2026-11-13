import { Link } from "react-router-dom";
import { useLang } from "../i18n/LangContext";

export default function Footer({ contactEmail }) {
  const { t } = useLang();
  return (
    <footer className="border-t border-deep bg-black">
      <div className="oo-container flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" aria-label={t("Original Ornaments home", "Original Ornaments 홈")}>
          <img src="/brand/badge.png" alt="original ✦ ornaments" className="h-20 w-auto sm:h-24" />
        </Link>
        <p className="oo-small text-muted">
          {contactEmail !== undefined && <>{contactEmail || t("[Contact email]", "[연락처 이메일]")} · </>}
          Collect the Lights. · original-ornaments.com
        </p>
      </div>
    </footer>
  );
}
