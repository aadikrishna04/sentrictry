"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface User {
  id: string;
  email: string;
  name: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.sentriclabs.com";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchUser();
  }, [router]);

  async function fetchUser() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) {
        localStorage.removeItem("token");
        router.push("/auth");
        return;
      }

      const data = await userRes.json();
      setUser(data.user);
    } catch (e) {
      console.error("Failed to fetch user:", e);
      localStorage.removeItem("token");
      router.push("/auth");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/5 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textPrimary flex">
      {/* Integrated Sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main Content Area - flows naturally */}
      <main className="flex-1 ml-[280px] min-h-screen flex flex-col">
        <div className="flex-1 w-full relative">{children}</div>
      </main>
    </div>
  );
}
