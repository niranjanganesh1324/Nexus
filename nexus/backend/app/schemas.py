"""
Pydantic v2 schemas for all API request/response models.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


# ─────────── Shared ───────────

class OKResponse(BaseModel):
    ok: bool = True
    message: str = ""


# ─────────── Facility ───────────

class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    facility_type: str
    lat: float
    lng: float
    city: str


# ─────────── Truck ───────────

class TruckTrackingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    truck_id: str
    progress_pct: float
    speed_kmh: float
    distance_remaining_km: float
    total_distance_km: float
    delay_minutes: int
    current_lat: Optional[float]
    current_lng: Optional[float]
    last_updated: datetime


class TruckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trailer_id: str
    shipment_id: str
    origin_id: str
    destination_id: str
    load_units: int
    load_type: str
    priority: str
    scheduled_eta: str
    arrival_window: str
    driver_name: str
    status: str
    dock_id: Optional[str]
    linked_material_id: Optional[str]
    tracking_state: Optional[TruckTrackingOut]

    # Populated from relationships
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None


class TruckListOut(BaseModel):
    trucks: List[TruckOut]
    total: int


# ─────────── Dock ───────────

class DockAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dock_id: str
    truck_id: str
    slot_start: int
    slot_end: int
    assigned_at: datetime
    status: str


class DockMaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dock_id: str
    slot_start: int
    slot_end: int
    reason: str
    created_at: datetime


class DockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    facility_id: str
    zone: str
    distance_from_gate: int
    supported_load_types: str  # JSON string
    status: str
    assignments: List[DockAssignmentOut] = []
    maintenance_windows: List[DockMaintenanceOut] = []


class DockRecommendationBreakdown(BaseModel):
    availability: float
    compatibility: float
    priority: float
    eta_alignment: float
    proximity: float


class DockCandidate(BaseModel):
    dock_id: str
    score: float
    available_in_minutes: float
    compatible: bool
    breakdown: DockRecommendationBreakdown


class DockRecommendationOut(BaseModel):
    truck_id: str
    best: Optional[DockCandidate]
    confidence: float
    candidates: List[DockCandidate]
    breakdown: Optional[DockRecommendationBreakdown]
    explanation: str


class AssignDockRequest(BaseModel):
    truck_id: str
    slot_start: int
    slot_end: int


class MaintenanceRequest(BaseModel):
    slot_start: int
    slot_end: int
    reason: str = "Scheduled maintenance"


# ─────────── Yard ───────────

class YardEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    occurred_at: datetime
    event_type: str
    icon: str
    text: str
    truck_id: Optional[str]


class YardMetricsOut(BaseModel):
    occupied: int
    available: int
    maintenance: int
    utilization_pct: float
    active_arrivals: int


class ConflictOut(BaseModel):
    load_type: str
    trucks: List[str]
    compatible_docks: List[str]
    severity: str
    recommended_sequencing: str


class WhatIfRequest(BaseModel):
    truck_id: str
    delay_minutes: int = 30


class WhatIfResult(BaseModel):
    truck_id: str
    delay_minutes: int
    preferred_dock: Optional[str]
    fallback_dock: Optional[str]
    preferred_score: Optional[float]
    fallback_score: Optional[float]
    narrative: str


# ─────────── Dock Schedule ───────────

class DockScheduleSlotOut(BaseModel):
    slot_index: int
    time_label: str
    dock_id: str
    truck_id: Optional[str]
    trailer_id: Optional[str]
    is_maintenance: bool
    assignment_id: Optional[int]


class DockScheduleOut(BaseModel):
    slots: List[str]
    schedule: List[DockScheduleSlotOut]
    summary: str


# ─────────── Alerts ───────────

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    severity: str
    category: str
    title: str
    description: str
    impact: Optional[str]
    recommended_action: Optional[str]
    status: str
    source_type: Optional[str]
    source_id: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]


class AlertListOut(BaseModel):
    alerts: List[AlertOut]
    open_count: int
    resolved_count: int


# ─────────── Demand / P2 ───────────

class DemandRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    collection_id: str
    period_label: str
    forecast_units: float
    actual_units: Optional[float]
    merch_forecast_units: Optional[float]
    sell_through_pct: Optional[float]


class DemandCollectionOut(BaseModel):
    collection_id: str
    name: str
    records: List[DemandRecordOut]
    consensus_next: Optional[float]
    demand_signal: str          # "High Demand"/"Stable"/"Below Plan"/"Above Plan"
    variance_pct: Optional[float]


class DemandPageOut(BaseModel):
    collections: List[DemandCollectionOut]
    total_forecast: float
    total_actual: float
    total_consensus: float
    forecast_variance_pct: float
    mape: Optional[float]
    rmse: Optional[float]
    model_type: str


# ─────────── Inventory ───────────

class InventoryRowOut(BaseModel):
    period_label: str
    opening_units: float
    inbound_units: float
    production_units: float
    sales_units: float
    closing_units: float
    safety_stock_units: float
    days_of_cover: float
    risk_level: str


class InventoryCollectionOut(BaseModel):
    collection_id: str
    name: str
    rows: List[InventoryRowOut]
    linked_truck_id: Optional[str]
    current_risk: str
    why: str
    action: str


class InventoryPageOut(BaseModel):
    collections: List[InventoryCollectionOut]
    total_closing: float
    stockout_risks: int
    excess_count: int
    scenario_active: bool
    delay_impact_narrative: Optional[str]


# ─────────── S&OP ───────────

class SOPMonthRow(BaseModel):
    period_label: str
    demand: float
    production: float
    inbound: float
    closing_inventory: float
    capacity_pct: float
    supply_gap: float
    financial_impact_inr: float


class SOPCapacityRow(BaseModel):
    facility_id: str
    facility_name: str
    utilization_pct: float
    planned_units: int
    available_units: int
    constraint_desc: Optional[str]
    lead_time_days: int


class SOPPageOut(BaseModel):
    monthly_plan: List[SOPMonthRow]
    capacity: List[SOPCapacityRow]
    current_decision: str
    health_scores: Dict[str, float]
    overall_health: float


# ─────────── Procurement ───────────

class ProcurementRowOut(BaseModel):
    material_id: str
    name: str
    collection_name: str
    required_qty: float
    on_hand_qty: float
    net_requirement: float
    moq: float
    recommended_order: float
    lead_time_days: int
    linked_truck_id: Optional[str]
    status: str


class ProcurementPageOut(BaseModel):
    rows: List[ProcurementRowOut]
    at_risk_count: int
    moq_compliant_pct: float
    avg_lead_time_days: float
    linked_trucks: int


# ─────────── Markdown ───────────

class MarkdownCollectionOut(BaseModel):
    collection_id: str
    name: str
    sell_through_pct: float
    inventory_units: float
    weeks_remaining: float
    status: str
    action: str
    markdown_pct: Optional[float]


class MarkdownPageOut(BaseModel):
    collections: List[MarkdownCollectionOut]


# ─────────── Financial ───────────

class FinancialScenarioOut(BaseModel):
    name: str
    revenue_inr: float
    cost_inr: float
    margin_inr: float
    margin_pct: float


class FinancialPageOut(BaseModel):
    scenarios: List[FinancialScenarioOut]
    base_revenue_inr: float
    base_cost_inr: float
    base_margin_inr: float


# ─────────── Scenarios ───────────

class ScenarioInput(BaseModel):
    name: str = "Custom Scenario"
    demand_increase_pct: float = 0.0
    prod_capacity_change_pct: float = 0.0
    transport_delay_days: float = 0.0
    lead_time_days: float = 7.0

    @field_validator("demand_increase_pct")
    @classmethod
    def clamp_demand(cls, v: float) -> float:
        return max(-50.0, min(200.0, v))

    @field_validator("prod_capacity_change_pct")
    @classmethod
    def clamp_prod(cls, v: float) -> float:
        return max(-50.0, min(50.0, v))

    @field_validator("transport_delay_days")
    @classmethod
    def clamp_delay(cls, v: float) -> float:
        return max(0.0, min(14.0, v))

    @field_validator("lead_time_days")
    @classmethod
    def clamp_lead(cls, v: float) -> float:
        return max(1.0, min(90.0, v))


class ScenarioResultOut(BaseModel):
    id: int
    name: str
    inputs: ScenarioInput
    demand_units: float
    production_util_pct: float
    inventory_delta_pct: float
    stockout_risk_pct: float
    shipment_requirement: int
    dock_util_pct: float
    financial_impact_inr: float
    actions: List[str]
    collections: List[Dict[str, Any]]
    created_at: datetime


class ScenarioHistoryOut(BaseModel):
    runs: List[ScenarioResultOut]


# ─────────── Reports ───────────

class ReportOut(BaseModel):
    range_key: str
    otif_pct: float
    forecast_accuracy_pct: float
    inv_turns: float
    capacity_util_pct: float
    avg_delay_days: float
    dock_util_pct: float
    supply_gap_units: float
    shipment_performance_pct: float
    generated_at: datetime


# ─────────── Overview ───────────

class KPIOut(BaseModel):
    label: str
    value: str
    unit: str
    sub: str
    trend: str
    trend_val: str
    status: str
    spark: List[float]
    nav: str


class OverviewOut(BaseModel):
    kpis: List[KPIOut]
    flow: Dict[str, Any]
    sop_health: Dict[str, Any]
    active_alerts: List[AlertOut]
    demand_forecast: float
    production_units: float
    total_shipments: int
    at_risk_shipments: int
    dock_utilization_pct: float


# ─────────── WebSocket ───────────

class WSMessage(BaseModel):
    type: str   # "truck_update" | "dock_update" | "alert" | "yard_event"
    payload: Dict[str, Any]
