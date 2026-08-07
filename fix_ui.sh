#!/bin/bash

# Remove Sidebar completely
rm -f src/components/Sidebar.tsx

# 1. Update index.css
cat << 'CSS_EOF' > src/index.css
@import "tailwindcss";

@layer base {
  body {
    font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
    background-color: #f8fafc;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

@media print {
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
}
CSS_EOF

# 2. Rewrite DashboardView.tsx to Bento Grid
cat << 'DASH_EOF' > src/components/DashboardView.tsx
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes, Warehouse, ArrowDownUp, FileCheck, ArrowLeftRight,
  Factory, Building2, Cpu, ClipboardList, Users, SearchCheck,
  Settings, ShieldCheck, ClipboardCheck, LayoutGrid, Package, AlertTriangle, Activity
} from 'lucide-react';
import { items, purchaseRequests } from '../data/mockData';

export const DashboardView: React.FC = () => {
  const { setActiveTab, hasTabPermission } = useApp();

  const tiles = [
    { id: 'items', label: 'کالاها و قطعات', icon: Boxes, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { id: 'warehouses', label: 'انبارها و فضاها', icon: Warehouse, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/30' },
    { id: 'stock_movement', label: 'ورود و خروج', icon: ArrowDownUp, color: 'from-violet-500 to-purple-600', shadow: 'shadow-purple-500/30' },
    { id: 'transfers', label: 'انتقال بین انبار', icon: ArrowLeftRight, color: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/30' },
    { id: 'requests', label: 'درخواست‌های خرید', icon: FileCheck, color: 'from-rose-400 to-red-500', shadow: 'shadow-red-500/30' },
    { id: 'projects', label: 'پروژه‌های تولید', icon: Factory, color: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
    { id: 'contractors', label: 'پیمانکاران', icon: Building2, color: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-pink-500/30' },
    { id: 'bom', label: 'فرمول ساخت (BOM)', icon: Cpu, color: 'from-indigo-400 to-blue-600', shadow: 'shadow-indigo-500/30' },
    { id: 'operator_logger', label: 'ثبت شیفت اپراتور', icon: ClipboardList, color: 'from-teal-400 to-emerald-500', shadow: 'shadow-teal-500/30' },
    { id: 'operator_perf', label: 'راندمان اپراتور', icon: Users, color: 'from-orange-400 to-rose-500', shadow: 'shadow-orange-500/30' },
    { id: 'traceability', label: 'رهگیری قطعات', icon: SearchCheck, color: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/30' },
    { id: 'stock_counting', label: 'انبارگردانی', icon: ClipboardCheck, color: 'from-gray-600 to-slate-700', shadow: 'shadow-slate-500/30' },
    { id: 'backup', label: 'تنظیمات سیستم', icon: Settings, color: 'from-slate-700 to-zinc-900', shadow: 'shadow-zinc-500/30' },
  ];

  const lowStockCount = useMemo(() => {
    return items.filter(it => {
      const totalQty = it.warehouses.reduce((sum, w) => sum + w.quantity, 0);
      return totalQty <= it.minStock;
    }).length;
  }, []);

  const pendingReqs = purchaseRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Quick Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 font-bold mb-1">کل قطعات تعریف شده</p>
            <h3 className="text-3xl font-black text-slate-800">{items.length}</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-7 h-7" />
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 font-bold mb-1">قطعات نیازمند تامین</p>
            <h3 className="text-3xl font-black text-rose-600">{lowStockCount}</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 font-bold mb-1">درخواست‌های باز</p>
            <h3 className="text-3xl font-black text-amber-600">{pendingReqs}</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-2">
        <LayoutGrid className="w-6 h-6 text-slate-400" />
        <h2 className="text-xl font-black text-slate-800 tracking-tight">برنامه‌ها و ماژول‌ها</h2>
      </div>

      {/* Colorful Tiles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {tiles.map((tile) => {
          if (!hasTabPermission(tile.id)) return null;
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => setActiveTab(tile.id)}
              className={`relative overflow-hidden group rounded-3xl p-5 md:p-6 text-right flex flex-col items-start justify-between min-h-[150px] cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-[1.02] shadow-lg ${tile.shadow} bg-gradient-to-br ${tile.color}`}
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"></div>
              
              <div className="bg-white/20 backdrop-blur-sm p-3.5 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-white font-black text-lg md:text-xl tracking-tight z-10 leading-tight">{tile.label}</h3>
              
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
DASH_EOF

# 3. Rewrite Navbar.tsx (Sleek floating top bar)
cat << 'NAV_EOF' > src/components/Navbar.tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutGrid, Bell, ChevronDown, LogOut, QrCode, AlertTriangle, Clock, CheckCircle
} from 'lucide-react';
import { users } from '../data/mockData';

export const Navbar: React.FC = () => {
  const { 
    activeTab, setActiveTab,
    notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadCount,
    currentUser, setCurrentUser, logout,
    setIsScannerOpen
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const roleLabels: Record<string, string> = { superadmin: 'مدیر سیستم', admin: 'مدیر تولید', manager: 'سرپرست انبار', operator: 'اپراتور' };

  return (
    <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1400px] mx-auto h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200'}`}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="font-extrabold hidden sm:block text-sm">اپلیکیشن‌ها</span>
          </button>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter hidden md:block">
            AnbarMeh<span className="text-blue-600">.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 cursor-pointer hover:scale-105 active:scale-95"
          >
            <QrCode className="w-5 h-5" />
            <span className="hidden sm:inline">اسکن بارکد</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-3 bg-slate-100/80 text-slate-600 hover:bg-slate-200 rounded-xl relative transition-all cursor-pointer hover:scale-105"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute left-0 mt-3 w-80 bg-white border border-slate-100 shadow-2xl rounded-3xl z-50 overflow-hidden flex flex-col animate-fadeIn">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="font-black text-slate-800">اعلان‌ها</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer">
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
                        className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
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

          <div className="relative border-r border-slate-200 pr-3 md:pr-5">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-3 p-1.5 hover:bg-slate-100/80 rounded-2xl transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-md">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="text-right hidden md:block">
                <div className="text-sm font-black text-slate-900">{currentUser.fullName}</div>
                <div className="text-[11px] text-slate-500 font-medium">{roleLabels[currentUser.role] || currentUser.role}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
            </button>

            {showUserDropdown && (
              <div className="absolute left-0 mt-3 w-72 bg-white border border-slate-100 shadow-2xl rounded-3xl z-50 overflow-hidden flex flex-col p-2 animate-fadeIn">
                <div className="p-4 bg-slate-50 rounded-2xl mb-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md">
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
                      className={`w-full text-right px-4 py-2.5 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors ${currentUser.id === user.id ? 'bg-blue-50 text-blue-700 font-black' : 'hover:bg-slate-50 text-slate-700 font-bold'}`}
                    >
                      <span>{user.fullName}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-500 font-bold">{roleLabels[user.role]}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => { setShowUserDropdown(false); logout(); }}
                    className="w-full text-right px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl font-black flex items-center justify-between cursor-pointer transition-colors"
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
NAV_EOF

# 4. Rewrite App.tsx (No Sidebar, Top Down Layout, Fixed Padding)
cat << 'APP_EOF' > src/App.tsx
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BarcodeModal } from './components/BarcodeModal';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { WarehousesView } from './components/WarehousesView';
import { StockMovementView } from './components/StockMovementView';
import { TransfersView } from './components/TransfersView';
import { PurchaseRequestsView } from './components/PurchaseRequestsView';
import { ProjectsView } from './components/ProjectsView';
import { BOMView } from './components/BOMView';
import { OperatorLoggerView } from './components/OperatorLoggerView';
import { OperatorPerformanceView } from './components/OperatorPerformanceView';
import { TraceabilityView } from './components/TraceabilityView';
import { ReportsView } from './components/ReportsView';
import { AuditLogsView } from './components/AuditLogsView';
import { BackupView } from './components/BackupView';
import { LinuxInstallerView } from './components/LinuxInstallerView';
import { StockCountingView } from './components/StockCountingView';
import { ContractorsView } from './components/ContractorsView';
import { ShieldAlert } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, setActiveTab, isScannerOpen, setIsScannerOpen, 
    language, isAuthenticated, hasTabPermission, currentUser 
  } = useApp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderView = () => {
    if (!hasTabPermission(activeTab)) {
      return (
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xl">دسترسی مسدود است</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
              حساب کاربری شما (<span className="text-slate-800 font-bold">{currentUser.fullName}</span>) مجوز لازم برای مشاهده این بخش را ندارد.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold w-full hover:bg-slate-800 transition-colors shadow-lg cursor-pointer mt-4"
          >
            بازگشت به برنامه‌ها
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'items': return <ItemsView />;
      case 'warehouses': return <WarehousesView />;
      case 'stock_counting': return <StockCountingView />;
      case 'stock_movement':
      case 'movements': return <StockMovementView />;
      case 'transfers': return <TransfersView />;
      case 'requests':
      case 'purchase-requests': return <PurchaseRequestsView />;
      case 'projects': return <ProjectsView />;
      case 'contractors': return <ContractorsView />;
      case 'bom': return <BOMView />;
      case 'operator_logger':
      case 'operator-logger': return <OperatorLoggerView />;
      case 'operator_perf':
      case 'operator-performance': return <OperatorPerformanceView />;
      case 'traceability': return <TraceabilityView />;
      case 'reports': return <ReportsView />;
      case 'backup': return <BackupView />;
      case 'linux_installer':
      case 'linux-installer': return <LinuxInstallerView />;
      case 'audit_backup':
      case 'audit-logs': return <AuditLogsView />;
      default: return <DashboardView />;
    }
  };

  const isRtl = language === 'fa';

  return (
    <div className={`flex flex-col h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-vazir ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative w-full">
        {/* pb-32 fixes the issue of buttons hiding below the screen */}
        <div className="max-w-[1400px] mx-auto pb-32 space-y-8">
          {renderView()}
        </div>
      </main>

      {isScannerOpen && (
        <BarcodeModal onClose={() => setIsScannerOpen(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
APP_EOF

bash -c "npm run lint && npm run build"
