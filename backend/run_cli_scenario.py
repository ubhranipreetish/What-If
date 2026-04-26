import pandas as pd
from simulation_engine import (
    clean_and_prepare_data,
    derive_player_profiles_v5,
    BallProbabilityEngine,
    SingleMatchSimulator,
    MonteCarloEngine,
    WhatIfEngine,
    generate_remaining_batting_lineup,
    extract_recent_form,
    ScenarioParser,
    SituationAwarenessEngine,
    ScenarioImpactAnalyzer
)

def run_scenario():
    print("=" * 60)
    print("🏏 What-If Engine — Scenario-Biased CLI Test")
    print("=" * 60)

    print("\nLoading data...")
    data_path = "IPL_ball_by_ball_updated.csv"
    match_path = "ipl.csv"
    
    raw_df = pd.read_csv(data_path)
    match_df = pd.read_csv(match_path)
    
    # Preprocess and build profiles
    print("Building player profiles from data...")
    df_clean = clean_and_prepare_data(data_path)
    profiles = derive_player_profiles_v5(raw_df, prior_weight=25)
    
    # Initialize the scenario intelligence layer
    print("Initializing Scenario Intelligence Layer...")
    scenario_parser = ScenarioParser(profiles)
    situation_engine = SituationAwarenessEngine()
    impact_analyzer = ScenarioImpactAnalyzer(scenario_parser)
    
    # Initialize engine modules with intelligence
    print("Initializing Simulation Engine...")
    prob_engine = BallProbabilityEngine(profiles, situation_engine, impact_analyzer)
    simulator = SingleMatchSimulator(prob_engine)
    mc_engine = MonteCarloEngine(simulator, num_simulations=500)
    engine = WhatIfEngine(
        df_clean, raw_df, match_df, simulator, mc_engine,
        scenario_parser=scenario_parser, impact_analyzer=impact_analyzer
    )
    print("Engine is ready!\n")
    
    # ==========================================
    # DEFINE YOUR SCENARIO HERE
    # ==========================================
    match_id = 733973 
    innings = 2
    over = 6 
    ball_no = 1
    
    print(f"Fetching ball state for Match {match_id}, Innings {innings}, Over {over}.{ball_no}...")
    try:
        # 1. Get current baseline state
        state, actual_outcome = engine.get_ball_state(match_id, innings, over, ball_no)
        
        print("\n📌 Initial State:")
        for k, v in state.items():
            print(f"   {k}: {v}")
        
        # 2. Get Real Match Result
        print("\n" + "=" * 60)
        print("📊 REAL MATCH RESULT")
        print("=" * 60)
        match_balls = df_clean[(df_clean['match_id'] == match_id) & (df_clean['innings'] == innings)]
        if not match_balls.empty:
            actual_final_score = int(match_balls['cumulative_score'].max())
            actual_final_wickets = int(match_balls['cumulative_wickets'].max())
            print(f"   Actual Final Score: {actual_final_score} / {actual_final_wickets}")
        
        # 3. Baseline simulation (no modification)
        print("\n" + "=" * 60)
        print("🔵 BASELINE SIMULATION (No Changes)")
        print("=" * 60)
        baseline_score, baseline_wickets, baseline_mc = engine.simulate_counterfactual(
            original_state=state, modified_state=state.copy(),
            modification={}, temperature=0.7
        )
        print(f"   Projected Median Score: {baseline_mc['projected_median_score']}")
        print(f"   Win Probability: {baseline_mc['win_probability']}%")
        print(f"   Score Range: {baseline_mc['worst_case_score']} — {baseline_mc['best_case_score']}")
        print(f"   Most Likely: {baseline_mc['most_likely_score_range']}")
        
        # 4. SCENARIO: Player swap — replace striker with a bowler/batter
        print("\n" + "=" * 60)
        print("🔴 SCENARIO: Player Swap")
        print("=" * 60)
        
        # Find batters and bowlers from the match for a swap scenario
        batters_in_match = match_balls['striker'].unique().tolist()
        bowlers_in_match = match_balls[match_balls['innings'] == innings]['bowler'].unique().tolist() if not match_balls.empty else []
        
        # Pick a bowler to replace the striker (batter → bowler swap)
        current_striker = state['striker']
        swap_player = None
        
        # Try to find a bowler from the opposing team to swap in
        for bowler in bowlers_in_match:
            if bowler != current_striker:
                swap_player = bowler
                break
        
        if swap_player is None:
            swap_player = batters_in_match[0] if batters_in_match else current_striker
        
        print(f"   Current Striker: {current_striker}")
        print(f"   Swapping IN: {swap_player}")
        
        # Classify the players
        striker_role = scenario_parser.classify_player_role(current_striker)
        swap_role = scenario_parser.classify_player_role(swap_player)
        print(f"   {current_striker} is classified as: {striker_role}")
        print(f"   {swap_player} is classified as: {swap_role}")
        
        modification = {
            "new_striker": swap_player,
            "new_runs": None,
            "force_wicket": False,
            "new_bowler": None
        }
        
        # Parse and analyze scenario
        scenario = scenario_parser.parse(state, modification)
        impact_score, reasons = impact_analyzer.analyze(scenario, state)
        
        print(f"\n   📋 Change Type: {scenario['changes']['change_type']}")
        print(f"   🎯 Impact Score: {impact_score:+.3f}")
        print(f"   📝 Reasons:")
        for r in reasons:
            print(f"      {r}")
        
        # Apply modification and simulate
        modified_state = engine.apply_modification(state, modification)
        
        whatif_score, whatif_wickets, whatif_mc = engine.simulate_counterfactual(
            original_state=state,
            modified_state=modified_state,
            modification=modification,
            temperature=0.7
        )
        
        print(f"\n   🏏 RESULTS (after {whatif_mc['simulations_run']} simulations):")
        print(f"   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"   Win Probability:    {whatif_mc['win_probability']}%")
        if whatif_mc.get('win_probability_change') is not None:
            change = whatif_mc['win_probability_change']
            arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
            print(f"   Win Prob Change:    {change:+.2f}% {arrow}")
        print(f"   Impact Label:       {whatif_mc['impact_label']}")
        print(f"   Projected Median:   {whatif_mc['projected_median_score']}")
        print(f"   Score Range:        {whatif_mc['worst_case_score']} — {whatif_mc['best_case_score']}")
        print(f"   Most Likely:        {whatif_mc['most_likely_score_range']}")
        print(f"   Std Dev:            {whatif_mc['std_dev']}")
        print(f"   Confidence:         {whatif_mc['confidence']}")
        print(f"   Temperature:        {whatif_mc['temperature']}")
        
        if whatif_mc.get('scenario_reason'):
            print(f"\n   💡 Scenario Analysis:")
            for r in whatif_mc['scenario_reason']:
                print(f"      {r}")
        
        # 5. Comparison Summary
        print("\n" + "=" * 60)
        print("📊 COMPARISON: Baseline vs Scenario")
        print("=" * 60)
        print(f"   {'Metric':<25} {'Baseline':>12} {'Scenario':>12} {'Delta':>10}")
        print(f"   {'─' * 25} {'─' * 12} {'─' * 12} {'─' * 10}")
        
        b_win = baseline_mc.get('win_probability', 0) or 0
        s_win = whatif_mc.get('win_probability', 0) or 0
        print(f"   {'Win Probability':<25} {b_win:>11.1f}% {s_win:>11.1f}% {s_win - b_win:>+9.1f}%")
        
        b_med = baseline_mc.get('projected_median_score', 0)
        s_med = whatif_mc.get('projected_median_score', 0)
        print(f"   {'Median Score':<25} {b_med:>12.1f} {s_med:>12.1f} {s_med - b_med:>+10.1f}")
        
        b_best = baseline_mc.get('best_case_score', 0)
        s_best = whatif_mc.get('best_case_score', 0)
        print(f"   {'Best Case (95th %ile)':<25} {b_best:>12} {s_best:>12} {s_best - b_best:>+10}")
        
        b_worst = baseline_mc.get('worst_case_score', 0)
        s_worst = whatif_mc.get('worst_case_score', 0)
        print(f"   {'Worst Case (5th %ile)':<25} {b_worst:>12} {s_worst:>12} {s_worst - b_worst:>+10}")
        
        print("\n" + "=" * 60)
        print("✅ Scenario-Biased Simulation Complete")
        print("=" * 60)
        
    except Exception as e:
        import traceback
        print(f"Error running scenario: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_scenario()
