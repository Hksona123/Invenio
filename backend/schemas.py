import re
from enum import Enum
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime


# ── Stock Status ───────────────────────────────
class StockStatus(str, Enum):
    IN_STOCK     = "IN_STOCK"
    LOW_STOCK    = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"


# ── Products ──────────────────────────────────
class ProductBase(BaseModel):
    name:     str
    sku:      str
    price:    float
    quantity: int

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Product name cannot be empty")
        if len(v) > 120:
            raise ValueError("Product name must be 120 characters or fewer")
        return v

    @field_validator("sku")
    @classmethod
    def sku_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("SKU cannot be empty")
        if len(v) > 40:
            raise ValueError("SKU must be 40 characters or fewer")
        if not re.match(r'^[A-Z0-9\-_]+$', v):
            raise ValueError("SKU may only contain letters, numbers, hyphens, and underscores")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be greater than zero")
        if v > 9_999_999:
            raise ValueError("Price exceeds maximum allowed value")
        return round(v, 2)

    @field_validator("quantity")
    @classmethod
    def qty_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        if v > 999_999:
            raise ValueError("Quantity exceeds maximum allowed value")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    # SKU intentionally excluded — cannot be changed after creation
    name:     Optional[str]   = None
    price:    Optional[float] = None
    quantity: Optional[int]   = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Product name cannot be empty")
            if len(v) > 120:
                raise ValueError("Name must be 120 characters or fewer")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v <= 0:
                raise ValueError("Price must be greater than zero")
            return round(v, 2)
        return v

    @field_validator("quantity")
    @classmethod
    def qty_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Quantity cannot be negative")
        return v


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         int
    name:       str
    sku:        str
    price:      float
    quantity:   int
    status:     StockStatus
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProductListResponse(BaseModel):
    items:        List[ProductOut]
    total:        int
    in_stock:     int
    low_stock:    int
    out_of_stock: int


# ── Customers ─────────────────────────────────
class CustomerBase(BaseModel):
    full_name: str
    email:     EmailStr
    phone:     Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: Optional[str]      = None
    email:     Optional[EmailStr] = None
    phone:     Optional[str]      = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id:         int
    created_at: datetime


# ── Orders ────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity:   int


class OrderCreate(BaseModel):
    customer_id: int
    items:       List[OrderItemCreate]


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    quantity:   int
    unit_price: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:           int
    customer_id:  int
    total_amount: float
    created_at:   datetime
    items:        List[OrderItemOut]


# ── Dashboard ─────────────────────────────────
class LowStockProduct(BaseModel):
    id:       int
    name:     str
    sku:      str
    quantity: int
    price:    float


class RecentOrder(BaseModel):
    id:            int
    customer_name: str
    total_amount:  float
    item_count:    int
    created_at:    datetime


class DashboardStats(BaseModel):
    total_products:         int
    total_customers:        int
    total_orders:           int
    total_revenue:          float
    low_stock_count:        int
    out_of_stock_count:     int
    low_stock_products:     List[LowStockProduct]
    recent_orders:          List[RecentOrder]
    revenue_change_pct:     float
    orders_today:           int
    new_customers_this_week: int
