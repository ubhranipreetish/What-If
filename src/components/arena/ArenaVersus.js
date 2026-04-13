"use client";
import GlowButton from "@/components/GlowButton";

export default function ArenaVersus({ p1, p2, t1Roster, t2Roster, onStartSimulation }) {

    const TeamDisplay = ({ name, roster, isT1 }) => (
        <div className={`flex flex-col ${isT1 ? 'items-end text-right' : 'items-start text-left'}`}>
            <h2 className={`text-4xl sm:text-5xl font-black mb-1 ${isT1 ? 'text-[#00e5ff]' : 'text-[#ff3b5c]'} drop-shadow-md`}>
                {name}'S FIVE
            </h2>
            <p className="text-white/50 text-[10px] font-mono tracking-widest uppercase mb-8">
                Locked & Loaded
            </p>

            <div className="flex flex-col gap-3 w-full max-w-sm">
                {roster.map((p, i) => (
                    <div
                        key={p.id}
                        className={`glass p-4 rounded-xl flex items-center gap-4 animate-slide-up bg-opacity-40 border border-white/5`}
                        style={{ animationDelay: `${i * 150}ms`, animationFillMode: "forwards", opacity: 0 }}
                    >
                        {isT1 ? (
                            <>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-lg">{p.name}</p>
                                    <p className="text-[#00e5ff] text-xs font-mono">{p.role}</p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-[#00e5ff]/10 flex items-center justify-center font-black text-[#00e5ff]">
                                    ${p.cost}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center font-black text-[#ff3b5c]">
                                    ${p.cost}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-lg">{p.name}</p>
                                    <p className="text-[#ff3b5c] text-xs font-mono">{p.role}</p>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
            {/* Background clash colors */}
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-[radial-gradient(circle_at_left,rgba(0,229,255,0.05)_0%,transparent_80%)] pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(255,59,92,0.05)_0%,transparent_80%)] pointer-events-none" />

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-7 items-center gap-8 relative z-10">
                {/* Team 1 */}
                <div className="md:col-span-3">
                    <TeamDisplay name={p1} roster={t1Roster} isT1={true} />
                </div>

                {/* VS Center */}
                <div className="md:col-span-1 flex flex-col items-center justify-center animate-scale-in" style={{ animationDelay: '1000ms', opacity: 0, animationFillMode: "forwards" }}>
                    <div className="w-20 h-20 rounded-full glass-light flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/20 mb-12">
                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 italic">
                            VS
                        </span>
                    </div>

                    <GlowButton onClick={onStartSimulation} className="!px-8 !py-5 bg-[#ffd700] hover:bg-[#ffed4a] !text-[#050a18] shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_60px_rgba(255,215,0,0.5)] whitespace-nowrap">
                        <span className="flex items-center gap-3 font-black tracking-widest uppercase">
                            LET THE AI DECIDE <span className="text-xl animate-pulse">⚡</span>
                        </span>
                    </GlowButton>
                    <p className="text-[10px] text-[#94a3b8] font-mono mt-4 uppercase tracking-widest text-center">
                        Initializing<br />5-Over Engine
                    </p>
                </div>

                {/* Team 2 */}
                <div className="md:col-span-3">
                    <TeamDisplay name={p2} roster={t2Roster} isT1={false} />
                </div>
            </div>
        </div>
    );
}
