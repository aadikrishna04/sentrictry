"use client";

import React, { useState } from "react";
import { ArrowRight, Lock, Copy, Check } from "lucide-react";

const Hero: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const command = "curl -fSsL https://app.sentric.ai/cli | sh";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative w-full px-6 md:px-12 pt-40 pb-32 flex flex-col items-center justify-center min-h-screen">
      
      {/* 1. Closed Beta Badge (Pill) */}
      <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-8">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs font-mono text-accent uppercase tracking-wider">
          Closed Beta
        </span>
      </div>

      {/* 2. Main Headline - Centered, Large */}
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium text-center text-white tracking-tight leading-[1] max-w-5xl mb-8 font-sans">
        Protect Your <br className="hidden md:block"/>
        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
            AI Browser Agents
        </span>
      </h1>

      {/* 3. Subheadline - Centered, Max Width */}
      <p className="text-lg md:text-xl text-textSecondary text-center max-w-2xl leading-relaxed mb-12 font-sans">
        The security layer for autonomous agents. Detect risks, 
        audit reasoning, and prevent data leaks in real-time.
      </p>

      {/* 4. Dual Call to Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
        <a href="#demo-form" className="group relative px-8 py-4 bg-accent hover:bg-accentHover text-background font-semibold rounded-full transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-accent/25">
            <span className="flex items-center gap-2">
                Get a Demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </span>
        </a>
      </div>

      {/* 5. Terminal/Code Block - Centered floating visual */}
      <div className="relative w-full max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full opacity-20 -z-10" />
        
        <div className="bg-[#050505] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20"/>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20"/>
                    <div className="w-3 h-3 rounded-full bg-green-500/20"/>
                </div>
                <div className="flex items-center gap-2">
                    <Lock size={12} className="text-textSecondary/50"/>
                    <span className="text-xs font-mono text-textSecondary/50">Secure Shell</span>
                </div>
            </div>
            
            <div className="p-6 md:p-8 font-mono text-sm md:text-base space-y-4">
                <div className="flex items-start gap-4 text-textSecondary">
                    <span className="text-accent select-none">$</span>
                    <span className="typing-effect">pip install sentric-sdk</span>
                </div>
                <div className="text-gray-500 italic pl-6">
                    Installing dependencies...
                </div>
                <div className="flex items-center justify-between pl-6 pt-2">
                    <code className="text-green-400">Successfully installed sentric-0.2.1</code>
                </div>
                
                {/* Copy Command Row */}
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                     <div className="text-textSecondary text-xs uppercase tracking-widest">
                        Quick Start
                     </div>
                     <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-xs font-mono text-accent hover:text-white transition-colors"
                     >
                        {command}
                        {copied ? <Check size={14}/> : <Copy size={14}/>}
                     </button>
                </div>
            </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
