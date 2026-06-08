"""Anomaly Detection Service — rolling z-score based detection engine.

Algorithm (simple, explainable, no deep learning):
  1. Query the last N weeks of data per product (or aggregate demand)
  2. Compute rolling_mean and rolling_std over a configurable window
  3. Compute z_score = (actual - rolling_mean) / rolling_std
  4. If |z_score| >= threshold → create Anomaly record
  5. Classify severity: LOW (2–3σ), MEDIUM (3–4σ), CRITICAL (>4σ)

Supported detectors:
  - demand_spike      : positive z-score on weekly demand
  - demand_drop       : negative z-score on weekly demand
  - inventory_shock   : z-score on inventory level changes
  - forecast_miss     : large MAPE between forecast and actual

All detectors share the same rolling-window infrastructure.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional

import numpy as np
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Forecast
from app.models.anomaly import Anomaly, AnomalyType, AnomalySeverity
from app.repositories.anomaly_repository import AnomalyRepository
from app.schemas.anomaly import (
    AnomalyDetectRequest, AnomalyDetectResponse,
    AnomalyListResponse, AnomalyResponse,
    AnomalyResolveRequest, AnomalySummary,
)

logger = logging.getLogger("titan.anomaly.service")


# ── Detection Helpers ─────────────────────────────────────────────────


def _classify_severity(abs_z: float, thresholds: AnomalyDetectRequest) -> AnomalySeverity:
    """Map |z-score| to a severity tier."""
    if abs_z >= thresholds.z_threshold_critical:
        return AnomalySeverity.CRITICAL
    if abs_z >= thresholds.z_threshold_medium:
        return AnomalySeverity.MEDIUM
    return AnomalySeverity.LOW


def _build_explanation(
    anomaly_type: AnomalyType,
    z_score: float,
    deviation_pct: float,
    expected: float,
    actual: float,
    severity: AnomalySeverity,
    event_date: str | None,
) -> str:
    """Generate a human-readable one-line explanation."""
    direction = "above" if z_score > 0 else "below"
    date_str = f" on {event_date}" if event_date else ""

    if anomaly_type == AnomalyType.DEMAND_SPIKE:
        return (
            f"Demand spike{date_str}: actual {actual:.0f} units is "
            f"{abs(deviation_pct):.1f}% {direction} expected {expected:.0f} "
            f"(z={z_score:.2f}, severity={severity.value})"
        )
    if anomaly_type == AnomalyType.DEMAND_DROP:
        return (
            f"Demand drop{date_str}: actual {actual:.0f} units is "
            f"{abs(deviation_pct):.1f}% {direction} expected {expected:.0f} "
            f"(z={z_score:.2f}, severity={severity.value})"
        )
    if anomaly_type == AnomalyType.INVENTORY_SHOCK:
        return (
            f"Inventory shock{date_str}: level {actual:.0f} deviates "
            f"{abs(deviation_pct):.1f}% from rolling average {expected:.0f} "
            f"(z={z_score:.2f}, severity={severity.value})"
        )
    if anomaly_type == AnomalyType.FORECAST_MISS:
        return (
            f"Forecast miss{date_str}: predicted {expected:.0f}, actual {actual:.0f} "
            f"({abs(deviation_pct):.1f}% error, z={z_score:.2f}, severity={severity.value})"
        )
    return f"Anomaly{date_str}: z={z_score:.2f}, deviation={deviation_pct:.1f}%"


def _run_rolling_detection(
    values: list[float],
    dates: list[str],
    window: int,
    thresholds: AnomalyDetectRequest,
    product_id: int | None,
    org_id: int,
    positive_type: AnomalyType,
    negative_type: AnomalyType,
) -> list[Anomaly]:
    """Core rolling z-score detector.

    Produces one Anomaly per detected point that exceeds the z-threshold.
    """
    if len(values) < window + 1:
        return []

    detected: list[Anomaly] = []
    arr = np.array(values, dtype=float)

    for i in range(window, len(arr)):
        window_slice = arr[i - window: i]
        rolling_mean = float(np.mean(window_slice))
        rolling_std = float(np.std(window_slice, ddof=1))  # sample std

        if rolling_std < 1e-9:
            continue  # flat series — skip

        actual = arr[i]
        z = (actual - rolling_mean) / rolling_std
        abs_z = abs(z)

        if abs_z < thresholds.z_threshold_low:
            continue  # Not anomalous

        anomaly_type = positive_type if z > 0 else negative_type
        severity = _classify_severity(abs_z, thresholds)
        deviation_pct = (actual - rolling_mean) / rolling_mean * 100 if rolling_mean != 0 else 0.0
        event_date = dates[i] if i < len(dates) else None

        explanation = _build_explanation(
            anomaly_type, z, deviation_pct, rolling_mean, actual, severity, event_date
        )

        detected.append(Anomaly(
            organization_id=org_id,
            product_id=product_id,
            anomaly_type=anomaly_type,
            severity=severity,
            detected_at=datetime.now(timezone.utc),
            event_date=event_date,
            z_score=round(z, 4),
            deviation_pct=round(deviation_pct, 2),
            expected_value=round(rolling_mean, 2),
            actual_value=round(actual, 2),
            explanation=explanation,
            is_resolved=False,
        ))

    return detected


# ── Service ───────────────────────────────────────────────────────────

# ── Module-level Anomaly Explain Cache (Phase 5D) ─────────────────────
# Key: (anomaly_id, model_version_tag)  Value: serialisable dict of AnomalyExplainResponse
# Lives for the process lifetime. Evicted when max size reached (LRU).
from collections import OrderedDict as _OrderedDict

_EXPLAIN_CACHE: _OrderedDict = _OrderedDict()
_EXPLAIN_CACHE_MAX = 128


def _explain_cache_get(key: tuple) -> dict | None:
    if key in _EXPLAIN_CACHE:
        _EXPLAIN_CACHE.move_to_end(key)
        return dict(_EXPLAIN_CACHE[key])  # shallow copy so callers can mutate 'cached' key
    return None


def _explain_cache_put(key: tuple, value: dict) -> None:
    _EXPLAIN_CACHE[key] = value
    _EXPLAIN_CACHE.move_to_end(key)
    if len(_EXPLAIN_CACHE) > _EXPLAIN_CACHE_MAX:
        _EXPLAIN_CACHE.popitem(last=False)


# Feature names and human-readable labels used by the forecast model
_FEATURE_NAMES: list[str] = ["week", "month", "year", "lag_1", "lag_4"]
_FEATURE_LABELS: dict[str, str] = {
    "week":  "Week of year",
    "month": "Month",
    "year":  "Year trend",
    "lag_1": "Last-week demand",
    "lag_4": "4-week-ago demand",
}


class AnomalyService:
    """Orchestrates anomaly detection and result management.

    Usage:
        svc = AnomalyService(db, org_id)
        result = await svc.detect(request)
    """

    def __init__(self, db: AsyncSession, org_id: int):
        self.db = db
        self.org_id = org_id
        self.repo = AnomalyRepository(db, org_id)

    # ── Detection ─────────────────────────────────────────────────────

    async def detect(self, req: AnomalyDetectRequest) -> AnomalyDetectResponse:
        """Run all configured detectors and persist results.

        Returns a summary of what was found.
        """
        t0 = time.perf_counter()
        run_types = set(req.types) if req.types else set(AnomalyType)

        # Delete existing unresolved anomalies for this org so the new thresholds take full effect
        from sqlalchemy import delete
        del_stmt = delete(Anomaly).where(
            Anomaly.organization_id == self.org_id,
            Anomaly.is_resolved == False,
            Anomaly.anomaly_type.in_(run_types)
        )
        await self.db.execute(del_stmt)
        await self.db.commit()

        original_lookback = req.lookback_weeks
        sweep_windows = [4, 8, 12, 24, 52, 104, 260, 520] if req.comprehensive_sweep else [original_lookback]

        all_detected: list[Anomaly] = []
        forecasts = await self._load_forecast_data()

        for lw in sweep_windows:
            req.lookback_weeks = lw

            # ── Demand Spike / Drop detector ─────────────────────────────
            if AnomalyType.DEMAND_SPIKE in run_types or AnomalyType.DEMAND_DROP in run_types:
                demand_anomalies = await self._detect_demand(forecasts, req)
                all_detected.extend(demand_anomalies)

            # ── Inventory Shock detector ──────────────────────────────────
            if AnomalyType.INVENTORY_SHOCK in run_types:
                inventory_anomalies = await self._detect_inventory_shock(req)
                all_detected.extend(inventory_anomalies)

            # ── Forecast Miss detector ────────────────────────────────────
            if AnomalyType.FORECAST_MISS in run_types:
                miss_anomalies = await self._detect_forecast_miss(forecasts, req)
                all_detected.extend(miss_anomalies)
        
        req.lookback_weeks = original_lookback

        if all_detected:
            # Deduplicate by keeping the one with the highest absolute z-score
            unique_anomalies = {}
            for a in all_detected:
                key = (a.anomaly_type, a.product_id, a.event_date)
                if key not in unique_anomalies:
                    unique_anomalies[key] = a
                else:
                    existing = unique_anomalies[key]
                    if abs(a.z_score) > abs(existing.z_score):
                        unique_anomalies[key] = a
            all_detected = list(unique_anomalies.values())

        # Persist ALL new anomalies for the dataset
        if all_detected:
            await self.repo.bulk_create(all_detected)
            await self.db.commit()

        elapsed = round(time.perf_counter() - t0, 3)

        # Filter output for the Scanner UI strictly based on lookback_weeks
        filtered_detected = []
        if all_detected:
            latest_date_str = max(
                (a.event_date for a in all_detected if a.event_date), 
                default=None
            )
            if latest_date_str:
                latest_date = datetime.strptime(latest_date_str, "%Y-%m-%d").date()
                cutoff_date = latest_date - timedelta(weeks=req.lookback_weeks)
                for a in all_detected:
                    if a.event_date:
                        a_date = datetime.strptime(a.event_date, "%Y-%m-%d").date()
                        if req.comprehensive_sweep or a_date >= cutoff_date:
                            filtered_detected.append(a)
                    else:
                        filtered_detected.append(a)
            else:
                filtered_detected = all_detected

        # Build counts based ONLY on the filtered subset for the Scanner UI
        def _count_type(t: AnomalyType) -> int:
            return sum(1 for a in filtered_detected if a.anomaly_type == t)

        def _count_sev(s: AnomalySeverity) -> int:
            return sum(1 for a in filtered_detected if a.severity == s)

        logger.info(
            "[org:%d] Anomaly detection complete: %d total found in %.2fs. Returning %d for the %d week lookback window.",
            self.org_id, len(all_detected), elapsed, len(filtered_detected), req.lookback_weeks
        )

        return AnomalyDetectResponse(
            detected=len(filtered_detected),
            demand_spikes=_count_type(AnomalyType.DEMAND_SPIKE),
            demand_drops=_count_type(AnomalyType.DEMAND_DROP),
            inventory_shocks=_count_type(AnomalyType.INVENTORY_SHOCK),
            forecast_misses=_count_type(AnomalyType.FORECAST_MISS),
            critical=_count_sev(AnomalySeverity.CRITICAL),
            medium=_count_sev(AnomalySeverity.MEDIUM),
            low=_count_sev(AnomalySeverity.LOW),
            computation_seconds=elapsed,
        )

    # ── Individual Detectors ──────────────────────────────────────────

    async def _load_forecast_data(self) -> list:
        """Load forecast records with both predicted and actual demand."""
        stmt = (
            select(Forecast)
            .where(Forecast.organization_id == self.org_id)
            .where(Forecast.actual_demand.isnot(None))
            .order_by(Forecast.forecast_date.asc())
            # Loading the ENTIRE dataset so the main UI can display total anomalies
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _detect_demand(
        self, forecasts: list, req: AnomalyDetectRequest
    ) -> list[Anomaly]:
        """Detect demand spikes and drops using rolling z-score on actual demand."""
        if not forecasts:
            return []

        # Group by product_id for per-product rolling stats
        by_product: dict[int | None, list] = defaultdict(list)
        for f in forecasts:
            by_product[f.product_id].append(f)

        # Also run on aggregated weekly demand (org-level)
        by_date: dict[str, float] = defaultdict(float)
        for f in forecasts:
            date_key = f.forecast_date.strftime("%Y-%m-%d") if f.forecast_date else "unknown"
            by_date[date_key] += f.actual_demand or 0

        window = min(req.lookback_weeks // 2, 6)  # rolling window = half lookback, max 6
        detected: list[Anomaly] = []

        # Per-product detection
        for pid, rows in by_product.items():
            rows_sorted = sorted(rows, key=lambda r: r.forecast_date or datetime.min)
            values = [float(r.actual_demand or 0) for r in rows_sorted]
            dates = [
                r.forecast_date.strftime("%Y-%m-%d") if r.forecast_date else None
                for r in rows_sorted
            ]
            detected.extend(_run_rolling_detection(
                values, dates, window, req, pid, self.org_id,
                AnomalyType.DEMAND_SPIKE, AnomalyType.DEMAND_DROP
            ))

        # Org-level aggregated demand detection (product_id=None)
        # Only run when multiple products exist in the dataset.
        # For single-product orgs the aggregated series is identical to the
        # per-product series and would produce duplicate anomaly records
        # with product_id=None alongside the product-specific ones.
        agg_sorted = sorted(by_date.items())
        n_distinct_products = len(by_product)
        if n_distinct_products != 1 and len(agg_sorted) > window:
            agg_values = [v for _, v in agg_sorted]
            agg_dates = [d for d, _ in agg_sorted]
            detected.extend(_run_rolling_detection(
                agg_values, agg_dates, window, req, None, self.org_id,
                AnomalyType.DEMAND_SPIKE, AnomalyType.DEMAND_DROP
            ))

        return detected

    async def _detect_inventory_shock(self, req: AnomalyDetectRequest) -> list[Anomaly]:
        """Detect sharp inventory level changes using rolling z-score."""
        from app.models import Inventory

        stmt = (
            select(Inventory)
            .where(Inventory.organization_id == self.org_id)
            .order_by(Inventory.updated_at.asc())
            # Loading the ENTIRE dataset so the main UI can display total anomalies
        )
        result = await self.db.execute(stmt)
        rows = list(result.scalars().all())

        if not rows:
            return []

        by_product: dict[int, list] = defaultdict(list)
        for r in rows:
            if r.product_id:
                by_product[r.product_id].append(r)

        window = min(req.lookback_weeks // 2, 6)
        detected: list[Anomaly] = []

        for pid, inv_rows in by_product.items():
            sorted_rows = sorted(inv_rows, key=lambda r: r.updated_at or datetime.min)
            values = [float(r.current_stock or 0) for r in sorted_rows]
            dates = [
                r.updated_at.strftime("%Y-%m-%d") if r.updated_at else None
                for r in sorted_rows
            ]
            detected.extend(_run_rolling_detection(
                values, dates, window, req, pid, self.org_id,
                AnomalyType.INVENTORY_SHOCK, AnomalyType.INVENTORY_SHOCK
            ))

        return detected

    async def _detect_forecast_miss(
        self, forecasts: list, req: AnomalyDetectRequest
    ) -> list[Anomaly]:
        """Detect forecast misses where prediction error exceeds z-threshold."""
        if not forecasts:
            return []

        # Compute per-record absolute % errors
        errors = []
        for f in forecasts:
            if f.predicted_demand and f.actual_demand and f.actual_demand > 0:
                pct_err = abs(f.predicted_demand - f.actual_demand) / f.actual_demand * 100
                errors.append((pct_err, f))

        if len(errors) < 4:
            return []

        error_values = [e[0] for e in errors]
        rolling_mean = float(np.mean(error_values))
        rolling_std = float(np.std(error_values, ddof=1))

        if rolling_std < 1e-9:
            return []

        detected: list[Anomaly] = []
        for pct_err, f in errors:
            z = (pct_err - rolling_mean) / rolling_std
            abs_z = abs(z)

            if abs_z < req.z_threshold_low:
                continue

            severity = _classify_severity(abs_z, req)
            event_date = f.forecast_date.strftime("%Y-%m-%d") if f.forecast_date else None
            deviation_pct = pct_err

            explanation = _build_explanation(
                AnomalyType.FORECAST_MISS, z, deviation_pct,
                float(f.predicted_demand or 0), float(f.actual_demand or 0),
                severity, event_date
            )

            detected.append(Anomaly(
                organization_id=self.org_id,
                product_id=f.product_id,
                anomaly_type=AnomalyType.FORECAST_MISS,
                severity=severity,
                detected_at=datetime.now(timezone.utc),
                event_date=event_date,
                z_score=round(z, 4),
                deviation_pct=round(deviation_pct, 2),
                expected_value=round(float(f.predicted_demand or 0), 2),
                actual_value=round(float(f.actual_demand or 0), 2),
                explanation=explanation,
                is_resolved=False,
            ))

        return detected

    # ── CRUD / Management ─────────────────────────────────────────────

    async def list_anomalies(
        self,
        *,
        page: int = 1,
        per_page: int = 50,
        severity: Optional[AnomalySeverity] = None,
        anomaly_type: Optional[AnomalyType] = None,
        product_id: Optional[int] = None,
        include_resolved: bool = False,
    ) -> AnomalyListResponse:
        """Return paginated anomaly list."""
        import math
        offset = (page - 1) * per_page
        rows, total = await self.repo.list_all(
            limit=per_page,
            offset=offset,
            severity=severity,
            anomaly_type=anomaly_type,
            product_id=product_id,
            include_resolved=include_resolved,
        )
        return AnomalyListResponse(
            anomalies=[AnomalyResponse.model_validate(r) for r in rows],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=math.ceil(total / per_page) if total else 0,
        )

    async def get_summary(self) -> AnomalySummary:
        """Return aggregated stats for dashboard widgets."""
        data = await self.repo.get_summary()
        return AnomalySummary(**data)

    async def resolve(self, req: AnomalyResolveRequest) -> int:
        """Mark anomalies as resolved. Returns number of records updated."""
        updated = await self.repo.resolve_many(req.anomaly_ids)
        await self.db.commit()
        return updated

    async def get_by_id(self, anomaly_id: int) -> Optional[AnomalyResponse]:
        """Get a single anomaly by ID (tenant-scoped)."""
        row = await self.repo.get_by_id(anomaly_id)
        if row is None:
            return None
        return AnomalyResponse.model_validate(row)

    async def get_context(self, anomaly_id: int):
        """Fetch real historical context for a single anomaly.

        Returns AnomalyContextResponse with:
        - Real Forecast series (12 weeks before + anomaly week + 4 weeks after)
        - Rolling baseline computed from Forecast.predicted_demand
        - Confidence bands from Forecast.confidence_lower / confidence_upper
        - Revenue impact from Product.price * |deviation|
        - Inventory impact = |actual_value - expected_value|
        - Stockout / forecast confidence impact derived from anomaly type & deviation
        """
        from app.schemas.anomaly import AnomalyContextResponse, AnomalyContextPoint
        from app.models import Product

        # ── 1. Load the anomaly record ────────────────────────────────
        anomaly = await self.repo.get_by_id(anomaly_id)
        if anomaly is None:
            return None

        # ── 2. Parse the event date ───────────────────────────────────
        event_date_obj = None
        if anomaly.event_date:
            try:
                event_date_obj = datetime.strptime(anomaly.event_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        # ── 3. Load product info for price-based impact ───────────────
        product_name = None
        product_sku = None
        product_price = None

        if anomaly.product_id:
            prod_stmt = select(Product).where(
                Product.id == anomaly.product_id,
                Product.organization_id == self.org_id,
            )
            prod_result = await self.db.execute(prod_stmt)
            product = prod_result.scalars().first()
            if product:
                product_name = product.name
                product_sku = product.sku
                product_price = product.price

        # ── 4. Load Forecast series (16 weeks window: 12 before + 4 after) ──
        if event_date_obj:
            window_start = event_date_obj - timedelta(weeks=12)
            window_end = event_date_obj + timedelta(weeks=4)
        else:
            # No event date — just pull the most recent 16 weeks of data
            window_end = datetime.now(timezone.utc).date()
            window_start = window_end - timedelta(weeks=16)

        # Build the forecast query scoped to product if available
        fc_stmt = (
            select(Forecast)
            .where(Forecast.organization_id == self.org_id)
            .where(Forecast.forecast_date >= datetime(
                window_start.year, window_start.month, window_start.day,
                tzinfo=timezone.utc))
            .where(Forecast.forecast_date <= datetime(
                window_end.year, window_end.month, window_end.day,
                23, 59, 59, tzinfo=timezone.utc))
            .order_by(Forecast.forecast_date.asc())
        )
        if anomaly.product_id:
            fc_stmt = fc_stmt.where(Forecast.product_id == anomaly.product_id)
        else:
            # Org-wide anomaly — aggregate across all products by date
            fc_stmt = fc_stmt.where(Forecast.actual_demand.isnot(None))

        fc_result = await self.db.execute(fc_stmt)
        fc_rows = list(fc_result.scalars().all())

        # ── 5. Aggregate by date (handles multiple products in org-level anomaly) ──
        from collections import defaultdict as ddict

        by_date: dict[str, dict] = {}
        for row in fc_rows:
            d = row.forecast_date.strftime("%Y-%m-%d") if row.forecast_date else None
            if not d:
                continue
            if d not in by_date:
                by_date[d] = {
                    "actual": 0.0,
                    "predicted": 0.0,
                    "conf_lower": row.confidence_lower,
                    "conf_upper": row.confidence_upper,
                    "count": 0,
                }
            by_date[d]["actual"] += float(row.actual_demand or 0)
            by_date[d]["predicted"] += float(row.predicted_demand or 0)
            by_date[d]["count"] += 1
            # Average confidence bands
            if row.confidence_lower is not None and by_date[d]["conf_lower"] is not None:
                by_date[d]["conf_lower"] = (by_date[d]["conf_lower"] + row.confidence_lower) / 2
            if row.confidence_upper is not None and by_date[d]["conf_upper"] is not None:
                by_date[d]["conf_upper"] = (by_date[d]["conf_upper"] + row.confidence_upper) / 2

        sorted_dates = sorted(by_date.keys())

        # ── 6. Compute rolling baseline (rolling mean of actual) ──────
        rolling_window = 4  # 4-week rolling mean for baseline
        actuals = [by_date[d]["actual"] for d in sorted_dates]

        baselines = []
        for i, _ in enumerate(sorted_dates):
            if i < rolling_window:
                # Not enough history — use average of available points
                baselines.append(float(np.mean(actuals[:i + 1])) if actuals[:i + 1] else 0.0)
            else:
                baselines.append(float(np.mean(actuals[i - rolling_window:i])))

        # ── 7. Build series with is_anomaly flag ──────────────────────
        anomaly_date_str = anomaly.event_date or ""
        series = []
        for i, d in enumerate(sorted_dates):
            row_data = by_date[d]
            cl = row_data.get("conf_lower")
            cu = row_data.get("conf_upper")

            # Scale confidence bands from product-level to aggregated level if needed
            if cl is not None and cu is not None:
                # Confidence bands relative to predicted — scale by ratio of actual/predicted if large discrepancy
                pass  # Use raw values from DB

            series.append(AnomalyContextPoint(
                date=d,
                actual=round(row_data["actual"], 2),
                baseline=round(baselines[i], 2),
                confidence_lower=round(cl, 2) if cl is not None else None,
                confidence_upper=round(cu, 2) if cu is not None else None,
                is_anomaly=(d == anomaly_date_str),
            ))

        # If event_date is not in the fetched series (e.g., inventory anomaly with different source)
        # inject the anomaly point directly from the anomaly record
        if anomaly_date_str and anomaly_date_str not in by_date:
            exp = anomaly.expected_value or 0.0
            act = anomaly.actual_value or 0.0
            # Compute a rough confidence band from rolling std of baselines.
            # np.std([x], ddof=1) returns NaN for single-element arrays.
            # Guard: use fallback for len <= 1 OR when result is NaN.
            if len(baselines) > 1:
                std_raw = float(np.std(baselines, ddof=1))
                std = std_raw if (std_raw == std_raw and std_raw >= 0) else abs(act - exp) * 0.2
            else:
                std = abs(act - exp) * 0.2
            # Ensure std is at least a tiny positive number so band is visible
            std = max(std, 0.001)
            series.append(AnomalyContextPoint(
                date=anomaly_date_str,
                actual=round(act, 2),
                baseline=round(exp, 2),
                confidence_lower=round(exp - std, 2),
                confidence_upper=round(exp + std, 2),
                is_anomaly=True,
            ))
            series.sort(key=lambda p: p.date)

        # ── 8. Compute detection confidence from z-score ──────────────
        abs_z = abs(anomaly.z_score or 0)
        if abs_z >= 5:
            confidence_score = 98.0
        elif abs_z >= 4:
            confidence_score = 92.0
        elif abs_z >= 3:
            confidence_score = 84.0
        elif abs_z >= 2:
            confidence_score = 72.0
        else:
            confidence_score = 55.0

        # ── 9. Compute real revenue impact ─────────────────────────────────
        # Product-scoped: use Product.price exactly
        # Org-level (no product_id): use weighted_avg_unit_price from Sale table
        from app.models import Sale
        from sqlalchemy import func

        actual_units = abs(anomaly.actual_value or 0)
        expected_units = abs(anomaly.expected_value or 0)
        unit_diff = abs(actual_units - expected_units)
        revenue_impact_is_estimated = False
        unit_price_used: float | None = None

        if product_price is not None and product_price > 0:
            # Exact product pricing
            unit_price_used = product_price
            revenue_impact = unit_diff * product_price if unit_diff > 0 else None
            revenue_impact_is_estimated = False
        else:
            # No product price — compute org-wide weighted average unit price from Sale records
            sale_stmt = select(
                func.sum(Sale.revenue).label("total_revenue"),
                func.sum(Sale.quantity).label("total_quantity"),
            ).where(Sale.organization_id == self.org_id)
            sale_result = await self.db.execute(sale_stmt)
            sale_row = sale_result.first()

            total_rev = float(sale_row.total_revenue or 0) if sale_row else 0.0
            total_qty = float(sale_row.total_quantity or 0) if sale_row else 0.0

            if total_qty > 0 and total_rev > 0:
                weighted_avg_price = total_rev / total_qty
                unit_price_used = round(weighted_avg_price, 4)
                revenue_impact = unit_diff * weighted_avg_price if unit_diff > 0 else None
                revenue_impact_is_estimated = True
            else:
                revenue_impact = None
                unit_price_used = None

        inventory_impact = unit_diff if unit_diff > 0 else None

        from app.models.anomaly import AnomalyType as AType
        deviation = abs(anomaly.deviation_pct or 0) / 100.0
        if anomaly.anomaly_type == AType.DEMAND_SPIKE:
            stockout_risk_pct = min(95.0, deviation * 200)
        elif anomaly.anomaly_type == AType.INVENTORY_SHOCK:
            stockout_risk_pct = min(80.0, deviation * 160)
        else:
            stockout_risk_pct = max(5.0, min(25.0, deviation * 50))

        if anomaly.anomaly_type == AType.FORECAST_MISS:
            forecast_confidence_impact = min(40.0, deviation * 80)
        else:
            forecast_confidence_impact = min(15.0, deviation * 25)

        return AnomalyContextResponse(
            anomaly_id=anomaly_id,
            product_id=anomaly.product_id,
            product_name=product_name,
            product_sku=product_sku,
            product_price=product_price,
            actual_value=anomaly.actual_value,
            expected_value=anomaly.expected_value,
            z_score=anomaly.z_score,
            deviation_pct=anomaly.deviation_pct,
            confidence=round(confidence_score, 1),
            series=series,
            revenue_impact=round(revenue_impact, 2) if revenue_impact is not None else None,
            inventory_impact=round(inventory_impact, 2) if inventory_impact is not None else None,
            stockout_risk_pct=round(stockout_risk_pct, 1),
            forecast_confidence_impact=round(forecast_confidence_impact, 1),
            revenue_impact_is_estimated=revenue_impact_is_estimated,
            unit_price_used=unit_price_used,
        )

    async def get_explain(self, anomaly_id: int):
        """Generate SHAP root-cause explanation for a single anomaly.

        Reconstructs the forecast feature vector at the anomaly event date
        from the Forecast table, then calls ShapService.explain_forecast().

        Returns AnomalyExplainResponse (never persisted).
        Returns explainer_ready=False gracefully on any failure — no 500.
        """
        from app.schemas.anomaly import AnomalyExplainResponse, AnomalyDriverItem
        from app.repositories.forecast_repo import ModelVersionRepository
        from app.models.anomaly import AnomalyType as AType
        from app.models import Forecast
        from app.services.shap_service import ShapService
        import pickle

        # ── 1. Load anomaly record ────────────────────────────────────
        anomaly = await self.repo.get_by_id(anomaly_id)
        if anomaly is None:
            return None  # caller converts to 404

        # ── 2. Load active model version + artifact ───────────────────
        mv_repo = ModelVersionRepository(self.db, self.org_id)
        active_mv, artifact_path = await mv_repo.get_active_with_artifact()

        if active_mv is None:
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                reason="No active model version. Run training first.",
                reconstruction_quality="minimal",
            )

        if not artifact_path:
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                model_version_tag=active_mv.version_tag,
                reason="Model artifact not found on disk. Re-run training.",
                reconstruction_quality="minimal",
            )

        version_tag = active_mv.version_tag

        # ── 3. Check in-process cache ─────────────────────────────────
        cache_key = (anomaly_id, version_tag)
        cached_result = _explain_cache_get(cache_key)
        if cached_result is not None:
            cached_result["cached"] = True
            return AnomalyExplainResponse(**cached_result)

        # ── 4. Load pkl state ─────────────────────────────────────────
        try:
            with open(artifact_path, "rb") as fh:
                state = pickle.load(fh)
        except Exception as exc:
            logger.error("[org:%d] Explain: failed to load pkl: %s", self.org_id, exc)
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                model_version_tag=version_tag,
                reason=f"Model artifact could not be loaded: {exc}",
                reconstruction_quality="minimal",
            )

        model = state.get("model")
        historical_data = state.get("historical_data", [])
        if model is None:
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                model_version_tag=version_tag,
                reason="Pickle state missing 'model' key.",
                reconstruction_quality="minimal",
            )

        # ── 5. Parse event date ───────────────────────────────────────
        from datetime import timedelta

        event_date_obj = None
        if anomaly.event_date:
            try:
                from datetime import datetime as _dt
                event_date_obj = _dt.strptime(anomaly.event_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        # ── 6. Reconstruct feature vector at anomaly date ─────────────
        used_fallbacks: list[str] = []

        if event_date_obj:
            week  = int(event_date_obj.isocalendar()[1])
            month = event_date_obj.month
            year  = event_date_obj.year
        else:
            # No event date — use today's calendar values
            from datetime import date as _date
            today = _date.today()
            week  = int(today.isocalendar()[1])
            month = today.month
            year  = today.year
            used_fallbacks.append("week")
            used_fallbacks.append("month")
            used_fallbacks.append("year")

        # Look up lag_1 and lag_4 from Forecast table around event_date
        # lag_1 = actual_demand 1 week before event_date
        # lag_4 = actual_demand 4 weeks before event_date
        expected_val = float(anomaly.expected_value or 0)

        async def _fetch_lag(weeks_back: int) -> tuple[float, bool]:
            """Return (value, used_fallback). True = fell back to expected_value."""
            if not event_date_obj:
                return expected_val, True
            target = event_date_obj - timedelta(weeks=weeks_back)
            # Allow ±3 days tolerance
            lo = datetime(target.year, target.month, target.day, tzinfo=timezone.utc) - timedelta(days=3)
            hi = datetime(target.year, target.month, target.day, tzinfo=timezone.utc) + timedelta(days=3)
            stmt = (
                select(Forecast)
                .where(Forecast.organization_id == self.org_id)
                .where(Forecast.forecast_date >= lo)
                .where(Forecast.forecast_date <= hi)
                .where(Forecast.actual_demand.isnot(None))
                .order_by(func.abs(
                    func.extract("epoch", Forecast.forecast_date) -
                    func.extract("epoch", datetime(target.year, target.month, target.day, tzinfo=timezone.utc))
                ))
                .limit(1)
            )
            if anomaly.product_id:
                stmt = stmt.where(Forecast.product_id == anomaly.product_id)
            res = await self.db.execute(stmt)
            row = res.scalars().first()
            if row and row.actual_demand:
                return float(row.actual_demand), False
            return expected_val, True

        lag_1_val, lag_1_fallback = await _fetch_lag(1)
        lag_4_val, lag_4_fallback = await _fetch_lag(4)

        if lag_1_fallback:
            used_fallbacks.append("lag_1")
        if lag_4_fallback:
            used_fallbacks.append("lag_4")

        # Reconstruction quality
        total_features = 5  # week, month, year, lag_1, lag_4
        n_fallbacks = len(used_fallbacks)
        if n_fallbacks == 0:
            reconstruction_quality = "full"
        elif n_fallbacks <= 2:
            reconstruction_quality = "partial"
        else:
            reconstruction_quality = "minimal"

        feature_vec = {
            "week":  float(week),
            "month": float(month),
            "year":  float(year),
            "lag_1": lag_1_val,
            "lag_4": lag_4_val,
            "date":  anomaly.event_date or "",
        }

        # ── 7. Run SHAP ───────────────────────────────────────────────
        actual_val = float(anomaly.actual_value or 0)
        try:
            shap_results = ShapService.explain_forecast(
                model=model,
                historical_data=historical_data,
                feature_vectors=[feature_vec],
                predictions=[actual_val],
                feature_names=_FEATURE_NAMES,
            )
        except Exception as exc:
            logger.error("[org:%d] Anomaly explain SHAP failed: %s", self.org_id, exc)
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                model_version_tag=version_tag,
                event_date=anomaly.event_date,
                feature_vector=feature_vec,
                reason=f"SHAP computation failed: {exc}",
                reconstruction_quality=reconstruction_quality,
                used_fallbacks=used_fallbacks,
            )

        if not shap_results:
            return AnomalyExplainResponse(
                explainer_ready=False,
                anomaly_id=anomaly_id,
                model_version_tag=version_tag,
                reason="SHAP returned empty results.",
                reconstruction_quality=reconstruction_quality,
                used_fallbacks=used_fallbacks,
            )

        result = shap_results[0]
        base_value = result["base_value"]
        predicted_at_anomaly = result["prediction"]
        shap_dict: dict[str, float] = result["shap_values"]

        # ── 8. Build drivers and suppressors ──────────────────────────
        all_items = sorted(
            [
                AnomalyDriverItem(
                    feature=name,
                    label=_FEATURE_LABELS.get(name, name),
                    shap_value=round(sv, 4),
                    feature_value=round(float(feature_vec.get(name, 0)), 4),
                    direction="positive" if sv >= 0 else "negative",
                    abs_shap=round(abs(sv), 4),
                )
                for name, sv in shap_dict.items()
            ],
            key=lambda d: d.abs_shap,
            reverse=True,
        )
        drivers    = [d for d in all_items if d.direction == "positive"]
        suppressors = [d for d in all_items if d.direction == "negative"]

        # ── 9. SHAP-enhanced confidence ───────────────────────────────
        abs_z = abs(anomaly.z_score or 0)
        if abs_z >= 5:
            base_confidence = 98.0
        elif abs_z >= 4:
            base_confidence = 92.0
        elif abs_z >= 3:
            base_confidence = 84.0
        elif abs_z >= 2:
            base_confidence = 72.0
        else:
            base_confidence = 55.0

        top_abs = max((d.abs_shap for d in all_items), default=0.0)
        total_abs = sum(d.abs_shap for d in all_items) or 1.0
        top_driver_ratio = top_abs / total_abs  # 0-1: how dominant the top feature is

        # SHAP boost: up to +8% when one feature dominates (ratio > 0.7)
        shap_boost = min(8.0, top_driver_ratio * 12.0)
        confidence_shap = round(min(99.0, base_confidence + shap_boost), 1)
        confidence_source = "shap_enhanced" if shap_boost > 0.5 else "z_score"

        # ── 10. Backend narrative summary ────────────────────────────
        def _narrative() -> str:
            if not all_items:
                return (
                    f"Anomaly on {anomaly.event_date}: actual {actual_val:.0f} "
                    f"vs expected {expected_val:.0f} "
                    f"(z={anomaly.z_score:.2f})."
                )
            primary = all_items[0]
            direction_word = "above" if (anomaly.deviation_pct or 0) > 0 else "below"

            lines = [
                f"On {anomaly.event_date}, demand of {actual_val:,.0f} units was "
                f"{abs(anomaly.deviation_pct or 0):.1f}% {direction_word} the "
                f"expected {expected_val:,.0f} (z={anomaly.z_score:.2f})."
            ]

            if primary.abs_shap > 0.1:
                lines.append(
                    f"The primary driver was {primary.label} "
                    f"({primary.feature_value:,.0f} units), "
                    f"contributing {'+' if primary.shap_value >= 0 else ''}"
                    f"{primary.shap_value:,.1f} to the model's prediction "
                    f"above the SHAP baseline of {base_value:,.1f}."
                )

            if len(all_items) >= 2:
                second = all_items[1]
                if second.abs_shap > 0.1:
                    lines.append(
                        f"{second.label} was the secondary "
                        f"{'driver' if second.direction == 'positive' else 'suppressor'} "
                        f"({'+' if second.shap_value >= 0 else ''}{second.shap_value:,.1f})."
                    )

            if reconstruction_quality == "partial":
                lines.append(
                    f"Note: {', '.join(_FEATURE_LABELS.get(f, f) for f in used_fallbacks if f in ('lag_1','lag_4'))} "
                    f"{'was' if len([f for f in used_fallbacks if f in ('lag_1','lag_4')]) == 1 else 'were'} "
                    f"estimated from the rolling baseline (no exact Forecast row found)."
                )
            elif reconstruction_quality == "minimal":
                lines.append(
                    "Feature reconstruction was minimal — most values estimated from the rolling baseline."
                )

            return " ".join(lines)

        narrative = _narrative()

        # ── 11. Anomaly type note ────────────────────────────────────
        anomaly_type_note = None
        if anomaly.anomaly_type == AType.INVENTORY_SHOCK:
            anomaly_type_note = (
                "This is an inventory-level anomaly. SHAP explains the "
                "demand-signal component from the forecast model; "
                "actual inventory discrepancy may have different direct causes."
            )
        elif anomaly.anomaly_type == AType.FORECAST_MISS:
            anomaly_type_note = (
                "This anomaly reflects a forecast miss. "
                "SHAP shows which features contributed most to the model's "
                "incorrect prediction on this date."
            )

        # ── 12. Build and cache response ──────────────────────────────
        resp_dict = dict(
            explainer_ready=True,
            anomaly_id=anomaly_id,
            model_version_tag=version_tag,
            event_date=anomaly.event_date,
            base_value=round(base_value, 4),
            predicted_at_anomaly=round(predicted_at_anomaly, 2),
            feature_vector={
                k: round(float(v), 4) if isinstance(v, (int, float)) else v
                for k, v in feature_vec.items()
                if k != "date"
            },
            drivers=[d.model_dump() for d in drivers],
            suppressors=[d.model_dump() for d in suppressors],
            all_shap={k: round(v, 4) for k, v in shap_dict.items()},
            narrative_summary=narrative,
            confidence_shap=confidence_shap,
            confidence_source=confidence_source,
            reconstruction_quality=reconstruction_quality,
            used_fallbacks=used_fallbacks,
            anomaly_type_note=anomaly_type_note,
            cached=False,
        )

        _explain_cache_put(cache_key, resp_dict)
        logger.info(
            "[org:%d] Anomaly %d explain: ready=True quality=%s fallbacks=%s cached->key=%s",
            self.org_id, anomaly_id, reconstruction_quality, used_fallbacks, cache_key,
        )
        return AnomalyExplainResponse(**resp_dict)
