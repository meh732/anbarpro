import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Warehouse } from '../types';
import { 
  Warehouse as WarehouseIcon, Plus, Building2, Layers, AlertCircle, 
  ShieldAlert, CheckCircle2, X, Pencil, Trash2, FolderTree, Tag,
  ChevronRight, ChevronDown, Network, HelpCircle
} from 'lucide-react';

export const WarehousesView: React.FC = () => {
  const { warehouses, items, inventory, addWarehouse, updateWarehouse, deleteWarehouse, language, t, hasActionPermission } = useApp();
  const isFa = language === 'fa';
  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [isAddWhModalOpen, setIsAddWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [includeChildrenInInventory, setIncludeChildrenInInventory] = useState<boolean>(true);
  
  // Tree Collapsed State (map of warehouseId -> boolean)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const [whFormData, setWhFormData] = useState({
    code: '',
    name: '',
    group: 'انبارهای اصلی',
    subGroup: 'مواد اولیه و قطعات',
    description: '',
    manager: '',
    location: '',
    isQuarantine: false,
    isScrap: false,
    isFinishedGoods: false,
    parentId: '',
  });

  const handleOpenAdd = () => {
    setEditingWh(null);
    setWhFormData({
      code: `WH-${100 + warehouses.length + 1}`,
      name: '',
      group: 'انبارهای اصلی',
      subGroup: 'مواد اولیه و قطعات',
      description: '',
      manager: 'مهندس حسینی',
      location: 'سالن شماره ۳',
      isQuarantine: false,
      isScrap: false,
      isFinishedGoods: false,
      parentId: '',
    });
    setIsAddWhModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingWh(wh);
    setWhFormData({
      code: wh.code,
      name: wh.name,
      group: wh.group || 'انبارهای اصلی',
      subGroup: wh.subGroup || 'عمومی',
      description: wh.description,
      manager: wh.manager,
      location: wh.location,
      isQuarantine: !!wh.isQuarantine,
      isScrap: !!wh.isScrap,
      isFinishedGoods: !!wh.isFinishedGoods,
      parentId: wh.parentId || '',
    });
    setIsAddWhModalOpen(true);
  };

  const handleDeleteWarehouse = (wh: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    const childWhs = warehouses.filter(w => w.parentId === wh.id);
    if (childWhs.length > 0) {
      alert(
        isFa 
          ? `امکان حذف این انبار وجود ندارد زیرا دارای ${childWhs.length} زیرمجموعه فعال است. ابتدا زیرمجموعه‌ها را انتقال داده یا حذف کنید.`
          : `Cannot delete this warehouse because it has ${childWhs.length} sub-warehouses. Please reassign or delete them first.`
      );
      return;
    }

    const hasItems = inventory.some(i => i.warehouseId === wh.id && i.quantity > 0);
    const confirmMessage = hasItems
      ? `هشدار: انبار "${wh.name}" دارای موجودی کالا می‌باشد!\nآیا از حذف کامل این انبار اطمینان دارید؟`
      : `آیا از حذف انبار "${wh.name}" اطمینان دارید؟`;

    if (window.confirm(confirmMessage)) {
      deleteWarehouse(wh.id);
      if (selectedWarehouseId === wh.id) {
        setSelectedWarehouseId('ALL');
      }
    }
  };

  const handleSubmitWh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whFormData.name) return;

    const finalData = {
      ...whFormData,
      parentId: whFormData.parentId === '' ? undefined : whFormData.parentId
    };

    if (editingWh) {
      updateWarehouse(editingWh.id, finalData);
    } else {
      addWarehouse(finalData);
    }
    setIsAddWhModalOpen(false);
  };

  // Helper to find descendants (recursively)
  const getDescendantWarehouseIds = (whId: string, allWhs: Warehouse[]): string[] => {
    const ids: string[] = [whId];
    const children = allWhs.filter(w => w.parentId === whId);
    children.forEach(child => {
      ids.push(...getDescendantWarehouseIds(child.id, allWhs));
    });
    return ids;
  };

  // Check if a parent selection is circular
  const isCircularReference = (parentCandidateId: string, currentWhId: string): boolean => {
    if (parentCandidateId === currentWhId) return true;
    let parent = warehouses.find(w => w.id === parentCandidateId);
    while (parent) {
      if (parent.parentId === currentWhId) return true;
      parent = warehouses.find(w => w.id === parent.parentId);
    }
    return false;
  };

  // Stats calculation (recursive)
  const warehouseStats = useMemo(() => {
    return warehouses.map(wh => {
      // Get all child/grandchild warehouses
      const descendantIds = getDescendantWarehouseIds(wh.id, warehouses);
      const whInv = inventory.filter(i => descendantIds.includes(i.warehouseId));
      
      let totalPieces = 0;
      let totalValue = 0;
      const uniqueItemsSet = new Set<string>();

      whInv.forEach(inv => {
        if (inv.quantity > 0) {
          uniqueItemsSet.add(inv.itemId);
          totalPieces += inv.quantity;
          const item = items.find(i => i.id === inv.itemId);
          if (item) totalValue += inv.quantity * item.unitPrice;
        }
      });

      return {
        ...wh,
        itemTypesCount: uniqueItemsSet.size,
        totalPieces,
        totalValue,
        directChildrenCount: warehouses.filter(w => w.parentId === wh.id).length
      };
    });
  }, [warehouses, inventory, items]);

  // Determine which warehouse IDs to fetch inventory for based on selection
  const selectedWhIds = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return [];
    if (includeChildrenInInventory) {
      return getDescendantWarehouseIds(selectedWarehouseId, warehouses);
    }
    return [selectedWarehouseId];
  }, [selectedWarehouseId, warehouses, includeChildrenInInventory]);

  // Filter inventory items based on selected warehouse(s)
  const filteredInventory = useMemo(() => {
    return inventory.filter(inv => {
      if (selectedWarehouseId === 'ALL') return inv.quantity > 0;
      return selectedWhIds.includes(inv.warehouseId) && inv.quantity > 0;
    });
  }, [inventory, selectedWarehouseId, selectedWhIds]);

  // Group inventory items by Item (Summing up quantities across warehouses in query)
  const aggregatedInventory = useMemo(() => {
    const map: Record<string, { itemId: string; quantity: number; reservedQuantity: number; warehousesNames: string[]; lastUpdated: string }> = {};
    
    filteredInventory.forEach(inv => {
      const wh = warehouses.find(w => w.id === inv.warehouseId);
      const whName = wh ? wh.name : '';
      if (!map[inv.itemId]) {
        map[inv.itemId] = {
          itemId: inv.itemId,
          quantity: 0,
          reservedQuantity: 0,
          warehousesNames: [],
          lastUpdated: inv.lastUpdated
        };
      }
      map[inv.itemId].quantity += inv.quantity;
      map[inv.itemId].reservedQuantity += inv.reservedQuantity;
      if (whName && !map[inv.itemId].warehousesNames.includes(whName)) {
        map[inv.itemId].warehousesNames.push(whName);
      }
    });

    return Object.values(map);
  }, [filteredInventory, warehouses]);

  // Separate warehouses to root (no parent) and children
  const rootWarehouses = useMemo(() => warehouses.filter(w => !w.parentId), [warehouses]);

  const toggleCollapseNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Render a single warehouse tree node recursively
  const renderWarehouseTreeNode = (wh: Warehouse, level: number = 0) => {
    const stats = warehouseStats.find(s => s.id === wh.id);
    const children = warehouses.filter(w => w.parentId === wh.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodes[wh.id] || false;
    const isSelected = selectedWarehouseId === wh.id;

    return (
      <div key={wh.id} className="space-y-1">
        <div
          onClick={() => setSelectedWarehouseId(selectedWarehouseId === wh.id ? 'ALL' : wh.id)}
          style={{ paddingRight: `${level * 20 + 12}px` }}
          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
            isSelected
              ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500 text-indigo-950'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          {/* Connector guide line */}
          {level > 0 && (
            <div 
              className="absolute right-0 top-0 bottom-0 border-r-2 border-slate-100" 
              style={{ right: `${(level - 1) * 20 + 20}px` }}
            />
          )}

          <div className="flex items-center gap-2.5 z-10">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapseNode(wh.id, e)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRight className={`w-4 h-4 transform ${isFa ? 'rotate-180' : ''}`} />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              </div>
            )}

            <WarehouseIcon className={`w-4.5 h-4.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
            
            <div className="space-y-0.5">
              <div className="flex items-center flex-wrap gap-1.5">
                <strong className="text-xs font-bold">{wh.name}</strong>
                <span className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                  {wh.code}
                </span>
                {wh.isQuarantine && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1 rounded">قرنطینه</span>}
                {wh.isScrap && <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-1 rounded">ضایعات</span>}
                {wh.isFinishedGoods && <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 rounded">محصول نهایی</span>}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {isFa 
                  ? `تنوع: ${stats?.itemTypesCount.toLocaleString('fa-IR')} کالا | مجموع: ${stats?.totalPieces.toLocaleString('fa-IR')} واحد | ارزش: ${stats?.totalValue.toLocaleString('fa-IR')} تومان`
                  : `Variety: ${stats?.itemTypesCount} | Total: ${stats?.totalPieces} | Value: $${stats?.totalValue}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 z-10">
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full mr-2 hidden md:inline">
              {isFa ? 'مسئول:' : 'Manager:'} {wh.manager || 'نامشخص'}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => handleOpenEdit(wh, e)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="ویرایش انبار"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={(e) => handleDeleteWarehouse(wh, e)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="حذف انبار"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-1">
            {children.map(child => renderWarehouseTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-indigo-600" />
            {t('warehousesTitle', 'مدیریت و مهندسی ساختار درختی انبارها')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('warehousesSubtitle', 'تعریف نامحدود انبارها، انبارک‌ها، سالن‌ها و قفسه‌ها به صورت سلسله‌مراتب درختی نامحدود همراه تجمیع هوشمند موجودی')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'tree'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{isFa ? 'نمای درختی' : 'Tree View'}</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isFa ? 'نمای کارت‌ها' : 'Card View'}</span>
            </button>
          </div>

          {canAdd && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {isFa ? 'ایجاد انبار / زیرانبار جدید' : 'Create Warehouse / Sub-warehouse'}
            </button>
          )}
        </div>
      </div>

      {/* Main Layout depending on View Mode */}
      {viewMode === 'tree' ? (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-3xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">{isFa ? 'چیدمان درختی سلسه‌مراتب انبارداری' : 'Hierarchical Warehouse Directory'}</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-bold bg-white border border-slate-200 px-3 py-1 rounded-full">
              {isFa ? `${warehouses.length} سلول / انبار کل` : `${warehouses.length} Total Units`}
            </span>
          </div>

          {rootWarehouses.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl">
              <p className="text-xs text-slate-500 font-bold">{isFa ? 'هیچ انباری تعریف نشده است.' : 'No warehouses defined yet.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rootWarehouses.map(wh => renderWarehouseTreeNode(wh, 0))}
            </div>
          )}
        </div>
      ) : (
        /* Original Warehouse Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {warehouseStats.map(wh => (
            <div
              key={wh.id}
              onClick={() => setSelectedWarehouseId(wh.id === selectedWarehouseId ? 'ALL' : wh.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                selectedWarehouseId === wh.id 
                  ? 'bg-indigo-50/50 border-indigo-500 shadow-2xs ring-1 ring-indigo-500' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {wh.code}
                    </span>
                    {wh.isQuarantine && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                        {isFa ? 'قرنطینه' : 'Quarantine'}
                      </span>
                    )}
                    {wh.isScrap && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-medium">
                        {isFa ? 'ضایعات' : 'Scrap'}
                      </span>
                    )}
                    {wh.isFinishedGoods && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                        {isFa ? 'محصول نهایی' : 'Finished Goods'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">{wh.name}</h3>
                  {wh.parentId && (
                    <div className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold w-fit">
                      {isFa ? `زیرمجموعه: ${warehouses.find(w => w.id === wh.parentId)?.name}` : `Child of: ${warehouses.find(w => w.id === wh.parentId)?.name}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      title="ویرایش انبار"
                      onClick={(e) => handleOpenEdit(wh, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title="حذف انبار"
                      onClick={(e) => handleDeleteWarehouse(wh, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Group and SubGroup Badges */}
              <div className="flex flex-wrap items-center gap-1 mb-2 text-[10px]">
                <span className="bg-indigo-50/80 text-indigo-900 font-bold px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                  <FolderTree className="w-3 h-3 text-indigo-600" />
                  {wh.group || 'گروه عمومی'}
                </span>
                {wh.subGroup && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    {wh.subGroup}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px] mb-3">{wh.description}</p>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isFa ? 'تنوع اقلام (تجمیعی)' : 'Item Variety'}</span>
                  <strong className="text-slate-800 font-mono">{isFa ? `${wh.itemTypesCount.toLocaleString('fa-IR')} کالا` : `${wh.itemTypesCount.toLocaleString('en-US')} Items`}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isFa ? 'ارزش تقریبی' : 'Value'}</span>
                  <strong className="text-indigo-600 font-mono text-[11px]">{isFa ? `${wh.totalValue.toLocaleString('fa-IR')} تومان` : `$${wh.totalValue.toLocaleString('en-US')}`}</strong>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between">
                <span>{isFa ? 'مسئول:' : 'Manager:'} <strong className="text-slate-700">{wh.manager}</strong></span>
                <span>{wh.location}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory Table Filtered by Warehouse */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-indigo-600" />
              <span>{isFa ? 'گزارش تجمیعی موجودی فیزیکی و رزرو در سلسله‌مراتب' : 'Physical & Reserved Stock Hierarchy Report'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedWarehouseId === 'ALL' 
                ? (isFa ? 'نمایش جمع کل موجودی کارخانه و انبارها' : 'Displaying complete factory aggregate stock') 
                : (isFa ? `در حال نمایش انبار: ${warehouses.find(w => w.id === selectedWarehouseId)?.name}` : `Viewing Warehouse: ${warehouses.find(w => w.id === selectedWarehouseId)?.name}`)
              }
            </p>
          </div>

          {selectedWarehouseId !== 'ALL' && (
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeChildrenInInventory}
                  onChange={(e) => setIncludeChildrenInInventory(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                />
                <span>{isFa ? 'شامل موجودی زیرانبارها و قفسه‌ها' : 'Include sub-warehouses stock'}</span>
              </label>
              <button
                onClick={() => setSelectedWarehouseId('ALL')}
                className="text-indigo-600 hover:underline font-extrabold"
              >
                {isFa ? 'پاک کردن فیلتر' : 'Clear Filter'}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className={`w-full text-xs text-slate-700 ${isFa ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3">{isFa ? 'محل فیزیکی استقرار کالا' : 'Warehouses Located'}</th>
                <th className="whitespace-nowrap p-3">{t('itemCode', 'کد کالا')}</th>
                <th className="whitespace-nowrap p-3">{t('itemName', 'نام قطعه / کالا')}</th>
                <th className="whitespace-nowrap p-3">{t('group', 'گروه کالا')}</th>
                <th className="whitespace-nowrap p-3">{isFa ? 'مجموع موجودی فیزیکی' : 'Physical Stock'}</th>
                <th className="whitespace-nowrap p-3">{isFa ? 'کل رزرو پروژه‌ها' : 'Reserved'}</th>
                <th className="whitespace-nowrap p-3">{isFa ? 'موجود قابل مصرف' : 'Available'}</th>
                <th className="whitespace-nowrap p-3">{isFa ? 'ارزش کل موجودی' : 'Total Value'}</th>
                <th className="whitespace-nowrap p-3">{isFa ? 'آخرین ثبت گردش' : 'Last Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {isFa ? 'هیچ کالایی در انبار انتخاب شده یافت نشد.' : 'No stock found in selected warehouse.'}
                  </td>
                </tr>
              ) : (
                aggregatedInventory.map((inv, idx) => {
                  const item = items.find(i => i.id === inv.itemId);
                  if (!item) return null;

                  const available = Math.max(0, inv.quantity - inv.reservedQuantity);
                  const totalValue = inv.quantity * item.unitPrice;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap p-3 font-medium text-slate-700 max-w-[200px] truncate" title={inv.warehousesNames.join('، ')}>
                        {inv.warehousesNames.join('، ') || (isFa ? 'نامشخص' : 'Unknown')}
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-indigo-600">{item.code}</td>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-800">{item.name}</td>
                      <td className="whitespace-nowrap p-3 text-slate-500">{item.group}</td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-slate-800">
                        {inv.quantity.toLocaleString('fa-IR')} {item.unit}
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono text-amber-600 font-medium">
                        {inv.reservedQuantity.toLocaleString('fa-IR')} {item.unit}
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-emerald-600">
                        {available.toLocaleString('fa-IR')} {item.unit}
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono text-slate-800">
                        {totalValue.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400">تومان</span>
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono text-[11px] text-slate-400">{inv.lastUpdated}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Warehouse */}
      {isAddWhModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {editingWh ? 'ویرایش مشخصات انبار سلسله‌مراتبی' : 'تعریف انبار / سلول جدید'}
              </h3>
              <button onClick={() => setIsAddWhModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWh} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Parent Warehouse Selection (Tree Builder) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  <span>انبار مادر (سلسله‌مراتب مکان)*</span>
                </label>
                <select
                  value={whFormData.parentId}
                  onChange={(e) => setWhFormData({ ...whFormData, parentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500 font-semibold"
                >
                  <option value="">{isFa ? 'انبار اصلی (بدون والد - ریشه)' : 'Root Warehouse (No parent)'}</option>
                  {warehouses
                    .filter(w => !editingWh || (w.id !== editingWh.id && !isCircularReference(w.id, editingWh.id)))
                    .map(w => (
                      <option key={w.id} value={w.id}>
                        {w.parentId ? ' ↳ ' : ''} {w.name} ({w.code})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isFa 
                    ? 'با انتخاب انبار مادر، این مورد به عنوان زیرمجموعه (مانند سالن، راهرو، قفسه یا باجه) قرار خواهد گرفت.'
                    : 'Selecting a parent nests this warehouse beneath it in the tree hierarchy.'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">کد انبار*</label>
                  <input
                    type="text"
                    required
                    value={whFormData.code}
                    onChange={(e) => setWhFormData({ ...whFormData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام انبار / سلول*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: قفسه SMD-A"
                    value={whFormData.name}
                    onChange={(e) => setWhFormData({ ...whFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">گروه انبار*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: انبارهای اصلی، انبارهای تولید"
                    value={whFormData.group}
                    onChange={(e) => setWhFormData({ ...whFormData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">زیرگروه انبار</label>
                  <input
                    type="text"
                    placeholder="مثال: قطعات SMD، بردهای نیمه‌ساخته"
                    value={whFormData.subGroup}
                    onChange={(e) => setWhFormData({ ...whFormData, subGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام مسئول انبار</label>
                <input
                  type="text"
                  value={whFormData.manager}
                  onChange={(e) => setWhFormData({ ...whFormData, manager: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موقعیت فیزیکی / سوله</label>
                <input
                  type="text"
                  value={whFormData.location}
                  onChange={(e) => setWhFormData({ ...whFormData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات انبار</label>
                <textarea
                  rows={2}
                  value={whFormData.description}
                  onChange={(e) => setWhFormData({ ...whFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whFormData.isQuarantine}
                    onChange={(e) => setWhFormData({ ...whFormData, isQuarantine: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>انبار قرنطینه است</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whFormData.isScrap}
                    onChange={(e) => setWhFormData({ ...whFormData, isScrap: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>انبار ضایعات است</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whFormData.isFinishedGoods}
                    onChange={(e) => setWhFormData({ ...whFormData, isFinishedGoods: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>انبار محصول نهایی است</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddWhModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-2xs"
                >
                  ذخیره انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
