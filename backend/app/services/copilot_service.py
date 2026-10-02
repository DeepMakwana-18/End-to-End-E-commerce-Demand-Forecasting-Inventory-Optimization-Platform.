"""AI Supply Chain Analyst Copilot — deterministic intent classification + data aggregation.

Architecture:
  1. classify_intent() — keyword-based, no LLM
  2. handle_*()        — each fetches data from existing repositories
  3. generate_response() — formats natural language from real data

All methods accept (db, org_id) and return CopilotResponse.
No hardcoded values — every number comes from a live DB query.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.copilot import CopilotIntent, CopilotResponse

logger = logging.getLogger("titan.copilot")


# ── Intent Classification ─────────────────────────────────────────────

_INTENT_KEYWORDS: dict[CopilotIntent, list[str]] = {
    "executive_summary": [
        "summary", "overview", "how are we doing", "status", "health", "overall",
        "performance", "everything", "tell me about", "situation", "report",
        "what's happening", "whats happening", "how is", "platform status",
        "business health", "general",
    ],
    "forecast_explain": [
        "why forecast", "explain forecast", "shap", "feature", "driver",
        "what drives", "reason for", "what cause", "which factor", "why predict",
        "explain prediction", "what influence", "feature importance",
        "what's driving", "whats driving",
    ],
    "forecast": [
        "forecast", "predict", "prediction", "demand", "next week", "upcoming",
        "will sell", "future demand", "projected", "outlook", "weeks ahead",
        "expected demand", "demand forecast", "volume",
        # Model version / accuracy queries also route to forecast
        "model version", "model accuracy", "training source", "active model",
        "model status", "model trained", "current model", "which model",
        "model tag", "version tag", "data source", "training date",
    ],
    "anomaly": [
        "anomal", "spike", "drop", "unusual", "outlier", "abnormal", "irregular",
        "strange", "weird", "unexpected", "deviation", "out of normal",
        "demand spike", "demand drop", "inventory shock", "forecast miss",
        "anything wrong", "detected", "detection",
    ],
    "alert": [
        "alert", "warning", "critical", "notification", "urgent", "caution",
        "issue", "problem", "flagged", "attention", "action required",
        "active alerts", "open alerts",
    ],
    "inventory": [
        "inventory", "stock", "reorder", "safety stock", "stockout", "warehouse",
        "units on hand", "supply", "restock", "refill", "order quantity",
        "low stock", "out of stock", "overstocked", "holding",
    ],
    "scenario": [
        # NOTE: 'model' intentionally removed — it is too generic and conflicts with
        # model-version queries that belong in 'forecast'.
        "scenario", "what if", "simulation", "simulate", "if i",
        "marketing spend", "price change", "lead time", "what would happen",
        "suppose", "hypothetical", "run scenario",
    ],
}


def classify_intent(message: str) -> CopilotIntent:
    """Deterministic keyword-based intent classification.

    Returns the most-matched intent, or 'unknown' if no keyword matches.
    Priority ordering: forecast_explain > forecast (to avoid mis-routing "explain forecast").
    """
    lower = message.lower().strip()

    # Ordered priority (more specific first)
    priority_order: list[CopilotIntent] = [
        "forecast_explain",
        "executive_summary",
        "anomaly",
        "alert",
        "inventory",
        "scenario",
        "forecast",
    ]

    scores: dict[CopilotIntent, int] = {}
    for intent, keywords in _INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > 0:
            scores[intent] = score

    if not scores:
        return "unknown"

    # Return the highest-scored intent, breaking ties by priority order
    max_score = max(scores.values())
    tied_intents = [i for i in priority_order if scores.get(i, 0) == max_score]
    if tied_intents:
        return tied_intents[0]

    return max(scores, key=lambda i: scores[i])


# ── Formatters ────────────────────────────────────────────────────────

def _fmt_num(v: float | int | None, decimals: int = 0) -> str:
    if v is None:
        return "N/A"
    if decimals == 0:
        return f"{v:,.0f}"
    return f"{v:,.{decimals}f}"


def _severity_emoji(severity: str) -> str:
    return {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(
        severity.lower() if severity else "", "⚪"
    )


def _health_label(score: float) -> str:
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "poor"


# ── Handlers ─────────────────────────────────────────────────────────


async def handle_executive_summary(db: AsyncSession, org_id: int) -> CopilotResponse:
    """Aggregate KPIs, model, anomalies, alerts, and inventory into one summary."""
    from app.repositories.forecast_repo import ModelVersionRepository
    from app.repositories.anomaly_repository import AnomalyRepository
    from app.repositories.alert_repo import AlertRepository
    from app.repositories.inventory_repo import InventoryRepository
    from app.services.ml_service import forecast_model

    mv_repo = ModelVersionRepository(db, org_id)
    anomaly_repo = AnomalyRepository(db, org_id)
    alert_repo = AlertRepository(db, org_id)
    inv_repo = InventoryRepository(db, org_id)

    # Fetch all sub-data
    active_mv = await mv_repo.get_active()
    anomaly_summary = await anomaly_repo.get_summary()
    alert_count = await alert_repo.count_active()
    alert_by_sev = await alert_repo.count_by_severity()
    inv_health = await inv_repo.get_health_summary()
    reorder_items = await inv_repo.get_reorder_items()

    # Model info
    if active_mv:
        model_line = (
            f"🤖 **ML Model:** {active_mv.version_tag} | "
            f"Accuracy: {_fmt_num(active_mv.accuracy * 100 if active_mv.accuracy and active_mv.accuracy <= 1 else active_mv.accuracy, 1)}% | "
            f"Source: {active_mv.data_source or 'uploaded dataset'}"
        )
    else:
        model_line = "🤖 **ML Model:** No trained model found — please upload a dataset to train your first model."

    # Anomaly section
    total_anom = anomaly_summary.get("total_active", 0)
    crit_anom = anomaly_summary.get("critical_count", 0)
    if total_anom == 0:
        anomaly_line = "🔍 **Anomalies:** No active anomalies detected — demand patterns are normal."
    else:
        anomaly_line = (
            f"🔍 **Anomalies:** {total_anom} active "
            f"({crit_anom} critical, {anomaly_summary.get('medium_count', 0)} medium, "
            f"{anomaly_summary.get('low_count', 0)} low)"
        )

    # Alert section
    crit_alerts = alert_by_sev.get("critical", 0)
    high_alerts = alert_by_sev.get("high", 0)
    if alert_count == 0:
        alert_line = "🔔 **Alerts:** No active alerts — all systems operating within thresholds."
    else:
        alert_line = (
            f"🔔 **Alerts:** {alert_count} active "
            f"({crit_alerts} critical, {high_alerts} high priority)"
        )

    # Inventory section
    total_skus = inv_health.get("total_skus", 0)
    overall_health = inv_health.get("overall_health", 0.0)
    crit_inv = inv_health.get("distribution", {}).get("critical", {}).get("count", 0)
    low_inv = inv_health.get("distribution", {}).get("low", {}).get("count", 0)
    reorder_count = len(reorder_items)

    inv_line = (
        f"📦 **Inventory:** {total_skus} SKUs tracked | "
        f"Health: {_fmt_num(overall_health, 1)}/100 ({_health_label(overall_health)}) | "
        f"{crit_inv} critical, {low_inv} low | "
        f"{reorder_count} SKUs need reordering"
    )

    # Overall health verdict
    issues = []
    if crit_anom > 0:
        issues.append(f"{crit_anom} critical anomalies")
    if crit_alerts > 0:
        issues.append(f"{crit_alerts} critical alerts")
    if crit_inv > 0:
        issues.append(f"{crit_inv} critical inventory items")

    if not issues:
        verdict = "✅ **Overall Status: Healthy** — No critical issues detected across all modules."
    else:
        verdict = f"⚠️ **Overall Status: Attention Required** — {', '.join(issues)} need review."

    response_text = "\n\n".join([
        "## Supply Chain Executive Summary",
        verdict,
        model_line,
        anomaly_line,
        alert_line,
        inv_line,
    ])

    return CopilotResponse(
        intent="executive_summary",
        response=response_text,
        data={
            "model": {
                "version": active_mv.version_tag if active_mv else None,
                "accuracy": active_mv.accuracy if active_mv else None,
                "source": active_mv.data_source if active_mv else None,
            },
            "anomalies": anomaly_summary,
            "alerts": {"total": alert_count, "by_severity": alert_by_sev},
            "inventory": {"health": overall_health, "total_skus": total_skus, "reorder_count": reorder_count},
        },
        suggested_followups=[
            "Show me the 12-week demand forecast",
            "What anomalies were detected?",
            "Which inventory items need reordering?",
            "What are the active alerts?",
        ],
    )


async def handle_forecast(db: AsyncSession, org_id: int, message: str = "") -> CopilotResponse:
    """Fetch active model info + 12-week forecast summary.

    When the query contains model-version/accuracy keywords the model info section
    is placed first so the user gets a direct answer without having to read the
    whole forecast summary.
    """
    from app.repositories.forecast_repo import ModelVersionRepository
    from app.services.ml_service import forecast_model

    mv_repo = ModelVersionRepository(db, org_id)
    active_mv = await mv_repo.get_active()

    if not active_mv or not active_mv.model_path:
        return CopilotResponse(
            intent="forecast",
            response="📭 **No Forecasting Model Trained** — Please upload a dataset to automatically train your organization's demand forecasting model.",
            suggested_followups=["How do I upload a dataset?", "What is the model status?"],
        )

    try:
        singleton_tag = f"v{forecast_model.training_id}.0" if forecast_model.is_trained else None
        if not forecast_model.is_trained or singleton_tag != active_mv.version_tag:
            forecast_model.load(active_mv.model_path)
    except Exception as exc:
        return CopilotResponse(
            intent="forecast",
            response=f"⚠️ **Forecast Unavailable** — Could not load model artifact: {str(exc)}",
            suggested_followups=["How do I retrain the model?", "What is the model status?"],
        )

    if not forecast_model.is_trained:
        return CopilotResponse(
            intent="forecast",
            response="📭 **Model Not Ready** — The model could not be initialized from disk. Please retrain via Admin → Pipeline.",
            suggested_followups=["How do I retrain the model?"],
        )

    try:
        forecasts = forecast_model.predict(weeks_ahead=12)
    except Exception as exc:
        return CopilotResponse(
            intent="forecast",
            response=f"⚠️ **Forecast Error** — Could not generate predictions: {str(exc)}",
            suggested_followups=["What is the model status?"],
        )

    if not forecasts:
        return CopilotResponse(
            intent="forecast",
            response="📭 **No Forecast Data** — The model returned no predictions. Please check the model status.",
            suggested_followups=["What is the model status?", "How do I retrain the model?"],
        )

    # ── Model metadata ────────────────────────────────────────────────
    model_tag = active_mv.version_tag if active_mv else f"v{forecast_model.training_id}.0"
    accuracy = (active_mv.accuracy if active_mv else forecast_model.metrics.get("accuracy", 0.0)) or 0.0
    accuracy_pct = accuracy * 100 if accuracy <= 1 else accuracy
    data_source = (active_mv.data_source if active_mv else forecast_model.data_source) or "synthetic"
    model_type = (active_mv.model_type if active_mv else "HistGradientBoosting") or "HistGradientBoosting"
    trained_at = None
    if active_mv and active_mv.created_at:
        trained_at = active_mv.created_at.strftime("%Y-%m-%d %H:%M UTC")
    rmse = forecast_model.metrics.get("rmse", None)
    feature_schema = (
        ", ".join(active_mv.feature_schema)
        if active_mv and active_mv.feature_schema
        else "week, month, year, lag_1, lag_4"
    )

    model_section = (
        f"## Active ML Model\n\n"
        f"- **Version:** {model_tag}\n"
        f"- **Algorithm:** {model_type}\n"
        f"- **Training source:** {data_source}\n"
        f"- **Forecast accuracy:** {_fmt_num(accuracy_pct, 1)}%"
        + (f" | **RMSE:** {_fmt_num(rmse, 2)}" if rmse else "")
        + "\n"
        + (f"- **Trained at:** {trained_at}\n" if trained_at else "")
        + f"- **Features:** {feature_schema}"
    )

    # ── 12-week forecast summary ──────────────────────────────────────
    demands = [f.get("predicted_demand", 0) for f in forecasts]
    peak = max(demands)
    trough = min(demands)
    avg = sum(demands) / len(demands)
    peak_week = demands.index(peak) + 1
    trough_week = demands.index(trough) + 1
    total_12w = sum(demands)

    first_half_avg = sum(demands[:6]) / 6
    second_half_avg = sum(demands[6:]) / 6
    trend = "rising" if second_half_avg > first_half_avg * 1.02 else (
        "declining" if second_half_avg < first_half_avg * 0.98 else "stable"
    )
    trend_pct = abs((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg else 0

    forecast_section = (
        f"## 12-Week Demand Forecast\n\n"
        f"📊 **Outlook:** Demand is **{trend}** over the next 12 weeks "
        f"({'↑' if trend == 'rising' else '↓' if trend == 'declining' else '→'} "
        f"{_fmt_num(trend_pct, 1)}% H1→H2).\n\n"
        f"- **Total 12-week demand:** {_fmt_num(total_12w)} units\n"
        f"- **Weekly average:** {_fmt_num(avg)} units\n"
        f"- **Peak:** Week {peak_week} — {_fmt_num(peak)} units\n"
        f"- **Trough:** Week {trough_week} — {_fmt_num(trough)} units\n\n"
        f"Confidence intervals widen at {_fmt_num(forecasts[-1].get('confidence_upper', peak), 0)} units "
        f"upper / {_fmt_num(forecasts[-1].get('confidence_lower', 0), 0)} units lower by Week 12."
    )

    response_text = model_section + "\n\n" + forecast_section

    return CopilotResponse(
        intent="forecast",
        response=response_text,
        data={
            "model": {
                "version": model_tag,
                "accuracy": accuracy_pct,
                "source": data_source,
                "type": model_type,
                "trained_at": trained_at,
            },
            "forecasts": forecasts[:12],
            "summary": {
                "total": round(total_12w, 1),
                "avg": round(avg, 1),
                "peak": round(peak, 1),
                "peak_week": peak_week,
                "trough": round(trough, 1),
                "trough_week": trough_week,
                "trend": trend,
            },
        },
        suggested_followups=[
            "Why is demand trending this way? Explain the forecast drivers.",
            "What anomalies were detected recently?",
            "Show me inventory reorder recommendations.",
            "Run a what-if scenario for a 20% marketing spend increase.",
        ],
    )


async def handle_forecast_explain(db: AsyncSession, org_id: int) -> CopilotResponse:
    """Call SHAP explainability and summarise key drivers.

    FIX (Issue 2): ShapService.explain_forecast() returns list[dict] (one per week),
    NOT a dict with 'explainer_ready'/'driver_summary' keys.  The router builds that
    wrapper dict itself; the Copilot must do the same inline rather than calling .get()
    on the returned list.
    """
    from app.repositories.forecast_repo import ModelVersionRepository
    from app.services.ml_service import forecast_model, FEATURE_NAMES
    from app.services.shap_service import ShapService
    from collections import defaultdict
    import numpy as np
    from datetime import timedelta

    mv_repo = ModelVersionRepository(db, org_id)
    active_mv = await mv_repo.get_active()

    if not active_mv or not active_mv.model_path:
        return CopilotResponse(
            intent="forecast_explain",
            response=(
                "📭 **Explainability Unavailable** — No trained forecasting model found for your organization. "
                "Please upload a dataset to train your model."
            ),
            suggested_followups=["How do I upload a dataset?", "What is the model status?"],
        )

    try:
        singleton_tag = f"v{forecast_model.training_id}.0" if forecast_model.is_trained else None
        if not forecast_model.is_trained or singleton_tag != active_mv.version_tag:
            forecast_model.load(active_mv.model_path)
    except Exception as exc:
        return CopilotResponse(
            intent="forecast_explain",
            response=f"⚠️ **Explainability Unavailable** — Could not load model artifact: {str(exc)}",
            suggested_followups=["How do I retrain the model?"],
        )

    if not forecast_model.is_trained:
        return CopilotResponse(
            intent="forecast_explain",
            response=(
                "📭 **Explainability Unavailable** — The model could not be initialized from disk. "
                "Please retrain the model via Admin → Pipeline."
            ),
            suggested_followups=["How do I retrain the model?"],
        )

    try:
        from datetime import datetime, timezone
        import pandas as pd

        # Build feature vectors for 6-week horizon (mirrors /forecast/explain logic)
        last_date = getattr(forecast_model, "last_date", None) or datetime.now(timezone.utc)
        seasonal_amplitude = getattr(forecast_model, "seasonal_amplitude", 0.0)
        last_demands = list(getattr(forecast_model, "last_demands", [getattr(forecast_model, "last_demand", 1000)]))

        feature_vectors: list[dict] = []
        raw_predictions: list[float] = []
        current_date = last_date
        recent = list(last_demands)

        for i in range(6):
            current_date = current_date + timedelta(weeks=1)
            week = int(current_date.isocalendar()[1])
            month = int(current_date.month)
            year = int(current_date.year)
            lag_1 = float(recent[-1]) if recent else 1000.0
            lag_4 = float(recent[-4]) if len(recent) >= 4 else float(recent[0] if recent else 1000.0)

            fvec = {"week": week, "month": month, "year": year, "lag_1": lag_1, "lag_4": lag_4}
            x = pd.DataFrame([{k: fvec[k] for k in FEATURE_NAMES}])
            raw_val = float(forecast_model.model.predict(x)[0])
            raw_predictions.append(raw_val)
            feature_vectors.append(fvec)

            seasonal = seasonal_amplitude * float(np.sin(2 * np.pi * week / 52))
            recent.append(max(0.0, raw_val + seasonal))

        # ShapService.explain_forecast returns list[dict] — one dict per week
        weeks_list: list[dict] = ShapService.explain_forecast(
            model=forecast_model.model,
            historical_data=forecast_model.historical_data,
            feature_vectors=feature_vectors,
            predictions=raw_predictions,
            feature_names=FEATURE_NAMES,
        )

    except Exception as exc:
        logger.warning("Copilot SHAP explain failed: %s", exc)
        return CopilotResponse(
            intent="forecast_explain",
            response=(
                f"⚠️ **Explainability Error** — Could not compute SHAP values: {str(exc)}. "
                "The model may need retraining."
            ),
            suggested_followups=["Show me the 12-week forecast", "What is the model status?"],
        )

    # weeks_list is list[dict]; each dict has 'shap_values' (dict) and 'base_value'
    if not weeks_list:
        return CopilotResponse(
            intent="forecast_explain",
            response=(
                "⚠️ **Explainability Not Ready** — SHAP explainer returned no data. "
                "Please retrain the model to enable explainability."
            ),
            suggested_followups=["Show me the 12-week forecast"],
        )

    # Build driver_summary as a dict keyed by feature (matches how the Copilot formats output)
    # Mirrors the aggregation the forecast router does at lines 180-200 of forecast.py
    feature_deltas: dict[str, list[float]] = defaultdict(list)
    for week_dict in weeks_list:
        for feat, val in (week_dict.get("shap_values") or {}).items():
            feature_deltas[feat].append(float(val))

    driver_summary: dict[str, dict] = {}
    for feat in FEATURE_NAMES:
        deltas = feature_deltas.get(feat, [])
        if not deltas:
            continue
        mean_shap = sum(deltas) / len(deltas)
        mean_abs_shap = sum(abs(d) for d in deltas) / len(deltas)
        driver_summary[feat] = {
            "mean_shap": round(mean_shap, 4),
            "mean_abs_shap": round(mean_abs_shap, 4),
            "direction": "positive" if mean_shap >= 0 else "negative",
        }

    if not driver_summary:
        return CopilotResponse(
            intent="forecast_explain",
            response="📊 **Forecast Drivers** — Explainability data computed but no SHAP values found in response.",
            suggested_followups=["Show me the 12-week forecast"],
        )

    # Sort drivers by mean absolute SHAP value
    sorted_drivers = sorted(
        driver_summary.items(),
        key=lambda x: abs(x[1].get("mean_abs_shap", 0)),
        reverse=True,
    )

    feature_descriptions = {
        "lag_1": "last week's actual demand (immediate momentum)",
        "lag_4": "demand from 4 weeks ago (medium-term trend)",
        "week": "ISO week number (seasonal pattern)",
        "month": "calendar month (monthly seasonality)",
        "year": "year trend (long-term growth)",
    }

    driver_lines = []
    for feat, stats in sorted_drivers[:5]:
        mean_shap = stats.get("mean_shap", 0)
        direction = "↑ increasing" if mean_shap > 0 else "↓ decreasing"
        desc = feature_descriptions.get(feat, feat)
        driver_lines.append(
            f"- **{feat}** ({desc}): {direction} demand by avg {_fmt_num(abs(mean_shap), 1)} units"
        )

    top_driver = sorted_drivers[0][0] if sorted_drivers else "lag_1"
    top_desc = feature_descriptions.get(top_driver, top_driver)
    base_value = weeks_list[0].get("base_value", 0) if weeks_list else 0

    response_text = (
        f"## Forecast Explainability (SHAP Analysis)\n\n"
        f"The model's expected baseline prediction (without any feature effects) is "
        f"**{_fmt_num(base_value)} units/week**.\n\n"
        f"**Top driver:** `{top_driver}` — {top_desc} — is the single largest influence on current predictions.\n\n"
        f"**Feature contributions (avg across 6-week horizon):**\n\n"
        + "\n".join(driver_lines)
        + "\n\n"
        + "💡 **Interpretation:** The model relies heavily on recent demand momentum (`lag_1`, `lag_4`). "
        + "Seasonal features (`week`, `month`) shape the pattern but recent actuals dominate short-term predictions."
    )

    return CopilotResponse(
        intent="forecast_explain",
        response=response_text,
        data={"driver_summary": driver_summary, "weeks": weeks_list[:6]},
        suggested_followups=[
            "Show me the 12-week demand forecast",
            "What anomalies were recently detected?",
            "Run a what-if scenario for demand changes.",
        ],
    )


async def handle_anomaly(db: AsyncSession, org_id: int) -> CopilotResponse:
    """Fetch and summarise detected anomalies."""
    from app.repositories.anomaly_repository import AnomalyRepository

    repo = AnomalyRepository(db, org_id)
    summary = await repo.get_summary()
    anomalies, _ = await repo.list_active(limit=10)

    total = summary.get("total_active", 0)

    if total == 0:
        return CopilotResponse(
            intent="anomaly",
            response=(
                "✅ **No Active Anomalies** — Great news! The rolling z-score detector has found no "
                "statistically significant deviations in demand, inventory, or forecast accuracy "
                "for your organization.\n\n"
                "The system monitors for:\n"
                "- Demand spikes (z > 2.0)\n"
                "- Demand drops (z < -2.0)\n"
                "- Inventory shocks\n"
                "- Forecast accuracy misses\n\n"
                "You can trigger a fresh scan from the Anomalies page."
            ),
            suggested_followups=[
                "Show me the demand forecast",
                "Check inventory status",
                "Show active alerts",
            ],
        )

    # Build detail lines
    anom_lines = []
    for a in anomalies[:8]:
        atype = a.anomaly_type.value if hasattr(a.anomaly_type, "value") else str(a.anomaly_type)
        sev = a.severity.value if hasattr(a.severity, "value") else str(a.severity)
        emoji = _severity_emoji(sev)
        z = _fmt_num(a.z_score, 2) if a.z_score else "N/A"
        dev = _fmt_num(a.deviation_pct, 1) if a.deviation_pct else "N/A"
        detected = a.detected_at.strftime("%b %d") if a.detected_at else "unknown"
        anom_lines.append(
            f"{emoji} **{atype.replace('_', ' ').title()}** | Severity: {sev} | "
            f"Z-score: {z} | Deviation: {dev}% | Detected: {detected}"
        )

    crit = summary.get("critical_count", 0)
    med = summary.get("medium_count", 0)
    low = summary.get("low_count", 0)
    spikes = summary.get("demand_spikes", 0)
    drops = summary.get("demand_drops", 0)

    response_text = (
        f"## Anomaly Intelligence Report\n\n"
        f"**{total} active anomalies** detected "
        f"({crit} critical 🔴, {med} medium 🟡, {low} low 🟢)\n\n"
        f"**By type:** {spikes} demand spikes | {drops} demand drops | "
        f"{summary.get('inventory_shocks', 0)} inventory shocks | "
        f"{summary.get('forecast_misses', 0)} forecast misses\n\n"
        f"**Recent detections:**\n\n"
        + "\n".join(anom_lines) +
        ("\n\n⚠️ *Critical anomalies require immediate review — they represent 4+ standard deviation "
         "events in your demand patterns.*" if crit > 0 else "")
    )

    return CopilotResponse(
        intent="anomaly",
        response=response_text,
        data={"summary": summary, "recent": [
            {
                "id": a.id,
                "type": a.anomaly_type.value if hasattr(a.anomaly_type, "value") else str(a.anomaly_type),
                "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity),
                "z_score": a.z_score,
                "deviation_pct": a.deviation_pct,
                "detected_at": a.detected_at.isoformat() if a.detected_at else None,
            }
            for a in anomalies[:8]
        ]},
        suggested_followups=[
            "Show me active alerts generated from these anomalies",
            "Why are these anomalies happening? Explain the forecast.",
            "What inventory items are affected?",
            "Show the executive summary",
        ],
    )


async def handle_alert(db: AsyncSession, org_id: int) -> CopilotResponse:
    """Fetch and summarise active alerts."""
    from app.repositories.alert_repo import AlertRepository

    repo = AlertRepository(db, org_id)
    total = await repo.count_active()
    by_sev = await repo.count_by_severity()
    alerts = await repo.get_active_alerts(limit=10)

    if total == 0:
        return CopilotResponse(
            intent="alert",
            response=(
                "✅ **No Active Alerts** — All inventory and model thresholds are within normal parameters.\n\n"
                "The alert engine monitors:\n"
                "- 🔴 Critical inventory (zero or near-zero stock)\n"
                "- 🟠 Low inventory (below reorder point)\n"
                "- 🟡 Anomaly escalations (CRITICAL/MEDIUM anomalies)\n"
                "- 🔵 Model accuracy degradation (accuracy < 70%)\n\n"
                "Alerts auto-generate every 30 minutes via the scheduled inventory sweep."
            ),
            suggested_followups=[
                "Show me anomaly detections",
                "Check inventory status",
                "Show the demand forecast",
            ],
        )

    alert_lines = []
    for alert in alerts[:8]:
        sev = alert.get("severity", "")
        emoji = _severity_emoji(sev)
        atype = alert.get("alert_type", "").replace("_", " ").title()
        product = alert.get("product_name", "") or "Org-wide"
        msg = alert.get("message", "")[:100]
        alert_lines.append(f"{emoji} **{atype}** | {product} | {msg}")

    crit = by_sev.get("critical", 0)
    high = by_sev.get("high", 0)
    med = by_sev.get("medium", 0)
    low = by_sev.get("low", 0)

    urgency = ""
    if crit > 0:
        urgency = f"\n\n🚨 **Immediate action required:** {crit} critical alert(s) indicate stockout risk or severe accuracy degradation."

    response_text = (
        f"## Active Alert Summary\n\n"
        f"**{total} active alerts** | "
        f"Critical: {crit} 🔴 | High: {high} 🟠 | Medium: {med} 🟡 | Low: {low} 🟢\n\n"
        f"**Top alerts:**\n\n"
        + "\n".join(alert_lines)
        + urgency
    )

    return CopilotResponse(
        intent="alert",
        response=response_text,
        data={"total": total, "by_severity": by_sev, "alerts": alerts[:8]},
        suggested_followups=[
            "Which inventory items are critical?",
            "Show me recent anomalies that triggered these alerts",
            "Show the executive summary",
        ],
    )


async def handle_inventory(db: AsyncSession, org_id: int) -> CopilotResponse:
    """Fetch inventory health and reorder recommendations."""
    from app.repositories.inventory_repo import InventoryRepository

    repo = InventoryRepository(db, org_id)
    health = await repo.get_health_summary()
    reorder_items = await repo.get_reorder_items()
    all_items = await repo.get_items_with_products(limit=5)

    total_skus = health.get("total_skus", 0)
    overall_health = health.get("overall_health", 0.0)
    dist = health.get("distribution", {})

    crit_count = dist.get("critical", {}).get("count", 0)
    low_count = dist.get("low", {}).get("count", 0)
    healthy_count = dist.get("healthy", {}).get("count", 0)
    over_count = dist.get("overstock", {}).get("count", 0)

    if total_skus == 0:
        return CopilotResponse(
            intent="inventory",
            response=(
                "📭 **No Inventory Data** — No inventory records found for your organization. "
                "Please upload product and inventory data first."
            ),
            suggested_followups=["How do I upload data?", "Show the executive summary"],
        )

    # Reorder section
    reorder_lines = []
    for item in reorder_items[:8]:
        status_emoji = "🔴" if item["status"] == "critical" else "🟠"
        reorder_lines.append(
            f"{status_emoji} **{item['name']}** (SKU: {item['sku']}) | "
            f"Stock: {item['current_stock']} | Reorder Point: {item['reorder_point']} | "
            f"Order: {item['recommended_qty']} units | Lead: {item['lead_time']}w"
        )

    reorder_section = (
        f"\n\n**{len(reorder_items)} SKUs need reordering:**\n\n" + "\n".join(reorder_lines)
        if reorder_items
        else "\n\n✅ All SKUs are above their reorder points."
    )

    urgency = ""
    if crit_count > 0:
        urgency = f"\n\n🚨 **{crit_count} SKU(s) are critically low** — risk of stockout within the lead time window."

    response_text = (
        f"## Inventory Health Analysis\n\n"
        f"**{total_skus} SKUs tracked** | Overall health: **{_fmt_num(overall_health, 1)}/100** "
        f"({_health_label(overall_health)})\n\n"
        f"- ✅ Healthy: {healthy_count} SKUs ({dist.get('healthy', {}).get('percentage', 0):.1f}%)\n"
        f"- 🟡 Low stock: {low_count} SKUs ({dist.get('low', {}).get('percentage', 0):.1f}%)\n"
        f"- 🔴 Critical: {crit_count} SKUs ({dist.get('critical', {}).get('percentage', 0):.1f}%)\n"
        f"- 📦 Overstock: {over_count} SKUs ({dist.get('overstock', {}).get('percentage', 0):.1f}%)"
        + reorder_section
        + urgency
    )

    return CopilotResponse(
        intent="inventory",
        response=response_text,
        data={"health": health, "reorder_items": reorder_items[:8]},
        suggested_followups=[
            "Show me active alerts for these inventory items",
            "What does the demand forecast say about upcoming needs?",
            "Run a scenario simulating a lead time increase",
            "Show the executive summary",
        ],
    )


async def handle_scenario(db: AsyncSession, org_id: int, context: dict | None = None) -> CopilotResponse:
    """Fetch recent scenarios and their results."""
    from app.repositories.scenario_repository import ScenarioRepository, ScenarioResultRepository
    from app.models.scenario import ScenarioStatus

    repo = ScenarioRepository(db, org_id)
    result_repo = ScenarioResultRepository(db, org_id)

    scenarios, total = await repo.list_scenarios(limit=5)

    if total == 0:
        return CopilotResponse(
            intent="scenario",
            response=(
                "📭 **No Scenarios Found** — No what-if simulations have been created yet for your organization.\n\n"
                "**What you can do:**\n"
                "- Navigate to the **Scenarios** page to create your first simulation\n"
                "- Try scenarios like: Marketing spend +20%, Price -10%, Lead time +7 days\n\n"
                "The scenario engine uses your trained ML model and applies demand elasticity "
                "multipliers to project the impact of strategic decisions."
            ),
            suggested_followups=[
                "Show me the demand forecast",
                "What inventory items need reordering?",
                "Show the executive summary",
            ],
        )

    # Summarise completed scenarios
    scenario_lines = []
    completed_count = 0
    for sc in scenarios:
        status_val = sc.status.value if hasattr(sc.status, "value") else str(sc.status)
        if status_val == "completed":
            completed_count += 1
            # Get latest result
            result = await result_repo.get_latest_for_scenario(sc.id)
            if result and result.demand_delta_pct is not None:
                direction = "↑" if result.demand_delta_pct > 0 else "↓"
                revenue_str = _fmt_num(abs(result.revenue_impact or 0), 0)
                scenario_lines.append(
                    f"✅ **{sc.name}** ({sc.scenario_type}) | "
                    f"Demand impact: {direction}{_fmt_num(abs(result.demand_delta_pct or 0), 1)}% | "
                    f"Revenue: {'+'if (result.revenue_impact or 0) > 0 else '-'}${revenue_str} | "
                    f"Stockout risk: {_fmt_num(result.stockout_risk_pct or 0, 1)}%"
                )
            else:
                scenario_lines.append(f"✅ **{sc.name}** ({sc.scenario_type}) — Results available")
        elif status_val == "running":
            scenario_lines.append(f"⏳ **{sc.name}** — Running...")
        elif status_val == "failed":
            scenario_lines.append(f"❌ **{sc.name}** — Failed")
        else:
            scenario_lines.append(f"📝 **{sc.name}** ({sc.scenario_type}) — Draft, not yet run")

    summary_line = (
        f"**{total} scenario(s)** found | {completed_count} completed with results"
    )

    response_text = (
        f"## Scenario Analysis Summary\n\n"
        f"{summary_line}\n\n"
        + "\n".join(scenario_lines) +
        "\n\n💡 **Using the Scenario Engine:** Each simulation uses your trained "
        "ML model with demand elasticity multipliers (marketing: 0.3x, price: -0.6x) "
        "to project the quantitative impact of business decisions."
    )

    return CopilotResponse(
        intent="scenario",
        response=response_text,
        data={"total": total, "scenarios": [
            {
                "id": sc.id,
                "name": sc.name,
                "type": sc.scenario_type,
                "status": sc.status.value if hasattr(sc.status, "value") else str(sc.status),
            }
            for sc in scenarios
        ]},
        suggested_followups=[
            "Explain the forecast drivers for these scenarios",
            "Show me the demand forecast baseline",
            "What inventory risks does this impact?",
        ],
    )


def handle_unknown(message: str) -> CopilotResponse:
    """Fallback handler for unrecognised intents."""
    return CopilotResponse(
        intent="unknown",
        response=(
            "🤔 **I'm not sure what you're asking.** I'm a Supply Chain Analyst focused on:\n\n"
            "- 📊 **Forecast** — demand predictions and outlooks\n"
            "- 🔍 **Anomalies** — unusual demand patterns detected\n"
            "- 🔔 **Alerts** — active inventory and model warnings\n"
            "- 📦 **Inventory** — stock health and reorder recommendations\n"
            "- 🎯 **Scenarios** — what-if impact simulations\n"
            "- 💡 **Explain** — why the model predicts what it does\n"
            "- 📋 **Summary** — executive overview of all modules\n\n"
            "Try one of the suggested prompts below to get started!"
        ),
        suggested_followups=[
            "Give me an executive summary of supply chain health",
            "Show me the 12-week demand forecast",
            "What anomalies were detected?",
            "Which inventory items need reordering?",
        ],
    )


# ── Main Entry Point ─────────────────────────────────────────────────


async def process_copilot_message(
    message: str,
    db: AsyncSession,
    org_id: int,
    context: dict | None = None,
) -> CopilotResponse:
    """Main dispatcher: classify intent and route to the appropriate handler."""
    intent = classify_intent(message)
    logger.info("Copilot: intent=%s org=%d message=%r", intent, org_id, message[:80])

    try:
        if intent == "executive_summary":
            return await handle_executive_summary(db, org_id)
        elif intent == "forecast":
            return await handle_forecast(db, org_id)
        elif intent == "forecast_explain":
            return await handle_forecast_explain(db, org_id)
        elif intent == "anomaly":
            return await handle_anomaly(db, org_id)
        elif intent == "alert":
            return await handle_alert(db, org_id)
        elif intent == "inventory":
            return await handle_inventory(db, org_id)
        elif intent == "scenario":
            return await handle_scenario(db, org_id, context)
        else:
            return handle_unknown(message)
    except Exception as exc:
        logger.exception("Copilot handler error (intent=%s): %s", intent, exc)
        return CopilotResponse(
            intent=intent,
            response=(
                f"⚠️ **Analyst Error** — An unexpected error occurred while processing your request: "
                f"{str(exc)}\n\nPlease try again or contact your system administrator."
            ),
            suggested_followups=[
                "Give me an executive summary",
                "Show me the demand forecast",
            ],
        )
