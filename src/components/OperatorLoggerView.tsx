import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MaterialHandover, ProductionLog } from '../types';
import { 
  ClipboardList, CheckCircle2, AlertTriangle, Cpu, 
  Clock, PlayCircle, User, Printer, Plus, Trash2, 
  FileText, Boxes, Warehouse, Calendar, CheckSquare, 
  ArrowLeftRight, FileCheck, X, Sparkles, Building2, UserCheck
} from 'lucide-react';

export const OperatorLoggerView: React.FC = () => {
  const { 
    operators, projects, items, warehouses, boms, currentUser, 
    registerProduction, materialHandovers, addMaterialHandover, deleteMaterialHandover,
    productionLogs, deleteProductionLog 
  } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'handover' | 'production'>('handover');

  // --- TAB 1: Material Handover Form State ---
  const [supervisorName, setSupervisorName] = useState(currentUser.fullName || 'مهندس رضایی (سرشیفت)');
  const [salonName, setSalonName] = useState('سالن ۱ - مونتاژ و تولید برد');
  const [handoverOperatorId, setHandoverOperatorId] = useState(operators[0]?.id || '');
  const [handoverProjectId, setHandoverProjectId] = useState(projects[0]?.id || '');
  const [handoverStepId, setHandoverStepId] = useState(projects[0]?.steps[0]?.id || '');
  const [handoverMachineCode, setHandoverMachineCode] = useState('LINE-SMD-01');
  const [handoverDate, setHandoverDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [handoverStartTime, setHandoverStartTime] = useState(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
  const [handoverSourceWh, setHandoverSourceWh] = useState(warehouses.find(w => w.id === 'wh-raw')?.id || warehouses[0]?.id || '');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Selected Checklist Items for Handover
  const [checklistItems, setChecklistItems] = useState<Array<{ itemId: string; quantity: number; notes?: string }>>([
    { itemId: items[0]?.id || '', quantity: 50, notes: 'تحویل اولیه' },
  ]);
  const [handoverBatchQty, setHandoverBatchQty] = useState<number>(50);

  // --- TAB 2: Production Log Form State ---
  const [prodOperatorId, setProdOperatorId] = useState(operators[0]?.id || '');
  const [prodShift, setProdShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [prodProjectId, setProdProjectId] = useState(projects[0]?.id || '');
  const [prodStepId, setProdStepId] = useState('');
  const [prodFinishedItemId, setProdFinishedItemId] = useState(
    items.find(i => i.itemType === 'Finished' || i.itemType === 'SemiFinished')?.id || items[0]?.id || ''
  );
  const [prodQuantityProduced, setProdQuantityProduced] = useState(20);
  const [prodQuantityScrapped, setProdQuantityScrapped] = useState(0);
  const [prodDate, setProdDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [prodTime, setProdTime] = useState(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
  const [prodMachineCode, setProdMachineCode] = useState('SMD-PICK-PLACE-01');
  const [prodSourceWh, setProdSourceWh] = useState(warehouses.find(w => w.id === 'wh-raw')?.id || warehouses[0]?.id || '');
  const [prodTargetWh, setProdTargetWh] = useState(warehouses.find(w => w.id === 'wh-finished' || w.id === 'wh-assembly')?.id || warehouses[0]?.id || '');
  const [prodNotes, setProdNotes] = useState('');

  // Modals & Printable Receipts
  const [printableHandover, setPrintableHandover] = useState<MaterialHandover | null>(null);
  const [printableProdLog, setPrintableProdLog] = useState<ProductionLog | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; shortages?: any[] } | null>(null);

  const selectedHandoverProject = projects.find(p => p.id === handoverProjectId);
  const selectedHandoverOperator = operators.find(o => o.id === handoverOperatorId);
  const selectedProdProject = projects.find(p => p.id === prodProjectId);
  const selectedProdOperator = operators.find(o => o.id === prodOperatorId);

  // Auto populate checklist items from project BOM
  const handleLoadBOMChecklist = (overrideProjectId?: string, overrideQty?: number) => {
    const proj = projects.find(p => p.id === (overrideProjectId || handoverProjectId));
    if (!proj) return;

    const targetItem = items.find(i => i.id === proj.targetFinishedItemId);
    const activeBom = boms.find(b => b.finishedItemId === targetItem?.id && b.isActive);
    const multiplier = overrideQty !== undefined ? overrideQty : (handoverBatchQty || proj.targetQuantity || 50);

    if (activeBom && activeBom.items.length > 0) {
      const populated = activeBom.items.map(bi => ({
        itemId: bi.itemId,
        quantity: bi.quantityNeeded * multiplier,
        notes: `طبق فرمول BOM (تیراژ ${multiplier} عدد)`
      }));
      setChecklistItems(populated);
    } else {
      if (!overrideProjectId) {
        alert('فرمول ساخت (BOM) برای این محصول یافت نشد. می‌توانید قطعات را دستی اضافه کنید.');
      }
    }
  };

  const handleAddChecklistItem = () => {
    setChecklistItems(prev => [...prev, { itemId: items[0]?.id || '', quantity: 1, notes: '' }]);
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleChecklistChange = (index: number, field: 'itemId' | 'quantity' | 'notes', value: any) => {
    setChecklistItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Submit Tab 1: Shift Supervisor Material Handover
  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checklistItems.length === 0) {
      alert('لطفا حداقل یک قطعه در لیست تحویل اضافه کنید.');
      return;
    }

    const now = new Date();
    const exactDate = now.toLocaleDateString('fa-IR');
    const exactTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    setHandoverDate(exactDate);
    setHandoverStartTime(exactTime);

    const docNum = `HND-1404-${Math.floor(100 + Math.random() * 900)}`;

    const itemsFormatted = checklistItems.map(c => {
      const it = items.find(i => i.id === c.itemId);
      return {
        itemId: c.itemId,
        itemCode: it?.code || '',
        itemName: it?.name || 'قطعه',
        unit: it?.unit || 'عدد',
        quantity: Number(c.quantity),
        notes: c.notes
      };
    });

    const newHandover: Omit<MaterialHandover, 'id' | 'createdAt'> = {
      docNumber: docNum,
      shiftSupervisor: supervisorName,
      salonName,
      operatorId: handoverOperatorId,
      operatorName: selectedHandoverOperator?.name || currentUser.fullName,
      projectId: handoverProjectId,
      stepId: handoverStepId || selectedHandoverProject?.steps[0]?.id || 's1',
      machineCode: handoverMachineCode,
      date: exactDate,
      startTime: exactTime,
      sourceWarehouseId: handoverSourceWh,
      items: itemsFormatted,
      notes: handoverNotes
    };

    addMaterialHandover(newHandover);

    const fullCreated: MaterialHandover = {
      ...newHandover,
      id: `hnd-${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10)
    };

    // Open Printable Receipt Modal
    setPrintableHandover(fullCreated);
  };

  // Submit Tab 2: Semi-finished / Finished Production Delivery
  const handleProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodQuantityProduced || prodQuantityProduced <= 0) return;

    const now = new Date();
    const exactDate = now.toLocaleDateString('fa-IR');
    const exactTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    setProdDate(exactDate);
    setProdTime(exactTime);

    const res = registerProduction({
      operatorId: prodOperatorId,
      operatorName: selectedProdOperator?.name || currentUser.fullName,
      shift: prodShift,
      projectId: prodProjectId,
      stepId: prodStepId || selectedProdProject?.steps[0]?.id || 's1',
      finishedItemId: prodFinishedItemId,
      quantityProduced: prodQuantityProduced,
      quantityScrapped: prodQuantityScrapped,
      date: exactDate,
      time: exactTime,
      machineCode: prodMachineCode,
      sourceWarehouseId: prodSourceWh,
      targetWarehouseId: prodTargetWh,
      notes: prodNotes,
    });

    setLastResult(res);

    if (res.success) {
      const createdLog: ProductionLog = {
        id: `prod-${Date.now()}`,
        operatorId: prodOperatorId,
        operatorName: selectedProdOperator?.name || currentUser.fullName,
        shift: prodShift,
        projectId: prodProjectId,
        stepId: prodStepId || selectedProdProject?.steps[0]?.id || 's1',
        finishedItemId: prodFinishedItemId,
        quantityProduced: prodQuantityProduced,
        quantityScrapped: prodQuantityScrapped,
        date: prodDate,
        time: prodTime,
        machineCode: prodMachineCode,
        sourceWarehouseId: prodSourceWh,
        targetWarehouseId: prodTargetWh,
        notes: prodNotes,
        registeredBy: currentUser.fullName,
        createdAt: new Date().toISOString().substring(0, 10)
      };
      setPrintableProdLog(createdLog);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            سیستم مدیریت تحویل قطعات سالن، ثبت زمان و خروجی تولید اپراتور
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            صدور برگه چاپی چک‌لیست تحویل قطعات زونکن + ثبت زمان دقیق تحویل و شروع/پایان کار اپراتور + کسر اتوماتیک BOM
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTabMode('handover')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'handover'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-indigo-600" />
            <span>۱. تحویل قطعات به اپراتور (سرشیفت)</span>
          </button>

          <button
            onClick={() => setActiveTabMode('production')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'production'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>۲. تحویل قطعه نیمه‌ساخته + کسر BOM</span>
          </button>
        </div>
      </div>

      {/* Result Alert Box */}
      {lastResult && activeTabMode === 'production' && (
        <div className={`p-4 rounded-2xl border transition-all ${lastResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1">
            {lastResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span>{lastResult.success ? 'ثبت موفقیت‌آمیز تولید و کسر BOM' : 'خطا در ثبت تولید (کسری موجودی مواد اولیه)'}</span>
          </div>
          <p className="text-xs leading-relaxed">{lastResult.message}</p>

          {lastResult.shortages && lastResult.shortages.length > 0 && (
            <div className="mt-3 pt-2 border-t border-rose-200 space-y-1">
              <span className="text-[11px] font-bold text-rose-900 block">لیست قطعات با کسر موجودی:</span>
              {lastResult.shortages.map((sh, idx) => (
                <div key={idx} className="text-xs text-rose-700 flex justify-between font-mono">
                  <span>{sh.itemName}</span>
                  <span>نیازمند: {sh.required} | موجودی فعلی انبار: {sh.available}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 1: SHIFT SUPERVISOR MATERIAL HANDOVER TO OPERATOR
         ========================================================= */}
      {activeTabMode === 'handover' && (
        <div className="space-y-6">
          <form onSubmit={handleHandoverSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                برگه تحویل مواد اولیه و قطعات از سرشیفت به اپراتور (با قابلیت پرینت زونکن)
              </h3>
              
              <button
                type="button"
                onClick={() => handleLoadBOMChecklist()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <ClipboardList className="w-4 h-4" />
                <span>فراخوانی خودکار قطعات طبق BOM پروژه</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام سرشیفت (تحویل دهنده)*</label>
                <input
                  type="text"
                  required
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام سالن / واحد تولید*</label>
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام اپراتور تحویل گیرنده*</label>
                <select
                  value={handoverOperatorId}
                  onChange={(e) => setHandoverOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                >
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name} ({op.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پروژه ساخت*</label>
                <select
                  value={handoverProjectId}
                  onChange={(e) => {
                    const newProjId = e.target.value;
                    setHandoverProjectId(newProjId);
                    handleLoadBOMChecklist(newProjId, handoverBatchQty);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تیراژ این پارت تحویل (تعداد)*</label>
                <input
                  type="number"
                  min={1}
                  value={handoverBatchQty}
                  onChange={(e) => {
                    const newQty = Number(e.target.value) || 1;
                    setHandoverBatchQty(newQty);
                    handleLoadBOMChecklist(handoverProjectId, newQty);
                  }}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-300 font-mono font-bold text-amber-900 rounded-xl text-xs focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مرحله تولید*</label>
                <select
                  value={handoverStepId}
                  onChange={(e) => setHandoverStepId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  {selectedHandoverProject?.steps.map(s => (
                    <option key={s.id} value={s.id}>مرحله {s.stepNumber}: {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دستگاه / ایستگاه کاری</label>
                <input
                  type="text"
                  value={handoverMachineCode}
                  onChange={(e) => setHandoverMachineCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ تحویل*</label>
                <input
                  type="text"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono text-center focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ساعت تحویل (شروع کار اپراتور)*</label>
                <input
                  type="text"
                  value={handoverStartTime}
                  onChange={(e) => setHandoverStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-300 font-bold text-amber-900 rounded-xl text-xs font-mono text-center focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Checklist items table */}
            <div className="space-y-2 pt-2">
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>محاسبه فرمول ساخت BOM:</strong> لیست زیر بر اساس فرمول ساخت برای تیراژ <strong>{handoverBatchQty} عدد</strong> فرموله شده است. امکان ویرایش دستی مقادیر، افزودن قطعه جدید یا حذف ردیف‌ها کاملاً فعال است.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>چک‌لیست و لیست قطعات تحویلی به اپراتور ({checklistItems.length} ردیف):</span>
                </label>
                
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>افزودن دستی قطعه جدید</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="whitespace-nowrap p-2.5 w-12 text-center">ردیف</th>
                      <th className="whitespace-nowrap p-2.5">قطعه / ماده اولیه</th>
                      <th className="whitespace-nowrap p-2.5 w-32 text-center">تعداد تحویلی</th>
                      <th className="whitespace-nowrap p-2.5">توضیحات و ملاحظات فیزیکی</th>
                      <th className="whitespace-nowrap p-2.5 w-16 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checklistItems.map((item, index) => {
                      const matchedItem = items.find(i => i.id === item.itemId);

                      return (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap p-2.5 text-center font-bold font-mono text-slate-500">{index + 1}</td>
                          <td className="whitespace-nowrap p-2">
                            <select
                              value={item.itemId}
                              onChange={(e) => handleChecklistChange(index, 'itemId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-indigo-500"
                            >
                              {items.map(it => (
                                <option key={it.id} value={it.id}>{it.name} ({it.code}) - {it.unit}</option>
                              ))}
                            </select>
                          </td>
                          <td className="whitespace-nowrap p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantity}
                                onChange={(e) => handleChecklistChange(index, 'quantity', Number(e.target.value))}
                                className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-center focus:border-indigo-500 text-indigo-700"
                              />
                              <span className="text-[11px] text-slate-500">{matchedItem?.unit || 'عدد'}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap p-2">
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleChecklistChange(index, 'notes', e.target.value)}
                              placeholder="مثلا: سلامت فیزیکی چک شد، خش ندارد"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:border-indigo-500"
                            />
                          </td>
                          <td className="whitespace-nowrap p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveChecklistItem(index)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف ردیف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات و دستورالعمل سرشیفت برای اپراتور</label>
              <textarea
                rows={2}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="توضیحات درباره نحوه چیدمان روی سینی، دما و نرخ مونتاژ"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              ></textarea>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>ثبت و پرینت برگه تحویل قطعات سالن (نسخه زونکن)</span>
              </button>
            </div>
          </form>

          {/* Table of Past Handover Documents */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              سوابق برگه‌های تحویل قطعات سرشیفت به اپراتور (قابل چاپ مجدد جهت بایگانی زونکن):
            </h4>

            {materialHandovers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                هیچ برگه تحویلی ثبت نشده است.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="whitespace-nowrap p-2.5">شماره سند</th>
                      <th className="whitespace-nowrap p-2.5">سرشیفت</th>
                      <th className="whitespace-nowrap p-2.5">اپراتور</th>
                      <th className="whitespace-nowrap p-2.5">پروژه و ایستگاه</th>
                      <th className="whitespace-nowrap p-2.5 text-center">تاریخ و ساعت شروع</th>
                      <th className="whitespace-nowrap p-2.5 text-center">تعداد قلم قطعات</th>
                      <th className="whitespace-nowrap p-2.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {materialHandovers.map(hnd => (
                      <tr key={hnd.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap p-2.5 font-mono text-indigo-700 font-bold">{hnd.docNumber}</td>
                        <td className="whitespace-nowrap p-2.5">{hnd.shiftSupervisor}</td>
                        <td className="whitespace-nowrap p-2.5 font-bold text-slate-800">{hnd.operatorName}</td>
                        <td className="whitespace-nowrap p-2.5 text-slate-600">
                          {projects.find(p => p.id === hnd.projectId)?.code} ({hnd.machineCode || 'لاین مونتاژ'})
                        </td>
                        <td className="whitespace-nowrap p-2.5 text-center font-mono text-slate-700">{hnd.date} - {hnd.startTime}</td>
                        <td className="whitespace-nowrap p-2.5 text-center font-bold text-indigo-600 font-mono">{hnd.items.length} نوع</td>
                        <td className="whitespace-nowrap p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPrintableHandover(hnd)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-[11px] flex items-center gap-1"
                              title="چاپ برگه زونکن"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>چاپ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف برگه تحویل "${hnd.docNumber}" اطمینان دارید؟`)) {
                                  deleteMaterialHandover(hnd.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف برگه تحویل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: OPERATOR PRODUCTION DELIVERY & AUTO BOM DEDUCTION
         ========================================================= */}
      {activeTabMode === 'production' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <form onSubmit={handleProdSubmit} className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              فرم تحویل قطعه نیمه‌ساخته/نهایی توسط اپراتور به سرشیفت + کسر BOM
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام اپراتور تحویل دهنده*</label>
                <select
                  value={prodOperatorId}
                  onChange={(e) => setProdOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                >
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name} ({op.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شیفت کاری*</label>
                <select
                  value={prodShift}
                  onChange={(e) => setProdShift(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  <option value="Morning">شیفت صبح (۰۷:۰۰ الی ۱۵:۰۰)</option>
                  <option value="Evening">شیفت عصر (۱۵:۰۰ الی ۲۳:۰۰)</option>
                  <option value="Night">شیفت شب (۲۳:۰۰ الی ۰۷:۰۰)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پروژه ساخت مربوطه*</label>
                <select
                  value={prodProjectId}
                  onChange={(e) => {
                    setProdProjectId(e.target.value);
                    const p = projects.find(x => x.id === e.target.value);
                    if (p) setProdFinishedItemId(p.targetFinishedItemId);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مرحله خط تولید*</label>
                <select
                  value={prodStepId}
                  onChange={(e) => setProdStepId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  {selectedProdProject?.steps.map(s => (
                    <option key={s.id} value={s.id}>مرحله {s.stepNumber}: {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">کالا یا قطعه نیمه‌ساخته/نهایی تحویلی*</label>
                <select
                  value={prodFinishedItemId}
                  onChange={(e) => setProdFinishedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) - {i.itemType === 'SemiFinished' ? 'نیمه‌ساخته' : 'محصول نهایی'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعداد سالم تحویلی (عدد)*</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={prodQuantityProduced}
                  onChange={(e) => setProdQuantityProduced(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-700 font-mono font-bold text-lg focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعداد ضایعات / سوخته (عدد)</label>
                <input
                  type="number"
                  min={0}
                  value={prodQuantityScrapped}
                  onChange={(e) => setProdQuantityScrapped(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 font-mono font-bold text-lg focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">انبار کسر مواد اولیه (مبدا)*</label>
                <select
                  value={prodSourceWh}
                  onChange={(e) => setProdSourceWh(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">انبار تحویل محصول/نیمه‌ساخته (مقصد)*</label>
                <select
                  value={prodTargetWh}
                  onChange={(e) => setProdTargetWh(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دستگاه / ایستگاه تولید</label>
                <input
                  type="text"
                  value={prodMachineCode}
                  onChange={(e) => setProdMachineCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ و ساعت تحویل کالا*</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prodDate}
                    onChange={(e) => setProdDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={prodTime}
                    onChange={(e) => setProdTime(e.target.value)}
                    className="w-20 px-2 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-mono font-bold text-center focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و ملاحظات کیفی اپراتور</label>
              <textarea
                rows={2}
                value={prodNotes}
                onChange={(e) => setProdNotes(e.target.value)}
                placeholder="توضیحات درباره تست عملکردی، کنترل چشمی، کالیبراسیون"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              ></textarea>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>ثبت تحویل کالا + کسر اتوماتیک BOM + صدور رسید چاپی</span>
              </button>
            </div>
          </form>

          {/* Realtime BOM preview */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4">
            <div className="border-b pb-3 border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                محاسبه آنلاین کسر خودکار قطعات بر اساس BOM
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">اقلامی که به صورت اتوماتیک با این تحویل از انبار کسر می‌شوند</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[10px] text-slate-500 block">کالای نیمه‌ساخته/نهایی تحویلی:</span>
                <strong className="text-emerald-700 font-bold block">{items.find(i => i.id === prodFinishedItemId)?.name}</strong>
                <div className="text-[11px] text-emerald-800 font-mono font-bold">
                  + {prodQuantityProduced} عدد افزوده به انبار مقصد
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-[11px] font-bold text-slate-700 block">قطعات کسر شده بر اساس فرمول ساخت (BOM):</span>
                {(() => {
                  const targetItem = items.find(i => i.id === prodFinishedItemId);
                  const activeBom = boms.find(b => b.finishedItemId === targetItem?.id && b.isActive);

                  if (!activeBom) {
                    return (
                      <div className="p-3 text-amber-700 bg-amber-50 rounded-lg text-[11px]">
                        هیچ فرمول ساخت (BOM) برای این قطعه ثبت نشده است. کسر مواد اولیه انجام نخواهد شد.
                      </div>
                    );
                  }

                  return (
                    <div className="text-[11px] text-slate-600 space-y-1">
                      {activeBom.items.map((bi, idx) => {
                        const rawItem = items.find(i => i.id === bi.itemId);
                        const totalDeduction = bi.quantityNeeded * (prodQuantityProduced + prodQuantityScrapped);

                        return (
                          <div key={idx} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-200 font-mono">
                            <span className="font-sans text-slate-800">{rawItem?.name || bi.itemId}:</span>
                            <strong className="text-rose-600 font-bold">-{totalDeduction.toLocaleString('fa-IR')} {rawItem?.unit || 'عدد'}</strong>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Past Production Logs History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              سوابق رسیدهای ثبت تولید و تحویل کالا به انبار:
            </h4>

            {productionLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                هیچ گزارش تولیدی ثبت نشده است.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="whitespace-nowrap p-2.5">شماره رسید</th>
                      <th className="whitespace-nowrap p-2.5">اپراتور</th>
                      <th className="whitespace-nowrap p-2.5">پروژه و دستگاه</th>
                      <th className="whitespace-nowrap p-2.5">محصول نهایی/نیمه‌ساخته</th>
                      <th className="whitespace-nowrap p-2.5 text-center">تعداد سالم</th>
                      <th className="whitespace-nowrap p-2.5 text-center">ضایعات</th>
                      <th className="whitespace-nowrap p-2.5 text-center">تاریخ و ساعت</th>
                      <th className="whitespace-nowrap p-2.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {productionLogs.map(log => {
                      const proj = projects.find(p => p.id === log.projectId);
                      const item = items.find(i => i.id === log.finishedItemId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap p-2.5 font-mono text-emerald-700 font-bold">{log.receiptNumber}</td>
                          <td className="whitespace-nowrap p-2.5 font-bold text-slate-800">{log.operatorName}</td>
                          <td className="whitespace-nowrap p-2.5 text-slate-600">
                            {proj?.name} ({log.machineCode})
                          </td>
                          <td className="whitespace-nowrap p-2.5 text-slate-900 font-bold">{item?.name}</td>
                          <td className="whitespace-nowrap p-2.5 text-center font-bold text-emerald-600 font-mono">
                            {log.quantityProduced.toLocaleString('fa-IR')}
                          </td>
                          <td className="whitespace-nowrap p-2.5 text-center font-bold text-rose-600 font-mono">
                            {log.quantityScrapped.toLocaleString('fa-IR')}
                          </td>
                          <td className="whitespace-nowrap p-2.5 text-center font-mono text-slate-500">{log.date} - {log.time}</td>
                          <td className="whitespace-nowrap p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPrintableProdLog(log)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[11px] flex items-center gap-1"
                                title="چاپ رسید تحویل کالا"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>چاپ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`آیا از حذف لاگ تولید "${log.receiptNumber}" اطمینان دارید؟`)) {
                                    deleteProductionLog(log.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="حذف گزارش تولید"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          PRINT MODAL 1: SHIFT SUPERVISOR MATERIAL HANDOVER CHECKLIST
         ========================================================= */}
      {printableHandover && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:fixed print:inset-0 print:m-0 print:p-8 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:bg-white print:z-[99999]">
            {/* Modal Non-Print Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-sm">برگه چاپی تحویل قطعات به اپراتور (نسخه بایگانی زونکن)</h3>
              </div>
              <button onClick={() => setPrintableHandover(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE RECEIPT CONTENT */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-slate-900 text-xs dir-rtl">
              {/* Header Box */}
              <div className="border-2 border-slate-900 p-4 rounded-xl flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 text-white font-black text-xl flex items-center justify-center rounded-xl font-mono">
                    ES
                  </div>
                  <div>
                    <h2 className="font-black text-base text-slate-900">سامانه مدیریت هوشمند کارخانه الکترواستاک</h2>
                    <h3 className="font-bold text-xs text-indigo-700 mt-0.5">برگه رسمی تحویل قطعات و خروج مواد اولیه از انبار تولید به اپراتور</h3>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1">
                  <div><strong>شماره سند:</strong> <span className="text-indigo-700 font-bold">{printableHandover.docNumber}</span></div>
                  <div><strong>تاریخ تحویل:</strong> {printableHandover.date}</div>
                  <div><strong>ساعت تحویل (شروع کار):</strong> <span className="text-rose-700 font-bold">{printableHandover.startTime}</span></div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-300 p-3 rounded-lg bg-white text-[11px]">
                <div><span className="text-slate-500 block">سرشیفت (تحویل‌دهنده):</span> <strong>{printableHandover.shiftSupervisor}</strong></div>
                <div><span className="text-slate-500 block">سالن / واحد:</span> <strong>{printableHandover.salonName}</strong></div>
                <div><span className="text-slate-500 block">اپراتور (تحویل‌گیرنده):</span> <strong className="text-indigo-800">{printableHandover.operatorName}</strong></div>
                <div><span className="text-slate-500 block">کد پروژه و لاین:</span> <strong>{projects.find(p => p.id === printableHandover.projectId)?.code} ({printableHandover.machineCode || 'لاین اصلی'})</strong></div>
              </div>

              {/* Table Checklist */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">چک‌لیست و جزییات قطعات تحویلی:</h4>
                <table className="w-full border-collapse border border-slate-800 text-right text-xs">
                  <thead className="bg-slate-200 text-slate-900 font-bold">
                    <tr>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-10 text-center">ردیف</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-28">کد قطعه</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2">نام قطعه / ماده اولیه</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-24 text-center">تعداد تحویلی</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2">توضیحات فیزیکی / کیفیت</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-20 text-center">تایید تحویل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printableHandover.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap border border-slate-800 p-2 text-center font-bold font-mono">{idx + 1}</td>
                        <td className="whitespace-nowrap border border-slate-800 p-2 font-mono">{it.itemCode}</td>
                        <td className="whitespace-nowrap border border-slate-800 p-2 font-bold">{it.itemName}</td>
                        <td className="whitespace-nowrap border border-slate-800 p-2 text-center font-mono font-bold text-indigo-900">
                          {it.quantity.toLocaleString('fa-IR')} {it.unit}
                        </td>
                        <td className="whitespace-nowrap border border-slate-800 p-2 text-[11px] text-slate-700">{it.notes || '-'}</td>
                        <td className="whitespace-nowrap border border-slate-800 p-2 text-center">
                          <div className="w-5 h-5 border-2 border-slate-800 rounded-xs mx-auto my-0.5 bg-white"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {printableHandover.notes && (
                <div className="p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-[11px]">
                  <strong>دستورالعمل و ملاحظات سرشیفت:</strong> {printableHandover.notes}
                </div>
              )}

              {/* Signatures Section */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs font-bold border-t-2 border-slate-900 mt-6">
                <div className="space-y-8">
                  <div>امضاء و مهر سرشیفت (تحویل‌دهنده)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{printableHandover.shiftSupervisor}</div>
                </div>

                <div className="space-y-8">
                  <div>امضاء اپراتور (تحویل‌گیرنده)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{printableHandover.operatorName}</div>
                </div>

                <div className="space-y-8">
                  <div>امضاء مسئول انبار / کنترل کیفیت</div>
                  <div className="text-[10px] text-slate-500 font-normal">تایید فیزیکی اسناد بایگانی زونکن</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setPrintableHandover(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                بستن
              </button>
              
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ برگه تحویل (پرینت A4/A5)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PRINT MODAL 2: PRODUCTION HANDOVER RECEIPT
         ========================================================= */}
      {printableProdLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:fixed print:inset-0 print:m-0 print:p-8 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:bg-white print:z-[99999]">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-sm">رسید چاپی تحویل قطعه نیمه‌ساخته/نهایی به سرشیفت و انبار</h3>
              </div>
              <button onClick={() => setPrintableProdLog(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-slate-900 text-xs dir-rtl">
              <div className="border-2 border-slate-900 p-4 rounded-xl flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 text-white font-black text-xl flex items-center justify-center rounded-xl font-mono">
                    PRD
                  </div>
                  <div>
                    <h2 className="font-black text-base text-slate-900">سامانه مدیریت هوشمند کارخانه الکترواستاک</h2>
                    <h3 className="font-bold text-xs text-emerald-700 mt-0.5">رسید رسمی تحویل محصول تولیدی / قطعه نیمه‌ساخته و کسر اتوماتیک BOM</h3>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1">
                  <div><strong>شماره رسید:</strong> <span className="text-emerald-700 font-bold">{printableProdLog.id}</span></div>
                  <div><strong>تاریخ تحویل:</strong> {printableProdLog.date}</div>
                  <div><strong>ساعت تحویل (پایان کار):</strong> <span className="text-emerald-800 font-bold">{printableProdLog.time}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-300 p-3 rounded-lg bg-white text-[11px]">
                <div><span className="text-slate-500 block">اپراتور تحویل‌دهنده:</span> <strong className="text-slate-900">{printableProdLog.operatorName}</strong></div>
                <div><span className="text-slate-500 block">شیفت کاری:</span> <strong>{printableProdLog.shift === 'Morning' ? 'صبح' : printableProdLog.shift === 'Evening' ? 'عصر' : 'شب'}</strong></div>
                <div><span className="text-slate-500 block">کد پروژه و ایستگاه:</span> <strong>{projects.find(p => p.id === printableProdLog.projectId)?.code} ({printableProdLog.machineCode})</strong></div>
                <div><span className="text-slate-500 block">انبار تحویل‌گیرنده:</span> <strong className="text-emerald-800">{warehouses.find(w => w.id === printableProdLog.targetWarehouseId)?.name}</strong></div>
              </div>

              {/* Product Produced Details */}
              <div className="p-4 border border-emerald-300 rounded-xl bg-emerald-50/50 space-y-2">
                <h4 className="font-bold text-emerald-900 text-xs">مشخصات کالا/برد نیمه‌ساخته تحویل داده شده:</h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block font-sans">نام محصول / نیمه‌ساخته:</span>
                    <strong className="text-slate-900 text-xs font-sans block">{items.find(i => i.id === printableProdLog.finishedItemId)?.name}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block font-sans">تعداد سالم تحویلی:</span>
                    <strong className="text-emerald-700 text-sm font-bold block">{printableProdLog.quantityProduced.toLocaleString('fa-IR')} عدد</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block font-sans">تعداد ضایعات / سوخته:</span>
                    <strong className="text-rose-600 text-sm font-bold block">{printableProdLog.quantityScrapped.toLocaleString('fa-IR')} عدد</strong>
                  </div>
                </div>
              </div>

              {/* Automatic BOM Deduction Breakdown Table */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">صورت کسر اتوماتیک قطعات بر اساس فرمول ساخت (BOM):</h4>
                <table className="w-full border-collapse border border-slate-800 text-right text-xs">
                  <thead className="bg-slate-200 text-slate-900 font-bold">
                    <tr>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-10 text-center">ردیف</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2">نام قطعه / ماده اولیه کسر شده</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 text-center">مقدار کسر شده از انبار مبدا</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 text-center">انبار کسر شده</th>
                      <th className="whitespace-nowrap border border-slate-800 p-2 w-20 text-center">تایید تحویل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const targetItem = items.find(i => i.id === printableProdLog.finishedItemId);
                      const activeBom = boms.find(b => b.finishedItemId === targetItem?.id && b.isActive);

                      if (!activeBom) {
                        return (
                          <tr>
                            <td colSpan={5} className="border border-slate-800 p-3 text-center text-slate-500">
                              بدون کسر BOM (فرمول تعریف نشده است)
                            </td>
                          </tr>
                        );
                      }

                      return activeBom.items.map((bi, idx) => {
                        const rawItem = items.find(i => i.id === bi.itemId);
                        const totalDeducted = bi.quantityNeeded * (printableProdLog.quantityProduced + printableProdLog.quantityScrapped);

                        return (
                          <tr key={idx}>
                            <td className="whitespace-nowrap border border-slate-800 p-2 text-center font-bold font-mono">{idx + 1}</td>
                            <td className="whitespace-nowrap border border-slate-800 p-2 font-bold">{rawItem?.name} ({rawItem?.code})</td>
                            <td className="whitespace-nowrap border border-slate-800 p-2 text-center font-mono font-bold text-rose-700">
                              -{totalDeducted.toLocaleString('fa-IR')} {rawItem?.unit || 'عدد'}
                            </td>
                            <td className="whitespace-nowrap border border-slate-800 p-2 text-center text-slate-700">
                              {warehouses.find(w => w.id === printableProdLog.sourceWarehouseId)?.name}
                            </td>
                            <td className="whitespace-nowrap border border-slate-800 p-2 text-center">
                              <div className="w-5 h-5 border-2 border-slate-800 rounded-xs mx-auto my-0.5 bg-white"></div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs font-bold border-t-2 border-slate-900 mt-6">
                <div className="space-y-8">
                  <div>امضاء اپراتور (تحویل‌دهنده)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{printableProdLog.operatorName}</div>
                </div>

                <div className="space-y-8">
                  <div>امضاء سرشیفت سالن (تایید کیفیت و تعداد)</div>
                  <div className="text-[10px] text-slate-500 font-normal">{currentUser.fullName}</div>
                </div>

                <div className="space-y-8">
                  <div>امضاء انباردار (تحویل‌گیرنده محصول)</div>
                  <div className="text-[10px] text-slate-500 font-normal">ثبت خودکار در موجودی انبار</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setPrintableProdLog(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                بستن
              </button>
              
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسید تحویل کالا (پرینت)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
