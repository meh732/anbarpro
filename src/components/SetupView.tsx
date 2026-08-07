import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Cpu, Building2, Lock, User as UserIcon, ShieldCheck, 
  ArrowLeft, ArrowRight, Check, Play, AlertCircle, Database, HelpCircle
} from 'lucide-react';

export const SetupView: React.FC = () => {
  const { completeInstallation, language, setLanguage } = useApp();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('مدیر ارشد سیستم');
  const [errorMessage, setErrorMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  const isFa = language === 'fa';

  const validateStep1 = () => {
    if (!companyName.trim()) {
      setErrorMessage(isFa ? 'لطفاً نام شرکت یا کارخانه را وارد کنید.' : 'Please enter the company/factory name.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep2 = () => {
    if (!adminUsername.trim()) {
      setErrorMessage(isFa ? 'نام کاربری ادمین نمی‌تواند خالی باشد.' : 'Admin username cannot be empty.');
      return false;
    }
    if (adminPassword.length < 4) {
      setErrorMessage(isFa ? 'رمز عبور باید حداقل ۴ کاراکتر باشد.' : 'Password must be at least 4 characters.');
      return false;
    }
    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage(isFa ? 'رمز عبور و تایید آن مطابقت ندارند.' : 'Passwords do not match.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        handleCompleteSetup();
      }
    }
  };

  const handleBackStep = () => {
    setStep(1);
    setErrorMessage('');
  };

  const handleCompleteSetup = () => {
    setSuccessAnimation(true);
    setTimeout(() => {
      completeInstallation(companyName.trim(), adminUsername.trim(), adminPassword);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-vazir relative overflow-hidden select-none" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Decorative background gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 p-2 shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white ring-2 ring-indigo-400/30">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wider flex items-center gap-2">
              سامانه انبار‌مه <span className="text-indigo-400 text-xs font-mono font-normal">AnbarMeh ERP v2.5</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {isFa ? 'دستیار هوشمند راه‌اندازی و فعال‌سازی اولیه سیستم' : 'Smart System Setup & Activation Assistant'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
          className="glass-btn-dark !rounded-xl text-[11px] px-3 py-1.5 flex items-center gap-1.5"
        >
          <span>{isFa ? 'English' : 'فارسی'}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-lg w-full mx-auto my-auto py-8">
        <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top colored line indicator */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          {successAnimation ? (
            <div className="text-center py-12 space-y-6 animate-pulse">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <Check className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">{isFa ? 'فعال‌سازی موفقیت‌آمیز!' : 'Activation Successful!'}</h3>
                <p className="text-sm text-slate-400">
                  {isFa ? 'در حال آماده‌سازی دیتابیس خام و ورود خودکار به پنل مدیریت...' : 'Preparing database and signing in...'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Step indicator bubbles */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${step === 1 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}>
                  <span className="w-5 h-5 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-[10px]">۱</span>
                  <span>{isFa ? 'اطلاعات شرکت' : 'Company Details'}</span>
                </div>
                <div className="h-px w-8 bg-slate-700" />
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${step === 2 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}>
                  <span className="w-5 h-5 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-[10px]">۲</span>
                  <span>{isFa ? 'حساب ادمین ارشد' : 'Admin Account'}</span>
                </div>
              </div>

              {/* Title & subtitle */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2.5">
                  {step === 1 ? (
                    <>
                      <Building2 className="w-6 h-6 text-indigo-400" />
                      <span>{isFa ? 'پیکربندی نام کارخانه یا شرکت' : 'Company Configuration'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-6 h-6 text-indigo-400" />
                      <span>{isFa ? 'ایجاد حساب کاربری ارشد ادمین' : 'Setup Master Admin'}</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-2">
                  {step === 1 
                    ? (isFa ? 'لطفاً نام تجاری، کارخانه یا شرکتی که قرار است نرم‌افزار برای آن فعال شود را وارد کنید.' : 'Please input the branding/company name for which this ERP is being initialized.')
                    : (isFa ? 'اطلاعات حساب کاربری مدیر سیستم جهت ورود اولیه به سامانه را تعیین فرمایید.' : 'Configure the master administrator credentials for first-time access.')
                  }
                </p>
              </div>

              {/* Alert notice about database formatting */}
              <div className="mb-6 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                  <Database className="w-4 h-4 shrink-0" />
                  <span>{isFa ? 'نصب تمیز و خام (Clean Install)' : 'Clean Slate Database'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isFa 
                    ? 'طبق درخواست شما، نرم‌افزار به صورت کاملاً خام فعال خواهد شد. به این معنی که تمامی اقلام دمو، انبارها، و رکوردهای تستی پاک شده و پس از اتمام فرآیند، دیتابیس آماده دریافت کالاها و ساختارهای واقعی شما خواهد بود.'
                    : 'The database will be fully blanked and clean. All default trial data, mockup warehouses, and items are deleted, giving you a fresh start to customize your own factory structure.'}
                </p>
              </div>

              {/* Error box */}
              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Wizard Content Steps */}
              <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
                {step === 1 ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        {isFa ? 'نام تجاری شرکت یا کارخانه:' : 'Company / Factory Commercial Name:'}
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder={isFa ? 'مانند: پارس الکترونیک یا مکو' : 'e.g. Acme Electronics'}
                          className="w-full pr-10 pl-3 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        {isFa ? 'نام کامل مدیر:' : 'Admin Full Name:'}
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          placeholder={isFa ? 'مثال: مهندس احمدی' : 'e.g. John Doe'}
                          className="w-full pr-10 pl-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        {isFa ? 'نام کاربری ادمین ارشد (توصیه شده: admin):' : 'Admin Username:'}
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full pr-10 pl-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                          {isFa ? 'رمز عبور ادمین:' : 'Password:'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                          {isFa ? 'تکرار رمز عبور:' : 'Confirm Password:'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={adminConfirmPassword}
                            onChange={(e) => setAdminConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-4">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={handleBackStep}
                      className="flex-1 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-850 text-slate-300 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{isFa ? 'مرحله قبل' : 'Back'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] active:scale-95 cursor-pointer"
                  >
                    <span>{step === 1 ? (isFa ? 'مرحله بعد' : 'Next') : (isFa ? 'اتمام نصب و فعال‌سازی' : 'Activate & Finish')}</span>
                    {step === 1 ? <ArrowLeft className="w-4 h-4" /> : <Play className="w-4 h-4 text-indigo-200" />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 text-center text-[11px] text-slate-500 max-w-md mx-auto space-y-1">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          {isFa ? 'دیتابیس آفلاین محلی و کنترل دسترسی پیشرفته RBAC فعال است' : 'Offline Engine with Advanced RBAC Activated'}
        </p>
        <p className="text-[10px] text-slate-600">
          سامانه اختصاصی مدیریت انبار، تولید و لایسنس کارخانه انبار‌مه © ۲۰۲۶
        </p>
      </footer>
    </div>
  );
};
