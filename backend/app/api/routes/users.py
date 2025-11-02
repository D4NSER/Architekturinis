from __future__ import annotations

import shutil
from datetime import datetime, timedelta
import math
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.core.allergens import serialize_allergens
from app.models.user import User
from app.models.plan_purchase import PlanPurchase
from app.models.plan_progress_survey import PlanProgressSurvey
from app.schemas.user import (
    PlanProgress,
    PlanProgressSurveyHistory,
    PlanProgressSurveyRead,
    SurveyAnswerSummary,
    UserProfile,
    UserRead,
    UserUpdate,
)
from app.services.surveys import (
    CANCELLED_STATUS,
    SCHEDULED_STATUS,
    get_questions_for_type,
    schedule_surveys_for_purchase,
)

router = APIRouter(prefix="/users", tags=["users"])

MEDIA_ROOT = Path(__file__).resolve().parents[3] / "media" / "profile_pictures"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)


@router.get("/me", response_model=UserProfile)
def read_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    purchase_count = (
        db.query(PlanPurchase)
        .filter(PlanPurchase.user_id == current_user.id)
        .count()
    )
    eligible_first_purchase = purchase_count == 0
    setattr(current_user, "purchase_count", purchase_count)
    setattr(current_user, "eligible_first_purchase_discount", eligible_first_purchase)
    progress, latest_purchase = _resolve_plan_progress(db, current_user)
    setattr(current_user, "plan_progress", progress)
    upcoming_surveys, completed_surveys = _resolve_plan_surveys(db, latest_purchase)
    setattr(current_user, "plan_surveys", upcoming_surveys)
    setattr(current_user, "plan_completed_surveys", completed_surveys)
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    if "allergies" in update_data:
        update_data["allergies"] = serialize_allergens(update_data["allergies"])

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


def _resolve_plan_progress(db: Session, user: User) -> tuple[PlanProgress | None, PlanPurchase | None]:
    paid_query = (
        db.query(PlanPurchase)
        .filter(PlanPurchase.user_id == user.id, PlanPurchase.status == "paid")
    )

    latest_purchase: PlanPurchase | None = None
    if user.current_plan_id:
        latest_purchase = (
            paid_query
            .filter(PlanPurchase.plan_id == user.current_plan_id)
            .order_by(
                PlanPurchase.paid_at.desc().nullslast(),
                PlanPurchase.created_at.desc(),
            )
            .first()
        )

    if not latest_purchase:
        latest_purchase = (
            paid_query
            .order_by(
                PlanPurchase.paid_at.desc().nullslast(),
                PlanPurchase.created_at.desc(),
            )
            .first()
        )

    if not latest_purchase:
        cancelled_purchase = (
            db.query(PlanPurchase)
            .filter(PlanPurchase.user_id == user.id, PlanPurchase.status == "canceled")
            .order_by(PlanPurchase.created_at.desc())
            .first()
        )
        if cancelled_purchase:
            return None, cancelled_purchase
        return None, None

    if latest_purchase.period_days <= 0:
        return None, latest_purchase

    plan_id = user.current_plan_id or latest_purchase.plan_id

    start_at = latest_purchase.paid_at or latest_purchase.created_at
    if not start_at:
        return None, latest_purchase

    start_at = start_at.replace(microsecond=0)
    total_days = latest_purchase.period_days
    duration = timedelta(days=total_days)
    expected_finish = start_at + duration
    now = datetime.utcnow()

    total_seconds = duration.total_seconds()
    elapsed_seconds = (now - start_at).total_seconds()
    if total_seconds > 0:
        percent = elapsed_seconds / total_seconds
    else:
        percent = 0.0
    percent = max(min(percent, 1.0), 0.0)

    if now < start_at:
        remaining_days = total_days
    elif now >= expected_finish:
        remaining_days = 0
    else:
        remaining_days = max(math.ceil((expected_finish - now).total_seconds() / 86400), 0)

    completed_days = max(min(total_days - remaining_days, total_days), 0)

    progress = PlanProgress(
        plan_id=plan_id,
        plan_name=latest_purchase.plan_name_snapshot,
        started_at=start_at,
        expected_finish_at=expected_finish,
        total_days=total_days,
        completed_days=completed_days,
        remaining_days=remaining_days,
        percent=round(percent, 4),
        is_expired=remaining_days <= 0 and percent >= 1.0,
    )
    return progress, latest_purchase


def _resolve_plan_surveys(
    db: Session,
    purchase: PlanPurchase | None,
) -> tuple[list[PlanProgressSurveyRead], list[PlanProgressSurveyHistory]]:
    if not purchase:
        return [], []

    surveys = (
        db.query(PlanProgressSurvey)
        .options(selectinload(PlanProgressSurvey.responses))
        .filter(PlanProgressSurvey.plan_purchase_id == purchase.id)
        .order_by(PlanProgressSurvey.day_offset.asc())
        .all()
    )
    if not surveys and purchase.period_days > 0:
        schedule_surveys_for_purchase(db, purchase)
        db.commit()
        surveys = (
            db.query(PlanProgressSurvey)
            .options(selectinload(PlanProgressSurvey.responses))
            .filter(PlanProgressSurvey.plan_purchase_id == purchase.id)
            .order_by(PlanProgressSurvey.day_offset.asc())
            .all()
        )
    else:
        updated = False
        now = datetime.utcnow()
        for survey in surveys:
            if survey.status == "completed":
                continue
            scheduled_at = survey.scheduled_at
            if scheduled_at.tzinfo:
                scheduled_at = scheduled_at.replace(tzinfo=None)
            if scheduled_at <= now and survey.status != SCHEDULED_STATUS:
                survey.status = SCHEDULED_STATUS
                survey.cancelled_at = None
                db.add(survey)
                updated = True
            elif scheduled_at > now and survey.status == SCHEDULED_STATUS:
                survey.status = CANCELLED_STATUS
                survey.cancelled_at = None
                db.add(survey)
                updated = True
        if updated:
            db.commit()
            db.refresh(purchase)
            surveys = (
                db.query(PlanProgressSurvey)
                .options(selectinload(PlanProgressSurvey.responses))
                .filter(PlanProgressSurvey.plan_purchase_id == purchase.id)
                .order_by(PlanProgressSurvey.day_offset.asc())
                .all()
            )

    upcoming_results: list[PlanProgressSurveyRead] = []
    completed_results: list[PlanProgressSurveyHistory] = []
    question_cache: dict[str, dict[str, object]] = {}

    for survey in surveys:
        responses = sorted(survey.responses, key=lambda resp: resp.submitted_at) if survey.responses else []
        has_response = bool(responses)
        response = responses[0] if responses else None

        payload = PlanProgressSurveyRead.model_validate(survey)
        payload.response_submitted = has_response or survey.status == "completed"

        if payload.response_submitted and response:
            cache_key = survey.survey_type
            if cache_key not in question_cache:
                question_cache[cache_key] = {
                    q["id"]: q for q in get_questions_for_type(survey.survey_type)
                }
            question_map = question_cache[cache_key]
            answers: list[SurveyAnswerSummary] = []
            for qid, value in response.answers.items():
                question = question_map.get(qid, {})
                prompt = question.get("prompt", qid)
                if isinstance(value, list):
                    answer_value = [str(item) for item in value]
                else:
                    answer_value = value
                answers.append(
                    SurveyAnswerSummary(
                        question_id=qid,
                        prompt=str(prompt),
                        answer=answer_value,
                    )
                )
            completed_results.append(
                PlanProgressSurveyHistory(
                    id=survey.id,
                    response_id=response.id,
                    plan_id=survey.plan_id,
                    plan_name_snapshot=survey.plan_name_snapshot,
                    survey_type=survey.survey_type,
                    day_offset=survey.day_offset,
                    scheduled_at=survey.scheduled_at,
                    completed_at=survey.completed_at,
                    submitted_at=response.submitted_at,
                    answers=answers,
                )
            )
        elif survey.status == "completed" and not response:
            completed_results.append(
                PlanProgressSurveyHistory(
                    id=survey.id,
                    plan_id=survey.plan_id,
                    plan_name_snapshot=survey.plan_name_snapshot,
                    survey_type=survey.survey_type,
                    day_offset=survey.day_offset,
                    scheduled_at=survey.scheduled_at,
                    completed_at=survey.completed_at,
                    submitted_at=None,
                    answers=[],
                )
            )

        if survey.status != "completed" or not payload.response_submitted:
            upcoming_results.append(payload)

    return upcoming_results, completed_results


@router.post("/me/avatar", response_model=UserRead)
def upload_avatar(
    request: Request,
    file: Annotated[UploadFile, File(..., description="Profile image (PNG or JPEG)")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if file.content_type not in {"image/png", "image/jpeg"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PNG and JPEG images are allowed")

    extension = ".png" if file.content_type == "image/png" else ".jpg"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{current_user.id}_{timestamp}{extension}"
    destination = MEDIA_ROOT / filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_path = f"/media/profile_pictures/{filename}"
    base_url = str(request.base_url).rstrip("/")
    current_user.avatar_url = f"{base_url}{relative_path}"

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user
