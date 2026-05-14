"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MatchHub() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);  
    const [selectedOpponent, setSelectedOpponent] = useState(null); 

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
                                                        t.includes("Pune") ? "#9C27B0" :
                                                            t.includes("Lucknow") ? "#004BA0" : "#00e5ff";

    // 0️⃣ Initialize from Query Params
    useEffect(() => {
        const year = searchParams.get("year");
        const teamName = searchParams.get("team");
        const oppName = searchParams.get("opp");

        if (year && year !== "null" && year !== "") setSelectedYear(year);
        
        if (teamName && teamName !== "null" && teamName !== "") {
            const name = decodeURIComponent(teamName);
            setSelectedTeam({ 
                name: name, 
                short: name.substring(0, 3).toUpperCase(), 
                color: teamColor(name) 
            });
        }
        if (oppName && oppName !== "null" && oppName !== "") {
            const name = decodeURIComponent(oppName);
            setSelectedOpponent({ 
                name: name, 
                short: name.substring(0, 3).toUpperCase(), 
                color: teamColor(name) 
            });
        }
    }, [searchParams]);

    // Dynamic State
    const [years, setYears] = useState([]);
    const [availableTeams, setAvailableTeams] = useState([]);
    const [allMatches, setAllMatches] = useState([]);     
    const [filteredMatches, setFilteredMatches] = useState([]);
    const [loading, setLoading] = useState({ years: true, teams: false, matches: false });

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

    // 3️⃣ Fetch ALL Matches when Team is Selected 
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

    const availableOpponents = [...new Map(allMatches.map(m => [m.team2.name, m.team2])).values()];

    const handleReset = () => {
        setSelectedYear(null);
        setSelectedTeam(null);
        setSelectedOpponent(null);
    };

    return (
        <div className="min-h-screen bg-[#02050c] font-sans text-[#e2e8f0]">
            
            {/* Top Navigation */}
            <header className="border-b border-white/5 bg-[#050a18]/90 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-4 group">
                        <div className="w-8 h-8 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center group-hover:bg-[#00e5ff]/20 transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                        </div>
                        <span className="text-white font-black text-xl tracking-widest uppercase opacity-80 group-hover:opacity-100 group-hover:text-[#00e5ff] transition-all">
                            Home
                        </span>
                    </a>
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[10px] font-mono text-[#00ff88] tracking-widest uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]" />
                        Connected
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
                
                {/* Header Section */}
                <div className="text-center mb-10 md:mb-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,229,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                    
                    <p className="text-[#00e5ff] text-[9px] md:text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-3 md:mb-4 opacity-80">
                        The Time Machine
                    </p>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-4 md:mb-6 tracking-tighter drop-shadow-2xl">
                        Select a Match
                    </h1>
                    <p className="text-[#94a3b8] max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed px-4">
                        Filter matches by IPL season and team, or jump into a legendary scenario below.
                    </p>
                </div>

                {/* ─── Separator ─── */}
                <div className="flex items-center gap-4 text-[9px] md:text-[10px] font-mono text-[#6b7280] tracking-[0.3em] uppercase mb-8 md:mb-12">
                    <span className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></span>
                    <span className="shrink-0">or browse all matches</span>
                    <span className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></span>
                </div>

                {/* ─── Filters Section ─── */}
                <div className="bg-[#050a18] rounded-2xl md:rounded-3xl p-5 md:p-8 mb-10 md:mb-16 border border-white/5 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/[0.02] to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
                        
                        {/* Column 1: Year Filter */}
                        <div>
                            <div className="flex items-center gap-3 mb-4 md:mb-6 border-b border-white/5 pb-2 md:pb-3">
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-white/5 flex items-center justify-center text-[#6b7280] font-mono text-[10px] md:text-xs">A</div>
                                <h3 className="text-xs md:text-sm font-mono text-white tracking-widest uppercase">Select Season</h3>
                            </div>
                            
                            {loading.years ? (
                                <div className="flex gap-2 animate-pulse">
                                    <div className="h-8 md:h-10 w-16 md:w-20 bg-white/5 rounded-lg"></div>
                                    <div className="h-8 md:h-10 w-16 md:w-20 bg-white/5 rounded-lg"></div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {years.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => { setSelectedYear(year); setSelectedTeam(null); }}
                                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-mono text-xs md:text-sm transition-all duration-300 ${selectedYear === year
                                                ? "bg-[#00e5ff] text-[#050a18] font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                                                : "bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10"
                                                }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Column 2: Franchise Filter */}
                        <div className={`transition-all duration-500 ${selectedYear ? "opacity-100" : "opacity-40 grayscale pointer-events-none"}`}>
                            <div className="flex items-center gap-3 mb-4 md:mb-6 border-b border-white/5 pb-2 md:pb-3">
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-white/5 flex items-center justify-center text-[#6b7280] font-mono text-[10px] md:text-xs">B</div>
                                <h3 className="text-xs md:text-sm font-mono text-white tracking-widest uppercase">Select Team</h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 md:gap-3">
                                {availableTeams.length > 0 ? (
                                    availableTeams.map(team => (
                                        <button
                                            key={team.short}
                                            onClick={() => setSelectedTeam(team)}
                                            className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 md:gap-3 ${selectedTeam?.short === team.short
                                                ? "bg-white/10 text-white border-transparent shadow-lg transform scale-105"
                                                : "bg-transparent border border-white/10 text-[#94a3b8] hover:bg-white/5 hover:text-white"
                                                }`}
                                            style={{
                                                borderColor: selectedTeam?.short === team.short ? team.color : "",
                                                backgroundColor: selectedTeam?.short === team.short ? `${team.color}20` : "",
                                            }}
                                        >
                                            <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                                            {team.name}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[10px] md:text-xs font-mono text-[#6b7280] tracking-wider py-2">Awaiting Season Selection...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Opponent Filter */}
                    {allMatches.length > 0 && (
                        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/5 animate-in slide-in-from-bottom-4 fade-in duration-500 relative z-10">
                            <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-white/5 pb-2 md:pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-white/5 flex items-center justify-center text-[#6b7280] font-mono text-[10px] md:text-xs">C</div>
                                    <h3 className="text-xs md:text-sm font-mono text-white tracking-widest uppercase">Select Opponent</h3>
                                </div>
                                <span className="text-[9px] md:text-[10px] font-mono text-[#00e5ff]/50 px-2 py-1 bg-[#00e5ff]/10 rounded uppercase tracking-widest">
                                    {availableOpponents.length} Opponents
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 md:gap-3">
                                {availableOpponents.map(opp => (
                                    <button
                                        key={opp.name}
                                        onClick={() => setSelectedOpponent(selectedOpponent?.name === opp.name ? null : opp)}
                                        className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 md:gap-3 ${selectedOpponent?.name === opp.name
                                            ? "bg-white/10 text-white border-transparent shadow-lg transform scale-105"
                                            : "bg-transparent border border-white/10 text-[#94a3b8] hover:bg-white/5 hover:text-white"
                                            }`}
                                        style={{
                                            borderColor: selectedOpponent?.name === opp.name ? opp.color : "",
                                            backgroundColor: selectedOpponent?.name === opp.name ? `${opp.color}20` : "",
                                        }}
                                    >
                                        <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full shadow-sm" style={{ backgroundColor: opp.color }} />
                                        {opp.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clear Filters */}
                    {(selectedYear !== null || selectedTeam !== null) && (
                        <div className="absolute top-4 md:top-8 right-4 md:right-8 z-20">
                            <button
                                onClick={handleReset}
                                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 hover:bg-[#ff3b5c]/20 hover:text-[#ff3b5c] text-[#94a3b8] flex items-center justify-center transition-all border border-transparent hover:border-[#ff3b5c]/30"
                                title="Clear All Filters"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Match Results Grid */}
                <div className="space-y-6 md:space-y-8">
                    <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-[11px] font-mono text-white tracking-[0.2em] uppercase">
                        <span className="w-8 md:w-12 h-[1px] bg-gradient-to-r from-[#00e5ff] to-transparent"></span>
                        {filteredMatches.length} {filteredMatches.length === 1 ? 'Match' : 'Matches'} Found
                        <span className="w-8 md:w-12 h-[1px] bg-gradient-to-l from-[#00e5ff] to-transparent"></span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {filteredMatches.map((match, i) => (
                            <button
                                key={match.id}
                                onClick={() => router.push(`/simulation/${match.id}`)}
                                className="group block w-full text-left bg-[#050a18] rounded-2xl md:rounded-3xl border border-white/5 hover:border-[#00e5ff]/40 overflow-hidden transition-all duration-500 hover:shadow-[0_10px_40px_rgba(0,229,255,0.1)] hover:-translate-y-1 animate-in slide-in-from-bottom-8 fade-in"
                                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                            >
                                {/* Top Color Bar */}
                                <div className="h-1.5 md:h-2 w-full flex opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                                    <div className="flex-1" style={{ backgroundColor: match.team1.color }} />
                                    <div className="flex-1" style={{ backgroundColor: match.team2.color }} />
                                </div>

                                <div className="p-6 md:p-8">
                                    {/* Team Header */}
                                    <div className="flex items-center justify-between mb-6 md:mb-8">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg transform group-hover:scale-105 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${match.team1.color}, ${match.team1.color}dd)` }}>
                                                {match.team1.short}
                                            </div>
                                            
                                            <div className="text-[10px] md:text-xs font-mono font-bold text-[#6b7280] px-1 md:px-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                VS
                                            </div>
                                            
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg transform group-hover:scale-105 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${match.team2.color}, ${match.team2.color}dd)` }}>
                                                {match.team2.short}
                                            </div>
                                        </div>

                                        {/* Action Icon */}
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-[#94a3b8] group-hover:text-[#00e5ff] group-hover:bg-[#00e5ff]/10 group-hover:border-[#00e5ff]/30 transition-all duration-500">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 md:w-5 md:h-5 transform group-hover:translate-x-1 transition-transform">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Match Details */}
                                    <div className="mb-6 md:mb-8">
                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 group-hover:text-[#00e5ff] transition-colors leading-tight">
                                            {match.title}
                                        </h3>
                                        <p className="text-[#6b7280] font-mono text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            {match.date}
                                        </p>
                                    </div>

                                    {/* Original Outcome Ribbon */}
                                    <div className="bg-white/[0.02] rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/5 group-hover:bg-[#00e5ff]/[0.02] group-hover:border-[#00e5ff]/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]"></span>
                                            <span className="text-[8px] md:text-[9px] text-[#94a3b8] font-mono uppercase tracking-[0.2em]">Original Outcome</span>
                                        </div>
                                        <p className="text-sm md:text-base font-bold text-white">
                                            {match.winner} <span className="text-xs md:text-sm font-normal text-[#6b7280] ml-1">({match.margin})</span>
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {/* Empty State */}
                        {filteredMatches.length === 0 && !loading.matches && (
                            <div className="col-span-1 lg:col-span-2 bg-[#050a18]/50 rounded-3xl py-24 text-center border border-dashed border-white/10">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-[#6b7280]">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                                <p className="text-[#94a3b8] font-mono text-sm tracking-widest uppercase">
                                    Select a season and team above to browse matches.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
