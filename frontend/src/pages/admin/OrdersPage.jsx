import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, X } from "lucide-react";
import { api, apiError, fmtCents, ORDER_STATUS_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/api/client";

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

export default function OrdersPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState(null);
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.get("/orders").then((r) => r.data) });

  const patch = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/orders/${id}/status`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Pedido actualizado"); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div data-testid="admin-orders-page">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Pedidos</h1>
      <div className="w-full overflow-x-auto border border-stone-200 bg-white" data-testid="admin-orders-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100/70 border-b border-stone-200 text-left text-xs font-mono uppercase tracking-widest text-stone-600">
              <th className="px-5 py-3.5">Folio</th><th className="px-5 py-3.5">Cliente</th><th className="px-5 py-3.5">Total</th>
              <th className="px-5 py-3.5">Pago</th><th className="px-5 py-3.5">Estado pago</th><th className="px-5 py-3.5">Estado pedido</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-stone-500" data-testid="orders-empty">Aún no hay pedidos.</td></tr>
            )}
            {orders.map((o, idx) => (
              <tr key={o.id} className="border-b border-stone-100 hover:bg-stone-50/80 cursor-pointer" onClick={() => setDetail(o)} data-testid={`admin-order-row-${o.id}`}>
                <td className="px-5 py-4 font-mono text-stone-900">{o.folio}</td>
                <td className="px-5 py-4 text-stone-700">{o.customer.name}</td>
                <td className="px-5 py-4 font-medium">{fmtCents(o.total_cents)}</td>
                <td className="px-5 py-4 text-stone-500">{PAYMENT_LABELS[o.payment_method]}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-mono uppercase ${o.payment_status === "paid" ? "bg-emerald-50 text-emerald-800" : o.payment_status === "pending" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>
                    {PAYMENT_STATUS_LABELS[o.payment_status]}
                  </span>
                </td>
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                  <select value={o.order_status} onChange={(e) => patch.mutate({ id: o.id, body: { order_status: e.target.value } })}
                          data-testid={`admin-order-status-select-${idx}`}
                          className="rounded-none bg-white border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-stone-900">
                    {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-6" data-testid="admin-order-detail-modal">
          <div className="bg-white border border-stone-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="font-mono text-lg text-stone-900">{detail.folio}</p>
                <p className="text-xs text-stone-500 mt-1">{new Date(detail.created_at).toLocaleString("es-MX")}</p>
              </div>
              <button onClick={() => setDetail(null)} data-testid="admin-order-detail-close" className="text-stone-400 hover:text-stone-900"><X size={18} /></button>
            </div>
            <div className="text-sm space-y-1 mb-6">
              <p className="font-medium text-stone-900">{detail.customer.name}</p>
              <p className="text-stone-500">{detail.customer.email}</p>
              <p className="text-stone-500">{detail.customer.phone}</p>
            </div>
            {detail.items.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm py-2 border-b border-stone-100">
                <span className="text-stone-700">{i.name} ×{i.quantity}</span>
                <span>{fmtCents(i.subtotal_cents)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-sm font-semibold">
              <span>Total</span><span>{fmtCents(detail.total_cents)}</span>
            </div>
            <div className="mt-4 text-sm text-stone-600">
              <p>Entrega: {detail.delivery_method === "pickup" ? `Punto · ${detail.pickup_point?.name}` : `Domicilio · ${detail.address?.street}, ${detail.address?.city}`}</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              {detail.payment_status !== "paid" && (
                <button onClick={() => { patch.mutate({ id: detail.id, body: { payment_status: "paid" } }); setDetail(null); }}
                        data-testid="admin-order-mark-paid-button"
                        className="px-5 py-2.5 text-xs font-mono uppercase tracking-widest bg-emerald-800 text-white hover:bg-emerald-900">
                  Marcar pagado
                </button>
              )}
              {detail.order_status !== "cancelled" && (
                <button onClick={() => { if (window.confirm("¿Cancelar pedido? El stock será restablecido.")) { patch.mutate({ id: detail.id, body: { order_status: "cancelled" } }); setDetail(null); } }}
                        data-testid="admin-order-cancel-button"
                        className="px-5 py-2.5 text-xs font-mono uppercase tracking-widest border border-red-300 text-red-800 hover:bg-red-800 hover:text-white">
                  Cancelar
                </button>
              )}
              {detail.whatsapp_url && (
                <a href={detail.whatsapp_url} target="_blank" rel="noreferrer" data-testid="admin-order-whatsapp-link"
                   className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-widest border border-stone-300 hover:border-stone-900">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
