import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StockCountingSession, StockCountingItem } from '../types';
import { 
  ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Search, Filter, 
  ArrowRightLeft, FileSpreadsheet, Layers, RefreshCw, Warehouse, 
  ShieldAlert, Check, Barcode, HelpCircle, Download, FileText, CheckCircle, 
  Info, X, Trash2, Printer, Eye, EyeOff, Tag, Scale, FileBadge, Lock,
  TrendingDown, TrendingUp, Percent, ShieldCheck, ChevronDown, CheckSquare, Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/security';

export const StockCountingView: React.FC = () => {
  const { 
    stockCountings, warehouses, items, inventory, createStockCountingSession, 
    updateStockCountItem, updateStockCountingSession, applyStockCountingAdjustments, 
    deleteStockCountingSession, currentUser, language, t,
    projects, boms, itemGroups, companyName
  } = useApp();

  // Price visibility permission check
  const userCanViewPrice = currentUser?.canViewPrices ?? (
    currentUser?.role === 'SystemAdmin' || 
    currentUser?.role === 'PlantManager' || 
    currentUser?.role === 'WarehouseManager' || 
    currentUser?.role === 'Purchasing'
  );

  // Active Session Selection
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    stockCountings[0]?.id || null
  );

  // Filter, Tab & Search states
  const [filterText, setFilterText] = useState<string>('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'discrepant' | 'deficit' | 'surplus' | 'matched' | 'uncounted'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Multi-Stage Physical Counting Active View (Stage 1 = First Count, Stage 2 = Second Count, Stage 3 = Arbitration, 4 = Final Review)
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4>(1);

  // Create Session Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newWhId, setNewWhId] = useState<string>(warehouses[0]?.id || '');
  const [sessionTitleInput, setSessionTitleInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<'All' | 'Group' | 'Project' | 'Location'>('All');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('');
  const [isBlindCountInitial, setIsBlindCountInitial] = useState<boolean>(false);

  // Barcode & Quick Scanner states
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [scanQty, setScanQty] = useState<number>(1);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Official Modals (Print Tags, Print Minutes, Reconcile Document)
  const [showTagsModal, setShowTagsModal] = useState<boolean>(false);
  const [showMinutesModal, setShowMinutesModal] = useState<boolean>(false);
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [reconcileAccepted, setReconcileAccepted] = useState<boolean>(false);

  // Editable Cell state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const selectedSession = stockCountings.find(s => s.id === activeSessionId) || stockCountings[0];

  // Auto-focus barcode reader input when session changes or stage changes
  useEffect(() => {
    if (selectedSession && selectedSession.status !== 'Applied' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedSession?.id, currentStage]);

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
          filteredItemsList = [];
        }
      }
    }

    let tagCounter = 1001;
    const whItems: StockCountingItem[] = filteredItemsList.map(it => {
      const sysQty = inventory
        .filter(inv => inv.itemId === it.id && inv.warehouseId === newWhId)
        .reduce((sum, curr) => sum + curr.quantity, 0);

      return {
        itemId: it.id,
        itemCode: it.code,
        itemName: it.name,
        barcode: it.barcode || it.code,
        systemQuantity: sysQty,
        firstCount: undefined,
        secondCount: undefined,
        thirdCount: undefined,
        finalCount: undefined,
        physicalQuantity: 0, 
        variance: -sysQty,
        difference: -sysQty,
        unit: it.unit,
        locationInRack: it.locationInRack || 'نامشخص',
        tagNumber: `TAG-${tagCounter++}`,
        unitPrice: it.price || 0,
      };
    });

    const sessionNum = `SC-${Date.now().toString().slice(-6)}`;
    const filterDesc = selectedFilterType === 'All' 
      ? 'کل انبار' 
      : `${selectedFilterType === 'Group' ? 'دسته' : selectedFilterType === 'Location' ? 'قفسه' : 'پروژه'}: ${selectedFilterValue}`;

    const whName = warehouses.find(w => w.id === newWhId)?.name || newWhId;

    createStockCountingSession({
      sessionNumber: sessionNum,
      title: sessionTitleInput || `انبارگردانی دوره ای ${whName} (${filterDesc})`,
      warehouseId: newWhId,
      warehouseName: whName,
      startDate: new Date().toLocaleDateString('fa-IR'),
      registeredBy: currentUser.fullName,
      status: 'InCounting',
      items: whItems,
      notes: notesInput || `دوره انبارگردانی فیلتر شده بر اساس ${filterDesc}`,
      filterType: selectedFilterType,
      filterValue: selectedFilterValue,
      countingStage: 1,
      isBlindCount: isBlindCountInitial,
      committeeMembers: [
        { name: currentUser.fullName, role: 'سرپرست انبار / ثبت‌کننده', signed: true, signedAt: new Date().toLocaleDateString('fa-IR') },
        { name: 'مدیریت کنترل کیفی و ممیزی', role: 'نماینده ناظر', signed: false },
        { name: 'مدیریت امور مالی و حسابداری', role: 'حسابرس داخلی', signed: false }
      ]
    });

    setShowCreateModal(false);
    setSessionTitleInput('');
    setNotesInput('');
    setSelectedFilterValue('');
    setSelectedFilterType('All');
    setIsBlindCountInitial(false);
  };

  // Handle Quick Barcode / Serial Scan Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || selectedSession.status === 'Applied' || !barcodeInput.trim()) return;

    const scannedText = barcodeInput.trim();
    // Look up item inside session items (by barcode, itemCode, or tagNumber)
    const foundItemIndex = selectedSession.items.findIndex(
      it => it.itemCode.toLowerCase() === scannedText.toLowerCase() || 
            (it.barcode && it.barcode.toLowerCase() === scannedText.toLowerCase()) ||
            (it.tagNumber && it.tagNumber.toLowerCase() === scannedText.toLowerCase())
    );

    if (foundItemIndex !== -1) {
      const foundItem = selectedSession.items[foundItemIndex];
      const curFirst = foundItem.firstCount ?? 0;
      const curSecond = foundItem.secondCount ?? 0;
      const curThird = foundItem.thirdCount ?? 0;

      let newFirst = foundItem.firstCount;
      let newSecond = foundItem.secondCount;
      let newThird = foundItem.thirdCount;
      let newFinal = foundItem.finalCount;

      const increment = Number(scanQty) || 1;

      if (currentStage === 1) {
        newFirst = (newFirst ?? 0) + increment;
        newFinal = newFirst;
      } else if (currentStage === 2) {
        newSecond = (newSecond ?? 0) + increment;
        newFinal = newSecond;
      } else if (currentStage === 3) {
        newThird = (newThird ?? 0) + increment;
        newFinal = newThird;
      } else {
        newFinal = (newFinal ?? 0) + increment;
      }

      updateStockCountItem(
        selectedSession.id,
        foundItem.itemId,
        newFinal ?? 0,
        foundItem.notes,
        newFirst,
        newSecond,
        newFinal,
        newThird,
        foundItem.tagNumber
      );

      setScanMessage({
        text: `✅ ${foundItem.itemName} (${foundItem.itemCode}): شمارش مرحله ${currentStage} به میزان +${increment} افزایش یافت.`,
        type: 'success'
      });
      setBarcodeInput('');
    } else {
      setScanMessage({
        text: `⚠️ کالایی با بارکد / کد / تگ "${scannedText}" در این دوره انبارگردانی یافت نشد.`,
        type: 'error'
      });
    }

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Toggle Blind Count mode on existing session
  const handleToggleBlindCount = () => {
    if (!selectedSession) return;
    const nextState = !selectedSession.isBlindCount;
    updateStockCountingSession(selectedSession.id, { isBlindCount: nextState });
  };

  // Batch action: Set all final counts to Count 1, Count 2, or Average
  const handleSetGlobalFinalBasis = (basis: 'first' | 'second' | 'matched') => {
    if (!selectedSession || selectedSession.status === 'Applied') return;

    selectedSession.items.forEach(it => {
      let finalVal = it.finalCount;
      if (basis === 'first') {
        finalVal = it.firstCount ?? 0;
      } else if (basis === 'second') {
        finalVal = it.secondCount ?? 0;
      } else if (basis === 'matched') {
        // If first and second match, use it; otherwise if third count exists use third, else first
        if (it.firstCount !== undefined && it.secondCount !== undefined && it.firstCount === it.secondCount) {
          finalVal = it.firstCount;
        } else if (it.thirdCount !== undefined) {
          finalVal = it.thirdCount;
        } else {
          finalVal = it.secondCount ?? it.firstCount ?? 0;
        }
      }

      updateStockCountItem(
        selectedSession.id,
        it.itemId,
        finalVal ?? 0,
        it.notes,
        it.firstCount,
        it.secondCount,
        finalVal,
        it.thirdCount,
        it.tagNumber
      );
    });

    setScanMessage({
      text: `مبنای شمارش نهایی بر اساس ${basis === 'first' ? 'شمارش اول' : basis === 'second' ? 'شمارش دوم' : 'تطبیق هوشمند شمارش‌ها'} با موفقیت تنظیم شد.`,
      type: 'info'
    });
  };

  // Statistics Calculation
  const totalItemsCount = selectedSession?.items.length || 0;
  
  const countedItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => it.firstCount !== undefined || it.secondCount !== undefined || it.finalCount !== undefined);
  }, [selectedSession]);

  const uncountedItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => it.firstCount === undefined && it.secondCount === undefined && it.finalCount === undefined);
  }, [selectedSession]);

  const surplusItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => {
      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : 0);
      return (it.firstCount !== undefined || it.finalCount !== undefined) && (final - it.systemQuantity > 0);
    });
  }, [selectedSession]);

  const deficitItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => {
      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : 0);
      return (it.firstCount !== undefined || it.finalCount !== undefined) && (final - it.systemQuantity < 0);
    });
  }, [selectedSession]);

  const matchedItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => {
      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : 0);
      return (it.firstCount !== undefined || it.finalCount !== undefined) && (final - it.systemQuantity === 0);
    });
  }, [selectedSession]);

  const countMismatchItems = useMemo(() => {
    if (!selectedSession) return [];
    return selectedSession.items.filter(it => 
      it.firstCount !== undefined && it.secondCount !== undefined && it.firstCount !== it.secondCount
    );
  }, [selectedSession]);

  // Discrepancy valuations
  const totalDeficitValue = useMemo(() => {
    return deficitItems.reduce((sum, it) => {
      const final = it.finalCount ?? it.firstCount ?? 0;
      const diff = Math.abs(final - it.systemQuantity);
      const price = it.unitPrice || items.find(i => i.id === it.itemId)?.price || 0;
      return sum + (diff * price);
    }, 0);
  }, [deficitItems, items]);

  const totalSurplusValue = useMemo(() => {
    return surplusItems.reduce((sum, it) => {
      const final = it.finalCount ?? it.firstCount ?? 0;
      const diff = final - it.systemQuantity;
      const price = it.unitPrice || items.find(i => i.id === it.itemId)?.price || 0;
      return sum + (diff * price);
    }, 0);
  }, [surplusItems, items]);

  // Inventory Accuracy Rate %
  const accuracyRate = totalItemsCount > 0 
    ? Math.round(((matchedItems.length) / Math.max(1, countedItems.length)) * 100) 
    : 100;

  // Filtered session items
  const filteredSessionItems = useMemo(() => {
    if (!selectedSession) return [];

    return selectedSession.items.filter(it => {
      // Text Search
      const searchMatch = 
        it.itemName.toLowerCase().includes(filterText.toLowerCase()) ||
        it.itemCode.toLowerCase().includes(filterText.toLowerCase()) ||
        (it.tagNumber && it.tagNumber.toLowerCase().includes(filterText.toLowerCase())) ||
        (it.locationInRack && it.locationInRack.toLowerCase().includes(filterText.toLowerCase()));

      if (!searchMatch) return false;

      // Group Filter
      if (groupFilter !== 'all') {
        const itemObj = items.find(i => i.id === it.itemId);
        if (itemObj && itemObj.group !== groupFilter) return false;
      }

      // Tab filter
      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : 0);
      const isCounted = it.firstCount !== undefined || it.secondCount !== undefined || it.finalCount !== undefined;
      const diff = final - it.systemQuantity;

      if (activeTabFilter === 'discrepant') return isCounted && diff !== 0;
      if (activeTabFilter === 'deficit') return isCounted && diff < 0;
      if (activeTabFilter === 'surplus') return isCounted && diff > 0;
      if (activeTabFilter === 'matched') return isCounted && diff === 0;
      if (activeTabFilter === 'uncounted') return !isCounted;

      return true;
    });
  }, [selectedSession, filterText, groupFilter, activeTabFilter, items]);

  // Export Comprehensive CSV
  const handleExportCSV = () => {
    if (!selectedSession) return;

    const headers = [
      'ردیف',
      'شماره تگ',
      'کد کالا',
      'نام و شرح کالا',
      'واحد سنجش',
      'موقعیت قفسه/انبار',
      'موجودی سیستمی',
      'شمارش اول',
      'شمارش دوم',
      'شمارش سوم/داوری',
      'مبنای نهایی شمارش',
      'مغایرت مقداری (+/-)',
      'وضعیت مغایرت',
      ...(userCanViewPrice ? ['نرخ واحد (ریال)', 'ارزش ریالی مغایرت (ریال)'] : []),
      'یادداشت بازرس'
    ];

    const rows = selectedSession.items.map((it, idx) => {
      const first = it.firstCount !== undefined ? it.firstCount : '';
      const second = it.secondCount !== undefined ? it.secondCount : '';
      const third = it.thirdCount !== undefined ? it.thirdCount : '';
      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : '');
      const diffNumber = typeof final === 'number' ? final - it.systemQuantity : null;
      
      let statusText = 'شمارش نشده';
      if (diffNumber !== null) {
        if (diffNumber === 0) statusText = 'منطبق';
        else if (diffNumber < 0) statusText = `کسری (${Math.abs(diffNumber)})`;
        else statusText = `مازاد (+${diffNumber})`;
      }

      const price = it.unitPrice || items.find(i => i.id === it.itemId)?.price || 0;
      const valDiff = diffNumber !== null ? diffNumber * price : 0;

      return [
        idx + 1,
        it.tagNumber || `TAG-${1000 + idx + 1}`,
        it.itemCode,
        it.itemName,
        it.unit,
        it.locationInRack || 'نامشخص',
        it.systemQuantity,
        first,
        second,
        third,
        final,
        diffNumber !== null ? diffNumber : '',
        statusText,
        ...(userCanViewPrice ? [price, valDiff] : []),
        it.notes || ''
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `صورت-انبارگردانی-${selectedSession.sessionNumber}-${selectedSession.warehouseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Final Correction Document
  const handlePostCorrectionDocument = () => {
    if (!selectedSession || selectedSession.status === 'Applied') return;
    applyStockCountingAdjustments(selectedSession.id);
    setShowReconcileModal(false);
    setReconcileAccepted(false);
  };

  return (
    <div id="stock-counting-view" className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SESSION SELECTOR BAR */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                انبارگردانی و مغایرت‌گیری پیشرفته
              </h2>
              {selectedSession && (
                <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                  selectedSession.status === 'Applied' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : selectedSession.status === 'PendingReview'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                }`}>
                  {selectedSession.status === 'Applied' ? 'سند تعدیل صادر شده ✅' : selectedSession.status === 'PendingReview' ? 'در انتظار تایید ممیزی' : 'در حال شمارش فعال ⏱️'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              مدیریت دوره‌های شمارش ۳ مرحله‌ای، داوری مغایرت، چاپ تگ پالت و صدور اسناد تعدیل کسری و مازاد
            </p>
          </div>
        </div>

        {/* Sessions Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {stockCountings.length > 0 && (
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs max-w-[200px] truncate"
            >
              {stockCountings.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sessionNumber} - {s.warehouseName}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>دوره جدید</span>
          </button>

          {selectedSession && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowTagsModal(true)}
                className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title="چاپ تگ‌های ۳ تکه‌ای انبارگردانی"
              >
                <Tag className="w-4 h-4 text-purple-600" />
              </button>
              <button
                onClick={() => setShowMinutesModal(true)}
                className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title="چاپ صورت‌جلسه رسمی انبارگردانی"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
              </button>
              <button
                onClick={handleExportCSV}
                className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title="خروجی اکسل / CSV"
              >
                <Download className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedSession ? (
        <>
          {/* ========================================================================= */}
          {/* 2. INDUSTRIAL KPI SUMMARY CARDS & DISCREPANCY VALUATION */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            
            {/* Total Items */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>کل اقلام دوره</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-slate-900 font-mono">
                {totalItemsCount} <span className="text-xs text-slate-400 font-normal">قلم</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                انبار: <span className="text-indigo-600">{selectedSession.warehouseName}</span>
              </div>
            </div>

            {/* Counted Progress */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>پیشرفت شمارش</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-emerald-600 font-mono">
                {countedItems.length} <span className="text-xs text-slate-400 font-normal">از {totalItemsCount}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalItemsCount > 0 ? (countedItems.length / totalItemsCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Inventory Accuracy Rate % */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>دقت موجودی (صحت)</span>
                <Percent className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-cyan-600 font-mono">
                {accuracyRate}%
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                {matchedItems.length} قلم کاملاً منطبق
              </div>
            </div>

            {/* Deficit Items / کسر انبار */}
            <div className="bg-white/80 backdrop-blur-md border border-rose-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs bg-rose-50/20">
              <div className="flex items-center justify-between text-rose-500 text-xs font-bold mb-1">
                <span>اقلام کسری</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-rose-600 font-mono">
                {deficitItems.length} <span className="text-xs text-rose-400 font-normal">قلم</span>
              </div>
              {userCanViewPrice && (
                <div className="text-[10px] text-rose-700 font-black truncate mt-1">
                  ارزش: {formatCurrency(totalDeficitValue)}
                </div>
              )}
            </div>

            {/* Surplus Items / اضافه انبار */}
            <div className="bg-white/80 backdrop-blur-md border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold mb-1">
                <span>اقلام مازاد</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-amber-600 font-mono">
                {surplusItems.length} <span className="text-xs text-amber-400 font-normal">قلم</span>
              </div>
              {userCanViewPrice && (
                <div className="text-[10px] text-amber-700 font-black truncate mt-1">
                  ارزش: {formatCurrency(totalSurplusValue)}
                </div>
              )}
            </div>

            {/* Discrepancy Mismatches between Count 1 & Count 2 */}
            <div className="bg-white/80 backdrop-blur-md border border-purple-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs bg-purple-50/20">
              <div className="flex items-center justify-between text-purple-600 text-xs font-bold mb-1">
                <span>اختلاف شمارش ۱ و ۲</span>
                <Scale className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-base sm:text-xl font-black text-purple-700 font-mono">
                {countMismatchItems.length} <span className="text-xs text-purple-400 font-normal">قلم</span>
              </div>
              <div className="text-[10px] text-purple-600 font-bold mt-1">
                نیاز به داوری / شمارش سوم
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 3. MULTI-STAGE CONTROL & FAST BARCODE ENTRY TOOLBAR */}
          {/* ========================================================================= */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-4">
            
            {/* Stage Selector Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto text-xs font-black custom-scrollbar">
                <button
                  onClick={() => setCurrentStage(1)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    currentStage === 1 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">۱</span>
                  <span>شمارش اول (تیم الف)</span>
                </button>

                <button
                  onClick={() => setCurrentStage(2)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    currentStage === 2 
                      ? 'bg-purple-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">۲</span>
                  <span>شمارش دوم (تیم ب)</span>
                </button>

                <button
                  onClick={() => setCurrentStage(3)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    currentStage === 3 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">۳</span>
                  <span>شمارش سوم / داوری ممیزی</span>
                  {countMismatchItems.length > 0 && (
                    <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                      {countMismatchItems.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCurrentStage(4)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    currentStage === 4 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>تطبیق نهایی و صدور اسناد</span>
                </button>
              </div>

              {/* Blind Counting Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleBlindCount}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    selectedSession.isBlindCount
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="در حالت شمارش کور، موجودی سیستم از شمارشگران پنهان می‌شود تا از خطای عمدی یا سوگیری جلوگیری گردد."
                >
                  {selectedSession.isBlindCount ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{selectedSession.isBlindCount ? 'حالت شمارش کور (پنهان‌سازی سیستم)' : 'شمارش عادی'}</span>
                </button>
              </div>

            </div>

            {/* Fast Barcode & Serial Scanner Input */}
            {selectedSession.status !== 'Applied' && (
              <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Barcode className="w-4 h-4 text-indigo-500 absolute right-3 top-2.5" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder={`اسکن بارکد، کد کالا یا شماره تگ برای ثبت در «شمارش ${currentStage === 1 ? 'اول' : currentStage === 2 ? 'دوم' : currentStage === 3 ? 'سوم/داوری' : 'نهایی'}»...`}
                    className="w-full text-xs font-bold pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                  />
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => setBarcodeInput('')}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-500">تعداد:</span>
                    <input
                      type="number"
                      min="1"
                      value={scanQty}
                      onChange={(e) => setScanQty(Number(e.target.value))}
                      className="w-12 text-xs font-black text-center bg-transparent border-0 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت شمارش</span>
                  </button>
                </div>
              </form>
            )}

            {/* Scan Notification Message */}
            {scanMessage && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
                scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                scanMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}>
                <span>{scanMessage.text}</span>
                <button onClick={() => setScanMessage(null)} className="p-1 hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* 4. FILTER TABS & SEARCH CONTROLS */}
          {/* ========================================================================= */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              
              {/* Category / Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-100/90 rounded-xl text-xs font-black custom-scrollbar">
                <button
                  onClick={() => setActiveTabFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه اقلام ({totalItemsCount})
                </button>
                <button
                  onClick={() => setActiveTabFilter('discrepant')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'discrepant' ? 'bg-white text-rose-600 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  دارای مغایرت ({deficitItems.length + surplusItems.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('deficit')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'deficit' ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  کسری انبار ({deficitItems.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('surplus')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'surplus' ? 'bg-white text-amber-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  مازاد انبار ({surplusItems.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('matched')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'matched' ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  کاملاً منطبق ({matchedItems.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('uncounted')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTabFilter === 'uncounted' ? 'bg-white text-slate-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  شمارش نشده ({uncountedItems.length})
                </button>
              </div>

              {/* Fast Basis Actions */}
              {selectedSession.status !== 'Applied' && (
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleSetGlobalFinalBasis('matched')}
                    className="text-[11px] font-bold px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                    title="تطبیق خودکار اقلام بدون مغایرت بین شمارش ۱ و ۲"
                  >
                    تطبیق هوشمند
                  </button>
                  <button
                    onClick={() => handleSetGlobalFinalBasis('first')}
                    className="text-[11px] font-bold px-2.5 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    مبنا = شمارش ۱
                  </button>
                  <button
                    onClick={() => handleSetGlobalFinalBasis('second')}
                    className="text-[11px] font-bold px-2.5 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    مبنا = شمارش ۲
                  </button>
                </div>
              )}

            </div>

            {/* Search Input & Item Groups Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="جستجوی نام کالا، کد، تگ یا محل قفسه..."
                  className="w-full text-xs font-bold pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
                {filterText && (
                  <button onClick={() => setFilterText('')} className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {itemGroups.length > 0 && (
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full sm:w-48 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">همه دسته‌بندی‌ها</option>
                  {itemGroups.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 5. COMPREHENSIVE INDUSTRIAL COUNTING TABLE */}
          {/* ========================================================================= */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-extrabold select-none">
                    <th className="py-3 px-3 w-12 text-center">ردیف</th>
                    <th className="py-3 px-3">شماره تگ</th>
                    <th className="py-3 px-3">کد کالا</th>
                    <th className="py-3 px-3 min-w-[180px]">نام و مشخصات کالا</th>
                    <th className="py-3 px-3">قفسه / راهرو</th>
                    <th className="py-3 px-3 text-center bg-slate-100/50">
                      موجودی سیستم
                    </th>
                    <th className="py-3 px-3 text-center bg-indigo-50/40 text-indigo-900">
                      شمارش اول
                    </th>
                    <th className="py-3 px-3 text-center bg-purple-50/40 text-purple-900">
                      شمارش دوم
                    </th>
                    <th className="py-3 px-3 text-center bg-amber-50/40 text-amber-900">
                      داوری / شمارش ۳
                    </th>
                    <th className="py-3 px-3 text-center bg-slate-900 text-white font-black">
                      مبنای نهایی
                    </th>
                    <th className="py-3 px-3 text-center">مغایرت (+/-)</th>
                    {userCanViewPrice && (
                      <>
                        <th className="py-3 px-3 text-left">فی واحد (ریال)</th>
                        <th className="py-3 px-3 text-left">ارزش مغایرت</th>
                      </>
                    )}
                    <th className="py-3 px-3 text-center">وضعیت</th>
                    <th className="py-3 px-3 min-w-[120px]">یادداشت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredSessionItems.length === 0 ? (
                    <tr>
                      <td colSpan={userCanViewPrice ? 14 : 12} className="py-12 text-center text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertTriangle className="w-8 h-8 text-slate-300" />
                          <span>هیچ کالایی مطابق با فیلترهای انتخابی یافت نشد.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSessionItems.map((it, idx) => {
                      const first = it.firstCount;
                      const second = it.secondCount;
                      const third = it.thirdCount;
                      const final = it.finalCount !== undefined ? it.finalCount : (it.firstCount !== undefined ? it.firstCount : 0);
                      const isCounted = it.firstCount !== undefined || it.secondCount !== undefined || it.finalCount !== undefined;
                      const diff = final - it.systemQuantity;
                      const price = it.unitPrice || items.find(i => i.id === it.itemId)?.price || 0;
                      const varianceValue = diff * price;

                      const isMismatch = first !== undefined && second !== undefined && first !== second;

                      return (
                        <tr 
                          key={it.itemId} 
                          className={`hover:bg-slate-50/70 transition-colors ${
                            diff < 0 ? 'bg-rose-50/15' : diff > 0 ? 'bg-amber-50/15' : ''
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Tag Number */}
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200">
                              {it.tagNumber || `TAG-${1000 + idx + 1}`}
                            </span>
                          </td>

                          {/* Item Code */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 font-bold">
                            {it.itemCode}
                          </td>

                          {/* Item Name */}
                          <td className="py-2.5 px-3">
                            <div className="font-black text-slate-900 leading-tight">
                              {it.itemName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              واحد: <span className="text-slate-600">{it.unit}</span>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {it.locationInRack || '—'}
                          </td>

                          {/* System Quantity (Masked if Blind Count) */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold bg-slate-100/30">
                            {selectedSession.isBlindCount && selectedSession.status !== 'Applied' ? (
                              <span className="text-slate-400 flex items-center justify-center gap-1 text-[11px]">
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span>محرمانه</span>
                              </span>
                            ) : (
                              <span className="text-slate-700">{it.systemQuantity}</span>
                            )}
                          </td>

                          {/* First Count (Editable) */}
                          <td className="py-2.5 px-3 text-center bg-indigo-50/20">
                            {selectedSession.status === 'Applied' ? (
                              <span className="font-mono font-bold text-indigo-900">{first ?? '—'}</span>
                            ) : (
                              <input
                                type="number"
                                value={first !== undefined ? first : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateStockCountItem(
                                    selectedSession.id, 
                                    it.itemId, 
                                    final, 
                                    it.notes, 
                                    val, 
                                    second, 
                                    final,
                                    third,
                                    it.tagNumber
                                  );
                                }}
                                placeholder="—"
                                className="w-16 text-center text-xs font-mono font-black py-1 bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
                              />
                            )}
                          </td>

                          {/* Second Count (Editable) */}
                          <td className="py-2.5 px-3 text-center bg-purple-50/20">
                            {selectedSession.status === 'Applied' ? (
                              <span className="font-mono font-bold text-purple-900">{second ?? '—'}</span>
                            ) : (
                              <input
                                type="number"
                                value={second !== undefined ? second : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateStockCountItem(
                                    selectedSession.id, 
                                    it.itemId, 
                                    final, 
                                    it.notes, 
                                    first, 
                                    val, 
                                    final,
                                    third,
                                    it.tagNumber
                                  );
                                }}
                                placeholder="—"
                                className="w-16 text-center text-xs font-mono font-black py-1 bg-white border border-purple-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-2xs"
                              />
                            )}
                          </td>

                          {/* Third Count / Arbitration */}
                          <td className="py-2.5 px-3 text-center bg-amber-50/20">
                            {selectedSession.status === 'Applied' ? (
                              <span className="font-mono font-bold text-amber-900">{third ?? '—'}</span>
                            ) : (
                              <input
                                type="number"
                                value={third !== undefined ? third : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateStockCountItem(
                                    selectedSession.id, 
                                    it.itemId, 
                                    val ?? final, 
                                    it.notes, 
                                    first, 
                                    second, 
                                    val ?? final,
                                    val,
                                    it.tagNumber
                                  );
                                }}
                                placeholder={isMismatch ? 'داوری' : '—'}
                                className={`w-16 text-center text-xs font-mono font-black py-1 bg-white border rounded-lg focus:outline-hidden shadow-2xs ${
                                  isMismatch ? 'border-amber-400 bg-amber-50/40 text-amber-900' : 'border-slate-200'
                                }`}
                              />
                            )}
                          </td>

                          {/* Final Basis Count (Editable) */}
                          <td className="py-2.5 px-3 text-center bg-slate-900/5">
                            {selectedSession.status === 'Applied' ? (
                              <span className="font-mono font-black text-slate-900 text-sm">{final}</span>
                            ) : (
                              <input
                                type="number"
                                value={it.finalCount !== undefined ? it.finalCount : (first !== undefined ? first : '')}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  updateStockCountItem(
                                    selectedSession.id, 
                                    it.itemId, 
                                    val, 
                                    it.notes, 
                                    first, 
                                    second, 
                                    val,
                                    third,
                                    it.tagNumber
                                  );
                                }}
                                placeholder="مبنا"
                                className="w-18 text-center text-xs font-mono font-black py-1.5 bg-white border-2 border-slate-900 text-slate-900 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-xs"
                              />
                            )}
                          </td>

                          {/* Variance */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {!isCounted ? (
                              <span className="text-slate-400 text-[11px]">شمارش نشده</span>
                            ) : diff === 0 ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                0
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-black">
                                {diff}
                              </span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-black">
                                +{diff}
                              </span>
                            )}
                          </td>

                          {/* Price & Valuation (Only if userCanViewPrice) */}
                          {userCanViewPrice && (
                            <>
                              <td className="py-2.5 px-3 text-left font-mono text-[11px] text-slate-600">
                                {formatCurrency(price)}
                              </td>
                              <td className="py-2.5 px-3 text-left font-mono text-[11px] font-bold">
                                {!isCounted || diff === 0 ? (
                                  <span className="text-slate-400">—</span>
                                ) : diff < 0 ? (
                                  <span className="text-rose-600">{formatCurrency(varianceValue)}</span>
                                ) : (
                                  <span className="text-amber-600">+{formatCurrency(varianceValue)}</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {!isCounted ? (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                در انتظار
                              </span>
                            ) : diff === 0 ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">
                                منطبق ✅
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-black">
                                کسری ⚠️
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black">
                                مازاد 📦
                              </span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={it.notes || ''}
                              onChange={(e) => {
                                updateStockCountItem(
                                  selectedSession.id,
                                  it.itemId,
                                  final,
                                  e.target.value,
                                  first,
                                  second,
                                  final,
                                  third,
                                  it.tagNumber
                                );
                              }}
                              placeholder="توضیحات..."
                              className="w-full text-[11px] px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded-lg transition-colors"
                            />
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600 font-bold flex-wrap">
                <span>نمایش {filteredSessionItems.length} از {totalItemsCount} ردیف</span>
                <span>•</span>
                <span className="text-emerald-700">{matchedItems.length} قلم منطبق</span>
                <span>•</span>
                <span className="text-rose-700">{deficitItems.length} قلم کسری</span>
                <span>•</span>
                <span className="text-amber-700">{surplusItems.length} قلم مازاد</span>
              </div>

              {selectedSession.status !== 'Applied' ? (
                <button
                  onClick={() => setShowReconcileModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white rounded-xl font-black shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>تایید نهایی و صدور اسناد تعدیل انبار</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-800 font-black bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>اسناد تعدیل و اصلاح موجودی کاردکس اعمال گردیده است</span>
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">هیچ دوره انبارگردانی تعریف نشده است</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            برای شروع شمارش فیزیکی، استخراج موجودی سیستمی و تطبیق انبار روی دکمه زیر کلیک نمایید.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد اولین دوره انبارگردانی</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: CREATE NEW COUNTING SESSION */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>تعریف دوره جدید انبارگردانی</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان دوره انبارگردانی:</label>
                <input
                  type="text"
                  value={sessionTitleInput}
                  onChange={(e) => setSessionTitleInput(e.target.value)}
                  placeholder="مثال: انبارگردانی پایان سال ۱۴۰۴ انبار مرکزی"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">انبار هدف:</label>
                <select
                  value={newWhId}
                  onChange={(e) => setNewWhId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs cursor-pointer"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">محدوده انبارگردانی:</label>
                  <select
                    value={selectedFilterType}
                    onChange={(e) => {
                      setSelectedFilterType(e.target.value as any);
                      setSelectedFilterValue('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs cursor-pointer"
                  >
                    <option value="All">تمام اقلام انبار</option>
                    <option value="Group">بر اساس گروه کالا</option>
                    <option value="Location">بر اساس راهرو / قفسه</option>
                    <option value="Project">بر اساس پروژه تولید</option>
                  </select>
                </div>

                {selectedFilterType !== 'All' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">انتخاب فیلتر:</label>
                    {selectedFilterType === 'Group' ? (
                      <select
                        value={selectedFilterValue}
                        onChange={(e) => setSelectedFilterValue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                      >
                        <option value="">انتخاب دسته...</option>
                        {itemGroups.map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    ) : selectedFilterType === 'Project' ? (
                      <select
                        value={selectedFilterValue}
                        onChange={(e) => setSelectedFilterValue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                      >
                        <option value="">انتخاب پروژه...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedFilterValue}
                        onChange={(e) => setSelectedFilterValue(e.target.value)}
                        placeholder="مثال: RACK-A"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Blind count checkbox */}
              <label className="flex items-center gap-2.5 p-3 bg-amber-50/60 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBlindCountInitial}
                  onChange={(e) => setIsBlindCountInitial(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-bold text-amber-900 text-xs">
                  فعال‌سازی شمارش کور (Blind Count) جهت ممانعت از سوگیری شمارشگران
                </span>
              </label>

              <div>
                <label className="block text-slate-700 font-bold mb-1">یادداشت و توضیحات:</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={2}
                  placeholder="دستورالعمل‌ها یا نکات ممیزی..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  ایجاد دوره و استخراج کاردکس
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: PRINT 3-PART INDUSTRIAL COUNTING TAGS */}
      {/* ========================================================================= */}
      {showTagsModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                <span>برگه‌های استاندارد تگ ۳ تکه‌ای انبارگردانی ({selectedSession.sessionNumber})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ تگ‌ها</span>
                </button>
                <button 
                  onClick={() => setShowTagsModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar p-2">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                تگ‌های ۳ تکه‌ای استاندارد را پرینت کرده و روی پالت‌ها یا قفسه‌های انبار بچسبانید. شمارشگر اول تکه اول را جدا کرده، شمارشگر دوم تکه دوم را جدا می‌کند و تگ اصلی روی کالا باقی می‌ماند.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSession.items.slice(0, 20).map((it, idx) => (
                  <div key={it.itemId} className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/50 space-y-3 relative">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{companyName || 'انبار هوشمند'}</div>
                        <div className="font-black text-slate-900 text-xs">{selectedSession.warehouseName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-purple-700 text-sm">{it.tagNumber || `TAG-${1000 + idx + 1}`}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{it.itemCode}</div>
                      </div>
                    </div>

                    <div className="font-black text-slate-800 text-xs">{it.itemName}</div>
                    <div className="text-[10px] text-slate-500">قفسه: <span className="font-bold">{it.locationInRack || '—'}</span> | واحد: <span className="font-bold">{it.unit}</span></div>

                    {/* 3 Tag Cuts */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-slate-300 text-[10px]">
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                        <div className="font-bold text-indigo-900">تکه ۱ (شمارش اول)</div>
                        <div className="mt-2 text-slate-400 font-mono">تعداد: ______</div>
                        <div className="text-slate-400 mt-1">امضا: ______</div>
                      </div>
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-center">
                        <div className="font-bold text-purple-900">تکه ۲ (شمارش دوم)</div>
                        <div className="mt-2 text-slate-400 font-mono">تعداد: ______</div>
                        <div className="text-slate-400 mt-1">امضا: ______</div>
                      </div>
                      <div className="p-2 bg-slate-100 border border-slate-300 rounded-xl text-center">
                        <div className="font-bold text-slate-800">تگ اصلی پالت</div>
                        <div className="mt-2 text-slate-500 font-mono">نهایی: ______</div>
                        <div className="text-slate-500 mt-1">داور: ______</div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: OFFICIAL AUDIT MINUTES PRINT */}
      {/* ========================================================================= */}
      {showMinutesModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-indigo-600" />
                <span>صورت‌جلسه رسمی هیئت انبارگردانی ({selectedSession.sessionNumber})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ رسمی صورتجلسه</span>
                </button>
                <button 
                  onClick={() => setShowMinutesModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-800 leading-relaxed custom-scrollbar p-2">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="font-black text-base text-slate-900">{companyName || 'مجموعه تولیدی و صنعتی'}</h2>
                <h4 className="font-bold text-slate-600 text-xs mt-0.5">صورت‌جلسه نهایی شمارش فیزیکی و ممیزی موجودی انبارها</h4>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">شماره صورتجلسه: {selectedSession.sessionNumber} | تاریخ: {selectedSession.startDate}</p>
              </div>

              <p>
                پیرو دستور مدیریت محترم، عملیات شمارش فیزیکی موجودی در <strong>{selectedSession.warehouseName}</strong> با نظارت هیئت انبارگردانی و ممیزی داخلی به پایان رسید. نتایج حاصله به شرح آمار زیر است:
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="text-slate-500 block text-[11px]">کل ردیف‌های شمارش شده:</span>
                  <span className="font-black text-sm text-slate-900 font-mono">{totalItemsCount} قلم</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ردیف‌های کاملاً منطبق:</span>
                  <span className="font-black text-sm text-emerald-600 font-mono">{matchedItems.length} قلم</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">درصد صحت انبار:</span>
                  <span className="font-black text-sm text-indigo-600 font-mono">{accuracyRate}%</span>
                </div>
              </div>

              {userCanViewPrice && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span className="text-rose-700 font-bold">مجموع ارزش ریالی اقلام کسری:</span>
                    <span className="font-mono font-bold text-rose-800">{formatCurrency(totalDeficitValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">مجموع ارزش ریالی اقلام مازاد:</span>
                    <span className="font-mono font-bold text-amber-800">{formatCurrency(totalSurplusValue)}</span>
                  </div>
                </div>
              )}

              {/* Committee Signatures */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-black text-slate-900 text-xs">سرپرست انبار</div>
                  <div className="text-[10px] text-slate-500 mt-1">{currentUser.fullName}</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-4">امضا شده الکترونیک ✔️</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-black text-slate-900 text-xs">نماینده حسابرسی و مالی</div>
                  <div className="text-[10px] text-slate-400 mt-1">مدیریت مالی</div>
                  <div className="text-[10px] text-slate-400 mt-4">محل مهر و امضا</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-black text-slate-900 text-xs">مدیر کارخانه / تولید</div>
                  <div className="text-[10px] text-slate-400 mt-1">مدیریت عامل</div>
                  <div className="text-[10px] text-slate-400 mt-4">محل مهر و امضا</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: POST RECONCILIATION CORRECTION DOCUMENT */}
      {/* ========================================================================= */}
      {showReconcileModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-300 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>ثبت قطعی سند تعدیل انبارگردانی ({selectedSession.sessionNumber})</span>
              </h3>
              <button 
                onClick={() => setShowReconcileModal(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800 text-xs">هشدار سیستمی مهم</h4>
                  <p className="mt-1 text-amber-700 leading-relaxed font-medium">
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
                      const final = it.finalCount ?? it.firstCount ?? it.physicalQuantity;
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
                      const final = it.finalCount ?? it.firstCount ?? it.physicalQuantity;
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
                className={`px-5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-xs cursor-pointer ${
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
