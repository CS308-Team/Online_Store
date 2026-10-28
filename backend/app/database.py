import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# MySQL address: user:password@host:port/database
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://store:store@localhost:3306/store")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """All database tables inherit from this class."""
    pass


def get_db():
    """Opens a database session for each API request and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
