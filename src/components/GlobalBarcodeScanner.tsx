import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, AlertTriangle, QrCode, Search, Printer, 
  ArrowDownUp, ClipboardList, PlusCircle, X, ExternalLink,
  Volume2, ShieldCheck, Cpu
} from 'lucide-react';
import { Item } from '../types';

export const GlobalBarcodeScanner: React.FC = () => {
  const { 
    items, 
    inventory, 
    warehouses, 
    setActiveTab, 
    setSearchQuery,
    isScannerOpen,
    setIsScannerOpen,
    soundEnabled
  } = useApp();

  const [scannedResult, setScannedResult] = useState<{
    code: string;
    item: Item | null;
    totalStock: number;
    timestamp: number;
  } | null>(null);

  const [scanPulse, setScanPulse] = useState(false);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Play warehouse-grade audio beep on successful scan
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);

      osc.start();
      osc.stop(ctx.currentTime + 0.08); // 80ms tone
    } catch {
      // Ignore audio context errors
    }
  };

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let isFastTyping = false;
    let fastKeyCount = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in a standard modal input UNLESS it is a barcode scan burst
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode scanners typically send keys with < 50ms interval
      if (diff > 120) {
        buffer = '';
        isFastTyping = false;
        fastKeyCount = 0;
      } else {
        fastKeyCount++;
        if (fastKeyCount >= 2) {
          isFastTyping = true;
        }
      }

      if (e.key === 'Enter') {
        const trimmed = buffer.trim();
        // If it was a fast burst or buffer has sufficient length outside normal typing
        if (trimmed.length >= 3 && (isFastTyping || !isInput)) {
          e.preventDefault();
          e.stopPropagation();

          playBeep();
          setScanPulse(true);
          setTimeout(() => setScanPulse(false), 800);

          // Find item in database
          const found = items.find(
            it => it.barcode === trimmed || it.code.toLowerCase() === trimmed.toLowerCase()
          ) || null;

          // Calculate total stock across warehouses
          const totalStock = found 
            ? inventory.filter(inv => inv.itemId === found.id).reduce((sum, curr) => sum + curr.quantity, 0)
            : 0;

          setScannedResult({
            code: trimmed,
            item: found,
            totalStock,
            timestamp: Date.now()
          });

          // Auto-hide card after 14 seconds
          if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
          autoHideTimeoutRef.current = setTimeout(() => {
            setScannedResult(null);
          }, 14000);

          buffer = '';
          isFastTyping = false;
          fastKeyCount = 0;
        } else {
          buffer = '';
          isFastTyping = false;
          fastKeyCount = 0;
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
  }, [items, inventory, soundEnabled]);

  if (!scannedResult) return null;

  const { code, item, totalStock } = scannedResult;

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fadeIn select-none pointer-events-auto">
      <div className={`p-4 rounded-3xl shadow-2xl border backdrop-blur-xl transition-all ${
        item 
          ? 'bg-white/95 text-slate-900 border-emerald-300 ring-2 ring-emerald-500/20' 
          : 'bg-white/95 text-slate-900 border-amber-300 ring-2 ring-amber-500/20'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              item ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <QrCode className={`w-4 h-4 ${scanPulse ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900">اسکن لحظه‌ای بارکدخوان فیزیکی</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  سخت‌افزار USB/وایرلس
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                بارکد: <span className="font-bold text-slate-700">{code}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setScannedResult(null)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="بستن اعلان"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {item ? (
          <div className="py-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-indigo-950 leading-tight">{item.name}</h4>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  کد کالا: <span className="font-mono font-bold text-slate-800">{item.code}</span> | گروه: <span className="font-medium text-slate-700">{item.group}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                موجود در انبار
              </span>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">موجودی کل:</span>
                <span className="font-black font-mono text-slate-900">{totalStock} {item.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">قیمت واحد:</span>
                <span className="font-black font-mono text-slate-900">{item.unitPrice.toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/50">
                <span className="text-slate-500">موقعیت قفسه:</span>
                <span className="font-black text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  {item.locationInRack || 'ثبت نشده'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => {
                  setSearchQuery(item.code);
                  setActiveTab('items');
                  setScannedResult(null);
                }}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>مشاهده کالا</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('stock_movement');
                  setScannedResult(null);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>ثبت ورود/خروج</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('kardex');
                  setScannedResult(null);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                <span>کاردکس</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-2.5 text-right">
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div className="text-xs">
                <span className="font-black">کالایی با این بارکد یافت نشد!</span>
                <p className="text-[10px] text-amber-800 mt-0.5">بارکد به درستی اسکن شد اما در لیست قطعات و کالاها ثبت نیست.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => {
                  setSearchQuery(code);
                  setActiveTab('items');
                  setScannedResult(null);
                }}
                className="flex-1 p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تعریف کالای جدید با این بارکد</span>
              </button>
              <button
                onClick={() => {
                  setIsScannerOpen(true);
                  setScannedResult(null);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تنظیمات بارکدخوان
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
