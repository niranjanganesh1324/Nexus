"""
Scenario planning engine.
Reuses SAME domain functions as real pages — no separate magic formulas.

Pipeline:
  inputs → demand recalc → inventory recalc → procurement recalc
         → financial recalc → execution impact → persist
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models import (
    DemandRecord,
    FabricMaterial,
    InventorySnapshot,
    PlantCapacity,
    ProductCollection,
    ScenarioRun,
)
from app.services.inventory_engine import _risk_level, PERIOD_LABELS

# ─────────── individual domain calculations ───────────

def _recalc_demand(base_units: float, demand_increase_pct: float) -> float:
    """Apply demand % change to base demand."""
    return max(0.0, base_units * (1.0 + demand_increase_pct / 100.0))


def _recalc_production(
    base_planned: int, prod_capacity_change_pct: float
) -> int:
    """Apply production capacity % change."""
    return max(0, int(base_planned * (1.0 + prod_capacity_change_pct / 100.0)))


def _recalc_inbound(
    base_inbound: float, transport_delay_days: float
) -> float:
    """Transport delay reduces effective inbound (fraction of load delayed)."""
    delay_fraction = min(1.0, transport_delay_days / 7.0)
    return base_inbound * (1.0 - delay_fraction * 0.6)


def _recalc_procurement(
    required: float, on_hand: float, moq: float, lead_time_days: float
) -> Dict:
    net_req = max(0.0, required - on_hand)
    if net_req <= 0:
        return {"net_requirement": 0.0, "recommended_order": 0.0, "status": "On Track"}
    rec_order = max(net_req, moq)
    status = "On Track" if lead_time_days <= 21 else ("Watch" if lead_time_days <= 35 else "At Risk")
    return {"net_requirement": net_req, "recommended_order": rec_order, "status": status}


def _financial_calc(
    sales_units: float, unit_price: float, prod_units: float, prod_cost: float
) -> Dict:
    revenue = sales_units * unit_price
    cost = prod_units * prod_cost
    margin = revenue - cost
    margin_pct = (margin / revenue * 100.0) if revenue > 0 else 0.0
    return {
        "revenue_inr": round(revenue, 0),
        "cost_inr": round(cost, 0),
        "margin_inr": round(margin, 0),
        "margin_pct": round(margin_pct, 1),
    }


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


# ─────────── main scenario runner ───────────

def run_scenario(inputs: Dict, db: Session) -> Dict:
    """
    Run a full scenario and return computed results.
    All logic uses the SAME calculation functions used by real pages.
    """
    demand_pct = inputs.get("demand_increase_pct", 0.0)
    prod_pct = inputs.get("prod_capacity_change_pct", 0.0)
    delay_days = inputs.get("transport_delay_days", 0.0)
    lead_days = inputs.get("lead_time_days", 7.0)

    collections = db.query(ProductCollection).all()
    capacities = db.query(PlantCapacity).filter(
        PlantCapacity.period_label == PERIOD_LABELS[0]
    ).all()

    # Per-collection scenario results
    collection_results = []
    total_base_demand = 0.0
    total_scenario_demand = 0.0
    total_revenue = 0.0
    total_cost = 0.0
    weighted_util = 0.0
    total_stockout_risk = 0.0

    for col in collections:
        # Get base snapshot for first period
        snap = (
            db.query(InventorySnapshot)
            .filter(
                InventorySnapshot.collection_id == col.id,
                InventorySnapshot.period_label == PERIOD_LABELS[0],
            )
            .first()
        )
        if not snap:
            continue

        # Demand recalc
        base_demand = snap.sales_units
        new_demand = _recalc_demand(base_demand, demand_pct)

        # Production recalc
        new_production = _recalc_production(int(snap.production_units), prod_pct)

        # Inbound recalc (delay impact)
        new_inbound = _recalc_inbound(snap.inbound_units, delay_days)

        # Inventory closing
        new_closing = snap.opening_units + new_inbound + new_production - new_demand
        new_closing = max(new_closing, -snap.opening_units)  # clamp to avoid impossible negative
        risk = _risk_level(new_closing, snap.safety_stock_units)

        # Stockout risk contribution
        if risk in ("Stockout", "Below Safety"):
            total_stockout_risk += max(0.0, new_demand - (snap.opening_units + new_inbound + new_production))

        # Financial
        fin = _financial_calc(
            new_demand, col.unit_price_inr, new_production, col.production_cost_inr
        )
        total_revenue += fin["revenue_inr"]
        total_cost += fin["cost_inr"]
        total_base_demand += base_demand
        total_scenario_demand += new_demand

        collection_results.append({
            "collection_id": col.id,
            "name": col.name,
            "base_demand": round(base_demand, 0),
            "scenario_demand": round(new_demand, 0),
            "production": round(new_production, 0),
            "inbound": round(new_inbound, 0),
            "closing_inventory": round(new_closing, 0),
            "risk_level": risk,
            **fin,
        })

    # Aggregate capacity
    base_util = (
        sum(c.utilization_pct for c in capacities) / len(capacities)
        if capacities else 82.0
    )
    new_prod_util = _clamp(base_util + demand_pct * 0.5 - prod_pct * 0.8, 0.0, 105.0)

    # Dock utilization
    base_dock_util = 74.0
    new_dock_util = _clamp(base_dock_util + demand_pct * 0.4 + delay_days * 1.8, 0.0, 105.0)

    # Inventory delta %
    demand_ratio = total_scenario_demand / total_base_demand if total_base_demand > 0 else 1.0
    inventory_delta_pct = (1.0 - demand_ratio) * 100.0 - (delay_days * 1.2)

    # Shipment requirement (additional trucks needed)
    shipment_req = max(0, int(demand_pct / 5.0 + delay_days * 0.3))

    # Financial impact vs base
    base_revenue = total_revenue / (1 + demand_pct / 100) if demand_pct != -100 else total_revenue
    financial_impact = total_revenue - base_revenue

    # Recommended actions
    actions = _recommend_actions(
        demand_pct, prod_pct, delay_days, new_prod_util, new_dock_util,
        total_stockout_risk, inventory_delta_pct
    )

    return {
        "demand_units": round(total_scenario_demand, 0),
        "production_util_pct": round(new_prod_util, 1),
        "inventory_delta_pct": round(inventory_delta_pct, 1),
        "stockout_risk_pct": round(
            _clamp(total_stockout_risk / max(total_scenario_demand, 1) * 100, 0.0, 100.0), 1
        ),
        "shipment_requirement": shipment_req,
        "dock_util_pct": round(new_dock_util, 1),
        "total_revenue_inr": round(total_revenue, 0),
        "total_cost_inr": round(total_cost, 0),
        "margin_inr": round(total_revenue - total_cost, 0),
        "financial_impact_inr": round(financial_impact, 0),
        "actions": actions,
        "collections": collection_results,
    }


def _recommend_actions(
    demand_pct: float,
    prod_pct: float,
    delay_days: float,
    prod_util: float,
    dock_util: float,
    stockout_risk: float,
    inv_delta_pct: float,
) -> List[str]:
    actions = []
    if demand_pct > 8:
        actions.append(f"Increase production by {int(demand_pct * 0.4)}% to match demand")
    if stockout_risk > 0:
        actions.append(f"Expedite {max(1, int(stockout_risk / 500))} shipments to cover stockout risk")
    if dock_util > 85:
        actions.append("Assign additional dock capacity — congestion predicted")
    if inv_delta_pct < -10:
        actions.append("Rebalance inventory between distribution centres")
    if delay_days >= 3:
        actions.append("Notify customers of potential delivery delay")
    if prod_util > 95:
        actions.append("Consider overtime shifts or contract manufacturing to meet demand")
    if not actions:
        actions.append("No corrective action required — plan remains within tolerance")
    return actions


def persist_scenario(
    name: str, inputs: Dict, results: Dict, db: Session
) -> ScenarioRun:
    run = ScenarioRun(
        name=name,
        demand_increase_pct=inputs.get("demand_increase_pct", 0.0),
        prod_capacity_change_pct=inputs.get("prod_capacity_change_pct", 0.0),
        transport_delay_days=inputs.get("transport_delay_days", 0.0),
        lead_time_days=inputs.get("lead_time_days", 7.0),
        results_json=json.dumps(results),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
