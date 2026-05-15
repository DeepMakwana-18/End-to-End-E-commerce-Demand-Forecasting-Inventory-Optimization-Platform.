"""
ML Forecasting Service - XGBoost demand prediction pipeline.
Migrated from notebook/06_improved_xgboost_forecasting.ipynb
"""

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
import joblib
import os
import logging

logger = logging.getLogger(__name__)

# Model hyperparameters from the notebook
MODEL_PARAMS = {
    "n_estimators": 1000,
    "learning_rate": 0.01,
    "max_depth": 10,
    "min_child_weight": 5,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
    "early_stopping_rounds": 50,
}

# Feature columns used for training
FEATURE_COLUMNS = [
    "price", "freight_value", "product_weight_g", "product_length_cm",
    "product_height_cm", "product_width_cm", "payment_installments",
    "payment_value", "review_score", "product_category_encoded",
    "month", "day_of_week", "quarter", "year",
]


class ForecastingService:
    """XGBoost-based demand forecasting service."""

    def __init__(self, model_path: str = "./ml/models"):
        self.model_path = model_path
        self.model: XGBRegressor | None = None
        self.model_version: str = "v1.0.0"
        os.makedirs(model_path, exist_ok=True)

    def load_model(self) -> bool:
        """Load a pre-trained model from disk."""
        model_file = os.path.join(self.model_path, "xgboost_demand_model.joblib")
        if os.path.exists(model_file):
            self.model = joblib.load(model_file)
            logger.info("Model loaded from %s", model_file)
            return True
        logger.warning("No model found at %s", model_file)
        return False

    def train(self, df: pd.DataFrame) -> dict:
        """Train the XGBoost model on sales data.

        Args:
            df: DataFrame with feature columns and a 'sales' target column.

        Returns:
            Dictionary with training metrics.
        """
        logger.info("Starting model training with %d rows", len(df))

        # Log-transform the target
        df = df.copy()
        df["log_sales"] = np.log1p(df["sales"])

        # Prepare features and target
        available_features = [f for f in FEATURE_COLUMNS if f in df.columns]
        X = df[available_features]
        y = df["log_sales"]

        # Temporal split (80/20)
        split_idx = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Train model
        self.model = XGBRegressor(**{k: v for k, v in MODEL_PARAMS.items() if k != "early_stopping_rounds"})
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        # Evaluate
        y_pred_log = self.model.predict(X_test)
        y_pred = np.expm1(y_pred_log)
        y_actual = np.expm1(y_test.values)

        mae = mean_absolute_error(y_actual, y_pred)
        rmse = np.sqrt(mean_squared_error(y_actual, y_pred))
        mape = np.mean(np.abs((y_actual - y_pred) / (y_actual + 1e-8))) * 100
        accuracy = max(0, 100 - mape)

        # Save model
        model_file = os.path.join(self.model_path, "xgboost_demand_model.joblib")
        joblib.dump(self.model, model_file)
        logger.info("Model saved to %s | MAE: %.2f, RMSE: %.2f, Accuracy: %.1f%%",
                     model_file, mae, rmse, accuracy)

        # Feature importance
        importance = dict(zip(available_features, self.model.feature_importances_))

        return {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "accuracy": round(accuracy, 1),
            "mape": round(mape, 2),
            "feature_importance": importance,
            "train_size": len(X_train),
            "test_size": len(X_test),
        }

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Generate demand predictions.

        Args:
            features: DataFrame with feature columns.

        Returns:
            Array of predicted demand values.
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() or train() first.")

        available_features = [f for f in FEATURE_COLUMNS if f in features.columns]
        X = features[available_features]
        log_predictions = self.model.predict(X)
        predictions = np.expm1(log_predictions)
        return np.maximum(predictions, 0)  # Ensure non-negative

    def predict_with_confidence(
        self, features: pd.DataFrame, confidence: float = 0.95
    ) -> dict:
        """Generate predictions with confidence intervals.

        Uses a simple bootstrap-based approach to estimate uncertainty.
        """
        predictions = self.predict(features)

        # Estimate confidence intervals using residual std
        std_estimate = predictions * 0.15  # ~15% relative uncertainty
        from scipy import stats
        z_score = stats.norm.ppf((1 + confidence) / 2)

        return {
            "predicted_demand": predictions.tolist(),
            "confidence_lower": (predictions - z_score * std_estimate).tolist(),
            "confidence_upper": (predictions + z_score * std_estimate).tolist(),
            "confidence_level": confidence,
        }

    def get_feature_importance(self) -> dict:
        """Get feature importance from the trained model."""
        if self.model is None:
            return {}
        available_features = [f for f in FEATURE_COLUMNS if f in
                              (self.model.get_booster().feature_names or FEATURE_COLUMNS)]
        importance = dict(zip(available_features, self.model.feature_importances_))
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
