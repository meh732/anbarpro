import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, ChevronDown, LogOut, QrCode, AlertTriangle, Clock, CheckCircle, 
  Menu, Search
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isCollapsed: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
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

  const roleLabels: Record<string, string> = { 
    superadmin: 'مدیر کل سیستم', 
    admin: 'مدیر تولید و انبار', 
    manager: 'سرپرست انبار', 
    operator: 'اپراتور خط' 
  };

  const tabTitles: Record<string, { title: string; category: string }> = {
    dashboard: { title: 'داشبورد مدیریت', category: 'میز کار' },
    items: { title: 'کالاها و قطعات', category: 'انبار و موجودی' },
    kardex: { title: 'کاردکس کالاها و قطعات', category: 'انبار و موجودی' },
    warehouses: { title: 'انبارها و فضاها', category: 'انبار و موجودی' },
    stock_movement: { title: 'ورود و خروج کالا', category: 'انبار و موجودی' },
    movements: { title: 'ورود و خروج کالا', category: 'انبار و موجودی' },
    transfers: { title: 'انتقال بین انبارها', category: 'انبار و موجودی' },
    stock_counting: { title: 'انبارگردانی و مغایرت‌گیری', category: 'انبار و موجودی' },
    projects: { title: 'پروژه‌های تولید', category: 'تولید و تأمین' },
    bom: { title: 'فرمول ساخت (BOM)', category: 'تولید و تأمین' },
    requests: { title: 'درخواست‌های خرید', category: 'تولید و تأمین' },
    'purchase-requests': { title: 'درخواست‌های خرید', category: 'تولید و تأمین' },
    contractors: { title: 'پیمانکاران و طرف‌حساب‌ها', category: 'تولید و تأمین' },
    operator_logger: { title: 'ثبت شیفت و کارکرد اپراتور', category: 'عملیات و پرسنل' },
    'operator-logger': { title: 'ثبت شیفت و کارکرد اپراتور', category: 'عملیات و پرسنل' },
    operator_perf: { title: 'راندمان و ارزیابی اپراتورها', category: 'عملیات و پرسنل' },
    'operator-performance': { title: 'راندمان و ارزیابی اپراتورها', category: 'عملیات و پرسنل' },
    traceability: { title: 'رهگیری قطعات و سریال نامبر', category: 'عملیات و پرسنل' },
    reports: { title: 'گزارشات جامع انبار', category: 'سیستم و گزارشات' },
    audit_backup: { title: 'لاگ‌های امنیتی و ممیزی', category: 'سیستم و گزارشات' },
    'audit-logs': { title: 'لاگ‌های امنیتی و ممیزی', category: 'سیستم و گزارشات' },
    backup: { title: 'تنظیمات و پشتیبان‌گیری', category: 'سیستم و گزارشات' },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'پنل مدیریت', category: 'سیستم انبار' };

  return (
    <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/60 shadow-xs px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        
        {/* Right Section (in RTL): Mobile Hamburger + Breadcrumb */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2.5 bg-white/80 hover:bg-white text-slate-700 rounded-xl border border-slate-200/60 shadow-xs transition-all cursor-pointer"
            title="باز کردن منو"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>{companyName || 'انبار هوشمند'}</span>
              <span>/</span>
              <span className="text-indigo-600 font-extrabold">{currentTabInfo.category}</span>
            </div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              {currentTabInfo.title}
            </h1>
          </div>
        </div>

        {/* Left Section (in RTL): Action buttons & User profile */}
        <div className="flex items-center gap-2.5 md:gap-4">
          
          {/* Quick Scanner */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="hidden sm:flex bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs items-center gap-2 transition-all shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/25 cursor-pointer active:scale-98"
          >
            <QrCode className="w-4 h-4" />
            <span>اسکن بارکد</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2.5 bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60 rounded-xl relative transition-all cursor-pointer shadow-xs"
              title="اعلان‌ها"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute left-0 mt-3 w-80 sm:w-96 glass-dropdown rounded-2xl z-50 overflow-hidden flex flex-col shadow-2xl border border-white/80 animate-fadeIn">
                <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="font-black text-slate-900 text-sm">اعلان‌های سیستم</span>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllNotificationsAsRead} 
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-black cursor-pointer bg-indigo-50 px-2 py-1 rounded-lg"
                    >
                      علامت‌گذاری خوانده شده
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100/60">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 font-bold">هیچ اعلان جدیدی وجود ندارد</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.linkTab) setActiveTab(notif.linkTab);
                          setShowNotifs(false);
                        }}
                        className={`p-3.5 cursor-pointer hover:bg-white/60 transition-colors ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                            {notif.type === 'LowStock' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                            {notif.type === 'RequestSubmitted' && <Clock className="w-4 h-4 text-indigo-500 shrink-0" />}
                            {notif.type === 'ProjectFinished' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">{notif.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pr-5">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 pl-3 bg-white/70 hover:bg-white border border-slate-200/60 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
              <div className="text-right hidden md:block">
                <div className="text-xs font-black text-slate-900 leading-tight">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500 font-bold">{roleLabels[currentUser.role] || currentUser.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute left-0 mt-3 w-72 glass-dropdown rounded-2xl z-50 overflow-hidden flex flex-col p-2.5 shadow-2xl border border-white/80 animate-fadeIn">
                <div className="p-3 bg-white/60 border border-slate-200/50 rounded-xl mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-black shadow-sm">
                    {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-black text-xs text-slate-900 truncate">{currentUser.fullName}</div>
                    <div className="text-[11px] text-slate-500 truncate">@{currentUser.username}</div>
                  </div>
                </div>
                
                <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">تغییر کاربر فعال</div>
                <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1 my-1">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCurrentUser(user);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${currentUser.id === user.id ? 'bg-indigo-500/10 text-indigo-700 font-black' : 'hover:bg-white/50 text-slate-700 font-bold'}`}
                    >
                      <span className="truncate">{user.fullName}</span>
                      <span className="text-[9px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-600 font-bold">{roleLabels[user.role] || user.role}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-200/50 mt-1 pt-1.5">
                  <button
                    onClick={() => { setShowUserDropdown(false); logout(); }}
                    className="w-full text-right px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50/80 rounded-xl font-black flex items-center justify-between cursor-pointer transition-colors"
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
