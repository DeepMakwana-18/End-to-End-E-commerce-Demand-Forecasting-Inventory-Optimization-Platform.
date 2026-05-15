"""
Feature Engineering Pipeline for demand forecasting.
Extracts temporal, product, and transactional features from raw sales data.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def create_temporal_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Extract temporal features from a date column."""
    df = df.copy()
    dt = pd.to_datetime(df[date_col])
    df["year"] = dt.dt.year
    df["month"] = dt.dt.month
    df["day_of_week"] = dt.dt.dayofweek
    df["day_of_month"] = dt.dt.day
    df["quarter"] = dt.dt.quarter
    df["week_of_year"] = dt.dt.isocalendar().week.astype(int)
    df["is_weekend"] = (dt.dt.dayofweek >= 5).astype(int)
    df["is_month_start"] = dt.dt.is_month_start.astype(int)
    df["is_month_end"] = dt.dt.is_month_end.astype(int)
    return df


def create_lag_features(
    df: pd.DataFrame,
    target_col: str = "sales",
    lags: list[int] | None = None,
) -> pd.DataFrame:
    """Create lag features for time-series forecasting."""
    df = df.copy()
    lags = lags or [1, 2, 3, 4, 7, 14, 28]
    for lag in lags:
        df[f"{target_col}_lag_{lag}"] = df[target_col].shift(lag)
    return df


def create_rolling_features(
    df: pd.DataFrame,
    target_col: str = "sales",
    windows: list[int] | None = None,
) -> pd.DataFrame:
    """Create rolling window statistics."""
    df = df.copy()
    windows = windows or [7, 14, 28]
    for w in windows:
        df[f"{target_col}_rolling_mean_{w}"] = df[target_col].rolling(window=w).mean()
        df[f"{target_col}_rolling_std_{w}"] = df[target_col].rolling(window=w).std()
        df[f"{target_col}_rolling_min_{w}"] = df[target_col].rolling(window=w).min()
        df[f"{target_col}_rolling_max_{w}"] = df[target_col].rolling(window=w).max()
    return df


def encode_categorical(
    df: pd.DataFrame,
    columns: list[str] | None = None,
) -> Tuple[pd.DataFrame, dict]:
    """Label-encode categorical columns."""
    df = df.copy()
    columns = columns or ["product_category_name"]
    encoders = {}
    for col in columns:
        if col in df.columns:
            le = LabelEncoder()
            df[f"{col}_encoded"] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
    return df, encoders


def prepare_features(
    df: pd.DataFrame,
    date_col: str = "date",
    target_col: str = "sales",
    category_cols: list[str] | None = None,
) -> Tuple[pd.DataFrame, dict]:
    """Full feature engineering pipeline.

    Args:
        df: Raw sales DataFrame.
        date_col: Name of the date column.
        target_col: Name of the target variable column.
        category_cols: Categorical columns to encode.

    Returns:
        Tuple of (processed DataFrame, encoders dict).
    """
    logger.info("Starting feature engineering on %d rows", len(df))

    # Sort by date
    df = df.sort_values(date_col).reset_index(drop=True)

    # Temporal features
    df = create_temporal_features(df, date_col)

    # Lag features
    df = create_lag_features(df, target_col)

    # Rolling features
    df = create_rolling_features(df, target_col)

    # Categorical encoding
    df, encoders = encode_categorical(df, category_cols)

    # Drop rows with NaN from lags/rolling
    initial_len = len(df)
    df = df.dropna().reset_index(drop=True)
    logger.info("Feature engineering complete. Rows: %d → %d (dropped %d NaN rows)",
                initial_len, len(df), initial_len - len(df))

    return df, encoders
