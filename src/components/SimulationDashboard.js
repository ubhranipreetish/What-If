"use client";
import React, { useEffect, useState } from 'react';

export default function SimulationDashboard({ result }) {
    // Reveal state handles the staggered reveal of stats vs commentary
    const [reveal, setReveal] = useState('gauge'); // 'gauge' | 'stats' | 'commentary'

    useEffect(() => {
        setTimeout(() => setReveal('stats'), 1200);
        setTimeout(() => setReveal('commentary'), 2500);
    }, []);

    const winProbShift = result.newWinProb - result.originalWinProb;
    const isShiftPositive = winProbShift > 0;

    return (
        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group w-full">
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <p className="text-[#00ff88] text-[10px] font-mono font-bold tracking-[0.2em] mb-2 uppercase">Step 05</p>
                    <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                        Alternate Reality Dashboard
                    </h2>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-[#6b7280] font-mono tracking-widest uppercase block mb-1">MONTE CARLO SEED</span>
                    <div className="text-[#00ff88] font-mono text-[10px] font-bold bg-[#00ff88]/10 px-3 py-1 rounded inline-block border border-[#00ff88]/30">
                        {result.simulationCount.toLocaleString()} RUNS • O(1)
                    </div>
                </div>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* Section A: The Big Reveal (Win Prob Shift & Expected Outcomes) */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-2">1. The Big Reveal</h3>

                    <div className={`glass-light rounded-2xl p-6 border border-white/5 relative overflow-hidden transition-all duration-1000 ${reveal !== 'gauge' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {/* Gauge Visualizer */}
                        <div className="absolute top-0 right-0 p-4">
                            <span className="text-[10px] text-[#6b7280] tracking-widest font-mono">WP SHIFT</span>
                            <div className={`text-xl font-bold font-mono ${isShiftPositive ? 'text-[#00ff88]' : 'text-[#ff3b5c]'}`}>
                                {isShiftPositive ? '+' : ''}{winProbShift}%
                            </div>
                        </div>

                        <span className="text-xs text-[#6b7280] tracking-widest font-mono uppercase mb-4 block">New Target Probability</span>

                        <div className="flex items-end gap-2 text-white font-mono">
                            <span className="text-5xl font-black leading-none drop-shadow-md">{result.newWinProb}</span>
                            <span className="text-lg text-[#00e5ff] leading-none mb-1">%</span>
                        </div>

                        <p className="text-sm text-[#94a3b8] mt-4 leading-relaxed font-medium">
                            {result.battingTeam} Win Probability shifted from <span className="text-white font-bold">{result.originalWinProb}%</span> to <span className="text-[#00e5ff] font-bold">{result.newWinProb}%</span>.
                        </p>

                        {/* Progress Bar Gauge */}
                        <div className="w-full h-2 bg-white/5 rounded-full mt-6 overflow-hidden relative">
                            <div className="absolute left-0 top-0 h-full bg-[#334155]" style={{ width: `${result.originalWinProb}%` }} />
                            <div
                                className={`absolute left-0 top-0 h-full transition-all duration-[2000ms] ease-out shadow-[0_0_15px_currentColor] ${isShiftPositive ? 'bg-[#00e5ff]' : 'bg-[#ff3b5c]'}`}
                                style={{ width: reveal !== 'gauge' ? `${result.newWinProb}%` : `${result.originalWinProb}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#6b7280] font-mono mt-2">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-4 transition-all duration-1000 delay-300 ${reveal === 'commentary' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="glass-light rounded-xl p-5 border border-white/5">
                            <span className="text-[10px] text-[#6b7280] tracking-widest font-mono uppercase block mb-2">EXPECTED SCORE</span>
                            <span className="text-2xl font-bold text-white font-mono">{result.expectedScore}</span>
                            <span className="text-[10px] text-[#6b7280] tracking-widest font-mono uppercase block mt-2 pt-2 border-t border-white/5">
                                TARGET: {result.target}
                            </span>
                        </div>

                        <div className="glass-light rounded-xl p-5 border border-white/5 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.05)_0%,transparent_70%)]">
                            <span className="text-[10px] text-[#6b7280] tracking-widest font-mono uppercase block mb-2">95% CONFIDENCE INTERVAL</span>
                            <span className="text-xl font-bold text-[#a855f7] font-mono">{result.confidenceInterval.low} — {result.confidenceInterval.high}</span>
                            <span className="text-[10px] text-[#6b7280] tracking-widest font-mono uppercase block mt-2 pt-2 border-t border-white/5">
                                EXPECTED RUN RANGE
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section B: Alternate Timeline (Scrolling Feed) */}
                <div className="space-y-6 flex flex-col h-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#00e5ff] border-b border-[#00e5ff]/20 pb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse shadow-[0_0_8px_#00e5ff]" />
                        2. The Alternate Timeline
                    </h3>

                    <div className={`glass-light rounded-2xl flex-1 border border-white/5 overflow-hidden flex flex-col relative transition-all duration-1000 delay-500 ${reveal === 'commentary' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="bg-black/40 px-4 py-2 border-b border-white/5 flex justify-between items-center z-10">
                            <span className="text-[10px] text-[#6b7280] font-mono uppercase tracking-widest">LIVE M-5 FEED</span>
                            <span className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-widest">{result.batter.name} vs {result.bowler.name}</span>
                        </div>

                        {/* Feed Container */}
                        <div className="p-4 overflow-y-auto max-h-[400px] flex-col-reverse flex gap-3 pb-8">
                            {result.commentary.map((comm, idx) => (
                                <div key={idx} className="flex gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group/item">
                                    <div className="w-12 shrink-0 pt-0.5">
                                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${comm.type === 'wicket' ? 'bg-[#ff3b5c]/20 text-[#ff3b5c]' : comm.type === '6' || comm.type === '4' ? 'bg-[#00e5ff]/20 text-[#00e5ff]' : 'text-[#94a3b8]'}`}>
                                            {comm.ball}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm leading-relaxed" style={{ color: comm.color === '#6b7280' ? '#94a3b8' : comm.color }}>
                                            {comm.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom fade for scrolling effect */}
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--color-surface)] to-transparent pointer-events-none" />
                    </div>
                </div>

            </div>
        </div>
    );
}
