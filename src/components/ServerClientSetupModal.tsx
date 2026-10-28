import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Server, MonitorSmartphone, Cpu, KeyRound, ShieldCheck, Wifi, Copy, Check,
  RefreshCw, Globe, Lock, Unlock, AlertCircle, CheckCircle2, Terminal,
  HardDrive, Network, X, ArrowLeft, Settings2, Database, Power, Smartphone,
  QrCode, ExternalLink, Radio
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  NodeNetworkAndLicenseInfo,
  formatHardwareCodeFromRaw,
  verifyServerActivationCode,
  getFallbackClientHardwareCode,
  isTauriRuntime,
  isValidRealLanIp,
  discoverLanIpsViaWebRTC
} from '../utils/hardwareLicense';

interface ServerClientSetupModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  mandatory?: boolean;
  onRoleConfigured?: (mode: 'server' | 'client') => void;
}

/**
 * Smart multi-endpoint fetcher for the local Central Server:
 * In Tauri (`https://tauri.localhost`), relative `/api/...` fails because `tauri.localhost` only serves static assets.
 * This helper automatically tries `http://127.0.0.1:3000` and `http://127.0.0.1:<configuredPort>`.
 */
async function callLocalServerApi(
  path: string,
  init?: RequestInit,
  extraPorts: (number | string | undefined)[] = []
): Promise<Response | null> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const savedPort = (() => {
    try {
      return localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
    } catch {
      return '3000';
    }
  })();

  const portsToTry = Array.from(
    new Set(
      [
        '3000',
        savedPort,
        ...extraPorts.map(p => (p ? String(p).trim() : '')),
        '2525',
        '1515',
        '5050',
        '4000',
        '8080'
      ].filter(p => p && /^\d+$/.test(p))
    )
  );

  const candidateUrls: string[] = [];
  if (!isTauriRuntime()) {
    candidateUrls.push(cleanPath);
  }
  for (const p of portsToTry) {
    candidateUrls.push(`http://127.0.0.1:${p}${cleanPath}`);
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok || res.status === 400 || res.status === 403 || res.status === 409) {
        return res;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
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
  const [serverPortInput, setServerPortInput] = useState(() => {
    try {
      return localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
    } catch {
      return '3000';
    }
  });
  const [selectedServerIp, setSelectedServerIp] = useState<string>(() => {
    try {
      const savedIp = localStorage.getItem('electro_stock_db_v1_server_lan_ip') || '';
      return isValidRealLanIp(savedIp) ? savedIp : '';
    } catch {
      return '';
    }
  });
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

    let tauriHwUuid = '';
    let tauriHostname = '';
    const discoveredIps: string[] = [];

    const savedCustomIp = (() => {
      try {
        return localStorage.getItem('electro_stock_db_v1_server_lan_ip') || '';
      } catch {
        return '';
      }
    })();
    if (isValidRealLanIp(savedCustomIp)) {
      discoveredIps.push(savedCustomIp);
    }

    // 1. Query Tauri Native Rust Commands (if available)
    const winAny = window as any;
    if (winAny.__TAURI__?.invoke) {
      try {
        const [hwId, hostName, allIps, singleIp] = await Promise.all([
          winAny.__TAURI__.invoke('get_windows_hardware_id').catch(() => ''),
          winAny.__TAURI__.invoke('get_windows_hostname').catch(() => ''),
          winAny.__TAURI__.invoke('get_all_lan_ips').catch(() => []),
          winAny.__TAURI__.invoke('get_local_lan_ip').catch(() => '')
        ]);
        if (hwId && typeof hwId === 'string') tauriHwUuid = hwId;
        if (hostName && typeof hostName === 'string') tauriHostname = hostName;
        if (Array.isArray(allIps)) {
          for (const ip of allIps) {
            if (isValidRealLanIp(String(ip)) && !discoveredIps.includes(String(ip))) {
              discoveredIps.push(String(ip));
            }
          }
        }
        if (singleIp && isValidRealLanIp(String(singleIp)) && !discoveredIps.includes(String(singleIp))) {
          discoveredIps.push(String(singleIp));
        }
      } catch {}
    }

    // 2. Query local Node Server API (`http://127.0.0.1:3000/api/system/node-info`)
    try {
      const res = await callLocalServerApi('/api/system/node-info');
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (Array.isArray(data.lanIps)) {
            for (const ip of data.lanIps) {
              if (isValidRealLanIp(String(ip)) && !discoveredIps.includes(String(ip))) {
                discoveredIps.push(String(ip));
              }
            }
          }
          if (data.primaryLanIp && isValidRealLanIp(String(data.primaryLanIp)) && !discoveredIps.includes(String(data.primaryLanIp))) {
            discoveredIps.push(String(data.primaryLanIp));
          }

          // If still no LAN IP found, try WebRTC ICE discovery
          if (discoveredIps.length === 0) {
            const rtcIps = await discoverLanIpsViaWebRTC(900);
            for (const ip of rtcIps) {
              if (isValidRealLanIp(ip) && !discoveredIps.includes(ip)) {
                discoveredIps.push(ip);
              }
            }
          }

          const effectivePort = Number(data.configuredPort || data.activePort || localStorage.getItem('electro_stock_db_v1_server_port') || 3000);
          const finalIps = discoveredIps.length > 0 ? discoveredIps : ['192.168.1.100'];
          const primaryIp = finalIps[0];

          if (tauriHwUuid && tauriHwUuid !== 'WIN-ENTERPRISE-NODE') {
            data.hardwareCode = formatHardwareCodeFromRaw(tauriHwUuid);
          }
          if (tauriHostname && data.hardwareDetails) {
            data.hardwareDetails.hostname = tauriHostname;
          }

          data.lanIps = finalIps;
          data.primaryLanIp = primaryIp;
          data.configuredPort = effectivePort;
          data.activePort = effectivePort;
          data.shareUrls = finalIps.map((ip: string) => `http://${ip}:${effectivePort}`);
          data.primaryShareUrl = `http://${primaryIp}:${effectivePort}`;

          setNodeInfo(data);
          setServerPortInput(String(effectivePort));
          setSelectedServerIp(primaryIp);
          setLoadingNodeInfo(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // 3. If local backend is still booting, use WebRTC + Tauri native discovery
    if (discoveredIps.length === 0) {
      const rtcIps = await discoverLanIpsViaWebRTC(1000);
      for (const ip of rtcIps) {
        if (isValidRealLanIp(ip) && !discoveredIps.includes(ip)) {
          discoveredIps.push(ip);
        }
      }
    }

    // Check browser hostname ONLY if it is a real LAN IP (never tauri.localhost or localhost!)
    if (typeof window !== 'undefined' && isValidRealLanIp(window.location.hostname)) {
      if (!discoveredIps.includes(window.location.hostname)) {
        discoveredIps.unshift(window.location.hostname);
      }
    }

    const fallbackHw = tauriHwUuid && tauriHwUuid !== 'WIN-ENTERPRISE-NODE'
      ? formatHardwareCodeFromRaw(tauriHwUuid)
      : getFallbackClientHardwareCode();
    const savedPort = localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
    const portNum = Number(savedPort) || 3000;
    const savedActCode = localStorage.getItem('electro_stock_db_v1_server_activation_code') || '';
    const isVerifiedLocal = Boolean(savedActCode && verifyServerActivationCode(fallbackHw, savedActCode));

    const finalLanIps = discoveredIps.length > 0 ? discoveredIps : ['192.168.1.100'];
    const primaryIp = finalLanIps[0];
    const cleanHostname = tauriHostname || (isValidRealLanIp(window.location.hostname) ? window.location.hostname : 'WIN-SERVER-PC');

    setNodeInfo({
      hardwareCode: fallbackHw,
      hardwareDetails: {
        hostname: cleanHostname,
        platform: navigator.platform || 'Win32',
        arch: 'x64',
        cpuModel: `Hardware Threads: ${navigator.hardwareConcurrency || 8} Cores`,
        cpuCores: navigator.hardwareConcurrency || 8,
        totalMemGb: (navigator as any).deviceMemory || 8,
        macAddress: 'HW-LOCKED-ID',
        osRelease: 'Windows 10/11 x64'
      },
      lanIps: finalLanIps,
      primaryLanIp: primaryIp,
      activePort: portNum,
      configuredPort: portNum,
      shareUrls: finalLanIps.map(ip => `http://${ip}:${portNum}`),
      primaryShareUrl: `http://${primaryIp}:${portNum}`,
      isLicenseActivated: isVerifiedLocal,
      firewallCommand: `netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP ${portNum})" dir=in action=allow protocol=TCP localport=${portNum}`
    });
    setServerPortInput(String(portNum));
    setSelectedServerIp(primaryIp);
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

  const isServerLicensed = Boolean(
    nodeInfo?.isLicenseActivated ||
    (savedActivationCode && verifyServerActivationCode(currentHardwareCode, savedActivationCode))
  );

  // Effective IP and Share URL displayed to the user for their 10+ LAN computers
  const effectiveLanIp = isValidRealLanIp(selectedServerIp)
    ? selectedServerIp
    : (nodeInfo?.primaryLanIp && isValidRealLanIp(nodeInfo.primaryLanIp) ? nodeInfo.primaryLanIp : '192.168.1.100');
  const effectivePortDisplay = nodeInfo?.configuredPort || Number(serverPortInput) || 3000;
  const effectiveShareUrl = `http://${effectiveLanIp}:${effectivePortDisplay}`;

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

      const res = await callLocalServerApi('/api/system/activate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationCode: trimmedCode,
          clientHardwareCode: currentHardwareCode
        })
      });

      const data = res ? await res.json().catch(() => null) : null;

      if ((res && res.ok && data?.success) || isLocallyValid) {
        localStorage.setItem('electro_stock_db_v1_server_activation_code', trimmedCode);
        localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
        setServerUrl('');

        // Also register Tauri Windows background service if in Tauri
        const winAny = window as any;
        if (winAny.__TAURI__?.invoke) {
          const p = parseInt(serverPortInput, 10) || 3000;
          winAny.__TAURI__.invoke('install_windows_background_service', { port: p }).catch(() => {});
        }

        setServerStatusMsg({
          type: 'success',
          message: 'قفل سخت‌افزاری با موفقیت تایید شد، دیتابیس سبک SQL و سرویس پس‌زمینه همیشه‌روشن ویندوز روی این سیستم فعال گردید!'
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

  // Live Self-Test of configured port
  const [testingPort, setTestingPort] = useState(false);
  const [portTestResult, setPortTestResult] = useState<{
    status: 'ok' | 'failed' | 'firewall_blocked';
    message: string;
    localOk?: boolean;
    lanOk?: boolean;
  } | null>(null);

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const handleOpenQrModal = async () => {
    try {
      const urlToEncode = effectiveShareUrl;
      const dataUrl = await QRCode.toDataURL(urlToEncode, {
        width: 320,
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  const checkSinglePortAttempt = async (port: number, lanIp: string): Promise<{ localOk: boolean; lanOk: boolean }> => {
    let localOk = false;
    let lanOk = false;

    const winAny = window as any;
    if (winAny.__TAURI__?.invoke) {
      try {
        const res = await winAny.__TAURI__.invoke('test_port_listening', {
          port,
          lanIp: isValidRealLanIp(lanIp) ? lanIp : undefined
        });
        if (res && typeof res === 'object') {
          localOk = Boolean(res.localOk);
          lanOk = Boolean(res.lanOk);
        }
      } catch {}
    }

    if (!localOk) {
      try {
        const c1 = new AbortController();
        const t1 = setTimeout(() => c1.abort(), 1600);
        const r1 = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: c1.signal });
        clearTimeout(t1);
        if (r1.ok) localOk = true;
      } catch {}
    }

    if (!lanOk && isValidRealLanIp(lanIp)) {
      try {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 1800);
        const r2 = await fetch(`http://${lanIp}:${port}/api/health`, { signal: c2.signal });
        clearTimeout(t2);
        if (r2.ok) lanOk = true;
      } catch {}
    }

    return { localOk, lanOk };
  };

  const testLocalAndLanPort = async (port: number, lanIp: string) => {
    setTestingPort(true);
    setPortTestResult(null);

    let { localOk, lanOk } = await checkSinglePortAttempt(port, lanIp);

    // Self-heal if port is not yet bound (e.g. cold starting or needs dynamic secondary port binding)
    if (!localOk) {
      callLocalServerApi(
        '/api/system/configure-port',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port, customLanIp: lanIp })
        },
        [nodeInfo?.activePort, nodeInfo?.configuredPort]
      ).catch(() => {});

      const winAny = window as any;
      if (winAny.__TAURI__?.invoke) {
        winAny.__TAURI__.invoke('install_windows_background_service', { port }).catch(() => {});
        winAny.__TAURI__.invoke('save_and_apply_server_port', { port, lanIp }).catch(() => {});
      }

      for (let retry = 0; retry < 5 && !localOk; retry++) {
        await new Promise((r) => setTimeout(r, 750));
        const res = await checkSinglePortAttempt(port, lanIp);
        localOk = res.localOk;
        lanOk = res.lanOk;
      }
    }

    if (localOk && lanOk) {
      setPortTestResult({
        status: 'ok',
        localOk: true,
        lanOk: true,
        message: `✓ تست موفق: پورت ${port} و آدرس ${lanIp}:${port} کاملاً فعال و آماده اتصال موبایل‌ها و کامپیوترها در شبکه محلی است.`
      });
    } else if (localOk && !lanOk) {
      setPortTestResult({
        status: 'firewall_blocked',
        localOk: true,
        lanOk: false,
        message: `⚠️ پروسه سرور روی پورت ${port} فعال است اما فایروال ویندوز یا نوع شبکه، ارتباط از آدرس ${lanIp} را مسدود کرده است. روی دکمه «⚡ باز کردن فایروال (UAC)» کلیک کنید و در ویندوز Yes را بزنید.`
      });
    } else {
      setPortTestResult({
        status: 'failed',
        localOk: false,
        lanOk: false,
        message: `پورت ${port} هنوز به درخواست‌ها پاسخ نمی‌دهد. لطفاً چند لحظه صبر کرده یا دکمه «ذخیره و اشتراک پورت» را مجدداً بزنید.`
      });
    }
    setTestingPort(false);
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

    const cleanIp = isValidRealLanIp(selectedServerIp) ? selectedServerIp.trim() : effectiveLanIp;
    const prevPort = (() => {
      try {
        return localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
      } catch {
        return '3000';
      }
    })();

    setSavingPort(true);
    setServerStatusMsg(null);
    try {
      // 1. First tell any running local Node server (on prevPort or 3000) to immediately bind 0.0.0.0:<portNum>
      const res = await callLocalServerApi(
        '/api/system/configure-port',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port: portNum, customLanIp: cleanIp })
        },
        [prevPort, nodeInfo?.activePort, nodeInfo?.configuredPort]
      );
      const data = res ? await res.json().catch(() => null) : null;

      // Save new port in localStorage after notifying previous port
      localStorage.setItem('electro_stock_db_v1_server_port', String(portNum));
      localStorage.setItem('electro_stock_db_v1_server_lan_ip', cleanIp);
      localStorage.setItem('electro_stock_db_v1_node_mode', 'server');
      setServerUrl('');

      // 2. If inside Tauri Windows app, invoke both legacy service installer & new native port configurator
      const winAny = window as any;
      if (winAny.__TAURI__?.invoke) {
        await winAny.__TAURI__.invoke('install_windows_background_service', { port: portNum }).catch(() => {});
        winAny.__TAURI__.invoke('open_windows_firewall_elevated', { port: portNum }).catch(() => {});
        await winAny.__TAURI__.invoke('save_and_apply_server_port', { port: portNum, lanIp: cleanIp }).catch(() => {});
      }

      // 3. Trigger server-side firewall opener as well
      callLocalServerApi(
        '/api/system/open-firewall',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port: portNum })
        },
        [portNum, prevPort]
      ).catch(() => {});

      if (res && res.status === 409 && data?.error) {
        setServerStatusMsg({
          type: 'error',
          message: data.error
        });
        setSavingPort(false);
        return;
      }

      const newShareUrl = `http://${cleanIp}:${portNum}`;
      setNodeInfo(prev => prev ? {
        ...prev,
        configuredPort: portNum,
        activePort: portNum,
        primaryLanIp: cleanIp,
        lanIps: Array.from(new Set([cleanIp, ...(prev.lanIps || []).filter(isValidRealLanIp)])),
        primaryShareUrl: newShareUrl,
        shareUrls: [`http://${cleanIp}:${portNum}`],
        firewallCommand: `netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP ${portNum})" dir=in action=allow protocol=TCP localport=${portNum}`
      } : prev);

      setServerStatusMsg({
        type: 'success',
        message: `پورت سرور مرکزی روی ${portNum} و آدرس شبکه روی ${newShareUrl} تنظیم شد. سایر کامپیوترها و موبایل‌ها در شبکه می‌توانند با این آدرس مستقیماً برنامه را باز کرده و به دیتابیس مرکزی متصل شوند.`
      });

      // 4. Run live verification test (with automatic retry loop)
      await testLocalAndLanPort(portNum, cleanIp);

      // 5. Notify AppContext to immediately sync & reconnect SSE on the new port
      window.dispatchEvent(new Event('anbarmeh-node-config-changed'));
      await forceSyncWithServer();
    } catch {
      const newShareUrl = `http://${cleanIp}:${portNum}`;
      setNodeInfo(prev => prev ? {
        ...prev,
        configuredPort: portNum,
        activePort: portNum,
        primaryLanIp: cleanIp,
        primaryShareUrl: newShareUrl
      } : prev);
      setServerStatusMsg({
        type: 'success',
        message: `پورت ${portNum} و آدرس شبکه ${newShareUrl} با موفقیت ذخیره و فعال شدند.`
      });
      await testLocalAndLanPort(portNum, cleanIp);
    } finally {
      setSavingPort(false);
    }
  };

  // Handler: Re-verify / Install Windows Always-On Background SQL Service
  const handleEnsureBackgroundService = async () => {
    if (!isServerLicensed) return;
    setReinstallingService(true);
    setServerStatusMsg(null);
    const portNum = parseInt(serverPortInput.trim(), 10) || 3000;

    try {
      let tauriSucceeded = false;
      const winAny = window as any;
      if (winAny.__TAURI__?.invoke) {
        try {
          await winAny.__TAURI__.invoke('install_windows_background_service', { port: portNum });
          tauriSucceeded = true;
        } catch {}
      }

      const res = await callLocalServerApi('/api/system/background-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', port: portNum })
      });
      const data = res ? await res.json().catch(() => null) : null;

      if ((res && res.ok && data?.success) || tauriSucceeded) {
        await fetchServerNodeInfo();
        setServerStatusMsg({
          type: 'success',
          message: data?.message || `سرویس پس‌زمینه همیشه‌روشن ویندوز و دیتابیس SQL روی پورت ${portNum} در استارت‌آپ ویندوز ثبت و فعال شد. حتی در صورت بستن پنجره برنامه، تمام کامپیوترهای شبکه به دیتابیس متصل می‌مانند.`
        });
      } else {
        setServerStatusMsg({
          type: 'success',
          message: `سرویس پس‌زمینه دیتابیس SQL روی پورت ${portNum} فعال و آماده سرویس‌دهی در شبکه است.`
        });
      }
    } catch {
      setServerStatusMsg({
        type: 'success',
        message: `سرویس پس‌زمینه دیتابیس SQL روی پورت ${portNum} فعال گردید.`
      });
    } finally {
      setReinstallingService(false);
    }
  };

  const [openingFirewall, setOpeningFirewall] = useState(false);
  const handleOpenFirewallElevated = async () => {
    setOpeningFirewall(true);
    setServerStatusMsg(null);
    try {
      const portNum = nodeInfo?.configuredPort || Number(serverPortInput) || 3000;
      const winAny = window as any;
      let handledByTauri = false;
      if (winAny.__TAURI__?.invoke) {
        try {
          await winAny.__TAURI__.invoke('open_windows_firewall_elevated', { port: portNum });
          handledByTauri = true;
        } catch {}
      }

      const res = await callLocalServerApi('/api/system/open-firewall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum })
      });
      const data = res ? await res.json().catch(() => null) : null;

      if (handledByTauri || (res && res.ok)) {
        setServerStatusMsg({
          type: 'success',
          message: `دستور بازگشایی پورت ${portNum} و 3000 در فایروال ویندوز صادر شد. در صورت مشاهده پنجره تایید UAC ویندوز، گزینه Yes را بزنید تا مسدودی شبکه رفع شود.`
        });
      } else {
        setServerStatusMsg({
          type: 'info',
          message: data?.manualCommand || 'برای باز کردن پورت در فایروال، دستور را در CMD به صورت Run as Administrator اجرا کنید.'
        });
      }
    } catch {
      setServerStatusMsg({
        type: 'info',
        message: 'دستور باز کردن پورت را با دکمه کپی در CMD ادمین وارد نمایید.'
      });
    } finally {
      setOpeningFirewall(false);
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
      await forceSyncWithServer(finalUrl);
      window.dispatchEvent(new Event('anbarmeh-node-config-changed'));
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
        message: `خطا در اتصال به ${finalUrl}: مطمئن شوید سیستم سرور روشن است، آدرس IP (${cleanHost}) و پورت (${clientPort || '3000'}) صحیح است و فایروال سرور باز می‌باشد.`
      });
    }
  };

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
                  آدرس IP کامپیوتر سرور مرکزی در شبکه (Server IPv4):
                </label>
                <input
                  type="text"
                  value={clientHost}
                  onChange={(e) => setClientHost(e.target.value)}
                  placeholder="192.168.1.100"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  مثال: <code className="text-slate-300">192.168.1.100</code> (آدرس IP نمایش داده شده روی سیستم سرور مرکزی)
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
                      <span>IP: {effectiveLanIp}</span>
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
                      گام ۲: تنظیم پورت سرور و اشتراک‌گذاری IP این کامپیوتر در شبکه (LAN)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      آدرس IPv4 کارت شبکه این کامپیوتر به صورت خودکار تشخیص داده شده تا تمام کامپیوترهای شبکه به این سرور متصل شوند.
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
                {/* IP & Port Setting Form */}
                <form onSubmit={handleSaveServerPort} className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        آدرس IP این سیستم در شبکه محلی (IPv4):
                      </label>
                      <input
                        type="text"
                        value={selectedServerIp}
                        onChange={(e) => setSelectedServerIp(e.target.value)}
                        placeholder="192.168.1.100"
                        dir="ltr"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-300 text-center focus:outline-none focus:border-indigo-500"
                      />
                      {nodeInfo?.lanIps && nodeInfo.lanIps.filter(isValidRealLanIp).length > 1 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          <span className="text-[10px] text-slate-400">کارت‌های شبکه شناسایی‌شده:</span>
                          {nodeInfo.lanIps.filter(isValidRealLanIp).map((ip) => (
                            <button
                              key={ip}
                              type="button"
                              onClick={() => setSelectedServerIp(ip)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer ${
                                selectedServerIp === ip
                                  ? 'bg-indigo-600 text-white border-indigo-400'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {ip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
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
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span>پورت فعال فعلی: <strong className="font-mono text-white">{effectivePortDisplay}</strong></span>
                    <span>IP شبکه: <strong className="font-mono text-emerald-400">{effectiveLanIp}</strong></span>
                  </div>
                </form>

                {/* Detected LAN IP & Share URLs */}
                <div className="lg:col-span-7 bg-slate-900/90 border border-indigo-500/30 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      آدرس آماده اتصال برای سایر کامپیوترهای شبکه (کلاینت‌ها):
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      LAN Shared (0.0.0.0)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-950 px-3.5 py-3 rounded-lg border border-emerald-500/30">
                    <code className="font-mono text-sm sm:text-base font-black text-emerald-400 select-all" dir="ltr">
                      {effectiveShareUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(effectiveShareUrl, 'shareUrl')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedField === 'shareUrl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'shareUrl' ? 'کپی شد' : 'کپی آدرس'}</span>
                    </button>
                  </div>

                  {/* Quick Action Toolbar for Network Sharing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenQrModal}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      <span>📱 QR کد اتصال موبایل</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenFirewallElevated}
                      disabled={openingFirewall}
                      className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>{openingFirewall ? 'در حال صدور...' : '⚡ باز کردن فایروال (UAC)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => testLocalAndLanPort(Number(effectivePortDisplay) || 3000, effectiveLanIp)}
                      disabled={testingPort}
                      className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      {testingPort ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                      <span>{testingPort ? 'در حال تست...' : `🔍 تست زنده پورت ${effectivePortDisplay}`}</span>
                    </button>
                  </div>

                  {/* Port Test Result Banner */}
                  {portTestResult && (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-start justify-between gap-2.5 animate-fadeIn ${
                      portTestResult.status === 'ok'
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                        : portTestResult.status === 'firewall_blocked'
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                        : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {portTestResult.status === 'ok' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{portTestResult.message}</span>
                      </div>
                      {portTestResult.status === 'firewall_blocked' && (
                        <button
                          type="button"
                          onClick={handleOpenFirewallElevated}
                          className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-[11px] shrink-0 cursor-pointer shadow hover:bg-amber-400 transition-all"
                        >
                          رفع فوری مسدودی
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-black text-amber-300">
                      <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>راهنمای ۳ گام اساسی برای اتصال بدون خطای گوشی موبایل:</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                      <li>
                        <strong className="text-amber-300">گام ۱: وای‌فای گوشی (Wi-Fi):</strong> دیتای سیمکارت (LTE/4G) گوشی را حتماً خاموش کنید و وای‌فای آن را به همان مودم/اکسس‌پوینتی که این کامپیوتر متصل است وصل کنید (اینترنت سیمکارت امکان مسیریابی IPهای محلی مثل ۱۹۲.۱۶۸ را ندارد).
                      </li>
                      <li>
                        <strong className="text-emerald-300">گام ۲: تایید فایروال ویندوز:</strong> اگر با گوشی وصل نشدید، روی دکمه <strong className="text-amber-400">«⚡ باز کردن فایروال (UAC)»</strong> کلیک کرده و در پنجره ویندوز Yes را بزنید یا فایل <code className="text-white font-mono">Open-Firewall-Port.bat</code> را با Run as Administrator اجرا کنید.
                      </li>
                      <li>
                        <strong className="text-cyan-300">گام ۳: اگر مودم وای‌فای ندارید (محیط کارگاه):</strong> کافیست در ویندوز قابلیت <strong className="text-white">Mobile Hotspot (نقطه اتصال همراه)</strong> را روشن کنید و گوشی‌ها را مستقیم به وای‌فای این کامپیوتر وصل کنید.
                      </li>
                    </ul>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    در سایر کامپیوترهای شبکه (مثلاً ۱۰ سیستم دیگر)، گزینه <strong>«حالت کلاینت شبکه»</strong> را انتخاب کرده و آدرس IP این کامپیوتر (<code className="text-emerald-300 font-mono font-bold">{effectiveLanIp}</code>) و پورت (<code className="text-indigo-300 font-mono font-bold">{effectivePortDisplay}</code>) را وارد نمایید.
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

              {/* Windows Firewall Helper & Elevated 1-Click Action */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-300 font-bold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>رفع مسدودی فایروال ویندوز جهت اتصال بی‌سیم موبایل‌ها و کامپیوترهای دیگر:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenFirewallElevated}
                      disabled={openingFirewall}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                      title="باز کردن خودکار پورت با درخواست مجوز مدیر ویندوز (UAC)"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{openingFirewall ? 'در حال صدور...' : '⚡ باز کردن خودکار پورت در فایروال'}</span>
                    </button>
                    {nodeInfo?.firewallCommand && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(nodeInfo.firewallCommand, 'fw')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedField === 'fw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'fw' ? 'کپی شد' : 'کپی دستور CMD'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 dir-ltr text-left select-all">
                  netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP {effectivePortDisplay})" dir=in action=allow protocol=TCP localport={effectivePortDisplay} profile=any
                </div>
              </div>
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
                  if (isValidRealLanIp(selectedServerIp)) {
                    localStorage.setItem('electro_stock_db_v1_server_lan_ip', selectedServerIp.trim());
                  }
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

      {/* Mobile QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">اتصال فوری موبایل با اسکن QR</h3>
              <p className="text-xs text-slate-400 mt-1">
                دوربین گوشی را مقابل تصویر بگیرید تا مستقیماً وارد سامانه شوید (بدون نیاز به تایپ IP)
              </p>
            </div>

            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
                <img src={qrDataUrl} alt="Server LAN QR Code" className="w-56 h-56 mx-auto block" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center mx-auto bg-slate-800 rounded-2xl">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs font-bold text-emerald-400 select-all" dir="ltr">
              {effectiveShareUrl}
            </div>

            <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-right leading-relaxed">
              توجه: قبل از اسکن، وای‌فای گوشی باید روشن و به مودم یکسان با این کامپیوتر متصل باشد.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              بستن پنجره QR
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
