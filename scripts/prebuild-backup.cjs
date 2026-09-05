/**
 * Pre-Build & Pre-Update Automated Backup Dispatcher
 * Automatically triggered BEFORE git update, build, or deployment.
 * 1. Reads user's active database & loads Telegram/Bale bot credentials
 * 2. Creates timestamped local snapshot backups in data/backups & /var/backups/anbarpro
 * 3. Immediately dispatches the complete database file and summary to Telegram and/or Bale bots!
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Try loading environment variables
const envPaths = [
  path.join(process.cwd(), '.env'),
  '/usr/local/anbarpro/.env',
  path.join(__dirname, '..', '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath });
      break;
    } catch (e) {
      // Ignore
    }
  }
}

const rootDir = process.cwd();
const possibleDbPaths = [
  path.join(rootDir, 'data', 'server_database.json'),
  '/usr/local/anbarpro/data/server_database.json',
  '/var/backups/anbarpro/server_database_update_safe.json',
  '/tmp/server_database_update_safe.json'
];

function getProxyAgent(proxyUrl) {
  const activeProxy = proxyUrl || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!activeProxy) return undefined;
  try {
    if (activeProxy.startsWith('socks')) {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      return new SocksProxyAgent(activeProxy);
    }
    const { HttpsProxyAgent } = require('https-proxy-agent');
    return new HttpsProxyAgent(activeProxy);
  } catch (e) {
    return undefined;
  }
}

async function main() {
  console.log('\n==================================================================');
  console.log('🤖 [Pre-Update Backup] فراخوانی تنظیمات ربات و ارسال نسخه پشتیبان');
  console.log('==================================================================');

  // Find active database
  let dbFile = null;
  for (const candidate of possibleDbPaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 10) {
      dbFile = candidate;
      break;
    }
  }

  // Also check backups folder for latest valid json if main file not found
  const backupsDir = path.join(rootDir, 'data', 'backups');
  if (!fs.existsSync(backupsDir)) {
    try { fs.mkdirSync(backupsDir, { recursive: true }); } catch (e) {}
  }
  const sysBackupDir = '/var/backups/anbarpro';
  if (!fs.existsSync(sysBackupDir)) {
    try { fs.mkdirSync(sysBackupDir, { recursive: true }); } catch (e) {}
  }

  if (!dbFile && fs.existsSync(backupsDir)) {
    const list = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'));
    if (list.length > 0) {
      list.sort((a, b) => fs.statSync(path.join(backupsDir, b)).mtimeMs - fs.statSync(path.join(backupsDir, a)).mtimeMs);
      dbFile = path.join(backupsDir, list[0]);
    }
  }

  if (!dbFile) {
    console.log('ℹ️ [Pre-Update Backup] هیچ دیتابیس فعالی یافت نشد (نصب اولیه یا دیتابیس خالی).');
    console.log('==================================================================\n');
    return;
  }

  console.log(`📦 [Pre-Update Backup] دیتابیس فعال با موفقیت خوانده شد: ${dbFile} (${Math.round(fs.statSync(dbFile).size / 1024)} KB)`);

  let dbData = null;
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    dbData = JSON.parse(raw);
  } catch (err) {
    console.error('❌ [Pre-Update Backup] خطا در پارس کردن فایل دیتابیس:', err.message);
    return;
  }

  if (!dbData) return;

  // 1. Save timestamped backup locally
  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, '-');
  const backupFilename = `pre_update_backup_${timeStr}.json`;
  const backupFilePath = path.join(backupsDir, backupFilename);
  const sysBackupFilePath = path.join(sysBackupDir, 'server_database_update_safe.json');

  try {
    const serialized = JSON.stringify(dbData, null, 2);
    fs.writeFileSync(backupFilePath, serialized, 'utf-8');
    fs.writeFileSync(sysBackupFilePath, serialized, 'utf-8');
    console.log(`💾 [Pre-Update Backup] پشتیبان محلی امن با موفقیت ذخیره شد:`);
    console.log(`   🔹 ${backupFilePath}`);
    console.log(`   🔹 ${sysBackupFilePath}`);
  } catch (err) {
    console.error('⚠️ [Pre-Update Backup] خطا در ذخیره پشتیبان دیسک:', err.message);
  }

  // Rotate local backups
  try {
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'));
    if (files.length > 25) {
      files.sort((a, b) => fs.statSync(path.join(backupsDir, a)).mtimeMs - fs.statSync(path.join(backupsDir, b)).mtimeMs);
      const toDelete = files.slice(0, files.length - 25);
      toDelete.forEach(f => fs.unlinkSync(path.join(backupsDir, f)));
    }
  } catch (rotErr) {}

  // 2. Fetch bot credentials from database & .env
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
    console.log('ℹ️ [Pre-Update Backup] تنظیمات توکن یا شناسه چت برای ربات‌های تلگرام یا بله ثبت نشده است.');
    console.log('   (نسخه پشتیبان به طور کامل در دیسک سرور محافظت شده و به روزرسانی ادامه می‌یابد)');
    console.log('==================================================================\n');
    return;
  }

  const itemsCount = (dbData.items && dbData.items.length) || 0;
  const whCount = (dbData.warehouses && dbData.warehouses.length) || 0;
  const prjCount = (dbData.projects && dbData.projects.length) || 0;
  const companyName = dbData.companyName || 'مدیریت انبار و تولید انبارمه';

  const persianDate = now.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  const persianTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const caption = [
    `🚨 <b>پشتیبان خودکار پیش از آپدیت سامانه (Pre-Update Backup)</b>`,
    `🏢 سامانه: <b>${companyName}</b>`,
    `📅 تاریخ: ${persianDate} - ساعت: ${persianTime}`,
    `📦 تعداد اقلام کالا: <b>${itemsCount}</b> قلم`,
    `🏬 تعداد انبارها: <b>${whCount}</b> انبار`,
    `🏗️ پروژه‌ها: <b>${prjCount}</b> پروژه`,
    `🛡️ <i>این فایل پشتیبان به صورت خودکار پیش از اجرای دستور آپدیت گیت‌هاب ایجاد و به ربات ارسال گردید تا از امنیت ۱۰۰٪ دیتابیس اطمینان حاصل شود.</i>`
  ].join('\n');

  const fileBuffer = Buffer.from(JSON.stringify({
    meta: {
      exportedAt: now.toISOString(),
      reason: 'Pre-Update Automated Full Snapshot',
      companyName: companyName,
      version: dbData.version || 1
    },
    data: dbData
  }, null, 2));

  // Dispatch to Bale Bot (Works high-speed without proxy in Iran)
  if (hasBale) {
    console.log(`\n📱 [Pre-Update Backup] در حال ارسال فایل پشتیبان به ربات بله (Chat ID: ${baleChatId})...`);
    try {
      await sendDocumentHttp({
        apiBase: baleApiBase,
        token: baleToken,
        chatId: baleChatId,
        filename: `anbarpro_backup_${timeStr}.json`,
        buffer: fileBuffer,
        caption: caption
      });
      console.log('✅ [Pre-Update Backup] فایل پشتیبان با موفقیت به پیام‌رسان بله ارسال گردید!');
    } catch (baleErr) {
      console.error(`⚠️ [Pre-Update Backup] خطا در ارسال به بله: ${baleErr.message}`);
    }
  }

  // Dispatch to Telegram Bot
  if (hasTg) {
    console.log(`\n📱 [Pre-Update Backup] در حال ارسال فایل پشتیبان به ربات تلگرام (Chat ID: ${tgChatId})...`);
    try {
      await sendDocumentHttp({
        apiBase: tgApiBase,
        token: tgToken,
        chatId: tgChatId,
        filename: `anbarpro_backup_${timeStr}.json`,
        buffer: fileBuffer,
        caption: caption,
        proxyUrl: tgProxy
      });
      console.log('✅ [Pre-Update Backup] فایل پشتیبان با موفقیت به تلگرام ارسال گردید!');
    } catch (tgErr) {
      console.error(`⚠️ [Pre-Update Backup] خطا در ارسال به تلگرام: ${tgErr.message}`);
    }
  }

  console.log('\n==================================================================');
  console.log('✅ [Pre-Update Backup] فرآیند پشتیبان‌گیری و ارسال به ربات خاتمه یافت.');
  console.log('==================================================================\n');
}

function sendDocumentHttp(options) {
  const { apiBase, token, chatId, filename, buffer, caption, proxyUrl } = options;
  return new Promise((resolve, reject) => {
    const boundary = '----AnbarMehPreBuildBoundary' + Date.now();
    const cleanBase = (apiBase || 'https://api.telegram.org').replace(/\/+$/, '');
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
    const agent = getProxyAgent(proxyUrl);

    const reqOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'User-Agent': 'AnbarPro-PreUpdate-Dispatcher/2.0'
      },
      agent: agent,
      timeout: 20000
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
    req.on('timeout', () => req.destroy(new Error('Connection timed out after 20s')));
    req.write(payload);
    req.end();
  });
}

main().catch(err => {
  console.error('[PreBuild Backup] Unexpected error:', err);
});

