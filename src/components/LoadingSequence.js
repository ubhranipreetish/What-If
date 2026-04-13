"use client";
import { useEffect, useState } from "react";

export default function LoadingSequence({ onComplete }) {
    const sequences = [
        "Initializing Bayesian Profiles...",
        "Evaluating historical parameter matrices...",
        "Generating alternate timelines...",
        "Running 10,000 Monte Carlo Simulations...",
        "Hunting Target Timeline reality...",
        "Locking Simulation Matrix..."
    ];

    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => {
                if (prev < sequences.length - 1) return prev + 1;
                return prev;
            });
        }, 500); // Sequence text updates every 500ms

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    clearInterval(interval);
                    setTimeout(onComplete, 300); // Brief pause before firing complete
                    return 100;
                }
                return prev + 3; // Rapidly counts up to simulate crunching
            });
        }, 50);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#050a18]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in grid-bg">
            <div className="text-center max-w-lg w-full px-6">
                {/* Tech Spinner Animation */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-t-2 border-[#00e5ff] rounded-full animate-spin" style={{ animationDuration: "1s" }} />
                    <div className="absolute inset-2 border-r-2 border-[#a855f7] rounded-full animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
                    <div className="absolute inset-4 border-b-2 border-[#00ff88] rounded-full animate-spin" style={{ animationDuration: "0.8s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-mono text-white font-bold">{progress}%</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 tracking-widest drop-shadow-md uppercase">
                    Rewriting Reality
                </h2>
                <div className="h-6 overflow-hidden relative">
                    <p className="text-sm font-mono text-[#00e5ff] animate-pulse">
                        &gt; {sequences[index]}
                    </p>
                </div>

                {/* Cyberpunk Progress Bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-8 overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full bg-[#00e5ff] shadow-[0_0_10px_#00e5ff] transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-[10px] text-[#6b7280] font-mono mt-4 text-center tracking-widest">
                    M1 ENGINE • CLUSTER NODE 04
                </p>
            </div>
        </div>
    );
}
