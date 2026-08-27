import { MessengerBackupConfig, TelegramConfig, BaleConfig } from '../types';

export interface SendResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
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

  return `📦 <b>${customTitle || 'پشتیبان خودکار پایگاه داده سامانه انبارمه'}</b>

🏢 <b>شرکت/سازمان:</b> ${state.companyName || 'سامانه جامع مدیریت انبار'}
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

✅ فایل دیتابیس با پسوند JSON پیوست این پیام ارسال گردیده است.`;
}

/**
 * Send text message to Telegram
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  try {
    const cleanToken = botToken.trim().replace(/^bot/i, '');
    const cleanChatId = chatId.trim();

    if (!cleanToken || !cleanChatId) {
      return { success: false, message: 'توکن ربات تلگرام یا شناسه چت ادمین تنظیم نشده است.', timestamp };
    }

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      return { success: true, message: 'پیام با موفقیت به ادمین تلگرام ارسال شد.', timestamp, details: data };
    } else {
      return { 
        success: false, 
        message: `خطای تلگرام: ${data.description || response.statusText || 'عدم پاسخ‌دهی'}`, 
        timestamp, 
        details: data 
      };
    }
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'مهلت زمان اتصال به سرور تلگرام به پایان رسید (Timeout)' : err.message;
    return { success: false, message: `خطا در ارتباط با تلگرام: ${errorMsg}`, timestamp };
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
  caption: string
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  try {
    const cleanToken = botToken.trim().replace(/^bot/i, '');
    const cleanChatId = chatId.trim();

    if (!cleanToken || !cleanChatId) {
      return { success: false, message: 'توکن ربات تلگرام یا شناسه چت ادمین تنظیم نشده است.', timestamp };
    }

    const url = `https://api.telegram.org/bot${cleanToken}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    
    // Truncate caption if exceeding Telegram 1024 char limit
    const safeCaption = caption.length > 1000 ? caption.substring(0, 990) + '...' : caption;
    formData.append('caption', safeCaption);
    formData.append('parse_mode', 'HTML');

    const fileBlob = new Blob([jsonContent], { type: 'application/json' });
    formData.append('document', fileBlob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به تلگرام ارسال گردید.', timestamp, details: data };
    } else {
      // Fallback: If sendDocument fails, try sending summary message
      await sendTelegramMessage(cleanToken, cleanChatId, caption);
      return { 
        success: false, 
        message: `خطای ارسال فایل تلگرام: ${data.description || response.statusText || 'نامشخص'} (خلاصه متنی ارسال شد)`, 
        timestamp, 
        details: data 
      };
    }
  } catch (err: any) {
    return { success: false, message: `خطای ارسال فایل به تلگرام: ${err.message}`, timestamp };
  }
}

/**
 * Send text message to Bale Messenger (پیام‌رسان بله)
 */
export async function sendBaleMessage(botToken: string, chatId: string, text: string): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  try {
    const cleanToken = botToken.trim().replace(/^bot/i, '');
    const cleanChatId = chatId.trim();

    if (!cleanToken || !cleanChatId) {
      return { success: false, message: 'توکن ربات بله یا شناسه چت ادمین بله تنظیم نشده است.', timestamp };
    }

    const url = `https://tapi.bale.ai/bot${cleanToken}/sendMessage`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML'
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (response.ok && (data.ok || data.result)) {
      return { success: true, message: 'پیام با موفقیت به ادمین در پیام‌رسان بله ارسال شد.', timestamp, details: data };
    } else {
      return { 
        success: false, 
        message: `خطای پیام‌رسان بله: ${data.description || data.error_code || response.statusText || 'عدم دسترسی'}`, 
        timestamp, 
        details: data 
      };
    }
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'مهلت زمان اتصال به سرور بله به پایان رسید (Timeout)' : err.message;
    return { success: false, message: `خطا در ارتباط با پیام‌رسان بله: ${errorMsg}`, timestamp };
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
  caption: string
): Promise<SendResult> {
  const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  try {
    const cleanToken = botToken.trim().replace(/^bot/i, '');
    const cleanChatId = chatId.trim();

    if (!cleanToken || !cleanChatId) {
      return { success: false, message: 'توکن ربات بله یا شناسه چت ادمین بله تنظیم نشده است.', timestamp };
    }

    const url = `https://tapi.bale.ai/bot${cleanToken}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    
    const safeCaption = caption.length > 1000 ? caption.substring(0, 990) + '...' : caption;
    formData.append('caption', safeCaption);

    const fileBlob = new Blob([jsonContent], { type: 'application/json' });
    formData.append('document', fileBlob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (response.ok && (data.ok || data.result)) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به پیام‌رسان بله ارسال گردید.', timestamp, details: data };
    } else {
      // Fallback: If document upload failed, send summary text message to Bale
      await sendBaleMessage(cleanToken, cleanChatId, caption);
      return { 
        success: false, 
        message: `خطای ارسال سند بله: ${data.description || response.statusText || 'خطای سرور'} (خلاصه متنی ارسال گردید)`, 
        timestamp, 
        details: data 
      };
    }
  } catch (err: any) {
    return { success: false, message: `خطای ارسال فایل به بله: ${err.message}`, timestamp };
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
      caption
    );
  }

  // Dispatch to Bale
  if ((target === 'all' || target === 'bale') && config.bale?.enabled && config.bale?.botToken && config.bale?.adminChatId) {
    results.bale = await sendBaleDocument(
      config.bale.botToken,
      config.bale.adminChatId,
      filename,
      jsonContent,
      caption
    );
  }

  return results;
}
