from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PlanMealBase(BaseModel):
    day_of_week: str = Field(regex="^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", description="ISO weekday lower-case name")
    meal_type: str = Field(description="Meal category such as breakfast, lunch, dinner, snack")
    title: str
    description: Optional[str] = None
    calories: Optional[int] = Field(default=None, ge=0)
    protein_grams: Optional[int] = Field(default=None, ge=0)
    carbs_grams: Optional[int] = Field(default=None, ge=0)
    fats_grams: Optional[int] = Field(default=None, ge=0)


class PlanMealCreate(PlanMealBase):
    pass


class PlanMealRead(PlanMealBase):
    id: int

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


class NutritionPlanCreate(NutritionPlanBase):
    meals: List[PlanMealCreate] = Field(default_factory=list)


class CustomPlanCreate(BaseModel):
    name: str
    description: str
    meals: List[PlanMealCreate]


class NutritionPlanSummary(NutritionPlanBase):
    id: int
    is_custom: bool

    class Config:
        from_attributes = True


class NutritionPlanDetail(NutritionPlanSummary):
    created_at: datetime
    updated_at: datetime
    meals: List[PlanMealRead]


class PlanSelectionRequest(BaseModel):
    plan_id: int
