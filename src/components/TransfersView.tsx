import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransferStatus, WarehouseTransfer } from '../types';
import { 
  ArrowLeftRight, Plus, CheckCircle2, Clock, 
  XCircle, Truck, FileText, X, Pencil, Trash2 
} from 'lucide-react';

export const TransfersView: React.FC = () => {
  const { 
    transfers, warehouses, items, projects, boms, currentUser, 
    createTransfer, updateTransfer, updateTransferStatus, deleteTransfer,
    hasActionPermission
  } = useApp();

  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<WarehouseTransfer | null>(null);

  // Form State
  const [docNumber, setDocNumber] = useState(`TRF-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || 'wh-raw');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?.id || 'wh-smd');
  const [handlerName, setHandlerName] = useState('حسن نوری (مسئول حمل داخلی)');
  const [notes, setNotes] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('Completed');

  const [transferItems, setTransferItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: items[0]?.id || '', quantity: 50 }
  ]);

  const handleOpenNew = () => {
    setEditingTransfer(null);
    setDocNumber(`TRF-2026-${Math.floor(100 + Math.random() * 900)}`);
    setDate(new Date().toLocaleDateString('fa-IR'));
    setSourceWarehouseId(warehouses[0]?.id || 'wh-raw');
    setTargetWarehouseId(warehouses[1]?.id || 'wh-smd');
    setHandlerName('حسن نوری (مسئول حمل داخلی)');
    setNotes('');
    setTransferStatus('Completed');
    setTransferItems([{ itemId: items[0]?.id || '', quantity: 50 }]);
    setSelectedProjectId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trf: WarehouseTransfer) => {
    setEditingTransfer(trf);
    setDocNumber(trf.docNumber);
    setDate(trf.date);
    setSourceWarehouseId(trf.sourceWarehouseId);
    setTargetWarehouseId(trf.targetWarehouseId);
    setHandlerName(trf.handlerName);
    setNotes(trf.notes || '');
    setTransferStatus(trf.status);
    setTransferItems(trf.items.map(it => ({ ...it })));
    setIsModalOpen(true);
  };

  const handleDelete = (trf: WarehouseTransfer) => {
    if (confirm(`آیا از حذف حواله انتقال "${trf.docNumber}" اطمینان دارید؟`)) {
      deleteTransfer(trf.id);
    }
  };

  const handleLoadProjectBOM = (projectId: string) => {
    setSelectedProjectId(projectId);
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const targetItem = items.find(i => i.id === proj.targetFinishedItemId);
    const activeBom = boms.find(b => b.finishedItemId === targetItem?.id && b.isActive);

    if (activeBom && activeBom.items.length > 0) {
      const pop = activeBom.items.map(bi => ({
        itemId: bi.itemId,
        quantity: bi.quantityNeeded * proj.targetQuantity
      }));
      setTransferItems(pop);
      setNotes(`حواله تحویل قطعات پروژه ${proj.code} (${proj.name}) از انبار مرکزی به انبار تولید/قفسه پروژه`);
      const rawWh = warehouses.find(w => w.id === 'wh-raw')?.id;
      const prodWh = warehouses.find(w => w.id === 'wh-smd' || w.id === 'wh-assembly')?.id;
      if (rawWh) setSourceWarehouseId(rawWh);
      if (prodWh) setTargetWarehouseId(prodWh);
    } else {
      alert('فرمول ساخت (BOM) فعال برای این پروژه تعریف نشده است.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWarehouseId === targetWarehouseId) {
      alert('انبار مبدا و مقصد نمی‌تواند یکسان باشد!');
      return;
    }

    if (editingTransfer) {
      updateTransfer(editingTransfer.id, {
        docNumber,
        date,
        sourceWarehouseId,
        targetWarehouseId,
        handlerName,
        status: transferStatus,
        items: transferItems,
        notes,
      });
      alert('حواله انتقال با موفقیت به‌روزرسانی شد.');
    } else {
      createTransfer({
        docNumber,
        date,
        sourceWarehouseId,
        targetWarehouseId,
        registeredBy: currentUser.fullName,
        handlerName,
        status: transferStatus,
        items: transferItems,
        notes,
      });
      alert('حواله انتقال بین انبارها ثبت شد و موجودی انبار مبدا و مقصد به‌روزرسانی گردید.');
    }

    setIsModalOpen(false);
  };

  const statusBadges: Record<TransferStatus, { label: string; style: string; icon: React.ComponentType<{ className?: string }> }> = {
    Pending: { label: 'در انتظار جابجایی', style: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    InTransit: { label: 'در حال حمل', style: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck },
    Completed: { label: 'تکمیل‌شده', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    Rejected: { label: 'رد شده', style: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            انتقال کالا بین انبارهای داخلی کارخانه
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            جابجایی مواد اولیه، رول‌های SMD و بردهای مونتاژشده بین ۷ انبار تخصصی با تعیین مسئول انتقال
          </p>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            ثبت حواله انتقال جدید
          </button>
        )}
      </div>

      {/* Transfers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3.5">شماره انتقال</th>
                <th className="whitespace-nowrap p-3.5">تاریخ</th>
                <th className="whitespace-nowrap p-3.5">انبار مبدا</th>
                <th className="whitespace-nowrap p-3.5">انبار مقصد</th>
                <th className="whitespace-nowrap p-3.5">تعداد اقلام</th>
                <th className="whitespace-nowrap p-3.5">مسئول انتقال</th>
                <th className="whitespace-nowrap p-3.5">ثبت‌کننده</th>
                <th className="whitespace-nowrap p-3.5">وضعیت</th>
                <th className="whitespace-nowrap p-3.5 text-center">تغییر وضعیت</th>
                <th className="whitespace-nowrap p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    هیچ حواله انتقالی تاکنون ثبت نشده است.
                  </td>
                </tr>
              ) : (
                transfers.map(trf => {
                  const srcWh = warehouses.find(w => w.id === trf.sourceWarehouseId);
                  const tgtWh = warehouses.find(w => w.id === trf.targetWarehouseId);
                  const badge = statusBadges[trf.status];
                  const Icon = badge.icon;

                  return (
                    <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap p-3.5 font-mono font-bold text-indigo-600">{trf.docNumber}</td>
                      <td className="whitespace-nowrap p-3.5 font-mono text-slate-500">{trf.date}</td>
                      <td className="whitespace-nowrap p-3.5 font-bold text-rose-600">{srcWh?.name}</td>
                      <td className="whitespace-nowrap p-3.5 font-bold text-emerald-600">{tgtWh?.name}</td>
                      <td className="whitespace-nowrap p-3.5 font-mono font-bold">{trf.items.length} قلم</td>
                      <td className="whitespace-nowrap p-3.5 text-slate-800">{trf.handlerName}</td>
                      <td className="whitespace-nowrap p-3.5 text-slate-500">{trf.registeredBy}</td>
                      <td className="whitespace-nowrap p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 w-fit ${badge.style}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-center">
                        {trf.status !== 'Completed' && trf.status !== 'Rejected' ? (
                          canEdit ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateTransferStatus(trf.id, 'Completed')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10px] shadow-2xs"
                              >
                                تکمیل تحویل
                              </button>
                              <button
                                onClick={() => updateTransferStatus(trf.id, 'Rejected')}
                                className="px-2 py-1 bg-slate-100 text-rose-600 hover:bg-rose-50 border border-slate-200 rounded text-[10px] font-medium"
                              >
                                رد
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">بدون دسترسی ویرایش</span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">نهایی شده</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-center">
                        {(canEdit || canDelete) ? (
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(trf)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="ویرایش حواله انتقال"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(trf)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="حذف حواله انتقال"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal New / Edit Transfer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                {editingTransfer ? `ویرایش حواله انتقال (${editingTransfer.docNumber})` : 'ثبت جابجایی و انتقال کالا بین انبارها'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Project Quick Loader Banner */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-bold text-indigo-900 block">فراخوانی سریع قطعات پروژه بر اساس BOM:</span>
                  <span className="text-slate-600 text-[11px]">انتقال اتوماتیک کلیه قطعات و ضایعات محاسبه‌شده از انبار مرکزی به انبار تولید</span>
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleLoadProjectBOM(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs text-indigo-900 font-bold focus:outline-none shrink-0"
                >
                  <option value="">-- انتخاب پروژه جهت فراخوانی BOM --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      پروژه {p.code}: {p.name} ({p.client})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره سند انتقال*</label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ جابجایی*</label>
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">انبار مبدا (کسر موجودی)*</label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">انبار مقصد (افزایش موجودی)*</label>
                  <select
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام مسئول یا حمل‌کننده*</label>
                  <input
                    type="text"
                    required
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">اقلام جابجایی:</label>
                {transferItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const copy = [...transferItems];
                        copy[idx].itemId = e.target.value;
                        setTransferItems(copy);
                      }}
                      className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const copy = [...transferItems];
                        copy[idx].quantity = Number(e.target.value);
                        setTransferItems(copy);
                      }}
                      className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-2xs"
                >
                  {editingTransfer ? 'ذخیره تغییرات حواله' : 'ثبت جابجایی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
