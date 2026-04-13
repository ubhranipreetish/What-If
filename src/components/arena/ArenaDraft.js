"use client";
import { useState } from "react";
import { arenaPlayerPool } from "@/data/arenaPlayers";

export default function ArenaDraft({ p1, p2, firstPick, onDraftComplete }) {
    const isP1First = firstPick === p1;

    // Snake draft order for 10 picks total.
    // 0 = Pick 1 (First), 1 = Pick 2 (Second), 2 = Pick 3 (Second), 3 = Pick 4 (First), etc.
    const snakeOrder = [
        isP1First ? 1 : 2, // Pick 1
        isP1First ? 2 : 1, // Pick 2
        isP1First ? 2 : 1, // Pick 3
        isP1First ? 1 : 2, // Pick 4
        isP1First ? 1 : 2, // Pick 5
        isP1First ? 2 : 1, // Pick 6
        isP1First ? 2 : 1, // Pick 7
        isP1First ? 1 : 2, // Pick 8
        isP1First ? 1 : 2, // Pick 9
        isP1First ? 2 : 1  // Pick 10
    ];

    const [currentPickIndex, setCurrentPickIndex] = useState(0);
    const [t1Roster, setT1Roster] = useState([]);
    const [t2Roster, setT2Roster] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all"); // 'all' | 'batter' | 'bowler' | 'allrounder'

    const activeTeamId = snakeOrder[currentPickIndex];
    const activePlayerName = activeTeamId === 1 ? p1 : p2;
    const isDraftComplete = currentPickIndex >= 10;

    const availablePlayers = arenaPlayerPool.filter(p => {
        const isDrafted = t1Roster.find(t => t.id === p.id) || t2Roster.find(t => t.id === p.id);
        if (isDrafted) return false;

        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.type === filter;
        return matchSearch && matchFilter;
    });

    const handleDraftPlayer = (player) => {
        if (isDraftComplete) return;

        if (activeTeamId === 1) {
            setT1Roster(prev => [...prev, player]);
        } else {
            setT2Roster(prev => [...prev, player]);
        }

        if (currentPickIndex === 9) {
            // Wait a moment before full transition
            setTimeout(() => onDraftComplete(
                activeTeamId === 1 ? [...t1Roster, player] : t1Roster,
                activeTeamId === 2 ? [...t2Roster, player] : t2Roster
            ), 1000);
        }
        setCurrentPickIndex(prev => prev + 1);
    };

    const EmptySlot = ({ num, activeClass }) => (
        <div className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${activeClass}`}>
            <span className="text-[10px] font-mono font-bold tracking-widest opacity-50">SLOT 0{num}</span>
        </div>
    );

    const PlayerCardSlot = ({ player }) => (
        <div className="h-16 rounded-xl border border-white/10 glass flex items-center px-4 relative overflow-hidden animate-scale-in">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: player.imgColor }} />
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-white font-bold text-sm truncate">{player.name}</p>
                <p className="text-[#6b7280] text-[10px] font-mono tracking-wider">{player.role}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-3">
                <span className="text-[#00e5ff] text-xs font-black block">${player.cost}M</span>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col">

            {/* Draft Header */}
            <div className="text-center mb-6">
                {!isDraftComplete ? (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-light border border-white/10 shadow-lg">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }} />
                        <span className="text-sm font-bold text-white tracking-wide uppercase">
                            ON THE CLOCK: <span style={{ color: activeTeamId === 1 ? '#00e5ff' : '#ff3b5c' }}>{activePlayerName}</span>
                        </span>
                        <span className="text-xs text-[#6b7280] font-mono ml-4 border-l border-white/20 pl-4">PICK {currentPickIndex + 1} OF 10</span>
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
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">

                {/* Team 1 Panel */}
                <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col relative">
                    <div className="absolute top-0 right-0 w-full h-[200px] bg-[radial-gradient(ellipse_at_top,#00e5ff10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-xl font-black text-white mb-1 drop-shadow-md">{p1}'S FIVE</h2>
                    <p className="text-[#00e5ff] text-[10px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-4 mb-6">TEAM ONE</p>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                            const p = t1Roster[num - 1];
                            const isPickingNow = activeTeamId === 1 && currentPickIndex === (num - 1 + t1Roster.length) && !p;

                            if (p) return <PlayerCardSlot key={num} player={p} />;
                            return <EmptySlot key={num} num={num} activeClass={isPickingNow ? 'border-[#00e5ff] bg-[#00e5ff]/5' : 'border-white/10'} />;
                        })}
                    </div>
                </div>

                {/* Central Player Pool (Hides when draft complete) */}
                <div className={`md:col-span-2 glass-light rounded-3xl border border-white/5 flex flex-col overflow-hidden transition-opacity duration-1000 ${isDraftComplete ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Filters & Search */}
                    <div className="p-4 border-b border-white/5 bg-[#050a18]/40">
                        <input
                            type="text"
                            placeholder="🔍 Search archives..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white mb-3 focus:outline-none focus:border-[#a855f7]"
                        />
                        <div className="flex gap-2">
                            {['all', 'batter', 'bowler', 'allrounder'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${filter === f ? 'bg-[#a855f7] text-[#050a18]' : 'bg-white/5 text-[#94a3b8] hover:bg-white/10'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Available Players List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {availablePlayers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleDraftPlayer(p)}
                                disabled={isDraftComplete}
                                className="w-full text-left glass rounded-xl border border-white/5 hover:border-white/20 p-4 flex items-center gap-4 transition-all hover:bg-white/5 group"
                            >
                                <div className="w-12 h-12 rounded bg-[#050a18]/50 flex items-center justify-center border border-white/10 font-black text-white shadow-inner" style={{ borderColor: p.imgColor }}>
                                    {p.cost}M
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold group-hover:text-[#a855f7] transition-colors">{p.name}</h3>
                                    <p className="text-[10px] font-mono text-[#6b7280] tracking-wider mt-1">
                                        {p.role} • {p.type === 'bowler' ? `ECON ${p.economy}` : `SR ${p.avgSR}`}
                                    </p>
                                </div>
                                <div className="text-[#a855f7] font-bold text-sm bg-[#a855f7]/10 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    DRAFT
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Team 2 Panel */}
                <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col relative">
                    <div className="absolute top-0 left-0 w-full h-[200px] bg-[radial-gradient(ellipse_at_top,#ff3b5c10_0%,transparent_70%)] pointer-events-none" />

                    <h2 className="text-xl font-black text-white mb-1 drop-shadow-md text-right">{p2}'S FIVE</h2>
                    <p className="text-[#ff3b5c] text-[10px] font-mono font-bold tracking-widest uppercase border-b border-white/10 pb-4 mb-6 text-right">TEAM TWO</p>

                    <div className="space-y-3 flex-1 overflow-y-auto pl-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                            const p = t2Roster[num - 1];
                            const isPickingNow = activeTeamId === 2 && currentPickIndex === (num - 1 + t2Roster.length) && !p;

                            if (p) return <PlayerCardSlot key={num} player={p} />;
                            return <EmptySlot key={num} num={num} activeClass={isPickingNow ? 'border-[#ff3b5c] bg-[#ff3b5c]/5' : 'border-white/10'} />;
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
