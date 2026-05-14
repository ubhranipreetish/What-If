"use client";
import { useState, useCallback, useRef } from "react";
import ArenaSetup from "@/components/arena/ArenaSetup";
import ArenaDraft from "@/components/arena/ArenaDraft";
import ArenaLineups from "@/components/arena/ArenaLineups";
import LoadingSequence from "@/components/LoadingSequence";
import LiveDashboard from "@/app/simulation/[matchId]/LiveDashboard";

export default function ArenaPage() {

    // Engine State: 'setup' | 'draft' | 'lineups' | 'loading' | 'simulating' | 'done'
    const [phase, setPhase] = useState('setup');

    // Core Game State
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [firstPick, setFirstPick] = useState("");
    const [t1Roster, setT1Roster] = useState([]);
    const [t2Roster, setT2Roster] = useState([]);
    const [lineupData, setLineupData] = useState(null);
    
    // Simulation playback state
    const [results, setResults] = useState(null);
    const [displayBalls, setDisplayBalls] = useState([]);
    const [simRunning, setSimRunning] = useState(false);
    const [winnerDeclared, setWinnerDeclared] = useState(null);
    const [simSpeed, setSimSpeed] = useState(300);
    
    const simSpeedRef = useRef(300);
    const simRunningRef = useRef(false);
    const simQueueRef = useRef([]);
    const simIntervalRef = useRef(null);

    const handleSetupComplete = (data) => {
        setP1(data.p1);
        setP2(data.p2);
        setFirstPick(data.firstPick);
        setPhase('draft');
    };

    const handleDraftComplete = (team1, team2) => {
        setT1Roster(team1);
        setT2Roster(team2);
        setPhase('lineups');
    };

    const handleLineupsComplete = (data) => {
        setLineupData(data);
        setPhase('loading');
    };

    const setSpeed = (s) => { setSimSpeed(s); simSpeedRef.current = s; };

    // ── Auto-play tick system ──
    const stopSim = useCallback(() => {
        simRunningRef.current = false;
        setSimRunning(false);
        if (simIntervalRef.current) clearTimeout(simIntervalRef.current);
    }, []);

    const startSimTick = useCallback(() => {
        simRunningRef.current = true;
        setSimRunning(true);

        const tick = () => {
            if (!simRunningRef.current || simQueueRef.current.length === 0) {
                simRunningRef.current = false;
                setSimRunning(false);
                return;
            }

            const next = simQueueRef.current.shift();
            setDisplayBalls(prev => [...prev, next]);

            let delay = simSpeedRef.current;
            
            if (next.inningsTransition) {
                delay = 4000;
            }

            // Over break injection
            if (!next.inningsTransition && next.legalBalls && next.legalBalls > 0 && next.legalBalls % 6 === 0 && simQueueRef.current.length > 0) {
                const nextBall = simQueueRef.current[0];
                if (nextBall && !nextBall.inningsTransition) {
                    delay += 1500;
                    setTimeout(() => {
                        if (simRunningRef.current) {
                            setDisplayBalls(prev => [...prev, {
                                isOverBreak: true,
                                message: `End of Over ${Math.floor(next.legalBalls / 6)}. Next bowler: ${nextBall.bowler}`,
                                score: next.score,
                                wickets: next.wickets,
                            }]);
                        }
                    }, delay - 800);
                }
            }

            // Check for end of match (last ball was last in queue)
            if (simQueueRef.current.length === 0 && !next.inningsTransition) {
                setTimeout(() => {
                    simRunningRef.current = false;
                    setSimRunning(false);
                    // Winner is determined from backend data, applied after playback
                    if (results) {
                        setWinnerDeclared({
                            team: results.winnerName,
                            type: results.winnerType,
                            target: results.targetScore,
                            score: results.finalScore,
                            wickets: results.finalWickets
                        });
                    }
                }, delay + 500);
            }

            simIntervalRef.current = setTimeout(tick, delay);
        };

        simIntervalRef.current = setTimeout(tick, simSpeedRef.current);
    }, [results]);

    const handleLoadingComplete = useCallback(async () => {
        try {
            const response = await fetch("http://localhost:8000/api/simulate/arena/full", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    p1, p2,
                    t1Roster: lineupData.t1BattingOrder,
                    t2Roster: lineupData.t2BattingOrder,
                    t1BowlingOrder: lineupData.t1BowlingOrder,
                    t2BowlingOrder: lineupData.t2BowlingOrder,
                    tossWinner: lineupData.tossWinner,
                    tossDecision: lineupData.tossDecision
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Arena backend failure.");
            }

            const matchData = await response.json();
            setResults(matchData);
            
            // Queue up all balls for auto-play
            simQueueRef.current = [...matchData.ballLog];
            setDisplayBalls([]);
            setPhase('simulating');
            
            // Start auto-play after brief delay
            setTimeout(() => {
                startSimTick();
            }, 500);
            
        } catch (error) {
            console.error("Simulation Engine Error:", error);
            alert("Failed to simulate match: " + error.message);
            setPhase('lineups'); // Go back to retry
        }
    }, [p1, p2, lineupData, startSimTick]);

    const handlePause = () => stopSim();
    const handleResume = () => startSimTick();

    const handleRestart = () => {
        stopSim();
        setT1Roster([]);
        setT2Roster([]);
        setResults(null);
        setDisplayBalls([]);
        setWinnerDeclared(null);
        setPhase('setup');
    };

    const teamColor = (name) => {
        // Simple color assignment for arena teams
        if (name === p1) return '#00e5ff';
        return '#ff3b5c';
    };

    return (
        <div className="min-h-screen grid-bg relative">
            {/* Header / Nav */}
            {phase !== 'loading' && phase !== 'simulating' && phase !== 'done' && (
                <header className="absolute top-0 left-0 w-full z-50 p-4 md:p-6 flex justify-between items-center bg-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <a href="/" className="text-[9px] md:text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#ff3b5c] transition-colors border border-white/10 hover:border-[#ff3b5c]/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#050a18]/60 backdrop-blur-md">
                            ← <span className="hidden xs:inline">EXIT</span> ARENA
                        </a>
                    </div>
                </header>
            )}

            {/* Rendering the appropriate phase */}
            <div className="pt-16 lg:pt-0">
                {phase === 'setup' && <ArenaSetup onComplete={handleSetupComplete} />}

                {phase === 'draft' && (
                    <ArenaDraft
                        p1={p1} p2={p2}
                        firstPick={firstPick}
                        onDraftComplete={handleDraftComplete}
                    />
                )}

                {phase === 'lineups' && (
                    <ArenaLineups
                        p1={p1} p2={p2}
                        t1Roster={t1Roster} t2Roster={t2Roster}
                        onLineupsComplete={handleLineupsComplete}
                    />
                )}
            </div>

            {phase === 'loading' && <LoadingSequence onComplete={handleLoadingComplete} />}

            {phase === 'simulating' && results && (
                <div className="h-screen w-full relative flex flex-col">
                    {/* Arena Header */}
                    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050a18]/90 backdrop-blur-md shrink-0">
                        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-3 grid grid-cols-3 items-center">
                            <div className="flex justify-start">
                                <button onClick={handleRestart}
                                    className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-mono font-bold tracking-widest text-[#94a3b8] hover:text-white transition-colors group">
                                    <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 md:w-3.5 md:h-3.5">
                                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                                        </svg>
                                    </span>
                                    <span className="hidden xs:inline">NEW DRAFT</span>
                                </button>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-[#00e5ff] font-black text-sm md:text-lg tracking-[0.15em] md:tracking-widest uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                                    ARENA
                                </span>
                            </div>
                            <div className="flex justify-end">
                                <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[8px] md:text-[9px] font-mono text-[#00ff88] tracking-widest uppercase">
                                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                    <span className="hidden md:inline">LIVE</span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Match Details Sub-Header */}
                    <div className="bg-[#050a18]/60 border-b border-white/[0.03] py-2 md:py-3 backdrop-blur-sm shrink-0">
                        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-center gap-3 md:gap-4">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
                                <span className="text-white text-[10px] md:text-sm font-black tracking-widest uppercase truncate max-w-[80px] md:max-w-none">{p1}</span>
                            </div>
                            <span className="text-[#6b7280] text-[8px] md:text-[10px] font-black italic">VS</span>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="text-white text-[10px] md:text-sm font-black tracking-widest uppercase truncate max-w-[80px] md:max-w-none">{p2}</span>
                                <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-[#ff3b5c] shadow-[0_0_8px_#ff3b5c]" />
                            </div>
                            <span className="hidden xs:inline text-[8px] md:text-[9px] text-[#6b7280] font-mono tracking-wider uppercase ml-2">11v11 • T20</span>
                        </div>
                    </div>

                    {/* LiveDashboard */}
                    <div className="flex-1 overflow-hidden">
                        <LiveDashboard
                            simResult={results}
                            simBalls={displayBalls}
                            simRunning={simRunning}
                            target={results.targetScore}
                            winnerDeclared={winnerDeclared}
                            handlePause={handlePause}
                            handleResume={handleResume}
                            handleChangeBall={handleRestart}
                            simSpeed={simSpeed}
                            setSpeed={setSpeed}
                            teamColor={teamColor}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
