"""Copilot Pydantic schemas — request/response types for the AI Supply Chain Analyst."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ── Intent types ──────────────────────────────────────────────────────

CopilotIntent = Literal[
    "executive_summary",
    "forecast",
    "forecast_explain",
    "anomaly",
    "alert",
    "inventory",
    "scenario",
    "unknown",
]


# ── Request ───────────────────────────────────────────────────────────


class CopilotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500, description="User's natural language query")
    context: dict[str, Any] | None = Field(
        default=None,
        description="Optional page context (e.g., current page, selected scenario_id)",
    )


# ── Response ──────────────────────────────────────────────────────────


class CopilotResponse(BaseModel):
    intent: CopilotIntent = Field(..., description="Classified intent of the query")
    response: str = Field(..., description="Natural language analyst response")
    data: dict[str, Any] | None = Field(default=None, description="Structured data payload for UI rendering")
    suggested_followups: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions relevant to the response",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Classification confidence (1.0 = deterministic keyword match)",
    )
