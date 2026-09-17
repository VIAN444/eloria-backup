from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=128)


class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)


class AddressIn(BaseModel):
    street: str = Field(min_length=4, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    zip_code: str = Field(min_length=4, max_length=10)


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    customer: CustomerIn
    items: List[OrderItemIn] = Field(min_length=1, max_length=50)
    delivery_method: Literal["pickup", "home_delivery"]
    pickup_point_id: Optional[str] = None
    address: Optional[AddressIn] = None
    payment_method: Literal["card", "bank_transfer", "cash_on_delivery"]
    notes: Optional[str] = Field(default=None, max_length=500)


class CheckoutCreate(BaseModel):
    order_id: str
    origin_url: str


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=3000)
    price: float = Field(gt=0, le=10_000_000)
    category_id: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=3, ge=0)
    featured: bool = False
    active: bool = True
    notes: dict = Field(default_factory=dict)


class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)


class PickupPointIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=4, max_length=250)
    city: str = Field(min_length=2, max_length=100)
    enabled: bool = True


class DeliveryMethodIn(BaseModel):
    code: Literal["pickup", "home_delivery"]
    name: str = Field(min_length=2, max_length=120)
    cost: float = Field(ge=0, le=100_000)
    enabled: bool = True


class SettingsIn(BaseModel):
    store_name: str = Field(min_length=2, max_length=80)
    whatsapp_number: str = Field(min_length=8, max_length=20)
    bank_name: str = Field(default="", max_length=80)
    bank_account_holder: str = Field(default="", max_length=120)
    bank_clabe: str = Field(default="", max_length=18)
    bank_account_number: str = Field(default="", max_length=30)
    shipping_enabled: bool = True
    pickup_enabled: bool = True
    shipping_cost: float = Field(default=0, ge=0, le=100_000)


class OrderStatusPatch(BaseModel):
    order_status: Optional[Literal["pending", "paid", "preparing", "shipped", "delivered", "cancelled"]] = None
    payment_status: Optional[Literal["pending", "paid", "failed", "expired", "refunded"]] = None


class StockAdjust(BaseModel):
    product_id: str
    delta: int = Field(ne=0, ge=-100000, le=100000)
