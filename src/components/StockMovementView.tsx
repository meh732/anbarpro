import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StockInType, StockOutType, StockInDoc, StockOutDoc } from '../types';
import { 
  ArrowDownUp, ArrowDownLeft, ArrowUpRight, Plus, 
  Search, Printer, CheckCircle2, FileText, Trash2, Pencil, X, Eye, Hash 
} from 'lucide-react';
import { OfficialDocumentViewerModal, OfficialDocData } from './OfficialDocumentViewerModal';

export const StockMovementView: React.FC = () => {
  const { 
    stockInDocs, stockOutDocs, warehouses, items, currentUser, companyName,
    createStockInDoc, updateStockInDoc, deleteStockInDoc,
    createStockOutDoc, updateStockOutDoc, deleteStockOutDoc 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'IN' | 'OUT'>('IN');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [editingInDoc, setEditingInDoc] = useState<StockInDoc | null>(null);
  const [editingOutDoc, setEditingOutDoc] = useState<StockOutDoc | null>(null);

  // Official Printable Document Modal State
  const [activeOfficialDoc, setActiveOfficialDoc] = useState<OfficialDocData | null>(null);

  // Form State for new Document
  const [docType, setDocType] = useState<'IN' | 'OUT'>('IN');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [partyName, setPartyName] = useState(''); // supplier or recipient
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || 'wh-raw');
  const [movementType, setMovementType] = useState<string>('Purchase');
  const [docNotes, setDocNotes] = useState('');

  // Document Item lines
  const [docItems, setDocItems] = useState<{ itemId: string; quantity: number; unitPrice: number; notes: string }[]>([
    { itemId: items[0]?.id || 'item-pcb-101', quantity: 100, unitPrice: items[0]?.unitPrice || 50000, notes: '' }
  ]);

  const stockInTypeLabels: Record<StockInType, string> = {
    Purchase: 'خرید جدید',
    ProductionReturn: 'برگشت از تولید',
    CustomerReturn: 'برگشت از مشتری',
    TransferIn: 'انتقال ورودی',
    StockAdjustment: 'اصلاح موجودی (افزایشی)',
  };

  const stockOutTypeLabels: Record<StockOutType, string> = {
    ProjectConsumption: 'مصرف در پروژه',
    TransferOut: 'انتقال خروجی',
    Sale: 'فروش محصول',
    Scrap: 'ضایعات و سوخته',
    StockAdjustment: 'اصلاح موجودی (کاهشی)',
  };

  // Open Official Document Viewer for Stock In
  const handleViewOfficialInDoc = (doc: StockInDoc) => {
    const wh = warehouses.find(w => w.id === doc.warehouseId);
    const docData: OfficialDocData = {
      type: 'STOCK_IN',
      docNumber: doc.docNumber,
      date: doc.date,
      status: 'تاییدشده و قطعی',
      partyName: doc.supplier || 'تامین‌کننده معتبر',
      targetWarehouseName: wh?.name || 'انبار مقصد',
      issuerName: doc.registeredBy || 'کارشناس انبار',
      notes: doc.notes || `رسید ورود کالا از نوع ${stockInTypeLabels[doc.entryType]}`,
      items: doc.items.map(it => {
        const itemObj = items.find(i => i.id === it.itemId || i.code === it.itemId);
        return {
          itemId: it.itemId,
          itemCode: itemObj?.code || it.itemId,
          itemName: itemObj?.name || 'قطعه انبار',
          unit: itemObj?.unit || 'عدد',
          quantity: it.quantity,
          unitPrice: it.unitPrice || itemObj?.unitPrice || 0,
          notes: it.notes,
        };
      }),
    };
    setActiveOfficialDoc(docData);
  };

  // Open Official Document Viewer for Stock Out
  const handleViewOfficialOutDoc = (doc: StockOutDoc) => {
    const wh = warehouses.find(w => w.id === doc.warehouseId);
    const docData: OfficialDocData = {
      type: 'STOCK_OUT',
      docNumber: doc.docNumber,
      date: doc.date,
      status: 'تاییدشده و تحویل‌شده',
      partyName: doc.recipient || 'واحد متقاضی / پروژه',
      sourceWarehouseName: wh?.name || 'انبار مبدا',
      issuerName: doc.registeredBy || 'انباردار رسمی',
      notes: doc.notes || `حواله خروج کالا به منظور ${stockOutTypeLabels[doc.exitType]}`,
      items: doc.items.map(it => {
        const itemObj = items.find(i => i.id === it.itemId || i.code === it.itemId);
        return {
          itemId: it.itemId,
          itemCode: itemObj?.code || it.itemId,
          itemName: itemObj?.name || 'کالای خروجی',
          unit: itemObj?.unit || 'عدد',
          quantity: it.quantity,
          unitPrice: itemObj?.unitPrice || 0,
          reason: it.notes,
        };
      }),
    };
    setActiveOfficialDoc(docData);
  };


  const handleOpenNewDoc = (type: 'IN' | 'OUT') => {
    setDocType(type);
    setEditingInDoc(null);
    setEditingOutDoc(null);
    const prefix = type === 'IN' ? 'REC-2026-' : 'ISS-2026-';
    setDocNumber(`${prefix}${Math.floor(100 + Math.random() * 900)}`);
    setDocDate(new Date().toLocaleDateString('fa-IR'));
    setPartyName(type === 'IN' ? 'شرکت تامین‌کننده قطعات الکترونیک' : 'سالن تولید و مونتاژ شماره ۱');
    setMovementType(type === 'IN' ? 'Purchase' : 'ProjectConsumption');
    setSelectedWarehouseId(warehouses[0]?.id || 'wh-raw');
    setDocNotes('');
    setDocItems([{ itemId: items[0]?.id || '', quantity: 100, unitPrice: items[0]?.unitPrice || 10000, notes: '' }]);
    setIsDocModalOpen(true);
  };

  const handleOpenEditInDoc = (doc: StockInDoc) => {
    setDocType('IN');
    setEditingInDoc(doc);
    setEditingOutDoc(null);
    setDocNumber(doc.docNumber);
    setDocDate(doc.date);
    setPartyName(doc.supplier);
    setMovementType(doc.entryType);
    setSelectedWarehouseId(doc.warehouseId);
    setDocNotes(doc.notes || '');
    setDocItems(doc.items.map(it => ({ ...it })));
    setIsDocModalOpen(true);
  };

  const handleOpenEditOutDoc = (doc: StockOutDoc) => {
    setDocType('OUT');
    setEditingOutDoc(doc);
    setEditingInDoc(null);
    setDocNumber(doc.docNumber);
    setDocDate(doc.date);
    setPartyName(doc.recipient);
    setMovementType(doc.exitType);
    setSelectedWarehouseId(doc.warehouseId);
    setDocNotes(doc.notes || '');
    setDocItems(doc.items.map(it => ({ ...it })));
    setIsDocModalOpen(true);
  };

  const handleDeleteInDoc = (doc: StockInDoc) => {
    if (confirm(`آیا از حذف رسید ورود "${doc.docNumber}" اطمینان دارید؟`)) {
      deleteStockInDoc(doc.id);
    }
  };

  const handleDeleteOutDoc = (doc: StockOutDoc) => {
    if (confirm(`آیا از حذف حواله خروج "${doc.docNumber}" اطمینان دارید؟`)) {
      deleteStockOutDoc(doc.id);
    }
  };

  const handleAddItemLine = () => {
    setDocItems(prev => [
      ...prev, 
      { itemId: items[0]?.id || '', quantity: 50, unitPrice: items[0]?.unitPrice || 10000, notes: '' }
    ]);
  };

  const handleRemoveItemLine = (idx: number) => {
    setDocItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber || docItems.length === 0) return;

    if (docType === 'IN') {
      if (editingInDoc) {
        updateStockInDoc(editingInDoc.id, {
          docNumber,
          date: docDate,
          supplier: partyName,
          warehouseId: selectedWarehouseId,
          entryType: movementType as StockInType,
          items: docItems,
          notes: docNotes,
        });
        alert('رسید ورود با موفقیت به‌روزرسانی شد.');
      } else {
        createStockInDoc({
          docNumber,
          date: docDate,
          supplier: partyName,
          registeredBy: currentUser.fullName,
          warehouseId: selectedWarehouseId,
          entryType: movementType as StockInType,
          items: docItems,
          notes: docNotes,
          status: 'Confirmed',
        });
        alert('رسید ورود به انبار با موفقیت ثبت شد و موجودی انبار به‌روزرسانی گردید.');
      }
    } else {
      if (editingOutDoc) {
        updateStockOutDoc(editingOutDoc.id, {
          docNumber,
          date: docDate,
          recipient: partyName,
          warehouseId: selectedWarehouseId,
          exitType: movementType as StockOutType,
          items: docItems,
          notes: docNotes,
        });
        alert('حواله خروج با موفقیت به‌روزرسانی شد.');
      } else {
        createStockOutDoc({
          docNumber,
          date: docDate,
          recipient: partyName,
          registeredBy: currentUser.fullName,
          warehouseId: selectedWarehouseId,
          exitType: movementType as StockOutType,
          items: docItems,
          notes: docNotes,
          status: 'Confirmed',
        });
        alert('حواله خروج از انبار با موفقیت ثبت شد و از موجودی کسر گردید.');
      }
    }

    setIsDocModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowDownUp className="w-5 h-5 text-indigo-600" />
            مدیریت اسناد ورود و خروج کالا (رسید و حواله انبار)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت اسناد رسمی خرید، مصرف پروژه، ضایعات، اصلاح موجودی و به‌روزرسانی خودکار کارتکس و بالانس انبارها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNewDoc('IN')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            ثبت رسید جدید (ورود)
          </button>
          <button
            onClick={() => handleOpenNewDoc('OUT')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            ثبت حواله جدید (خروج)
          </button>
        </div>
      </div>

      {/* Sub-Tab Toggle */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('IN')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeSubTab === 'IN'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          اسناد رسید ورود به انبار ({stockInDocs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('OUT')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeSubTab === 'OUT'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          اسناد حواله خروج از انبار ({stockOutDocs.length})
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeSubTab === 'IN' ? (
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="whitespace-nowrap p-3.5">شماره سند</th>
                  <th className="whitespace-nowrap p-3.5">تاریخ</th>
                  <th className="whitespace-nowrap p-3.5">نوع ورود</th>
                  <th className="whitespace-nowrap p-3.5">تامین‌کننده / مبدا</th>
                  <th className="whitespace-nowrap p-3.5">انبار مقصد</th>
                  <th className="whitespace-nowrap p-3.5 text-center">تعداد اقلام</th>
                  <th className="whitespace-nowrap p-3.5">کاربر ثبت‌کننده</th>
                  <th className="whitespace-nowrap p-3.5">وضعیت</th>
                  <th className="whitespace-nowrap p-3.5 text-center">مشاهده و چاپ رسمی</th>
                  <th className="whitespace-nowrap p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockInDocs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      هیچ سند ورودی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  stockInDocs.map(doc => {
                    const wh = warehouses.find(w => w.id === doc.warehouseId);
                    return (
                      <tr 
                        key={doc.id} 
                        onClick={() => handleViewOfficialInDoc(doc)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      >
                        <td className="whitespace-nowrap p-3.5 font-mono font-bold text-emerald-600 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {doc.docNumber}
                        </td>
                        <td className="whitespace-nowrap p-3.5 font-mono text-slate-500">{doc.date}</td>
                        <td className="whitespace-nowrap p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            {stockInTypeLabels[doc.entryType]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3.5 font-bold text-slate-800">{doc.supplier}</td>
                        <td className="whitespace-nowrap p-3.5 text-slate-600">{wh?.name}</td>
                        <td className="whitespace-nowrap p-3.5 font-mono font-bold text-center">{doc.items.length} قلم</td>
                        <td className="whitespace-nowrap p-3.5 text-slate-500">{doc.registeredBy}</td>
                        <td className="whitespace-nowrap p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            تاییدشده
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewOfficialInDoc(doc)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-300 shadow-2xs text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="مشاهده و چاپ رسید رسمی ورود انبار"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>چاپ سند</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditInDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="ویرایش رسید ورود"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف رسید ورود"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="whitespace-nowrap p-3.5">شماره سند</th>
                  <th className="whitespace-nowrap p-3.5">تاریخ</th>
                  <th className="whitespace-nowrap p-3.5">نوع خروج</th>
                  <th className="whitespace-nowrap p-3.5">تحویل‌گیرنده / پروژه</th>
                  <th className="whitespace-nowrap p-3.5">انبار مبدا</th>
                  <th className="whitespace-nowrap p-3.5 text-center">تعداد اقلام</th>
                  <th className="whitespace-nowrap p-3.5">کاربر ثبت‌کننده</th>
                  <th className="whitespace-nowrap p-3.5">وضعیت</th>
                  <th className="whitespace-nowrap p-3.5 text-center">مشاهده و چاپ رسمی</th>
                  <th className="whitespace-nowrap p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockOutDocs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      هیچ سند خروجی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  stockOutDocs.map(doc => {
                    const wh = warehouses.find(w => w.id === doc.warehouseId);
                    return (
                      <tr 
                        key={doc.id} 
                        onClick={() => handleViewOfficialOutDoc(doc)}
                        className="hover:bg-rose-50/40 transition-colors cursor-pointer"
                      >
                        <td className="whitespace-nowrap p-3.5 font-mono font-bold text-rose-600 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {doc.docNumber}
                        </td>
                        <td className="whitespace-nowrap p-3.5 font-mono text-slate-500">{doc.date}</td>
                        <td className="whitespace-nowrap p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                            {stockOutTypeLabels[doc.exitType]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3.5 font-bold text-slate-800">{doc.recipient}</td>
                        <td className="whitespace-nowrap p-3.5 text-slate-600">{wh?.name}</td>
                        <td className="whitespace-nowrap p-3.5 font-mono font-bold text-center">{doc.items.length} قلم</td>
                        <td className="whitespace-nowrap p-3.5 text-slate-500">{doc.registeredBy}</td>
                        <td className="whitespace-nowrap p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-medium flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-rose-600" />
                            تاییدشده
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewOfficialOutDoc(doc)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300 shadow-2xs text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="مشاهده و چاپ حواله رسمی خروج انبار"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>چاپ سند</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOutDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="ویرایش حواله خروج"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOutDoc(doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف حواله خروج"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Wizard for New / Edit Stock Document */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${docType === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {docType === 'IN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                {editingInDoc 
                  ? `ویرایش رسید ورود (${editingInDoc.docNumber})`
                  : editingOutDoc
                  ? `ویرایش حواله خروج (${editingOutDoc.docNumber})`
                  : docType === 'IN' 
                  ? 'ثبت رسید ورودی جدید به انبار' 
                  : 'ثبت حواله خروجی جدید از انبار'}
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDoc} className="p-5 space-y-4 overflow-y-auto">
              {/* Document Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره سند*</label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">تاریخ ثبت*</label>
                  <input
                    type="text"
                    required
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {docType === 'IN' ? 'تامین‌کننده / فروشنده*' : 'تحویل‌گیرنده / پروژه*'}
                  </label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {docType === 'IN' ? 'انبار مقصد*' : 'انبار مبدا*'}
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع عملیات*</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-indigo-500"
                  >
                    {docType === 'IN' ? (
                      <>
                        <option value="Purchase">خرید جدید</option>
                        <option value="ProductionReturn">برگشت از تولید</option>
                        <option value="CustomerReturn">برگشت از مشتری</option>
                        <option value="TransferIn">انتقال ورودی</option>
                        <option value="StockAdjustment">اصلاح موجودی (افزایشی)</option>
                      </>
                    ) : (
                      <>
                        <option value="ProjectConsumption">مصرف در پروژه</option>
                        <option value="TransferOut">انتقال خروجی</option>
                        <option value="Sale">فروش محصول</option>
                        <option value="Scrap">ضایعات و سوخته</option>
                        <option value="StockAdjustment">اصلاح موجودی (کاهشی)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">کاربر ثبت‌کننده</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.fullName}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium"
                  />
                </div>
              </div>

              {/* Items Table Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">اقلام و قطعات سند:</span>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن سطر جدید
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {docItems.map((line, idx) => {
                    const itm = items.find(i => i.id === line.itemId);
                    return (
                      <div key={idx} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-start sm:items-center">
                        <div className="w-full sm:col-span-5">
                          <label className="block text-[10px] text-slate-500 mb-0.5">انتخاب کالا / قطعه</label>
                          <select
                            value={line.itemId}
                            onChange={(e) => {
                              const selected = items.find(i => i.id === e.target.value);
                              const copy = [...docItems];
                              copy[idx].itemId = e.target.value;
                              if (selected) copy[idx].unitPrice = selected.unitPrice;
                              setDocItems(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                          >
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-0.5">تعداد ({itm?.unit || 'عدد'})</label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => {
                              const copy = [...docItems];
                              copy[idx].quantity = Number(e.target.value);
                              setDocItems(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono text-center"
                          />
                        </div>

                        <div className="w-full sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 mb-0.5">قیمت واحد (تومان)</label>
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const copy = [...docItems];
                              copy[idx].unitPrice = Number(e.target.value);
                              setDocItems(copy);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono"
                          />
                        </div>

                        <div className="w-full sm:col-span-2 text-center pt-2 sm:pt-3">
                          {docItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemLine(idx)}
                              className="text-rose-600 hover:text-rose-700 p-1 flex items-center justify-center gap-1 w-full sm:w-auto"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                              <span className="inline sm:hidden text-[10px] font-bold">حذف این ردیف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت سند</label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="توضیحات اضافی مانند شماره بارنامه، ردیف فاکتور خرید یا نام تحویل گیرنده"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs hover:bg-slate-200 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-semibold text-white rounded-xl text-xs shadow-2xs ${
                    docType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingInDoc || editingOutDoc ? 'ذخیره تغییرات سند' : 'تایید و ثبت نهایی سند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

