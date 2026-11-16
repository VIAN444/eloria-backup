# ÉLORIA — PRD

## Problem statement (original)
E-commerce full-stack para ÉLORIA, boutique mexicana de alta perfumería (precios MXN). Spec pedía React+TS+Vite / FastAPI+SQLAlchemy+Alembic / PostgreSQL / Stripe Checkout+webhooks / WhatsApp dinámico / auth admin JWT / panel admin completo / Docker / README. **Decisión del usuario (2026-06-17): adaptar a MongoDB + React JS (CRA)** por restricciones del entorno, manteniendo la arquitectura modular y todos los flujos. WhatsApp: placeholder editable desde Configuración. Diseño: minimalista claro.

## Arquitectura implementada
- **Backend** FastAPI modular en `/app/backend/app/`: `core/` (database MongoDB Motor, security JWT+bcrypt), `routes/` (auth, catalog, orders, payments, admin), `services/` (order_service con stock atómico, whatsapp_service), `seed.py` idempotente. Respuestas de error consistentes `{success, code, message}`.
- **Frontend** React 19 + Tailwind + shadcn + TanStack Query + RHF/Zod + framer-motion. Contextos: CartContext (localStorage), AuthContext (cookie HttpOnly).
- **DB** MongoDB: users, customers, categories, products (stock embebido), orders (items embebidos, montos en cents), payment_transactions, delivery_methods, pickup_points, store_settings, counters (folio EL-XXXXXX), login_attempts, password_reset_*.
- **Stripe** sandbox reclamable (Flow A): Checkout Sessions con price_data dinámico, webhook `/api/payments/webhook` + `/api/stripe/webhook` con verificación de firma e idempotencia, fallback de polling en `/api/payments/status`. Tax mode: **calc_only** (Stripe calcula impuestos; físico/no-digital) con fallback automático a sesión sin tax si Stripe lo rechaza. Secretos solo en backend/.env.
- **Auth** admin: JWT access (15min) + refresh (7d) en cookies HttpOnly SameSite=None, bcrypt, lockout 5 intentos/15min, forgot/reset password con email vía proxy de Emergent (token sha256, 1h, un solo uso).

## Personas
- Cliente: navega catálogo, compra con tarjeta/transferencia/contra entrega, recoge en punto o a domicilio, confirma por WhatsApp.
- Admin (axelallison2005@gmail.com): gestiona todo desde /admin sin tocar código.

## Implementado (2026-06-17)
- Storefront: hero editorial, manifiesto, catálogo con filtros por familia olfativa + búsqueda, producto con pirámide olfativa e indicador de stock, cart drawer, checkout 3 pasos (datos → entrega pickup/domicilio → pago), confirmación con folio y deep-link WhatsApp generado desde el pedido real, páginas de resultado de pago con polling.
- Backend: recalcula totales server-side, descuento atómico de stock (anti-sobreventa), liberación de stock al expirar/fallar pago o cancelar pedido.
- Admin: dashboard KPIs + gráfica 14 días, CRUD productos/categorías/puntos pickup, inventario con ajustes, pedidos con cambio de estado y "marcar pagado" (transferencias), clientes, métodos de entrega, configuración (WhatsApp, datos bancarios, toggles, costo envío).
- Tests: 24/24 backend pytest OK; E2E checkout COD verificado con Playwright; bug crítico de auto-submit en checkout corregido y re-verificado. Lookup público de pedido solo por UUID (no folio).
- Credenciales en /app/memory/test_credentials.md.

## Backlog priorizado
- **P0**: (ninguno pendiente)
- **P1**: Reclamar sandbox Stripe (onboarding_url compartida / email de Stripe) y KYC antes de deploy; endpoints de carrito server-side del spec (hoy el carrito es client-side, validado server-side al crear pedido); Docker/README externos al entorno.
- **P2**: Exportar CSV de pedidos, imágenes múltiples por producto con upload a object storage, notificaciones email de pedido (integración Resend separada), cupones de descuento.

## Exportación fuera de Emergent (2026-06-17)
- Generado `/app/eloria-production.zip` (~329K, 128+ archivos): frontend + backend + tests + README.md profesional + `.env.example` (backend/frontend) + `docker-compose.yml` + Dockerfiles + `.gitignore`.
- Limpieza de portabilidad SOLO en la copia exportada (app en vivo intacta): removidos `@emergentbase/overlay` y `@emergentbase/visual-edits` de package.json, scripts de Emergent/PostHog de index.html, `emergentintegrations` de requirements, fallback `sk_test_emergent`, password por defecto del seed, credenciales hardcodeadas en tests (ahora por env), y `src/constants/testIds` sin uso.
- Escaneo de secretos: LIMPIO (sin claves Stripe, JWT, passwords, emails ni URLs de preview).
- Verificación del ZIP en directorio limpio: backend arranca standalone con .env derivado de .env.example (seed crea 6 productos + admin, login OK, pedido COD EL-000001 con WhatsApp OK, dashboard OK, 401 sin auth) y `yarn install --frozen-lockfile` del frontend OK en 52s.

## Chatbot Elori (2026-06-17)
- Botón flotante inferior-derecha en todas las páginas de la tienda (`src/components/store/ChatWidget.jsx`, montado en `StoreLayout`).
- Backend `app/routes/chat.py`: `POST /api/chat/stream` (SSE, tokens en vivo) + `GET /api/chat/history/{session_id}`. Motor: OpenAI `gpt-5.4` vía emergentintegrations; key = `OPENAI_API_KEY` con fallback a `EMERGENT_LLM_KEY`.
- El catálogo real (productos activos con stock) se inyecta en cada system prompt → productos nuevos se consideran automáticamente. Recomendaciones con marcador `[[producto:ID]]` validado contra la DB; la UI renderiza tarjeta con enlace directo al producto. Historial persistido en colección `chat_messages` por `session_id` (localStorage).
- Persona: amable, dulce, cercana, español mexicano cálido; 1 pregunta por mensaje (fresco/cálido/dulce), recomienda tras 2-4 respuestas. Verificado E2E: saludo streaming, conversación, recomendación de Santal & Vainilla de Papantla + Ámbar Silvestre con enlaces, persistencia de historial.

## Próximas tareas
1. Usuario: cambiar número de WhatsApp real en /admin/configuracion.
2. Usuario: actualizar datos bancarios reales (CLABE) en Configuración.
3. Reclamar cuenta Stripe y completar KYC antes de publicar en producción.
