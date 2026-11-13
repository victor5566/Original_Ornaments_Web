// Formatting for English ("en") and Korean ("ko"). Pages usually call these through useLang().
// Dates in the store config are Korea time.
const TZ = "Asia/Seoul";

export function won(amount, lang = "en") {
  const n = Number(amount);
  return lang === "ko" ? `${n.toLocaleString("ko-KR")}원` : `₩${n.toLocaleString("en-US")}`;
}

export function shortDate(iso, lang = "en") {
  if (lang === "ko") return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: TZ });
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
}

export function dayDate(iso, lang = "en") {
  if (lang === "ko") {
    const weekday = new Date(iso).toLocaleDateString("ko-KR", { weekday: "short", timeZone: TZ });
    return `${shortDate(iso, "ko")}(${weekday})`;
  }
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: TZ });
}

// The pre-order end is stored as the first moment after it closes; show the last day.
export const lastDay = (iso) => new Date(new Date(iso).getTime() - 1).toISOString();

// ["CAT", "CANDLE", "SWAN"] -> "CAT, CANDLE and SWAN" / "CAT, CANDLE, SWAN"
export function joinNames(names, lang = "en") {
  if (lang === "ko" || names.length < 2) return names.join(", ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
