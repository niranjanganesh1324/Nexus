# NEXUS — Supply Chain Control Tower

NEXUS is an integrated, end-to-end supply chain control tower built for the **Cognizant NPN_SCM Hackathon, August 2026**.

It unifies execution logistics (**E2 — Where's My Truck? Yard, Dock Door & Delivery Tracker**) with strategic planning (**P2 — Integrated S&OP for TrendWear Apparel**), closing the loop between real-time truck/dock operations and 6-month S&OP financial projections.

---

## 1. Problem & Architecture

### The Problem
- **E2 Execution**: Warehouse teams and logistics managers lack a single real-time view of truck movement, yard location, trailer availability and dock assignments.
- **P2 Planning**: Disconnected 6-week apparel product lifecycles lead to stockouts on fast movers and excess slow movers due to rigid fabric lead times (4–6 weeks).
- **Execution-Planning Disconnect**: Operational truck delays or yard disruptions are rarely reflected in financial and procurement plans until it's too late.

### Solution & System Architecture

```
                    ┌────────────────────────────────────────┐
                    │            NEXUS Frontend              │
                    │  Vanilla JS / CSS / Leaflet Map / ES6  │
                    └───────────────────┬────────────────────┘
                                        │ REST API + WebSockets (/ws/live)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │            FastAPI Backend             │
                    │         Python 3.11 / Pydantic v2      │
                    └───────────┬────────────────┬───────────┘
                                │                │
                   ┌────────────┴───┐        ┌───┴──────────┐
                   │   E2 Execution │        │  P2 Planning │
                   │     Engine     │        │    Engine    │
                   └────────────┬───┘        └───┬──────────┘
                                │                │
                                └────────┬───────┘
                                         ▼
                                ┌─────────────────┐
                                │   PostgreSQL    │
                                │ (SQLite dev db) │
                                └─────────────────┘
```

---

## 2. Technical Implementation Highlights

1. **Server-Authoritative Live Truck Tracking**:
   - Backend background loop updates positions, speed, and ETA every 2.5 seconds.
   - Synchronized across multiple browser tabs via WebSockets (`/ws/live`).
   - Refreshing or reopening the browser preserves exact position and progress.

2. **Explainable Dock Recommendation Engine**:
   - Scores candidates using: `Availability (35) + Compatibility (25) + Priority (20) + ETA Alignment (10) + Proximity (10)`.
   - Returns confidence score, breakdown, and operational narrative.

3. **Transactionally Safe Dock Assignment**:
   - Database isolation & row locking prevent double-booking.
   - Simultaneous conflicting assignment requests receive `HTTP 409 Conflict`.

4. **Holt-Winters Statistical Forecasting**:
   - Exponential smoothing with 80/20 train/validation split over 18 months of historical data.
   - Computes **MAPE** and **RMSE** on validation data.

5. **Closed-Loop E2 ↔ P2 Feedback**:
   - Delayed inbound fabric trucks (e.g. `TRK-104`) calculate missing material availability.
   - Automatically recalculates 6-month inventory runway, triggering S&OP alerts and procurement recommendations.

6. **Unified Scenario Engine**:
   - Reuses exact domain calculation models across Demand, Inventory, Procurement, and Financial modules.

---

## 3. Quick Start (Local & Docker)

### Option A: Local Development

```bash
# 1. Install dependencies
cd nexus/backend
pip install -r requirements.txt

# 2. Seed SQLite database
python -m app.seed

# 3. Start FastAPI application (serves API + Frontend bundle)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **http://localhost:8000** in your browser. API docs available at **http://localhost:8000/docs**.

### Option B: Docker Compose

```bash
# Run entire stack (FastAPI + PostgreSQL)
docker compose up --build
```
Access the control tower at **http://localhost:8000**.

---

## 4. Running Test Suite

```bash
cd nexus/backend
PYTHONPATH=. pytest tests/ -v
```

Includes concurrency conflict test (`test_concurrent_dock_assignment_conflict`) and API end-to-end integration tests.

---

## 5. What's Real vs Simulated

| Component | Status | Details |
|---|---|---|
| **Database & ORM** | **REAL** | SQLAlchemy 2.0 ORM models persisted in DB |
| **API & Business Logic** | **REAL** | FastAPI REST + WebSocket engine |
| **Tracking Engine** | **REAL** | Server-side physics simulation & broadcasting |
| **Forecasting & Metrics** | **REAL** | Holt-Winters / Exponential smoothing + real MAPE/RMSE |
| **Dock Allocation & Scoring** | **REAL** | Transactionally safe scoring algorithm |
| **Scenario Recalculation** | **REAL** | Reuses core domain functions |
| **WMS & GPS Feed** | **SYNTHETIC** | Official hackathon synthetic feed format |
