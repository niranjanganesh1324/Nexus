from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Dock, DockAssignment, Truck
from app.schemas import (
    DockOut, DockRecommendationOut, AssignDockRequest, MaintenanceRequest,
    OKResponse, DockScheduleOut, DockScheduleSlotOut
)
from app.services.dock_engine import (
    recommend_dock, assign_dock, trigger_maintenance, SCHEDULE_SLOTS, NUM_SLOTS
)
from app.ws import broadcast
import json

router = APIRouter(prefix="/api/docks", tags=["E2 - Docks"])

@router.get("", response_model=List[DockOut])
def list_docks(db: Session = Depends(get_db)):
    return db.query(Dock).all()

@router.get("/recommendation", response_model=DockRecommendationOut)
def get_dock_recommendation(truck_id: str = Query(..., description="ID of truck to recommend for"), db: Session = Depends(get_db)):
    return recommend_dock(truck_id, db)

@router.post("/{dock_id}/assign", response_model=OKResponse)
async def assign_dock_endpoint(dock_id: str, req: AssignDockRequest, db: Session = Depends(get_db)):
    success, msg = assign_dock(dock_id, req.truck_id, req.slot_start, req.slot_end, db)
    if not success:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
    
    await broadcast(json.dumps({
        "type": "dock_update",
        "payload": {"dock_id": dock_id, "truck_id": req.truck_id, "action": "assigned"}
    }))
    return OKResponse(ok=True, message=msg)

@router.post("/{dock_id}/maintenance", response_model=OKResponse)
async def maintenance_endpoint(dock_id: str, req: MaintenanceRequest, db: Session = Depends(get_db)):
    success, msg, affected_truck_id = trigger_maintenance(dock_id, req.slot_start, req.slot_end, req.reason, db)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    
    await broadcast(json.dumps({
        "type": "dock_update",
        "payload": {"dock_id": dock_id, "action": "maintenance", "affected_truck": affected_truck_id}
    }))
    return OKResponse(ok=True, message=msg)

@router.get("/schedule", response_model=DockScheduleOut)
def get_dock_schedule(db: Session = Depends(get_db)):
    docks = db.query(Dock).all()
    assignments = db.query(DockAssignment).filter(DockAssignment.status.in_(["Scheduled", "Active"])).all()
    
    schedule_slots = []
    for d in docks:
        maint_slots = set()
        for mw in d.maintenance_windows:
            for s in range(mw.slot_start, mw.slot_end):
                maint_slots.add(s)
                
        for slot_idx, slot_time in enumerate(SCHEDULE_SLOTS):
            assigned = next((a for a in assignments if a.dock_id == d.id and a.slot_start <= slot_idx < a.slot_end), None)
            truck = db.get(Truck, assigned.truck_id) if assigned else None
            
            schedule_slots.append(DockScheduleSlotOut(
                slot_index=slot_idx,
                time_label=slot_time,
                dock_id=d.id,
                truck_id=truck.id if truck else None,
                trailer_id=truck.trailer_id if truck else None,
                is_maintenance=(slot_idx in maint_slots),
                assignment_id=assigned.id if assigned else None
            ))

    active_count = len(assignments)
    summary = f"{active_count} active allocation{'s' if active_count != 1 else ''} scheduled across network docks."
    return DockScheduleOut(slots=SCHEDULE_SLOTS, schedule=schedule_slots, summary=summary)
