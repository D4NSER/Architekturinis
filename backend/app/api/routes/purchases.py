from __future__ import annotations

from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.plan_purchase import PlanPurchase
from app.models.user import User
from app.schemas.purchase import PurchaseDetail, PurchaseMealSnapshot, PurchaseSummary
from app.services.surveys import activate_final_survey

router = APIRouter(prefix="/purchases", tags=["purchases"])


def _download_url(purchase_id: int) -> str:
    return f"/api/purchases/{purchase_id}/receipt"


def _to_summary(purchase: PlanPurchase) -> PurchaseSummary:
    return PurchaseSummary(
        id=purchase.id,
        plan_id=purchase.plan_id,
        plan_name_snapshot=purchase.plan_name_snapshot,
        period_days=purchase.period_days,
        base_price=purchase.base_price,
        total_price=purchase.total_price,
        discount_amount=purchase.discount_amount,
        discount_label=purchase.discount_label,
        discount_code=purchase.discount_code,
        discount_percent=purchase.discount_percent,
        currency=purchase.currency,
        status=purchase.status,
        payment_method=purchase.payment_method,
        created_at=purchase.created_at,
        paid_at=purchase.paid_at,
        transaction_reference=purchase.transaction_reference,
        download_url=_download_url(purchase.id) if purchase.pdf_path else None,
    )


@router.get("", response_model=List[PurchaseSummary])
def list_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PurchaseSummary]:
    purchases = (
        db.query(PlanPurchase)
        .filter(PlanPurchase.user_id == current_user.id)
        .order_by(PlanPurchase.created_at.desc())
        .all()
    )

    return [_to_summary(purchase) for purchase in purchases]


def _fetch_purchase_or_404(db: Session, user_id: str, purchase_id: int) -> PlanPurchase:
    purchase = (
        db.query(PlanPurchase)
        .options(selectinload(PlanPurchase.items))
        .filter(PlanPurchase.id == purchase_id, PlanPurchase.user_id == user_id)
        .first()
    )
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    return purchase


@router.get("/{purchase_id}", response_model=PurchaseDetail)
def purchase_detail(
    purchase_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PurchaseDetail:
    purchase = _fetch_purchase_or_404(db, current_user.id, purchase_id)
    items = [
        PurchaseMealSnapshot.model_validate(item, from_attributes=True)
        for item in sorted(purchase.items, key=lambda i: (i.day_of_week, i.meal_type, i.id))
    ]

    summary = _to_summary(purchase)
    return PurchaseDetail(
        **summary.model_dump(),
        buyer_full_name=purchase.buyer_full_name,
        buyer_email=purchase.buyer_email,
        buyer_phone=purchase.buyer_phone,
        invoice_needed=purchase.invoice_needed,
        company_name=purchase.company_name,
        company_code=purchase.company_code,
        vat_code=purchase.vat_code,
        extra_notes=purchase.extra_notes,
        items=items,
    )


@router.get("/{purchase_id}/receipt")
def download_receipt(
    purchase_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    purchase = _fetch_purchase_or_404(db, current_user.id, purchase_id)
    if purchase.status != "paid" or not purchase.pdf_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not available yet")

    return FileResponse(
        path=f"media/{purchase.pdf_path}",
        filename=f"FitBite_planas_{purchase.plan_name_snapshot}_{purchase.id}.pdf",
        media_type="application/pdf",
    )


@router.post("/{purchase_id}/cancel", response_model=PurchaseSummary)
def cancel_purchase(
    purchase_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PurchaseSummary:
    purchase = _fetch_purchase_or_404(db, current_user.id, purchase_id)
    if purchase.status == "canceled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase already canceled")

    # remove stored PDF if exists
    if purchase.pdf_path:
        pdf_full_path = Path("media") / purchase.pdf_path
        if pdf_full_path.exists():
            pdf_full_path.unlink(missing_ok=True)
        purchase.pdf_path = None

    purchase.status = "canceled"

    if current_user.current_plan_id == purchase.plan_id:
        current_user.current_plan_id = None
        db.add(current_user)

    activate_final_survey(db, purchase)
    purchase.paid_at = None
    purchase.transaction_reference = None

    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    return _to_summary(purchase)
