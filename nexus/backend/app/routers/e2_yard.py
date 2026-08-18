from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Dock, YardEvent, Truck
from app.schemas import YardEventOut, YardMetricsOut, ConflictOut, WhatIfRequest, WhatIfResult
from app.services.dock_engine import predict_conflicts, recommend_dock

router = APIRouter(prefix="/api/yard", tags=["E2 - Yard"])

@router.get("/events", response_model=List[YardEventOut])
def get_yard_events(db: Session = Depends(get_db)):
    return db.query(YardEvent).order_by(YardEvent.id.desc()).limit(20).all()

@router.get("/metrics", response_model=YardMetricsOut)
def get_yard_metrics(db: Session = Depends(get_db)):
    docks = db.query(Dock).all()
    total = len(docks) or 1
    occupied = sum(1 for d in docks if d.status == "Occupied")
    available = sum(1 for d in docks if d.status == "Available")
    maint = sum(1 for d in docks if d.status == "Maintenance")
    active_arrivals = db.query(Truck).filter(Truck.status.in_(["On Time", "Delayed", "At Risk"])).count()
    
    return YardMetricsOut(
        occupied=occupied,
        available=available,
        maintenance=maint,
        utilization_pct=round((occupied / total) * 100, 1),
        active_arrivals=active_arrivals
    )

@router.get("/conflicts", response_model=List[ConflictOut])
def get_yard_conflicts(db: Session = Depends(get_db)):
    return predict_conflicts(db)

@router.post("/what-if", response_model=WhatIfResult)
def run_what_if_scenario(req: WhatIfRequest, db: Session = Depends(get_db)):
    rec = recommend_dock(req.truck_id, db)
    preferred = rec.best.dock_id if rec.best else None
    preferred_score = rec.best.score if rec.best else None
    
    candidates = rec.candidates
    fallback = candidates[1].dock_id if len(candidates) > 1 else None
    fallback_score = candidates[1].score if len(candidates) > 1 else None
    
    narrative = f"If {req.truck_id} is delayed by {req.delay_minutes} minutes, "
    if preferred:
        narrative += f"{preferred} remains preferred choice ({preferred_score:.0f}/100). "
    if fallback:
        narrative += f"Fallback door: {fallback} ({fallback_score:.0f}/100)."
    else:
        narrative += "No alternate compatible door available."
        
    return WhatIfResult(
        truck_id=req.truck_id,
        delay_minutes=req.delay_minutes,
        preferred_dock=preferred,
        fallback_dock=fallback,
        preferred_score=preferred_score,
        fallback_score=fallback_score,
        narrative=narrative
    )
