from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
import bcrypt

from database import get_supabase
from models import UserResponse, UserUpdate, PushTokenUpdate
from middleware.auth import get_current_user, get_current_admin, get_super_admin, TokenData

router = APIRouter()


class AdminCreateUser(BaseModel):
    name: str
    email: str
    password: str
    department: Optional[str] = None
    phone: Optional[str] = None


def _is_valid_expo_push_token(token: str) -> bool:
    if not token:
        return False
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


@router.get("/", response_model=List[UserResponse])
async def get_all_users(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get all registered faculty users.
    Admin only.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("users")\
            .select("id, name, email, department, phone, email_verified, push_token, created_at")\
            .order("name")\
            .execute()
        
        return [
            UserResponse(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                department=user.get("department"),
                phone=user.get("phone"),
                email_verified=user.get("email_verified", False),
                push_token=user.get("push_token"),
                created_at=user.get("created_at")
            )
            for user in result.data
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(user_data: AdminCreateUser, current_admin: TokenData = Depends(get_current_admin)):
    """
    Create a new user.
    Admin only.
    """
    supabase = get_supabase()
    
    # Validate email format
    if not user_data.email.endswith("@kiit.ac.in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be a KIIT email (@kiit.ac.in)"
        )
    
    try:
        # Check if email already exists
        existing = supabase.table("users").select("id").eq("email", user_data.email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash the password
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        result = supabase.table("users").insert({
            "name": user_data.name,
            "email": user_data.email,
            "password": hashed_password,
            "department": user_data.department,
            "phone": user_data.phone,
            "email_verified": True  # Admin-created users are pre-verified
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        new_user = result.data[0]
        return UserResponse(
            id=new_user["id"],
            name=new_user["name"],
            email=new_user["email"],
            department=new_user.get("department"),
            phone=new_user.get("phone"),
            created_at=new_user.get("created_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, current_user: TokenData = Depends(get_current_user)):
    """
    Get a specific user by ID.
    Users can only view their own profile, admins can view any.
    """
    # Users can only view their own profile, admins can view any
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this profile"
        )
    supabase = get_supabase()
    
    try:
        result = supabase.table("users")\
            .select("id, name, email, department, phone, created_at")\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = result.data[0]
        return UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            department=user.get("department"),
            phone=user.get("phone"),
            created_at=user.get("created_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, current_user: TokenData = Depends(get_current_user)):
    """
    Update user profile information.
    Users can only update their own profile, admins can update any.
    """
    # Users can only update their own profile, admins can update any
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this profile"
        )
    supabase = get_supabase()
    
    try:
        # Build update data (only non-None fields)
        update_data = {}
        if user_update.name is not None:
            update_data["name"] = user_update.name
        if user_update.department is not None:
            update_data["department"] = user_update.department
        if user_update.phone is not None:
            update_data["phone"] = user_update.phone
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        result = supabase.table("users")\
            .update(update_data)\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = result.data[0]
        return UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            department=user.get("department"),
            phone=user.get("phone"),
            created_at=user.get("created_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.put("/{user_id}/push-token")
async def update_push_token(user_id: int, token_update: PushTokenUpdate, current_user: TokenData = Depends(get_current_user)):
    """
    Update the push notification token for a user.
    Send JSON body: {"push_token": "ExponentPushToken[xxx]"}
    Users can only update their own push token.
    """
    # Users can only update their own push token
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this push token"
        )
    supabase = get_supabase()
    
    token = token_update.push_token
    
    print(f"[PUSH-TOKEN] Received for user {user_id}: {token}")
    
    if not _is_valid_expo_push_token(token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Expo push token format"
        )
    
    try:
        result = supabase.table("users")\
            .update({"push_token": token})\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        print(f"[PUSH-TOKEN] Saved for user {user_id}: {token[:40]}...")
        return {
            "message": "Push token updated successfully", 
            "user_id": user_id,
            "token_preview": token[:40] + "..."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PUSH-TOKEN] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update push token: {str(e)}"
        )


@router.post("/{user_id}/push-token")
async def set_push_token_simple(user_id: int, push_token: str, current_user: TokenData = Depends(get_current_user)):
    """
    Simple endpoint to set push token via query parameter.
    Example: POST /api/users/1/push-token?push_token=ExponentPushToken[xxx]
    Users can only update their own push token.
    """
    # Users can only update their own push token
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this push token"
        )
    supabase = get_supabase()
    
    print(f"[PUSH-TOKEN] POST received for user {user_id}: {push_token}")
    
    if not _is_valid_expo_push_token(push_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Expo push token format"
        )
    
    try:
        result = supabase.table("users")\
            .update({"push_token": push_token})\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        print(f"[PUSH-TOKEN] Saved for user {user_id}: {push_token[:40]}...")
        return {
            "message": "Push token updated successfully", 
            "user_id": user_id,
            "token_preview": push_token[:40] + "..."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PUSH-TOKEN] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update push token: {str(e)}"
        )


@router.get("/{user_id}/push-token/status")
async def get_push_token_status(user_id: int, current_user: TokenData = Depends(get_current_user)):
    """
    Get push token registration status for a user.
    Useful for debugging notification registration from the app.
    Users can only check their own status, admins can check any.
    """
    # Users can only check their own status, admins can check any
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this status"
        )
    supabase = get_supabase()

    try:
        result = supabase.table("users")\
            .select("id, name, push_token")\
            .eq("id", user_id)\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user = result.data[0]
        token = user.get("push_token")
        return {
            "user_id": user["id"],
            "name": user.get("name"),
            "has_push_token": bool(token),
            "is_valid_expo_token": _is_valid_expo_push_token(token) if token else False,
            "token_preview": f"{token[:40]}..." if token else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get push token status: {str(e)}"
        )


@router.post("/{user_id}/push-token/debug")
async def log_push_token_debug(user_id: int, payload: dict, current_user: TokenData = Depends(get_current_user)):
    """
    Receive client-side push registration debug state and print it in server logs.
    Users can only log debug for their own account.
    """
    # Users can only debug their own account
    if current_user.token_type != "admin" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    print(f"[PUSH-DEBUG] user_id={user_id} payload={payload}")
    return {"message": "Debug state logged"}


@router.delete("/{user_id}")
async def delete_user(user_id: int, current_admin: TokenData = Depends(get_super_admin)):
    """
    Delete a user account.
    Super admin only.
    """
    supabase = get_supabase()
    
    try:
        check_result = supabase.table("users")\
            .select("id")\
            .eq("id", user_id)\
            .execute()
        
        if not check_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        supabase.table("users").delete().eq("id", user_id).execute()
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
