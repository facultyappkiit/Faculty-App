from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
)
from database import get_supabase
import os

# Initialize PushClient once
push_client = PushClient()


def _is_valid_expo_push_token(token: str) -> bool:
    if not token:
        return False
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """
    Send a push notification to a single device.
    """
    if not _is_valid_expo_push_token(push_token):
        print(f"[PUSH] Invalid or missing Expo push token: {push_token}")
        return None
    
    try:
        print(f"[PUSH] Sending to token: {push_token[:40]}...")
        print(f"[PUSH] Title: {title}")
        
        response = push_client.publish(
            PushMessage(
                to=push_token,
                title=title,
                body=body,
                data=data or {},
                sound="default",
                badge=1,
                channel_id="substitute-requests",
            )
        )
        print(f"[PUSH] Response: {response}")
        return response
    except DeviceNotRegisteredError:
        print(f"[PUSH] Device not registered - token may be expired: {push_token[:30]}...")
        return None
    except PushServerError as e:
        print(f"[PUSH] Server error: {e}")
        return None
    except Exception as e:
        print(f"[PUSH] Error sending notification: {e}")
        import traceback
        traceback.print_exc()
        return None


def send_push_to_multiple(push_tokens: list, title: str, body: str, data: dict = None):
    """Send push notification to multiple devices."""
    if not push_tokens:
        return []
    
    # Filter non-empty tokens
    valid_tokens = [t for t in push_tokens if _is_valid_expo_push_token(t)]
    
    if not valid_tokens:
        print(f"[PUSH] No valid tokens in list of {len(push_tokens)}")
        return []
    
    messages = [
        PushMessage(
            to=token,
            title=title,
            body=body,
            data=data or {},
            sound="default",
            badge=1,
            channel_id="substitute-requests",
        )
        for token in valid_tokens
    ]
    
    try:
        print(f"[PUSH] Sending to {len(messages)} devices")
        print(f"[PUSH] Title: {title}")
        responses = push_client.publish_multiple(messages)
        print(f"[PUSH] Sent {len(responses)} notifications successfully")
        return responses
    except Exception as e:
        print(f"[PUSH] Batch send error: {e}")
        import traceback
        traceback.print_exc()
        return []


async def notify_all_faculty_except(exclude_user_id: int, title: str, body: str, data: dict = None):
    """
    Send notification to all faculty EXCEPT the specified user.
    Used when a new request is created.
    """
    supabase = get_supabase()
    
    try:
        # Get all users except the creator
        result = supabase.table("users")\
            .select("id, name, push_token")\
            .neq("id", exclude_user_id)\
            .execute()
        
        print(f"[PUSH] Checking {len(result.data)} users for push tokens...")
        
        # Collect tokens from users who have them
        tokens = []
        for user in result.data:
            token = user.get("push_token")
            if _is_valid_expo_push_token(token):
                tokens.append(token)
                print(f"[PUSH] Will notify: {user['name']} (ID: {user['id']}) - Token: {token[:30]}...")
            else:
                print(f"[PUSH] Skipping: {user['name']} (ID: {user['id']}) - No token")
        
        if tokens:
            print(f"[PUSH] Sending to {len(tokens)} faculty members")
            send_push_to_multiple(tokens, title, body, data)
        else:
            print(f"[PUSH] No faculty with push tokens to notify")
            
    except Exception as e:
        print(f"[PUSH] Error in notify_all_faculty_except: {e}")
        import traceback
        traceback.print_exc()


async def notify_faculty_by_ids(user_ids: list[int], title: str, body: str, data: dict = None):
    """
    Send notification to a specific list of faculty user IDs.
    Used for availability-filtered request notifications.
    """
    if not user_ids:
        print("[PUSH] No recipient user IDs provided")
        return

    supabase = get_supabase()

    try:
        result = supabase.table("users")\
            .select("id, name, push_token")\
            .in_("id", user_ids)\
            .execute()

        print(f"[PUSH] Checking {len(result.data)} targeted users for push tokens...")

        tokens = []
        for user in result.data:
            token = user.get("push_token")
            if _is_valid_expo_push_token(token):
                tokens.append(token)
                print(f"[PUSH] Will notify: {user['name']} (ID: {user['id']}) - Token: {token[:30]}...")
            else:
                print(f"[PUSH] Skipping: {user['name']} (ID: {user['id']}) - No token")

        if tokens:
            print(f"[PUSH] Sending to {len(tokens)} targeted faculty members")
            send_push_to_multiple(tokens, title, body, data)
        else:
            print("[PUSH] No targeted faculty with valid push tokens")

    except Exception as e:
        print(f"[PUSH] Error in notify_faculty_by_ids: {e}")
        import traceback
        traceback.print_exc()


async def notify_user(user_id: int, title: str, body: str, data: dict = None):
    """
    Send notification to a specific user.
    Used when someone accepts/cancels a request.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("users")\
            .select("name, push_token")\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            print(f"[PUSH] User {user_id} not found")
            return
        
        user = result.data[0]
        token = user.get("push_token")
        
        if _is_valid_expo_push_token(token):
            print(f"[PUSH] Notifying user: {user['name']} (ID: {user_id})")
            print(f"[PUSH] Token: {token[:30]}...")
            send_push_notification(token, title, body, data)
        else:
            print(f"[PUSH] User {user['name']} (ID: {user_id}) has no push token")
            
    except Exception as e:
        print(f"[PUSH] Error in notify_user: {e}")
        import traceback
        traceback.print_exc()
