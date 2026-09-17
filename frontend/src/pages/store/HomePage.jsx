import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { api } from "@/api/client";
import { ProductCard } from "@/components/store/ProductCard";

const HERO_IMG = "https://images.unsplash.com/photo-1547887537-6158d64c35b3?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function HomePage() {
  const [category, setCategory] = useState(null);
  const [q, setQ] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", category, q],
    queryFn: () =>
      api.get("/products", { params: { ...(category ? { category } : {}), ...(q ? { q } : {}) } }).then((r) => r.data),
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div className="lg:col-span-7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-800 mb-6">Alta perfumería mexicana</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-light tracking-tight leading-tight text-stone-900">
              El aroma como<br /><em className="font-semibold">archivo íntimo</em>
            </h1>
            <p className="text-base font-sans font-light leading-relaxed text-stone-600 mt-6 max-w-md">
              Composiciones de autor con ingredientes nobles de México: copal, vainilla de Papantla, mezquite y flores blancas.
            </p>
            <a href="#coleccion" data-testid="hero-cta-button"
               className="inline-block mt-10 uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 hover:text-white transition-colors duration-200">
              Explorar la colección
            </a>
          </motion.div>
          <motion.div className="lg:col-span-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
            <div className="aspect-[3/4] bg-stone-100 overflow-hidden border border-stone-200">
              <img src={HERO_IMG} alt="ÉLORIA frasco de perfume con luz dorada" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="manifiesto" className="border-y border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            ["I", "Origen", "Ingredientes trazables de productores mexicanos."],
            ["II", "Oficio", "Maceración lenta y embotellado artesanal."],
            ["III", "Verdad", "Precios y existencias siempre reales, sin artificios."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-5">
              <span className="font-serif italic text-3xl text-amber-700">{n}</span>
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600">{t}</p>
                <p className="text-sm font-light text-stone-500 mt-2 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="coleccion" className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600 mb-3">Familias olfativas</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal tracking-tight text-stone-900">La Colección</h2>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar perfume..."
              data-testid="catalog-search-input"
              className="w-full rounded-none bg-stone-50/50 border border-stone-300 pl-10 pr-4 py-3 text-sm font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-12" data-testid="catalog-category-filters">
          <button onClick={() => setCategory(null)} data-testid="filter-category-all"
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-colors ${!category ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:border-stone-900"}`}>
            Todas
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id === category ? null : c.id)}
                    data-testid={`filter-category-${c.slug}`}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-colors ${category === c.id ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:border-stone-900"}`}>
              {c.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500 py-20 text-center" data-testid="catalog-loading">Cargando colección...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-stone-500 py-20 text-center" data-testid="catalog-empty">No hay productos que coincidan.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10" data-testid="catalog-grid">
            {products.map((p, idx) => (
              <ProductCard key={p.id} product={p} featured={idx === 0 && !category && !q && p.featured} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
