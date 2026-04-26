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
    df = df.sort_values(by=['match_id', 'innings', 'over', 'ball']).reset_index(drop=True)

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
        'total_runs_this_ball', 'is_wicket', 'venue'
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

    candidate = match_df[
        (match_df['team1'].str.strip() == batting_team.strip()) |
        (match_df['team2'].str.strip() == batting_team.strip())
    ].copy()

    if candidate.empty:
        raise ValueError(f"Could not match lineup dataset by team: {batting_team}")

    # Try to match by date if available, otherwise just use the first matching team game
    try:
        match_date = pd.to_datetime(innings_df['start_date'].iloc[0])
        candidate['match_date'] = pd.to_datetime(candidate['match_date'])
        candidate['date_diff'] = (candidate['match_date'] - match_date).abs()
        match_row = candidate.sort_values('date_diff').iloc[0]
    except (KeyError, ValueError, IndexError):
        # Fallback: if dates are missing, try to match by match_id directly (if they share the same ID space)
        # or just pick the first one
        if match_id in candidate.index:
            match_row = candidate.loc[match_id]
        else:
            match_row = candidate.iloc[0]

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

def extract_recent_form(raw_df, match_id, active_players, n_balls=50):
    current_match = raw_df[raw_df['match_id'] == match_id]
    if current_match.empty: return {}
    match_date = pd.to_datetime(current_match['start_date'].iloc[0])

    past_df = raw_df[pd.to_datetime(raw_df['start_date']) < match_date]

    form_multipliers = {}
    
    for player in active_players:
        batter_balls = past_df[past_df['striker'] == player].tail(n_balls)
        bat_mult = 1.0
        if len(batter_balls) > 10:
            runs = batter_balls['runs_off_bat'].sum()
            sr = (runs / len(batter_balls)) * 100
            bat_mult = max(0.8, min(1.3, sr / 130.0))
            
        bowler_balls = past_df[past_df['bowler'] == player].tail(n_balls)
        bowl_mult = 1.0
        if len(bowler_balls) > 10:
            wickets = bowler_balls['player_dismissed'].notna().sum()
            bowl_mult = max(0.8, min(1.3, max(1, wickets) / 3.0)) 

        # We take the best form out of their primary role
        # (if they barely bowl, bat_mult will drive the multiplier, and vice-versa)
        if len(batter_balls) > len(bowler_balls):
            form_multipliers[player] = bat_mult
        elif len(bowler_balls) > len(batter_balls):
            form_multipliers[player] = bowl_mult
        else:
            form_multipliers[player] = max(bat_mult, bowl_mult)

    return form_multipliers

# ==========================================================
# 🧠 SCENARIO INTELLIGENCE LAYER
# ==========================================================

class ScenarioParser:
    """Classifies user scenario changes into structured impact types."""

    def __init__(self, profiles):
        self.batting_profiles = profiles.get("batting_profiles", {})
        self.bowling_outcomes = profiles.get("bowling_outcomes", {})

    def classify_player_role(self, player_name):
        bat_balls, bowl_balls = 0, 0
        for phase_data in self.batting_profiles.get(player_name, {}).values():
            if isinstance(phase_data, dict):
                bat_balls += phase_data.get('_balls_recorded', 0)
        for phase_data in self.bowling_outcomes.get(player_name, {}).values():
            if isinstance(phase_data, dict):
                bowl_balls += phase_data.get('_balls_recorded', 0)
        if bat_balls > bowl_balls * 1.5: return 'batter'
        elif bowl_balls > bat_balls * 1.5: return 'bowler'
        return 'allrounder'

    def get_player_quality(self, player_name, role=None):
        if role is None:
            role = self.classify_player_role(player_name)
        quality = 0.5
        if role in ('batter', 'allrounder'):
            prof = self.batting_profiles.get(player_name, {})
            phases = [v for v in prof.values() if isinstance(v, dict) and '_balls_recorded' in v]
            if phases:
                boundary_rate = sum(p.get('4', 0) + p.get('6', 0) for p in phases) / len(phases)
                quality = max(quality, min(1.0, boundary_rate * 3.0))
        if role in ('bowler', 'allrounder'):
            prof = self.bowling_outcomes.get(player_name, {})
            phases = [v for v in prof.values() if isinstance(v, dict) and '_balls_recorded' in v]
            if phases:
                bowl_q = sum(p.get('W', 0) + p.get('0', 0) * 0.3 for p in phases) / len(phases)
                quality = max(quality, min(1.0, bowl_q * 2.0))
        return quality

    def parse(self, original_state, modification):
        changes = {
            'player_in': None, 'player_out': None,
            'change_type': 'state_change',
            'score_override': modification.get('new_runs'),
            'wicket_override': modification.get('force_wicket', False)
        }
        if modification.get('new_striker'):
            changes['player_in'] = modification['new_striker']
            changes['player_out'] = original_state.get('striker')
            in_role = self.classify_player_role(changes['player_in'])
            out_role = self.classify_player_role(changes['player_out'])
            if out_role == 'bowler' and in_role == 'batter':
                changes['change_type'] = 'batter_replaces_bowler'
            elif out_role == 'batter' and in_role == 'bowler':
                changes['change_type'] = 'bowler_replaces_batter'
            elif in_role == 'allrounder':
                changes['change_type'] = 'allrounder_added'
            else:
                in_q = self.get_player_quality(changes['player_in'])
                out_q = self.get_player_quality(changes['player_out'])
                changes['change_type'] = 'batter_upgrade' if in_q > out_q + 0.1 else \
                    'batter_downgrade' if out_q > in_q + 0.1 else 'lateral_move'
        elif modification.get('new_bowler'):
            changes['player_in'] = modification['new_bowler']
            changes['player_out'] = original_state.get('current_bowler', original_state.get('bowler'))
            in_q = self.get_player_quality(changes['player_in'], 'bowler')
            out_q = self.get_player_quality(changes['player_out'], 'bowler')
            if in_q > out_q + 0.1: changes['change_type'] = 'bowler_upgrade'
            elif out_q > in_q + 0.1: changes['change_type'] = 'bowler_downgrade'
            else: changes['change_type'] = 'lateral_move'
        # Detect tailender scenario
        if changes.get('player_in'):
            if self.classify_player_role(changes['player_in']) == 'bowler' and \
               original_state.get('wickets', 0) >= 6:
                changes['change_type'] = 'tailender_early'
        return {
            'match_id': original_state.get('match_id'),
            'innings': original_state.get('innings'),
            'current_score': original_state.get('score', original_state.get('current_score', 0)),
            'wickets': original_state.get('wickets', original_state.get('current_wickets', 0)),
            'overs': original_state.get('legal_balls_bowled', 0) / 6,
            'changes': changes
        }


class SituationAwarenessEngine:
    """Detects match state and returns probability adjustments."""

    OUTCOME_KEYS = ['0', '1', '2', '3', '4', '6', 'W']
    STATE_MULTS = {
        'easy_chase':     {'0': 1.05, '1': 1.10, '2': 1.05, '4': 0.90, '6': 0.85, 'W': 0.80},
        'pressure':       {'0': 0.92, '1': 0.95, '4': 1.15, '6': 1.10, 'W': 1.10},
        'panic':          {'0': 0.78, '1': 0.85, '4': 1.35, '6': 1.40, 'W': 1.30},
        'collapse_risk':  {'0': 1.20, '1': 1.05, '4': 0.80, '6': 0.65, 'W': 1.30},
        'death_explosion':{'0': 0.85, '1': 0.90, '4': 1.20, '6': 1.30, 'W': 1.15},
    }

    def detect_states(self, match_state):
        active = []
        balls_rem = match_state.get('balls_remaining', 120)
        wickets = match_state.get('wickets', 0)
        overs = match_state.get('legal_balls_bowled', 0) / 6
        target = match_state.get('target')
        score = match_state.get('score', 0)
        if target and balls_rem > 0:
            rrr = (max(0, target - score) / balls_rem) * 6
            if rrr < 8: active.append('easy_chase')
            elif rrr <= 12: active.append('pressure')
            else: active.append('panic')
        if (10 - wickets) < 4: active.append('collapse_risk')
        if overs >= 16: active.append('death_explosion')
        return active

    def get_adjustments(self, match_state):
        active = self.detect_states(match_state)
        adj = np.ones(len(self.OUTCOME_KEYS))
        for state in active:
            mults = self.STATE_MULTS.get(state, {})
            for idx, key in enumerate(self.OUTCOME_KEYS):
                adj[idx] *= mults.get(key, 1.0)
        return adj

    def get_aggression_factor(self, match_state):
        active = self.detect_states(match_state)
        agg = 1.0
        if 'panic' in active: agg *= 1.40
        elif 'pressure' in active: agg *= 1.15
        elif 'easy_chase' in active: agg *= 0.85
        if 'death_explosion' in active: agg *= 1.15
        if 'collapse_risk' in active: agg *= 0.88
        return max(0.7, min(agg, 2.0))


class ScenarioImpactAnalyzer:
    """Evaluates scenario changes and produces impact_score [-1, +1]."""

    CHANGE_IMPACTS = {
        'batter_replaces_bowler': +0.40, 'bowler_replaces_batter': -0.40,
        'batter_upgrade': +0.30, 'batter_downgrade': -0.20,
        'bowler_upgrade': -0.30, 'bowler_downgrade': +0.30,
        'allrounder_added': +0.10, 'tailender_early': -0.50,
        'state_change': 0.0, 'lateral_move': 0.0,
    }
    OUTCOME_KEYS = ['0', '1', '2', '3', '4', '6', 'W']

    def __init__(self, scenario_parser):
        self.parser = scenario_parser

    def analyze(self, scenario, original_state):
        changes = scenario['changes']
        change_type = changes.get('change_type', 'state_change')
        base_impact = self.CHANGE_IMPACTS.get(change_type, 0.0)
        reasons = []
        # Reason from change type
        reason_map = {
            'batter_replaces_bowler': "+ Stronger batsman added in place of bowler",
            'bowler_replaces_batter': "+ Stronger bowler added in place of batter",
            'batter_upgrade': "+ Upgraded to a better batsman",
            'batter_downgrade': "- Downgraded to a weaker batsman",
            'bowler_upgrade': "+ Upgraded to a better bowler",
            'bowler_downgrade': "- Downgraded to a weaker bowler",
            'allrounder_added': "+ All-rounder adds flexibility",
            'tailender_early': "- Tailender exposed early, collapse risk",
        }
        if change_type in reason_map:
            reasons.append(reason_map[change_type])
        # Quality differential
        quality_diff = 0.0
        if changes.get('player_in') and changes.get('player_out'):
            in_q = self.parser.get_player_quality(changes['player_in'])
            out_q = self.parser.get_player_quality(changes['player_out'])
            quality_diff = (in_q - out_q) * 0.3
            if quality_diff > 0.05:
                reasons.append(f"+ Player quality upgrade ({changes['player_in']} rated higher)")
            elif quality_diff < -0.05:
                reasons.append(f"- Player quality downgrade ({changes['player_out']} was stronger)")
        # Phase amplifier
        phase_amp = 0.0
        overs = scenario.get('overs', 0)
        if overs >= 16:
            phase_amp = +0.10 if base_impact > 0 else -0.05 if base_impact < 0 else 0.0
            if phase_amp != 0: reasons.append("+ Death overs phase amplifies advantage")
        elif overs <= 6:
            phase_amp = -0.10 if base_impact < 0 else +0.05 if base_impact > 0 else 0.0
            if phase_amp != 0: reasons.append("+ Powerplay phase amplifies advantage")
        # Situation context
        target = original_state.get('target')
        if target:
            score = original_state.get('score', 0)
            balls_rem = original_state.get('balls_remaining', 120)
            if balls_rem > 0:
                rrr = ((target - score) / balls_rem) * 6
                if rrr < 8: reasons.append(f"+ Required RR manageable ({rrr:.1f} RPO)")
                elif rrr > 12: reasons.append(f"- Required RR very high ({rrr:.1f} RPO)")
                else: reasons.append(f"~ Required RR moderate ({rrr:.1f} RPO)")
        impact_score = max(-1.0, min(1.0, base_impact + quality_diff + phase_amp))
        return impact_score, reasons

    def compute_impact_adjustment(self, impact_score):
        adj = np.ones(len(self.OUTCOME_KEYS))
        if impact_score > 0:
            adj[0] *= (1.0 - impact_score * 0.25)   # Dots ↓
            adj[1] *= (1.0 - impact_score * 0.05)   # Singles ↓
            adj[2] *= (1.0 + impact_score * 0.10)   # Doubles ↑
            adj[4] *= (1.0 + impact_score * 0.30)   # Fours ↑
            adj[5] *= (1.0 + impact_score * 0.35)   # Sixes ↑
            adj[6] *= (1.0 - impact_score * 0.20)   # Wickets ↓
        elif impact_score < 0:
            a = abs(impact_score)
            adj[0] *= (1.0 + a * 0.25); adj[1] *= (1.0 + a * 0.05)
            adj[2] *= (1.0 - a * 0.08); adj[4] *= (1.0 - a * 0.25)
            adj[5] *= (1.0 - a * 0.30); adj[6] *= (1.0 + a * 0.30)
        return adj

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
    
    # Advanced: Matchup Matrix (Direct Head-to-Head)
    matchup_counts = df_legal.groupby(['striker', 'bowler', 'outcome']).size().unstack(fill_value=0)
    matchup_profiles = defaultdict(lambda: defaultdict(dict))
    for (striker, bowler), row in matchup_counts.iterrows():
        total = row.sum()
        if total > 0:
            probs = (row + 1) / (total + len(legal_outcomes)) # Laplace smoothing
        else:
            probs = pd.Series([1.0 / len(legal_outcomes)] * len(legal_outcomes), index=legal_outcomes)
        matchup_profiles[striker][bowler] = probs.to_dict()
        matchup_profiles[striker][bowler]['_balls_recorded'] = int(total)

    # Advanced: Venue Profile Mapping
    venue_profiles = defaultdict(dict)
    if 'venue' in df_legal.columns:
        venue_counts = df_legal.groupby(['venue', 'outcome']).size().unstack(fill_value=0)
        for venue in venue_counts.index:
            row = venue_counts.loc[venue]
            total = row.sum()
            if total > 0:
                probs = row / total
            else:
                probs = pd.Series([1.0 / len(legal_outcomes)] * len(legal_outcomes), index=legal_outcomes)
            venue_profiles[venue] = probs.to_dict()
            venue_profiles[venue]['_balls_recorded'] = int(total)
            
    print("✅ Milestone 2 Complete — Optimized & Fast")
    
    return {
        "bowler_discipline": bowler_discipline_profiles,
        "batting_profiles": batting_profiles,
        "bowling_outcomes": bowling_outcome_profiles,
        "matchup_profiles": matchup_profiles,
        "venue_profiles": venue_profiles,
        "league_delivery_priors": global_delivery_probs.to_dict('index'),
        "league_outcome_priors": global_outcome_probs.to_dict('index')
    }

# ==========================================================
# 🏁 MILESTONE 3 — Ball Probability Engine
# ==========================================================
class BallProbabilityEngine:
    def __init__(self, profiles, situation_engine=None, impact_analyzer=None):
        self.discipline_profiles = profiles.get("bowler_discipline", {})
        self.batting_profiles = profiles.get("batting_profiles", {})
        self.bowling_outcomes = profiles.get("bowling_outcomes", {})
        self.matchup_profiles = profiles.get("matchup_profiles", {})
        self.venue_profiles = profiles.get("venue_profiles", {})
        self.league_delivery = profiles.get("league_delivery_priors", {})
        self.league_outcome = profiles.get("league_outcome_priors", {})
        self.discipline_keys = ['legal', 'wide', 'no_ball']
        self.outcome_keys = ['0', '1', '2', '3', '4', '6', 'W']
        self.situation_engine = situation_engine or SituationAwarenessEngine()
        self.impact_analyzer = impact_analyzer
        self.current_wickets = 0

    def get_discipline_probs(self, bowler, phase):
        probs_dict = self.discipline_profiles.get(bowler, {}).get(phase) or self.league_delivery.get(phase, {})
        prob_array = np.array([probs_dict.get(k, 0.0) for k in self.discipline_keys])
        if prob_array.sum() == 0: prob_array = np.ones_like(prob_array)
        return self.discipline_keys, prob_array / prob_array.sum()

    def _to_array(self, source_dict):
        """Convert a profile dict to numpy array of outcome probabilities."""
        arr = np.array([source_dict.get(k, 0.0) for k in self.outcome_keys])
        total = arr.sum()
        return arr / total if total > 0 else np.ones(len(self.outcome_keys)) / len(self.outcome_keys)

    def _compute_blended_probs(self, striker, bowler, phase, venue=None, form_mults=None):
        """
        Weighted stat blending with dynamic redistribution.
        Default weights: 30% career, 20% venue, 15% matchup, 15% phase, 20% form.
        Missing sources get their weight redistributed to present sources.
        """
        sources, weights = {}, {}

        # 1. Overall career blend (always available via league priors)
        bat_dict = self.batting_profiles.get(striker, {}).get(phase) or self.league_outcome.get(phase, {})
        bowl_dict = self.bowling_outcomes.get(bowler, {}).get(phase) or self.league_outcome.get(phase, {})
        sources['overall'] = self._to_array(bat_dict) * 0.55 + self._to_array(bowl_dict) * 0.45
        weights['overall'] = 0.30

        # 2. Venue-specific
        if venue and venue in self.venue_profiles:
            sources['venue'] = self._to_array(self.venue_profiles[venue])
            weights['venue'] = 0.20

        # 3. Head-to-head matchup
        matchup_dict = self.matchup_profiles.get(striker, {}).get(bowler, {})
        if matchup_dict and matchup_dict.get('_balls_recorded', 0) > 10:
            sources['matchup'] = self._to_array(matchup_dict)
            weights['matchup'] = 0.15

        # 4. Phase-specific (dedicated weight for players with enough phase data)
        phase_bat = self.batting_profiles.get(striker, {}).get(phase)
        phase_bowl = self.bowling_outcomes.get(bowler, {}).get(phase)
        if phase_bat and phase_bat.get('_balls_recorded', 0) > 15:
            phase_arr = self._to_array(phase_bat)
            if phase_bowl and phase_bowl.get('_balls_recorded', 0) > 15:
                phase_arr = phase_arr * 0.55 + self._to_array(phase_bowl) * 0.45
            sources['phase'] = phase_arr
            weights['phase'] = 0.15

        # 5. Recent form adjustment
        if form_mults:
            bat_form = form_mults.get(striker, 1.0)
            bowl_form = form_mults.get(bowler, 1.0)
            form_arr = sources['overall'].copy()
            for idx, key in enumerate(self.outcome_keys):
                if key in ['4', '6']:
                    form_arr[idx] *= bat_form * (2.0 - bowl_form)
                elif key == 'W':
                    form_arr[idx] *= bowl_form * (2.0 - bat_form)
            form_arr = form_arr / max(form_arr.sum(), 1e-9)
            sources['form'] = form_arr
            weights['form'] = 0.20

        # Dynamic weight redistribution — normalize to sum=1.0
        total_w = sum(weights.values())
        if total_w <= 0:
            return np.ones(len(self.outcome_keys)) / len(self.outcome_keys)

        final = np.zeros(len(self.outcome_keys))
        for key, w in weights.items():
            final += (w / total_w) * sources[key]

        total = final.sum()
        return final / total if total > 0 else np.ones(len(self.outcome_keys)) / len(self.outcome_keys)

    def get_legal_outcome_probs(self, striker, bowler, phase, match_state=None,
                                 venue=None, form_mults=None, impact_score=0.0,
                                 aggression_factor=1.0):
        """
        Compute final outcome probabilities:
        base_prob (Step 2) × situation_adj (Step 3) × impact_adj (Step 4)
        """
        # Step 2: Weighted blended base probabilities
        blended = self._compute_blended_probs(striker, bowler, phase, venue, form_mults)

        # Step 3: Situation awareness adjustments
        if match_state:
            situation_adj = self.situation_engine.get_adjustments(match_state)
            blended = blended * situation_adj

        # Step 4: Scenario impact adjustments
        if impact_score != 0.0 and self.impact_analyzer:
            impact_adj = self.impact_analyzer.compute_impact_adjustment(impact_score)
            blended = blended * impact_adj

        # Aggression constraints (backward compat for simulator loop)
        if aggression_factor > 1.0:
            for idx, key in enumerate(self.outcome_keys):
                if key in ['4', '6']: blended[idx] *= aggression_factor
                if key == 'W': blended[idx] *= (1.0 + ((aggression_factor - 1.0) * 0.8))
        elif aggression_factor < 1.0:
            for idx, key in enumerate(self.outcome_keys):
                if key in ['4', '6']: blended[idx] *= aggression_factor
                if key == 'W': blended[idx] *= aggression_factor

        # Low-data penalty
        bat_dict = self.batting_profiles.get(striker, {}).get(phase, {})
        if bat_dict.get('_balls_recorded', 999) < 30:
            blended[self.outcome_keys.index('0')] *= 1.05
            blended[self.outcome_keys.index('4')] *= 0.90
            blended[self.outcome_keys.index('6')] *= 0.85
            blended[self.outcome_keys.index('W')] *= 1.05

        # High-wicket collapse penalty
        wickets = self.current_wickets
        if match_state:
            wickets = match_state.get('wickets', wickets)
        if wickets >= 7:
            blended[self.outcome_keys.index('4')] *= 0.80
            blended[self.outcome_keys.index('6')] *= 0.65
            blended[self.outcome_keys.index('0')] *= 1.20
            blended[self.outcome_keys.index('W')] *= 1.30

        if blended.sum() <= 1e-9: blended = np.ones_like(blended)
        return self.outcome_keys, blended / blended.sum()

    def simulate_delivery(self, striker, bowler, phase, aggression_factor=1.0,
                          venue=None, form_mults=None, match_state=None,
                          impact_score=0.0, temperature=0.7):
        """
        Simulate a single delivery with temperature-controlled randomness.
        temperature=0.5 → conservative, 0.7 → realistic, 1.0+ → dramatic.
        """
        d_keys, d_probs = self.get_discipline_probs(bowler, phase)
        delivery_type = str(np.random.choice(d_keys, p=d_probs))

        if delivery_type != 'legal': return delivery_type

        o_keys, o_probs = self.get_legal_outcome_probs(
            striker, bowler, phase, match_state=match_state,
            venue=venue, form_mults=form_mults,
            impact_score=impact_score, aggression_factor=aggression_factor
        )
        if np.isnan(o_probs).any() or o_probs.sum() == 0:
            o_probs = np.ones_like(o_probs) / len(o_probs)

        # Temperature scaling
        if temperature != 1.0 and temperature > 0:
            o_probs = o_probs ** (1.0 / temperature)
            o_probs = o_probs / o_probs.sum()

        return str(np.random.choice(o_keys, p=o_probs))

    def simulate_most_probable_delivery(self, striker, bowler, phase, aggression_factor=1.0,
                                        venue=None, form_mults=None, match_state=None, impact_score=0.0):
        d_keys, d_probs = self.get_discipline_probs(bowler, phase)
        delivery_type = d_keys[np.argmax(d_probs)]
        if delivery_type != 'legal': return delivery_type

        o_keys, o_probs = self.get_legal_outcome_probs(
            striker, bowler, phase, match_state=match_state,
            venue=venue, form_mults=form_mults,
            impact_score=impact_score, aggression_factor=aggression_factor
        )
        return o_keys[np.argmax(o_probs)]

# ==========================================================
# 🏁 MILESTONE 4 — Nonlinear Simulator & Monte Carlo
# ==========================================================
class SingleMatchSimulator:
    def __init__(self, probability_engine):
        self.engine = probability_engine

    def simulate_fast(self, initial_state, batting_lineup=None, bowling_plan=None,
                      impact_score=0.0, temperature=0.7):
        score, wickets, _ = self._run_simulation_loop(
            initial_state, batting_lineup, bowling_plan,
            detailed=False, impact_score=impact_score, temperature=temperature
        )
        return score, wickets

    def simulate_detailed(self, initial_state, batting_lineup=None, bowling_plan=None,
                          impact_score=0.0, temperature=0.7):
        return self._run_simulation_loop(
            initial_state, batting_lineup, bowling_plan,
            detailed=True, impact_score=impact_score, temperature=temperature
        )

    def _run_simulation_loop(self, initial_state, batting_lineup, bowling_plan,
                              detailed, impact_score=0.0, temperature=0.7):
        state = initial_state.copy()
        active_batters = batting_lineup.copy() if batting_lineup else []
        active_bowlers = bowling_plan.copy() if bowling_plan else []

        match_log = []
        state['is_free_hit'] = False

        last_6_runs, striker_balls, striker_confidence, recent_wickets, dot_streak = [], 0, 1.0, [], 0
        situation_engine = self.engine.situation_engine

        while state['balls_remaining'] > 0 and state['wickets'] < 10:
            if state.get('target') and state['score'] >= state['target']: break

            overs_bowled = state['legal_balls_bowled'] / 6
            venue = state.get('venue')
            form_mults = state.get('form_multipliers', {})

            # Situation-driven aggression (replaces inline RRR zones)
            aggression = situation_engine.get_aggression_factor(state)

            # Momentum
            if len(last_6_runs) >= 6:
                aggression *= (1 + np.tanh((sum(last_6_runs[-6:]) - 6) / 6) * 0.15)

            # Collapse Model
            if state['wickets'] >= 7 or len(recent_wickets) >= 3:
                striker_confidence *= 0.85
                aggression *= 0.90

            aggression *= (1 + np.log1p(striker_balls) * 0.04) * striker_confidence
            if overs_bowled >= 15: aggression *= 1.18

            aggression = max(0.7, min(aggression * np.random.normal(1.0, 0.07), 2.2))
            self.engine.current_wickets = state['wickets']

            # Build match_state dict for the probability engine
            match_state = {
                'score': state['score'], 'wickets': state['wickets'],
                'balls_remaining': state['balls_remaining'],
                'legal_balls_bowled': state['legal_balls_bowled'],
                'target': state.get('target')
            }

            outcome = self.engine.simulate_delivery(
                striker=state['striker'], bowler=state['current_bowler'],
                phase=state['phase'], aggression_factor=aggression,
                venue=venue, form_mults=form_mults,
                match_state=match_state, impact_score=impact_score,
                temperature=temperature
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
                    "outcome": outcome, "aggression": round(aggression, 2),
                    "confidence": round(striker_confidence, 2)
                })

        return state['score'], state['wickets'], match_log

    def simulate_most_probable(self, initial_state, batting_lineup=None, bowling_plan=None,
                                impact_score=0.0):
      state = initial_state.copy()
      active_batters = batting_lineup.copy() if batting_lineup else []
      active_bowlers = bowling_plan.copy() if bowling_plan else []
      match_log = []

      while state['balls_remaining'] > 0 and state['wickets'] < 10:
          if state.get('target') and state['score'] >= state['target']: break

          venue = state.get('venue')
          form_mults = state.get('form_multipliers', {})
          match_state = {
              'score': state['score'], 'wickets': state['wickets'],
              'balls_remaining': state['balls_remaining'],
              'legal_balls_bowled': state['legal_balls_bowled'],
              'target': state.get('target')
          }

          outcome = self.engine.simulate_most_probable_delivery(
              striker=state['striker'], bowler=state['current_bowler'],
              phase=state['phase'], aggression_factor=1.0,
              venue=venue, form_mults=form_mults,
              match_state=match_state, impact_score=impact_score
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
    def __init__(self, simulator, num_simulations=500):
        self.simulator = simulator
        self.num_simulations = num_simulations

    def run_what_if_scenario(self, initial_state, batting_lineup, bowling_plan,
                              impact_score=0.0, temperature=0.7,
                              original_win_prob=None):
        """
        Run multi-simulation and return rich analysis:
        win probability, score distribution, best/worst case, confidence.
        """
        scores, wins = [], 0
        target = initial_state.get("target")

        for _ in range(self.num_simulations):
            score, _ = self.simulator.simulate_fast(
                initial_state, batting_lineup, bowling_plan,
                impact_score=impact_score, temperature=temperature
            )
            scores.append(score)
            if target and score >= target: wins += 1

        scores_arr = np.array(scores)
        win_prob = round(float((wins / self.num_simulations) * 100), 2) if target else None

        # Score distribution analysis
        median_score = round(float(np.median(scores_arr)), 1)
        mean_score = round(float(np.mean(scores_arr)), 1)
        std_dev = round(float(np.std(scores_arr)), 2)
        best_case = int(np.percentile(scores_arr, 95))
        worst_case = int(np.percentile(scores_arr, 5))

        # Most likely score range (mode bucket, 5-run bins)
        bins = np.arange(worst_case, best_case + 6, 5)
        if len(bins) >= 2:
            hist, edges = np.histogram(scores_arr, bins=bins)
            peak_idx = np.argmax(hist)
            most_likely_range = f"{int(edges[peak_idx])}-{int(edges[peak_idx + 1])}"
        else:
            most_likely_range = f"{median_score - 5}-{median_score + 5}"

        # Win probability change
        win_prob_change = None
        if win_prob is not None and original_win_prob is not None:
            win_prob_change = round(win_prob - original_win_prob, 2)

        # Confidence assessment based on data quality
        confidence = "high" if self.num_simulations >= 400 else "medium" if self.num_simulations >= 100 else "low"

        # Impact label
        impact_label = "Neutral"
        if impact_score > 0.3: impact_label = "Strong batting advantage"
        elif impact_score > 0.1: impact_label = "Moderate batting advantage"
        elif impact_score > 0: impact_label = "Slight batting advantage"
        elif impact_score < -0.3: impact_label = "Strong bowling advantage"
        elif impact_score < -0.1: impact_label = "Moderate bowling advantage"
        elif impact_score < 0: impact_label = "Slight bowling advantage"

        return {
            # Core
            "win_probability": win_prob,
            "win_probability_change": win_prob_change,
            # Score distribution
            "projected_median_score": median_score,
            "projected_mean_score": mean_score,
            "std_dev": std_dev,
            "best_case_score": best_case,
            "worst_case_score": worst_case,
            "most_likely_score_range": most_likely_range,
            # Impact analysis
            "impact_score": round(impact_score, 3),
            "impact_label": impact_label,
            # Match outcomes
            "outcomes": {
                "win": win_prob if win_prob else None,
                "lose": round(100 - win_prob, 2) if win_prob else None
            },
            # Meta
            "confidence": confidence,
            "simulations_run": self.num_simulations,
            "temperature": temperature
        }

class WhatIfEngine:
    def __init__(self, df_clean, raw_df, match_df, simulator, mc_engine,
                 scenario_parser=None, impact_analyzer=None):
        self.df_clean = df_clean
        self.raw_df = raw_df
        self.match_df = match_df
        self.simulator = simulator
        self.mc_engine = mc_engine
        self.scenario_parser = scenario_parser
        self.impact_analyzer = impact_analyzer

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

    def _prepare_context(self, modified_state, batting_lineup, bowling_plan):
        """Hydrate state with venue, form multipliers."""
        innings_df = self.df_clean[
            (self.df_clean['match_id'] == modified_state['match_id']) &
            (self.df_clean['innings'] == modified_state['innings'])
        ]
        active_players = set(
            [modified_state['striker'], modified_state['non_striker'],
             modified_state['current_bowler']] + batting_lineup + bowling_plan
        )
        form_multipliers = extract_recent_form(
            self.raw_df, modified_state['match_id'], active_players, n_balls=50
        )
        venue = innings_df['venue'].iloc[0] if not innings_df.empty else None
        modified_state['venue'] = venue
        modified_state['form_multipliers'] = form_multipliers
        return modified_state

    def simulate_counterfactual(self, original_state, modified_state=None,
                                 modification=None, temperature=0.7):
        """
        Full orchestration:
        1. Parse scenario → classify change type
        2. Analyze impact → compute impact_score
        3. Run Monte Carlo with bias
        4. Return rich results with reasons
        """
        # If called in legacy mode (single arg), use modified_state as the state
        if modified_state is None:
            modified_state = original_state

        # Build batting/bowling plans
        batting_lineup = generate_remaining_batting_lineup(
            self.raw_df, self.match_df, modified_state
        )
        innings_df = self.df_clean[
            (self.df_clean['match_id'] == modified_state['match_id']) &
            (self.df_clean['innings'] == modified_state['innings'])
        ]
        all_bowlers = innings_df['bowler'].unique().tolist()
        bowling_plan = [all_bowlers[i % max(1, len(all_bowlers))]
                        for i in range(modified_state['balls_remaining'] // 6)]

        # Hydrate context
        modified_state = self._prepare_context(modified_state, batting_lineup, bowling_plan)

        # Step 1 & 4: Parse scenario and analyze impact
        impact_score = 0.0
        scenario_reasons = []

        if modification and self.scenario_parser and self.impact_analyzer:
            scenario = self.scenario_parser.parse(original_state, modification)
            impact_score, scenario_reasons = self.impact_analyzer.analyze(
                scenario, original_state
            )

        # Step 5-7: Run Monte Carlo with impact bias
        # First get baseline (no impact) for comparison
        baseline_result = None
        if impact_score != 0.0:
            baseline_result = self.mc_engine.run_what_if_scenario(
                modified_state, batting_lineup, bowling_plan,
                impact_score=0.0, temperature=temperature
            )

        original_win_prob = baseline_result['win_probability'] if baseline_result else None

        mc_result = self.mc_engine.run_what_if_scenario(
            modified_state, batting_lineup, bowling_plan,
            impact_score=impact_score, temperature=temperature,
            original_win_prob=original_win_prob
        )

        # Attach scenario analysis
        mc_result['scenario_reason'] = scenario_reasons

        # Single detailed simulation for the UI
        final_score, final_wickets = self.simulator.simulate_fast(
            modified_state, batting_lineup, bowling_plan,
            impact_score=impact_score, temperature=temperature
        )

        return final_score, final_wickets, mc_result

