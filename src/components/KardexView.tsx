import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Item, TraceabilityEvent, Warehouse, ItemGroup } from '../types';
import { 
  ClipboardList, Search, Filter, Calendar, Building2, Download, Printer, 
  ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2, TrendingUp, 
  Clock, Package, ChevronDown, RefreshCw, Layers, FileSpreadsheet, Eye, 
  HelpCircle, User, Info, DollarSign, ArrowLeftRight, CheckSquare,
  ShieldCheck, ArrowRight, Tag, Hash, FileText, ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export const KardexView: React.FC = () => {
  const { 
    items, itemGroups, warehouses, traceabilityEvents, inventory, language, companyName 
  } = useApp();

  // State: SKU & Group Exploration
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // State: Filters
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // ALL, TODAY, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, CUSTOM
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedWhId, setSelectedWhId] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  // Selected item details
  const selectedItem = useMemo(() => {
    return items.find(it => it.id === selectedItemId) || items[0];
  }, [items, selectedItemId]);

  // Filtered Item List (SKU list)
  const filteredSKUs = useMemo(() => {
    return items.filter(it => {
      // Group filter
      if (selectedGroupId !== 'ALL') {
        const grp = itemGroups.find(g => g.id === selectedGroupId);
        if (grp && it.group !== grp.name && it.group !== grp.id) {
          return false;
        }
      }

      // Search query
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase().trim();
        const nameMatch = it.name.toLowerCase().includes(q);
        const codeMatch = it.code.toLowerCase().includes(q);
        const barcodeMatch = it.barcode?.toLowerCase().includes(q) || false;
        const subGroupMatch = it.subGroup?.toLowerCase().includes(q) || false;
        if (!nameMatch && !codeMatch && !barcodeMatch && !subGroupMatch) return false;
      }

      return true;
    });
  }, [items, itemGroups, selectedGroupId, itemSearchQuery]);

  // Detailed Standard Accounting Ledger Calculation
  const accountingLedger = useMemo(() => {
    if (!selectedItem) {
      return {
        initialQty: 0,
        initialValue: 0,
        lines: [],
        finalQty: 0,
        finalValue: 0,
        totalInQty: 0,
        totalInValue: 0,
        totalOutQty: 0,
        totalOutValue: 0,
        avgUnitRate: selectedItem?.unitPrice || 0
      };
    }

    const currentBasePrice = selectedItem.unitPrice || 10000;

    // 1. Fetch & sort ALL events for this item chronologically ascending
    const sortedEvents = [...traceabilityEvents]
      .filter(e => e.itemId === selectedItem.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 2. Helper for date filter
    const isWithinDateRange = (timestamp: string) => {
      if (dateFilter === 'ALL') return true;
      const evTime = new Date(timestamp).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'TODAY':
          return evTime >= today.getTime();
        case 'LAST_7_DAYS': {
          const l7 = new Date(today);
          l7.setDate(l7.getDate() - 7);
          return evTime >= l7.getTime();
        }
        case 'LAST_30_DAYS': {
          const l30 = new Date(today);
          l30.setDate(l30.getDate() - 30);
          return evTime >= l30.getTime();
        }
        case 'LAST_90_DAYS': {
          const l90 = new Date(today);
          l90.setDate(l90.getDate() - 90);
          return evTime >= l90.getTime();
        }
        case 'CUSTOM': {
          if (startDate && evTime < new Date(startDate).getTime()) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (evTime > end.getTime()) return false;
          }
          return true;
        }
        default:
          return true;
      }
    };

    // 3. Process Ledger Line by Line
    let runningQty = 0;
    let runningValue = 0;

    let initialQty = 0;
    let initialValue = 0;

    let totalInQty = 0;
    let totalInValue = 0;
    let totalOutQty = 0;
    let totalOutValue = 0;

    interface CardexLine {
      id: string;
      dateStr: string;
      docNumber: string;
      docType: string;
      description: string;
      referenceParty: string; // انبار مبدا/مقصد یا تامین کننده یا پروژه
      inQty: number;
      inRate: number;
      inTotal: number;
      outQty: number;
      outRate: number;
      outTotal: number;
      balanceQty: number;
      avgRate: number;
      balanceValue: number;
      user: string;
    }

    const lines: CardexLine[] = [];

    sortedEvents.forEach(ev => {
      // Warehouse match
      let inQty = 0;
      let outQty = 0;

      if (selectedWhId === 'ALL') {
        if (ev.eventType === 'StockIn' || ev.eventType === 'ProductionOutput') {
          inQty = ev.quantity;
        } else if (ev.eventType === 'StockOut' || ev.eventType === 'Scrap' || ev.eventType === 'ProjectConsumption') {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+') || ev.quantity > 0) inQty = Math.abs(ev.quantity);
          else outQty = Math.abs(ev.quantity);
        }
      } else {
        if (ev.targetWarehouseId === selectedWhId) {
          inQty = ev.quantity;
        } else if (ev.sourceWarehouseId === selectedWhId) {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+') || ev.quantity > 0) inQty = Math.abs(ev.quantity);
          else outQty = Math.abs(ev.quantity);
        }
      }

      // Rates
      const effectiveRate = currentBasePrice;
      const inTotal = inQty * effectiveRate;
      const outTotal = outQty * effectiveRate;

      runningQty = runningQty + inQty - outQty;
      runningValue = Math.max(0, runningQty * effectiveRate);

      const inDateRange = isWithinDateRange(ev.timestamp);
      const matchesWh = selectedWhId === 'ALL' || ev.sourceWarehouseId === selectedWhId || ev.targetWarehouseId === selectedWhId;

      if (matchesWh) {
        if (!inDateRange) {
          initialQty = runningQty;
          initialValue = runningValue;
        } else {
          // Check event type filter
          if (selectedEventType === 'ALL' || ev.eventType === selectedEventType) {
            totalInQty += inQty;
            totalInValue += inTotal;
            totalOutQty += outQty;
            totalOutValue += outTotal;

            // Resolve Document Type Label
            let docTypeLabel = 'سند انبار';
            switch (ev.eventType) {
              case 'StockIn': docTypeLabel = 'رسید خرید / ورود به انبار'; break;
              case 'StockOut': docTypeLabel = 'حواله خروج از انبار'; break;
              case 'Transfer': docTypeLabel = 'حواله انتقال بین انبار'; break;
              case 'ProjectConsumption': docTypeLabel = 'حواله مصرف در پروژه'; break;
              case 'ProductionOutput': docTypeLabel = 'رسید تولید محصول نهایی'; break;
              case 'Scrap': docTypeLabel = 'حواله ضایعات و اسکراپ'; break;
              case 'Adjustment': docTypeLabel = 'سند تعدیل انبارگردانی'; break;
            }

            const srcWh = warehouses.find(w => w.id === ev.sourceWarehouseId)?.name;
            const tgtWh = warehouses.find(w => w.id === ev.targetWarehouseId)?.name;
            let refParty = '';
            if (ev.eventType === 'Transfer') {
              refParty = `انتقال از ${srcWh || 'مبدا'} به ${tgtWh || 'مقصد'}`;
            } else if (tgtWh) {
              refParty = tgtWh;
            } else if (srcWh) {
              refParty = srcWh;
            }

            lines.push({
              id: ev.id,
              dateStr: ev.timestamp,
              docNumber: ev.docNumber || 'سند خودکار',
              docType: docTypeLabel,
              description: ev.details || '-',
              referenceParty: refParty || 'انبار مرکزی',
              inQty,
              inRate: inQty > 0 ? effectiveRate : 0,
              inTotal,
              outQty,
              outRate: outQty > 0 ? effectiveRate : 0,
              outTotal,
              balanceQty: runningQty,
              avgRate: effectiveRate,
              balanceValue: runningValue,
              user: ev.performedBy || ev.operatorName || 'سیستم'
            });
          }
        }
      }
    });

    return {
      initialQty,
      initialValue,
      lines,
      finalQty: runningQty,
      finalValue: runningValue,
      totalInQty,
      totalInValue,
      totalOutQty,
      totalOutValue,
      avgUnitRate: currentBasePrice
    };
  }, [selectedItem, traceabilityEvents, selectedWhId, dateFilter, startDate, endDate, selectedEventType, warehouses]);

  // Chart Data
  const chartPoints = useMemo(() => {
    if (accountingLedger.lines.length === 0) {
      return [{
        date: 'ابتدای دوره',
        'موجودی مقداری': accountingLedger.initialQty,
        'گردش وارده': 0,
        'گردش صادره': 0
      }, {
        date: 'پایان دوره',
        'موجودی مقداری': accountingLedger.finalQty,
        'گردش وارده': accountingLedger.totalInQty,
        'گردش صادره': accountingLedger.totalOutQty
      }];
    }

    return accountingLedger.lines.map(line => ({
      date: line.dateStr.substring(5, 16),
      'موجودی مقداری': line.balanceQty,
      'گردش وارده': line.inQty,
      'گردش صادره': line.outQty,
    }));
  }, [accountingLedger]);

  // Export to Standard Accounting CSV
  const handleExportAccountingCSV = () => {
    if (!selectedItem) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `گزارش کاردکس مقداری و ریالی کالا - ${companyName || 'سیستم انبارداری'}\n`;
    csvContent += `کد کالا: ${selectedItem.code},نام کالا: ${selectedItem.name},واحد: ${selectedItem.unit},گروه: ${selectedItem.group}\n`;
    csvContent += `موجودی اول دوره: ${accountingLedger.initialQty} (${accountingLedger.initialValue.toLocaleString('fa-IR')} تومان)\n\n`;
    
    csvContent += 'ردیف,تاریخ و زمان,شماره سند,نوع سند,شرح تراکنش و طرف حساب,مقدار وارده,نرخ وارده (تومان),مبلغ کل وارده,مقدار صادره,نرخ صادره (تومان),مبلغ کل صادره,مانده مقداری,نرخ میانگین,ارزش ریالی مانده,ثبت کننده\n';

    // Initial Row
    csvContent += `-,ابتدای دوره,-,-,نقل از دوره قبل / موجودی اولیه,-,-,-,-,-,-,${accountingLedger.initialQty},${accountingLedger.avgUnitRate},${accountingLedger.initialValue},-\n`;

    accountingLedger.lines.forEach((l, idx) => {
      csvContent += `${idx + 1},"${l.dateStr}","${l.docNumber}","${l.docType}","${l.description} - ${l.referenceParty}",${l.inQty || 0},${l.inRate || 0},${l.inTotal || 0},${l.outQty || 0},${l.outRate || 0},${l.outTotal || 0},${l.balanceQty},${l.avgRate},${l.balanceValue},"${l.user}"\n`;
    });

    // Summary Rows
    csvContent += `\n-,جمع گردش طی دوره,-,-,-,${accountingLedger.totalInQty},-,${accountingLedger.totalInValue},${accountingLedger.totalOutQty},-,${accountingLedger.totalOutValue},${accountingLedger.finalQty},${accountingLedger.avgUnitRate},${accountingLedger.finalValue},-\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kardex_${selectedItem.code}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-900/30 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
            <ClipboardList className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              کاردکس مقداری و ریالی کالا (استاندارد حسابداری انبار)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-mono">
                GAAP Stock Ledger
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              طبقه‌بندی سلسله‌مراتبی گروه‌ها و اسکوها با محاسبه لحظه‌ای گردش مقداری، ریالی، بهای تمام شده و مانده دوبل حسابداری
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAccountingCSV}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            خروجی اکسل کاردکس
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            چاپ رسمی سند کاردکس (A4)
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: Left (SKU/Group Explorer) & Right (Standard Accounting Cardex) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* Column 1: SKU Explorer & Group Browser (4 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                انتخاب و جستجوی اسکو کالا (SKU)
              </h3>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {filteredSKUs.length} قلم کالا
              </span>
            </div>

            {/* Live SKU Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجو در کد، نام، بارکد، زیرگروه..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">فیلتر بر اساس گروه کالا:</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  onClick={() => setSelectedGroupId('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedGroupId === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  همه گروه‌ها
                </button>
                {itemGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      selectedGroupId === g.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SKU Item Cards List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredSKUs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  کالایی با این مشخصات یافت نشد.
                </div>
              ) : (
                filteredSKUs.map(it => {
                  const isSelected = it.id === selectedItemId;
                  const totalStock = inventory
                    .filter(i => i.itemId === it.id)
                    .reduce((sum, c) => sum + c.quantity, 0);

                  const isLowStock = totalStock <= (it.minStock || 10);
                  const isZeroStock = totalStock === 0;

                  return (
                    <div
                      key={it.id}
                      onClick={() => setSelectedItemId(it.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right flex flex-col gap-2 relative ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-100/70 px-2 py-0.5 rounded-md">
                              {it.code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">{it.group}</span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                            {it.name}
                          </h4>
                        </div>

                        {/* Stock Badge */}
                        <div className="text-left shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono border block ${
                              isZeroStock
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {totalStock.toLocaleString('fa-IR')} {it.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>نرخ پایه: <strong className="text-slate-700 font-mono">{(it.unitPrice || 0).toLocaleString('fa-IR')}</strong> ت</span>
                        <span>قفسه: <strong className="font-mono">{it.locationInRack || '-'}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Column 2: Standard Accounting Cardex Report (8 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Controls Bar (Filter by Warehouse & Date) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {/* Warehouse Filter */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedWhId}
                  onChange={(e) => setSelectedWhId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none"
                >
                  <option value="ALL">🏢 کل انبارها (تجمیعی کارخانه)</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Quick Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none"
                >
                  <option value="ALL">کل دوره مالی</option>
                  <option value="TODAY">امروز</option>
                  <option value="LAST_7_DAYS">۷ روز گذشته</option>
                  <option value="LAST_30_DAYS">۳۰ روز گذشته (ماه جاری)</option>
                  <option value="LAST_90_DAYS">۹۰ روز گذشته (فصل)</option>
                  <option value="CUSTOM">بازه تاریخی دلخواه...</option>
                </select>
              </div>

              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <span className="text-slate-400 text-xs">تا</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* Event Type Filter */}
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه انواع تراکنش‌ها</option>
              <option value="StockIn">رسیدهای خرید و ورودی</option>
              <option value="StockOut">حواله‌های خروج و مصرف</option>
              <option value="Transfer">انتقالات بین انبارها</option>
              <option value="Adjustment">تعدیلات انبارگردانی</option>
            </select>
          </div>

          {/* Standard Accounting Document Sheet */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6 print:border-none print:shadow-none print:p-0">
            
            {/* Standard Official Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-500">{companyName || 'شرکت الکترو استوک - سیستم مدیریت انبار و تولید'}</h3>
                  <h1 className="text-xl font-black text-slate-900 mt-0.5">
                    کاردکس مقداری و ریالی کالا (Stock Ledger Card)
                  </h1>
                </div>

                <div className="text-left font-mono text-xs text-slate-600 space-y-0.5">
                  <div>انبار: <strong className="text-slate-900">{selectedWhId === 'ALL' ? 'کل انبارها (تجمیعی)' : warehouses.find(w => w.id === selectedWhId)?.name}</strong></div>
                  <div>تاریخ گزارش: <strong className="text-slate-900">{new Date().toLocaleDateString('fa-IR')}</strong></div>
                  <div>روش ارزش‌گذاری: <strong className="text-indigo-700">میانگین موزون (Weighted Average)</strong></div>
                </div>
              </div>

              {/* Item Passport Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">کد کالا (SKU):</span>
                  <strong className="font-mono text-indigo-700 text-sm font-black">{selectedItem?.code}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block font-medium">نام کالا:</span>
                  <strong className="text-slate-900 font-bold">{selectedItem?.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">واحد سنجش:</span>
                  <strong className="text-slate-900 font-bold">{selectedItem?.unit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">گروه / دسته:</span>
                  <strong className="text-slate-800">{selectedItem?.group}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">محل در قفسه:</span>
                  <strong className="font-mono text-slate-800">{selectedItem?.locationInRack || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">حداقل (نقطه سفارش):</span>
                  <strong className="font-mono text-amber-700">{selectedItem?.minStock || 10} {selectedItem?.unit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">حداکثر موجودی:</span>
                  <strong className="font-mono text-slate-700">{selectedItem?.maxStock || 1000} {selectedItem?.unit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">کد بارکد:</span>
                  <strong className="font-mono text-slate-700">{selectedItem?.barcode || '-'}</strong>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-[10px] text-slate-400 block font-medium">مشخصات فنی و توضیحات:</span>
                  <span className="text-slate-600 text-[11px] line-clamp-1">{selectedItem?.description || 'بدون توضیحات تکمیلی'}</span>
                </div>
              </div>
            </div>

            {/* Financial & Stock KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
              {/* Initial Balance */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">موجودی اول دوره</span>
                <div className="text-lg font-black text-slate-900 font-mono mt-1">
                  {accountingLedger.initialQty.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">{selectedItem?.unit}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ارزش: {accountingLedger.initialValue.toLocaleString('fa-IR')} ت
                </div>
              </div>

              {/* Total Inflow */}
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                  جمع وارده طی دوره (+)
                </span>
                <div className="text-lg font-black text-emerald-950 font-mono mt-1">
                  {accountingLedger.totalInQty.toLocaleString('fa-IR')} <span className="text-xs font-normal text-emerald-700">{selectedItem?.unit}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                  ارزش: {accountingLedger.totalInValue.toLocaleString('fa-IR')} ت
                </div>
              </div>

              {/* Total Outflow */}
              <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
                <span className="text-[10px] text-rose-800 font-bold flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                  جمع صادره طی دوره (-)
                </span>
                <div className="text-lg font-black text-rose-950 font-mono mt-1">
                  {accountingLedger.totalOutQty.toLocaleString('fa-IR')} <span className="text-xs font-normal text-rose-700">{selectedItem?.unit}</span>
                </div>
                <div className="text-[11px] text-rose-700 font-mono mt-0.5">
                  ارزش: {accountingLedger.totalOutValue.toLocaleString('fa-IR')} ت
                </div>
              </div>

              {/* Final Balance */}
              <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200">
                <span className="text-[10px] text-indigo-900 font-bold block">مانده پایان دوره (موجودی قطعی)</span>
                <div className="text-lg font-black text-indigo-950 font-mono mt-1">
                  {accountingLedger.finalQty.toLocaleString('fa-IR')} <span className="text-xs font-normal text-indigo-700">{selectedItem?.unit}</span>
                </div>
                <div className="text-[11px] text-indigo-800 font-mono font-bold mt-0.5">
                  ارزش: {accountingLedger.finalValue.toLocaleString('fa-IR')} تومان
                </div>
              </div>
            </div>

            {/* Visual Movement Area Chart */}
            <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200 print:hidden space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  روند تغییرات موجودی و نوسان مقداری در بازه انتخابی:
                </span>
                <span className="font-mono text-slate-500">واحد: {selectedItem?.unit}</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints}>
                    <defs>
                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, direction: 'rtl', borderRadius: 12 }} />
                    <Area type="monotone" dataKey="موجودی مقداری" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorBal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Standard Accounting Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-300">
                <thead>
                  {/* Super-Header Row */}
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 text-center">
                    <th colSpan={5} className="p-2 border-l border-slate-300">مشخصات سند و تراکنش</th>
                    <th colSpan={3} className="p-2 border-l border-slate-300 bg-emerald-100/70 text-emerald-950">وارده (Inflow / Receipts)</th>
                    <th colSpan={3} className="p-2 border-l border-slate-300 bg-rose-100/70 text-rose-950">صادره (Outflow / Issues)</th>
                    <th colSpan={3} className="p-2 border-l border-slate-300 bg-indigo-100/70 text-indigo-950">مانده لحظه‌ای (Running Balance)</th>
                    <th colSpan={1} className="p-2">اقدام</th>
                  </tr>

                  {/* Sub-Header Row */}
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300 text-[11px]">
                    <th className="p-2 border-l border-slate-300 text-center w-8">ردیف</th>
                    <th className="p-2 border-l border-slate-300 text-center w-24">تاریخ و زمان</th>
                    <th className="p-2 border-l border-slate-300 w-24">شماره سند</th>
                    <th className="p-2 border-l border-slate-300 w-28">نوع سند</th>
                    <th className="p-2 border-l border-slate-300 min-w-[140px]">شرح و طرف حساب</th>

                    {/* Inflow Columns */}
                    <th className="p-2 border-l border-slate-300 text-center bg-emerald-50/50 w-16">مقدار</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-emerald-50/50 w-20">نرخ (تومان)</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-emerald-50/50 w-24">مبلغ کل</th>

                    {/* Outflow Columns */}
                    <th className="p-2 border-l border-slate-300 text-center bg-rose-50/50 w-16">مقدار</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-rose-50/50 w-20">نرخ (تومان)</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-rose-50/50 w-24">مبلغ کل</th>

                    {/* Balance Columns */}
                    <th className="p-2 border-l border-slate-300 text-center bg-indigo-50/50 w-16">مقدار</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-indigo-50/50 w-20">بهای میانگین</th>
                    <th className="p-2 border-l border-slate-300 text-center bg-indigo-50/50 w-24">ارزش ریالی</th>

                    <th className="p-2 text-center w-20">ثبت‌کننده</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {/* Row 1: Initial Balance / نقل از قبل */}
                  <tr className="bg-slate-100/60 font-bold h-9">
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-[10px]">ابتدای دوره</td>
                    <td className="p-2 border-l border-slate-300 font-mono text-[10px]">-</td>
                    <td className="p-2 border-l border-slate-300 text-slate-700">موجودی اول دوره</td>
                    <td className="p-2 border-l border-slate-300 text-slate-600">نقل از دوره مالی قبل</td>

                    {/* Inflow */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>

                    {/* Outflow */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>

                    {/* Balance */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono font-black text-slate-900 bg-indigo-50/40">
                      {accountingLedger.initialQty.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-700 bg-indigo-50/40">
                      {accountingLedger.avgUnitRate.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-slate-900 bg-indigo-50/40">
                      {accountingLedger.initialValue.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-2 text-center text-[10px] text-slate-400">سیستم مالی</td>
                  </tr>

                  {/* Transaction Rows */}
                  {accountingLedger.lines.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors h-9 text-[11px]">
                      <td className="p-2 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono text-[10px] text-slate-500">{row.dateStr}</td>
                      <td className="p-2 border-l border-slate-300 font-mono font-bold text-indigo-700">{row.docNumber}</td>
                      <td className="p-2 border-l border-slate-300 font-semibold text-slate-800">{row.docType}</td>
                      <td className="p-2 border-l border-slate-300 text-slate-600">
                        <div className="font-medium text-slate-800">{row.referenceParty}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{row.description}</div>
                      </td>

                      {/* Inflow */}
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                        {row.inQty > 0 ? row.inQty.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600 bg-emerald-50/20">
                        {row.inQty > 0 ? row.inRate.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20">
                        {row.inTotal > 0 ? row.inTotal.toLocaleString('fa-IR') : '-'}
                      </td>

                      {/* Outflow */}
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-rose-700 bg-rose-50/20">
                        {row.outQty > 0 ? row.outQty.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600 bg-rose-50/20">
                        {row.outQty > 0 ? row.outRate.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-rose-800 bg-rose-50/20">
                        {row.outTotal > 0 ? row.outTotal.toLocaleString('fa-IR') : '-'}
                      </td>

                      {/* Running Balance */}
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-black text-slate-900 bg-indigo-50/30">
                        {row.balanceQty.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600 bg-indigo-50/30">
                        {row.avgRate.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">
                        {row.balanceValue.toLocaleString('fa-IR')}
                      </td>

                      <td className="p-2 text-center text-[10px] text-slate-500">{row.user}</td>
                    </tr>
                  ))}

                  {/* Summary Row 1: Total Turnover / جمع گردش طی دوره */}
                  <tr className="bg-slate-100 font-black h-10 border-t-2 border-slate-400">
                    <td colSpan={5} className="p-2 border-l border-slate-300 text-center text-slate-900">
                      جمع کل گردش طی دوره
                    </td>

                    {/* Total In */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-emerald-800 text-sm">
                      {accountingLedger.totalInQty.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-emerald-900 font-black text-xs">
                      {accountingLedger.totalInValue.toLocaleString('fa-IR')}
                    </td>

                    {/* Total Out */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-rose-800 text-sm">
                      {accountingLedger.totalOutQty.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-rose-900 font-black text-xs">
                      {accountingLedger.totalOutValue.toLocaleString('fa-IR')}
                    </td>

                    {/* Total Balance */}
                    <td className="p-2 border-l border-slate-300 text-center font-mono font-black text-indigo-950 text-sm bg-indigo-100/50">
                      {accountingLedger.finalQty.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-indigo-900 bg-indigo-100/50">
                      {accountingLedger.avgUnitRate.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono font-black text-indigo-950 bg-indigo-100/50">
                      {accountingLedger.finalValue.toLocaleString('fa-IR')}
                    </td>

                    <td className="p-2 text-center text-[10px] text-slate-500">-</td>
                  </tr>

                  {/* Summary Row 2: Final Balance / مانده پایان دوره */}
                  <tr className="bg-indigo-900 text-white font-black h-11">
                    <td colSpan={5} className="p-2 border-l border-indigo-800 text-center text-sm">
                      مانده قطعی پایان دوره (موجودی پایان اسناد)
                    </td>
                    <td colSpan={3} className="p-2 border-l border-indigo-800 text-center text-emerald-300 font-mono">
                      + {accountingLedger.totalInQty} {selectedItem?.unit}
                    </td>
                    <td colSpan={3} className="p-2 border-l border-indigo-800 text-center text-rose-300 font-mono">
                      - {accountingLedger.totalOutQty} {selectedItem?.unit}
                    </td>
                    <td colSpan={3} className="p-2 border-l border-indigo-800 text-center text-amber-300 font-mono text-base">
                      {accountingLedger.finalQty.toLocaleString('fa-IR')} {selectedItem?.unit} ({accountingLedger.finalValue.toLocaleString('fa-IR')} تومان)
                    </td>
                    <td className="p-2 text-center text-[10px] text-indigo-200">نهایی</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures Section for Cardex */}
            <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <div className="font-bold text-slate-800">انباردار / متصدی انبار</div>
                <div className="text-slate-400 font-mono text-[11px]">امضا و تاریخ</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-800">کارشناس حسابداری صنعتی و انبار</div>
                <div className="text-slate-400 font-mono text-[11px]">امضا و تاریخ</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-800">مدیر مالی و رئیس حسابداری</div>
                <div className="text-slate-400 font-mono text-[11px]">امضا و مهر امور مالی</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
