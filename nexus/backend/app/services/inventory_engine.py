"""
Inventory projection engine.

Formula:
  closing = opening + inbound + production - sales

Risk classification:
  closing < 0          → Stockout
  closing < safety     → Below Safety
  closing > safety*2.2 → Excess
  otherwise            → Healthy

E2→P2 closed loop:
  When a truck delay is detected, compute the inbound quantity at risk
  based on linked material and reduce inbound for the affected period.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models import (
    DemandRecord,
    FabricMaterial,
    InventorySnapshot,
    ProductCollection,
    Truck,
    TruckTrackingState,
)

MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
PERIOD_LABELS = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]


def _risk_level(closing: float, safety: float) -> str:
    if closing < 0:
        return "Stockout"
    if closing < safety:
        return "Below Safety"
    if closing > safety * 2.2:
        return "Excess"
    return "Healthy"


def _days_of_cover(closing: float, daily_demand: float) -> float:
    if daily_demand <= 0:
        return 999.0
    return max(0.0, closing / daily_demand)


def _delay_inbound_impact(truck_id: str, db: Session) -> float:
    """
    Calculate units at risk from a delayed truck.
    Uses: delay_hours * daily_rate (derived from truck load and lead time).
    Returns: reduction in inbound units.
    """
    truck = db.get(Truck, truck_id)
    if not truck:
        return 0.0
    state = db.get(TruckTrackingState, truck_id)
    if not state or state.delay_minutes == 0:
        return 0.0

    # Impact = fraction of load that's at risk based on delay
    delay_hours = state.delay_minutes / 60.0
    fraction_delayed = min(1.0, delay_hours / 24.0)  # cap at 100% of load
    return truck.load_units * fraction_delayed


def project_inventory(
    collection: ProductCollection,
    db: Session,
    simulate_delay: bool = False,
    delay_truck_id: Optional[str] = None,
) -> List[Dict]:
    """
    Project 6-month inventory for a collection.
    Returns list of period rows with full calculation breakdown.
    """
    snapshots = (
        db.query(InventorySnapshot)
        .filter(InventorySnapshot.collection_id == collection.id)
        .order_by(InventorySnapshot.period_label)
        .all()
    )

    # Build snapshot map
    snap_map = {s.period_label: s for s in snapshots}
    safety = (
        snap_map[PERIOD_LABELS[0]].safety_stock_units
        if PERIOD_LABELS[0] in snap_map
        else 3000.0
    )

    # Calculate E2→P2 delay impact
    inbound_reduction = 0.0
    if simulate_delay and delay_truck_id:
        inbound_reduction = _delay_inbound_impact(delay_truck_id, db)
    elif simulate_delay:
        # Find all delayed trucks linked to this collection
        for mat in collection.fabric_materials:
            for truck in mat.inbound_trucks:
                state = db.get(TruckTrackingState, truck.id)
                if state and state.delay_minutes > 0:
                    inbound_reduction += _delay_inbound_impact(truck.id, db)

    rows = []
    opening = snap_map[PERIOD_LABELS[0]].opening_units if PERIOD_LABELS[0] in snap_map else 0.0

    for i, period in enumerate(PERIOD_LABELS):
        snap = snap_map.get(period)
        if snap:
            inbound = snap.inbound_units
            production = snap.production_units
            sales = snap.sales_units
            safety = snap.safety_stock_units
        else:
            inbound = 0.0
            production = 0.0
            sales = 0.0

        # Apply E2→P2 delay impact to first period's inbound
        if i == 0 and inbound_reduction > 0:
            inbound = max(0.0, inbound - inbound_reduction)
            production = max(0.0, production - inbound_reduction * 0.85)

        closing = opening + inbound + production - sales
        risk = _risk_level(closing, safety)
        daily_demand = sales / 30.0 if sales > 0 else (safety / 30.0)

        rows.append({
            "period_label": period,
            "month": MONTHS[i],
            "opening": round(opening, 0),
            "inbound": round(inbound, 0),
            "production": round(production, 0),
            "sales": round(sales, 0),
            "closing": round(closing, 0),
            "safety_stock": round(safety, 0),
            "days_of_cover": round(_days_of_cover(closing, daily_demand), 1),
            "risk_level": risk,
        })
        opening = closing  # rolling forward

    return rows


def get_collection_risk_narrative(
    collection: ProductCollection,
    rows: List[Dict],
) -> Tuple[str, str]:
    """Return (why, action) strings for a collection based on first-period risk."""
    risk = rows[0]["risk_level"] if rows else "Healthy"
    if risk in ("Stockout", "Below Safety"):
        why = "Demand exceeds available inventory and planned supply."
        action = "Increase production, shift plant capacity or expedite linked fabric."
    elif risk == "Excess":
        why = "Low sell-through is leaving inventory above target."
        action = "Reduce future production and evaluate markdown timing."
    else:
        why = "Inventory remains above safety stock."
        action = "Continue plan and monitor next S&OP cycle."
    return why, action


def compute_delay_cascade_narrative(db: Session) -> Optional[str]:
    """
    Generate a narrative explaining the E2→P2 delay cascade impact.
    Returns None if no active delays are linked to inventory.
    """
    lines = []
    trucks = db.query(Truck).filter(Truck.status == "Delayed").all()
    for truck in trucks:
        state = db.get(TruckTrackingState, truck.id)
        if not state or state.delay_minutes == 0:
            continue
        mat = truck.linked_material
        if not mat:
            continue
        impact_units = _delay_inbound_impact(truck.id, db)
        lines.append(
            f"{truck.id} delayed {state.delay_minutes} min → {mat.name} inbound at risk: "
            f"~{impact_units:,.0f} units → {mat.collection.name} closing inventory recalculated."
        )
    return " | ".join(lines) if lines else None
