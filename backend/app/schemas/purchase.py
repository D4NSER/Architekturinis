from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class PlanCheckoutRequest(BaseModel):
    period_days: int = Field(gt=0)
    payment_method: str = Field(pattern="^(card|bank_transfer|cash)$")
    buyer_full_name: str = Field(min_length=3, max_length=120)
    buyer_email: EmailStr
    buyer_phone: Optional[str] = Field(default=None, max_length=40)
    discount_code: Optional[str] = Field(default=None, max_length=50)

    card_number: Optional[str] = Field(default=None, max_length=32)
    card_exp_month: Optional[str] = Field(default=None, max_length=2)
    card_exp_year: Optional[str] = Field(default=None, max_length=4)
    card_cvc: Optional[str] = Field(default=None, max_length=4)

    invoice_needed: bool = False
    company_name: Optional[str] = Field(default=None, max_length=200)
    company_code: Optional[str] = Field(default=None, max_length=40)
    vat_code: Optional[str] = Field(default=None, max_length=40)
    extra_notes: Optional[str] = Field(default=None, max_length=1000)


class PlanCheckoutResponse(BaseModel):
    purchase_id: int
    plan_id: int
    status: str
    base_price: float
    total_price: float
    currency: str
    discount_amount: float
    discount_label: Optional[str] = None
    discount_code: Optional[str] = None
    discount_percent: Optional[float] = None
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseMealSnapshot(BaseModel):
    id: int
    day_of_week: str
    meal_type: str
    meal_title: str
    meal_description: Optional[str] = None
    calories: Optional[int] = None
    protein_grams: Optional[int] = None
    carbs_grams: Optional[int] = None
    fats_grams: Optional[int] = None

    class Config:
        from_attributes = True


class PurchaseSummary(BaseModel):
    id: int
    plan_id: int
    plan_name_snapshot: str
    period_days: int
    base_price: float
    total_price: float
    discount_amount: float
    discount_label: Optional[str] = None
    discount_code: Optional[str] = None
    discount_percent: Optional[float] = None
    currency: str
    status: str
    payment_method: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    transaction_reference: Optional[str] = None
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseDetail(PurchaseSummary):
    buyer_full_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    invoice_needed: bool
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    vat_code: Optional[str] = None
    extra_notes: Optional[str] = None
    items: List[PurchaseMealSnapshot] = Field(default_factory=list)
