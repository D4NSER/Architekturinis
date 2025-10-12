from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlanMeal(Base):
    """Represents a single meal entry in a nutrition plan."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("nutritionplan.id"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    calories: Mapped[int | None] = mapped_column(Integer)
    protein_grams: Mapped[int | None] = mapped_column(Integer)
    carbs_grams: Mapped[int | None] = mapped_column(Integer)
    fats_grams: Mapped[int | None] = mapped_column(Integer)

    plan: Mapped["NutritionPlan"] = relationship("NutritionPlan", back_populates="meals")


from app.models.nutrition_plan import NutritionPlan  # noqa: E402
