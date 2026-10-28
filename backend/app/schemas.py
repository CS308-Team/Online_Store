from decimal import Decimal
from pydantic import BaseModel, ConfigDict, computed_field


class ProductOut(BaseModel):
    """What the API sends to the frontend. 'cost' is intentionally not included."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    model: str
    serial_number: str
    description: str
    quantity_in_stock: int
    price: Decimal
    warranty_status: str
    distributor: str
    category_id: int

    @computed_field
    @property
    def in_stock(self) -> bool:
        """The frontend uses this to enable/disable the 'Add to cart' button."""
        return self.quantity_in_stock > 0
