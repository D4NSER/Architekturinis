from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class User(Base):
    """Represents an application user."""

    id: Mapped[str] = mapped_column(
        String(length=36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    goal: Mapped[str] = mapped_column(String(50), default="balanced")
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    activity_level: Mapped[str | None] = mapped_column(String(50))
    dietary_preferences: Mapped[str | None] = mapped_column(String(255))
    allergies: Mapped[str | None] = mapped_column(String(255))

    current_plan_id: Mapped[int | None] = mapped_column(ForeignKey("nutritionplan.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    current_plan: Mapped[NutritionPlan | None] = relationship(
        "NutritionPlan", foreign_keys=[current_plan_id], back_populates="subscribers"
    )
    custom_plans: Mapped[list[NutritionPlan]] = relationship(
        "NutritionPlan",
        back_populates="owner",
        cascade="all, delete-orphan",
        foreign_keys="NutritionPlan.owner_id",
    )


from app.models.nutrition_plan import NutritionPlan  # noqa: E402  # late import to avoid circular refs
