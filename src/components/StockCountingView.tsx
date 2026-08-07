import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StockCountingSession, StockCountingItem } from '../types';
import { 
  ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Search, Filter, 
  ArrowRightLeft, FileSpreadsheet, Layers, RefreshCw, Warehouse, 
  ShieldAlert, Check, Barcode, HelpCircle, Download, FileText, CheckCircle, Info, X
} from 'lucide-react';

export const StockCountingView: React.FC = () => {
  const { 
    stockCountings, warehouses, items, inventory, createStockCountingSession, 
    updateStockCountItem, applyStockCountingAdjustments, currentUser, language, t,
    projects, boms, itemGroups
  } = useApp();

  // Active Session Selection
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    stockCountings[0]?.id || null
  );

  // Filter and Search states
  const [filterText, setFilterText] = useState<string>('');
  const [onlyShowDiscrepancies, setOnlyShowDiscrepancies] = useState<boolean>(false);

  // Create Session states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newWhId, setNewWhId] = useState<string>(warehouses[0]?.id || '');
  const [notesInput, setNotesInput] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<'All' | 'Group' | 'Project' | 'Location'>('All');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('');

  // Barcode Scanner states
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [activeCountStage, setActiveCountStage] = useState<1 | 2>(1);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Reconciliation Confirmation Modal
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [reconcileAccepted, setReconcileAccepted] = useState<boolean>(false);

  const isFa = language === 'fa';

  const selectedSession = stockCountings.find(s => s.id === activeSessionId) || stockCountings[0];

  // Auto-focus barcode reader input when session changes or stage changes
  useEffect(() => {
    if (selectedSession && selectedSession.status !== 'Applied' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedSession, activeCountStage]);

  // Handle Create Session
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhId) return;

    // Filter items based on selected filter
    let filteredItemsList = [...items];
    if (selectedFilterType === 'Group' && selectedFilterValue) {
      filteredItemsList = items.filter(it => it.group === selectedFilterValue || it.subGroup === selectedFilterValue);
    } else if (selectedFilterType === 'Location' && selectedFilterValue) {
      filteredItemsList = items.filter(it => 
        it.locationInRack?.toLowerCase().startsWith(selectedFilterValue.toLowerCase())
      );
    } else if (selectedFilterType === 'Project' && selectedFilterValue) {
      const proj = projects.find(p => p.id === selectedFilterValue);
      if (proj) {
        const bom = boms.find(b => b.finishedItemId === proj.targetFinishedItemId);
        if (bom) {
          const bomItemIds = bom.items.map(bi => bi.itemId);
          filteredItemsList = items.filter(it => bomItemIds.includes(it.id));
        } else {
          filteredItemsList = []; // Empty if project finished item has no BOM
        }
      }
    }

    const whItems = filteredItemsList.map(it => {
      const sysQty = inventory
        .filter(inv => inv.itemId === it.id && inv.warehouseId === newWhId)
        .reduce((sum, curr) => sum + curr.quantity, 0);

      return {
        itemId: it.id,
        itemCode: it.code,
        itemName: it.name,
        barcode: it.barcode || it.code,
        systemQuantity: sysQty,
        firstCount: 0,       // physical counting starts at 0
        secondCount: 0,
        finalCount: 0,
        physicalQuantity: 0, 
        variance: -sysQty,   // Initial variance is -sysQty until counted
        difference: -sysQty,
        unit: it.unit,
        locationInRack: it.locationInRack
      };
    });

    const sessionNum = `SC-${Date.now().toString().slice(-6)}`;
    const filterDesc = selectedFilterType === 'All' 
      ? 'کل انبار' 
      : `${selectedFilterType === 'Group' ? 'دسته' : selectedFilterType === 'Location' ? 'قفسه' : 'پروژه'}: ${selectedFilterValue}`;

    createStockCountingSession({
      sessionNumber: sessionNum,
      title: `انبارگردانی دوره ای (${filterDesc})`,
      warehouseId: newWhId,
      warehouseName: warehouses.find(w => w.id === newWhId)?.name || newWhId,
      startDate: new Date().toISOString().substring(0, 10),
      registeredBy: currentUser.fullName,
      status: 'InCounting',
      items: whItems,
      notes: notesInput || `دوره انبارگردانی فیلتر شده بر اساس ${filterDesc}`,
      filterType: selectedFilterType,
      filterValue: selectedFilterValue
    });

    setShowCreateModal(false);
    setNotesInput('');
    setSelectedFilterValue('');
    setSelectedFilterType('All');
  };

  // Handle Quick Barcode Scan Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || selectedSession.status === 'Applied' || !barcodeInput.trim()) return;

    const scannedText = barcodeInput.trim();
    // Look up item inside session items
    const foundItemIndex = selectedSession.items.findIndex(
      it => it.itemCode.toLowerCase() === scannedText.toLowerCase() || 
            (it.barcode && it.barcode.toLowerCase() === scannedText.toLowerCase())
    );

    if (foundItemIndex !== -1) {
      const foundItem = selectedSession.items[foundItemIndex];
      const curFirst = foundItem.firstCount ?? 0;
      const curSecond = foundItem.secondCount ?? 0;

      let newFirst = curFirst;
      let newSecond = curSecond;

      if (activeCountStage === 1) {
        newFirst = curFirst + 1;
      } else {
        newSecond = curSecond + 1;
      }

      // Final count selection: use second count if we are in stage 2, else first count
      const finalCount = activeCountStage === 2 ? newSecond : newFirst;

      updateStockCountItem(
        selectedSession.id, 
        foundItem.itemId, 
        finalCount, 
        foundItem.notes, 
        newFirst, 
        newSecond, 
        finalCount
      );

      setScanMessage({
        text: `کالای "${foundItem.itemName}" با موفقیت ثبت شد. مقدار جدید شمارش ${activeCountStage === 1 ? 'اول' : 'دوم'}: ${activeCountStage === 1 ? newFirst : newSecond}`,
        type: 'success'
      });
    } else {
      setScanMessage({
        text: `کد یا بارکد "${scannedText}" در اقلام این دوره انبارگردانی وجود ندارد!`,
        type: 'error'
      });
    }

    setBarcodeInput('');
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }

    // Auto-clear message after 4 seconds
    setTimeout(() => {
      setScanMessage(prev => prev && prev.text.includes(scannedText) ? null : prev);
    }, 4000);
  };

  // Export CSV Report of Discrepancies
  const handleExportCSV = () => {
    if (!selectedSession) return;
    
    const headers = [
      'ردیف',
      'کد کالا',
      'نام کالا',
      'آدرس قفسه',
      'موجودی سیستم',
      'شمارش اول',
      'شمارش دوم',
      'شمارش نهایی',
      'مغایرت',
      'وضعیت مغایرت',
      'یادداشت انباردار'
    ];
    
    const rows = selectedSession.items.map((it, idx) => {
      const first = it.firstCount ?? 0;
      const second = it.secondCount ?? 0;
      const final = it.finalCount ?? it.physicalQuantity;
      const diff = final - it.systemQuantity;
      let statusText = 'منطبق';
      if (diff < 0) statusText = `کسری (${Math.abs(diff)})`;
      if (diff > 0) statusText = `اضافه (${diff})`;
      
      return [
        idx + 1,
        it.itemCode,
        it.itemName,
        it.locationInRack || 'نامشخص',
        it.systemQuantity,
        first,
        second,
        final,
        diff,
        statusText,
        it.notes || ''
      ];
    });

    // Add Persian UTF-8 BOM so Persian letters appear perfectly in Microsoft Excel
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `گزارش-مغایرت-انبارگردانی-${selectedSession.sessionNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Set All Final Counts based on Count 1 or Count 2 globally
  const handleApplyGlobalBasis = (basis: 'first' | 'second') => {
    if (!selectedSession || selectedSession.status === 'Applied') return;

    selectedSession.items.forEach(it => {
      const val = basis === 'first' ? (it.firstCount ?? 0) : (it.secondCount ?? 0);
      updateStockCountItem(
        selectedSession.id, 
        it.itemId, 
        val, 
        it.notes, 
        it.firstCount ?? 0, 
        it.secondCount ?? 0, 
        val
      );
    });

    setScanMessage({
      text: `مبنای محاسبات نهایی برای تمام اقلام بر اساس شمارش ${basis === 'first' ? 'اول' : 'دوم'} تنظیم گردید.`,
      type: 'success'
    });
  };

  // Submit Correction Document officially
  const handlePostCorrectionDocument = () => {
    if (!selectedSession || selectedSession.status === 'Applied') return;
    applyStockCountingAdjustments(selectedSession.id);
    setShowReconcileModal(false);
    setReconcileAccepted(false);
  };

  // Filtered Items Table
  const filteredSessionItems = useMemo(() => {
    if (!selectedSession) return [];
    
    return selectedSession.items.filter(it => {
      const matchesSearch = 
        it.itemName.toLowerCase().includes(filterText.toLowerCase()) ||
        it.itemCode.toLowerCase().includes(filterText.toLowerCase());
        
      const finalVal = it.finalCount !== undefined ? it.finalCount : it.physicalQuantity;
      const matchesDiscrepancy = !onlyShowDiscrepancies || (finalVal - it.systemQuantity !== 0);
      
      return matchesSearch && matchesDiscrepancy;
    });
  }, [selectedSession, filterText, onlyShowDiscrepancies]);

  // Statistics calculation
  const totalItemsCount = selectedSession?.items.length || 0;
  const surplusItems = selectedSession?.items.filter(it => {
    const final = it.finalCount !== undefined ? it.finalCount : it.physicalQuantity;
    return final - it.systemQuantity > 0;
  }) || [];
  
  const deficitItems = selectedSession?.items.filter(it => {
    const final = it.finalCount !== undefined ? it.finalCount : it.physicalQuantity;
    return final - it.systemQuantity < 0;
  }) || [];
  
  const matchedItemsCount = totalItemsCount - surplusItems.length - deficitItems.length;

  const totalVarianceAbs = selectedSession?.items.reduce((sum, it) => {
    const final = it.finalCount !== undefined ? it.finalCount : it.physicalQuantity;
    return sum + Math.abs(final - it.systemQuantity);
  }, 0) || 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              مدیریت هوشمند انبارگردانی و تطبیق موجودی
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ثبت شمارش اول و دوم با بارکدخوان، گزارش‌گیری فوری کسری و اضافه، و ثبت رسمی اسناد اصلاحی انبار
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>شروع دوره انبارگردانی جدید</span>
        </button>
      </div>

      {/* Grid Layout: Sessions list (Right) & Selected Session Metrics (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Session Selector Column */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            <span>دوره‌های انبارگردانی</span>
          </h2>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
            {stockCountings.map(session => {
              const wh = warehouses.find(w => w.id === session.warehouseId);
              const isActive = selectedSession?.id === session.id;
              const isApplied = session.status === 'Applied' || session.status === 'AppliedAdjustments';

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setScanMessage(null);
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-indigo-50/75 border-indigo-300 ring-1 ring-indigo-200/50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="font-mono">{session.sessionNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isApplied 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {isApplied ? 'سند اصلاحی زده شده' : 'در حال شمارش'}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1">
                    <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                    <span>{wh?.name || session.warehouseName || session.warehouseId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between font-mono">
                    <span>{session.startDate || session.createdAt}</span>
                    <span className="font-sans">{session.registeredBy}</span>
                  </div>
                </div>
              );
            })}
            {stockCountings.length === 0 && (
              <div className="text-center p-6 text-slate-400 italic">هیچ دوره‌ای تعریف نشده است</div>
            )}
          </div>
        </div>

        {/* Selected Session Stats Summary Panel */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">اقلام مشمول انبارگردانی</div>
              <div className="text-base font-extrabold text-slate-950 mt-1">
                {totalItemsCount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">قلم</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">اقلام بدون مغایرت (منطبق)</div>
              <div className="text-base font-extrabold text-emerald-600 mt-1">
                {matchedItemsCount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">قلم</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">کسری انبار (مغایرت منفی)</div>
              <div className="text-base font-extrabold text-rose-600 mt-1">
                {deficitItems.length.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">قلم</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">اضافه انبار (مغایرت مثبت)</div>
              <div className="text-base font-extrabold text-amber-600 mt-1">
                {surplusItems.length.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">قلم</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSession && (
        <>
          {/* Barcode Quick Scanning Interface */}
          {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' && (
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
                  <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-indigo-600" />
                    <span>ماژول اسکن هوشمند بارکد کالاها (اتصال بارکدخوان)</span>
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCountStage(1);
                      setScanMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      activeCountStage === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    مرحله اول: شمارش اول
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCountStage(2);
                      setScanMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      activeCountStage === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    مرحله دوم: شمارش دوم
                  </button>
                </div>
              </div>

              {/* Input Form for Barcode Scanners */}
              <form onSubmit={handleBarcodeSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    required
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="محل فوکوس بارکدخوان: کالا را اسکن کنید یا کد/بارکد را وارد کرده و Enter بزنید..."
                    className="w-full pl-4 pr-10 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  />
                  <span className="absolute left-3 top-2.5 text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold font-sans">
                    سنسور آنلاین
                  </span>
                </div>

                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ثبت شمارش بارکد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (barcodeInputRef.current) barcodeInputRef.current.focus();
                    }}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                    title="فوکوس مجدد روی کادر اسکنر"
                  >
                    فوکوس مجدد
                  </button>
                </div>
              </form>

              {/* Notification Scan Result */}
              {scanMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fadeIn ${
                  scanMessage.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {scanMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-600 shrink-0 cursor-pointer" onClick={() => setScanMessage(null)} />
                  )}
                  <span className="font-semibold">{scanMessage.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Main List Table & Report Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Control Bar inside Table card */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Search Text */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجوی کد یا نام کالا در لیست شمارش..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-3 pr-9 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Filter Checkbox */}
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={onlyShowDiscrepancies}
                    onChange={(e) => setOnlyShowDiscrepancies(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>فقط نمایش اقلام مغایرت‌دار ({surplusItems.length + deficitItems.length} مورد)</span>
                </label>
              </div>

              {/* Action Buttons: Export Excel, Post Adjustments */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* CSV Download */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>خروجی اکسل مغایرت (Excel)</span>
                </button>

                {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' && (
                  <>
                    <div className="h-6 w-px bg-slate-300 hidden sm:block mx-1"></div>

                    {/* Global Actions dropdown */}
                    <div className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100 p-1 rounded-xl">
                      <span className="text-[10px] font-extrabold text-indigo-800 px-2">تنظیم مبنای نهایی:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyGlobalBasis('first')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer text-indigo-700"
                        title="تنظیم تعداد نهایی تمام اقلام برابر با مقدار شمارش اول"
                      >
                        کل شمارش اول
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyGlobalBasis('second')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer text-indigo-700"
                        title="تنظیم تعداد نهایی تمام اقلام برابر با مقدار شمارش دوم"
                      >
                        کل شمارش دوم
                      </button>
                    </div>

                    {/* Post Correction document */}
                    <button
                      type="button"
                      onClick={() => {
                        setReconcileAccepted(false);
                        setShowReconcileModal(true);
                      }}
                      className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>ثبت سند اصلاحی انبارگردانی</span>
                    </button>
                  </>
                )}

                {(selectedSession.status === 'Applied' || selectedSession.status === 'AppliedAdjustments') && (
                  <div className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>مغایرت‌ها اعمال شده و سند اصلاحی صادر گردید</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Spreadsheet Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد کالا</th>
                    <th className="p-3">نام و مشخصات کامل کالا</th>
                    <th className="p-3">قفسه فیزیکی</th>
                    <th className="p-3 text-left">موجودی سیستم</th>
                    <th className="p-3 text-left bg-indigo-50/20">شمارش اول (۱)</th>
                    <th className="p-3 text-left bg-indigo-50/40">شمارش دوم (۲)</th>
                    <th className="p-3 text-left bg-indigo-50/60 font-extrabold">مبنای نهایی</th>
                    <th className="p-3 text-left">کسری / اضافه</th>
                    <th className="p-3">علت مغایرت / توضیحات انباردار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSessionItems.map((it, idx) => {
                    const first = it.firstCount !== undefined ? it.firstCount : it.physicalQuantity;
                    const second = it.secondCount !== undefined ? it.secondCount : 0;
                    const final = it.finalCount !== undefined ? it.finalCount : it.physicalQuantity;
                    
                    const diff = final - it.systemQuantity;
                    const hasDiff = diff !== 0;
                    const isLoss = diff < 0;
                    const isGain = diff > 0;

                    return (
                      <tr key={it.itemId} className={`hover:bg-slate-50/70 transition-colors ${hasDiff ? 'bg-amber-50/20' : ''}`}>
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">{it.itemCode}</td>
                        <td className="p-3 font-semibold text-slate-900">{it.itemName}</td>
                        <td className="p-3 font-mono font-bold text-amber-800 whitespace-nowrap">{it.locationInRack || 'نامشخص'}</td>
                        <td className="p-3 font-mono font-bold text-left text-slate-600 text-sm">
                          {it.systemQuantity.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">{it.unit}</span>
                        </td>
                        
                        {/* Count 1 column input */}
                        <td className="p-3 text-left bg-indigo-50/10">
                          {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' ? (
                            <input
                              type="number"
                              min="0"
                              value={first}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                // Auto-update final count if stage 2 has not been populated
                                const finalCount = second > 0 ? second : val;
                                updateStockCountItem(selectedSession.id, it.itemId, finalCount, it.notes, val, second, finalCount);
                              }}
                              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono font-extrabold focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white bg-slate-50 text-left"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-700">{first.toLocaleString('fa-IR')}</span>
                          )}
                        </td>

                        {/* Count 2 column input */}
                        <td className="p-3 text-left bg-indigo-50/20">
                          {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' ? (
                            <input
                              type="number"
                              min="0"
                              value={second}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                // Stage 2 input immediately becomes final count
                                updateStockCountItem(selectedSession.id, it.itemId, val, it.notes, first, val, val);
                              }}
                              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono font-extrabold focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white bg-slate-50 text-left"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-700">{second.toLocaleString('fa-IR')}</span>
                          )}
                        </td>

                        {/* Final basis count input */}
                        <td className="p-3 text-left bg-indigo-50/30">
                          {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' ? (
                            <input
                              type="number"
                              min="0"
                              value={final}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateStockCountItem(selectedSession.id, it.itemId, val, it.notes, first, second, val);
                              }}
                              className="w-20 px-2 py-1 text-xs border border-indigo-300 rounded-lg font-mono font-black focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-left text-indigo-700"
                            />
                          ) : (
                            <span className="font-mono font-black text-indigo-700">{final.toLocaleString('fa-IR')}</span>
                          )}
                        </td>

                        {/* Variance output */}
                        <td className="p-3 font-mono font-bold text-left whitespace-nowrap">
                          {hasDiff ? (
                            <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold ${
                              isLoss 
                                ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {isLoss ? `${diff.toLocaleString('fa-IR')} (کسری)` : `+${diff.toLocaleString('fa-IR')} (اضافه)`}
                            </span>
                          ) : (
                            <span className="text-slate-400">انطباق کامل</span>
                          )}
                        </td>

                        {/* Notes input */}
                        <td className="p-3">
                          {selectedSession.status !== 'Applied' && selectedSession.status !== 'AppliedAdjustments' ? (
                            <input
                              type="text"
                              placeholder="توضیحات یا یادداشت علت مغایرت..."
                              value={it.notes || ''}
                              onChange={(e) => {
                                updateStockCountItem(selectedSession.id, it.itemId, final, e.target.value, first, second, final);
                              }}
                              className="w-full min-w-[120px] px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <span className="text-slate-500 italic font-medium">{it.notes || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSessionItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold italic">
                        هیچ قلم کالا مطابق فیلترهای جستجو یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create New Session */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fadeIn">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              <span>ایجاد دوره جدید شمارش انبارگردانی</span>
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">انتخاب انبار هدف*</label>
                  <select
                    value={newWhId}
                    onChange={(e) => setNewWhId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">شکل انبارگردانی (محدوده کالاها)*</label>
                  <select
                    value={selectedFilterType}
                    onChange={(e) => {
                      setSelectedFilterType(e.target.value as any);
                      setSelectedFilterValue('');
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="All">همه اقلام انبار (جامع)</option>
                    <option value="Group">بر اساس شاخه و گروه کالا</option>
                    <option value="Location">بر اساس آدرس قفسه‌ها</option>
                    <option value="Project">بر اساس اقلام مصرفی یک پروژه</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Filter Inputs */}
              {selectedFilterType === 'Group' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">شاخه یا گروه کالا را انتخاب کنید</label>
                  <select
                    value={selectedFilterValue}
                    required
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="">-- انتخاب دسته‌بندی کالا --</option>
                    {itemGroups.map(grp => (
                      <option key={grp.id} value={grp.name}>{grp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedFilterType === 'Location' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">پیشوند آدرس فیزیکی قفسه</label>
                  <input
                    type="text"
                    required
                    value={selectedFilterValue}
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    placeholder="مثال: A-04 (فقط اقلام قفسه A-04 شمارش می‌شود)"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 text-left font-mono"
                  />
                </div>
              )}

              {selectedFilterType === 'Project' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">پروژه را انتخاب کنید (فیلتر بر اساس اقلام BOM پروژه)</label>
                  <select
                    value={selectedFilterValue}
                    required
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="">-- انتخاب پروژه تولیدی --</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name} (کد: {proj.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">توضیحات و دستورالعمل شمارش انبار</label>
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="مثال: شمارش فیزیکی قطعات الکترونیکی پایان فصل سه‌ماهه دوم سال..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  ایجاد دوره و استخراج موجودی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post Reconciliation Correction Document */}
      {showReconcileModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>ثبت نهایی سند اصلاحی انبارگردانی ({selectedSession.sessionNumber})</span>
              </h3>
              <button 
                onClick={() => setShowReconcileModal(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800 text-xs">هشدار سیستمی مهم</h4>
                  <p className="mt-1 text-amber-700 leading-relaxed font-semibold">
                    با تایید و ثبت نهایی سند اصلاحی، موجودی انبارها دقیقاً منطبق بر مقادیر ستون "مبنای نهایی" به‌روزرسانی شده و اسناد خودکار ورود/خروج برای کسری و اضافه صادر می‌شود. این عملیات غیرقابل بازگشت است.
                  </p>
                </div>
              </div>

              {/* Summary Lists */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                  <span className="text-rose-800 font-bold block mb-1">اقلام کسر انبار ({deficitItems.length} قلم):</span>
                  <div className="max-h-[120px] overflow-y-auto font-semibold text-slate-600 space-y-1 custom-scrollbar">
                    {deficitItems.map(it => {
                      const final = it.finalCount ?? it.physicalQuantity;
                      const diff = final - it.systemQuantity;
                      return <div key={it.itemId}>• {it.itemName}: <span className="text-rose-600 font-mono font-bold">{diff} {it.unit}</span></div>;
                    })}
                    {deficitItems.length === 0 && <div className="text-slate-400 italic">هیچ کسری گزارش نشده است.</div>}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-emerald-800 font-bold block mb-1">اقلام اضافه انبار ({surplusItems.length} قلم):</span>
                  <div className="max-h-[120px] overflow-y-auto font-semibold text-slate-600 space-y-1 custom-scrollbar">
                    {surplusItems.map(it => {
                      const final = it.finalCount ?? it.physicalQuantity;
                      const diff = final - it.systemQuantity;
                      return <div key={it.itemId}>• {it.itemName}: <span className="text-emerald-600 font-mono font-bold">+{diff} {it.unit}</span></div>;
                    })}
                    {surplusItems.length === 0 && <div className="text-slate-400 italic">هیچ اضافه انباری گزارش نشده است.</div>}
                  </div>
                </div>
              </div>

              {/* Acceptance Checkbox */}
              <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={reconcileAccepted}
                  onChange={(e) => setReconcileAccepted(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-extrabold text-slate-800">
                  صحت مقادیر مغایرت انبار فوق را تایید کرده و دستور صدور سند اصلاحی انبار را صادر می‌نمایم.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!reconcileAccepted}
                onClick={handlePostCorrectionDocument}
                className={`px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  reconcileAccepted ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>ثبت سند و اصلاح کل موجودی انبار</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
