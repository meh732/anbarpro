/**
 * Messenger Utility Functions for Text Normalization & Sanitization
 * (Safe for both Browser and Node.js environments)
 */

/**
 * Convert Persian and Arabic digits to standard English digits
 */
export function normalizeDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = '';
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    const pIndex = persianDigits.indexOf(char);
    if (pIndex !== -1) {
      result += pIndex.toString();
      continue;
    }
    const aIndex = arabicDigits.indexOf(char);
    if (aIndex !== -1) {
      result += aIndex.toString();
      continue;
    }
    result += char;
  }
  return result;
}

/**
 * Clean and normalize bot token
 */
export function cleanBotToken(token: string | undefined | null): string {
  if (!token) return '';
  let clean = normalizeDigits(token).trim();
  // Strip quotes
  clean = clean.replace(/^['"]+|['"]+$/g, '');
  // Extract token if user pasted whole URL e.g. https://api.telegram.org/bot12345:ABC...
  const urlMatch = clean.match(/bot([0-9]+:[a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }
  // Strip leading 'bot' or 'BOT'
  clean = clean.replace(/^bot/i, '').trim();
  return clean;
}

/**
 * Clean and normalize Chat ID (preserves negative sign for channels/supergroups)
 */
export function cleanChatId(chatId: string | number | undefined | null): string {
  if (chatId === undefined || chatId === null) return '';
  let clean = normalizeDigits(chatId).trim();
  // Strip quotes
  clean = clean.replace(/^['"]+|['"]+$/g, '');
  // Strip prefixes like "id:", "chat_id:", "شناسه:", "user_id:"
  clean = clean.replace(/^(id|chat_id|user_id|شناسه|چت)\s*[:=]\s*/i, '').trim();
  // Remove whitespace
  clean = clean.replace(/\s+/g, '');
  return clean;
}

/**
 * Escape HTML characters for Telegram & Bale HTML parse mode
 */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Strip HTML tags into clean plain text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
