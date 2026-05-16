# F1 Telemetry Dashboard 🏎️💨

This project is a real-time dashboard for Codemasters' Formula 1 games (F1 23, F1 24, etc.). It captures telemetry data sent by the game via UDP and displays it in a modern, detailed web interface.

## 🚀 Features

- **Live Leaderboard**: Positions for all 22 drivers, lap times, and sectors.
- **Advanced Telemetry**: Speed, RPM, current gear, and throttle/brake input bars.
- **Car Status**: Wing damage, tire wear (0-100%), and temperatures.
- **Energy Management**: ERS battery status and fuel consumption.
- **Multi-device**: Since it runs on your local network, you can open the dashboard on a tablet or mobile device while playing on your Xbox/PC.

---

## 🛠️ Prerequisites

- **Node.js** (v18 or higher)
- **F1 23 or F1 24** installed on Xbox, PlayStation, or PC.
- Both devices (PC running the dashboard and the Game Console/PC) must be on the **same local network**.

---

## 🎮 Game Configuration (Xbox/PS/PC)

For the game to send data to the dashboard, you must configure UDP telemetry:

1. Launch the F1 game and go to **Settings** > **Telemetry Settings**.
2. **UDP Telemetry**: Set to `On`.
3. **UDP Broadcast Mode**: Set to `Off`.
4. **UDP IP Address**: Enter your **PC's local IP address** (e.g., `192.168.1.15`).
   - *Tip (Windows): Find your IP by typing `ipconfig` in the terminal.*
   - *Tip (macOS): Find your IP by typing `ipconfig getifaddr en0` in the terminal, or go to **System Settings > Network**.*
5. **UDP Port**: Set to `20777` (this is the default port our server listens on).
6. **UDP Send Rate**: Recommended `20Hz` or `30Hz` for a balance between smoothness and network load.
7. **UDP Format**: Recommended `2023` or `2024` (the dashboard is compatible with recent formats).

---

## 💻 How to Run the Dashboard

### 1. Installation
Install dependencies in both folders:

```bash
# Install backend
cd server
npm install

# Install frontend
cd ../client
npm install
```

### 2. Start the Server (Backend)
The server will listen for packets from the Xbox and relay them to the browser.

```bash
cd server
npm start
```

### 3. Start the Dashboard (Frontend)
```bash
cd client
npm run dev
```
Open the URL that appears (usually `http://localhost:5173`).

---

## 🧪 Testing without the game (Simulator Mode)

If you don't have the console handy and want to see how the dashboard looks:

1. Make sure the server is running (`cd server && npm start`).
2. In a new terminal, run the simulator:
   ```bash
   cd server
   npm run mock
   ```
3. The dashboard will show mock data for Max Verstappen and other drivers simulating a race.

---

## 🏗️ Architecture

- **Backend (Node.js)**: Uses `f1-telemetry-client` to parse binary UDP data and `socket.io` to send it to the client.
- **Frontend (React + Vite + TS)**: Dashboard built with reactive components and CSS optimized for low latency.
