import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Printer, Download, FileSpreadsheet, 
  Layers, Factory, ArrowDownUp, Users, CheckCircle2,
  AlertTriangle, Filter, Search, Warehouse, Package, 
  TrendingDown, TrendingUp, DollarSign, Calendar, Clock,
  FileText, ShieldCheck, CheckCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/security';

export const ReportsView: React.FC = () => {
  const { 
    inventory, warehouses, items, stockInDocs, stockOutDocs, 
    projects, operators, productionLogs, stockCountings, 
    currentUser, companyName, itemGroups
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
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchWh = wh.name.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchWh) return false;
      }

      return true;
    });
  }, [inventory, items, warehouses, selectedWarehouseId, selectedGroupId, stockStatusFilter, searchQuery]);

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

  // Export to CSV helper
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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

  const handlePrint = () => {
    window.print();
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
              مرکز جامع گزارشات و تحلیل انبارداری
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تهیه گزارش‌های تفکیکی موجودی انبارها، گردش کالا، انبارگردانی، پیشرفت خطوط تولید و خروجی اکسل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <span>موجودی به تفکیک انبار</span>
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
          onClick={() => setActiveReportTab('movements')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'movements' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          <span>گردش اسناد (رسیدها و حواله‌ها)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('counting')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'counting' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>گزارش دوره‌های انبارگردانی</span>
        </button>

        <button
          onClick={() => setActiveReportTab('projects')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'projects' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>پیشرفت پروژه‌های تولید</span>
        </button>

        <button
          onClick={() => setActiveReportTab('operators')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'operators' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>عملکرد اپراتورها و ایستگاه‌ها</span>
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
                placeholder="جستجوی کد، نام کالا یا انبار..."
                className="w-full text-xs font-bold pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
              />
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
                <option value="all">همه دسته‌بندی‌ها</option>
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
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs print:border-none print:p-0 print:shadow-none space-y-6">
        
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
        {/* TAB 1: INVENTORY PER WAREHOUSE */}
        {/* ========================================================================= */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">ماتریس موجودی لحظه‌ای قطعات و کالاها</h3>
                <span className="text-xs font-bold text-slate-500">({filteredInventory.length} رکورد)</span>
              </div>

              <button
                onClick={() => {
                  const headers = ["کد کالا", "نام قطعه", "دسته بندی", "انبار", "موجود", "واحد", "حداقل موجودی", "موقعیت قفسه", "وضعیت"];
                  const rows = filteredInventory.map(inv => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const minVal = getItemMinStock(item);
                    const isLow = item && inv.quantity <= minVal;
                    return [
                      item?.code || '',
                      item?.name || '',
                      item?.group || '',
                      wh?.name || '',
                      inv.quantity,
                      item?.unit || '',
                      minVal,
                      item?.locationInRack || '',
                      isLow ? 'کسری' : 'نرمال'
                    ];
                  });
                  handleExportCSV(`گزارش-موجودی-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer self-end sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>دانلود اکسل (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold select-none">
                    <th className="py-2.5 px-3">کد کالا</th>
                    <th className="py-2.5 px-3 min-w-[180px]">نام و مشخصات کالا</th>
                    <th className="py-2.5 px-3">گروه</th>
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
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{item?.group || '—'}</td>
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
              <h3 className="font-black text-sm text-slate-900">جدول ارزش‌گذاری ریالی به تفکیک قطعات</h3>
              <button
                onClick={() => {
                  const headers = ["کد کالا", "نام کالا", "انبار", "موجودی", "فی واحد (ریال)", "ارزش کل (ریال)"];
                  const rows = filteredInventory.map(inv => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const price = item?.price || 0;
                    return [
                      item?.code || '',
                      item?.name || '',
                      wh?.name || '',
                      inv.quantity,
                      price,
                      inv.quantity * price
                    ];
                  });
                  handleExportCSV(`ارزش‌گذاری-ریالی-انبار-${new Date().toLocaleDateString('fa-IR')}`, headers, rows);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
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
                    <th className="py-2.5 px-3">انبار</th>
                    <th className="py-2.5 px-3 text-center">موجودی</th>
                    <th className="py-2.5 px-3 text-left">فی واحد (ریال)</th>
                    <th className="py-2.5 px-3 text-left">ارزش کل ریالی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {filteredInventory.map((inv, idx) => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const price = item?.price || 0;
                    const totalVal = inv.quantity * price;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{item?.code}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{item?.name}</td>
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block mb-1">تعداد کل رسیدهای ورود به انبار:</span>
                <strong className="text-2xl font-mono text-emerald-950">{stockInDocs.length} سند</strong>
              </div>
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                <span className="text-xs font-bold text-rose-700 block mb-1">تعداد کل حواله‌های خروج از انبار:</span>
                <strong className="text-2xl font-mono text-rose-950">{stockOutDocs.length} سند</strong>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="font-black text-sm text-slate-900 mb-3">آخرین اسناد رسید و ورود به انبار:</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">شماره سند</th>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">تامین‌کننده / مبدا</th>
                      <th className="py-2.5 px-3">انبار مقصد</th>
                      <th className="py-2.5 px-3 text-center">تعداد اقلام</th>
                      <th className="py-2.5 px-3">ثبت‌کننده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {stockInDocs.slice(0, 10).map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{doc.documentNumber}</td>
                        <td className="py-2.5 px-3 font-mono">{doc.date}</td>
                        <td className="py-2.5 px-3 font-bold">{doc.supplierName}</td>
                        <td className="py-2.5 px-3">{doc.warehouseName}</td>
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
        {/* TAB 4: COUNTING SESSIONS REPORT */}
        {/* ========================================================================= */}
        {activeReportTab === 'counting' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm text-slate-900">تاریخچه دوره‌های انبارگردانی و مغایرت‌گیری</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">شماره صورتجلسه</th>
                    <th className="py-2.5 px-3">عنوان دوره</th>
                    <th className="py-2.5 px-3">انبار</th>
                    <th className="py-2.5 px-3">تاریخ شروع</th>
                    <th className="py-2.5 px-3 text-center">تعداد اقلام</th>
                    <th className="py-2.5 px-3 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {stockCountings.map(sc => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{sc.sessionNumber}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{sc.title}</td>
                      <td className="py-2.5 px-3 font-bold">{sc.warehouseName}</td>
                      <td className="py-2.5 px-3 font-mono">{sc.startDate}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{sc.items.length}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          sc.status === 'Applied' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sc.status === 'Applied' ? 'سند صادر شده' : 'در حال اقدام'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROJECTS PROGRESS */}
        {/* ========================================================================= */}
        {activeReportTab === 'projects' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm text-slate-900">وضعیت پیشرفت پروژه‌های تولید</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">کد پروژه</th>
                    <th className="py-2.5 px-3">عنوان پروژه</th>
                    <th className="py-2.5 px-3">مشتری / متقاضی</th>
                    <th className="py-2.5 px-3 text-center">تیراژ تولید شده / هدف</th>
                    <th className="py-2.5 px-3 text-center">پیشرفت (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {projects.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{p.code}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.client}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{p.producedQuantity} / {p.targetQuantity}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {p.progressPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: OPERATORS WORKLOAD */}
        {/* ========================================================================= */}
        {activeReportTab === 'operators' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm text-slate-900">خلاصه راندمان اپراتورها و ساعات کارکرد</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">نام پرسنل / اپراتور</th>
                    <th className="py-2.5 px-3">کد پرسنلی</th>
                    <th className="py-2.5 px-3">نقش فنی</th>
                    <th className="py-2.5 px-3 text-center">کل تیراژ مونتاژ شده</th>
                    <th className="py-2.5 px-3 text-center">ساعت کارکرد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {operators.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-black text-slate-900">{op.name}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">{op.code}</td>
                      <td className="py-2.5 px-3 text-slate-600">{op.role}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700">
                        {op.totalProducedPieces.toLocaleString('fa-IR')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{op.totalWorkingHours} ساعت</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
