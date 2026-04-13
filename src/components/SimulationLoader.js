"use client";
import { useEffect, useState, useRef } from "react";

export default function SimulationLoader({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [currentNum, setCurrentNum] = useState("0000");
    const [statusText, setStatusText] = useState("Initializing Monte Carlo Engine...");
    const intervalRef = useRef(null);
    const numIntervalRef = useRef(null);

    useEffect(() => {
        // Progress bar: 0 -> 100 in 2.5s
        const totalDuration = 2500;
        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const p = Math.min((elapsed / totalDuration) * 100, 100);
            setProgress(p);

            // Update status text at milestones
            if (p > 20 && p < 40) setStatusText("Sampling historical performance vectors...");
            else if (p >= 40 && p < 60) setStatusText("Computing conditional win probabilities...");
            else if (p >= 60 && p < 80) setStatusText("Running M5 Target Hunt algorithm...");
            else if (p >= 80 && p < 95) setStatusText("Generating alternate ball-by-ball timeline...");
            else if (p >= 95) setStatusText("Simulation Complete ✓");

            if (p >= 100) {
                clearInterval(intervalRef.current);
                setTimeout(() => onComplete(), 400);
            }
        }, 30);

        // Flickering numbers
        numIntervalRef.current = setInterval(() => {
            setCurrentNum(
                Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0")
            );
        }, 50);

        return () => {
            clearInterval(intervalRef.current);
            clearInterval(numIntervalRef.current);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a18]/95 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-auto px-8">
                {/* Floating random numbers background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <span
                            key={i}
                            className="absolute font-mono text-[#00e5ff]/10 text-sm"
                            style={{
                                left: `${(i * 5) % 100}%`,
                                top: `${(i * 7 + 10) % 100}%`,
                                animation: `ticker ${0.3 + (i % 5) * 0.1}s ease-in-out infinite`,
                                animationDelay: `${i * 50}ms`,
                            }}
                        >
                            {Math.floor(Math.random() * 9999).toString().padStart(4, "0")}
                        </span>
                    ))}
                </div>

                {/* Main content */}
                <div className="relative text-center">
                    {/* Big flickering number */}
                    <div className="mb-8">
                        <span className="font-mono text-6xl font-bold text-[#00e5ff] tabular-nums">
                            {currentNum}
                        </span>
                        <span className="block text-sm text-[#6b7280] mt-2 font-mono">/ 10,000 simulations</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-white mb-2">
                        Running Monte Carlo Simulations
                    </h2>
                    <p className="text-sm text-[#00e5ff]/70 font-mono mb-8">
                        via O(1) Memory Engine • 10,000 iterations
                    </p>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.05)] mb-4 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-100 ease-linear"
                            style={{
                                width: `${progress}%`,
                                background: "linear-gradient(90deg, #00e5ff, #a855f7, #ff6b35)",
                            }}
                        />
                    </div>

                    {/* Status text */}
                    <p className="text-xs text-[#94a3b8] font-mono animate-pulse">
                        {statusText}
                    </p>

                    {/* Percentage */}
                    <p className="text-sm font-bold text-white mt-3 font-mono">
                        {Math.round(progress)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
