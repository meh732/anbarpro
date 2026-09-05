/**
 * Pre-Build & Pre-Update Automated Backup Dispatcher
 * Automatically triggered before `npm run build` or server deployment.
 * 1. Backs up server_database.json to data/backups/
 * 2. If Telegram or Bale bot credentials are configured (in database or .env),
 *    dispatches the backup file and summary to the administrator's bot!
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv not loaded
}

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const backupsDir = path.join(dataDir, 'backups');
const dbFile = path.join(dataDir, 'server_database.json');

async function main() {
  console.log('----------------------------------------------------');
  console.log('[PreBuild Backup] Checking database and messenger configuration...');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    console.log('[PreBuild Backup] No database file found yet at', dbFile);
    return;
  }

  let dbData = null;
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    dbData = JSON.parse(raw);
  } catch (err) {
    console.error('[PreBuild Backup] Failed to read/parse database file:', err.message);
    return;
  }

  if (!dbData) return;

  // 1. Save timestamped backup to data/backups/
  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, '-');
  const backupFilename = `pre_update_backup_${timeStr}.json`;
  const backupFilePath = path.join(backupsDir, backupFilename);

  try {
    fs.writeFileSync(backupFilePath, JSON.stringify(dbData, null, 2), 'utf-8');
    console.log(`[PreBuild Backup] Successfully created local disk snapshot: ${backupFilename}`);
  } catch (err) {
    console.error('[PreBuild Backup] Failed to write disk snapshot:', err.message);
  }

  // Rotate backups to keep max 30 files
  try {
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'));
    if (files.length > 30) {
      files.sort((a, b) => fs.statSync(path.join(backupsDir, a)).mtimeMs - fs.statSync(path.join(backupsDir, b)).mtimeMs);
      const toDelete = files.slice(0, files.length - 30);
      toDelete.forEach(f => fs.unlinkSync(path.join(backupsDir, f)));
      console.log(`[PreBuild Backup] Rotated ${toDelete.length} older backups.`);
    }
  } catch (rotErr) {
    // Ignore
  }

  // 2. Dispatch to Telegram / Bale bot if configured
  const msgConfig = dbData.messengerConfig || {};
  const tgToken = (msgConfig.telegram && msgConfig.telegram.botToken) || process.env.TELEGRAM_BOT_TOKEN || '';
  const tgChatId = (msgConfig.telegram && msgConfig.telegram.adminChatId) || process.env.TELEGRAM_CHAT_ID || '';
  const tgProxy = (msgConfig.telegram && msgConfig.telegram.proxyUrl) || process.env.TELEGRAM_PROXY_URL || '';
  const tgApiBase = (msgConfig.telegram && msgConfig.telegram.apiBaseUrl) || process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';

  const baleToken = (msgConfig.bale && msgConfig.bale.botToken) || process.env.BALE_BOT_TOKEN || '';
  const baleChatId = (msgConfig.bale && msgConfig.bale.adminChatId) || process.env.BALE_CHAT_ID || '';
  const baleApiBase = (msgConfig.bale && msgConfig.bale.apiBaseUrl) || process.env.BALE_API_BASE_URL || 'https://tapi.bale.ai';

  const hasTg = Boolean(tgToken && tgChatId);
  const hasBale = Boolean(baleToken && baleChatId);

  if (!hasTg && !hasBale) {
    console.log('[PreBuild Backup] No Telegram or Bale bot credentials configured. Skipping offsite messenger dispatch.');
    console.log('----------------------------------------------------');
    return;
  }

  const itemsCount = (dbData.items && dbData.items.length) || 0;
  const whCount = (dbData.warehouses && dbData.warehouses.length) || 0;
  const prjCount = (dbData.projects && dbData.projects.length) || 0;

  const caption = [
    `🚨 <b>پشتیبان خودکار پیش از اعمال آپدیت و بیلد نرم‌افزار</b>`,
    `🏢 سامانه: ${dbData.companyName || 'مدیریت انبار و تولید انبارمه'}`,
    `📅 زمان ایجاد: ${now.toLocaleString('fa-IR')}`,
    `📦 تعداد اقلام کالا: ${itemsCount}`,
    `🏬 تعداد انبارها: ${whCount}`,
    `🏗️ تعداد پروژه‌ها: ${prjCount}`,
    `💾 نسخه پایگاه داده: ${dbData.version || '۱'}`,
    `<i>این فایل به طور خودکار قبل از اجرای بروزرسانی کدها ایجاد و ارسال شده است تا از عدم خام شدن دیتا اطمینان حاصل شود.</i>`
  ].join('\n');

  const fileBuffer = Buffer.from(JSON.stringify({
    meta: {
      exportedAt: now.toISOString(),
      reason: 'Pre-Build & Pre-Update Automated Snapshot',
      companyName: dbData.companyName,
      version: dbData.version
    },
    data: dbData
  }, null, 2));

  // Send to Telegram
  if (hasTg) {
    console.log('[PreBuild Backup] Dispatching backup file to Telegram bot...');
    try {
      await sendDocumentHttp(
        tgApiBase,
        tgToken,
        tgChatId,
        `anbarmeh_pre_update_${timeStr}.json`,
        fileBuffer,
        caption
      );
      console.log('[PreBuild Backup] Telegram backup sent successfully!');
    } catch (tgErr) {
      console.error('[PreBuild Backup] Telegram dispatch failed:', tgErr.message);
    }
  }

  // Send to Bale
  if (hasBale) {
    console.log('[PreBuild Backup] Dispatching backup file to Bale bot...');
    try {
      await sendDocumentHttp(
        baleApiBase,
        baleToken,
        baleChatId,
        `anbarmeh_pre_update_${timeStr}.json`,
        fileBuffer,
        caption
      );
      console.log('[PreBuild Backup] Bale backup sent successfully!');
    } catch (baleErr) {
      console.error('[PreBuild Backup] Bale dispatch failed:', baleErr.message);
    }
  }

  console.log('----------------------------------------------------');
}

function sendDocumentHttp(apiBase, token, chatId, filename, buffer, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----AnbarMehPreBuildBoundary' + Date.now();
    const cleanBase = apiBase.replace(/\/+$/, '');
    const targetUrl = new URL(`${cleanBase}/bot${token}/sendDocument`);

    const header = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="chat_id"\r\n\r\n`,
      `${chatId}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="caption"\r\n\r\n`,
      `${caption}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="parse_mode"\r\n\r\n`,
      `HTML\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="document"; filename="${filename}"\r\n`,
      `Content-Type: application/json\r\n\r\n`
    ].join('');

    const footer = `\r\n--${boundary}--\r\n`;

    const payload = Buffer.concat([
      Buffer.from(header, 'utf8'),
      buffer,
      Buffer.from(footer, 'utf8')
    ]);

    const isHttps = targetUrl.protocol === 'https:';
    const reqOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'User-Agent': 'AnbarMeh-PreBuild-Dispatcher/1.0'
      },
      timeout: 25000
    };

    const client = isHttps ? https : http;
    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        try {
          const parsed = JSON.parse(bodyStr);
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.ok !== false) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.description || bodyStr}`));
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, raw: bodyStr });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${bodyStr}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Connection timed out')));
    req.write(payload);
    req.end();
  });
}

main().catch(err => {
  console.error('[PreBuild Backup] Unexpected error:', err);
});
