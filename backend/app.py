from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import pandas as pd
import numpy as np

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
    WhatIfEngine,
    ScenarioParser,
    SituationAwarenessEngine,
    ScenarioImpactAnalyzer
)

app = FastAPI(title="What-If Engine AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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

DATA_PATH = "IPL_ball_by_ball_updated.csv"
MATCH_DATA_PATH = "ipl.csv"

@app.on_event("startup")
def startup_event():
    global df_clean, raw_df, match_df, profiles, prob_engine, simulator, mc_engine, what_if_engine
    
    # We delay full data load until the first request to allow fast startup, 
    # OR we can load it here if the CSV is present.
    if os.path.exists(DATA_PATH) and os.path.exists(MATCH_DATA_PATH):
        print("🚀 Initializing Engine Data...")
        raw_df = pd.read_csv(DATA_PATH)
        match_df = pd.read_csv(MATCH_DATA_PATH)
        df_clean = clean_and_prepare_data(DATA_PATH)
        profiles = derive_player_profiles_v5(raw_df, prior_weight=25)
        
        # Initialize scenario intelligence layer
        scenario_parser = ScenarioParser(profiles)
        situation_engine = SituationAwarenessEngine()
        impact_analyzer = ScenarioImpactAnalyzer(scenario_parser)
        
        prob_engine = BallProbabilityEngine(profiles, situation_engine, impact_analyzer)
        simulator = SingleMatchSimulator(prob_engine)
        mc_engine = MonteCarloEngine(simulator, num_simulations=500)
        what_if_engine = WhatIfEngine(
            df_clean, raw_df, match_df, simulator, mc_engine,
            scenario_parser=scenario_parser, impact_analyzer=impact_analyzer
        )
        print("✅ Engine Online (Scenario-Biased Mode).")
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
    temperature: Optional[float] = 0.7

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
# [1] TIME MACHINE ROUTES
# ---------------------------------------------------------
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

        # Run scenario-biased simulation
        temperature = req.temperature if req.temperature else 0.7
        whatif_score, whatif_wickets, whatif_mc = what_if_engine.simulate_counterfactual(
            original_state=state,
            modified_state=modified_state,
            modification=modification,
            temperature=temperature
        )

        return {
            "success": True,
            "actual_outcome": actual_outcome,
            # Core stats
            "win_probability": whatif_mc["win_probability"],
            "win_probability_change": whatif_mc.get("win_probability_change"),
            "projected_median_score": whatif_mc["projected_median_score"],
            "projected_mean_score": whatif_mc.get("projected_mean_score"),
            "std_dev": whatif_mc["std_dev"],
            # Score distribution
            "best_case_score": whatif_mc.get("best_case_score"),
            "worst_case_score": whatif_mc.get("worst_case_score"),
            "most_likely_score_range": whatif_mc.get("most_likely_score_range"),
            # Impact analysis
            "impact_score": whatif_mc.get("impact_score"),
            "impact_label": whatif_mc.get("impact_label"),
            "scenario_reason": whatif_mc.get("scenario_reason", []),
            # Match outcomes
            "outcomes": whatif_mc.get("outcomes"),
            # Meta
            "confidence": whatif_mc.get("confidence"),
            "simulations_run": whatif_mc.get("simulations_run"),
            "temperature": whatif_mc.get("temperature")
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

@app.get("/api/metadata/years")
def get_years():
    if match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    # IPL Season 1 = 2008, Season N = 2007+N
    seasons = sorted(match_df['season'].dropna().unique().astype(int).tolist(), reverse=True)
    years = [2007 + s for s in seasons]
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


# ---------------------------------------------------------
# [4] BALL-BY-BALL, ROSTERS & INNINGS DETAIL ROUTES
# ---------------------------------------------------------

def _resolve_bb_match_id(match_id: int):
    """Resolve ipl.csv row-index match_id to ball-by-ball match_id."""
    if match_id not in match_df.index:
        return None
    m_row = match_df.loc[match_id]
    team1 = str(m_row['team1']).strip()
    team2 = str(m_row['team2']).strip()

    bbdf = df_clean[
        (df_clean['batting_team'].isin([team1, team2])) &
        (df_clean['bowling_team'].isin([team1, team2]))
    ]
    potential_ids = []
    for mid, grp in bbdf.groupby('match_id'):
        teams_in = set(grp['batting_team'].unique()) | set(grp['bowling_team'].unique())
        if team1 in teams_in and team2 in teams_in:
            potential_ids.append(mid)
    potential_ids = sorted(potential_ids)
    if not potential_ids:
        return None

    match_num = int(m_row['match_number'])
    idx_pick = min(match_num - 1, len(potential_ids) - 1)
    return potential_ids[idx_pick]


@app.get("/api/match/{match_id}/balls")
def get_match_balls(match_id: int):
    """Return ball-by-ball data for both innings, structured for the frontend."""
    if df_clean is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    bb_id = _resolve_bb_match_id(match_id)
    if bb_id is None:
        raise HTTPException(status_code=404, detail="No ball-by-ball data for this match")

    result = {}
    for inn_num in [1, 2]:
        inn_df = df_clean[(df_clean['match_id'] == bb_id) & (df_clean['innings'] == inn_num)].copy()
        if inn_df.empty:
            continue
        inn_df = inn_df.sort_values('legal_balls_bowled').reset_index(drop=True)

        balls = []
        for _, row in inn_df.iterrows():
            extra_type = None
            if 'wides' in raw_df.columns:
                raw_row_mask = (raw_df['match_id'] == bb_id) & (raw_df['innings'] == inn_num) & (raw_df['ball'] == row['over'] + row['ball_no'] / 10)
            else:
                raw_row_mask = None

            balls.append({
                "over": int(row['over']),
                "ball": int(row['ball_no']),
                "striker": str(row['striker']),
                "nonStriker": str(row.get('non_striker', '')),
                "bowler": str(row['bowler']),
                "totalRuns": int(row['total_runs_this_ball']),
                "runsOffBat": int(row['runs_off_bat']),
                "extras": int(row['extras']),
                "isWicket": bool(row['is_wicket']),
                "cumScore": int(row['cumulative_score']),
                "cumWickets": int(row['cumulative_wickets']),
                "legalBalls": int(row['legal_balls_bowled']),
                "phase": str(row['phase']),
            })

        result[str(inn_num)] = {
            "battingTeam": str(inn_df.iloc[0]['batting_team']),
            "bowlingTeam": str(inn_df.iloc[0]['bowling_team']),
            "totalScore": int(inn_df['cumulative_score'].max()),
            "totalWickets": int(inn_df['cumulative_wickets'].max()),
            "totalOvers": f"{inn_df['over'].max()}.{inn_df.iloc[-1]['ball_no']}",
            "balls": balls,
        }

    return result


@app.get("/api/match/{match_id}/rosters")
def get_match_rosters(match_id: int):
    """Return playing XI for both teams."""
    if match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    if match_id not in match_df.index:
        raise HTTPException(status_code=404, detail="Match not found")

    m_row = match_df.loc[match_id]
    import ast

    def parse_xi(raw_str):
        try:
            s = str(raw_str)
            if s.startswith('['):
                return [str(p).strip() for p in ast.literal_eval(s)]
            return [p.strip() for p in s.split(',') if p.strip()]
        except Exception:
            return []

    return {
        "team1": {
            "name": str(m_row['team1']).strip(),
            "players": parse_xi(m_row.get('team1_players', ''))
        },
        "team2": {
            "name": str(m_row['team2']).strip(),
            "players": parse_xi(m_row.get('team2_players', ''))
        }
    }


@app.get("/api/match/{match_id}/innings-detail")
def get_innings_detail(match_id: int, innings: int = 1):
    """
    Return detailed innings breakdown:
    - wicketEvents: all wicket falls with over, score, batsman dismissed, bowler, how out
    - overSummaries: end-of-over snapshots with score, RR, batsmen, next bowler
    """
    if df_clean is None or raw_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    bb_id = _resolve_bb_match_id(match_id)
    if bb_id is None:
        raise HTTPException(status_code=404, detail="No ball-by-ball data for this match")

    inn_df = df_clean[(df_clean['match_id'] == bb_id) & (df_clean['innings'] == innings)].copy()
    if inn_df.empty:
        raise HTTPException(status_code=404, detail=f"Innings {innings} not found")
    inn_df = inn_df.sort_values('legal_balls_bowled').reset_index(drop=True)

    # Get raw data for wicket details (player_dismissed, wicket_type)
    raw_inn = raw_df[(raw_df['match_id'] == bb_id) & (raw_df['innings'] == innings)].copy()
    if 'over' not in raw_inn.columns and 'ball' in raw_inn.columns:
        raw_inn['over'] = np.floor(raw_inn['ball']).astype(int)
        raw_inn['ball_no'] = np.round((raw_inn['ball'] - raw_inn['over']) * 10).astype(int)

    # Target for 2nd innings
    target = None
    if innings == 2:
        first_inn = df_clean[(df_clean['match_id'] == bb_id) & (df_clean['innings'] == 1)]
        if not first_inn.empty:
            target = int(first_inn['cumulative_score'].max()) + 1

    batting_team = str(inn_df.iloc[0]['batting_team'])
    bowling_team = str(inn_df.iloc[0]['bowling_team'])

    # ── Wicket Events ──
    wicket_events = []
    wicket_rows = inn_df[inn_df['is_wicket'] == 1]
    for _, row in wicket_rows.iterrows():
        over_ball = f"{int(row['over'])}.{int(row['ball_no'])}"
        score_at = int(row['cumulative_score'])
        wickets_at = int(row['cumulative_wickets'])
        balls_bowled = int(row['legal_balls_bowled'])
        runs_remaining = (target - score_at) if target else None

        # Get dismissal details from raw data
        dismissed = str(row.get('striker', ''))
        how_out = "unknown"
        raw_match = raw_inn[
            (raw_inn['innings'] == innings) &
            (raw_inn['player_dismissed'].notna())
        ]
        # Try to match by over and ball
        over_val = int(row['over'])
        ball_val = int(row['ball_no'])
        raw_ball = raw_match[
            (np.floor(raw_match['ball']).astype(int) == over_val) &
            (np.round((raw_match['ball'] - np.floor(raw_match['ball'])) * 10).astype(int) == ball_val)
        ]
        if not raw_ball.empty:
            dismissed = str(raw_ball.iloc[0].get('player_dismissed', dismissed))
            how_out = str(raw_ball.iloc[0].get('wicket_type', 'unknown'))

        wicket_events.append({
            "overBall": over_ball,
            "over": int(row['over']),
            "ball": int(row['ball_no']),
            "scoreAt": f"{score_at}/{wickets_at}",
            "score": score_at,
            "wickets": wickets_at,
            "ballsBowled": balls_bowled,
            "runsRemaining": runs_remaining,
            "target": target,
            "dismissed": dismissed,
            "howOut": how_out,
            "bowler": str(row['bowler']),
            "striker": str(row['striker']),
            "nonStriker": str(row.get('non_striker', '')),
        })

    # ── Over Summaries ──
    over_summaries = []
    max_over = int(inn_df['over'].max())
    for ov in range(0, max_over + 1):
        over_balls = inn_df[inn_df['over'] == ov]
        if over_balls.empty:
            continue
        last_ball = over_balls.iloc[-1]
        score_at = int(last_ball['cumulative_score'])
        wickets_at = int(last_ball['cumulative_wickets'])
        balls_in_over = len(over_balls)
        runs_in_over = int(over_balls['total_runs_this_ball'].sum())
        legal_balls = int(last_ball['legal_balls_bowled'])
        overs_completed = legal_balls / 6
        run_rate = round(score_at / overs_completed, 2) if overs_completed > 0 else 0
        runs_remaining = (target - score_at) if target else None
        balls_remaining = max(0, 120 - legal_balls)

        # Required RR
        req_rr = None
        if target and balls_remaining > 0:
            req_rr = round(((target - score_at) / balls_remaining) * 6, 2)

        # Current batsmen at end of over
        striker = str(last_ball['striker'])
        non_striker = str(last_ball.get('non_striker', ''))

        # Next over bowler
        next_over_balls = inn_df[inn_df['over'] == ov + 1]
        next_bowler = str(next_over_balls.iloc[0]['bowler']) if not next_over_balls.empty else None

        # Wickets in this over
        wickets_this_over = int(over_balls['is_wicket'].sum())

        over_summaries.append({
            "over": ov,
            "overDisplay": ov + 1,   # 1-indexed for display
            "scoreAt": f"{score_at}/{wickets_at}",
            "score": score_at,
            "wickets": wickets_at,
            "runsInOver": runs_in_over,
            "wicketsInOver": wickets_this_over,
            "runRate": run_rate,
            "requiredRR": req_rr,
            "runsRemaining": runs_remaining,
            "ballsRemaining": balls_remaining,
            "target": target,
            "striker": striker,
            "nonStriker": non_striker,
            "bowler": str(last_ball['bowler']),
            "nextBowler": next_bowler,
        })

    return {
        "matchId": match_id,
        "innings": innings,
        "battingTeam": batting_team,
        "bowlingTeam": bowling_team,
        "totalScore": int(inn_df['cumulative_score'].max()),
        "totalWickets": int(inn_df['cumulative_wickets'].max()),
        "target": target,
        "wicketEvents": wicket_events,
        "overSummaries": over_summaries,
    }

@app.get("/api/metadata/match/{match_id}")
def get_match_details(match_id: int):
    if df_clean is None or raw_df is None or match_df is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    # match_id is the DataFrame row index from ipl.csv
    if match_id not in match_df.index:
        raise HTTPException(status_code=404, detail="Match ID not found")
    m_row = match_df.loc[match_id]

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

    # The ball-by-ball dataset uses a different match_id column
    # Try to find via season + team names
    bbdf = df_clean[
        (df_clean['batting_team'].isin([team1_name, team2_name])) &
        (df_clean['bowling_team'].isin([team1_name, team2_name]))
    ]
    
    # Narrow further by finding a block of contiguous match IDs that match both teams
    # Group by match_id in ball-by-ball
    potential_ids = []
    for mid, grp in bbdf.groupby('match_id'):
        teams_in_match = set(grp['batting_team'].unique()) | set(grp['bowling_team'].unique())
        if team1_name in teams_in_match and team2_name in teams_in_match:
            potential_ids.append(mid)
    
    # Pick match_number-th occurrence (1-indexed)
    match_num = int(m_row['match_number'])
    # Sort potential matches to try to align by match order
    potential_ids = sorted(potential_ids)

    # Try to find the match at the right season position
    # Use a rough heuristic: season matches appear in order, pick the match_number-th
    season_matches_for_these_teams = []
    season_bbdf = df_clean[df_clean['match_id'].isin(potential_ids)]
    for mid in potential_ids:
        grp = season_bbdf[season_bbdf['match_id'] == mid]
        if not grp.empty:
            season_matches_for_these_teams.append(mid)
    
    # Pick target match_id
    target_bbid = None
    if season_matches_for_these_teams:
        idx_pick = min(match_num - 1, len(season_matches_for_these_teams) - 1)
        target_bbid = season_matches_for_these_teams[idx_pick]

    # Fallback: just use first available
    if target_bbid is None and potential_ids:
        target_bbid = potential_ids[0]

    if target_bbid is None:
        raise HTTPException(status_code=400, detail="No ball-by-ball data found for this match.")

    # 1. Get 2nd innings data
    innings_df = df_clean[(df_clean['match_id'] == target_bbid) & (df_clean['innings'] == 2)].copy()
    if innings_df.empty:
        raise HTTPException(status_code=400, detail="No chase data found (may be a rain-affected match).")

    first_innings = df_clean[(df_clean['match_id'] == target_bbid) & (df_clean['innings'] == 1)]
    target = int(first_innings['cumulative_score'].max() + 1) if not first_innings.empty else 150

    # 2. Build timeline
    timeline = []
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

    # 3. Critical moment state
    crit_balls = innings_df[innings_df['over'] <= critical_over]
    crit_state = crit_balls.iloc[-1] if not crit_balls.empty else innings_df.iloc[-1]

    batting_team = str(crit_state['batting_team'])
    bowling_team = str(crit_state['bowling_team'])
    crit_over_str = f"{int(crit_state['over'])}.{int(crit_state['ball_no'])}"
    score_now = int(crit_state['cumulative_score'])
    wkts_now = int(crit_state['cumulative_wickets'])
    balls_done = int(crit_state.get('legal_balls_bowled', critical_over * 6))
    balls_rem = max(0, 120 - balls_done)
    runs_needed = target - score_now
    req_rr = round((runs_needed / max(1, balls_rem)) * 6, 2)
    cur_rr = round((score_now / max(1, balls_done)) * 6, 2)

    critical_moment = {
        "over": crit_over_str,
        "situation": f"{batting_team} needs {runs_needed} runs off {balls_rem} balls.",
        "score": f"{batting_team}: {score_now}/{wkts_now}",
        "target": target,
        "battingTeam": batting_team,
        "bowlingTeam": bowling_team,
        "runRate": {"required": req_rr, "current": cur_rr},
        "originalWinProb": {"team1": 50, "team2": 50},
        "striker": str(crit_state.get('striker', '')),
        "nonStriker": str(crit_state.get('non_striker', '')),
        "currentBowler": str(crit_state.get('bowler', '')),
        "timeline": timeline
    }

    # 4. Parse players from ipl.csv
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
        "title": f"{team1_name} vs {team2_name}",
        "team1": {"name": team1_name, "short": team1_name[:3].upper(), "color": team_color(team1_name)},
        "team2": {"name": team2_name, "short": team2_name[:3].upper(), "color": team_color(team2_name)},
        "venue": str(m_row.get('venue', 'Unknown')),
        "date": f"IPL {calendar_year} — Match {int(m_row['match_number'])}",
        "criticalMoment": critical_moment,
        "batters": batters,
        "bowlers": bowlers
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)


