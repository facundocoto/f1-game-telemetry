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
          weather: sessionData?.m_weather,               // 0=Clear 1=LightCloud 2=Overcast 3=LightRain 4=HeavyRain 5=Storm
          trackTemperature: sessionData?.m_trackTemperature,
          airTemperature: sessionData?.m_airTemperature,
          totalLaps: sessionData?.m_totalLaps,
          trackLength: sessionData?.m_trackLength,
          safetyCarStatus: sessionData?.m_safetyCarStatus, // 0=None 1=Full 2=Virtual 3=FormationLap
          pitSpeedLimit: sessionData?.m_pitSpeedLimit,
          gamePaused: sessionData?.m_gamePaused,
          weatherForecast: sessionData?.m_weatherForecastSamples
            ? sessionData.m_weatherForecastSamples.slice(0, 5).map((s: any) => ({
                timeOffset_min: s.m_timeOffset,
                weather: s.m_weather,
                trackTemp: s.m_trackTemperature,
                rainProbability_pct: s.m_rainPercentage,
              }))
            : null,
        },
        driver: {
          name: participant?.m_name,
          teamId: participant?.m_teamId,
          raceNumber: participant?.m_raceNumber,
          position: lapData?.m_carPosition,
          currentLap: lapData?.m_currentLapNum,
          lastLapTimeMs: lapData?.m_lastLapTimeInMS,
          currentLapTimeMs: lapData?.m_currentLapTimeInMS,
          sector1Ms: lapData?.m_sector1TimeInMS,
          sector2Ms: lapData?.m_sector2TimeInMS,
          lapDistance: lapData?.m_lapDistance,
          pitStatus: (lapData as any)?.m_pitStatus,       // 0=None 1=Pitting 2=InPitArea
          penalties_sec: (lapData as any)?.m_penalties,
          warnings: (lapData as any)?.m_numUnservedDriveThroughPens,
        },
        car: {
          speedKmh: telemetry?.m_speed,
          throttle: telemetry?.m_throttle,
          brake: telemetry?.m_brake,
          gear: telemetry?.m_gear,
          engineRPM: telemetry?.m_engineRPM,
          engineTemperature: telemetry?.m_engineTemperature,
          drs: (telemetry as any)?.m_drs,                 // 0=Off 1=On
          brakesTemperature: telemetry?.m_brakesTemperature,
        },
        tyres: {
          visualCompound: carStatus?.m_visualTyreCompound, // F1 25: 16=Soft 17=Med 18=Hard 19=C2 20=C1 7=Inter 8=Wet
          actualCompound: carStatus?.m_actualTyreCompound,
          tyreAgeLaps: carStatus?.m_tyresAgeLaps,
          wear_pct: carDamage?.m_tyresWear,               // [RL, RR, FL, FR] %
          surfaceTemp: telemetry?.m_tyresSurfaceTemperature,
          innerTemp: telemetry?.m_tyresInnerTemperature,
          pressure: telemetry?.m_tyresPressure,
        },
        fuel: {
          inTank_kg: carStatus?.m_fuelInTank,
          remainingLaps_gameEstimate: carStatus?.m_fuelRemainingLaps,
        },
        ers: {
          storeEnergy_joules: carStatus?.m_ersStoreEnergy, // max 4,000,000 J
          deployMode: carStatus?.m_ersDeployMode,          // 0=None 1=Low 2=Medium 3=High 4=Overtake
          harvestedThisLap_MGUKJoules: (carStatus as any)?.m_ersHarvestedThisLapMGUK,
          harvestedThisLap_MGUHJoules: (carStatus as any)?.m_ersHarvestedThisLapMGUH,
          deployedThisLap_joules: (carStatus as any)?.m_ersDeployedThisLap,
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
        lapHistory: (() => {
          const history = sessionHistory[playerIndex];
          if (!history) return null;
          return history.m_lapHistoryData.slice(0, history.m_numLaps).map((lap, i) => ({
            lap: i + 1,
            lapTime_ms: lap.m_lapTimeInMS,
            s1_ms: lap.m_sector1TimeInMS,
            s2_ms: lap.m_sector2TimeInMS,
            s3_ms: lap.m_sector3TimeInMS,
            valid: !!(lap.m_lapValidBitFlags & 0x01),
          }));
        })(),
        raceProgress: {
          currentLap: lapData?.m_currentLapNum,
          totalLaps: sessionData?.m_totalLaps,
          lapsRemaining: sessionData?.m_totalLaps != null && lapData?.m_currentLapNum != null
            ? sessionData.m_totalLaps - lapData.m_currentLapNum
            : null,
          position: lapData?.m_carPosition,
          totalCars: allLapData.filter(ld => ld && (ld as any).m_carPosition > 0).length,
        },
        // All cars on track — critical for pit strategy, gap management, undercut/overcut
        opponents: allLapData
          .map((ld, idx) => {
            if (!ld || idx === playerIndex) return null;
            const pos = (ld as any).m_carPosition;
            if (!pos || pos <= 0 || pos > 22) return null;
            const st = allCarStatus[idx];
            const p = allParticipants[idx];
            return {
              name: (p as any)?.m_name ?? `CAR ${idx}`,
              position: pos,
              currentLap: (ld as any).m_currentLapNum,
              lastLapTime_ms: (ld as any).m_lastLapTimeInMS,
              tyreCompound: (st as any)?.m_visualTyreCompound, // 16=Soft 17=Med 18=Hard 7=Inter 8=Wet
              tyreAgeLaps: (st as any)?.m_tyresAgeLaps,
              gapToPlayerMeters: (() => {
                const playerLd = allLapData[playerIndex];
                if (!playerLd) return null;
                const trackLen = sessionData?.m_trackLength || 1;
                const playerDist = ((playerLd as any).m_currentLapNum - 1) * trackLen + (playerLd as any).m_lapDistance;
                const opDist = ((ld as any).m_currentLapNum - 1) * trackLen + (ld as any).m_lapDistance;
                return Math.round(playerDist - opDist);
              })(),
              pitStatus: (ld as any)?.m_pitStatus,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.position - b.position),
      }} />
    </div>
  );
}

export default App;
