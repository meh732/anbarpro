import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../utils/translations';
import { 
  Item, ItemGroup, Warehouse, InventoryBalance, BOM, Project, ProjectStep, Operator, User, UserRole,
  StockInDoc, StockOutDoc, WarehouseTransfer, PurchaseRequest, ProductionLog, MaterialHandover,
  TraceabilityEvent, SystemNotification, AuditLog, Contractor, StockCountingSession, StockCountingItem 
} from '../types';
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
  
  addBOM: (bom: Omit<BOM, 'id' | 'createdAt'>) => void;
  updateBOM: (id: string, updated: Partial<BOM>) => void;
  
  addProject: (proj: Omit<Project, 'id'>) => void;
  updateProjectStep: (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => void;
  addProjectSubStep: (projectId: string, parentStepId: string, step: Omit<ProjectStep, 'id'>) => void;

  // Stock Counting / Inventory Audit
  createStockCountingSession: (session: Omit<StockCountingSession, 'id' | 'createdAt'>) => void;
  updateStockCountItem: (sessionId: string, itemId: string, physicalQty: number, notes?: string, firstCount?: number, secondCount?: number, finalCount?: number) => void;
  applyStockCountingAdjustments: (sessionId: string) => void;
  
  // Core Inventory & Production Operations
  createStockInDoc: (doc: Omit<StockInDoc, 'id' | 'createdAt'>) => void;
  createStockOutDoc: (doc: Omit<StockOutDoc, 'id' | 'createdAt'>) => void;
  createTransfer: (transfer: Omit<WarehouseTransfer, 'id' | 'createdAt'>) => void;
  updateTransferStatus: (id: string, status: 'InTransit' | 'Completed' | 'Rejected') => void;
  createPurchaseRequest: (req: Omit<PurchaseRequest, 'id' | 'createdAt'>) => void;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequest['status']) => void;
  
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

  // Save changes to localStorage
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

  // Project Management
  const addProject = (projData: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...projData,
      id: `proj-${Date.now()}`,
    };
    setProjects(prev => [newProj, ...prev]);
    addAudit('ایجاد پروژه جدید', 'Project', newProj.code, `تعریف پروژه ${newProj.name}`);
  };

  const updateProjectStep = (projectId: string, stepId: string, status: 'Pending' | 'InProgress' | 'Completed') => {
    const updateStepStatusRecursively = (steps: ProjectStep[], targetStepId: string, newStatus: 'Pending' | 'InProgress' | 'Completed'): ProjectStep[] => {
      return steps.map(s => {
        if (s.id === targetStepId) {
          return { ...s, status: newStatus };
        }
        if (s.subSteps && s.subSteps.length > 0) {
          return { ...s, subSteps: updateStepStatusRecursively(s.subSteps, targetStepId, newStatus) };
        }
        return s;
      });
    };

    const countStepsAndCompleted = (steps: ProjectStep[]): { total: number; completed: number } => {
      let total = 0;
      let completed = 0;
      steps.forEach(s => {
        total += 1;
        if (s.status === 'Completed') completed += 1;
        if (s.subSteps && s.subSteps.length > 0) {
          const subRes = countStepsAndCompleted(s.subSteps);
          total += subRes.total;
          completed += subRes.completed;
        }
      });
      return { total, completed };
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const updatedSteps = updateStepStatusRecursively(p.steps, stepId, status);
      const { total, completed } = countStepsAndCompleted(updatedSteps);
      const calcProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const newProjStatus = calcProgress === 100 ? 'Completed' : p.status;
      return {
        ...p,
        steps: updatedSteps,
        progressPercent: calcProgress,
        status: newProjStatus,
      };
    }));
    addAudit('تغییر وضعیت مرحله پروژه', 'ProjectStep', stepId, `تغییر وضعیت مرحله به ${status}`);
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
          performedBy: transferData.registeredBy,
        };
        setTraceabilityEvents(t => [trace, ...t]);
      });
    }

    addAudit('ثبت انتقال بین انبارها', 'WarehouseTransfer', newTransfer.docNumber, `انتقال از ${transferData.sourceWarehouseId} به ${transferData.targetWarehouseId}`);
  };

  const updateTransferStatus = (id: string, status: 'InTransit' | 'Completed' | 'Rejected') => {
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

  const updatePurchaseRequestStatus = (id: string, status: PurchaseRequest['status']) => {
    setPurchaseRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    addAudit('بررسی درخواست کالا', 'PurchaseRequest', id, `وضعیت به ${status} به‌روزرسانی شد`);
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

    // Update Project Progress & Output
    setProjects(prev => prev.map(p => {
      if (p.id === data.projectId) {
        const newProduced = p.producedQuantity + data.quantityProduced;
        const calcProgress = Math.min(100, Math.round((newProduced / p.targetQuantity) * 100));
        return {
          ...p,
          producedQuantity: newProduced,
          progressPercent: calcProgress,
          status: calcProgress === 100 ? 'Completed' : p.status,
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
      addMaterialHandover,
      addItem, updateItem, deleteItem,
      addItemGroup, updateItemGroup, deleteItemGroup,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addContractor, updateContractor,
      addBOM, updateBOM,
      addProject, updateProjectStep, addProjectSubStep,
      createStockCountingSession, updateStockCountItem, applyStockCountingAdjustments,
      createStockInDoc, createStockOutDoc, createTransfer, updateTransferStatus,
      createPurchaseRequest, updatePurchaseRequestStatus,
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
      completeInstallation
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
