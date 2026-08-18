"""
SQLAlchemy database engine and session factory.
Supports PostgreSQL (production) and SQLite (local & serverless /tmp).
"""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

raw_url = os.getenv("DATABASE_URL")
is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("VERCEL_ENV"))

if not raw_url:
    if is_serverless:
        DATABASE_URL = "sqlite:////tmp/nexus_dev.db"
    else:
        DATABASE_URL = "sqlite:///./nexus_dev.db"
else:
    if is_serverless and raw_url.startswith("sqlite:///."):
        DATABASE_URL = "sqlite:////tmp/nexus_dev.db"
    else:
        DATABASE_URL = raw_url

# SQLite: enable WAL mode and foreign keys
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
