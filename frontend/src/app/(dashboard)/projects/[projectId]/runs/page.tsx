"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  Activity, 
  Clock, 
  ShieldAlert, 
  Zap,
  ChevronRight,
  Filter,
  Download,
  Key,
  Plus
} from "lucide-react";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProjectRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  useEffect(() => {
    fetchProjectAndRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  async function fetchProjectAndRuns() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        // Fetch project details
        const projectRes = await fetch(`${API_URL}/api/projects`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (projectRes.ok) {
            const data = await projectRes.json();
            const currentProj = data.projects.find((p: Project) => p.id === projectId || (projectId === 'default' && data.projects.length > 0));
            if (currentProj) {
                setProject(currentProj);
            }
        }
        await fetchRuns();
    } catch (e) {
        console.error("Failed to fetch project info:", e);
    } finally {
        setLoading(false);
    }
  }

  async function fetchRuns() {
    const token = localStorage.getItem("token");
    if (!token) return;

    let targetId = projectId;
    
    if (projectId === "default") {
        try {
            const userRes = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (userRes.ok) {
                const data = await userRes.json();
                if (data.projects && data.projects.length > 0) {
                    targetId = data.projects[0].id;
                }
            }
        } catch (e) {
            console.error("Failed to fetch default project:", e);
        }
    }

    try {
      const res = await fetch(
        `${API_URL}/api/projects/${targetId}/runs`,
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

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
  }

  const stats = [
    { label: "Success Rate", value: runs.length > 0 ? "94%" : "—", detail: "↑ 2% this week", icon: Activity, color: "text-green-400" },
    { label: "Avg. Duration", value: runs.length > 0 ? "1m 42s" : "—", detail: "Last 50 runs", icon: Clock, color: "text-blue-400" },
    { label: "Total Findings", value: runs.reduce((acc, r) => acc + r.finding_count, 0).toString(), detail: "Security issues", icon: ShieldAlert, color: "text-red-400" },
    { label: "SDK Usage", value: "Ready", detail: "v0.4.2 stable", icon: Zap, color: "text-accent" },
  ];

  return (
    <div className="px-12 py-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 text-xs text-textSecondary font-serif mb-2">
            <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
            <ChevronRight size={12} />
            <span className="text-white opacity-80">{project?.name || (projectId === 'default' ? 'Default Project' : projectId)}</span>
          </div>
          <h1 className="text-4xl font-semibold text-white font-display">
            {runs.length === 0 ? "Get Started" : "Agent Runs"}
          </h1>
        </div>
        
        {runs.length > 0 && (
            <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-serif hover:bg-white/10 transition-all">
                <Filter size={16} />
                Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-background rounded-lg text-sm font-medium font-serif hover:opacity-90 transition-all">
                <Download size={16} />
                Export Data
            </button>
            </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/[0.07] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-accent/10 transition-colors">
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <p className="text-textSecondary text-xs font-serif uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-white font-display mb-1">{stat.value}</p>
            <p className="text-[11px] text-textSecondary font-serif opacity-60 italic">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-sm font-semibold font-serif text-textSecondary uppercase tracking-widest">
            {runs.length === 0 ? "Project Setup" : "Recent Activity"}
          </h2>
          {runs.length > 0 && (
             <span className="text-xs text-textSecondary font-serif bg-white/10 px-2 py-1 rounded-full">{runs.length} Runs total</span>
          )}
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 min-h-[400px] flex flex-col justify-center text-center text-textSecondary font-serif animate-pulse text-sm">
              <div className="w-8 h-8 border-2 border-white/5 border-t-accent rounded-full animate-spin mx-auto mb-4" />
              Syncing with backend...
            </div>
          ) : runs.length === 0 ? (
            <div className="py-24 min-h-[400px] flex flex-col justify-center text-center px-6">
              <div className="w-20 h-20 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-accent/10">
                 <Activity size={32} className="text-accent opacity-50 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold text-white font-display mb-2">Waiting for agent runs...</h3>
              <p className="text-base text-textSecondary mb-10 max-w-md mx-auto font-serif">
                This project has no data yet. Connect your AI agent using the Sentric SDK to start monitoring security events in real-time.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => router.push(`/api-keys?projectId=${project?.id || projectId}&redirect=/projects/${project?.id || projectId}/runs`)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-background rounded-xl font-medium font-serif hover:opacity-90 active:scale-95 transition-all"
                >
                  <Key size={18} />
                  Generate API Key
                </button>
                <Link 
                  href="/docs"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium font-serif hover:bg-white/10 transition-all"
                >
                  <Plus size={18} />
                  SDK Integration Guide
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-textSecondary font-serif uppercase tracking-widest bg-white/[0.01]">
                  <th className="px-6 py-4 font-normal">Run ID</th>
                  <th className="px-6 py-4 font-normal">Goal / Task</th>
                  <th className="px-6 py-4 font-normal">Status</th>
                  <th className="px-6 py-4 font-normal">Timestamp</th>
                  <th className="px-6 py-4 font-normal">Duration</th>
                  <th className="px-6 py-4 font-normal">Findings</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {runs.map((run) => (
                  <tr 
                    key={run.id}
                    onClick={() => router.push(`/runs/${run.id}`)}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <code className="text-[12px] text-accent font-mono opacity-80 group-hover:opacity-100">{run.id.slice(0, 8)}</code>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-serif text-white opacity-90 group-hover:opacity-100 max-w-[250px] truncate block">
                        {run.task || "Generic Security Test"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          run.status === 'running' ? 'bg-accent animate-pulse' : 
                          run.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <span className="text-xs font-serif capitalize text-textSecondary group-hover:text-white transition-colors">{run.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-textSecondary font-serif text-xs">
                      {formatTime(run.start_time)}
                    </td>
                    <td className="px-6 py-5 text-textSecondary font-serif text-xs">
                      {formatDuration(run.start_time, run.end_time)}
                    </td>
                    <td className="px-6 py-5">
                      {run.finding_count > 0 ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/20">
                          {run.finding_count} ISSUES
                        </span>
                      ) : (
                        <span className="text-green-500/40 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
