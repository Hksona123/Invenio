from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from routers import products, customers, orders
import models
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    version="1.0.0",
    description="Production-ready inventory management system"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/dashboard/stats", tags=["Dashboard"])
def dashboard_stats(db: Session = Depends(get_db)):
    total_products  = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders    = db.query(models.Order).count()

    low_stock_items = db.query(models.Product).filter(models.Product.quantity < 10).all()
    low_stock = [
        {
            "id":       p.id,
            "name":     p.name,
            "sku":      p.sku,
            "quantity": p.quantity,
        }
        for p in low_stock_items
    ]

    return {
        "total_products":  total_products,
        "total_customers": total_customers,
        "total_orders":    total_orders,
        "low_stock_count": len(low_stock),
        "low_stock_products": low_stock,
    }
