"""Utility function to make Laminar traces public.

Requires environment variables (can be in .env file):
- LAMINAR_PROJECT_ID: Your Laminar project ID
- LAMINAR_SESSION_TOKEN: Your Laminar session token (from browser cookies)

Usage:
    # With .env file (recommended):
    python switch_to_public.py <trace_id>

    # Or with environment variables:
    export LAMINAR_PROJECT_ID="your-project-id"
    export LAMINAR_SESSION_TOKEN="your-session-token"
    python switch_to_public.py <trace_id>
"""

import os
from typing import Optional
from pathlib import Path

# Try to import httpx, fall back to requests if not available
try:
    import httpx as http_client

    USE_HTTPX = True
except ImportError:
    try:
        import requests as http_client

        USE_HTTPX = False
    except ImportError:
        raise ImportError(
            "Neither 'httpx' nor 'requests' is installed. "
            "Please install one: pip install httpx or pip install requests"
        )

# Load .env file if it exists
try:
    from dotenv import load_dotenv

    # Look for .env in the same directory as this script
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    # dotenv not installed - that's okay, will use environment variables directly
    pass


def make_trace_public(
    trace_id: str, project_id: Optional[str] = None, session_token: Optional[str] = None
) -> dict:
    """Make a Laminar trace public.

    Args:
        trace_id: The Laminar trace ID to make public
        project_id: Optional project ID (defaults to LAMINAR_PROJECT_ID env var)
        session_token: Optional session token (defaults to LAMINAR_SESSION_TOKEN env var)

    Returns:
        dict: API response from Laminar

    Raises:
        ValueError: If required credentials are not provided
        httpx.HTTPStatusError: If the API request fails
    """
    # Get credentials from args or environment variables
    project_id = project_id or os.getenv("LAMINAR_PROJECT_ID")
    session_token = session_token or os.getenv("LAMINAR_SESSION_TOKEN")

    if not project_id:
        raise ValueError(
            "LAMINAR_PROJECT_ID environment variable or project_id argument is required"
        )
    if not session_token:
        raise ValueError(
            "LAMINAR_SESSION_TOKEN environment variable or session_token argument is required"
        )

    url = f"https://laminar.sh/api/projects/{project_id}/traces/{trace_id}"

    cookies = {"__Secure-next-auth.session-token": session_token}

    headers = {
        "Content-Type": "application/json",
        "Origin": "https://laminar.sh",
        "Referer": f"https://laminar.sh/project/{project_id}/traces",
    }

    # API expects "visibility" field with value "public" or "private"
    payload = {"visibility": "public"}

    try:
        if USE_HTTPX:
            r = http_client.put(
                url,
                json=payload,
                cookies=cookies,
                headers=headers,
                timeout=10,
            )
        else:
            # Use requests library
            r = http_client.put(
                url,
                json=payload,
                cookies=cookies,
                headers=headers,
                timeout=10,
            )

        r.raise_for_status()
        return r.json() if r.content else {"ok": True}
    except Exception as e:
        # Handle both httpx.HTTPStatusError and requests.HTTPError
        if hasattr(e, "response"):
            status_code = getattr(e.response, "status_code", None)
            response_text = getattr(e.response, "text", "")
            print(f"[Laminar] ❌ Failed to make trace public: HTTP {status_code}")
            print(f"[Laminar] Response: {response_text}")
        else:
            print(f"[Laminar] ❌ Error making trace public: {e}")
        raise


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python switch_to_public.py <trace_id>")
        sys.exit(1)

    trace_id = sys.argv[1]
    try:
        result = make_trace_public(trace_id)
        print(f"✅ Trace {trace_id} is now public!")
        print(f"Result: {result}")
    except Exception as e:
        print(f"❌ Failed to make trace public: {e}")
        sys.exit(1)
