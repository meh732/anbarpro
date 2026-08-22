import React from 'react';
import { 
  X, Printer, FileText, CheckCircle2, ShieldCheck, Building2, 
  UserCheck, Hash, Calendar, QrCode, ArrowDownLeft, ArrowUpRight,
  Boxes, Truck, ShoppingCart, Cpu, Check
} from 'lucide-react';
import { Item, Warehouse } from '../types';
import { formatPersianAmountWithWords } from '../utils/persianUtils';

export type OfficialDocType = 'STOCK_IN' | 'STOCK_OUT' | 'PURCHASE_REQUEST' | 'TRANSFER' | 'BOM';

export interface OfficialDocData {
  type: OfficialDocType;
  docNumber: string;
  date: string;
  status: string;
  // Parties & locations
  sourceWarehouseName?: string;
  targetWarehouseName?: string;
  partyName?: string; // Supplier, Recipient, Requesting Unit
  requesterName?: string;
  issuerName?: string;
  projectName?: string;
  categoryLabel?: string;
  urgency?: string;
  notes?: string;
  // Items
  items: Array<{
    itemId: string;
    itemCode?: string;
    itemName?: string;
    unit?: string;
    barcode?: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
    reason?: string;
    warehouseLocation?: string;
  }>;
  // Transport info if available
  handlerName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
}

interface Props {
  doc: OfficialDocData | null;
  allItems: Item[];
  allWarehouses: Warehouse[];
  companyName?: string;
  onClose: () => void;
}

export const OfficialDocumentViewerModal: React.FC<Props> = ({
  doc,
  allItems,
  allWarehouses,
  companyName = 'شرکت رویال سامانه - صنایع تولیدی و الکترونیک',
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!doc) return null;

  // Enrich item lines with database details
  const enrichedItems = doc.items.map(it => {
    const raw = allItems.find(i => i.id === it.itemId || i.code === it.itemId || i.code === it.itemCode);
    const itemCode = it.itemCode || raw?.code || it.itemId;
    const itemName = it.itemName || raw?.name || 'کالای ثبت شده در سامانه';
    const unit = it.unit || raw?.unit || 'عدد';
    const barcode = it.barcode || raw?.barcode || '-';
    const unitPrice = it.unitPrice !== undefined ? it.unitPrice : (raw?.unitPrice || 0);
    const totalPrice = unitPrice * it.quantity;
    const location = it.warehouseLocation || (raw?.locationInWarehouse ? `${raw.locationInWarehouse.rack || ''} ${raw.locationInWarehouse.shelf || ''}` : '-');

    return {
      ...it,
      itemCode,
      itemName,
      unit,
      barcode,
      unitPrice,
      totalPrice,
      location,
    };
  });

  const totalQuantity = enrichedItems.reduce((s, it) => s + it.quantity, 0);
  const totalAmount = enrichedItems.reduce((s, it) => s + it.totalPrice, 0);
  const { words: totalAmountWords } = formatPersianAmountWithWords(totalAmount, 'تومان');

  // Title and ISO Codes mapping
  const docConfig = {
    STOCK_IN: {
      title: 'رسید رسمی ورود کالا به انبار (انبارداری و خرید)',
      englishTitle: 'GOODS RECEIPT NOTE (GRN)',
      code: 'FORM-WRH-101 / Rev. 03',
      color: 'emerald',
      partyLabel: 'تامین‌کننده / مبدا تحویل',
      warehouseLabel: 'انبار مقصد (تحویل‌گیرنده)',
      icon: ArrowDownLeft,
    },
    STOCK_OUT: {
      title: 'حواله رسمی خروج کالا از انبار (مصرف و تحویل)',
      englishTitle: 'GOODS ISSUE VOUCHER (GIV)',
      code: 'FORM-WRH-102 / Rev. 03',
      color: 'rose',
      partyLabel: 'تحویل‌گیرنده / واحد متقاضی',
      warehouseLabel: 'انبار مبدا (تحویل‌دهنده)',
      icon: ArrowUpRight,
    },
    PURCHASE_REQUEST: {
      title: 'فرم رسمی درخواست کالا و تامین قطعات (PR)',
      englishTitle: 'INTERNAL PURCHASE REQUISITION NOTE',
      code: 'FORM-PUR-201 / Rev. 02',
      color: 'indigo',
      partyLabel: 'واحد درخواست‌کننده',
      warehouseLabel: 'انبار / محل مصرف',
      icon: ShoppingCart,
    },
    TRANSFER: {
      title: 'حواله رسمی جابجایی و انتقال بین انبارها',
      englishTitle: 'INTER-WAREHOUSE TRANSFER NOTE',
      code: 'FORM-WRH-103 / Rev. 04',
      color: 'blue',
      partyLabel: 'مسئول حمل / ترابری',
      warehouseLabel: 'انبار مبدا / انبار مقصد',
      icon: Truck,
    },
    BOM: {
      title: 'شناسنامه و فرمول مهندسی ساخت محصول (BOM)',
      englishTitle: 'BILL OF MATERIALS SPECIFICATION SHEET',
      code: 'FORM-ENG-301 / Rev. 01',
      color: 'purple',
      partyLabel: 'محصول نهایی هدف',
      warehouseLabel: 'خط تولید و مونتاژ',
      icon: Cpu,
    },
  }[doc.type];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDocNum = () => {
    navigator.clipboard.writeText(doc.docNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none print:w-full">
        
        {/* Modal Web Controls (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-600 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                مشاهده و پرینت سند اداری: <span className="font-mono text-indigo-300">{doc.docNumber}</span>
              </h3>
              <p className="text-[11px] text-slate-400">طراحی استاندارد فرم سازمانی با قابلیت چاپ رسمی A4</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDocNum}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              title="کپی شماره سند"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Hash className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی شماره سند'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فرم رسمی (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div id="printable-official-doc" className="p-6 sm:p-8 overflow-y-auto space-y-5 bg-white text-slate-900 print:p-0 print:overflow-visible">
          
          {/* ======================================================== */}
          {/* 1. Official Corporate Header */}
          {/* ======================================================== */}
          <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50/50">
            <div className="grid grid-cols-12 items-center gap-4 border-b-2 border-slate-900 pb-3">
              
              {/* Right: Company Logo & Info */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-black text-xl shadow-xs border border-indigo-700 shrink-0">
                  ERP
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {companyName}
                  </h2>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
                    سیستم یکپارچه مدیریت انبار، تولید و تدارکات
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    ISO 9001:2015 Certified System
                  </p>
                </div>
              </div>

              {/* Center: Document Title */}
              <div className="col-span-5 text-center">
                <div className="inline-block border-2 border-slate-900 bg-white px-4 py-1.5 rounded-lg shadow-2xs">
                  <h1 className="text-sm sm:text-base font-black text-slate-900">
                    {docConfig.title}
                  </h1>
                </div>
                <div className="text-[10px] font-bold tracking-wider text-slate-600 font-mono mt-1">
                  {docConfig.englishTitle}
                </div>
              </div>

              {/* Left: Metadata & Tracking Info */}
              <div className="col-span-3 text-left space-y-1 text-[11px] font-medium text-slate-800 bg-white p-2 rounded-lg border border-slate-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 text-[10px]">شماره سند:</span>
                  <span className="font-mono font-black text-xs text-slate-900">{doc.docNumber}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 text-[10px]">تاریخ ثبت:</span>
                  <span className="font-mono font-bold text-slate-800">{doc.date}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 text-[10px]">کد فرم:</span>
                  <span className="font-mono text-[9px] text-slate-600">{docConfig.code}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 text-[10px]">وضعیت:</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    {doc.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Header Metadata Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-300">
                <span className="text-[10px] text-slate-500 block mb-0.5">{docConfig.partyLabel}:</span>
                <strong className="text-slate-900 text-xs truncate block">{doc.partyName || doc.requesterName || '-'}</strong>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-300">
                <span className="text-[10px] text-slate-500 block mb-0.5">
                  {doc.type === 'TRANSFER' ? 'انبار مبدا (فرستنده)' : docConfig.warehouseLabel}:
                </span>
                <strong className="text-slate-900 text-xs truncate block">
                  {doc.sourceWarehouseName || doc.targetWarehouseName || 'انبار مرکزی کارخانه'}
                </strong>
              </div>

              {doc.type === 'TRANSFER' ? (
                <div className="bg-white p-2 rounded-lg border border-slate-300">
                  <span className="text-[10px] text-slate-500 block mb-0.5">انبار مقصد (گیرنده):</span>
                  <strong className="text-slate-900 text-xs truncate block">{doc.targetWarehouseName || '-'}</strong>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-lg border border-slate-300">
                  <span className="text-[10px] text-slate-500 block mb-0.5">پروژه / سفارش مرتبط:</span>
                  <strong className="text-slate-900 text-xs truncate block">{doc.projectName || 'عمومی کارخانه'}</strong>
                </div>
              )}

              <div className="bg-white p-2 rounded-lg border border-slate-300">
                <span className="text-[10px] text-slate-500 block mb-0.5">کارشناس صادرکننده:</span>
                <strong className="text-slate-900 text-xs truncate block">{doc.issuerName || doc.requesterName || 'انباردار رسمی'}</strong>
              </div>
            </div>

            {/* Transport / Driver info if available */}
            {(doc.handlerName || doc.vehicleNumber) && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px] bg-slate-100/70 p-1.5 rounded-lg">
                <div>متصدی حمل: <strong>{doc.handlerName || '-'}</strong></div>
                <div>شماره تماس راننده: <strong className="font-mono">{doc.driverPhone || '-'}</strong></div>
                <div>پلاک خودرو / بارنامه: <strong>{doc.vehicleNumber || '-'}</strong></div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 2. Official Items Table */}
          {/* ======================================================== */}
          <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-900">
                <tr>
                  <th className="p-2.5 border-l-2 border-slate-900 text-center w-12">ردیف</th>
                  <th className="p-2.5 border-l-2 border-slate-900 w-28">کد کالا</th>
                  <th className="p-2.5 border-l-2 border-slate-900">نام قطعه، مشخصات فنی و متریال</th>
                  <th className="p-2.5 border-l-2 border-slate-900 text-center w-20">واحد</th>
                  <th className="p-2.5 border-l-2 border-slate-900 text-center w-24">تعداد / مقدار</th>
                  <th className="p-2.5 border-l-2 border-slate-900 text-center w-28">نرخ واحد (تومان)</th>
                  <th className="p-2.5 border-l-2 border-slate-900 text-center w-32">مبلغ کل (تومان)</th>
                  <th className="p-2.5 text-center w-36">ملاحظات / محل انبارش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {enrichedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-bold text-slate-700">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900 font-mono font-bold text-slate-900">
                      {item.itemCode}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900">
                      <div className="font-bold text-slate-900">{item.itemName}</div>
                      {item.barcode && item.barcode !== '-' && (
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <QrCode className="w-3 h-3 text-slate-400" />
                          بارکد: {item.barcode}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900 text-center font-medium text-slate-700">
                      {item.unit}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-black text-slate-900 text-sm">
                      {item.quantity.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-medium text-slate-700">
                      {item.unitPrice > 0 ? item.unitPrice.toLocaleString('fa-IR') : '-'}
                    </td>
                    <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-bold text-slate-900">
                      {item.totalPrice > 0 ? item.totalPrice.toLocaleString('fa-IR') : '-'}
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px]">
                      {item.reason || item.notes || item.location || 'تحویل بدون کسری'}
                    </td>
                  </tr>
                ))}

                {/* Empty visual rows for standard corporate form layout if fewer than 3 items */}
                {enrichedItems.length < 3 && Array.from({ length: 3 - enrichedItems.length }).map((_, emptyIdx) => (
                  <tr key={`empty-${emptyIdx}`} className="h-8">
                    <td className="p-2 border-l-2 border-slate-900 text-center font-mono text-slate-300">-</td>
                    <td className="p-2 border-l-2 border-slate-900 text-center text-slate-300">---</td>
                    <td className="p-2 border-l-2 border-slate-900 text-slate-300">---</td>
                    <td className="p-2 border-l-2 border-slate-900 text-center text-slate-300">---</td>
                    <td className="p-2 border-l-2 border-slate-900 text-center text-slate-300">---</td>
                    <td className="p-2 border-l-2 border-slate-900 text-center text-slate-300">---</td>
                    <td className="p-2 border-l-2 border-slate-900 text-center text-slate-300">---</td>
                    <td className="p-2 text-slate-300">---</td>
                  </tr>
                ))}
              </tbody>

              {/* Totals Summary Footer */}
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                <tr>
                  <td colSpan={4} className="p-2.5 border-l-2 border-slate-900 text-left pl-4">
                    <strong>جمع کل اقلام سند:</strong>
                  </td>
                  <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-black text-sm">
                    {totalQuantity.toLocaleString('fa-IR')}
                  </td>
                  <td className="p-2.5 border-l-2 border-slate-900 text-center text-xs text-slate-600">
                    مجموع ریالی:
                  </td>
                  <td className="p-2.5 border-l-2 border-slate-900 text-center font-mono font-black text-sm">
                    {totalAmount > 0 ? `${totalAmount.toLocaleString('fa-IR')} تومان` : '-'}
                  </td>
                  <td className="p-2.5 text-center text-[10px] text-slate-500">
                    تعداد ردیف: {enrichedItems.length} قلم
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Persian Words & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 font-bold">مبلغ کل به حروف:</span>
                <strong className="text-slate-900 text-xs font-bold">{totalAmountWords || 'صفر تومان'}</strong>
              </div>
              {doc.notes && (
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <span className="font-bold">توضیحات و دستورالعمل:</span> {doc.notes}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                تاییدیه کنترل کیفی و انبارداری
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                این سند بر اساس پروتکل بازرسی اقلام صادر شده و پس از امضای طرفین سند قطعی حسابداری انبار محسوب می‌گردد.
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. Official 4-Tier Corporate Signatures */}
          {/* ======================================================== */}
          <div className="pt-2">
            <div className="border-2 border-slate-900 rounded-xl p-4 bg-white">
              <h4 className="text-[11px] font-extrabold text-slate-700 mb-3 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span>تاییدات و امضاهای مجاز سازمانی (چهارگانه):</span>
                <span className="font-mono text-[9px] text-slate-400">Electronic & Physical Stamp Box</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {/* 1. Issuer / Operator */}
                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between h-28">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-800 block">تنظیم‌کننده سند</span>
                    <span className="text-[10px] text-slate-500 block">متصدی ثبت سیستم / کارشناس</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">
                    {doc.issuerName || 'کارشناس انبار'}
                  </div>
                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1">
                    امضا و تاریخ
                  </div>
                </div>

                {/* 2. Deliverer / Supplier */}
                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between h-28">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-800 block">تحویل‌دهنده</span>
                    <span className="text-[10px] text-slate-500 block">تامین‌کننده / راننده / انبار مبدا</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">
                    {doc.handlerName || doc.partyName || '-'}
                  </div>
                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1">
                    امضا و اثر انگشت
                  </div>
                </div>

                {/* 3. Receiver / Warehouse Manager */}
                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between h-28">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-800 block">تحویل‌گیرنده رسمی</span>
                    <span className="text-[10px] text-slate-500 block">مسئول انبار / سرپرست تولید</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">
                    {doc.requesterName || 'انباردار رسمی کارخانه'}
                  </div>
                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1">
                    مهر و امضای انبار
                  </div>
                </div>

                {/* 4. Factory Director / Financial Officer */}
                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between h-28">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-800 block">تصویب مدیریت / مالی</span>
                    <span className="text-[10px] text-slate-500 block">مدیر کارخانه / مدیر تدارکات</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">
                    مدیریت مالی و بازرگانی
                  </div>
                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1">
                    مهر برجسته سازمانی
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Page numbers and print watermark */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-200 font-mono">
            <span>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</span>
            <span>سامانه یکپارچه انبار و زنجیره تامین رویال - صفحه ۱ از ۱</span>
            <span>کد رهگیری امنیتی: {doc.docNumber}-{Date.now().toString().slice(-4)}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
