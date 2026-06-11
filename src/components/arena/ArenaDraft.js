"use client";
import { useState, useRef } from "react";
import { arenaPlayerPool } from "@/data/arenaPlayers";

export default function ArenaDraft({ p1, p2, firstPick, onDraftComplete }) {
    const isP1First = firstPick === p1;

    // Snake draft order for 22 picks total.
    // 1, 2, 2, 1, 1, 2, 2, 1...
    const snakeOrder = Array.from({ length: 22 }, (_, i) => {
        const r = i % 4;
        const pickFirst = (r === 0 || r === 3);
        if (isP1First) return pickFirst ? 1 : 2;
        else return pickFirst ? 2 : 1;
    });

    const [currentPickIndex, setCurrentPickIndex] = useState(0);
    const [t1Roster, setT1Roster] = useState([]);
    const [t2Roster, setT2Roster] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [activeMobileTab, setActiveMobileTab] = useState('pool'); // 'pool' | 'p1' | 'p2'

    // Inline, auto-dismissing validation message (replaces blocking window.alert).
    const [toast, setToast] = useState("");
    const toastTimer = useRef(null);
    const showToast = (msg) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(""), 4500);
    };

    const activeTeamId = snakeOrder[currentPickIndex];
    const activePlayerName = activeTeamId === 1 ? p1 : p2;
    const isDraftComplete = currentPickIndex >= 22;

    const canPick = (player, roster) => {
        const counts = { batter: 0, wk: 0, allrounder: 0, bowler: 0 };
        roster.forEach(p => counts[p.type]++);
        
        counts[player.type]++;
        const remainingPicks = 11 - roster.length - 1;

        const reqBat = Math.max(0, 3 - counts.batter);
        const reqWk = Math.max(0, 1 - counts.wk);
        const reqBowl = Math.max(0, 3 - counts.bowler);
        const reqAr = Math.max(0, 1 - counts.allrounder);

        const currentBowlOptions = counts.bowler + counts.allrounder;
        const neededBowlOptions = Math.max(0, 5 - currentBowlOptions);
        
        const minSlotsForBowlAr = Math.max(neededBowlOptions, reqBowl + reqAr);
        const minSlotsForBatWk = reqBat + reqWk;

        return (minSlotsForBowlAr + minSlotsForBatWk) <= remainingPicks;
    };

    const availablePlayers = arenaPlayerPool.filter(p => {
        const isDrafted = t1Roster.find(t => t.id === p.id) || t2Roster.find(t => t.id === p.id);
        if (isDrafted) return false;

        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.type === filter;
        return matchSearch && matchFilter;
    });

    const activeRoster = activeTeamId === 1 ? t1Roster : t2Roster;

    const handleDraftPlayer = (player) => {
        if (isDraftComplete) return;

        if (!canPick(player, activeRoster)) {
            showToast(`Can't pick ${player.name} yet — you'd be left without room for a legal XI (need 3 BAT, 1 WK, 1 AR, 3 BOWL, and 5 bowling options total).`);
            return;
        }

        if (activeTeamId === 1) {
            setT1Roster(prev => [...prev, player]);
        } else {
            setT2Roster(prev => [...prev, player]);
        }

        if (currentPickIndex === 21) {
            setTimeout(() => onDraftComplete(
                activeTeamId === 1 ? [...t1Roster, player] : t1Roster,
                activeTeamId === 2 ? [...t2Roster, player] : t2Roster
            ), 1000);
        }
        setCurrentPickIndex(prev => prev + 1);
    };

    // Undo the most recent pick so a misclick doesn't derail the whole draft.
    const handleUndo = () => {
        if (currentPickIndex === 0 || currentPickIndex >= 22) return;
        const lastTeam = snakeOrder[currentPickIndex - 1];
        if (lastTeam === 1) setT1Roster(prev => prev.slice(0, -1));
        else setT2Roster(prev => prev.slice(0, -1));
        setCurrentPickIndex(prev => prev - 1);
        setToast("");
    };

    const EmptySlot = ({ num, activeClass }) => (
        <div className={`h-12 sm:h-14 rounded-lg border border-dashed flex items-center justify-center transition-colors ${activeClass}`}>
            <span className="text-[9px] font-mono font-bold tracking-widest opacity-40">SLOT {num.toString().padStart(2, '0')}</span>
        </div>
    );

    const PlayerCardSlot = ({ player }) => (
        <div className="h-12 sm:h-14 rounded-lg border border-white/10 glass flex items-center px-3 relative overflow-hidden animate-scale-in">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: player.imgColor }} />
            <div className="flex-1 min-w-0 pr-2 pl-2">
                <p className="text-white font-bold text-xs truncate">{player.name}</p>
                <p className="text-[#6b7280] text-[9px] font-mono tracking-wider">{player.role}</p>
            </div>
            <div className="text-right border-l border-white/5 pl-2">
                <span className="text-[#00e5ff] text-[10px] font-black block">${player.cost}M</span>
            </div>
        </div>
    );

    const getCounts = (roster) => {
        const counts = { batter: 0, wk: 0, allrounder: 0, bowler: 0 };
        roster.forEach(p => counts[p.type]++);
        return counts;
    };
    
    const t1Counts = getCounts(t1Roster);
    const t2Counts = getCounts(t2Roster);
    const t1Value = t1Roster.reduce((s, p) => s + (p.cost || 0), 0);
    const t2Value = t2Roster.reduce((s, p) => s + (p.cost || 0), 0);

    const RosterStatus = ({ counts }) => (
        <div className="flex justify-between items-center px-1 mt-2 text-[9px] md:text-[10px] font-mono uppercase text-[#94a3b8]">
            <span className={counts.batter >= 3 ? "text-[#00ff88]" : ""}>BAT: {counts.batter}/3</span>
            <span className={counts.wk >= 1 ? "text-[#00ff88]" : ""}>WK: {counts.wk}/1</span>
            <span className={counts.allrounder >= 1 ? "text-[#00ff88]" : ""}>AR: {counts.allrounder}/1</span>
            <span className={counts.bowler >= 3 ? "text-[#00ff88]" : ""}>BOWL: {counts.bowler}/3</span>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-6 flex flex-col min-h-[100dvh] lg:h-[calc(100dvh-80px)]">

            {/* Desktop Draft Header (shown only on lg screens) */}
            <div className="hidden lg:flex flex-col items-center mb-4 shrink-0">
                {!isDraftComplete ? (
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-light border border-white/10 shadow-lg">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }} />
                        <span className="text-xs font-bold text-white tracking-wide uppercase">
                            <span style={{ color: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }}>{activePlayerName}</span> Chance to pick
                        </span>
                        <span className="text-[10px] text-[#6b7280] font-mono border-l border-white/20 pl-3">PICK {currentPickIndex + 1}/22</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                        <span className="text-xs font-bold text-[#00ff88] tracking-widest uppercase">
                            DRAFT COMPLETE. LOCKING...
                        </span>
                    </div>
                )}
                {!isDraftComplete && currentPickIndex > 0 && (
                    <div className="mt-2.5">
                        <button
                            onClick={handleUndo}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white border border-white/10 hover:border-white/30 bg-white/5 transition-all active:scale-95"
                        >
                            ↩ Undo last pick
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile/Tablet Floating Draft Box (shown only on < lg screens) */}
            {!isDraftComplete ? (
                <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[45] w-[92vw] max-w-sm bg-[#050a18]/90 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }} />
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white leading-tight">
                                <span style={{ color: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }}>{activePlayerName}</span> Chance to pick
                            </p>
                            <p className="text-[9px] text-[#94a3b8] leading-none mt-0.5 font-mono">
                                PICK {currentPickIndex + 1}/22
                            </p>
                        </div>
                    </div>
                    {currentPickIndex > 0 && (
                        <button
                            onClick={handleUndo}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white border border-white/10 bg-white/5 transition-all active:scale-95 shrink-0"
                        >
                            ↩ Undo
                        </button>
                    )}
                </div>
            ) : (
                <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[45] w-[92vw] max-w-sm bg-[#00ff88]/20 backdrop-blur-md border border-[#00ff88]/50 px-4 py-3 rounded-2xl shadow-[0_0_20px_rgba(0,255,136,0.2)] flex items-center justify-center animate-slide-up">
                    <span className="text-xs font-bold text-[#00ff88] tracking-widest uppercase">
                        DRAFT COMPLETE. LOCKING...
                    </span>
                </div>
            )}

            {/* Mobile Tab Selector */}
            {!isDraftComplete && (
                <div className="flex lg:hidden px-2 mb-4 shrink-0 gap-2" role="tablist" aria-label="Draft view">
                    <button
                        onClick={() => setActiveMobileTab('pool')}
                        role="tab"
                        aria-selected={activeMobileTab === 'pool'}
                        className={`flex-1 min-w-0 truncate py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            activeMobileTab === 'pool'
                                ? 'bg-[#a855f7]/10 border-[#a855f7]/40 text-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                : 'bg-white/5 border-transparent text-[#94a3b8]'
                        }`}
                    >
                        Draft Pool
                    </button>
                    <button
                        onClick={() => setActiveMobileTab('p1')}
                        role="tab"
                        aria-selected={activeMobileTab === 'p1'}
                        className={`flex-1 min-w-0 truncate py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            activeMobileTab === 'p1'
                                ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                                : 'bg-white/5 border-transparent text-[#94a3b8]'
                        }`}
                    >
                        {p1}'s XI
                    </button>
                    <button
                        onClick={() => setActiveMobileTab('p2')}
                        role="tab"
                        aria-selected={activeMobileTab === 'p2'}
                        className={`flex-1 min-w-0 truncate py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            activeMobileTab === 'p2'
                                ? 'bg-[#ff3b5c]/10 border-[#ff3b5c]/40 text-[#ff3b5c] shadow-[0_0_15px_rgba(255,59,92,0.1)]'
                                : 'bg-white/5 border-transparent text-[#94a3b8]'
                        }`}
                    >
                        {p2}'s XI
                    </button>
                </div>
            )}

            {/* Split Screen Draft UI */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0">

                {/* Team 1 Panel */}
                <div className={`glass rounded-2xl p-4 border border-white/5 flex flex-col relative min-h-[300px] lg:h-auto lg:flex ${activeMobileTab === 'p1' || isDraftComplete ? 'flex' : 'hidden'}`}>
                    <div className="absolute top-0 right-0 w-full h-[150px] bg-[radial-gradient(ellipse_at_top,#00e5ff10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-base md:text-lg font-black text-white drop-shadow-md truncate">{p1}'S XI</h2>
                    <p className="text-[#00e5ff] text-[9px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-2 mb-2">TEAM ONE</p>
                    
                    <RosterStatus counts={t1Counts} />
                    <p className="text-[9px] font-mono text-center mt-1.5 text-[#00e5ff]/80"><span className="text-[#6b7280]">SQUAD VALUE</span> ${t1Value}M</p>

                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 mt-3 custom-scrollbar">
                        {Array.from({ length: 11 }, (_, i) => {
                            const num = i + 1;
                            const p = t1Roster[i];
                            const isPickingNow = activeTeamId === 1 && currentPickIndex === (i + t1Roster.length) && !p;

                            if (p) return <PlayerCardSlot key={num} player={p} />;
                            return <EmptySlot key={num} num={num} activeClass={isPickingNow ? 'border-[#00e5ff] bg-[#00e5ff]/5' : 'border-white/10'} />;
                        })}
                    </div>
                </div>

                {/* Central Player Pool (Hides when draft complete) */}
                <div className={`lg:col-span-2 glass-light rounded-2xl border border-white/5 flex flex-col overflow-hidden transition-opacity duration-1000 min-h-[400px] lg:h-auto lg:flex ${isDraftComplete ? 'opacity-0 h-0 lg:h-auto' : activeMobileTab === 'pool' ? 'flex' : 'hidden'}`}>
                    {/* Filters & Search */}
                    <div className="p-3 border-b border-white/5 bg-[#050a18]/40">
                        <input
                            type="text"
                            placeholder="🔍 Search players..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mb-2 focus:outline-none focus:border-[#a855f7]"
                        />
                        <div className="scroll-row gap-1.5 pb-1">
                            {['all', 'batter', 'wk', 'allrounder', 'bowler'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    aria-pressed={filter === f}
                                    className={`shrink-0 px-3.5 py-2 min-h-[36px] rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-colors active:scale-95 ${filter === f ? 'bg-[#a855f7] text-[#050a18]' : 'bg-white/5 text-[#94a3b8] hover:bg-white/10'}`}
                                >
                                    {f === 'allrounder' ? 'AR' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Available Players List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {availablePlayers.map(p => {
                            const isLegalPick = canPick(p, activeRoster);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleDraftPlayer(p)}
                                    disabled={isDraftComplete || !isLegalPick}
                                    className={`w-full text-left glass rounded-lg border p-3 flex items-center gap-3 transition-all group ${isLegalPick ? 'border-white/5 hover:border-white/20 hover:bg-white/5' : 'border-red-500/10 bg-red-500/5 opacity-50 cursor-not-allowed'}`}
                                >
                                    <div className="w-10 h-10 rounded bg-[#050a18]/50 flex items-center justify-center border border-white/10 font-black text-white text-[10px] shadow-inner shrink-0" style={{ borderColor: p.imgColor }}>
                                        {p.cost}M
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white text-sm font-bold truncate group-hover:text-[#a855f7] transition-colors">{p.name}</h3>
                                        <p className="text-[9px] font-mono text-[#6b7280] tracking-wider mt-0.5">
                                            {p.role} • {p.type === 'bowler' ? `ECON ${p.economy}` : `AVG ${p.avg}`}
                                        </p>
                                    </div>
                                    {isLegalPick && (
                                        <div className="text-[#a855f7] font-bold text-[10px] bg-[#a855f7]/10 px-2.5 py-1.5 rounded md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            DRAFT
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Team 2 Panel */}
                <div className={`glass rounded-2xl p-4 border border-white/5 flex flex-col relative min-h-[300px] lg:h-auto lg:flex ${activeMobileTab === 'p2' || isDraftComplete ? 'flex' : 'hidden'}`}>
                    <div className="absolute top-0 left-0 w-full h-[150px] bg-[radial-gradient(ellipse_at_top,#ff3b5c10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-base md:text-lg font-black text-white drop-shadow-md text-right truncate">{p2}'S XI</h2>
                    <p className="text-[#ff3b5c] text-[9px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-2 mb-2 text-right">TEAM TWO</p>

                    <RosterStatus counts={t2Counts} />
                    <p className="text-[9px] font-mono text-center mt-1.5 text-[#ff3b5c]/80"><span className="text-[#6b7280]">SQUAD VALUE</span> ${t2Value}M</p>

                    <div className="space-y-2 flex-1 overflow-y-auto pl-1 mt-3 custom-scrollbar">
                        {Array.from({ length: 11 }, (_, i) => {
                            const num = i + 1;
                            const p = t2Roster[i];
                            const isPickingNow = activeTeamId === 2 && currentPickIndex === (i + t2Roster.length) && !p;

                            if (p) return <PlayerCardSlot key={num} player={p} />;
                            return <EmptySlot key={num} num={num} activeClass={isPickingNow ? 'border-[#ff3b5c] bg-[#ff3b5c]/5' : 'border-white/10'} />;
                        })}
                    </div>
                </div>

            </div>

            {/* Inline validation toast — replaces the old blocking window.alert */}
            {toast && (
                <div role="alert" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[60] w-[92vw] max-w-md px-4 py-3 rounded-xl bg-[#ff3b5c]/15 border border-[#ff3b5c]/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-start gap-2.5 animate-slide-up">
                    <span className="text-[#ff3b5c] text-sm shrink-0 mt-0.5" aria-hidden="true">⚠</span>
                    <p className="flex-1 text-[11px] sm:text-xs text-white font-medium leading-snug">{toast}</p>
                    <button onClick={() => setToast("")} aria-label="Dismiss message" className="shrink-0 text-[#94a3b8] hover:text-white text-sm leading-none">✕</button>
                </div>
            )}
        </div>
    );
}
