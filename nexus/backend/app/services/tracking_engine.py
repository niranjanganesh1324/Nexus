"""
Server-authoritative truck tracking engine.
Runs every ~2.5 seconds as a FastAPI background task.
Advances truck positions, calculates ETA, detects delays, persists state,
and broadcasts changes to all connected WebSocket clients.
"""
from __future__ import annotations

import asyncio
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Alert, Truck, TruckTrackingState, YardEvent

if TYPE_CHECKING:
    from app.ws import broadcast

# ─────────── coordinate helpers ───────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km between two lat/lng points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def interpolate_position(
    lat1: float, lng1: float, lat2: float, lng2: float, progress: float
) -> tuple[float, float]:
    """Linear interpolation of GPS position along a route."""
    p = max(0.0, min(1.0, progress / 100.0))
    return lat1 + (lat2 - lat1) * p, lng1 + (lng2 - lng1) * p


# ─────────── ETA calculation ───────────

def _calculate_eta_minutes(dist_km: float, speed_kmh: float) -> float:
    if speed_kmh <= 0:
        return 9999.0
    return (dist_km / speed_kmh) * 60.0


def _parse_scheduled_eta(eta_str: str) -> Optional[datetime]:
    """Convert "14:35" to today's datetime."""
    try:
        h, m = map(int, eta_str.split(":"))
        now = datetime.utcnow()
        return now.replace(hour=h, minute=m, second=0, microsecond=0)
    except Exception:
        return None


# ─────────── speed variation (deterministic, no Math.random) ───────────

def _vary_speed(current_speed: float, truck_id: str, tick: int) -> float:
    """Deterministic speed variation based on truck_id hash + tick."""
    seed = hash(truck_id + str(tick)) % 100
    delta = (seed - 50) / 10.0  # -5 to +5 km/h
    new_speed = current_speed + delta
    return max(28.0, min(78.0, new_speed))


# ─────────── delay detection and cascade ───────────

def _detect_delay(truck: Truck, state: TruckTrackingState, db: Session) -> bool:
    """
    Returns True if this tick newly detected a delay condition.
    Persists an Alert and YardEvent if a new delay is found.
    """
    if truck.status == "Arrived" or state.progress_pct >= 100:
        return False

    scheduled = _parse_scheduled_eta(truck.scheduled_eta)
    if not scheduled:
        return False

    eta_minutes_remaining = _calculate_eta_minutes(
        state.distance_remaining_km, state.speed_kmh
    )
    projected_arrival = datetime.utcnow() + timedelta(minutes=eta_minutes_remaining)
    delay_minutes = max(0, int((projected_arrival - scheduled).total_seconds() / 60))
    state.delay_minutes = delay_minutes

    was_on_time = truck.status in ("On Time",)
    if delay_minutes > 10 and was_on_time:
        truck.status = "Delayed"
        _create_delay_alert(truck, delay_minutes, db)
        _create_yard_event(
            truck,
            "⚠️",
            "Exception",
            f"{truck.id} delay detected — {delay_minutes} min behind schedule. ETA updated.",
            db,
        )
        return True
    elif delay_minutes > 5 and truck.status == "On Time":
        truck.status = "At Risk"
    return False


def _create_delay_alert(truck: Truck, delay_minutes: int, db: Session) -> None:
    """Create a delay alert — idempotent (skip if open alert already exists)."""
    existing = (
        db.query(Alert)
        .filter(
            Alert.source_type == "truck",
            Alert.source_id == truck.id,
            Alert.status == "Open",
            Alert.category == "Shipment",
        )
        .first()
    )
    if existing:
        existing.description = (
            f"{truck.id} is {delay_minutes} minutes behind schedule."
        )
        return

    alert = Alert(
        severity="High",
        category="Shipment",
        title=f"Shipment Delay — {truck.id}",
        description=f"{truck.id} is {delay_minutes} minutes behind schedule.",
        impact=f"Dock {truck.dock_id or '—'} allocation may be affected.",
        recommended_action="Review dock assignment and consider reassignment.",
        source_type="truck",
        source_id=truck.id,
    )
    db.add(alert)


def _create_yard_event(
    truck: Truck, icon: str, event_type: str, text: str, db: Session
) -> None:
    event = YardEvent(
        event_type=event_type,
        icon=icon,
        text=text,
        truck_id=truck.id,
        facility_id=truck.destination_id,
    )
    db.add(event)


# ─────────── main tick ───────────

_tick_counter: int = 0


async def tick_all_trucks(broadcast_fn) -> None:
    """
    Advance all active truck tracking states by one tick (~2.5 s).
    Persists changes to DB. Broadcasts updates via WebSocket.
    """
    global _tick_counter
    _tick_counter += 1

    db: Session = SessionLocal()
    updates: List[Dict] = []
    try:
        trucks = (
            db.query(Truck)
            .filter(Truck.status != "Arrived")
            .all()
        )

        for truck in trucks:
            state = truck.tracking_state
            if not state:
                continue

            if state.progress_pct >= 100:
                truck.status = "Arrived"
                state.speed_kmh = 0.0
                state.distance_remaining_km = 0.0
                state.arrived_at = datetime.utcnow()
                _create_yard_event(
                    truck, "✅", "Arrival",
                    f"{truck.id} confirmed at {truck.destination_id}; trailer {truck.trailer_id} identified.",
                    db,
                )
                updates.append(_build_ws_payload(truck, state))
                continue

            # Advance progress: 2.5 s of real time ≈ progress increment
            # Each tick = 2.5 s; speed in km/h → km/tick
            km_per_tick = (state.speed_kmh / 3600.0) * 2.5
            dist_covered = km_per_tick
            if state.total_distance_km > 0:
                progress_increment = (dist_covered / state.total_distance_km) * 100.0
            else:
                progress_increment = 0.5
            state.progress_pct = min(100.0, state.progress_pct + progress_increment)

            # Update distance remaining
            state.distance_remaining_km = max(
                0.0,
                state.total_distance_km * (1.0 - state.progress_pct / 100.0),
            )

            # Vary speed deterministically
            state.speed_kmh = _vary_speed(state.speed_kmh, truck.id, _tick_counter)

            # Update GPS position (interpolate between origin and destination lat/lng)
            origin = truck.origin
            dest = truck.destination
            if origin and dest:
                lat, lng = interpolate_position(
                    origin.lat, origin.lng, dest.lat, dest.lng, state.progress_pct
                )
                state.current_lat = lat
                state.current_lng = lng

            # Check delay
            _detect_delay(truck, state, db)
            state.last_updated = datetime.utcnow()
            updates.append(_build_ws_payload(truck, state))

        db.commit()

    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger("nexus.tracking").error("Tracking tick error: %s", exc)
    finally:
        db.close()

    # Broadcast all updates
    if updates and broadcast_fn:
        await broadcast_fn(
            json.dumps({"type": "truck_update", "payload": updates})
        )


def _build_ws_payload(truck: Truck, state: TruckTrackingState) -> Dict:
    return {
        "id": truck.id,
        "trailer_id": truck.trailer_id,
        "shipment_id": truck.shipment_id,
        "status": truck.status,
        "progress_pct": round(state.progress_pct, 2),
        "speed_kmh": round(state.speed_kmh, 1),
        "distance_remaining_km": round(state.distance_remaining_km, 1),
        "delay_minutes": state.delay_minutes,
        "current_lat": state.current_lat,
        "current_lng": state.current_lng,
        "last_updated": state.last_updated.isoformat(),
    }


# ─────────── background task runner ───────────

_tracking_task: Optional[asyncio.Task] = None


async def start_tracking_loop(broadcast_fn) -> None:
    """Start the background tracking loop. Call once at app startup."""
    global _tracking_task

    async def loop():
        while True:
            await tick_all_trucks(broadcast_fn)
            await asyncio.sleep(2.5)

    _tracking_task = asyncio.create_task(loop())


def stop_tracking_loop() -> None:
    global _tracking_task
    if _tracking_task and not _tracking_task.done():
        _tracking_task.cancel()
        _tracking_task = None
