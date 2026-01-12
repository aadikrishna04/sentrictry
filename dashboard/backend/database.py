
import os
from supabase import create_async_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class SupabaseDB:
    client: Client = None

    @classmethod
    async def get_client(cls):
        if cls.client is None:
            if not SUPABASE_URL or not SUPABASE_KEY:
                raise ValueError("Supabase credentials not set in environment")
            cls.client = await create_async_client(SUPABASE_URL, SUPABASE_KEY)
        return cls.client

# Helper to get db instance (naming compatibility)
async def get_db():
    return await SupabaseDB.get_client()

# Initialize isn't really needed like SQLite, but we can verify connection
async def init_db():
    client = await SupabaseDB.get_client()
    # Optional: check connection or table existence
    try:
        # Just a lightweight check
        await client.table("projects").select("id", count="exact").limit(1).execute()
    except Exception as e:
        print(f"Warning: Could not connect to Supabase tables. Ensure Schema is applied. Error: {e}")
