"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:8000";

// ─── Colour helpers ─────────────────────────────────────────
const TEAM_COLORS = {
  "Mumbai Indians": "#004BA0",
  "Chennai Super Kings": "#FCCA06",
  "Royal Challengers Bangalore": "#D4213D",
  "Kolkata Knight Riders": "#3A225D",
  "Sunrisers Hyderabad": "#FF822A",
  "Delhi Capitals": "#0078BC",
  "Rajasthan Royals": "#254AA5",
  "Punjab Kings": "#D71920",
  "Gujarat Titans": "#1C4E7A",
  "Lucknow Super Giants": "#004BA0",
  "Deccan Chargers": "#FF822A",
  "Rising Pune Supergiants": "#6A0DAD",
  "Pune Warriors": "#003087",
  "Kochi Tuskers Kerala": "#E05C00",
  "Kings XI Punjab": "#D71920",
};
function teamColor(name) {
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (name?.includes(k.split(" ")[0])) return v;
  }
  return "#00e5ff";
}
function teamShort(name) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 3) return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

// ─── Ball colour/label ───────────────────────────────────────
function ballStyle(ball, isSimulated = false, isSelected = false) {
  let bg, border, text;
  if (ball.isWicket) {
    bg = "rgba(255,59,92,0.25)"; border = "#ff3b5c"; text = "#ff3b5c";
  } else if (ball.totalRuns === 6) {
    bg = "rgba(255,215,0,0.2)"; border = "#ffd700"; text = "#ffd700";
  } else if (ball.totalRuns === 4) {
    bg = "rgba(0,229,255,0.2)"; border = "#00e5ff"; text = "#00e5ff";
  } else if (ball.extraType === "wide" || ball.extraType === "nb") {
    bg = "rgba(168,85,247,0.2)"; border = "#a855f7"; text = "#a855f7";
  } else if (ball.totalRuns === 0) {
    bg = "rgba(255,255,255,0.05)"; border = "rgba(255,255,255,0.12)"; text = "#6b7280";
  } else {
    bg = "rgba(0,255,136,0.1)"; border = "rgba(0,255,136,0.35)"; text = "#00ff88";
  }
  if (isSimulated) { border = "#a855f7"; bg = "rgba(168,85,247,0.15)"; }
  if (isSelected) { border = "#fff"; bg = "rgba(255,255,255,0.15)"; }
  return { bg, border, text };
}

function ballLabel(ball) {
  if (ball.isWicket) return "W";
  if (ball.extraType === "wide") return "Wd";
  if (ball.extraType === "nb") return "NB";
  return String(ball.totalRuns ?? 0);
}

// ─── Commentary generator for simulated balls ────────────────
const COMMENTARY = {
  "0": ["Dot ball. Defended solidly.", "No run. Tight line, past the outside edge.", "Beaten! Good delivery.", "Dot. Full and straight, blocked back."],
  "1": ["Nudged to mid-on for one.", "Pushed to cover, quick single.", "Flicked fine, easy single taken."],
  "2": ["Driven to long-off, two runs.", "Through the gap at cover! Two!", "Good running, two taken."],
  "3": ["Three! Misfield at the deep."],
  "4": ["FOUR! Cracked through the covers!", "FOUR! Pulled hard behind square!", "FOUR! Driven to the rope!", "FOUR! Short and wide, cut away!"],
  "6": ["SIX! Launched into the stands!", "SIX! Massive hit over long-on!", "SIX! Stepped out and lofted it!", "SIX! Pure power off the sweet spot!"],
  "W": ["OUT! Caught in the deep!", "WICKET! Bowled through the gate!", "OUT! LBW! Finger raised!", "OUT! Caught behind! Thin edge!"],
  "wide": ["Wide! Down leg side.", "Wide ball called."],
  "no_ball": ["No ball! Free hit to follow!", "Overstepped — no ball!"],
};
function randomCommentary(outcome, batter, bowler) {
  const key = outcome === "W" ? "W" : outcome === "wide" ? "wide" : outcome === "no_ball" ? "no_ball" : outcome;
  const arr = COMMENTARY[key] || COMMENTARY["0"];
  const line = arr[Math.floor(Math.random() * arr.length)];
  if (outcome === "4" || outcome === "6") return `${line} ${batter} goes after ${bowler}!`;
  if (outcome === "W") return `${line} ${batter} departs.`;
  return line;
}

// ─── Main Component ──────────────────────────────────────────
export default function SimulationPage() {
  const { matchId } = useParams();
  const router = useRouter();

  // ── Data state
  const [matchMeta, setMatchMeta] = useState(null);
  const [innings, setInnings] = useState(null);   // { "1": {...}, "2": {...} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── UI state
  const [activeInnings, setActiveInnings] = useState(1);
  const [selectedBall, setSelectedBall] = useState(null);  // ball object from innings data
  const [selectedBallIdx, setSelectedBallIdx] = useState(null);

  // ── What-If override
  const [outcomeOverride, setOutcomeOverride] = useState(null); // null | "0"|"1"|"2"|"3"|"4"|"6"|"W"|"wide"|"nb"
  const [newStriker, setNewStriker] = useState("");
  const [newBowler, setNewBowler] = useState("");
  const [rosters, setRosters] = useState(null);

  // ── Simulation state
  const [simMode, setSimMode] = useState(false);           // true = simulation running or paused
  const [simBalls, setSimBalls] = useState([]);            // accumulating simulated balls
  const [simRunning, setSimRunning] = useState(false);
  const [simScore, setSimScore] = useState(null);          // { runs, wickets, legalBalls }
  const [simResult, setSimResult] = useState(null);        // final result from backend
  const [simSpeed, setSimSpeed] = useState(700);           // ms per ball
  const [winnerDeclared, setWinnerDeclared] = useState(null);

  const simIntervalRef = useRef(null);
  const simQueueRef = useRef([]);
  const simStateRef = useRef(null);  // live sim state for win checks
  const bottomRef = useRef(null);

  // ── Fetch match metadata + balls + rosters ───────────────────
  useEffect(() => {
    setLoading(true);
    const mId = parseInt(matchId);
    Promise.all([
      fetch(`${API}/api/metadata/match/${mId}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/match/${mId}/balls`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/match/${mId}/rosters`).then(r => r.json()).catch(() => null),
    ]).then(([meta, ballData, rosterData]) => {
      if (!meta || !ballData) { setError("Could not load match data. Ensure the backend is running."); setLoading(false); return; }
      setMatchMeta(meta);
      setInnings(ballData);
      setRosters(rosterData);
      setLoading(false);
    });
  }, [matchId]);

  // ── Auto-scroll to bottom as sim plays ─────────────────────
  useEffect(() => {
    if (simRunning) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simBalls, simRunning]);

  // ── Simulation runner ─────────────────────────────────────
  const stopSim = useCallback(() => {
    clearInterval(simIntervalRef.current);
    setSimRunning(false);
  }, []);

  const startSimTick = useCallback(() => {
    clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => {
      if (simQueueRef.current.length === 0) {
        clearInterval(simIntervalRef.current);
        setSimRunning(false);
        return;
      }
      const next = simQueueRef.current.shift();
      setSimBalls(prev => [...prev, next]);
      simStateRef.current = next;

      // Check win/loss condition
      const st = simStateRef.current;
      if (st.target && st.score >= st.target) {
        clearInterval(simIntervalRef.current);
        setSimRunning(false);
        setWinnerDeclared({ team: st.battingTeam, type: "chase", score: st.score, wickets: st.wickets });
        return;
      }
      if (st.wickets >= 10 || st.legalBalls >= 120) {
        clearInterval(simIntervalRef.current);
        setSimRunning(false);
        if (st.target) {
          setWinnerDeclared({ team: st.bowlingTeam, type: "defend", score: st.score, wickets: st.wickets, target: st.target });
        }
        return;
      }
    }, simSpeed);
    setSimRunning(true);
  }, [simSpeed]);

  const handleSimulate = useCallback(async () => {
    if (!selectedBall) return;
    stopSim();
    setSimBalls([]);
    setWinnerDeclared(null);

    const inningsNum = activeInnings;
    const runsOverride = outcomeOverride === "W" ? 0
      : outcomeOverride === "wide" ? 1
        : outcomeOverride === "nb" ? 1
          : outcomeOverride !== null ? parseInt(outcomeOverride) : null;

    try {
      const res = await fetch(`${API}/api/match/${matchId}/simulate-from`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: parseInt(matchId),
          innings: inningsNum,
          over: selectedBall.over,
          ball_no: selectedBall.ball,
          new_runs: runsOverride,
          force_wicket: outcomeOverride === "W",
          new_striker: newStriker || null,
          new_bowler: newBowler || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Simulation Error");
      
      setSimResult(data);
      setSimMode(true);

      const inningsData = innings[String(inningsNum)];
      const target = inningsNum === 2 ? (innings["1"]?.totalScore + 1 || null) : null;

      let score = data.startScore;
      let wickets = data.startWickets;
      let legalBalls = data.startBalls;

      const isOvWide = outcomeOverride === "wide";
      const isOvNb = outcomeOverride === "nb";
      const isOvLegal = !isOvWide && !isOvNb;

      // Add the override ball first
      const overrideBall = {
        over: selectedBall.over,
        ball: selectedBall.ball,
        outcome: outcomeOverride,
        runs: runsOverride ?? selectedBall.totalRuns,
        isWicket: outcomeOverride === "W",
        extraType: isOvWide ? "wide" : isOvNb ? "nb" : null,
        totalRuns: runsOverride ?? selectedBall.totalRuns,
        score: score + (runsOverride ?? 0),
        wickets: wickets + (outcomeOverride === "W" ? 1 : 0),
        legalBalls: legalBalls + (isOvLegal ? 1 : 0),
        target,
        striker: newStriker || selectedBall.striker,
        bowler: newBowler || selectedBall.bowler,
        battingTeam: inningsData?.battingTeam || "",
        bowlingTeam: inningsData?.bowlingTeam || "",
        commentary: outcomeOverride
          ? randomCommentary(outcomeOverride === "W" ? "W" : String(runsOverride ?? 0), newStriker || selectedBall.striker, newBowler || selectedBall.bowler)
          : selectedBall.commentary || "",
        isSimulated: true,
        isOverride: true,
      };
      
      score = overrideBall.score;
      wickets = overrideBall.wickets;
      legalBalls = overrideBall.legalBalls;

      const queue = [overrideBall];

      // Build from backend ball log
      for (const entry of (data.ballLog || [])) {
        if (target && score >= target) break;
        if (wickets >= 10 || legalBalls >= 120) break;

        const outcome = entry.outcome;
        const isWicket = outcome === "W";
        const isWide = outcome === "wide";
        const isNB = outcome === "no_ball";
        const isLegal = !isWide && !isNB;
        const runsThisBall = isWide || isNB ? 1 : isWicket ? 0 : parseInt(outcome) || 0;

        score += runsThisBall;
        if (isWicket) wickets++;
        if (isLegal) legalBalls++;

        // Correct display of over.ball
        const overNum = Math.floor((legalBalls - 1) / 6) + 1;
        const ballInOver = ((legalBalls - 1) % 6) + 1;

        queue.push({
          over: isLegal ? overNum : Math.floor(legalBalls / 6) + 1,
          ball: isLegal ? ballInOver : (legalBalls % 6) + 1,
          outcome,
          runs: runsThisBall,
          isWicket,
          extraType: isWide ? "wide" : isNB ? "nb" : null,
          totalRuns: runsThisBall,
          score,
          wickets,
          legalBalls,
          target,
          striker: entry.striker || "The Batter",
          bowler: entry.bowler || "The Bowler",
          battingTeam: inningsData?.battingTeam || "",
          bowlingTeam: inningsData?.bowlingTeam || "",
          commentary: entry.commentary || randomCommentary(outcome, entry.striker, entry.bowler),
          isSimulated: true,
          isOverride: false,
        });
      }

      simQueueRef.current = queue;
      simStateRef.current = null;
      startSimTick();
    } catch (err) {
      console.error("Simulation error:", err);
      setError("Simulation failed: " + err.message);
    }
  }, [selectedBall, activeInnings, outcomeOverride, matchId, innings, startSimTick, stopSim]);

  // ── Pause & resume
  const handlePause = () => stopSim();
  const handleResume = () => startSimTick();

  // ── Change another ball mid-sim
  const handleChangeBall = () => {
    stopSim();
    setSimMode(false);
    setSimBalls([]);
    setWinnerDeclared(null);
    setOutcomeOverride(null);
  };

  // ── Render helpers ────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#00e5ff] border-t-transparent animate-spin" />
      <p className="text-[#00e5ff] font-mono text-sm tracking-widest">LOADING MATCH DATA...</p>
    </div>
  );

  if (error || !innings) return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <div className="text-center glass rounded-2xl p-12 max-w-md">
        <h1 className="text-[#ff3b5c] font-black text-2xl mb-4 tracking-widest">TIMELINE CORRUPTED</h1>
        <p className="text-[#94a3b8] font-mono text-sm mb-8">{error || "Match data not found."}</p>
        <button onClick={() => router.push("/matches")} className="px-6 py-3 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-mono text-sm hover:bg-[#00e5ff]/20 transition-all">
          ← Back to Archives
        </button>
      </div>
    </div>
  );

  const inningsKeys = Object.keys(innings).filter(k => k === "1" || k === "2").map(Number).sort();
  const currentInnings = innings[String(activeInnings)];
  const innings1 = innings["1"];
  const innings2 = innings["2"];
  const team1Color = teamColor(innings1?.battingTeam);
  const team2Color = innings2 ? teamColor(innings2?.battingTeam) : teamColor(innings1?.bowlingTeam);
  const team1Name = innings1?.battingTeam || matchMeta?.team1?.name || "Team 1";
  const team2Name = innings2?.battingTeam || innings1?.bowlingTeam || matchMeta?.team2?.name || "Team 2";

  // Group balls by over for rendering
  function groupByOver(balls) {
    const map = {};
    if (!balls) return map;
    for (const b of balls) {
      if (!map[b.over]) map[b.over] = [];
      map[b.over].push(b);
    }
    return map;
  }
  const ballsByOver = groupByOver(currentInnings?.balls || []);
  const overNums = Object.keys(ballsByOver).map(Number).sort((a, b) => a - b);

  // Calculate run rate
  const liveScore = simRunning || simBalls.length > 0
    ? simBalls[simBalls.length - 1]
    : null;

  const displayScore = liveScore
    ? `${liveScore.score}/${liveScore.wickets}`
    : currentInnings
      ? `${currentInnings.totalScore}/${currentInnings.totalWickets}`
      : "—";

  const target = activeInnings === 2 && innings1 ? innings1.totalScore + 1 : null;

  return (
    <div className="min-h-screen grid-bg">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050a18]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-[#00e5ff] font-black text-lg tracking-tight group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">
              ◈ COUNTERPLAY
            </span>
          </a>

          {/* Team vs Team pill */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="px-2 sm:px-3 py-1 rounded-lg font-black text-xs sm:text-sm text-white truncate max-w-[80px] sm:max-w-none" style={{ background: team1Color + "33", border: `1px solid ${team1Color}55` }}>
              {teamShort(team1Name)}
            </span>
            <span className="text-[#6b7280] text-xs font-black italic shrink-0">VS</span>
            <span className="px-2 sm:px-3 py-1 rounded-lg font-black text-xs sm:text-sm text-white truncate max-w-[80px] sm:max-w-none" style={{ background: team2Color + "33", border: `1px solid ${team2Color}55` }}>
              {teamShort(team2Name)}
            </span>
            {matchMeta?.venue && (
              <span className="hidden md:block text-[10px] text-[#6b7280] font-mono truncate max-w-[180px]">• {matchMeta.venue}</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => router.push("/matches")}
              className="text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#ff3b5c] transition-colors border border-[#6b7280]/20 hover:border-[#ff3b5c]/40 px-3 py-1.5 rounded-full">
              [ESC] EXIT
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 flex flex-col lg:flex-row gap-5">

        {/* ══════════════════════════════════════════════════
            LEFT COLUMN — Ball Timeline
        ══════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0">

          {/* ── Innings Tabs ──────────────────────────────── */}
          <div className="flex gap-2 mb-5">
            {inningsKeys.map(n => {
              const inn = innings[String(n)];
              const tc = teamColor(inn?.battingTeam);
              return (
                <button key={n}
                  onClick={() => { setActiveInnings(n); setSelectedBall(null); setSelectedBallIdx(null); setOutcomeOverride(null); if (simMode) handleChangeBall(); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 border ${activeInnings === n ? "text-white scale-[1.01]" : "glass-light text-[#6b7280] hover:text-white"}`}
                  style={activeInnings === n ? { background: tc + "22", borderColor: tc + "80", boxShadow: `0 0 16px ${tc}20` } : { borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: tc }} />
                    {n === 1 ? "1st Innings" : "2nd Innings"}
                    {inn && <span className="text-xs font-mono opacity-70 ml-1">{inn.totalScore}/{inn.totalWickets}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Innings Score Banner ────────────────────── */}
          {currentInnings && (
            <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-[#6b7280] tracking-widest uppercase mb-1">Batting</p>
                <p className="text-white font-black text-lg">{currentInnings.battingTeam}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">{currentInnings.totalScore}<span className="text-[#6b7280] text-lg">/{currentInnings.totalWickets}</span></p>
                {target && activeInnings === 2 && (
                  <p className="text-xs font-mono text-[#94a3b8]">
                    Target: <span className="text-[#00e5ff]">{target}</span>
                    {" · "}
                    {currentInnings.totalScore >= target
                      ? <span className="text-[#00ff88]">Won</span>
                      : <span className="text-[#ff3b5c]">{target - currentInnings.totalScore} short</span>
                    }
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Ball Grid — Over by Over ─────────────────── */}
          <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#6b7280] tracking-widest uppercase">
                Click any ball to alter the timeline
              </span>
              {selectedBall && !simMode && (
                <span className="text-[10px] font-mono text-[#00e5ff]">
                  Over {selectedBall.over}.{selectedBall.ball} selected
                </span>
              )}
            </div>

            {overNums.map(overNum => {
              const overBalls = ballsByOver[overNum] || [];
              const lastBall = overBalls[overBalls.length - 1];
              return (
                <div key={overNum} className="flex items-center gap-2 sm:gap-3">
                  {/* Over label */}
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#4b5563] w-8 shrink-0 text-right">
                    Ov {overNum}
                  </span>

                  {/* Balls */}
                  <div className="flex gap-1 flex-wrap">
                    {overBalls.map((ball, bi) => {
                      const isSelected = selectedBallIdx === `${activeInnings}-${overNum}-${bi}`;
                      const style = ballStyle(ball, false, isSelected);
                      return (
                        <button
                          key={bi}
                          id={`ball-${activeInnings}-${overNum}-${bi}`}
                          disabled={simMode}
                          onClick={() => {
                            setSelectedBall(ball);
                            setSelectedBallIdx(`${activeInnings}-${overNum}-${bi}`);
                            setOutcomeOverride(null);
                          }}
                          title={`Over ${ball.over}.${ball.ball} — ${ball.striker} vs ${ball.bowler}`}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-all duration-200 ${simMode ? "opacity-40 cursor-not-allowed" : "hover:scale-110 cursor-pointer"} ${isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-[#050a18] scale-110" : ""}`}
                          style={{ background: style.bg, border: `1.5px solid ${style.border}`, color: style.text }}
                        >
                          {ballLabel(ball)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Over end score */}
                  {lastBall && (
                    <span className="text-[9px] font-mono text-[#4b5563] ml-auto shrink-0">
                      {lastBall.cumScore}/{lastBall.cumWickets}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT COLUMN — Controls + Simulation Feed
        ══════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-4">

          {/* ── Selected Ball Info ─────────────────────── */}
          {!simMode && (
            <div className={`glass rounded-2xl p-5 transition-all duration-300 ${selectedBall ? "border border-[#00e5ff]/20 shadow-[0_0_20px_rgba(0,229,255,0.07)]" : "border border-white/[0.06]"}`}>
              {!selectedBall ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="text-[#94a3b8] font-mono text-sm">Select a ball from the timeline to begin your what-if scenario</p>
                </div>
              ) : (
                <>
                  {/* Ball header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-mono text-[#6b7280] tracking-widest uppercase">Selected Ball</p>
                      <h2 className="text-2xl font-black text-white">Over {selectedBall.over}.{selectedBall.ball}</h2>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black`}
                      style={(() => { const s = ballStyle(selectedBall); return { background: s.bg, border: `2px solid ${s.border}`, color: s.text }; })()}>
                      {ballLabel(selectedBall)}
                    </div>
                  </div>

                  {/* Players / Substitution */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="glass-light rounded-xl p-3">
                      <p className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">⚡ Striker</p>
                      {rosters ? (
                        <select 
                          value={newStriker || selectedBall.striker}
                          onChange={(e) => setNewStriker(e.target.value)}
                          className="w-full bg-transparent text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value={selectedBall.striker} className="bg-[#050a18]">{selectedBall.striker} (Original)</option>
                          {(activeInnings === 1 ? rosters.team1.players : rosters.team2.players)
                            .filter(p => p !== selectedBall.striker)
                            .map(p => <option key={p} value={p} className="bg-[#050a18]">{p}</option>)
                          }
                        </select>
                      ) : (
                        <p className="text-white text-xs font-bold truncate">{selectedBall.striker || "—"}</p>
                      )}
                    </div>
                    <div className="glass-light rounded-xl p-3">
                      <p className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">🎯 Bowler</p>
                      {rosters ? (
                        <select 
                          value={newBowler || selectedBall.bowler}
                          onChange={(e) => setNewBowler(e.target.value)}
                          className="w-full bg-transparent text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value={selectedBall.bowler} className="bg-[#050a18]">{selectedBall.bowler} (Original)</option>
                          {(activeInnings === 1 ? rosters.team2.players : rosters.team1.players)
                            .filter(p => p !== selectedBall.bowler)
                            .map(p => <option key={p} value={p} className="bg-[#050a18]">{p}</option>)
                          }
                        </select>
                      ) : (
                        <p className="text-white text-xs font-bold truncate">{selectedBall.bowler || "—"}</p>
                      )}
                    </div>
                  </div>

                  {/* Actual outcome */}
                  <div className="glass-light rounded-xl p-3 mb-4">
                    <p className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">What Actually Happened</p>
                    <p className="text-white text-sm font-semibold">
                      {selectedBall.isWicket
                        ? "🔴 WICKET"
                        : selectedBall.extraType === "wide"
                          ? "🟣 Wide (+1)"
                          : selectedBall.extraType === "nb"
                            ? "🟣 No Ball (+1)"
                            : `${selectedBall.totalRuns} run${selectedBall.totalRuns !== 1 ? "s" : ""}`
                      }
                      {" "}
                      <span className="text-[#94a3b8] font-normal text-xs">
                        (Score: {selectedBall.cumScore}/{selectedBall.cumWickets})
                      </span>
                    </p>
                  </div>

                  {/* Outcome override buttons */}
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-[#00e5ff] tracking-widest uppercase mb-3">Change the Outcome</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: "•", val: "0", desc: "Dot", color: "#6b7280" },
                        { label: "1", val: "1", desc: "1 Run", color: "#00ff88" },
                        { label: "2", val: "2", desc: "2 Runs", color: "#00ff88" },
                        { label: "3", val: "3", desc: "3 Runs", color: "#00ff88" },
                        { label: "4", val: "4", desc: "Four", color: "#00e5ff" },
                        { label: "6", val: "6", desc: "Six", color: "#ffd700" },
                        { label: "W", val: "W", desc: "Wicket", color: "#ff3b5c" },
                        { label: "Wd", val: "wide", desc: "Wide", color: "#a855f7" },
                        { label: "NB", val: "nb", desc: "No Ball", color: "#a855f7" },
                        { label: "↺", val: null, desc: "Keep Original", color: "#6b7280" },
                      ].map(({ label, val, desc, color }) => (
                        <button
                          key={desc}
                          onClick={() => setOutcomeOverride(val)}
                          title={desc}
                          className={`py-2 rounded-lg text-xs font-black transition-all duration-200 ${outcomeOverride === val ? "scale-105 ring-2 ring-offset-1 ring-offset-[#050a18]" : "hover:scale-105 opacity-70 hover:opacity-100"}`}
                          style={{
                            background: outcomeOverride === val ? color + "28" : "rgba(255,255,255,0.05)",
                            border: `1.5px solid ${outcomeOverride === val ? color : "rgba(255,255,255,0.1)"}`,
                            color: outcomeOverride === val ? color : "#94a3b8",
                            ringColor: color,
                          }}
                        >
                          {label}
                          <span className="block text-[8px] font-normal mt-0.5 opacity-70">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed selector */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider">Sim Speed</span>
                    {[{ label: "Fast", ms: 300 }, { label: "Normal", ms: 700 }, { label: "Slow", ms: 1200 }].map(s => (
                      <button key={s.ms}
                        onClick={() => setSimSpeed(s.ms)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono transition-all ${simSpeed === s.ms ? "bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30" : "glass-light text-[#6b7280] border border-white/10 hover:text-white"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Simulate button */}
                  <button
                    onClick={handleSimulate}
                    className="w-full py-3.5 rounded-xl font-black text-sm tracking-widest text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #00e5ff, #a855f7)", boxShadow: "0 0 24px rgba(0,229,255,0.25)" }}
                  >
                    ⚡ SIMULATE FROM THIS BALL
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Simulation Controls (when sim is active) ── */}
          {simMode && (
            <div className="glass rounded-2xl p-4 border border-[#a855f7]/20 shadow-[0_0_20px_rgba(168,85,247,0.08)]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-mono text-[#a855f7] tracking-widest uppercase">Alternate Timeline</p>
                  <h3 className="text-white font-black text-sm">
                    Simulating from Over {selectedBall?.over}.{selectedBall?.ball}
                    {outcomeOverride && <span className="text-[#a855f7] ml-1">({outcomeOverride === "W" ? "Wicket" : outcomeOverride === "wide" ? "Wide" : `${outcomeOverride} runs`} override)</span>}
                  </h3>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${simRunning ? "bg-[#00ff88] animate-pulse" : "bg-[#ff3b5c]"}`} />
              </div>

              <div className="flex gap-2 mb-3">
                {simRunning
                  ? <button onClick={handlePause} className="flex-1 py-2 rounded-xl border border-[#ff6b35]/30 text-[#ff6b35] text-xs font-mono font-bold hover:bg-[#ff6b35]/10 transition-all">⏸ PAUSE</button>
                  : <button onClick={handleResume} disabled={winnerDeclared !== null} className="flex-1 py-2 rounded-xl border border-[#00ff88]/30 text-[#00ff88] text-xs font-mono font-bold hover:bg-[#00ff88]/10 transition-all disabled:opacity-40">▶ RESUME</button>
                }
                <button onClick={handleChangeBall} className="flex-1 py-2 rounded-xl border border-[#00e5ff]/30 text-[#00e5ff] text-xs font-mono font-bold hover:bg-[#00e5ff]/10 transition-all">↺ CHANGE BALL</button>
              </div>

              {/* Speed during sim */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#6b7280] uppercase">Speed</span>
                {[{ label: "Fast", ms: 300 }, { label: "Normal", ms: 700 }, { label: "Slow", ms: 1200 }].map(s => (
                  <button key={s.ms}
                    onClick={() => { setSimSpeed(s.ms); if (simRunning) { stopSim(); setTimeout(startSimTick, 50); } }}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-mono transition-all ${simSpeed === s.ms ? "bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30" : "glass-light text-[#6b7280] border border-white/10"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Winner Banner ──────────────────────────── */}
          {winnerDeclared && (
            <div className="glass rounded-2xl p-5 border animate-scale-in"
              style={{ borderColor: teamColor(winnerDeclared.team) + "80", boxShadow: `0 0 32px ${teamColor(winnerDeclared.team)}25` }}>
              <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: teamColor(winnerDeclared.team) }}>
                In This Alternate Timeline
              </p>
              <h2 className="text-white font-black text-xl mb-1">{winnerDeclared.team}</h2>
              <p className="text-[#94a3b8] text-sm">
                {winnerDeclared.type === "chase"
                  ? `Successfully chased ${winnerDeclared.target} — scored ${winnerDeclared.score}/${winnerDeclared.wickets}`
                  : `Defended the total — batting side fell for ${winnerDeclared.score}/${winnerDeclared.wickets}`
                }
              </p>
            </div>
          )}

          {/* ── Live Simulation Ball Feed ───────────────── */}
          {simMode && (
            <div className="glass rounded-2xl p-4 flex-1 max-h-[500px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-[#a855f7] tracking-widest uppercase">Alternate Ball Feed</p>
                <p className="text-[10px] font-mono text-[#6b7280]">{simBalls.length} balls played</p>
              </div>

              <div className="space-y-1.5">
                {simBalls.map((ball, i) => {
                  const style = ballStyle({ ...ball, totalRuns: ball.runs, isWicket: ball.isWicket, extraType: ball.extraType }, true, false);
                  return (
                    <div key={i}
                      className={`flex items-start gap-2.5 py-2 px-3 rounded-xl animate-fade-in ${ball.isOverride ? "border border-dashed border-[#a855f7]/40 bg-[#a855f7]/05" : "glass-light"}`}>
                      {/* Ball indicator */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                        style={{ background: style.bg, border: `1.5px solid ${style.border}`, color: style.text }}>
                        {ball.isWicket ? "W" : ball.extraType === "wide" ? "Wd" : ball.extraType === "nb" ? "NB" : String(ball.runs)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[9px] font-mono text-[#6b7280]">
                            Over {ball.over}.{ball.ball}
                            {ball.isOverride && <span className="text-[#a855f7] ml-1">• OVERRIDE</span>}
                          </span>
                          <span className="text-[9px] font-mono text-white font-bold shrink-0">
                            {ball.score}/{ball.wickets}
                          </span>
                        </div>
                        <p className="text-xs text-[#c4cad6] leading-relaxed">{ball.commentary}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Live scoreboard */}
              {simBalls.length > 0 && (() => {
                const last = simBalls[simBalls.length - 1];
                const overs = Math.floor(last.legalBalls / 6) + "." + (last.legalBalls % 6);
                const rr = last.legalBalls > 0 ? ((last.score / last.legalBalls) * 6).toFixed(2) : "0.00";
                const rrr = target && last.legalBalls < 120
                  ? (((target - last.score) / Math.max(1, 120 - last.legalBalls)) * 6).toFixed(2)
                  : null;
                return (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[8px] font-mono text-[#6b7280] uppercase">CRR</p>
                      <p className="text-white text-sm font-black">{rr}</p>
                    </div>
                    {rrr && (
                      <div className="text-center">
                        <p className="text-[8px] font-mono text-[#6b7280] uppercase">RRR</p>
                        <p className={`text-sm font-black ${parseFloat(rrr) > 10 ? "text-[#ff3b5c]" : parseFloat(rrr) > 8 ? "text-[#ffd700]" : "text-[#00ff88]"}`}>{rrr}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[8px] font-mono text-[#6b7280] uppercase">Overs</p>
                      <p className="text-white text-sm font-black">{overs}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Scorecard summary ─────────────────────── */}
          {!simMode && innings1 && innings2 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-[10px] font-mono text-[#6b7280] tracking-widest uppercase mb-3">Match Summary</p>
              <div className="space-y-3">
                {[["1", innings1], ["2", innings2]].map(([n, inn]) => (
                  <div key={n} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: teamColor(inn.battingTeam) }} />
                      <span className="text-xs font-semibold text-white">{teamShort(inn.battingTeam)}</span>
                      <span className="text-[9px] font-mono text-[#6b7280]">{n === "1" ? "(1st)" : "(2nd)"}</span>
                    </div>
                    <span className="text-sm font-black text-white">{inn.totalScore}/{inn.totalWickets}</span>
                  </div>
                ))}
                {matchMeta?.winner && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[9px] font-mono text-[#6b7280] uppercase">Original Winner</p>
                    <p className="text-[#00ff88] font-bold text-xs mt-0.5">{matchMeta.winner}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>{/* /right column */}
      </div>
    </div>
  );
}
