"use client";
import { useEffect, useState } from "react";

export default function WinProbabilityGauge({ originalProb, newProb, teamName }) {
    const [animatedProb, setAnimatedProb] = useState(originalProb);
    const [showDelta, setShowDelta] = useState(false);

    useEffect(() => {
        // Animate from original to new over 1.2s
        const duration = 1200;
        const startTime = Date.now();
        const diff = newProb - originalProb;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedProb(Math.round(originalProb + diff * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setShowDelta(true);
            }
        };

        const timer = setTimeout(() => requestAnimationFrame(animate), 300);
        return () => clearTimeout(timer);
    }, [originalProb, newProb]);

    const delta = newProb - originalProb;
    const deltaColor = delta > 0 ? "#00ff88" : delta < 0 ? "#ff3b5c" : "#94a3b8";
    const deltaSign = delta > 0 ? "+" : "";

    // SVG arc calculations
    const radius = 80;
    const strokeWidth = 10;
    const circumference = Math.PI * radius; // semicircle
    const fillLength = (animatedProb / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="200" height="120" viewBox="0 0 200 120">
                {/* Background arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Filled arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#gaugeGrad)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${fillLength} ${circumference}`}
                    style={{ transition: "stroke-dasharray 0.3s ease" }}
                />
                {/* Gradient def */}
                <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff3b5c" />
                        <stop offset="50%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#00ff88" />
                    </linearGradient>
                </defs>
                {/* Center text */}
                <text
                    x="100"
                    y="85"
                    textAnchor="middle"
                    className="fill-white text-3xl font-bold"
                    style={{ fontSize: "36px", fontWeight: 800 }}
                >
                    {animatedProb}%
                </text>
                <text
                    x="100"
                    y="105"
                    textAnchor="middle"
                    className="fill-[#6b7280]"
                    style={{ fontSize: "11px" }}
                >
                    WIN PROBABILITY
                </text>
            </svg>

            {/* Team name */}
            <span className="text-sm font-semibold text-[#94a3b8]">{teamName}</span>

            {/* Delta badge */}
            {showDelta && (
                <div
                    className="animate-scale-in flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{
                        background: `${deltaColor}15`,
                        color: deltaColor,
                        border: `1px solid ${deltaColor}40`,
                    }}
                >
                    {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {deltaSign}
                    {delta}%
                </div>
            )}
        </div>
    );
}
