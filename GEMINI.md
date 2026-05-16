# F1 Telemetry Dashboard 🏎️💨

## Project Overview
This project is a real-time telemetry dashboard for Codemasters' Formula 1 games (F1 23, F1 24, F1 25). It uses a **Node.js** backend to capture UDP telemetry packets from a console or PC and broadcasts them via **Socket.io** to a **React (TypeScript)** frontend.

### Architecture
- **Server (Backend)**: Located in the `/server` directory. It uses `@racehub-io/f1-telemetry-client` to parse binary UDP data and `express` with `socket.io` for real-time communication.
- **Client (Frontend)**: Located in the `/client` directory. Built with **React**, **Vite**, and **TypeScript**. It features a high-fidelity F1 TV Broadcast aesthetic with professional telemetry visuals.

---

## Building and Running

### Prerequisites
- **Node.js** (v18 or higher)
- F1 23, F1 24, or F1 25 game configured for UDP telemetry.

### Installation
Install dependencies in all folders (root, client, and server):
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### Start Everything (Single Command)
Run the following command from the root directory to start both the backend and frontend:
```bash
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

### Testing (Simulator Mode)
To test without a game running:
1. Start the main system: `npm run dev`
2. In a separate terminal: `cd server && npm run mock`

---

## Development Conventions

### UDP Configuration (Xbox/PS/PC)
For the best experience, especially with F1 25, the following game settings are mandated:
- **UDP Telemetry**: `On`
- **UDP Port**: `20777`
- **UDP Format**: **Set to `2023`** (most stable legacy format for third-party tools).
- **UDP Send Rate**: `20Hz` or `30Hz`.

### Coding Standards
- **Frontend**: Uses React with TypeScript. Strict type-only imports for interfaces are required due to `verbatimModuleSyntax`.
- **Styling**: Modern F1 TV Broadcast aesthetic using Vanilla CSS with high-contrast colors (`--f1-red`, `--f1-white`, etc.).
- **Backend**: CommonJS Node.js server. BigInt serialization is disabled in the telemetry client to avoid Socket.io errors.

### Key Visual Logic
- **Time Highlighting**: Purple for session-best times, Green for personal-best times.
- **Track Map**: Uses `localStorage` to persist learned track layouts based on `trackId`.
- **Responsive Design**: Uses a flexible flex-wrap layout to accommodate different screen sizes (especially notebooks) without horizontal scrolling.
