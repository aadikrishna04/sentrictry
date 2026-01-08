"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Run {
  id: string;
  project_id: string;
  task: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  finding_count: number;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchUserAndProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchRuns();
      const interval = setInterval(fetchRuns, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedProject]);

  async function fetchUserAndProjects() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [userRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setUser(data.user);
        if (data.projects.length > 0) {
          setProjects(data.projects);
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRuns() {
    if (!selectedProject) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/projects/${selectedProject}/runs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setRuns(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/auth");
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>S</div>
            <span style={styles.logoText}>Sentric</span>
          </div>
          <p style={styles.subtitle}>Security Observability for AI Agents</p>
        </div>
        <div style={styles.userSection}>
          {user && (
            <>
              <span style={styles.userName}>{user.name || user.email}</span>
              <Link href="/api-keys" style={styles.apiKeysLink}>
                API Keys
              </Link>
              <button onClick={handleLogout} style={styles.logoutButton}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {projects.length > 0 && (
          <div style={styles.projectSelector}>
            <label style={styles.projectLabel}>Project:</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={styles.projectSelect}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.titleRow}>
          <h1 style={styles.title}>Agent Runs</h1>
          <div style={styles.badge}>{runs.length} runs</div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : runs.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📊</div>
            <p>No runs yet</p>
            <p style={styles.emptyHint}>
              Run an agent with the Sentric SDK to see data here
            </p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={styles.cellId}>Run ID</div>
              <div style={styles.cellTask}>Task</div>
              <div style={styles.cellStatus}>Status</div>
              <div style={styles.cellTime}>Started</div>
              <div style={styles.cellDuration}>Duration</div>
              <div style={styles.cellFindings}>Findings</div>
            </div>
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                style={styles.tableRow}
              >
                <div style={styles.cellId}>
                  <code style={styles.runId}>{run.id}</code>
                </div>
                <div style={styles.cellTask}>
                  {run.task || (
                    <span style={styles.noTask}>No task specified</span>
                  )}
                </div>
                <div style={styles.cellStatus}>
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
                    {run.status === "running" && (
                      <span style={styles.pulse}></span>
                    )}
                    {run.status}
                  </span>
                </div>
                <div style={styles.cellTime}>{formatTime(run.start_time)}</div>
                <div style={styles.cellDuration}>
                  {formatDuration(run.start_time, run.end_time)}
                </div>
                <div style={styles.cellFindings}>
                  {run.finding_count > 0 ? (
                    <span style={styles.findingsBadge}>
                      {run.finding_count}
                    </span>
                  ) : (
                    <span style={styles.noFindings}>—</span>
                  )}
                </div>
              </Link>
            ))}
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
  header: {
    padding: "32px 48px",
    borderBottom: "1px solid var(--border)",
    background: "rgba(10, 10, 15, 0.8)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "18px",
  },
  logoText: {
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  userName: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  apiKeysLink: {
    color: "var(--accent)",
    fontSize: "14px",
    textDecoration: "none",
  },
  logoutButton: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
  projectSelector: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
    padding: "16px",
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  projectLabel: {
    fontSize: "14px",
    fontWeight: 500,
  },
  projectSelect: {
    padding: "6px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  main: {
    padding: "32px 48px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 600,
  },
  badge: {
    background: "var(--bg-tertiary)",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  loading: {
    padding: "48px",
    textAlign: "center" as const,
    color: "var(--text-secondary)",
  },
  empty: {
    padding: "80px 48px",
    textAlign: "center" as const,
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  emptyHint: {
    color: "var(--text-muted)",
    fontSize: "14px",
    marginTop: "8px",
  },
  table: {
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "180px 1fr 120px 180px 100px 100px",
    padding: "12px 20px",
    background: "var(--bg-tertiary)",
    borderBottom: "1px solid var(--border)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "180px 1fr 120px 180px 100px 100px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  cellId: {},
  cellTask: {},
  cellStatus: {},
  cellTime: { color: "var(--text-secondary)", fontSize: "14px" },
  cellDuration: { color: "var(--text-secondary)", fontSize: "14px" },
  cellFindings: {},
  runId: {
    fontSize: "13px",
    color: "var(--accent)",
    background: "rgba(99, 102, 241, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  noTask: {
    color: "var(--text-muted)",
    fontStyle: "italic" as const,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
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
    width: "6px",
    height: "6px",
    background: "currentColor",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  },
  findingsBadge: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  },
  noFindings: {
    color: "var(--text-muted)",
  },
};
