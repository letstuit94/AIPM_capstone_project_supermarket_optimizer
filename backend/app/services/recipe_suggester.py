"""
Recipe suggestions (MVP summary point 5 / Should Have): "Up to 3 matching
recipes for the recommended product."

A static, curated lookup keyed by the Next Cart item's exact name — the
same shape as Task 5.1's recommendation table (`data/recommendations.json`),
not a live external API or an LLM call. This keeps the same "no invented
facts" guarantee the rest of the recommendation pipeline relies on: a
recipe either exists in the table for this exact item, or none are
returned, rather than fabricating a plausible-sounding one or a fake URL.
"""

import json
from pathlib import Path
from typing import List, Optional

from backend.app.models.next_cart import Recipe

_RECIPES_PATH = Path(__file__).resolve().parents[1] / "data" / "recipes.json"


def _load_recipes() -> dict:
    """
    Bug fix: this used to have no error handling, and since it runs at
    import time (below), a missing/corrupted recipes.json would crash
    the entire app at startup — every route, not just recipe
    suggestions. A "should-have" garnish feature shouldn't be able to
    take down receipt upload; degrade to no recipes instead.
    """

    try:
        return json.loads(_RECIPES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"[recipe_suggester] could not load recipes.json, recipe suggestions disabled: {e}")
        return {}


# Loaded once at import time: the table is static data, not a live resource.
RECIPES = _load_recipes()


def suggest_recipes(item: Optional[str], limit: int = 3) -> List[Recipe]:
    """Up to `limit` recipes for `item`; empty if none are known or item is None."""

    if not item:
        return []
    return [Recipe.model_validate(r) for r in RECIPES.get(item, [])[:limit]]
