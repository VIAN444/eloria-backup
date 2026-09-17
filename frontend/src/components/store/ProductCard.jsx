import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fmtMXN } from "@/api/client";
import { useCart } from "@/context/CartContext";

export function ProductCard({ product, featured = false }) {
  const { addItem } = useCart();
  const out = product.stock <= 0;
  const low = !out && product.stock <= (product.low_stock_threshold ?? 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative bg-white border border-stone-200/90 p-5 md:p-6 transition-all duration-300 hover:border-stone-900 hover:-translate-y-1 ${featured ? "sm:col-span-2" : ""}`}
      data-testid={`product-card-${product.id}`}
    >
      <Link to={`/producto/${product.id}`} data-testid={`product-card-link-${product.id}`}>
        <div className={`relative ${featured ? "aspect-[16/10]" : "aspect-[3/4]"} w-full overflow-hidden bg-stone-100 mb-5`}>
          {product.images?.[0] && (
            <img src={product.images[0]} alt={product.name} loading="lazy"
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}
          {product.featured && (
            <span className="absolute top-3 left-3 bg-stone-900/90 text-stone-100 text-[10px] font-mono uppercase tracking-[0.15em] px-2.5 py-1">
              Destacado
            </span>
          )}
          {low && (
            <span className="absolute top-3 right-3 bg-amber-700/90 text-white text-[10px] font-mono uppercase tracking-[0.15em] px-2.5 py-1">
              Solo {product.stock} disponibles
            </span>
          )}
          {out && (
            <span className="absolute top-3 right-3 bg-red-900/90 text-white text-[10px] font-mono uppercase tracking-[0.15em] px-2.5 py-1">
              Agotado
            </span>
          )}
        </div>
        <h3 className="font-serif text-xl sm:text-2xl text-stone-900 group-hover:text-amber-800 transition-colors">{product.name}</h3>
        <p className="text-xs font-mono uppercase tracking-widest text-stone-500 mt-1">{product.category?.name || "Sin categoría"}</p>
        <p className="text-base font-sans font-semibold text-stone-900 mt-3" data-testid={`product-card-price-${product.id}`}>
          {fmtMXN(product.price)}
        </p>
      </Link>
      <button
        disabled={out}
        onClick={() => addItem(product)}
        data-testid={`product-card-add-to-cart-${product.id}`}
        className="mt-4 w-full border border-stone-900 text-stone-900 py-2.5 text-xs font-mono uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-900"
      >
        {out ? "Agotado" : "Agregar al carrito"}
      </button>
    </motion.div>
  );
}
