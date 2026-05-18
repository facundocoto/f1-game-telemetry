# F1 Telemetry Dashboard 🏎️💨

<div align="center">
  <img src="assets/image1.png" width="30%" />
  <img src="assets/image2.png" width="30%" />
  <img src="assets/image3.png" width="30%" />
</div>

This project is a high-performance, real-time telemetry dashboard for Codemasters' Formula 1 games (F1 23, F1 24, F1 25). It captures binary UDP telemetry packets from your PC or Console and broadcasts them via Socket.io to a modern React-based web interface.

## 🚀 Features

- **🏆 Live Standings**: Real-time leaderboard with interval tracking and position changes.
- **⏱️ Advanced Timing & Lap History**:
  - Detailed sector-by-sector breakdown.
  - Visual highlighting: <span style="color: #b131ff">**Purple**</span> for Session Best, <span style="color: #00ff00">**Green**</span> for Personal Best.
- **🛞 Tyre Condition & Thermals**:
  - Real-time wear percentage with dynamic color coding (Green -> Yellow -> Red).
  - Surface temperature monitoring for all four tires.
  - Visual compound identification (Soft, Medium, Hard, Inter, Wet).
- **📊 Performance Analysis**: Live telemetry comparison (Speed, Throttle, Brake) with delta tracking against your best lap or other drivers.
- **🏎️ Engineering HUD**:
  - High-fidelity RPM bar with shift indicators.
  - Brake temperature gauges (Optimal: 400°C - 800°C).
  - Core engine thermal monitoring.
  - G-Force radar and input telemetry (Throttle/Brake).
- **⚡ Energy Management**: ERS deployment modes and battery status, plus precise fuel remaining calculation.

---

## 🛠️ Prerequisites

- **Node.js** (v18 or higher)
- **F1 23, F1 24, or F1 25** installed on Xbox, PlayStation, or PC.
- Both devices (PC running the dashboard and the Game Console/PC) must be on the **same local network**.

---

## 🎮 Game Configuration (Xbox/PS/PC)

For the game to send data to the dashboard, you must configure UDP telemetry:

1. Launch the F1 game and go to **Settings** > **Telemetry Settings**.
2. **UDP Telemetry**: Set to `On`.
3. **UDP Port**: Set to `20777`.
4. **UDP Format**: **Set to `2023`** (Most stable format for third-party tools).
5. **UDP Send Rate**: Recommended `20Hz` or `30Hz`.
6. **UDP IP Address**: Enter your **PC's local IP address** (e.g., `192.168.1.15`).
   - _Tip (Windows): Find your IP by typing `ipconfig` in the terminal._
   - _Tip (macOS): Find your IP by typing `ipconfig getifaddr en0` in the terminal._

---

## 💻 How to Run the Dashboard

### 1. Installation

Install dependencies in all folders (root, client, and server):

```bash
# From the root directory
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Start Everything (Single Command)

Start both the backend and the frontend with one command from the root:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## 🧪 Testing without the game (Simulator Mode)

If you don't have the console handy:

1. Start the main system (`npm run dev`).
2. In a new terminal, run the simulator:
   ```bash
   cd server && npm run mock
   ```
3. The dashboard will show mock data for Max Verstappen and other drivers simulating a race.

---

## 🏗️ Architecture

- **Backend (Node.js)**: Uses `@racehub-io/f1-telemetry-client` to parse UDP data.
- **Frontend (React + Vite + TypeScript)**: Features a high-fidelity F1 TV Broadcast aesthetic with professional telemetry visuals.
- **Communication**: Real-time bi-directional communication via **Socket.io**.
