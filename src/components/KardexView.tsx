import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Item, TraceabilityEvent, Warehouse } from '../types';
import { 
  ClipboardList, Search, Filter, Calendar, Building2, Download, Printer, 
  ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2, TrendingUp, 
  Clock, Package, ChevronDown, RefreshCw, Layers, FileSpreadsheet, Eye, 
  HelpCircle, User, Info, DollarSign, ArrowLeftRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export const KardexView: React.FC = () => {
  const { 
    items, warehouses, traceabilityEvents, inventory, language, setActiveTab 
  } = useApp();

  const isFa = language === 'fa';

  // State
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // ALL, TODAY, LAST_3_DAYS, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, CUSTOM
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedWhId, setSelectedWhId] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected item details
  const selectedItem = useMemo(() => {
    return items.find(it => it.id === selectedItemId);
  }, [items, selectedItemId]);

  // Filtered item list for the custom searchable combobox
  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(it => 
      it.name.toLowerCase().includes(q) || 
      it.code.toLowerCase().includes(q) || 
      (it.barcode && it.barcode.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Unique list of operators/performers in events for filtering
  const allOperators = useMemo(() => {
    const ops = new Set<string>();
    traceabilityEvents.forEach(e => {
      if (e.performedBy) ops.add(e.performedBy);
      if (e.operatorName) ops.add(e.operatorName);
    });
    return Array.from(ops);
  }, [traceabilityEvents]);

  // Detailed Ledger Calculation (Calculates proper running balance chronologically)
  const ledgerData = useMemo(() => {
    if (!selectedItemId) return { initialBalance: 0, lines: [], finalBalance: 0, totalIn: 0, totalOut: 0 };

    // 1. Fetch & sort ALL events for the selected item chronologically ascending
    const sortedAllEvents = [...traceabilityEvents]
      .filter(e => e.itemId === selectedItemId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 2. Define helper function to determine if event matches warehouse filter
    const matchesWarehouse = (ev: TraceabilityEvent, whId: string) => {
      if (whId === 'ALL') return true;
      return ev.sourceWarehouseId === whId || ev.targetWarehouseId === whId;
    };

    // 3. Define helper to check date filter match
    const isWithinDateRange = (timestamp: string) => {
      if (dateFilter === 'ALL') return true;
      
      const evDate = new Date(timestamp);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const evTime = evDate.getTime();
      
      switch (dateFilter) {
        case 'TODAY': {
          const limit = new Date(today);
          return evTime >= limit.getTime();
        }
        case 'LAST_3_DAYS': {
          const limit = new Date(today);
          limit.setDate(limit.getDate() - 3);
          return evTime >= limit.getTime();
        }
        case 'LAST_7_DAYS': {
          const limit = new Date(today);
          limit.setDate(limit.getDate() - 7);
          return evTime >= limit.getTime();
        }
        case 'LAST_30_DAYS': {
          const limit = new Date(today);
          limit.setDate(limit.getDate() - 30);
          return evTime >= limit.getTime();
        }
        case 'LAST_90_DAYS': {
          const limit = new Date(today);
          limit.setDate(limit.getDate() - 90);
          return evTime >= limit.getTime();
        }
        case 'CUSTOM': {
          if (startDate) {
            const startLimit = new Date(startDate);
            if (evTime < startLimit.getTime()) return false;
          }
          if (endDate) {
            const endLimit = new Date(endDate);
            endLimit.setHours(23, 59, 59, 999);
            if (evTime > endLimit.getTime()) return false;
          }
          return true;
        }
        default:
          return true;
      }
    };

    // 4. Calculate initial balance before the filtered period
    let currentBalance = 0;
    let initialBalance = 0;
    let totalIn = 0;
    let totalOut = 0;

    const computedLines: Array<{
      event: TraceabilityEvent;
      inQty: number;
      outQty: number;
      balance: number;
      docNumber: string;
      whName: string;
      dateStr: string;
    }> = [];

    sortedAllEvents.forEach(ev => {
      // Determine quantity change relative to company or the specific warehouse
      let inQty = 0;
      let outQty = 0;

      if (selectedWhId === 'ALL') {
        // Company-wide transaction interpretation
        if (ev.eventType === 'StockIn' || ev.eventType === 'ProductionOutput') {
          inQty = ev.quantity;
        } else if (ev.eventType === 'StockOut' || ev.eventType === 'Scrap' || ev.eventType === 'ProjectConsumption') {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+') || ev.quantity > 0) {
            inQty = ev.quantity;
          } else {
            outQty = Math.abs(ev.quantity);
          }
        }
        // Transfers system-wide have net 0 impact on company balance, but we display them
      } else {
        // Specific warehouse transaction interpretation
        if (ev.targetWarehouseId === selectedWhId) {
          inQty = ev.quantity;
        } else if (ev.sourceWarehouseId === selectedWhId) {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+')) {
            inQty = ev.quantity;
          } else {
            outQty = Math.abs(ev.quantity);
          }
        }
      }

      const balanceBefore = currentBalance;
      currentBalance = currentBalance + inQty - outQty;

      // Check if event occurred BEFORE our date filter range (it belongs to Initial Balance)
      const matchesWarehouseFilter = matchesWarehouse(ev, selectedWhId);
      const matchesDateFilter = isWithinDateRange(ev.timestamp);

      if (matchesWarehouseFilter) {
        if (!matchesDateFilter) {
          // If before date range, accumulate to initial balance
          initialBalance = currentBalance;
        } else {
          // Check other filters (Type, Performer)
          const matchesType = selectedEventType === 'ALL' || ev.eventType === selectedEventType;
          const matchesPerformer = selectedOperator === 'ALL' || 
            ev.performedBy === selectedOperator || 
            ev.operatorName === selectedOperator;

          if (matchesType && matchesPerformer) {
            totalIn += inQty;
            totalOut += outQty;

            // Resolve Warehouse Text
            let whText = '';
            const srcWh = warehouses.find(w => w.id === ev.sourceWarehouseId)?.name || ev.sourceWarehouseId;
            const dstWh = warehouses.find(w => w.id === ev.targetWarehouseId)?.name || ev.targetWarehouseId;
            
            if (ev.eventType === 'Transfer') {
              whText = `${srcWh || 'نامشخص'} ➔ ${dstWh || 'نامشخص'}`;
            } else if (ev.targetWarehouseId) {
              whText = dstWh || '';
            } else if (ev.sourceWarehouseId) {
              whText = srcWh || '';
            }

            computedLines.push({
              event: ev,
              inQty,
              outQty,
              balance: currentBalance,
              docNumber: ev.docNumber || 'سند خودکار',
              whName: whText,
              dateStr: ev.timestamp
            });
          }
        }
      }
    });

    // We keep computed lines in chronologically reversed order (newest at top) for display
    return {
      initialBalance,
      lines: [...computedLines].reverse(),
      finalBalance: currentBalance,
      totalIn,
      totalOut
    };
  }, [selectedItemId, traceabilityEvents, selectedWhId, dateFilter, startDate, endDate, selectedEventType, selectedOperator, warehouses]);

  // Recharts Chart Data (Chronological accumulation for a flawless chart)
  const chartPoints = useMemo(() => {
    // Take lines in chronological order
    const chronLines = [...ledgerData.lines].reverse();
    
    // Create plotting points
    const points = chronLines.map(line => ({
      date: line.event.timestamp.substring(5, 16), // Month-Day Hour:Min
      'مقدار موجودی': line.balance,
      'وارده': line.inQty,
      'صادره': line.outQty,
    }));

    if (points.length === 0 && selectedItem) {
      // If no events in period, draw a straight line from current balance
      const currentVal = inventory
        .filter(i => i.itemId === selectedItemId && (selectedWhId === 'ALL' || i.warehouseId === selectedWhId))
        .reduce((s, c) => s + c.quantity, 0);
      return [{ date: 'بدون تراکنش', 'مقدار موجودی': currentVal, 'وارده': 0, 'صادره': 0 }];
    }

    return points;
  }, [ledgerData, selectedItem, inventory, selectedItemId, selectedWhId]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!selectedItem) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel to open Persian correctly
    csvContent += 'ردیف,تاریخ ثبت,نوع تراکنش,شماره سند,موقعیت انبار,وارده (+),صادره (-),مانده نهایی,کاربر ثبت کننده,جزئیات تراکنش\n';

    ledgerData.lines.forEach((line, index) => {
      const ev = line.event;
      let typeLabel = ev.eventType;
      switch (ev.eventType) {
        case 'StockIn': typeLabel = 'ورود کالا'; break;
        case 'StockOut': typeLabel = 'خروج کالا'; break;
        case 'Transfer': typeLabel = 'انتقال بین انبار'; break;
        case 'ProjectConsumption': typeLabel = 'مصرف پروژه'; break;
        case 'ProductionOutput': typeLabel = 'تولید محصول'; break;
        case 'Scrap': typeLabel = 'ضایعات/اسکراپ'; break;
        case 'Adjustment': typeLabel = 'اصلاح فیزیکی'; break;
      }

      const row = [
        ledgerData.lines.length - index,
        `"${line.dateStr}"`,
        `"${typeLabel}"`,
        `"${line.docNumber}"`,
        `"${line.whName}"`,
        line.inQty || 0,
        line.outQty || 0,
        line.balance,
        `"${ev.performedBy || ev.operatorName || '-'}"`,
        `"${ev.details?.replace(/"/g, '""') || '-'}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kardex_${selectedItem.code}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report View Trigger
  const handlePrint = () => {
    window.print();
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'StockIn': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'StockOut': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Transfer': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'ProjectConsumption': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'ProductionOutput': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Scrap': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Adjustment': return 'bg-slate-100 text-slate-700 border border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'StockIn': return 'ورود کالا (رسید)';
      case 'StockOut': return 'خروج کالا (حواله)';
      case 'Transfer': return 'انتقال بین انبار';
      case 'ProjectConsumption': return 'مصرف پروژه تولید';
      case 'ProductionOutput': return 'تولید محصول نهایی';
      case 'Scrap': return 'ضایعات و اسکراپ';
      case 'Adjustment': return 'اصلاح موجودی (سند)';
      default: return type;
    }
  };

  // Stock health indicators
  const isBelowMin = selectedItem ? ledgerData.finalBalance < selectedItem.minStock : false;
  const isAboveMax = selectedItem ? ledgerData.finalBalance > selectedItem.maxStock : false;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-[2rem] print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            <span>مدیریت کاردکس پیشرفته کالاها</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            لاگ یکپارچه تراکنش‌ها، ردیابی زنجیره تامین، تحلیل فیزیکی موجودی‌ها و ارزش ریالی کالا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ گزارش (A4)</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!selectedItemId}
            className={`px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all ${!selectedItemId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* Audit Log Print Template (Only visible when printing) */}
      <div className="hidden print:block font-vazir text-xs text-slate-900 bg-white p-8 leading-relaxed">
        {/* Print Stylesheet Injection */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            .print-no-break {
              page-break-inside: avoid;
            }
          }
        `}} />

        {/* Header Block */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="text-right space-y-1">
            <h1 className="text-base font-black text-slate-900">شرکت مهندسی الکترو اطلس</h1>
            <p className="text-[10px] text-slate-500 font-bold">سامانه مدیریت هوشمند زنجیره تامین و انبارداری دنا</p>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-black border border-slate-800 px-4 py-1.5 rounded-lg bg-slate-50">گزارش رسمی گردش تفصیلی کالا (کاردکس تفصیلی)</h2>
          </div>
          <div className="text-left text-[9px] text-slate-500 font-semibold space-y-1">
            <div>تاریخ گزارش: <span className="font-mono">{new Date().toLocaleDateString('fa-IR')}</span></div>
            <div>ساعت گزارش: <span className="font-mono">{new Date().toLocaleTimeString('fa-IR')}</span></div>
            <div>شناسه انبار: <span className="font-mono">{selectedWhId === 'ALL' ? 'کل انبارها (ادغام شده)' : selectedWhId}</span></div>
          </div>
        </div>

        {selectedItem && (
          <>
            {/* Product Metadata Table */}
            <div className="grid grid-cols-4 gap-x-4 gap-y-3 border border-slate-300 p-4 rounded-xl mb-6 bg-slate-50/50 text-[10px]">
              <div><strong>کد کالا:</strong> <span className="font-mono">{selectedItem.code}</span></div>
              <div><strong>نام فنی کالا:</strong> <span className="font-bold">{selectedItem.name}</span></div>
              <div><strong>گروه تخصصی:</strong> <span>{selectedItem.group}</span></div>
              <div><strong>زیرگروه تخصصی:</strong> <span>{selectedItem.subGroup}</span></div>
              <div><strong>واحد شمارش (بسته بندی):</strong> <span>{selectedItem.unit}</span></div>
              <div><strong>قیمت واحد تامین (ریال):</strong> <span className="font-mono">{selectedItem.unitPrice.toLocaleString('fa-IR')} تومان</span></div>
              <div><strong>موقعیت پیش‌فرض فیزیکی:</strong> <span className="font-bold text-slate-700">{selectedItem.locationInRack || 'قفسه عمومی'}</span></div>
              <div><strong>وضعیت فیلتر زمانی:</strong> <span>{dateFilter === 'ALL' ? 'کل بازه زمانی (کامل)' : dateFilter}</span></div>
            </div>

            {/* Financial & Physical Summary */}
            <div className="grid grid-cols-5 gap-4 border border-slate-300 p-4 rounded-xl mb-6 bg-slate-50/30 text-center text-[10px]">
              <div>
                <span className="text-slate-500 block mb-1">موجودی اول دوره:</span>
                <strong className="text-slate-800 font-mono text-xs">{ledgerData.initialBalance.toLocaleString('fa-IR')} {selectedItem.unit}</strong>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-blue-600 block mb-1">مجموع وارده (+):</span>
                <strong className="text-blue-700 font-mono text-xs">+{ledgerData.totalIn.toLocaleString('fa-IR')} {selectedItem.unit}</strong>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-amber-600 block mb-1">مجموع صادره (-):</span>
                <strong className="text-amber-700 font-mono text-xs">-{ledgerData.totalOut.toLocaleString('fa-IR')} {selectedItem.unit}</strong>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-emerald-600 block mb-1">موجودی نهایی دوره:</span>
                <strong className="text-emerald-700 font-mono text-xs">{ledgerData.finalBalance.toLocaleString('fa-IR')} {selectedItem.unit}</strong>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-indigo-600 block mb-1">ارزش ریالی موجودی:</span>
                <strong className="text-indigo-700 font-mono text-xs">{(ledgerData.finalBalance * selectedItem.unitPrice).toLocaleString('fa-IR')} تومان</strong>
              </div>
            </div>
          </>
        )}

        {/* Chronological Table */}
        <table className="w-full border-collapse border border-slate-300 text-[9px] text-right">
          <thead>
            <tr className="bg-slate-100/80 text-slate-800">
              <th className="border border-slate-300 p-2 text-center w-8">ردیف</th>
              <th className="border border-slate-300 p-2 text-center w-28">تاریخ ثبت تراکنش</th>
              <th className="border border-slate-300 p-2">نوع تراکنش انبار</th>
              <th className="border border-slate-300 p-2 font-mono text-center w-20">شماره سند سیستمی</th>
              <th className="border border-slate-300 p-2">موقعیت قفسه / انبار مبدا-مقصد</th>
              <th className="border border-slate-300 p-2 text-left w-16">وارده (+)</th>
              <th className="border border-slate-300 p-2 text-left w-16">صادره (-)</th>
              <th className="border border-slate-300 p-2 text-left w-16">مانده نهایی</th>
              <th className="border border-slate-300 p-2 w-24">کاربر ثبت کننده</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.lines.map((line, idx) => (
              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="border border-slate-300 p-2 text-center">{ledgerData.lines.length - idx}</td>
                <td className="border border-slate-300 p-2 text-center font-mono">{line.dateStr}</td>
                <td className="border border-slate-300 p-2 font-bold">{getEventLabel(line.event.eventType)}</td>
                <td className="border border-slate-300 p-2 text-center font-mono">{line.docNumber}</td>
                <td className="border border-slate-300 p-2">{line.whName || 'انبار مرکزی'}</td>
                <td className="border border-slate-300 p-2 font-mono text-left font-bold text-blue-700">{line.inQty > 0 ? `+${line.inQty.toLocaleString('fa-IR')}` : '-'}</td>
                <td className="border border-slate-300 p-2 font-mono text-left font-bold text-amber-700">{line.outQty > 0 ? `-${line.outQty.toLocaleString('fa-IR')}` : '-'}</td>
                <td className="border border-slate-300 p-2 font-mono text-left font-black bg-slate-50/50">{line.balance.toLocaleString('fa-IR')}</td>
                <td className="border border-slate-300 p-2">{line.event.performedBy || line.event.operatorName || '-'}</td>
              </tr>
            ))}
            {ledgerData.lines.length === 0 && (
              <tr>
                <td colSpan={9} className="border border-slate-300 p-8 text-center text-slate-400 italic">
                  هیچ سابقه گردش فیزیکی یا ورود و خروجی در بازه زمانی انتخابی یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signature Box Block */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-[10px] text-slate-700 print-no-break">
          <div className="border border-slate-200 rounded-xl p-4 space-y-10 bg-slate-50/20">
            <strong>تنظیم کننده (مسئول انبار فیزیکی)</strong>
            <div className="text-slate-400 text-[8px]">نام، امضا و تاریخ تحویل کالا</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4 space-y-10 bg-slate-50/20">
            <strong>تایید کننده حسابداری انبار و اموال</strong>
            <div className="text-slate-400 text-[8px]">نام، امضا و تاریخ ثبت دفاتر قانونی</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4 space-y-10 bg-slate-50/20">
            <strong>مدیریت کارخانه یا مدیر ارشد تولید</strong>
            <div className="text-slate-400 text-[8px]">مهر، امضا و تایید نهایی موجودی</div>
          </div>
        </div>
      </div>

      {/* Dashboard Filters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
        
        {/* Left Hand: Search & Select Item Combobox */}
        <div className="glass-card p-5 rounded-[2rem] space-y-4">
          <label className="text-xs font-extrabold text-slate-700 block flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-500" />
            <span>انتخاب کالا جهت بررسی کاردکس</span>
          </label>
          
          {/* Custom Autocomplete Combobox */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو با نام، کد یا بارکد کالا..."
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full px-4 py-3 glass-input rounded-xl font-bold text-xs focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-right"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-30 mt-2 w-full max-h-60 overflow-y-auto bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-xl p-1.5 space-y-0.5 custom-scrollbar">
                {filteredSearchItems.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(it.id);
                      setSearchQuery(it.name);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-right p-3 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${selectedItemId === it.id ? 'bg-indigo-500/10 text-indigo-800' : 'hover:bg-white/50 text-slate-700'}`}
                  >
                    <div className="truncate max-w-[180px] text-right">
                      <div>{it.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">کد: {it.code}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100/50 px-2 py-0.5 rounded-md font-mono shrink-0">*{it.barcode || it.code}*</span>
                  </button>
                ))}
                {filteredSearchItems.length === 0 && (
                  <div className="p-4 text-center text-slate-400 italic text-xs">کالایی یافت نشد.</div>
                )}
              </div>
            )}
          </div>

          {/* Detailed Selected Product Specs Box */}
          {selectedItem && (
            <div className="bg-white/30 border border-white/50 p-4 rounded-2xl space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100/60 border border-indigo-200/50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="truncate text-right">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">{selectedItem.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">شناسه: {selectedItem.code}</span>
                </div>
              </div>

              <div className="h-px bg-slate-200/50"></div>

              <div className="space-y-2 text-slate-600 font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">دسته‌بندی:</span>
                  <span>{selectedItem.group}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">زیرگروه کالا:</span>
                  <span>{selectedItem.subGroup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">واحد شمارش:</span>
                  <span className="bg-white/60 border border-white/80 px-2 py-0.5 rounded-md font-bold">{selectedItem.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">موقعیت قفسه:</span>
                  <span className="font-mono text-amber-800 font-bold">{selectedItem.locationInRack || 'نامشخص'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">حداقل سفارش:</span>
                  <span className="font-mono">{selectedItem.minStock.toLocaleString('fa-IR')} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">حداکثر سفارش:</span>
                  <span className="font-mono">{selectedItem.maxStock.toLocaleString('fa-IR')} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">قیمت واحد تامین:</span>
                  <span className="font-mono text-indigo-600 font-extrabold">{selectedItem.unitPrice.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Hand: Interactive Ledger Filters Panel (3 Columns Wide) */}
        <div className="lg:col-span-3 glass-card p-5 rounded-[2rem] space-y-5">
          <div className="flex items-center gap-1 text-slate-800 border-b border-slate-200/40 pb-3">
            <Filter className="w-5 h-5 text-indigo-500" />
            <span className="font-extrabold text-sm">فیلترهای پیشرفته گردش حساب انبار</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Filter: Date Presets */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">بازه زمانی تراکنش‌ها:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-3 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="ALL">کل زمان‌ها (کل تاریخچه کالا)</option>
                <option value="TODAY">امروز (۲۴ ساعت گذشته)</option>
                <option value="LAST_3_DAYS">۳ روز اخیر</option>
                <option value="LAST_7_DAYS">۷ روز اخیر (یک هفته)</option>
                <option value="LAST_30_DAYS">۳0 روز اخیر (یک ماه)</option>
                <option value="LAST_90_DAYS">۹0 روز اخیر (سه ماه)</option>
                <option value="CUSTOM">بازه زمانی سفارشی (تاریخ دستی)</option>
              </select>
            </div>

            {/* Filter: Warehouse Specific */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">فیلتر انبار فیزیکی مربوطه:</label>
              <select
                value={selectedWhId}
                onChange={(e) => setSelectedWhId(e.target.value)}
                className="w-full p-3 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="ALL">همه انبارها و فضاها (مجموع کل شرکت)</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>

            {/* Filter: Transaction Type */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">نوع سند فیزیکی:</label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full p-3 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="ALL">همه اسناد و تراکنش‌ها</option>
                <option value="StockIn">ورود کالا (سند رسید خرید / برگشتی)</option>
                <option value="StockOut">خروج کالا (سند حواله فروش)</option>
                <option value="Transfer">انتقال مابین انبارها</option>
                <option value="ProjectConsumption">مصرف کالا در پروژه تولید</option>
                <option value="ProductionOutput">تولید نهایی محصول</option>
                <option value="Scrap">اسکراپ / ضایعات انبار</option>
                <option value="Adjustment">سند اصلاح مغایرت انبارگردانی</option>
              </select>
            </div>
          </div>

          {/* Conditional Sub-filters: Custom Dates & Operators */}
          {(dateFilter === 'CUSTOM' || allOperators.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/40 pt-4 text-xs animate-fadeIn">
              {dateFilter === 'CUSTOM' && (
                <>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500 block">از تاریخ مبدا (میلادی):</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500 block">تا تاریخ مقصد (میلادی):</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 block">کاربر ثبت‌کننده سند:</label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full p-3 glass-input rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">همه ثبت‌کنندگان</option>
                  {allOperators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Advanced Ledger Valuation & Analytics Bento-Box Stats */}
      {selectedItem && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Opening Balance */}
          <div className="glass-card p-4 rounded-[1.5rem] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-12 h-12 bg-white/30 rounded-br-2xl flex items-center justify-center border-b border-r border-white/20">
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">موجودی اول دوره:</span>
              <strong className="text-xl font-black font-mono text-slate-700">
                {ledgerData.initialBalance.toLocaleString('fa-IR')}
              </strong>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-semibold block">{selectedItem.unit} (مبنای شروع دوره)</span>
          </div>

          {/* Card 2: Total Incoming */}
          <div className="glass-card p-4 rounded-[1.5rem] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-12 h-12 bg-indigo-50 rounded-br-2xl flex items-center justify-center border-b border-r border-white/20">
              <ArrowUpRight className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">جمع ورود کالا (وارده):</span>
              <strong className="text-xl font-black font-mono text-indigo-600">
                +{ledgerData.totalIn.toLocaleString('fa-IR')}
              </strong>
            </div>
            <span className="text-[10px] text-indigo-500/80 mt-1 font-bold block">اضافه شده به موجودی</span>
          </div>

          {/* Card 3: Total Outgoing */}
          <div className="glass-card p-4 rounded-[1.5rem] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-12 h-12 bg-amber-50 rounded-br-2xl flex items-center justify-center border-b border-r border-white/20">
              <ArrowDownLeft className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">جمع خروج کالا (صادره):</span>
              <strong className="text-xl font-black font-mono text-amber-600">
                -{ledgerData.totalOut.toLocaleString('fa-IR')}
              </strong>
            </div>
            <span className="text-[10px] text-amber-600/80 mt-1 font-bold block">کاسته شده از موجودی</span>
          </div>

          {/* Card 4: Closing Balance (Health status included) */}
          <div className={`p-4 rounded-[1.5rem] border shadow-xs flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${isBelowMin ? 'bg-rose-500/10 border-rose-500/30 text-rose-900' : 'glass-card'}`}>
            <div className={`absolute top-0 left-0 w-12 h-12 rounded-br-2xl flex items-center justify-center border-b border-r border-white/10 ${isBelowMin ? 'bg-rose-100/50' : 'bg-emerald-50'}`}>
              {isBelowMin ? <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">موجودی نهایی لحظه‌ای:</span>
              <strong className={`text-xl font-black font-mono ${isBelowMin ? 'text-rose-700' : 'text-emerald-600'}`}>
                {ledgerData.finalBalance.toLocaleString('fa-IR')}
              </strong>
            </div>
            <span className="text-[10px] font-extrabold mt-1 block">
              {isBelowMin ? (
                <span className="text-rose-600">⚠️ بحران: کسر نقطه سفارش!</span>
              ) : isAboveMax ? (
                <span className="text-blue-600">⚠️ هشدار: بیش از حداکثر سقف!</span>
              ) : (
                <span className="text-emerald-600">✓ موجودی کاملاً متعادل</span>
              )}
            </span>
          </div>

          {/* Card 5: Inventory Valuation (Value on Book) */}
          <div className="glass-card p-4 rounded-[1.5rem] flex flex-col justify-between relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="absolute top-0 left-0 w-12 h-12 bg-indigo-50 rounded-br-2xl flex items-center justify-center border-b border-r border-white/20">
              <DollarSign className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">ارزش کل موجودی انبار:</span>
              <strong className="text-xl font-black font-mono text-indigo-600">
                {(ledgerData.finalBalance * selectedItem.unitPrice).toLocaleString('fa-IR')}
              </strong>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-bold block">تومان (ارزیابی بهای تمام‌شده)</span>
          </div>

        </div>
      )}

      {/* Advanced Layout: Ledger Chart & Running Logs Grid */}
      {selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Chronological Chart */}
          <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 relative overflow-hidden flex flex-col min-h-[380px] print:hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>نمودار نوسانات موجودی فیزیکی و نقطه سفارش</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">روند انباشت و مصرف فیزیکی قطعات در بازه زمانی انتخابی</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs"></span>موجودی</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-1 border-t-2 border-dashed border-rose-500"></span>نقطه بحرانی ({selectedItem.minStock})</span>
              </div>
            </div>

            <div className="h-64 w-full flex-1" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kardexGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} dx={-6} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontFamily: 'Vazir, sans-serif' }}
                  />
                  {/* Min stock guide line */}
                  <Area 
                    type="monotone" 
                    dataKey="مقدار موجودی" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#kardexGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratio of In/Out Volumes by presets */}
          <div className="glass-card rounded-[2rem] p-6 flex flex-col justify-between print:hidden">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>بررسی نرخ مصرف و پویایی کالا</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                نرخ مصرف به شما کمک می‌کند سرعت تخلیه و تامین این کالا را با حداقل سطح انبار (نقطه ایمنی) مقایسه کنید.
              </p>
            </div>

            <div className="py-4 space-y-4 text-xs font-semibold text-slate-700">
              <div className="p-3 bg-white/30 border border-white/50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>میانگین ورود کالا:</span>
                  <strong className="text-blue-600 font-mono">{(ledgerData.totalIn / Math.max(1, ledgerData.lines.length)).toFixed(1)} {selectedItem.unit}</strong>
                </div>
                <div className="w-full bg-slate-300/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (ledgerData.totalIn / Math.max(1, ledgerData.totalIn + ledgerData.totalOut)) * 100)}%` }}></div>
                </div>
              </div>

              <div className="p-3 bg-white/30 border border-white/50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>میانگین خروج/مصرف:</span>
                  <strong className="text-amber-600 font-mono">{(ledgerData.totalOut / Math.max(1, ledgerData.lines.length)).toFixed(1)} {selectedItem.unit}</strong>
                </div>
                <div className="w-full bg-slate-300/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (ledgerData.totalOut / Math.max(1, ledgerData.totalIn + ledgerData.totalOut)) * 100)}%` }}></div>
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-100/30 rounded-xl text-center">
                <span className="text-[10px] text-indigo-700 font-extrabold block mb-1">تراکنش‌های ثبت شده این کالا در دوره:</span>
                <strong className="text-indigo-800 text-lg font-mono font-black">{ledgerData.lines.length} سند</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Flawless Running Transaction Table */}
      {selectedItem && (
        <div className="glass-card rounded-[2rem] overflow-hidden print:hidden">
          <div className="p-5 border-b border-slate-200/40 flex items-center justify-between bg-white/20">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <span>لاگ تراکنش‌های ثبت شده کالا (Ledger Lines)</span>
            </h3>
            <span className="text-[10px] bg-white/50 border border-white/60 text-slate-500 font-bold px-3 py-1 rounded-full">
              تعداد ردیف فعال: {ledgerData.lines.length} ردیف تراکنش
            </span>
          </div>

          <div className="overflow-x-auto max-w-full custom-scrollbar">
            <table className="w-full text-[11px] text-right text-slate-700">
              <thead className="bg-white/30 font-extrabold text-slate-500">
                <tr className="border-b border-slate-200/40">
                  <th className="p-4 whitespace-nowrap">#</th>
                  <th className="p-4 whitespace-nowrap">تاریخ ثبت تراکنش</th>
                  <th className="p-4 whitespace-nowrap">نوع تراکنش</th>
                  <th className="p-4 whitespace-nowrap">شماره سند ثبتی</th>
                  <th className="p-4 whitespace-nowrap">موقعیت / انبار مبدا-مقصد</th>
                  <th className="p-4 whitespace-nowrap text-left">وارده (+)</th>
                  <th className="p-4 whitespace-nowrap text-left">صادره (-)</th>
                  <th className="p-4 whitespace-nowrap text-left">مانده لحظه‌ای</th>
                  <th className="p-4 whitespace-nowrap">ثبت‌کننده</th>
                  <th className="p-4 whitespace-nowrap">بیشتر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/40 bg-transparent font-semibold">
                {ledgerData.lines.map((line, idx) => {
                  const ev = line.event;
                  const isExpanded = expandedRowId === ev.id;

                  return (
                    <React.Fragment key={ev.id}>
                      <tr className={`hover:bg-white/40 transition-colors ${isExpanded ? 'bg-indigo-500/5' : ''}`}>
                        <td className="p-4 text-slate-400 font-mono text-[10px]">{ledgerData.lines.length - idx}</td>
                        <td className="p-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">{line.dateStr}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${getEventBadgeClass(ev.eventType)}`}>
                            {getEventLabel(ev.eventType)}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">{line.docNumber}</td>
                        <td className="p-4 text-slate-600 whitespace-nowrap">{line.whName || '-'}</td>
                        <td className="p-4 font-mono font-bold text-left text-indigo-600">
                          {line.inQty > 0 ? `+${line.inQty.toLocaleString('fa-IR')}` : '-'}
                        </td>
                        <td className="p-4 font-mono font-bold text-left text-amber-600">
                          {line.outQty > 0 ? `-${line.outQty.toLocaleString('fa-IR')}` : '-'}
                        </td>
                        <td className="p-4 font-mono font-black text-left text-slate-900 bg-white/20">
                          {line.balance.toLocaleString('fa-IR')}
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">{ev.performedBy || ev.operatorName}</td>
                        <td className="p-4">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : ev.id)}
                            className="p-1.5 bg-white/50 border border-white/60 hover:bg-white/80 text-slate-500 rounded-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Container */}
                      {isExpanded && (
                        <tr className="bg-indigo-500/5 border-y border-indigo-100/20 animate-fadeIn">
                          <td colSpan={10} className="p-5 text-xs text-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/40 border border-white/50 p-4 rounded-2xl">
                              
                              <div className="space-y-2">
                                <h5 className="font-extrabold text-indigo-950 flex items-center gap-1.5 mb-1">
                                  <Info className="w-4 h-4 text-indigo-500" />
                                  <span>شرح و توضیحات سند</span>
                                </h5>
                                <p className="text-slate-600 font-medium leading-relaxed bg-white/40 p-3 rounded-xl border border-white/60">
                                  {ev.details || 'هیچ توضیحی برای این سند یا تراکنش خودکار ثبت نشده است.'}
                                </p>
                              </div>

                              <div className="space-y-2 font-semibold">
                                <h5 className="font-extrabold text-indigo-950 flex items-center gap-1.5 mb-1">
                                  <Layers className="w-4 h-4 text-indigo-500" />
                                  <span>اطلاعات ردیابی سیستم</span>
                                </h5>
                                <div className="space-y-1.5 bg-white/40 p-3 rounded-xl border border-white/60">
                                  <div>• شناسه سیستمی: <span className="font-mono text-[10px] text-slate-500">{ev.id}</span></div>
                                  <div>• تاریخ میلادی ثبت: <span className="font-mono text-[10px] text-slate-500">{ev.timestamp}</span></div>
                                  {ev.projectId && <div>• مربوط به پروژه تولید: <span className="text-slate-800 font-bold">{ev.projectId}</span></div>}
                                </div>
                              </div>

                              <div className="space-y-2 font-semibold">
                                <h5 className="font-extrabold text-indigo-950 flex items-center gap-1.5 mb-1">
                                  <User className="w-4 h-4 text-indigo-500" />
                                  <span>مسئول و مجری تراکنش</span>
                                </h5>
                                <div className="space-y-1.5 bg-white/40 p-3 rounded-xl border border-white/60">
                                  <div>• ثبت کننده تراکنش: <span className="text-slate-800 font-bold">{ev.performedBy}</span></div>
                                  {ev.operatorName && <div>• اپراتور مجری فنی: <span className="text-slate-800 font-bold">{ev.operatorName}</span></div>}
                                  <div>• وضعیت نهایی سند: <span className="text-emerald-600 font-extrabold">تایید شده سیستم (Confirmed)</span></div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {ledgerData.lines.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 italic">
                      <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <span>هیچ تراکنش یا گردش انباری با فیلترهای انتخابی یافت نشد.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fallback Selection Grid if no item exists */}
      {items.length === 0 && (
        <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 shadow-xs space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-black text-slate-800 text-lg">کالایی ثبت نشده است</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            جهت بارگذاری کاردکس ابتدا باید کالا یا قطعه فیزیکی در بخش مدیریت کالاها ایجاد نمایید.
          </p>
          <button
            onClick={() => setActiveTab('items')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700"
          >
            ایجاد کالای جدید
          </button>
        </div>
      )}
    </div>
  );
};
