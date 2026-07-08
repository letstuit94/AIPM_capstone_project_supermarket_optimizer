from fastapi import APIRouter, HTTPException, Depends

from backend.app.services.session import get_session_id
from backend.app.services.nutrition_snapshot import build_snapshot_from_db

router = APIRouter()


@router.get("/nutrition/snapshot")
def nutrition_snapshot(session_id: str = Depends(get_session_id)):
    """
    Aggregated nutrition snapshot + top gaps across this session's saved
    receipts (Epic 4, scoped per Story 8.3). Density-based, rule-driven,
    with a confidence label and the "estimated, not actual intake"
    disclaimer.
    """

    snapshot = build_snapshot_from_db(session_id)
    if snapshot.items_analyzed == 0:
        raise HTTPException(
            status_code=409,
            detail="No receipt items found to analyse. Upload a receipt first.",
        )
    return {"session_id": session_id, **snapshot.model_dump()}
