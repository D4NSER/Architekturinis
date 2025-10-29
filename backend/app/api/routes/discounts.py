from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.discount import DiscountCode

router = APIRouter(prefix="/discounts", tags=["discounts"])


@router.get("/codes", response_model=List[DiscountCode])
def list_discount_codes(current_user: User = Depends(get_current_user)) -> List[DiscountCode]:
    """Return all manually configured discount codes (excluding birthday)."""
    return [
        DiscountCode(code=entry.code, percent=float(entry.percent))
        for entry in settings.generic_discount_codes
    ]
