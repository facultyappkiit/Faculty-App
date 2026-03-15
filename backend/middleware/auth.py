from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from database import get_supabase

# JWT settings for admin tokens only
ADMIN_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-super-secret-jwt-key")

security = HTTPBearer()


class TokenData:
    def __init__(self, user_id: int, email: str = None, role: str = "user", token_type: str = "user"):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.token_type = token_type  # "user" or "admin"


def decode_admin_token(token: str) -> dict:
    """Decode and verify admin JWT token."""
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        return None  # Not an admin token, might be Supabase token


async def verify_supabase_token(token: str) -> dict:
    """Verify Supabase token using Supabase auth."""
    supabase = get_supabase()
    
    try:
        # Use Supabase to verify the token and get user
        user_response = supabase.auth.get_user(token)
        
        if user_response and user_response.user:
            return {
                "email": user_response.user.email,
                "sub": user_response.user.id,
                "type": "supabase"
            }
        return None
    except Exception as e:
        print(f"[AUTH] Supabase token verification failed: {e}")
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and return current user.
    Works for both Supabase user tokens and admin tokens.
    """
    token = credentials.credentials
    
    # First, try to decode as admin token
    admin_payload = decode_admin_token(token)
    if admin_payload and admin_payload.get("type") == "admin":
        return TokenData(
            user_id=admin_payload.get("id"),
            email=None,
            role=admin_payload.get("role", "manager"),
            token_type="admin"
        )
    
    # Try to verify as Supabase token
    supabase_payload = await verify_supabase_token(token)
    if supabase_payload:
        email = supabase_payload.get("email")
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
    
    # Token is invalid
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token"
    )


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and ensure it's an admin token.
    """
    token = credentials.credentials
    payload = decode_admin_token(token)
    
    if not payload or payload.get("type") != "admin":
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
    payload = decode_admin_token(token)
    
    if not payload or payload.get("type") != "admin":
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
