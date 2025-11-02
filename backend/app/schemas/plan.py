from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.allergens import deserialize_allergens, normalize_allergen_list


class PlanMealBase(BaseModel):
    day_of_week: str = Field(
        pattern="^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$",
        description="ISO weekday lower-case name",
    )
    meal_type: str = Field(description="Meal category such as breakfast, lunch, dinner, snack")
    title: str
    description: Optional[str] = None
    calories: Optional[int] = Field(default=None, ge=0)
    protein_grams: Optional[int] = Field(default=None, ge=0)
    carbs_grams: Optional[int] = Field(default=None, ge=0)
    fats_grams: Optional[int] = Field(default=None, ge=0)
    allergens: List[str] = Field(default_factory=list, description="Galimi alergenai šiame patiekale.")

    @field_validator("allergens", mode="before")
    @classmethod
    def _parse_meal_allergens(cls, value: object) -> List[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return deserialize_allergens(value)
        if isinstance(value, list):
            return normalize_allergen_list(value)
        return []


class PlanMealCreate(PlanMealBase):
    pass


class PlanMealRead(PlanMealBase):
    id: int

    class Config:
        from_attributes = True


class PlanPricingOption(BaseModel):
    period_days: int = Field(gt=0)
    base_price: float = Field(ge=0)
    final_price: float = Field(ge=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    discounts_applied: List[dict[str, str | float]] = Field(default_factory=list)

    class Config:
        from_attributes = True


class NutritionPlanBase(BaseModel):
    name: str
    description: str
    goal_type: str = Field(description="Primary goal the plan supports, e.g. weight_loss")
    calories: Optional[int] = Field(default=None, ge=0)
    protein_grams: Optional[int] = Field(default=None, ge=0)
    carbs_grams: Optional[int] = Field(default=None, ge=0)
    fats_grams: Optional[int] = Field(default=None, ge=0)
    allergens: List[str] = Field(default_factory=list, description="Galimi alergenai visame plane.")

    @field_validator("allergens", mode="before")
    @classmethod
    def _parse_plan_allergens(cls, value: object) -> List[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return deserialize_allergens(value)
        if isinstance(value, list):
            return normalize_allergen_list(value)
        return []


class NutritionPlanCreate(NutritionPlanBase):
    meals: List[PlanMealCreate] = Field(default_factory=list)


class CustomPlanCreate(BaseModel):
    name: str
    description: str
    meals: List[PlanMealCreate]


class NutritionPlanSummary(NutritionPlanBase):
    id: int
    is_custom: bool
    pricing_options: List[PlanPricingOption] = Field(default_factory=list)

    class Config:
        from_attributes = True


class NutritionPlanDetail(NutritionPlanSummary):
    created_at: datetime
    updated_at: datetime
    meals: List[PlanMealRead]


class PlanSelectionRequest(BaseModel):
    plan_id: int


class RecommendedPlanDetail(NutritionPlanDetail):
    recommendation_reason: Optional[str] = Field(
        default=None, description="Trumpas paaiškinimas, kodėl naudotojui parinktas šis planas."
    )
