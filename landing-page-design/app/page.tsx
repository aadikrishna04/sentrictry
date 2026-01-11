import { ArrowRight, Terminal, Code2, Cpu, Network, Box, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-lg border border-accent/20 flex items-center justify-center">
                <Terminal className="h-4 w-4 text-accent" />
              </div>
              <span className="font-mono text-lg font-bold text-textPrimary tracking-tight">SENTRIC</span>
              <span className="text-[10px] font-mono text-textSecondary/50 border border-white/5 px-2 py-0.5 rounded">
                v2.0
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="#product"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary hover:text-accent transition-colors"
              >
                Product
              </Link>
              <Link
                href="#enterprise"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary hover:text-accent transition-colors"
              >
                Enterprise
              </Link>
              <Link
                href="#docs"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary hover:text-accent transition-colors"
              >
                Docs
              </Link>
              <Button className="bg-accent hover:bg-accentHover text-background font-mono font-bold text-xs rounded-md px-5 py-2 uppercase tracking-wider">
                Deploy Now
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 px-6 lg:px-8 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2">
              <div className="h-1 w-1 bg-accent animate-pulse rounded-full" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
                Agent-Native Development Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold font-mono text-textPrimary leading-[1.1] tracking-tighter">
              Agent-Native
              <br />
              <span className="text-accent">Software Development</span>
            </h1>

            <div className="flex items-start gap-4 max-w-3xl">
              <div className="mt-1.5">
                <Terminal className="h-5 w-5 text-accent" />
              </div>
              <p className="text-base md:text-lg text-textSecondary font-mono leading-relaxed">
                The only software development agents that work everywhere you do.
                <br />
                <span className="text-textSecondary/60">
                  From IDE to CI/CD — delegate complete tasks like refactors, incident response, and migrations to
                  Droids without changing your tools, models, or workflow.
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
              <Button className="bg-white text-background hover:bg-white/90 font-mono font-bold text-sm px-8 py-6 rounded-lg uppercase tracking-wider transition-all">
                <Terminal className="mr-2 h-4 w-4" />
                Start Building
              </Button>
              <Button
                variant="outline"
                className="bg-white/5 border border-white/20 text-white hover:bg-white/10 font-mono text-sm px-8 py-6 rounded-lg uppercase tracking-wider transition-all"
              >
                <Code2 className="mr-2 h-4 w-4" />
                View Docs
              </Button>
            </div>

            <div className="pt-12 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-textSecondary/40 font-mono mb-6">
                // Trusted by engineering teams at
              </p>
              <div className="flex flex-wrap items-center gap-8 lg:gap-12">
                {["Podium", "Groq", "Chainguard", "Acme_Corp"].map((company) => (
                  <span key={company} className="text-textSecondary/40 font-mono text-sm font-bold tracking-tight">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="py-24 px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="mb-16">
            <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-4">// 01_PRODUCT</p>
            <h2 className="text-4xl md:text-5xl font-bold font-mono text-textPrimary mb-6">
              Droids meet you
              <br />
              wherever you work.
            </h2>
            <p className="text-base text-textSecondary/60 font-mono leading-relaxed max-w-2xl">
              Droids embed directly into your workflow. IDE, Web, CLI, Slack, Linear.
              <br />
              Delegate tasks as they come to mind, wherever you are.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Terminal,
                tag: "IDE",
                title: "Terminal / IDE",
                description:
                  "Factory meets you in your editor without forcing a switch. Delegate to Droids in any IDE or terminal: VS Code, JetBrains, Vim, and more.",
                highlight: "All while maintaining your workflow, tools, and shortcuts.",
              },
              {
                icon: Code2,
                tag: "WEB",
                title: "Web Browser",
                description:
                  "Run Droids directly from the web. Developers can delegate complex coding tasks, refactors, or debugging to agents instantly.",
                highlight: "No setup required. UI designed for clarity and speed.",
              },
              {
                icon: Cpu,
                tag: "CLI",
                title: "Command Line",
                description: "Script and parallelize Droids at massive scale for CI/CD, migrations, and maintenance.",
                highlight: "From automated code review to self-healing builds.",
              },
              {
                icon: Network,
                tag: "SLACK",
                title: "Slack / Teams",
                description:
                  "Give support teams and engineers a shared line to Droids. From incident triage to small bug fixes.",
                highlight: "Faster fixes, lower MTTR, broader adoption.",
              },
              {
                icon: Box,
                tag: "PM",
                title: "Project Manager",
                description:
                  "Automatically trigger agents from issue assignment or mentions. Factory pulls context, implements solutions.",
                highlight: "Full traceability from ticket to code.",
              },
              {
                icon: Lock,
                tag: "SEC",
                title: "Secure by Default",
                description:
                  "Industry-grade security and compliance. State-of-the-art security protocols to protect your data.",
                highlight: "Protect your IP from AI misuse.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white/[0.02] border border-white/5 hover:border-accent/30 rounded-lg p-8 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/5 border border-accent/20 rounded flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-accent border border-accent/20 px-2 py-1 rounded uppercase tracking-wider">
                      {feature.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-textSecondary/20 font-mono font-bold">0{idx + 1}</span>
                </div>

                <h3 className="text-xl font-bold font-mono text-textPrimary mb-4">{feature.title}</h3>

                <p className="text-sm text-textSecondary/60 font-mono leading-relaxed mb-3">{feature.description}</p>

                <p className="text-sm text-accent/80 font-mono leading-relaxed">{feature.highlight}</p>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <Link
                    href="#"
                    className="text-xs text-accent hover:text-accentHover font-mono inline-flex items-center gap-2 transition-colors uppercase tracking-wider"
                  >
                    Learn More
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-12 lg:p-16 overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(147,197,253,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,197,253,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="h-1 w-1 bg-accent animate-pulse rounded-full" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
                  // System_Status: Ready
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-textPrimary mb-6 leading-tight">
                Automate your high-volume
                <br />
                <span className="text-accent">networking issues</span>
              </h2>

              <p className="text-base text-textSecondary/60 font-mono leading-relaxed mb-10 max-w-2xl">
                Deploy AI agents into your workflow—integrating across your entire development stack.
                <br />
                <span className="text-textSecondary/40">
                  Monitor, configure, and repair with automated intelligence.
                </span>
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button className="bg-accent hover:bg-accentHover text-background font-mono font-bold text-sm px-8 py-6 rounded-lg uppercase tracking-wider transition-all">
                  <Terminal className="mr-2 h-4 w-4" />
                  Get a Demo
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/5 border border-white/20 text-white hover:bg-white/10 font-mono text-sm px-8 py-6 rounded-lg uppercase tracking-wider transition-all"
                >
                  How it Works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="enterprise" className="py-24 px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16">
            <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-4">// 02_ENTERPRISE</p>
            <h2 className="text-4xl md:text-5xl font-bold font-mono text-textPrimary mb-6">
              AI that will work with you,
              <br />
              <span className="text-textSecondary/60">not replace you</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent/5 border border-accent/20 rounded flex items-center justify-center">
                  <Lock className="h-5 w-5 text-accent" />
                </div>
                <span className="text-[10px] font-mono font-bold text-accent border border-accent/20 px-2 py-1 rounded uppercase tracking-wider">
                  SECURITY
                </span>
              </div>

              <h3 className="text-2xl font-bold font-mono text-textPrimary mb-4">Secure at every level</h3>

              <p className="text-sm text-textSecondary/60 font-mono leading-relaxed mb-6">
                Industry-grade security and compliance.
                <br />
                <br />
                We use state-of-the-art security protocols to protect your data and IP from AI misuse.
              </p>

              <Link
                href="#"
                className="text-xs text-accent hover:text-accentHover font-mono inline-flex items-center gap-2 transition-colors uppercase tracking-wider"
              >
                Learn more about security
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent/5 border border-accent/20 rounded flex items-center justify-center">
                  <Network className="h-5 w-5 text-accent" />
                </div>
                <span className="text-[10px] font-mono font-bold text-accent border border-accent/20 px-2 py-1 rounded uppercase tracking-wider">
                  AGNOSTIC
                </span>
              </div>

              <h3 className="text-2xl font-bold font-mono text-textPrimary mb-4">Interface and vendor agnostic</h3>

              <p className="text-sm text-textSecondary/60 font-mono leading-relaxed mb-6">
                Flexible and extensible, working with any model provider, any dev tooling, and on any interface.
                <br />
                <br />
                As your tooling matures, so do your agents.
              </p>

              <Link
                href="#"
                className="text-xs text-accent hover:text-accentHover font-mono inline-flex items-center gap-2 transition-colors uppercase tracking-wider"
              >
                Learn more about enterprise
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 lg:px-8 border-t border-white/5 mt-24">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-lg border border-accent/20 flex items-center justify-center">
                <Terminal className="h-4 w-4 text-accent" />
              </div>
              <span className="font-mono text-lg font-bold text-textPrimary tracking-tight">SENTRIC</span>
            </div>

            <div className="flex items-center gap-8">
              <Link
                href="#"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary/50 hover:text-accent transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary/50 hover:text-accent transition-colors"
              >
                Terms
              </Link>
              <Link
                href="#"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary/50 hover:text-accent transition-colors"
              >
                Docs
              </Link>
              <Link
                href="#"
                className="text-xs font-mono uppercase tracking-wider text-textSecondary/50 hover:text-accent transition-colors"
              >
                Contact
              </Link>
            </div>

            <p className="text-[10px] text-textSecondary/30 font-mono">© 2026 Sentric v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
