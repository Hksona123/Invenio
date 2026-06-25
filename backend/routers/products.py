from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from database import get_db
from models import Product
from schemas import (
    ProductCreate, ProductUpdate, ProductOut,
    ProductListResponse, StockStatus,
)

router = APIRouter(prefix="/products", tags=["Products"])

LOW_STOCK_THRESHOLD = 10


def compute_status(qty: int) -> StockStatus:
    if qty == 0:
        return StockStatus.OUT_OF_STOCK
    if qty < LOW_STOCK_THRESHOLD:
        return StockStatus.LOW_STOCK
    return StockStatus.IN_STOCK


def to_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        name=p.name,
        sku=p.sku,
        price=p.price,
        quantity=p.quantity,
        status=compute_status(p.quantity),
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# ── GET /products ────────────────────────────────────────────
@router.get("/", response_model=ProductListResponse)
def list_products(
    search: str = Query(default="", description="Filter by name or SKU"),
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
            )
        )
    products = q.order_by(Product.created_at.desc()).all()
    items = [to_out(p) for p in products]
    return ProductListResponse(
        items=items,
        total=len(items),
        in_stock=sum(1 for i in items if i.status == StockStatus.IN_STOCK),
        low_stock=sum(1 for i in items if i.status == StockStatus.LOW_STOCK),
        out_of_stock=sum(1 for i in items if i.status == StockStatus.OUT_OF_STOCK),
    )


# ── GET /products/{id} ───────────────────────────────────────
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return to_out(p)


# ── POST /products ───────────────────────────────────────────
@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    # Case-insensitive SKU uniqueness check
    if db.query(Product).filter(
        func.upper(Product.sku) == payload.sku.upper()
    ).first():
        raise HTTPException(
            status_code=400,
            detail=f"SKU '{payload.sku}' already exists",
        )
    p = Product(
        name=payload.name,
        sku=payload.sku.upper(),
        price=payload.price,
        quantity=payload.quantity,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return to_out(p)


# ── PUT /products/{id} ───────────────────────────────────────
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    # SKU is intentionally not in ProductUpdate — cannot be changed
    if payload.name     is not None: p.name     = payload.name
    if payload.price    is not None: p.price    = payload.price
    if payload.quantity is not None: p.quantity = payload.quantity

    db.commit()
    db.refresh(p)
    return to_out(p)


# ── DELETE /products/{id} ────────────────────────────────────
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    # Guard: refuse if referenced in any order
    if p.order_items:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete '{p.name}' — it is referenced in "
                f"{len(p.order_items)} order(s). Remove those orders first."
            ),
        )

    db.delete(p)
    db.commit()
