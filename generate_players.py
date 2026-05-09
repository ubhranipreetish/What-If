import json

batsmen = [
    "Virat Kohli", "AB de Villiers", "Chris Gayle", "Rohit Sharma", "David Warner", 
    "Suryakumar Yadav", "Shubman Gill", "Kane Williamson", "Steven Smith", "Joe Root",
    "Faf du Plessis", "Shikhar Dhawan", "KL Rahul", "Babar Azam", "Virender Sehwag",
    "Sachin Tendulkar", "Matthew Hayden", "Kevin Pietersen", "Brendon McCullum", "Suresh Raina"
]
wks = [
    "MS Dhoni", "Jos Buttler", "Quinton de Kock", "Rishabh Pant", "Heinrich Klaasen",
    "Nicholas Pooran", "Sanju Samson", "Jonny Bairstow", "Adam Gilchrist", "Kumar Sangakkara"
]
allrounders = [
    "Andre Russell", "Hardik Pandya", "Ravindra Jadeja", "Glenn Maxwell", "Ben Stokes",
    "Shane Watson", "Kieron Pollard", "Shakib Al Hasan", "Marcus Stoinis", "Cameron Green",
    "Dwayne Bravo", "Sunil Narine", "Moeen Ali", "Sam Curran", "Mitchell Marsh",
    "Jacques Kallis", "Yuvraj Singh", "Shahid Afridi", "Imad Wasim", "Liam Livingstone"
]
bowlers = [
    "Jasprit Bumrah", "Lasith Malinga", "Rashid Khan", "Trent Boult", "Jofra Archer",
    "Yuzvendra Chahal", "Kagiso Rabada", "Pat Cummins", "Mitchell Starc", "Anrich Nortje",
    "Mohammed Shami", "Bhuvneshwar Kumar", "Dale Steyn", "Muttiah Muralitharan", "Shane Warne",
    "Sunil Narine", "Shaheen Afridi", "Haris Rauf", "Kuldeep Yadav", "Ravi Ashwin"
]

players = []
pid = 1

for name in batsmen:
    players.append({
        "id": f"p{pid:03d}", "name": name, "role": "Batter", "type": "batter",
        "avgSR": 140, "avg": 35, "cost": 9, "imgColor": "#D4213D"
    })
    pid += 1

for name in wks:
    players.append({
        "id": f"p{pid:03d}", "name": name, "role": "WK-Batter", "type": "wk",
        "avgSR": 145, "avg": 32, "cost": 9, "imgColor": "#FCCA06"
    })
    pid += 1

for name in allrounders:
    players.append({
        "id": f"p{pid:03d}", "name": name, "role": "All-Rounder", "type": "allrounder",
        "avgSR": 145, "avg": 25, "economy": 8.0, "wicketsPerMatch": 1.0, "cost": 9, "imgColor": "#3A225D"
    })
    pid += 1

for name in bowlers:
    players.append({
        "id": f"p{pid:03d}", "name": name, "role": "Bowler", "type": "bowler",
        "economy": 7.5, "wicketsPerMatch": 1.5, "cost": 9, "imgColor": "#004BA0"
    })
    pid += 1

with open("src/data/arenaPlayers.js", "w") as f:
    f.write("export const arenaPlayerPool = \\\n")
    f.write(json.dumps(players, indent=4))
    f.write(";\n")
