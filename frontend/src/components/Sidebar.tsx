"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Key,
  FileText,
  LogOut,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Plus,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const pathname = usePathname();
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isUserExpanded &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserExpanded(false);
      }
    }

    if (isUserExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isUserExpanded]);

  const menuItems = [
    { name: "Overview", href: "/overview", icon: LayoutDashboard },
    { type: "divider" },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "API Keys", href: "/api-keys", icon: Key },
    { type: "divider" },
    { name: "Docs", href: "/docs", icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === "/projects") {
      return pathname.startsWith("/projects");
    }
    return pathname === href;
  };

  return (
    <div className="w-[280px] h-screen flex flex-col fixed left-0 top-0 z-50 py-6 px-4 select-none">
      {/* Brand Area */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-medium font-logo tracking-tight">
            Sentric
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {menuItems.map((item, index) => {
          if (item.type === "divider") {
            return (
              <div
                key={`divider-${index}`}
                className="my-4 h-px bg-white/5 mx-2"
              />
            );
          }

          const Icon = item.icon!;
          const active = isActive(item.href!);

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all duration-200 group ${
                active
                  ? "bg-white/10 text-white font-medium shadow-sm"
                  : "text-textSecondary hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={`${
                  active
                    ? "text-white"
                    : "text-textSecondary group-hover:text-white"
                }`}
              />
              <span className="font-serif">{item.name}</span>
              {active && item.name === "Overview" && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Field - Expandable */}
      <div ref={userMenuRef} className="mt-auto pt-4 relative">
        {isUserExpanded && (
          <div
            className="absolute bottom-[calc(100%+8px)] left-0 w-full animate-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-serif shadow-2xl"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsUserExpanded(!isUserExpanded)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border border-transparent relative z-50 ${
            isUserExpanded
              ? "bg-white/10 border-white/10 shadow-lg"
              : "hover:bg-white/5"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white border border-white/10 overflow-hidden">
            {user?.name ? (
              <span className="text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-sm font-medium text-white truncate font-serif">
              {user?.name || "User"}
            </p>
            <p className="text-[11px] text-textSecondary truncate font-serif opacity-70">
              {user?.email || "user@example.com"}
            </p>
          </div>
          <div className="text-textSecondary">
            {isUserExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronUp size={14} />
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
