# 🏏 CounterPlay: The What-If Engine
The **CounterPlay** is an interactive, state-of-the-art predictive cricket simulation platform. It empowers users to explore alternate realities in IPL match history or simulate complete custom matches from scratch.

By pinpointing any turning point in historical IPL matches, overriding the ball's outcome, and invoking a custom simulation engine, users can watch the **butterfly effect** ripple through the rest of the game in real-time.

---

## 🚀 Key Features

### 1. The Time Machine (Match Archives)
* **Historic Matches Browse**: Filter through years of IPL history with responsive, dynamic Season, Team, and Opponent filters.
* **Match Timeline Scrubber**: Select any ball of a real match to see its historical stats and commentary.
* **Override & Simulate**: Change the selected ball's outcome (dot, runs, boundary, wicket, wide, or no-ball) and instantly trigger the predictive engine to simulate the rest of the match.

### 2. The Custom Battle Arena
* **Snake Draft System**: Draft custom squads of IPL legends (22 picks total) with dynamic budget constraints ($M) and role validation (minimum batsmen, wicketkeepers, all-rounders, bowlers).
* **Toss & Strategy**: Flip a coin to determine batting/bowling decisions and organize custom batting and bowling orders.
* **Full Live Sim**: Play back a complete ball-by-ball simulation of custom XIs, complete with dynamically generated live commentary and statistics.

### 3. Real-Time Playback Dashboard
* **Dynamic Team Accents**: Renders batter and bowler metrics with border accents matching their respective franchise color profiles.
* **Innings Tab Selector**: Toggle scorecards between Innings 1 and Innings 2 at any point. If Innings 2 hasn't started yet, it displays the upcoming batting lineup.
* **Compact Commentary**: Live commentary feed is automatically sliced to show the last 10 balls, keeping the workspace clutter-free.
* **Responsive Visuals**: Mobile-floating pick boxes, scrollable dashboard columns, and adaptive layouts make it fully responsive for phones, tablets, and desktops.

---

## 🛠️ Architecture & Tech Stack

### 📂 Backend: FastAPI & Python Simulation Engine
* **FastAPI Server** (`backend/app.py`): Exposes API routes for match archives metadata, rosters, and simulation playback logs.
* **Simulation Engine** (`backend/simulation_engine.py`): A simulator utilizing representative historical trajectories, player stats, and state-machine transitions.
* **Data Prep** (`backend/data_preprocessor.py`): Cleans and indexes ball-by-ball records from IPL datasets (`IPL_ball_by_ball_cleaned.csv`).

### 📂 Frontend: Next.js & Tailwind CSS
* **Routing & Pages**: App router pages for dashboard simulation, Match browsing hub, and the Custom Arena.
* **State Management**: Live React hooks control audio/visual play states, branch simulation triggers, draft index queues, and countdown transitions.
* **Styling**: Tailwind CSS combined with modern CSS glassmorphism, responsive fixed layouts, and smooth animations.

---

## ⚙️ Setup & Installation

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.9 or higher)

### 1. Backend Setup
Create a virtual environment, activate it, and install python dependencies:
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate on Mac/Linux:
source venv/bin/path/activate

# Or on Windows:
venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Application
You can run both the frontend and backend easily from the project root:

* **Start the Python Backend**:
  ```bash
  npm run backend
  ```
  *(Starts the FastAPI server on `http://localhost:8000`)*

* **Start the Next.js Frontend**:
  ```bash
  npm run dev
  ```
  *(Starts the client development server on `http://localhost:3000`)*

Open **[http://localhost:3000](http://localhost:3000)** in your browser to start rewriting history!
