import aiosqlite
import json
from datetime import datetime
from pathlib import Path
import uuid

DB_PATH = Path(__file__).parent / "sentric.db"


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                key_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                name TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT,
                task TEXT,
                status TEXT DEFAULT 'running',
                start_time TEXT DEFAULT CURRENT_TIMESTAMP,
                end_time TEXT,
                video_path TEXT,
                video_start_time TEXT,
                laminar_trace_id TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                video_timestamp REAL,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS security_findings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                evidence TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
            );
        """
        )
        await db.commit()

        # Migration: Add password_hash column to existing users table if it doesn't exist
        try:
            cursor = await db.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in await cursor.fetchall()]
            if "password_hash" not in columns:
                await db.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
                await db.commit()
                # Set dummy hash for existing users (they'll need to reset)
                await db.execute(
                    "UPDATE users SET password_hash = ? WHERE password_hash IS NULL",
                    ("$2b$12$dummy_hash_requires_reset",),
                )
                await db.commit()
        except Exception:
            pass  # Column might already exist or table doesn't exist yet

        # Migration: Add video columns to runs table if they don't exist
        try:
            cursor = await db.execute("PRAGMA table_info(runs)")
            columns = [row[1] for row in await cursor.fetchall()]
            if "video_path" not in columns:
                await db.execute("ALTER TABLE runs ADD COLUMN video_path TEXT")
            if "video_start_time" not in columns:
                await db.execute("ALTER TABLE runs ADD COLUMN video_start_time TEXT")
            if "laminar_trace_id" not in columns:
                await db.execute("ALTER TABLE runs ADD COLUMN laminar_trace_id TEXT")
            if "user_id" not in columns:
                await db.execute("ALTER TABLE runs ADD COLUMN user_id TEXT")
                await db.commit()

            # Always try to backfill NULL user_ids from associated projects
            await db.execute(
                """
                UPDATE runs 
                SET user_id = (SELECT user_id FROM projects WHERE projects.id = runs.project_id)
                WHERE user_id IS NULL
                """
            )
            await db.commit()
        except Exception:
            pass

        # Migration: Add video_timestamp column to events table if it doesn't exist
        try:
            cursor = await db.execute("PRAGMA table_info(events)")
            columns = [row[1] for row in await cursor.fetchall()]
            if "video_timestamp" not in columns:
                await db.execute("ALTER TABLE events ADD COLUMN video_timestamp REAL")
            await db.commit()
        except Exception:
            pass


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    await db.execute("PRAGMA foreign_keys = ON")
    return db


# Seed demo data
async def seed_demo_data():
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if demo user exists
        cursor = await db.execute("SELECT id FROM users WHERE id = 'user_demo'")
        if await cursor.fetchone():
            return

        # Create demo user (password: demo123)
        try:
            import bcrypt

            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw("demo123".encode("utf-8"), salt).decode(
                "utf-8"
            )
            await db.execute(
                "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
                ("user_demo", "demo@sentric.ai", password_hash, "Demo User"),
            )
        except ImportError:
            # Fallback if bcrypt not installed during init
            password_hash = "$2b$12$dummy"  # Dummy hash - user will need to reset
            await db.execute(
                "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
                ("user_demo", "demo@sentric.ai", password_hash, "Demo User"),
            )

        # Create demo project
        await db.execute(
            "INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)",
            ("proj_demo", "user_demo", "Demo Project"),
        )

        # Create demo API key (key: sk_demo_123456)
        await db.execute(
            "INSERT INTO api_keys (id, key_hash, user_id, project_id, name) VALUES (?, ?, ?, ?, ?)",
            ("key_demo", "sk_demo_123456", "user_demo", "proj_demo", "Demo Key"),
        )

        await db.commit()
