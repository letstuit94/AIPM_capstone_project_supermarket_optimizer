"""
Manual test for Tasks 8.6/8.7/8.8 (v2 groundwork): receipt comparison,
nutrition delta, and adoption scoring. No server needed; the comparator
and delta calculator are pure functions, tested offline here.

Usage (run from the repo root):
    python -m backend.app.scripts.test_adoption
"""

from backend.app.analytics.comparator import compare_receipts, did_purchase_item
from backend.app.analytics.nutrition_delta import compute_nutrition_delta
from backend.app.analytics.adoption_score import compute_adoption_score
from backend.app.models.snapshot import NutritionProfile

RECEIPT_N = [
    {"normalized_name": "Vollmilch"},
    {"normalized_name": "Vollkornbrot"},
    {"normalized_name": "Bananen"},
]

RECEIPT_N_PLUS_1 = [
    {"normalized_name": "Vollmilch"},
    {"normalized_name": "Rote Linsen"},  # the recommended item, now purchased
    {"normalized_name": "Bananen"},
    {"normalized_name": "Eier"},
]


def main():
    print("=== Task 8.6: Receipt Comparison ===")
    comparison = compare_receipts(RECEIPT_N, RECEIPT_N_PLUS_1)
    print(comparison.model_dump())
    assert comparison.items_a == 3 and comparison.items_b == 4
    assert "vollmilch" in comparison.matched_items and "bananen" in comparison.matched_items
    assert 0.0 < comparison.overlap_score < 1.0

    print("\n=== did_purchase_item ===")
    print("bought 'Rote Linsen'?", did_purchase_item("Rote Linsen", RECEIPT_N_PLUS_1))
    print("bought 'Tofu'?", did_purchase_item("Tofu", RECEIPT_N_PLUS_1))
    assert did_purchase_item("Rote Linsen", RECEIPT_N_PLUS_1) is True
    assert did_purchase_item("Tofu", RECEIPT_N_PLUS_1) is False

    print("\n=== Task 8.8: Adoption Scoring ===")
    score = compute_adoption_score(["Rote Linsen", "Tofu"], RECEIPT_N_PLUS_1)
    print(score.model_dump())
    assert score.recommended_count == 2
    assert score.adopted_count == 1
    assert score.adoption_score == 0.5

    print("\n=== Task 8.8: empty recommendations -> 0, no crash ===")
    empty_score = compute_adoption_score([], RECEIPT_N_PLUS_1)
    print(empty_score.model_dump())
    assert empty_score.adoption_score == 0.0

    print("\n=== Task 8.7: Nutrition Delta ===")
    before = NutritionProfile(
        total_calories_kcal=2000, total_grams=1000,
        fiber_per_1000kcal=8.0, protein_per_1000kcal=20.0,
        sugar_pct_energy=15.0, processed_avg=3.0,
        items_total=3, items_with_nutrition=3, items_matched=3, items_fallback=0,
    )
    after = NutritionProfile(
        total_calories_kcal=3500, total_grams=1800,
        fiber_per_1000kcal=14.0, protein_per_1000kcal=22.0,
        sugar_pct_energy=10.0, processed_avg=2.5,
        items_total=7, items_with_nutrition=7, items_matched=6, items_fallback=1,
    )
    delta = compute_nutrition_delta(before, after)
    for d in delta.deltas:
        print(d.model_dump())

    fiber = next(d for d in delta.deltas if d.dimension == "fiber")
    sugar = next(d for d in delta.deltas if d.dimension == "sugar")
    assert fiber.direction == "up" and fiber.change == 6.0
    assert sugar.direction == "down" and sugar.change == -5.0

    print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
