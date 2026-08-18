from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FabricMaterial, Truck
from app.schemas import ProcurementPageOut, ProcurementRowOut

router = APIRouter(prefix="/api/procurement", tags=["P2 - Fabric Procurement"])

@router.get("", response_model=ProcurementPageOut)
def get_procurement_page(db: Session = Depends(get_db)):
    materials = db.query(FabricMaterial).all()
    rows = []
    
    at_risk_count = 0
    moq_compliant_count = 0
    total_lead_time = 0
    linked_trucks = 0

    for mat in materials:
        net_req = max(0.0, mat.required_qty - mat.on_hand_qty)
        rec_order = max(net_req, mat.moq) if net_req > 0 else 0.0
        
        if rec_order >= mat.moq or rec_order == 0:
            moq_compliant_count += 1
            
        if mat.status in ("At Risk", "Watch"):
            at_risk_count += 1
            
        total_lead_time += mat.lead_time_days
        
        linked_truck_id = mat.inbound_trucks[0].id if mat.inbound_trucks else None
        if linked_truck_id:
            linked_trucks += 1

        rows.append(ProcurementRowOut(
            material_id=mat.id,
            name=mat.name,
            collection_name=mat.collection.name if mat.collection else "General",
            required_qty=round(mat.required_qty, 0),
            on_hand_qty=round(mat.on_hand_qty, 0),
            net_requirement=round(net_req, 0),
            moq=round(mat.moq, 0),
            recommended_order=round(rec_order, 0),
            lead_time_days=mat.lead_time_days,
            linked_truck_id=linked_truck_id,
            status=mat.status
        ))

    total = len(materials) or 1
    return ProcurementPageOut(
        rows=rows,
        at_risk_count=at_risk_count,
        moq_compliant_pct=round((moq_compliant_count / total) * 100.0, 1),
        avg_lead_time_days=round(total_lead_time / total, 1),
        linked_trucks=linked_trucks
    )
