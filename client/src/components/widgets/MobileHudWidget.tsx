import React from 'react';
import { GForceRadar } from './GForceRadar';
import type { TelemetryData, CarStatus, MotionData } from '../Dashboard';

interface MobileHudWidgetProps {
  telemetry: TelemetryData | null;
  carStatus: CarStatus | null;
  motionData: MotionData | null;
  playerIndex: number;
}

export const MobileHudWidget: React.FC<MobileHudWidgetProps> = ({ telemetry, carStatus, motionData, playerIndex }) => {
  if (!telemetry) return null;

  const rpm = telemetry.m_engineRPM;
  const maxRpm = carStatus?.m_maxRPM || 13500;
  const numSegments = 20;
  const percentage = Math.min((rpm / maxRpm), 1);
  const activeSegments = Math.floor(percentage * numSegments);

  const getGear = () => {
    const g = telemetry.m_gear;
    return g === 0 ? 'N' : g === -1 ? 'R' : g;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 py-6 px-4 bg-[linear-gradient(180deg,#1a1a24_0%,#050508_100%)] rounded-[15px] border border-[#333] shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative overflow-hidden min-h-[calc(100vh-200px)]">
      {/* Top Lights */}
      <div className="absolute top-0 w-1/2 h-1 bg-white/10 blur-sm"></div>

      {/* RPM Bar */}
      <div className="w-full flex gap-1 justify-between bg-black/40 p-2 rounded border border-white/5">
        {Array.from({ length: numSegments }).map((_, i) => {
          const isActive = i < activeSegments;
          let colorClass = "bg-neutral-800 shadow-none";
          
          if (isActive) {
            if (i < 8) colorClass = "bg-[#00ff00] shadow-[0_0_10px_#00ff00]"; // Green
            else if (i < 15) colorClass = "bg-[#ff0000] shadow-[0_0_10px_#ff0000]"; // Red
            else colorClass = "bg-[#b131ff] shadow-[0_0_12px_#b131ff] animate-pulse"; // Purple
          }

          return (
            <div 
              key={i} 
              className={`flex-1 h-6 rounded-sm transition-all duration-75 ${colorClass}`}
            />
          );
        })}
      </div>

      {/* Central HUD Info */}
      <div className="flex flex-col items-center justify-center w-full flex-1">
        <span className="text-[1rem] text-f1-gray font-black tracking-[6px] mb-[-15px] uppercase">GEAR</span>
        <div className="text-[14rem] font-black text-white leading-none italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] filter contrast-125 mb-4">
          {getGear()}
        </div>

        <div className="flex items-end justify-center w-full mt-4 gap-4">
          <div className="flex-[0.5] flex justify-center opacity-60">
            <GForceRadar lateral={motionData?.m_carMotionData[playerIndex]?.m_gForceLateral || 0} longitudinal={motionData?.m_carMotionData[playerIndex]?.m_gForceLongitudinal || 0} />
          </div>
          <div className="flex items-end flex-1">
            <span className="text-[8rem] font-black leading-none tracking-tighter text-white">
              {telemetry.m_speed}
            </span>
            <span className="text-[1.5rem] text-f1-red font-black mb-4 ml-2">KM/H</span>
          </div>
        </div>
      </div>

      {/* Inputs (Throttle/Brake) */}
      <div className="w-full flex justify-between gap-4 mt-auto">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-[0.8rem] text-f1-gray font-black uppercase tracking-wider text-left">THROTTLE</label>
          <div className="h-6 w-full bg-black border border-[#333] rounded overflow-hidden">
            <div className="h-full bg-f1-green transition-[width] duration-100" style={{ width: `${telemetry.m_throttle * 100}%` }}></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-[0.8rem] text-f1-gray font-black uppercase tracking-wider text-right">BRAKE</label>
          <div className="h-6 w-full bg-black border border-[#333] rounded overflow-hidden">
            <div className="h-full bg-red-600 transition-[width] duration-100" style={{ width: `${telemetry.m_brake * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
