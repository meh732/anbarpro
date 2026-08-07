import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseRequest, PurchaseRequestStatus } from '../types';
import { 
  FileCheck, Plus, CheckCircle2, ShoppingCart, 
  Clock, AlertTriangle, ArrowDown, X 
} from 'lucide-react';

export const PurchaseRequestsView: React.FC = () => {
  const { 
    purchaseRequests, items, inventory, currentUser, 
    createPurchaseRequest, updatePurchaseRequestStatus 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [requestNumber, setRequestNumber] = useState(`REQ-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [requestingUnit, setRequestingUnit] = useState('واحد خط مونتاژ و SMD');
  const [urgency, setUrgency] = useState<'Normal' | 'High' | 'Immediate'>('Normal');
  const [notes, setNotes] = useState('');

  const [reqItems, setReqItems] = useState<{ itemId: string; quantity: number; reason: string }[]>([
    { itemId: items[0]?.id || '', quantity: 100, reason: 'کسر قطعه در پروژه جاری' }
  ]);

  const handleOpenNew = () => {
    setRequestNumber(`REQ-2026-${Math.floor(100 + Math.random() * 900)}`);
    setReqItems([{ itemId: items[0]?.id || '', quantity: 100, reason: 'کسر قطعه در پروژه جاری' }]);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPurchaseRequest({
      requestNumber,
      date: new Date().toLocaleDateString('fa-IR'),
      requestingUnit,
      requesterName: currentUser.fullName,
      urgency,
      status: 'Pending',
      items: reqItems,
      notes,
    });

    alert('درخواست کالا با موفقیت ثبت شد و جهت بررسی موجودی انبار ارسال گردید.');
    setIsModalOpen(false);
  };

  const statusBadges: Record<PurchaseRequestStatus, { label: string; style: string }> = {
    Pending: { label: 'در انتظار بررسی انبار', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    Approved_InStock: { label: 'موجود در انبار (آماده تحویل)', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Purchase_Needed: { label: 'ارجاع به واحد خرید (خارجی)', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    Manufacturing_Needed: { label: 'ارجاع به برنامه تولید', style: 'bg-purple-50 text-purple-700 border-purple-200' },
    Fulfilled: { label: 'تحویل داده شده', style: 'bg-slate-100 text-slate-700 border-slate-200' },
    Rejected: { label: 'رد شده', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            درخواست‌های داخلی کالا و ارجاع به واحد خرید
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            روند هوشمند: ثبت درخواست سرشیفت ➔ بررسی خودکار موجودی انبار ➔ تحویل یا ارجاع به سفارش خرید
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          ثبت درخواست کالا / قطعه
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3.5">شماره درخواست</th>
                <th className="whitespace-nowrap p-3.5">تاریخ</th>
                <th className="whitespace-nowrap p-3.5">واحد درخواست‌کننده</th>
                <th className="whitespace-nowrap p-3.5">درخواست‌کننده</th>
                <th className="whitespace-nowrap p-3.5">اقلام و دلایل</th>
                <th className="whitespace-nowrap p-3.5">اولویـت</th>
                <th className="whitespace-nowrap p-3.5">وضعیت گردش</th>
                <th className="whitespace-nowrap p-3.5 text-center">اقدام مدیریت انبار / خرید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    هیچ درخواستی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                purchaseRequests.map(req => {
                  const badge = statusBadges[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap p-3.5 font-mono font-bold text-indigo-600">{req.requestNumber}</td>
                      <td className="whitespace-nowrap p-3.5 font-mono text-slate-500">{req.date}</td>
                      <td className="whitespace-nowrap p-3.5 font-bold text-slate-800">{req.requestingUnit}</td>
                      <td className="whitespace-nowrap p-3.5 text-slate-600">{req.requesterName}</td>
                      <td className="whitespace-nowrap p-3.5">
                        {req.items.map((it, i) => {
                          const itemObj = items.find(x => x.id === it.itemId);
                          const totalQtyInWh = inventory.filter(x => x.itemId === it.itemId).reduce((s, c) => s + c.quantity, 0);
                          return (
                            <div key={i} className="text-[11px] mb-1">
                              <span className="font-bold text-slate-800">{itemObj?.name || it.itemId}: </span>
                              <strong className="text-indigo-600 font-mono">{it.quantity} {itemObj?.unit}</strong>
                              <span className="text-[10px] text-slate-400 mr-2">(موجودی انبارها: {totalQtyInWh})</span>
                            </div>
                          );
                        })}
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          req.urgency === 'Immediate' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          req.urgency === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {req.urgency === 'Immediate' ? 'فوری / توقف خط' : req.urgency === 'High' ? 'بالا' : 'عادی'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => updatePurchaseRequestStatus(req.id, 'Approved_InStock')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10px] shadow-2xs"
                                title="تایید و تخصیص از موجودی انبار"
                              >
                                تحویل از انبار
                              </button>
                              <button
                                onClick={() => updatePurchaseRequestStatus(req.id, 'Purchase_Needed')}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-[10px] shadow-2xs"
                                title="عدم موجودی کافی - ارجاع به واحد خرید"
                              >
                                ارجاع به خرید
                              </button>
                            </>
                          )}
                          {req.status === 'Approved_InStock' && (
                            <button
                              onClick={() => updatePurchaseRequestStatus(req.id, 'Fulfilled')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium border border-slate-200"
                            >
                              علامت‌گذاری تحویل نهایی
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal New Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                ثبت فرم درخواست کالا / قطعه جدید
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره درخواست</label>
                  <input
                    type="text"
                    required
                    value={requestNumber}
                    onChange={(e) => setRequestNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واحد درخواست‌کننده</label>
                  <input
                    type="text"
                    required
                    value={requestingUnit}
                    onChange={(e) => setRequestingUnit(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">درخواست‌کننده</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.fullName}
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اولویت درخواست</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="Normal">عادی</option>
                    <option value="High">بالا</option>
                    <option value="Immediate">فوری / احتمال توقف خط</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">قطعه مورد نیاز:</label>
                {reqItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <select
                      value={it.itemId}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].itemId = e.target.value;
                        setReqItems(copy);
                      }}
                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].quantity = Number(e.target.value);
                        setReqItems(copy);
                      }}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و دلیل درخواست</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="علت درخواست یا شماره پروژه مربوطه"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
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
                  ارسال درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
