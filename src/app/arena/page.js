"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import ArenaSetup from "@/components/arena/ArenaSetup";
import ArenaDraft from "@/components/arena/ArenaDraft";
import ArenaLineups from "@/components/arena/ArenaLineups";
import ArenaSteps from "@/components/arena/ArenaSteps";
import LoadingSequence from "@/components/LoadingSequence";
import LiveDashboard from "@/app/simulation/[matchId]/LiveDashboard";
import { API_BASE as API } from "@/lib/api";

// Maps the engine phase to a step index for the progress indicator.
const PHASE_TO_STEP = { setup: 0, draft: 1, lineups: 2, loading: 3, simulating: 3, done: 3 };

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
    const [simError, setSimError] = useState(""); // inline sim-failure message

    const [activeInnings, setActiveInnings] = useState(1);

    // Auto-dismiss the sim-failure toast.
    useEffect(() => {
        if (!simError) return;
        const t = setTimeout(() => setSimError(""), 6000);
        return () => clearTimeout(t);
    }, [simError]);

    // Simulation playback state
    const [results, setResults] = useState(null);
    const resultsRef = useRef(null);
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
                setActiveInnings(2);
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
                    const currentResults = resultsRef.current;
                    if (currentResults) {
                        setWinnerDeclared({
                            team: currentResults.winnerName,
                            type: currentResults.winnerType,
                            target: currentResults.targetScore,
                            score: currentResults.finalScore,
                            wickets: currentResults.finalWickets
                        });
                    }
                }, delay + 500);
            }

            simIntervalRef.current = setTimeout(tick, delay);
        };

        simIntervalRef.current = setTimeout(tick, simSpeedRef.current);
    }, []);

    const handleLoadingComplete = useCallback(async () => {
        try {
            const response = await fetch(`${API}/api/simulate/arena/full`, {
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
            resultsRef.current = matchData;
            
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
            setSimError(error.message || "The match engine didn't respond.");
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
        resultsRef.current = null;
        setDisplayBalls([]);
        setWinnerDeclared(null);
        setActiveInnings(1);
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
                <header className="absolute top-0 left-0 w-full z-50 px-3 md:px-6 pt-3 md:pt-6 flex justify-between items-center gap-2 bg-transparent pointer-events-none">
                    <div className="pointer-events-auto shrink-0">
                        <Link href="/" className="inline-flex items-center text-[9px] md:text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#ff3b5c] transition-colors border border-white/10 hover:border-[#ff3b5c]/30 px-3 md:px-4 py-2 rounded-full bg-[#050a18]/60 backdrop-blur-md min-h-[40px]">
                            ← <span className="hidden xs:inline">&nbsp;EXIT</span>&nbsp;ARENA
                        </Link>
                    </div>
                    <div className="pointer-events-auto shrink-0">
                        <ArenaSteps current={PHASE_TO_STEP[phase] ?? 0} />
                    </div>
                </header>
            )}

            {/* Rendering the appropriate phase — the top padding clears the absolute
                header, so it only applies to the phases that actually show that header. */}
            {(phase === 'setup' || phase === 'draft' || phase === 'lineups') && (
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
            )}

            {phase === 'loading' && <LoadingSequence onComplete={handleLoadingComplete} isArena={true} />}

            {phase === 'simulating' && results && (
                <div className="min-h-screen lg:h-screen w-full relative flex flex-col">
                    {/* Arena Header */}
                    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050a18]/90 backdrop-blur-md shrink-0">
                        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-3 grid grid-cols-3 items-center">
                            <div className="flex justify-start">
                                <button onClick={handleRestart}
                                    aria-label="Start a new draft"
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
                    <div className="flex-1 lg:overflow-hidden">
                        <LiveDashboard
                            simResult={results}
                            simBalls={displayBalls}
                            alternateBalls={displayBalls}
                            simRunning={simRunning}
                            target={results.targetScore}
                            winnerDeclared={winnerDeclared}
                            handlePause={handlePause}
                            handleResume={handleResume}
                            handleChangeBall={handleRestart}
                            handleBranchSimulate={() => {}}
                            simSpeed={simSpeed}
                            setSpeed={setSpeed}
                            teamColor={teamColor}
                            activeInnings={activeInnings}
                            innings={{
                                "1": { battingTeam: results.battingFirst, bowlingTeam: results.battingSecond, balls: [] },
                                "2": { battingTeam: results.battingSecond, bowlingTeam: results.battingFirst, balls: [] }
                            }}
                            rosters={{
                                team1: { name: p1, players: t1Roster.map(p => p.name) },
                                team2: { name: p2, players: t2Roster.map(p => p.name) }
                            }}
                            isArena={true}
                            transitionMs={4000}
                        />
                    </div>
                </div>
            )}

            {/* Sim-failure toast — replaces a blocking window.alert */}
            {simError && (
                <div role="alert" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[70] w-[92vw] max-w-md px-4 py-3 rounded-xl bg-[#ff3b5c]/15 border border-[#ff3b5c]/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-start gap-2.5 animate-slide-up">
                    <span className="text-[#ff3b5c] text-sm shrink-0 mt-0.5" aria-hidden="true">⚠</span>
                    <p className="flex-1 text-[11px] sm:text-xs text-white font-medium leading-snug">Couldn&apos;t simulate the match: {simError}. Adjust your lineups and try again.</p>
                    <button onClick={() => setSimError("")} aria-label="Dismiss message" className="shrink-0 text-[#94a3b8] hover:text-white text-sm leading-none">✕</button>
                </div>
            )}
        </div>
    );
}
