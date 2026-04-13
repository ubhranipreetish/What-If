"use client";
import { useState } from "react";
import GlowButton from "@/components/GlowButton";

export default function ArenaSetup({ onComplete }) {
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [flipping, setFlipping] = useState(false);
    const [winner, setWinner] = useState(null);

    const handleFlip = () => {
        if (!p1 || !p2) return;
        setFlipping(true);
        setTimeout(() => {
            const isP1 = Math.random() > 0.5;
            setWinner(isP1 ? p1 : p2);
            setFlipping(false);
        }, 2000); // 2 second flip animation
    };

    const handleContinue = () => {
        onComplete({ p1, p2, firstPick: winner });
    };

    return (
        <div className="max-w-xl mx-auto pt-10 px-4">
            <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">
                    THE ARENA
                </h1>
                <p className="text-[#94a3b8] font-mono text-xs uppercase tracking-widest">
                    INITIALIZE DRAFT SEQUENCE
                </p>
            </div>

            <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(255,59,92,0.1)_0%,transparent_60%)] pointer-events-none" />

                {!winner && !flipping && (
                    <div className="space-y-6 relative z-10 animate-fade-in">
                        <div>
                            <label className="block text-[10px] font-mono font-bold text-[#00e5ff] tracking-widest uppercase mb-2">
                                PLAYER 1 ALIAS
                            </label>
                            <input
                                type="text"
                                value={p1}
                                onChange={e => setP1(e.target.value)}
                                className="w-full bg-[#050a18]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00e5ff] transition-colors"
                                placeholder="Enter name..."
                                maxLength={15}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-mono font-bold text-[#ff3b5c] tracking-widest uppercase mb-2">
                                PLAYER 2 ALIAS
                            </label>
                            <input
                                type="text"
                                value={p2}
                                onChange={e => setP2(e.target.value)}
                                className="w-full bg-[#050a18]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff3b5c] transition-colors"
                                placeholder="Enter name..."
                                maxLength={15}
                            />
                        </div>

                        <div className="pt-6 border-t border-white/5 text-center">
                            <button
                                onClick={handleFlip}
                                disabled={!p1 || !p2}
                                className={`px-8 py-3 rounded-xl font-bold transition-all ${(!p1 || !p2) ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-[#ffd700] text-[#050a18] shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105'}`}
                            >
                                FLIP COIN FOR FIRST PICK
                            </button>
                        </div>
                    </div>
                )}

                {flipping && (
                    <div className="py-12 flex flex-col items-center justify-center animate-fade-in">
                        {/* 3D Coin CSS trick */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] shadow-[0_0_30px_rgba(255,215,0,0.5)] flex items-center justify-center animate-spin" style={{ animationDuration: "0.4s", animationTimingFunction: "linear" }}>
                            <div className="w-20 h-20 rounded-full border-2 border-[#fff] opacity-50 flex items-center justify-center">
                                <span className="font-black text-2xl text-white opacity-80">?</span>
                            </div>
                        </div>
                        <p className="mt-8 text-sm font-mono text-[#94a3b8] animate-pulse">Determining advantage...</p>
                    </div>
                )}

                {winner && !flipping && (
                    <div className="py-8 text-center animate-fade-in">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] shadow-[0_0_40px_rgba(255,215,0,0.6)] flex items-center justify-center mb-6">
                            <span className="font-black text-3xl text-white">{winner.charAt(0).toUpperCase()}</span>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2">
                            {winner} Wins!
                        </h2>
                        <p className="text-[#a855f7] font-mono text-sm tracking-widest uppercase mb-8">
                            Gets Draft Pick #1
                        </p>

                        <GlowButton onClick={handleContinue} className="w-full">
                            ENTER THE DRAFT
                        </GlowButton>
                    </div>
                )}

            </div>
        </div>
    );
}
