const fs = require('fs');
const { F1TelemetryClient } = require('@racehub-io/f1-telemetry-client');

const F1_UDP_PORT = 20777;
const client = new F1TelemetryClient({ 
  port: F1_UDP_PORT,
  bigintEnabled: false 
});

const logFile = 'telemetry_debug.txt';

// Clear previous log
fs.writeFileSync(logFile, '--- F1 25 TELEMETRY DEBUG LOG ---\n\n');

const loggedTypes = new Set();

console.log(`Logger started. Listening on port ${F1_UDP_PORT}...`);
console.log(`Snapshots will be saved to ${logFile}`);

const packetTypes = [
  'motion',
  'session',
  'lapData',
  'participants',
  'carTelemetry',
  'carStatus',
  'carDamage'
];

packetTypes.forEach((type) => {
  client.on(type, (data) => {
    if (!loggedTypes.has(type)) {
      console.log(`Capturing snapshot for: ${type}`);
      
      const timestamp = new Date().toISOString();
      const entry = `\n\n=== SNAPSHOT [${type}] @ ${timestamp} ===\n` + 
                    JSON.stringify(data, null, 2) + 
                    `\n==========================================\n`;
      
      fs.appendFileSync(logFile, entry);
      loggedTypes.add(type);
      
      if (loggedTypes.size === packetTypes.length) {
        console.log('ALL PACKET TYPES CAPTURED. You can now stop this script (Ctrl+C).');
      }
    }
  });
});

client.start();
