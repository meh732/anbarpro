import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { serverStore, getDefaultServerState } from './src/server/serverStore.ts';
import { 
  dispatchBackupToMessengers, sendTelegramMessage, sendBaleMessage, generateBackupSummary 
} from './src/server/messengerService.ts';
import { db } from './src/db/index.ts';
import { 
  warehouses, items, itemGroups, inventory, transfers, 
  contractors, boms, purchaseRequests, stockCounts, operatorLogs, projects, backups 
} from './src/db/schema.ts';

const __dirname = process.cwd();

// Global error guard to prevent any unhandled crash in production
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception in server process:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection in server process:', reason);
});

async function startServer() {
  const app = express();
  // Robust Port Detection: Support PORT, APP_PORT, HTTP_PORT with sanitization
  const rawPort = process.env.PORT || process.env.APP_PORT || process.env.HTTP_PORT || '3000';
  const PORT = parseInt(String(rawPort).trim(), 10) || 3000;

  // Parse JSON payloads up to 50MB (for bulk imports, attachments, and snapshots)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers if accessed across subnets
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Version');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Health & Configuration
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      serverMode: 'centralized_multiuser',
      port: PORT, 
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      hostname: os.hostname(),
      serverVersion: serverStore.getState().version,
    });
  });

  app.get('/api/config', (req, res) => {
    res.json({
      port: PORT,
      adminUser: process.env.ADMIN_USER || 'admin',
      adminPass: process.env.ADMIN_PASS || 'admin123',
      domain: process.env.APP_URL || '',
      sqlHost: process.env.SQL_HOST || 'cloudsql-proxy',
      sqlDbName: process.env.SQL_DB_NAME || 'anbarmeh_db',
    });
  });

  // API Route: Server Info & System Diagnostic
  app.get('/api/server-info', (req, res) => {
    const storageInfo = serverStore.getStorageInfo();
    const state = serverStore.getState();

    // Get server network interfaces (IP addresses)
    const interfaces = os.networkInterfaces();
    const ipList: string[] = [];
    Object.values(interfaces).forEach(ifaceArr => {
      ifaceArr?.forEach(iface => {
        if (!iface.internal && iface.family === 'IPv4') {
          ipList.push(iface.address);
        }
      });
    });

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
      port: PORT,
      storage: storageInfo,
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

  // 2. GET /api/data/version - Ultra-lightweight endpoint for 2-second background polling
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

  // 3. POST /api/sync - Real-time synchronization & delta merge from client
  app.post('/api/sync', (req, res) => {
    try {
      const { clientVersion, updates } = req.body;
      const currentState = serverStore.getState();

      if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
        // Apply client updates to server store
        const updatedState = serverStore.updateState(updates);
        return res.json({
          success: true,
          synced: true,
          serverVersion: updatedState.version,
          lastUpdated: updatedState.lastUpdated,
          data: updatedState,
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

  // 5. POST /api/reset-data - Reset server database to default factory state
  app.post('/api/reset-data', (req, res) => {
    try {
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
  app.post('/api/reset-empty', (req, res) => {
    try {
      const { keepUsers = true, companyName } = req.body || {};
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
      const config = state.messengerConfig || {
        telegram: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        bale: { enabled: false, botToken: '', adminChatId: '', sendAutoBackups: true, sendAlerts: true },
        autoSendIntervalHours: 24,
        includeSummaryText: true,
        lastSentTelegramTimestamp: null,
        lastSentBaleTimestamp: null,
        lastTelegramStatus: null,
        lastBaleStatus: null,
      };
      res.json({ success: true, config });
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
  // Auto-detect production mode: check if running bundled file, NODE_ENV=production, or dist/index.html exists
  const isBundled = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const possibleDistDirs = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, 'dist'),
    path.resolve(__dirname),
  ];
  const activeDistPath = possibleDistDirs.find(d => fs.existsSync(path.join(d, 'index.html'))) || possibleDistDirs[0];
  const hasStaticDist = fs.existsSync(path.join(activeDistPath, 'index.html'));
  const isExplicitProduction = process.env.NODE_ENV === 'production';
  const shouldServeStatic = isExplicitProduction || isBundled || hasStaticDist;

  if (shouldServeStatic && hasStaticDist) {
    console.log(`[Production] Serving static files from: ${activeDistPath}`);
    app.use(express.static(activeDistPath, { maxAge: '1d', index: false }));
    app.get('*', (req, res, next) => {
      // Don't intercept API routes
      if (req.path.startsWith('/api/')) return next();
      const indexPath = path.join(activeDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build not found. Please run: npm run build');
      }
    });
  } else {
    // Development mode with Vite middleware
    try {
      console.log(`[Development] Initializing Vite middleware...`);
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

  serverInstance.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[CRITICAL] Port ${PORT} is already in use by another process!`);
      console.error(`Please either stop the existing process or set a different PORT:`);
      console.error(`  fuser -k ${PORT}/tcp   (to kill the existing process)`);
      console.error(`  PORT=${PORT + 1} npm start (to run on another port)`);
      process.exit(1);
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
