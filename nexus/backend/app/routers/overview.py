from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Truck, Dock, Alert, InventorySnapshot, PlantCapacity
from app.schemas import OverviewOut, KPIOut, AlertOut
from app.services.alert_engine import generate_all_alerts

router = APIRouter(prefix="/api/overview", tags=["Control Tower Overview"])

@router.get("", response_model=OverviewOut)
def get_overview(db: Session = Depends(get_db)):
    trucks = db.query(Truck).all()
    docks = db.query(Dock).all()
    alerts = generate_all_alerts(db) or db.query(Alert).filter(Alert.status == "Open").limit(3).all()
    
    total_shipments = len(trucks)
    at_risk = sum(1 for t in trucks if t.status in ("Delayed", "At Risk"))
    on_time = sum(1 for t in trucks if t.status in ("On Time", "Arrived"))
    
    occupied_docks = sum(1 for d in docks if d.status == "Occupied")
    dock_util = round((occupied_docks / max(len(docks), 1)) * 100.0, 1)

    capacities = db.query(PlantCapacity).all()
    cap_util = round(sum(c.utilization_pct for c in capacities) / max(len(capacities), 1), 1)

    snaps = db.query(InventorySnapshot).filter(InventorySnapshot.period_label == "2025-08").all()
    demand_val = sum(s.sales_units for s in snaps) or 12400.0
    prod_val = sum(s.production_units for s in snaps) or 11800.0

    kpis = [
        KPIOut(label="Demand Forecast", value="12.8", unit="%", sub="vs previous cycle", trend="up", trend_val="12.8%", status="info", spark=[10,12,11,14,13,16,15,18,17,19], nav="demand"),
        KPIOut(label="Inventory Health", value="87", unit="%", sub="Healthy", trend="up", trend_val="2.1%", status="healthy", spark=[15,14,16,13,14,12,13,11,12,11], nav="inventory"),
        KPIOut(label="Production Capacity", value=str(int(cap_util)), unit="%", sub="Utilized", trend="up", trend_val="1.4%", status="healthy", spark=[78,80,79,82,81,83,80,82,84,82], nav="sop"),
        KPIOut(label="Active Shipments", value=str(total_shipments), unit="", sub=f"{on_time} on-time", trend="up", trend_val="3", status="healthy", spark=[19,20,21,20,22,23,22,24,23,24], nav="shipments"),
        KPIOut(label="At-Risk Shipments", value=str(at_risk), unit="", sub="Requires attention", trend="down-bad", trend_val="1", status="warning", spark=[1,2,2,3,2,3,4,3,3,3], nav="alerts"),
        KPIOut(label="Dock Utilization", value=str(int(dock_util)), unit="%", sub="+6% today", trend="up", trend_val="6%", status="info", spark=[65,68,70,69,72,71,73,72,75,74], nav="yard"),
    ]

    flow = {
        "demand": "12.4K units",
        "production": f"{int(prod_val/1000)}K units",
        "inventory": "18.2K units",
        "shipments": f"{total_shipments} active",
        "delivery": "91% on-time"
    }

    sop_health = {
        "overall": 89.0,
        "demand_alignment": 92.0,
        "production_alignment": 87.0,
        "inventory_alignment": 84.0,
        "logistics_readiness": 91.0
    }

    alert_outs = [AlertOut.model_validate(a) for a in alerts[:3]]

    return OverviewOut(
        kpis=kpis,
        flow=flow,
        sop_health=sop_health,
        active_alerts=alert_outs,
        demand_forecast=demand_val,
        production_units=prod_val,
        total_shipments=total_shipments,
        at_risk_shipments=at_risk,
        dock_utilization_pct=dock_util
    )
