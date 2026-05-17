import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, Users, Lock, Hash, Search, ShieldAlert, Circle, User, ArrowLeft } from 'lucide-react';
import { Loader } from '../components/Loader';

export const Messages = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const messagesEndRef = useRef(null);
  const location = useLocation();

  // States
  const [messages, setMessages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('umumiy'); // 'umumiy', 'rahbariyat', or employee_id
  const [empSearch, setEmpSearch] = useState('');
  const [useLocalBackup, setUseLocalBackup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileWorkspace, setShowMobileWorkspace] = useState(false); // Controls mobile layout focus

  useEffect(() => {
    if (location.state?.selectUser) {
      setActiveChannel(location.state.selectUser);
      setShowMobileWorkspace(true);
    }
  }, [location]);

  // Web Audio Synth for Sent Message Pop
  const playSendSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio Context failed to play:", e.message);
    }
  };

  // Web Audio Synth for Received Message Chime
  const playReceiveSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio Context failed to play:", e.message);
    }
  };

  // Symmetric Chat Room Key for Direct Messaging
  const msgChannel = useMemo(() => {
    if (activeChannel === 'umumiy' || activeChannel === 'rahbariyat') {
      return activeChannel;
    }
    const userId = user?.id || 'current_user';
    return userId < activeChannel ? `dm_${userId}_${activeChannel}` : `dm_${activeChannel}_${userId}`;
  }, [activeChannel, user]);

  // Fetch employees and messages
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      await fetchEmployees();
      await fetchMessages();
      setLoading(false);
    };
    initChat();
  }, [user]);

  // Scroll to bottom on new messages or channel switch
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  // Real-time listener for database sync
  useEffect(() => {
    let subscription;
    if (!useLocalBackup && !loading) {
      subscription = supabase
        .channel('messages_realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const msg = payload.new;
          
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;

            // Coordinated Sound and Header triggers
            if (msg.sender_id !== (user?.id || 'current_user')) {
              playReceiveSound();

              if (msg.channel !== msgChannel) {
                const currentUnread = Number(localStorage.getItem('erp_unread_count') || 0);
                localStorage.setItem('erp_unread_count', currentUnread + 1);
                window.dispatchEvent(new Event('erp_new_message'));
              }
            }

            return [...prev, msg];
          });
        })
        .subscribe();
    }
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [useLocalBackup, loading, msgChannel, user]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('employees').select('id, emp_id, name, role, department, status');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees for chat:", error.message);
      setEmployees([
        { id: 'admin_demo', emp_id: 'EMP-001', name: 'Mirzo', role: 'Bosh Admin', department: 'Boshqaruv', status: 'Faol' },
        { id: 'manager_demo', emp_id: 'EMP-002', name: 'Zilola', role: 'Meneger', department: 'Ombor', status: 'Faol' },
        { id: 'seller_demo', emp_id: 'EMP-003', name: 'Javohir', role: 'Sotuvchi', department: 'Sotuv', status: 'Faol' }
      ]);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      setUseLocalBackup(false);
    } catch (err) {
      console.warn("Supabase messages table failed, using localStorage fallback:", err.message);
      setUseLocalBackup(true);
      const localMsgs = localStorage.getItem('erp_chat_messages');
      if (localMsgs) {
        setMessages(JSON.parse(localMsgs));
      } else {
        const userId = user?.id || 'current_user';
        const partnerId = 'manager_demo';
        const roomKey = userId < partnerId ? `dm_${userId}_${partnerId}` : `dm_${partnerId}_${userId}`;

        const initialMessages = [
          { id: 1, sender_id: 'system', sender_name: 'Tizim Bot', sender_role: 'Tizim', sender_avatar: '🤖', content: 'ERP PRO korporativ chat tizimiga xush kelibsiz! Bu yerda admin, meneger va sotuvchilar o\'rtasida xavfsiz va tezkor muloqot qilishingiz mumkin.', channel: 'umumiy', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
          { id: 2, sender_id: 'admin_demo', sender_name: 'Mirzo', sender_role: 'Bosh Admin', sender_avatar: 'M', content: 'Salom barchaga! Omborda mevalar zaxirasi kam qolmoqda, sotuvlar bo\'limi iltimos mijozlarga shuni e\'tiborga olib taklif qiling.', channel: 'umumiy', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 3, sender_id: 'seller_demo', sender_name: 'Javohir', sender_role: 'Sotuvchi', sender_avatar: 'J', content: 'Xo\'p bo\'ladi, Mirzo aka. Bugun 2 tonna quritilgan o\'rik uchun shartnoma qildik!', channel: 'umumiy', created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 4, sender_id: 'manager_demo', sender_name: 'Zilola', sender_role: 'Meneger', sender_avatar: 'Z', content: 'Salom! Rahbariyat guruhiga ombor hisob-kitoblarini joyladim, ko\'rib chiqinglar iltimos.', channel: 'rahbariyat', created_at: new Date(Date.now() - 900000).toISOString() },
          { id: 5, sender_id: 'manager_demo', sender_name: 'Zilola', sender_role: 'Meneger', sender_avatar: 'Z', content: 'Salom! Shaxsiy suhbatimiz faol. Biron bir yordam kerakmi?', channel: roomKey, created_at: new Date(Date.now() - 300000).toISOString() }
        ];
        localStorage.setItem('erp_chat_messages', JSON.stringify(initialMessages));
        setMessages(initialMessages);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    playSendSound();

    const msgPayload = {
      sender_id: user?.id || 'current_user',
      sender_name: user?.name || 'Noma\'lum Xodim',
      sender_role: user?.role || 'Xodim',
      sender_avatar: user?.name ? user.name.charAt(0).toUpperCase() : '👤',
      content: newMessage.trim(),
      channel: msgChannel,
      created_at: new Date().toISOString()
    };

    if (useLocalBackup) {
      const newMsg = { ...msgPayload, id: Date.now() };
      const updated = [...messages, newMsg];
      setMessages(updated);
      localStorage.setItem('erp_chat_messages', JSON.stringify(updated));
      setNewMessage('');
      
      if (activeChannel !== 'umumiy' && activeChannel !== 'rahbariyat') {
        setTimeout(() => {
          const receivedPayload = {
            id: Date.now() + 1,
            sender_id: activeChannel,
            sender_name: activePartner?.name || 'Hamkor',
            sender_role: activePartner?.role || 'Xodim',
            sender_avatar: activePartner?.name ? activePartner.name.charAt(0).toUpperCase() : '👤',
            content: `Salom! Xabaringizni qabul qildim: "${newMessage.trim()}"`,
            channel: msgChannel,
            created_at: new Date().toISOString()
          };
          
          window.dispatchEvent(new CustomEvent('erp_local_message_received', { detail: receivedPayload }));
          setMessages(prev => [...prev, receivedPayload]);
          const currentLocal = JSON.parse(localStorage.getItem('erp_chat_messages') || '[]');
          localStorage.setItem('erp_chat_messages', JSON.stringify([...currentLocal, receivedPayload]));
        }, 1200);
      }
    } else {
      try {
        const { error } = await supabase.from('messages').insert([msgPayload]);
        if (error) throw error;
        setNewMessage('');
      } catch (err) {
        console.error("Error sending message to Supabase:", err.message);
        const newMsg = { ...msgPayload, id: Date.now() };
        const updated = [...messages, newMsg];
        setMessages(updated);
        localStorage.setItem('erp_chat_messages', JSON.stringify(updated));
        setNewMessage('');
        showNotification("Xabar local zaxirada saqlandi!", "warning");
      }
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => msg.channel === msgChannel);
  }, [messages, msgChannel]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.id !== user?.id &&
      emp.name.toLowerCase().includes(empSearch.toLowerCase())
    );
  }, [employees, empSearch, user]);

  const activePartner = useMemo(() => {
    if (activeChannel === 'umumiy' || activeChannel === 'rahbariyat') return null;
    return employees.find(e => e.id === activeChannel);
  }, [activeChannel, employees]);

  if (loading) {
    return <Loader variant="block" text="Chat yuklanmoqda..." />;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex h-[calc(100vh-8.5rem)] overflow-hidden">
      
      {/* 1. CHAT LIST (LEFT SIDEBAR) */}
      <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 ${
        showMobileWorkspace ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Muloqot Markazi
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Xodimlarni qidirish..." 
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Channels & Partners List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Group Channels */}
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guruh Kanallari</p>
          </div>
          
          {/* General Channel */}
          <button 
            onClick={() => {
              setActiveChannel('umumiy');
              setShowMobileWorkspace(true);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              activeChannel === 'umumiy' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              activeChannel === 'umumiy' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
            }`}>
              <Hash className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs truncate">#umumiy</div>
              <div className={`text-[10px] truncate ${activeChannel === 'umumiy' ? 'text-blue-100' : 'text-slate-400'}`}>
                Hamma xodimlar guruhi
              </div>
            </div>
          </button>

          {/* Secure Management Channel (Hidden for Sotuvchi) */}
          {user?.role !== 'Sotuvchi' && (
            <button 
              onClick={() => {
                setActiveChannel('rahbariyat');
                setShowMobileWorkspace(true);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                activeChannel === 'rahbariyat' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                activeChannel === 'rahbariyat' ? 'bg-white/20' : 'bg-purple-100 text-purple-600'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                  #rahbariyat 
                  <Lock className="w-3 h-3 opacity-60" />
                </div>
                <div className={`text-[10px] truncate ${activeChannel === 'rahbariyat' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Admin va Menegerlar guruhi
                </div>
              </div>
            </button>
          )}

          {/* Direct Messages Section */}
          <div className="px-3 mt-4 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shaxsiy Yozishmalar</p>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">Xodimlar topilmadi</div>
          ) : (
            filteredEmployees.map((emp) => {
              const isActive = activeChannel === emp.id;
              const roleColors = 
                emp.role === 'Bosh Admin' ? 'bg-red-50 text-red-700 border-red-200' :
                emp.role === 'Meneger' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-amber-50 text-amber-700 border-amber-200';

              return (
                <button 
                  key={emp.id}
                  onClick={() => {
                    setActiveChannel(emp.id);
                    setShowMobileWorkspace(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isActive ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate">{emp.name}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                        isActive ? 'bg-white/20 text-white border-transparent' : roleColors
                      }`}>
                        {emp.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Circle className={`w-1.5 h-1.5 fill-current text-emerald-500`} />
                      <span className={`text-[9px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>online</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sync Backup Indicator Status */}
        {useLocalBackup && (
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-800 text-[10px] font-semibold flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Mahalliy sinxronizatsiya faol</span>
          </div>
        )}
      </div>

      {/* 2. CHAT WORKSPACE (RIGHT SIDE) */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50/30 relative ${
        !showMobileWorkspace ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Chat Workspace Header */}
        <div className="h-16 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setShowMobileWorkspace(false)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors mr-1 flex items-center justify-center shrink-0"
              title="Ro'yxatga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              {activeChannel === 'umumiy' ? <Hash className="w-5 h-5" /> : 
               activeChannel === 'rahbariyat' ? <Lock className="w-5 h-5 text-purple-600" /> : 
               <User className="w-5 h-5 text-indigo-600" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm truncate">
                {activeChannel === 'umumiy' ? '#umumiy korporativ kanal' : 
                 activeChannel === 'rahbariyat' ? '#rahbariyat yopiq kanali' : 
                 activePartner?.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {activeChannel === 'umumiy' ? 'Barcha xodimlar suhbati' : 
                 activeChannel === 'rahbariyat' ? 'Faqat Bosh Admin va Menegerlar suhbati' : 
                 `${activePartner?.role} | ${activePartner?.department} bo'limi`}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Flow Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold">Bu suhbatda xabarlar yo'q</p>
              <p className="text-xs text-slate-400 mt-1">Guruh a'zolariga birinchi bo'lib xabar yo'llang!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isCurrentUser = msg.sender_id === (user?.id || 'current_user');
              const roleColors = 
                msg.sender_role === 'Bosh Admin' ? 'bg-red-100 text-red-800' :
                msg.sender_role === 'Meneger' ? 'bg-purple-100 text-purple-800' :
                msg.sender_role === 'Tizim' ? 'bg-slate-100 text-slate-800' :
                'bg-amber-100 text-amber-800';

              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 max-w-[85%] sm:max-w-[80%] ${
                    isCurrentUser ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {msg.sender_avatar || msg.sender_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-1 min-w-0">
                    {/* Metadata Header */}
                    {!isCurrentUser && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-700 truncate">{msg.sender_name}</span>
                        <span className={`text-[7px] font-extrabold px-1 py-0.2 rounded uppercase tracking-wider shrink-0 ${roleColors}`}>
                          {msg.sender_role}
                        </span>
                      </div>
                    )}
                    
                    {/* Content Box */}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs break-words ${
                      isCurrentUser 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-[8px] text-slate-400 px-1 font-semibold ${isCurrentUser ? 'text-right' : ''}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form 
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2 sm:gap-3 shrink-0"
        >
          <input 
            type="text"
            placeholder={activeChannel === 'rahbariyat' ? "Xavfsiz xabar yo'llash..." : "Xabarni shu yerga yozing..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
