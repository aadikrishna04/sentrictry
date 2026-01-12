"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.sentriclabs.com";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      // Validate token by checking user endpoint
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            // User is authenticated, redirect to dashboard
            router.push("/");
          } else {
            // Invalid token, remove it and continue to auth page
            localStorage.removeItem("token");
            setCheckingAuth(false);
          }
        })
        .catch(() => {
          // Error validating token, continue to auth page
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/signin";
      const body: any = { email, password };
      if (isSignup) {
        body.name = name;
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Authentication failed");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <div className="text-textSecondary font-serif">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-10 w-full max-w-[400px]">
        <div className="mb-8 justify-center">
          <span className="text-3xl font-medium tracking-tight text-textPrimary font-logo text-center block">
            Sentric
          </span>
        </div>

        <h1 className="text-2xl font-semibold mb-6 text-center text-textPrimary font-serif">
          {isSignup ? "Create Account" : "Sign In"}
        </h1>

        {error && (
          <div className="bg-red-500/15 text-red-400 p-3 rounded-lg mb-5 text-sm font-serif">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-lg text-textPrimary text-[15px] font-serif placeholder:text-white/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-lg text-textPrimary text-[15px] font-serif placeholder:text-white/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 rounded-lg text-textPrimary text-[15px] font-serif placeholder:text-white/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-accent hover:bg-accentHover border-2 border-accent hover:border-accentHover text-background rounded-lg text-[15px] font-semibold cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-0.5 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-serif uppercase tracking-wide"
          >
            {loading ? "Loading..." : isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-textSecondary text-sm font-serif">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="bg-none border-none text-accent cursor-pointer text-sm font-medium underline hover:text-accentHover transition-colors font-serif"
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
