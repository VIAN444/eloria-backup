import { Link, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { api } from "@/api/client";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "./CartDrawer";
import { ChatWidget } from "./ChatWidget";

export default function StoreLayout() {
  const { count, setOpen } = useCart();
  const { data: config } = useQuery({
    queryKey: ["store-config"],
    queryFn: () => api.get("/store/config").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-stone-50/90 border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto h-20 px-6 md:px-12 flex items-center justify-between">
          <Link to="/" data-testid="nav-logo" className="font-serif text-3xl tracking-tight text-stone-900">
            ÉLORIA
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-[0.2em] text-stone-600">
            <a href="/#coleccion" data-testid="nav-link-coleccion" className="hover:text-stone-950 transition-colors">Colección</a>
            <a href="/#manifiesto" data-testid="nav-link-manifiesto" className="hover:text-stone-950 transition-colors">Manifiesto</a>
            <a href="/#contacto" data-testid="nav-link-contacto" className="hover:text-stone-950 transition-colors">Contacto</a>
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[10px] font-mono uppercase tracking-widest text-stone-400">MXN</span>
            {config?.whatsapp_contact_url && (
              <a href={config.whatsapp_contact_url} target="_blank" rel="noreferrer" data-testid="nav-whatsapp-link"
                 className="text-stone-600 hover:text-emerald-800 transition-colors" aria-label="WhatsApp">
                <MessageCircle size={20} />
              </a>
            )}
            <button onClick={() => setOpen(true)} data-testid="nav-cart-trigger"
                    className="relative text-stone-800 hover:text-stone-950 transition-colors" aria-label="Carrito">
              <ShoppingBag size={22} />
              {count > 0 && (
                <span data-testid="nav-cart-count"
                      className="absolute -top-2 -right-2 bg-stone-900 text-stone-50 text-[10px] font-mono w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer id="contacto" className="border-t border-stone-200 bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <p className="font-serif text-2xl text-stone-900">ÉLORIA</p>
            <p className="text-sm text-stone-500 mt-3 font-light leading-relaxed">
              Alta perfumería mexicana. Esencias de autor elaboradas con ingredientes nobles.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600 mb-4">Tienda</p>
            <div className="flex flex-col gap-2 text-sm text-stone-600">
              <a href="/#coleccion" className="hover:text-stone-950 transition-colors">Colección</a>
              <Link to="/admin/login" data-testid="footer-admin-link" className="hover:text-stone-950 transition-colors">Panel administrativo</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600 mb-4">Atención</p>
            {config?.whatsapp_contact_url && (
              <a href={config.whatsapp_contact_url} target="_blank" rel="noreferrer" data-testid="footer-whatsapp-link"
                 className="text-sm text-stone-600 hover:text-emerald-800 transition-colors">
                Escríbenos por WhatsApp
              </a>
            )}
            <p className="text-sm text-stone-500 mt-2">Precios en pesos mexicanos (MXN).</p>
          </div>
        </div>
        <div className="border-t border-stone-100 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-stone-400">
          © {new Date().getFullYear()} {config?.store_name || "ÉLORIA"}
        </div>
      </footer>

      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
