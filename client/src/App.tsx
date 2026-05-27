import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import AIChatWidget from './components/widgets/AIChatWidget';
import type { TelemetryData, LapData, CarStatus, CarDamage, Participant, SessionHistory, MotionData } from './components/Dashboard';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`;

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<number>(0);

  // Player specific data
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [allTelemetry, setAllTelemetry] = useState<(TelemetryData | null)[]>(new Array(22).fill(null));
  const [lapData, setLapData] = useState<LapData | null>(null);
  const [carStatus, setCarStatus] = useState<CarStatus | null>(null);
  const [allCarStatus, setAllCarStatus] = useState<(CarStatus | null)[]>(new Array(22).fill(null));
  const [carDamage, setCarDamage] = useState<CarDamage | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [motionData, setMotionData] = useState<MotionData | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  // All cars data for leaderboard
  const [allParticipants, setAllParticipants] = useState<(Participant | null)[]>(new Array(22).fill(null));
  const [allLapData, setAllLapData] = useState<(LapData | null)[]>(new Array(22).fill(null));
  const [sessionHistory, setSessionHistory] = useState<Record<number, SessionHistory>>({});

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to telemetry server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from telemetry server');
    });

    const loggedTypes = new Set();

    socket.on('telemetry', (packet) => {
      const { type, data } = packet;

      // DEEP SNAPSHOT: Log each packet type once
      if (!loggedTypes.has(type)) {
        console.log(`DEEP SNAPSHOT [${type}]:`, data);
        loggedTypes.add(type);
      }

      const pIndex = data.header?.m_playerCarIndex ?? data.m_header?.m_playerCarIndex ?? 0;
      setPlayerIndex(pIndex);

      switch (type) {
        case 'session':
          setSessionData(data);
          break;

        case 'motion':
          setMotionData(data);
          break;

        case 'carTelemetry':
          const tData = data.m_carTelemetryData ?? data.carTelemetryData;
          if (tData) {
            setAllTelemetry(tData);
            if (tData[pIndex]) {
              setTelemetry(tData[pIndex]);
            }
          }
          break;

        case 'lapData':
          const lData = data.m_lapData ?? data.lapData;
          if (lData) {
            setAllLapData(lData);
            if (lData[pIndex]) {
              setLapData(lData[pIndex]);
            }
          }
          break;

        case 'carStatus':
          const sData = data.m_carStatusData ?? data.carStatusData;
          if (sData) {
            setAllCarStatus(sData);
            if (sData[pIndex]) {
              setCarStatus(sData[pIndex]);
            }
          }
          break;

        case 'carDamage':
          const dData = data.m_carDamageData ?? data.carDamageData;
          if (dData && dData[pIndex]) {
            setCarDamage(dData[pIndex]);
          }
          break;

        case 'participants':
          const pData = data.m_participants ?? data.participants;
          if (pData) {
            setAllParticipants(pData);
            if (pData[pIndex]) {
              setParticipant(pData[pIndex]);
            }
          }
          break;

        case 'sessionHistory':
          const carIdx = data.m_carIdx ?? data.carIdx;
          if (carIdx !== undefined) {
            setSessionHistory(prev => ({
              ...prev,
              [carIdx]: data
            }));
          }
          break;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-f1-dark font-f1">
      <div className="bg-black h-6 flex justify-between items-center px-[15px] border-b border-[#222]">
        <div className={`font-black text-[0.7rem] px-2.5 py-1 rounded tracking-wider border ${isConnected ? 'text-[#00ff00] border-[#00ff00]/30' : 'text-red-600 border-red-600/30'}`}>
          {isConnected ? '● SERVER CONNECTED' : '○ SERVER OFFLINE'}
        </div>
        <div className="text-[0.6rem] text-[#444] font-black">v1.0.0-PRO</div>
      </div>
      <main className="flex-1">
        <Dashboard 
          telemetry={telemetry} 
          allTelemetry={allTelemetry}
          lapData={lapData}
          carStatus={carStatus}
          allCarStatus={allCarStatus}
          carDamage={carDamage}
          allParticipants={allParticipants}
          allLapData={allLapData}
          sessionHistory={sessionHistory}
          motionData={motionData}
          sessionData={sessionData}
          playerIndex={playerIndex}
          isConnected={isConnected}
        />
      </main>
      <AIChatWidget telemetryContext={{
        session: {
          track: sessionData?.m_trackId,
          sessionType: sessionData?.m_sessionType,
          weather: sessionData?.m_weather,
          trackTemperature: sessionData?.m_trackTemperature,
          airTemperature: sessionData?.m_airTemperature,
          totalLaps: sessionData?.m_totalLaps,
          trackLength: sessionData?.m_trackLength,
          safetyCarStatus: sessionData?.m_safetyCarStatus,
        },
        driver: {
          name: participant?.m_name,
          position: lapData?.m_carPosition,
          currentLap: lapData?.m_currentLapNum,
          lastLapTimeMs: lapData?.m_lastLapTimeInMS,
          currentLapTimeMs: lapData?.m_currentLapTimeInMS,
          sector1Ms: lapData?.m_sector1TimeInMS,
          sector2Ms: lapData?.m_sector2TimeInMS,
          lapDistance: lapData?.m_lapDistance,
        },
        car: {
          speedKmh: telemetry?.m_speed,
          throttle: telemetry?.m_throttle,
          brake: telemetry?.m_brake,
          gear: telemetry?.m_gear,
          engineRPM: telemetry?.m_engineRPM,
          engineTemperature: telemetry?.m_engineTemperature,
          tyresSurfaceTemp: telemetry?.m_tyresSurfaceTemperature,
          tyresInnerTemp: telemetry?.m_tyresInnerTemperature,
          tyresPressure: telemetry?.m_tyresPressure,
          brakesTemperature: telemetry?.m_brakesTemperature,
        },
        tyres: {
          visualCompound: carStatus?.m_visualTyreCompound,  // 16=Soft 17=Medium 18=Hard 19=Inter 20=Wet
          actualCompound: carStatus?.m_actualTyreCompound,
          tyreAgeLaps: carStatus?.m_tyresAgeLaps,
          wear: carDamage?.m_tyresWear,  // [RL, RR, FL, FR] %
          fuelRemainingLaps: carStatus?.m_fuelRemainingLaps,
          fuelInTank: carStatus?.m_fuelInTank,
          ersStoreEnergy: carStatus?.m_ersStoreEnergy,
          ersDeployMode: carStatus?.m_ersDeployMode,
        },
        damage: {
          frontLeftWing: carDamage?.m_frontLeftWingDamage,
          frontRightWing: carDamage?.m_frontRightWingDamage,
          rearWing: carDamage?.m_rearWingDamage,
          gearbox: carDamage?.m_gearBoxDamage,
          engine: carDamage?.m_engineDamage,
          engineICE: carDamage?.m_engineICEWear,
          engineMGUK: carDamage?.m_engineMGUKWear,
          engineMGUH: carDamage?.m_engineMGUHWear,
          engineES: carDamage?.m_engineESWear,
          engineCE: carDamage?.m_engineCEWear,
          engineTC: carDamage?.m_engineTCWear,
        },
        gForces: {
          lateral: motionData?.m_carMotionData[playerIndex]?.m_gForceLateral,
          longitudinal: motionData?.m_carMotionData[playerIndex]?.m_gForceLongitudinal,
        }
      }} />
    </div>
  );
}

export default App;
