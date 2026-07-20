"""
Basket & blended macro composition (Epic 15.3/15.4 — Tiers 1 & 2 of the
Confidence Ladder).

Tier 1 (compute_basket_composition): the calorie-weighted protein/fat/
carb split of every receipt item ever uploaded — computable from day
one, before a single confirmed ConsumptionEvent exists. Deliberately a
claim about the *basket*, not the *diet*: it reads receipt_items only,
never touches PantryItem/ConsumptionEvent, so it doesn't compete with
the confirmed-consumption model (docs/architektur_entscheidungen.md
Section A) — it's purely descriptive of what was bought.

Tier 2 (compute_blended_composition): once real ConsumptionEvents start
existing, blend toward them — weighted by day_coverage.tracking_maturity
— instead of an abrupt cutover once the Tier 3 threshold is reached.
"""

from typing import Optional

from backend.app.services.ideal_profile import KCAL_PER_G
from backend.app.services.nutrition_mapping import map_items, compute_receipt_totals
from backend.app.services.intake_estimator import (
    DEFAULT_WINDOW_DAYS,
    estimate_daily_calories_kcal,
    estimate_daily_protein_g,
    estimate_daily_fat_g,
    estimate_daily_carbs_g,
)
from backend.app.services.day_coverage import tracking_maturity


def _pct_split(protein_g: float, fat_g: float, carbs_g: float, kcal_total: float) -> Optional[dict]:
    if not kcal_total or kcal_total <= 0:
        return None
    return {
        "protein_pct": round(protein_g * KCAL_PER_G["protein"] / kcal_total * 100, 1),
        "fat_pct": round(fat_g * KCAL_PER_G["fat"] / kcal_total * 100, 1),
        "carb_pct": round(carbs_g * KCAL_PER_G["carb"] / kcal_total * 100, 1),
        "kcal_total": round(kcal_total, 1),
    }


def compute_basket_composition(user_id: str) -> Optional[dict]:
    """Tier 1: macro % split of everything purchased so far. None if
    there are no receipt items yet, or none resolved to nutrition."""

    from backend.app.db.supabase import get_receipt_items_by_user

    items = get_receipt_items_by_user(user_id)
    if not items:
        return None

    matched = map_items(items).matched_products
    totals = compute_receipt_totals(items, matched)
    split = _pct_split(
        totals.get("protein_g", 0.0),
        totals.get("fat_g", 0.0),
        totals.get("carbs_g", 0.0),
        totals.get("calories_kcal", 0.0),
    )
    if split is None:
        return None
    return {**split, "items_considered": len(items)}


def compute_confirmed_composition(user_id: str, window_days: int = DEFAULT_WINDOW_DAYS) -> Optional[dict]:
    """The same macro % split, from confirmed ConsumptionEvents instead
    of the basket — reuses intake_estimator's existing per-nutrient
    estimates rather than a second nutrient-resolution pass."""

    calories = estimate_daily_calories_kcal(user_id, window_days)
    if calories.daily_estimate is None:
        return None

    protein = estimate_daily_protein_g(user_id, window_days)
    fat = estimate_daily_fat_g(user_id, window_days)
    carbs = estimate_daily_carbs_g(user_id, window_days)
    split = _pct_split(
        protein.daily_estimate or 0.0,
        fat.daily_estimate or 0.0,
        carbs.daily_estimate or 0.0,
        calories.daily_estimate,
    )
    if split is None:
        return None
    return {**split, "events_considered": calories.events_considered}


def compute_blended_composition(user_id: str) -> dict:
    """
    Tier 2: basket composition blended toward confirmed composition as
    tracked days accumulate. `blend_weight` 0 → basket-only, 1.0 →
    confirmed-only, in between → a weighted average of both — so the
    displayed split moves smoothly instead of jumping the moment Tier 3's
    threshold is crossed.
    """

    maturity = tracking_maturity(user_id)
    weight = maturity["blend_weight"]
    basket = compute_basket_composition(user_id)
    confirmed = compute_confirmed_composition(user_id)

    if confirmed is None:
        base = basket or {"protein_pct": None, "fat_pct": None, "carb_pct": None, "kcal_total": None}
        return {**base, "source": "basket" if basket else "none", "blend_weight": 0.0, "tracking": maturity}

    if basket is None:
        return {**confirmed, "source": "confirmed", "blend_weight": 1.0, "tracking": maturity}

    blended = {
        "protein_pct": round(basket["protein_pct"] * (1 - weight) + confirmed["protein_pct"] * weight, 1),
        "fat_pct": round(basket["fat_pct"] * (1 - weight) + confirmed["fat_pct"] * weight, 1),
        "carb_pct": round(basket["carb_pct"] * (1 - weight) + confirmed["carb_pct"] * weight, 1),
        "kcal_total": round(basket["kcal_total"] * (1 - weight) + confirmed["kcal_total"] * weight, 1),
    }
    source = "confirmed" if weight >= 1.0 else ("basket" if weight <= 0.0 else "blend")
    return {**blended, "source": source, "blend_weight": weight, "tracking": maturity}
