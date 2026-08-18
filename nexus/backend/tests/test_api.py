import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed import seed_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_db()
    yield

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_overview_endpoint():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert len(data["kpis"]) == 6
    assert data["total_shipments"] > 0

def test_trucks_endpoint():
    response = client.get("/api/trucks")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 8

def test_dock_recommendation():
    response = client.get("/api/docks/recommendation?truck_id=TRK-106")
    assert response.status_code == 200
    data = response.json()
    assert data["truck_id"] == "TRK-106"
    assert data["best"] is not None
    assert "breakdown" in data

def test_demand_forecasting():
    response = client.get("/api/demand")
    assert response.status_code == 200
    data = response.json()
    assert len(data["collections"]) == 4
    assert data["total_forecast"] > 0

def test_inventory_projection():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    data = response.json()
    assert len(data["collections"]) == 4

def test_scenario_execution():
    payload = {
        "name": "Test Surge",
        "demand_increase_pct": 25.0,
        "prod_capacity_change_pct": 5.0,
        "transport_delay_days": 2.0,
        "lead_time_days": 7.0
    }
    response = client.post("/api/scenarios/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["demand_units"] > 0
    assert len(data["actions"]) > 0

def test_reports_export():
    response = client.get("/api/reports/export?range=30d")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "OTIF" in response.text
