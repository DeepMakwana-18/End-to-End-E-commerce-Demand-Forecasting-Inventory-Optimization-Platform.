"""
Data Preprocessing Pipeline.
Handles raw Olist e-commerce dataset cleaning and transformation.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def load_olist_data(data_dir: str = "./data/raw") -> pd.DataFrame:
    """Load and merge Olist e-commerce datasets.

    Expects CSV files in the data directory matching Olist naming conventions.
    """
    data_path = Path(data_dir)
    dfs = {}

    csv_files = {
        "orders": "olist_orders_dataset.csv",
        "items": "olist_order_items_dataset.csv",
        "products": "olist_products_dataset.csv",
        "payments": "olist_order_payments_dataset.csv",
        "reviews": "olist_order_reviews_dataset.csv",
        "customers": "olist_customers_dataset.csv",
    }

    for key, filename in csv_files.items():
        filepath = data_path / filename
        if filepath.exists():
            dfs[key] = pd.read_csv(filepath)
            logger.info("Loaded %s: %d rows", filename, len(dfs[key]))
        else:
            logger.warning("File not found: %s", filepath)

    if not dfs:
        raise FileNotFoundError(f"No Olist CSV files found in {data_dir}")

    # Merge datasets
    merged = dfs.get("items", pd.DataFrame())

    if "orders" in dfs and not merged.empty:
        merged = merged.merge(dfs["orders"], on="order_id", how="left")
    if "products" in dfs and not merged.empty:
        merged = merged.merge(dfs["products"], on="product_id", how="left")
    if "payments" in dfs and not merged.empty:
        # Aggregate payments per order
        payments = dfs["payments"].groupby("order_id").agg({
            "payment_value": "sum",
            "payment_installments": "max",
        }).reset_index()
        merged = merged.merge(payments, on="order_id", how="left")
    if "reviews" in dfs and not merged.empty:
        # Average review per order
        reviews = dfs["reviews"].groupby("order_id").agg({
            "review_score": "mean",
        }).reset_index()
        merged = merged.merge(reviews, on="order_id", how="left")

    logger.info("Merged dataset: %d rows, %d columns", len(merged), len(merged.columns))
    return merged


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and preprocess the merged dataset."""
    df = df.copy()

    # Parse dates
    date_cols = [c for c in df.columns if "date" in c.lower() or "timestamp" in c.lower()]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Use order purchase date as primary date
    if "order_purchase_timestamp" in df.columns:
        df["date"] = df["order_purchase_timestamp"]
    elif "shipping_limit_date" in df.columns:
        df["date"] = pd.to_datetime(df["shipping_limit_date"], errors="coerce")

    # Create sales column (quantity * price)
    if "price" in df.columns:
        df["sales"] = df.get("order_item_id", 1) * df["price"]
    else:
        df["sales"] = 1

    # Fill missing values
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    categorical_cols = df.select_dtypes(include=["object"]).columns
    for col in categorical_cols:
        df[col] = df[col].fillna("unknown")

    # Remove outliers (clip extreme values)
    if "price" in df.columns:
        q99 = df["price"].quantile(0.99)
        df["price"] = df["price"].clip(upper=q99)

    if "sales" in df.columns:
        q99 = df["sales"].quantile(0.99)
        df["sales"] = df["sales"].clip(upper=q99)

    # Drop rows without dates
    if "date" in df.columns:
        df = df.dropna(subset=["date"])

    # Sort by date
    if "date" in df.columns:
        df = df.sort_values("date").reset_index(drop=True)

    logger.info("Cleaned dataset: %d rows, %d columns", len(df), len(df.columns))
    return df


def aggregate_daily_sales(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate sales data at the daily product level."""
    if "date" not in df.columns or "product_id" not in df.columns:
        logger.warning("Required columns missing for aggregation")
        return df

    daily = df.groupby([pd.Grouper(key="date", freq="D"), "product_id"]).agg({
        "sales": "sum",
        "price": "mean",
        "order_id": "count",
    }).reset_index()

    daily.rename(columns={"order_id": "order_count"}, inplace=True)
    logger.info("Daily aggregation: %d rows", len(daily))
    return daily


def aggregate_weekly_sales(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate sales data at the weekly product level."""
    if "date" not in df.columns:
        return df

    weekly = df.groupby([pd.Grouper(key="date", freq="W")]).agg({
        "sales": "sum",
        "price": "mean",
    }).reset_index()

    logger.info("Weekly aggregation: %d rows", len(weekly))
    return weekly
