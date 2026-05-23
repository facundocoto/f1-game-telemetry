import React from 'react';
import type { TelemetryData } from '../Dashboard';

interface AdvancedTyresWidgetProps {
  telemetry: TelemetryData | null;
}

export const AdvancedTyresWidget: React.FC<AdvancedTyresWidgetProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const labels = ['REAR LEFT', 'REAR RIGHT', 'FRONT LEFT', 'FRONT RIGHT'];
  const innerTemps = telemetry.m_tyresInnerTemperature || [0, 0, 0, 0];
  const surfaceTemps = telemetry.m_tyresSurfaceTemperature || [0, 0, 0, 0];
  const pressures = telemetry.m_tyresPressure || [0, 0, 0, 0];

  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-4 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">
        🛞 ADVANCED TYRE DIAGNOSTICS
      </h3>
      <div className="flex-1 grid grid-cols-2 gap-4">
        {[2, 3, 0, 1].map((i) => {
          const inner = innerTemps[i];
          const surface = surfaceTemps[i];
          const pressure = pressures[i];
          
          // Basic thresholds for visual feedback
          const innerColor = inner > 105 ? 'text-f1-red' : inner < 85 ? 'text-f1-blue' : 'text-f1-green';
          const surfaceColor = surface > 110 ? 'text-f1-red' : surface < 80 ? 'text-f1-blue' : 'text-f1-green';
          
          return (
            <div key={i} className="bg-white/[0.02] p-3 rounded border border-[#333] flex flex-col items-center">
              <label className="text-[0.6rem] text-f1-gray font-black mb-2 uppercase tracking-wider">{labels[i]}</label>
              
              <div className="w-full flex justify-between items-center mb-2 px-2">
                <div className="flex flex-col items-center">
                  <span className="text-[0.55rem] text-[#888] font-bold">INNER</span>
                  <span className={`font-black text-[1rem] ${innerColor}`}>{Math.round(inner)}°</span>
                </div>
                <div className="h-6 w-[1px] bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[0.55rem] text-[#888] font-bold">SURFACE</span>
                  <span className={`font-black text-[1rem] ${surfaceColor}`}>{Math.round(surface)}°</span>
                </div>
              </div>

              <div className="w-full bg-black/40 p-1.5 rounded text-center border-t border-white/5 mt-auto">
                <span className="text-[0.6rem] text-f1-gray mr-1">PRESSURE:</span>
                <span className="font-black text-[0.9rem]">{pressure.toFixed(1)} <span className="text-[0.6rem] opacity-50">PSI</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
