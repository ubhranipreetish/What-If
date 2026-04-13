"use client";

export default function MatchCard({ match, index, onClick }) {
    return (
        <button
            onClick={onClick}
            className="group relative w-full text-left rounded-2xl overflow-hidden 
        glass transition-all duration-500 ease-out cursor-pointer
        hover:scale-[1.02] hover:border-[rgba(0,229,255,0.3)]
        hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]"
            style={{
                animationDelay: `${index * 120}ms`,
                animation: `slide-up 0.6s ease-out ${index * 120}ms forwards`,
                opacity: 0,
            }}
        >
            {/* Gradient accent bar top */}
            <div
                className="h-1 w-full"
                style={{
                    background: `linear-gradient(90deg, ${match.team1.color}, ${match.team2.color})`,
                }}
            />

            <div className="p-6">
                {/* Header: Teams */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Team 1 badge */}
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                            style={{ background: match.team1.color }}
                        >
                            {match.team1.short}
                        </div>
                        <span className="text-[#6b7280] text-sm font-medium">vs</span>
                        {/* Team 2 badge */}
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                            style={{ background: match.team2.color }}
                        >
                            {match.team2.short}
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="text-[#6b7280] group-hover:text-[#00e5ff] transition-colors text-xl">
                        →
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#00e5ff] transition-colors">
                    {match.title}
                </h3>

                {/* Meta */}
                <p className="text-xs text-[#6b7280] mb-4">
                    {match.venue} • {match.date}
                </p>

                {/* Critical moment */}
                <div className="glass-light rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff3b5c] animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#ff3b5c]">
                            Critical Moment — Over {match.criticalMoment.over}
                        </span>
                    </div>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">
                        {match.criticalMoment.situation}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs font-mono text-[#00e5ff]">
                            {match.criticalMoment.score}
                        </span>
                        <span className="text-xs text-[#6b7280]">
                            Target: {match.criticalMoment.target}
                        </span>
                        <span className="text-xs text-[#ffd700]">
                            RR: {match.criticalMoment.runRate.required}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}
