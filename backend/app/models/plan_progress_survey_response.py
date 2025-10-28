from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlanProgressSurveyResponse(Base):
    """Stores submitted answers for plan progress surveys."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    survey_id: Mapped[int] = mapped_column(ForeignKey("planprogresssurvey.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    survey: Mapped["PlanProgressSurvey"] = relationship("PlanProgressSurvey", back_populates="responses")
    user: Mapped["User"] = relationship("User", back_populates="survey_responses")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<PlanProgressSurveyResponse id={self.id} survey={self.survey_id}>"


from app.models.plan_progress_survey import PlanProgressSurvey  # noqa: E402
from app.models.user import User  # noqa: E402
