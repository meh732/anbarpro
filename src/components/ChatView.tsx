import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage, ChatAttachment, User } from '../types';
import { 
  MessageSquare, Send, Paperclip, Smile, Hash, Users, Search, 
  Trash2, Reply, Check, CheckCheck, Sparkles, X, Plus, Package, 
  FileText, ArrowLeftRight, Bell, Volume2, VolumeX, ShieldAlert,
  ChevronDown, ExternalLink, CornerDownLeft, ArrowRight, Phone,
  Info, Sparkle, UserCheck, LogIn, LogOut, Clock, QrCode, ScanLine,
  UserX, Briefcase, ListFilter, CheckCircle2, ShieldCheck, Calendar,
  Printer, UserPlus
} from 'lucide-react';
import { soundEngine } from '../utils/browserNotifications';

export const ChatView: React.FC = () => {
  const {
    currentUser,
    users,
    operators,
    messages,
    channels,
    sendChatMessage,
    deleteChatMessage,
    toggleMessageReaction,
    items,
    transfers,
    purchaseRequests,
    setActiveTab,
    browserNotificationPermission,
    requestNotificationPermission,
    soundEnabled,
    setSoundEnabled,
    activeChatRecipientId,
    setActiveChatRecipientId,
    setIsScannerOpen
  } = useApp();

  // Active channel or recipient
  const [activeChannelId, setActiveChannelId] = useState<string>('staff-coordination');
  const [activeDirectUserId, setActiveDirectUserId] = useState<string | null>(null);

  // Sync external direct chat request (e.g. from notification click or banner)
  useEffect(() => {
    if (activeChatRecipientId) {
      setActiveDirectUserId(activeChatRecipientId);
      setActiveTabFilter('direct');
      setMobileView('chat');
      setActiveChatRecipientId(null);
    }
  }, [activeChatRecipientId, setActiveChatRecipientId]);

  // Mobile state: 'list' (shows channel/user list) or 'chat' (shows active thread)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [activeTabFilter, setActiveTabFilter] = useState<'channels' | 'direct'>('channels');

  // Message input state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'item' | 'request' | 'transfer'>('item');
  const [attachSearchQuery, setAttachSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fallback channels ensuring staff-coordination exists even with old cached states
  const displayChannels = useMemo(() => {
    if (channels.some(c => c.id === 'staff-coordination')) return channels;
    return [
      channels[0] || { id: 'general', name: 'اطلاعیه‌ها و عمومی سازمان', description: 'کانال عمومی هماهنگی پرسنل و کارخانه', icon: 'Megaphone' },
      {
        id: 'staff-coordination',
        name: 'هماهنگی پرسنل و تردد شیفت',
        description: 'کانال اختصاصی ثبت ورود و خروج شیفت، اعلام حضور و هماهنگی تردد پرسنل کارخانه و انبار',
        icon: 'Users'
      },
      ...channels.slice(1)
    ];
  }, [channels]);

  const currentChannel = useMemo(() => {
    if (activeDirectUserId) return null;
    return displayChannels.find(c => c.id === activeChannelId) || displayChannels[0];
  }, [displayChannels, activeChannelId, activeDirectUserId]);

  const isPersonnelChannel = useMemo(() => {
    if (activeDirectUserId) return false;
    return currentChannel?.id === 'staff-coordination' || 
           currentChannel?.name.includes('پرسنل') || 
           currentChannel?.name.includes('شیفت') ||
           currentChannel?.name.includes('تردد');
  }, [activeDirectUserId, currentChannel]);

  // Personnel Attendance & Coordination State
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'attendance'>('all');

  const [attendanceStatus, setAttendanceStatus] = useState<{
    isClockedIn: boolean;
    clockInTime?: string;
    shift?: string;
    station?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem(`staff_attendance_${currentUser.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isClockedIn: true,
      clockInTime: '۰۸:۰۰',
      shift: 'صبح (۰۷:۰۰ الی ۱۵:۰۰)',
      station: currentUser.department || 'انبار مرکزی'
    };
  });

  // Modal dialog states
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showBarcodePersonnelModal, setShowBarcodePersonnelModal] = useState(false);
  const [showStaffListModal, setShowStaffListModal] = useState(false);

  // Form states
  const [clockInShift, setClockInShift] = useState('صبح (۰۷:۰۰ الی ۱۵:۰۰)');
  const [clockInStation, setClockInStation] = useState('انبار مرکزی قطعات');
  const [clockInNote, setClockInNote] = useState('');
  const [clockOutNote, setClockOutNote] = useState('');

  const [missionType, setMissionType] = useState('مأموریت اداری / بازرگانی');
  const [missionDuration, setMissionDuration] = useState('۲ ساعت');
  const [missionNote, setMissionNote] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedPersonnelCode, setSelectedPersonnelCode] = useState('');
  const [barcodeActionType, setBarcodeActionType] = useState<'in' | 'out'>('in');

  // Present staff list
  const [presentStaffList, setPresentStaffList] = useState<Array<{
    id: string;
    name: string;
    role: string;
    shift: string;
    station: string;
    entryTime: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('present_staff_shift_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: currentUser.id, name: currentUser.fullName, role: currentUser.role, shift: 'صبح (۰۷:۰۰ الی ۱۵:۰۰)', station: currentUser.department || 'انبار و لجستیک', entryTime: '۰۷:۵۵' },
      { id: 'op-1', name: 'علی محمدی', role: 'اپراتور ارشد خط مونتاژ', shift: 'صبح (۰۷:۰۰ الی ۱۵:۰۰)', station: 'خط مونتاژ ۱', entryTime: '۰۷:۴۵' },
      { id: 'op-2', name: 'رضا قاسمی', role: 'تکنیسین تست و کالیبراسیون', shift: 'عصر (۱۵:۰۰ الی ۲۳:۰۰)', station: 'ایستگاه تست', entryTime: '۱۴:۵۰' }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeDirectUser = useMemo(() => {
    if (!activeDirectUserId) return null;
    return users.find(u => u.id === activeDirectUserId) || null;
  }, [users, activeDirectUserId]);

  // Filter messages for active channel or direct chat + attendance filter
  const filteredMessages = useMemo(() => {
    let list: ChatMessage[] = [];
    if (activeDirectUserId) {
      list = messages.filter(m => 
        (m.senderId === currentUser.id && m.recipientId === activeDirectUserId) ||
        (m.senderId === activeDirectUserId && m.recipientId === currentUser.id)
      );
    } else {
      list = messages.filter(m => m.channelId === activeChannelId);
    }

    if (isPersonnelChannel && attendanceFilter === 'attendance') {
      return list.filter(m => 
        m.message.includes('[ثبت ورود') ||
        m.message.includes('[ثبت خروج') ||
        m.message.includes('[خروج موقت') ||
        m.message.includes('[ثبت تردد') ||
        m.message.includes('ورود') ||
        m.message.includes('خروج') ||
        m.message.includes('شیفت')
      );
    }

    return list;
  }, [messages, activeChannelId, activeDirectUserId, currentUser.id, isPersonnelChannel, attendanceFilter]);

  // Attendance Actions Handlers
  const handleConfirmClockIn = async () => {
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('fa-IR');
    
    const newStatus = {
      isClockedIn: true,
      clockInTime: timeStr,
      shift: clockInShift,
      station: clockInStation,
    };
    setAttendanceStatus(newStatus);
    try {
      localStorage.setItem(`staff_attendance_${currentUser.id}`, JSON.stringify(newStatus));
    } catch {}

    setPresentStaffList(prev => {
      const filtered = prev.filter(p => p.id !== currentUser.id);
      const updated = [
        ...filtered,
        {
          id: currentUser.id,
          name: currentUser.fullName,
          role: currentUser.role,
          shift: clockInShift,
          station: clockInStation,
          entryTime: timeStr,
        }
      ];
      try {
        localStorage.setItem('present_staff_shift_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const msgText = `🟢 [ثبت ورود به شیفت] همکار گرامی «${currentUser.fullName}» (${currentUser.role}) | شیفت: ${clockInShift} | بخش: ${clockInStation} | زمان: ${dateStr} - ${timeStr}${clockInNote ? ` | توضیحات: ${clockInNote}` : ''}`;
    
    await sendChatMessage({
      message: msgText,
      channelId: activeChannelId,
    });

    setShowClockInModal(false);
    setClockInNote('');
  };

  const handleConfirmClockOut = async () => {
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('fa-IR');
    
    const newStatus = {
      isClockedIn: false,
    };
    setAttendanceStatus(newStatus);
    try {
      localStorage.setItem(`staff_attendance_${currentUser.id}`, JSON.stringify(newStatus));
    } catch {}

    setPresentStaffList(prev => {
      const updated = prev.filter(p => p.id !== currentUser.id);
      try {
        localStorage.setItem('present_staff_shift_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const msgText = `🔴 [ثبت خروج از شیفت] همکار گرامی «${currentUser.fullName}» (${currentUser.role}) | پایان شیفت: ${attendanceStatus.shift || 'جاری'} | زمان خروج: ${dateStr} - ${timeStr}${clockOutNote ? ` | گزارش تحویل: ${clockOutNote}` : ''}`;
    
    await sendChatMessage({
      message: msgText,
      channelId: activeChannelId,
    });

    setShowClockOutModal(false);
    setClockOutNote('');
  };

  const handleConfirmMission = async () => {
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    const msgText = `🟡 [خروج موقت / مأموریت ساعتی] همکار گرامی «${currentUser.fullName}» (${currentUser.role}) | نوع: ${missionType} | مدت تقریبی: ${missionDuration} | ساعت خروج: ${timeStr}${missionNote ? ` | شرح مأموریت: ${missionNote}` : ''}`;
    
    await sendChatMessage({
      message: msgText,
      channelId: activeChannelId,
    });

    setShowMissionModal(false);
    setMissionNote('');
  };

  const handleConfirmBarcodeAttendance = async () => {
    const code = barcodeInput.trim() || selectedPersonnelCode;
    if (!code) return;

    const matchedOperator = operators.find(op => op.code.toLowerCase() === code.toLowerCase() || op.name.includes(code));
    const matchedUser = users.find(u => u.username.toLowerCase() === code.toLowerCase() || u.fullName.includes(code) || u.id.toLowerCase() === code.toLowerCase());
    
    const staffName = matchedOperator ? matchedOperator.name : (matchedUser ? matchedUser.fullName : `پرسنل کد ${code}`);
    const staffRole = matchedOperator ? matchedOperator.role : (matchedUser ? matchedUser.role : 'پرسنل فنی');
    const staffShift = matchedOperator ? (matchedOperator.shift === 'Morning' ? 'شیفت صبح' : matchedOperator.shift === 'Evening' ? 'شیفت عصر' : 'شیفت شب') : 'شیفت روزانه';
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('fa-IR');

    const isEntry = barcodeActionType === 'in';
    const prefix = isEntry ? '🟢 [ثبت تردد با بارکد کارت]' : '🔴 [ثبت خروج با بارکد کارت]';
    const actionLabel = isEntry ? 'ورود به شیفت کاری' : 'خروج از شیفت و پایان کارکرد';

    const msgText = `${prefix} پرسنل: ${staffName} (کد/بارکد: ${code}) | سمت: ${staffRole} | عملیات: ${actionLabel} | شیفت: ${staffShift} | زمان: ${dateStr} - ${timeStr}`;

    await sendChatMessage({
      message: msgText,
      channelId: activeChannelId,
    });

    if (isEntry) {
      setPresentStaffList(prev => {
        const id = matchedOperator ? matchedOperator.id : (matchedUser ? matchedUser.id : code);
        const filtered = prev.filter(p => p.id !== id);
        const updated = [
          ...filtered,
          {
            id,
            name: staffName,
            role: staffRole,
            shift: staffShift,
            station: 'ثبت با بارکدخوان',
            entryTime: timeStr,
          }
        ];
        try {
          localStorage.setItem('present_staff_shift_list', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } else {
      setPresentStaffList(prev => {
        const id = matchedOperator ? matchedOperator.id : (matchedUser ? matchedUser.id : code);
        const updated = prev.filter(p => p.id !== id);
        try {
          localStorage.setItem('present_staff_shift_list', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    setShowBarcodePersonnelModal(false);
    setBarcodeInput('');
    setSelectedPersonnelCode('');
  };

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length, activeChannelId, activeDirectUserId, mobileView]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    const text = inputText.trim();
    const attachments = [...selectedAttachments];
    const replyId = replyingTo?.id;

    // Reset input immediately for snappy responsiveness
    setInputText('');
    setSelectedAttachments([]);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    await sendChatMessage({
      message: text || (attachments.length > 0 ? `پیوست: ${attachments[0].title}` : ''),
      channelId: activeDirectUserId ? undefined : activeChannelId,
      recipientId: activeDirectUserId || undefined,
      attachments,
      replyToId: replyId,
    });

    inputRef.current?.focus();
  };

  const handleSelectQuickText = (quickText: string) => {
    setInputText(prev => prev ? `${prev} ${quickText}` : quickText);
    inputRef.current?.focus();
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    await toggleMessageReaction(messageId, emoji);
  };

  const handleAddAttachment = (item: { type: 'item' | 'request' | 'transfer'; id: string; code?: string; title: string; subtitle?: string }) => {
    setSelectedAttachments(prev => [...prev, item]);
    setShowAttachmentModal(false);
    setAttachSearchQuery('');
  };

  const quickPhrases = [
    'حواله خروج صادر شد ✅',
    'درخواست در حال بررسی است ⏳',
    'اقلام تحویل انبار مقصد گردید 📦',
    'کسری قطعه داریم؛ لطفا پیگیری شود ⚠️',
    'تایید و اعمال شد 👍',
    'لطفا موجودی انبار را بررسی فرمایید 🔍'
  ];

  const personnelQuickPhrases = [
    'ورود به شیفت ثبت گردید ✅',
    'تحویل شیفت با موفقیت انجام شد 🔄',
    'ایستگاه کاری فعال و در حال تولید است ⚙️',
    'خروج و اتمام کارکرد ثبت شد 🚪',
    'مرخصی ساعتی هماهنگ شد 🕒',
    'درخواست جابجایی شیفت کاری 📋'
  ];

  const emojis = ['👍', '❤️', '✅', '🔥', '⚠️', '📦', '👏', '🎯', '💯'];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SystemAdmin': return { label: 'مدیر کل', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'Storekeeper': return { label: 'انباردار', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ProjectManager': return { label: 'مدیر پروژه', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Purchasing': return { label: 'تدارکات', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'QualityControl': return { label: 'کنترل کیفیت', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default: return { label: 'اپراتور', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Filtered available items for attachment
  const attachableItems = useMemo(() => {
    if (attachmentType === 'item') {
      return items.filter(it => 
        it.name.toLowerCase().includes(attachSearchQuery.toLowerCase()) || 
        it.code.toLowerCase().includes(attachSearchQuery.toLowerCase())
      ).slice(0, 15);
    }
    if (attachmentType === 'request') {
      return purchaseRequests.filter(pr => 
        pr.requestNumber.toLowerCase().includes(attachSearchQuery.toLowerCase()) ||
        pr.requesterName.toLowerCase().includes(attachSearchQuery.toLowerCase())
      ).slice(0, 15);
    }
    return transfers.filter(tr => 
      tr.docNumber.toLowerCase().includes(attachSearchQuery.toLowerCase()) ||
      (tr.projectName || '').toLowerCase().includes(attachSearchQuery.toLowerCase())
    ).slice(0, 15);
  }, [attachmentType, attachSearchQuery, items, purchaseRequests, transfers]);

  return (
    <div id="chat-view-container" className="h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-9rem)] md:h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-0 md:gap-4 bg-white md:bg-white/80 backdrop-blur-xl border-0 md:border md:border-slate-200/80 rounded-none md:rounded-3xl p-0 md:p-4 shadow-none md:shadow-sm overflow-hidden animate-fadeIn relative">
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR: Channels & Direct Users (Full screen on mobile if mobileView === 'list') */}
      {/* ========================================================================= */}
      <div className={`w-full md:w-80 flex flex-col bg-slate-50/90 md:bg-slate-50/80 border-b md:border md:border-slate-200/70 rounded-none md:rounded-2xl p-3 shrink-0 h-full ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Header & Status Indicator */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">گفتگو و هماهنگی</h2>
              <p className="text-[11px] text-slate-500 font-medium">ارتباط فوری پرسنل و انبار</p>
            </div>
          </div>

          {/* Quick Notification Permission Status / Sound toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer active:scale-95 ${
                soundEnabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
              }`}
              title={soundEnabled ? 'صدای اعلان فعال است' : 'صدا قطع است'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {browserNotificationPermission !== 'granted' && (
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-1.5 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
                title="فعال‌سازی اعلان در مرورگر"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>نوتیف</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Switcher (Channels vs Direct) */}
        <div className="flex md:hidden bg-slate-200/80 p-1 rounded-xl mb-3 text-xs font-black">
          <button
            onClick={() => setActiveTabFilter('channels')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTabFilter === 'channels' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>کانال‌ها</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">{channels.length}</span>
          </button>
          <button
            onClick={() => setActiveTabFilter('direct')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTabFilter === 'direct' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>همکاران</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">{users.length - 1}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="جستجوی کانال یا همکار..."
            className="w-full text-xs pr-8 pl-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all shadow-2xs"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Channels & Direct Messages List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs custom-scrollbar">
          
          {/* Public Channels (Always shown on Desktop, or when activeTabFilter === 'channels' on mobile) */}
          <div className={`${activeTabFilter === 'channels' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-2">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> کانال‌های عمومی
              </span>
              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md text-[10px]">
                {displayChannels.length}
              </span>
            </div>

            <div className="space-y-1">
              {displayChannels
                .filter(c => !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(channel => {
                  const isActive = !activeDirectUserId && activeChannelId === channel.id;
                  const channelMessages = messages.filter(m => m.channelId === channel.id);
                  const lastMsg = channelMessages[channelMessages.length - 1];
                  const isCoordination = channel.id === 'staff-coordination';

                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        setActiveDirectUserId(null);
                        setMobileView('chat');
                      }}
                      className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer active:scale-98 ${
                        isActive 
                          ? (isCoordination ? 'bg-emerald-700 text-white shadow-sm font-bold' : 'bg-indigo-600 text-white shadow-xs font-bold')
                          : isCoordination 
                            ? 'bg-emerald-50/70 hover:bg-emerald-50 text-slate-800 border border-emerald-200/80 hover:border-emerald-300' 
                            : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : isCoordination 
                              ? 'bg-emerald-100 text-emerald-700 font-bold' 
                              : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {isCoordination ? <Users className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className={`truncate text-xs ${isActive ? 'text-white' : 'text-slate-900 font-bold'}`}>
                              {channel.name}
                            </p>
                            {isCoordination && (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-black shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                تردد شیفت
                              </span>
                            )}
                          </div>
                          {lastMsg ? (
                            <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {lastMsg.senderName}: {lastMsg.message}
                            </p>
                          ) : (
                            <p className={`text-[10px] truncate ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                              {channel.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {lastMsg && (
                        <span className={`text-[10px] shrink-0 mr-1 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {lastMsg.timestamp}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Direct Messages (Personnel) */}
          <div className={`${activeTabFilter === 'direct' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3" /> پیام مستقیم به همکاران
              </span>
              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md text-[10px]">
                {users.length - 1}
              </span>
            </div>

            <div className="space-y-1">
              {users
                .filter(u => u.id !== currentUser.id)
                .filter(u => !searchFilter || u.fullName.toLowerCase().includes(searchFilter.toLowerCase()) || u.role.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(user => {
                  const isActive = activeDirectUserId === user.id;
                  const roleInfo = getRoleBadge(user.role);
                  const directMsgs = messages.filter(m => 
                    (m.senderId === currentUser.id && m.recipientId === user.id) ||
                    (m.senderId === user.id && m.recipientId === currentUser.id)
                  );
                  const lastMsg = directMsgs[directMsgs.length - 1];

                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        setActiveDirectUserId(user.id);
                        setMobileView('chat');
                      }}
                      className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer active:scale-98 ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                          : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="relative shrink-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                            isActive ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                          }`}>
                            {user.fullName.charAt(0)}
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-white" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className={`truncate text-xs ${isActive ? 'text-white' : 'text-slate-900 font-bold'}`}>
                              {user.fullName}
                            </p>
                            <span className={`text-[9px] px-1 py-0.2 rounded border font-medium ${
                              isActive ? 'bg-white/20 text-white border-white/30' : roleInfo.color
                            }`}>
                              {roleInfo.label}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {lastMsg ? `${lastMsg.senderName === currentUser.fullName ? 'شما: ' : ''}${lastMsg.message}` : `واحد: ${user.department || 'سازمان'}`}
                          </p>
                        </div>
                      </div>
                      {lastMsg && (
                        <span className={`text-[10px] shrink-0 mr-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {lastMsg.timestamp}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT WORKSPACE (Shown on mobile if mobileView === 'chat') */}
      {/* ========================================================================= */}
      <div className={`flex-1 flex flex-col bg-white md:rounded-2xl border-0 md:border md:border-slate-200/80 overflow-hidden shadow-none md:shadow-xs h-full ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Workspace Top Header (Mobile has back button to switch to list) */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-50/95 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer shrink-0"
              title="بازگشت به لیست گفتگوها"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              {activeDirectUser ? (
                activeDirectUser.fullName.charAt(0)
              ) : (
                <Hash className="w-5 h-5" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                  {activeDirectUser ? activeDirectUser.fullName : currentChannel?.name}
                </h3>
                {activeDirectUser && (
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${getRoleBadge(activeDirectUser.role).color}`}>
                    {getRoleBadge(activeDirectUser.role).label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {activeDirectUser 
                  ? `گفتگوی خصوصی • ${activeDirectUser.department || 'پرسنل'}`
                  : currentChannel?.description || 'کانال هماهنگی پرسنل'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 font-bold">{filteredMessages.length} پیام</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DEDICATED PERSONNEL COORDINATION & ATTENDANCE CONTROL BAR */}
        {/* ========================================================================= */}
        {isPersonnelChannel && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-3.5 py-3 border-b border-indigo-800/50 shadow-md shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              {/* Left Side: Live Clock & Current User Attendance Status */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${
                  attendanceStatus.isClockedIn 
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                }`}>
                  {attendanceStatus.isClockedIn ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-white">
                      {attendanceStatus.isClockedIn ? 'وضعیت شما: حاضر در شیفت' : 'وضعیت شما: پایان شیفت / خروج'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      attendanceStatus.isClockedIn 
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {attendanceStatus.isClockedIn ? (attendanceStatus.shift || 'شیفت جاری') : 'عدم حضور فعال'}
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 font-medium flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-indigo-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {attendanceStatus.isClockedIn && attendanceStatus.clockInTime 
                        ? `ساعت ورود: ${attendanceStatus.clockInTime}` 
                        : `ساعت سامانه: ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
                      }
                    </span>
                    {attendanceStatus.station && attendanceStatus.isClockedIn && (
                      <span className="text-slate-400 hidden sm:inline">• ایستگاه: {attendanceStatus.station}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Primary Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* 1. Quick Entry / Exit Buttons */}
                {!attendanceStatus.isClockedIn ? (
                  <button
                    type="button"
                    onClick={() => setShowClockInModal(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer"
                    id="btn-clock-in-staff"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ثبت ورود به شیفت</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClockOutModal(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95 transition-all cursor-pointer"
                    id="btn-clock-out-staff"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ثبت خروج و پایان شیفت</span>
                  </button>
                )}

                {/* 2. Hourly Leave / Temporary Mission */}
                <button
                  type="button"
                  onClick={() => setShowMissionModal(true)}
                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="ثبت خروج موقت برای مأموریت اداری یا مرخصی ساعتی"
                  id="btn-mission-staff"
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">خروج موقت / مأموریت</span>
                  <span className="sm:hidden">مأموریت</span>
                </button>

                {/* 3. Barcode Scanner / Badge Entry */}
                <button
                  type="button"
                  onClick={() => setShowBarcodePersonnelModal(true)}
                  className="px-2.5 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="ثبت تردد پرسنل با اسکن بارکد کارت شناسایی"
                  id="btn-barcode-staff"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="hidden md:inline">ثبت تردد با بارکد</span>
                  <span className="md:hidden">بارکد</span>
                </button>

                {/* 4. Active On-Duty Staff List */}
                <button
                  type="button"
                  onClick={() => setShowStaffListModal(true)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="مشاهده لیست همکاران حاضر در شیفت"
                  id="btn-staff-list"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>حاضرین ({presentStaffList.length})</span>
                </button>

                {/* 5. Attendance Message Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setAttendanceFilter(prev => prev === 'all' ? 'attendance' : 'all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    attendanceFilter === 'attendance'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                  title="فیلتر پیام‌های تردد شیفت"
                  id="btn-filter-attendance"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">{attendanceFilter === 'attendance' ? 'فقط پیام‌های تردد' : 'همه پیام‌ها'}</span>
                </button>

              </div>

            </div>
          </div>
        )}

        {/* Message Bubbles Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-gradient-to-b from-slate-50/40 to-white custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">هنوز پیامی در این بخش ثبت نشده است</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  با ارسال پیام، ثبت حواله یا پیوست درخواست گفتگو را آغاز نمایید.
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              const roleBadge = getRoleBadge(msg.senderRole);
              const repliedMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex gap-2 sm:gap-2.5 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {msg.senderName.charAt(0)}
                  </div>

                  {/* Bubble Container */}
                  <div className={`max-w-[88%] sm:max-w-[75%] md:max-w-[70%] space-y-1 ${isMine ? 'items-end text-right' : 'items-start text-right'}`}>
                    
                    {/* Header: Sender Name, Role & Time */}
                    <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded border font-medium ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                      <span className="text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>

                    {/* Replied Context */}
                    {repliedMessage && (
                      <div className="bg-slate-100/90 border-r-2 border-indigo-500 rounded-lg p-1.5 text-[10px] sm:text-[11px] text-slate-600 mb-1 max-w-md">
                        <div className="flex items-center gap-1 font-bold text-indigo-700 text-[10px]">
                          <Reply className="w-2.5 h-2.5" /> پاسخ به {repliedMessage.senderName}:
                        </div>
                        <p className="truncate text-slate-500 mt-0.5">{repliedMessage.message}</p>
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div className={`p-2.5 sm:p-3 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                      isMine 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {/* Attachments Card */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-indigo-400/30 space-y-1.5">
                          {msg.attachments.map((att, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                if (att.type === 'item') setActiveTab('items');
                                if (att.type === 'request') setActiveTab('requests');
                                if (att.type === 'transfer') setActiveTab('transfers');
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                                isMine 
                                  ? 'bg-white/15 hover:bg-white/25 text-white' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {att.type === 'item' && <Package className="w-4 h-4 text-amber-400 shrink-0" />}
                                {att.type === 'request' && <FileText className="w-4 h-4 text-cyan-400 shrink-0" />}
                                {att.type === 'transfer' && <ArrowLeftRight className="w-4 h-4 text-emerald-400 shrink-0" />}
                                <div className="truncate text-right">
                                  <p className="font-bold text-[11px] truncate">{att.title}</p>
                                  {att.code && <p className="text-[9px] opacity-80 font-mono">{att.code}</p>}
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reactions & Action Bar */}
                    <div className={`flex items-center gap-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
                      
                      {/* Active Reactions */}
                      {msg.reactions && Object.entries(msg.reactions).map(([emoji, userIds]) => {
                        const ids = (userIds as string[]) || [];
                        const hasReacted = ids.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                              hasReacted 
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{ids.length}</span>
                          </button>
                        );
                      })}

                      {/* Quick Emoji Reaction Buttons on Hover / Tap */}
                      <div className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-1 py-0.5 shadow-2xs">
                        {['👍', '❤️', '✅', '📦'].map(em => (
                          <button
                            key={em}
                            onClick={() => handleToggleReaction(msg.id, em)}
                            className="p-1 hover:bg-slate-100 rounded-full text-xs transition-colors cursor-pointer active:scale-90"
                            title={`ثبت واکنش ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"
                          title="پاسخ به این پیام"
                        >
                          <Reply className="w-3 h-3" />
                        </button>

                        {(isMine || currentUser.role === 'SystemAdmin') && (
                          <button
                            onClick={() => deleteChatMessage(msg.id)}
                            className="p-1 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف پیام"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Phrase Suggestion Chips */}
        <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-50/80 border-t border-slate-200/60 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 shrink-0 custom-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" /> {isPersonnelChannel ? 'پیام‌های سریع تردد:' : 'پاسخ سریع:'}
          </span>
          {(isPersonnelChannel ? personnelQuickPhrases : quickPhrases).map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectQuickText(phrase)}
              className="text-[10px] sm:text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 border border-slate-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 active:scale-95"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Reply To Preview Bar */}
        {replyingTo && (
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-50/90 border-t border-indigo-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs truncate">
              <CornerDownLeft className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-indigo-900">پاسخ به {replyingTo.senderName}: </span>
                <span className="text-slate-600 truncate">{replyingTo.message}</span>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Attachments Preview */}
        {selectedAttachments.length > 0 && (
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-2 shrink-0">
            {selectedAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-white text-slate-800 text-xs px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs"
              >
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">{att.title}</span>
                <button
                  onClick={() => setSelectedAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-rose-600 mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Form */}
        <form onSubmit={handleSendMessage} className="p-2 sm:p-3 bg-white border-t border-slate-200/80 flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Attach Resource Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentModal(true)}
            className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0 active:scale-95"
            title="الصاق کالا، حواله یا درخواست خرید"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Emoji Picker Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 sm:p-2.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors cursor-pointer active:scale-95"
              title="شکلک و ایموجی"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 bg-white border border-slate-200 rounded-2xl p-2 shadow-xl z-50 flex gap-1.5 flex-wrap w-48 animate-fadeIn">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText(prev => prev + emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className="w-8 h-8 text-base hover:bg-slate-100 rounded-xl flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              activeDirectUser 
                ? `ارسال پیام به ${activeDirectUser.fullName}...` 
                : `پیام در #${currentChannel?.name || 'عمومی'}...`
            }
            className="flex-1 text-xs px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && selectedAttachments.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">ارسال</span>
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>

        </form>

      </div>

      {/* ========================================================================= */}
      {/* 3. ATTACHMENT MODAL: Select Item, Purchase Request, or Transfer */}
      {/* ========================================================================= */}
      {showAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                <Paperclip className="w-5 h-5 text-indigo-600" />
                <span>پیوست سند و اطلاعات به پیام</span>
              </div>
              <button onClick={() => setShowAttachmentModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setAttachmentType('item')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  attachmentType === 'item' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                کالا یا قطعه انبار
              </button>
              <button
                onClick={() => setAttachmentType('request')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  attachmentType === 'request' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                درخواست خرید
              </button>
              <button
                onClick={() => setAttachmentType('transfer')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  attachmentType === 'transfer' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                حواله انتقال
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={attachSearchQuery}
                onChange={(e) => setAttachSearchQuery(e.target.value)}
                placeholder="جستجوی کد یا نام..."
                className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {attachmentType === 'item' && (attachableItems as typeof items).map(it => (
                <div
                  key={it.id}
                  onClick={() => handleAddAttachment({
                    type: 'item',
                    id: it.id,
                    code: it.code,
                    title: it.name,
                    subtitle: `کد: ${it.code} • واحد: ${it.unit}`
                  })}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{it.name}</p>
                    <p className="text-[10px] text-slate-500">{it.code} • گروه: {it.group}</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                    انتخاب
                  </span>
                </div>
              ))}

              {attachmentType === 'request' && (attachableItems as typeof purchaseRequests).map(pr => (
                <div
                  key={pr.id}
                  onClick={() => handleAddAttachment({
                    type: 'request',
                    id: pr.id,
                    code: pr.requestNumber,
                    title: `درخواست خرید ${pr.requestNumber}`,
                    subtitle: `درخواست‌کننده: ${pr.requesterName}`
                  })}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">درخواست {pr.requestNumber}</p>
                    <p className="text-[10px] text-slate-500">{pr.requesterName} • {pr.items.length} قلم کالا</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                    انتخاب
                  </span>
                </div>
              ))}

              {attachmentType === 'transfer' && (attachableItems as typeof transfers).map(tr => (
                <div
                  key={tr.id}
                  onClick={() => handleAddAttachment({
                    type: 'transfer',
                    id: tr.id,
                    code: tr.docNumber,
                    title: `حواله انتقال ${tr.docNumber}`,
                    subtitle: `پروژه: ${tr.projectName || 'مرتبط'}`
                  })}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">حواله {tr.docNumber}</p>
                    <p className="text-[10px] text-slate-500">{tr.projectName || 'انتقال بین انبار'} • وضعیت: {tr.status}</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                    انتخاب
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CLOCK IN MODAL */}
      {/* ========================================================================= */}
      {showClockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">ثبت رسمی ورود به شیفت کاری</h3>
                  <p className="text-[11px] text-emerald-200">اعلام حضور در کارخانه و انبار</p>
                </div>
              </div>
              <button 
                onClick={() => setShowClockInModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* User Info Card */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{currentUser.fullName}</p>
                  <p className="text-[11px] text-slate-500 font-medium">سمت سازمانی: {currentUser.role} • واحد: {currentUser.department || 'عمومی'}</p>
                </div>
              </div>

              {/* Shift Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">انتخاب شیفت کاری:</label>
                <select
                  value={clockInShift}
                  onChange={(e) => setClockInShift(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-colors cursor-pointer"
                >
                  <option value="صبح (۰۷:۰۰ الی ۱۵:۰۰)">شیفت صبح (۰۷:۰۰ الی ۱۵:۰۰)</option>
                  <option value="عصر (۱۵:۰۰ الی ۲۳:۰۰)">شیفت عصر (۱۵:۰۰ الی ۲۳:۰۰)</option>
                  <option value="شب (۲۳:۰۰ الی ۰۷:۰۰)">شیفت شب (۲۳:۰۰ الی ۰۷:۰۰)</option>
                </select>
              </div>

              {/* Station / Area Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">ایستگاه کاری / بخش استقرار:</label>
                <select
                  value={clockInStation}
                  onChange={(e) => setClockInStation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-colors cursor-pointer"
                >
                  <option value="انبار مرکزی قطعات">انبار مرکزی قطعات و مواد اولیه</option>
                  <option value="خط تولید و مونتاژ">خط تولید و مونتاژ محصولات</option>
                  <option value="ایستگاه تست و کالیبراسیون">ایستگاه تست و کالیبراسیون</option>
                  <option value="واحد کنترل کیفیت (QC)">واحد کنترل کیفیت (QC)</option>
                  <option value="واحد تدارکات و بازرگانی">واحد تدارکات و بازرگانی</option>
                  <option value="مدیریت و سرپرستی کارخانه">مدیریت و سرپرستی کارخانه</option>
                </select>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">توضیحات یا یادداشت (اختیاری):</label>
                <input
                  type="text"
                  value={clockInNote}
                  onChange={(e) => setClockInNote(e.target.value)}
                  placeholder="مثلاً: حضور به موقع، تعویض شیفت با همکار..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClockInModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmClockIn}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-xs flex items-center gap-1.5"
                id="btn-confirm-clock-in"
              >
                <LogIn className="w-4 h-4" />
                <span>تأیید و ثبت ورود به شیفت</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLOCK OUT MODAL */}
      {/* ========================================================================= */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-rose-800 to-red-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">ثبت خروج و پایان شیفت کاری</h3>
                  <p className="text-[11px] text-rose-200">اتمام کارکرد روزانه و تحویل ایستگاه</p>
                </div>
              </div>
              <button 
                onClick={() => setShowClockOutModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1 text-rose-900">
                <p className="font-black">همکار گرامی: {currentUser.fullName}</p>
                <p className="text-[11px] text-rose-700">
                  شیفت فعال: {attendanceStatus.shift || 'جاری'} • زمان ثبت ورود: {attendanceStatus.clockInTime || '۰۸:۰۰'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">گزارش تحویل شیفت / توضیحات خروج:</label>
                <textarea
                  value={clockOutNote}
                  onChange={(e) => setClockOutNote(e.target.value)}
                  rows={3}
                  placeholder="مثلاً: کلیه اقلام انبار تحویل شیفت بعد گردید، وضعیت دستگاه‌ها عادی است..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-rose-500 outline-none transition-colors"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmClockOut}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-xs flex items-center gap-1.5"
                id="btn-confirm-clock-out"
              >
                <LogOut className="w-4 h-4" />
                <span>تأیید و ثبت رسمی خروج</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MISSION / HOURLY LEAVE MODAL */}
      {/* ========================================================================= */}
      {showMissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-800 to-yellow-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">ثبت خروج موقت / مأموریت ساعتی</h3>
                  <p className="text-[11px] text-amber-200">هماهنگی تردد موقت در شیفت کاری</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMissionModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">نوع تردد موقت:</label>
                <select
                  value={missionType}
                  onChange={(e) => setMissionType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-colors cursor-pointer"
                >
                  <option value="مأموریت اداری / بازرگانی">مأموریت اداری / امور بانکی</option>
                  <option value="خرید قطعات اضطراری">خرید قطعات اضطراری و ابزارآلات</option>
                  <option value="مرخصی ساعتی شخصی">مرخصی ساعتی شخصی</option>
                  <option value="جلسه فنی خارج کارخانه">جلسه فنی و بازدید خارج کارخانه</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">مدت زمان تقریبی:</label>
                <select
                  value={missionDuration}
                  onChange={(e) => setMissionDuration(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-colors cursor-pointer"
                >
                  <option value="۱ ساعت">۱ ساعت</option>
                  <option value="۲ ساعت">۲ ساعت</option>
                  <option value="۳ ساعت">۳ ساعت</option>
                  <option value="تا پایان شیفت">تا پایان شیفت کاری</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">علت / مقصد یا توضیحات:</label>
                <input
                  type="text"
                  value={missionNote}
                  onChange={(e) => setMissionNote(e.target.value)}
                  placeholder="مثلاً: هماهنگی جهت تحویل بار از باربری مرکزی..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMissionModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmMission}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-xs flex items-center gap-1.5"
                id="btn-confirm-mission"
              >
                <Briefcase className="w-4 h-4" />
                <span>تأیید و اعلام خروج موقت</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BARCODE PERSONNEL ATTENDANCE MODAL */}
      {/* ========================================================================= */}
      {showBarcodePersonnelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">ثبت تردد با بارکد کارت پرسنلی</h3>
                  <p className="text-[11px] text-indigo-200">اسکن بارکد کارت شناسایی پرسنل و اپراتورها</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBarcodePersonnelModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Action Type Tabs: Entry vs Exit */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBarcodeActionType('in')}
                  className={`py-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    barcodeActionType === 'in'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>ثبت ورود به شیفت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeActionType('out')}
                  className={`py-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    barcodeActionType === 'out'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>ثبت خروج از شیفت</span>
                </button>
              </div>

              {/* Barcode / Badge Input with Camera Scan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">اسکن یا ورود کد بارکد کارت پرسنلی:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="مثلاً: OP-101 یا admin یا usr-1..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    title="باز کردن دوربین اسکنر بارکد"
                  >
                    <ScanLine className="w-4 h-4 text-indigo-600" />
                    <span>اسکنر دوربین</span>
                  </button>
                </div>
              </div>

              {/* Quick Select Operator / Personnel */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">یا انتخاب مستقیم اپراتور / همکار:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {operators.map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setBarcodeInput(op.code)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        barcodeInput === op.code 
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{op.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{op.code} • {op.role}</p>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                        {op.shift === 'Morning' ? 'صبح' : op.shift === 'Evening' ? 'عصر' : 'شب'}
                      </span>
                    </button>
                  ))}

                  {users.slice(0, 4).map(usr => (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => setBarcodeInput(usr.username)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        barcodeInput === usr.username 
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{usr.fullName}</p>
                        <p className="text-[10px] text-slate-500">{usr.role}</p>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                        {usr.username}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBarcodePersonnelModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmBarcodeAttendance}
                disabled={!barcodeInput.trim()}
                className={`px-5 py-2 font-black rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer ${
                  barcodeActionType === 'in'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                } ${!barcodeInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                id="btn-confirm-barcode-attendance"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید و ثبت رویداد تردد</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ACTIVE STAFF LIST ON-DUTY MODAL */}
      {/* ========================================================================= */}
      {showStaffListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">لیست همکاران حاضر در شیفت کاری</h3>
                  <p className="text-[11px] text-slate-300">گزارش لحظه‌ای پرسنل مستقر در انبار و خطوط تولید</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStaffListModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-xs">
              
              <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold">تعداد پرسنل فعال در شیفت: {presentStaffList.length} نفر</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ لیست</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">نام همکار</th>
                      <th className="p-2.5">سمت / نقش</th>
                      <th className="p-2.5">شیفت کاری</th>
                      <th className="p-2.5">ایستگاه استقرار</th>
                      <th className="p-2.5 text-center">زمان ورود</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {presentStaffList.map(staff => (
                      <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">
                            {staff.name.charAt(0)}
                          </div>
                          <span>{staff.name}</span>
                        </td>
                        <td className="p-2.5 text-slate-600">{staff.role}</td>
                        <td className="p-2.5 text-slate-600">{staff.shift}</td>
                        <td className="p-2.5 text-slate-600">{staff.station}</td>
                        <td className="p-2.5 text-center font-mono text-emerald-700 font-bold bg-emerald-50/50">
                          {staff.entryTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                به‌روزرسانی خودکار با هر پیام ورود و خروج در کانال هماهنگی
              </span>
              <button
                type="button"
                onClick={() => setShowStaffListModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                بستن پنجره
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
