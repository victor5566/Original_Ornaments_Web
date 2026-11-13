import { useEffect, useState } from "react";
import { postJson } from "../lib/api";

// Cart totals from the server (POST /api/quote): prices, discount and shipping all come from the database.
// `country` (ISO code) prices the shipping; without it, quote.shippingFee is null.
// While a new quote loads, the previous one stays on screen.
export function useQuote(items, country = null) {
  const key = JSON.stringify({ items: items.map(({ sku, qty }) => ({ sku, qty })), country });
  const [state, setState] = useState({ quote: null, error: null });

  useEffect(() => {
    const body = JSON.parse(key);
    if (body.items.length === 0) {
      setState({ quote: null, error: null });
      return;
    }
    const controller = new AbortController();
    postJson("/api/quote", body, controller.signal).then(
      (quote) => setState({ quote, error: null }),
      (error) => {
        if (error.name !== "AbortError") setState({ quote: null, error });
      }
    );
    return () => controller.abort();
  }, [key]);

  return items.length === 0 ? { quote: null, error: null } : state;
}
