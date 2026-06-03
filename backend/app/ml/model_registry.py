"""ML Model Registry — persistent model lifecycle management.

Provides:
  • register_model()     — persist a trained model version + artifact
  • get_active_model()   — retrieve the current production model
  • rollback_to()        — activate a previous model version
  • compare_versions()   — side-by-side metrics comparison
  • save_artifact()      — persist model file to disk
  • load_artifact()      — load model file from disk
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional

import joblib
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import ModelVersion

logger = logging.getLogger("titan.ml.registry")


class ModelRegistry:
    """Persistent ML model lifecycle manager.

    All operations are tenant-scoped via org_id.
    """

    def __init__(self, session: AsyncSession, org_id: int):
        self.session = session
        self.org_id = org_id

    # ── Registration ────────────────────────────────────────────────

    async def register_model(
        self,
        *,
        version_tag: str,
        model_type: str = "xgboost",
        metrics: dict[str, Any],
        hyperparameters: dict[str, Any] | None = None,
        feature_schema: dict[str, Any] | None = None,
        data_source: str = "unknown",
        dataset_hash: str | None = None,
        artifact_path: str | None = None,
        artifact_size_bytes: int | None = None,
        training_duration_seconds: float | None = None,
        activate: bool = True,
    ) -> ModelVersion:
        """Register a new model version in the database.

        If activate=True, deactivates all previous versions first.
        """
        if activate:
            await self._deactivate_all()

        mv = ModelVersion(
            organization_id=self.org_id,
            version_tag=version_tag,
            model_type=model_type,
            accuracy=metrics.get("accuracy"),
            mae=metrics.get("mae"),
            rmse=metrics.get("rmse"),
            training_samples=metrics.get("training_samples"),
            feature_importance=metrics.get("feature_importance"),
            convergence=metrics.get("convergence"),
            hyperparameters=hyperparameters or {},
            feature_schema=feature_schema,
            data_source=data_source,
            dataset_hash=dataset_hash,
            model_path=artifact_path,
            artifact_size_bytes=artifact_size_bytes,
            training_duration_seconds=training_duration_seconds,
            is_active=activate,
        )
        self.session.add(mv)
        await self.session.flush()
        await self.session.refresh(mv)

        logger.info(
            "[org:%s] Registered model %s (accuracy=%.2f%%, active=%s)",
            self.org_id,
            version_tag,
            (metrics.get("accuracy") or 0) * 100,
            activate,
        )
        return mv

    # ── Retrieval ───────────────────────────────────────────────────

    async def get_active_model(self) -> Optional[ModelVersion]:
        """Get the currently active model version for this org."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .where(ModelVersion.is_active == True)
            .order_by(ModelVersion.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_version(self, version_id: int) -> Optional[ModelVersion]:
        """Get a specific model version by ID."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .where(ModelVersion.id == version_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_tag(self, version_tag: str) -> Optional[ModelVersion]:
        """Get a model version by tag string."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .where(ModelVersion.version_tag == version_tag)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_versions(self, limit: int = 20) -> list[ModelVersion]:
        """List model versions ordered by creation date."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .order_by(ModelVersion.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ── Lifecycle ───────────────────────────────────────────────────

    async def rollback_to(self, version_id: int) -> Optional[ModelVersion]:
        """Activate a previous model version (rollback).

        Deactivates all other versions for this org.
        """
        target = await self.get_version(version_id)
        if target is None:
            return None

        await self._deactivate_all()
        target.is_active = True
        await self.session.flush()
        await self.session.refresh(target)

        logger.info(
            "[org:%s] Rolled back to model %s (id=%d)",
            self.org_id,
            target.version_tag,
            target.id,
        )
        return target

    async def compare_versions(self, v1_id: int, v2_id: int) -> dict[str, Any]:
        """Compare metrics between two model versions."""
        v1 = await self.get_version(v1_id)
        v2 = await self.get_version(v2_id)

        if not v1 or not v2:
            return {"error": "One or both versions not found"}

        def _metrics(v: ModelVersion) -> dict:
            return {
                "version_tag": v.version_tag,
                "model_type": v.model_type,
                "accuracy": v.accuracy,
                "mae": v.mae,
                "rmse": v.rmse,
                "training_samples": v.training_samples,
                "is_active": v.is_active,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }

        return {
            "version_a": _metrics(v1),
            "version_b": _metrics(v2),
            "accuracy_diff": (v1.accuracy or 0) - (v2.accuracy or 0),
            "mae_diff": (v1.mae or 0) - (v2.mae or 0),
            "rmse_diff": (v1.rmse or 0) - (v2.rmse or 0),
        }

    # ── Artifacts ───────────────────────────────────────────────────

    @staticmethod
    def save_artifact(model_object: Any, org_id: int, version_tag: str) -> tuple[str, int]:
        """Save a trained model to disk.

        Returns (file_path, size_bytes).
        """
        base_dir = os.path.join(settings.ML_MODEL_PATH, f"org_{org_id}")
        os.makedirs(base_dir, exist_ok=True)

        filename = f"model_{version_tag.replace('.', '_')}.joblib"
        filepath = os.path.join(base_dir, filename)

        joblib.dump(model_object, filepath)
        size = os.path.getsize(filepath)

        logger.info(
            "[org:%s] Saved model artifact: %s (%d bytes)",
            org_id,
            filepath,
            size,
        )
        return filepath, size

    @staticmethod
    def load_artifact(artifact_path: str) -> Any:
        """Load a trained model from disk."""
        if not artifact_path or not os.path.exists(artifact_path):
            logger.warning("Model artifact not found: %s", artifact_path)
            return None
        return joblib.load(artifact_path)

    @staticmethod
    def compute_dataset_hash(data_bytes: bytes) -> str:
        """Compute SHA-256 hash of training dataset for reproducibility."""
        return hashlib.sha256(data_bytes).hexdigest()

    # ── Internal ────────────────────────────────────────────────────

    async def _deactivate_all(self) -> None:
        """Deactivate all model versions for this org."""
        stmt = (
            sa_update(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .where(ModelVersion.is_active == True)
            .values(is_active=False)
        )
        await self.session.execute(stmt)
