"""
Dock recommendation and assignment engine.

Scoring model (max 100):
  Availability    35  — dock is free now vs minutes until it frees
  Compatibility   25  — supports this load type
  Priority        20  — High=20, Medium=12, Low=7
  ETA Alignment   10  — dock available before ETA+12 min
  Proximity       10  — lower distance from gate = higher score

Confidence = clamp(score, 70, 98)

All scoring lives here. The frontend receives the result and renders it.
No scoring logic in JavaScript.
"""
from __future__ import annotations

import json
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Alert,
    Dock,
    DockAssignment,
    DockMaintenanceWindow,
    Truck,
    TruckTrackingState,
    YardEvent,
)
from app.schemas import DockCandidate, DockRecommendationBreakdown, DockRecommendationOut

# ─────────── Schedule slot constants (align with seed) ───────────

SCHEDULE_SLOTS = [
    "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
]
NUM_SLOTS = len(SCHEDULE_SLOTS)


# ─────────── helpers ───────────

def _supported_types(dock: Dock) -> List[str]:
    try:
        return json.loads(dock.supported_load_types)
    except Exception:
        return []


def _minutes_until_available(dock: Dock, db: Session) -> float:
    """How many minutes until this dock's current assignment ends."""
    if dock.status == "Available":
        return 0.0

    # Find the latest end slot among active assignments
    active_assignments = (
        db.query(DockAssignment)
        .filter(
            DockAssignment.dock_id == dock.id,
            DockAssignment.status.in_(["Scheduled", "Active"]),
        )
        .all()
    )
    if not active_assignments:
        return 0.0

    max_slot_end = max(a.slot_end for a in active_assignments)
    # Each slot = 30 minutes
    return float(max_slot_end * 30)


def _eta_minutes(truck: Truck, db: Session) -> float:
    state = db.get(TruckTrackingState, truck.id)
    if not state or state.speed_kmh <= 0:
        return 60.0  # default fallback
    return (state.distance_remaining_km / state.speed_kmh) * 60.0


def _priority_score(priority: str) -> float:
    return {"High": 20.0, "Medium": 12.0, "Low": 7.0}.get(priority, 7.0)


# ─────────── main scoring ───────────

def score_dock(dock: Dock, truck: Truck, eta_minutes: float, available_in: float) -> DockCandidate:
    """Compute score for a single dock/truck pair."""
    load_types = _supported_types(dock)
    compatible = truck.load_type in load_types

    # Availability (35)
    if available_in == 0:
        availability = 35.0
    else:
        availability = max(0.0, 35.0 - max(0.0, available_in - eta_minutes) * 1.2)

    # Compatibility (25)
    compatibility = 25.0 if compatible else 0.0

    # ETA alignment (10)
    if available_in <= eta_minutes + 12:
        eta_alignment = 10.0
    else:
        eta_alignment = max(0.0, 10.0 - (available_in - eta_minutes) / 3.0)

    # Proximity (10)
    proximity = max(0.0, 10.0 - float(dock.distance_from_gate))

    # Priority (20)
    priority = _priority_score(truck.priority)

    total = availability + compatibility + eta_alignment + proximity + priority
    score = total if (compatible and dock.status != "Maintenance") else -999.0

    return DockCandidate(
        dock_id=dock.id,
        score=round(score, 1),
        available_in_minutes=round(available_in, 1),
        compatible=compatible,
        breakdown=DockRecommendationBreakdown(
            availability=round(availability, 1),
            compatibility=round(compatibility, 1),
            priority=round(priority, 1),
            eta_alignment=round(eta_alignment, 1),
            proximity=round(proximity, 1),
        ),
    )


def recommend_dock(truck_id: str, db: Session) -> DockRecommendationOut:
    """
    Compute dock recommendation for a truck.
    Returns best dock, confidence, all candidates and explanation.
    """
    truck = db.get(Truck, truck_id)
    if not truck:
        return DockRecommendationOut(
            truck_id=truck_id,
            best=None,
            confidence=0.0,
            candidates=[],
            breakdown=None,
            explanation="Truck not found.",
        )

    eta = _eta_minutes(truck, db)
    docks = db.query(Dock).filter(Dock.facility_id == truck.destination_id).all()

    candidates: List[DockCandidate] = []
    for dock in docks:
        if dock.status == "Maintenance":
            continue
        avail = _minutes_until_available(dock, db)
        candidate = score_dock(dock, truck, eta, avail)
        if candidate.compatible:
            candidates.append(candidate)

    candidates.sort(key=lambda c: c.score, reverse=True)
    best = candidates[0] if candidates else None

    confidence = 0.0
    explanation = "No compatible dock currently available."
    breakdown = None

    if best:
        confidence = float(max(70.0, min(98.0, best.score)))
        breakdown = best.breakdown
        ready_desc = (
            "ready now"
            if best.available_in_minutes == 0
            else f"available in {int(best.available_in_minutes)} min"
        )
        explanation = (
            f"Dock {best.dock_id} is compatible with {truck.load_type}, "
            f"{ready_desc}, and offers the strongest combined operational score "
            f"({best.score:.0f}/100) for {truck.priority.lower()}-priority {truck.id}."
        )

    return DockRecommendationOut(
        truck_id=truck_id,
        best=best,
        confidence=round(confidence, 1),
        candidates=candidates,
        breakdown=breakdown,
        explanation=explanation,
    )


# ─────────── assignment (transactionally safe) ───────────

def assign_dock(
    dock_id: str, truck_id: str, slot_start: int, slot_end: int, db: Session
) -> Tuple[bool, str]:
    """
    Assign a truck to a dock slot, transactionally safe.
    Returns (success, message).

    Uses SELECT FOR UPDATE on PostgreSQL via with_for_update().
    On SQLite the entire session is serialised so this is safe too.
    """
    if slot_end <= slot_start:
        return False, "slot_end must be greater than slot_start"
    if slot_start < 0 or slot_end > NUM_SLOTS:
        return False, f"Slot indices must be 0–{NUM_SLOTS}"

    dock = db.query(Dock).filter(Dock.id == dock_id).with_for_update().first()
    if not dock:
        return False, f"Dock {dock_id} not found"
    if dock.status == "Maintenance":
        return False, f"Dock {dock_id} is under maintenance"

    truck = db.get(Truck, truck_id)
    if not truck:
        return False, f"Truck {truck_id} not found"

    # Check maintenance overlap
    maint_overlap = (
        db.query(DockMaintenanceWindow)
        .filter(
            DockMaintenanceWindow.dock_id == dock_id,
            DockMaintenanceWindow.slot_start < slot_end,
            DockMaintenanceWindow.slot_end > slot_start,
        )
        .first()
    )
    if maint_overlap:
        return False, f"Dock {dock_id} is under maintenance during this window"

    # Check assignment overlap (excluding same truck reassignment)
    overlap = (
        db.query(DockAssignment)
        .filter(
            DockAssignment.dock_id == dock_id,
            DockAssignment.truck_id != truck_id,
            DockAssignment.status.in_(["Scheduled", "Active"]),
            DockAssignment.slot_start < slot_end,
            DockAssignment.slot_end > slot_start,
        )
        .first()
    )
    if overlap:
        return False, (
            f"Dock {dock_id} is already assigned to {overlap.truck_id} "
            f"during slots {overlap.slot_start}–{overlap.slot_end}"
        )

    # Cancel any existing assignments for this truck (reassignment)
    db.query(DockAssignment).filter(
        DockAssignment.truck_id == truck_id,
        DockAssignment.status.in_(["Scheduled", "Active"]),
    ).update({"status": "Cancelled"})

    # Create new assignment
    new_assignment = DockAssignment(
        dock_id=dock_id,
        truck_id=truck_id,
        slot_start=slot_start,
        slot_end=slot_end,
        status="Scheduled",
    )
    db.add(new_assignment)

    # Update truck dock reference
    truck.dock_id = dock_id
    dock.status = "Occupied"

    # Yard event
    event = YardEvent(
        event_type="Assignment",
        icon="🟢",
        text=f"{truck_id} / {truck.trailer_id} assigned to Dock {dock_id} "
             f"({SCHEDULE_SLOTS[slot_start]}–{SCHEDULE_SLOTS[min(slot_end, NUM_SLOTS-1)]})",
        truck_id=truck_id,
        facility_id=dock.facility_id,
    )
    db.add(event)
    db.commit()
    return True, f"Dock {dock_id} assigned to {truck_id}"


# ─────────── maintenance disruption ───────────

def trigger_maintenance(
    dock_id: str, slot_start: int, slot_end: int, reason: str, db: Session
) -> Tuple[bool, str, Optional[str]]:
    """
    Put a dock into maintenance.
    Returns (success, message, affected_truck_id).
    Invalidates any overlapping assignments and generates alerts.
    """
    dock = db.query(Dock).filter(Dock.id == dock_id).with_for_update().first()
    if not dock:
        return False, f"Dock {dock_id} not found", None

    # Create maintenance window
    mw = DockMaintenanceWindow(
        dock_id=dock_id,
        slot_start=slot_start,
        slot_end=slot_end,
        reason=reason,
    )
    db.add(mw)
    dock.status = "Maintenance"

    # Find affected assignments
    affected = (
        db.query(DockAssignment)
        .filter(
            DockAssignment.dock_id == dock_id,
            DockAssignment.status.in_(["Scheduled", "Active"]),
            DockAssignment.slot_start < slot_end,
            DockAssignment.slot_end > slot_start,
        )
        .all()
    )

    affected_truck_id = None
    for a in affected:
        a.status = "Cancelled"
        affected_truck = db.get(Truck, a.truck_id)
        if affected_truck:
            affected_truck.dock_id = None
            affected_truck_id = affected_truck.id

            # Generate alert
            alert = Alert(
                severity="High",
                category="Dock",
                title=f"Dock {dock_id} unavailable — reassignment required",
                description=f"Equipment issue at {dock_id} requires reassignment of {affected_truck.id}.",
                impact="Potential arrival and unloading delay.",
                recommended_action="Run dock recommendation for replacement dock.",
                source_type="dock",
                source_id=dock_id,
            )
            db.add(alert)

            # Yard event
            event = YardEvent(
                event_type="Disruption",
                icon="🚨",
                text=f"Dock {dock_id} became unavailable ({reason}); reassignment required for {affected_truck.id}.",
                truck_id=affected_truck.id,
                facility_id=dock.facility_id,
            )
            db.add(event)

    db.commit()
    msg = f"Dock {dock_id} set to maintenance (slots {slot_start}–{slot_end})."
    if affected_truck_id:
        msg += f" Assignment for {affected_truck_id} cancelled."
    return True, msg, affected_truck_id


# ─────────── conflict prediction ───────────

def predict_conflicts(db: Session) -> List[Dict]:
    """
    Generalised conflict prediction:
    For each load_type, find high-priority incoming trucks
    and compare against compatible dock capacity.
    """
    active_trucks = (
        db.query(Truck)
        .filter(Truck.status.in_(["On Time", "Delayed", "At Risk"]))
        .all()
    )
    high_priority = [t for t in active_trucks if t.priority == "High"]

    # Group by load type
    by_type: Dict[str, List[Truck]] = {}
    for truck in high_priority:
        by_type.setdefault(truck.load_type, []).append(truck)

    docks = db.query(Dock).filter(Dock.status != "Maintenance").all()
    conflicts = []

    for load_type, trucks in by_type.items():
        compatible_docks = [
            d for d in docks
            if load_type in _supported_types(d)
        ]
        # Conflict if more high-priority trucks than compatible docks
        if len(trucks) > len(compatible_docks) and len(trucks) > 1:
            severity = "Critical" if len(trucks) > len(compatible_docks) * 2 else "High"
            # Recommend sequencing by ETA (earliest first)
            sorted_trucks = sorted(trucks, key=lambda t: t.scheduled_eta)
            conflicts.append({
                "load_type": load_type,
                "trucks": [t.id for t in trucks],
                "compatible_docks": [d.id for d in compatible_docks],
                "severity": severity,
                "recommended_sequencing": (
                    f"Process in ETA order: {', '.join(t.id for t in sorted_trucks)}"
                ),
            })
        elif len(trucks) >= 2 and len(compatible_docks) <= len(trucks):
            # Watch condition: capacity tight but not yet exceeded
            sorted_trucks = sorted(trucks, key=lambda t: t.scheduled_eta)
            conflicts.append({
                "load_type": load_type,
                "trucks": [t.id for t in trucks],
                "compatible_docks": [d.id for d in compatible_docks],
                "severity": "Watch",
                "recommended_sequencing": (
                    f"Monitor — process in ETA order: {', '.join(t.id for t in sorted_trucks)}"
                ),
            })

    return conflicts
