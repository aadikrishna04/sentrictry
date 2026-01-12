"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const FooterCTA: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!email) {
            setError("Please enter your email.");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase
                .from("waitlist")
                .insert([{ email }]);

            if (error) throw error;

            setSuccess(true);
            setEmail("");
        } catch (err: unknown) {
            console.error("Error submitting email:", err);
            if (err && typeof err === 'object' && 'code' in err && err.code === "23505") { // Unique violation
                 setSuccess(true); // Treat duplicate as success to not leak info
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

  return (
    <section id="demo-form" className="w-full py-12 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="relative w-full bg-surface border border-white/5 rounded-3xl overflow-hidden p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 group">
        
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

        {/* Left: Text */}
        <div className="flex flex-col gap-6 z-10 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-medium font-sans text-white tracking-tight leading-[1.1]">
                Worried about <span className="text-white/50">rogue agents?</span> <br/>
                Secure your fleet today.
            </h2>
        </div>

        {/* Right: Form + Visual */}
        <div className="w-full max-w-md z-10 flex flex-col gap-6">
            <div className="relative aspect-square w-24 h-24 md:absolute md:right-16 md:top-1/2 md:-translate-y-1/2 md:w-64 md:h-64 opacity-50 md:opacity-100 pointer-events-none">
                 {/* Abstract 3D shape placeholder using CSS */}
                 <div className="w-full h-full bg-gradient-to-br from-accent to-blue-600 rounded-2xl rotate-12 blur-2xl opacity-20 animate-pulse"/>
                 <div className="absolute inset-0 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl rotate-6 transition-transform group-hover:rotate-12 duration-700"/>
                 <div className="absolute inset-0 border border-white/20 bg-black/40 backdrop-blur-md rounded-2xl -rotate-6 transition-transform group-hover:-rotate-12 duration-700 flex items-center justify-center">
                    <div className="w-12 h-12 bg-accent rounded-lg"/>
                 </div>
            </div>

            {/* Form */}
            <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                 {!success ? (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                             <label htmlFor="email" className="text-xs font-mono text-textSecondary uppercase tracking-wider">Work Email</label>
                             <input 
                                id="email"
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-textSecondary/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans"
                            />
                        </div>
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18}/> : "Get a Demo"}
                        </button>
                    </form>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                        <CheckCircle2 size={48} className="text-green-400 mb-2"/>
                        <h3 className="text-xl font-medium text-white">You&apos;re on the list!</h3>
                        <p className="text-sm text-textSecondary">We&apos;ll be in touch shortly.</p>
                        <button onClick={() => setSuccess(false)} className="text-xs text-accent hover:underline mt-2">Add another email</button>
                    </div>
                 )}
            </div>
        </div>

      </div>
    </section>
  );
};

export default FooterCTA;
