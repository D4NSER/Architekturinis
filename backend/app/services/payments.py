from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.nutrition_plan import NutritionPlan
from app.models.plan_purchase import PlanPurchase, PlanPurchaseItem
from app.models.user import User
from app.schemas.purchase import PlanCheckoutRequest
from app.services.pdf_export import render_purchase_pdf
from app.services.discounts import compute_discount
from app.services.pricing import PricingService
from app.services.surveys import schedule_surveys_for_purchase


class PaymentError(Exception):
    """Raised when payment validation fails."""


def _validate_payment_details(payload: PlanCheckoutRequest) -> None:
    if payload.payment_method == "card":
        card_fields = [payload.card_number, payload.card_exp_month, payload.card_exp_year, payload.card_cvc]
        if not all(card_fields):
            raise PaymentError("Kortelės mokėjimui būtina pateikti visus kortelės duomenis.")

        digits_only = "".join(ch for ch in payload.card_number if ch.isdigit()) if payload.card_number else ""
        if len(digits_only) not in {15, 16}:
            raise PaymentError("Kortelės numeris turi būti 15 arba 16 skaitmenų.")

        if payload.card_cvc and len(payload.card_cvc) not in {3, 4}:
            raise PaymentError("CVC kodas turi būti 3 arba 4 skaitmenų.")


def _create_purchase_item_from_meal(purchase_id: int, meal) -> PlanPurchaseItem:
    return PlanPurchaseItem(
        purchase_id=purchase_id,
        day_of_week=meal.day_of_week,
        meal_type=meal.meal_type,
        meal_title=meal.title,
        meal_description=meal.description,
        calories=meal.calories,
        protein_grams=meal.protein_grams,
        carbs_grams=meal.carbs_grams,
        fats_grams=meal.fats_grams,
    )


def process_checkout(
    db: Session,
    user: User,
    plan: NutritionPlan,
    payload: PlanCheckoutRequest,
) -> PlanPurchase:
    pricing_service = PricingService(plan)
    option = pricing_service.get_option(payload.period_days)
    if option is None:
        raise PaymentError("Pasirinktas periodo variantas nerastas.")

    _validate_payment_details(payload)

    base_price_cents = option.price_cents
    try:
        discount = compute_discount(db, user, base_price_cents, payload.discount_code)
    except ValueError as exc:
        raise PaymentError(str(exc)) from exc

    purchase = PlanPurchase(
        user_id=user.id,
        plan_id=plan.id,
        plan_name_snapshot=plan.name,
        period_days=option.period_days,
        base_price_cents=base_price_cents,
        price_cents=discount.final_price_cents,
        discount_amount_cents=discount.discount_amount_cents,
        discount_label=discount.applied.label if discount.applied else None,
        discount_code=discount.applied.code if discount.applied else None,
        currency=option.currency,
        payment_method=payload.payment_method,
        status="pending",
        buyer_full_name=payload.buyer_full_name,
        buyer_email=payload.buyer_email,
        buyer_phone=payload.buyer_phone,
        invoice_needed=payload.invoice_needed,
        company_name=payload.company_name,
        company_code=payload.company_code,
        vat_code=payload.vat_code,
        extra_notes=payload.extra_notes,
    )

    db.add(purchase)
    db.flush()

    for meal in sorted(plan.meals or [], key=lambda m: (m.day_of_week, m.meal_type, m.id)):
        db.add(_create_purchase_item_from_meal(purchase.id, meal))

    # Simulate payment success
    purchase.status = "paid"
    purchase.paid_at = datetime.utcnow()
    purchase.transaction_reference = f"SIM-{purchase.id:06d}-{purchase.paid_at.strftime('%H%M%S')}"

    db.add(purchase)
    db.flush()

    items = (
        db.query(PlanPurchaseItem)
        .filter(PlanPurchaseItem.purchase_id == purchase.id)
        .order_by(PlanPurchaseItem.id.asc())
        .all()
    )

    pdf_relative_path = render_purchase_pdf(purchase, items)
    purchase.pdf_path = pdf_relative_path

    schedule_surveys_for_purchase(db, purchase)

    if user.current_plan_id != plan.id:
        user.current_plan_id = plan.id
        db.add(user)

    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase
