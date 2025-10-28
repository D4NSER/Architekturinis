from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class NutritionPlan(Base):
    """Stores prebuilt and custom nutrition plans."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    goal_type: Mapped[str] = mapped_column(String(50), nullable=False)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carbs_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fats_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("user.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    owner: Mapped[User | None] = relationship("User", back_populates="custom_plans", foreign_keys=[owner_id])
    meals: Mapped[list["PlanMeal"]] = relationship("PlanMeal", back_populates="plan", cascade="all, delete-orphan")
    subscribers: Mapped[list[User]] = relationship(
        "User", back_populates="current_plan", foreign_keys="User.current_plan_id"
    )
    pricing_entries: Mapped[list["PlanPeriodPricing"]] = relationship(
        "PlanPeriodPricing",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanPeriodPricing.period_days",
    )
    purchases: Mapped[list["PlanPurchase"]] = relationship(
        "PlanPurchase",
        back_populates="plan",
        cascade="all, delete-orphan",
    )

    @property
    def pricing_options(self) -> list["PlanPeriodPricing"]:
        """Return only active pricing options sorted by period length."""
        entries = self.pricing_entries or []
        return [entry for entry in entries if entry.is_active]


from app.models.plan_meal import PlanMeal  # noqa: E402
from app.models.plan_period_pricing import PlanPeriodPricing  # noqa: E402
from app.models.plan_purchase import PlanPurchase  # noqa: E402
from app.models.user import User  # noqa: E402
