import React from 'react';

export interface TelemetryData {
  m_speed: number;
  m_gear: number;
  m_engineRPM: number;
  m_throttle: number;
  m_brake: number;
  m_tyresSurfaceTemperature: number[];
  m_tyresInnerTemperature: number[];
  m_tyresPressure: number[];
  m_brakesTemperature: number[];
  m_engineTemperature: number;
}

export interface LapData {
  m_lastLapTimeInMS: number;
  m_currentLapTimeInMS: number;
  m_sector1TimeInMS: number;
  m_sector2TimeInMS: number;
  m_carPosition: number;
  m_currentLapNum: number;
  m_lapDistance: number;
}

export interface CarStatus {
  m_fuelInTank: number;
  m_fuelRemainingLaps: number;
  m_ersStoreEnergy: number;
  m_actualTyreCompound: number;
  m_visualTyreCompound: number;
  m_tyresAgeLaps: number;
  m_maxRPM: number;
  m_ersDeployMode: number;
}

export interface CarDamage {
  m_tyresWear: number[];
  m_frontLeftWingDamage: number;
  m_frontRightWingDamage: number;
  m_rearWingDamage: number;
}

export interface Participant {
  m_name: string;
  m_teamId: number;
  m_raceNumber: number;
}

export interface LapHistory {
  m_lapTimeInMS: number;
  m_sector1TimeInMS: number;
  m_sector2TimeInMS: number;
  m_sector3TimeInMS: number;
  m_lapValidBitFlags: number;
}

export interface SessionHistory {
  m_carIdx: number;
  m_numLaps: number;
  m_lapHistoryData: LapHistory[];
}

export interface CarMotionData {
  m_worldPositionX: number;
  m_worldPositionZ: number;
  m_gForceLateral: number;
  m_gForceLongitudinal: number;
}

export interface MotionData {
  m_carMotionData: CarMotionData[];
}

export interface TelemetryPoint {
  distance: number;
  throttle: number;
  brake: number;
}

interface DashboardProps {
  telemetry: TelemetryData | null;
  lapData: LapData | null;
  carStatus: CarStatus | null;
  carDamage: CarDamage | null;
  allParticipants: (Participant | null)[];
  allLapData: (LapData | null)[];
  sessionHistory: Record<number, SessionHistory>;
  motionData: MotionData | null;
  sessionData: any | null;
  playerIndex: number;
}

const formatTime = (ms: number) => {
  if (!ms || ms === 0) return "---";
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3);
  return `${m}:${s.padStart(6, '0')}`;
};

const TelemetryChart: React.FC<{ 
  currentLapPoints: TelemetryPoint[]; 
  bestLapPoints: TelemetryPoint[]; 
  trackLength: number;
}> = ({ currentLapPoints, bestLapPoints, trackLength }) => {
  const width = 800;
  const height = 150;
  const padding = 20;
  
  const xScale = (dist: number) => (dist / (trackLength || 1)) * (width - padding * 2) + padding;
  const yScale = (val: number) => height - (val * (height - padding * 2) + padding);

  const generatePath = (points: TelemetryPoint[], key: 'throttle' | 'brake') => {
    if (points.length < 2) return "";
    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(p.distance)} ${yScale(p[key])}`
    ).join(' ');
  };

  return (
    <div className="bg-[#050508] border border-[#222] rounded-lg p-[15px] mt-2.5 w-full">
      <div className="flex gap-5 mb-2.5 justify-center">
        <span className="flex items-center gap-1.5 text-[0.65rem] font-black text-f1-gray"><i className="inline-block w-3 h-1 bg-[#00ff00]"></i> THROTTLE</span>
        <span className="flex items-center gap-1.5 text-[0.65rem] font-black text-f1-gray"><i className="inline-block w-3 h-1 bg-[#ff0000]"></i> BRAKE</span>
        <span className="flex items-center gap-1.5 text-[0.65rem] font-black text-f1-gray"><i className="inline-block w-3 h-1 bg-white/20 border border-dashed border-[#666]"></i> BEST LAP</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        {/* Grid Lines */}
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#333" />
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={padding} y1={yScale(p)} x2={width-padding} y2={yScale(p)} stroke="#222" strokeDasharray="5,5" />
        ))}
        
        {/* Best Lap (Reference) */}
        {bestLapPoints.length > 0 && (
          <>
            <path d={generatePath(bestLapPoints, 'throttle')} fill="none" stroke="rgba(0, 255, 0, 0.2)" strokeWidth="1" strokeDasharray="4,2" />
            <path d={generatePath(bestLapPoints, 'brake')} fill="none" stroke="rgba(255, 0, 0, 0.2)" strokeWidth="1" strokeDasharray="4,2" />
          </>
        )}

        {/* Current Lap */}
        <path d={generatePath(currentLapPoints, 'throttle')} fill="none" stroke="#00ff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={generatePath(currentLapPoints, 'brake')} fill="none" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Distance markers */}
        <text x={padding} y={height - 5} fill="#666" fontSize="10">START</text>
        <text x={width - padding - 30} y={height - 5} fill="#666" fontSize="10">FINISH</text>
      </svg>
    </div>
  );
};

const RPMBar: React.FC<{ rpm: number; maxRpm: number }> = ({ rpm, maxRpm }) => {
  const numSegments = 20;
  const percentage = Math.min((rpm / (maxRpm || 13500)), 1);
  const activeSegments = Math.floor(percentage * numSegments);

  return (
    <div className="w-full flex gap-1 justify-between mb-4 bg-black/40 p-1.5 rounded-sm border border-white/5">
      {Array.from({ length: numSegments }).map((_, i) => {
        const isActive = i < activeSegments;
        let colorClass = "bg-neutral-800 shadow-none";
        
        if (isActive) {
          if (i < 8) colorClass = "bg-[#00ff00] shadow-[0_0_10px_#00ff00]"; // Green
          else if (i < 15) colorClass = "bg-[#ff0000] shadow-[0_0_10px_#ff0000]"; // Red
          else colorClass = "bg-[#b131ff] shadow-[0_0_12px_#b131ff] animate-pulse"; // Purple/Blue (Shift)
        }

        return (
          <div 
            key={i} 
            className={`flex-1 h-4 rounded-sm transition-all duration-75 ${colorClass}`}
          />
        );
      })}
    </div>
  );
};

const GForceRadar: React.FC<{ lateral: number; longitudinal: number }> = ({ lateral, longitudinal }) => {
  const size = 80;
  const centerX = size / 2;
  const centerY = size / 2;
  const multiplier = 12; 
  const dotX = centerX + (lateral * multiplier);
  const dotY = centerY - (longitudinal * multiplier);

  return (
    <div className="flex justify-center items-center">
      <svg width={size} height={size}>
        <circle cx={centerX} cy={centerY} r="35" fill="none" stroke="#444" strokeWidth="1" />
        <circle cx={centerX} cy={centerY} r="17.5" fill="none" stroke="#222" strokeWidth="1" />
        <line x1="0" y1={centerY} x2={size} y2={centerY} stroke="#222" strokeWidth="1" />
        <line x1={centerX} y1="0" x2={centerX} y2={size} stroke="#222" strokeWidth="1" />
        <circle cx={dotX} cy={dotY} r="5" fill="#e10600" />
      </svg>
    </div>
  );
};

const CircuitMap: React.FC<{ motionData: MotionData | null; allParticipants: (Participant | null)[]; playerIndex: number; trackId: number }> = ({ motionData, allParticipants, playerIndex, trackId }) => {
  const [learnedPath, setLearnedPath] = React.useState<{ x: number, z: number }[]>([]);
  const [currentPath, setCurrentPath] = React.useState<{ x: number, z: number }[]>([]);
  
  React.useEffect(() => {
    const saved = localStorage.getItem(`f1_track_${trackId}`);
    if (saved) try { setLearnedPath(JSON.parse(saved)); } catch (e) { console.error(e); }
    else setLearnedPath([]);
  }, [trackId]);

  React.useEffect(() => {
    if (motionData && motionData.m_carMotionData[playerIndex]) {
      const { m_worldPositionX, m_worldPositionZ } = motionData.m_carMotionData[playerIndex];
      setCurrentPath(prev => {
        const last = prev[prev.length - 1];
        if (!last || Math.sqrt(Math.pow(last.x - m_worldPositionX, 2) + Math.pow(last.z - m_worldPositionZ, 2)) > 5) {
          const newPath = [...prev, { x: m_worldPositionX, z: m_worldPositionZ }];
          if (newPath.length > 200 && learnedPath.length === 0) {
            const first = newPath[0];
            if (Math.sqrt(Math.pow(first.x - m_worldPositionX, 2) + Math.pow(first.z - m_worldPositionZ, 2)) < 20) {
              localStorage.setItem(`f1_track_${trackId}`, JSON.stringify(newPath));
              setLearnedPath(newPath);
            }
          }
          return newPath.slice(-2000);
        }
        return prev;
      });
    }
  }, [motionData, playerIndex, trackId, learnedPath.length]);

  const activePath = learnedPath.length > 0 ? learnedPath : currentPath;
  if (activePath.length < 2) return <div className="h-[200px] flex items-center justify-center font-black text-f1-gray tracking-widest text-[0.8rem]">📍 RECORDING...</div>;

  const xs = activePath.map(p => p.x);
  const zs = activePath.map(p => p.z);
  const minX = Math.min(...xs) - 50;
  const maxX = Math.max(...xs) + 50;
  const minZ = Math.min(...zs) - 50;
  const maxZ = Math.max(...zs) + 50;
  const width = maxX - minX;
  const height = maxZ - minZ;

  return (
    <div className="relative">
      <svg viewBox={`${minX} ${minZ} ${width} ${height}`} style={{ transform: 'scaleY(-1)' }} className="w-full h-auto max-h-[300px]">
        <polyline points={activePath.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#222" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={activePath.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#444" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        {motionData?.m_carMotionData.map((car, i) => {
          if (!allParticipants[i]) return null;
          const isPlayer = i === playerIndex;
          return (
            <circle key={i} cx={car.m_worldPositionX} cy={car.m_worldPositionZ} r={isPlayer ? 22 : 12} fill={isPlayer ? "#e10600" : "#888"} stroke="white" strokeWidth={isPlayer ? 4 : 0} />
          );
        })}
      </svg>
      <button className="absolute bottom-0 right-0 bg-white/5 border border-white/10 text-white font-black text-[0.6rem] px-2 py-1 rounded hover:bg-white/10 transition-colors" onClick={() => { localStorage.removeItem(`f1_track_${trackId}`); setLearnedPath([]); setCurrentPath([]); }}>RESET</button>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  telemetry, lapData, carStatus, carDamage, allParticipants, allLapData, sessionHistory, motionData, sessionData, playerIndex 
}) => {
  const [activeTab, setActiveTab] = React.useState<'telemetry' | 'sectors' | 'engineering' | 'analysis'>('telemetry');
  const [selectedCarIndex, setSelectedCarIndex] = React.useState<number>(playerIndex);

  // Telemetry accumulation
  const [currentLapPoints, setCurrentLapPoints] = React.useState<TelemetryPoint[]>([]);
  const [bestLapPoints, setBestLapPoints] = React.useState<TelemetryPoint[]>([]);
  const lastDistanceRef = React.useRef(0);
  const lastLapNumRef = React.useRef(0);

  React.useEffect(() => { setSelectedCarIndex(playerIndex); }, [playerIndex]);

  // Handle Telemetry Collection
  React.useEffect(() => {
    if (!telemetry || !lapData) return;

    const currentDist = (lapData as any).m_lapDistance;
    const currentLap = (lapData as any).m_currentLapNum;

    // Detect Lap Change
    if (currentLap !== lastLapNumRef.current) {
      if (currentLapPoints.length > 100) {
        // Simple logic: if this was a full lap and we don't have a best yet, or it's faster
        // (Improving this would require checking lap times, but for now we'll just save it)
        setBestLapPoints(currentLapPoints);
      }
      setCurrentLapPoints([]);
      lastLapNumRef.current = currentLap;
      lastDistanceRef.current = 0;
      return;
    }

    // Detect Reset (Back to pits or restart)
    if (currentDist < lastDistanceRef.current - 100) {
      setCurrentLapPoints([]);
      lastDistanceRef.current = 0;
      return;
    }

    // Add point every 5 meters to keep it efficient
    if (currentDist > lastDistanceRef.current + 5) {
      setCurrentLapPoints(prev => [...prev, {
        distance: currentDist,
        throttle: (telemetry as any).m_throttle,
        brake: (telemetry as any).m_brake
      }]);
      lastDistanceRef.current = currentDist;
    }
  }, [telemetry, lapData, currentLapPoints.length]);

  if (!telemetry || !lapData) return <div className="dashboard-empty"><div className="f1-loader"></div><h2>WAITING...</h2></div>;

  const leaderboard = allLapData
    .map((ld, index) => ({ ld, index }))
    .filter(item => item.ld !== null && item.index < 20)
    .sort((a, b) => ((a.ld as any).m_carPosition ?? 99) - ((b.ld as any).m_carPosition ?? 99));

  const history = sessionHistory[selectedCarIndex];
  const lapsList = history?.m_lapHistoryData.slice(0, history.m_numLaps).reverse() || [];

  const getSessionBests = () => {
    let s1 = Infinity, s2 = Infinity, s3 = Infinity, lap = Infinity;
    Object.values(sessionHistory).forEach(sh => {
      sh.m_lapHistoryData.slice(0, sh.m_numLaps).forEach(l => {
        if (l.m_lapValidBitFlags & 0x01) {
          if (l.m_sector1TimeInMS > 0) s1 = Math.min(s1, l.m_sector1TimeInMS);
          if (l.m_sector2TimeInMS > 0) s2 = Math.min(s2, l.m_sector2TimeInMS);
          if (l.m_sector3TimeInMS > 0) s3 = Math.min(s3, l.m_sector3TimeInMS);
          if (l.m_lapTimeInMS > 0) lap = Math.min(lap, l.m_lapTimeInMS);
        }
      });
    });
    return { s1: s1 === Infinity ? 0 : s1, s2: s2 === Infinity ? 0 : s2, s3: s3 === Infinity ? 0 : s3, lap: lap === Infinity ? 0 : lap };
  };
  const sessionBests = getSessionBests();

  const getPersonalBests = () => {
    if (!history) return { s1: 0, s2: 0, s3: 0, lap: 0 };
    const valid = history.m_lapHistoryData.slice(0, history.m_numLaps).filter(l => l.m_lapValidBitFlags & 0x01);
    return {
      s1: Math.min(...valid.map(l => l.m_sector1TimeInMS).filter(t => t > 0)) || 0,
      s2: Math.min(...valid.map(l => l.m_sector2TimeInMS).filter(t => t > 0)) || 0,
      s3: Math.min(...valid.map(l => l.m_sector3TimeInMS).filter(t => t > 0)) || 0,
      lap: Math.min(...valid.map(l => l.m_lapTimeInMS).filter(t => t > 0)) || 0,
    };
  };
  const personalBests = getPersonalBests();

  const getTimeColor = (time: number, personalBest: number, sessionBest: number) => {
    if (!time || time === 0) return "";
    if (sessionBest > 0 && time <= sessionBest) return "time-purple";
    if (personalBest > 0 && time <= personalBest) return "time-green";
    return "";
  };

  const scStatus = sessionData?.m_safetyCarStatus;
  const progressPct = Math.min(100, Math.max(0, ((lapData as any).m_lapDistance / (sessionData?.m_trackLength || 1)) * 100));

  return (
    <div className="app-container">
      <header className="sticky top-0 z-[1000] h-[60px] px-[30px] flex justify-between items-center bg-[linear-gradient(90deg,#15151e_0%,#1a1a24_50%,#15151e_100%)] text-white border-b-2 border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-f1-red">
        <div className="flex items-center gap-[25px]">
          <h1 className="m-0 text-[1.4rem] font-black italic uppercase tracking-[-1px] text-white">F1 LIVE</h1>
          {allParticipants[playerIndex] && (
            <div className="bg-f1-red px-3 py-1 font-black text-[0.75rem] -skew-x-15 inline-block tracking-wider">
              {(allParticipants[playerIndex] as any).m_name} #{(allParticipants[playerIndex] as any).m_raceNumber}
            </div>
          )}
        </div>
        
        <div className="flex h-full gap-[5px]">
          <button className={`bg-transparent border-none text-f1-gray px-5 font-black text-[0.75rem] uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center relative hover:text-white hover:bg-white/5 ${activeTab === 'telemetry' ? 'text-white bg-white/5 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-f1-red' : ''}`} onClick={() => setActiveTab('telemetry')}>DASHBOARD</button>
          <button className={`bg-transparent border-none text-f1-gray px-5 font-black text-[0.75rem] uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center relative hover:text-white hover:bg-white/5 ${activeTab === 'engineering' ? 'text-white bg-white/5 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-f1-red' : ''}`} onClick={() => setActiveTab('engineering')}>ENGINEERING</button>
          <button className={`bg-transparent border-none text-f1-gray px-5 font-black text-[0.75rem] uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center relative hover:text-white hover:bg-white/5 ${activeTab === 'analysis' ? 'text-white bg-white/5 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-f1-red' : ''}`} onClick={() => setActiveTab('analysis')}>ANALYSIS</button>
          <button className={`bg-transparent border-none text-f1-gray px-5 font-black text-[0.75rem] uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center relative hover:text-white hover:bg-white/5 ${activeTab === 'sectors' ? 'text-white bg-white/5 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-f1-red' : ''}`} onClick={() => setActiveTab('sectors')}>LAP HISTORY</button>
        </div>

        <div className="px-[15px] py-1.5 rounded bg-white/5 border border-white/10 font-black text-[0.7rem] flex items-center gap-2 tracking-wider">
          <i className="w-2 h-2 bg-red-600 rounded-full inline-block shadow-[0_0_10px_#ff0000] animate-pulse"></i>
          {scStatus > 0 ? (scStatus === 1 ? 'SAFETY CAR' : 'VSC ACTIVE') : 'TRACK CLEAR'}
        </div>
      </header>

      <div className="w-full h-[3px] bg-[#111]"><div className="h-full bg-white shadow-[0_0_10px_white]" style={{ width: `${progressPct}%` }}></div></div>

      <div className="flex flex-wrap gap-[15px] p-[15px]">
        <div className="flex-[1_1_340px]">
          <div className="f1-section leaderboard h-full">
            <h3 className="bg-f1-red/10 px-3 py-2 -mx-4 -mt-4 mb-3 border-b border-white/10 uppercase font-black text-[0.75rem] text-f1-gray">🏆 LIVE STANDINGS</h3>
            <div className="flex-1 overflow-y-auto -mx-[5px]">
              <table className="w-full border-separate border-spacing-y-0.5 text-white">
                <tbody>
                  {leaderboard.map(({ ld, index }) => (
                    <tr 
                      key={index} 
                      className={`
                        bg-white/[0.02] cursor-pointer transition-all duration-100 hover:bg-white/[0.08]
                        ${index === playerIndex ? 'bg-[linear-gradient(90deg,rgba(225,6,0,0.4)_0%,rgba(225,6,0,0.1)_100%)]! shadow-[inset_4px_0_0_#e10600] relative' : ''} 
                        ${index === selectedCarIndex ? 'bg-f1-yellow/10! shadow-[inset_4px_0_0_#ffb800]' : ''}
                      `} 
                      onClick={() => setSelectedCarIndex(index)}
                    >
                      <td className={`w-10 bg-black/30 text-center font-black text-white [clip-path:polygon(0_0,100%_0,80%_100%,0%_100%)] py-2.5 px-2 text-[0.85rem] ${index === playerIndex ? 'bg-f1-red!' : ''}`}>{(ld as any).m_carPosition}</td>
                      <td className="pl-[15px] py-2.5 px-2 text-[0.85rem] font-bold">{(allParticipants[index] as any)?.m_name || `CAR ${index}`}</td>
                      <td className="py-2.5 px-2 text-[0.8rem] font-mono tracking-tighter text-right">{formatTime((ld as any).m_currentLapTimeInMS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex-[2_1_500px] order-[-1] lg:order-none">
          {activeTab === 'telemetry' && (
            <>
              <div className="bg-[linear-gradient(180deg,#1a1a24_0%,#050508_100%)] rounded-[15px] p-6 mb-[15px] border border-[#333] flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
                {/* HUD Top Lights Decor */}
                <div className="absolute top-0 w-1/2 h-1 bg-white/10 blur-sm"></div>
                
                <RPMBar rpm={(telemetry as any).m_engineRPM} maxRpm={(carStatus as any)?.m_maxRPM} />

                <div className="w-full flex justify-between items-center mb-4 px-4">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[0.6rem] text-f1-gray font-black tracking-[4px] mb-[-10px] uppercase">GEAR</span>
                    <div className="text-[10rem] font-black text-white leading-none italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] filter contrast-125">
                      {(() => { const g = (telemetry as any).m_gear; return g === 0 ? 'N' : g === -1 ? 'R' : g; })()}
                    </div>
                  </div>

                  <div className="h-24 w-[2px] bg-white/5 mx-4"></div>

                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-[0.6rem] text-f1-gray font-black tracking-[4px] mb-[-5px] uppercase">SPEED</span>
                    <span className="text-[6rem] font-black leading-none tracking-tighter text-white">{(telemetry as any).m_speed}</span>
                    <span className="text-[1.2rem] text-f1-red font-black mt-[-5px]">KM/H</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-3 items-center">
                  <div className="flex flex-col">
                    <label className="text-[0.6rem] text-f1-gray font-black uppercase tracking-wider mb-1">THROTTLE</label>
                    <div className="h-3.5 bg-black border border-[#333]"><div className="h-full bg-f1-green transition-[width] duration-100" style={{ width: `${(telemetry as any).m_throttle * 100}%` }}></div></div>
                  </div>
                  <div className="flex justify-center">
                    <GForceRadar lateral={motionData?.m_carMotionData[playerIndex]?.m_gForceLateral || 0} longitudinal={motionData?.m_carMotionData[playerIndex]?.m_gForceLongitudinal || 0} />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[0.6rem] text-f1-gray font-black uppercase tracking-wider mb-1 text-right">BRAKE</label>
                    <div className="h-3.5 bg-black border border-[#333]"><div className="h-full bg-red-600 transition-[width] duration-100" style={{ width: `${(telemetry as any).m_brake * 100}%` }}></div></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-[15px]">
                <div className="f1-section flex-1 min-w-[200px]">
                  <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">🗺️ TRACK RADAR</h3>
                  <CircuitMap motionData={motionData} allParticipants={allParticipants} playerIndex={playerIndex} trackId={sessionData?.m_trackId ?? -1} />
                </div>
                <div className="f1-section flex-1 min-w-[200px]">
                  <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">🛞 TYRE THERMALS</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {((telemetry as any).m_tyresSurfaceTemperature || []).map((temp: number, i: number) => (
                      <div key={i} className="bg-white/[0.02] p-3 text-center rounded border-b-2" style={{ borderBottomColor: temp > 100 ? 'red' : temp > 90 ? 'orange' : 'transparent' }}>
                        <div className="text-[0.6rem] text-[#666] font-bold">{['RL', 'RR', 'FL', 'FR'][i]}</div>
                        <div className="text-[1.2rem] font-black">{temp}°C</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'engineering' && (
            <div className="f1-section flex-1">
              <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">🏎️ BRAKE TEMPERATURES (OPTIMAL: 400°C - 800°C)</h3>
              <div className="grid grid-cols-2 gap-5 max-w-[400px] mx-auto mb-8">
                {[2, 3, 0, 1].map((i) => {
                  const temp = (telemetry as any).m_brakesTemperature?.[i] || 0;
                  const label = ['FRONT LEFT', 'FRONT RIGHT', 'REAR LEFT', 'REAR RIGHT'][i];
                  return (
                    <div key={i} className="bg-white/[0.03] p-[15px] rounded-lg flex flex-col items-center border border-[#222]">
                      <label className="text-[0.6rem] text-f1-gray font-black mb-2.5 uppercase tracking-wider">{label}</label>
                      <div className="w-2.5 h-20 bg-black rounded-full overflow-hidden relative mb-2">
                        <div 
                          className="absolute bottom-0 w-full transition-[height,background-color] duration-300" 
                          style={{ 
                            height: `${Math.min((temp / 1000) * 100, 100)}%`, 
                            backgroundColor: temp > 850 ? '#ff0000' : temp > 400 ? '#00ff00' : '#00ffff' 
                          }}
                        ></div>
                      </div>
                      <span className="text-[0.9rem] font-black font-mono" style={{ color: temp > 850 ? 'red' : temp > 400 ? '#00ff00' : '#00ffff' }}>{temp}°C</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-center p-[30px] bg-[radial-gradient(circle,#1a1a24_0%,#050508_100%)] rounded-[15px] border border-[#333] mt-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-[linear-gradient(90deg,transparent,#e10600,transparent)]">
                <label className="text-[0.7rem] text-[#666] font-black tracking-[2px] uppercase">CORE ENGINE THERMALS</label>
                <div className="text-[5rem] font-black leading-none shadow-[0_0_30px_rgba(255,255,255,0.1)] mt-2" style={{ color: (telemetry as any).m_engineTemperature > 125 ? '#e10600' : 'white' }}>
                  {(telemetry as any).m_engineTemperature}°C
                </div>
                <div className="text-[0.7rem] mt-2.5 font-black uppercase" style={{ color: (telemetry as any).m_engineTemperature > 110 ? '#ffb800' : '#666' }}>
                  {(telemetry as any).m_engineTemperature > 125 ? '⚠️ OVERHEATING' : (telemetry as any).m_engineTemperature > 110 ? '📈 HIGH TEMPERATURE' : '🟢 OPERATING NOMINAL'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="f1-section flex-1">
              <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">📊 TELEMETRY TRACE (THROTTLE & BRAKE)</h3>
              <div className="mb-[15px] text-f1-gray text-[0.8rem]">
                Real-time input analysis compared to your best lap of the session.
              </div>
              <TelemetryChart 
                currentLapPoints={currentLapPoints} 
                bestLapPoints={bestLapPoints} 
                trackLength={sessionData?.m_trackLength || 5000} 
              />
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div className="bg-[#0a0a0e] p-[15px] rounded-lg border-l-4 border-[#00ff00]">
                  <label className="text-[0.6rem] text-[#666] block uppercase font-black">AVG THROTTLE</label>
                  <span className="text-[1.5rem] font-black">
                    {currentLapPoints.length > 0 ? (currentLapPoints.reduce((acc, p) => acc + p.throttle, 0) / currentLapPoints.length * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="bg-[#0a0a0e] p-[15px] rounded-lg border-l-4 border-[#ff0000]">
                  <label className="text-[0.6rem] text-[#666] block uppercase font-black">AVG BRAKE</label>
                  <span className="text-[1.5rem] font-black">
                    {currentLapPoints.length > 0 ? (currentLapPoints.reduce((acc, p) => acc + p.brake, 0) / currentLapPoints.length * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="f1-section flex-1">
              <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⏱️ DETAILED LAP HISTORY - {(allParticipants[selectedCarIndex] as any)?.m_name}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="text-f1-gray text-[0.7rem] uppercase font-black text-left border-b border-white/5"><th className="p-2.5">LAP</th><th className="p-2.5">SECTOR 1</th><th className="p-2.5">SECTOR 2</th><th className="p-2.5">SECTOR 3</th><th className="p-2.5">LAP TIME</th></tr></thead>
                  <tbody>
                    {lapsList.map((lap, i) => (
                      <tr key={i} className={`border-b border-white/[0.03] ${(lap as any).m_lapValidBitFlags & 0x01 ? '' : 'opacity-40 grayscale'}`}>
                        <td className="p-2.5 font-black text-f1-gray">#{history.m_numLaps - i}</td>
                        <td className={`p-2.5 ${getTimeColor((lap as any).m_sector1TimeInMS, personalBests.s1, sessionBests.s1)}`}>{formatTime((lap as any).m_sector1TimeInMS)}</td>
                        <td className={`p-2.5 ${getTimeColor((lap as any).m_sector2TimeInMS, personalBests.s2, sessionBests.s2)}`}>{formatTime((lap as any).m_sector2TimeInMS)}</td>
                        <td className={`p-2.5 ${getTimeColor((lap as any).m_sector3TimeInMS, personalBests.s3, sessionBests.s3)}`}>{formatTime((lap as any).m_sector3TimeInMS)}</td>
                        <td className={`p-2.5 font-black ${getTimeColor((lap as any).m_lapTimeInMS, personalBests.lap, sessionBests.lap)}`}>{formatTime((lap as any).m_lapTimeInMS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex-[1_1_340px]">
          <div className="f1-section">
            <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⏱️ LIVE TIMING</h3>
            <div className="flex justify-between py-2 border-b border-white/[0.03]"><span className="text-f1-gray font-bold text-[0.8rem]">POSITION</span><span className="font-black text-white">{(lapData as any).m_carPosition} / 20</span></div>
            <div className="flex justify-between py-2 border-b border-white/[0.03]"><span className="text-f1-gray font-bold text-[0.8rem]">CURRENT LAP</span><span className="font-black text-white">{(lapData as any).m_currentLapNum}</span></div>
            <div className="flex justify-between py-2 border-b border-white/[0.03] bg-white/[0.02] px-2 -mx-2"><span className="text-f1-gray font-bold text-[0.8rem]">LAST LAP</span><span className="font-black text-white" style={{color: getTimeColor((lapData as any).m_lastLapTimeInMS, personalBests.lap, sessionBests.lap)}}>{formatTime((lapData as any).m_lastLapTimeInMS)}</span></div>
          </div>

          {carStatus && (
            <div className="f1-section">
              <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⚡ POWER & TIRES</h3>
              <div className="mb-4 flex flex-col gap-1"><label className="text-[0.65rem] text-f1-gray font-black uppercase">⛽ FUEL</label><div className="text-[1.1rem] font-black">{(carStatus as any).m_fuelInTank.toFixed(2)} KG <span className="opacity-50 text-[0.8rem]">{(carStatus as any).m_fuelRemainingLaps.toFixed(1)} LAPS</span></div></div>
              <div className="mb-4 flex flex-col gap-1">
                <label className="text-[0.65rem] text-f1-gray font-black uppercase">🔋 ERS BATT</label>
                <div className="h-3.5 bg-black border border-[#333]"><div className="h-full transition-all" style={{ width: `${((carStatus as any).m_ersStoreEnergy / 4000000) * 100}%`, backgroundColor: (carStatus as any).m_ersDeployMode === 3 ? '#fff200' : '#b131ff' }}></div></div>
                <div className="flex justify-between text-[0.7rem] font-black mt-1">
                  <span>{Math.round(((carStatus as any).m_ersStoreEnergy / 4000000) * 100)}%</span>
                  <span style={{color: (carStatus as any).m_ersDeployMode === 3 ? '#fff200' : 'white'}}>
                    {['OFF', 'MED', 'HOTLAP', 'OVTAKE'][(carStatus as any).m_ersDeployMode]}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1"><label className="text-[0.65rem] text-f1-gray font-black uppercase">🛞 COMPOUND</label><div className="text-[1.1rem] font-black">{(carStatus as any).m_tyresAgeLaps} LAPS - {['SOFT','MED','HARD','WET'][(carStatus as any).m_visualTyreCompound - 16] || '---'}</div></div>
            </div>
          )}

          <div className="f1-section">
            <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⚠️ AERO DAMAGE</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between"><span className="text-f1-gray font-bold text-[0.8rem]">FRONT WING</span><span className="font-black">L: {(carDamage as any)?.m_frontLeftWingDamage}% | R: {(carDamage as any)?.m_frontRightWingDamage}%</span></div>
              <div className="flex justify-between pt-2 border-t border-white/[0.03]"><span className="text-f1-gray font-bold text-[0.8rem]">REAR WING</span><span className="font-black">{(carDamage as any)?.m_rearWingDamage}%</span></div>
            </div>
          </div>

          <div className="f1-section">
            <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">☁️ SESSION DATA</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center"><label className="text-[0.6rem] text-f1-gray font-black mb-1">🌡️ TRACK</label><span className="font-black text-[1.1rem]">{sessionData?.m_trackTemperature || '--'}°C</span></div>
              <div className="flex flex-col items-center"><label className="text-[0.6rem] text-f1-gray font-black mb-1">💨 AIR</label><span className="font-black text-[1.1rem]">{sessionData?.m_airTemperature || '--'}°C</span></div>
              <div className="flex flex-col items-center"><label className="text-[0.6rem] text-f1-gray font-black mb-1">🌧️ RAIN</label><span className="font-black text-[1.1rem]">{sessionData?.m_weatherForecastSamples?.[0]?.m_rainPercentage || '0'}%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
