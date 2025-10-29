from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlanPeriodPricing(Base):
    """Stores pricing information for a nutrition plan over a specific period."""

    __table_args__ = (
        UniqueConstraint("plan_id", "period_days", name="uq_plan_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("nutritionplan.id", ondelete="CASCADE"), nullable=False)
    period_days: Mapped[int] = mapped_column(Integer, nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    plan: Mapped["NutritionPlan"] = relationship("NutritionPlan", back_populates="pricing_entries")

    @property
    def base_price(self) -> float:
        """Base price formatted in units (e.g. EUR)."""
        return float(Decimal(self.price_cents) / Decimal(100))

    @property
    def price(self) -> float:
        """Alias for base price, kept for backward compatibility."""
        return self.base_price

    @property
    def final_price(self) -> float:
        """Final price after discounts – currently identical to base price."""
        return self.base_price

    @property
    def discounts_applied(self) -> list[dict[str, float | str]]:
        """Placeholder for applied discounts; returns empty list until discounts are implemented."""
        return []

    def __repr__(self) -> str:
        return f"<PlanPeriodPricing plan_id={self.plan_id} period={self.period_days} price_cents={self.price_cents}>"


from app.models.nutrition_plan import NutritionPlan  # noqa: E402  # late import to avoid circular deps
