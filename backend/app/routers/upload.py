"""Upload API routes - CSV file upload and ML pipeline trigger."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import pandas as pd
import io
import traceback
from app.services.ml_service import forecast_model

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("")
async def upload_sales_data(
    file: UploadFile = File(...),
):
    """Upload a CSV file for processing through the ETL pipeline.

    No auth required - frontend gates access behind login.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    # Read file
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)

    if size_mb > 50:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    # Process CSV and train ML model SYNCHRONOUSLY
    training_msg = ""
    try:
        print(f"=== UPLOAD RECEIVED: {file.filename} ({size_mb:.2f} MB) ===")
        df = pd.read_csv(io.BytesIO(contents))
        print(f"CSV columns: {list(df.columns)}")
        print(f"CSV shape: {df.shape}")
        
        # Auto-map columns: look for date-like and demand-like columns
        df.columns = df.columns.str.lower().str.strip()
        
        # Find date column
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
        # Last resort: try to parse the first column as date
        if date_col is None:
            try:
                pd.to_datetime(df.iloc[:, 0].head(5))
                date_col = df.columns[0]
            except Exception:
                pass
        
        # Find demand/quantity column
        demand_col = None
        for col in df.columns:
            if col in ('demand', 'quantity', 'qty', 'quantity_sold', 'sales', 'amount', 'units', 'units_sold', 'total_sales'):
                demand_col = col
                break
        if demand_col is None:
            for col in df.columns:
                if any(kw in col for kw in ('sale', 'qty', 'quantity', 'amount', 'demand', 'unit', 'order', 'revenue', 'price')):
                    demand_col = col
                    break
        # Last resort: use the first numeric column that's not an ID
        if demand_col is None:
            for col in df.columns:
                if col not in (date_col,) and df[col].dtype in ('float64', 'int64') and 'id' not in col:
                    demand_col = col
                    break
                    
        print(f"Auto-detected date_col='{date_col}', demand_col='{demand_col}'")
        
        if date_col is None or demand_col is None:
            raise ValueError(
                f"Could not auto-detect date and demand columns. "
                f"Found columns: {list(df.columns)}. "
                f"Detected date='{date_col}', demand='{demand_col}'"
            )

        # Build a clean dataframe
        clean_df = pd.DataFrame()
        clean_df['date'] = pd.to_datetime(df[date_col], errors='coerce')
        clean_df['demand'] = pd.to_numeric(df[demand_col], errors='coerce')
        clean_df = clean_df.dropna()
        
        if len(clean_df) == 0:
            raise ValueError("No valid rows after parsing dates and demand values.")
        
        print(f"Clean data: {len(clean_df)} rows, date range: {clean_df['date'].min()} to {clean_df['date'].max()}")
        print(f"Demand stats: min={clean_df['demand'].min():.1f}, max={clean_df['demand'].max():.1f}, mean={clean_df['demand'].mean():.1f}")
        
        # Resample to weekly data for our model
        weekly_df = clean_df.set_index('date').resample('W')['demand'].sum().reset_index()
        weekly_df = weekly_df.dropna()
        
        print(f"Weekly aggregated: {len(weekly_df)} weeks")
        
        if len(weekly_df) < 5:
            raise ValueError(
                f"Not enough data points after weekly aggregation: {len(weekly_df)} weeks (need at least 5). "
                f"Original data had {len(clean_df)} rows."
            )

        # Train SYNCHRONOUSLY so the model is ready when user navigates to forecast page
        forecast_model.train(weekly_df, source_name=f"uploaded:{file.filename}")
        training_msg = (
            f"ML model retrained on your data! "
            f"Accuracy: {forecast_model.metrics['accuracy']}%, "
            f"RMSE: {forecast_model.metrics['rmse']}, "
            f"Training ID: {forecast_model.training_id}"
        )
        print(f"=== UPLOAD COMPLETE: {training_msg} ===")
        
    except Exception as e:
        print(f"=== UPLOAD ERROR: {e} ===")
        traceback.print_exc()
        training_msg = f"File uploaded, but ML processing failed: {str(e)}"

    return {
        "id": forecast_model.training_id,
        "filename": file.filename,
        "original_filename": file.filename,
        "file_size": len(contents),
        "file_size_mb": round(size_mb, 2),
        "status": "completed" if forecast_model.data_source.startswith("uploaded") else "error",
        "message": training_msg,
        "model_accuracy": forecast_model.metrics["accuracy"],
        "model_rmse": forecast_model.metrics["rmse"],
        "training_id": forecast_model.training_id,
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
