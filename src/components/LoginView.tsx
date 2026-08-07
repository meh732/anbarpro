import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Cpu, Lock, User as UserIcon, LogIn, Key, Eye, EyeOff, 
  ShieldCheck, AlertCircle, Globe, CheckCircle2, Factory, Warehouse, Boxes, Users,
  Database, HardDrive, Shield
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, users, language, setLanguage } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isFa = language === 'fa';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage(isFa ? 'لطفاً نام کاربری را وارد کنید.' : 'Please enter your username.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const res = login(username, password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    }, 300);
  };

  const handleQuickDemoLogin = (demoUsername: string, demoPass: string) => {
    setUsername(demoUsername);
    setPassword(demoPass);
    setErrorMessage('');
    const res = login(demoUsername, demoPass);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const roleBadges: Record<string, { label: string; icon: any; color: string }> = {
    SystemAdmin: { label: 'مدیر کل سیستم', icon: ShieldCheck, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    PlantManager: { label: 'مدیر کارخانه', icon: Factory, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    WarehouseManager: { label: 'مدیر انبارها', icon: Warehouse, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    Storekeeper: { label: 'انباردار', icon: Boxes, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    Operator: { label: 'اپراتور تولید', icon: Users, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
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
              {isFa ? 'سامانه اختصاصی مدیریت انبارها، کالاها، تولید و سطوح دسترسی کارخانه' : 'Industrial Warehouse & Production ERP System'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
          className="glass-btn-dark !rounded-xl text-[11px]"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isFa ? 'English' : 'فارسی'}</span>
        </button>
      </header>

      {/* Center Authentication Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-950/80 border border-indigo-500/30 rounded-2xl mx-auto mb-3 flex items-center justify-center text-indigo-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isFa ? 'ورود به سامانه انبار‌مه' : 'Sign In to Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isFa ? 'نام کاربری و رمز عبور اختصاصی خود را وارد نمایید' : 'Enter your credentials to access system features'}
            </p>
          </div>

          {/* Database & System Offline Status Pills */}
          <div className="mb-5 p-2.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-around text-[10px] text-slate-300 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Database className="w-3.5 h-3.5" />
              <span>{isFa ? 'دیتابیس آفلاین فعال' : 'Local Engine Ready'}</span>
            </div>
            <div className="text-slate-600">|</div>
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isFa ? 'کنترل دسترسی RBAC' : 'Protected RBAC'}</span>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Login Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-right">
                {isFa ? 'نام کاربری:' : 'Username:'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isFa ? 'مثال: admin یا storekeeper' : 'e.g. admin'}
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-right">
                {isFa ? 'رمز عبور:' : 'Password:'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-indigo-300 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2.5  transition-all shadow-[0_4px_20px_rgba(99,102,241,0.1)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.2)] active:scale-95 duration-200 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-indigo-400" />
                  <span>{isFa ? 'ورود به سامانه' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Role Selection Panel */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 text-center mb-3">
              {isFa ? '⚡ ورود سریع آزمایشی با نقش‌های مختلف:' : '⚡ Quick Demo Login as Role:'}
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {users.map((u) => {
                const badge = roleBadges[u.role] || { label: u.role, icon: UserIcon, color: 'bg-slate-800 text-slate-300 border-slate-700' };
                const Icon = badge.icon;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickDemoLogin(u.username, u.password || '123')}
                    className="w-full p-2.5 bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all text-right flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs transition-colors">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                          {u.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          نام کاربری: <span className="text-slate-200 font-semibold">{u.username}</span> | رمز: <span className="text-slate-200 font-semibold">{u.password || '123'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] rounded-lg border font-medium flex items-center gap-1 shrink-0 ${badge.color}`}>
                      <Icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 text-center text-[11px] text-slate-500 max-w-md mx-auto space-y-1">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {isFa ? 'احراز هویت امنیتی و اعتبارسنجی دقیق سطح دسترسی کاربران' : 'Protected by Encrypted RBAC Access Control'}
        </p>
        <p className="text-[10px] text-slate-600">
          سامانه اختصاصی مدیریت انبار، تولید و لایسنس کارخانه انبار‌مه © ۲۰۲۶
        </p>
      </footer>
    </div>
  );
};

