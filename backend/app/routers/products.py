from typing import Literal, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas import ProductOut

router = APIRouter(prefix="/products", tags=["products"])

SORT_OPTIONS = {
    "price_asc": Product.price.asc(),          # cheapest first
    "price_desc": Product.price.desc(),        # most expensive first
    "popularity": Product.sold_count.desc(),   # best-selling first
}


@router.get("", response_model=list[ProductOut])
def list_products(
    search: Optional[str] = None,
    sort: Optional[Literal["price_asc", "price_desc", "popularity"]] = None,
    db: Session = Depends(get_db),
):
    query = select(Product)                              # 1) start with all products

    if search:                                           # 2) filter by search text
        pattern = f"%{search}%"
        query = query.where(
            or_(Product.name.ilike(pattern),             #    in name OR
                Product.description.ilike(pattern))      #    in description, case-insensitive
        )
    # No stock filter: out-of-stock products must stay searchable (requirement 7)

    if sort:                                             # 3) apply sorting
        query = query.order_by(SORT_OPTIONS[sort], Product.id)
    else:
        query = query.order_by(Product.id)

    return db.scalars(query).all()                       # 4) run the query
