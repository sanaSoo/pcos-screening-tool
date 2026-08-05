# User-scoped + service Supabase clients. Routes that touch a specific
# user's data must use get_user_client() (or the require_auth decorator,
# which attaches one to flask.g) so Postgres RLS enforces the isolation --
# never the service client for anything tied to a request's user.
from __future__ import annotations

import os

from dotenv import load_dotenv
from supabase import Client, ClientOptions, create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

_service_client: Client | None = None


def get_service_client() -> Client:
    """Service-role client that bypasses RLS. Only for admin/maintenance
    work -- never for handling a single user's request data."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _service_client


def get_user_client(access_token: str) -> Client:
    """Client authenticated as the given user's access token. The anon key
    is used for the apikey header (required by PostgREST/Storage), while
    the Authorization header carries the user's JWT so auth.uid() resolves
    to them for RLS on both Postgres tables and Storage objects."""
    return create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        options=ClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
    )


def get_user_id(access_token: str) -> str:
    """Verify the token against Supabase Auth and return the user's id.

    Raises ValueError if the token is missing, malformed, or expired.
    """
    if not access_token:
        raise ValueError("Missing access token")

    anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        response = anon_client.auth.get_user(access_token)
    except Exception as e:
        raise ValueError("Invalid or expired access token") from e

    if response is None or response.user is None:
        raise ValueError("Invalid or expired access token")

    return response.user.id
