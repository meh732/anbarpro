import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Cpu, Lock, User as UserIcon, LogIn, Key, Eye, EyeOff, 
  ShieldCheck, AlertCircle, Globe, CheckCircle2, Shield,
  Smartphone, Database, LockKeyhole
} from 'lucide-react';
import { getAccountLockoutStatus } from '../utils/security';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const LoginView: React.FC = () => {
  const { login, companyName, language, setLanguage } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  const isFa = language === 'fa';

  // Check lockout status on username change or interval
  useEffect(() => {
    if (!username.trim()) {
      setLockoutTimer(0);
      return;
    }
    const status = getAccountLockoutStatus(username);
    if (status.isLocked) {
      setLockoutTimer(status.remainingSeconds);
    } else {
      setLockoutTimer(0);
    }
  }, [username]);

  // Countdown timer effect for lockout
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage(isFa ? 'لطفاً نام کاربری خود را وارد کنید.' : 'Please enter your username.');
      return;
    }
    if (!password) {
      setErrorMessage(isFa ? 'لطفاً رمز عبور را وارد کنید.' : 'Please enter your password.');
      return;
    }

    if (lockoutTimer > 0) {
      setErrorMessage(
        isFa
          ? `حساب کاربری به دلیل ۵ بار تلاش ناموفق موقتاً قفل است. لطفاً ${lockoutTimer} ثانیه صبر نمایید.`
          : `Account locked due to consecutive failed attempts. Wait ${lockoutTimer} seconds.`
      );
      return;
    }

    setLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const res = login(username, password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
        const status = getAccountLockoutStatus(username);
        if (status.isLocked) {
          setLockoutTimer(status.remainingSeconds);
        }
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-vazir relative overflow-hidden select-none" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar with System Identity */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 p-2 shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white ring-2 ring-indigo-400/30">
            <Cpu className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wider flex items-center gap-2">
              سامانه انبار‌مه <span className="text-indigo-400 text-xs font-mono font-normal">AnbarMeh ERP v2.5</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {companyName ? `${companyName} | ` : ''}{isFa ? 'سامانه اختصاصی مدیریت انبارها، کالاها، تولید و سطوح دسترسی' : 'Industrial Warehouse & Production ERP System'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallPrompt variant="button" className="hidden sm:flex" />
          <button
            onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
            className="glass-btn-dark !rounded-xl text-[11px] px-3 py-1.5 flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isFa ? 'English' : 'فارسی'}</span>
          </button>
        </div>
      </header>

      {/* Center Authentication Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-950/90 border border-indigo-500/30 rounded-2xl mx-auto mb-3 flex items-center justify-center text-indigo-400 shadow-inner">
              <LockKeyhole className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isFa ? 'ورود امن به سامانه انبار‌مه' : 'Secure System Sign In'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isFa ? 'نام کاربری و رمز عبور رمزنگاری‌شده سازمانی خود را وارد کنید' : 'Enter your encrypted organizational credentials'}
            </p>
          </div>

          {/* Security & Database Status Badges */}
          <div className="mb-5 p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-around text-[10px] text-slate-300 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isFa ? 'رمزنگاری SHA-256' : 'SHA-256 Salted'}</span>
            </div>
            <div className="text-slate-700">|</div>
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isFa ? 'ضد بروت‌فورس فعال' : 'Anti-Brute Force'}</span>
            </div>
          </div>

          {/* Lockout Banner */}
          {lockoutTimer > 0 && (
            <div className="mb-5 p-3.5 bg-amber-950/80 border border-amber-500/50 rounded-2xl text-amber-200 text-xs flex items-center gap-3 animate-pulse">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold">حساب کاربری موقتاً قفل شد</div>
                <div className="text-[11px] mt-0.5">لطفاً {lockoutTimer} ثانیه دیگر مجدداً تلاش کنید.</div>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && lockoutTimer === 0 && (
            <div className="mb-5 p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Login Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                {isFa ? 'نام کاربری:' : 'Username:'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isFa ? 'مثال: admin' : 'e.g. admin'}
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                {isFa ? 'رمز عبور:' : 'Password:'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-1"
                  title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 duration-200 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isFa ? 'ورود امن به سامانه' : 'Sign In Securely'}</span>
                </>
              )}
            </button>
          </form>

          {/* PWA Mobile App Callout Widget */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <PWAInstallPrompt variant="login-widget" />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 text-center text-[11px] text-slate-500 max-w-md mx-auto space-y-1">
        <p className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          {isFa ? 'احراز هویت رمزنگاری‌شده و حفاظت شده در برابر دسترسی غیرمجاز' : 'Encrypted Authentication & Zero-Plaintext Security'}
        </p>
        <p className="text-[10px] text-slate-600">
          سامانه اختصاصی مدیریت انبار، تولید و رهگیری قطعات الکترونیک انبار‌مه © ۲۰۲۶
        </p>
      </footer>
    </div>
  );
};
