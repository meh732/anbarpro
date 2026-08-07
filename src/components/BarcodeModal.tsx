import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { QrCode, X, Camera, Search, Printer, CheckCircle2, Box, RefreshCw, AlertCircle, Sparkles, Sliders, ArrowRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export const BarcodeModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { isScannerOpen, setIsScannerOpen, items, setActiveTab, setSearchQuery, language } = useApp();
  const [scannedCode, setScannedCode] = useState('');
  const [selectedItemForPrint, setSelectedItemForPrint] = useState<string | null>(null);

  // Mobile Camera Scan States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);

  const isFa = language === 'fa';

  // Play a standard warehouse-grade barcode scanner beep sound using Web Audio API (highly responsive, offline-ready)
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Professional 1200Hz tone
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // Quick 100ms beep
    } catch (e) {
      console.error("Failed to play audio scanner feedback:", e);
    }
  };

  // 1. Global Keyboard Buffer for Hardware Scanners (USB/Wireless wedge keyboard simulators)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Avoid capturing input when user is typing in standard forms inside the modal
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && 
        target.id !== 'hardware-barcode-input'
      ) {
        return;
      }

      const currentTime = Date.now();
      // Regular typing is slower than 80-100ms. USB hardware scanners type digits with interval < 30ms.
      if (currentTime - lastKeyTime > 150) {
        buffer = ''; // Reset stale buffer
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 2) {
          playBeepSound();
          setScannedCode(buffer.trim());
          buffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyPress);
    };
  }, []);

  // 2. Camera scanner initialization using html5-qrcode
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isCameraActive) {
      setCameraError(null);
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            
            // Auto-prefer rear camera/back-facing camera for stock tracking
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') || 
              d.label.toLowerCase().includes('rear')
            );
            const initialCamId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(initialCamId);

            // Create scanner instance on target div container
            html5QrCode = new Html5Qrcode("camera-scanner-viewport");
            setScannerInstance(html5QrCode);

            html5QrCode.start(
              initialCamId,
              {
                fps: 20,
                qrbox: (width, height) => {
                  const size = Math.min(width, height) * 0.75;
                  return { width: size, height: size };
                }
              },
              (decodedText) => {
                playBeepSound();
                setScannedCode(decodedText);
                setIsCameraActive(false); // Auto shut off camera upon successful read to save resources
              },
              () => {
                // Ignore verbose silent errors from frame-by-frame scans
              }
            ).catch(() => {
              setCameraError(isFa ? 'دسترسی به دوربین داده نشد یا توسط برنامه دیگری اشغال شده است.' : 'Camera access denied or device is busy.');
              setIsCameraActive(false);
            });
          } else {
            setCameraError(isFa ? 'هیچ دوربینی بر روی این دستگاه یافت نشد.' : 'No camera devices detected.');
            setIsCameraActive(false);
          }
        })
        .catch(() => {
          setCameraError(isFa ? 'خطا در واکشی اطلاعات دوربین‌های دستگاه.' : 'Error fetching camera devices list.');
          setIsCameraActive(false);
        });
    }

    // Cleanup: Make sure camera stream stops when closing modal or toggling camera off
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.error("Error stopping camera scan on unmount:", e));
      }
    };
  }, [isCameraActive]);

  // Handle switching camera source mid-session
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scannerInstance && scannerInstance.isScanning) {
      try {
        await scannerInstance.stop();
        await scannerInstance.start(
          cameraId,
          {
            fps: 20,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.75;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            playBeepSound();
            setScannedCode(decodedText);
            setIsCameraActive(false);
          },
          () => {}
        );
      } catch (err) {
        console.error("Failed to swap camera stream:", err);
      }
    }
  };

  if (!isScannerOpen) return null;

  // Search items database for matches (matches either factory code or printed barcode)
  const foundItem = items.find(i => i.barcode === scannedCode || i.code === scannedCode);

  const handleSimulateScan = (code: string) => {
    playBeepSound();
    setScannedCode(code);
  };

  const handleSearchItem = () => {
    if (foundItem) {
      setSearchQuery(foundItem.code);
      setActiveTab('items');
      setIsScannerOpen(false);
      if (onClose) onClose();
    }
  };

  const printItem = items.find(i => i.id === selectedItemForPrint);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none no-print animate-fadeIn" dir={isFa ? 'rtl' : 'ltr'}>
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-indigo-600 font-bold">
            <div className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
              <QrCode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-sm md:text-base font-black">اسکنر هوشمند و چاپ لیبل بارکد</span>
              <p className="text-[10px] text-slate-400 font-normal">پشتیبانی همزمان از دوربین گوشی، تبلت و دستگاه‌های فیزیکی USB</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsScannerOpen(false);
              if (onClose) onClose();
            }}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Splits side-by-side on desktop, stacks on mobile */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 custom-scrollbar">
          
          {/* Right Side / Top Section: Live Scanner Viewport */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            <div className="bg-gradient-to-br from-violet-950 via-slate-900 to-fuchsia-950 rounded-2xl overflow-hidden relative border border-violet-500/30 shadow-2xl shadow-violet-500/20 aspect-video md:aspect-[4/3] flex flex-col items-center justify-center text-white">
              
              {isCameraActive ? (
                <>
                  {/* Target Container for Html5Qrcode stream */}
                  <div id="camera-scanner-viewport" className="w-full h-full object-cover"></div>
                  
                  {/* Cyber Overlay effects */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    {/* Glowing corners */}
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                      <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                    </div>
                    
                    {/* Laser line effect */}
                    <div className="w-full h-1 bg-emerald-500/80 shadow-[0_0_12px_#10b981] animate-scan"></div>
                    
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
                      <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                    </div>
                  </div>

                  {/* Top floating bar inside camera */}
                  <div className="absolute top-3 left-3 right-3 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      دوربین فعال است
                    </span>
                    <button 
                      onClick={() => setIsCameraActive(false)}
                      className="text-slate-300 hover:text-rose-400 font-bold transition-colors"
                    >
                      خاموش کردن دوربین
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">اسکن مستقیم با دوربین دستگاه</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      دوربین گوشی، تبلت یا لپ‌تاپ خود را به یک بارکدخوان سریع تبدیل کنید. برای شروع روی دکمه زیر کلیک کنید.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="glass-btn-primary !rounded-xl !py-2.5 w-full justify-center"
                  >
                    فعال‌سازی دوربین موبایل / لپ‌تاپ
                  </button>
                </div>
              )}

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="absolute bottom-4 left-4 right-4 bg-rose-950/90 backdrop-blur-xs border border-rose-800 p-3 rounded-xl flex items-start gap-2 text-rose-300 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Camera Switcher Dropdown (only visible when multiple cameras are found) */}
            {isCameraActive && cameras.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 text-[10px] font-bold shrink-0">انتخاب دوربین:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `دوربین شماره ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Left Side / Bottom Section: Hardware & Results Panel */}
          <div className="md:col-span-5 flex flex-col space-y-5">
            
            {/* Input Box for keyboard-wedge scanners or typing */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-indigo-600" />
                  بارکدخوان تفنگی یا وارد کردن دستی
                </span>
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold font-mono">همواره فعال</span>
              </div>
              
              <p className="text-[10px] text-slate-500 leading-relaxed">
                بارکدخوان سیمی/بلوتوث خود را متصل کرده و دکمه آن را فشار دهید، یا کد را در کادر زیر تایپ و تایید کنید:
              </p>

              <div className="relative">
                <input
                  id="hardware-barcode-input"
                  type="text"
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  placeholder="مثال: 6260010002012"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 text-center font-mono font-bold tracking-widest shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Quick Simulator Test */}
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">تست سریع با کدهای پرکاربرد دمو:</span>
                <div className="flex flex-wrap gap-1.5">
                  {items.slice(0, 3).map(it => (
                    <button
                      key={it.id}
                      onClick={() => handleSimulateScan(it.barcode)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-indigo-600 font-mono transition-colors shadow-2xs"
                    >
                      {it.name.length > 12 ? it.name.substring(0, 12) + '...' : it.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Identification Result */}
            {scannedCode && (
              <div className={`p-4 rounded-2xl border transition-all animate-fadeIn ${foundItem ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50/70 border-rose-200 text-rose-900'}`}>
                {foundItem ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-extrabold text-xs">کالا با موفقیت شناسایی شد</span>
                    </div>
                    
                    <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border border-emerald-200/50">
                      <div className="font-black text-indigo-900 text-sm leading-tight">{foundItem.name}</div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100 font-medium">
                        <div>کد کالا: <span className="font-mono font-extrabold text-slate-900">{foundItem.code}</span></div>
                        <div>واحد: <span className="text-slate-900">{foundItem.unit}</span></div>
                        <div className="col-span-2">گروه: <span className="text-slate-900">{foundItem.group} &gt; {foundItem.subGroup}</span></div>
                        <div className="col-span-2 text-amber-700">موقعیت قفسه: <span className="font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{foundItem.locationInRack || 'نامشخص'}</span></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSearchItem}
                        className="glass-btn-primary flex-1 !rounded-xl !py-1.5 justify-center"
                      >
                        ورود به صفحه کالا
                      </button>
                      <button
                        onClick={() => setSelectedItemForPrint(foundItem.id)}
                        className="glass-btn-secondary !rounded-xl !py-1.5 !px-3"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        طراحی لیبل
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-center py-2">
                    <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
                    <p className="text-xs font-bold text-rose-800">بارکد نامعتبر یا ثبت‌نشده</p>
                    <p className="text-[10px] text-slate-500">کدی با مقدار <strong className="font-mono">{scannedCode}</strong> در سیستم وجود ندارد.</p>
                  </div>
                )}
              </div>
            )}

            {/* Printable Label Section */}
            {printItem && (
              <div className="p-4 bg-white text-slate-900 rounded-2xl border-2 border-dashed border-slate-300 space-y-3.5 shadow-2xs relative overflow-hidden animate-fadeIn">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center rotate-45">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <div>
                    <div className="font-black text-xs text-slate-900 font-mono tracking-wider">ElectroStock Label Studio</div>
                    <div className="text-[9px] text-slate-400">سامانه استاندارد لیبلینگ انبار</div>
                  </div>
                  <Box className="w-5 h-5 text-indigo-600" />
                </div>

                <div className="text-center py-2 space-y-1">
                  <div className="font-mono text-lg font-black tracking-widest text-indigo-700">{printItem.code}</div>
                  <div className="font-extrabold text-xs text-slate-800 truncate max-w-[220px] mx-auto">{printItem.name}</div>
                  <div className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md inline-block">موقعیت قفسه فیزیکی: {printItem.locationInRack}</div>
                </div>

                {/* Decorative mock barcode graphic */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                  <div className="flex items-end justify-center h-10 w-full max-w-[180px] space-x-0.5 space-x-reverse mb-1.5">
                    <div className="w-1 h-full bg-slate-900"></div>
                    <div className="w-0.5 h-full bg-white"></div>
                    <div className="w-1 h-full bg-slate-900"></div>
                    <div className="w-1.5 h-full bg-slate-900"></div>
                    <div className="w-0.5 h-full bg-white"></div>
                    <div className="w-2 h-full bg-slate-900"></div>
                    <div className="w-1 h-full bg-slate-900"></div>
                    <div className="w-0.5 h-full bg-white"></div>
                    <div className="w-1.5 h-full bg-slate-900"></div>
                    <div className="w-1 h-full bg-slate-900"></div>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500 tracking-wider">*{printItem.barcode}*</span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="glass-btn-primary !rounded-xl !py-2 w-full justify-center"
                >
                  <Printer className="w-4 h-4 text-indigo-600" />
                  پرینت مستقیم روی کاغذ پشت‌چسبدار
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setIsScannerOpen(false);
              if (onClose) onClose();
            }}
            className="glass-btn-dark !rounded-xl !py-2 !px-5"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
