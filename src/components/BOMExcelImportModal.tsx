import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseBOMsFromExcel, generateBOMsExcelTemplate } from '../utils/excelUtils';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, X, RefreshCw, GitBranch, ShieldCheck, Layers } from 'lucide-react';
import { BOM } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BOMExcelImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { importBOMsBatch, items, boms, language } = useApp();
  const isFa = language === 'fa';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    boms: Omit<BOM, 'id' | 'createdAt'>[];
    errors: string[];
    warnings: string[];
    totalRowsParsed: number;
  } | null>(null);
  const [successReport, setSuccessReport] = useState<{ count: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsLoading(true);
    setSuccessReport(null);

    try {
      const res = await parseBOMsFromExcel(selected, items);
      setParsedResult(res);
    } catch (err: any) {
      setParsedResult({
        boms: [],
        errors: [err?.message || 'خطا در پردازش فایل اکسل فرمول‌های ساخت'],
        warnings: [],
        totalRowsParsed: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!parsedResult || parsedResult.boms.length === 0) return;
    const report = importBOMsBatch(parsedResult.boms);
    setSuccessReport({ count: report.count });
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
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-purple-50 via-indigo-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ورود فرمول‌های ساخت (BOM) از طریق اکسل</h3>
              <p className="text-xs text-slate-500 mt-0.5">بارگذاری ساختار قطعات تشکیل‌دهنده، ضرایب مصرف و درصد ضایعات برای محصولات نهایی و نیمه‌ساخته‌ها</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center">۱</span>
                <span>دانلود قالب نمونه اکسل فرمول ساخت (BOM)</span>
              </div>
              <p className="text-[11px] text-slate-500 pr-6">
                هر ردیف فایل اکسل نشان‌دهنده یک قطعه مصرفی برای محصول است. قطعات با کد محصول یکسان به عنوان یک فرمول تجمیع می‌شوند.
              </p>
            </div>
            <button
              onClick={() => generateBOMsExcelTemplate(items)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل نمونه اکسل فرمول ساخت</span>
            </button>
          </div>

          {/* Action Step 2: Upload File Dropzone */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center">۲</span>
              <span>بارگذاری فایل اکسل تکمیل شده فرمول‌های ساخت</span>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-purple-50/30 flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'انتخاب یا رها کردن فایل اکسل فرمول ساخت (BOM)'}
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
                <h4 className="text-xs font-bold text-emerald-900">فرمول‌های ساخت با موفقیت وارد و ثبت شدند!</h4>
                <p className="text-xs text-emerald-700">
                  تعداد <b>{successReport.count}</b> فرمول ساخت (BOM) برای محصولات نهایی و نیمه‌ساخته‌ها با ضرایب مصرف و درصد ضایعات در سیستم فعال گردید.
                </p>
              </div>
            </div>
          )}

          {/* Warnings & Errors */}
          {parsedResult && parsedResult.errors.length > 0 && (
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

          {parsedResult && parsedResult.warnings.length > 0 && (
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
          {parsedResult && parsedResult.boms.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>پیش‌نمایش فرمول‌های شناسایی شده ({parsedResult.boms.length} فرمول مستقل)</span>
                </div>
                <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-lg font-bold">
                  شامل {parsedResult.totalRowsParsed} قطعه مصرفی
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {parsedResult.boms.map((bom, bIdx) => {
                  const targetItem = items.find(i => i.id === bom.finishedItemId);
                  return (
                    <div key={bIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-600 text-white font-mono">
                            نسخه {bom.version}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{bom.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">({targetItem?.code || bom.finishedItemId})</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                          {bom.items.length} قلم تشکیل‌دهنده
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {bom.items.map((comp, cIdx) => {
                          const raw = items.find(i => i.id === comp.itemId);
                          return (
                            <div key={cIdx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                              <div className="truncate pr-1">
                                <div className="font-bold text-slate-800 truncate">{raw?.name || comp.itemId}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{raw?.code || comp.itemId}</div>
                              </div>
                              <div className="text-left shrink-0 pl-1">
                                <span className="font-bold text-purple-700 font-mono text-xs">{comp.quantityNeeded}</span>
                                <span className="text-[10px] text-slate-500 mr-1">{comp.unit || 'عدد'}</span>
                                {comp.scrapAllowancePercent ? (
                                  <span className="text-[9px] text-amber-700 block font-bold">+{comp.scrapAllowancePercent}٪ ضایعات</span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            پاکسازی و انتخاب مجدد
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              بستن
            </button>
            {parsedResult && parsedResult.boms.length > 0 && !successReport && (
              <button
                onClick={handleApplyImport}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>تایید و ذخیره {parsedResult.boms.length} فرمول ساخت در سیستم</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
