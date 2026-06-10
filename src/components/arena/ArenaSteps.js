"use client";

// Compact, mobile-first progress stepper for the Arena flow.
// `current` is the active step index (0=Setup, 1=Draft, 2=Lineups, 3=Match).
// On phones only the active step's label shows (to stay narrow); from `sm` up
// every label is visible.
const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "draft", label: "Draft" },
  { key: "lineups", label: "Lineups" },
  { key: "match", label: "Match" },
];

export default function ArenaSteps({ current = 0 }) {
  return (
    <ol
      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#050a18]/70 border border-white/10 backdrop-blur-md"
      aria-label="Arena progress"
    >
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-1 sm:gap-1.5">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[8px] sm:text-[9px] font-black shrink-0 ${
                active
                  ? "bg-[#00e5ff] text-[#050a18] shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                  : done
                  ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                  : "bg-white/5 text-[#6b7280] border border-white/10"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-wider ${
                active ? "text-white font-bold" : "text-[#6b7280] hidden sm:inline"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`w-2 sm:w-4 h-px shrink-0 ${done ? "bg-[#00ff88]/40" : "bg-white/10"}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
