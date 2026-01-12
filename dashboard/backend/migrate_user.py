"""
Migration script to migrate user data from old UID to new UID.

Usage:
1. Create the new user in Supabase Auth dashboard with the same email
2. Get the new user's UID from the Auth dashboard
3. Update NEW_USER_ID below with the new UID
4. Run: python migrate_user.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

OLD_USER_ID = "911caa9d-8741-459b-a52f-e98ec784bc81"
NEW_USER_ID = "5661d0d8-2430-405c-b80e-f64af655e42c"  # Fill this in after creating the new user


def migrate_user_data():
    """Migrate all user data from old UID to new UID."""

    if not NEW_USER_ID:
        print("ERROR: Please set NEW_USER_ID in the script first!")
        print("1. Create the new user in Supabase Auth dashboard")
        print("2. Copy the new user's UID")
        print("3. Update NEW_USER_ID in this script")
        return

    url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return

    client = create_client(url, service_key)

    print(f"Migrating user data from {OLD_USER_ID} to {NEW_USER_ID}")
    print("-" * 60)

    # Check what data exists for the old user
    print("\n1. Checking existing data for old user...")

    # Check projects
    projects_res = (
        client.table("projects").select("id, name").eq("user_id", OLD_USER_ID).execute()
    )
    projects = projects_res.data if projects_res.data else []
    print(f"   Found {len(projects)} projects")

    # Check API keys
    api_keys_res = (
        client.table("api_keys").select("id, name").eq("user_id", OLD_USER_ID).execute()
    )
    api_keys = api_keys_res.data if api_keys_res.data else []
    print(f"   Found {len(api_keys)} API keys")

    # Check runs
    runs_res = (
        client.table("runs").select("id, name").eq("user_id", OLD_USER_ID).execute()
    )
    runs = runs_res.data if runs_res.data else []
    print(f"   Found {len(runs)} runs")

    # Check user record
    user_res = client.table("users").select("*").eq("id", OLD_USER_ID).execute()
    user_data = user_res.data[0] if user_res.data else None
    if user_data:
        print(f"   User email: {user_data.get('email')}")
        print(f"   User name: {user_data.get('name')}")

    if not projects and not api_keys and not runs:
        print("\n   No data found for old user. Nothing to migrate.")
        return

    print("\n2. Migrating data...")

    # Update projects
    if projects:
        result = (
            client.table("projects")
            .update({"user_id": NEW_USER_ID})
            .eq("user_id", OLD_USER_ID)
            .execute()
        )
        print(f"   ✓ Updated {len(projects)} projects")

    # Update API keys
    if api_keys:
        result = (
            client.table("api_keys")
            .update({"user_id": NEW_USER_ID})
            .eq("user_id", OLD_USER_ID)
            .execute()
        )
        print(f"   ✓ Updated {len(api_keys)} API keys")

    # Update runs
    if runs:
        result = (
            client.table("runs")
            .update({"user_id": NEW_USER_ID})
            .eq("user_id", OLD_USER_ID)
            .execute()
        )
        print(f"   ✓ Updated {len(runs)} runs")

    # Update user record (copy email and name to new user record)
    # Note: The trigger should create a new public.users record when auth.users is created
    # But we need to make sure it has the right data
    if user_data:
        # Check if new user record exists
        new_user_res = client.table("users").select("*").eq("id", NEW_USER_ID).execute()
        if new_user_res.data:
            # Update existing record
            client.table("users").update(
                {"email": user_data.get("email"), "name": user_data.get("name")}
            ).eq("id", NEW_USER_ID).execute()
            print(f"   ✓ Updated user record with email and name")
        else:
            # Create new record
            client.table("users").insert(
                {
                    "id": NEW_USER_ID,
                    "email": user_data.get("email"),
                    "name": user_data.get("name"),
                }
            ).execute()
            print(f"   ✓ Created user record with email and name")

    print("\n3. Migration complete!")
    print(
        f"\n   You can now delete the old user (UID: {OLD_USER_ID}) from Supabase Auth dashboard."
    )
    print("   Note: Due to foreign key constraints, deleting the old auth.users record")
    print(
        "   will cascade delete the old public.users record, but your data is now safe!"
    )


if __name__ == "__main__":
    migrate_user_data()
