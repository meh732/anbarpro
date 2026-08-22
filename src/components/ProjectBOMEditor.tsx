import React, { useState } from 'react';
import { Item, BOM, BOMItem } from '../types';
import { 
  Plus, Trash2, Boxes, AlertTriangle, CheckCircle2, DollarSign, 
  Layers, ChevronDown, ChevronUp, Sparkles, Check, Package, Cpu, 
  ArrowRight, Info, Filter, ListOrdered
} from 'lucide-react';

export interface StepBOMConfig {
  stepId: string;
  stepNumber: number;
  stepName: string;
  outputItemId?: string;
  items: BOMRowItem[];
}

export interface BOMRowItem {
  itemId: string;
  quantityNeeded: number;
  unit: string;
  scrapAllowancePercent: number;
  notes?: string;
}

interface ProjectBOMEditorProps {
  targetItemId: string;
  items: Item[];
  // Stage-by-stage support
  steps?: {
    id?: string;
    stepNumber?: number;
    name?: string;
    outputItemId?: string;
    bomItems?: BOMItem[];
  }[];
  stepBoms?: StepBOMConfig[];
  setStepBoms?: React.Dispatch<React.SetStateAction<StepBOMConfig[]>>;
  // Flat fallback support
  bomRows?: BOMRowItem[];
  setBomRows?: React.Dispatch<React.SetStateAction<BOMRowItem[]>>;
  existingBom?: BOM | null;
  targetQuantity?: number;
  language?: string;
}

export const ProjectBOMEditor: React.FC<ProjectBOMEditorProps> = ({
  targetItemId,
  items,
  steps = [],
  stepBoms,
  setStepBoms,
  bomRows,
  setBomRows,
  existingBom,
  targetQuantity = 100,
}) => {
  const targetItem = items.find(i => i.id === targetItemId);
  const isStageMode = Boolean(stepBoms && setStepBoms && stepBoms.length > 0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0); // 0 = first step, -1 = overall summary
  const [filterType, setFilterType] = useState<string>('all');
  const [quickSearch, setQuickSearch] = useState<string>('');

  // ----------------------------------------------------
  // Stage-based handlers
  // ----------------------------------------------------
  const currentStepConfig = isStageMode && stepBoms ? stepBoms[activeStepIndex] : null;

  const handleAddRowToStage = (stageIdx: number) => {
    if (!stepBoms || !setStepBoms) return;
    const defaultItem = items.find(i => i.id !== targetItemId && (i.itemType === 'RawMaterial' || i.itemType === 'Component')) || items[0];
    
    setStepBoms(prev => prev.map((cfg, idx) => {
      if (idx !== stageIdx) return cfg;
      return {
        ...cfg,
        items: [
          ...cfg.items,
          {
            itemId: defaultItem?.id || '',
            quantityNeeded: 1,
            unit: defaultItem?.unit || 'عدد',
            scrapAllowancePercent: 2,
            notes: '',
          },
        ],
      };
    }));
  };

  const handleRemoveRowFromStage = (stageIdx: number, rowIdx: number) => {
    if (!stepBoms || !setStepBoms) return;
    setStepBoms(prev => prev.map((cfg, idx) => {
      if (idx !== stageIdx) return cfg;
      return {
        ...cfg,
        items: cfg.items.filter((_, i) => i !== rowIdx),
      };
    }));
  };

  const handleStageRowChange = (
    stageIdx: number, 
    rowIdx: number, 
    field: keyof BOMRowItem, 
    value: any
  ) => {
    if (!stepBoms || !setStepBoms) return;
    setStepBoms(prev => prev.map((cfg, idx) => {
      if (idx !== stageIdx) return cfg;
      const updatedItems = cfg.items.map((row, i) => {
        if (i !== rowIdx) return row;
        if (field === 'itemId') {
          const found = items.find(it => it.id === value);
          return {
            ...row,
            itemId: value,
            unit: found?.unit || row.unit,
          };
        }
        return { ...row, [field]: value };
      });
      return { ...cfg, items: updatedItems };
    }));
  };

  // ----------------------------------------------------
  // Flat Mode Handlers (Fallback for flat bomRows)
  // ----------------------------------------------------
  const handleAddFlatRow = () => {
    if (!setBomRows) return;
    const rawOrComp = items.find(i => i.id !== targetItemId && (i.itemType === 'RawMaterial' || i.itemType === 'Component' || i.itemType === 'SemiFinished')) || items[0];
    setBomRows(prev => [
      ...prev,
      {
        itemId: rawOrComp?.id || '',
        quantityNeeded: 1,
        unit: rawOrComp?.unit || 'عدد',
        scrapAllowancePercent: 2,
      },
    ]);
  };

  const handleRemoveFlatRow = (index: number) => {
    if (!setBomRows) return;
    setBomRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleFlatRowChange = (index: number, field: keyof BOMRowItem, value: any) => {
    if (!setBomRows) return;
    setBomRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      if (field === 'itemId') {
        const found = items.find(i => i.id === value);
        return {
          ...row,
          itemId: value,
          unit: found?.unit || row.unit,
        };
      }
      return { ...row, [field]: value };
    }));
  };

  // ----------------------------------------------------
  // Calculations & Aggregations
  // ----------------------------------------------------
  const allStageItems: { stageNumber: number; stageName: string; item: BOMRowItem }[] = [];
  if (isStageMode && stepBoms) {
    stepBoms.forEach(stg => {
      stg.items.forEach(it => {
        allStageItems.push({
          stageNumber: stg.stepNumber,
          stageName: stg.stepName,
          item: it,
        });
      });
    });
  }

  const activeRows = isStageMode 
    ? (activeStepIndex === -1 ? [] : (stepBoms?.[activeStepIndex]?.items || []))
    : (bomRows || []);

  const totalDistinctItemsCount = isStageMode 
    ? new Set(allStageItems.map(x => x.item.itemId)).size 
    : new Set((bomRows || []).map(r => r.itemId)).size;

  const totalEstimatedCost = isStageMode
    ? allStageItems.reduce((acc, x) => {
        const it = items.find(i => i.id === x.item.itemId);
        return acc + (it?.unitPrice || 0) * (x.item.quantityNeeded || 0);
      }, 0)
    : (bomRows || []).reduce((acc, row) => {
        const it = items.find(i => i.id === row.itemId);
        return acc + (it?.unitPrice || 0) * (row.quantityNeeded || 0);
      }, 0);

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                فرمول ساخت و مصرف قطعات (BOM) به تفکیک مراحل
              </h4>
              {existingBom ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  نسخه فعال: {existingBom.version}
                </span>
              ) : (
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  فرمول جدید پروژه
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              مواد اولیه و قطعات لازم برای ساخت هر واحد «<strong className="text-indigo-700">{targetItem?.name || 'محصول انتخاب‌شده'}</strong>» را به تفکیک هر مرحله تعریف فرمایید.
            </p>
          </div>
        </div>

        {/* Global Action / Current Stage Add Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isStageMode && activeStepIndex !== -1 ? (
            <button
              type="button"
              onClick={() => handleAddRowToStage(activeStepIndex)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن قطعه به این مرحله</span>
            </button>
          ) : !isStageMode ? (
            <button
              type="button"
              onClick={handleAddFlatRow}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن قطعه جدید</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Stage Selection Navigation Tabs (Ultra-Clean Stage Pills) */}
      {isStageMode && stepBoms && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              انتخاب مرحله جهت تعریف قطعات مصرفی آن:
            </span>
            <span className="text-[10px] text-slate-400">
              کل مراحل: {stepBoms.length} مرحله
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {stepBoms.map((stg, idx) => {
              const isActive = activeStepIndex === idx;
              const itemCount = stg.items.length;
              const hasOutItem = Boolean(stg.outputItemId);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                    isActive ? 'bg-indigo-800/80 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {stg.stepNumber || idx + 1}
                  </span>
                  <span className="max-w-[140px] truncate">{stg.stepName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive 
                      ? 'bg-indigo-500/50 text-white' 
                      : itemCount > 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {itemCount} قلم
                  </span>
                </button>
              );
            })}

            {/* Total BOM Overview Tab */}
            <button
              type="button"
              onClick={() => setActiveStepIndex(-1)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                activeStepIndex === -1
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800/20'
                  : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/90 shadow-2xs'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>نمای کلی تمام مراحل ({allStageItems.length} ردیف)</span>
            </button>
          </div>
        </div>
      )}

      {/* Stage Context Banner if in Stage Mode */}
      {isStageMode && currentStepConfig && activeStepIndex !== -1 && (
        <div className="bg-white border border-indigo-100 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-200">
              مرحله {currentStepConfig.stepNumber}: {currentStepConfig.stepName}
            </span>
            {currentStepConfig.outputItemId && (
              <span className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 font-medium">
                <Boxes className="w-3 h-3 text-amber-600" />
                تولید نیمه‌ساخته: <strong>{items.find(i => i.id === currentStepConfig.outputItemId)?.name || currentStepConfig.outputItemId}</strong>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            اقلام مصرفی این مرحله: <strong className="text-slate-800 font-mono">{currentStepConfig.items.length}</strong> قلم
          </div>
        </div>
      )}

      {/* Active Stage Table OR Overall Summary Table */}
      {isStageMode && activeStepIndex === -1 ? (
        /* Overall Summary of All Stages */
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-32">مرحله خط تولید</th>
                  <th className="p-2.5">ماده اولیه / قطعه مصرفی</th>
                  <th className="p-2.5 w-24 text-center">مقدار در ۱ واحد</th>
                  <th className="p-2.5 w-16 text-center">واحد</th>
                  <th className="p-2.5 w-20 text-center">ضایعات</th>
                  <th className="p-2.5 w-28 text-center bg-indigo-50/50 text-indigo-950">کل برای کل پروژه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allStageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                      هنوز هیچ قطعه‌ای برای هیچ‌کدام از مراحل تعریف نشده است.
                    </td>
                  </tr>
                ) : (
                  allStageItems.map((entry, idx) => {
                    const selItem = items.find(i => i.id === entry.item.itemId);
                    const totalWithScrap = Math.ceil((entry.item.quantityNeeded || 0) * targetQuantity * (1 + (entry.item.scrapAllowancePercent || 0) / 100));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-indigo-700 text-[11px]">
                          مرحله {entry.stageNumber}: {entry.stageName}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{selItem?.name || entry.item.itemId}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{selItem?.code}</div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                          {entry.item.quantityNeeded}
                        </td>
                        <td className="p-2.5 text-center text-slate-600 text-[11px]">
                          {selItem?.unit || entry.item.unit}
                        </td>
                        <td className="p-2.5 text-center font-mono text-amber-700">
                          {entry.item.scrapAllowancePercent}٪
                        </td>
                        <td className="p-2.5 text-center bg-indigo-50/30 font-mono font-bold text-indigo-700">
                          {totalWithScrap.toLocaleString('fa-IR')} {selItem?.unit || entry.item.unit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeRows.length === 0 ? (
        /* Empty State for Current Stage */
        <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Package className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-800">
            هنوز قطعه یا ماده اولیه‌ای برای این مرحله تخصیص داده نشده است.
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            اگر در این مرحله قطعه یا ماده اولیه‌ای مصرف می‌شود (مثلاً مقاومت، IC، کانکتور، پیچ یا جعبه بسته‌بندی)، دکمه زیر را بزنید.
          </p>
          <button
            type="button"
            onClick={() => isStageMode ? handleAddRowToStage(activeStepIndex) : handleAddFlatRow()}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>+ افزودن اولین قطعه به این مرحله</span>
          </button>
        </div>
      ) : (
        /* Active Stage Items Table */
        <div className="space-y-2 overflow-x-auto">
          <div className="min-w-[620px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-2.5 w-8 text-center">#</th>
                  <th className="p-2.5">قطعه / ماده اولیه مصرفی در این مرحله</th>
                  <th className="p-2.5 w-28 text-center">مقدار در ۱ واحد</th>
                  <th className="p-2.5 w-20 text-center">واحد</th>
                  <th className="p-2.5 w-24 text-center">ضایعات مجاز (٪)</th>
                  <th className="p-2.5 w-32 text-center bg-indigo-50/50 text-indigo-950">کل برای کل تیراژ</th>
                  <th className="p-2.5 w-10 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRows.map((row, rowIdx) => {
                  const selItem = items.find(i => i.id === row.itemId);
                  const totalWithScrap = Math.ceil((row.quantityNeeded || 0) * targetQuantity * (1 + (row.scrapAllowancePercent || 0) / 100));

                  return (
                    <tr key={rowIdx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                        {rowIdx + 1}
                      </td>
                      <td className="p-2">
                        <select
                          value={row.itemId}
                          onChange={(e) => {
                            if (isStageMode) {
                              handleStageRowChange(activeStepIndex, rowIdx, 'itemId', e.target.value);
                            } else {
                              handleFlatRowChange(rowIdx, 'itemId', e.target.value);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500"
                        >
                          <option value="">-- انتخاب قطعه یا ماده اولیه --</option>
                          {items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.code}) - {item.itemType === 'RawMaterial' ? 'ماده اولیه' : item.itemType === 'Component' ? 'قطعه' : 'نیمه‌ساخته'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0.0001}
                          step="any"
                          value={row.quantityNeeded}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (isStageMode) {
                              handleStageRowChange(activeStepIndex, rowIdx, 'quantityNeeded', val);
                            } else {
                              handleFlatRowChange(rowIdx, 'quantityNeeded', val);
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center text-slate-800 focus:bg-white focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-[11px] font-semibold text-slate-600 font-mono">
                          {selItem?.unit || row.unit || 'عدد'}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={row.scrapAllowancePercent}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            if (isStageMode) {
                              handleStageRowChange(activeStepIndex, rowIdx, 'scrapAllowancePercent', val);
                            } else {
                              handleFlatRowChange(rowIdx, 'scrapAllowancePercent', val);
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center text-slate-800 focus:bg-white focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-center bg-indigo-50/30">
                        <span className="font-mono font-bold text-indigo-700 text-xs">
                          {totalWithScrap.toLocaleString('fa-IR')} {selItem?.unit || row.unit}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (isStageMode) {
                              handleRemoveRowFromStage(activeStepIndex, rowIdx);
                            } else {
                              handleRemoveFlatRow(rowIdx);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف این قطعه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-600">
            تعداد کل اقلام یونیک در BOM: <strong className="text-slate-900 font-mono font-bold">{totalDistinctItemsCount}</strong> قلم
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            بهای تخمینی ۱ واحد: <strong className="text-emerald-700 font-mono font-bold">{totalEstimatedCost.toLocaleString('fa-IR')}</strong> تومان
          </span>
        </div>
        <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>با ثبت پروژه، این قطعات مستقیماً به مراحل تفکیک‌شده متصل خواهند شد.</span>
        </div>
      </div>
    </div>
  );
};
