from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.utils.email import send_alert_email

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

class AlertPayload(BaseModel):
    sku: str
    message: str
    date: str

@router.post("/send-email")
async def trigger_email_alert(payload: AlertPayload, background_tasks: BackgroundTasks):
    """
    Triggers a background task to send an email alert.
    Returns immediately so the frontend UI doesn't freeze.
    """
    try:
        # Schedule the email to be sent in the background
        background_tasks.add_task(
            send_alert_email,
            sku=payload.sku,
            message=payload.message,
            date=payload.date
        )
        return {"status": "success", "message": "Email alert queued for background dispatch."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
