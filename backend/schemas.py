from pydantic import BaseModel, EmailStr, field_validator
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
    def qty_non_negative(cls, v):
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v):
        if v <= 0:
            raise ValueError("Price must be positive")
        return v

class ProductCreate(ProductBase): pass
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    class Config: from_attributes = True

# ── Customers ─────────────────────────────────
class CustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None

class CustomerCreate(CustomerBase): pass
class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    class Config: from_attributes = True

# ── Orders ────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]

class OrderItemOut(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    class Config: from_attributes = True

class OrderOut(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    created_at: datetime
    items: List[OrderItemOut]
    class Config: from_attributes = True
