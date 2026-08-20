import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseItemsFromExcel, generateItemsExcelTemplate } from '../utils/excelUtils';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, X, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { Item } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemsExcelImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { importItemsBatch, items, itemGroups, language, t } = useApp();
  const isFa = language === 'fa';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    items: Omit<Item, 'id' | 'createdAt'>[];
    errors: string[];
    warnings: string[];
    groupsToCreate: { name: string; subGroup: string }[];
  } | null>(null);
  const [successReport, setSuccessReport] = useState<{ added: number; updated: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsLoading(true);
    setSuccessReport(null);

    try {
      const res = await parseItemsFromExcel(selected);
      setParsedResult(res);
    } catch (err: any) {
      setParsedResult({
        items: [],
        errors: [err?.message || 'خطا در پردازش و خواندن فایل اکسل'],
        warnings: [],
        groupsToCreate: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!parsedResult || parsedResult.items.length === 0) return;
    const report = importItemsBatch(parsedResult.items, parsedResult.groupsToCreate);
    setSuccessReport({ added: report.count, updated: report.updatedCount });
  };

  const handleReset = () => {
    setFile(null);
    setParsedResult(null);
    setSuccessReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'Component':
      case 'RawMaterial':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">قطعه / ماده اولیه</span>;
      case 'SemiFinished':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">نیمه‌ساخته (مرحله‌ای)</span>;
      case 'FinishedProduct':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">محصول نهایی</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">{type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-emerald-50 via-teal-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ورود دسته‌ای اطلاعات کالاها از اکسل</h3>
              <p className="text-xs text-slate-500 mt-0.5">دریافت و بارگذاری اطلاعات قطعات، مواد اولیه، نیمه‌ساخته‌ها و محصولات با فرمت اکسل</p>
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
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center">۱</span>
                <span>دانلود فرمت و قالب استاندارد اکسل کالاها</span>
              </div>
              <p className="text-[11px] text-slate-500 pr-6">
                ابتدا فایل قالب اکسل را دریافت کنید، ستون‌های نام، کد، واحد، نوع کالا و گروه را تکمیل نمایید.
              </p>
            </div>
            <button
              onClick={() => generateItemsExcelTemplate()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل نمونه اکسل (Template)</span>
            </button>
          </div>

          {/* Action Step 2: Upload File Dropzone */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center">۲</span>
              <span>بارگذاری فایل اکسل تکمیل شده</span>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'انتخاب یا رها کردن فایل اکسل کالاها'}
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
                <h4 className="text-xs font-bold text-emerald-900">اطلاعات کالاها با موفقیت در سیستم ثبت گردید!</h4>
                <p className="text-xs text-emerald-700">
                  تعداد <b>{successReport.added}</b> کالای جدید ثبت و <b>{successReport.updated}</b> کالا به‌روزرسانی شد. اطلاعات به صورت خودکار با سرور لینوکس نیز همگام‌سازی شد.
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
                <span>هشدارهای واردسازی (نیاز به توجه):</span>
              </div>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-1 pr-2">
                {parsedResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {parsedResult && parsedResult.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>پیش‌نمایش اقلام آماده ثبت ({parsedResult.items.length} ردیف)</span>
                </div>
                {parsedResult.groupsToCreate.length > 0 && (
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-lg font-bold">
                    {parsedResult.groupsToCreate.length} گروه جدید نیز خودکار ساخته خواهد شد
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 bg-white shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">کد کالا</th>
                      <th className="p-2.5">نام کالا</th>
                      <th className="p-2.5">نوع کالا</th>
                      <th className="p-2.5">گروه اصلی</th>
                      <th className="p-2.5">زیرگروه</th>
                      <th className="p-2.5">واحد</th>
                      <th className="p-2.5">حداقل/حداکثر</th>
                      <th className="p-2.5">قیمت واحد</th>
                      <th className="p-2.5">موقعیت قفسه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {parsedResult.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{it.code}</td>
                        <td className="p-2.5 font-bold text-slate-800">{it.name}</td>
                        <td className="p-2.5">{getItemTypeBadge(it.itemType)}</td>
                        <td className="p-2.5">{it.group}</td>
                        <td className="p-2.5">{it.subGroup || '-'}</td>
                        <td className="p-2.5">{it.unit}</td>
                        <td className="p-2.5 font-mono text-[11px]">{it.minStock} / {it.maxStock}</td>
                        <td className="p-2.5 font-mono text-[11px]">{it.unitPrice.toLocaleString('fa-IR')} ریال</td>
                        <td className="p-2.5 font-mono text-[11px]">{it.locationInRack || '-'}</td>
                      </tr>
                    ))}
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
            {parsedResult && parsedResult.items.length > 0 && !successReport && (
              <button
                onClick={handleApplyImport}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>تایید و ثبت نهایی {parsedResult.items.length} کالا در سیستم</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
