"use client";
import { useEffect, useState } from "react";
import GlowButton from "@/components/GlowButton";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg">
      {/* Ambient radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.06)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.05)_0%,transparent_60%)] pointer-events-none" />

      {/* Floating tech fragments */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { text: "BAYESIAN NETWORKS", x: "15%", y: "25%", delay: 0 },
            { text: "O(1) MEMORY", x: "78%", y: "18%", delay: 0.5 },
            { text: "MONTE CARLO v5", x: "82%", y: "70%", delay: 1 },
            { text: "M5 TARGET HUNT", x: "10%", y: "75%", delay: 1.5 },
            { text: "BALL-BY-BALL", x: "65%", y: "82%", delay: 2 },
            { text: "WIN PROB %", x: "28%", y: "85%", delay: 2.5 },
          ].map((item, i) => (
            <span
              key={i}
              className="absolute text-[10px] font-mono tracking-widest text-[#00e5ff]/20 animate-float"
              style={{
                left: item.x,
                top: item.y,
                animationDelay: `${item.delay}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            >
              {item.text}
            </span>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`relative z-10 text-center px-6 w-full max-w-5xl mx-auto transition-all duration-[1500ms] ease-out ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
          }`}
      >
        {/* Status Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-light border border-[#00e5ff]/20 text-[11px] font-mono text-[#00e5ff] tracking-wide shadow-[0_0_15px_rgba(0,229,255,0.1)]">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff] animate-pulse" />
            WHAT-IF TIMELINE ENGINE ONLINE
          </div>
        </div>

        {/* Hero Headings */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
          <span className="text-white drop-shadow-md">History is written.</span>
          <br />
          <span className="text-gradient bg-clip-text text-transparent drop-shadow-lg">
            But what if you could change it?
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-16 leading-relaxed font-light">
          Powered by <strong className="text-[#00e5ff] font-medium">10,000 Monte Carlo Simulations</strong>. Choose your mode.
        </p>

        {/* Dual Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20 text-left">

          {/* Portal 1: The Time Machine */}
          <a href="/matches" className="group relative block rounded-3xl overflow-hidden glass-light p-8 border border-white/10 hover:border-[#00e5ff]/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,229,255,0.15)] cursor-pointer">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_top_right,rgba(0,229,255,0.1)_0%,transparent_60%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-left">
              <div className="w-12 h-12 rounded-xl glass-light flex items-center justify-center mb-6 border border-[#00e5ff]/20 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                ⏱️
              </div>
              <h2 className="text-2xl font-black text-white mb-2 group-hover:text-[#00e5ff] transition-colors drop-shadow-md">The Time Machine</h2>
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-6 font-medium">
                Select legendary cricket matches, pinpoint the exact turning point, swap out players, and intercept the timeline.
              </p>
              <span className="text-xs font-mono font-bold text-[#00e5ff] flex items-center gap-2">
                REWRITE HISTORY <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

          {/* Portal 2: The Arena */}
          <a href="/arena" className="group relative block rounded-3xl overflow-hidden glass-light p-8 border border-white/10 hover:border-[#ff3b5c]/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(255,59,92,0.15)] cursor-pointer">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_bottom_left,rgba(255,59,92,0.1)_0%,transparent_60%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-left">
              <div className="w-12 h-12 rounded-xl glass-light flex items-center justify-center mb-6 border border-[#ff3b5c]/20 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                ⚔️
              </div>
              <h2 className="text-2xl font-black text-white mb-2 group-hover:text-[#ff3b5c] transition-colors drop-shadow-md">The Arena</h2>
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-6 font-medium">
                A highly gamified multiplayer draft. Flip the coin, draft your 5v5 dream team in a snake draft, and let the AI battle it out.
              </p>
              <span className="text-xs font-mono font-bold text-[#ff3b5c] flex items-center gap-2">
                DRAFT BATTLE <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </a>

        </div>
      </main>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050a18] via-[#050a18]/80 to-transparent pointer-events-none" />
    </div>
  );
}
