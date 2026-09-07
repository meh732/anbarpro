import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Item } from '../types';
import { SvgBarcode } from './SvgBarcode';
import { exportElementToPdf } from '../utils/pdfExport';
import { 
  X, Printer, Barcode, CheckSquare, Square, Layers, Search, 
  Settings2, Sliders, Filter, Eye, Hash, MapPin, Building2, 
  Check, RefreshCw, AlertCircle, Sparkles, LayoutGrid, List,
  ArrowUpDown, CheckCircle2, Boxes, Tag, FileDown, Loader2
} from 'lucide-react';

interface BatchBarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedGroup?: string;
  initialSelectedItems?: Item[];
}

export type PaperLayout = 'roll' | 'a4-3col' | 'a4-2col' | 'a4-4col' | 'list';
export type QuantityMode = 'single' | 'stock' | 'custom';
export type SortOrder = 'group' | 'code' | 'name' | 'rack';

export const BatchBarcodePrintModal: React.FC<BatchBarcodePrintModalProps> = ({
  isOpen,
  onClose,
  initialSelectedGroup,
  initialSelectedItems
}) => {
  const { items, itemGroups, inventory, companyName, language } = useApp();
  const isFa = language === 'fa';

  // 1. Selection Source: 'groups' or 'selectedItems'
  const [sourceMode, setSourceMode] = useState<'groups' | 'selectedItems'>('groups');

  // 2. Group Selection States
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  
  // 3. Item Filtering & Specific Overrides
  const [selectedItemType, setSelectedItemType] = useState<string>('ALL');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOrder>('group');

  // 4. Print Layout & Sizing
  const [paperLayout, setPaperLayout] = useState<PaperLayout>('a4-3col');
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('single');
  const [customCopies, setCustomCopies] = useState<number>(1);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(42);

  // 5. Label Content Toggles
  const [showCompany, setShowCompany] = useState<boolean>(true);
  const [showName, setShowName] = useState<boolean>(true);
  const [showCode, setShowCode] = useState<boolean>(true);
  const [showBarcodeNum, setShowBarcodeNum] = useState<boolean>(true);
  const [showGroup, setShowGroup] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(false);
  const [showGroupSeparators, setShowGroupSeparators] = useState<boolean>(true);

  // 6. Active tab in modal (Config & Groups vs Live Preview)
  const [modalTab, setModalTab] = useState<'config' | 'preview'>('preview');

  // Compute all available unique groups from database (including groups and distinct subgroups)
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    itemGroups.forEach(g => {
      if (g.name) set.add(g.name);
    });
    items.forEach(i => {
      if (i.group) set.add(i.group);
      if (i.subGroup && i.subGroup !== 'عمومی') set.add(i.subGroup);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [itemGroups, items]);

  // Group item count & stock statistics lookup
  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; inStock: number }> = {};
    allGroups.forEach(g => {
      const groupItems = items.filter(i => i.group === g || i.subGroup === g);
      const inStockCount = groupItems.filter(i => {
        const stock = inventory.filter(inv => inv.itemId === i.id).reduce((s, c) => s + c.quantity, 0);
        return stock > 0;
      }).length;
      stats[g] = { total: groupItems.length, inStock: inStockCount };
    });
    return stats;
  }, [allGroups, items, inventory]);

  // Initialize selected groups or selected items when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialSelectedItems && initialSelectedItems.length > 0) {
      setSourceMode('selectedItems');
      const groupsFromItems = Array.from(new Set(initialSelectedItems.map(i => i.group).filter(Boolean)));
      setSelectedGroups(groupsFromItems.length > 0 ? groupsFromItems : allGroups.slice(0, 2));
      setExcludedItemIds([]);
    } else if (initialSelectedGroup && initialSelectedGroup !== 'ALL') {
      setSourceMode('groups');
      setSelectedGroups([initialSelectedGroup]);
      setExcludedItemIds([]);
    } else if (selectedGroups.length === 0 && allGroups.length > 0) {
      setSourceMode('groups');
      // Default: select the first 2 groups or all if small
      setSelectedGroups(allGroups.length <= 4 ? [...allGroups] : allGroups.slice(0, 3));
      setExcludedItemIds([]);
    }
  }, [isOpen, initialSelectedGroup, initialSelectedItems, allGroups]);

  // Filtered groups in search
  const visibleGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return allGroups;
    const q = groupSearchQuery.trim().toLowerCase();
    return allGroups.filter(g => g.toLowerCase().includes(q));
  }, [allGroups, groupSearchQuery]);

  // Toggle single group in selection
  const handleToggleGroup = (grp: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(grp)) {
        return prev.filter(g => g !== grp);
      } else {
        return [...prev, grp];
      }
    });
  };

  // Solo select group (select only this one group)
  const handleSelectSoloGroup = (grp: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedGroups([grp]);
  };

  // Select all groups
  const handleSelectAllGroups = () => {
    setSelectedGroups([...allGroups]);
  };

  // Select only groups with available stock
  const handleSelectInStockGroups = () => {
    const inStockGroups = allGroups.filter(g => (groupStats[g]?.inStock || 0) > 0);
    setSelectedGroups(inStockGroups.length > 0 ? inStockGroups : [...allGroups]);
  };

  // Deselect all groups
  const handleDeselectAllGroups = () => {
    setSelectedGroups([]);
  };

  // Get total stock helper for an item
  const getItemTotalStock = (itemId: string): number => {
    return inventory
      .filter(inv => inv.itemId === itemId)
      .reduce((sum, current) => sum + current.quantity, 0);
  };

  // Resolved candidate items from selected groups or selectedItems
  const matchedItems = useMemo(() => {
    let list: Item[] = [];

    if (sourceMode === 'selectedItems' && initialSelectedItems && initialSelectedItems.length > 0) {
      list = [...initialSelectedItems];
    } else {
      list = items.filter(item => {
        // Matches item.group or item.subGroup
        const matchesGroup = selectedGroups.includes(item.group) || 
                             (item.subGroup && selectedGroups.includes(item.subGroup));
        return matchesGroup;
      });
    }

    // Secondary filters
    list = list.filter(item => {
      // Item Type filter
      if (selectedItemType !== 'ALL' && item.itemType !== selectedItemType) {
        return false;
      }
      // Only in stock filter
      if (onlyInStock && getItemTotalStock(item.id) <= 0) {
        return false;
      }
      // Search filter inside items
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.trim().toLowerCase();
        const codeMatch = (item.code || '').toLowerCase().includes(q);
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const barcodeMatch = (item.barcode || '').toLowerCase().includes(q);
        const rackMatch = (item.locationInRack || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !barcodeMatch && !rackMatch) return false;
      }
      return true;
    });

    // Sequential Sort Order
    list.sort((a, b) => {
      if (sortBy === 'group') {
        const gA = a.group || '';
        const gB = b.group || '';
        if (gA !== gB) return gA.localeCompare(gB, 'fa');
        return (a.code || '').localeCompare(b.code || '');
      } else if (sortBy === 'code') {
        return (a.code || '').localeCompare(b.code || '');
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'fa');
      } else if (sortBy === 'rack') {
        const rA = a.locationInRack || '';
        const rB = b.locationInRack || '';
        return rA.localeCompare(rB);
      }
      return 0;
    });

    return list;
  }, [items, sourceMode, initialSelectedItems, selectedGroups, selectedItemType, onlyInStock, itemSearchQuery, inventory, sortBy]);

  // Final items to print (excluding any explicitly unselected items)
  const itemsToPrint = useMemo(() => {
    return matchedItems.filter(item => !excludedItemIds.includes(item.id));
  }, [matchedItems, excludedItemIds]);

  // Toggle individual item exclusion
  const handleToggleExcludeItem = (itemId: string) => {
    setExcludedItemIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Calculate total labels generated with copies
  const printableEntries = useMemo(() => {
    const list: Array<{ item: Item; copyIndex: number; totalCopies: number }> = [];
    itemsToPrint.forEach(item => {
      let count = 1;
      if (quantityMode === 'stock') {
        const stock = getItemTotalStock(item.id);
        count = stock > 0 ? Math.floor(stock) : 1;
      } else if (quantityMode === 'custom') {
        count = Math.max(1, customCopies);
      }

      for (let c = 1; c <= count; c++) {
        list.push({ item, copyIndex: c, totalCopies: count });
      }
    });
    return list;
  }, [itemsToPrint, quantityMode, customCopies, inventory]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Execute PDF export directly without print dialog
  const handleExportPdf = async () => {
    if (printableEntries.length === 0) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('printable-batch-barcodes', {
        filename: `batch-barcodes-${new Date().toISOString().substring(0, 10)}.pdf`,
        orientation: 'portrait',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Automatically keep printing classes active on body while this modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-batch-barcodes', 'printing-modal');
      return () => {
        document.body.classList.remove('printing-batch-barcodes', 'printing-modal');
      };
    }
  }, [isOpen]);

  // Execute print cleanly
  const handleTriggerPrint = () => {
    document.body.classList.add('printing-batch-barcodes', 'printing-modal');
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print-portal-modal batch-barcode-modal-wrapper"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none print:w-full border border-slate-200">
        
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER & CONTROLS (Hidden during actual print) */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>چاپ همزمان بارکد گروه‌های کالا</span>
                <span className="text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                  {sourceMode === 'selectedItems' 
                    ? `${itemsToPrint.length} کالای انتخابی` 
                    : `${selectedGroups.length} گروه انتخابی`}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                چاپ پشت‌سرهم بارکدها برای یک یا چندین گروه کالایی با چیدمان رولی (حرارتی)، A4 شبکه‌ای یا فهرست کاتالوگ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalTab('config')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === 'config' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تنظیم گروه‌ها و فیلترها</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === 'preview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش آماده چاپ ({printableEntries.length})</span>
              </button>
            </div>

            {/* Direct PDF Export */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={printableEntries.length === 0 || isExportingPdf}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
              title="دانلود فایل PDF بارکدها"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{isExportingPdf ? 'تولید PDF...' : 'خروجی PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={printableEntries.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>ارسال به پرینتر ({printableEntries.length} لیبل)</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MODAL BODY (Two-Column or Tabbed Layout) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 print:overflow-visible print:block print:p-0">
          
          {/* ----------------------------------------------------------------------- */}
          {/* SIDEBAR: GROUP SELECTION & PRINT CONFIGURATION                          */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`w-full lg:w-96 shrink-0 bg-slate-50/80 p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar border-l border-slate-200 print:hidden ${modalTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            
            {/* Quick Status Pill */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-bold">آمار چاپ پشت‌سرهم:</span>
              </div>
              <div className="font-extrabold font-mono text-indigo-700 bg-white px-2.5 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                {itemsToPrint.length} کالا | {printableEntries.length} برچسب
              </div>
            </div>

            {/* Selection Source Switcher (if initialSelectedItems is available) */}
            {initialSelectedItems && initialSelectedItems.length > 0 && (
              <div className="bg-white p-2 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600">منبع بارکدها:</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSourceMode('selectedItems')}
                    className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                      sourceMode === 'selectedItems' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    کالاهای انتخابی ({initialSelectedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('groups')}
                    className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                      sourceMode === 'groups' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    انتخاب گروه‌ها ({allGroups.length})
                  </button>
                </div>
              </div>
            )}

            {/* Group Selection Block (when sourceMode is 'groups') */}
            {sourceMode === 'groups' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>انتخاب همزمان گروه‌های کالا:</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {selectedGroups.length} از {allGroups.length} گروه
                  </span>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAllGroups}
                    className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors cursor-pointer"
                  >
                    همه گروه‌ها
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectInStockGroups}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                    title="فقط گروه‌هایی که حداقل یک کالا با موجودی دارند"
                  >
                    گروه‌های دارای موجودی
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllGroups}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  >
                    لغو همه
                  </button>
                </div>

                {/* Group Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="جستجو در نام گروه‌ها..."
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>

                {/* Groups Checkbox List */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 p-1 custom-scrollbar border border-slate-200 rounded-2xl bg-white">
                  {visibleGroups.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      گروهی با این نام یافت نشد.
                    </div>
                  ) : (
                    visibleGroups.map(grpName => {
                      const isChecked = selectedGroups.includes(grpName);
                      const stats = groupStats[grpName] || { total: 0, inStock: 0 };
                      return (
                        <div
                          key={grpName}
                          onClick={() => handleToggleGroup(grpName)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all group ${
                            isChecked 
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-bold shadow-2xs' 
                              : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Handled by parent div
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                            />
                            <span className="truncate max-w-[150px]">{grpName}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Solo Quick Button */}
                            <button
                              type="button"
                              onClick={(e) => handleSelectSoloGroup(grpName, e)}
                              title={`فقط انتخاب گروه "${grpName}"`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                            >
                              فقط این
                            </button>

                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {stats.total} کالا
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Sorting & Sequential Order */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>ترتیب چاپ پشت‌سرهم بارکدها:</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSortBy('group')}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    sortBy === 'group'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  دسته‌بندی به گروه
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rack')}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    sortBy === 'rack'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="مرتب‌شده بر اساس موقعیت قفسه فیزیکی برای الصاق آسان روی کالاها"
                >
                  به ترتیب قفسه انبار
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('code')}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    sortBy === 'code'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  به ترتیب کد کالا
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('name')}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    sortBy === 'name'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  به ترتیب نام کالا
                </button>
              </div>
            </div>

            {/* Layout & Paper Format */}
            <div className="space-y-2.5 border-t border-slate-200 pt-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-indigo-600" />
                <span>قطع و چیدمان برگه چاپ:</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaperLayout('roll')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    paperLayout === 'roll'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs">لیبل رولی (حرارتی)</div>
                  <div className={`text-[10px] mt-0.5 ${paperLayout === 'roll' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    پیوسته پشت سر هم (Zebra, Xprinter)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperLayout('a4-3col')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    paperLayout === 'a4-3col'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs">برگه A4 (۳ ستونه)</div>
                  <div className={`text-[10px] mt-0.5 ${paperLayout === 'a4-3col' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    ۲۴ برچسب استاندارد در صفحه
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperLayout('a4-2col')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    paperLayout === 'a4-2col'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs">برگه A4 (۲ ستونه)</div>
                  <div className={`text-[10px] mt-0.5 ${paperLayout === 'a4-2col' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    ۱۲ برچسب بزرگ برای کارتن
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperLayout('a4-4col')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    paperLayout === 'a4-4col'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs">برگه A4 (۴ ستونه)</div>
                  <div className={`text-[10px] mt-0.5 ${paperLayout === 'a4-4col' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    ۳۲ برچسب ریز قطعات SMD
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperLayout('list')}
                  className={`col-span-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    paperLayout === 'list'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5" />
                    <span>فهرست خطی پشت‌سرهم (انبارگردانی و کاتالوگ اسکن)</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Copies & Quantity Multiplier */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>تیراژ چاپ هر بارکد:</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setQuantityMode('single')}
                  className={`p-1.5 rounded-lg border text-center cursor-pointer transition-all ${
                    quantityMode === 'single'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ۱ عدد از هر کالا
                </button>
                <button
                  type="button"
                  onClick={() => setQuantityMode('stock')}
                  className={`p-1.5 rounded-lg border text-center cursor-pointer transition-all ${
                    quantityMode === 'stock'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  به تعداد موجودی
                </button>
                <button
                  type="button"
                  onClick={() => setQuantityMode('custom')}
                  className={`p-1.5 rounded-lg border text-center cursor-pointer transition-all ${
                    quantityMode === 'custom'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  تعداد دلخواه
                </button>
              </div>

              {quantityMode === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-600 font-bold">تعداد برچسب برای هر کالا:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={customCopies}
                    onChange={(e) => setCustomCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-white border border-slate-300 rounded-lg p-1 text-center font-bold font-mono text-xs text-indigo-700"
                  />
                  <span className="text-xs text-slate-400">نسخه</span>
                </div>
              )}
            </div>

            {/* Label Elements Toggles */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                <span>اطلاعات مندرج روی برچسب:</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showCompany}
                    onChange={(e) => setShowCompany(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>سربرگ نام شرکت</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(e) => setShowName(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>نام کالا و قطعه</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showCode}
                    onChange={(e) => setShowCode(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>کد شناسایی کالا</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showGroup}
                    onChange={(e) => setShowGroup(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>نام گروه کالا</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showLocation}
                    onChange={(e) => setShowLocation(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>موقعیت قفسه فیزیکی</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>قیمت واحد</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none col-span-2">
                  <input
                    type="checkbox"
                    checked={showGroupSeparators}
                    onChange={(e) => setShowGroupSeparators(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>سربرگ تفکیک گروه در چاپ A4</span>
                </label>
              </div>

              {/* Barcode Height Slider */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold text-[11px]">ارتفاع میله‌های بارکد:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBarcodeHeight(30)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${barcodeHeight === 30 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    کوچک
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeHeight(42)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${barcodeHeight === 42 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    متوسط
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeHeight(56)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${barcodeHeight === 56 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    بلند
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* MAIN AREA: LIVE PREVIEW & PRINT SHEET                                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex-1 p-4 sm:p-6 bg-slate-100/70 overflow-y-auto custom-scrollbar flex flex-col items-center print:bg-white print:p-0 print:overflow-visible">
            
            {/* Top Bar inside preview */}
            <div className="w-full max-w-4xl mb-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-700">
                  <span className="text-slate-400">گروه‌های منتخب برای چاپ: </span>
                  <span className="font-extrabold text-indigo-700">
                    {sourceMode === 'selectedItems' 
                      ? `${itemsToPrint.length} کالای برگزیده` 
                      : (selectedGroups.length > 0 ? selectedGroups.join('، ') : 'هیچ گروهی انتخاب نشده')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={printableEntries.length === 0}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>شروع پرینت ({printableEntries.length} عدد)</span>
                </button>
              </div>
            </div>

            {/* Empty State warning */}
            {printableEntries.length === 0 ? (
              <div className="my-auto py-16 text-center space-y-3 bg-white p-8 rounded-3xl border border-slate-200 max-w-md shadow-sm">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">هیچ کالایی برای چاپ یافت نشد</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  لطفاً حداقل یک گروه کالایی که دارای کالا است را از پنل انتخاب گروه‌ها تیک بزنید یا فیلترهای نوع کالا و موجودی را بررسی کنید.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSelectAllGroups}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    انتخاب تمام {allGroups.length} گروه
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('ALL');
                      setOnlyInStock(false);
                      setExcludedItemIds([]);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    ریست فیلترها
                  </button>
                </div>
              </div>
            ) : (
              /* THE ACTUAL PRINTABLE SHEET CONTAINER */
              <div 
                id="printable-batch-barcodes"
                className={`w-full max-w-4xl bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 print:rounded-none print:w-full ${
                  paperLayout === 'roll' ? 'max-w-md mx-auto' : ''
                }`}
              >
                {/* Visual Label Grid based on Paper Layout */}
                {paperLayout === 'list' ? (
                  /* Continuous List Format */
                  <div className="divide-y divide-slate-200 border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white p-2.5 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        <span>فهرست بارکدهای پیوسته کالاها ({printableEntries.length} قلم)</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-300">تاریخ: {new Date().toLocaleDateString('fa-IR')}</span>
                    </div>

                    {printableEntries.map(({ item, copyIndex, totalCopies }, idx) => {
                      const barcodeVal = item.barcode || item.code;
                      return (
                        <div 
                          key={`${item.id}-${copyIndex}-${idx}`}
                          className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-4 print:p-2 print:border-b print:border-slate-300"
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                                {item.code}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span>گروه: <b>{item.group}</b></span>
                              {item.locationInRack && <span>قفسه: <b className="text-amber-700">{item.locationInRack}</b></span>}
                              {totalCopies > 1 && <span className="font-mono text-indigo-600">نسخه {copyIndex}/{totalCopies}</span>}
                            </div>
                          </div>

                          <div className="flex flex-col items-center shrink-0">
                            <SvgBarcode
                              code={barcodeVal}
                              height={32}
                              maxSvgWidth={180}
                              showText={false}
                            />
                            <div className="font-mono text-[10px] font-bold text-slate-800 mt-0.5">
                              *{barcodeVal}*
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Standard Grids & Roll Layout */
                  <div className={
                    paperLayout === 'roll'
                      ? 'space-y-4 print:space-y-0'
                      : paperLayout === 'a4-2col'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2'
                      : paperLayout === 'a4-4col'
                      ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1'
                      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2'
                  }>
                    {printableEntries.map(({ item, copyIndex, totalCopies }, idx) => {
                      const barcodeVal = item.barcode || item.code;
                      const isRoll = paperLayout === 'roll';
                      const isCompact = paperLayout === 'a4-4col';

                      return (
                        <div
                          key={`${item.id}-${copyIndex}-${idx}`}
                          className={`bg-white border border-slate-300 rounded-xl p-2.5 flex flex-col justify-between text-center select-none print:border-slate-800 print:rounded-lg ${
                            isRoll 
                              ? 'barcode-roll-label p-4 min-h-[140px] max-w-[280px] mx-auto border-2 border-slate-800 my-2 print:my-0' 
                              : 'barcode-grid-label hover:border-indigo-400 transition-colors'
                          }`}
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          {/* Company Header */}
                          {showCompany && (
                            <div className="text-[9px] sm:text-[10px] font-black text-slate-800 tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
                              <span className="truncate max-w-[150px]">{companyName}</span>
                              {totalCopies > 1 && (
                                <span className="font-mono text-[9px] text-slate-400 font-bold">
                                  {copyIndex}/{totalCopies}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="py-1 space-y-0.5">
                            {showName && (
                              <div className={`font-black text-slate-900 leading-tight truncate ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                                {item.name}
                              </div>
                            )}

                            <div className="flex items-center justify-center gap-2 flex-wrap text-[10px]">
                              {showCode && (
                                <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 print:border-slate-400 print:bg-white print:text-black">
                                  {item.code}
                                </span>
                              )}
                              {showGroup && (
                                <span className="text-slate-500 font-medium truncate max-w-[90px]">
                                  {item.group}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* High-Precision SVG Barcode */}
                          <div className="my-1.5 flex justify-center w-full px-1">
                            <SvgBarcode
                              code={barcodeVal}
                              height={isCompact ? 28 : barcodeHeight}
                              maxSvgWidth={isCompact ? 160 : 210}
                              showText={false}
                            />
                          </div>

                          {/* Barcode Numbers and Metadata Footer */}
                          <div className="space-y-1">
                            {showBarcodeNum && (
                              <div className="font-mono text-[10px] sm:text-[11px] font-black tracking-widest text-slate-900">
                                *{barcodeVal}*
                              </div>
                            )}

                            {/* Footer details (Location & Price) */}
                            {(showLocation || showPrice) && (
                              <div className="flex items-center justify-between text-[9px] pt-1 border-t border-dashed border-slate-200 print:border-slate-400">
                                {showLocation && (
                                  <div className="text-amber-800 font-bold flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <span>قفسه: {item.locationInRack || 'نامشخص'}</span>
                                  </div>
                                )}
                                {showPrice && (
                                  <div className="font-mono font-bold text-slate-700">
                                    {(item.unitPrice || 0).toLocaleString('fa-IR')} ت
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Print Help Tooltip */}
            <div className="w-full max-w-4xl mt-4 p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-700">راهنمای چاپ بدون حاشیه اضافه:</span>
                <span>در پنجره پرینت، Margins را روی <b>None</b> یا <b>Minimum</b> و تیک <b>Background Graphics</b> را فعال کنید.</span>
              </div>
              <div className="font-mono font-bold text-indigo-700">
                {printableEntries.length} برچسب در صف پرینت
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
