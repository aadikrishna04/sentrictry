"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "security">(
    "timeline"
  );
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    // Auto-scroll to bottom when new events arrive
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [run?.events.length]);

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
        if (event.video_timestamp !== undefined && step.videoTimestamp === undefined) {
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
        if (event.video_timestamp !== undefined && step.videoTimestamp === undefined) {
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
        if (event.video_timestamp !== undefined && step.videoTimestamp === undefined) {
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
    return <div style={styles.loading}>Loading...</div>;
  }

  if (!run) {
    return <div style={styles.loading}>Run not found</div>;
  }

  const severityCounts = run.findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>
          ← Back to Runs
        </Link>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>
              <code style={styles.runIdTitle}>{run.id}</code>
            </h1>
            {run.task && <p style={styles.task}>{run.task}</p>}
          </div>
          <span
            style={{
              ...styles.statusBadge,
              ...(run.status === "running"
                ? styles.statusRunning
                : run.status === "completed"
                ? styles.statusCompleted
                : styles.statusFailed),
            }}
          >
            {run.status === "running" && <span style={styles.pulse}></span>}
            {run.status}
          </span>
        </div>
      </header>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "timeline" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline ({run.events.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "security" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("security")}
        >
          Security Report ({run.findings.length})
        </button>
      </div>

      <main style={styles.main}>
        {activeTab === "timeline" ? (
          <div style={styles.timelineContainer}>
            {/* Laminar Recording Link - Show when Laminar trace is available */}
            {run && (run.status === "completed" || run.status === "failed") && run.laminar_trace_id && (
              <div style={styles.laminarContainer}>
                <div style={styles.laminarHeader}>
                  <span style={styles.laminarIcon}>🎥</span>
                  <div style={styles.laminarContent}>
                    <h3 style={styles.laminarTitle}>Full Browser Session Recording</h3>
                    <p style={styles.laminarDescription}>
                      View the complete real-time browser recording synced with agent steps in Laminar
                    </p>
                    <a
                      href={getLaminarUrl(run.laminar_trace_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.laminarButton}
                    >
                      Open in Laminar →
                    </a>
                  </div>
                </div>
              </div>
            )}
            {/* Video Player - Show when run is completed or failed and video exists (fallback) */}
            {run && (run.status === "completed" || run.status === "failed") && run.video_path && !run.laminar_trace_id && (
              <div style={styles.videoContainer}>
                <video
                  ref={videoRef}
                  controls
                  style={styles.video}
                  src={`${API_URL}/api/runs/${runId}/video`}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            <div style={styles.timeline}>
              {run.events.length === 0 ? (
                <div style={styles.empty}>
                  <p>No events yet</p>
                  {run.status === "running" && (
                    <p style={styles.emptyHint}>Waiting for agent activity...</p>
                  )}
                </div>
              ) : (
                groupEventsByStep(run.events).map((step, stepIdx) => (
                  <div key={stepIdx} style={styles.stepCard}>
                    <div style={styles.stepHeader}>
                      <h3 style={styles.stepTitle}>Step {step.stepNumber}</h3>
                      <div style={styles.stepHeaderRight}>
                        <span style={styles.stepTime}>
                          {formatTime(step.timestamp)}
                        </span>
                        {step.videoTimestamp !== undefined && run && (run.status === "completed" || run.status === "failed") && (
                          run.laminar_trace_id ? (
                            <a
                              href={getLaminarUrl(run.laminar_trace_id, step.videoTimestamp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.watchReplayButton}
                              title={`Jump to ${step.videoTimestamp.toFixed(1)}s in Laminar recording`}
                            >
                              ▶ Watch Replay
                            </a>
                          ) : run.video_path ? (
                            <button
                              style={styles.watchReplayButton}
                              onClick={() => seekToTimestamp(step.videoTimestamp!)}
                              title={`Jump to ${step.videoTimestamp.toFixed(1)}s in video`}
                            >
                              ▶ Watch Replay
                            </button>
                          ) : null
                        )}
                      </div>
                    </div>

                    {step.reasoning && (
                      <div style={styles.reasoningSection}>
                        <div style={styles.reasoningHeader}>💭 Reasoning</div>
                        {step.reasoning.evaluation && (
                          <div style={styles.reasoningItem}>
                            <strong style={styles.reasoningLabel}>
                              👍 Eval:
                            </strong>
                            <span style={styles.reasoningText}>
                              {step.reasoning.evaluation}
                            </span>
                          </div>
                        )}
                        {step.reasoning.memory && (
                          <div style={styles.reasoningItem}>
                            <strong style={styles.reasoningLabel}>
                              🧠 Memory:
                            </strong>
                            <span style={styles.reasoningText}>
                              {step.reasoning.memory}
                            </span>
                          </div>
                        )}
                        {step.reasoning.next_goal && (
                          <div style={styles.reasoningItem}>
                            <strong style={styles.reasoningLabel}>
                              🎯 Next goal:
                            </strong>
                            <span style={styles.reasoningText}>
                              {step.reasoning.next_goal}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {step.actions.length > 0 && (
                      <div style={styles.actionsSection}>
                        <div style={styles.actionsHeader}>⚡ Actions</div>
                        {step.actions.map((action, actionIdx) => (
                          <div key={actionIdx} style={styles.actionItem}>
                            <div style={styles.actionContent}>
                              <span style={styles.actionKind}>
                                {(action.payload as { kind?: string }).kind}
                              </span>
                              {(action.payload as { selector?: string })
                                .selector && (
                                <code style={styles.actionSelector}>
                                  {
                                    (action.payload as { selector?: string })
                                      .selector
                                  }
                                </code>
                              )}
                              {(action.payload as { url?: string }).url && (
                                <span style={styles.actionUrl}>
                                  {(action.payload as { url?: string }).url}
                                </span>
                              )}
                              {(action.payload as { value?: string }).value && (
                                <span style={styles.actionValue}>
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
          <div style={styles.timelineContainer}>
            <div style={styles.securityReport}>
              {/* Summary */}
              <div style={styles.summaryCard}>
                <h2 style={styles.summaryTitle}>Risk Summary</h2>
                <div style={styles.severityGrid}>
                  {["critical", "high", "medium", "low"].map((severity) => (
                    <div key={severity} style={styles.severityItem}>
                      <div
                        style={{
                          ...styles.severityCount,
                          color: getSeverityColor(severity),
                        }}
                      >
                        {severityCounts[severity] || 0}
                      </div>
                      <div style={styles.severityLabel}>{severity}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings */}
              {run.findings.length === 0 ? (
                <div style={styles.noFindings}>
                  <div style={styles.noFindingsIcon}>✓</div>
                  <p>No security issues detected</p>
                </div>
              ) : (
                <div style={styles.findingsList}>
                  {run.findings.map((finding, i) => (
                    <div key={i} style={styles.findingCard}>
                      <div style={styles.findingHeader}>
                        <span
                          style={{
                            ...styles.severityBadge,
                            background: `${getSeverityColor(finding.severity)}20`,
                            color: getSeverityColor(finding.severity),
                          }}
                        >
                          {finding.severity.toUpperCase()}
                        </span>
                        <span style={styles.findingCategory}>
                          {finding.category}
                        </span>
                      </div>
                      <p style={styles.findingDescription}>
                        {finding.description}
                      </p>
                      {finding.evidence.length > 0 && (
                        <details style={styles.evidenceDetails}>
                          <summary style={styles.evidenceSummary}>
                            View Evidence
                          </summary>
                          <pre style={styles.evidenceCode}>
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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)",
    overflow: "hidden" as const,
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
  },
  header: {
    padding: "24px 48px 32px",
    borderBottom: "1px solid var(--border)",
    background: "rgba(10, 10, 15, 0.8)",
    backdropFilter: "blur(10px)",
  },
  backLink: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginBottom: "16px",
    display: "inline-block",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  runIdTitle: {
    color: "var(--accent)",
  },
  task: {
    color: "var(--text-secondary)",
    fontSize: "15px",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 14px",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: 500,
  },
  statusRunning: {
    background: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
  },
  statusCompleted: {
    background: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
  },
  statusFailed: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
  },
  pulse: {
    width: "8px",
    height: "8px",
    background: "currentColor",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    padding: "16px 48px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-secondary)",
  },
  tab: {
    padding: "10px 20px",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  tabActive: {
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
  },
  main: {
    padding: "32px 48px",
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minHeight: 0, // Important for flex children to allow scrolling
  },
  empty: {
    padding: "60px",
    textAlign: "center" as const,
    color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  },
  emptyHint: {
    color: "var(--text-muted)",
    fontSize: "14px",
    marginTop: "8px",
  },
  timelineContainer: {
    flex: 1,
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    paddingRight: "8px",
  },
  timeline: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  stepCard: {
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--border)",
  },
  stepHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  watchReplayButton: {
    padding: "6px 12px",
    background: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  laminarContainer: {
    marginBottom: "24px",
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    padding: "20px",
  },
  laminarHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
  },
  laminarIcon: {
    fontSize: "32px",
  },
  laminarContent: {
    flex: 1,
  },
  laminarTitle: {
    margin: "0 0 8px 0",
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  laminarDescription: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  laminarButton: {
    display: "inline-block",
    padding: "10px 20px",
    background: "var(--accent)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.15s",
  },
  videoContainer: {
    marginBottom: "24px",
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    padding: "16px",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    maxHeight: "600px",
    borderRadius: "8px",
  },
  stepTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  stepTime: {
    color: "var(--text-muted)",
    fontSize: "12px",
    fontFamily: "JetBrains Mono, monospace",
  },
  reasoningSection: {
    background: "rgba(168, 85, 247, 0.08)",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid rgba(168, 85, 247, 0.2)",
  },
  reasoningHeader: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#c084fc",
    marginBottom: "12px",
  },
  reasoningItem: {
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  reasoningLabel: {
    fontSize: "13px",
    color: "#c084fc",
    marginBottom: "4px",
  },
  reasoningText: {
    fontSize: "14px",
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },
  actionsSection: {
    background: "rgba(99, 102, 241, 0.08)",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid rgba(99, 102, 241, 0.2)",
  },
  actionsHeader: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#818cf8",
    marginBottom: "12px",
  },
  actionItem: {
    marginBottom: "8px",
  },
  eventCard: {
    background: "var(--bg-secondary)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    padding: "16px",
  },
  eventHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  eventType: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
  },
  eventTypeAction: {
    background: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
  },
  eventTypeReasoning: {
    background: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
  },
  eventTime: {
    color: "var(--text-muted)",
    fontSize: "12px",
    fontFamily: "JetBrains Mono, monospace",
  },
  eventPayload: {},
  actionContent: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "12px",
    alignItems: "center",
  },
  actionKind: {
    background: "var(--bg-tertiary)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
  },
  actionSelector: {
    color: "var(--accent)",
    fontSize: "13px",
  },
  actionUrl: {
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  actionValue: {
    color: "var(--text-primary)",
    fontSize: "13px",
    fontStyle: "italic",
  },
  reasoningContent: {
    color: "var(--text-primary)",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  securityReport: {},
  summaryCard: {
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    padding: "24px",
    marginBottom: "24px",
  },
  summaryTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "20px",
    color: "var(--text-secondary)",
  },
  severityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  severityItem: {
    textAlign: "center" as const,
    padding: "16px",
    background: "var(--bg-tertiary)",
    borderRadius: "10px",
  },
  severityCount: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  severityLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  noFindings: {
    padding: "60px",
    textAlign: "center" as const,
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    color: "var(--success)",
  },
  noFindingsIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  findingsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  findingCard: {
    background: "var(--bg-secondary)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    padding: "20px",
  },
  findingHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  severityBadge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  findingCategory: {
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  findingDescription: {
    fontSize: "14px",
    lineHeight: 1.5,
  },
  evidenceDetails: {
    marginTop: "16px",
  },
  evidenceSummary: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    cursor: "pointer",
  },
  evidenceCode: {
    marginTop: "12px",
    padding: "16px",
    background: "var(--bg-tertiary)",
    borderRadius: "8px",
    fontSize: "12px",
    overflow: "auto",
    maxHeight: "200px",
    fontFamily: "JetBrains Mono, monospace",
  },
};
