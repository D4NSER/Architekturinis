from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.plan import NutritionPlanSummary


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    goals: Optional[str] = Field(default=None, description="High-level nutrition goals selected by the user.")


class UserCreate(UserBase):
    password: str = Field(min_length=8, description="User account password.")


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    goals: Optional[str] = None


class UserRead(UserBase):
    id: str
    avatar_url: Optional[str] = None
    current_plan_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfile(UserRead):
    current_plan: Optional[NutritionPlanSummary] = None
