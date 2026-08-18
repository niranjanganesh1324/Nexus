"""
Main FastAPI Application for NEXUS Supply Chain Control Tower.
"""
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base, SessionLocal
from app.routers import (
    e2_trucks, e2_docks, e2_yard, e2_alerts,
    p2_demand, p2_inventory, p2_sop, p2_procurement, p2_markdown, p2_financial,
    scenarios, reports, overview
)
from app.services.tracking_engine import start_tracking_loop, stop_tracking_loop
from app.ws import manager, broadcast

_db_initialized = False

def init_db_data_if_needed():
    global _db_initialized
    if _db_initialized:
        return
    try:
        Base.metadata.create_all(bind=engine)
        from app.models import Facility
        from app.seed import seed_db
        with SessionLocal() as db:
            if not db.query(Facility).first():
                seed_db()
        _db_initialized = True
    except Exception as e:
        print(f"DB auto-initialization message: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db_data_if_needed()
    try:
        await start_tracking_loop(broadcast)
    except Exception as e:
        print(f"Tracking loop background notice: {e}")

    yield
    # Shutdown
    stop_tracking_loop()

app = FastAPI(
    title="NEXUS — Supply Chain Control Tower API",
    description="Backend API supporting NPN SCM Hackathon E2 Execution & P2 Planning Use Cases.",
    version="1.0.0",
    lifespan=lifespan
)

# Serverless cold-start assurance middleware
@app.middleware("http")
async def ensure_db_on_request(request, call_next):
    if not _db_initialized:
        init_db_data_if_needed()
    response = await call_next(request)
    return response

# CORS Middleware
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(overview.router)
app.include_router(e2_trucks.router)
app.include_router(e2_docks.router)
app.include_router(e2_yard.router)
app.include_router(e2_alerts.router)
app.include_router(p2_demand.router)
app.include_router(p2_inventory.router)
app.include_router(p2_sop.router)
app.include_router(p2_procurement.router)
app.include_router(p2_markdown.router)
app.include_router(p2_financial.router)
app.include_router(scenarios.router)
app.include_router(reports.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "system": "NEXUS Control Tower API", "version": "1.0.0"}

# WebSocket endpoint for real-time truck tracking and yard updates
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Mount frontend static directory if exists locally
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
