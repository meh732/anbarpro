import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Item } from '../types';
import { SvgBarcode } from './SvgBarcode';
import { 
  X, Printer, Barcode, CheckSquare, Square, Layers, Search, 
  Settings2, Sliders, Filter, Eye, Hash, MapPin, Building2, 
  Check, RefreshCw, AlertCircle, Sparkles, LayoutGrid, List
} from 'lucide-react';

interface BatchBarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedGroup?: string;
  initialSelectedItems?: Item[];
}

export type PaperLayout = 'roll' | 'a4-3col' | 'a4-2col' | 'a4-4col' | 'list';
export type QuantityMode = 'single' | 'stock' | 'custom';

export const BatchBarcodePrintModal: React.FC<BatchBarcodePrintModalProps> = ({
  isOpen,
  onClose,
  initialSelectedGroup,
  initialSelectedItems
}) => {
  const { items, itemGroups, inventory, companyName, language } = useApp();
  const isFa = language === 'fa';

  // 1. Group Selection States
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  
  // 2. Item Filtering & Specific Overrides
  const [selectedItemType, setSelectedItemType] = useState<string>('ALL');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

  // 3. Print Layout & Sizing
  const [paperLayout, setPaperLayout] = useState<PaperLayout>('a4-3col');
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('single');
  const [customCopies, setCustomCopies] = useState<number>(1);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(42);

  // 4. Label Content Toggles
  const [showCompany, setShowCompany] = useState<boolean>(true);
  const [showName, setShowName] = useState<boolean>(true);
  const [showCode, setShowCode] = useState<boolean>(true);
  const [showBarcodeNum, setShowBarcodeNum] = useState<boolean>(true);
  const [showGroup, setShowGroup] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(false);

  // 5. Active tab in modal (Config & Groups vs Live Preview)
  const [modalTab, setModalTab] = useState<'config' | 'preview'>('preview');

  // Compute all available unique groups from database
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    itemGroups.forEach(g => {
      if (g.name) set.add(g.name);
    });
    items.forEach(i => {
      if (i.group) set.add(i.group);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [itemGroups, items]);

  // Group item count lookup
  const groupStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allGroups.forEach(g => {
      stats[g] = items.filter(i => i.group === g).length;
    });
    return stats;
  }, [allGroups, items]);

  // Initialize selected groups
  useEffect(() => {
    if (!isOpen) return;

    if (initialSelectedItems && initialSelectedItems.length > 0) {
      // If opened with specific pre-selected items
      const groupsFromItems = Array.from(new Set(initialSelectedItems.map(i => i.group).filter(Boolean)));
      setSelectedGroups(groupsFromItems.length > 0 ? groupsFromItems : (allGroups.slice(0, 1)));
      setExcludedItemIds([]);
    } else if (initialSelectedGroup && initialSelectedGroup !== 'ALL') {
      setSelectedGroups([initialSelectedGroup]);
      setExcludedItemIds([]);
    } else if (selectedGroups.length === 0 && allGroups.length > 0) {
      // Default: select the first group or first 2 groups
      setSelectedGroups(allGroups.slice(0, 2));
      setExcludedItemIds([]);
    }
  }, [isOpen, initialSelectedGroup, initialSelectedItems, allGroups]);

  // Filtered groups in search
  const visibleGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return allGroups;
    const q = groupSearchQuery.trim().toLowerCase();
    return allGroups.filter(g => g.toLowerCase().includes(q));
  }, [allGroups, groupSearchQuery]);

  // Toggle single group
  const handleToggleGroup = (grp: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(grp)) {
        return prev.filter(g => g !== grp);
      } else {
        return [...prev, grp];
      }
    });
  };

  // Select all groups
  const handleSelectAllGroups = () => {
    setSelectedGroups([...allGroups]);
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

  // Resolved candidate items from selected groups
  const matchedItems = useMemo(() => {
    return items.filter(item => {
      // Must match one of the selected groups
      if (!selectedGroups.includes(item.group)) {
        return false;
      }
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
  }, [items, selectedGroups, selectedItemType, onlyInStock, itemSearchQuery, inventory]);

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

  // Calculate total labels generated
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

  // Execute print
  const handleTriggerPrint = () => {
    document.body.classList.add('printing-batch-barcodes');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-batch-barcodes');
      }, 1000);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static batch-barcode-modal-wrapper"
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
                <span>چاپ گروهی بارکد کالاها</span>
                <span className="text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  {selectedGroups.length} گروه انتخاب شده
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                انتخاب همزمان یک یا چند گروه کالایی، تنظیم ابعاد و چاپ پشت‌سرهم بارکدها برای انبارداری و چسباندن روی کالاها
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
          {/* LEFT/RIGHT SIDEBAR: GROUP SELECTION & PRINT CONFIGURATION               */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`w-full lg:w-96 shrink-0 bg-slate-50/80 p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar border-l border-slate-200 print:hidden ${modalTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            
            {/* Quick Status Pill */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-bold">آماده پرینت:</span>
              </div>
              <div className="font-extrabold font-mono text-indigo-700 bg-white px-2.5 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                {itemsToPrint.length} کالا | {printableEntries.length} برچسب
              </div>
            </div>

            {/* Group Selection Block */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>انتخاب گروه‌های کالایی:</span>
                </label>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAllGroups}
                    className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    انتخاب همه
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllGroups}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    لغو همه
                  </button>
                </div>
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
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 custom-scrollbar">
                {visibleGroups.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    گروهی با این نام یافت نشد.
                  </div>
                ) : (
                  visibleGroups.map(grpName => {
                    const isChecked = selectedGroups.includes(grpName);
                    const count = groupStats[grpName] || 0;
                    return (
                      <div
                        key={grpName}
                        onClick={() => handleToggleGroup(grpName)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-bold shadow-2xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate max-w-[170px]">{grpName}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count} کالا
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Item Type & Stock Filter */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>فیلترهای تکمیلی:</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">نوع کالا:</label>
                  <select
                    value={selectedItemType}
                    onChange={(e) => setSelectedItemType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl text-[11px] p-1.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="ALL">همه انواع</option>
                    <option value="RawMaterial">مواد اولیه</option>
                    <option value="Component">قطعات الکترونیک</option>
                    <option value="SemiFinished">نیمه‌ساخته</option>
                    <option value="Finished">محصول نهایی</option>
                    <option value="Consumable">مصرفی</option>
                    <option value="Tool">ابزار و تجهیزات</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">وضعیت موجودی:</label>
                  <button
                    type="button"
                    onClick={() => setOnlyInStock(!onlyInStock)}
                    className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                      onlyInStock 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {onlyInStock ? '✓ فقط اقلام دارای موجودی' : 'همه اقلام (صفر و مثبت)'}
                  </button>
                </div>
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
                    پرینتر لیبل‌زن (Zebra, Xprinter)
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
                      ? 'bg-indigo-600 text-white border-indigo-600'
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
                      ? 'bg-indigo-600 text-white border-indigo-600'
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
                      ? 'bg-indigo-600 text-white border-indigo-600'
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
                  <span className="text-slate-400">گروه‌های منتخب: </span>
                  <span className="font-extrabold text-indigo-700">
                    {selectedGroups.length > 0 ? selectedGroups.join('، ') : 'هیچ گروهی انتخاب نشده'}
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
                  لطفاً حداقل یک گروه کالایی که دارای کالا است را از منوی سمت راست انتخاب نمایید یا فیلترهای تکمیلی را بررسی کنید.
                </p>
                <button
                  type="button"
                  onClick={handleSelectAllGroups}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  انتخاب همه گروه‌ها ({allGroups.length} گروه)
                </button>
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
              </div>
            )}

            {/* Print Help Tooltip */}
            <div className="w-full max-w-4xl mt-4 p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-700">راهنمای چاپ بی‌نقص:</span>
                <span>در دیالوگ پرینت مرورگر، گزینه <b>Margins</b> را روی <b>None</b> یا <b>Minimum</b> و چک‌باکس <b>Background Graphics</b> را فعال کنید.</span>
              </div>
              <div className="font-mono font-bold text-indigo-700">
                {printableEntries.length} برچسب در صف چاپ
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
