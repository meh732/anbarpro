import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, Download, Upload, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, History, HardDrive, Settings, RefreshCw, FileText, Users,
  Terminal, Server, Globe, Cpu, Laptop, ExternalLink, Play
} from 'lucide-react';
import { UserManagementView } from './UserManagementView';

export const BackupView: React.FC = () => {
  const { 
    exportDatabaseJSON, importDatabaseJSON, 
    autoBackupIntervalHours, setAutoBackupIntervalHours, 
    lastBackupTimestamp, backupHistory, t, language,
    serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer, resetServerDatabase
  } = useApp();
  const isFa = language === 'fa';

  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'server'>('users');
  const [networkPort, setNetworkPort] = useState('3000');
  const [portSaveMsg, setPortSaveMsg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

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
            message: t('restoreErrorMsg', 'فایل انتخاب‌شده ساختار معتبر JSON داده‌های ElectroStock را ندارد.')
          });
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            {t('backupTitle', 'مدیریت کاربران، سطح دسترسی‌ها و پشتیبان‌گیری')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('backupSubtitle', 'تنظیمات کاربران، نقش‌ها و بازیابی/پشتیبان‌گیری امن اطلاعات دیتابیس')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            CLOUD_SQL_ENGINE_ACTIVE
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          {isFa ? 'مدیریت کاربران و سطح دسترسی‌ها' : 'User Accounts & Access Control'}
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          {isFa ? 'پشتیبان‌گیری و بازیابی فایل' : 'Backup & Data Restoration'}
        </button>
        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
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
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
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
    </div>
  );
};
