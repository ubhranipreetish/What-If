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

  // Auto-scroll the feed to the bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [simBalls]);

  // Derive Live Stats by playing through simBalls
  const liveStats = useMemo(() => {
    if (!simResult) return null;
    
    const batters = JSON.parse(JSON.stringify(simResult.initialBatters || {}));
    const bowlers = JSON.parse(JSON.stringify(simResult.initialBowlers || {}));

    const initStriker = simResult.startStriker;
    const initNonStriker = simResult.startNonStriker;
    const initBowler = simResult.startBowler;

    if (initStriker && !batters[initStriker]) batters[initStriker] = {runs: 0, balls: 0, fours: 0, sixes: 0, out: false};
    if (initNonStriker && !batters[initNonStriker]) batters[initNonStriker] = {runs: 0, balls: 0, fours: 0, sixes: 0, out: false};
    if (initBowler && !bowlers[initBowler]) bowlers[initBowler] = {balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0};

    let currentStriker = initStriker;
    let currentNonStriker = initNonStriker;
    let currentBowler = initBowler;

    simBalls.forEach(ball => {
      if (ball.isOverBreak) {
        // Switch strike at end of over
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
        
        // Over break message contains next bowler name in our page.js
        const match = ball.message.match(/Next bowler: (.+)/);
        if (match) {
          currentBowler = match[1];
          if (!bowlers[currentBowler]) bowlers[currentBowler] = {balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0};
        }
        return;
      }

      const { outcome, runs, isWicket, extraType, striker, bowler } = ball;
      
      // Update names in case they changed internally
      currentStriker = striker;
      currentBowler = bowler;
      
      if (!batters[striker]) batters[striker] = {runs: 0, balls: 0, fours: 0, sixes: 0, out: false};
      if (!bowlers[bowler]) bowlers[bowler] = {balls_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0};

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

  if (!simResult || !liveStats) return null;

  const lastBall = simBalls.length > 0 ? simBalls[simBalls.length - 1] : { score: simResult.startScore, wickets: simResult.startWickets, legalBalls: simResult.startBalls };
  
  // Actually, if lastBall is an overbreak, it might not have the full data, so we need to find the last real ball
  const lastRealBall = [...simBalls].reverse().find(b => !b.isOverBreak) || lastBall;
  
  const score = lastRealBall.score ?? simResult.startScore;
  const wickets = lastRealBall.wickets ?? simResult.startWickets;
  const legalBalls = lastRealBall.legalBalls ?? simResult.startBalls;
  const overs = Math.floor(legalBalls / 6) + "." + (legalBalls % 6);
  const rr = legalBalls > 0 ? ((score / legalBalls) * 6).toFixed(2) : "0.00";
  const rrr = target && legalBalls < 120
    ? score >= target ? "0.00" : (((target - score) / Math.max(1, 120 - legalBalls)) * 6).toFixed(2)
    : null;

  const b1 = liveStats.batters[liveStats.currentStriker] || {runs:0,balls:0,fours:0,sixes:0};
  const b2 = liveStats.batters[liveStats.currentNonStriker] || {runs:0,balls:0,fours:0,sixes:0};
  const currentBowlerStats = liveStats.bowlers[liveStats.currentBowler] || {balls_bowled:0, runs_conceded:0, wickets:0};

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
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-[#02050c]">
      
      {/* ── Top Scoreboard Bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a18]">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-black text-white tracking-tighter">
              {score}<span className="text-[#94a3b8] text-2xl font-bold">/{wickets}</span>
            </h1>
            <span className="text-lg font-mono text-[#6b7280]">({overs})</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-[#6b7280] mr-2">CRR:</span>
              <span className="text-white font-bold">{rr}</span>
            </div>
            {rrr && (
              <div className="px-3 py-1 rounded bg-white/5 border border-white/10">
                <span className="text-[#6b7280] mr-2">RRR:</span>
                <span className={`font-bold ${parseFloat(rrr) > 10 ? "text-[#ff3b5c]" : "text-[#00ff88]"}`}>{rrr}</span>
              </div>
            )}
            {target && (
              <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[#00ff88]">
                Need {Math.max(0, target - score)} from {120 - legalBalls}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Live Players Stats ── */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Striker */}
        <div className="glass rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-[#00ff88] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">🏏</div>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></div>
              <h3 className="text-white font-bold text-lg">{liveStats.currentStriker}</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">{b1.runs}</span>
              <span className="text-[#94a3b8] text-sm ml-1 font-mono">({b1.balls})</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-[#6b7280]">
            <span>SR: <span className="text-white">{b1.balls > 0 ? ((b1.runs/b1.balls)*100).toFixed(1) : "0.0"}</span></span>
            <span>4s: <span className="text-white">{b1.fours}</span></span>
            <span>6s: <span className="text-white">{b1.sixes}</span></span>
          </div>
        </div>

        {/* Non-Striker */}
        <div className="glass rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[#c4cad6] font-bold text-lg">{liveStats.currentNonStriker}</h3>
            <div className="text-right opacity-80">
              <span className="text-2xl font-black text-white">{b2.runs}</span>
              <span className="text-[#94a3b8] text-sm ml-1 font-mono">({b2.balls})</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-[#6b7280]">
            <span>SR: <span className="text-white">{b2.balls > 0 ? ((b2.runs/b2.balls)*100).toFixed(1) : "0.0"}</span></span>
            <span>4s: <span className="text-white">{b2.fours}</span></span>
            <span>6s: <span className="text-white">{b2.sixes}</span></span>
          </div>
        </div>

        {/* Bowler */}
        <div className="glass rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-[#ff3b5c]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ff3b5c] animate-pulse"></div>
              <h3 className="text-white font-bold text-lg">{liveStats.currentBowler}</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-[#ff3b5c]">{formatOvers(currentBowlerStats.balls_bowled)}-{currentBowlerStats.maidens}-{currentBowlerStats.runs_conceded}-{currentBowlerStats.wickets}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-[#6b7280]">
            <span>Econ: <span className="text-white">{getEcon(currentBowlerStats.runs_conceded, currentBowlerStats.balls_bowled)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area (Commentary & Scorecard) ── */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row px-6 gap-6 pb-24">
        
        {/* Left: Commentary Feed */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-[#080d1e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex justify-between items-center bg-black/20">
            <h3 className="text-sm font-bold text-white">Commentary</h3>
            <span className="text-[10px] font-mono text-[#a855f7] bg-[#a855f7]/10 px-2 py-1 rounded">Alternate Timeline</span>
          </div>
          
          <div ref={feedRef} className="flex-1 overflow-y-auto p-5 space-y-3 scroll-smooth">
            {simBalls.map((ball, i) => {
              if (ball.isOverBreak) {
                return (
                  <div key={i} className="py-2 px-4 my-4 rounded-lg bg-gradient-to-r from-white/5 to-transparent border-l-2 border-white/20">
                    <p className="text-xs font-mono text-white tracking-wide">{ball.message}</p>
                  </div>
                );
              }

              const style = ballStyle(ball, true);
              const isMajor = ball.outcome === "4" || ball.outcome === "6" || ball.outcome === "W";
              
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${ball.isOverride ? 'bg-[#a855f7]/10 border border-[#a855f7]/30' : 'bg-black/20 hover:bg-black/40'}`}>
                  <div className={`w-9 h-9 rounded flex items-center justify-center text-xs font-black shrink-0 ${isMajor ? 'ring-1 ring-offset-1 ring-offset-[#080d1e]' : ''}`}
                    style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text, ...(isMajor ? { ringColor: style.border } : {}) }}>
                    {ball.isWicket ? "W" : ball.extraType === "wide" ? "Wd" : ball.extraType === "nb" ? "NB" : String(ball.runs)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-mono text-[#94a3b8]">Ov {ball.over}.{ball.ball} {ball.isOverride && <span className="text-[#a855f7] font-bold text-[9px] ml-1">OVERRIDE</span>}</span>
                      <span className="text-xs font-mono text-white font-bold">{ball.score}/{ball.wickets}</span>
                    </div>
                    <p className={`text-sm ${isMajor ? 'text-white font-medium' : 'text-[#c4cad6]'}`}>{ball.commentary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Scorecard */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-[#080d1e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] bg-black/20">
            <h3 className="text-sm font-bold text-white">Batting Card</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-mono text-[#6b7280] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-2 font-normal">Batter</th>
                  <th className="pb-2 font-normal text-right">R</th>
                  <th className="pb-2 font-normal text-right">B</th>
                  <th className="pb-2 font-normal text-right">4s</th>
                  <th className="pb-2 font-normal text-right">6s</th>
                  <th className="pb-2 font-normal text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {Object.entries(liveStats.batters).map(([name, stats]) => {
                  if (stats.balls === 0 && stats.runs === 0 && !stats.out && name !== liveStats.currentStriker && name !== liveStats.currentNonStriker) return null;
                  const isBatting = !stats.out;
                  return (
                    <tr key={name} className="text-[#c4cad6]">
                      <td className="py-2.5 flex items-center gap-2">
                        <span className={isBatting ? "text-white font-semibold" : "opacity-60"}>{name}</span>
                        {isBatting && <span className="text-[10px] bg-white/10 px-1.5 rounded text-white">*</span>}
                        {stats.out && <span className="text-[10px] text-[#ff3b5c]">Out</span>}
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">{stats.runs}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.balls}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.fours}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.sixes}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.balls > 0 ? ((stats.runs/stats.balls)*100).toFixed(1) : "0.0"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-8 border-b border-white/[0.06] pb-2 mb-2">
               <h3 className="text-sm font-bold text-white">Bowling Card</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-mono text-[#6b7280] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-2 font-normal">Bowler</th>
                  <th className="pb-2 font-normal text-right">O</th>
                  <th className="pb-2 font-normal text-right">M</th>
                  <th className="pb-2 font-normal text-right">R</th>
                  <th className="pb-2 font-normal text-right">W</th>
                  <th className="pb-2 font-normal text-right">Econ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {Object.entries(liveStats.bowlers).map(([name, stats]) => {
                  if (stats.balls_bowled === 0 && stats.runs_conceded === 0) return null;
                  return (
                    <tr key={name} className="text-[#c4cad6]">
                      <td className="py-2.5 text-white">{name}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{formatOvers(stats.balls_bowled)}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.maidens}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{stats.runs_conceded}</td>
                      <td className="py-2.5 text-right font-bold text-white">{stats.wickets}</td>
                      <td className="py-2.5 text-right font-mono text-xs">{getEcon(stats.runs_conceded, stats.balls_bowled)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Control Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#050a18] border-t border-white/10 flex items-center justify-center gap-6 px-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {simRunning ? (
          <button onClick={handlePause} className="px-8 py-2 rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/30 text-[#ff6b35] font-bold font-mono hover:bg-[#ff6b35]/20 transition-all flex items-center gap-2">
            <span className="text-lg">⏸</span> PAUSE
          </button>
        ) : (
          <button onClick={handleResume} disabled={winnerDeclared !== null} className="px-8 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-bold font-mono hover:bg-[#00ff88]/20 transition-all disabled:opacity-40 flex items-center gap-2">
            <span className="text-lg">▶</span> RESUME
          </button>
        )}

        <button onClick={handleChangeBall} className="px-8 py-2 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-bold font-mono hover:bg-[#00e5ff]/20 transition-all flex items-center gap-2">
           <span className="text-lg">↺</span> CHANGE TIMELINE
        </button>

        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#6b7280] uppercase mr-2">Speed</span>
          {[{ label: "Fast", ms: 300 }, { label: "Normal", ms: 800 }, { label: "Slow", ms: 1500 }].map(s => (
            <button key={s.ms}
              onClick={() => setSpeed(s.ms)}
              className={`px-4 py-1.5 rounded text-[10px] font-mono transition-all uppercase font-bold tracking-wider ${simSpeed === s.ms ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/40" : "bg-transparent text-[#6b7280] border border-white/10 hover:border-white/30"}`}>
              {s.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── Match Winner Overlay ── */}
      {winnerDeclared && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="glass flex flex-col items-center justify-center p-12 rounded-3xl border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.1)] transform scale-110">
            <h2 className="text-[80px] md:text-[100px] font-black tracking-tighter leading-none text-center" style={{ color: teamColor(winnerDeclared.team), textShadow: `0 0 60px ${teamColor(winnerDeclared.team)}80` }}>
              {winnerDeclared.team}
            </h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white mt-4 uppercase tracking-widest text-center">WINS</h3>
            
            <p className="text-[#c4cad6] mt-8 text-lg md:text-xl font-mono text-center">
              {winnerDeclared.type === "chase"
                ? `Successfully chased ${winnerDeclared.target} — scored ${winnerDeclared.score}/${winnerDeclared.wickets}`
                : `Defended the total — batting side fell for ${winnerDeclared.score}/${winnerDeclared.wickets}`
              }
            </p>
            
            {simResult?.winProb !== null && winnerDeclared.type === "chase" && (
              <div className="mt-8 inline-block bg-[#00ff88]/10 px-6 py-3 rounded-xl border border-[#00ff88]/30 text-center">
                <span className="text-sm font-mono text-[#00ff88]/70 uppercase tracking-wider">Engine Confidence: </span>
                <span className="text-xl font-black text-[#00ff88]">{simResult.winProb.toFixed(1)}%</span>
              </div>
            )}
            {simResult?.winProb !== null && winnerDeclared.type === "defend" && (
              <div className="mt-8 inline-block bg-[#00ff88]/10 px-6 py-3 rounded-xl border border-[#00ff88]/30 text-center">
                <span className="text-sm font-mono text-[#00ff88]/70 uppercase tracking-wider">Engine Confidence: </span>
                <span className="text-xl font-black text-[#00ff88]">{(100 - simResult.winProb).toFixed(1)}%</span>
              </div>
            )}
            
            <button onClick={handleChangeBall} className="mt-10 px-8 py-4 rounded-xl bg-white text-black font-black uppercase tracking-wider hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Try Another Scenario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;
