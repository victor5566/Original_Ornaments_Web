import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./cart/CartContext";
import { LangProvider } from "./i18n/LangContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);
