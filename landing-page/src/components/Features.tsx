import React from 'react';
import { Shield, Eye, Activity, Lock, AlertTriangle, Cpu } from 'lucide-react';

const Features: React.FC = () => {
  const features = [
    {
      icon: <Eye className="text-accent" size={24} />,
      title: "Live Observability",
      description: "Watch your agents think and act in real-time. Full video playback and reasoning traces for every run."
    },
    {
      icon: <Shield className="text-accent" size={24} />,
      title: "Security Sandbox",
      description: "Agents run in isolated, instrumented browser environments. Malicious file downloads and drives-by attacks are contained."
    },
    {
      icon: <AlertTriangle className="text-accent" size={24} />,
      title: "Vulnerability Detection",
      description: "Automatically flag insecure transport, PII leaks, infinite loops, and navigation to known malicious domains."
    },
    {
      icon: <Cpu className="text-accent" size={24} />,
      title: "Agent-Native",
      description: "Built for BrowserUse, LangChain, and custom implementations. Drop-in Python SDK wrapping your existing agent/LLM loop."
    }
  ];

  return (
    <section id="features" className="w-full py-24 bg-background border-b border-white/5 relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
            <h2 className="text-3xl font-mono text-white mb-4 uppercase tracking-wider">Platform Capabilities</h2>
            <div className="w-24 h-1 bg-accent mb-8"/>
            <p className="text-textSecondary max-w-2xl text-lg font-sans">
                Sentric provides the missing security layer for autonomous browser agents, 
                enabling safe deployment in enterprise environments.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, i) => (
                <div key={i} className="group p-8 border border-border bg-surface hover:border-accent/50 transition-all duration-300">
                    <div className="mb-6 bg-surfaceHighlight w-12 h-12 flex items-center justify-center rounded-sm group-hover:bg-accent/10 transition-colors">
                        {f.icon}
                    </div>
                    <h3 className="text-xl font-mono text-white mb-3">{f.title}</h3>
                    <p className="text-textSecondary font-sans leading-relaxed">
                        {f.description}
                    </p>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
