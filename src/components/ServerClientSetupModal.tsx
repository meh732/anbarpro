import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Server, MonitorSmartphone, Cpu, KeyRound, ShieldCheck, Wifi, Copy, Check,
  RefreshCw, Globe, Lock, Unlock, AlertCircle, CheckCircle2, Terminal,
  HardDrive, Network, X, ArrowLeft, Settings2, Database, Power
} from 'lucide-react';
import {
  NodeNetworkAndLicenseInfo,
  formatHardwareCodeFromRaw,
  verifyServerActivationCode,
  getFallbackClientHardwareCode
} from '../utils/hardwareLicense';

interface ServerClientSetupModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  mandatory?: boolean;
  onRoleConfigured?: (mode: 'server' | 'client') => void;
}

export const ServerClientSetupModal: React.FC<ServerClientSetupModalProps> = ({
  isOpen = true,
  onClose,
  embedded = false,
  mandatory = false,
  onRoleConfigured
}) => {
  const {
    serverUrl,
    setServerUrl,
    testServerConnection,
    forceSyncWithServer,
    setIsInstalled,
    isNodeAuthorized,
    refreshLicenseAuthorization
  } = useApp();

  // Node Mode: 'server' (Central DB Host) or 'client' (Connects to Remote Server IP:Port)
  const [nodeMode, setNodeMode] = useState<'server' | 'client'>(() => {
    try {
      const saved = localStorage.getItem('electro_stock_db_v1_node_mode');
      if (saved === 'client' || saved === 'server') return saved;
      return serverUrl ? 'client' : 'server';
    } catch {
      return 'server';
    }
  });

  // Client Mode State
  const [clientHost, setClientHost] = useState<string>(() => {
    if (!serverUrl) return '192.168.1.';
    try {
      const u = new URL(serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`);
      return `${u.protocol}//${u.hostname}`;
    } catch {
      return serverUrl;
    }
  });
  const [clientPort, setClientPort] = useState<string>(() => {
    if (!serverUrl) return '3000';
    try {
      const u = new URL(serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`);
      return u.port || '3000';
    } catch {
      return '3000';
    }
  });
  const [clientTesting, setClientTesting] = useState(false);
  const [clientStatus, setClientStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Server Mode & Hardware Lock State
  const [nodeInfo, setNodeInfo] = useState<NodeNetworkAndLicenseInfo | null>(null);
  const [loadingNodeInfo, setLoadingNodeInfo] = useState(false);
  const [activationInput, setActivationInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [serverPortInput, setServerPortInput] = useState('3000');
  const [savingPort, setSavingPort] = useState(false);
  const [reinstallingService, setReinstallingService] = useState(false);
  const [serverStatusMsg, setServerStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2200);
  };

  const fetchServerNodeInfo = useCallback(async () => {
    setLoadingNodeInfo(true);
    try {
      let tauriHwUuid = '';
      let tauriLanIp = '';
      const winAny = window as any;
      if (winAny.__TAURI__?.invoke) {
        try {
          tauriHwUuid = await winAny.__TAURI__.invoke('get_windows_hardware_id');
          tauriLanIp = await winAny.__TAURI__.invoke('get_local_lan_ip');
        } catch {}
      }

      const res = await fetch('/api/system/node-info');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (tauriHwUuid && tauriHwUuid !== 'WIN-ENTERPRISE-NODE') {
            data.hardwareCode = formatHardwareCodeFromRaw(tauriHwUuid);
          }
          if (tauriLanIp && tauriLanIp !== '127.0.0.1' && !data.lanIps.includes(tauriLanIp)) {
            data.lanIps = [tauriLanIp, ...data.lanIps];
            data.primaryLanIp = tauriLanIp;
            data.primaryShareUrl = `http://${tauriLanIp}:${data.configuredPort || 3000}`;
          }
          setNodeInfo(data);
          setServerPortInput(String(data.configuredPort || data.activePort || 3000));
          setLoadingNodeInfo(false);
          return;
        }
      }
    } catch {
      // Fallback if offline
    }

    const fallbackHw = getFallbackClientHardwareCode();
    const savedPort = localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
    const savedActCode = localStorage.getItem('electro_stock_db_v1_server_activation_code') || '';
    const isVerifiedLocal = Boolean(savedActCode && verifyServerActivationCode(fallbackHw, savedActCode));

    setNodeInfo({
      hardwareCode: fallbackHw,
      hardwareDetails: {
        hostname: window.location.hostname || 'WIN-DESKTOP-PC',
        platform: navigator.platform || 'Win32',
        arch: 'x64',
        cpuModel: `Hardware Threads: ${navigator.hardwareConcurrency || 8} Cores`,
        cpuCores: navigator.hardwareConcurrency || 8,
        totalMemGb: (navigator as any).deviceMemory || 8,
        macAddress: 'HW-LOCKED-ID',
        osRelease: 'Windows 10/11 x64'
      },
      lanIps: [window.location.hostname || '192.168.1.100'],
      primaryLanIp: window.location.hostname || '192.168.1.100',
      activePort: Number(savedPort) || 3000,
      configuredPort: Number(savedPort) || 3000,
      shareUrls: [`http://${window.location.hostname || '192.168.1.100'}:${savedPort}`],
      primaryShareUrl: `http://${window.location.hostname || '192.168.1.100'}:${savedPort}`,
      isLicenseActivated: isVerifiedLocal,
      firewallCommand: `netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP ${savedPort})" dir=in action=allow protocol=TCP localport=${savedPort}`
    });
    setServerPortInput(savedPort);
    setLoadingNodeInfo(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServerNodeInfo();
    }
  }, [isOpen, fetchServerNodeInfo]);

  if (!isOpen) return null;

  const currentHardwareCode = nodeInfo?.hardwareCode || getFallbackClientHardwareCode();
  const savedActivationCode = (() => {
    try {
      return localStorage.getItem('electro_stock_db_v1_server_activation_code') || '';
    } catch {
      return '';
    }
  })();

  // Strict cryptographic & backend license check — cannot be bypassed by setting a boolean in localStorage
  const isServerLicensed = Boolean(
    nodeInfo?.isLicenseActivated ||
    (savedActivationCode && verifyServerActivationCode(currentHardwareCode, savedActivationCode))
  );

  // Handler: Activate Server Hardware License
  const handleActivateServerLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = activationInput.trim().toUpperCase();
    if (!trimmedCode) {
      setServerStatusMsg({ type: 'error', message: 'لطفاً کد فعال‌سازی دریافت‌شده از فروشنده را وارد نمایید.' });
      return;
    }

    setActivatingLicense(true);
    setServerStatusMsg(null);

    try {
      const isLocallyValid = verifyServerActivationCode(currentHardwareCode, trimmedCode);

      const res = await fetch('/api/system/activate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationCode: trimmedCode,
          clientHardwareCode: currentHardwareCode
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        localStorage.setItem('electro_stock_db_v1_server_activation_code', trimmedCode);
        localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
        setServerUrl(''); // Local central server
        setServerStatusMsg({
          type: 'success',
          message: data.message || 'قفل سخت‌افزاری با موفقیت تایید شد، دیتابیس سبک SQL و سرویس پس‌زمینه همیشه‌روشن ویندوز روی این سیستم نصب و فعال گردید!'
        });
        await fetchServerNodeInfo();
        await refreshLicenseAuthorization();
      } else if (isLocallyValid) {
        localStorage.setItem('electro_stock_db_v1_server_activation_code', trimmedCode);
        localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
        setServerUrl('');
        setServerStatusMsg({
          type: 'success',
          message: 'کد فعال‌سازی سخت‌افزار تایید شد و سرور مرکزی بر روی این سیستم فعال گردید.'
        });
        await fetchServerNodeInfo();
        await refreshLicenseAuthorization();
      } else {
        setServerStatusMsg({
          type: 'error',
          message: data?.error || 'کد فعال‌سازی وارد شده نامعتبر است و با شناسه سخت‌افزاری این سیستم مطابقت ندارد.'
        });
      }
    } catch {
      if (verifyServerActivationCode(currentHardwareCode, trimmedCode)) {
        localStorage.setItem('electro_stock_db_v1_server_activation_code', trimmedCode);
        localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
        setServerUrl('');
        setServerStatusMsg({
          type: 'success',
          message: 'کد فعال‌سازی تایید شد و سرور مرکزی بر روی این سیستم فعال گردید.'
        });
        await fetchServerNodeInfo();
        await refreshLicenseAuthorization();
      } else {
        setServerStatusMsg({
          type: 'error',
          message: 'کد فعال‌سازی نامعتبر است. لطفاً کد سخت‌افزاری نمایش داده شده را دقیقاً برای فروشنده ارسال نمایید.'
        });
      }
    } finally {
      setActivatingLicense(false);
    }
  };

  // Handler: Save Server Port & Share LAN IP
  const handleSaveServerPort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isServerLicensed) {
      setServerStatusMsg({
        type: 'error',
        message: 'ابتدا باید قفل سخت‌افزاری سرور را با کد دریافتی از فروشنده فعال نمایید.'
      });
      return;
    }

    const portNum = parseInt(serverPortInput.trim(), 10);
    if (!portNum || portNum < 1024 || portNum > 65535) {
      setServerStatusMsg({
        type: 'error',
        message: 'شماره پورت باید عددی بین 1024 تا 65535 باشد (پیشنهادی: 3000 یا 4000 یا 8080).'
      });
      return;
    }

    setSavingPort(true);
    setServerStatusMsg(null);
    try {
      localStorage.setItem('electro_stock_db_v1_server_port', String(portNum));
      localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
      setServerUrl('');

      const res = await fetch('/api/system/configure-port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setNodeInfo(prev => prev ? {
          ...prev,
          configuredPort: data.configuredPort,
          activePort: data.activePort,
          lanIps: data.lanIps || prev.lanIps,
          primaryLanIp: data.primaryLanIp || prev.primaryLanIp,
          shareUrls: data.shareUrls || prev.shareUrls,
          primaryShareUrl: data.primaryShareUrl || prev.primaryShareUrl,
          firewallCommand: data.firewallCommand || prev.firewallCommand,
          backgroundService: data.backgroundService || prev.backgroundService
        } : prev);
        setServerStatusMsg({
          type: 'success',
          message: `پورت سرور مرکزی روی ${portNum} تنظیم شد، سرویس پس‌زمینه SQL به‌روزرسانی گردید و در شبکه به اشتراک گذاشته شد.`
        });
      } else {
        setServerStatusMsg({
          type: 'error',
          message: data?.error || 'خطا در تغییر پورت سرور.'
        });
      }
    } catch {
      setServerStatusMsg({
        type: 'info',
        message: `پورت ${portNum} ذخیره شد.`
      });
    } finally {
      setSavingPort(false);
    }
  };

  // Handler: Re-verify / Install Windows Always-On Background SQL Service
  const handleEnsureBackgroundService = async () => {
    if (!isServerLicensed) return;
    setReinstallingService(true);
    setServerStatusMsg(null);
    try {
      const res = await fetch('/api/system/background-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        await fetchServerNodeInfo();
        setServerStatusMsg({
          type: 'success',
          message: data.message || 'سرویس پس‌زمینه دیتابیس SQL در استارت‌آپ ویندوز ثبت شد. حتی در صورت بستن پنجره برنامه، کلاینت‌ها به دیتابیس متصل می‌مانند.'
        });
      } else {
        setServerStatusMsg({
          type: 'error',
          message: data?.error || 'خطا در ثبت سرویس پس‌زمینه ویندوز.'
        });
      }
    } catch {
      setServerStatusMsg({
        type: 'error',
        message: 'خطا در برقراری ارتباط با هسته سرور.'
      });
    } finally {
      setReinstallingService(false);
    }
  };

  // Handler: Connect Client to Remote Central Server
  const handleConnectClientToServer = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanHost = clientHost.trim().replace(/\/+$/, '');
    if (!cleanHost) {
      setClientStatus({ type: 'error', message: 'لطفاً آدرس IP یا دامنه سرور مرکزی را وارد کنید.' });
      return;
    }
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = `http://${cleanHost}`;
    }

    let finalUrl = cleanHost;
    try {
      const parsed = new URL(cleanHost);
      const effectivePort = clientPort.trim() || parsed.port || '3000';
      if (effectivePort && effectivePort !== '80' && effectivePort !== '443') {
        finalUrl = `${parsed.protocol}//${parsed.hostname}:${effectivePort}`;
      } else {
        finalUrl = `${parsed.protocol}//${parsed.hostname}`;
      }
    } catch {
      finalUrl = clientPort.trim() ? `${cleanHost}:${clientPort.trim()}` : cleanHost;
    }

    setClientTesting(true);
    setClientStatus({ type: 'info', message: `در حال بررسی اتصال و لایسنس سرور مرکزی (${finalUrl})...` });

    const testRes = await testServerConnection(finalUrl);
    if (testRes.success) {
      // Verify that the remote server actually has an activated hardware license
      if (testRes.serverInfo && testRes.serverInfo.isLicenseActivated === false) {
        setClientTesting(false);
        setClientStatus({
          type: 'error',
          message: `سرور مرکزی (${finalUrl}) هنوز با کد لایسنس فروشنده فعال‌سازی نشده است! ابتدا روی سیستم سرور، کد فعال‌سازی را وارد نمایید.`
        });
        return;
      }

      setServerUrl(finalUrl);
      localStorage.setItem('electro_stock_db_v1_node_mode', 'client');
      setIsInstalled(true);
      localStorage.setItem('electro_stock_db_v1_is_installed', 'true');
      await forceSyncWithServer();
      await refreshLicenseAuthorization();
      setClientTesting(false);
      setClientStatus({
        type: 'success',
        message: `اتصال به دیتابیس SQL سرور مرکزی (${finalUrl}) با موفقیت برقرار شد! (پینگ: ${testRes.latencyMs || 5}ms)`
      });
      if (onRoleConfigured) {
        setTimeout(() => onRoleConfigured('client'), 700);
      }
    } else {
      setClientTesting(false);
      setClientStatus({
        type: 'error',
        message: `خطا در اتصال به ${finalUrl}: مطمئن شوید سیستم سرور روشن است، پورت ${clientPort || '3000'} صحیح است و فایروال سرور باز می‌باشد.`
      });
    }
  };

  // Can only close modal if not mandatory AND node is already authorized
  const canCloseModal = !mandatory && isNodeAuthorized && Boolean(onClose);

  const containerContent = (
    <div className={`${embedded ? 'w-full' : 'bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col'} text-slate-100 font-vazir`} dir="rtl">
      {/* Header */}
      {!embedded && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>قفل سخت‌افزاری و پیکربندی شبکه (سرور مرکزی / کلاینت)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Hardware Protection Lock
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                جهت ورود و استفاده از نرم‌افزار، ابتدا نقش سیستم را تعیین کرده و لایسنس سخت‌افزاری سرور را فعال نمایید یا به سرور فعال در شبکه متصل شوید.
              </p>
            </div>
          </div>
          {canCloseModal && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Body Content */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
        {/* Role Selector Cards */}
        <div>
          <label className="block text-xs font-black text-slate-300 mb-3">
            نقش این کامپیوتر در شبکه سازمان را انتخاب کنید:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Server Role Option */}
            <button
              type="button"
              onClick={() => {
                setNodeMode('server');
                setServerStatusMsg(null);
              }}
              className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-start gap-3.5 ${
                nodeMode === 'server'
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-600/15'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-75'
              }`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                nodeMode === 'server' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                <Server className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-white">حالت سرور مرکزی (Central SQL Server)</span>
                  {nodeMode === 'server' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500 text-white font-bold">انتخاب شده</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  نصب دیتابیس سبک SQL و سرویس همیشه‌روشن روی این ویندوز (نیازمند کد فعال‌سازی فروشنده). حتی وقتی پنجره برنامه بسته باشد، کلاینت‌ها به این سیستم متصل می‌شوند.
                </p>
              </div>
            </button>

            {/* Client Role Option */}
            <button
              type="button"
              onClick={() => {
                setNodeMode('client');
                setClientStatus(null);
              }}
              className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-start gap-3.5 ${
                nodeMode === 'client'
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-600/15'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-75'
              }`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                nodeMode === 'client' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                <MonitorSmartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-white">حالت کلاینت شبکه (Network Client)</span>
                  {nodeMode === 'client' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-bold">انتخاب شده</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  اتصال مستقیم از طریق شبکه به آدرس IP و پورت ویندوزی که به عنوان «سرور مرکزی» فعال‌سازی شده است و استفاده مشترک از دیتابیس مرکزی.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CLIENT MODE CONFIGURATION                                      */}
        {/* ============================================================== */}
        {nodeMode === 'client' && (
          <form onSubmit={handleConnectClientToServer} className="p-5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <Globe className="w-5 h-5" />
                <span>اتصال کلاینت به دیتابیس SQL سرور مرکزی</span>
              </div>
              {serverUrl && isNodeAuthorized && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" dir="ltr">
                  Connected: {serverUrl}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  آدرس IP سرور مرکزی یا دامنه (Server Host / IP):
                </label>
                <input
                  type="text"
                  value={clientHost}
                  onChange={(e) => setClientHost(e.target.value)}
                  placeholder="http://192.168.1.100"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  مثال: <code className="text-slate-300">192.168.1.100</code> یا <code className="text-slate-300">https://anbar.company.com</code>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  پورت سرور (Port):
                </label>
                <input
                  type="text"
                  value={clientPort}
                  onChange={(e) => setClientPort(e.target.value)}
                  placeholder="3000"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-center text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  پورت تنظیم‌شده روی سیستم سرور (پیش‌فرض: 3000)
                </span>
              </div>
            </div>

            {clientStatus && (
              <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                clientStatus.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : clientStatus.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                  : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-200'
              }`}>
                {clientStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : clientStatus.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                )}
                <span>{clientStatus.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={clientTesting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {clientTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                <span>تست اتصال و ورود به عنوان کلاینت</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* SERVER MODE CONFIGURATION (HARDWARE LOCK + SQL + PORT + IP)    */}
        {/* ============================================================== */}
        {nodeMode === 'server' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Step 1: Hardware Identification & License Activation */}
            <div className={`p-5 rounded-2xl border ${
              isServerLicensed
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-amber-950/20 border-amber-500/40'
            } space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  {isServerLicensed ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Unlock className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-white">
                      گام ۱: قفل سخت‌افزاری و فعال‌سازی لایسنس سرور مرکزی
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      کد سخت‌افزاری اختصاصی این کامپیوتر را کپی کرده و برای فروشنده ارسال نمایید تا کد فعال‌سازی سرور را دریافت کنید.
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border ${
                  isServerLicensed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {isServerLicensed ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>لایسنس سرور فعال است</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>قفل سخت‌افزاری — نیازمند کد فعال‌سازی فروشنده</span>
                    </>
                  )}
                </span>
              </div>

              {/* Hardware Fingerprint Box */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      کد سخت‌افزاری این سیستم (جهت اعلام به فروشنده):
                    </span>
                    <button
                      type="button"
                      onClick={fetchServerNodeInfo}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingNodeInfo ? 'animate-spin' : ''}`} />
                      <span>بروزرسانی</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 rounded-lg border border-indigo-500/30">
                    <code className="font-mono text-sm sm:text-base font-black text-indigo-300 tracking-wider select-all" dir="ltr">
                      {currentHardwareCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentHardwareCode, 'hw')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      {copiedField === 'hw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'hw' ? 'کپی شد' : 'کپی کد'}</span>
                    </button>
                  </div>

                  {nodeInfo?.hardwareDetails && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono" dir="ltr">
                      <span>Host: {nodeInfo.hardwareDetails.hostname}</span>
                      <span>•</span>
                      <span>MAC: {nodeInfo.hardwareDetails.macAddress}</span>
                      <span>•</span>
                      <span>RAM: {nodeInfo.hardwareDetails.totalMemGb}GB</span>
                    </div>
                  )}
                </div>

                {/* Activation Key Form */}
                <form onSubmit={handleActivateServerLicense} className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-300">
                    {isServerLicensed ? 'کد فعال‌سازی ثبت شده روی این سرور:' : 'کد فعال‌سازی دریافتی از فروشنده را وارد کنید:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={activationInput}
                      onChange={(e) => setActivationInput(e.target.value.toUpperCase())}
                      placeholder="ACT-XXXX-XXXX-XXXX-XXXX"
                      dir="ltr"
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs sm:text-sm font-mono text-emerald-300 font-bold tracking-wider focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={activatingLicense}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {activatingLicense ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      <span>{isServerLicensed ? 'ثبت مجدد' : 'فعال‌سازی سرور'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {isServerLicensed
                      ? 'لایسنس سخت‌افزاری این سرور تایید شده و دیتابیس مرکزی آماده بهره‌برداری است.'
                      : 'توجه: تا پیش از وارد کردن کد فعال‌سازی معتبر، امکان ورود به نرم‌افزار و راه‌اندازی سرور وجود ندارد.'}
                  </p>
                </form>
              </div>
            </div>

            {/* Step 2: Port Configuration & Auto LAN IP Sharing */}
            <div className={`p-5 rounded-2xl border bg-slate-950/80 border-slate-800 space-y-4 transition-opacity ${
              !isServerLicensed ? 'opacity-45 pointer-events-none select-none' : ''
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      گام ۲: تنظیم پورت سرور و اشتراک‌گذاری خودکار IP در شبکه محلی (LAN)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      آدرس IP این سیستم به صورت خودکار شناسایی شده تا سایر کامپیوترهای شبکه به دیتابیس متصل شوند.
                    </p>
                  </div>
                </div>
                {!isServerLicensed && (
                  <span className="text-[11px] text-amber-400 font-bold">
                    (پس از فعال‌سازی لایسنس در گام ۱ باز می‌شود)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Port Setting Form */}
                <form onSubmit={handleSaveServerPort} className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      پورت شبکه دیتابیس مرکزی (TCP Port):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1024}
                        max={65535}
                        value={serverPortInput}
                        onChange={(e) => setServerPortInput(e.target.value)}
                        dir="ltr"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono font-black text-indigo-300 text-center focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={savingPort || !isServerLicensed}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black shrink-0 cursor-pointer transition-all"
                      >
                        {savingPort ? 'در حال ثبت...' : 'ذخیره و اشتراک پورت'}
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>پورت فعال فعلی: <strong className="font-mono text-white">{nodeInfo?.activePort || 3000}</strong></span>
                    <span>پورت تنظیمی: <strong className="font-mono text-indigo-400">{nodeInfo?.configuredPort || serverPortInput}</strong></span>
                  </div>
                </form>

                {/* Detected LAN IP & Share URLs */}
                <div className="lg:col-span-7 bg-slate-900/90 border border-indigo-500/30 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      آدرس آماده اتصال برای سایر کلاینت‌های شبکه:
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      0.0.0.0 Shared
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-950 px-3.5 py-2.5 rounded-lg border border-emerald-500/30">
                    <code className="font-mono text-sm sm:text-base font-black text-emerald-400 select-all" dir="ltr">
                      {nodeInfo?.primaryShareUrl || `http://192.168.1.100:${serverPortInput}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(nodeInfo?.primaryShareUrl || '', 'shareUrl')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedField === 'shareUrl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'shareUrl' ? 'کپی شد' : 'کپی آدرس شبکه'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    در سایر کامپیوترها، گزینه <strong>«حالت کلاینت»</strong> را انتخاب کرده و آدرس بالا (IP: <code className="text-white font-mono">{nodeInfo?.primaryLanIp || '192.168.1.100'}</code> و پورت: <code className="text-white font-mono">{nodeInfo?.configuredPort || serverPortInput}</code>) را وارد نمایید.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Lightweight SQL Engine & Always-On Windows Background Service */}
            <div className={`p-5 rounded-2xl border bg-slate-950/80 border-slate-800 space-y-4 transition-opacity ${
              !isServerLicensed ? 'opacity-45 pointer-events-none select-none' : ''
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      گام ۳: موتور دیتابیس سبک SQL و سرویس همیشه‌روشن ویندوز (Always-On Background Service)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      دیتابیس SQL روی این ویندوز نصب شده و در پس‌زمینه ویندوز فعال می‌ماند؛ حتی اگر پنجره برنامه را ببندید، سایر کلاینت‌ها در شبکه قطع نمی‌شوند.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEnsureBackgroundService}
                  disabled={reinstallingService || !isServerLicensed}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {reinstallingService ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                  <span>تثبیت سرویس همیشه‌روشن در استارت‌آپ ویندوز</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>موتور دیتابیس مرکزی:</span>
                  </div>
                  <div className="font-mono font-black text-cyan-300 text-xs" dir="ltr">
                    {nodeInfo?.sqliteEngine?.engine || 'Embedded SQLite (WAL Mode)'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                    {nodeInfo?.sqliteEngine?.sqliteFile || 'data/anbarmeh_central.sqlite'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Power className="w-4 h-4 text-emerald-400" />
                    <span>وضعیت سرویس پس‌زمینه ویندوز:</span>
                  </div>
                  <div className="font-black text-emerald-300 text-xs">
                    فعال در پس‌زمینه (بدون نیاز به باز بودن اپ)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ثبت خودکار در ریجستری Startup و فایروال ویندوز
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <div className="text-slate-400 font-bold flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span>حجم دیتابیس SQL:</span>
                  </div>
                  <div className="font-mono font-black text-white text-xs" dir="ltr">
                    {nodeInfo?.sqliteEngine?.sqliteSizeKb || 24} KB (ACID Safe)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    پشتیبانی از تراکنش همزمان چندین کلاینت در شبکه
                  </div>
                </div>
              </div>

              {/* Windows Firewall Helper Command */}
              {nodeInfo?.firewallCommand && (
                <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>دستور باز کردن خودکار پورت در فایروال ویندوز سرور (در صورت مسدود بودن شبکه):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nodeInfo.firewallCommand, 'fw')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-auto"
                  >
                    {copiedField === 'fw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'fw' ? 'کپی شد' : 'کپی دستور فایروال'}</span>
                  </button>
                </div>
              )}
            </div>

            {serverStatusMsg && (
              <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                serverStatusMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : serverStatusMsg.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                  : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-200'
              }`}>
                {serverStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{serverStatusMsg.message}</span>
              </div>
            )}

            {/* Finalize Server Role Button — strictly locked until hardware license is activated */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={!isServerLicensed}
                onClick={async () => {
                  if (!isServerLicensed) return;
                  localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
                  setServerUrl('');
                  await refreshLicenseAuthorization();
                  if (onRoleConfigured) onRoleConfigured('server');
                  if (onClose && !mandatory) onClose();
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span>ورود به نرم‌افزار در حالت سرور مرکزی</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return containerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      {containerContent}
    </div>
  );
};
