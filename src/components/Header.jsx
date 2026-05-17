import React, { useState, useEffect } from 'react';
import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Play incoming message double-ping sound
  const playReceiveSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // First high-pitch ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Second higher-pitch ping offset slightly
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6 note
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

  useEffect(() => {
    // Unread count loader and listener
    const updateUnread = () => {
      setUnreadCount(Number(localStorage.getItem('erp_unread_count') || 0));
    };
    updateUnread();

    window.addEventListener('erp_new_message', updateUnread);
    window.addEventListener('storage', updateUnread);

    // Global real-time Supabase message listener for notifications when on other pages
    let subscription;
    if (user?.id) {
      subscription = supabase
        .channel('global_header_notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const msg = payload.new;
          // Ignore messages sent by current user
          if (msg.sender_id === user.id) return;
          
          // Check if we are already in the chat room (handled by Messages.jsx)
          // Increment unread count in localStorage
          const currentUnread = Number(localStorage.getItem('erp_unread_count') || 0);
          localStorage.setItem('erp_unread_count', currentUnread + 1);
          window.dispatchEvent(new Event('erp_new_message'));
          playReceiveSound();
        })
        .subscribe();
    }

    // Local Storage message fallback listener (for single browser instance fallback testing)
    const handleLocalMsg = (e) => {
      const msg = e.detail;
      if (msg.sender_id === user?.id) return;
      const currentUnread = Number(localStorage.getItem('erp_unread_count') || 0);
      localStorage.setItem('erp_unread_count', currentUnread + 1);
      window.dispatchEvent(new Event('erp_new_message'));
      playReceiveSound();
    };

    window.addEventListener('erp_local_message_received', handleLocalMsg);

    return () => {
      window.removeEventListener('erp_new_message', updateUnread);
      window.removeEventListener('storage', updateUnread);
      window.removeEventListener('erp_local_message_received', handleLocalMsg);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      
      <div className="flex items-center gap-3 sm:gap-4 flex-1">
        {/* Menu toggle button */}
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          title="Menyuni ochish"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tizim bo'ylab qidiruv..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button 
          onClick={() => {
            localStorage.setItem('erp_unread_count', '0');
            setUnreadCount(0);
            navigate('/messages');
          }}
          className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Xabarlarga o'tish"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-white">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="h-8 w-px bg-slate-200 mx-1 sm:mx-2"></div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            title="Profilni ko'rish"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">{user?.name || 'Foydalanuvchi'}</span>
              <span className="text-xs font-medium text-slate-500">{user?.role || 'Mehmon'}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center hover:ring-2 ring-blue-500 ring-offset-2 transition-all group-hover:scale-105">
              <span className="text-sm font-bold text-blue-700">{user?.name ? user.name.charAt(0) : 'U'}</span>
            </div>
          </div>
          
          <button onClick={handleLogout} className="ml-1 sm:ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors hidden md:block" title="Tizimdan chiqish">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
