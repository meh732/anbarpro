import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Operator } from '../types';
import { 
  Users, Award, TrendingUp, Clock, Factory, CheckCircle2, UserCheck,
  Plus, Pencil, Trash2, XCircle, ShieldAlert
} from 'lucide-react';

export const OperatorPerformanceView: React.FC = () => {
  const { 
    operators, productionLogs, projects, items,
    addOperator, updateOperator, deleteOperator, hasActionPermission
  } = useApp();

  const canAdd = hasActionPermission('add');
  const canEdit = hasActionPermission('edit');
  const canDelete = hasActionPermission('delete');

  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month' | 'total'>('total');

  // Operator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [opName, setOpName] = useState('');
  const [opCode, setOpCode] = useState('');
  const [opShift, setOpShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [opRole, setOpRole] = useState('اپراتور خط مونتاژ و تست قطعات');
  const [opStatus, setOpStatus] = useState<'Active' | 'Off' | 'OnLeave'>('Active');
  const [opProjects, setOpProjects] = useState<string[]>(['PRJ-01']);

  const handleOpenAddModal = () => {
    setEditingOperatorId(null);
    setOpName('');
    setOpCode(`OP-${100 + operators.length + 1}`);
    setOpShift('Morning');
    setOpRole('اپراتور خط مونتاژ برد SMD و دیپ');
    setOpStatus('Active');
    setOpProjects(['PRJ-01']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (op: Operator) => {
    setEditingOperatorId(op.id);
    setOpName(op.name);
    setOpCode(op.code);
    setOpShift(op.shift);
    setOpRole(op.role);
    setOpStatus(op.status);
    setOpProjects(op.activeProjects || ['PRJ-01']);
    setIsModalOpen(true);
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
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            گزارش کارکرد، بازدهی و عملکرد اپراتورهای خط تولید
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            سنجش دقیق تیراژ قطعات و بردهای مونتاژشده، ساعت کارکرد، نرخ ضایعات و ثبت اپراتورهای خط (بدون نیاز به نام کاربری و رمز)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedTimeframe('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedTimeframe === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              امروز
            </button>
            <button
              onClick={() => setSelectedTimeframe('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedTimeframe === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              این هفته
            </button>
            <button
              onClick={() => setSelectedTimeframe('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedTimeframe === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              این ماه
            </button>
            <button
              onClick={() => setSelectedTimeframe('total')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedTimeframe === 'total' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              کل کارکرد
            </button>
          </div>

          {canAdd && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف اپراتور جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Operator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {operators.map(op => {
          // Calculate filtered production logs for this operator
          const opLogs = productionLogs.filter(p => p.operatorId === op.id || p.operatorName === op.name);
          const totalPieces = opLogs.reduce((s, c) => s + c.quantityProduced, 0);
          const totalScrap = opLogs.reduce((s, c) => s + c.quantityScrapped, 0);
          const scrapRate = totalPieces > 0 ? ((totalScrap / (totalPieces + totalScrap)) * 100).toFixed(1) : '0';

          return (
            <div key={op.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-sm flex items-center justify-center">
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{op.name}</h3>
                      <p className="text-[10px] text-indigo-600 font-mono font-semibold">{op.code}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
                    {op.shift === 'Morning' ? 'شیفت صبح' : op.shift === 'Evening' ? 'شیفت عصر' : 'شیفت شب'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  {op.role}
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">تیراژ تولید شده</span>
                    <strong className="text-emerald-600 font-mono text-sm font-bold">
                      {(op.totalProducedPieces + totalPieces).toLocaleString('fa-IR')} عدد
                    </strong>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">ساعت کارکرد</span>
                    <strong className="text-indigo-600 font-mono text-sm font-bold">
                      {op.totalWorkingHours.toLocaleString('fa-IR')} ساعت
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>نرخ ضایعات تولید:</span>
                    <strong className={`font-mono ${Number(scrapRate) > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {scrapRate}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>پروژه‌های کاری:</span>
                    <strong className="text-slate-800">{op.activeProjects?.join(', ') || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* Operator Edit / Delete Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
                {canEdit && (
                  <button
                    onClick={() => handleOpenEditModal(op)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                    title="ویرایش اپراتور"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ویرایش</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => {
                      if (window.confirm(`آیا از حذف اپراتور "${op.name}" اطمینان دارید؟`)) {
                        deleteOperator(op.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                    title="حذف اپراتور"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Operator Detailed Production Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          ریز ثبت لاگ‌های تولید اپراتورها در خطوط مونتاژ
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3">تاریخ و زمان</th>
                <th className="whitespace-nowrap p-3">نام اپراتور</th>
                <th className="whitespace-nowrap p-3">شیفت کاری</th>
                <th className="whitespace-nowrap p-3">پروژه</th>
                <th className="whitespace-nowrap p-3">کالای خروجی</th>
                <th className="whitespace-nowrap p-3">تولید سالم</th>
                <th className="whitespace-nowrap p-3">ضایعات</th>
                <th className="whitespace-nowrap p-3">کد دستگاه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    هیچ ثبت تولیدی تاکنون انجام نشده است.
                  </td>
                </tr>
              ) : (
                productionLogs.map(log => {
                  const item = items.find(i => i.id === log.finishedItemId);
                  const proj = projects.find(p => p.id === log.projectId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap p-3 font-mono text-slate-500">{log.date} - {log.time}</td>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-900">{log.operatorName}</td>
                      <td className="whitespace-nowrap p-3 text-slate-500">{log.shift === 'Morning' ? 'صبح' : log.shift === 'Evening' ? 'عصر' : 'شب'}</td>
                      <td className="whitespace-nowrap p-3 text-indigo-600 font-medium">{proj?.code || log.projectId}</td>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-800">{item?.name || log.finishedItemId}</td>
                      <td className="whitespace-nowrap p-3 font-mono font-bold text-emerald-600">{log.quantityProduced.toLocaleString('fa-IR')} {item?.unit}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-rose-600">{log.quantityScrapped.toLocaleString('fa-IR')} {item?.unit}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-slate-500">{log.machineCode}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Add / Edit Modal */}
      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
