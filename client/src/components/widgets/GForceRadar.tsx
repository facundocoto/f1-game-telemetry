import React from 'react';

export const GForceRadar: React.FC<{ lateral: number; longitudinal: number }> = ({ lateral, longitudinal }) => {
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
