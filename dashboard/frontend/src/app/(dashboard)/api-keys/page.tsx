"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Key, Plus, Trash2, Copy, CheckCircle, ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.sentriclabs.com";

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

function ApiKeysContent() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialProjectId = searchParams.get("projectId");
  const redirectPath = searchParams.get("redirect");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      setSelectedProject(initialProjectId);
      setShowCreate(true);
    }
  }, [initialProjectId, projects]);

  async function fetchData() {
    const token = localStorage.getItem("token");
    if (!token) return;

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
        console.log("API Keys Response:", keysData);
        console.log("Keys array:", keysData.keys);
        setKeys(keysData.keys || []);
      } else {
        const errorText = await keysRes.text();
        console.error("Failed to fetch API keys:", keysRes.status, errorText);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
        if (projectsData.projects && projectsData.projects.length > 0 && !selectedProject) {
          setSelectedProject(initialProjectId || projectsData.projects[0].id);
        }
      } else {
        const errorText = await projectsRes.text();
        console.error("Failed to fetch projects:", projectsRes.status, errorText);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDone = () => {
    setNewKey(null);
    if (redirectPath) {
      router.push(redirectPath);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-textSecondary font-serif">
        <div className="w-8 h-8 border-2 border-white/5 border-t-accent rounded-full animate-spin mx-auto mb-4" />
        Loading API keys...
      </div>
    );
  }

  return (
    <div className="px-12 py-10">
      <div className="flex items-center justify-between mb-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold text-textPrimary font-display">
            API Keys
          </h1>
          <p className="text-textSecondary font-serif">
            Manage keys for programmatic access to the Sentric API.
          </p>
        </div>
        {redirectPath && (
          <button
            onClick={() => router.push(redirectPath)}
            className="flex items-center gap-2 text-sm text-textSecondary hover:text-white transition-colors font-serif"
          >
            <ArrowLeft size={16} />
            Back to Project
          </button>
        )}
      </div>

      {newKey && (
        <div className="bg-accent/10 border-2 border-accent rounded-2xl p-8 mb-8 relative overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="flex items-start gap-6">
            <div className="p-3 bg-accent rounded-xl text-background">
              <Key size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-textPrimary font-display mb-2">
                API Key Generated Successfully
              </h3>
              <p className="text-sm text-textSecondary font-serif mb-6 leading-relaxed">
                Copy this key now. For your security, we only show it once. If
                you lose it, you will need to generate a new one.
              </p>
              <div className="flex gap-3">
                <div className="flex-1 bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 font-mono text-accent text-sm break-all flex items-center">
                  {newKey}
                </div>
                <button
                  onClick={() => copyToClipboard(newKey, "new")}
                  className="bg-white/10 hover:bg-white/20 p-4 rounded-xl border border-white/10 transition-all flex items-center justify-center min-w-[56px]"
                >
                  {copiedId === "new" ? (
                    <CheckCircle size={24} className="text-green-400" />
                  ) : (
                    <Copy size={24} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="mt-8 w-full py-4 bg-white text-background rounded-xl font-medium font-serif hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {redirectPath ? "Copy & Return to Project" : "I've saved my key"}
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-textPrimary font-display">
          Active Keys
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-white text-background px-5 py-2.5 rounded-xl font-medium transition-all font-serif hover:opacity-90"
        >
          <Plus size={18} />
          Create API Key
        </button>
      </div>

      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
          <h3 className="text-xl font-medium mb-6 text-textPrimary font-display">
            Create New API Key
          </h3>
          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-serif text-textSecondary uppercase tracking-widest mb-2 px-1">
                Key Name
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Production Monitoring"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-textPrimary font-serif focus:outline-none focus:border-accent focus:bg-white/[0.08] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-textSecondary uppercase tracking-widest mb-2 px-1">
                Scope Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-5 py-3.5 bg-[#0A0A0D] border border-white/10 rounded-xl text-textPrimary font-serif focus:outline-none focus:border-accent transition-all appearance-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                disabled={!selectedProject}
                onClick={createKey}
                className="flex-1 bg-white text-background py-3.5 rounded-xl font-medium transition-all font-serif hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                Generate Key
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-white/5 text-textSecondary py-3.5 rounded-xl border border-white/10 hover:text-white transition-all font-serif"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="py-24 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
            <Key size={48} className="mx-auto mb-4 text-white/5" />
            <p className="text-textSecondary font-serif">
              No active API keys found.
            </p>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="group bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-5 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                  <Key
                    size={20}
                    className="text-textSecondary group-hover:text-white transition-colors"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium text-textPrimary font-display">
                      {key.name || "Unnamed Key"}
                    </h4>
                    <span className="text-[10px] font-mono text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10">
                      {key.project_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-textSecondary font-serif uppercase tracking-wider opacity-60">
                    Created{" "}
                    {new Date(key.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteKey(key.id)}
                className="p-2.5 text-textSecondary hover:text-red-400 transition-all rounded-xl hover:bg-red-400/5 group/del"
                title="Revoke Key"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-textSecondary animate-pulse">
          Loading API Keys page...
        </div>
      }
    >
      <ApiKeysContent />
    </Suspense>
  );
}
