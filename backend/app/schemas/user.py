from datetime import datetime, date
from typing import Literal, Optional, Union

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.allergens import deserialize_allergens, normalize_allergen_list

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
    allergies: list[str] = Field(default_factory=list, description="Pasirinktos maisto alergijos.")
    birth_date: Optional[date] = Field(default=None, description="Naudotojo gimimo data.")

    @field_validator("allergies", mode="before")
    @classmethod
    def _parse_allergies(cls, value: object) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return deserialize_allergens(value)
        if isinstance(value, list):
            return normalize_allergen_list(value)
        return []


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
    allergies: Optional[list[str]] = None
    birth_date: Optional[date] = None

    @field_validator("allergies", mode="before")
    @classmethod
    def _parse_update_allergies(cls, value: object) -> list[str] | None:
        if value is None:
            return None
        if isinstance(value, str):
            return deserialize_allergens(value)
        if isinstance(value, list):
            return normalize_allergen_list(value)
        return None


class UserRead(UserBase):
    id: str
    avatar_url: Optional[str] = None
    current_plan_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlanProgress(BaseModel):
    plan_id: int
    plan_name: str
    started_at: datetime
    expected_finish_at: datetime
    total_days: int
    completed_days: int
    remaining_days: int
    percent: float = Field(default=0.0, ge=0.0, le=1.0)
    is_expired: bool

    class Config:
        from_attributes = True


class PlanProgressSurveyRead(BaseModel):
    id: int
    plan_id: int
    plan_name_snapshot: str
    survey_type: Literal["progress", "final"]
    day_offset: int
    scheduled_at: datetime
    status: Literal["scheduled", "completed", "cancelled"]
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    response_submitted: bool = False

    class Config:
        from_attributes = True


class SurveyAnswerSummary(BaseModel):
    question_id: str
    prompt: str
    answer: Union[int, float, str, list[str]]


class PlanProgressSurveyHistory(BaseModel):
    id: int
    response_id: Optional[int] = None
    plan_id: int
    plan_name_snapshot: str
    survey_type: Literal["progress", "final"]
    day_offset: int
    scheduled_at: datetime
    completed_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    answers: list[SurveyAnswerSummary] = Field(default_factory=list)

    class Config:
        from_attributes = True


class UserProfile(UserRead):
    current_plan: Optional[NutritionPlanSummary] = None
    purchase_count: int
    eligible_first_purchase_discount: bool
    plan_progress: Optional[PlanProgress] = None
    plan_surveys: list[PlanProgressSurveyRead] = Field(default_factory=list)
    plan_completed_surveys: list[PlanProgressSurveyHistory] = Field(default_factory=list)
