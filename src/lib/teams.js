// Shared IPL franchise helpers. Previously this logic was copy-pasted (with
// subtly different colours and short-code rules) across the matches list and
// match-detail pages. Centralising it keeps team branding consistent app-wide.

// Keyed by the distinctive first word of each franchise so we can match the
// many naming variants in the dataset (e.g. "Royal Challengers Bangalore" vs
// "Royal Challengers Bengaluru").
const TEAM_COLORS = {
  Chennai: "#F9CD05",
  Mumbai: "#004BA0",
  Royal: "#D4213D", // Royal Challengers Bangalore/Bengaluru
  Kolkata: "#3A225D",
  Gujarat: "#1C4E7A",
  Rajasthan: "#EB1B99",
  Sunrisers: "#FF822A",
  Punjab: "#D71920",
  Kings: "#D71920", // Kings XI Punjab (legacy)
  Delhi: "#0078BC",
  Deccan: "#FF822A",
  Kochi: "#4CAF50",
  Pune: "#9C27B0",
  Lucknow: "#0057E2",
};

export const FALLBACK_TEAM_COLOR = "#00e5ff";

/** Resolve a franchise display colour from any naming variant. */
export function teamColor(name) {
  if (!name) return FALLBACK_TEAM_COLOR;
  for (const [keyword, color] of Object.entries(TEAM_COLORS)) {
    if (name.includes(keyword)) return color;
  }
  return FALLBACK_TEAM_COLOR;
}

/**
 * Compact, recognisable short code:
 *  - 3+ word names → initials (Chennai Super Kings → "CSK")
 *  - shorter names → first 3 letters (Mumbai Indians → "MUM")
 */
export function teamShort(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 3) {
    return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

/** Convenience: build the `{ name, short, color }` shape the UI uses. */
export function teamMeta(name) {
  return { name, short: teamShort(name), color: teamColor(name) };
}
