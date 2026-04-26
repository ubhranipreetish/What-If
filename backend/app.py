from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import pandas as pd

# Import the logic and engine classes you provided
from simulation_engine import (
    clean_and_prepare_data,
    derive_player_profiles_v5,
    get_match_state,
    generate_remaining_batting_lineup,
    generate_realistic_bowling_plan,
    BallProbabilityEngine,
    SingleMatchSimulator,
    MonteCarloEngine,
    WhatIfEngine
)

app = FastAPI(title="What-If Engine AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# GLOBAL STATE & INITIALIZATION
# ---------------------------------------------------------
df_clean = None
raw_df = None
match_df = None
profiles = None
prob_engine = None
simulator = None
mc_engine = None
what_if_engine = None

DATA_PATH = "IPL_updated.csv.zip"
MATCH_DATA_PATH = "ipl.csv"

@app.on_event("startup")
def startup_event():
    global df_clean, raw_df, match_df, profiles, prob_engine, simulator, mc_engine, what_if_engine
    
    if os.path.exists(DATA_PATH) and os.path.exists(MATCH_DATA_PATH):
        print("🚀 Initializing Engine Data...")
        # Load with low_memory=False and rename columns to standardize early
        raw_df = pd.read_csv(DATA_PATH, low_memory=False)
        
        # Standardize raw_df names for easier resolution logic
        col_map = {
            'batter': 'striker',
            'runs_batter': 'runs_off_bat',
            'runs_extras': 'extras',
            'runs_total': 'total_runs_this_ball',
            'date': 'start_date'
        }
        raw_df.rename(columns={k: v for k, v in col_map.items() if k in raw_df.columns}, inplace=True)
        
        match_df = pd.read_csv(MATCH_DATA_PATH)
        df_clean = clean_and_prepare_data(DATA_PATH)
        profiles = derive_player_profiles_v5(raw_df, prior_weight=25)
        
        prob_engine = BallProbabilityEngine(profiles)
        simulator = SingleMatchSimulator(prob_engine)
        mc_engine = MonteCarloEngine(simulator, num_simulations=2000)
        what_if_engine = WhatIfEngine(df_clean, raw_df, match_df, simulator, mc_engine)
        print("✅ Engine Online.")
    else:
        print(f"⚠️ Warning: Missing CSV datasets. Ensure both {DATA_PATH} & {MATCH_DATA_PATH} exist.")


# ---------------------------------------------------------
# API MODELS
# ---------------------------------------------------------
class ModificationRequest(BaseModel):
    match_id: int
    innings: int
    over: int
    ball_no: int
    new_runs: Optional[int] = None
    force_wicket: Optional[bool] = False
    new_striker: Optional[str] = None
    new_bowler: Optional[str] = None

class PlayerPayload(BaseModel):
    id: str
    name: str
    role: str
    style: str
    avgSR: float
    avg: float
    economy: Optional[float] = 0.0
    wicketsPerMatch: Optional[float] = 0.0
    type: str # batter | bowler | allrounder
    cost: int

class ArenaRequest(BaseModel):
    p1: str
    p2: str
    t1Roster: List[PlayerPayload]
    t2Roster: List[PlayerPayload]


# ---------------------------------------------------------
# COMMENTARY HELPERS
# ---------------------------------------------------------
import random

def random_commentary(outcome, batter="The batter", bowler="the bowler"):
    commentaries = {
        "6": [
            f"Smashed! {batter} clears the boundary with ease off {bowler}.",
            f"Into the stands! That's a massive six from {batter}.",
            f"Maximum! {bowler} can only watch as the ball sails over the ropes."
        ],
        "4": [
            f"Beautifully timed. {batter} finds the gap for four.",
            f"Cracking shot! To the boundary it goes.",
            f"Precision! {batter} uses the pace of {bowler} to find the fence."
        ],
        "W": [
            f"OUT! {bowler} gets the breakthrough as {batter} departs.",
            f"WICKET! {batter} is stunned as {bowler} celebrates.",
            f"Significant blow! {batter} has to walk back to the pavilion."
        ],
        "1": [
            f"Just a single. {batter} works it into the gap.",
            f"Easy single. Rotation of strike continues.",
            f"Smart cricket. {batter} takes the run and keeps the scoreboard ticking."
        ],
        "0": [
            f"Dot ball. Solid defense from {batter}.",
            f"No run. {bowler} keeping it tight.",
            f"Beaten! {batter} plays and misses."
        ],
        "wide": [
            f"Wide ball. {bowler} loses their line.",
            f"Extra for the batting side. Wayward delivery from {bowler}."
        ],
        "no_ball": [
            f"No ball! {bowler} oversteps. Free hit coming up!",
            f"Siren sounds! It's a no ball from {bowler}."
        ]
    }
    choices = commentaries.get(str(outcome), [f"{batter} scores {outcome} runs."])
    return random.choice(choices)

# ---------------------------------------------------------
# HELPER: Resolve ipl.csv row index → ball-by-ball match_id
# ---------------------------------------------------------
def _team_matches_bb(team_name, bb_team_name):
    """Fuzzy team name match to handle Bengaluru vs Bangalore etc."""
    t1 = str(team_name).strip().lower()
    t2 = str(bb_team_name).strip().lower()
    if t1 == t2:
        return True
    # Handle known renames
    aliases = {
        "royal challengers bengaluru": "royal challengers bangalore",
        "kings xi punjab": "punjab kings",
        "delhi daredevils": "delhi capitals",
        "rising pune supergiants": "rising pune supergiant",
    }
    t1_norm = aliases.get(t1, t1)
    t2_norm = aliases.get(t2, t2)
    return t1_norm == t2_norm


def resolve_bb_match_id(ipl_csv_index: int):
    """
    Maps an ipl.csv row index to the correct ball-by-ball match_id.
    Strategy:
      1. Primary: match by match_date (ipl.csv) == start_date (ball-by-ball)
      2. Fallback: match by season + teams + venue substring
      3. Last resort: season + teams, pick by match_number order
    Returns (bb_match_id, m_row) or raises HTTPException.
    """
    if match_df is None or raw_df is None or df_clean is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    if ipl_csv_index not in match_df.index:
        raise HTTPException(status_code=404, detail="Match ID not found in match metadata")

    m_row = match_df.loc[ipl_csv_index]
    team1_name = str(m_row['team1']).strip()
    team2_name = str(m_row['team2']).strip()
    calendar_year = 2007 + int(m_row['season'])
    ipl_date = str(m_row.get('match_date', '')).strip()
    ipl_venue = str(m_row.get('venue', '')).strip()

    # Filter raw ball-by-ball to the right year
    season_bb = raw_df[raw_df['year'] == calendar_year]
    if season_bb.empty:
        raise HTTPException(status_code=400, detail=f"No ball-by-ball data available for {calendar_year} in delivery dataset.")

    # Find matches involving both teams (with fuzzy name matching)
    def both_teams_match(grp):
        bb_teams = set(grp['batting_team'].str.strip().unique()) | set(grp['bowling_team'].str.strip().unique())
        t1_ok = any(_team_matches_bb(team1_name, bt) for bt in bb_teams)
        t2_ok = any(_team_matches_bb(team2_name, bt) for bt in bb_teams)
        return t1_ok and t2_ok

    candidate_ids = []
    for mid, grp in season_bb.groupby('match_id'):
        if both_teams_match(grp):
            candidate_ids.append(mid)

    if not candidate_ids:
        raise HTTPException(status_code=400, detail=f"No ball-by-ball data found for {team1_name} vs {team2_name} in {calendar_year}.")

    # Strategy 1: Match by date
    if ipl_date:
        for mid in candidate_ids:
            bb_date = season_bb[season_bb['match_id'] == mid]['start_date'].iloc[0]
            if str(bb_date).strip() == ipl_date:
                return int(mid), m_row

    # Strategy 2: Match by venue substring
    if ipl_venue:
        venue_prefix = ipl_venue[:20].lower()
        venue_matches = []
        for mid in candidate_ids:
            bb_venue = str(season_bb[season_bb['match_id'] == mid]['venue'].iloc[0]).lower()
            if venue_prefix in bb_venue or bb_venue[:20] in ipl_venue.lower():
                venue_matches.append(mid)
        if len(venue_matches) == 1:
            return int(venue_matches[0]), m_row

    # Strategy 3: Pick by match_number (sorted by date order)
    candidate_ids = sorted(candidate_ids)
    match_num = int(m_row['match_number'])
    idx = min(match_num - 1, len(candidate_ids) - 1)
    return int(candidate_ids[idx]), m_row


def _build_innings_balls(match_balls_df, innings_num):
    """Serialize ball-by-ball rows for one innings into JSON-ready dicts."""
    innings_df = match_balls_df[match_balls_df['innings'] == innings_num].copy()
    if innings_df.empty:
        return None

    balls = []
    for _, row in innings_df.iterrows():
        extra_type = None
        total_runs = int(row['total_runs_this_ball']) if 'total_runs_this_ball' in row and not pd.isna(row['total_runs_this_ball']) else 0
        runs_off_bat = int(row['runs_off_bat']) if 'runs_off_bat' in row and not pd.isna(row['runs_off_bat']) else 0
        extras = int(row['extras']) if 'extras' in row and not pd.isna(row['extras']) else 0

        # Determine extra type from the total_runs / runs_off_bat difference + wicket info
        if extras > 0 and runs_off_bat == 0 and not bool(row.get('is_wicket', 0)):
            # Could be wide, nb, bye, legbye
            extra_type = "extra"

        balls.append({
            "over": int(row['over']),
            "ball": int(row['ball_no']),
            "runs": runs_off_bat,
            "extras": extras,
            "totalRuns": total_runs,
            "isWicket": bool(row['is_wicket']) if 'is_wicket' in row else False,
            "extraType": extra_type,
            "cumScore": int(row['cumulative_score']),
            "cumWickets": int(row['cumulative_wickets']),
            "legalBalls": int(row['legal_balls_bowled']),
            "striker": str(row['striker']) if not pd.isna(row['striker']) else "",
            "nonStriker": str(row['non_striker']) if not pd.isna(row['non_striker']) else "",
            "bowler": str(row['bowler']) if not pd.isna(row['bowler']) else "",
            "battingTeam": str(row['batting_team']),
            "bowlingTeam": str(row['bowling_team']),
            "phase": str(row['phase']) if 'phase' in row else "middle",
        })

    last = innings_df.iloc[-1]
    return {
        "battingTeam": str(innings_df.iloc[0]['batting_team']),
        "bowlingTeam": str(innings_df.iloc[0]['bowling_team']),
        "totalScore": int(last['cumulative_score']),
        "totalWickets": int(last['cumulative_wickets']),
        "balls": balls,
    }


# ---------------------------------------------------------
# [1] TIME MACHINE ROUTES
# ---------------------------------------------------------
@app.get("/api/match/{match_id}/balls")
def get_match_balls(match_id: int):
    """
    Returns all ball-by-ball data for both innings of a match.
    match_id here is the ipl.csv row index — we resolve it to the 
    ball-by-ball dataset match_id internally.
    """
    bb_id, _ = resolve_bb_match_id(match_id)
    match_balls = df_clean[df_clean['match_id'] == bb_id]

    result = {"bbMatchId": int(bb_id)}
    for innings_num in [1, 2]:
        inn = _build_innings_balls(match_balls, innings_num)
        if inn:
            result[str(innings_num)] = inn

    return result


@app.post("/api/match/{match_id}/simulate-from")
def simulate_from_ball(match_id: int, req: ModificationRequest):
    """
    Simulate ball-by-ball from a given point in the match.
    match_id is the ipl.csv row index — resolved internally.
    """
    if what_if_engine is None or simulator is None:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        target_bbid, m_row = resolve_bb_match_id(match_id)
        
        # Resolve initial state
        try:
            initial_state, ball_info = what_if_engine.get_ball_state(
                target_bbid, req.innings, req.over, req.ball_no
            )
        except Exception as e:
            print(f"Error in get_ball_state: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Timeline Corrupted: {str(e)}")

        # Apply user modification
        is_wide = req.new_runs == 1 and (req.force_wicket is False) and (selection_was_wide := True)
        # Simplify: If the user selected 'wide' or 'nb' in the UI, we should know
        # For now, we'll infer it from the value if needed, but better to be explicit.
        # Actually, let's just use the logic: if outcome was wide/nb in UI
        
        mod = {
            "new_runs": int(req.new_runs) if req.new_runs is not None else None,
            "force_wicket": bool(req.force_wicket),
            "new_striker": req.new_striker,
            "new_bowler": req.new_bowler,
            "is_wide": (req.new_runs == 1 and req.force_wicket == False and not req.new_striker and not req.new_bowler), # Heuristic for now
            "is_nb": False 
        }
        
        # If the frontend passes more info later, we can be more precise. 
        # For now, let's assume if it came from the 'Wd' button it's a wide.
        if req.new_runs == 1 and req.force_wicket == False: 
             # Check if it was meant as a wide. 
             # In our UI, outcomes are strings 'wide', 'nb'.
             pass 

        modified_state = what_if_engine.apply_modification(initial_state, mod)
        
        # Run simulation
        final_score, final_wickets, mc_result = what_if_engine.simulate_counterfactual(modified_state)
        
        # Generate the log to return to frontend
        batting_lineup = generate_remaining_batting_lineup(raw_df, match_df, modified_state)
        # Using a more robust bowling plan generation
        try:
            bowling_plan = generate_realistic_bowling_plan(df_clean, target_bbid, req.innings, modified_state['balls_remaining'])
        except Exception:
            all_bowlers = df_clean[df_clean['match_id'] == target_bbid]['bowler'].unique().tolist()
            bowling_plan = [all_bowlers[i % len(all_bowlers)] for i in range(modified_state['balls_remaining'] // 6)]
        
        # Run a detailed most-probable simulation for the UI feedback
        _s, _w, detailed_log = simulator.simulate_most_probable(modified_state, batting_lineup, bowling_plan)

        def safe_val(v):
            if hasattr(v, 'item'): 
                return v.item()
            if isinstance(v, (pd.Series, pd.DataFrame)):
                return v.iloc[0] if not v.empty else None
            return v

        return {
            "success": True,
            "startScore": int(safe_val(modified_state['score'])),
            "startWickets": int(safe_val(modified_state['wickets'])),
            "startBalls": int(safe_val(modified_state['legal_balls_bowled'])), # <--- ADDED THIS
            "finalScore": int(safe_val(final_score)),
            "finalWickets": int(safe_val(final_wickets)),
            "winProbability": float(safe_val(mc_result["win_probability"])) if mc_result["win_probability"] else None,
            "projectedScore": float(safe_val(mc_result["projected_median_score"])),
            "ballLog": [
                {
                    "score": int(safe_val(b["score"])),
                    "wickets": int(safe_val(b["wickets"])),
                    "outcome": str(b["outcome"]),
                    "striker": str(b.get("striker", "The Batter")),
                    "bowler": str(b.get("bowler", "The Bowler")),
                    "commentary": random_commentary(str(b["outcome"]), str(b.get("striker", "The Batter")), str(b.get("bowler", "The Bowler")))
                } for b in detailed_log
            ]
        }
    except Exception as e:
        print(f"Simulation Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health_check():
    if what_if_engine is None:
        return {"status": "waiting_for_data", "message": "Upload IPL_ball_by_ball_updated.csv to /backend"}
    return {"status": "ok", "message": "Engine is loaded and ready."}


@app.post("/api/simulate/what-if")
def simulate_historical_modification(req: ModificationRequest):
    if what_if_engine is None:
        raise HTTPException(status_code=503, detail="Engine not initialized. Dataset missing.")
        
    try:
        # Get baseline state
        state, actual_outcome = what_if_engine.get_ball_state(
            req.match_id, req.innings, req.over, req.ball_no
        )

        modification = {
            "new_runs": req.new_runs,
            "force_wicket": req.force_wicket,
            "new_striker": req.new_striker,
            "new_bowler": req.new_bowler
        }

        # Apply user changes
        modified_state = what_if_engine.apply_modification(state, modification)

        # Run 2000 simulations
        whatif_score, whatif_wickets, whatif_mc = what_if_engine.simulate_counterfactual(modified_state)

        return {
            "success": True,
            "projected_median_score": whatif_mc["projected_median_score"],
            "win_probability": whatif_mc["win_probability"],
            "std_dev": whatif_mc["std_dev"],
            "actual_outcome": actual_outcome
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# [2] THE ARENA ROUTES
# ---------------------------------------------------------

@app.post("/api/simulate/arena")
def simulate_gamified_arena(req: ArenaRequest):
    """
    Evaluates the 5v5 Arena draft using the custom logic derived in JS, 
    but executed securely on backend. Highly extensible with Python Engine later.
    """
    # Converting the payload arrays back to dictionaries
    team1 = [p.dict() for p in req.t1Roster]
    team2 = [p.dict() for p in req.t2Roster]
    
    # We can either build a native Python 5-over simulator using BallProbabilityEngine
    # or use the heuristic aggregate logic defined. We'll use the heuristic aggregate for now
    # to emulate the fast execution JS prototype.

    t1BatScore, t1BowlScore = 0, 0
    t2BatScore, t2BowlScore = 0, 0

    for p in team1:
        if p['type'] in ['batter', 'allrounder']: t1BatScore += (p['avgSR'] * p['avg'])
        if p['type'] in ['bowler', 'allrounder']: t1BowlScore += ((10 - p['economy']) * p['wicketsPerMatch'] * 100)
    
    for p in team2:
        if p['type'] in ['batter', 'allrounder']: t2BatScore += (p['avgSR'] * p['avg'])
        if p['type'] in ['bowler', 'allrounder']: t2BowlScore += ((10 - p['economy']) * p['wicketsPerMatch'] * 100)

    # Base expectations
    t1ExpectedRuns = 45 + round((t1BatScore - t2BowlScore) / 400)
    t2ExpectedRuns = 45 + round((t2BatScore - t1BowlScore) / 400)

    t1ExpectedRuns = max(20, min(85, t1ExpectedRuns))
    t2ExpectedRuns = max(20, min(85, t2ExpectedRuns))

    total = t1ExpectedRuns + t2ExpectedRuns
    t2WinProb = round((t2ExpectedRuns / total) * 100)
    t1WinProb = 100 - t2WinProb

    winnerName = req.p1 if t1WinProb > t2WinProb else req.p2
    winnerProb = max(t1WinProb, t2WinProb)

    mvp = team1[0]
    maxImpact = 0
    winningPlayers = team1 if t1WinProb > t2WinProb else team2
    
    for p in winningPlayers:
        impact = (10 - p['economy']) * p['cost'] if p['type'] == 'bowler' else p['avgSR']
        if impact > maxImpact:
            maxImpact = impact
            mvp = p

    reason = f"{mvp['name']}'s elite death-over economy neutralized the aggressive strike rate of the opposition." if mvp['type'] == 'bowler' else f"{mvp['name']}'s sheer power-hitting dismantled the opposition's bowling attack."

    return {
        "winnerName": winnerName,
        "winnerProb": winnerProb,
        "t1WinProb": t1WinProb,
        "t2WinProb": t2WinProb,
        "t1ExpectedRuns": f"{t1ExpectedRuns}/2",
        "t2ExpectedRuns": f"{t2ExpectedRuns}/2",
        "mvp": mvp['name'],
        "keyMatchup": {
            "reason": reason
        }
    }

# ---------------------------------------------------------
# [3] METADATA ROUTES (DYNAMIC UI)
# ---------------------------------------------------------

@app.get("/api/match/{match_id}/rosters")
def get_match_rosters(match_id: int):
    """Returns the squad for both teams for player substitution."""
    if match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    if match_id not in match_df.index:
        raise HTTPException(status_code=404, detail="Match index not found")
        
    row = match_df.loc[match_id]
    
    def parse_roster(p_str):
        if pd.isna(p_str): return []
        return [p.strip() for p in str(p_str).split(",")]

    return {
        "team1": {
            "name": str(row['team1']),
            "players": parse_roster(row['team1_players'])
        },
        "team2": {
            "name": str(row['team2']),
            "players": parse_roster(row['team2_players'])
        }
    }

@app.get("/api/metadata/years")
def get_years():
    if match_df is None or raw_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    # Only show years that have ball-by-ball data
    # Use 'year' column which is clean integer years
    bb_years = set(raw_df['year'].dropna().unique().astype(int).tolist())
    seasons = sorted(match_df['season'].dropna().unique().astype(int).tolist(), reverse=True)
    years = [2007 + s for s in seasons if (2007 + s) in bb_years]
    return {"years": years}

@app.get("/api/metadata/teams")
def get_teams(year: int):
    if match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    season_num = year - 2007  # convert calendar year to IPL season number
    year_df = match_df[match_df['season'] == season_num]
    teams = pd.concat([year_df['team1'], year_df['team2']]).dropna().str.strip().unique()
    return {"teams": sorted(teams.tolist())}

@app.get("/api/metadata/matches")
def get_matches(year: int, team: str):
    if match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    season_num = year - 2007
    year_df = match_df[match_df['season'] == season_num].copy()
    
    team_matches = year_df[
        (year_df['team1'].str.strip() == team.strip()) | 
        (year_df['team2'].str.strip() == team.strip())
    ]
    
    results = []
    for idx, row in team_matches.iterrows():
        opposition = row['team2'] if str(row['team1']).strip() == team.strip() else row['team1']
        margin_val = row.get('result_margin', None)
        margin_str = f"{int(margin_val)} {str(row.get('result', 'runs')).strip()}" if pd.notna(margin_val) and margin_val not in (None, "") else "N/A"
        results.append({
            "id": str(idx),   # row index used as match id for ball-by-ball lookup
            "title": f"vs {opposition}",
            "date": f"IPL {year} — Match {int(row['match_number'])}",
            "venue": str(row.get('venue', "Unknown")),
            "winner": str(row.get('winner', "Unknown")),
            "margin": margin_str,
        })
        
    return {"matches": results}



@app.get("/api/metadata/match/{match_id}")
def get_match_details(match_id: int):
    """Uses the shared resolver to get match details with correct ball-by-ball data."""
    target_bbid, m_row = resolve_bb_match_id(match_id)

    team1_name = str(m_row['team1']).strip()
    team2_name = str(m_row['team2']).strip()
    season_num = int(m_row['season'])
    calendar_year = 2007 + season_num

    def team_color(t):
        t = str(t)
        if "Chennai" in t: return "#F9CD05"
        if "Mumbai" in t: return "#004BA0"
        if "Royal" in t: return "#D4213D"
        if "Kolkata" in t: return "#3A225D"
        if "Gujarat" in t: return "#1B2133"
        if "Rajasthan" in t: return "#EB1B99"
        if "Sunrisers" in t or "Hyderabad" in t or "Deccan" in t: return "#FF822A"
        if "Punjab" in t: return "#D71920"
        if "Delhi" in t: return "#0078BC"
        if "Pune" in t: return "#9C27B0"
        return "#00e5ff"

    # Get both innings from the resolved match
    match_balls = df_clean[df_clean['match_id'] == target_bbid]
    innings_df = match_balls[match_balls['innings'] == 2].copy()
    first_innings = match_balls[match_balls['innings'] == 1]

    if innings_df.empty:
        # Fall back to 1st innings if no 2nd innings (rain-affected)
        innings_df = first_innings.copy()

    target = int(first_innings['cumulative_score'].max() + 1) if not first_innings.empty else 150

    # Build timeline
    timeline = []
    if not innings_df.empty:
        max_over = int(innings_df['over'].max())
        critical_over = max(5, max_over - 2)

        for o in range(max(1, critical_over - 4), critical_over + 1):
            over_balls = innings_df[innings_df['over'] == o]
            if not over_balls.empty:
                last_ball = over_balls.iloc[-1]
                score_at = int(last_ball['cumulative_score'])
                balls_done = int(last_ball.get('legal_balls_bowled', o * 6))
                rr = round(score_at / max(1, balls_done / 6), 2)
                win_prob = max(5, min(95, round((score_at / target) * 100)))
                timeline.append({"over": o, "winProb": win_prob, "rr": rr})

        crit_balls = innings_df[innings_df['over'] <= critical_over]
        crit_state = crit_balls.iloc[-1] if not crit_balls.empty else innings_df.iloc[-1]
    else:
        crit_state = first_innings.iloc[-1] if not first_innings.empty else None

    # Build critical moment
    if crit_state is not None:
        batting_team = str(crit_state['batting_team'])
        bowling_team = str(crit_state['bowling_team'])
        crit_over_str = f"{int(crit_state['over'])}.{int(crit_state['ball_no'])}"
        score_now = int(crit_state['cumulative_score'])
        wkts_now = int(crit_state['cumulative_wickets'])
        balls_done = int(crit_state.get('legal_balls_bowled', 0))
        balls_rem = max(0, 120 - balls_done)
        runs_needed = target - score_now
        req_rr = round((runs_needed / max(1, balls_rem)) * 6, 2)
        cur_rr = round((score_now / max(1, balls_done)) * 6, 2)
    else:
        batting_team = team1_name
        bowling_team = team2_name
        crit_over_str = "0.0"
        score_now = wkts_now = balls_done = 0
        balls_rem = 120
        runs_needed = target
        req_rr = cur_rr = 0

    critical_moment = {
        "over": crit_over_str,
        "situation": f"{batting_team} needs {runs_needed} runs off {balls_rem} balls.",
        "score": f"{batting_team}: {score_now}/{wkts_now}",
        "target": target,
        "battingTeam": batting_team,
        "bowlingTeam": bowling_team,
        "runRate": {"required": req_rr, "current": cur_rr},
        "originalWinProb": {"team1": 50, "team2": 50},
        "striker": str(crit_state.get('striker', '')) if crit_state is not None else '',
        "nonStriker": str(crit_state.get('non_striker', '')) if crit_state is not None else '',
        "currentBowler": str(crit_state.get('bowler', '')) if crit_state is not None else '',
        "timeline": timeline
    }

    # Parse players from ipl.csv
    try:
        t1_raw = str(m_row.get('team1_players', ''))
        t2_raw = str(m_row.get('team2_players', ''))
        t1_p = [p.strip() for p in t1_raw.split(',') if p.strip()]
        t2_p = [p.strip() for p in t2_raw.split(',') if p.strip()]
    except:
        t1_p, t2_p = [], []

    batters_raw = t1_p if team1_name == batting_team.strip() else t2_p
    bowlers_raw = t2_p if team1_name == batting_team.strip() else t1_p

    batters = [{"id": b.replace(" ", "_").lower(), "name": b, "role": "Batter", "style": "Aggressor", "avgSR": 130, "avg": 25} for b in batters_raw if b]
    bowlers = [{"id": b.replace(" ", "_").lower(), "name": b, "role": "Bowler", "economy": 8.0, "wicketsPerMatch": 1.2} for b in bowlers_raw if b]

    return {
        "id": str(match_id),
        "bbMatchId": int(target_bbid),
        "title": f"{team1_name} vs {team2_name}",
        "team1": {"name": team1_name, "short": team1_name[:3].upper(), "color": team_color(team1_name)},
        "team2": {"name": team2_name, "short": team2_name[:3].upper(), "color": team_color(team2_name)},
        "venue": str(m_row.get('venue', 'Unknown')),
        "date": f"IPL {calendar_year} — Match {int(m_row['match_number'])}",
        "winner": str(m_row.get('winner', 'Unknown')),
        "criticalMoment": critical_moment,
        "batters": batters,
        "bowlers": bowlers
    }


