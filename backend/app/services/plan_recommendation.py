from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from app.models.nutrition_plan import NutritionPlan
from app.models.plan_meal import PlanMeal
from app.models.user import User
from app.schemas.plan import CustomPlanCreate, PlanMealCreate


def get_recommended_plan(db: Session, user: User) -> NutritionPlan | None:
    query = db.query(NutritionPlan).filter(NutritionPlan.owner_id.is_(None))
    if user.goals:
        plan = query.filter(NutritionPlan.goal_type == user.goals).first()
        if plan:
            return plan
    return query.order_by(NutritionPlan.id.asc()).first()


def create_custom_plan(db: Session, user: User, payload: CustomPlanCreate) -> NutritionPlan:
    plan = NutritionPlan(
        name=payload.name,
        description=payload.description,
        goal_type=user.goals or "balanced",
        is_custom=True,
        owner_id=user.id,
    )

    db.add(plan)
    db.flush()

    meals: Iterable[PlanMeal] = (
        PlanMeal(
            plan_id=plan.id,
            day_of_week=meal.day_of_week.lower(),
            meal_type=meal.meal_type,
            title=meal.title,
            description=meal.description,
            calories=meal.calories,
            protein_grams=meal.protein_grams,
            carbs_grams=meal.carbs_grams,
            fats_grams=meal.fats_grams,
        )
        for meal in payload.meals
    )

    for meal in meals:
        db.add(meal)

    db.commit()
    db.refresh(plan)
    return plan


def attach_macro_totals(plan: NutritionPlan) -> None:
    if plan.meals:
        plan.calories = sum(meal.calories or 0 for meal in plan.meals)
        plan.protein_grams = sum(meal.protein_grams or 0 for meal in plan.meals)
        plan.carbs_grams = sum(meal.carbs_grams or 0 for meal in plan.meals)
        plan.fats_grams = sum(meal.fats_grams or 0 for meal in plan.meals)
