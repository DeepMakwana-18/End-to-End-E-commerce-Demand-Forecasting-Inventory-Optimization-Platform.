"""Repository layer — data access abstraction for the Titan platform.

Each repository extends BaseRepository with domain-specific query methods.
All queries are automatically scoped to the tenant's organization_id.
"""

from app.repositories.organization_repo import OrganizationRepository
from app.repositories.user_repo import UserRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.forecast_repo import ForecastRepository
from app.repositories.alert_repo import AlertRepository
from app.repositories.upload_repo import UploadRepository
from app.repositories.scenario_repository import ScenarioRepository, ScenarioResultRepository

__all__ = [
    "OrganizationRepository",
    "UserRepository",
    "ProductRepository",
    "InventoryRepository",
    "ForecastRepository",
    "AlertRepository",
    "UploadRepository",
    "ScenarioRepository",
    "ScenarioResultRepository",
]
