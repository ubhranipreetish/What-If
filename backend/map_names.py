import pandas as pd
import json
import re

df = pd.read_csv('IPL_ball_by_ball_cleaned.csv')
all_players = set(df['striker'].unique()).union(set(df['bowler'].unique()))

def get_sim_name(full_name):
    if full_name in all_players:
        return full_name
        
    parts = full_name.split()
    if len(parts) == 1:
        matches = [p for p in all_players if parts[0] in p]
        return matches[0] if matches else full_name
        
    last_name = parts[-1]
    
    initials = ''.join([p[0] for p in parts[:-1]])
    sim1 = f"{initials} {last_name}"
    if sim1 in all_players:
        return sim1
        
    sim2 = f"{parts[0][0]} {last_name}"
    if sim2 in all_players:
        return sim2
        
    matches = [p for p in all_players if last_name in p]
    if len(matches) == 1:
        return matches[0]
        
    if len(matches) > 1:
        f_matches = [m for m in matches if m.startswith(parts[0][0])]
        if f_matches:
            return f_matches[0]
            
    return full_name

with open('../src/data/arenaPlayers.js', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'name: "' in line:
        name = re.search(r'name: "(.*?)"', line).group(1)
        search_name = name.replace(' (Bowl)', '')
        sim_name = get_sim_name(search_name)
        if sim_name:
            lines[i] = line.replace('role:', f'simName: "{sim_name}", role:')

with open('../src/data/arenaPlayers.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('Updated arenaPlayers.js successfully!')
