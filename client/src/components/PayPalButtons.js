import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LangContext";
import { postJson } from "../lib/api";
import { ErrorText } from "./Bits";

// The PayPal JS SDK in the site's language (ko_KR / en_US), loaded again only when the language changes
let sdk = { locale: null, promise: null };
function loadSdk(clientId, locale) {
  if (sdk.locale !== locale) {
    document.getElementById("paypal-sdk")?.remove();
    delete window.paypal;
    sdk = { locale, promise: null };
  }
  if (!sdk.promise) {
    sdk.promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&locale=${locale}`;
      // The server's CSP nonce (backend/server.js); PayPal puts it on the scripts and styles it adds
      const nonce = document.querySelector('meta[name="csp-nonce"]')?.content;
      if (nonce) {
        script.nonce = nonce;
        script.setAttribute("data-csp-nonce", nonce);
      }
      script.onload = () => resolve(window.paypal);
      script.onerror = () => {
        sdk = { locale: null, promise: null };
        script.remove();
        reject(new Error("PayPal could not be loaded. Please check your connection and reload the page."));
      };
      document.head.appendChild(script);
    });
  }
  return sdk.promise;
}

// PayPal and card buttons for a saved order. The server makes the PayPal order (amount from the database)
// and takes the money after the buyer approves; onPaid gets the paid order.
export default function PayPalButtons({ clientId, number, token, onPaid }) {
  const { lang, t } = useLang();
  const box = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // The PayPal callbacks are set up once; they read the current language and handler from here
  const latest = useRef();
  latest.current = { lang, t, onPaid };

  useEffect(() => {
    if (!clientId) {
      setError(new Error(latest.current.t("Payment isn't available right now.", "지금은 결제를 할 수 없어요.")));
      return;
    }
    const base = `/api/orders/${encodeURIComponent(number)}/paypal`;
    const query = `?t=${encodeURIComponent(token)}`;
    let buttons;
    let gone = false;
    let serverError = null;

    loadSdk(clientId, lang === "ko" ? "ko_KR" : "en_US").then(
      (paypal) => {
        if (gone || !box.current) return;
        buttons = paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "pill", label: "pay", height: 48 },
          createOrder: async () => {
            setError(null);
            serverError = null;
            try {
              const { id } = await postJson(base + query, { lang: latest.current.lang });
              return id;
            } catch (err) {
              serverError = err;
              throw err;
            }
          },
          onApprove: async (data, actions) => {
            setBusy(true);
            try {
              const order = await postJson(`${base}/capture${query}`, { lang: latest.current.lang, paypalOrderId: data.orderID });
              latest.current.onPaid(order);
            } catch (err) {
              setBusy(false);
              setError(err);
              if (err.retry) return actions.restart(); // declined: let the buyer pick another card or account
            }
          },
          onCancel: () =>
            setError(new Error(latest.current.t("Payment was cancelled. You can try again.", "결제가 취소되었어요. 다시 시도할 수 있어요."))),
          onError: () =>
            setError(
              serverError ??
                new Error(latest.current.t("PayPal ran into a problem. Please try again.", "PayPal에서 문제가 생겼어요. 다시 시도해 주세요."))
            ),
        });
        buttons.render(box.current).catch(() => {});
      },
      (err) => !gone && setError(err)
    );

    return () => {
      gone = true;
      Promise.resolve(buttons?.close?.()).catch(() => {});
    };
  }, [clientId, number, token, lang]);

  return (
    <div>
      <div ref={box} className={busy ? "pointer-events-none opacity-40" : ""} />
      {busy && (
        <p className="oo-small mt-3 text-center text-strong" role="status">
          {t("Confirming your payment…", "결제를 확인하는 중…")}
        </p>
      )}
      <div className="mt-3 text-center">
        <ErrorText error={error} />
      </div>
    </div>
  );
}
