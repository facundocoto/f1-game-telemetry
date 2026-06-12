require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { F1TelemetryClient, constants } = require('@racehub-io/f1-telemetry-client');
const chatRouter = require('./chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/api/chat', chatRouter);

const PORT = process.env.PORT || 3000;
const F1_UDP_PORT = 20777;

// Initialize F1 Telemetry Client
const client = new F1TelemetryClient({ 
  port: F1_UDP_PORT,
  bigintEnabled: false // This prevents the "Do not know how to serialize a BigInt" error
});

// Debug logging
client.on('message', () => {
  if (Math.random() < 0.1) {
    console.log('--- RAW UDP PACKET RECEIVED ---');
  }
});

const fs = require('fs');
const path = require('path');

const REFERENCE_FILE = path.join(__dirname, 'telemetry_live_reference.json');
let referenceData = {};
let pendingWrite = false;

// Function to save telemetry snapshots to file (debounced to avoid blocking disk I/O)
function recordTelemetryReference(packetID, data) {
  referenceData[packetID] = data;
  
  if (!pendingWrite) {
    pendingWrite = true;
    setTimeout(() => {
      try {
        fs.writeFileSync(REFERENCE_FILE, JSON.stringify(referenceData, null, 2));
      } catch (err) {
        console.error('Error writing telemetry reference file:', err);
      } finally {
        pendingWrite = false;
      }
    }, 2000); // Write at most once every 2 seconds
  }
}

// Parse command-line arguments and environment variables to check if we should record
const args = process.argv.slice(2);
const shouldRecord = args.includes('--record') || process.env.RECORD_TELEMETRY === 'true';

// Continuous recording setup using an efficient write stream (only if enabled)
const RECORDING_FILE = path.join(__dirname, 'telemetry_recording.jsonl');
let recordingStream;

if (shouldRecord) {
  try {
    recordingStream = fs.createWriteStream(RECORDING_FILE, { flags: 'w', encoding: 'utf8' });
    console.log(`[RECORDING ACTIVE] Saving telemetry continuously to: ${RECORDING_FILE}`);
  } catch (err) {
    console.error('Error initializing telemetry recording stream:', err);
  }
} else {
  console.log('Telemetry recording is DISABLED. To record your session, start with --record or set RECORD_TELEMETRY=true');
}

function appendToRecording(packetID, data) {
  if (recordingStream) {
    const entry = JSON.stringify({
      type: packetID,
      data: data,
      timestamp: Date.now()
    }) + '\n';
    recordingStream.write(entry);
  }
}

// Custom parser for F1 24 Participants packet to fix the 2-byte offset shift
function parseParticipantsF124(buffer) {
  const numActiveCars = buffer.readUInt8(29);
  const participants = [];
  
  for (let i = 0; i < 22; i++) {
    const offset = 30 + i * 60;
    if (offset + 60 > buffer.length) break;
    
    const aiControlled = buffer.readUInt8(offset);
    const driverId = buffer.readUInt8(offset + 1);
    const networkId = buffer.readUInt8(offset + 2);
    const teamId = buffer.readUInt8(offset + 3);
    const myTeam = buffer.readUInt8(offset + 4);
    const raceNumber = buffer.readUInt8(offset + 5);
    const nationality = buffer.readUInt8(offset + 6);
    
    // Extract m_name (48 bytes), looking for null-termination
    let nameEnd = offset + 7;
    while (nameEnd < offset + 7 + 48 && buffer[nameEnd] !== 0) {
      nameEnd++;
    }
    const name = buffer.toString('utf8', offset + 7, nameEnd).trim();
    
    const yourTelemetry = buffer.readUInt8(offset + 55);
    const showOnlineNames = buffer.readUInt8(offset + 56);
    const techLevel = buffer.readUInt16LE(offset + 57);
    const platform = buffer.readUInt8(offset + 59);
    
    participants.push({
      m_aiControlled: aiControlled,
      m_driverId: driverId,
      m_networkId: networkId,
      m_teamId: teamId,
      m_myTeam: myTeam,
      m_raceNumber: raceNumber,
      m_nationality: nationality,
      m_name: name || 'DRIVER',
      m_yourTelemetry: yourTelemetry,
      m_showOnlineNames: showOnlineNames,
      m_techLevel: techLevel,
      m_platform: platform
    });
  }
  
  return {
    m_numActiveCars: numActiveCars,
    m_participants: participants
  };
}

// Custom parser for F1 24 Lap Data packet to handle 57-byte struct and split sector times/deltas
function parseLapDataF124(buffer) {
  const lapData = [];
  
  for (let i = 0; i < 22; i++) {
    const offset = 29 + i * 57;
    if (offset + 57 > buffer.length) break;
    
    const lastLapTimeInMS = buffer.readUInt32LE(offset);
    const currentLapTimeInMS = buffer.readUInt32LE(offset + 4);
    
    const sector1TimeMSPart = buffer.readUInt16LE(offset + 8);
    const sector1TimeMinutesPart = buffer.readUInt8(offset + 10);
    const sector1TimeInMS = sector1TimeMinutesPart * 60000 + sector1TimeMSPart;
    
    const sector2TimeMSPart = buffer.readUInt16LE(offset + 11);
    const sector2TimeMinutesPart = buffer.readUInt8(offset + 13);
    const sector2TimeInMS = sector2TimeMinutesPart * 60000 + sector2TimeMSPart;
    
    const deltaToCarInFrontMSPart = buffer.readUInt16LE(offset + 14);
    const deltaToCarInFrontMinutesPart = buffer.readUInt8(offset + 16);
    const deltaToCarInFrontInMS = deltaToCarInFrontMinutesPart * 60000 + deltaToCarInFrontMSPart;
    
    const deltaToRaceLeaderMSPart = buffer.readUInt16LE(offset + 17);
    const deltaToRaceLeaderMinutesPart = buffer.readUInt8(offset + 19);
    const deltaToRaceLeaderInMS = deltaToRaceLeaderMinutesPart * 60000 + deltaToRaceLeaderMSPart;
    
    const lapDistance = buffer.readFloatLE(offset + 20);
    const totalDistance = buffer.readFloatLE(offset + 24);
    const safetyCarDelta = buffer.readFloatLE(offset + 28);
    
    const carPosition = buffer.readUInt8(offset + 32);
    const currentLapNum = buffer.readUInt8(offset + 33);
    const pitStatus = buffer.readUInt8(offset + 34);
    const numPitStops = buffer.readUInt8(offset + 35);
    const sector = buffer.readUInt8(offset + 36);
    const currentLapInvalid = buffer.readUInt8(offset + 37);
    const penalties = buffer.readUInt8(offset + 38);
    const totalWarnings = buffer.readUInt8(offset + 39);
    const cornerCuttingWarnings = buffer.readUInt8(offset + 40);
    const numUnservedDriveThroughPens = buffer.readUInt8(offset + 41);
    const numUnservedStopGoPens = buffer.readUInt8(offset + 42);
    const gridPosition = buffer.readUInt8(offset + 43);
    const driverStatus = buffer.readUInt8(offset + 44);
    const resultStatus = buffer.readUInt8(offset + 45);
    const pitLaneTimerActive = buffer.readUInt8(offset + 46);
    const pitLaneTimeInLaneInMS = buffer.readUInt16LE(offset + 47);
    const pitStopTimerInMS = buffer.readUInt16LE(offset + 49);
    const pitStopShouldServePen = buffer.readUInt8(offset + 51);
    const speedTrapFastestSpeed = buffer.readFloatLE(offset + 52);
    const speedTrapFastestLap = buffer.readUInt8(offset + 56);
    
    lapData.push({
      m_lastLapTimeInMS: lastLapTimeInMS,
      m_currentLapTimeInMS: currentLapTimeInMS,
      m_sector1TimeInMS: sector1TimeInMS,
      m_sector1TimeMinutes: sector1TimeMinutesPart,
      m_sector2TimeInMS: sector2TimeInMS,
      m_sector2TimeMinutes: sector2TimeMinutesPart,
      m_deltaToCarInFrontInMS: deltaToCarInFrontInMS,
      m_deltaToRaceLeaderInMS: deltaToRaceLeaderInMS,
      m_lapDistance: lapDistance,
      m_totalDistance: totalDistance,
      m_safetyCarDelta: safetyCarDelta,
      m_carPosition: carPosition,
      m_currentLapNum: currentLapNum,
      m_pitStatus: pitStatus,
      m_numPitStops: numPitStops,
      m_sector: sector,
      m_currentLapInvalid: currentLapInvalid,
      m_penalties: penalties,
      m_totalWarnings: totalWarnings,
      m_cornerCuttingWarnings: cornerCuttingWarnings,
      m_numUnservedDriveThroughPens: numUnservedDriveThroughPens,
      m_numUnservedStopGoPens: numUnservedStopGoPens,
      m_gridPosition: gridPosition,
      m_driverStatus: driverStatus,
      m_resultStatus: resultStatus,
      m_pitLaneTimerActive: pitLaneTimerActive,
      m_pitLaneTimeInLaneInMS: pitLaneTimeInLaneInMS,
      m_pitStopTimerInMS: pitStopTimerInMS,
      m_pitStopShouldServePen: pitStopShouldServePen,
      m_speedTrapFastestSpeed: speedTrapFastestSpeed,
      m_speedTrapFastestLap: speedTrapFastestLap
    });
  }
  
  const timeTrialPBCarIdx = buffer.readUInt8(29 + 22 * 57);
  const timeTrialRivalCarIdx = buffer.readUInt8(29 + 22 * 57 + 1);
  
  return {
    m_lapData: lapData,
    m_timeTrialPBCarIdx: timeTrialPBCarIdx,
    m_timeTrialRivalCarIdx: timeTrialRivalCarIdx
  };
}

// Custom parser for F1 24 Session History packet to handle 14-byte LapHistoryData structure
function parseSessionHistoryF124(buffer) {
  const carIdx = buffer.readUInt8(29);
  const numLaps = buffer.readUInt8(30);
  const numTyreStints = buffer.readUInt8(31);
  const bestLapTimeLapNum = buffer.readUInt8(32);
  const bestSector1LapNum = buffer.readUInt8(33);
  const bestSector2LapNum = buffer.readUInt8(34);
  const bestSector3LapNum = buffer.readUInt8(35);
  
  const lapHistoryData = [];
  for (let i = 0; i < 100; i++) {
    const offset = 36 + i * 14;
    if (offset + 14 > buffer.length) break;
    
    const lapTimeInMS = buffer.readUInt32LE(offset);
    
    const sector1TimeMSPart = buffer.readUInt16LE(offset + 4);
    const sector1TimeMinutesPart = buffer.readUInt8(offset + 6);
    const sector1TimeInMS = sector1TimeMinutesPart * 60000 + sector1TimeMSPart;
    
    const sector2TimeMSPart = buffer.readUInt16LE(offset + 7);
    const sector2TimeMinutesPart = buffer.readUInt8(offset + 9);
    const sector2TimeInMS = sector2TimeMinutesPart * 60000 + sector2TimeMSPart;
    
    const sector3TimeMSPart = buffer.readUInt16LE(offset + 10);
    const sector3TimeMinutesPart = buffer.readUInt8(offset + 12);
    const sector3TimeInMS = sector3TimeMinutesPart * 60000 + sector3TimeMSPart;
    
    const lapValidBitFlags = buffer.readUInt8(offset + 13);
    
    lapHistoryData.push({
      m_lapTimeInMS: lapTimeInMS,
      m_sector1TimeInMS: sector1TimeInMS,
      m_sector2TimeInMS: sector2TimeInMS,
      m_sector3TimeInMS: sector3TimeInMS,
      m_lapValidBitFlags: lapValidBitFlags
    });
  }
  
  const tyreStintsHistoryData = [];
  for (let i = 0; i < 8; i++) {
    const offset = 36 + 100 * 14 + i * 3;
    if (offset + 3 > buffer.length) break;
    
    const endLap = buffer.readUInt8(offset);
    const tyreActualCompound = buffer.readUInt8(offset + 1);
    const tyreVisualCompound = buffer.readUInt8(offset + 2);
    
    tyreStintsHistoryData.push({
      m_endLap: endLap,
      m_tyreActualCompound: tyreActualCompound,
      m_tyreVisualCompound: tyreVisualCompound
    });
  }
  
  return {
    m_carIdx: carIdx,
    m_numLaps: numLaps,
    m_numTyreStints: numTyreStints,
    m_bestLapTimeLapNum: bestLapTimeLapNum,
    m_bestSector1LapNum: bestSector1LapNum,
    m_bestSector2LapNum: bestSector2LapNum,
    m_bestSector3LapNum: bestSector3LapNum,
    m_lapHistoryData: lapHistoryData,
    m_tyreStintsHistoryData: tyreStintsHistoryData
  };
}

// Listen for the raw packet parsing event to customize processing and re-parse F1 24 data
client.on('raw', (parsedMessage) => {
  const { packetID, packetData, message } = parsedMessage;
  let data = packetData.data;

  const m_packetFormat = message.readUInt16LE(0);

  if (m_packetFormat === 2024) {
    if (packetID === 'participants') {
      try {
        const customData = parseParticipantsF124(message);
        data = {
          m_header: data.m_header,
          ...customData
        };
      } catch (err) {
        console.error('Error custom-parsing F1 24 participants:', err);
      }
    } else if (packetID === 'lapData') {
      try {
        const customData = parseLapDataF124(message);
        data = {
          m_header: data.m_header,
          ...customData
        };
      } catch (err) {
        console.error('Error custom-parsing F1 24 lapData:', err);
      }
    } else if (packetID === 'sessionHistory') {
      try {
        const customData = parseSessionHistoryF124(message);
        data = {
          m_header: data.m_header,
          ...customData
        };
      } catch (err) {
        console.error('Error custom-parsing F1 24 sessionHistory:', err);
      }
    }
  } else {
    // Cleaning or legacy formats
    if (packetID === 'participants' && data.m_participants) {
      data.m_participants = data.m_participants.map(p => ({
        ...p,
        m_name: p.m_name ? p.m_name.replace(/[^\x20-\x7E]/g, '').trim() : 'DRIVER'
      }));
    }
  }

  // Save the latest state as reference
  recordTelemetryReference(packetID, data);

  // Append packet to continuous recording file
  appendToRecording(packetID, data);

  // Broadcast to all connected web clients
  io.emit('telemetry', {
    type: packetID,
    data: data,
    timestamp: Date.now()
  });
});

io.on('connection', (socket) => {
  console.log('Web Client connected:', socket.id);

  socket.on('test-telemetry', (data) => {
    if (data && data.type && data.data) {
      recordTelemetryReference(data.type, data.data);
    }
    io.emit('telemetry', data);
  });

  socket.on('disconnect', () => {
    console.log('Web Client disconnected:', socket.id);
  });
});

client.start();
console.log(`F1 25 UDP listener started on port ${F1_UDP_PORT}`);

server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
