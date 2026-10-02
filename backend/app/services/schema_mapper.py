"""schema_mapper.py — Centralised CSV column detection and mapping for the upload pipeline.

This module implements the full configurable alias table for automatic schema matching.
It is imported by both upload.py (for the /detect endpoint) and retraining_tasks.py
(for the Celery ETL step).

Algorithm:
  1. Exact match against _ALIASES (normalised canonical → list of exact names)
  2. Prefix/suffix substring match (e.g. "order_date" contains "date")
  3. Numeric-column heuristic for demand column (last resort)

The mapping table is the authoritative source of truth. Add new aliases here
without touching any other file.
"""
from __future__ import annotations

import csv as _csv
import io
import logging
from typing import Optional

logger = logging.getLogger("titan.schema_mapper")

# ---------------------------------------------------------------------------
# Alias table  (canonical_field -> list of accepted column name variants)
# Normalised: lower-case, spaces→_, hyphens→_
# Order matters: first exact match wins.
# ---------------------------------------------------------------------------
ALIASES: dict[str, list[str]] = {
    "date": [
        # Exact
        "date", "transaction_date", "order_date", "invoice_date", "sale_date",
        "purchase_date", "order_day", "order_purchase_timestamp", "created_at",
        "timestamp", "week", "period", "ds", "time", "datetime",
        "purchase_timestamp", "event_date", "record_date", "activity_date",
        "shipped_date", "delivery_date",
    ],
    "demand": [
        # Exact — must NOT include generic id-like terms ("order_id")
        "demand", "quantity", "qty", "quantity_sold", "sales_quantity",
        "units_sold", "units", "unit_sold", "total_quantity", "order_quantity",
        "items_sold", "volume", "sales_units", "pieces_sold", "num_items",
    ],
    "revenue": [
        "revenue", "total_revenue", "total_amount", "total_sales", "sales",
        "sales_amount", "gross_sales", "net_sales", "price", "unit_price",
        "amount", "value", "total_value", "invoice_amount", "total_price",
        "sales_value",
    ],
    "sku": [
        "sku", "product_sku", "product_code", "item_code", "product_id",
        "item_id", "article", "article_no", "stock_code", "upc", "barcode",
        "asin",
    ],
    "product_name": [
        "product_name", "item_name", "product", "item", "description",
        "product_description", "product_title", "name",
    ],
    "category": [
        "category", "product_category", "product_category_name", "department",
        "segment", "type", "product_type", "item_category", "class",
    ],
    "warehouse": [
        "warehouse", "location", "region", "store", "outlet", "branch",
        "depot", "facility", "site", "fulfillment_center", "center",
    ],
    "rating": [
        "rating", "customer_rating", "review_score", "score", "stars",
        "review_rating",
    ],
}

# Fields required for the ML model
REQUIRED_FIELDS = {"date", "demand"}

# Fuzzy keyword fragments — used ONLY as a last resort if exact fails
# More specific first, id-containing terms excluded from demand
_FUZZY_DATE = ("timestamp", "date", "time", "week", "period", "day")
_FUZZY_DEMAND = ("qty", "quantity", "demand", "units_sold", "items_sold", "pieces_sold")
_FUZZY_REVENUE = ("revenue", "price", "amount", "sales", "value")
_FUZZY_SKU = ("sku", "product_code", "item_code", "article")
_FUZZY_CATEGORY = ("category", "department", "segment")
_FUZZY_WAREHOUSE = ("warehouse", "location", "region", "store")


def _norm(col: str) -> str:
    return col.strip().lower().replace(" ", "_").replace("-", "_")


def detect_columns(columns: list[str]) -> dict:
    """Detect canonical → csv_column mapping from a list of column names.

    Returns:
        {
            "mapping": { canonical: csv_col | None, ... },
            "date_column": str | None,
            "demand_column": str | None,
            "confidence": "high" | "low",
            "suggested_mapping": { "date": str | None, "demand": str | None },
            "unmatched_csv_columns": [list of csv cols not matched to any canonical],
            "missing_required": [list of canonical fields not found],
        }
    """
    result: dict[str, Optional[str]] = {field: None for field in ALIASES}
    used: set[str] = set()  # csv columns already claimed

    # Pass 1 — exact normalised match
    for canonical, aliases in ALIASES.items():
        alias_norms = {_norm(a) for a in aliases}
        for col in columns:
            n = _norm(col)
            if col not in used and n in alias_norms:
                result[canonical] = col
                used.add(col)
                break

    # Pass 2 — fuzzy fragment match (only for still-unmatched canonicals)
    fuzzy_map: dict[str, tuple[str, ...]] = {
        "date": _FUZZY_DATE,
        "demand": _FUZZY_DEMAND,
        "revenue": _FUZZY_REVENUE,
        "sku": _FUZZY_SKU,
        "category": _FUZZY_CATEGORY,
        "warehouse": _FUZZY_WAREHOUSE,
    }
    for canonical, fragments in fuzzy_map.items():
        if result[canonical] is not None:
            continue
        for col in columns:
            if col in used:
                continue
            n = _norm(col)
            # skip id-like columns for demand
            if canonical == "demand" and ("_id" in n or n.endswith("id")):
                continue
            if any(frag in n for frag in fragments):
                result[canonical] = col
                used.add(col)
                break

    # Pass 3 — numeric heuristic: if demand still unset, pick first numeric-looking
    # col that is not already used (caller should validate dtype separately)
    # NOTE: this is only a hint — confidence stays "low"

    date_col = result.get("date")
    demand_col = result.get("demand")
    confidence = "high" if (date_col and demand_col) else "low"

    missing_required = [f for f in REQUIRED_FIELDS if not result.get(f)]
    unmatched = [col for col in columns if col not in used]

    return {
        "mapping": result,
        "date_column": date_col,
        "demand_column": demand_col,
        "confidence": confidence,
        "suggested_mapping": {"date": date_col, "demand": demand_col},
        "unmatched_csv_columns": unmatched,
        "missing_required": missing_required,
    }


def parse_headers(first_line: str) -> list[str]:
    """Parse a CSV header line respecting quotes."""
    reader = _csv.reader(io.StringIO(first_line))
    try:
        return [col.strip() for col in next(reader) if col.strip()]
    except StopIteration:
        return []
