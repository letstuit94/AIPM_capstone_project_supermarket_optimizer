"""
Session management (Story 8.3 groundwork).

There's no auth in this MVP, so a "session" is just an opaque ID the
client holds and sends back on every request via the X-Session-Id
header — it's what lets receipts, profiles, and recommendations be
grouped and retrieved together (Tasks 8.4/8.5) instead of the nutrition
snapshot silently aggregating every receipt ever uploaded by anyone.
"""

from typing import Optional
from uuid import UUID, uuid4

from fastapi import Header

SESSION_HEADER = "X-Session-Id"


def get_session_id(x_session_id: Optional[str] = Header(default=None, alias=SESSION_HEADER)) -> str:
    """
    FastAPI dependency: reuse the caller's session ID if it sent one and
    it's a valid UUID, otherwise mint a new one.

    The backend never pre-registers session IDs — whichever value is
    used first is retroactively "the session" for whatever gets tagged
    with it. Callers must persist whatever ID comes back in a response
    body and send it on every subsequent request to stay in the same
    session (see the receipts/profile/nutrition/next-cart routers).

    `session_id` columns are typed `uuid` in the database, so a
    malformed header (a buggy client, a stale value, someone poking at
    devtools) would otherwise 500 the request instead of just starting a
    fresh session — this validates rather than trusting it blindly.
    """

    if x_session_id:
        try:
            UUID(x_session_id)
            return x_session_id
        except ValueError:
            pass
    return str(uuid4())
