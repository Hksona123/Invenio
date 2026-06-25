from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import products, customers, orders, dashboard
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    version="1.0.0",
    description="Production-ready inventory management system — INVENIO",
)

# Support comma-separated origins for multi-environment deploys
# e.g. FRONTEND_URL="https://invenio.vercel.app,http://localhost:5173"
_raw_origins = os.getenv("FRONTEND_URL", "*")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
