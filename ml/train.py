"""
ML Model Training Script.
Run: python -m ml.train --data-dir ./data/raw
"""

import argparse
import logging
import sys
from pathlib import Path

from ml.pipelines.data_preprocessing import load_olist_data, clean_data
from ml.pipelines.feature_engineering import prepare_features
from ml.pipelines.forecasting import ForecastingService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Train the XGBoost demand forecasting model")
    parser.add_argument("--data-dir", type=str, default="./data/raw", help="Path to raw data directory")
    parser.add_argument("--model-dir", type=str, default="./ml/models", help="Path to save trained model")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("DemandForecaster - ML Model Training Pipeline")
    logger.info("=" * 60)

    # Step 1: Load data
    logger.info("Step 1: Loading data from %s", args.data_dir)
    try:
        raw_df = load_olist_data(args.data_dir)
    except FileNotFoundError as e:
        logger.error("Data loading failed: %s", e)
        sys.exit(1)

    # Step 2: Clean data
    logger.info("Step 2: Cleaning data")
    clean_df = clean_data(raw_df)

    # Step 3: Feature engineering
    logger.info("Step 3: Feature engineering")
    featured_df, encoders = prepare_features(
        clean_df,
        date_col="date",
        target_col="sales",
        category_cols=["product_category_name"],
    )

    # Step 4: Train model
    logger.info("Step 4: Training XGBoost model")
    forecaster = ForecastingService(model_path=args.model_dir)
    metrics = forecaster.train(featured_df)

    # Step 5: Report results
    logger.info("=" * 60)
    logger.info("Training Complete!")
    logger.info("  Accuracy: %.1f%%", metrics["accuracy"])
    logger.info("  MAE:      %.2f", metrics["mae"])
    logger.info("  RMSE:     %.2f", metrics["rmse"])
    logger.info("  MAPE:     %.2f%%", metrics["mape"])
    logger.info("  Train:    %d samples", metrics["train_size"])
    logger.info("  Test:     %d samples", metrics["test_size"])
    logger.info("-" * 40)
    logger.info("Feature Importance:")
    for feat, imp in sorted(metrics["feature_importance"].items(), key=lambda x: -x[1])[:10]:
        logger.info("  %-30s %.4f", feat, imp)
    logger.info("=" * 60)
    logger.info("Model saved to %s", args.model_dir)


if __name__ == "__main__":
    main()
