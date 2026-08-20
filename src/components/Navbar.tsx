import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, ChevronDown, LogOut, QrCode, AlertTriangle, Clock, CheckCircle, 
  Menu, Search, Server, Wifi, RefreshCw, Database, HardDrive, Cpu, CheckCircle2, ShieldCheck, X, Zap
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
    companyName,
    serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer,
    liteMode, setLiteMode
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [isSyncingManually, setIsSyncingManually] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncingManually(true);
    setSyncSuccessMessage(null);
    const success = await forceSyncWithServer();
    setIsSyncingManually(false);
    if (success) {
      setSyncSuccessMessage('همگام‌سازی با سرور لینوکس با موفقیت انجام شد!');
      setTimeout(() => setSyncSuccessMessage(null), 3000);
    } else {
      setSyncSuccessMessage('خطا در اتصال به سرور مرکزی لینوکس.');
      setTimeout(() => setSyncSuccessMessage(null), 3000);
    }
  };

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
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>{companyName || 'انبار هوشمند'}</span>
              <span>/</span>
              <span className="text-indigo-600 font-extrabold">{currentTabInfo.category}</span>
            </div>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-slate-900 tracking-tight line-clamp-1 max-w-[130px] sm:max-w-none">
              {currentTabInfo.title}
            </h1>
          </div>
        </div>

        {/* Left Section (in RTL): Action buttons & User profile */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Central Linux Server Sync Status Badge & Dialog Trigger */}
          <button
            onClick={() => setShowServerModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              serverSyncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80'
                : serverSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                : 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/80'
            }`}
            title="وضعیت اتصال به سرور مرکزی لینوکس"
          >
            <span className="relative flex h-2 w-2">
              {serverSyncStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                serverSyncStatus === 'connected' ? 'bg-emerald-500' : serverSyncStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">
              {serverSyncStatus === 'connected' ? 'سرور لینوکس متصل' : serverSyncStatus === 'syncing' ? 'در حال همگام‌سازی...' : 'سرور آفلاین'}
            </span>
          </button>

          {/* Quick Scanner */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="hidden sm:flex bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-2 rounded-xl font-bold text-xs items-center gap-1.5 transition-all shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/25 cursor-pointer active:scale-98"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>اسکن بارکد</span>
          </button>

          {/* Lite Mode Toggle */}
          <button
            onClick={() => setLiteMode(!liteMode)}
            className={`flex items-center gap-1 border px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl font-black text-[10px] sm:text-xs transition-all cursor-pointer active:scale-95 shadow-xs ${
              liteMode 
                ? 'bg-amber-50 text-amber-700 border-amber-300' 
                : 'bg-white/70 hover:bg-white text-indigo-700 border-indigo-200/60'
            }`}
            title={liteMode ? "سوییچ به حالت پوسته شیشه‌ای" : "سوییچ به حالت ساده و پرسرعت"}
          >
            <Zap className={`w-3.5 h-3.5 ${liteMode ? 'text-amber-600 fill-amber-500 animate-bounce' : 'text-indigo-500'}`} />
            <span>{liteMode ? 'حالت ساده' : 'حالت شیشه‌ای'}</span>
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

      {/* Central Linux Server Sync & Diagnostics Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">سرور مرکزی لینوکس و پایگاه داده</h3>
                  <p className="text-xs text-slate-300">همگام‌سازی لحظه‌ای بین تمام کامپیوترها و کلاینت‌ها</p>
                </div>
              </div>
              <button 
                onClick={() => setShowServerModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-sm">
              {/* Connection Status Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                serverSyncStatus === 'connected'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : serverSyncStatus === 'syncing'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    serverSyncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : serverSyncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-rose-500'
                  }`} />
                  <div>
                    <div className="font-black text-sm">
                      {serverSyncStatus === 'connected' ? 'اتصال آنلاین برقرار است (پایگاه داده مرکزی متصل)' : serverSyncStatus === 'syncing' ? 'در حال برقراری ارتباط...' : 'عدم اتصال به سرور مرکزی'}
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">
                      آخرین زمان همگام‌سازی: {lastSyncTime || 'لحظاتی پیش'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/80 shadow-xs">
                  ورژن: {serverVersion || 1}
                </span>
              </div>

              {/* Notification Message if any */}
              {syncSuccessMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{syncSuccessMessage}</span>
                </div>
              )}

              {/* Server Info Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                    <span>محل ذخیره روی سرور:</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800 dir-ltr text-right truncate" title={serverInfo?.dataFile || '/data/server_database.json'}>
                    {serverInfo?.dataFile || '/data/server_database.json'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    <span>حجم دیتابیس سرور:</span>
                  </div>
                  <div className="font-bold text-xs text-slate-800">
                    {serverInfo?.dataSizeKb ? `${serverInfo.dataSizeKb} کیلوبایت` : 'ذخیره‌شده در حافظه سرور'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <span>محیط اجرای سرور:</span>
                  </div>
                  <div className="font-bold text-xs text-slate-800">
                    {serverInfo?.platform ? `${serverInfo.platform} (${serverInfo.arch})` : 'Linux Server'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                    <span>شبکه و پورت:</span>
                  </div>
                  <div className="font-bold text-xs text-slate-800">
                    Port: 3000 (پورت سراسری)
                  </div>
                </div>
              </div>

              {/* Multi-PC Sync Explanation */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  <strong>عملکرد شبکه چندکاربره:</strong> تمام تراکنش‌ها، کالاها، انبارها، ورود/خروج و فرمول‌های ساخت بلافاصله روی فایل مرکزی سرور لینوکس ذخیره شده و به طور خودکار در تمامی سیستم‌ها و رایانه‌های متصل به‌روزرسانی می‌شوند.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={handleManualSync}
                disabled={isSyncingManually}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManually ? 'animate-spin' : ''}`} />
                <span>{isSyncingManually ? 'در حال همگام‌سازی...' : 'همگام‌سازی دستی فوری'}</span>
              </button>

              <button
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
