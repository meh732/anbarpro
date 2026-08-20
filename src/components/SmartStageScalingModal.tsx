import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Project } from '../types';
import { calculateAllProjectStageTargets } from '../utils/smartBOMCalculator';
import { 
  Sparkles, CheckCircle2, ArrowLeft, X, 
  Layers, RefreshCw, Cpu, Calculator, Percent, Sliders, Info
} from 'lucide-react';

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const SmartStageScalingModal: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const { items, boms, applySmartStageTargetsToProject, updateProject } = useApp();

  const [projectScrapPercent, setProjectScrapPercent] = useState<number>(project.scrapAllowancePercent || 0);
  const [stepScraps, setStepScraps] = useState<Record<string, number>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Initialize step scraps from existing steps
  useEffect(() => {
    if (project) {
      setProjectScrapPercent(project.scrapAllowancePercent || 0);
      const initialStepScraps: Record<string, number> = {};
      const collectScraps = (steps: typeof project.steps) => {
        steps?.forEach(s => {
          if (s.scrapAllowancePercent !== undefined) {
            initialStepScraps[s.id] = s.scrapAllowancePercent;
          }
          if (s.subSteps && s.subSteps.length > 0) {
            collectScraps(s.subSteps);
          }
        });
      };
      collectScraps(project.steps);
      setStepScraps(initialStepScraps);
      setAppliedSuccess(false);
    }
  }, [project, isOpen]);

  const targetItem = items.find(i => i.id === project?.targetFinishedItemId);

  // Calculate live smart targets based on the current scrap allowance settings
  const { calculations, totalSemiFinishedPiecesToProduce, hasUpdatesAvailable } = useMemo(() => {
    if (!project) return { calculations: [], totalSemiFinishedPiecesToProduce: 0, hasUpdatesAvailable: false };
    return calculateAllProjectStageTargets(
      project,
      boms,
      items,
      {
        projectScrap: projectScrapPercent,
        stepScraps: stepScraps
      }
    );
  }, [project, boms, items, projectScrapPercent, stepScraps]);

  if (!isOpen || !project) return null;

  const handleStepScrapChange = (stepId: string, val: number) => {
    setStepScraps(prev => ({
      ...prev,
      [stepId]: Math.max(0, Math.min(100, isNaN(val) ? 0 : val))
    }));
  };

  const handleApplyGlobalScrapToAllSteps = () => {
    const updated: Record<string, number> = {};
    calculations.forEach(c => {
      updated[c.stepId] = projectScrapPercent;
    });
    setStepScraps(updated);
  };

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      // 1. Update project base scrap
      updateProject(project.id, {
        scrapAllowancePercent: projectScrapPercent
      });

      // 2. Apply smart targets and step-level scraps
      applySmartStageTargetsToProject(project.id, {
        projectScrap: projectScrapPercent,
        stepScraps: stepScraps
      });

      setIsApplying(false);
      setAppliedSuccess(true);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-amber-50 via-orange-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">محاسبه خودکار اهداف تولید مراحل پروژه و تنظیم ضریب ضایعات</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  BOM Cascading & Scrap Allowance
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تنظیم دقیق تیراژ قطعات نیمه‌ساخته بر اساس فرمول ساخت محصول نهایی و اعمال ضریب ضایعات مجاز
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Project Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">پروژه تولیدی و محصول نهایی:</div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{project.name}</span>
                  <span className="text-xs font-mono font-medium text-slate-500">({project.code})</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {targetItem?.name || 'محصول نهایی'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-left sm:text-right">
                <div className="text-[11px] text-slate-500">تیراژ هدف کل پروژه:</div>
                <div className="text-base font-extrabold font-mono text-indigo-700">
                  {project.targetQuantity.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">دستگاه</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[11px] text-slate-500">تعداد کل مراحل:</div>
                <div className="text-base font-extrabold font-mono text-slate-800">
                  {calculations.length} <span className="text-xs font-normal text-slate-500">مرحله</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project-Wide Scrap Setting Control */}
          <div className="p-4 bg-linear-to-r from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-950">ضریب ضایعات پیش‌فرض کل پروژه (Scrap Allowance):</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2.5 py-1 shadow-2xs">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={projectScrapPercent}
                    onChange={(e) => setProjectScrapPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-14 text-center font-mono text-xs font-bold text-amber-950 focus:outline-none"
                  />
                  <span className="text-[11px] font-bold text-amber-800">درصد</span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyGlobalScrapToAllSteps}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                  title="اعمال این درصد به تمامی مراحل زیر"
                >
                  اعمال به همه مراحل
                </button>
              </div>
            </div>

            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              با تنظیم ضریب ضایعات، تعداد قطعات مورد نیاز مراحل به اندازه درصد مشخص شده افزایش می‌یابد تا پرت و خطای تولید پوشش داده شود.
            </p>
          </div>

          {appliedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">اهداف و ضرایب ضایعات با موفقیت به پروژه اعمال شدند!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  مقادیر هدف تولید (Target Quantity) و درصد ضایعات اختصاصی هر مرحله با موفقیت در ساختار پروژه ذخیره گردید.
                </p>
              </div>
            </div>
          )}

          {/* Logic Explanation Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-slate-800">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>نحوه محاسبه هدف تولید هر قطعه نیمه‌ساخته (BOM Multiplier):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              اگر در فرمول ساخت محصول نهایی برای هر ۱ دستگاه به <strong>۳ عدد</strong> از قطعه نیمه‌ساخته X نیاز باشد، برای کل پروژه با تیراژ <strong>{project.targetQuantity.toLocaleString('fa-IR')} دستگاه</strong>، نیاز مبنا برابر با <strong>{(project.targetQuantity * 3).toLocaleString('fa-IR')} عدد</strong> خواهد بود. با افزودن ضریب ضایعات تنظیمی، هدف نهایی مرحله به صورت دقیق و متناسب مشخص می‌گردد.
            </p>
          </div>

          {/* Stage Calculations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>بررسی مراحل پروژه، ضریب مصرف و درصد ضایعات هر مرحله:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {calculations.filter(c => c.isAutoCalculated).length} مرحله متصل به فرمول ساخت
              </span>
            </div>

            <div className="space-y-3">
              {calculations.map((calc) => {
                const isDifferent = calc.calculatedSmartTargetQty !== calc.currentOutputQty;
                const currentStepScrap = stepScraps[calc.stepId] !== undefined ? stepScraps[calc.stepId] : calc.scrapPercent;

                return (
                  <div 
                    key={calc.stepId} 
                    className={`border rounded-xl p-4 transition-all shadow-2xs ${
                      isDifferent 
                        ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-300/30' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold font-mono flex items-center justify-center">
                            {calc.stepCode}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{calc.stepName}</span>
                          {calc.outputItemName ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              خروجی: {calc.outputItemName} ({calc.baseMultiplierPerFinalUnit}× در هر محصول)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              بدون کالای خروجی اختصاصی
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 pr-8 leading-normal">
                          {calc.explanation}
                        </p>
                      </div>

                      {/* Controls & Quantities */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0 pr-8 lg:pr-0">
                        {/* Step Scrap Input */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-slate-500">ضایعات:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentStepScrap}
                            onChange={(e) => handleStepScrapChange(calc.stepId, parseFloat(e.target.value) || 0)}
                            className="w-10 text-center font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-1 focus:outline-none focus:border-amber-500"
                            title="درصد ضایعات اختصاصی این مرحله"
                          />
                          <span className="text-[10px] text-slate-500">٪</span>
                        </div>

                        {/* Current vs Smart Target */}
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] text-slate-400">هدف فعلی:</div>
                          <div className="text-xs font-bold font-mono text-slate-600">
                            {calc.currentOutputQty.toLocaleString('fa-IR')}
                          </div>
                        </div>

                        <ArrowLeft className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />

                        <div className="text-left sm:text-right bg-amber-100/60 border border-amber-300 px-3 py-1.5 rounded-lg">
                          <div className="text-[10px] font-bold text-amber-800">🎯 هدف هوشمند:</div>
                          <div className="text-sm font-extrabold font-mono text-amber-950">
                            {calc.calculatedSmartTargetQty.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">عدد</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-components needed for this stage */}
                    {calc.subComponentsNeeded.length > 0 && (
                      <div className="mt-2.5 pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">قطعات مورد نیاز این مرحله با احتساب ضایعات:</span>
                        {calc.subComponentsNeeded.map((sub, sIdx) => (
                          <span 
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] rounded-lg text-slate-700 font-medium"
                          >
                            <span className="font-bold">{sub.itemName}</span>
                            <span className="font-mono text-indigo-700 font-bold bg-white px-1.5 rounded border border-slate-200">
                              {sub.totalNeededForStage.toLocaleString('fa-IR')} {sub.unit}
                            </span>
                            <span className="text-slate-400 text-[9px]">({sub.quantityPerStageUnit}×)</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {hasUpdatesAvailable ? (
              <span className="text-amber-700 font-bold">⚠️ برخی اهداف نیاز به همگام‌سازی دارند.</span>
            ) : (
              <span className="text-emerald-700 font-bold">✓ تمامی اهداف با فرمول ساخت و ضرایب ضایعات منطبق هستند.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              بستن
            </button>

            <button
              onClick={handleApply}
              disabled={isApplying}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال اعمال اهداف و ضرایب...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعمال محاسبات اهداف و ضریب ضایعات به پروژه</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
