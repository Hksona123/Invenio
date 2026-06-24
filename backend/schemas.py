from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime

# ── Products ──────────────────────────────────
class ProductBase(BaseModel):
    name: str
    sku: str
    price: float
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be positive")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ── Customers ─────────────────────────────────
class CustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ── Orders ────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    quantity: int
    unit_price: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    total_amount: float
    created_at: datetime
    items: List[OrderItemOut]


# ── Dashboard ─────────────────────────────────
class LowStockProduct(BaseModel):
    id: int
    name: str
    sku: str
    quantity: int
    price: float


class RecentOrder(BaseModel):
    id: int
    customer_name: str
    total_amount: float
    item_count: int
    created_at: datetime


class DashboardStats(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: float
    low_stock_count: int
    out_of_stock_count: int
    low_stock_products: List[LowStockProduct]
    recent_orders: List[RecentOrder]
    revenue_change_pct: float
    orders_today: int
    new_customers_this_week: int
