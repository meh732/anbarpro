import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  QrCode, X, Camera, Search, Printer, CheckCircle2, Box, RefreshCw, 
  AlertCircle, Sparkles, Sliders, ArrowRight, Usb, Cpu, Zap, Wifi, 
  Volume2, VolumeX, ShieldCheck, Check, Settings, Laptop, Smartphone, 
  HelpCircle, ArrowDownUp, ClipboardList, PlusCircle, Filter, FileDown, Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { DEFAULT_BARCODE_SCANNERS, BarcodeScannerProfile } from '../data/barcodeScannerProfiles';
import { SvgBarcode } from './SvgBarcode';
import { exportElementToPdf } from '../utils/pdfExport';

export const BarcodeModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { 
    isScannerOpen, 
    setIsScannerOpen, 
    items, 
    inventory,
    setActiveTab, 
    setSearchQuery, 
    language,
    soundEnabled,
    setSoundEnabled
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'hardware' | 'camera' | 'print'>('hardware');
  const [scannedCode, setScannedCode] = useState('');
  const [scanDiagnostics, setScanDiagnostics] = useState<{
    latencyMs: number;
    terminator: string;
    charCount: number;
    detectedAt: string;
  } | null>(null);

  const [selectedItemForPrint, setSelectedItemForPrint] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [scannerSearchQuery, setScannerSearchQuery] = useState<string>('');

  // WebHID USB Hardware State
  const [connectedHidDevices, setConnectedHidDevices] = useState<any[]>([]);
  const [hidStatusMessage, setHidStatusMessage] = useState<string | null>(null);

  // Mobile Camera Scan States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);

  const isFa = language === 'fa';
  const hardwareInputRef = useRef<HTMLInputElement>(null);

  // Play standard warehouse-grade barcode scanner beep sound
  const playBeepSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1350, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.09);
    } catch (e) {
      console.error("Audio feedback error:", e);
    }
  };

  // Keyboard Wedge capture for the modal
  useEffect(() => {
    if (!isScannerOpen) return;
    let buffer = '';
    let lastKeyTime = Date.now();
    let intervals: number[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (diff > 150) {
        buffer = '';
        intervals = [];
      } else {
        intervals.push(diff);
      }

      if (e.key === 'Enter') {
        const trimmed = buffer.trim();
        if (trimmed.length >= 3) {
          e.preventDefault();
          playBeepSound();
          setScannedCode(trimmed);

          // Calculate average typing latency to diagnose scanner vs human
          const avgLatency = intervals.length > 0
            ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
            : 20;

          setScanDiagnostics({
            latencyMs: avgLatency,
            terminator: 'Enter (CR/LF)',
            charCount: trimmed.length,
            detectedAt: new Date().toLocaleTimeString('fa-IR')
          });

          buffer = '';
          intervals = [];
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isScannerOpen, soundEnabled]);

  // Check already connected WebHID devices on mount
  useEffect(() => {
    if ((navigator as any).hid) {
      (navigator as any).hid.getDevices().then((devices: any[]) => {
        if (devices && devices.length > 0) {
          setConnectedHidDevices(devices);
        }
      }).catch(() => {});
    }
  }, []);

  // Request direct USB WebHID device pairing
  const handleConnectWebHID = async () => {
    if (!(navigator as any).hid) {
      setHidStatusMessage('مرورگر شما از WebHID مستقیم پشتیبانی نمی‌کند، اما پروتکل فراگیر کیبوردی فعال است و بارکدخوان شما بدون نیاز به درایور درجا کار می‌کند.');
      setTimeout(() => setHidStatusMessage(null), 6000);
      return;
    }

    try {
      setHidStatusMessage('در حال فراخوانی پورت‌های USB...');
      const requestedDevices = await (navigator as any).hid.requestDevice({
        filters: [] // Allow user to select any connected USB barcode scanner
      });

      if (requestedDevices && requestedDevices.length > 0) {
        setConnectedHidDevices(prev => {
          const combined = [...prev, ...requestedDevices];
          return Array.from(new Set(combined.map(d => d.productId + '_' + d.vendorId)))
            .map(id => combined.find(d => (d.productId + '_' + d.vendorId) === id));
        });
        setHidStatusMessage(`دستگاه «${requestedDevices[0].productName || 'بارکدخوان USB'}» با موفقیت شناسایی و متصل شد!`);
        setTimeout(() => setHidStatusMessage(null), 4000);
      } else {
        setHidStatusMessage('هیچ دستگاه جدیدی انتخاب نشد.');
        setTimeout(() => setHidStatusMessage(null), 3000);
      }
    } catch (err: any) {
      console.warn("WebHID request cancelled or failed:", err);
      setHidStatusMessage('درخواست اتصال مستقیم USB لغو شد یا در دسترس نیست. سیستم کیبوردی فعال است.');
      setTimeout(() => setHidStatusMessage(null), 4000);
    }
  };

  // Camera scanner initialization using html5-qrcode
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (activeSubTab === 'camera' && isCameraActive) {
      setCameraError(null);
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') || 
              d.label.toLowerCase().includes('rear')
            );
            const initialCamId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(initialCamId);

            html5QrCode = new Html5Qrcode("camera-scanner-viewport");
            setScannerInstance(html5QrCode);

            html5QrCode.start(
              initialCamId,
              {
                fps: 22,
                qrbox: (w, h) => {
                  const sz = Math.min(w, h) * 0.75;
                  return { width: sz, height: sz };
                }
              },
              (decodedText) => {
                playBeepSound();
                setScannedCode(decodedText);
                setIsCameraActive(false);
              },
              () => {}
            ).catch(() => {
              setCameraError('دسترسی به دوربین داده نشد یا توسط برنامه دیگری اشغال شده است.');
              setIsCameraActive(false);
            });
          } else {
            setCameraError('هیچ دوربینی بر روی این دستگاه یافت نشد.');
            setIsCameraActive(false);
          }
        })
        .catch(() => {
          setCameraError('خطا در واکشی دوربین‌های دستگاه.');
          setIsCameraActive(false);
        });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [activeSubTab, isCameraActive]);

  if (!isScannerOpen) return null;

  // Search items database for matches
  const foundItem = items.find(i => i.barcode === scannedCode || i.code.toLowerCase() === scannedCode.toLowerCase());
  const foundItemInventory = foundItem 
    ? inventory.filter(inv => inv.itemId === foundItem.id).reduce((s, c) => s + c.quantity, 0)
    : 0;

  const handleSimulateScan = (code: string) => {
    playBeepSound();
    setScannedCode(code);
    setScanDiagnostics({
      latencyMs: 14,
      terminator: 'Enter (CR/LF)',
      charCount: code.length,
      detectedAt: new Date().toLocaleTimeString('fa-IR')
    });
  };

  const handleSearchItem = () => {
    if (foundItem) {
      setSearchQuery(foundItem.code);
      setActiveTab('items');
      setIsScannerOpen(false);
      if (onClose) onClose();
    }
  };

  const printItem = items.find(i => i.id === selectedItemForPrint) || foundItem || items[0];

  // Filtered barcode scanner profiles
  const filteredScanners = DEFAULT_BARCODE_SCANNERS.filter(sc => {
    const matchesBrand = brandFilter === 'all' || sc.id.includes(brandFilter);
    const matchesSearch = !scannerSearchQuery.trim() || 
      sc.brand.includes(scannerSearchQuery) || 
      sc.brandEn.toLowerCase().includes(scannerSearchQuery.toLowerCase()) ||
      sc.popularModels.some(m => m.toLowerCase().includes(scannerSearchQuery.toLowerCase()));
    return matchesBrand && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none no-print animate-fadeIn" dir={isFa ? 'rtl' : 'ltr'}>
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-all">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <QrCode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">مرکز اسکن بارکد و مدیریت بارکدخوان‌ها</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  اتصال خودکار Plug & Play
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-normal">
                پشتیبانی از انواع بارکدخوان‌های فیزیکی USB و بی‌سیم، دوربین موبایل و چاپ لیبل استاندارد
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              setIsScannerOpen(false);
              if (onClose) onClose();
            }}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95 cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Header */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 pt-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSubTab('hardware')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'hardware'
                  ? 'bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Usb className="w-4 h-4 text-indigo-600" />
              <span>بارکدخوان فیزیکی و دستگاه‌های سازگار</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-bold">پیش‌فرض</span>
            </button>

            <button
              onClick={() => setActiveSubTab('camera')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'camera'
                  ? 'bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>اسکن با دوربین (موبایل و وبکم)</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('print');
                if (foundItem) setSelectedItemForPrint(foundItem.id);
              }}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'print'
                  ? 'bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>چاپ لیبل و بارکد کالا</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                soundEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-200 border-slate-300 text-slate-500'
              }`}
              title="صدای بوق اسکنر"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'بوق اسکنر فعال' : 'بی‌صدا'}</span>
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-5 bg-slate-50/50">

          {/* TAB 1: HARDWARE BARCODE SCANNERS & REAL TIME ENGINE */}
          {activeSubTab === 'hardware' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Universal Driver & Connection Banner */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md border border-indigo-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 -mr-5"></span>
                    <h4 className="font-black text-sm text-emerald-300">شنود خودکار بارکدخوان فیزیکی در کل نرم‌افزار فعال است</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    پروتکل فراگیر شبیه‌ساز کیبورد (Universal HID Keyboard Wedge) آماده دریافت داده است. 
                    هر بارکدخوان سیمی USB، دانگل وایرلس یا بلوتوث را به دستگاه متصل کرده و بارکد را شلیک کنید؛ 
                    بدون نیاز به کلیک، در تمام صفحات اطلاعات کالا درجا بالا می‌آید.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleConnectWebHID}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Usb className="w-4 h-4 text-white" />
                    <span>شناسایی پورت مستقیم USB (WebHID)</span>
                  </button>
                </div>
              </div>

              {/* Status or Diagnostic Message */}
              {hidStatusMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-bold flex items-center gap-2 animate-fadeIn">
                  <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{hidStatusMessage}</span>
                </div>
              )}

              {/* Live WebHID devices if any */}
              {connectedHidDevices.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>دستگاه‌های بارکدخوان سخت‌افزاری فعال:</span>
                    {connectedHidDevices.map((dev, idx) => (
                      <span key={idx} className="bg-white px-2 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 font-mono text-[11px]">
                        {dev.productName || 'USB Barcode Scanner'} (VID: {dev.vendorId}, PID: {dev.productId})
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">متصل</span>
                </div>
              )}

              {/* Diagnostic Test Pad & Real-time Scan Simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Right: Live Interactive Scan Box */}
                <div className="lg:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      ترمینال تست و عیب‌یابی آنی بارکدخوان
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200">
                      آماده اسکن
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    بارکدخوان خود را مقابل یک بارکد نگه داشته و کلید آن را فشار دهید، یا دستی کد را وارد کنید:
                  </p>

                  <div className="relative">
                    <input
                      ref={hardwareInputRef}
                      type="text"
                      value={scannedCode}
                      onChange={(e) => setScannedCode(e.target.value)}
                      placeholder="اینجا کلیک کنید یا مستقیماً بارکدخوان را شلیک کنید..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-indigo-200 focus:border-indigo-600 rounded-xl text-xs text-slate-900 focus:outline-none text-center font-mono font-bold tracking-wider shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Scan Telemetry */}
                  {scanDiagnostics && (
                    <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                      <div>
                        <span className="text-slate-400 block">تاخیر سیگنال:</span>
                        <span className="font-bold text-slate-800">{scanDiagnostics.latencyMs} ms</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">کاراکتر پایانی:</span>
                        <span className="font-bold text-emerald-600">{scanDiagnostics.terminator}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">زمان ثبت:</span>
                        <span className="font-bold text-slate-800">{scanDiagnostics.detectedAt}</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Demo Code buttons */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1.5">شبیه‌سازی تست با کدهای نمونه قطعات:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.slice(0, 4).map(it => (
                        <button
                          key={it.id}
                          onClick={() => handleSimulateScan(it.barcode)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
                        >
                          {it.code} ({it.name.substring(0, 10)}...)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Left: Identified Item Card Result */}
                <div className="lg:col-span-6 flex flex-col">
                  {scannedCode ? (
                    foundItem ? (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-3 animate-fadeIn">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              کالا با موفقیت شناسایی شد
                            </span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono font-bold text-emerald-900">
                              بارکد: {foundItem.barcode}
                            </span>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/60 shadow-xs space-y-2">
                            <h4 className="font-black text-indigo-950 text-sm">{foundItem.name}</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                              <div>کد فنی: <strong className="text-slate-900 font-mono">{foundItem.code}</strong></div>
                              <div>واحد سنجش: <span className="text-slate-900">{foundItem.unit}</span></div>
                              <div>گروه کالا: <span className="text-slate-900">{foundItem.group}</span></div>
                              <div>موقعیت قفسه: <span className="text-amber-700 font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{foundItem.locationInRack || 'ثبت نشده'}</span></div>
                              <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-slate-500">موجودی کل انبارها:</span>
                                <span className="font-black text-sm text-emerald-700 font-mono">{foundItemInventory} {foundItem.unit}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleSearchItem}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>مشاهده در کالاها</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('stock_movement');
                              setIsScannerOpen(false);
                              if (onClose) onClose();
                            }}
                            className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5 text-indigo-600" />
                            <span>ثبت ورود/خروج</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveSubTab('print');
                              setSelectedItemForPrint(foundItem.id);
                            }}
                            className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            <span>چاپ بارکد</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex-1 flex flex-col justify-center text-center space-y-3 animate-fadeIn">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                        <div>
                          <h4 className="font-black text-xs text-amber-900">بارکد اسکن شد اما کالایی با این مشخصات یافت نشد</h4>
                          <p className="text-[11px] text-amber-700 mt-1 font-mono">
                            کد اسکن شده: <strong>{scannedCode}</strong>
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              setSearchQuery(scannedCode);
                              setActiveTab('items');
                              setIsScannerOpen(false);
                              if (onClose) onClose();
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>تعریف کالای جدید با این بارکد</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 flex-1 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                      <QrCode className="w-10 h-10 text-slate-300" />
                      <div className="font-bold text-xs text-slate-600">در انتظار اسکن بارکدخوان</div>
                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                        کلید بارکدخوان را بفشارید. به محض دریافت بارکد، مشخصات کامل کالا و موجودی انبار اینجا نمایش داده می‌شود.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Comprehensive List of Default & Certified Barcode Scanners */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>لیست بروز و پیش‌فرض بارکدخوان‌های سازگار در سیستم</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        {DEFAULT_BARCODE_SCANNERS.length} برند و پروتکل تایید شده
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      تمامی دستگاه‌های زیر بدون نیاز به نصب درایور، به صورت پیش‌فرض با استاندارد USB HID در سیستم شناسایی می‌شوند.
                    </p>
                  </div>

                  {/* Search inside models */}
                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      value={scannerSearchQuery}
                      onChange={(e) => setScannerSearchQuery(e.target.value)}
                      placeholder="جستجوی برند یا مدل بارکدخوان..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBrandFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      brandFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    همه برندها ({DEFAULT_BARCODE_SCANNERS.length})
                  </button>
                  {DEFAULT_BARCODE_SCANNERS.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBrandFilter(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        brandFilter === b.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b.brand}
                    </button>
                  ))}
                </div>

                {/* Scanners Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {filteredScanners.map(scanner => (
                    <div 
                      key={scanner.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-black text-xs text-slate-900">{scanner.brand}</h5>
                            <span className="text-[10px] text-slate-400 font-mono">{scanner.brandEn}</span>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                            تایید شده
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {scanner.descriptionFa}
                        </p>

                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">مدل‌های محبوب تست شده:</span>
                          <div className="flex flex-wrap gap-1">
                            {scanner.popularModels.slice(0, 4).map((m, idx) => (
                              <span key={idx} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-700">
                                {m}
                              </span>
                            ))}
                            {scanner.popularModels.length > 4 && (
                              <span className="text-[9px] text-slate-400 font-mono self-center">
                                +{scanner.popularModels.length - 4} دیگر
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Usb className="w-3 h-3 text-indigo-500" />
                          <span>{scanner.driverRequirement}</span>
                        </span>
                        <span className="text-indigo-600 font-bold font-mono">
                          {scanner.defaultTerminator}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MOBILE & WEBCAM CAMERA SCANNER */}
          {activeSubTab === 'camera' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
              <div className="md:col-span-8 flex flex-col space-y-3">
                <div className="bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 aspect-video flex flex-col items-center justify-center text-white shadow-xl">
                  {isCameraActive ? (
                    <>
                      <div id="camera-scanner-viewport" className="w-full h-full object-cover"></div>
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                          <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                        </div>
                        <div className="w-full h-1 bg-emerald-500/80 shadow-[0_0_12px_#10b981] animate-scan"></div>
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
                          <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          دوربین در حال اسکن زنده
                        </span>
                        <button 
                          onClick={() => setIsCameraActive(false)}
                          className="text-slate-300 hover:text-rose-400 font-bold transition-colors cursor-pointer text-[11px]"
                        >
                          خاموش کردن
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center space-y-4 max-w-sm">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">اسکن بارکد با دوربین گوشی یا لپ‌تاپ</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          دوربین دستگاه را مقابل بارکد میله‌ای یا QR Code قرار دهید تا درجا خوانده شود.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsCameraActive(true)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                      >
                        فعال‌سازی دوربین دستگاه
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute bottom-4 left-4 right-4 bg-rose-950/90 border border-rose-800 p-3 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}
                </div>

                {isCameraActive && cameras.length > 1 && (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl text-xs">
                    <Sliders className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-bold shrink-0 text-[11px]">انتخاب لنز دوربین:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                    >
                      {cameras.map((cam, idx) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `دوربین ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Result on Camera Scan */}
              <div className="md:col-span-4 flex flex-col space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <span className="text-xs font-black text-slate-900 block border-b border-slate-100 pb-2">
                      آخرین کد خوانده شده
                    </span>
                    {scannedCode ? (
                      foundItem ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                          <div className="font-black text-indigo-950 text-sm">{foundItem.name}</div>
                          <div className="text-[11px] text-slate-600">کد کالا: <strong className="font-mono">{foundItem.code}</strong></div>
                          <div className="text-[11px] text-slate-600">موجودی انبار: <strong className="font-mono text-emerald-700">{foundItemInventory} {foundItem.unit}</strong></div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          کد اسکن شده: <strong className="font-mono">{scannedCode}</strong> (کالایی یافت نشد)
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">هنوز کدی اسکن نشده است.</div>
                    )}
                  </div>

                  {foundItem && (
                    <button
                      onClick={handleSearchItem}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                      ورود به صفحه کالا
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BARCODE LABEL PRINT STUDIO */}
          {activeSubTab === 'print' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
              
              {/* Item Selector */}
              <div className="md:col-span-5 space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-black text-slate-900 block border-b border-slate-100 pb-2">
                  انتخاب کالا برای طراحی و پرینت لیبل
                </span>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 font-bold block">انتخاب کالا از انبار:</label>
                  <select
                    value={selectedItemForPrint || printItem.id}
                    onChange={(e) => setSelectedItemForPrint(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name} - ({it.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
                  <div>نام قطعه: <strong className="text-slate-900">{printItem.name}</strong></div>
                  <div>کد سیستم: <strong className="font-mono text-slate-900">{printItem.code}</strong></div>
                  <div>بارکد استاندارد: <strong className="font-mono text-indigo-700">{printItem.barcode}</strong></div>
                  <div>موقعیت قفسه: <span className="font-bold text-amber-700">{printItem.locationInRack || 'نامشخص'}</span></div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setIsExportingPdf(true);
                      try {
                        await exportElementToPdf('single-thermal-barcode-label', {
                          filename: `label-${printItem.code}-${new Date().toISOString().substring(0, 10)}.pdf`,
                          orientation: 'portrait',
                        });
                      } finally {
                        setIsExportingPdf(false);
                      }
                    }}
                    disabled={isExportingPdf}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    <span>{isExportingPdf ? 'تولید PDF...' : 'خروجی PDF'}</span>
                  </button>

                  <button
                    onClick={() => {
                      document.body.classList.add('printing-modal');
                      setTimeout(() => {
                        window.print();
                        setTimeout(() => {
                          document.body.classList.remove('printing-modal');
                        }, 1000);
                      }, 150);
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>پرینت لیبل</span>
                  </button>
                </div>
              </div>

              {/* Label Preview */}
              <div className="md:col-span-7 flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-black text-slate-400 block mb-4 uppercase tracking-wider">
                  پیش‌نمایش چاپ برچسب استاندارد انبار (Thermal 50x30mm)
                </span>

                <div id="single-thermal-barcode-label" className="w-72 bg-white text-slate-900 p-4 rounded-xl border-2 border-slate-800 shadow-md space-y-2 text-center">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-right">
                    <div>
                      <div className="text-[10px] font-black font-mono text-slate-900">ElectroStock WMS</div>
                      <div className="text-[8px] text-slate-400">سامانه استاندارد انبارداری قطعات</div>
                    </div>
                    <Box className="w-4 h-4 text-indigo-700" />
                  </div>

                  <div className="py-1">
                    <h5 className="font-black text-xs text-slate-900 truncate">{printItem.name}</h5>
                    <div className="text-[10px] font-mono font-black text-indigo-800 tracking-wider mt-0.5">{printItem.code}</div>
                  </div>

                  {/* Real SVG Barcode */}
                  <div className="py-1 flex justify-center bg-white">
                    <SvgBarcode code={printItem.barcode || printItem.code} height={44} maxSvgWidth={220} />
                  </div>

                  <div className="text-[10px] font-mono font-bold text-slate-700 tracking-widest">
                    *{printItem.barcode || printItem.code}*
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-600">
                    <span>قفسه: {printItem.locationInRack || '-'}</span>
                    <span>واحد: {printItem.unit}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>اتصال استاندارد بدون درایور به تمامی بارکدخوان‌های صنعتی، فروشگاهی و تفنگی</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsScannerOpen(false);
              if (onClose) onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black transition-colors cursor-pointer shadow-xs"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
