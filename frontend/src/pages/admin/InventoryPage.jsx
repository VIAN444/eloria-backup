import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiError } from "@/api/client";

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => api.get("/products", { params: { include_inactive: true } }).then((r) => r.data) });

  const adjust = useMutation({
    mutationFn: ({ id, delta }) => api.post("/admin/inventory/adjust", { product_id: id, delta }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div data-testid="admin-inventory-page">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Inventario</h1>
      <div className="w-full overflow-x-auto border border-stone-200 bg-white" data-testid="admin-inventory-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100/70 border-b border-stone-200 text-left text-xs font-mono uppercase tracking-widest text-stone-600">
              <th className="px-5 py-3.5">Producto</th><th className="px-5 py-3.5">Stock</th>
              <th className="px-5 py-3.5">Umbral alerta</th><th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5">Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.stock <= (p.low_stock_threshold ?? 3);
              return (
                <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50/80" data-testid={`inventory-row-${p.id}`}>
                  <td className="px-5 py-4 font-medium text-stone-900">{p.name}</td>
                  <td className="px-5 py-4 font-mono" data-testid={`inventory-stock-${p.id}`}>{p.stock}</td>
                  <td className="px-5 py-4 font-mono text-stone-500">{p.low_stock_threshold ?? 3}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-mono uppercase ${p.stock === 0 ? "bg-red-50 text-red-800" : low ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                      {p.stock === 0 ? "Agotado" : low ? "Stock bajo" : "OK"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {[1, 5, 10].map((d) => (
                        <button key={d} onClick={() => adjust.mutate({ id: p.id, delta: d })}
                                data-testid={`inventory-add-${d}-${p.id}`}
                                className="px-2.5 py-1 text-xs font-mono border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-colors">+{d}</button>
                      ))}
                      <button onClick={() => adjust.mutate({ id: p.id, delta: -1 })}
                              data-testid={`inventory-subtract-${p.id}`}
                              className="px-2.5 py-1 text-xs font-mono border border-stone-300 hover:border-red-800 hover:bg-red-800 hover:text-white transition-colors">−1</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
