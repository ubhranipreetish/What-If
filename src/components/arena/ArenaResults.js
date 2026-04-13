"use client";
import { useEffect, useState } from "react";
import GlowButton from "@/components/GlowButton";

export default function ArenaResults({ results, p1, p2, t1Roster, t2Roster, onRestart }) {
    const [reveal, setReveal] = useState('winner'); // 'winner' | 'stats' | 'insight'

    useEffect(() => {
        setTimeout(() => setReveal('stats'), 1500);
        setTimeout(() => setReveal('insight'), 3000);
    }, []);

    const isT1Winner = results.winnerName === p1;
    const winColor = isT1Winner ? '#00e5ff' : '#ff3b5c';

    return (
        <div className="max-w-5xl mx-auto pt-10 px-4 pb-20">
            <div className="text-center mb-12">
                <p className="text-[#ffd700] text-[10px] font-mono font-bold tracking-[0.2em] mb-2 uppercase">RESULTS DECRYPTED</p>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    Arena Verdict
                </h1>
            </div>

            <div className="glass rounded-3xl p-8 lg:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-full h-[300px] pointer-events-none transition-opacity duration-1000 ${isT1Winner ? 'bg-[radial-gradient(ellipse_at_top,#00e5ff15_0%,transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_top,#ff3b5c15_0%,transparent_70%)]'}`} />

                {/* The Winner Reveal */}
                <div className="text-center mb-12 relative z-10 animate-scale-in">
                    <span className="text-xs font-mono text-white/50 tracking-widest uppercase block mb-4">THE ENGINE HAS SPOKEN</span>
                    <h2 className="text-5xl md:text-7xl font-black mb-4 drop-shadow-lg" style={{ color: winColor }}>
                        {results.winnerName} WINS
                    </h2>
                    <p className="text-xl text-[#e2e8f0] font-light">
                        Winning probability: <strong style={{ color: winColor }}>{results.winnerProb}%</strong>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Stats Panel */}
                    <div className={`transition-all duration-1000 ${reveal !== 'winner' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="glass-light rounded-2xl p-6 border border-white/5 h-full">
                            <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-6 flex items-center gap-2">
                                <span className="text-lg">📊</span> 5-Over Simulation
                            </h3>

                            <div className="space-y-6">
                                {/* Team 1 Expected Rec */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-bold text-[#00e5ff]">{p1}</span>
                                        <span className="text-2xl font-black text-white font-mono">{results.t1ExpectedRuns}</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#00e5ff]" style={{ width: `${results.t1WinProb}%` }} />
                                    </div>
                                    <span className="text-[10px] text-[#6b7280] font-mono mt-1 block">WIN PROB: {results.t1WinProb}%</span>
                                </div>

                                {/* Team 2 Expected Rec */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-bold text-[#ff3b5c]">{p2}</span>
                                        <span className="text-2xl font-black text-white font-mono">{results.t2ExpectedRuns}</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#ff3b5c]" style={{ width: `${results.t2WinProb}%` }} />
                                    </div>
                                    <span className="text-[10px] text-[#6b7280] font-mono mt-1 block">WIN PROB: {results.t2WinProb}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights & MVP */}
                    <div className={`transition-all duration-1000 delay-300 ${reveal === 'insight' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="glass-light rounded-2xl p-6 border border-white/5 h-full bg-[#050a18]/40">
                            <h3 className="text-xs font-mono font-bold text-[#ffd700] tracking-widest uppercase mb-6 flex items-center gap-2">
                                <span className="text-lg">🧠</span> Engine Analytics
                            </h3>

                            <div className="mb-6">
                                <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block mb-1">
                                    MATCH MVP
                                </span>
                                <span className="text-xl font-bold text-white">
                                    {results.mvp}
                                </span>
                            </div>

                            <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                                <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block mb-2">
                                    THE DECIDING FACTOR
                                </span>
                                <p className="text-sm text-[#e2e8f0] leading-relaxed italic border-l-2 pl-3 py-1" style={{ borderColor: winColor }}>
                                    "{results.keyMatchup.reason}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className={`mt-12 text-center transition-all duration-1000 delay-700 ${reveal === 'insight' ? 'opacity-100' : 'opacity-0'}`}>
                    <GlowButton onClick={onRestart} className="px-12 py-4 text-sm font-bold shadow-lg">
                        DRAFT ANOTHER BATTLE
                    </GlowButton>
                    <div className="mt-6">
                        <a href="/" className="text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#00e5ff] transition-colors border border-transparent hover:border-[#00e5ff]/30 px-4 py-2 rounded-full">
                            ← BACK TO HUB
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
