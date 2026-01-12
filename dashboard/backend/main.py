"""Sentric Backend - FastAPI Server

Security observability layer for AI browser agents.
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timedelta
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
import secrets
from pathlib import Path

# How long before a "running" run is considered stale and marked as failed
STALE_RUN_TIMEOUT_SECONDS = 30  # 30 seconds without activity = stale

from database import get_db

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

# WebSocket connections for live streaming
active_connections: dict[str, list[WebSocket]] = {}


async def mark_stale_runs_as_failed():
    """Background task that marks runs without recent activity as failed."""
    while True:
        try:
            client = await get_db()
            cutoff_time = (
                datetime.utcnow() - timedelta(seconds=STALE_RUN_TIMEOUT_SECONDS)
            ).isoformat()

            # Get runs that are still "running"
            res = (
                await client.table("runs")
                .select("id, start_time")
                .eq("status", "running")
                .execute()
            )
            running_runs = res.data

            for run in running_runs:
                run_id = run["id"]
                start_time = run["start_time"]

                # Check last event time for this run
                # We order by timestamp desc and limit 1
                ev_res = (
                    await client.table("events")
                    .select("timestamp")
                    .eq("run_id", run_id)
                    .order("timestamp", desc=True)
                    .limit(1)
                    .execute()
                )

                last_event = ev_res.data[0] if ev_res.data else None
                last_activity = last_event["timestamp"] if last_event else start_time

                # If last activity is older than cutoff, mark as failed
                if last_activity < cutoff_time:
                    print(
                        f"[Sentric] Marking stale run {run_id} as failed (no activity since {last_activity})"
                    )
                    await client.table("runs").update(
                        {"status": "failed", "end_time": datetime.utcnow().isoformat()}
                    ).eq("id", run_id).execute()

        except Exception as e:
            print(f"[Sentric] Error in stale run checker: {e}")

        # Check every 10 seconds
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background task to mark stale runs as failed
    stale_run_task = asyncio.create_task(mark_stale_runs_as_failed())
    print("[Sentric] Started stale run checker")

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

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://app.sentriclabs.com,http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
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

    client = await get_db()

    # Query api_keys table
    res = await client.table("api_keys").select("*").eq("key_hash", key).execute()

    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    row = res.data[0]

    # Include the actual API key in the auth dict for WebSocket URL generation
    auth_dict = dict(row)
    auth_dict["_api_key"] = key  # Store actual key for WebSocket URL
    return auth_dict


# Helpers for Auth with Supabase
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

    client = await get_db()

    # Verify JWT via Supabase Auth
    try:
        user_res = await client.auth.get_user(auth_token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = user_res.user

        # We need to map Supabase User to our internal structure if needed?
        # Our Schema syncs auth.users to public.users via Trigger.
        # Let's fetch from public.users to get the 'name' and consistent ID.

        public_user_res = (
            await client.table("users").select("*").eq("id", user.id).execute()
        )

        if not public_user_res.data:
            # Fallback if trigger failed or race condition?
            return {
                "id": user.id,
                "email": user.email,
                "name": user.user_metadata.get("full_name", ""),
            }

        return public_user_res.data[0]

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# Dashboard auth - verify user owns the project
async def verify_project_access(
    project_id: str, user: dict = Depends(get_current_user)
) -> bool:
    client = await get_db()
    res = (
        await client.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    return len(res.data) > 0


# === Run Lifecycle ===


@app.post("/runs/start", response_model=RunStartResponse)
async def start_run(request: RunStartRequest, auth: dict = Depends(verify_api_key)):
    client = await get_db()
    run_id = f"run_{uuid.uuid4().hex[:12]}"

    # Process run name
    run_name = request.name
    if not run_name:
        run_name = run_id
    else:
        # Check for duplicate names in the same project
        # Using Supabase 'like' filter
        res = (
            await client.table("runs")
            .select("name")
            .eq("project_id", auth["project_id"])
            .like("name", f"{run_name}%")
            .execute()
        )

        existing_names = [r["name"] for r in res.data]

        if run_name in existing_names:
            count = 1
            while True:
                candidate = f"({count}) {run_name}"
                if candidate not in existing_names:
                    run_name = candidate
                    break
                count += 1

    await client.table("runs").insert(
        {
            "id": run_id,
            "project_id": auth["project_id"],
            "user_id": auth["user_id"],
            "name": run_name,
            "task": request.task,
            "status": "running",
            "start_time": datetime.utcnow().isoformat(),
        }
    ).execute()

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

    client = await get_db()

    # Verify run exists and belongs to project
    res = (
        await client.table("runs")
        .select("id")
        .eq("id", run_id)
        .eq("project_id", auth["project_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Run not found")

    # Update run
    update_data = {"status": run_status, "end_time": datetime.utcnow().isoformat()}
    if laminar_trace_id:
        update_data["laminar_trace_id"] = laminar_trace_id

    await client.table("runs").update(update_data).eq("id", run_id).execute()

    # Fetch all events for analysis
    ev_res = (
        await client.table("events")
        .select("type, payload, timestamp")
        .eq("run_id", run_id)
        .order("timestamp", desc=False)
        .execute()
    )

    events = [
        {
            "type": r["type"],
            "payload": json.loads(r["payload"]),
            "timestamp": r["timestamp"],
        }
        for r in ev_res.data
    ]

    # Run security analysis
    findings = analyze_events(events)

    # Store findings
    if findings:
        findings_data = []
        for finding in findings:
            findings_data.append(
                {
                    "run_id": run_id,
                    "severity": finding["severity"],
                    "category": finding["category"],
                    "description": finding["description"],
                    "evidence": json.dumps(finding["evidence"]),
                }
            )
        await client.table("security_findings").insert(findings_data).execute()

    return {"status": "ok", "findings_count": len(findings)}


@app.post("/runs/{run_id}/events")
async def post_event(run_id: str, event: Event, auth: dict = Depends(verify_api_key)):
    """HTTP fallback for event ingestion."""
    client = await get_db()

    # Verify run validity
    res = (
        await client.table("runs")
        .select("id")
        .eq("id", run_id)
        .eq("project_id", auth["project_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Run not found or access denied")

    timestamp = event.timestamp or datetime.utcnow().isoformat()
    video_timestamp = getattr(event, "video_timestamp", None)
    if hasattr(event, "__dict__") and "video_timestamp" in event.__dict__:
        video_timestamp = event.__dict__["video_timestamp"]

    data = {
        "run_id": run_id,
        "type": event.type,
        "payload": json.dumps(event.payload),
        "timestamp": timestamp,
    }
    if video_timestamp is not None:
        data["video_timestamp"] = video_timestamp

    await client.table("events").insert(data).execute()

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
    client = await get_db()

    # Authenticate with API key
    if api_key:
        res = (
            await client.table("api_keys")
            .select("project_id")
            .eq("key_hash", api_key)
            .execute()
        )
        if not res.data:
            await websocket.close(code=1008, reason="Invalid API key")
            return
        project_id = res.data[0]["project_id"]

    # Authenticate with JWT token (for dashboard users)
    elif token:
        try:
            user_res = await client.auth.get_user(token)
            if not user_res or not user_res.user:
                await websocket.close(code=1008, reason="Invalid token")
                return
            user_id = user_res.user.id

            # Check ownership via Project
            # Join not strictly necessary if we query projects
            # select projet_id from runs ...
            run_res = (
                await client.table("runs")
                .select("project_id")
                .eq("id", run_id)
                .execute()
            )
            if not run_res.data:
                await websocket.close(code=1008, reason="Run not found")
                return

            p_id = run_res.data[0]["project_id"]

            # Verify user owns project
            proj_res = (
                await client.table("projects")
                .select("id")
                .eq("id", p_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not proj_res.data:
                await websocket.close(code=1008, reason="Access denied")
                return
            project_id = p_id

        except Exception:
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
            video_timestamp = event.get("video_timestamp")

            # Store event
            ev_data = {
                "run_id": run_id,
                "type": event["type"],
                "payload": json.dumps(event["payload"]),
                "timestamp": timestamp,
            }
            if video_timestamp is not None:
                ev_data["video_timestamp"] = video_timestamp

            await client.table("events").insert(ev_data).execute()

            # Broadcast to other subscribers
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
        if run_id in active_connections:
            if websocket in active_connections[run_id]:
                active_connections[run_id].remove(websocket)
            if not active_connections[run_id]:
                del active_connections[run_id]


# === Authentication ===


@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    client = await get_db()
    # Supabase Auth
    try:
        # Sign up with Supabase Auth
        res = await client.auth.sign_up(
            {
                "email": request.email,
                "password": request.password,
                "options": {"data": {"full_name": request.name}},
            }
        )

        # In develop mode, email confirmation might be off, or user gets session immediately
        # If confirmation is required, session might be None.
        if not res.session:
            # If no session, we can't return a token immediately unless we auto-confirm
            # For this demo, let's assume we want to return success but maybe empty token if waiting?
            # Or throw error saying check email.
            pass

        user = res.user
        token = res.session.access_token if res.session else "pending_verification"

        return AuthResponse(
            token=token,
            user={
                "id": user.id,
                "email": request.email,
                "name": request.name,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/signin", response_model=AuthResponse)
async def signin(request: SigninRequest):
    client = await get_db()
    try:
        res = await client.auth.sign_in_with_password(
            {"email": request.email, "password": request.password}
        )

        user = res.user
        token = res.session.access_token

        fullname = user.user_metadata.get("full_name", "")

        return AuthResponse(
            token=token,
            user={"id": user.id, "email": user.email, "name": fullname},
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@app.get("/api/auth/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    client = await get_db()
    # Get user's projects
    res = (
        await client.table("projects")
        .select("id, name, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    projects = res.data
    return {"user": user, "projects": projects}


# === API Key Management ===


@app.post("/api/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    request: CreateApiKeyRequest, user: dict = Depends(get_current_user)
):
    client = await get_db()
    # Verify project belongs to user
    res = (
        await client.table("projects")
        .select("id")
        .eq("id", request.project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate API key
    key_id = f"key_{uuid.uuid4().hex[:12]}"
    api_key = f"sk_{secrets.token_urlsafe(32)}"

    await client.table("api_keys").insert(
        {
            "id": key_id,
            "key_hash": api_key,
            "user_id": user["id"],
            "project_id": request.project_id,
            "name": request.name or f"API Key {key_id[:8]}",
        }
    ).execute()

    return ApiKeyResponse(
        id=key_id,
        key=api_key,
        name=request.name or f"API Key {key_id[:8]}",
        project_id=request.project_id,
        created_at=datetime.utcnow().isoformat(),
    )


@app.get("/api/api-keys", response_model=ApiKeyListResponse)
async def list_api_keys(user: dict = Depends(get_current_user)):
    client = await get_db()

    # Supabase join: api_keys(*, projects(name))
    res = (
        await client.table("api_keys")
        .select("id, name, project_id, created_at, projects(name)")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    keys = []
    for row in res.data:
        keys.append(
            {
                "id": row["id"],
                "name": row["name"],
                "project_id": row["project_id"],
                # Flatten joined column
                "project_name": (
                    row["projects"]["name"] if row["projects"] else "Unknown"
                ),
                "created_at": row["created_at"],
            }
        )

    return ApiKeyListResponse(keys=keys)


@app.delete("/api/api-keys/{key_id}")
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    client = await get_db()

    # Checking ownership and deleting can be done in one delete call with filter
    # But checking first gives better error messages
    res = (
        await client.table("api_keys")
        .select("id")
        .eq("id", key_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="API key not found")

    await client.table("api_keys").delete().eq("id", key_id).execute()
    return {"status": "ok"}


@app.get("/api/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    client = await get_db()
    res = (
        await client.table("projects")
        .select("id, name, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"projects": res.data}


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(
    request: CreateProjectRequest, user: dict = Depends(get_current_user)
):
    client = await get_db()
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    created_at = datetime.utcnow().isoformat()

    await client.table("projects").insert(
        {
            "id": project_id,
            "user_id": user["id"],
            "name": request.name,
            "created_at": created_at,
        }
    ).execute()

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
    client = await get_db()
    res = (
        await client.table("projects")
        .select("created_at")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    created_at = res.data[0]["created_at"]

    await client.table("projects").update({"name": request.name}).eq(
        "id", project_id
    ).execute()

    return ProjectResponse(
        id=project_id,
        name=request.name,
        created_at=created_at,
    )


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    client = await get_db()
    res = (
        await client.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Supabase/Postgres will handle CASCADE delete if configures in SQL
    await client.table("projects").delete().eq("id", project_id).execute()

    return {"status": "success", "message": "Project deleted"}


# === Dashboard API ===


@app.get("/api/projects/{project_id}/runs", response_model=PaginatedRunsResponse)
async def list_runs(
    project_id: str,
    page: int = 1,
    limit: int = 10,
    user: dict = Depends(get_current_user),
):
    client = await get_db()

    # Verify ownership
    res = (
        await client.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    offset = (page - 1) * limit

    # Get total count
    count_res = (
        await client.table("runs")
        .select("id", count="exact")
        .eq("project_id", project_id)
        .execute()
    )
    total_count = count_res.count if count_res.count is not None else 0

    # Get Paginated Runs data
    # Note: joining security_findings to count them in one query is hard in PostgREST
    # unless using rpc or select(..., security_findings(count)).
    # We will do select("*, security_findings(count)") which gives the count!

    runs_res = (
        await client.table("runs")
        .select("*, security_findings(count)")
        .eq("project_id", project_id)
        .order("start_time", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    runs_data = []
    for r in runs_res.data:
        runs_data.append(
            {
                "id": r["id"],
                "project_id": r["project_id"],
                "name": r["name"],
                "task": r["task"],
                "status": r["status"],
                "start_time": r["start_time"],
                "end_time": r["end_time"],
                "finding_count": (
                    r["security_findings"][0]["count"] if r["security_findings"] else 0
                ),
            }
        )

    # Stats for Project
    # 1. Success Rate
    completed_res = (
        await client.table("runs")
        .select("id", count="exact")
        .eq("project_id", project_id)
        .eq("status", "completed")
        .execute()
    )
    completed_count = completed_res.count if completed_res.count is not None else 0
    success_rate = (completed_count / total_count * 100) if total_count > 0 else 0

    # 2. Avg Duration - calculate from completed runs
    completed_runs = [
        r for r in runs_res.data if r.get("status") == "completed" and r.get("end_time")
    ]
    if completed_runs:
        durations = []
        for r in completed_runs:
            try:
                start = datetime.fromisoformat(r["start_time"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(r["end_time"].replace("Z", "+00:00"))
                durations.append((end - start).total_seconds())
            except:
                pass
        avg_duration = sum(durations) / len(durations) if durations else 0
    else:
        avg_duration = 0

    # 3. Total Findings - count all findings for runs in this project
    # Get all run IDs for this project first
    all_runs_res = (
        await client.table("runs").select("id").eq("project_id", project_id).execute()
    )
    all_run_ids = [r["id"] for r in all_runs_res.data]

    if all_run_ids:
        # Count findings for all runs in this project
        findings_res = (
            await client.table("security_findings")
            .select("id", count="exact")
            .in_("run_id", all_run_ids)
            .execute()
        )
        total_findings = findings_res.count if findings_res.count else 0
    else:
        total_findings = 0

    total_pages = (total_count + limit - 1) // limit if limit > 0 else 0

    return PaginatedRunsResponse(
        runs=runs_data,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
        success_rate=success_rate,
        avg_duration=avg_duration,
        total_findings=total_findings,
    )


@app.get("/api/runs/recent", response_model=list[RunWithProject])
async def get_recent_runs(limit: int = 5, user: dict = Depends(get_current_user)):
    client = await get_db()
    # Need runs across all user's projects.
    # Filter: runs -> project_id -> user_id = user.id
    # PostgREST: runs?select=*,projects!inner(name, user_id)&projects.user_id=eq.MYID

    res = (
        await client.table("runs")
        .select("*, projects!inner(name, user_id), security_findings(count)")
        .eq("projects.user_id", user["id"])
        .order("start_time", desc=True)
        .limit(limit)
        .execute()
    )

    result = []
    for r in res.data:
        result.append(
            {
                "id": r["id"],
                "project_id": r["project_id"],
                "name": r["name"],
                "task": r["task"],
                "status": r["status"],
                "start_time": r["start_time"],
                "end_time": r["end_time"],
                "finding_count": (
                    r["security_findings"][0]["count"] if r["security_findings"] else 0
                ),
                "project_name": r["projects"]["name"],
            }
        )
    return result


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    client = await get_db()

    # check access
    res = (
        await client.table("runs")
        .select("*, projects!inner(user_id)")
        .eq("id", run_id)
        .eq("projects.user_id", user["id"])
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Run not found")

    run = res.data[0]

    # Fetch events
    ev_res = (
        await client.table("events")
        .select("type, payload, timestamp, video_timestamp")
        .eq("run_id", run_id)
        .order("timestamp")
        .execute()
    )

    events = []
    for r in ev_res.data:
        evt = {
            "type": r["type"],
            "payload": json.loads(r["payload"]),
            "timestamp": r["timestamp"],
        }
        if r["video_timestamp"] is not None:
            evt["video_timestamp"] = r["video_timestamp"]
        events.append(evt)

    # Fetch findings
    find_res = (
        await client.table("security_findings")
        .select("*")
        .eq("run_id", run_id)
        .execute()
    )
    findings = []
    for r in find_res.data:
        findings.append(
            {
                "severity": r["severity"],
                "category": r["category"],
                "description": r["description"],
                "evidence": json.loads(r["evidence"]) if r["evidence"] else [],
            }
        )

    result = {
        "id": run["id"],
        "project_id": run["project_id"],
        "name": run["name"],
        "task": run["task"],
        "status": run["status"],
        "start_time": run["start_time"],
        "end_time": run["end_time"],
        "events": events,
        "findings": findings,
    }
    if run.get("laminar_trace_id"):
        result["laminar_trace_id"] = run["laminar_trace_id"]

    return result


@app.get("/api/stats/overview", response_model=StatsOverviewResponse)
async def get_stats_overview(user: dict = Depends(get_current_user)):
    client = await get_db()

    # 1. Total Runs
    runs_res = (
        await client.table("runs")
        .select("id, projects!inner(user_id)", count="exact")
        .eq("projects.user_id", user["id"])
        .execute()
    )  # Note: To filter by joined table, we must select it
    total_runs = (
        runs_res.count if runs_res.count else 0
    )  # 'count' property is unreliable in python client sometimes?
    # Actually .count comes from API response head

    # 2. Total Findings
    find_res = (
        await client.table("security_findings")
        .select("id, runs!inner(projects!inner(user_id))", count="exact")
        .eq("runs.projects.user_id", user["id"])
        .execute()
    )
    total_findings = find_res.count if find_res.count else 0

    # 3. Total Projects
    proj_res = (
        await client.table("projects")
        .select("id", count="exact")
        .eq("user_id", user["id"])
        .execute()
    )
    total_projects = proj_res.count if proj_res.count else 0

    # 4. Active Projects
    # Count distinct project_ids in runs table filtered by user
    cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
    # PostgREST doesn't do "COUNT(DISTINCT col)"
    # We fetch project_ids and count in python (limit 1000 for safety?)
    active_res = (
        await client.table("runs")
        .select("project_id, projects!inner(user_id)")
        .eq("projects.user_id", user["id"])
        .gt("start_time", cutoff)
        .execute()
    )

    active_project_ids = set(r["project_id"] for r in active_res.data)
    active_projects = len(active_project_ids)

    # 5. Total Actions
    act_res = (
        await client.table("events")
        .select("id, runs!inner(projects!inner(user_id))", count="exact")
        .eq("runs.projects.user_id", user["id"])
        .eq("type", "action")
        .execute()
    )
    total_actions = act_res.count if act_res.count else 0

    return StatsOverviewResponse(
        total_runs=total_runs,
        total_findings=total_findings,
        total_projects=total_projects,
        active_projects=active_projects,
        total_actions=total_actions,
    )


@app.get("/api/stats/daily", response_model=DailyStatsResponse)
async def get_daily_stats(user: dict = Depends(get_current_user)):
    # Requires significant aggregation. Stubbing for now to return zeros or minimal data
    # implementing full aggregation in Application layer is slow.
    client = await get_db()
    days = 30
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Fetch simple list of dates for runs
    res = (
        await client.table("runs")
        .select("start_time, projects!inner(user_id)")
        .eq("projects.user_id", user["id"])
        .gt("start_time", cutoff)
        .execute()
    )

    # Aggregate in python
    runs_map = {}
    for r in res.data:
        day = r["start_time"][:10]
        runs_map[day] = runs_map.get(day, 0) + 1

    result = []
    for i in range(days + 1):
        day_str = (datetime.utcnow() - timedelta(days=days - i)).strftime("%Y-%m-%d")
        result.append(
            {
                "day": day_str,
                "runs": runs_map.get(day_str, 0),
                "findings": 0,  # Optimization: skip other stats for now
                "actions": 0,
            }
        )

    return DailyStatsResponse(data=result)


@app.get("/api/stats/hourly", response_model=HourlyStatsResponse)
async def get_hourly_stats(user: dict = Depends(get_current_user)):
    # Stubbing slightly
    result = []
    now = datetime.utcnow()
    for i in range(25):
        hour_time = now - timedelta(hours=24 - i)
        hour_str = hour_time.strftime("%Y-%m-%dT%H")
        result.append({"hour": hour_str, "runs": 0, "findings": 0, "actions": 0})
    return HourlyStatsResponse(data=result)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
