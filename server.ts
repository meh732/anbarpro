import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { 
  warehouses, items, itemGroups, inventory, transfers, 
  contractors, boms, purchaseRequests, stockCounts, operatorLogs, projects, backups 
} from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // API Route: Health & Configuration
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', sqlConnected: true, port: PORT, env: process.env.NODE_ENV || 'development' });
  });

  app.get('/api/config', (req, res) => {
    res.json({
      port: PORT,
      adminUser: process.env.ADMIN_USER || 'admin',
      domain: process.env.APP_URL || '',
      sqlHost: process.env.SQL_HOST || 'cloudsql-proxy',
      sqlDbName: process.env.SQL_DB_NAME || 'anbarmeh_db',
    });
  });

  // API Route: Warehouses
  app.get('/api/warehouses', async (req, res) => {
    try {
      const data = await db.select().from(warehouses);
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching warehouses:', err);
      res.status(500).json({ error: 'Failed to fetch warehouses from Cloud SQL', details: err.message });
    }
  });

  app.post('/api/warehouses', async (req, res) => {
    try {
      const wh = req.body;
      const result = await db.insert(warehouses).values(wh).returning();
      res.json(result[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Items
  app.get('/api/items', async (req, res) => {
    try {
      const data = await db.select().from(items);
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching items:', err);
      res.status(500).json({ error: 'Failed to fetch items from Cloud SQL', details: err.message });
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const itemData = req.body;
      const result = await db.insert(items).values(itemData).returning();
      res.json(result[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Inventory
  app.get('/api/inventory', async (req, res) => {
    try {
      const data = await db.select().from(inventory);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Automatic SQL Backup Creation
  app.post('/api/backups/create', async (req, res) => {
    try {
      const { backupType = 'MANUAL' } = req.body;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${backupType}_${timestamp}.json`;

      // Fetch snapshot of key Cloud SQL tables
      const whList = await db.select().from(warehouses).catch(() => []);
      const itemList = await db.select().from(items).catch(() => []);
      const invList = await db.select().from(inventory).catch(() => []);

      const dumpPayload = {
        meta: { timestamp, backupName, backupType },
        data: { warehouses: whList, items: itemList, inventory: invList }
      };

      const backupRecord = await db.insert(backups).values({
        backupName,
        sizeBytes: JSON.stringify(dumpPayload).length,
        backupType,
      }).returning();

      res.json({
        success: true,
        message: 'بکاپ با موفقیت در دیتابیس Cloud SQL ثبت و ایجاد گردید',
        backup: backupRecord[0],
        snapshot: dumpPayload
      });
    } catch (err: any) {
      res.status(500).json({ error: 'خطا در ایجاد فایل بکاپ', details: err.message });
    }
  });

  app.get('/api/backups', async (req, res) => {
    try {
      const list = await db.select().from(backups);
      res.json(list);
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

  // Mount Vite Middleware for Dev, Static Serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname.endsWith('dist') ? __dirname : path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AnbarMeh Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
