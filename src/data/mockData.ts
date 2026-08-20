import { 
  Item, ItemGroup, Warehouse, InventoryBalance, BOM, Project, Operator, User, 
  StockInDoc, StockOutDoc, WarehouseTransfer, PurchaseRequest, ProductionLog, MaterialHandover,
  TraceabilityEvent, SystemNotification, AuditLog, Contractor, StockCountingSession 
} from '../types';

// =================================================================
//  Initial Tree Item Categories
// =================================================================

export const INITIAL_ITEM_GROUPS: ItemGroup[] = [
  { id: 'cat-elec', name: 'قطعات الکترونیک', subGroups: ['میکروکنترلر', 'دیود و ترانزیستور', 'مقاومت و خازن', 'سنسور'] },
  { id: 'cat-mech', name: 'قطعات مکانیکی و بدنه', subGroups: ['قالب و قاب پلاستیکی', 'پیچ و مهره و اتصالات', 'شاسی فلزی'] },
  { id: 'cat-pcb', name: 'برد و فیبر چاپی', subGroups: ['PCB چندلایه', 'PCB تک‌لایه', 'برد متالیزه'] },
  { id: 'cat-semi', name: 'مجموعه نیمه‌ساخته', subGroups: ['برد مونتاژ شده SMD', 'ماژول تست شده'] },
  { id: 'cat-finish', name: 'محصولات نهایی', subGroups: ['کنتور هوشمند', 'دستگاه کنترلر صنعتی', 'سنسور محیطی'] },
];

// =================================================================
//  Tree Multi-Warehouse Structure (انبار مرکزی، تولید، QC، محصول، پیمانکار)
// =================================================================

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-central',
    code: 'WH-CENTRAL',
    name: 'انبار مرکزی کارخانه',
    group: 'انبارهای اصلی',
    subGroup: 'انبار مادر',
    description: 'انبار مادر جهت دریافت، انبارش اولیه و تفکیک قطعات الکترونیک و مکانیکی',
    manager: 'مهندس رضایی',
    warehouseType: 'Central',
    location: 'سوله اصلی - ضلع شمالی',
  },
  {
    id: 'wh-raw',
    code: 'WH-101',
    parentId: 'wh-central',
    name: 'انبار قطعات الکترونیک و مواد اولیه',
    group: 'انبارهای اصلی',
    subGroup: 'قطعات الکترونیک و SMD',
    description: 'زیرمجموعه انبار مرکزی - قطعات SMD، DIP و ریزقطعات',
    manager: 'علی کاظمی',
    warehouseType: 'Central',
    location: 'سالن ۱ - طبقه همکف',
  },
  {
    id: 'wh-prod',
    code: 'WH-PROD',
    parentId: 'wh-central',
    name: 'انبار خط تولید (قفسه‌های پروژه‌ای)',
    group: 'انبارهای تولید',
    subGroup: 'قفسه‌های پروژه',
    description: 'انبار خط تولید با قفسه‌بندی تفکیک‌شده بر اساس شماره پروژه مشتری',
    manager: 'مهندس احمدی',
    warehouseType: 'Production',
    location: 'سالن تولید - سالن ۲',
  },
  {
    id: 'wh-prod-p101',
    code: 'WH-P101-RACK',
    parentId: 'wh-prod',
    name: 'قفسه پروژه PRJ-101 (کنتور هوشمند)',
    group: 'انبارهای تولید',
    subGroup: 'قفسه‌های اختصاصی',
    description: 'قفسه اختصاصی اقلام و قطعات در حال مونتاژ پروژه کنتور هوشمند برق',
    manager: 'اپراتور ارشد مونتاژ',
    warehouseType: 'Production',
    linkedProjectId: 'proj-101',
    location: 'سالن تولید - ردیف A قفسه ۱',
  },
  {
    id: 'wh-qc',
    code: 'WH-QC',
    parentId: 'wh-central',
    name: 'انبار قرنطینه و کنترل کیفیت (QC)',
    group: 'انبارهای تست و کنترل',
    subGroup: 'قرنطینه و تست',
    description: 'انبار تست، کالیبراسیون و بررسی کیفیت قطعات ورودی و نیمه‌ساخته‌ها',
    manager: 'مهندس حسینی (QC)',
    warehouseType: 'QC',
    isQuarantine: true,
    location: 'آزمایشگاه QC',
  },
  {
    id: 'wh-semi',
    code: 'WH-SEMI',
    parentId: 'wh-central',
    name: 'انبار قطعات نیمه‌ساخته',
    group: 'انبارهای تولید',
    subGroup: 'بردهای نیمه‌ساخته',
    description: 'انبار نگهداری بردهای مونتاژ شده SMD آماده تست و مونتاژ نهایی',
    manager: 'حسین محمدی',
    warehouseType: 'SemiFinished',
    location: 'سالن مونتاژ - بخش انبارک',
  },
  {
    id: 'wh-finished',
    code: 'WH-FINISHED',
    parentId: 'wh-central',
    name: 'انبار محصول نهایی',
    group: 'انبارهای محصول',
    subGroup: 'محصولات بسته‌بندی‌شده',
    description: 'انبار نگهداری محصولات نهایی تولید شده، بسته‌بندی شده و آماده ارسال',
    manager: 'سعید مرادی',
    warehouseType: 'FinishedGoods',
    isFinishedGoods: true,
    location: 'سالن خروجی - سوله ۴',
  },
  {
    id: 'wh-contractor',
    code: 'WH-CONT-01',
    parentId: 'wh-central',
    name: 'انبار پیمانکار مونتاژ SMD (برونسپاری)',
    group: 'انبارهای برونسپاری',
    subGroup: 'انبار امانی پیمانکار',
    description: 'انبار امانی قطعات تحویل داده شده به پیمانکار برونسپاری',
    manager: 'پیمانکار - شرکت الکترو مونتاژ',
    warehouseType: 'Contractor',
    location: 'کارگاه پیمانکار خارج از کارخانه',
  },
  {
    id: 'wh-scrap',
    code: 'WH-SCRAP',
    parentId: 'wh-central',
    name: 'انبار ضایعات و قطعات معیوب',
    group: 'انبارهای ضایعات',
    subGroup: 'ضایعات و سوخته',
    description: 'انبار تفکیک قطعات معیوب، سوخته و ضایعات خط تولید',
    manager: 'مسئول بازیافت',
    warehouseType: 'Scrap',
    isScrap: true,
    location: 'محوطه پشتی',
  },
];

// =================================================================
//  Initial Contractors List (پیمانکاران برونسپاری)
// =================================================================

export const INITIAL_CONTRACTORS: Contractor[] = [
  {
    id: 'cont-1',
    code: 'CONT-101',
    name: 'شرکت پارت مونتاژ الوند',
    contactPerson: 'مهندس کریمی',
    phone: '021-88997766',
    specialty: 'مونتاژ اتوماتیک SMD و Pick & Place',
    address: 'تهران - شهرک صنعتی شمس‌آباد - بلوار اصلی',
    activeContractsCount: 2,
  },
  {
    id: 'cont-2',
    code: 'CONT-102',
    name: 'کارگاه قالب‌سازی و تزریق پلاستیک دقیق',
    contactPerson: 'آقای شریفی',
    phone: '021-44556677',
    specialty: 'تزریق پلاستیک بدنه و قاب قطعات الکترونیکی',
    address: 'کرج - شهرک صنعتی سیمین دشت',
    activeContractsCount: 1,
  },
];

// =================================================================
//  Initial Items with Barcodes
// =================================================================

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-pcb-101',
    code: 'E-PCB-001',
    name: 'برد مدار چاپی خام کنتور هوشمند FR4 4-Layer',
    group: 'برد و فیبر چاپی',
    subGroup: 'PCB چندلایه',
    unit: 'عدد',
    barcode: '6260010001015',
    description: 'برد ۴ لایه متالیزه فینیش طلایی HASL Lead-Free',
    minStock: 200,
    maxStock: 5000,
    itemType: 'RawMaterial',
    unitPrice: 185000,
    locationInRack: 'A-12-03',
    createdAt: '2026-01-10',
  },
  {
    id: 'item-mcu-stm32',
    code: 'E-IC-032',
    name: 'میکروکنترلر STM32F103C8T6 LQFP-48',
    group: 'قطعات الکترونیک',
    subGroup: 'میکروکنترلر',
    unit: 'عدد',
    barcode: '6260010002012',
    description: '32-bit ARM Cortex-M3 72MHz 64KB Flash SMD',
    minStock: 150,
    maxStock: 3000,
    itemType: 'Component',
    unitPrice: 125000,
    locationInRack: 'B-04-10',
    createdAt: '2026-01-12',
  },
  {
    id: 'item-case-101',
    code: 'M-CASE-01',
    name: 'قاب پلاستیکی ABS نسوز کنتور',
    group: 'قطعات مکانیکی و بدنه',
    subGroup: 'قالب و قاب پلاستیکی',
    unit: 'عدد',
    barcode: '6260010003019',
    description: 'قاب پلاستیکی تزریقی با استاندارد IP54',
    minStock: 100,
    maxStock: 2000,
    itemType: 'RawMaterial',
    unitPrice: 95000,
    locationInRack: 'C-01-05',
    createdAt: '2026-01-15',
  },
  {
    id: 'item-smd-board',
    code: 'S-BRD-101',
    name: 'برد مونتاژ شده SMD کنتور (نیمه‌ساخته)',
    group: 'مجموعه نیمه‌ساخته',
    subGroup: 'برد مونتاژ شده SMD',
    unit: 'عدد',
    barcode: '6260010004016',
    description: 'برد مونتاژ شده قطعات الکترونیکی آماده تست',
    minStock: 50,
    maxStock: 1000,
    itemType: 'SemiFinished',
    unitPrice: 480000,
    locationInRack: 'WH-SEMI-01',
    createdAt: '2026-01-20',
  },
  {
    id: 'item-meter-final',
    code: 'F-MTR-100',
    name: 'دستگاه کنتور هوشمند برق تک‌فاز (محصول نهایی)',
    group: 'محصولات نهایی',
    subGroup: 'کنتور هوشمند',
    unit: 'دستگاه',
    barcode: '6260010005013',
    description: 'محصول نهایی تست شده، کالیبره شده و بسته‌بندی شده',
    minStock: 30,
    maxStock: 500,
    itemType: 'Finished',
    unitPrice: 1250000,
    locationInRack: 'WH-FIN-RACK1',
    createdAt: '2026-01-25',
  },
];

export const INITIAL_INVENTORY: InventoryBalance[] = [
  { warehouseId: 'wh-raw', itemId: 'item-pcb-101', quantity: 1200, reservedQuantity: 200, lastUpdated: '2026-02-01' },
  { warehouseId: 'wh-raw', itemId: 'item-mcu-stm32', quantity: 850, reservedQuantity: 150, lastUpdated: '2026-02-01' },
  { warehouseId: 'wh-raw', itemId: 'item-case-101', quantity: 600, reservedQuantity: 100, lastUpdated: '2026-02-01' },
  { warehouseId: 'wh-prod-p101', itemId: 'item-pcb-101', quantity: 150, reservedQuantity: 0, lastUpdated: '2026-02-02' },
  { warehouseId: 'wh-prod-p101', itemId: 'item-mcu-stm32', quantity: 150, reservedQuantity: 0, lastUpdated: '2026-02-02' },
  { warehouseId: 'wh-semi', itemId: 'item-smd-board', quantity: 80, reservedQuantity: 0, lastUpdated: '2026-02-03' },
  { warehouseId: 'wh-finished', itemId: 'item-meter-final', quantity: 45, reservedQuantity: 0, lastUpdated: '2026-02-03' },
];

export const INITIAL_BOMS: BOM[] = [
  {
    id: 'bom-101',
    finishedItemId: 'item-meter-final',
    name: 'فرمول ساخت کنتور هوشمند تک‌فاز v2.1',
    version: '2.1',
    isActive: true,
    description: 'شامل برد نیمه‌ساخته، قاب پلاستیکی و پیچ‌ها',
    createdAt: '2026-01-20',
    items: [
      { itemId: 'item-smd-board', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2 },
      { itemId: 'item-case-101', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1 },
    ],
  },
  {
    id: 'bom-smd-101',
    finishedItemId: 'item-smd-board',
    name: 'فرمول مونتاژ برد SMD کنتور v1.0',
    version: '1.0',
    isActive: true,
    description: 'شامل PCB خام و میکروکنترلر STM32',
    createdAt: '2026-01-18',
    items: [
      { itemId: 'item-pcb-101', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 3 },
      { itemId: 'item-mcu-stm32', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2 },
    ],
  }
];

// =================================================================
//  Tree Projects with Hierarchical Sub-Steps (مراحل شاخه درختی پروژه)
// =================================================================

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-101',
    code: 'PRJ-101',
    name: 'تولید ۵۰۰ دستگاه کنتور هوشمند سفارشی شرکت توانیر',
    client: 'شرکت توزیع نیروی برق تهران',
    startDate: '2026-01-15',
    endDate: '2026-03-30',
    status: 'Active',
    progressPercent: 45,
    projectManager: 'مهندس رضایی',
    targetFinishedItemId: 'item-meter-final',
    targetQuantity: 500,
    producedQuantity: 120,
    description: 'پروژه سفارش ساخت قطعات الکترونیکی و مکانیکی کنتور برق هوشمند',
    steps: [
      {
        id: 'stg-1',
        stepNumber: 1,
        stepCode: '1',
        name: 'آماده‌سازی مواد اولیه و تامین قطعات',
        description: 'تحویل قطعات الکترونیک و مکانیکی از انبار مرکزی به انبار خط تولید',
        status: 'Completed',
        assignedOperators: ['انباردار اصلی'],
        completedQuantity: 500,
        completedDate: '2026-01-20',
        children: [
          {
            id: 'stg-1-1',
            stepNumber: 1,
            stepCode: '1.1',
            parentId: 'stg-1',
            name: 'کنترل کیفیت QC ورودی قطعات PCB و MCU',
            description: 'تست نمونه‌ای قطعات در انبار QC',
            status: 'Completed',
            assignedOperators: ['مهندس حسینی (QC)'],
            completedDate: '2026-01-18'
          },
          {
            id: 'stg-1-2',
            stepNumber: 2,
            stepCode: '1.2',
            parentId: 'stg-1',
            name: 'انتقال قطعات به انبار اختصاصی پروژه (قفسه PRJ-101)',
            description: 'حواله انتقال به انبار تولید قفسه PRJ-101',
            status: 'Completed',
            assignedOperators: ['انباردار خط تولید'],
            completedDate: '2026-01-20'
          }
        ]
      },
      {
        id: 'stg-2',
        stepNumber: 2,
        stepCode: '2',
        name: 'مونتاژ برد الکترونیکی (برونسپاری به پیمانکار)',
        description: 'ارسال PCB و قطعات SMD به پیمانکار جهت چاپ خمیر قلع و Pick & Place',
        status: 'InProgress',
        assignedOperators: ['پیمانکار الوند'],
        isOutsourced: true,
        contractorName: 'شرکت پارت مونتاژ الوند',
        contractorCost: 45000000,
        children: [
          {
            id: 'stg-2-1',
            stepNumber: 1,
            stepCode: '2.1',
            parentId: 'stg-2',
            name: 'چاپ خمیر قلع و مونتاژ SMD قطعات',
            status: 'Completed',
            assignedOperators: ['پیمانکار الوند'],
            isOutsourced: true,
            contractorName: 'شرکت پارت مونتاژ الوند',
            completedDate: '2026-01-28'
          },
          {
            id: 'stg-2-2',
            stepNumber: 2,
            stepCode: '2.2',
            parentId: 'stg-2',
            name: 'لحیم‌کاری ریفلو (Reflow Oven) و بازرسی AOI',
            status: 'InProgress',
            assignedOperators: ['پیمانکار الوند'],
            isOutsourced: true,
            contractorName: 'شرکت پارت مونتاژ الوند'
          },
          {
            id: 'stg-2-3',
            stepNumber: 3,
            stepCode: '2.3',
            parentId: 'stg-2',
            name: 'دریافت بردهای مونتاژ شده و تحویل به انبار نیمه‌ساخته',
            status: 'Pending',
            assignedOperators: ['انباردار نیمه‌ساخته']
          }
        ]
      },
      {
        id: 'stg-3',
        stepNumber: 3,
        stepCode: '3',
        name: 'تست عملکردی و کالیبراسیون برد',
        description: 'تست ولتاژ، برنامه‌ریزی میکروکنترلر و کالیبراسیون سنسورها',
        status: 'Pending',
        assignedOperators: ['تکنیسین تست'],
        children: [
          {
            id: 'stg-3-1',
            stepNumber: 1,
            stepCode: '3.1',
            parentId: 'stg-3',
            name: 'پروگرم کردن فریمور فابریك بر روی MCU',
            status: 'Pending',
            assignedOperators: ['تکنیسین نرم‌افزار']
          },
          {
            id: 'stg-3-2',
            stepNumber: 2,
            stepCode: '3.2',
            parentId: 'stg-3',
            name: 'تست دقیق خطای اندازه‌گیری جریان و ولتاژ',
            status: 'Pending',
            assignedOperators: ['اپراتور کالیبراسیون']
          }
        ]
      },
      {
        id: 'stg-4',
        stepNumber: 4,
        stepCode: '4',
        name: 'مونتاژ مکانیکی، بسته‌بندی و تحویل به انبار محصول',
        description: 'قرار دادن برد در قاب ABS، پیچ‌کاری، لیبل‌زنی بارکد و بسته‌بندی نهایی',
        status: 'Pending',
        assignedOperators: ['اپراتور مونتاژ مکانیکی']
      }
    ]
  }
];

export const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op-1',
    code: 'OP-101',
    name: 'علی محمدی',
    shift: 'Morning',
    role: 'اپراتور ارشد خط مونتاژ',
    activeProjects: ['proj-101'],
    totalProducedPieces: 350,
    totalWorkingHours: 160,
    status: 'Active',
  },
  {
    id: 'op-2',
    code: 'OP-102',
    name: 'رضا قاسمی',
    shift: 'Evening',
    role: 'تکنیسین تست و کالیبراسیون',
    activeProjects: ['proj-101'],
    totalProducedPieces: 210,
    totalWorkingHours: 140,
    status: 'Active',
  },
];

export const INITIAL_USERS: User[] = [
  { 
    id: 'usr-1', 
    username: 'admin', 
    password: 'admin', 
    fullName: 'مدیر کل ارشد سیستم', 
    role: 'SystemAdmin', 
    department: 'مدیریت ارشد کارخانه', 
    email: 'admin@anbarmeh.ir',
    allowedTabs: ['*'],
    isActive: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canExport: true
  },
  { 
    id: 'usr-2', 
    username: 'plant_manager', 
    password: '123', 
    fullName: 'مهندس حسینی (مدیر تولید)', 
    role: 'PlantManager', 
    department: 'مدیریت تولید و کنترل پروژه', 
    email: 'plant@anbarmeh.ir',
    allowedTabs: ['dashboard', 'projects', 'bom', 'operator_logger', 'operator_perf', 'traceability', 'reports'],
    isActive: true,
    canAdd: true,
    canEdit: true,
    canDelete: false,
    canExport: true
  },
  { 
    id: 'usr-3', 
    username: 'storekeeper', 
    password: '123', 
    fullName: 'علی کاظمی (مدیر انبار مرکزی)', 
    role: 'WarehouseManager', 
    department: 'انبارداری و لجستیک', 
    email: 'warehouse@anbarmeh.ir',
    allowedTabs: ['dashboard', 'items', 'warehouses', 'stock_movement', 'transfers', 'requests', 'reports'],
    isActive: true,
    canAdd: true,
    canEdit: true,
    canDelete: false,
    canExport: true
  },
  { 
    id: 'usr-4', 
    username: 'operator', 
    password: '123', 
    fullName: 'رضا قاسمی (اپراتور خط مونتاژ)', 
    role: 'Operator', 
    department: 'سالن مونتاژ SMD', 
    email: 'operator@anbarmeh.ir',
    allowedTabs: ['operator_logger', 'projects'],
    isActive: true,
    canAdd: true,
    canEdit: false,
    canDelete: false,
    canExport: false
  },
];

// Initial Stock Counting Sessions (دوره‌های انبارگردانی)
export const INITIAL_STOCK_COUNTINGS: StockCountingSession[] = [
  {
    id: 'sc-2026-01',
    sessionNumber: 'AUD-1404-01',
    title: 'انبارگردانی پایان سه ماهه اول انبار مرکزی',
    warehouseId: 'wh-raw',
    warehouseName: 'انبار قطعات الکترونیک و مواد اولیه',
    startDate: '2026-02-01',
    status: 'AppliedAdjustments',
    registeredBy: 'مدیر سیستم',
    notes: 'انبارگردانی دوره ای قطعات SMD و فیبر مدار چاپی با دستگاه بارکدخوان',
    createdAt: '2026-02-01',
    items: [
      {
        itemId: 'item-pcb-101',
        itemCode: 'E-PCB-001',
        itemName: 'برد مدار چاپی خام کنتور هوشمند FR4 4-Layer',
        barcode: '6260010001015',
        unit: 'عدد',
        locationInRack: 'A-12-03',
        systemQuantity: 1205,
        physicalQuantity: 1200,
        variance: -5,
        notes: 'کسری ۵ عددی به دلیل ضایعات مونتاژ آزمایشگاهی',
        countedBy: 'علی کاظمی',
        countedAt: '2026-02-01 10:30'
      },
      {
        itemId: 'item-mcu-stm32',
        itemCode: 'E-IC-032',
        itemName: 'میکروکنترلر STM32F103C8T6 LQFP-48',
        barcode: '6260010002012',
        unit: 'عدد',
        locationInRack: 'B-04-10',
        systemQuantity: 850,
        physicalQuantity: 850,
        variance: 0,
        notes: 'تطابق کامل موجودی فیزیکی و سیستمی',
        countedBy: 'علی کاظمی',
        countedAt: '2026-02-01 11:15'
      }
    ]
  }
];

export const INITIAL_STOCK_IN_DOCS: StockInDoc[] = [];
export const INITIAL_STOCK_OUT_DOCS: StockOutDoc[] = [];
export const INITIAL_TRANSFERS: WarehouseTransfer[] = [
  {
    id: 'tr-101',
    docNumber: 'REQ-1404-091',
    date: '1404/11/20',
    sourceWarehouseId: 'wh-raw',
    targetWarehouseId: 'wh-prod-p101',
    projectId: 'p101',
    projectName: 'پروژه کنتور هوشمند برق سه فاز (PRJ-101)',
    requestedBy: 'مهندس رضایی (آنالیز پروژه و برنامه‌ریزی)',
    requestDate: '1404/11/20',
    handlerName: 'حسن نوری (راننده و مسئول لجستیک داخلی)',
    driverPhone: '09123456789',
    vehicleNumber: 'ایران ۱۱ - ۱۲۳ ب ۴۵',
    status: 'Pending',
    items: [
      { itemId: 'item-pcb-101', quantity: 100, unitPrice: 35000, notes: 'برد مدار چاپی خام گرید A' },
      { itemId: 'item-mcu-stm32', quantity: 100, unitPrice: 145000, notes: 'میکروکنترلر اصلی پکیج LQFP-48' },
      { itemId: 'item-smd-res-10k', quantity: 1200, unitPrice: 450, notes: 'رول مقاومت 0805' },
    ],
    notes: 'درخواست تامین متریال بر اساس آنالیز BOM مرحله اول مونتاژ کنتور هوشمند - در انتظار تایید انبار مرکزی',
    createdAt: '2026-02-09T10:00:00Z'
  },
  {
    id: 'tr-102',
    docNumber: 'TRF-1404-082',
    date: '1404/11/18',
    sourceWarehouseId: 'wh-raw',
    targetWarehouseId: 'wh-semi',
    projectId: 'p101',
    projectName: 'پروژه کنتور هوشمند برق سه فاز (PRJ-101)',
    requestedBy: 'مهندس رضایی (آنالیز پروژه)',
    requestDate: '1404/11/17',
    dispatchedBy: 'علی کاظمی (انباردار مرکزی)',
    dispatchDate: '1404/11/18',
    handlerName: 'حسین احمدی (وانت حمل قطعات)',
    driverPhone: '09198765432',
    vehicleNumber: 'ایران ۶۶ - ۷۸۹ ج ۱۲',
    status: 'InTransit',
    items: [
      { itemId: 'item-mcu-stm32', quantity: 50, unitPrice: 145000, pickedQuantity: 50, notes: 'بسته‌بندی آنتی‌استاتیک' },
      { itemId: 'item-pcb-101', quantity: 50, unitPrice: 35000, pickedQuantity: 50, notes: 'پالت محافظ' },
    ],
    notes: 'حواله خروج انبار مرکزی صادر شده و در حال حمل به انبار قطعات نیمه‌ساخته است',
    createdAt: '2026-02-07T08:30:00Z'
  },
  {
    id: 'tr-103',
    docNumber: 'TRF-1404-075',
    date: '1404/11/15',
    sourceWarehouseId: 'wh-raw',
    targetWarehouseId: 'wh-contractor',
    projectId: 'p101',
    projectName: 'پروژه کنتور هوشمند برق سه فاز (PRJ-101)',
    requestedBy: 'مهندس رضایی',
    requestDate: '1404/11/14',
    dispatchedBy: 'علی کاظمی (انباردار مرکزی)',
    dispatchDate: '1404/11/15',
    receivedBy: 'پیمانکار - شرکت الکترو مونتاژ',
    receiveDate: '1404/11/15',
    handlerName: 'سروش اکبری (پیک ویژه قطعات)',
    driverPhone: '09351234567',
    vehicleNumber: 'ایران ۴۴ - ۵۵۵ د ۷۷',
    status: 'Completed',
    items: [
      { itemId: 'item-smd-res-10k', quantity: 2000, unitPrice: 450, pickedQuantity: 2000, receivedQuantity: 2000, checked: true },
      { itemId: 'item-pcb-101', quantity: 80, unitPrice: 35000, pickedQuantity: 80, receivedQuantity: 80, checked: true },
    ],
    notes: 'تحویل امانی به پیمانکار برونسپاری SMD - تحویل قطعی گردید',
    createdAt: '2026-02-04T14:15:00Z'
  }
];
export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [];
export const INITIAL_PRODUCTION_LOGS: ProductionLog[] = [];
export const INITIAL_MATERIAL_HANDOVERS: MaterialHandover[] = [
  {
    id: 'hnd-2026-01',
    docNumber: 'HND-1404-01',
    shiftSupervisor: 'مهندس رضایی (سرشیفت سالن ۱)',
    salonName: 'سالن ۱ - مونتاژ الکترونیک',
    operatorId: 'op-1',
    operatorName: 'علی کاظمی',
    projectId: 'p101',
    stepId: 'step-init-2',
    machineCode: 'SMD-LINE-01',
    date: '1404/11/15',
    startTime: '08:00',
    sourceWarehouseId: 'wh-raw',
    items: [
      { itemId: 'item-pcb-101', itemCode: 'E-PCB-001', itemName: 'برد مدار چاپی خام کنتور هوشمند', unit: 'عدد', quantity: 50 },
      { itemId: 'item-mcu-stm32', itemCode: 'E-IC-032', itemName: 'میکروکنترلر STM32F103C8T6', unit: 'عدد', quantity: 50 },
      { itemId: 'item-smd-res-10k', itemCode: 'E-RES-10K', itemName: 'مقاومت ۱۰ کیلو اهم 0805 SMD', unit: 'عدد', quantity: 600 }
    ],
    notes: 'تحویل اولیه قطعات جهت مونتاژ سری ۵۰ عددی برد کنتور',
    createdAt: '2026-02-04'
  }
];
export const INITIAL_NOTIFICATIONS: SystemNotification[] = [];
export const INITIAL_TRACEABILITY: TraceabilityEvent[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

