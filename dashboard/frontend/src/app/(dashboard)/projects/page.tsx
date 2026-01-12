"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  MoreVertical,
  ExternalLink,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.sentriclabs.com";

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

  // States for renaming
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renamedName, setRenamedName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // States for deleting
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // State for menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        router.push(`/projects/${data.id}/runs`);
      }
    } catch (e) {
      console.error("Failed to create project:", e);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRenameProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectToRename || !renamedName.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setIsRenaming(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectToRename.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: renamedName }),
      });

      if (res.ok) {
        fetchProjects();
        setShowRenameModal(false);
        setProjectToRename(null);
        setRenamedName("");
      }
    } catch (e) {
      console.error("Failed to rename project:", e);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDeleteProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectToDelete || deleteConfirmation !== projectToDelete.name) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchProjects();
        setShowDeleteModal(false);
        setProjectToDelete(null);
        setDeleteConfirmation("");
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
    } finally {
      setIsDeleting(false);
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
          className="flex items-center gap-2 bg-white text-background px-5 py-2.5 rounded-xl font-medium transition-all font-serif hover:opacity-90 active:scale-95 shadow-lg"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col h-full overflow-visible"
          >
            <Link
              href={`/projects/${project.id}/runs`}
              className="absolute inset-0 z-0"
            />

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="p-3 bg-white/5 rounded-xl group-hover:bg-accent/10 transition-colors">
                <FolderKanban
                  size={24}
                  className="text-textSecondary group-hover:text-accent transition-colors"
                />
              </div>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenuId(
                      activeMenuId === project.id ? null : project.id
                    );
                  }}
                  className={`p-2 rounded-lg transition-all ${
                    activeMenuId === project.id
                      ? "bg-white/10 text-white"
                      : "text-textSecondary hover:text-textPrimary opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <MoreVertical size={20} />
                </button>

                {activeMenuId === project.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1a23] border border-white/10 rounded-xl shadow-2xl py-1.5 z-[50] animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectToRename(project);
                        setRenamedName(project.name);
                        setShowRenameModal(true);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-textSecondary hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit2 size={14} />
                      Rename Project
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectToDelete(project);
                        setDeleteConfirmation("");
                        setShowDeleteModal(true);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Project
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-semibold text-textPrimary font-display mb-2 truncate relative z-10 pointer-events-none">
              {project.name}
            </h3>
            <p className="text-xs font-mono text-textSecondary mb-6 truncate opacity-40 group-hover:opacity-60 transition-all relative z-10 pointer-events-none">
              {project.id}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5 relative z-10 pointer-events-none">
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
          </div>
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

      {/* Rename Project Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121216] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5">
              <h2 className="text-xl font-semibold text-textPrimary font-display">
                Rename Project
              </h2>
              <button
                onClick={() => setShowRenameModal(false)}
                className="p-2 text-textSecondary hover:text-textPrimary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRenameProject} className="p-8">
              <div className="mb-6">
                <label className="block text-xs font-serif text-textSecondary uppercase tracking-widest mb-2 px-1">
                  New Project Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={renamedName}
                  onChange={(e) => setRenamedName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-textPrimary focus:outline-none focus:border-accent focus:bg-white/[0.08] transition-all font-serif"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="flex-1 py-4 text-textSecondary font-serif text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!renamedName.trim() || isRenaming}
                  className="flex-[2] bg-white text-background py-4 rounded-2xl font-medium font-serif disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isRenaming && (
                    <div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121216] border border-red-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} />
                <h2 className="text-xl font-semibold font-display">
                  Delete Project
                </h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 text-textSecondary hover:text-textPrimary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-textSecondary font-serif mb-6 leading-relaxed">
                This will permanently delete{" "}
                <span className="text-white font-bold">
                  {projectToDelete?.name}
                </span>{" "}
                and all its associated runs, findings, and events. This action
                cannot be undone.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-serif text-textSecondary tracking-widest mb-2 px-1">
                  TYPE{" "}
                  <span className="text-white select-all">
                    {projectToDelete?.name}
                  </span>{" "}
                  TO CONFIRM
                </label>
                <input
                  autoFocus
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl px-5 py-4 text-textPrimary placeholder:text-textSecondary/20 focus:outline-none focus:border-red-500/30 focus:bg-red-500/10 transition-all font-serif"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-4 text-textSecondary font-serif text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    deleteConfirmation !== projectToDelete?.name || isDeleting
                  }
                  onClick={handleDeleteProject}
                  className="flex-[2] bg-red-500 text-white py-4 rounded-2xl font-medium font-serif disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-red-600 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-500/10"
                >
                  {isDeleting && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
