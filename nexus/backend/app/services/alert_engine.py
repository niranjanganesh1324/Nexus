"""
Alert generation engine.
Evaluates real conditions from DB and creates/updates Alert records.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from app.models import (
    Alert,
    FabricMaterial,
    InventorySnapshot,
    ProductCollection,
    Truck,
    TruckTrackingState,
)
from app.services.inventory_engine import _risk_level, PERIOD_LABELS


def _open_alert_exists(db: Session, source_type: str, source_id: str, category: str) -> bool:
    return db.query(Alert).filter(
        Alert.source_type == source_type,
        Alert.source_id == source_id,
        Alert.category == category,
        Alert.status == "Open",
    ).first() is not None


def generate_all_alerts(db: Session) -> List[Alert]:
    """Evaluate all conditions and generate any new alerts."""
    created = []

    # E2 alerts: delayed trucks
    delayed_trucks = db.query(Truck).filter(Truck.status == "Delayed").all()
    for truck in delayed_trucks:
        if not _open_alert_exists(db, "truck", truck.id, "Shipment"):
            state = db.get(TruckTrackingState, truck.id)
            delay = state.delay_minutes if state else "unknown"
            alert = Alert(
                severity="High",
                category="Shipment",
                title=f"Shipment Delay — {truck.id}",
                description=f"{truck.id} is {delay} minutes behind schedule.",
                impact=f"Dock {truck.dock_id or '—'} allocation may be affected.",
                recommended_action="Review dock assignment and consider reassignment.",
                source_type="truck",
                source_id=truck.id,
            )
            db.add(alert)
            created.append(alert)

    # E2 alerts: ETA-passed trucks
    # (trucks where scheduled_eta has passed and status != Arrived)
    now_minutes = datetime.utcnow().hour * 60 + datetime.utcnow().minute
    at_risk = db.query(Truck).filter(
        Truck.status.in_(["On Time", "At Risk"])
    ).all()
    for truck in at_risk:
        try:
            h, m = map(int, truck.scheduled_eta.split(":"))
            eta_mins = h * 60 + m
            if eta_mins < now_minutes - 15:  # 15 min grace
                if not _open_alert_exists(db, "truck", truck.id, "Truck"):
                    alert = Alert(
                        severity="Critical",
                        category="Truck",
                        title=f"ETA Passed — {truck.id}",
                        description=f"{truck.id} has not arrived. ETA was {truck.scheduled_eta}.",
                        impact="Customer delivery commitment at risk.",
                        recommended_action="Contact driver and update ETA.",
                        source_type="truck",
                        source_id=truck.id,
                    )
                    db.add(alert)
                    created.append(alert)
        except Exception:
            pass

    # P2 alerts: inventory risks
    collections = db.query(ProductCollection).all()
    for col in collections:
        snap = (
            db.query(InventorySnapshot)
            .filter(
                InventorySnapshot.collection_id == col.id,
                InventorySnapshot.period_label == PERIOD_LABELS[0],
            )
            .first()
        )
        if not snap:
            continue
        risk = _risk_level(snap.closing_units, snap.safety_stock_units)
        if risk in ("Stockout", "Below Safety"):
            if not _open_alert_exists(db, "inventory", col.id, "Inventory"):
                alert = Alert(
                    severity="Critical" if risk == "Stockout" else "High",
                    category="Inventory",
                    title=f"Low Coverage — {col.name}",
                    description=f"{col.name} inventory coverage is at risk ({risk}).",
                    impact="Risk of stockout within the season.",
                    recommended_action="Increase production or expedite fabric procurement.",
                    source_type="inventory",
                    source_id=col.id,
                )
                db.add(alert)
                created.append(alert)

    # P2 alerts: fabric at risk
    materials = db.query(FabricMaterial).filter(FabricMaterial.status == "At Risk").all()
    for mat in materials:
        if not _open_alert_exists(db, "fabric", mat.id, "Procurement"):
            alert = Alert(
                severity="High",
                category="Procurement",
                title=f"Fabric Risk — {mat.name}",
                description=f"{mat.name} stock may not meet production requirements.",
                impact=f"Could delay {mat.collection.name} production.",
                recommended_action=f"Place order immediately. MOQ = {mat.moq:,.0f} m.",
                source_type="fabric",
                source_id=mat.id,
            )
            db.add(alert)
            created.append(alert)

    if created:
        db.commit()
    return created
