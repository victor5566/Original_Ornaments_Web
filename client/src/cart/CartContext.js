import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// The cart lives in this browser only (localStorage). Prices always come from the server.
const KEY = "oo-cart";
const MAX_QTY = 20;

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.items)) {
      return {
        items: saved.items.filter((i) => typeof i.sku === "string" && Number.isInteger(i.qty) && i.qty > 0),
        gift: saved.gift === true,
      };
    }
  } catch {
    // Private window or blocked storage: start empty
  }
  return { items: [], gift: false };
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readSaved);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable: the cart lasts until the tab closes
    }
  }, [cart]);

  const add = useCallback((sku, qty = 1) => {
    setCart((c) => {
      const found = c.items.find((i) => i.sku === sku);
      const items = found
        ? c.items.map((i) => (i.sku === sku ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i))
        : [...c.items, { sku, qty: Math.min(qty, MAX_QTY) }];
      return { ...c, items };
    });
  }, []);

  const setQty = useCallback((sku, qty) => {
    setCart((c) => ({
      ...c,
      items:
        qty < 1
          ? c.items.filter((i) => i.sku !== sku)
          : c.items.map((i) => (i.sku === sku ? { ...i, qty: Math.min(qty, MAX_QTY) } : i)),
    }));
  }, []);

  const remove = useCallback((sku) => setCart((c) => ({ ...c, items: c.items.filter((i) => i.sku !== sku) })), []);
  const setGift = useCallback((gift) => setCart((c) => ({ ...c, gift })), []);
  const clear = useCallback(() => setCart({ items: [], gift: false }), []);

  const value = useMemo(
    () => ({
      items: cart.items,
      gift: cart.gift,
      count: cart.items.reduce((n, i) => n + i.qty, 0),
      add,
      setQty,
      remove,
      setGift,
      clear,
    }),
    [cart, add, setQty, remove, setGift, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export { MAX_QTY };
