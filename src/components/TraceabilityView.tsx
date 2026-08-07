import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Footprints, Search, ArrowDownLeft, ArrowUpRight, 
  ArrowLeftRight, Cpu, Clock, CheckCircle2, QrCode 
} from 'lucide-react';

export const TraceabilityView: React.FC = () => {
  const { traceabilityEvents, items, warehouses } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  const filteredEvents = traceabilityEvents.filter(ev => {
    const item = items.find(i => i.id === ev.itemId);
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = 
      (ev.docNumber || '').toLowerCase().includes(term) ||
      (ev.batchCode || '').toLowerCase().includes(term) ||
      (ev.serialNumber ? ev.serialNumber.toLowerCase().includes(term) : false) ||
      (item?.name ? item.name.toLowerCase().includes(term) : false) ||
      (item?.code ? item.code.toLowerCase().includes(term) : false);

    const matchesItem = selectedItemId === 'ALL' || ev.itemId === selectedItemId;

    return matchesSearch && matchesItem;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-indigo-600" />
            سیستم رهگیری و ردپای چرخه حیات قطعات (Traceability)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            رهگیری کامل و دقیق از ورود فاکتور خرید ➔ نگهداری انبار ➔ انتقال بین انبارها ➔ مونتاژ روی برد ➔ خروج محصول
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 font-bold">
            {traceabilityEvents.length} رویداد ثبت‌شده
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی شماره سند، سری ساخت (Batch)، شماره سریال قطعه یا نام کالا..."
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
          >
            <option value="ALL">همه قطعات و محصولات</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Traceability Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900">تایم‌لاین چرخه‌حیات و گردش اقلام:</h3>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            هیچ رویداد رهگیری با شرایط جستجوی شما پیدا نشد.
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-200 pr-6 space-y-6">
            {filteredEvents.map(event => {
              const item = items.find(i => i.id === event.itemId);
              const sourceWh = warehouses.find(w => w.id === event.sourceWarehouseId);
              const targetWh = warehouses.find(w => w.id === event.targetWarehouseId);

              const eventTypeConfigs = {
                StockIn: { label: 'ورود به انبار', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: ArrowDownLeft },
                StockOut: { label: 'خروج از انبار', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: ArrowUpRight },
                Transfer: { label: 'انتقال بین انبارها', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: ArrowLeftRight },
                ProductionConsumed: { label: 'مصرف در خط تولید (BOM)', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Cpu },
                ProductionOutput: { label: 'تولید محصول سالم', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: CheckCircle2 },
              };

              const cfg = eventTypeConfigs[event.eventType] || eventTypeConfigs.StockIn;
              const Icon = cfg.icon;

              return (
                <div key={event.id} className="relative group">
                  {/* Circle Node on Timeline */}
                  <div className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${cfg.color}`}></div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 hover:border-slate-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">{event.docNumber}</span>
                        <span className="text-xs text-slate-500">| سری ساخت: <strong className="text-indigo-600 font-mono">{event.batchCode}</strong></span>
                      </div>

                      <div className="font-mono text-xs text-slate-500">
                        {event.timestamp}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">قطعه / کالا:</span>
                        <strong className="text-slate-900 font-bold">{item?.name || event.itemId} ({item?.code})</strong>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">تعداد گردش:</span>
                        <strong className="text-emerald-600 font-mono font-bold">{event.quantity} {item?.unit}</strong>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">مسئول / کاربر:</span>
                        <strong className="text-slate-800">{event.operatorName}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap items-center gap-4 border-t border-slate-200">
                      {sourceWh && <span>مبدا: <strong className="text-rose-600">{sourceWh.name}</strong></span>}
                      {targetWh && <span>مقصد: <strong className="text-emerald-600">{targetWh.name}</strong></span>}
                      {event.notes && <span className="text-slate-500 italic">({event.notes})</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
