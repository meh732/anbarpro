import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Contractor } from '../types';
import { Building2, Plus, Phone, MapPin, Wrench, FileText, Search } from 'lucide-react';

export const ContractorsView: React.FC = () => {
  const { contractors, addContractor, projects, language } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [code, setCode] = useState(`CONT-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [address, setAddress] = useState('');

  const isFa = language === 'fa';

  const handleOpenAdd = () => {
    setCode(`CONT-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setContactPerson('');
    setPhone('');
    setSpecialty('');
    setAddress('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    addContractor({
      code,
      name,
      contactPerson,
      phone,
      specialty,
      address,
      activeContractsCount: 0,
    });

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
              {isFa ? 'مدیریت پیمانکاران برون‌سپاری' : 'Contractors & Outsourcing'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFa ? 'مدیریت لیست کارگاه‌ها و شرکت‌های پیمانکار طرف قرارداد خط تولید' : 'Manage external contractors and outsourcing partners'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-amber-700 transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{isFa ? 'افزودن پیمانکار جدید' : 'Add New Contractor'}</span>
        </button>
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

            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-amber-300 transition-all space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {c.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{c.name}</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold">
                    {assignedSteps.length} {isFa ? 'مرحله فعال' : 'active steps'}
                  </span>
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

                  {c.address && (
                    <div className="flex items-start gap-2 text-slate-500 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{c.address}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Add Contractor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-amber-600 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {isFa ? 'تعریف شرکت / کارگاه پیمانکار جدید' : 'New Contractor'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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
                  ثبت پیمانکار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
