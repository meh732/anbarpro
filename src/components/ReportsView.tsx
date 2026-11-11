import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Printer, Download, FileSpreadsheet, 
  Layers, Factory, ArrowDownUp, Users, CheckCircle2,
  AlertTriangle, Filter, Search, Warehouse, Package, 
  TrendingDown, TrendingUp, DollarSign, Calendar, Clock,
  FileText, ShieldCheck, CheckCircle, FileDown, Loader2, X
} from 'lucide-react';
import { formatCurrency } from '../utils/security';
import { exportElementToPdf } from '../utils/pdfExport';
import { printElement } from '../utils/printEngine';
import { matchesItem } from '../utils/searchEngine';

export const ReportsView: React.FC = () => {
  const { 
    inventory, warehouses, items, stockInDocs, stockOutDocs, 
    projects, operators, productionLogs, stockCountings, 
    currentUser, companyName, itemGroups, boms, materialHandovers,
    contractorTransactions, fiscalYears
  } = useApp();

  const userCanViewPrice = currentUser?.canViewPrices ?? (
    currentUser?.role === 'SystemAdmin' || currentUser?.role === 'PlantManager' || currentUser?.role === 'WarehouseManager'
  );

  const [activeReportTab, setActiveReportTab] = useState<'inventory' | 'valuation' | 'movements' | 'counting' | 'projects' | 'operators'>('inventory');

  // Filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');

  // Helper to get min threshold
  const getItemMinStock = (it: any) => {
    if (!it) return 0;
    if (typeof it.minStockAlert === 'number') return it.minStockAlert;
    return typeof it.minStock === 'number' ? it.minStock : 0;
  };

  // 1. Filtered Inventory Data
  const filteredInventory = useMemo(() => {
    return inventory.filter(inv => {
      const item = items.find(i => i.id === inv.itemId);
      const wh = warehouses.find(w => w.id === inv.warehouseId);
      if (!item || !wh) return false;

      if (selectedWarehouseId !== 'all' && inv.warehouseId !== selectedWarehouseId) return false;
      if (selectedGroupId !== 'all' && item.group !== selectedGroupId) return false;

      const minThreshold = getItemMinStock(item);

      if (stockStatusFilter === 'low' && (inv.quantity > minThreshold || inv.quantity === 0)) return false;
      if (stockStatusFilter === 'out' && inv.quantity > 0) return false;
      if (stockStatusFilter === 'normal' && (inv.quantity <= minThreshold)) return false;

      if (searchQuery.trim()) {
        const isMatched = matchesItem(item, searchQuery, {
          warehouseNames: [wh.name],
          warehouseCodes: [wh.code]
        });
        if (!isMatched) return false;
      }

      return true;
    });
  }, [inventory, items, warehouses, selectedWarehouseId, selectedGroupId, stockStatusFilter, searchQuery]);

  // Category Breakdown Summary (Mechanical, Electronic, SemiFinished, Finished, etc.)
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { groupName: string; itemIds: Set<string>; totalQty: number; totalValue: number; lowCount: number }>();
    filteredInventory.forEach(inv => {
      const it = items.find(i => i.id === inv.itemId);
      if (!it) return;
      const grp = it.group || 'عمومی';
      const entry = map.get(grp) || { groupName: grp, itemIds: new Set<string>(), totalQty: 0, totalValue: 0, lowCount: 0 };
      entry.itemIds.add(it.id);
      entry.totalQty += inv.quantity;
      const uPrice = it.price || it.unitPrice || 0;
      entry.totalValue += inv.quantity * uPrice;
      if (inv.quantity <= getItemMinStock(it)) entry.lowCount += 1;
      map.set(grp, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredInventory, items]);

  // Overall Inventory Valuation Stats
  const valuationStats = useMemo(() => {
    let totalItemsCount = 0;
    let totalInventoryQuantity = 0;
    let totalRialValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach(inv => {
      const it = items.find(i => i.id === inv.itemId);
      if (it) {
        totalItemsCount++;
        totalInventoryQuantity += inv.quantity;
        const uPrice = it.price || it.unitPrice || 0;
        totalRialValue += (inv.quantity * uPrice);
        const minThreshold = getItemMinStock(it);
        if (inv.quantity === 0) outOfStockCount++;
        else if (inv.quantity <= minThreshold) lowStockCount++;
      }
    });

    return {
      totalItemsCount,
      totalInventoryQuantity,
      totalRialValue,
      lowStockCount,
      outOfStockCount
    };
  }, [inventory, items]);

  // 0-to-100 Project Lifecycle Analytics
  const displayedProjects = useMemo(() => {
    if (selectedProjectId === 'all') return projects;
    return projects.filter(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const flattenStepsForReport = (steps: any[] = [], level = 0): { step: any; level: number }[] => {
    let list: { step: any; level: number }[] = [];
    steps.forEach(s => {
      list.push({ step: s, level });
      const nested = (s.subSteps && s.subSteps.length > 0) ? s.subSteps : s.children;
      if (nested && nested.length > 0) {
        list = list.concat(flattenStepsForReport(nested, level + 1));
      }
    });
    return list;
  };

  // Operator Performance Analytics
  const operatorAnalytics = useMemo(() => {
    const filteredOps = selectedOperatorId === 'all' ? operators : operators.filter(o => o.id === selectedOperatorId);
    return filteredOps.map(op => {
      const opLogs = productionLogs.filter(l => l.operatorId === op.id || l.operatorName === op.name);
      const loggedHealthy = opLogs.reduce((s, l) => s + (l.quantityProduced || 0), 0);
      const loggedScrap = opLogs.reduce((s, l) => s + (l.quantityScrapped || 0), 0);
      const totalHealthy = Math.max(op.totalProducedPieces || 0, loggedHealthy);
      const totalAttempted = totalHealthy + loggedScrap;
      const qualityRate = totalAttempted > 0 ? Math.round((totalHealthy / totalAttempted) * 1000) / 10 : 100;
      const handoversCount = materialHandovers.filter(h => h.operatorId === op.id || h.operatorName === op.name).length;

      return {
        ...op,
        totalHealthy,
        totalScrap: loggedScrap,
        qualityRate,
        logsCount: opLogs.length,
        handoversCount
      };
    });
  }, [operators, productionLogs, materialHandovers, selectedOperatorId]);

  // Export to CSV helper
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrint = () => {
    printElement('printable-report-area', {
      title: `گزارش_${activeReportTab}_${new Date().toISOString().substring(0, 10)}`,
      orientation: 'portrait'
    });
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('printable-report-area', {
        filename: `report-${activeReportTab}-${new Date().toISOString().substring(0, 10)}.pdf`,
        orientation: 'portrait',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div id="reports-management-view" className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              مرکز جامع گزارشات مدیریتی (صفر تا صد پروژه‌ها، انبارها و کارکرد اپراتورها)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              گزارش‌های استاندارد به تفکیک گروه کالایی (مکانیکی و الکترونیکی)، انبار، مراحل پروژه، مغایرت انبارگردانی و خروجی Excel / PDF / Print
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct PDF Export */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            title="دانلود مستقیم خروجی PDF گزارش"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>{isExportingPdf ? 'تولید PDF...' : 'خروجی مستقیم PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ رسمی گزارش</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REPORT TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto text-xs font-black custom-scrollbar print:hidden">
        
        <button
          onClick={() => setActiveReportTab('inventory')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'inventory' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>گزارش انبارها و گروه‌های کالایی</span>
        </button>

        {userCanViewPrice && (
          <button
            onClick={() => setActiveReportTab('valuation')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeReportTab === 'valuation' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>ارزش‌گذاری ریالی انبار</span>
          </button>
        )}

        <button
          onClick={() => setActiveReportTab('projects')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'projects' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>گزارش صفر تا صد پروژه‌ها (BOM و مراحل)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('operators')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'operators' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>گزارش جامع کارکرد اپراتورها</span>
        </button>

        <button
          onClick={() => setActiveReportTab('movements')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'movements' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          <span>گردش اسناد (ورود و خروج)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('counting')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'counting' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>انبارگردانی و اسناد سال مالی</span>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER TOOLBAR (FOR INVENTORY & VALUATION) */}
      {/* ========================================================================= */}
      {(activeReportTab === 'inventory' || activeReportTab === 'valuation') && (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی پیشرفته در تمام پارامترها (کد، نام، بارکد، مشخصات، انبار)..."
                className="w-full text-xs font-bold pr-9 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Warehouse Select */}
            <div>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
              >
                <option value="all">همه انبارها ({warehouses.length} انبار)</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {/* Item Group Select */}
            <div>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
              >
                <option value="all">همه سرفصل‌ها و گروه‌های کالا (مکانیکی و الکترونیکی)</option>
                {itemGroups.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Stock Level Filter */}
            <div>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
              >
                <option value="all">همه سطوح موجودی</option>
                <option value="low">فقط اقلام کسری و زیر نقطه سفارش</option>
                <option value="out">فقط اقلام ناموجود (صفر)</option>
                <option value="normal">اقلام با موجودی کافی</option>
              </select>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN REPORT CONTENT CONTAINER (PRINTABLE FORMAT) */}
      {/* ========================================================================= */}
      <div id="printable-report-area" className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs print:border-none print:p-0 print:shadow-none space-y-6">
        
        {/* Printable Official Header */}
        <div className="hidden print:flex justify-between items-center border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">{companyName || 'مجموعه تولیدی و صنعتی'}</h1>
            <p className="text-xs text-slate-600 mt-0.5">گزارش رسمی سامانه یکپارچه مدیریت انبار، لجستیک و تولید</p>
          </div>
          <div className="text-left font-mono text-xs space-y-0.5 text-slate-700">
            <div>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>کاربر گزارش‌گیرنده: {currentUser.fullName}</div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INVENTORY PER WAREHOUSE & CATEGORY BREAKDOWN */}
        {/* ========================================================================= */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-6">
            {/* Category Breakdown Summary Table (Mechanical, Electronic, Semi-Finished, etc.) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-black text-sm text-indigo-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>خلاصه تفکیکی موجودی بر اساس سرفصل و گروه کالایی (مکانیکی، صنعتی، الکترونیکی و نیمه‌ساخته)</span>
                </h3>
                <button
                  onClick={() => {
                    const headers = ["سرفصل / گروه کالایی", "تنوع اقلام (تعداد کالا)", "مجموع موجودی فیزیکی", "اقلام زیر نقطه سفارش", ...(userCanViewPrice ? ["ارزش کل ریالی"] : [])];
                    const rows = categoryBreakdown.map(c => [
                      c.groupName,
                      c.itemIds.size,
                      c.totalQty,
                      c.lowCount,
                      ...(userCanViewPrice ? [c.totalValue] : [])
                    ]);
                    handleExportCSV(`تفکیک-گروه-کالایی-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer print:hidden self-end sm:self-auto"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>خروجی اکسل تفکیک گروه‌ها</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 truncate">{cat.groupName}</span>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        {cat.itemIds.size} نوع کالا
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/70">
                      <span className="text-slate-500">مجموع موجودی:</span>
                      <strong className="font-mono text-slate-800">{cat.totalQty.toLocaleString('fa-IR')} واحد</strong>
                    </div>
                    {userCanViewPrice && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">ارزش گروه:</span>
                        <strong className="font-mono text-indigo-700">{formatCurrency(cat.totalValue)}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">ماتریس تفصیلی موجودی لحظه‌ای قطعات و کالاها به تفکیک انبار</h3>
                <span className="text-xs font-bold text-slate-500">({filteredInventory.length} رکورد)</span>
              </div>

              <button
                onClick={() => {
                  const headers = ["کد کالا", "نام قطعه / کالا", "نوع کالا", "گروه اصلی", "زیرگروه", "انبار", "موجودی فعلی", "واحد", "حداقل موجودی", "موقعیت قفسه", "وضعیت"];
                  const rows = filteredInventory.map(inv => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const minVal = getItemMinStock(item);
                    const isLow = item && inv.quantity <= minVal;
                    return [
                      item?.code || '',
                      item?.name || '',
                      item?.itemType || '',
                      item?.group || '',
                      item?.subGroup || '',
                      wh?.name || '',
                      inv.quantity,
                      item?.unit || '',
                      minVal,
                      item?.locationInRack || '',
                      isLow ? 'کسری' : 'نرمال'
                    ];
                  });
                  handleExportCSV(`گزارش-موجودی-انبارها-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer self-end sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل کامل موجودی (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold select-none">
                    <th className="py-2.5 px-3">کد کالا</th>
                    <th className="py-2.5 px-3 min-w-[180px]">نام و مشخصات کالا</th>
                    <th className="py-2.5 px-3">سرفصل / گروه</th>
                    <th className="py-2.5 px-3">انبار</th>
                    <th className="py-2.5 px-3 text-center">موجودی فعلی</th>
                    <th className="py-2.5 px-3 text-center">نقطه سفارش</th>
                    <th className="py-2.5 px-3">قفسه / راهرو</th>
                    <th className="py-2.5 px-3 text-center">وضعیت انبار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                        هیچ موردی با فیلترهای انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((inv, idx) => {
                      const item = items.find(i => i.id === inv.itemId);
                      const wh = warehouses.find(w => w.id === inv.warehouseId);
                      const minVal = getItemMinStock(item);
                      const isLow = item && inv.quantity <= minVal;
                      const isZero = inv.quantity === 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 text-[11px]">{item?.code}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">{item?.name}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            <span className="font-bold">{item?.group || '—'}</span>
                            {item?.subGroup && item.subGroup !== 'عمومی' && (
                              <span className="block text-[10px] text-slate-400">{item.subGroup}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">{wh?.name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                            {inv.quantity.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-500 font-normal">{item?.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{minVal}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{item?.locationInRack || '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isZero ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                ناموجود
                              </span>
                            ) : isLow ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                زیر حداقل هشدار
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                مطلوب
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VALUATION OF INVENTORY (FINANCIAL AUDIT) */}
        {/* ========================================================================= */}
        {activeReportTab === 'valuation' && userCanViewPrice && (
          <div className="space-y-4">
            
            {/* Top Valuation Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                <span className="text-xs text-indigo-700 font-bold block mb-1">ارزش کل ریالی موجودی انبارها:</span>
                <span className="text-xl font-black text-indigo-950 font-mono">
                  {formatCurrency(valuationStats.totalRialValue)}
                </span>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                <span className="text-xs text-emerald-700 font-bold block mb-1">مجموع کل قطعات و واحدها:</span>
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {valuationStats.totalInventoryQuantity.toLocaleString('fa-IR')} <span className="text-xs font-normal">واحد</span>
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-600 font-bold block mb-1">تعداد رکوردهای انبار:</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {valuationStats.totalItemsCount} <span className="text-xs font-normal">قلم</span>
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center print:hidden pt-2">
              <h3 className="font-black text-sm text-slate-900">جدول ارزش‌گذاری ریالی به تفکیک قطعات و انبار</h3>
              <button
                onClick={() => {
                  const headers = ["کد کالا", "نام کالا", "گروه کالا", "انبار", "موجودی", "فی واحد", "ارزش کل"];
                  const rows = filteredInventory.map(inv => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const price = item?.price || item?.unitPrice || 0;
                    return [
                      item?.code || '',
                      item?.name || '',
                      item?.group || '',
                      wh?.name || '',
                      inv.quantity,
                      price,
                      inv.quantity * price
                    ];
                  });
                  handleExportCSV(`ارزش‌گذاری-ریالی-انبار-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود گزارش ارزش‌گذاری (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold select-none">
                    <th className="py-2.5 px-3">کد کالا</th>
                    <th className="py-2.5 px-3">نام قطعه</th>
                    <th className="py-2.5 px-3">گروه کالا</th>
                    <th className="py-2.5 px-3">انبار</th>
                    <th className="py-2.5 px-3 text-center">موجودی</th>
                    <th className="py-2.5 px-3 text-left">فی واحد</th>
                    <th className="py-2.5 px-3 text-left">ارزش کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {filteredInventory.map((inv, idx) => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const price = item?.price || item?.unitPrice || 0;
                    const totalVal = inv.quantity * price;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{item?.code}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{item?.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item?.group || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{wh?.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{inv.quantity.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-left font-mono text-slate-600">{formatCurrency(price)}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-indigo-900">{formatCurrency(totalVal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MOVEMENTS (RECEIPTS & ISSUES) */}
        {/* ========================================================================= */}
        {activeReportTab === 'movements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-700 block mb-1">تعداد کل رسیدهای ورود به انبار (شامل افتتاحیه و تعدیل):</span>
                  <strong className="text-2xl font-mono text-emerald-950">{stockInDocs.length} سند</strong>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                  <span className="text-xs font-bold text-rose-700 block mb-1">تعداد کل حواله‌های خروج از انبار (شامل اختتامیه و مصرف):</span>
                  <strong className="text-2xl font-mono text-rose-950">{stockOutDocs.length} سند</strong>
                </div>
              </div>
              <button
                onClick={() => {
                  const headers = ["نوع سند", "شماره سند", "تاریخ", "نوع عملیات", "طرف حساب / تحویل‌گیرنده", "انبار", "تعداد اقلام", "ثبت‌کننده"];
                  const inRows = stockInDocs.map(d => [
                    "رسید ورود",
                    d.docNumber || d.documentNumber || '',
                    d.date,
                    d.entryType,
                    d.supplier || d.supplierName || '',
                    warehouses.find(w => w.id === d.warehouseId)?.name || d.warehouseName || '',
                    d.items.length,
                    d.registeredBy
                  ]);
                  const outRows = stockOutDocs.map(d => [
                    "حواله خروج",
                    d.docNumber,
                    d.date,
                    d.exitType,
                    d.recipient,
                    warehouses.find(w => w.id === d.warehouseId)?.name || '',
                    d.items.length,
                    d.registeredBy
                  ]);
                  handleExportCSV(`گردش-اسناد-ورود-خروج-${new Date().toLocaleDateString('fa-IR')}`, headers, [...inRows, ...outRows]);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer print:hidden self-end sm:self-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل کلیه اسناد ورود و خروج</span>
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-black text-sm text-emerald-900">فهرست اسناد رسید ورود به انبار (خرید، برگشت، افتتاحیه و تعدیل مازاد):</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">شماره سند</th>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">نوع ورود</th>
                      <th className="py-2.5 px-3">تامین‌کننده / مبدا</th>
                      <th className="py-2.5 px-3">انبار مقصد</th>
                      <th className="py-2.5 px-3 text-center">تعداد اقلام</th>
                      <th className="py-2.5 px-3">ثبت‌کننده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {stockInDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{doc.docNumber || doc.documentNumber}</td>
                        <td className="py-2.5 px-3 font-mono">{doc.date}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {doc.entryType === 'OpeningBalance' ? 'سند افتتاحیه سال مالی' : doc.entryType === 'StockAdjustment' ? 'تعدیل انبارگردانی' : doc.entryType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold">{doc.supplier || doc.supplierName}</td>
                        <td className="py-2.5 px-3">{warehouses.find(w => w.id === doc.warehouseId)?.name || doc.warehouseName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{doc.items.length}</td>
                        <td className="py-2.5 px-3 text-slate-500">{doc.registeredBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-black text-sm text-rose-900">فهرست اسناد حواله خروج از انبار (مصرف پروژه، اختتامیه و تعدیل کسری):</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">شماره سند</th>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">نوع خروج</th>
                      <th className="py-2.5 px-3">تحویل‌گیرنده / مقصد</th>
                      <th className="py-2.5 px-3">انبار مبدا</th>
                      <th className="py-2.5 px-3 text-center">تعداد اقلام</th>
                      <th className="py-2.5 px-3">ثبت‌کننده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {stockOutDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{doc.docNumber}</td>
                        <td className="py-2.5 px-3 font-mono">{doc.date}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {doc.exitType === 'ClosingBalance' ? 'سند اختتامیه سال مالی' : doc.exitType === 'StockAdjustment' ? 'تعدیل انبارگردانی' : doc.exitType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold">{doc.recipient}</td>
                        <td className="py-2.5 px-3">{warehouses.find(w => w.id === doc.warehouseId)?.name || doc.warehouseId}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{doc.items.length}</td>
                        <td className="py-2.5 px-3 text-slate-500">{doc.registeredBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COUNTING SESSIONS & FISCAL YEAR ROLLOVER REPORT */}
        {/* ========================================================================= */}
        {activeReportTab === 'counting' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-black text-sm text-slate-900">تاریخچه دوره‌های انبارگردانی، مغایرت‌گیری و اسناد تعدیل</h3>
              <button
                onClick={() => {
                  const headers = ["شماره صورتجلسه", "عنوان دوره", "انبار", "تاریخ شروع", "تعداد کل اقلام", "اقلام کسری", "اقلام مازاد", "سند مازاد", "سند کسری", "وضعیت"];
                  const rows = stockCountings.map(sc => {
                    const defCount = sc.items.filter(i => ((i.finalCount ?? i.physicalQuantity) - i.systemQuantity) < 0).length;
                    const surCount = sc.items.filter(i => ((i.finalCount ?? i.physicalQuantity) - i.systemQuantity) > 0).length;
                    return [
                      sc.sessionNumber,
                      sc.title,
                      sc.warehouseName,
                      sc.startDate,
                      sc.items.length,
                      defCount,
                      surCount,
                      sc.surplusDocNumber || '-',
                      sc.deficitDocNumber || '-',
                      sc.status === 'Applied' ? 'سند تعدیل صادر شده' : 'در حال شمارش'
                    ];
                  });
                  handleExportCSV(`گزارش-انبارگردانی-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer print:hidden"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل انبارگردانی (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">شماره صورتجلسه</th>
                    <th className="py-2.5 px-3">عنوان دوره</th>
                    <th className="py-2.5 px-3">انبار</th>
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-3 text-center">کل اقلام</th>
                    <th className="py-2.5 px-3 text-center">کسری / مازاد</th>
                    <th className="py-2.5 px-3">اسناد تعدیل صادره</th>
                    <th className="py-2.5 px-3 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {stockCountings.map(sc => {
                    const defCount = sc.items.filter(i => ((i.finalCount ?? i.physicalQuantity) - i.systemQuantity) < 0).length;
                    const surCount = sc.items.filter(i => ((i.finalCount ?? i.physicalQuantity) - i.systemQuantity) > 0).length;
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{sc.sessionNumber}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{sc.title}</td>
                        <td className="py-2.5 px-3 font-bold">{sc.warehouseName}</td>
                        <td className="py-2.5 px-3 font-mono">{sc.startDate}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{sc.items.length}</td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="text-rose-600 font-bold">{defCount} کسری</span> / <span className="text-emerald-600 font-bold">{surCount} مازاد</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {sc.surplusDocNumber || sc.deficitDocNumber ? (
                            <div className="space-y-0.5">
                              {sc.surplusDocNumber && <div className="text-emerald-700">مازاد: {sc.surplusDocNumber}</div>}
                              {sc.deficitDocNumber && <div className="text-rose-700">کسری: {sc.deficitDocNumber}</div>}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            sc.status === 'Applied' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sc.status === 'Applied' ? 'سند تعدیل صادر شده' : 'در حال شمارش'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fiscal Years & Closing/Opening Vouchers Report */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h3 className="font-black text-sm text-amber-900">گزارش دوره‌های مالی و اسناد اختتامیه / افتتاحیه انبارها</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">کد سال</th>
                      <th className="py-2.5 px-3">عنوان سال مالی</th>
                      <th className="py-2.5 px-3">بازه زمانی</th>
                      <th className="py-2.5 px-3 text-center">وضعیت</th>
                      <th className="py-2.5 px-3">اسناد اختتامیه (CLS)</th>
                      <th className="py-2.5 px-3">اسناد افتتاحیه (OPN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {fiscalYears.map(fy => (
                      <tr key={fy.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{fy.yearCode}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{fy.title}</td>
                        <td className="py-2.5 px-3 font-mono">{fy.startDate} الی {fy.endDate}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            fy.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {fy.status === 'Active' ? 'فعال (جاری)' : `بسته شده (${fy.closedAt || ''})`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-rose-700">
                          {fy.closingDocNumbers?.length ? fy.closingDocNumbers.join(' ، ') : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-700">
                          {fy.openingDocNumbers?.length ? fy.openingDocNumbers.join(' ، ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: 0-TO-100 PROJECT LIFECYCLE REPORT (STAGES, SUB-STAGES, BOM VARIANCE) */}
        {/* ========================================================================= */}
        {activeReportTab === 'projects' && (
          <div className="space-y-6">
            {/* Project Filter & Excel Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-black text-slate-700">انتخاب پروژه جهت گزارش صفر تا صد:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-800"
                >
                  <option value="all">همه پروژه‌های تولید ({projects.length} پروژه)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) - پیشرفت: {p.progressPercent}%</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  const headers = [
                    "کد پروژه", "نام پروژه", "مشتری", "مدیر پروژه", "تیراژ هدف", "تیراژ تولید شده", "پیشرفت پروژه (%)",
                    "شماره مرحله", "نام مرحله / زیرمرحله", "مسئول / پیمانکار", "هدف مرحله", "تکمیل شده مرحله", "ضایعات مرحله", "پیشرفت مرحله (%)", "وضعیت مرحله"
                  ];
                  const rows: (string | number)[][] = [];
                  displayedProjects.forEach(p => {
                    const flat = flattenStepsForReport(p.steps || []);
                    if (flat.length === 0) {
                      rows.push([p.code, p.name, p.client, p.projectManager, p.targetQuantity, p.producedQuantity, p.progressPercent, '-', '-', '-', 0, 0, 0, 0, p.status]);
                    } else {
                      flat.forEach(({ step: s, level }) => {
                        const stepTarget = s.outputQuantity || s.targetQuantity || p.targetQuantity || 0;
                        const stepDone = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
                        const stepPrg = s.status === 'Completed' ? 100 : (s.progressPercent ?? (stepTarget > 0 ? Math.min(100, Math.round((stepDone / stepTarget) * 100)) : 0));
                        rows.push([
                          p.code,
                          p.name,
                          p.client,
                          p.projectManager,
                          p.targetQuantity,
                          p.producedQuantity,
                          p.progressPercent,
                          level > 0 ? `زیرمرحله ${s.stepNumber || ''}` : `مرحله ${s.stepNumber || ''}`,
                          s.name || s.title || '',
                          s.contractorName || s.responsiblePerson || 'داخلی',
                          stepTarget,
                          stepDone,
                          s.scrapQuantity || 0,
                          stepPrg,
                          s.status === 'Completed' ? 'تکمیل شده' : s.status === 'InProgress' ? 'در حال انجام' : 'در انتظار'
                        ]);
                      });
                    }
                  });
                  handleExportCSV(`گزارش-صفر-تا-صد-پروژه-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer self-end sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل صفر تا صد پروژه‌ها (CSV)</span>
              </button>
            </div>

            {displayedProjects.map(proj => {
              const flatSteps = flattenStepsForReport(proj.steps || []);
              const targetProduct = items.find(i => i.id === proj.targetFinishedItemId);
              const projBom = boms.find(b => b.finishedItemId === proj.targetFinishedItemId && b.isActive);
              const projHandovers = materialHandovers.filter(h => h.projectId === proj.id);
              const projContractorTxs = contractorTransactions.filter(tx => tx.projectId === proj.id && tx.type === 'WagePayable');
              const totalContractorCost = projContractorTxs.reduce((s, tx) => s + (tx.credit || 0), 0);

              // Calculate BOM Standard vs Actual Handover/Consumption Variance
              const bomVarianceRows = (projBom?.items || []).map(bi => {
                const rawItem = items.find(i => i.id === bi.itemId);
                const stdQtyForTarget = bi.quantityNeeded * (proj.targetQuantity || 1);
                const stdQtyForProduced = bi.quantityNeeded * (proj.producedQuantity || 0);
                const handedOverQty = projHandovers.reduce((sum, h) => {
                  const found = h.items.find(hi => hi.itemId === bi.itemId);
                  return sum + (found ? found.quantity : 0);
                }, 0);
                const actualConsumed = handedOverQty > 0 ? handedOverQty : stdQtyForProduced;
                const uPrice = rawItem?.unitPrice || rawItem?.price || 0;
                return {
                  itemCode: rawItem?.code || bi.itemId,
                  itemName: rawItem?.name || bi.itemId,
                  itemGroup: rawItem?.group || 'عمومی',
                  unit: rawItem?.unit || 'عدد',
                  perUnitQty: bi.quantityNeeded,
                  stdQtyForTarget,
                  actualConsumed,
                  variance: stdQtyForTarget - actualConsumed,
                  totalCost: actualConsumed * uPrice
                };
              });

              const totalMaterialCost = bomVarianceRows.reduce((s, r) => s + r.totalCost, 0);

              return (
                <div key={proj.id} className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5 bg-white shadow-2xs">
                  {/* Project Header Summary */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {proj.code}
                        </span>
                        <h4 className="font-black text-sm sm:text-base text-slate-900">{proj.name}</h4>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          proj.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : proj.status === 'Active' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {proj.status === 'Completed' ? 'تکمیل شده' : proj.status === 'Active' ? 'در حال تولید فعال' : 'در مرحله برنامه‌ریزی'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        مشتری: <strong className="text-slate-700">{proj.client}</strong> | مدیر پروژه: <strong className="text-slate-700">{proj.projectManager}</strong> | بازه زمانی: <span className="font-mono">{proj.startDate} الی {proj.endDate}</span> | محصول هدف: <strong className="text-indigo-700">{targetProduct?.name || '—'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">تیراژ تولید / هدف</span>
                        <strong className="font-mono text-xs font-black text-slate-900">{proj.producedQuantity.toLocaleString('fa-IR')} / {proj.targetQuantity.toLocaleString('fa-IR')}</strong>
                      </div>
                      <div className="h-7 w-px bg-slate-200" />
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">درصد پیشرفت کل</span>
                        <strong className="font-mono text-sm font-black text-emerald-600">{proj.progressPercent}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Operational KPIs for Project */}
                  {userCanViewPrice && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-800">هزینه مواد و قطعات مصرفی (BOM):</span>
                        <strong className="font-mono text-xs font-black text-indigo-950">{formatCurrency(totalMaterialCost)}</strong>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-800">کارمزد پیمانکاران بیرون‌سپاری:</span>
                        <strong className="font-mono text-xs font-black text-amber-950">{formatCurrency(totalContractorCost)}</strong>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-800">بهای تمام‌شده تجمیعی پروژه:</span>
                        <strong className="font-mono text-xs font-black text-emerald-950">{formatCurrency(totalMaterialCost + totalContractorCost)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Stages & Sub-Stages Progress Table */}
                  <div className="space-y-2">
                    <h5 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>جدول ساختار شکست مراحل و زیرمراحل تولید (WBS & Stage Progress):</span>
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                          <tr>
                            <th className="py-2 px-3">مرحله / زیرمرحله</th>
                            <th className="py-2 px-3">مسئول / پیمانکار</th>
                            <th className="py-2 px-3 text-center">تیراژ هدف</th>
                            <th className="py-2 px-3 text-center">تولید سالم</th>
                            <th className="py-2 px-3 text-center">ضایعات</th>
                            <th className="py-2 px-3 text-center">پیشرفت</th>
                            <th className="py-2 px-3">آخرین حواله تحویل</th>
                            <th className="py-2 px-3 text-center">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {flatSteps.map(({ step: s, level }, idx) => {
                            const stepTarget = s.outputQuantity || s.targetQuantity || proj.targetQuantity || 1;
                            const stepDone = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
                            const stepPrg = s.status === 'Completed' ? 100 : (s.progressPercent ?? Math.min(100, Math.round((stepDone / stepTarget) * 100)));
                            return (
                              <tr key={s.id || idx} className={level > 0 ? 'bg-slate-50/60' : 'hover:bg-slate-50'}>
                                <td className="py-2 px-3 font-bold text-slate-900" style={{ paddingRight: `${12 + level * 20}px` }}>
                                  {level > 0 ? '↳ زیرمرحله: ' : `مرحله ${s.stepNumber}: `}{s.name || s.title}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {s.isOutsourced ? `پیمانکار: ${s.contractorName || 'بیرون‌سپاری'}` : (s.responsiblePerson || 'خط تولید داخلی')}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold">{stepTarget.toLocaleString('fa-IR')}</td>
                                <td className="py-2 px-3 text-center font-mono font-black text-emerald-700">{stepDone.toLocaleString('fa-IR')}</td>
                                <td className="py-2 px-3 text-center font-mono text-rose-600">{(s.scrapQuantity || 0).toLocaleString('fa-IR')}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700">{stepPrg}%</td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                  {s.lastHandoverDocNumber ? `${s.lastHandoverDocNumber} (${s.lastHandoverOperator || ''})` : '—'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    s.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : s.status === 'InProgress' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {s.status === 'Completed' ? 'تکمیل شده ✓' : s.status === 'InProgress' ? 'در حال انجام' : 'در انتظار'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BOM Standard vs Actual Consumption Table */}
                  {bomVarianceRows.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span>گزارش تطبیقی قطعات مورد نیاز فرمول ساخت (BOM) و میزان تحویل/مصرف واقعی پروژه:</span>
                      </h5>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                            <tr>
                              <th className="py-2 px-3">کد قطعه</th>
                              <th className="py-2 px-3">نام قطعه (الکترونیکی / مکانیکی)</th>
                              <th className="py-2 px-3">گروه کالایی</th>
                              <th className="py-2 px-3 text-center">ضریب در هر واحد</th>
                              <th className="py-2 px-3 text-center">نیاز کل طبق BOM</th>
                              <th className="py-2 px-3 text-center">تحویل / مصرف واقعی</th>
                              <th className="py-2 px-3 text-center">مانده تحویل‌نشده</th>
                              {userCanViewPrice && <th className="py-2 px-3 text-left">ارزش مصرف</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {bomVarianceRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-indigo-600">{row.itemCode}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{row.itemName}</td>
                                <td className="py-2 px-3 text-slate-500 text-[11px]">{row.itemGroup}</td>
                                <td className="py-2 px-3 text-center font-mono">{row.perUnitQty} {row.unit}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold">{row.stdQtyForTarget.toLocaleString('fa-IR')}</td>
                                <td className="py-2 px-3 text-center font-mono font-black text-emerald-700">{row.actualConsumed.toLocaleString('fa-IR')}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">{Math.max(0, row.variance).toLocaleString('fa-IR')}</td>
                                {userCanViewPrice && <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">{formatCurrency(row.totalCost)}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: OPERATORS WORKLOAD & SHIFT PERFORMANCE */}
        {/* ========================================================================= */}
        {activeReportTab === 'operators' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-700">فیلتر اپراتور:</label>
                <select
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-800"
                >
                  <option value="all">همه اپراتورها ({operators.length} نفر)</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name} ({op.code})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  const headers = ["کد پرسنلی", "نام اپراتور", "نقش فنی", "شیفت", "تعداد تولید سالم", "تعداد ضایعات", "نرخ کیفیت (%)", "ساعات کارکرد", "تعداد برگه‌های تحویل"];
                  const rows = operatorAnalytics.map(op => [
                    op.code,
                    op.name,
                    op.role,
                    op.shift,
                    op.totalHealthy,
                    op.totalScrap,
                    op.qualityRate,
                    op.totalWorkingHours,
                    op.handoversCount
                  ]);
                  handleExportCSV(`گزارش-کارکرد-اپراتورها-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer self-end sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل کارکرد اپراتورها (CSV)</span>
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-sm text-slate-900">جدول راندمان، کیفیت تولید و ساعات کارکرد اپراتورها</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">کد پرسنلی</th>
                      <th className="py-2.5 px-3">نام پرسنل / اپراتور</th>
                      <th className="py-2.5 px-3">تخصص / ایستگاه</th>
                      <th className="py-2.5 px-3 text-center">کل تولید سالم</th>
                      <th className="py-2.5 px-3 text-center">ضایعات ثبت‌شده</th>
                      <th className="py-2.5 px-3 text-center">نرخ کیفیت (%)</th>
                      <th className="py-2.5 px-3 text-center">برگه‌های تحویل مواد</th>
                      <th className="py-2.5 px-3 text-center">ساعت کارکرد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {operatorAnalytics.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{op.code}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{op.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{op.role}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700">
                          {op.totalHealthy.toLocaleString('fa-IR')} عدد
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">
                          {op.totalScrap.toLocaleString('fa-IR')} عدد
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black">
                            {op.qualityRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">{op.handoversCount} سند</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-bold">{op.totalWorkingHours} ساعت</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Operator Production Logs */}
            <div className="space-y-2 pt-2">
              <h4 className="font-black text-xs text-slate-800">ریز لاگ‌های ثبت خروجی تولید و تحویل قطعه توسط اپراتورها:</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2 px-3">تاریخ و ساعت</th>
                      <th className="py-2 px-3">اپراتور</th>
                      <th className="py-2 px-3">پروژه</th>
                      <th className="py-2 px-3">محصول / قطعه خروجی</th>
                      <th className="py-2 px-3 text-center">تعداد سالم</th>
                      <th className="py-2 px-3 text-center">ضایعات</th>
                      <th className="py-2 px-3">ایستگاه / دستگاه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {productionLogs
                      .filter(l => selectedOperatorId === 'all' || l.operatorId === selectedOperatorId)
                      .map(log => {
                        const proj = projects.find(p => p.id === log.projectId);
                        const fItem = items.find(i => i.id === log.finishedItemId);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-[11px]">{log.date} - {log.time}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{log.operatorName}</td>
                            <td className="py-2 px-3 text-indigo-700 font-bold">{proj?.name || log.projectId}</td>
                            <td className="py-2 px-3 font-semibold">{fItem?.name || log.finishedItemId}</td>
                            <td className="py-2 px-3 text-center font-mono font-black text-emerald-700">+{log.quantityProduced}</td>
                            <td className="py-2 px-3 text-center font-mono text-rose-600">{log.quantityScrapped}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.machineCode}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

