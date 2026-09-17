"""Backend tests for ÉLORIA e-commerce API - covers auth, catalog, orders, payments, admin."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           "https://ecommerce-stack-8.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "axelallison2005@gmail.com"
ADMIN_PASSWORD = "Eloria2026!"


@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    # httpOnly cookies must be present
    assert "access_token" in s.cookies, "access_token cookie missing"
    return s


# ---------- Root / Health ----------
def test_api_root(anon):
    r = anon.get(f"{API}")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_invalid(self, anon):
        r = anon.post(f"{API}/auth/login",
                      json={"email": "wrong@example.com", "password": "badbad12"})
        assert r.status_code == 401
        assert r.json().get("code") == "INVALID_CREDENTIALS"

    def test_login_valid_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_admin_route_requires_auth(self, anon):
        r = anon.get(f"{API}/admin/dashboard")
        assert r.status_code in (401, 403)

    def test_forgot_password_generic_response(self, anon):
        r1 = anon.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        r2 = anon.post(f"{API}/auth/forgot-password", json={"email": "nope@nope.com"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json() == r2.json()


# ---------- Catalog ----------
class TestCatalog:
    def test_list_products(self, anon):
        r = anon.get(f"{API}/products")
        assert r.status_code == 200
        prods = r.json()
        assert isinstance(prods, list) and len(prods) >= 6
        for p in prods:
            assert "_id" not in p
            assert "id" in p and "price" in p and "stock" in p

    def test_search_and_filter(self, anon):
        r = anon.get(f"{API}/products", params={"q": "z"})
        assert r.status_code == 200
        cats = anon.get(f"{API}/categories").json()
        assert isinstance(cats, list) and len(cats) >= 1
        if cats:
            slug = cats[0]["slug"]
            r2 = anon.get(f"{API}/products", params={"category": slug})
            assert r2.status_code == 200

    def test_product_detail(self, anon):
        prods = anon.get(f"{API}/products").json()
        pid = prods[0]["id"]
        r = anon.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_product_crud(self, admin_session):
        cats = admin_session.get(f"{API}/categories").json()
        cat_id = cats[0]["id"] if cats else None
        payload = {"name": "TEST_Perfume", "description": "d", "price": 199.5,
                   "category_id": cat_id, "images": [], "stock": 4,
                   "low_stock_threshold": 2, "featured": False, "active": True}
        r = admin_session.post(f"{API}/products", json=payload)
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        # update
        payload["price"] = 250.0
        r2 = admin_session.put(f"{API}/products/{pid}", json=payload)
        assert r2.status_code == 200 and r2.json()["price"] == 250.0
        # delete
        r3 = admin_session.delete(f"{API}/products/{pid}")
        assert r3.status_code == 200


# ---------- Store config ----------
def test_store_config(anon):
    r = anon.get(f"{API}/store/config")
    assert r.status_code == 200
    d = r.json()
    assert d["currency"] == "MXN"
    assert "whatsapp_number" in d


def test_delivery_methods_and_pickup(anon):
    dm = anon.get(f"{API}/delivery-methods").json()
    pp = anon.get(f"{API}/pickup-points").json()
    assert isinstance(dm, list) and len(dm) >= 1
    assert isinstance(pp, list)


# ---------- Orders ----------
class TestOrders:
    def _product_with_stock(self, anon, min_stock=2):
        prods = anon.get(f"{API}/products").json()
        return next(p for p in prods if p["stock"] >= min_stock and p["active"])

    def test_create_order_cod_home_delivery(self, anon):
        prod = self._product_with_stock(anon)
        payload = {
            "customer": {"name": "TEST User", "email": "test_cod@example.com",
                         "phone": "5215500000001"},
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "delivery_method": "home_delivery",
            "address": {"street": "Av. Reforma 123", "city": "CDMX",
                        "state": "CDMX", "zip_code": "06600"},
            "payment_method": "cash_on_delivery",
        }
        r = requests.post(f"{API}/orders", json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert o["folio"].startswith("EL-")
        assert "whatsapp_url" in o and "wa.me" in o["whatsapp_url"]
        assert "_id" not in o
        # verify persistence via GET
        g = requests.get(f"{API}/orders/{o['id']}")
        assert g.status_code == 200 and g.json()["folio"] == o["folio"]

    def test_pickup_requires_point(self, anon):
        prod = self._product_with_stock(anon)
        payload = {
            "customer": {"name": "TEST", "email": "t@e.com", "phone": "5215500000000"},
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "delivery_method": "pickup",
            "payment_method": "cash_on_delivery",
        }
        r = requests.post(f"{API}/orders", json=payload)
        assert r.status_code == 400
        assert r.json().get("code") in ("PICKUP_POINT_REQUIRED", "PICKUP_POINT_INVALID")

    def test_pickup_with_valid_point(self, anon):
        pp = anon.get(f"{API}/pickup-points").json()
        if not pp:
            pytest.skip("no pickup points configured")
        prod = self._product_with_stock(anon)
        payload = {
            "customer": {"name": "TEST P", "email": "test_pickup@example.com",
                         "phone": "5215500000002"},
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "delivery_method": "pickup",
            "pickup_point_id": pp[0]["id"],
            "payment_method": "bank_transfer",
        }
        r = requests.post(f"{API}/orders", json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert o["payment_method"] == "bank_transfer"
        assert o["pickup_point"] and o["pickup_point"]["id"] == pp[0]["id"]

    def test_insufficient_stock(self, anon):
        prod = self._product_with_stock(anon)
        # request more than stock
        payload = {
            "customer": {"name": "TEST", "email": "t@e.com", "phone": "5215500000000"},
            "items": [{"product_id": prod["id"], "quantity": prod["stock"] + 500}],
            "delivery_method": "home_delivery",
            "address": {"street": "Av 1", "city": "CDMX", "state": "CDMX", "zip_code": "06600"},
            "payment_method": "cash_on_delivery",
        }
        r = requests.post(f"{API}/orders", json=payload)
        assert r.status_code in (409, 422)
        if r.status_code == 409:
            assert r.json().get("code") == "INSUFFICIENT_STOCK"

    def test_admin_can_change_order_status(self, admin_session, anon):
        prod = self._product_with_stock(anon)
        payload = {
            "customer": {"name": "TEST S", "email": "test_status@example.com",
                         "phone": "5215500000000"},
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "delivery_method": "home_delivery",
            "address": {"street": "Av 1", "city": "CDMX", "state": "CDMX", "zip_code": "06600"},
            "payment_method": "cash_on_delivery",
        }
        oid = requests.post(f"{API}/orders", json=payload).json()["order"]["id"]
        r = admin_session.patch(f"{API}/orders/{oid}/status",
                                json={"order_status": "preparing"})
        assert r.status_code == 200 and r.json()["order_status"] == "preparing"


# ---------- Payments ----------
class TestPayments:
    def test_stripe_checkout_created(self, anon):
        prods = anon.get(f"{API}/products").json()
        prod = next(p for p in prods if p["stock"] >= 1)
        order = requests.post(f"{API}/orders", json={
            "customer": {"name": "TEST Pay", "email": "test_pay@example.com",
                         "phone": "5215500000000"},
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "delivery_method": "home_delivery",
            "address": {"street": "Av 1", "city": "CDMX", "state": "CDMX",
                        "zip_code": "06600"},
            "payment_method": "card",
        }).json()["order"]
        r = requests.post(f"{API}/payments/create-checkout",
                          json={"order_id": order["id"], "origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout_url" in d and "stripe.com" in d["checkout_url"]
        assert d["session_id"].startswith("cs_")
        # status endpoint reachable
        s = requests.get(f"{API}/payments/status/{d['session_id']}")
        assert s.status_code == 200
        assert s.json()["payment_status"] in ("pending", "paid")

    def test_webhook_rejects_bad_signature(self, anon):
        r = requests.post(f"{API}/payments/webhook",
                          data=b"{}", headers={"stripe-signature": "t=1,v1=bad"})
        assert r.status_code == 400


# ---------- Admin ----------
class TestAdmin:
    def test_dashboard(self, admin_session):
        r = admin_session.get(f"{API}/admin/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert "ventas_totales_cents" in d and "sales_by_day" in d
        assert len(d["sales_by_day"]) == 14

    def test_settings_flow(self, admin_session):
        r = admin_session.get(f"{API}/admin/settings")
        assert r.status_code == 200
        s = r.json()
        original_wa = s.get("whatsapp_number", "5215500000000")
        payload = {
            "store_name": s.get("store_name", "ÉLORIA"),
            "whatsapp_number": original_wa,
            "bank_name": s.get("bank_name", ""),
            "bank_account_holder": s.get("bank_account_holder", ""),
            "bank_clabe": s.get("bank_clabe", ""),
            "bank_account_number": s.get("bank_account_number", ""),
            "shipping_enabled": s.get("shipping_enabled", True),
            "pickup_enabled": s.get("pickup_enabled", True),
            "shipping_cost": s.get("shipping_cost", 0),
        }
        r2 = admin_session.patch(f"{API}/admin/settings", json=payload)
        assert r2.status_code == 200

    def test_customers_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/customers")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_inventory_adjust(self, admin_session, anon):
        prod = anon.get(f"{API}/products").json()[0]
        r = admin_session.post(f"{API}/admin/inventory/adjust",
                               json={"product_id": prod["id"], "delta": 1})
        assert r.status_code == 200
        r2 = admin_session.post(f"{API}/admin/inventory/adjust",
                                json={"product_id": prod["id"], "delta": -1})
        assert r2.status_code == 200

    def test_category_crud(self, admin_session):
        r = admin_session.post(f"{API}/categories",
                               json={"name": f"TEST_Cat_{int(time.time())}",
                                     "description": "x"})
        assert r.status_code == 201
        cid = r.json()["id"]
        r2 = admin_session.delete(f"{API}/categories/{cid}")
        assert r2.status_code == 200


# ---------- Logout (isolated session so it doesn't clobber admin_session cookies) ----------
def test_logout():
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
