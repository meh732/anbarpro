/**
 * Security & Cryptography Utilities for AnbarMeh ERP
 * - SHA-256 Salted Password Hashing & Verification
 * - Brute-Force Rate Limiting & Account Lockout
 * - Password Strength Analyzer
 * - User Password Migration to Cryptographic Hash
 */

import { User } from '../types';

const GLOBAL_SALT = 'anbarmeh_secure_salt_v2026_';

// Simple and robust SHA-256 implementation (works in browser & node without external dependencies)
export async function sha256(message: string): Promise<string> {
  // Use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgUint8 = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Pure JS fallback implementation of SHA-256 for environments where crypto.subtle is not accessible
  return sha256PureJs(message);
}

// Synchronous fast hash for instant UI checks
export function sha256Sync(message: string): string {
  return sha256PureJs(message);
}

function sha256PureJs(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while ((ascii.length % 64) - 56 !== 0) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Creates a salted SHA-256 hash of a password
 */
export function hashPassword(plainPassword: string, usernameSalt = ''): string {
  if (!plainPassword) return '';
  const salt = `${GLOBAL_SALT}${usernameSalt.toLowerCase()}`;
  return `sha256$${sha256Sync(plainPassword + ':' + salt)}`;
}

/**
 * Checks if a stored password string is already in hashed format
 */
export function isPasswordHashed(storedPass: string | undefined): boolean {
  if (!storedPass) return false;
  return storedPass.startsWith('sha256$') && storedPass.length >= 64;
}

/**
 * Verifies a plain password against the stored credential (whether hashed or legacy plain text)
 */
export function verifyPassword(plainPassword: string, storedPasswordOrHash: string | undefined, username = ''): boolean {
  if (!storedPasswordOrHash) return false;
  if (!plainPassword) return false;

  // Case 1: Password is stored as a secure SHA-256 hash
  if (isPasswordHashed(storedPasswordOrHash)) {
    const computedHash = hashPassword(plainPassword, username);
    return computedHash === storedPasswordOrHash;
  }

  // Case 2: Legacy unhashed password (for automatic upgrade on login)
  return plainPassword === storedPasswordOrHash;
}

/**
 * Ensures all users in the system have their passwords safely hashed
 */
export function ensureUsersPasswordsHashed(usersList: User[]): User[] {
  return usersList.map(u => {
    if (!u.password) {
      return { ...u, password: hashPassword('123456', u.username) };
    }
    if (!isPasswordHashed(u.password)) {
      return { ...u, password: hashPassword(u.password, u.username) };
    }
    return u;
  });
}

/**
 * Brute-Force Rate Limiter for Login Protection
 */
interface FailedAttemptRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds lockout
const ATTEMPT_RESET_TIME_MS = 5 * 60 * 1000; // 5 minutes reset

const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

export function getAccountLockoutStatus(username: string): { isLocked: boolean; remainingSeconds: number } {
  const key = username.trim().toLowerCase();
  const record = failedAttemptsMap.get(key);
  if (!record) return { isLocked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    // Lockout expired, reset attempts
    failedAttemptsMap.delete(key);
  }

  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedLogin(username: string): { isNowLocked: boolean; attemptsLeft: number; remainingSeconds: number } {
  const key = username.trim().toLowerCase();
  const now = Date.now();
  const existing = failedAttemptsMap.get(key);

  let attempts = 1;
  if (existing) {
    if (now - existing.lastAttemptAt < ATTEMPT_RESET_TIME_MS) {
      attempts = existing.attempts + 1;
    }
  }

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttemptsMap.set(key, { attempts, lockedUntil, lastAttemptAt: now });
    return { isNowLocked: true, attemptsLeft: 0, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  failedAttemptsMap.set(key, { attempts, lockedUntil: null, lastAttemptAt: now });
  return { isNowLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - attempts, remainingSeconds: 0 };
}

export function recordSuccessfulLogin(username: string): void {
  const key = username.trim().toLowerCase();
  failedAttemptsMap.delete(key);
}

/**
 * Password Strength Evaluator (returns score 0-4 and descriptive label)
 */
export function evaluatePasswordStrength(password: string): {
  score: number; // 0 to 4
  labelFa: string;
  labelEn: string;
  label: string;
  color: string;
  feedback: string[];
} {
  if (!password) {
    return { score: 0, labelFa: 'خیلی ضعیف', labelEn: 'Very Weak', label: 'خیلی ضعیف', color: 'bg-slate-300 text-slate-700', feedback: [] };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const normalizedScore = Math.min(4, Math.max(1, score - 1));

  switch (normalizedScore) {
    case 1:
      return { score: 1, labelFa: 'ضعیف', labelEn: 'Weak', label: 'ضعیف', color: 'bg-rose-500 text-white', feedback: ['افزایش طول به حداقل ۸ کاراکتر'] };
    case 2:
      return { score: 2, labelFa: 'متوسط', labelEn: 'Fair', label: 'متوسط', color: 'bg-amber-500 text-white', feedback: ['ترکیب حروف و اعداد'] };
    case 3:
      return { score: 3, labelFa: 'خوب', labelEn: 'Good', label: 'خوب', color: 'bg-indigo-500 text-white', feedback: ['استفاده از کاراکترهای خاص'] };
    case 4:
    default:
      return { score: 4, labelFa: 'بسیار قوی و امن', labelEn: 'Strong', label: 'بسیار قوی و امن', color: 'bg-emerald-500 text-white', feedback: [] };
  }
}

/**
 * Format Rial numbers with comma grouping and symbol
 */
export function formatCurrency(amount: number | undefined | null, currency = 'ریال'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰ ' + currency;
  return `${Math.round(amount).toLocaleString('fa-IR')} ${currency}`;
}

