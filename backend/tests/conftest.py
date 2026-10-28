import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.models import Category, Product


@pytest.fixture
def db():
    """A fresh in-memory database with 3 sample products for every test."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    turntables = Category(name="Turntables")
    headphones = Category(name="Headphones")
    session.add_all([
        Product(name="Classic Turntable", model="CT-1", serial_number="SN1",
                description="Belt-drive vinyl player", quantity_in_stock=5,
                price=Decimal("300.00"), warranty_status="2 years",
                distributor="Dist A", sold_count=10, category=turntables),
        Product(name="Studio Headphones", model="SH-2", serial_number="SN2",
                description="Closed-back headphones", quantity_in_stock=0,
                price=Decimal("150.00"), warranty_status="1 year",
                distributor="Dist B", sold_count=50, category=headphones),
        Product(name="Wireless Headphones", model="WH-3", serial_number="SN3",
                description="Bluetooth, noise cancelling", quantity_in_stock=8,
                price=Decimal("200.00"), warranty_status="1 year",
                distributor="Dist B", sold_count=30, category=headphones),
    ])
    session.commit()
    yield session
    session.close()


@pytest.fixture
def client(db):
    """API client that uses the test database instead of MySQL."""
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
