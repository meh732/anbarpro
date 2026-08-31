import http from 'http';
import https from 'https';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { MessengerBackupConfig, TelegramConfig, BaleConfig } from '../types';
import { normalizeDigits, cleanBotToken, cleanChatId, escapeHtml, stripHtml } from '../utils/messengerUtils';

export { normalizeDigits, cleanBotToken, cleanChatId, escapeHtml, stripHtml };

export interface SendResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

/**
 * Create Proxy Agent for HTTP/HTTPS/SOCKS requests
 */
function getProxyAgent(proxyUrl?: string): http.Agent | https.Agent | undefined {
  const activeProxy = proxyUrl?.trim() || 
                      process.env.HTTPS_PROXY || 
                      process.env.HTTP_PROXY || 
                      process.env.ALL_PROXY;

  if (!activeProxy) return undefined;

  try {
    if (activeProxy.startsWith('socks')) {
      return new SocksProxyAgent(activeProxy);
    }
    return new HttpsProxyAgent(activeProxy);
  } catch (err) {
    console.error('Error initializing proxy agent:', err);
    return undefined;
  }
}

/**
 * Low-level HTTP/HTTPS JSON & Form Request Helper with timeout & proxy support
 */
async function executeHttpRequest(
  targetUrl: string,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Buffer | string;
    proxyUrl?: string;
    timeoutMs?: number;
  }
): Promise<{ status: number; data: any; rawText: string }> {
  const parsedUrl = new URL(targetUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const timeout = options.timeoutMs || 20000;
  const agent = getProxyAgent(options.proxyUrl);

  return new Promise((resolve, reject) => {
    const reqOptions: https.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method,
      headers: {
        'User-Agent': 'AnbarMeh-Messenger-Service/2.0',
        ...(options.headers || {})
      },
      agent: agent,
      timeout: timeout,
    };

    const req = (isHttps ? https : http).request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const rawText = Buffer.concat(chunks).toString('utf8');
        let parsedData: any = {};
        try {
          parsedData = JSON.parse(rawText);
        } catch {
          parsedData = { raw: rawText };
        }
        resolve({ status: res.statusCode || 0, data: parsedData, rawText });
      });
    });

    req.on('error', (err: any) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy(new Error('TIMEOUT_EXCEEDED'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Build RFC-compliant multipart form-data payload for file upload
 */
function buildMultipartPayload(
  fields: Record<string, string | number | undefined | null>,
  fileField: { name: string; filename: string; content: string | Buffer; contentType?: string }
): { body: Buffer; contentType: string } {
  const boundary = '----AnbarMehFormBoundary' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      chunks.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      ));
    }
  }

  chunks.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType || 'application/json'}\r\n\r\n`
  ));
  chunks.push(Buffer.isBuffer(fileField.content) ? fileField.content : Buffer.from(fileField.content, 'utf8'));
  chunks.push(Buffer.from('\r\n'));

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(chunks);
  const contentType = `multipart/form-data; boundary=${boundary}`;
  return { body, contentType };
}

/**
 * Format human-readable Persian summary of current database state
 */
export function generateBackupSummary(state: any, customTitle?: string): string {
  const now = new Date();
  const dateFa = now.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeFa = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const itemsCount = (state.items || []).length;
  const warehousesCount = (state.warehouses || []).length;
  const projectsCount = (state.projects || []).length;
  const bomsCount = (state.boms || []).length;
  const inDocsCount = (state.stockInDocs || []).length;
  const outDocsCount = (state.stockOutDocs || []).length;
  const transfersCount = (state.transfers || []).length;
  const usersCount = (state.users || []).length;
  const contractorsCount = (state.contractors || []).length;

  const totalRawJson = JSON.stringify(state);
  const sizeKb = Math.round(totalRawJson.length / 1024);

  const safeTitle = escapeHtml(customTitle || 'پشتیبان خودکار پایگاه داده سامانه انبارمه');
  const safeCompany = escapeHtml(state.companyName || 'سامانه جامع مدیریت انبار و تولید');

  return `📦 <b>${safeTitle}</b>

🏢 <b>شرکت/سازمان:</b> ${safeCompany}
📅 <b>تاریخ:</b> ${dateFa} | ⏰ <b>ساعت:</b> ${timeFa}
💾 <b>حجم فایل پشتیبان:</b> ${sizeKb} کیلوبایت

📊 <b>خلاصه آماری اطلاعات سیستم:</b>
  • 🏷️ <b>اقلام و کالاها:</b> ${itemsCount.toLocaleString('fa-IR')} قلم
  • 🏭 <b>انبارها:</b> ${warehousesCount.toLocaleString('fa-IR')} انبار
  • 📐 <b>فرمول‌های ساخت (BOM):</b> ${bomsCount.toLocaleString('fa-IR')} فرمول
  • 📋 <b>پروژه‌ها:</b> ${projectsCount.toLocaleString('fa-IR')} پروژه
  • 📥 <b>اسناد ورود به انبار:</b> ${inDocsCount.toLocaleString('fa-IR')} سند
  • 📤 <b>اسناد خروج از انبار:</b> ${outDocsCount.toLocaleString('fa-IR')} سند
  • 🔄 <b>حواله‌های انتقال:</b> ${transfersCount.toLocaleString('fa-IR')} حواله
  • 🤝 <b>پیمانکاران و کارگاه‌ها:</b> ${contractorsCount.toLocaleString('fa-IR')} مورد
  • 👥 <b>کاربران مجاز:</b> ${usersCount.toLocaleString('fa-IR')} کاربر

✅ فایل پایگاه داده با پسوند JSON پیوست این پیام ارسال گردید.`;
}

/**
 * Translate messenger error response into clear Persian advice
 */
function translateMessengerError(platform: 'telegram' | 'bale', errorObj: any, status: number, rawMsg: string): string {
  const desc = (errorObj?.description || errorObj?.message || rawMsg || '').toLowerCase();

  if (rawMsg.includes('TIMEOUT_EXCEEDED') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ECONNREFUSED')) {
    if (platform === 'telegram') {
      return 'عدم اتصال به سرور تلگرام به دلیل محدودیت‌های اینترنت یا فیلترینگ. لطفاً در تنظیمات ربات، آدرس پروکسی (Proxy URL) یا آدرس سرور آینه‌ای (Mirror API) را وارد فرمایید.';
    }
    return 'مهلت زمان اتصال به پیام‌رسان بله به پایان رسید (Timeout). لطفاً اتصال اینترنت سرور را بررسی کنید.';
  }

  if (desc.includes('unauthorized') || desc.includes('token not found') || status === 401 || (platform === 'bale' && status === 403 && desc.includes('token'))) {
    return `توکن ربات ${platform === 'telegram' ? 'تلگرام' : 'بله'} نامعتبر است. لطفاً توکن دریافتی از BotFather را مجدداً بررسی و کپی فرمایید.`;
  }

  if (desc.includes('chat not found') || desc.includes('chat_id is empty') || desc.includes('chat not registered')) {
    return `شناسه چت یافت نشد (Chat not found). لطفاً با حسابی که Chat ID آن را وارد کرده‌اید، ابتدا وارد صفحه ربات خود در ${platform === 'telegram' ? 'تلگرام' : 'بله'} شده و دستور /start را ارسال کنید تا ربات دسترسی پیام به شما داشته باشد.`;
  }

  if (desc.includes('blocked by the user')) {
    return `ربات توسط این حساب در ${platform === 'telegram' ? 'تلگرام' : 'بله'} مسدود (Block) شده است. لطفاً ربات را از حالت مسدود خارج نمایید.`;
  }

  if (desc.includes('can\'t parse entities') || desc.includes('parse')) {
    return 'خطای تجزیه فرمت متن پیام (سیستم متن ساده را ارسال خواهد کرد).';
  }

  return errorObj?.description || rawMsg || `خطای سرور با کد ${status}`;
}

// =========================================================================
//  TELEGRAM API CLIENT
// =========================================================================

/**
 * Verify Telegram Bot token via getMe
 */
export async function getTelegramBotInfo(botToken: string, options?: { apiBaseUrl?: string; proxyUrl?: string }): Promise<{ success: boolean; botName?: string; username?: string; message: string }> {
  const cleanToken = cleanBotToken(botToken);
  if (!cleanToken) {
    return { success: false, message: 'توکن ربات تلگرام خالی است.' };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://api.telegram.org').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/getMe`;

  try {
    const res = await executeHttpRequest(url, {
      method: 'GET',
      proxyUrl: options?.proxyUrl,
      timeoutMs: 15000
    });

    if (res.status === 200 && res.data.ok) {
      const b = res.data.result;
      return {
        success: true,
        botName: b.first_name,
        username: b.username ? `@${b.username}` : undefined,
        message: `ربات تلگرام معتبر است: ${b.first_name} (${b.username ? '@' + b.username : ''})`
      };
    } else {
      const msg = translateMessengerError('telegram', res.data, res.status, res.rawText);
      return { success: false, message: msg };
    }
  } catch (err: any) {
    const msg = translateMessengerError('telegram', null, 0, err.message);
    return { success: false, message: msg };
  }
}

/**
 * Send text message to Telegram with HTML & plain-text automatic fallback
 */
export async function sendTelegramMessage(
  botToken: string, 
  chatId: string, 
  text: string, 
  options?: { apiBaseUrl?: string; proxyUrl?: string }
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const cleanToken = cleanBotToken(botToken);
  const cleanChat = cleanChatId(chatId);

  if (!cleanToken || !cleanChat) {
    return { success: false, message: 'توکن ربات تلگرام یا شناسه چت ادمین تنظیم نشده است.', timestamp };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://api.telegram.org').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/sendMessage`;

  try {
    // Attempt 1: Send with HTML parse mode
    const payloadHtml = JSON.stringify({
      chat_id: cleanChat,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const res = await executeHttpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadHtml).toString() },
      body: payloadHtml,
      proxyUrl: options?.proxyUrl,
      timeoutMs: 15000
    });

    if (res.status === 200 && res.data.ok) {
      return { success: true, message: 'پیام با موفقیت به ادمین تلگرام ارسال شد.', timestamp, details: res.data };
    }

    // If HTML parsing failed, retry with plain text (stripped HTML)
    const rawDesc = (res.data?.description || '').toLowerCase();
    if (rawDesc.includes('parse') || rawDesc.includes('entity') || res.status === 400) {
      const plainText = stripHtml(text);
      const payloadPlain = JSON.stringify({
        chat_id: cleanChat,
        text: plainText,
        disable_web_page_preview: true
      });

      const retryRes = await executeHttpRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadPlain).toString() },
        body: payloadPlain,
        proxyUrl: options?.proxyUrl,
        timeoutMs: 15000
      });

      if (retryRes.status === 200 && retryRes.data.ok) {
        return { success: true, message: 'پیام (متن ساده) با موفقیت به تلگرام ارسال شد.', timestamp, details: retryRes.data };
      }
    }

    const translated = translateMessengerError('telegram', res.data, res.status, res.rawText);
    return { success: false, message: `خطای تلگرام: ${translated}`, timestamp, details: res.data };

  } catch (err: any) {
    const translated = translateMessengerError('telegram', null, 0, err.message);
    return { success: false, message: `خطا در ارتباط با تلگرام: ${translated}`, timestamp };
  }
}

/**
 * Send backup JSON document to Telegram
 */
export async function sendTelegramDocument(
  botToken: string, 
  chatId: string, 
  filename: string, 
  jsonContent: string, 
  caption: string,
  options?: { apiBaseUrl?: string; proxyUrl?: string }
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const cleanToken = cleanBotToken(botToken);
  const cleanChat = cleanChatId(chatId);

  if (!cleanToken || !cleanChat) {
    return { success: false, message: 'توکن ربات تلگرام یا شناسه چت ادمین تنظیم نشده است.', timestamp };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://api.telegram.org').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/sendDocument`;

  try {
    const safeCaption = caption.length > 950 ? caption.substring(0, 940) + '...' : caption;
    const { body, contentType } = buildMultipartPayload(
      {
        chat_id: cleanChat,
        caption: safeCaption,
        parse_mode: 'HTML'
      },
      {
        name: 'document',
        filename: filename,
        content: jsonContent,
        contentType: 'application/json'
      }
    );

    const res = await executeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length.toString()
      },
      body: body,
      proxyUrl: options?.proxyUrl,
      timeoutMs: 30000
    });

    if (res.status === 200 && res.data.ok) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به تلگرام ارسال گردید.', timestamp, details: res.data };
    }

    // Fallback: If document send fails, send summary text message
    await sendTelegramMessage(cleanToken, cleanChat, caption, options);
    const translated = translateMessengerError('telegram', res.data, res.status, res.rawText);
    return {
      success: false,
      message: `خطای ارسال فایل به تلگرام: ${translated} (خلاصه متنی ارسال گردید)`,
      timestamp,
      details: res.data
    };

  } catch (err: any) {
    // Fallback attempt text summary
    try {
      await sendTelegramMessage(cleanToken, cleanChat, caption, options);
    } catch {
      // ignore secondary error
    }
    const translated = translateMessengerError('telegram', null, 0, err.message);
    return { success: false, message: `خطای ارسال فایل به تلگرام: ${translated}`, timestamp };
  }
}

// =========================================================================
//  BALE MESSENGER API CLIENT (پیام‌رسان بله)
// =========================================================================

/**
 * Verify Bale Bot Token via getMe
 */
export async function getBaleBotInfo(botToken: string, options?: { apiBaseUrl?: string }): Promise<{ success: boolean; botName?: string; username?: string; message: string }> {
  const cleanToken = cleanBotToken(botToken);
  if (!cleanToken) {
    return { success: false, message: 'توکن بازوبند بله خالی است.' };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://tapi.bale.ai').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/getMe`;

  try {
    const res = await executeHttpRequest(url, {
      method: 'GET',
      timeoutMs: 15000
    });

    if (res.status === 200 && (res.data.ok || res.data.result)) {
      const b = res.data.result || res.data;
      return {
        success: true,
        botName: b.first_name || b.title || 'بازوبند بله',
        username: b.username ? `@${b.username}` : undefined,
        message: `بازوبند بله معتبر است: ${b.first_name || ''} (${b.username ? '@' + b.username : ''})`
      };
    } else {
      const msg = translateMessengerError('bale', res.data, res.status, res.rawText);
      return { success: false, message: msg };
    }
  } catch (err: any) {
    const msg = translateMessengerError('bale', null, 0, err.message);
    return { success: false, message: msg };
  }
}

/**
 * Send text message to Bale Messenger (پیام‌رسان بله)
 */
export async function sendBaleMessage(
  botToken: string, 
  chatId: string, 
  text: string,
  options?: { apiBaseUrl?: string }
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const cleanToken = cleanBotToken(botToken);
  const cleanChat = cleanChatId(chatId);

  if (!cleanToken || !cleanChat) {
    return { success: false, message: 'توکن بازوبند بله یا شناسه چت ادمین بله تنظیم نشده است.', timestamp };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://tapi.bale.ai').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/sendMessage`;

  try {
    // Attempt 1: Send with HTML parse mode
    const payloadHtml = JSON.stringify({
      chat_id: cleanChat,
      text: text,
      parse_mode: 'HTML'
    });

    const res = await executeHttpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadHtml).toString() },
      body: payloadHtml,
      timeoutMs: 15000
    });

    if (res.status === 200 && (res.data.ok || res.data.result)) {
      return { success: true, message: 'پیام با موفقیت به ادمین در پیام‌رسان بله ارسال شد.', timestamp, details: res.data };
    }

    // Attempt 2: Fallback to plain text if HTML parsing or special tags were rejected
    const plainText = stripHtml(text);
    const payloadPlain = JSON.stringify({
      chat_id: cleanChat,
      text: plainText
    });

    const retryRes = await executeHttpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadPlain).toString() },
      body: payloadPlain,
      timeoutMs: 15000
    });

    if (retryRes.status === 200 && (retryRes.data.ok || retryRes.data.result)) {
      return { success: true, message: 'پیام (متن ساده) با موفقیت به پیام‌رسان بله ارسال شد.', timestamp, details: retryRes.data };
    }

    const translated = translateMessengerError('bale', res.data, res.status, res.rawText);
    return { success: false, message: `خطای پیام‌رسان بله: ${translated}`, timestamp, details: res.data };

  } catch (err: any) {
    const translated = translateMessengerError('bale', null, 0, err.message);
    return { success: false, message: `خطا در ارتباط با پیام‌رسان بله: ${translated}`, timestamp };
  }
}

/**
 * Send backup JSON document to Bale Messenger (پیام‌رسان بله)
 */
export async function sendBaleDocument(
  botToken: string, 
  chatId: string, 
  filename: string, 
  jsonContent: string, 
  caption: string,
  options?: { apiBaseUrl?: string }
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const cleanToken = cleanBotToken(botToken);
  const cleanChat = cleanChatId(chatId);

  if (!cleanToken || !cleanChat) {
    return { success: false, message: 'توکن بازوبند بله یا شناسه چت ادمین بله تنظیم نشده است.', timestamp };
  }

  const baseUrl = (options?.apiBaseUrl || 'https://tapi.bale.ai').trim().replace(/\/+$/, '');
  const url = `${baseUrl}/bot${cleanToken}/sendDocument`;

  try {
    // Bale prefers plain text or simple caption
    const safeCaption = stripHtml(caption);
    const trimmedCaption = safeCaption.length > 950 ? safeCaption.substring(0, 940) + '...' : safeCaption;

    const { body, contentType } = buildMultipartPayload(
      {
        chat_id: cleanChat,
        caption: trimmedCaption
      },
      {
        name: 'document',
        filename: filename,
        content: jsonContent,
        contentType: 'application/json'
      }
    );

    const res = await executeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length.toString()
      },
      body: body,
      timeoutMs: 30000
    });

    if (res.status === 200 && (res.data.ok || res.data.result)) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به پیام‌رسان بله ارسال گردید.', timestamp, details: res.data };
    }

    // Fallback: send text summary message
    await sendBaleMessage(cleanToken, cleanChat, caption, options);
    const translated = translateMessengerError('bale', res.data, res.status, res.rawText);
    return {
      success: false,
      message: `خطای ارسال سند بله: ${translated} (خلاصه متنی ارسال گردید)`,
      timestamp,
      details: res.data
    };

  } catch (err: any) {
    try {
      await sendBaleMessage(cleanToken, cleanChat, caption, options);
    } catch {
      // ignore secondary error
    }
    const translated = translateMessengerError('bale', null, 0, err.message);
    return { success: false, message: `خطای ارسال فایل به بله: ${translated}`, timestamp };
  }
}

/**
 * High-level function to dispatch backup to configured messengers (Telegram & Bale)
 */
export async function dispatchBackupToMessengers(
  config: MessengerBackupConfig, 
  databaseState: any, 
  options?: { target?: 'all' | 'telegram' | 'bale'; title?: string }
): Promise<{
  telegram?: SendResult;
  bale?: SendResult;
  summary: string;
}> {
  const target = options?.target || 'all';
  const customTitle = options?.title || 'پشتیبان پایگاه داده سامانه انبارمه';

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toISOString().slice(11, 16).replace(':', '-');
  const filename = `anbarmeh_backup_${dateStr}_${timeStr}.json`;
  
  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      companyName: databaseState.companyName,
      version: databaseState.version,
      source: 'AnbarMeh Enterprise Automated Messenger Dispatcher',
    },
    data: databaseState,
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const caption = generateBackupSummary(databaseState, customTitle);

  const results: { telegram?: SendResult; bale?: SendResult; summary: string } = {
    summary: caption,
  };

  // Dispatch to Telegram
  if ((target === 'all' || target === 'telegram') && config.telegram?.enabled && config.telegram?.botToken && config.telegram?.adminChatId) {
    results.telegram = await sendTelegramDocument(
      config.telegram.botToken,
      config.telegram.adminChatId,
      filename,
      jsonContent,
      caption,
      {
        apiBaseUrl: config.telegram.apiBaseUrl,
        proxyUrl: config.telegram.proxyUrl
      }
    );
  }

  // Dispatch to Bale
  if ((target === 'all' || target === 'bale') && config.bale?.enabled && config.bale?.botToken && config.bale?.adminChatId) {
    results.bale = await sendBaleDocument(
      config.bale.botToken,
      config.bale.adminChatId,
      filename,
      jsonContent,
      caption,
      {
        apiBaseUrl: config.bale.apiBaseUrl
      }
    );
  }

  return results;
}
