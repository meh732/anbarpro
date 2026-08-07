import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BOM, ProjectStep } from '../types';
import { 
  Cpu, Plus, Layers, Calculator, CheckCircle2, 
  AlertTriangle, DollarSign, Edit, Trash2, X, FolderTree, GitBranch, Boxes
} from 'lucide-react';

export const BOMView: React.FC = () => {
  const { boms, items, warehouses, inventory, projects, addBOM, updateBOM } = useApp();

  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');
  const [testProduceQty, setTestProduceQty] = useState<number>(100);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedBom = boms.find(b => b.id === selectedBomId) || boms[0];
  const finishedItem = items.find(i => i.id === selectedBom?.finishedItemId);

  // Form State for new BOM
  const [bomName, setBomName] = useState('');
  const [finishedItemId, setFinishedItemId] = useState(items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '');
  const [version, setVersion] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectStepId, setSelectedProjectStepId] = useState<string>('');

  const [bomItems, setBomItems] = useState<{ itemId: string; quantityNeeded: number; unit: string; scrapAllowancePercent: number }[]>([
    { itemId: items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2 }
  ]);

  // Helper to extract flattened steps with code for a project
  const getProjectStepsFlat = (steps: ProjectStep[], prefix = '1'): Array<{ step: ProjectStep; code: string }> => {
    let list: Array<{ step: ProjectStep; code: string }> = [];
    steps.forEach((s, idx) => {
      const code = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      list.push({ step: s, code });
      if (s.subSteps && s.subSteps.length > 0) {
        list = list.concat(getProjectStepsFlat(s.subSteps, code));
      }
    });
    return list;
  };

  // Calculate Unit Cost of BOM
  let totalUnitCostToman = 0;
  selectedBom?.items.forEach(it => {
    const raw = items.find(x => x.id === it.itemId);
    if (raw) {
      totalUnitCostToman += raw.unitPrice * it.quantityNeeded;
    }
  });

  const handleOpenAdd = () => {
    setBomName('فرمول ساخت برد کنترل جدید');
    setSelectedProjectId('');
    setSelectedProjectStepId('');
    setBomItems([
      { itemId: items.find(i => i.code === 'E-PCB-001')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2 },
      { itemId: items.find(i => i.code === 'E-IC-328')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1 },
      { itemId: items.find(i => i.code === 'E-RES-0805-10K')?.id || items[0]?.id || '', quantityNeeded: 12, unit: 'عدد', scrapAllowancePercent: 3 },
      { itemId: items.find(i => i.code === 'E-RES-0805-1K')?.id || items[0]?.id || '', quantityNeeded: 8, unit: 'عدد', scrapAllowancePercent: 3 },
      { itemId: items.find(i => i.code === 'E-CAP-0805-100N')?.id || items[0]?.id || '', quantityNeeded: 8, unit: 'عدد', scrapAllowancePercent: 2 },
    ]);
    setIsModalOpen(true);
  };

  const handleAddItemLine = () => {
    setBomItems(prev => [
      ...prev,
      { itemId: items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1 }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBOM({
      finishedItemId,
      name: bomName,
      version,
      items: bomItems,
      description,
      isActive: true,
      projectId: selectedProjectId || undefined,
      projectStepId: selectedProjectStepId || undefined,
    });
    alert('فرمول ساخت (BOM) جدید با موفقیت ثبت شد و به پروژه و مرحله تخصیص داده شد.');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            فرمول‌های ساخت محصول (BOM - Bill of Materials)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تعریف دقیق اجزا و ضریب کسر خودکار قطعات PCB، چیپ‌های SMD، خازن‌ها و مقاومت‌ها هنگام ثبت تولید
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          تعریف فرمول ساخت جدید
        </button>
      </div>

      {/* BOM Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: BOM Selection list */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">لیست فرمول‌های ساخت ثبت شده:</label>
          <div className="space-y-2">
            {boms.map(bom => {
              const finItem = items.find(i => i.id === bom.finishedItemId);
              const isSelected = bom.id === selectedBom?.id;
              const linkedProj = projects.find(p => p.id === bom.projectId);
              const linkedStep = linkedProj ? getProjectStepsFlat(linkedProj.steps).find(s => s.step.id === bom.projectStepId) : null;

              return (
                <div
                  key={bom.id}
                  onClick={() => setSelectedBomId(bom.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{bom.name}</span>
                    <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                      {bom.version}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    محصول: <strong className="text-indigo-600">{finItem?.name || bom.finishedItemId}</strong>
                  </div>

                  {linkedProj && (
                    <div className="mt-2 text-[10px] bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 flex flex-wrap items-center gap-1">
                      <FolderTree className="w-3 h-3 text-indigo-600" />
                      <span>تخصیص داده شده به: <strong>{linkedProj.name} ({linkedProj.code})</strong></span>
                      {linkedStep && (
                        <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                          مرحله {linkedStep.code}: {linkedStep.step.name || linkedStep.step.title}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                    <span>{bom.items.length} قلم قطعه مجزا</span>
                    <span>{bom.isActive ? 'فعال در خط تولید' : 'آرشیو'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed BOM Recipe & Simulator */}
        {selectedBom && (
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 border-slate-200 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{selectedBom.name}</h3>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                      {selectedBom.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedBom.description}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left shrink-0">
                  <span className="text-[10px] text-slate-500 block">قیمتتمام‌شده قطعات (۱ واحد)</span>
                  <strong className="font-mono text-indigo-600 text-base">
                    {totalUnitCostToman.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">تومان</span>
                  </strong>
                </div>
              </div>

              {/* Simulation Box for Producing X items */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">تست ظرفیت و موجودی انبار برای تولید تیراژ:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={testProduceQty}
                    onChange={(e) => setTestProduceQty(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-indigo-600 font-bold focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500">{finishedItem?.unit || 'دستگاه'}</span>
                </div>
              </div>

              {/* Component Requirements Breakdown Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="whitespace-nowrap p-3">کد کالا</th>
                      <th className="whitespace-nowrap p-3">نام قطعه / عنصر</th>
                      <th className="whitespace-nowrap p-3">نیاز برای ۱ دستگاه</th>
                      <th className="whitespace-nowrap p-3">نیاز برای {testProduceQty} دستگاه</th>
                      <th className="whitespace-nowrap p-3">موجودی انبارها</th>
                      <th className="whitespace-nowrap p-3">تامین ظرفیت؟</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBom.items.map((bomIt, idx) => {
                      const raw = items.find(i => i.id === bomIt.itemId);
                      const requiredForTest = bomIt.quantityNeeded * testProduceQty;
                      const totalInWh = inventory
                        .filter(inv => inv.itemId === bomIt.itemId)
                        .reduce((s, c) => s + c.quantity, 0);

                      const isSufficient = totalInWh >= requiredForTest;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{raw?.code || bomIt.itemId}</td>
                          <td className="whitespace-nowrap p-3 font-bold text-slate-800">{raw?.name}</td>
                          <td className="whitespace-nowrap p-3 font-mono text-slate-600">{bomIt.quantityNeeded} {bomIt.unit}</td>
                          <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{requiredForTest.toLocaleString('fa-IR')} {bomIt.unit}</td>
                          <td className="whitespace-nowrap p-3 font-mono text-slate-600">{totalInWh.toLocaleString('fa-IR')} {bomIt.unit}</td>
                          <td className="whitespace-nowrap p-3">
                            {isSufficient ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                تامین است
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                کسری دارد ({requiredForTest - totalInWh})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add BOM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                تعریف فرمول ساخت جدید (BOM)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فرمول ساخت*</label>
                  <input
                    type="text"
                    required
                    value={bomName}
                    onChange={(e) => setBomName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نسخه / ورژن*</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">محصول یا نیمه‌ساخته خروجی*</label>
                  <select
                    value={finishedItemId}
                    onChange={(e) => setFinishedItemId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <FolderTree className="w-4 h-4 text-indigo-600" />
                    <span>تخصیص فرمول BOM به پروژه و مرحله خاص:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">انتخاب پروژه مربوطه:</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setSelectedProjectId(pId);
                          setSelectedProjectStepId('');
                          if (pId) {
                            const p = projects.find(x => x.id === pId);
                            if (p && p.targetFinishedItemId) {
                              setFinishedItemId(p.targetFinishedItemId);
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500"
                      >
                        <option value="">فرمول ساخت عمومی (بدون اختصاص به پروژه)</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            پروژه {p.code}: {p.name} ({p.client})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">انتخاب مرحله / زیرمرحله پروژه:</label>
                      <select
                        disabled={!selectedProjectId}
                        value={selectedProjectStepId}
                        onChange={(e) => {
                          const stepId = e.target.value;
                          setSelectedProjectStepId(stepId);
                          if (selectedProjectId && stepId) {
                            const p = projects.find(x => x.id === selectedProjectId);
                            if (p) {
                              const flat = getProjectStepsFlat(p.steps);
                              const found = flat.find(f => f.step.id === stepId);
                              if (found) {
                                if (found.step.outputItemId) {
                                  setFinishedItemId(found.step.outputItemId);
                                }
                                setBomName(`فرمول BOM مرحله ${found.code}: ${found.step.name || found.step.title}`);
                              }
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">کل پروژه / مرحله انتخابی نیست</option>
                        {selectedProjectId && (() => {
                          const proj = projects.find(p => p.id === selectedProjectId);
                          if (!proj) return null;
                          const flatSteps = getProjectStepsFlat(proj.steps);
                          return flatSteps.map(({ step, code }) => (
                            <option key={step.id} value={step.id}>
                              مرحله {code}: {step.name || step.title} {step.outputItemId ? '(دارای خروجی)' : ''}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOM Component Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">قطعات و ضریب کسر برای ۱ واحد محصول:</label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> افزودن قطعه
                  </button>
                </div>

                {bomItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 items-center">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const copy = [...bomItems];
                        copy[idx].itemId = e.target.value;
                        setBomItems(copy);
                      }}
                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      placeholder="تعداد"
                      value={line.quantityNeeded}
                      onChange={(e) => {
                        const copy = [...bomItems];
                        copy[idx].quantityNeeded = Number(e.target.value);
                        setBomItems(copy);
                      }}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                    />

                    {bomItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات فرمول ساخت</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  ذخیره فرمول BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
