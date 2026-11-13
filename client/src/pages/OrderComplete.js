import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { PageState } from "../components/Bits";
import Moon from "../components/Moon";
import { useCatalog } from "../hooks/useCatalog";
import { useLang } from "../i18n/LangContext";
import { getJson } from "../lib/api";


export default function OrderComplete() {
  const location = useLocation();
  const { number } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t");
  const { catalog, error } = useCatalog();
  const { ko, t, won, shortDate, joinNames } = useLang();
  const [loaded, setLoaded] = useState({ order: null, done: false });
  const passed = location.state?.order;

  useEffect(() => {
    if (passed || !token) return;
    const controller = new AbortController();
    getJson(`/api/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`, controller.signal).then(
      (order) => setLoaded({ order, done: true }),
      (err) => err.name !== "AbortError" && setLoaded({ order: null, done: true })
    );
    return () => controller.abort();
  }, [passed, number, token]);

  const order = passed ?? loaded.order;
  if (!catalog || (!passed && token && !loaded.done)) return <PageState error={error} />;

  const names = order
    ? joinNames(order.lines.map((l) => (l.kind === "single" ? l.name.toUpperCase() : ko ? l.nameKo : l.name)))
    : t("[Items]", "[상품]");
  const plural = !order || order.pieces > 1;
  const preorder = order ? order.preorder : catalog.phase === "preorder";
  const shipsFrom = shortDate(order?.shipsFrom ?? catalog.preorder.shipsFrom);
  const email = catalog.contactEmail;

  let lead;
  if (ko) {
    lead = preorder
      ? `프리오더 주문입니다. 생산이 끝나면 ${names} 오너먼트를 버건디 상자에 담아 ${shipsFrom}부터 주문 순서대로 보내 드릴게요. `
      : `${names} 오너먼트를 버건디 상자에 담아 주문 순서대로 보내 드릴게요. `;
    lead += "배송이 시작되면 카카오톡과 이메일로 알려 드립니다.";
  } else {
    const boxes = plural ? "their burgundy boxes" : "its burgundy box";
    const ship = plural ? "ship" : "ships";
    lead = preorder
      ? `This is a pre-order. Once production is done, ${names} ${ship} in ${boxes} from ${shipsFrom}, in the order placed. `
      : `${names} ${ship} in ${boxes}, in the order placed. `;
    lead += `You'll get an email with tracking as soon as ${plural ? "they leave" : "it leaves"}.`;
  }

  return (
    <div className="oo-container max-w-3xl pt-10 pb-24 text-center sm:pt-16">
      <Moon className="mx-auto w-36 sm:w-40" />
      <p className="oo-eyebrow mt-8">Order {order ? order.number : "[OO-2026-0000]"}</p>
      <h1 className="oo-h1 mt-5">{t("This year's light is on its way", "올해의 빛이 당신에게 갑니다")}</h1>
      <p className="oo-lead mx-auto mt-6 max-w-2xl text-body">{lead}</p>

      <dl className="oo-small mt-8 space-y-3 border border-dark p-6 text-left sm:px-7">
        <Row term={t("Ship to", "받는 분")} value={order?.shipTo || t("[Name]", "[이름]")} />
        <Row term={t("Address", "배송지")} value={order?.address || t("[Address]", "[주소]")} />
        <Row term={t("Total paid", "결제 금액")} value={order ? won(order.total) : t("[₩00,000]", "[00,000원]")} />
        {(order?.pouchGift || order?.isGift) && (
          <div className="space-y-1 border-t border-dark pt-3">
            {order.pouchGift && (
              <p className="flex gap-3 text-strong">
                <span aria-hidden="true" className="text-gold">
                  ✦
                </span>
                {t(
                  "Pre-order gift: each piece will be wrapped in a suede pouch.",
                  "프리오더 증정: 모든 오너먼트를 스웨이드 파우치에 담아 드려요."
                )}
              </p>
            )}
            {order.isGift && (
              <p className="flex gap-3 text-strong">
                <span aria-hidden="true" className="text-gold">
                  ✦
                </span>
                {t("Gift: the price will be left out of the box.", "선물 포장: 상자에 가격표를 넣지 않아요.")}
              </p>
            )}
          </div>
        )}
      </dl>

      <div className="mt-6 bg-burgundy px-6 py-10">
        <p className="oo-tagline">Collect the Lights.</p>
        <p className="oo-body mx-auto mt-4 max-w-xl text-strong">
          {t(
            "The first light has joined your collection. Show us how it looks on your tree with #collectthelights. We'll let you know first when next year's light arrives.",
            "당신의 컬렉션에 첫 번째 빛이 더해졌어요. 트리에 걸린 모습을 #collectthelights 로 보여 주세요. 내년의 빛이 도착하면 가장 먼저 알려 드릴게요."
          )}
        </p>
      </div>

      <p className="oo-caption mx-auto mt-8 max-w-2xl">
        {t(
          `Please open the box within 48 hours of delivery. If anything arrived damaged or faulty, send photos of the box and both sides of the ornament to ${email || "[email]"} and we will replace it free of charge.`,
          `도착하면 상자를 열어 48시간 안에 확인해 주세요. 파손이나 불량이 있으면 상자와 제품 앞뒷면 사진을 ${email || "[이메일/카카오톡 채널]"}로 보내 주시면 무료로 교환해 드립니다.`
        )}
      </p>
      <Link to="/" className="oo-btn oo-btn-outline mt-8">
        {t("Keep browsing", "다른 빛 둘러보기")}
      </Link>
    </div>
  );
}

function Row({ term, value }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="shrink-0 text-strong">{term}</dt>
      <dd className="text-right text-strong">{value}</dd>
    </div>
  );
}
