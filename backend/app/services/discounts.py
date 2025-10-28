from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.plan_purchase import PlanPurchase
from app.models.user import User

FIRST_PURCHASE_PERCENT = Decimal("0.15")
BIRTHDAY_PERCENT = Decimal("0.15")
BIRTHDAY_CODE = "BIRTHDAY15"
BIRTHDAY_WINDOW_DAYS = 7


@dataclass
class AppliedDiscount:
    label: str
    code: Optional[str]
    percent: Decimal
    amount_cents: int


@dataclass
class DiscountComputation:
    base_price_cents: int
    final_price_cents: int
    discount_amount_cents: int
    applied: Optional[AppliedDiscount]


def _user_purchase_count(db: Session, user: User) -> int:
    return (
        db.query(PlanPurchase)
        .filter(PlanPurchase.user_id == user.id)
        .count()
    )


def _normalize_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.strip().upper()


def _is_within_birthday_window(birth_date: date, reference: date) -> bool:
    candidates = []
    for year in (reference.year - 1, reference.year, reference.year + 1):
        try:
            candidates.append(birth_date.replace(year=year))
        except ValueError:
            # handle Feb 29 -> Feb 28
            candidates.append(date(year, 2, 28))

    window = timedelta(days=BIRTHDAY_WINDOW_DAYS)
    return any(abs((candidate - reference).days) <= window.days for candidate in candidates)


def _generic_code_map() -> dict[str, Decimal]:
    mapping: dict[str, Decimal] = {}
    for entry in settings.generic_discount_codes:
        percent_value = Decimal(str(entry.percent or 0))
        if percent_value < 0:
            continue
        mapping[entry.code.upper()] = percent_value
    return mapping


def compute_discount(
    db: Session,
    user: User,
    base_price_cents: int,
    discount_code: Optional[str],
) -> DiscountComputation:
    normalized_code = _normalize_code(discount_code)
    applied: Optional[AppliedDiscount] = None

    if normalized_code:
        if normalized_code == BIRTHDAY_CODE:
            if not user.birth_date:
                raise ValueError("Gimtadienio nuolaida galima tik nurodžius gimimo datą profilyje.")
            today = date.today()
            if not _is_within_birthday_window(user.birth_date, today):
                raise ValueError("Gimtadienio nuolaidos kodas negalioja šiuo metu.")

            amount = int((Decimal(base_price_cents) * BIRTHDAY_PERCENT).quantize(Decimal("1")))
            applied = AppliedDiscount(
                label="Gimtadienio nuolaida",
                code=normalized_code,
                percent=BIRTHDAY_PERCENT,
                amount_cents=amount,
            )
        else:
            generic_map = _generic_code_map()
            if normalized_code not in generic_map:
                raise ValueError("Netinkamas nuolaidos kodas.")
            generic_percent = generic_map[normalized_code]
            amount = int((Decimal(base_price_cents) * generic_percent).quantize(Decimal("1")))
            applied = AppliedDiscount(
                label=f"Nuolaidos kodas {normalized_code}",
                code=normalized_code,
                percent=generic_percent,
                amount_cents=amount,
            )
    else:
        purchase_count = _user_purchase_count(db, user)
        if purchase_count == 0:
            amount = int((Decimal(base_price_cents) * FIRST_PURCHASE_PERCENT).quantize(Decimal("1")))
            applied = AppliedDiscount(
                label="Pirmo pirkimo akcija",
                code=None,
                percent=FIRST_PURCHASE_PERCENT,
                amount_cents=amount,
            )

    discount_amount_cents = applied.amount_cents if applied else 0
    final_price_cents = max(base_price_cents - discount_amount_cents, 0)

    return DiscountComputation(
        base_price_cents=base_price_cents,
        final_price_cents=final_price_cents,
        discount_amount_cents=discount_amount_cents,
        applied=applied,
    )
