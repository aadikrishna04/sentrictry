"use client";

import React, { useState } from "react";
import { 
  Book, 
  Code, 
  Terminal, 
  Zap, 
  Shield, 
  Eye,
  Play,
  Key,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Layers,
  AlertTriangle,
  Activity
} from "lucide-react";

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

  const CodeBlock = ({ code, language = "python", id }: { code: string; language?: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-black/50 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm font-mono">
        <code className="text-gray-300">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-3 right-3 p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        {copiedCode === id ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 p-6 sticky top-0 h-screen overflow-y-auto hidden lg:block">
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">Documentation</h2>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-serif transition-all ${
                activeSection === section.id
                  ? "bg-accent/10 text-accent border-l-2 border-accent"
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
      <main className="flex-1 px-8 lg:px-16 py-10 max-w-4xl">
        {/* Introduction */}
        {activeSection === "introduction" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">Introduction</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                Sentric is a security observability platform for AI browser agents. It monitors agent actions and reasoning in real-time, 
                automatically detecting potential security threats using LLM-based analysis.
              </p>
            </div>

            <div className="bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-3 font-display">What Sentric Does</h3>
              <ul className="space-y-2 text-textSecondary font-serif">
                <li className="flex items-start gap-2">
                  <ChevronRight size={16} className="text-accent mt-1 flex-shrink-0" />
                  <span><strong className="text-white">Monitors</strong> every action your AI agent takes in the browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={16} className="text-accent mt-1 flex-shrink-0" />
                  <span><strong className="text-white">Captures</strong> agent reasoning and decision-making processes</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={16} className="text-accent mt-1 flex-shrink-0" />
                  <span><strong className="text-white">Analyzes</strong> behavior for security threats using LLM-based detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={16} className="text-accent mt-1 flex-shrink-0" />
                  <span><strong className="text-white">Reports</strong> findings with severity levels and evidence</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">How It Works</h2>
              <p className="text-textSecondary font-serif mb-6 leading-relaxed">
                Sentric wraps your BrowserUse agent with a monitoring layer. As your agent runs, 
                Sentric captures every click, navigation, form submission, and reasoning step. When the run completes, 
                the security analyzer examines the entire session to identify potential threats.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Eye, title: "Observe", desc: "Wrap your agent with SentricMonitor" },
                  { icon: Layers, title: "Collect", desc: "Actions and reasoning are captured" },
                  { icon: Shield, title: "Analyze", desc: "LLM detects security threats" },
                ].map((step, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-xl text-center">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <step.icon size={20} className="text-accent" />
                    </div>
                    <h4 className="text-white font-semibold mb-1">{step.title}</h4>
                    <p className="text-textSecondary text-sm font-serif">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Security Threats Detected</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                The LLM-based security analyzer identifies a wide range of threats:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Authentication & authorization bypasses",
                  "Sensitive data exposure (PII, credentials)",
                  "Suspicious network requests & data exfiltration",
                  "Social engineering & phishing patterns",
                  "Injection attacks (XSS, SQL, command)",
                  "Business logic flaws & payment manipulation",
                ].map((threat, i) => (
                  <div key={i} className="flex items-center gap-2 text-textSecondary font-serif text-sm">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                    {threat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Start */}
        {activeSection === "quickstart" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">Quick Start</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                Get Sentric monitoring running in under 5 minutes.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white font-display mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm">1</span>
                  Create a Project
                </h3>
                <p className="text-textSecondary font-serif mb-4">
                  Navigate to the <strong className="text-white">Projects</strong> page in the dashboard and create a new project. 
                  This will organize your agent runs.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white font-display mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm">2</span>
                  Generate an API Key
                </h3>
                <p className="text-textSecondary font-serif mb-4">
                  Go to <strong className="text-white">API Keys</strong> and generate a key for your project. 
                  Store it securely — you'll need it to authenticate the SDK.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white font-display mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm">3</span>
                  Set Environment Variables
                </h3>
                <p className="text-textSecondary font-serif mb-4">
                  Add your API key to your environment:
                </p>
                <CodeBlock 
                  id="env-vars"
                  code={`export SENTRIC_API_KEY="sk_your_api_key_here"
export OPENAI_API_KEY="your_openai_key"  # Required for agent LLM`}
                  language="bash"
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white font-display mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm">4</span>
                  Wrap Your Agent
                </h3>
                <p className="text-textSecondary font-serif mb-4">
                  Import <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent text-sm">SentricMonitor</code> and 
                  wrap your BrowserUse agent:
                </p>
                <CodeBlock 
                  id="wrap-agent"
                  code={`import os
from browser_use import Agent, Browser
from sentric import SentricMonitor

# Initialize the monitor
monitor = SentricMonitor(
    api_key=os.getenv("SENTRIC_API_KEY"),
    project_id="your_project_id",
    base_url="http://localhost:8000",  # Sentric backend URL
)

# Create your agent
agent = Agent(task="Your agent task here", llm=llm, browser=browser)

# Wrap and run
async with monitor.wrap(agent):
    await agent.run()`}
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white font-display mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm">5</span>
                  View Results
                </h3>
                <p className="text-textSecondary font-serif">
                  After your agent completes, open the dashboard to view the run timeline, 
                  agent actions, reasoning steps, and any security findings detected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SDK Reference */}
        {activeSection === "sdk-reference" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">SDK Reference</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                The Sentric Python SDK provides the <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent">SentricMonitor</code> class 
                for wrapping BrowserUse agents.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">SentricMonitor</h2>
              
              <h3 className="text-lg font-semibold text-white mb-3">Constructor</h3>
              <CodeBlock 
                id="constructor"
                code={`SentricMonitor(
    api_key: str,       # Your Sentric API key (required)
    project_id: str,    # Project ID from dashboard (required)
    base_url: str = "http://localhost:8000"  # Backend URL
)`}
              />
              <div className="mt-4 space-y-3">
                <div className="flex gap-4 text-sm">
                  <code className="text-accent font-mono">api_key</code>
                  <span className="text-textSecondary font-serif">Your Sentric API key, generated from the API Keys page.</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <code className="text-accent font-mono">project_id</code>
                  <span className="text-textSecondary font-serif">The project ID where runs will be recorded. Found in your project settings.</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <code className="text-accent font-mono">base_url</code>
                  <span className="text-textSecondary font-serif">URL of the Sentric backend server.</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">wrap(agent)</h3>
              <p className="text-textSecondary font-serif mb-4">
                Async context manager that wraps a BrowserUse agent for monitoring.
              </p>
              <CodeBlock 
                id="wrap-method"
                code={`async with monitor.wrap(agent):
    # Agent is now monitored
    # All actions and reasoning are captured
    await agent.run()
    
# When the context exits:
# - Run is automatically ended
# - Security analysis runs
# - Findings are generated`}
              />
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                <p className="text-amber-200 text-sm font-serif">
                  <strong>Important:</strong> The run status is determined by how the context exits. 
                  Normal exit = <code className="bg-black/30 px-1 rounded">completed</code>, 
                  exception = <code className="bg-black/30 px-1 rounded">failed</code>.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Events Captured</h2>
              <p className="text-textSecondary font-serif mb-4">
                The SDK automatically captures these event types:
              </p>
              <div className="space-y-3">
                {[
                  { type: "action", desc: "Browser actions (click, type, navigate, scroll, etc.)" },
                  { type: "reasoning", desc: "Agent's thinking and decision-making process" },
                  { type: "step_start", desc: "Beginning of each agent step" },
                  { type: "step_reasoning", desc: "Per-step evaluation, memory, and next goal" },
                ].map((event) => (
                  <div key={event.type} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                    <code className="text-accent font-mono text-sm bg-accent/10 px-2 py-0.5 rounded">{event.type}</code>
                    <span className="text-textSecondary font-serif text-sm">{event.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Run Naming</h2>
              <p className="text-textSecondary font-serif mb-4">
                You can provide a custom name for runs to make them easier to identify:
              </p>
              <CodeBlock 
                id="run-naming"
                code={`# The run name is extracted from the agent's task
# Or you can set it via the task parameter
agent = Agent(task="Book a flight to NYC", llm=llm, browser=browser)

# Duplicate names are automatically suffixed: (1) Name, (2) Name, etc.`}
              />
            </div>
          </div>
        )}

        {/* Security Analysis */}
        {activeSection === "security-analysis" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">Security Analysis</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                Sentric uses LLM-based contextual analysis to detect security threats in agent behavior.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">How Analysis Works</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                When a run ends, all captured events (actions and reasoning) are sent to an LLM configured as a 
                cybersecurity expert. The LLM analyzes the sequence of events to identify potential security issues.
              </p>
              <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                <h4 className="text-white font-semibold mb-3">The analyzer examines:</h4>
                <ul className="space-y-2 text-textSecondary font-serif text-sm">
                  <li>• Context and intent behind each action</li>
                  <li>• Subtle security risks in reasoning patterns</li>
                  <li>• Novel attack patterns and anomalies</li>
                  <li>• Social engineering attempts</li>
                  <li>• Complex multi-step attack chains</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Severity Levels</h2>
              <p className="text-textSecondary font-serif mb-4">
                Each finding is assigned a severity level:
              </p>
              <div className="space-y-3">
                {[
                  { level: "critical", color: "bg-red-500", desc: "Immediate threat requiring urgent attention" },
                  { level: "high", color: "bg-orange-500", desc: "Significant risk that should be addressed quickly" },
                  { level: "medium", color: "bg-amber-500", desc: "Moderate risk worth investigating" },
                  { level: "low", color: "bg-blue-500", desc: "Minor concern or informational finding" },
                ].map((sev) => (
                  <div key={sev.level} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${sev.color}`} />
                    <code className="text-white font-mono text-sm w-20">{sev.level}</code>
                    <span className="text-textSecondary font-serif text-sm">{sev.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Finding Structure</h2>
              <p className="text-textSecondary font-serif mb-4">
                Each security finding contains:
              </p>
              <CodeBlock 
                id="finding-structure"
                code={`{
  "severity": "high",
  "category": "data_exposure",
  "description": "Agent submitted sensitive form data to an untrusted domain",
  "evidence": [
    // List of events that support this finding
  ]
}`}
              />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Configuration</h2>
              <p className="text-textSecondary font-serif mb-4">
                The security analyzer requires an OpenAI API key set in the backend environment:
              </p>
              <CodeBlock 
                id="security-config"
                code={`# Required for security analysis
export OPENAI_API_KEY="your_openai_key"

# Optional: specify a different model (defaults to gpt-4o-mini)
export SECURITY_ANALYZER_LLM_MODEL="gpt-4o"`}
                language="bash"
              />
            </div>
          </div>
        )}

        {/* Dashboard */}
        {activeSection === "dashboard" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">Dashboard</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                The Sentric dashboard provides visibility into all your agent runs and security findings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Overview</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                The overview page shows aggregate statistics across all your projects:
              </p>
              <ul className="space-y-2 text-textSecondary font-serif">
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Total runs and success rate
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Security findings count
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Daily and hourly activity charts
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Recent runs across all projects
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Projects</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                Projects organize your agent runs. Each project can have:
              </p>
              <ul className="space-y-2 text-textSecondary font-serif">
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Multiple API keys for different environments
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Independent run history and statistics
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-accent" />
                  Custom name for easy identification
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Run Details</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                Click on any run to see the full details:
              </p>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <h4 className="text-white font-semibold mb-2">Timeline Tab</h4>
                  <p className="text-textSecondary font-serif text-sm">
                    Chronological view of every action and reasoning step. Each step shows what the agent did 
                    and why it made that decision.
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <h4 className="text-white font-semibold mb-2">Security Tab</h4>
                  <p className="text-textSecondary font-serif text-sm">
                    Lists all security findings with severity, category, description, and the evidence 
                    (specific events) that triggered the finding.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">API Keys</h2>
              <p className="text-textSecondary font-serif leading-relaxed">
                Generate API keys to authenticate the SDK. Each key is scoped to a specific project. 
                Keys are shown only once at creation — store them securely.
              </p>
            </div>
          </div>
        )}

        {/* Laminar Integration */}
        {activeSection === "laminar" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold text-white font-display mb-4">Session Recording</h1>
              <p className="text-lg text-textSecondary font-serif leading-relaxed">
                Sentric integrates with Laminar to provide full browser session recordings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">What is Laminar?</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                <a href="https://laminar.ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                  Laminar <ExternalLink size={14} />
                </a> is an observability platform that captures real-time browser recordings 
                synchronized with agent steps. When integrated with Sentric, you can watch exactly 
                what your agent did during a run.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Setup</h2>
              <p className="text-textSecondary font-serif mb-4">
                To enable session recording:
              </p>
              <CodeBlock 
                id="laminar-setup"
                code={`# 1. Install the Laminar package
pip install lmnr

# 2. Set your Laminar API key
export LMNR_PROJECT_API_KEY="your_laminar_key"

# Get your key from: https://laminar.ai`}
                language="bash"
              />
              <p className="text-textSecondary font-serif mt-4">
                Laminar will automatically initialize when you run your agent. Session recordings 
                are captured without any additional code changes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white font-display mb-4">Viewing Recordings</h2>
              <p className="text-textSecondary font-serif mb-4 leading-relaxed">
                When a run completes with Laminar enabled, a "View Recording in Laminar" link appears 
                on the run details page. Click it to watch the full browser session in Laminar's interface.
              </p>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <p className="text-textSecondary font-serif text-sm">
                  <strong className="text-white">Note:</strong> Recordings are stored in Laminar's cloud. 
                  Sentric links to them via a trace ID captured when the run ends.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="w-full bg-background border border-white/20 rounded-xl px-4 py-3 text-white font-serif"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
      </main>
    </div>
  );
};

export default DocsPage;
