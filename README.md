<div align="center">

# 🏭 Project Titan
### End-to-End E-Commerce Demand Forecasting & Inventory Optimization Platform




[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docs.docker.com/compose)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-EE4C2C?style=flat-square)](https://xgboost.readthedocs.io)
[![SHAP](https://img.shields.io/badge/SHAP-0.51-FF6F00?style=flat-square)](https://shap.readthedocs.io)

*A production-ready, multi-tenant SaaS platform that unifies machine learning forecasting, real-time inventory intelligence, anomaly detection, scenario planning, and an AI Copilot — all in a single containerized system.*

<img src="landing/screenshots/app_dashboard_1784608560491.png" alt="Project Titan Dashboard Preview" style="width:100%; margin-top:20px; border-radius:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

</div>

---

## 📋 Table of Contents

- [Executive Summary](#-executive-summary)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [AI Supply Chain Copilot](#-ai-supply-chain-copilot)
- [Forecasting Engine](#-forecasting-engine)
- [SHAP Explainability](#-shap-explainability)
- [Scenario Engine](#-scenario-engine)
- [Anomaly Intelligence](#-anomaly-intelligence)
- [Alert Engine](#-alert-engine)
- [Redis Pub/Sub Architecture](#-redis-pubsub-architecture)
- [WebSocket Architecture](#-websocket-architecture)
- [Multi-Tenant Security](#-multi-tenant-security)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation Guide](#-installation-guide)
- [Docker Deployment](#-docker-deployment)
- [Screenshots](#-screenshots)
- [API Overview](#-api-overview)
- [Production Readiness](#-production-readiness)
- [Future Enhancements](#-future-enhancements)
- [Contributors](#-contributors)

---

## 🎯 Executive Summary

**Project Titan** is a full-stack, production-ready demand forecasting and inventory optimization platform built as a Final Year Engineering Project. It combines a machine learning pipeline, real-time event streaming, explainable AI, and a natural-language Copilot into a single containerized SaaS application.

The platform enables supply chain teams to:
- **Forecast future demand** using custom-uploaded datasets with HistGradientBoosting / XGBoost models
- **Understand predictions** through SHAP-powered feature attribution and business-readable explanations
- **Plan scenarios** (price changes, demand shocks, supply disruptions) and see SHAP delta impacts
- **Detect anomalies** in real-time with a Z-score + IQR statistical engine and SHAP investigation
- **Monitor inventory health** with automated alert rules delivered over WebSocket and Redis Pub/Sub
- **Ask questions in plain English** via the AI Supply Chain Analyst Copilot

The entire system runs as 8 Docker containers orchestrated by Docker Compose, with zero external AI API dependencies.

---

## ✨ Key Features

### Machine Learning
- 🤖 **Async ML Training** — Celery worker trains HistGradientBoosting / XGBoost models in the background; backend never blocks
- 📤 **Custom Dataset Upload** — Upload any weekly demand CSV; model persists across restarts
- 🔄 **Stateful Retrain** — Retrain button always retrains the active uploaded dataset (disk-persisted CSV), never silently switches to synthetic data
- 📊 **Model Versioning** — Full ModelVersion history with accuracy, MAE, RMSE, training samples, and feature schema
- 🔮 **12-Week Forecast** — Weekly predictions with confidence intervals (lower/upper bounds)

### Explainable AI
- 🔍 **SHAP Forecast Drivers** — TreeExplainer attribution for every prediction: which features drove demand up/down
- 🎭 **Scenario Delta-SHAP** — Side-by-side SHAP comparison: base vs. scenario, with delta attribution per feature
- 🚨 **Anomaly SHAP Investigation** — For each detected anomaly, SHAP explains which features contributed to the deviation

### Scenario Planning
- 🎛️ **6 Scenario Types** — Price change, demand shock, supply disruption, seasonality shift, promotion, custom
- 📈 **Delta Analysis** — Scenario vs. baseline: percentage change, confidence interval change, impact severity
- 🧠 **SHAP Deltas** — Which feature's contribution changed most between baseline and scenario

### Anomaly Intelligence
- 📡 **Real-Time Detection** — Z-score + IQR dual-method statistical engine on live forecast data
- 🔗 **SHAP Investigation Drawer** — Click any anomaly to see full SHAP feature attribution
- 📋 **Severity Classification** — Critical / High / Medium / Low with automated resolution tracking

### Alert System
- ⚡ **Rule-Based Alert Engine** — Configurable thresholds: low stock, critical inventory, reorder point, overstock
- 🔔 **Real-Time Delivery** — Alerts published to Redis and pushed to connected clients over WebSocket
- 📊 **Alert Dashboard** — Full CRUD: create rules, acknowledge alerts, view history

### Real-Time Infrastructure
- 🌐 **WebSocket Server** — Per-organization broadcast channels for live KPI updates and alert notifications
- 📡 **Redis Pub/Sub** — Decoupled event bus between Celery workers and WebSocket broadcaster
- 📊 **Live Dashboard** — KPIs refresh in real-time without page reload

### Platform
- 🏢 **Multi-Tenant RBAC** — Organization-scoped data isolation; `admin` / `analyst` roles with capability enforcement
- 🔐 **JWT Authentication** — Stateless auth with role-based endpoint guards
- 📦 **Inventory Management** — Product catalog, warehouse stock levels, health scores, reorder tracking
- 🤖 **AI Copilot** — Natural-language analyst that synthesizes forecasts, anomalies, alerts, and inventory in one response
- 🌸 **Celery Flower** — Worker monitoring UI at port 5555

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Port 80)                         │
│                    Reverse Proxy / SSL Termination              │
└────────────────────┬──────────────────────┬────────────────────┘
                     │                      │
          ┌──────────▼──────────┐  ┌────────▼────────────┐
          │  Frontend (Port 3000)│  │  Backend (Port 8001) │
          │  React 18 + Vite    │  │  FastAPI + Uvicorn   │
          │  TypeScript + Zustand│  │  AsyncPG + SQLAlchemy│
          │  Recharts + Framer  │  │  WebSocket Server    │
          └─────────────────────┘  └────────┬────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
          ┌─────────▼──────┐    ┌──────────▼──────┐    ┌──────────▼──────┐
          │  PostgreSQL 15  │    │    Redis 7       │    │ Celery Worker   │
          │  Multi-tenant   │    │  Pub/Sub + Cache │    │ ML Training     │
          │  ModelVersions  │    │  Task Broker     │    │ SHAP Compute    │
          │  Alerts, Forecasts│  │  WebSocket Bus   │    │ Alert Tasks     │
          └─────────────────┘   └─────────────────┘    └────────┬────────┘
                                                                 │
                                                        ┌────────▼────────┐
                                                        │  Celery Beat    │
                                                        │  Scheduled Tasks│
                                                        │  (Alert Scans)  │
                                                        └─────────────────┘
```

### Request Flow
1. Browser → NGINX (reverse proxy) → FastAPI backend
2. Authenticated requests validated via JWT → TenantContext injected
3. ML operations enqueued to Redis → Celery worker processes async
4. Worker publishes events to Redis Pub/Sub → WebSocket broadcaster delivers to browser
5. All data scoped to `organization_id` — no cross-tenant data leakage

---

## 🤖 AI Supply Chain Copilot

The Copilot is a zero-dependency AI analyst built entirely on top of existing platform APIs. It uses **no LLMs, no vector databases, no RAG, no LangChain** — only structured data from the platform's own endpoints.

### Architecture

```
User Query (natural language)
         │
         ▼
  classify_intent()          ← keyword + pattern matching
         │
         ├──► executive_summary   → /forecast/model-info + /dashboard/kpis + /anomalies + /alerts
         ├──► forecast_explain    → /forecast + /forecast/explain (SHAP)
         ├──► anomaly_investigate → /anomalies + /forecast/anomaly-explain
         ├──► alert_analysis      → /alerts + /alerts/rules
         ├──► inventory_recommend → /inventory + /forecast
         ├──► scenario_explain    → /scenarios/list + /scenarios/{id}/explain
         └──► forecast (default)  → /forecast + /forecast/model-info

         │
         ▼
  copilot_service.py          ← aggregates API responses
         │
         ▼
  _build_response()           ← formats structured Markdown
         │
         ▼
  POST /api/v1/copilot/chat   ← single endpoint response
```

### Capabilities

| Intent | Trigger Keywords | Data Sources |
|--------|-----------------|--------------|
| Executive Summary | "summary", "overview", "status", "report" | Dashboard KPIs, Model Info, Anomalies, Alerts |
| Forecast Analysis | "forecast", "predict", "demand", "next week" | Forecast endpoint, Model version |
| Forecast Explainability | "explain", "drivers", "shap", "why forecast" | SHAP explainability endpoint |
| Anomaly Investigation | "anomaly", "spike", "unusual", "outlier" | Anomaly list + SHAP attribution |
| Alert Analysis | "alert", "warning", "critical", "threshold" | Alert list + Alert rules |
| Inventory Recommendations | "inventory", "stock", "reorder", "replenish" | Inventory + Forecast |
| Scenario Explanation | "scenario", "what if", "simulation" | Scenario list + Delta SHAP |

---

## 🔮 Forecasting Engine

The ML pipeline is built with scikit-learn's `HistGradientBoostingRegressor` as the primary model, with XGBoost available as an alternative.

### Training Pipeline

```
CSV Upload (weekly demand data)
         │
         ▼
UploadedFile record created → Celery task queued
         │
         ▼
Feature Engineering:
  - Week number (1–52)
  - Month number (1–12)
  - Quarter (1–4)
  - Lag features: lag_1, lag_2, lag_4, lag_8, lag_12
  - Rolling mean: 4-week, 8-week, 12-week
  - Year-over-year (52-week lag where available)
         │
         ▼
HistGradientBoostingRegressor.fit()
         │
         ▼
Metrics: RMSE, MAE, Accuracy (100 - MAPE), feature_importance
         │
         ▼
Model saved to ./ml/models/model_org_{org_id}_{version_tag}.pkl
CSV saved to ./ml/models/model_org_{org_id}_{version_tag}_dataset.csv
         │
         ▼
ModelVersion record: version_tag, data_source=uploaded:{filename},
  accuracy, is_active=True, csv_path in hyperparameters
         │
         ▼
12-week forecast inserted into Forecast table
Historical actuals inserted for charting
```

### Dataset Requirements

| Column | Type | Description |
|--------|------|-------------|
| `date` | date (YYYY-MM-DD) | Weekly period start date |
| `demand` | numeric | Units demanded in that week |

Minimum ~52 rows recommended for meaningful lag features.

### Model Persistence

After upload, the CSV is persisted to disk alongside the `.pkl` file. If the user clicks **Retrain** after a page refresh (Zustand store cleared), the backend automatically reloads the CSV from `ModelVersion.hyperparameters["csv_path"]` — the active uploaded dataset is never replaced by synthetic data.

---

## 🔍 SHAP Explainability

SHAP (SHapley Additive exPlanations) is implemented via `shap.TreeExplainer` for tree-based models.

### Forecast SHAP

```
GET /api/v1/forecast/explain
         │
         ▼
shap_service.explain_forecast()
  - Loads active ModelVersion pkl
  - Constructs feature matrix for forecast horizon
  - shap.TreeExplainer(model).shap_values(X)
  - Returns: feature_name, shap_value, direction (positive/negative), magnitude
```

### Scenario Delta-SHAP

```
POST /api/v1/scenarios/{id}/explain
         │
         ▼
scenario_service.explain_scenario()
  - Base forecast SHAP values
  - Scenario forecast SHAP values (modified feature inputs)
  - Delta = scenario_shap - base_shap per feature
  - Returns: feature, base_value, scenario_value, delta, delta_pct
```

### Anomaly SHAP

```
GET /api/v1/forecast/anomaly-explain?anomaly_id={id}
         │
         ▼
shap_service.explain_anomaly()
  - Reconstructs feature vector for anomaly date
  - TreeExplainer.shap_values(X_anomaly)
  - Returns: which features pushed prediction outside normal range
```

---

## 🎭 Scenario Engine

The Scenario Engine simulates alternative demand environments without retraining the model.

### Supported Scenario Types

| Type | Parameter | Effect |
|------|-----------|--------|
| `price_change` | `price_delta_pct` | Adjusts demand via price elasticity |
| `demand_shock` | `shock_pct` | Direct multiplicative shock to demand |
| `supply_disruption` | `disruption_pct`, `duration_weeks` | Reduces available supply |
| `seasonality_shift` | `shift_weeks` | Phase-shifts seasonal component |
| `promotion` | `uplift_pct`, `duration_weeks` | Demand uplift during promotion window |
| `custom` | `multiplier` | Direct multiplier on baseline forecast |

### Scenario Flow

```
POST /api/v1/scenarios
  → ScenarioEngine.run(base_forecast, params)
  → Modified feature matrix
  → Same trained model predicts on modified features
  → Returns: {baseline_forecast, scenario_forecast, delta_demand, delta_pct, impact_severity}
  → SHAP delta computed on demand

GET /api/v1/scenarios/{id}/explain
  → Delta-SHAP: feature-by-feature attribution difference
```

---

## 🚨 Anomaly Intelligence

The Anomaly Engine uses a dual-method statistical approach on live forecast data.

### Detection Algorithm

```python
# For each data point:
z_score = (value - rolling_mean) / rolling_std
iqr = Q3 - Q1
iqr_flag = value < (Q1 - 1.5 * IQR) or value > (Q3 + 1.5 * IQR)

# Anomaly if:
is_anomaly = abs(z_score) > threshold AND iqr_flag
severity = "critical" if abs(z_score) > 3.5 else "high" if > 2.5 else "medium" if > 2.0 else "low"
```

### Response Structure

```json
{
  "id": 42,
  "forecast_date": "2024-03-15",
  "actual_demand": 4200,
  "predicted_demand": 2800,
  "z_score": 3.2,
  "severity": "high",
  "is_resolved": false,
  "shap_drivers": [
    { "feature": "lag_1", "value": 1.8, "direction": "positive" },
    { "feature": "rolling_mean_4", "value": -0.6, "direction": "negative" }
  ]
}
```

---

## ⚡ Alert Engine

The Alert Engine continuously monitors inventory metrics and publishes events.

### Alert Types

| Rule Key | Trigger Condition | Default Severity |
|----------|-----------------|-----------------|
| `low_inventory` | current_stock ≤ reorder_point | High |
| `critical_inventory` | current_stock ≤ safety_stock | Critical |
| `overstock` | current_stock ≥ max_capacity × 0.95 | Medium |
| `reorder_due` | current_stock ≤ reorder_point + lead_time buffer | High |

### Alert Flow

```
Celery Beat → alert_tasks.scan_inventory_alerts (periodic)
         │
         ▼
AlertEngine.evaluate_all_rules(org_id)
  - Loads all products + inventory
  - Evaluates each rule against current stock levels
  - Creates InventoryAlert records (deduplication via rule_key)
         │
         ▼
Redis PUBLISH titan:alerts:{org_id}
         │
         ▼
WebSocket broadcaster → all connected clients for org
```

---

## 📡 Redis Pub/Sub Architecture

Redis serves two roles: Celery task broker and real-time event bus.

```
┌──────────────────────────────────────────────────────────────────┐
│                    Redis Channels                                │
│                                                                  │
│  titan:alerts:{org_id}     ← Alert events from alert_tasks      │
│  titan:kpis:{org_id}       ← KPI refresh triggers               │
│  titan:forecasts:{org_id}  ← Forecast completion events         │
│  titan:celery              ← Celery task messages (broker)       │
└──────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Celery Workers                  WebSocket Manager
  (PUBLISH events)                (SUBSCRIBE + broadcast)
```

---

## 🌐 WebSocket Architecture

```
Browser → WS /api/v1/ws/{org_id}/{user_id}
                    │
                    ▼
         WebSocketManager.connect(org_id, user_id, websocket)
                    │
                    │  Background task:
                    ▼
         Redis SUBSCRIBE titan:*:{org_id}
                    │
                    ▼  on message:
         WebSocketManager.broadcast_to_org(org_id, payload)
                    │
                    ▼
         All connected clients for org receive JSON event
```

Event types delivered over WebSocket:
- `alert_triggered` — new inventory alert
- `forecast_complete` — ML training finished
- `kpi_update` — dashboard KPI refresh
- `anomaly_detected` — new anomaly found

---

## 🔐 Multi-Tenant Security

### Data Isolation

Every database table contains `organization_id`. All queries are scoped:

```python
# TenantContext injected into every authenticated request
async def get_tenant_context(token: str = Depends(oauth2_scheme), db: AsyncSession = ...):
    user = decode_jwt(token)
    return TenantContext(
        org_id=user.organization_id,
        user_id=user.id,
        role=user.role,
        can_manage_ml=user.role == "admin",
        can_manage_users=user.role == "admin",
    )

# Repository pattern enforces org scoping:
class ForecastRepository:
    def __init__(self, db, org_id):
        self.org_id = org_id

    async def get_all(self):
        return await db.execute(
            select(Forecast).where(Forecast.organization_id == self.org_id)
        )
```

### RBAC Roles

| Permission | Admin | Analyst |
|-----------|-------|---------|
| View forecasts, anomalies, inventory | ✅ | ✅ |
| Run scenarios | ✅ | ✅ |
| Use AI Copilot | ✅ | ✅ |
| Upload datasets | ✅ | ❌ |
| Retrain model | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| Configure alert rules | ✅ | ❌ |
| Manage products | ✅ | ❌ |

### JWT Flow

```
POST /api/v1/auth/login → {access_token, token_type}
Authorization: Bearer <token>  →  TenantContext resolved per request
```

---

## 🛠️ Technology Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| API Framework | FastAPI | 0.115 |
| ASGI Server | Uvicorn | 0.31 |
| ORM | SQLAlchemy (async) | 2.0 |
| DB Driver | AsyncPG | 0.30 |
| Task Queue | Celery | 5.4 |
| Task Broker | Redis | 7 |
| Database | PostgreSQL | 15 |
| ML — Primary | scikit-learn HistGradientBoostingRegressor | 1.5 |
| ML — Alternative | XGBoost | 2.1 |
| Explainability | SHAP TreeExplainer | 0.51 |
| Auth | python-jose (JWT) + bcrypt | 3.3 / 4.0 |
| Migrations | Alembic | 1.13 |
| Validation | Pydantic v2 | 2.9 |
| HTTP Client | httpx | 0.27 |
| Observability | Sentry SDK | 2.14 |
| Monitoring | Prometheus client | 0.25 |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18 |
| Language | TypeScript | 5 |
| Build Tool | Vite | 5 |
| State Management | Zustand | 4 |
| HTTP Client | Axios | 1.7 |
| Charts | Recharts | 2.12 |
| Animations | Framer Motion | 11 |
| Icons | Lucide React | 0.441 |
| Styling | Vanilla CSS (custom design system) | — |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (Alpine) |
| Static Serving | Nginx |
| Task Monitoring | Celery Flower |
| Process Isolation | Multi-container, single network |

---

## 📁 Project Structure

```
project-titan/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, middleware, startup
│   │   ├── config.py                  # Settings (Pydantic BaseSettings)
│   │   ├── database.py                # AsyncSession factory
│   │   ├── dependencies.py            # get_db, get_tenant_context
│   │   ├── celery_app.py              # Celery + Beat schedule
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   └── __init__.py            # ModelVersion, Forecast, Anomaly,
│   │   │                              #   InventoryAlert, Product, etc.
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── repositories/              # Repository pattern (org-scoped queries)
│   │   │   ├── forecast_repo.py
│   │   │   ├── alert_repo.py
│   │   │   └── ...
│   │   ├── services/                  # Business logic
│   │   │   ├── ml_service.py          # ForecastModel class
│   │   │   ├── shap_service.py        # SHAP explain (forecast, scenario, anomaly)
│   │   │   ├── anomaly_service.py     # Z-score + IQR detection + SHAP
│   │   │   ├── scenario_service.py    # Scenario runner + delta-SHAP
│   │   │   ├── alert_engine.py        # Rule evaluation + Redis publish
│   │   │   └── copilot_service.py     # AI Copilot intent classifier + response builder
│   │   ├── routers/                   # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── forecast.py            # /forecast, /retrain, /reset, /explain
│   │   │   ├── scenarios.py           # /scenarios, /{id}/explain
│   │   │   ├── anomalies.py
│   │   │   ├── alerts.py
│   │   │   ├── dashboard.py
│   │   │   ├── inventory.py
│   │   │   ├── upload.py
│   │   │   ├── copilot.py
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   └── reports.py
│   │   ├── tasks/                     # Celery task definitions
│   │   │   ├── retraining_tasks.py    # retrain_model_async, reset_model_async
│   │   │   └── alert_tasks.py         # scan_inventory_alerts (periodic)
│   │   ├── ml/                        # ML utilities
│   │   │   ├── model_registry.py      # Model load/save/register
│   │   │   ├── scenario_engine.py     # Scenario feature modification
│   │   │   └── feature_reconstruction.py
│   │   └── websocket/                 # WebSocket manager + Redis subscriber
│   └── seed.py                        # Demo data seeder
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Routes + auth guard
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # Live KPIs + WebSocket
│   │   │   ├── ForecastPage.tsx       # Forecast chart + SHAP
│   │   │   ├── AnomaliesPage.tsx      # Anomaly table + SHAP drawer
│   │   │   ├── ScenariosPage.tsx      # Scenario builder + delta
│   │   │   ├── AlertsPage.tsx         # Alert rules + live notifications
│   │   │   ├── InventoryPage.tsx      # Stock levels + health scores
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── admin/
│   │   │       ├── PipelinePage.tsx   # ML Pipeline control (retrain/reset)
│   │   │       ├── UploadPage.tsx     # Dataset upload
│   │   │       └── UsersPage.tsx      # User management
│   │   ├── components/
│   │   │   ├── layout/                # Header, Sidebar, Layout
│   │   │   ├── anomalies/             # AnomalyExplainPanel, InvestigationDrawer
│   │   │   ├── copilot/               # CopilotDrawer, ChatBubble
│   │   │   └── ...
│   │   ├── store/                     # Zustand stores
│   │   ├── services/                  # API service functions (axios)
│   │   └── hooks/                     # useRealtimeKPIs, useWebSocket
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── nginx/
│   └── nginx.conf
├── ml/
│   └── models/                        # Persisted .pkl + _dataset.csv files
├── database/
│   └── migrations/                    # Alembic migrations
├── docker-compose.yml
└── README.md
```

---

## 🚀 Installation Guide

### Prerequisites

| Requirement | Minimum Version |
|------------|----------------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| (Optional) Python | 3.11+ for local dev |
| (Optional) Node.js | 20+ for local frontend dev |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/DeepMakwana-18/End-to-End-E-commerce-Demand-Forecasting-Inventory-Optimization-Platform.git
cd End-to-End-E-commerce-Demand-Forecasting-Inventory-Optimization-Platform

# 2. Copy environment file
cp .env.example .env
# Edit .env — set JWT_SECRET_KEY to a strong random string

# 3. Build and start all services
docker compose up --build -d

# 4. Wait ~30 seconds for startup, then seed demo data
docker compose exec backend python app/seed.py

# 5. Access the platform
# Frontend:    http://localhost:3000
# Backend API: http://localhost:8001/docs
# Flower:      http://localhost:5555
```

### Default Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@titan.demo | admin123 |
| Analyst | analyst@titan.demo | analyst123 |

### Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/demandforecaster

# Redis
REDIS_URL=redis://redis:6379/0

# Auth (CHANGE IN PRODUCTION)
JWT_SECRET_KEY=your-strong-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional: Sentry error tracking
SENTRY_DSN=

# Logging
LOG_LEVEL=INFO
LOG_JSON=true
```

---

## 🐳 Docker Deployment

### Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `df-nginx` | nginx:alpine | **80** | Reverse proxy (primary entry) |
| `df-frontend` | projecttitan-frontend | 3000 | React app (Nginx static) |
| `df-backend` | projecttitan-backend | 8001 | FastAPI + WebSocket server |
| `df-celery-worker` | projecttitan-backend | — | Async ML training + alert scan |
| `df-celery-beat` | projecttitan-backend | — | Periodic task scheduler |
| `df-flower` | projecttitan-backend | 5555 | Celery task monitor |
| `df-postgres` | postgres:15-alpine | 5432 | Primary relational database |
| `df-redis` | redis:7-alpine | 6379 | Broker + Pub/Sub + cache |

### Common Commands

```bash
# Start all services
docker compose up -d

# Force rebuild (after code changes)
docker compose build --no-cache backend celery_worker celery_beat frontend
docker compose up -d --force-recreate

# View backend logs
docker compose logs -f backend

# View worker logs (ML training)
docker compose logs -f celery_worker

# Run database migrations
docker compose exec backend alembic upgrade head

# Open a Python shell inside backend
docker compose exec backend python

# Stop all services
docker compose down

# Stop and remove all data volumes (DESTRUCTIVE)
docker compose down -v
```

### Persistent Volumes

| Volume | Content |
|--------|---------|
| `postgres_data` | All PostgreSQL data |
| `./ml/models` (bind mount) | Trained `.pkl` files + `_dataset.csv` backups |

> **Note:** The `./ml/models` directory is bind-mounted into both `backend` and `celery_worker`. Model files and dataset CSVs persist across container restarts.

---

## 📸 Screenshots

> *Screenshots from the live deployed system.*

### Dashboard
Live KPI cards with real-time WebSocket updates, forecast accuracy, anomaly count, and inventory health score.
![Dashboard](landing/screenshots/app_dashboard_1784608560491.png)

### Forecasting Page
12-week demand forecast chart with confidence interval band, model version info, and SHAP driver panel.
![Forecasting Page](landing/screenshots/app_forecast_1784608599518.png)

### Alerts & Anomaly Detection
Statistical anomaly table with severity badges, resolution tracking, and SHAP investigation drawer.
![Alerts](landing/screenshots/app_alerts_1784608664287.png)

### Inventory & Stock Health
Inventory levels, health scores, and real-time monitoring of SKU metrics.
![Inventory Page](landing/screenshots/app_inventory_1784608715754.png)

### ML Pipeline (Admin)
Model version history, retrain controls, accuracy trend, and training status with live Celery task polling.
![ML Pipeline](landing/screenshots/app_pipeline_1784608681678.png)

---

## 🔌 API Overview

The full interactive API documentation is available at `http://localhost:8001/docs` (Swagger UI) and `http://localhost:8001/redoc`.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login, returns JWT |
| `GET` | `/api/v1/forecast` | Get active forecast + model info |
| `POST` | `/api/v1/forecast/retrain` | Queue async retrain (uploaded dataset) |
| `POST` | `/api/v1/forecast/reset` | Reset to synthetic baseline model |
| `GET` | `/api/v1/forecast/explain` | SHAP feature attribution for forecast |
| `GET` | `/api/v1/forecast/model-info` | Active ModelVersion details |
| `GET` | `/api/v1/forecast/training-history` | All ModelVersion records |
| `POST` | `/api/v1/scenarios` | Create and run scenario |
| `GET` | `/api/v1/scenarios` | List all scenarios |
| `GET` | `/api/v1/scenarios/{id}/explain` | Delta-SHAP for scenario |
| `GET` | `/api/v1/anomalies` | List detected anomalies |
| `GET` | `/api/v1/forecast/anomaly-explain` | SHAP for a specific anomaly |
| `GET` | `/api/v1/alerts` | List alerts |
| `GET` | `/api/v1/alerts/rules` | List alert rules |
| `POST` | `/api/v1/alerts/rules` | Create alert rule |
| `GET` | `/api/v1/dashboard/kpis` | Live KPI aggregation |
| `GET` | `/api/v1/inventory` | Inventory with health scores |
| `POST` | `/api/v1/upload` | Upload CSV dataset (triggers async retrain) |
| `POST` | `/api/v1/copilot/chat` | AI Copilot natural-language query |
| `GET` | `/api/v1/tasks/{task_id}` | Poll Celery task status |
| `WS` | `/api/v1/ws/{org_id}/{user_id}` | WebSocket for real-time events |

### Retrain vs. Reset

| Action | Endpoint | Behaviour |
|--------|----------|-----------|
| **Retrain** | `POST /forecast/retrain` | Retrains the active uploaded dataset (reads CSV from disk if not in body). Never activates synthetic data. |
| **Reset** | `POST /forecast/reset` | Resets to a freshly trained synthetic baseline model. Only use to clear custom data. |

---

## ✅ Production Readiness

| Category | Status | Details |
|----------|--------|---------|
| Authentication | ✅ | JWT + bcrypt, role-based guards |
| Multi-tenancy | ✅ | Organization-scoped all queries |
| Async ML | ✅ | Celery worker, non-blocking API |
| Model Persistence | ✅ | pkl + CSV on bind-mounted volume |
| Real-time | ✅ | WebSocket + Redis Pub/Sub |
| SHAP Explainability | ✅ | Forecast, Scenario, Anomaly |
| Anomaly Detection | ✅ | Z-score + IQR dual method |
| Alert Engine | ✅ | Rule-based, periodic, async delivery |
| Scenario Engine | ✅ | 6 types + delta-SHAP |
| AI Copilot | ✅ | Intent classification, 7 capabilities |
| Database Migrations | ✅ | Alembic versioned migrations |
| Health Checks | ✅ | Docker health checks on Postgres + Redis |
| Structured Logging | ✅ | JSON logs, LOG_LEVEL configurable |
| Error Tracking | ✅ | Sentry SDK (optional DSN) |
| CORS | ✅ | Configurable via CORS_ORIGINS |
| Container Isolation | ✅ | 8 isolated containers, single bridge network |
| Data Seeding | ✅ | Demo org, users, products, inventory |

---

## 🚀 Future Enhancements

The following capabilities are not yet implemented and represent natural next steps:

1. **Email / SMS Alert Notifications** — Deliver alerts via SMTP or Twilio in addition to WebSocket
2. **Multi-Product Forecasting** — Per-SKU demand forecasting with product-level SHAP attribution
3. **Prophet / LSTM Models** — Additional model choices in the ML pipeline
4. **Forecast Accuracy Drift Detection** — Auto-trigger retraining when live MAPE degrades past threshold
5. **OAuth2 SSO** — Google / Microsoft social login for enterprise deployment
6. **Export to PDF / Excel** — Reports page export of forecasts, anomalies, and inventory status
7. **Audit Log** — Per-user action history for compliance
8. **Kubernetes Helm Chart** — Production-grade orchestration beyond Docker Compose
9. **A/B Model Testing** — Shadow mode: run two model versions simultaneously and compare predictions
10. **Demand Segmentation** — Cluster products by demand pattern for tailored forecasting

---

## 👥 Contributors

| Name | Role |
|--------|--------|
| Deep Makwana | Project Lead, Backend, ML Pipeline, AI Copilot |
| Trupesh Hingrajiya | Frontend Development, UI/UX |
| Smit Kansagara | Testing, Documentation, Validation |
| Manav Limbani | Research, Analysis, Support |

---

<div align="center">

**Project Titan** — Built as a Final Year Engineering Project

*End-to-End E-Commerce Demand Forecasting & Inventory Optimization Platform*

[![GitHub](https://img.shields.io/badge/GitHub-DeepMakwana--18-181717?style=flat-square&logo=github)](https://github.com/DeepMakwana-18)

</div>

