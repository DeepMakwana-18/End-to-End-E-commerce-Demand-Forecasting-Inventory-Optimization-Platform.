"""Upload API routes — CSV file upload with DB persistence and ML pipeline trigger."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models import UploadedFile
from app.repositories.upload_repo import UploadRepository

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("")
async def upload_sales_data(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Upload a CSV file for processing through the ETL pipeline."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions to upload data")

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)

    if size_mb > 50:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    # Create upload record
    upload_repo = UploadRepository(db, tenant.org_id)
    upload_record = UploadedFile(
        organization_id=tenant.org_id,
        user_id=tenant.user_id,
        filename=file.filename,
        original_filename=file.filename,
        file_size=len(contents),
        status="processing",
    )
    upload_record = await upload_repo.create(upload_record)

    # Decode CSV bytes — try UTF-8 then fall back to latin-1
    try:
        csv_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        csv_text = contents.decode("latin-1")

    # Quick sanity check: confirm file looks like a CSV (header row present)
    first_line = csv_text.split("\n")[0] if csv_text else ""
    if not first_line.strip() or "," not in first_line:
        upload_record.status = "failed"
        upload_record.error_message = "File does not appear to be a valid comma-separated CSV."
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File does not appear to be a valid comma-separated CSV.",
        )

    # Dispatch retraining to Celery — non-blocking
    try:
        from app.tasks.retraining_tasks import retrain_model_async
        task = retrain_model_async.apply_async(
            kwargs={
                "org_id": tenant.org_id,
                "user_id": tenant.user_id,
                "csv_text": csv_text,
                "filename": file.filename,
                "upload_record_id": upload_record.id,
            }
        )
    except Exception as e:
        upload_record.status = "failed"
        upload_record.error_message = f"Failed to queue retraining task: {e}"
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Could not queue retraining: {e}")

    upload_record.status = "queued"
    await db.flush()
    await db.refresh(upload_record)

    return {
        "id": upload_record.id,
        "filename": file.filename,
        "original_filename": file.filename,
        "file_size": len(contents),
        "file_size_mb": round(size_mb, 2),
        "status": "queued",
        "task_id": task.id,
        "message": (
            "File received. Model retraining queued — "
            f"poll GET /api/v1/tasks/{task.id} for progress."
        ),
        "created_at": upload_record.created_at.isoformat() if upload_record.created_at else None,
    }


@router.get("/history")
async def get_upload_history(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get upload history from database."""
    repo = UploadRepository(db, tenant.org_id)
    uploads = await repo.get_history(limit=20)

    result = []
    for u in uploads:
        result.append({
            "id": u.id,
            "filename": u.original_filename,
            "rows_processed": u.rows_processed,
            "status": u.status,
            "date": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
            "size": f"{(u.file_size or 0) / (1024 * 1024):.1f} MB" if u.file_size else "N/A",
        })

    return {"uploads": result, "total": len(result)}
