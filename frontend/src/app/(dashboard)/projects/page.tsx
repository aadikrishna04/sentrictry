"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  MoreVertical,
  ExternalLink,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Project {
  id: string;
  name: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewProjectName("");
        // After creation, go to the project's runs page (which will show "Waiting for agent runs...")
        router.push(`/projects/${data.id}/runs`);
      }
    } catch (e) {
      console.error("Failed to create project:", e);
    } finally {
      setIsCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-textSecondary font-serif">
        <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin mx-auto mb-4" />
        Loading projects...
      </div>
    );
  }

  return (
    <div className="px-12 py-10">
      <div className="flex justify-between items-end mb-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold text-textPrimary font-display">
            Projects
          </h1>
          <p className="text-textSecondary font-serif">
            Organize your agent testing environments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-white text-background px-5 py-2.5 rounded-xl font-medium transition-all font-serif hover:opacity-90 active:scale-95"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}/runs`}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col h-full cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-white/5 rounded-xl group-hover:bg-accent/10 transition-colors">
                <FolderKanban
                  size={24}
                  className="text-textSecondary group-hover:text-accent transition-colors"
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-2 text-textSecondary hover:text-textPrimary transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={20} />
              </button>
            </div>
            <h3 className="text-xl font-semibold text-textPrimary font-display mb-2 truncate">
              {project.name}
            </h3>
            <p className="text-xs font-mono text-textSecondary mb-6 truncate opacity-40 group-hover:opacity-60 transition-all">
              {project.id}
            </p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
              <span className="text-[11px] text-textSecondary font-serif uppercase tracking-wider">
                {new Date(project.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <div className="flex items-center gap-2 text-sm text-accent font-medium font-serif">
                View Runs
                <ExternalLink size={14} />
              </div>
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl text-center">
            <FolderKanban size={48} className="mx-auto mb-4 text-white/10" />
            <h3 className="text-lg font-medium text-textPrimary font-display mb-1">
              No projects yet
            </h3>
            <p className="text-sm text-textSecondary font-serif mb-6 whitespace-pre-line">
              Create your first project to start monitoring{"\n"}your AI agents.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-white bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-sm font-serif transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121216] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5">
              <h2 className="text-xl font-semibold text-textPrimary font-display">
                New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-textSecondary hover:text-textPrimary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-8">
              <div className="mb-6">
                <label className="block text-xs font-serif text-textSecondary uppercase tracking-widest mb-2 px-1">
                  Project Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Customer Support Agent"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-textPrimary placeholder:text-textSecondary/30 focus:outline-none focus:border-accent focus:bg-white/[0.08] transition-all font-serif"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 text-textSecondary font-serif text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!newProjectName.trim() || isCreating}
                  className="flex-[2] bg-white text-background py-4 rounded-2xl font-medium font-serif disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isCreating && (
                    <div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                  )}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
