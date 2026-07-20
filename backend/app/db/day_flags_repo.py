import time
from uuid import uuid4
from datetime import date
from typing import Dict, List, Tuple

from postgrest.exceptions import APIError

from backend.app.db.supabase import supabase, _MISSING_TABLE_CODE, UNDEFINED_COLUMN_CODE

# An unmigrated environment can miss the table entirely OR just a column —
# both mean "no away-day tracking yet", degrade to empty (same tolerant
# pattern as pantry_repo.py).
_MISSING_SCHEMA_CODES = {_MISSING_TABLE_CODE, UNDEFINED_COLUMN_CODE}

_DAY_FLAGS_TABLE = "user_day_flags"
_AWAY_FLAG = "away"

# day_coverage() calls get_away_dates() once per nutrient estimate within
# a single gap-detection pass (6 nutrients, same window every time) — a
# short cache collapses those into one round-trip instead of 6, same
# reasoning as pantry_repo.py's consumption-events cache.
_AWAY_DATES_CACHE_TTL_SECONDS = 5.0
_away_dates_cache: Dict[Tuple[str, str, str], Tuple[float, list]] = {}


def _invalidate_away_dates_cache(user_id: str) -> None:
    for key in [k for k in _away_dates_cache if k[0] == user_id]:
        _away_dates_cache.pop(key, None)


def mark_day_away(user_id: str, day: date) -> None:
    """Idempotent: marking an already-away day again is a no-op (unique
    constraint on user_id/date/flag)."""

    try:
        supabase.table(_DAY_FLAGS_TABLE).upsert(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "date": day.isoformat(),
                "flag": _AWAY_FLAG,
            },
            on_conflict="user_id,date,flag",
        ).execute()
    except APIError as e:
        if e.code not in _MISSING_SCHEMA_CODES:
            raise
        print(f"[db] '{_DAY_FLAGS_TABLE}' not migrated (migration pending?) — away flag not persisted")
    _invalidate_away_dates_cache(user_id)


def unmark_day_away(user_id: str, day: date) -> None:
    try:
        (
            supabase.table(_DAY_FLAGS_TABLE)
            .delete()
            .eq("user_id", user_id)
            .eq("date", day.isoformat())
            .eq("flag", _AWAY_FLAG)
            .execute()
        )
    except APIError as e:
        if e.code not in _MISSING_SCHEMA_CODES:
            raise
        print(f"[db] '{_DAY_FLAGS_TABLE}' not migrated (migration pending?) — nothing to unmark")
    _invalidate_away_dates_cache(user_id)


def get_away_dates(user_id: str, date_from: date, date_to: date) -> List[date]:
    """Every date in [date_from, date_to] (inclusive) this user has
    explicitly flagged away."""

    cache_key = (user_id, date_from.isoformat(), date_to.isoformat())
    cached = _away_dates_cache.get(cache_key)
    if cached is not None and (time.time() - cached[0]) < _AWAY_DATES_CACHE_TTL_SECONDS:
        return cached[1]

    try:
        result = (
            supabase.table(_DAY_FLAGS_TABLE)
            .select("date")
            .eq("user_id", user_id)
            .eq("flag", _AWAY_FLAG)
            .gte("date", date_from.isoformat())
            .lte("date", date_to.isoformat())
            .execute()
        )
    except APIError as e:
        if e.code not in _MISSING_SCHEMA_CODES:
            raise
        print(f"[db] '{_DAY_FLAGS_TABLE}' not migrated (migration pending?) — returning no away days")
        _away_dates_cache[cache_key] = (time.time(), [])
        return []

    dates = [date.fromisoformat(r["date"]) for r in result.data]
    _away_dates_cache[cache_key] = (time.time(), dates)
    return dates
