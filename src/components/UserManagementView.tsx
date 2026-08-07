import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { 
  Users, UserPlus, Shield, ShieldCheck, Key, Edit, Trash2, 
  CheckCircle2, XCircle, Lock, Building, Mail, Check, Layers, AlertTriangle
} from 'lucide-react';

interface TabDefinition {
  id: string;
  nameFa: string;
  nameEn: string;
  category: 'executive' | 'warehouse' | 'production' | 'settings';
}

const ALL_SYSTEM_TABS: TabDefinition[] = [
  { id: 'dashboard', nameFa: 'داشبورد مدیریتی', nameEn: 'Executive Dashboard', category: 'executive' },
  { id: 'reports', nameFa: 'گزارش‌های جامع و اکسل', nameEn: 'Reports & Analytics', category: 'executive' },
  
  { id: 'items', nameFa: 'کاتالوگ و ساختار کالاها', nameEn: 'Item Catalog', category: 'warehouse' },
  { id: 'warehouses', nameFa: 'مدیریت و موجودی انبارها', nameEn: 'Warehouses & Stock', category: 'warehouse' },
  { id: 'stock_movement', nameFa: 'ورود و خروج کالا (اسناد)', nameEn: 'Stock Documents', category: 'warehouse' },
  { id: 'transfers', nameFa: 'انتقال بین انبارها', nameEn: 'Warehouse Transfers', category: 'warehouse' },
  { id: 'requests', nameFa: 'درخواست کالا و خرید', nameEn: 'Purchase Requests', category: 'warehouse' },
  
  { id: 'projects', nameFa: 'پروژه‌ها و مراحل تولید', nameEn: 'Production Projects', category: 'production' },
  { id: 'bom', nameFa: 'فرمول ساخت (BOM)', nameEn: 'Bill of Materials', category: 'production' },
  { id: 'operator_logger', nameFa: 'ثبت تولید اپراتور', nameEn: 'Operator Production Log', category: 'production' },
  { id: 'operator_perf', nameFa: 'عملکرد و کارکرد اپراتورها', nameEn: 'Operator Performance', category: 'production' },
  { id: 'traceability', nameFa: 'رهگیری و گردش ۳۶۰ کالا', nameEn: '360 Traceability', category: 'production' },
  
  { id: 'backup', nameFa: 'پشتیبان‌گیری و سرور لینوکس', nameEn: 'Backup & Linux Server', category: 'settings' },
  { id: 'audit_backup', nameFa: 'لاگ‌های امنیتی سیستم', nameEn: 'System Audit Logs', category: 'settings' },
];

export const UserManagementView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, language, t } = useApp();
  const isFa = language === 'fa';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Storekeeper');
  const [department, setDepartment] = useState('انبارداری');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['dashboard']);

  // Granular Action Permissions
  const [canAdd, setCanAdd] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canExport, setCanExport] = useState(true);

  const roleOptions: { value: UserRole; labelFa: string }[] = [
    { value: 'SystemAdmin', labelFa: 'مدیر کل سیستم (Super Admin)' },
    { value: 'PlantManager', labelFa: 'مدیر کارخانه' },
    { value: 'WarehouseManager', labelFa: 'مدیر انبارها' },
    { value: 'Storekeeper', labelFa: 'انباردار' },
    { value: 'ShiftLead', labelFa: 'سرشیفت تولید' },
    { value: 'Operator', labelFa: 'اپراتور خط تولید' },
    { value: 'Purchasing', labelFa: 'مسئول خرید و بازرگانی' },
    { value: 'QC', labelFa: 'کنترل کیفیت (QC)' },
    { value: 'ProjectManager', labelFa: 'مدیر پروژه' },
  ];

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFullName('');
    setUsername('');
    setPassword('123456');
    setRole('Storekeeper');
    setDepartment('انبارداری');
    setEmail('');
    setIsActive(true);
    setCanAdd(true);
    setCanEdit(true);
    setCanDelete(false);
    setCanExport(true);
    setSelectedTabs(['dashboard', 'items', 'warehouses', 'stock_movement', 'transfers']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setUsername(u.username);
    setPassword(u.password || '');
    setRole(u.role);
    setDepartment(u.department);
    setEmail(u.email);
    setIsActive(u.isActive ?? true);
    setCanAdd(u.canAdd ?? true);
    setCanEdit(u.canEdit ?? true);
    setCanDelete(u.canDelete ?? false);
    setCanExport(u.canExport ?? true);
    setSelectedTabs(u.allowedTabs?.includes('*') ? ALL_SYSTEM_TABS.map(t => t.id) : u.allowedTabs || ['dashboard']);
    setIsModalOpen(true);
  };

  const handleToggleTab = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      setSelectedTabs(selectedTabs.filter(t => t !== tabId));
    } else {
      setSelectedTabs([...selectedTabs, tabId]);
    }
  };

  const handleSelectAllTabs = () => {
    if (selectedTabs.length === ALL_SYSTEM_TABS.length) {
      setSelectedTabs([]);
    } else {
      setSelectedTabs(ALL_SYSTEM_TABS.map(t => t.id));
    }
  };

  const handleApplyPreset = (presetType: 'admin' | 'warehouse' | 'production' | 'operator') => {
    if (presetType === 'admin') {
      setSelectedTabs(ALL_SYSTEM_TABS.map(t => t.id));
      setRole('SystemAdmin');
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(true);
      setCanExport(true);
    } else if (presetType === 'warehouse') {
      setSelectedTabs(['dashboard', 'items', 'warehouses', 'stock_movement', 'transfers', 'requests', 'reports']);
      setRole('WarehouseManager');
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(false);
      setCanExport(true);
    } else if (presetType === 'production') {
      setSelectedTabs(['dashboard', 'projects', 'bom', 'operator_logger', 'operator_perf', 'traceability', 'reports']);
      setRole('PlantManager');
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(false);
      setCanExport(true);
    } else if (presetType === 'operator') {
      setSelectedTabs(['operator_logger', 'projects']);
      setRole('Operator');
      setCanAdd(true);
      setCanEdit(false);
      setCanDelete(false);
      setCanExport(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;

    const allowed = role === 'SystemAdmin' || selectedTabs.length === ALL_SYSTEM_TABS.length 
      ? ['*'] 
      : selectedTabs;

    if (editingUserId) {
      updateUser(editingUserId, {
        fullName,
        username,
        password,
        role,
        department,
        email,
        isActive,
        allowedTabs: allowed,
        canAdd,
        canEdit,
        canDelete,
        canExport
      });
    } else {
      addUser({
        fullName,
        username,
        password,
        role,
        department,
        email,
        isActive,
        allowedTabs: allowed,
        canAdd,
        canEdit,
        canDelete,
        canExport
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {isFa ? 'مدیریت کاربران و سطح دسترسی‌ها (RBAC)' : 'User Accounts & Access Control (RBAC)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isFa ? 'تعریف حساب‌های کاربری، تنظیم رمز عبور و اعطای دسترسی‌های تخصصی به تب‌های سیستم' : 'Manage system users, assign role permissions, set passwords and feature restrictions'}
          </p>
        </div>

        {currentUser.role === 'SystemAdmin' && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isFa ? 'تعریف کاربر جدید' : 'Add New User'}</span>
          </button>
        )}
      </div>

      {/* Users Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const isSuperAdmin = u.role === 'SystemAdmin';
          const permittedCount = u.allowedTabs?.includes('*') || isSuperAdmin 
            ? ALL_SYSTEM_TABS.length 
            : (u.allowedTabs?.length || 0);

          return (
            <div 
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all relative overflow-hidden flex flex-col justify-between ${
                u.isActive === false 
                  ? 'border-slate-200 opacity-60 bg-slate-50' 
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-bold flex items-center justify-center text-base shadow-2xs">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        {u.fullName}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                            {isFa ? 'شما' : 'YOU'}
                          </span>
                        )}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Key className="w-3 h-3 text-slate-400" />
                        <span>@{u.username}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] rounded-lg border font-bold ${
                    u.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {u.isActive !== false ? (isFa ? 'فعال' : 'Active') : (isFa ? 'غیرفعال' : 'Inactive')}
                  </span>
                </div>

                {/* Role & Department */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs text-slate-600 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{isFa ? 'نقش سازمانی:' : 'Role:'}</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/60 text-[11px]">
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{isFa ? 'واحد/دپارتمان:' : 'Department:'}</span>
                    <span className="font-medium text-slate-800">{u.department || 'نامشخص'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{isFa ? 'رمز عبور:' : 'Password:'}</span>
                    <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {u.password || '••••••'}
                    </span>
                  </div>
                </div>

                {/* Access Level Badge */}
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    {isFa ? 'دسترسی‌های فعال:' : 'Permissions:'}
                  </span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {isSuperAdmin ? (
                      <span className="text-indigo-600 font-bold">{isFa ? 'کامل (مدیر ارشد)' : 'FULL ACCESS'}</span>
                    ) : (
                      <span>{permittedCount} {isFa ? 'از' : 'of'} {ALL_SYSTEM_TABS.length} {isFa ? 'بخش' : 'tabs'}</span>
                    )}
                  </span>
                </div>

                {/* Granular Action Tags */}
                <div className="flex flex-wrap gap-1 pt-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${u.canAdd ?? true ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>
                    ثبت
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${u.canEdit ?? true ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>
                    ویرایش
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${u.canDelete ?? false ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>
                    حذف
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${u.canExport ?? true ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>
                    خروجی
                  </span>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => handleOpenEditModal(u)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isFa ? 'ویرایش دسترسی‌ها' : 'Edit Permissions'}</span>
                </button>

                {currentUser.role === 'SystemAdmin' && u.id !== 'usr-1' && (
                  <button
                    onClick={() => {
                      if (window.confirm(isFa ? `آیا از حذف کاربر ${u.fullName} اطمینان دارید؟` : `Delete user ${u.fullName}?`)) {
                        deleteUser(u.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                    title={isFa ? 'حذف کاربر' : 'Delete User'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6 custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingUserId ? (isFa ? 'ویرایش مشخصات و دسترسی‌های کاربر' : 'Edit User & Permissions') : (isFa ? 'تعریف کاربر جدید' : 'Create New User')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isFa ? 'تنظیم اطلاعات ورود و علامت‌گذاری تب‌های مجاز جهت مشاهده' : 'Configure user profile and toggle permitted app tabs'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Preset Quick Selection Buttons */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isFa ? 'قالب‌های آمادۀ سطح دسترسی (مجموعه مجوزها):' : 'Quick Permission Presets:'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('admin')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    {isFa ? '⚡ دسترسی کامل مدیریتی' : 'Full Admin Access'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('warehouse')}
                    className="px-2.5 py-1 bg-white hover:bg-amber-600 hover:text-white border border-amber-200 text-amber-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    {isFa ? '📦 تخصصی انبارداری' : 'Warehouse Specialist'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('production')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    {isFa ? '⚙️ تخصصی مدیر تولید/کارخانه' : 'Production Manager'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('operator')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    {isFa ? '🛠️ اپراتور خط ثبت تولید' : 'Line Operator'}
                  </button>
                </div>
              </div>

              {/* User Basic Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'نام و نام خانوادگی:' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isFa ? 'مثال: مهندس کاظمی' : 'Full Name'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'نام کاربری (جهت ورود):' : 'Username:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'رمز عبور ورود:' : 'Password:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'نقش سازمانی:' : 'Organizational Role:'}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    {roleOptions.map(r => (
                      <option key={r.value} value={r.value}>{r.labelFa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'واحد / دپارتمان:' : 'Department:'}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={isFa ? 'مثال: انبارداری یا سالن SMD' : 'Department'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'ایمیل سازمانی (اختیاری):' : 'Email (Optional):'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@factory.ir"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  {isFa ? 'حساب کاربری فعال باشد (مجاز به ورود به سیستم)' : 'User account is active'}
                </label>
              </div>

              {/* Action Operations Permissions Checklist (Add, Edit, Delete, Export) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200 bg-slate-50/80 p-3.5 rounded-2xl">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isFa ? 'مجوزهای عملیاتی (ایجاد، ویرایش، حذف و خروجی گرفتن):' : 'Granular Action Permissions:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={canAdd}
                      onChange={(e) => setCanAdd(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span>{isFa ? '🟢 امکان ثبت/ایجاد' : 'Allow Create'}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={canEdit}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>{isFa ? '🔵 امکان ویرایش' : 'Allow Edit'}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={canDelete}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                    <span>{isFa ? '🔴 امکان حذف' : 'Allow Delete'}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={canExport}
                      onChange={(e) => setCanExport(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span>{isFa ? '🟡 خروجی اکسل/بکاپ' : 'Allow Export'}</span>
                  </label>
                </div>
              </div>

              {/* Tab Permission Checklist */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>{isFa ? 'انتخاب دسترسی به تب‌ها و بخش‌های سیستم:' : 'Select Permitted Tabs:'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllTabs}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    {selectedTabs.length === ALL_SYSTEM_TABS.length 
                      ? (isFa ? 'لغو انتخاب همه' : 'Deselect All') 
                      : (isFa ? 'انتخاب همه تب‌ها' : 'Select All Tabs')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {ALL_SYSTEM_TABS.map((tab) => {
                    const isChecked = selectedTabs.includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        onClick={() => handleToggleTab(tab.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isChecked 
                            ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-2xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${
                            isChecked ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{isFa ? tab.nameFa : tab.nameEn}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">#{tab.id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  {isFa ? 'ذخیره مشخصات و دسترسی‌ها' : 'Save User & Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
