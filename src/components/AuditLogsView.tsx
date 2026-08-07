import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Search, FileText, User, 
  Calendar, CheckCircle2, Lock 
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const term = (searchTerm || '').toLowerCase();
    return (
      (log.userFullName || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            سیستم ثبت لاگ‌های نظارتی و امنیت (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            پایش غیرقابل تغییر تمام اقدامات کاربران، صدور حواله‌ها، ویرایش موجودی و تغییر دسترسی‌ها
          </p>
        </div>

        <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          SYSTEM_SECURE
        </span>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام کاربر، نوع عملیات، تغییرات یا جزئیات..."
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="whitespace-nowrap p-3.5">زمان و تاریخ</th>
                <th className="whitespace-nowrap p-3.5">کاربر</th>
                <th className="whitespace-nowrap p-3.5">نقش</th>
                <th className="whitespace-nowrap p-3.5">عنوان اقدام</th>
                <th className="whitespace-nowrap p-3.5">جزئیات و تغییرات ثبت‌شده</th>
                <th className="whitespace-nowrap p-3.5">IP / ماژول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    هیچ لاگی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap p-3.5 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="whitespace-nowrap p-3.5 font-bold text-slate-900">{log.userFullName}</td>
                    <td className="whitespace-nowrap p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3.5 font-bold text-indigo-600">{log.action}</td>
                    <td className="whitespace-nowrap p-3.5 text-slate-700 leading-relaxed">{log.details}</td>
                    <td className="whitespace-nowrap p-3.5 font-mono text-slate-400">{log.ipAddress || '192.168.1.100'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
