"""Feature Reconstruction — Phase 5A Foundation.

Provides utilities to reconstruct the exact model input feature vectors
from persisted Forecast DB rows or raw demand series.

These functions are the prerequisite for SHAP explainability:
  - reconstruct_feature_matrix()  → full X matrix for a date range
  - get_feature_vector_for_date() → X for a single date (anomaly explain)
  - build_background_dataset()    → representative X sample for SHAP
  - get_model_type_from_artifact()→ read model_type string from pkl state

Feature contract (must stay in sync with ml_service.py):
  Columns : week, month, year, lag_1, lag_4
  Lag 1   : actual_demand from 1 week prior
  Lag 4   : actual_demand from 4 weeks prior
  week    : ISO week number of forecast_date
  month   : calendar month of forecast_date
  year    : calendar year of forecast_date
"""

from __future__ import annotations

import logging
import os
import pickle
from datetime import date, datetime, timedelta
from typing import Optional, Sequence

import numpy as np
import pandas as pd

logger = logging.getLogger("titan.ml.feature_reconstruction")

# ── Feature contract constants ────────────────────────────────────────
FEATURE_NAMES: list[str] = ["week", "month", "year", "lag_1", "lag_4"]
LAG_WINDOWS: list[int] = [1, 4]       # must match ml_service.py
MIN_ROWS_FOR_LAG = 4                   # minimum rows needed for a valid lag_4


# ── Model artifact helpers ─────────────────────────────────────────────

def get_model_type_from_artifact(artifact_path: str) -> str:
    """Read the model_type string stored in a pkl artifact.

    Pre-Phase 5A artifacts did not store model_type in the state dict;
    for those, fall back to reading the estimator's class name directly.

    Returns the model type string (e.g. 'HistGradientBoostingRegressor').
    """
    if not artifact_path or not os.path.exists(artifact_path):
        return "unknown"
    try:
        with open(artifact_path, "rb") as f:
            state = pickle.load(f)
        # Phase 5A+ artifacts store model_type explicitly
        if "model_type" in state:
            return state["model_type"]
        # Pre-5A: derive from the estimator class
        model_obj = state.get("model")
        if model_obj is not None:
            return type(model_obj).__name__
        return "unknown"
    except Exception as exc:
        logger.warning("Could not read model_type from %s: %s", artifact_path, exc)
        return "unknown"


def get_feature_schema_from_artifact(artifact_path: str) -> dict:
    """Return the feature_schema dict from a pkl artifact state.

    Returns {} if the artifact pre-dates Phase 5A or cannot be loaded.
    """
    if not artifact_path or not os.path.exists(artifact_path):
        return {}
    try:
        with open(artifact_path, "rb") as f:
            state = pickle.load(f)
        return state.get("metadata", {}).get("feature_schema", {})
    except Exception as exc:
        logger.warning("Could not read feature_schema from %s: %s", artifact_path, exc)
        return {}


# ── Core reconstruction helpers ────────────────────────────────────────

def _demand_series_to_feature_df(
    dates: list[date | datetime],
    demands: list[float],
) -> pd.DataFrame:
    """Convert parallel date / demand lists into a feature DataFrame.

    Produces one row per input date with columns:
        week, month, year, lag_1, lag_4

    Rows where lag_4 cannot be computed (first 4 rows) are dropped.
    """
    df = pd.DataFrame({"date": dates, "demand": demands})
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    df["week"] = df["date"].dt.isocalendar().week.astype(int)
    df["month"] = df["date"].dt.month.astype(int)
    df["year"] = df["date"].dt.year.astype(int)

    if len(df) >= 2:
        df["lag_1"] = df["demand"].shift(1)
    else:
        df["lag_1"] = df["demand"]

    if len(df) >= MIN_ROWS_FOR_LAG:
        df["lag_4"] = df["demand"].shift(4)
    else:
        df["lag_4"] = df["demand"]

    df = df.dropna(subset=["lag_1", "lag_4"])
    return df[FEATURE_NAMES + ["date", "demand"]].reset_index(drop=True)


def reconstruct_feature_matrix(
    forecast_rows: list,
    *,
    start_date: Optional[date | datetime] = None,
    end_date: Optional[date | datetime] = None,
) -> pd.DataFrame:
    """Reconstruct the full feature matrix from Forecast ORM rows.

    Parameters
    ----------
    forecast_rows : list of Forecast ORM objects
        Must be loaded with actual_demand not None, sorted by forecast_date ASC.
    start_date / end_date : optional date filters applied AFTER lag computation.
        The full series is used for lag computation even if only a window is returned.

    Returns
    -------
    pd.DataFrame with columns: week, month, year, lag_1, lag_4, date, demand.
    Index is reset. Rows with missing lags are dropped.
    """
    if not forecast_rows:
        logger.warning("reconstruct_feature_matrix: no forecast rows provided")
        return pd.DataFrame(columns=FEATURE_NAMES + ["date", "demand"])

    dates: list[datetime] = []
    demands: list[float] = []

    for row in forecast_rows:
        if row.actual_demand is None:
            continue
        dt = row.forecast_date
        if isinstance(dt, datetime):
            pass
        elif isinstance(dt, date):
            dt = datetime.combine(dt, datetime.min.time())
        else:
            continue
        dates.append(dt)
        demands.append(float(row.actual_demand))

    if not dates:
        return pd.DataFrame(columns=FEATURE_NAMES + ["date", "demand"])

    df = _demand_series_to_feature_df(dates, demands)

    # Apply optional date filters
    if start_date is not None:
        start_dt = pd.Timestamp(start_date)
        df = df[df["date"] >= start_dt]
    if end_date is not None:
        end_dt = pd.Timestamp(end_date)
        df = df[df["date"] <= end_dt]

    logger.debug(
        "reconstruct_feature_matrix: %d rows from %s input rows "
        "(start=%s, end=%s)",
        len(df), len(forecast_rows), start_date, end_date,
    )
    return df.reset_index(drop=True)


def get_feature_vector_for_date(
    forecast_rows: list,
    target_date: date | datetime | str,
) -> Optional[pd.DataFrame]:
    """Return a single-row feature DataFrame for a specific date.

    Used for anomaly explanation: given the full demand history and an
    anomaly date, returns the exact feature vector the model would have
    received for that prediction.

    Returns None if the target date is not in the reconstructed matrix
    or there are insufficient lag observations.
    """
    if isinstance(target_date, str):
        target_date = pd.Timestamp(target_date)
    else:
        target_date = pd.Timestamp(target_date)

    df = reconstruct_feature_matrix(forecast_rows)
    if df.empty:
        return None

    mask = df["date"].dt.normalize() == target_date.normalize()
    matched = df[mask]

    if matched.empty:
        # Try nearest week boundary
        df["date_only"] = df["date"].dt.normalize()
        target_norm = target_date.normalize()
        df["dist"] = (df["date_only"] - target_norm).abs()
        closest = df.nsmallest(1, "dist")
        if closest["dist"].iloc[0] <= pd.Timedelta(days=3):
            matched = closest
        else:
            logger.debug(
                "get_feature_vector_for_date: target %s not found in matrix",
                target_date,
            )
            return None

    row = matched[FEATURE_NAMES].iloc[[0]].reset_index(drop=True)
    return row


def build_background_dataset(
    forecast_rows: list,
    n_samples: int = 50,
    *,
    seed: int = 42,
) -> pd.DataFrame:
    """Build a representative background dataset for SHAP TreeExplainer.

    SHAP uses a background dataset to marginalise features. We sample
    evenly-spaced rows from the full history to maximise coverage of
    seasonal patterns.

    Parameters
    ----------
    forecast_rows : list of Forecast ORM objects
    n_samples : number of background samples to return (default 50)
    seed : random seed for reproducibility

    Returns
    -------
    pd.DataFrame with columns matching FEATURE_NAMES.
    Returns all available rows if fewer than n_samples exist.
    """
    df = reconstruct_feature_matrix(forecast_rows)

    if df.empty:
        logger.warning("build_background_dataset: empty feature matrix")
        return pd.DataFrame(columns=FEATURE_NAMES)

    X = df[FEATURE_NAMES]

    if len(X) <= n_samples:
        return X.reset_index(drop=True)

    # Evenly-spaced sample to preserve seasonal coverage
    rng = np.random.default_rng(seed)
    indices = np.linspace(0, len(X) - 1, n_samples, dtype=int)
    # Add a small random jitter to avoid always sampling the same weeks
    jitter = rng.integers(-1, 2, size=n_samples)
    indices = np.clip(indices + jitter, 0, len(X) - 1)
    indices = np.unique(indices)

    return X.iloc[indices].reset_index(drop=True)


# ── Convenience: reconstruct from raw demand series ────────────────────

def reconstruct_from_demand_list(
    dates: list[date | datetime | str],
    demands: list[float],
    *,
    start_date: Optional[date | datetime] = None,
    end_date: Optional[date | datetime] = None,
) -> pd.DataFrame:
    """Reconstruct feature matrix from raw date + demand lists.

    Useful when DB is not available (e.g. in Celery tasks that already
    have the demand series in memory from forecast_model.historical_data).

    Parameters
    ----------
    dates   : list of date/datetime/ISO-string values
    demands : parallel list of demand float values

    Returns
    -------
    pd.DataFrame with columns: week, month, year, lag_1, lag_4, date, demand
    """
    parsed_dates: list[datetime] = []
    for d in dates:
        if isinstance(d, str):
            parsed_dates.append(pd.Timestamp(d).to_pydatetime())
        elif isinstance(d, date) and not isinstance(d, datetime):
            parsed_dates.append(datetime.combine(d, datetime.min.time()))
        else:
            parsed_dates.append(d)  # type: ignore[arg-type]

    df = _demand_series_to_feature_df(parsed_dates, demands)

    if start_date is not None:
        df = df[df["date"] >= pd.Timestamp(start_date)]
    if end_date is not None:
        df = df[df["date"] <= pd.Timestamp(end_date)]

    return df.reset_index(drop=True)
