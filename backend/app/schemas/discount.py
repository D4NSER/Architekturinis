from pydantic import BaseModel, Field


class DiscountCode(BaseModel):
    code: str = Field(..., min_length=1, description="Nuolaidos kodo reikšmė.")
    percent: float = Field(..., ge=0, le=1, description="Nuolaidos dydis (0-1 intervalas).")
