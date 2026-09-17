from urllib.parse import quote

PAYMENT_LABELS = {
    "card": "Tarjeta (Stripe)",
    "bank_transfer": "Transferencia bancaria",
    "cash_on_delivery": "Pago contra entrega",
}
DELIVERY_LABELS = {"pickup": "Punto de Encuentro", "home_delivery": "Envío a domicilio"}


def _mxn(cents: int) -> str:
    return f"${cents / 100:,.2f} MXN"


def build_order_message(order: dict, settings: dict) -> str:
    lines = [
        f"Hola, {settings.get('store_name', 'ÉLORIA')}. Mi pedido {order['folio']}",
        "",
        f"Nombre: {order['customer']['name']}",
        "Productos:",
    ]
    for it in order["items"]:
        lines.append(f"- {it['name']} x{it['quantity']}")
    lines += [
        "",
        f"Total: {_mxn(order['total_cents'])}",
        f"Método de pago: {PAYMENT_LABELS.get(order['payment_method'], order['payment_method'])}",
        f"Método de entrega: {DELIVERY_LABELS.get(order['delivery_method'], order['delivery_method'])}",
    ]
    if order.get("pickup_point"):
        lines.append(f"Punto: {order['pickup_point']['name']}")
    if order.get("address"):
        a = order["address"]
        lines.append(f"Dirección: {a['street']}, {a['city']}, {a['state']} C.P. {a['zip_code']}")
    return "\n".join(lines)


def build_order_whatsapp_url(order: dict, settings: dict) -> str:
    number = "".join(ch for ch in str(settings.get("whatsapp_number", "")) if ch.isdigit())
    return f"https://wa.me/{number}?text={quote(build_order_message(order, settings))}"


def build_contact_url(settings: dict) -> str:
    number = "".join(ch for ch in str(settings.get("whatsapp_number", "")) if ch.isdigit())
    msg = quote(f"Hola, {settings.get('store_name', 'ÉLORIA')}. Quiero más información.")
    return f"https://wa.me/{number}?text={msg}"
