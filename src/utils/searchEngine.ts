import { Item, Warehouse, InventoryBalance, StockInDoc, StockOutDoc, ItemType, WarehouseTransfer } from '../types';

/**
 * Enterprise Multi-Parameter Search Engine
 * Supports deep Persian/Arabic text normalization, tokenized multi-field matching,
 * digit conversions, and cross-entity relationship searches (e.g. searching an item
 * finds warehouses holding it; searching a warehouse or doc finds contained items).
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Normalizes Persian/Arabic digits to ASCII 0-9
 */
export function normalizeDigits(input: any): string {
  if (input === null || input === undefined) return '';
  let str = String(input);
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    str = str.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return str;
}

/**
 * Deep text normalization for Persian and English search queries
 * Normalizes characters (ي/ك/ة/أ/إ/آ), removes zero-width characters (نیم‌فاصله),
 * converts digits, collapses whitespace, and lowercases.
 */
export function normalizeSearchText(input: any): string {
  if (input === null || input === undefined) return '';
  const strWithLatinDigits = normalizeDigits(input);

  return strWithLatinDigits
    .replace(/[\u200c\u200d\u200e\u200f\ufeff\u00a0\r\n\t]/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[ئ]/g, 'ی')
    .replace(/[،,]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans punctuation and separators from codes (e.g. "E-RES-10K" -> "eres10k")
 */
export function cleanCodeForSearch(code: string): string {
  if (!code) return '';
  return normalizeSearchText(code).replace(/[-_/:.\s]/g, '');
}

/**
 * Splits query into search tokens for multi-term AND matching
 */
export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 0);
}

/**
 * Checks if all query tokens exist inside the target searchable corpus
 */
export function matchesAllTokens(searchableCorpus: string, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true;
  if (!searchableCorpus) return false;

  const normalizedCorpus = normalizeSearchText(searchableCorpus);
  const compactCorpus = normalizedCorpus.replace(/[-_/:.\s]/g, '');

  return queryTokens.every(token => {
    const compactToken = token.replace(/[-_/:.\s]/g, '');
    return (
      normalizedCorpus.includes(token) ||
      (compactToken.length >= 2 && compactCorpus.includes(compactToken))
    );
  });
}

/**
 * Map ItemType to Persian and English descriptive keywords
 */
const ITEM_TYPE_KEYWORDS: Record<ItemType, string> = {
  RawMaterial: 'مواد اولیه خام ماده پایه خام raw material',
  Component: 'قطعه قطعات الکترونیک کامپوننت component',
  SemiFinished: 'نیمه ساخته نیم ساخته مدول برد مونتاژ semi finished',
  Finished: 'محصول نهایی کالای ساخته شده دستگاه نهایی finished product goods',
  Tool: 'ابزار تجهیزات آلات قالب پراب tool equipment',
  Consumable: 'مصرفی مواد مصرفی ملزومات consumable'
};

/**
 * Builds a comprehensive searchable bag of words for an Item
 */
export function getItemSearchCorpus(
  item: Item,
  context?: {
    warehouseNames?: string[];
    warehouseCodes?: string[];
  }
): string {
  const parts: (string | number | undefined)[] = [
    item.name,
    item.code,
    cleanCodeForSearch(item.code),
    item.barcode,
    cleanCodeForSearch(item.barcode),
    item.group,
    item.subGroup,
    item.unit,
    item.itemType ? ITEM_TYPE_KEYWORDS[item.itemType] || item.itemType : '',
    item.locationInRack,
    item.description,
    item.unitPrice ? String(item.unitPrice) : '',
    item.unitPrice ? item.unitPrice.toLocaleString('fa-IR') : '',
    item.minStock !== undefined ? `حداقل ${item.minStock}` : '',
    item.maxStock !== undefined ? `حداکثر ${item.maxStock}` : '',
  ];

  if (context?.warehouseNames && context.warehouseNames.length > 0) {
    parts.push(...context.warehouseNames);
    parts.push('موجود در انبار');
  }

  if (context?.warehouseCodes && context.warehouseCodes.length > 0) {
    parts.push(...context.warehouseCodes);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Determines whether an Item matches the search query across all parameters
 */
export function matchesItem(
  item: Item,
  query: string,
  context?: {
    warehouseNames?: string[];
    warehouseCodes?: string[];
  }
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const corpus = getItemSearchCorpus(item, context);
  return matchesAllTokens(corpus, tokens);
}

/**
 * Builds a comprehensive searchable bag of words for a Warehouse
 */
export function getWarehouseSearchCorpus(
  warehouse: Warehouse,
  context?: {
    itemsInWarehouse?: Item[];
  }
): string {
  const parts: (string | number | boolean | undefined)[] = [
    warehouse.name,
    warehouse.code,
    cleanCodeForSearch(warehouse.code),
    warehouse.group,
    warehouse.subGroup,
    warehouse.manager,
    warehouse.location,
    warehouse.description,
    warehouse.warehouseType,
    warehouse.isQuarantine ? 'قرنطینه qc کنترل کیفیت' : '',
    warehouse.isScrap ? 'ضایعات اسقاطی اسقاط scrap' : '',
    warehouse.isFinishedGoods ? 'محصول نهایی finished goods' : '',
  ];

  if (context?.itemsInWarehouse && context.itemsInWarehouse.length > 0) {
    context.itemsInWarehouse.forEach(it => {
      parts.push(it.name);
      parts.push(it.code);
      parts.push(it.barcode);
      parts.push(it.group);
      parts.push(it.subGroup);
      parts.push(it.locationInRack);
    });
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Determines whether a Warehouse matches the search query across all parameters
 */
export function matchesWarehouse(
  warehouse: Warehouse,
  query: string,
  context?: {
    itemsInWarehouse?: Item[];
  }
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const corpus = getWarehouseSearchCorpus(warehouse, context);
  return matchesAllTokens(corpus, tokens);
}

/**
 * Stock Movement Document Type Labels
 */
const STOCK_IN_TYPE_NAMES: Record<string, string> = {
  Purchase: 'خرید فاکتور تامین کننده purchase',
  ProductionReturn: 'برگشت از خط تولید مرجوعی ساخت production return',
  CustomerReturn: 'مرجوعی مشتری عودت فروش customer return',
  TransferIn: 'انتقال بین انبار ورودی transfer in',
  StockAdjustment: 'اصلاح موجودی تعدیل شمارش مثبت stock adjustment'
};

const STOCK_OUT_TYPE_NAMES: Record<string, string> = {
  ProjectUsage: 'مصرف پروژه تولید ساخت خط مونتاژ project usage consumption',
  Sales: 'فروش تحویل مشتری sales',
  Scrap: 'ضایعات اسقاط مصرف ناپذیر scrap',
  TransferOut: 'انتقال به انبار دیگر خروجی transfer out',
  StockAdjustment: 'اصلاح موجودی تعدیل شمارش منفی کسری stock adjustment',
  VendorReturn: 'مرجوع به فروشنده عودت خرید vendor return'
};

/**
 * Builds searchable corpus for a Stock In or Stock Out document
 */
export function getStockDocumentSearchCorpus(
  doc: StockInDoc | StockOutDoc,
  itemsMap: Map<string, Item>,
  warehousesMap: Map<string, Warehouse>
): string {
  const wh = warehousesMap.get(doc.warehouseId);
  const isStockIn = 'supplier' in doc;
  const partyName = isStockIn ? (doc as StockInDoc).supplier : (doc as StockOutDoc).recipient;
  const movementTypeKey = isStockIn ? (doc as StockInDoc).entryType : (doc as StockOutDoc).exitType;
  const typeKeywords = isStockIn 
    ? (STOCK_IN_TYPE_NAMES[movementTypeKey] || movementTypeKey)
    : (STOCK_OUT_TYPE_NAMES[movementTypeKey] || movementTypeKey);

  const parts: (string | number | undefined)[] = [
    doc.docNumber,
    cleanCodeForSearch(doc.docNumber),
    doc.date,
    partyName,
    doc.registeredBy,
    doc.notes,
    wh?.name,
    wh?.code,
    typeKeywords,
    isStockIn ? 'رسید ورود وارده ورودی in' : 'حواله خروج صادره خروجی out'
  ];

  if (doc.items && doc.items.length > 0) {
    doc.items.forEach(line => {
      const it = itemsMap.get(line.itemId);
      if (it) {
        parts.push(it.name);
        parts.push(it.code);
        parts.push(cleanCodeForSearch(it.code));
        parts.push(it.barcode);
        parts.push(it.group);
        parts.push(it.subGroup);
      }
      if (line.notes) parts.push(line.notes);
      if (line.quantity) {
        parts.push(String(line.quantity));
        parts.push(line.quantity.toLocaleString('fa-IR'));
      }
    });
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Determines whether a Stock Movement Document matches the search query
 */
export function matchesStockDocument(
  doc: StockInDoc | StockOutDoc,
  query: string,
  itemsMap: Map<string, Item>,
  warehousesMap: Map<string, Warehouse>
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const corpus = getStockDocumentSearchCorpus(doc, itemsMap, warehousesMap);
  return matchesAllTokens(corpus, tokens);
}

/**
 * Builds a comprehensive searchable bag of words for a Warehouse Transfer
 */
export function getTransferSearchCorpus(
  transfer: WarehouseTransfer,
  itemsMap: Map<string, Item>,
  warehousesMap: Map<string, Warehouse>
): string {
  const sourceWh = warehousesMap.get(transfer.sourceWarehouseId);
  const targetWh = warehousesMap.get(transfer.targetWarehouseId);

  const statusMap: Record<string, string> = {
    DRAFT_REQUEST: 'پیش نویس درخواست draft',
    PENDING_CENTRAL_DISPATCH: 'در انتظار خروج ارسال انبار مرکزی pending dispatch',
    IN_TRANSIT: 'در حال حمل ترانزیت خودرو راننده in transit',
    COMPLETED_RECEIVED: 'تحویل قطعی تایید شده وصول رسید انبار مقصد received completed',
    REJECTED: 'رد شده لغو مرجوعی rejected'
  };

  const parts: (string | number | undefined)[] = [
    transfer.docNumber,
    cleanCodeForSearch(transfer.docNumber),
    transfer.date,
    transfer.projectName,
    transfer.requestedBy,
    transfer.dispatchedBy,
    transfer.receivedBy,
    transfer.rejectReason,
    transfer.handlerName,
    transfer.driverPhone,
    transfer.vehicleNumber,
    transfer.notes,
    transfer.status ? statusMap[transfer.status] || transfer.status : '',
    sourceWh?.name,
    sourceWh?.code,
    targetWh?.name,
    targetWh?.code,
    'انتقال حواله بین انبار ترانسفر transfer'
  ];

  if (transfer.items && transfer.items.length > 0) {
    transfer.items.forEach(line => {
      const it = itemsMap.get(line.itemId);
      if (it) {
        parts.push(it.name);
        parts.push(it.code);
        parts.push(cleanCodeForSearch(it.code));
        parts.push(it.barcode);
        parts.push(it.group);
        parts.push(it.subGroup);
        parts.push(it.description);
      }
      if (line.notes) parts.push(line.notes);
      if (line.quantity) {
        parts.push(String(line.quantity));
        parts.push(line.quantity.toLocaleString('fa-IR'));
      }
    });
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Determines whether a Warehouse Transfer matches the search query across all parameters
 */
export function matchesTransfer(
  transfer: WarehouseTransfer,
  query: string,
  itemsMap: Map<string, Item>,
  warehousesMap: Map<string, Warehouse>
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const corpus = getTransferSearchCorpus(transfer, itemsMap, warehousesMap);
  return matchesAllTokens(corpus, tokens);
}

