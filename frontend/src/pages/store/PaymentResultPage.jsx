import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";

export default function PaymentResultPage({ success }) {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const orderId = params.get("order_id");
  const [state, setState] = useState({ status: "checking", orderId: orderId || null, folio: null });
  const tries = useRef(0);

  useEffect(() => {
    if (!success) return;
    if (!sessionId) { setState({ status: "error" }); return; }
    let timer;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState({ status: "paid", orderId: data.order_id, folio: data.folio });
          return;
        }
        if (data.payment_status === "failed" || data.payment_status === "expired") {
          setState({ status: data.payment_status, orderId: data.order_id });
          return;
        }
        if (tries.current++ < 20) timer = setTimeout(poll, 2000);
        else setState({ status: "timeout", orderId: data.order_id });
      } catch {
        if (tries.current++ < 5) timer = setTimeout(poll, 2000);
        else setState({ status: "error" });
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [success, sessionId]);

  if (!success) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center" data-testid="payment-cancelled">
        <h1 className="text-3xl font-serif font-light text-stone-900">Pago cancelado</h1>
        <p className="text-sm text-stone-500 mt-4">No se realizó ningún cargo. Tu pedido quedó registrado como pendiente.</p>
        <Link to="/" data-testid="payment-cancelled-home-link"
              className="inline-block mt-8 uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-32 text-center" data-testid="payment-success-page">
      {state.status === "checking" && (
        <>
          <h1 className="text-3xl font-serif font-light text-stone-900">Confirmando tu pago...</h1>
          <p className="text-sm text-stone-500 mt-4" data-testid="payment-confirming">Estamos verificando con Stripe. No cierres esta página.</p>
        </>
      )}
      {state.status === "paid" && (
        <>
          <h1 className="text-3xl font-serif font-light text-stone-900" data-testid="payment-confirmed-title">Pago confirmado</h1>
          <p className="text-sm text-stone-500 mt-4">Tu pedido {state.folio && <span className="font-mono text-stone-900">{state.folio}</span>} ha sido pagado correctamente.</p>
          {state.orderId && (
            <Link to={`/pedido/${state.orderId}`} data-testid="payment-view-order-link"
                  className="inline-block mt-8 uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors">
              Ver mi pedido
            </Link>
          )}
        </>
      )}
      {(state.status === "failed" || state.status === "expired") && (
        <>
          <h1 className="text-3xl font-serif font-light text-stone-900" data-testid="payment-failed-title">El pago no se completó</h1>
          <p className="text-sm text-stone-500 mt-4">Tu pedido fue liberado y el stock restablecido. Puedes intentarlo de nuevo.</p>
          <Link to="/" className="inline-block mt-8 uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors">
            Volver a la tienda
          </Link>
        </>
      )}
      {(state.status === "timeout" || state.status === "error") && (
        <>
          <h1 className="text-3xl font-serif font-light text-stone-900">Verificación pendiente</h1>
          <p className="text-sm text-stone-500 mt-4">Recibimos tu pago, pero la confirmación tarda más de lo habitual. Revisa tu pedido en unos minutos.</p>
          {state.orderId && (
            <Link to={`/pedido/${state.orderId}`} className="inline-block mt-8 text-sm text-stone-700 underline">Ver mi pedido</Link>
          )}
        </>
      )}
    </div>
  );
}
