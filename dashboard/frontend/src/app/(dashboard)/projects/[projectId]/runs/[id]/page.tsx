"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Target } from "lucide-react";

interface Event {
  type: "action" | "reasoning" | "step_start" | "step_reasoning";
  payload: Record<string, unknown>;
  timestamp: string;
  video_timestamp?: number;
}

interface StepGroup {
  stepNumber: number;
  reasoning?: {
    evaluation?: string;
    memory?: string;
    next_goal?: string;
  };
  actions: Event[];
  timestamp: string;
  videoTimestamp?: number;
}

interface Finding {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  evidence: unknown[];
}

interface Run {
  id: string;
  project_id: string;
  name: string | null;
  task: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  events: Event[];
  findings: Finding[];
  video_path?: string;
  video_start_time?: string;
  laminar_trace_id?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.sentriclabs.com";

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;
  const projectId = params.projectId as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "security">(
    "timeline"
  );
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevStatusRef = useRef<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    fetchRun();

    // Connect WebSocket for live updates
    // Pass JWT token as query parameter for authentication
    const wsUrl = token
      ? `ws://localhost:8000/ws/${runId}?token=${encodeURIComponent(token)}`
      : `ws://localhost:8000/ws/${runId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected for live updates");
    };

    ws.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data);
        setRun((prev) => {
          if (!prev) return prev;
          // Add new event to the events array
          return { ...prev, events: [...prev.events, newEvent] };
        });
      } catch (e) {
        console.error("Failed to parse WebSocket event:", e);
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket error - live updates disabled", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => ws.close();
  }, [runId]);

  useEffect(() => {
    // Auto-scroll to bottom when new events arrive, but only if run is currently running
    if (run?.status === "running") {
      eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [run?.events.length, run?.status]);

  // Poll for run updates while running to detect completion
  useEffect(() => {
    if (!run || run.status !== "running") return;

    const interval = setInterval(() => {
      fetchRun();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [run?.status, runId]);

  // Initialize prevStatusRef when run is first loaded
  useEffect(() => {
    if (run && prevStatusRef.current === null) {
      prevStatusRef.current = run.status;
    }
  }, [run]);

  // Scroll to top and show Laminar button when run completes
  useEffect(() => {
    if (!run) return;

    const prevStatus = prevStatusRef.current;
    const currentStatus = run.status;

    // If status changed from "running" to completed/failed, scroll to top
    if (
      prevStatus === "running" &&
      (currentStatus === "completed" || currentStatus === "failed")
    ) {
      // Scroll to top of the timeline container to show the Laminar button
      if (timelineContainerRef.current) {
        timelineContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    prevStatusRef.current = currentStatus;
  }, [run?.status]);

  async function fetchRun() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRun(await res.json());
      } else if (res.status === 401) {
        router.push("/auth");
      }
    } catch (e) {
      console.error("Failed to fetch run:", e);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString();
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  }

  function groupEventsByStep(events: Event[]): StepGroup[] {
    const steps = new Map<number, StepGroup>();
    let currentStep = 0;

    for (const event of events) {
      if (event.type === "step_start") {
        const stepNum =
          (event.payload as { step_number?: number }).step_number || 0;
        currentStep = stepNum;
        if (!steps.has(stepNum)) {
          steps.set(stepNum, {
            stepNumber: stepNum,
            actions: [],
            timestamp: event.timestamp,
            videoTimestamp: event.video_timestamp,
          });
        }
      } else if (event.type === "step_reasoning") {
        const payload = event.payload as {
          step_number?: number;
          evaluation?: string;
          memory?: string;
          next_goal?: string;
        };
        const stepNum = payload.step_number || currentStep;
        currentStep = stepNum;

        if (!steps.has(stepNum)) {
          steps.set(stepNum, {
            stepNumber: stepNum,
            actions: [],
            timestamp: event.timestamp,
            videoTimestamp: event.video_timestamp,
          });
        }

        const step = steps.get(stepNum)!;
        step.reasoning = {
          evaluation: payload.evaluation,
          memory: payload.memory,
          next_goal: payload.next_goal,
        };
        if (!step.timestamp) {
          step.timestamp = event.timestamp;
        }
        if (
          event.video_timestamp !== undefined &&
          step.videoTimestamp === undefined
        ) {
          step.videoTimestamp = event.video_timestamp;
        }
      } else if (event.type === "action") {
        const payload = event.payload as { step_number?: number };
        const stepNum = payload.step_number || currentStep;
        currentStep = stepNum;

        if (!steps.has(stepNum)) {
          steps.set(stepNum, {
            stepNumber: stepNum,
            actions: [],
            timestamp: event.timestamp,
            videoTimestamp: event.video_timestamp,
          });
        }

        const step = steps.get(stepNum)!;
        step.actions.push(event);
        // Use first action's video timestamp if step doesn't have one
        if (
          event.video_timestamp !== undefined &&
          step.videoTimestamp === undefined
        ) {
          step.videoTimestamp = event.video_timestamp;
        }
      } else {
        // Legacy reasoning events - assign to current step
        if (!steps.has(currentStep)) {
          steps.set(currentStep, {
            stepNumber: currentStep,
            actions: [],
            timestamp: event.timestamp,
            videoTimestamp: event.video_timestamp,
          });
        }
        // Convert legacy reasoning to step_reasoning format
        const step = steps.get(currentStep)!;
        if (!step.reasoning) {
          step.reasoning = {};
        }
        const content = (event.payload as { content?: string }).content || "";
        if (content && !step.reasoning.memory) {
          step.reasoning.memory = content;
        }
        if (
          event.video_timestamp !== undefined &&
          step.videoTimestamp === undefined
        ) {
          step.videoTimestamp = event.video_timestamp;
        }
      }
    }

    return Array.from(steps.values()).sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
  }

  function seekToTimestamp(timestamp: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
    }
  }

  function getLaminarUrl(traceId: string, timestamp?: number): string {
    // Laminar URL format: https://laminar.sh/shared/traces/{trace_id}
    // With timestamp: add ?t={seconds} query param
    const baseUrl = process.env.NEXT_PUBLIC_LAMINAR_URL || "https://laminar.sh";
    let url = `${baseUrl}/shared/traces/${traceId}`;
    if (timestamp !== undefined) {
      url += `?t=${timestamp.toFixed(1)}`;
    }
    return url;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-textSecondary font-serif">
        Loading...
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen flex items-center justify-center text-textSecondary font-serif">
        Run not found
      </div>
    );
  }

  const severityCounts = run.findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-background overflow-hidden">
      <header className="px-12 pt-6 pb-8 border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <Link
          href={`/projects/${projectId}/runs`}
          className="text-sm text-textSecondary mb-4 inline-block hover:text-textPrimary transition-colors font-serif"
        >
          ← Back to Runs
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 font-serif">
              <span className="text-white">{run.name || run.id}</span>
            </h1>
            <p className="text-[15px] text-textSecondary font-mono opacity-60">
                {run.id}
            </p>
          </div>
          <div>
            <span
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-sm font-medium font-serif ${
                run.status === "running"
                    ? "bg-accent/15 text-accent"
                    : run.status === "completed"
                    ? "bg-green-500/15 text-green-400"
                    : "bg-red-500/15 text-red-400"
                }`}
            >
                {run.status === "running" && (
                <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
                )}
                {run.status}
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-1 px-12 py-4 border-b border-white/10 bg-white/5">
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all font-serif ${
            activeTab === "timeline"
              ? "bg-white/10 text-textPrimary"
              : "bg-transparent text-textSecondary hover:text-textPrimary"
          }`}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline ({run.events.length})
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all font-serif ${
            activeTab === "security"
              ? "bg-white/10 text-textPrimary"
              : "bg-transparent text-textSecondary hover:text-textPrimary"
          }`}
          onClick={() => setActiveTab("security")}
        >
          Security Report ({run.findings.length})
        </button>
      </div>

      <main className="px-12 py-8 max-w-[1000px] mx-auto flex flex-col flex-1 min-h-0">
        {activeTab === "timeline" ? (
          <div
            ref={timelineContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden pr-2"
          >
            {/* Laminar Recording Link - Show when Laminar trace is available */}
            {run &&
              (run.status === "completed" || run.status === "failed") &&
              run.laminar_trace_id && (
                <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">🎥</span>
                    <div className="flex-1">
                      <h3 className="m-0 mb-2 text-lg font-semibold text-textPrimary font-serif">
                        Full Browser Session Recording
                      </h3>
                      <p className="m-0 mb-4 text-sm text-textSecondary leading-relaxed font-serif">
                        View the complete real-time browser recording synced
                        with agent steps in Laminar
                      </p>
                      <a
                        href={getLaminarUrl(run.laminar_trace_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-5 py-2.5 bg-accent hover:bg-accentHover text-background rounded-lg text-sm font-medium transition-all font-serif"
                      >
                        Open in Laminar →
                      </a>
                    </div>
                  </div>
                </div>
              )}
            {/* Video Player - Show when run is completed or failed and video exists (fallback) */}
            {run &&
              (run.status === "completed" || run.status === "failed") &&
              run.video_path &&
              !run.laminar_trace_id && (
                <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4 overflow-hidden">
                  <video
                    ref={videoRef}
                    controls
                    className="w-full max-h-[600px] rounded-lg"
                    src={`${API_URL}/api/runs/${runId}/video`}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            <div className="flex flex-col gap-4">
              {run.task && (
                <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl border border-amber-500/20 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                       <Target size={18} className="text-amber-500" />
                    </div>
                    <h3 className="m-0 text-sm font-semibold text-amber-500 uppercase tracking-wider font-serif">
                       Primary Goal
                    </h3>
                  </div>
                  <p className="text-[15px] text-textPrimary leading-relaxed font-serif bg-amber-500/5 p-4 rounded-lg border border-amber-500/10 italic">
                    {run.task}
                  </p>
                </div>
              )}
              {run.events.length === 0 ? (
                <div className="py-16 px-12 text-center text-textSecondary bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 font-serif">
                  <p>No events yet</p>
                  {run.status === "running" && (
                    <p className="text-sm text-textSecondary mt-2 font-serif">
                      Waiting for agent activity...
                    </p>
                  )}
                </div>
              ) : (
                groupEventsByStep(run.events).map((step, stepIdx) => (
                  <div
                    key={stepIdx}
                    className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-5 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-center mb-2 pb-3 border-b border-white/10">
                      <h3 className="m-0 text-lg font-semibold text-textPrimary font-serif">
                        Step {step.stepNumber}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-textSecondary text-sm font-mono">
                          {formatTime(step.timestamp)}
                        </span>
                        {step.videoTimestamp !== undefined &&
                          run &&
                          (run.status === "completed" ||
                            run.status === "failed") &&
                          (run.laminar_trace_id ? (
                            <a
                              href={getLaminarUrl(
                                run.laminar_trace_id,
                                step.videoTimestamp
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-accent hover:bg-accentHover text-background rounded-md text-sm font-medium cursor-pointer transition-all font-serif"
                              title={`Jump to ${step.videoTimestamp.toFixed(
                                1
                              )}s in Laminar recording`}
                            >
                              ▶ Watch Replay
                            </a>
                          ) : run.video_path ? (
                            <button
                              className="px-3 py-1.5 bg-accent hover:bg-accentHover text-background rounded-md text-sm font-medium cursor-pointer transition-all font-serif"
                              onClick={() =>
                                seekToTimestamp(step.videoTimestamp!)
                              }
                              title={`Jump to ${step.videoTimestamp.toFixed(
                                1
                              )}s in video`}
                            >
                              ▶ Watch Replay
                            </button>
                          ) : null)}
                      </div>
                    </div>

                    {step.reasoning && (
                      <div className="bg-purple-500/8 rounded-lg p-4 border border-purple-500/20">
                        <div className="text-sm font-semibold text-purple-300 mb-3 font-serif">
                          💭 Reasoning
                        </div>
                        {step.reasoning.evaluation && (
                          <div className="mb-3 flex flex-col gap-1">
                            <strong className="text-sm text-purple-300 mb-1 font-serif">
                              👍 Eval:
                            </strong>
                            <span className="text-base text-textPrimary leading-relaxed font-serif">
                              {step.reasoning.evaluation}
                            </span>
                          </div>
                        )}
                        {step.reasoning.memory && (
                          <div className="mb-3 flex flex-col gap-1">
                            <strong className="text-sm text-purple-300 mb-1 font-serif">
                              🧠 Memory:
                            </strong>
                            <span className="text-base text-textPrimary leading-relaxed font-serif">
                              {step.reasoning.memory}
                            </span>
                          </div>
                        )}
                        {step.reasoning.next_goal && (
                          <div className="mb-3 flex flex-col gap-1">
                            <strong className="text-sm text-purple-300 mb-1 font-serif">
                              🎯 Next goal:
                            </strong>
                            <span className="text-base text-textPrimary leading-relaxed font-serif">
                              {step.reasoning.next_goal}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {step.actions.length > 0 && (
                      <div className="bg-accent/8 rounded-lg p-4 border border-accent/20">
                        <div className="text-sm font-semibold text-accent mb-3 font-serif">
                          ⚡ Actions
                        </div>
                        {step.actions.map((action, actionIdx) => (
                          <div key={actionIdx} className="mb-2">
                            <div className="flex flex-wrap gap-3 items-center">
                              <span className="bg-white/10 px-3 py-1.5 rounded-md font-semibold text-sm font-serif">
                                {(action.payload as { kind?: string }).kind}
                              </span>
                              {(action.payload as { selector?: string })
                                .selector && (
                                <code className="text-accent text-sm font-mono break-all">
                                  {
                                    (action.payload as { selector?: string })
                                      .selector
                                  }
                                </code>
                              )}
                              {(action.payload as { url?: string }).url && (
                                <span className="text-textSecondary text-sm font-serif break-all">
                                  {(action.payload as { url?: string }).url}
                                </span>
                              )}
                              {(action.payload as { value?: string }).value && (
                                <span className="text-textPrimary text-sm italic font-serif">
                                  {(action.payload as { value?: string }).value}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={eventsEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2">
            <div>
              {/* Summary */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
                <h2 className="text-base font-semibold mb-5 text-textSecondary font-serif">
                  Risk Summary
                </h2>
                <div className="grid grid-cols-4 gap-4">
                  {["critical", "high", "medium", "low"].map((severity) => (
                    <div
                      key={severity}
                      className="text-center p-4 bg-white/10 rounded-[10px]"
                    >
                      <div
                        className="text-3xl font-bold mb-1"
                        style={{ color: getSeverityColor(severity) }}
                      >
                        {severityCounts[severity] || 0}
                      </div>
                      <div className="text-sm text-textSecondary uppercase tracking-wider font-serif">
                        {severity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings */}
              {run.findings.length === 0 ? (
                <div className="py-16 px-12 text-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-green-400 font-serif">
                  <div className="text-5xl mb-3">✓</div>
                  <p>No security issues detected</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {run.findings.map((finding, i) => (
                    <div
                      key={i}
                      className="bg-white/10 backdrop-blur-sm rounded-[10px] border border-white/20 p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                          style={{
                            background: `${getSeverityColor(
                              finding.severity
                            )}20`,
                            color: getSeverityColor(finding.severity),
                          }}
                        >
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className="text-textSecondary text-sm font-serif">
                          {finding.category}
                        </span>
                      </div>
                      <p className="text-base leading-relaxed font-serif text-textPrimary">
                        {finding.description}
                      </p>
                      {finding.evidence.length > 0 && (
                        <details className="mt-4">
                           <summary className="text-textSecondary text-sm cursor-pointer font-serif hover:text-textPrimary transition-colors">
                            View Evidence
                          </summary>
                          <pre className="mt-3 p-4 bg-white/10 rounded-lg text-sm overflow-auto max-h-[200px] font-mono">
                            {JSON.stringify(finding.evidence, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
