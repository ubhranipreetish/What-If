import pandas as pd
import numpy as np
import math
from collections import defaultdict

# ==========================================================
# 🏁 MILESTONE 0 — Data Preparation
# ==========================================================
def clean_and_prepare_data(deliveries_path, matches_path=None, remove_super_overs=True):
    """
    Cleans IPL ball-by-ball data and prepares a simulation-ready dataset with:
    - Correct legal ball tracking
    - Accurate over/ball extraction (float-safe)
    - Proper phase classification (0-indexed overs)
    - Cumulative match state variables
    """
    print("📂 Loading deliveries dataset...")
    df = pd.read_csv(deliveries_path)

    columns_to_drop = ['other_wicket_type', 'other_player_dismissed']
    df = df.drop(columns=[col for col in columns_to_drop if col in df.columns])

    extras_cols = ['wides', 'noballs', 'byes', 'legbyes', 'penalty']
    for col in extras_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    df['is_wicket'] = df['player_dismissed'].notna().astype(int)

    df['over'] = np.floor(df['ball']).astype(int)
    df['ball_no'] = np.round((df['ball'] - df['over']) * 10).astype(int)

    if remove_super_overs:
        df = df[df['innings'] <= 2]

    print("🔄 Sorting match flow...")
    df = df.sort_values(by=['match_id', 'innings', 'over', 'ball_no']).reset_index(drop=True)

    df['total_runs_this_ball'] = df['runs_off_bat'] + df['extras']
    df['is_legal_delivery'] = ((df['wides'] == 0) & (df['noballs'] == 0)).astype(int)

    print("📊 Calculating cumulative states...")
    group = df.groupby(['match_id', 'innings'])
    df['cumulative_score'] = group['total_runs_this_ball'].cumsum()
    df['cumulative_wickets'] = group['is_wicket'].cumsum()
    df['legal_balls_bowled'] = group['is_legal_delivery'].cumsum()

    def get_phase(over):
        if over <= 5: return 'powerplay'
        elif over <= 14: return 'middle'
        else: return 'death'

    df['phase'] = df['over'].apply(get_phase)
    df['balls_remaining'] = 120 - df['legal_balls_bowled']

    if matches_path:
        print("🔗 Merging match results...")
        df_matches = pd.read_csv(matches_path)
        if 'id' in df_matches.columns and 'winner' in df_matches.columns:
            df = df.merge(df_matches[['id', 'winner']], left_on='match_id', right_on='id', how='left')
            df.rename(columns={'winner': 'match_winner'}, inplace=True)
            df.drop(columns=['id'], inplace=True)

    max_balls_per_innings = df.groupby(['match_id', 'innings'])['legal_balls_bowled'].max()
    if (max_balls_per_innings > 120).any():
        print("⚠️ Warning: Some innings exceed 120 legal balls. Capping to 120.")
        df['legal_balls_bowled'] = df['legal_balls_bowled'].clip(upper=120)

    core_columns = [
        'match_id', 'innings', 'over', 'ball_no', 'phase', 'cumulative_score', 
        'cumulative_wickets', 'legal_balls_bowled', 'balls_remaining', 'batting_team', 
        'bowling_team', 'striker', 'non_striker', 'bowler', 'runs_off_bat', 'extras', 
        'total_runs_this_ball', 'is_wicket'
    ]

    if 'match_winner' in df.columns:
        core_columns.append('match_winner')

    df_clean = df[core_columns]
    print("✅ Milestone 0 Complete — Simulation Ready")
    return df_clean

# ==========================================================
# 🏁 MILESTONE 1 — Match State Extraction
# ==========================================================
def get_match_state(df_clean, match_id, innings, over, ball_no):
    match_df = df_clean[(df_clean['match_id'] == match_id) & (df_clean['innings'] == innings)].copy()

    if match_df.empty:
        raise ValueError(f"❌ Match ID {match_id} or Innings {innings} not found.")

    match_df = match_df.sort_values(['legal_balls_bowled']).reset_index(drop=True)

    target_mask = ((match_df['over'] == over) & (match_df['ball_no'] == ball_no))

    if target_mask.any():
        target_idx = match_df[target_mask].index[0]
    else:
        over_df = match_df[match_df['over'] == over]
        if over_df.empty:
            raise ValueError(f"❌ Over {over} does not exist in this innings.")
        print(f"⚠️ Exact ball {ball_no} not found. Snapping to nearest ball.")
        target_idx = (over_df['ball_no'] - ball_no).abs().idxmin()

    target_row = match_df.loc[target_idx]
    prev_rows = match_df.iloc[:target_idx]

    if prev_rows.empty:
        score_before = 0
        wickets_before = 0
        legal_balls_bowled = 0
    else:
        last_prev = prev_rows.iloc[-1]
        score_before = last_prev['cumulative_score']
        wickets_before = last_prev['cumulative_wickets']
        legal_balls_bowled = last_prev['legal_balls_bowled']

    balls_remaining = max(120 - legal_balls_bowled, 0)
    target = None
    runs_required = None

    if innings == 2:
        first_innings_df = df_clean[(df_clean['match_id'] == match_id) & (df_clean['innings'] == 1)]
        if not first_innings_df.empty:
            first_total = first_innings_df['cumulative_score'].max()
            target = first_total + 1
            runs_required = max(target - score_before, 0)

    return {
        "match_id": match_id, "innings": innings, "phase": target_row['phase'],
        "batting_team": target_row['batting_team'], "bowling_team": target_row['bowling_team'],
        "striker": target_row['striker'], "non_striker": target_row['non_striker'],
        "bowler": target_row['bowler'], "current_score": int(score_before),
        "current_wickets": int(wickets_before), "legal_balls_bowled": int(legal_balls_bowled),
        "balls_remaining": int(balls_remaining), "target": int(target) if target else None,
        "runs_required": int(runs_required) if runs_required else None
    }

def generate_remaining_batting_lineup(raw_df, match_df, initial_state):
    match_id = initial_state['match_id']
    batting_team = initial_state['batting_team']

    innings_df = raw_df[raw_df['match_id'] == match_id].copy()

    if innings_df.empty:
        raise ValueError("Match not found in ball-by-ball dataset.")

    match_date = pd.to_datetime(innings_df['start_date'].iloc[0])

    candidate = match_df[
        (match_df['team1'].str.strip() == batting_team.strip()) |
        (match_df['team2'].str.strip() == batting_team.strip())
    ].copy()

    if candidate.empty:
        raise ValueError(f"Could not match lineup dataset by team: {batting_team}")

    candidate['match_date'] = pd.to_datetime(candidate['match_date'])
    candidate['date_diff'] = (candidate['match_date'] - match_date).abs()
    match_row = candidate.sort_values('date_diff').iloc[0]

    if match_row['team1'].strip() == batting_team.strip():
        xi_string = match_row['team1_players']
    else:
        xi_string = match_row['team2_players']

    try:
        import ast
        if isinstance(xi_string, str) and xi_string.startswith('['):
            full_xi = ast.literal_eval(xi_string)
        else:
            full_xi = xi_string.split(",")
    except Exception:
        full_xi = str(xi_string).split(",")

    full_xi = [str(p).strip() for p in full_xi]

    state_over = initial_state.get('over')
    state_ball = initial_state.get('ball_no')

    innings_df['over_idx'] = np.floor(innings_df['ball']).astype(int)
    innings_df['ball_idx'] = ((innings_df['ball'] - innings_df['over_idx']) * 10).round().astype(int)

    mask_before = (
        (innings_df['over_idx'] < state_over) |
        ((innings_df['over_idx'] == state_over) & (innings_df['ball_idx'] < state_ball))
    )

    dismissed_players = innings_df.loc[
        mask_before & innings_df['player_dismissed'].notna(), 
        'player_dismissed'
    ].unique().tolist()
    
    current_pair = [initial_state['striker'], initial_state['non_striker']]

    return [p for p in full_xi if p not in dismissed_players and p not in current_pair]

def generate_realistic_bowling_plan(df_clean, match_id, innings, balls_remaining):
    innings_df = df_clean[(df_clean['match_id'] == match_id) & (df_clean['innings'] == innings)].copy()
    over_bowler_map = innings_df.sort_values(['over']).drop_duplicates('over')[['over', 'bowler']]
    full_plan = over_bowler_map['bowler'].tolist()
    overs_remaining = balls_remaining // 6
    return full_plan[:overs_remaining]

# ==========================================================
# 🏁 MILESTONE 2 — Player Profile Builder (v5)
# ==========================================================
def derive_player_profiles_v5(df, prior_weight=25):
    print("🎯 Starting Milestone 2 — Optimized Player Profiling...")
    df = df.copy()

    for col in ['wides', 'noballs', 'byes', 'legbyes', 'penalty']:
        if col in df.columns: df[col] = df[col].fillna(0)

    if 'is_wicket' not in df.columns:
        df['is_wicket'] = df['player_dismissed'].notna().astype(int)

    if 'phase' not in df.columns:
        df['over'] = np.floor(df['ball']).astype(int)
        def get_phase(over):
            if over <= 5: return 'powerplay'
            elif over <= 14: return 'middle'
            else: return 'death'
        df['phase'] = df['over'].apply(get_phase)

    phases = ['powerplay', 'middle', 'death']

    # Bowler Discipline Model
    df['delivery_type'] = np.select([df['wides'] > 0, df['noballs'] > 0], ['wide', 'no_ball'], default='legal')
    
    global_delivery_counts = df.groupby(['phase', 'delivery_type']).size().unstack(fill_value=0)
    sum_delivery_counts = global_delivery_counts.sum(axis=1)
    global_delivery_probs = global_delivery_counts.div(sum_delivery_counts.replace(0, 1), axis=0)

    bowler_counts = df.groupby(['bowler', 'phase', 'delivery_type']).size().unstack(fill_value=0)
    bowler_discipline_profiles = defaultdict(lambda: defaultdict(dict))

    for (bowler, phase), row in bowler_counts.iterrows():
        total = row.sum()
        league_prior = global_delivery_probs.loc[phase]
        smoothed = (row + (prior_weight * league_prior)) / (total + prior_weight)
        smoothed = smoothed / smoothed.sum()
        bowler_discipline_profiles[bowler][phase] = smoothed.to_dict()
        bowler_discipline_profiles[bowler][phase]['_balls_recorded'] = int(total)

    # Legal Ball Outcome Model
    df_legal = df[df['delivery_type'] == 'legal'].copy()
    df_legal['outcome'] = np.select(
        [
            df_legal['is_wicket'] == 1,
            (df_legal['byes'] > 0) | (df_legal['legbyes'] > 0),
            df_legal['runs_off_bat'] == 0, df_legal['runs_off_bat'] == 1, df_legal['runs_off_bat'] == 2,
            df_legal['runs_off_bat'] == 3, df_legal['runs_off_bat'] == 4, df_legal['runs_off_bat'] == 6
        ],
        ['W', 'B', '0', '1', '2', '3', '4', '6'],
        default='1'
    )
    legal_outcomes = ['0', '1', '2', '3', '4', '6', 'W', 'B']

    global_outcome_counts = df_legal.groupby(['phase', 'outcome']).size().unstack(fill_value=0)
    sum_outcome_counts = global_outcome_counts.sum(axis=1)
    global_outcome_probs = global_outcome_counts.div(sum_outcome_counts.replace(0, 1), axis=0)

    def build_role_profiles(role_column):
        profiles = defaultdict(lambda: defaultdict(dict))
        career_counts_all = df_legal.groupby([role_column, 'outcome']).size().unstack(fill_value=0)
        role_counts = df_legal.groupby([role_column, 'phase', 'outcome']).size().unstack(fill_value=0)

        for player in career_counts_all.index:
            career_counts = career_counts_all.loc[player]
            career_total = career_counts.sum()
            career_probs = career_counts / career_total if career_total > 0 else pd.Series([1.0 / len(legal_outcomes)] * len(legal_outcomes), index=legal_outcomes)

            for phase in phases:
                if (player, phase) in role_counts.index:
                    row = role_counts.loc[(player, phase)]
                    total = row.sum()
                else:
                    row = pd.Series([0]*len(legal_outcomes), index=legal_outcomes)
                    total = 0

                phase_probs = row / total if total > 0 else career_probs
                adjusted = career_probs * (phase_probs / career_probs.replace(0, 1e-6))
                
                smoothed = (adjusted + (prior_weight * global_outcome_probs.loc[phase])) / (adjusted.sum() + prior_weight)
                profiles[player][phase] = (smoothed / smoothed.sum()).to_dict()
                profiles[player][phase]['_balls_recorded'] = int(total)

        return profiles

    batting_profiles = build_role_profiles('striker')
    bowling_outcome_profiles = build_role_profiles('bowler')
    print("✅ Milestone 2 Complete — Optimized & Fast")
    
    return {
        "bowler_discipline": bowler_discipline_profiles,
        "batting_profiles": batting_profiles,
        "bowling_outcomes": bowling_outcome_profiles,
        "league_delivery_priors": global_delivery_probs.to_dict('index'),
        "league_outcome_priors": global_outcome_probs.to_dict('index')
    }

# ==========================================================
# 🏁 MILESTONE 3 — Ball Probability Engine
# ==========================================================
class BallProbabilityEngine:
    def __init__(self, profiles):
        self.discipline_profiles = profiles.get("bowler_discipline", {})
        self.batting_profiles = profiles.get("batting_profiles", {})
        self.bowling_outcomes = profiles.get("bowling_outcomes", {})
        self.league_delivery = profiles.get("league_delivery_priors", {})
        self.league_outcome = profiles.get("league_outcome_priors", {})
        self.discipline_keys = ['legal', 'wide', 'no_ball']
        self.outcome_keys = ['0', '1', '2', '3', '4', '6', 'W']

    def get_discipline_probs(self, bowler, phase):
        probs_dict = self.discipline_profiles.get(bowler, {}).get(phase) or self.league_delivery.get(phase, {})
        prob_array = np.array([probs_dict.get(k, 0.0) for k in self.discipline_keys])
        if prob_array.sum() == 0: prob_array = np.ones_like(prob_array)
        return self.discipline_keys, prob_array / prob_array.sum()

    def get_legal_outcome_probs(self, striker, bowler, phase, aggression_factor=1.0):
        bat_dict = self.batting_profiles.get(striker, {}).get(phase) or self.league_outcome.get(phase, {})
        bowl_dict = self.bowling_outcomes.get(bowler, {}).get(phase) or self.league_outcome.get(phase, {})

        bat_array = np.array([bat_dict.get(k, 0.0) for k in self.outcome_keys])
        bowl_array = np.array([bowl_dict.get(k, 0.0) for k in self.outcome_keys])

        blended_array = (bat_array * 0.55) + (bowl_array * 0.45)

        if aggression_factor > 1.0:
            for idx, key in enumerate(self.outcome_keys):
                if key in ['4', '6']: blended_array[idx] *= aggression_factor
                if key == 'W': blended_array[idx] *= aggression_factor * 0.9

        if blended_array.sum() <= 1e-9: blended_array = np.ones_like(blended_array)

        if bat_dict.get('_balls_recorded', 999) < 150:
            blended_array[self.outcome_keys.index('0')] *= 1.10
            blended_array[self.outcome_keys.index('4')] *= 0.85
            blended_array[self.outcome_keys.index('6')] *= 0.75
            blended_array[self.outcome_keys.index('W')] *= 1.15

        wickets = getattr(self, "current_wickets", 0)
        if wickets >= 7:
            blended_array[self.outcome_keys.index('4')] *= 0.80
            blended_array[self.outcome_keys.index('6')] *= 0.65
            blended_array[self.outcome_keys.index('0')] *= 1.20
            blended_array[self.outcome_keys.index('W')] *= 1.30

        if blended_array.sum() <= 1e-9: blended_array = np.ones_like(blended_array)
        return self.outcome_keys, blended_array / blended_array.sum()

    def simulate_delivery(self, striker, bowler, phase, aggression_factor=1.0):
        d_keys, d_probs = self.get_discipline_probs(bowler, phase)
        delivery_type = str(np.random.choice(d_keys, p=d_probs))

        if delivery_type != 'legal': return delivery_type

        o_keys, o_probs = self.get_legal_outcome_probs(striker, bowler, phase, aggression_factor)
        if np.isnan(o_probs).any() or o_probs.sum() == 0: o_probs = np.ones_like(o_probs) / len(o_probs)
        return str(np.random.choice(o_keys, p=o_probs))

    def simulate_most_probable_delivery(self, striker, bowler, phase, aggression_factor=1.0):
        d_keys, d_probs = self.get_discipline_probs(bowler, phase)
        delivery_type = d_keys[np.argmax(d_probs)]

        if delivery_type != 'legal': return delivery_type

        o_keys, o_probs = self.get_legal_outcome_probs(striker, bowler, phase, aggression_factor)
        return o_keys[np.argmax(o_probs)]

# ==========================================================
# 🏁 MILESTONE 4 — Nonlinear Simulator & Monte Carlo
# ==========================================================
class SingleMatchSimulator:
    def __init__(self, probability_engine):
        self.engine = probability_engine

    def simulate_fast(self, initial_state, batting_lineup=None, bowling_plan=None):
        score, wickets, _ = self._run_simulation_loop(initial_state, batting_lineup, bowling_plan, detailed=False)
        return score, wickets

    def simulate_detailed(self, initial_state, batting_lineup=None, bowling_plan=None):
        return self._run_simulation_loop(initial_state, batting_lineup, bowling_plan, detailed=True)

    def _run_simulation_loop(self, initial_state, batting_lineup, bowling_plan, detailed):
        state = initial_state.copy()
        active_batters = batting_lineup.copy() if batting_lineup else []
        active_bowlers = bowling_plan.copy() if bowling_plan else []

        match_log = []
        state['is_free_hit'] = False

        last_6_runs, striker_balls, striker_confidence, recent_wickets, dot_streak = [], 0, 1.0, [], 0

        while state['balls_remaining'] > 0 and state['wickets'] < 10:
            if state.get('target') and state['score'] >= state['target']: break

            overs_bowled = state['legal_balls_bowled'] / 6
            aggression = 1.0

            if state.get('target'):
                rrr = (max(0, state['target'] - state['score']) / state['balls_remaining']) * 6
                aggression *= 1 + ((1 / (1 + np.exp(-(rrr - 8)))) * 0.6)

            if len(last_6_runs) >= 6:
                aggression *= (1 + np.tanh((sum(last_6_runs[-6:]) - 6) / 6) * 0.15)

            aggression *= (1 + np.log1p(striker_balls) * 0.04) * striker_confidence
            if len(recent_wickets) >= 2: aggression *= 0.9
            if overs_bowled >= 15: aggression *= 1.18

            if state.get('target') and state['balls_remaining'] <= 12:
                rrr = (max(0, state['target'] - state['score']) / state['balls_remaining']) * 6
                if rrr > 10: aggression *= 1.25
                elif rrr < 6: aggression *= 0.93

            aggression = max(0.7, min(aggression * np.random.normal(1.0, 0.07), 2.2))
            self.engine.current_wickets = state['wickets']

            outcome = self.engine.simulate_delivery(
                striker=state['striker'], bowler=state['current_bowler'],
                phase=state['phase'], aggression_factor=aggression
            )

            is_legal, runs_this_ball, just_no_ball = True, 0, False

            if outcome == 'wide':
                is_legal = False; state['score'] += 1
            elif outcome == 'no_ball':
                is_legal, just_no_ball = False, True; state['score'] += 1
            elif outcome == 'W':
                if not state['is_free_hit']:
                    state['wickets'] += 1
                    striker_confidence, striker_balls = 0.95, 0
                    recent_wickets = [w for w in recent_wickets + [state['legal_balls_bowled']] if state['legal_balls_bowled'] - w <= 12]
                    if active_batters: state['striker'] = active_batters.pop(0)
            else:
                runs_this_ball = int(outcome)
                state['score'] += runs_this_ball
                striker_balls += 1

                if runs_this_ball in [4, 6]: striker_confidence *= 1.06
                elif runs_this_ball == 0:
                    dot_streak += 1
                    if dot_streak >= 3: striker_confidence *= 0.97
                else: dot_streak = 0

                striker_confidence = max(0.85, min(striker_confidence, 1.25))

            state['is_free_hit'] = just_no_ball

            if is_legal:
                state['legal_balls_bowled'] += 1
                state['balls_remaining'] -= 1
                last_6_runs.append(runs_this_ball)

                if runs_this_ball in [1, 3]: state['striker'], state['non_striker'] = state['non_striker'], state['striker']
                if state['legal_balls_bowled'] % 6 == 0:
                    state['striker'], state['non_striker'] = state['non_striker'], state['striker']
                    overs = state['legal_balls_bowled'] // 6
                    state['phase'] = 'powerplay' if overs <= 5 else 'middle' if overs <= 14 else 'death'
                    if active_bowlers: state['current_bowler'] = active_bowlers.pop(0)

            if detailed:
                match_log.append({
                    "score": state['score'], "wickets": state['wickets'],
                    "outcome": outcome, "aggression": round(aggression, 2), "confidence": round(striker_confidence, 2)
                })

        return state['score'], state['wickets'], match_log

    def simulate_most_probable(self, initial_state, batting_lineup=None, bowling_plan=None):
      state = initial_state.copy()
      active_batters = batting_lineup.copy() if batting_lineup else []
      active_bowlers = bowling_plan.copy() if bowling_plan else []
      match_log = []

      while state['balls_remaining'] > 0 and state['wickets'] < 10:
          if state.get('target') and state['score'] >= state['target']: break

          outcome = self.engine.simulate_most_probable_delivery(
              striker=state['striker'], bowler=state['current_bowler'],
              phase=state['phase'], aggression_factor=1.0
          )

          is_legal, runs_this_ball = True, 0

          if outcome in ['wide', 'no_ball']: is_legal = False; state['score'] += 1
          elif outcome == 'W':
              state['wickets'] += 1
              if active_batters: state['striker'] = active_batters.pop(0)
          else:
              runs_this_ball = int(outcome)
              state['score'] += runs_this_ball

          if is_legal:
              state['legal_balls_bowled'] += 1
              state['balls_remaining'] -= 1
              if runs_this_ball in [1, 3]: state['striker'], state['non_striker'] = state['non_striker'], state['striker']
              if state['legal_balls_bowled'] % 6 == 0:
                  state['striker'], state['non_striker'] = state['non_striker'], state['striker']
                  if active_bowlers: state['current_bowler'] = active_bowlers.pop(0)

          match_log.append({"score": state['score'], "wickets": state['wickets'], "outcome": outcome})

      return state['score'], state['wickets'], match_log

class MonteCarloEngine:
    def __init__(self, simulator, num_simulations=2000):
        self.simulator = simulator
        self.num_simulations = num_simulations

    def run_what_if_scenario(self, initial_state, batting_lineup, bowling_plan):
        scores, wins, target = [], 0, initial_state.get("target")

        for _ in range(self.num_simulations):
            score, _ = self.simulator.simulate_fast(initial_state, batting_lineup, bowling_plan)
            scores.append(score)
            if target and score >= target: wins += 1

        return {
            "projected_median_score": round(float(np.median(scores)), 1),
            "std_dev": round(float(np.std(scores)), 2),
            "win_probability": round(float((wins / self.num_simulations) * 100), 2) if target else None
        }

class WhatIfEngine:
    def __init__(self, df_clean, raw_df, match_df, simulator, mc_engine):
        self.df_clean = df_clean
        self.raw_df = raw_df
        self.match_df = match_df
        self.simulator = simulator
        self.mc_engine = mc_engine

    def get_ball_state(self, match_id, innings, over, ball_no):
        ball_row = self.df_clean[
            (self.df_clean['match_id'] == match_id) & (self.df_clean['innings'] == innings) &
            (self.df_clean['over'] == over) & (self.df_clean['ball_no'] == ball_no)
        ]
        if ball_row.empty: raise ValueError("Ball not found.")

        state = get_match_state(self.df_clean, match_id, innings, over, ball_no)
        state['score'] = state.pop('current_score')
        state['wickets'] = state.pop('current_wickets')
        state['current_bowler'] = state['bowler']

        return state, {
            "runs": ball_row.iloc[0]['total_runs_this_ball'],
            "is_wicket": ball_row.iloc[0]['is_wicket'],
            "striker": ball_row.iloc[0]['striker'],
            "bowler": ball_row.iloc[0]['bowler']
        }

    def apply_modification(self, state, modification):
        state = state.copy()
        if modification.get("new_runs") is not None: state['score'] += modification["new_runs"]
        if modification.get("force_wicket"): state['wickets'] += 1
        if modification.get("new_striker"): state['striker'] = modification["new_striker"]
        if modification.get("new_bowler"): state['current_bowler'] = modification["new_bowler"]
        
        state['balls_remaining'] -= 1
        state['legal_balls_bowled'] += 1
        return state

    def simulate_counterfactual(self, modified_state):
        batting_lineup = generate_remaining_batting_lineup(self.raw_df, self.match_df, modified_state)
        innings_df = self.df_clean[(self.df_clean['match_id'] == modified_state['match_id']) & (self.df_clean['innings'] == modified_state['innings'])]
        
        all_bowlers = innings_df['bowler'].unique().tolist()
        bowling_plan = [all_bowlers[i % len(all_bowlers)] for i in range(modified_state['balls_remaining'] // 6)]

        final_score, final_wickets = self.simulator.simulate_fast(modified_state, batting_lineup, bowling_plan)
        mc_result = self.mc_engine.run_what_if_scenario(modified_state, batting_lineup, bowling_plan)

        return final_score, final_wickets, mc_result
