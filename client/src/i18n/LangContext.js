import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as fmt from "../lib/format";

// English / Korean switch. The choice is kept in the browser (oo-lang) so it survives a reload.
const KEY = "oo-lang";

function readLang() {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (fromUrl === "ko" || fromUrl === "en") return fromUrl;
  try {
    return localStorage.getItem(KEY) === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit
    }
  }, [lang]);

  const value = useMemo(() => {
    const ko = lang === "ko";
    return {
      lang,
      ko,
      setLang,
      toggle: () => setLang(ko ? "en" : "ko"),
      t: (en, kr) => (ko ? kr : en),
      pick: (obj, key) => (ko && obj?.ko?.[key] != null ? obj.ko[key] : obj?.[key]),
      won: (n) => fmt.won(n, lang),
      shortDate: (iso) => fmt.shortDate(iso, lang),
      dayDate: (iso) => fmt.dayDate(iso, lang),
      joinNames: (names) => fmt.joinNames(names, lang),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
