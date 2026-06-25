# INVENIO — Inventory & Order Management System

> A full-stack, production-ready inventory management application built for Ethara's technical assessment.

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-3cffd0?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=for-the-badge)
![Design](https://img.shields.io/badge/Design-Dark%20Editorial-131313?style=for-the-badge)

---

## Live Demo

| Service | URL |
|---|---|
| **Frontend** | https://invenio-sable.vercel.app |
| **Backend API** | https://invenio-backend-s4bv.onrender.com |
| **API Docs (Swagger)** | https://invenio-backend-s4bv.onrender.com/docs |
| **Docker Hub** | `docker pull hksona/invenio-backend:latest` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Custom CSS Variables |
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Database | PostgreSQL 15 |
| Infrastructure | Docker, Docker Compose |
| Icons | lucide-react |

---

## Features

- **Products** — Full CRUD with SKU uniqueness validation, stock status badges (In Stock / Low Stock / Out of Stock)
- **Customers** — Full CRUD with email uniqueness validation
- **Orders** — Create orders with multiple line items; inventory auto-decremented on order creation; insufficient stock rejected with clear error
- **Dashboard** — Real-time stats: total products, customers, orders, and a live low-stock alert table (items < 10 units)
- **Dark Editorial Design** — Custom CSS design system inspired by modern tech media (canvas `#131313`, mint `#3cffd0`, Oswald + Inter + JetBrains Mono)
- **Responsive** — Sidebar collapses on mobile, tables scroll horizontally
- **Toast Notifications** — Success/error feedback on every API action

---

## Running Locally

### With Docker Compose (recommended)

```bash
git clone https://github.com/yourusername/invenio
cd invenio

# Copy and fill in environment variables
cp .env.example .env

# Build and start all services
docker compose up --build
```

Open **http://localhost:3000** for the frontend.  
Open **http://localhost:8000/docs** for the Swagger API docs.

### Without Docker (development)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Set env var pointing to your local Postgres
export DATABASE_URL=postgresql://user:pass@localhost:5432/inventory_db

uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```env
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=supersecret
POSTGRES_DB=inventory_db
# Comma-separated list of allowed frontend origins
FRONTEND_URL=http://localhost:3000,http://localhost:5173
VITE_API_URL=http://localhost:8000
```

---

## API Reference

Auto-generated Swagger UI at: **`/docs`**  
ReDoc at: **`/redoc`**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | Dashboard KPIs + low stock list |
| GET/POST | `/products` | List / create products |
| GET/PUT/DELETE | `/products/{id}` | Get / update / delete product |
| GET/POST | `/customers` | List / create customers |
| GET/PUT/DELETE | `/customers/{id}` | Get / update / delete customer |
| POST/GET | `/orders` | Create / list orders |
| GET/DELETE | `/orders/{id}` | Get / delete order |

---

## Design System

```
Canvas:       #131313  — Base background
Accent mint:  #3cffd0  — CTAs, active borders, links
Surface:      #2d2d2d  — Sidebar, cards
Warning:      #d4a017  — Low stock badges
Danger:       #ff4444  — Destructive actions

Fonts:
  Display: Oswald (900) — page titles, stat numbers
  Body:    Inter        — all prose and form labels
  Mono:    JetBrains Mono — table headers, badges, nav
```

---

## Docker Hub

```bash
# Pull pre-built backend image
docker pull hksona/invenio-backend:latest
```

---

## Deployment

### Backend (Render / Railway / Fly.io)
1. Push `backend/` to GitHub
2. Set env vars: `DATABASE_URL`, `FRONTEND_URL`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Attach a PostgreSQL add-on

### Frontend (Vercel / Netlify)
1. Push `frontend/` to GitHub
2. Set env var: `VITE_API_URL=https://your-backend.render.com`
3. Build command: `npm run build`, publish dir: `dist`
