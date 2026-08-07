import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Printer, Download, FileSpreadsheet, 
  Layers, Factory, ArrowDownUp, Users, CheckCircle2 
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { inventory, warehouses, items, stockInDocs, stockOutDocs, projects, operators, productionLogs } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'inventory' | 'movements' | 'projects' | 'operators'>('inventory');

  // Export to CSV helper
  const handleExportCSV = (filename: string, rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            مرکز گزارش‌گیری مدیریتی، خروجی اکسل و چاپ رسمی
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تهیه گزارش‌های تفکیکی انبارها، گردش ورود و خروج، راندمان خطوط تولید و کارکرد اپراتورها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            چاپ رسمی گزارش
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveReportTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'inventory' ? 'bg-indigo-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          گزارش موجودی کالا به تفکیک انبار
        </button>

        <button
          onClick={() => setActiveReportTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'movements' ? 'bg-indigo-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          گزارش گردشی رسیدها و حواله‌ها
        </button>

        <button
          onClick={() => setActiveReportTab('projects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'projects' ? 'bg-indigo-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4" />
          گزارش پیشرفت پروژه‌های تولید
        </button>

        <button
          onClick={() => setActiveReportTab('operators')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'operators' ? 'bg-indigo-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          گزارش عملکرد و ضایعات اپراتورها
        </button>
      </div>

      {/* Printable Report View */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs print:border-none print:p-0 print:bg-white print:text-black space-y-6">
        {/* Printable Official Header */}
        <div className="hidden print:flex justify-between items-center border-b pb-4 border-slate-300">
          <div>
            <h1 className="text-xl font-bold">کارخانه تولید قطعات و تجهیزات الکترونیکی ElectroStock</h1>
            <p className="text-xs text-slate-600">گزارش رسمی سامانه انبارداری و کنترل خطوط مونتاژ</p>
          </div>
          <div className="text-left font-mono text-xs">
            <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>زمان: {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* Tab 1: Inventory per Warehouse */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="font-bold text-sm text-slate-900">ماتریس کامل موجودی قطعات در انبارهای ۷ گانه:</h3>
              <button
                onClick={() => {
                  const rows = [
                    ["کد کالا", "نام قطعه", "نوع", "انبار", "موجودی فعلی", "واحد", "حداقل موجودی"],
                    ...inventory.map(inv => {
                      const item = items.find(i => i.id === inv.itemId);
                      const wh = warehouses.find(w => w.id === inv.warehouseId);
                      return [item?.code || '', item?.name || '', item?.itemType || '', wh?.name || '', String(inv.quantity), item?.unit || '', String(item?.minStockAlert || 0)];
                    })
                  ];
                  handleExportCSV("ElectroStock_Inventory_Report", rows);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                دانلود خروجی اکسل (CSV)
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl print:border-slate-300">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 print:bg-slate-200 print:text-slate-800">
                  <tr>
                    <th className="whitespace-nowrap p-3">کد کالا</th>
                    <th className="whitespace-nowrap p-3">نام قطعه / برد</th>
                    <th className="whitespace-nowrap p-3">نوع کالا</th>
                    <th className="whitespace-nowrap p-3">نام انبار تخصصی</th>
                    <th className="whitespace-nowrap p-3">موجودی فعلی</th>
                    <th className="whitespace-nowrap p-3">حداقل هشدار</th>
                    <th className="whitespace-nowrap p-3">وضعیت بالانس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {inventory.map((inv, idx) => {
                    const item = items.find(i => i.id === inv.itemId);
                    const wh = warehouses.find(w => w.id === inv.warehouseId);
                    const isLow = item && inv.quantity <= item.minStockAlert;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600 print:text-black">{item?.code}</td>
                        <td className="whitespace-nowrap p-3 font-bold text-slate-900 print:text-black">{item?.name}</td>
                        <td className="whitespace-nowrap p-3 text-slate-500 print:text-black">{item?.itemType}</td>
                        <td className="whitespace-nowrap p-3 text-slate-700 font-bold print:text-black">{wh?.name}</td>
                        <td className="whitespace-nowrap p-3 font-mono font-bold text-slate-900 print:text-black">
                          {inv.quantity.toLocaleString('fa-IR')} {item?.unit}
                        </td>
                        <td className="whitespace-nowrap p-3 font-mono text-slate-500 print:text-black">{item?.minStockAlert}</td>
                        <td className="whitespace-nowrap p-3">
                          {isLow ? (
                            <span className="text-rose-600 font-bold">کسری موجودی</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">مطلوب</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Movements */}
        {activeReportTab === 'movements' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 print:text-black">خلاصه اسناد ورودی و خروجی:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-emerald-600 block mb-2">تعداد کل رسیدهای ورود:</span>
                <strong className="text-2xl font-mono text-slate-900">{stockInDocs.length} سند</strong>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-rose-600 block mb-2">تعداد کل حواله‌های خروج:</span>
                <strong className="text-2xl font-mono text-slate-900">{stockOutDocs.length} سند</strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Projects */}
        {activeReportTab === 'projects' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 print:text-black">وضعیت پیشرفت پروژه‌های تولیدی:</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap p-3">کد پروژه</th>
                    <th className="whitespace-nowrap p-3">عنوان</th>
                    <th className="whitespace-nowrap p-3">مشتری</th>
                    <th className="whitespace-nowrap p-3">تیراژ تولید شده / هدف</th>
                    <th className="whitespace-nowrap p-3">درصد پیشرفت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{p.code}</td>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-900">{p.name}</td>
                      <td className="whitespace-nowrap p-3 text-slate-600">{p.client}</td>
                      <td className="whitespace-nowrap p-3 font-mono">{p.producedQuantity} / {p.targetQuantity}</td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-emerald-600">{p.progressPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Operators */}
        {activeReportTab === 'operators' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 print:text-black">خلاصه راندمان اپراتورها:</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap p-3">نام اپراتور</th>
                    <th className="whitespace-nowrap p-3">کد پرسنلی</th>
                    <th className="whitespace-nowrap p-3">نقش فنی</th>
                    <th className="whitespace-nowrap p-3">کل تیراژ قطعات</th>
                    <th className="whitespace-nowrap p-3">ساعت کارکرد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operators.map(op => (
                    <tr key={op.id}>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-900">{op.name}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-indigo-600">{op.code}</td>
                      <td className="whitespace-nowrap p-3 text-slate-600">{op.role}</td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-emerald-600">{op.totalProducedPieces.toLocaleString('fa-IR')} عدد</td>
                      <td className="whitespace-nowrap p-3 font-mono text-slate-600">{op.totalWorkingHours} ساعت</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
