import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, Download, Upload, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, History, HardDrive, Settings, RefreshCw, FileText, Users,
  Terminal, Server, Globe, Cpu, Laptop, ExternalLink, Play, Trash2,
  Sparkles, AlertTriangle, RotateCcw, ShieldAlert, Check, Layers, Package
} from 'lucide-react';
import { UserManagementView } from './UserManagementView';

export const BackupView: React.FC = () => {
  const { 
    exportDatabaseJSON, importDatabaseJSON, 
    autoBackupIntervalHours, setAutoBackupIntervalHours, 
    lastBackupTimestamp, backupHistory, t, language,
    serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer,
    resetToEmptyDatabase, loadDemoData, resetToSetupWizard,
    items, warehouses, projects, boms, currentUser
  } = useApp();
  const isFa = language === 'fa';

  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'raw_reset' | 'server'>('backup');
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // Modal confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'empty_db' | 'demo_db' | 'factory_reset';
    title: string;
    description: string;
    buttonText: string;
    isDangerous: boolean;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setUploadStatus({
            type: 'success',
            message: t('restoreSuccessMsg', 'داده‌های سیستم با موفقیت بازیابی و اعمال شدند.')
          });
        } else {
          setUploadStatus({
            type: 'error',
            message: t('restoreErrorMsg', 'فایل انتخاب‌شده ساختار معتبر JSON داده‌های سامانه را ندارد.')
          });
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteModalAction = async () => {
    if (!confirmModal) return;
    setIsProcessingAction(true);
    setActionAlert(null);

    try {
      if (confirmModal.type === 'empty_db') {
        const ok = await resetToEmptyDatabase();
        if (ok) {
          setActionAlert({
            type: 'success',
            text: 'پایگاه داده با موفقیت کاملاً تخلیه و به حالت خام (صفر) تبدیل شد. اکنون می‌توانید اطلاعات واقعی شرکت را وارد کنید.'
          });
        } else {
          setActionAlert({
            type: 'error',
            text: 'خطا در تخلیه دیتابیس. لطفاً مجدداً تلاش کنید.'
          });
        }
      } else if (confirmModal.type === 'demo_db') {
        const ok = await loadDemoData();
        if (ok) {
          setActionAlert({
            type: 'success',
            text: 'داده‌های نمونه و سناریوهای تستی تولید و انبار با موفقیت بارگذاری شدند.'
          });
        } else {
          setActionAlert({
            type: 'error',
            text: 'خطا در بارگذاری داده‌های نمونه.'
          });
        }
      } else if (confirmModal.type === 'factory_reset') {
        await resetToSetupWizard();
      }
    } catch {
      setActionAlert({
        type: 'error',
        text: 'خطای غیرمنتظره در اجرای عملیات.'
      });
    } finally {
      setIsProcessingAction(false);
      setConfirmModal(null);
    }
  };

  const intervalOptions = [
    { value: 0, label: t('disabled', 'غیرفعال (فقط پشتیبان‌گیری دستی)') },
    { value: 1, label: t('every1Hour', 'هر ۱ ساعت') },
    { value: 3, label: t('every3Hours', 'هر ۳ ساعت') },
    { value: 6, label: t('every6Hours', 'هر ۶ ساعت') },
    { value: 12, label: t('every12Hours', 'هر ۱۲ ساعت') },
    { value: 24, label: t('every24Hours', 'هر ۲۴ ساعت (روزانه)') },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            {t('backupTitle', 'مدیریت کاربران، پشتیبان‌گیری و خام‌سازی دیتابیس')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('backupSubtitle', 'تهیه فایل پشتیبان، مدیریت کاربران، تخلیه داده‌های تستی و تنظیمات پایگاه داده سرور')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            CENTRAL_DATABASE_ENGINE
          </span>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fadeIn ${
          actionAlert.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionAlert.text}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            بستن
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          {isFa ? 'پشتیبان‌گیری و بازیابی فایل' : 'Backup & Restore'}
        </button>

        <button
          onClick={() => setActiveTab('raw_reset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'raw_reset'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {isFa ? 'خام‌سازی و صفر کردن دیتابیس' : 'Wipe & Raw Database'}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          {isFa ? 'مدیریت کاربران و سطح دسترسی‌ها' : 'User Accounts & Access Control'}
        </button>

        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'server'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          {isFa ? 'سرور لینوکس و همگام‌سازی شبکه' : 'Linux Server & Network Sync'}
        </button>
      </div>

      {activeTab === 'users' ? (
        <UserManagementView />
      ) : activeTab === 'raw_reset' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Current State Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">خام‌سازی و مدیریت وضعیت پایگاه داده</h3>
                  <p className="text-xs text-slate-500">تخلیه تمام اطلاعات تستی جهت شروع به کار واقعی، یا بارگذاری مجدد اطلاعات نمونه</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">رکوردهای فعلی:</span>
                <span className="font-bold text-slate-800">{items.length} کالا</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800">{projects.length} پروژه</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800">{warehouses.length} انبار</span>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
              {/* Option 1: Clean Raw Reset */}
              <div className="bg-gradient-to-b from-rose-50/50 to-white border-2 border-rose-200 hover:border-rose-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">تخلیه کامل و تبدیل به دیتابیس خام</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                      مخصوص شروع به کار واقعی کارخانه
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تمامی کالاها، انبارها، فرمول‌های ساخت (BOM)، پروژه‌ها، اسناد انبارداری و لاگ‌های آزمایشی را پاک می‌کند. 
                    <strong className="block text-slate-900 mt-1 font-bold">نام شرکت و حساب کاربری ادمین حفظ خواهد شد.</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'empty_db',
                    title: 'تخلیه کامل و تبدیل به دیتابیس خام',
                    description: 'آیا اطمینان دارید که می‌خواهید تمام رکوردهای کالا، انبار، پروژه و اسناد را کاملاً حذف کنید؟ با این کار پایگاه داده ۱۰۰٪ خام و آماده ورود اطلاعات واقعی سازمان خواهد شد.',
                    buttonText: 'بله، همه داده‌ها پاک و دیتابیس خام شود',
                    isDangerous: true
                  })}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تخلیه و صفر کردن دیتابیس</span>
                </button>
              </div>

              {/* Option 2: Load Demo Data */}
              <div className="bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-200 hover:border-indigo-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">بارگذاری داده‌های نمونه و تستی</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                      مخصوص تست، ارزیابی و آموزش
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    مجموعه‌ای جامع از کالاها (الکتروموتور، بلبرینگ، سیم‌پیچ و...)، ساختارهای BOM چندسطحی، پروژه‌ها و گردش کار انبار را جهت تست و دمو بارگذاری می‌کند.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'demo_db',
                    title: 'بارگذاری داده‌های نمونه و تستی (Demo Data)',
                    description: 'با این عملیات، داده‌های تستی شامل کالاهای پیش‌فرض، درخت BOM و پروژه‌های نمونه بارگذاری خواهند شد.',
                    buttonText: 'بارگذاری اطلاعات تستی و دمو',
                    isDangerous: false
                  })}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>بارگذاری داده‌های نمونه (Demo)</span>
                </button>
              </div>

              {/* Option 3: Reset Setup Wizard */}
              <div className="bg-gradient-to-b from-slate-50/50 to-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">بازنشانی کارخانه‌ای و ویزارد نصب</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-md">
                      شروع مجدد مراحل نصب اولیه
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    نرم‌افزار را کاملاً به حالت اولین ثانیه نصب برمی‌گرداند و صفحه راه‌اندازی و تعریف مجدد نام شرکت و ادمین ارشد را نمایش می‌دهد.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'factory_reset',
                    title: 'بازنشانی کامل به روز اول نصب (Factory Reset)',
                    description: 'آیا می‌خواهید سیستم کاملاً ریست شده و صفحه راه‌اندازی اولیه (Setup Wizard) مجدداً اجرا شود؟ تمام اطلاعات و کاربران ریست خواهند شد.',
                    buttonText: 'ریست کارخانه‌ای و شروع مجدد نصب',
                    isDangerous: true
                  })}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بازگشت به ویزارد نصب اولیه</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'server' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Server Status Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">وضعیت سرور مرکزی و همگام‌سازی کلاینت‌ها</h3>
                  <p className="text-xs text-slate-500">پایگاه داده یکپارچه روی سرور لینوکس جهت دسترسی همزمان چند کامپیوتر در شبکه</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsSyncing(true);
                    setServerMsg(null);
                    const ok = await forceSyncWithServer();
                    setIsSyncing(false);
                    if (ok) {
                      setServerMsg('همگام‌سازی با موفقیت انجام شد و آخرین اطلاعات از سرور دریافت گردید.');
                      setTimeout(() => setServerMsg(null), 4000);
                    } else {
                      setServerMsg('خطا در همگام‌سازی با سرور لینوکس.');
                      setTimeout(() => setServerMsg(null), 4000);
                    }
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی فوری با سرور'}</span>
                </button>
              </div>
            </div>

            {serverMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{serverMsg}</span>
              </div>
            )}

            {/* Diagnostics Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${serverSyncStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  وضعیت اتصال به سرور:
                </div>
                <div className="text-sm font-black text-slate-900">
                  {serverSyncStatus === 'connected' ? 'آنلاین و فعال' : 'قطع ارتباط'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  آخرین سینک: {lastSyncTime || 'هم‌اکنون'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-500" />
                  نسخه پایگاه داده سرور:
                </div>
                <div className="text-sm font-black text-slate-900">
                  نسخه {serverVersion || 1}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  تغییرات به طور خودکار به بقیه اعمال می‌شود
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  مسیر فایل پایگاه داده:
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dir-ltr text-right truncate">
                  {serverInfo?.dataFile || '/data/server_database.json'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  حجم دیتابیس: {serverInfo?.dataSizeKb || 12} KB
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  پورت شبکه سرویس:
                </div>
                <div className="text-sm font-black text-slate-900">
                  Port 3000 (0.0.0.0)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  قابل دسترسی از تمام رایانه‌ها
                </div>
              </div>
            </div>
          </div>

          {/* Network instructions card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-600" />
              راهنمای اتصال سایر کامپیوترها به سرور لینوکس
            </h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                برای دسترسی کاربران مختلف در انبار یا کارخانه به این سیستم، کافی است در مرورگر کامپیوتر مقصد آدرس IP سرور لینوکس را با پورت <strong>3000</strong> وارد کنید:
              </p>
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono dir-ltr text-left">
                http://[IP_سرور_لینوکس]:3000
              </div>
              <p className="text-slate-500">
                هر تغییری شامل ثبت ورود/خروج کالا، ایجاد پروژه، تعریف قطعات و انتقال بین انبارها که توسط هر کاربری روی هر سیستمی ثبت شود، بلافاصله روی فایل مرکزی سرور لینوکس ذخیره شده و بدون نیاز به رفرش صفحه به سایر کاربران نمایش داده خواهد شد.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Raw Mode Banner Inside Backup Tab */}
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">آیا می‌خواهید با دیتابیس کاملاً خام (خالی) شروع کنید؟</h4>
                <p className="text-[11px] text-slate-500">تخلیه تمام کالاها و پروژه‌های آزمایشی با ۱ کلیک بدون از دست رفتن حساب مدیر ارشد</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal({
                  type: 'empty_db',
                  title: 'تخلیه کامل و تبدیل به دیتابیس خام',
                  description: 'آیا اطمینان دارید که می‌خواهید تمام رکوردهای کالا، انبار، پروژه و اسناد را کاملاً حذف کنید؟ پایگاه داده ۱۰۰٪ خام خواهد شد.',
                  buttonText: 'تخلیه کامل اطلاعات و شروع با دیتابیس خام',
                  isDangerous: true
                })}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>تخلیه و صفر کردن دیتابیس</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('raw_reset')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                گزینه‌های بیشتر...
              </button>
            </div>
          </div>

          {/* Main Grid Actions: Manual Backup & Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manual Download Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('manualBackup', 'پشتیبان‌گیری دستی')}</h3>
                  <p className="text-xs text-slate-500">استخراج فوری تمام اطلاعات انبار، BOMها و پروژه‌ها در یک فایل JSON</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>{t('lastBackupAt', 'آخرین پشتیبان‌گیری انجام‌شده:')}</span>
                  <strong className="font-mono text-slate-900">{lastBackupTimestamp || t('never', 'تاکنون انجام نشده')}</strong>
                </div>
              </div>

              <button
                onClick={() => exportDatabaseJSON('Manual')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {t('downloadBackup', 'دانلود فایل پشتیبان (JSON)')}
              </button>
            </div>

            {/* Restore Backup Upload Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('restoreBackup', 'بازیابی داده‌های پایگاه داده')}</h3>
                  <p className="text-xs text-slate-500">بارگذاری فایل پشتیبان JSON و جایگزینی کامل اطلاعات سیستم</p>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {t('uploadBackupFile', 'بارگذاری و بازیابی فایل JSON')}
              </button>

              {uploadStatus.type && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Automated Backup Scheduler Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('autoBackupSettings', 'تنظیمات پشتیبان‌گیری خودکار')}</h3>
                <p className="text-xs text-slate-500">تعیین فواصل زمانی منظم جهت تهیه و دانلود خودکار نسخه پشتیبان</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('autoBackupInterval', 'فواصل زمانی پشتیبان‌گیری خودکار')}:
                </label>
                <select
                  value={autoBackupIntervalHours}
                  onChange={(e) => setAutoBackupIntervalHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  {intervalOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs flex flex-col justify-center">
                <span className="text-slate-500 text-[11px] mb-1">وضعیت سرویس پشتیبان خودکار:</span>
                {autoBackupIntervalHours > 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    فعال - هر {autoBackupIntervalHours} ساعت یک بار دانلود خودکار انجام می‌شود.
                  </span>
                ) : (
                  <span className="text-slate-500 font-semibold">
                    غیرفعال (تنظیم نشده)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              {t('backupHistory', 'تاریخچه نسخه‌های پشتیبان')}
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap p-3">تاریخ و زمان</th>
                    <th className="whitespace-nowrap p-3">نام فایل</th>
                    <th className="whitespace-nowrap p-3">نوع پشتیبان‌گیری</th>
                    <th className="whitespace-nowrap p-3">حجم فایل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backupHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        تاکنون هیچ پشتیبان‌گیری ثبتی انجام نشده است.
                      </td>
                    </tr>
                  ) : (
                    backupHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="whitespace-nowrap p-3 font-mono text-slate-600">{item.timestamp}</td>
                        <td className="whitespace-nowrap p-3 font-mono text-indigo-600 font-medium">{item.fileName}</td>
                        <td className="whitespace-nowrap p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.type === 'Auto' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {item.type === 'Auto' ? 'خودکار' : 'دستی'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 font-mono text-slate-700">{item.sizeKb} KB</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {confirmModal.isDangerous ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">تایید اجرای عملیات روی پایگاه داده</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleExecuteModalAction}
                disabled={isProcessingAction}
                className={`px-4 py-2.5 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 ${
                  confirmModal.isDangerous 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isProcessingAction && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{confirmModal.buttonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
