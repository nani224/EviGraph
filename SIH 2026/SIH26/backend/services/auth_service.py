"""
Authentication & JWT Service — NIRVANA / EviGraph
Implements secure backend-enforced authentication:
  - PBKDF2-HMAC-SHA256 password hashing (200,000 rounds, 16-byte random salt)
  - JWT token generation & verification (HS256)
  - Active/inactive user checking
  - Role-based and Case-level authorization dependencies for FastAPI
"""
import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.rbac_service import (
    ROLE_ADMIN, ROLE_INVESTIGATOR, ROLE_ANALYST,
    has_permission, can_access_case
)

# Configuration from Environment with secure development defaults
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "nirvana_evigraph_secret_key_sih2026_secure_auth_token_sig")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "720")) # 12 hours

security_scheme = HTTPBearer(auto_error=False)

# ─────────────────────────────────────────────────────────
# SECURE PASSWORD HASHING (PBKDF2-HMAC-SHA256)
# ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Computes secure PBKDF2-HMAC-SHA256 digest with 200,000 iterations and 16-byte random salt.
    Format: pbkdf2:sha256:200000$<salt_hex>$<hash_hex>
    """
    if not password:
        raise ValueError("Password cannot be empty")
    salt = os.urandom(16).hex()
    iterations = 200000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2:sha256:{iterations}${salt}${derived.hex()}"

def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verifies a plaintext password against a stored PBKDF2-HMAC-SHA256 hash.
    Safe against timing attacks via hmac.compare_digest.
    """
    try:
        if not plain_password or not password_hash:
            return False
        parts = password_hash.split("$")
        if len(parts) != 3:
            return False
        algo_iter, salt, expected_hex = parts
        _, _, iter_str = algo_iter.split(":")
        iterations = int(iter_str)
        derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(derived.hex(), expected_hex)
    except Exception:
        return False

# ─────────────────────────────────────────────────────────
# JWT TOKEN GENERATION & VERIFICATION
# ─────────────────────────────────────────────────────────

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a cryptographically signed HS256 JWT access token.
    Claims: sub (user_id), username, role, exp, iat.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates JWT signature and expiration.
    Raises HTTPException if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ─────────────────────────────────────────────────────────
# FASTAPI DEPENDENCIES
# ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency:
      1. Extracts token from Authorization header (Bearer <token>)
      2. Validates token signature and expiration
      3. Verifies user exists in database and is ACTIVE
      4. Returns authoritative user record
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: subject (user_id) missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Authoritative backend database lookup (Never trust frontend-supplied roles!)
    from data.database import get_user_by_id
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact system administrator.",
        )
    
    return user

async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication dependency for flexible or legacy endpoints.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def require_role(*allowed_roles: str):
    """
    Dependency factory to enforce specific roles (e.g. require_role("ADMIN")).
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").upper()
        norm_allowed = [r.upper() for r in allowed_roles]
        if user_role not in norm_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires role {allowed_roles}, but user has role '{user_role}'.",
            )
        return current_user
    return role_checker

def require_permission(permission: str):
    """
    Dependency factory to enforce fine-grained permissions.
    """
    async def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").upper()
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Role '{user_role}' lacks required permission '{permission}'.",
            )
        return current_user
    return permission_checker

async def verify_case_authorization(
    case_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verifies that the authenticated investigator has permission to access case_id.
    Admins automatically have oversight access. Investigators must be explicitly assigned.
    """
    if not can_access_case(current_user, case_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Investigator '{current_user.get('username')}' is not assigned to case '{case_id}'.",
        )
    return current_user
