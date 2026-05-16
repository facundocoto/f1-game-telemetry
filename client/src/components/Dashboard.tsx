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
}

export interface LapData {
  lastLapTimeInMS: number;
  currentLapTimeInMS: number;
  sector1TimeInMS: number;
  sector2TimeInMS: number;
  carPosition: number;
  currentLapNum: number;
}

export interface CarStatus {
  fuelInTank: number;
  fuelRemainingLaps: number;
  ersStoreEnergy: number;
  ersDeployMode: number;
  actualTyreCompound: number;
  visualTyreCompound: number;
  tyresAgeLaps: number;
}

export interface CarDamage {
  tyresWear: number[];
  frontLeftWingDamage: number;
  frontRightWingDamage: number;
  rearWingDamage: number;
}

export interface Participant {
  name: string;
  teamId: number;
  raceNumber: number;
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

interface DashboardProps {
  telemetry: TelemetryData | null;
  lapData: LapData | null;
  carStatus: CarStatus | null;
  carDamage: CarDamage | null;
  allParticipants: (Participant | null)[];
  allLapData: (LapData | null)[];
  sessionHistory: Record<number, SessionHistory>;
  playerIndex: number;
}

const formatTime = (ms: number) => {
  if (!ms || ms === 0) return "---";
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3);
  return `${m}:${s.padStart(6, '0')}`;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  telemetry, lapData, carStatus, carDamage, allParticipants, allLapData, sessionHistory, playerIndex 
}) => {
  const [activeTab, setActiveTab] = React.useState<'telemetry' | 'sectors'>('telemetry');
  const [selectedCarIndex, setSelectedCarIndex] = React.useState<number>(playerIndex);

  React.useEffect(() => {
    setSelectedCarIndex(playerIndex);
  }, [playerIndex]);

  if (!telemetry || !lapData) {
    return (
      <div className="dashboard-empty">
        <h2>Waiting for telemetry data...</h2>
        <p>Make sure your Xbox is configured and the game is running.</p>
      </div>
    );
  }

  // Get top 10 leaderboard
  const leaderboard = allLapData
    .map((ld, index) => ({ ld, index }))
    .filter(item => item.ld !== null && allParticipants[item.index] !== null)
    .sort((a, b) => (a.ld?.carPosition || 99) - (b.ld?.carPosition || 99))
    .slice(0, 10);

  const selectedHistory = sessionHistory[selectedCarIndex];
  const laps = selectedHistory ? selectedHistory.m_lapHistoryData.slice(0, selectedHistory.m_numLaps).reverse() : [];

  return (
    <div className="dashboard-v2">
      <div className="left-panel">
        <div className="tabs-nav">
          <button className={activeTab === 'telemetry' ? 'active' : ''} onClick={() => setActiveTab('telemetry')}>TELEMETRY</button>
          <button className={activeTab === 'sectors' ? 'active' : ''} onClick={() => setActiveTab('sectors')}>SECTORS</button>
        </div>

        {/* Leaderboard */}
        <div className="section leaderboard">
          <h3>LEADERBOARD</h3>
          <table>
            <thead>
              <tr>
                <th>POS</th>
                <th>DRIVER</th>
                <th>LAP</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(({ ld, index }) => (
                <tr 
                  key={index} 
                  className={`${index === playerIndex ? 'player-row' : ''} ${index === selectedCarIndex ? 'selected-row' : ''}`}
                  onClick={() => setSelectedCarIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{ld?.carPosition}</td>
                  <td>{allParticipants[index]?.name || `Car ${index}`}</td>
                  <td>{ld?.currentLapNum}</td>
                  <td>{formatTime(ld?.currentLapTimeInMS || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeTab === 'telemetry' && carDamage && (
          <div className="section damage">
            <h3>CAR CONDITION</h3>
            <div className="damage-grid">
              <div className="wing-damage">
                <div>Front Wing: L {carDamage.frontLeftWingDamage}% | R {carDamage.frontRightWingDamage}%</div>
                <div>Rear Wing: {carDamage.rearWingDamage}%</div>
              </div>
              <div className="tyre-wear-grid">
                {carDamage.tyresWear.map((wear, i) => (
                  <div key={i} className="tyre-wear-item">
                    <span>{['RL', 'RR', 'FL', 'FR'][i]}</span>
                    <div className="wear-bar">
                      <div className="wear-fill" style={{ width: `${wear}%`, backgroundColor: wear > 50 ? 'red' : 'green' }}></div>
                    </div>
                    <span>{Math.round(wear)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="center-panel">
        {activeTab === 'telemetry' ? (
          <>
            <div className="main-stats">
              <div className="stat-card gear">
                <span className="label">GEAR</span>
                <span className="value">{telemetry.m_gear === 0 ? 'N' : telemetry.m_gear === -1 ? 'R' : telemetry.m_gear}</span>
              </div>
              <div className="speed-rpm">
                <div className="stat-card speed">
                  <span className="value">{telemetry.m_speed}</span>
                  <span className="unit">KM/H</span>
                </div>
                <div className="stat-card rpm">
                  <span className="value">{telemetry.m_engineRPM}</span>
                  <span className="unit">RPM</span>
                </div>
              </div>
            </div>

            <div className="inputs-v2">
              <div className="input-group">
                <label>Throttle</label>
                <div className="progress-bg"><div className="progress-fill throttle" style={{ width: `${telemetry.m_throttle * 100}%` }}></div></div>
              </div>
              <div className="input-group">
                <label>Brake</label>
                <div className="progress-bg"><div className="progress-fill brake" style={{ width: `${telemetry.m_brake * 100}%` }}></div></div>
              </div>
            </div>

            <div className="section tyres">
              <h3>TYRES</h3>
              <div className="tyre-grid">
                {telemetry.m_tyresSurfaceTemperature.map((temp, i) => (
                  <div key={i} className="tyre-card">
                    <div className="tyre-label">{['RL', 'RR', 'FL', 'FR'][i]}</div>
                    <div className="tyre-temp">{temp}°C</div>
                    <div className="tyre-press">{telemetry.m_tyresPressure[i].toFixed(1)} PSI</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="section sectors-history">
            <h3>LAP HISTORY - {allParticipants[selectedCarIndex]?.name || `Car ${selectedCarIndex}`}</h3>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>LAP</th>
                    <th>S1</th>
                    <th>S2</th>
                    <th>S3</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {laps.length > 0 ? laps.map((lap, i) => (
                    <tr key={i} className={lap.m_lapValidBitFlags & 0x01 ? '' : 'invalid-lap'}>
                      <td>{selectedHistory.m_numLaps - i}</td>
                      <td>{formatTime(lap.m_sector1TimeInMS)}</td>
                      <td>{formatTime(lap.m_sector2TimeInMS)}</td>
                      <td>{formatTime(lap.m_sector3TimeInMS)}</td>
                      <td className="total-time">{formatTime(lap.m_lapTimeInMS)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No history for this car yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="right-panel">
        {/* Lap Times */}
        <div className="section lap-times">
          <h3>TIMING</h3>
          <div className="timing-row">
            <span>POSITION</span>
            <span className="val">{lapData.carPosition}</span>
          </div>
          <div className="timing-row">
            <span>CURRENT LAP</span>
            <span className="val">{lapData.currentLapNum}</span>
          </div>
          <div className="timing-row highlight">
            <span>LAST LAP</span>
            <span className="val">{formatTime(lapData.lastLapTimeInMS)}</span>
          </div>
          <div className="timing-row">
            <span>S1</span>
            <span className="val">{formatTime(lapData.sector1TimeInMS)}</span>
          </div>
          <div className="timing-row">
            <span>S2</span>
            <span className="val">{formatTime(lapData.sector2TimeInMS)}</span>
          </div>
        </div>

        {/* Fuel & ERS */}
        {carStatus && (
          <div className="section status">
            <h3>ENERGY & FUEL</h3>
            <div className="status-item">
              <label>FUEL</label>
              <div className="val">{carStatus.fuelInTank.toFixed(2)} kg ({carStatus.fuelRemainingLaps.toFixed(1)} laps)</div>
            </div>
            <div className="status-item">
              <label>ERS ENERGY</label>
              <div className="ers-bar-bg">
                <div className="ers-bar-fill" style={{ width: `${(carStatus.ersStoreEnergy / 4000000) * 100}%` }}></div>
              </div>
              <div className="val">{Math.round((carStatus.ersStoreEnergy / 4000000) * 100)}%</div>
            </div>
            <div className="status-item">
              <label>TYRE AGE</label>
              <div className="val">{carStatus.tyresAgeLaps} Laps ({carStatus.visualTyreCompound === 16 ? 'S' : carStatus.visualTyreCompound === 17 ? 'M' : 'H'})</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
