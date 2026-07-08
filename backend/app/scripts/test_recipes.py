"""
Manual test for recipe suggestions (MVP summary point 5, no server / DB
needed).

Confirms every item in the Task 5.1 recommendation table has a recipe
match (so no Next Cart item silently comes back with zero recipes), and
that an unknown item / no item both return an empty list rather than
raising.

Usage (run from the repo root):
    python -m backend.app.scripts.test_recipes
"""

import json

from backend.app.services.recommender import RECOMMENDATIONS
from backend.app.services.recipe_suggester import suggest_recipes

def main():
    items = sorted({c["item"] for candidates in RECOMMENDATIONS.values() for c in candidates})

    missing = []
    for item in items:
        recipes = suggest_recipes(item)
        status = f"{len(recipes)} recipe(s)" if recipes else "MISSING"
        if not recipes:
            missing.append(item)
        print(f"{status:>12}  {item}")

    print()
    print(json.dumps([r.model_dump() for r in suggest_recipes(items[0])], indent=2, ensure_ascii=False))

    assert suggest_recipes(None) == []
    assert suggest_recipes("Not a real item") == []
    assert suggest_recipes(items[0], limit=1).__len__() == 1

    if missing:
        raise SystemExit(f"\n{len(missing)} recommendation item(s) have no recipes: {missing}")
    print(f"\nAll {len(items)} recommendation items have at least one recipe.")


if __name__ == "__main__":
    main()
