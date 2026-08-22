import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC<{
  variant?: 'banner' | 'button' | 'card' | 'login-widget';
  className?: string;
}> = ({ variant = 'button', className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for browsers without direct prompt API
      setShowIOSModal(true);
    }
  };

  if (isInstalled || dismissed) {
    return null;
  }

  // Variant: Top or Floating Banner
  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-indigo-500/30 flex items-center justify-between gap-3 animate-fadeIn ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>نصب نسخه موبایل (PWA) انبار‌مه</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">آفلاین & پرسرعت</span>
              </div>
              <p className="text-[11px] text-slate-300">دسترسی مستقیم بدون نیاز به مرورگر با آیکون اختصاصی</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-indigo-900 hover:bg-slate-100 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-700" />
              <span>نصب برنامه</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIOSModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  // Variant: Login Page Widget
  if (variant === 'login-widget') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 backdrop-blur-md text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg ${className}`}>
          <div className="flex items-center gap-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>نصب اپلیکیشن روی گوشی (PWA)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                سازگار با اندروید، آیفون (iOS) و ویندوز بدون نیاز به دانلود از استور
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>نصب روی صفحه اصلی</span>
          </button>
        </div>

        {showIOSModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  // Default: Compact Button
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${className}`}
        title="نصب نسخه تحت وب اپلیکیشن (PWA)"
      >
        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline">نصب اپلیکیشن موبایل</span>
        <span className="sm:hidden">نصب PWA</span>
      </button>

      {showIOSModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />}
    </>
  );
};

const InstallGuideModal: React.FC<{ isIOS: boolean; onClose: () => void }> = ({ isIOS, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fadeIn relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-base text-white">راهنمای نصب نسخه موبایل (PWA)</h3>
            <p className="text-xs text-slate-400">اضافه کردن سامانه انبار‌مه به صفحه اصلی گوشی</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-4 text-xs text-slate-300">
            <p className="text-slate-400 leading-relaxed">
              برای نصب در مرورگر <span className="text-indigo-400 font-bold">سافاری (Safari)</span> در گوشی آیفون / آیپد، مراحل زیر را انجام دهید:
            </p>
            
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div className="flex items-center gap-2">
                <span>روی دکمه</span>
                <span className="inline-flex items-center gap-1 bg-slate-700 px-2 py-0.5 rounded text-white font-bold">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" /> Share
                </span>
                <span>(اشتراک‌گذاری) در پایین مرورگر بزنید.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div className="flex items-center gap-2">
                <span>گزینه</span>
                <span className="inline-flex items-center gap-1 bg-slate-700 px-2 py-0.5 rounded text-white font-bold">
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Add to Home Screen
                </span>
                <span>یا «افزودن به صفحه اصلی» را انتخاب کنید.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <span>در گوشه بالا روی </span>
                <span className="font-bold text-indigo-400">Add</span>
                <span> بزنید تا آیکون برنامه روی صفحه گوشی شما قرار گیرد.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-slate-300">
            <p className="text-slate-400 leading-relaxed">
              برای نصب در مرورگر <span className="text-indigo-400 font-bold">کروم (Google Chrome)</span> یا سامسونگ اینترنت:
            </p>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>روی منوی سه‌نقطه مرورگر در گوشه بالا یا پایین ضربه بزنید.</div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div className="flex items-center gap-1.5">
                <span>گزینه</span>
                <span className="bg-slate-700 text-white font-bold px-2 py-0.5 rounded">Install App</span>
                <span>یا «نصب برنامه» را انتخاب کنید.</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>پشتیبانی کامل از حالت تمام‌صفحه و آفلاین</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
