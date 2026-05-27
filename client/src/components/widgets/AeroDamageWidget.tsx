import React from 'react';
import type { CarDamage } from '../Dashboard';

interface AeroDamageWidgetProps {
  carDamage: CarDamage | null;
}

export const AeroDamageWidget: React.FC<AeroDamageWidgetProps> = ({ carDamage }) => {
  return (
    <div className="f1-section h-full flex flex-col">
      <h3 className="mt-0 mb-4 text-[0.75rem] font-black text-f1-gray border-b border-white/5 pb-1 uppercase">⚠️ AERO DAMAGE</h3>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="flex justify-between items-center">
          <span className="text-f1-gray font-bold text-[0.9rem] uppercase">FRONT WING</span>
          <div className="font-black text-[1.1rem]">
            <span className={carDamage?.m_frontLeftWingDamage && carDamage.m_frontLeftWingDamage > 20 ? 'text-f1-red' : ''}>
              L: {carDamage?.m_frontLeftWingDamage || 0}%
            </span>
            <span className="mx-2 text-white/30">|</span>
            <span className={carDamage?.m_frontRightWingDamage && carDamage.m_frontRightWingDamage > 20 ? 'text-f1-red' : ''}>
              R: {carDamage?.m_frontRightWingDamage || 0}%
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-white/[0.03]">
          <span className="text-f1-gray font-bold text-[0.9rem] uppercase">REAR WING</span>
          <span className={`font-black text-[1.2rem] ${carDamage?.m_rearWingDamage && carDamage.m_rearWingDamage > 20 ? 'text-f1-red' : ''}`}>
            {carDamage?.m_rearWingDamage || 0}%
          </span>
        </div>
      </div>
    </div>
  );
};
