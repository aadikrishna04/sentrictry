"""SentricMonitor - Wraps BrowserUse agents for security observability."""

import asyncio
import json
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Callable, Optional
from queue import Queue
import websocket
import requests


class SentricMonitor:
    """Security monitoring wrapper for BrowserUse agents.

    Usage:
        monitor = SentricMonitor(api_key="sk_...", project_id="proj_...")

        agent = Agent(task="...", llm=llm)

        async with monitor.wrap(agent):
            await agent.run()
    """

    def __init__(
        self,
        api_key: str,
        project_id: str,
        base_url: str = "http://localhost:8000",
    ):
        self.api_key = api_key
        self.project_id = project_id
        self.base_url = base_url.rstrip("/")

        self.run_id: Optional[str] = None
        self.ws_url: Optional[str] = None
        self.ws: Optional[websocket.WebSocket] = None
        self._event_queue: Queue = Queue()
        self._sender_thread: Optional[threading.Thread] = None
        self._stop_sender = False
        self._original_callbacks: dict = {}
        self._current_url: str = ""

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _start_run(self, task: Optional[str] = None) -> None:
        """Start a new run on the Sentric backend."""
        try:
            resp = requests.post(
                f"{self.base_url}/runs/start",
                json={"task": task},
                headers=self._headers(),
                timeout=5,
            )

            # Check for authentication errors
            if resp.status_code == 401:
                error_msg = resp.json().get("detail", "Invalid API key")
                raise ValueError(f"Invalid Sentric API key: {error_msg}")

            resp.raise_for_status()
            data = resp.json()
            self.run_id = data["run_id"]
            self.ws_url = data["ws_url"]
            print(f"[Sentric] Run started: {self.run_id}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, "response") and e.response is not None:
                if e.response.status_code == 401:
                    error_msg = e.response.json().get("detail", "Invalid API key")
                    raise ValueError(f"Invalid Sentric API key: {error_msg}")
            raise ValueError(f"Failed to connect to Sentric backend: {e}")
        except ValueError:
            # Re-raise ValueError (invalid API key)
            raise
        except Exception as e:
            raise ValueError(f"Failed to start Sentric run: {e}")

    def _end_run(self, status: str = "completed") -> None:
        """End the current run."""
        if not self.run_id:
            return

        try:
            resp = requests.post(
                f"{self.base_url}/runs/{self.run_id}/end",
                json={"status": status},
                headers=self._headers(),
                timeout=10,
            )
            data = resp.json()
            findings = data.get("findings_count", 0)
            print(f"[Sentric] Run ended. {findings} security finding(s) detected.")
            print(f"[Sentric] View report: http://localhost:3000/runs/{self.run_id}")
        except Exception as e:
            print(f"[Sentric] Warning: Failed to end run: {e}")

    def _connect_ws(self) -> None:
        """Establish WebSocket connection."""
        if not self.ws_url:
            return

        try:
            # WebSocket URL should already include API key from backend
            # If not, add it as query parameter
            if "api_key=" not in self.ws_url:
                separator = "&" if "?" in self.ws_url else "?"
                ws_url_with_key = f"{self.ws_url}{separator}api_key={self.api_key}"
            else:
                ws_url_with_key = self.ws_url

            self.ws = websocket.create_connection(ws_url_with_key, timeout=5)
        except Exception as e:
            print(
                f"[Sentric] Warning: WebSocket connection failed, using HTTP fallback"
            )
            self.ws = None

    def _disconnect_ws(self) -> None:
        """Close WebSocket connection."""
        if self.ws:
            try:
                self.ws.close()
            except:
                pass
            self.ws = None

    def _send_event(self, event_type: str, payload: dict) -> None:
        """Queue an event for sending (non-blocking)."""
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._event_queue.put(event)

    def _sender_loop(self) -> None:
        """Background thread that sends events."""
        while not self._stop_sender:
            try:
                event = self._event_queue.get(timeout=0.1)
            except:
                continue

            # Try WebSocket first
            sent = False
            if self.ws:
                try:
                    self.ws.send(json.dumps(event))
                    sent = True
                except:
                    self.ws = None

            # Fall back to HTTP
            if not sent and self.run_id:
                try:
                    requests.post(
                        f"{self.base_url}/runs/{self.run_id}/events",
                        json=event,
                        headers=self._headers(),
                        timeout=2,
                    )
                except:
                    pass  # Never block agent execution

    def _start_sender(self) -> None:
        """Start the background sender thread."""
        self._stop_sender = False
        self._sender_thread = threading.Thread(target=self._sender_loop, daemon=True)
        self._sender_thread.start()

    def _stop_sender_thread(self) -> None:
        """Stop the background sender thread."""
        self._stop_sender = True
        if self._sender_thread:
            self._sender_thread.join(timeout=2)
            self._sender_thread = None

    def log_action(
        self,
        kind: str,
        selector: Optional[str] = None,
        url: Optional[str] = None,
        value: Optional[str] = None,
        **kwargs,
    ) -> None:
        """Log an agent action."""
        payload = {"kind": kind}
        if selector:
            payload["selector"] = selector
        if url:
            payload["url"] = url
            self._current_url = url
        elif self._current_url:
            payload["url"] = self._current_url
        if value:
            payload["value"] = value
        
        # Include any additional parameters
        for key, val in kwargs.items():
            if val is not None:
                payload[key] = val

        self._send_event("action", payload)

    def log_reasoning(self, content: str) -> None:
        """Log agent reasoning/thinking."""
        self._send_event("reasoning", {"content": content})

    def _register_callbacks(self, agent: Any) -> None:
        """Register callbacks on the BrowserUse agent to intercept actions."""
        # Hook into controller's registry for action callbacks
        if hasattr(agent, "controller") and agent.controller:
            controller = agent.controller

            # Store original execute method if exists
            if hasattr(controller, "registry") and hasattr(
                controller.registry, "execute_action"
            ):
                original_execute = controller.registry.execute_action
                self._original_callbacks["execute_action"] = original_execute

                async def wrapped_execute(
                    action_name: str, params: dict, *args, **kwargs
                ):
                    # Log the action
                    self.log_action(
                        kind=action_name,
                        selector=params.get("selector") or params.get("index"),
                        url=params.get("url"),
                        value=params.get("text") or params.get("value"),
                    )
                    # Track URL changes
                    if action_name in ["go_to_url", "navigate"]:
                        self._current_url = params.get("url", self._current_url)

                    return await original_execute(action_name, params, *args, **kwargs)

                controller.registry.execute_action = wrapped_execute

        # Hook into agent's step callback for reasoning
        if hasattr(agent, "_step_callback"):
            self._original_callbacks["step_callback"] = agent._step_callback

        # Create a callback that logs model outputs (reasoning)
        original_callback = getattr(agent, "_step_callback", None)

        async def step_callback(step_info):
            # Extract reasoning from step info
            if hasattr(step_info, "model_output") and step_info.model_output:
                output = step_info.model_output
                # Log thinking/reasoning
                if hasattr(output, "current_state") and output.current_state:
                    state = output.current_state
                    reasoning_parts = []
                    
                    # Build comprehensive reasoning message
                    if hasattr(state, "evaluation_previous_goal") and state.evaluation_previous_goal:
                        reasoning_parts.append(f"Evaluation: {state.evaluation_previous_goal}")
                    if hasattr(state, "memory") and state.memory:
                        reasoning_parts.append(f"Memory: {state.memory}")
                    if hasattr(state, "next_goal") and state.next_goal:
                        reasoning_parts.append(f"Next goal: {state.next_goal}")
                    
                    if reasoning_parts:
                        self.log_reasoning("\n".join(reasoning_parts))

                # Log the action being taken with full details
                if hasattr(output, "action") and output.action:
                    action = output.action
                    for action_item in action:
                        action_dict = (
                            action_item.model_dump()
                            if hasattr(action_item, "model_dump")
                            else {}
                        )
                        for action_name, action_params in action_dict.items():
                            if action_params is not None:
                                params = (
                                    action_params
                                    if isinstance(action_params, dict)
                                    else {}
                                )
                                
                                # Extract all relevant parameters
                                selector = None
                                if "selector" in params:
                                    selector = params["selector"]
                                elif "index" in params:
                                    selector = f"index:{params['index']}"
                                
                                url = params.get("url")
                                value = params.get("text") or params.get("value")
                                
                                # Create detailed action payload
                                action_payload = {"kind": action_name}
                                if selector:
                                    action_payload["selector"] = selector
                                if url:
                                    action_payload["url"] = url
                                    self._current_url = url
                                elif self._current_url:
                                    action_payload["url"] = self._current_url
                                if value:
                                    action_payload["value"] = value
                                
                                # Include additional params for context
                                if params:
                                    # Include other relevant params
                                    for key in ["new_tab", "clear", "down", "pages"]:
                                        if key in params:
                                            action_payload[key] = params[key]
                                
                                self._send_event("action", action_payload)

            # Call original callback if exists
            if original_callback:
                await original_callback(step_info)

        agent._step_callback = step_callback

        # Also try to hook into the on_step_end if available
        if hasattr(agent, "register_step_callback"):
            agent.register_step_callback(step_callback)

    def _unregister_callbacks(self, agent: Any) -> None:
        """Restore original callbacks."""
        if hasattr(agent, "controller") and agent.controller:
            controller = agent.controller
            if "execute_action" in self._original_callbacks:
                if hasattr(controller, "registry"):
                    controller.registry.execute_action = self._original_callbacks[
                        "execute_action"
                    ]

        if "step_callback" in self._original_callbacks:
            agent._step_callback = self._original_callbacks["step_callback"]

        self._original_callbacks.clear()

    @asynccontextmanager
    async def wrap(self, agent: Any):
        """Async context manager to wrap an agent for monitoring.

        Args:
            agent: A BrowserUse Agent instance

        Yields:
            The same agent, now monitored

        Usage:
            async with monitor.wrap(agent):
                await agent.run()

        Raises:
            ValueError: If API key is invalid or Sentric backend is unreachable
        """
        # Extract task from agent if available
        task = getattr(agent, "task", None)

        # Start run - this will raise ValueError if API key is invalid
        try:
            self._start_run(task)
        except ValueError as e:
            # API key validation failed - don't start the agent
            print(f"\n❌ {e}")
            print("Agent execution aborted. Please check your Sentric API key.")
            raise

        # If we get here, run started successfully
        self._connect_ws()
        self._start_sender()

        # Register callbacks
        self._register_callbacks(agent)

        status = "completed"
        try:
            yield agent
        except Exception as e:
            status = "failed"
            self.log_reasoning(f"Agent failed with error: {str(e)}")
            raise
        finally:
            # Cleanup
            self._unregister_callbacks(agent)

            # Flush remaining events
            await asyncio.sleep(0.5)

            self._stop_sender_thread()
            self._disconnect_ws()
            self._end_run(status)
