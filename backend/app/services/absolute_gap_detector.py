"""
Absolute (Bedarf vs. Ist) gap detection — iron, protein, calcium and
calories.

Rule-based, same spirit as gap_detector.py, but compares a real daily
estimate (intake_estimator.py, built from confirmed pantry consumption)
against a real daily requirement (nutrient_requirements.py) instead of a
density ratio. Returns no gap at all for a nutrient with not enough
pantry data to say anything — never fabricates a gap from an assumption,
matching this codebase's anti-hallucination stance (see recommender.py,
profile.py).

Calories are handled separately from the _NUTRIENTS table below (see
detect_calorie_gap): iron/protein/calcium are all "more is better, up to
the requirement" — a single one-sided LOW check. Calories aren't — being
below target can be the *goal* (a deficit) and being above it can too (a
surplus) — so calories need a goal-aware, two-sided (LOW or HIGH) check
instead of the generic table's one-sided assumption.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Union

from backend.app.models.absolute_gap import AbsoluteGap
from backend.app.models.snapshot import GapStatus
from backend.app.models.profile import Goal, Profile, ProfileCreate
from backend.app.services.intake_estimator import (
    DEFAULT_WINDOW_DAYS,
    estimate_daily_iron_mg,
    estimate_daily_protein_g,
    estimate_daily_calcium_mg,
    estimate_daily_calories_kcal,
    estimate_daily_fat_g,
    estimate_daily_carbs_g,
)
from backend.app.services.nutrient_requirements import (
    personalized_iron_ref_mg_per_day,
    IRON_REF_DEFAULT_MG_PER_DAY,
    personalized_calcium_ref_mg_per_day,
    CALCIUM_REF_MG_PER_DAY,
    PROTEIN_REF_DEFAULT_G_PER_DAY,
)
from backend.app.services.nutrition_personalization import CALORIE_TARGET_DEFAULT_KCAL
from backend.app.services.ideal_profile import compute_ideal_profile
from backend.app.services.day_coverage import day_coverage, outside_meal_fraction
from backend.app.services import i18n

ProfileLike = Union[Profile, ProfileCreate]


def has_sufficient_data(user_id: str) -> bool:
    """
    True if this session has ANY confirmed consumption at all —
    distinguishes "nothing confirmed yet, so absolute_gaps is empty
    because we can't say anything" from "confirmed, and everything's
    within range" for the frontend's empty state (Epic 11.1). A single
    ConsumptionEvent is enough to answer this, so this is a cheap check,
    not a re-run of every nutrient's estimate. Excludes the Epic 15.5
    outside-meal sentinel — tapping "I ate out" isn't a food confirmation.
    """

    from backend.app.services.pantry import get_real_consumption_events

    return len(get_real_consumption_events(user_id)) > 0


def has_sufficient_trend_data(user_id: str, total_days: int, min_coverage: float = 0.6) -> bool:
    """
    Epic 15.6.2: a 30/90-day trend is only trustworthy if enough of that
    window actually has tracked days — a month with 5 tracked days out
    of 30 would otherwise produce a technically-real but wildly noisy
    average. `min_coverage` is the team's chosen floor (0.6 — tolerates
    a lost receipt or a short trip without blanking the trend entirely).
    """

    today = datetime.now(timezone.utc).date()
    coverage = day_coverage(user_id, today - timedelta(days=total_days - 1), today)
    tracked_fraction = len(coverage["tracked"]) / total_days if total_days else 0.0
    return tracked_fraction >= min_coverage


def _ideal_field(profile: Optional[ProfileLike], field: str) -> Optional[float]:
    """
    Epic 15.2: the ONE target engine every screen compares against —
    TargetsCard already shows compute_ideal_profile()'s numbers, so the
    gap detector must compare against the same numbers, not a second,
    independently-derived formula (the old nutrition_personalization.py
    TDEE for calories, or nutrient_requirements.py's flatter g/kg
    baseline for protein — both could silently disagree with what the
    user already sees on their Targets card).
    """

    if profile is None:
        return None
    ideal = compute_ideal_profile(profile)
    if ideal is None:
        return None
    return getattr(ideal, field, None)


def _effective_requirement(requirement: Optional[float], outside_fraction: float) -> Optional[float]:
    """Epic 15.5.3: shrink a requirement by however much of the window's
    eating had no visibility at all (meals outside the tracked pantry) —
    a day entirely eaten out reads as "nothing to compare," not a deficit."""

    if requirement is None:
        return None
    return requirement * (1 - outside_fraction)


# How far estimate/target may deviate (either direction) before it's
# worth mentioning — a rough band, not a precise clinical threshold.
_CALORIE_TOLERANCE = 0.10
# Looser than calories: day-to-day macro *composition* swings more than
# total calories do (one bigger, fattier meal shifts the fat% a lot more
# than it shifts the day's total kcal), so the same 10% band would flag
# fat/carbs on completely ordinary days.
_MACRO_TOLERANCE = 0.20

# One entry per one-sided (deficiency-style) nutrient: (dimension,
# estimate_fn, requirement_fn, default_requirement, message_key). Protein
# targets the same Ideal Profile Engine numbers TargetsCard shows
# (Epic 15.2); iron/calcium stay on nutrient_requirements.py's
# DGE-verified age/gender-specific tables — ideal_profile.py's own
# iron_mg/calcium_mg are explicitly-flagged provisional starter values
# (see its docstring), so switching those two would be a regression in
# accuracy, not a consistency win. Fat/carbs are NOT in this table (see
# detect_macro_gaps below) — "low" isn't automatically a problem for
# them the way it is for iron/protein/calcium (e.g. an intentionally
# low-carb diet), so they get calories' two-sided treatment instead.
_NUTRIENTS = [
    ("iron", estimate_daily_iron_mg, personalized_iron_ref_mg_per_day, IRON_REF_DEFAULT_MG_PER_DAY, "abs.iron"),
    ("protein", estimate_daily_protein_g, lambda p: _ideal_field(p, "protein_g"), PROTEIN_REF_DEFAULT_G_PER_DAY, "abs.protein"),
    ("calcium", estimate_daily_calcium_mg, personalized_calcium_ref_mg_per_day, CALCIUM_REF_MG_PER_DAY, "abs.calcium"),
]

# Two-sided (calories-style) macro dimensions: (dimension, estimate_fn,
# ideal_profile_field, message_key_prefix).
_MACRO_DIMENSIONS = [
    ("fat", estimate_daily_fat_g, "fat_g", "abs.fat"),
    ("carbs", estimate_daily_carbs_g, "carbs_g", "abs.carbs"),
]


def _outside_fraction_for_window(user_id: str, profile: Optional[ProfileLike], window_days: int, offset_days: int) -> float:
    now = datetime.now(timezone.utc)
    window_end = (now - timedelta(days=offset_days)).date()
    window_start = window_end - timedelta(days=window_days)
    return outside_meal_fraction(user_id, window_start, window_end, profile)


def detect_calorie_gap(
    user_id: str,
    profile: Optional[ProfileLike] = None,
    lang: str = "en",
    window_days: int = DEFAULT_WINDOW_DAYS,
    offset_days: int = 0,
) -> Optional[AbsoluteGap]:
    """
    Goal-aware, two-sided calorie gap: unlike iron/protein/calcium, being
    below target isn't automatically bad (a deficit is the point for
    Goal.LOSE_WEIGHT_GRADUALLY) and being above isn't automatically bad
    either (a surplus is the point for Goal.BUILD_MUSCLE). Within
    _CALORIE_TOLERANCE of the target, nothing is reported at all — not
    every minor fluctuation is worth flagging.
    """

    estimate = estimate_daily_calories_kcal(user_id, window_days, offset_days)
    if estimate.daily_estimate is None:
        return None

    target = _ideal_field(profile, "calories_kcal") or CALORIE_TARGET_DEFAULT_KCAL
    outside_fraction = _outside_fraction_for_window(user_id, profile, window_days, offset_days)
    target = _effective_requirement(target, outside_fraction)
    if not target or target <= 0:
        return None

    ratio = round(estimate.daily_estimate / target, 2)
    if (1 - _CALORIE_TOLERANCE) <= ratio <= (1 + _CALORIE_TOLERANCE):
        return None

    goal = getattr(profile, "goal", None)

    # `target` is already goal-adjusted (ideal_profile applies the
    # deficit/surplus). Deviating further in the direction the goal
    # already wants isn't a problem to flag — only deviating the "wrong"
    # way, or having no specific goal at all, is.
    if ratio < 1:
        if goal == Goal.LOSE_WEIGHT_GRADUALLY:
            return None
        status = GapStatus.LOW
        message = i18n.t(lang, "abs.calories_low", estimate=estimate.daily_estimate, target=target)
    else:
        if goal == Goal.BUILD_MUSCLE:
            return None
        status = GapStatus.HIGH
        message = i18n.t(lang, "abs.calories_high", estimate=estimate.daily_estimate, target=target)

    return AbsoluteGap(
        dimension="calories",
        status=status,
        daily_estimate=estimate.daily_estimate,
        daily_requirement=target,
        ratio=ratio,
        message=message,
        confidence=estimate.confidence,
    )


def detect_macro_gaps(
    user_id: str,
    profile: Optional[ProfileLike] = None,
    lang: str = "en",
    window_days: int = DEFAULT_WINDOW_DAYS,
    offset_days: int = 0,
) -> List[AbsoluteGap]:
    """
    Epic 15.5.1: fat/carbs, same two-sided/tolerance-band treatment as
    calories (see detect_calorie_gap) rather than the one-sided
    deficiency check `_NUTRIENTS` uses — being "low" on carbs or fat
    isn't inherently a problem the way low iron/protein/calcium is (an
    intentionally low-carb diet shouldn't be told to eat more carbs).
    """

    outside_fraction = _outside_fraction_for_window(user_id, profile, window_days, offset_days)
    gaps: List[AbsoluteGap] = []

    for dimension, estimate_fn, ideal_field, message_prefix in _MACRO_DIMENSIONS:
        estimate = estimate_fn(user_id, window_days, offset_days)
        if estimate.daily_estimate is None:
            continue

        target = _effective_requirement(_ideal_field(profile, ideal_field), outside_fraction)
        if not target or target <= 0:
            continue

        ratio = round(estimate.daily_estimate / target, 2)
        if (1 - _MACRO_TOLERANCE) <= ratio <= (1 + _MACRO_TOLERANCE):
            continue

        if ratio < 1:
            status = GapStatus.LOW
            message = i18n.t(lang, f"{message_prefix}_low", estimate=estimate.daily_estimate, target=target)
        else:
            status = GapStatus.HIGH
            message = i18n.t(lang, f"{message_prefix}_high", estimate=estimate.daily_estimate, target=target)

        gaps.append(AbsoluteGap(
            dimension=dimension,
            status=status,
            daily_estimate=estimate.daily_estimate,
            daily_requirement=target,
            ratio=ratio,
            message=message,
            confidence=estimate.confidence,
        ))

    return gaps


def detect_absolute_gaps(
    user_id: str,
    profile: Optional[ProfileLike] = None,
    lang: str = "en",
    window_days: int = DEFAULT_WINDOW_DAYS,
    offset_days: int = 0,
) -> List[AbsoluteGap]:
    """
    Return the absolute gaps this session has enough confirmed pantry
    consumption to say something about, worst (furthest from target)
    first — [] for any nutrient with no confirmed consumption yet, since
    an untouched pantry says nothing about actual intake.

    `window_days`/`offset_days` (Epic 15.4/15.6) let a caller ask about
    something other than the default trailing week — e.g. a specific
    past week, or one bucket of a longer trend — without a second,
    parallel gap-detection function.
    """

    candidates = []  # (severity, AbsoluteGap)
    outside_fraction = _outside_fraction_for_window(user_id, profile, window_days, offset_days)

    for dimension, estimate_fn, requirement_fn, default_requirement, message_key in _NUTRIENTS:
        estimate = estimate_fn(user_id, window_days, offset_days)
        if estimate.daily_estimate is None:
            continue

        requirement = _effective_requirement(requirement_fn(profile) or default_requirement, outside_fraction)
        if not requirement or requirement <= 0 or estimate.daily_estimate >= requirement:
            continue

        ratio = round(estimate.daily_estimate / requirement, 2)
        severity = 1 - ratio
        candidates.append((severity, AbsoluteGap(
            dimension=dimension,
            status=GapStatus.LOW,
            daily_estimate=estimate.daily_estimate,
            daily_requirement=requirement,
            ratio=ratio,
            message=i18n.t(lang, message_key, estimate=estimate.daily_estimate, requirement=requirement),
            confidence=estimate.confidence,
        )))

    for macro_gap in detect_macro_gaps(user_id, profile, lang, window_days, offset_days):
        candidates.append((abs(1 - macro_gap.ratio), macro_gap))

    calorie_gap = detect_calorie_gap(user_id, profile, lang, window_days, offset_days)
    if calorie_gap is not None:
        candidates.append((abs(1 - calorie_gap.ratio), calorie_gap))

    candidates.sort(key=lambda pair: pair[0], reverse=True)
    return [gap for _, gap in candidates]
