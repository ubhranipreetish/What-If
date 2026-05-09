"use client";
import { useState } from "react";
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
            alert(`Drafting ${player.name} violates roster composition rules (Min: 3 BAT, 1 WK, 3 BOWL, 1 AR, 5 BOWL options total). Choose someone else to ensure a legal squad.`);
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

    const RosterStatus = ({ counts }) => (
        <div className="flex justify-between items-center px-1 mt-2 text-[8px] font-mono uppercase text-[#94a3b8]">
            <span className={counts.batter >= 3 ? "text-[#00ff88]" : ""}>BAT: {counts.batter}/3</span>
            <span className={counts.wk >= 1 ? "text-[#00ff88]" : ""}>WK: {counts.wk}/1</span>
            <span className={counts.allrounder >= 1 ? "text-[#00ff88]" : ""}>AR: {counts.allrounder}/1</span>
            <span className={counts.bowler >= 3 ? "text-[#00ff88]" : ""}>BOWL: {counts.bowler}/3</span>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-6 h-[calc(100vh-80px)] flex flex-col">

            {/* Draft Header */}
            <div className="text-center mb-4">
                {!isDraftComplete ? (
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-light border border-white/10 shadow-lg">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }} />
                        <span className="text-xs font-bold text-white tracking-wide uppercase">
                            ON THE CLOCK: <span style={{ color: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }}>{activePlayerName}</span>
                        </span>
                        <span className="text-[10px] text-[#6b7280] font-mono ml-3 border-l border-white/20 pl-3">PICK {currentPickIndex + 1} OF 22</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                        <span className="text-sm font-bold text-[#00ff88] tracking-widest uppercase">
                            DRAFT COMPLETE. LOCKING ROSTERS...
                        </span>
                    </div>
                )}
            </div>

            {/* Split Screen Draft UI */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">

                {/* Team 1 Panel */}
                <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col relative h-[50vh] lg:h-auto">
                    <div className="absolute top-0 right-0 w-full h-[150px] bg-[radial-gradient(ellipse_at_top,#00e5ff10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-lg font-black text-white drop-shadow-md truncate">{p1}'S XI</h2>
                    <p className="text-[#00e5ff] text-[9px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-2 mb-2">TEAM ONE</p>
                    
                    <RosterStatus counts={t1Counts} />

                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 mt-3">
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
                <div className={`lg:col-span-2 glass-light rounded-2xl border border-white/5 flex flex-col overflow-hidden transition-opacity duration-1000 h-[50vh] lg:h-auto ${isDraftComplete ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Filters & Search */}
                    <div className="p-3 border-b border-white/5 bg-[#050a18]/40">
                        <input
                            type="text"
                            placeholder="🔍 Search legends..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-[#a855f7]"
                        />
                        <div className="flex gap-1.5">
                            {['all', 'batter', 'wk', 'allrounder', 'bowler'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-[#a855f7] text-[#050a18]' : 'bg-white/5 text-[#94a3b8] hover:bg-white/10'}`}
                                >
                                    {f === 'allrounder' ? 'AR' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Available Players List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {availablePlayers.map(p => {
                            const isLegalPick = canPick(p, activeRoster);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleDraftPlayer(p)}
                                    disabled={isDraftComplete || !isLegalPick}
                                    className={`w-full text-left glass rounded-lg border p-3 flex items-center gap-3 transition-all group ${isLegalPick ? 'border-white/5 hover:border-white/20 hover:bg-white/5' : 'border-red-500/10 bg-red-500/5 opacity-50 cursor-not-allowed'}`}
                                >
                                    <div className="w-10 h-10 rounded bg-[#050a18]/50 flex items-center justify-center border border-white/10 font-black text-white text-xs shadow-inner shrink-0" style={{ borderColor: p.imgColor }}>
                                        {p.cost}M
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white text-sm font-bold truncate group-hover:text-[#a855f7] transition-colors">{p.name}</h3>
                                        <p className="text-[9px] font-mono text-[#6b7280] tracking-wider mt-0.5">
                                            {p.role} • {p.type === 'bowler' ? `ECON ${p.economy}` : `AVG ${p.avg}`}
                                        </p>
                                    </div>
                                    {isLegalPick && (
                                        <div className="text-[#a855f7] font-bold text-[10px] bg-[#a855f7]/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            DRAFT
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Team 2 Panel */}
                <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col relative h-[50vh] lg:h-auto">
                    <div className="absolute top-0 left-0 w-full h-[150px] bg-[radial-gradient(ellipse_at_top,#ff3b5c10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-lg font-black text-white drop-shadow-md text-right truncate">{p2}'S XI</h2>
                    <p className="text-[#ff3b5c] text-[9px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-2 mb-2 text-right">TEAM TWO</p>

                    <RosterStatus counts={t2Counts} />

                    <div className="space-y-2 flex-1 overflow-y-auto pl-1 mt-3">
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
        </div>
    );
}
