
import asyncio
import os
from supabase import create_async_client
from dotenv import load_dotenv

load_dotenv()

async def test_async():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    client = await create_async_client(url, key)
    print("Async client created")
    # Verify auth
    # user = await client.auth.get_user() # returns wrapper
    # print(user)

if __name__ == "__main__":
    asyncio.run(test_async())
