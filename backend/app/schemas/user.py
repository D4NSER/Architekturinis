from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.plan import NutritionPlanSummary


GoalLiteral = Literal["weight_loss", "muscle_gain", "balanced", "vegetarian", "performance"]
ActivityLevelLiteral = Literal[
    "sedentary",
    "light",
    "moderate",
    "active",
    "athlete",
]


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    goal: GoalLiteral = Field(description="Primary FitBite mitybos tikslas.")
    height_cm: Optional[float] = Field(default=None, ge=100, le=250, description="Naudotojo ūgis centimetrais.")
    weight_kg: Optional[float] = Field(default=None, ge=35, le=250, description="Naudotojo svoris kilogramais.")
    activity_level: Optional[ActivityLevelLiteral] = Field(
        default=None, description="Apytikslis fizinio aktyvumo lygis."
    )
    dietary_preferences: Optional[str] = Field(default=None, description="Pageidaujami mitybos tipai ar apribojimai.")
    allergies: Optional[str] = Field(default=None, description="Alergijos ar produktai, kurių reikėtų vengti.")


class UserCreate(UserBase):
    password: str = Field(min_length=8, description="User account password.")

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        has_upper = any(char.isupper() for char in value)
        has_lower = any(char.islower() for char in value)
        has_digit = any(char.isdigit() for char in value)
        has_special = any(not char.isalnum() for char in value)
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                "Slaptažodis turi būti ne trumpesnis nei 8 simboliai ir turėti didžiąją, mažąją raidę, skaičių bei specialų simbolį."
            )
        return value


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    goal: Optional[GoalLiteral] = None
    height_cm: Optional[float] = Field(default=None, ge=100, le=250)
    weight_kg: Optional[float] = Field(default=None, ge=35, le=250)
    activity_level: Optional[ActivityLevelLiteral] = None
    dietary_preferences: Optional[str] = None
    allergies: Optional[str] = None


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
