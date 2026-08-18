from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProductCollection, DemandRecord
from app.schemas import DemandPageOut, DemandCollectionOut, DemandRecordOut
from app.services.forecast_engine import run_forecast

router = APIRouter(prefix="/api/demand", tags=["P2 - Demand Planning"])

@router.get("", response_model=DemandPageOut)
def get_demand_page(db: Session = Depends(get_db)):
    collections = db.query(ProductCollection).all()
    col_outputs = []
    
    total_forecast = 0.0
    total_actual = 0.0
    total_consensus = 0.0

    last_mape = None
    last_rmse = None
    last_model = "holt_winters"

    for col in collections:
        # Run forecasting pipeline for evaluation & consensus forecast
        fc_res = run_forecast(col.id, db, n_forecast=6)
        if fc_res["mape"] is not None:
            last_mape = fc_res["mape"]
        if fc_res["rmse"] is not None:
            last_rmse = fc_res["rmse"]
        last_model = fc_res["model_type"]

        records = db.query(DemandRecord).filter(
            DemandRecord.collection_id == col.id,
            DemandRecord.period_label >= "2025-01"
        ).order_by(DemandRecord.period_label).all()

        rec_outs = [DemandRecordOut.model_validate(r) for r in records]

        # Calculate metrics
        col_forecast = sum(r.forecast_units for r in records if r.forecast_units)
        col_actual = sum(r.actual_units for r in records if r.actual_units)
        
        # Consensus demand for next period
        consensus_next = fc_res["forecast"][0] if fc_res["forecast"] else (col_forecast / max(len(records), 1))
        
        var_pct = ((col_actual - col_forecast) / col_forecast * 100.0) if col_forecast > 0 else 0.0
        
        if var_pct > 10.0:
            signal = "High Demand"
        elif var_pct < -10.0:
            signal = "Below Plan"
        elif var_pct > 5.0:
            signal = "Above Plan"
        else:
            signal = "Stable"

        total_forecast += col_forecast
        total_actual += col_actual
        total_consensus += consensus_next

        col_outputs.append(DemandCollectionOut(
            collection_id=col.id,
            name=col.name,
            records=rec_outs,
            consensus_next=round(consensus_next, 0),
            demand_signal=signal,
            variance_pct=round(var_pct, 1)
        ))

    overall_var_pct = ((total_actual - total_forecast) / total_forecast * 100.0) if total_forecast > 0 else 0.0

    return DemandPageOut(
        collections=col_outputs,
        total_forecast=round(total_forecast, 0),
        total_actual=round(total_actual, 0),
        total_consensus=round(total_consensus, 0),
        forecast_variance_pct=round(overall_var_pct, 1),
        mape=last_mape,
        rmse=last_rmse,
        model_type=last_model
    )
