import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { 
  INITIAL_ITEMS, INITIAL_ITEM_GROUPS, INITIAL_WAREHOUSES, INITIAL_CONTRACTORS, 
  INITIAL_INVENTORY, INITIAL_BOMS, INITIAL_PROJECTS, INITIAL_OPERATORS, 
  INITIAL_USERS, INITIAL_STOCK_COUNTINGS, INITIAL_STOCK_IN_DOCS, 
  INITIAL_STOCK_OUT_DOCS, INITIAL_TRANSFERS, INITIAL_PURCHASE_REQUESTS, 
  INITIAL_PRODUCTION_LOGS, INITIAL_MATERIAL_HANDOVERS, INITIAL_NOTIFICATIONS, 
  INITIAL_TRACEABILITY, INITIAL_AUDIT_LOGS, INITIAL_CHANNELS, INITIAL_MESSAGES,
  INITIAL_FISCAL_YEARS
} from '../data/mockData';
import {
  Item, ItemGroup, Warehouse, InventoryBalance, BOM, Project, Operator, User,
  StockInDoc, StockOutDoc, WarehouseTransfer, PurchaseRequest, ProductionLog,
  MaterialHandover, TraceabilityEvent, SystemNotification, AuditLog, Contractor,
  StockCountingSession, ChatMessage, ChatChannel, MessengerBackupConfig, FiscalYear
} from '../types';
import { resolveCentralDataDir } from './dataDirResolver.ts';
import { sqliteEngine } from './sqliteEngine.ts';

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
  contractorContracts?: any[];
  contractorTransactions?: any[];
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
  fiscalYears?: FiscalYear[];
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
    contractorContracts: [],
    contractorTransactions: [],
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
    fiscalYears: INITIAL_FISCAL_YEARS || [],
  };
}

class ServerStoreManager {
  private dataDir: string;
  private backupsDir: string;
  private filePath: string;
  private state: ServerDatabaseState;
  private writeTimer: NodeJS.Timeout | null = null;
  private lastAutoBackupMs: number = 0;
  private emitter = new EventEmitter();

  constructor() {
    this.dataDir = resolveCentralDataDir();
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
    const sqliteState = sqliteEngine.loadStateFromSqlite();

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const defaultState = getDefaultServerState();
          // If SQLite has a strictly newer state snapshot, prefer SQLite
          const activeSource =
            sqliteState && (sqliteState.version || 0) > (parsed.version || 0)
              ? sqliteState
              : parsed;

          console.log(`[ServerStore] Successfully loaded central database from ${this.filePath} (Version: ${activeSource.version || 'initial'}, Items: ${activeSource.items?.length ?? 0}, Warehouses: ${activeSource.warehouses?.length ?? 0})`);
          
          const loadedState: ServerDatabaseState = {
            ...defaultState,
            ...activeSource,
            items: activeSource.items !== undefined ? activeSource.items : defaultState.items,
            itemGroups: activeSource.itemGroups !== undefined ? activeSource.itemGroups : defaultState.itemGroups,
            warehouses: activeSource.warehouses !== undefined ? activeSource.warehouses : defaultState.warehouses,
            contractors: activeSource.contractors !== undefined ? activeSource.contractors : defaultState.contractors,
            contractorContracts: activeSource.contractorContracts !== undefined ? activeSource.contractorContracts : (defaultState.contractorContracts || []),
            contractorTransactions: activeSource.contractorTransactions !== undefined ? activeSource.contractorTransactions : (defaultState.contractorTransactions || []),
            inventory: activeSource.inventory !== undefined ? activeSource.inventory : defaultState.inventory,
            boms: activeSource.boms !== undefined ? activeSource.boms : defaultState.boms,
            projects: activeSource.projects !== undefined ? activeSource.projects : defaultState.projects,
            operators: activeSource.operators !== undefined ? activeSource.operators : defaultState.operators,
            stockCountings: activeSource.stockCountings !== undefined ? activeSource.stockCountings : defaultState.stockCountings,
            stockInDocs: activeSource.stockInDocs !== undefined ? activeSource.stockInDocs : defaultState.stockInDocs,
            stockOutDocs: activeSource.stockOutDocs !== undefined ? activeSource.stockOutDocs : defaultState.stockOutDocs,
            transfers: activeSource.transfers !== undefined ? activeSource.transfers : defaultState.transfers,
            purchaseRequests: activeSource.purchaseRequests !== undefined ? activeSource.purchaseRequests : defaultState.purchaseRequests,
            productionLogs: activeSource.productionLogs !== undefined ? activeSource.productionLogs : defaultState.productionLogs,
            materialHandovers: activeSource.materialHandovers !== undefined ? activeSource.materialHandovers : defaultState.materialHandovers,
            notifications: activeSource.notifications !== undefined ? activeSource.notifications : defaultState.notifications,
            messages: activeSource.messages !== undefined ? activeSource.messages : defaultState.messages,
            channels: activeSource.channels !== undefined ? activeSource.channels : defaultState.channels,
            traceabilityEvents: activeSource.traceabilityEvents !== undefined ? activeSource.traceabilityEvents : defaultState.traceabilityEvents,
            auditLogs: activeSource.auditLogs !== undefined ? activeSource.auditLogs : defaultState.auditLogs,
            fiscalYears: activeSource.fiscalYears !== undefined ? activeSource.fiscalYears : (defaultState.fiscalYears || []),
            isInstalled: true,
            version: activeSource.version || Date.now(),
            lastUpdated: activeSource.lastUpdated || new Date().toISOString(),
          };
          sqliteEngine.syncStateToSqlite(loadedState);
          return loadedState;
        }
      } catch (err) {
        console.error('[ServerStore] Error reading existing server database file, falling back to SQLite/default seed:', err);
      }
    }

    if (sqliteState && typeof sqliteState === 'object') {
      const defaultState = getDefaultServerState();
      const mergedSqlite: ServerDatabaseState = {
        ...defaultState,
        ...sqliteState,
        isInstalled: true,
        version: sqliteState.version || Date.now(),
        lastUpdated: sqliteState.lastUpdated || new Date().toISOString(),
      };
      this.saveToDiskSync(mergedSqlite, true);
      return mergedSqlite;
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

  private saveToDiskSync(stateToSave: ServerDatabaseState, _allowEmptyWipe = false) {
    this.ensureDir();

    if (!Array.isArray(stateToSave.items)) {
      stateToSave.items = this.state?.items || [];
    }

    const tempPath = `${this.filePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
      sqliteEngine.syncStateToSqlite(stateToSave);
      console.log(`[ServerStore] Central database saved to disk & SQLite. Version: ${stateToSave.version} (Items: ${stateToSave.items?.length || 0})`);

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

  public onStateChange(listener: (state: ServerDatabaseState, partialUpdates?: Partial<ServerDatabaseState>, sourceClientId?: string) => void) {
    this.emitter.on('state_change', listener);
    return () => {
      this.emitter.off('state_change', listener);
    };
  }

  public updateState(partial: Partial<ServerDatabaseState>, sourceClientId?: string): ServerDatabaseState {
    const newVersion = Date.now();
    this.state = {
      ...this.state,
      ...partial,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
    };

    // Broadcast instant state change to all SSE subscribers with delta & sourceClientId
    this.emitter.emit('state_change', this.state, partial, sourceClientId);

    // Debounced sync to disk
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      this.saveToDiskSync(this.state);
    }, 250);

    return this.state;
  }

  public replaceState(newState: Partial<ServerDatabaseState>): ServerDatabaseState {
    const newVersion = Date.now();
    const defaultState = getDefaultServerState();
    this.state = {
      ...defaultState,
      ...newState,
      companyName: newState.companyName || this.state.companyName || defaultState.companyName,
      messengerConfig: newState.messengerConfig !== undefined ? newState.messengerConfig : (this.state.messengerConfig || defaultState.messengerConfig),
      users: (newState.users !== undefined && Array.isArray(newState.users) && newState.users.length > 0) ? newState.users : (this.state.users?.length ? this.state.users : defaultState.users),
      items: newState.items !== undefined ? newState.items : (this.state.items || defaultState.items),
      itemGroups: newState.itemGroups !== undefined ? newState.itemGroups : (this.state.itemGroups || defaultState.itemGroups),
      warehouses: newState.warehouses !== undefined ? newState.warehouses : (this.state.warehouses || defaultState.warehouses),
      contractors: newState.contractors !== undefined ? newState.contractors : (this.state.contractors || defaultState.contractors),
      contractorContracts: newState.contractorContracts !== undefined ? newState.contractorContracts : (this.state.contractorContracts || []),
      contractorTransactions: newState.contractorTransactions !== undefined ? newState.contractorTransactions : (this.state.contractorTransactions || []),
      inventory: newState.inventory !== undefined ? newState.inventory : (this.state.inventory || defaultState.inventory),
      boms: newState.boms !== undefined ? newState.boms : (this.state.boms || defaultState.boms),
      projects: newState.projects !== undefined ? newState.projects : (this.state.projects || defaultState.projects),
      operators: newState.operators !== undefined ? newState.operators : defaultState.operators,
      stockCountings: newState.stockCountings !== undefined ? newState.stockCountings : defaultState.stockCountings,
      stockInDocs: newState.stockInDocs !== undefined ? newState.stockInDocs : defaultState.stockInDocs,
      stockOutDocs: newState.stockOutDocs !== undefined ? newState.stockOutDocs : defaultState.stockOutDocs,
      transfers: newState.transfers !== undefined ? newState.transfers : defaultState.transfers,
      purchaseRequests: newState.purchaseRequests !== undefined ? newState.purchaseRequests : defaultState.purchaseRequests,
      productionLogs: newState.productionLogs !== undefined ? newState.productionLogs : defaultState.productionLogs,
      materialHandovers: newState.materialHandovers !== undefined ? newState.materialHandovers : defaultState.materialHandovers,
      notifications: newState.notifications !== undefined ? newState.notifications : defaultState.notifications,
      messages: newState.messages !== undefined ? newState.messages : defaultState.messages,
      channels: newState.channels !== undefined ? newState.channels : defaultState.channels,
      traceabilityEvents: newState.traceabilityEvents !== undefined ? newState.traceabilityEvents : defaultState.traceabilityEvents,
      auditLogs: newState.auditLogs !== undefined ? newState.auditLogs : defaultState.auditLogs,
      fiscalYears: newState.fiscalYears !== undefined ? newState.fiscalYears : (this.state.fiscalYears || defaultState.fiscalYears || []),
      version: newVersion,
      lastUpdated: new Date().toISOString(),
    };
    this.saveToDiskSync(this.state);
    this.emitter.emit('state_change', this.state);
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
    this.emitter.emit('state_change', this.state);
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
      contractorContracts: [],
      contractorTransactions: [],
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
      fiscalYears: INITIAL_FISCAL_YEARS || [],
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
    this.emitter.emit('state_change', this.state);
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

  public getBackupsDir(): string {
    this.ensureDir();
    return this.backupsDir;
  }

  public createOfficialBackupFile(
    type: 'Manual' | 'Auto' = 'Manual',
    customPayload?: any
  ): {
    record: { id: string; timestamp: string; fileName: string; sizeKb: number; type: 'Manual' | 'Auto' };
    filePath: string;
    jsonContent: string;
  } {
    this.ensureDir();
    const now = new Date();
    const isoStamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `AnbarMeh_Backup_${type}_${isoStamp}.json`;
    const filePath = path.join(this.backupsDir, fileName);

    const payloadToSave = customPayload || {
      ...this.state,
      exportedAt: now.toISOString(),
    };

    const jsonContent = JSON.stringify(payloadToSave, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf-8');
    this.rotateBackups(30);

    const sizeKb = Math.max(1, Math.round(Buffer.byteLength(jsonContent, 'utf-8') / 1024));
    const faTimestamp =
      now.toLocaleDateString('fa-IR') +
      ' ' +
      now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const record = {
      id: `bk-${Date.now()}`,
      timestamp: faTimestamp,
      fileName,
      sizeKb,
      type,
    };

    const existingHistory = (this.state.backupHistory || []).filter((h) => h.fileName !== fileName);
    const updatedHistory = [record, ...existingHistory].slice(0, 50);

    this.updateState({
      lastBackupTimestamp: faTimestamp,
      backupHistory: updatedHistory,
    });

    return { record, filePath, jsonContent };
  }

  public listDiskBackups(): Array<{
    fileName: string;
    filePath: string;
    sizeKb: number;
    mtimeMs: number;
    timestamp: string;
    type: 'Manual' | 'Auto';
  }> {
    this.ensureDir();
    try {
      const files = fs.readdirSync(this.backupsDir).filter((f) => f.endsWith('.json'));
      const items = files.map((fileName) => {
        const fullPath = path.join(this.backupsDir, fileName);
        const stat = fs.statSync(fullPath);
        const d = new Date(stat.mtimeMs);
        const isManual = fileName.toLowerCase().includes('manual');
        return {
          fileName,
          filePath: fullPath,
          sizeKb: Math.max(1, Math.round(stat.size / 1024)),
          mtimeMs: stat.mtimeMs,
          timestamp:
            d.toLocaleDateString('fa-IR') +
            ' ' +
            d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          type: (isManual ? 'Manual' : 'Auto') as 'Manual' | 'Auto',
        };
      });
      items.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return items;
    } catch {
      return [];
    }
  }

  public restoreFromDiskBackup(fileName: string): ServerDatabaseState | null {
    this.ensureDir();
    const safeName = path.basename(fileName);
    const targetPath = path.join(this.backupsDir, safeName);
    if (!fs.existsSync(targetPath)) return null;
    try {
      this.createSnapshotBackup('before_disk_restore');
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const actualState = parsed.data || parsed;
      if (!actualState || typeof actualState !== 'object') return null;
      return this.replaceState(actualState);
    } catch (e) {
      console.error('[ServerStore] Failed to restore from disk backup:', e);
      return null;
    }
  }
}

export const serverStore = new ServerStoreManager();
