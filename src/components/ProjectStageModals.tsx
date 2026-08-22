import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Project, ProjectStep, Item, Warehouse } from '../types';
import { 
  Package, Boxes, CheckCircle2, Clock, PlayCircle, AlertTriangle, 
  X, Check, Factory, Users, ShieldAlert, ArrowRight, Layers, 
  FileSpreadsheet, Printer, Download, Sparkles, TrendingUp
} from 'lucide-react';

// ============================================================================
// 1. STEP MATERIAL HANDOVER MODAL (تحویل قطعات و شروع مرحله)
// ============================================================================
export const StepMaterialHandoverModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  step: ProjectStep;
}> = ({ isOpen, onClose, project, step }) => {
  const { items, warehouses, operators, inventory, handoverStepMaterials, currentUser } = useApp();

  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [supervisorName, setSupervisorName] = useState(currentUser?.fullName || 'سرپرست تولید');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(
    warehouses.find(w => w.name.includes('اولیه') || w.name.includes('قطعات'))?.id || warehouses[0]?.id || ''
  );
  const [salonName, setSalonName] = useState('سالن تولید و مونتاژ');
  const [machineCode, setMachineCode] = useState('LINE-01');
  const [notes, setNotes] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(step.outputQuantity || step.targetQuantity || project.targetQuantity || 100);

  const [handoverItems, setHandoverItems] = useState<{ itemId: string; quantity: number; notes?: string }[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize operators and materials from step BOM
  useEffect(() => {
    if (step.assignedOperators && step.assignedOperators.length > 0) {
      const firstOp = operators.find(op => step.assignedOperators.includes(op.name) || step.assignedOperators.includes(op.id));
      if (firstOp) {
        setOperatorId(firstOp.id);
        setOperatorName(firstOp.name);
      } else {
        setOperatorName(step.assignedOperators[0]);
      }
    } else if (operators.length > 0) {
      setOperatorId(operators[0].id);
      setOperatorName(operators[0].name);
    }

    // Build items from step.bomItems
    const stepTarget = step.outputQuantity || step.targetQuantity || project.targetQuantity || 100;
    setBatchQuantity(stepTarget);

    if (step.bomItems && step.bomItems.length > 0) {
      setHandoverItems(
        step.bomItems.map(b => ({
          itemId: b.itemId,
          quantity: Math.ceil((b.quantityNeeded || 1) * stepTarget * (1 + (b.scrapAllowancePercent || 0) / 100)),
          notes: `سهمیه فرمول ساخت مرحله ${step.name}`
        }))
      );
    } else {
      // Fallback to raw materials
      const rawMaterials = items.filter(i => i.itemType === 'RawMaterial' || i.itemType === 'Component').slice(0, 2);
      if (rawMaterials.length > 0) {
        setHandoverItems(
          rawMaterials.map(m => ({
            itemId: m.id,
            quantity: stepTarget,
            notes: 'تحویل قطعات اولیه مرحله'
          }))
        );
      }
    }
  }, [step, project, items, operators]);

  if (!isOpen) return null;

  const handleUpdateItemQty = (idx: number, newQty: number) => {
    setHandoverItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantity: Math.max(1, newQty) };
      return copy;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setHandoverItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddItem = (itemId: string) => {
    if (!itemId) return;
    if (handoverItems.some(i => i.itemId === itemId)) return;
    setHandoverItems(prev => [...prev, { itemId, quantity: batchQuantity, notes: 'افزوده شده به برگه' }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverItems.length === 0) {
      setNotification({ type: 'error', text: 'لطفاً حداقل یک قلم کالا جهت تحویل مشخص کنید.' });
      return;
    }

    if (!operatorName.trim()) {
      setNotification({ type: 'error', text: 'لطفاً نام اپراتور تحویل‌گیرنده را مشخص کنید.' });
      return;
    }

    const res = handoverStepMaterials({
      projectId: project.id,
      stepId: step.id,
      operatorId: operatorId || `op-${Date.now()}`,
      operatorName: operatorName,
      supervisorName: supervisorName,
      sourceWarehouseId: sourceWarehouseId,
      items: handoverItems,
      salonName,
      machineCode,
      notes,
    });

    if (res.success) {
      setNotification({ type: 'success', text: `${res.message} (سند شماره: ${res.docNumber})` });
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">تحویل قطعات و شروع خودکار مرحله</h3>
              <p className="text-xs text-indigo-100 mt-0.5 font-mono">
                پروژه {project.code} | مرحله: {step.name || step.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {notification && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>{notification.text}</span>
            </div>
          )}

          {/* Info Banner */}
          <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-indigo-950 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              با ثبت تحویل قطعات، اقلام مربوطه از انبار مبدا کسر شده و وضعیت این مرحله به‌صورت خودکار به <strong>«در حال انجام» (InProgress)</strong> و وضعیت کلی پروژه به <strong>«در حال اجرا»</strong> تغییر خواهد یافت.
            </p>
          </div>

          {/* Step Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Operator Selection */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">اپراتور تحویل‌گیرنده:</label>
              <select
                value={operatorId}
                onChange={(e) => {
                  setOperatorId(e.target.value);
                  const op = operators.find(o => o.id === e.target.value);
                  if (op) setOperatorName(op.name);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- انتخاب از لیست اپراتورها --</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name} ({op.code}) - {op.role}</option>
                ))}
              </select>
            </div>

            {/* Source Warehouse */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">انبار مبدا کسر قطعات:</label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {/* Supervisor Name */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">سرپرست تحویل‌دهنده:</label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Machine Code / Line */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">کد خط / دستگاه:</label>
              <input
                type="text"
                value={machineCode}
                onChange={(e) => setMachineCode(e.target.value)}
                placeholder="LINE-01"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Items Table for this stage */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>اقلام و قطعات تحویلی به اپراتور:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {handoverItems.length} قلم قطعه
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">نام قطعه / ماده اولیه</th>
                    <th className="p-2.5 w-28 text-center">موجودی انبار</th>
                    <th className="p-2.5 w-28 text-center">تعداد تحویلی</th>
                    <th className="p-2.5 w-16 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handoverItems.map((hItem, idx) => {
                    const selItem = items.find(i => i.id === hItem.itemId);
                    const currentStock = inventory.find(inv => inv.itemId === hItem.itemId && inv.warehouseId === sourceWarehouseId)?.quantity || 0;
                    const isShortage = currentStock < hItem.quantity;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{selItem?.name || hItem.itemId}</div>
                          <div className="text-[10px] text-slate-400 font-mono">کد: {selItem?.code}</div>
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            isShortage ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {currentStock.toLocaleString('fa-IR')} {selItem?.unit || 'عدد'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={hItem.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                            className="w-20 p-1.5 border border-slate-200 rounded-lg text-center font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Add Extra Item */}
            <div className="flex items-center gap-2 pt-1">
              <select
                onChange={(e) => {
                  handleAddItem(e.target.value);
                  e.target.value = '';
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600"
              >
                <option value="">+ افزودن قطعه تکمیلی دیگر به برگه تحویل...</option>
                {items
                  .filter(it => !handoverItems.some(hi => hi.itemId === it.id))
                  .map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.code}) - {it.unit}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">توضیحات و ملاحظات تحویل:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تحویل محموله نوبت صبح جهت فرآیند مونتاژ"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تایید تحویل قطعات و شروع مرحله</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. STEP OUTPUT RECEIPT MODAL (ثبت دریافت محصول نیمه‌ساخته / خروجی مرحله)
// ============================================================================
export const StepOutputReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  step: ProjectStep;
}> = ({ isOpen, onClose, project, step }) => {
  const { items, warehouses, operators, recordStepOutputReceipt, currentUser, contractors, contractorContracts } = useApp();

  const outputItemId = step.outputItemId || project.targetFinishedItemId;
  const outputItem = items.find(i => i.id === outputItemId);

  const stepTarget = step.outputQuantity || step.targetQuantity || project.targetQuantity || 100;
  const completedSoFar = step.completedQuantity || 0;
  const remainingQty = Math.max(0, stepTarget - completedSoFar);

  const [quantityProduced, setQuantityProduced] = useState<number>(remainingQty > 0 ? remainingQty : 10);
  const [quantityScrapped, setQuantityScrapped] = useState<number>(0);
  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [targetWarehouseId, setTargetWarehouseId] = useState(
    step.targetWarehouseId || 
    warehouses.find(w => w.name.includes('نیمه‌ساخته') || w.name.includes('محصول') || w.name.includes('اصلی'))?.id || 
    warehouses[0]?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Contractor info if step is outsourced
  const assignedContractor = step.contractorId ? contractors.find(c => c.id === step.contractorId) : null;
  const stepContract = contractorContracts.find(
    c => c.contractorId === step.contractorId && c.projectId === project.id && c.stepId === step.id && c.status === 'Active'
  );
  const projContract = contractorContracts.find(
    c => c.contractorId === step.contractorId && c.projectId === project.id && c.status === 'Active'
  );
  const generalContract = contractorContracts.find(
    c => c.contractorId === step.contractorId && !c.projectId && c.status === 'Active'
  );
  const matchedContract = stepContract || projContract || generalContract;
  const unitWage = matchedContract?.wagePerUnit || step.contractorCost || step.outsourcingCost || assignedContractor?.defaultUnitWage || 0;
  const calculatedTotalWage = (Number(quantityProduced) || 0) * unitWage;

  // Initialize operator
  useEffect(() => {
    if (step.assignedOperators && step.assignedOperators.length > 0) {
      const firstOp = operators.find(op => step.assignedOperators.includes(op.name) || step.assignedOperators.includes(op.id));
      if (firstOp) {
        setOperatorId(firstOp.id);
        setOperatorName(firstOp.name);
      } else {
        setOperatorName(step.assignedOperators[0]);
      }
    } else if (operators.length > 0) {
      setOperatorId(operators[0].id);
      setOperatorName(operators[0].name);
    }
  }, [step, operators]);

  if (!isOpen) return null;

  // Real-time progress computation preview
  const newStepCompleted = completedSoFar + Number(quantityProduced || 0);
  const newStepProgress = Math.min(100, Math.round((newStepCompleted / stepTarget) * 100));
  const willCompleteStep = newStepCompleted >= stepTarget;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantityProduced || Number(quantityProduced) <= 0) {
      setNotification({ type: 'error', text: 'لطفاً تعداد قطعات سالم تولید/دریافت شده را وارد فرمایید.' });
      return;
    }

    if (!operatorName.trim()) {
      setNotification({ type: 'error', text: 'لطفاً نام اپراتور تحویل‌دهنده را انتخاب کنید.' });
      return;
    }

    const res = recordStepOutputReceipt({
      projectId: project.id,
      stepId: step.id,
      quantityProduced: Number(quantityProduced),
      quantityScrapped: Number(quantityScrapped || 0),
      operatorId: operatorId || `op-${Date.now()}`,
      operatorName: operatorName,
      shift: shift,
      targetWarehouseId: targetWarehouseId,
      notes: notes,
    });

    if (res.success) {
      setNotification({ type: 'success', text: res.message });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setNotification({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">ثبت دریافت محصول نیمه‌ساخته / خروجی مرحله</h3>
              <p className="text-xs text-purple-100 mt-0.5 font-mono">
                پروژه {project.code} | مرحله: {step.name || step.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {notification && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>{notification.text}</span>
            </div>
          )}

          {/* Item & Stage Current Stats Banner */}
          <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-purple-600" />
                <span>کالای خروجی: {outputItem?.name || 'قطعه تولیدی این مرحله'}</span>
              </div>
              <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                کد: {outputItem?.code || 'P-OUT'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div className="bg-white p-2 rounded-xl border border-purple-100">
                <span className="text-[10px] text-slate-500 block">تیراژ هدف مرحله:</span>
                <strong className="text-slate-900 font-bold text-sm">{stepTarget.toLocaleString('fa-IR')} {outputItem?.unit || 'عدد'}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-purple-100">
                <span className="text-[10px] text-slate-500 block">تولید شده تاکنون:</span>
                <strong className="text-emerald-700 font-bold text-sm">{completedSoFar.toLocaleString('fa-IR')} {outputItem?.unit || 'عدد'}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-purple-100">
                <span className="text-[10px] text-slate-500 block">باقی‌مانده:</span>
                <strong className="text-amber-700 font-bold text-sm">{remainingQty.toLocaleString('fa-IR')} {outputItem?.unit || 'عدد'}</strong>
              </div>
            </div>
          </div>

          {/* Contractor Wage & Financial Accounting Integration Card */}
          {step.isOutsourced && assignedContractor && (
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-amber-600" />
                  <span>پیمانکار مجری: {assignedContractor.name} ({assignedContractor.code})</span>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  برونسپاری پروژه {project.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-slate-500 block text-[10px]">نرخ کارمزد توافقی در این پروژه:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {unitWage > 0 ? `${unitWage.toLocaleString('fa-IR')} ریال / قطعه` : 'تعیین نشده'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-slate-500 block text-[10px]">کارمزد محاسبه‌شده این نوبت:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {calculatedTotalWage.toLocaleString('fa-IR')} ریال
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-amber-800 leading-normal">
                ✓ با تایید دریافت، سند حسابداری دوبل به صورت خودکار صادر شده و پیمانکار بابت این پروژه بستانکار خواهد شد.
              </p>
            </div>
          )}

          {/* Input Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quantity Produced */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تعداد قطعات سالم دریافتی در این نوبت:</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-center text-base font-mono font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Scrap Quantity */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>تعداد ضایعات نامنطبق:</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantityScrapped}
                onChange={(e) => setQuantityScrapped(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-center text-base font-mono font-bold text-amber-800 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Destination Warehouse & Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Warehouse */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">انبار مقصد ورود محصول نیمه‌ساخته:</label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {/* Operator */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">اپراتور تحویل‌دهنده:</label>
              <select
                value={operatorId}
                onChange={(e) => {
                  setOperatorId(e.target.value);
                  const op = operators.find(o => o.id === e.target.value);
                  if (op) setOperatorName(op.name);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name} ({op.code}) - {op.role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">شیفت کاری:</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="Morning">شیفت صبح</option>
                <option value="Evening">شیفت عصر</option>
                <option value="Night">شیفت شب</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">توضیحات و شماره سریال بسته:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تاییدیه کنترل کیفیت و بارکد ره‌گیری"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Live Progress Dynamic Calculation Feedback */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-emerald-50 border border-indigo-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>محاسبه هوشمند پیشرفت مرحله و پروژه:</span>
              </span>
              <span className="font-mono text-xs font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-100">
                {newStepProgress}% پیشرفت مرحله
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${newStepProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              با ثبت دریافت این <strong className="font-mono text-indigo-700">{quantityProduced}</strong> عدد، مجموع قطعات تولیدی این مرحله به <strong className="font-mono text-emerald-700">{newStepCompleted}</strong> از <strong className="font-mono">{stepTarget}</strong> عدد می‌رسد.
              {willCompleteStep ? (
                <span className="text-emerald-700 font-bold block mt-0.5">
                  ✓ هدف مرحله تکمیل شده و وضعیت مرحله به‌صورت اتوماتیک به «تکمیل شده» (Completed) تغییر خواهد یافت.
                </span>
              ) : (
                <span className="text-indigo-700 font-bold block mt-0.5">
                  • وضعیت مرحله در حال انجام (InProgress) با درصد پیشرفت به‌روزرسانی شده ثبت می‌گردد.
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت قطعی دریافت و به‌روزرسانی درصد پیشرفت</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. PROJECT STAGE PROGRESS MATRIX & REPORTING MODAL (گزارش تفصیلی پیشرفت مراحل)
// ============================================================================
export const ProjectStageProgressReportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}> = ({ isOpen, onClose, project }) => {
  const { items, contractors, calculateProjectProgressSummary } = useApp();
  const [filterStatus, setFilterStatus] = useState<'all' | 'Completed' | 'InProgress' | 'Pending'>('all');

  if (!isOpen) return null;

  const summary = calculateProjectProgressSummary(project);
  const finishedItem = items.find(i => i.id === project.targetFinishedItemId);

  const filteredSteps = summary.stepsSummary.filter(s => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  const handleExportCSV = () => {
    const rows = [
      ["کد پروژه", "نام پروژه", "شماره مرحله", "عنوان مرحله", "وضعیت مرحله", "تیراژ هدف", "تکمیل شده", "ضایعات", "درصد پیشرفت"],
      ...summary.stepsSummary.map((st, idx) => [
        project.code,
        project.name,
        String(idx + 1),
        st.stepName,
        st.status === 'Completed' ? 'تکمیل شده' : st.status === 'InProgress' ? 'در حال انجام' : 'در انتظار',
        String(st.targetQuantity),
        String(st.completedQuantity),
        String(st.scrapQuantity),
        `${st.progressPercent}%`
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Progress_${project.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">گزارش مدیریتی پیشرفت مراحل و گردش تولید</h3>
              <p className="text-xs text-indigo-200 mt-0.5 font-mono">
                پروژه: {project.name} ({project.code}) | کارفرما: {project.client}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>چاپ</span>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Header */}
        <div className="hidden print:flex justify-between items-center border-b pb-4 border-slate-300 p-4">
          <div>
            <h1 className="text-lg font-bold">گزارش کنترل پیشرفت مراحل پروژه: {project.name} ({project.code})</h1>
            <p className="text-xs text-slate-600">کارفرما: {project.client} | محصول نهایی: {finishedItem?.name}</p>
          </div>
          <div className="text-left font-mono text-xs">
            <div>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>درصد پیشرفت کل: {summary.averageProgressPercent}٪</div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl text-center">
              <span className="text-[11px] text-indigo-800 font-bold block mb-1">میانگین پیشرفت کل</span>
              <strong className="text-xl font-black font-mono text-indigo-950">{summary.averageProgressPercent}%</strong>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
              <span className="text-[11px] text-slate-600 font-bold block mb-1">تعداد کل مراحل</span>
              <strong className="text-xl font-bold font-mono text-slate-900">{summary.totalSteps}</strong>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center">
              <span className="text-[11px] text-emerald-800 font-bold block mb-1">مراحل تکمیل شده</span>
              <strong className="text-xl font-bold font-mono text-emerald-700">{summary.completedSteps}</strong>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-center">
              <span className="text-[11px] text-amber-800 font-bold block mb-1">در حال انجام</span>
              <strong className="text-xl font-bold font-mono text-amber-700">{summary.inProgressSteps}</strong>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center">
              <span className="text-[11px] text-rose-800 font-bold block mb-1">در انتظار</span>
              <strong className="text-xl font-bold font-mono text-rose-700">{summary.pendingSteps}</strong>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-[11px]">فیلتر وضعیت:</span>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                همه ({summary.totalSteps})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Completed')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${filterStatus === 'Completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                تکمیل شده ({summary.completedSteps})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('InProgress')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${filterStatus === 'InProgress' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                در حال اجرا ({summary.inProgressSteps})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Pending')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${filterStatus === 'Pending' ? 'bg-slate-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                در انتظار ({summary.pendingSteps})
              </button>
            </div>
          </div>

          {/* Detailed Step-by-Step Matrix Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs print:border-slate-400">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] print:bg-slate-200 print:text-black">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">عنوان و نام مرحله ساخت</th>
                  <th className="p-3 w-28 text-center">تیراژ هدف</th>
                  <th className="p-3 w-28 text-center">تکمیل شده</th>
                  <th className="p-3 w-20 text-center">ضایعات</th>
                  <th className="p-3 w-44">درصد پیشرفت کار</th>
                  <th className="p-3 w-28 text-center">وضعیت اجرایی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {filteredSteps.map((st, idx) => (
                  <tr key={st.stepId} className="hover:bg-slate-50/80">
                    <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{st.stepName}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {st.targetQuantity.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {st.completedQuantity.toLocaleString('fa-IR')}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-700">
                      {st.scrapQuantity > 0 ? st.scrapQuantity.toLocaleString('fa-IR') : '-'}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500">{st.completedQuantity} / {st.targetQuantity}</span>
                          <span className="font-bold text-indigo-700">{st.progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              st.progressPercent === 100 
                                ? 'bg-emerald-500' 
                                : st.progressPercent > 0 
                                ? 'bg-indigo-600' 
                                : 'bg-slate-200'
                            }`}
                            style={{ width: `${st.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {st.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          تکمیل شده
                        </span>
                      ) : st.status === 'InProgress' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          در حال انجام
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <PlayCircle className="w-3 h-3 text-slate-400" />
                          در انتظار
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
