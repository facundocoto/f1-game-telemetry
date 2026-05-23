import React from 'react';
import type { CarDamage } from '../Dashboard';

interface PowerUnitHealthWidgetProps {
  carDamage: CarDamage | null;
}

export const PowerUnitHealthWidget: React.FC<PowerUnitHealthWidgetProps> = ({ carDamage }) => {
  if (!carDamage) return null;

  const components = [
    { label: 'ICE', wear: carDamage.m_engineICEWear || 0 },
    { label: 'MGU-K', wear: carDamage.m_engineMGUKWear || 0 },
    { label: 'MGU-H', wear: carDamage.m_engineMGUHWear || 0 },
    { label: 'TURBO', wear: carDamage.m_engineTCWear || 0 },
    { label: 'ENERGY STORE', wear: carDamage.m_engineESWear || 0 },
    { label: 'CONTROL ELEC.', wear: carDamage.m_engineCEWear || 0 },
  ];

  const gearboxWear = carDamage.m_gearBoxDamage || 0;

  const getWearColor = (wear: number) => {
    if (wear > 70) return '#ff0000'; // Red
    if (wear > 40) return '#ffb800'; // Yellow
    return '#00ff00'; // Green
  };

  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-4 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">
        ⚙️ POWER UNIT & GEARBOX HEALTH
      </h3>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
        {/* Gearbox Section */}
        <div className="bg-white/[0.02] p-3 rounded border border-white/10 mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[0.65rem] font-black uppercase tracking-wider">GEARBOX WEAR</span>
            <span className="font-black text-[0.8rem]" style={{ color: getWearColor(gearboxWear) }}>
              {Math.round(gearboxWear)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500" 
              style={{ width: `${Math.min(gearboxWear, 100)}%`, backgroundColor: getWearColor(gearboxWear) }}
            ></div>
          </div>
        </div>

        {/* PU Components */}
        <div className="grid grid-cols-1 gap-2">
          {components.map((comp, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[0.6rem] text-[#aaa] font-bold uppercase tracking-wide">{comp.label}</span>
                <span className="font-black text-[0.7rem]" style={{ color: getWearColor(comp.wear) }}>
                  {Math.round(comp.wear)}%
                </span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500" 
                  style={{ width: `${Math.min(comp.wear, 100)}%`, backgroundColor: getWearColor(comp.wear) }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
