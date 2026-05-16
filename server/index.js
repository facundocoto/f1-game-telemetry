const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { F1TelemetryClient, constants } = require('f1-telemetry-client');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for local development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const F1_UDP_PORT = 20777;

// Initialize F1 Telemetry Client
const client = new F1TelemetryClient({ port: F1_UDP_PORT });

// Listen for raw UDP messages for debugging
client.on('message', () => {
  if (Math.random() < 0.1) { // 10% of packets to see activity quickly
    console.log('--- RAW UDP PACKET DETECTED ---');
  }
});

// Listen for various packets and broadcast them
const packetTypes = Object.keys(constants.PACKETS);
console.log('Listening for packet types:', packetTypes.join(', '));

packetTypes.forEach((type) => {
  client.on(constants.PACKETS[type], (data) => {
    // Debug: Log when a packet is received (limit to once every few seconds for common packets)
    if (type === 'carTelemetry' || type === 'lapData') {
      if (Math.random() < 0.01) { // 1% of packets to avoid flooding console
        console.log(`Received ${type} packet from game`);
      }
    }

    // Enrich data with packet type for easier handling on frontend
    io.emit('telemetry', {
      type: type,
      data: data,
      timestamp: Date.now()
    });
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Allow test data to be sent from a mock script
  socket.on('test-telemetry', (data) => {
    io.emit('telemetry', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start listening for UDP packets
client.start();
console.log(`F1 Telemetry UDP listener started on port ${F1_UDP_PORT}`);

server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
