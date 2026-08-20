import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutGrid, Boxes, QrCode, ArrowDownUp, Factory } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, setIsScannerOpen } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutGrid },
    { id: 'items', label: 'کالاها', icon: Boxes },
    { id: 'scan', label: 'اسکن', icon: QrCode, isFab: true },
    { id: 'stock_movement', label: 'ورود/خروج', icon: ArrowDownUp },
    { id: 'projects', label: 'پروژه‌ها', icon: Factory },
  ];

  const handleTabClick = (id: string) => {
    if (id === 'scan') {
      setIsScannerOpen(true);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-4 pb-4 pt-2 bg-gradient-to-t from-slate-900/90 via-slate-900/80 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto h-16 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl flex items-center justify-around px-2 pointer-events-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isFab) {
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="relative -top-5 w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 active:scale-90 transition-transform cursor-pointer border-4 border-white z-10"
                title={item.label}
              >
                <Icon className="w-6 h-6 animate-pulse" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-black transition-all cursor-pointer active:scale-95 ${
                isActive 
                  ? 'text-indigo-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5.5 h-5.5 transition-transform ${isActive ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
