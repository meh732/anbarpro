import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutGrid, Bell, ChevronDown, LogOut, QrCode, AlertTriangle, Clock, CheckCircle, ArrowRight
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    users, 
    activeTab, setActiveTab,
    notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadCount,
    currentUser, setCurrentUser, logout,
    setIsScannerOpen,
    companyName
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const roleLabels: Record<string, string> = { superadmin: 'مدیر سیستم', admin: 'مدیر تولید', manager: 'سرپرست انبار', operator: 'اپراتور' };

  return (
    <header className="mx-4 sm:mx-6 md:mx-8 my-4 sticky top-4 z-50 glass-card rounded-2xl md:rounded-[1.5rem] overflow-visible">
      <div className="max-w-[1400px] mx-auto h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-4 md:gap-6">
          {activeTab !== 'dashboard' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className="p-3.5 bg-white/40 hover:bg-white/70 border border-white/50 text-slate-700 rounded-xl ios-press transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title="بازگشت به داشبورد"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-3.5 rounded-xl ios-press transition-all duration-300 cursor-pointer flex items-center gap-3 ${activeTab === 'dashboard' ? 'glass-btn-active text-white' : 'bg-white/40 hover:bg-white/70 text-slate-700 border border-white/40'}`}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="font-extrabold hidden sm:block text-sm">برنامه‌ها</span>
          </button>
          
          <div className="h-8 w-px bg-slate-300/50 hidden sm:block"></div>
          
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter hidden md:block">
            {companyName || 'AnbarMeh'}<span className="text-indigo-600">.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer ios-press border border-white/20"
          >
            <QrCode className="w-5 h-5" />
            <span className="hidden sm:inline">اسکن بارکد</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-3 bg-white/40 hover:bg-white/70 text-slate-600 border border-white/50 rounded-xl relative ios-press transition-all cursor-pointer shadow-xs"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white/80 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute left-0 mt-3 w-80 glass-dropdown rounded-[1.5rem] z-50 overflow-hidden flex flex-col animate-fadeIn">
                <div className="p-4 border-b border-slate-200/40 flex items-center justify-between bg-white/20">
                  <span className="font-black text-slate-800">اعلان‌ها</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
                      خوانده شده
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 font-medium">هیچ اعلانی ندارید</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.linkTab) setActiveTab(notif.linkTab);
                          setShowNotifs(false);
                        }}
                        className={`p-4 border-b border-slate-100/40 cursor-pointer hover:bg-white/30 transition-colors ${!notif.isRead ? 'bg-indigo-50/20' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                            {notif.type === 'LowStock' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            {notif.type === 'RequestSubmitted' && <Clock className="w-4 h-4 text-indigo-500" />}
                            {notif.type === 'ProjectFinished' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{notif.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative border-r border-slate-300/50 pr-3 md:pr-5">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-3 p-1.5 hover:bg-white/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/40"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-white flex items-center justify-center text-sm font-black shadow-md border border-white/20">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="text-right hidden md:block">
                <div className="text-sm font-black text-slate-900">{currentUser.fullName}</div>
                <div className="text-[11px] text-slate-500 font-medium">{roleLabels[currentUser.role] || currentUser.role}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
            </button>

            {showUserDropdown && (
              <div className="absolute left-0 mt-3 w-72 glass-dropdown rounded-[1.5rem] z-50 overflow-hidden flex flex-col p-2 animate-fadeIn">
                <div className="p-4 bg-white/30 border border-white/50 rounded-2xl mb-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-black shadow-md border border-white/20">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-sm text-slate-900">{currentUser.fullName}</div>
                    <div className="text-xs text-slate-500">@{currentUser.username}</div>
                  </div>
                </div>
                
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">تغییر کاربر (دمو)</div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCurrentUser(user);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-right px-4 py-2.5 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors ${currentUser.id === user.id ? 'bg-indigo-500/10 text-indigo-700 font-black' : 'hover:bg-white/30 text-slate-700 font-bold'}`}
                    >
                      <span>{user.fullName}</span>
                      <span className="text-[10px] bg-white/40 border border-white/60 px-2 py-0.5 rounded-lg text-slate-500 font-bold">{roleLabels[user.role]}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-200/40 mt-2 pt-2">
                  <button
                    onClick={() => { setShowUserDropdown(false); logout(); }}
                    className="w-full text-right px-4 py-3 text-sm text-rose-600 hover:bg-rose-50/50 rounded-xl font-black flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>خروج از حساب</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
