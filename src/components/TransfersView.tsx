import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TransferStatus, WarehouseTransfer, WarehouseTransferItem } from '../types';
import { 
  ArrowLeftRight, Plus, CheckCircle2, Clock, 
  XCircle, Truck, FileText, X, Pencil, Trash2,
  Printer, CheckSquare, Search, Filter, AlertCircle,
  Building2, UserCheck, ShieldCheck, Phone, Info,
  Layers, Package, Check, Eye
} from 'lucide-react';

export const TransfersView: React.FC = () => {
  const { 
    transfers, warehouses, items, projects, boms, currentUser, 
    createTransfer, updateTransfer, dispatchTransfer, receiveTransfer, rejectTransfer, deleteTransfer,
    hasActionPermission, getItemQuantityInWarehouse, companyName
  } = useApp();

  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');

  // Tab State
  const [activeTab, setActiveTab] = useState<'ALL' | 'CENTRAL_CARTABLE' | 'DEST_CARTABLE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('ALL');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<WarehouseTransfer | null>(null);

  // Dispatch Action Modal (Central Warehouse Approval)
  const [dispatchModalTransfer, setDispatchModalTransfer] = useState<WarehouseTransfer | null>(null);
  const [dispatchDetails, setDispatchDetails] = useState({
    dispatchedBy: currentUser.fullName || 'علی کاظمی (انباردار مرکزی)',
    handlerName: 'حسن نوری (راننده و مسئول حمل)',
    driverPhone: '09123456789',
    vehicleNumber: 'ایران ۱۱ - ۱۲۳ ب ۴۵',
    notes: ''
  });

  // Receive Action Modal (Destination Warehouse Receipt)
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<WarehouseTransfer | null>(null);
  const [receiveDetails, setReceiveDetails] = useState({
    receivedBy: currentUser.fullName || 'مسئول انبار کارگاه',
    notes: ''
  });

  // Reject Modal
  const [rejectModalTransfer, setRejectModalTransfer] = useState<WarehouseTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Print Checklist Modals
  const [printPickingChecklist, setPrintPickingChecklist] = useState<WarehouseTransfer | null>(null);
  const [printReceivingChecklist, setPrintReceivingChecklist] = useState<WarehouseTransfer | null>(null);
  const [printOfficialVoucher, setPrintOfficialVoucher] = useState<WarehouseTransfer | null>(null);

  // Requisition Form State
  const [docNumber, setDocNumber] = useState(`REQ-1404-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || 'wh-raw');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?.id || 'wh-prod');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [requestedBy, setRequestedBy] = useState(currentUser.fullName || 'مهندس رضایی (آنالیز پروژه)');
  const [handlerName, setHandlerName] = useState('حسن نوری (مسئول حمل داخلی)');
  const [driverPhone, setDriverPhone] = useState('09123456789');
  const [vehicleNumber, setVehicleNumber] = useState('ایران ۱۱ - ۱۲۳ ب ۴۵');
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<WarehouseTransferItem[]>([
    { itemId: items[0]?.id || '', quantity: 50, notes: '' }
  ]);

  // Counts for Tabs
  const pendingCentralCount = useMemo(() => {
    return transfers.filter(t => t.status === 'Pending').length;
  }, [transfers]);

  const inTransitDestCount = useMemo(() => {
    return transfers.filter(t => t.status === 'InTransit').length;
  }, [transfers]);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(trf => {
      // Tab filter
      if (activeTab === 'CENTRAL_CARTABLE' && trf.status !== 'Pending') return false;
      if (activeTab === 'DEST_CARTABLE' && trf.status !== 'InTransit') return false;
      if (activeTab === 'COMPLETED' && trf.status !== 'Completed') return false;

      // Warehouse filter
      if (filterWarehouse !== 'ALL') {
        if (trf.sourceWarehouseId !== filterWarehouse && trf.targetWarehouseId !== filterWarehouse) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const docMatch = trf.docNumber.toLowerCase().includes(q);
        const projMatch = trf.projectName?.toLowerCase().includes(q) || false;
        const reqMatch = trf.requestedBy?.toLowerCase().includes(q) || false;
        const handlerMatch = trf.handlerName?.toLowerCase().includes(q) || false;
        const itemMatch = trf.items.some(it => {
          const itemObj = items.find(i => i.id === it.itemId);
          return itemObj?.name.toLowerCase().includes(q) || itemObj?.code.toLowerCase().includes(q);
        });
        if (!docMatch && !projMatch && !reqMatch && !handlerMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [transfers, activeTab, filterWarehouse, searchQuery, items]);

  const handleOpenNew = () => {
    setEditingTransfer(null);
    setDocNumber(`REQ-1404-${Math.floor(100 + Math.random() * 900)}`);
    setDate(new Date().toLocaleDateString('fa-IR'));
    // Default Central Warehouse as source
    const centralWh = warehouses.find(w => w.warehouseType === 'Central') || warehouses[0];
    const prodWh = warehouses.find(w => w.warehouseType === 'Production') || warehouses[1] || warehouses[0];
    setSourceWarehouseId(centralWh?.id || 'wh-raw');
    setTargetWarehouseId(prodWh?.id || 'wh-prod');
    setSelectedProjectId('');
    setRequestedBy(currentUser.fullName || 'مسئول آنالیز پروژه');
    setHandlerName('حسن نوری (مسئول حمل داخلی)');
    setDriverPhone('09123456789');
    setVehicleNumber('ایران ۱۱ - ۱۲۳ ب ۴۵');
    setNotes('');
    setTransferItems([{ itemId: items[0]?.id || '', quantity: 50, notes: '' }]);
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (trf: WarehouseTransfer) => {
    setEditingTransfer(trf);
    setDocNumber(trf.docNumber);
    setDate(trf.date);
    setSourceWarehouseId(trf.sourceWarehouseId);
    setTargetWarehouseId(trf.targetWarehouseId);
    setSelectedProjectId(trf.projectId || '');
    setRequestedBy(trf.requestedBy);
    setHandlerName(trf.handlerName);
    setDriverPhone(trf.driverPhone || '');
    setVehicleNumber(trf.vehicleNumber || '');
    setNotes(trf.notes || '');
    setTransferItems(trf.items.map(it => ({ ...it })));
    setIsNewModalOpen(true);
  };

  const handleDelete = (trf: WarehouseTransfer) => {
    if (confirm(`آیا از حذف حواله/درخواست انتقال "${trf.docNumber}" اطمینان دارید؟`)) {
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
      const pop: WarehouseTransferItem[] = activeBom.items.map(bi => {
        const itm = items.find(i => i.id === bi.itemId);
        return {
          itemId: bi.itemId,
          quantity: bi.quantityNeeded * (proj.targetQuantity || 1),
          unitPrice: itm?.unitPrice || 0,
          notes: `محاسبه‌شده بر اساس BOM پروژه ${proj.code}`
        };
      });
      setTransferItems(pop);
      setNotes(`درخواست متریال پروژه ${proj.code} (${proj.name}) - تامین مرحله مونتاژ از انبار مرکزی`);
      
      const centralWh = warehouses.find(w => w.warehouseType === 'Central') || warehouses[0];
      const prodWh = warehouses.find(w => w.linkedProjectId === projectId || w.warehouseType === 'Production') || warehouses[1];
      if (centralWh) setSourceWarehouseId(centralWh.id);
      if (prodWh) setTargetWarehouseId(prodWh.id);
    } else {
      alert('فرمول ساخت (BOM) فعال برای کالای نهایی این پروژه تعریف نشده است.');
    }
  };

  const handleAddItemRow = () => {
    setTransferItems(prev => [...prev, { itemId: items[0]?.id || '', quantity: 10, notes: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof WarehouseTransferItem, val: any) => {
    setTransferItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWarehouseId === targetWarehouseId) {
      alert('انبار مبدا و انبار مقصد نمی‌تواند یکسان باشد!');
      return;
    }

    if (transferItems.length === 0) {
      alert('حداقل یک قلم کالا برای انتقال وارد کنید.');
      return;
    }

    const proj = projects.find(p => p.id === selectedProjectId);

    if (editingTransfer) {
      updateTransfer(editingTransfer.id, {
        docNumber,
        date,
        sourceWarehouseId,
        targetWarehouseId,
        projectId: selectedProjectId || undefined,
        projectName: proj ? proj.name : undefined,
        requestedBy,
        handlerName,
        driverPhone,
        vehicleNumber,
        items: transferItems,
        notes,
      });
      alert('درخواست/حواله با موفقیت به‌روزرسانی شد.');
    } else {
      createTransfer({
        docNumber,
        date,
        sourceWarehouseId,
        targetWarehouseId,
        projectId: selectedProjectId || undefined,
        projectName: proj ? proj.name : undefined,
        requestedBy,
        requestDate: date,
        handlerName,
        driverPhone,
        vehicleNumber,
        status: 'Pending', // Goes directly to Central Warehouse Cartable!
        items: transferItems,
        notes,
      });
      alert('درخواست تامین و انتقال کالا با موفقیت ثبت شد و در کارتابل انباردار مرکزی قرار گرفت.');
      setActiveTab('CENTRAL_CARTABLE');
    }

    setIsNewModalOpen(false);
  };

  // Dispatch Execution
  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalTransfer) return;

    dispatchTransfer(dispatchModalTransfer.id, {
      dispatchedBy: dispatchDetails.dispatchedBy,
      handlerName: dispatchDetails.handlerName,
      driverPhone: dispatchDetails.driverPhone,
      vehicleNumber: dispatchDetails.vehicleNumber,
      notes: dispatchDetails.notes,
    });

    alert(`حواله انتقال ${dispatchModalTransfer.docNumber} با موفقیت صادر شد، موجودی انبار مبدا کسر گردید و محموله در کارتابل انبار مقصد قرار گرفت.`);
    setDispatchModalTransfer(null);
    setActiveTab('DEST_CARTABLE');
  };

  // Receive Execution
  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalTransfer) return;

    receiveTransfer(receiveModalTransfer.id, {
      receivedBy: receiveDetails.receivedBy,
      notes: receiveDetails.notes,
    });

    alert(`تحویل محموله ${receiveModalTransfer.docNumber} در انبار مقصد تایید شد و به موجودی انبار مقصد افزوده گردید.`);
    setReceiveModalTransfer(null);
    setActiveTab('COMPLETED');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTransfer || !rejectReason.trim()) return;

    rejectTransfer(rejectModalTransfer.id, rejectReason);
    alert(`درخواست انتقال ${rejectModalTransfer.docNumber} رد شد.`);
    setRejectModalTransfer(null);
    setRejectReason('');
  };

  const statusBadges: Record<TransferStatus, { label: string; style: string; icon: React.ComponentType<{ className?: string }> }> = {
    Pending: { label: 'در انتظار انبار مرکزی', style: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-400/20', icon: Clock },
    InTransit: { label: 'در حال حمل به مقصد', style: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-400/20 animate-pulse', icon: Truck },
    Completed: { label: 'تایید و تحویل شده', style: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/20', icon: CheckCircle2 },
    Rejected: { label: 'رد شده', style: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/20', icon: XCircle },
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-900/30">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
              <ArrowLeftRight className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                گردش درخواست و انتقال کالا بین انبارها
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                  Dual-Cartable Engine
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                چرخه استاندارد: ثبت درخواست آنالیز پروژه ➔ کارتابل و چک‌لیست خروج انبار مرکزی ➔ کارتابل و چک‌لیست تحویل‌گیری انبار مقصد
              </p>
            </div>
          </div>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenNew}
            className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-950/50 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            ثبت درخواست جدید کالا (آنالیز پروژه)
          </button>
        )}
      </div>

      {/* Tabs & Workflow Pipeline */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            همه اسناد و حواله‌ها
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 font-mono">
              {transfers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CENTRAL_CARTABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CENTRAL_CARTABLE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            کارتابل انبار مرکزی (تایید ارسال)
            {pendingCentralCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900 text-amber-100 font-mono animate-pulse">
                {pendingCentralCount} در انتظار
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('DEST_CARTABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DEST_CARTABLE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            کارتابل انبار مقصد / پروژه (تایید دریافت)
            {inTransitDestCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-100 font-mono">
                {inTransitDestCount} در راه
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            تکمیل شده و تحویل نهایی
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در حواله‌ها، پروژه‌ها، قطعات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه انبارها</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Transfers Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-4">شماره سند</th>
                <th className="whitespace-nowrap p-4">پروژه / درخواست‌کننده</th>
                <th className="whitespace-nowrap p-4">انبار مبدا (مرکزی)</th>
                <th className="whitespace-nowrap p-4">انبار مقصد (پروژه)</th>
                <th className="whitespace-nowrap p-4">اقلام</th>
                <th className="whitespace-nowrap p-4">حمل‌کننده / راننده</th>
                <th className="whitespace-nowrap p-4">وضعیت چرخه</th>
                <th className="whitespace-nowrap p-4 text-center">عملیات کارتابل و چک‌لیست‌ها</th>
                <th className="whitespace-nowrap p-4 text-center">مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-sm text-slate-500">هیچ سندی در این بخش یافت نشد.</p>
                      <p className="text-xs text-slate-400">می‌توانید با دکمه بالا درخواست کالا برای پروژه ثبت کنید.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(trf => {
                  const srcWh = warehouses.find(w => w.id === trf.sourceWarehouseId);
                  const tgtWh = warehouses.find(w => w.id === trf.targetWarehouseId);
                  const badge = statusBadges[trf.status];
                  const Icon = badge.icon;
                  const totalQty = trf.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr key={trf.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="whitespace-nowrap p-4">
                        <div className="font-mono font-bold text-indigo-700 text-sm">{trf.docNumber}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{trf.date}</div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <div className="font-bold text-slate-900">{trf.projectName || 'سفارش عمومی کارگاه'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          {trf.requestedBy}
                        </div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <div className="font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                          {srcWh?.name || trf.sourceWarehouseId}
                        </div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <div className="font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                          {tgtWh?.name || trf.targetWarehouseId}
                        </div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <div className="font-bold text-slate-800">{trf.items.length} ردیف کالا</div>
                        <div className="text-[11px] text-slate-500 font-mono">مجموع: {totalQty} عدد</div>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <div className="text-slate-800 font-medium">{trf.handlerName}</div>
                        {trf.driverPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{trf.driverPhone}</div>
                        )}
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <span className={`px-3 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 w-fit ${badge.style}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Action Cartable & Checklist Buttons */}
                      <td className="whitespace-nowrap p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Stage 1: Central Warehouse Cartable Actions */}
                          {trf.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => setPrintPickingChecklist(trf)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs"
                                title="چاپ چک‌لیست جمع‌آوری و خروج انبار مرکزی"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-700" />
                                ۱. پرینت چک‌لیست ارسال
                              </button>

                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setDispatchModalTransfer(trf);
                                    setDispatchDetails({
                                      dispatchedBy: currentUser.fullName || 'علی کاظمی (انباردار مرکزی)',
                                      handlerName: trf.handlerName || 'حسن نوری (راننده)',
                                      driverPhone: trf.driverPhone || '09123456789',
                                      vehicleNumber: trf.vehicleNumber || 'ایران ۱۱ - ۱۲۳ ب ۴۵',
                                      notes: ''
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  ۲. تایید ارسال (صدور حواله)
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setRejectModalTransfer(trf);
                                  setRejectReason('');
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px]"
                                title="رد درخواست"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Stage 2: Destination Warehouse Cartable Actions */}
                          {trf.status === 'InTransit' && (
                            <>
                              <button
                                onClick={() => setPrintReceivingChecklist(trf)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs"
                                title="چاپ چک‌لیست تحویل‌گیری و کنترل سلامت انبار مقصد"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-700" />
                                ۳. پرینت چک‌لیست دریافت
                              </button>

                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setReceiveModalTransfer(trf);
                                    setReceiveDetails({
                                      receivedBy: currentUser.fullName || 'انباردار مقصد / کارگاه',
                                      notes: ''
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  ۴. تایید دریافت قطعی
                                </button>
                              )}
                            </>
                          )}

                          {/* Stage 3: Completed Transfer */}
                          {trf.status === 'Completed' && (
                            <button
                              onClick={() => setPrintOfficialVoucher(trf)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              مشاهده و چاپ حواله رسمی
                            </button>
                          )}

                          {trf.status === 'Rejected' && (
                            <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              رد شده ({trf.rejectReason || 'عدم تایید'})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Edit / Delete */}
                      <td className="whitespace-nowrap p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && trf.status === 'Pending' && (
                            <button
                              onClick={() => handleOpenEdit(trf)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="ویرایش درخواست"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDelete(trf)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف حواله"
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

      {/* ========================================================================= */}
      {/* 1. Modal: New Project Requisition / Transfer Request */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {editingTransfer ? `ویرایش درخواست (${editingTransfer.docNumber})` : 'ثبت درخواست کالا برای پروژه (آنالیز متریال)'}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    پس از ثبت، درخواست مستقیماً در کارتابل انباردار مرکزی جهت تایید و صدور حواله قرار می‌گیرد.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="p-6 space-y-5 overflow-y-auto">
              {/* BOM Fast Auto-Loader */}
              <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-black text-xs text-indigo-950 block">⚡ آنالیز خودکار و فراخوانی BOM پروژه:</span>
                  <span className="text-[11px] text-indigo-800">
                    با انتخاب پروژه، اقلام مورد نیاز بر اساس فرمول ساخت و ضایعات محاسبه شده و به لیست اضافه می‌گردد.
                  </span>
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleLoadProjectBOM(e.target.value)}
                  className="px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs text-indigo-950 font-bold focus:outline-none shadow-2xs shrink-0"
                >
                  <option value="">-- انتخاب پروژه متقاضی --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code}: {p.name} ({p.client})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره درخواست / سند*</label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ درخواست*</label>
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مسئول آنالیز / ثبت‌کننده*</label>
                  <input
                    type="text"
                    required
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">انبار مبدا (انبار مرکزی کسر کالا)*</label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-amber-50/60 border border-amber-300 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.warehouseType === 'Central' ? '(انبار مرکزی)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">انبار مقصد (پروژه / فرعی)*</label>
                  <select
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام مسئول / راننده حمل*</label>
                  <input
                    type="text"
                    required
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره تماس راننده</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پلاک خودرو حمل</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items List Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    لیست اقلام درخواستی از انبار مرکزی:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    افزودن ردیف کالا
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {transferItems.map((line, idx) => {
                    const itemObj = items.find(i => i.id === line.itemId);
                    const sourceStock = getItemQuantityInWarehouse(line.itemId, sourceWarehouseId);
                    const isShortage = sourceStock < line.quantity;

                    return (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center">
                        <div className="flex-1 w-full">
                          <select
                            value={line.itemId}
                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                          >
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.code}) - واحد: {i.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="flex flex-col">
                            <input
                              type="number"
                              min={1}
                              required
                              value={line.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold text-center"
                              placeholder="تعداد"
                            />
                            <span className={`text-[10px] mt-0.5 text-center font-mono ${isShortage ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                              موجودی مرکزی: {sourceStock}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={line.notes || ''}
                            onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                            className="flex-1 sm:w-44 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                            placeholder="ملاحظات / بسته‌بندی"
                          />

                          {transferItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و دستورکار انتقال</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  placeholder="مثال: قطعات حساس SMD با پالت ضد الکتریسیته ساکن ارسال شود."
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingTransfer ? 'ذخیره ویرایش' : 'ارسال درخواست به کارتابل انبار مرکزی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: Central Warehouse Dispatch Approval & Transfer Voucher */}
      {/* ========================================================================= */}
      {dispatchModalTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-amber-100" />
                <div>
                  <h3 className="font-black text-sm">تایید ارسال و صدور حواله انتقال انبار مرکزی</h3>
                  <p className="text-[11px] text-amber-100 mt-0.5">سند {dispatchModalTransfer.docNumber}</p>
                </div>
              </div>
              <button onClick={() => setDispatchModalTransfer(null)} className="text-amber-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-6 space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  توجه انباردار مرکزی:
                </div>
                <p>
                  با تایید این بخش، حواله رسمی انتقال صادر شده و موجودی کلیه اقلام این سند از انبار مبدا کسر خواهد شد و در کارتابل انبار مقصد قرار خواهد گرفت.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام انباردار تاییدکننده (تحویل‌دهنده)*</label>
                  <input
                    type="text"
                    required
                    value={dispatchDetails.dispatchedBy}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, dispatchedBy: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نام راننده / مسئول حمل*</label>
                    <input
                      type="text"
                      required
                      value={dispatchDetails.handlerName}
                      onChange={(e) => setDispatchDetails({ ...dispatchDetails, handlerName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شماره تماس راننده</label>
                    <input
                      type="text"
                      value={dispatchDetails.driverPhone}
                      onChange={(e) => setDispatchDetails({ ...dispatchDetails, driverPhone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پلاک خودرو و بارنامه</label>
                  <input
                    type="text"
                    value={dispatchDetails.vehicleNumber}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, vehicleNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات بسته‌بندی و ارسال</label>
                  <input
                    type="text"
                    value={dispatchDetails.notes}
                    onChange={(e) => setDispatchDetails({ ...dispatchDetails, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    placeholder="مثال: کلیه قطعات با چک‌لیست فیزیکی شمارش و بارگیری شد."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDispatchModalTransfer(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  تایید خروج و صدور حواله انتقال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: Destination Warehouse Receipt Approval */}
      {/* ========================================================================= */}
      {receiveModalTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                <div>
                  <h3 className="font-black text-sm">تایید دریافت و ورود به انبار مقصد / پروژه</h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">حواله {receiveModalTransfer.docNumber}</p>
                </div>
              </div>
              <button onClick={() => setReceiveModalTransfer(null)} className="text-emerald-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  کنترل تحویل‌گیری انبار مقصد:
                </div>
                <p>
                  با تایید دریافت، اقلام به صورت قطعی به موجودی انبار مقصد ({warehouses.find(w => w.id === receiveModalTransfer.targetWarehouseId)?.name}) اضافه شده و چرخه جابجایی کالا بسته می‌شود.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام انباردار مقصد / تحویل‌گیرنده*</label>
                  <input
                    type="text"
                    required
                    value={receiveDetails.receivedBy}
                    onChange={(e) => setReceiveDetails({ ...receiveDetails, receivedBy: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات سلامت و تطابق کالا</label>
                  <textarea
                    rows={2}
                    value={receiveDetails.notes}
                    onChange={(e) => setReceiveDetails({ ...receiveDetails, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    placeholder="مثال: کالاها از نظر فیزیکی و شمارش با چک‌لیست تطابق کامل دارند."
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReceiveModalTransfer(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تایید قطعی تحویل و ورود به موجودی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: Reject Requisition */}
      {/* ========================================================================= */}
      {rejectModalTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              رد درخواست انتقال کالا ({rejectModalTransfer.docNumber})
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">علت رد درخواست*</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                placeholder="علت کسری موجودی، عدم تایید آنالیز یا مغایرت پروژه را بنویسید..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalTransfer(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                تایید رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Printable Checklist: Picking / Packing Checklist (انبار مرکزی) */}
      {/* ========================================================================= */}
      {printPickingChecklist && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl p-8 space-y-6 max-h-[95vh] overflow-y-auto print:p-0 print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{companyName || 'شرکت تولیدی و صنعتی'}</h2>
                <h1 className="text-xl font-black text-amber-700 mt-1">چک‌لیست جمع‌آوری و خروج کالا از انبار مرکزی (Picking List)</h1>
                <p className="text-xs text-slate-500 mt-1">فرآیند کنترل اقلام و صدور حواله انتقال به انبار پروژه</p>
              </div>
              <div className="text-left font-mono text-xs space-y-1">
                <div>شماره سند: <strong className="text-sm text-slate-900">{printPickingChecklist.docNumber}</strong></div>
                <div>تاریخ صدور: {printPickingChecklist.date}</div>
                <div>پروژه: {printPickingChecklist.projectName || 'عمومی'}</div>
              </div>
            </div>

            {/* Warehouse & Driver Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div><span className="text-slate-500 block">انبار مبدا:</span><strong>{warehouses.find(w => w.id === printPickingChecklist.sourceWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">انبار مقصد:</span><strong>{warehouses.find(w => w.id === printPickingChecklist.targetWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">درخواست‌کننده:</span><strong>{printPickingChecklist.requestedBy}</strong></div>
              <div><span className="text-slate-500 block">راننده / مسئول حمل:</span><strong>{printPickingChecklist.handlerName} ({printPickingChecklist.driverPhone || '-'})</strong></div>
            </div>

            {/* Checklist Table */}
            <div>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2 border-l border-slate-300 text-center w-10">ردیف</th>
                    <th className="p-2 border-l border-slate-300">کد کالا</th>
                    <th className="p-2 border-l border-slate-300">نام و مشخصات فنی کالا</th>
                    <th className="p-2 border-l border-slate-300 text-center">محل در قفسه</th>
                    <th className="p-2 border-l border-slate-300 text-center">واحد</th>
                    <th className="p-2 border-l border-slate-300 text-center">تعداد درخواستی</th>
                    <th className="p-2 border-l border-slate-300 text-center w-24">شمارش فیزیکی</th>
                    <th className="p-2 text-center w-20">تیک کنترل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printPickingChecklist.items.map((it, idx) => {
                    const itemObj = items.find(i => i.id === it.itemId);
                    return (
                      <tr key={idx} className="h-10">
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-l border-slate-300 font-mono font-bold">{itemObj?.code}</td>
                        <td className="p-2 border-l border-slate-300 font-medium">{itemObj?.name}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{itemObj?.locationInRack || '-'}</td>
                        <td className="p-2 border-l border-slate-300 text-center">{itemObj?.unit}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-bold font-mono text-sm">{it.quantity}</td>
                        <td className="p-2 border-l border-slate-300 text-center border-dashed"></td>
                        <td className="p-2 text-center">
                          <div className="w-5 h-5 border-2 border-slate-400 rounded mx-auto"></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-12 border-t border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <div className="font-bold text-slate-700">ثبت‌کننده آنالیز پروژه</div>
                <div className="text-slate-400">امضا و تاریخ</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">انباردار انبار مرکزی (تحویل‌دهنده)</div>
                <div className="text-slate-400">امضا و تاریخ</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">راننده / مسئول حمل و لجستیک</div>
                <div className="text-slate-400">امضا و تاریخ</div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setPrintPickingChecklist(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                بستن
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                پرینت چک‌لیست جمع‌آوری
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. Printable Checklist: Receiving & Verification Checklist (انبار مقصد) */}
      {/* ========================================================================= */}
      {printReceivingChecklist && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl p-8 space-y-6 max-h-[95vh] overflow-y-auto print:p-0 print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{companyName || 'شرکت تولیدی و صنعتی'}</h2>
                <h1 className="text-xl font-black text-indigo-800 mt-1">چک‌لیست تحویل‌گیری و کنترل سلامت در انبار مقصد (Receiving List)</h1>
                <p className="text-xs text-slate-500 mt-1">بررسی تطابق اقلام ارسالی انبار مرکزی و ثبت نهایی در موجودی کارگاه</p>
              </div>
              <div className="text-left font-mono text-xs space-y-1">
                <div>شماره حواله: <strong className="text-sm text-slate-900">{printReceivingChecklist.docNumber}</strong></div>
                <div>تاریخ ارسال: {printReceivingChecklist.dispatchDate || printReceivingChecklist.date}</div>
                <div>پروژه: {printReceivingChecklist.projectName || 'عمومی'}</div>
              </div>
            </div>

            {/* Warehouse & Transport Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div><span className="text-slate-500 block">انبار مبدا:</span><strong>{warehouses.find(w => w.id === printReceivingChecklist.sourceWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">انبار تحویل‌گیرنده:</span><strong>{warehouses.find(w => w.id === printReceivingChecklist.targetWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">تایید انبار مرکزی:</span><strong>{printReceivingChecklist.dispatchedBy || '-'}</strong></div>
              <div><span className="text-slate-500 block">مسئول حمل و خودرو:</span><strong>{printReceivingChecklist.handlerName} ({printReceivingChecklist.vehicleNumber || '-'})</strong></div>
            </div>

            {/* Receiving Table */}
            <div>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2 border-l border-slate-300 text-center w-10">ردیف</th>
                    <th className="p-2 border-l border-slate-300">کد کالا</th>
                    <th className="p-2 border-l border-slate-300">شرح قطعه و ملزومات</th>
                    <th className="p-2 border-l border-slate-300 text-center">واحد</th>
                    <th className="p-2 border-l border-slate-300 text-center">تعداد ارسالی</th>
                    <th className="p-2 border-l border-slate-300 text-center w-24">تعداد سالم تحویلی</th>
                    <th className="p-2 text-center w-24">تطابق و تایید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printReceivingChecklist.items.map((it, idx) => {
                    const itemObj = items.find(i => i.id === it.itemId);
                    return (
                      <tr key={idx} className="h-10">
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-l border-slate-300 font-mono font-bold">{itemObj?.code}</td>
                        <td className="p-2 border-l border-slate-300 font-medium">{itemObj?.name}</td>
                        <td className="p-2 border-l border-slate-300 text-center">{itemObj?.unit}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-bold font-mono text-sm">{it.quantity}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-700">تایید سلامت</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <div className="font-bold text-slate-700">راننده تحویل‌دهنده محموله</div>
                <div className="text-slate-400">{printReceivingChecklist.handlerName} - امضا و تاریخ</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">انباردار انبار مقصد / سرپرست کارگاه (تحویل‌گیرنده)</div>
                <div className="text-slate-400">نام، امضا و مهر انبار</div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setPrintReceivingChecklist(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                بستن
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                پرینت چک‌لیست دریافت کالا
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Printable Official Transfer Voucher (حواله رسمی انتقال بین انبارها) */}
      {/* ========================================================================= */}
      {printOfficialVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl p-8 space-y-6 max-h-[95vh] overflow-y-auto print:p-0 print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{companyName || 'شرکت تولیدی و صنعتی'}</h2>
                <h1 className="text-xl font-black text-emerald-800 mt-1">حواله رسمی انتقال بین انبارها (Inter-Warehouse Voucher)</h1>
                <p className="text-xs text-slate-500 mt-1">سند قطعی جابجایی موجودی و گردش حسابداری انبار</p>
              </div>
              <div className="text-left font-mono text-xs space-y-1">
                <div>شماره حواله: <strong className="text-sm text-slate-900">{printOfficialVoucher.docNumber}</strong></div>
                <div>تاریخ درخواست: {printOfficialVoucher.date}</div>
                <div>تاریخ تحویل قطعی: {printOfficialVoucher.receiveDate || printOfficialVoucher.date}</div>
              </div>
            </div>

            {/* Voucher Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div><span className="text-slate-500 block">انبار مبدا (بستانکار):</span><strong>{warehouses.find(w => w.id === printOfficialVoucher.sourceWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">انبار مقصد (بدهکار):</span><strong>{warehouses.find(w => w.id === printOfficialVoucher.targetWarehouseId)?.name}</strong></div>
              <div><span className="text-slate-500 block">پروژه منتسب:</span><strong>{printOfficialVoucher.projectName || 'عمومی'}</strong></div>
              <div><span className="text-slate-500 block">وضعیت سند:</span><strong className="text-emerald-700">تکمیل و نهایی‌شده</strong></div>
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5 border-l border-slate-300 text-center w-12">ردیف</th>
                    <th className="p-2.5 border-l border-slate-300">کد کالا</th>
                    <th className="p-2.5 border-l border-slate-300">نام و شرح قلم کالا</th>
                    <th className="p-2.5 border-l border-slate-300 text-center">واحد</th>
                    <th className="p-2.5 border-l border-slate-300 text-center">مقدار انتقال</th>
                    <th className="p-2.5 border-l border-slate-300 text-center">نرخ واحد (تومان)</th>
                    <th className="p-2.5 text-center">مبلغ کل (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printOfficialVoucher.items.map((it, idx) => {
                    const itemObj = items.find(i => i.id === it.itemId);
                    const qty = Number(it.quantity) || 0;
                    const price = Number(it.unitPrice) || Number(itemObj?.unitPrice) || 0;
                    const totalPrice = price * qty;
                    return (
                      <tr key={idx} className="h-9">
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-l border-slate-300 font-mono font-bold">{itemObj?.code || it.itemId}</td>
                        <td className="p-2 border-l border-slate-300 font-medium">{itemObj?.name || 'کالای نامشخص'}</td>
                        <td className="p-2 border-l border-slate-300 text-center">{itemObj?.unit || 'عدد'}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-bold font-mono">{qty.toLocaleString('fa-IR')}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-mono">{price > 0 ? price.toLocaleString('fa-IR') : '-'}</td>
                        <td className="p-2 text-center font-mono font-bold">{totalPrice > 0 ? totalPrice.toLocaleString('fa-IR') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4 Signatures */}
            <div className="grid grid-cols-4 gap-4 pt-12 border-t border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <div className="font-bold text-slate-700">آنالیزور / درخواست‌کننده</div>
                <div className="text-slate-400">{printOfficialVoucher.requestedBy}</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">انباردار مبدا (مرکزی)</div>
                <div className="text-slate-400">{printOfficialVoucher.dispatchedBy || '-'}</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">راننده و متصدی حمل</div>
                <div className="text-slate-400">{printOfficialVoucher.handlerName}</div>
              </div>
              <div className="space-y-8">
                <div className="font-bold text-slate-700">انباردار تحویل‌گیرنده مقصد</div>
                <div className="text-slate-400">{printOfficialVoucher.receivedBy || '-'}</div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setPrintOfficialVoucher(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                بستن
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                پرینت حواله رسمی انتقال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
