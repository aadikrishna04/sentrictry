"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

const Hero: React.FC = () => {
  const [viewState, setViewState] = useState<"idle" | "input" | "success">(
    "idle"
  );
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Email invalid");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if email is empty
    if (!email || email.trim() === "") {
      setEmailError(true);
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setEmailError(true);
      return;
    }

    setEmailError(false);
    setIsSubmitting(true);

    try {
      // Save email to Supabase
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email: email.toLowerCase() }])
        .select();

      if (error) {
        // If it's a duplicate email, show specific message
        if (error.code === "23505") {
          setErrorMessage("Email already registered");
          setEmailError(true);
          setIsSubmitting(false);
          return;
        } else {
          // For other errors, show error state
          console.error("Error saving email:", error.message);
          setErrorMessage("Email invalid");
          setEmailError(true);
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(false);
      setViewState("success");
    } catch (err) {
      console.error("Unexpected error:", err);
      setEmailError(true);
      setIsSubmitting(false);
    }
  };

  // Reset effect after success
  useEffect(() => {
    if (viewState === "success") {
      const timer = setTimeout(() => {
        setViewState("idle");
        setEmail("");
        setEmailError(false);
        setErrorMessage("Email invalid"); // Reset error message
      }, 1200); // Hold checkmark for 1.2 seconds then reset
      return () => clearTimeout(timer);
    }
  }, [viewState]);

  // Clear error when user starts typing after seeing an error
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(false);
      setErrorMessage("Email invalid"); // Reset to default message
    }
  };

  return (
    <section className="w-full px-6 md:px-12 lg:px-24 max-w-screen-2xl mx-auto flex flex-col justify-center h-full pt-20 pb-12">
      {/* Main Heading */}
      <h1
        className="text-6xl md:text-7xl lg:text-8xl font-light text-textPrimary tracking-tight leading-[1.1] mb-8 max-w-6xl animate-fade-in-up opacity-0 font-serif"
        style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
      >
        Test Your AI Agents <br className="hidden lg:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-300/50">
          Before Things Break
        </span>
      </h1>

      {/* Subtitle */}
      <p
        className="text-xl md:text-2xl text-white font-normal max-w-3xl leading-relaxed mb-16 animate-fade-in-up opacity-0 font-serif"
        style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
      >
        Sentric runs your browser agents through hundreds of adversarial,
        auto-generated webpages inside an isolated browser sandbox, revealing
        failure modes that prompt-level testing will never catch.
      </p>

      {/* Interactive Area */}
      <div
        className="min-h-24 animate-fade-in-up opacity-0"
        style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-6 animate-fade-in">
          {/* Primary Button - Always visible */}
          <a
            className="group relative px-10 py-5 border-2 border-accent bg-accent hover:bg-accentHover hover:border-accentHover text-[#0A0A0D] font-semibold rounded-lg transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-lg shadow-accent/20"
            href="https://www.youtube.com/watch?v=w5NtuUesHP8&feature=youtu.be"
            target="blank"
          >
            <span className="flex items-center gap-3 text-base tracking-wide font-serif uppercase">
              View Demo Video
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </a>

          {/* Join Waitlist Button / Input Field - Wrapper maintains alignment */}
          <div className="flex-1 max-w-xl self-start">
            {viewState === "idle" ? (
              <button
                onClick={() => setViewState("input")}
                className="group px-10 py-5 border-2 border-white/40 bg-white/10 backdrop-blur-sm text-white hover:border-white hover:bg-white/20 rounded-lg transition-all duration-300 ease-out shadow-lg"
              >
                <span className="flex items-center gap-3 text-base tracking-wide font-serif uppercase font-semibold">
                  Join Waitlist
                </span>
              </button>
            ) : (
              <div className="w-full animate-expand-in">
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="relative flex flex-col"
                >
                  <div className="relative flex items-center group">
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={handleEmailChange}
                      autoFocus
                      autoComplete="off"
                      disabled={viewState === "success" || isSubmitting}
                      className={`w-full bg-white/15 backdrop-blur-sm border-2 text-white text-base px-8 py-5 pr-20 rounded-lg outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-serif shadow-lg ${
                        emailError
                          ? "border-red-500/60 focus:border-red-500"
                          : "border-white/30 focus:border-accent"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={viewState === "success" || isSubmitting}
                      className={`absolute right-3 top-3 bottom-3 w-14 rounded-md flex items-center justify-center transition-all duration-500 ease-out
                    ${
                      viewState === "success"
                        ? "bg-accent text-black scale-110 shadow-lg shadow-accent/50"
                        : isSubmitting
                        ? "bg-white/20 text-white"
                        : "bg-white/20 hover:bg-accent hover:text-black text-white"
                    }`}
                    >
                      <div className="relative w-6 h-6">
                        {isSubmitting ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        ) : viewState === "success" ? (
                          <div className="absolute inset-0 flex items-center justify-center animate-icon-morph">
                            <Check className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center animate-icon-morph">
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                  {/* Reserved space for error message to prevent layout shift */}
                  <div className="h-7 mt-1 px-2">
                    {emailError && (
                      <p className="text-red-400 text-sm animate-fade-in font-serif">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes expand-in {
          0% { 
            opacity: 0;
            transform: scaleX(0.8);
            max-width: 200px;
          }
          100% { 
            opacity: 1;
            transform: scaleX(1);
            max-width: 600px;
          }
        }
        @keyframes icon-morph {
          0% { 
            opacity: 0; 
            transform: scale(0) rotate(-90deg);
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) rotate(0deg);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        .animate-expand-in {
          animation: expand-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: left center;
        }
        .animate-icon-morph {
          animation: icon-morph 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </section>
  );
};

export default Hero;
