import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, apiError, fmtMXN } from "@/api/client";

const empty = { name: "", description: "", price: "", category_id: "", images: "", stock: 0, low_stock_threshold: 3, featured: false, active: true, notes: { salida: "", corazon: "", fondo: "" } };

export default function ProductsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null = cerrado, {} = form
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => api.get("/products", { params: { include_inactive: true } }).then((r) => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => api.get("/categories").then((r) => r.data) });

  const save = useMutation({
    mutationFn: (form) => {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), low_stock_threshold: Number(form.low_stock_threshold), images: form.images ? [form.images] : [], category_id: form.category_id || null };
      return form.id ? api.put(`/products/${form.id}`, payload) : api.post("/products", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); setEditing(null); toast.success("Producto guardado"); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Producto eliminado"); },
    onError: (e) => toast.error(apiError(e)),
  });

  const inputCls = "w-full rounded-none bg-stone-50/50 border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:border-stone-900";

  return (
    <div data-testid="admin-products-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif text-stone-900">Productos</h1>
        <button onClick={() => setEditing({ ...empty })} data-testid="admin-create-product-button"
                className="flex items-center gap-2 uppercase tracking-[0.15em] text-xs font-mono px-5 py-3 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors">
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      <div className="w-full overflow-x-auto border border-stone-200 bg-white" data-testid="admin-products-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100/70 border-b border-stone-200 text-left text-xs font-mono uppercase tracking-widest text-stone-600">
              <th className="px-5 py-3.5">Producto</th><th className="px-5 py-3.5">Categoría</th>
              <th className="px-5 py-3.5">Precio</th><th className="px-5 py-3.5">Stock</th>
              <th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50/80" data-testid={`admin-product-row-${p.id}`}>
                <td className="px-5 py-4 font-medium text-stone-900">{p.name}</td>
                <td className="px-5 py-4 text-stone-500">{p.category?.name || "—"}</td>
                <td className="px-5 py-4">{fmtMXN(p.price)}</td>
                <td className="px-5 py-4 font-mono">{p.stock}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-mono uppercase ${p.active ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing({ ...p, images: (p.images || [])[0] || "", notes: { salida: "", corazon: "", fondo: "", ...(p.notes || {}) } })}
                            data-testid={`admin-edit-product-${p.id}`} className="p-2 text-stone-500 hover:text-stone-900"><Pencil size={15} /></button>
                    <button onClick={() => { if (window.confirm("¿Eliminar producto?")) del.mutate(p.id); }}
                            data-testid={`admin-delete-product-${p.id}`} className="p-2 text-stone-500 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-6" data-testid="admin-product-dialog">
          <div className="bg-white border border-stone-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-8">
            <p className="font-serif text-2xl text-stone-900 mb-6">{editing.id ? "Editar producto" : "Nuevo producto"}</p>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }} className="space-y-4">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required
                     data-testid="product-form-name" placeholder="Nombre" className={inputCls} />
              <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        data-testid="product-form-description" placeholder="Descripción" rows={3} className={inputCls} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} required
                       data-testid="product-form-price" placeholder="Precio MXN" className={inputCls} />
                <input type="number" min="0" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} required
                       data-testid="product-form-stock" placeholder="Stock" className={inputCls} />
              </div>
              <select value={editing.category_id || ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                      data-testid="product-form-category" className={inputCls}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={editing.images} onChange={(e) => setEditing({ ...editing, images: e.target.value })}
                     data-testid="product-form-image" placeholder="URL de imagen" className={inputCls} />
              <div className="grid grid-cols-3 gap-3">
                <input value={editing.notes.salida} onChange={(e) => setEditing({ ...editing, notes: { ...editing.notes, salida: e.target.value } })} placeholder="Notas salida" className={inputCls} />
                <input value={editing.notes.corazon} onChange={(e) => setEditing({ ...editing, notes: { ...editing.notes, corazon: e.target.value } })} placeholder="Notas corazón" className={inputCls} />
                <input value={editing.notes.fondo} onChange={(e) => setEditing({ ...editing, notes: { ...editing.notes, fondo: e.target.value } })} placeholder="Notas fondo" className={inputCls} />
              </div>
              <div className="flex gap-6 text-sm text-stone-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} data-testid="product-form-featured" /> Destacado
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} data-testid="product-form-active" /> Activo
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} data-testid="product-form-cancel"
                        className="px-6 py-3 text-xs font-mono uppercase tracking-widest border border-stone-300 hover:border-stone-900">Cancelar</button>
                <button type="submit" disabled={save.isPending} data-testid="product-form-save"
                        className="px-6 py-3 text-xs font-mono uppercase tracking-widest bg-stone-900 text-white hover:bg-amber-900 disabled:opacity-50">
                  {save.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
