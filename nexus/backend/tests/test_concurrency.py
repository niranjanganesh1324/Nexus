import pytest
from app.database import SessionLocal
from app.services.dock_engine import assign_dock

def test_concurrent_dock_assignment_conflict():
    db1 = SessionLocal()
    db2 = SessionLocal()
    try:
        # Operator 1 assigns TRK-103 to D06
        success1, msg1 = assign_dock("D06", "TRK-103", 0, 2, db1)
        assert success1 is True

        # Operator 2 attempts to assign TRK-107 to same D06 at overlapping window (0-2)
        success2, msg2 = assign_dock("D06", "TRK-107", 0, 2, db2)
        assert success2 is False
        assert "already assigned" in msg2.lower()
    finally:
        db1.close()
        db2.close()
