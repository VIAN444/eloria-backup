import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, fmtCents } from "@/api/client";
import { fmtMXN } from "@/api/client";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
  });

  if (isLoading || !data) return <p className="text-sm text-stone-500" data-testid="dashboard-loading">Cargando panel...</p>;

  const kpis = [
    { label: "Ventas totales", value: fmtCents(data.ventas_totales_cents), testid: "kpi-total-sales" },
    { label: "Pedidos activos", value: data.pedidos_pendientes, testid: "kpi-pending-orders" },
    { label: "Ticket promedio", value: fmtCents(data.ticket_promedio_cents), testid: "kpi-avg-ticket" },
    { label: "Stock crítico", value: data.stock_critico, testid: "kpi-low-stock" },
  ];

  return (
    <div data-testid="admin-dashboard-page">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Panel Principal</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-10">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-stone-200 p-6" data-testid={k.testid}>
            <p className="text-[11px] font-mono uppercase tracking-widest text-stone-500">{k.label}</p>
            <p className="text-2xl font-sans font-semibold text-stone-900 mt-2">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 p-6 mb-10" data-testid="dashboard-sales-chart">
        <p className="text-xs font-mono uppercase tracking-widest text-stone-600 mb-6">Ventas últimos 14 días (MXN)</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.sales_by_day}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#75716B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#75716B" }} />
            <Tooltip formatter={(v) => fmtMXN(v)} />
            <Area type="monotone" dataKey="total" stroke="#C58A3E" fill="#C58A3E" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200" data-testid="dashboard-recent-orders">
          <p className="px-5 py-4 text-xs font-mono uppercase tracking-widest text-stone-600 border-b border-stone-200">Pedidos recientes</p>
          {data.recent_orders.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Aún no hay pedidos.</p>}
          {data.recent_orders.map((o) => (
            <div key={o.id} className="px-5 py-3.5 border-b border-stone-100 flex justify-between text-sm">
              <span className="font-mono text-stone-700">{o.folio}</span>
              <span className="text-stone-500">{o.customer.name}</span>
              <span className="text-stone-900 font-medium">{fmtCents(o.total_cents)}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-stone-200" data-testid="dashboard-low-stock">
          <p className="px-5 py-4 text-xs font-mono uppercase tracking-widest text-stone-600 border-b border-stone-200">Stock bajo</p>
          {data.low_stock_products.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Inventario saludable.</p>}
          {data.low_stock_products.map((p) => (
            <div key={p.id} className="px-5 py-3.5 border-b border-stone-100 flex justify-between text-sm">
              <span className="text-stone-700">{p.name}</span>
              <span className={`font-mono ${p.stock === 0 ? "text-red-700" : "text-amber-700"}`}>{p.stock} uds</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
