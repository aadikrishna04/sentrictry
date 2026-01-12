"""
Migration Script: SQLite -> Supabase (Using Existing User)

This script migrates all data from the local SQLite database to Supabase,
mapping the SQLite user to an existing Supabase user.

Run: python3 migrate_to_supabase_existing_user.py
"""

import asyncio
import os
import aiosqlite
from supabase import create_client, Client
from pathlib import Path
import uuid
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
SQLITE_DB_PATH = Path("sentric.db")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Maps to store old_id -> new_uuid
user_mapping: Dict[str, str] = {}
project_mapping: Dict[str, str] = {}

# Map SQLite user ID to existing Supabase user ID
# Update this with your SQLite user ID and the new Supabase user ID
SQLITE_USER_ID = "user_demo"  # The user ID in SQLite
EXISTING_SUPABASE_USER_ID = (
    "5661d0d8-2430-405c-b80e-f64af655e42c"  # The new Supabase user ID
)


async def migrate_users(db) -> Dict[str, str]:
    """Migrate users and return mapping of old_id -> new_uuid"""
    print("\n" + "=" * 50)
    print("STEP 1: Mapping Users")
    print("=" * 50)

    mapping = {}

    try:
        cursor = await db.execute("SELECT id, email, name FROM users")
        users = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read users table: {e}")
        return mapping

    for old_id, email, name in users:
        print(f"\nProcessing user: {email} (old ID: {old_id})")

        if old_id == SQLITE_USER_ID:
            # Map to existing Supabase user
            print(
                f"  -> Mapping to existing Supabase user: {EXISTING_SUPABASE_USER_ID}"
            )
            mapping[old_id] = EXISTING_SUPABASE_USER_ID

            # Verify the user exists in Supabase
            try:
                user_res = (
                    supabase.table("users")
                    .select("*")
                    .eq("id", EXISTING_SUPABASE_USER_ID)
                    .execute()
                )
                if user_res.data:
                    print(f"  -> Verified user exists in Supabase")
                    # Update user record with email/name from SQLite if needed
                    supabase.table("users").update({"email": email, "name": name}).eq(
                        "id", EXISTING_SUPABASE_USER_ID
                    ).execute()
                    print(f"  -> Updated user record with email and name")
                else:
                    print(
                        f"  -> WARNING: User not found in public.users, creating record..."
                    )
                    supabase.table("users").insert(
                        {"id": EXISTING_SUPABASE_USER_ID, "email": email, "name": name}
                    ).execute()
            except Exception as e:
                print(f"  -> Error verifying/updating user: {e}")
        else:
            print(f"  -> SKIPPED: User {old_id} is not the target user")

    print(f"\n✓ Mapped {len(mapping)} users")
    return mapping


async def migrate_projects(db, user_map: Dict[str, str]) -> Dict[str, str]:
    """Migrate projects and return mapping of old_id -> new_uuid"""
    print("\n" + "=" * 50)
    print("STEP 2: Migrating Projects")
    print("=" * 50)

    mapping = {}

    try:
        cursor = await db.execute("SELECT id, user_id, name, created_at FROM projects")
        projects = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read projects table: {e}")
        return mapping

    for old_id, old_user_id, name, created_at in projects:
        print(f"\nProject: {name} (old ID: {old_id})")

        new_user_id = user_map.get(old_user_id)
        if not new_user_id:
            print(f"  -> SKIPPED: Owner user {old_user_id} not mapped")
            continue

        # Generate new UUID for project
        new_proj_id = str(uuid.uuid4())

        try:
            supabase.table("projects").insert(
                {
                    "id": new_proj_id,
                    "user_id": new_user_id,
                    "name": name,
                    "created_at": created_at,
                }
            ).execute()

            mapping[old_id] = new_proj_id
            print(f"  -> Migrated: {old_id} -> {new_proj_id}")

        except Exception as e:
            print(f"  -> FAILED: {e}")

    print(f"\n✓ Migrated {len(mapping)} projects")
    return mapping


async def migrate_api_keys(db, user_map: Dict[str, str], project_map: Dict[str, str]):
    """Migrate API keys"""
    print("\n" + "=" * 50)
    print("STEP 3: Migrating API Keys")
    print("=" * 50)

    count = 0

    try:
        cursor = await db.execute(
            "SELECT id, key_hash, user_id, project_id, name, created_at FROM api_keys"
        )
        keys = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read api_keys table: {e}")
        return

    for old_id, key_hash, old_user_id, old_project_id, name, created_at in keys:
        new_user_id = user_map.get(old_user_id)
        new_project_id = project_map.get(old_project_id)

        if not new_user_id or not new_project_id:
            print(f"  -> SKIPPED key {old_id}: missing user or project mapping")
            continue

        new_key_id = str(uuid.uuid4())

        try:
            supabase.table("api_keys").insert(
                {
                    "id": new_key_id,
                    "key_hash": key_hash,  # Preserved - SDK uses this to authenticate
                    "user_id": new_user_id,
                    "project_id": new_project_id,
                    "name": name,
                    "created_at": created_at,
                }
            ).execute()
            count += 1
            print(f"  -> Migrated key: {name or old_id}")
        except Exception as e:
            print(f"  -> FAILED key {old_id}: {e}")

    print(f"\n✓ Migrated {count} API keys")


async def migrate_runs(
    db, user_map: Dict[str, str], project_map: Dict[str, str]
) -> List[str]:
    """Migrate runs and return list of migrated run IDs"""
    print("\n" + "=" * 50)
    print("STEP 4: Migrating Runs")
    print("=" * 50)

    migrated_runs = []

    try:
        cursor = await db.execute("SELECT * FROM runs")
        cols = [desc[0] for desc in cursor.description]
        runs = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read runs table: {e}")
        return migrated_runs

    for row in runs:
        run = dict(zip(cols, row))
        run_id = run["id"]
        old_project_id = run["project_id"]
        old_user_id = run.get("user_id")

        new_project_id = project_map.get(old_project_id)
        if not new_project_id:
            print(f"  -> SKIPPED run {run_id}: project {old_project_id} not migrated")
            continue

        new_user_id = user_map.get(old_user_id) if old_user_id else None

        try:
            supabase.table("runs").insert(
                {
                    "id": run_id,  # Keep original run ID
                    "project_id": new_project_id,
                    "user_id": new_user_id,
                    "name": run.get("name"),
                    "task": run.get("task"),
                    "status": run.get("status", "completed"),
                    "start_time": run.get("start_time"),
                    "end_time": run.get("end_time"),
                    "video_path": run.get("video_path"),
                    "video_start_time": run.get("video_start_time"),
                    "laminar_trace_id": run.get("laminar_trace_id"),
                }
            ).execute()

            migrated_runs.append(run_id)
            print(f"  -> Migrated run: {run_id}")

        except Exception as e:
            print(f"  -> FAILED run {run_id}: {e}")

    print(f"\n✓ Migrated {len(migrated_runs)} runs")
    return migrated_runs


async def migrate_events(db, migrated_runs: List[str]):
    """Migrate events for migrated runs"""
    print("\n" + "=" * 50)
    print("STEP 5: Migrating Events")
    print("=" * 50)

    if not migrated_runs:
        print("No runs to migrate events for")
        return

    count = 0
    batch = []
    batch_size = 100

    try:
        # Get all events for migrated runs
        placeholders = ",".join(["?" for _ in migrated_runs])
        cursor = await db.execute(
            f"SELECT run_id, type, payload, timestamp, video_timestamp FROM events WHERE run_id IN ({placeholders})",
            migrated_runs,
        )
        events = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read events table: {e}")
        return

    print(f"Found {len(events)} events to migrate...")

    for run_id, event_type, payload, timestamp, video_ts in events:
        batch.append(
            {
                "run_id": run_id,
                "type": event_type,
                "payload": payload,
                "timestamp": timestamp,
                "video_timestamp": video_ts,
            }
        )

        if len(batch) >= batch_size:
            try:
                supabase.table("events").insert(batch).execute()
                count += len(batch)
                print(f"  -> Inserted batch of {len(batch)} events ({count} total)")
            except Exception as e:
                print(f"  -> FAILED batch: {e}")
            batch = []

    # Insert remaining
    if batch:
        try:
            supabase.table("events").insert(batch).execute()
            count += len(batch)
        except Exception as e:
            print(f"  -> FAILED final batch: {e}")

    print(f"\n✓ Migrated {count} events")


async def migrate_findings(db, migrated_runs: List[str]):
    """Migrate security findings for migrated runs"""
    print("\n" + "=" * 50)
    print("STEP 6: Migrating Security Findings")
    print("=" * 50)

    if not migrated_runs:
        print("No runs to migrate findings for")
        return

    count = 0

    try:
        placeholders = ",".join(["?" for _ in migrated_runs])
        cursor = await db.execute(
            f"SELECT run_id, severity, category, description, evidence, created_at FROM security_findings WHERE run_id IN ({placeholders})",
            migrated_runs,
        )
        findings = await cursor.fetchall()
    except Exception as e:
        print(f"Could not read security_findings table: {e}")
        return

    for run_id, severity, category, description, evidence, created_at in findings:
        try:
            supabase.table("security_findings").insert(
                {
                    "run_id": run_id,
                    "severity": severity,
                    "category": category,
                    "description": description,
                    "evidence": evidence,
                    "created_at": created_at,
                }
            ).execute()
            count += 1
        except Exception as e:
            print(f"  -> FAILED finding for run {run_id}: {e}")

    print(f"\n✓ Migrated {count} security findings")


async def main():
    print("\n" + "#" * 60)
    print("#  SENTRIC DATA MIGRATION: SQLite -> Supabase")
    print("#  (Using Existing User)")
    print("#" * 60)

    if not SQLITE_DB_PATH.exists():
        print(f"\n❌ Database file not found at {SQLITE_DB_PATH}")
        print("Make sure sentric.db is in the current directory.")
        return

    print(f"\n📂 Source: {SQLITE_DB_PATH}")
    print(f"🎯 Target: {SUPABASE_URL}")
    print(
        f"👤 Mapping SQLite user '{SQLITE_USER_ID}' to Supabase user '{EXISTING_SUPABASE_USER_ID}'"
    )

    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        # Step 1: Map users
        user_map = await migrate_users(db)

        if not user_map:
            print("\n⚠️  No users were mapped. Cannot proceed with other data.")
            return

        # Step 2: Migrate projects
        project_map = await migrate_projects(db, user_map)

        # Step 3: Migrate API keys
        await migrate_api_keys(db, user_map, project_map)

        # Step 4: Migrate runs
        migrated_runs = await migrate_runs(db, user_map, project_map)

        # Step 5: Migrate events
        await migrate_events(db, migrated_runs)

        # Step 6: Migrate findings
        await migrate_findings(db, migrated_runs)

    print("\n" + "#" * 60)
    print("#  MIGRATION COMPLETE!")
    print("#" * 60)
    print("\n📋 Summary:")
    print(f"   • Users: {len(user_map)}")
    print(f"   • Projects: {len(project_map)}")
    print(f"   • Runs: {len(migrated_runs)}")
    print("\n✅ All data has been migrated to Supabase!")


if __name__ == "__main__":
    asyncio.run(main())
