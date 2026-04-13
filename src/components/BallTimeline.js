"use client";

export default function BallTimeline({ commentary }) {
    if (!commentary || commentary.length === 0) return null;

    const getTypeIcon = (type) => {
        switch (type) {
            case "6": return "💥";
            case "4": return "🏏";
            case "wicket": return "🔴";
            case "wide": return "⚠️";
            case "dot": return "•";
            default: return "▸";
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case "6":
                return "bg-[#ffd700]/15 text-[#ffd700] border-[#ffd700]/30";
            case "4":
                return "bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30";
            case "wicket":
                return "bg-[#ff3b5c]/15 text-[#ff3b5c] border-[#ff3b5c]/30";
            case "wide":
                return "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30";
            case "dot":
                return "bg-[#6b7280]/10 text-[#6b7280] border-[#6b7280]/20";
            default:
                return "bg-[#94a3b8]/10 text-[#94a3b8] border-[#94a3b8]/20";
        }
    };

    return (
        <div className="w-full">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6b7280] mb-4 flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#00e5ff]" />
                Generated Ball-by-Ball Timeline
                <span className="w-3 h-0.5 bg-[#00e5ff]" />
            </h3>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {commentary.map((ball, i) => (
                    <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl glass-light 
              hover:border-[rgba(0,229,255,0.15)] transition-all duration-300"
                        style={{
                            animation: `slide-up 0.4s ease-out ${i * 40}ms forwards`,
                            opacity: 0,
                        }}
                    >
                        {/* Ball number */}
                        <div className="flex-shrink-0 w-12 text-center">
                            <span className="text-xs font-mono font-bold text-[#00e5ff]">
                                {ball.ball}
                            </span>
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0 text-sm mt-0.5">
                            {getTypeIcon(ball.type)}
                        </div>

                        {/* Text */}
                        <p className="flex-1 text-sm text-[#c4cad6] leading-relaxed">
                            {ball.text}
                        </p>

                        {/* Badge */}
                        <div className="flex-shrink-0">
                            <span
                                className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold border ${getTypeBadge(
                                    ball.type
                                )}`}
                            >
                                {ball.type === "dot"
                                    ? "0"
                                    : ball.type === "wicket"
                                        ? "W"
                                        : ball.type === "wide"
                                            ? "WD"
                                            : ball.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
