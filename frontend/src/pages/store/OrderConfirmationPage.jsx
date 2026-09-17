import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { api, fmtCents, PAYMENT_LABELS } from "@/api/client";

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
  });
  const { data: config } = useQuery({ queryKey: ["store-config"], queryFn: () => api.get("/store/config").then((r) => r.data) });

  if (isLoading) return <p className="text-center py-32 text-stone-500" data-testid="order-loading">Cargando pedido...</p>;
  if (isError || !order) return <p className="text-center py-32 text-stone-500" data-testid="order-not-found">Pedido no encontrado.</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24" data-testid="order-confirmation-page">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-800 mb-4">Pedido registrado</p>
      <h1 className="text-3xl sm:text-4xl font-serif font-light text-stone-900">
        Gracias, {order.customer.name.split(" ")[0]}
      </h1>
      <p className="text-sm text-stone-500 mt-3">
        Tu folio es <span className="font-mono text-stone-900" data-testid="order-folio">{order.folio}</span>. Guárdalo para cualquier aclaración.
      </p>

      <div className="border border-stone-200 bg-white p-6 md:p-8 mt-10">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600 mb-5">Detalle del pedido</p>
        {order.items.map((i) => (
          <div key={i.product_id} className="flex justify-between text-sm py-2 border-b border-stone-100">
            <span className="text-stone-700 font-light">{i.name} <span className="text-stone-400">×{i.quantity}</span></span>
            <span className="text-stone-900">{fmtCents(i.subtotal_cents)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-4">
          <span className="text-stone-500">Envío</span>
          <span className="text-stone-900">{order.shipping_cents === 0 ? "Gratis" : fmtCents(order.shipping_cents)}</span>
        </div>
        <div className="flex justify-between pt-3 mt-2 border-t border-stone-200">
          <span className="text-sm font-medium text-stone-900">Total</span>
          <span className="font-semibold text-stone-900" data-testid="order-total">{fmtCents(order.total_cents)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-stone-400 mb-1">Pago</p>
            <p className="text-stone-700" data-testid="order-payment-method">{PAYMENT_LABELS[order.payment_method]}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-stone-400 mb-1">Entrega</p>
            <p className="text-stone-700" data-testid="order-delivery-method">
              {order.delivery_method === "pickup" ? `Punto de encuentro · ${order.pickup_point?.name}` : `Domicilio · ${order.address?.city}`}
            </p>
          </div>
        </div>

        {order.payment_method === "bank_transfer" && config?.bank_clabe && (
          <div className="border border-amber-200 bg-amber-50/50 p-5 mt-6 text-sm" data-testid="order-bank-details">
            <p className="text-xs font-mono uppercase tracking-widest text-amber-800 mb-2">Realiza tu transferencia</p>
            <p className="text-stone-700">{config.bank_name} · {config.bank_account_holder}</p>
            <p className="font-mono text-stone-900 mt-1">CLABE: {config.bank_clabe}</p>
            {config.bank_account_number && <p className="font-mono text-stone-700 mt-1">Cuenta: {config.bank_account_number}</p>}
            <p className="text-xs text-stone-500 mt-3">Usa tu folio {order.folio} como referencia. Confirmaremos tu pago al recibirlo.</p>
          </div>
        )}
        {order.payment_method === "cash_on_delivery" && (
          <p className="text-sm text-stone-500 mt-6" data-testid="order-cod-note">Pagarás en efectivo al momento de la entrega.</p>
        )}
      </div>

      {order.whatsapp_url && (
        <a href={order.whatsapp_url} target="_blank" rel="noreferrer" data-testid="order-confirmation-whatsapp-link"
           className="mt-8 inline-flex items-center gap-2 uppercase tracking-[0.15em] text-xs font-mono font-medium px-7 py-3.5 bg-emerald-800 text-white hover:bg-emerald-900 transition-colors duration-200">
          <MessageCircle size={16} /> Enviar pedido por WhatsApp
        </a>
      )}
      <div className="mt-6">
        <Link to="/" data-testid="order-back-home-link" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
          ← Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
