"""
Adoption Scoring Algorithm (Task 8.8, v2).

Given the Next Cart recommendation(s) shown to a session and a
subsequent receipt, computes what fraction of recommended items were
actually purchased — the MVP's core hypothesis metric: "do users trust
an AI recommendation inferred from receipt data enough to act on it?"
"""

from typing import List

from backend.app.analytics.comparator import did_purchase_item
from backend.app.models.analytics import AdoptionScore


def compute_adoption_score(recommended_items: List[str], next_receipt_items: List[dict]) -> AdoptionScore:
    """
    recommended_items: item names recommended to a session (e.g. the
    `item` field of one or more NextCartRecommendation records).
    next_receipt_items: receipt_items rows from a receipt uploaded
    AFTER those recommendations were shown.
    """

    if not recommended_items:
        return AdoptionScore(recommended_count=0, adopted_count=0, adopted_items=[], adoption_score=0.0)

    adopted = [item for item in recommended_items if did_purchase_item(item, next_receipt_items)]

    return AdoptionScore(
        recommended_count=len(recommended_items),
        adopted_count=len(adopted),
        adopted_items=adopted,
        adoption_score=round(len(adopted) / len(recommended_items), 3),
    )
