import asyncio
import os
import sys

# Add SDK to path (in production, user would `pip install sentric`)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sdk"))

from browser_use import Agent, Browser
from browser_use.controller import Controller
from browser_use.llm import ChatOpenAI
from sentric import SentricMonitor


# -------------------------
# CONFIG
# -------------------------

OPENAI_API_KEY = ""  # TODO: Replace with your OpenAI API key
LLM_MODEL = "gpt-5-mini"  # or any supported model
START_URL = "https://www.google.com"

# Connect to user's actual Chrome browser (preserves cookies, sessions, extensions)
# Note: You need to fully close Chrome before running this
browser = Browser(
    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    user_data_dir=os.path.expanduser("~/Library/Application Support/Google/Chrome"),
    profile_directory="Default",  # Use 'Profile 1', 'Profile 2', etc. if needed
    headless=False,
)


# -------------------------
# AGENT GOAL
# -------------------------

VACATION_GOAL = f"""
You are a vacation planning assistant.

Plan a complete vacation automatically:
- Origin: New York City (NYC)
- Destination: Paris, France
- Duration: 7 days
- Travel dates: Sometime in June 2025
- Budget: Mid-range

Start by navigating to {START_URL}

Your task:
1. Search for and collect 2-3 flight options from NYC to Paris for June 2025, including:
   - Airline names
   - Prices
   - Departure/arrival times
   - Flight duration

2. Search for and collect 2-3 hotel/accommodation options in Paris, including:
   - Hotel names
   - Prices per night
   - Ratings/reviews
   - Location

3. Search for and suggest 5-7 activities/attractions to do in Paris during the 7-day trip, including:
   - Activity names
   - Brief descriptions
   - Any relevant details (hours, prices if available)

4. Create a final summary with:
   - Recommended flight option
   - Recommended accommodation option
   - Day-by-day activity itinerary for 7 days
   - Estimated total trip cost

Do NOT ask for user input - use the information above.
Do NOT book anything - just research and provide a complete plan.
Stop once you've provided the comprehensive vacation plan summary.
"""


# -------------------------
# SENTRIC MONITOR SETUP
# -------------------------

monitor = SentricMonitor(
    api_key="sk_2qxzS5F1Vl-uURZ2D56K3k9CBF5QBdDbJZa6pJO7OxI",
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
)


# -------------------------
# RUN AGENT WITH SENTRIC
# -------------------------


async def main():
    print("🌴 Vacation Planning Agent Started")
    print("⚠️  Make sure Chrome is fully closed before running!\n")

    # Validate Sentric API key BEFORE starting browser
    # This will raise ValueError if API key is invalid
    try:
        # Start Sentric monitoring - validates API key immediately
        async with monitor.wrap(agent):
            print("✅ Sentric API key validated")
            print(
                "The browser will open with your logged-in sessions and extensions...\n"
            )

            # Start browser only after Sentric validation succeeds
            await browser.start()

            result = await agent.run()

            print("\n✅ Vacation Planning Completed")
            print("================================")
            # The result is an AgentHistoryList - extract final answer from last step
            if result and len(result) > 0:
                last_step = result[-1]
                if hasattr(last_step, "model_output") and last_step.model_output:
                    output = last_step.model_output
                    if hasattr(output, "current_state") and output.current_state:
                        if hasattr(output.current_state, "next_goal"):
                            print(output.current_state.next_goal)
                        elif hasattr(output.current_state, "memory"):
                            print(output.current_state.memory)
                    # Check if there's a final answer in the step
                    if hasattr(output, "final_answer"):
                        print(output.final_answer)
                # Check if step has a final_answer attribute
                if hasattr(last_step, "final_answer"):
                    print(last_step.final_answer)
            else:
                print("Task completed successfully")
    except ValueError as e:
        # API key validation failed - don't start browser
        print(f"\n❌ Sentric API key validation failed")
        print("Agent execution aborted.")
        return
    except Exception as e:
        print(f"\n❌ Agent execution failed: {e}")
        raise
    finally:
        # Make sure browser is closed even if there's an error
        try:
            await browser.close()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())
