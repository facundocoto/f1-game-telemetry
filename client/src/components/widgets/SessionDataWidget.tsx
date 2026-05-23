import React from 'react';

interface SessionDataWidgetProps {
  sessionData: any;
}

export const SessionDataWidget: React.FC<SessionDataWidgetProps> = ({ sessionData }) => {
  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-4 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">☁️ SESSION DATA</h3>
      <div className="flex-1 grid grid-cols-3 gap-2.5 content-center">
        <div className="flex flex-col items-center">
          <label className="text-[0.7rem] text-f1-gray font-black mb-2">🌡️ TRACK</label>
          <span className="font-black text-[1.4rem]">{sessionData?.m_trackTemperature || '--'}°C</span>
        </div>
        <div className="flex flex-col items-center">
          <label className="text-[0.7rem] text-f1-gray font-black mb-2">💨 AIR</label>
          <span className="font-black text-[1.4rem]">{sessionData?.m_airTemperature || '--'}°C</span>
        </div>
        <div className="flex flex-col items-center">
          <label className="text-[0.7rem] text-f1-gray font-black mb-2">🌧️ RAIN</label>
          <span className="font-black text-[1.4rem]">{sessionData?.m_weatherForecastSamples?.[0]?.m_rainPercentage || '0'}%</span>
        </div>
      </div>
    </div>
  );
};
