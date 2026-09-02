import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, 
  ArrowDownLeft, ArrowUpRight, Check, AlertTriangle, Building2, UserCheck, Eye
} from 'lucide-react';
import { 
  generateStockMovementItemsTemplate, 
  parseStockMovementItemsFromExcel, 
  StockMovementParsedItem 
} from '../utils/excelUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  docType?: 'IN' | 'OUT';
  initialDocType?: 'IN' | 'OUT';
  mode?: 'apply_to_form' | 'create_new_doc';
  onApplyItems?: (items: { itemId: string; quantity: number; unitPrice: number; notes: string }[]) => void;
}

export const StockMovementExcelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  docType = 'IN',
  initialDocType,
  mode = 'apply_to_form',
  onApplyItems
}) => {
  const effectiveDocType = initialDocType || docType;
  const { 
    items, warehouses, language, currentUser, 
    createStockInDoc, createStockOutDoc 
  } = useApp();

  const isFa = language === 'fa';
  const isStockIn = effectiveDocType === 'IN';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    success: boolean;
    parsedItems: StockMovementParsedItem[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    totalQuantity: number;
    totalCalculatedValue: number;
  } | null>(null);

  // New Doc Form State if mode === 'create_new_doc'
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [partyName, setPartyName] = useState<string>(
    isStockIn ? 'تامین‌کننده / فروشنده' : 'واحد متقاضی / کارگاه تولید'
  );
  const [movementType, setMovementType] = useState<string>(
    isStockIn ? 'Purchase' : 'ProjectConsumption'
  );
  const [docNotes, setDocNotes] = useState<string>('ثبت دسته‌جمعی اقلام از طریق فایل اکسل');

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setParsedResult(null);
    setIsParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);

    try {
      const res = await parseStockMovementItemsFromExcel(file, items);
      setParsedResult(res);
    } catch (err: any) {
      setParsedResult({
        success: false,
        parsedItems: [],
        errors: [`خطا در بارگذاری فایل: ${err?.message || 'فایل نامعتبر است'}`],
        warnings: [],
        totalRows: 0,
        totalQuantity: 0,
        totalCalculatedValue: 0
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyToForm = () => {
    if (!parsedResult || parsedResult.parsedItems.length === 0) return;

    if (onApplyItems) {
      const formattedItems = parsedResult.parsedItems.map(p => ({
        itemId: p.itemId,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        notes: p.notes
      }));
      onApplyItems(formattedItems);
    }

    handleReset();
    onClose();
  };

  const handleCreateDocumentDirectly = () => {
    if (!parsedResult || parsedResult.parsedItems.length === 0) return;
    if (!selectedWarehouseId) return;

    const today = new Date().toISOString().substring(0, 10);
    const prefix = isStockIn ? 'REC-XLS-' : 'ISS-XLS-';
    const docNumber = `${prefix}${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const formattedItems = parsedResult.parsedItems.map(p => ({
      itemId: p.itemId,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      notes: p.notes
    }));

    if (isStockIn) {
      createStockInDoc({
        docNumber,
        date: today,
        supplier: partyName || 'ثبت اکسل',
        registeredBy: currentUser.fullName || 'مسئول انبار',
        warehouseId: selectedWarehouseId,
        entryType: movementType as any,
        status: 'Confirmed',
        notes: docNotes || 'ثبت خودکار رسید ورود از اکسل',
        items: formattedItems
      });
    } else {
      createStockOutDoc({
        docNumber,
        date: today,
        recipient: partyName || 'ثبت اکسل',
        registeredBy: currentUser.fullName || 'مسئول انبار',
        warehouseId: selectedWarehouseId,
        exitType: movementType as any,
        status: 'Confirmed',
        notes: docNotes || 'ثبت خودکار حواله خروج از اکسل',
        items: formattedItems
      });
    }

    handleReset();
    onClose();
  };

  const docTitle = isStockIn ? 'رسید ورود کالا' : 'حواله خروج کالا';
  const IconHeader = isStockIn ? ArrowDownLeft : ArrowUpRight;
  const headerColor = isStockIn ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${headerColor}`}>
              <IconHeader className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isFa ? `بارگذاری اقلام ${docTitle} از اکسل` : `Import ${docTitle} Items from Excel`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFa 
                  ? 'ورود سریع صدها قلم کالا، تعداد، فی و ردیف‌ها با فرمت استاندارد اکسل' 
                  : 'Fast batch import of items, quantities, prices, and notes via Excel'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          {/* Download Template Banner */}
          <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/50 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-indigo-900 text-xs">
                  {isFa ? 'هنوز فایل اکسل آماده ندارید؟' : 'Need the Excel Template?'}
                </div>
                <div className="text-[11px] text-indigo-700/80 mt-0.5 leading-relaxed">
                  {isFa 
                    ? 'قالب اکسل استاندارد به همراه جدول کدهای معتبر کالاها و ستون‌های مورد نیاز را دریافت کنید.' 
                    : 'Download the standardized template containing columns and all registered item codes.'}
                </div>
              </div>
            </div>
            <button
              onClick={() => generateStockMovementItemsTemplate(docType, items, warehouses)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isFa ? 'دریافت قالب نمونه اکسل' : 'Download Template'}</span>
            </button>
          </div>

          {/* Upload Area */}
          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm mb-1">
                {isFa ? 'کلیک کنید یا فایل اکسل را اینجا بکشید و رها کنید' : 'Click to select or drag & drop Excel file'}
              </div>
              <div className="text-slate-400 text-[11px]">
                {isFa ? 'پشتیبانی از فایل‌های XLSX، XLS و CSV با تطبیق هوشمند کدهای کالا' : 'Supports .xlsx, .xls, .csv with fuzzy code matching'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-400 mr-2">
                      ({Math.round(selectedFile.size / 1024)} KB)
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                >
                  {isFa ? 'تغییر فایل' : 'Change File'}
                </button>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{isFa ? 'در حال تحلیل و بررسی کدهای کالا در اکسل...' : 'Analyzing Excel rows and validating items...'}</span>
                </div>
              )}

              {/* Results & Summary */}
              {parsedResult && !isParsing && (
                <div className="space-y-3">
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-400 text-[10px]">{isFa ? 'تعداد اقلام تاییدشده' : 'Parsed Valid Items'}</div>
                      <div className="text-base font-bold text-indigo-600 font-mono mt-0.5">
                        {parsedResult.parsedItems.length.toLocaleString('fa-IR')} {isFa ? 'ردیف' : 'items'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-400 text-[10px]">{isFa ? 'مجموع تعداد کل واحدها' : 'Total Quantity'}</div>
                      <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                        {parsedResult.totalQuantity.toLocaleString('fa-IR')} {isFa ? 'واحد' : 'units'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-400 text-[10px]">{isFa ? 'ارزش ریالی کل اقلام' : 'Total Value'}</div>
                      <div className="text-base font-bold text-slate-800 font-mono mt-0.5">
                        {parsedResult.totalCalculatedValue.toLocaleString('fa-IR')} {isFa ? 'تومان' : 'Toman'}
                      </div>
                    </div>
                  </div>

                  {/* Errors / Warnings Box */}
                  {parsedResult.errors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>{isFa ? 'خطاهای اعتبارسنجی کالاها:' : 'Validation Errors:'}</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                        {parsedResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedResult.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>{isFa ? 'هشدارهای اکسل:' : 'Excel Warnings:'}</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                        {parsedResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Table of Parsed Items */}
                  {parsedResult.parsedItems.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className={`w-full text-[11px] ${isFa ? 'text-right' : 'text-left'}`}>
                        <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">{isFa ? 'کد کالا' : 'Item Code'}</th>
                            <th className="p-2">{isFa ? 'نام کالا' : 'Item Name'}</th>
                            <th className="p-2">{isFa ? 'تعداد' : 'Qty'}</th>
                            <th className="p-2">{isFa ? 'قیمت واحد' : 'Unit Price'}</th>
                            <th className="p-2">{isFa ? 'توضیحات' : 'Notes'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedResult.parsedItems.map((pItem, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2 font-mono font-bold text-indigo-600">{pItem.itemCode}</td>
                              <td className="p-2 font-semibold text-slate-800">{pItem.itemName}</td>
                              <td className="p-2 font-mono font-bold text-emerald-600">
                                {pItem.quantity.toLocaleString('fa-IR')} {pItem.unit}
                              </td>
                              <td className="p-2 font-mono text-slate-600">
                                {pItem.unitPrice ? `${pItem.unitPrice.toLocaleString('fa-IR')} تومان` : '-'}
                              </td>
                              <td className="p-2 text-slate-500 truncate max-w-[150px]">{pItem.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Extra form fields if creating new document directly */}
                  {mode === 'create_new_doc' && parsedResult.parsedItems.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-3 bg-slate-50 -mx-5 -mb-5 p-5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{isFa ? 'مشخصات سند رسید/حواله جدید:' : 'New Document Details:'}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {isFa ? (isStockIn ? 'انبار مقصد ورودی' : 'انبار مبدا خروجی') : 'Target Warehouse'}
                          </label>
                          <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                          >
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {isFa ? (isStockIn ? 'تامین‌کننده / فروشنده' : 'تحویل‌گیرنده / متقاضی') : 'Party Name'}
                          </label>
                          <input
                            type="text"
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {isFa ? 'شرح و یادداشت سند' : 'Document Notes'}
                        </label>
                        <input
                          type="text"
                          value={docNotes}
                          onChange={(e) => setDocNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-xs rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            {isFa ? 'انصراف' : 'Cancel'}
          </button>

          {parsedResult && parsedResult.parsedItems.length > 0 && (
            <div>
              {mode === 'apply_to_form' ? (
                <button
                  onClick={handleApplyToForm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isFa ? `افزودن ${parsedResult.parsedItems.length} قلم به سند` : `Add ${parsedResult.parsedItems.length} items to form`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleCreateDocumentDirectly}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isFa ? 'ایجاد و ثبت قطعی سند در سامانه' : 'Register Document Now'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
