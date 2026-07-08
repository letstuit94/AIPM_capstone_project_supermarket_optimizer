"""
Nutrition Delta Calculator (Task 8.7, v2).

Compares two NutritionProfile snapshots (e.g. a session's basket before
vs. after receiving recommendations) and reports the change per
dimension, so an intervention's effect is quantifiable ("fiber up,
sugar down") rather than just "did they buy the recommended item."
"""

from typing import Optional

from backend.app.models.analytics import DimensionDelta, NutritionDelta
from backend.app.models.snapshot import NutritionProfile

# NutritionProfile field -> the plain dimension name used elsewhere
# (matches the dimension keys nutrition_model.py / gap_detector.py use).
_TRACKED_FIELDS = {
    "fiber_per_1000kcal": "fiber",
    "protein_per_1000kcal": "protein",
    "sugar_pct_energy": "sugar",
    "processed_avg": "processed",
}


def _direction(change: Optional[float]) -> str:
    if change is None:
        return "unknown"
    if abs(change) < 1e-9:
        return "flat"
    return "up" if change > 0 else "down"


def compute_nutrition_delta(before: NutritionProfile, after: NutritionProfile) -> NutritionDelta:
    """
    `direction` is "up"/"down" purely as a factual delta sign — it does
    NOT judge whether up or down is good (e.g. sugar "up" is a
    regression, fiber "up" is an improvement). Interpreting direction
    against a goal is left to the caller.
    """

    deltas = []
    for field, label in _TRACKED_FIELDS.items():
        before_value = getattr(before, field)
        after_value = getattr(after, field)
        change = (
            round(after_value - before_value, 3)
            if before_value is not None and after_value is not None
            else None
        )
        deltas.append(DimensionDelta(
            dimension=label,
            before=before_value,
            after=after_value,
            change=change,
            direction=_direction(change),
        ))

    return NutritionDelta(deltas=deltas)
