"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Event {
  type: "action" | "reasoning";
  payload: Record<string, unknown>;
  timestamp: string;
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    fetchRun();

    // Connect WebSocket for live updates with JWT token
    const ws = new WebSocket(`ws://localhost:8000/ws/${runId}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected for live updates");
    };

    ws.onmessage = (event) => {
      const newEvent = JSON.parse(event.data);
      setRun((prev) => {
        if (!prev) return prev;
        return { ...prev, events: [...prev.events, newEvent] };
      });
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [runId, router]);

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
          <div style={styles.timeline}>
            {run.events.length === 0 ? (
              <div style={styles.empty}>
                <p>No events yet</p>
                {run.status === "running" && (
                  <p style={styles.emptyHint}>Waiting for agent activity...</p>
                )}
              </div>
            ) : (
              run.events.map((event, i) => (
                <div key={i} style={styles.eventCard}>
                  <div style={styles.eventHeader}>
                    <span
                      style={{
                        ...styles.eventType,
                        ...(event.type === "action"
                          ? styles.eventTypeAction
                          : styles.eventTypeReasoning),
                      }}
                    >
                      {event.type === "action" ? "⚡" : "💭"} {event.type}
                    </span>
                    <span style={styles.eventTime}>
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <div style={styles.eventPayload}>
                    {event.type === "action" ? (
                      <div style={styles.actionContent}>
                        <div style={styles.actionHeader}>
                          <span style={styles.actionKind}>
                            {(event.payload as { kind?: string }).kind || "action"}
                          </span>
                        </div>
                        <div style={styles.actionDetails}>
                          {(event.payload as { selector?: string }).selector && (
                            <div style={styles.actionDetailRow}>
                              <span style={styles.actionLabel}>Selector:</span>
                              <code style={styles.actionSelector}>
                                {(event.payload as { selector?: string }).selector}
                              </code>
                            </div>
                          )}
                          {(event.payload as { url?: string }).url && (
                            <div style={styles.actionDetailRow}>
                              <span style={styles.actionLabel}>URL:</span>
                              <span style={styles.actionUrl}>
                                {(event.payload as { url?: string }).url}
                              </span>
                            </div>
                          )}
                          {(event.payload as { value?: string }).value && (
                            <div style={styles.actionDetailRow}>
                              <span style={styles.actionLabel}>Value:</span>
                              <span style={styles.actionValue}>
                                {(event.payload as { value?: string }).value}
                              </span>
                            </div>
                          )}
                          {(event.payload as { new_tab?: boolean }).new_tab !== undefined && (
                            <div style={styles.actionDetailRow}>
                              <span style={styles.actionLabel}>New Tab:</span>
                              <span style={styles.actionValue}>
                                {(event.payload as { new_tab?: boolean }).new_tab ? "Yes" : "No"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={styles.reasoningContent}>
                        {((event.payload as { content?: string }).content || "")
                          .split("\n")
                          .map((line, idx) => (
                            <p key={idx} style={styles.reasoningLine}>
                              {line}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        ) : (
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
        )}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)",
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
  timeline: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
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
    flexDirection: "column" as const,
    gap: "12px",
  },
  actionHeader: {
    display: "flex",
    alignItems: "center",
  },
  actionKind: {
    background: "var(--bg-tertiary)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    textTransform: "capitalize" as const,
  },
  actionDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    paddingLeft: "4px",
  },
  actionDetailRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "13px",
  },
  actionLabel: {
    color: "var(--text-muted)",
    fontWeight: 500,
    minWidth: "60px",
  },
  actionSelector: {
    color: "var(--accent)",
    fontSize: "13px",
    fontFamily: "JetBrains Mono, monospace",
    background: "var(--bg-tertiary)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  actionUrl: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    wordBreak: "break-all" as const,
  },
  actionValue: {
    color: "var(--text-primary)",
    fontSize: "13px",
    wordBreak: "break-word" as const,
  },
  reasoningContent: {
    color: "var(--text-primary)",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  reasoningLine: {
    margin: "4px 0",
    color: "var(--text-primary)",
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
