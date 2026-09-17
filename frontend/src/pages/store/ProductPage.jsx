import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { api, fmtMXN } from "@/api/client";
import { useCart } from "@/context/CartContext";

export default function ProductPage() {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const { data: p, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-center py-32 text-stone-500" data-testid="product-loading">Cargando...</p>;
  if (isError || !p) return <p className="text-center py-32 text-stone-500" data-testid="product-not-found">Producto no encontrado.</p>;

  const out = p.stock <= 0;
  const notes = p.notes || {};

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
      <Link to="/" data-testid="product-back-link" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-stone-500 hover:text-stone-900 mb-10">
        <ArrowLeft size={14} /> Volver a la colección
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <motion.div className="lg:col-span-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <div className="aspect-[4/5] bg-stone-100 overflow-hidden border border-stone-200">
            {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
          </div>
        </motion.div>
        <motion.div className="lg:col-span-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-800 mb-4">{p.category?.name}</p>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight text-stone-900" data-testid="product-title">{p.name}</h1>
          <p className="text-2xl font-sans font-semibold text-stone-900 mt-4" data-testid="product-price">{fmtMXN(p.price)}</p>

          <div className="mt-4" data-testid="product-stock-indicator">
            {out ? (
              <span className="inline-flex px-3 py-1 text-xs font-mono uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">Agotado</span>
            ) : p.stock <= (p.low_stock_threshold ?? 3) ? (
              <span className="inline-flex px-3 py-1 text-xs font-mono uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">Solo {p.stock} disponibles</span>
            ) : (
              <span className="inline-flex px-3 py-1 text-xs font-mono uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">En existencia</span>
            )}
          </div>

          <p className="text-base font-light leading-relaxed text-stone-600 mt-6" data-testid="product-description">{p.description}</p>

          {(notes.salida || notes.corazon || notes.fondo) && (
            <div className="mt-8 border border-stone-200 divide-y divide-stone-100" data-testid="product-notes-pyramid">
              {[["Salida", notes.salida], ["Corazón", notes.corazon], ["Fondo", notes.fondo]].map(([k, v]) =>
                v ? (
                  <div key={k} className="px-5 py-4 flex gap-6">
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500 w-20 shrink-0 pt-0.5">{k}</span>
                    <span className="text-sm font-light text-stone-700">{v}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          <div className="flex items-stretch gap-4 mt-10">
            <div className="flex items-center border border-stone-300">
              <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="product-qty-decrease" className="w-11 h-full flex items-center justify-center hover:bg-stone-100">
                <Minus size={14} />
              </button>
              <span className="w-10 text-center font-mono text-sm" data-testid="product-qty-value">{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1))} data-testid="product-qty-increase" className="w-11 h-full flex items-center justify-center hover:bg-stone-100">
                <Plus size={14} />
              </button>
            </div>
            <button
              disabled={out}
              onClick={() => addItem(p, qty)}
              data-testid="product-add-to-cart-button"
              className="flex-1 uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {out ? "Agotado" : "Agregar al carrito"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
