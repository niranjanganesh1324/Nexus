from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Truck, Facility
from app.schemas import TruckOut, TruckListOut

router = APIRouter(prefix="/api/trucks", tags=["E2 - Trucks"])

@router.get("", response_model=TruckListOut)
def list_trucks(
    facility: Optional[str] = Query(None, description="Filter by destination facility name/city"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Truck)
    if status_filter and status_filter != "All":
        query = query.filter(Truck.status == status_filter)
    
    trucks = query.all()
    out = []
    for t in trucks:
        t_out = TruckOut.model_validate(t)
        t_out.origin_name = t.origin.name if t.origin else t.origin_id
        t_out.destination_name = t.destination.name if t.destination else t.destination_id
        if facility and facility != "All Facilities":
            if facility.lower() not in t_out.destination_name.lower():
                continue
        out.append(t_out)

    return TruckListOut(trucks=out, total=len(out))

@router.get("/{truck_id}", response_model=TruckOut)
def get_truck(truck_id: str, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail=f"Truck {truck_id} not found")
    out = TruckOut.model_validate(truck)
    out.origin_name = truck.origin.name if truck.origin else truck.origin_id
    out.destination_name = truck.destination.name if truck.destination else truck.destination_id
    return out
