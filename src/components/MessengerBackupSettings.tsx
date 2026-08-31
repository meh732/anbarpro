import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MessengerBackupConfig } from '../types';
import { 
  Send, Bot, MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, 
  RefreshCw, Check, Copy, Clock, Zap, Eye, EyeOff, Radio, FileText,
  HelpCircle, ExternalLink, ArrowRight, ShieldAlert, Sparkles, Database,
  Settings2, ChevronDown, ChevronUp, Globe, Network, Shield
} from 'lucide-react';
import { normalizeDigits, cleanBotToken, cleanChatId } from '../utils/messengerUtils';

export const MessengerBackupSettings: React.FC = () => {
  const { 
    messengerConfig, 
    updateMessengerConfig, 
    sendBackupToMessengers, 
    testMessengerBot, 
    isSendingMessengerBackup,
    items, warehouses, projects, boms, contractorContracts,
    companyName
  } = useApp();

  // Local Form State
  const [formData, setFormData] = useState<MessengerBackupConfig>(() => ({
    telegram: {
      enabled: false,
      botToken: '',
      adminChatId: '',
      sendAutoBackups: true,
      sendAlerts: true,
      apiBaseUrl: 'https://api.telegram.org',
      proxyUrl: '',
      ...(messengerConfig?.telegram || {})
    },
    bale: {
      enabled: false,
      botToken: '',
      adminChatId: '',
      sendAutoBackups: true,
      sendAlerts: true,
      apiBaseUrl: 'https://tapi.bale.ai',
      ...(messengerConfig?.bale || {})
    },
    autoSendIntervalHours: messengerConfig?.autoSendIntervalHours || 24,
    includeSummaryText: messengerConfig?.includeSummaryText ?? true,
    lastSentTelegramTimestamp: messengerConfig?.lastSentTelegramTimestamp || null,
    lastSentBaleTimestamp: messengerConfig?.lastSentBaleTimestamp || null,
    lastTelegramStatus: messengerConfig?.lastTelegramStatus || null,
    lastBaleStatus: messengerConfig?.lastBaleStatus || null,
  }));

  // Keep local state in sync when context changes
  useEffect(() => {
    if (messengerConfig) {
      setFormData(prev => ({
        ...prev,
        ...messengerConfig,
        telegram: { 
          ...prev.telegram, 
          ...(messengerConfig.telegram || {}),
          apiBaseUrl: messengerConfig.telegram?.apiBaseUrl || 'https://api.telegram.org',
          proxyUrl: messengerConfig.telegram?.proxyUrl || '',
        },
        bale: { 
          ...prev.bale, 
          ...(messengerConfig.bale || {}),
          apiBaseUrl: messengerConfig.bale?.apiBaseUrl || 'https://tapi.bale.ai',
        },
      }));
    }
  }, [messengerConfig]);

  // UI helpers
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showBaleToken, setShowBaleToken] = useState(false);
  const [showTelegramAdvanced, setShowTelegramAdvanced] = useState(false);
  const [showBaleAdvanced, setShowBaleAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Testing states
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isTestingBale, setIsTestingBale] = useState(false);
  const [baleTestResult, setBaleTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Backup trigger results
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    results?: any;
    error?: string;
  } | null>(null);

  const sanitizeFormData = (): MessengerBackupConfig => {
    return {
      ...formData,
      telegram: {
        ...formData.telegram,
        botToken: cleanBotToken(formData.telegram.botToken),
        adminChatId: cleanChatId(formData.telegram.adminChatId),
        apiBaseUrl: formData.telegram.apiBaseUrl?.trim() || 'https://api.telegram.org',
        proxyUrl: formData.telegram.proxyUrl?.trim() || '',
      },
      bale: {
        ...formData.bale,
        botToken: cleanBotToken(formData.bale.botToken),
        adminChatId: cleanChatId(formData.bale.adminChatId),
        apiBaseUrl: formData.bale.apiBaseUrl?.trim() || 'https://tapi.bale.ai',
      }
    };
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const sanitized = sanitizeFormData();
      setFormData(sanitized);
      const ok = await updateMessengerConfig(sanitized);
      if (ok) {
        setSaveSuccessMsg('تنظیمات ربات‌های تلگرام و بله با موفقیت ذخیره گردید.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setSaveSuccessMsg('خطا در ذخیره‌سازی تنظیمات در سرور.');
      }
    } catch {
      setSaveSuccessMsg('خطا در ارتباط با سرور.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const cleanToken = cleanBotToken(formData.telegram.botToken);
      const cleanChat = cleanChatId(formData.telegram.adminChatId);
      const proxy = formData.telegram.proxyUrl?.trim();
      const baseUrl = formData.telegram.apiBaseUrl?.trim();

      const res = await testMessengerBot('telegram', cleanToken, cleanChat, {
        proxyUrl: proxy,
        apiBaseUrl: baseUrl,
      });
      setTelegramTestResult(res);
    } catch (err: any) {
      setTelegramTestResult({ success: false, message: err.message || 'خطا در تست تلگرام' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestBale = async () => {
    setIsTestingBale(true);
    setBaleTestResult(null);
    try {
      const cleanToken = cleanBotToken(formData.bale.botToken);
      const cleanChat = cleanChatId(formData.bale.adminChatId);
      const baseUrl = formData.bale.apiBaseUrl?.trim();

      const res = await testMessengerBot('bale', cleanToken, cleanChat, {
        apiBaseUrl: baseUrl,
      });
      setBaleTestResult(res);
    } catch (err: any) {
      setBaleTestResult({ success: false, message: err.message || 'خطا در تست بله' });
    } finally {
      setIsTestingBale(false);
    }
  };

  const handleTriggerBackup = async (target: 'all' | 'telegram' | 'bale') => {
    setDispatchResult(null);
    // Auto-save any unsaved inputs before sending
    const sanitized = sanitizeFormData();
    await updateMessengerConfig(sanitized);
    const res = await sendBackupToMessengers(target);
    setDispatchResult(res);
  };

  const intervalOptions = [
    { value: 1, label: 'هر ۱ ساعت' },
    { value: 3, label: 'هر ۳ ساعت' },
    { value: 6, label: 'هر ۶ ساعت' },
    { value: 12, label: 'هر ۱۲ ساعت' },
    { value: 24, label: 'هر ۲۴ ساعت (روزانه - توصیه شده)' },
    { value: 48, label: 'هر ۴۸ ساعت (یک‌روز در میان)' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-sky-700/40 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight">ارسال خودکار فایل پشتیبان به ربات‌های تلگرام و بله</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-400/20 text-sky-200 border border-sky-400/30">
                  Offsite Cloud Redundancy
                </span>
              </div>
              <p className="text-xs text-sky-100/80 mt-1 max-w-2xl leading-relaxed">
                سامانه انبارمه به طور منظم نسخه کامل دیتابیس JSON همراه با خلاصه فارسی وضعیت موجودی، پروژه‌ها و اسناد را مستقیماً به حساب کاربری ادمین در پیام‌رسان تلگرام و بازوبند بله ارسال می‌کند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleTriggerBackup('all')}
              disabled={isSendingMessengerBackup || (!formData.telegram.enabled && !formData.bale.enabled)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingMessengerBackup ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>ارسال فوری بکاپ به همه پیام‌رسان‌ها</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">بستن</button>
        </div>
      )}

      {/* Dispatch Result Feedback */}
      {dispatchResult && (
        <div className={`p-4 rounded-2xl border flex flex-col gap-2 animate-fadeIn text-xs ${
          dispatchResult.success 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              {dispatchResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span>
                {dispatchResult.success 
                  ? 'عملیات ارسال پشتیبان به پیام‌رسان‌ها با موفقیت انجام شد.' 
                  : 'نتیجه ارسال پشتیبان به پیام‌رسان‌ها:'}
              </span>
            </div>
            <button onClick={() => setDispatchResult(null)} className="text-slate-400 hover:text-slate-600">بستن</button>
          </div>

          {dispatchResult.results && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              {dispatchResult.results.telegram && (
                <div className={`p-2.5 rounded-xl border font-mono text-[11px] ${
                  dispatchResult.results.telegram.success ? 'bg-white/80 border-emerald-300 text-emerald-800' : 'bg-white/80 border-rose-300 text-rose-800'
                }`}>
                  <strong>تلگرام:</strong> {dispatchResult.results.telegram.message}
                </div>
              )}
              {dispatchResult.results.bale && (
                <div className={`p-2.5 rounded-xl border font-mono text-[11px] ${
                  dispatchResult.results.bale.success ? 'bg-white/80 border-emerald-300 text-emerald-800' : 'bg-white/80 border-rose-300 text-rose-800'
                }`}>
                  <strong>بله:</strong> {dispatchResult.results.bale.message}
                </div>
              )}
            </div>
          )}

          {dispatchResult.error && (
            <div className="text-rose-700 font-bold mt-1">
              خطا: {dispatchResult.error}
            </div>
          )}
        </div>
      )}

      {/* Main Dual Messenger Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* =========================================================================
            CARD 1: TELEGRAM BOT CONFIGURATION
           ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-500 font-bold shadow-2xs">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    ربات پیام‌رسان تلگرام (Telegram Bot)
                  </h4>
                  <p className="text-[11px] text-slate-500">ارسال فایل پشتیبان به آیدی اختصاصی ادمین در تلگرام</p>
                </div>
              </div>

              {/* Enable Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.telegram.enabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    telegram: { ...prev.telegram, enabled: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Bot Token Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>توکن ربات تلگرام (Telegram Bot Token):</span>
                  <span className="text-[10px] text-slate-400 font-normal">از @BotFather دریافت می‌شود</span>
                </label>
                <div className="relative">
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    value={formData.telegram.botToken}
                    onChange={(e) => {
                      const val = normalizeDigits(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        telegram: { ...prev.telegram, botToken: val }
                      }));
                    }}
                    placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Telegram Admin Chat ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>شناسه چت ادمین تلگرام (Admin Chat ID):</span>
                  <span className="text-[10px] text-sky-600 font-bold">شناسه عددی اختصاصی تلگرام</span>
                </label>
                <input
                  type="text"
                  value={formData.telegram.adminChatId}
                  onChange={(e) => {
                    const val = normalizeDigits(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      telegram: { ...prev.telegram, adminChatId: val }
                    }));
                  }}
                  placeholder="مثال: 987654321 (شناسه عددی اکانت شما در تلگرام)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 نکته: برای دریافت Chat ID خود در تلگرام، به ربات <code className="font-mono text-sky-600">@userinfobot</code> در تلگرام پیام دهید. <b>دقت کنید که حتماً باید ربات خود را یک بار Start کنید.</b>
                </p>
              </div>

              {/* Advanced Network / Proxy Accordion for Telegram */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowTelegramAdvanced(!showTelegramAdvanced)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-sky-800">
                    <Network className="w-3.5 h-3.5" />
                    تنظیمات پیشرفته اتصال و پروکسی تلگرام (در صورت فیلترینگ)
                  </span>
                  {showTelegramAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showTelegramAdvanced && (
                  <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/80 animate-fadeIn text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        آدرس سرور پروکسی (HTTP / HTTPS / SOCKS5 Proxy):
                      </label>
                      <input
                        type="text"
                        value={formData.telegram.proxyUrl || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, proxyUrl: e.target.value.trim() }
                        }))}
                        placeholder="مثال: http://127.0.0.1:1080 یا socks5://127.0.0.1:1080"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        اگر سرور شما در ایران قرار دارد، می‌توانید با وارد کردن پروکسی محلی اتصال به تلگرام را بدون قطعی برقرار کنید.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        آدرس پایه وب‌سرویس تلگرام (Custom Bot API Base URL):
                      </label>
                      <input
                        type="text"
                        value={formData.telegram.apiBaseUrl || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, apiBaseUrl: e.target.value.trim() }
                        }))}
                        placeholder="پیش‌فرض: https://api.telegram.org"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        در صورت استفاده از Reverse Proxy یا Local Bot API سرور اختصاصی.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={formData.telegram.sendAutoBackups}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      telegram: { ...prev.telegram, sendAutoBackups: e.target.checked }
                    }))}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">ارسال خودکار فایل بکاپ</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={formData.telegram.sendAlerts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      telegram: { ...prev.telegram, sendAlerts: e.target.checked }
                    }))}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">ارسال هشدارهای کسری موجودی</span>
                </label>
              </div>

              {/* Status report box */}
              {messengerConfig?.lastTelegramStatus && (
                <div className={`p-3 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  messengerConfig.lastTelegramStatus.success ? 'bg-sky-50/70 border-sky-200 text-sky-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div>
                    <span className="font-bold">آخرین وضعیت تلگرام: </span>
                    <span>{messengerConfig.lastTelegramStatus.message}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">{messengerConfig.lastTelegramStatus.time}</span>
                </div>
              )}

              {/* Test Result Message */}
              {telegramTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                  telegramTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {telegramTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{telegramTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons for Telegram */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !formData.telegram.botToken || !formData.telegram.adminChatId}
              className="flex-1 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-sky-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>تست اتصال پیام به تلگرام</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerBackup('telegram')}
              disabled={isSendingMessengerBackup || !formData.telegram.botToken || !formData.telegram.adminChatId}
              className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingMessengerBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>ارسال بکاپ دستی تلگرام</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: BALE MESSENGER BOT CONFIGURATION
           ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-2xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    بازوبند پیام‌رسان بله (Bale Messenger Bot)
                  </h4>
                  <p className="text-[11px] text-slate-500">ارسال بکاپ به پیام‌رسان ملی بله (بدون نیاز به فیلترشکن)</p>
                </div>
              </div>

              {/* Enable Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.bale.enabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    bale: { ...prev.bale, enabled: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Bale Bot Token Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>توکن بازوبند بله (Bale Bot Token):</span>
                  <span className="text-[10px] text-slate-400 font-normal">از بازوبندساز بله @BotFather دریافت می‌شود</span>
                </label>
                <div className="relative">
                  <input
                    type={showBaleToken ? 'text' : 'password'}
                    value={formData.bale.botToken}
                    onChange={(e) => {
                      const val = normalizeDigits(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        bale: { ...prev.bale, botToken: val }
                      }));
                    }}
                    placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBaleToken(!showBaleToken)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showBaleToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bale Admin Chat ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>شناسه چت ادمین در بله (Bale Admin Chat ID):</span>
                  <span className="text-[10px] text-emerald-700 font-bold">شناسه مستقل بله (عددی)</span>
                </label>
                <input
                  type="text"
                  value={formData.bale.adminChatId}
                  onChange={(e) => {
                    const val = normalizeDigits(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      bale: { ...prev.bale, adminChatId: val }
                    }));
                  }}
                  placeholder="مثال: 1987654321 (شناسه عددی اکانت شما در بله)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 نکته: شناسه کاربری ادمین در بله با تلگرام متفاوت است. <b>حتماً ابتدا در بله وارد بازوبند خود شده و دکمه شروع (Start) را لمس فرمایید.</b>
                </p>
              </div>

              {/* Advanced Network for Bale */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowBaleAdvanced(!showBaleAdvanced)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <Globe className="w-3.5 h-3.5" />
                    تنظیمات پیشرفته آدرس وب‌سرویس بله
                  </span>
                  {showBaleAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showBaleAdvanced && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/80 animate-fadeIn text-xs">
                    <label className="block text-[11px] font-bold text-slate-700">
                      آدرس پایه وب‌سرویس بله (Bale API Base URL):
                    </label>
                    <input
                      type="text"
                      value={formData.bale.apiBaseUrl || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bale: { ...prev.bale, apiBaseUrl: e.target.value.trim() }
                      }))}
                      placeholder="پیش‌فرض: https://tapi.bale.ai"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                    />
                  </div>
                )}
              </div>

              {/* Sub-options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={formData.bale.sendAutoBackups}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      bale: { ...prev.bale, sendAutoBackups: e.target.checked }
                    }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">ارسال خودکار فایل بکاپ</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={formData.bale.sendAlerts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      bale: { ...prev.bale, sendAlerts: e.target.checked }
                    }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">ارسال هشدارهای سیستمی</span>
                </label>
              </div>

              {/* Status report box */}
              {messengerConfig?.lastBaleStatus && (
                <div className={`p-3 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  messengerConfig.lastBaleStatus.success ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div>
                    <span className="font-bold">آخرین وضعیت بله: </span>
                    <span>{messengerConfig.lastBaleStatus.message}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">{messengerConfig.lastBaleStatus.time}</span>
                </div>
              )}

              {/* Test Result Message */}
              {baleTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                  baleTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {baleTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{baleTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons for Bale */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestBale}
              disabled={isTestingBale || !formData.bale.botToken || !formData.bale.adminChatId}
              className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingBale ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>تست اتصال پیام به بله</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerBackup('bale')}
              disabled={isSendingMessengerBackup || !formData.bale.botToken || !formData.bale.adminChatId}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingMessengerBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>ارسال بکاپ دستی بله</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          GLOBAL SCHEDULE & PAYLOAD PREFERENCES CARD
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">زمان‌بندی دوره‌ای و محتوای ارسالی بکاپ‌ها</h4>
            <p className="text-xs text-slate-500">تنظیم فاصله زمانی بین ارسال خودکار پشتیبان به تلگرام و بله توسط سرور مرکزی</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              فواصل ارسال خودکار نسخه پشتیبان توسط سرور:
            </label>
            <select
              value={formData.autoSendIntervalHours}
              onChange={(e) => setFormData(prev => ({ ...prev, autoSendIntervalHours: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              {intervalOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs cursor-pointer hover:bg-slate-100 w-full">
              <input
                type="checkbox"
                checked={formData.includeSummaryText}
                onChange={(e) => setFormData(prev => ({ ...prev, includeSummaryText: e.target.checked }))}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-800 block">پیوست گزارش آماری فارسی همراه فایل</span>
                <span className="text-[11px] text-slate-500">تعداد کالاها، پروژه‌ها و وضعیت انبارها در متن پیام برای ادمین ارسال شود</span>
              </div>
            </label>
          </div>
        </div>

        {/* Current Database Summary Preview */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              محتوای فشرده فایل پشتیبان که برای ادمین فرستاده خواهد شد:
            </span>
            <span className="text-[11px] text-slate-500">شرکت: {companyName || 'انبار مرکزی'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">اقلام کالا</span>
              <span className="font-bold text-slate-900 text-xs">{items.length} ردیف</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">انبارها</span>
              <span className="font-bold text-slate-900 text-xs">{warehouses.length} انبار</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">پروژه‌های فعال</span>
              <span className="font-bold text-slate-900 text-xs">{projects.length} پروژه</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">فرمول‌های ساخت (BOM)</span>
              <span className="font-bold text-slate-900 text-xs">{boms.length} فرمول</span>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500">
            * پشتیبان‌گیری در پس‌زمینه سیستم توسط سرور مرکزی لینوکس انجام می‌گیرد.
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>ذخیره کلیه تنظیمات ربات‌ها</span>
          </button>
        </div>
      </div>

      {/* Helper FAQ / Instructions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          راهنمای گام‌به‌گام ساخت ربات تلگرام و بله جهت دریافت بکاپ
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-2">
            <h5 className="font-black text-sky-950 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-600" />
              مراحل راه‌اندازی در تلگرام:
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px]">
              <li>در تلگرام به <code className="font-mono text-sky-700 font-bold">@BotFather</code> رفته و دستور <code className="font-mono text-sky-700 font-bold">/newbot</code> را بزنید.</li>
              <li>نام و آیدی ربات را تعیین کرده و توکن (Token) دریافتی را در فیلد بالا کپی کنید.</li>
              <li><b>بسیار مهم:</b> وارد صفحه ربات تازه ایجاد شده خود شوید و دکمه <b>Start</b> را بزنید تا اجازه دریافت پیام فعال شود.</li>
              <li>برای دریافت Chat ID عددی خود، به ربات <code className="font-mono text-sky-700 font-bold">@userinfobot</code> پیام دهید و عدد Id را در کادر شناسه چت وارد کنید.</li>
              <li>در صورتی که سرور در ایران قرار دارد و تلگرام فیلتر است، در بخش «تنظیمات پیشرفته» آدرس پروکسی (مانند <code className="font-mono text-[10px]">http://127.0.0.1:1080</code>) را مشخص کنید.</li>
            </ol>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
            <h5 className="font-black text-emerald-950 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              مراحل راه‌اندازی در پیام‌رسان بله (Bale):
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px]">
              <li>در اپلیکیشن بله، به ربات بازوبندساز <code className="font-mono text-emerald-700 font-bold">@BotFather</code> پیام دهید.</li>
              <li>دستور ایجاد بازوبند جدید را انتخاب کنید و توکن ارائه‌شده را در فیلد بالا قرار دهید.</li>
              <li><b>بسیار مهم:</b> به بازوبند ساخته‌شده خود در بله رفته و دکمه <b>شروع (Start)</b> را لمس نمایید.</li>
              <li>شناسه کاربری عددی اکانت بله خود را در کادر «شناسه چت ادمین در بله» ثبت کنید.</li>
              <li>پیام‌رسان بله کاملاً داخلی بوده و بدون نیاز به فیلترشکن در تمامی سرورهای ایران با بالاترین سرعت کار می‌کند.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
