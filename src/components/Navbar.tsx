import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, ChevronDown, LogOut, QrCode, AlertTriangle, Clock, CheckCircle, 
  Menu, Search, Server, Wifi, RefreshCw, Database, HardDrive, Cpu, CheckCircle2, ShieldCheck, X, Zap,
  KeyRound, Eye, EyeOff, Shield, Smartphone, LockKeyhole, Lock, Volume2, VolumeX, MessageSquare, Send
} from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/security';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isCollapsed: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const {
    users, 
    activeTab, setActiveTab,
    notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadCount,
    currentUser, setCurrentUser, logout, changePassword,
    setIsScannerOpen,
    companyName,
    serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer,
    liteMode, setLiteMode,
    soundEnabled, setSoundEnabled,
    browserNotificationPermission, requestNotificationPermission, testBrowserNotification,
    unreadMessagesCount
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [isSyncingManually, setIsSyncingManually] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Change Password State
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changePassStatus, setChangePassStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-xs px-2.5 sm:px-6 lg:px-8 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2 sm:py-3 transition-all">
      <div className="flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Right Section (in RTL): Mobile Hamburger + Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 rounded-xl border border-slate-200/80 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
            title="باز کردن منو"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <span className="truncate">{companyName || 'انبار هوشمند'}</span>
              <span>/</span>
              <span className="text-indigo-600 font-extrabold shrink-0">{currentTabInfo.category}</span>
            </div>
            <h1 className="text-xs sm:text-base md:text-lg lg:text-xl font-black text-slate-900 tracking-tight truncate max-w-[130px] sm:max-w-none">
              {currentTabInfo.title}
            </h1>
          </div>
        </div>

        {/* Left Section (in RTL): Action buttons & User profile */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          
          {/* Central Linux Server Sync Status Badge & Dialog Trigger */}
          <button
            onClick={() => setShowServerModal(true)}
            className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
              serverSyncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80'
                : serverSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                : 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/80'
            }`}
            title="وضعیت اتصال به سرور مرکزی لینوکس"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {serverSyncStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                serverSyncStatus === 'connected' ? 'bg-emerald-500' : serverSyncStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <Server className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline text-[11px]">
              {serverSyncStatus === 'connected' ? 'سرور لینوکس' : serverSyncStatus === 'syncing' ? 'همگام‌سازی...' : 'آفلاین'}
            </span>
          </button>

          {/* Quick Chat Shortcut (if unread messages on mobile) */}
          {unreadMessagesCount > 0 && activeTab !== 'chat' && (
            <button
              onClick={() => setActiveTab('chat')}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs animate-pulse cursor-pointer"
              title="پیام جدید دارید"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[10px]">{unreadMessagesCount}</span>
            </button>
          )}

          {/* Quick Scanner (Tablet / Desktop) */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="hidden md:flex bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs items-center gap-1.5 transition-all shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/25 cursor-pointer active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>اسکن</span>
          </button>

          {/* Lite Mode Toggle */}
          <button
            onClick={() => setLiteMode(!liteMode)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl font-black text-[10px] sm:text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border flex items-center gap-1 ${
              liteMode 
                ? 'bg-amber-50 text-amber-700 border-amber-300' 
                : 'bg-white/80 hover:bg-white text-indigo-700 border-indigo-200/60'
            }`}
            title={liteMode ? "سوییچ به پوسته شیشه‌ای" : "سوییچ به حالت ساده و کم‌مصرف"}
          >
            <Zap className={`w-3.5 h-3.5 ${liteMode ? 'text-amber-600 fill-amber-500' : 'text-indigo-500'}`} />
            <span className="hidden sm:inline">{liteMode ? 'ساده' : 'شیشه‌ای'}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-1.5 sm:p-2 bg-white/80 hover:bg-white text-slate-600 border border-slate-200/70 rounded-xl relative transition-all cursor-pointer shadow-2xs active:scale-95"
              title="اعلان‌ها و کارتابل"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute left-0 mt-3 w-80 sm:w-96 glass-dropdown rounded-2xl z-50 overflow-hidden flex flex-col shadow-2xl border border-white/80 animate-fadeIn">
                <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="font-black text-slate-900 text-sm">اعلان‌ها و کارتابل فوری</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        soundEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                      title={soundEnabled ? "صدای اعلان فعال است (کلیک برای بی‌صدا)" : "صدای اعلان غیرفعال است"}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead} 
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-black cursor-pointer bg-indigo-50 px-2 py-1 rounded-lg"
                      >
                        علامت‌گذاری همه
                      </button>
                    )}
                  </div>
                </div>

                {/* Push Notification Banner */}
                {browserNotificationPermission !== 'granted' && (
                  <div className="p-3 bg-indigo-50/90 border-b border-indigo-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-indigo-900 font-medium">فعال‌سازی اعلان در ویندوز/موبایل:</span>
                    <button
                      onClick={() => requestNotificationPermission()}
                      className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-indigo-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      اجازه دسترسی
                    </button>
                  </div>
                )}

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
                            {notif.type === 'RequestApproved' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                            {notif.type === 'TransferAlert' && <RefreshCw className="w-4 h-4 text-purple-500 shrink-0" />}
                            {notif.type === 'ChatMessage' && <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />}
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

                {/* Footer Quick Actions */}
                <div className="p-2.5 bg-slate-50/80 border-t border-slate-200/50 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      testBrowserNotification();
                    }}
                    className="text-slate-600 hover:text-indigo-600 font-bold px-2 py-1 rounded hover:bg-white transition-colors cursor-pointer text-[11px]"
                  >
                    تست اعلان صوتی/تصویری
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('chat');
                      setShowNotifs(false);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-black px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>ورود به چت</span>
                    {unreadMessagesCount > 0 && (
                      <span className="bg-emerald-600 text-white text-[9px] px-1 rounded-full font-mono">{unreadMessagesCount}</span>
                    )}
                  </button>
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
              <div className="absolute left-0 mt-3 w-80 glass-dropdown rounded-2xl z-50 overflow-hidden flex flex-col p-3 shadow-2xl border border-white/80 animate-fadeIn">
                <div className="p-3.5 bg-white/80 border border-slate-200/60 rounded-2xl mb-2.5 flex items-center gap-3 shadow-xs">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-base font-black shadow-sm shrink-0">
                    {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="font-black text-xs text-slate-900 truncate">{currentUser.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">@{currentUser.username}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200/60">
                        {roleLabels[currentUser.role] || currentUser.role}
                      </span>
                      {currentUser.department && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {currentUser.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security status */}
                <div className="px-3 py-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl mb-2 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>امنیت حساب کاربری</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    SHA-256
                  </span>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowChangePassModal(true);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setChangePassStatus(null);
                    }}
                    className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-white hover:text-indigo-600 flex items-center justify-between transition-colors border border-transparent hover:border-slate-200/60"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-500" />
                      <span>تغییر کلمه عبور من</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">ایمن‌سازی</span>
                  </button>

                  <div className="pt-1 border-t border-slate-200/50">
                    <PWAInstallPrompt compact />
                  </div>
                </div>

                <div className="border-t border-slate-200/50 mt-2 pt-2">
                  <button
                    onClick={() => { setShowUserDropdown(false); logout(); }}
                    className="w-full text-right px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50/80 rounded-xl font-black flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>خروج امن از سیستم</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-normal">Logout</span>
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

      {/* SECURE USER CHANGE PASSWORD MODAL */}
      {showChangePassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">تغییر رمز عبور حساب کاربری</h3>
                  <p className="text-[11px] text-slate-500 font-mono">@{currentUser.username} ({currentUser.fullName})</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePassModal(false);
                  setChangePassStatus(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changePassStatus && (
              <div className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 ${
                changePassStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {changePassStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{changePassStatus.message}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!oldPassword) {
                  setChangePassStatus({ type: 'error', message: 'لطفاً رمز عبور فعلی خود را وارد کنید.' });
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setChangePassStatus({ type: 'error', message: 'رمز عبور جدید با تکرار آن مطابقت ندارد.' });
                  return;
                }
                if (newPassword.length < 4) {
                  setChangePassStatus({ type: 'error', message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
                  return;
                }

                const res = changePassword(currentUser.id, oldPassword, newPassword);
                if (res.success) {
                  setChangePassStatus({ type: 'success', message: res.message });
                  setTimeout(() => {
                    setShowChangePassModal(false);
                    setChangePassStatus(null);
                  }, 1200);
                } else {
                  setChangePassStatus({ type: 'error', message: res.message });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز عبور فعلی:</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-3 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز عبور جدید:</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-3 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      قدرت رمز:{' '}
                      <strong className={
                        evaluatePasswordStrength(newPassword).score >= 3 ? 'text-emerald-600' :
                        evaluatePasswordStrength(newPassword).score === 2 ? 'text-amber-600' : 'text-rose-500'
                      }>
                        {evaluatePasswordStrength(newPassword).label}
                      </strong>
                    </span>
                    <div className="flex gap-1 w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          evaluatePasswordStrength(newPassword).score >= 3 ? 'bg-emerald-500 w-full' :
                          evaluatePasswordStrength(newPassword).score === 2 ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تکرار رمز عبور جدید:</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassModal(false);
                    setChangePassStatus(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ذخیره و رمزنگاری رمز جدید</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
