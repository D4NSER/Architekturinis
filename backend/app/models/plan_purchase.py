from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlanPurchase(Base):
    """Represents a completed (or pending) plan purchase for a user."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("nutritionplan.id"), nullable=False, index=True)
    plan_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    period_days: Mapped[int] = mapped_column(Integer, nullable=False)
    base_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    discount_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    discount_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    payment_method: Mapped[str] = mapped_column(String(30), default="card")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    transaction_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)

    buyer_full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    buyer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)

    invoice_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    vat_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    extra_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    pdf_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="purchases")
    plan: Mapped["NutritionPlan"] = relationship("NutritionPlan", back_populates="purchases")
    items: Mapped[list["PlanPurchaseItem"]] = relationship(
        "PlanPurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
        order_by="PlanPurchaseItem.id",
    )
    surveys: Mapped[list["PlanProgressSurvey"]] = relationship(
        "PlanProgressSurvey",
        back_populates="purchase",
        cascade="all, delete-orphan",
    )

    @property
    def total_price(self) -> float:
        return float(Decimal(self.price_cents) / Decimal(100))

    @property
    def base_price(self) -> float:
        return float(Decimal(self.base_price_cents) / Decimal(100))

    @property
    def discount_amount(self) -> float:
        return float(Decimal(self.discount_amount_cents) / Decimal(100))

    @property
    def discount_percent(self) -> float | None:
        if self.base_price_cents and self.discount_amount_cents:
            return float(Decimal(self.discount_amount_cents) / Decimal(self.base_price_cents))
        return None

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<PlanPurchase id={self.id} status={self.status} plan={self.plan_name_snapshot!r}>"


class PlanPurchaseItem(Base):
    """Snapshot of plan meals at the time of purchase."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("planpurchase.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(50), nullable=False)
    meal_title: Mapped[str] = mapped_column(String(200), nullable=False)
    meal_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carbs_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fats_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)

    purchase: Mapped[PlanPurchase] = relationship("PlanPurchase", back_populates="items")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<PlanPurchaseItem purchase_id={self.purchase_id} meal_title={self.meal_title!r}>"


from app.models.nutrition_plan import NutritionPlan  # noqa: E402
from app.models.user import User  # noqa: E402
