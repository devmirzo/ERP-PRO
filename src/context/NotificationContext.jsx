import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-white border-emerald-200 text-slate-800 shadow-xl shadow-emerald-100/40 border-l-4 border-l-emerald-500';
      case 'error':
        return 'bg-white border-rose-200 text-slate-800 shadow-xl shadow-rose-100/40 border-l-4 border-l-rose-500';
      case 'warning':
        return 'bg-white border-amber-200 text-slate-800 shadow-xl shadow-amber-100/40 border-l-4 border-l-amber-500';
      case 'info':
      default:
        return 'bg-white border-blue-200 text-slate-800 shadow-xl shadow-blue-100/40 border-l-4 border-l-blue-500';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-right duration-300 transition-all ${getTypeStyles(n.type)}`}
          >
            {getIcon(n.type)}
            <div className="flex-1 text-sm font-medium leading-relaxed">{n.message}</div>
            <button
              onClick={() => removeNotification(n.id)}
              className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
