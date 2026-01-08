# Sentric

**Security Observability for AI Browser Agents**

Sentric is a security monitoring layer that wraps AI browser agents (like BrowserUse), observes their actions and reasoning, and produces security reports viewable in a web dashboard.

## Quick Start

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API will be running at `http://localhost:8000`

### 2. Start the Dashboard

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be at `http://localhost:3000`

### 3. Run the Demo

```bash
cd examples
pip install -r ../sdk/requirements.txt
python demo_agent.py
```

Watch the dashboard to see:

- Live action timeline
- Agent reasoning stream
- Security findings detected

## Using with BrowserUse

```python
import asyncio
from browser_use import Agent
from sentric import SentricMonitor

monitor = SentricMonitor(
    api_key="sk_demo_123456",  # Use demo key for testing
    project_id="proj_demo"
)

agent = Agent(
    task="Book a flight to NYC",
    llm=llm
)

async def main():
    async with monitor.wrap(agent):
        await agent.run()

asyncio.run(main())
```

## Architecture

```
User Machine (Local)
┌────────────────────────────────────────┐
│ BrowserUse Agent                       │
│  - Uses user's Chrome                  │
│  - Executes normally                   │
│                                        │
│ Sentric Python SDK                     │
│  - Wraps agent                         │
│  - Intercepts actions & reasoning      │
│  - Streams events                      │
└───────────────┬────────────────────────┘
                │ HTTPS / WebSocket
                ▼
┌────────────────────────────────────────┐
│ Sentric Backend (FastAPI)              │
│  - API keys                            │
│  - Run lifecycle                       │
│  - Event ingestion                     │
│  - Security analysis                   │
└───────────────┬────────────────────────┘
                ▼
┌────────────────────────────────────────┐
│ Sentric Web App (Next.js)              │
│  - Runs list                           │
│  - Live action timeline                │
│  - Security report                     │
└────────────────────────────────────────┘
```

## Security Rules (MVP)

The analysis engine detects:

- **Insecure Transport**: Form submissions on non-HTTPS pages
- **Suspicious Navigation**: Visits to known malicious domains
- **Uncertain Actions**: Agent expressing doubt before actions
- **Action Loops**: Repeated identical actions (possible infinite loop)
- **Sensitive Data**: Credentials or PII in action values
- **Unknown Domain Submissions**: Form submissions to uncommon domains

## Demo Credentials

For testing:

- **API Key**: `sk_demo_123456`
- **Project ID**: `proj_demo`

## Project Structure

```
Sentric/
├── backend/           # FastAPI server
│   ├── main.py        # API endpoints
│   ├── database.py    # SQLite setup
│   ├── models.py      # Pydantic models
│   └── security_analyzer.py
│
├── sdk/               # Python SDK
│   └── sentric/
│       ├── __init__.py
│       └── monitor.py
│
├── frontend/          # Next.js dashboard
│   └── src/app/
│       ├── page.tsx   # Runs list
│       └── runs/[id]/ # Run detail
│
└── examples/
    └── demo_agent.py  # Demo script
```

## License

MIT
