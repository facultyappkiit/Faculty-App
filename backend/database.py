import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service_role key for backend operations (bypasses RLS)
# Fallback to SUPABASE_KEY for backwards compatibility
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client | None = None

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_supabase() -> Client:
    """Get Supabase client instance"""
    return supabase


def get_supabase_admin() -> Client:
    """Get Supabase admin client (requires SUPABASE_SERVICE_ROLE_KEY)."""
    if supabase_admin is None:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required for admin auth operations")
    return supabase_admin
