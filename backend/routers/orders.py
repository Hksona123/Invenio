from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    total = 0.0
    order_items = []
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item.product_id} not found")
        if product.quantity < item.quantity:
            raise HTTPException(400, f"Insufficient stock for '{product.name}'. Available: {product.quantity}")
        product.quantity -= item.quantity
        subtotal = product.price * item.quantity
        total += subtotal
        order_items.append(
            models.OrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=product.price
            )
        )

    order = models.Order(
        customer_id=payload.customer_id,
        total_amount=round(total, 2),
        items=order_items
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.get("/", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).all()

@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    return o

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    db.delete(o)
    db.commit()
