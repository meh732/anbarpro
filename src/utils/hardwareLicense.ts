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

