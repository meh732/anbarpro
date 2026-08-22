import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { translations, Language } from '../utils/translations';
import { 
  Item, ItemGroup, Warehouse, InventoryBalance, BOM, Project, ProjectStep, Operator, User, UserRole,
  StockInDoc, StockOutDoc, WarehouseTransfer, PurchaseRequest, ProductionLog, MaterialHandover,
  TraceabilityEvent, SystemNotification, AuditLog, Contractor, StockCountingSession, StockCountingItem 
} from '../types';
import { InitialStockParsedRow } from '../utils/excelUtils';
import { calculateAllProjectStageTargets, applySmartTargetsToProjectSteps } from '../utils/smartBOMCalculator';
import { 
  INITIAL_ITEMS, INITIAL_ITEM_GROUPS, INITIAL_WAREHOUSES, INITIAL_CONTRACTORS, INITIAL_INVENTORY, INITIAL_BOMS, 
  INITIAL_PROJECTS, INITIAL_OPERATORS, INITIAL_USERS, INITIAL_STOCK_COUNTINGS, INITIAL_STOCK_IN_DOCS, 
  INITIAL_STOCK_OUT_DOCS, INITIAL_TRANSFERS, INITIAL_PURCHASE_REQUESTS, 
  INITIAL_PRODUCTION_LOGS, INITIAL_MATERIAL_HANDOVERS, INITIAL_NOTIFICATIONS, INITIAL_TRACEABILITY, INITIAL_AUDIT_LOGS 
} from '../data/mockData';

interface AppContextType {
  // Active User & Permissions
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  isAuthenticated: boolean;
  login: (username: string, pass: string) => { success: boolean; message: string };
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updated: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasTabPermission: (tabId: string) => boolean;
  hasActionPermission: (action: 'add' | 'edit' | 'delete' | 'export') => boolean;
  
  // Tab Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Data Collections
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
  traceabilityEvents: TraceabilityEvent[];
  auditLogs: AuditLog[];
  
  // Actions
  addMaterialHandover: (handover: Omit<MaterialHandover, 'id' | 'createdAt'>) => void;
  addItem: (item: Omit<Item, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updated: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  
  addItemGroup: (group: Omit<ItemGroup, 'id'>) => void;
  updateItemGroup: (id: string, updated: Partial<ItemGroup>) => void;
  deleteItemGroup: (id: string) => void;
  
  addWarehouse: (wh: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, updated: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  addContractor: (cont: Omit<Contractor, 'id'>) => void;
  updateContractor: (id: string, updated: Partial<Contractor>) => void;
  deleteContractor: (id: string) => void;
  
  addBOM: (bom: Omit<BOM, 'id' | 'createdAt'>) => void;
  updateBOM: (id: string, updated: Partial<BOM>) => void;
  deleteBOM: (id: string) => void;
  
  // Excel Batch Import Actions
  importItemsBatch: (newItems: Omit<Item, 'id' | 'createdAt'>[], groupsToCreate?: { name: string; subGroup: string }[]) => { count: number; updatedCount: number };
  importInitialStockBatch: (rows: InitialStockParsedRow[]) => { count: number; docNumber: string };
  importBOMsBatch: (newBoms: Omit<BOM, 'id' | 'createdAt'>[]) => { count: number };
  
  // Multi-Level Project Stage Auto-Calculation & Automated Progress Engine
  applySmartStageTargetsToProject: (projectId: string, customOverrides?: { projectScrap?: number; stepScraps?: Record<string, number> }) => { success: boolean; message: string; count: number };
  handoverStepMaterials: (data: {
    projectId: string;
    stepId: string;
    operatorId: string;
    operatorName: string;
    supervisorName?: string;
    sourceWarehouseId: string;
    items: { itemId: string; quantity: number; notes?: string }[];
    salonName?: string;
    machineCode?: string;
    notes?: string;
  }) => { success: boolean; message: string; docNumber: string };
  recordStepOutputReceipt: (data: {
    projectId: string;
    stepId: string;
    quantityProduced: number;
    quantityScrapped?: number;
    operatorId: string;
    operatorName: string;
    shift?: 'Morning' | 'Evening' | 'Night';
    targetWarehouseId: string;
    sourceWarehouseId?: string;
    machineCode?: string;
    notes?: string;
  }) => { success: boolean; message: string; newStepProgress: number; newProjectProgress: number; isCompleted: boolean };
  calculateProjectProgressSummary: (project: Project) => {
    totalSteps: number;
    completedSteps: number;
    inProgressSteps: number;
    pendingSteps: number;
    averageProgressPercent: number;
    stepsSummary: {
      stepId: string;
      stepName: string;
      targetQuantity: number;
      completedQuantity: number;
      scrapQuantity: number;
      progressPercent: number;
      status: 'Pending' | 'InProgress' | 'Completed';
    }[];
  };
  
  addProject: (proj: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updated: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateProjectStep: (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => void;
  updateProjectStepDetails: (projectId: string, stepId: string, updated: Partial<ProjectStep>) => void;
  addProjectSubStep: (projectId: string, parentStepId: string, step: Omit<ProjectStep, 'id'>) => void;
  deleteProjectStep: (projectId: string, stepId: string) => void;

  // Stock Counting / Inventory Audit
  createStockCountingSession: (session: Omit<StockCountingSession, 'id' | 'createdAt'>) => void;
  updateStockCountItem: (sessionId: string, itemId: string, physicalQty: number, notes?: string, firstCount?: number, secondCount?: number, finalCount?: number) => void;
  updateStockCountingSession: (sessionId: string, updated: Partial<StockCountingSession>) => void;
  deleteStockCountingSession: (sessionId: string) => void;
  applyStockCountingAdjustments: (sessionId: string) => void;
  
  // Core Inventory & Production Operations
  createStockInDoc: (doc: Omit<StockInDoc, 'id' | 'createdAt'>) => void;
  updateStockInDoc: (id: string, updated: Partial<StockInDoc>) => void;
  deleteStockInDoc: (id: string) => void;

  createStockOutDoc: (doc: Omit<StockOutDoc, 'id' | 'createdAt'>) => void;
  updateStockOutDoc: (id: string, updated: Partial<StockOutDoc>) => void;
  deleteStockOutDoc: (id: string) => void;

  createTransfer: (transfer: Omit<WarehouseTransfer, 'id' | 'createdAt'>) => void;
  updateTransfer: (id: string, updated: Partial<WarehouseTransfer>) => void;
  updateTransferStatus: (id: string, status: 'Pending' | 'InTransit' | 'Completed' | 'Rejected') => void;
  dispatchTransfer: (id: string, details: { dispatchedBy: string; handlerName: string; driverPhone?: string; vehicleNumber?: string; notes?: string }) => void;
  receiveTransfer: (id: string, details: { receivedBy: string; notes?: string }) => void;
  rejectTransfer: (id: string, reason: string) => void;
  deleteTransfer: (id: string) => void;

  createPurchaseRequest: (req: Omit<PurchaseRequest, 'id' | 'createdAt'>) => void;
  updatePurchaseRequest: (id: string, updated: Partial<PurchaseRequest>) => void;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequest['status']) => void;
  deletePurchaseRequest: (id: string) => void;

  // Production Logs & Operators
  updateProductionLog: (id: string, updated: Partial<ProductionLog>) => void;
  deleteProductionLog: (id: string) => void;
  addOperator: (op: Omit<Operator, 'id'>) => void;
  updateOperator: (id: string, updated: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  
  // Core Auto-BOM Production Engine
  registerProduction: (data: {
    operatorId: string;
    operatorName: string;
    shift: 'Morning' | 'Evening' | 'Night';
    projectId: string;
    stepId: string;
    finishedItemId: string;
    quantityProduced: number;
    quantityScrapped: number;
    date: string;
    time: string;
    machineCode: string;
    sourceWarehouseId: string;
    targetWarehouseId: string;
    notes?: string;
  }) => { success: boolean; message: string; shortages?: { itemName: string; required: number; available: number }[] };

  // Utilities
  getItemQuantityInWarehouse: (itemId: string, warehouseId: string) => number;
  getTotalItemQuantity: (itemId: string) => number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  resetToInitialData: () => void;
  exportDatabaseJSON: (type?: 'Manual' | 'Auto') => void;
  importDatabaseJSON: (jsonStr: string) => boolean;
  
  // Language & i18n
  language: 'fa' | 'en';
  setLanguage: (lang: 'fa' | 'en') => void;
  t: (key: string, fallback?: string) => string;

  // Backup Schedule Settings
  autoBackupIntervalHours: number;
  setAutoBackupIntervalHours: (hours: number) => void;
  lastBackupTimestamp: string;
  backupHistory: Array<{ id: string; timestamp: string; fileName: string; sizeKb: number; type: 'Manual' | 'Auto' }>;

  // QR & Search Modal triggers
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Installation Setup Wizard state
  isInstalled: boolean;
  setIsInstalled: (installed: boolean) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  completeInstallation: (companyName: string, adminUser: string, adminPass: string) => void;

  // Centralized Linux Server Real-Time Sync & Status
  serverSyncStatus: 'connected' | 'syncing' | 'offline' | 'error';
  lastSyncTime: string | null;
  serverVersion: number;
  serverInfo: any;
  forceSyncWithServer: () => Promise<boolean>;
  resetServerDatabase: () => Promise<boolean>;
  resetToEmptyDatabase: () => Promise<boolean>;
  loadDemoData: () => Promise<boolean>;
  resetToSetupWizard: () => Promise<boolean>;

  // Lite Mode / Performance Toggle for Low-End Devices
  liteMode: boolean;
  setLiteMode: (lite: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'electro_stock_db_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_is_installed`) === 'true';
    } catch {
      return false;
    }
  });

  const [companyName, setCompanyNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_company_name`) || '';
    } catch {
      return '';
    }
  });

  const setCompanyName = (name: string) => {
    setCompanyNameState(name);
    localStorage.setItem(`${STORAGE_KEY}_company_name`, name);
  };

  const [users, setUsers] = useState<User[]>(() => loadStorage('users', INITIAL_USERS));
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const isInst = localStorage.getItem(`${STORAGE_KEY}_is_installed`) === 'true';
    if (!isInst) return false;
    try {
      const logged = localStorage.getItem(`${STORAGE_KEY}_auth_logged_in`);
      return logged ? JSON.parse(logged) : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const isInst = localStorage.getItem(`${STORAGE_KEY}_is_installed`) === 'true';
    if (!isInst) {
      return {
        id: 'usr-guest',
        username: 'guest',
        fullName: 'کاربر مهمان',
        role: 'Operator',
        department: 'تولید',
        email: '',
        allowedTabs: []
      };
    }
    try {
      const curr = localStorage.getItem(`${STORAGE_KEY}_current_user`);
      return curr ? JSON.parse(curr) : {
        id: 'usr-guest',
        username: 'guest',
        fullName: 'کاربر مهمان',
        role: 'Operator',
        department: 'تولید',
        email: '',
        allowedTabs: []
      };
    } catch {
      return {
        id: 'usr-guest',
        username: 'guest',
        fullName: 'کاربر مهمان',
        role: 'Operator',
        department: 'تولید',
        email: '',
        allowedTabs: []
      };
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const [items, setItems] = useState<Item[]>(() => loadStorage('items', INITIAL_ITEMS));
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>(() => loadStorage('itemGroups', INITIAL_ITEM_GROUPS));
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => loadStorage('warehouses', INITIAL_WAREHOUSES));
  const [contractors, setContractors] = useState<Contractor[]>(() => loadStorage('contractors', INITIAL_CONTRACTORS));
  const [inventory, setInventory] = useState<InventoryBalance[]>(() => loadStorage('inventory', INITIAL_INVENTORY));
  const [boms, setBoms] = useState<BOM[]>(() => loadStorage('boms', INITIAL_BOMS));
  const [projects, setProjects] = useState<Project[]>(() => loadStorage('projects', INITIAL_PROJECTS));
  const [operators, setOperators] = useState<Operator[]>(() => loadStorage('operators', INITIAL_OPERATORS));
  const [stockCountings, setStockCountings] = useState<StockCountingSession[]>(() => loadStorage('stockCountings', INITIAL_STOCK_COUNTINGS));
  const [stockInDocs, setStockInDocs] = useState<StockInDoc[]>(() => loadStorage('stockInDocs', INITIAL_STOCK_IN_DOCS));
  const [stockOutDocs, setStockOutDocs] = useState<StockOutDoc[]>(() => loadStorage('stockOutDocs', INITIAL_STOCK_OUT_DOCS));
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>(() => loadStorage('transfers', INITIAL_TRANSFERS));
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(() => loadStorage('purchaseRequests', INITIAL_PURCHASE_REQUESTS));
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(() => loadStorage('productionLogs', INITIAL_PRODUCTION_LOGS));
  const [materialHandovers, setMaterialHandovers] = useState<MaterialHandover[]>(() => loadStorage('materialHandovers', INITIAL_MATERIAL_HANDOVERS));
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => loadStorage('notifications', INITIAL_NOTIFICATIONS));
  const [traceabilityEvents, setTraceabilityEvents] = useState<TraceabilityEvent[]>(() => loadStorage('traceabilityEvents', INITIAL_TRACEABILITY));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStorage('auditLogs', INITIAL_AUDIT_LOGS));

  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lite Mode State for Low-Performance Devices
  const [liteMode, setLiteModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_lite_mode`) === 'true';
    } catch {
      return false;
    }
  });

  const setLiteMode = (lite: boolean) => {
    setLiteModeState(lite);
    try {
      localStorage.setItem(`${STORAGE_KEY}_lite_mode`, String(lite));
    } catch {}
  };

  // Language State
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_language`);
      return (stored === 'en' || stored === 'fa') ? stored : 'fa';
    } catch {
      return 'fa';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(`${STORAGE_KEY}_language`, lang);
  };

  // Sync document direction when language changes
  useEffect(() => {
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Sync Admin credentials from installation environment variables (/api/config)
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data?.adminUser && data?.adminPass) {
          setUsers(prevUsers => {
            const adminExists = prevUsers.some(u => u.id === 'usr-1');
            if (adminExists) {
              return prevUsers.map(u => 
                u.id === 'usr-1' 
                  ? { ...u, username: data.adminUser, password: data.adminPass }
                  : u
              );
            } else {
              const newAdmin: User = {
                id: 'usr-1',
                username: data.adminUser,
                password: data.adminPass,
                fullName: 'مدیر سیستم',
                role: 'SystemAdmin',
                department: 'مدیریت',
                email: 'admin@local.host',
                allowedTabs: ['*'],
                isActive: true
              };
              return [newAdmin, ...prevUsers];
            }
          });

          setCurrentUser(prevUser => {
            if (prevUser && (prevUser.id === 'usr-1' || prevUser.role === 'SystemAdmin')) {
              return { ...prevUser, username: data.adminUser, password: data.adminPass };
            }
            return prevUser;
          });
        }
      })
      .catch(() => {
        // Dev environment fallback
      });
  }, []);

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language] || translations.fa;
    return (dict as Record<string, string>)[key] || fallback || key;
  };

  // Auto Backup Settings & History State
  const [autoBackupIntervalHours, setAutoBackupIntervalHoursState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_autoBackupHours`);
      return stored ? parseInt(stored, 10) : 0; // 0 = disabled by default
    } catch {
      return 0;
    }
  });

  const setAutoBackupIntervalHours = (hours: number) => {
    setAutoBackupIntervalHoursState(hours);
    localStorage.setItem(`${STORAGE_KEY}_autoBackupHours`, hours.toString());
  };

  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_lastBackupTime`) || '';
    } catch {
      return '';
    }
  });

  const [backupHistory, setBackupHistory] = useState<Array<{ id: string; timestamp: string; fileName: string; sizeKb: number; type: 'Manual' | 'Auto' }>>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_backupHistory`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Centralized Linux Server Real-Time Sync State & Diagnostics
  const [serverSyncStatus, setServerSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<number>(0);
  const [serverInfo, setServerInfo] = useState<any>(null);

  const serverVersionRef = useRef<number>(0);
  const isRemoteUpdatingRef = useRef<boolean>(false);
  const isInitialServerSyncDoneRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function loadStorage<T>(key: string, fallback: T): T {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      if (stored) {
        return JSON.parse(stored);
      }
      const isInstalledCheck = localStorage.getItem(`${STORAGE_KEY}_is_installed`) === 'true';
      if (!isInstalledCheck) {
        const businessTables = [
          'users', 'items', 'itemGroups', 'warehouses', 'contractors', 'inventory', 
          'boms', 'projects', 'operators', 'stockCountings', 'stockInDocs', 'stockOutDocs', 
          'transfers', 'purchaseRequests', 'productionLogs', 'materialHandovers', 
          'notifications', 'traceabilityEvents', 'auditLogs'
        ];
        if (businessTables.includes(key)) {
          return [] as unknown as T;
        }
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  // Save changes to localStorage (for instant offline cache)
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_auth_logged_in`, JSON.stringify(isAuthenticated));
    localStorage.setItem(`${STORAGE_KEY}_current_user`, JSON.stringify(currentUser));
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_items`, JSON.stringify(items));
    localStorage.setItem(`${STORAGE_KEY}_itemGroups`, JSON.stringify(itemGroups));
    localStorage.setItem(`${STORAGE_KEY}_warehouses`, JSON.stringify(warehouses));
    localStorage.setItem(`${STORAGE_KEY}_contractors`, JSON.stringify(contractors));
    localStorage.setItem(`${STORAGE_KEY}_inventory`, JSON.stringify(inventory));
    localStorage.setItem(`${STORAGE_KEY}_boms`, JSON.stringify(boms));
    localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
    localStorage.setItem(`${STORAGE_KEY}_operators`, JSON.stringify(operators));
    localStorage.setItem(`${STORAGE_KEY}_stockCountings`, JSON.stringify(stockCountings));
    localStorage.setItem(`${STORAGE_KEY}_stockInDocs`, JSON.stringify(stockInDocs));
    localStorage.setItem(`${STORAGE_KEY}_stockOutDocs`, JSON.stringify(stockOutDocs));
    localStorage.setItem(`${STORAGE_KEY}_transfers`, JSON.stringify(transfers));
    localStorage.setItem(`${STORAGE_KEY}_purchaseRequests`, JSON.stringify(purchaseRequests));
    localStorage.setItem(`${STORAGE_KEY}_productionLogs`, JSON.stringify(productionLogs));
    localStorage.setItem(`${STORAGE_KEY}_materialHandovers`, JSON.stringify(materialHandovers));
    localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
    localStorage.setItem(`${STORAGE_KEY}_traceabilityEvents`, JSON.stringify(traceabilityEvents));
    localStorage.setItem(`${STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
  }, [
    items, itemGroups, warehouses, contractors, inventory, boms, projects, operators, 
    stockCountings, stockInDocs, stockOutDocs, transfers, purchaseRequests, 
    productionLogs, materialHandovers, notifications, traceabilityEvents, auditLogs
  ]);

  // =========================================================================
  //  CENTRALIZED SERVER SYNCHRONIZATION ENGINE
  // =========================================================================

  const applyServerState = useCallback((data: any, version: number) => {
    if (!data) return;
    isRemoteUpdatingRef.current = true;
    if (data.items) setItems(data.items);
    if (data.itemGroups) setItemGroups(data.itemGroups);
    if (data.warehouses) setWarehouses(data.warehouses);
    if (data.contractors) setContractors(data.contractors);
    if (data.inventory) setInventory(data.inventory);
    if (data.boms) setBoms(data.boms);
    if (data.projects) setProjects(data.projects);
    if (data.operators) setOperators(data.operators);
    if (data.stockCountings) setStockCountings(data.stockCountings);
    if (data.stockInDocs) setStockInDocs(data.stockInDocs);
    if (data.stockOutDocs) setStockOutDocs(data.stockOutDocs);
    if (data.transfers) setTransfers(data.transfers);
    if (data.purchaseRequests) setPurchaseRequests(data.purchaseRequests);
    if (data.productionLogs) setProductionLogs(data.productionLogs);
    if (data.materialHandovers) setMaterialHandovers(data.materialHandovers);
    if (data.notifications) setNotifications(data.notifications);
    if (data.traceabilityEvents) setTraceabilityEvents(data.traceabilityEvents);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    if (data.users && data.users.length > 0) setUsers(data.users);
    if (data.companyName) {
      setCompanyNameState(data.companyName);
      localStorage.setItem(`${STORAGE_KEY}_company_name`, data.companyName);
    }
    if (data.isInstalled !== undefined) {
      setIsInstalled(data.isInstalled);
      localStorage.setItem(`${STORAGE_KEY}_is_installed`, String(data.isInstalled));
    }
    if (data.autoBackupIntervalHours !== undefined) setAutoBackupIntervalHoursState(data.autoBackupIntervalHours);
    if (data.lastBackupTimestamp) setLastBackupTimestamp(data.lastBackupTimestamp);
    if (data.backupHistory) setBackupHistory(data.backupHistory);

    serverVersionRef.current = version;
    setServerVersion(version);
    setServerSyncStatus('connected');
    setLastSyncTime(new Date().toLocaleTimeString('fa-IR'));

    setTimeout(() => {
      isRemoteUpdatingRef.current = false;
    }, 150);
  }, []);

  const pushStateToServer = useCallback(async (customPayload?: any) => {
    if (!isInitialServerSyncDoneRef.current || isRemoteUpdatingRef.current) return;
    try {
      const payload = customPayload || {
        items, itemGroups, warehouses, contractors, inventory, boms, projects,
        operators, stockCountings, stockInDocs, stockOutDocs, transfers,
        purchaseRequests, productionLogs, materialHandovers, notifications,
        traceabilityEvents, auditLogs, users, isInstalled, companyName,
        autoBackupIntervalHours, lastBackupTimestamp, backupHistory
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientVersion: serverVersionRef.current,
          updates: payload
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.serverVersion) {
          serverVersionRef.current = result.serverVersion;
          setServerVersion(result.serverVersion);
        }
        setServerSyncStatus('connected');
        setLastSyncTime(new Date().toLocaleTimeString('fa-IR'));
      } else {
        setServerSyncStatus('error');
      }
    } catch {
      setServerSyncStatus('offline');
    }
  }, [
    items, itemGroups, warehouses, contractors, inventory, boms, projects,
    operators, stockCountings, stockInDocs, stockOutDocs, transfers,
    purchaseRequests, productionLogs, materialHandovers, notifications,
    traceabilityEvents, auditLogs, users, isInstalled, companyName,
    autoBackupIntervalHours, lastBackupTimestamp, backupHistory
  ]);

  const forceSyncWithServer = async (): Promise<boolean> => {
    setServerSyncStatus('syncing');
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          applyServerState(json.data, json.version || Date.now());
          isInitialServerSyncDoneRef.current = true;
          return true;
        }
      }
      setServerSyncStatus('offline');
      return false;
    } catch {
      setServerSyncStatus('offline');
      return false;
    }
  };

  const resetServerDatabase = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/reset-data', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          applyServerState(json.data, json.version || Date.now());
          isInitialServerSyncDoneRef.current = true;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetToEmptyDatabase = async (): Promise<boolean> => {
    try {
      isRemoteUpdatingRef.current = true;
      setItems([]);
      setItemGroups([]);
      setWarehouses([]);
      setContractors([]);
      setInventory([]);
      setBoms([]);
      setProjects([]);
      setOperators([]);
      setStockCountings([]);
      setStockInDocs([]);
      setStockOutDocs([]);
      setTransfers([]);
      setPurchaseRequests([]);
      setProductionLogs([]);
      setMaterialHandovers([]);
      setNotifications([]);
      setTraceabilityEvents([]);

      const initialLog: AuditLog = {
        id: `log-${Date.now()}-wipe`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'usr-1',
        userName: currentUser?.fullName || 'مدیر سیستم',
        role: currentUser?.role || 'SystemAdmin',
        action: 'تخلیه و خام‌سازی پایگاه داده',
        targetEntity: 'System',
        targetId: 'DATABASE_WIPED',
        details: 'تمامی اطلاعات آزمایشی و فرآیندهای انبار پاکسازی شدند و سیستم در وضعیت کاملاً خام (صفر) قرار گرفت.'
      };
      setAuditLogs([initialLog]);

      // Clear operational data from localStorage
      const operationalKeys = [
        'items', 'itemGroups', 'warehouses', 'contractors', 'inventory', 'boms', 
        'projects', 'operators', 'stockCountings', 'stockInDocs', 'stockOutDocs', 
        'transfers', 'purchaseRequests', 'productionLogs', 'materialHandovers', 
        'notifications', 'traceabilityEvents'
      ];
      operationalKeys.forEach(k => {
        try {
          localStorage.removeItem(`${STORAGE_KEY}_${k}`);
        } catch {}
      });

      // Call server to wipe database centrally
      const res = await fetch('/api/reset-empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepUsers: true, companyName })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          serverVersionRef.current = json.version || Date.now();
          setServerVersion(serverVersionRef.current);
        }
      }

      isRemoteUpdatingRef.current = false;
      return true;
    } catch (err) {
      console.error('Error in resetToEmptyDatabase:', err);
      isRemoteUpdatingRef.current = false;
      return false;
    }
  };

  const loadDemoData = async (): Promise<boolean> => {
    try {
      isRemoteUpdatingRef.current = true;
      setItems(INITIAL_ITEMS);
      setItemGroups(INITIAL_ITEM_GROUPS);
      setWarehouses(INITIAL_WAREHOUSES);
      setContractors(INITIAL_CONTRACTORS);
      setInventory(INITIAL_INVENTORY);
      setBoms(INITIAL_BOMS);
      setProjects(INITIAL_PROJECTS);
      setOperators(INITIAL_OPERATORS);
      setStockCountings(INITIAL_STOCK_COUNTINGS);
      setStockInDocs(INITIAL_STOCK_IN_DOCS);
      setStockOutDocs(INITIAL_STOCK_OUT_DOCS);
      setTransfers(INITIAL_TRANSFERS);
      setPurchaseRequests(INITIAL_PURCHASE_REQUESTS);
      setProductionLogs(INITIAL_PRODUCTION_LOGS);
      setMaterialHandovers(INITIAL_MATERIAL_HANDOVERS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setTraceabilityEvents(INITIAL_TRACEABILITY);
      setAuditLogs(INITIAL_AUDIT_LOGS);

      const res = await fetch('/api/reset-demo', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          serverVersionRef.current = json.version || Date.now();
          setServerVersion(serverVersionRef.current);
        }
      }
      isRemoteUpdatingRef.current = false;
      return true;
    } catch (err) {
      console.error('Error loading demo data:', err);
      isRemoteUpdatingRef.current = false;
      return false;
    }
  };

  const resetToSetupWizard = async (): Promise<boolean> => {
    try {
      localStorage.clear();
      setItems([]);
      setItemGroups([]);
      setWarehouses([]);
      setContractors([]);
      setInventory([]);
      setBoms([]);
      setProjects([]);
      setOperators([]);
      setStockCountings([]);
      setStockInDocs([]);
      setStockOutDocs([]);
      setTransfers([]);
      setPurchaseRequests([]);
      setProductionLogs([]);
      setMaterialHandovers([]);
      setNotifications([]);
      setTraceabilityEvents([]);
      setAuditLogs([]);
      setUsers([]);
      setIsInstalled(false);
      setIsAuthenticated(false);

      await fetch('/api/reset-empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepUsers: false })
      }).catch(() => {});

      return true;
    } catch {
      return false;
    }
  };

  // Initial connection to server and periodic real-time sync
  useEffect(() => {
    let isMounted = true;

    const initServerConnection = async () => {
      try {
        // Fetch server system diagnostic info
        fetch('/api/server-info')
          .then(r => r.json())
          .then(info => {
            if (isMounted && info.success) setServerInfo(info);
          })
          .catch(() => {});

        // Fetch central data from server
        setServerSyncStatus('syncing');
        const res = await fetch('/api/data');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            applyServerState(json.data, json.version || Date.now());
          }
        } else {
          setServerSyncStatus('offline');
        }
      } catch (err) {
        console.warn('[ServerSync] Could not reach server at startup:', err);
        setServerSyncStatus('offline');
      } finally {
        if (isMounted) {
          isInitialServerSyncDoneRef.current = true;
        }
      }
    };

    initServerConnection();

    // Multi-client real-time synchronization interval (every 2s)
    const pollInterval = setInterval(async () => {
      if (!isMounted || !isInitialServerSyncDoneRef.current) return;
      try {
        const verRes = await fetch('/api/data/version');
        if (verRes.ok) {
          const verData = await verRes.json();
          if (verData.version && verData.version > serverVersionRef.current) {
            // New data exists on server from another user/computer!
            const dataRes = await fetch('/api/data');
            if (dataRes.ok) {
              const dataJson = await dataRes.json();
              if (dataJson.success && dataJson.data) {
                applyServerState(dataJson.data, dataJson.version);
              }
            }
          }
          setServerSyncStatus(prev => prev === 'syncing' ? prev : 'connected');
        } else {
          setServerSyncStatus('offline');
        }
      } catch {
        setServerSyncStatus('offline');
      }
    }, 2000);

    const onFocus = () => {
      if (!isInitialServerSyncDoneRef.current) return;
      fetch('/api/data')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data && json.version > serverVersionRef.current) {
            applyServerState(json.data, json.version);
          }
        })
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, [applyServerState]);

  // Debounced auto-sync to server on any state mutation
  useEffect(() => {
    if (!isInitialServerSyncDoneRef.current || isRemoteUpdatingRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      pushStateToServer();
    }, 300);
  }, [
    items, itemGroups, warehouses, contractors, inventory, boms, projects, operators, 
    stockCountings, stockInDocs, stockOutDocs, transfers, purchaseRequests, 
    productionLogs, materialHandovers, notifications, traceabilityEvents, auditLogs,
    users, isInstalled, companyName, autoBackupIntervalHours, lastBackupTimestamp, backupHistory,
    pushStateToServer
  ]);

  // Auth & User Management Logic
  const login = (username: string, pass: string): { success: boolean; message: string } => {
    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) {
      return { success: false, message: 'نام کاربری وارد شده در سیستم وجود ندارد.' };
    }
    if (found.isActive === false) {
      return { success: false, message: 'حساب کاربری شما غیرفعال شده است. لطفا با مدیر سیستم تماس بگیرید.' };
    }
    if (found.password && found.password !== pass) {
      return { success: false, message: 'رمز عبور اشتباه است.' };
    }
    setCurrentUser(found);
    setIsAuthenticated(true);
    addAudit('ورود به سیستم', 'کاربر', found.id, `ورود موفقیت‌آمیز کاربر ${found.fullName}`);
    return { success: true, message: 'ورود با موفقیت انجام شد.' };
  };

  const logout = () => {
    addAudit('خروج از سیستم', 'کاربر', currentUser.id, `خروج کاربر ${currentUser.fullName}`);
    setIsAuthenticated(false);
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      isActive: userData.isActive ?? true,
      allowedTabs: userData.allowedTabs || ['dashboard']
    };
    setUsers(prev => [...prev, newUser]);
    addAudit('تعریف کاربر جدید', 'کاربر', newUser.id, `ایجاد کاربر ${newUser.fullName} با نقش ${newUser.role}`);
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updated }));
    }
    addAudit('ویرایش کاربر', 'کاربر', id, `بروزرسانی مشخصات کاربر ${updated.fullName || id}`);
  };

  const deleteUser = (id: string) => {
    if (id === 'usr-1') return; // Protect superadmin
    setUsers(prev => prev.filter(u => u.id !== id));
    addAudit('حذف کاربر', 'کاربر', id, `حذف حساب کاربری با شناسه ${id}`);
  };

  const hasTabPermission = (tabId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SystemAdmin') return true;
    if (!currentUser.allowedTabs || currentUser.allowedTabs.includes('*')) return true;
    
    const tabAliases: Record<string, string> = {
      'kardex': 'items',
      'movements': 'stock_movement',
      'purchase-requests': 'requests',
      'operator-logger': 'operator_logger',
      'operator-performance': 'operator_perf',
      'linux-installer': 'backup',
      'linux_installer': 'backup',
      'audit-logs': 'audit_backup'
    };

    const normalized = tabAliases[tabId] || tabId;
    return currentUser.allowedTabs.includes(normalized) || currentUser.allowedTabs.includes(tabId);
  };

  const hasActionPermission = (action: 'add' | 'edit' | 'delete' | 'export'): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SystemAdmin') return true;
    switch (action) {
      case 'add':
        return currentUser.canAdd ?? true;
      case 'edit':
        return currentUser.canEdit ?? true;
      case 'delete':
        return currentUser.canDelete ?? false;
      case 'export':
        return currentUser.canExport ?? true;
      default:
        return true;
    }
  };

  const addAudit = (action: string, targetEntity: string, targetId: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser.id,
      userName: currentUser.fullName,
      role: currentUser.role,
      action,
      targetEntity,
      targetId,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const getItemQuantityInWarehouse = (itemId: string, warehouseId: string): number => {
    const inv = inventory.find(i => i.itemId === itemId && i.warehouseId === warehouseId);
    return inv ? inv.quantity : 0;
  };

  const getTotalItemQuantity = (itemId: string): number => {
    return inventory
      .filter(i => i.itemId === itemId)
      .reduce((sum, curr) => sum + curr.quantity, 0);
  };

  // Helper to adjust stock balance
  const adjustStock = (itemId: string, warehouseId: string, deltaQuantity: number) => {
    setInventory(prev => {
      const idx = prev.findIndex(i => i.itemId === itemId && i.warehouseId === warehouseId);
      const today = new Date().toISOString().substring(0, 10);
      if (idx >= 0) {
        const copy = [...prev];
        const newQty = Math.max(0, copy[idx].quantity + deltaQuantity);
        copy[idx] = { ...copy[idx], quantity: newQty, lastUpdated: today };
        return copy;
      } else {
        if (deltaQuantity <= 0) return prev;
        return [...prev, { itemId, warehouseId, quantity: deltaQuantity, reservedQuantity: 0, lastUpdated: today }];
      }
    });
  };

  // Material Handover to Operator
  const addMaterialHandover = (handoverData: Omit<MaterialHandover, 'id' | 'createdAt'>) => {
    const newHandover: MaterialHandover = {
      ...handoverData,
      id: `hnd-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setMaterialHandovers(prev => [newHandover, ...prev]);

    // Automatically transition the step to InProgress and project to Active!
    if (handoverData.projectId && handoverData.stepId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== handoverData.projectId) return p;
        const updateStepRec = (steps: ProjectStep[]): ProjectStep[] => {
          return steps.map(s => {
            if (s.id === handoverData.stepId) {
              return {
                ...s,
                status: s.status === 'Completed' ? 'Completed' : 'InProgress',
                lastHandoverDate: handoverData.date || new Date().toLocaleDateString('fa-IR'),
                lastHandoverOperator: handoverData.operatorName,
                lastHandoverDocNumber: handoverData.docNumber
              };
            }
            if (s.subSteps && s.subSteps.length > 0) {
              return { ...s, subSteps: updateStepRec(s.subSteps) };
            }
            return s;
          });
        };
        const updatedSteps = updateStepRec(p.steps);
        return {
          ...p,
          steps: updatedSteps,
          status: p.status === 'Planning' ? 'Active' : p.status
        };
      }));
    }

    addAudit('ثبت برگه تحویل قطعات به اپراتور', 'MaterialHandover', newHandover.docNumber, `تحویل قطعات به اپراتور ${newHandover.operatorName} توسط ${newHandover.shiftSupervisor}`);
  };

  // Item Management
  const addItem = (itemData: Omit<Item, 'id' | 'createdAt'>) => {
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setItems(prev => [newItem, ...prev]);
    addAudit('تعریف کالای جدید', 'Item', newItem.code, `تعریف کالای ${newItem.name} با کد ${newItem.code}`);
  };

  const updateItem = (id: string, updated: Partial<Item>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updated } : it));
    addAudit('ویرایش کالا', 'Item', id, `به‌روزرسانی اطلاعات کالا`);
  };

  const deleteItem = (id: string) => {
    const target = items.find(i => i.id === id);
    setItems(prev => prev.filter(it => it.id !== id));
    addAudit('حذف کالا', 'Item', id, `حذف کالا ${target?.name || id}`);
  };

  // Item Group Management
  const addItemGroup = (groupData: Omit<ItemGroup, 'id'>) => {
    const newGroup: ItemGroup = {
      ...groupData,
      id: `cat-${Date.now()}`,
    };
    setItemGroups(prev => [...prev, newGroup]);
    addAudit('تعریف گروه کالای جدید', 'ItemGroup', newGroup.id, `ایجاد گروه ${newGroup.name}`);
  };

  const updateItemGroup = (id: string, updated: Partial<ItemGroup>) => {
    setItemGroups(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
    addAudit('ویرایش گروه کالا', 'ItemGroup', id, 'تغییر مشخصات یا زیرگروه‌های کالا');
  };

  const deleteItemGroup = (id: string) => {
    const target = itemGroups.find(g => g.id === id);
    setItemGroups(prev => prev.filter(g => g.id !== id));
    addAudit('حذف گروه کالا', 'ItemGroup', id, `حذف گروه ${target?.name || id}`);
  };

  // Warehouse Management
  const addWarehouse = (whData: Omit<Warehouse, 'id'>) => {
    const newWh: Warehouse = {
      ...whData,
      id: `wh-${Date.now()}`,
    };
    setWarehouses(prev => [...prev, newWh]);
    addAudit('تعریف انبار جدید', 'Warehouse', newWh.code, `ایجاد انبار ${newWh.name}`);
  };

  const updateWarehouse = (id: string, updated: Partial<Warehouse>) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...updated } : w));
    addAudit('ویرایش انبار', 'Warehouse', id, 'تغییر مشخصات انبار');
  };

  const deleteWarehouse = (id: string) => {
    const target = warehouses.find(w => w.id === id);
    setWarehouses(prev => prev.filter(w => w.id !== id));
    addAudit('حذف انبار', 'Warehouse', id, `حذف انبار ${target?.name || id}`);
  };

  // Contractor Management
  const addContractor = (contData: Omit<Contractor, 'id'>) => {
    const newCont: Contractor = {
      ...contData,
      id: `cont-${Date.now()}`,
    };
    setContractors(prev => [...prev, newCont]);
    addAudit('تعریف پیمانکار جدید', 'Contractor', newCont.code, `ایجاد پیمانکار ${newCont.name}`);
  };

  const updateContractor = (id: string, updated: Partial<Contractor>) => {
    setContractors(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    addAudit('ویرایش پیمانکار', 'Contractor', id, 'تغییر مشخصات پیمانکار');
  };

  const deleteContractor = (id: string) => {
    const target = contractors.find(c => c.id === id);
    setContractors(prev => prev.filter(c => c.id !== id));
    addAudit('حذف پیمانکار', 'Contractor', id, `حذف پیمانکار ${target?.name || id}`);
  };

  // BOM Management
  const addBOM = (bomData: Omit<BOM, 'id' | 'createdAt'>) => {
    const newBom: BOM = {
      ...bomData,
      id: `bom-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setBoms(prev => [newBom, ...prev]);
    addAudit('تعریف فرمول ساخت (BOM)', 'BOM', newBom.id, `ایجاد فرمول ساخت ${newBom.name}`);
  };

  const updateBOM = (id: string, updated: Partial<BOM>) => {
    setBoms(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
    addAudit('ویرایش فرمول ساخت', 'BOM', id, 'تغییر اقلام یا نسخه فرمول ساخت');
  };

  const deleteBOM = (id: string) => {
    const target = boms.find(b => b.id === id);
    setBoms(prev => prev.filter(b => b.id !== id));
    addAudit('حذف فرمول ساخت', 'BOM', id, `حذف فرمول ${target?.name || id}`);
  };

  // =========================================================================
  // EXCEL BATCH IMPORT & SMART CASCADE PRODUCTION CALCULATIONS
  // =========================================================================

  // 1. Batch Import Items from Excel
  const importItemsBatch = (
    newItemsList: Omit<Item, 'id' | 'createdAt'>[], 
    groupsToCreate?: { name: string; subGroup: string }[]
  ): { count: number; updatedCount: number } => {
    const dateStr = new Date().toISOString().substring(0, 10);
    let addedCount = 0;
    let updatedCount = 0;

    // Create any missing groups automatically
    if (groupsToCreate && groupsToCreate.length > 0) {
      setItemGroups(prev => {
        const nextGroups = [...prev];
        groupsToCreate.forEach(g => {
          const existing = nextGroups.find(x => x.name.trim().toLowerCase() === g.name.trim().toLowerCase());
          if (!existing) {
            nextGroups.push({
              id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: g.name,
              code: `GRP-${Math.floor(10 + Math.random() * 90)}`,
              description: 'ایجاد خودکار از اکسل کالاها',
              subGroups: g.subGroup ? [g.subGroup] : ['عمومی']
            });
          } else if (g.subGroup && !existing.subGroups?.includes(g.subGroup)) {
            existing.subGroups = [...(existing.subGroups || []), g.subGroup];
          }
        });
        return nextGroups;
      });
    }

    setItems(prevItems => {
      const itemsMap = new Map<string, Item>();
      prevItems.forEach(it => itemsMap.set(it.code.toLowerCase().trim(), it));

      newItemsList.forEach(rawItem => {
        const key = rawItem.code.toLowerCase().trim();
        const existing = itemsMap.get(key);
        if (existing) {
          // Update existing item
          itemsMap.set(key, {
            ...existing,
            ...rawItem,
          });
          updatedCount++;
        } else {
          // Create new item
          const newItem: Item = {
            ...rawItem,
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: dateStr,
          };
          itemsMap.set(key, newItem);
          addedCount++;
        }
      });

      return Array.from(itemsMap.values());
    });

    addAudit(
      'ورود دسته‌ای کالاها از اکسل', 
      'Item', 
      'EXCEL_IMPORT', 
      `افزودن ${addedCount} کالای جدید و به‌روزرسانی ${updatedCount} کالا از طریق فایل اکسل`
    );

    return { count: addedCount, updatedCount };
  };

  // 2. Batch Import Initial Stock (موجودی ابتدای دوره) from Excel
  const importInitialStockBatch = (rows: InitialStockParsedRow[]): { count: number; docNumber: string } => {
    const today = new Date().toISOString().substring(0, 10);
    const docNumber = `OPN-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    // Group rows by warehouse to create clean opening StockIn documents
    const rowsByWarehouse = new Map<string, InitialStockParsedRow[]>();
    rows.forEach(r => {
      if (!rowsByWarehouse.has(r.warehouseId)) {
        rowsByWarehouse.set(r.warehouseId, []);
      }
      rowsByWarehouse.get(r.warehouseId)!.push(r);
    });

    // Update inventory balance table
    setInventory(prevInv => {
      const invMap = new Map<string, InventoryBalance>();
      prevInv.forEach(inv => {
        invMap.set(`${inv.warehouseId}_${inv.itemId}`, { ...inv });
      });

      rows.forEach(r => {
        const key = `${r.warehouseId}_${r.itemId}`;
        invMap.set(key, {
          warehouseId: r.warehouseId,
          itemId: r.itemId,
          quantity: r.quantity, // Set to opening balance
          reservedQuantity: 0,
          lastUpdated: today
        });
      });

      return Array.from(invMap.values());
    });

    // Create StockInDoc for each warehouse opening
    const newDocs: StockInDoc[] = [];
    const newTraces: TraceabilityEvent[] = [];

    rowsByWarehouse.forEach((whRows, whId) => {
      const whDocNum = `${docNumber}-${whId.substring(0, 5)}`;
      const newDoc: StockInDoc = {
        id: `in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        docNumber: whDocNum,
        date: today,
        supplier: 'سند افتتاحیه / موجودی ابتدای دوره',
        registeredBy: currentUser.fullName || 'مدیر انبار',
        warehouseId: whId,
        entryType: 'StockAdjustment',
        status: 'Confirmed',
        notes: 'ثبت خودکار موجودی ابتدای دوره از طریق فایل اکسل',
        items: whRows.map(r => ({
          itemId: r.itemId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          notes: r.notes || 'سند افتتاحیه'
        })),
        createdAt: today
      };
      newDocs.push(newDoc);

      whRows.forEach(r => {
        newTraces.push({
          id: `trc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemId: r.itemId,
          timestamp: `${today} 08:00:00`,
          eventType: 'StockIn',
          targetWarehouseId: r.warehouseId,
          docNumber: whDocNum,
          quantity: r.quantity,
          details: `سند افتتاحیه و موجودی اول دوره (${r.quantity} ${r.itemName || ''})`,
          performedBy: currentUser.fullName || 'مدیر سیستم'
        });
      });
    });

    setStockInDocs(prev => [...newDocs, ...prev]);
    setTraceabilityEvents(prev => [...newTraces, ...prev]);

    addAudit(
      'ثبت موجودی ابتدای دوره از اکسل', 
      'StockInDoc', 
      docNumber, 
      `ثبت و تنظیم موجودی افتتاحیه برای ${rows.length} قلم کالا در ${rowsByWarehouse.size} انبار`
    );

    return { count: rows.length, docNumber };
  };

  // 3. Batch Import BOMs from Excel
  const importBOMsBatch = (newBomsList: Omit<BOM, 'id' | 'createdAt'>[]): { count: number } => {
    const today = new Date().toISOString().substring(0, 10);
    let addedCount = 0;

    setBoms(prevBoms => {
      const bomsMap = new Map<string, BOM>();
      prevBoms.forEach(b => {
        const key = `${b.finishedItemId}_${b.name.trim().toLowerCase()}_${b.version.trim().toLowerCase()}`;
        bomsMap.set(key, b);
      });

      newBomsList.forEach(rawBom => {
        const key = `${rawBom.finishedItemId}_${rawBom.name.trim().toLowerCase()}_${rawBom.version.trim().toLowerCase()}`;
        const existing = bomsMap.get(key);
        if (existing) {
          // Update items
          bomsMap.set(key, {
            ...existing,
            ...rawBom,
          });
        } else {
          const newBom: BOM = {
            ...rawBom,
            id: `bom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            createdAt: today
          };
          bomsMap.set(key, newBom);
          addedCount++;
        }
      });

      return Array.from(bomsMap.values());
    });

    addAudit(
      'ورود فرمول‌های ساخت از اکسل', 
      'BOM', 
      'EXCEL_IMPORT', 
      `ثبت و به‌روزرسانی ${newBomsList.length} فرمول ساخت (BOM) از طریق فایل اکسل`
    );

    return { count: newBomsList.length };
  };

  // 4. Multi-Level Stage Scaling Engine (محاسبه هوشمند اهداف مراحل تولید)
  const applySmartStageTargetsToProject = (
    projectId: string,
    customOverrides?: { projectScrap?: number; stepScraps?: Record<string, number> }
  ): { success: boolean; message: string; count: number } => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) {
      return { success: false, message: 'پروژه مورد نظر یافت نشد.', count: 0 };
    }

    const { calculations } = calculateAllProjectStageTargets(targetProject, boms, items, customOverrides);
    const targetMap = new Map<string, number>();
    const scrapMap = new Map<string, number>();
    calculations.forEach(c => {
      targetMap.set(c.stepId, c.calculatedSmartTargetQty);
      if (c.scrapPercent !== undefined) {
        scrapMap.set(c.stepId, c.scrapPercent);
      }
    });

    const updatedSteps = applySmartTargetsToProjectSteps(targetProject.steps, targetMap, scrapMap);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        scrapAllowancePercent: customOverrides?.projectScrap !== undefined ? customOverrides.projectScrap : p.scrapAllowancePercent,
        steps: updatedSteps
      };
    }));

    addAudit(
      'محاسبه هوشمند اهداف مراحل تولید',
      'Project',
      targetProject.code,
      `محاسبه خودکار اهداف ${calculations.length} مرحله بر اساس فرمول ساخت BOM و ضریب ضایعات (تیراژ نهایی: ${targetProject.targetQuantity})`
    );

    return {
      success: true,
      message: `اهداف ${calculations.length} مرحله از پروژه بر اساس درخت BOM و ضریب ضایعات با موفقیت به‌روزرسانی شد.`,
      count: calculations.length
    };
  };

  // Project Management
  const addProject = (projData: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...projData,
      id: `proj-${Date.now()}`,
    };
    setProjects(prev => [newProj, ...prev]);
    addAudit('ایجاد پروژه جدید', 'Project', newProj.code, `تعریف پروژه ${newProj.name}`);
  };

  const updateProject = (id: string, updated: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    addAudit('ویرایش پروژه', 'Project', id, 'به‌روزرسانی مشخصات پروژه');
  };

  const deleteProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    setProjects(prev => prev.filter(p => p.id !== id));
    addAudit('حذف پروژه', 'Project', id, `حذف پروژه ${target?.name || id}`);
  };

  const updateProjectStepDetails = (projectId: string, stepId: string, updated: Partial<ProjectStep>) => {
    const updateStepRec = (steps: ProjectStep[]): ProjectStep[] => {
      return steps.map(s => {
        if (s.id === stepId) {
          return { ...s, ...updated };
        }
        if (s.subSteps && s.subSteps.length > 0) {
          return { ...s, subSteps: updateStepRec(s.subSteps) };
        }
        return s;
      });
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, steps: updateStepRec(p.steps) };
    }));
    addAudit('ویرایش جزئیات مرحله پروژه', 'ProjectStep', stepId, 'تغییر مشخصات مرحله');
  };

  const deleteProjectStep = (projectId: string, stepId: string) => {
    const deleteStepRec = (steps: ProjectStep[]): ProjectStep[] => {
      return steps
        .filter(s => s.id !== stepId)
        .map(s => {
          if (s.subSteps && s.subSteps.length > 0) {
            return { ...s, subSteps: deleteStepRec(s.subSteps) };
          }
          return s;
        });
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, steps: deleteStepRec(p.steps) };
    }));
    addAudit('حذف مرحله پروژه', 'ProjectStep', stepId, 'حذف مرحله از پروژه');
  };

  // Calculate complete project progress summary
  const calculateProjectProgressSummary = (project: Project) => {
    let totalSteps = 0;
    let completedSteps = 0;
    let inProgressSteps = 0;
    let pendingSteps = 0;
    let progressSum = 0;
    const stepsSummary: {
      stepId: string;
      stepName: string;
      targetQuantity: number;
      completedQuantity: number;
      scrapQuantity: number;
      progressPercent: number;
      status: 'Pending' | 'InProgress' | 'Completed';
    }[] = [];

    const analyzeStepsRec = (steps: ProjectStep[]) => {
      steps.forEach(s => {
        totalSteps += 1;
        const stepTarget = s.outputQuantity || s.targetQuantity || project.targetQuantity || 1;
        const stepCompleted = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
        const stepScrap = s.scrapQuantity || 0;
        let stepProgress = s.status === 'Completed' ? 100 : (s.progressPercent !== undefined ? s.progressPercent : Math.min(100, Math.round((stepCompleted / stepTarget) * 100)));
        if (s.status === 'InProgress' && stepProgress === 0) stepProgress = 15; // In progress initial estimate

        if (s.status === 'Completed') completedSteps += 1;
        else if (s.status === 'InProgress') inProgressSteps += 1;
        else pendingSteps += 1;

        progressSum += stepProgress;
        stepsSummary.push({
          stepId: s.id,
          stepName: s.name || s.title || `مرحله ${s.stepNumber}`,
          targetQuantity: stepTarget,
          completedQuantity: stepCompleted,
          scrapQuantity: stepScrap,
          progressPercent: stepProgress,
          status: s.status,
        });

        if (s.subSteps && s.subSteps.length > 0) {
          analyzeStepsRec(s.subSteps);
        }
      });
    };

    if (project.steps && project.steps.length > 0) {
      analyzeStepsRec(project.steps);
    }

    const averageProgressPercent = totalSteps > 0 ? Math.round(progressSum / totalSteps) : (project.progressPercent || 0);

    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      pendingSteps,
      averageProgressPercent,
      stepsSummary,
    };
  };

  const updateProjectStep = (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => {
    const today = new Date().toLocaleDateString('fa-IR');
    
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updateStepStatusRecursively = (steps: ProjectStep[]): ProjectStep[] => {
        return steps.map(s => {
          if (s.id === stepId) {
            const stepTarget = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
            const newCompleted = status === 'Completed' ? (s.completedQuantity && s.completedQuantity > 0 ? s.completedQuantity : stepTarget) : (status === 'Pending' ? 0 : (s.completedQuantity || 0));
            const newProgress = status === 'Completed' ? 100 : (status === 'Pending' ? 0 : (s.progressPercent || 25));
            return {
              ...s,
              status,
              completedQuantity: newCompleted,
              progressPercent: newProgress,
              completedDate: status === 'Completed' ? (s.completedDate || today) : undefined,
            };
          }
          if (s.subSteps && s.subSteps.length > 0) {
            return { ...s, subSteps: updateStepStatusRecursively(s.subSteps) };
          }
          return s;
        });
      };

      const updatedSteps = updateStepStatusRecursively(p.steps);
      
      // Calculate overall progress across all steps
      const collectStepProgresses = (steps: ProjectStep[]): number[] => {
        let list: number[] = [];
        steps.forEach(s => {
          const stepTarget = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
          const done = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
          const prg = s.status === 'Completed' ? 100 : (s.progressPercent !== undefined ? s.progressPercent : Math.min(100, Math.round((done / stepTarget) * 100)));
          list.push(prg);
          if (s.subSteps && s.subSteps.length > 0) {
            list = list.concat(collectStepProgresses(s.subSteps));
          }
        });
        return list;
      };

      const allProgresses = collectStepProgresses(updatedSteps);
      const avgProgress = allProgresses.length > 0
        ? Math.round(allProgresses.reduce((a, b) => a + b, 0) / allProgresses.length)
        : 0;

      const isAllDone = allProgresses.length > 0 && allProgresses.every(prg => prg === 100);
      const newProjStatus = isAllDone ? 'Completed' : (avgProgress > 0 && p.status === 'Planning' ? 'Active' : p.status);

      return {
        ...p,
        steps: updatedSteps,
        progressPercent: avgProgress,
        status: newProjStatus,
      };
    }));
    addAudit('تغییر وضعیت مرحله پروژه', 'ProjectStep', stepId, `تغییر وضعیت مرحله به ${status}`);
  };

  // Direct Handover of Stage Materials to Operator with Automatic Stage Transition
  const handoverStepMaterials = (data: {
    projectId: string;
    stepId: string;
    operatorId: string;
    operatorName: string;
    supervisorName?: string;
    sourceWarehouseId: string;
    items: { itemId: string; quantity: number; notes?: string }[];
    salonName?: string;
    machineCode?: string;
    notes?: string;
  }) => {
    const today = new Date().toLocaleDateString('fa-IR');
    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const docNumber = `HND-1404-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Deduct stock from source warehouse and log traceability
    data.items.forEach(it => {
      adjustStock(it.itemId, data.sourceWarehouseId, -it.quantity);

      const itemObj = items.find(i => i.id === it.itemId);
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        itemId: it.itemId,
        timestamp: `${today} ${time}`,
        eventType: 'ProjectConsumption',
        sourceWarehouseId: data.sourceWarehouseId,
        projectId: data.projectId,
        operatorName: data.operatorName,
        quantity: it.quantity,
        docNumber: docNumber,
        details: `تحویل مستقیم مواد اولیه/قطعات به اپراتور (${it.quantity} ${itemObj?.unit || 'عدد'}) جهت شروع مرحله`,
        performedBy: data.supervisorName || currentUser.fullName,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    });

    const itemsFormatted = data.items.map(it => {
      const itemObj = items.find(i => i.id === it.itemId);
      return {
        itemId: it.itemId,
        itemCode: itemObj?.code || '',
        itemName: itemObj?.name || 'قطعه',
        unit: itemObj?.unit || 'عدد',
        quantity: it.quantity,
        notes: it.notes
      };
    });

    // 2. Save Material Handover Record
    const newHandover: MaterialHandover = {
      id: `hnd-${Date.now()}`,
      docNumber,
      shiftSupervisor: data.supervisorName || currentUser.fullName,
      salonName: data.salonName || 'سالن مونتاژ و تولید',
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      projectId: data.projectId,
      stepId: data.stepId,
      machineCode: data.machineCode || 'LINE-01',
      date: today,
      startTime: time,
      sourceWarehouseId: data.sourceWarehouseId,
      items: itemsFormatted,
      notes: data.notes,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setMaterialHandovers(prev => [newHandover, ...prev]);

    // 3. Automatically transition stage status to InProgress & project to Active
    setProjects(prev => prev.map(p => {
      if (p.id !== data.projectId) return p;

      const updateStepRec = (steps: ProjectStep[]): ProjectStep[] => {
        return steps.map(s => {
          if (s.id === data.stepId) {
            return {
              ...s,
              status: s.status === 'Completed' ? 'Completed' : 'InProgress',
              lastHandoverDate: today,
              lastHandoverOperator: data.operatorName,
              lastHandoverDocNumber: docNumber,
              progressPercent: s.progressPercent && s.progressPercent > 0 ? s.progressPercent : 15,
            };
          }
          if (s.subSteps && s.subSteps.length > 0) {
            return { ...s, subSteps: updateStepRec(s.subSteps) };
          }
          return s;
        });
      };

      const updatedSteps = updateStepRec(p.steps);
      return {
        ...p,
        steps: updatedSteps,
        status: p.status === 'Planning' ? 'Active' : p.status,
      };
    }));

    addAudit('تحویل قطعات و شروع مرحله پروژه', 'ProjectStep', data.stepId, `تحویل قطعات مرحله به اپراتور ${data.operatorName} (سند ${docNumber})`);

    return {
      success: true,
      message: `قطعات با موفقیت از انبار کسر و به اپراتور تحویل داده شد. وضعیت مرحله به «در حال انجام» تغییر یافت.`,
      docNumber
    };
  };

  // Direct Recording of Semi-Finished / Stage Output with Auto-Progress Computation
  const recordStepOutputReceipt = (data: {
    projectId: string;
    stepId: string;
    quantityProduced: number;
    quantityScrapped?: number;
    operatorId: string;
    operatorName: string;
    shift?: 'Morning' | 'Evening' | 'Night';
    targetWarehouseId: string;
    sourceWarehouseId?: string;
    machineCode?: string;
    notes?: string;
  }) => {
    const proj = projects.find(p => p.id === data.projectId);
    if (!proj) return { success: false, message: 'پروژه یافت نشد.', newStepProgress: 0, newProjectProgress: 0, isCompleted: false };

    const findStepRec = (steps: ProjectStep[]): ProjectStep | undefined => {
      for (const s of steps) {
        if (s.id === data.stepId) return s;
        if (s.subSteps && s.subSteps.length > 0) {
          const found = findStepRec(s.subSteps);
          if (found) return found;
        }
      }
      return undefined;
    };

    const targetStep = findStepRec(proj.steps);
    if (!targetStep) return { success: false, message: 'مرحله پروژه یافت نشد.', newStepProgress: 0, newProjectProgress: 0, isCompleted: false };

    const outputItemId = targetStep.outputItemId || proj.targetFinishedItemId;
    const outputItem = items.find(i => i.id === outputItemId);

    const today = new Date().toLocaleDateString('fa-IR');
    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const qtyScrap = Number(data.quantityScrapped || 0);
    const qtyProd = Number(data.quantityProduced || 0);

    // 1. Add produced item to targetWarehouseId
    if (outputItemId) {
      adjustStock(outputItemId, data.targetWarehouseId, qtyProd);
      if (qtyScrap > 0) {
        const scrapWh = warehouses.find(w => w.isScrap) || warehouses[0];
        adjustStock(outputItemId, scrapWh.id, qtyScrap);
      }

      // Traceability
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        itemId: outputItemId,
        timestamp: `${today} ${time}`,
        eventType: 'ProductionOutput',
        sourceWarehouseId: data.sourceWarehouseId,
        targetWarehouseId: data.targetWarehouseId,
        projectId: data.projectId,
        operatorName: data.operatorName,
        quantity: qtyProd,
        details: `دریافت خروجی مرحله «${targetStep.name}» (${qtyProd} سالم / ${qtyScrap} ضایعات)`,
        performedBy: currentUser.fullName,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    }

    // 2. Create ProductionLog
    const prodLog: ProductionLog = {
      id: `prod-${Date.now()}`,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      shift: data.shift || 'Morning',
      projectId: data.projectId,
      stepId: data.stepId,
      finishedItemId: outputItemId || '',
      quantityProduced: qtyProd,
      quantityScrapped: qtyScrap,
      date: today,
      time: time,
      machineCode: data.machineCode || 'LINE-PROD',
      sourceWarehouseId: data.sourceWarehouseId || warehouses[0]?.id || '',
      targetWarehouseId: data.targetWarehouseId,
      notes: data.notes,
      registeredBy: currentUser.fullName,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setProductionLogs(prev => [prodLog, ...prev]);

    // 3. Update Operator Stats
    if (data.operatorId) {
      setOperators(prev => prev.map(op => op.id === data.operatorId ? {
        ...op,
        totalProducedPieces: (op.totalProducedPieces || 0) + qtyProd
      } : op));
    }

    // 4. Update Step Completed Qty, Step Progress %, Step Status & Overall Project Progress %
    let computedStepProgress = 0;
    let computedProjectProgress = 0;
    let isStepComplete = false;

    setProjects(prev => prev.map(p => {
      if (p.id !== data.projectId) return p;

      const updateStepProgressRec = (steps: ProjectStep[]): ProjectStep[] => {
        return steps.map(s => {
          if (s.id === data.stepId) {
            const currentDone = (s.completedQuantity || 0) + qtyProd;
            const currentScrap = (s.scrapQuantity || 0) + qtyScrap;
            const targetQty = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
            const progress = Math.min(100, Math.round((currentDone / targetQty) * 100));
            const isCompleted = currentDone >= targetQty;
            isStepComplete = isCompleted;
            computedStepProgress = progress;

            return {
              ...s,
              completedQuantity: currentDone,
              scrapQuantity: currentScrap,
              progressPercent: progress,
              status: isCompleted ? 'Completed' : 'InProgress',
              completedDate: isCompleted ? (s.completedDate || today) : s.completedDate,
            };
          }
          if (s.subSteps && s.subSteps.length > 0) {
            return { ...s, subSteps: updateStepProgressRec(s.subSteps) };
          }
          return s;
        });
      };

      const updatedSteps = updateStepProgressRec(p.steps);

      // Calculate total project progress from all steps
      const collectStepProgresses = (steps: ProjectStep[]): number[] => {
        let list: number[] = [];
        steps.forEach(s => {
          const stepTarget = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
          const done = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
          const prg = s.status === 'Completed' ? 100 : (s.progressPercent !== undefined ? s.progressPercent : Math.min(100, Math.round((done / stepTarget) * 100)));
          list.push(prg);
          if (s.subSteps && s.subSteps.length > 0) {
            list = list.concat(collectStepProgresses(s.subSteps));
          }
        });
        return list;
      };

      const allProgresses = collectStepProgresses(updatedSteps);
      const avgProgress = allProgresses.length > 0
        ? Math.round(allProgresses.reduce((a, b) => a + b, 0) / allProgresses.length)
        : 0;

      computedProjectProgress = avgProgress;
      const isAllDone = allProgresses.length > 0 && allProgresses.every(prg => prg === 100);
      const newProjStatus = isAllDone ? 'Completed' : (avgProgress > 0 && p.status === 'Planning' ? 'Active' : p.status);

      // If output is finished product, also increase producedQuantity
      const lastStep = updatedSteps[updatedSteps.length - 1];
      const isLastStep = lastStep?.id === data.stepId;
      const newProduced = isLastStep ? ((p.producedQuantity || 0) + qtyProd) : p.producedQuantity;

      return {
        ...p,
        steps: updatedSteps,
        producedQuantity: newProduced,
        progressPercent: avgProgress,
        status: newProjStatus
      };
    }));

    addAudit(
      'ثبت دریافت خروجی مرحله پروژه',
      'ProjectStep',
      data.stepId,
      `دریافت ${qtyProd} عدد خروجی مرحله «${targetStep.name}» (پیشرفت مرحله: ${computedStepProgress}٪ | پیشرفت کل پروژه: ${computedProjectProgress}٪)`
    );

    return {
      success: true,
      message: `دریافت ${qtyProd} عدد محصول با موفقیت ثبت شد. درصد پیشرفت این مرحله به ${computedStepProgress}٪ و درصد پیشرفت کل پروژه به ${computedProjectProgress}٪ رسید.`,
      newStepProgress: computedStepProgress,
      newProjectProgress: computedProjectProgress,
      isCompleted: isStepComplete,
    };
  };

  const addProjectSubStep = (projectId: string, parentStepId: string, subStepData: Omit<ProjectStep, 'id'>) => {
    const newSubStep: ProjectStep = {
      ...subStepData,
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      parentId: parentStepId,
    };

    const addSubStepRecursively = (steps: ProjectStep[], parentId: string, newItem: ProjectStep): ProjectStep[] => {
      return steps.map(s => {
        if (s.id === parentId) {
          const existingSub = s.subSteps || [];
          return { ...s, subSteps: [...existingSub, newItem] };
        }
        if (s.subSteps && s.subSteps.length > 0) {
          return { ...s, subSteps: addSubStepRecursively(s.subSteps, parentId, newItem) };
        }
        return s;
      });
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const updatedSteps = addSubStepRecursively(p.steps, parentStepId, newSubStep);
      return { ...p, steps: updatedSteps };
    }));
    addAudit('افزودن زیرمرحله به پروژه', 'ProjectStep', newSubStep.id, `ایجاد زیرمرحله ${newSubStep.name || newSubStep.title}`);
  };

  // Stock Counting Sessions
  const createStockCountingSession = (sessionData: Omit<StockCountingSession, 'id' | 'createdAt'>) => {
    const newSession: StockCountingSession = {
      ...sessionData,
      id: `sc-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setStockCountings(prev => [newSession, ...prev]);
    addAudit('ایجاد دوره انبارگردانی', 'StockCounting', newSession.sessionNumber, `شروع دوره انبارگردانی برای انبار ${newSession.warehouseId}`);
  };

  const updateStockCountItem = (
    sessionId: string,
    itemId: string,
    physicalQty: number,
    notes?: string,
    firstCount?: number,
    secondCount?: number,
    finalCount?: number
  ) => {
    setStockCountings(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updatedItems = s.items.map(it => {
        if (it.itemId !== itemId) return it;
        const fCount = firstCount !== undefined ? firstCount : (it.firstCount ?? physicalQty);
        const sCount = secondCount !== undefined ? secondCount : (it.secondCount ?? physicalQty);
        const fnlCount = finalCount !== undefined ? finalCount : (it.finalCount ?? physicalQty);
        
        const diff = fnlCount - it.systemQuantity;
        return {
          ...it,
          firstCount: fCount,
          secondCount: sCount,
          finalCount: fnlCount,
          physicalQuantity: fnlCount,
          difference: diff,
          variance: diff, // set both for compatibility
          notes: notes !== undefined ? notes : it.notes,
        };
      });
      return { ...s, items: updatedItems };
    }));
  };

  const applyStockCountingAdjustments = (sessionId: string) => {
    const targetSession = stockCountings.find(s => s.id === sessionId);
    if (!targetSession || targetSession.status === 'Applied') return;

    // Apply inventory adjustments for each difference
    targetSession.items.forEach(it => {
      if (it.difference !== 0) {
        adjustStock(it.itemId, targetSession.warehouseId, it.difference);
        // Log traceability event
        const trace: TraceabilityEvent = {
          id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
          itemId: it.itemId,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          eventType: 'Adjustment',
          targetWarehouseId: targetSession.warehouseId,
          docNumber: targetSession.sessionNumber,
          quantity: Math.abs(it.difference),
          details: `تطبیق انبارگردانی (${it.difference > 0 ? '+' : ''}${it.difference} عدد)`,
          performedBy: currentUser.fullName,
        };
        setTraceabilityEvents(t => [trace, ...t]);
      }
    });

    setStockCountings(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'Applied' } : s));
    addAudit('اعمال مغایرت‌های انبارگردانی', 'StockCounting', targetSession.sessionNumber, `اعمال اصلاحات موجودی انبار ${targetSession.warehouseId}`);
  };

  const updateStockCountingSession = (sessionId: string, updated: Partial<StockCountingSession>) => {
    setStockCountings(prev => prev.map(s => s.id === sessionId ? { ...s, ...updated } : s));
    addAudit('ویرایش دوره انبارگردانی', 'StockCounting', sessionId, 'به‌روزرسانی مشخصات دوره انبارگردانی');
  };

  const deleteStockCountingSession = (sessionId: string) => {
    const target = stockCountings.find(s => s.id === sessionId);
    setStockCountings(prev => prev.filter(s => s.id !== sessionId));
    addAudit('حذف دوره انبارگردانی', 'StockCounting', sessionId, `حذف دوره ${target?.sessionNumber || sessionId}`);
  };

  // Stock In Document
  const createStockInDoc = (docData: Omit<StockInDoc, 'id' | 'createdAt'>) => {
    const newDoc: StockInDoc = {
      ...docData,
      id: `in-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setStockInDocs(prev => [newDoc, ...prev]);

    // Update inventory stock
    docData.items.forEach(it => {
      adjustStock(it.itemId, docData.warehouseId, it.quantity);
      // Traceability
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        itemId: it.itemId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        eventType: 'StockIn',
        targetWarehouseId: docData.warehouseId,
        docNumber: docData.docNumber,
        quantity: it.quantity,
        details: `رسید ورودی (${docData.entryType}) - تامین‌کننده: ${docData.supplier}`,
        performedBy: docData.registeredBy,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    });

    addAudit('ثبت رسید ورود به انبار', 'StockInDoc', newDoc.docNumber, `ورودی به انبار ${docData.warehouseId}`);
  };

  const updateStockInDoc = (id: string, updated: Partial<StockInDoc>) => {
    setStockInDocs(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    addAudit('ویرایش رسید ورود', 'StockInDoc', id, 'به‌روزرسانی رسید ورود به انبار');
  };

  const deleteStockInDoc = (id: string) => {
    const target = stockInDocs.find(d => d.id === id);
    setStockInDocs(prev => prev.filter(d => d.id !== id));
    addAudit('حذف رسید ورود', 'StockInDoc', id, `حذف رسید ${target?.docNumber || id}`);
  };

  // Stock Out Document
  const createStockOutDoc = (docData: Omit<StockOutDoc, 'id' | 'createdAt'>) => {
    const newDoc: StockOutDoc = {
      ...docData,
      id: `out-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setStockOutDocs(prev => [newDoc, ...prev]);

    // Update inventory stock
    docData.items.forEach(it => {
      adjustStock(it.itemId, docData.warehouseId, -it.quantity);
      // Traceability
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        itemId: it.itemId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        eventType: docData.exitType === 'Scrap' ? 'StockOut' : 'StockOut',
        sourceWarehouseId: docData.warehouseId,
        docNumber: docData.docNumber,
        quantity: it.quantity,
        details: `حواله خروج (${docData.exitType}) - تحویل به: ${docData.recipient}`,
        performedBy: docData.registeredBy,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    });

    addAudit('ثبت حواله خروج از انبار', 'StockOutDoc', newDoc.docNumber, `خروج از انبار ${docData.warehouseId}`);
  };

  const updateStockOutDoc = (id: string, updated: Partial<StockOutDoc>) => {
    setStockOutDocs(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    addAudit('ویرایش حواله خروج', 'StockOutDoc', id, 'به‌روزرسانی حواله خروج از انبار');
  };

  const deleteStockOutDoc = (id: string) => {
    const target = stockOutDocs.find(d => d.id === id);
    setStockOutDocs(prev => prev.filter(d => d.id !== id));
    addAudit('حذف حواله خروج', 'StockOutDoc', id, `حذف حواله ${target?.docNumber || id}`);
  };

  // Warehouse Transfer
  const createTransfer = (transferData: Omit<WarehouseTransfer, 'id' | 'createdAt'>) => {
    const newTransfer: WarehouseTransfer = {
      ...transferData,
      id: `tr-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setTransfers(prev => [newTransfer, ...prev]);

    if (transferData.status === 'Completed' || transferData.status === 'InTransit') {
      transferData.items.forEach(it => {
        adjustStock(it.itemId, transferData.sourceWarehouseId, -it.quantity);
        if (transferData.status === 'Completed') {
          adjustStock(it.itemId, transferData.targetWarehouseId, it.quantity);
        }
        // Traceability
        const trace: TraceabilityEvent = {
          id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
          itemId: it.itemId,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          eventType: 'Transfer',
          sourceWarehouseId: transferData.sourceWarehouseId,
          targetWarehouseId: transferData.targetWarehouseId,
          docNumber: transferData.docNumber,
          quantity: it.quantity,
          details: `انتقال بین انبار - مسئول: ${transferData.handlerName}`,
          performedBy: transferData.requestedBy || transferData.dispatchedBy || currentUser.fullName,
        };
        setTraceabilityEvents(t => [trace, ...t]);
      });
    }

    // Notification for Central Warehouse if it's a Pending requisition
    if (transferData.status === 'Pending') {
      const notif: SystemNotification = {
        id: `notif-${Date.now()}`,
        type: 'TransferAlert',
        title: 'درخواست جدید کالا از انبار مرکزی',
        message: `درخواست انتقال ${newTransfer.docNumber} توسط ${newTransfer.requestedBy} برای پروژه ${newTransfer.projectName || 'مرتبط'} در کارتابل قرار گرفت.`,
        date: new Date().toLocaleString('fa-IR'),
        isRead: false,
        linkTab: 'transfers',
      };
      setNotifications(prev => [notif, ...prev]);
    }

    addAudit('ثبت درخواست/حواله انتقال بین انبارها', 'WarehouseTransfer', newTransfer.docNumber, `انتقال از ${transferData.sourceWarehouseId} به ${transferData.targetWarehouseId} (وضعیت: ${transferData.status})`);
  };

  const dispatchTransfer = (
    id: string, 
    details: { dispatchedBy: string; handlerName: string; driverPhone?: string; vehicleNumber?: string; notes?: string }
  ) => {
    const target = transfers.find(t => t.id === id);
    if (!target) return;

    const todayDate = new Date().toLocaleDateString('fa-IR');

    // Deduct stock from source warehouse (Central Warehouse)
    target.items.forEach(it => {
      adjustStock(it.itemId, target.sourceWarehouseId, -it.quantity);
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        itemId: it.itemId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        eventType: 'Transfer',
        sourceWarehouseId: target.sourceWarehouseId,
        targetWarehouseId: target.targetWarehouseId,
        docNumber: target.docNumber,
        quantity: it.quantity,
        details: `خروج از انبار مبدا (صدور حواله ارسال به انبار پروژه) - مسئول حمل: ${details.handlerName}`,
        performedBy: details.dispatchedBy,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    });

    setTransfers(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: 'InTransit',
        dispatchedBy: details.dispatchedBy,
        dispatchDate: todayDate,
        handlerName: details.handlerName,
        driverPhone: details.driverPhone || t.driverPhone,
        vehicleNumber: details.vehicleNumber || t.vehicleNumber,
        notes: details.notes ? `${t.notes ? t.notes + ' | ' : ''}${details.notes}` : t.notes,
      };
    }));

    // Notification for Destination Warehouse
    const notif: SystemNotification = {
      id: `notif-${Date.now()}`,
      type: 'TransferAlert',
      title: 'محموله جدید در راه است (کارتابل مقصد)',
      message: `حواله انتقال ${target.docNumber} توسط انبار مرکزی (${details.dispatchedBy}) ارسال شد و در کارتابل دریافت قرار گرفت.`,
      date: new Date().toLocaleString('fa-IR'),
      isRead: false,
      linkTab: 'transfers',
    };
    setNotifications(prev => [notif, ...prev]);

    addAudit('تایید ارسال و صدور حواله انتقال', 'WarehouseTransfer', target.docNumber, `خروج از انبار مرکزی و ارسال به انبار ${target.targetWarehouseId}`);
  };

  const receiveTransfer = (
    id: string, 
    details: { receivedBy: string; notes?: string }
  ) => {
    const target = transfers.find(t => t.id === id);
    if (!target) return;

    const todayDate = new Date().toLocaleDateString('fa-IR');

    // Add stock to target warehouse (Project / Sub-warehouse)
    target.items.forEach(it => {
      adjustStock(it.itemId, target.targetWarehouseId, it.quantity);
      const trace: TraceabilityEvent = {
        id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        itemId: it.itemId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        eventType: 'StockIn',
        targetWarehouseId: target.targetWarehouseId,
        sourceWarehouseId: target.sourceWarehouseId,
        docNumber: target.docNumber,
        quantity: it.quantity,
        details: `رسید ورود و تحویل در انبار مقصد - تحویل‌گیرنده: ${details.receivedBy}`,
        performedBy: details.receivedBy,
      };
      setTraceabilityEvents(t => [trace, ...t]);
    });

    setTransfers(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: 'Completed',
        receivedBy: details.receivedBy,
        receiveDate: todayDate,
        notes: details.notes ? `${t.notes ? t.notes + ' | ' : ''}${details.notes}` : t.notes,
      };
    }));

    // Notification for Requester / System
    const notif: SystemNotification = {
      id: `notif-${Date.now()}`,
      type: 'TransferAlert',
      title: 'تکمیل حواله انتقال بین انبار',
      message: `حواله ${target.docNumber} در انبار مقصد (${details.receivedBy}) تایید و موجودی ثبت گردید.`,
      date: new Date().toLocaleString('fa-IR'),
      isRead: false,
      linkTab: 'transfers',
    };
    setNotifications(prev => [notif, ...prev]);

    addAudit('تایید دریافت و ورود به انبار مقصد', 'WarehouseTransfer', target.docNumber, `تحویل قطعی در انبار ${target.targetWarehouseId}`);
  };

  const rejectTransfer = (id: string, reason: string) => {
    const target = transfers.find(t => t.id === id);
    if (!target) return;

    // If it was already dispatched, return stock to source
    if (target.status === 'InTransit') {
      target.items.forEach(it => {
        adjustStock(it.itemId, target.sourceWarehouseId, it.quantity);
      });
    }

    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Rejected', rejectReason: reason } : t));
    addAudit('رد درخواست/حواله انتقال', 'WarehouseTransfer', target.docNumber, `علت رد: ${reason}`);
  };

  const updateTransfer = (id: string, updated: Partial<WarehouseTransfer>) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    addAudit('ویرایش حواله انتقال', 'WarehouseTransfer', id, 'تغییر مشخصات حواله انتقال');
  };

  const updateTransferStatus = (id: string, status: 'Pending' | 'InTransit' | 'Completed' | 'Rejected') => {
    const target = transfers.find(t => t.id === id);
    if (!target) return;

    if (target.status !== 'Completed' && status === 'Completed') {
      target.items.forEach(it => {
        adjustStock(it.itemId, target.targetWarehouseId, it.quantity);
      });
    }

    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    addAudit('تغییر وضعیت حواله انتقال', 'WarehouseTransfer', id, `وضعیت به ${status} تغییر یافت`);
  };

  const deleteTransfer = (id: string) => {
    const target = transfers.find(t => t.id === id);
    setTransfers(prev => prev.filter(t => t.id !== id));
    addAudit('حذف حواله انتقال', 'WarehouseTransfer', id, `حذف حواله ${target?.docNumber || id}`);
  };

  // Purchase Requests
  const createPurchaseRequest = (reqData: Omit<PurchaseRequest, 'id' | 'createdAt'>) => {
    const newReq: PurchaseRequest = {
      ...reqData,
      id: `req-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setPurchaseRequests(prev => [newReq, ...prev]);

    // Create Notification
    const notif: SystemNotification = {
      id: `notif-${Date.now()}`,
      type: 'RequestSubmitted',
      title: 'درخواست جدید کالا/خرید',
      message: `درخواست ${newReq.requestNumber} توسط ${newReq.requesterName} ثبت گردید.`,
      date: new Date().toLocaleString('fa-IR'),
      isRead: false,
      linkTab: 'requests',
    };
    setNotifications(prev => [notif, ...prev]);

    addAudit('ثبت درخواست کالا', 'PurchaseRequest', newReq.requestNumber, `واحد درخواست‌کننده: ${newReq.requestingUnit}`);
  };

  const updatePurchaseRequest = (id: string, updated: Partial<PurchaseRequest>) => {
    setPurchaseRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    addAudit('ویرایش درخواست خرید', 'PurchaseRequest', id, 'به‌روزرسانی اقلام یا اولویت درخواست');
  };

  const updatePurchaseRequestStatus = (id: string, status: PurchaseRequest['status']) => {
    setPurchaseRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    addAudit('بررسی درخواست کالا', 'PurchaseRequest', id, `وضعیت به ${status} به‌روزرسانی شد`);
  };

  const deletePurchaseRequest = (id: string) => {
    const target = purchaseRequests.find(r => r.id === id);
    setPurchaseRequests(prev => prev.filter(r => r.id !== id));
    addAudit('حذف درخواست خرید', 'PurchaseRequest', id, `حذف درخواست ${target?.requestNumber || id}`);
  };

  // Production Logs & Operators
  const updateProductionLog = (id: string, updated: Partial<ProductionLog>) => {
    setProductionLogs(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
    addAudit('ویرایش لاگ تولید', 'ProductionLog', id, 'به‌روزرسانی لاگ تولید');
  };

  const deleteProductionLog = (id: string) => {
    const target = productionLogs.find(l => l.id === id);
    setProductionLogs(prev => prev.filter(l => l.id !== id));
    addAudit('حذف لاگ تولید', 'ProductionLog', id, `حذف رکورد تولید ${id}`);
  };

  const addOperator = (opData: Omit<Operator, 'id'>) => {
    const newOp: Operator = {
      ...opData,
      id: `op-${Date.now()}`,
    };
    setOperators(prev => [...prev, newOp]);
    addAudit('تعریف اپراتور جدید', 'Operator', newOp.code, `تعریف اپراتور ${newOp.name}`);
  };

  const updateOperator = (id: string, updated: Partial<Operator>) => {
    setOperators(prev => prev.map(op => op.id === id ? { ...op, ...updated } : op));
    addAudit('ویرایش مشخصات اپراتور', 'Operator', id, 'به‌روزرسانی مشخصات اپراتور');
  };

  const deleteOperator = (id: string) => {
    const target = operators.find(op => op.id === id);
    setOperators(prev => prev.filter(op => op.id !== id));
    addAudit('حذف اپراتور', 'Operator', id, `حذف اپراتور ${target?.name || id}`);
  };

  // CORE AUTOMATIC BOM PRODUCTION ENGINE
  const registerProduction = (data: {
    operatorId: string;
    operatorName: string;
    shift: 'Morning' | 'Evening' | 'Night';
    projectId: string;
    stepId: string;
    finishedItemId: string;
    quantityProduced: number;
    quantityScrapped: number;
    date: string;
    time: string;
    machineCode: string;
    sourceWarehouseId: string;
    targetWarehouseId: string;
    notes?: string;
  }) => {
    const finishedItem = items.find(i => i.id === data.finishedItemId);
    if (!finishedItem) {
      return { success: false, message: 'کالای تولیدی انتخاب شده در سیستم یافت نشد.' };
    }

    // Find active BOM
    const activeBom = boms.find(b => b.finishedItemId === data.finishedItemId && b.isActive);
    
    const shortages: { itemName: string; required: number; available: number }[] = [];

    if (activeBom) {
      // Check for raw material inventory in sourceWarehouseId
      activeBom.items.forEach(bomItem => {
        const totalNeeded = bomItem.quantityNeeded * (data.quantityProduced + data.quantityScrapped);
        const availableQty = getItemQuantityInWarehouse(bomItem.itemId, data.sourceWarehouseId);
        if (availableQty < totalNeeded) {
          const rawItem = items.find(i => i.id === bomItem.itemId);
          shortages.push({
            itemName: rawItem?.name || bomItem.itemId,
            required: totalNeeded,
            available: availableQty,
          });
        }
      });
    }

    if (shortages.length > 0) {
      return {
        success: false,
        message: 'موجودی مواد اولیه بر اساس فرمول ساخت (BOM) در انبار مبدا کافی نمی‌باشد!',
        shortages,
      };
    }

    // Execute Stock Deductions for BOM components
    if (activeBom) {
      activeBom.items.forEach(bomItem => {
        const totalNeeded = bomItem.quantityNeeded * (data.quantityProduced + data.quantityScrapped);
        adjustStock(bomItem.itemId, data.sourceWarehouseId, -totalNeeded);

        // Record Traceability for Raw Material Consumption
        const rawTrace: TraceabilityEvent = {
          id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
          itemId: bomItem.itemId,
          timestamp: `${data.date} ${data.time}`,
          eventType: 'ProjectConsumption',
          sourceWarehouseId: data.sourceWarehouseId,
          projectId: data.projectId,
          operatorName: data.operatorName,
          quantity: totalNeeded,
          details: `کسر خودکار بر اساس فرمول ساخت BOM جهت تولید ${data.quantityProduced} عدد ${finishedItem.name}`,
          performedBy: currentUser.fullName,
        };
        setTraceabilityEvents(t => [rawTrace, ...t]);
      });
    }

    // Add Produced Finished Product to Target Warehouse
    adjustStock(data.finishedItemId, data.targetWarehouseId, data.quantityProduced);

    // If Scrapped items exist, add them to scrap warehouse (wh-scrap if exists)
    if (data.quantityScrapped > 0) {
      const scrapWh = warehouses.find(w => w.isScrap) || warehouses[0];
      adjustStock(data.finishedItemId, scrapWh.id, data.quantityScrapped);
    }

    // Create Production Log
    const newProdLog: ProductionLog = {
      id: `prod-${Date.now()}`,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      shift: data.shift,
      projectId: data.projectId,
      stepId: data.stepId,
      finishedItemId: data.finishedItemId,
      quantityProduced: data.quantityProduced,
      quantityScrapped: data.quantityScrapped,
      date: data.date,
      time: data.time,
      machineCode: data.machineCode,
      sourceWarehouseId: data.sourceWarehouseId,
      targetWarehouseId: data.targetWarehouseId,
      notes: data.notes,
      registeredBy: currentUser.fullName,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setProductionLogs(prev => [newProdLog, ...prev]);

    // Update Operator Metrics
    setOperators(prev => prev.map(op => {
      if (op.id === data.operatorId) {
        return {
          ...op,
          totalProducedPieces: op.totalProducedPieces + data.quantityProduced,
        };
      }
      return op;
    }));

    // Update Project Progress & Output & Step completedQuantity
    setProjects(prev => prev.map(p => {
      if (p.id === data.projectId) {
        const updateStepRec = (steps: ProjectStep[]): ProjectStep[] => {
          return steps.map(s => {
            if (s.id === data.stepId) {
              const currentDone = (s.completedQuantity || 0) + data.quantityProduced;
              const currentScrap = (s.scrapQuantity || 0) + data.quantityScrapped;
              const targetQty = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
              const progress = Math.min(100, Math.round((currentDone / targetQty) * 100));
              const isCompleted = currentDone >= targetQty;
              return {
                ...s,
                completedQuantity: currentDone,
                scrapQuantity: currentScrap,
                progressPercent: progress,
                status: isCompleted ? 'Completed' : 'InProgress',
                completedDate: isCompleted ? (s.completedDate || data.date) : s.completedDate,
              };
            }
            if (s.subSteps && s.subSteps.length > 0) {
              return { ...s, subSteps: updateStepRec(s.subSteps) };
            }
            return s;
          });
        };

        const updatedSteps = updateStepRec(p.steps);

        // Compute average progress across all steps
        const collectStepProgresses = (steps: ProjectStep[]): number[] => {
          let list: number[] = [];
          steps.forEach(s => {
            const stepTarget = s.outputQuantity || s.targetQuantity || p.targetQuantity || 1;
            const done = s.completedQuantity || (s.status === 'Completed' ? stepTarget : 0);
            const prg = s.status === 'Completed' ? 100 : (s.progressPercent !== undefined ? s.progressPercent : Math.min(100, Math.round((done / stepTarget) * 100)));
            list.push(prg);
            if (s.subSteps && s.subSteps.length > 0) {
              list = list.concat(collectStepProgresses(s.subSteps));
            }
          });
          return list;
        };

        const allProgresses = collectStepProgresses(updatedSteps);
        const avgProgress = allProgresses.length > 0
          ? Math.round(allProgresses.reduce((a, b) => a + b, 0) / allProgresses.length)
          : Math.min(100, Math.round(((p.producedQuantity + data.quantityProduced) / p.targetQuantity) * 100));

        const isAllDone = allProgresses.length > 0 && allProgresses.every(prg => prg === 100);
        const newProduced = p.producedQuantity + data.quantityProduced;
        const newProjStatus = isAllDone ? 'Completed' : (avgProgress > 0 && p.status === 'Planning' ? 'Active' : p.status);

        return {
          ...p,
          steps: updatedSteps,
          producedQuantity: newProduced,
          progressPercent: avgProgress,
          status: newProjStatus,
        };
      }
      return p;
    }));

    // Traceability for Produced Finished Good
    const finishedTrace: TraceabilityEvent = {
      id: `trc-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
      itemId: data.finishedItemId,
      timestamp: `${data.date} ${data.time}`,
      eventType: 'ProductionOutput',
      sourceWarehouseId: data.sourceWarehouseId,
      targetWarehouseId: data.targetWarehouseId,
      projectId: data.projectId,
      operatorName: data.operatorName,
      quantity: data.quantityProduced,
      details: `ثبت تولید مستقیم اپراتور (${data.quantityProduced} عدد سالم / ${data.quantityScrapped} ضایعات)`,
      performedBy: currentUser.fullName,
    };
    setTraceabilityEvents(t => [finishedTrace, ...t]);

    // Audit Log
    addAudit(
      'ثبت تولید اپراتور (کسر خودکار BOM)', 
      'ProductionLog', 
      newProdLog.id, 
      `تولید ${data.quantityProduced} عدد ${finishedItem.name} توسط ${data.operatorName}`
    );

    // Check Low Stock Thresholds after production deductions
    items.forEach(it => {
      const totQty = getTotalItemQuantity(it.id);
      if (totQty < it.minStock) {
        const exists = notifications.some(n => n.type === 'LowStock' && n.message.includes(it.name));
        if (!exists) {
          const notif: SystemNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            type: 'LowStock',
            title: 'هشدار کسر موجودی زیر آستانه',
            message: `موجودی کل ${it.name} به ${totQty} ${it.unit} رسید (کمتر از حداقل ${it.minStock}).`,
            date: new Date().toLocaleString('fa-IR'),
            isRead: false,
            linkTab: 'inventory',
          };
          setNotifications(n => [notif, ...n]);
        }
      }
    });

    return {
      success: true,
      message: `تولید تعداد ${data.quantityProduced} عدد با موفقیت ثبت شد و کسر خودکار مواد اولیه بر اساس BOM انجام گرفت!`,
    };
  };

  // Notification management
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Database Backup / Reset / Import
  const resetToInitialData = () => {
    localStorage.clear();
    setItems([]);
    setItemGroups([]);
    setWarehouses([]);
    setContractors([]);
    setInventory([]);
    setBoms([]);
    setProjects([]);
    setOperators([]);
    setStockCountings([]);
    setStockInDocs([]);
    setStockOutDocs([]);
    setTransfers([]);
    setPurchaseRequests([]);
    setProductionLogs([]);
    setNotifications([]);
    setTraceabilityEvents([]);
    setAuditLogs([]);
    setUsers([]);
    setIsInstalled(false);
    setIsAuthenticated(false);

    // Also reset on centralized Linux server
    fetch('/api/reset-data', { method: 'POST' }).catch(() => {});
  };

  const completeInstallation = (compName: string, adminUser: string, adminPass: string) => {
    setCompanyName(compName);
    
    const adminUserObj: User = {
      id: 'usr-1',
      username: adminUser.trim(),
      password: adminPass,
      fullName: 'مدیر سیستم',
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
    
    // Ensure all business databases are completely empty (blank / خام)
    setItems([]);
    setItemGroups([]);
    setWarehouses([]);
    setContractors([]);
    setInventory([]);
    setBoms([]);
    setProjects([]);
    setOperators([]);
    setStockCountings([]);
    setStockInDocs([]);
    setStockOutDocs([]);
    setTransfers([]);
    setPurchaseRequests([]);
    setProductionLogs([]);
    setMaterialHandovers([]);
    setNotifications([]);
    setTraceabilityEvents([]);
    
    const initialLog: AuditLog = {
      id: `log-${Date.now()}-setup`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: 'usr-1',
      userName: 'مدیر سیستم',
      role: 'SystemAdmin',
      action: 'نصب و فعال‌سازی سیستم',
      targetEntity: 'System',
      targetId: 'SETUP',
      details: `فعال‌سازی سیستم برای شرکت ${compName} و ایجاد کاربر ارشد ${adminUser}`
    };
    setAuditLogs([initialLog]);

    localStorage.setItem(`${STORAGE_KEY}_company_name`, compName);
    localStorage.setItem(`${STORAGE_KEY}_is_installed`, 'true');
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify([adminUserObj]));
    localStorage.setItem(`${STORAGE_KEY}_auth_logged_in`, 'true');
    localStorage.setItem(`${STORAGE_KEY}_current_user`, JSON.stringify(adminUserObj));
    localStorage.setItem(`${STORAGE_KEY}_auditLogs`, JSON.stringify([initialLog]));

    // Update active memory state
    setUsers([adminUserObj]);
    setCurrentUser(adminUserObj);
    setIsAuthenticated(true);
    setIsInstalled(true);

    // Sync newly installed state to central server immediately
    pushStateToServer({
      companyName: compName,
      isInstalled: true,
      users: [adminUserObj],
      auditLogs: [initialLog],
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
      traceabilityEvents: []
    });
  };

  const exportDatabaseJSON = (type: 'Manual' | 'Auto' = 'Manual') => {
    const fullDb = {
      items, warehouses, inventory, boms, projects, operators,
      stockInDocs, stockOutDocs, transfers, purchaseRequests,
      productionLogs, notifications, traceabilityEvents, auditLogs,
      exportedAt: new Date().toISOString(),
    };
    const jsonContent = JSON.stringify(fullDb, null, 2);
    const sizeKb = Math.round(jsonContent.length / 1024);
    const nowIso = new Date().toISOString();
    const fileName = `ElectroStock_Backup_${type}_${nowIso.substring(0, 10)}.json`;

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    // Save backup metadata & timestamp
    const nowStr = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    setLastBackupTimestamp(nowStr);
    localStorage.setItem(`${STORAGE_KEY}_lastBackupTime`, nowStr);

    const newHistoryItem = {
      id: `bk-${Date.now()}`,
      timestamp: nowStr,
      fileName,
      sizeKb,
      type
    };

    setBackupHistory(prev => {
      const updated = [newHistoryItem, ...prev].slice(0, 20);
      localStorage.setItem(`${STORAGE_KEY}_backupHistory`, JSON.stringify(updated));
      return updated;
    });

    addAudit(
      type === 'Auto' ? 'پشتیبان‌گیری خودکار زمان‌بندی شده' : 'پشتیبان‌گیری دستی از داده‌ها', 
      'System', 
      'JSON', 
      `تهیه فایل پشتیبان (${sizeKb} KB)`
    );
  };

  // Auto-backup interval scheduler timer
  useEffect(() => {
    if (autoBackupIntervalHours <= 0) return;

    const intervalMs = autoBackupIntervalHours * 60 * 60 * 1000;
    const timer = setInterval(() => {
      exportDatabaseJSON('Auto');
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoBackupIntervalHours, items, warehouses, inventory]);

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.items && data.warehouses && data.inventory) {
        setItems(data.items);
        setWarehouses(data.warehouses);
        setInventory(data.inventory);
        if (data.boms) setBoms(data.boms);
        if (data.projects) setProjects(data.projects);
        if (data.operators) setOperators(data.operators);
        if (data.stockInDocs) setStockInDocs(data.stockInDocs);
        if (data.stockOutDocs) setStockOutDocs(data.stockOutDocs);
        if (data.transfers) setTransfers(data.transfers);
        if (data.purchaseRequests) setPurchaseRequests(data.purchaseRequests);
        if (data.productionLogs) setProductionLogs(data.productionLogs);
        if (data.notifications) setNotifications(data.notifications);
        if (data.traceabilityEvents) setTraceabilityEvents(data.traceabilityEvents);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        addAudit('بازیابی داده‌ها از فایل پشتیبان', 'System', 'JSON', 'بارگذاری کامل داده‌ها از فایل پشتیبان');

        // Also push imported backup to Linux server
        fetch('/api/import-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonStr })
        }).catch(() => {});

        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users,
      isAuthenticated, login, logout, addUser, updateUser, deleteUser, hasTabPermission, hasActionPermission,
      activeTab, setActiveTab,
      items, itemGroups, warehouses, contractors, inventory, boms, projects, operators, stockCountings,
      stockInDocs, stockOutDocs, transfers, purchaseRequests,
      productionLogs, materialHandovers, notifications, traceabilityEvents, auditLogs,
      addMaterialHandover, handoverStepMaterials, recordStepOutputReceipt, calculateProjectProgressSummary,
      addItem, updateItem, deleteItem,
      addItemGroup, updateItemGroup, deleteItemGroup,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addContractor, updateContractor, deleteContractor,
      addBOM, updateBOM, deleteBOM,
      importItemsBatch, importInitialStockBatch, importBOMsBatch, applySmartStageTargetsToProject,
      addProject, updateProject, deleteProject, updateProjectStep, updateProjectStepDetails, addProjectSubStep, deleteProjectStep,
      createStockCountingSession, updateStockCountItem, updateStockCountingSession, deleteStockCountingSession, applyStockCountingAdjustments,
      createStockInDoc, updateStockInDoc, deleteStockInDoc,
      createStockOutDoc, updateStockOutDoc, deleteStockOutDoc,
      createTransfer, updateTransfer, updateTransferStatus, dispatchTransfer, receiveTransfer, rejectTransfer, deleteTransfer,
      createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus, deletePurchaseRequest,
      updateProductionLog, deleteProductionLog,
      addOperator, updateOperator, deleteOperator,
      registerProduction,
      getItemQuantityInWarehouse, getTotalItemQuantity,
      markNotificationAsRead, markAllNotificationsAsRead,
      resetToInitialData, exportDatabaseJSON, importDatabaseJSON,
      language, setLanguage, t,
      autoBackupIntervalHours, setAutoBackupIntervalHours,
      lastBackupTimestamp, backupHistory,
      searchQuery, setSearchQuery, isScannerOpen, setIsScannerOpen,
      isMobileMenuOpen, setIsMobileMenuOpen,
      isInstalled, setIsInstalled, companyName, setCompanyName,
      completeInstallation,
      serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer, resetServerDatabase,
      resetToEmptyDatabase, loadDemoData, resetToSetupWizard,
      liteMode, setLiteMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
