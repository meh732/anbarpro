import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BarcodeModal } from './components/BarcodeModal';
import { LoginView } from './components/LoginView';
import { SetupView } from './components/SetupView';
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
import { KardexView } from './components/KardexView';
import { ShieldAlert } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, setActiveTab, isScannerOpen, setIsScannerOpen, 
    language, isAuthenticated, hasTabPermission, currentUser,
    isInstalled
  } = useApp();

  if (!isInstalled) {
    return <SetupView />;
  }

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
      case 'kardex': return <KardexView />;
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
    <div className={`flex flex-col h-screen bg-transparent text-slate-900 overflow-hidden font-vazir ${isRtl ? 'text-right' : 'text-left'} relative`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Background Ambient Fluid Blobs for Glass Refraction & Water Droplets */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Dynamic morphing colorful pools with low blur to keep the liquid shape visible */}
        <div className="absolute top-[5%] left-[2%] w-[480px] h-[480px] bg-gradient-to-tr from-indigo-500/45 via-purple-500/40 to-pink-500/40 blur-[35px] liquid-blob-1"></div>
        <div className="absolute bottom-[8%] right-[2%] w-[550px] h-[550px] bg-gradient-to-br from-pink-500/40 via-rose-500/35 to-indigo-500/40 blur-[40px] liquid-blob-2"></div>
        <div className="absolute top-[35%] right-[20%] w-[440px] h-[440px] bg-gradient-to-r from-teal-400/40 via-cyan-400/35 to-blue-500/40 blur-[30px] liquid-blob-3"></div>
        
        {/* Real Glass Water Droplets floating organically */}
        <div className="glass-droplet droplet-anim-1 top-[15%] left-[25%] w-16 h-16 rounded-[45%_55%_50%_50%_/_50%_50%_50%_50%]"></div>
        <div className="glass-droplet droplet-anim-2 bottom-[20%] left-[10%] w-20 h-20 rounded-[50%_50%_40%_60%_/_45%_55%_45%_55%]"></div>
        <div className="glass-droplet droplet-anim-3 top-[45%] right-[8%] w-12 h-12 rounded-[55%_45%_55%_45%_/_50%_50%_50%_50%]"></div>
        <div className="glass-droplet droplet-anim-1 bottom-[40%] right-[30%] w-24 h-24 rounded-[40%_60%_50%_50%_/_50%_40%_60%_50%]"></div>
        <div className="glass-droplet droplet-anim-2 top-[8%] right-[40%] w-14 h-14 rounded-[50%_50%_50%_50%]"></div>
      </div>

      <Navbar />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative w-full z-10">
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
