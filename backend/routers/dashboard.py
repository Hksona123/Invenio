from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Product, Customer, Order
from schemas import DashboardStats, LowStockProduct, RecentOrder
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    now            = datetime.now(timezone.utc)
    today_start    = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago       = now - timedelta(days=7)
    month_ago      = now - timedelta(days=30)
    two_months_ago = now - timedelta(days=60)

    # ── Core counts ──────────────────────────────────────
    total_products  = db.query(func.count(Product.id)).scalar() or 0
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_orders    = db.query(func.count(Order.id)).scalar()    or 0

    # ── Revenue ──────────────────────────────────────────
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0.0

    revenue_this_month  = db.query(func.sum(Order.total_amount)) \
        .filter(Order.created_at >= month_ago).scalar() or 0.0
    revenue_prior_month = db.query(func.sum(Order.total_amount)) \
        .filter(Order.created_at >= two_months_ago,
                Order.created_at <  month_ago).scalar() or 0.0

    if revenue_prior_month > 0:
        revenue_change_pct = round(
            ((revenue_this_month - revenue_prior_month) / revenue_prior_month) * 100, 1
        )
    else:
        revenue_change_pct = 0.0

    # ── Stock alerts ─────────────────────────────────────
    low_stock_raw = (
        db.query(Product)
        .filter(Product.quantity < 10)
        .order_by(Product.quantity.asc())
        .all()
    )

    low_stock_count    = sum(1 for p in low_stock_raw if p.quantity > 0)
    out_of_stock_count = sum(1 for p in low_stock_raw if p.quantity == 0)

    low_stock_products = [
        LowStockProduct(
            id=p.id, name=p.name, sku=p.sku,
            quantity=p.quantity, price=p.price,
        )
        for p in low_stock_raw
    ]

    # ── Time-based counts ────────────────────────────────
    orders_today = db.query(func.count(Order.id)) \
        .filter(Order.created_at >= today_start).scalar() or 0

    new_customers_this_week = db.query(func.count(Customer.id)) \
        .filter(Customer.created_at >= week_ago).scalar() or 0

    # ── Recent orders (last 5, with customer join) ────────
    recent_orders_raw = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    recent_orders = [
        RecentOrder(
            id=o.id,
            customer_name=o.customer.full_name,
            total_amount=o.total_amount,
            item_count=sum(i.quantity for i in o.items),
            created_at=o.created_at,
        )
        for o in recent_orders_raw
    ]

    return DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=round(total_revenue, 2),
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        low_stock_products=low_stock_products,
        recent_orders=recent_orders,
        revenue_change_pct=revenue_change_pct,
        orders_today=orders_today,
        new_customers_this_week=new_customers_this_week,
    )
