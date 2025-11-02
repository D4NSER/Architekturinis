from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session, selectinload

from app.core.allergens import deserialize_allergens, normalize_allergen_list, serialize_allergens
from app.models.nutrition_plan import NutritionPlan
from app.models.plan_meal import PlanMeal
from app.models.user import User
from app.schemas.plan import CustomPlanCreate


def _calculate_bmi(user: User) -> float | None:
    if user.height_cm and user.weight_kg and user.height_cm > 0:
        height_m = user.height_cm / 100
        return user.weight_kg / (height_m * height_m)
    return None


def get_recommended_plan(
    db: Session, user: User
) -> tuple[NutritionPlan | None, str | None]:
    # Only recommend non-custom, public plans
    query = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.meals),
            selectinload(NutritionPlan.pricing_entries),
        )
        .filter(
            NutritionPlan.owner_id.is_(None),
            NutritionPlan.is_custom == False,  # noqa: E712
        )
    )

    preference = (user.dietary_preferences or "").lower()
    activity = (user.activity_level or "").lower()
    bmi = _calculate_bmi(user)

    # Dietary preferences take precedence
    if "vegetar" in preference:
        plan = query.filter(NutritionPlan.goal_type == "vegetarian").first()
        if plan:
            return (
                plan,
                "Parinktas vegetariškas planas pagal jūsų pasirinktą mitybos tipą.",
            )

    # Activity-based suggestions
    if activity in {"active", "athlete"}:
        plan = query.filter(NutritionPlan.goal_type == "performance").first()
        if plan:
            return (
                plan,
                "Rekomenduojamas planas aktyviam gyvenimo būdui ir didesniam energijos poreikiui.",
            )

    # BMI-driven logic
    if bmi is not None:
        if bmi >= 27 or activity == "sedentary":
            plan = query.filter(NutritionPlan.goal_type == "weight_loss").first()
            if plan:
                return (
                    plan,
                    "Parinktas svorio mažinimo planas, kad padėtų pasiekti norimą kūno svorį.",
                )
        elif bmi < 20:
            plan = query.filter(NutritionPlan.goal_type == "muscle_gain").first()
            if plan:
                return (
                    plan,
                    "Parinktas planas masės auginimui ir subalansuotiems makro elementams.",
                )

    # Primary goal fallback
    if user.goal:
        plan = query.filter(NutritionPlan.goal_type == user.goal).first()
        if plan:
            goal_reason_map = {
                "weight_loss": "Parinktas atsižvelgiant į svorio mažinimo tikslą.",
                "muscle_gain": "Parinktas dėl jūsų raumenų auginimo tikslo.",
                "balanced": "Parinktas subalansuotas planas kasdieninei mitybai.",
                "vegetarian": "Parinktas vegetariškas planas pagal jūsų pasirinktą tikslą.",
                "performance": "Parinktas planas didesniam energijos poreikiui ir sportui.",
            }
            return plan, goal_reason_map.get(
                user.goal, "Parinktas pagal jūsų pasirinktą tikslą."
            )

    fallback = query.order_by(NutritionPlan.id.asc()).first()
    if fallback:
        return (
            fallback,
            "Pateiktas populiariausias FitBite planas, kad galėtumėte pradėti.",
        )
    return None, None


def create_custom_plan(
    db: Session, user: User, payload: CustomPlanCreate
) -> NutritionPlan:
    plan = NutritionPlan(
        name=payload.name,
        description=payload.description,
        goal_type=user.goal or "balanced",
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
            allergens=serialize_allergens(meal.allergens),
        )
        for meal in payload.meals
    )

    for meal in meals:
        db.add(meal)

    combined_allergens = normalize_allergen_list(
        allergen for meal in payload.meals for allergen in (meal.allergens or [])
    )
    plan.allergens = serialize_allergens(combined_allergens)

    db.commit()
    db.refresh(plan)
    return plan


def attach_macro_totals(plan: NutritionPlan) -> None:
    if plan.meals:
        plan.calories = sum(meal.calories or 0 for meal in plan.meals)
        plan.protein_grams = sum(meal.protein_grams or 0 for meal in plan.meals)
        plan.carbs_grams = sum(meal.carbs_grams or 0 for meal in plan.meals)
        plan.fats_grams = sum(meal.fats_grams or 0 for meal in plan.meals)
        meal_allergens = {
            allergen
            for meal in plan.meals
            for allergen in deserialize_allergens(meal.allergens)
        }
        if meal_allergens:
            plan.allergens = serialize_allergens(meal_allergens)
