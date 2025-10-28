from __future__ import annotations

from typing import Any, List

from app.models.nutrition_plan import NutritionPlan
from app.models.plan_period_pricing import PlanPeriodPricing


class PricingService:
    """Utility helpers for plan pricing operations."""

    def __init__(self, plan: NutritionPlan):
        self.plan = plan

    def _active_entries(self) -> List[PlanPeriodPricing]:
        entries = getattr(self.plan, "pricing_entries", []) or []
        filtered = [entry for entry in entries if entry.is_active]
        filtered.sort(key=lambda option: option.period_days)
        return filtered

    def serialize_options(self) -> List[dict[str, Any]]:
        """Prepare pricing options for API responses."""
        payload: List[dict[str, Any]] = []
        for entry in self._active_entries():
            payload.append(
                {
                    "period_days": entry.period_days,
                    "base_price": entry.base_price,
                    "final_price": entry.final_price,
                    "currency": entry.currency,
                    "discounts_applied": entry.discounts_applied,
                }
            )
        return payload

    def get_option(self, period_days: int) -> PlanPeriodPricing | None:
        for option in self._active_entries():
            if option.period_days == period_days:
                return option
        return None
