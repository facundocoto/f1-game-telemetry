import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import type { TelemetryData, LapData, CarStatus, CarDamage, Participant, SessionHistory, MotionData } from './components/Dashboard';

const SOCKET_URL = 'http://localhost:3000';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<number>(0);

  // Player specific data
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [lapData, setLapData] = useState<LapData | null>(null);
  const [carStatus, setCarStatus] = useState<CarStatus | null>(null);
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
          if (tData && tData[pIndex]) {
            setTelemetry(tData[pIndex]);
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
          if (sData && sData[pIndex]) {
            setCarStatus(sData[pIndex]);
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
          lapData={lapData}
          carStatus={carStatus}
          carDamage={carDamage}
          allParticipants={allParticipants}
          allLapData={allLapData}
          sessionHistory={sessionHistory}
          motionData={motionData}
          sessionData={sessionData}
          playerIndex={playerIndex}
        />
      </main>
    </div>
  );
}

export default App;
