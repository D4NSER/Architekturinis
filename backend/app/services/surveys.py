from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.plan_progress_survey import PlanProgressSurvey
from app.models.plan_progress_survey_response import PlanProgressSurveyResponse
from app.models.plan_purchase import PlanPurchase

CANCELLED_STATUS = "cancelled"
SCHEDULED_STATUS = "scheduled"


def schedule_surveys_for_purchase(db: Session, purchase: PlanPurchase) -> None:
    """Create progress and final survey schedule for a purchase."""

    if purchase.period_days <= 0:
        return

    start_at = purchase.paid_at or purchase.created_at
    if not start_at:
        return

    offsets: list[int] = []
    day = 5
    while day < purchase.period_days:
        offsets.append(day)
        day += 5
    offsets.append(purchase.period_days)

    now = datetime.utcnow()
    for offset in offsets:
        scheduled_at = start_at + timedelta(days=offset)
        survey_type = "final" if offset == purchase.period_days else "progress"
        effective_scheduled_at = scheduled_at.replace(tzinfo=None) if scheduled_at.tzinfo else scheduled_at
        status = SCHEDULED_STATUS if effective_scheduled_at <= now else CANCELLED_STATUS
        survey = PlanProgressSurvey(
            user_id=purchase.user_id,
            plan_purchase_id=purchase.id,
            plan_id=purchase.plan_id,
            plan_name_snapshot=purchase.plan_name_snapshot,
            survey_type=survey_type,
            day_offset=offset,
            scheduled_at=scheduled_at,
            status=status,
            cancelled_at=None if status == SCHEDULED_STATUS else None,
        )
        db.add(survey)


def activate_final_survey(db: Session, purchase: PlanPurchase, trigger_time: datetime | None = None) -> None:
    """Ensure a final survey exists and is scheduled (used on cancellation)."""

    trigger = trigger_time or datetime.utcnow()
    start_at = purchase.paid_at or purchase.created_at
    if not start_at:
        return

    final = (
        db.query(PlanProgressSurvey)
        .filter(
            PlanProgressSurvey.plan_purchase_id == purchase.id,
            PlanProgressSurvey.survey_type == "final",
        )
        .first()
    )

    day_offset = max(int((trigger - start_at).days), purchase.period_days if purchase.period_days > 0 else 0)
    if final:
        final.status = SCHEDULED_STATUS
        final.scheduled_at = trigger
        final.day_offset = day_offset
        final.cancelled_at = None
        final.completed_at = None
        db.add(final)
    else:
        survey = PlanProgressSurvey(
            user_id=purchase.user_id,
            plan_purchase_id=purchase.id,
            plan_id=purchase.plan_id,
            plan_name_snapshot=purchase.plan_name_snapshot,
            survey_type="final",
            day_offset=day_offset,
            scheduled_at=trigger,
            status=SCHEDULED_STATUS,
        )
        db.add(survey)


def get_questions_for_type(survey_type: str) -> list[dict]:
    if survey_type == "progress":
        return [
            {
                "id": "overall_wellbeing",
                "prompt": "Kaip vertinate bendrą savijautą ir energijos lygį pastarosiomis dienomis?",
                "type": "scale",
                "scale_min": 1,
                "scale_max": 5,
                "scale_min_label": "Labai prasta",
                "scale_max_label": "Puiki",
            },
            {
                "id": "plan_adherence",
                "prompt": "Kiek lengva laikytis suplanuotų patiekalų ir užkandžių grafiko?",
                "type": "scale",
                "scale_min": 1,
                "scale_max": 5,
                "scale_min_label": "Labai sudėtinga",
                "scale_max_label": "Labai paprasta",
            },
            {
                "id": "satiety_level",
                "prompt": "Kaip vertinate sotumo jausmą po valgių?",
                "type": "scale",
                "scale_min": 1,
                "scale_max": 5,
                "scale_min_label": "Nuolat alksta",
                "scale_max_label": "Visada pakanka",
            },
            {
                "id": "main_challenge",
                "prompt": "Kas šiuo metu didžiausias iššūkis laikantis plano?",
                "type": "single_choice",
                "options": [
                    "Trūksta laiko pasiruošti patiekalus",
                    "Norisi daugiau skonių ar įvairovės",
                    "Porcijų dydžiai netinka",
                    "Motyvacijos ar palaikymo stoka",
                    "Kita (įrašysiu komentaruose)",
                ],
            },
            {
                "id": "support_need",
                "prompt": "Kokių papildomų išteklių ar pagalbos norėtumėte artimiausioms dienoms?",
                "type": "multi_choice",
                "options": [
                    "Greitų patiekalų idėjų",
                    "Receptų su mažiau ingredientų",
                    "Motyvacijos palaikymo patarimų",
                    "Aiškesnio apsipirkimo plano",
                    "Kitų (įrašysiu komentaruose)",
                ],
                "help_text": "Galite pasirinkti kelis variantus",
            },
            {
                "id": "progress_note",
                "prompt": "Pasidalinkite įžvalgomis, pastebėjimais ar klausimais dietologui.",
                "type": "text",
                "help_text": "Galite palikti tuščią, jeigu šiuo metu pastabų neturite.",
            },
        ]

    # final survey
    return [
        {
            "id": "result_satisfaction",
            "prompt": "Kaip vertinate pasiektus rezultatus užbaigus planą?",
            "type": "scale",
            "scale_min": 1,
            "scale_max": 5,
            "scale_min_label": "Nepatenkintas",
            "scale_max_label": "Labai patenkintas",
        },
        {
            "id": "meal_quality",
            "prompt": "Kaip vertinate patiekalų skonį, kokybę ir pateikimą?",
            "type": "scale",
            "scale_min": 1,
            "scale_max": 5,
            "scale_min_label": "Silpnai",
            "scale_max_label": "Puikiai",
        },
        {
            "id": "routine_fit",
            "prompt": "Kiek mitybos planas dera su jūsų dienos ritmu ir įpročiais?",
            "type": "scale",
            "scale_min": 1,
            "scale_max": 5,
            "scale_min_label": "Visai nederėjo",
            "scale_max_label": "Puikiai pritaikytas",
        },
        {
            "id": "support_needed",
            "prompt": "Ko labiausiai norėtumėte kitame mitybos plane?",
            "type": "multi_choice",
            "options": [
                "Daugiau skirtingų receptų ir skonių",
                "Paprasčiau paruošiamų patiekalų",
                "Individualizuotų pasiūlymų pagal alergijas / apribojimus",
                "Detalesnio apsipirkimo ir paruošimo plano",
                "Tolesnio dietologo ar trenerio palaikymo",
                "Kita (įrašysiu komentaruose)",
            ],
            "help_text": "Galite pasirinkti kelis variantus",
        },
        {
            "id": "goal_progress",
            "prompt": "Kokį pokytį pastebėjote (svorio, savijautos, gyvenimo būdo)?",
            "type": "text",
            "help_text": "Įvardykite konkrečius pokyčius ar skaičius, jei galite.",
        },
        {
            "id": "feedback",
            "prompt": "Papildomi komentarai, pasiūlymai ar klausimai mūsų komandai.",
            "type": "text",
            "help_text": "Padėkite mums dar labiau pagerinti planą ateityje.",
        },
        {
            "id": "next_goals",
            "prompt": "Kokį kitą tikslą norėtumėte pasiekti su mūsų pagalba?",
            "type": "single_choice",
            "options": [
                "Toliau optimizuoti dabartinį svorį",
                "Didinti raumenų masę / sportinius rezultatus",
                "Pagerinti bendrą savijautą ir energiją",
                "Sukaupti žinių savarankiškam planavimui",
                "Dar nežinau – laukiu profesionalo rekomendacijos",
            ],
        },
    ]


def record_survey_response(
    db: Session,
    survey: PlanProgressSurvey,
    user_id: str,
    answers: dict,
) -> PlanProgressSurveyResponse:
    response = PlanProgressSurveyResponse(
        survey_id=survey.id,
        user_id=user_id,
        answers=answers,
    )
    db.add(response)
    survey.status = "completed"
    survey.completed_at = datetime.utcnow()
    db.add(survey)
    return response
