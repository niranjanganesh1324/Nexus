# 👥 NEXUS — Team Workload & Contribution Documentation

**Project Title**: NEXUS — Supply Chain Control Tower  
**Event**: Cognizant NPN_SCM Hackathon 2026  
**Tracks**: E2 Logistics Execution & P2 Integrated S&OP Planning  
**Repository**: [github.com/niranjanganesh1324/Nexus](https://github.com/niranjanganesh1324/Nexus)  
**Live Deployment**: [nexus-supply-chain.vercel.app](https://nexus-supply-chain.vercel.app)  

---

## 📋 Executive Summary of Team Roles

To deliver a production-grade, end-to-end supply chain control tower bridging physical execution with strategic S&OP planning, the workload was systematically distributed across 6 specialized roles:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TEAM NEXUS (6 MEMBERS)                               │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ Member 1                 │ Member 2                 │ Member 3                         │
│ System Architecture &    │ Real-time Logistics &    │ Data Science & S&OP              │
│ Full-Stack Integration   │ Execution Engine (E2)    │ Planning Engine (P2)             │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ Member 4                 │ Member 5                 │ Member 6                         │
│ Optimization, Scenarios  │ Frontend UI/UX &         │ QA, Concurrency Testing &        │
│ & Financial Modeling     │ Map Visualization        │ Cloud DevOps / Deployment        │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 👤 Detailed Individual Breakdown

### 🔷 Member 1: System Architect & Full-Stack Integration Lead
* **Primary Responsibility**: Core application architecture, database relational schema, and end-to-end E2 ↔ P2 closed-loop feedback pipeline.
* **Key Deliverables & Work Done**:
  1. **Relational Data Architecture**: Designed and implemented SQLAlchemy 2.0 ORM schema (`models.py`) connecting 8 facilities, 8 fleet trucks, 8 dock doors, 4 apparel collections, and raw materials.
  2. **E2 $\longleftrightarrow$ P2 Closed-Loop Integration**: Created the real-time feedback interlock where inbound logistics delays (`TRK-104`) immediately compute raw material shortfalls (Premium Linen) and recalculate the 6-month S&OP master schedule.
  3. **FastAPI Application Framework**: Built the modular router architecture (`main.py`, `app.js`) handling REST endpoints, CORS policies, error handling, and state synchronization.
  4. **State Store & Persistent Hash Routing**: Engineered `store.js` and URL hash routing (`#overview`, `#sop`, `#trucks`, `#yard`, etc.) with `localStorage` persistence across browser reloads.

---

### 🔷 Member 2: Backend Logistics Execution Engineer (E2 Track)
* **Primary Responsibility**: Real-time vehicle physics, GPS stream broadcasting, and explainable dock door allocation.
* **Key Deliverables & Work Done**:
  1. **Server-Authoritative Tracking Loop**: Engineered `tracking_engine.py` simulating real-time physics, highway progression (Mumbai–Bangalore–Chennai–Hyderabad), speed fluctuations, distance remaining, and delay propagation.
  2. **WebSocket & Fallback Polling Stream**: Built `/ws/live` connection manager (`ws.py`) and client-side fallback polling engine (`realtime.js`) ensuring zero-drop telemetry on both local servers and serverless clouds.
  3. **Explainable 5-Factor Dock Scoring Algorithm**: Implemented `dock_engine.py` evaluating dock doors using:
     $$\text{Score} = S_{\text{avail}}(35) + S_{\text{compat}}(25) + S_{\text{priority}}(20) + S_{\text{ETA}}(10) + S_{\text{proximity}}(10)$$
  4. **Yard & Dock Management Endpoints**: Built `e2_docks.py`, `e2_yard.py`, and predictive conflict monitoring for trailer arrivals and maintenance windows.

---

### 🔷 Member 3: Data Science & S&OP Planning Lead (P2 Track)
* **Primary Responsibility**: Demand forecasting, 6-month rolling master scheduling, and fabric procurement intelligence.
* **Key Deliverables & Work Done**:
  1. **Triple Exponential Smoothing (Holt-Winters)**: Developed `forecast_engine.py` analyzing 18 months of historical apparel demand to extract level ($\ell_t$), trend ($b_t$), and seasonal ($s_t$) factors with real validation **MAPE** and **RMSE** benchmarks.
  2. **3 Dedicated S&OP Subsections**:
     * *Rolling Monthly Plan*: 5-stage S&OP workflow linking gross demand, committed production, inbound transit, and plant capacity.
     * *Supply Plan*: Apparel collection supply-demand balance (*Summer Linen*, *Denim Core*, *Activewear*, *Winter Jacket*) and safety stock runways.
     * *Production Capacity*: Factory-level line constraints across Mumbai, Hyderabad, Bangalore, and Chennai plants.
  3. **Markdown Intelligence Engine**: Built `p2_markdown.py` calculating sell-through velocity and recommending markdown timing to protect gross margins.
  4. **Raw Material Pipeline**: Formulated MOQ, lead times (21–30 days), and purchase order advisories in `p2_procurement.py`.

---

### 🔷 Member 4: Optimization, Scenario Simulation & Financial Modeling
* **Primary Responsibility**: Linear programming optimization, what-if sensitivity analysis, and cross-functional decision governance.
* **Key Deliverables & Work Done**:
  1. **Parametric Scenario Simulation Engine**: Developed `scenario_engine.py` using PuLP Linear Programming to solve supply chain balance under variable demand surges ($\pm 30\%$), production shifts, and transport delays.
  2. **Financial Cost Modeling**: Designed `p2_financial.py` calculating holding costs, expediting freight charges, gross revenue, and margin exposure across baseline vs simulated scenarios.
  3. **Operational Exception & Alert Engine**: Implemented `alert_engine.py` and `e2_alerts.py` to continuously evaluate threshold breaches (critical delay, demand surge, stockout risk) and assign severity ratings (`Critical`, `Warning`, `Info`).
  4. **Cross-Functional Decision Center**: Created `decision.js` aligning Merchandising, Logistics, and Plant Managers on collaborative operational actions.

---

### 🔷 Member 5: Frontend UI/UX Architect & Map Visualization Specialist
* **Primary Responsibility**: User interface design system, interactive Leaflet network map, and omni-search command palette.
* **Key Deliverables & Work Done**:
  1. **Interactive Dual-Theme Leaflet Map**: Built `trucks.js` featuring real-time truck markers, route corridor polylines, facility markers, map search overlay, and a live toggle between **🌙 Dark Mode** (CartoDB Dark Matter) and **☀️ Light Mode** (CartoDB Positron).
  2. **Dynamic Camera Zoom & Fleet Selection**: Engineered zero-flicker truck switching (`selectTrackingTruck`) that smoothly pans/zooms the camera (`flyToBounds`) to the selected truck while updating telemetry panels.
  3. **Liquid Glass & Dark Neumorphic Design System**: Authored `styles.css` with responsive grid layouts, custom Aurora glowing background animations, glowing active states, and accessible contrast ratios.
  4. **Omni-Search Command Palette**: Created `toasts.js` with instant keyboard shortcut access (`⌘K` / `Ctrl+K`) to search across 15 modules, 8 trucks, 8 facilities, 4 collections, and live alerts.

---

### 🔷 Member 6: QA, Concurrency Testing & Cloud DevOps Engineer
* **Primary Responsibility**: Automated test suites, transaction safety verification, containerization, and Vercel serverless deployment.
* **Key Deliverables & Work Done**:
  1. **Automated Test Suite**: Authored `test_api.py` and `test_concurrency.py` covering REST endpoints, error states, and end-to-end integration flows.
  2. **Transactional Concurrency Validation**: Tested race conditions and row-locking in dock door assignments to verify that simultaneous conflicting booking requests return `HTTP 409 Conflict`.
  3. **Docker Stack**: Authored `Dockerfile` and `docker-compose.yml` orchestrating the FastAPI backend and PostgreSQL database.
  4. **Vercel Serverless Deployment & Cold-Start Resilience**:
     * Configured `vercel.json` and `api/index.py` serverless Python entrypoint.
     * Engineered `/tmp/nexus_dev.db` database routing in `database.py` to overcome AWS Lambda/Vercel read-only filesystem restrictions.
     * Implemented cold-start auto-seeding middleware ensuring fresh cloud instances instantly populate with all Hackathon datasets.

---

## 📊 Summary Work Matrix

| Member | Focus Area | Key Technologies Used | Primary Code Artifacts |
|---|---|---|---|
| **Member 1** | System Architecture & Integration | FastAPI, Python 3.11+, SQLAlchemy, ES6 | `app/main.py`, `app/models.py`, `frontend/js/app.js`, `store.js` |
| **Member 2** | Real-time Logistics & Yard (E2) | WebSockets, GPS Physics, Asyncio | `app/services/tracking_engine.py`, `dock_engine.py`, `e2_trucks.py` |
| **Member 3** | S&OP Planning & Forecasting (P2) | Statsmodels, Pandas, NumPy, Holt-Winters | `app/services/forecast_engine.py`, `p2_sop.py`, `p2_demand.py` |
| **Member 4** | Optimization & Scenario Modeling | PuLP Linear Programming, SciPy | `app/services/scenario_engine.py`, `p2_financial.py`, `e2_alerts.py` |
| **Member 5** | UI/UX & Interactive Map | Leaflet.js, CSS3 Liquid Glass, SVG | `frontend/js/pages/trucks.js`, `sop.js`, `styles.css`, `toasts.js` |
| **Member 6** | QA, Concurrency & Cloud DevOps | Pytest, Docker, Vercel Serverless, SQLite/Postgres | `tests/test_concurrency.py`, `docker-compose.yml`, `vercel.json`, `api/index.py` |

---

## 🏆 Project Impact & Outcomes

* **100% Functional End-to-End Control Tower**: Delivered a fully operational web application bridging strategic planning and physical logistics execution.
* **Production-Grade Zero-Lag Experience**: 0ms client-side tab switching, instant command palette, and smooth map pan/zoom.
* **Live Cloud Deployment**: Fully accessible online with continuous integration and automated GitHub-to-Vercel deployments.
