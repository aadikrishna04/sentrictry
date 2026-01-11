"""SentricMonitor - Wraps BrowserUse agents for security observability."""

import asyncio
import json
import threading
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Callable, Optional
from queue import Queue
from pathlib import Path
import subprocess
import sys
import websocket
import requests


# Project root = two levels up from this file (sdk/sentric/ -> sdk/ -> project root)
ROOT_DIR = Path(__file__).resolve().parents[2]
VIDEOS_DIR = ROOT_DIR / "videos"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


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
        self._current_step: int = 0
        self._video_start_time: Optional[float] = None
        self._video_path: Optional[str] = None
        self._browser_context: Optional[Any] = None
        # Optional external real-time screen recorder
        self._realtime_recorder: Optional[subprocess.Popen] = None
        self._realtime_video_path: Optional[str] = None
        # Laminar trace ID for browser session recording
        self._laminar_trace_id: Optional[str] = None

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _make_laminar_trace_public(self, trace_id: str) -> None:
        """Make a Laminar trace public if credentials are configured.

        This is optional - if LAMINAR_PROJECT_ID and LAMINAR_SESSION_TOKEN
        are not set, this will silently skip making the trace public.
        """
        # Check if credentials are configured
        laminar_project_id = os.getenv("LAMINAR_PROJECT_ID")
        laminar_session_token = os.getenv("LAMINAR_SESSION_TOKEN")

        if not laminar_project_id or not laminar_session_token:
            # Credentials not set - silently skip (optional feature)
            return

        try:
            url = f"https://laminar.sh/api/projects/{laminar_project_id}/traces/{trace_id}"

            cookies = {"__Secure-next-auth.session-token": laminar_session_token}

            headers = {
                "Content-Type": "application/json",
                "Origin": "https://laminar.sh",
                "Referer": f"https://laminar.sh/project/{laminar_project_id}/traces",
            }

            # API expects "visibility" field with value "public" or "private" (string, not boolean)
            payload = {"visibility": "public"}

            r = requests.put(
                url,
                json=payload,
                cookies=cookies,
                headers=headers,
                timeout=30,
            )

            r.raise_for_status()
            print(f"[Sentric] ✅ Laminar trace {trace_id} is now public")
        except Exception as e:
            # Failed to make public - log but don't fail the run
            print(f"[Sentric] ⚠️  Could not make Laminar trace public: {e}")

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

    def _start_video_recording(self, agent: Any) -> None:
        """Start video timing for the browser session.

        Actual pixels are recorded by BrowserUse's own video recorder
        (enabled via record_video_dir on the Browser). Here we just
        start a timer so we can compute relative timestamps.
        """
        try:
            self._video_start_time = time.time()
            print(f"[Sentric] Video timing started for run {self.run_id}")

            # Optional: start an external real-time screen recording using ffmpeg
            # Enable by setting SENTRIC_REALTIME_VIDEO=1 in the environment.
            if os.getenv("SENTRIC_REALTIME_VIDEO") == "1":
                try:
                    # Record full screen to a run-scoped MP4 in the shared videos dir
                    realtime_path = VIDEOS_DIR / f"{self.run_id}_realtime.mp4"
                    self._realtime_video_path = str(realtime_path)

                    if sys.platform == "darwin":
                        # macOS screen capture via avfoundation.
                        # Default to capturing laptop screen (Capture screen 0).
                        # You can override with SENTRIC_REALTIME_DEVICE, e.g. "4:none".
                        device = os.getenv("SENTRIC_REALTIME_DEVICE", "3:none")
                        cmd = [
                            "ffmpeg",
                            "-y",
                            "-f",
                            "avfoundation",
                            "-framerate",
                            "30",
                            "-i",
                            device,
                            str(realtime_path),
                        ]
                    elif sys.platform.startswith("linux"):
                        # Common Linux setup using X11; adjust DISPLAY/size if needed.
                        cmd = [
                            "ffmpeg",
                            "-y",
                            "-f",
                            "x11grab",
                            "-framerate",
                            "30",
                            "-i",
                            os.environ.get("DISPLAY", ":0.0"),
                            str(realtime_path),
                        ]
                    elif sys.platform.startswith("win"):
                        # Windows desktop capture via gdigrab.
                        cmd = [
                            "ffmpeg",
                            "-y",
                            "-f",
                            "gdigrab",
                            "-framerate",
                            "30",
                            "-i",
                            "desktop",
                            str(realtime_path),
                        ]
                    else:
                        cmd = None

                    if cmd is not None:
                        self._realtime_recorder = subprocess.Popen(
                            cmd,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                        print(
                            f"[Sentric] Started external real-time recorder for run {self.run_id}: {realtime_path}"
                        )
                    else:
                        print(
                            f"[Sentric] Real-time recording not supported on platform {sys.platform}"
                        )
                except Exception as e:
                    print(
                        f"[Sentric] Warning: Failed to start external real-time recorder: {e}"
                    )

        except Exception as e:
            print(f"[Sentric] Warning: Failed to start video timing: {e}")
            self._video_start_time = time.time()

    def _stop_video_recording(self) -> Optional[str]:
        """Stop video recording and return the video path."""
        if not self._video_start_time:
            return None

        try:
            # Wait a bit for video to finish writing
            time.sleep(0.5)

            # Stop external real-time recorder if running
            if self._realtime_recorder:
                try:
                    self._realtime_recorder.terminate()
                    self._realtime_recorder.wait(timeout=5)
                    print(
                        f"[Sentric] Stopped external real-time recorder for run {self.run_id}"
                    )
                except Exception as e:
                    print(f"[Sentric] Warning: Error stopping real-time recorder: {e}")
                finally:
                    self._realtime_recorder = None

            # Prefer the external real-time recording if it exists
            if self._realtime_video_path and os.path.exists(self._realtime_video_path):
                return self._realtime_video_path

            # Next, if we have an explicit BrowserUse video path and it exists, use it.
            if self._video_path and os.path.exists(self._video_path):
                return self._video_path

            # Otherwise, look for the most recent video file in the shared videos dir.
            try:
                candidates: list[Path] = []
                for ext in ("*.mp4", "*.webm"):
                    candidates.extend(VIDEOS_DIR.glob(ext))

                if candidates:
                    latest = max(candidates, key=lambda p: p.stat().st_mtime)
                    return str(latest)
            except Exception as e:
                print(
                    f"[Sentric] Warning: Could not search videos dir for recording: {e}"
                )

            # Fallback: return whatever path we tracked, even if it doesn't exist.
            return self._video_path

        except Exception as e:
            print(f"[Sentric] Warning: Error stopping video recording: {e}")
            return self._video_path if self._video_path else None

    def _end_run(self, status: str = "completed") -> None:
        """End the current run."""
        if not self.run_id:
            print(f"[Sentric] ERROR: Cannot end run - no run_id set!")
            return

        print(f"[Sentric] Attempting to end run {self.run_id} with status: {status}")

        # Ensure status is valid (backend only accepts: completed, failed, cancelled)
        # But we convert "cancelled" to "failed" since user wants failed for non-completed runs
        valid_statuses = ["completed", "failed", "cancelled"]
        if status not in valid_statuses:
            print(
                f"[Sentric] Warning: Invalid status '{status}', using 'failed' instead"
            )
            status = "failed"

        # Convert "cancelled" to "failed" - if a run isn't completed, it's failed
        if status == "cancelled":
            status = "failed"

        # Stop video recording and upload video
        video_path = self._stop_video_recording()
        video_start_time = None
        if self._video_start_time:
            video_start_time = datetime.fromtimestamp(
                self._video_start_time
            ).isoformat()

        # Try to get Laminar trace ID if available
        try:
            from lmnr import Laminar

            # Use the proper API method to get trace ID
            trace_id_obj = Laminar.get_trace_id()
            if trace_id_obj is not None:
                # Convert UUID to string if needed
                trace_id = str(trace_id_obj)
                self._laminar_trace_id = trace_id
                print(f"[Sentric] Laminar trace ID captured: {trace_id}")

                # Automatically make trace public if credentials are configured
                self._make_laminar_trace_public(trace_id)
        except ImportError:
            # Laminar not available - that's okay
            # The trace will still be in Laminar's system, just not linked in Sentric
            pass
        except (AttributeError, Exception) as e:
            # Laminar available but get_trace_id failed (might be outside span context)
            # This is okay - the trace will still be in Laminar's system
            pass

        # Upload video if it exists
        video_file = None
        if video_path and os.path.exists(video_path):
            try:
                video_file = open(video_path, "rb")
            except Exception as e:
                print(f"[Sentric] Warning: Could not read video file: {e}")

        try:
            url = f"{self.base_url}/runs/{self.run_id}/end"
            headers = self._headers()

            print(f"[Sentric] POST {url} with status={status}, run_id={self.run_id}")

            if video_file:
                # Upload video with the end request using Form data
                files = {"video": ("video.webm", video_file, "video/webm")}
                data = {"status": status}
                if video_start_time:
                    data["video_start_time"] = video_start_time
                if self._laminar_trace_id:
                    data["laminar_trace_id"] = self._laminar_trace_id
                resp = requests.post(
                    url,
                    data=data,
                    files=files,
                    headers=headers,
                    timeout=60,  # Longer timeout for video upload
                )
                video_file.close()
            else:
                # No video, use JSON
                payload = {"status": status}
                if video_start_time:
                    payload["video_start_time"] = video_start_time
                if self._laminar_trace_id:
                    payload["laminar_trace_id"] = self._laminar_trace_id
                resp = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=10,
                )

            print(f"[Sentric] Response status code: {resp.status_code}")

            # Check for HTTP errors
            if resp.status_code >= 400:
                error_msg = resp.text
                try:
                    error_data = resp.json()
                    error_msg = error_data.get("detail", error_msg)
                except:
                    pass
                raise ValueError(f"Backend returned {resp.status_code}: {error_msg}")

            resp.raise_for_status()
            data = resp.json()
            findings = data.get("findings_count", 0)
            print(
                f"[Sentric] ✅ Run ended successfully with status '{status}'. {findings} security finding(s) detected."
            )
            print(f"[Sentric] View report: http://localhost:3000/runs/{self.run_id}")
        except requests.exceptions.Timeout:
            print(
                f"[Sentric] ❌ ERROR: Timeout ending run (status: {status}, run_id: {self.run_id}). Run may still show as 'running'."
            )
            import traceback

            traceback.print_exc()
        except requests.exceptions.ConnectionError as e:
            print(
                f"[Sentric] ❌ ERROR: Could not connect to backend to end run (status: {status}, run_id: {self.run_id}). Run may still show as 'running'."
            )
            print(f"[Sentric] Connection error: {e}")
            import traceback

            traceback.print_exc()
        except ValueError as e:
            # Validation or backend errors – log but don't re-raise so agent shutdown can finish cleanly.
            print(f"[Sentric] ❌ ERROR: Failed to end run - {e}")
            print(
                f"[Sentric] Response body: {resp.text if 'resp' in locals() else 'N/A'}"
            )
            import traceback

            traceback.print_exc()
        except Exception as e:
            print(
                f"[Sentric] ❌ ERROR: Unexpected error ending run (status: {status}, run_id: {self.run_id}): {e}"
            )
            import traceback

            traceback.print_exc()

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
        now = time.time()
        video_timestamp = None
        if self._video_start_time is not None:
            video_timestamp = now - self._video_start_time

        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if video_timestamp is not None:
            event["video_timestamp"] = video_timestamp
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
        step_number: Optional[int] = None,
    ) -> None:
        """Log an agent action."""
        payload = {"kind": kind, "step_number": step_number or self._current_step}
        if selector:
            payload["selector"] = selector
        if url:
            payload["url"] = url
        elif self._current_url:
            payload["url"] = self._current_url
        if value:
            payload["value"] = value

        self._send_event("action", payload)

    def log_reasoning(self, content: str) -> None:
        """Log agent reasoning/thinking."""
        self._send_event("reasoning", {"content": content})

    def log_step_start(self, step_number: int) -> None:
        """Log the start of a new step."""
        self._current_step = step_number
        self._send_event("step_start", {"step_number": step_number})

    def log_step_reasoning(
        self,
        step_number: int,
        evaluation: Optional[str] = None,
        memory: Optional[str] = None,
        next_goal: Optional[str] = None,
    ) -> None:
        """Log structured reasoning for a step."""
        self._current_step = step_number
        self._send_event(
            "step_reasoning",
            {
                "step_number": step_number,
                "evaluation": evaluation,
                "memory": memory,
                "next_goal": next_goal,
            },
        )

    def _register_callbacks(self, agent: Any) -> None:
        """Register callbacks on the BrowserUse agent to intercept actions.

        This uses the public BrowserUse API (register_new_step_callback) to work
        with any agent configuration and any LLM model.
        """
        # Hook into controller's registry for action callbacks (if available)
        # Handle both "controller" and "tools" (they're aliases in BrowserUse)
        tools = getattr(agent, "controller", None) or getattr(agent, "tools", None)

        if (
            tools
            and hasattr(tools, "registry")
            and hasattr(tools.registry, "execute_action")
        ):
            original_execute = tools.registry.execute_action
            self._original_callbacks["execute_action"] = original_execute

            async def wrapped_execute(action_name: str, params: dict, *args, **kwargs):
                # Log the action with current step number
                self.log_action(
                    kind=action_name,
                    selector=params.get("selector")
                    or (
                        str(params.get("index", ""))
                        if params.get("index") is not None
                        else None
                    ),
                    url=params.get("url"),
                    value=params.get("text") or params.get("value"),
                    step_number=self._current_step,
                )
                # Track URL changes
                if action_name in ["go_to_url", "navigate"]:
                    self._current_url = params.get("url", self._current_url)

                return await original_execute(action_name, params, *args, **kwargs)

            tools.registry.execute_action = wrapped_execute

        # Use the public API: register_new_step_callback
        # Signature: (browser_state_summary: BrowserStateSummary, agent_output: AgentOutput, step_number: int)
        original_callback = getattr(agent, "register_new_step_callback", None)
        if original_callback:
            self._original_callbacks["register_new_step_callback"] = original_callback

        async def step_callback(
            browser_state_summary: Any, agent_output: Any, step_number: int
        ):
            """Callback that matches BrowserUse's register_new_step_callback signature."""
            print(f"[Sentric] 🔔 Step callback invoked: step={step_number}")

            # Update current step
            if step_number > self._current_step:
                self.log_step_start(step_number)

            # Extract URL from browser_state_summary if available
            if browser_state_summary and hasattr(browser_state_summary, "url"):
                self._current_url = browser_state_summary.url

            # Extract reasoning from AgentOutput
            if agent_output:
                print(f"[Sentric] 📋 agent_output type: {type(agent_output).__name__}")
                print(
                    f"[Sentric] 📋 agent_output attrs: {[a for a in dir(agent_output) if not a.startswith('_')][:10]}"
                )

                evaluation = None
                memory = None
                next_goal = None

                # AgentOutput has these fields directly (not nested)
                if hasattr(agent_output, "evaluation_previous_goal"):
                    evaluation = (
                        str(agent_output.evaluation_previous_goal)
                        if agent_output.evaluation_previous_goal
                        else None
                    )
                if hasattr(agent_output, "memory"):
                    memory = str(agent_output.memory) if agent_output.memory else None
                if hasattr(agent_output, "next_goal"):
                    next_goal = (
                        str(agent_output.next_goal) if agent_output.next_goal else None
                    )

                print(
                    f"[Sentric] 💭 Reasoning: eval={evaluation[:50] if evaluation else None}..., memory={memory[:50] if memory else None}..., goal={next_goal[:50] if next_goal else None}..."
                )

                # Log structured reasoning if available
                if evaluation or memory or next_goal:
                    self.log_step_reasoning(
                        step_number=step_number,
                        evaluation=evaluation,
                        memory=memory,
                        next_goal=next_goal,
                    )
                    print(f"[Sentric] ✅ Sent step_reasoning event")
                else:
                    print(f"[Sentric] ⚠️ No reasoning data found in agent_output")

                # Log the action being taken
                if hasattr(agent_output, "action") and agent_output.action:
                    for action_item in agent_output.action:
                        # Action items are ActionModel instances with model_dump method
                        if hasattr(action_item, "model_dump"):
                            action_dict = action_item.model_dump(exclude_unset=True)
                            for action_name, action_params in action_dict.items():
                                if action_params is not None:
                                    params = (
                                        action_params
                                        if isinstance(action_params, dict)
                                        else {}
                                    )
                                    self.log_action(
                                        kind=action_name,
                                        selector=(
                                            str(params.get("index", ""))
                                            if params.get("index") is not None
                                            else None
                                        ),
                                        url=params.get("url") if params else None,
                                        value=(
                                            params.get("text") or params.get("value")
                                            if params
                                            else None
                                        ),
                                        step_number=step_number,
                                    )
                                    # Track URL changes
                                    if action_name == "go_to_url" and params:
                                        self._current_url = params.get(
                                            "url", self._current_url
                                        )

            # Chain to original callback if it exists
            if original_callback:
                if asyncio.iscoroutinefunction(original_callback):
                    await original_callback(
                        browser_state_summary, agent_output, step_number
                    )
                else:
                    original_callback(browser_state_summary, agent_output, step_number)

        # Set the callback (works even if agent is already created)
        agent.register_new_step_callback = step_callback

    def _unregister_callbacks(self, agent: Any) -> None:
        """Restore original callbacks."""
        # Restore execute_action callback
        tools = getattr(agent, "controller", None) or getattr(agent, "tools", None)
        if tools and "execute_action" in self._original_callbacks:
            if hasattr(tools, "registry"):
                tools.registry.execute_action = self._original_callbacks[
                    "execute_action"
                ]

        # Restore register_new_step_callback (or set to None if it didn't exist)
        if "register_new_step_callback" in self._original_callbacks:
            agent.register_new_step_callback = self._original_callbacks[
                "register_new_step_callback"
            ]
        else:
            agent.register_new_step_callback = None

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

        # Start video recording
        self._start_video_recording(agent)

        status = (
            "completed"  # Default to completed, will be updated if exception occurs
        )
        try:
            yield agent
            # If we get here without exception, the run completed successfully
            status = "completed"
        except (KeyboardInterrupt, asyncio.CancelledError, SystemExit):
            # Any interruption or cancellation means the run failed
            status = "failed"
            try:
                self.log_reasoning("Run interrupted or cancelled - marked as failed")
            except:
                pass  # Don't fail on logging during interrupt
            raise
        except Exception as e:
            # Any other exception means the run failed
            status = "failed"
            try:
                self.log_reasoning(f"Agent failed with error: {str(e)}")
            except:
                pass  # Don't fail on logging during exception
            raise
        finally:
            # CRITICAL: End the run FIRST before any async cleanup
            # This ensures the run status is updated even if cleanup fails or is interrupted
            # If status is still "running" or anything other than "completed", mark as "failed"
            if status != "completed":
                status = "failed"

            # End run immediately and synchronously (before async cleanup)
            print(f"[Sentric] Ending run with status: {status}")
            try:
                self._end_run(status)
            except Exception as e:
                # Last resort - at least print an error
                print(
                    f"[Sentric] CRITICAL ERROR: Failed to end run with status '{status}': {e}"
                )
                import traceback

                traceback.print_exc()

            # Now do cleanup - but run ending is more important
            try:
                self._unregister_callbacks(agent)
            except Exception as e:
                print(f"[Sentric] Warning: Error unregistering callbacks: {e}")

            # Flush remaining events (but don't wait too long)
            try:
                await asyncio.sleep(0.1)  # Reduced from 0.5 to 0.1 seconds
            except:
                pass  # Don't fail on sleep if we're shutting down

            try:
                self._stop_sender_thread()
            except Exception as e:
                print(f"[Sentric] Warning: Error stopping sender thread: {e}")

            try:
                self._disconnect_ws()
            except Exception as e:
                print(f"[Sentric] Warning: Error disconnecting WebSocket: {e}")
