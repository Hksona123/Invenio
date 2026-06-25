from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from database import get_db
from models import Customer, Order
from schemas import (
    CustomerCreate, CustomerUpdate, CustomerOut,
    CustomerListResponse,
)
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/customers", tags=["Customers"])


def to_out(c: Customer, db: Session) -> CustomerOut:
    order_count = (
        db.query(func.count(Order.id))
        .filter(Order.customer_id == c.id)
        .scalar()
    ) or 0
    return CustomerOut(
        id=c.id,
        full_name=c.full_name,
        email=c.email,
        phone=c.phone,
        order_count=order_count,
        created_at=c.created_at,
    )


# ── GET /customers ────────────────────────────────────────────
@router.get("/", response_model=CustomerListResponse)
def list_customers(
    search: str = Query(default="", description="Filter by name or email"),
    db: Session = Depends(get_db),
):
    now        = datetime.now(timezone.utc)
    week_ago   = now - timedelta(days=7)
    month_ago  = now - timedelta(days=30)

    q = db.query(Customer)
    if search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Customer.full_name.ilike(term),
                Customer.email.ilike(term),
            )
        )
    customers = q.order_by(Customer.created_at.desc()).all()
    items = [to_out(c, db) for c in customers]

    # Aggregate counts always on full table (not filtered subset)
    total          = db.query(func.count(Customer.id)).scalar() or 0
    new_this_week  = db.query(func.count(Customer.id)).filter(Customer.created_at >= week_ago).scalar() or 0
    new_this_month = db.query(func.count(Customer.id)).filter(Customer.created_at >= month_ago).scalar() or 0

    return CustomerListResponse(
        items=items,
        total=total,
        new_this_week=new_this_week,
        new_this_month=new_this_month,
    )


# ── GET /customers/{id} ───────────────────────────────────────
@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return to_out(c, db)


# ── POST /customers ───────────────────────────────────────────
@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    # Case-insensitive email uniqueness check
    if db.query(Customer).filter(
        func.lower(Customer.email) == payload.email.lower()
    ).first():
        raise HTTPException(
            status_code=400,
            detail=f"Email '{payload.email}' is already registered",
        )
    c = Customer(
        full_name=payload.full_name,
        email=payload.email.lower(),
        phone=payload.phone,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return to_out(c, db)


# ── PUT /customers/{id} ───────────────────────────────────────
@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Email uniqueness — only check against OTHER customers
    if payload.email is not None and payload.email.lower() != c.email.lower():
        conflict = db.query(Customer).filter(
            func.lower(Customer.email) == payload.email.lower(),
            Customer.id != customer_id,
        ).first()
        if conflict:
            raise HTTPException(
                status_code=400,
                detail=f"Email '{payload.email}' is already registered to another customer",
            )

    if payload.full_name is not None: c.full_name = payload.full_name
    if payload.email     is not None: c.email     = payload.email.lower()
    if payload.phone     is not None: c.phone     = payload.phone or None

    db.commit()
    db.refresh(c)
    return to_out(c, db)


# ── DELETE /customers/{id} ────────────────────────────────────
@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    order_count = (
        db.query(func.count(Order.id))
        .filter(Order.customer_id == customer_id)
        .scalar()
    ) or 0

    if order_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete '{c.full_name}' — they have {order_count} "
                f"order(s) on record. Delete those orders first."
            ),
        )

    db.delete(c)
    db.commit()
