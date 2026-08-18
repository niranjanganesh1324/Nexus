# ⚡ NEXUS — End-to-End Supply Chain Control Tower

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nexus--supply--chain.vercel.app-00D4C7?style=for-the-badge&logo=vercel&logoColor=white)](https://nexus-supply-chain.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/niranjanganesh1324/Nexus)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://fastapi.tiangolo.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)

> Built for the **Cognizant NPN_SCM Hackathon (August 2026)**.  
> **NEXUS** unifies real-time logistics execution (**E2: Where's My Truck? Yard, Dock Door & Delivery Tracker**) with strategic merchandise planning (**P2: Integrated S&OP for TrendWear Apparel**), delivering true closed-loop visibility from highway GPS telemetry to 6-month financial inventory runways.

---

## 🌐 Live Application & Links

* **🚀 Live Cloud Deployment**: [https://nexus-supply-chain.vercel.app](https://nexus-supply-chain.vercel.app)
* **📂 GitHub Source Repository**: [https://github.com/niranjanganesh1324/Nexus](https://github.com/niranjanganesh1324/Nexus)
* **👥 Team Workload & Contribution Guide**: [`TEAM_CONTRIBUTIONS.md`](TEAM_CONTRIBUTIONS.md)
* **📖 Interactive Swagger API Docs**: `http://localhost:8000/docs` (when running locally)

---

## 🎯 Hackathon Use Cases Solved

### 1. **E2 Logistics Execution — "Where's My Truck?" & Dock Allocation**
* **The Challenge**: Fragmented logistics tracking, blind spots on highway transit times, double-booked dock doors, and manual trailer-to-door allocation.
* **NEXUS Solution**:
  * **Server-Authoritative GPS Stream**: Real-time position advancement across South-Central India network corridors (Mumbai, Bangalore, Chennai, Hyderabad).
  * **Interactive Dual-Theme Leaflet Map**: Switch seamlessly between **🌙 Dark Mode** (CartoDB Dark Matter) and **☀️ Light Mode** (CartoDB Positron) with route corridor rendering and dynamic camera focus.
  * **Explainable Dock Door Scoring Model**: 5-factor mathematical scoring engine ranking dock doors with transparent rationale and transactional row-locking to eliminate double-booking.

### 2. **P2 Strategic Planning — Integrated S&OP for TrendWear Apparel**
* **The Challenge**: Fast 6-week fashion life cycles coupled with 4-to-6-week fabric lead times causing stockouts on fast-movers and excess inventory on slow-movers.
* **NEXUS Solution**:
  * **3 Dedicated S&OP Subsections**:
    1. **Rolling Monthly Plan**: 6-month integrated master matrix linking Gross Demand, Committed Production, Inbound Logistics, and Plant Capacity.
    2. **Supply Plan**: Collection-by-collection material balance (*Summer Linen*, *Denim Core*, *Activewear*, *Winter Jacket*) tracking days of cover and raw fabric pipelines.
    3. **Production Capacity**: Regional factory utilization grid (*Mumbai*, *Hyderabad*, *Bangalore*, *Chennai*) with line constraints and lead times.
  * **Holt-Winters Statistical Forecasting**: Exponential smoothing with trend and seasonality over 18 months of historical records, reporting real validation **MAPE** and **RMSE**.
  * **Markdown Intelligence Engine**: Sell-through velocity tracking recommending optimized clearance schedules to protect gross margins.

### 3. **The Closed-Loop Feedback Interlock (E2 ↔ P2)**
Highway disruptions trigger instant, automated ripples into strategic planning:

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  TRK-104 Delayed       │      │  Premium Linen         │      │  Summer Linen          │      │  S&OP Master Schedule  │
│  (+32 min on corridor) │ ───► │  Fabric Shortfall      │ ───► │  Safety Stock Warning  │ ───► │  Capacity Rebalancing  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NEXUS FRONTEND                                │
│        Vanilla ES Modules · Leaflet 1.9.4 · Liquid Glass UI             │
│   Hash Router · Omni-Search (⌘K) · Dark/Light Map · Fallback Polling    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API & WebSockets (/ws/live)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                                │
│       Python 3.11-3.14 · Pydantic v2 · SQLAlchemy 2.0 · PuLP LP         │
└──────────────┬───────────────────────────────────────────┬──────────────┘
               │                                           │
┌──────────────▼─────────────┐               ┌─────────────▼──────────────┐
│     E2 EXECUTION ENGINE    │               │     P2 PLANNING ENGINE     │
│ ────────────────────────── │               │ ────────────────────────── │
│ • GPS Telemetry Physics    │               │ • Holt-Winters Forecast    │
│ • 5-Factor Dock Scoring    │◄─────────────►│ • 6-Month S&OP Matrix      │
│ • Conflict Predictor       │  Closed-Loop  │ • Markdown Engine          │
│ • What-If Delay Analysis   │   Feedback    │ • Scenario Simulator (LP)  │
└──────────────┬─────────────┘               └─────────────┬──────────────┘
               │                                           │
               └─────────────────────┬─────────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │    STORAGE & PERSISTENCE    │
                      │  PostgreSQL / SQLite (/tmp) │
                      └─────────────────────────────┘
```

---

## 🧮 Mathematical & Algorithmic Formulations

### 1. Explainable Dock Door Scoring Model

Candidate dock doors are evaluated against 5 weighted operational dimensions (scored out of 100 points):

$$\text{Total Score} = S_{\text{avail}}(35) + S_{\text{compat}}(25) + S_{\text{priority}}(20) + S_{\text{ETA}}(10) + S_{\text{proximity}}(10)$$

* **Availability ($35\text{ pts}$)**: $35\text{ pts}$ if completely idle and outside maintenance windows; $0\text{ pts}$ if occupied.
* **Compatibility ($25\text{ pts}$)**: $25\text{ pts}$ if dock equipment capabilities (cold-chain, apparel hanger, pallet jack) match trailer requirements.
* **Priority ($20\text{ pts}$)**: $20\text{ pts}$ for urgent/hot freight (`TRK-104`), $12\text{ pts}$ for medium, $5\text{ pts}$ for standard.
* **ETA Alignment ($10\text{ pts}$)**: Proportional to the delta between truck yard arrival and door readiness ($\Delta t \le 15\text{ min}$).
* **Proximity ($10\text{ pts}$)**: Forklift travel distance from bay to target staging zone.

---

### 2. Triple Holt-Winters Exponential Smoothing

Apparel demand forecasting extracts level ($\ell_t$), linear trend ($b_t$), and multiplicative seasonal factors ($s_t$) across an $L=12$ monthly cycle:

$$\hat{y}_{t+m} = (\ell_t + m \cdot b_t) \cdot s_{t - L + 1 + (m-1)\bmod L}$$

**Model Validation Metrics**:
* **Mean Absolute Percentage Error (MAPE)**:
  $$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^n \left| \frac{y_t - \hat{y}_t}{y_t} \right|$$
* **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2}$$

---

## 🚀 Key Features Matrix

| Module | Core Capabilities |
|---|---|
| **Live Network Traffic Map** | Dual CartoDB Dark/Light mode, live truck GPS markers, corridor lines, search overlay, dynamic camera zoom. |
| **S&OP Master Cycle** | 5-stage workflow, 6-month integrated rolling matrix, collection supply balance, plant capacity constraints. |
| **Where's My Truck?** | Fleet status badges, real-time speed, distance remaining, driver info, and explainable dock recommendation. |
| **Yard Command Center** | Real-time dock matrix (D01–D08), predictive conflict monitor, 30-min what-if delay simulator. |
| **Trailer $\to$ Door Allocation** | Shift-by-shift door assignment matrix, carrier tracking, door turn times. |
| **Omni-Search Command Palette** | Press `⌘K` or `Ctrl+K` to search across modules, trucks, facilities, collections, docks, and alerts. |
| **Scenario Simulator** | Real-time parametric sliders testing Demand Surges, Transport Delays, and Capacity Shifts. |
| **Decision Center** | Cross-functional action board aligning Merchandising, Logistics, and Plant Managers. |

---

## 💻 Local Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/niranjanganesh1324/Nexus.git
cd Nexus
```

### 2. Setup Backend & Install Dependencies
```bash
cd nexus/backend
pip install -r requirements.txt
```

### 3. Seed Database
```bash
python -m app.seed
```

### 4. Run Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🐳 Docker Deployment

To spin up the full production stack with PostgreSQL:
```bash
docker compose up --build
```
Access the application at **http://localhost:8000**.

---

## 🧪 Running Automated Tests

Run the backend test suite covering API endpoints and concurrent dock assignment transactions:
```bash
cd nexus/backend
pytest tests/ -v
```

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules), Vanilla CSS (Liquid Glass & Dark Neumorphism), Leaflet.js.
* **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Starlette.
* **Data Science & Optimization**: Pandas, NumPy, Statsmodels, SciPy, PuLP.
* **Database**: PostgreSQL (Production) / SQLite with WAL mode (Development & Serverless `/tmp`).
* **Deployment**: Vercel (Serverless Functions + Static Edge CDN) / Docker Compose.

---

## 👥 Authors & Team Contributions

Please refer to [`TEAM_CONTRIBUTIONS.md`](TEAM_CONTRIBUTIONS.md) for the detailed 6-person workload distribution across Architecture, Logistics Execution (E2), S&OP Planning (P2), Optimization, Frontend UI/UX, and QA/DevOps.
