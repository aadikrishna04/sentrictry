"""Demo Agent for Sentric

This script simulates a BrowserUse agent to demonstrate Sentric's
security observability features. Run this while the backend and
dashboard are running to see live monitoring in action.

Usage:
    1. Start the backend: cd backend && python main.py
    2. Start the frontend: cd frontend && npm run dev
    3. Run this demo: python demo_agent.py
"""

import asyncio
import sys
import os
import random

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sdk"))

from sentric import SentricMonitor


class MockAgent:
    """Mock BrowserUse agent for demonstration."""

    def __init__(self, task: str):
        self.task = task
        self._step_callback = None

    async def run(self):
        """Simulate agent execution with various actions."""
        print(f"Agent starting: {self.task}\n")

        # Simulate a multi-step browser automation
        steps = [
            {
                "reasoning": "Navigating to the travel booking site to search for flights.",
                "action": ("go_to_url", {"url": "https://travel.example.com"}),
            },
            {
                "reasoning": "Clicking on the flight search button to access booking form.",
                "action": ("click", {"index": 5, "selector": "#search-flights"}),
            },
            {
                "reasoning": "Entering departure city into the form.",
                "action": ("input_text", {"index": 10, "text": "New York"}),
            },
            {
                "reasoning": "Entering destination city.",
                "action": ("input_text", {"index": 11, "text": "Los Angeles"}),
            },
            {
                "reasoning": "Submitting search to find available flights.",
                "action": ("click", {"index": 15, "selector": "#search-btn"}),
            },
            {
                "reasoning": "Found cheaper flights on this site, but I'm not sure if it's trustworthy...",
                "action": ("go_to_url", {"url": "http://cheap-flights.xyz/results"}),
            },
            {
                "reasoning": "Selecting the cheapest flight option.",
                "action": ("click", {"index": 3, "selector": "#book-now"}),
            },
            {
                "reasoning": "Entering payment information to complete booking.",
                "action": ("input_text", {"index": 20, "text": "4111111111111111"}),
            },
            {
                "reasoning": "Submitting payment form.",
                "action": ("click", {"index": 25, "selector": "#submit-payment"}),
            },
            {
                "reasoning": "Payment submitted. Booking should be confirmed shortly.",
                "action": ("done", {"text": "Flight booked successfully"}),
            },
        ]

        current_url = ""

        for step in steps:
            await asyncio.sleep(random.uniform(0.5, 1.5))  # Simulate real-time delays

            action_name, action_params = step["action"]

            # Track URL
            if action_name == "go_to_url":
                current_url = action_params.get("url", "")

            # Create mock step info for callback
            class MockState:
                def __init__(self, reasoning):
                    self.evaluation_previous_goal = "Previous action successful"
                    self.memory = "Searching for vacation options"
                    self.next_goal = reasoning

            class MockAction:
                def __init__(self, name, params):
                    self._name = name
                    self._params = params

                def model_dump(self):
                    return {self._name: self._params}

            class MockOutput:
                def __init__(self, state, action_name, action_params):
                    self.current_state = state
                    self.action = [MockAction(action_name, action_params)]

            class MockStepInfo:
                def __init__(self, output):
                    self.model_output = output

            # Call step callback if registered (Sentric hooks into this)
            if self._step_callback:
                mock_output = MockOutput(
                    MockState(step["reasoning"]), action_name, action_params
                )
                await self._step_callback(MockStepInfo(mock_output))

            # Print progress
            print(f"💭 {step['reasoning']}")
            print(f"⚡ {action_name}: {action_params}\n")

        print("✅ Agent completed task")

        class MockResult:
            final_answer = "Found 3 flights and 3 hotels for your vacation!"

        return MockResult()


async def main():
    # Initialize Sentric monitor with demo credentials
    monitor = SentricMonitor(
        api_key="sk_demo_123456",
        project_id="proj_demo",
        base_url="http://localhost:8000",
    )

    # Create mock agent
    agent = MockAgent(task="Book a flight from New York to Los Angeles")

    print("=" * 60)
    print("Sentric Demo - Security Observability for AI Agents")
    print("=" * 60)
    print("\nOpen http://localhost:3000 to see the dashboard\n")

    # Run agent with Sentric monitoring
    async with monitor.wrap(agent):
        result = await agent.run()

    print("\n" + "=" * 60)
    print("Demo complete! Check the dashboard for the security report.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
