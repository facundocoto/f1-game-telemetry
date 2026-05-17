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
  let lapTime = 60000;
  let lapNum = 1;
  let fuel = 50;
  let ers = 4000000;
  let lapDistance = 4800; // Start closer to finish to get a "Best Lap" quickly

  setInterval(() => {
    speed = 220 + Math.random() * 80;
    lapTime += 100;
    fuel -= 0.001;
    ers -= 10000;
    const distanceDelta = (speed / 3.6) * 0.1;
    lapDistance += distanceDelta;
    if (ers < 0) ers = 4000000;

    // Simulate Lap change
    if (lapDistance > 5000) {
      lapDistance -= 5000;
      lapNum++;
      lapTime = 0;
    }

    // Simulate Leaderboard
    const allLapData = drivers.map((_, i) => {
      let driverDist = lapDistance - (i * 150); // Increased gap for clarity
      while (driverDist < 0) driverDist += 5000;

      return {
        m_carPosition: i + 1,
        m_currentLapNum: lapNum,
        m_currentLapTimeInMS: lapTime + (i * 50),
        m_lastLapTimeInMS: 75000 + (i * 500),
        m_sector1TimeInMS: 25000,
        m_sector2TimeInMS: 25000,
        m_lapDistance: driverDist
      };
    });

    const allParticipants = drivers.map((name, i) => ({
      m_name: name,
      m_teamId: i,
      m_raceNumber: i + 1
    }));

    const allTelemetryData = drivers.map((_, i) => {
      const isPlayer = i === 0;
      const driverSpeed = isPlayer ? speed : (speed - (i * 2 + Math.random() * 5));
      const driverThrottle = isPlayer ? (Math.random() > 0.2 ? 1.0 : 0.5) : (Math.random() > 0.3 ? 0.9 : 0.4);
      const driverBrake = isPlayer ? (Math.random() > 0.8 ? 1.0 : 0) : (Math.random() > 0.85 ? 1.0 : 0);
      
      return {
        m_speed: Math.round(driverSpeed),
        m_gear: 7,
        m_engineRPM: 11000 - (i * 100),
        m_throttle: driverThrottle,
        m_brake: driverBrake,
        m_tyresSurfaceTemperature: [95, 95, 90, 90],
        m_tyresPressure: [22.5, 22.5, 23.1, 23.1],
        m_brakesTemperature: [400, 400, 420, 420],
        m_engineTemperature: 105
      };
    });

    const allCarStatus = drivers.map((_, i) => ({
      m_fuelInTank: fuel - (i * 0.1),
      m_fuelRemainingLaps: (fuel / 2) - (i * 0.05),
      m_ersStoreEnergy: ers,
      m_ersDeployMode: 2,
      m_visualTyreCompound: 16,
      m_tyresAgeLaps: 5 + i,
      m_maxRPM: 13500
    }));

    const allCarDamage = drivers.map((_, i) => ({
      m_tyresWear: [10 + i, 10 + i, 15 + i, 15 + i],
      m_frontLeftWingDamage: i * 2,
      m_frontRightWingDamage: i * 2,
      m_rearWingDamage: i
    }));

    // Player is index 0
    socket.emit('test-telemetry', {
      type: 'carTelemetry',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carTelemetryData: allTelemetryData
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
        m_carStatusData: allCarStatus
      }
    });

    socket.emit('test-telemetry', {
      type: 'carDamage',
      data: {
        m_header: { m_playerCarIndex: 0 },
        m_carDamageData: allCarDamage
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
