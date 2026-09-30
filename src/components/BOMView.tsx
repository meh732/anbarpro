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
    addBOM, updateBOM, deleteBOM, deleteBOMComponentItem, addBOMComponentItem, updateBOMComponentItem,
    hasActionPermission,
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

  // In-app deletion confirm modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'bom' | 'item';
    bomId: string;
    itemIndex?: number;
    title: string;
    subtitle: string;
  } | null>(null);

  // Component Item Level Edit Modal
  const [editingComponent, setEditingComponent] = useState<{
    bomId: string;
    itemIndex: number;
    itemId: string;
    name: string;
    quantityNeeded: number;
    unit: string;
    scrapAllowancePercent: number;
    notes: string;
  } | null>(null);

  // Add Component Item to Selected BOM Modal
  const [isAddingComponentModalOpen, setIsAddingComponentModalOpen] = useState(false);
  const [newCompItemId, setNewCompItemId] = useState(items[0]?.id || '');
  const [newCompQty, setNewCompQty] = useState(1);
  const [newCompUnit, setNewCompUnit] = useState('عدد');
  const [newCompScrap, setNewCompScrap] = useState(0);
  const [newCompNotes, setNewCompNotes] = useState('');

  const selectedBom = boms.find(b => b.id === selectedBomId) || boms[0];
  const finishedItem = items.find(i => i.id === selectedBom?.finishedItemId || i.code === selectedBom?.finishedItemId);

  // Form State for new / edit BOM
  const [bomName, setBomName] = useState('');
  const [finishedItemId, setFinishedItemId] = useState(items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '');
  const [version, setVersion] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [isActiveStatus, setIsActiveStatus] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectStepId, setSelectedProjectStepId] = useState<string>('');

  const [bomItems, setBomItems] = useState<{ itemId: string; quantityNeeded: number; unit: string; scrapAllowancePercent: number; notes?: string }[]>([
    { itemId: items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2, notes: '' }
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
  const simulationResults = (selectedBom?.items || []).map((bomIt, itemIdx) => {
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
      itemIndex: itemIdx,
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
      setActionSuccessMsg('تمامی قطعات برای تیراژ انتخابی تامین است و کسری وجود ندارد.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
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
    setIsActiveStatus(true);
    setSelectedProjectId('');
    setSelectedProjectStepId('');
    setFinishedItemId(items.find(i => i.itemType === 'Finished')?.id || items[0]?.id || '');
    setBomItems([
      { itemId: items.find(i => i.code === 'E-PCB-001')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 2, notes: '' },
      { itemId: items.find(i => i.code === 'E-IC-328')?.id || items[0]?.id || '', quantityNeeded: 1, unit: 'عدد', scrapAllowancePercent: 1, notes: '' },
      { itemId: items.find(i => i.code === 'E-RES-0805-10K')?.id || items[0]?.id || '', quantityNeeded: 12, unit: 'عدد', scrapAllowancePercent: 3, notes: '' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bom: BOM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBom(bom);
    setBomName(bom.name);
    setVersion(bom.version);
    setDescription(bom.description || '');
    setIsActiveStatus(bom.isActive ?? true);
    setFinishedItemId(bom.finishedItemId);
    setSelectedProjectId(bom.projectId || '');
    setSelectedProjectStepId(bom.projectStepId || '');
    setBomItems(bom.items.map(it => ({ 
      itemId: it.itemId,
      quantityNeeded: it.quantityNeeded,
      unit: it.unit || items.find(x => x.id === it.itemId)?.unit || 'عدد',
      scrapAllowancePercent: it.scrapAllowancePercent ?? 0,
      notes: it.notes || ''
    })));
    setIsModalOpen(true);
  };

  const handleDelete = (bom: BOM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmTarget({
      type: 'bom',
      bomId: bom.id,
      title: 'حذف کامل فرمول ساخت (BOM)',
      subtitle: `آیا از حذف دائم فرمول ساخت «${bom.name}» (نسخه ${bom.version}) مطمئن هستید؟ این عملیات قابل بازگشت نیست.`
    });
  };

  const handleToggleBomActive = (bom: BOM, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = !bom.isActive;
    updateBOM(bom.id, { isActive: nextStatus });
    setActionSuccessMsg(`وضعیت فرمول «${bom.name}» به ${nextStatus ? '«فعال در خط تولید»' : '«بایگانی/غیرفعال»'} تغییر یافت.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleAddItemLine = () => {
    const defaultRaw = items.find(i => i.itemType === 'RawMaterial' || i.itemType === 'Component') || items[0];
    setBomItems(prev => [
      ...prev,
      { itemId: defaultRaw?.id || '', quantityNeeded: 1, unit: defaultRaw?.unit || 'عدد', scrapAllowancePercent: 0, notes: '' }
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
        isActive: isActiveStatus,
        projectId: selectedProjectId || undefined,
        projectStepId: selectedProjectStepId || undefined,
      });
      setActionSuccessMsg('فرمول ساخت (BOM) با تمامی مشخصات و قطعات با موفقیت به‌روزرسانی شد.');
    } else {
      addBOM({
        finishedItemId,
        name: bomName,
        version,
        items: bomItems,
        description,
        isActive: isActiveStatus,
        projectId: selectedProjectId || undefined,
        projectStepId: selectedProjectStepId || undefined,
      });
      setActionSuccessMsg('فرمول ساخت (BOM) جدید با موفقیت تعریف و ثبت گردید.');
    }
    setIsModalOpen(false);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  // ----------------------------------------------------
  // Component Item Level Handlers (Individual Edit/Delete)
  // ----------------------------------------------------
  const handleOpenEditComponent = (res: any) => {
    setEditingComponent({
      bomId: selectedBom.id,
      itemIndex: res.itemIndex,
      itemId: res.bomIt.itemId,
      name: res.itemName,
      quantityNeeded: res.quantityNeededPerUnit,
      unit: res.unit,
      scrapAllowancePercent: res.scrapPercent,
      notes: res.bomIt.notes || '',
    });
  };

  const handleSaveComponentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;
    updateBOMComponentItem(editingComponent.bomId, editingComponent.itemIndex, {
      quantityNeeded: Number(editingComponent.quantityNeeded),
      unit: editingComponent.unit,
      scrapAllowancePercent: Number(editingComponent.scrapAllowancePercent),
      notes: editingComponent.notes,
    });
    setActionSuccessMsg(`مشخصات قطعه "${editingComponent.name}" در فرمول ساخت با موفقیت به‌روز شد.`);
    setEditingComponent(null);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleDeleteComponentItem = (bomId: string, itemIndex: number, itemName: string) => {
    setDeleteConfirmTarget({
      type: 'item',
      bomId,
      itemIndex,
      title: 'حذف قطعه از فرمول ساخت',
      subtitle: `آیا از حذف قطعه «${itemName}» از این فرمول ساخت (BOM) اطمینان دارید؟`
    });
  };

  const handleOpenAddComponent = () => {
    const defaultRaw = items.find(i => i.itemType === 'RawMaterial' || i.itemType === 'Component') || items[0];
    setNewCompItemId(defaultRaw?.id || '');
    setNewCompQty(1);
    setNewCompUnit(defaultRaw?.unit || 'عدد');
    setNewCompScrap(0);
    setNewCompNotes('');
    setIsAddingComponentModalOpen(true);
  };

  const handleSaveAddComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom || !newCompItemId) return;
    const raw = items.find(i => i.id === newCompItemId);
    addBOMComponentItem(selectedBom.id, {
      itemId: newCompItemId,
      quantityNeeded: Number(newCompQty) || 1,
      unit: newCompUnit || raw?.unit || 'عدد',
      scrapAllowancePercent: Number(newCompScrap) || 0,
      notes: newCompNotes,
    });
    setIsAddingComponentModalOpen(false);
    setActionSuccessMsg(`قطعه "${raw?.name || 'جدید'}" به فرمول ساخت "${selectedBom.name}" افزوده شد.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleExecuteConfirmedDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'bom') {
      deleteBOM(deleteConfirmTarget.bomId);
      if (selectedBomId === deleteConfirmTarget.bomId) {
        const remaining = boms.filter(b => b.id !== deleteConfirmTarget.bomId);
        if (remaining.length > 0) {
          setSelectedBomId(remaining[0].id);
        }
      }
      setActionSuccessMsg('فرمول ساخت (BOM) با موفقیت حذف گردید.');
    } else if (deleteConfirmTarget.type === 'item' && deleteConfirmTarget.itemIndex !== undefined) {
      deleteBOMComponentItem(deleteConfirmTarget.bomId, deleteConfirmTarget.itemIndex);
      setActionSuccessMsg('قطعه مورد نظر با موفقیت از این فرمول ساخت حذف شد.');
    }
    setDeleteConfirmTarget(null);
    setTimeout(() => setActionSuccessMsg(null), 4000);
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

                  <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>{bom.items.length} قلم قطعه مجزا</span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleBomActive(bom, e)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                        bom.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="کلیک برای فعال / بایگانی کردن این فرمول ساخت"
                    >
                      {bom.isActive ? 'فعال در تولید' : 'بایگانی'}
                    </button>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900">{selectedBom.name}</h3>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-semibold">
                      {selectedBom.version}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleBomActive(selectedBom, e)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        selectedBom.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="کلیک برای تغییر وضعیت فعال / آرشیو"
                    >
                      {selectedBom.isActive ? 'فعال در خط تولید' : 'آرشیو شده'}
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(selectedBom)}
                        className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                        title="ویرایش مشخصات اصلی و تمامی قطعات این فرمول"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ویرایش کامل فرمول</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedBom)}
                        className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                        title="حذف کامل این فرمول ساخت"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>حذف فرمول</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    محصول نهایی: <strong className="text-slate-800">{finishedItem?.name || selectedBom.finishedItemId}</strong>
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

              {/* Table Toolbar: Title + Add New Component Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-xs text-slate-800">
                    اقلام و قطعات اولیه فرمول ساخت BOM ({simulationResults.length} قلم)
                  </h4>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddComponent}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن قطعه جدید به این فرمول</span>
                  </button>
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
                      <th className="whitespace-nowrap p-3 text-center">عملیات و ویرایش قطعه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulationResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <p className="font-medium text-xs">هیچ قطعه‌ای برای این فرمول ساخت ثبت نشده است.</p>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={handleOpenAddComponent}
                              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>افزودن اولین قطعه</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      simulationResults.map((res, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{res.itemCode}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{res.itemName}</div>
                              {res.bomIt.notes && (
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                                  {res.bomIt.notes}
                                </span>
                              )}
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
                              <div className="flex items-center justify-center gap-1">
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
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                    title="ثبت سریع رسید ورود انبار برای تامین این کسری"
                                  >
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="hidden xl:inline">شارژ</span>
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditComponent(res)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="ویرایش مشخصات این قطعه (تعداد، افت مجاز، توضیحات)"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComponentItem(selectedBom.id, res.itemIndex, res.itemName)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="حذف این قطعه از فرمول ساخت"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500 font-bold"
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

                <div>
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

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg self-end">
                  <input
                    type="checkbox"
                    id="bom-is-active-cb"
                    checked={isActiveStatus}
                    onChange={(e) => setIsActiveStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="bom-is-active-cb" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    فرمول فعال در خط تولید (در محاسبات کسری لحاظ گردد)
                  </label>
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
                  <label className="block text-xs font-bold text-slate-700">اقلام و قطعات مصرفی برای ۱ واحد محصول ({bomItems.length} قلم):</label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> افزودن قطعه جدید
                  </button>
                </div>

                {bomItems.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    هیچ قطعه‌ای ثبت نشده است. بر روی دکمه «افزودن قطعه جدید» کلیک کنید.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {bomItems.map((line, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center text-xs">
                        <span className="font-mono text-[10px] text-slate-400 w-5 text-center">{idx + 1}</span>

                        <select
                          value={line.itemId}
                          onChange={(e) => {
                            const copy = [...bomItems];
                            copy[idx].itemId = e.target.value;
                            const found = items.find(it => it.id === e.target.value);
                            if (found?.unit) copy[idx].unit = found.unit;
                            setBomItems(copy);
                          }}
                          className="flex-1 min-w-[140px] px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800"
                        >
                          {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0.001}
                            step="any"
                            placeholder="تعداد"
                            value={line.quantityNeeded}
                            onChange={(e) => {
                              const copy = [...bomItems];
                              copy[idx].quantityNeeded = Number(e.target.value);
                              setBomItems(copy);
                            }}
                            className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                            title="تعداد مورد نیاز در ۱ دستگاه"
                          />
                          <input
                            type="text"
                            placeholder="واحد"
                            value={line.unit}
                            onChange={(e) => {
                              const copy = [...bomItems];
                              copy[idx].unit = e.target.value;
                              setBomItems(copy);
                            }}
                            className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 text-center"
                            title="واحد سنجش (عدد، کیلوگرم، متر و...)"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">افت:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            placeholder="٪ افت"
                            value={line.scrapAllowancePercent}
                            onChange={(e) => {
                              const copy = [...bomItems];
                              copy[idx].scrapAllowancePercent = Number(e.target.value);
                              setBomItems(copy);
                            }}
                            className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                            title="درصد ضایعات و افت مجاز تولید"
                          />
                          <span className="text-[10px] text-slate-400">٪</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="حذف این ردیف قطعه"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات فرمول ساخت</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="نکات فنی، مشخصات مونتاژ، استانداردهای ساخت و..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  {editingBom && canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        handleDelete(editingBom);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف کامل این فرمول</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-2xs active:scale-95 transition-all"
                  >
                    {editingBom ? 'ذخیره تغییرات فرمول BOM' : 'ثبت فرمول ساخت جدید'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Component Item Level Edit Modal */}
      {editingComponent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    ویرایش قطعه در فرمول ساخت
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold text-indigo-600 mt-0.5">
                    {editingComponent.name}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingComponent(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveComponentEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ضریب کسر (۱ دستگاه)*</label>
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    required
                    value={editingComponent.quantityNeeded}
                    onChange={(e) => setEditingComponent({ ...editingComponent, quantityNeeded: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={editingComponent.unit}
                    onChange={(e) => setEditingComponent({ ...editingComponent, unit: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ضریب افت مجاز و ضایعات (درصد ٪)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={editingComponent.scrapAllowancePercent}
                  onChange={(e) => setEditingComponent({ ...editingComponent, scrapAllowancePercent: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  این درصد به میزان مصرف هر قطعه افزوده شده تا ضایعات خط تولید جبران شود.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و مشخصه فنی قطعه</label>
                <textarea
                  rows={2}
                  value={editingComponent.notes}
                  onChange={(e) => setEditingComponent({ ...editingComponent, notes: e.target.value })}
                  placeholder="محل نصب، تلرانس، آلیاژ یا برند خاص..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      const comp = editingComponent;
                      setEditingComponent(null);
                      handleDeleteComponentItem(comp.bomId, comp.itemIndex, comp.name);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف این قطعه</span>
                  </button>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setEditingComponent(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-2xs active:scale-95 transition-all"
                  >
                    ذخیره تغییرات قطعه
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Component Item to Selected BOM Modal */}
      {isAddingComponentModalOpen && selectedBom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    افزودن قطعه جدید به فرمول ساخت
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold text-emerald-700 mt-0.5">
                    {selectedBom.name}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddingComponentModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddComponent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">انتخاب کالا / ماده اولیه / نیمه‌ساخته*</label>
                <select
                  required
                  value={newCompItemId}
                  onChange={(e) => {
                    setNewCompItemId(e.target.value);
                    const it = items.find(x => x.id === e.target.value);
                    if (it?.unit) setNewCompUnit(it.unit);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:border-emerald-500"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) — {i.itemType}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تعداد در ۱ واحد محصول*</label>
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    required
                    value={newCompQty}
                    onChange={(e) => setNewCompQty(Math.max(0.001, Number(e.target.value)))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-slate-900 focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={newCompUnit}
                    onChange={(e) => setNewCompUnit(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ضریب افت مجاز و ضایعات (درصد ٪)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={newCompScrap}
                  onChange={(e) => setNewCompScrap(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold text-slate-900 focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و مشخصه فنی</label>
                <textarea
                  rows={2}
                  value={newCompNotes}
                  onChange={(e) => setNewCompNotes(e.target.value)}
                  placeholder="مشخصات مونتاژ، تلرانس، برند و..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingComponentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن قطعه به فرمول</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Deletion Safe Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {deleteConfirmTarget.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {deleteConfirmTarget.subtitle}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              >
                بله، حذف شود
              </button>
            </div>
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

