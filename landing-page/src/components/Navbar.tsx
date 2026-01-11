"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-border/50 py-3"
          : "bg-transparent border-transparent py-5"
      }`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto px-6">
        {/* Logo - Serif/Logo Font from Design Spec */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <span className="text-3xl font-logo tracking-tight text-white font-bold">
            Sentric
          </span>
        </div>

        {/* Action Button - Dashboard */}
        <div className="flex items-center">
          <a
            href="https://app.sentric.ai"
            className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-xl transition-all"
          >
            <span className="text-sm font-medium font-sans text-white">Dashboard</span>
            <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;