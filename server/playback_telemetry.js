/**
 * Telemetry Playback Script
 * Reads recorded packets from `telemetry_recording.jsonl` and broadcasts them 
 * to the Socket.io server with real-time relative delays.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = process.env.PORT || 3000;
const socketUrl = `http://localhost:${PORT}`;

// Parse command line arguments
const args = process.argv.slice(2);
let loop = !args.includes('--no-loop');
let speedMultiplier = 1.0;
let customFile = null;

// Parse --speed=X or --file=Y
args.forEach(arg => {
  if (arg.startsWith('--speed=')) {
    const val = parseFloat(arg.split('=')[1]);
    if (!isNaN(val) && val > 0) speedMultiplier = val;
  }
  if (arg.startsWith('--file=')) {
    customFile = arg.split('=')[1];
  }
});

const RECORDING_FILE = customFile ? path.resolve(customFile) : path.join(__dirname, 'telemetry_recording.jsonl');

console.log('=== F1 Telemetry Playback ===');
console.log(`Target Server: ${socketUrl}`);
console.log(`Recording File: ${RECORDING_FILE}`);
console.log(`Looping: ${loop ? 'Enabled' : 'Disabled'}`);
console.log(`Speed: ${speedMultiplier}x\n`);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadRecording() {
  if (!fs.existsSync(RECORDING_FILE)) {
    console.error(`Error: Recording file not found at ${RECORDING_FILE}`);
    console.log('\nTo record live telemetry:');
    console.log('1. Start the backend server (npm start)');
    console.log('2. Configure your game (F1 23/24/25) UDP telemetry to send to your PC IP on port 20777');
    console.log('3. Play the game. Telemetry will automatically be written to the file.');
    return null;
  }

  const content = fs.readFileSync(RECORDING_FILE, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    console.error(`Error: Recording file at ${RECORDING_FILE} is empty.`);
    return null;
  }

  const packets = [];
  let parseErrors = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type && parsed.data && parsed.timestamp) {
        packets.push(parsed);
      }
    } catch (err) {
      parseErrors++;
    }
  }

  if (parseErrors > 0) {
    console.warn(`Warning: Skipped ${parseErrors} invalid/malformed lines during parsing.`);
  }

  return packets;
}

const packets = loadRecording();
if (!packets || packets.length === 0) {
  process.exit(1);
}

// Compute total duration of the recording
const startTime = packets[0].timestamp;
const endTime = packets[packets.length - 1].timestamp;
const durationSec = ((endTime - startTime) / 1000).toFixed(1);

console.log(`Loaded ${packets.length} packets successfully.`);
console.log(`Recorded session duration: ${durationSec} seconds (${Math.floor(durationSec / 60)}m ${Math.floor(durationSec % 60)}s)\n`);

const socket = io(socketUrl);

socket.on('connect', () => {
  console.log(`Connected to server! Starting playback...`);
  startPlayback();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
  console.log('Please ensure the backend server is running (npm run dev or cd server && npm start).');
});

async function startPlayback() {
  let playSession = 1;

  while (true) {
    console.log(`\n--- Playback Run #${playSession} ---`);
    let lastTimestamp = packets[0].timestamp;
    let packetCount = 0;
    const sessionStartTime = Date.now();

    for (let i = 0; i < packets.length; i++) {
      if (!socket.connected) {
        console.warn('Playback paused: Socket disconnected. Waiting for reconnection...');
        while (!socket.connected) {
          await sleep(500);
        }
        console.log('Reconnected! Resuming playback...');
      }

      const packet = packets[i];
      const actualDelay = i === 0 ? 0 : packet.timestamp - lastTimestamp;
      
      // Limit huge pauses (e.g. if recording was paused/stalled) to a max of 2 seconds
      const adjustedDelay = Math.min(actualDelay, 2000);
      
      // Apply speed multiplier
      const playDelay = adjustedDelay / speedMultiplier;

      if (playDelay > 0) {
        await sleep(playDelay);
      }

      socket.emit('test-telemetry', {
        type: packet.type,
        data: packet.data
      });

      packetCount++;
      lastTimestamp = packet.timestamp;

      // Status updates every 100 packets
      if (packetCount % 100 === 0 || packetCount === packets.length) {
        const percent = ((packetCount / packets.length) * 100).toFixed(0);
        const elapsed = ((Date.now() - sessionStartTime) / 1000).toFixed(0);
        process.stdout.write(`\rPlaying: ${percent}% [${packetCount}/${packets.length} packets] | Elapsed: ${elapsed}s`);
      }
    }

    console.log(`\nRun #${playSession} finished!`);
    
    if (!loop) {
      console.log('Looping is disabled. Exiting playback.');
      socket.disconnect();
      process.exit(0);
    }

    playSession++;
    console.log('Waiting 2 seconds before looping...');
    await sleep(2000);
  }
}
