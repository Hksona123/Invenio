from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from database import get_db
from models import Order, OrderItem, Product, Customer
from schemas import (
    OrderCreate, OrderOut, OrderItemOut, OrderListResponse,
)
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/orders", tags=["Orders"])

LOW_STOCK_THRESHOLD = 10


def item_to_out(item: OrderItem) -> OrderItemOut:
    return OrderItemOut(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name,
        product_sku=item.product.sku,
        quantity=item.quantity,
        unit_price=item.unit_price,
        subtotal=round(item.quantity * item.unit_price, 2),
    )


def order_to_out(o: Order) -> OrderOut:
    items_out = [item_to_out(i) for i in o.items]
    return OrderOut(
        id=o.id,
        customer_id=o.customer_id,
        customer_name=o.customer.full_name,
        customer_email=o.customer.email,
        total_amount=o.total_amount,
        item_count=sum(i.quantity for i in o.items),
        line_count=len(o.items),
        created_at=o.created_at,
        items=items_out,
    )


def _q_with_joins(db: Session):
    """Base query with eager-loaded relationships (avoids N+1)."""
    return db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.items).joinedload(OrderItem.product),
    )


# ── GET /orders ───────────────────────────────────────────────
@router.get("/", response_model=OrderListResponse)
def list_orders(
    search: str = Query(default="", description="Filter by order ID or customer name/email"),
    db: Session = Depends(get_db),
):
    now         = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    q = _q_with_joins(db)

    if search.strip():
        term = f"%{search.strip()}%"
        try:
            order_id = int(search.strip())
            # Numeric: match exact order ID OR customer name/email
            q = q.join(Customer).filter(
                or_(
                    Order.id == order_id,
                    Customer.full_name.ilike(term),
                    Customer.email.ilike(term),
                )
            )
        except ValueError:
            # Text: match customer name/email only
            q = q.join(Customer).filter(
                or_(
                    Customer.full_name.ilike(term),
                    Customer.email.ilike(term),
                )
            )

    orders = q.order_by(Order.created_at.desc()).all()

    # Aggregates always on full table, not filtered
    total         = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0.0
    orders_today  = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= today_start)
        .scalar() or 0
    )

    return OrderListResponse(
        items=[order_to_out(o) for o in orders],
        total=total,
        total_revenue=round(total_revenue, 2),
        orders_today=orders_today,
    )


# ── GET /orders/{id} ─────────────────────────────────────────
@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = _q_with_joins(db).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_to_out(o)


# ── POST /orders — atomic creation ───────────────────────────
@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    # 1. Validate customer
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # 2. Validate ALL products / stock BEFORE any mutation (fail-clean)
    stock_errors: list[str] = []
    resolved: list[tuple[Product, int]] = []

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product with ID {item.product_id} not found",
            )
        if product.quantity < item.quantity:
            stock_errors.append(
                f"'{product.name}' (SKU: {product.sku}): "
                f"requested {item.quantity}, only {product.quantity} in stock"
            )
        resolved.append((product, item.quantity))

    # Surface ALL errors at once so user can fix everything in one go
    if stock_errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Insufficient stock for one or more items",
                "errors": stock_errors,
            },
        )

    # 3. Deduct stock + build order items atomically
    total = 0.0
    order_items = []
    for product, quantity in resolved:
        product.quantity -= quantity
        subtotal = product.price * quantity
        total   += subtotal
        order_items.append(
            OrderItem(
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,  # snapshot price at order time
            )
        )

    # 4. Persist
    order = Order(
        customer_id=payload.customer_id,
        total_amount=round(total, 2),
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Reload with eager relationships for response
    return get_order(order.id, db)


# ── DELETE /orders/{id} ───────────────────────────────────────
@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    # NOTE: Deleting an order does NOT restock inventory.
    # This matches real-world warehouse logic (goods already dispatched/picked).
    db.delete(o)
    db.commit()
