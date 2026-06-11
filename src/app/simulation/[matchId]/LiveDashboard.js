import React, { useMemo, useEffect, useRef, useState } from 'react';

const getTeamShort = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 3) {
    return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
  }
  if (name.includes("Mumbai")) return "MI";
  if (name.includes("Punjab")) return "PBKS";
  if (name.includes("Gujarat")) return "GT";
  if (name.includes("Lucknow")) return "LSG";
  if (name.includes("Kolkata")) return "KKR";
  if (name.includes("Rajasthan")) return "RR";
  if (name.includes("Delhi")) return "DC";
  if (name.includes("Chennai")) return "CSK";
  if (name.includes("Hyderabad") || name.includes("Sunrisers")) return "SRH";
  if (name.includes("Bangalore") || name.includes("Bengaluru") || name.includes("Royal")) return "RCB";
  return name.slice(0, 3).toUpperCase();
};

const LiveDashboard = ({
  simResult,
  simBalls,
  simRunning,
  target,
  winnerDeclared,
  handlePause,
  handleResume,
  handleChangeBall,
  simSpeed,
  setSpeed,
  teamColor,
  alternateBalls,
  rosters,
  activeInnings,
  innings,
  handleBranchSimulate,
  isArena,
  transitionMs = 3000
}) => {
  const feedRef = useRef(null);
  const [selectedScorecardInnings, setSelectedScorecardInnings] = useState(1);
  const [outcomeOverride, setOutcomeOverride] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState('scorecard'); // 'scorecard' | 'commentary'

  // Sync selected scorecard tab with active simulation innings
  useEffect(() => {
    if (activeInnings) {
      setSelectedScorecardInnings(activeInnings);
    }
  }, [activeInnings]);

  // Helper to apply ball details to a running stats scorecard
  const applyBallsToStats = (balls, batters, bowlers) => {
    balls.forEach(ball => {
      const { outcome, runs, isWicket, extraType, striker, non_striker, bowler, runsOffBat, player_dismissed } = ball;
      if (!striker) return;

      if (!batters[striker]) batters[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      if (non_striker && !batters[non_striker]) batters[non_striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      if (bowler && !bowlers[bowler]) bowlers[bowler] = { balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 };

      const isLegal = extraType !== 'wide' && extraType !== 'nb';

      // Batter stats
      if (isLegal || isWicket) {
        batters[striker].balls += 1;
      }
      
      const rVal = outcome !== undefined
        ? (outcome !== 'wide' && outcome !== 'nb' && !isWicket ? (parseInt(outcome) || 0) : 0)
        : (runsOffBat ?? 0);

      batters[striker].runs += rVal;
      if (rVal === 4) batters[striker].fours += 1;
      if (rVal === 6) batters[striker].sixes += 1;

      // Handle dismissals
      if (isWicket) {
        const dismissedName = player_dismissed || striker;
        if (batters[dismissedName]) {
          batters[dismissedName].out = true;
        } else {
          batters[striker].out = true;
        }
      }

      // Bowler stats
      if (bowler) {
        if (isLegal) bowlers[bowler].balls_bowled += 1;
        if (isWicket) bowlers[bowler].wickets += 1;
        
        if (extraType === 'wide' || extraType === 'nb') {
          bowlers[bowler].runs_conceded += 1;
        } else if (!isWicket) {
          bowlers[bowler].runs_conceded += rVal;
        }
      }
    });
  };

  // Derive Live Stats for both Innings 1 and Innings 2, plus active players
  const derivedStats = useMemo(() => {
    if (!simResult) return null;

    const startInnings = simResult.innings || (simBalls.find(b => b.innings !== undefined)?.innings) || activeInnings;

    // --- 1. Compute Innings 1 Stats ---
    let batters1 = {};
    let bowlers1 = {};
    if (startInnings === 1) {
      batters1 = JSON.parse(JSON.stringify(simResult.initialBatters || {}));
      bowlers1 = JSON.parse(JSON.stringify(simResult.initialBowlers || {}));
      const simBalls1 = simBalls.filter(b => b.innings === 1 && !b.isOverBreak && !b.inningsTransition);
      applyBallsToStats(simBalls1, batters1, bowlers1);
    } else {
      const histBalls1 = (innings && innings["1"]?.balls) || [];
      applyBallsToStats(histBalls1, batters1, bowlers1);
    }

    // --- 2. Compute Innings 2 Stats ---
    let batters2 = {};
    let bowlers2 = {};
    if (startInnings === 1) {
      const simBalls2 = simBalls.filter(b => b.innings === 2 && !b.isOverBreak && !b.inningsTransition);
      applyBallsToStats(simBalls2, batters2, bowlers2);
    } else {
      batters2 = JSON.parse(JSON.stringify(simResult.initialBatters || {}));
      bowlers2 = JSON.parse(JSON.stringify(simResult.initialBowlers || {}));
      const simBalls2 = simBalls.filter(b => b.innings === 2 && !b.isOverBreak && !b.inningsTransition);
      applyBallsToStats(simBalls2, batters2, bowlers2);
    }

    // --- 3. Compute Current Active Players (for top cards display) ---
    let striker = activeInnings === startInnings ? simResult.startStriker : "";
    let nonStriker = activeInnings === startInnings ? simResult.startNonStriker : "";
    let bowler = activeInnings === startInnings ? simResult.startBowler : "";

    simBalls.forEach(ball => {
      if (ball.isOverBreak) {
        if (ball.inningsTransition) {
          striker = "";
          nonStriker = "";
          bowler = "";
        } else {
          const temp = striker;
          striker = nonStriker;
          nonStriker = temp;
        }
        const match = ball.message?.match(/Next bowler: (.+)/);
        if (match) {
          bowler = match[1];
        }
        return;
      }

      if (ball.innings !== activeInnings) return;

      striker = ball.striker;
      if (ball.non_striker) nonStriker = ball.non_striker;
      if (striker === nonStriker) nonStriker = "";
      bowler = ball.bowler;
    });

    return {
      innings1Stats: { batters: batters1, bowlers: bowlers1 },
      innings2Stats: { batters: batters2, bowlers: bowlers2 },
      currentActivePlayers: { striker, nonStriker, bowler }
    };
  }, [simResult, simBalls, activeInnings, innings]);

  // Resolve display names
  const team1Name = (innings && innings["1"]?.battingTeam) || rosters?.team1?.name || "Team 1";
  const team2Name = (innings && (innings["2"]?.battingTeam || innings["1"]?.bowlingTeam)) || rosters?.team2?.name || "Team 2";

  // Upcoming lineup helper
  const getTeamPlayers = (teamName) => {
    if (!rosters) return [];
    if (rosters.team1 && rosters.team1.name?.trim().toLowerCase() === teamName.trim().toLowerCase()) {
      return rosters.team1.players || [];
    }
    if (rosters.team2 && rosters.team2.name?.trim().toLowerCase() === teamName.trim().toLowerCase()) {
      return rosters.team2.players || [];
    }
    return [];
  };
  const upcomingLineupPlayers = getTeamPlayers(team2Name);

  // Derive variables for rendering
  const lastElement = simBalls.length > 0 ? simBalls[simBalls.length - 1] : null;
  const isTransitioning = lastElement?.inningsTransition;

  const transitionSecs = Math.max(1, Math.round(transitionMs / 1000));
  const [countdown, setCountdown] = React.useState(transitionSecs);
  useEffect(() => {
    if (isTransitioning) {
      setCountdown(transitionSecs);
      const timer = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTransitioning, transitionSecs]);

  if (!simResult || !derivedStats) return null;

  const { innings1Stats, innings2Stats, currentActivePlayers } = derivedStats;
  const activeStats = activeInnings === 1 ? innings1Stats : innings2Stats;
  const displayStats = selectedScorecardInnings === 1 ? innings1Stats : innings2Stats;
  const showUpcomingLineup = selectedScorecardInnings === 2 && activeInnings === 1;

  // Real-time scores
  const lastRealBall = [...simBalls].reverse().find(b => !b.isOverBreak) || (lastElement || { score: simResult.startScore, wickets: simResult.startWickets, legalBalls: simResult.startBalls });
  const score = lastRealBall.score ?? simResult.startScore;
  const wickets = lastRealBall.wickets ?? simResult.startWickets;
  const legalBalls = lastRealBall.legalBalls ?? simResult.startBalls;
  const overs = Math.floor(legalBalls / 6) + "." + (legalBalls % 6);
  const rr = legalBalls > 0 ? ((score / legalBalls) * 6).toFixed(2) : "0.00";
  // The chase target value (known up-front in Arena's full sim). Only surface it as a
  // "NEED x" banner / RRR once we're actually in the 2nd innings — there is no target to
  // chase during the 1st innings.
  const chaseTarget = simResult.newTarget || target;
  const effectiveTarget = activeInnings === 2 ? chaseTarget : null;
  const rrr = effectiveTarget && legalBalls < 120
    ? score >= effectiveTarget ? "0.00" : (((effectiveTarget - score) / Math.max(1, 120 - legalBalls)) * 6).toFixed(2)
    : null;

  // Active batter/bowler details for display cards
  const b1 = activeStats.batters[currentActivePlayers.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const b2 = activeStats.batters[currentActivePlayers.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const currentBowlerStats = activeStats.bowlers[currentActivePlayers.bowler] || { balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 };

  const formatOvers = (balls) => Math.floor(balls / 6) + "." + (balls % 6);
  const getEcon = (runs, balls) => balls > 0 ? ((runs / balls) * 6).toFixed(2) : "0.00";

  const ballStyle = (ball) => {
    if (ball.isWicket) return { bg: "#ff3b5c", text: "#fff", border: "#ff3b5c" };
    if (ball.extraType) return { bg: "#1e293b", text: "#94a3b8", border: "#334155" };
    if (ball.outcome === "4") return { bg: "#00e5ff15", text: "#00e5ff", border: "#00e5ff" };
    if (ball.outcome === "6") return { bg: "#a855f715", text: "#a855f7", border: "#a855f7" };
    return { bg: "transparent", text: "#e2e8f0", border: "#334155" };
  };

  // Derive Team Colors for UI styling
  const activeBattingTeam = activeInnings === 1 ? team1Name : team2Name;
  const activeBowlingTeam = activeInnings === 1 ? team2Name : team1Name;
  const battingColor = teamColor(activeBattingTeam);
  const bowlingColor = teamColor(activeBowlingTeam);

  return (
    <div className="w-full min-h-[calc(100dvh-64px)] lg:h-[calc(100dvh-64px)] flex flex-col bg-[#02050c] overflow-y-auto lg:overflow-hidden">

      {/* ── Top Scoreboard Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-2 md:py-4 border-b border-white/10 bg-[#050a18] gap-2 md:gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3 md:gap-6">
          <div className="flex items-baseline gap-1.5 md:gap-3">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
              {score}<span className="text-[#94a3b8] text-lg md:text-2xl font-bold">/{wickets}</span>
            </h1>
            <span className="text-[10px] md:text-lg font-mono text-[#6b7280]">({overs})</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-4 text-[9px] md:text-xs font-mono">
            <div className="px-1.5 md:px-3 py-0.5 md:py-1 rounded bg-white/5 border border-white/10 shrink-0">
              <span className="text-[#6b7280] mr-1 md:mr-2">CRR:</span>
              <span className="text-white font-bold">{rr}</span>
            </div>
            {rrr && (
              <div className="px-1.5 md:px-3 py-0.5 md:py-1 rounded bg-white/5 border border-white/10 shrink-0">
                <span className="text-[#6b7280] mr-1 md:mr-2">RRR:</span>
                <span className={`font-bold ${parseFloat(rrr) > 10 ? "text-[#ff3b5c]" : "text-[#00ff88]"}`}>{rrr}</span>
              </div>
            )}
          </div>
        </div>
        
        {effectiveTarget && (
          <div className="px-2 py-1 md:px-3 md:py-1.5 rounded bg-[#00ff88]/5 border border-[#00ff88]/20 text-[#00ff88] text-[8px] md:text-xs font-mono font-bold tracking-wider text-center sm:text-right">
            NEED {Math.max(0, effectiveTarget - score)} FROM {120 - legalBalls} BALLS
          </div>
        )}
      </div>

      {/* ── Live Players Stats ── */}
      <div className="px-3 md:px-6 py-2 md:py-4 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
        <div className="flex flex-row md:contents gap-2">
          {/* Striker */}
          <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between border-l-2 md:border-l-4 relative overflow-hidden flex-1 md:flex-none" style={{ borderLeftColor: battingColor }}>
            <div className="absolute top-0 right-0 p-1 md:p-2 opacity-[0.03] md:opacity-5 text-2xl md:text-4xl pointer-events-none">🏏</div>
            <div className="flex justify-between items-start gap-1 md:gap-2">
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: battingColor }}></div>
                <h3 className="text-white font-bold text-[10px] md:text-lg truncate">{currentActivePlayers.striker}</h3>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm md:text-2xl font-black text-white">{b1.runs}</span>
                <span className="text-[#94a3b8] text-[8px] md:text-sm ml-0.5 md:ml-1 font-mono">({b1.balls})</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-[7px] md:text-xs font-mono text-[#6b7280]">
              <span className="hidden xs:inline">SR: <span className="text-white">{b1.balls > 0 ? ((b1.runs / b1.balls) * 100).toFixed(1) : "0.0"}</span></span>
              <span>4s: <span className="text-white">{b1.fours}</span></span>
              <span>6s: <span className="text-white">{b1.sixes}</span></span>
            </div>
          </div>

          {/* Non-Striker */}
          <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between flex-1 md:flex-none border-l-2 md:border-l-4" style={{ borderLeftColor: battingColor + "40" }}>
            <div className="flex justify-between items-start gap-1 md:gap-2">
              <h3 className="text-[#c4cad6] font-bold text-[10px] md:text-lg truncate">{currentActivePlayers.nonStriker}</h3>
              <div className="text-right opacity-80 shrink-0">
                <span className="text-sm md:text-2xl font-black text-white">{b2.runs}</span>
                <span className="text-[#94a3b8] text-[8px] md:text-sm ml-0.5 md:ml-1 font-mono">({b2.balls})</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-[7px] md:text-xs font-mono text-[#6b7280]">
              <span className="hidden xs:inline">SR: <span className="text-white">{b2.balls > 0 ? ((b2.runs / b2.balls) * 100).toFixed(1) : "0.0"}</span></span>
              <span>4s: <span className="text-white">{b2.fours}</span></span>
              <span>6s: <span className="text-white">{b2.sixes}</span></span>
            </div>
          </div>
        </div>

        {/* Bowler */}
        <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between border-l-2 md:border-l-4 shrink-0 sm:col-span-1" style={{ borderLeftColor: bowlingColor }}>
          <div className="flex justify-between items-center md:items-start gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2 min-w-0">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: bowlingColor }}></div>
              <h3 className="text-white font-bold text-[10px] md:text-lg truncate">{currentActivePlayers.bowler}</h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] md:text-lg font-black font-mono" style={{ color: bowlingColor }}>{formatOvers(currentBowlerStats.balls_bowled)}-{currentBowlerStats.maidens}-{currentBowlerStats.runs_conceded}-{currentBowlerStats.wickets}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-[7px] md:text-xs font-mono text-[#6b7280]">
            <span>Econ: <span className="text-white">{getEcon(currentBowlerStats.runs_conceded, currentBowlerStats.balls_bowled)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Alter Current Ball Outcome (Only shown when paused, not in Arena) ── */}
      {!isArena && !simRunning && simBalls.length > 0 && !winnerDeclared && (
        <div className="px-3 md:px-6 py-3 border-b border-white/5 bg-[#050a18]/40 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="text-left w-full md:w-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b5c] animate-pulse shadow-[0_0_8px_#ff3b5c]" />
              <span className="text-[10px] font-mono text-[#ff3b5c] uppercase tracking-widest font-black">Simulation Paused</span>
            </div>
            <h3 className="text-white text-sm font-black tracking-wide">
              Alter Next Ball (Over {Math.floor(legalBalls / 6)}.{ (legalBalls % 6) + 1 })
            </h3>
            <p className="text-[11px] font-mono text-[#94a3b8] mt-0.5">
              Striker: <span className="text-[#00ff88] font-bold">{currentActivePlayers.striker}</span> • Bowler: <span className="text-[#ff3b5c] font-bold">{currentActivePlayers.bowler}</span>
            </p>
          </div>

          {/* Outcome buttons */}
          <div className="flex flex-wrap gap-1.5 items-center w-full md:w-auto justify-start md:justify-center">
            <span className="text-[9px] font-mono text-[#6b7280] mr-2 uppercase tracking-wider font-bold">Select Outcome:</span>
            {[
              { label: "•", val: "0", color: "#6b7280", desc: "Dot" },
              { label: "1", val: "1", color: "#00ff88", desc: "1 Run" },
              { label: "2", val: "2", color: "#00ff88", desc: "2 Runs" },
              { label: "3", val: "3", color: "#00ff88", desc: "3 Runs" },
              { label: "4", val: "4", color: "#00e5ff", desc: "Four" },
              { label: "6", val: "6", color: "#ffd700", desc: "Six" },
              { label: "W", val: "W", color: "#ff3b5c", desc: "Out" },
              { label: "Wd", val: "wide", color: "#a855f7", desc: "Wide" },
              { label: "NB", val: "nb", color: "#a855f7", desc: "No Ball" }
            ].map(({ label, val, color, desc }) => (
              <button
                key={val}
                onClick={() => setOutcomeOverride(val)}
                aria-pressed={outcomeOverride === val}
                aria-label={desc}
                className={`px-3 py-2 rounded text-[11px] font-black transition-all flex flex-col items-center justify-center min-w-[40px] min-h-[40px] active:scale-95 ${outcomeOverride === val ? "scale-105" : "opacity-70 hover:opacity-100"}`}
                style={{
                  background: outcomeOverride === val ? color + "25" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${outcomeOverride === val ? color : "rgba(255,255,255,0.08)"}`,
                  color: outcomeOverride === val ? color : "#94a3b8"
                }}
                title={desc}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            {outcomeOverride ? (
              <button
                onClick={() => {
                  handleBranchSimulate(alternateBalls.length, outcomeOverride, currentActivePlayers.striker, currentActivePlayers.nonStriker, currentActivePlayers.bowler);
                  setOutcomeOverride(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#ff3b5c] to-[#a855f7] text-white text-[10px] font-black tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,59,92,0.35)]"
              >
                Simulate Override ⚡
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="px-5 py-2.5 rounded-lg bg-[#00ff88]/15 border border-[#00ff88]/40 text-[#00ff88] text-[10px] font-black tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Resume Normal ▶
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Tab Selector ── */}
      <div className="flex lg:hidden px-3 md:px-6 mt-2 shrink-0 gap-2" role="tablist" aria-label="Match panel">
        <button
          onClick={() => setActiveMobileTab('scorecard')}
          role="tab"
          aria-selected={activeMobileTab === 'scorecard'}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeMobileTab === 'scorecard'
              ? 'bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.1)]'
              : 'bg-white/5 border-transparent text-[#94a3b8]'
          }`}
        >
          Scorecard
        </button>
        <button
          onClick={() => setActiveMobileTab('commentary')}
          role="tab"
          aria-selected={activeMobileTab === 'commentary'}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeMobileTab === 'commentary'
              ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.1)]'
              : 'bg-white/5 border-transparent text-[#94a3b8]'
          }`}
        >
          Commentary
        </button>
      </div>

      {/* ── Main Content Area (Commentary & Scorecard) ── */}
      <div className="flex-1 lg:overflow-hidden flex flex-col lg:flex-row px-3 md:px-6 gap-6 md:gap-6 pb-36 md:pb-24 mt-2 md:mt-4 custom-scrollbar">

        {/* Left: Commentary Feed */}
        <div className={`w-full h-[480px] lg:h-full lg:flex-1 flex-col bg-[#080d1e] rounded-xl md:rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl lg:flex ${activeMobileTab === 'commentary' ? 'flex' : 'hidden'}`}>
          <div className="px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] flex justify-between items-center bg-black/20">
            <h3 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-wider">Commentary</h3>
            <span className="text-[7px] md:text-[10px] font-mono text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded">Timeline Feed</span>
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-3 scroll-smooth custom-scrollbar">
            {[...simBalls].slice(-10).reverse().map((ball, i) => {
              if (ball.isOverBreak) {
                return (
                  <div key={i} className="py-1.5 px-3 md:px-4 my-2 md:my-4 rounded-lg bg-gradient-to-r from-white/5 to-transparent border-l-2 border-white/20">
                    <p className="text-[9px] md:text-xs font-mono text-white tracking-wide">{ball.message}</p>
                  </div>
                );
              }

              const style = ballStyle(ball);
              const isMajor = ball.outcome === "4" || ball.outcome === "6" || ball.outcome === "W";
              const commentary = ball.commentary || `${ball.bowler} to ${ball.striker}, ${ball.isWicket ? 'OUT!' : ball.extraType ? ball.extraType : ball.runs + ' runs'}`;

              return (
                <div key={i} className={`flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${ball.isOverride ? 'bg-[#a855f7]/10 border border-[#a855f7]/30' : ball.isSimulated ? 'bg-black/20 hover:bg-black/40' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className={`w-7 h-7 md:w-9 md:h-9 rounded flex items-center justify-center text-[9px] md:text-xs font-black shrink-0 ${isMajor ? 'ring-1 ring-offset-1 ring-offset-[#080d1e]' : ''}`}
                    style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                    {ball.isWicket ? "W" : ball.extraType === "wide" ? "Wd" : ball.extraType === "nb" ? "NB" : String(ball.runs)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 md:mb-1">
                      <span className="text-[8px] md:text-[10px] font-mono text-[#94a3b8]">Ov {ball.over}.{ball.ball}</span>
                      <span className="text-[9px] md:text-[10px] font-mono text-white font-bold">{ball.score}/{ball.wickets}</span>
                    </div>
                    <p className={`text-[11px] md:text-sm leading-snug ${isMajor ? 'text-white font-medium' : 'text-[#c4cad6]'}`}>{commentary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Scorecard with tabs */}
        <div className={`w-full h-[480px] lg:h-full lg:w-1/2 flex-col bg-[#080d1e] rounded-xl md:rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl lg:flex ${activeMobileTab === 'scorecard' ? 'flex' : 'hidden'}`}>
          <div className="flex border-b border-white/[0.06] bg-black/20" role="tablist" aria-label="Scorecard innings select">
            <button
              onClick={() => setSelectedScorecardInnings(1)}
              role="tab"
              aria-selected={selectedScorecardInnings === 1}
              className={`flex-1 py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                selectedScorecardInnings === 1
                  ? "border-[#00e5ff] text-white bg-white/[0.02]"
                  : "border-transparent text-[#6b7280] hover:text-white"
              }`}
            >
              {getTeamShort(team1Name)}
            </button>
            <button
              onClick={() => setSelectedScorecardInnings(2)}
              role="tab"
              aria-selected={selectedScorecardInnings === 2}
              className={`flex-1 py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                selectedScorecardInnings === 2
                  ? "border-[#00e5ff] text-white bg-white/[0.02]"
                  : "border-transparent text-[#6b7280] hover:text-white"
              }`}
            >
              {getTeamShort(team2Name)}
            </button>
          </div>
          
          <div className="flex-1 p-4 md:p-5 custom-scrollbar overflow-y-auto">
            {showUpcomingLineup ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <p className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-widest">Upcoming Batting Team</p>
                  <p className="text-base font-black text-white mt-1">{team2Name}</p>
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingLineupPlayers.length > 0 ? (
                    upcomingLineupPlayers.map((player, idx) => (
                      <div key={player} className="flex items-center gap-3 px-3.5 py-2.5 bg-[#050a18]/40 rounded-xl border border-white/[0.03] hover:border-white/10 transition-colors">
                        <span className="font-mono text-xs text-[#6b7280] w-5 text-center">{idx + 1}</span>
                        <span className="text-white font-semibold text-xs md:text-sm">{player}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#6b7280] text-xs font-mono py-4 text-center">No lineup data loaded yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="text-[9px] md:text-[10px] font-mono text-[#6b7280] uppercase border-b border-white/5">
                    <tr>
                      <th scope="col" className="pb-2 font-semibold">Batter</th>
                      <th scope="col" className="pb-2 font-semibold text-right">R</th>
                      <th scope="col" className="pb-2 font-semibold text-right">B</th>
                      <th scope="col" className="pb-2 font-semibold text-right hidden xs:table-cell">4s</th>
                      <th scope="col" className="pb-2 font-semibold text-right hidden xs:table-cell">6s</th>
                      <th scope="col" className="pb-2 font-semibold text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {displayStats && Object.entries(displayStats.batters).map(([name, stats]) => {
                      if (stats.balls === 0 && stats.runs === 0 && !stats.out && name !== currentActivePlayers.striker && name !== currentActivePlayers.nonStriker) return null;
                      const isBatting = !stats.out;
                      const isOnStrike = name === currentActivePlayers.striker;
                      return (
                        <tr key={name} className="text-[#c4cad6]">
                          <td className="py-2 md:py-2.5 flex items-center gap-2 min-w-0">
                            <span className={`truncate ${isBatting ? "text-white font-semibold" : "opacity-60"}`}>{name}</span>
                            {isOnStrike && <span className="text-[9px] bg-[#00ff88]/20 px-1.5 py-0.5 rounded text-[#00ff88] font-bold border border-[#00ff88]/30">*</span>}
                            {stats.out && <span className="text-[9px] text-[#ff3b5c] uppercase font-bold shrink-0">Out</span>}
                          </td>
                          <td className="py-2 md:py-2.5 text-right font-bold text-white">{stats.runs}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs">{stats.balls}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs hidden xs:table-cell">{stats.fours}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs hidden xs:table-cell">{stats.sixes}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-6 md:mt-8 border-b border-white/[0.06] pb-2 mb-2">
                  <h3 className="text-xs md:text-sm font-bold text-white">Bowling</h3>
                </div>
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="text-[9px] md:text-[10px] font-mono text-[#6b7280] uppercase border-b border-white/5">
                    <tr>
                      <th scope="col" className="pb-2 font-semibold">Bowler</th>
                      <th scope="col" className="pb-2 font-semibold text-right">O</th>
                      <th scope="col" className="pb-2 font-semibold text-right">R</th>
                      <th scope="col" className="pb-2 font-semibold text-right font-bold text-white">W</th>
                      <th scope="col" className="pb-2 font-semibold text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {displayStats && Object.entries(displayStats.bowlers).map(([name, stats]) => {
                      if (stats.balls_bowled === 0 && stats.runs_conceded === 0) return null;
                      return (
                        <tr key={name} className="text-[#c4cad6]">
                          <td className="py-2 md:py-2.5 text-white truncate">{name}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs">{formatOvers(stats.balls_bowled)}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs">{stats.runs_conceded}</td>
                          <td className="py-2 md:py-2.5 text-right font-bold text-white">{stats.wickets}</td>
                          <td className="py-2 md:py-2.5 text-right font-mono text-[10px] md:text-xs">{getEcon(stats.runs_conceded, stats.balls_bowled)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Control Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 h-auto pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] md:h-20 md:py-0 bg-[#050a18]/95 backdrop-blur-md border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8 px-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

        <div className="flex items-center gap-2 justify-center w-full md:w-auto">
          {simRunning ? (
            <button onClick={handlePause} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-10 md:h-10 rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/30 text-[#ff6b35] font-bold font-mono text-[9px] md:text-xs hover:bg-[#ff6b35]/20 transition-all flex items-center justify-center gap-1.5">
              <span className="text-xs md:text-sm">⏸</span> <span>PAUSE</span>
            </button>
          ) : (
            <button onClick={handleResume} disabled={winnerDeclared !== null} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-10 md:h-10 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-bold font-mono text-[9px] md:text-xs hover:bg-[#00ff88]/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
              <span className="text-xs md:text-sm">▶</span> <span>RESUME</span>
            </button>
          )}

          <button onClick={handleChangeBall} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-10 md:h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-bold font-mono text-[9px] md:text-xs hover:bg-[#00e5ff]/20 transition-all flex items-center justify-center gap-1.5">
            <span className="text-xs md:text-sm">↺</span> <span>RESET</span>
          </button>
        </div>

        <div className="hidden md:block h-8 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-1.5 md:gap-2 justify-center w-full md:w-auto">
          {[{ label: "Faster", ms: 150 }, { label: "Fast", ms: 300 }, { label: "Normal", ms: 750 }, { label: "Slow", ms: 1500 }].map(s => (
            <button key={s.ms}
              onClick={() => setSpeed(s.ms)}
              className={`px-2 md:px-3 min-w-[62px] md:w-[75px] h-9 md:h-9 rounded text-[10px] md:text-[10px] font-mono transition-all uppercase font-bold tracking-wider flex items-center justify-center active:scale-95 ${simSpeed === s.ms ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]" : "bg-transparent text-[#6b7280] border border-white/10 hover:border-white/30"}`}>
              {s.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── Match Winner Overlay ── */}
      {winnerDeclared && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 p-4">
          <div className="glass flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.1)] w-full max-w-2xl transform scale-100 md:scale-110">
            <h2 className="text-5xl md:text-8xl lg:text-[100px] font-black tracking-tighter leading-none text-center mb-2 md:mb-4" style={{ color: teamColor(winnerDeclared.team), textShadow: `0 0 40px ${teamColor(winnerDeclared.team)}60` }}>
              {winnerDeclared.team}
            </h2>
            <h3 className="text-xl md:text-4xl font-bold text-white uppercase tracking-[0.2em] md:tracking-widest text-center mt-2">
              {getTeamShort(winnerDeclared.team)} WON
            </h3>

            <p className="text-[#c4cad6] mt-6 md:mt-8 text-sm md:text-xl font-mono text-center px-4">
              {winnerDeclared.type === "chase"
                ? `Successfully chased ${winnerDeclared.target} — scored ${winnerDeclared.score}/${winnerDeclared.wickets}`
                : `Defended the total — batting side fell for ${winnerDeclared.score}/${winnerDeclared.wickets}`
              }
            </p>

            <button onClick={handleChangeBall} className="mt-8 md:mt-12 px-6 md:px-10 py-3 md:py-5 rounded-xl bg-white text-black font-black text-xs md:text-sm uppercase tracking-wider hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Restart Timeline
            </button>
          </div>
        </div>
      )}

      {/* ── Innings Transition Overlay ── */}
      {isTransitioning && activeInnings === 1 && !winnerDeclared && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02050c]/95 backdrop-blur-xl animate-in fade-in duration-500 p-6">
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <h2 className="text-[#a855f7] font-mono text-sm md:text-xl tracking-[0.3em] uppercase mb-4 md:mb-6 animate-pulse">
              1st Innings Complete
            </h2>
            <h1 className="text-white font-black text-5xl md:text-8xl tracking-tighter mb-4 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
              TARGET: {chaseTarget}
            </h1>
            <p className="text-[#94a3b8] text-base md:text-xl font-mono mt-6 md:mt-8 mb-4">
              Generating Alternate Timeline...
            </p>
            <div className="text-6xl md:text-8xl font-black text-[#a855f7] mb-8">
              {countdown}
            </div>
            <div className="flex gap-3 md:gap-4">
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#00e5ff] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#ff3b5c] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;
