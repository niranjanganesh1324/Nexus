from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProductCollection, Facility
from app.schemas import InventoryPageOut, InventoryCollectionOut, InventoryRowOut
from app.services.inventory_engine import (
    project_inventory, get_collection_risk_narrative, compute_delay_cascade_narrative
)

router = APIRouter(prefix="/api/inventory", tags=["P2 - Inventory Planning"])

@router.get("", response_model=InventoryPageOut)
def get_inventory_page(
    simulate_delay: bool = Query(False, description="Simulate TRK-104 inbound delay impact"),
    delay_truck_id: Optional[str] = Query("TRK-104", description="Truck ID causing delay"),
    db: Session = Depends(get_db)
):
    collections = db.query(ProductCollection).all()
    col_outputs = []
    
    total_closing = 0.0
    stockout_risks = 0
    excess_count = 0

    for col in collections:
        rows_raw = project_inventory(col, db, simulate_delay=simulate_delay, delay_truck_id=delay_truck_id)
        rows_out = [
            InventoryRowOut(
                period_label=r["period_label"],
                opening_units=r["opening"],
                inbound_units=r["inbound"],
                production_units=r["production"],
                sales_units=r["sales"],
                closing_units=r["closing"],
                safety_stock_units=r["safety_stock"],
                days_of_cover=r["days_of_cover"],
                risk_level=r["risk_level"]
            ) for r in rows_raw
        ]
        
        first_row = rows_raw[0] if rows_raw else {}
        risk = first_row.get("risk_level", "Healthy")
        closing = first_row.get("closing", 0.0)
        
        total_closing += closing
        if risk in ("Stockout", "Below Safety"):
            stockout_risks += 1
        elif risk == "Excess":
            excess_count += 1
            
        why, action = get_collection_risk_narrative(col, rows_raw)
        
        linked_truck_id = None
        for mat in col.fabric_materials:
            if mat.inbound_trucks:
                linked_truck_id = mat.inbound_trucks[0].id
                break

        col_outputs.append(InventoryCollectionOut(
            collection_id=col.id,
            name=col.name,
            rows=rows_out,
            linked_truck_id=linked_truck_id,
            current_risk=risk,
            why=why,
            action=action
        ))

    narrative = compute_delay_cascade_narrative(db) if simulate_delay else None

    return InventoryPageOut(
        collections=col_outputs,
        total_closing=round(total_closing, 0),
        stockout_risks=stockout_risks,
        excess_count=excess_count,
        scenario_active=simulate_delay,
        delay_impact_narrative=narrative
    )
