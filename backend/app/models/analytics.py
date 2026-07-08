from typing import List, Optional

from pydantic import BaseModel, Field


class ReceiptComparison(BaseModel):
    """
    Output of the Receipt Comparison Engine (Task 8.6, v2).

    Compares two receipts' item lists — the building block for adoption
    scoring (Task 8.8): did an item recommended after receipt N actually
    show up in receipt N+1?
    """

    items_a: int
    items_b: int
    matched_items: List[str] = Field(default_factory=list)
    overlap_score: float = Field(ge=0.0, le=1.0)


class DimensionDelta(BaseModel):
    """Change in one nutrition dimension between two profiles (Task 8.7)."""

    dimension: str
    before: Optional[float] = None
    after: Optional[float] = None
    change: Optional[float] = None
    direction: str  # "up" | "down" | "flat" | "unknown"


class NutritionDelta(BaseModel):
    """Full Task 8.7 output: per-dimension change between two nutrition profiles."""

    deltas: List[DimensionDelta]


class AdoptionScore(BaseModel):
    """
    Output of the Adoption Scoring Algorithm (Task 8.8, v2).

    What fraction of a session's recommended items were actually
    purchased in a later receipt — the MVP's core hypothesis metric.
    """

    recommended_count: int
    adopted_count: int
    adopted_items: List[str] = Field(default_factory=list)
    adoption_score: float = Field(ge=0.0, le=1.0)
