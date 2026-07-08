from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends

from backend.app.services.session import get_session_id
from backend.app.db.supabase import create_profile_row, get_profile, delete_profile
from backend.app.models.profile import ProfileCreate

router = APIRouter()


@router.post("/profile")
def create_profile(profile: ProfileCreate, session_id: str = Depends(get_session_id)):
    """
    Create a lightweight user profile (Story 3.1).

    Only the 4 required fields (goal, age range, activity level, dietary
    pattern) plus optional exclusions are accepted — schema validation
    itself enforces the <=5 question budget. Dietary pattern and
    exclusions (Story 3.2) are stored as-is for later use by the
    exclusion filter (Task 3.3) and, eventually, the recommender (Epic 5).

    Tagged with `session_id` (Story 8.3) for consistency with receipts;
    nothing currently looks profiles up by session, but this keeps the
    door open without needing a schema change later.
    """

    profile_id = str(uuid4())
    fields = profile.model_dump()
    create_profile_row(profile_id, {**fields, "session_id": session_id})

    return {"profile_id": profile_id, "session_id": session_id, **fields}


@router.get("/profile/{profile_id}")
def read_profile(profile_id: str):
    """Fetch a stored profile, e.g. to reuse across a session."""

    row = get_profile(profile_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return row


@router.delete("/profile/{profile_id}")
def erase_profile(profile_id: str, session_id: str = Depends(get_session_id)):
    """
    Permanently delete a profile (GDPR user-initiated erasure, Story 7.3).
    Hard delete, on request — no broader auth system exists to hang an
    automatic TTL off of.

    Restricted to the session that created the profile (bug fix: this
    used to delete by profile_id alone, so anyone who obtained an ID
    could erase another session's profile). A row with no session_id on
    record (pre-migration environment) is treated as unowned and still
    deletable, matching this codebase's other migration-window safety nets.
    """

    row = get_profile(profile_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found.")

    owner_session_id = row.get("session_id")
    if owner_session_id is not None and owner_session_id != session_id:
        raise HTTPException(status_code=403, detail="This profile belongs to a different session.")

    delete_profile(profile_id)
    return {"profile_id": profile_id, "deleted": True}
