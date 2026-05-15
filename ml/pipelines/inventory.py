"""
Inventory Optimization Service.
Migrated from notebook/07_inventory_optimization.ipynb

Implements safety stock, reorder point, and inventory health calculations
using standard logistics formulas with a 95% service level.
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

# Z-score for 95% service level
Z_SCORE_95 = stats.norm.ppf(0.95)  # ≈ 1.645


class InventoryOptimizer:
    """Inventory optimization engine for safety stock and reorder calculations."""

    def __init__(self, service_level: float = 0.95, default_lead_time_weeks: int = 2):
        self.service_level = service_level
        self.z_score = stats.norm.ppf(service_level)
        self.default_lead_time = default_lead_time_weeks

    def calculate_safety_stock(
        self,
        demand_std: float,
        lead_time_weeks: int | None = None,
    ) -> float:
        """Calculate safety stock using the formula: SS = Z × σ × √LT

        Args:
            demand_std: Standard deviation of weekly demand.
            lead_time_weeks: Lead time in weeks.

        Returns:
            Safety stock quantity (rounded up to nearest integer).
        """
        lt = lead_time_weeks or self.default_lead_time
        ss = self.z_score * demand_std * np.sqrt(lt)
        return float(np.ceil(ss))

    def calculate_reorder_point(
        self,
        avg_weekly_demand: float,
        lead_time_weeks: int | None = None,
        safety_stock: float | None = None,
        demand_std: float | None = None,
    ) -> float:
        """Calculate reorder point: ROP = (Demand × Lead Time) + Safety Stock

        Args:
            avg_weekly_demand: Average weekly demand.
            lead_time_weeks: Lead time in weeks.
            safety_stock: Pre-calculated safety stock (optional).
            demand_std: Demand std dev (used if safety_stock not provided).

        Returns:
            Reorder point quantity (rounded up).
        """
        lt = lead_time_weeks or self.default_lead_time
        if safety_stock is None:
            if demand_std is None:
                raise ValueError("Either safety_stock or demand_std must be provided")
            safety_stock = self.calculate_safety_stock(demand_std, lt)
        rop = (avg_weekly_demand * lt) + safety_stock
        return float(np.ceil(rop))

    def calculate_economic_order_qty(
        self,
        annual_demand: float,
        ordering_cost: float = 50.0,
        holding_cost_pct: float = 0.25,
        unit_cost: float = 10.0,
    ) -> float:
        """Calculate Economic Order Quantity (EOQ).

        EOQ = √(2 × D × S / H)

        Args:
            annual_demand: Total annual demand.
            ordering_cost: Cost per order placed.
            holding_cost_pct: Annual holding cost as % of unit cost.
            unit_cost: Cost per unit.

        Returns:
            Economic order quantity.
        """
        holding_cost = holding_cost_pct * unit_cost
        if holding_cost <= 0:
            return annual_demand / 12  # fallback to monthly
        eoq = np.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
        return float(np.ceil(eoq))

    def classify_inventory_status(
        self,
        current_stock: float,
        safety_stock: float,
        reorder_point: float,
        max_capacity: float | None = None,
    ) -> str:
        """Classify inventory health status.

        Returns one of: 'critical', 'low', 'healthy', 'overstock'
        """
        if current_stock <= safety_stock * 0.3:
            return "critical"
        elif current_stock <= safety_stock:
            return "low"
        elif max_capacity and current_stock > max_capacity:
            return "overstock"
        elif current_stock <= reorder_point:
            return "low"
        else:
            return "healthy"

    def calculate_health_score(
        self,
        current_stock: float,
        safety_stock: float,
        reorder_point: float,
        max_capacity: float | None = None,
    ) -> int:
        """Calculate inventory health score from 0-100.

        100 = optimal stock level, 0 = stockout.
        """
        if current_stock <= 0:
            return 0

        optimal = reorder_point * 1.5  # ideal stock level
        if max_capacity:
            optimal = min(optimal, max_capacity * 0.7)

        if current_stock <= safety_stock * 0.3:
            return max(0, int((current_stock / (safety_stock * 0.3)) * 25))
        elif current_stock <= safety_stock:
            return 25 + int(((current_stock - safety_stock * 0.3) / (safety_stock * 0.7)) * 25)
        elif current_stock <= optimal:
            return 50 + int(((current_stock - safety_stock) / (optimal - safety_stock)) * 50)
        elif max_capacity and current_stock > max_capacity:
            excess = (current_stock - max_capacity) / max_capacity
            return max(30, int(80 - excess * 50))
        else:
            return 85

    def optimize_product(
        self,
        product_id: int,
        product_name: str,
        demand_history: List[float],
        current_stock: float,
        lead_time_weeks: int | None = None,
        unit_cost: float = 10.0,
        max_capacity: float | None = None,
    ) -> Dict:
        """Run full inventory optimization for a single product.

        Args:
            product_id: Product identifier.
            product_name: Human-readable product name.
            demand_history: List of historical weekly demand values.
            current_stock: Current stock on hand.
            lead_time_weeks: Supplier lead time in weeks.
            unit_cost: Cost per unit.
            max_capacity: Maximum warehouse capacity for this product.

        Returns:
            Dictionary with all optimization results.
        """
        lt = lead_time_weeks or self.default_lead_time
        demand_arr = np.array(demand_history, dtype=float)

        avg_demand = float(np.mean(demand_arr))
        std_demand = float(np.std(demand_arr, ddof=1)) if len(demand_arr) > 1 else avg_demand * 0.3

        safety_stock = self.calculate_safety_stock(std_demand, lt)
        reorder_point = self.calculate_reorder_point(avg_demand, lt, safety_stock)
        eoq = self.calculate_economic_order_qty(avg_demand * 52, unit_cost=unit_cost)
        status = self.classify_inventory_status(current_stock, safety_stock, reorder_point, max_capacity)
        health = self.calculate_health_score(current_stock, safety_stock, reorder_point, max_capacity)

        # Recommended order quantity
        if current_stock < reorder_point:
            recommended_qty = max(eoq, reorder_point * 1.5 - current_stock)
        else:
            recommended_qty = 0

        # Days until stockout estimate
        days_until_stockout = (current_stock / (avg_demand / 7)) if avg_demand > 0 else float("inf")

        return {
            "product_id": product_id,
            "product_name": product_name,
            "current_stock": current_stock,
            "avg_weekly_demand": round(avg_demand, 1),
            "demand_std": round(std_demand, 1),
            "safety_stock": int(safety_stock),
            "reorder_point": int(reorder_point),
            "economic_order_qty": int(eoq),
            "recommended_order_qty": int(np.ceil(recommended_qty)) if recommended_qty > 0 else 0,
            "lead_time_weeks": lt,
            "inventory_status": status,
            "health_score": health,
            "days_until_stockout": round(days_until_stockout, 1),
            "service_level": self.service_level,
        }
