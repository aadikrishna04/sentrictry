from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, Any
from datetime import datetime


class RunStartRequest(BaseModel):
    task: Optional[str] = None


class RunStartResponse(BaseModel):
    run_id: str
    ws_url: str


class RunEndRequest(BaseModel):
    status: Optional[Literal["completed", "failed", "cancelled"]] = "completed"


class Event(BaseModel):
    type: Literal["action", "reasoning", "step_start", "step_reasoning"]
    timestamp: Optional[str] = None
    payload: dict


class ActionPayload(BaseModel):
    kind: str
    selector: Optional[str] = None
    url: Optional[str] = None
    value: Optional[str] = None


class ReasoningPayload(BaseModel):
    content: str


class SecurityFinding(BaseModel):
    severity: Literal["low", "medium", "high", "critical"]
    category: str
    description: str
    evidence: list[dict]


class RunSummary(BaseModel):
    id: str
    project_id: str
    task: Optional[str]
    status: str
    start_time: str
    end_time: Optional[str]
    finding_count: int


class RunWithProject(RunSummary):
    project_name: str


class RunDetail(BaseModel):
    id: str
    project_id: str
    task: Optional[str]
    status: str
    start_time: str
    end_time: Optional[str]
    events: list[dict]
    findings: list[dict]


# Auth models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class CreateApiKeyRequest(BaseModel):
    name: Optional[str] = None
    project_id: str


class ApiKeyResponse(BaseModel):
    id: str
    key: str
    name: Optional[str]
    project_id: str
    created_at: str


class ApiKeyListResponse(BaseModel):
    keys: list[dict]


class CreateProjectRequest(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    created_at: str


class StatsOverviewResponse(BaseModel):
    total_runs: int
    total_findings: int
    total_projects: int
    active_projects: int
    total_actions: int


class DailyStatsItem(BaseModel):
    day: str
    runs: int
    findings: int
    actions: int


class DailyStatsResponse(BaseModel):
    data: list[DailyStatsItem]


class HourlyStatsItem(BaseModel):
    hour: str
    runs: int
    findings: int
    actions: int


class HourlyStatsResponse(BaseModel):
    data: list[HourlyStatsItem]
