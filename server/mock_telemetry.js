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
  let lapDistance = 0;

  setInterval(() => {
    speed = 200 + Math.random() * 100;
    lapTime += 100;
    fuel -= 0.001;
    ers -= 10000;
    lapDistance += speed / 3.6; // Simple distance simulation
    if (ers < 0) ers = 4000000;

    // Simulate Lap change
    if (lapDistance > 5000) {
      lapDistance = 0;
      lapNum++;
    }

    // Simulate Leaderboard
    const allLapData = drivers.map((_, i) => ({
      m_carPosition: i + 1,
      m_currentLapNum: lapNum,
      m_currentLapTimeInMS: lapTime + (i * 1500),
      m_lastLapTimeInMS: 75000 + (i * 500),
      m_sector1TimeInMS: 25000,
      m_sector2TimeInMS: 25000,
      m_lapDistance: i === 0 ? lapDistance : (lapDistance - (i * 100 + Math.random() * 50))
    }));

    const allParticipants = drivers.map((name, i) => ({
      m_name: name,
      m_teamId: i,
      m_raceNumber: i + 1
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
            m_throttle: Math.random() > 0.2 ? 1.0 : 0.5,
            m_brake: Math.random() > 0.8 ? 1.0 : 0,
            m_tyresSurfaceTemperature: [95, 95, 90, 90],
            m_tyresPressure: [22.5, 22.5, 23.1, 23.1],
            m_brakesTemperature: [400, 400, 420, 420],
            m_engineTemperature: 105
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
            m_fuelInTank: fuel,
            m_fuelRemainingLaps: fuel / 2,
            m_ersStoreEnergy: ers,
            m_ersDeployMode: 2,
            m_visualTyreCompound: 16,
            m_tyresAgeLaps: 5,
            m_maxRPM: 13500
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
            m_tyresWear: [10, 10, 15, 15],
            m_frontLeftWingDamage: 0,
            m_frontRightWingDamage: 0,
            m_rearWingDamage: 0
          }
        ]
      }
    });

    socket.emit('test-telemetry', {
      type: 'session',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_trackLength: 5000,
        m_sessionType: 1,
        m_trackId: 1,
        m_safetyCarStatus: 0
      }
    });

    // Simulate Motion (Circular Track)
    const angle = (Date.now() / 2000) % (Math.PI * 2);
    const radius = 500;
    const motionData = drivers.map((_, i) => ({
      m_worldPositionX: Math.cos(angle - (i * 0.2)) * radius,
      m_worldPositionZ: Math.sin(angle - (i * 0.2)) * radius,
      m_gForceLateral: Math.sin(angle) * 2,
      m_gForceLongitudinal: Math.cos(angle) * 1.5
    }));

    socket.emit('test-telemetry', {
      type: 'motion',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carMotionData: motionData
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

  }, 100); 
});
