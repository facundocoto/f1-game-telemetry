import React from 'react';
import type { CarStatus } from '../Dashboard';

interface PowerTiresWidgetProps {
  carStatus: CarStatus | null;
}

export const PowerTiresWidget: React.FC<PowerTiresWidgetProps> = ({ carStatus }) => {
  if (!carStatus) return null;

  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-4 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⚡ POWER & TIRES</h3>
      <div className="flex-1 flex flex-col justify-around gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[0.75rem] text-f1-gray font-black uppercase tracking-wider">⛽ FUEL</label>
          <div className="text-[1.3rem] font-black">
            {carStatus.m_fuelInTank.toFixed(2)} KG 
            <span className="opacity-50 text-[0.9rem] ml-2">{carStatus.m_fuelRemainingLaps.toFixed(1)} LAPS</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[0.75rem] text-f1-gray font-black uppercase tracking-wider">🔋 ERS BATT</label>
          <div className="h-4 bg-black border border-[#333] rounded overflow-hidden">
            <div 
              className="h-full transition-all" 
              style={{ 
                width: `${((carStatus.m_ersStoreEnergy / 4000000) * 100)}%`, 
                backgroundColor: carStatus.m_ersDeployMode === 3 ? '#fff200' : '#b131ff' 
              }}
            ></div>
          </div>
          <div className="flex justify-between text-[0.8rem] font-black mt-1">
            <span>{Math.round(((carStatus.m_ersStoreEnergy / 4000000) * 100))}%</span>
            <span style={{ color: carStatus.m_ersDeployMode === 3 ? '#fff200' : 'white' }}>
              {['OFF', 'MED', 'HOTLAP', 'OVTAKE'][carStatus.m_ersDeployMode]}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[0.75rem] text-f1-gray font-black uppercase tracking-wider">🛞 COMPOUND</label>
          <div className="text-[1.3rem] font-black">
            {carStatus.m_tyresAgeLaps} LAPS - {['SOFT','MED','HARD','WET'][carStatus.m_visualTyreCompound - 16] || '---'}
          </div>
        </div>
      </div>
    </div>
  );
};
