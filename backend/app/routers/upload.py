"""Upload API routes — CSV file upload with DB persistence and ML pipeline trigger."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import pandas as pd
import io
import traceback

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models import UploadedFile
from app.repositories.upload_repo import UploadRepository
from app.services.ml_service import forecast_model

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

    # Process CSV and train ML model
    training_msg = ""
    try:
        df = pd.read_csv(io.BytesIO(contents))
        upload_record.columns_detected = {"columns": list(df.columns), "rows": len(df)}

        # Auto-map columns
        df.columns = df.columns.str.lower().str.strip()

        date_col = None
        for col in df.columns:
            if col in ('date', 'order_date', 'transaction_date', 'sale_date', 'timestamp'):
                date_col = col
                break
        if date_col is None:
            for col in df.columns:
                if 'date' in col or 'time' in col:
                    date_col = col
                    break
        if date_col is None:
            try:
                pd.to_datetime(df.iloc[:, 0].head(5))
                date_col = df.columns[0]
            except Exception:
                pass

        demand_col = None
        for col in df.columns:
            if col in ('demand', 'quantity', 'qty', 'quantity_sold', 'sales', 'amount',
                        'units', 'units_sold', 'total_sales'):
                demand_col = col
                break
        if demand_col is None:
            for col in df.columns:
                if any(kw in col for kw in ('sale', 'qty', 'quantity', 'amount', 'demand',
                                             'unit', 'order', 'revenue', 'price')):
                    demand_col = col
                    break
        if demand_col is None:
            for col in df.columns:
                if col not in (date_col,) and df[col].dtype in ('float64', 'int64') and 'id' not in col:
                    demand_col = col
                    break

        if date_col is None or demand_col is None:
            raise ValueError(
                f"Could not auto-detect date and demand columns. "
                f"Found columns: {list(df.columns)}."
            )

        clean_df = pd.DataFrame()
        clean_df['date'] = pd.to_datetime(df[date_col], errors='coerce')
        clean_df['demand'] = pd.to_numeric(df[demand_col], errors='coerce')
        clean_df = clean_df.dropna()

        if len(clean_df) == 0:
            raise ValueError("No valid rows after parsing dates and demand values.")

        weekly_df = clean_df.set_index('date').resample('W')['demand'].sum().reset_index()
        weekly_df = weekly_df.dropna()

        if len(weekly_df) < 5:
            raise ValueError(f"Not enough data: {len(weekly_df)} weeks (need at least 5).")

        # Train model
        forecast_model.train(weekly_df, source_name=f"uploaded:{file.filename}")

        upload_record.rows_processed = len(df)
        upload_record.status = "completed"
        training_msg = (
            f"ML model retrained! "
            f"Accuracy: {forecast_model.metrics['accuracy']}%, "
            f"RMSE: {forecast_model.metrics['rmse']}"
        )

    except Exception as e:
        traceback.print_exc()
        upload_record.status = "failed"
        upload_record.error_message = str(e)
        training_msg = f"File uploaded, but ML processing failed: {str(e)}"

    await db.flush()
    await db.refresh(upload_record)

    return {
        "id": upload_record.id,
        "filename": file.filename,
        "original_filename": file.filename,
        "file_size": len(contents),
        "file_size_mb": round(size_mb, 2),
        "status": upload_record.status,
        "message": training_msg,
        "model_accuracy": forecast_model.metrics.get("accuracy", 0),
        "model_rmse": forecast_model.metrics.get("rmse", 0),
        "training_id": forecast_model.training_id,
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
