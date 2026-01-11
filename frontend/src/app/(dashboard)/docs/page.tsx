"use client";

import React from "react";
import { Book, Code, Terminal, Zap } from "lucide-react";

const DocsPage = () => {
  const categories = [
    { title: "Getting Started", icon: Zap, desc: "Quickly integrate Sentric into your AI agent project." },
    { title: "SDK Reference", icon: Code, desc: "Detailed API documentation for our Python and JS SDKs." },
    { title: "CLI Tool", icon: Terminal, desc: "Manage runs and projects from your terminal." },
    { title: "Security Guide", icon: Book, desc: "Best practices for adversarial testing of AI agents." },
  ];

  return (
    <div className="px-12 py-10 max-w-5xl">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-semibold text-textPrimary font-display">Documentation</h1>
        <p className="text-textSecondary font-serif">Learn how to secure and monitor your AI agents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all group cursor-pointer">
            <div className="p-3 bg-white/5 rounded-2xl w-fit mb-6 group-hover:bg-accent/10 transition-colors">
              <cat.icon size={28} className="text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-textPrimary font-display mb-2">{cat.title}</h3>
            <p className="text-textSecondary font-serif text-sm leading-relaxed">{cat.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 p-8 rounded-3xl">
        <h2 className="text-2xl font-semibold mb-4 font-display">Need help?</h2>
        <p className="text-textSecondary font-serif mb-6">
          Our community is active on Discord and GitHub. You can also contact our support team directly.
        </p>
        <button className="bg-accent text-background px-6 py-2.5 rounded-xl font-medium font-serif hover:bg-accentHover transition-all">
          Join Community
        </button>
      </div>
    </div>
  );
};

export default DocsPage;
