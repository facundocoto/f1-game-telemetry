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
  speed: number;
  time: number;
}

interface DashboardProps {
  telemetry: TelemetryData | null;
  allTelemetry: (TelemetryData | null)[];
  lapData: LapData | null;
  carStatus: CarStatus | null;
  carDamage: CarDamage | null;
  allParticipants: (Participant | null)[];
  allLapData: (LapData | null)[];
  sessionHistory: Record<number, SessionHistory>;
  motionData: MotionData | null;
  sessionData: any | null;
  playerIndex: number;
  isConnected: boolean;
}

const formatTime = (ms: number) => {
  if (!ms || ms === 0) return "---";
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3);
  return `${m}:${s.padStart(6, '0')}`;
};

const ChartModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 lg:p-10">
      <div className="w-full h-full max-w-[1400px] flex flex-col bg-[#08080c] border border-white/10 rounded-[20px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="m-0 text-[1.2rem] font-black text-white uppercase tracking-[4px] italic">{title}</h3>
          <button 
            onClick={onClose}
            className="bg-f1-red text-white border-none px-6 py-2 rounded font-black cursor-pointer hover:bg-white hover:text-f1-red transition-all uppercase text-[0.8rem] tracking-widest"
          >
            CLOSE [ESC]
          </button>
        </div>
        <div className="flex-1 p-6 overflow-hidden flex items-center justify-center">
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const TelemetryChart: React.FC<{
  primaryPoints: TelemetryPoint[];
  secondaryPoints: TelemetryPoint[];
  trackLength: number;
  primaryLabel: string;
  secondaryLabel: string;
  isExpanded?: boolean;
  onExpand?: () => void;
}> = ({ primaryPoints, secondaryPoints, trackLength, primaryLabel, secondaryLabel, isExpanded, onExpand }) => {
  const [hoveredDist, setHoveredDist] = React.useState<number | null>(null);
  
  const width = 1000;
  const height = isExpanded ? 550 : 450;
  const padding = 35;
  const chartSpacing = isExpanded ? 40 : 30;
  const chartHeight = (height - padding * 2 - chartSpacing * 2) / 3;

  const xScale = (dist: number) => (dist / (trackLength || 1)) * (width - padding * 2) + padding;

  const findClosest = (points: TelemetryPoint[], targetDist: number) => {
    if (points.length === 0) return null;
    let low = 0, high = points.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].distance < targetDist) low = mid + 1;
      else if (points[mid].distance > targetDist) high = mid - 1;
      else return points[mid];
    }
    const p1 = points[Math.max(0, high)];
    const p2 = points[Math.min(points.length - 1, low)];
    if (!p1) return p2;
    if (!p2) return p1;
    return Math.abs(p1.distance - targetDist) < Math.abs(p2.distance - targetDist) ? p1 : p2;
  };

  const getDeltaAtDistance = (dist: number) => {
    const p1 = findClosest(primaryPoints, dist);
    const p2 = findClosest(secondaryPoints, dist);
    if (!p1 || !p2) return 0;
    return (p1.time - p2.time) / 1000;
  };

  const generatePath = (points: TelemetryPoint[], getY: (p: TelemetryPoint) => number, offset: number) => {
    if (points.length < 2) return "";
    return points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${xScale(p.distance)} ${offset + chartHeight - (getY(p) * chartHeight)}`
    ).join(' ');
  };

  const generateAreaPath = (points: TelemetryPoint[], getY: (p: TelemetryPoint) => number, offset: number) => {
    if (points.length < 2) return "";
    const path = generatePath(points, getY, offset);
    return `${path} L ${xScale(points[points.length - 1].distance)} ${offset + chartHeight} L ${xScale(points[0].distance)} ${offset + chartHeight} Z`;
  };

  const deltaPoints = Array.from({ length: 150 }).map((_, i) => {
    const dist = (i / 150) * trackLength;
    return { distance: dist, delta: getDeltaAtDistance(dist) };
  });

  const maxDelta = Math.max(0.5, Math.max(...deltaPoints.map(p => Math.abs(p.delta))));

  const generateDeltaPath = (type: 'positive' | 'negative' | 'line') => {
    if (deltaPoints.length < 2) return "";
    const baseY = padding + chartHeight / 2;
    
    if (type === 'line') {
      return deltaPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(p.distance)} ${baseY - (p.delta / maxDelta) * (chartHeight / 2)}`
      ).join(' ');
    }

    const points = deltaPoints.map(p => {
      const y = baseY - (p.delta / maxDelta) * (chartHeight / 2);
      // For area, we clamp to the base line depending on type
      const clampedY = type === 'positive' ? Math.min(baseY, y) : Math.max(baseY, y);
      return { x: xScale(p.distance), y: clampedY };
    });

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${path} L ${xScale(deltaPoints[deltaPoints.length - 1].distance)} ${baseY} L ${xScale(deltaPoints[0].distance)} ${baseY} Z`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (width + 45);
    const dist = ((x - padding) / (width - padding * 2)) * trackLength;
    setHoveredDist(Math.max(0, Math.min(trackLength, dist)));
  };

  const hoveredP1 = hoveredDist !== null ? findClosest(primaryPoints, hoveredDist) : null;
  const hoveredP2 = hoveredDist !== null ? findClosest(secondaryPoints, hoveredDist) : null;
  const hoveredDelta = hoveredDist !== null ? getDeltaAtDistance(hoveredDist) : 0;

  return (
    <div className="bg-[#08080c] border border-white/10 rounded-[15px] p-6 mt-4 w-full shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-f1-red to-transparent opacity-50"></div>
      
      {!isExpanded && onExpand && (
        <button 
          onClick={onExpand}
          className="absolute top-4 right-4 z-10 bg-f1-red text-white border-none px-4 py-2 rounded font-black cursor-pointer hover:scale-105 active:scale-95 transition-all uppercase text-[0.7rem] tracking-[2px] shadow-[0_4px_15px_rgba(225,6,0,0.4)] flex items-center gap-2 opacity-0 group-hover:opacity-100"
        >
          <span>⛶</span> FULL-SCREEN ANALYSIS
        </button>
      )}

      <div className="flex flex-wrap gap-8 mb-6 justify-center items-center bg-black/30 py-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-2 px-3 border-r border-white/10">
          <i className="w-3 h-3 rounded-full bg-f1-red shadow-[0_0_8px_#e10600]"></i>
          <span className="text-[0.65rem] font-black text-white uppercase tracking-wider">{primaryLabel}</span>
        </div>
        <div className="flex items-center gap-2 px-3 border-r border-white/10">
          <i className="w-3 h-3 rounded-full bg-white/40 border border-white/60"></i>
          <span className="text-[0.65rem] font-black text-f1-gray uppercase tracking-wider">{secondaryLabel}</span>
        </div>
        <div className="flex items-center gap-2 px-3">
          <i className="w-4 h-1 bg-f1-purple shadow-[0_0_8px_#b131ff]"></i>
          <span className="text-[0.65rem] font-black text-f1-purple uppercase tracking-wider">TIME DELTA</span>
        </div>
      </div>

      <svg 
        viewBox={`0 0 ${width + 45} ${height}`} 
        className="w-full h-auto block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredDist(null)}
      >
        <defs>
          <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e10600" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#e10600" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="positiveDeltaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff0000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="negativeDeltaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff00" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00ff00" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* DELTA CHART */}
        <g>
          <text x={padding} y={padding - 10} fill="#888" fontSize="10" fontWeight="900" className="italic tracking-widest">TIME DELTA (SEC)</text>
          
          <rect x={padding} y={padding} width={width-padding*2} height={chartHeight} fill="rgba(255,255,255,0.02)" rx="4" />
          <line x1={padding} y1={padding + chartHeight/2} x2={width-padding} y2={padding + chartHeight/2} stroke="#444" strokeDasharray="5,5" />
          
          {/* Green Area (Faster / Negative Delta) */}
          <path d={generateDeltaPath('negative')} fill="url(#negativeDeltaGradient)" />
          {/* Red Area (Slower / Positive Delta) */}
          <path d={generateDeltaPath('positive')} fill="url(#positiveDeltaGradient)" />
          
          <path d={generateDeltaPath('line')} fill="none" stroke="#b131ff" strokeWidth="2.5" />
          
          <text x={width - padding + 8} y={padding + 8} fill="#ff4444" fontSize="9" fontWeight="black">+{maxDelta.toFixed(2)}s</text>
          <text x={width - padding + 8} y={padding + chartHeight/2 + 3} fill="#666" fontSize="9" fontWeight="black">0.00</text>
          <text x={width - padding + 8} y={padding + chartHeight} fill="#44ff44" fontSize="9" fontWeight="black">-{maxDelta.toFixed(2)}s</text>
        </g>

        {/* SPEED CHART */}
        <g transform={`translate(0, ${chartHeight + padding + chartSpacing})`}>
          <text x={padding} y={-10} fill="#888" fontSize="10" fontWeight="900" className="italic tracking-widest">SPEED (KM/H)</text>
          
          <rect x={padding} y={0} width={width-padding*2} height={chartHeight} fill="rgba(255,255,255,0.02)" rx="4" />
          
          <path d={generateAreaPath(primaryPoints, p => p.speed / 350, 0)} fill="url(#speedGradient)" />
          <path d={generatePath(secondaryPoints, p => p.speed / 350, 0)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4,2" />
          <path d={generatePath(primaryPoints, p => p.speed / 350, 0)} fill="none" stroke="#e10600" strokeWidth="2.5" />
          
          <text x={width - padding + 8} y={8} fill="#666" fontSize="9" fontWeight="black">350</text>
          <text x={width - padding + 8} y={chartHeight/2 + 3} fill="#666" fontSize="9" fontWeight="black">175</text>
          <text x={width - padding + 8} y={chartHeight} fill="#666" fontSize="9" fontWeight="black">0</text>
          <line x1={padding} y1={chartHeight/2} x2={width-padding} y2={chartHeight/2} stroke="white" strokeOpacity="0.05" />
        </g>

        {/* INPUTS CHART */}
        <g transform={`translate(0, ${(chartHeight + padding + chartSpacing) * 2 - padding})`}>
          <text x={padding} y={-10} fill="#888" fontSize="10" fontWeight="900" className="italic tracking-widest">INPUTS (THROTTLE & BRAKE)</text>
          
          <rect x={padding} y={0} width={width-padding*2} height={chartHeight} fill="rgba(255,255,255,0.02)" rx="4" />

          {/* Reference Inputs */}
          <path d={generatePath(secondaryPoints, p => p.throttle, 0)} fill="none" stroke="rgba(0, 255, 0, 0.15)" strokeWidth="1.5" />
          <path d={generatePath(secondaryPoints, p => p.brake, 0)} fill="none" stroke="rgba(255, 0, 0, 0.15)" strokeWidth="1.5" />

          {/* Primary Inputs */}
          <path d={generateAreaPath(primaryPoints, p => p.throttle, 0)} fill="rgba(0, 255, 0, 0.05)" />
          <path d={generatePath(primaryPoints, p => p.throttle, 0)} fill="none" stroke="#00ff00" strokeWidth="2.5" />
          <path d={generatePath(primaryPoints, p => p.brake, 0)} fill="none" stroke="#ff0000" strokeWidth="2.5" />

          <text x={width - padding + 8} y={8} fill="#666" fontSize="9" fontWeight="black">100%</text>
          <text x={width - padding + 8} y={chartHeight/2 + 3} fill="#666" fontSize="9" fontWeight="black">50%</text>
          <text x={width - padding + 8} y={chartHeight} fill="#666" fontSize="9" fontWeight="black">0%</text>
          <line x1={padding} y1={chartHeight/2} x2={width-padding} y2={chartHeight/2} stroke="white" strokeOpacity="0.05" />
        </g>

        {/* Sync Cursor & Value Tooltip */}
        {hoveredDist !== null && (
          <g>
            <line x1={xScale(hoveredDist)} y1={padding} x2={xScale(hoveredDist)} y2={height - padding} stroke="#fff" strokeWidth="1.5" strokeDasharray="4,2" />
            <circle cx={xScale(hoveredDist)} cy={height - padding} r="4" fill="#fff" />
            
            {/* Speed Value Tooltip */}
            {hoveredP1 && (
              <g transform={`translate(${xScale(hoveredDist)}, ${chartHeight + padding + chartSpacing + chartHeight - (hoveredP1.speed / 350 * chartHeight)})`}>
                <circle r="4" fill="#e10600" stroke="#fff" strokeWidth="2" />
                <rect x="8" y="-12" width="50" height="24" rx="4" fill="rgba(225,6,0,0.9)" />
                <text x="12" y="4" fill="#fff" fontSize="10" fontWeight="900">{Math.round(hoveredP1.speed)}</text>
              </g>
            )}

            {/* Delta Value Tooltip */}
            <g transform={`translate(${xScale(hoveredDist)}, ${padding + chartHeight/2 - (getDeltaAtDistance(hoveredDist) / maxDelta * (chartHeight/2))})`}>
              <circle r="4" fill="#b131ff" stroke="#fff" strokeWidth="2" />
              <rect x="8" y="-12" width="60" height="24" rx="4" fill="rgba(177,49,255,0.9)" />
              <text x="12" y="4" fill="#fff" fontSize="10" fontWeight="900">
                {getDeltaAtDistance(hoveredDist) > 0 ? '+' : ''}{getDeltaAtDistance(hoveredDist).toFixed(3)}s
              </text>
            </g>
          </g>
        )}

        {/* Distance markers */}
        <g transform={`translate(0, ${height - 10})`}>
          <text x={padding} y={0} fill="#555" fontSize="10" fontWeight="900">START</text>
          {Array.from({ length: Math.floor(trackLength / 1000) }).map((_, i) => {
            const dist = (i + 1) * 1000;
            const x = xScale(dist);
            if (x > width - padding - 60) return null;
            return (
              <g key={i}>
                <line x1={x} y1={-(height - padding * 2)} x2={x} y2={0} stroke="white" strokeOpacity="0.05" strokeDasharray="4,4" />
                <text x={x} y={0} fill="#555" fontSize="10" textAnchor="middle" fontWeight="900" className="italic">{i + 1}KM</text>
              </g>
            );
          })}
          <text x={width - padding} y={0} fill="#555" fontSize="10" textAnchor="end" fontWeight="900">FINISH</text>
        </g>
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

const DistanceRow: React.FC<{ 
  label: string; 
  participant: Participant | null; 
  distance: number; 
  color: string 
}> = ({ label, participant, distance, color }) => {
  const [prevDist, setPrevDist] = React.useState(distance);
  const [trend, setTrend] = React.useState<'closing' | 'dropping' | 'stable'>('stable');

  React.useEffect(() => {
    const diff = distance - prevDist;
    if (Math.abs(diff) > 0.1) {
      setTrend(diff < 0 ? 'closing' : 'dropping');
      setPrevDist(distance);
    }
  }, [distance]);

  return (
    <div className="flex justify-between items-center py-1">
      <div className="flex flex-col">
        <span className="text-[0.6rem] text-f1-gray font-black uppercase tracking-wider">{label}</span>
        <span className="text-[1.1rem] font-black truncate max-w-[150px]">{participant?.m_name || 'UNKNOWN'}</span>
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-3">
          {trend !== 'stable' && (
            <span className={`text-[0.65rem] font-black px-1.5 py-0.5 rounded italic ${trend === 'closing' ? 'bg-f1-green/20 text-f1-green' : 'bg-f1-red/20 text-f1-red'}`}>
              {trend === 'closing' ? '▼ CLOSING' : '▲ DROPPING'}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className={`text-[2.2rem] font-black leading-none ${color}`}>
              {Math.abs(distance).toFixed(1)}
            </span>
            <span className="text-[0.8rem] font-black text-f1-gray uppercase">M</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DistanceWidget: React.FC<{ 
  allLapData: (LapData | null)[]; 
  allParticipants: (Participant | null)[]; 
  playerIndex: number; 
  trackLength: number 
}> = ({ allLapData, allParticipants, playerIndex, trackLength }) => {
  const playerLd = allLapData[playerIndex];
  if (!playerLd || !trackLength) return <div className="text-f1-gray italic text-[0.7rem] animate-pulse">Waiting for track data...</div>;

  const playerPos = playerLd.m_carPosition;
  const carAheadIdx = allLapData.findIndex(ld => ld && ld.m_carPosition === playerPos - 1);
  const carBehindIdx = allLapData.findIndex(ld => ld && ld.m_carPosition === playerPos + 1);

  const carAhead = carAheadIdx !== -1 ? { 
    ld: allLapData[carAheadIdx]!, 
    p: allParticipants[carAheadIdx] 
  } : null;
  
  const carBehind = carBehindIdx !== -1 ? { 
    ld: allLapData[carBehindIdx]!, 
    p: allParticipants[carBehindIdx] 
  } : null;

  const calculateDistance = (ld1: LapData, ld2: LapData) => {
    const d1 = (ld1.m_currentLapNum - 1) * trackLength + ld1.m_lapDistance;
    const d2 = (ld2.m_currentLapNum - 1) * trackLength + ld2.m_lapDistance;
    return d1 - d2;
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      {carAhead ? (
        <DistanceRow 
          label="Car Ahead" 
          participant={carAhead.p} 
          distance={calculateDistance(carAhead.ld, playerLd)} 
          color="text-f1-green"
        />
      ) : (
        <div className="bg-f1-yellow/10 p-4 border-l-4 border-f1-yellow">
          <div className="text-f1-yellow font-black text-[1.2rem] italic">P1 - RACE LEADER</div>
          <div className="text-f1-gray text-[0.6rem] font-black uppercase mt-1">Maintaining Gap</div>
        </div>
      )}
      
      <div className="h-[1px] bg-white/10 w-full shadow-[0_1px_0_rgba(255,255,255,0.05)]"></div>

      {carBehind ? (
        <DistanceRow 
          label="Car Behind" 
          participant={carBehind.p} 
          distance={calculateDistance(playerLd, carBehind.ld)} 
          color="text-f1-red"
        />
      ) : (
        <div className="bg-white/5 p-4 border-l-4 border-f1-gray">
          <div className="text-white font-black text-[1.2rem] italic uppercase">Back of the Pack</div>
          <div className="text-f1-gray text-[0.6rem] font-black uppercase mt-1">No Immediate Threat</div>
        </div>
      )}
    </div>
  );
};


const TyreWidget: React.FC<{ 
  telemetry: TelemetryData | null; 
  carStatus: CarStatus | null; 
  carDamage: CarDamage | null; 
}> = ({ telemetry, carStatus, carDamage }) => {
  const getCompoundName = (compound: number) => {
    switch(compound) {
      case 16: return { name: 'SOFT', color: '#e10600' };
      case 17: return { name: 'MEDIUM', color: '#fff200' };
      case 18: return { name: 'HARD', color: '#ffffff' };
      case 19: return { name: 'INTER', color: '#00ff00' };
      case 20: return { name: 'WET', color: '#0000ff' };
      default: return { name: 'UNKNOWN', color: '#666' };
    }
  };

  const compound = getCompoundName(carStatus?.m_visualTyreCompound || 0);
  const wear = carDamage?.m_tyresWear || [0, 0, 0, 0];
  const temps = telemetry?.m_tyresSurfaceTemperature || [0, 0, 0, 0];
  const labels = ['RL', 'RR', 'FL', 'FR'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-black/40 p-3 rounded border-l-4 shadow-inner" style={{ borderColor: compound.color }}>
        <div className="flex flex-col">
          <span className="text-[0.6rem] text-f1-gray font-black uppercase tracking-widest">CURRENT COMPOUND</span>
          <span className="text-[1.2rem] font-black" style={{ color: compound.color }}>{compound.name}</span>
        </div>
        <div className="text-right">
          <span className="text-[0.6rem] text-f1-gray font-black uppercase tracking-widest">AGE</span>
          <div className="text-[1.2rem] font-black">{carStatus?.m_tyresAgeLaps || 0} <span className="text-[0.7rem] opacity-50 uppercase">Laps</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {labels.map((label, i) => (
          <div key={i} className="bg-white/[0.02] p-3 rounded border border-white/5 relative overflow-hidden transition-all hover:bg-white/[0.05]">
             <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                <div 
                  className="h-full bg-f1-red transition-all duration-500" 
                  style={{ width: `${wear[i]}%`, opacity: 0.3 + (wear[i] / 100) * 0.7 }}
                ></div>
             </div>
             
             <div className="flex justify-between items-start mb-1">
               <span className="text-[0.65rem] font-black text-f1-gray">{label}</span>
               <span className={`text-[0.65rem] font-black ${wear[i] > 70 ? 'text-f1-red animate-pulse' : wear[i] > 40 ? 'text-f1-yellow' : 'text-f1-green'}`}>
                 {Math.round(wear[i])}% WEAR
               </span>
             </div>
             
             <div className="flex justify-between items-baseline">
               <span className={`text-[1.2rem] font-black ${temps[i] > 100 ? 'text-f1-red' : temps[i] > 90 ? 'text-f1-yellow' : 'text-white'}`}>
                 {Math.round(temps[i])}°C
               </span>
               <span className="text-[0.6rem] font-bold text-f1-gray uppercase">Temp</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  telemetry, allTelemetry, lapData, carStatus, carDamage, allParticipants, allLapData, sessionHistory, motionData, sessionData, playerIndex, isConnected 
}) => {
  const [activeTab, setActiveTab] = React.useState<'telemetry' | 'sectors' | 'engineering' | 'analysis'>('telemetry');
  const [selectedCarIndex, setSelectedCarIndex] = React.useState<number>(playerIndex);
  const [activeModalChart, setActiveModalChart] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModalChart(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Telemetry accumulation
  const [bestLapsTelemetry, setBestLapsTelemetry] = React.useState<Record<number, TelemetryPoint[]>>({});
  const [currentLapsTelemetry, setCurrentLapsTelemetry] = React.useState<Record<number, TelemetryPoint[]>>({});
  const [comparisonCarIndex, setComparisonCarIndex] = React.useState<number | null>(null);
  const [primaryDataSource, setPrimaryDataSource] = React.useState<'live' | 'best'>('live');
  const lastDistancesRef = React.useRef<Record<number, number>>({});
  const lastLapNumsRef = React.useRef<Record<number, number>>({});

  React.useEffect(() => { setSelectedCarIndex(playerIndex); }, [playerIndex]);

  // Handle Telemetry Collection for all cars
  React.useEffect(() => {
    if (!allTelemetry || !allLapData) return;

    allLapData.forEach((ld, idx) => {
      if (!ld || !allTelemetry[idx]) return;

      const currentDist = (ld as any).m_lapDistance;
      const currentLap = (ld as any).m_currentLapNum;
      const lastLap = lastLapNumsRef.current[idx] || 0;
      const lastDist = lastDistancesRef.current[idx] || 0;

      // Detect Lap Change
      if (currentLap !== lastLap) {
        if (currentLapsTelemetry[idx]?.length > 100) {
          setBestLapsTelemetry(prev => ({
            ...prev,
            [idx]: currentLapsTelemetry[idx]
          }));
        }
        setCurrentLapsTelemetry(prev => ({ ...prev, [idx]: [] }));
        lastLapNumsRef.current[idx] = currentLap;
        lastDistancesRef.current[idx] = 0;
        return;
      }

      // Detect Reset
      if (currentDist < lastDist - 100) {
        setCurrentLapsTelemetry(prev => ({ ...prev, [idx]: [] }));
        lastDistancesRef.current[idx] = 0;
        return;
      }

      // Add point every 5 meters
      if (currentDist > lastDist + 5) {
        const tel = allTelemetry[idx] as any;
        const newPoint: TelemetryPoint = {
          distance: currentDist,
          throttle: tel.m_throttle,
          brake: tel.m_brake,
          speed: tel.m_speed,
          time: (ld as any).m_currentLapTimeInMS
        };

        if (idx === playerIndex) {
          // console.log(`[DEBUG] Collected point for player at ${currentDist}m`);
        }

        setCurrentLapsTelemetry(prev => ({
          ...prev,
          [idx]: [...(prev[idx] || []), newPoint]
        }));
        lastDistancesRef.current[idx] = currentDist;
      }
    });
  }, [allTelemetry, allLapData]);

  // Log summary of available telemetry for analysis
  React.useEffect(() => {
    if (activeTab === 'analysis') {
      console.log('--- Analysis Tab Debug ---');
      console.log('Player index:', playerIndex);
      console.log('Current lap points:', currentLapsTelemetry[playerIndex]?.length || 0);
      console.log('Best lap points:', bestLapsTelemetry[playerIndex]?.length || 0);
      console.log('Comparison car index:', comparisonCarIndex);
      if (comparisonCarIndex !== null) {
        console.log('Comparison best lap points:', bestLapsTelemetry[comparisonCarIndex]?.length || 0);
      }
      console.log('-------------------------');
    }
  }, [activeTab, playerIndex, currentLapsTelemetry, bestLapsTelemetry, comparisonCarIndex]);

  if (!telemetry || !lapData) {
    return (
      <div className="dashboard-empty">
        <div className="f1-loader"></div>
        <h2 className="animate-pulse">{isConnected ? 'WAITING FOR GAME DATA...' : 'WAITING FOR SERVER...'}</h2>
        <p className="text-f1-gray text-[0.8rem] mt-2 font-black uppercase tracking-widest opacity-60">
          {isConnected ? 'Please start the game or enter the track' : 'Telemetry server is currently offline'}
        </p>
      </div>
    );
  }

  const leaderboard = allLapData
    .map((ld, index) => ({ ld, index }))
    .filter(item => item.ld !== null && item.index < 20)
    .sort((a, b) => ((a.ld as any).m_carPosition ?? 99) - ((b.ld as any).m_carPosition ?? 99))
    .map((item, i, arr) => {
      const leaderTime = (arr[0].ld as any).m_currentLapTimeInMS;
      const myTime = (item.ld as any).m_currentLapTimeInMS;
      const delta = i === 0 ? 0 : myTime - leaderTime;
      return { ...item, delta };
    });

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
                  {leaderboard.map(({ ld, index, delta }) => (
                    <tr 
                      key={index} 
                      className={`
                        bg-white/[0.02] cursor-pointer transition-all duration-100 hover:bg-white/[0.08]
                        ${index === playerIndex ? 'bg-[linear-gradient(90deg,rgba(225,6,0,0.4)_0%,rgba(225,6,0,0.1)_100%)]! shadow-[inset_4px_0_0_#e10600] relative' : ''} 
                        ${index === selectedCarIndex ? 'bg-f1-yellow/10! shadow-[inset_4px_0_0_#ffb800]' : ''}
                      `} 
                      onClick={() => setSelectedCarIndex(index)}
                    >
                      <td className={`w-8 bg-black/30 text-center font-black text-white [clip-path:polygon(0_0,100%_0,80%_100%,0%_100%)] py-2.5 px-2 text-[0.8rem] ${index === playerIndex ? 'bg-f1-red!' : ''}`}>{(ld as any).m_carPosition}</td>
                      <td className="pl-[10px] py-2.5 px-1 text-[0.8rem] font-bold truncate max-w-[120px]">{(allParticipants[index] as any)?.m_name || `CAR ${index}`}</td>
                      <td className="py-2.5 px-1 text-[0.75rem] font-mono tracking-tighter text-right text-white/90">{formatTime((ld as any).m_currentLapTimeInMS)}</td>
                      <td className="py-2.5 pr-[10px] pl-1 text-[0.7rem] font-black tracking-tighter text-right text-f1-gray/60">
                        {delta > 0 ? `+${(delta / 1000).toFixed(3)}` : delta === 0 && (ld as any).m_carPosition === 1 ? 'INTERVAL' : ''}
                      </td>
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
                  <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⏱️ DISTANCE TO CARS</h3>
                  <DistanceWidget allLapData={allLapData} allParticipants={allParticipants} playerIndex={playerIndex} trackLength={sessionData?.m_trackLength || 0} />
                </div>
                <div className="f1-section flex-1 min-w-[200px]">
                  <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">🛞 TYRE CONDITION</h3>
                  <TyreWidget telemetry={telemetry} carStatus={carStatus} carDamage={carDamage} />
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
            <div className="f1-section flex-1 min-w-[800px]">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="m-0 text-[0.85rem] font-black text-white uppercase tracking-wider">📊 PERFORMANCE ANALYSIS</h3>
                    <div className="text-f1-gray text-[0.65rem] font-black mt-1 uppercase opacity-60">Real-time telemetry comparison and delta tracking</div>
                  </div>
                  
                  <div className="flex bg-black/60 p-1 rounded-md border border-white/10">
                    <button 
                      className={`px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wider rounded transition-all ${primaryDataSource === 'live' ? 'bg-f1-red text-white' : 'text-f1-gray hover:text-white'}`}
                      onClick={() => setPrimaryDataSource('live')}
                    >
                      LIVE TELEMETRY
                    </button>
                    <button 
                      className={`px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wider rounded transition-all ${primaryDataSource === 'best' ? 'bg-f1-purple text-white' : 'text-f1-gray hover:text-white'}`}
                      onClick={() => setPrimaryDataSource('best')}
                    >
                      YOUR BEST LAP
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-md border border-white/5">
                    <label className="text-[0.6rem] font-black text-f1-gray uppercase tracking-widest">COMPARE VS:</label>
                    <select 
                      className="bg-[#050508] border border-white/20 text-white text-[0.7rem] px-3 py-1.5 rounded font-black uppercase outline-none focus:border-f1-red transition-all cursor-pointer hover:bg-black"
                      value={comparisonCarIndex ?? ""}
                      onChange={(e) => setComparisonCarIndex(e.target.value === "" ? null : parseInt(e.target.value))}
                    >
                      {primaryDataSource === 'live' && <option value="">YOUR BEST LAP</option>}
                      {allParticipants.map((p, i) => {
                        if (!p || (i === playerIndex && primaryDataSource === 'live')) return null;
                        const hasData = bestLapsTelemetry[i]?.length > 0;
                        return <option key={i} value={i}>{p.m_name} {hasData ? "✓" : "(No Data)"}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <TelemetryChart 
                primaryPoints={primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])} 
                secondaryPoints={comparisonCarIndex !== null ? (bestLapsTelemetry[comparisonCarIndex] || []) : (bestLapsTelemetry[playerIndex] || [])} 
                trackLength={sessionData?.m_trackLength || 5000} 
                primaryLabel={primaryDataSource === 'live' ? "LIVE TELEMETRY" : "YOUR BEST LAP"}
                secondaryLabel={comparisonCarIndex !== null ? `${allParticipants[comparisonCarIndex]?.m_name}'S BEST` : (primaryDataSource === 'live' ? "YOUR BEST LAP" : "SELECT DRIVER")}
                onExpand={() => setActiveModalChart("TELEMETRY COMPARISON")}
              />

              <ChartModal 
                isOpen={!!activeModalChart} 
                onClose={() => setActiveModalChart(null)} 
                title={activeModalChart || ""}
              >
                <TelemetryChart 
                  primaryPoints={primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])} 
                  secondaryPoints={comparisonCarIndex !== null ? (bestLapsTelemetry[comparisonCarIndex] || []) : (bestLapsTelemetry[playerIndex] || [])} 
                  trackLength={sessionData?.m_trackLength || 5000} 
                  primaryLabel={primaryDataSource === 'live' ? "LIVE TELEMETRY" : "YOUR BEST LAP"}
                  secondaryLabel={comparisonCarIndex !== null ? `${allParticipants[comparisonCarIndex]?.m_name}'S BEST` : (primaryDataSource === 'live' ? "YOUR BEST LAP" : "SELECT DRIVER")}
                  isExpanded={true}
                />
              </ChartModal>

              <div className="mt-5 grid grid-cols-4 gap-4">
                {[
                  { label: 'AVG THROTTLE', value: (primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])).reduce((acc, p) => acc + p.throttle, 0) / ((primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])).length || 1) * 100, unit: '%', color: '#00ff00' },
                  { label: 'AVG BRAKE', value: (primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])).reduce((acc, p) => acc + p.brake, 0) / ((primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])).length || 1) * 100, unit: '%', color: '#ff0000' },
                  { label: 'MAX SPEED', value: Math.max(0, ...(primaryDataSource === 'live' ? (currentLapsTelemetry[playerIndex] || []) : (bestLapsTelemetry[playerIndex] || [])).map(p => p.speed)), unit: 'KM/H', color: '#ffffff' },
                  { label: 'EST. DELTA', value: (((primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex])?.length > 0 && (comparisonCarIndex !== null ? bestLapsTelemetry[comparisonCarIndex] : bestLapsTelemetry[playerIndex])?.length > 0) ? 
                    (((primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex])[(primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex]).length - 1].time - (comparisonCarIndex !== null ? bestLapsTelemetry[comparisonCarIndex] : bestLapsTelemetry[playerIndex]).reduce((prev, curr) => Math.abs(curr.distance - (primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex])[(primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex]).length - 1].distance) < Math.abs(prev.distance - (primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex])[(primaryDataSource === 'live' ? currentLapsTelemetry[playerIndex] : bestLapsTelemetry[playerIndex]).length - 1].distance) ? curr : prev).time) / 1000) : 0), unit: 's', color: '#b131ff', isDelta: true }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#050508] p-4 rounded-lg border-b-4 transition-transform hover:scale-[1.02]" style={{ borderBottomColor: stat.color }}>
                    <label className="text-[0.6rem] text-[#666] block uppercase font-black tracking-widest mb-1">{stat.label}</label>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[1.4rem] font-black" style={{ color: stat.isDelta ? (stat.value > 0 ? '#ff0000' : '#00ff00') : 'white' }}>
                        {stat.isDelta && stat.value > 0 ? '+' : ''}{stat.value.toFixed(stat.isDelta ? 3 : 1)}
                      </span>
                      <span className="text-[0.65rem] font-black text-[#444]">{stat.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="f1-section flex-1">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <h3 className="m-0 text-[0.75rem] font-black text-f1-gray uppercase">⏱️ DETAILED LAP HISTORY - {(allParticipants[selectedCarIndex] as any)?.m_name}</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-f1-purple shadow-[0_0_8px_#b131ff]"></div>
                    <span className="text-[0.6rem] font-black text-f1-purple uppercase tracking-widest">Session Best</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-f1-green shadow-[0_0_8px_#00ff00]"></div>
                    <span className="text-[0.6rem] font-black text-f1-green uppercase tracking-widest">Personal Best</span>
                  </div>
                </div>
              </div>
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
