import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ScenarioRun
from app.schemas import ScenarioInput, ScenarioResultOut, ScenarioHistoryOut
from app.services.scenario_engine import run_scenario, persist_scenario

router = APIRouter(prefix="/api/scenarios", tags=["Scenario Engine"])

@router.post("/run", response_model=ScenarioResultOut)
def run_scenario_endpoint(inp: ScenarioInput, db: Session = Depends(get_db)):
    results = run_scenario(inp.model_dump(), db)
    run_record = persist_scenario(inp.name, inp.model_dump(), results, db)
    
    return ScenarioResultOut(
        id=run_record.id,
        name=run_record.name,
        inputs=inp,
        demand_units=results["demand_units"],
        production_util_pct=results["production_util_pct"],
        inventory_delta_pct=results["inventory_delta_pct"],
        stockout_risk_pct=results["stockout_risk_pct"],
        shipment_requirement=results["shipment_requirement"],
        dock_util_pct=results["dock_util_pct"],
        financial_impact_inr=results["financial_impact_inr"],
        actions=results["actions"],
        collections=results["collections"],
        created_at=run_record.created_at
    )

@router.get("/history", response_model=ScenarioHistoryOut)
def get_scenario_history(db: Session = Depends(get_db)):
    runs = db.query(ScenarioRun).order_by(ScenarioRun.id.desc()).limit(20).all()
    out = []
    for r in runs:
        res = json.loads(r.results_json) if r.results_json else {}
        inp = ScenarioInput(
            name=r.name,
            demand_increase_pct=r.demand_increase_pct,
            prod_capacity_change_pct=r.prod_capacity_change_pct,
            transport_delay_days=r.transport_delay_days,
            lead_time_days=r.lead_time_days
        )
        out.append(ScenarioResultOut(
            id=r.id,
            name=r.name,
            inputs=inp,
            demand_units=res.get("demand_units", 0.0),
            production_util_pct=res.get("production_util_pct", 0.0),
            inventory_delta_pct=res.get("inventory_delta_pct", 0.0),
            stockout_risk_pct=res.get("stockout_risk_pct", 0.0),
            shipment_requirement=res.get("shipment_requirement", 0),
            dock_util_pct=res.get("dock_util_pct", 0.0),
            financial_impact_inr=res.get("financial_impact_inr", 0.0),
            actions=res.get("actions", []),
            collections=res.get("collections", []),
            created_at=r.created_at
        ))
    return ScenarioHistoryOut(runs=out)
