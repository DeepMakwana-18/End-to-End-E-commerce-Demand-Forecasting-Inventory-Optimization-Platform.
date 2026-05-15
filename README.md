<div align="center">

# 🚀 DemandForecaster

### AI-Powered E-commerce Demand Forecasting & Inventory Optimization Platform

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-FF6600?logo=xgboost)](https://xgboost.readthedocs.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*Enterprise-grade SaaS analytics platform for smarter inventory decisions*

</div>

---

## 📋 Overview

**DemandForecaster** is a production-grade, full-stack AI platform that combines **XGBoost machine learning** with **real-time inventory optimization** to help e-commerce businesses predict demand, reduce stockouts, and optimize reorder decisions.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| **📊 Executive Dashboard** | Real-time KPIs, revenue trends, and demand analytics |
| **🤖 ML Demand Forecasting** | XGBoost-powered predictions with 95% confidence intervals |
| **📦 Inventory Optimization** | Safety stock, reorder points, EOQ, and health scoring |
| **🔔 Smart Alerts** | Automated stockout, reorder, and overstock notifications |
| **📈 Product Analytics** | Rankings, trends, risk classification, and performance tracking |
| **🥧 Category Analytics** | Distribution, radar comparisons, and seasonal patterns |
| **📋 Report Generation** | Export CSV, Excel, and PDF reports on demand |
| **⚙️ ML Pipeline Monitor** | Training convergence, feature importance, and model versioning |
| **📤 CSV Upload Pipeline** | Drag-and-drop data upload with ETL progress visualization |
| **👥 RBAC User Management** | Admin, Manager, Analyst, Viewer role-based access |
| **🌗 Dark/Light Mode** | System-aware theme with premium glassmorphism UI |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy                     │
│                       (Port 80/443)                          │
├────────────────────────┬────────────────────────────────────┤
│                        │                                     │
│   ┌────────────────┐   │   ┌─────────────────────────────┐  │
│   │   Frontend      │   │   │   Backend (FastAPI)          │  │
│   │   React + TS    │   │   │   Port 8000                  │  │
│   │   Vite + TWv4   │◄──┤──►│                              │  │
│   │   Port 5173     │   │   │   ┌──────────┐ ┌──────────┐ │  │
│   └────────────────┘   │   │   │ Auth     │ │ Forecast │ │  │
│                        │   │   │ Dashboard│ │ Inventory│ │  │
│                        │   │   │ Products │ │ Reports  │ │  │
│                        │   │   └──────────┘ └──────────┘ │  │
│                        │   └──────┬──────────────┬───────┘  │
│                        │          │              │           │
│                    ┌───┴──────────┴───┐  ┌──────┴────────┐  │
│                    │  PostgreSQL 15    │  │  Redis 7       │  │
│                    │  Port 5432       │  │  Port 6379     │  │
│                    └──────────────────┘  └────────────────┘  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              ML Pipeline (XGBoost)                    │  │
│   │   Data Preprocessing → Feature Engineering → Train    │  │
│   │   Forecasting Service + Inventory Optimizer           │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + **TypeScript** — Component framework
- **Vite** — Build tool with HMR
- **Tailwind CSS v4** — Utility-first styling
- **Framer Motion** — Animations and micro-interactions
- **Recharts** — Interactive data visualizations
- **Zustand** — Global state management
- **React Query** — Server state and caching
- **React Router v6** — Layout-based routing
- **Lucide Icons** — Premium icon set
- **Radix UI** — Accessible component primitives

### Backend
- **FastAPI** — Async Python web framework
- **SQLAlchemy 2.0** — Async ORM with PostgreSQL
- **Pydantic v2** — Data validation and serialization
- **python-jose** — JWT authentication
- **Alembic** — Database migrations
- **Celery + Redis** — Background task processing

### Machine Learning
- **XGBoost** — Gradient boosted demand forecasting
- **scikit-learn** — Preprocessing and evaluation
- **pandas / NumPy** — Data manipulation
- **SciPy** — Statistical computations
- **joblib** — Model serialization

### DevOps
- **Docker / Docker Compose** — Containerization
- **Nginx** — Reverse proxy and static serving
- **GitHub Actions** — CI/CD pipeline
- **PostgreSQL 15** — Primary database
- **Redis 7** — Caching and message broker

---

## 📁 Project Structure

```
DemandForecaster/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── layout/          # Sidebar, Header, MainLayout
│   │   │   └── dashboard/       # KPICard, ChartCard
│   │   ├── pages/               # Route pages
│   │   │   ├── auth/            # Login, Signup
│   │   │   ├── admin/           # Users, Upload, Pipeline, Settings
│   │   │   ├── DashboardPage    # Executive dashboard
│   │   │   ├── ForecastPage     # Demand forecasting
│   │   │   ├── InventoryPage    # Stock optimization
│   │   │   ├── ProductsPage     # Product analytics
│   │   │   ├── CategoriesPage   # Category analytics
│   │   │   ├── ReportsPage      # Report generation
│   │   │   └── AlertsPage       # Alert center
│   │   ├── stores/              # Zustand global state
│   │   ├── services/            # Axios API layer
│   │   ├── types/               # TypeScript definitions
│   │   └── lib/                 # Utilities
│   └── index.html
├── backend/                     # FastAPI + Python
│   ├── app/
│   │   ├── routers/             # API route handlers
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── utils/               # Auth, hashing
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB connection
│   │   ├── dependencies.py      # DI + RBAC
│   │   └── main.py              # FastAPI app
│   └── requirements.txt
├── ml/                          # Machine Learning
│   ├── pipelines/
│   │   ├── forecasting.py       # XGBoost service
│   │   ├── inventory.py         # Inventory optimizer
│   │   ├── feature_engineering.py
│   │   └── data_preprocessing.py
│   ├── models/                  # Saved model files
│   └── train.py                 # Training script
├── database/                    # Alembic migrations
├── docker/                      # Dockerfiles
├── nginx/                       # Nginx config
├── .github/workflows/           # CI/CD
├── docker-compose.yml
├── alembic.ini
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/demandforecaster.git
cd demandforecaster

# Copy environment config
cp .env.example .env

# Start all services
docker compose up -d

# Access the platform
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/api/docs
```

### Option 2: Local Development

```bash
# ---- Frontend ----
cd frontend
npm install
npm run dev
# → http://localhost:5173

# ---- Backend ----
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/api/docs

# ---- ML Training ----
python -m ml.train --data-dir ./data/raw
```

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup` | Register new user |
| `POST` | `/api/v1/auth/login` | JWT authentication |
| `GET`  | `/api/v1/dashboard/kpis` | Executive KPI metrics |
| `GET`  | `/api/v1/dashboard/charts` | Dashboard chart data |
| `GET`  | `/api/v1/dashboard/alerts` | Recent alerts |
| `GET`  | `/api/v1/forecast` | Demand forecasts |
| `GET`  | `/api/v1/forecast/product/{id}` | Product forecast |
| `GET`  | `/api/v1/forecast/categories` | Category forecasts |
| `GET`  | `/api/v1/forecast/model-info` | ML model metadata |
| `GET`  | `/api/v1/inventory` | Inventory items |
| `GET`  | `/api/v1/inventory/alerts` | Inventory alerts |
| `GET`  | `/api/v1/inventory/health-summary` | Health distribution |
| `GET`  | `/api/v1/inventory/reorder-recommendations` | Reorder list |
| `GET`  | `/api/v1/products` | Product listing |
| `GET`  | `/api/v1/products/top` | Top products |
| `GET`  | `/api/v1/products/categories` | Category analytics |
| `GET`  | `/api/v1/reports` | Report listing |
| `POST` | `/api/v1/reports/generate` | Generate report |
| `POST` | `/api/v1/upload` | Upload CSV data |
| `GET`  | `/api/v1/upload/history` | Upload history |
| `GET`  | `/api/health` | Health check |

---

## 🧮 ML Pipeline

### XGBoost Demand Forecasting

The forecasting engine uses **XGBoost Regressor** with log-transformed target variable, trained on the Olist e-commerce dataset.

**Hyperparameters:**
- `n_estimators`: 1000
- `learning_rate`: 0.01
- `max_depth`: 10
- `subsample`: 0.8
- `colsample_bytree`: 0.8

**Features:** Price, freight value, product dimensions, payment info, review scores, temporal features (month, day of week, quarter).

### Inventory Optimization Formulas

| Formula | Equation |
|---------|----------|
| **Safety Stock** | `SS = Z × σ × √LT` (Z=1.645 for 95% SL) |
| **Reorder Point** | `ROP = (Demand × Lead Time) + Safety Stock` |
| **EOQ** | `EOQ = √(2DS / H)` |

---

## 🎨 Design System

- **Typography:** Inter (Google Fonts)
- **Theme:** Dark-first with light mode support
- **Cards:** Glassmorphism with backdrop blur
- **Animations:** Framer Motion with staggered reveals
- **Charts:** Recharts with custom gradients and tooltips
- **Color Palette:** Indigo primary, Emerald accent, Amber warning, Red danger

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <sub>Built with ❤️ for enterprise-grade inventory intelligence</sub>
</div>
