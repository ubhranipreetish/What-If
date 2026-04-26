"""
Data Preprocessor — IPL Ball-by-Ball Schema Transformer
========================================================
Extracts 2024-2025 season data from IPL_ball_by_ball_2025.csv (new schema),
transforms it to match the old IPL_ball_by_ball_updated.csv schema, and
appends it to create a unified dataset.

Usage:
    python data_preprocessor.py
"""

import pandas as pd
import numpy as np
import os
import sys

# ──────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────
OLD_CSV = "IPL_ball_by_ball_updated.csv"
NEW_CSV = "IPL_ball_by_ball_2025.csv"
OUTPUT_CSV = "IPL_ball_by_ball_updated.csv"  # Overwrite the old one with merged data
BACKUP_CSV = "IPL_ball_by_ball_updated_backup.csv"

# Seasons in the new CSV that are NOT in the old CSV
NEW_SEASONS = ['2024', '2025']

# Expected output columns (must match old schema exactly)
OUTPUT_COLUMNS = [
    'match_id', 'season', 'start_date', 'venue', 'innings', 'ball',
    'batting_team', 'bowling_team', 'striker', 'non_striker', 'bowler',
    'runs_off_bat', 'extras', 'wides', 'noballs', 'byes', 'legbyes',
    'penalty', 'wicket_type', 'player_dismissed',
    'other_wicket_type', 'other_player_dismissed'
]


def normalize_season(season_str):
    """
    Convert new season format to old integer format.
    '2007/08' → 2008, '2009/10' → 2010, '2024' → 2024, etc.
    """
    s = str(season_str).strip()
    if '/' in s:
        # Format like '2007/08' or '2020/21'
        parts = s.split('/')
        base_year = int(parts[0])
        suffix = int(parts[1])
        if suffix < 100:
            return base_year + 1 if suffix > int(str(base_year)[-2:]) else base_year
        return suffix
    return int(s)


def parse_extras(extra_type_series, runs_extras_series):
    """
    Parse the 'extra_type' string column into individual numeric columns.
    
    New data encodes extras as strings like:
      'wides', 'noballs', 'legbyes', 'byes', 'penalty',
      'penalty, wides', 'byes, noballs', 'legbyes, noballs'
    
    We need to produce separate numeric columns: wides, noballs, byes, legbyes, penalty
    """
    # Reset indices to ensure alignment — input may have non-contiguous indices
    extra_type = extra_type_series.reset_index(drop=True).fillna('')
    runs_extras = runs_extras_series.reset_index(drop=True).fillna(0).astype(float)
    
    n = len(extra_type)
    
    # Detect each extra type from the string
    has_wides = extra_type.str.contains('wides', case=False, na=False)
    has_noballs = extra_type.str.contains('noballs', case=False, na=False)
    has_byes = extra_type.str.contains('byes', case=False, na=False) & ~extra_type.str.contains('legbyes', case=False, na=False)
    has_legbyes = extra_type.str.contains('legbyes', case=False, na=False)
    has_penalty = extra_type.str.contains('penalty', case=False, na=False)
    
    # Initialize all as NaN (matching old data convention — NaN means "no extra of this type")
    wides = np.full(n, np.nan)
    noballs_arr = np.full(n, np.nan)
    byes = np.full(n, np.nan)
    legbyes_arr = np.full(n, np.nan)
    penalty_arr = np.full(n, np.nan)
    
    re = runs_extras.values  # numpy array for fast access
    
    # Simple wides (no noball): all extra runs are wides
    mask_wide_only = has_wides.values & ~has_noballs.values
    wides[mask_wide_only] = re[mask_wide_only]
    
    # Simple noballs (no wide): all extra runs are noballs
    mask_nb_only = has_noballs.values & ~has_wides.values & ~has_byes.values & ~has_legbyes.values
    noballs_arr[mask_nb_only] = re[mask_nb_only]
    
    # Combined: wides + penalty → wides get credit
    mask_wide_penalty = has_wides.values & has_penalty.values
    wides[mask_wide_penalty] = re[mask_wide_penalty]
    
    # Combined: noballs + byes → 1 run for noball, rest for byes
    mask_nb_byes = has_noballs.values & has_byes.values
    noballs_arr[mask_nb_byes] = 1
    byes[mask_nb_byes] = np.maximum(re[mask_nb_byes] - 1, 0)
    
    # Combined: noballs + legbyes → 1 run for noball, rest for legbyes
    mask_nb_lb = has_noballs.values & has_legbyes.values
    noballs_arr[mask_nb_lb] = 1
    legbyes_arr[mask_nb_lb] = np.maximum(re[mask_nb_lb] - 1, 0)
    
    # Simple byes (no noball)
    mask_byes_only = has_byes.values & ~has_noballs.values
    byes[mask_byes_only] = re[mask_byes_only]
    
    # Simple legbyes (no noball)
    mask_lb_only = has_legbyes.values & ~has_noballs.values
    legbyes_arr[mask_lb_only] = re[mask_lb_only]
    
    # Simple penalty (no wide/noball)
    mask_pen_only = has_penalty.values & ~has_wides.values & ~has_noballs.values
    penalty_arr[mask_pen_only] = re[mask_pen_only]
    
    # Ensure minimum 1 for detected wides/noballs that somehow ended up at 0
    wides[(has_wides.values) & np.isnan(wides)] = 1
    noballs_arr[(has_noballs.values) & np.isnan(noballs_arr)] = 1
    
    return (
        pd.Series(wides, dtype=float),
        pd.Series(noballs_arr, dtype=float),
        pd.Series(byes, dtype=float),
        pd.Series(legbyes_arr, dtype=float),
        pd.Series(penalty_arr, dtype=float)
    )


def transform_new_to_old_schema(df_new):
    """
    Transform new CSV columns to match old schema.
    """
    print(f"  📐 Transforming {len(df_new)} rows...")
    
    df = pd.DataFrame()
    
    # Direct mappings
    df['match_id'] = df_new['match_id']
    df['season'] = df_new['season'].apply(normalize_season)
    df['start_date'] = df_new['date']
    df['venue'] = df_new['venue']
    df['innings'] = df_new['innings']
    
    # Ball identifier: new has 'ball_no' as float (e.g., 0.1, 0.2, 1.1)
    # Old format uses 'ball' as float (same format)
    df['ball'] = df_new['ball_no'].astype(float)
    
    # Team names
    df['batting_team'] = df_new['batting_team']
    df['bowling_team'] = df_new['bowling_team']
    
    # Player names: 'batter' → 'striker'
    df['striker'] = df_new['batter']
    df['non_striker'] = df_new['non_striker']
    df['bowler'] = df_new['bowler']
    
    # Runs: 'runs_batter' → 'runs_off_bat'
    df['runs_off_bat'] = df_new['runs_batter'].fillna(0).astype(int)
    
    # Total extras
    df['extras'] = df_new['runs_extras'].fillna(0).astype(int)
    
    # Parse individual extra types from the string column
    wides, noballs, byes, legbyes, penalty = parse_extras(
        df_new['extra_type'], df_new['runs_extras']
    )
    df['wides'] = wides.values
    df['noballs'] = noballs.values
    df['byes'] = byes.values
    df['legbyes'] = legbyes.values
    df['penalty'] = penalty.values
    
    # Wicket info: 'wicket_kind' → 'wicket_type', 'player_out' → 'player_dismissed'
    df['wicket_type'] = df_new['wicket_kind'].values
    df['player_dismissed'] = df_new['player_out'].values
    
    # These columns exist in old data but have no equivalent in new — fill with NaN
    df['other_wicket_type'] = np.nan
    df['other_player_dismissed'] = np.nan
    
    # Ensure column order matches
    df = df[OUTPUT_COLUMNS]
    
    return df


def validate_output(df_old, df_merged):
    """
    Run validation checks on the merged dataset.
    """
    print("\n🔍 Running validation checks...")
    
    errors = []
    
    # 1. Column check
    if list(df_merged.columns) != OUTPUT_COLUMNS:
        errors.append(f"Column mismatch! Expected {OUTPUT_COLUMNS}, got {list(df_merged.columns)}")
    
    # 2. No NaN in critical columns
    critical = ['match_id', 'innings', 'ball', 'striker', 'bowler', 'batting_team', 'bowling_team']
    for col in critical:
        nan_count = df_merged[col].isna().sum()
        if nan_count > 0:
            errors.append(f"Column '{col}' has {nan_count} NaN values")
    
    # 3. Row count increased
    old_count = len(df_old)
    new_count = len(df_merged)
    added = new_count - old_count
    print(f"  📊 Old rows: {old_count:,} → Merged rows: {new_count:,} (+{added:,})")
    
    # 4. Match count
    old_matches = df_old['match_id'].nunique()
    merged_matches = df_merged['match_id'].nunique()
    print(f"  🏏 Old matches: {old_matches} → Merged matches: {merged_matches} (+{merged_matches - old_matches})")
    
    # 5. Season coverage
    seasons = sorted(df_merged['season'].dropna().unique())
    print(f"  📅 Seasons covered: {seasons}")
    
    # 6. Verify 2024-2025 data exists
    s2024 = df_merged[df_merged['season'] == 2024]
    s2025 = df_merged[df_merged['season'] == 2025]
    print(f"  🆕 2024 matches: {s2024['match_id'].nunique()}, rows: {len(s2024):,}")
    print(f"  🆕 2025 matches: {s2025['match_id'].nunique()}, rows: {len(s2025):,}")
    
    if errors:
        print("\n❌ VALIDATION ERRORS:")
        for e in errors:
            print(f"  - {e}")
        return False
    
    print("\n✅ All validation checks passed!")
    return True


def main():
    print("=" * 60)
    print("🏏 IPL Data Preprocessor — Schema Transformer")
    print("=" * 60)
    
    # ── Step 1: Load old data (prefer backup if it exists — backup is the pristine original) ──
    source_csv = BACKUP_CSV if os.path.exists(BACKUP_CSV) else OLD_CSV
    if not os.path.exists(source_csv):
        print(f"❌ Old CSV not found: {source_csv}")
        sys.exit(1)
    
    print(f"\n📂 Loading old dataset: {source_csv}")
    df_old = pd.read_csv(source_csv)
    print(f"  ✓ {len(df_old):,} rows, {df_old['match_id'].nunique()} matches, "
          f"seasons: {sorted(df_old['season'].dropna().unique())}")
    
    # ── Step 2: Load new data ──
    if not os.path.exists(NEW_CSV):
        print(f"❌ New CSV not found: {NEW_CSV}")
        sys.exit(1)
    
    print(f"\n📂 Loading new dataset: {NEW_CSV}")
    df_new_full = pd.read_csv(NEW_CSV, low_memory=False)
    print(f"  ✓ {len(df_new_full):,} rows, {df_new_full['match_id'].nunique()} matches")
    
    # ── Step 3: Filter to only new seasons ──
    print(f"\n🔎 Filtering for new seasons: {NEW_SEASONS}")
    df_new = df_new_full[df_new_full['season'].isin(NEW_SEASONS)].copy()
    print(f"  ✓ Found {len(df_new):,} rows across {df_new['match_id'].nunique()} matches")
    
    if df_new.empty:
        print("⚠️ No new season data found! Nothing to merge.")
        sys.exit(0)
    
    # ── Step 4: Check for duplicate match IDs ──
    old_match_ids = set(df_old['match_id'].unique())
    new_match_ids = set(df_new['match_id'].unique())
    overlap = old_match_ids & new_match_ids
    
    if overlap:
        print(f"  ⚠️ {len(overlap)} overlapping match IDs found — removing from new data to avoid duplicates")
        df_new = df_new[~df_new['match_id'].isin(overlap)]
        print(f"  ✓ After dedup: {len(df_new):,} rows, {df_new['match_id'].nunique()} matches")
    
    if df_new.empty:
        print("✅ All new data already exists in old file. Nothing to do.")
        sys.exit(0)
    
    # ── Step 5: Transform schema ──
    print("\n🔄 Transforming new data to old schema...")
    df_transformed = transform_new_to_old_schema(df_new)
    
    # ── Step 6: Backup old file ──
    print(f"\n💾 Backing up old file → {BACKUP_CSV}")
    df_old.to_csv(BACKUP_CSV, index=False)
    
    # ── Step 7: Merge ──
    print("\n🔗 Merging datasets...")
    df_merged = pd.concat([df_old, df_transformed], ignore_index=True)
    
    # Sort by match_id, innings, ball for clean ordering
    df_merged = df_merged.sort_values(['match_id', 'innings', 'ball']).reset_index(drop=True)
    
    # ── Step 8: Validate ──
    is_valid = validate_output(df_old, df_merged)
    
    if not is_valid:
        print("\n⚠️ Validation failed! Output saved but please review the errors.")
    
    # ── Step 9: Save ──
    print(f"\n💾 Saving merged dataset → {OUTPUT_CSV}")
    df_merged.to_csv(OUTPUT_CSV, index=False)
    print(f"  ✓ File size: {os.path.getsize(OUTPUT_CSV) / (1024*1024):.1f} MB")
    
    print("\n" + "=" * 60)
    print("🎉 DONE! Dataset now covers 2008-2025 IPL seasons.")
    print("=" * 60)


if __name__ == "__main__":
    main()
