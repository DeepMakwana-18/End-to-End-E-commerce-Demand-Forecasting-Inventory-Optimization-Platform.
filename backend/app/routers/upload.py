"""Upload API routes — CSV file upload with DB persistence and ML pipeline trigger.

Pipeline:
  POST /upload/detect  -> read headers, score confidence, suggest mapping (no persistence)
  POST /upload         -> queue Celery retraining task with optional column hints
  GET  /upload/history -> list past upload records
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models import UploadedFile
from app.repositories.upload_repo import UploadRepository
from app.services.schema_mapper import detect_columns, parse_headers

router = APIRouter(prefix="/upload", tags=["Upload"])


# ---------------------------------------------------------------------------
# POST /upload/detect  — lightweight header inspection (no file stored)
# ---------------------------------------------------------------------------

@router.post("/detect")
async def detect_schema(
    file: UploadFile = File(...),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Read CSV headers and return auto-detected column mapping with confidence score.

    Reads only the first 8 KB of the file. Nothing is persisted.
    The client uses the result to decide whether to show the mapping panel.

    Returns:
        detected_columns: list of CSV header names
        suggested_mapping: { date, demand } best-guess column names (or null)
        confidence: "high" (both found) | "low" (one or both missing)
        mapping: full canonical -> csv_column mapping for all known fields
        missing_required: list of required canonical fields that could not be mapped
    """
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    chunk = await file.read(8192)
    try:
        header_text = chunk.decode("utf-8", errors="replace")
    except Exception:
        header_text = chunk.decode("latin-1", errors="replace")

    first_line = header_text.split("\n")[0].strip()
    if not first_line or "," not in first_line:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File does not appear to be a valid comma-separated CSV.",
        )

    columns = parse_headers(first_line)
    if not columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse CSV headers.",
        )

    detection = detect_columns(columns)
    return {"detected_columns": columns, **detection}


# ---------------------------------------------------------------------------
# POST /upload  — queue retraining task (with optional column hints)
# ---------------------------------------------------------------------------

@router.post("")
async def upload_sales_data(
    file: UploadFile = File(...),
    date_column: Optional[str] = Form(None),
    demand_column: Optional[str] = Form(None),
    mappings: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Upload a CSV file for processing through the ETL pipeline.

    Optional form fields:
        date_column   — user-confirmed date column name (skips auto-detection)
        demand_column — user-confirmed demand column name (skips auto-detection)

    When column hints are omitted the Celery task falls back to auto-detection.
    """
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

    # Decode CSV bytes
    try:
        csv_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_text = contents.decode("latin-1")
        except Exception:
            upload_record.status = "failed"
            upload_record.error_message = "Unsupported CSV encoding. Use UTF-8 or Latin-1."
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported CSV encoding. Please save the file as UTF-8.",
            )

    # Quick sanity check
    first_line = csv_text.split("\n")[0] if csv_text else ""
    if not first_line.strip() or "," not in first_line:
        upload_record.status = "failed"
        upload_record.error_message = "File does not appear to be a valid comma-separated CSV."
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File does not appear to be a valid comma-separated CSV.",
        )

    # Resolve column mapping — use user hints if provided, else auto-detect
    resolved_date_col = date_column or None
    resolved_demand_col = demand_column or None

    if not resolved_date_col or not resolved_demand_col:
        headers = parse_headers(first_line)
        detection = detect_columns(headers)
        if not resolved_date_col:
            resolved_date_col = detection["date_column"]
        if not resolved_demand_col:
            resolved_demand_col = detection["demand_column"]

        if not resolved_date_col:
            upload_record.status = "failed"
            upload_record.error_message = (
                f"Missing required field: Date. "
                f"Could not find a date/timestamp column in: {headers}. "
                f"Please map it manually."
            )
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=upload_record.error_message,
            )

        if not resolved_demand_col:
            upload_record.status = "failed"
            upload_record.error_message = (
                f"No quantity/demand column detected. "
                f"Could not find a quantity or sales column in: {headers}. "
                f"Please map it manually."
            )
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=upload_record.error_message,
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
                "date_column": resolved_date_col,
                "demand_column": resolved_demand_col,
                "mappings": mappings,
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
        "date_column": resolved_date_col,
        "demand_column": resolved_demand_col,
        "message": (
            "File received. Model retraining queued — "
            f"poll GET /api/v1/tasks/{task.id} for progress."
        ),
        "created_at": upload_record.created_at.isoformat() if upload_record.created_at else None,
    }


# ---------------------------------------------------------------------------
# GET /upload/history
# ---------------------------------------------------------------------------

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
