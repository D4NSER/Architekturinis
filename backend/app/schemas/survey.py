from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field


class SurveyQuestion(BaseModel):
    id: str
    prompt: str
    type: Literal["scale", "single_choice", "multi_choice", "text"]
    help_text: Optional[str] = None
    options: list[str] = Field(default_factory=list)
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None
    scale_min_label: Optional[str] = None
    scale_max_label: Optional[str] = None


class SurveyDetail(BaseModel):
    id: int
    survey_type: Literal["progress", "final"]
    status: Literal["scheduled", "completed", "cancelled"]
    plan_name: str
    day_offset: int
    scheduled_at: datetime
    questions: list[SurveyQuestion]
    can_submit: bool
    response_id: Optional[int] = None
    submitted_at: Optional[datetime] = None
    submitted_answers: Optional[dict[str, Union[int, float, str, list[str]]]] = None


class SurveyAnswer(BaseModel):
    question_id: str
    value: Union[int, float, str, list[str]]


class SurveySubmitRequest(BaseModel):
    answers: list[SurveyAnswer]


class SurveySubmitResponse(BaseModel):
    id: int
    submitted_at: datetime
