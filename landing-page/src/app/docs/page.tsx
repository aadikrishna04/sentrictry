"use client";

import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import { 
  Book, 
  Code, 
  Zap, 
  Shield, 
  Eye,
  Play,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Layers,
  AlertTriangle,
  Activity
} from "lucide-react";
import { GL } from "../../components/gl";
import { Leva } from "leva";

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: "introduction", title: "Introduction", icon: Book },
    { id: "quickstart", title: "Quick Start", icon: Zap },
    { id: "sdk-reference", title: "SDK Reference", icon: Code },
    { id: "security-analysis", title: "Security Analysis", icon: Shield },
    { id: "dashboard", title: "Dashboard", icon: Activity },
    { id: "laminar", title: "Session Recording", icon: Play },
  ];

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-surfaceHighlight border border-white/10 rounded-xl p-4 overflow-x-auto text-sm font-mono">
        <code className="text-gray-300">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-3 right-3 p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        {copiedCode === id ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-gray-400" />}
      </button>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen bg-background text-textPrimary selection:bg-accent/20">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <GL hovering={false} />
        <Leva hidden />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        
        <div className="max-w-7xl mx-auto flex pt-24 px-6 w-full">
          {/* Sidebar Navigation */}
          <aside className="w-64 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto hidden lg:block border-r border-white/5 pr-6">
            <div className="mb-8 mt-4">
              <h2 className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-4 font-mono">Documentation</h2>
            </div>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? "bg-accent/10 text-accent border-l-2 border-accent font-medium"
                      : "text-textSecondary hover:text-white hover:bg-white/5"
                  }`}
                >
                  <section.icon size={16} />
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:pl-16 py-12 max-w-4xl">
            {/* Introduction */}
            {activeSection === "introduction" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">Introduction</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    Sentric is a security observability platform for AI browser agents. It monitors agent actions and reasoning in real-time, 
                    automatically detecting potential security threats using LLM-based analysis.
                  </p>
                </div>

                <div className="bg-accent/5 border border-accent/20 p-8 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl -mr-16 -mt-16 group-hover:bg-accent/20 transition-colors" />
                  <h3 className="text-xl font-bold text-white mb-4 font-sans">What Sentric Does</h3>
                  <ul className="space-y-4 text-textSecondary font-sans">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-accent/20 p-1 rounded">
                          <ChevronRight size={14} className="text-accent" />
                      </div>
                      <span><strong className="text-white">Monitors</strong> every action your AI agent takes in the browser</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-accent/20 p-1 rounded">
                          <ChevronRight size={14} className="text-accent" />
                      </div>
                      <span><strong className="text-white">Captures</strong> agent reasoning and decision-making processes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-accent/20 p-1 rounded">
                          <ChevronRight size={14} className="text-accent" />
                      </div>
                      <span><strong className="text-white">Analyzes</strong> behavior for security threats using LLM-based detection</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-accent/20 p-1 rounded">
                          <ChevronRight size={14} className="text-accent" />
                      </div>
                      <span><strong className="text-white">Reports</strong> findings with severity levels and evidence</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">How It Works</h2>
                  <p className="text-textSecondary font-sans mb-8 leading-relaxed">
                    Sentric wraps your BrowserUse agent with a monitoring layer. As your agent runs, 
                    Sentric captures every click, navigation, form submission, and reasoning step. When the run completes, 
                    the security analyzer examines the entire session to identify potential threats.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { icon: Eye, title: "Observe", desc: "Wrap your agent with SentricMonitor" },
                      { icon: Layers, title: "Collect", desc: "Actions and reasoning are captured" },
                      { icon: Shield, title: "Analyze", desc: "LLM detects security threats" },
                    ].map((step, i) => (
                      <div key={i} className="bg-surface border border-white/5 p-6 rounded-xl hover:border-accent/30 transition-colors">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                          <step.icon size={24} className="text-accent" />
                        </div>
                        <h4 className="text-white font-bold mb-2 font-sans">{step.title}</h4>
                        <p className="text-textSecondary text-sm font-sans leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">Security Threats Detected</h2>
                  <p className="text-textSecondary font-sans mb-6 leading-relaxed">
                    The LLM-based security analyzer identifies a wide range of threats:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Authentication & authorization bypasses",
                      "Sensitive data exposure (PII, credentials)",
                      "Suspicious network requests & data exfiltration",
                      "Social engineering & phishing patterns",
                      "Injection attacks (XSS, SQL, command)",
                      "Business logic flaws & payment manipulation",
                    ].map((threat, i) => (
                      <div key={i} className="flex items-center gap-3 text-textSecondary font-sans p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                        <AlertTriangle size={16} className="text-error flex-shrink-0" />
                        <span className="text-sm">{threat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Start */}
            {activeSection === "quickstart" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">Quick Start</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    Get Sentric monitoring running in under 5 minutes.
                  </p>
                </div>

                <div className="space-y-10">
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center text-accent text-sm font-bold font-mono">1</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-sans">Create a Project</h3>
                    <p className="text-textSecondary font-sans">
                      Navigate to the <strong className="text-white">Projects</strong> page in the dashboard and create a new project. 
                      This will organize your agent runs.
                    </p>
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center text-accent text-sm font-bold font-mono">2</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-sans">Generate an API Key</h3>
                    <p className="text-textSecondary font-sans">
                      Go to <strong className="text-white">API Keys</strong> and generate a key for your project. 
                      Store it securely — you&apos;ll need it to authenticate the SDK.
                    </p>
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center text-accent text-sm font-bold font-mono">3</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-sans">Set Environment Variables</h3>
                    <p className="text-textSecondary font-sans mb-4">
                      Add your API key to your environment:
                    </p>
                    <CodeBlock 
                      id="env-vars-docs"
                      code={`export SENTRIC_API_KEY="sk_your_api_key_here"
export OPENAI_API_KEY="your_openai_key"  # Required for agent LLM`}
                      language="bash"
                    />
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center text-accent text-sm font-bold font-mono">4</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-sans">Wrap Your Agent</h3>
                    <p className="text-textSecondary font-sans mb-4">
                      Import <code className="bg-white/5 px-1.5 py-0.5 rounded text-accent text-sm font-mono border border-white/10">SentricMonitor</code> and 
                      wrap your BrowserUse agent:
                    </p>
                    <CodeBlock 
                      id="wrap-agent-docs"
                      code={`import os
from browser_use import Agent, Browser
from sentric import SentricMonitor

# Initialize the monitor
monitor = SentricMonitor(
    api_key=os.getenv("SENTRIC_API_KEY"),
    project_id="your_project_id",
    base_url="https://api.sentriclabs.com",
)

# Create your agent
agent = Agent(task="Your agent task here", llm=llm, browser=browser)

# Wrap and run
async with monitor.wrap(agent):
    await agent.run()`}
                    />
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center text-accent text-sm font-bold font-mono">5</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-sans">View Results</h3>
                    <p className="text-textSecondary font-sans">
                      After your agent completes, open the dashboard to view the run timeline, 
                      agent actions, reasoning steps, and any security findings detected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SDK Reference */}
            {activeSection === "sdk-reference" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">SDK Reference</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    The Sentric Python SDK provides the <code className="bg-white/5 px-1.5 py-0.5 rounded text-accent font-mono border border-white/10">SentricMonitor</code> class 
                    for wrapping BrowserUse agents.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">SentricMonitor</h2>
                  
                  <h3 className="text-lg font-bold text-white mb-4 font-sans">Constructor</h3>
                  <CodeBlock 
                    id="constructor-docs"
                    code={`SentricMonitor(
    api_key: str,       # Your Sentric API key (required)
    project_id: str,    # Project ID from dashboard (required)
    base_url: str = "https://api.sentriclabs.com"  # Backend URL
)`}
                  />
                  <div className="mt-6 space-y-4">
                    <div className="flex gap-4 items-start">
                      <code className="text-accent font-mono text-sm bg-accent/10 px-2 py-1 rounded">api_key</code>
                      <span className="text-textSecondary font-sans text-sm pt-1">Your Sentric API key, generated from the API Keys page.</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="text-accent font-mono text-sm bg-accent/10 px-2 py-1 rounded">project_id</code>
                      <span className="text-textSecondary font-sans text-sm pt-1">The project ID where runs will be recorded. Found in your project settings.</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="text-accent font-mono text-sm bg-accent/10 px-2 py-1 rounded">base_url</code>
                      <span className="text-textSecondary font-sans text-sm pt-1">URL of the Sentric backend server.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h3 className="text-xl font-bold text-white mb-4 font-sans">wrap(agent)</h3>
                  <p className="text-textSecondary font-sans mb-6 leading-relaxed">
                    Async context manager that wraps a BrowserUse agent for monitoring.
                  </p>
                  <CodeBlock 
                    id="wrap-method-docs"
                    code={`async with monitor.wrap(agent):
    # Agent is now monitored
    # All actions and reasoning are captured
    await agent.run()
    
# When the context exits:
# - Run is automatically ended
# - Security analysis runs
# - Findings are generated`}
                  />
                  <div className="mt-6 bg-error/10 border border-error/20 p-5 rounded-xl flex gap-4">
                    <AlertTriangle className="text-error shrink-0" size={20} />
                    <p className="text-error/90 text-sm font-sans">
                      <strong>Important:</strong> The run status is determined by how the context exits. 
                      Normal exit = <code className="bg-black/20 px-1 rounded font-mono">completed</code>, 
                      exception = <code className="bg-black/20 px-1 rounded font-mono">failed</code>.
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">Events Captured</h2>
                  <p className="text-textSecondary font-sans mb-6">
                    The SDK automatically captures these event types:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { type: "action", desc: "Browser actions (click, type, navigate, etc.)" },
                      { type: "reasoning", desc: "Agent's thinking and decision-making process" },
                      { type: "step_start", desc: "Beginning of each agent step" },
                      { type: "step_reasoning", desc: "Per-step evaluation and goals" },
                    ].map((event) => (
                      <div key={event.type} className="flex flex-col gap-2 bg-surface border border-white/5 p-4 rounded-xl">
                        <code className="text-accent font-mono text-sm">{event.type}</code>
                        <span className="text-textSecondary font-sans text-sm">{event.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Analysis */}
            {activeSection === "security-analysis" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">Security Analysis</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    Sentric uses LLM-based contextual analysis to detect security threats in agent behavior.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">How Analysis Works</h2>
                  <p className="text-textSecondary font-sans mb-8 leading-relaxed">
                    When a run ends, all captured events (actions and reasoning) are sent to an LLM configured as a 
                    cybersecurity expert. The LLM analyzes the sequence of events to identify potential security issues.
                  </p>
                  <div className="bg-surface border border-white/5 p-8 rounded-2xl">
                    <h4 className="text-white font-bold mb-6 font-sans flex items-center gap-2">
                      <Shield size={20} className="text-accent" />
                      The analyzer examines:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      {[
                        "Context and intent behind actions",
                        "Subtle security risks in reasoning",
                        "Novel attack patterns and anomalies",
                        "Social engineering attempts",
                        "Complex multi-step attack chains",
                        "Infrastructure exposure"
                      ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-textSecondary font-sans text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                              {item}
                          </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">Severity Levels</h2>
                  <div className="space-y-3">
                    {[
                      { level: "critical", color: "bg-error", desc: "Immediate threat requiring urgent attention" },
                      { level: "high", color: "bg-orange-500", desc: "Significant risk that should be addressed quickly" },
                      { level: "medium", color: "bg-yellow-500", desc: "Moderate risk worth investigating" },
                      { level: "low", color: "bg-accent", desc: "Minor concern or informational finding" },
                    ].map((sev) => (
                      <div key={sev.level} className="flex items-center gap-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <span className={`w-3 h-3 rounded-full ${sev.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                          <code className="text-white font-mono text-sm font-bold uppercase">{sev.level}</code>
                        </div>
                        <span className="text-textSecondary font-sans text-sm">{sev.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard */}
            {activeSection === "dashboard" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">Dashboard</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    The Sentric dashboard provides visibility into all your agent runs and security findings.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { 
                      title: "Overview", 
                      desc: "Aggregate statistics across all projects, success rates, and activity charts." 
                    },
                    { 
                      title: "Projects", 
                      desc: "Organize runs, manage API keys, and track project-specific security posture." 
                    },
                    { 
                      title: "Run Timeline", 
                      desc: "Deep dive into every action and reasoning step with a chronological view." 
                    },
                    { 
                      title: "Security Findings", 
                      desc: "Detailed breakdown of detected threats with evidence and severity." 
                    }
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-surface border border-white/5 rounded-2xl hover:border-accent/30 transition-colors">
                       <h4 className="text-white font-bold mb-3 font-sans">{item.title}</h4>
                       <p className="text-textSecondary font-sans text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Laminar Integration */}
            {activeSection === "laminar" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4 font-sans tracking-tight">Session Recording</h1>
                  <p className="text-lg text-textSecondary leading-relaxed font-sans">
                    Sentric integrates with Laminar to provide full browser session recordings.
                  </p>
                </div>

                <div className="bg-surface border border-white/5 p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-white mb-4 font-sans">What is Laminar?</h2>
                  <p className="text-textSecondary font-sans leading-relaxed">
                    Laminar is an observability platform that captures real-time browser recordings 
                    synchronized with agent steps. When integrated with Sentric, you can watch exactly 
                    what your agent did during a run.
                  </p>
                  <a href="https://laminar.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent mt-6 hover:underline font-medium">
                    Visit Laminar <ExternalLink size={14} />
                  </a>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h2 className="text-2xl font-bold text-white mb-6 font-sans">Setup</h2>
                  <CodeBlock 
                    id="laminar-setup-docs"
                    code={`# 1. Install the Laminar package
pip install lmnr

# 2. Set your Laminar API key
export LMNR_PROJECT_API_KEY="your_laminar_key"`}
                    language="bash"
                  />
                </div>
              </div>
            )}

            {/* Mobile Navigation Selector */}
            <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
              <div className="bg-surfaceHighlight border border-white/20 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                  <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="w-full bg-transparent border-none rounded-xl px-4 py-3 text-white font-sans outline-none appearance-none"
                  >
                  {sections.map((section) => (
                      <option key={section.id} value={section.id} className="bg-surfaceHighlight">
                      {section.title}
                      </option>
                  ))}
                  </select>
              </div>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="w-full border-t border-white/5 py-12 bg-background mt-24">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-textSecondary text-sm font-mono">
                  © 2025 SENTRIC LABS, INC.
              </div>
              <div className="flex gap-8">
                  <a href="#" className="text-textSecondary hover:text-white text-xs font-mono uppercase tracking-widest transition-colors">Privacy</a>
                  <a href="#" className="text-textSecondary hover:text-white text-xs font-mono uppercase tracking-widest transition-colors">Terms</a>
                  <a href="mailto:security@sentriclabs.com" className="text-textSecondary hover:text-white text-xs font-mono uppercase tracking-widest transition-colors">Contact</a>
              </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default DocsPage;
