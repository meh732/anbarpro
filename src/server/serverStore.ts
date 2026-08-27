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

  return {
    version: Date.now(),
    lastUpdated: new Date().toISOString(),
    isInstalled: false,
    companyName: '',
    autoBackupIntervalHours: 24,
    lastBackupTimestamp: new Date().toISOString(),
    backupHistory: [],
    messengerConfig: {
      telegram: {
        enabled: false,
        botToken: '',
        adminChatId: '',
        sendAutoBackups: true,
        sendAlerts: true
      },
      bale: {
        enabled: false,
        botToken: '',
        adminChatId: '',
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
    users: [adminUser],
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
    channels: [],
    traceabilityEvents: [],
    auditLogs: [],
  };
}

class ServerStoreManager {
  private dataDir: string;
  private filePath: string;
  private state: ServerDatabaseState;
  private writeTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = process.env.DATA_DIR 
      ? path.resolve(process.env.DATA_DIR) 
      : path.resolve(process.cwd(), 'data');
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
  }

  private loadFromDisk(): ServerDatabaseState {
    this.ensureDir();
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          console.log(`[ServerStore] Successfully loaded central database from ${this.filePath} (Version: ${parsed.version || 'initial'})`);
          return {
            ...getDefaultServerState(),
            ...parsed,
            version: parsed.version || Date.now(),
            lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error('[ServerStore] Error reading existing server database file, falling back to default seed:', err);
      }
    }

    const defaultState = getDefaultServerState();
    this.saveToDiskSync(defaultState);
    return defaultState;
  }

  private saveToDiskSync(stateToSave: ServerDatabaseState) {
    this.ensureDir();
    const tempPath = `${this.filePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
      console.log(`[ServerStore] Central database saved to disk. Version: ${stateToSave.version}`);
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

    // Debounced or immediate sync to disk
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
    const defaultState = getDefaultServerState();
    defaultState.version = Date.now();
    defaultState.lastUpdated = new Date().toISOString();
    this.state = defaultState;
    this.saveToDiskSync(this.state);
    return this.state;
  }

  public resetToEmpty(keepUsers = true, companyName?: string): ServerDatabaseState {
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
    this.saveToDiskSync(this.state);
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
      exists,
      sizeBytes,
      sizeKb: Math.round(sizeBytes / 1024),
      version: this.state.version,
      lastUpdated: this.state.lastUpdated,
    };
  }
}

export const serverStore = new ServerStoreManager();
