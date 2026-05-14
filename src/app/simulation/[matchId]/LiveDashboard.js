import React, { useMemo, useEffect, useRef } from 'react';

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
  teamColor
}) => {
  const feedRef = useRef(null);

  // Auto-scroll logic removed as feed is now reversed (newest at top)

  // Derive Live Stats by playing through simBalls
  const liveStats = useMemo(() => {
    if (!simResult) return null;

    const batters = JSON.parse(JSON.stringify(simResult.initialBatters || {}));
    const bowlers = JSON.parse(JSON.stringify(simResult.initialBowlers || {}));

    const initStriker = simResult.startStriker;
    const initNonStriker = simResult.startNonStriker;
    const initBowler = simResult.startBowler;

    if (initStriker && !batters[initStriker]) batters[initStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    if (initNonStriker && !batters[initNonStriker]) batters[initNonStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    if (initBowler && !bowlers[initBowler]) bowlers[initBowler] = { balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 };

    let currentStriker = initStriker;
    let currentNonStriker = initNonStriker;
    let currentBowler = initBowler;

    simBalls.forEach(ball => {
      if (ball.isOverBreak) {
        if (ball.inningsTransition) {
          // Clear batters and bowlers for the 2nd innings
          for (const key in batters) delete batters[key];
          for (const key in bowlers) delete bowlers[key];
        } else {
          // Switch strike at end of over
          const temp = currentStriker;
          currentStriker = currentNonStriker;
          currentNonStriker = temp;
        }

        // Over break message contains next bowler name in our page.js
        const match = ball.message.match(/Next bowler: (.+)/);
        if (match) {
          currentBowler = match[1];
          if (!bowlers[currentBowler]) bowlers[currentBowler] = { balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 };
        }
        return;
      }

      const { outcome, runs, isWicket, extraType, striker, non_striker, bowler } = ball;

      // Update names from the ball data
      currentStriker = striker;
      if (non_striker) currentNonStriker = non_striker;
      if (currentStriker === currentNonStriker) currentNonStriker = "";
      currentBowler = bowler;

      if (!batters[striker]) batters[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      if (currentNonStriker && !batters[currentNonStriker]) batters[currentNonStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      if (!bowlers[bowler]) bowlers[bowler] = { balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 };

      const isLegal = extraType !== 'wide' && extraType !== 'nb';

      // Batter stats
      if (isLegal || isWicket) {
        batters[striker].balls += 1;
      }
      if (outcome !== 'wide' && outcome !== 'nb' && !isWicket) {
        const rNum = parseInt(outcome) || 0;
        batters[striker].runs += rNum;
        if (rNum === 4) batters[striker].fours += 1;
        if (rNum === 6) batters[striker].sixes += 1;
      }
      if (isWicket) batters[striker].out = true;

      // Bowler stats
      if (isLegal) bowlers[bowler].balls_bowled += 1;
      if (isWicket) bowlers[bowler].wickets += 1;
      if (extraType === 'wide' || extraType === 'nb') {
        bowlers[bowler].runs_conceded += 1;
      } else if (!isWicket) {
        bowlers[bowler].runs_conceded += (parseInt(outcome) || 0);
      }

      // Strike rotation logic handled by simulation_engine mostly, but we can assume currentStriker is accurate from the next ball.
    });

    return { batters, bowlers, currentStriker, currentNonStriker, currentBowler };
  }, [simResult, simBalls]);

  // Derive variables for rendering
  const lastElement = simBalls.length > 0 ? simBalls[simBalls.length - 1] : null;
  const isTransitioning = lastElement?.inningsTransition;

  // Innings transition countdown logic
  const [countdown, setCountdown] = React.useState(3);
  useEffect(() => {
    if (isTransitioning) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTransitioning]);

  if (!simResult || !liveStats) return null;

  // Actually, if lastBall is an overbreak, it might not have the full data, so we need to find the last real ball
  const lastRealBall = [...simBalls].reverse().find(b => !b.isOverBreak) || (lastElement || { score: simResult.startScore, wickets: simResult.startWickets, legalBalls: simResult.startBalls });

  const score = lastRealBall.score ?? simResult.startScore;
  const wickets = lastRealBall.wickets ?? simResult.startWickets;
  const legalBalls = lastRealBall.legalBalls ?? simResult.startBalls;
  const overs = Math.floor(legalBalls / 6) + "." + (legalBalls % 6);
  const rr = legalBalls > 0 ? ((score / legalBalls) * 6).toFixed(2) : "0.00";
  const effectiveTarget = simResult.newTarget || target;
  const rrr = effectiveTarget && legalBalls < 120
    ? score >= effectiveTarget ? "0.00" : (((effectiveTarget - score) / Math.max(1, 120 - legalBalls)) * 6).toFixed(2)
    : null;

  const b1 = liveStats.batters[liveStats.currentStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const b2 = liveStats.batters[liveStats.currentNonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const currentBowlerStats = liveStats.bowlers[liveStats.currentBowler] || { balls_bowled: 0, runs_conceded: 0, wickets: 0 };

  const formatOvers = (balls) => Math.floor(balls / 6) + "." + (balls % 6);
  const getEcon = (runs, balls) => balls > 0 ? ((runs / balls) * 6).toFixed(2) : "0.00";

  const ballStyle = (ball, isMajor) => {
    if (ball.isWicket) return { bg: "#ff3b5c", text: "#fff", border: "#ff3b5c" };
    if (ball.extraType) return { bg: "#1e293b", text: "#94a3b8", border: "#334155" };
    if (ball.outcome === "4") return { bg: "#00e5ff15", text: "#00e5ff", border: "#00e5ff" };
    if (ball.outcome === "6") return { bg: "#a855f715", text: "#a855f7", border: "#a855f7" };
    return { bg: "transparent", text: "#e2e8f0", border: "#334155" };
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-[#02050c] overflow-hidden">

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
          <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between border-l-2 md:border-l-4 border-l-[#00ff88] relative overflow-hidden flex-1 md:flex-none">
            <div className="absolute top-0 right-0 p-1 md:p-2 opacity-[0.03] md:opacity-5 text-2xl md:text-4xl pointer-events-none">🏏</div>
            <div className="flex justify-between items-start gap-1 md:gap-2">
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <div className="w-1 md:w-2 h-1 md:h-2 rounded-full bg-[#00ff88] animate-pulse shrink-0"></div>
                <h3 className="text-white font-bold text-[10px] md:text-lg truncate">{liveStats.currentStriker}</h3>
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
          <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between flex-1 md:flex-none border-l-2 md:border-l-0 border-l-white/10">
            <div className="flex justify-between items-start gap-1 md:gap-2">
              <h3 className="text-[#c4cad6] font-bold text-[10px] md:text-lg truncate">{liveStats.currentNonStriker}</h3>
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
        <div className="glass-light rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col justify-between border-l-2 md:border-l-4 border-l-[#ff3b5c] shrink-0 sm:col-span-1">
          <div className="flex justify-between items-center md:items-start gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2 min-w-0">
              <div className="w-1 md:w-2 h-1 md:h-2 rounded-full bg-[#ff3b5c] animate-pulse shrink-0"></div>
              <h3 className="text-white font-bold text-[10px] md:text-lg truncate">{liveStats.currentBowler}</h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] md:text-lg font-black text-[#ff3b5c] font-mono">{formatOvers(currentBowlerStats.balls_bowled)}-{currentBowlerStats.maidens}-{currentBowlerStats.runs_conceded}-{currentBowlerStats.wickets}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-[7px] md:text-xs font-mono text-[#6b7280]">
            <span>Econ: <span className="text-white">{getEcon(currentBowlerStats.runs_conceded, currentBowlerStats.balls_bowled)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area (Commentary & Scorecard) ── */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row px-3 md:px-6 gap-6 md:gap-6 pb-28 md:pb-24 mt-2 md:mt-4 custom-scrollbar">

        {/* Left: Commentary Feed */}
        <div className="w-full lg:flex-1 flex flex-col bg-[#080d1e] rounded-xl md:rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl min-h-[450px] lg:h-full shrink-0 lg:shrink">
          <div className="px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] flex justify-between items-center bg-black/20">
            <h3 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-wider">Commentary</h3>
            <span className="text-[7px] md:text-[10px] font-mono text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded">Timeline Feed</span>
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-3 scroll-smooth custom-scrollbar">
            {[...simBalls].reverse().map((ball, i) => {
              if (ball.isOverBreak) {
                return (
                  <div key={i} className="py-1.5 px-3 md:px-4 my-2 md:my-4 rounded-lg bg-gradient-to-r from-white/5 to-transparent border-l-2 border-white/20">
                    <p className="text-[9px] md:text-xs font-mono text-white tracking-wide">{ball.message}</p>
                  </div>
                );
              }

              const style = ballStyle(ball, true);
              const isMajor = ball.outcome === "4" || ball.outcome === "6" || ball.outcome === "W";

              return (
                <div key={i} className={`flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${ball.isOverride ? 'bg-[#a855f7]/10 border border-[#a855f7]/30' : 'bg-black/20 hover:bg-black/40'}`}>
                  <div className={`w-7 h-7 md:w-9 md:h-9 rounded flex items-center justify-center text-[9px] md:text-xs font-black shrink-0 ${isMajor ? 'ring-1 ring-offset-1 ring-offset-[#080d1e]' : ''}`}
                    style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                    {ball.isWicket ? "W" : ball.extraType === "wide" ? "Wd" : ball.extraType === "nb" ? "NB" : String(ball.runs)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 md:mb-1">
                      <span className="text-[8px] md:text-[10px] font-mono text-[#94a3b8]">Ov {ball.over}.{ball.ball}</span>
                      <span className="text-[9px] md:text-[10px] font-mono text-white font-bold">{ball.score}/{ball.wickets}</span>
                    </div>
                    <p className={`text-[11px] md:text-sm leading-snug ${isMajor ? 'text-white font-medium' : 'text-[#c4cad6]'}`}>{ball.commentary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Scorecard */}
        <div className="w-full lg:w-1/2 flex flex-col bg-[#080d1e] rounded-xl md:rounded-2xl border border-white/[0.06] overflow-visible shadow-2xl lg:h-full shrink-0 lg:shrink">
          <div className="px-5 py-3 border-b border-white/[0.06] bg-black/20">
            <h3 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-wider">Full Scorecard</h3>
          </div>
          <div className="p-4 md:p-5 custom-scrollbar overflow-y-visible lg:overflow-y-auto">
            <table className="w-full text-xs md:text-sm text-left">
              <thead className="text-[9px] md:text-[10px] font-mono text-[#6b7280] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-2 font-normal">Batter</th>
                  <th className="pb-2 font-normal text-right">R</th>
                  <th className="pb-2 font-normal text-right">B</th>
                  <th className="pb-2 font-normal text-right hidden xs:table-cell">4s</th>
                  <th className="pb-2 font-normal text-right hidden xs:table-cell">6s</th>
                  <th className="pb-2 font-normal text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {Object.entries(liveStats.batters).map(([name, stats]) => {
                  if (stats.balls === 0 && stats.runs === 0 && !stats.out && name !== liveStats.currentStriker && name !== liveStats.currentNonStriker) return null;
                  const isBatting = !stats.out;
                  return (
                    <tr key={name} className="text-[#c4cad6]">
                      <td className="py-2 md:py-2.5 flex items-center gap-2 min-w-0">
                        <span className={`truncate ${isBatting ? "text-white font-semibold" : "opacity-60"}`}>{name}</span>
                        {isBatting && <span className="text-[8px] bg-white/10 px-1 rounded text-white">*</span>}
                        {stats.out && <span className="text-[8px] text-[#ff3b5c] uppercase font-bold shrink-0">Out</span>}
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
                  <th className="pb-2 font-normal">Bowler</th>
                  <th className="pb-2 font-normal text-right">O</th>
                  <th className="pb-2 font-normal text-right">R</th>
                  <th className="pb-2 font-normal text-right font-bold text-white">W</th>
                  <th className="pb-2 font-normal text-right">Econ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {Object.entries(liveStats.bowlers).map(([name, stats]) => {
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
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Control Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-[#050a18]/95 backdrop-blur-md border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 px-4 py-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

        <div className="flex items-center gap-2 justify-center w-full md:w-auto">
          {simRunning ? (
            <button onClick={handlePause} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-8 md:h-10 rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/30 text-[#ff6b35] font-bold font-mono text-[9px] md:text-xs hover:bg-[#ff6b35]/20 transition-all flex items-center justify-center gap-1.5">
              <span className="text-xs md:text-sm">⏸</span> <span>PAUSE</span>
            </button>
          ) : (
            <button onClick={handleResume} disabled={winnerDeclared !== null} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-8 md:h-10 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-bold font-mono text-[9px] md:text-xs hover:bg-[#00ff88]/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
              <span className="text-xs md:text-sm">▶</span> <span>RESUME</span>
            </button>
          )}

          <button onClick={handleChangeBall} className="flex-1 md:flex-none w-[90px] md:w-[110px] h-8 md:h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-bold font-mono text-[9px] md:text-xs hover:bg-[#00e5ff]/20 transition-all flex items-center justify-center gap-1.5">
            <span className="text-xs md:text-sm">↺</span> <span>RESET</span>
          </button>
        </div>

        <div className="hidden md:block h-8 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-1 md:gap-2 justify-center w-full md:w-auto">
          {[{ label: "Faster", ms: 150 }, { label: "Fast", ms: 300 }, { label: "Norm", ms: 750 }, { label: "Slow", ms: 1500 }].map(s => (
            <button key={s.ms}
              onClick={() => setSpeed(s.ms)}
              className={`w-[55px] md:w-[70px] h-7 md:h-9 rounded text-[8px] md:text-[10px] font-mono transition-all uppercase font-bold tracking-wider flex items-center justify-center ${simSpeed === s.ms ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]" : "bg-transparent text-[#6b7280] border border-white/10 hover:border-white/30"}`}>
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
            <h3 className="text-xl md:text-4xl font-bold text-white uppercase tracking-[0.2em] md:tracking-widest text-center">CHAMPION</h3>

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
      {isTransitioning && !winnerDeclared && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02050c]/95 backdrop-blur-xl animate-in fade-in duration-500 p-6">
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <h2 className="text-[#a855f7] font-mono text-sm md:text-xl tracking-[0.3em] uppercase mb-4 md:mb-6 animate-pulse">
              1st Innings Complete
            </h2>
            <h1 className="text-white font-black text-5xl md:text-8xl tracking-tighter mb-4 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
              TARGET: {effectiveTarget}
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
