import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiError } from "@/api/client";

const FIELDS = [
  ["store_name", "Nombre de la tienda"],
  ["whatsapp_number", "Número de WhatsApp (con código de país)"],
  ["bank_name", "Banco"],
  ["bank_account_holder", "Titular de la cuenta"],
  ["bank_clabe", "CLABE interbancaria"],
  ["bank_account_number", "Número de cuenta"],
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.get("/admin/settings").then((r) => r.data) });
  const [form, setForm] = useState(null);

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", {
      store_name: form.store_name, whatsapp_number: form.whatsapp_number,
      bank_name: form.bank_name || "", bank_account_holder: form.bank_account_holder || "",
      bank_clabe: form.bank_clabe || "", bank_account_number: form.bank_account_number || "",
      shipping_enabled: !!form.shipping_enabled, pickup_enabled: !!form.pickup_enabled,
      shipping_cost: Number(form.shipping_cost) || 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["store-config"] }); toast.success("Configuración guardada"); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!form) return <p className="text-sm text-stone-500" data-testid="settings-loading">Cargando...</p>;

  const inputCls = "w-full rounded-none bg-white border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900";

  return (
    <div data-testid="admin-settings-page" className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-8">Configuración General</h1>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">{label}</label>
            <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                   data-testid={`settings-input-${key.replace(/_/g, "-")}`} className={inputCls} />
          </div>
        ))}
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Costo de envío base (MXN)</label>
          <input type="number" min="0" step="0.01" value={form.shipping_cost ?? 0}
                 onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                 data-testid="settings-input-shipping-cost" className={inputCls} />
        </div>
        <div className="flex gap-8 text-sm text-stone-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.shipping_enabled} onChange={(e) => setForm({ ...form, shipping_enabled: e.target.checked })}
                   data-testid="settings-input-shipping-enabled" /> Envío a domicilio activo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.pickup_enabled} onChange={(e) => setForm({ ...form, pickup_enabled: e.target.checked })}
                   data-testid="settings-input-pickup-enabled" /> Puntos de encuentro activos
          </label>
        </div>
        <p className="text-xs text-stone-400">Las claves secretas (Stripe) se gestionan por variables de entorno, nunca aquí.</p>
        <button type="submit" disabled={save.isPending} data-testid="settings-save-button"
                className="px-8 py-4 text-xs font-mono uppercase tracking-[0.18em] bg-stone-900 text-white hover:bg-amber-900 disabled:opacity-50">
          {save.isPending ? "Guardando..." : "Guardar configuración"}
        </button>
      </form>
    </div>
  );
}
