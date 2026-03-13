from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from typing import Optional
import os
from dotenv import load_dotenv

from database import get_supabase
from models import UserCreate, UserLogin, UserResponse, Token, SignupResponse, VerifyOTPRequest

load_dotenv()

router = APIRouter()

# Try to import AuthApiError, fallback to Exception if not available
try:
    from gotrue.errors import AuthApiError
except ImportError:
    # Fallback: use base Exception class
    AuthApiError = Exception


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    """
    Register a new faculty user with Supabase Auth.

    A verification email will be sent to the provided email address.
    User must verify their email before they can login.

    Email requirements:
    - Must end with @kiit.ac.in

    Example valid emails: john.fcs@kiit.ac.in, professor@kiit.ac.in
    """
    supabase = get_supabase()

    try:
        # Sign up with Supabase Auth - this sends verification email
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "name": user.name,
                    "department": user.department,
                    "phone": user.phone
                }
            }
        })

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        # Check if user already exists (Supabase returns user even if exists)
        if auth_response.user.identities is not None and len(auth_response.user.identities) == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        # Store additional user data in our users table
        user_data = {
            "auth_id": auth_response.user.id,
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "phone": user.phone,
            "email_verified": False
        }

        # Insert into users table
        result = supabase.table("users").insert(user_data).execute()

        return SignupResponse(
            message="Verification email sent! Please check your inbox and verify your email before logging in.",
            email=user.email,
            user_id=auth_response.user.id
        )

    except AuthApiError as e:
        if "already registered" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Login with email and password.

    User must have verified their email before logging in.
    Returns access token and user information.
    """
    supabase = get_supabase()

    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if email is verified
        if not auth_response.user.email_confirmed_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please check your inbox and verify your email first."
            )

        # Get user data from our users table
        user_result = supabase.table("users").select(
            "*").eq("email", credentials.email).execute()

        user_data = None
        if user_result.data and len(user_result.data) > 0:
            user_data = user_result.data[0]

            # Update email_verified status if needed
            if not user_data.get("email_verified"):
                supabase.table("users").update({"email_verified": True}).eq(
                    "email", credentials.email).execute()
                user_data["email_verified"] = True
        else:
            # Create user record if it doesn't exist (for users who signed up before this update)
            user_metadata = auth_response.user.user_metadata or {}
            new_user_data = {
                "auth_id": auth_response.user.id,
                "name": user_metadata.get("name", credentials.email.split("@")[0]),
                "email": credentials.email,
                "department": user_metadata.get("department"),
                "phone": user_metadata.get("phone"),
                "email_verified": True
            }
            insert_result = supabase.table(
                "users").insert(new_user_data).execute()
            if insert_result.data:
                user_data = insert_result.data[0]

        return Token(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in,
            user=UserResponse(
                id=user_data["id"] if user_data else 0,
                auth_id=auth_response.user.id,
                name=user_data["name"] if user_data else credentials.email.split(
                    "@")[0],
                email=credentials.email,
                department=user_data.get("department") if user_data else None,
                phone=user_data.get("phone") if user_data else None,
                email_verified=True,
                created_at=user_data.get("created_at") if user_data else None
            )
        )

    except AuthApiError as e:
        error_message = str(e).lower()
        if "invalid" in error_message or "credentials" in error_message:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        elif "not confirmed" in error_message or "verify" in error_message:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please check your inbox and verify your email first."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/resend-verification")
async def resend_verification(email: str):
    """
    Resend verification email to the user.
    """
    supabase = get_supabase()

    try:
        # Resend verification email using Supabase Auth
        supabase.auth.resend({
            "type": "signup",
            "email": email
        })

        return {"message": f"Verification email resent to {email}"}

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend verification email: {str(e)}"
        )


@router.post("/refresh-token", response_model=Token)
async def refresh_token(refresh_token: str):
    """
    Refresh the access token using a refresh token.
    """
    supabase = get_supabase()

    try:
        auth_response = supabase.auth.refresh_session(refresh_token)

        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Get user data from our users table
        user_result = supabase.table("users").select(
            "*").eq("email", auth_response.user.email).execute()
        user_data = user_result.data[0] if user_result.data else None

        return Token(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in,
            user=UserResponse(
                id=user_data["id"] if user_data else 0,
                auth_id=auth_response.user.id,
                name=user_data["name"] if user_data else auth_response.user.email.split(
                    "@")[0],
                email=auth_response.user.email,
                department=user_data.get("department") if user_data else None,
                phone=user_data.get("phone") if user_data else None,
                email_verified=True,
                created_at=user_data.get("created_at") if user_data else None
            )
        )

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh token: {str(e)}"
        )


@router.post("/logout")
async def logout(access_token: str):
    """
    Logout the user and invalidate the session.
    """
    supabase = get_supabase()

    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(access_token: str):
    """
    Get current user information from access token.
    Pass token as query parameter: /api/auth/me?access_token=your_token
    """
    supabase = get_supabase()

    try:
        # Get user from Supabase Auth
        auth_response = supabase.auth.get_user(access_token)

        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        # Get user data from our users table
        user_result = supabase.table("users").select(
            "*").eq("email", auth_response.user.email).execute()

        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        user_data = user_result.data[0]

        return UserResponse(
            id=user_data["id"],
            auth_id=auth_response.user.id,
            name=user_data["name"],
            email=user_data["email"],
            department=user_data.get("department"),
            phone=user_data.get("phone"),
            email_verified=user_data.get("email_verified", False),
            created_at=user_data.get("created_at")
        )

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )


@router.post("/forgot-password")
async def forgot_password(email: str):
    """
    Send password reset email to the user.
    """
    supabase = get_supabase()

    try:
        # Use a web redirect that will then redirect to the app
        # This is more reliable than direct app scheme redirects
        redirect_url = os.getenv("RENDER_EXTERNAL_URL", "https://faculty-app-j8ct.onrender.com")
        supabase.auth.reset_password_email(
            email,
            options={
                "redirect_to": f"{redirect_url}/api/auth/redirect"
            }
        )
        return {"message": f"Password reset email sent to {email}"}

    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send password reset email: {str(e)}"
        )


@router.get("/redirect")
async def auth_redirect(
    access_token: str = None,
    refresh_token: str = None,
    type: str = None,
    token_type: str = None,
    expires_in: int = None
):
    """
    Handle Supabase auth redirects and redirect to app with tokens.
    Supabase sends: /redirect#access_token=xxx&refresh_token=yyy&type=recovery
    But hash fragments aren't sent to server, so they come as query params after JS redirect.
    """
    from fastapi.responses import HTMLResponse
    
    # If we have tokens, redirect to the app
    if access_token and type == "recovery":
        app_url = f"facultyapp://reset-password?access_token={access_token}&refresh_token={refresh_token or ''}&type={type}"
        # Return HTML that redirects to the app
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting...</title>
            <meta http-equiv="refresh" content="0;url={app_url}">
        </head>
        <body>
            <p>Redirecting to app...</p>
            <p>If not redirected, <a href="{app_url}">click here</a></p>
            <script>window.location.href = "{app_url}";</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html)
    
    # Supabase sends tokens in hash fragment which browser doesn't send to server
    # We need to use JavaScript to extract and redirect
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Processing...</title>
    </head>
    <body>
        <p>Processing password reset...</p>
        <script>
            // Get hash fragment params
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');
            
            if (accessToken && type === 'recovery') {
                // Redirect to app with tokens
                const appUrl = `facultyapp://reset-password?access_token=${accessToken}&refresh_token=${refreshToken || ''}&type=${type}`;
                window.location.href = appUrl;
            } else {
                document.body.innerHTML = '<p>Invalid or expired reset link. Please request a new one.</p>';
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.post("/update-password")
async def update_password(new_password: str, access_token: str, refresh_token: str = None):
    """
    Update user's password using the access token from the reset link.
    """
    import httpx
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    try:
        print(f"[AUTH] Attempting password update with token: {access_token[:30]}...")
        
        # Validate the token first
        supabase = get_supabase()
        try:
            user_response = supabase.auth.get_user(access_token)
            if user_response.user:
                print(f"[AUTH] Token valid for user: {user_response.user.email}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token"
                )
        except Exception as e:
            print(f"[AUTH] Token validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired reset token. Please request a new password reset."
            )
        
        # Use Supabase REST API directly to update password
        # This is the most reliable method for recovery tokens
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "apikey": supabase_key,
                    "Content-Type": "application/json"
                },
                json={"password": new_password}
            )
            
            print(f"[AUTH] Password update response status: {response.status_code}")
            print(f"[AUTH] Password update response body: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[AUTH] Password updated successfully for user: {result.get('email', 'unknown')}")
                
                # Sign out all sessions to force re-login with new password
                try:
                    await client.post(
                        f"{supabase_url}/auth/v1/logout",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "apikey": supabase_key,
                        },
                        params={"scope": "global"}
                    )
                    print("[AUTH] All sessions signed out")
                except Exception as logout_error:
                    print(f"[AUTH] Logout error (non-critical): {logout_error}")
                
                return {"message": "Password updated successfully. Please login with your new password."}
            else:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("message", error_data.get("error_description", "Failed to update password"))
                print(f"[AUTH] Password update error: {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )

    except HTTPException:
        raise
    except AuthApiError as e:
        print(f"[AUTH] AuthApiError: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"[AUTH] Exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}"
        )
