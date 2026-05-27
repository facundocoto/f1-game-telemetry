import React from 'react';
import type { TelemetryData } from '../Dashboard';

interface SuspensionWidgetProps {
  telemetry: TelemetryData | null;
}

export const SuspensionWidget: React.FC<SuspensionWidgetProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const positions = telemetry.m_suspensionPosition || [0, 0, 0, 0];
  const labels = ['RL', 'RR', 'FL', 'FR'];

  // Normalize suspension value for visualization.
  // Suspension typically ranges around 0-100+ depending on the F1 game version and specific spring setups.
  // We cap visual representation at 100 for percentage.
  const getNormalizedCompression = (val: number) => Math.min(Math.max(val, 0), 100);

  return (
    <div className="f1-section h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-4">
        <h3 className="m-0 text-[0.75rem] font-black text-f1-gray uppercase">
          🏎️ SUSPENSION & RIDE HEIGHT
        </h3>
      </div>
      
      <div className="flex-1 grid grid-cols-4 gap-2 items-end pb-2">
        {[2, 3, 0, 1].map((i) => {
          const compression = getNormalizedCompression(positions[i]);
          const isBottoming = compression > 95;

          return (
            <div key={i} className="flex flex-col items-center h-full justify-end">
              {/* Bottoming Warning */}
              <div className={`text-[0.55rem] font-black uppercase tracking-tighter mb-1 transition-opacity ${isBottoming ? 'text-f1-red opacity-100 animate-pulse' : 'opacity-0'}`}>
                BOTTOMING
              </div>
              
              {/* Damper Visualization */}
              <div className="w-6 h-32 bg-black border border-[#333] rounded-sm relative overflow-hidden flex flex-col justify-end">
                {/* Visual Spring */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, #fff 4px, #fff 6px)'
                }}></div>
                
                {/* Compression Fill */}
                <div 
                  className="w-full transition-all duration-75 relative z-10" 
                  style={{ 
                    height: `${compression}%`, 
                    backgroundColor: isBottoming ? '#ff0000' : '#b131ff' 
                  }}
                ></div>
              </div>

              {/* Value & Label */}
              <div className="mt-2 flex flex-col items-center">
                <span className="font-mono font-black text-[0.8rem]" style={{ color: isBottoming ? '#ff0000' : 'white' }}>
                  {Math.round(positions[i])}
                </span>
                <span className="text-[0.6rem] text-f1-gray font-black uppercase mt-0.5">{labels[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
