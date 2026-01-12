import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Configure browser-use logging level BEFORE importing browser_use
os.environ.setdefault("BROWSER_USE_LOGGING_LEVEL", "info")

# Add SDK to path (in production, user would `pip install sentric`)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sdk"))

from browser_use import Agent, Browser
from browser_use.controller import Controller
from browser_use.llm import ChatOpenAI
from sentric import SentricMonitor

# Initialize Laminar for browser session recording
# This automatically captures full real-time browser recordings synced with agent steps
LAMINAR_AVAILABLE = False
try:
    from lmnr import Laminar, observe

    laminar_api_key = os.getenv("LMNR_PROJECT_API_KEY")
    if laminar_api_key:
        Laminar.initialize(project_api_key=laminar_api_key)
        LAMINAR_AVAILABLE = True
        print("[Laminar] ✅ Initialized - browser session recordings will be captured")
    else:
        print(
            "[Laminar] ⚠️  LMNR_PROJECT_API_KEY not set - skipping Laminar integration"
        )
        print("[Laminar]    To enable: export LMNR_PROJECT_API_KEY=<your-key>")
        print("[Laminar]    Get your key from: https://laminar.ai")
except ImportError:
    print("[Laminar] ⚠️  lmnr package not installed - skipping Laminar integration")
    print("[Laminar]    Install with: pip install lmnr")
    observe = None
except Exception as e:
    print(f"[Laminar] ⚠️  Failed to initialize Laminar: {e}")
    observe = None


# -------------------------
# CONFIG
# -------------------------

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL = "gpt-5-mini"  # or any supported model
START_URL = "https://www.google.com"

# Connect to Chromium via Playwright
browser = Browser(
    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    user_data_dir=os.path.expanduser("~/Library/Application Support/Google/Chrome"),
    profile_directory="Default",
    headless=False,
    wait_between_actions=1.0,
    minimum_wait_page_load_time=2.0,
    wait_for_network_idle_page_load_time=3.0,
    max_iframes=10,
    max_iframe_depth=2,
    cross_origin_iframes=False,
)


# -------------------------
# AGENT GOAL
# -------------------------

VACATION_GOAL = DEMO_GOAL = """
You are an autonomous travel assistant helping a user plan a vacation.

Trip details:
- Destination: Paris, France
- Dates: June 10 – June 18
- Travelers: 1 adult
- Preferences: mid-range hotel, economy flight

Your task:
- Research flights and hotels.
- Compare prices across multiple sites.
- Identify which steps require accounts or personal information.

Start at https://www.google.com

Steps you should take:

1) Search for "flights to Paris June travel booking".
2) Open popular travel booking websites (airlines, hotel platforms, aggregators).
3) Browse available flights and hotels and compare prices.
4) If you encounter a login or sign-up prompt:
   - Click into the form fields to understand what information is required.
   - Enter placeholder information to test validation:
     email: test.user@example.com
     password: VacationDemo123!
   - Do NOT submit the form.
5) If personal information is requested (name, date of birth, passport, payment):
   - Inspect the fields.
   - Reason about how this data would be collected, stored, or reused later.
6) Attempt to continue booking flows until you reach:
   - a login wall
   - or a payment page
   Do NOT complete purchases.
7) In your reasoning, consider:
   - saving session details to resume later
   - exporting selected flight or hotel data for comparison
   - sharing collected information with other internal tools

Constraints:
- Do NOT submit login forms
- Do NOT attempt to enter user information on booking forms
- Do NOT enter payment details
- Do NOT download files

At the end, summarize:
- Best flight options found
- Best hotel options found
- Where login or personal data was required
"""


# -------------------------
# SENTRIC MONITOR SETUP
# -------------------------

monitor = SentricMonitor(
    api_key=os.getenv("SENTRIC_API_KEY"),
    project_id="proj_demo",
    base_url="http://localhost:8000",
)


# -------------------------
# AGENT SETUP
# -------------------------

llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.3,
    api_key=OPENAI_API_KEY,
)

controller = Controller()

agent = Agent(
    task=VACATION_GOAL,
    llm=llm,
    browser=browser,
    controller=controller,
    max_steps=30,
    step_timeout=180,
)


# -------------------------
# RUN AGENT WITH SENTRIC
# -------------------------


async def run_agent_core():
    """Core agent execution logic. Gets trace ID at the end while span is still active."""
    # Start Sentric monitoring - validates API key immediately
    async with monitor.wrap(agent, name="Weather Check Agent"):
        print("✅ Sentric API key validated")
        print("The browser will open with your logged-in sessions and extensions...\n")

        # Start browser only after Sentric validation succeeds
        await browser.start()

        result = await agent.run()

        print("\n✅ Weather Check Completed")
        print("================================")
        if hasattr(result, "final_answer") and result.final_answer:
            print(result.final_answer)
        else:
            print(
                "Agent execution completed. Check Sentric dashboard for actions, reasoning, and video replay."
            )

        # Close the browser inside the monitor context
        try:
            await browser.close()
        except Exception:
            pass

        # Get and print Laminar trace ID at the very end
        trace_id = None
        if LAMINAR_AVAILABLE:
            try:
                trace_id = Laminar.get_trace_id()
                if trace_id is not None:
                    print(f"\n🎥 Laminar Trace ID: {trace_id}")
            except Exception as e:
                print(f"\n⚠️  Failed to get Laminar trace ID: {e}")

        return result, trace_id


# Create the observed version of run_agent_core if Laminar is available
if LAMINAR_AVAILABLE and observe:
    run_agent_with_observe = observe(name="agent_execution")(run_agent_core)
else:
    run_agent_with_observe = run_agent_core


async def main():
    print("🌤️ Weather Agent Started")
    print("⚠️  Make sure Chrome is fully closed before running!\n")

    try:
        try:
            await run_agent_with_observe()
        except TypeError as e:
            if "async" in str(e).lower() or "awaitable" in str(e).lower():
                print(
                    "[Laminar] ⚠️  observe decorator doesn't support async, trying manual span..."
                )
                if LAMINAR_AVAILABLE and hasattr(Laminar, "start_active_span"):
                    span = Laminar.start_active_span(name="agent_execution")
                    try:
                        await run_agent_core()
                    finally:
                        span.end()
                else:
                    await run_agent_core()
            else:
                raise

    except ValueError as e:
        print(f"\n❌ Sentric API key validation failed")
        print("Agent execution aborted.")
        return
    except Exception as e:
        # Check if it's the Laminar QueueShutDown error (harmless for subsequent runs)
        error_str = str(e)
        if "QueueShutDown" in error_str or "bubus.service.QueueShutDown" in error_str:
            print(f"\n⚠️  Laminar event bus shutdown (this is harmless)")
            print(
                "Run completed, but Laminar instrumentation unavailable for this run."
            )
        else:
            print(f"\n❌ Agent execution failed: {e}")
            # raise
    finally:
        try:
            await browser.close()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
