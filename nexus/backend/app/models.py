"""
All SQLAlchemy ORM models for NEXUS.

E2 (Execution) models: Facility, Truck, TruckTrackingState, Dock,
DockAssignment, DockMaintenanceWindow, Shipment, YardEvent, Alert

P2 (Planning) models: ProductCollection, DemandRecord, InventorySnapshot,
PlantCapacity, FabricMaterial, FabricOrder, MarkdownRule, MarkdownRecommendation,
ScenarioRun, ReportSnapshot
"""
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base


# ─────────────────────────── E2 EXECUTION ────────────────────────────

class Facility(Base):
    __tablename__ = "facility"

    id = Column(String(32), primary_key=True)          # e.g. "FAC-MUM-PLANT"
    name = Column(String(128), nullable=False)          # "Mumbai Plant"
    facility_type = Column(String(16), nullable=False)  # "plant" | "dc"
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    city = Column(String(64), nullable=False)

    docks = relationship("Dock", back_populates="facility", cascade="all, delete-orphan")
    yard_events = relationship("YardEvent", back_populates="facility")


class Truck(Base):
    __tablename__ = "truck"

    id = Column(String(16), primary_key=True)           # "TRK-101"
    trailer_id = Column(String(16), nullable=False)     # "TLR-7101"
    shipment_id = Column(String(16), nullable=False)    # "SHP-2045"
    origin_id = Column(String(32), ForeignKey("facility.id"), nullable=False)
    destination_id = Column(String(32), ForeignKey("facility.id"), nullable=False)
    load_units = Column(Integer, nullable=False)
    load_type = Column(String(16), nullable=False)      # General/Express/Fragile/Refrigerated
    priority = Column(String(8), nullable=False)        # High/Medium/Low
    scheduled_eta = Column(String(8), nullable=False)   # "13:10"
    arrival_window = Column(String(16), nullable=False) # "12:45–13:15"
    driver_name = Column(String(64), default="Arun Kumar")
    status = Column(String(16), nullable=False, default="On Time")  # On Time/Delayed/At Risk/Arrived
    dock_id = Column(String(8), ForeignKey("dock.id"), nullable=True)

    # Linked material for closed-loop E2→P2
    linked_material_id = Column(String(32), ForeignKey("fabric_material.id"), nullable=True)

    origin = relationship("Facility", foreign_keys=[origin_id])
    destination = relationship("Facility", foreign_keys=[destination_id])
    tracking_state = relationship("TruckTrackingState", back_populates="truck",
                                  uselist=False, cascade="all, delete-orphan")
    dock = relationship("Dock", back_populates="current_truck", foreign_keys=[dock_id])
    assignments = relationship("DockAssignment", back_populates="truck")
    yard_events = relationship("YardEvent", back_populates="truck")
    linked_material = relationship("FabricMaterial", back_populates="inbound_trucks")


class TruckTrackingState(Base):
    __tablename__ = "truck_tracking_state"

    truck_id = Column(String(16), ForeignKey("truck.id"), primary_key=True)
    progress_pct = Column(Float, default=0.0)      # 0–100
    speed_kmh = Column(Float, default=50.0)
    distance_remaining_km = Column(Float, default=0.0)
    total_distance_km = Column(Float, default=0.0)
    delay_minutes = Column(Integer, default=0)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)
    departed_at = Column(DateTime, nullable=True)
    arrived_at = Column(DateTime, nullable=True)

    truck = relationship("Truck", back_populates="tracking_state")


class Dock(Base):
    __tablename__ = "dock"

    id = Column(String(8), primary_key=True)            # "D01"
    facility_id = Column(String(32), ForeignKey("facility.id"), nullable=False)
    zone = Column(String(4), nullable=False)            # "A"/"B"/"C"
    distance_from_gate = Column(Integer, default=1)     # abstract units
    supported_load_types = Column(String(128), nullable=False)  # JSON-encoded list
    status = Column(String(16), nullable=False, default="Available")  # Available/Occupied/Maintenance

    facility = relationship("Facility", back_populates="docks")
    current_truck = relationship("Truck", back_populates="dock", foreign_keys="Truck.dock_id")
    assignments = relationship("DockAssignment", back_populates="dock",
                               cascade="all, delete-orphan")
    maintenance_windows = relationship("DockMaintenanceWindow", back_populates="dock",
                                       cascade="all, delete-orphan")


class DockAssignment(Base):
    __tablename__ = "dock_assignment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dock_id = Column(String(8), ForeignKey("dock.id"), nullable=False)
    truck_id = Column(String(16), ForeignKey("truck.id"), nullable=False)
    slot_start = Column(Integer, nullable=False)  # 0-based slot index
    slot_end = Column(Integer, nullable=False)    # exclusive
    assigned_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(16), default="Scheduled")  # Scheduled/Active/Completed/Cancelled

    dock = relationship("Dock", back_populates="assignments")
    truck = relationship("Truck", back_populates="assignments")

    __table_args__ = (
        Index("idx_dock_assignment_dock_slots", "dock_id", "slot_start", "slot_end"),
    )


class DockMaintenanceWindow(Base):
    __tablename__ = "dock_maintenance_window"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dock_id = Column(String(8), ForeignKey("dock.id"), nullable=False)
    slot_start = Column(Integer, nullable=False)
    slot_end = Column(Integer, nullable=False)
    reason = Column(String(256), default="Scheduled maintenance")
    created_at = Column(DateTime, default=datetime.utcnow)

    dock = relationship("Dock", back_populates="maintenance_windows")


class YardEvent(Base):
    __tablename__ = "yard_event"

    id = Column(Integer, primary_key=True, autoincrement=True)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String(32), nullable=False)  # WMS/Arrival/Assignment/Disruption/Decision/What-if
    icon = Column(String(8), default="📡")
    text = Column(String(512), nullable=False)
    facility_id = Column(String(32), ForeignKey("facility.id"), nullable=True)
    truck_id = Column(String(16), ForeignKey("truck.id"), nullable=True)

    facility = relationship("Facility", back_populates="yard_events")
    truck = relationship("Truck", back_populates="yard_events")


class Alert(Base):
    __tablename__ = "alert"

    id = Column(Integer, primary_key=True, autoincrement=True)
    severity = Column(String(16), nullable=False)    # Critical/High/Medium/Low
    category = Column(String(32), nullable=False)    # Demand/Inventory/Production/Shipment/Truck/Dock/Procurement
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    status = Column(String(16), default="Open")      # Open/Resolved
    source_type = Column(String(32), nullable=True)  # "truck"/"dock"/"inventory" etc.
    source_id = Column(String(64), nullable=True)    # the triggering entity id
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


# ─────────────────────────── P2 PLANNING ─────────────────────────────

class ProductCollection(Base):
    __tablename__ = "product_collection"

    id = Column(String(32), primary_key=True)         # "COL-SUMMER-LINEN"
    name = Column(String(128), nullable=False)         # "Summer Linen"
    season = Column(String(16), nullable=False)        # "Summer"/"Winter"/"All"
    unit_price_inr = Column(Float, nullable=False, default=599.0)
    production_cost_inr = Column(Float, nullable=False, default=280.0)

    demand_records = relationship("DemandRecord", back_populates="collection",
                                  cascade="all, delete-orphan")
    inventory_snapshots = relationship("InventorySnapshot", back_populates="collection",
                                       cascade="all, delete-orphan")
    fabric_materials = relationship("FabricMaterial", back_populates="collection",
                                    cascade="all, delete-orphan")
    markdown_rules = relationship("MarkdownRule", back_populates="collection",
                                  cascade="all, delete-orphan")


class DemandRecord(Base):
    __tablename__ = "demand_record"

    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(String(32), ForeignKey("product_collection.id"), nullable=False)
    period_label = Column(String(8), nullable=False)  # "2025-08"
    forecast_units = Column(Float, nullable=False)
    actual_units = Column(Float, nullable=True)       # null for future periods
    merch_forecast_units = Column(Float, nullable=True)  # Merchandising's original forecast
    sell_through_pct = Column(Float, nullable=True)

    collection = relationship("ProductCollection", back_populates="demand_records")

    __table_args__ = (
        UniqueConstraint("collection_id", "period_label", name="uq_demand_collection_period"),
    )


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshot"

    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(String(32), ForeignKey("product_collection.id"), nullable=False)
    period_label = Column(String(8), nullable=False)
    opening_units = Column(Float, nullable=False)
    inbound_units = Column(Float, default=0.0)
    production_units = Column(Float, default=0.0)
    sales_units = Column(Float, default=0.0)
    closing_units = Column(Float, nullable=False)
    safety_stock_units = Column(Float, nullable=False)
    risk_level = Column(String(16), nullable=False, default="Healthy")

    collection = relationship("ProductCollection", back_populates="inventory_snapshots")

    __table_args__ = (
        UniqueConstraint("collection_id", "period_label", name="uq_inv_collection_period"),
    )


class PlantCapacity(Base):
    __tablename__ = "plant_capacity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(String(32), ForeignKey("facility.id"), nullable=False)
    period_label = Column(String(8), nullable=False)   # "2025-08"
    utilization_pct = Column(Float, nullable=False)
    planned_units = Column(Integer, nullable=False)
    available_units = Column(Integer, nullable=False)
    constraint_desc = Column(String(256), nullable=True)
    lead_time_days = Column(Integer, default=3)


class FabricMaterial(Base):
    __tablename__ = "fabric_material"

    id = Column(String(32), primary_key=True)          # "FAB-LINEN-PREMIUM"
    collection_id = Column(String(32), ForeignKey("product_collection.id"), nullable=False)
    name = Column(String(128), nullable=False)          # "Premium Linen"
    required_qty = Column(Float, nullable=False)        # meters
    on_hand_qty = Column(Float, nullable=False, default=0.0)
    moq = Column(Float, nullable=False)                 # Minimum Order Quantity
    lead_time_days = Column(Integer, nullable=False, default=21)
    unit_cost_inr = Column(Float, default=45.0)
    status = Column(String(16), default="On Track")    # On Track/Watch/At Risk

    collection = relationship("ProductCollection", back_populates="fabric_materials")
    inbound_trucks = relationship("Truck", back_populates="linked_material")
    orders = relationship("FabricOrder", back_populates="material", cascade="all, delete-orphan")


class FabricOrder(Base):
    __tablename__ = "fabric_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_id = Column(String(32), ForeignKey("fabric_material.id"), nullable=False)
    order_qty = Column(Float, nullable=False)
    recommended = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("FabricMaterial", back_populates="orders")


class MarkdownRule(Base):
    __tablename__ = "markdown_rule"

    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(String(32), ForeignKey("product_collection.id"), nullable=False)
    sell_through_threshold_low = Column(Float, default=0.50)
    sell_through_threshold_high = Column(Float, default=0.75)
    weeks_remaining_threshold = Column(Integer, default=4)
    recommended_markdown_pct_low = Column(Float, default=0.15)
    recommended_markdown_pct_high = Column(Float, default=0.20)

    collection = relationship("ProductCollection", back_populates="markdown_rules")
    recommendations = relationship("MarkdownRecommendation", back_populates="rule",
                                   cascade="all, delete-orphan")


class MarkdownRecommendation(Base):
    __tablename__ = "markdown_recommendation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("markdown_rule.id"), nullable=False)
    period_label = Column(String(8), nullable=False)
    sell_through_pct = Column(Float, nullable=False)
    inventory_units = Column(Float, nullable=False)
    weeks_remaining = Column(Float, nullable=False)
    status = Column(String(16), nullable=False)        # Critical/Watch/Healthy
    action = Column(String(256), nullable=False)
    markdown_pct = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rule = relationship("MarkdownRule", back_populates="recommendations")


class ScenarioRun(Base):
    __tablename__ = "scenario_run"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), default="Custom Scenario")
    demand_increase_pct = Column(Float, default=0.0)
    prod_capacity_change_pct = Column(Float, default=0.0)
    transport_delay_days = Column(Float, default=0.0)
    lead_time_days = Column(Float, default=7.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Calculated outputs (stored as JSON text)
    results_json = Column(Text, nullable=True)


class ReportSnapshot(Base):
    __tablename__ = "report_snapshot"

    id = Column(Integer, primary_key=True, autoincrement=True)
    range_key = Column(String(16), nullable=False)     # "7d"/"30d"/"quarter"
    generated_at = Column(DateTime, default=datetime.utcnow)
    otif_pct = Column(Float, nullable=True)
    forecast_accuracy_pct = Column(Float, nullable=True)
    inv_turns = Column(Float, nullable=True)
    capacity_util_pct = Column(Float, nullable=True)
    avg_delay_days = Column(Float, nullable=True)
    dock_util_pct = Column(Float, nullable=True)
    supply_gap_units = Column(Float, nullable=True)
    shipment_performance_pct = Column(Float, nullable=True)
    data_json = Column(Text, nullable=True)


class ForecastRun(Base):
    __tablename__ = "forecast_run"

    id = Column(Integer, primary_key=True, autoincrement=True)
    collection_id = Column(String(32), ForeignKey("product_collection.id"), nullable=False)
    model_type = Column(String(32), default="holt_winters")
    mape = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    training_periods = Column(Integer, nullable=True)
    validation_periods = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    forecast_json = Column(Text, nullable=True)   # next 6 periods as JSON
