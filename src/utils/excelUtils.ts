import * as XLSX from 'xlsx';
import { Item, ItemType, ItemGroup, Warehouse, InventoryBalance, BOM, BOMItem, Project } from '../types';

// =========================================================================
//  PERSIAN DIGIT & STRING NORMALIZATION UTILITIES
// =========================================================================

/**
 * Normalizes Persian and Arabic numbers into standard ASCII numbers
 */
export function normalizeDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

/**
 * Safely parses any cell value into a clean number, handling Persian digits, commas, currencies
 */
export function parseSafeNumber(val: any, defaultValue = 0): number {
  if (val === undefined || val === null || val === '') return defaultValue;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? defaultValue : val;
  }
  const cleanStr = normalizeDigits(val)
    .replace(/[,،٬\s_]/g, '')
    .replace(/[ریال|تومان|تومن|ت|ر|USD|\$|IRR|TOMAN]/gi, '')
    .trim();

  const num = parseFloat(cleanStr);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
}

/**
 * Safely cleans a string value, removing invisible unicode control chars
 */
export function parseSafeString(val: any, defaultValue = ''): string {
  if (val === undefined || val === null) return defaultValue;
  return String(val)
    .replace(/[\ufeff\u200e\u200f\r]/g, '')
    .trim();
}

/**
 * Normalizes a header/column key for fuzzy matching
 */
export function cleanHeaderKey(key: string): string {
  if (!key) return '';
  return String(key)
    .replace(/[\u200c\u200d\u200e\u200f\ufeff\u00a0\r\n\t]/g, '')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[()\[\]{}:_\-\/\\,،]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Retrieves the first matching value from a row based on candidate keys (exact or normalized)
 */
export function getRowField(row: Record<string, any>, candidateKeys: string[]): any {
  if (!row || typeof row !== 'object') return undefined;

  // 1. Direct check
  for (const k of candidateKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }

  // 2. Normalized check
  const normalizedCandidateKeys = candidateKeys.map(cleanHeaderKey);
  const rowEntries = Object.entries(row);
  for (const [rawKey, rawVal] of rowEntries) {
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
    const normKey = cleanHeaderKey(rawKey);
    if (normalizedCandidateKeys.some(cand => normKey === cand || (cand.length >= 3 && normKey.includes(cand)) || (normKey.length >= 3 && cand.includes(normKey)))) {
      return rawVal;
    }
  }

  return undefined;
}

/**
 * Finds the best sheet containing tabular data and extracts clean rows
 */
function extractRowsFromWorkbook(workbook: XLSX.WorkBook): { rawRows: Record<string, any>[]; sheetName: string } {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { rawRows: [], sheetName: '' };
  }

  // Check all sheets and pick the one with most valid-looking rows
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Try standard json conversion
    const standardRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (standardRows && standardRows.length > 0) {
      // Verify that rows have more than 1 column
      const sampleRow = standardRows[0] || {};
      const sampleKeys = Object.keys(sampleRow);
      if (sampleKeys.length >= 2) {
        return { rawRows: standardRows, sheetName };
      }
    }

    // Try reading as 2D array if header row was offset (e.g. title banner in row 0)
    const rawMatrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    if (rawMatrix && rawMatrix.length > 1) {
      // Find header row index
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
        const rowArr = rawMatrix[r];
        if (Array.isArray(rowArr) && rowArr.length >= 2) {
          const joinedRow = rowArr.map(c => cleanHeaderKey(String(c))).join(' ');
          if (
            joinedRow.includes('کد') || 
            joinedRow.includes('نام') || 
            joinedRow.includes('code') || 
            joinedRow.includes('name') || 
            joinedRow.includes('انبار') ||
            joinedRow.includes('item')
          ) {
            headerRowIndex = r;
            break;
          }
        }
      }

      const headers = (rawMatrix[headerRowIndex] || []).map(h => parseSafeString(h));
      const extracted: Record<string, any>[] = [];
      for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
        const rowArr = rawMatrix[r];
        if (!Array.isArray(rowArr) || rowArr.length === 0) continue;
        const rowObj: Record<string, any> = {};
        let hasContent = false;
        headers.forEach((h, colIdx) => {
          if (h && colIdx < rowArr.length) {
            rowObj[h] = rowArr[colIdx];
            if (rowArr[colIdx] !== '' && rowArr[colIdx] !== null && rowArr[colIdx] !== undefined) {
              hasContent = true;
            }
          }
        });
        if (hasContent) {
          extracted.push(rowObj);
        }
      }

      if (extracted.length > 0) {
        return { rawRows: extracted, sheetName };
      }
    }
  }

  // Fallback to first sheet
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const fallbackRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
  return { rawRows: fallbackRows || [], sheetName: workbook.SheetNames[0] };
}

// =========================================================================
//  EXCEL UTILITIES FOR ITEMS (MASTER DATA)
// =========================================================================

export const ITEM_TYPE_FA_MAP: Record<string, ItemType> = {
  'مواد اولیه': 'RawMaterial',
  'مواداولیه': 'RawMaterial',
  'ماده اولیه': 'RawMaterial',
  'rawmaterial': 'RawMaterial',
  'raw_material': 'RawMaterial',
  'raw': 'RawMaterial',
  'قطعه': 'Component',
  'قطعه الکترونیک': 'Component',
  'قطعات': 'Component',
  'کامپوننت': 'Component',
  'component': 'Component',
  'part': 'Component',
  'نیمه ساخته': 'SemiFinished',
  'نیمه‌ساخته': 'SemiFinished',
  'برد نیمه ساخته': 'SemiFinished',
  'برد': 'SemiFinished',
  'semifinished': 'SemiFinished',
  'semi_finished': 'SemiFinished',
  'semi': 'SemiFinished',
  'محصول نهایی': 'Finished',
  'محصول': 'Finished',
  'کالای نهایی': 'Finished',
  'دستگاه': 'Finished',
  'finished': 'Finished',
  'finishedproduct': 'Finished',
  'finished_product': 'Finished',
  'ابزار': 'Tool',
  'تجهیز': 'Tool',
  'tool': 'Tool',
  'مصرفی': 'Consumable',
  'ملزومات': 'Consumable',
  'consumable': 'Consumable',
};

export const ITEM_TYPE_EN_TO_FA: Record<ItemType, string> = {
  RawMaterial: 'مواد اولیه',
  Component: 'قطعه الکترونیک',
  SemiFinished: 'نیمه ساخته',
  Finished: 'محصول نهایی',
  Tool: 'ابزار',
  Consumable: 'مصرفی',
};

/**
 * Export items list to Excel file
 */
export function exportItemsToExcel(items: Item[], _itemGroups: ItemGroup[] = []): void {
  const rows = items.map((it, idx) => ({
    'ردیف': idx + 1,
    'کد کالا': it.code,
    'نام کالا / قطعه': it.name,
    'نوع کالا': ITEM_TYPE_EN_TO_FA[it.itemType] || it.itemType,
    'گروه اصلی': it.group,
    'زیرگروه': it.subGroup || '',
    'واحد سنجش': it.unit,
    'بارکد': it.barcode || it.code,
    'حداقل موجودی': it.minStock ?? 0,
    'حداکثر موجودی': it.maxStock ?? 1000,
    'قیمت واحد (تومان)': it.unitPrice ?? 0,
    'موقعیت قفسه': it.locationInRack || '',
    'توضیحات': it.description || '',
    'تاریخ ایجاد': it.createdAt || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'کاتالوگ کالاها');
  
  const maxProps = Object.keys(rows[0] || {});
  worksheet['!cols'] = maxProps.map(() => ({ wch: 18 }));

  XLSX.writeFile(workbook, `Items_Catalog_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Generate a ready-to-fill Sample Template for Items import
 */
export function generateItemsExcelTemplate(): void {
  const sampleRows = [
    {
      'کد کالا': 'E-IC-STM32',
      'نام کالا / قطعه': 'میکروکنترلر STM32F103C8T6',
      'نوع کالا': 'قطعه الکترونیک',
      'گروه اصلی': 'قطعات الکترونیک',
      'زیرگروه': 'میکروکنترلر',
      'واحد سنجش': 'عدد',
      'بارکد': '6260012345678',
      'حداقل موجودی': 50,
      'حداکثر موجودی': 1000,
      'قیمت واحد (تومان)': 185000,
      'موقعیت قفسه': 'A-01-02',
      'توضیحات': 'تراشه میکروکنترلر ۳۲ بیتی پکیج LQFP-48'
    },
    {
      'کد کالا': 'E-RES-0805-10K',
      'نام کالا / قطعه': 'مقاومت ۱۰ کیلو اهم SMD سایز 0805',
      'نوع کالا': 'قطعه الکترونیک',
      'گروه اصلی': 'قطعات الکترونیک',
      'زیرگروه': 'مقاومت',
      'واحد سنجش': 'عدد',
      'بارکد': '6260012345679',
      'حداقل موجودی': 500,
      'حداکثر موجودی': 10000,
      'قیمت واحد (تومان)': 450,
      'موقعیت قفسه': 'B-03-01',
      'توضیحات': 'رول ۵۰۰۰ تایی مقاومت SMD دقت ۱ درصد'
    },
    {
      'کد کالا': 'SF-PCB-CTRL-V1',
      'نام کالا / قطعه': 'برد کنترلر مونتاژ شده (نیمه ساخته)',
      'نوع کالا': 'نیمه ساخته',
      'گروه اصلی': 'بردهای مدار چاپی',
      'زیرگروه': 'نیمه ساخته',
      'واحد سنجش': 'عدد',
      'بارکد': '6260012345680',
      'حداقل موجودی': 10,
      'حداکثر موجودی': 200,
      'قیمت واحد (تومان)': 850000,
      'موقعیت قفسه': 'S-01-05',
      'توضیحات': 'خروجی مرحله مونتاژ SMD برد اصلی'
    },
    {
      'کد کالا': 'FP-DEV-SMART-01',
      'نام کالا / قطعه': 'دستگاه کنترلر صنعتی هوشمند',
      'نوع کالا': 'محصول نهایی',
      'گروه اصلی': 'محصولات نهایی',
      'زیرگروه': 'کنترلر صنعتی',
      'واحد سنجش': 'دستگاه',
      'بارکد': '6260012345681',
      'حداقل موجودی': 5,
      'حداکثر موجودی': 50,
      'قیمت واحد (تومان)': 3400000,
      'موقعیت قفسه': 'F-01-01',
      'توضیحات': 'محصول بسته‌بندی شده نهایی همراه با آداپتور'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نمونه ورود کالاها');
  
  const guidelines = [
    { 'راهنمای ستون‌ها': 'کد کالا', 'توضیحات': 'کد یکتا برای هر کالا الزامی است (مثلاً E-RES-10K)' },
    { 'راهنمای ستون‌ها': 'نام کالا / قطعه', 'توضیحات': 'عنوان کامل قطعه یا کالا' },
    { 'راهنمای ستون‌ها': 'نوع کالا', 'توضیحات': 'یکی از مقادیر: مواد اولیه، قطعه الکترونیک، نیمه ساخته، محصول نهایی، ابزار، مصرفی' },
    { 'راهنمای ستون‌ها': 'گروه اصلی و زیرگروه', 'توضیحات': 'در صورت عدم وجود در سیستم، به طور خودکار ایجاد می‌شوند' },
    { 'راهنمای ستون‌ها': 'واحد سنجش', 'توضیحات': 'عدد، متر، کیلوگرم، رول، بسته، دستگاه' },
    { 'راهنمای ستون‌ها': 'قیمت واحد', 'توضیحات': 'قیمت به عدد تومان' },
    { 'راهنمای ستون‌ها': 'موقعیت قفسه', 'توضیحات': 'مثلاً A-01-02' }
  ];
  const guideWs = XLSX.utils.json_to_sheet(guidelines);
  XLSX.utils.book_append_sheet(workbook, guideWs, 'راهنمای فیلدها');

  XLSX.writeFile(workbook, 'Template_Items_Import.xlsx');
}

/**
 * Parse and Validate Excel file for Items
 */
export async function parseItemsFromExcel(file: File | ArrayBuffer): Promise<{
  success: boolean;
  items: Omit<Item, 'id' | 'createdAt'>[];
  groupsToCreate: { name: string; subGroup: string }[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}> {
  try {
    let dataBuffer: ArrayBuffer;
    if (file instanceof File) {
      dataBuffer = await file.arrayBuffer();
    } else {
      dataBuffer = file;
    }

    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const { rawRows } = extractRowsFromWorkbook(workbook);

    if (!rawRows || rawRows.length === 0) {
      return { 
        success: false, 
        items: [], 
        groupsToCreate: [], 
        errors: ['هیچ ردیف داده‌ای در فایل اکسل یافت نشد. لطفاً از پر بودن ردیف‌ها اطمینان حاصل فرمایید.'], 
        warnings: [],
        totalRows: 0 
      };
    }

    const items: Omit<Item, 'id' | 'createdAt'>[] = [];
    const groupsToCreate: { name: string; subGroup: string }[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenCodes = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;

      // Extract fields with multiple variations
      const rawCode = getRowField(row, ['کد کالا', 'کدکالا', 'کد', 'کد قطعه', 'شناسه کالا', 'کد_کالا', 'itemcode', 'item code', 'code']);
      const rawName = getRowField(row, ['نام کالا / قطعه', 'نام کالا', 'نام', 'نام قطعه', 'نام محصول', 'عنوان کالا', 'شرح کالا', 'itemname', 'item name', 'name', 'title']);

      const code = parseSafeString(rawCode);
      const name = parseSafeString(rawName);

      if (!code && !name) {
        // Skip entirely empty row
        return;
      }

      if (!code) {
        errors.push(`ردیف ${rowNum}: ستون «کد کالا» الزامی است و نمی‌تواند خالی باشد.`);
        return;
      }

      if (!name) {
        errors.push(`ردیف ${rowNum}: ستون «نام کالا» الزامی است و نمی‌تواند خالی باشد.`);
        return;
      }

      const lowerCode = code.toLowerCase().trim();
      if (seenCodes.has(lowerCode)) {
        warnings.push(`ردیف ${rowNum}: کد کالای تکراری "${code}" در فایل مشاهده شد و با مقادیر این ردیف به‌روزرسانی می‌شود.`);
      }
      seenCodes.add(lowerCode);

      const rawType = parseSafeString(getRowField(row, ['نوع کالا', 'نوع', 'نوع قطعه', 'دسته ماهیت', 'itemtype', 'item type', 'type']) || 'Component');
      const cleanTypeKey = cleanHeaderKey(rawType);
      const itemType = ITEM_TYPE_FA_MAP[cleanTypeKey] || ITEM_TYPE_FA_MAP[rawType] || 'Component';

      const group = parseSafeString(getRowField(row, ['گروه اصلی', 'گروه کالا', 'گروه', 'دسته اصلی', 'دسته بندی', 'group', 'category']) || 'عمومی');
      const subGroup = parseSafeString(getRowField(row, ['زیرگروه', 'زیر گروه', 'زیردسته', 'subgroup', 'sub_group', 'subcategory']) || 'عمومی');
      const unit = parseSafeString(getRowField(row, ['واحد سنجش', 'واحد', 'واحد شمارش', 'واحد اندازه گیری', 'unit', 'uom']) || 'عدد');
      const barcode = parseSafeString(getRowField(row, ['بارکد', 'کد میله ای', 'barcode']) || code);
      
      const minStock = parseSafeNumber(getRowField(row, ['حداقل موجودی', 'حداقل', 'نقطه سفارش', 'minstock', 'min stock', 'min']), 0);
      const maxStock = parseSafeNumber(getRowField(row, ['حداکثر موجودی', 'حداکثر', 'سقف موجودی', 'maxstock', 'max stock', 'max']), 1000);
      const unitPrice = parseSafeNumber(getRowField(row, ['قیمت واحد (تومان)', 'قیمت واحد (ریال)', 'قیمت واحد', 'قیمت', 'فی', 'بهای واحد', 'ارزش واحد', 'unitprice', 'unit price', 'price']), 0);
      
      const locationInRack = parseSafeString(getRowField(row, ['موقعیت قفسه', 'موقعیت در قفسه', 'قفسه', 'موقعیت', 'آدرس در انبار', 'لوکیشن', 'location', 'rack']) || '');
      const description = parseSafeString(getRowField(row, ['توضیحات', 'شرح', 'یادداشت', 'ملاحظات', 'description', 'notes', 'remark']) || '');

      items.push({
        code,
        name,
        group,
        subGroup,
        unit,
        barcode,
        minStock,
        maxStock,
        itemType,
        unitPrice,
        locationInRack,
        description
      });

      if (group) {
        groupsToCreate.push({ name: group, subGroup: subGroup || 'عمومی' });
      }
    });

    return {
      success: items.length > 0,
      items,
      groupsToCreate,
      errors,
      warnings,
      totalRows: rawRows.length
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      groupsToCreate: [],
      errors: [`خطا در خواندن فایل اکسل کالاها: ${err?.message || 'قالب فایل نامعتبر است'}`],
      warnings: [],
      totalRows: 0
    };
  }
}

// =========================================================================
//  EXCEL UTILITIES FOR INITIAL STOCK (موجودی ابتدای دوره)
// =========================================================================

export interface InitialStockParsedRow {
  warehouseId: string;
  warehouseCodeOrName: string;
  warehouseName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  locationInRack?: string;
  notes?: string;
}

/**
 * Export current inventory balances to Excel
 */
export function exportInventoryToExcel(
  inventory: InventoryBalance[],
  items: Item[],
  warehouses: Warehouse[]
): void {
  const rows = inventory.map((inv, idx) => {
    const it = items.find(i => i.id === inv.itemId);
    const wh = warehouses.find(w => w.id === inv.warehouseId);
    return {
      'ردیف': idx + 1,
      'کد انبار': wh?.code || inv.warehouseId,
      'نام انبار': wh?.name || 'انبار نامشخص',
      'کد کالا': it?.code || inv.itemId,
      'نام کالا / قطعه': it?.name || 'کالای نامشخص',
      'نوع کالا': it ? (ITEM_TYPE_EN_TO_FA[it.itemType] || it.itemType) : '',
      'موجودی فعلی': inv.quantity ?? 0,
      'واحد سنجش': it?.unit || 'عدد',
      'موجودی رزرو شده': inv.reservedQuantity || 0,
      'موجودی قابل استفاده': (inv.quantity ?? 0) - (inv.reservedQuantity || 0),
      'ارزش واحد (تومان)': it?.unitPrice || 0,
      'ارزش کل موجودی (تومان)': ((inv.quantity ?? 0) * (it?.unitPrice || 0)),
      'موقعیت در قفسه': it?.locationInRack || '',
      'آخرین تاریخ به‌روزرسانی': inv.lastUpdated || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'موجودی انبارها');
  worksheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));

  XLSX.writeFile(workbook, `Inventory_Balances_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Generate a Sample Excel Template for Initial Stock (موجودی ابتدای دوره)
 */
export function generateInitialStockExcelTemplate(warehouses: Warehouse[], items: Item[]): void {
  const sampleWh1 = warehouses[0]?.code || 'WH-01';
  const sampleWhName1 = warehouses[0]?.name || 'انبار قطعات مرکزی SMD';

  const sampleRows = [
    {
      'کد انبار': sampleWh1,
      'نام انبار (اختیاری)': sampleWhName1,
      'کد کالا': items[0]?.code || 'E-IC-328',
      'نام کالا (اختیاری)': items[0]?.name || 'تراشه میکروکنترلر Atmega328P',
      'تعداد موجودی ابتدای دوره': 450,
      'قیمت واحد (تومان)': items[0]?.unitPrice || 140000,
      'موقعیت قفسه (اختیاری)': 'A-01-01',
      'یادداشت / شماره سند': 'سند افتتاحیه ابتدای سال'
    },
    {
      'کد انبار': sampleWh1,
      'نام انبار (اختیاری)': sampleWhName1,
      'کد کالا': items[1]?.code || 'E-RES-0805-10K',
      'نام کالا (اختیاری)': items[1]?.name || 'مقاومت ۱۰K سایز 0805',
      'تعداد موجودی ابتدای دوره': 25000,
      'قیمت واحد (تومان)': items[1]?.unitPrice || 450,
      'موقعیت قفسه (اختیاری)': 'B-02-04',
      'یادداشت / شماره سند': 'سند افتتاحیه ابتدای سال'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'موجودی ابتدای دوره');

  // Warehouses reference list
  const whRef = warehouses.map(w => ({
    'کد انبار': w.code,
    'نام انبار': w.name,
    'نوع انبار': w.warehouseType || 'مرکزی',
    'محل': w.location
  }));
  const whWs = XLSX.utils.json_to_sheet(whRef);
  XLSX.utils.book_append_sheet(workbook, whWs, 'لیست انبارهای مجاز');

  // Items reference list
  const itemsRef = items.map(i => ({
    'کد کالا': i.code,
    'نام کالا': i.name,
    'نوع کالا': ITEM_TYPE_EN_TO_FA[i.itemType] || i.itemType,
    'واحد سنجش': i.unit,
    'قیمت واحد (تومان)': i.unitPrice
  }));
  const itemsWs = XLSX.utils.json_to_sheet(itemsRef);
  XLSX.utils.book_append_sheet(workbook, itemsWs, 'لیست کدهای کالا');

  XLSX.writeFile(workbook, 'Template_Initial_Stock_Import.xlsx');
}

/**
 * Parse and Validate Excel file for Initial Stock
 */
export async function parseInitialStockFromExcel(
  file: File | ArrayBuffer,
  items: Item[],
  warehouses: Warehouse[]
): Promise<{
  success: boolean;
  rows: InitialStockParsedRow[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  totalCalculatedValue: number;
}> {
  try {
    let dataBuffer: ArrayBuffer;
    if (file instanceof File) {
      dataBuffer = await file.arrayBuffer();
    } else {
      dataBuffer = file;
    }

    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const { rawRows } = extractRowsFromWorkbook(workbook);

    if (!rawRows || rawRows.length === 0) {
      return { 
        success: false, 
        rows: [], 
        errors: ['هیچ ردیف داده‌ای در فایل اکسل یافت نشد.'], 
        warnings: [], 
        totalRows: 0,
        totalCalculatedValue: 0
      };
    }

    const parsedRows: InitialStockParsedRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalCalculatedValue = 0;

    // Lookup maps
    const itemByCode = new Map<string, Item>();
    const itemByBarcode = new Map<string, Item>();
    const itemByName = new Map<string, Item>();
    items.forEach(it => {
      if (it.code) itemByCode.set(it.code.toLowerCase().trim(), it);
      if (it.barcode) itemByBarcode.set(it.barcode.trim(), it);
      if (it.name) itemByName.set(it.name.toLowerCase().trim(), it);
    });

    const warehouseByCode = new Map<string, Warehouse>();
    const warehouseByName = new Map<string, Warehouse>();
    warehouses.forEach(w => {
      if (w.code) warehouseByCode.set(w.code.toLowerCase().trim(), w);
      if (w.name) warehouseByName.set(w.name.toLowerCase().trim(), w);
    });

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      
      const whCodeInput = parseSafeString(getRowField(row, ['کد انبار', 'کدانبار', 'شناسه انبار', 'warehousecode', 'warehouse code', 'انبار', 'warehouse', 'wh_code']));
      const whNameInput = parseSafeString(getRowField(row, ['نام انبار (اختیاری)', 'نام انبار', 'عنوان انبار', 'warehousename', 'warehouse name']));

      const itemCodeInput = parseSafeString(getRowField(row, ['کد کالا', 'کدکالا', 'کد', 'کد قطعه', 'itemcode', 'item code', 'code']));
      const itemNameInput = parseSafeString(getRowField(row, ['نام کالا (اختیاری)', 'نام کالا', 'نام', 'شرح کالا', 'عنوان کالا', 'itemname', 'item name']));
      const barcodeInput = parseSafeString(getRowField(row, ['بارکد', 'کد میله ای', 'barcode']));

      const qtyRaw = getRowField(row, [
        'تعداد موجودی ابتدای دوره', 
        'موجودی ابتدای دوره', 
        'موجودی اول دوره', 
        'موجودی اولیه', 
        'تعداد', 
        'مقدار', 
        'موجودی', 
        'quantity', 
        'initialquantity', 
        'qty'
      ]);
      const qty = parseSafeNumber(qtyRaw, -1);

      if (!whCodeInput && !whNameInput && !itemCodeInput && !itemNameInput && qtyRaw === undefined) {
        return; // skip completely empty row
      }

      // 1. Resolve Warehouse
      let matchedWh: Warehouse | undefined = undefined;
      if (whCodeInput) {
        matchedWh = warehouseByCode.get(whCodeInput.toLowerCase());
      }
      if (!matchedWh && whNameInput) {
        matchedWh = warehouseByName.get(whNameInput.toLowerCase());
      }
      if (!matchedWh && warehouses.length === 1) {
        matchedWh = warehouses[0];
      }
      if (!matchedWh && warehouses.length > 0 && !whCodeInput && !whNameInput) {
        matchedWh = warehouses[0]; // fallback to primary warehouse
      }

      if (!matchedWh) {
        errors.push(`ردیف ${rowNum}: انبار با کد "${whCodeInput || '-'}" یا نام "${whNameInput || '-'}" در سیستم یافت نشد.`);
        return;
      }

      // 2. Resolve Item
      let matchedItem: Item | undefined = undefined;
      if (itemCodeInput) {
        matchedItem = itemByCode.get(itemCodeInput.toLowerCase());
      }
      if (!matchedItem && barcodeInput) {
        matchedItem = itemByBarcode.get(barcodeInput);
      }
      if (!matchedItem && itemNameInput) {
        matchedItem = itemByName.get(itemNameInput.toLowerCase());
      }

      if (!matchedItem) {
        errors.push(`ردیف ${rowNum}: کالایی با کد "${itemCodeInput || '-'}" یا نام "${itemNameInput || '-'}" در سیستم یافت نشد. لطفاً ابتدا کالا را ثبت کنید.`);
        return;
      }

      // 3. Validate Quantity
      if (qty < 0) {
        errors.push(`ردیف ${rowNum}: مقدار موجودی (${qtyRaw || 'خالی'}) باید یک عدد معتبر بزرگتر یا مساوی صفر باشد.`);
        return;
      }

      const unitPrice = parseSafeNumber(
        getRowField(row, ['قیمت واحد (تومان)', 'قیمت واحد (ریال)', 'قیمت واحد', 'قیمت', 'فی', 'بهای واحد', 'unitprice', 'unit price', 'price']), 
        matchedItem.unitPrice || 0
      );
      
      const locationInRack = parseSafeString(
        getRowField(row, ['موقعیت قفسه (اختیاری)', 'موقعیت قفسه', 'موقعیت', 'قفسه', 'location', 'rack']) || matchedItem.locationInRack || ''
      );
      
      const notes = parseSafeString(
        getRowField(row, ['یادداشت / شماره سند', 'شماره سند', 'توضیحات', 'یادداشت', 'شرح', 'notes', 'remark']) || 'ثبت موجودی ابتدای دوره از طریق اکسل'
      );

      const rowValue = qty * (unitPrice || 0);
      totalCalculatedValue += rowValue;

      parsedRows.push({
        warehouseId: matchedWh.id,
        warehouseCodeOrName: matchedWh.name,
        warehouseName: matchedWh.name,
        itemId: matchedItem.id,
        itemCode: matchedItem.code,
        itemName: matchedItem.name,
        quantity: qty,
        unitPrice,
        locationInRack,
        notes
      });
    });

    return {
      success: parsedRows.length > 0,
      rows: parsedRows,
      errors,
      warnings,
      totalRows: rawRows.length,
      totalCalculatedValue
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      errors: [`خطا در بارگذاری موجودی ابتدای دوره از اکسل: ${err?.message || 'فرمت نامعتبر است'}`],
      warnings: [],
      totalRows: 0,
      totalCalculatedValue: 0
    };
  }
}

// =========================================================================
//  EXCEL UTILITIES FOR BOM (BILL OF MATERIALS)
// =========================================================================

export interface ParsedBOMRow {
  finishedItemCode: string;
  finishedItemName?: string;
  bomName: string;
  version: string;
  componentItemCode: string;
  componentItemName?: string;
  quantityNeeded: number;
  unit: string;
  scrapAllowancePercent: number;
  projectCode?: string;
  description?: string;
}

/**
 * Export all BOM recipes to Excel
 */
export function exportBOMsToExcel(boms: BOM[], items: Item[], projects: Project[] = []): void {
  const flatRows: any[] = [];
  let rowCounter = 1;

  boms.forEach(bom => {
    const finItem = items.find(i => i.id === bom.finishedItemId);
    const linkedProj = projects.find(p => p.id === bom.projectId);

    bom.items.forEach(bomIt => {
      const compItem = items.find(i => i.id === bomIt.itemId);
      flatRows.push({
        'ردیف': rowCounter++,
        'کد کالای نهایی/نیمه‌ساخته': finItem?.code || bom.finishedItemId,
        'نام محصول / برد مونتاژی': finItem?.name || 'کالای نامشخص',
        'نوع محصول': finItem ? (ITEM_TYPE_EN_TO_FA[finItem.itemType] || finItem.itemType) : '',
        'عنوان فرمول ساخت': bom.name,
        'نسخه فرمول': bom.version,
        'کد قطعه تشکیل‌دهنده': compItem?.code || bomIt.itemId,
        'نام قطعه / کامپوننت': compItem?.name || 'قطعه نامشخص',
        'ضریب مصرف در ۱ واحد': bomIt.quantityNeeded,
        'واحد سنجش قطعه': bomIt.unit || compItem?.unit || 'عدد',
        'درصد ضایعات پیش‌بینی (Scrap %)': bomIt.scrapAllowancePercent || 0,
        'کد پروژه تخصیصی': linkedProj?.code || '',
        'نام پروژه': linkedProj?.name || '',
        'توضیحات فرمول': bom.description || ''
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(flatRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'فرمول‌های ساخت (BOM)');
  worksheet['!cols'] = Object.keys(flatRows[0] || {}).map(() => ({ wch: 18 }));

  XLSX.writeFile(workbook, `BOM_Recipes_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Generate Sample Excel Template for BOMs
 */
export function generateBOMsExcelTemplate(items: Item[]): void {
  const finItem = items.find(i => i.itemType === 'Finished' || i.itemType === 'SemiFinished') || items[0];
  const comp1 = items.find(i => i.itemType === 'Component') || items[1] || items[0];
  const comp2 = items.find(i => i.id !== comp1?.id) || items[2] || items[0];

  const sampleRows = [
    {
      'کد کالای نهایی/نیمه‌ساخته': finItem?.code || 'FP-DEV-SMART-01',
      'نام فرمول ساخت': 'فرمول ساخت دستگاه هوشمند V1',
      'نسخه فرمول': 'v1.0',
      'کد قطعه تشکیل‌دهنده': 'SF-PCB-CTRL-V1',
      'ضریب مصرف در ۱ واحد': 3,
      'واحد سنجش قطعه': 'عدد',
      'درصد ضایعات (Scrap %)': 1,
      'کد پروژه تخصیصی (اختیاری)': 'PRJ-SMART-01',
      'توضیحات': '۳ عدد برد نیمه‌ساخته کنترلر به ازای هر محصول نهایی'
    },
    {
      'کد کالای نهایی/نیمه‌ساخته': finItem?.code || 'FP-DEV-SMART-01',
      'نام فرمول ساخت': 'فرمول ساخت دستگاه هوشمند V1',
      'نسخه فرمول': 'v1.0',
      'کد قطعه تشکیل‌دهنده': comp1?.code || 'E-RES-0805-10K',
      'ضریب مصرف در ۱ واحد': 12,
      'واحد سنجش قطعه': 'عدد',
      'درصد ضایعات (Scrap %)': 2,
      'کد پروژه تخصیصی (اختیاری)': 'PRJ-SMART-01',
      'توضیحات': 'مقاومت SMD مدار ورودی'
    },
    {
      'کد کالای نهایی/نیمه‌ساخته': finItem?.code || 'FP-DEV-SMART-01',
      'نام فرمول ساخت': 'فرمول ساخت دستگاه هوشمند V1',
      'نسخه فرمول': 'v1.0',
      'کد قطعه تشکیل‌دهنده': comp2?.code || 'E-IC-328',
      'ضریب مصرف در ۱ واحد': 1,
      'واحد سنجش قطعه': 'عدد',
      'درصد ضایعات (Scrap %)': 1,
      'کد پروژه تخصیصی (اختیاری)': 'PRJ-SMART-01',
      'توضیحات': 'تراشه میکروکنترلر'
    },
    {
      'کد کالای نهایی/نیمه‌ساخته': 'SF-PCB-CTRL-V1',
      'نام فرمول ساخت': 'فرمول ساخت برد نیمه‌ساخته کنترلر',
      'نسخه فرمول': 'v1.0',
      'کد قطعه تشکیل‌دهنده': 'E-PCB-001',
      'ضریب مصرف در ۱ واحد': 1,
      'واحد سنجش قطعه': 'عدد',
      'درصد ضایعات (Scrap %)': 1,
      'کد پروژه تخصیصی (اختیاری)': '',
      'توضیحات': 'فیبر خام مدار چاپی برد کنترلر'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'فرمول ساخت BOM');

  const helpSheet = [
    { 'ستون': 'کد کالای نهایی/نیمه‌ساخته', 'توضیحات': 'کد کالایی که قرار است ساخته شود (محصول نهایی یا نیمه‌ساخته)' },
    { 'ستون': 'نام فرمول ساخت', 'توضیحات': 'عنوان کلی فرمول' },
    { 'ستون': 'کد قطعه تشکیل‌دهنده', 'توضیحات': 'کد قطعه اولیه، کامپوننت یا نیمه‌ساخته مصرفی' },
    { 'ستون': 'ضریب مصرف در ۱ واحد', 'توضیحات': 'تعداد یا مقدار مورد نیاز از این قطعه برای ساخت ۱ واحد از محصول' },
    { 'ستون': 'درصد ضایعات', 'توضیحات': 'درصد پیش‌بینی ضایعات خط تولید مثلا ۲ برای ۲ درصد' }
  ];
  const helpWs = XLSX.utils.json_to_sheet(helpSheet);
  XLSX.utils.book_append_sheet(workbook, helpWs, 'راهنما');

  const itemRef = items.map(i => ({
    'کد کالا': i.code,
    'نام کالا': i.name,
    'نوع': ITEM_TYPE_EN_TO_FA[i.itemType] || i.itemType,
    'واحد': i.unit
  }));
  const itemWs = XLSX.utils.json_to_sheet(itemRef);
  XLSX.utils.book_append_sheet(workbook, itemWs, 'کدهای کالا');

  XLSX.writeFile(workbook, 'Template_BOM_Import.xlsx');
}

/**
 * Parse and Validate Excel file for BOMs, returning structured BOM objects
 */
export async function parseBOMsFromExcel(
  file: File | ArrayBuffer,
  items: Item[],
  projects: Project[] = []
): Promise<{
  success: boolean;
  boms: Omit<BOM, 'id' | 'createdAt'>[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  totalRowsParsed: number;
}> {
  try {
    let dataBuffer: ArrayBuffer;
    if (file instanceof File) {
      dataBuffer = await file.arrayBuffer();
    } else {
      dataBuffer = file;
    }

    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const { rawRows } = extractRowsFromWorkbook(workbook);

    if (!rawRows || rawRows.length === 0) {
      return { 
        success: false, 
        boms: [], 
        errors: ['هیچ ردیفی در فایل اکسل یافت نشد.'], 
        warnings: [], 
        totalRows: 0,
        totalRowsParsed: 0
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const itemByCode = new Map<string, Item>();
    items.forEach(it => {
      if (it.code) itemByCode.set(it.code.toLowerCase().trim(), it);
    });

    const projectByCode = new Map<string, Project>();
    projects.forEach(p => {
      if (p.code) projectByCode.set(p.code.toLowerCase().trim(), p);
    });

    // Group rows by key: `finishedItemCode:::bomName:::version`
    const bomGroups = new Map<string, {
      finishedItemId: string;
      finishedItemCode: string;
      name: string;
      version: string;
      description?: string;
      projectId?: string;
      items: BOMItem[];
    }>();

    let validRowsCount = 0;

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;

      const finCode = parseSafeString(getRowField(row, [
        'کد کالای نهایی/نیمه‌ساخته', 
        'کد کالای نهایی', 
        'کد محصول', 
        'کد والد', 
        'کد مادر', 
        'finisheditemcode', 
        'finished_item_code', 
        'parentcode',
        'parent_code'
      ]));

      const bomName = parseSafeString(getRowField(row, [
        'نام فرمول ساخت', 
        'عنوان فرمول', 
        'نام فرمول', 
        'نام bom', 
        'bomname', 
        'bom_name', 
        'formulaname'
      ]) || `فرمول ساخت ${finCode || ''}`);

      const version = parseSafeString(getRowField(row, [
        'نسخه فرمول', 
        'نسخه', 
        'ورژن', 
        'version', 
        'ver'
      ]) || 'v1.0');

      const compCode = parseSafeString(getRowField(row, [
        'کد قطعه تشکیل‌دهنده', 
        'کد قطعه', 
        'کد کامپوننت', 
        'کد فرزند', 
        'componentcode', 
        'component_code', 
        'itemcode', 
        'item_code', 
        'part_code'
      ]));

      const qtyRaw = getRowField(row, [
        'ضریب مصرف در ۱ واحد', 
        'ضریب مصرف', 
        'تعداد در واحد', 
        'مقدار مصرف', 
        'تعداد', 
        'مقدار', 
        'quantity', 
        'quantityneeded', 
        'qty'
      ]);
      const qty = parseSafeNumber(qtyRaw, -1);

      if (!finCode && !compCode && qtyRaw === undefined) {
        return; // skip completely empty row
      }

      if (!finCode) {
        errors.push(`ردیف ${rowNum}: ستون «کد کالای نهایی/نیمه‌ساخته» خالی است.`);
        return;
      }

      if (!compCode) {
        errors.push(`ردیف ${rowNum}: ستون «کد قطعه تشکیل‌دهنده» خالی است.`);
        return;
      }

      const matchedFinItem = itemByCode.get(finCode.toLowerCase());
      if (!matchedFinItem) {
        errors.push(`ردیف ${rowNum}: کالای نهایی با کد "${finCode}" در سامانه یافت نشد.`);
        return;
      }

      const matchedCompItem = itemByCode.get(compCode.toLowerCase());
      if (!matchedCompItem) {
        errors.push(`ردیف ${rowNum}: قطعه تشکیل‌دهنده با کد "${compCode}" در سامانه یافت نشد.`);
        return;
      }

      if (qty <= 0) {
        errors.push(`ردیف ${rowNum}: مقدار ضریب مصرف (${qtyRaw || 'خالی'}) باید یک عدد مثبت بزرگتر از صفر باشد.`);
        return;
      }

      const unit = parseSafeString(getRowField(row, ['واحد سنجش قطعه', 'واحد', 'واحد قطعه', 'unit']) || matchedCompItem.unit || 'عدد');
      const scrap = parseSafeNumber(getRowField(row, ['درصد ضایعات (Scrap %)', 'درصد ضایعات', 'ضایعات', 'درصد پرت', 'scrappercent', 'scrap']), 0);
      const projCode = parseSafeString(getRowField(row, ['کد پروژه تخصیصی (اختیاری)', 'کد پروژه', 'پروژه', 'projectcode', 'project_code']) || '');
      const desc = parseSafeString(getRowField(row, ['توضیحات', 'شرح', 'description', 'notes']) || '');

      const proj = projCode ? projectByCode.get(projCode.toLowerCase()) : undefined;

      const groupKey = `${matchedFinItem.id}:::${bomName}:::${version}`;
      if (!bomGroups.has(groupKey)) {
        bomGroups.set(groupKey, {
          finishedItemId: matchedFinItem.id,
          finishedItemCode: matchedFinItem.code,
          name: bomName,
          version: version,
          description: desc,
          projectId: proj?.id,
          items: []
        });
      }

      const existingBom = bomGroups.get(groupKey)!;
      const alreadyHasComp = existingBom.items.find(it => it.itemId === matchedCompItem.id);
      if (alreadyHasComp) {
        alreadyHasComp.quantityNeeded += qty;
        warnings.push(`ردیف ${rowNum}: قطعه "${compCode}" در فرمول "${bomName}" تکرار شده بود، مقادیر با هم جمع شدند.`);
      } else {
        existingBom.items.push({
          itemId: matchedCompItem.id,
          quantityNeeded: qty,
          unit: unit,
          scrapAllowancePercent: scrap
        });
      }
      validRowsCount++;
    });

    const finalBOMs: Omit<BOM, 'id' | 'createdAt'>[] = Array.from(bomGroups.values()).map(b => ({
      finishedItemId: b.finishedItemId,
      name: b.name,
      version: b.version,
      items: b.items,
      description: b.description,
      isActive: true,
      projectId: b.projectId
    }));

    return {
      success: finalBOMs.length > 0,
      boms: finalBOMs,
      errors,
      warnings,
      totalRows: rawRows.length,
      totalRowsParsed: validRowsCount
    };
  } catch (err: any) {
    return {
      success: false,
      boms: [],
      errors: [`خطا در تحلیل فایل اکسل فرمول ساخت: ${err?.message || 'قالب نامعتبر است'}`],
      warnings: [],
      totalRows: 0,
      totalRowsParsed: 0
    };
  }
}
