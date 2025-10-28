from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlanProgressSurvey(Base):
    """Scheduled survey to capture nutrition plan progress feedback."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    plan_purchase_id: Mapped[int] = mapped_column(ForeignKey("planpurchase.id"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    plan_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    survey_type: Mapped[str] = mapped_column(String(20), nullable=False, default="progress")
    day_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="surveys")
    purchase: Mapped["PlanPurchase"] = relationship("PlanPurchase", back_populates="surveys")
    responses: Mapped[list["PlanProgressSurveyResponse"]] = relationship(
        "PlanProgressSurveyResponse",
        back_populates="survey",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<PlanProgressSurvey id={self.id} type={self.survey_type} status={self.status}>"


from app.models.plan_progress_survey_response import PlanProgressSurveyResponse  # noqa: E402
from app.models.plan_purchase import PlanPurchase  # noqa: E402
from app.models.user import User  # noqa: E402
