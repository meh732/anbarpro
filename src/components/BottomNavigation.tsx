import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutGrid, Boxes, QrCode, ArrowDownUp, MessageSquare } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, setIsScannerOpen, unreadMessagesCount } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutGrid },
    { id: 'items', label: 'کالاها', icon: Boxes },
    { id: 'scan', label: 'اسکن', icon: QrCode, isFab: true },
    { 
      id: 'chat', 
      label: 'گفتگو', 
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined 
    },
    { id: 'stock_movement', label: 'ورود/خروج', icon: ArrowDownUp },
  ];

  const handleTabClick = (id: string) => {
    if (id === 'scan') {
      setIsScannerOpen(true);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-slate-900/80 via-slate-900/60 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto h-15 bg-white/90 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-2xl flex items-center justify-around px-1 pointer-events-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isFab) {
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="relative -top-4 w-13 h-13 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 active:scale-90 transition-transform cursor-pointer border-3 border-white z-10"
                title={item.label}
              >
                <Icon className="w-5.5 h-5.5" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-black transition-all cursor-pointer active:scale-95 relative ${
                isActive 
                  ? 'text-indigo-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1 rounded-full border border-white min-w-[15px] h-[15px] flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

