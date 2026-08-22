import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { BottomNavigation } from './components/BottomNavigation';
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
import { StockCountingView } from './components/StockCountingView';
import { ContractorsView } from './components/ContractorsView';
import { KardexView } from './components/KardexView';
import { ChatView } from './components/ChatView';
import { ShieldAlert } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, setActiveTab, isScannerOpen, setIsScannerOpen, 
    language, isAuthenticated, hasTabPermission, currentUser,
    isInstalled, liteMode
  } = useApp();

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  React.useEffect(() => {
    if (liteMode) {
      document.body.classList.add('lite-mode-active');
    } else {
      document.body.classList.remove('lite-mode-active');
    }
  }, [liteMode]);

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
            بازگشت به داشبورد
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'chat': return <ChatView />;
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
      case 'audit_backup':
      case 'audit-logs': return <AuditLogsView />;
      default: return <DashboardView />;
    }
  };

  const isRtl = language === 'fa';

  return (
    <div className={`flex h-screen bg-transparent text-slate-900 overflow-hidden font-vazir ${isRtl ? 'text-right' : 'text-left'} relative`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Background Ambient Fluid Blobs for Glass Refraction & Water Droplets */}
      {!liteMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] left-[2%] w-[480px] h-[480px] bg-gradient-to-tr from-indigo-500/45 via-purple-500/40 to-pink-500/40 blur-[35px] liquid-blob-1"></div>
          <div className="absolute bottom-[8%] right-[2%] w-[550px] h-[550px] bg-gradient-to-br from-pink-500/40 via-rose-500/35 to-indigo-500/40 blur-[40px] liquid-blob-2"></div>
          <div className="absolute top-[35%] right-[20%] w-[440px] h-[440px] bg-gradient-to-r from-teal-400/40 via-cyan-400/35 to-blue-500/40 blur-[30px] liquid-blob-3"></div>
          
          {/* Glass Water Droplets */}
          <div className="glass-droplet droplet-anim-1 top-[15%] left-[25%] w-16 h-16 rounded-[45%_55%_50%_50%_/_50%_50%_50%_50%]"></div>
          <div className="glass-droplet droplet-anim-2 bottom-[20%] left-[10%] w-20 h-20 rounded-[50%_50%_40%_60%_/_45%_55%_45%_55%]"></div>
          <div className="glass-droplet droplet-anim-3 top-[45%] right-[8%] w-12 h-12 rounded-[55%_45%_55%_45%_/_50%_50%_50%_50%]"></div>
          <div className="glass-droplet droplet-anim-1 bottom-[40%] right-[30%] w-24 h-24 rounded-[40%_60%_50%_50%_/_50%_40%_60%_50%]"></div>
          <div className="glass-droplet droplet-anim-2 top-[8%] right-[40%] w-14 h-14 rounded-[50%_50%_50%_50%]"></div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        isOpenMobile={isOpenMobile} 
        setIsOpenMobile={setIsOpenMobile}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area (offset by Sidebar width on desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 relative z-10 ${
        isRtl 
          ? (isCollapsed ? 'lg:mr-20' : 'lg:mr-72')
          : (isCollapsed ? 'lg:ml-20' : 'lg:ml-72')
      }`}>
        
        {/* Top Header Navbar */}
        <Navbar 
          onToggleMobileSidebar={() => setIsOpenMobile(true)}
          isCollapsed={isCollapsed}
        />
        
        {/* Scrollable View Area */}
        <main className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'chat' ? 'p-0 sm:p-4 md:p-6 lg:p-8 flex flex-col' : 'p-2 sm:p-4 md:p-6 lg:p-8'}`}>
          <div className={`mx-auto w-full ${activeTab === 'chat' ? 'h-full flex-1 pb-18 sm:pb-0' : 'max-w-[1500px] pb-20 sm:pb-24 space-y-4 sm:space-y-6'}`}>
            {renderView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavigation />

      {/* Barcode Scanner Modal */}
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
