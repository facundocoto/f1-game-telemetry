const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { F1TelemetryClient, constants } = require('@racehub-io/f1-telemetry-client');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

const PACKETS = constants.PACKETS;
// Listen for all packet types
Object.keys(PACKETS).forEach((packetName) => {
  client.on(PACKETS[packetName], (data) => {
    // Simple cleaning for names, trust the parser if user uses 2023 format
    if (packetName === 'participants' && data.m_participants) {
      data.m_participants = data.m_participants.map(p => ({
        ...p,
        m_name: p.m_name ? p.m_name.replace(/[^\x20-\x7E]/g, '').trim() : 'DRIVER'
      }));
    }

    io.emit('telemetry', {
      type: packetName,
      data: data,
      timestamp: Date.now()
    });
  });
});

io.on('connection', (socket) => {
  console.log('Web Client connected:', socket.id);

  socket.on('test-telemetry', (data) => {
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
