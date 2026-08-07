import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Terminal, Copy, Check, Server, Download, Globe } from 'lucide-react';

export const LinuxInstallerView: React.FC = () => {
  const { t, language } = useApp();
  const isFa = language === 'fa';

  const [copiedCmd, setCopiedCmd] = useState(false);

  const installCommand = `bash <(curl -Ls https://raw.githubusercontent.com/meh732/anbarpro/main/install.sh)`;
  const gitCloneCommand = `git clone https://github.com/meh732/anbarpro.git && cd anbarpro && chmod +x deploy.sh && ./deploy.sh`;

  const [copiedType, setCopiedType] = useState<'curl' | 'git' | null>(null);

  const copyToClipboard = (text: string, type: 'curl' | 'git') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-blue-500/5 rounded-bl-[100px] -z-10" />
        
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
            <Server className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {isFa ? 'نصب مستقیم روی لینوکس (سرور ابری)' : 'Direct Linux Installation (Cloud Server)'}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl font-medium">
              {isFa 
                ? 'با اجرای دستور زیر در ترمینال سرور خود، سیستم به صورت خودکار دانلود، نصب و روی IP یا دامنه شما (پورت ۸۰) بالا خواهد آمد و نیازی به هیچگونه تنظیمات دستی نیست.'
                : 'Run the command below in your server terminal. The system will automatically download, install, and run on your IP or domain (Port 80) without manual setup.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Command Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isFa ? 'روش‌های نصب خودکار روی سرور لینوکس' : 'Automated Linux Server Installation Methods'}
          </h2>
        </div>

        {/* Method 1: Curl */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            {isFa ? 'روش اول: نصب مستقیم با Curl (تک خطی)' : 'Method 1: Direct installation via Curl (One-Liner)'}
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative group">
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">root@server:~#</span>
            </div>
            
            <code className="text-sm md:text-base font-mono text-emerald-400 block break-all leading-relaxed" dir="ltr">
              {installCommand}
            </code>

            <button
              onClick={() => copyToClipboard(installCommand, 'curl')}
              className={`absolute top-4 ${isFa ? 'left-4' : 'right-4'} px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                copiedType === 'curl'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {copiedType === 'curl' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isFa ? 'کپی شد' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{isFa ? 'کپی دستور' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Method 2: Git Clone */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            {isFa ? 'روش دوم: کلون کردن مخزن گیت و اجرای سناریو' : 'Method 2: Git Clone & Execute Scenario'}
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative group">
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">root@server:~#</span>
            </div>
            
            <code className="text-sm md:text-base font-mono text-indigo-300 block break-all leading-relaxed" dir="ltr">
              {gitCloneCommand}
            </code>

            <button
              onClick={() => copyToClipboard(gitCloneCommand, 'git')}
              className={`absolute top-4 ${isFa ? 'left-4' : 'right-4'} px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                copiedType === 'git'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {copiedType === 'git' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isFa ? 'کپی شد' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{isFa ? 'کپی دستور' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Note block */}
        <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-5 flex items-start gap-4">
          <Globe className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">
              {isFa ? 'اطلاعات مخزن متصل شده:' : 'Connected Repository Information:'}
            </h3>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
              {isFa 
                ? 'کدهای فوق به صورت کاملاً زنده به مخزن رسمی شما در گیت‌هاب (https://github.com/meh732/anbarpro.git) متصل هستند. هر تغییری که روی این مخزن اعمال کنید، در زمان نصب مجدد روی سرورهای جدید فوراً اعمال خواهد شد.'
                : 'The scripts above are linked directly to your official GitHub repository (https://github.com/meh732/anbarpro.git). Any updates pushed to this repository will be instantly available on new server deployments.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
