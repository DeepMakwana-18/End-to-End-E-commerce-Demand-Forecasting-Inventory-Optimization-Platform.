# SHAP Readiness Audit — Titan Supply Chain AI

> Audit date: 2026-06-08  
> Evidence source: live container probe + full codebase read  
> Scope: Forecast, Scenario, and Anomaly explainability

---

## Requirement-by-Requirement Assessment

---

### REQ-1 — Active Model Artifacts Exist on Disk

**Verdict: ⚠️ PARTIAL PASS**

**Evidence:**
- `ML_MODEL_PATH = ./ml/models` exists inside `df-backend` container
- 54 `.pkl` files found: `model_org_1_v1.0.pkl` through `model_org_1_v54.0.pkl`
- The **active** `ModelVersion` record points to `./ml/models/model_org_1_v2.0.pkl` — which **exists and is loadable**
- The uploaded-dataset model (the one used by Forecasting/Anomaly/Scenario) was last trained from `uploaded:demand_forecasting_dataset_10000_rows.csv` but the **active DB record is still `v2.0 / synthetic`**

**Blocker:**
The DB `model_versions` table's `is_active=True` row (ID=57, `v2.0`, `data_source=synthetic`) diverges from the latest pkl artifact that reflects the uploaded dataset. After upload + retrain, the new ModelVersion is persisted but the `training_id` counter continues on the singleton — causing `v2.0` to be the active record while the training singleton has since advanced to ~v54.

**Required change:**
Verify that `retrain_model_async` correctly calls `repo.deactivate_all()` before inserting the new `ModelVersion` with `is_active=True`. Add a startup integrity check that reconciles the active DB record with the highest-version pkl on disk.

---

### REQ-2 — ModelVersion Records Correctly Reference Artifact Paths

**Verdict: ⚠️ PARTIAL PASS**

**Evidence (from live DB query):**
```json
{
  "id": 57,
  "version_tag": "v2.0",
  "model_path": "./ml/models/model_org_1_v2.0.pkl",
  "path_exists": true,
  "feature_schema": null,
  "hyperparameters": null,
  "data_source": "synthetic"
}
```

**Schema has the columns** (`feature_schema`, `hyperparameters`, `dataset_hash`) but **all are NULL**.  
The `ModelVersion` ORM model at `backend/app/models/__init__.py:294–295` defines:
```python
feature_schema = Column(JSON, nullable=True)   # always NULL
hyperparameters = Column(JSON, nullable=True)  # always NULL
dataset_hash = Column(String(64), nullable=True)  # always NULL
```

Neither `retraining_tasks.py` nor `forecast.py::reset_model` populate `feature_schema` or `hyperparameters` when saving a `ModelVersion`.

**Required change:**
Populate `feature_schema`, `hyperparameters`, and `dataset_hash` in both `_save_model_version()` (Celery task) and `reset_model()` (router).

---

### REQ-3 — XGBoost Models Can Be Deserialized Successfully

**Verdict: ❌ FAIL (Wrong model class)**

**Evidence (live probe):**
```
model_class: HistGradientBoostingRegressor
model_module: sklearn.ensemble._hist_gradient_boosting.gradient_boosting
```

**Critical finding:** Despite the class being named `XGBoostForecastModel` and the model type recorded as `"XGBRegressor"` in the DB, the **actual trained estimator is `sklearn.ensemble.HistGradientBoostingRegressor`**, not XGBoost. See `ml_service.py:17`:
```python
self.model = HistGradientBoostingRegressor(
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)
```

This matters critically for SHAP:
- `shap.TreeExplainer` **does support** `HistGradientBoostingRegressor` in shap ≥ 0.41
- But the live probe confirms **shap is not installed** in the container image
- The recorded `model_type = "XGBRegressor"` in the DB is a lie — it will mislead any SHAP code that branches on model type

**Deserialization itself works** (pickle loads, `model.predict()` returns valid output), but the class mismatch is a semantic blocker.

**Required changes:**
1. Rename class to `GradientBoostingForecastModel` or replace with real XGBoost
2. Fix `model_type = "HistGradientBoostingRegressor"` in DB persistence
3. Add `shap` to `requirements.txt` / Docker image

---

### REQ-4 — Feature Names Are Preserved After Training

**Verdict: ✅ PASS (Minimal)**

**Evidence:**
```
feature_importance: ['week', 'month', 'year', 'lag_1', 'lag_4']
test_predict output: 34090.54 (valid)
```

The 5 feature columns (`week`, `month`, `year`, `lag_1`, `lag_4`) are:
- Defined in `ml_service.py:111` as a hardcoded list
- Stored in `metrics["feature_importance"]` dict
- Persisted in `ModelVersion.feature_importance` JSON column
- Reconstructible from the pkl state via `state["model"]` (sklearn stores feature names implicitly)

**Limitation:** Feature names are implicit in the DataFrame column order, not explicitly serialised as a separate list. If column order ever changes, SHAP values will be mislabelled.

**Required change:**
Explicitly save `feature_names = ["week", "month", "year", "lag_1", "lag_4"]` inside the pkl state dict and into `ModelVersion.feature_schema`.

---

### REQ-5 — Feature Engineering Metadata Exists and Is Accessible

**Verdict: ❌ FAIL**

**Evidence:**
- `ModelVersion.feature_schema` → `null` in DB
- `ModelVersion.hyperparameters` → `null` in DB
- `ModelVersion.dataset_hash` → `null` in DB
- pkl state dict keys: `['model', 'is_trained', 'training_id', 'data_source', 'metrics', 'std_dev', 'last_date', 'last_demand', 'last_4_demand', 'last_demands', 'seasonal_amplitude', 'historical_data']`

There is **no persisted record** of:
- Feature engineering parameters (resample frequency, lag windows)
- Preprocessing decisions (which columns were renamed, outlier handling)
- Training/validation split ratio (hardcoded 80% in `ml_service.py:114`)
- Seasonal amplitude computation method
- Dataset statistics (mean, std, min, max of demand)

A SHAP explainer requires knowing exactly what transformations produced each feature value so human-readable explanations can be given (e.g., "lag_1 = demand from 7 days ago = 4,230 units").

**Required changes:**
Persist a `feature_engineering_config` dict into `ModelVersion.feature_schema`:
```json
{
  "feature_names": ["week", "month", "year", "lag_1", "lag_4"],
  "lag_windows": [1, 4],
  "resample_frequency": "W",
  "train_val_split": 0.8,
  "demand_stats": {"mean": ..., "std": ..., "min": ..., "max": ...}
}
```

---

### REQ-6 — Historical Feature Vectors Can Be Reconstructed

**Verdict: ⚠️ PARTIAL PASS**

**Evidence:**
- `Forecast` table has 118 rows for org_id=1 (106 actuals + 12 predictions)
- Rows span 2023-01-01 → 2025-01-05 (weekly)
- `product_id = NULL` for all rows (org-level upload)

```
forecast_sample:
  date: 2023-01-01, actual: 3698.0, predicted: 0.0, product_id: None
  date: 2023-01-08, actual: 29827.8, ...
```

**What works:** Given time-ordered `actual_demand` values, `lag_1` and `lag_4` can be recomputed by shifting the sequence. `week`, `month`, `year` can be derived from `forecast_date`. All 5 features are reconstructible.

**What fails:**
- The `Forecast` table stores only `actual_demand` and `predicted_demand` — no raw feature vectors are saved
- Each request to explain a prediction must re-derive features from the time series, which works but requires care around boundaries (first 4 rows have no valid lag_4)
- Historical feature vectors are NOT stored per-row; reconstruction is a compute step

**Required change:**
Add a `feature_vector` JSONB column to the `Forecast` table to store the exact `[week, month, year, lag_1, lag_4]` values used during inference for each row. Without this, SHAP values can drift from reality if the pipeline ever changes.

---

### REQ-7 — Forecast Generation Has Access to Model Input Features

**Verdict: ✅ PASS**

**Evidence:**
In `ml_service.py:199–205`, every prediction call constructs:
```python
X_pred = pd.DataFrame({
    "week": [week], "month": [month], "year": [year],
    "lag_1": [lag_1], "lag_4": [lag_4]
})
pred_value = float(self.model.predict(X_pred)[0])
```

The feature DataFrame `X_pred` is available **at inference time** for every forecast step. SHAP can be called at this exact point.

**Limitation:** `X_pred` is currently a local variable that is not returned or logged. To enable SHAP, the `predict()` method (or a new `predict_with_shap()` variant) must capture and return the feature DataFrame alongside predictions.

**Required change:**
Add an optional `return_features=False` parameter to `XGBoostForecastModel.predict()` that returns `(predictions, feature_matrix)` when set to True.

---

### REQ-8 — Scenario Engine Can Expose Modified Feature Vectors Before Inference

**Verdict: ✅ PASS**

**Evidence:**
In `scenario_engine.py`, both `_run_baseline()` (L92–98) and `_run_modified()` (L148–154) construct:
```python
X_pred = pd.DataFrame({
    "week": [week], "month": [month], "year": [year],
    "lag_1": [lag_1], "lag_4": [lag_4],
})
```

The scenario modifications (demand multiplier, lead time) are applied **before** building `X_pred` by scaling the `recent` lag array. The modified `lag_1` and `lag_4` values reflect the what-if scenario parameters.

**Limitation:** Like forecasting, the `X_pred` is a local variable. It must be captured and returned for SHAP analysis. A SHAP call here would show how "price change" → modified `lag_1/lag_4` → output shift, which is the key explainability value for scenarios.

**Required change:**
The `_run_baseline()` and `_run_modified()` helpers should optionally accumulate feature rows into a matrix. `ScenarioEngine.run()` must return `baseline_features: list[dict]` and `simulated_features: list[dict]` in its result dict.

---

### REQ-9 — Anomaly Engine Can Access Underlying Forecast Inputs

**Verdict: ❌ FAIL**

**Evidence:**
`anomaly_service.py:284–294` (`_load_forecast_data`):
```python
stmt = (
    select(Forecast)
    .where(Forecast.organization_id == self.org_id)
    .where(Forecast.actual_demand.isnot(None))
    .order_by(Forecast.forecast_date.asc())
)
```

The anomaly engine loads **raw demand values** from the Forecast table and runs a pure rolling z-score algorithm. It does **not** load or interact with the trained model at any point.

When a DEMAND_SPIKE anomaly is detected at date `2024-03-15`, there is no way to ask "which model features drove the predicted value that this actual deviated from?" because:
1. The anomaly service never loads the pkl artifact
2. The anomaly service never constructs the model's feature vector for that date
3. The `Anomaly` DB row stores only: `z_score`, `deviation_pct`, `expected_value` (rolling mean), `actual_value`

**Required changes:**
For SHAP-annotated anomalies, the anomaly service must:
1. Load the active model artifact
2. Reconstruct the feature vector for each anomalous date
3. Run `shap.TreeExplainer(model).shap_values(X_anomaly)` and store the result
4. Persist SHAP values into a new `Anomaly.shap_values` JSONB column

---

### REQ-10 — Current Architecture Supports SHAP TreeExplainer

**Verdict: ❌ FAIL**

**Evidence:**
```
shap_installed: False
model_class: HistGradientBoostingRegressor
```

**Assessment by sub-requirement:**

| Sub-check | Result |
|---|---|
| `shap` package installed in Docker image | ❌ Missing from `requirements.txt` |
| `shap.TreeExplainer` compatible with `HistGradientBoostingRegressor` | ✅ Compatible (shap ≥ 0.41) |
| `shap.TreeExplainer` compatible with true XGBoost | ✅ Natively supported |
| Feature matrix (5 features) is small enough for SHAP to be fast | ✅ <10ms per row |
| Background dataset for SHAP available (historical data) | ✅ 106 rows in pkl state |
| Model supports `predict()` on individual rows | ✅ Confirmed |
| DB schema has JSONB columns for SHAP storage | ❌ Missing |
| API endpoints for SHAP values | ❌ Missing |
| Frontend SHAP visualization components | ❌ Missing |

---

## Summary Table

| Req | Requirement | Verdict | Blocker |
|---|---|---|---|
| 1 | Active artifacts on disk | ⚠️ PARTIAL | Active DB record points to synthetic v2.0, not uploaded model |
| 2 | ModelVersion path references correct | ⚠️ PARTIAL | `feature_schema`, `hyperparameters`, `dataset_hash` all NULL |
| 3 | Model can be deserialized | ⚠️ PARTIAL | Model is `HistGradientBoostingRegressor`, not XGBoost; `shap` not installed |
| 4 | Feature names preserved | ✅ PASS | Implicit only; no explicit feature name list in pkl state |
| 5 | Feature engineering metadata | ❌ FAIL | No FE config persisted anywhere |
| 6 | Historical feature vectors reconstructible | ⚠️ PARTIAL | Derivable from time series but not stored per-row |
| 7 | Forecast generation has feature access | ✅ PASS | `X_pred` built per step; not currently returned |
| 8 | Scenario engine exposes modified vectors | ✅ PASS | Both baseline + modified `X_pred` available; not currently returned |
| 9 | Anomaly engine accesses forecast inputs | ❌ FAIL | Anomaly service never loads model or builds feature vectors |
| 10 | Architecture supports SHAP TreeExplainer | ❌ FAIL | `shap` not installed; no DB columns or API endpoints for SHAP |

---

## A — Readiness Score

**41 / 100**

| Category | Score | Weight | Contribution |
|---|---|---|---|
| Artifact infrastructure | 70% | 20% | 14 |
| Model correctness & compatibility | 55% | 20% | 11 |
| Feature metadata | 25% | 20% | 5 |
| Engine access to feature vectors | 65% | 20% | 13 |
| SHAP-specific infrastructure | 0% | 20% | 0 |
| **Total** | | | **41/100** |

The platform is structurally sound — artifacts exist, models deserialise, feature vectors are constructible — but SHAP itself is not installed and there are no persistence columns, API endpoints, or frontend components for it.

---

## B — Estimated Implementation Effort

### B1 — Forecast Explainability

**Effort: ~3 days (backend) + 2 days (frontend)**

Steps:
1. Add `shap` to `requirements.txt` and rebuild image (0.5d)
2. Add `feature_names` and `feature_engineering_config` to pkl state and `ModelVersion.feature_schema` (0.5d)
3. Add `return_features=True` param to `predict()` returning `(predictions, feature_matrix)` (0.5d)
4. Create `ShapExplainer` service: `explain_forecast(model, X_matrix) → shap_values[]` (0.5d)
5. New API endpoint `GET /api/v1/forecast/explain?weeks=N` (0.5d)
6. Frontend: waterfall chart or force plot per week (React, Recharts/D3) (2d)

### B2 — Scenario Explainability

**Effort: ~2 days (backend) + 2 days (frontend)**

Steps:
1. Capture and return `baseline_features` and `simulated_features` from `ScenarioEngine.run()` (0.5d)
2. Run SHAP on both matrices, return delta SHAP values (simulated − baseline) per feature (0.5d)
3. New API endpoint `GET /api/v1/scenarios/{id}/explain` (0.5d)
4. Frontend: delta-SHAP bar chart comparing baseline vs scenario per feature (2d)

This is the highest-value use case: showing that "price +10%" → `lag_1` suppression → -6% demand is far more actionable than raw delta numbers.

### B3 — Anomaly Explainability

**Effort: ~4 days (backend) + 2 days (frontend)**

Steps:
1. Load active pkl in `AnomalyService` (0.5d)
2. Reconstruct feature vector for each anomalous date (1d — includes lag reconstruction, edge case handling)
3. Run `TreeExplainer(model).shap_values(X_anomaly)` and store per-anomaly SHAP dict (0.5d)
4. Add `shap_values` JSONB column to `anomalies` table, Alembic migration (0.5d)
5. Store during `detect()` pipeline, expose via existing `GET /api/v1/anomalies/{id}` (0.5d)
6. Frontend: anomaly drawer SHAP bar chart (2d)

Anomaly explainability is the hardest because feature reconstruction at arbitrary historical dates requires careful lag-window boundary handling.

---

## C — Recommended Architecture

### C1 — Backend Services

```
app/
  services/
    shap_service.py          # New: ShapExplainer class
      - build_explainer(model, background_X) → TreeExplainer
      - explain(explainer, X) → shap_values dict
      - explain_delta(explainer, X_base, X_sim) → delta_shap dict
      - format_for_api(shap_values, feature_names) → list[FeatureContribution]

  ml/
    feature_reconstruction.py  # New: reconstruct X from Forecast rows
      - get_feature_vector(forecast_rows, target_date) → pd.DataFrame
      - get_feature_matrix(forecast_rows, start, end) → pd.DataFrame
```

`ShapService` is stateless, receives a loaded model + background dataset, and returns structured output. It must be lazily instantiated to avoid startup cost.

### C2 — Persistence Layer

**New Alembic migrations:**

```sql
-- 1. Feature vector column on Forecast
ALTER TABLE forecasts ADD COLUMN feature_vector JSONB;
-- Populated on each inference call

-- 2. SHAP values on Anomaly  
ALTER TABLE anomalies ADD COLUMN shap_values JSONB;
ALTER TABLE anomalies ADD COLUMN shap_baseline FLOAT;
-- shap_values: {"week": 120.3, "month": -45.1, "lag_1": 8901.2, ...}

-- 3. Feature schema on ModelVersion (already exists as column, just needs population)
-- ModelVersion.feature_schema already defined, just populate it
```

**New Table (optional, for caching):**

```sql
CREATE TABLE forecast_explanations (
  id            SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id),
  model_version_id INT REFERENCES model_versions(id),
  forecast_date DATE,
  product_id    INT REFERENCES products(id),
  shap_values   JSONB,   -- {"week": f, "month": f, "year": f, "lag_1": f, "lag_4": f}
  base_value    FLOAT,   -- shap expected value
  predicted     FLOAT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### C3 — API Endpoints

```
GET  /api/v1/forecast/explain
     ?weeks=12
     → {explainer_ready, feature_names, weeks: [{week, date, predicted, shap_values, base_value}]}

GET  /api/v1/scenarios/{id}/explain
     → {baseline_shap: [...], simulated_shap: [...], delta_shap: [...], top_drivers: [...]}

GET  /api/v1/anomalies/{id}/explain
     → {shap_values, base_value, feature_vector, anomaly_type, z_score}

GET  /api/v1/forecast/feature-importance
     → {features: [{name, importance, shap_mean_abs}]}  ← already partial (correlation-based)
```

### C4 — Frontend Visualizations

**Forecast Page — per-week waterfall:**
```
"Why does Week 6 predict 38,400 units?"
Base value:          22,100
+ lag_1 (↑):        +9,800
+ lag_4 (↑):        +4,200
+ month (Dec):      +2,100
+ week (52):         +600
- year (2024):       -400
= Prediction:       38,400
```
Component: horizontal waterfall bar chart (Recharts or D3), one per selected week.

**Scenario Page — delta-SHAP comparison:**
```
"What changed vs baseline?"
lag_1:  +1,200  (demand multiplier raised lags)
lag_4:  +800
month:  0
week:   0
year:   0
→ Net revenue impact: +$127,400
```
Component: side-by-side bar chart, baseline vs simulated SHAP contributions.

**Anomaly Drawer — anomaly driver spotlight:**
```
"Why is 2024-03-15 a DEMAND_SPIKE?"
lag_1:  +12,300 (highest contributor — recent demand was elevated)
month:  +1,100  (March seasonal uplift)
week:   +200
year:   -50
Expected: 18,200 → Actual: 34,800 (z=4.1, CRITICAL)
```
Component: horizontal bar chart in the existing Investigation Drawer.

---

## D — Phase 5 SHAP Implementation Roadmap

### Phase 5A — Foundation (3 days, no user-facing changes)

| Task | File(s) | Days |
|---|---|---|
| Add `shap>=0.44` to `requirements.txt`, rebuild image | `requirements.txt`, `Dockerfile` | 0.5 |
| Fix model class name and DB `model_type` field | `ml_service.py`, `retraining_tasks.py`, `forecast.py` | 0.5 |
| Persist `feature_schema` and `hyperparameters` in ModelVersion on training | `retraining_tasks.py`, `forecast.py::reset_model` | 0.5 |
| Create `feature_reconstruction.py` with lag-safe feature builder | `app/ml/feature_reconstruction.py` | 0.5 |
| Create `shap_service.py` with `ShapExplainer` class | `app/services/shap_service.py` | 1.0 |

### Phase 5B — Forecast Explainability (2 days)

| Task | File(s) | Days |
|---|---|---|
| Add `return_features` param to `XGBoostForecastModel.predict()` | `ml_service.py` | 0.5 |
| New endpoint `GET /api/v1/forecast/explain` | `forecast.py` | 0.5 |
| Frontend: ForecastPage waterfall chart per week | `ForecastPage.tsx` | 1.0 |

### Phase 5C — Scenario Explainability (2 days)

| Task | File(s) | Days |
|---|---|---|
| Capture and return feature matrices from `ScenarioEngine.run()` | `scenario_engine.py` | 0.5 |
| New endpoint `GET /api/v1/scenarios/{id}/explain` | `scenarios.py` | 0.5 |
| Frontend: ScenarioPage delta-SHAP bar chart | `ScenarioPage.tsx` | 1.0 |

### Phase 5D — Anomaly Explainability (3 days)

| Task | File(s) | Days |
|---|---|---|
| Alembic migration: `anomalies.shap_values` JSONB column | new migration | 0.5 |
| Load model artifact in `AnomalyService.detect()` | `anomaly_service.py` | 0.5 |
| Reconstruct feature vectors for anomalous dates using `feature_reconstruction.py` | `anomaly_service.py` | 1.0 |
| Run SHAP per anomaly, persist to `shap_values` column | `anomaly_service.py` | 0.5 |
| Frontend: Investigation Drawer SHAP bar chart | `AnomalyDrawer.tsx` | 1.0 |

### Phase 5E — Polish and Caching (1 day)

| Task | Notes |
|---|---|
| Add `Forecast.feature_vector` JSONB column + backfill script | Prevents re-derivation cost on every explain call |
| Redis cache for explain endpoints (60s TTL) | Same pattern as dashboard cache |
| API documentation for SHAP endpoints | OpenAPI descriptions |

---

## Top Pre-Conditions Before Starting Phase 5

> [!IMPORTANT]
> These **must** be resolved before writing any SHAP code.

1. **Install `shap`** — not present in current Docker image. Without it, nothing works.
2. **Fix the active ModelVersion divergence** — after an upload+retrain, the `is_active=True` record must point to the uploaded model, not the synthetic `v2.0`. Verify `retrain_model_async` deactivation works correctly end-to-end.
3. **Correct `model_type` field** — DB says `"XGBRegressor"`, reality is `"HistGradientBoostingRegressor"`. SHAP and any audit tooling will be confused by this mismatch.
4. **Populate `feature_schema`** — even just `{"feature_names": ["week","month","year","lag_1","lag_4"]}`. This is the minimum metadata needed for a SHAP explainer to label outputs correctly.

> [!NOTE]
> `shap.TreeExplainer` **is compatible** with `HistGradientBoostingRegressor` in shap ≥ 0.41. Switching to real XGBoost is desirable but not required for SHAP to work.

> [!TIP]
> Total estimated effort: **~11 backend-days + ~6 frontend-days = ~3 developer-weeks** for full Forecast + Scenario + Anomaly explainability coverage. Phase 5A foundation work is a hard dependency for all three streams.



# Phase 4 Stabilization Report
**Project Titan — Enterprise Supply Chain AI**
**Audit Date:** 2026-06-07
**Auditor:** Antigravity AI
**Scope:** All six production modules — code-level audit, no modifications made.

---

## System Infrastructure Status

| Component | Status | Notes |
|---|---|---|
| PostgreSQL | ✅ Healthy | `(healthy)` per docker ps |
| Redis | ✅ Healthy | Connected, used for cache + Celery broker |
| Backend (FastAPI) | ✅ Running | Uvicorn on :8000 (internal), :8001 (host) |
| Celery Worker | ✅ Running | 2 concurrency workers |
| Celery Beat | ✅ Running | Nightly anomaly scans scheduled |
| Frontend (Nginx) | ✅ Running | Vite build served on :80 (internal) |
| Nginx Proxy | ⚠️ Fragile | **Active Bug:** IP cache invalidates on backend restart → 502 on all `/api/` routes |

> [!CAUTION]
> The nginx 502 regression **is a recurring infrastructure bug.** Every `docker restart df-backend` will trigger it again. It requires `docker restart df-nginx df-frontend` to clear the stale upstream IP. This must be addressed before any production deployment.

---

## Module 1 — Forecasting

**File:** [`forecast.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/forecast.py) · [`ml_service.py`](file:///d:/pROJECT%20tITAN/backend/app/services/ml_service.py) · [`ForecastPage.tsx`](file:///d:/pROJECT%20tITAN/frontend/src/pages/ForecastPage.tsx)

### 1. Production Readiness Score
**62 / 100**

### 2. Known Bugs

- **Global singleton model state** (`forecast_model` in `ml_service.py` L15): The `XGBoostForecastModel` instance is a module-level singleton. Under concurrent requests, two users in the same worker process can race to call `.train()` or `.predict()` simultaneously, resulting in corrupted `last_date`, `historical_data`, and metric state. This is a data-corruption race condition in production multi-user scenarios.
- **`/forecast` reloads model from disk on every request** (`forecast.py` L38): `forecast_model.load(active_model.model_path)` is called on every single `GET /api/v1/forecast` request, even if the model is already loaded in memory. This adds unnecessary latency (~50–200ms I/O per request).
- **Category forecast endpoint is a stub** (`forecast.py` L96): `get_category_forecasts` returns `predicted_demand = int(cat["total_sales"] * 1.1)` and `change_pct = 10.0` — both are hardcoded placeholders. The endpoint is live and the UI consumes it but the data is completely synthetic.
- **`accuracy = 0` for newly uploaded datasets**: When the uploaded dataset produces a flat series (zero variance in validation split), the `mean_demand` denominator can approach zero, yielding `accuracy = 0` even when RMSE is low. The formula `max(0, 100 * (1 - mae/mean_demand))` has no guard for near-zero mean.
- **Model class is `HistGradientBoostingRegressor`, not XGBoost** (`ml_service.py` L17): The class is named `XGBoostForecastModel` and all UI labels say "XGBoost", but the actual `sklearn` model used is `HistGradientBoostingRegressor`. This is a branding mismatch and misleads users about the algorithm.
- **`/forecast/reset` runs synchronously** (`forecast.py` L206): The reset endpoint trains a full model in the request-response cycle (no Celery), which will block the event loop for several seconds under uvicorn's async executor.

### 3. Technical Debt

- No per-product ML model. All products share one org-level time-series model. Product-level forecasts (`/forecast/product/{id}`) simply return the last N rows of the `forecasts` table for that product, not real inference.
- Convergence curve (`ml_service.py` L150) is **fake** — it is a generated logarithmic decay animation, not actual training epoch data (HistGradientBoosting does not expose per-iteration metrics without custom callbacks).
- Feature importance (`ml_service.py` L139) uses absolute correlation, not SHAP or the model's built-in `feature_importances_`. This is an approximation that can be significantly wrong.
- No model versioning guard on predict: if a new model is trained between a user's page load and their data request, the in-memory singleton may serve stale predictions that don't match the DB `model_version` being displayed.
- `print()` statements throughout `ml_service.py` (L76, L79, L83, etc.) — raw stdout pollution in production logs.

### 4. Missing Enterprise Features

- No per-product or per-category ML model (individual SKU-level forecasting)
- No model comparison / A-B testing between versions
- No forecast override / manual adjustment workflow
- No MAPE or WAPE metric (only MAE and RMSE are computed)
- No prediction interval calibration (confidence bands are `1.96 * std_dev`, not empirically calibrated)
- No data drift detection to alert when uploaded data diverges from training distribution
- No scheduled retraining trigger (only manual upload or reset)

### 5. Recommended Next Phase

**Phase 5A — Forecast Hardening:**
1. Replace global singleton with a per-request model loader backed by a process-level LRU cache keyed by `(org_id, model_version_id)`.
2. Move category forecasts to real per-category grouped time-series inference.
3. Add `MAPE` metric and fix the accuracy formula for low-mean datasets.
4. Remove all `print()` statements; use the structured logger.
5. Make `/forecast/reset` async via Celery.

---

## Module 2 — Dashboard

**File:** [`dashboard.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/dashboard.py) · `DashboardPage.tsx`

### 1. Production Readiness Score
**74 / 100**

### 2. Known Bugs

- **`actual_vs_predicted` chart is always empty** (`dashboard.py` L200): `actual_vs_predicted=[]` is hardcoded. The comment says "Populated when forecasts exist" but there is no code path that ever populates it. The UI chart for actual vs. predicted is therefore permanently empty for all users.
- **Demand trend uses current calendar time, not dataset time** (`dashboard.py` L115): `today = datetime.now(timezone.utc)` is used to compute the 12-week demand trend window. If a user uploads a historical CSV from 2023, the dashboard trend chart will always show zeros because all the data falls outside the `[today - 12 weeks, today]` window.
- **Revenue trend has the same calendar-anchor bug** (`dashboard.py` L133): Same issue as demand trend — monthly revenue aggregation anchors to the current date, not the dataset's date range.
- **60-second Redis cache does not invalidate on upload** (`dashboard.py` L94, L207): After a user uploads a new CSV and retrains, the dashboard KPIs and charts can remain stale for up to 60 seconds. There is no cache invalidation hook in the upload/retrain pipeline.

### 3. Technical Debt

- No pagination for top products query (hard-capped at 5 with `.limit(5)`).
- `reorder_value` in the reorder recommendations uses a hardcoded `$25` unit price (`inventory.py` L65: `total_value = sum(... * 25 ...)`) — not linked to actual product pricing.
- Dashboard KPIs have no loading skeleton state that reconciles with the anomaly module — `active_alerts` comes from `InventoryAlert`, not the `Anomaly` table, creating two separate alert systems that can show different counts.
- No time range selector — the dashboard always shows the last 12 weeks / 6 months relative to today.

### 4. Missing Enterprise Features

- No time range selector / date picker for historical views
- No drill-down from KPI card to underlying data table
- No revenue forecast overlay (actual vs. ML-predicted revenue)
- No cohort or segment analysis
- No executive PDF export for the dashboard view
- No real-time WebSocket push for KPI updates (WebSocket exists but dashboard does not subscribe)

### 5. Recommended Next Phase

**Phase 5B — Dashboard Intelligence:**
1. Fix `actual_vs_predicted` to pull from the `forecasts` table where both `predicted_demand` and `actual_demand` are set.
2. Anchor demand/revenue trend windows to the dataset's actual date range (`MAX(sale.date)` as the anchor), not `datetime.now()`.
3. Invalidate the Redis dashboard cache on `model.retrained` domain event.

---

## Module 3 — Inventory

**File:** [`inventory.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/inventory.py) · [`inventory_repo.py`](file:///d:/pROJECT%20tITAN/backend/app/repositories/inventory_repo.py)

### 1. Production Readiness Score
**68 / 100**

### 2. Known Bugs

- **Reorder value is hardcoded at $25/unit** (`inventory.py` L65): `total_order_value = sum(item.get("recommended_qty", 0) * 25 for item in items)`. The actual product price from the `products` table is never used. This can produce wildly inaccurate order value estimates for any dataset where unit prices differ from $25.
- **`count()` in `GET /inventory` counts all org items regardless of filters** (`inventory.py` L30): `total = await repo.count()` returns the total unfiltered count, while `items` is filtered by `status` and `category`. The pagination total will be wrong when filters are active.
- **Inventory data does not update after CSV upload**: The `Inventory` table is seeded once during the initial data load. When a user uploads a new CSV that does not contain inventory columns, inventory data remains from the previous dataset. No staleness indicator is shown in the UI.
- **`health_score` is read but never recalculated** (`inventory_repo.py` L42): Inventory items are sorted by `health_score`, but this field is only set at seeding time. If `current_stock` changes via `PATCH /inventory/{id}`, the `health_score` is not recomputed and remains stale.

### 3. Technical Debt

- No bulk update endpoint — inventory can only be updated one item at a time.
- No `EOQ` (Economic Order Quantity) calculation — `recommended_qty` is simply `reorder_point - current_stock + safety_stock`, ignoring ordering costs and carrying costs.
- No supplier lead time variability model — lead time is stored as a fixed integer (`lead_time_days`), no variance or distribution.
- The `PATCH /inventory/{id}` endpoint accepts query parameters, not a JSON body — this is non-standard REST design.
- No inventory movement history / audit log.

### 4. Missing Enterprise Features

- No SKU-level demand vs. stock-on-hand overlay chart
- No ABC/XYZ inventory classification
- No supplier management (create PO, track delivery)
- No warehouse location / bin mapping
- No multi-warehouse or multi-location support
- No cycle count / physical inventory workflow
- No inventory aging / expiry tracking

### 5. Recommended Next Phase

**Phase 5C — Inventory Optimization Engine:**
1. Fix `count()` to respect active filters.
2. Recalculate `health_score` on every stock update in `PATCH /inventory/{id}`.
3. Replace the $25 hardcoded value with `Product.price` join in reorder recommendations.
4. Implement EOQ formula: `sqrt(2 * demand * ordering_cost / carrying_cost)`.

---

## Module 4 — Alerts

**File:** [`alerts.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/alerts.py) · [`alert_repo.py`](file:///d:/pROJECT%20tITAN/backend/app/repositories/alert_repo.py)

### 1. Production Readiness Score
**45 / 100**

### 2. Known Bugs

- **Email alert is not tenant-scoped** (`alerts.py` L22): `POST /api/alerts/send-email` has no `get_tenant_context` dependency. Any authenticated (or unauthenticated — the route is under `/api/alerts` not `/api/v1/alerts`) user can trigger an email alert with arbitrary SKU, message, and date strings.
- **Route prefix is inconsistent** (`alerts.py` L13): All other routers use `/api/v1/...` prefix. The alerts router uses `/api/alerts` (no `v1`). This is an API versioning inconsistency and means the alerts module is not protected by the same CORS/auth middleware grouping.
- **`DELETE /alerts/{id}` performs a hard delete**: The `alert_repo.delete()` call is a physical row deletion, not a soft-delete. No audit trail is preserved.
- **`GET /alerts` (resolved=True path) does not use the serializer** (`alerts.py` L48): When `resolved=True`, it calls `_serialize_alert(a)`. But when `resolved=False` (the default), `get_active_alerts()` in the repo returns raw dicts already. The two code paths return slightly different schemas (the resolved path includes extra fields from `_serialize_alert` that the active path doesn't).
- **Alert generation is entirely passive** — the `InventoryAlert` table is only ever populated by the seeder. There is no automated trigger that creates new alerts when stock drops below reorder point for newly uploaded data.

### 3. Technical Debt

- Two completely separate alert systems exist and are never reconciled: `InventoryAlert` (this module) and `Anomaly` (anomaly module). The dashboard mixes counts from both without clarity to the user.
- `send_alert_email` in `utils/email.py` has no retry, no rate limiting, and no SMTP error handling at the task level.
- No webhook delivery for alerts (Slack, Teams, PagerDuty).
- `GET /alerts/stats` does not cache, resulting in a database count query on every request.
- Alert threshold configuration is hardcoded (there is no user-configurable alert rules engine).

### 4. Missing Enterprise Features

- No alert rule engine (user-defined thresholds → trigger alert)
- No alert escalation workflow (Level 1 → Level 2 → Manager)
- No alert deduplication (same condition can generate multiple alerts)
- No alert snooze / acknowledgement workflow
- No webhook / Slack / Teams integration
- No SLA tracking (mean time to resolve)
- No alert audit log

### 5. Recommended Next Phase

**Phase 5D — Alert Engine Rebuild:**
1. Move alerts to `/api/v1/alerts` to align with the rest of the API.
2. Add `get_tenant_context` dependency to all alert routes, including send-email.
3. Implement an automated alert trigger that fires when inventory drops below reorder point after a data upload.
4. Unify the `InventoryAlert` and `Anomaly` concepts under a single notification feed.

---

## Module 5 — Scenario Engine

**File:** [`scenarios.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/scenarios.py) · [`scenario_service.py`](file:///d:/pROJECT%20tITAN/backend/app/services/scenario_service.py) · [`scenario_engine.py`](file:///d:/pROJECT%20tITAN/backend/app/ml/scenario_engine.py)

### 1. Production Readiness Score
**71 / 100**

### 2. Known Bugs

- **Simulation runs synchronously in the request cycle** (`scenario_service.py` L284): `result = await svc.run(scenario_id)` executes the full ML inference pipeline inside the HTTP request. For 52-week horizons, this blocks the FastAPI worker. The comment in `scenarios.py` L186 acknowledges "Phase 3B: will dispatch to Celery" — this is unfinished.
- **Elasticity constants are hardcoded universally** (`scenario_engine.py` L45): `MARKETING_ELASTICITY = 0.3` and `PRICE_ELASTICITY = -0.6` apply to all products, all categories, all datasets. These values were chosen as generic approximations and are not derived from the uploaded data. A user uploading a luxury goods dataset will get the same elasticity as one uploading a FMCG dataset.
- **Lead time impact is not modeled in demand**, only in confidence intervals (`scenario_engine.py` L161): `lead_time_adjustment` widens the confidence interval band (`lt_ci_factor`) but does **not** change the predicted demand value. In reality, longer lead times should increase safety stock consumption and can affect fill rates, which indirectly affects demand. The model is partially hollow for this parameter.
- **`avg_unit_value` defaults to $50 with no data-derived fallback** (`ScenarioBuilder.tsx` L73, L88): If a user runs a scenario without opening "Advanced Options," revenue impact is always calculated at $50/unit regardless of the actual product prices in the database.
- **Scenario version system does not prevent running a RUNNING scenario**: If two concurrent requests call `POST /scenarios/{id}/run` for the same scenario simultaneously, both will set status to `RUNNING` and create two result records with the same version number, violating the uniqueness intent of the versioning system.

### 3. Technical Debt

- No `PATCH /scenarios/{id}` call from the UI — the update endpoint exists in the backend but is not wired to the frontend. Parameters can only be set at creation time.
- Scenario results `detail` JSON blob can grow to several MB for 52-week horizons with many weekly data points. There is no compression or lazy-loading.
- `ScenarioHistory` on the left panel loads up to 50 scenarios on mount, all with full result data eager-loaded. No virtualization or pagination.
- The `product_ids` field on `Scenario` is stored but never used in the simulation — scenarios always run on org-level data regardless of which products are targeted.

### 4. Missing Enterprise Features

- No async simulation dispatch (Celery) — explicitly noted as "Phase 3C" and never implemented
- No product-scoped scenario (simulation targeted at a specific SKU)
- No scenario comparison side-by-side view
- No scenario export to PDF/Excel
- No elasticity calibration from historical price-demand data
- No Monte Carlo / probabilistic simulation mode
- No scenario sharing / collaboration between users

### 5. Recommended Next Phase

**Phase 5E — Scenario Engine Async + Data-Driven Elasticity:**
1. Dispatch simulation to Celery, returning a `task_id` immediately and polling for completion.
2. Derive `avg_unit_value` from the actual `Product.price` for the targeted product(s) rather than defaulting to $50.
3. Add optimistic locking on `run` to prevent duplicate concurrent simulations.
4. Wire `product_ids` through the simulation to enable per-SKU what-if analysis.

---

## Module 6 — Anomaly Intelligence

**File:** [`anomalies.py`](file:///d:/pROJECT%20tITAN/backend/app/routers/anomalies.py) · [`anomaly_service.py`](file:///d:/pROJECT%20tITAN/backend/app/services/anomaly_service.py) · `AnomaliesPage.tsx`

### 1. Production Readiness Score
**66 / 100**

### 2. Known Bugs

- **Comprehensive sweep can cause O(N²) database load**: `_load_forecast_data()` (`anomaly_service.py` L284) loads the **entire** `forecasts` table with no limit. For a large dataset (e.g., 104 weeks × 50 products = 5,200 rows), and with 8 sweep windows (L193), this query runs 8 times per sweep call — loading up to 41,600 rows per scan and running rolling detection on each. Under concurrent users this will saturate DB connection pool.
- **`_detect_inventory_shock` uses `updated_at` as the time axis** (`anomaly_service.py` L372): Inventory items have a single `updated_at` timestamp that is updated on any field change, not just stock level changes. Two inventory updates on the same day for different reasons will produce a time series with repeated dates, corrupting the rolling z-score calculation.
- **Confidence score is a lookup table, not a statistical computation** (`anomaly_service.py` L654): The `confidence_score` is derived from z-score thresholds (`if abs_z >= 5: return 98.0`) — a hand-crafted mapping. It is not a true detection confidence percentage (e.g., from a calibrated classifier).
- **Stockout and forecast confidence impact in `get_context` are synthetic** (`anomaly_service.py` L708–L718): `stockout_risk_pct = min(95.0, deviation * 200)` and `forecast_confidence_impact = min(40.0, deviation * 80)` are linear formulas with arbitrary constants. They are not derived from inventory data, safety stock levels, or actual forecast calibration.
- **`is_anomaly` flag in context series is string equality only** (`anomaly_service.py` L625): `is_anomaly=(d == anomaly_date_str)`. If `anomaly.event_date` was stored with a time component (e.g., `"2025-03-14T00:00:00"`) and `d` is `"2025-03-14"`, the comparison fails silently and no point is flagged.

### 3. Technical Debt

- No rate limiting or debounce on the `POST /anomalies/detect` endpoint — a user can fire Comprehensive Sweep repeatedly in quick succession, each call deleting all unresolved anomalies and re-running detection (destructive operation with no idempotency guard).
- Anomaly scan deletes all unresolved anomalies before re-running (`anomaly_service.py` L184): `DELETE FROM anomalies WHERE is_resolved=False`. If detection fails mid-run (e.g., DB error), all previously detected anomalies are lost with no rollback.
- The `detected_at` timestamp on every anomaly is always set to `datetime.now(timezone.utc)` at scan time (`anomaly_service.py` L143), not the time the anomalous event occurred. This makes the `detected_at` field meaningless for historical datasets.
- WebSocket `anomaly.detected` event publishes only a summary count, not the actual anomaly IDs — the frontend cannot reactively update the anomaly table without a full re-fetch.
- SHAP explainability — noted as planned in Phase 4B.5 spec — is not implemented anywhere.

### 4. Missing Enterprise Features

- No SHAP-based explainability per anomaly (planned but absent)
- No anomaly pattern recognition (e.g., clustering similar anomalies)
- No anomaly suppression / whitelist (e.g., ignore anomalies during known promotional periods)
- No user-assignable investigation workflow (assign anomaly to analyst)
- No root cause hypothesis engine
- No anomaly-to-alert escalation pipeline (anomaly detected → auto-create InventoryAlert)
- No natural language description export ("In Week 14, demand for SKU-007 spiked 340% above baseline...")
- Copilot AI assistant — mentioned in UI but not backed by any endpoint

### 5. Recommended Next Phase

**Phase 5F — Anomaly Intelligence Hardening:**
1. Add idempotency: wrap detection in a DB transaction so deletion and re-insertion are atomic; roll back on failure.
2. Add concurrency guard on `POST /detect` (Redis lock per org_id with TTL).
3. Replace the synthetic stockout/confidence formulas with real inventory-level computation.
4. Fix `is_anomaly` string comparison to use date-normalized comparison.
5. Implement SHAP explainability for the investigation drawer.

---

## Summary Scorecard

| Module | Score | Primary Blocker |
|---|---|---|
| Forecasting | 62/100 | Global singleton race condition; category forecasts are stubs |
| Dashboard | 74/100 | Date anchor bug → charts show zeros on historical datasets |
| Inventory | 68/100 | Health score never recalculated; $25 hardcoded unit price |
| Alerts | 45/100 | No tenant scope on email; two disconnected alert systems; no auto-generation |
| Scenario Engine | 71/100 | Sync simulation blocks event loop; hardcoded universal elasticity |
| Anomaly Intelligence | 66/100 | Destructive scan with no rollback; O(N²) DB load; synthetic metrics |
| **System Infra** | **—** | **nginx 502 on every backend restart (recurring)** |

## Priority Order for Phase 5

1. **[CRITICAL — Infrastructure]** Fix nginx upstream DNS caching (use `resolver` + `valid=` TTL directive in nginx.conf, or replace with `docker restart` hook).
2. **[HIGH — Alerts]** Rebuild alerts under `/api/v1/`, add tenant scope, and implement automated alert generation on inventory thresholds.
3. **[HIGH — Anomaly]** Add atomic scan transaction, Redis concurrency lock, and fix `is_anomaly` flag comparison.
4. **[HIGH — Forecasting]** Replace global singleton with LRU cache; fix category forecast stubs; fix `accuracy=0` edge case.
5. **[MEDIUM — Dashboard]** Anchor chart date windows to dataset date range, not `datetime.now()`.
6. **[MEDIUM — Inventory]** Fix filtered `count()`, health score recalculation, and reorder value using real product price.
7. **[MEDIUM — Scenario]** Dispatch to Celery; derive `avg_unit_value` from DB; add optimistic locking.




import asyncio, json, os, pickle, sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.config import settings
from app.models import ModelVersion, Forecast

async def verify():
    r = {}

    # ── T4: shap installed and TreeExplainer works ──────────────────
    try:
        import shap
        r["T4_shap_installed"] = {"version": shap.__version__, "pass": True}
        ml_path = settings.ML_MODEL_PATH
        pkl_files = sorted([f for f in os.listdir(ml_path) if f.endswith(".pkl")])
        if pkl_files:
            fp = os.path.join(ml_path, "model_org_1_v2.0.pkl")
            if not os.path.exists(fp):
                fp = os.path.join(ml_path, pkl_files[0])
            with open(fp, "rb") as f:
                state = pickle.load(f)
            model = state["model"]
            import numpy as np
            import pandas as pd
            background = pd.DataFrame({
                "week": [1,26,52], "month": [1,6,12], "year": [2024,2024,2024],
                "lag_1": [1000.0,2000.0,1500.0], "lag_4": [900.0,1800.0,1400.0]
            })
            X_explain = pd.DataFrame({
                "week": [15], "month": [4], "year": [2025],
                "lag_1": [35000.0], "lag_4": [29000.0]
            })
            try:
                explainer = shap.TreeExplainer(model, background)
                sv = explainer.shap_values(X_explain)
                r["T4_tree_explainer"] = {
                    "model_class": type(model).__name__,
                    "shap_values": sv.tolist() if hasattr(sv, "tolist") else str(sv),
                    "pass": True
                }
            except Exception as e:
                r["T4_tree_explainer"] = {"pass": False, "error": str(e)}
        else:
            r["T4_tree_explainer"] = {"pass": False, "error": "No pkl files found"}
    except ImportError as e:
        r["T4_shap_installed"] = {"pass": False, "error": str(e)}

    # ── T2: model_type constant exposed ──────────────────────────────
    try:
        from app.services.ml_service import MODEL_TYPE, FEATURE_NAMES, LAG_WINDOWS
        r["T2_model_type_constant"] = {
            "MODEL_TYPE": MODEL_TYPE,
            "FEATURE_NAMES": FEATURE_NAMES,
            "LAG_WINDOWS": LAG_WINDOWS,
            "pass": MODEL_TYPE == "HistGradientBoostingRegressor"
        }
    except Exception as e:
        r["T2_model_type_constant"] = {"pass": False, "error": str(e)}

    # ── T3: feature metadata generated on train ───────────────────────
    try:
        from app.services.ml_service import XGBoostForecastModel
        import pandas as pd, numpy as np
        from datetime import datetime, timedelta
        dates = pd.date_range(end=datetime.utcnow(), periods=20, freq="W")
        df = pd.DataFrame({"date": dates, "demand": np.random.rand(20)*1000+500})
        m = XGBoostForecastModel()
        m.train(df, source_name="test_verification")
        meta = m.metadata
        fs = meta.get("feature_schema", {})
        hp = meta.get("hyperparameters", {})
        dh = meta.get("dataset_hash", "")
        r["T3_feature_metadata"] = {
            "feature_schema_keys": list(fs.keys()),
            "feature_names": fs.get("feature_names"),
            "hyperparameters_model_type": hp.get("model_type"),
            "dataset_hash_len": len(dh),
            "pass": (
                fs.get("feature_names") == ["week","month","year","lag_1","lag_4"]
                and hp.get("model_type") == "HistGradientBoostingRegressor"
                and len(dh) == 64
            )
        }
        # Verify save() includes metadata in pkl
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as tf:
            tmp_path = tf.name
        m.save(tmp_path)
        with open(tmp_path, "rb") as f:
            saved = pickle.load(f)
        r["T3_pkl_has_metadata"] = {
            "has_model_type": "model_type" in saved,
            "has_metadata": "metadata" in saved,
            "saved_model_type": saved.get("model_type"),
            "saved_feature_names": saved.get("metadata",{}).get("feature_schema",{}).get("feature_names"),
            "pass": "metadata" in saved and saved.get("model_type") == "HistGradientBoostingRegressor"
        }
        os.unlink(tmp_path)
    except Exception as e:
        r["T3_feature_metadata"] = {"pass": False, "error": str(e)}

    # ── T5: feature reconstruction module works ───────────────────────
    try:
        from app.ml.feature_reconstruction import (
            reconstruct_from_demand_list, build_background_dataset,
            get_model_type_from_artifact, FEATURE_NAMES as FN
        )
        import numpy as np
        from datetime import datetime, timedelta
        base = datetime(2024, 1, 7)
        dates_list = [base + timedelta(weeks=i) for i in range(20)]
        demands_list = list(np.random.rand(20) * 1000 + 500)
        df_feat = reconstruct_from_demand_list(dates_list, demands_list)
        r["T5_feature_reconstruction"] = {
            "rows_out": len(df_feat),
            "columns": list(df_feat.columns),
            "expected_features": FN,
            "lag_4_lag1_check": df_feat[["lag_1","lag_4"]].notna().all().all(),
            "pass": list(df_feat.columns)[:5] == FN and len(df_feat) == 16
        }
        # Test model type reader
        ml_path = settings.ML_MODEL_PATH
        pkl_files = sorted([f for f in os.listdir(ml_path) if f.endswith(".pkl")])
        if pkl_files:
            fp = os.path.join(ml_path, pkl_files[0])
            mt = get_model_type_from_artifact(fp)
            r["T5_model_type_reader"] = {"artifact": pkl_files[0], "model_type": mt, "pass": mt != "unknown"}
    except Exception as e:
        r["T5_feature_reconstruction"] = {"pass": False, "error": str(e)}

    # ── T1: Active ModelVersion integrity ─────────────────────────────
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as db:
        row = await db.execute(
            select(ModelVersion).where(ModelVersion.is_active==True)
            .order_by(ModelVersion.created_at.desc()).limit(1)
        )
        mv = row.scalar_one_or_none()
        if mv:
            path_ok = os.path.exists(mv.model_path) if mv.model_path else False
            r["T1_active_model_integrity"] = {
                "id": mv.id,
                "version_tag": mv.version_tag,
                "model_type": mv.model_type,
                "path_exists": path_ok,
                "feature_schema": bool(mv.feature_schema),
                "hyperparameters": bool(mv.hyperparameters),
                "dataset_hash": bool(mv.dataset_hash),
                "pass": path_ok
            }
        else:
            r["T1_active_model_integrity"] = {"pass": False, "error": "No active model in DB"}

    # ── Core module smoke tests (forecast/scenario/anomaly) ───────────
    async with Session() as db:
        # Forecast
        fc = await db.execute(
            select(Forecast).where(Forecast.organization_id==1)
            .where(Forecast.actual_demand.isnot(None)).limit(5)
        )
        fc_rows = fc.scalars().all()
        r["SMOKE_forecast_data"] = {"rows": len(fc_rows), "pass": len(fc_rows) > 0}

    await engine.dispose()
    print(json.dumps(r, indent=2, default=str))

asyncio.run(verify())





# Phase 5B — Forecast Explainability Implementation Plan

## Files to create/modify

### Backend (3 files)

#### [NEW] `backend/app/services/shap_service.py`
- `ShapExplainer` class with lazy-initialized cached `TreeExplainer`
- `explain_week(model, historical_data, week_feature_vector) → ExplanationResult`
- `build_explanations(model, weeks_ahead) → list[WeekExplanation]`
- Background dataset built from `historical_data` list stored in the pkl
- Returns: `prediction`, `base_value`, `shap_values`, `feature_vector`, `top_drivers`

#### [MODIFY] `backend/app/routers/forecast.py`
- Add `GET /api/v1/forecast/explain?weeks=N` endpoint
- Loads active model artifact, calls ShapExplainer
- Returns structured JSON: list of week explanations

#### [MODIFY] `backend/app/services/api.ts` (frontend)
- Add `getExplain(weeks: number)` to `forecastApi`

---

### Frontend (2 files)

#### [NEW] `frontend/src/components/forecast/ForecastExplainPanel.tsx`
Standalone panel with:
- Week selector tabs (Week 1–12)
- Horizontal SHAP contribution bar chart (Recharts `BarChart` horizontal)
- Positive (green) / Negative (red/rose) color coding
- Top Drivers summary cards
- Prediction breakdown footer (base + contributions = prediction)
- Loading skeleton while fetching
- Error state with retry

#### [MODIFY] `frontend/src/pages/ForecastPage.tsx`
- Add `ForecastExplainPanel` below the main forecast chart
- Fetch `/forecast/explain?weeks=12` after forecast loads
- Pass explain data into panel

---

## API Contract

```
GET /api/v1/forecast/explain?weeks=12
Authorization: Bearer <token>

Response 200:
{
  "weeks": [
    {
      "week": 1,
      "date": "2025-01-12",
      "prediction": 38400.0,
      "base_value": 22100.0,
      "feature_vector": {
        "week": 2, "month": 1, "year": 2025, "lag_1": 35000.0, "lag_4": 29000.0
      },
      "shap_values": {
        "week": 600.0, "month": 2100.0, "year": -400.0,
        "lag_1": 9800.0, "lag_4": 4200.0
      },
      "top_drivers": [
        {"feature": "lag_1", "value": 9800.0, "direction": "positive"},
        {"feature": "lag_4", "value": 4200.0, "direction": "positive"},
        {"feature": "month", "value": 2100.0, "direction": "positive"},
        {"feature": "week", "value": 600.0, "direction": "positive"},
        {"feature": "year", "value": -400.0, "direction": "negative"}
      ]
    },
    ...
  ],
  "model_type": "HistGradientBoostingRegressor",
  "feature_names": ["week", "month", "year", "lag_1", "lag_4"],
  "explainer_ready": true
}
```

## Verification Plan

1. `GET /api/v1/forecast/explain?weeks=4` returns valid JSON
2. `sum(shap_values.values()) + base_value ≈ prediction` (within ±1%)
3. Default synthetic dataset: explainer works
4. Uploaded CSV dataset: explainer works
5. Frontend panel renders week tabs and bar chart
6. Backend starts clean
7. Frontend Vite build succeeds
