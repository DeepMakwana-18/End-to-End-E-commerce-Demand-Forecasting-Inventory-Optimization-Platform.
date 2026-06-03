"""Authentication API routes.

Handles signup (with org creation), login, token refresh, and profile.
Phase 2.5: Rate limiting, audit logging, refresh token rotation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.database import get_db
from app.models import User, Organization, Workspace, UserRole
from app.schemas import (
    LoginRequest, SignupRequest, TokenResponse, UserResponse,
    OrganizationResponse, RefreshTokenRequest,
)
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, blacklist_token,
    is_token_blacklisted,
)
from app.core.rate_limiter import rate_limit
from app.core.audit import log_action, get_client_ip
from app.repositories.organization_repo import OrganizationRepository
from app.repositories.user_repo import UserRepository
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_token_data(user: User, org: Organization) -> dict:
    """Build JWT payload with org claims."""
    return {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "org_id": org.id,
        "org_slug": org.slug,
    }


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("signup", 3, 60))],
)
async def signup(request_body: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new user and create their organization."""
    user_repo = UserRepository(db)
    org_repo = OrganizationRepository(db)

    # Check if email already exists
    if await user_repo.email_exists(request_body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create organization
    slug = await org_repo.generate_slug(request_body.organization_name)
    org = Organization(
        name=request_body.organization_name,
        slug=slug,
    )
    org = await org_repo.create(org)

    # Create default workspace
    workspace = Workspace(
        organization_id=org.id,
        name="Default Workspace",
        is_default=True,
    )
    db.add(workspace)

    # Create user as org_admin (founder)
    user = User(
        organization_id=org.id,
        email=request_body.email,
        password_hash=hash_password(request_body.password),
        name=request_body.name,
        role=UserRole.ORG_ADMIN,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.refresh(org)

    # Audit log
    await log_action(
        db,
        org_id=org.id,
        user_id=user.id,
        action="user.signup",
        resource_type="user",
        resource_id=user.id,
        details={"email": user.email, "org_name": org.name},
        ip_address=get_client_ip(request),
    )

    # Generate tokens
    token_data = _build_token_data(user, org)
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
        organization=OrganizationResponse.model_validate(org),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("login", 5, 60))],
)
async def login(request_body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(request_body.email)

    if not user or not verify_password(request_body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Get organization
    org_repo = OrganizationRepository(db)
    org = await org_repo.get_by_id(user.organization_id)
    if not org or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is disabled",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    # Audit log
    await log_action(
        db,
        org_id=org.id,
        user_id=user.id,
        action="user.login",
        resource_type="user",
        resource_id=user.id,
        ip_address=get_client_ip(request),
    )

    # Generate tokens
    token_data = _build_token_data(user, org)
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
        organization=OrganizationResponse.model_validate(org),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request_body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token with token rotation.

    The old refresh token is blacklisted after use, and a new one is issued.
    If a blacklisted refresh token is reused, it indicates token theft.
    """
    payload = decode_token(request_body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Check if token has been used before (rotation check)
    if await is_token_blacklisted(request_body.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked (possible token theft detected)",
        )

    user_id = payload.get("sub")
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    org_repo = OrganizationRepository(db)
    org = await org_repo.get_by_id(user.organization_id)

    # Blacklist the old refresh token (rotation)
    await blacklist_token(request_body.refresh_token)

    # Issue new token pair
    token_data = _build_token_data(user, org)
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
        organization=OrganizationResponse.model_validate(org),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(user)
