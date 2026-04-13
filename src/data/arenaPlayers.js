export const arenaPlayerPool = [
    // Batsmen
    { id: "p01", name: "Virat Kohli", role: "Batter", style: "Anchor", avgSR: 138, avg: 45, type: "batter", cost: 10, imgColor: "#D4213D" },
    { id: "p02", name: "AB de Villiers", role: "Batter", style: "360° Player", avgSR: 165, avg: 40, type: "batter", cost: 10, imgColor: "#D4213D" },
    { id: "p03", name: "Chris Gayle", role: "Batter", style: "Power Hitter", avgSR: 155, avg: 38, type: "batter", cost: 9, imgColor: "#D4A843" },
    { id: "p04", name: "MS Dhoni", role: "WK-Batter", style: "Finisher", avgSR: 140, avg: 39, type: "batter", cost: 9, imgColor: "#FCCA06" },
    { id: "p05", name: "Rohit Sharma", role: "Batter", style: "Opener", avgSR: 135, avg: 31, type: "batter", cost: 9, imgColor: "#004BA0" },
    { id: "p06", name: "Suryakumar Yadav", role: "Batter", style: "360° Player", avgSR: 170, avg: 35, type: "batter", cost: 10, imgColor: "#004BA0" },
    { id: "p07", name: "David Warner", role: "Batter", style: "Opener", avgSR: 142, avg: 41, type: "batter", cost: 9, imgColor: "#FF822A" },
    { id: "p08", name: "Jos Buttler", role: "WK-Batter", style: "Power Hitter", avgSR: 152, avg: 38, type: "batter", cost: 9, imgColor: "#E73795" },

    // All-Rounders
    { id: "p09", name: "Andre Russell", role: "All-Rounder", style: "Slogger", avgSR: 180, avg: 29, economy: 9.1, wicketsPerMatch: 1.1, type: "allrounder", cost: 10, imgColor: "#3A225D" },
    { id: "p10", name: "Hardik Pandya", role: "All-Rounder", style: "Finisher", avgSR: 145, avg: 30, economy: 8.5, wicketsPerMatch: 0.9, type: "allrounder", cost: 9, imgColor: "#004BA0" },
    { id: "p11", name: "Ravindra Jadeja", role: "All-Rounder", style: "Finisher", avgSR: 135, avg: 26, economy: 7.2, wicketsPerMatch: 1.2, type: "allrounder", cost: 8, imgColor: "#FCCA06" },
    { id: "p12", name: "Glenn Maxwell", role: "All-Rounder", style: "Aggressor", avgSR: 160, avg: 28, economy: 8.1, wicketsPerMatch: 0.8, type: "allrounder", cost: 8, imgColor: "#D4213D" },
    { id: "p13", name: "Ben Stokes", role: "All-Rounder", style: "Aggressor", avgSR: 138, avg: 25, economy: 8.4, wicketsPerMatch: 1.0, type: "allrounder", cost: 8, imgColor: "#E73795" },

    // Bowlers
    { id: "p14", name: "Jasprit Bumrah", role: "Bowler", style: "Fast", economy: 6.6, wicketsPerMatch: 1.8, type: "bowler", cost: 10, imgColor: "#004BA0" },
    { id: "p15", name: "Lasith Malinga", role: "Bowler", style: "Fast", economy: 7.1, wicketsPerMatch: 1.6, type: "bowler", cost: 9, imgColor: "#004BA0" },
    { id: "p16", name: "Rashid Khan", role: "Bowler", style: "Spin", economy: 6.8, wicketsPerMatch: 1.7, type: "bowler", cost: 10, imgColor: "#1C1C1C" },
    { id: "p17", name: "Sunil Narine", role: "Bowler", style: "Spin", economy: 6.7, wicketsPerMatch: 1.5, type: "bowler", cost: 9, imgColor: "#3A225D" },
    { id: "p18", name: "Trent Boult", role: "Bowler", style: "Fast", economy: 7.8, wicketsPerMatch: 1.4, type: "bowler", cost: 8, imgColor: "#E73795" },
    { id: "p19", name: "Jofra Archer", role: "Bowler", style: "Fast", economy: 7.2, wicketsPerMatch: 1.5, type: "bowler", cost: 9, imgColor: "#254AA5" },
    { id: "p20", name: "Yuzvendra Chahal", role: "Bowler", style: "Spin", economy: 7.6, wicketsPerMatch: 1.6, type: "bowler", cost: 8, imgColor: "#D4213D" }
];

export function evaluateArenaMatch(team1Name, team2Name, team1Players, team2Players) {
    // Basic AI Engine logic to evaluate a gamified 5v5 encounter.
    // In a 5v5, you balance the aggregated batting stat vs the aggregated bowling stat.

    // Find Team 1 totals
    let t1BatScore = 0;
    let t1BowlScore = 0;
    team1Players.forEach(p => {
        if (p.type === 'batter' || p.type === 'allrounder') {
            t1BatScore += (p.avgSR * p.avg);
        }
        if (p.type === 'bowler' || p.type === 'allrounder') {
            t1BowlScore += ((10 - p.economy) * p.wicketsPerMatch * 100);
        }
    });

    // Find Team 2 totals
    let t2BatScore = 0;
    let t2BowlScore = 0;
    team2Players.forEach(p => {
        if (p.type === 'batter' || p.type === 'allrounder') {
            t2BatScore += (p.avgSR * p.avg);
        }
        if (p.type === 'bowler' || p.type === 'allrounder') {
            t2BowlScore += ((10 - p.economy) * p.wicketsPerMatch * 100);
        }
    });

    // Baseline 5-over expected scores (avg ~ 45 runs)
    let t1ExpectedRuns = 45 + Math.round((t1BatScore - t2BowlScore) / 400);
    let t2ExpectedRuns = 45 + Math.round((t2BatScore - t1BowlScore) / 400);

    // Bound realistic 5-over match limits
    t1ExpectedRuns = Math.max(20, Math.min(85, t1ExpectedRuns));
    t2ExpectedRuns = Math.max(20, Math.min(85, t2ExpectedRuns));

    const totalRuns = t1ExpectedRuns + t2ExpectedRuns;
    const t2WinProb = Math.round((t2ExpectedRuns / totalRuns) * 100);
    const t1WinProb = 100 - t2WinProb;

    const winnerName = t1WinProb > t2WinProb ? team1Name : team2Name;
    const winnerProb = Math.max(t1WinProb, t2WinProb);

    // Identify MVP and reason
    let mvp = team1Players[0];
    let maxImpact = 0;
    const winningPlayers = t1WinProb > t2WinProb ? team1Players : team2Players;
    const losingPlayers = t1WinProb > t2WinProb ? team2Players : team1Players;

    winningPlayers.forEach(p => {
        const impact = p.type === 'bowler' ? (10 - p.economy) * p.cost : p.avgSR;
        if (impact > maxImpact) {
            maxImpact = impact;
            mvp = p;
        }
    });

    const keyMatchup = {
        winner: mvp.name,
        loser: losingPlayers[Math.floor(Math.random() * losingPlayers.length)].name,
        reason: mvp.type === 'bowler'
            ? `${mvp.name}'s elite death-over economy neutralized the aggressive strike rate of the opposition.`
            : `${mvp.name}'s sheer power-hitting dismantled the opposition's bowling attack in the final 2 overs.`
    };

    return {
        winnerName,
        winnerProb,
        t1WinProb,
        t2WinProb,
        t1ExpectedRuns: `${t1ExpectedRuns}/${Math.floor(Math.random() * 3) + 1}`,
        t2ExpectedRuns: `${t2ExpectedRuns}/${Math.floor(Math.random() * 3) + 1}`,
        mvp: mvp.name,
        keyMatchup
    };
}
