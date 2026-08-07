import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Item, ItemType, ItemGroup } from '../types';
import { 
  Plus, Search, Filter, Edit, Trash2, QrCode, Boxes, 
  AlertCircle, CheckCircle2, FileSpreadsheet, X, FolderTree, 
  Tag, ChevronRight, Layers, Check, Eye, Printer, Building2,
  MapPin, Barcode, FileText, ShieldCheck, ChevronDown, Network
} from 'lucide-react';

const BarcodeVisual: React.FC<{ code: string; name?: string; location?: string }> = ({ code, name, location }) => {
  const bars = useMemo(() => {
    let pattern = [];
    const hashStr = code || '123456789';
    for (let i = 0; i < hashStr.length; i++) {
      const charCode = hashStr.charCodeAt(i);
      pattern.push((charCode % 3) + 1);
      pattern.push(((charCode * 2) % 2) + 1);
      pattern.push(((charCode * 5) % 3) + 1);
    }
    return pattern;
  }, [code]);

  return (
    <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-xl border border-slate-300 shadow-2xs text-center select-none">
      <div className="text-[10px] font-bold text-slate-500 mb-1">کد ردیابی و لیبل بارکد کالا</div>
      <div className="flex items-end justify-center h-14 space-x-0.5 space-x-reverse px-3 py-1.5 bg-white border border-slate-200 rounded">
        <div className="w-1 h-full bg-black"></div>
        <div className="w-0.5 h-full bg-white"></div>
        <div className="w-1 h-full bg-black"></div>
        {bars.map((w, idx) => (
          <React.Fragment key={idx}>
            <div className={`h-full bg-black`} style={{ width: `${w * 1.5}px` }}></div>
            <div className={`h-full bg-white`} style={{ width: `${((idx % 2) + 1) * 1.2}px` }}></div>
          </React.Fragment>
        ))}
        <div className="w-1 h-full bg-black"></div>
        <div className="w-0.5 h-full bg-white"></div>
        <div className="w-1 h-full bg-black"></div>
      </div>
      <div className="font-mono text-xs font-extrabold tracking-widest text-slate-900 mt-1">
        *{code}*
      </div>
      {name && <div className="text-[11px] font-extrabold text-slate-800 truncate max-w-[220px] mt-0.5">{name}</div>}
      {location && <div className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">موقعیت قفسه: {location}</div>}
    </div>
  );
};

export const ItemsView: React.FC = () => {
  const { 
    items, itemGroups, inventory, warehouses, addItem, updateItem, deleteItem, 
    addItemGroup, updateItemGroup, deleteItemGroup,
    searchQuery, setSearchQuery, language, t, hasActionPermission,
    traceabilityEvents
  } = useApp();
  
  const isFa = language === 'fa';
  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');
  
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'kardex'>('details');
  const [kardexWarehouseId, setKardexWarehouseId] = useState<string>('ALL');
  const [printableLabelItem, setPrintableLabelItem] = useState<Item | null>(null);
  const [printableCatalogItem, setPrintableCatalogItem] = useState<Item | null>(null);

  const handleCloseViewing = () => {
    setViewingItem(null);
    setActiveModalTab('details');
    setKardexWarehouseId('ALL');
  };

  const itemKardexLines = useMemo(() => {
    if (!viewingItem) return [];
    
    // Sort events by timestamp ascending for proper running balance calculation
    const sortedEvents = [...traceabilityEvents]
      .filter(e => e.itemId === viewingItem.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    let runningBal = 0;
    const lines: Array<{
      event: typeof traceabilityEvents[0];
      inQty: number;
      outQty: number;
      balance: number;
      detailsText: string;
      warehouseText: string;
    }> = [];
    
    sortedEvents.forEach(ev => {
      // Filter by warehouse if selected
      if (kardexWarehouseId !== 'ALL') {
        if (ev.sourceWarehouseId !== kardexWarehouseId && ev.targetWarehouseId !== kardexWarehouseId) {
          return;
        }
      }
      
      let inQty = 0;
      let outQty = 0;
      const detailsText = ev.details || '';
      
      if (kardexWarehouseId === 'ALL') {
        if (ev.eventType === 'StockIn' || ev.eventType === 'ProductionOutput') {
          inQty = ev.quantity;
        } else if (ev.eventType === 'StockOut' || ev.eventType === 'Scrap' || ev.eventType === 'ProjectConsumption') {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+') || ev.quantity > 0) {
            inQty = ev.quantity;
          } else {
            outQty = ev.quantity;
          }
        } else if (ev.eventType === 'Transfer') {
          // System-wide, transfer is net 0, but show transfer details
          inQty = 0;
          outQty = 0;
        }
      } else {
        // Specific warehouse is filtered
        if (ev.targetWarehouseId === kardexWarehouseId) {
          inQty = ev.quantity;
        } else if (ev.sourceWarehouseId === kardexWarehouseId) {
          outQty = ev.quantity;
        } else if (ev.eventType === 'Adjustment') {
          if (ev.details.includes('+')) {
            inQty = ev.quantity;
          } else {
            outQty = ev.quantity;
          }
        }
      }
      
      runningBal = runningBal + inQty - outQty;
      
      let whText = '';
      const srcWh = warehouses.find(w => w.id === ev.sourceWarehouseId)?.name || ev.sourceWarehouseId;
      const dstWh = warehouses.find(w => w.id === ev.targetWarehouseId)?.name || ev.targetWarehouseId;
      
      if (ev.eventType === 'Transfer') {
        whText = `${srcWh || 'نامشخص'} ➔ ${dstWh || 'نامشخص'}`;
      } else if (ev.targetWarehouseId) {
        whText = dstWh || '';
      } else if (ev.sourceWarehouseId) {
        whText = srcWh || '';
      }
      
      lines.push({
        event: ev,
        inQty,
        outQty,
        balance: runningBal,
        detailsText,
        warehouseText: whText
      });
    });
    
    // Reverse so the newest transaction is at the top of the table
    return [...lines].reverse();
  }, [viewingItem, traceabilityEvents, kardexWarehouseId, warehouses]);

  // Group Management State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormCode, setGroupFormCode] = useState('');
  const [groupFormDesc, setGroupFormDesc] = useState('');
  const [groupFormSubgroups, setGroupFormSubgroups] = useState<string[]>([]);
  const [groupFormParentId, setGroupFormParentId] = useState('');
  const [newSubGroupInput, setNewSubGroupInput] = useState('');

  // Selected combined hierarchical Category ID in the Item Form
  const [selectedCategoryValue, setSelectedCategoryValue] = useState<string>('');

  // Item Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: '',
    subGroup: '',
    unit: 'عدد',
    barcode: '',
    description: '',
    minStock: 100,
    maxStock: 5000,
    itemType: 'Component' as ItemType,
    unitPrice: 50000,
    locationInRack: 'A-01-01',
  });

  const typeLabels: Record<ItemType, string> = {
    RawMaterial: isFa ? 'مواد اولیه' : 'Raw Materials',
    Component: isFa ? 'قطعه الکترونیک' : 'Electronics Component',
    SemiFinished: isFa ? 'برد نیمه ساخته' : 'Semi-finished Board',
    Finished: isFa ? 'محصول نهایی' : 'Finished Product',
    Tool: isFa ? 'ابزار' : 'Tooling',
    Consumable: isFa ? 'مصرفی' : 'Consumable',
  };

  const typeBadges: Record<ItemType, string> = {
    RawMaterial: 'bg-blue-50 text-blue-700 border-blue-200',
    Component: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SemiFinished: 'bg-purple-50 text-purple-700 border-purple-200',
    Finished: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Tool: 'bg-amber-50 text-amber-700 border-amber-200',
    Consumable: 'bg-pink-50 text-pink-700 border-pink-200',
  };

  // Helper to build list of itemGroups in recursive tree order for dropdown selects
  const getHierarchicalCategoryOptions = (allGroups: ItemGroup[]): { id: string; name: string; level: number; fullPath: string }[] => {
    const list: { id: string; name: string; level: number; fullPath: string }[] = [];
    
    const traverse = (parentId: string | undefined, level: number, path: string) => {
      const children = allGroups.filter(g => g.parentId === parentId);
      children.forEach(child => {
        const currentPath = path ? `${path} > ${child.name}` : child.name;
        list.push({
          id: child.id,
          name: child.name,
          level,
          fullPath: currentPath
        });
        
        // Traverse child item groups
        traverse(child.id, level + 1, currentPath);
        
        // Backward-compatibility string-based subGroups representation
        if (child.subGroups && child.subGroups.length > 0) {
          child.subGroups.forEach(subName => {
            const alreadyReal = allGroups.some(g => g.parentId === child.id && g.name === subName);
            if (!alreadyReal && subName !== 'عمومی') {
              list.push({
                id: `${child.id}::sub::${subName}`,
                name: subName,
                level: level + 1,
                fullPath: `${currentPath} > ${subName}`
              });
            }
          });
        }
      });
    };
    
    // Find top-level root groups (no parent or parent is missing)
    const rootGroups = allGroups.filter(g => !g.parentId || !allGroups.some(p => p.id === g.parentId));
    
    rootGroups.forEach(root => {
      list.push({
        id: root.id,
        name: root.name,
        level: 0,
        fullPath: root.name
      });
      traverse(root.id, 1, root.name);
      
      // Backward-compatibility string subgroups for root categories
      if (root.subGroups && root.subGroups.length > 0) {
        root.subGroups.forEach(subName => {
          const alreadyReal = allGroups.some(g => g.parentId === root.id && g.name === subName);
          if (!alreadyReal && subName !== 'عمومی') {
            list.push({
              id: `${root.id}::sub::${subName}`,
              name: subName,
              level: 1,
              fullPath: `${root.name} > ${subName}`
            });
          }
        });
      }
    });
    
    return list;
  };

  const isCircularReferenceGroup = (parentCandidateId: string, currentGroupId: string): boolean => {
    if (parentCandidateId === currentGroupId) return true;
    let parent = itemGroups.find(g => g.id === parentCandidateId);
    while (parent) {
      if (parent.parentId === currentGroupId) return true;
      parent = itemGroups.find(g => g.id === parent.parentId);
    }
    return false;
  };

  // Filter items matching search and selected category
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const query = (searchQuery || '').toLowerCase();
      const matchesSearch = 
        (it.name || '').toLowerCase().includes(query) ||
        (it.code || '').toLowerCase().includes(query) ||
        (it.barcode || '').includes(searchQuery || '') ||
        (it.group || '').toLowerCase().includes(query) ||
        (it.subGroup || '').toLowerCase().includes(query);
      
      const matchesType = selectedType === 'ALL' || it.itemType === selectedType;
      
      let matchesGroup = true;
      if (selectedGroup !== 'ALL') {
        // Match either group name or subGroup name for recursive filtering flexibility
        matchesGroup = it.group === selectedGroup || it.subGroup === selectedGroup;
      }

      return matchesSearch && matchesType && matchesGroup;
    });
  }, [items, searchQuery, selectedType, selectedGroup]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    const opts = getHierarchicalCategoryOptions(itemGroups);
    let defaultGroup = 'قطعات الکترونیک';
    let defaultSub = 'میکروکنترلر';
    let defaultCatId = '';
    
    if (opts.length > 0) {
      defaultCatId = opts[0].id;
      const parts = opts[0].fullPath.split(' > ');
      defaultGroup = parts[0];
      defaultSub = parts[parts.length - 1];
    }
    
    setSelectedCategoryValue(defaultCatId);
    setFormData({
      code: `E-COMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      group: defaultGroup,
      subGroup: defaultSub,
      unit: 'عدد',
      barcode: `62600${Math.floor(10000000 + Math.random() * 90000000)}`,
      description: '',
      minStock: 100,
      maxStock: 5000,
      itemType: 'Component',
      unitPrice: 50000,
      locationInRack: 'A-01-01',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    
    const opts = getHierarchicalCategoryOptions(itemGroups);
    const matchedOpt = opts.find(opt => {
      const parts = opt.fullPath.split(' > ');
      return parts[0] === item.group && parts[parts.length - 1] === item.subGroup;
    });
    
    setSelectedCategoryValue(matchedOpt ? matchedOpt.id : '');
    setFormData({
      code: item.code,
      name: item.name,
      group: item.group,
      subGroup: item.subGroup,
      unit: item.unit,
      barcode: item.barcode,
      description: item.description,
      minStock: item.minStock,
      maxStock: item.maxStock,
      itemType: item.itemType,
      unitPrice: item.unitPrice,
      locationInRack: item.locationInRack || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingItem) {
      updateItem(editingItem.id, formData);
    } else {
      addItem(formData);
    }
    setIsAddModalOpen(false);
  };

  // Group Management Handlers
  const handleOpenGroupModal = () => {
    setEditingGroupId(null);
    setGroupFormName('');
    setGroupFormCode(`GRP-${Math.floor(10 + Math.random() * 90)}`);
    setGroupFormDesc('');
    setGroupFormSubgroups(['عمومی']);
    setGroupFormParentId('');
    setNewSubGroupInput('');
    setIsGroupModalOpen(true);
  };

  const handleStartEditGroup = (group: ItemGroup) => {
    setEditingGroupId(group.id);
    setGroupFormName(group.name);
    setGroupFormCode(group.code || '');
    setGroupFormDesc(group.description || '');
    setGroupFormSubgroups([...group.subGroups]);
    setGroupFormParentId(group.parentId || '');
    setNewSubGroupInput('');
  };

  const handleAddSubgroupChip = () => {
    if (!newSubGroupInput.trim()) return;
    if (!groupFormSubgroups.includes(newSubGroupInput.trim())) {
      setGroupFormSubgroups(prev => [...prev, newSubGroupInput.trim()]);
    }
    setNewSubGroupInput('');
  };

  const handleRemoveSubgroupChip = (sub: string) => {
    setGroupFormSubgroups(prev => prev.filter(s => s !== sub));
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormName.trim()) return;

    const dataToSave = {
      name: groupFormName.trim(),
      code: groupFormCode.trim(),
      description: groupFormDesc.trim(),
      parentId: groupFormParentId === '' ? undefined : groupFormParentId,
      subGroups: groupFormSubgroups.length > 0 ? groupFormSubgroups : ['عمومی']
    };

    if (editingGroupId) {
      updateItemGroup(editingGroupId, dataToSave);
    } else {
      addItemGroup(dataToSave);
    }

    // Reset Group Form
    setEditingGroupId(null);
    setGroupFormName('');
    setGroupFormCode(`GRP-${Math.floor(10 + Math.random() * 90)}`);
    setGroupFormDesc('');
    setGroupFormSubgroups(['عمومی']);
    setGroupFormParentId('');
    setNewSubGroupInput('');
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    // Check if group has sub-categories
    const hasChildren = itemGroups.some(g => g.parentId === groupId);
    if (hasChildren) {
      alert(isFa ? 'امکان حذف این گروه وجود ندارد زیرا دارای زیرگروه‌های فعال سلسله‌مراتبی می‌باشد.' : 'Cannot delete group because it has active nested sub-categories.');
      return;
    }

    const itemsInGroup = items.filter(i => i.group === groupName || i.subGroup === groupName);
    if (itemsInGroup.length > 0) {
      alert(`امکان حذف این گروه وجود ندارد، زیرا تعداد ${itemsInGroup.length} کالا در این گروه تعریف شده‌اند.`);
      return;
    }
    if (confirm(`آیا از حذف گروه کالای "${groupName}" اطمینان دارید؟`)) {
      deleteItemGroup(groupId);
      if (editingGroupId === groupId) {
        setEditingGroupId(null);
        setGroupFormName('');
        setGroupFormParentId('');
      }
    }
  };

  // Render a single category node recursively inside the modal list
  const renderCategoryTreeNode = (grp: ItemGroup, level: number = 0) => {
    const children = itemGroups.filter(g => g.parentId === grp.id);
    const itemCount = items.filter(i => i.group === grp.name || i.subGroup === grp.name).length;
    
    return (
      <div key={grp.id} className="space-y-1">
        <div 
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-indigo-200 transition-all rounded-xl"
          style={{ marginRight: `${level * 20}px` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <div>
              <span className="font-bold text-slate-900 text-xs">{grp.name}</span>
              <span className="text-[10px] text-slate-400 font-mono mr-2">({grp.code})</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200 font-bold">
              {itemCount.toLocaleString('fa-IR')} کالا
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStartEditGroup(grp)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="ویرایش گروه"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(grp.id, grp.name)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="حذف گروه"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Render legacy string subgroups as indented list items if present and not created as real categories */}
        {grp.subGroups && grp.subGroups.length > 0 && (
          <div className="space-y-1">
            {grp.subGroups.map(sub => {
              if (sub === 'عمومی') return null;
              const isRealChild = itemGroups.some(g => g.parentId === grp.id && g.name === sub);
              if (isRealChild) return null;
              
              const subItemCount = items.filter(i => i.subGroup === sub).length;
              return (
                <div 
                  key={sub} 
                  className="flex items-center justify-between p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl"
                  style={{ marginRight: `${(level + 1) * 20}px` }}
                >
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                    <span className="text-xs">{sub}</span>
                    <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-medium">زیرشاخه کالا</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full font-mono">
                    {subItemCount} کالا
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {children.length > 0 && (
          <div className="space-y-1 mt-1 border-r-2 border-slate-100 mr-2">
            {children.map(child => renderCategoryTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            {t('itemsTitle', 'ساختار و کاتالوگ جامع قطعات و محصولات الکترونیکی')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('itemsSubtitle', 'تعریف مواد اولیه، قطعات DIP/SMD، گروه و زیرگروه‌بندی کالاها به صورت سلسله‌مراتب درختی نامحدود، نیمه‌ساخته‌ها و محصولات')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenGroupModal}
            className="glass-btn-secondary !rounded-xl py-2 px-3.5"
          >
            <FolderTree className="w-4 h-4 text-indigo-600" />
            <span>مهندسی ساختار درختی کالا</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="glass-btn-primary !rounded-xl py-2 px-4"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            {t('addItem', 'تعریف کالای جدید')}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-wrap items-center gap-3 shadow-2xs">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className={`w-4 h-4 absolute ${isFa ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFa ? 'جستجو در کد، نام، بارکد، گروه یا زیرگروه...' : 'Search code, name, barcode, group...'}
            className={`w-full ${isFa ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-2xs`}
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-2xs font-semibold"
          >
            <option value="ALL">{t('allTypes', 'همه انواع کالا')}</option>
            <option value="RawMaterial">{typeLabels.RawMaterial}</option>
            <option value="Component">{typeLabels.Component}</option>
            <option value="SemiFinished">{typeLabels.SemiFinished}</option>
            <option value="Finished">{typeLabels.Finished}</option>
            <option value="Consumable">{typeLabels.Consumable}</option>
            <option value="Tool">{typeLabels.Tool}</option>
          </select>
        </div>

        {/* Hierarchical Group Filter */}
        <div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-2xs font-semibold"
          >
            <option value="ALL">{t('allGroups', 'همه شاخه‌ها و گروه‌ها (درختی)')}</option>
            {getHierarchicalCategoryOptions(itemGroups).map(opt => (
              <option key={opt.id} value={opt.name}>
                {'\u00A0'.repeat(opt.level * 4)}{opt.level > 0 ? '↳ ' : ''}{opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden animate-fadeIn">
        <div className="overflow-x-auto">
          <table className={`w-full text-xs text-slate-700 ${isFa ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3.5">{t('itemCode', 'کد کالا')}</th>
                <th className="whitespace-nowrap p-3.5">{t('itemName', 'نام کالا / قطعه')}</th>
                <th className="whitespace-nowrap p-3.5">{t('itemType', 'نوع کالا')}</th>
                <th className="whitespace-nowrap p-3.5">{t('group', 'شاخه درختی / زیرگروه')}</th>
                <th className="whitespace-nowrap p-3.5">{isFa ? 'موجودی کل' : 'Total Stock'}</th>
                <th className="whitespace-nowrap p-3.5">{isFa ? 'آستانه (حداقل - حداکثر)' : 'Min-Max Threshold'}</th>
                <th className="whitespace-nowrap p-3.5">{t('unitPrice', 'قیمت واحد')}</th>
                <th className="whitespace-nowrap p-3.5">{isFa ? 'موقعیت قفسه' : 'Rack Location'}</th>
                <th className="whitespace-nowrap p-3.5 text-center">{t('action', 'عملیات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {isFa ? 'هیچ کالایی با مشخصات جستجو شده یافت نشد.' : 'No components found matching your search.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const totalStock = inventory
                    .filter(i => i.itemId === item.id)
                    .reduce((s, c) => s + c.quantity, 0);

                  const isLow = totalStock < item.minStock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => setViewingItem(item)}>
                      <td className="whitespace-nowrap p-3.5 font-mono font-bold text-indigo-600">{item.code}</td>
                      <td className="whitespace-nowrap p-3.5">
                        <div className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{isFa ? 'بارکد:' : 'Barcode:'} {item.barcode}</div>
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeBadges[item.itemType]}`}>
                          {typeLabels[item.itemType]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{item.group}</span>
                        </div>
                        {item.subGroup && item.subGroup !== 'عمومی' && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{item.subGroup}</span>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3.5 font-mono font-bold">
                        <span className={isLow ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>
                          {isFa ? totalStock.toLocaleString('fa-IR') : totalStock.toLocaleString('en-US')} {item.unit}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3.5 font-mono text-[11px] text-slate-400">
                        {isFa ? `${item.minStock.toLocaleString('fa-IR')} تا ${item.maxStock.toLocaleString('fa-IR')}` : `${item.minStock.toLocaleString('en-US')} to ${item.maxStock.toLocaleString('en-US')}`}
                      </td>
                      <td className="whitespace-nowrap p-3.5 font-mono text-slate-800">
                        {isFa ? `${item.unitPrice.toLocaleString('fa-IR')} تومان` : `$${item.unitPrice.toLocaleString('en-US')}`}
                      </td>
                      <td className="whitespace-nowrap p-3.5 font-mono text-amber-600 text-[11px] font-medium">
                        {item.locationInRack || (isFa ? 'تعریف‌نشده' : 'N/A')}
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingItem(item)}
                            title={isFa ? 'مشاهده جزئیات، موجودی و بارکد' : 'View Item Catalog & Barcode'}
                            className="glass-btn-primary !p-1.5 !rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title={t('editItem', 'ویرایش کالا')}
                              className="glass-btn-secondary !p-1.5 !rounded-lg"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(isFa ? `آیا از حذف کالای ${item.name} اطمینان دارید؟` : `Delete item ${item.name}?`)) {
                                  deleteItem(item.id);
                                }
                              }}
                              title={t('deleteItem', 'حذف کالا')}
                              className="glass-btn-danger !p-1.5 !rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

      {/* Modal Manage Item Groups & Subgroups */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-indigo-700 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                <span>تعریف و مهندسی ساختار درختی گروه‌های کالا</span>
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1 text-xs custom-scrollbar">
              {/* Group Add / Edit Form */}
              <form onSubmit={handleSaveGroup} className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{editingGroupId ? 'ویرایش شاخه / گروه کالا' : 'تعریف شاخه یا گروه جدید کالا'}</span>
                  </h4>
                  {editingGroupId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroupId(null);
                        setGroupFormName('');
                        setGroupFormCode(`GRP-${Math.floor(10 + Math.random() * 90)}`);
                        setGroupFormSubgroups(['عمومی']);
                        setGroupFormParentId('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      لغو ویرایش (انصراف)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">نام گروه کالا*</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: خازن‌های SMD سرامیکی"
                      value={groupFormName}
                      onChange={(e) => setGroupFormName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">کد شناسایی گروه*</label>
                    <input
                      type="text"
                      required
                      value={groupFormCode}
                      onChange={(e) => setGroupFormCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Parent Category Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">گروه مادر (سلسله‌مراتب درختی)</label>
                    <select
                      value={groupFormParentId}
                      onChange={(e) => setGroupFormParentId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="">{isFa ? 'دسته اصلی (ریشه)' : 'Root Group (No parent)'}</option>
                      {itemGroups
                        .filter(g => !editingGroupId || (g.id !== editingGroupId && !isCircularReferenceGroup(g.id, editingGroupId)))
                        .map(g => (
                          <option key={g.id} value={g.id}>
                            {g.parentId ? ' ↳ ' : ''} {g.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Subgroups Builder Chips */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">زیرگروه‌های متنی این شاخه (اختیاری):</label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-xl mb-2 min-h-[42px]">
                    {groupFormSubgroups.map(sub => (
                      <span key={sub} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-[11px] font-bold border border-indigo-200">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubgroupChip(sub)}
                          className="text-indigo-400 hover:text-rose-600 mr-0.5 cursor-pointer"
                          title="حذف زیرگروه"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Subgroup Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="عنوان زیرگروه جدید..."
                      value={newSubGroupInput}
                      onChange={(e) => setNewSubGroupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubgroupChip();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubgroupChip}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">توضیحات گروه (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="توضیحات تکمیلی پیرامون نحوه انبارش یا کاربرد این گروه..."
                    value={groupFormDesc}
                    onChange={(e) => setGroupFormDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingGroupId ? 'به‌روزرسانی گروه' : 'ثبت گروه کالا'}</span>
                  </button>
                </div>
              </form>

              {/* Existing Groups Hierarchy Tree */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-indigo-600" />
                  <span>ساختار درختی شاخه‌های کالا ({itemGroups.length} شاخه و دسته)</span>
                </h4>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  {itemGroups.filter(g => !g.parentId || !itemGroups.some(p => p.id === g.parentId)).map(grp => renderCategoryTreeNode(grp, 0))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Boxes className="w-4 h-4" />
                {editingItem ? 'ویرایش مشخصات کالا' : 'تعریف کالای جدید'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">کد کالا (منحصربه‌فرد)*</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام کامل کالا / قطعه*</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: میکروکنترلر ATmega328P-AU SMD"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع کالا*</label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value as ItemType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="RawMaterial">مواد اولیه</option>
                    <option value="Component">قطعه (DIP/SMD)</option>
                    <option value="SemiFinished">نیمه ساخته</option>
                    <option value="Finished">محصول نهایی</option>
                    <option value="Consumable">مصرفی</option>
                    <option value="Tool">ابزار</option>
                  </select>
                </div>

                {/* Unified Hierarchical Category dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                    <span>شاخه درختی / زیرگروه کالا*</span>
                  </label>
                  <select
                    value={selectedCategoryValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCategoryValue(val);
                      
                      const opts = getHierarchicalCategoryOptions(itemGroups);
                      const matched = opts.find(o => o.id === val);
                      if (matched) {
                        const parts = matched.fullPath.split(' > ');
                        setFormData({
                          ...formData,
                          group: parts[0],
                          subGroup: parts[parts.length - 1]
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500 font-semibold"
                  >
                    <option value="">-- انتخاب دسته‌بندی کالا --</option>
                    {getHierarchicalCategoryOptions(itemGroups).map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {'\u00A0'.repeat(opt.level * 4)}{opt.level > 0 ? '↳ ' : ''}{opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واحد اندازه‌گیری*</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="عدد">عدد</option>
                    <option value="دستگاه">دستگاه</option>
                    <option value="رول">رول (تسمه SMD)</option>
                    <option value="قوطی">قوطی</option>
                    <option value="متر">متر</option>
                    <option value="گرم">گرم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بارکد / QR Code</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت واحد (تومان)</label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حداقل موجودی مجاز (هشدار)</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حداکثر موجودی مجاز انبار</label>
                  <input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">آدرس دقیق قفسه استقرار فیزیکی</label>
                  <input
                    type="text"
                    placeholder="مثال: A-04-12"
                    value={formData.locationInRack}
                    onChange={(e) => setFormData({ ...formData, locationInRack: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و مشخصات فنی</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-2xs cursor-pointer"
                >
                  {editingItem ? 'به‌روزرسانی کالا' : 'ثبت کالا'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Item Catalog & Card details */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <span>برگه شناسنامه فنی و هویت کالا</span>
              </h3>
              <button onClick={handleCloseViewing} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="px-5 bg-slate-50 border-b border-slate-200 flex gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab('details')}
                className={`py-3 font-bold text-xs relative cursor-pointer ${
                  activeModalTab === 'details' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                شناسنامه فنی و موجودی
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('kardex')}
                className={`py-3 font-bold text-xs relative cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'kardex' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>کاردکس گردش کالا (Stock Kardex)</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeModalTab === 'kardex' ? 'bg-indigo-100 text-indigo-800 font-extrabold' : 'bg-slate-200 text-slate-700'
                }`}>
                  {traceabilityEvents.filter(e => e.itemId === viewingItem.id).length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 text-xs touch-pan-y custom-scrollbar space-y-5">
              {activeModalTab === 'details' ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <div className="space-y-1 text-center sm:text-right">
                      <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded font-extrabold">{typeLabels[viewingItem.itemType]}</span>
                      <h4 className="font-bold text-sm text-slate-900">{viewingItem.name}</h4>
                      <p className="font-mono text-slate-400 font-bold">کد: {viewingItem.code}</p>
                    </div>

                    <div className="shrink-0">
                      <BarcodeVisual code={viewingItem.barcode || viewingItem.code} name={viewingItem.name} location={viewingItem.locationInRack} />
                    </div>
                  </div>

                  {/* Specs & Inventory Summary */}
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-400 block text-[10px] mb-0.5">گروه اصلی کالا:</span>
                      <strong className="text-slate-800 font-bold">{viewingItem.group}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-400 block text-[10px] mb-0.5">زیرگروه تخصصی:</span>
                      <strong className="text-slate-800 font-bold">{viewingItem.subGroup}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-400 block text-[10px] mb-0.5">قیمت واحد تامین:</span>
                      <strong className="text-indigo-600 font-bold font-mono">{viewingItem.unitPrice.toLocaleString('fa-IR')} تومان</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-400 block text-[10px] mb-0.5">موقعیت قفسه انبار:</span>
                      <strong className="text-amber-800 font-bold font-mono">{viewingItem.locationInRack || 'نامشخص'}</strong>
                    </div>
                  </div>

                  {/* Warehouse balances table */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span>توزیع فیزیکی موجودی در انبارها:</span>
                    </h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-[11px] text-right text-slate-700">
                        <thead className="bg-slate-50 font-bold text-slate-500">
                          <tr>
                            <th className="whitespace-nowrap p-2 border-b">نام انبار</th>
                            <th className="whitespace-nowrap p-2 border-b">موجودی فیزیکی</th>
                            <th className="whitespace-nowrap p-2 border-b">موجودی رزرو شده</th>
                            <th className="whitespace-nowrap p-2 border-b">قابل مصرف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {warehouses.map(wh => {
                            const balance = inventory.find(i => i.itemId === viewingItem.id && i.warehouseId === wh.id);
                            const qty = balance ? balance.quantity : 0;
                            const res = balance ? balance.reservedQuantity : 0;
                            const av = Math.max(0, qty - res);

                            if (qty === 0 && res === 0) return null;

                            return (
                              <tr key={wh.id} className="hover:bg-slate-50">
                                <td className="whitespace-nowrap p-2 font-bold text-slate-800">{wh.name}</td>
                                <td className="whitespace-nowrap p-2 font-mono text-slate-700 font-bold">{qty.toLocaleString('fa-IR')} {viewingItem.unit}</td>
                                <td className="whitespace-nowrap p-2 font-mono text-amber-600 font-bold">{res.toLocaleString('fa-IR')} {viewingItem.unit}</td>
                                <td className="whitespace-nowrap p-2 font-mono text-emerald-600 font-bold">{av.toLocaleString('fa-IR')} {viewingItem.unit}</td>
                              </tr>
                            );
                          })}
                          {inventory.filter(i => i.itemId === viewingItem.id).length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400 font-medium">موجودی فیزیکی این کالا صفر می‌باشد.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {viewingItem.description && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-400 block text-[10px] mb-1">توضیحات و مشخصات فنی:</span>
                      <p className="text-slate-700 leading-relaxed font-bold">{viewingItem.description}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Stock Kardex Tab */
                <div className="space-y-4 animate-fadeIn">
                  {/* Kardex Header / Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-indigo-600" />
                        <span>گردش تفصیلی تراکنش‌های کالا (کاردکس)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">مشاهده لاگ ورود، خروج، انتقالات و اصلاحات فیزیکی کالا</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-500 font-bold text-[10px] whitespace-nowrap font-sans">فیلتر انبار:</span>
                      <select
                        value={kardexWarehouseId}
                        onChange={(e) => setKardexWarehouseId(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="ALL">همه انبارها (مجموع کل شرکت)</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.id}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Indicators */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                      <span className="text-slate-400 block text-[9px] mb-0.5">کل وارده (+):</span>
                      <strong className="text-blue-700 text-xs font-mono font-extrabold">
                        {itemKardexLines.reduce((sum, line) => sum + line.inQty, 0).toLocaleString('fa-IR')} {viewingItem.unit}
                      </strong>
                    </div>
                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                      <span className="text-slate-400 block text-[9px] mb-0.5">کل صادره (-):</span>
                      <strong className="text-amber-700 text-xs font-mono font-extrabold">
                        {itemKardexLines.reduce((sum, line) => sum + line.outQty, 0).toLocaleString('fa-IR')} {viewingItem.unit}
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                      <span className="text-slate-400 block text-[9px] mb-0.5">مانده لحظه‌ای:</span>
                      <strong className="text-emerald-700 text-xs font-mono font-extrabold">
                        {(itemKardexLines[0]?.balance || 0).toLocaleString('fa-IR')} {viewingItem.unit}
                      </strong>
                    </div>
                  </div>

                  {/* Kardex Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[40vh] custom-scrollbar">
                      <table className="w-full text-[11px] text-right text-slate-700">
                        <thead className="bg-slate-50 font-bold text-slate-500 sticky top-0 border-b border-slate-200 shadow-3xs z-10">
                          <tr>
                            <th className="p-2 border-b whitespace-nowrap">#</th>
                            <th className="p-2 border-b whitespace-nowrap">تاریخ ثبت</th>
                            <th className="p-2 border-b whitespace-nowrap">نوع تراکنش</th>
                            <th className="p-2 border-b whitespace-nowrap">شماره سند</th>
                            <th className="p-2 border-b whitespace-nowrap">انبار مربوطه</th>
                            <th className="p-2 border-b whitespace-nowrap text-left">وارده (+)</th>
                            <th className="p-2 border-b whitespace-nowrap text-left">صادره (-)</th>
                            <th className="p-2 border-b whitespace-nowrap text-left">مانده</th>
                            <th className="p-2 border-b whitespace-nowrap">کاربر ثبت کننده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {itemKardexLines.map((line, idx) => {
                            const ev = line.event;
                            let eventBadgeStyle = 'bg-slate-100 text-slate-700';
                            let eventLabel = ev.eventType;
                            
                            switch (ev.eventType) {
                              case 'StockIn':
                                eventBadgeStyle = 'bg-blue-50 text-blue-700 border border-blue-100';
                                eventLabel = 'ورود کالا (رسید)';
                                break;
                              case 'StockOut':
                                eventBadgeStyle = 'bg-amber-50 text-amber-700 border border-amber-100';
                                eventLabel = 'خروج کالا (حواله)';
                                break;
                              case 'Transfer':
                                eventBadgeStyle = 'bg-purple-50 text-purple-700 border border-purple-100';
                                eventLabel = 'انتقال داخلی';
                                break;
                              case 'ProjectConsumption':
                                eventBadgeStyle = 'bg-orange-50 text-orange-700 border border-orange-100';
                                eventLabel = 'مصرف پروژه';
                                break;
                              case 'ProductionOutput':
                                eventBadgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                                eventLabel = 'تولید محصول';
                                break;
                              case 'Scrap':
                                eventBadgeStyle = 'bg-rose-50 text-rose-700 border border-rose-100';
                                eventLabel = 'ضایعات/اسکراپ';
                                break;
                              case 'Adjustment':
                                eventBadgeStyle = 'bg-zinc-100 text-zinc-700 border border-zinc-200';
                                eventLabel = 'اصلاح فیزیکی';
                                break;
                            }

                            return (
                              <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2 text-slate-400 font-mono text-[10px]">{itemKardexLines.length - idx}</td>
                                <td className="p-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{ev.timestamp}</td>
                                <td className="p-2 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${eventBadgeStyle}`}>
                                    {eventLabel}
                                  </span>
                                </td>
                                <td className="p-2 font-mono font-bold text-slate-900">{ev.docNumber || '-'}</td>
                                <td className="p-2 text-slate-600 font-medium whitespace-nowrap">{line.warehouseText || '-'}</td>
                                <td className="p-2 font-mono font-bold text-left text-blue-600">
                                  {line.inQty > 0 ? `+${line.inQty.toLocaleString('fa-IR')}` : '-'}
                                </td>
                                <td className="p-2 font-mono font-bold text-left text-amber-600">
                                  {line.outQty > 0 ? `-${line.outQty.toLocaleString('fa-IR')}` : '-'}
                                </td>
                                <td className="p-2 font-mono font-extrabold text-left text-slate-900 bg-slate-50/30">
                                  {line.balance.toLocaleString('fa-IR')}
                                </td>
                                <td className="p-2 text-slate-500 whitespace-nowrap">{ev.performedBy}</td>
                              </tr>
                            );
                          })}
                          {itemKardexLines.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
                                هیچ تراکنش یا گردشی برای این کالا در فیلتر انتخابی ثبت نشده است.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between gap-2 shrink-0">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPrintableLabelItem(viewingItem);
                    handleCloseViewing();
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>چاپ بارکد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintableCatalogItem(viewingItem);
                    handleCloseViewing();
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>چاپ شناسنامه فنی کالا (A4)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseViewing}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                بستن برگه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Barcode Label Modal */}
      {printableLabelItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>برچسب بارکد آماده چاپ (برچسب کالا)</span>
              </h3>
              <button onClick={() => setPrintableLabelItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Graphic */}
            <div className="p-4 border border-dashed border-slate-400 rounded-xl bg-white space-y-4 text-center">
              <div className="text-[11px] font-extrabold text-slate-800 tracking-wider">
                سیستم هوشمند ردیابی انبار انبارمه
              </div>
              
              <div className="flex justify-center">
                <BarcodeVisual 
                  code={printableLabelItem.barcode || printableLabelItem.code} 
                  name={printableLabelItem.name} 
                  location={printableLabelItem.locationInRack}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-right bg-slate-50 p-2 rounded border border-slate-200">
                <div><span className="text-slate-400">گروه:</span> <span className="font-bold">{printableLabelItem.group}</span></div>
                <div><span className="text-slate-400">واحد:</span> <span className="font-bold">{printableLabelItem.unit}</span></div>
                <div className="col-span-2"><span className="text-slate-400">قفسه انبار:</span> <span className="font-bold text-amber-800">{printableLabelItem.locationInRack || 'تعریف نشده'}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPrintableLabelItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>پرینت برچسب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Product Catalog & Datasheet Modal */}
      {printableCatalogItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>شناسنامه فنی و کاتالوگ قطعه (آماده چاپ A4)</span>
              </h3>
              <button onClick={() => setPrintableCatalogItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Sheet */}
            <div className="p-6 border border-slate-300 rounded-xl bg-white space-y-6 text-xs text-slate-800">
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">برگ شناسنامه فنی و کاتالوگ کالا</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">سیستم مدیریت یکپارچه انبار و کنترل کیفیت تولید</p>
                </div>
                <div className="text-left font-mono text-[11px]">
                  <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
                  <div className="font-bold text-indigo-700 mt-0.5">کد کالا: {printableCatalogItem.code}</div>
                </div>
              </div>

              {/* Main Info Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div><span className="text-slate-400 block text-[10px]">نام کالا:</span><span className="font-bold text-slate-900">{printableCatalogItem.name}</span></div>
                <div><span className="text-slate-400 block text-[10px]">نوع کالا:</span><span className="font-bold text-indigo-700">{typeLabels[printableCatalogItem.itemType]}</span></div>
                <div><span className="text-slate-400 block text-[10px]">گروه / زیرگروه:</span><span className="font-bold text-slate-900">{printableCatalogItem.group} / {printableCatalogItem.subGroup}</span></div>
                <div><span className="text-slate-400 block text-[10px]">واحد سنجش:</span><span className="font-bold text-slate-900">{printableCatalogItem.unit}</span></div>
                <div><span className="text-slate-400 block text-[10px]">موقعیت قفسه:</span><span className="font-bold text-amber-800">{printableCatalogItem.locationInRack || 'نامشخص'}</span></div>
                <div><span className="text-slate-400 block text-[10px]">شماره بارکد:</span><span className="font-mono font-bold text-slate-900">{printableCatalogItem.barcode}</span></div>
              </div>

              {/* Barcode graphic */}
              <div className="flex justify-center my-3">
                <BarcodeVisual code={printableCatalogItem.barcode || printableCatalogItem.code} name={printableCatalogItem.name} />
              </div>

              {/* Technical catalog details */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-900">توضیحات فنی و شرایط انبارش:</h4>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 leading-relaxed text-[11px]">
                  {printableCatalogItem.description || 'قطعه فوق استاندارد و تست‌شده می‌باشد. نگهداری باید در محیط خشک و بدون رطوبت با درجه حرارت استاندارد خط تولید انجام پذیرد.'}
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[11px] font-bold text-slate-700">
                <div className="border-t border-slate-300 pt-2">امضای مسئول انبار</div>
                <div className="border-t border-slate-300 pt-2">تاییدیه کنترل کیفیت (QC)</div>
                <div className="border-t border-slate-300 pt-2">امضای مدیر فنی</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPrintableCatalogItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ کاتالوگ (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
