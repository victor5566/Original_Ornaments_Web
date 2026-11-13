import { useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { useCatalog } from "./hooks/useCatalog";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import OrderComplete from "./pages/OrderComplete";
import Product from "./pages/Product";
import Story from "./pages/Story";

const TITLE = "Original Ornaments · Collect the Lights";

// New page: back to the top, or to the #section in the link
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = TITLE; // pages with their own title set it after this
    if (hash) {
      // The section may render after the catalog loads
      let tries = 0;
      const find = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) el.scrollIntoView();
        else if (tries++ < 20) timer = setTimeout(find, 100);
      };
      let timer = setTimeout(find, 0);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// header: "full", "checkout" or "minimal"; footer only on browsing pages
function Layout({ header = "full", footer = true }) {
  const { catalog } = useCatalog();
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-svh flex-col">
      <Header variant={header} />
      <main className="flex-1">
        <Outlet />
      </main>
      {footer && <Footer contactEmail={pathname === "/story" ? (catalog?.contactEmail ?? null) : undefined} />}
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="cart" element={<Cart />} />
          <Route path="story" element={<Story />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<Layout header="checkout" footer={false} />}>
          <Route path="checkout" element={<Checkout />} />
        </Route>
        <Route element={<Layout header="minimal" footer={false} />}>
          <Route path="order/:number" element={<OrderComplete />} />
        </Route>
      </Routes>
    </>
  );
}
