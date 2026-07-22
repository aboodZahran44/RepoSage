import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://reposage:reposage_pass@postgres:5432/reposage_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    """Creates all tables if they don't already exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for FastAPI routes: provides a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()