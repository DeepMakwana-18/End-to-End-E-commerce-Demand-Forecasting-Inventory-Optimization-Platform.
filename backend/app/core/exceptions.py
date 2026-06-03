"""Custom exception classes for the Titan platform.

All business-logic exceptions inherit from TitanError so that a single
exception handler in main.py can map them to appropriate HTTP responses.
"""

from fastapi import HTTPException, status


class TitanError(Exception):
    """Base exception for all Titan platform errors."""

    def __init__(self, message: str = "An unexpected error occurred", code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class NotFoundError(TitanError):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", resource_id: int | str | None = None):
        detail = f"{resource} not found"
        if resource_id is not None:
            detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(message=detail, code="NOT_FOUND")
        self.status_code = status.HTTP_404_NOT_FOUND


class DuplicateError(TitanError):
    """Duplicate resource conflict."""

    def __init__(self, resource: str = "Resource", field: str = ""):
        detail = f"{resource} already exists"
        if field:
            detail = f"{resource} with this {field} already exists"
        super().__init__(message=detail, code="DUPLICATE")
        self.status_code = status.HTTP_409_CONFLICT


class ForbiddenError(TitanError):
    """Access denied — insufficient permissions."""

    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, code="FORBIDDEN")
        self.status_code = status.HTTP_403_FORBIDDEN


class TenantMismatchError(TitanError):
    """Attempted access to a resource outside the user's organization."""

    def __init__(self):
        super().__init__(
            message="Access denied: resource belongs to a different organization",
            code="TENANT_MISMATCH",
        )
        self.status_code = status.HTTP_403_FORBIDDEN


class ValidationError(TitanError):
    """Business logic validation failure."""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message=message, code="VALIDATION_ERROR")
        self.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class AuthenticationError(TitanError):
    """Authentication failure."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, code="AUTH_ERROR")
        self.status_code = status.HTTP_401_UNAUTHORIZED


class RateLimitError(TitanError):
    """Rate limit exceeded."""

    def __init__(self):
        super().__init__(message="Rate limit exceeded. Please try again later.", code="RATE_LIMIT")
        self.status_code = status.HTTP_429_TOO_MANY_REQUESTS


def titan_exception_handler(exc: TitanError) -> HTTPException:
    """Convert a TitanError into a FastAPI HTTPException."""
    return HTTPException(
        status_code=getattr(exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR),
        detail={"message": exc.message, "code": exc.code},
    )
