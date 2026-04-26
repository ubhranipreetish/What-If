"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const TEAM_COLORS = {
  "Mumbai Indians": "#004BA0", "Chennai Super Kings": "#FCCA06",
  "Royal Challengers Bangalore": "#D4213D", "Kolkata Knight Riders": "#3A225D",
  "Sunrisers Hyderabad": "#FF822A", "Delhi Capitals": "#0078BC",
  "Rajasthan Royals": "#254AA5", "Punjab Kings": "#D71920",
  "Gujarat Titans": "#1C4E7A", "Lucknow Super Giants": "#004BA0",
  "Kings XI Punjab": "#D71920", "Deccan Chargers": "#FF822A",
};
function tc(name) {
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (name?.includes(k.split(" ")[0])) return v;
  }
  return "#00e5ff";
}
function ts(name) {
  if (!name) return "??";
  const p = name.trim().split(" ");
  return p.length >= 3 ? (p[0][0] + p[1][0] + p[2][0]).toUpperCase() : name.slice(0, 3).toUpperCase();
}

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchMeta, setMatchMeta] = useState(null);
  const [activeInnings, setActiveInnings] = useState(1);
  const [inningsData, setInningsData] = useState(null);
  const [loadingInnings, setLoadingInnings] = useState(false);
  const [ballData, setBallData] = useState(null);
  const [viewMode, setViewMode] = useState("wickets"); // "wickets" | "overs"

  // Load match metadata + ball data on mount
  useEffect(() => {
    setLoading(true);
    const mId = parseInt(matchId);
    Promise.all([
      fetch(`${API}/api/metadata/match/${mId}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/match/${mId}/balls`).then(r => r.json()).catch(() => null),
    ]).then(([meta, balls]) => {
      if (!meta) { setError("Could not load match. Is backend running?"); setLoading(false); return; }
      setMatchMeta(meta);
      setBallData(balls);
      setLoading(false);
    });
  }, [matchId]);

  // Load innings detail when innings changes
  useEffect(() => {
    if (!matchId) return;
    setLoadingInnings(true);
    fetch(`${API}/api/match/${parseInt(matchId)}/innings-detail?innings=${activeInnings}`)
      .then(r => r.json())
      .then(data => { setInningsData(data); setLoadingInnings(false); })
      .catch(() => { setInningsData(null); setLoadingInnings(false); });
  }, [matchId, activeInnings]);

  if (loading) return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#00e5ff] border-t-transparent animate-spin" />
      <p className="text-[#00e5ff] font-mono text-sm tracking-widest">LOADING MATCH DATA...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <div className="text-center glass rounded-2xl p-12 max-w-md">
        <h1 className="text-[#ff3b5c] font-black text-2xl mb-4 tracking-widest">ERROR</h1>
        <p className="text-[#94a3b8] font-mono text-sm mb-8">{error}</p>
        <button onClick={() => router.push("/matches")} className="px-6 py-3 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-mono text-sm hover:bg-[#00e5ff]/20 transition-all">← Back</button>
      </div>
    </div>
  );

  const inn1 = ballData?.["1"];
  const inn2 = ballData?.["2"];
  const team1Name = inn1?.battingTeam || matchMeta?.team1?.name || "Team 1";
  const team2Name = inn2?.battingTeam || inn1?.bowlingTeam || matchMeta?.team2?.name || "Team 2";
  const team1Color = tc(team1Name);
  const team2Color = tc(team2Name);
  const wickets = inningsData?.wicketEvents || [];
  const overs = inningsData?.overSummaries || [];

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050a18]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-[#00e5ff] font-black text-lg tracking-tight hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">◈ COUNTERPLAY</a>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg font-black text-xs text-white" style={{ background: team1Color + "33", border: `1px solid ${team1Color}55` }}>{ts(team1Name)}</span>
            <span className="text-[#6b7280] text-xs font-black italic">VS</span>
            <span className="px-3 py-1 rounded-lg font-black text-xs text-white" style={{ background: team2Color + "33", border: `1px solid ${team2Color}55` }}>{ts(team2Name)}</span>
          </div>
          <button onClick={() => router.push("/matches")} className="text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#ff3b5c] transition-colors border border-[#6b7280]/20 hover:border-[#ff3b5c]/40 px-3 py-1.5 rounded-full">← BACK</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Match Score Header */}
        <div className="glass rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-sm text-white mb-1" style={{ background: team1Color }}>{ts(team1Name)}</div>
              <p className="text-white font-black text-xl">{inn1?.totalScore ?? "—"}<span className="text-[#6b7280] text-sm">/{inn1?.totalWickets ?? "—"}</span></p>
            </div>
            <span className="text-[#6b7280] text-2xl font-black italic">vs</span>
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-sm text-white mb-1" style={{ background: team2Color }}>{ts(team2Name)}</div>
              <p className="text-white font-black text-xl">{inn2?.totalScore ?? "—"}<span className="text-[#6b7280] text-sm">/{inn2?.totalWickets ?? "—"}</span></p>
            </div>
          </div>
          <div className="text-right">
            {matchMeta?.venue && <p className="text-[10px] font-mono text-[#6b7280]">{matchMeta.venue}</p>}
            {matchMeta?.winner && <p className="text-[#00ff88] font-bold text-sm mt-1">🏆 {matchMeta.winner}</p>}
          </div>
        </div>

        {/* Innings Tabs */}
        <div className="flex gap-3 mb-6">
          {[1, 2].map(n => {
            const inn = n === 1 ? inn1 : inn2;
            if (!inn) return null;
            const color = tc(inn.battingTeam);
            const active = activeInnings === n;
            return (
              <button key={n} onClick={() => setActiveInnings(n)}
                className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 border ${active ? "text-white scale-[1.01]" : "glass-light text-[#6b7280] hover:text-white"}`}
                style={active ? { background: color + "22", borderColor: color + "80", boxShadow: `0 0 16px ${color}20` } : { borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {inn.battingTeam}
                  <span className="text-xs font-mono opacity-70">{inn.totalScore}/{inn.totalWickets}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          {[{ key: "wickets", label: "🔴 Fall of Wickets", count: wickets.length }, { key: "overs", label: "📊 Over-by-Over", count: overs.length }].map(({ key, label, count }) => (
            <button key={key} onClick={() => setViewMode(key)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${viewMode === key ? "bg-[#00e5ff]/10 border-[#00e5ff]/40 text-[#00e5ff]" : "glass-light border-white/[0.06] text-[#6b7280] hover:text-white"}`}>
              {label} <span className="text-xs opacity-60 ml-1">({count})</span>
            </button>
          ))}
        </div>

        {loadingInnings ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#00e5ff] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-[#6b7280] font-mono text-sm">Loading innings data...</p>
          </div>
        ) : viewMode === "wickets" ? (
          /* ─── WICKETS VIEW ─── */
          <div className="space-y-3">
            {wickets.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center"><p className="text-[#6b7280] font-mono text-sm">No wickets in this innings.</p></div>
            )}
            {wickets.map((w, i) => (
              <div key={i} className="glass rounded-2xl p-4 sm:p-5 border border-[#ff3b5c]/10 hover:border-[#ff3b5c]/30 transition-all animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: "forwards" }}>
                <div className="flex items-start gap-4">
                  {/* Wicket Number Badge */}
                  <div className="w-11 h-11 rounded-full bg-[#ff3b5c]/15 border border-[#ff3b5c]/40 flex items-center justify-center shrink-0">
                    <span className="text-[#ff3b5c] font-black text-sm">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-white font-bold text-base">{w.dismissed}</h3>
                        <p className="text-[#ff3b5c] text-xs font-mono capitalize">{w.howOut.replace(/_/g, " ")} • b {w.bowler}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-black text-lg">{w.scoreAt}</p>
                        <p className="text-[#6b7280] text-[10px] font-mono">Over {w.overBall}</p>
                      </div>
                    </div>
                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-mono glass-light text-[#94a3b8]">
                        🎯 {w.ballsBowled} balls bowled
                      </span>
                      {w.target && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-mono glass-light text-[#00e5ff]">
                          Target: {w.target}
                        </span>
                      )}
                      {w.runsRemaining !== null && (
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-mono glass-light ${w.runsRemaining > 80 ? "text-[#ff3b5c]" : w.runsRemaining > 40 ? "text-[#ffd700]" : "text-[#00ff88]"}`}>
                          {w.runsRemaining} runs needed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ─── OVERS VIEW ─── */
          <div className="space-y-2">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 text-[9px] font-mono text-[#6b7280] uppercase tracking-widest">
              <span className="col-span-1">Over</span>
              <span className="col-span-2">Score</span>
              <span className="col-span-1">Runs</span>
              <span className="col-span-1">CRR</span>
              <span className="col-span-1">RRR</span>
              <span className="col-span-2">Striker</span>
              <span className="col-span-2">Non-Striker</span>
              <span className="col-span-2">Next Bowler</span>
            </div>
            {overs.map((o, i) => {
              const overColor = o.wicketsInOver > 0 ? "#ff3b5c" : o.runsInOver >= 12 ? "#ffd700" : o.runsInOver >= 8 ? "#00e5ff" : o.runsInOver <= 3 ? "#6b7280" : "#00ff88";
              return (
                <div key={i}
                  className="glass rounded-xl p-3 sm:p-4 hover:border-white/20 transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms`, opacity: 0, animationFillMode: "forwards", borderLeft: `3px solid ${overColor}` }}>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1">
                      <span className="text-white font-black text-sm">{o.overDisplay}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-white font-bold text-sm">{o.scoreAt}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-black text-sm" style={{ color: overColor }}>
                        {o.runsInOver}{o.wicketsInOver > 0 && <span className="text-[#ff3b5c] text-[10px]"> ({o.wicketsInOver}W)</span>}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-[#94a3b8] text-xs font-mono">{o.runRate}</span>
                    </div>
                    <div className="col-span-1">
                      {o.requiredRR !== null ? (
                        <span className={`text-xs font-mono font-bold ${o.requiredRR > 10 ? "text-[#ff3b5c]" : o.requiredRR > 8 ? "text-[#ffd700]" : "text-[#00ff88]"}`}>{o.requiredRR}</span>
                      ) : <span className="text-[#6b7280] text-xs">—</span>}
                    </div>
                    <div className="col-span-2">
                      <span className="text-white text-xs truncate block">{o.striker}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#94a3b8] text-xs truncate block">{o.nonStriker}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#00e5ff] text-xs truncate block">{o.nextBowler || "—"}</span>
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black">Over {o.overDisplay}</span>
                      <span className="text-white font-bold">{o.scoreAt}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded glass-light" style={{ color: overColor }}>{o.runsInOver} runs{o.wicketsInOver > 0 && ` · ${o.wicketsInOver}W`}</span>
                      <span className="px-2 py-0.5 rounded glass-light text-[#94a3b8]">CRR {o.runRate}</span>
                      {o.requiredRR !== null && <span className={`px-2 py-0.5 rounded glass-light ${o.requiredRR > 10 ? "text-[#ff3b5c]" : "text-[#00ff88]"}`}>RRR {o.requiredRR}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-white">⚡ {o.striker}</span>
                      <span className="text-[#94a3b8]">🏏 {o.nonStriker}</span>
                      {o.nextBowler && <span className="text-[#00e5ff]">🎯 {o.nextBowler}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 text-center">
          <button onClick={() => router.push(`/simulation/${matchId}`)}
            className="px-8 py-4 rounded-2xl font-black text-sm tracking-widest text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #00e5ff, #a855f7)", boxShadow: "0 0 30px rgba(0,229,255,0.25)" }}>
            ⚡ ENTER SIMULATION MODE
          </button>
        </div>
      </main>
    </div>
  );
}
