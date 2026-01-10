import asyncio
import os
import sys
from dotenv import load_dotenv
load_dotenv()

# Configure browser-use logging level BEFORE importing browser_use
# Options: 'result' (minimal), 'info' (default, shows actions/warnings), 'debug' (verbose)
# Set to 'result' to only see final results, or 'warning' to suppress INFO logs
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
        print("[Laminar] ⚠️  LMNR_PROJECT_API_KEY not set - skipping Laminar integration")
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

# Connect to Chromium via Playwright with video recording enabled
# Videos will be recorded by Playwright into the shared project-root `videos` folder
videos_dir = os.path.join(os.path.dirname(__file__), "..", "videos")
os.makedirs(videos_dir, exist_ok=True)

browser = Browser(
    # Use Playwright-managed browser (no CDP URL) with our Chrome executable
    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    user_data_dir=os.path.expanduser("~/Library/Application Support/Google/Chrome"),
    profile_directory="Default",
    headless=False,
    # Add wait times to reduce frame access errors during navigation
    wait_between_actions=1.0,  # Wait 1 second between actions
    minimum_wait_page_load_time=2.0,  # Wait 2 seconds after page loads
    wait_for_network_idle_page_load_time=3.0,  # Wait for network idle
    # Limit iframe processing to reduce frame-related errors
    max_iframes=10,  # Limit number of iframes processed
    max_iframe_depth=2,  # Limit iframe nesting depth
    cross_origin_iframes=False,  # Disable cross-origin iframe processing (reduces errors)
    # IMPORTANT: enable Playwright video recording to the shared videos directory
    record_video_dir=videos_dir,
    record_video_size={"width": 1280, "height": 720},
)


# -------------------------
# AGENT GOAL
# -------------------------

VACATION_GOAL = f"""
You are a weather assistant.

Find the current weather automatically:
Location: New York City, NY

Start at {START_URL}

Your task:
Retrieve the current weather conditions for New York City.

Report ONLY:
Current temperature.
Wind speed.

Do NOT ask for user input.
Do NOT provide forecasts or extra details.
Stop once the current temperature and feels-like temperature are reported.
"""


# -------------------------
# SENTRIC MONITOR SETUP
# -------------------------

monitor = SentricMonitor(
    api_key="sk_05eQsxgQ2lP7yRw5gpEpbDm-eOpMGc2qt5bUQpSFuno",
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
    # Increase step timeout to allow more time for page loads and reduce timeout errors
    step_timeout=180,  # 3 minutes per step (default is 120)
)


# -------------------------
# RUN AGENT WITH SENTRIC
# -------------------------


async def run_agent_core():
    """Core agent execution logic. Gets trace ID at the end while span is still active."""
    # Start Sentric monitoring - validates API key immediately
    async with monitor.wrap(agent):
        print("✅ Sentric API key validated")
        print(
            "The browser will open with your logged-in sessions and extensions...\n"
        )

        # Start browser only after Sentric validation succeeds
        await browser.start()

        result = await agent.run()

        print("\n✅ Weather Check Completed")
        print("================================")
        # Only print final_answer if it exists (may not be present if agent failed)
        if hasattr(result, "final_answer") and result.final_answer:
            print(result.final_answer)
        else:
            print(
                "Agent execution completed. Check Sentric dashboard for actions, reasoning, and video replay."
            )

        # Close the browser inside the monitor context so Playwright
        # can flush and finalize the recorded video before Sentric ends the run
        try:
            await browser.close()
        except Exception:
            pass
        
        # Get and print Laminar trace ID at the very end (while still in observe span context)
        trace_id = None
        if LAMINAR_AVAILABLE:
            try:
                trace_id = Laminar.get_trace_id()
                if trace_id is not None:
                    print(f"\n🎥 Laminar Trace ID: {trace_id}")
                else:
                    print("\n⚠️  Laminar trace ID not available (may be outside span context)")
            except Exception as e:
                print(f"\n⚠️  Failed to get Laminar trace ID: {e}")
        else:
            trace_id = None  # Explicitly set to None if Laminar not available
        
        return result, trace_id


# Create the observed version of run_agent_core if Laminar is available
if LAMINAR_AVAILABLE and observe:
    run_agent_with_observe = observe(name="agent_execution")(run_agent_core)
else:
    # No-op wrapper if Laminar not available
    run_agent_with_observe = run_agent_core


async def main():
    print("🌤️ Weather Agent Started")
    print("⚠️  Make sure Chrome is fully closed before running!\n")

    # Validate Sentric API key BEFORE starting browser
    # This will raise ValueError if API key is invalid
    try:
        # Run with observe span if available (observe decorator should handle async functions)
        # Note: If observe doesn't support async, we'll handle the error below
        try:
            result, trace_id = await run_agent_with_observe()
        except TypeError as e:
            # If observe decorator doesn't work with async, fall back to manual span creation
            if "async" in str(e).lower() or "awaitable" in str(e).lower():
                print("[Laminar] ⚠️  observe decorator doesn't support async, trying manual span...")
                # Try using manual span creation as fallback
                if LAMINAR_AVAILABLE and hasattr(Laminar, "start_active_span"):
                    span = Laminar.start_active_span(name="agent_execution")
                    try:
                        result, trace_id = await run_agent_core()
                    finally:
                        span.end()
                else:
                    # No Laminar, just run without it
                    result, trace_id = await run_agent_core()
            else:
                raise
        
        # If we didn't get trace ID above (outside span context), try again here
        if LAMINAR_AVAILABLE and trace_id is None:
            try:
                trace_id = Laminar.get_trace_id()
                if trace_id is not None:
                    print(f"\n🎥 Laminar Trace ID (retrieved after span): {trace_id}")
            except Exception:
                pass
        elif not LAMINAR_AVAILABLE:
            print("\n⚠️  Laminar not available - trace ID unavailable")
            
    except ValueError as e:
        # API key validation failed - don't start browser
        print(f"\n❌ Sentric API key validation failed")
        print("Agent execution aborted.")
        return
    except Exception as e:
        print(f"\n❌ Agent execution failed: {e}")
        raise
    finally:
        # Fallback: ensure browser is closed even if something went wrong earlier
        try:
            await browser.close()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
