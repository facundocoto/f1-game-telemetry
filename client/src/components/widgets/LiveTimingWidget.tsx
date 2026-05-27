import React from 'react';
import type { LapData } from '../Dashboard';

interface LiveTimingWidgetProps {
  lapData: LapData;
  personalBestLap: number;
  sessionBestLap: number;
  getTimeColor: (time: number, personalBest: number, sessionBest: number) => string;
  formatTime: (ms: number) => string;
}

export const LiveTimingWidget: React.FC<LiveTimingWidgetProps> = ({
  lapData,
  personalBestLap,
  sessionBestLap,
  getTimeColor,
  formatTime,
}) => {
  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-3 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⏱️ LIVE TIMING</h3>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
          <span className="text-f1-gray font-bold text-[0.9rem] uppercase">POSITION</span>
          <span className="font-black text-white text-[1.4rem]">{lapData.m_carPosition} <span className="text-[0.8rem] text-f1-gray">/ 20</span></span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
          <span className="text-f1-gray font-bold text-[0.9rem] uppercase">CURRENT LAP</span>
          <span className="font-black text-white text-[1.4rem]">{lapData.m_currentLapNum}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-white/[0.03] bg-white/[0.02] px-3 -mx-3 rounded">
          <span className="text-f1-gray font-bold text-[0.9rem] uppercase">LAST LAP</span>
          <span className="font-black text-[1.4rem]" style={{ color: getTimeColor(lapData.m_lastLapTimeInMS, personalBestLap, sessionBestLap) || 'white' }}>
            {formatTime(lapData.m_lastLapTimeInMS)}
          </span>
        </div>
      </div>
    </div>
  );
};
