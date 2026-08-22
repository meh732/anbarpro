import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, Operator } from '../types';
import { 
  Users, UserPlus, Shield, ShieldCheck, Key, Edit, Trash2, 
  CheckCircle2, XCircle, Lock, Building, Mail, Check, Layers, AlertTriangle,
  UserCheck, Plus, Pencil, Clock, Factory, Eye, EyeOff, LockKeyhole, KeyRound
} from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/security';

interface TabDefinition {
  id: string;
  nameFa: string;
  nameEn: string;
  category: 'executive' | 'warehouse' | 'production' | 'settings';
}

const ALL_SYSTEM_TABS: TabDefinition[] = [
  { id: 'dashboard', nameFa: 'داشبورد مدیریتی', nameEn: 'Executive Dashboard', category: 'executive' },
  { id: 'chat', nameFa: 'گفتگو و هماهنگی سازمانی', nameEn: 'Team Chat & Coordination', category: 'executive' },
  { id: 'reports', nameFa: 'گزارش‌های جامع و اکسل', nameEn: 'Reports & Analytics', category: 'executive' },
  
  { id: 'items', nameFa: 'کاتالوگ و ساختار کالاها', nameEn: 'Item Catalog', category: 'warehouse' },
  { id: 'kardex', nameFa: 'کاردکس مقداری و ریالی کالا', nameEn: 'Stock Ledger (Kardex)', category: 'warehouse' },
  { id: 'warehouses', nameFa: 'مدیریت و موجودی انبارها', nameEn: 'Warehouses & Stock', category: 'warehouse' },
  { id: 'stock_movement', nameFa: 'ورود و خروج کالا (اسناد)', nameEn: 'Stock Documents', category: 'warehouse' },
  { id: 'transfers', nameFa: 'انتقال بین انبارها', nameEn: 'Warehouse Transfers', category: 'warehouse' },
  { id: 'stock_counting', nameFa: 'انبارگردانی و مغایرت‌گیری', nameEn: 'Stock Counting & Audit', category: 'warehouse' },
  { id: 'requests', nameFa: 'درخواست کالا و خرید', nameEn: 'Purchase Requests', category: 'warehouse' },
  
  { id: 'projects', nameFa: 'پروژه‌ها و مراحل تولید', nameEn: 'Production Projects', category: 'production' },
  { id: 'bom', nameFa: 'فرمول ساخت (BOM)', nameEn: 'Bill of Materials', category: 'production' },
  { id: 'operator_logger', nameFa: 'ثبت تولید اپراتور', nameEn: 'Operator Production Log', category: 'production' },
  { id: 'operator_perf', nameFa: 'عملکرد و کارکرد اپراتورها', nameEn: 'Operator Performance', category: 'production' },
  { id: 'traceability', nameFa: 'رهگیری و گردش ۳۶۰ کالا', nameEn: '360 Traceability', category: 'production' },
  
  { id: 'backup', nameFa: 'تنظیمات و پشتیبان‌گیری', nameEn: 'Backup & Settings', category: 'settings' },
  { id: 'audit_backup', nameFa: 'لاگ‌های امنیتی سیستم', nameEn: 'System Audit Logs', category: 'settings' },
];

export const UserManagementView: React.FC = () => {
  const { 
    users, addUser, updateUser, deleteUser, 
    adminResetPassword,
    operators, addOperator, updateOperator, deleteOperator,
    currentUser, language, t, hasActionPermission 
  } = useApp();
  
  const isFa = language === 'fa';
  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');

  const [activeSubView, setActiveSubView] = useState<'users' | 'operators'>('users');

  // --- USER MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('Storekeeper');
  const [department, setDepartment] = useState('انبارداری');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['dashboard']);
  const [userCanAdd, setUserCanAdd] = useState(true);
  const [userCanEdit, setUserCanEdit] = useState(true);
  const [userCanDelete, setUserCanDelete] = useState(false);
  const [userCanExport, setUserCanExport] = useState(true);
  const [userCanViewPrices, setUserCanViewPrices] = useState(true);

  // --- ADMIN RESET PASSWORD MODAL ---
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [resetStatusMsg, setResetStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- OPERATOR MODAL STATE ---
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [opName, setOpName] = useState('');
  const [opCode, setOpCode] = useState('');
  const [opShift, setOpShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [opRole, setOpRole] = useState('اپراتور خط مونتاژ و تست قطعات');
  const [opStatus, setOpStatus] = useState<'Active' | 'Off' | 'OnLeave'>('Active');
  const [opProjects, setOpProjects] = useState<string[]>(['PRJ-01']);

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

  // User Handlers
  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFullName('');
    setUsername('');
    setPassword('123456');
    setRole('Storekeeper');
    setDepartment('انبارداری');
    setEmail('');
    setIsActive(true);
    setUserCanAdd(true);
    setUserCanEdit(true);
    setUserCanDelete(false);
    setUserCanExport(true);
    setUserCanViewPrices(true);
    setSelectedTabs(['dashboard', 'items', 'warehouses', 'stock_movement', 'transfers', 'kardex', 'stock_counting']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setUsername(u.username);
    setPassword('');
    setShowUserPassword(false);
    setRole(u.role);
    setDepartment(u.department);
    setEmail(u.email);
    setIsActive(u.isActive ?? true);
    setUserCanAdd(u.canAdd ?? true);
    setUserCanEdit(u.canEdit ?? true);
    setUserCanDelete(u.canDelete ?? false);
    setUserCanExport(u.canExport ?? true);
    setUserCanViewPrices(u.canViewPrices ?? (u.role === 'SystemAdmin' || u.role === 'PlantManager' || u.role === 'WarehouseManager' || u.role === 'Purchasing'));
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
      setUserCanAdd(true);
      setUserCanEdit(true);
      setUserCanDelete(true);
      setUserCanExport(true);
      setUserCanViewPrices(true);
    } else if (presetType === 'warehouse') {
      setSelectedTabs(['dashboard', 'items', 'warehouses', 'stock_movement', 'transfers', 'requests', 'kardex', 'stock_counting', 'reports']);
      setRole('WarehouseManager');
      setUserCanAdd(true);
      setUserCanEdit(true);
      setUserCanDelete(false);
      setUserCanExport(true);
      setUserCanViewPrices(true);
    } else if (presetType === 'production') {
      setSelectedTabs(['dashboard', 'projects', 'bom', 'operator_logger', 'operator_perf', 'traceability', 'reports']);
      setRole('PlantManager');
      setUserCanAdd(true);
      setUserCanEdit(true);
      setUserCanDelete(false);
      setUserCanExport(true);
      setUserCanViewPrices(true);
    } else if (presetType === 'operator') {
      setSelectedTabs(['operator_logger', 'projects']);
      setRole('Operator');
      setUserCanAdd(true);
      setUserCanEdit(false);
      setUserCanDelete(false);
      setUserCanExport(false);
      setUserCanViewPrices(false);
    }
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;

    const allowed = role === 'SystemAdmin' || selectedTabs.length === ALL_SYSTEM_TABS.length 
      ? ['*'] 
      : selectedTabs;

    if (editingUserId) {
      const updatePayload: Partial<User> = {
        fullName,
        username,
        role,
        department,
        email,
        isActive,
        allowedTabs: allowed,
        canAdd: userCanAdd,
        canEdit: userCanEdit,
        canDelete: userCanDelete,
        canExport: userCanExport,
        canViewPrices: userCanViewPrices
      };
      if (password.trim().length > 0) {
        updatePayload.password = password.trim();
      }
      updateUser(editingUserId, updatePayload);
    } else {
      addUser({
        fullName,
        username,
        password: password.trim() || '123456',
        role,
        department,
        email,
        isActive,
        allowedTabs: allowed,
        canAdd: userCanAdd,
        canEdit: userCanEdit,
        canDelete: userCanDelete,
        canExport: userCanExport,
        canViewPrices: userCanViewPrices
      });
    }
    setIsModalOpen(false);
  };

  // Operator Handlers
  const handleOpenAddOperator = () => {
    setEditingOperatorId(null);
    setOpName('');
    setOpCode(`OP-${100 + operators.length + 1}`);
    setOpShift('Morning');
    setOpRole('اپراتور خط مونتاژ برد SMD و دیپ');
    setOpStatus('Active');
    setOpProjects(['PRJ-01']);
    setIsOperatorModalOpen(true);
  };

  const handleOpenEditOperator = (op: Operator) => {
    setEditingOperatorId(op.id);
    setOpName(op.name);
    setOpCode(op.code);
    setOpShift(op.shift);
    setOpRole(op.role);
    setOpStatus(op.status);
    setOpProjects(op.activeProjects || ['PRJ-01']);
    setIsOperatorModalOpen(true);
  };

  const handleSubmitOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opName.trim()) return;

    if (editingOperatorId) {
      updateOperator(editingOperatorId, {
        name: opName.trim(),
        code: opCode.trim() || `OP-${Date.now().toString().slice(-3)}`,
        shift: opShift,
        role: opRole.trim(),
        status: opStatus,
        activeProjects: opProjects
      });
    } else {
      addOperator({
        name: opName.trim(),
        code: opCode.trim() || `OP-${100 + operators.length + 1}`,
        shift: opShift,
        role: opRole.trim() || 'اپراتور خط تولید',
        activeProjects: opProjects,
        totalProducedPieces: 0,
        totalWorkingHours: 0,
        status: opStatus
      });
    }
    setIsOperatorModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {isFa ? 'مدیریت کاربران، اپراتورها و سطوح دسترسی' : 'User Accounts, Operators & Access Control'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isFa ? 'تعریف کاربران ورود به سیستم، تنظیم اپراتورهای خط تولید (صرفاً برای گزارش‌ها بدون نیاز به رمز)، و کنترل مجوزها' : 'Manage system login accounts, line operators (name-only for reporting), and granular permissions'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubView === 'users' && canAdd && currentUser.role === 'SystemAdmin' && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isFa ? 'تعریف کاربر جدید (با ورود)' : 'Add Login User'}</span>
            </button>
          )}

          {activeSubView === 'operators' && canAdd && (
            <button
              onClick={handleOpenAddOperator}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isFa ? 'تعریف اپراتور جدید (بدون رمز)' : 'Add Operator (Name Only)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubView('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'users'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isFa ? 'کاربران ورود به سیستم (دارای نام کاربری و رمز)' : 'System Login Users'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeSubView === 'users' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('operators')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'operators'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{isFa ? 'اپراتورها و پرسنل خط (صرفاً نام برای گزارش‌ها - بدون رمز/ورود)' : 'Line Operators (Report Names Only)'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeSubView === 'operators' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {operators.length}
          </span>
        </button>
      </div>

      {/* SUB-VIEW 1: LOGIN USERS */}
      {activeSubView === 'users' && (
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
                      <span className="text-slate-400 text-[11px]">{isFa ? 'امنیت رمز عبور:' : 'Security:'}</span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رمزنگاری SHA-256</span>
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
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${u.canViewPrices ?? (u.role === 'SystemAdmin' || u.role === 'PlantManager' || u.role === 'WarehouseManager' || u.role === 'Purchasing') ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`} title={u.canViewPrices ? 'مشاهده فی و کاردکس مالی مجاز است' : 'مشاهده فی و قیمت‌ها مسدود است'}>
                      {u.canViewPrices ?? (u.role === 'SystemAdmin' || u.role === 'PlantManager' || u.role === 'WarehouseManager' || u.role === 'Purchasing') ? '💰 مشاهده فی' : '🚫 عدم نمایش فی'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-3">
                  {currentUser.role === 'SystemAdmin' && (
                    <button
                      onClick={() => {
                        setResetModalUser(u);
                        setResetNewPassword('');
                        setShowResetNewPassword(false);
                        setResetStatusMsg(null);
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-amber-200"
                      title={isFa ? 'بازنشانی امن کلمه عبور' : 'Reset User Password'}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">{isFa ? 'تغییر رمز' : 'Reset Pass'}</span>
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isFa ? 'ویرایش دسترسی‌ها' : 'Edit Permissions'}</span>
                    </button>
                  )}

                  {canDelete && currentUser.role === 'SystemAdmin' && u.id !== 'usr-1' && (
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
      )}

      {/* SUB-VIEW 2: OPERATORS (NAME ONLY, NO LOGIN/PASSWORD NEEDED) */}
      {activeSubView === 'operators' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">راهنمای اپراتورهای خط تولید:</strong>
              <p className="mt-1 text-emerald-800">
                این افراد نیازی به نام کاربری، رمز عبور یا ورود به سیستم ندارند. نام آن‌ها در منوهای کشویی ثبت شیفت، تحویل قطعات توسط سرشیفت، ثبت خروجی مونتاژ و گزارشات کارکرد نمایش داده می‌شود.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map(op => (
              <div 
                key={op.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-base shadow-2xs">
                        {op.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">
                          {op.name}
                        </h3>
                        <div className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                          کد: {op.code}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] rounded-lg border font-bold ${
                      op.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : op.status === 'OnLeave'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {op.status === 'Active' ? 'فعال' : op.status === 'OnLeave' ? 'مرخصی' : 'تعطیل'}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">شیفت کاری:</span>
                      <span className="font-bold text-slate-800">
                        {op.shift === 'Morning' ? 'شیفت صبح' : op.shift === 'Evening' ? 'شیفت عصر' : 'شیفت شب'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">تخصص / ایستگاه:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">{op.role}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">پروژه‌های تخصیصی:</span>
                      <span className="font-mono text-indigo-600 font-bold">{op.activeProjects?.join(', ') || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 text-center">
                      <span className="text-[10px] text-slate-500 block">تیراژ کل تولید</span>
                      <strong className="text-emerald-700 font-mono font-bold text-sm">
                        {op.totalProducedPieces.toLocaleString('fa-IR')}
                      </strong>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-500 block">ساعت کارکرد</span>
                      <strong className="text-indigo-700 font-mono font-bold text-sm">
                        {op.totalWorkingHours.toLocaleString('fa-IR')} ساعت
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditOperator(op)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ویرایش اپراتور</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm(`آیا از حذف اپراتور "${op.name}" اطمینان دارید؟`)) {
                          deleteOperator(op.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                      title="حذف اپراتور"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6 custom-scrollbar">
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

            <form onSubmit={handleSubmitUser} className="space-y-5">
              {/* Preset Quick Selection Buttons */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isFa ? 'قالب‌های آمادۀ سطح دسترسی:' : 'Quick Permission Presets:'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('admin')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    ⚡ دسترسی کامل مدیریتی
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('warehouse')}
                    className="px-2.5 py-1 bg-white hover:bg-amber-600 hover:text-white border border-amber-200 text-amber-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    📦 تخصصی انبارداری
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('production')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    ⚙️ تخصصی مدیر تولید/کارخانه
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('operator')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                  >
                    🛠️ اپراتور خط ثبت تولید
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {editingUserId ? (isFa ? 'تغییر رمز عبور (اختیاری):' : 'New Password (Optional):') : (isFa ? 'رمز عبور ورود:' : 'Password:')}
                    </label>
                    {editingUserId && (
                      <span className="text-[10px] text-slate-400">{isFa ? 'خالی = بدون تغییر' : 'Leave empty to keep'}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      required={!editingUserId}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUserId ? '••••••••' : 'password123'}
                      className="w-full px-3 py-2 pr-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        {isFa ? 'سطح امنیت:' : 'Strength:'}{' '}
                        <strong className={
                          evaluatePasswordStrength(password).score >= 3 ? 'text-emerald-600' :
                          evaluatePasswordStrength(password).score === 2 ? 'text-amber-600' : 'text-rose-500'
                        }>
                          {evaluatePasswordStrength(password).label}
                        </strong>
                      </span>
                      <div className="flex gap-1 w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            evaluatePasswordStrength(password).score >= 3 ? 'bg-emerald-500 w-full' :
                            evaluatePasswordStrength(password).score === 2 ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'
                          }`}
                        />
                      </div>
                    </div>
                  )}
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

              {/* Action Operations Permissions Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200 bg-slate-50/80 p-3.5 rounded-2xl">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isFa ? 'مجوزهای عملیاتی (ایجاد، ویرایش، حذف، خروجی و دسترسی مالی):' : 'Granular Action & Financial Permissions:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={userCanAdd}
                      onChange={(e) => setUserCanAdd(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span>🟢 امکان ثبت/ایجاد</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={userCanEdit}
                      onChange={(e) => setUserCanEdit(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>🔵 امکان ویرایش</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={userCanDelete}
                      onChange={(e) => setUserCanDelete(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                    <span>🔴 امکان حذف</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:border-indigo-300">
                    <input
                      type="checkbox"
                      checked={userCanExport}
                      onChange={(e) => setUserCanExport(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span>🟡 خروجی اکسل/بکاپ</span>
                  </label>
                </div>

                {/* Granular Price Visibility Control */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    userCanViewPrices 
                      ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-medium' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={userCanViewPrices}
                      onChange={(e) => setUserCanViewPrices(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5"
                    />
                    <div>
                      <span className="font-bold block text-xs flex items-center gap-1.5">
                        <span>💰 مشاهده فی و اطلاعات مالی (کاردکس ریالی، ارزش انبار و مبالغ خرید)</span>
                        {userCanViewPrices ? (
                          <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded font-bold">مجاز</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">مسدود (صرفاً کاردکس مقداری)</span>
                        )}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        در صورت غیرفعال بودن، این کاربر ستون‌های فی (نرخ وارده/صادره، بهای تمام شده و ارزش ریالی مانده) را در کاردکس و موجودی انبار مشاهده نخواهد کرد و فقط گردش مقداری برای وی نمایش داده می‌شود.
                      </p>
                    </div>
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

      {/* OPERATOR MODAL (NO USERNAME / PASSWORD REQUIRED) */}
      {isOperatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingOperatorId ? 'ویرایش اطلاعات اپراتور خط' : 'تعریف اپراتور / پرسنل خط تولید'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    صرفاً برای ثبت در فرم‌ها، تحویل مواد و شیفت‌های کاری (بدون نیاز به نام کاربری و رمز)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOperatorModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOperator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی اپراتور: *
                </label>
                <input
                  type="text"
                  required
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  placeholder="مثال: علی احمدی"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کد پرسنلی / اپراتور:
                  </label>
                  <input
                    type="text"
                    value={opCode}
                    onChange={(e) => setOpCode(e.target.value)}
                    placeholder="OP-105"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شیفت کاری:
                  </label>
                  <select
                    value={opShift}
                    onChange={(e) => setOpShift(e.target.value as 'Morning' | 'Evening' | 'Night')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Morning">شیفت صبح</option>
                    <option value="Evening">شیفت عصر</option>
                    <option value="Night">شیفت شب</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان شغلی / ایستگاه کاری:
                </label>
                <input
                  type="text"
                  value={opRole}
                  onChange={(e) => setOpRole(e.target.value)}
                  placeholder="مثال: اپراتور مونتاژ برد SMD، تست و کالیبراسیون"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وضعیت فعالیت:
                </label>
                <select
                  value={opStatus}
                  onChange={(e) => setOpStatus(e.target.value as 'Active' | 'Off' | 'OnLeave')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Active">🟢 فعال و حاضر در خط</option>
                  <option value="OnLeave">🟡 مرخصی</option>
                  <option value="Off">⚪ شیفت تعطیل / غیرفعال</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOperatorModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  {editingOperatorId ? 'ذخیره تغییرات اپراتور' : 'افزودن به لیست اپراتورها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADMIN RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2 text-amber-700">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {isFa ? 'بازنشانی امن کلمه عبور کاربر' : 'Admin Password Reset'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {resetModalUser.fullName} (@{resetModalUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setResetModalUser(null);
                  setResetStatusMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {resetStatusMsg && (
              <div className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 ${
                resetStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {resetStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{resetStatusMsg.text}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resetNewPassword || resetNewPassword.length < 4) {
                  setResetStatusMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
                  return;
                }
                const res = adminResetPassword(resetModalUser.id, resetNewPassword);
                if (res.success) {
                  setResetStatusMsg({ type: 'success', text: res.message });
                  setTimeout(() => {
                    setResetModalUser(null);
                    setResetStatusMsg(null);
                  }, 1200);
                } else {
                  setResetStatusMsg({ type: 'error', text: res.message });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFa ? 'کلمه عبور جدید:' : 'New Password:'}
                </label>
                <div className="relative">
                  <input
                    type={showResetNewPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-3 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showResetNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {resetNewPassword.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      قدرت رمز:{' '}
                      <strong className={
                        evaluatePasswordStrength(resetNewPassword).score >= 3 ? 'text-emerald-600' :
                        evaluatePasswordStrength(resetNewPassword).score === 2 ? 'text-amber-600' : 'text-rose-500'
                      }>
                        {evaluatePasswordStrength(resetNewPassword).label}
                      </strong>
                    </span>
                    <div className="flex gap-1 w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          evaluatePasswordStrength(resetNewPassword).score >= 3 ? 'bg-emerald-500 w-full' :
                          evaluatePasswordStrength(resetNewPassword).score === 2 ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-600" />
                  <span>استاندارد امنیتی AnbarMeh:</span>
                </div>
                <p>
                  رمز عبور با سالت منحصر‌به‌فرد نام کاربری هش می‌شود و به هیچ عنوان به صورت متن خام در سرور یا دیتابیس ذخیره نخواهد شد.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null);
                    setResetStatusMsg(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isFa ? 'ثبت و رمزنگاری رمز جدید' : 'Set New Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

