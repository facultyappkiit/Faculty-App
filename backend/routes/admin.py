from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
import secrets
import re
from database import get_supabase, get_supabase_admin
from middleware.auth import get_current_admin, get_super_admin, TokenData
from services.push_notifications import send_push_notification, send_push_to_multiple

router = APIRouter()

# JWT Secret for admin tokens
ADMIN_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-super-secret-jwt-key")

# Models
class AdminLogin(BaseModel):
    admin_id: str
    password: str

class AdminCreate(BaseModel):
    admin_id: str
    password: str
    name: str
    role: str = "manager"

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdminResponse(BaseModel):
    id: int
    admin_id: str
    name: str
    role: str
    is_active: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class AdminLoginResponse(BaseModel):
    access_token: str
    admin: AdminResponse


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def hash_password(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_admin_token(admin_id: str, role: str, admin_db_id: int) -> str:
    """Create a JWT token for admin."""
    payload = {
        "admin_id": admin_id,
        "role": role,
        "id": admin_db_id,
        "exp": datetime.utcnow() + timedelta(hours=24),
        "iat": datetime.utcnow(),
        "type": "admin"
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(credentials: AdminLogin):
    """
    Admin login endpoint.
    Returns JWT token and admin details.
    """
    supabase = get_supabase()
    
    try:
        # Find admin by admin_id
        result = supabase.table("admins")\
            .select("*")\
            .eq("admin_id", credentials.admin_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin ID or password"
            )
        
        admin = result.data[0]
        
        # Check if admin is active
        if not admin.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin account is disabled"
            )
        
        # Verify password
        if not verify_password(credentials.password, admin["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin ID or password"
            )
        
        # Update last login
        supabase.table("admins")\
            .update({"last_login": datetime.utcnow().isoformat()})\
            .eq("id", admin["id"])\
            .execute()
        
        # Create token
        token = create_admin_token(admin["admin_id"], admin["role"], admin["id"])
        
        return {
            "access_token": token,
            "admin": {
                "id": admin["id"],
                "admin_id": admin["admin_id"],
                "name": admin["name"],
                "role": admin["role"],
                "is_active": admin["is_active"],
                "created_at": admin.get("created_at"),
                "last_login": datetime.utcnow().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/", response_model=List[AdminResponse])
async def get_all_admins(current_admin: TokenData = Depends(get_super_admin)):
    """
    Get all admins.
    Super admin only.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("admins")\
            .select("id, admin_id, name, role, is_active, created_at, last_login")\
            .order("created_at")\
            .execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admins: {str(e)}"
        )


@router.post("/", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(admin: AdminCreate, current_admin: TokenData = Depends(get_super_admin)):
    """
    Create a new admin.
    Super admin only.
    """
    supabase = get_supabase()
    
    # Validate role
    if admin.role not in ["super_admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'super_admin' or 'manager'"
        )
    
    try:
        # Check if admin_id already exists
        existing = supabase.table("admins")\
            .select("id")\
            .eq("admin_id", admin.admin_id)\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin ID already exists"
            )
        
        # Hash password and create admin
        hashed = hash_password(admin.password)
        
        result = supabase.table("admins").insert({
            "admin_id": admin.admin_id,
            "password": hashed,
            "name": admin.name,
            "role": admin.role,
            "is_active": True
        }).execute()
        
        new_admin = result.data[0]
        return {
            "id": new_admin["id"],
            "admin_id": new_admin["admin_id"],
            "name": new_admin["name"],
            "role": new_admin["role"],
            "is_active": new_admin["is_active"],
            "created_at": new_admin.get("created_at"),
            "last_login": new_admin.get("last_login")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin: {str(e)}"
        )


@router.put("/{admin_id}", response_model=AdminResponse)
async def update_admin(admin_id: int, admin_update: AdminUpdate, current_admin: TokenData = Depends(get_super_admin)):
    """
    Update an admin.
    Super admin only.
    """
    supabase = get_supabase()
    
    try:
        update_data = {}
        if admin_update.name is not None:
            update_data["name"] = admin_update.name
        if admin_update.role is not None:
            if admin_update.role not in ["super_admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Role must be 'super_admin' or 'manager'"
                )
            update_data["role"] = admin_update.role
        if admin_update.is_active is not None:
            update_data["is_active"] = admin_update.is_active
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        result = supabase.table("admins")\
            .update(update_data)\
            .eq("id", admin_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )
        
        admin = result.data[0]
        return {
            "id": admin["id"],
            "admin_id": admin["admin_id"],
            "name": admin["name"],
            "role": admin["role"],
            "is_active": admin["is_active"],
            "created_at": admin.get("created_at"),
            "last_login": admin.get("last_login")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update admin: {str(e)}"
        )


@router.delete("/{admin_id}")
async def delete_admin(admin_id: int, current_admin: TokenData = Depends(get_super_admin)):
    """
    Delete an admin.
    Super admin only.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("admins")\
            .delete()\
            .eq("id", admin_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )
        
        return {"message": "Admin deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete admin: {str(e)}"
        )


@router.put("/{admin_id}/password")
async def change_admin_password(admin_id: int, new_password: str, current_admin: TokenData = Depends(get_current_admin)):
    """
    Change admin password.
    Super admin can change any password, others can only change their own.
    """
    # Only super_admin or self can change password
    if current_admin.role != "super_admin" and current_admin.user_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password"
        )
    
    supabase = get_supabase()
    
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    try:
        hashed = hash_password(new_password)
        
        result = supabase.table("admins")\
            .update({"password": hashed})\
            .eq("id", admin_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )


# =============================================
# USER INVITE MODELS
# =============================================

class InviteUserRequest(BaseModel):
    email: str
    name: str
    department: Optional[str] = None
    phone: Optional[str] = None

class BulkInviteRequest(BaseModel):
    users: List[InviteUserRequest]

class InviteResponse(BaseModel):
    success: bool
    message: str
    invite_token: Optional[str] = None
    email: Optional[str] = None

class BulkInviteResponse(BaseModel):
    success: bool
    total: int
    sent: int
    failed: int
    errors: List[str]

class PendingInvite(BaseModel):
    id: int
    email: str
    name: str
    department: Optional[str] = None
    phone: Optional[str] = None
    status: str
    created_at: str
    expires_at: str


# =============================================
# USER INVITE ENDPOINTS
# =============================================

def validate_faculty_email(email: str) -> bool:
    """Validate that email is a valid KIIT email."""
    email = email.lower()
    return email.endswith('@kiit.ac.in')


def generate_invite_token() -> str:
    """Generate a secure random invite token."""
    return secrets.token_urlsafe(32)


@router.post("/invite", response_model=InviteResponse)
async def invite_user(invite: InviteUserRequest, current_admin: TokenData = Depends(get_current_admin)):
    """
    Invite a single user to register.
    Sends invite email via Supabase Auth.
    """
    supabase = get_supabase()
    try:
        supabase_admin = get_supabase_admin()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    email = invite.email.lower()
    
    # Validate email format
    if not validate_faculty_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be a valid KIIT email (@kiit.ac.in)"
        )
    
    try:
        # Check if user already exists
        existing_user = supabase.table("users").select("id").eq("email", email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Check if invite already pending
        existing_invite = supabase.table("pending_invites")\
            .select("id, status")\
            .eq("email", email)\
            .eq("status", "pending")\
            .execute()
        
        if existing_invite.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invite is already pending for this email"
            )
        
        # Generate invite token
        invite_token = generate_invite_token()
        
        # Store pending invite
        invite_data = {
            "email": email,
            "name": invite.name,
            "department": invite.department,
            "phone": invite.phone,
            "invite_token": invite_token,
            "invited_by": current_admin.user_id if current_admin.token_type == "admin" else None,
            "status": "pending"
        }
        
        supabase.table("pending_invites").insert(invite_data).execute()
        
        # Send invite email via Supabase Auth
        try:
            supabase_admin.auth.admin.invite_user_by_email(email)
            print(f"[INVITE] Sent invite to {email}")
        except Exception as email_error:
            print(f"[INVITE] Failed to send email: {email_error}")
            # Roll back pending invite because email was not delivered.
            supabase.table("pending_invites").delete().eq("invite_token", invite_token).execute()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to send invite email: {str(email_error)}"
            )
        
        return InviteResponse(
            success=True,
            message=f"Invite sent to {email}",
            invite_token=invite_token,
            email=email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invite: {str(e)}"
        )


@router.post("/invite/bulk", response_model=BulkInviteResponse)
async def bulk_invite_users(bulk_invite: BulkInviteRequest, current_admin: TokenData = Depends(get_current_admin)):
    """
    Invite multiple users from a list (used for CSV upload).
    """
    supabase = get_supabase()
    try:
        supabase_admin = get_supabase_admin()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    sent = 0
    failed = 0
    errors = []
    
    for user in bulk_invite.users:
        email = user.email.lower()
        
        try:
            # Validate email
            if not validate_faculty_email(email):
                errors.append(f"{email}: Invalid KIIT faculty email")
                failed += 1
                continue
            
            # Check if user already exists
            existing_user = supabase.table("users").select("id").eq("email", email).execute()
            if existing_user.data:
                errors.append(f"{email}: User already exists")
                failed += 1
                continue
            
            # Check if invite already pending
            existing_invite = supabase.table("pending_invites")\
                .select("id")\
                .eq("email", email)\
                .eq("status", "pending")\
                .execute()
            
            if existing_invite.data:
                errors.append(f"{email}: Invite already pending")
                failed += 1
                continue
            
            # Generate invite token
            invite_token = generate_invite_token()
            
            # Store pending invite
            invite_data = {
                "email": email,
                "name": user.name,
                "department": user.department,
                "phone": user.phone,
                "invite_token": invite_token,
                "invited_by": current_admin.user_id if current_admin.token_type == "admin" else None,
                "status": "pending"
            }
            
            supabase.table("pending_invites").insert(invite_data).execute()
            
            # Send invite email
            try:
                supabase_admin.auth.admin.invite_user_by_email(email)
            except Exception as email_error:
                print(f"[BULK-INVITE] Email failed for {email}: {email_error}")
                supabase.table("pending_invites").delete().eq("invite_token", invite_token).execute()
                errors.append(f"{email}: Failed to send invite email")
                failed += 1
                continue
            
            sent += 1
            
        except Exception as e:
            errors.append(f"{email}: {str(e)}")
            failed += 1
    
    return BulkInviteResponse(
        success=failed == 0,
        total=len(bulk_invite.users),
        sent=sent,
        failed=failed,
        errors=errors
    )


@router.get("/invites", response_model=List[PendingInvite])
async def get_pending_invites(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get all pending invites.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("pending_invites")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()
        
        return [
            {
                "id": inv["id"],
                "email": inv["email"],
                "name": inv["name"],
                "department": inv.get("department"),
                "phone": inv.get("phone"),
                "status": inv["status"],
                "created_at": inv["created_at"],
                "expires_at": inv["expires_at"]
            }
            for inv in result.data
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch invites: {str(e)}"
        )


@router.delete("/invites/{invite_id}")
async def cancel_invite(invite_id: int, current_admin: TokenData = Depends(get_current_admin)):
    """
    Cancel/delete a pending invite.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("pending_invites")\
            .delete()\
            .eq("id", invite_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invite not found"
            )
        
        return {"message": "Invite cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel invite: {str(e)}"
        )


@router.post("/invites/{invite_id}/resend")
async def resend_invite(invite_id: int, current_admin: TokenData = Depends(get_current_admin)):
    """
    Resend invite email for a pending invite.
    """
    supabase = get_supabase()
    try:
        supabase_admin = get_supabase_admin()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    try:
        # Get the invite
        result = supabase.table("pending_invites")\
            .select("*")\
            .eq("id", invite_id)\
            .eq("status", "pending")\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending invite not found"
            )
        
        invite = result.data[0]
        
        # Generate new token and update expiry
        new_token = generate_invite_token()
        supabase.table("pending_invites")\
            .update({
                "invite_token": new_token,
                "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
            })\
            .eq("id", invite_id)\
            .execute()
        
        # Resend email
        try:
            supabase_admin.auth.admin.invite_user_by_email(invite["email"])
        except Exception as email_error:
            print(f"[RESEND-INVITE] Email failed: {email_error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to resend invite email: {str(email_error)}"
            )
        
        return {"message": f"Invite resent to {invite['email']}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend invite: {str(e)}"
        )


# Notification Models
class NotificationRequest(BaseModel):
    title: str
    body: str
    target_type: str  # "all", "specific", "department"
    user_ids: Optional[List[int]] = None  # For "specific" target
    department: Optional[str] = None  # For "department" target
    data: Optional[dict] = None  # Additional data payload


class NotificationResponse(BaseModel):
    success: bool
    sent_count: int
    failed_count: int
    message: str


@router.post("/notifications/send", response_model=NotificationResponse)
async def send_notification(notification: NotificationRequest, current_admin: TokenData = Depends(get_current_admin)):
    """
    Send push notifications to users.
    Admin only.
    
    target_type options:
    - "all": Send to all users with push tokens
    - "specific": Send to specific user IDs (provide user_ids)
    - "department": Send to all users in a department (provide department)
    """
    supabase = get_supabase()
    
    if not notification.title or not notification.body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title and body are required"
        )
    
    try:
        # Get users based on target_type
        if notification.target_type == "all":
            result = supabase.table("users")\
                .select("id, name, email, department, push_token")\
                .execute()
            users = result.data
            
        elif notification.target_type == "specific":
            if not notification.user_ids or len(notification.user_ids) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="user_ids required for specific target"
                )
            result = supabase.table("users")\
                .select("id, name, email, department, push_token")\
                .in_("id", notification.user_ids)\
                .execute()
            users = result.data
            
        elif notification.target_type == "department":
            if not notification.department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="department required for department target"
                )
            result = supabase.table("users")\
                .select("id, name, email, department, push_token")\
                .eq("department", notification.department)\
                .execute()
            users = result.data
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target_type. Use 'all', 'specific', or 'department'"
            )
        
        # Filter users with valid push tokens
        valid_tokens = []
        users_with_tokens = []
        for user in users:
            token = user.get("push_token")
            if token and (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")):
                valid_tokens.append(token)
                users_with_tokens.append(user)
        
        if not valid_tokens:
            return NotificationResponse(
                success=True,
                sent_count=0,
                failed_count=len(users),
                message=f"No users with valid push tokens found ({len(users)} users checked)"
            )
        
        # Send notifications
        data_payload = notification.data or {}
        data_payload["type"] = "admin_notification"
        
        print(f"[ADMIN-NOTIFY] Sending to {len(valid_tokens)} users")
        print(f"[ADMIN-NOTIFY] Title: {notification.title}")
        print(f"[ADMIN-NOTIFY] Body: {notification.body}")
        
        responses = send_push_to_multiple(valid_tokens, notification.title, notification.body, data_payload)
        
        sent_count = len(responses) if responses else 0
        failed_count = len(users) - sent_count
        
        return NotificationResponse(
            success=True,
            sent_count=sent_count,
            failed_count=failed_count,
            message=f"Notification sent to {sent_count} users"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notifications: {str(e)}"
        )


@router.get("/notifications/departments")
async def get_departments(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get list of all unique departments for notification targeting.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("users")\
            .select("department")\
            .execute()
        
        # Get unique non-null departments
        departments = list(set(
            user["department"] 
            for user in result.data 
            if user.get("department")
        ))
        departments.sort()
        
        return {"departments": departments}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch departments: {str(e)}"
        )
