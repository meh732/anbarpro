/**
 * AnbarMeh Enterprise - Hardware Fingerprint & Server License Verification Engine
 * قفل سخت‌افزاری، احراز هویت سرور مرکزی و موتور تولید کد فعال‌سازی فروشنده (Keygen)
 */

const SELLER_MASTER_SECRET = 'ANBARMEH_ERP_WINDOWS_SERVER_MASTER_KEY_2026_#9981_ENTERPRISE';
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 without ambiguous 0/O/1/I

/**
 * Deterministic 32-bit FNV-1a + Murmur-style mixing for cross-platform (Node + Browser + Rust) consistency
 */
function computeDeterministicBytes(input: string, rounds: number = 16): number[] {
  const bytes: number[] = [];
  for (let r = 0; r < rounds; r++) {
    let h1 = (0x811c9dc5 ^ (r * 0x9e3779b9)) >>> 0;
    let h2 = (0x85ebca6b ^ (r * 0xc2b2ae35)) >>> 0;
    const str = `${SELLER_MASTER_SECRET}::R${r}::${input}::${SELLER_MASTER_SECRET}`;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ ((ch << 5) | (ch >>> 3)), 0x27d4eb2d) >>> 0;
      h1 = ((h1 << 13) | (h1 >>> 19)) ^ h2;
    }
    bytes.push((h1 ^ (h2 >>> 8)) & 0xff);
  }
  return bytes;
}

/**
 * Normalizes a raw hardware string into a standard 12-char Hardware Request Code:
 * Format: AMH-XXXX-XXXX-XXXX
 */
export function formatHardwareCodeFromRaw(rawFingerprint: string): string {
  const clean = (rawFingerprint || 'DEFAULT-WIN-PC').trim().toUpperCase();
  // If already in AMH-XXXX-XXXX-XXXX format, normalize and return
  const existingMatch = clean.replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('AMH-') && existingMatch.length === 15) {
    const body = existingMatch.slice(3);
    return `AMH-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
  }

  const hashBytes = computeDeterministicBytes(`HW_FINGERPRINT::${clean}`, 12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += ALPHABET[hashBytes[i] % ALPHABET.length];
  }
  return `AMH-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/**
 * Generates the official Seller Activation Code for a given customer Hardware Code.
 * Input:  AMH-XXXX-XXXX-XXXX
 * Output: ACT-XXXX-XXXX-XXXX-XXXX
 */
export function generateActivationCodeForHardware(hardwareCode: string): string {
  const cleanHw = hardwareCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const coreHw = cleanHw.startsWith('AMH') ? cleanHw.slice(3) : cleanHw;
  if (!coreHw || coreHw.length < 6) {
    return '';
  }

  const normalizedHw = `AMH-${coreHw.slice(0, 4)}-${coreHw.slice(4, 8)}-${coreHw.slice(8, 12)}`;
  const licenseBytes = computeDeterministicBytes(`SERVER_ACTIVATION_LICENSE::${normalizedHw}`, 16);

  let chars = '';
  for (let i = 0; i < 16; i++) {
    chars += ALPHABET[licenseBytes[i] % ALPHABET.length];
  }

  return `ACT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}`;
}

/**
 * Verifies whether a user-supplied Activation Code matches this machine's Hardware Code.
 */
export function verifyServerActivationCode(hardwareCode: string, activationCode: string): boolean {
  if (!hardwareCode || !activationCode) return false;
  const expected = generateActivationCodeForHardware(hardwareCode);
  if (!expected) return false;

  const cleanInput = activationCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanExpected = expected.replace(/[^A-Z0-9]/g, '');

  // Support with or without leading 'ACT' prefix
  const normalizedInput = cleanInput.startsWith('ACT') ? cleanInput : `ACT${cleanInput}`;
  return normalizedInput === cleanExpected;
}

/**
 * Fallback browser-based hardware fingerprint if Tauri/Node backend is unreachable
 */
export function getFallbackClientHardwareCode(): string {
  const STORAGE_HW_KEY = 'electro_stock_db_v1_device_hw_seed';
  try {
    let seed = localStorage.getItem(STORAGE_HW_KEY);
    if (!seed) {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      const scr = typeof screen !== 'undefined' ? screen : null;
      const sysInfo = [
        nav?.platform || 'Win32',
        nav?.hardwareConcurrency || 8,
        (nav as any)?.deviceMemory || 8,
        scr ? `${scr.width}x${scr.height}x${scr.colorDepth}` : '1920x1080',
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran'
      ].join('|');
      seed = sysInfo;
      localStorage.setItem(STORAGE_HW_KEY, seed);
    }
    return formatHardwareCodeFromRaw(seed);
  } catch {
    return formatHardwareCodeFromRaw('WIN32-DESKTOP-FALLBACK');
  }
}

export interface NodeNetworkAndLicenseInfo {
  hardwareCode: string;
  hardwareDetails: {
    hostname: string;
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemGb: number;
    macAddress: string;
    osRelease: string;
  };
  lanIps: string[];
  primaryLanIp: string;
  activePort: number;
  configuredPort: number;
  shareUrls: string[];
  primaryShareUrl: string;
  isLicenseActivated: boolean;
  activatedAt?: string | null;
  maskedLicenseKey?: string | null;
  firewallCommand: string;
  elevatedFirewallCommand?: string;
  sqliteEngine?: {
    enabled?: boolean;
    engine?: string;
    sqliteFile?: string;
    sqliteSizeKb?: number;
  };
  backgroundService?: {
    isWindows?: boolean;
    isServiceInstalled?: boolean;
    isRunningInBackground?: boolean;
    configuredPort?: number;
    sqlitePath?: string;
    runnerScriptPath?: string;
    vbsLauncherPath?: string;
  };
}

/**
 * Checks if the frontend is running inside a Windows Tauri WebView (e.g. https://tauri.localhost or tauri://localhost)
 */
export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  const proto = (window.location.protocol || '').toLowerCase();
  const winAny = window as any;
  return (
    host === 'tauri.localhost' ||
    host.endsWith('.tauri.localhost') ||
    proto === 'tauri:' ||
    Boolean(winAny.__TAURI__ || winAny.__TAURI_IPC__ || winAny.__TAURI_METADATA__)
  );
}

/**
 * Returns the base URL for the local embedded Node/SQL server.
 * Inside Tauri WebView (`https://tauri.localhost`), relative `/api/...` fails because `tauri.localhost` is a static asset protocol.
 * Therefore, in Tauri it must point to `http://127.0.0.1:<port>`.
 */
export function getLocalServerBaseUrl(): string {
  if (!isTauriRuntime()) return '';
  let port = '3000';
  try {
    port = localStorage.getItem('electro_stock_db_v1_server_port') || '3000';
  } catch {}
  return `http://127.0.0.1:${port}`;
}

/**
 * Resolves any `/api/...` path to either the remote Server URL (Client mode),
 * the local Node server `http://127.0.0.1:<port>` (Tauri Server mode), or relative `/api/...` (Web browser mode).
 * For phones and client browsers connecting over LAN, seamlessly routes to `window.location.origin`.
 */
export function resolveBackendApiUrl(path: string, customServerUrl?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const trimmedCustom = (customServerUrl || '').trim().replace(/\/+$/, '');
  if (trimmedCustom) {
    return `${trimmedCustom}${cleanPath}`;
  }
  try {
    const mode = localStorage.getItem('electro_stock_db_v1_node_mode');
    const savedRemoteUrl = (localStorage.getItem('electro_stock_db_v1_serverUrl') || '').trim().replace(/\/+$/, '');
    if (mode === 'client' && savedRemoteUrl) {
      return `${savedRemoteUrl}${cleanPath}`;
    }
  } catch {}
  // If running in browser on a remote LAN device (phone, laptop, tablet):
  if (!isTauriRuntime() && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.localhost')) {
      return `${window.location.origin}${cleanPath}`;
    }
  }
  const localBase = getLocalServerBaseUrl();
  return `${localBase}${cleanPath}`;
}

/**
 * Checks whether a string is a real LAN IPv4 address (never localhost, 127.0.0.1, or tauri.localhost)
 */
export function isValidRealLanIp(ip: string): boolean {
  if (!ip) return false;
  const trimmed = ip.trim().toLowerCase();
  if (
    trimmed === 'localhost' ||
    trimmed === 'tauri.localhost' ||
    trimmed.endsWith('.localhost') ||
    trimmed === '0.0.0.0' ||
    trimmed.startsWith('127.') ||
    trimmed.startsWith('169.254.')
  ) {
    return false;
  }
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/**
 * Discovers the computer's real LAN IPv4 addresses using WebRTC ICE candidates (works in Edge WebView2 / Chrome)
 */
export function discoverLanIpsViaWebRTC(timeoutMs: number = 1200): Promise<string[]> {
  return new Promise((resolve) => {
    const foundIps = new Set<string>();
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      resolve([]);
      return;
    }

    let pc: RTCPeerConnection | null = null;
    const finish = () => {
      try {
        if (pc) pc.close();
      } catch {}
      resolve(Array.from(foundIps));
    };

    const timer = setTimeout(finish, timeoutMs);

    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('lan_ip_probe');
      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) {
          clearTimeout(timer);
          finish();
          return;
        }
        const cand = event.candidate.candidate;
        const ipv4Regex = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/g;
        let match: RegExpExecArray | null;
        while ((match = ipv4Regex.exec(cand)) !== null) {
          const candidateIp = match[1];
          if (isValidRealLanIp(candidateIp)) {
            foundIps.add(candidateIp);
          }
        }
      };
      pc.createOffer()
        .then((offer) => pc?.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timer);
          finish();
        });
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}


