cat << 'DASH_EOF' > src/components/DashboardView.tsx
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes, Warehouse, ArrowDownUp, FileCheck, ArrowLeftRight,
  Factory, Building2, Cpu, ClipboardList, Users, SearchCheck,
  Settings, ShieldCheck, ClipboardCheck, LayoutGrid, Package, AlertTriangle, Activity, TrendingUp, TrendingDown, Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const DashboardView: React.FC = () => {
  const { setActiveTab, hasTabPermission, items, purchaseRequests, inventory, notifications } = useApp();

  const tiles = [
    { id: 'items', label: 'کالاها و قطعات', icon: Boxes, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { id: 'warehouses', label: 'انبارها و فضاها', icon: Warehouse, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/30' },
    { id: 'stock_movement', label: 'ورود و خروج', icon: ArrowDownUp, color: 'from-violet-500 to-purple-600', shadow: 'shadow-purple-500/30' },
    { id: 'transfers', label: 'انتقال بین انبار', icon: ArrowLeftRight, color: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/30' },
    { id: 'requests', label: 'درخواست‌های خرید', icon: FileCheck, color: 'from-rose-400 to-red-500', shadow: 'shadow-red-500/30' },
    { id: 'projects', label: 'پروژه‌های تولید', icon: Factory, color: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' },
    { id: 'contractors', label: 'پیمانکاران', icon: Building2, color: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-pink-500/30' },
    { id: 'bom', label: 'فرمول ساخت (BOM)', icon: Cpu, color: 'from-indigo-400 to-blue-600', shadow: 'shadow-indigo-500/30' },
    { id: 'operator_logger', label: 'ثبت شیفت اپراتور', icon: ClipboardList, color: 'from-teal-400 to-emerald-500', shadow: 'shadow-teal-500/30' },
    { id: 'operator_perf', label: 'راندمان اپراتور', icon: Users, color: 'from-orange-400 to-rose-500', shadow: 'shadow-orange-500/30' },
    { id: 'traceability', label: 'رهگیری قطعات', icon: SearchCheck, color: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/30' },
    { id: 'stock_counting', label: 'انبارگردانی', icon: ClipboardCheck, color: 'from-gray-600 to-slate-700', shadow: 'shadow-slate-500/30' },
    { id: 'backup', label: 'تنظیمات سیستم', icon: Settings, color: 'from-slate-700 to-zinc-900', shadow: 'shadow-zinc-500/30' },
  ];

  const lowStockCount = useMemo(() => {
    return items.filter(it => {
      const totalQty = inventory.filter(i => i.itemId === it.id).reduce((s, c) => s + c.quantity, 0);
      return totalQty <= it.minStock;
    }).length;
  }, [items, inventory]);

  const pendingReqs = purchaseRequests.filter(r => r.status === 'Pending').length;

  // Mock chart data for visual appeal
  const chartData = [
    { name: 'شنبه', ورود: 4000, خروج: 2400 },
    { name: 'یکشنبه', ورود: 3000, خروج: 1398 },
    { name: 'دوشنبه', ورود: 2000, خروج: 9800 },
    { name: 'سه‌شنبه', ورود: 2780, خروج: 3908 },
    { name: 'چهارشنبه', ورود: 1890, خروج: 4800 },
    { name: 'پنجشنبه', ورود: 2390, خروج: 3800 },
    { name: 'جمعه', ورود: 3490, خروج: 4300 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Overview Stats & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none group-hover:bg-blue-100 transition-colors duration-700"></div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-black text-slate-800">جریان انبار</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">آمار ورود و خروج هفتگی</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <span className="px-3 py-1 bg-white shadow-sm rounded-lg text-sm font-bold text-blue-600">هفته جاری</span>
              <span className="px-3 py-1 text-sm font-bold text-slate-500 cursor-pointer hover:text-slate-700">ماه گذشته</span>
            </div>
          </div>
          
          <div className="h-64 w-full relative z-10" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                  labelStyle={{ color: '#0f172a', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="ورود" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="خروج" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Widgets - 1 column */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2rem] p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-white/80 font-bold mb-1">هشدار موجودی</p>
                <h3 className="text-4xl font-black">{lowStockCount}</h3>
                <p className="text-sm mt-3 font-medium bg-white/20 inline-block px-3 py-1 rounded-lg backdrop-blur-md">نیازمند تامین فوری</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex-1 flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-50 rounded-full blur-3xl opacity-60"></div>
            <div className="relative z-10 flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-500 font-bold mb-1">درخواست‌های باز</p>
                <h3 className="text-3xl font-black text-slate-800">{pendingReqs}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            
            <div className="mt-auto relative z-10">
              <button onClick={() => setActiveTab('requests')} className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                بررسی درخواست‌ها
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 px-2">
        <LayoutGrid className="w-6 h-6 text-slate-400" />
        <h2 className="text-xl font-black text-slate-800 tracking-tight">ماژول‌های سیستم</h2>
      </div>

      {/* Colorful Tiles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {tiles.map((tile) => {
          if (!hasTabPermission(tile.id)) return null;
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => setActiveTab(tile.id)}
              className={`relative overflow-hidden group rounded-[2rem] p-5 md:p-6 text-right flex flex-col items-start justify-between min-h-[160px] cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-[1.03] shadow-lg ${tile.shadow} bg-gradient-to-br ${tile.color}`}
            >
              {/* Glassmorphism abstract shape */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-[0.03] rounded-tr-[4rem] group-hover:scale-110 transition-transform origin-bottom-left"></div>
              
              <div className="bg-white/20 backdrop-blur-md p-3.5 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-inner border border-white/20">
                <Icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-white font-black text-lg md:text-xl tracking-tight z-10 leading-tight">{tile.label}</h3>
              
              <div className="absolute bottom-5 left-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
DASH_EOF
bash -c "npm run lint && npm run build"
