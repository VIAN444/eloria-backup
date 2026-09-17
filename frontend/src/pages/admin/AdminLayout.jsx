import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, FolderTree, LayoutDashboard, LogOut, MapPin, Settings, ShoppingBag, Truck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/admin", end: true, label: "Panel Principal", icon: LayoutDashboard, testid: "admin-sidebar-nav-dashboard" },
  { to: "/admin/productos", label: "Productos", icon: ShoppingBag, testid: "admin-sidebar-nav-products" },
  { to: "/admin/categorias", label: "Categorías", icon: FolderTree, testid: "admin-sidebar-nav-categories" },
  { to: "/admin/inventario", label: "Inventario", icon: Boxes, testid: "admin-sidebar-nav-inventory" },
  { to: "/admin/pedidos", label: "Pedidos", icon: BarChart3, testid: "admin-sidebar-nav-orders" },
  { to: "/admin/clientes", label: "Clientes", icon: Users, testid: "admin-sidebar-nav-customers" },
  { to: "/admin/entrega", label: "Entrega y Puntos", icon: MapPin, testid: "admin-sidebar-nav-delivery" },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings, testid: "admin-sidebar-nav-settings" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user === null) {
    return <div className="min-h-screen bg-[#F4F3F0] flex items-center justify-center" data-testid="admin-loading">
      <p className="text-sm font-mono uppercase tracking-widest text-stone-500">Verificando sesión...</p>
    </div>;
  }
  if (user === false) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-[#F4F3F0] flex">
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-7 border-b border-stone-800">
          <p className="font-serif text-2xl text-stone-50">ÉLORIA</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500 mt-1">Command Center</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {LINKS.map(({ to, end, label, icon: Icon, testid }) => (
            <NavLink key={to} to={to} end={end} data-testid={testid}
                     className={({ isActive }) =>
                       `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-stone-800 text-white" : "hover:bg-stone-800/60 hover:text-white"}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-stone-800">
          <p className="px-3 py-2 text-xs text-stone-500 truncate">{user.email}</p>
          <button onClick={async () => { await logout(); navigate("/admin/login"); }} data-testid="admin-logout-button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-stone-400 hover:text-white hover:bg-stone-800/60 transition-colors">
            <LogOut size={16} /> Salir
          </button>
          <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-400 hover:text-white transition-colors">
            <Truck size={16} /> Ver tienda
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 p-8 lg:p-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
