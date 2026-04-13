"use client";

export default function TimelineSlider({ timeline, onChange, value, score, target, striker, nonStriker, bowler }) {
    // Determine min/max over from timeline
    const minOver = timeline[0]?.over || 0;
    const maxOver = timeline[timeline.length - 1]?.over || 20;

    return (
        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Background glow tied to the slider value roughly */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse,rgba(0,229,255,0.02)_0%,transparent_70%)] pointer-events-none group-hover:bg-[radial-gradient(ellipse,rgba(0,229,255,0.05)_0%,transparent_70%)] transition-colors duration-700" />

            <div className="relative z-10">
                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                    <div>
                        <p className="text-[#00e5ff] text-[10px] font-mono font-bold tracking-[0.2em] mb-2 uppercase">Step 02</p>
                        <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                            Pinpoint Timeline
                        </h2>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-[#6b7280] font-mono tracking-widest uppercase block mb-1">INTERVENTION POINT</span>
                        <div className="text-[#00ff88] font-mono text-xl font-bold bg-[#00ff88]/10 px-3 py-1 rounded inline-block border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.1)]">
                            OVER {value}
                        </div>
                    </div>
                </div>

                {/* Simulated Graph Area */}
                <div className="relative h-24 mb-6 flex items-end justify-between px-2 gap-1">
                    {/* Render timeline bars based on Win Probability */}
                    {timeline.map((point, i) => {
                        const height = `${Math.max(10, point.winProb)}%`;
                        const isSelected = Math.abs(parseFloat(value) - point.over) < 0.5;

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 relative">
                                <div className="w-full relative flex items-end justify-center h-full group-hover:opacity-80 transition-opacity">
                                    <div
                                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${isSelected ? 'bg-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.6)]' : 'bg-white/10 hover:bg-white/20'}`}
                                        style={{ height }}
                                    />
                                </div>
                                <span className={`text-[9px] font-mono ${isSelected ? 'text-[#00e5ff]' : 'text-[#6b7280]'}`}>{point.over}</span>
                            </div>
                        )
                    })}
                </div>

                {/* Actual Range Slider */}
                <div className="relative mb-8">
                    <input
                        type="range"
                        min={minOver}
                        max={maxOver}
                        step="0.1"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00e5ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(0,229,255,0.8)]
                            "
                    />
                </div>

                {/* Freeze Frame Data */}
                <div className="glass-light rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(255,59,92,0.1)_0%,transparent_70%)] pointer-events-none" />

                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-[#ff3b5c] animate-pulse shadow-[0_0_8px_#ff3b5c]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff3b5c]">
                            Timeline Freeze Frame
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">SCORE</span>
                            <span className="text-xl font-mono text-white font-bold">{score}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">TARGET</span>
                            <span className="text-xl font-mono text-white font-bold">{target}</span>
                        </div>
                        <div className="md:col-span-2">
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">CURRENT PLAYERS</span>
                            <div className="text-sm text-[#e2e8f0] font-medium leading-relaxed">
                                <span className="text-[#00e5ff]">Batting:</span> {striker} & {nonStriker} <br />
                                <span className="text-[#ff6b35]">Bowling:</span> {bowler}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
