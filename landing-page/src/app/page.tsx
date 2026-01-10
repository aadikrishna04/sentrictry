"use client";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import { GL } from "../components/gl";
import { Leva } from "leva";
import { useState } from "react";
import ErrorSuppressor from "./error-boundary";

export default function Page() {
  const [hovering] = useState(false);

  return (
    <>
      <ErrorSuppressor />
      <div className="relative w-full h-screen bg-background flex flex-col overflow-hidden font-serif selection:bg-accent/20">
      {/* Background Animation Layer */}
      <div className="absolute inset-0 z-0">
        <GL hovering={hovering} />
        <Leva hidden />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Hero />
        </main>

        {/* Subtle footer line */}
        <footer className="w-full border-t border-white/5 py-5 text-center text-white/40 text-sm tracking-wide">
          <p>© 2025 SENTRIC LABS, INC.</p>
        </footer>
      </div>

      {/* Decorative vignette */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-background/30 to-background/90 z-0" />
    </div>
    </>
  );
}
