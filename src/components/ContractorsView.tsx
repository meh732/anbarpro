import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Contractor } from '../types';
import { 
  Building2, Plus, Phone, MapPin, Wrench, FileText, Search, Pencil, 
  Trash2, X, Receipt, Calculator, Scale, ArrowDownRight, ArrowUpLeft,
  CreditCard, Layers
} from 'lucide-react';
import { ContractorFinancialStatementModal } from './ContractorFinancialStatementModal';

export const ContractorsView: React.FC = () => {
  const { 
    contractors, addContractor, updateContractor, deleteContractor, 
    projects, language, hasActionPermission, getContractorFinancialSummary,
    currentUser
  } = useApp();

  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');
  const canViewPrices = currentUser?.canViewPrices !== false;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [selectedStatementContractor, setSelectedStatementContractor] = useState<Contractor | null>(null);

  const [code, setCode] = useState(`CONT-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccountInfo, setBankAccountInfo] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [initialBalance, setInitialBalance] = useState<number | ''>('');
  const [defaultUnitWage, setDefaultUnitWage] = useState<number | ''>('');

  const isFa = language === 'fa';

  const handleOpenAdd = () => {
    setEditingContractor(null);
    setCode(`CONT-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setContactPerson('');
    setPhone('');
    setSpecialty('');
    setAddress('');
    setBankAccountInfo('');
    setNationalId('');
    setInitialBalance('');
    setDefaultUnitWage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Contractor) => {
    setEditingContractor(c);
    setCode(c.code);
    setName(c.name);
    setContactPerson(c.contactPerson || '');
    setPhone(c.phone);
    setSpecialty(c.specialty);
    setAddress(c.address || '');
    setBankAccountInfo(c.bankAccountInfo || '');
    setNationalId(c.nationalId || '');
    setInitialBalance(c.initialBalance !== undefined ? c.initialBalance : '');
    setDefaultUnitWage(c.defaultUnitWage !== undefined ? c.defaultUnitWage : '');
    setIsModalOpen(true);
  };

  const handleDelete = (c: Contractor) => {
    if (confirm(`آیا از حذف پیمانکار "${c.name}" اطمینان دارید؟`)) {
      deleteContractor(c.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (editingContractor) {
      updateContractor(editingContractor.id, {
        code,
        name,
        contactPerson,
        phone,
        specialty,
        address,
        bankAccountInfo: bankAccountInfo || undefined,
        nationalId: nationalId || undefined,
        initialBalance: initialBalance !== '' ? Number(initialBalance) : 0,
        defaultUnitWage: defaultUnitWage !== '' ? Number(defaultUnitWage) : undefined,
      });
    } else {
      addContractor({
        code,
        name,
        contactPerson,
        phone,
        specialty,
        address,
        activeContractsCount: 0,
        bankAccountInfo: bankAccountInfo || undefined,
        nationalId: nationalId || undefined,
        initialBalance: initialBalance !== '' ? Number(initialBalance) : 0,
        defaultUnitWage: defaultUnitWage !== '' ? Number(defaultUnitWage) : undefined,
      });
    }

    setIsModalOpen(false);
  };

  const filteredContractors = contractors.filter(c =>
    c.name.toLowerCase().includes(filterText.toLowerCase()) ||
    c.specialty.toLowerCase().includes(filterText.toLowerCase()) ||
    c.code.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {isFa ? 'مدیریت پیمانکاران، قراردادهای کارمزد و صورتحساب مالی' : 'Contractors, Wage Contracts & Accounting Statements'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFa ? 'محاسبه خودکار کارمزد تولید، صورتحساب دوبل حسابداری و مانده طلب/بدهی پیمانکاران' : 'Production output wage calculation, double-entry ledger & creditor/debtor balance tracking'}
            </p>
          </div>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-amber-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isFa ? 'افزودن پیمانکار جدید' : 'Add New Contractor'}</span>
          </button>
        )}
      </div>

      {/* Filter and Cards */}
      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isFa ? 'جستجوی نام، تخصص یا کد پیمانکار...' : 'Search contractor...'}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContractors.map(c => {
            // Find assigned steps across active projects
            const assignedSteps = projects.flatMap(p => 
              p.steps.filter(s => s.contractorId === c.id || (s.subSteps && s.subSteps.some(sub => sub.contractorId === c.id)))
            );

            // Financial Summary for Contractor
            const summary = getContractorFinancialSummary(c.id);

            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between space-y-4">
                
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {c.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{c.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold">
                        {assignedSteps.length} {isFa ? 'مرحله فعال' : 'active steps'}
                      </span>
                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-1 border-r border-slate-200 pr-1.5 mr-0.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="ویرایش پیمانکار"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف پیمانکار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{c.specialty}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{c.phone}</span>
                      {c.contactPerson && <span className="text-slate-400">({c.contactPerson})</span>}
                    </div>

                    {c.defaultUnitWage ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                        <span className="text-slate-500">نرخ کارمزد پایه هر قطعه:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {canViewPrices ? c.defaultUnitWage.toLocaleString('fa-IR') : '***'} ریال
                        </span>
                      </div>
                    ) : null}

                    {c.address && (
                      <div className="flex items-start gap-2 text-slate-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{c.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accounting Financial Badge & Quick Balance Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">تیراژ کل تولید:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {summary.totalProducedQuantity.toLocaleString('fa-IR')} عدد
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-slate-200/80 pt-1.5">
                    <span className="text-slate-600 font-semibold">مانده حساب دفتری:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-black text-xs ${
                        summary.status === 'Creditor' ? 'text-amber-700' : summary.status === 'Debtor' ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        {canViewPrices ? summary.balance.toLocaleString('fa-IR') : '***'} ریال
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 font-bold rounded ${
                        summary.status === 'Creditor' ? 'bg-amber-100 text-amber-800' : summary.status === 'Debtor' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {summary.status === 'Creditor' ? 'طلبکار' : summary.status === 'Debtor' ? 'بدهکار' : 'تسویه'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button to Open Statement */}
                <button
                  type="button"
                  onClick={() => setSelectedStatementContractor(c)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>مشاهده صورتحساب و کارمزد تولید</span>
                </button>

              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Add/Edit Contractor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-amber-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {editingContractor 
                  ? (isFa ? `ویرایش مشخصات پیمانکار (${editingContractor.name})` : `Edit Contractor (${editingContractor.name})`)
                  : (isFa ? 'تعریف شرکت / کارگاه پیمانکار جدید' : 'New Contractor')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد پیمانکار*</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">شناسه ملی / کد اقتصادی</label>
                  <input
                    type="text"
                    placeholder="10103456789"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام شرکت / پیمانکار*</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرکت مونتاژ الوند"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">شخص رابط / مدیر</label>
                  <input
                    type="text"
                    placeholder="مهندس کریمی"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">شماره تماس*</label>
                  <input
                    type="text"
                    required
                    placeholder="021-88990000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">تخصص و زمینه فعالیت</label>
                <input
                  type="text"
                  placeholder="مثال: مونتاژ SMD، تزریق پلاستیک..."
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نرخ کارمزد پیش‌فرض (ریال)</label>
                  <input
                    type="number"
                    placeholder="90000"
                    value={defaultUnitWage}
                    onChange={(e) => setDefaultUnitWage(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مانده حساب اولیه (ریال)</label>
                  <input
                    type="number"
                    placeholder="+ بستانکار / - بدهکار"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">اطلاعات حساب بانکی و شماره شبا</label>
                <input
                  type="text"
                  placeholder="IR450120000000001234567890 (بانک تجارت)"
                  value={bankAccountInfo}
                  onChange={(e) => setBankAccountInfo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">آدرس کارگاه / دفتر</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-xs"
                >
                  {editingContractor ? 'ذخیره تغییرات' : 'ثبت پیمانکار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Financial Statement Modal */}
      {selectedStatementContractor && (
        <ContractorFinancialStatementModal
          contractor={selectedStatementContractor}
          isOpen={!!selectedStatementContractor}
          onClose={() => setSelectedStatementContractor(null)}
        />
      )}

    </div>
  );
};

