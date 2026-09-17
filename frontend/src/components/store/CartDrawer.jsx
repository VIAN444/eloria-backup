import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtMXN } from "@/api/client";
import { useCart } from "@/context/CartContext";

export function CartDrawer() {
  const { items, total, open, setOpen, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/40 z-[60]" onClick={() => setOpen(false)}
            data-testid="cart-drawer-overlay"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] flex flex-col border-l border-stone-200"
            data-testid="cart-drawer"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
              <p className="font-serif text-2xl text-stone-900">Tu carrito</p>
              <button onClick={() => setOpen(false)} data-testid="cart-drawer-close" className="text-stone-500 hover:text-stone-900">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <p className="text-sm text-stone-500 font-light py-16 text-center" data-testid="cart-empty-message">
                  Tu carrito está vacío.
                </p>
              ) : (
                items.map((i) => (
                  <div key={i.id} className="flex gap-4 py-4 border-b border-stone-100" data-testid={`cart-item-${i.id}`}>
                    <div className="w-16 h-20 bg-stone-100 overflow-hidden shrink-0">
                      {i.image && <img src={i.image} alt={i.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-serif text-lg text-stone-900 leading-tight">{i.name}</p>
                      <p className="text-sm font-semibold text-stone-900 mt-1">{fmtMXN(i.price)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateQty(i.id, i.quantity - 1)} data-testid={`cart-item-decrease-${i.id}`}
                                className="w-7 h-7 border border-stone-300 flex items-center justify-center hover:border-stone-900">
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-mono w-6 text-center" data-testid={`cart-item-qty-${i.id}`}>{i.quantity}</span>
                        <button onClick={() => updateQty(i.id, Math.min(i.quantity + 1, i.stock))} data-testid={`cart-item-increase-${i.id}`}
                                className="w-7 h-7 border border-stone-300 flex items-center justify-center hover:border-stone-900">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeItem(i.id)} data-testid={`cart-item-remove-${i.id}`}
                            className="text-stone-400 hover:text-red-700 self-start">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-stone-200 px-6 py-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-500">Subtotal estimado</span>
                  <span className="font-semibold text-stone-900" data-testid="cart-subtotal">{fmtMXN(total)}</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-5">El total final se calcula en el checkout.</p>
                <button
                  onClick={() => { setOpen(false); navigate("/checkout"); }}
                  data-testid="cart-drawer-checkout-button"
                  className="w-full uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 hover:text-white transition-colors duration-200"
                >
                  Finalizar compra
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
