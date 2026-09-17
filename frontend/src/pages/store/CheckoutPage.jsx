import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, CreditCard, HandCoins, MapPin, Truck } from "lucide-react";
import { api, apiError, fmtMXN } from "@/api/client";
import { useCart } from "@/context/CartContext";

const schema = z
  .object({
    name: z.string().min(2, "Ingresa tu nombre completo"),
    email: z.string().email("Correo inválido"),
    phone: z.string().min(8, "Teléfono / WhatsApp inválido"),
    delivery_method: z.enum(["pickup", "home_delivery"]),
    pickup_point_id: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    payment_method: z.enum(["card", "bank_transfer", "cash_on_delivery"]),
    notes: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.delivery_method === "home_delivery") {
      if (!v.street || v.street.length < 4) ctx.addIssue({ code: "custom", path: ["street"], message: "Calle y número requeridos" });
      if (!v.city || v.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "Ciudad requerida" });
      if (!v.state || v.state.length < 2) ctx.addIssue({ code: "custom", path: ["state"], message: "Estado requerido" });
      if (!v.zip_code || v.zip_code.length < 4) ctx.addIssue({ code: "custom", path: ["zip_code"], message: "Código postal requerido" });
    }
    if (v.delivery_method === "pickup" && !v.pickup_point_id) {
      ctx.addIssue({ code: "custom", path: ["pickup_point_id"], message: "Selecciona un punto de encuentro" });
    }
  });

const inputCls =
  "w-full rounded-none bg-stone-50/50 border border-stone-300 px-4 py-3 text-sm font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all";
const errCls = "text-xs text-red-700 mt-1";

const STEPS = ["Datos", "Entrega", "Pago"];

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: config } = useQuery({ queryKey: ["store-config"], queryFn: () => api.get("/store/config").then((r) => r.data) });
  const { data: pickupPoints = [] } = useQuery({ queryKey: ["pickup-points"], queryFn: () => api.get("/pickup-points").then((r) => r.data) });
  const { data: deliveryMethods = [] } = useQuery({ queryKey: ["delivery-methods"], queryFn: () => api.get("/delivery-methods").then((r) => r.data) });

  const { register, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { delivery_method: "home_delivery", payment_method: "card" },
    mode: "onTouched",
  });

  const deliveryMethod = watch("delivery_method");
  const paymentMethod = watch("payment_method");
  const pickupPointId = watch("pickup_point_id");

  const shipping = useMemo(() => {
    const m = deliveryMethods.find((d) => d.code === deliveryMethod);
    return m ? Number(m.cost) : 0;
  }, [deliveryMethods, deliveryMethod]);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center" data-testid="checkout-empty">
        <p className="font-serif text-3xl text-stone-900">Tu carrito está vacío</p>
        <button onClick={() => navigate("/")} data-testid="checkout-empty-back"
                className="mt-8 uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 transition-colors">
          Volver a la colección
        </button>
      </div>
    );
  }

  const next = async () => {
    const fields = step === 0 ? ["name", "email", "phone"] : ["delivery_method", "pickup_point_id", "street", "city", "state", "zip_code"];
    if (await trigger(fields)) setStep(step + 1);
  };

  const onSubmit = async (v) => {
    setSubmitting(true);
    try {
      const payload = {
        customer: { name: v.name, email: v.email, phone: v.phone },
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        delivery_method: v.delivery_method,
        pickup_point_id: v.delivery_method === "pickup" ? v.pickup_point_id : null,
        address: v.delivery_method === "home_delivery" ? { street: v.street, city: v.city, state: v.state, zip_code: v.zip_code } : null,
        payment_method: v.payment_method,
        notes: v.notes || null,
      };
      const { data } = await api.post("/orders", payload);
      const order = data.order;
      if (v.payment_method === "card") {
        const ck = await api.post("/payments/create-checkout", { order_id: order.id, origin_url: window.location.origin });
        clear();
        window.location.href = ck.data.checkout_url;
        return;
      }
      clear();
      navigate(`/pedido/${order.id}`);
    } catch (e) {
      toast.error(apiError(e));
      setSubmitting(false);
    }
  };

  const payOptions = [
    { value: "card", label: "Tarjeta", desc: "Pago seguro con Stripe", icon: CreditCard },
    { value: "bank_transfer", label: "Transferencia", desc: "SPEI a nuestra cuenta", icon: Building2 },
    { value: "cash_on_delivery", label: "Contra entrega", desc: "Paga al recibir", icon: HandCoins },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16" data-testid="checkout-page">
      <h1 className="text-3xl sm:text-4xl font-serif font-light text-stone-900 mb-8">Checkout</h1>

      <div className="flex items-center gap-3 mb-12" data-testid="checkout-stepper">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <span className={`w-8 h-8 flex items-center justify-center text-xs font-mono border ${i <= step ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-400"}`}>
              {i + 1}
            </span>
            <span className={`text-xs font-mono uppercase tracking-widest ${i <= step ? "text-stone-900" : "text-stone-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="w-8 h-px bg-stone-300" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3">
          {step === 0 && (
            <div className="space-y-5" data-testid="checkout-step-customer-data">
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Nombre completo</label>
                <input {...register("name")} data-testid="checkout-input-full-name" className={inputCls} placeholder="Allison García" />
                {errors.name && <p className={errCls} data-testid="checkout-error-name">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Correo electrónico</label>
                <input {...register("email")} type="email" data-testid="checkout-input-email" className={inputCls} placeholder="tu@correo.com" />
                {errors.email && <p className={errCls} data-testid="checkout-error-email">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Teléfono / WhatsApp</label>
                <input {...register("phone")} data-testid="checkout-input-phone" className={inputCls} placeholder="55 1234 5678" />
                {errors.phone && <p className={errCls} data-testid="checkout-error-phone">{errors.phone.message}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div data-testid="checkout-step-delivery">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {config?.shipping_enabled !== false && (
                  <button type="button" onClick={() => setValue("delivery_method", "home_delivery", { shouldValidate: true })}
                          data-testid="checkout-delivery-method-home"
                          aria-checked={deliveryMethod === "home_delivery"}
                          className={`border p-5 text-left transition-all ${deliveryMethod === "home_delivery" ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500"}`}>
                    <Truck size={18} className="text-stone-700 mb-3" />
                    <p className="text-sm font-medium text-stone-900">Envío a domicilio</p>
                    <p className="text-xs text-stone-500 mt-1">{fmtMXN(shipping)} · 3-5 días hábiles</p>
                  </button>
                )}
                {config?.pickup_enabled !== false && (
                  <button type="button" onClick={() => setValue("delivery_method", "pickup", { shouldValidate: true })}
                          data-testid="checkout-delivery-method-pickup"
                          aria-checked={deliveryMethod === "pickup"}
                          className={`border p-5 text-left transition-all ${deliveryMethod === "pickup" ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500"}`}>
                    <MapPin size={18} className="text-stone-700 mb-3" />
                    <p className="text-sm font-medium text-stone-900">Punto de encuentro</p>
                    <p className="text-xs text-stone-500 mt-1">Sin costo · Boutiques aliadas</p>
                  </button>
                )}
              </div>

              {deliveryMethod === "home_delivery" && (
                <div className="space-y-5" data-testid="checkout-address-fields">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Calle y número</label>
                    <input {...register("street")} data-testid="checkout-input-street" className={inputCls} placeholder="Av. Reforma 123, Int. 4" />
                    {errors.street && <p className={errCls}>{errors.street.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Ciudad</label>
                      <input {...register("city")} data-testid="checkout-input-city" className={inputCls} placeholder="CDMX" />
                      {errors.city && <p className={errCls}>{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Estado</label>
                      <input {...register("state")} data-testid="checkout-input-state" className={inputCls} placeholder="Ciudad de México" />
                      {errors.state && <p className={errCls}>{errors.state.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Código postal</label>
                    <input {...register("zip_code")} data-testid="checkout-input-zip" className={inputCls} placeholder="06600" />
                    {errors.zip_code && <p className={errCls}>{errors.zip_code.message}</p>}
                  </div>
                </div>
              )}

              {deliveryMethod === "pickup" && (
                <div className="space-y-3" data-testid="checkout-pickup-points">
                  {pickupPoints.map((p) => (
                    <button type="button" key={p.id} onClick={() => setValue("pickup_point_id", p.id, { shouldValidate: true })}
                            data-testid={`checkout-pickup-point-${p.id}`}
                            aria-checked={pickupPointId === p.id}
                            className={`w-full border p-4 text-left transition-all ${pickupPointId === p.id ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500"}`}>
                      <p className="text-sm font-medium text-stone-900">{p.name}</p>
                      <p className="text-xs text-stone-500 mt-1">{p.address} · {p.city}</p>
                    </button>
                  ))}
                  {errors.pickup_point_id && <p className={errCls} data-testid="checkout-error-pickup">{errors.pickup_point_id.message}</p>}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div data-testid="checkout-step-payment">
              <div className="space-y-3 mb-8">
                {payOptions.map(({ value, label, desc, icon: Icon }) => (
                  <button type="button" key={value} onClick={() => setValue("payment_method", value)}
                          data-testid={`checkout-payment-method-${value === "card" ? "stripe" : value}`}
                          aria-checked={paymentMethod === value}
                          className={`w-full border p-5 text-left flex items-center gap-4 transition-all ${paymentMethod === value ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500"}`}>
                    <Icon size={18} className="text-stone-700 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-900">{label}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {paymentMethod === "bank_transfer" && config?.bank_clabe && (
                <div className="border border-amber-200 bg-amber-50/50 p-5 text-sm" data-testid="checkout-bank-details">
                  <p className="text-xs font-mono uppercase tracking-widest text-amber-800 mb-2">Datos para transferencia</p>
                  <p className="text-stone-700">{config.bank_name} · {config.bank_account_holder}</p>
                  <p className="font-mono text-stone-900 mt-1">CLABE: {config.bank_clabe}</p>
                </div>
              )}
              <div className="mt-6">
                <label className="text-xs font-mono uppercase tracking-widest text-stone-600 block mb-2">Notas (opcional)</label>
                <textarea {...register("notes")} data-testid="checkout-input-notes" rows={3} className={inputCls} placeholder="Indicaciones de entrega, dedicatoria..." />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-10">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} data-testid="checkout-back-button"
                      className="uppercase tracking-[0.18em] text-xs font-mono px-8 py-4 border border-stone-800 text-stone-900 hover:bg-stone-900 hover:text-white transition-colors">
                Atrás
              </button>
            ) : <span />}
            {step < 2 ? (
              <button key="next" type="button" onClick={next} data-testid="checkout-next-button"
                      className="uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 hover:text-white transition-colors">
                Continuar
              </button>
            ) : (
              <button key="submit" type="button" disabled={submitting} onClick={handleSubmit(onSubmit)} data-testid="checkout-submit-order-button"
                      className="uppercase tracking-[0.18em] text-xs font-mono font-medium px-8 py-4 bg-stone-900 text-stone-50 hover:bg-amber-900 hover:text-white transition-colors disabled:opacity-50">
                {submitting ? "Procesando..." : paymentMethod === "card" ? "Pagar con tarjeta" : "Confirmar pedido"}
              </button>
            )}
          </div>
        </div>

        <aside className="lg:col-span-2">
          <div className="border border-stone-200 bg-white p-6 sticky top-28" data-testid="checkout-order-summary">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-stone-600 mb-5">Resumen</p>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm py-2 border-b border-stone-100">
                <span className="text-stone-700 font-light">{i.name} <span className="text-stone-400">×{i.quantity}</span></span>
                <span className="text-stone-900">{fmtMXN(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-4">
              <span className="text-stone-500">Subtotal</span>
              <span data-testid="checkout-subtotal" className="text-stone-900">{fmtMXN(total)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2">
              <span className="text-stone-500">Envío</span>
              <span data-testid="checkout-shipping" className="text-stone-900">{shipping === 0 ? "Gratis" : fmtMXN(shipping)}</span>
            </div>
            <div className="flex justify-between pt-4 mt-2 border-t border-stone-200">
              <span className="text-sm font-medium text-stone-900">Total</span>
              <span data-testid="checkout-total" className="font-semibold text-stone-900">{fmtMXN(total + shipping)}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-3">El total se verifica en el servidor al confirmar.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
