import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, apiError } from "@/api/client";

export default function DeliveryPage() {
  const qc = useQueryClient();
  const [newPoint, setNewPoint] = useState({ name: "", address: "", city: "" });
  const { data: methods = [] } = useQuery({ queryKey: ["admin-delivery"], queryFn: () => api.get("/admin/delivery-methods").then((r) => r.data) });
  const { data: points = [] } = useQuery({ queryKey: ["admin-points"], queryFn: () => api.get("/admin/pickup-points").then((r) => r.data) });

  const updateMethod = useMutation({
    mutationFn: (m) => api.put(`/admin/delivery-methods/${m.code}`, m),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-delivery"] }); qc.invalidateQueries({ queryKey: ["delivery-methods"] }); toast.success("Método actualizado"); },
    onError: (e) => toast.error(apiError(e)),
  });
  const addPoint = useMutation({
    mutationFn: () => api.post("/admin/pickup-points", { ...newPoint, enabled: true }),
    onSuccess: () => { setNewPoint({ name: "", address: "", city: "" }); qc.invalidateQueries({ queryKey: ["admin-points"] }); qc.invalidateQueries({ queryKey: ["pickup-points"] }); toast.success("Punto creado"); },
    onError: (e) => toast.error(apiError(e)),
  });
  const togglePoint = useMutation({
    mutationFn: (p) => api.put(`/admin/pickup-points/${p.id}`, { name: p.name, address: p.address, city: p.city, enabled: !p.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-points"] }),
    onError: (e) => toast.error(apiError(e)),
  });
  const delPoint = useMutation({
    mutationFn: (id) => api.delete(`/admin/pickup-points/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-points"] }),
    onError: (e) => toast.error(apiError(e)),
  });

  const inputCls = "rounded-none bg-white border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:border-stone-900";

  return (
    <div data-testid="admin-delivery-page" className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Entrega y Puntos de Encuentro</h1>

      <p className="text-xs font-mono uppercase tracking-widest text-stone-600 mb-4">Métodos de entrega</p>
      <div className="border border-stone-200 bg-white mb-12" data-testid="admin-delivery-methods">
        {methods.map((m) => (
          <div key={m.code} className="flex flex-wrap items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0" data-testid={`delivery-method-${m.code}`}>
            <span className="text-sm font-medium text-stone-900 w-48">{m.name}</span>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              Costo MXN
              <input type="number" min="0" step="0.01" defaultValue={m.cost} id={`cost-${m.code}`}
                     data-testid={`delivery-cost-${m.code}`} className={`${inputCls} w-28`} />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" defaultChecked={m.enabled} id={`enabled-${m.code}`} data-testid={`delivery-enabled-${m.code}`} /> Activo
            </label>
            <button
              onClick={() => updateMethod.mutate({ code: m.code, name: m.name, cost: Number(document.getElementById(`cost-${m.code}`).value), enabled: document.getElementById(`enabled-${m.code}`).checked })}
              data-testid={`delivery-save-${m.code}`}
              className="ml-auto px-4 py-2 text-xs font-mono uppercase tracking-widest bg-stone-900 text-white hover:bg-amber-900">
              Guardar
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs font-mono uppercase tracking-widest text-stone-600 mb-4">Puntos de encuentro</p>
      <form onSubmit={(e) => { e.preventDefault(); if (newPoint.name && newPoint.address && newPoint.city) addPoint.mutate(); }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6" data-testid="pickup-point-form">
        <input value={newPoint.name} onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })} placeholder="Nombre" data-testid="pickup-form-name" className={inputCls} />
        <input value={newPoint.address} onChange={(e) => setNewPoint({ ...newPoint, address: e.target.value })} placeholder="Dirección" data-testid="pickup-form-address" className={inputCls} />
        <input value={newPoint.city} onChange={(e) => setNewPoint({ ...newPoint, city: e.target.value })} placeholder="Ciudad" data-testid="pickup-form-city" className={inputCls} />
        <button type="submit" disabled={addPoint.isPending} data-testid="admin-create-pickup-point-button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-widest bg-stone-900 text-white hover:bg-amber-900 disabled:opacity-50">
          <Plus size={14} /> Agregar
        </button>
      </form>
      <div className="border border-stone-200 bg-white" data-testid="admin-pickup-points-list">
        {points.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-4 border-b border-stone-100 last:border-0" data-testid={`pickup-point-row-${p.id}`}>
            <div>
              <p className="text-sm font-medium text-stone-900">{p.name}</p>
              <p className="text-xs text-stone-500">{p.address} · {p.city}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => togglePoint.mutate(p)} data-testid={`pickup-toggle-${p.id}`}
                      className={`px-3 py-1.5 text-xs font-mono uppercase ${p.enabled ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                {p.enabled ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => { if (window.confirm("¿Eliminar punto?")) delPoint.mutate(p.id); }}
                      data-testid={`pickup-delete-${p.id}`} className="p-2 text-stone-400 hover:text-red-700">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
