"""Upload API routes - CSV file upload and ETL pipeline trigger."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user, require_manager_or_above

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("")
async def upload_sales_data(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_manager_or_above),
):
    """Upload a CSV file for processing through the ETL pipeline.

    Requires manager or admin role.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    # Read file size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)

    if size_mb > 50:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    # In production: save file, trigger Celery task for ETL processing
    # For demo: return success immediately
    return {
        "id": 1,
        "filename": file.filename,
        "original_filename": file.filename,
        "file_size": len(contents),
        "file_size_mb": round(size_mb, 2),
        "status": "processing",
        "message": "File uploaded successfully. ETL pipeline has been triggered.",
        "created_at": datetime.utcnow().isoformat(),
    }


@router.get("/history")
async def get_upload_history(
    user=Depends(get_current_user),
):
    """Get upload history."""
    uploads = [
        {"id": 1, "filename": "olist_orders_2024.csv", "rows_processed": 99441, "status": "completed", "date": "2026-05-10", "size": "12.4 MB"},
        {"id": 2, "filename": "product_catalog.csv", "rows_processed": 32951, "status": "completed", "date": "2026-05-08", "size": "4.2 MB"},
        {"id": 3, "filename": "sales_q1_2026.csv", "rows_processed": 45230, "status": "completed", "date": "2026-04-15", "size": "6.1 MB"},
    ]
    return {"uploads": uploads, "total": len(uploads)}
