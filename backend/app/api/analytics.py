from fastapi import APIRouter, HTTPException, Depends

from backend.app.services.session import get_session_id
from backend.app.services.adoption import compute_session_adoption, compute_session_nutrition_delta

router = APIRouter()


@router.get("/adoption-score")
def adoption_score(session_id: str = Depends(get_session_id)):
    """
    Task 8.8 (v2 groundwork): what fraction of this session's Next Cart
    recommendations were actually purchased in a later receipt. 0 for a
    session with no "recommended"-status recommendations yet, rather
    than an error — this is an observational metric, not a required step.
    """

    score = compute_session_adoption(session_id)
    return {"session_id": session_id, **score.model_dump()}


@router.get("/nutrition/delta")
def nutrition_delta(session_id: str = Depends(get_session_id)):
    """
    Task 8.7 (v2 groundwork): how this session's nutrition profile
    changed between its first receipt and its current (all-receipts)
    snapshot — "fiber up, sugar down" made concrete.
    """

    try:
        delta = compute_session_nutrition_delta(session_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"session_id": session_id, **delta.model_dump()}
