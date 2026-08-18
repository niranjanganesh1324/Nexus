from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert
from app.schemas import AlertOut, AlertListOut, OKResponse
from app.services.alert_engine import generate_all_alerts

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Exceptions"])

@router.get("", response_model=AlertListOut)
def list_alerts(
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    # Ensure all DB conditions generate alerts dynamically
    generate_all_alerts(db)
    
    query = db.query(Alert)
    if status_filter and status_filter != "All":
        query = query.filter(Alert.status == status_filter)
    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)
    if category and category != "All":
        query = query.filter(Alert.category == category)
        
    alerts = query.order_by(Alert.id.desc()).all()
    open_count = db.query(Alert).filter(Alert.status == "Open").count()
    resolved_count = db.query(Alert).filter(Alert.status == "Resolved").count()
    
    return AlertListOut(alerts=alerts, open_count=open_count, resolved_count=resolved_count)

@router.post("/{alert_id}/resolve", response_model=OKResponse)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    
    alert.status = "Resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return OKResponse(ok=True, message=f"Alert '{alert.title}' marked as resolved")
