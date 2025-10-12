from sqlalchemy.orm import Session

from app.models.nutrition_plan import NutritionPlan
from app.models.plan_meal import PlanMeal


def seed_initial_plans(db: Session) -> None:
    if db.query(NutritionPlan).count() > 0:
        return

    weight_loss = NutritionPlan(
        name="Lean & Green",
        description="Balanced calorie deficit menu focused on whole foods",
        goal_type="weight_loss",
        calories=1800,
        protein_grams=140,
        carbs_grams=150,
        fats_grams=60,
    )
    muscle_gain = NutritionPlan(
        name="Strength Builder",
        description="Higher calorie meal plan to support muscle growth",
        goal_type="muscle_gain",
        calories=2600,
        protein_grams=180,
        carbs_grams=250,
        fats_grams=90,
    )

    db.add_all([weight_loss, muscle_gain])
    db.flush()

    common_meals = [
        PlanMeal(
            plan_id=weight_loss.id,
            day_of_week="monday",
            meal_type="breakfast",
            title="Overnight oats with berries",
            description="Rolled oats, chia seeds, almond milk, topped with berries",
            calories=350,
            protein_grams=20,
            carbs_grams=45,
            fats_grams=10,
        ),
        PlanMeal(
            plan_id=weight_loss.id,
            day_of_week="monday",
            meal_type="lunch",
            title="Grilled chicken salad",
            description="Chicken breast, quinoa, mixed greens, vinaigrette",
            calories=500,
            protein_grams=45,
            carbs_grams=40,
            fats_grams=18,
        ),
        PlanMeal(
            plan_id=muscle_gain.id,
            day_of_week="monday",
            meal_type="breakfast",
            title="Protein pancakes with banana",
            description="Oat pancakes with whey protein and banana",
            calories=550,
            protein_grams=35,
            carbs_grams=65,
            fats_grams=15,
        ),
        PlanMeal(
            plan_id=muscle_gain.id,
            day_of_week="monday",
            meal_type="dinner",
            title="Salmon with sweet potato",
            description="Baked salmon, roasted sweet potato, asparagus",
            calories=700,
            protein_grams=45,
            carbs_grams=60,
            fats_grams=28,
        ),
    ]

    db.add_all(common_meals)
    db.commit()
