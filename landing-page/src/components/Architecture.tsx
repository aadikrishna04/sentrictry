import React from 'react';
import { ArrowDown, Laptop, Shield, Server, Layout } from 'lucide-react';

const Architecture: React.FC = () => {
  return (
    <section id="architecture" className="w-full py-24 bg-background border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h2 className="text-3xl font-mono text-white mb-4 uppercase tracking-wider">System Architecture</h2>
          <div className="w-24 h-1 bg-accent mb-8"/>
        </div>

        <div className="flex flex-col items-center gap-8 relative">
            {/* Step 1: User Machine */}
            <div className="w-full max-w-2xl border border-border bg-surface p-6 relative group hover:border-accent transition-colors">
                <div className="absolute top-0 left-0 bg-accent text-black text-xs font-bold px-2 py-1 font-mono uppercase">Local / Cloud</div>
                <div className="flex items-start gap-4 mt-4">
                    <Laptop className="text-textSecondary group-hover:text-accent transition-colors block shrink-0" size={32} />
                    <div>
                        <h3 className="text-lg font-mono text-white mb-2">Browser Agent</h3>
                        <p className="text-sm text-textSecondary font-sans">
                            Your existing agent (BrowserUse, LangChain) runs normally. 
                            The <span className="text-accent">Sentric SDK</span> wraps the execution loop, intercepting actions and reasoning steps.
                        </p>
                    </div>
                </div>
            </div>

            {/* Down Arrow */}
            <div className="flex flex-col items-center gap-1 text-textSecondary/50">
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-accent to-accent/50"/>
                <ArrowDown size={20} className="text-accent"/>
            </div>

            {/* Step 2: Sentric Backend */}
            <div className="w-full max-w-2xl border border-border bg-surface p-6 relative group hover:border-accent transition-colors">
                <div className="absolute top-0 left-0 bg-surfaceHighlight text-textSecondary text-xs font-bold px-2 py-1 font-mono uppercase border-r border-b border-border">Sentric Cloud</div>
                <div className="flex items-start gap-4 mt-4">
                    <Server className="text-textSecondary group-hover:text-accent transition-colors block shrink-0" size={32} />
                    <div>
                        <h3 className="text-lg font-mono text-white mb-2">Security Analysis Engine</h3>
                        <p className="text-sm text-textSecondary font-sans">
                            Events are streamed via secure WebSocket. The analytical engine detects 
                            <span className="text-white"> PII leakage</span>, 
                            <span className="text-white"> insecure forms</span>, and 
                            <span className="text-white"> malicious navigation</span> in real-time.
                        </p>
                    </div>
                </div>
            </div>

            {/* Down Arrow */}
            <div className="flex flex-col items-center gap-1 text-textSecondary/50">
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-accent to-accent/50"/>
                <ArrowDown size={20} className="text-accent"/>
            </div>

            {/* Step 3: Dashboard */}
            <div className="w-full max-w-2xl border border-border bg-surface p-6 relative group hover:border-accent transition-colors">
                <div className="absolute top-0 left-0 bg-surfaceHighlight text-textSecondary text-xs font-bold px-2 py-1 font-mono uppercase border-r border-b border-border">Web App</div>
                <div className="flex items-start gap-4 mt-4">
                    <Layout className="text-textSecondary group-hover:text-accent transition-colors block shrink-0" size={32} />
                    <div>
                        <h3 className="text-lg font-mono text-white mb-2">Observability Dashboard</h3>
                        <p className="text-sm text-textSecondary font-sans">
                            View live timelines, replay sessions, and export security audit reports. 
                            Analyze agent behavior and reasoning tracks to improve reliability.
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </section>
  );
};

export default Architecture;
