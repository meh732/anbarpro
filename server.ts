import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import zlib from 'zlib';
import { execSync } from 'child_process';
import { resolveCentralDataDir } from './src/server/dataDirResolver.ts';
import { serverStore, getDefaultServerState } from './src/server/serverStore.ts';
import { sqliteEngine } from './src/server/sqliteEngine.ts';
import { windowsServiceManager } from './src/server/windowsServiceManager.ts';
import { 
  dispatchBackupToMessengers, sendTelegramMessage, sendBaleMessage, generateBackupSummary 
} from './src/server/messengerService.ts';
import { MessengerBackupConfig } from './src/types';
import { db } from './src/db/index.ts';
import {
  verifyPassword,
  hashPassword,
  isPasswordHashed,
  sanitizePayload,
  generateSecureToken,
  ACTIVE_SECURITY_SHIELDS,
  getAccountLockoutStatus,
  recordFailedLogin,
  recordSuccessfulLogin,
  normalizeUsername
} from './src/utils/security.ts';
import {
  formatHardwareCodeFromRaw,
  generateActivationCodeForHardware,
  verifyServerActivationCode
} from './src/utils/hardwareLicense.ts';

const DEFAULT_MESSENGER_CONFIG: MessengerBackupConfig = {
  telegram: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
  bale: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
  autoSendIntervalHours: 24,
  includeSummaryText: true,
};
import { 
  warehouses, items, itemGroups, inventory, transfers, 
  contractors, boms, purchaseRequests, stockCounts, operatorLogs, projects, backups 
} from './src/db/schema.ts';

const SERVER_ROOT_DIR = process.cwd();

// ============================================================================
//  WINDOWS / LINUX HARDWARE FINGERPRINT, LICENSE LOCK & LAN PORT CONFIGURATION
// ============================================================================
interface ServerNodeConfig {
  configuredPort: number | null;
  activatedLicenseKey: string | null;
  activatedAt: string | null;
  hardwareCode: string | null;
}

const NODE_CONFIG_DIR = resolveCentralDataDir();
const NODE_CONFIG_FILE = path.join(NODE_CONFIG_DIR, 'server_node_config.json');
const RUNNER_BAT_FILE = path.join(NODE_CONFIG_DIR, 'anbarmeh_server_runner.bat');

function extractPortFromRunnerBat(): { port: number | null; mtimeMs: number } {
  try {
    if (fs.existsSync(RUNNER_BAT_FILE)) {
      const stat = fs.statSync(RUNNER_BAT_FILE);
      const content = fs.readFileSync(RUNNER_BAT_FILE, 'utf-8');
      const match = content.match(/set\s+PORT=(\d+)/i);
      if (match && match[1]) {
        const p = Number(match[1]);
        if (!isNaN(p) && p >= 1024 && p <= 65535) {
          return { port: p, mtimeMs: stat.mtimeMs };
        }
      }
    }
  } catch {}
  return { port: null, mtimeMs: 0 };
}

function loadServerNodeConfig(): ServerNodeConfig {
  let result: ServerNodeConfig = {
    configuredPort: null,
    activatedLicenseKey: null,
    activatedAt: null,
    hardwareCode: null,
  };
  let cfgMtimeMs = 0;

  try {
    if (fs.existsSync(NODE_CONFIG_FILE)) {
      cfgMtimeMs = fs.statSync(NODE_CONFIG_FILE).mtimeMs;
      const parsed = JSON.parse(fs.readFileSync(NODE_CONFIG_FILE, 'utf-8'));
      const portNum = Number(parsed.configuredPort);
      result = {
        configuredPort: !isNaN(portNum) && portNum >= 1024 && portNum <= 65535 ? portNum : null,
        activatedLicenseKey: parsed.activatedLicenseKey || null,
        activatedAt: parsed.activatedAt || null,
        hardwareCode: parsed.hardwareCode || null,
      };
    }
  } catch (e) {
    console.warn('[NodeConfig] Failed to read server_node_config.json:', e);
  }

  // Also check if anbarmeh_server_runner.bat was updated more recently by Tauri service installer
  const runnerInfo = extractPortFromRunnerBat();
  if (runnerInfo.port && (!result.configuredPort || runnerInfo.mtimeMs > cfgMtimeMs + 500)) {
    result.configuredPort = runnerInfo.port;
  }

  return result;
}

function saveServerNodeConfig(cfg: Partial<ServerNodeConfig>): ServerNodeConfig {
  const current = loadServerNodeConfig();
  const updated: ServerNodeConfig = { ...current, ...cfg };
  try {
    if (!fs.existsSync(NODE_CONFIG_DIR)) {
      fs.mkdirSync(NODE_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(NODE_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('[NodeConfig] Failed to save server_node_config.json:', e);
  }
  return updated;
}

let cachedHardwareInfo: {
  hardwareCode: string;
  details: {
    hostname: string;
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemGb: number;
    macAddress: string;
    osRelease: string;
  };
} | null = null;

function getServerHardwareFingerprint() {
  if (cachedHardwareInfo) return cachedHardwareInfo;

  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model?.trim() || 'Generic-CPU';
  const cpuCores = cpus.length || 1;
  const totalMemGb = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const hostname = os.hostname() || 'WIN-SERVER';
  const platform = os.platform();
  const arch = os.arch();
  const osRelease = os.release();

  // Find primary physical MAC address
  const interfaces = os.networkInterfaces();
  let macAddress = '00:00:00:00:00:00';
  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name] || [];
    for (const iface of list) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        macAddress = iface.mac.toUpperCase();
        break;
      }
    }
    if (macAddress !== '00:00:00:00:00:00') break;
  }

  // Attempt OS-level hardware UUID (Windows WMIC / Registry MachineGuid or Linux machine-id)
  let osHardwareUuid = '';
  try {
    if (platform === 'win32') {
      const wmicOut = execSync('wmic csproduct get uuid', { encoding: 'utf-8', timeout: 2500 });
      const lines = wmicOut.split(/\r?\n/).map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'uuid');
      if (lines[0]) osHardwareUuid = lines[0];
    } else if (fs.existsSync('/etc/machine-id')) {
      osHardwareUuid = fs.readFileSync('/etc/machine-id', 'utf-8').trim();
    }
  } catch {
    // Fallback to CPU + MAC + Hostname if WMIC is restricted
  }

  const rawFingerprint = [
    osHardwareUuid || hostname,
    cpuModel,
    cpuCores,
    macAddress !== '00:00:00:00:00:00' ? macAddress : hostname,
    platform,
    arch
  ].join('||');

  const hardwareCode = formatHardwareCodeFromRaw(rawFingerprint);
  cachedHardwareInfo = {
    hardwareCode,
    details: {
      hostname,
      platform,
      arch,
      cpuModel,
      cpuCores,
      totalMemGb,
      macAddress,
      osRelease,
    }
  };
  return cachedHardwareInfo;
}

let cachedLanIps: string[] | null = null;
let lastLanIpScanTime = 0;

function getDetectedLanIps(): string[] {
  const now = Date.now();
  if (cachedLanIps && cachedLanIps.length > 0 && now - lastLanIpScanTime < 15000) {
    return cachedLanIps;
  }

  const interfaces = os.networkInterfaces();
  const preferred192: string[] = [];
  const preferred10: string[] = [];
  const preferred172: string[] = [];
  const otherIps: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name] || [];
    for (const iface of list) {
      const isIPv4 = iface.family === 'IPv4' || (iface as any).family === 4;
      if (!iface.internal && isIPv4 && iface.address && !iface.address.startsWith('169.254.')) {
        if (iface.address.startsWith('192.168.')) {
          preferred192.push(iface.address);
        } else if (iface.address.startsWith('10.')) {
          preferred10.push(iface.address);
        } else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address)) {
          preferred172.push(iface.address);
        } else {
          otherIps.push(iface.address);
        }
      }
    }
  }

  // Fallback on Windows: parse ipconfig if os.networkInterfaces returned nothing
  if (preferred192.length === 0 && preferred10.length === 0 && os.platform() === 'win32') {
    try {
      const out = execSync('ipconfig', { encoding: 'utf-8', timeout: 1500, windowsHide: true });
      for (const line of out.split(/\r?\n/)) {
        if (line.toLowerCase().includes('ipv4') || line.toLowerCase().includes('ip address')) {
          const idx = line.indexOf(':');
          if (idx !== -1) {
            const ip = line.slice(idx + 1).replace('(Preferred)', '').trim();
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !ip.startsWith('127.') && !ip.startsWith('169.254.')) {
              if (ip.startsWith('192.168.')) preferred192.push(ip);
              else if (ip.startsWith('10.')) preferred10.push(ip);
              else otherIps.push(ip);
            }
          }
        }
      }
    } catch {}
  }

  const combined = Array.from(new Set([...preferred192, ...preferred10, ...preferred172, ...otherIps]));
  cachedLanIps = combined.length > 0 ? combined : ['192.168.1.100'];
  lastLanIpScanTime = now;
  return cachedLanIps;
}

function isServerHardwareLicenseValid(): boolean {
  const hw = getServerHardwareFingerprint();
  const cfg = loadServerNodeConfig();
  if (!cfg.activatedLicenseKey) return false;
  if (verifyServerActivationCode(hw.hardwareCode, cfg.activatedLicenseKey)) return true;
  if (cfg.hardwareCode && verifyServerActivationCode(cfg.hardwareCode, cfg.activatedLicenseKey)) return true;
  return false;
}

const boundPortServers = new Map<number, http.Server>();
let activeCustomPort: number | null = null;

// Global error guard to prevent any unhandled crash in production
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception in server process:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection in server process:', reason);
});

// In-Memory Rate Limiting & DoS Defense Engine
interface IpRequestRecord {
  count: number;
  resetAt: number;
}
const ipGlobalTracker = new Map<string, IpRequestRecord>();
const ipSensitiveTracker = new Map<string, IpRequestRecord>();
let totalBlockedAttempts = 0;

// Periodic memory cleanup for rate limiter map
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipGlobalTracker.entries()) {
    if (record.resetAt <= now) ipGlobalTracker.delete(ip);
  }
  for (const [ip, record] of ipSensitiveTracker.entries()) {
    if (record.resetAt <= now) ipSensitiveTracker.delete(ip);
  }
}, 60000);

async function startServer() {
  const app = express();

  // 1. Security: Disable X-Powered-By to prevent server stack fingerprinting
  app.disable('x-powered-by');

  const savedNodeConfig = loadServerNodeConfig();

  // Robust Port Detection: Explicit process.env.PORT takes first precedence (e.g. from background supervisor or CLI),
  // followed by user configuredPort in server_node_config.json, falling back cleanly to 3000
  const envPort = parseInt(String(process.env.PORT || process.env.APP_PORT || process.env.HTTP_PORT || '').trim(), 10);
  const cfgPort = savedNodeConfig.configuredPort && savedNodeConfig.configuredPort >= 1024 && savedNodeConfig.configuredPort <= 65535
    ? savedNodeConfig.configuredPort
    : null;
  const PORT = (envPort && !isNaN(envPort) && envPort >= 1024 && envPort <= 65535)
    ? envPort
    : (cfgPort || 3000);

  // 2. Security: Comprehensive OWASP Enterprise HTTP Security Headers
  app.use((req, res, next) => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent Clickjacking (allow SAMEORIGIN for embedded preview when necessary)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Legacy XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
    // Enforce HSTS for HTTPS connections
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Remove server identifier
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    next();
  });

  // 3. Security: Global Sliding-Window IP Rate Limiter (Protection against DDoS and automated flood)
  app.use((req, res, next) => {
    // Skip static assets
    if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|png|jpg|svg|ico|woff2)$/)) {
      return next();
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 
                     'unknown-ip';
    const now = Date.now();
    const WINDOW_MS = 10000; // 10 seconds
    const MAX_REQUESTS = 300; // max 300 requests per 10s

    let record = ipGlobalTracker.get(clientIp);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + WINDOW_MS };
      ipGlobalTracker.set(clientIp, record);
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS) {
        totalBlockedAttempts += 1;
        res.setHeader('Retry-After', '10');
        return res.status(429).json({
          success: false,
          error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند ثانیه صبر نمایید. (Too Many Requests - Rate limit exceeded)'
        });
      }
    }
    next();
  });

  // Parse JSON payloads up to 50MB (for bulk imports, attachments, and snapshots)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 4. Security: Deep Payload Sanitizer Middleware (Anti-XSS & Prototype Pollution Defense)
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        req.body = sanitizePayload(req.body);
      } catch (e) {
        console.warn('[Security] Payload sanitization warning:', e);
      }
    }
    next();
  });

  // CORS headers if accessed across subnets & Private Network Access support for Tauri / LAN clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Version, X-Requested-With');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 5. Rate Limiter Helper for Sensitive Admin / Auth Endpoints
  const sensitiveRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 
                     'unknown-ip';
    const now = Date.now();
    const WINDOW_MS = 60000; // 1 minute
    const MAX_REQUESTS = 15; // max 15 attempts per minute

    let record = ipSensitiveTracker.get(clientIp);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + WINDOW_MS };
      ipSensitiveTracker.set(clientIp, record);
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS) {
        totalBlockedAttempts += 1;
        res.setHeader('Retry-After', '60');
        return res.status(429).json({
          success: false,
          error: 'تعداد دفعات تلاش برای عملیات حساس بیش از حد مجاز است. لطفاً ۱ دقیقه صبر نمایید.'
        });
      }
    }
    next();
  };

  // API Route: Health & Configuration (Secure, no credential leaks)
  app.get('/api/health', (req, res) => {
    const cfg = loadServerNodeConfig();
    const effectivePort = activeCustomPort || cfg.configuredPort || PORT;
    res.json({ 
      status: 'ok', 
      serverMode: 'centralized_multiuser',
      port: effectivePort, 
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      hostname: os.hostname(),
      lanIps: getDetectedLanIps(),
      isLicenseActivated: isServerHardwareLicenseValid(),
      serverVersion: serverStore.getState().version,
      securityShieldsActive: true
    });
  });

  // Secure /api/config: Public system parameters ONLY, NEVER exposing passwords or database credentials
  app.get('/api/config', (req, res) => {
    const state = serverStore.getState();
    const cfg = loadServerNodeConfig();
    res.json({
      port: activeCustomPort || cfg.configuredPort || PORT,
      serverMode: 'centralized_multiuser',
      companyName: state.companyName || 'سامانه انبارمه',
      version: state.version,
      isLicenseActivated: isServerHardwareLicenseValid(),
      lanIps: getDetectedLanIps(),
      securityActive: true,
      hasPostgreSql: Boolean(process.env.DATABASE_URL),
      hasTelegramBackup: Boolean(state.messengerConfig?.telegram?.enabled),
      hasBaleBackup: Boolean(state.messengerConfig?.bale?.enabled)
    });
  });

  // API Route: Enterprise Security Status & Shields Diagnostic
  app.get('/api/security/status', (req, res) => {
    const state = serverStore.getState();
    const usersCount = state.users?.length || 0;
    const hashedUsersCount = (state.users || []).filter(u => isPasswordHashed(u.password)).length;

    res.json({
      success: true,
      systemTime: new Date().toISOString(),
      shields: ACTIVE_SECURITY_SHIELDS,
      metrics: {
        totalUsers: usersCount,
        hashedUsers: hashedUsersCount,
        allPasswordsHashed: usersCount > 0 && hashedUsersCount === usersCount,
        totalBlockedFloodAttempts: totalBlockedAttempts,
        activeRateLimiters: {
          globalTrackedIps: ipGlobalTracker.size,
          sensitiveTrackedIps: ipSensitiveTracker.size
        },
        httpSecurityHeadersEnforced: true,
        antiFingerprintActive: true,
        payloadSanitizerActive: true,
        sessionTokenCrypto: 'WebCrypto / SecureRandom'
      }
    });
  });

  // API Route: Secure Server-Authoritative Login Endpoint
  app.post('/api/auth/login', sensitiveRateLimiter, (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'نام کاربری و رمز عبور الزامی است.' });
      }

      const cleanUser = normalizeUsername(username);
      
      // Check account lockout
      const lockout = getAccountLockoutStatus(cleanUser);
      if (lockout.isLocked) {
        return res.status(423).json({
          success: false,
          locked: true,
          remainingSeconds: lockout.remainingSeconds,
          error: `حساب کاربری به دلیل ۵ بار تلاش ناموفق قفل است. لطفاً ${lockout.remainingSeconds} ثانیه دیگر مجدداً تلاش کنید.`
        });
      }

      const state = serverStore.getState();
      const currentUsers = state.users || [];
      const user = currentUsers.find(u => normalizeUsername(u.username) === cleanUser);

      if (!user) {
        const lockRes = recordFailedLogin(cleanUser);
        return res.status(401).json({
          success: false,
          error: 'نام کاربری یا کلمه عبور اشتباه است.',
          attemptsLeft: lockRes.attemptsLeft
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          error: 'حساب کاربری شما توسط مدیر سیستم غیرفعال شده است.'
        });
      }

      // Cryptographic verification
      const isValid = verifyPassword(String(password), user.password, user.username);
      if (!isValid) {
        const lockRes = recordFailedLogin(cleanUser);
        if (lockRes.isNowLocked) {
          return res.status(423).json({
            success: false,
            locked: true,
            remainingSeconds: lockRes.remainingSeconds,
            error: 'حساب کاربری به دلیل ۵ بار تلاش ناموفق موقتاً به مدت ۳۰ ثانیه قفل شد.'
          });
        }
        return res.status(401).json({
          success: false,
          error: `رمز عبور اشتباه است. (${lockRes.attemptsLeft} تلاش دیگر تا قفل موقت)`,
          attemptsLeft: lockRes.attemptsLeft
        });
      }

      // Successful login
      recordSuccessfulLogin(cleanUser);

      // Auto-upgrade password to salted hash in serverStore if legacy unhashed
      if (!isPasswordHashed(user.password)) {
        const secureHash = hashPassword(String(password), user.username);
        const updatedUsers = currentUsers.map(u => u.id === user.id ? { ...u, password: secureHash } : u);
        serverStore.updateState({ users: updatedUsers });
      }

      // Generate cryptographically random session token
      const sessionToken = generateSecureToken(32);

      // Record immutable audit log on server
      const auditEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleString('fa-IR'),
        userId: user.id,
        userName: user.fullName || user.username,
        userRole: user.role,
        action: 'ورود امن به سامانه',
        module: 'امنیت و احراز هویت',
        description: `ورود موفق کاربر ${user.fullName} (${user.username}) به پنل مدیریت با اعتبارسنجی رمزنگاری‌شده`,
        details: { ip: req.ip, userAgent: req.headers['user-agent'] }
      };
      serverStore.updateState({
        auditLogs: [auditEntry as any, ...(state.auditLogs || []).slice(0, 199)]
      });

      // Never return the hashed password in login response
      const safeUser = { ...user };
      delete safeUser.password;

      res.json({
        success: true,
        token: sessionToken,
        user: safeUser,
        message: 'ورود با موفقیت انجام شد.'
      });
    } catch (err: any) {
      console.error('Error in POST /api/auth/login:', err);
      res.status(500).json({ success: false, error: 'خطای داخلی در فرآیند احراز هویت' });
    }
  });

  // API Route: Server Info & System Diagnostic
  app.get('/api/server-info', (req, res) => {
    const storageInfo = serverStore.getStorageInfo();
    const state = serverStore.getState();
    const hwInfo = getServerHardwareFingerprint();
    const nodeCfg = loadServerNodeConfig();
    const ipList = getDetectedLanIps();
    const effectivePort = activeCustomPort || nodeCfg.configuredPort || PORT;
    const isLicenseActivated = Boolean(
      nodeCfg.activatedLicenseKey &&
      verifyServerActivationCode(hwInfo.hardwareCode, nodeCfg.activatedLicenseKey)
    );

    res.json({
      success: true,
      hostname: os.hostname(),
      platform: os.platform(),
      osRelease: os.release(),
      arch: os.arch(),
      totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemMb: Math.round(os.freemem() / (1024 * 1024)),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      ipAddresses: ipList,
      port: effectivePort,
      configuredPort: nodeCfg.configuredPort || PORT,
      hardwareCode: hwInfo.hardwareCode,
      isLicenseActivated,
      shareUrls: ipList.map(ip => `http://${ip}:${effectivePort}`),
      storage: storageInfo,
      dataFile: storageInfo.filePath,
      dataSizeKb: storageInfo.sizeKb,
      counts: {
        items: state.items?.length || 0,
        itemGroups: state.itemGroups?.length || 0,
        warehouses: state.warehouses?.length || 0,
        transfers: state.transfers?.length || 0,
        stockInDocs: state.stockInDocs?.length || 0,
        stockOutDocs: state.stockOutDocs?.length || 0,
        projects: state.projects?.length || 0,
        users: state.users?.length || 0,
        boms: state.boms?.length || 0,
        stockCountings: state.stockCountings?.length || 0,
        notifications: state.notifications?.length || 0,
      }
    });
  });

  // =========================================================================
  //  TAURI / WINDOWS SERVER HARDWARE LOCK, LAN IP & PORT MANAGEMENT ENDPOINTS
  // =========================================================================

  // Helper to dynamically bind custom LAN port without dropping main port 3000 or other active ports
  const bindSecondaryPortIfNeeded = (targetPort: number, setAsActive: boolean = true): Promise<{ bound: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!targetPort || targetPort < 1024 || targetPort > 65535) {
        return resolve({ bound: false, error: 'شماره پورت نامعتبر است.' });
      }
      if (targetPort === PORT || boundPortServers.has(targetPort)) {
        if (setAsActive) {
          activeCustomPort = targetPort;
        }
        return resolve({ bound: true });
      }

      try {
        const srv = http.createServer(app);
        srv.on('error', (err: any) => {
          console.warn(`[CustomPort] Could not bind secondary port ${targetPort}:`, err?.message);
          resolve({ bound: false, error: err?.code === 'EADDRINUSE' ? `پورت ${targetPort} در حال حاضر توسط برنامه دیگری اشغال شده است.` : err?.message });
        });
        srv.listen(targetPort, '0.0.0.0', () => {
          boundPortServers.set(targetPort, srv);
          if (setAsActive) {
            activeCustomPort = targetPort;
          }
          console.log(`[CustomPort] Central Server also listening on 0.0.0.0:${targetPort}`);
          resolve({ bound: true });
        });
      } catch (e: any) {
        resolve({ bound: false, error: e?.message });
      }
    });
  };

  // Ensure both configuredPort (e.g. 5050) and standard port 3000 are concurrently active on 0.0.0.0
  if (PORT !== 3000) {
    activeCustomPort = PORT;
    bindSecondaryPortIfNeeded(3000, false).catch(() => {});
  } else if (savedNodeConfig.configuredPort && savedNodeConfig.configuredPort !== 3000) {
    bindSecondaryPortIfNeeded(savedNodeConfig.configuredPort, true).catch(() => {});
  }

  // Real-time Disk Config Watcher: if Tauri writes a new port to server_node_config.json or anbarmeh_server_runner.bat,
  // bind that port on 0.0.0.0 automatically within 1.5 seconds!
  setInterval(() => {
    try {
      const cfg = loadServerNodeConfig();
      const target = cfg.configuredPort;
      if (target && target >= 1024 && target <= 65535) {
        if (target !== PORT && !boundPortServers.has(target)) {
          console.log(`[AutoPortWatcher] Detected new configured port ${target} on disk. Binding 0.0.0.0:${target}...`);
          bindSecondaryPortIfNeeded(target, true).catch(() => {});
        } else if (activeCustomPort !== target) {
          activeCustomPort = target;
        }
      }
    } catch {}
  }, 1500);

  // 1. GET /api/system/node-info - Hardware ID, LAN IPs, License status, SQLite & Background Service info
  app.get('/api/system/node-info', (req, res) => {
    const hw = getServerHardwareFingerprint();
    const cfg = loadServerNodeConfig();
    const lanIps = getDetectedLanIps();
    const primaryLanIp = lanIps[0] || '192.168.1.100';
    const effectivePort = activeCustomPort || cfg.configuredPort || PORT;
    const isLicenseActivated = isServerHardwareLicenseValid();
    const sqlDiag = sqliteEngine.getDiagnostics(serverStore.getState());
    const bgStatus = windowsServiceManager.getStatus(effectivePort);

    const maskedLicenseKey = cfg.activatedLicenseKey
      ? `${cfg.activatedLicenseKey.slice(0, 8)}-****-****-${cfg.activatedLicenseKey.slice(-4)}`
      : null;

    res.json({
      success: true,
      hardwareCode: hw.hardwareCode,
      hardwareDetails: hw.details,
      lanIps,
      primaryLanIp,
      activePort: effectivePort,
      configuredPort: cfg.configuredPort || PORT,
      shareUrls: lanIps.map(ip => `http://${ip}:${effectivePort}`),
      primaryShareUrl: `http://${primaryLanIp}:${effectivePort}`,
      isLicenseActivated,
      activatedAt: cfg.activatedAt,
      maskedLicenseKey,
      sqliteEngine: {
        enabled: sqlDiag.active,
        engine: sqlDiag.engineName,
        sqliteFile: sqlDiag.dbFilePath,
        sqliteSizeKb: sqlDiag.dbSizeKb,
      },
      backgroundService: {
        isWindows: os.platform() === 'win32',
        isServiceInstalled: bgStatus.isServiceRegistered,
        isRunningInBackground: true,
        configuredPort: effectivePort,
        sqlitePath: sqlDiag.dbFilePath,
        runnerScriptPath: bgStatus.runnerBatPath,
        vbsLauncherPath: bgStatus.daemonVbsPath,
      },
      firewallCommand: `netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP ${effectivePort})" dir=in action=allow protocol=TCP localport=${effectivePort} profile=any`,
      elevatedFirewallCommand: `powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\\\"AnbarMeh Central Server (TCP ${effectivePort})\\\" dir=in action=allow protocol=TCP localport=${effectivePort} profile=any & netsh advfirewall firewall add rule name=\\\"AnbarMeh Central Server (TCP 3000)\\\" dir=in action=allow protocol=TCP localport=3000 profile=any' -Verb RunAs"`
    });
  });

  // 2. POST /api/system/activate-license - Verify Seller Activation Code against Hardware ID & install SQL background service
  app.post('/api/system/activate-license', (req, res) => {
    try {
      const { activationCode, clientHardwareCode } = req.body || {};
      if (!activationCode || typeof activationCode !== 'string') {
        return res.status(400).json({ success: false, error: 'لطفاً کد فعال‌سازی دریافت‌شده از فروشنده را وارد نمایید.' });
      }

      const hw = getServerHardwareFingerprint();
      const targetHwCode = hw.hardwareCode;

      const isValidForServer = verifyServerActivationCode(targetHwCode, activationCode);
      const isValidForClient = clientHardwareCode ? verifyServerActivationCode(clientHardwareCode, activationCode) : false;

      if (!isValidForServer && !isValidForClient) {
        return res.status(403).json({
          success: false,
          error: 'کد فعال‌سازی وارد شده معتبر نیست یا با مشخصات سخت‌افزاری این دستگاه مطابقت ندارد.'
        });
      }

      const matchedHwCode = isValidForServer ? targetHwCode : clientHardwareCode;
      const normalizedLicense = generateActivationCodeForHardware(matchedHwCode);
      const activatedAt = new Date().toLocaleString('fa-IR');
      const cfg = saveServerNodeConfig({
        activatedLicenseKey: normalizedLicense,
        activatedAt,
        hardwareCode: matchedHwCode,
      });

      const effectivePort = activeCustomPort || cfg.configuredPort || PORT;
      sqliteEngine.syncStateToSqlite(serverStore.getState());
      windowsServiceManager.registerAndStartBackgroundService(effectivePort);

      res.json({
        success: true,
        isLicenseActivated: true,
        hardwareCode: matchedHwCode,
        activatedAt,
        message: 'قفل سخت‌افزاری تایید شد، دیتابیس سبک SQL و سرویس پس‌زمینه همیشه‌روشن ویندوز روی این سیستم فعال گردید!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'خطا در بررسی کد فعال‌سازی' });
    }
  });

  // 3. POST /api/system/configure-port - Set Server LAN Port & dynamically listen on 0.0.0.0:<port>
  app.post('/api/system/configure-port', async (req, res) => {
    try {
      const rawNewPort = Number(req.body?.port);
      if (!rawNewPort || isNaN(rawNewPort) || rawNewPort < 1024 || rawNewPort > 65535) {
        return res.status(400).json({
          success: false,
          error: 'شماره پورت باید عددی معتبر بین 1024 تا 65535 باشد (پیشنهادی: 3000 یا 4000 یا 8080).'
        });
      }

      const bindResult = await bindSecondaryPortIfNeeded(rawNewPort);
      if (!bindResult.bound) {
        return res.status(409).json({
          success: false,
          error: bindResult.error || `امکان باز کردن پورت ${rawNewPort} وجود ندارد.`
        });
      }

      saveServerNodeConfig({ configuredPort: rawNewPort });
      windowsServiceManager.registerAndStartBackgroundService(rawNewPort);

      const lanIps = getDetectedLanIps();
      const customLanIp = typeof req.body?.customLanIp === 'string' && req.body.customLanIp.trim() ? req.body.customLanIp.trim() : null;
      const primaryLanIp = customLanIp || lanIps[0] || '192.168.1.100';
      const allIps = customLanIp && !lanIps.includes(customLanIp) ? [customLanIp, ...lanIps] : lanIps;

      res.json({
        success: true,
        configuredPort: rawNewPort,
        activePort: rawNewPort,
        lanIps: allIps,
        primaryLanIp,
        shareUrls: allIps.map(ip => `http://${ip}:${rawNewPort}`),
        primaryShareUrl: `http://${primaryLanIp}:${rawNewPort}`,
        firewallCommand: `netsh advfirewall firewall add rule name="AnbarMeh Central Server (TCP ${rawNewPort})" dir=in action=allow protocol=TCP localport=${rawNewPort} profile=any`,
        elevatedFirewallCommand: `powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\\\"AnbarMeh Central Server (TCP ${rawNewPort})\\\" dir=in action=allow protocol=TCP localport=${rawNewPort} profile=any & netsh advfirewall firewall add rule name=\\\"AnbarMeh Central Server (TCP 3000)\\\" dir=in action=allow protocol=TCP localport=3000 profile=any' -Verb RunAs"`,
        message: `پورت سرور مرکزی با موفقیت روی ${rawNewPort} تنظیم شد و آدرس http://${primaryLanIp}:${rawNewPort} در شبکه محلی فعال گردید.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'خطا در تنظیم پورت سرور' });
    }
  });

  // 4. POST /api/system/background-service - Install / Verify Always-On Windows Background Service & SQLite Engine
  app.post('/api/system/background-service', (req, res) => {
    try {
      const cfg = loadServerNodeConfig();
      const effectivePort = Number(req.body?.port) || activeCustomPort || cfg.configuredPort || PORT;
      sqliteEngine.syncStateToSqlite(serverStore.getState());
      const result = windowsServiceManager.registerAndStartBackgroundService(effectivePort);
      const sqlDiag = sqliteEngine.getDiagnostics(serverStore.getState());

      res.json({
        success: true,
        message: result.message,
        backgroundService: {
          isWindows: os.platform() === 'win32',
          isServiceInstalled: result.status.isServiceRegistered,
          isRunningInBackground: true,
          configuredPort: effectivePort,
          sqlitePath: sqlDiag.dbFilePath,
          runnerScriptPath: result.status.runnerBatPath,
          vbsLauncherPath: result.status.daemonVbsPath,
        },
        sqliteEngine: {
          enabled: sqlDiag.active,
          engine: sqlDiag.engineName,
          sqliteFile: sqlDiag.dbFilePath,
          sqliteSizeKb: sqlDiag.dbSizeKb,
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'خطا در ثبت سرویس پس‌زمینه ویندوز' });
    }
  });

  // 5. POST /api/system/open-firewall - Open Windows Firewall for configured port using elevated PowerShell
  app.post('/api/system/open-firewall', (req, res) => {
    try {
      const cfg = loadServerNodeConfig();
      const effectivePort = Number(req.body?.port) || activeCustomPort || cfg.configuredPort || PORT;
      const isWin = os.platform() === 'win32';
      
      const script = [
        `Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-${effectivePort}' -ErrorAction SilentlyContinue`,
        `New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-${effectivePort}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${effectivePort} -Profile Any -Enabled True`,
        `Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -ErrorAction SilentlyContinue`,
        `New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -Enabled True`,
        `netsh advfirewall firewall delete rule name=AnbarMeh-TCP-${effectivePort} 2>$null`,
        `netsh advfirewall firewall add rule name=AnbarMeh-TCP-${effectivePort} dir=in action=allow protocol=TCP localport=${effectivePort} profile=any 2>$null`,
        `netsh advfirewall firewall delete rule name=AnbarMeh-TCP-3000 2>$null`,
        `netsh advfirewall firewall add rule name=AnbarMeh-TCP-3000 dir=in action=allow protocol=TCP localport=3000 profile=any 2>$null`,
        `netsh advfirewall firewall add rule name=AnbarMeh-Node dir=in action=allow program="node.exe" profile=any 2>$null`,
        `Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue`
      ].join('; ');

      const b64 = Buffer.from(script, 'utf16le').toString('base64');
      const launcherCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}' -Verb RunAs"`;

      if (isWin) {
        try {
          execSync(launcherCmd, { timeout: 4500, windowsHide: true });
        } catch (e) {
          console.warn('[OpenFirewall] Elevation trigger notice:', e);
        }
      }

      res.json({
        success: true,
        port: effectivePort,
        powershellCommand: launcherCmd,
        manualCommand: `netsh advfirewall firewall add rule name=AnbarMeh-TCP-${effectivePort} dir=in action=allow protocol=TCP localport=${effectivePort} profile=any`,
        message: `دستور بازگشایی پورت ${effectivePort} در فایروال ویندوز صادر شد. پنجره تایید UAC ویندوز (Yes/No) را تایید نمایید.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'خطا در صدور دستور فایروال' });
    }
  });

  // =========================================================================
  //  CENTRALIZED SERVER DATA & REAL-TIME MULTI-CLIENT SYNC ENDPOINTS
  // =========================================================================

  // 1. GET /api/data - Full state retrieval
  app.get('/api/data', (req, res) => {
    try {
      const state = serverStore.getState();
      res.json({
        success: true,
        version: state.version,
        lastUpdated: state.lastUpdated,
        data: state,
      });
    } catch (err: any) {
      console.error('Error in GET /api/data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. GET /api/data/version - Ultra-lightweight endpoint for background polling
  app.get('/api/data/version', (req, res) => {
    try {
      const ver = serverStore.getVersion();
      res.json({
        success: true,
        version: ver.version,
        lastUpdated: ver.lastUpdated,
        counts: ver.counts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.1 SSE: Real-Time Server-Sent Events stream for instant multi-computer sync (< 30ms latency)
  const sseClients = new Set<express.Response>();

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const currentState = serverStore.getState();
    // Send immediate initial sync handshake
    res.write(`data: ${JSON.stringify({ type: 'init', version: currentState.version, lastUpdated: currentState.lastUpdated })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
      res.end();
    });
  });

  // Keep-alive heartbeat every 15s to keep connections alive through proxies / networks
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(`: heartbeat\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // Broadcast state changes in real time (< 30ms) to all connected clients
  serverStore.onStateChange((newState, partialUpdates, sourceClientId) => {
    if (sseClients.size === 0) return;
    const payload = JSON.stringify({
      type: 'sync',
      version: newState.version,
      lastUpdated: newState.lastUpdated,
      sourceClientId: sourceClientId || null,
      updates: partialUpdates || null,
      data: partialUpdates ? undefined : newState
    });
    for (const client of sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  });

  // 3. POST /api/sync - Real-time synchronization & delta merge from client
  app.post('/api/sync', (req, res) => {
    try {
      const { clientVersion, updates, clientId } = req.body;
      const currentState = serverStore.getState();

      if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
        // Apply client updates to server store with client origin tracking
        const updatedState = serverStore.updateState(updates, clientId);
        return res.json({
          success: true,
          synced: true,
          serverVersion: updatedState.version,
          lastUpdated: updatedState.lastUpdated,
        });
      }

      // If client only requested latest sync
      return res.json({
        success: true,
        synced: false,
        serverVersion: currentState.version,
        lastUpdated: currentState.lastUpdated,
        data: currentState,
      });
    } catch (err: any) {
      console.error('Error in POST /api/sync:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. POST /api/data - Complete state update / save
  app.post('/api/data', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }

      const updated = serverStore.updateState(payload);
      res.json({
        success: true,
        version: updated.version,
        lastUpdated: updated.lastUpdated,
        data: updated,
      });
    } catch (err: any) {
      console.error('Error in POST /api/data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4.1 POST /api/pre-update-backup - Trigger an emergency backup to file and messenger bots prior to updating or restarting
  app.post('/api/pre-update-backup', async (req, res) => {
    try {
      const state = serverStore.getState();
      const snapshotFile = serverStore.createSnapshotBackup('pre_update_manual');
      const config = state.messengerConfig || DEFAULT_MESSENGER_CONFIG;
      
      const results = await dispatchBackupToMessengers(config, state, {
        target: 'all',
        title: `🚨 پشتیبان خودکار پیش از اعمال بروزرسانی سامانه انبارمه (${new Date().toLocaleTimeString('fa-IR')})`
      });

      res.json({
        success: true,
        message: 'پشتیبان با موفقیت بر روی دیسک ذخیره و به ربات‌ها ارسال گردید.',
        snapshotFile,
        results
      });
    } catch (err: any) {
      console.error('Error in POST /api/pre-update-backup:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. POST /api/reset-data - Reset server database to default factory state
  app.post('/api/reset-data', async (req, res) => {
    try {
      // Send emergency backup to bots before resetting!
      const preState = serverStore.getState();
      if (preState.messengerConfig) {
        dispatchBackupToMessengers(preState.messengerConfig, preState, {
          target: 'all',
          title: '🚨 پشتیبان اضطراری پیش از بازنشانی داده‌های سرور'
        }).catch(() => {});
      }

      const defaultState = serverStore.resetToDefault();
      res.json({
        success: true,
        message: 'پایگاه داده سرور با موفقیت به حالت اولیه بازنشانی شد.',
        version: defaultState.version,
        data: defaultState,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5.1 POST /api/reset-empty - Reset server database to completely clean/raw empty state
  app.post('/api/reset-empty', async (req, res) => {
    try {
      const { keepUsers = true, companyName } = req.body || {};
      
      // Send emergency backup to bots before wiping!
      const preState = serverStore.getState();
      if (preState.messengerConfig) {
        dispatchBackupToMessengers(preState.messengerConfig, preState, {
          target: 'all',
          title: '🚨 پشتیبان اضطراری پیش از تخلیه و خام‌سازی دیتابیس'
        }).catch(() => {});
      }

      const emptyState = serverStore.resetToEmpty(keepUsers, companyName);
      res.json({
        success: true,
        message: 'پایگاه داده با موفقیت کاملاً تخلیه و به حالت خام (صفر) تبدیل شد.',
        version: emptyState.version,
        data: emptyState,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5.2 POST /api/reset-demo - Load rich demo dataset
  app.post('/api/reset-demo', (req, res) => {
    try {
      const defaultState = serverStore.resetToDefault();
      res.json({
        success: true,
        message: 'داده‌های نمونه و سناریوهای تستی با موفقیت در پایگاه داده بارگذاری شدند.',
        version: defaultState.version,
        data: defaultState,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. POST /api/import-data - Import JSON backup onto server
  app.post('/api/import-data', (req, res) => {
    try {
      const { jsonStr, data } = req.body;
      let parsed = data;
      if (!parsed && jsonStr) {
        parsed = JSON.parse(jsonStr);
      }
      if (!parsed || typeof parsed !== 'object') {
        return res.status(400).json({ success: false, error: 'داده‌های فایل ورودی معتبر نیستند.' });
      }

      // If data is wrapped in snapshot / payload
      const actualState = parsed.data || parsed;
      const replaced = serverStore.replaceState(actualState);
      
      res.json({
        success: true,
        message: 'فایل پشتیبان با موفقیت بر روی سرور بارگذاری و همگام گردید.',
        version: replaced.version,
        data: replaced,
      });
    } catch (err: any) {
      console.error('Error importing data to server:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. GET /api/export-data - Download complete database JSON from server
  app.get('/api/export-data', (req, res) => {
    try {
      const state = serverStore.getState();
      const filename = `anbarmeh_server_backup_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(state, null, 2));
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  //  MESSENGER BOTS (TELEGRAM & BALE) AUTOMATED BACKUP & ALERT ENDPOINTS
  // =========================================================================

  // GET /api/messenger/config - Retrieve Telegram & Bale Bot Settings
  app.get('/api/messenger/config', (req, res) => {
    try {
      const state = serverStore.getState();
      const baseConfig = state.messengerConfig || {
        telegram: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        bale: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        autoSendIntervalHours: 24,
        includeSummaryText: true,
        lastSentTelegramTimestamp: null,
        lastSentBaleTimestamp: null,
        lastTelegramStatus: null,
        lastBaleStatus: null,
      };

      const resolvedConfig = {
        ...baseConfig,
        telegram: {
          ...baseConfig.telegram,
          botToken: baseConfig.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
          adminChatId: baseConfig.telegram?.adminChatId || process.env.TELEGRAM_CHAT_ID || '',
          proxyUrl: baseConfig.telegram?.proxyUrl || process.env.TELEGRAM_PROXY_URL || '',
          apiBaseUrl: baseConfig.telegram?.apiBaseUrl || process.env.TELEGRAM_API_BASE_URL || '',
          enabled: baseConfig.telegram?.enabled ?? Boolean(baseConfig.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN),
        },
        bale: {
          ...baseConfig.bale,
          botToken: baseConfig.bale?.botToken || process.env.BALE_BOT_TOKEN || '',
          adminChatId: baseConfig.bale?.adminChatId || process.env.BALE_CHAT_ID || '',
          apiBaseUrl: baseConfig.bale?.apiBaseUrl || process.env.BALE_API_BASE_URL || '',
          enabled: baseConfig.bale?.enabled ?? Boolean(baseConfig.bale?.botToken || process.env.BALE_BOT_TOKEN),
        }
      };

      res.json({ success: true, config: resolvedConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messenger/config - Save Telegram & Bale Bot Settings
  app.post('/api/messenger/config', (req, res) => {
    try {
      const newConfig = req.body;
      const state = serverStore.getState();
      const currentConfig = state.messengerConfig || {
        telegram: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        bale: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        autoSendIntervalHours: 24,
        includeSummaryText: true,
      };

      const mergedConfig = {
        ...currentConfig,
        ...newConfig,
        telegram: {
          ...currentConfig.telegram,
          ...(newConfig.telegram || {}),
        },
        bale: {
          ...currentConfig.bale,
          ...(newConfig.bale || {}),
        },
      };

      const updatedState = serverStore.updateState({ messengerConfig: mergedConfig });
      res.json({
        success: true,
        message: 'تنظیمات ربات‌های تلگرام و بله با موفقیت ذخیره گردید.',
        config: updatedState.messengerConfig,
        version: updatedState.version,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messenger/test - Send a test verification message to Telegram or Bale
  app.post('/api/messenger/test', async (req, res) => {
    try {
      const { platform, botToken, chatId, proxyUrl, apiBaseUrl } = req.body;
      const state = serverStore.getState();
      const config = state.messengerConfig;

      const dateFa = new Date().toLocaleDateString('fa-IR');
      const timeFa = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      if (platform === 'telegram') {
        const token = botToken || config?.telegram?.botToken;
        const targetChatId = chatId || config?.telegram?.adminChatId;
        const targetProxy = proxyUrl !== undefined ? proxyUrl : config?.telegram?.proxyUrl;
        const targetBaseUrl = apiBaseUrl !== undefined ? apiBaseUrl : config?.telegram?.apiBaseUrl;

        if (!token || !targetChatId) {
          return res.status(400).json({ success: false, error: 'توکن ربات تلگرام یا شناسه چت ادمین تلگرام وارد نشده است.' });
        }

        const testMsg = `🤖 <b>تست اتصال ربات تلگرام سامانه انبارمه</b>\n\n✅ ارتباط ربات تلگرام با سرور مرکزی انبارمه با موفقیت برقرار است.\n📅 <b>تاریخ:</b> ${dateFa} | ⏰ <b>ساعت:</b> ${timeFa}\n🏢 <b>مجموعه:</b> ${state.companyName || 'انبار مرکزی'}\n\n📌 <i>پشتیبان‌های خودکار و هشدارهای سیستمی از این پس به این چت ارسال خواهند شد.</i>`;
        const result = await sendTelegramMessage(token, targetChatId, testMsg, {
          apiBaseUrl: targetBaseUrl,
          proxyUrl: targetProxy,
        });
        return res.json(result);
      } else if (platform === 'bale') {
        const token = botToken || config?.bale?.botToken;
        const targetChatId = chatId || config?.bale?.adminChatId;
        const targetBaseUrl = apiBaseUrl !== undefined ? apiBaseUrl : config?.bale?.apiBaseUrl;

        if (!token || !targetChatId) {
          return res.status(400).json({ success: false, error: 'توکن بازوبند بله یا شناسه چت ادمین بله وارد نشده است.' });
        }

        const testMsg = `🤖 <b>تست اتصال بازوبند پیام‌رسان بله سامانه انبارمه</b>\n\n✅ ارتباط ربات بله با سرور مرکزی انبارمه با موفقیت برقرار شد.\n📅 <b>تاریخ:</b> ${dateFa} | ⏰ <b>ساعت:</b> ${timeFa}\n🏢 <b>مجموعه:</b> ${state.companyName || 'انبار مرکزی'}\n\n📌 <i>پشتیبان‌های خودکار پایگاه داده به این حساب بله ارسال خواهند شد.</i>`;
        const result = await sendBaleMessage(token, targetChatId, testMsg, {
          apiBaseUrl: targetBaseUrl,
        });
        return res.json(result);
      } else {
        return res.status(400).json({ success: false, error: 'پلتفرم نامعتبر است (telegram یا bale).' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messenger/send-backup - Dispatch full backup immediately to Telegram / Bale
  app.post('/api/messenger/send-backup', async (req, res) => {
    try {
      const { target = 'all', customTitle } = req.body;
      const state = serverStore.getState();
      const config = state.messengerConfig;

      if (!config) {
        return res.status(400).json({ success: false, error: 'تنظیمات پیام‌رسان‌ها هنوز مقداردهی نشده است.' });
      }

      const results = await dispatchBackupToMessengers(config, state, {
        target,
        title: customTitle || 'پشتیبان دستی پایگاه داده انبارمه',
      });

      // Update state with last sent status
      const nowStr = new Date().toISOString();
      const timeFa = new Date().toLocaleString('fa-IR');

      const updatedMessengerConfig = {
        ...config,
        ...(results.telegram ? {
          lastSentTelegramTimestamp: results.telegram.success ? nowStr : config.lastSentTelegramTimestamp,
          lastTelegramStatus: {
            success: results.telegram.success,
            time: timeFa,
            message: results.telegram.message,
          },
        } : {}),
        ...(results.bale ? {
          lastSentBaleTimestamp: results.bale.success ? nowStr : config.lastSentBaleTimestamp,
          lastBaleStatus: {
            success: results.bale.success,
            time: timeFa,
            message: results.bale.message,
          },
        } : {}),
      };

      // Record in backup history
      const record = {
        id: `bk-msg-${Date.now()}`,
        timestamp: timeFa,
        fileName: `messenger_backup_${nowStr.slice(0, 10)}.json`,
        sizeKb: Math.round(JSON.stringify(state).length / 1024),
        type: 'Manual' as const,
      };

      const updatedHistory = [record, ...(state.backupHistory || [])];
      serverStore.updateState({
        messengerConfig: updatedMessengerConfig,
        lastBackupTimestamp: timeFa,
        backupHistory: updatedHistory.slice(0, 100),
      });

      res.json({
        success: (results.telegram?.success ?? true) && (results.bale?.success ?? true),
        results,
      });
    } catch (err: any) {
      console.error('Error dispatching backup to messengers:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  //  TEAM CHAT & INSTANT MESSAGING REST ENDPOINTS
  // =========================================================================

  // GET /api/messages - Retrieve chat messages
  app.get('/api/messages', (req, res) => {
    try {
      const state = serverStore.getState();
      const { channelId, recipientId, senderId } = req.query;
      let msgs = state.messages || [];

      if (channelId) {
        msgs = msgs.filter(m => m.channelId === channelId);
      } else if (recipientId && senderId) {
        msgs = msgs.filter(m => 
          (m.senderId === senderId && m.recipientId === recipientId) ||
          (m.senderId === recipientId && m.recipientId === senderId)
        );
      }

      res.json({
        success: true,
        messages: msgs,
        version: state.version,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messages - Send a new chat message
  app.post('/api/messages', (req, res) => {
    try {
      const { senderId, senderName, senderRole, channelId, recipientId, message, attachments, replyToId } = req.body;

      if (!message || !senderId) {
        return res.status(400).json({ success: false, error: 'پیام و شناسه ارسال‌کننده الزامی است.' });
      }

      const state = serverStore.getState();
      const currentMsgs = state.messages || [];
      const currentNotifs = state.notifications || [];

      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId,
        senderName: senderName || 'کاربر',
        senderRole: senderRole || 'Storekeeper',
        channelId,
        recipientId,
        message,
        attachments: attachments || [],
        replyToId,
        reactions: {},
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        isRead: false,
        readBy: [senderId],
      };

      const updatedMsgs = [...currentMsgs, newMsg];

      // If this is a direct message or tagged, generate a targeted notification
      const newNotifs = [...currentNotifs];
      if (recipientId) {
        newNotifs.unshift({
          id: `notif-chat-${Date.now()}`,
          type: 'ChatMessage',
          title: `پیام جدید از ${senderName}`,
          message: message.length > 60 ? `${message.substring(0, 60)}...` : message,
          date: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          linkTab: 'chat',
          targetUserId: recipientId,
          priority: 'urgent',
          senderName,
          metadata: {
            senderId,
            senderName,
            recipientId,
            channelId,
            isChatMessage: true
          }
        });
      } else if (channelId) {
        // Channel announcement
        newNotifs.unshift({
          id: `notif-chat-${Date.now()}`,
          type: 'ChatMessage',
          title: `پیام در کانال #${channelId}`,
          message: `${senderName}: ${message.length > 50 ? message.substring(0, 50) + '...' : message}`,
          date: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          linkTab: 'chat',
          targetRole: 'All',
          priority: 'normal',
          senderName,
          metadata: {
            senderId,
            senderName,
            channelId,
            isChatMessage: true
          }
        });
      }

      const updatedState = serverStore.updateState({
        messages: updatedMsgs,
        notifications: newNotifs.slice(0, 100) // keep latest 100 notifications
      });

      res.json({
        success: true,
        message: newMsg,
        version: updatedState.version,
      });
    } catch (err: any) {
      console.error('Error in POST /api/messages:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messages/:id/react - Toggle emoji reaction
  app.post('/api/messages/:id/react', (req, res) => {
    try {
      const { id } = req.params;
      const { emoji, userId } = req.body;
      if (!emoji || !userId) {
        return res.status(400).json({ success: false, error: 'Emoji and userId are required.' });
      }

      const state = serverStore.getState();
      const currentMsgs = state.messages || [];
      const msgIndex = currentMsgs.findIndex(m => m.id === id);

      if (msgIndex === -1) {
        return res.status(404).json({ success: false, error: 'پیام یافت نشد.' });
      }

      const msg = currentMsgs[msgIndex];
      const reactions = { ...(msg.reactions || {}) };
      const userList = reactions[emoji] || [];

      if (userList.includes(userId)) {
        reactions[emoji] = userList.filter(u => u !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...userList, userId];
      }

      currentMsgs[msgIndex] = { ...msg, reactions };
      const updatedState = serverStore.updateState({ messages: currentMsgs });

      res.json({
        success: true,
        message: currentMsgs[msgIndex],
        version: updatedState.version,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/messages/:id - Delete a message
  app.delete('/api/messages/:id', (req, res) => {
    try {
      const { id } = req.params;
      const state = serverStore.getState();
      const updatedMsgs = (state.messages || []).filter(m => m.id !== id);
      const updatedState = serverStore.updateState({ messages: updatedMsgs });
      res.json({ success: true, version: updatedState.version });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/messages/mark-read - Mark chat messages as seen/read across devices
  app.post('/api/messages/mark-read', (req, res) => {
    try {
      const { userId, channelId, senderId, messageIds } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'شناسه کاربر الزامی است.' });
      }

      const state = serverStore.getState();
      const currentMsgs = state.messages || [];
      const currentNotifs = state.notifications || [];
      let hasChanges = false;

      const updatedMsgs = currentMsgs.map(msg => {
        let shouldMark = false;

        if (messageIds && Array.isArray(messageIds)) {
          shouldMark = messageIds.includes(msg.id);
        } else if (channelId) {
          shouldMark = msg.channelId === channelId;
        } else if (senderId) {
          shouldMark = (msg.senderId === senderId && msg.recipientId === userId) ||
                       (msg.senderId === userId && msg.recipientId === senderId);
        } else {
          // Mark all messages targeted to or visible for this user
          shouldMark = msg.recipientId === userId || (!msg.recipientId && msg.senderId !== userId);
        }

        if (shouldMark) {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          const isDirectToUser = msg.recipientId === userId;

          if (!currentReadBy.includes(userId) || (isDirectToUser && !msg.isRead)) {
            hasChanges = true;
            return {
              ...msg,
              isRead: isDirectToUser ? true : msg.isRead,
              readBy: currentReadBy.includes(userId) ? currentReadBy : [...currentReadBy, userId]
            };
          }
        }
        return msg;
      });

      // Also mark matching ChatMessage notifications as read for this user
      const updatedNotifs = currentNotifs.map(notif => {
        if (notif.type === 'ChatMessage' && !notif.isRead) {
          if (notif.targetUserId === userId) {
            hasChanges = true;
            return { ...notif, isRead: true };
          }
          if (channelId && notif.metadata?.channelId === channelId) {
            hasChanges = true;
            return { ...notif, isRead: true };
          }
          if (senderId && notif.metadata?.senderId === senderId && notif.targetUserId === userId) {
            hasChanges = true;
            return { ...notif, isRead: true };
          }
          if (!channelId && !senderId && notif.type === 'ChatMessage') {
            hasChanges = true;
            return { ...notif, isRead: true };
          }
        }
        return notif;
      });

      if (hasChanges) {
        const updatedState = serverStore.updateState({
          messages: updatedMsgs,
          notifications: updatedNotifs
        });
        return res.json({
          success: true,
          version: updatedState.version,
          messages: updatedMsgs
        });
      }

      res.json({ success: true, version: state.version });
    } catch (err: any) {
      console.error('Error in POST /api/messages/mark-read:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // =========================================================================
  //  LEGACY SQL & BACKUP ROUTES (Optional / Progressive Enhancement)
  // =========================================================================

  // Warehouses
  app.get('/api/warehouses', async (req, res) => {
    try {
      const data = await db.select().from(warehouses);
      res.json(data);
    } catch {
      // Fallback to central server store
      res.json(serverStore.getState().warehouses);
    }
  });

  app.post('/api/warehouses', async (req, res) => {
    try {
      const wh = req.body;
      const current = serverStore.getState().warehouses || [];
      const updatedList = [...current.filter(w => w.id !== wh.id), wh];
      serverStore.updateState({ warehouses: updatedList });
      res.json(wh);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Items
  app.get('/api/items', async (req, res) => {
    try {
      const data = await db.select().from(items);
      res.json(data);
    } catch {
      // Fallback to central server store
      res.json(serverStore.getState().items);
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const itemData = req.body;
      const current = serverStore.getState().items || [];
      const updatedList = [...current.filter(i => i.id !== itemData.id), itemData];
      serverStore.updateState({ items: updatedList });
      res.json(itemData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Inventory
  app.get('/api/inventory', async (req, res) => {
    try {
      const data = await db.select().from(inventory);
      res.json(data);
    } catch {
      res.json(serverStore.getState().inventory);
    }
  });

  // Automatic SQL Backup Creation
  app.post('/api/backups/create', async (req, res) => {
    try {
      const { backupType = 'MANUAL' } = req.body;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${backupType}_${timestamp}.json`;
      const state = serverStore.getState();

      const dumpPayload = {
        meta: { timestamp, backupName, backupType, version: state.version },
        data: state
      };

      const record = {
        id: `bk-${Date.now()}`,
        timestamp: new Date().toLocaleString('fa-IR'),
        fileName: backupName,
        sizeKb: Math.round(JSON.stringify(dumpPayload).length / 1024),
        type: backupType as 'Manual' | 'Auto'
      };

      const updatedHistory = [record, ...(state.backupHistory || [])];
      serverStore.updateState({ 
        lastBackupTimestamp: record.timestamp,
        backupHistory: updatedHistory 
      });

      res.json({
        success: true,
        message: 'بکاپ با موفقیت در سرور ثبت و ایجاد گردید',
        backup: record,
        snapshot: dumpPayload
      });
    } catch (err: any) {
      res.status(500).json({ error: 'خطا در ایجاد فایل بکاپ', details: err.message });
    }
  });

  app.get('/api/backups', async (req, res) => {
    try {
      res.json(serverStore.getState().backupHistory || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Installer Scripts Download
  app.get('/api/installer/script', (req, res) => {
    const batPath = path.join(__dirname, 'setup.bat');
    if (fs.existsSync(batPath)) {
      res.download(batPath, 'AnbarMeh_Installer.bat');
    } else {
      res.status(404).send('Installer file not found');
    }
  });

  // =========================================================================
  //  AUTOMATIC BACKGROUND MESSENGER BACKUP SCHEDULER (Telegram & Bale)
  // =========================================================================
  const AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes
  setInterval(async () => {
    try {
      const state = serverStore.getState();
      const config = state.messengerConfig;
      if (!config) return;

      const isTelegramEnabled = config.telegram?.enabled && config.telegram?.sendAutoBackups && config.telegram?.botToken && config.telegram?.adminChatId;
      const isBaleEnabled = config.bale?.enabled && config.bale?.sendAutoBackups && config.bale?.botToken && config.bale?.adminChatId;

      if (!isTelegramEnabled && !isBaleEnabled) return;

      const intervalHours = config.autoSendIntervalHours || 24;
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const now = Date.now();

      let shouldSendTelegram = false;
      let shouldSendBale = false;

      if (isTelegramEnabled) {
        const lastSent = config.lastSentTelegramTimestamp ? new Date(config.lastSentTelegramTimestamp).getTime() : 0;
        if (now - lastSent >= intervalMs) {
          shouldSendTelegram = true;
        }
      }

      if (isBaleEnabled) {
        const lastSent = config.lastSentBaleTimestamp ? new Date(config.lastSentBaleTimestamp).getTime() : 0;
        if (now - lastSent >= intervalMs) {
          shouldSendBale = true;
        }
      }

      if (shouldSendTelegram || shouldSendBale) {
        console.log(`[AutoBackup] Initiating automated messenger backup dispatch (Telegram: ${shouldSendTelegram}, Bale: ${shouldSendBale})...`);
        const target = shouldSendTelegram && shouldSendBale ? 'all' : shouldSendTelegram ? 'telegram' : 'bale';
        
        const results = await dispatchBackupToMessengers(config, state, {
          target,
          title: `پشتیبان خودکار دوره‌ای سامانه انبارمه (${intervalHours} ساعته)`,
        });

        const timeFa = new Date().toLocaleString('fa-IR');
        const nowIso = new Date().toISOString();

        const updatedMessengerConfig = {
          ...config,
          ...(results.telegram ? {
            lastSentTelegramTimestamp: results.telegram.success ? nowIso : config.lastSentTelegramTimestamp,
            lastTelegramStatus: {
              success: results.telegram.success,
              time: timeFa,
              message: results.telegram.message,
            },
          } : {}),
          ...(results.bale ? {
            lastSentBaleTimestamp: results.bale.success ? nowIso : config.lastSentBaleTimestamp,
            lastBaleStatus: {
              success: results.bale.success,
              time: timeFa,
              message: results.bale.message,
            },
          } : {}),
        };

        serverStore.updateState({
          messengerConfig: updatedMessengerConfig,
          lastBackupTimestamp: timeFa,
        });
        console.log(`[AutoBackup] Completed messenger backup dispatch.`);
      }
    } catch (schedulerErr) {
      console.error('[AutoBackup] Error in automated messenger backup loop:', schedulerErr);
    }
  }, AUTO_CHECK_INTERVAL_MS);

  // Mount Static Assets or Vite Middleware
  // Auto-detect production mode: check if running bundled file, NODE_ENV=production, dist/index.html on disk, or embedded bundle in RAM
  const isBundled = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const scriptDir = typeof __filename !== 'undefined' ? path.dirname(__filename) : SERVER_ROOT_DIR;
  const possibleDistDirs = [
    path.resolve(SERVER_ROOT_DIR, 'dist'),
    path.resolve(scriptDir),
    path.resolve(scriptDir, 'dist'),
    path.resolve(scriptDir, '..', 'dist'),
    path.resolve(scriptDir, '..', '..', '..', 'dist'),
    path.resolve(scriptDir, '..', '..', '..', '..', 'dist'),
    path.resolve(NODE_CONFIG_DIR, '..', 'dist'),
  ];
  const activeDistPath = possibleDistDirs.find(d => fs.existsSync(path.join(d, 'index.html'))) || possibleDistDirs[0];
  const hasStaticDist = fs.existsSync(path.join(activeDistPath, 'index.html'));
  const embeddedStaticMap: Record<string, { mime: string; gz: string; size: number }> | undefined =
    (global as any).__ANBARMEH_EMBEDDED_STATIC__;
  const hasEmbeddedStatic = Boolean(embeddedStaticMap && embeddedStaticMap['/index.html']);
  const isExplicitProduction = process.env.NODE_ENV === 'production';
  const shouldServeStatic = isExplicitProduction || isBundled || hasStaticDist || hasEmbeddedStatic;

  const serveEmbeddedAsset = (req: express.Request, res: express.Response, assetKey: string): boolean => {
    if (!embeddedStaticMap || !embeddedStaticMap[assetKey]) return false;
    const entry = embeddedStaticMap[assetKey];
    res.setHeader('Content-Type', entry.mime);
    if (assetKey.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    const gzBuffer = Buffer.from(entry.gz, 'base64');
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.send(gzBuffer);
    } else {
      res.send(zlib.gunzipSync(gzBuffer));
    }
    return true;
  };

  if (shouldServeStatic && (hasStaticDist || hasEmbeddedStatic)) {
    if (hasStaticDist) {
      console.log(`[Production] Serving static files from disk: ${activeDistPath}`);
      app.use(express.static(activeDistPath, { maxAge: '1d', index: 'index.html' }));
    }
    if (hasEmbeddedStatic) {
      console.log(`[Production] Embedded Web UI active in memory (${Object.keys(embeddedStaticMap!).length} files ready for LAN clients)`);
      app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (req.path.startsWith('/api/')) return next();
        const lookupKey = req.path === '/' ? '/index.html' : req.path;
        if (serveEmbeddedAsset(req, res, lookupKey)) return;
        next();
      });
    }
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      const indexPath = path.join(activeDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      if (serveEmbeddedAsset(req, res, '/index.html')) {
        return;
      }
      res.status(404).send('Application build not found. Please run: npm run build');
    });
  } else if (!isBundled && !isExplicitProduction) {
    // Development mode with Vite middleware (loaded dynamically so bundled server.cjs never requires vite)
    try {
      console.log(`[Development] Initializing Vite middleware...`);
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn('[Server] Vite middleware initialization bypassed. Serving fallback:', viteError);
      if (hasStaticDist) {
        app.use(express.static(activeDistPath));
        app.get('*', (req, res) => res.sendFile(path.join(activeDistPath, 'index.html')));
      }
    }
  } else {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      if (serveEmbeddedAsset(req, res, '/index.html')) return;
      res.status(200).send('AnbarMeh Central SQL Server is active.');
    });
  }

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error Handler]:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
  });

  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` AnbarMeh Enterprise Central Server is LIVE!`);
    console.log(` Running on:`);
    console.log(`   - Local:    http://127.0.0.1:${PORT}`);
    console.log(`   - Network:  http://0.0.0.0:${PORT}`);
    console.log(` Port Mode:   ${PORT} (Custom or ENV configured)`);
    console.log(` Storage Path: ${serverStore.getStorageInfo().filePath}`);
    console.log(` Storage Size: ${serverStore.getStorageInfo().sizeKb} KB`);
    console.log(` Multi-client Real-Time Sync: ENABLED`);
    console.log(`=======================================================`);
  });

  let isShuttingDown = false;
  async function handleGracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}. Executing pre-update emergency backup...`);
    try {
      const state = serverStore.getState();
      serverStore.createSnapshotBackup('pre_shutdown');
      const config = state.messengerConfig || DEFAULT_MESSENGER_CONFIG;
      const tgToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const baleToken = config.bale?.botToken || process.env.BALE_BOT_TOKEN;
      if (tgToken || baleToken) {
        console.log('[Server] Dispatching pre-update backup to messenger bots...');
        await Promise.race([
          dispatchBackupToMessengers(config, state, {
            target: 'all',
            title: `🚨 پشتیبان خودکار پیش از ری‌استارت/آپدیت سرور (${new Date().toLocaleTimeString('fa-IR')})`
          }),
          new Promise(resolve => setTimeout(resolve, 8000))
        ]);
        console.log('[Server] Pre-update messenger backup dispatch finished.');
      }
    } catch (err) {
      console.error('[Server] Error during pre-update backup dispatch:', err);
    } finally {
      process.exit(0);
    }
  }

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => handleGracefulShutdown('SIGHUP'));

  serverInstance.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      if (boundPortServers.size > 0) {
        console.warn(`[Server] Port ${PORT} is already in use, but server is actively listening on secondary port(s): ${Array.from(boundPortServers.keys()).join(', ')}`);
      } else {
        console.error(`[CRITICAL] Port ${PORT} is already in use by another process!`);
        process.exit(1);
      }
    } else {
      console.error('[Server Fatal Error]:', err);
      process.exit(1);
    }
  });
}

startServer().catch((err) => {
  console.error('[FATAL STARTUP ERROR]:', err);
  try {
    fs.writeFileSync(path.join(process.cwd(), 'startup_error.log'), String(err?.stack || err), 'utf-8');
  } catch (_) {}
  process.exit(1);
});
