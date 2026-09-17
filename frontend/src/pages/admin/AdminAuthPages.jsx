import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, apiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const inputCls =
  "w-full rounded-none bg-stone-50/50 border border-stone-300 px-4 py-3 text-sm font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (v) => {
    setError("");
    try {
      await login(v.email, v.password);
      navigate("/admin");
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3F0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-stone-200 p-10" data-testid="admin-login-page">
        <p className="font-serif text-3xl text-stone-900">ÉLORIA</p>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-500 mt-2 mb-8">Panel administrativo</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Correo</label>
            <input {...register("email")} type="email" data-testid="admin-login-email-input" className={inputCls} placeholder="admin@eloria.com" />
            {errors.email && <p className="text-xs text-red-700 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Contraseña</label>
            <input {...register("password")} type="password" data-testid="admin-login-password-input" className={inputCls} placeholder="••••••••" />
            {errors.password && <p className="text-xs text-red-700 mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-sm text-red-700" data-testid="admin-login-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} data-testid="admin-login-submit-button"
                  className="w-full uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors disabled:opacity-50">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <Link to="/admin/forgot-password" data-testid="admin-forgot-password-link"
              className="block text-xs text-stone-500 hover:text-stone-900 mt-6 text-center transition-colors">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link to="/" className="block text-xs text-stone-400 hover:text-stone-700 mt-3 text-center transition-colors">← Volver a la tienda</Link>
      </div>
    </div>
  );
}

const forgotSchema = z.object({ email: z.string().email("Correo inválido") });

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (v) => {
    try { await api.post("/auth/forgot-password", v); } catch { /* respuesta genérica */ }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F3F0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-stone-200 p-10" data-testid="forgot-password-page">
        <p className="font-serif text-2xl text-stone-900 mb-6">Restablecer contraseña</p>
        {sent ? (
          <p className="text-sm text-stone-600" data-testid="forgot-password-confirmation">
            Si ese correo está registrado, recibirás un enlace de restablecimiento.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <input {...register("email")} type="email" data-testid="forgot-password-email-input" className={inputCls} placeholder="tu@correo.com" />
            {errors.email && <p className="text-xs text-red-700">{errors.email.message}</p>}
            <button type="submit" disabled={isSubmitting} data-testid="forgot-password-submit-button"
                    className="w-full uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors disabled:opacity-50">
              Enviar enlace
            </button>
          </form>
        )}
        <Link to="/admin/login" className="block text-xs text-stone-500 hover:text-stone-900 mt-6 text-center">← Volver a iniciar sesión</Link>
      </div>
    </div>
  );
}

const resetSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetSchema) });

  const onSubmit = async (v) => {
    setError("");
    try {
      await api.post("/auth/reset-password", { token: params.get("token") || "", password: v.password });
      navigate("/admin/login");
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3F0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-stone-200 p-10" data-testid="reset-password-page">
        <p className="font-serif text-2xl text-stone-900 mb-6">Nueva contraseña</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <input {...register("password")} type="password" data-testid="reset-password-input" className={inputCls} placeholder="Nueva contraseña" />
          {errors.password && <p className="text-xs text-red-700">{errors.password.message}</p>}
          <input {...register("confirm")} type="password" data-testid="reset-password-confirm-input" className={inputCls} placeholder="Confirmar contraseña" />
          {errors.confirm && <p className="text-xs text-red-700">{errors.confirm.message}</p>}
          {error && <p className="text-sm text-red-700" data-testid="reset-password-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} data-testid="reset-password-submit-button"
                  className="w-full uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors disabled:opacity-50">
            Guardar contraseña
          </button>
        </form>
        <Link to="/admin/login" className="block text-xs text-stone-500 hover:text-stone-900 mt-6 text-center">← Volver a iniciar sesión</Link>
      </div>
    </div>
  );
}
