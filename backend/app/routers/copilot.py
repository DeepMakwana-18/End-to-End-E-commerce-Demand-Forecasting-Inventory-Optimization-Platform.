"""AI Supply Chain Analyst Copilot — FastAPI router.

POST /api/v1/copilot/chat  — send a message, receive an analyst response
GET  /api/v1/copilot/prompts — suggested starter prompts

Auth: standard JWT bearer (all users — viewer and above).
Tenant: scoped to the JWT org_id.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.schemas.copilot import CopilotRequest, CopilotResponse
from app.services.copilot_service import process_copilot_message

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])


# ── Starter prompts ─────────────────────────────────────────────────


STARTER_PROMPTS: list[dict[str, str]] = [
    {
        "category": "overview",
        "label": "Executive Summary",
        "prompt": "Give me an executive summary of our supply chain health",
        "icon": "📋",
    },
    {
        "category": "forecast",
        "label": "12-Week Forecast",
        "prompt": "What does the 12-week demand forecast look like?",
        "icon": "📊",
    },
    {
        "category": "forecast_explain",
        "label": "Explain Forecast",
        "prompt": "Why is the model predicting these demand levels? Explain the key drivers.",
        "icon": "💡",
    },
    {
        "category": "anomaly",
        "label": "Anomaly Report",
        "prompt": "What demand anomalies have been detected recently?",
        "icon": "🔍",
    },
    {
        "category": "alert",
        "label": "Active Alerts",
        "prompt": "Show me all active alerts and their severity",
        "icon": "🔔",
    },
    {
        "category": "inventory",
        "label": "Inventory Health",
        "prompt": "Which inventory items need reordering right now?",
        "icon": "📦",
    },
    {
        "category": "scenario",
        "label": "Scenario Analysis",
        "prompt": "What what-if scenarios have been run and what were the results?",
        "icon": "🎯",
    },
]


# ── Endpoints ────────────────────────────────────────────────────────


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(
    request: CopilotRequest,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> CopilotResponse:
    """Send a natural language query to the AI Supply Chain Analyst.

    The analyst classifies intent deterministically and fetches live data
    from the platform's existing engines to generate a structured response.

    Supports queries about:
      - Executive summary (all modules aggregated)
      - Demand forecasts (12-week outlook)
      - Forecast explainability (SHAP feature drivers)
      - Anomaly detection results
      - Alert summaries
      - Inventory health and reorder recommendations
      - Scenario simulation results

    All responses are scoped to the authenticated user's organization.
    """
    return await process_copilot_message(
        message=request.message,
        db=db,
        org_id=tenant.org_id,
        context=request.context,
    )


@router.get("/prompts")
async def get_starter_prompts(
    _tenant: TenantContext = Depends(get_tenant_context),
) -> dict:
    """Get suggested starter prompts for the AI Copilot."""
    return {"prompts": STARTER_PROMPTS}
