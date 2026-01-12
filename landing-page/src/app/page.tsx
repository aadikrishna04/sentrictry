
"use client";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import { GL } from "../components/gl";
import { Leva } from "leva";
import { useState } from "react";
import ErrorSuppressor from "./error-boundary";

import Architecture from "../components/Architecture";
import FooterCTA from "../components/FooterCTA";

export default function Page() {
  const [hovering] = useState(false);

  return (
    <>
      <ErrorSuppressor />
      <div className="relative w-full min-h-screen bg-background text-textPrimary selection:bg-accent/20">
        {/* Fixed Background Layer */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GL hovering={hovering} />
          <Leva hidden />
          {/* Vignette Overlay to ensure text readability over GL */}
          <div className="absolute inset-0 bg-background/80" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          
          <main className="flex-grow flex flex-col">
            <Hero />
            <Features />
            <Architecture />
            <FooterCTA />
            
            {/* Simple Footer */}
            <footer className="w-full border-t border-white/5 py-12 bg-background mt-auto">
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-textSecondary text-sm font-mono">
                        © 2025 SENTRIC LABS, INC.
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="text-textSecondary hover:text-white text-sm font-mono uppercase">Privacy</a>
                        <a href="#" className="text-textSecondary hover:text-white text-sm font-mono uppercase">Terms</a>
                        <a href="mailto:security@sentriclabs.com" className="text-textSecondary hover:text-white text-sm font-mono uppercase">Contact</a>
                    </div>
                </div>
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
