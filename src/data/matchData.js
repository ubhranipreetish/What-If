// Demo IPL match data with critical turning points and pre-computed alternate scenarios

export const matches = [
    {
        id: "csk-vs-mi-2019-final",
        title: "IPL 2019 Final",
        team1: { name: "Mumbai Indians", short: "MI", color: "#004BA0", accent: "#D1AB3E" },
        team2: { name: "Chennai Super Kings", short: "CSK", color: "#FCCA06", accent: "#E44D26" },
        venue: "Rajiv Gandhi International Stadium, Hyderabad",
        date: "May 12, 2019",
        criticalMoment: {
            over: "18.4",
            situation: "CSK needs 18 runs off 8 balls. Watson is run out!",
            score: "CSK: 146/4",
            target: 150,
            battingTeam: "CSK",
            bowlingTeam: "MI",
            runRate: { required: 13.5, current: 7.82 },
            originalWinProb: { team1: 68, team2: 32 },
            striker: "Shane Watson",
            nonStriker: "Ravindra Jadeja",
            currentBowler: "Lasith Malinga",
            timeline: [
                { over: 15, winProb: 42, rr: 6.2 },
                { over: 16, winProb: 55, rr: 7.0 },
                { over: 17, winProb: 65, rr: 7.5 },
                { over: 18, winProb: 82, rr: 8.2 },
                { over: 18.4, winProb: 32, rr: 7.82 },
            ]
        },
        batters: [
            { id: "dhoni", name: "MS Dhoni", role: "WK-Batter", style: "Finisher", avgSR: 145, avg: 38 },
            { id: "jadeja", name: "Ravindra Jadeja", role: "All-rounder", style: "Aggressor", avgSR: 155, avg: 24 },
            { id: "bravo", name: "Dwayne Bravo", role: "All-rounder", style: "Power-hitter", avgSR: 138, avg: 20 },
            { id: "watson", name: "Shane Watson", role: "All-rounder", style: "Anchor", avgSR: 140, avg: 32 },
            { id: "thakur", name: "Shardul Thakur", role: "Bowler", style: "Slogger", avgSR: 160, avg: 12 },
            { id: "chahar_d", name: "Deepak Chahar", role: "Bowler", style: "Slogger", avgSR: 140, avg: 10 }
        ],
        bowlers: [
            { id: "bumrah", name: "Jasprit Bumrah", role: "Fast", economy: 6.6, wicketsPerMatch: 1.8 },
            { id: "malinga", name: "Lasith Malinga", role: "Fast", economy: 7.1, wicketsPerMatch: 1.5 },
            { id: "krunal", name: "Krunal Pandya", role: "Spin", economy: 7.8, wicketsPerMatch: 0.9 },
            { id: "chahar", name: "Rahul Chahar", role: "Spin", economy: 7.5, wicketsPerMatch: 1.2 },
            { id: "hardik", name: "Hardik Pandya", role: "Medium", economy: 8.2, wicketsPerMatch: 1.0 },
        ],
    },
    {
        id: "rcb-vs-kkr-2008",
        title: "IPL 2008 — Gayle Storm",
        team1: { name: "Royal Challengers Bangalore", short: "RCB", color: "#D4213D", accent: "#1C1C1C" },
        team2: { name: "Kolkata Knight Riders", short: "KKR", color: "#3A225D", accent: "#D4A843" },
        venue: "M. Chinnaswamy Stadium, Bangalore",
        date: "April 18, 2008",
        criticalMoment: {
            over: "12.0",
            situation: "RCB needs 78 runs off 48 balls. McCullum on fire!",
            score: "RCB: 84/3",
            target: 162,
            battingTeam: "RCB",
            bowlingTeam: "KKR",
            runRate: { required: 9.75, current: 7.0 },
            originalWinProb: { team1: 35, team2: 65 },
            striker: "Chris Gayle",
            nonStriker: "Jacques Kallis",
            currentBowler: "Brett Lee",
            timeline: [
                { over: 8, winProb: 20, rr: 5.5 },
                { over: 10, winProb: 25, rr: 6.2 },
                { over: 11, winProb: 30, rr: 6.8 },
                { over: 12, winProb: 35, rr: 7.0 }
            ]
        },
        batters: [
            { id: "gayle", name: "Chris Gayle", role: "Opener", style: "Universe Boss", avgSR: 155, avg: 42 },
            { id: "kallis", name: "Jacques Kallis", role: "All-rounder", style: "Anchor", avgSR: 120, avg: 35 },
            { id: "dravid", name: "Rahul Dravid", role: "Batter", style: "The Wall", avgSR: 110, avg: 30 },
            { id: "uthappa", name: "Robin Uthappa", role: "Batter", style: "Aggressor", avgSR: 138, avg: 28 },
            { id: "boucher", name: "Mark Boucher", role: "WK-Batter", style: "Finisher", avgSR: 125, avg: 25 },
        ],
        bowlers: [
            { id: "lee", name: "Brett Lee", role: "Fast", economy: 7.2, wicketsPerMatch: 1.6 },
            { id: "agarkar", name: "Ajit Agarkar", role: "Fast", economy: 8.1, wicketsPerMatch: 1.3 },
            { id: "murali", name: "Muttiah Muralitharan", role: "Spin", economy: 6.4, wicketsPerMatch: 1.7 },
            { id: "hodge", name: "Brad Hodge", role: "Part-time Spin", economy: 8.5, wicketsPerMatch: 0.5 },
            { id: "ganguly", name: "Sourav Ganguly", role: "Medium", economy: 7.5, wicketsPerMatch: 0.6 },
        ],
    },
    {
        id: "srh-vs-rcb-2016-final",
        title: "IPL 2016 Final",
        team1: { name: "Sunrisers Hyderabad", short: "SRH", color: "#FF822A", accent: "#1C1C1C" },
        team2: { name: "Royal Challengers Bangalore", short: "RCB", color: "#D4213D", accent: "#D4A843" },
        venue: "M. Chinnaswamy Stadium, Bangalore",
        date: "May 29, 2016",
        criticalMoment: {
            over: "14.2",
            situation: "RCB needs 69 runs off 34 balls. ABD at the crease!",
            score: "RCB: 111/4",
            target: 180,
            battingTeam: "RCB",
            bowlingTeam: "SRH",
            runRate: { required: 12.18, current: 7.81 },
            originalWinProb: { team1: 72, team2: 28 },
            striker: "AB de Villiers",
            nonStriker: "Sachin Baby",
            currentBowler: "Mustafizur Rahman",
            timeline: [
                { over: 10, winProb: 15, rr: 6.5 },
                { over: 12, winProb: 22, rr: 7.1 },
                { over: 13, winProb: 25, rr: 7.5 },
                { over: 14, winProb: 28, rr: 7.8 }
            ]
        },
        batters: [
            { id: "abd", name: "AB de Villiers", role: "Batter", style: "360° Player", avgSR: 160, avg: 44 },
            { id: "kohli", name: "Virat Kohli", role: "Batter", style: "Run Machine", avgSR: 135, avg: 48 },
            { id: "sachin", name: "Sachin Baby", role: "Batter", style: "Anchor", avgSR: 115, avg: 22 },
            { id: "watson2", name: "Shane Watson", role: "All-rounder", style: "Power-hitter", avgSR: 142, avg: 30 },
            { id: "binny", name: "Stuart Binny", role: "All-rounder", style: "Finisher", avgSR: 125, avg: 20 },
        ],
        bowlers: [
            { id: "bhuvi", name: "Bhuvneshwar Kumar", role: "Fast", economy: 6.8, wicketsPerMatch: 1.6 },
            { id: "fizz", name: "Mustafizur Rahman", role: "Fast", economy: 7.0, wicketsPerMatch: 1.4 },
            { id: "henriques", name: "Moises Henriques", role: "Medium", economy: 8.2, wicketsPerMatch: 0.8 },
            { id: "karn", name: "Karn Sharma", role: "Spin", economy: 8.0, wicketsPerMatch: 1.0 },
            { id: "cutting", name: "Ben Cutting", role: "Fast", economy: 9.1, wicketsPerMatch: 1.1 },
        ],
    },
    {
        id: "rr-vs-csk-2010",
        title: "IPL 2010 — Warne's Swansong",
        team1: { name: "Rajasthan Royals", short: "RR", color: "#254AA5", accent: "#E73795" },
        team2: { name: "Chennai Super Kings", short: "CSK", color: "#FCCA06", accent: "#E44D26" },
        venue: "Sawai Mansingh Stadium, Jaipur",
        date: "March 15, 2010",
        criticalMoment: {
            over: "16.3",
            situation: "CSK needs 38 runs off 21 balls. Raina is the key!",
            score: "CSK: 132/3",
            target: 170,
            battingTeam: "CSK",
            bowlingTeam: "RR",
            runRate: { required: 10.86, current: 8.0 },
            originalWinProb: { team1: 55, team2: 45 },
            striker: "Suresh Raina",
            nonStriker: "Albie Morkel",
            currentBowler: "Shaun Tait",
            timeline: [
                { over: 12, winProb: 30, rr: 7.2 },
                { over: 14, winProb: 35, rr: 7.5 },
                { over: 15, winProb: 40, rr: 7.8 },
                { over: 16, winProb: 45, rr: 8.0 }
            ]
        },
        batters: [
            { id: "raina", name: "Suresh Raina", role: "Batter", style: "Southpaw Striker", avgSR: 140, avg: 33 },
            { id: "dhoni2", name: "MS Dhoni", role: "WK-Batter", style: "Finisher", avgSR: 145, avg: 38 },
            { id: "hayden", name: "Matthew Hayden", role: "Opener", style: "Power Opener", avgSR: 148, avg: 36 },
            { id: "morkel", name: "Albie Morkel", role: "All-rounder", style: "Slogger", avgSR: 160, avg: 18 },
            { id: "badrinath", name: "S Badrinath", role: "Batter", style: "Anchor", avgSR: 110, avg: 28 },
        ],
        bowlers: [
            { id: "warne", name: "Shane Warne", role: "Spin", economy: 6.5, wicketsPerMatch: 1.3 },
            { id: "watson3", name: "Shane Watson", role: "Fast", economy: 7.4, wicketsPerMatch: 1.5 },
            { id: "tait", name: "Shaun Tait", role: "Fast", economy: 8.1, wicketsPerMatch: 1.8 },
            { id: "trivedi", name: "Siddharth Trivedi", role: "Medium", economy: 7.8, wicketsPerMatch: 1.1 },
            { id: "shah", name: "Pankaj Singh", role: "Fast", economy: 8.5, wicketsPerMatch: 0.9 },
        ],
    },
];

// Generate deterministic but varied simulation results based on batter/bowler combo
export function generateSimulationResult(match, point, batterId, bowlerId, customEvent) {
    const batter = match.batters.find((b) => b.id === batterId) || match.batters[0];
    const bowler = match.bowlers.find((b) => b.id === bowlerId) || match.bowlers[0];
    if (!batter || !bowler) return null;

    // Seed-based pseudo randomness from batter+bowler combo & point
    const seed = (batterId + bowlerId + point.toString()).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = (offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    const target = match.criticalMoment.target;
    // Base current score on point (time) and custom events
    let currentScore = parseInt(match.criticalMoment.score.split(":")[1].split("/")[0]);
    let currentWickets = parseInt(match.criticalMoment.score.split("/")[1]);
    
    if (customEvent === 'wicket') {
        currentWickets += 1;
    } else if (customEvent === '6') {
        currentScore += 6;
    }

    const runsNeeded = target - currentScore;
    const ballsLeft = Math.max(1, Math.round((20 - parseFloat(point)) * 6));

    // Calculate new win prob based on batter strength vs bowler economy
    const batterFactor = (batter.avgSR / 130) * (batter.avg / 30);
    const bowlerFactor = bowler.economy / 8;
    const swingFactor = (batterFactor / bowlerFactor) * 0.6;

    const originalProb = match.criticalMoment.originalWinProb.team2;
    let newWinProb = Math.min(95, Math.max(8, Math.round(originalProb * swingFactor + rand(1) * 15)));

    if (customEvent === 'wicket') newWinProb -= 15;
    if (customEvent === '6') newWinProb += 15;
    newWinProb = Math.min(99, Math.max(1, newWinProb));

    const expectedRuns = Math.round(currentScore + runsNeeded * (0.6 + rand(2) * 0.7));
    const ciLow = Math.max(currentScore + 10, expectedRuns - Math.round(12 + rand(3) * 8));
    const ciHigh = Math.min(target + 40, expectedRuns + Math.round(12 + rand(4) * 8));
    const expectedWickets = Math.min(10, currentWickets + Math.round(1 + rand(5) * 4));

    // Generate ball-by-ball commentary
    const commentary = generateCommentary(batter, bowler, point, seed, ballsLeft);

    return {
        newWinProb,
        originalWinProb: originalProb,
        expectedScore: `${expectedRuns}/${expectedWickets}`,
        confidenceInterval: { low: ciLow, high: ciHigh },
        battingTeam: match.criticalMoment.battingTeam,
        bowlingTeam: match.criticalMoment.bowlingTeam,
        batter,
        bowler,
        commentary,
        simulationCount: 10000,
        target,
    };
}

function generateCommentary(batter, bowler, startPoint, seed, ballsLeft) {
    const outcomes = [
        { type: "dot", text: "No run. Tight line, defended back.", color: "#6b7280", weight: 30 },
        { type: "1", text: "Single. Pushed into the gap for 1.", color: "#94a3b8", weight: 20 },
        { type: "2", text: "Good running! Quick 2 runs.", color: "#94a3b8", weight: 10 },
        { type: "4", text: "FOUR! Crunched through the covers!", color: "#00e5ff", weight: 15 },
        { type: "6", text: "SIX! Launched over long-on!", color: "#ffd700", weight: 8 },
        { type: "wicket", text: `OUT! ${batter.name} departs. `, color: "#ff3b5c", weight: 7 },
        { type: "wide", text: "Wide ball. Extra run conceded.", color: "#a855f7", weight: 5 },
        { type: "4", text: "FOUR! Edged but races to the boundary!", color: "#00e5ff", weight: 5 },
    ];

    const templates4 = [
        `FOUR! ${batter.name} drives ${bowler.name} through mid-off!`,
        `FOUR! Short and punished! Pulled to the fence!`,
        `FOUR! Exquisite timing. Cover drive for four!`,
        `FOUR! Down the ground, beats long-on!`,
    ];

    const templates6 = [
        `SIX! ${batter.name} with a massive hit over cow corner!`,
        `SIX! Picked up off the pads, into the stands!`,
        `SIX! Stepped out and launched it downtown!`,
        `SIX! Pure power! ${bowler.name} can only watch it sail away!`,
    ];

    const templatesDot = [
        `Dot ball. ${bowler.name} pitches it up, defended solidly.`,
        `No run. Good yorker, dug out to the bowler.`,
        `Beaten! Off-cutter goes past the outside edge.`,
        `Dot. Full and straight, blocked back.`,
    ];

    const templatesWicket = [
        `OUT! Caught at deep midwicket! ${batter.name} goes for ${Math.round(15 + (seed % 30))}.`,
        `WICKET! Bowled! ${bowler.name} knocks back the stumps!`,
        `OUT! LBW! Plumb in front, umpire raises the finger.`,
    ];

    const commentary = [];
    let currentOver = Math.floor(startPoint);
    let ballInOver = Math.round((startPoint - currentOver) * 10);
    const numBalls = Math.min(Math.round(ballsLeft * 0.6), 24);
    let scoreTracker = 0;
    let wicketCount = 0;

    for (let i = 0; i < numBalls; i++) {
        const r = Math.sin(seed + i * 7 + 3) * 10000;
        const roll = (r - Math.floor(r)) * 100;

        let cumWeight = 0;
        let chosen = outcomes[0];
        for (const outcome of outcomes) {
            cumWeight += outcome.weight;
            if (roll < cumWeight) {
                chosen = outcome;
                break;
            }
        }

        let text = chosen.text;
        const ri = Math.floor(Math.abs(Math.sin(seed + i * 13)) * 4);

        if (chosen.type === "4") text = templates4[ri % templates4.length];
        else if (chosen.type === "6") text = templates6[ri % templates6.length];
        else if (chosen.type === "dot") text = templatesDot[ri % templatesDot.length];
        else if (chosen.type === "wicket") {
            text = templatesWicket[ri % templatesWicket.length];
            wicketCount++;
        }

        const runs = chosen.type === "dot" ? 0 : chosen.type === "wicket" ? 0 : chosen.type === "wide" ? 1 : parseInt(chosen.type);
        scoreTracker += runs;

        commentary.push({
            ball: `${currentOver}.${ballInOver + 1}`,
            type: chosen.type,
            text,
            color: chosen.color,
            runs,
        });

        ballInOver++;
        if (ballInOver === 6) {
            ballInOver = 0;
            currentOver++;
        }
    }

    return commentary;
}
