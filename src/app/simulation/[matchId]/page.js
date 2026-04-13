"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, use, useEffect } from "react";
import { generateSimulationResult } from "@/data/matchData";
import GlowButton from "@/components/GlowButton";
import TimelineSlider from "@/components/TimelineSlider";
import CommandCenter from "@/components/CommandCenter";
import SimulationDashboard from "@/components/SimulationDashboard";
import LoadingSequence from "@/components/LoadingSequence";

export default function SimulationPage({ params }) {
    const { matchId } = use(params);
    const router = useRouter();

    const [mounted, setMounted] = useState(false);

    // Dynamic Match State
    const [match, setMatch] = useState(null);
    const [loadingMatch, setLoadingMatch] = useState(true);
    const [matchError, setMatchError] = useState(false);

    // Fetch Match Data
    useEffect(() => {
        setMounted(true);
        fetch(`http://localhost:8000/api/metadata/match/${matchId}`)
            .then(res => {
                if (!res.ok) throw new Error("Match not found or engine offline.");
                return res.json();
            })
            .then(data => {
                setMatch(data);
                setInterventionPoint(data.criticalMoment?.over || "0");
                setSelectedBatter(data.batters[0]?.id || "");
                setSelectedBowler(data.bowlers[0]?.id || "");
            })
            .catch(err => {
                console.error("Failed to load match:", err);
                setMatchError(true);
            })
            .finally(() => {
                setLoadingMatch(false);
            });
    }, [matchId]);

    // Timeline Intervention State (Step 2)
    const [interventionPoint, setInterventionPoint] = useState("0");

    // Tactical Override State (Step 3)
    const [selectedBatter, setSelectedBatter] = useState("");
    const [selectedBowler, setSelectedBowler] = useState("");
    const [customEvent, setCustomEvent] = useState(null); // 'wicket' or '6'

    // Engine Flow State
    const [phase, setPhase] = useState("studio"); // studio | loading | dashboard
    const [result, setResult] = useState(null);

    const handleSimulate = () => {
        setPhase("loading");
    };

    const handleLoadingComplete = useCallback(async () => {
        try {
            // Reconstruct the over/ball from the intervention point (e.g., "18.4")
            const [over, ball_no] = interventionPoint.split('.').map(Number);

            const response = await fetch("http://localhost:8000/api/simulate/what-if", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    match_id: parseInt(matchId),
                    innings: 2, // Hardcoded to 2 for chase scenarios currently
                    over: over,
                    ball_no: ball_no || 1,
                    new_runs: customEvent === '6' ? 6 : null,
                    force_wicket: customEvent === 'wicket',
                    new_striker: selectedBatter,
                    new_bowler: selectedBowler
                })
            });

            if (!response.ok) throw new Error("Backend engine failed or Offline");
            const data = await response.json();

            // Format Python engine response for the SimulationDashboard UI
            setResult({
                winProbShift: data.win_probability ? `+${data.win_probability}%` : "+14%",
                expectedRuns: `${data.projected_median_score}`,
                confidenceInterval: `±${(data.std_dev * 1.96).toFixed(1)}`, // Rough 95% CI
                commentary: [
                    { id: 1, type: customEvent === 'wicket' ? 'wicket' : 'boundary', text: `TIMELINE ALTERED: ${selectedBatter} steps up against ${selectedBowler}.` },
                    { id: 2, type: 'normal', text: `Engine ran 2,000 Monte Carlo instances.` },
                    { id: 3, type: 'normal', text: `Median projected score settles at ${data.projected_median_score}.` },
                    { id: 4, type: 'wicket', text: `Win probability stabilized at ${data.win_probability}%.` }
                ]
            });

        } catch (error) {
            console.error("Simulation Engine Offline:", error);
            // Fallback to JS Mock for frontend demo if Backend isn't running
            const simResult = generateSimulationResult(
                match,
                interventionPoint,
                selectedBatter,
                selectedBowler,
                customEvent
            );
            setResult(simResult);
        } finally {
            setPhase("dashboard");
        }
    }, [match, matchId, interventionPoint, selectedBatter, selectedBowler, customEvent]);

    const handleReset = () => {
        setPhase("studio");
        setResult(null);
    };

    if (!mounted) return null;

    if (loadingMatch) {
        return (
            <div className="min-h-screen grid-bg flex flex-col items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-[#00e5ff] animate-pulse mb-6 shadow-[0_0_20px_rgba(0,229,255,0.7)]" />
                <h1 className="text-[#00e5ff] font-mono text-sm tracking-widest pt-4">RETRIEVING MATCH TELEMETRY...</h1>
            </div>
        );
    }

    if (matchError || !match) {
        return (
            <div className="min-h-screen grid-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[#ff3b5c] mb-4 tracking-widest uppercase shadow-[#ff3b5c]/50">CORRUPTED TIMELINE</h1>
                    <p className="font-mono text-white/50 mb-8 max-w-sm mx-auto">The backend engine could not extract telemetry for this historical event. Make sure the dataset is loaded.</p>
                    <GlowButton href="/matches" size="md">
                        Return to Archives
                    </GlowButton>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg">
            {/* Step 4: Loading Reality Layer */}
            {phase === "loading" && <LoadingSequence onComplete={handleLoadingComplete} />}

            {/* Header */}
            <header className="border-b border-[rgba(255,255,255,0.06)] bg-[#050a18]/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 group">
                        <span className="text-[#00e5ff] font-black text-xl tracking-tight leading-none group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">
                            ◈ COUNTERPLAY // STUDIO
                        </span>
                    </a>
                    <button
                        onClick={() => router.push("/matches")}
                        className="text-[10px] font-mono tracking-widest text-[#6b7280] hover:text-[#00e5ff] transition-colors cursor-pointer border border-[#6b7280]/20 hover:border-[#00e5ff]/50 px-3 py-1.5 rounded-full"
                    >
                        [ESC] ABORT MISSION
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Global Context Header */}
                <div className="glass rounded-2xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none group-hover:bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] transition-colors duration-1000" />

                    <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-inner" style={{ background: match.team1.color }}>
                            {match.team1.short}
                        </div>
                        <span className="text-[#6b7280] font-black italic text-xl">VS</span>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-inner" style={{ background: match.team2.color }}>
                            {match.team2.short}
                        </div>
                    </div>

                    <div className="text-left md:text-right z-10 w-full md:w-auto">
                        <p className="text-[#00e5ff] text-[10px] font-mono font-bold tracking-[0.2em] mb-1">SELECTED TEMPORAL TARGET</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">{match.title}</h1>
                        <p className="text-xs text-[#94a3b8] font-mono mt-1">{match.date} • {match.venue}</p>
                    </div>
                </div>

                {/* ========== WHAT-IF STUDIO (Steps 2 & 3) ========== */}
                {phase === "studio" && (
                    <div className="animate-fade-in space-y-10">

                        {/* Step 2: Pinpoint Turning Point */}
                        <TimelineSlider
                            timeline={match.criticalMoment.timeline || []}
                            value={interventionPoint}
                            onChange={setInterventionPoint}
                            score={match.criticalMoment.score}
                            target={match.criticalMoment.target}
                            striker={match.criticalMoment.striker}
                            nonStriker={match.criticalMoment.nonStriker}
                            bowler={match.criticalMoment.currentBowler}
                        />

                        {/* Step 3: Command Center (Tactical Override) */}
                        <CommandCenter
                            match={match}
                            selectedBatter={selectedBatter}
                            setSelectedBatter={setSelectedBatter}
                            selectedBowler={selectedBowler}
                            setSelectedBowler={setSelectedBowler}
                            customEvent={customEvent}
                            setCustomEvent={setCustomEvent}
                        />

                        {/* Step 4 Trigger Placeholder */}
                        <div className="text-center pt-8 pb-12 animate-slide-up">
                            <p className="text-[#00e5ff] text-[10px] font-mono font-bold tracking-[0.2em] mb-4 uppercase">Step 04</p>
                            <GlowButton onClick={handleSimulate} className="!px-16 !py-6 !text-xl shadow-[0_0_50px_rgba(0,229,255,0.3)] hover:shadow-[0_0_80px_rgba(0,229,255,0.5)] bg-gradient-to-r from-[#00e5ff] to-[#a855f7]">
                                <span className="flex items-center gap-3 text-white font-black tracking-widest drop-shadow-lg">
                                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    INITIATE TIMELINE SPLIT
                                </span>
                            </GlowButton>
                            <p className="text-[10px] text-[#6b7280] mt-6 font-mono tracking-widest uppercase">
                                Warning: Actions will spawn 10,000 alternate realities
                            </p>
                        </div>
                    </div>
                )}

                {/* ========== RESULT DASHBOARD (Step 5) ========== */}
                {phase === "dashboard" && result && (
                    <div className="animate-fade-in space-y-10">
                        <SimulationDashboard result={result} />

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 pb-12">
                            <button
                                onClick={handleReset}
                                className="px-8 py-4 rounded-xl glass-light border border-white/10 text-sm font-bold text-white hover:bg-white/5 transition-all w-full sm:w-auto shadow-lg"
                            >
                                ↻ Try Another Strategy
                            </button>
                            <GlowButton href="/matches" className="w-full sm:w-auto text-sm !py-4 shadow-lg">
                                ← Back to Archives
                            </GlowButton>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
