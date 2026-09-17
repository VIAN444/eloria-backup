import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, apiError } from "@/api/client";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => api.get("/categories").then((r) => r.data) });

  const create = useMutation({
    mutationFn: () => api.post("/categories", { name }),
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoría creada"); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoría eliminada"); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div data-testid="admin-categories-page" className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Categorías</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) create.mutate(); }} className="flex gap-3 mb-8">
        <input value={name} onChange={(e) => setName(e.target.value)} data-testid="category-form-name"
               placeholder="Nueva familia olfativa..." className="flex-1 rounded-none bg-white border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        <button type="submit" disabled={create.isPending} data-testid="admin-create-category-button"
                className="px-6 py-3 text-xs font-mono uppercase tracking-widest bg-stone-900 text-white hover:bg-amber-900 disabled:opacity-50">
          Crear
        </button>
      </form>
      <div className="border border-stone-200 bg-white" data-testid="admin-categories-table">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-5 py-4 border-b border-stone-100 last:border-0" data-testid={`admin-category-row-${c.id}`}>
            <div>
              <p className="text-sm font-medium text-stone-900">{c.name}</p>
              <p className="text-xs text-stone-500">{c.product_count} productos</p>
            </div>
            <button onClick={() => { if (window.confirm("¿Eliminar categoría?")) del.mutate(c.id); }}
                    data-testid={`admin-delete-category-${c.id}`} className="p-2 text-stone-400 hover:text-red-700">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
