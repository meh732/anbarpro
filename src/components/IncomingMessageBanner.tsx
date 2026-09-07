import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, X, Volume2, ArrowLeft, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react';
import { soundEngine } from '../utils/browserNotifications';

export const IncomingMessageBanner: React.FC = () => {
  const { 
    incomingChatAlert, 
    dismissIncomingChatAlert, 
    openChatWithUser 
  } = useApp();

  const [progress, setProgress] = useState<number>(100);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const TOTAL_DURATION = 9000; // 9 seconds

  useEffect(() => {
    if (!incomingChatAlert) {
      setProgress(100);
      return;
    }

    setProgress(100);
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (isHovered) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / TOTAL_DURATION) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        dismissIncomingChatAlert();
      }
    }, 100);

    timerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [incomingChatAlert, isHovered, dismissIncomingChatAlert]);

  if (!incomingChatAlert) return null;

  const handleReplyClick = () => {
    openChatWithUser(incomingChatAlert.senderId);
    dismissIncomingChatAlert();
  };

  const handleReplaySound = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.play('urgent_message');
  };

  return (
    <div 
      id="incoming-chat-alert-banner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        startTimeRef.current = Date.now() - ((100 - progress) / 100) * TOTAL_DURATION;
      }}
      className="fixed top-5 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[9999] w-[94vw] max-w-md animate-in slide-in-from-top-6 fade-in duration-300 select-none shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border-2 border-emerald-500/80 overflow-hidden ring-4 ring-emerald-500/15"
      dir="rtl"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-2.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
          </span>
          <span className="font-black text-xs tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>پیام جدید و فوری</span>
          </span>
          {incomingChatAlert.unreadCount && incomingChatAlert.unreadCount > 1 && (
            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              +{incomingChatAlert.unreadCount} پیام
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-emerald-100">
          <span className="text-[11px] font-mono opacity-90">{incomingChatAlert.timestamp}</span>
          <button
            onClick={handleReplaySound}
            title="پخش مجدد صدای اعلان"
            className="p-1 rounded-lg hover:bg-white/15 text-emerald-100 hover:text-white transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissIncomingChatAlert}
            title="بستن اعلان"
            className="p-1 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Body */}
      <div className="p-4 bg-gradient-to-b from-white to-slate-50/50">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md ring-2 ring-emerald-100">
            {incomingChatAlert.senderName ? incomingChatAlert.senderName.charAt(0) : <UserIcon className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <h4 className="font-black text-sm text-slate-900 truncate">
                {incomingChatAlert.senderName}
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                {(incomingChatAlert.senderRole as string) === 'SystemAdmin' ? 'مدیر ارشد' :
                 (incomingChatAlert.senderRole as string) === 'WarehouseManager' ? 'مدیر انبار' :
                 (incomingChatAlert.senderRole as string) === 'PlantManager' ? 'مدیر کارخانه' :
                 (incomingChatAlert.senderRole as string) === 'Purchasing' ? 'واحد بازرگانی' :
                 (incomingChatAlert.senderRole as string) === 'QC' ? 'کنترل کیفیت' : 'همکار'}
              </span>
            </div>

            {/* Message Bubble Preview */}
            <div className="bg-slate-100/90 rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed font-medium line-clamp-3 border border-slate-200/70 shadow-xs">
              {incomingChatAlert.message}
            </div>
          </div>
        </div>

        {/* Quick Action Footer */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={handleReplyClick}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs py-2.5 px-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <MessageSquare className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>مشاهده گفتگو و پاسخ سریع</span>
            <ArrowLeft className="w-3.5 h-3.5 opacity-70 group-hover:-translate-x-1 transition-transform" />
          </button>

          <button
            onClick={dismissIncomingChatAlert}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            بعداً
          </button>
        </div>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      <div className="h-1 w-full bg-slate-100">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
