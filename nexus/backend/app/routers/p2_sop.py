from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProductCollection, PlantCapacity, Facility, InventorySnapshot
from app.schemas import SOPPageOut, SOPMonthRow, SOPCapacityRow
from app.services.inventory_engine import PERIOD_LABELS, MONTHS

router = APIRouter(prefix="/api/sop", tags=["P2 - S&OP Planning"])

@router.get("", response_model=SOPPageOut)
def get_sop_page(db: Session = Depends(get_db)):
    collections = db.query(ProductCollection).all()
    capacities = db.query(PlantCapacity).filter(PlantCapacity.period_label == "2025-08").all()
    
    monthly_plan = []
    for i, period in enumerate(PERIOD_LABELS):
        snaps = db.query(InventorySnapshot).filter(InventorySnapshot.period_label == period).all()
        
        demand = sum(s.sales_units for s in snaps)
        production = sum(s.production_units for s in snaps)
        inbound = sum(s.inbound_units for s in snaps)
        closing = sum(s.closing_units for s in snaps)
        
        cap_pct = 82.0 + (i * 1.5)  # slight rolling capacity trend
        gap = (closing + production) - demand
        fin_impact = gap * 450.0  # approximate INR impact per unit gap
        
        monthly_plan.append(SOPMonthRow(
            period_label=period,
            demand=round(demand, 0),
            production=round(production, 0),
            inbound=round(inbound, 0),
            closing_inventory=round(closing, 0),
            capacity_pct=round(cap_pct, 1),
            supply_gap=round(gap, 0),
            financial_impact_inr=round(fin_impact, 0)
        ))

    capacity_rows = []
    for c in capacities:
        fac = db.get(Facility, c.facility_id)
        capacity_rows.append(SOPCapacityRow(
            facility_id=c.facility_id,
            facility_name=fac.name if fac else c.facility_id,
            utilization_pct=c.utilization_pct,
            planned_units=c.planned_units,
            available_units=c.available_units,
            constraint_desc=c.constraint_desc,
            lead_time_days=c.lead_time_days
        ))

    current_decision = (
        "September demand is projected at 45,200 units while planned production is 43,000 units. "
        "Inventory absorbs the gap, but projected closing inventory falls toward safety threshold. "
        "Recommended action: approve current plan, monitor TRK-104 inbound ETA, and trigger capacity reallocation if shipment delay exceeds tolerance window."
    )

    health_scores = {
        "demand_alignment": 92.0,
        "production_alignment": 87.0,
        "inventory_alignment": 84.0,
        "logistics_readiness": 91.0,
    }
    overall_health = round(sum(health_scores.values()) / len(health_scores), 1)

    return SOPPageOut(
        monthly_plan=monthly_plan,
        capacity=capacity_rows,
        current_decision=current_decision,
        health_scores=health_scores,
        overall_health=overall_health
    )
