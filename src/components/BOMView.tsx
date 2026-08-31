import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BOM, ProjectStep } from '../types';
import { 
  Cpu, Plus, Layers, Calculator, CheckCircle2, 
  AlertTriangle, DollarSign, Edit, Trash2, X, FolderTree, GitBranch, Boxes,
  FileSpreadsheet, Download, Sparkles, ShoppingCart, ArrowDownLeft, Printer,
  Warehouse, Eye, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import { BOMExcelImportModal } from './BOMExcelImportModal';
import { exportBOMsToExcel } from '../utils/excelUtils';
import { OfficialDocumentViewerModal, OfficialDocData } from './OfficialDocumentViewerModal';

export const BOMView: React.FC = () => {
  const { 
    boms, items, warehouses, inventory, projects, 
    addBOM, updateBOM, deleteBOM, hasActionPermission,
    createPurchaseRequest, createStockInDoc, currentUser, companyName
  } = useApp();

  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');

  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');
  const [testProduceQty, setTestProduceQty] = useState<number>(100);
  const [selectedWarehouseScope, setSelectedWarehouseScope] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);

  // Quick Stock In Modal
  const [quickStockInItem, setQuickStockInItem] = useState<{ itemId: string; name: string; neededQty: number } | null>(null);
  const [quickStockInQty, setQuickStockInQty] = useState<number>(100);
  const [quickStockInWarehouseId, setQuickStockInWarehouseId] = useState<string>(warehouses[0]?.id || 'wh-raw');

  // Official Printable Document Modal
  const [activeOfficialDoc, setActiveOfficialDoc] = useState<OfficialDocData | null>(null);

  // Feedback Notification
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const selectedBom = boms.find(b => b.id === selectedBomId) || boms[0];
  const finishedItem = items.find(i => i.id === selectedBom?.finishedItemId || i.code === selectedBom?.finishedItemId);

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
    const raw = items.find(x => x.id === it.itemId || x.code === it.itemId || x.name === it.itemId);
    if (raw) {
      totalUnitCostToman += (raw.unitPrice || 0) * it.quantityNeeded;
    }
  });

  // Smart Capacity Calculation per BOM component
  const simulationResults = (selectedBom?.items || []).map((bomIt) => {
    const raw = items.find(i => i.id === bomIt.itemId || i.code === bomIt.itemId || i.name === bomIt.itemId);
    const matchedItemId = raw?.id || bomIt.itemId;
    const matchedItemCode = raw?.code || bomIt.itemId;

    // Filter relevant inventory entries based on warehouse scope
    const matchingBalances = inventory.filter(inv => {
      const isItemMatch = inv.itemId === matchedItemId || (matchedItemCode && inv.itemId === matchedItemCode);
      if (!isItemMatch) return false;
      if (selectedWarehouseScope !== 'ALL' && inv.warehouseId !== selectedWarehouseScope) return false;
      return true;
    });

    const totalStock = matchingBalances.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    const totalReserved = matchingBalances.reduce((sum, inv) => sum + (inv.reservedQuantity || 0), 0);
    const freeAvailableStock = Math.max(0, totalStock - totalReserved);

    // Breakdown per warehouse for tooltip/details
    const warehouseBreakdown = warehouses.map(wh => {
      const invEntry = inventory.find(inv => 
        inv.warehouseId === wh.id && 
        (inv.itemId === matchedItemId || (matchedItemCode && inv.itemId === matchedItemCode))
      );
      return {
        warehouseName: wh.name,
        quantity: invEntry?.quantity || 0,
        reserved: invEntry?.reservedQuantity || 0,
      };
    }).filter(w => w.quantity > 0);

    const baseRequired = bomIt.quantityNeeded * testProduceQty;
    const scrapAllowanceQty = Math.ceil(baseRequired * ((bomIt.scrapAllowancePercent || 0) / 100));
    const totalRequiredWithScrap = baseRequired + scrapAllowanceQty;

    const maxProducibleFromThis = bomIt.quantityNeeded > 0 ? Math.floor(freeAvailableStock / bomIt.quantityNeeded) : 0;
    const deficitQty = Math.max(0, totalRequiredWithScrap - freeAvailableStock);
    const isSufficient = deficitQty === 0;
    const coveragePercent = totalRequiredWithScrap > 0 ? Math.min(100, Math.round((freeAvailableStock / totalRequiredWithScrap) * 100)) : 100;
    const deficitCost = deficitQty * (raw?.unitPrice || 0);

    return {
      bomIt,
      rawItem: raw,
      itemCode: raw?.code || bomIt.itemId,
      itemName: raw?.name || 'قطعه نامشخص',
      unit: raw?.unit || bomIt.unit || 'عدد',
      unitPrice: raw?.unitPrice || 0,
      quantityNeededPerUnit: bomIt.quantityNeeded,
      scrapPercent: bomIt.scrapAllowancePercent || 0,
      baseRequired,
      scrapAllowanceQty,
      totalRequiredWithScrap,
      totalStock,
      totalReserved,
      freeAvailableStock,
      warehouseBreakdown,
      maxProducibleFromThis,
      deficitQty,
      isSufficient,
      coveragePercent,
      deficitCost,
    };
  });

  // Overall Global Capacity Insights
  const maxProducibleCapacity = simulationResults.length > 0
    ? Math.min(...simulationResults.map(r => r.maxProducibleFromThis))
    : 0;

  const bottleneckItem = simulationResults.length > 0
    ? [...simulationResults].sort((a, b) => a.coveragePercent - b.coveragePercent)[0]
    : null;

  const totalDeficitItemsCount = simulationResults.filter(r => !r.isSufficient).length;
  const totalDeficitCostToman = simulationResults.reduce((s, r) => s + r.deficitCost, 0);
  const overallCoverageScore = simulationResults.length > 0
    ? Math.round(simulationResults.reduce((s, r) => s + r.coveragePercent, 0) / simulationResults.length)
    : 100;

  // 1-Click Action: Auto-create Purchase Request for All Deficit Items
  const handleAutoCreatePurchaseRequest = () => {
    const deficitItems = simulationResults.filter(r => r.deficitQty > 0);
    if (deficitItems.length === 0) {
      alert('تمامی قطعات برای تیراژ انتخابی تامین است و کسری وجود ندارد.');
      return;
    }

    const reqDocNumber = `PR-BOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReqItems = deficitItems.map(d => ({
      itemId: d.rawItem?.id || d.bomIt.itemId,
      quantity: d.deficitQty,
      reason: `تامین کسری تولید تیراژ ${testProduceQty} واحدی بر اساس فرمول BOM (${selectedBom.name})`,
    }));

    createPurchaseRequest({
      requestNumber: reqDocNumber,
      date: new Date().toLocaleDateString('fa-IR'),
      requestingUnit: 'واحد برنامه‌ریزی تولید و مهندسی ساخت (BOM)',
      requesterName: currentUser.fullName || 'کارشناس مهندسی صنایع',
      urgency: testProduceQty > 200 ? 'Immediate' : 'High',
      status: 'Pending',
      items: newReqItems,
      notes: `درخواست خرید سیستمی خودکار صادرشده از تحلیل هوشمند BOM برای محصول ${finishedItem?.name || ''} به تیراژ ${testProduceQty} دستگاه. برآورد ریالی: ${totalDeficitCostToman.toLocaleString('fa-IR')} تومان.`,
    });

    setActionSuccessMsg(`درخواست خرید رسمی به شماره ${reqDocNumber} برای ${deficitItems.length} قلم قطعه کسری با موفقیت ثبت و به کارتابل خرید ارسال گردید.`);
    setTimeout(() => setActionSuccessMsg(null), 7000);
  };

  // 1-Click Quick Stock In Submission
  const handleExecuteQuickStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockInItem || quickStockInQty <= 0) return;

    const docNum = `REC-BOM-${Math.floor(1000 + Math.random() * 9000)}`;
    createStockInDoc({
      docNumber: docNum,
      date: new Date().toLocaleDateString('fa-IR'),
      supplier: 'تامین سریع انبار (تست ظرفیت تولید)',
      registeredBy: currentUser.fullName || 'سرپرست انبار',
      warehouseId: quickStockInWarehouseId,
      entryType: 'Purchase',
      items: [
        {
          itemId: quickStockInItem.itemId,
          quantity: quickStockInQty,
          unitPrice: items.find(i => i.id === quickStockInItem.itemId)?.unitPrice || 10000,
          notes: 'شارژ مستقیم موجودی جهت رفع کسری فرمول ساخت BOM',
        }
      ],
      notes: `رسید ورود مستقیم شارژ موجودی برای قطعه ${quickStockInItem.name}`,
      status: 'Confirmed',
    });

    const targetWhName = warehouses.find(w => w.id === quickStockInWarehouseId)?.name || 'انبار';
    setActionSuccessMsg(`رسید ورود انبار ${docNum} به میزان ${quickStockInQty} واحد برای "${quickStockInItem.name}" به ${targetWhName} ثبت شد و موجودی به‌روز گردید.`);
    setQuickStockInItem(null);
    setTimeout(() => setActionSuccessMsg(null), 6000);
  };

  // Open Official Printable BOM Specification Sheet
  const handleOpenPrintBOMSheet = () => {
    if (!selectedBom) return;

    const docData: OfficialDocData = {
      type: 'BOM',
      docNumber: `BOM-SPEC-${selectedBom.version}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('fa-IR'),
      status: selectedBom.isActive ? 'فعال و تاییدشده' : 'آرشیو',
      partyName: finishedItem?.name || selectedBom.name,
      requesterName: currentUser.fullName || 'مدیر فنی و مهندسی',
      issuerName: 'واحد مهندسی ساخت و تولید (BOM)',
      projectName: projects.find(p => p.id === selectedBom.projectId)?.name || 'محصولات استاندارد خط تولید',
      notes: `شناسنامه فنی ساخت محصول به همراه ضرایب مصرف قطعات و ضریب افت مجاز قطعات الکترونیک و مکانیکی. بهای تمام‌شده برآوردی ۱ دستگاه: ${totalUnitCostToman.toLocaleString('fa-IR')} تومان.`,
      items: selectedBom.items.map(it => {
        const raw = items.find(i => i.id === it.itemId || i.code === it.itemId);
        return {
          itemId: it.itemId,
          itemCode: raw?.code || it.itemId,
          itemName: raw?.name || 'قطعه ساخت',
          unit: it.unit || raw?.unit || 'عدد',
          quantity: it.quantityNeeded,
          unitPrice: raw?.unitPrice || 0,
          notes: `ضریب افت مجاز: ${it.scrapAllowancePercent || 0}٪`,
        };
      }),
    };

    setActiveOfficialDoc(docData);
  };

  const handleOpenAdd = () => {
    setEditingBom(null);
    setBomName('فرمول ساخت محصول جدید');
    setVersion('v1.0');
    setDescription('');
    setSelectedProjectId('');
    setSelectedProjectStepId('');
    setFinishedItemId(items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '');
    setBomItems([
      { itemId: items.find(i => i.code === 'E-PCB-001')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2 },
      { itemId: items.find(i => i.code === 'E-IC-328')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1 },
      { itemId: items.find(i => i.code === 'E-RES-0805-10K')?.id || items[0]?.id || '', quantityNeeded: 12, unit: 'عدد', scrapAllowancePercent: 3 },
      { itemId: items.find(i => i.code === 'E-RES-0805-1K')?.id || items[0]?.id || '', quantityNeeded: 8, unit: 'عدد', scrapAllowancePercent: 3 },
      { itemId: items.find(i => i.code === 'E-CAP-0805-100N')?.id || items[0]?.id || '', quantityNeeded: 8, unit: 'عدد', scrapAllowancePercent: 2 },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bom: BOM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBom(bom);
    setBomName(bom.name);
    setVersion(bom.version);
    setDescription(bom.description || '');
    setFinishedItemId(bom.finishedItemId);
    setSelectedProjectId(bom.projectId || '');
    setSelectedProjectStepId(bom.projectStepId || '');
    setBomItems(bom.items.map(it => ({ 
      itemId: it.itemId,
      quantityNeeded: it.quantityNeeded,
      unit: it.unit,
      scrapAllowancePercent: it.scrapAllowancePercent ?? 0
    })));
    setIsModalOpen(true);
  };

  const handleDelete = (bom: BOM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`آیا از حذف فرمول ساخت "${bom.name}" اطمینان دارید؟`)) {
      deleteBOM(bom.id);
      if (selectedBomId === bom.id) {
        const remaining = boms.filter(b => b.id !== bom.id);
        if (remaining.length > 0) {
          setSelectedBomId(remaining[0].id);
        }
      }
    }
  };

  const handleAddItemLine = () => {
    setBomItems(prev => [
      ...prev,
      { itemId: items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1 }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBom) {
      updateBOM(editingBom.id, {
        finishedItemId,
        name: bomName,
        version,
        items: bomItems,
        description,
        projectId: selectedProjectId || undefined,
        projectStepId: selectedProjectStepId || undefined,
      });
      setActionSuccessMsg('فرمول ساخت (BOM) با موفقیت به‌روزرسانی شد.');
    } else {
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
      setActionSuccessMsg('فرمول ساخت (BOM) جدید با موفقیت ثبت شد.');
    }
    setIsModalOpen(false);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            فرمول‌های ساخت محصول (BOM - Bill of Materials)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تعریف مهندسی ساخت، تحلیل هوشمند موجودی و گلوگاه‌های تولید، و صدور خودکار درخواست خرید کسر قطعات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenPrintBOMSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="چاپ شناسنامه مهندسی و فرمول ساخت رسمی"
          >
            <Printer className="w-4 h-4 text-purple-600" />
            <span>چاپ شناسنامه رسمی BOM</span>
          </button>

          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="ورود فرمول‌های ساخت (BOM) از طریق فایل اکسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ورود فرمول‌ها از اکسل</span>
          </button>

          <button
            onClick={() => exportBOMsToExcel(boms, items)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="خروجی کامل فرمول‌های ساخت به فایل اکسل"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>خروجی اکسل</span>
          </button>

          {canAdd && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              تعریف فرمول ساخت جدید
            </button>
          )}
        </div>
      </div>

      {/* BOM Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: BOM Selection list */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">لیست فرمول‌های ساخت ثبت شده:</label>
          <div className="space-y-2">
            {boms.map(bom => {
              const finItem = items.find(i => i.id === bom.finishedItemId || i.code === bom.finishedItemId);
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                        {bom.version}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(bom, e)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="ویرایش فرمول ساخت"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(bom, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="حذف فرمول ساخت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    محصول خروجی: <strong className="text-indigo-600">{finItem?.name || bom.finishedItemId}</strong>
                  </div>

                  {linkedProj && (
                    <div className="mt-2 text-[10px] bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 flex flex-wrap items-center gap-1">
                      <FolderTree className="w-3 h-3 text-indigo-600" />
                      <span>تخصیص به: <strong>{linkedProj.name} ({linkedProj.code})</strong></span>
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

        {/* Right Side: Detailed BOM Recipe & Smart Capacity Simulator */}
        {selectedBom && (
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-5">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{selectedBom.name}</h3>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-semibold">
                      {selectedBom.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    محصول: <strong className="text-slate-800">{finishedItem?.name || selectedBom.finishedItemId}</strong>
                    {selectedBom.description && ` — ${selectedBom.description}`}
                  </p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left shrink-0">
                  <span className="text-[10px] text-slate-500 block">بهای قطعات (۱ واحد محصول)</span>
                  <strong className="font-mono text-indigo-600 text-base">
                    {totalUnitCostToman.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">تومان</span>
                  </strong>
                </div>
              </div>

              {/* Smart Simulator Toolbar with Warehouse Scope */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">سنجش هوشمند ظرفیت و موجودی انبار برای تولید تیراژ:</span>
                      <span className="text-[10px] text-slate-500">محاسبه برخط کسری، گلوگاه خط و ضریب افت قطعات</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Warehouse Scope Selector */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                      <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={selectedWarehouseScope}
                        onChange={(e) => setSelectedWarehouseScope(e.target.value)}
                        className="bg-transparent text-xs text-slate-700 font-bold focus:outline-hidden"
                      >
                        <option value="ALL">تمامی انبارهای کارخانه</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target Quantity Input */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                      <input
                        type="number"
                        min={1}
                        value={testProduceQty}
                        onChange={(e) => setTestProduceQty(Math.max(1, Number(e.target.value)))}
                        className="w-20 bg-transparent text-xs font-mono text-center text-indigo-600 font-black focus:outline-hidden"
                      />
                      <span className="text-[11px] text-slate-500 font-medium">{finishedItem?.unit || 'دستگاه'}</span>
                    </div>
                  </div>
                </div>

                {/* Intelligent Capacity KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                  {/* 1. Max Producible Units */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">ظرفیت ساخت فوری با موجودی فعلی:</span>
                    <strong className={`font-mono text-base font-black ${maxProducibleCapacity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {maxProducibleCapacity.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-500">{finishedItem?.unit || 'دستگاه'}</span>
                    </strong>
                  </div>

                  {/* 2. Bottleneck Item */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">گلوگاه اصلی خط:</span>
                    <strong className="text-xs font-bold text-slate-800 truncate block">
                      {bottleneckItem ? `${bottleneckItem.itemName}` : '---'}
                    </strong>
                    <span className="text-[9px] text-rose-500 font-mono">
                      {bottleneckItem && !bottleneckItem.isSufficient ? `کسری: ${bottleneckItem.deficitQty} ${bottleneckItem.unit}` : 'تامین کامل'}
                    </span>
                  </div>

                  {/* 3. Overall Coverage */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">درصد تامین کل اقلام BOM:</span>
                    <div className="flex items-center gap-2">
                      <strong className={`font-mono text-base font-black ${overallCoverageScore >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {overallCoverageScore}٪
                      </strong>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${overallCoverageScore >= 100 ? 'bg-emerald-500' : overallCoverageScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${overallCoverageScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Deficit Purchasing Budget */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">برآورد هزینه تامین کل کسری:</span>
                    <strong className="font-mono text-slate-900 text-xs font-black block truncate">
                      {totalDeficitCostToman > 0 ? `${totalDeficitCostToman.toLocaleString('fa-IR')} تومان` : 'بدون هزینه (تامین است)'}
                    </strong>
                    <span className="text-[9px] text-slate-400">
                      {totalDeficitItemsCount > 0 ? `${totalDeficitItemsCount} قلم دارای کسری` : 'همه قطعات موجود'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Action Bar for Deficits */}
                {totalDeficitItemsCount > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-rose-900 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        برای تولید تیراژ <strong>{testProduceQty} دستگاه</strong>، تعداد <strong>{totalDeficitItemsCount} قلم قطعه</strong> کسری دارد.
                      </span>
                    </div>

                    <button
                      onClick={handleAutoCreatePurchaseRequest}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>ایجاد خودکار درخواست خرید برای کل کسری ({totalDeficitItemsCount} قلم)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Component Requirements Breakdown Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="whitespace-nowrap p-3">کد کالا</th>
                      <th className="whitespace-nowrap p-3">نام قطعه و مشخصات</th>
                      <th className="whitespace-nowrap p-3 text-center">نیاز ۱ دستگاه</th>
                      <th className="whitespace-nowrap p-3 text-center">نیاز برای {testProduceQty} دستگاه (+افت)</th>
                      <th className="whitespace-nowrap p-3 text-center">موجودی انبارها</th>
                      <th className="whitespace-nowrap p-3 text-center">ظرفیت ساخت قطعه</th>
                      <th className="whitespace-nowrap p-3 text-center">وضعیت تامین</th>
                      <th className="whitespace-nowrap p-3 text-center">اقدام سریع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulationResults.map((res, idx) => {
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{res.itemCode}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{res.itemName}</div>
                            {/* Detailed breakdown per warehouse badges */}
                            {res.warehouseBreakdown.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {res.warehouseBreakdown.map((wh, wIdx) => (
                                  <span key={wIdx} className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                                    {wh.warehouseName}: {wh.quantity.toLocaleString('fa-IR')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 mt-0.5 block">در هیچ انباری موجودی ثبت نشده</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 font-mono text-center text-slate-600">
                            {res.quantityNeededPerUnit} {res.unit}
                            {res.scrapPercent > 0 && (
                              <span className="text-[9px] text-slate-400 block font-sans">({res.scrapPercent}٪ افت)</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 font-mono font-bold text-center text-indigo-600">
                            {res.totalRequiredWithScrap.toLocaleString('fa-IR')} {res.unit}
                          </td>
                          <td className="whitespace-nowrap p-3 font-mono text-center">
                            <strong className="text-slate-900 text-xs">{res.freeAvailableStock.toLocaleString('fa-IR')}</strong>
                            <span className="text-[10px] text-slate-500 mr-1">{res.unit}</span>
                            {res.totalReserved > 0 && (
                              <span className="text-[9px] text-amber-600 block">({res.totalReserved} رزرو)</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 font-mono font-bold text-center text-slate-700">
                            {res.maxProducibleFromThis.toLocaleString('fa-IR')} دستگاه
                          </td>
                          <td className="whitespace-nowrap p-3 text-center">
                            {res.isSufficient ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                تامین است (۱۰۰٪)
                              </span>
                            ) : (
                              <div className="space-y-0.5 inline-block">
                                <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  کسری دارد ({res.deficitQty.toLocaleString('fa-IR')} {res.unit})
                                </span>
                                <span className="text-[9px] text-slate-400 block font-mono">
                                  پوشش: {res.coveragePercent}٪
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 text-center">
                            {!res.isSufficient && (
                              <button
                                onClick={() => {
                                  setQuickStockInItem({
                                    itemId: res.rawItem?.id || res.bomIt.itemId,
                                    name: res.itemName,
                                    neededQty: res.deficitQty,
                                  });
                                  setQuickStockInQty(res.deficitQty);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                title="ثبت سریع رسید ورود انبار برای تامین این کسری"
                              >
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                <span>شارژ موجودی</span>
                              </button>
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

      {/* Quick Stock In Modal */}
      {quickStockInItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                شارژ سریع موجودی انبار: <span className="text-indigo-600">{quickStockInItem.name}</span>
              </h3>
              <button onClick={() => setQuickStockInItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickStockIn} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">انبار مقصد جهت ثبت رسید ورود:</label>
                <select
                  value={quickStockInWarehouseId}
                  onChange={(e) => setQuickStockInWarehouseId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تعداد ورودی:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quickStockInQty}
                  onChange={(e) => setQuickStockInQty(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-slate-900"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                پس از تایید، یک رسید رسمی ورود ثبت شده و بلافاصله وضعیت کسری در فرمول ساخت رفع خواهد شد.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickStockInItem(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  ثبت رسید ورود و شارژ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit BOM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                {editingBom ? `ویرایش فرمول ساخت (${editingBom.name})` : 'تعریف فرمول ساخت جدید (BOM)'}
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

      {/* BOM Excel Import Modal */}
      <BOMExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
      />

      {/* Official Printable Document Viewer Modal */}
      {activeOfficialDoc && (
        <OfficialDocumentViewerModal
          doc={activeOfficialDoc}
          allItems={items}
          allWarehouses={warehouses}
          companyName={companyName}
          onClose={() => setActiveOfficialDoc(null)}
        />
      )}
    </div>
  );
};

