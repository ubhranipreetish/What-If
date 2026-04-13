"use client";

export default function CommandCenter({
    match,
    selectedBatter, setSelectedBatter,
    selectedBowler, setSelectedBowler,
    customEvent, setCustomEvent
}) {
    return (
        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl mt-8">
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <p className="text-[#a855f7] text-[10px] font-mono font-bold tracking-[0.2em] mb-2 uppercase">Step 03</p>
                    <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                        Command Center
                    </h2>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-[#6b7280] font-mono tracking-widest uppercase block mb-1">INTERVENTION</span>
                    <div className="text-[#a855f7] font-mono text-[10px] font-bold bg-[#a855f7]/10 px-3 py-1 rounded inline-block border border-[#a855f7]/30">
                        AWAITING TACTICS
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Tactical Swap: Batter */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🏏</span>
                        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#00e5ff]">Send Next Batter</h3>
                    </div>
                    <div className="space-y-2">
                        {match.batters.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBatter(b.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 cursor-pointer flex justify-between items-center ${selectedBatter === b.id
                                        ? "bg-[#00e5ff] text-[#050a18] shadow-[0_0_20px_rgba(0,229,255,0.2)]"
                                        : "glass-light hover:bg-white/5 border border-white/5"
                                    }`}
                            >
                                <div>
                                    <span className={`text-sm font-bold ${selectedBatter === b.id ? 'text-[#050a18]' : 'text-white'}`}>{b.name}</span>
                                    <span className={`block text-[10px] mt-1 ${selectedBatter === b.id ? 'text-[#050a18]/70' : 'text-[#6b7280]'}`}>
                                        {b.role} • {b.style}
                                    </span>
                                </div>
                                <div className={`text-[10px] font-mono text-right ${selectedBatter === b.id ? 'text-[#050a18]/80' : 'text-[#94a3b8]'}`}>
                                    SR {b.avgSR} <br /> AVG {b.avg}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tactical Swap: Bowler */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🎯</span>
                        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#ff6b35]">Change Bowler TO</h3>
                    </div>
                    <div className="space-y-2">
                        {match.bowlers.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBowler(b.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 cursor-pointer flex justify-between items-center ${selectedBowler === b.id
                                        ? "bg-[#ff6b35] text-[#050a18] shadow-[0_0_20px_rgba(255,107,53,0.2)]"
                                        : "glass-light hover:bg-white/5 border border-white/5"
                                    }`}
                            >
                                <div>
                                    <span className={`text-sm font-bold ${selectedBowler === b.id ? 'text-[#050a18]' : 'text-white'}`}>{b.name}</span>
                                    <span className={`block text-[10px] mt-1 ${selectedBowler === b.id ? 'text-[#050a18]/70' : 'text-[#6b7280]'}`}>
                                        {b.role}
                                    </span>
                                </div>
                                <div className={`text-[10px] font-mono text-right ${selectedBowler === b.id ? 'text-[#050a18]/80' : 'text-[#94a3b8]'}`}>
                                    ECON {b.economy} <br /> WKTS {b.wicketsPerMatch}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Micro-Event Override */}
            <div className="pt-6 border-t border-white/10">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                    <span className="text-lg">⚡</span> Micro-Event Override
                </h3>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setCustomEvent(customEvent === '6' ? null : '6')}
                        className={`px-5 py-3 rounded-xl border text-sm font-bold transition-all ${customEvent === '6' ? 'bg-[#ffd700] text-[#050a18] border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'glass-light border-white/10 text-white hover:border-[#ffd700]/50'
                            }`}
                    >
                        Force SIX on next ball
                    </button>

                    <button
                        onClick={() => setCustomEvent(customEvent === 'wicket' ? null : 'wicket')}
                        className={`px-5 py-3 rounded-xl border text-sm font-bold transition-all ${customEvent === 'wicket' ? 'bg-[#ff3b5c] text-white border-[#ff3b5c] shadow-[0_0_15px_rgba(255,59,92,0.3)]' : 'glass-light border-white/10 text-white hover:border-[#ff3b5c]/50'
                            }`}
                    >
                        Force WICKET on next ball
                    </button>
                </div>
            </div>

        </div>
    );
}
