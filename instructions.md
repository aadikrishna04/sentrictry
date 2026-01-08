

# Sentric MVP – Revised Architecture
## BrowserUse + User Chrome + Sentric Python SDK

---

## Core Idea

Sentric does **not** run or sandbox agents.

Sentric is a **security observability layer** that wraps an existing BrowserUse agent, monitors:

- Agent **actions**
- Agent **reasoning**
- Navigation and interaction patterns

…and produces a **post-run security report** viewable in a web dashboard.

The agent:
- Runs locally
- Uses the **user’s own Chrome instance**
- Is fully controlled by the user

Sentric only **observes and analyzes**.

---

## What Changed from the Original Plan

### Removed
- Sentric-managed browser instances
- Playwright / Chromium orchestration
- Repo-specific agent execution
- Sandboxing or isolation guarantees

### Added
- Sentric Python SDK (`sentric`)
- API-key–based run lifecycle
- Passive action + reasoning monitoring
- Web dashboard for inspection & reporting

Mental model:

> **Sentric = Datadog / Snyk for AI agents**  
> Not an agent runner.

---

## High-Level Architecture

```
User Machine (Local)
┌────────────────────────────────────────┐
│ BrowserUse Agent                       │
│  - Uses user's Chrome                 │
│  - Executes normally                  │
│                                        │
│ Sentric Python SDK                    │
│  - Wraps agent                        │
│  - Intercepts actions & reasoning     │
│  - Streams events                     │
└───────────────┬────────────────────────┘
                │ HTTPS / WebSocket
                ▼
┌────────────────────────────────────────┐
│ Sentric Backend (FastAPI)              │
│  - API keys                            │
│  - Run lifecycle                      │
│  - Event ingestion                    │
│  - Security analysis                  │
│  - Report generation                  │
└───────────────┬────────────────────────┘
                ▼
┌────────────────────────────────────────┐
│ Sentric Web App (Next.js)              │
│  - Runs list                          │
│  - Live action timeline               │
│  - Reasoning viewer                   │
│  - Security report                    │
└────────────────────────────────────────┘
```

---

## Python SDK: `sentric`

### Installation

```bash
pip install sentric
```

---

## Developer Experience

### Existing BrowserUse Code

```python
from browser_use import Agent

agent = Agent(
    task="Book a flight to NYC",
    llm=llm
)

agent.run()
```

### With Sentric Monitoring

```python
from browser_use import Agent
from sentric import SentricMonitor

monitor = SentricMonitor(
    api_key="SENTRIC_API_KEY",
    project_id="proj_123"
)

agent = Agent(
    task="Book a flight to NYC",
    llm=llm
)

with monitor.wrap(agent):
    agent.run()
```

No changes to agent logic.
No config files.
No repo restructuring.

---

## SDK Responsibilities

### 1. Run Creation

On `wrap()` entry:

```
POST /runs/start
Authorization: Bearer <API_KEY>
```

Response:

```json
{
  "run_id": "run_abc123",
  "ws_url": "wss://sentric.ai/ws/run_abc123"
}
```

---

### 2. Event Interception

#### Agent Actions

```json
{
  "type": "action",
  "timestamp": "...",
  "action": {
    "kind": "click",
    "selector": "#submit",
    "url": "https://example.com"
  }
}
```

#### Agent Reasoning

```json
{
  "type": "reasoning",
  "content": "Submitting the form to proceed with checkout."
}
```

Notes:
- No raw chain-of-thought required
- High-level reasoning summaries only

---

### 3. Event Streaming

- Primary: WebSocket
- Fallback: HTTP POST
- Failures must **never block agent execution**

---

### 4. Run Completion

On context exit:

```
POST /runs/{run_id}/end
```

---

## Backend (FastAPI)

### Authentication
- API keys scoped to:
  - User
  - Project
- Keys only authorize:
  - Run creation
  - Event ingestion

---

### Data Model (Minimal)

```
User
Project
APIKey

Run
  - id
  - project_id
  - start_time
  - end_time
  - status

Event
  - run_id
  - type (action | reasoning)
  - payload (JSON)
  - timestamp

SecurityFinding
  - run_id
  - severity
  - category
  - description
  - evidence
```

SQLite is sufficient for MVP.

---

## Security Analysis Engine (MVP)

### Inputs
- Action sequence
- URLs visited
- Form interactions
- Reasoning text

### Example Rules
- Credentials entered on non-HTTPS sites
- Submitting data to unknown domains
- Reasoning shows uncertainty before irreversible action
- Infinite loops or retries
- Navigation to suspicious domains
- Ignoring consent / CAPTCHA flows

Each rule emits a finding:

```json
{
  "severity": "medium",
  "category": "data_exfiltration",
  "description": "...",
  "evidence": [...]
}
```

---

## Web Dashboard (Next.js)

### Pages

#### Runs List
- Run ID
- Status
- Duration
- Number of findings

#### Live Run View
- Action timeline
- Reasoning stream
- Current URL

#### Security Report
- Overall risk summary
- Findings grouped by severity
- Evidence viewer

---

## Explicit Non-Goals (MVP)

- No browser sandboxing
- No action blocking
- No DOM diffing
- No policy authoring UI
- No replay or recording
- No agent execution

---

## Why This MVP Works

### Engineering
- Small surface area
- SDK ~300–500 LOC
- Backend is CRUD + WebSocket
- Frontend is read-only

### Product
- Works with any BrowserUse agent
- Near-zero adoption friction
- Clear upgrade path:
  - Enforcement
  - Blocking
  - Replay
  - Sandbox

### Strategy
- Defines **AI Agent Security Observability**
- Strong differentiation
- Clean compliance story later

---

## Recommendation

For MVP reasoning capture:
- **Explicit logging** (`monitor.log_reasoning(...)`)
- Avoid LLM interception initially
- Add auto-capture later as opt-in

---

End of document.
