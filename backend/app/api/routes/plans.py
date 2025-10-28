from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.nutrition_plan import NutritionPlan
from app.models.user import User
from app.schemas.plan import (
    CustomPlanCreate,
    NutritionPlanDetail,
    NutritionPlanSummary,
    PlanSelectionRequest,
    RecommendedPlanDetail,
)
from app.schemas.purchase import PlanCheckoutRequest, PlanCheckoutResponse
from app.services.payments import PaymentError, process_checkout
from app.services.plan_recommendation import (
    attach_macro_totals,
    create_custom_plan,
    get_recommended_plan,
)

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=List[NutritionPlanSummary])
def list_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[NutritionPlan]:
    plans = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.meals),
            selectinload(NutritionPlan.pricing_entries),
        )
        .filter((NutritionPlan.owner_id.is_(None)) | (NutritionPlan.owner_id == current_user.id))
        .order_by(NutritionPlan.is_custom.asc(), NutritionPlan.name.asc())
        .all()
    )
    for plan in plans:
        attach_macro_totals(plan)
    return plans


@router.get("/recommended", response_model=RecommendedPlanDetail)
def recommended_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NutritionPlan:
    plan, reason = get_recommended_plan(db, current_user)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plans available")

    attach_macro_totals(plan)
    # ensure meals loaded for response
    plan.meals  # type: ignore[attr-defined]
    if reason:
        setattr(plan, "recommendation_reason", reason)
    return plan


@router.post("/custom", response_model=NutritionPlanDetail, status_code=status.HTTP_201_CREATED)
def create_custom(
    payload: CustomPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NutritionPlan:
    plan = create_custom_plan(db, current_user, payload)
    attach_macro_totals(plan)
    return plan


@router.post("/select", response_model=NutritionPlanSummary)
def select_plan(
    payload: PlanSelectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NutritionPlan:
    plan = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.meals),
            selectinload(NutritionPlan.pricing_entries),
        )
        .filter(NutritionPlan.id == payload.plan_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.owner_id not in (None, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Plan is not available to this user")

    current_user.current_plan_id = plan.id
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    attach_macro_totals(plan)
    return plan


@router.post("/{plan_id}/checkout", response_model=PlanCheckoutResponse, status_code=status.HTTP_201_CREATED)
def checkout_plan(
    plan_id: int,
    payload: PlanCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanCheckoutResponse:
    plan = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.meals),
            selectinload(NutritionPlan.pricing_entries),
        )
        .filter(NutritionPlan.id == plan_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.owner_id not in (None, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Plan is not available to this user")

    try:
        purchase = process_checkout(db, current_user, plan, payload)
    except PaymentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    download_url = f"/api/purchases/{purchase.id}/receipt" if purchase.pdf_path else None
    return PlanCheckoutResponse(
        purchase_id=purchase.id,
        plan_id=purchase.plan_id,
        status=purchase.status,
        base_price=purchase.base_price,
        total_price=purchase.total_price,
        currency=purchase.currency,
        discount_amount=purchase.discount_amount,
        discount_label=purchase.discount_label,
        discount_code=purchase.discount_code,
        discount_percent=purchase.discount_percent,
        download_url=download_url,
    )


@router.get("/{plan_id}", response_model=NutritionPlanDetail)
def plan_detail(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NutritionPlan:
    plan = (
        db.query(NutritionPlan)
        .options(
            selectinload(NutritionPlan.meals),
            selectinload(NutritionPlan.pricing_entries),
        )
        .filter(NutritionPlan.id == plan_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.owner_id not in (None, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Plan is not available to this user")

    attach_macro_totals(plan)
    plan.meals  # type: ignore[attr-defined]
    return plan
