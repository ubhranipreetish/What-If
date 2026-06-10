"use client";
import { useState } from "react";
import GlowButton from "@/components/GlowButton";

export default function ArenaLineups({ p1, p2, t1Roster, t2Roster, onLineupsComplete }) {
    const [tossWinner, setTossWinner] = useState(null);
    const [tossDecision, setTossDecision] = useState(null); // 'bat' | 'bowl'
    const [phase, setPhase] = useState("toss"); // 'toss' | 'decision' | 'lineups'
    const [activeMobileTab, setActiveMobileTab] = useState('t1'); // 't1' | 't2'
    
    // Sort default batting order (Batters -> WK -> AR -> Bowlers)
    const sortBatting = (roster) => {
        const order = { 'batter': 1, 'wk': 2, 'allrounder': 3, 'bowler': 4 };
        return [...roster].sort((a, b) => order[a.type] - order[b.type]);
    };

    // Sort default bowling order (Bowlers -> AR)
    const sortBowling = (roster) => {
        return [...roster].filter(p => p.type === 'bowler' || p.type === 'allrounder')
            .sort((a, b) => {
                if (a.type === 'bowler' && b.type !== 'bowler') return -1;
                if (b.type === 'bowler' && a.type !== 'bowler') return 1;
                return a.economy - b.economy;
            });
    };

    const [t1BatOrder, setT1BatOrder] = useState(sortBatting(t1Roster));
    const [t2BatOrder, setT2BatOrder] = useState(sortBatting(t2Roster));
    const [t1BowlOrder, setT1BowlOrder] = useState(sortBowling(t1Roster));
    const [t2BowlOrder, setT2BowlOrder] = useState(sortBowling(t2Roster));

    const handleToss = () => {
        setPhase("toss_anim");
        setTimeout(() => {
            const winner = Math.random() > 0.5 ? 1 : 2;
            setTossWinner(winner);
            setPhase("decision");
        }, 1500);
    };

    const handleDecision = (decision) => {
        setTossDecision(decision);
        setPhase("lineups");
    };

    const movePlayer = (type, team, index, direction) => {
        const arr = type === 'bat' 
            ? (team === 1 ? t1BatOrder : t2BatOrder)
            : (team === 1 ? t1BowlOrder : t2BowlOrder);
            
        if (index + direction < 0 || index + direction >= arr.length) return;
        
        const newArr = [...arr];
        [newArr[index], newArr[index + direction]] = [newArr[index + direction], newArr[index]];
        
        if (type === 'bat') {
            if (team === 1) setT1BatOrder(newArr);
            else setT2BatOrder(newArr);
        } else {
            if (team === 1) setT1BowlOrder(newArr);
            else setT2BowlOrder(newArr);
        }
    };

    const handleComplete = () => {
        onLineupsComplete({
            tossWinner, tossDecision,
            t1BattingOrder: t1BatOrder,
            t2BattingOrder: t2BatOrder,
            t1BowlingOrder: t1BowlOrder,
            t2BowlingOrder: t2BowlOrder
        });
    };

    if (phase === "toss" || phase === "toss_anim") {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-4xl font-black text-white mb-8">THE COIN TOSS</h2>
                {phase === "toss" ? (
                    <GlowButton onClick={handleToss} className="bg-[#ffd700] !text-black px-12 py-6 text-xl">FLIP COIN</GlowButton>
                ) : (
                    <div className="w-32 h-32 rounded-full bg-[#ffd700] animate-bounce flex items-center justify-center text-black font-black text-2xl shadow-[0_0_50px_#ffd700]">
                        FLIPPING...
                    </div>
                )}
            </div>
        );
    }

    if (phase === "decision") {
        const winnerName = tossWinner === 1 ? p1 : p2;
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-4xl font-black text-[#00ff88] mb-4">{winnerName} WINS THE TOSS</h2>
                <p className="text-[#94a3b8] font-mono mb-8 uppercase tracking-widest">What will you choose?</p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-2">
                    <button onClick={() => handleDecision('bat')} className="flex-1 px-6 sm:px-10 py-5 rounded-2xl glass border border-white/10 hover:border-[#00e5ff] hover:bg-[#00e5ff]/10 active:scale-[0.98] text-white font-black text-lg sm:text-xl transition-all">BAT FIRST</button>
                    <button onClick={() => handleDecision('bowl')} className="flex-1 px-6 sm:px-10 py-5 rounded-2xl glass border border-white/10 hover:border-[#ff3b5c] hover:bg-[#ff3b5c]/10 active:scale-[0.98] text-white font-black text-lg sm:text-xl transition-all">BOWL FIRST</button>
                </div>
            </div>
        );
    }

    const t1IsBattingFirst = (tossWinner === 1 && tossDecision === 'bat') || (tossWinner === 2 && tossDecision === 'bowl');

    const TeamLineup = ({ name, batOrder, bowlOrder, teamId, isBattingFirst }) => (
        <div className="glass p-4 sm:p-6 rounded-3xl border border-white/5 flex-1 max-h-[75vh] flex flex-col overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-black text-white truncate">{name}'S XI</h3>
            <p className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase mb-4 border-b border-white/10 pb-2" style={{ color: teamId === 1 ? '#00e5ff' : '#ff3b5c' }}>
                {isBattingFirst ? 'Batting First' : 'Bowling First'}
            </p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Batting Order */}
                <div>
                    <h4 className="text-xs font-black text-white mb-2 uppercase tracking-widest">Batting Lineup</h4>
                    <div className="space-y-1.5">
                        {batOrder.map((p, i) => (
                            <div key={`bat-${p.id}`} className="flex items-center gap-2 glass p-2 rounded-lg border border-white/5 bg-black/20">
                                <span className="w-5 text-center font-mono text-[9px] text-[#6b7280]">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-xs truncate">{p.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => movePlayer('bat', teamId, i, -1)} disabled={i === 0} aria-label="Move up" className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-[11px] disabled:opacity-30 active:scale-90 transition-transform">▲</button>
                                    <button onClick={() => movePlayer('bat', teamId, i, 1)} disabled={i === batOrder.length - 1} aria-label="Move down" className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-[11px] disabled:opacity-30 active:scale-90 transition-transform">▼</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bowling Priority */}
                <div>
                    <h4 className="text-xs font-black text-white mb-2 uppercase tracking-widest">Bowling Priority</h4>
                    <p className="text-[9px] font-mono text-[#6b7280] mb-2">Order in which bowlers will be utilized by AI.</p>
                    <div className="space-y-1.5">
                        {bowlOrder.map((p, i) => (
                            <div key={`bowl-${p.id}`} className="flex items-center gap-2 glass p-2 rounded-lg border border-white/5 bg-black/20">
                                <span className="w-5 text-center font-mono text-[9px] text-[#6b7280]">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-xs truncate">{p.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => movePlayer('bowl', teamId, i, -1)} disabled={i === 0} aria-label="Move up" className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-[11px] disabled:opacity-30 active:scale-90 transition-transform">▲</button>
                                    <button onClick={() => movePlayer('bowl', teamId, i, 1)} disabled={i === bowlOrder.length - 1} aria-label="Move down" className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-[11px] disabled:opacity-30 active:scale-90 transition-transform">▼</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 pb-28 lg:pb-8 flex flex-col min-h-[100dvh] lg:h-[calc(100dvh-80px)]">
            <div className="text-center mb-6 shrink-0">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">SET YOUR LINEUPS</h2>
                <p className="text-[#94a3b8] font-mono text-[10px] md:text-xs mt-2">Adjust batting orders and bowling priorities before simulation begins.</p>
            </div>

            {/* Mobile Tab Selector */}
            <div className="flex lg:hidden px-2 mb-4 shrink-0 gap-2">
                <button
                    onClick={() => setActiveMobileTab('t1')}
                    className={`flex-1 min-w-0 truncate py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        activeMobileTab === 't1'
                            ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                            : 'bg-white/5 border-transparent text-[#94a3b8]'
                    }`}
                >
                    {p1}'s Lineup
                </button>
                <button
                    onClick={() => setActiveMobileTab('t2')}
                    className={`flex-1 min-w-0 truncate py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        activeMobileTab === 't2'
                            ? 'bg-[#ff3b5c]/10 border-[#ff3b5c]/40 text-[#ff3b5c] shadow-[0_0_15px_rgba(255,59,92,0.1)]'
                            : 'bg-white/5 border-transparent text-[#94a3b8]'
                    }`}
                >
                    {p2}'s Lineup
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0">
                <div className={`flex-1 flex flex-col lg:flex ${activeMobileTab === 't1' ? 'flex' : 'hidden'}`}>
                    <TeamLineup name={p1} batOrder={t1BatOrder} bowlOrder={t1BowlOrder} teamId={1} isBattingFirst={t1IsBattingFirst} />
                </div>
                <div className={`flex-1 flex flex-col lg:flex ${activeMobileTab === 't2' ? 'flex' : 'hidden'}`}>
                    <TeamLineup name={p2} batOrder={t2BatOrder} bowlOrder={t2BowlOrder} teamId={2} isBattingFirst={!t1IsBattingFirst} />
                </div>
            </div>

            {/* Sticky Bottom Simulate Button for Mobile, Static for Desktop */}
            <div className="fixed bottom-0 left-0 right-0 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[#050a18]/95 backdrop-blur-md border-t border-white/10 z-40 flex justify-center lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:mt-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none">
                <GlowButton onClick={handleComplete} className="bg-[#00ff88] !text-black w-full lg:w-auto px-8 lg:px-12 py-3 lg:py-4 text-sm lg:text-lg">
                    LOCK LINEUPS & SIMULATE
                </GlowButton>
            </div>
        </div>
    );
}
