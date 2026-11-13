import { Link } from "react-router-dom";
import Moon from "../components/Moon";
import { useLang } from "../i18n/LangContext";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="oo-container py-24 text-center sm:py-32">
      <Moon className="mx-auto w-28" />
      <h1 className="oo-h2 mt-8">{t("This light isn't here", "이 빛은 여기에 없어요")}</h1>
      <p className="oo-small mt-3 text-muted">
        {t("The page may have moved, or the link is mistyped.", "페이지가 옮겨졌거나 주소가 잘못 입력되었어요.")}
      </p>
      <Link to="/" className="oo-btn oo-btn-outline mt-8">
        {t("Back to the collection", "컬렉션으로 돌아가기")}
      </Link>
    </div>
  );
}
