"""
Tracking-coverage primitive (Epic 15.1) + the meals-outside proration it
enables (Epic 15.5.3) and the Tier-2 unlock threshold (Epic 15.4.1).

Classifies each day in a range as `tracked` (>=1 real ConsumptionEvent),
`away` (explicit user flag — travelling, eating out entirely that day),
or `untracked` (neither) — so every windowed calculation downstream can
exclude days with no signal instead of reading them as a zero-intake
failure. Builds only on the existing confirmed-consumption system
(ConsumptionEvent, services/pantry.py) — no new consumption model, just
a new lens on which days already have one (see docs/architektur_entscheidungen.md
Section A: the app deliberately stays retrospective/confirmed-only).
"""

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from backend.app.db.day_flags_repo import mark_day_away, unmark_day_away, get_away_dates
from backend.app.services.pantry import (
    get_real_consumption_events,
    get_meals_outside_count_for_date,
)
from backend.app.models.profile import ProfileCreate, MealsOutside

__all__ = [
    "mark_day_away",
    "unmark_day_away",
    "day_coverage",
    "outside_meal_fraction",
    "tracking_maturity",
]

# Epic 15.4.1: full week of tracked days before Tier 2's early-signal
# blend gives way to a full Tier 3 weekly score (team decision — the
# stricter of the three options considered, since it means Tier 2 always
# spans a complete first week rather than an arbitrary partial one).
TIER2_UNLOCK_TRACKED_DAYS = 7

# BR-I6's untracked-occasion share (status_quo.py's _MEALS_OUTSIDE), reused
# here as the fallback proration when a day has no explicit outside-meal
# tap — same source of truth as the confidence-discount model, just now
# also used to shrink a target instead of only a confidence label.
_MEALS_OUTSIDE_UNTRACKED_SHARE = {
    MealsOutside.NEVER: 0.00,
    MealsOutside.RARELY: 0.05,
    MealsOutside.SOMETIMES: 0.20,
    MealsOutside.OFTEN: 0.40,
    MealsOutside.DAILY: 0.65,
}


def _date_range(date_from: date, date_to: date) -> List[date]:
    days = []
    d = date_from
    while d <= date_to:
        days.append(d)
        d += timedelta(days=1)
    return days


def day_coverage(user_id: str, date_from: date, date_to: date) -> Dict[str, List[str]]:
    """Classify every day in [date_from, date_to] as tracked/away/untracked.

    A day explicitly marked away wins even if it also has a
    ConsumptionEvent (e.g. one bite logged before leaving) — the user's
    explicit signal is more trustworthy than an incidental log entry."""

    events = get_real_consumption_events(user_id)
    tracked_dates = set()
    for e in events:
        ts = e.get("consumed_at")
        if not ts:
            continue
        tracked_dates.add(datetime.fromisoformat(ts).date())

    away_dates = set(get_away_dates(user_id, date_from, date_to))

    tracked, away, untracked = [], [], []
    for d in _date_range(date_from, date_to):
        if d in away_dates:
            away.append(d.isoformat())
        elif d in tracked_dates:
            tracked.append(d.isoformat())
        else:
            untracked.append(d.isoformat())
    return {"tracked": tracked, "away": away, "untracked": untracked}


def outside_meal_fraction(
    user_id: str,
    date_from: date,
    date_to: date,
    profile: Optional[ProfileCreate] = None,
) -> float:
    """
    Fraction of this window's eating that had no visibility at all
    (Epic 15.5.3) — used to shrink a nutrient target rather than count
    those meals as a deficit.

    Prefers the dynamic daily "ate out" taps when any exist in the
    window; falls back to the static onboarding MealsOutside answer
    (same share status_quo.py already uses for its confidence discount)
    when nothing was explicitly tapped. Clamped to [0, 1].
    """

    meals_per_day = getattr(profile, "meals_per_day", None) if profile else None
    days = _date_range(date_from, date_to)

    outside_total = sum(get_meals_outside_count_for_date(user_id, d) for d in days)

    if outside_total > 0 and meals_per_day:
        possible = meals_per_day * len(days)
        if possible > 0:
            return max(0.0, min(1.0, outside_total / possible))

    meals_outside = getattr(profile, "meals_outside", None) if profile else None
    return _MEALS_OUTSIDE_UNTRACKED_SHARE.get(meals_outside, 0.0)


def tracking_maturity(user_id: str, window_days: int = TIER2_UNLOCK_TRACKED_DAYS) -> Dict[str, float]:
    """
    Epic 15.4.1: how far this user is into the tracked-day threshold that
    unlocks Tier 3's full weekly score. `blend_weight` is 0 with no
    tracked days and 1.0 once `window_days` tracked days exist in the
    trailing TIER2_UNLOCK_TRACKED_DAYS-day window — Tier 2 (basket
    composition blended toward confirmed data) uses this to fade in the
    real signal instead of an abrupt cutover.
    """

    today = datetime.now(timezone.utc).date()
    coverage = day_coverage(user_id, today - timedelta(days=TIER2_UNLOCK_TRACKED_DAYS - 1), today)
    tracked_days = len(coverage["tracked"])
    blend_weight = round(min(1.0, tracked_days / window_days), 3) if window_days else 1.0
    return {
        "tracked_days": tracked_days,
        "threshold": window_days,
        "blend_weight": blend_weight,
    }
