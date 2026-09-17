import "@/App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import StoreLayout from "@/components/store/StoreLayout";
import HomePage from "@/pages/store/HomePage";
import ProductPage from "@/pages/store/ProductPage";
import CheckoutPage from "@/pages/store/CheckoutPage";
import OrderConfirmationPage from "@/pages/store/OrderConfirmationPage";
import PaymentResultPage from "@/pages/store/PaymentResultPage";
import AdminLoginPage, { ForgotPasswordPage, ResetPasswordPage } from "@/pages/admin/AdminAuthPages";
import AdminLayout from "@/pages/admin/AdminLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import InventoryPage from "@/pages/admin/InventoryPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import CustomersPage from "@/pages/admin/CustomersPage";
import DeliveryPage from "@/pages/admin/DeliveryPage";
import SettingsPage from "@/pages/admin/SettingsPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<StoreLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/producto/:id" element={<ProductPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
                <Route path="/pago/exitoso" element={<PaymentResultPage success />} />
                <Route path="/pago/cancelado" element={<PaymentResultPage />} />
              </Route>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="productos" element={<ProductsPage />} />
                <Route path="categorias" element={<CategoriesPage />} />
                <Route path="inventario" element={<InventoryPage />} />
                <Route path="pedidos" element={<OrdersPage />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route path="entrega" element={<DeliveryPage />} />
                <Route path="configuracion" element={<SettingsPage />} />
              </Route>
            </Routes>
            <Toaster position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
