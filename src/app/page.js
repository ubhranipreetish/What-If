"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#02050c]">
      {/* Ambient radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,59,92,0.03)_0%,transparent_60%)] pointer-events-none" />

      {/* Floating tech fragments */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
          {[
            { text: "BAYESIAN NETWORKS", x: "15%", y: "25%", delay: 0 },
            { text: "O(1) MEMORY", x: "78%", y: "18%", delay: 0.5 },
            { text: "PREDICTIVE ANALYTICS", x: "82%", y: "70%", delay: 1 },
            { text: "DYNAMIC ROUTING", x: "10%", y: "75%", delay: 1.5 },
            { text: "BALL-BY-BALL", x: "65%", y: "82%", delay: 2 },
            { text: "WIN PROB %", x: "28%", y: "85%", delay: 2.5 },
          ].map((item, i) => (
            <span
              key={i}
              className="absolute text-[9px] font-mono tracking-[0.3em] text-[#00e5ff]/20 animate-float uppercase"
              style={{
                left: item.x,
                top: item.y,
                animationDelay: `${item.delay}s`,
                animationDuration: `${4 + i * 0.5}s`,
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
        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#050a18]/80 border border-white/5 backdrop-blur-md text-[10px] font-mono text-[#00e5ff] tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,229,255,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff] animate-pulse" />
            What-If Timeline Engine Online
          </div>
        </div>

        {/* Hero Headings */}
        <h1 className="text-5xl sm:text-7xl md:text-[80px] font-black tracking-tighter leading-[1.05] mb-8">
          <span className="text-white">History is written.</span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00e5ff] via-[#a855f7] to-[#ff3b5c]">
            But what if you could change it?
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-20 leading-relaxed font-light tracking-wide">
          Powered by a state of the art predictive simulation engine. Explore alternate timelines or draft the ultimate team in the arena. Choose your interface.
        </p>

        {/* Dual Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">

          {/* Portal 1: The Time Machine */}
          <a href="/matches" className="group relative block rounded-[32px] overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent p-[1px] cursor-pointer hover:shadow-[0_0_80px_rgba(0,229,255,0.15)] transition-all duration-700 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-[#050a18] rounded-[31px] p-10 h-full overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_top_right,rgba(0,229,255,0.1)_0%,transparent_70%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8 group-hover:border-[#00e5ff]/30 group-hover:bg-[#00e5ff]/5 transition-all duration-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#00e5ff] group-hover:scale-110 transition-transform duration-500">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                    <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-white mb-4 group-hover:text-[#00e5ff] transition-colors duration-500 tracking-tight">The Time Machine</h2>
                <p className="text-[#94a3b8] leading-relaxed mb-10 font-light text-lg">
                  Select legendary matches, pinpoint the exact turning point, override reality, and simulate the butterfly effect.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-6 mt-auto">
                <span className="text-[11px] font-mono font-bold text-[#00e5ff] tracking-[0.2em] uppercase">
                  Rewrite History
                </span>
                <span className="w-8 h-8 rounded-full bg-[#00e5ff]/10 flex items-center justify-center text-[#00e5ff] group-hover:bg-[#00e5ff] group-hover:text-[#050a18] transition-all duration-500 transform group-hover:translate-x-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </div>
          </a>

          {/* Portal 2: The Arena */}
          <a href="/arena" className="group relative block rounded-[32px] overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent p-[1px] cursor-pointer hover:shadow-[0_0_80px_rgba(255,59,92,0.15)] transition-all duration-700 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-bl from-[#ff3b5c]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-[#050a18] rounded-[31px] p-10 h-full overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_bottom_left,rgba(255,59,92,0.1)_0%,transparent_70%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8 group-hover:border-[#ff3b5c]/30 group-hover:bg-[#ff3b5c]/5 transition-all duration-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff3b5c] group-hover:scale-110 transition-transform duration-500">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-white mb-4 group-hover:text-[#ff3b5c] transition-colors duration-500 tracking-tight">The Arena</h2>
                <p className="text-[#94a3b8] leading-relaxed mb-10 font-light text-lg">
                  Draft your 11-a-side dream team from cricket's greatest legends, set your lineups, and watch the AI simulate a full T20 match ball-by-ball.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-6 mt-auto">
                <span className="text-[11px] font-mono font-bold text-[#ff3b5c] tracking-[0.2em] uppercase">
                  Draft Battle
                </span>
                <span className="w-8 h-8 rounded-full bg-[#ff3b5c]/10 flex items-center justify-center text-[#ff3b5c] group-hover:bg-[#ff3b5c] group-hover:text-[#050a18] transition-all duration-500 transform group-hover:translate-x-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </div>
          </a>

        </div>
      </main>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#02050c] via-[#02050c]/80 to-transparent pointer-events-none" />
    </div>
  );
}
