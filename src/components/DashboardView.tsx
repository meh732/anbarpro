import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes, Warehouse, ArrowDownUp, FileCheck, ArrowLeftRight,
  Factory, Building2, Cpu, ClipboardList, Users, SearchCheck,
  Settings, ShieldCheck, ClipboardCheck, LayoutGrid, Package, 
  AlertTriangle, Activity, TrendingUp, Clock, CheckCircle2,
  ChevronLeft, Sparkles, Send, Bell, Truck, FileText, Check, 
  Eye, ArrowUpRight, UserCheck, Inbox, ShieldAlert, ShoppingBag, 
  Layers, ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const DashboardView: React.FC = () => {
  const { 
    setActiveTab, hasTabPermission, items, purchaseRequests, 
    inventory, stockInDocs, stockOutDocs, transfers, 
    stockCountings, projects, currentUser, updatePurchaseRequestStatus,
    hasActionPermission, boms
  } = useApp();

  const [selectedWorkflowFilter, setSelectedWorkflowFilter] = useState<'all' | 'purchase' | 'transfer' | 'docs' | 'production'>('all');
  const [quickActionMsg, setQuickActionMsg] = useState<string | null>(null);

  const canEdit = hasActionPermission('edit');

  // ==========================================
  // Calculated Workflow Queues & Pending Metrics
  // ==========================================

  // 1. Purchase Requests
  const pendingPurchaseReqs = useMemo(() => {
    return purchaseRequests.filter(r => r.status === 'Pending');
  }, [purchaseRequests]);

  const urgentPurchaseReqsCount = useMemo(() => {
    return purchaseRequests.filter(r => r.status === 'Pending' && (r.urgency === 'Immediate' || r.urgency === 'High')).length;
  }, [purchaseRequests]);

  const procuringReqsCount = useMemo(() => {
    return purchaseRequests.filter(r => r.status === 'Purchase_Needed').length;
  }, [purchaseRequests]);

  const mySubmittedRequests = useMemo(() => {
    return purchaseRequests.filter(r => 
      r.requesterName === currentUser.fullName || 
      (currentUser.department && r.requestingUnit.includes(currentUser.department))
    );
  }, [purchaseRequests, currentUser]);

  // 2. Transfers
  const pendingTransfers = useMemo(() => {
    return transfers.filter(t => t.status === 'Pending');
  }, [transfers]);

  const inTransitTransfers = useMemo(() => {
    return transfers.filter(t => t.status === 'InTransit');
  }, [transfers]);

  // 3. Draft Stock In & Stock Out Docs
  const draftStockInDocs = useMemo(() => {
    return stockInDocs.filter(d => d.status === 'Draft');
  }, [stockInDocs]);

  const draftStockOutDocs = useMemo(() => {
    return stockOutDocs.filter(d => d.status === 'Draft');
  }, [stockOutDocs]);

  const totalDraftDocsCount = draftStockInDocs.length + draftStockOutDocs.length;

  // 4. Stock Countings
  const activeStockCountings = useMemo(() => {
    return stockCountings.filter(s => s.status === 'InCounting' || s.status === 'PendingReview');
  }, [stockCountings]);

  // 5. Projects & Production Steps
  const pendingProductionSteps = useMemo(() => {
    const list: { project: typeof projects[0]; step: typeof projects[0]['steps'][0] }[] = [];
    projects.forEach(proj => {
      if (proj.status === 'Active' || proj.status === 'Planning') {
        proj.steps?.forEach(st => {
          if (st.status === 'Pending') {
            list.push({ project: proj, step: st });
          }
        });
      }
    });
    return list;
  }, [projects]);

  // 6. Low stock items
  const lowStockItems = useMemo(() => {
    return items.filter(it => {
      const totalQty = inventory.filter(i => i.itemId === it.id || i.itemId === it.code).reduce((s, c) => s + c.quantity, 0);
      return totalQty <= it.minStock;
    });
  }, [items, inventory]);

  // 7. BOMs with critical component shortages
  const bomsWithShortage = useMemo(() => {
    return boms.filter(bom => {
      return bom.items.some(bi => {
        const itemObj = items.find(i => i.id === bi.itemId || i.code === bi.itemId);
        const itemBalances = inventory.filter(inv => inv.itemId === bi.itemId || (itemObj && inv.itemId === itemObj.code));
        const totalStock = itemBalances.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const reservedQty = itemBalances.reduce((acc, curr) => acc + (curr.reservedQuantity || 0), 0);
        const freeStock = Math.max(0, totalStock - reservedQty);
        return freeStock < (bi.quantityNeeded + (bi.scrapAllowanceQty || 0));
      });
    });
  }, [boms, items, inventory]);

  // Total items requiring immediate action across the entire workflow
  const totalPendingActionCount = 
    pendingPurchaseReqs.length + 
    pendingTransfers.length + 
    inTransitTransfers.length + 
    totalDraftDocsCount + 
    activeStockCountings.length +
    pendingProductionSteps.length +
    bomsWithShortage.length;


  // ==========================================
  // Quick 1-Click Action Handler on Dashboard
  // ==========================================
  const handleQuickApprovePurchase = (e: React.MouseEvent, reqId: string, reqNum: string) => {
    e.stopPropagation();
    updatePurchaseRequestStatus(reqId, 'Approved_InStock');
    setQuickActionMsg(`درخواست ${reqNum} با موفقیت تایید شد و به انبار جهت تحویل ارجاع گردید.`);
    setTimeout(() => setQuickActionMsg(null), 4000);
  };

  const handleQuickMarkPurchasing = (e: React.MouseEvent, reqId: string, reqNum: string) => {
    e.stopPropagation();
    updatePurchaseRequestStatus(reqId, 'Purchase_Needed');
    setQuickActionMsg(`درخواست ${reqNum} جهت خرید به کارتابل واحد بازرگانی و تامین ارسال شد.`);
    setTimeout(() => setQuickActionMsg(null), 4000);
  };

  // ==========================================
  // Dynamic Active Workflow Tiles (فقط کارتابل‌های دارای آیتم معلق)
  // ==========================================
  const activeWorkflowTiles = useMemo(() => {
    const tiles: Array<{
      id: 'purchase' | 'transfer' | 'docs' | 'counting' | 'production' | 'my_requests' | 'bom';
      tab: string;
      title: string;
      subtitle: string;
      count: number;
      badgeText: string;
      actionText: string;
      icon: any;
      iconBg: string;
      cardBg: string;
      textColor: string;
      isUrgent?: boolean;
    }> = [];

    // 1. Purchase Requests
    if (pendingPurchaseReqs.length > 0) {
      tiles.push({
        id: 'purchase',
        tab: 'requests',
        title: 'درخواست‌های خرید و تامین',
        subtitle: urgentPurchaseReqsCount > 0 ? `${urgentPurchaseReqsCount} مورد فوری / خیلی مهم` : 'منتظر تایید مدیر و اقدام تدارکات',
        count: pendingPurchaseReqs.length,
        badgeText: `${pendingPurchaseReqs.length} تایید نشده`,
        actionText: 'ورود به کارتابل خرید',
        icon: FileCheck,
        iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30',
        cardBg: 'bg-gradient-to-b from-rose-500/10 via-white to-white border-rose-200 hover:border-rose-400',
        textColor: 'text-rose-700 hover:text-rose-800',
        isUrgent: urgentPurchaseReqsCount > 0,
      });
    }

    // 2. Transfers
    const transfersCount = pendingTransfers.length + inTransitTransfers.length;
    if (transfersCount > 0) {
      tiles.push({
        id: 'transfer',
        tab: 'transfers',
        title: 'حواله‌های انتقال بین انبار',
        subtitle: pendingTransfers.length > 0 ? `${pendingTransfers.length} منتظر ارسال مبدا` : `${inTransitTransfers.length} در حال حمل و تحویل`,
        count: transfersCount,
        badgeText: `${transfersCount} در انتظار`,
        actionText: 'ورود به کارتابل انتقالات',
        icon: ArrowLeftRight,
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30',
        cardBg: 'bg-gradient-to-b from-amber-500/10 via-white to-white border-amber-200 hover:border-amber-400',
        textColor: 'text-amber-700 hover:text-amber-800',
      });
    }

    // 3. Draft Stock In & Stock Out
    if (totalDraftDocsCount > 0) {
      tiles.push({
        id: 'docs',
        tab: 'stock_movement',
        title: 'رسید و حواله ورود/خروج',
        subtitle: `${draftStockInDocs.length} رسید ورود • ${draftStockOutDocs.length} حواله خروج`,
        count: totalDraftDocsCount,
        badgeText: `${totalDraftDocsCount} پیش‌نویس`,
        actionText: 'ورود به اسناد انبارداری',
        icon: ArrowDownUp,
        iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/30',
        cardBg: 'bg-gradient-to-b from-purple-500/10 via-white to-white border-purple-200 hover:border-purple-400',
        textColor: 'text-purple-700 hover:text-purple-800',
      });
    }

    // 4. Stock Counting
    if (activeStockCountings.length > 0) {
      tiles.push({
        id: 'counting',
        tab: 'stock_counting',
        title: 'انبارگردانی و مغایرت‌ها',
        subtitle: 'دوره‌های در حال شمارش و بررسی مغایرت',
        count: activeStockCountings.length,
        badgeText: `${activeStockCountings.length} دوره باز`,
        actionText: 'ورود به انبارگردانی',
        icon: ClipboardCheck,
        iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/30',
        cardBg: 'bg-gradient-to-b from-teal-500/10 via-white to-white border-teal-200 hover:border-teal-400',
        textColor: 'text-teal-700 hover:text-teal-800',
      });
    }

    // 5. Production Steps
    if (pendingProductionSteps.length > 0) {
      tiles.push({
        id: 'production',
        tab: 'projects',
        title: 'تحویل قطعات و مراحل تولید',
        subtitle: `${pendingProductionSteps.length} مرحله منتظر تحویل قطعه به اپراتور`,
        count: pendingProductionSteps.length,
        badgeText: `${pendingProductionSteps.length} مرحله باز`,
        actionText: 'ورود به مدیریت پروژه‌ها',
        icon: Factory,
        iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30',
        cardBg: 'bg-gradient-to-b from-cyan-500/10 via-white to-white border-cyan-200 hover:border-cyan-400',
        textColor: 'text-cyan-700 hover:text-cyan-800',
      });
    }

    // 6. BOMs with component shortage
    if (bomsWithShortage.length > 0) {
      tiles.push({
        id: 'bom',
        tab: 'bom',
        title: 'کسری قطعات فرمول ساخت (BOM)',
        subtitle: `${bomsWithShortage.length} محصول دارای کسری موجودی قطعات خط تولید`,
        count: bomsWithShortage.length,
        badgeText: `${bomsWithShortage.length} کسری فرمول`,
        actionText: 'مشاهده فرمول‌ها و رفع کسری',
        icon: Cpu,
        iconBg: 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-violet-500/30',
        cardBg: 'bg-gradient-to-b from-violet-500/10 via-white to-white border-violet-200 hover:border-violet-400',
        textColor: 'text-violet-700 hover:text-violet-800',
        isUrgent: true,
      });
    }

    // 7. My Active Requests
    const myPendingReqs = mySubmittedRequests.filter(r => r.status === 'Pending' || r.status === 'Purchase_Needed');
    if (myPendingReqs.length > 0) {
      tiles.push({
        id: 'my_requests',
        tab: 'requests',
        title: 'درخواست‌های ارسالی من',
        subtitle: 'پیگیری لحظه‌ای وضعیت تایید و تامین اقلام شما',
        count: myPendingReqs.length,
        badgeText: `${myPendingReqs.length} در جریان`,
        actionText: 'مشاهده و پیگیری',
        icon: Send,
        iconBg: 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-indigo-500/30',
        cardBg: 'bg-gradient-to-b from-indigo-500/10 via-white to-white border-indigo-200 hover:border-indigo-400',
        textColor: 'text-indigo-700 hover:text-indigo-800',
      });
    }

    return tiles;
  }, [
    pendingPurchaseReqs, urgentPurchaseReqsCount, pendingTransfers, 
    inTransitTransfers, totalDraftDocsCount, draftStockInDocs, 
    draftStockOutDocs, activeStockCountings, pendingProductionSteps, 
    bomsWithShortage, mySubmittedRequests
  ]);


  // Static standard module tiles
  const standardTiles = [
    { id: 'items', label: 'کالاها و قطعات', icon: Boxes, color: 'from-blue-500 to-indigo-600', count: items.length, badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'kardex', label: 'کاردکس کالا و انبار', icon: ClipboardList, color: 'from-indigo-500 to-purple-700', count: null, badgeColor: '' },
    { id: 'warehouses', label: 'انبارها و قفسه‌ها', icon: Warehouse, color: 'from-emerald-400 to-teal-500', count: null, badgeColor: '' },
    { id: 'stock_movement', label: 'ورود و خروج', icon: ArrowDownUp, color: 'from-violet-500 to-purple-600', count: totalDraftDocsCount > 0 ? `${totalDraftDocsCount} پیش‌نویس` : null, badgeColor: 'bg-violet-100 text-violet-800' },
    { id: 'transfers', label: 'انتقال بین انبار', icon: ArrowLeftRight, color: 'from-amber-400 to-orange-500', count: (pendingTransfers.length + inTransitTransfers.length) > 0 ? `${pendingTransfers.length + inTransitTransfers.length} در انتظار` : null, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'requests', label: 'درخواست‌های خرید', icon: FileCheck, color: 'from-rose-400 to-red-500', count: pendingPurchaseReqs.length > 0 ? `${pendingPurchaseReqs.length} تایید نشده` : null, badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'projects', label: 'پروژه‌های تولید', icon: Factory, color: 'from-cyan-500 to-blue-500', count: `${projects.length} پروژه`, badgeColor: 'bg-cyan-100 text-cyan-800' },
    { id: 'contractors', label: 'پیمانکاران', icon: Building2, color: 'from-fuchsia-500 to-pink-500', count: null, badgeColor: '' },
    { id: 'bom', label: 'فرمول ساخت (BOM)', icon: Cpu, color: 'from-indigo-400 to-blue-600', count: null, badgeColor: '' },
    { id: 'operator_logger', label: 'ثبت شیفت اپراتور', icon: ClipboardList, color: 'from-teal-400 to-emerald-500', count: null, badgeColor: '' },
    { id: 'operator_perf', label: 'راندمان اپراتور', icon: Users, color: 'from-orange-400 to-rose-500', count: null, badgeColor: '' },
    { id: 'traceability', label: 'رهگیری قطعات', icon: SearchCheck, color: 'from-sky-400 to-blue-500', count: null, badgeColor: '' },
    { id: 'stock_counting', label: 'انبارگردانی', icon: ClipboardCheck, color: 'from-gray-600 to-slate-700', count: activeStockCountings.length > 0 ? `${activeStockCountings.length} فعال` : null, badgeColor: 'bg-slate-200 text-slate-800' },
    { id: 'backup', label: 'پشتیبان و دیتابیس', icon: Settings, color: 'from-slate-700 to-zinc-900', count: null, badgeColor: '' },
  ];

  // Mock chart data for weekly inbound / outbound
  const chartData = [
    { name: 'شنبه', ورود: 4200, خروج: 2400 },
    { name: 'یکشنبه', ورود: 3100, خروج: 1800 },
    { name: 'دوشنبه', ورود: 2600, خروج: 8200 },
    { name: 'سه‌شنبه', ورود: 3800, خروج: 3900 },
    { name: 'چهارشنبه', ورود: 2900, خروج: 4600 },
    { name: 'پنجشنبه', ورود: 4100, خروج: 3200 },
    { name: 'جمعه', ورود: 1500, خروج: 1200 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* ======================================================== */}
      {/* 1. Personalized User Welcome & Action Summary Banner    */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-white/10">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                سیستم آنلاین • همگام با سرور
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold">
                {currentUser.department || 'واحد عملیات و تولید'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>کارپوشه و کارتابل هوشمند:</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-200 to-rose-300">
                {currentUser.fullName}
              </span>
            </h1>

            <p className="text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              وضعیت درخواست‌ها، تاییدات معلق انبار و خط تولید، حواله‌های بین‌انباری و فرآیندهای باز در یک نگاه. با کلیک روی هر کاشی مستقیماً به بخش مربوطه منتقل می‌شوید.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {totalPendingActionCount > 0 ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/15 px-5 py-3.5 rounded-2xl flex items-center gap-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-rose-500/30 border border-rose-500/40 text-rose-300 flex items-center justify-center font-black text-xl">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-bold block">مجموع تاییدات معلق در سیستم</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{totalPendingActionCount}</span>
                    <span className="text-xs text-slate-300">مورد نیازمند بررسی</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-5 py-3.5 rounded-2xl flex items-center gap-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-black text-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-emerald-200 font-bold block">وضعیت کارتابل و فرآیندها</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-white">همه تاییدات انجام شده و کارتابلی معلق نیست</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Flash Alert */}
      {quickActionMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-black">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{quickActionMsg}</span>
          </div>
          <button onClick={() => setQuickActionMsg(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">
            بستن
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Interactive Workflow Tiles (فقط کارتابل‌های دارای مورد معلق) */}
      {/* ======================================================== */}
      {activeWorkflowTiles.length > 0 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">کارتابل کاشیه‌ای درخواست‌ها و تاییدات معلق</h2>
                <p className="text-xs text-slate-500 font-medium">برای ورود به کارتابل و بررسی، روی کاشی مربوطه کلیک کنید</p>
              </div>
            </div>

            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start sm:self-auto">
              {totalPendingActionCount} فرآیند در انتظار اقدام
            </span>
          </div>

          {/* Dynamic Active Workflow Tiles Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${
            activeWorkflowTiles.length === 1 
              ? 'lg:grid-cols-1 max-w-xl' 
              : activeWorkflowTiles.length === 2 
              ? 'lg:grid-cols-2' 
              : activeWorkflowTiles.length === 3 
              ? 'lg:grid-cols-3' 
              : activeWorkflowTiles.length === 4 
              ? 'lg:grid-cols-2 xl:grid-cols-4' 
              : 'lg:grid-cols-3 xl:grid-cols-6'
          } gap-4`}>
            {activeWorkflowTiles.map(tile => {
              const IconComp = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setActiveTab(tile.tab as any)}
                  className={`group relative overflow-hidden text-right p-5 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[190px] shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${tile.cardBg}`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${tile.iconBg}`}>
                      <IconComp className="w-6 h-6" />
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-xs ${
                      tile.isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-rose-600 text-white'
                    }`}>
                      <span>{tile.count}</span>
                      <span className="text-[10px]">معلق</span>
                    </span>
                  </div>

                  <div className="space-y-1 my-3">
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {tile.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {tile.subtitle}
                    </p>
                  </div>

                  <div className={`pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold w-full ${tile.textColor}`}>
                    <span>{tile.actionText}</span>
                    <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. Live Pending Requests Stream with 1-Click Action      */}
      {/* ======================================================== */}
      {totalPendingActionCount > 0 && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6 animate-fadeIn">
          
          {/* Header & Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">لیست زنده فرآیندها و درخواست‌های منتظر تایید</h3>
                <p className="text-xs text-slate-500">مشاهده و بررسی فوری اسناد بدون نیاز به جستجوی دستی</p>
              </div>
            </div>

            {/* Workflow Filter Chips - Only display filters for categories that exist */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedWorkflowFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedWorkflowFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه ({totalPendingActionCount})
              </button>

              {pendingPurchaseReqs.length > 0 && (
                <button
                  onClick={() => setSelectedWorkflowFilter('purchase')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedWorkflowFilter === 'purchase'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  خرید ({pendingPurchaseReqs.length})
                </button>
              )}

              {(pendingTransfers.length + inTransitTransfers.length) > 0 && (
                <button
                  onClick={() => setSelectedWorkflowFilter('transfer')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedWorkflowFilter === 'transfer'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  انتقال بین‌انبار ({pendingTransfers.length + inTransitTransfers.length})
                </button>
              )}

              {totalDraftDocsCount > 0 && (
                <button
                  onClick={() => setSelectedWorkflowFilter('docs')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedWorkflowFilter === 'docs'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  پیش‌نویس انبار ({totalDraftDocsCount})
                </button>
              )}

              {pendingProductionSteps.length > 0 && (
                <button
                  onClick={() => setSelectedWorkflowFilter('production')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedWorkflowFilter === 'production'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  خط تولید ({pendingProductionSteps.length})
                </button>
              )}
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
                
                {/* 1. Purchase Requests Section */}
                {(selectedWorkflowFilter === 'all' || selectedWorkflowFilter === 'purchase') && (
                  pendingPurchaseReqs.map(req => (
                    <div
                      key={req.id}
                      onClick={() => setActiveTab('requests')}
                      className="p-4 rounded-2xl border border-rose-100 hover:border-rose-300 bg-gradient-to-r from-rose-50/50 via-white to-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                              {req.requestNumber}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              درخواست خرید کالا / قطعات
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              req.urgency === 'Immediate' 
                                ? 'bg-red-600 text-white animate-pulse' 
                                : req.urgency === 'High' 
                                ? 'bg-rose-100 text-rose-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {req.urgency === 'Immediate' ? 'خیلی فوری' : req.urgency === 'High' ? 'فوری' : 'عادی'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>واحد: <strong className="text-slate-700">{req.requestingUnit}</strong></span>
                            <span>•</span>
                            <span>ثبت‌کننده: <strong className="text-slate-700">{req.requesterName}</strong></span>
                            <span>•</span>
                            <span>تاریخ: <strong className="text-slate-700 font-mono">{req.date}</strong></span>
                            <span>•</span>
                            <span>تعداد اقلام: <strong className="text-slate-700">{req.items.length} قلم کالا</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleQuickApprovePurchase(e, req.id, req.requestNumber)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="تایید فوری درخواست و ارجاع به انبار"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تایید مستقیم</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkPurchasing(e, req.id, req.requestNumber)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="ارجاع به کارتابل واحد تدارکات و خرید"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>ارجاع به خرید</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveTab('requests')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده در کارتابل</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* 2. Warehouse Transfers Section */}
                {(selectedWorkflowFilter === 'all' || selectedWorkflowFilter === 'transfer') && (
                  transfers.filter(t => t.status === 'Pending' || t.status === 'InTransit').map(tr => (
                    <div
                      key={tr.id}
                      onClick={() => setActiveTab('transfers')}
                      className="p-4 rounded-2xl border border-amber-100 hover:border-amber-300 bg-gradient-to-r from-amber-50/50 via-white to-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                              {tr.docNumber}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              حواله انتقال بین‌انبار {tr.projectName ? `(پروژه: ${tr.projectName})` : ''}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              tr.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {tr.status === 'Pending' ? 'منتظر تایید و ارسال مبدا' : 'در حال حمل / منتظر تایید تحویل مقصد'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>ثبت‌کننده: <strong className="text-slate-700">{tr.requestedBy}</strong></span>
                            <span>•</span>
                            <span>مسئول حمل: <strong className="text-slate-700">{tr.handlerName}</strong></span>
                            <span>•</span>
                            <span>تاریخ: <strong className="text-slate-700 font-mono">{tr.date}</strong></span>
                            <span>•</span>
                            <span>تعداد قطعات: <strong className="text-slate-700">{tr.items.length} قلم</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('transfers')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>بررسی و تایید حواله</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* 3. Draft Stock In & Out Docs */}
                {(selectedWorkflowFilter === 'all' || selectedWorkflowFilter === 'docs') && (
                  [...draftStockInDocs.map(d => ({ ...d, docType: 'in' })), ...draftStockOutDocs.map(d => ({ ...d, docType: 'out' }))].map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setActiveTab('stock_movement')}
                      className="p-4 rounded-2xl border border-purple-100 hover:border-purple-300 bg-gradient-to-r from-purple-50/50 via-white to-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                              {doc.docNumber}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {doc.docType === 'in' ? 'سند رسید ورود به انبار (پیش‌نویس)' : 'سند حواله خروج از انبار (پیش‌نویس)'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                              منتظر تایید نهایی
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>ثبت‌کننده: <strong className="text-slate-700">{doc.registeredBy}</strong></span>
                            <span>•</span>
                            <span>تاریخ: <strong className="text-slate-700 font-mono">{doc.date}</strong></span>
                            <span>•</span>
                            <span>تعداد اقلام: <strong className="text-slate-700">{doc.items.length} ردیف</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('stock_movement')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تایید سند ورود/خروج</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* 4. Production Steps Pending Handover */}
                {(selectedWorkflowFilter === 'all' || selectedWorkflowFilter === 'production') && (
                  pendingProductionSteps.map(({ project, step }) => (
                    <div
                      key={`${project.id}-${step.id}`}
                      onClick={() => setActiveTab('projects')}
                      className="p-4 rounded-2xl border border-cyan-100 hover:border-cyan-300 bg-gradient-to-r from-cyan-50/50 via-white to-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <Factory className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs text-cyan-700 bg-cyan-100/80 px-2 py-0.5 rounded-md">
                              {project.code}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              مرحله «{step.name}» در پروژه «{project.name}»
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-100 text-cyan-800">
                              منتظر تحویل قطعات و شروع
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>مدیر پروژه: <strong className="text-slate-700">{project.projectManager}</strong></span>
                            <span>•</span>
                            <span>مشتری: <strong className="text-slate-700">{project.client}</strong></span>
                            <span>•</span>
                            <span>تیراژ هدف مرحله: <strong className="text-slate-700 font-mono">{step.targetQuantity || project.targetQuantity} عدد</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('projects')}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>تحویل قطعات و شروع مرحله</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. Analytics Chart & Critical Low Stock Alert Card       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area - Takes up 2 columns */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-60 pointer-events-none group-hover:bg-indigo-500/15 transition-colors duration-700"></div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-black text-slate-800">جریان انبارداری و تولید</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">آمار ورود و خروج هفتگی کالاها و قطعات</p>
            </div>
            <div className="flex items-center gap-2 bg-white/50 border border-white/60 p-1.5 rounded-xl backdrop-blur-md text-xs font-bold text-slate-600">
              <span className="px-3 py-1 bg-white shadow-xs rounded-lg text-indigo-600">هفته جاری</span>
              <span className="px-3 py-1 text-slate-400">۳۰ روز اخیر</span>
            </div>
          </div>
          
          <div className="h-64 w-full relative z-10" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                  labelStyle={{ color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="ورود" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="خروج" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock & Shortage Alert Card */}
        <div className="flex flex-col gap-6">
          <div 
            onClick={() => setActiveTab('items')}
            className="bg-gradient-to-br from-rose-500 to-red-600 rounded-[2rem] p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer flex-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-white/80 font-bold mb-1 text-sm">هشدارهای نقطه سفارش و کسری</p>
                <h3 className="text-4xl font-black">{lowStockItems.length}</h3>
                <p className="text-xs mt-3 font-bold bg-white/20 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-md">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span>نیازمند صدور درخواست تامین فوری</span>
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 relative z-10 flex items-center justify-between text-xs font-bold text-white">
              <span>مشاهده و صدور درخواست خرید</span>
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. System Modules Direct Navigation Grid                */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <LayoutGrid className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-800 tracking-tight">ماژول‌ها و بخش‌های عملیاتی سامانه</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
          {standardTiles.map((tile) => {
            if (!hasTabPermission(tile.id)) return null;
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setActiveTab(tile.id)}
                className="relative overflow-hidden group rounded-3xl p-5 text-right flex flex-col items-start justify-between min-h-[160px] cursor-pointer glass-card ios-press shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`bg-gradient-to-br ${tile.color} p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-md shadow-slate-200 border border-white/20 text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {tile.count && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tile.badgeColor}`}>
                      {tile.count}
                    </span>
                  )}
                </div>
                
                <div className="mt-3">
                  <h3 className="text-slate-900 font-black text-xs md:text-sm tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                    {tile.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1 group-hover:text-slate-600">
                    <span>ورود به بخش</span>
                    <ArrowRight className="w-3 h-3 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
