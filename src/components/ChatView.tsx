import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage, ChatAttachment, User } from '../types';
import { 
  MessageSquare, Send, Paperclip, Smile, Hash, Users, Search, 
  Trash2, Reply, Check, CheckCheck, Sparkles, X, Plus, Package, 
  FileText, ArrowLeftRight, Bell, Volume2, VolumeX, ShieldAlert,
  ChevronDown, ExternalLink, CornerDownLeft, ArrowRight, Phone,
  Info, Sparkle, UserCheck
} from 'lucide-react';
import { soundEngine } from '../utils/browserNotifications';

export const ChatView: React.FC = () => {
  const {
    currentUser,
    users,
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
    setSoundEnabled
  } = useApp();

  // Active channel or recipient
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [activeDirectUserId, setActiveDirectUserId] = useState<string | null>(null);

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentChannel = useMemo(() => {
    if (activeDirectUserId) return null;
    return channels.find(c => c.id === activeChannelId) || channels[0];
  }, [channels, activeChannelId, activeDirectUserId]);

  const activeDirectUser = useMemo(() => {
    if (!activeDirectUserId) return null;
    return users.find(u => u.id === activeDirectUserId) || null;
  }, [users, activeDirectUserId]);

  // Filter messages for active channel or direct chat
  const filteredMessages = useMemo(() => {
    if (activeDirectUserId) {
      return messages.filter(m => 
        (m.senderId === currentUser.id && m.recipientId === activeDirectUserId) ||
        (m.senderId === activeDirectUserId && m.recipientId === currentUser.id)
      );
    }
    return messages.filter(m => m.channelId === activeChannelId);
  }, [messages, activeChannelId, activeDirectUserId, currentUser.id]);

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
    <div id="chat-view-container" className="h-[calc(100vh-10rem)] md:h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-0 md:gap-4 bg-white md:bg-white/80 backdrop-blur-xl border-0 md:border md:border-slate-200/80 rounded-2xl md:rounded-3xl p-0 md:p-4 shadow-none md:shadow-sm overflow-hidden animate-fadeIn relative">
      
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
                {channels.length}
              </span>
            </div>

            <div className="space-y-1">
              {channels
                .filter(c => !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(channel => {
                  const isActive = !activeDirectUserId && activeChannelId === channel.id;
                  const channelMessages = messages.filter(m => m.channelId === channel.id);
                  const lastMsg = channelMessages[channelMessages.length - 1];

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
                          ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                          : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className={`truncate text-xs ${isActive ? 'text-white' : 'text-slate-900 font-bold'}`}>
                            {channel.name}
                          </p>
                          {lastMsg ? (
                            <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {lastMsg.senderName}: {lastMsg.message}
                            </p>
                          ) : (
                            <p className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {channel.description}
                            </p>
                          )}
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
            <Sparkles className="w-3 h-3 text-amber-500" /> پاسخ سریع:
          </span>
          {quickPhrases.map((phrase, idx) => (
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

    </div>
  );
};
