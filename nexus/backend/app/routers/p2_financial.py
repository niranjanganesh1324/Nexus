from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProductCollection, InventorySnapshot
from app.schemas import FinancialPageOut, FinancialScenarioOut

router = APIRouter(prefix="/api/financial", tags=["P2 - Financial Impact"])

@router.get("", response_model=FinancialPageOut)
def get_financial_page(db: Session = Depends(get_db)):
    collections = db.query(ProductCollection).all()
    
    total_revenue = 0.0
    total_cost = 0.0

    for col in collections:
        snaps = db.query(InventorySnapshot).filter(InventorySnapshot.collection_id == col.id).all()
        col_sales = sum(s.sales_units for s in snaps)
        col_prod = sum(s.production_units for s in snaps)
        
        total_revenue += col_sales * col.unit_price_inr
        total_cost += col_prod * col.production_cost_inr

    base_margin = total_revenue - total_cost
    base_margin_pct = (base_margin / total_revenue * 100.0) if total_revenue > 0 else 0.0

    scenarios = [
        FinancialScenarioOut(
            name="Base Plan",
            revenue_inr=round(total_revenue, 0),
            cost_inr=round(total_cost, 0),
            margin_inr=round(base_margin, 0),
            margin_pct=round(base_margin_pct, 1)
        ),
        FinancialScenarioOut(
            name="High Demand (+20%)",
            revenue_inr=round(total_revenue * 1.25, 0),
            cost_inr=round(total_cost * 1.30, 0),
            margin_inr=round(total_revenue * 1.25 - total_cost * 1.30, 0),
            margin_pct=round((total_revenue * 1.25 - total_cost * 1.30) / (total_revenue * 1.25) * 100.0, 1)
        ),
        FinancialScenarioOut(
            name="Markdown Scenario (-15%)",
            revenue_inr=round(total_revenue * 0.92, 0),
            cost_inr=round(total_cost, 0),
            margin_inr=round(total_revenue * 0.92 - total_cost, 0),
            margin_pct=round((total_revenue * 0.92 - total_cost) / (total_revenue * 0.92) * 100.0, 1)
        ),
    ]

    return FinancialPageOut(
        scenarios=scenarios,
        base_revenue_inr=round(total_revenue, 0),
        base_cost_inr=round(total_cost, 0),
        base_margin_inr=round(base_margin, 0)
    )
