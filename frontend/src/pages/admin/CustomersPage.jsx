import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function CustomersPage() {
  const { data: customers = [] } = useQuery({ queryKey: ["admin-customers"], queryFn: () => api.get("/admin/customers").then((r) => r.data) });

  return (
    <div data-testid="admin-customers-page">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Clientes</h1>
      <div className="w-full overflow-x-auto border border-stone-200 bg-white" data-testid="admin-customers-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100/70 border-b border-stone-200 text-left text-xs font-mono uppercase tracking-widest text-stone-600">
              <th className="px-5 py-3.5">Nombre</th><th className="px-5 py-3.5">Correo</th>
              <th className="px-5 py-3.5">Teléfono</th><th className="px-5 py-3.5">Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-stone-500" data-testid="customers-empty">Aún no hay clientes.</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.email} className="border-b border-stone-100 hover:bg-stone-50/80" data-testid={`customer-row-${c.id || c.email}`}>
                <td className="px-5 py-4 font-medium text-stone-900">{c.name}</td>
                <td className="px-5 py-4 text-stone-600">{c.email}</td>
                <td className="px-5 py-4 text-stone-600">{c.phone}</td>
                <td className="px-5 py-4 font-mono">{c.orders_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
