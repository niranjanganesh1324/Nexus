from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProductCollection, MarkdownRule, MarkdownRecommendation, InventorySnapshot
from app.schemas import MarkdownPageOut, MarkdownCollectionOut

router = APIRouter(prefix="/api/markdown", tags=["P2 - Markdown Intelligence"])

@router.get("", response_model=MarkdownPageOut)
def get_markdown_page(db: Session = Depends(get_db)):
    collections = db.query(ProductCollection).all()
    col_outs = []
    
    for col in collections:
        rule = db.query(MarkdownRule).filter(MarkdownRule.collection_id == col.id).first()
        rec = db.query(MarkdownRecommendation).filter(MarkdownRecommendation.rule_id == rule.id).first() if rule else None
        snap = db.query(InventorySnapshot).filter(InventorySnapshot.collection_id == col.id, InventorySnapshot.period_label == "2025-08").first()
        
        st_pct = rec.sell_through_pct if rec else 70.0
        inv_units = snap.closing_units if snap else 3000.0
        weeks = rec.weeks_remaining if rec else 6.0
        status = rec.status if rec else ("Critical" if st_pct < 50 else ("Watch" if st_pct < 75 else "Healthy"))
        action = rec.action if rec else ("Recommend markdown" if status == "Critical" else "Monitor")
        md_pct = rec.markdown_pct if rec else (0.15 if status == "Critical" else None)

        col_outs.append(MarkdownCollectionOut(
            collection_id=col.id,
            name=col.name,
            sell_through_pct=st_pct,
            inventory_units=round(inv_units, 0),
            weeks_remaining=weeks,
            status=status,
            action=action,
            markdown_pct=md_pct
        ))

    return MarkdownPageOut(collections=col_outs)
