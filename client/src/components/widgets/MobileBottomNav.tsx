import React from 'react';

export type MobileWidgetType = 'hud' | 'race' | 'car' | 'data';

interface MobileBottomNavProps {
  activeWidget: MobileWidgetType;
  onWidgetSelect: (widget: MobileWidgetType) => void;
  isVisible: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeWidget, onWidgetSelect, isVisible }) => {
  if (!isVisible) return null;

  const navItems: { id: MobileWidgetType; icon: string; label: string }[] = [
    { id: 'hud', icon: '🏎️', label: 'HUD' },
    { id: 'race', icon: '🏆', label: 'RACE' },
    { id: 'car', icon: '🛠️', label: 'CAR' },
    { id: 'data', icon: '📊', label: 'DATA' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0d0d12]/95 backdrop-blur-md border-t border-white/10 z-[2000] lg:hidden pb-safe">
      <div className="flex justify-between items-center px-2 py-2 overflow-x-auto hide-scrollbar">
        {navItems.map((item) => {
          const isActive = activeWidget === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onWidgetSelect(item.id)}
              className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg transition-all duration-200 border-none bg-transparent ${
                isActive ? 'text-white' : 'text-f1-gray hover:text-white/80'
              }`}
            >
              <div className={`text-[1.2rem] mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </div>
              <span className={`text-[0.55rem] font-black uppercase tracking-wider ${isActive ? 'text-f1-red' : ''}`}>
                {item.label}
              </span>
              {/* Active Indicator */}
              <div className={`w-1 h-1 rounded-full mt-1 transition-all duration-200 ${isActive ? 'bg-f1-red shadow-[0_0_5px_#e10600] opacity-100' : 'opacity-0'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
