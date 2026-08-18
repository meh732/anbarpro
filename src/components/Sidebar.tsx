import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutGrid, Boxes, ClipboardList, Warehouse, ArrowDownUp,
  ArrowLeftRight, ClipboardCheck, Factory, Cpu, FileCheck,
  Building2, Users, SearchCheck, BarChart3, ShieldCheck,
  Settings, Terminal, ChevronDown, ChevronLeft, ChevronRight,
  LogOut, QrCode, Search, Sparkles, X, User as UserIcon
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  setIsOpenMobile,
  isCollapsed,
  setIsCollapsed,
}) => {
  const {
    activeTab,
    setActiveTab,
    hasTabPermission,
    currentUser,
    users,
    setCurrentUser,
    logout,
    setIsScannerOpen,
    companyName,
    items,
    inventory,
    purchaseRequests,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Calculate live badges
  const lowStockCount = useMemo(() => {
    return items.filter(it => {
      const totalQty = inventory.filter(i => i.itemId === it.id).reduce((s, c) => s + c.quantity, 0);
      return totalQty <= it.minStock;
    }).length;
  }, [items, inventory]);

  const pendingRequestsCount = useMemo(() => {
    return purchaseRequests.filter(r => r.status === 'Pending').length;
  }, [purchaseRequests]);

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'میز کار',
      items: [
        { id: 'dashboard', label: 'داشبورد مدیریت', icon: LayoutGrid },
      ],
    },
    {
      title: 'انبار و موجودی',
      items: [
        { 
          id: 'items', 
          label: 'کالاها و قطعات', 
          icon: Boxes, 
          badge: lowStockCount > 0 ? `${lowStockCount} کمبود` : undefined,
          badgeColor: 'bg-rose-500/90 text-white'
        },
        { id: 'kardex', label: 'کاردکس کالاها', icon: ClipboardList },
        { id: 'warehouses', label: 'انبارها و فضاها', icon: Warehouse },
        { id: 'stock_movement', label: 'ورود و خروج کالا', icon: ArrowDownUp },
        { id: 'transfers', label: 'انتقال بین انبارها', icon: ArrowLeftRight },
        { id: 'stock_counting', label: 'انبارگردانی', icon: ClipboardCheck },
      ],
    },
    {
      title: 'تولید و تأمین',
      items: [
        { id: 'projects', label: 'پروژه‌های تولید', icon: Factory },
        { id: 'bom', label: 'فرمول ساخت (BOM)', icon: Cpu },
        { 
          id: 'requests', 
          label: 'درخواست‌های خرید', 
          icon: FileCheck,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          badgeColor: 'bg-amber-500 text-white'
        },
        { id: 'contractors', label: 'پیمانکاران', icon: Building2 },
      ],
    },
    {
      title: 'عملیات و ردیابی',
      items: [
        { id: 'operator_logger', label: 'ثبت شیفت اپراتور', icon: ClipboardList },
        { id: 'operator_perf', label: 'راندمان اپراتورها', icon: Users },
        { id: 'traceability', label: 'رهگیری قطعات و سریال', icon: SearchCheck },
      ],
    },
    {
      title: 'سیستم و گزارشات',
      items: [
        { id: 'reports', label: 'گزارشات جامع', icon: BarChart3 },
        { id: 'audit_backup', label: 'لاگ‌ها و امنیت', icon: ShieldCheck },
        { id: 'backup', label: 'تنظیمات و پشتیبان', icon: Settings },
      ],
    },
  ], [lowStockCount, pendingRequestsCount]);

  const roleLabels: Record<string, string> = {
    superadmin: 'مدیر کل سیستم',
    admin: 'مدیر تولید و انبار',
    manager: 'سرپرست انبار',
    operator: 'اپراتور خط',
  };

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (isOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  // Filter sections by search query and user permissions
  const filteredSections = useMemo(() => {
    return navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          const hasPerm = hasTabPermission(item.id);
          if (!hasPerm) return false;
          if (!searchQuery.trim()) return true;
          return item.label.toLowerCase().includes(searchQuery.toLowerCase().trim());
        }),
      }))
      .filter(section => section.items.length > 0);
  }, [navSections, hasTabPermission, searchQuery]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 flex flex-col bg-white/70 backdrop-blur-2xl border-l border-white/60 shadow-2xl transition-all duration-300 ease-in-out
          ${isOpenMobile ? 'translate-x-0 w-72' : 'translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        `}
      >
        {/* Header / Brand */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200/50 relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0 flex items-center justify-center text-white">
              <Boxes className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-black text-slate-900 text-lg tracking-tight truncate">
                  {companyName || 'انبار هوشمند'}
                </span>
                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> سیستم یکپارچه ERP
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-white border border-slate-200/60 rounded-lg shadow-xs transition-all cursor-pointer absolute -left-3.5 top-6.5 z-10"
            title={isCollapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action: Barcode Scanner & Search */}
        {!isCollapsed ? (
          <div className="p-3 space-y-2 border-b border-slate-200/40">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی منوها..."
                className="w-full pl-3 pr-9 py-2 bg-slate-100/70 focus:bg-white text-xs font-bold rounded-xl border border-transparent focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-hidden text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Barcode Scanner Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer active:scale-98"
            >
              <QrCode className="w-4 h-4" />
              <span>اسکن سریع بارکد</span>
            </button>
          </div>
        ) : (
          <div className="p-2 border-b border-slate-200/40 flex justify-center">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 hover:scale-105 transition-all cursor-pointer"
              title="اسکن سریع بارکد"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Links (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
          {filteredSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer relative group
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 font-black scale-[1.01]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent hover:border-white/60'
                      }
                      ${isCollapsed ? 'justify-center px-0' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`} />
                    
                    {!isCollapsed && (
                      <span className="truncate flex-1 text-right text-xs md:text-sm font-black">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Tooltip / Dot Badge */}
                    {isCollapsed && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Switcher (Bottom) */}
        <div className="p-3 border-t border-slate-200/50 bg-white/40 backdrop-blur-md relative">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/80 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer ${isCollapsed ? 'justify-center p-1.5' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 text-right overflow-hidden">
                  <div className="text-xs font-black text-slate-900 truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 truncate">
                    {roleLabels[currentUser.role] || currentUser.role}
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {/* User Dropdown / Switcher */}
            {showUserMenu && (
              <div className={`absolute bottom-full right-0 mb-2 w-64 glass-dropdown rounded-2xl shadow-xl z-50 p-2 border border-white/60 animate-fadeIn ${isCollapsed ? 'right-0' : 'right-0 w-64'}`}>
                <div className="p-3 bg-white/50 rounded-xl mb-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black text-slate-900 truncate">{currentUser.fullName}</div>
                    <div className="text-[10px] text-slate-500">@{currentUser.username}</div>
                  </div>
                </div>

                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                  تغییر سریع کاربر
                </div>
                <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 my-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-right p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        currentUser.id === u.id
                          ? 'bg-indigo-50 text-indigo-700 font-black'
                          : 'hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.fullName}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-medium">
                        {roleLabels[u.role] || u.role}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-200/50 pt-2 mt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>خروج از سیستم</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
