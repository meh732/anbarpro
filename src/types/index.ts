// Types for ElectroStock Core - Electronic Components Warehouse & Production Management

export type ItemType = 
  | 'RawMaterial'   // مواد اولیه
  | 'Component'     // قطعه
  | 'SemiFinished'  // نیمه ساخته
  | 'Finished'      // محصول نهایی
  | 'Tool'          // ابزار
  | 'Consumable';   // مصرفی

export interface Item {
  id: string;
  code: string;
  name: string;
  group: string;
  subGroup: string;
  unit: string; // e.g. عدد, متر, گرم, رول, پک
  barcode: string;
  description: string;
  minStock: number;
  maxStock: number;
  itemType: ItemType;
  unitPrice: number; // قیمت واحد به تومان
  locationInRack?: string; // قفسه و ردیف
  imageUrl?: string;
  createdAt: string;
}

export interface ItemGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parentId?: string; // برای ساختار شاخه درختی گروه‌بندی کالاها
  subGroups: string[];
}

export type WarehouseType = 
  | 'Central'        // انبار مرکزی
  | 'Production'     // انبار تولید (قفسه‌ها = پروژه‌ها)
  | 'SemiFinished'   // انبار نیمه ساخته
  | 'FinishedGoods'  // انبار محصول نهایی
  | 'QC'             // انبار کنترل کیفیت (QC)
  | 'Contractor'     // انبار تحویل به پیمانکار
  | 'Scrap';         // انبار ضایعات

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  group?: string; // گروه انبار (مثلاً انبار‌های مرکزی، انبار‌های تولید، انبار‌های ضایعات)
  subGroup?: string; // زیرگروه انبار (مثلاً قطعات SMD، قطعات DIP، ملزومات بسته‌بندی)
  description: string;
  manager: string;
  parentId?: string; // شناسه انبار مادر برای ساختار درختی
  warehouseType?: WarehouseType;
  linkedProjectId?: string; // ارتباط قفسه یا بخش انبار با پروژه مشتری
  isQuarantine?: boolean;
  isScrap?: boolean;
  isFinishedGoods?: boolean;
  location: string;
}

export interface InventoryBalance {
  warehouseId: string;
  itemId: string;
  quantity: number;
  reservedQuantity: number;
  lastUpdated: string;
}

export type StockInType = 'Purchase' | 'ProductionReturn' | 'CustomerReturn' | 'TransferIn' | 'StockAdjustment';

export interface StockInDoc {
  id: string;
  docNumber: string;
  date: string;
  supplier: string;
  registeredBy: string;
  warehouseId: string;
  entryType: StockInType;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
  notes?: string;
  status: 'Draft' | 'Confirmed';
  attachments?: string[];
  createdAt: string;
}

export type StockOutType = 'ProjectConsumption' | 'TransferOut' | 'Sale' | 'Scrap' | 'StockAdjustment';

export interface StockOutDoc {
  id: string;
  docNumber: string;
  date: string;
  recipient: string;
  registeredBy: string;
  warehouseId: string;
  exitType: StockOutType;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
  notes?: string;
  status: 'Draft' | 'Confirmed';
  attachments?: string[];
  createdAt: string;
}

export type TransferStatus = 'Pending' | 'InTransit' | 'Completed' | 'Rejected';

export interface WarehouseTransferItem {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  pickedQuantity?: number;
  receivedQuantity?: number;
  checked?: boolean;
  notes?: string;
}

export interface WarehouseTransfer {
  id: string;
  docNumber: string; // شماره حواله / درخواست
  date: string;
  sourceWarehouseId: string; // انبار مبدا (مثلاً انبار مرکزی)
  targetWarehouseId: string; // انبار مقصد (مثلاً انبار پروژه / فرعی)
  projectId?: string; // شناسه پروژه مربوطه
  projectName?: string; // نام پروژه
  requestedBy: string; // ثبت‌کننده درخواست (مسئول آنالیز پروژه)
  requestDate?: string;
  dispatchedBy?: string; // تاییدکننده و انباردار مرکزی
  dispatchDate?: string;
  receivedBy?: string; // تحویل‌گیرنده در انبار مقصد/پروژه
  receiveDate?: string;
  handlerName: string; // راننده / مسئول حمل
  driverPhone?: string;
  vehicleNumber?: string;
  status: TransferStatus;
  items: WarehouseTransferItem[];
  notes?: string;
  rejectReason?: string;
  createdAt: string;
}

export type PurchaseRequestStatus = 'Pending' | 'Approved_InStock' | 'Purchase_Needed' | 'Manufacturing_Needed' | 'Fulfilled' | 'Rejected';

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  date: string;
  requestingUnit: string;
  requesterName: string;
  items: {
    itemId: string;
    quantity: number;
    reason: string;
  }[];
  status: PurchaseRequestStatus;
  urgency: 'Normal' | 'High' | 'Immediate';
  notes?: string;
  createdAt: string;
}

export type ProjectStatus = 'Planning' | 'Active' | 'Paused' | 'Testing' | 'Completed' | 'Cancelled';

export interface ProjectStep {
  id: string;
  stepNumber: number;
  stepCode?: string; // e.g. "1", "1.1", "1.1.1" برای نمایش کد مرحله شاخه درختی
  parentId?: string; // شناسه مرحله مادر برای ساختار شاخه درختی
  name: string; // e.g. مونتاژ برد, لحیم‌کاری SMD, تست نهایی, بسته‌بندی, تحویل
  title?: string;
  description?: string;
  status: 'Pending' | 'InProgress' | 'Completed';
  assignedOperators: string[]; // names or IDs
  isOutsourced?: boolean; // آیا به پیمانکار برونسپاری شده؟
  contractorName?: string; // نام پیمانکار
  contractorId?: string;
  contractorCost?: number; // هزینه پیمانکاری
  outsourcingCost?: number;
  outputItemId?: string; // کد یا شناسه کالای نیمه‌ساخته خروجی این مرحله
  outputQuantity?: number; // تعداد تولید شده نیمه‌ساخته
  targetQuantity?: number; // تیراژ هدف تعیین شده برای این مرحله
  scrapAllowancePercent?: number; // درصد ضایعات پیش‌بینی شده مختص این مرحله
  targetWarehouseId?: string; // انبار مقصد پس از اتمام این مرحله
  completedQuantity?: number;
  scrapQuantity?: number;
  progressPercent?: number;
  completedDate?: string;
  lastHandoverDate?: string;
  lastHandoverOperator?: string;
  lastHandoverDocNumber?: string;
  bomItems?: BOMItem[]; // اقلام و قطعات مصرفی فرمول ساخت مختص این مرحله
  subSteps?: ProjectStep[];
  children?: ProjectStep[];
}

export interface StockCountingItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  barcode: string;
  unit: string;
  locationInRack?: string;
  systemQuantity: number;  // موجودی سیستمی
  physicalQuantity: number; // موجودی واقعی شمارش شده (که معمولا برابر finalCount است)
  firstCount?: number;      // شمارش اول (تیم الف)
  secondCount?: number;     // شمارش دوم (تیم ب)
  thirdCount?: number;      // شمارش سوم / داوری نهایی
  finalCount?: number;      // شمارش مبنای نهایی
  variance: number;         // مغایرت (موجودی واقعی - سیستمی)
  difference?: number;      // مغایرت
  tagNumber?: string;       // شماره تگ الصاقی پالت/قفسه
  unitPrice?: number;       // نرخ ریالی واحد کالا جهت محاسبه ریالی مغایرت
  notes?: string;
  countedBy?: string;
  countedAt?: string;
}

export interface StockCountingSession {
  id: string;
  sessionNumber: string;
  title: string;
  warehouseId: string;
  warehouseName: string;
  startDate: string;
  endDate?: string;
  status: 'InPlanning' | 'InCounting' | 'PendingReview' | 'AppliedAdjustments' | 'Applied' | 'Closed';
  registeredBy: string;
  notes?: string;
  items: StockCountingItem[];
  createdAt: string;
  filterType?: 'All' | 'Group' | 'Project' | 'Location';
  filterValue?: string;
  countingStage?: 1 | 2 | 3;
  isBlindCount?: boolean;   // شمارش کور بدون نمایش موجودی سیستم برای شمارشگران
  committeeMembers?: { name: string; role: string; signed?: boolean; signedAt?: string }[];
  surplusDocNumber?: string;
  deficitDocNumber?: string;
}

export interface ContractorWageContract {
  id: string;
  contractorId: string;
  projectId?: string;
  stepId?: string;
  contractNumber: string;
  title: string;
  calculationType: 'PerPiece' | 'Fixed' | 'Batch'; // فی به ازای هر قطعه تولید شده | مبلغ ثابت مرحله | هر بچ
  wagePerUnit: number; // نرخ کارمزد به ازای هر عدد سالم به ریال
  scrapPenaltyPerUnit?: number; // جریمه به ازای هر قطعه ضایعات ریال
  agreedQuantity?: number; // تیراژ قرارداد
  status: 'Active' | 'Completed' | 'Suspended';
  startDate: string;
  endDate?: string;
  notes?: string;
}

export type ContractorTransactionType = 
  | 'WagePayable'    // بستانکار شدن پیمانکار بابت تولید و کارمزد قطعات سالم (بستانکار)
  | 'Payment'        // پرداخت وجه به پیمانکار (بدهکار شدن پیمانکار / نقدی، چک، واریز)
  | 'Prepayment'     // پیش‌پرداخت به پیمانکار (بدهکار)
  | 'ScrapPenalty'   // جریمه و کسر ضایعات غیرمجاز (بدهکار)
  | 'TaxDeduction'   // کسر بیمه و مالیات تکلیفی و ماده ۳۸ (بدهکار)
  | 'DepositDeduction' // کسر سپرده حسن انجام کار (بدهکار)
  | 'InitialBalance' // مانده اولیه دفتری حساب پیمانکار
  | 'Adjustment';    // تعدیل و اصلاحیه حسابداری

export interface ContractorFinancialTransaction {
  id: string;
  docNumber: string; // شماره سند حسابداری / رسید
  date: string;
  contractorId: string;
  contractId?: string;
  projectId?: string;
  stepId?: string;
  type: ContractorTransactionType;
  description: string;
  
  // جزئیات کارمزد تولیدی
  productionQuantity?: number; // تعداد تولید شده سالم
  scrapQuantity?: number; // تعداد ضایعات
  unitWage?: number; // نرخ کارمزد واحد
  
  // مبالغ مالی بر اساس اصول دوبل حسابداری
  debit: number;   // بدهکار (پرداخت‌ها، پیش‌پرداخت، کسورات و جریمه‌ها)
  credit: number;  // بستانکار (کارمزد استحقاقی بر اساس تیراژ تولید)
  
  paymentMethod?: 'BankTransfer' | 'Cheque' | 'Cash' | 'PettyCash';
  trackingNumber?: string; // شماره پیگیری / شماره چک
  registeredBy: string;
  attachments?: string[];
  notes?: string;
  createdAt: string;
}

export interface Contractor {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  specialty: string; // e.g. مونتاژ SMD, آبکاری, قالب‌سازی, تولید PCB
  address: string;
  activeContractsCount: number;
  bankAccountInfo?: string; // شماره شبا / کارت / حساب
  nationalId?: string; // شناسه ملی / کد اقتصادی
  initialBalance?: number; // مانده حساب اولیه (مثبت: بستانکار ما، منفی: بدهکار)
  defaultUnitWage?: number; // نرخ کارمزد پیش‌فرض هر قطعه
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progressPercent: number;
  projectManager: string;
  targetFinishedItemId: string;
  targetQuantity: number;
  producedQuantity: number;
  scrapAllowancePercent?: number; // درصد ضایعات پیش‌بینی شده کل پروژه
  steps: ProjectStep[];
  description?: string;
}

export interface BOMItem {
  itemId: string;
  quantityNeeded: number; // per 1 finished item
  unit: string;
  scrapAllowancePercent?: number; // درصد ضایعات پیش‌بینی شده
}

export interface BOM {
  id: string;
  finishedItemId: string; // کالای نهایی یا نیمه‌ساخته
  name: string;
  version: string; // e.g. v1.2
  items: BOMItem[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  projectId?: string; // شناسه پروژه مربوطه
  projectStepId?: string; // شناسه مرحله پروژه تخصیص‌یافته
}

export interface MaterialHandover {
  id: string;
  docNumber: string;
  shiftSupervisor: string;
  salonName: string;
  operatorId: string;
  operatorName: string;
  projectId: string;
  stepId: string;
  machineCode?: string;
  date: string;
  startTime: string;
  sourceWarehouseId: string;
  items: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: number;
    notes?: string;
  }[];
  notes?: string;
  createdAt: string;
}

export interface ProductionLog {
  id: string;
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
  sourceWarehouseId: string; // انبار کسر مواد اولیه
  targetWarehouseId: string; // انبار افزودن محصول
  notes?: string;
  registeredBy: string;
  createdAt: string;
}

export interface Operator {
  id: string;
  code: string;
  name: string;
  shift: 'Morning' | 'Evening' | 'Night';
  role: string;
  activeProjects: string[];
  totalProducedPieces: number;
  totalWorkingHours: number;
  status: 'Active' | 'Off' | 'OnLeave';
  avatarUrl?: string;
}

export interface TraceabilityEvent {
  id: string;
  itemId: string;
  timestamp: string;
  eventType: 'StockIn' | 'Transfer' | 'ProjectConsumption' | 'ProductionOutput' | 'StockOut' | 'Scrap' | 'Adjustment';
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  docNumber?: string;
  projectId?: string;
  operatorName?: string;
  quantity: number;
  details: string;
  performedBy: string;
}

export type UserRole = 
  | 'SystemAdmin'      // مدیر سیستم
  | 'PlantManager'     // مدیر کارخانه
  | 'WarehouseManager' // مدیر انبار
  | 'Storekeeper'      // انباردار
  | 'ShiftLead'        // سرشیفت
  | 'Operator'         // اپراتور
  | 'Purchasing'       // واحد خرید
  | 'QC'               // کنترل کیفیت
  | 'ProjectManager';  // مدیر پروژه

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  department: string;
  email: string;
  avatarUrl?: string;
  allowedTabs?: string[]; // Array of tab IDs or ['*'] for all access
  isActive?: boolean;
  canAdd?: boolean;      // امکان ایجاد و افزودن داده جدید
  canEdit?: boolean;     // امکان ویرایش اطلاعات
  canDelete?: boolean;   // امکان حذف اسناد و کالاها
  canExport?: boolean;   // امکان دریافت خروجی اکسل و بکاپ
  canViewPrices?: boolean; // دسترسی به مشاهده فی، نرخ کالاها و کاردکس مالی
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
}

export type NotificationType = 
  | 'LowStock' 
  | 'ProjectFinished' 
  | 'RequestSubmitted' 
  | 'RequestApproved' 
  | 'RequestRejected' 
  | 'TransferAlert' 
  | 'TransferDispatched'
  | 'TransferReceived'
  | 'StockCountingAlert'
  | 'ChatMessage'
  | 'BOMShortage' 
  | 'Info' 
  | 'Warning' 
  | 'Success';

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  linkTab?: string;
  targetUserId?: string; // If sent to a specific user (e.g. for cartable)
  targetRole?: UserRole | 'All'; // If sent to a specific role
  priority?: 'normal' | 'urgent' | 'high';
  senderName?: string;
  metadata?: Record<string, any>;
}

export interface ChatAttachment {
  type: 'item' | 'request' | 'transfer' | 'project' | 'file';
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  channelId?: string;       // e.g. 'general', 'warehouse', 'production', 'purchasing'
  recipientId?: string;     // If direct 1-on-1 message
  message: string;
  timestamp: string;
  createdAt: string;
  isRead?: boolean;
  replyToId?: string;
  attachments?: ChatAttachment[];
  reactions?: Record<string, string[]>; // { '👍': ['usr-1'], '❤️': ['usr-2'] }
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon?: string;
  allowedRoles?: UserRole[];
  unreadCount?: number;
}

