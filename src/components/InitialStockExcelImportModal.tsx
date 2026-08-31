import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseInitialStockFromExcel, generateInitialStockExcelTemplate, InitialStockParsedRow } from '../utils/excelUtils';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, X, RefreshCw, Boxes, ShieldCheck, Building2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const InitialStockExcelImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { importInitialStockBatch, items, warehouses, language } = useApp();
  const isFa = language === 'fa';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    rows: InitialStockParsedRow[];
    errors: string[];
    warnings: string[];
    totalCalculatedValue: number;
  } | null>(null);
  const [successReport, setSuccessReport] = useState<{ count: number; docNumber: string } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsLoading(true);
    setSuccessReport(null);

    try {
      const res = await parseInitialStockFromExcel(selected, items, warehouses);
      setParsedResult({
        rows: res.rows || [],
        errors: res.errors || [],
        warnings: res.warnings || [],
        totalCalculatedValue: res.totalCalculatedValue || 0
      });
    } catch (err: any) {
      setParsedResult({
        rows: [],
        errors: [err?.message || 'خطا در پردازش فایل اکسل موجودی اول دوره'],
        warnings: [],
        totalCalculatedValue: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;
    try {
      const report = importInitialStockBatch(parsedResult.rows);
      setSuccessReport({ count: report.count, docNumber: report.docNumber });
    } catch (err: any) {
      setParsedResult(prev => ({
        rows: prev?.rows || [],
        errors: [...(prev?.errors || []), `خطا در ثبت اطلاعات: ${err?.message || 'خطای سیستمی'}`],
        warnings: prev?.warnings || [],
        totalCalculatedValue: prev?.totalCalculatedValue || 0
      }));
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedResult(null);
    setSuccessReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-50 via-indigo-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ثبت موجودی ابتدای دوره از اکسل (سند افتتاحیه)</h3>
              <p className="text-xs text-slate-500 mt-0.5">بارگذاری مقادیر موجودی اولیه، تعیین انبار مقصد و ارزش‌گذاری ریالی کالاها</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Action Step 1: Download Template */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">۱</span>
                <span>دانلود فرمت نمونه اکسل موجودی اول دوره</span>
              </div>
              <p className="text-[11px] text-slate-500 pr-6">
                قالب از قبل حاوی نام و کدهای کالاهای موجود در سیستم و انبارهای فعال است تا ثبت مقادیر با نهایت دقت انجام شود.
              </p>
            </div>
            <button
              onClick={() => generateInitialStockExcelTemplate(warehouses, items)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل نمونه موجودی اول دوره</span>
            </button>
          </div>

          {/* Action Step 2: Upload File Dropzone */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">۲</span>
              <span>بارگذاری فایل اکسل تکمیل شده موجودی</span>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'انتخاب یا رها کردن فایل اکسل موجودی اول دوره'}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">فرمت‌های مجاز: XLSX, XLS</p>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successReport && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-900">سند موجودی اول دوره با موفقیت ثبت و اعمال گردید!</h4>
                <p className="text-xs text-emerald-700">
                  موجودی برای <b>{successReport.count}</b> قلم کالا ثبت گردید و سند افتتاحیه به شماره <b>{successReport.docNumber}</b> در سیستم و سرور مرکزی اعمال شد.
                </p>
              </div>
            </div>
          )}

          {/* Warnings & Errors */}
          {parsedResult && parsedResult.errors && parsedResult.errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>خطاهای شناسایی شده در فایل اکسل:</span>
              </div>
              <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 pr-2">
                {parsedResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedResult && parsedResult.warnings && parsedResult.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>هشدارهای واردسازی (نیاز به بازبینی):</span>
              </div>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-1 pr-2">
                {parsedResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {parsedResult && parsedResult.rows && parsedResult.rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>پیش‌نمایش موجودی‌های اولیه آماده ثبت ({parsedResult.rows.length} ردیف)</span>
                </div>
                <div className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                  مجموع ارزش ریالی: <span className="font-mono text-emerald-700">{(parsedResult.totalCalculatedValue || 0).toLocaleString('fa-IR')}</span> ریال
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 bg-white shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">کد کالا</th>
                      <th className="p-2.5">نام کالا</th>
                      <th className="p-2.5">انبار مقصد</th>
                      <th className="p-2.5">موجودی اول دوره</th>
                      <th className="p-2.5">قیمت واحد (ریال)</th>
                      <th className="p-2.5">مجموع ارزش (ریال)</th>
                      <th className="p-2.5">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {parsedResult.rows.map((row, idx) => {
                      const qty = Number(row.quantity) || 0;
                      const uPrice = Number(row.unitPrice) || 0;
                      const rowTotal = qty * uPrice;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold font-mono text-slate-900">{row.itemCode}</td>
                          <td className="p-2.5 font-bold text-slate-800">{row.itemName}</td>
                          <td className="p-2.5 font-semibold text-blue-700">{row.warehouseCodeOrName || row.warehouseName || row.warehouseId}</td>
                          <td className="p-2.5 font-bold font-mono text-slate-900 bg-blue-50/50">{qty.toLocaleString('fa-IR')}</td>
                          <td className="p-2.5 font-mono text-[11px]">{uPrice.toLocaleString('fa-IR')}</td>
                          <td className="p-2.5 font-mono text-[11px] text-emerald-700 font-bold">{rowTotal.toLocaleString('fa-IR')}</td>
                          <td className="p-2.5 text-[11px] text-slate-500">{row.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            پاکسازی و انتخاب مجدد
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              بستن
            </button>
            {parsedResult && parsedResult.rows && parsedResult.rows.length > 0 && !successReport && (
              <button
                onClick={handleApplyImport}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>تایید و اعمال موجودی ابتدای دوره ({parsedResult.rows.length} قلم)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
