"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiKey {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const [keysRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/api-keys`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setKeys(keysData.keys);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects);
        if (projectsData.projects.length > 0 && !selectedProject) {
          setSelectedProject(projectsData.projects[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!selectedProject) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/api-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: keyName || undefined,
          project_id: selectedProject,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setKeyName("");
        setShowCreate(false);
        fetchData();
      }
    } catch (e) {
      console.error("Failed to create key:", e);
    }
  }

  async function deleteKey(keyId: string) {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Failed to delete key:", e);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <div>
          <h1 style={styles.title}>API Keys</h1>
          <p style={styles.subtitle}>
            Manage your API keys for programmatic access
          </p>
        </div>
      </header>

      <main style={styles.main}>
        {newKey && (
          <div style={styles.newKeyAlert}>
            <div>
              <strong>API Key Created!</strong>
              <p style={styles.newKeyWarning}>
                Save this key now - you won't be able to see it again.
              </p>
            </div>
            <div style={styles.newKeyBox}>
              <code style={styles.newKeyCode}>{newKey}</code>
            </div>
            <button onClick={() => setNewKey(null)} style={styles.closeButton}>
              Close
            </button>
          </div>
        )}

        <div style={styles.headerRow}>
          <h2 style={styles.sectionTitle}>Your API Keys</h2>
          <button
            onClick={() => setShowCreate(true)}
            style={styles.createButton}
          >
            + Create API Key
          </button>
        </div>

        {showCreate && (
          <div style={styles.createCard}>
            <h3 style={styles.createTitle}>Create New API Key</h3>
            <div style={styles.form}>
              <input
                type="text"
                placeholder="Key name (optional)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                style={styles.input}
              />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={styles.select}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div style={styles.buttonRow}>
                <button onClick={createKey} style={styles.saveButton}>
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <div style={styles.empty}>
            <p>No API keys yet</p>
            <p style={styles.emptyHint}>
              Create an API key to start using Sentric programmatically
            </p>
          </div>
        ) : (
          <div style={styles.keysList}>
            {keys.map((key) => (
              <div key={key.id} style={styles.keyCard}>
                <div>
                  <div style={styles.keyHeader}>
                    <strong>{key.name}</strong>
                    <span style={styles.keyId}>{key.id}</span>
                  </div>
                  <p style={styles.keyMeta}>
                    Project: {key.project_name} • Created:{" "}
                    {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
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
  },
  backLink: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginBottom: "16px",
    display: "inline-block",
  },
  title: {
    fontSize: "28px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  main: {
    padding: "32px 48px",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
  },
  newKeyAlert: {
    background: "var(--bg-secondary)",
    border: "2px solid var(--accent)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  newKeyWarning: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginTop: "8px",
  },
  newKeyBox: {
    background: "var(--bg-tertiary)",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "16px",
    marginBottom: "16px",
  },
  newKeyCode: {
    color: "var(--accent)",
    fontSize: "14px",
    wordBreak: "break-all" as const,
  },
  closeButton: {
    background: "var(--accent)",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
  },
  createButton: {
    background: "var(--accent)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  createCard: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  createTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  input: {
    padding: "10px 14px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  select: {
    padding: "10px 14px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
  },
  saveButton: {
    background: "var(--accent)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  cancelButton: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  empty: {
    padding: "80px 48px",
    textAlign: "center" as const,
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  },
  emptyHint: {
    color: "var(--text-muted)",
    fontSize: "14px",
    marginTop: "8px",
  },
  keysList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  keyCard: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  keyHeader: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "8px",
  },
  keyId: {
    color: "var(--text-muted)",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  keyMeta: {
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  deleteButton: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
};
