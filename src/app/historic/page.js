"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ICONIC_MOMENTS from "../lib/iconicMoments";

export default function HistoricPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[#02050c] font-sans text-[#e2e8f0]">

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">

        {/* Header */}
        <div className="text-center mb-10 md:mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,229,255,0.05)_0%,transparent_70%)] pointer-events-none" />
          <p className="text-[#00e5ff] text-[8px] md:text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-3 md:mb-4 opacity-80">
            The Time Machine
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-4 md:mb-6 tracking-tighter drop-shadow-2xl">
            Historic What-Ifs
          </h1>
          <p className="text-[#94a3b8] max-w-2xl mx-auto text-sm md:text-lg font-light leading-relaxed">
            The most controversial, iconic, and game-changing moments in IPL history. Pick one and rewrite the outcome.
          </p>
        </div>

        {/* All 12 Iconic Moment Cards — 3 per row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-16 md:mb-20">
          {ICONIC_MOMENTS.map((moment, i) => (
            <Link
              key={moment.id}
              href={`/simulation/${moment.id}?over=${moment.over}&ball=${moment.ball}&inn=${moment.innings}`}
              className={`group relative flex flex-row bg-[#050a18] rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_16px_56px_rgba(0,0,0,0.6)] overflow-hidden ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 40}ms`, transitionDuration: "700ms" }}
            >
              {/* Left color accent bar */}
              <div className="w-1 md:w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: moment.color }} />

              {/* Card content */}
              <div className="flex-1 p-5 md:p-6 flex flex-col gap-2.5 md:gap-3 relative overflow-hidden">
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(circle at 0% 0%, ${moment.color}10, transparent 60%)` }} />

                {/* Row 1: Tag */}
                <div className="relative z-10">
                  <span className="text-[7px] md:text-[8px] font-mono font-bold tracking-[0.15em] uppercase px-2 py-0.5 md:px-2.5 md:py-1 rounded border" style={{ color: moment.color, borderColor: `${moment.color}30`, backgroundColor: `${moment.color}08` }}>
                    {moment.tag}
                  </span>
                </div>

                {/* Row 2: Title + Subtitle */}
                <div className="relative z-10">
                  <h3 className="text-sm md:text-base font-black text-white leading-snug tracking-tight">{moment.title}</h3>
                  <p className="text-[10px] md:text-[11px] font-medium text-[#6b7280] mt-0.5 md:mt-1 italic">{moment.subtitle}</p>
                </div>

                {/* Row 3: Description */}
                <p className="text-[11px] md:text-[12px] text-[#94a3b8] leading-relaxed group-hover:text-[#c4cad6] transition-colors relative z-10 line-clamp-3">
                  {moment.desc}
                </p>

                {/* Row 4: CTA */}
                <div className="flex items-center justify-end mt-auto pt-2 md:pt-3 border-t border-white/[0.04] relative z-10">
                  <span className="text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider md:opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center gap-1 md:gap-1.5" style={{ color: moment.color }}>
                    Simulate
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA: Can't find your match? */}
        <div className="text-center mb-10 md:mb-16">
          <div className="bg-[#050a18] rounded-2xl md:rounded-3xl border border-white/5 p-8 md:p-12 max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/[0.03] to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl font-black text-white mb-2 md:mb-3 tracking-tight">Can't find your match?</h3>
              <p className="text-[#94a3b8] mb-6 md:mb-8 text-xs md:text-sm leading-relaxed">
                Browse every IPL match from 2008 to 2025. Select any season, any team, any ball — and rewrite history your way.
              </p>
              <Link
                href="/matches"
                className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-3.5 rounded-xl bg-[#00e5ff] text-[#050a18] font-black text-xs md:text-sm uppercase tracking-wider hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Browse All Matches
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
