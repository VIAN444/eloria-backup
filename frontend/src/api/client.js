import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

export const apiError = (e) => {
  const d = e?.response?.data;
  if (d?.message) return d.message;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.map((x) => x.msg).filter(Boolean).join(" ");
  return "Ocurrió un error. Intenta de nuevo.";
};

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
export const fmtMXN = (n) => mxn.format(Number(n) || 0);
export const fmtCents = (c) => mxn.format((c || 0) / 100);

export const PAYMENT_LABELS = {
  card: "Tarjeta",
  bank_transfer: "Transferencia",
  cash_on_delivery: "Contra entrega",
};
export const ORDER_STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
export const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  expired: "Expirado",
  refunded: "Reembolsado",
};
