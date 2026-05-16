const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

console.log('Advanced Mock Telemetry started...');

const drivers = [
  "Max Verstappen", "Lewis Hamilton", "Charles Leclerc", "Lando Norris", 
  "Fernando Alonso", "George Russell", "Carlos Sainz", "Oscar Piastri"
];

socket.on('connect', () => {
  console.log('Connected to server. Sending advanced mock data...');
  
  let speed = 0;
  let lapTime = 0;
  let lapNum = 1;
  let fuel = 50;
  let ers = 4000000;

  setInterval(() => {
    speed = 200 + Math.random() * 100;
    lapTime += 100;
    fuel -= 0.001;
    ers -= 10000;
    if (ers < 0) ers = 4000000;

    // Simulate Leaderboard
    const allLapData = drivers.map((_, i) => ({
      carPosition: i + 1,
      currentLapNum: lapNum,
      currentLapTimeInMS: lapTime + (i * 1500),
      lastLapTimeInMS: 75000 + (i * 500),
      sector1TimeInMS: 25000,
      sector2TimeInMS: 25000
    }));

    const allParticipants = drivers.map((name, i) => ({
      name,
      teamId: i,
      raceNumber: i + 1
    }));

    // Player is index 0
    socket.emit('test-telemetry', {
      type: 'carTelemetry',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carTelemetryData: [
          {
            m_speed: Math.round(speed),
            m_gear: 7,
            m_engineRPM: 11000,
            m_throttle: 1.0,
            m_brake: 0,
            m_tyresSurfaceTemperature: [95, 95, 90, 90],
            m_tyresPressure: [22.5, 22.5, 23.1, 23.1]
          }
        ]
      }
    });

    socket.emit('test-telemetry', {
      type: 'lapData',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_lapData: allLapData
      }
    });

    socket.emit('test-telemetry', {
      type: 'participants',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_participants: allParticipants
      }
    });

    socket.emit('test-telemetry', {
      type: 'carStatus',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carStatusData: [
          {
            fuelInTank: fuel,
            fuelRemainingLaps: fuel / 2,
            ersStoreEnergy: ers,
            visualTyreCompound: 16,
            tyresAgeLaps: 5
          }
        ]
      }
    });

    socket.emit('test-telemetry', {
      type: 'carDamage',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carDamageData: [
          {
            tyresWear: [10, 10, 15, 15],
            frontLeftWingDamage: 0,
            frontRightWingDamage: 0,
            rearWingDamage: 0
          }
        ]
      }
    });

    // Send session history for each car
    drivers.forEach((_, i) => {
      socket.emit('test-telemetry', {
        type: 'sessionHistory',
        data: {
          m_carIdx: i,
          m_numLaps: 5,
          m_lapHistoryData: [
            { m_lapTimeInMS: 74500, m_sector1TimeInMS: 24800, m_sector2TimeInMS: 24800, m_sector3TimeInMS: 24900, m_lapValidBitFlags: 0x01 },
            { m_lapTimeInMS: 75200, m_sector1TimeInMS: 25100, m_sector2TimeInMS: 25000, m_sector3TimeInMS: 25100, m_lapValidBitFlags: 0x01 },
            { m_lapTimeInMS: 76000, m_sector1TimeInMS: 25500, m_sector2TimeInMS: 25000, m_sector3TimeInMS: 25500, m_lapValidBitFlags: 0x01 },
            { m_lapTimeInMS: 74800, m_sector1TimeInMS: 24900, m_sector2TimeInMS: 24900, m_sector3TimeInMS: 25000, m_lapValidBitFlags: 0x01 },
            { m_lapTimeInMS: 75500, m_sector1TimeInMS: 25200, m_sector2TimeInMS: 25100, m_sector3TimeInMS: 25200, m_lapValidBitFlags: 0x01 },
          ]
        }
      });
    });

  }, 1000); // Reduced frequency for history updates
});
