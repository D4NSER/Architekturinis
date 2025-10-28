from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.plan_progress_survey import PlanProgressSurvey
from app.models.plan_progress_survey_response import PlanProgressSurveyResponse
from app.models.user import User
from app.schemas.survey import SurveyDetail, SurveyQuestion, SurveySubmitRequest, SurveySubmitResponse
from app.services.surveys import (
    CANCELLED_STATUS,
    SCHEDULED_STATUS,
    activate_final_survey,
    get_questions_for_type,
    record_survey_response,
)

router = APIRouter(prefix="/surveys", tags=["surveys"])


def _fetch_survey_or_404(db: Session, survey_id: int, user_id: str) -> PlanProgressSurvey:
    survey = (
        db.query(PlanProgressSurvey)
        .filter(PlanProgressSurvey.id == survey_id, PlanProgressSurvey.user_id == user_id)
        .first()
    )
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    return survey


@router.get("/{survey_id}", response_model=SurveyDetail)
def read_survey(
    survey_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurveyDetail:
    survey = _fetch_survey_or_404(db, survey_id, current_user.id)

    now = datetime.utcnow()
    scheduled_at = survey.scheduled_at
    if scheduled_at.tzinfo:
        scheduled_at = scheduled_at.replace(tzinfo=None)

    status_changed = False

    if survey.status != "completed" and scheduled_at <= now and survey.status != SCHEDULED_STATUS:
        if survey.survey_type == "final":
            activate_final_survey(db, survey.purchase, trigger_time=now)
        else:
            survey.status = SCHEDULED_STATUS
            survey.cancelled_at = None
            db.add(survey)
        status_changed = True

    if status_changed:
        db.commit()
        db.refresh(survey)

    questions_data = get_questions_for_type(survey.survey_type)
    questions = [SurveyQuestion.model_validate(q) for q in questions_data]
    can_submit = survey.status == SCHEDULED_STATUS

    return SurveyDetail(
        id=survey.id,
        survey_type=survey.survey_type,
        status=survey.status,
        plan_name=survey.plan_name_snapshot,
        day_offset=survey.day_offset,
        scheduled_at=survey.scheduled_at,
        questions=questions,
        can_submit=can_submit,
    )


def _validate_answers(survey: PlanProgressSurvey, payload: SurveySubmitRequest) -> dict:
    question_map = {q["id"]: q for q in get_questions_for_type(survey.survey_type)}
    answers_dict: dict[str, object] = {}
    provided = {answer.question_id for answer in payload.answers}

    missing = [qid for qid in question_map.keys() if qid not in provided]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trūksta atsakymų klausimams: {', '.join(missing)}",
        )

    for answer in payload.answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nežinomas klausimo ID")

        value = answer.value
        q_type = question["type"]

        if q_type == "scale":
            try:
                value = int(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="Skalės klausimams reikia skaitinės reikšmės")
            min_val = question.get("scale_min", 1)
            max_val = question.get("scale_max", 5)
            if value < min_val or value > max_val:
                raise HTTPException(status_code=400, detail="Skalės reikšmė už ribų")
        elif q_type == "single_choice":
            if not isinstance(value, str):
                raise HTTPException(status_code=400, detail="Pasirinkite vieną iš pasiūlytų variantų")
            if value not in question.get("options", []):
                raise HTTPException(status_code=400, detail="Pasirinktas variantas neleistinas")
        elif q_type == "multi_choice":
            if not isinstance(value, list) or len(value) == 0:
                raise HTTPException(status_code=400, detail="Pasirinkite bent vieną variantą")
            invalid = [item for item in value if item not in question.get("options", [])]
            if invalid:
                raise HTTPException(status_code=400, detail="Pasirinktas variantas neleistinas")
        elif q_type == "text":
            if value is None:
                value = ""
            if not isinstance(value, str):
                raise HTTPException(status_code=400, detail="Komentarai turi būti tekstiniai")
        else:
            raise HTTPException(status_code=400, detail="Nežinomas klausimo tipas")

        answers_dict[answer.question_id] = value

    return answers_dict


@router.post("/{survey_id}/responses", response_model=SurveySubmitResponse)
def submit_survey(
    survey_id: int,
    payload: SurveySubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurveySubmitResponse:
    survey = _fetch_survey_or_404(db, survey_id, current_user.id)

    if survey.status == "completed":
        raise HTTPException(status_code=400, detail="Apklausa jau užpildyta")
    if survey.status != SCHEDULED_STATUS:
        raise HTTPException(status_code=400, detail="Ši apklausa šiuo metu neaktyvi")

    existing_response = (
        db.query(PlanProgressSurveyResponse)
        .filter(PlanProgressSurveyResponse.survey_id == survey.id)
        .first()
    )
    if existing_response:
        raise HTTPException(status_code=400, detail="Apklausa jau užpildyta")

    answers = _validate_answers(survey, payload)

    response = record_survey_response(db, survey, current_user.id, answers)
    db.commit()
    db.refresh(response)

    return SurveySubmitResponse(id=response.id, submitted_at=response.submitted_at)
