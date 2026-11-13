import { useEffect, useState } from "react";
import { catalogText } from "../data/catalog";
import { getJson } from "../lib/api";

// The catalog is loaded once per visit from GET /api/catalog and shared by every page
let cached = null;
let loading = null;

function loadCatalog() {
  if (!loading) {
    loading = getJson("/api/catalog")
      .then((data) => (cached = { ...catalogText, ...data }))
      .catch((err) => {
        loading = null; // let "Try again" fetch it again
        throw err;
      });
  }
  return loading;
}

export function useCatalog() {
  const [state, setState] = useState(() => ({ catalog: cached, error: null }));

  useEffect(() => {
    if (cached) return;
    let live = true;
    loadCatalog().then(
      (catalog) => live && setState({ catalog, error: null }),
      (error) => live && setState({ catalog: null, error })
    );
    return () => {
      live = false;
    };
  }, []);

  return state;
}

// sku -> product (single design, chapter set or full collection), with its chapter name in both languages
export function indexCatalog(data) {
  const index = new Map();
  if (!data) return index;
  for (const chapter of data.chapters) {
    const chapterNames = { chapterName: chapter.name, chapterNameKo: chapter.ko.name };
    for (const d of chapter.designs) index.set(d.sku, { ...d, kind: "single", ...chapterNames });
    if (chapter.set) index.set(chapter.set.sku, { ...chapter.set, kind: "set", chapter: chapter.slug, ...chapterNames });
  }
  if (data.full) index.set(data.full.sku, { ...data.full, kind: "full" });
  return index;
}
