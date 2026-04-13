"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlowButton from "@/components/GlowButton";

export default function MatchHub() {
    const router = useRouter();

    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);  // full team object {short, name, color}
    const [selectedOpponent, setSelectedOpponent] = useState(null); // full team object

    // Dynamic State
    const [years, setYears] = useState([]);
    const [availableTeams, setAvailableTeams] = useState([]);
    const [allMatches, setAllMatches] = useState([]);     // raw matches from backend
    const [filteredMatches, setFilteredMatches] = useState([]);
    const [loading, setLoading] = useState({ years: true, teams: false, matches: false });

    // Helper: convert raw team name to color
    const teamColor = (t) =>
        t.includes("Chennai") ? "#F9CD05" :
            t.includes("Mumbai") ? "#004BA0" :
                t.includes("Royal") ? "#D4213D" :
                    t.includes("Kolkata") ? "#3A225D" :
                        t.includes("Gujarat") ? "#1B2133" :
                            t.includes("Rajasthan") ? "#EB1B99" :
                                t.includes("Sunrisers") ? "#FF822A" :
                                    t.includes("Punjab") ? "#D71920" :
                                        t.includes("Delhi") ? "#0078BC" :
                                            t.includes("Hyderabad") ? "#FF822A" :
                                                t.includes("Deccan") ? "#FF822A" :
                                                    t.includes("Kochi") ? "#4CAF50" :
                                                        t.includes("Pune") ? "#9C27B0" : "#00e5ff";

    // 1️⃣ Fetch Years on Mount
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/metadata/years");
                const data = await res.json();
                setYears(data.years || []);
            } catch (error) {
                console.error("Backend Offline: Years", error);
            } finally {
                setLoading(prev => ({ ...prev, years: false }));
            }
        };
        fetchYears();
    }, []);

    // 2️⃣ Fetch Teams when Year is Selected
    useEffect(() => {
        if (!selectedYear) {
            setAvailableTeams([]);
            return;
        }
        const fetchTeams = async () => {
            setLoading(prev => ({ ...prev, teams: true }));
            try {
                const res = await fetch(`http://localhost:8000/api/metadata/teams?year=${selectedYear}`);
                const data = await res.json();
                const teamMap = data.teams.map(t => ({
                    short: t.substring(0, 3).toUpperCase(),
                    name: t,
                    color: teamColor(t)
                }));
                setAvailableTeams(teamMap);
            } catch (error) {
                console.error("Backend Offline: Teams", error);
            } finally {
                setLoading(prev => ({ ...prev, teams: false }));
            }
        };
        fetchTeams();
    }, [selectedYear]);

    // 3️⃣ Fetch ALL Matches when Team is Selected (store raw, filter client-side for opponent)
    useEffect(() => {
        if (!selectedYear || !selectedTeam) {
            setAllMatches([]);
            setFilteredMatches([]);
            setSelectedOpponent(null);
            return;
        }
        const fetchMatches = async () => {
            setLoading(prev => ({ ...prev, matches: true }));
            try {
                const res = await fetch(`http://localhost:8000/api/metadata/matches?year=${selectedYear}&team=${encodeURIComponent(selectedTeam.name)}`);
                const data = await res.json();
                // Map to card format
                const formatted = data.matches.map(m => {
                    const oppName = m.title.replace("vs ", "");
                    return {
                        id: m.id,
                        date: m.date,
                        title: m.title,
                        team1: selectedTeam,
                        team2: { short: oppName.substring(0, 3).toUpperCase(), name: oppName, color: teamColor(oppName) },
                        venue: m.venue,
                        winner: m.winner,
                        margin: m.margin
                    };
                });
                setAllMatches(formatted);
                setFilteredMatches(formatted);
                setSelectedOpponent(null);
            } catch (error) {
                console.error("Backend Offline: Matches", error);
            } finally {
                setLoading(prev => ({ ...prev, matches: false }));
            }
        };
        fetchMatches();
    }, [selectedYear, selectedTeam]);

    // 4️⃣ Client-side filter by opponent
    useEffect(() => {
        if (!selectedOpponent) {
            setFilteredMatches(allMatches);
        } else {
            setFilteredMatches(allMatches.filter(m => m.team2.name === selectedOpponent.name));
        }
    }, [selectedOpponent, allMatches]);

    // Unique opponents from loaded matches
    const availableOpponents = [...new Map(allMatches.map(m => [m.team2.name, m.team2])).values()];

    const handleReset = () => {
        setSelectedYear(null);
        setSelectedTeam(null);
        setSelectedOpponent(null);
    };

    return (
        <div className="min-h-screen grid-bg">
            <header className="border-b border-[rgba(255,255,255,0.06)] bg-[#050a18]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3 group">
                        <span className="text-[#00e5ff] font-black text-xl tracking-tight leading-none group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">
                            ◈ COUNTERPLAY
                        </span>
                    </a>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light border border-[#00ff88]/20 text-xs font-mono text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.1)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        SYS.ONLINE
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <p className="text-[#00e5ff] text-xs font-mono font-bold tracking-[0.2em] mb-3">STEP 01</p>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md">
                        Define the Era
                    </h1>
                    <p className="text-[#94a3b8] max-w-lg mx-auto text-lg font-light leading-relaxed">
                        Filter the historical archives by IPL season and franchise. Then select the exact match timeline to intercept.
                    </p>
                </div>

                {/* Interactive Cascading Filters */}
                <div className="glass rounded-3xl p-8 mb-12 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.03)_0%,transparent_70%)] pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-8 relative z-10">
                        {/* Column 1: Year */}
                        <div className="flex-1">
                            <label className="block text-xs font-mono text-[#6b7280] uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                                [A] Target Season
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {years.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => { setSelectedYear(year); setSelectedTeam(null); }}
                                        className={`px-5 py-2.5 rounded-xl font-mono text-sm transition-all duration-300 ${selectedYear === year
                                            ? "bg-[#00e5ff] text-[#050a18] font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] scale-105"
                                            : "glass-light text-[#c4cad6] hover:border-[#00e5ff]/30 hover:text-white"
                                            }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Team (Only shows if year is selected or always available) */}
                        <div className={`flex-1 transition-all duration-500 ${selectedYear ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none translate-y-4"}`}>
                            <label className="block text-xs font-mono text-[#6b7280] uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                                [B] Franchise Filter
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableTeams.length > 0 ? (
                                    availableTeams.map(team => (
                                        <button
                                            key={team.short}
                                            onClick={() => setSelectedTeam(team)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${selectedTeam?.short === team.short
                                                ? "border-2 scale-105 text-white shadow-lg"
                                                : "border border-white/10 text-[#c4cad6] glass-light hover:bg-white/5"
                                                }`}
                                            style={{
                                                borderColor: selectedTeam?.short === team.short ? team.color : "",
                                                backgroundColor: selectedTeam?.short === team.short ? `${team.color}33` : "",
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                                {team.name}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm font-mono text-[#6b7280] italic py-2">Select a season first...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Opponent Filter */}
                    {allMatches.length > 0 && (
                        <div className={`border-t border-white/10 pt-6 mt-6 transition-all duration-500`}>
                            <label className="block text-xs font-mono text-[#6b7280] uppercase tracking-wider mb-4">
                                [C] Opposition Filter <span className="text-[#00e5ff]/50 ml-2">({availableOpponents.length} opponents)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableOpponents.map(opp => (
                                    <button
                                        key={opp.name}
                                        onClick={() => setSelectedOpponent(selectedOpponent?.name === opp.name ? null : opp)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${selectedOpponent?.name === opp.name
                                                ? "border-2 scale-105 text-white shadow-lg"
                                                : "border border-white/10 text-[#c4cad6] glass-light hover:bg-white/5"
                                            }`}
                                        style={{
                                            borderColor: selectedOpponent?.name === opp.name ? opp.color : "",
                                            backgroundColor: selectedOpponent?.name === opp.name ? `${opp.color}33` : "",
                                        }}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opp.color }} />
                                            {opp.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(selectedYear !== null || selectedTeam !== null) && (
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                            <button
                                onClick={handleReset}
                                className="text-xs font-mono text-[#ff3b5c] hover:text-[#ff6b35] transition-colors flex items-center gap-1"
                            >
                                ✕ CLEAR FILTERS
                            </button>
                        </div>
                    )}
                </div>

                {/* Match Results */}
                <div className="space-y-6">
                    <label className="flex items-center gap-3 text-sm font-mono text-white tracking-widest pl-2">
                        <span className="w-8 h-[1px] bg-gradient-to-r from-[#00e5ff] to-transparent"></span>
                        {filteredMatches.length} TIMELINE{filteredMatches.length !== 1 ? "S" : ""} FOUND
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredMatches.map((match, i) => (
                            <button
                                key={match.id}
                                onClick={() => router.push(`/simulation/${match.id}`)}
                                className="group relative w-full text-left rounded-2xl overflow-hidden glass transition-all duration-500 ease-out cursor-pointer hover:scale-[1.02] hover:border-[rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(0,229,255,0.2)] animate-slide-up"
                                style={{ animationDelay: `${i * 100}ms`, opacity: 0, animationFillMode: "forwards" }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                                <div className="h-1.5 w-full flex opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="flex-1" style={{ backgroundColor: match.team1.color }} />
                                    <div className="flex-1" style={{ backgroundColor: match.team2.color }} />
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-inner" style={{ background: match.team1.color }}>
                                                {match.team1.short}
                                            </div>
                                            <span className="text-[#6b7280] text-sm font-black italic">VS</span>
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-inner" style={{ background: match.team2.color }}>
                                                {match.team2.short}
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center text-[#94a3b8] group-hover:text-[#00e5ff] group-hover:bg-[#00e5ff]/10 transition-all">
                                            →
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00e5ff] transition-colors leading-tight">
                                        {match.title}
                                    </h3>

                                    <p className="text-xs text-[#6b7280] font-mono mb-4 flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {match.date}
                                    </p>

                                    <div className="glass-light rounded-xl p-4 border border-[rgba(255,255,255,0.03)] group-hover:border-[rgba(0,229,255,0.2)] transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-1 h-1 rounded-full bg-[#00ff88]"></span>
                                            <span className="text-[10px] text-[#8b949e] font-mono uppercase tracking-wider">Original Winner</span>
                                        </div>
                                        <p className="text-sm font-bold text-white">
                                            {match.winner} <span className="text-xs text-[#6b7280] font-normal ml-1">({match.margin})</span>
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {filteredMatches.length === 0 && !loading.matches && (
                            <div className="col-span-1 md:col-span-2 glass rounded-2xl p-12 text-center border-dashed border-white/20">
                                <p className="text-[#94a3b8] font-mono text-sm">NO TIMELINES DETECTED FOR THESE PARAMETERS.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
