import * as XLSX from 'xlsx';
import { Item, ItemType, ItemGroup, Warehouse, InventoryBalance, BOM, BOMItem, Project } from '../types';

// =========================================================================
//  EXCEL UTILITIES FOR ITEMS (MASTER DATA)
// =========================================================================

export const ITEM_TYPE_FA_MAP: Record<string, ItemType> = {
  'مواد اولیه': 'RawMaterial',
  'مواداولیه': 'RawMaterial',
  'RawMaterial': 'RawMaterial',
  'قطعه': 'Component',
  'قطعه الکترونیک': 'Component',
  'قطعات': 'Component',
  'Component': 'Component',
  'نیمه ساخته': 'SemiFinished',
  'نیمه‌ساخته': 'SemiFinished',
  'برد نیمه ساخته': 'SemiFinished',
  'SemiFinished': 'SemiFinished',
  'محصول نهایی': 'Finished',
  'محصول': 'Finished',
  'Finished': 'Finished',
  'ابزار': 'Tool',
  'Tool': 'Tool',
  'مصرفی': 'Consumable',
  'Consumable': 'Consumable',
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
    'زیرگروه': it.subGroup,
    'واحد سنجش': it.unit,
    'بارکد': it.barcode,
    'حداقل موجودی': it.minStock,
    'حداکثر موجودی': it.maxStock,
    'قیمت واحد (تومان)': it.unitPrice,
    'موقعیت قفسه': it.locationInRack || '',
    'توضیحات': it.description || '',
    'تاریخ ایجاد': it.createdAt || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'کاتالوگ کالاها');
  
  // Auto-width columns
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
  
  // Guidelines sheet
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
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, items: [], groupsToCreate: [], errors: ['فایل اکسل فاقد کاربرگ معتبر است.'], totalRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (!rows || rows.length === 0) {
      return { success: false, items: [], groupsToCreate: [], errors: ['هیچ ردیف داده‌ای در فایل اکسل یافت نشد.'], totalRows: 0 };
    }

    const items: Omit<Item, 'id' | 'createdAt'>[] = [];
    const groupsToCreate: { name: string; subGroup: string }[] = [];
    const errors: string[] = [];
    const seenCodes = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const code = String(row['کد کالا'] || row['کد'] || row['ItemCode'] || row['Code'] || '').trim();
      const name = String(row['نام کالا / قطعه'] || row['نام کالا'] || row['نام'] || row['ItemName'] || row['Name'] || '').trim();
      
      if (!code && !name) {
        // Skip empty row
        return;
      }

      if (!code) {
        errors.push(`ردیف ${rowNum}: کد کالا الزامی است.`);
        return;
      }

      if (!name) {
        errors.push(`ردیف ${rowNum}: نام کالا الزامی است.`);
        return;
      }

      if (seenCodes.has(code.toLowerCase())) {
        errors.push(`ردیف ${rowNum}: کد کالای تکراری "${code}" در فایل وجود دارد.`);
        return;
      }
      seenCodes.add(code.toLowerCase());

      const rawType = String(row['نوع کالا'] || row['نوع'] || row['ItemType'] || row['Type'] || 'Component').trim();
      const itemType = ITEM_TYPE_FA_MAP[rawType] || 'Component';

      const group = String(row['گروه اصلی'] || row['گروه'] || row['Group'] || 'عمومی').trim();
      const subGroup = String(row['زیرگروه'] || row['SubGroup'] || 'عمومی').trim();
      const unit = String(row['واحد سنجش'] || row['واحد'] || row['Unit'] || 'عدد').trim();
      const barcode = String(row['بارکد'] || row['Barcode'] || code).trim();
      const minStock = Number(row['حداقل موجودی'] || row['MinStock'] || 0) || 0;
      const maxStock = Number(row['حداکثر موجودی'] || row['MaxStock'] || 1000) || 1000;
      const unitPrice = Number(row['قیمت واحد (تومان)'] || row['قیمت واحد'] || row['قیمت'] || row['UnitPrice'] || row['Price'] || 0) || 0;
      const locationInRack = String(row['موقعیت قفسه'] || row['قفسه'] || row['Location'] || '').trim();
      const description = String(row['توضیحات'] || row['Description'] || '').trim();

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

      groupsToCreate.push({ name: group, subGroup });
    });

    return {
      success: items.length > 0,
      items,
      groupsToCreate,
      errors,
      totalRows: rows.length
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      groupsToCreate: [],
      errors: [`خطا در خواندن فایل اکسل: ${err?.message || 'قالب نامعتبر'}`],
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
      'موجودی فعلی': inv.quantity,
      'واحد سنجش': it?.unit || 'عدد',
      'موجودی رزرو شده': inv.reservedQuantity || 0,
      'موجودی قابل استفاده': inv.quantity - (inv.reservedQuantity || 0),
      'ارزش واحد (تومان)': it?.unitPrice || 0,
      'ارزش کل موجودی (تومان)': (inv.quantity * (it?.unitPrice || 0)),
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
}> {
  try {
    let dataBuffer: ArrayBuffer;
    if (file instanceof File) {
      dataBuffer = await file.arrayBuffer();
    } else {
      dataBuffer = file;
    }

    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, rows: [], errors: ['فایل اکسل فاقد کاربرگ است.'], warnings: [], totalRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (!rawRows || rawRows.length === 0) {
      return { success: false, rows: [], errors: ['هیچ ردیف داده‌ای در فایل اکسل یافت نشد.'], warnings: [], totalRows: 0 };
    }

    const parsedRows: InitialStockParsedRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Lookup maps
    const itemByCode = new Map<string, Item>();
    const itemByBarcode = new Map<string, Item>();
    const itemByName = new Map<string, Item>();
    items.forEach(it => {
      itemByCode.set(it.code.toLowerCase().trim(), it);
      if (it.barcode) itemByBarcode.set(it.barcode.trim(), it);
      itemByName.set(it.name.toLowerCase().trim(), it);
    });

    const warehouseByCode = new Map<string, Warehouse>();
    const warehouseByName = new Map<string, Warehouse>();
    warehouses.forEach(w => {
      warehouseByCode.set(w.code.toLowerCase().trim(), w);
      warehouseByName.set(w.name.toLowerCase().trim(), w);
    });

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const whCodeInput = String(row['کد انبار'] || row['WarehouseCode'] || row['انبار'] || row['Warehouse'] || '').trim();
      const whNameInput = String(row['نام انبار (اختیاری)'] || row['نام انبار'] || row['WarehouseName'] || '').trim();

      const itemCodeInput = String(row['کد کالا'] || row['ItemCode'] || row['کد'] || '').trim();
      const itemNameInput = String(row['نام کالا (اختیاری)'] || row['نام کالا'] || row['نام'] || row['ItemName'] || '').trim();
      const barcodeInput = String(row['بارکد'] || row['Barcode'] || '').trim();

      const qtyRaw = row['تعداد موجودی ابتدای دوره'] || row['موجودی ابتدای دوره'] || row['تعداد'] || row['موجودی'] || row['Quantity'] || row['InitialQuantity'];
      const qty = Number(qtyRaw);

      if (!whCodeInput && !whNameInput && !itemCodeInput && !itemNameInput) {
        return; // skip empty row
      }

      // 1. Resolve Warehouse
      let matchedWh = warehouseByCode.get(whCodeInput.toLowerCase());
      if (!matchedWh && whNameInput) {
        matchedWh = warehouseByName.get(whNameInput.toLowerCase());
      }
      if (!matchedWh && warehouses.length === 1) {
        matchedWh = warehouses[0];
      }

      if (!matchedWh) {
        errors.push(`ردیف ${rowNum}: انبار با کد "${whCodeInput}" یا نام "${whNameInput}" در سیستم تعریف نشده است.`);
        return;
      }

      // 2. Resolve Item
      let matchedItem = itemByCode.get(itemCodeInput.toLowerCase());
      if (!matchedItem && barcodeInput) {
        matchedItem = itemByBarcode.get(barcodeInput);
      }
      if (!matchedItem && itemNameInput) {
        matchedItem = itemByName.get(itemNameInput.toLowerCase());
      }

      if (!matchedItem) {
        errors.push(`ردیف ${rowNum}: کالایی با کد "${itemCodeInput}" یا نام "${itemNameInput}" یافت نشد. ابتدا کالا را در سیستم ثبت کنید.`);
        return;
      }

      // 3. Validate Quantity
      if (isNaN(qty) || qty < 0) {
        errors.push(`ردیف ${rowNum}: مقدار موجودی (${qtyRaw}) باید یک عدد معتبر بزرگتر یا مساوی صفر باشد.`);
        return;
      }

      const unitPrice = Number(row['قیمت واحد (تومان)'] || row['قیمت واحد'] || row['قیمت'] || row['UnitPrice'] || matchedItem.unitPrice || 0);
      const locationInRack = String(row['موقعیت قفسه (اختیاری)'] || row['موقعیت قفسه'] || row['Location'] || matchedItem.locationInRack || '').trim();
      const notes = String(row['یادداشت / شماره سند'] || row['توضیحات'] || row['یادداشت'] || row['Notes'] || 'ثبت موجودی ابتدای دوره از طریق اکسل').trim();

      parsedRows.push({
        warehouseId: matchedWh.id,
        warehouseCodeOrName: matchedWh.name,
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
      totalRows: rawRows.length
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      errors: [`خطا در بارگذاری موجودی ابتدای دوره از اکسل: ${err?.message || 'فرمت نامعتبر'}`],
      warnings: [],
      totalRows: 0
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

  // Help sheet
  const helpSheet = [
    { 'ستون': 'کد کالای نهایی/نیمه‌ساخته', 'توضیحات': 'کد کالایی که قرار است ساخته شود (محصول نهایی یا نیمه‌ساخته)' },
    { 'ستون': 'نام فرمول ساخت', 'توضیحات': 'عنوان کلی فرمول' },
    { 'ستون': 'کد قطعه تشکیل‌دهنده', 'توضیحات': 'کد قطعه اولیه، کامپوننت یا نیمه‌ساخته مصرفی' },
    { 'ستون': 'ضریب مصرف در ۱ واحد', 'توضیحات': 'تعداد یا مقدار مورد نیاز از این قطعه برای ساخت ۱ واحد از محصول' },
    { 'ستون': 'درصد ضایعات', 'توضیحات': 'درصد پیش‌بینی ضایعات خط تولید مثلا ۲ برای ۲ درصد' }
  ];
  const helpWs = XLSX.utils.json_to_sheet(helpSheet);
  XLSX.utils.book_append_sheet(workbook, helpWs, 'راهنما');

  // Items reference sheet
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
}> {
  try {
    let dataBuffer: ArrayBuffer;
    if (file instanceof File) {
      dataBuffer = await file.arrayBuffer();
    } else {
      dataBuffer = file;
    }

    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, boms: [], errors: ['فایل اکسل فاقد کاربرگ معتبر است.'], warnings: [], totalRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (!rawRows || rawRows.length === 0) {
      return { success: false, boms: [], errors: ['هیچ ردیفی در فایل اکسل یافت نشد.'], warnings: [], totalRows: 0 };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const itemByCode = new Map<string, Item>();
    items.forEach(it => itemByCode.set(it.code.toLowerCase().trim(), it));

    const projectByCode = new Map<string, Project>();
    projects.forEach(p => projectByCode.set(p.code.toLowerCase().trim(), p));

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

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const finCode = String(
        row['کد کالای نهایی/نیمه‌ساخته'] || 
        row['کد کالای نهایی'] || 
        row['کد محصول'] || 
        row['FinishedItemCode'] || 
        row['ParentCode'] || ''
      ).trim();

      const bomName = String(
        row['نام فرمول ساخت'] || 
        row['عنوان فرمول'] || 
        row['نام فرمول'] || 
        row['BOMName'] || 
        `فرمول ساخت ${finCode}`
      ).trim();

      const version = String(row['نسخه فرمول'] || row['نسخه'] || row['Version'] || 'v1.0').trim();

      const compCode = String(
        row['کد قطعه تشکیل‌دهنده'] || 
        row['کد قطعه'] || 
        row['کد کامپوننت'] || 
        row['ComponentCode'] || 
        row['ItemCode'] || ''
      ).trim();

      const qtyRaw = row['ضریب مصرف در ۱ واحد'] || row['تعداد در واحد'] || row['مقدار مصرف'] || row['تعداد'] || row['Quantity'] || row['QuantityNeeded'];
      const qty = Number(qtyRaw);

      if (!finCode && !compCode) {
        return; // skip empty
      }

      if (!finCode) {
        errors.push(`ردیف ${rowNum}: کد کالای نهایی/نیمه‌ساخته خالی است.`);
        return;
      }

      if (!compCode) {
        errors.push(`ردیف ${rowNum}: کد قطعه تشکیل‌دهنده خالی است.`);
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

      if (isNaN(qty) || qty <= 0) {
        errors.push(`ردیف ${rowNum}: مقدار ضریب مصرف (${qtyRaw}) باید یک عدد مثبت باشد.`);
        return;
      }

      const unit = String(row['واحد سنجش قطعه'] || row['واحد'] || row['Unit'] || matchedCompItem.unit || 'عدد').trim();
      const scrap = Number(row['درصد ضایعات (Scrap %)'] || row['درصد ضایعات'] || row['ScrapPercent'] || 0) || 0;
      const projCode = String(row['کد پروژه تخصیصی (اختیاری)'] || row['کد پروژه'] || row['ProjectCode'] || '').trim();
      const desc = String(row['توضیحات'] || row['Description'] || '').trim();

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
      // Check duplicate component in same BOM
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
      totalRows: rawRows.length
    };
  } catch (err: any) {
    return {
      success: false,
      boms: [],
      errors: [`خطا در تحلیل فایل اکسل فرمول ساخت: ${err?.message || 'قالب نامعتبر'}`],
      warnings: [],
      totalRows: 0
    };
  }
}
