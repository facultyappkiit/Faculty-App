from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from typing import Optional
from database import get_supabase

# JWT settings
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-super-secret-jwt-key")
ADMIN_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-super-secret-jwt-key")

security = HTTPBearer()


class TokenData:
    def __init__(self, user_id: int, email: str = None, role: str = "user", token_type: str = "user"):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.token_type = token_type  # "user" or "admin"


def decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        # Try decoding with Supabase secret first
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and return current user.
    Works for both Supabase user tokens and admin tokens.
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    # Check if it's an admin token
    if payload.get("type") == "admin":
        return TokenData(
            user_id=payload.get("id"),
            email=None,
            role=payload.get("role", "manager"),
            token_type="admin"
        )
    
    # It's a Supabase user token
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no email found"
        )
    
    # Get user from database
    supabase = get_supabase()
    result = supabase.table("users").select("id, email").eq("email", email).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    user = result.data[0]
    return TokenData(
        user_id=user["id"],
        email=user["email"],
        role="user",
        token_type="user"
    )


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and ensure it's an admin token.
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return TokenData(
        user_id=payload.get("id"),
        email=None,
        role=payload.get("role", "manager"),
        token_type="admin"
    )


async def get_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and ensure it's a super_admin token.
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    if payload.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    return TokenData(
        user_id=payload.get("id"),
        email=None,
        role="super_admin",
        token_type="admin"
    )


def require_user_or_admin(current_user: TokenData, target_user_id: int) -> bool:
    """
    Check if current user can access/modify target user's data.
    Returns True if authorized, raises exception otherwise.
    """
    # Admins can access any user
    if current_user.token_type == "admin":
        return True
    
    # Users can only access their own data
    if current_user.user_id == target_user_id:
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this resource"
    )
