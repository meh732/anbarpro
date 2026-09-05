import fs from 'fs';
import path from 'path';
import { 
  INITIAL_ITEMS, INITIAL_ITEM_GROUPS, INITIAL_WAREHOUSES, INITIAL_CONTRACTORS, 
  INITIAL_INVENTORY, INITIAL_BOMS, INITIAL_PROJECTS, INITIAL_OPERATORS, 
  INITIAL_USERS, INITIAL_STOCK_COUNTINGS, INITIAL_STOCK_IN_DOCS, 
  INITIAL_STOCK_OUT_DOCS, INITIAL_TRANSFERS, INITIAL_PURCHASE_REQUESTS, 
  INITIAL_PRODUCTION_LOGS, INITIAL_MATERIAL_HANDOVERS, INITIAL_NOTIFICATIONS, 
  INITIAL_TRACEABILITY, INITIAL_AUDIT_LOGS, INITIAL_CHANNELS, INITIAL_MESSAGES 
} from '../data/mockData';
import {
  Item, ItemGroup, Warehouse, InventoryBalance, BOM, Project, Operator, User,
  StockInDoc, StockOutDoc, WarehouseTransfer, PurchaseRequest, ProductionLog,
  MaterialHandover, TraceabilityEvent, SystemNotification, AuditLog, Contractor,
  StockCountingSession, ChatMessage, ChatChannel, MessengerBackupConfig
} from '../types';

export interface ServerDatabaseState {
  version: number;
  lastUpdated: string;
  isInstalled: boolean;
  companyName: string;
  autoBackupIntervalHours: number;
  lastBackupTimestamp: string;
  backupHistory: Array<{ id: string; timestamp: string; fileName: string; sizeKb: number; type: 'Manual' | 'Auto' }>;
  messengerConfig?: MessengerBackupConfig;
  users: User[];
  items: Item[];
  itemGroups: ItemGroup[];
  warehouses: Warehouse[];
  contractors: Contractor[];
  inventory: InventoryBalance[];
  boms: BOM[];
  projects: Project[];
  operators: Operator[];
  stockCountings: StockCountingSession[];
  stockInDocs: StockInDoc[];
  stockOutDocs: StockOutDoc[];
  transfers: WarehouseTransfer[];
  purchaseRequests: PurchaseRequest[];
  productionLogs: ProductionLog[];
  materialHandovers: MaterialHandover[];
  notifications: SystemNotification[];
  messages: ChatMessage[];
  channels: ChatChannel[];
  traceabilityEvents: TraceabilityEvent[];
  auditLogs: AuditLog[];
}

export function getDefaultServerState(): ServerDatabaseState {
  const adminUser: User = {
    id: 'usr-1',
    username: 'admin',
    password: '123',
    fullName: 'مدیر ارشد سیستم',
    role: 'SystemAdmin',
    department: 'مدیریت',
    email: 'admin@local.host',
    allowedTabs: ['*'],
    isActive: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canViewPrices: true
  };

  const hasTgEnv = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const hasBaleEnv = Boolean(process.env.BALE_BOT_TOKEN && process.env.BALE_CHAT_ID);

  return {
    version: Date.now(),
    lastUpdated: new Date().toISOString(),
    isInstalled: true,
    companyName: 'سامانه یکپارچه مدیریت انبار و تولید انبارمه',
    autoBackupIntervalHours: 24,
    lastBackupTimestamp: new Date().toISOString(),
    backupHistory: [],
    messengerConfig: {
      telegram: {
        enabled: hasTgEnv,
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        adminChatId: process.env.TELEGRAM_CHAT_ID || '',
        proxyUrl: process.env.TELEGRAM_PROXY_URL || '',
        apiBaseUrl: process.env.TELEGRAM_API_BASE_URL || '',
        sendAutoBackups: true,
        sendAlerts: true
      },
      bale: {
        enabled: hasBaleEnv,
        botToken: process.env.BALE_BOT_TOKEN || '',
        adminChatId: process.env.BALE_CHAT_ID || '',
        apiBaseUrl: process.env.BALE_API_BASE_URL || '',
        sendAutoBackups: true,
        sendAlerts: true
      },
      autoSendIntervalHours: 24,
      includeSummaryText: true,
      lastSentTelegramTimestamp: null,
      lastSentBaleTimestamp: null,
      lastTelegramStatus: null,
      lastBaleStatus: null,
    },
    users: (INITIAL_USERS && INITIAL_USERS.length > 0) ? INITIAL_USERS : [adminUser],
    items: INITIAL_ITEMS || [],
    itemGroups: INITIAL_ITEM_GROUPS || [],
    warehouses: INITIAL_WAREHOUSES || [],
    contractors: INITIAL_CONTRACTORS || [],
    inventory: INITIAL_INVENTORY || [],
    boms: INITIAL_BOMS || [],
    projects: INITIAL_PROJECTS || [],
    operators: INITIAL_OPERATORS || [],
    stockCountings: INITIAL_STOCK_COUNTINGS || [],
    stockInDocs: INITIAL_STOCK_IN_DOCS || [],
    stockOutDocs: INITIAL_STOCK_OUT_DOCS || [],
    transfers: INITIAL_TRANSFERS || [],
    purchaseRequests: INITIAL_PURCHASE_REQUESTS || [],
    productionLogs: INITIAL_PRODUCTION_LOGS || [],
    materialHandovers: INITIAL_MATERIAL_HANDOVERS || [],
    notifications: INITIAL_NOTIFICATIONS || [],
    messages: INITIAL_MESSAGES || [],
    channels: INITIAL_CHANNELS || [],
    traceabilityEvents: INITIAL_TRACEABILITY || [],
    auditLogs: INITIAL_AUDIT_LOGS || [],
  };
}

class ServerStoreManager {
  private dataDir: string;
  private backupsDir: string;
  private filePath: string;
  private state: ServerDatabaseState;
  private writeTimer: NodeJS.Timeout | null = null;
  private lastAutoBackupMs: number = 0;

  constructor() {
    this.dataDir = process.env.DATA_DIR 
      ? path.resolve(process.env.DATA_DIR) 
      : path.resolve(process.cwd(), 'data');
    this.backupsDir = path.join(this.dataDir, 'backups');
    this.filePath = path.join(this.dataDir, 'server_database.json');
    this.state = this.loadFromDisk();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (e) {
        console.error('[ServerStore] Failed to create data directory:', e);
      }
    }
    if (!fs.existsSync(this.backupsDir)) {
      try {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      } catch (e) {
        console.error('[ServerStore] Failed to create backups directory:', e);
      }
    }
  }

  /**
   * Create an automated timestamped snapshot backup on disk
   */
  public createSnapshotBackup(reason: string = 'auto', customState?: ServerDatabaseState): string | null {
    this.ensureDir();
    try {
      const stateToDump = customState || this.state;
      if (!stateToDump) return null;
      const now = new Date();
      const timeStr = now.toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${reason}_${timeStr}.json`;
      const targetPath = path.join(this.backupsDir, filename);
      fs.writeFileSync(targetPath, JSON.stringify(stateToDump, null, 2), 'utf-8');
      console.log(`[ServerStore] Saved local snapshot backup: ${filename} (Reason: ${reason})`);
      
      // Rotate backups to keep max 10 lightweight snapshots
      this.rotateBackups(10);
      return targetPath;
    } catch (err) {
      console.error('[ServerStore] Error creating snapshot backup:', err);
      return null;
    }
  }

  private rotateBackups(maxFiles: number = 30) {
    try {
      if (!fs.existsSync(this.backupsDir)) return;
      const files = fs.readdirSync(this.backupsDir).filter(f => f.endsWith('.json'));
      if (files.length > maxFiles) {
        files.sort((a, b) => {
          return fs.statSync(path.join(this.backupsDir, a)).mtimeMs - fs.statSync(path.join(this.backupsDir, b)).mtimeMs;
        });
        const toDelete = files.slice(0, files.length - maxFiles);
        toDelete.forEach(f => {
          try {
            fs.unlinkSync(path.join(this.backupsDir, f));
          } catch {}
        });
      }
    } catch (err) {
      // Ignore rotation errors
    }
  }

  private loadFromDisk(): ServerDatabaseState {
    this.ensureDir();
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const defaultState = getDefaultServerState();
          
          // Anti-Wipe Protection: Check if parsed data was completely empty (e.g. wiped to raw)
          const parsedHasItems = Array.isArray(parsed.items) && parsed.items.length > 0;
          const parsedHasWarehouses = Array.isArray(parsed.warehouses) && parsed.warehouses.length > 0;
          
          if (!parsedHasItems && !parsedHasWarehouses) {
            console.warn('[ServerStore] Detected empty or unseeded database on disk. Searching for latest non-empty backup...');
            const restoredFromBackup = this.tryRecoverFromBackups();
            if (restoredFromBackup) {
              console.log('[ServerStore] Successfully recovered full database from previous backup snapshot!');
              return restoredFromBackup;
            }
            console.log('[ServerStore] No previous backup found. Merging with full baseline dataset to prevent blank state.');
            const merged = {
              ...defaultState,
              ...parsed,
              isInstalled: true,
              companyName: parsed.companyName || defaultState.companyName,
              items: defaultState.items,
              itemGroups: defaultState.itemGroups,
              warehouses: defaultState.warehouses,
              contractors: defaultState.contractors,
              inventory: defaultState.inventory,
              boms: defaultState.boms,
              projects: defaultState.projects,
              version: Date.now(),
              lastUpdated: new Date().toISOString(),
            };
            this.saveToDiskSync(merged);
            return merged;
          }

          console.log(`[ServerStore] Successfully loaded central database from ${this.filePath} (Version: ${parsed.version || 'initial'}, Items: ${parsed.items?.length || 0})`);
          
          return {
            ...defaultState,
            ...parsed,
            isInstalled: true,
            version: parsed.version || Date.now(),
            lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error('[ServerStore] Error reading existing server database file, falling back to default seed:', err);
      }
    }

    // If file doesn't exist, also try recovering from backups first
    const recovered = this.tryRecoverFromBackups();
    if (recovered) {
      console.log('[ServerStore] Recovered database from backup archive on initial boot.');
      this.saveToDiskSync(recovered);
      return recovered;
    }

    const defaultState = getDefaultServerState();
    this.saveToDiskSync(defaultState);
    return defaultState;
  }

  private tryRecoverFromBackups(): ServerDatabaseState | null {
    try {
      if (!fs.existsSync(this.backupsDir)) return null;
      const files = fs.readdirSync(this.backupsDir).filter(f => f.endsWith('.json'));
      if (files.length === 0) return null;

      // Sort newest first
      files.sort((a, b) => {
        return fs.statSync(path.join(this.backupsDir, b)).mtimeMs - fs.statSync(path.join(this.backupsDir, a)).mtimeMs;
      });

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.backupsDir, file), 'utf-8');
          const json = JSON.parse(content);
          const stateData = json.data ? json.data : json;
          if (Array.isArray(stateData.items) && stateData.items.length > 0) {
            console.log(`[ServerStore] Found valid non-empty backup: ${file} with ${stateData.items.length} items`);
            return {
              ...getDefaultServerState(),
              ...stateData,
              version: Date.now(),
              lastUpdated: new Date().toISOString()
            };
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private saveToDiskSync(stateToSave: ServerDatabaseState, allowEmptyWipe = false) {
    this.ensureDir();

    // CRITICAL SHIELD: Prevent silent data wipes if stateToSave has 0 items while current state had items
    if (!allowEmptyWipe && this.state && (this.state.items?.length || 0) > 0) {
      if (!stateToSave.items || stateToSave.items.length === 0) {
        console.warn('[ServerStore - ANTI-WIPE SHIELD] Intercepted attempt to wipe items array! Preserving existing database records.');
        stateToSave.items = this.state.items;
        if ((!stateToSave.warehouses || stateToSave.warehouses.length === 0) && this.state.warehouses?.length) {
          stateToSave.warehouses = this.state.warehouses;
        }
        if ((!stateToSave.projects || stateToSave.projects.length === 0) && this.state.projects?.length) {
          stateToSave.projects = this.state.projects;
        }
        if ((!stateToSave.boms || stateToSave.boms.length === 0) && this.state.boms?.length) {
          stateToSave.boms = this.state.boms;
        }
        if ((!stateToSave.inventory || stateToSave.inventory.length === 0) && this.state.inventory?.length) {
          stateToSave.inventory = this.state.inventory;
        }
        if ((!stateToSave.contractors || stateToSave.contractors.length === 0) && this.state.contractors?.length) {
          stateToSave.contractors = this.state.contractors;
        }
      }
    }

    const tempPath = `${this.filePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
      console.log(`[ServerStore] Central database saved to disk. Version: ${stateToSave.version} (Items: ${stateToSave.items?.length || 0})`);

      // Automatically create a disk backup snapshot every 10 minutes or when items exist
      const now = Date.now();
      if (now - this.lastAutoBackupMs > 10 * 60 * 1000 && (stateToSave.items?.length || 0) > 0) {
        this.lastAutoBackupMs = now;
        this.createSnapshotBackup('auto_sync', stateToSave);
      }
    } catch (err) {
      console.error('[ServerStore] Error saving database to disk:', err);
    }
  }

  public getState(): ServerDatabaseState {
    return this.state;
  }

  public getVersion(): { version: number; lastUpdated: string; counts: Record<string, number> } {
    return {
      version: this.state.version,
      lastUpdated: this.state.lastUpdated,
      counts: {
        items: this.state.items?.length || 0,
        warehouses: this.state.warehouses?.length || 0,
        transfers: this.state.transfers?.length || 0,
        stockInDocs: this.state.stockInDocs?.length || 0,
        stockOutDocs: this.state.stockOutDocs?.length || 0,
        projects: this.state.projects?.length || 0,
        users: this.state.users?.length || 0,
      }
    };
  }

  public updateState(partial: Partial<ServerDatabaseState>): ServerDatabaseState {
    const newVersion = Date.now();
    this.state = {
      ...this.state,
      ...partial,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
    };

    // Debounced sync to disk
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      this.saveToDiskSync(this.state);
    }, 200);

    return this.state;
  }

  public replaceState(newState: Partial<ServerDatabaseState>): ServerDatabaseState {
    const newVersion = Date.now();
    this.state = {
      ...getDefaultServerState(),
      ...newState,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
    };
    this.saveToDiskSync(this.state);
    return this.state;
  }

  public resetToDefault(): ServerDatabaseState {
    // Before resetting, create an emergency safety backup snapshot!
    this.createSnapshotBackup('before_reset_to_default');

    const defaultState = getDefaultServerState();
    defaultState.version = Date.now();
    defaultState.lastUpdated = new Date().toISOString();
    // Preserve existing messenger configuration and backup history
    if (this.state.messengerConfig) {
      defaultState.messengerConfig = this.state.messengerConfig;
    }
    if (this.state.backupHistory) {
      defaultState.backupHistory = this.state.backupHistory;
    }

    this.state = defaultState;
    this.saveToDiskSync(this.state);
    return this.state;
  }

  public resetToEmpty(keepUsers = true, companyName?: string): ServerDatabaseState {
    // Before resetting, create an emergency safety backup snapshot!
    this.createSnapshotBackup('before_reset_to_empty');

    const adminUser = this.state.users?.find(u => u.role === 'SystemAdmin') || {
      id: 'usr-1',
      username: 'admin',
      fullName: 'مدیر ارشد سیستم',
      role: 'SystemAdmin',
      department: 'مدیریت',
      email: 'admin@local.host',
      allowedTabs: ['*'],
      isActive: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true
    };

    const emptyState: ServerDatabaseState = {
      version: Date.now(),
      lastUpdated: new Date().toISOString(),
      isInstalled: true,
      companyName: companyName || this.state.companyName || 'سامانه مدیریت انبار و تولید',
      autoBackupIntervalHours: 24,
      lastBackupTimestamp: new Date().toISOString(),
      backupHistory: this.state.backupHistory || [],
      messengerConfig: this.state.messengerConfig,
      users: keepUsers ? (this.state.users?.length ? this.state.users : [adminUser]) : [adminUser],
      items: [],
      itemGroups: [],
      warehouses: [],
      contractors: [],
      inventory: [],
      boms: [],
      projects: [],
      operators: [],
      stockCountings: [],
      stockInDocs: [],
      stockOutDocs: [],
      transfers: [],
      purchaseRequests: [],
      productionLogs: [],
      materialHandovers: [],
      notifications: [],
      messages: [],
      channels: INITIAL_CHANNELS,
      traceabilityEvents: [],
      auditLogs: [{
        id: `log-${Date.now()}-wipe`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: adminUser.id,
        userName: adminUser.fullName,
        role: adminUser.role,
        action: 'تخلیه و خام‌سازی دیتابیس',
        targetEntity: 'System',
        targetId: 'DATABASE_WIPED',
        details: 'کلیه داده‌های موقت و تستی حذف شدند و پایگاه داده در وضعیت خام قرار گرفت.'
      }],
    };

    this.state = emptyState;
    this.saveToDiskSync(this.state, true);
    return this.state;
  }

  public getStorageInfo() {
    let sizeBytes = 0;
    let exists = false;
    try {
      if (fs.existsSync(this.filePath)) {
        const stat = fs.statSync(this.filePath);
        sizeBytes = stat.size;
        exists = true;
      }
    } catch {
      // ignore
    }

    return {
      filePath: this.filePath,
      dataDir: this.dataDir,
      backupsDir: this.backupsDir,
      exists,
      sizeBytes,
      sizeKb: Math.round(sizeBytes / 1024),
      version: this.state.version,
      lastUpdated: this.state.lastUpdated,
    };
  }
}

export const serverStore = new ServerStoreManager();
