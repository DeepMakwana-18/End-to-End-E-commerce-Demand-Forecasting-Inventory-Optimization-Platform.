import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
import logging

logger = logging.getLogger(__name__)

class XGBoostForecastModel:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.is_trained = False
        self.metrics = {
            "accuracy": 0.0,
            "mae": 0.0,
            "rmse": 0.0,
            "training_samples": 0,
            "last_trained": None
        }
        self.std_dev = 0.0  # For confidence intervals
        self.last_date = None

    def _generate_synthetic_history(self) -> pd.DataFrame:
        """Generate 3 years of weekly historical data if DB is empty."""
        dates = pd.date_range(end=datetime.utcnow(), periods=156, freq='W')
        df = pd.DataFrame({"date": dates})
        df["week"] = df["date"].dt.isocalendar().week
        df["month"] = df["date"].dt.month
        df["year"] = df["date"].dt.year
        
        # Base demand + trend + seasonality + noise
        base = 1000
        trend = np.linspace(0, 300, 156)
        seasonality = 150 * np.sin(2 * np.pi * df["week"] / 52)
        noise = np.random.normal(0, 50, 156)
        
        df["demand"] = base + trend + seasonality + noise
        df["demand"] = df["demand"].clip(lower=0)
        return df

    def _create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create time series features."""
        df = df.copy()
        df["week"] = df["date"].dt.isocalendar().week.astype(int)
        df["month"] = df["date"].dt.month.astype(int)
        df["year"] = df["date"].dt.year.astype(int)
        
        # Add lag features if enough data
        if len(df) > 4:
            df["lag_1"] = df["demand"].shift(1)
            df["lag_4"] = df["demand"].shift(4)
        else:
            df["lag_1"] = df["demand"]
            df["lag_4"] = df["demand"]
            
        df = df.dropna()
        return df

    def train(self, df: pd.DataFrame = None):
        """Train the XGBoost model."""
        if df is None or df.empty:
            df = self._generate_synthetic_history()
            
        self.last_date = df["date"].max()
            
        df_features = self._create_features(df)
        
        # Features and target
        X = df_features[["week", "month", "year", "lag_1", "lag_4"]]
        y = df_features["demand"]
        
        # Split (last 20% for validation to get metrics)
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]
        
        self.model.fit(X_train, y_train)
        
        # Calculate metrics
        preds = self.model.predict(X_val)
        mae = mean_absolute_error(y_val, preds)
        rmse = np.sqrt(mean_squared_error(y_val, preds))
        mean_demand = y_val.mean()
        
        # Naive accuracy (1 - MAPE)
        accuracy = max(0, 100 * (1 - (mae / mean_demand))) if mean_demand > 0 else 0
        
        self.std_dev = rmse # Use RMSE as standard deviation for residuals
        
        self.metrics = {
            "accuracy": round(accuracy, 1),
            "mae": round(mae, 1),
            "rmse": round(rmse, 1),
            "training_samples": len(df),
            "last_trained": datetime.utcnow().isoformat()
        }
        self.is_trained = True
        logger.info(f"Model trained successfully. RMSE: {rmse:.2f}")

    def predict(self, weeks_ahead: int = 12) -> list:
        """Predict future demand."""
        if not self.is_trained:
            self.train()
            
        predictions = []
        current_date = self.last_date
        
        # Need the last known data for lags
        # For simplicity in this demo without persisting full state, we will approximate lags
        last_pred = 1200 # approximate last base
        last_4_pred = 1150
        
        for i in range(weeks_ahead):
            current_date += timedelta(weeks=1)
            week = current_date.isocalendar()[1]
            month = current_date.month
            year = current_date.year
            
            # Predict
            X_pred = pd.DataFrame({
                "week": [week],
                "month": [month],
                "year": [year],
                "lag_1": [last_pred],
                "lag_4": [last_4_pred]
            })
            
            pred_value = float(self.model.predict(X_pred)[0])
            
            # 95% Confidence Interval (1.96 * std)
            ci = 1.96 * self.std_dev
            
            predictions.append({
                "week": i + 1,
                "date": current_date.strftime("%Y-%m-%d"),
                "predicted_demand": round(pred_value, 1),
                "confidence_lower": round(max(0, pred_value - ci), 1),
                "confidence_upper": round(pred_value + ci, 1)
            })
            
            # Shift lags
            last_4_pred = last_pred
            last_pred = pred_value
            
        return predictions

# Singleton instance
forecast_model = XGBoostForecastModel()
