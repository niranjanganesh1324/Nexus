"""
Deterministic, reproducible seed script for NEXUS.
Generates all initial data for E2 and P2.
"""
from datetime import datetime, timedelta
import random
import math
import json
from app.database import Base, SessionLocal, engine
from app.models import (
    Alert, Dock, DockAssignment, DockMaintenanceWindow, FabricMaterial,
    Facility, InventorySnapshot, MarkdownRule, MarkdownRecommendation,
    PlantCapacity, ProductCollection, DemandRecord, Truck, TruckTrackingState, YardEvent
)

def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Facilities
        facilities = [
            Facility(id="FAC-MUM-PLANT", name="Mumbai Plant", facility_type="plant", lat=19.0760, lng=72.8777, city="Mumbai"),
            Facility(id="FAC-MUM-DC", name="Mumbai DC", facility_type="dc", lat=19.1800, lng=72.9800, city="Mumbai"),
            Facility(id="FAC-HYD-PLANT", name="Hyderabad Plant", facility_type="plant", lat=17.3850, lng=78.4867, city="Hyderabad"),
            Facility(id="FAC-HYD-DC", name="Hyderabad DC", facility_type="dc", lat=17.5100, lng=78.6000, city="Hyderabad"),
            Facility(id="FAC-BLR-PLANT", name="Bangalore Plant", facility_type="plant", lat=12.9716, lng=77.5946, city="Bangalore"),
            Facility(id="FAC-BLR-DC", name="Bangalore DC", facility_type="dc", lat=13.0500, lng=77.7200, city="Bangalore"),
            Facility(id="FAC-MAA-PLANT", name="Chennai Plant", facility_type="plant", lat=13.0827, lng=80.2707, city="Chennai"),
            Facility(id="FAC-MAA-DC", name="Chennai DC", facility_type="dc", lat=13.1500, lng=80.3500, city="Chennai"),
        ]
        db.add_all(facilities)
        db.flush()

        # 2. Canonical Product Collections
        collections = [
            ProductCollection(id="COL-SUMMER-LINEN", name="Summer Linen", season="Summer", unit_price_inr=1299.0, production_cost_inr=450.0),
            ProductCollection(id="COL-DENIM-CORE", name="Denim Core", season="All", unit_price_inr=1999.0, production_cost_inr=750.0),
            ProductCollection(id="COL-ACTIVEWEAR", name="Activewear", season="All", unit_price_inr=1499.0, production_cost_inr=500.0),
            ProductCollection(id="COL-WINTER-JACKET", name="Winter Jacket", season="Winter", unit_price_inr=3499.0, production_cost_inr=1400.0),
        ]
        db.add_all(collections)
        db.flush()

        # 3. Fabric Materials
        fabrics = [
            FabricMaterial(id="FAB-LINEN-PREMIUM", collection_id="COL-SUMMER-LINEN", name="Premium Linen", required_qty=12000.0, on_hand_qty=3000.0, moq=5000.0, lead_time_days=21, unit_cost_inr=180.0, status="At Risk"),
            FabricMaterial(id="FAB-DENIM-STRETCH", collection_id="COL-DENIM-CORE", name="Stretch Denim", required_qty=8400.0, on_hand_qty=6200.0, moq=3000.0, lead_time_days=14, unit_cost_inr=220.0, status="On Track"),
            FabricMaterial(id="FAB-KNIT-PERF", collection_id="COL-ACTIVEWEAR", name="Performance Knit", required_qty=6000.0, on_hand_qty=1800.0, moq=2000.0, lead_time_days=28, unit_cost_inr=150.0, status="Watch"),
            FabricMaterial(id="FAB-WOOL-HEAVY", collection_id="COL-WINTER-JACKET", name="Heavy Wool Blend", required_qty=9500.0, on_hand_qty=4000.0, moq=4000.0, lead_time_days=30, unit_cost_inr=450.0, status="Watch"),
        ]
        db.add_all(fabrics)
        db.flush()

        # 4. Docks first (so Truck foreign keys to dock.id work)
        docks_data = [
            ("D01", "FAC-MAA-DC", "A", 2, ["General", "Express"], "Occupied"),
            ("D02", "FAC-MAA-DC", "A", 3, ["General", "Express", "Refrigerated"], "Available"),
            ("D03", "FAC-MAA-DC", "B", 1, ["General", "Fragile"], "Occupied"),
            ("D04", "FAC-MAA-DC", "B", 2, ["General", "Express"], "Occupied"),
            ("D05", "FAC-MAA-DC", "C", 4, ["General", "Fragile", "Refrigerated"], "Occupied"),
            ("D06", "FAC-MAA-DC", "C", 5, ["General", "Fragile", "Refrigerated"], "Available"),
            ("D07", "FAC-MAA-DC", "C", 6, ["General"], "Maintenance"),
        ]

        for did, facid, zone, dist, stypes, status in docks_data:
            d = Dock(id=did, facility_id=facid, zone=zone, distance_from_gate=dist, supported_load_types=json.dumps(stypes), status=status)
            db.add(d)
        db.flush()

        # 5. Trucks & Tracking
        trucks_data = [
            ("TRK-101", "TLR-7101", "SHP-2045", "FAC-MUM-PLANT", "FAC-MUM-DC", 640, "General", "Medium", "13:10", "12:45-13:15", "On Time", "D01", "FAB-LINEN-PREMIUM", 62.0, 54.0, 320.0, 0),
            ("TRK-102", "TLR-7102", "SHP-2046", "FAC-BLR-PLANT", "FAC-BLR-DC", 720, "Express", "Medium", "12:55", "12:30-13:00", "Arrived", "D02", "FAB-DENIM-STRETCH", 100.0, 0.0, 290.0, 0),
            ("TRK-103", "TLR-7103", "SHP-2047", "FAC-HYD-PLANT", "FAC-MAA-DC", 510, "Fragile", "High", "15:20", "14:50-15:30", "At Risk", None, "FAB-KNIT-PERF", 38.0, 41.0, 410.0, 14),
            ("TRK-104", "TLR-8821", "SHP-2048", "FAC-MAA-PLANT", "FAC-BLR-DC", 850, "Refrigerated", "High", "14:35", "14:15-14:50", "Delayed", "D04", "FAB-LINEN-PREMIUM", 71.0, 48.0, 250.0, 32),
            ("TRK-105", "TLR-7105", "SHP-2049", "FAC-BLR-PLANT", "FAC-HYD-DC", 390, "General", "Low", "16:05", "15:45-16:20", "On Time", "D05", "FAB-DENIM-STRETCH", 45.0, 57.0, 300.0, 0),
            ("TRK-106", "TLR-7106", "SHP-2050", "FAC-MAA-PLANT", "FAC-MAA-DC", 600, "Fragile", "Medium", "13:45", "13:30-14:00", "On Time", "D03", "FAB-KNIT-PERF", 80.0, 52.0, 270.0, 0),
            ("TRK-107", "TLR-7107", "SHP-2051", "FAC-MUM-PLANT", "FAC-BLR-DC", 480, "Refrigerated", "Low", "17:10", "16:50-17:30", "On Time", None, "FAB-WOOL-HEAVY", 15.0, 60.0, 350.0, 0),
            ("TRK-108", "TLR-7762", "SHP-2052", "FAC-HYD-PLANT", "FAC-MUM-DC", 710, "General", "High", "14:00", "13:45-14:20", "At Risk", None, "FAB-LINEN-PREMIUM", 55.0, 39.0, 380.0, 19),
        ]

        for tid, trid, sid, orig, dest, load, ltype, prio, eta, awin, status, dockid, matid, prog, spd, totkm, delmin in trucks_data:
            t = Truck(
                id=tid, trailer_id=trid, shipment_id=sid, origin_id=orig, destination_id=dest,
                load_units=load, load_type=ltype, priority=prio, scheduled_eta=eta, arrival_window=awin,
                status=status, dock_id=dockid, linked_material_id=matid, driver_name="Arun Kumar"
            )
            db.add(t)
            rem_km = round(totkm * (1.0 - prog / 100.0), 1)
            ts = TruckTrackingState(
                truck_id=tid, progress_pct=prog, speed_kmh=spd, total_distance_km=totkm,
                distance_remaining_km=rem_km, delay_minutes=delmin, last_updated=datetime.utcnow()
            )
            db.add(ts)
        db.flush()

        # 6. Dock Assignments & Maintenance
        assignments_data = [
            ("D01", "TRK-101", 0, 2),
            ("D02", "TRK-104", 1, 3),
            ("D03", "TRK-106", 4, 6),
            ("D04", "TRK-108", 0, 2),
            ("D06", "TRK-105", 5, 7),
        ]
        for did, tid, start, end in assignments_data:
            da = DockAssignment(dock_id=did, truck_id=tid, slot_start=start, slot_end=end, status="Scheduled")
            db.add(da)

        dm = DockMaintenanceWindow(dock_id="D04", slot_start=4, slot_end=6, reason="Equipment repair")
        db.add(dm)
        db.flush()

        # 7. Demand Records (18 months historical + 6 months future)
        period_labels = [f"2024-{m:02d}" for m in range(3, 13)] + [f"2025-{m:02d}" for m in range(1, 9)]
        random.seed(42)

        for col in collections:
            base_demand = {"COL-SUMMER-LINEN": 15000, "COL-DENIM-CORE": 12000, "COL-ACTIVEWEAR": 10000, "COL-WINTER-JACKET": 8000}[col.id]
            for idx, period in enumerate(period_labels):
                season_factor = 1.0 + 0.3 * math.sin(idx / 2.0)
                noise = random.uniform(-500, 500)
                actual = round(base_demand * season_factor + noise, 0)
                forecast = round(actual * random.uniform(0.92, 1.08), 0)
                merch = round(actual * random.uniform(0.90, 1.10), 0)
                st = round(random.uniform(60.0, 85.0), 1)

                dr = DemandRecord(
                    collection_id=col.id, period_label=period, forecast_units=forecast,
                    actual_units=actual, merch_forecast_units=merch, sell_through_pct=st
                )
                db.add(dr)
        db.flush()

        # 8. Inventory Snapshots (6 months rolling)
        inv_data = [
            ("COL-SUMMER-LINEN", 8000, 2000, 12000, [16500, 11000, 9500, 7000, 6200, 5400], 3000),
            ("COL-DENIM-CORE", 6500, 1000, 9000, [11200, 10500, 9800, 9300, 9000, 8700], 4000),
            ("COL-ACTIVEWEAR", 4200, 0, 7000, [10500, 9400, 8900, 8200, 7800, 7600], 2500),
            ("COL-WINTER-JACKET", 14000, 0, 5000, [7000, 6200, 5800, 4900, 4200, 3500], 4000),
        ]
        sop_periods = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]

        for cid, opening, inbound, prod, sales_arr, safety in inv_data:
            cur_op = opening
            for i, period in enumerate(sop_periods):
                inb = inbound if i == 0 else 0
                pr = prod if i == 0 else round(prod * 0.9, 0)
                sl = sales_arr[i]
                cl = cur_op + inb + pr - sl
                risk = "Stockout" if cl < 0 else ("Below Safety" if cl < safety else ("Excess" if cl > safety * 2.2 else "Healthy"))
                snap = InventorySnapshot(
                    collection_id=cid, period_label=period, opening_units=cur_op, inbound_units=inb,
                    production_units=pr, sales_units=sl, closing_units=cl, safety_stock_units=safety, risk_level=risk
                )
                db.add(snap)
                cur_op = cl
        db.flush()

        # 9. Plant Capacities
        capacities = [
            ("FAC-MAA-PLANT", 82.0, 11800, 2100, "Labor shift limit", 3),
            ("FAC-BLR-PLANT", 91.0, 9200, 600, "Machine capacity ceiling", 4),
            ("FAC-MUM-PLANT", 67.0, 7400, 3600, "None", 2),
            ("FAC-HYD-PLANT", 76.0, 8100, 2500, "Raw material lead time", 5),
        ]
        for fid, util, planned, avail, constr, lt in capacities:
            pc = PlantCapacity(facility_id=fid, period_label="2025-08", utilization_pct=util, planned_units=planned, available_units=avail, constraint_desc=constr, lead_time_days=lt)
            db.add(pc)
        db.flush()

        # 10. Markdown Rules & Recommendations
        for col in collections:
            rule = MarkdownRule(
                collection_id=col.id, sell_through_threshold_low=0.50, sell_through_threshold_high=0.75,
                weeks_remaining_threshold=4, recommended_markdown_pct_low=0.15, recommended_markdown_pct_high=0.20
            )
            db.add(rule)
            db.flush()

            st, inv, weeks, status, act, md = {
                "COL-WINTER-JACKET": (42.0, 5800.0, 3.0, "Critical", "15% markdown recommended", 0.15),
                "COL-SUMMER-LINEN": (68.0, 3200.0, 6.0, "Watch", "Monitor sell-through pace", None),
                "COL-DENIM-CORE": (82.0, 1100.0, 8.0, "Healthy", "No markdown required", None),
                "COL-ACTIVEWEAR": (81.0, 1400.0, 7.0, "Healthy", "No markdown required", None),
            }[col.id]

            rec = MarkdownRecommendation(rule_id=rule.id, period_label="2025-08", sell_through_pct=st, inventory_units=inv, weeks_remaining=weeks, status=status, action=act, markdown_pct=md)
            db.add(rec)

        # 11. Alerts & Yard Events
        alerts = [
            Alert(severity="Critical", category="Demand", title="Demand Surge", description="Sportswear demand increased 21% in South region.", impact="Potential inventory shortfall in 4 days.", recommended_action="Review production plan", status="Open", source_type="demand", source_id="COL-ACTIVEWEAR"),
            Alert(severity="High", category="Shipment", title="Shipment Delay — TRK-104", description="TRK-104 is 32 minutes behind schedule.", impact="Dock D04 allocation may be affected.", recommended_action="Reassign dock", status="Open", source_type="truck", source_id="TRK-104"),
            Alert(severity="Medium", category="Dock", title="Capacity Risk", description="Chennai DC dock utilization expected to exceed 90% at 16:00.", impact="Potential yard congestion during peak window.", recommended_action="View yard", status="Open", source_type="dock", source_id="D04"),
        ]
        db.add_all(alerts)

        events = [
            YardEvent(event_type="WMS", icon="📡", text="Yard feed synchronized — 7 dock doors monitored", facility_id="FAC-MAA-DC"),
            YardEvent(event_type="Exception", icon="⚠️", text="TRK-104 delay detected; ETA updated by +32 min", facility_id="FAC-MAA-DC", truck_id="TRK-104"),
            YardEvent(event_type="Decision", icon="🧠", text="Dock recommendation refreshed for incoming high-priority loads", facility_id="FAC-MAA-DC"),
            YardEvent(event_type="Arrival", icon="🚚", text="TRK-102 confirmed at facility and trailer identified", facility_id="FAC-MAA-DC", truck_id="TRK-102"),
        ]
        db.add_all(events)

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
