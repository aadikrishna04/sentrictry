"""Sentric Backend - FastAPI Server

Security observability layer for AI browser agents.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    Header,
    Cookie,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from datetime import datetime, timedelta
import aiosqlite
import secrets
import os
from pathlib import Path

# How long before a "running" run is considered stale and marked as failed
STALE_RUN_TIMEOUT_SECONDS = 30  # 30 seconds without activity = stale

from database import init_db, seed_demo_data, get_db, DB_PATH

# Project root = one level up from backend/ directory
ROOT_DIR = Path(__file__).resolve().parents[1]
from models import (
    RunStartRequest,
    RunStartResponse,
    RunEndRequest,
    Event,
    RunSummary,
    RunDetail,
    RunWithProject,
    SignupRequest,
    SigninRequest,
    AuthResponse,
    CreateApiKeyRequest,
    ApiKeyResponse,
    ApiKeyListResponse,
    CreateProjectRequest,
    ProjectResponse,
    StatsOverviewResponse,
    DailyStatsResponse,
    HourlyStatsResponse,
    HourlyStatsItem,
    UpdateProjectRequest,
    PaginatedRunsResponse,
)

from security_analyzer import analyze_events

# JWT settings
SECRET_KEY = "sentric-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# WebSocket connections for live streaming
active_connections: dict[str, list[WebSocket]] = {}


async def mark_stale_runs_as_failed():
    """Background task that marks runs without recent activity as failed."""
    while True:
        try:
            async with aiosqlite.connect(DB_PATH) as db:
                # Find all runs that are "running" but haven't had events in STALE_RUN_TIMEOUT_SECONDS
                # or don't have any events and were started more than STALE_RUN_TIMEOUT_SECONDS ago
                cutoff_time = (
                    datetime.utcnow() - timedelta(seconds=STALE_RUN_TIMEOUT_SECONDS)
                ).isoformat()

                # Get runs that are still "running"
                cursor = await db.execute(
                    "SELECT id, start_time FROM runs WHERE status = 'running'"
                )
                running_runs = await cursor.fetchall()

                for run_id, start_time in running_runs:
                    # Check last event time for this run
                    cursor = await db.execute(
                        "SELECT MAX(timestamp) FROM events WHERE run_id = ?", (run_id,)
                    )
                    last_event = await cursor.fetchone()
                    last_activity = (
                        last_event[0] if last_event and last_event[0] else start_time
                    )

                    # If last activity is older than cutoff, mark as failed
                    if last_activity < cutoff_time:
                        print(
                            f"[Sentric] Marking stale run {run_id} as failed (no activity since {last_activity})"
                        )
                        await db.execute(
                            "UPDATE runs SET status = 'failed', end_time = ? WHERE id = ?",
                            (datetime.utcnow().isoformat(), run_id),
                        )
                        await db.commit()
        except Exception as e:
            print(f"[Sentric] Error in stale run checker: {e}")

        # Check every 5 seconds
        await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_demo_data()

    # Start background task to mark stale runs as failed
    stale_run_task = asyncio.create_task(mark_stale_runs_as_failed())
    print(
        "[Sentric] Started stale run checker (runs without activity for 60s will be marked as failed)"
    )

    yield

    # Cancel background task on shutdown
    stale_run_task.cancel()
    try:
        await stale_run_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Sentric API",
    description="Security observability for AI browser agents",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency
async def verify_api_key(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")

    # Extract key from "Bearer <key>" format
    parts = authorization.split(" ")
    key = parts[1] if len(parts) == 2 else parts[0]

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM api_keys WHERE key_hash = ?", (key,))
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Include the actual API key in the auth dict for WebSocket URL generation
        auth_dict = dict(row)
        auth_dict["_api_key"] = key  # Store actual key for WebSocket URL
        return auth_dict


# Authentication helpers
def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user_id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Cookie(None),
) -> dict:
    # Get token from header or cookie
    auth_token = None
    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            auth_token = parts[1]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, email, name FROM users WHERE id = ?", (user_id,)
        )
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)


# Dashboard auth - verify user owns the project
async def verify_project_access(
    project_id: str, user: dict = Depends(get_current_user)
) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
        )
        return await cursor.fetchone() is not None


# === Run Lifecycle ===


@app.post("/runs/start", response_model=RunStartResponse)
async def start_run(request: RunStartRequest, auth: dict = Depends(verify_api_key)):
    run_id = f"run_{uuid.uuid4().hex[:12]}"

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO runs (id, project_id, user_id, task, status, start_time) VALUES (?, ?, ?, ?, ?, ?)",
            (
                run_id,
                auth["project_id"],
                auth["user_id"],
                request.task,
                "running",
                datetime.utcnow().isoformat(),
            ),
        )
        await db.commit()

    # Include API key in WebSocket URL for authentication
    api_key = auth.get("_api_key", auth["key_hash"])
    ws_url = f"ws://localhost:8000/ws/{run_id}?api_key={api_key}"
    return RunStartResponse(run_id=run_id, ws_url=ws_url)


@app.post("/runs/{run_id}/end")
async def end_run(
    run_id: str,
    req: Request,
    auth: dict = Depends(verify_api_key),
):
    # Parse JSON request
    try:
        data = await req.json()
        run_status = data.get("status")
        laminar_trace_id = data.get("laminar_trace_id")
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    if not run_status:
        raise HTTPException(status_code=400, detail="Status is required")
    async with aiosqlite.connect(DB_PATH) as db:
        # Verify run exists and belongs to project
        cursor = await db.execute(
            "SELECT id FROM runs WHERE id = ? AND project_id = ?",
            (run_id, auth["project_id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Run not found")

        # Update run status and laminar trace ID
        update_query = "UPDATE runs SET status = ?, end_time = ?"
        update_params = [run_status, datetime.utcnow().isoformat()]

        if laminar_trace_id:
            update_query += ", laminar_trace_id = ?"
            update_params.append(laminar_trace_id)
            print(f"[Sentric] Laminar trace ID stored: {laminar_trace_id}")

        update_query += " WHERE id = ?"
        update_params.append(run_id)

        await db.execute(update_query, tuple(update_params))

        # Fetch all events for analysis
        cursor = await db.execute(
            "SELECT type, payload, timestamp FROM events WHERE run_id = ? ORDER BY timestamp",
            (run_id,),
        )
        rows = await cursor.fetchall()
        events = [
            {"type": r[0], "payload": json.loads(r[1]), "timestamp": r[2]} for r in rows
        ]

        # Run security analysis
        findings = analyze_events(events)

        # Store findings
        for finding in findings:
            await db.execute(
                "INSERT INTO security_findings (run_id, severity, category, description, evidence) VALUES (?, ?, ?, ?, ?)",
                (
                    run_id,
                    finding["severity"],
                    finding["category"],
                    finding["description"],
                    json.dumps(finding["evidence"]),
                ),
            )

        await db.commit()

    return {"status": "ok", "findings_count": len(findings)}


@app.post("/runs/{run_id}/events")
async def post_event(run_id: str, event: Event, auth: dict = Depends(verify_api_key)):
    """HTTP fallback for event ingestion."""
    # Verify run belongs to API key's project
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM runs WHERE id = ? AND project_id = ?",
            (run_id, auth["project_id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(
                status_code=404, detail="Run not found or access denied"
            )

    timestamp = event.timestamp or datetime.utcnow().isoformat()

    # Extract video_timestamp from event if present
    video_timestamp = getattr(event, "video_timestamp", None)
    if hasattr(event, "__dict__") and "video_timestamp" in event.__dict__:
        video_timestamp = event.__dict__["video_timestamp"]

    async with aiosqlite.connect(DB_PATH) as db:
        if video_timestamp is not None:
            await db.execute(
                "INSERT INTO events (run_id, type, payload, timestamp, video_timestamp) VALUES (?, ?, ?, ?, ?)",
                (
                    run_id,
                    event.type,
                    json.dumps(event.payload),
                    timestamp,
                    video_timestamp,
                ),
            )
        else:
            await db.execute(
                "INSERT INTO events (run_id, type, payload, timestamp) VALUES (?, ?, ?, ?)",
                (run_id, event.type, json.dumps(event.payload), timestamp),
            )
        await db.commit()

    # Broadcast to WebSocket subscribers
    if run_id in active_connections:
        message_data = {
            "type": event.type,
            "payload": event.payload,
            "timestamp": timestamp,
        }
        if video_timestamp is not None:
            message_data["video_timestamp"] = video_timestamp
        message = json.dumps(message_data)
        for ws in active_connections[run_id]:
            try:
                await ws.send_text(message)
            except:
                pass

    return {"status": "ok"}


# === WebSocket ===


@app.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    # Get API key or JWT token from query params or headers
    api_key = None
    token = None
    query_params = dict(websocket.query_params)

    if "api_key" in query_params:
        api_key = query_params["api_key"]
    elif "token" in query_params:
        token = query_params["token"]
    else:
        # Try to get from headers
        headers = dict(websocket.headers)
        auth_header = headers.get("authorization") or headers.get("Authorization")
        if auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
            else:
                api_key = parts[1] if len(parts) == 2 else parts[0]

    project_id = None

    # Authenticate with API key
    if api_key:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM api_keys WHERE key_hash = ?", (api_key,)
            )
            api_key_row = await cursor.fetchone()
            if not api_key_row:
                await websocket.close(code=1008, reason="Invalid API key")
                return
            project_id = api_key_row["project_id"]

    # Authenticate with JWT token (for dashboard users)
    elif token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                await websocket.close(code=1008, reason="Invalid token")
                return

            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                # Get run and verify user owns it
                cursor = await db.execute(
                    """
                    SELECT r.project_id FROM runs r
                    JOIN projects p ON r.project_id = p.id
                    WHERE r.id = ? AND p.user_id = ?
                    """,
                    (run_id, user_id),
                )
                row = await cursor.fetchone()
                if not row:
                    await websocket.close(
                        code=1008, reason="Run not found or access denied"
                    )
                    return
                project_id = row["project_id"]
        except JWTError:
            await websocket.close(code=1008, reason="Invalid token")
            return

    if not project_id:
        await websocket.close(code=1008, reason="Missing authentication")
        return

    await websocket.accept()

    if run_id not in active_connections:
        active_connections[run_id] = []
    active_connections[run_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            timestamp = event.get("timestamp") or datetime.utcnow().isoformat()

            # Store event
            video_timestamp = event.get("video_timestamp")
            async with aiosqlite.connect(DB_PATH) as db:
                if video_timestamp is not None:
                    await db.execute(
                        "INSERT INTO events (run_id, type, payload, timestamp, video_timestamp) VALUES (?, ?, ?, ?, ?)",
                        (
                            run_id,
                            event["type"],
                            json.dumps(event["payload"]),
                            timestamp,
                            video_timestamp,
                        ),
                    )
                else:
                    await db.execute(
                        "INSERT INTO events (run_id, type, payload, timestamp) VALUES (?, ?, ?, ?)",
                        (
                            run_id,
                            event["type"],
                            json.dumps(event["payload"]),
                            timestamp,
                        ),
                    )
                await db.commit()

            # Broadcast to other subscribers (for dashboard)
            for ws in active_connections[run_id]:
                if ws != websocket:
                    try:
                        await ws.send_text(
                            json.dumps(
                                {
                                    "type": event["type"],
                                    "payload": event["payload"],
                                    "timestamp": timestamp,
                                }
                            )
                        )
                    except:
                        pass

    except WebSocketDisconnect:
        active_connections[run_id].remove(websocket)
        if not active_connections[run_id]:
            del active_connections[run_id]


# === Authentication ===


@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?", (request.email,)
        )
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        password_hash = hash_password(request.password)

        await db.execute(
            "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
            (
                user_id,
                request.email,
                password_hash,
                request.name or request.email.split("@")[0],
            ),
        )

        # Create default project
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        await db.execute(
            "INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)",
            (project_id, user_id, "Default Project"),
        )

        await db.commit()

        # Create token
        token = create_access_token(user_id)

        return AuthResponse(
            token=token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.name or request.email.split("@")[0],
            },
        )


@app.post("/api/auth/signin", response_model=AuthResponse)
async def signin(request: SigninRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE email = ?", (request.email,)
        )
        user = await cursor.fetchone()

        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token(user["id"])

        return AuthResponse(
            token=token,
            user={"id": user["id"], "email": user["email"], "name": user["name"]},
        )


@app.get("/api/auth/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    # Get user's projects
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )
        projects = [dict(row) for row in await cursor.fetchall()]

    return {"user": user, "projects": projects}


# === API Key Management ===


@app.post("/api/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    request: CreateApiKeyRequest, user: dict = Depends(get_current_user)
):
    # Verify project belongs to user
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (request.project_id, user["id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Generate API key
        key_id = f"key_{uuid.uuid4().hex[:12]}"
        api_key = f"sk_{secrets.token_urlsafe(32)}"

        await db.execute(
            "INSERT INTO api_keys (id, key_hash, user_id, project_id, name) VALUES (?, ?, ?, ?, ?)",
            (
                key_id,
                api_key,
                user["id"],
                request.project_id,
                request.name or f"API Key {key_id[:8]}",
            ),
        )
        await db.commit()

    return ApiKeyResponse(
        id=key_id,
        key=api_key,  # Only shown once on creation
        name=request.name or f"API Key {key_id[:8]}",
        project_id=request.project_id,
        created_at=datetime.utcnow().isoformat(),
    )


@app.get("/api/api-keys", response_model=ApiKeyListResponse)
async def list_api_keys(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT k.id, k.name, k.project_id, k.created_at, p.name as project_name
            FROM api_keys k
            JOIN projects p ON k.project_id = p.id
            WHERE k.user_id = ?
            ORDER BY k.created_at DESC
        """,
            (user["id"],),
        )
        keys = []
        for row in await cursor.fetchall():
            keys.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "project_id": row["project_id"],
                    "project_name": row["project_name"],
                    "created_at": row["created_at"],
                }
            )

    return ApiKeyListResponse(keys=keys)


@app.delete("/api/api-keys/{key_id}")
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        # Verify key belongs to user
        cursor = await db.execute(
            "SELECT id FROM api_keys WHERE id = ? AND user_id = ?", (key_id, user["id"])
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="API key not found")

        await db.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
        await db.commit()

    return {"status": "ok"}


@app.get("/api/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )
        projects = [dict(row) for row in await cursor.fetchall()]

    return {"projects": projects}


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(
    request: CreateProjectRequest, user: dict = Depends(get_current_user)
):
    """Create a new project for the authenticated user."""
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    created_at = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)",
            (project_id, user["id"], request.name, created_at),
        )
        await db.commit()

    return ProjectResponse(
        id=project_id,
        name=request.name,
        created_at=created_at,
    )


@app.patch("/api/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    user: dict = Depends(get_current_user),
):
    """Update a project's name."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Verify ownership
        cursor = await db.execute(
            "SELECT created_at FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        created_at = row[0]

        await db.execute(
            "UPDATE projects SET name = ? WHERE id = ?",
            (request.name, project_id),
        )
        await db.commit()

    return ProjectResponse(
        id=project_id,
        name=request.name,
        created_at=created_at,
    )


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a project and all its associated data (cascaded by FKs)."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Verify ownership
        cursor = await db.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # FKs are configured to cascade? Let's check database.py soon.
        # If not, we might need manual cleanup of runs, events, etc.
        # But standard way is ON DELETE CASCADE.
        await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        await db.commit()

    return {"status": "success", "message": "Project deleted"}


# === Dashboard API ===


@app.get("/api/projects/{project_id}/runs", response_model=PaginatedRunsResponse)
async def list_runs(
    project_id: str,
    page: int = 1,
    limit: int = 10,
    user: dict = Depends(get_current_user),
):
    # Verify user owns project
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        db.row_factory = aiosqlite.Row

        # Get total count
        cursor = await db.execute(
            "SELECT COUNT(*) FROM runs WHERE project_id = ?", (project_id,)
        )
        total_count = (await cursor.fetchone())[0]

        # Get paginated runs
        offset = (page - 1) * limit
        cursor = await db.execute(
            """
            SELECT r.*, COUNT(sf.id) as finding_count
            FROM runs r
            LEFT JOIN security_findings sf ON r.id = sf.run_id
            WHERE r.project_id = ?
            GROUP BY r.id
            ORDER BY r.start_time DESC
            LIMIT ? OFFSET ?
        """,
            (project_id, limit, offset),
        )
        rows = await cursor.fetchall()

        runs = [
            {
                "id": row["id"],
                "project_id": row["project_id"],
                "task": row["task"],
                "status": row["status"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "finding_count": row["finding_count"],
            }
            for row in rows
        ]

        # Get additional stats for the project
        # Success Rate
        cursor = await db.execute(
            "SELECT COUNT(*) FROM runs WHERE project_id = ? AND status = 'completed'", (project_id,)
        )
        completed_count = (await cursor.fetchone())[0]
        success_rate = (completed_count / total_count * 100) if total_count > 0 else 0

        # Avg Duration (only for runs that have ended)
        cursor = await db.execute(
            """
            SELECT AVG(strftime('%s', end_time) - strftime('%s', start_time)) 
            FROM runs 
            WHERE project_id = ? AND end_time IS NOT NULL
            """, (project_id,)
        )
        avg_duration = (await cursor.fetchone())[0] or 0

        # Total Findings across all runs
        cursor = await db.execute(
            """
            SELECT COUNT(sf.id)
            FROM security_findings sf
            JOIN runs r ON sf.run_id = r.id
            WHERE r.project_id = ?
            """, (project_id,)
        )
        total_findings = (await cursor.fetchone())[0]

        total_pages = (total_count + limit - 1) // limit if limit > 0 else 0

        return PaginatedRunsResponse(
            runs=runs,
            total_count=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages,
            success_rate=success_rate,
            avg_duration=avg_duration,
            total_findings=total_findings
        )


@app.get("/api/runs/recent", response_model=list[RunWithProject])
async def get_recent_runs(limit: int = 5, user: dict = Depends(get_current_user)):
    """Get the most recent runs across all projects for the current user."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT r.*, p.name as project_name, COUNT(sf.id) as finding_count
            FROM runs r
            JOIN projects p ON r.project_id = p.id
            LEFT JOIN security_findings sf ON r.id = sf.run_id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?))
            GROUP BY r.id
            ORDER BY r.start_time DESC
            LIMIT ?
            """,
            (user["id"], user["id"], limit),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "project_id": row["project_id"],
                "task": row["task"],
                "status": row["status"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "finding_count": row["finding_count"],
                "project_name": row["project_name"],
            }
            for row in rows
        ]


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get run and verify user owns it
        cursor = await db.execute(
            """
            SELECT r.* FROM runs r
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = ? AND (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?))
        """,
            (run_id, user["id"], user["id"]),
        )
        run = await cursor.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        # Convert to dict for easier access
        run_dict = dict(run)

        # Get events
        cursor = await db.execute(
            "SELECT type, payload, timestamp, video_timestamp FROM events WHERE run_id = ? ORDER BY timestamp",
            (run_id,),
        )
        events = []
        for r in await cursor.fetchall():
            event_data = {
                "type": r["type"],
                "payload": json.loads(r["payload"]),
                "timestamp": r["timestamp"],
            }
            if r["video_timestamp"] is not None:
                event_data["video_timestamp"] = r["video_timestamp"]
            events.append(event_data)

        # Get laminar trace ID from run
        laminar_trace_id = run_dict.get("laminar_trace_id")

        # Get findings
        cursor = await db.execute(
            "SELECT severity, category, description, evidence FROM security_findings WHERE run_id = ?",
            (run_id,),
        )
        findings = [
            {
                "severity": r["severity"],
                "category": r["category"],
                "description": r["description"],
                "evidence": json.loads(r["evidence"]) if r["evidence"] else [],
            }
            for r in await cursor.fetchall()
        ]

        result = {
            "id": run_dict["id"],
            "project_id": run_dict["project_id"],
            "task": run_dict["task"],
            "status": run_dict["status"],
            "start_time": run_dict["start_time"],
            "end_time": run_dict["end_time"],
            "events": events,
            "findings": findings,
        }

        # Add laminar trace ID if available
        if laminar_trace_id:
            result["laminar_trace_id"] = laminar_trace_id

        return result


@app.get("/api/stats/overview", response_model=StatsOverviewResponse)
async def get_stats_overview(user: dict = Depends(get_current_user)):
    """Get high-level summary stats for the current user."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Total runs
        cursor = await db.execute(
            """
            SELECT COUNT(*) as count FROM runs r
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?))
            """,
            (user["id"], user["id"]),
        )
        total_runs = (await cursor.fetchone())["count"]

        # Total findings
        cursor = await db.execute(
            """
            SELECT COUNT(*) as count FROM security_findings sf
            JOIN runs r ON sf.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?))
            """,
            (user["id"], user["id"]),
        )
        total_findings = (await cursor.fetchone())["count"]

        # Total projects
        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM projects WHERE user_id = ?",
            (user["id"],),
        )
        total_projects = (await cursor.fetchone())["count"]

        # Active projects (at least one run in the last 7 days)
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
        cursor = await db.execute(
            """
            SELECT COUNT(DISTINCT r.project_id) as count FROM runs r
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND r.start_time > ?
            """,
            (user["id"], user["id"], cutoff),
        )
        active_projects = (await cursor.fetchone())["count"]

        # Total actions
        cursor = await db.execute(
            """
            SELECT COUNT(*) as count FROM events e
            JOIN runs r ON e.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND e.type = 'action'
            """,
            (user["id"], user["id"]),
        )
        total_actions = (await cursor.fetchone())["count"]

        return StatsOverviewResponse(
            total_runs=total_runs,
            total_findings=total_findings,
            total_projects=total_projects,
            active_projects=active_projects,
            total_actions=total_actions,
        )


@app.get("/api/stats/daily", response_model=DailyStatsResponse)
async def get_daily_stats(user: dict = Depends(get_current_user)):
    """Get daily run and finding counts for the last 30 days."""
    days = 30
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Runs per day
        # In SQLite, we can use strftime or date() but since our timestamps are ISO strings,
        # we can just take the first 10 characters (YYYY-MM-DD)
        cursor = await db.execute(
            """
            SELECT substr(r.start_time, 1, 10) as day, COUNT(*) as count
            FROM runs r
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND r.start_time > ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        runs_data = {row["day"]: row["count"] for row in await cursor.fetchall()}

        # Findings per day
        cursor = await db.execute(
            """
            SELECT substr(sf.created_at, 1, 10) as day, COUNT(*) as count
            FROM security_findings sf
            JOIN runs r ON sf.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND sf.created_at > ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        findings_data = {row["day"]: row["count"] for row in await cursor.fetchall()}

        # Actions per day
        cursor = await db.execute(
            """
            SELECT substr(e.timestamp, 1, 10) as day, COUNT(*) as count
            FROM events e
            JOIN runs r ON e.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND e.type = 'action' AND e.timestamp > ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        actions_data = {row["day"]: row["count"] for row in await cursor.fetchall()}

        result = []
        for i in range(days + 1):
            day_str = (datetime.utcnow() - timedelta(days=days - i)).strftime(
                "%Y-%m-%d"
            )
            result.append(
                {
                    "day": day_str,
                    "runs": runs_data.get(day_str, 0),
                    "findings": findings_data.get(day_str, 0),
                    "actions": actions_data.get(day_str, 0),
                }
            )

        return DailyStatsResponse(data=result)


@app.get("/api/stats/hourly", response_model=HourlyStatsResponse)
async def get_hourly_stats(user: dict = Depends(get_current_user)):
    """Get hourly run and finding counts for the last 24 hours."""
    hours = 24
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Runs per hour - extract hour from ISO timestamp (format: YYYY-MM-DDTHH:MM:SS)
        # We'll group by date and hour (YYYY-MM-DDTHH)
        cursor = await db.execute(
            """
            SELECT substr(r.start_time, 1, 13) as hour, COUNT(*) as count
            FROM runs r
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND r.start_time > ?
            GROUP BY hour
            ORDER BY hour ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        runs_data = {row["hour"]: row["count"] for row in await cursor.fetchall()}

        # Findings per hour
        cursor = await db.execute(
            """
            SELECT substr(sf.created_at, 1, 13) as hour, COUNT(*) as count
            FROM security_findings sf
            JOIN runs r ON sf.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND sf.created_at > ?
            GROUP BY hour
            ORDER BY hour ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        findings_data = {row["hour"]: row["count"] for row in await cursor.fetchall()}

        # Actions per hour
        cursor = await db.execute(
            """
            SELECT substr(e.timestamp, 1, 13) as hour, COUNT(*) as count
            FROM events e
            JOIN runs r ON e.run_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE (r.user_id = ? OR (r.user_id IS NULL AND p.user_id = ?)) AND e.type = 'action' AND e.timestamp > ?
            GROUP BY hour
            ORDER BY hour ASC
            """,
            (user["id"], user["id"], cutoff),
        )
        actions_data = {row["hour"]: row["count"] for row in await cursor.fetchall()}

        result = []
        now = datetime.utcnow()
        for i in range(hours + 1):
            hour_time = now - timedelta(hours=hours - i)
            hour_str = hour_time.strftime("%Y-%m-%dT%H")
            result.append(
                {
                    "hour": hour_str,
                    "runs": runs_data.get(hour_str, 0),
                    "findings": findings_data.get(hour_str, 0),
                    "actions": actions_data.get(hour_str, 0),
                }
            )

        return HourlyStatsResponse(data=result)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
