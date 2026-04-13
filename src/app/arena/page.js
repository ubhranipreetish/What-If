"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { evaluateArenaMatch } from "@/data/arenaPlayers";
import ArenaSetup from "@/components/arena/ArenaSetup";
import ArenaDraft from "@/components/arena/ArenaDraft";
import ArenaVersus from "@/components/arena/ArenaVersus";
import ArenaResults from "@/components/arena/ArenaResults";
import LoadingSequence from "@/components/LoadingSequence"; // Reuse the simulation loading sequence

export default function ArenaPage() {
    const router = useRouter();

    // Engine State: 'setup' | 'draft' | 'versus' | 'loading' | 'results'
    const [phase, setPhase] = useState('setup');

    // Core Game State
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [firstPick, setFirstPick] = useState("");
    const [t1Roster, setT1Roster] = useState([]);
    const [t2Roster, setT2Roster] = useState([]);
    const [results, setResults] = useState(null);

    const handleSetupComplete = (data) => {
        setP1(data.p1);
        setP2(data.p2);
        setFirstPick(data.firstPick);
        setPhase('draft');
    };

    const handleDraftComplete = (team1, team2) => {
        setT1Roster(team1);
        setT2Roster(team2);
        setPhase('versus');
    };

    const handleStartSimulation = () => {
        setPhase('loading');
    };

    const handleLoadingComplete = useCallback(async () => {
        try {
            const response = await fetch("http://localhost:8000/api/simulate/arena", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    p1, p2,
                    t1Roster, t2Roster
                })
            });

            if (!response.ok) throw new Error("Arena backend failure.");

            const matchData = await response.json();
            setResults(matchData);
        } catch (error) {
            console.error("Simulation Engine Offline:", error);
            // Fallback for safety if backend is down during live demo
            import("@/data/arenaPlayers").then(m => {
                const fallbackData = m.evaluateArenaMatch(p1, p2, t1Roster, t2Roster);
                setResults(fallbackData);
            });
        } finally {
            setPhase('results');
        }
    }, [p1, p2, t1Roster, t2Roster]);

    const handleRestart = () => {
        setT1Roster([]);
        setT2Roster([]);
        setResults(null);
        setPhase('setup');
    };

    return (
        <div className="min-h-screen grid-bg relative">
            {/* Header / Nav */}
            {phase !== 'versus' && phase !== 'loading' && (
                <header className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-center bg-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <a href="/" className="text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#ff3b5c] transition-colors border border-transparent hover:border-[#ff3b5c]/30 px-3 py-1.5 rounded-full bg-[#050a18]/50 backdrop-blur-md">
                            ← EXIT ARENA
                        </a>
                    </div>
                </header>
            )}

            {/* Rendering the appropriate phase */}
            {phase === 'setup' && <ArenaSetup onComplete={handleSetupComplete} />}

            {phase === 'draft' && (
                <ArenaDraft
                    p1={p1} p2={p2}
                    firstPick={firstPick}
                    onDraftComplete={handleDraftComplete}
                />
            )}

            {phase === 'versus' && (
                <ArenaVersus
                    p1={p1} p2={p2}
                    t1Roster={t1Roster} t2Roster={t2Roster}
                    onStartSimulation={handleStartSimulation}
                />
            )}

            {/* Overloading the LoadingSequence text for Arena using standard prop hack or just reusing the generic sequence. Generic looks fine since it mentions Monte Carlo. */}
            {phase === 'loading' && <LoadingSequence onComplete={handleLoadingComplete} />}

            {phase === 'results' && results && (
                <ArenaResults
                    results={results}
                    p1={p1} p2={p2}
                    t1Roster={t1Roster}
                    t2Roster={t2Roster}
                    onRestart={handleRestart}
                />
            )}
        </div>
    );
}
