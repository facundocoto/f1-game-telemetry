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

const RPMBar: React.FC<{ rpm: number; maxRpm: number }> = ({ rpm, maxRpm }) => {
  const percentage = Math.min((rpm / (maxRpm || 13500)) * 100, 100);
  return (
    <div className="rpm-bar-container">
      <div 
        className="rpm-bar-fill" 
        style={{ 
          width: `${percentage}%`,
          backgroundColor: percentage > 95 ? '#b131ff' : (percentage > 85 ? '#ff0000' : '')
        }}
      ></div>
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
    <div className="gforce-visualizer">
      <svg width={size} height={size}>
        <circle cx={centerX} cy={centerY} r="35" fill="none" stroke="#444" strokeWidth="1" />
        <circle cx={centerX} cy={centerY} r="17.5" fill="none" stroke="#222" strokeWidth="1" />
        <line x1="0" y1={centerY} x2={size} y2={centerY} stroke="#222" strokeWidth="1" />
        <line x1={centerX} y1="0" x2={centerX} y2={size} stroke="#222" strokeWidth="1" />
        <circle cx={dotX} cy={dotY} r="5" fill="var(--f1-red)" />
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
  if (activePath.length < 2) return <div className="map-placeholder">📍 RECORDING...</div>;

  const xs = activePath.map(p => p.x);
  const zs = activePath.map(p => p.z);
  const minX = Math.min(...xs) - 50;
  const maxX = Math.max(...xs) + 50;
  const minZ = Math.min(...zs) - 50;
  const maxZ = Math.max(...zs) + 50;
  const width = maxX - minX;
  const height = maxZ - minZ;

  return (
    <div className="circuit-map">
      <svg viewBox={`${minX} ${minZ} ${width} ${height}`} style={{ transform: 'scaleY(-1)' }}>
        <polyline points={activePath.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#222" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={activePath.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#444" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        {motionData?.m_carMotionData.map((car, i) => {
          if (!allParticipants[i]) return null;
          const isPlayer = i === playerIndex;
          return (
            <circle key={i} cx={car.m_worldPositionX} cy={car.m_worldPositionZ} r={isPlayer ? 22 : 12} fill={isPlayer ? "var(--f1-red)" : "#888"} stroke="white" strokeWidth={isPlayer ? 4 : 0} />
          );
        })}
      </svg>
      <button className="reset-map-btn" onClick={() => { localStorage.removeItem(`f1_track_${trackId}`); setLearnedPath([]); setCurrentPath([]); }}>RESET</button>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  telemetry, lapData, carStatus, carDamage, allParticipants, allLapData, sessionHistory, motionData, sessionData, playerIndex 
}) => {
  const [activeTab, setActiveTab] = React.useState<'telemetry' | 'sectors' | 'engineering'>('telemetry');
  const [selectedCarIndex, setSelectedCarIndex] = React.useState<number>(playerIndex);

  React.useEffect(() => { setSelectedCarIndex(playerIndex); }, [playerIndex]);

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
      <header className="app-header">
        <div className="title-group">
          <h1>F1 LIVE</h1>
          {allParticipants[playerIndex] && <span className="driver-name">{(allParticipants[playerIndex] as any).m_name} #{(allParticipants[playerIndex] as any).m_raceNumber}</span>}
        </div>
        
        <div className="nav-tabs-wrapper">
          <button className={`nav-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('telemetry')}>DASHBOARD</button>
          <button className={`nav-tab-btn ${activeTab === 'engineering' ? 'active' : ''}`} onClick={() => setActiveTab('engineering')}>ENGINEERING</button>
          <button className={`nav-tab-btn ${activeTab === 'sectors' ? 'active' : ''}`} onClick={() => setActiveTab('sectors')}>LAP HISTORY</button>
        </div>

        <div className="session-status" style={{fontSize: '0.7rem', fontWeight: 900}}>
          {scStatus > 0 ? (scStatus === 1 ? '⚠️ SAFETY CAR' : '⚠️ VSC ACTIVE') : '🟢 TRACK CLEAR'}
        </div>
      </header>

      <div className="track-progress-container"><div className="track-progress-fill" style={{ width: `${progressPct}%` }}></div></div>

      <div className="dashboard-v2">
        <div className="left-panel">
          <div className="section leaderboard">
            <h3>🏆 LIVE STANDINGS</h3>
            <div className="leaderboard-container">
              <table>
                <tbody>
                  {leaderboard.map(({ ld, index }) => (
                    <tr key={index} className={`${index === playerIndex ? 'player-row' : ''} ${index === selectedCarIndex ? 'selected-row' : ''}`} onClick={() => setSelectedCarIndex(index)}>
                      <td>{(ld as any).m_carPosition}</td>
                      <td>{(allParticipants[index] as any)?.m_name || `CAR ${index}`}</td>
                      <td style={{textAlign: 'right'}}>{formatTime((ld as any).m_currentLapTimeInMS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="center-panel">
          {activeTab === 'telemetry' && (
            <>
              <div className="core-hud-container">
                <div className="steering-wheel-top">
                  <div className="gear-display">
                    {(() => { const g = (telemetry as any).m_gear; return g === 0 ? 'N' : g === -1 ? 'R' : g; })()}
                  </div>
                  <div className="speed-info">
                    <span className="speed-value">{(telemetry as any).m_speed}</span>
                    <span className="speed-unit">KM/H</span>
                  </div>
                </div>
                
                <RPMBar rpm={(telemetry as any).m_engineRPM} maxRpm={(carStatus as any)?.m_maxRPM} />

                <div className="hud-bottom-row">
                  <div className="input-group">
                    <label>THROTTLE</label>
                    <div className="progress-bg"><div className="progress-fill throttle" style={{ width: `${(telemetry as any).m_throttle * 100}%` }}></div></div>
                  </div>
                  <div className="gforce-wrapper">
                    <GForceRadar lateral={motionData?.m_carMotionData[playerIndex]?.m_gForceLateral || 0} longitudinal={motionData?.m_carMotionData[playerIndex]?.m_gForceLongitudinal || 0} />
                  </div>
                  <div className="input-group">
                    <label style={{textAlign: 'right'}}>BRAKE</label>
                    <div className="progress-bg"><div className="progress-fill brake" style={{ width: `${(telemetry as any).m_brake * 100}%` }}></div></div>
                  </div>
                </div>
              </div>

              <div className="telemetry-lower">
                <div className="section"><h3>🗺️ TRACK RADAR</h3><CircuitMap motionData={motionData} allParticipants={allParticipants} playerIndex={playerIndex} trackId={sessionData?.m_trackId ?? -1} /></div>
                <div className="section">
                  <h3>🛞 TYRE THERMALS</h3>
                  <div className="tyre-grid">
                    {((telemetry as any).m_tyresSurfaceTemperature || []).map((temp: number, i: number) => (
                      <div key={i} className="tyre-card" style={{ borderBottom: `2px solid ${temp > 100 ? 'red' : temp > 90 ? 'orange' : 'transparent'}` }}>
                        <div style={{fontSize: '0.6rem', color: '#666'}}>{['RL', 'RR', 'FL', 'FR'][i]}</div>
                        <div style={{fontSize: '1.2rem', fontWeight: 900}}>{temp}°C</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'engineering' && (
            <div className="section" style={{flex: 1}}>
              <h3>🔥 SYSTEM THERMALS</h3>
              <div className="brake-grid" style={{height: '200px', margin: '20px 0'}}>
                {((telemetry as any).m_brakesTemperature || []).map((temp: number, i: number) => (
                  <div key={i} className="brake-card">
                    <label>{['RL', 'RR', 'FL', 'FR'][i]}</label>
                    <div className="brake-bar-bg"><div className="brake-bar-fill" style={{ height: `${(temp / 1000) * 100}%`, backgroundColor: temp > 800 ? '#ff0000' : temp > 400 ? '#ffb800' : '#00ffff' }}></div></div>
                    <span>{temp}°C</span>
                  </div>
                ))}
              </div>
              <div style={{textAlign: 'center', padding: '30px', background: '#0a0a0e', borderRadius: '10px', border: '1px solid #222'}}>
                <label style={{fontSize: '0.8rem', color: '#666'}}>🚀 ENGINE CORE TEMPERATURE</label>
                <div style={{ fontSize: '5rem', fontWeight: 900, color: (telemetry as any).m_engineTemperature > 120 ? 'red' : 'white' }}>{(telemetry as any).m_engineTemperature}°C</div>
              </div>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="section" style={{flex: 1}}>
              <h3>⏱️ DETAILED LAP HISTORY - {(allParticipants[selectedCarIndex] as any)?.m_name}</h3>
              <div className="history-table-container">
                <table className="wide-table">
                  <thead><tr><th>LAP</th><th>SECTOR 1</th><th>SECTOR 2</th><th>SECTOR 3</th><th>LAP TIME</th></tr></thead>
                  <tbody>
                    {lapsList.map((lap, i) => (
                      <tr key={i} className={(lap as any).m_lapValidBitFlags & 0x01 ? '' : 'invalid-lap'}>
                        <td style={{fontWeight: 900}}>#{history.m_numLaps - i}</td>
                        <td className={getTimeColor((lap as any).m_sector1TimeInMS, personalBests.s1, sessionBests.s1)}>{formatTime((lap as any).m_sector1TimeInMS)}</td>
                        <td className={getTimeColor((lap as any).m_sector2TimeInMS, personalBests.s2, sessionBests.s2)}>{formatTime((lap as any).m_sector2TimeInMS)}</td>
                        <td className={getTimeColor((lap as any).m_sector3TimeInMS, personalBests.s3, sessionBests.s3)}>{formatTime((lap as any).m_sector3TimeInMS)}</td>
                        <td className={`total-time ${getTimeColor((lap as any).m_lapTimeInMS, personalBests.lap, sessionBests.lap)}`} style={{fontWeight: 900}}>{formatTime((lap as any).m_lapTimeInMS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="section">
            <h3>⏱️ LIVE TIMING</h3>
            <div className="timing-row"><span>POSITION</span><span className="val">{(lapData as any).m_carPosition} / 20</span></div>
            <div className="timing-row"><span>CURRENT LAP</span><span className="val">{(lapData as any).m_currentLapNum}</span></div>
            <div className="timing-row highlight"><span>LAST LAP</span><span className="val" style={{color: getTimeColor((lapData as any).m_lastLapTimeInMS, personalBests.lap, sessionBests.lap)}}>{formatTime((lapData as any).m_lastLapTimeInMS)}</span></div>
          </div>

          {carStatus && (
            <div className="section">
              <h3>⚡ POWER & TIRES</h3>
              <div className="status-item"><label>⛽ FUEL</label><div className="val">{(carStatus as any).m_fuelInTank.toFixed(2)} KG <span style={{opacity: 0.5}}>{(carStatus as any).m_fuelRemainingLaps.toFixed(1)} LAPS</span></div></div>
              <div className="status-item">
                <label>🔋 ERS BATT</label>
                <div className="ers-bar-bg"><div className="ers-bar-fill" style={{ width: `${((carStatus as any).m_ersStoreEnergy / 4000000) * 100}%`, backgroundColor: (carStatus as any).m_ersDeployMode === 3 ? '#fff200' : '#b131ff' }}></div></div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 900}}>
                  <span>{Math.round(((carStatus as any).m_ersStoreEnergy / 4000000) * 100)}%</span>
                  <span style={{color: (carStatus as any).m_ersDeployMode === 3 ? '#fff200' : 'white'}}>
                    {['OFF', 'MED', 'HOTLAP', 'OVTAKE'][(carStatus as any).m_ersDeployMode]}
                  </span>
                </div>
              </div>
              <div className="status-item"><label>🛞 COMPOUND</label><div className="val">{(carStatus as any).m_tyresAgeLaps} LAPS - {['SOFT','MED','HARD','WET'][(carStatus as any).m_visualTyreCompound - 16] || '---'}</div></div>
            </div>
          )}

          <div className="section">
            <h3>⚠️ AERO DAMAGE</h3>
            <div className="damage-grid">
              <div style={{display: 'flex', justifyContent: 'space-between'}}><span>FRONT WING</span><span>L: {(carDamage as any)?.m_frontLeftWingDamage}% | R: {(carDamage as any)?.m_frontRightWingDamage}%</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px'}}><span>REAR WING</span><span>{(carDamage as any)?.m_rearWingDamage}%</span></div>
            </div>
          </div>

          <div className="section weather">
            <h3>☁️ SESSION DATA</h3>
            <div className="weather-grid">
              <div className="w-item"><label>🌡️ TRACK</label><span>{sessionData?.m_trackTemperature || '--'}°C</span></div>
              <div className="w-item"><label>💨 AIR</label><span>{sessionData?.m_airTemperature || '--'}°C</span></div>
              <div className="w-item"><label>🌧️ RAIN</label><span>{sessionData?.m_weatherForecastSamples?.[0]?.m_rainPercentage || '0'}%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
