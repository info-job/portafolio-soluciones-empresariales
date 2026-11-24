
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Loader2, FileDown } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'loading';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

export interface NotificationPayload {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
  action?: NotificationAction;
}

interface Notification {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  action?: NotificationAction;
}

interface NotificationContextType {
  notify: (
    messageOrPayload: string | NotificationPayload, 
    type?: NotificationType, 
    duration?: number,
    action?: NotificationAction,
    title?: string
  ) => string;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((
    messageOrPayload: string | NotificationPayload, 
    type: NotificationType = 'info', 
    duration = 5000,
    action?: NotificationAction,
    title?: string
  ) => {
    const id = crypto.randomUUID();
    let finalMsg = '';
    let finalType: NotificationType = type;
    let finalDuration = duration;
    let finalAction = action;
    let finalTitle = title;

    if (typeof messageOrPayload === 'object' && messageOrPayload !== null) {
      finalMsg = messageOrPayload.message || '';
      finalType = messageOrPayload.type || type || 'info';
      finalDuration = messageOrPayload.duration !== undefined ? messageOrPayload.duration : duration;
      finalAction = messageOrPayload.action || action;
      finalTitle = messageOrPayload.title || title;
    } else {
      finalMsg = String(messageOrPayload);
    }

    setNotifications(prev => [...prev, { 
      id, 
      title: finalTitle,
      message: finalMsg, 
      type: finalType, 
      duration: finalDuration,
      action: finalAction 
    }]);

    if (finalType !== 'loading' && finalDuration > 0) {
      setTimeout(() => dismiss(id), finalDuration);
    }

    return id;
  }, [dismiss]);

  // Global listener for jde:notify window event
  useEffect(() => {
    const handleNotifyEvent = (e: CustomEvent<NotificationPayload>) => {
      if (e.detail) {
        notify(e.detail);
      }
    };
    window.addEventListener('jde:notify' as any, handleNotifyEvent);
    return () => window.removeEventListener('jde:notify' as any, handleNotifyEvent);
  }, [notify]);

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={`
                flex flex-col gap-2 p-4 rounded-2xl shadow-2xl border backdrop-blur-md w-full
                ${n.type === 'success' ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-900/10' : ''}
                ${n.type === 'error' ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-900/10' : ''}
                ${n.type === 'info' ? 'bg-indigo-50/95 border-indigo-300 text-indigo-950 shadow-indigo-900/10' : ''}
                ${n.type === 'loading' ? 'bg-slate-900/95 border-slate-700 text-white shadow-black/30' : ''}
              `}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {n.type === 'success' && <CheckCircle2 className="text-emerald-600" size={20} />}
                    {n.type === 'error' && <AlertCircle className="text-rose-600" size={20} />}
                    {n.type === 'info' && <Info className="text-indigo-600" size={20} />}
                    {n.type === 'loading' && <Loader2 className="text-indigo-400 animate-spin" size={20} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {n.title && (
                      <h4 className="text-xs font-black uppercase tracking-wider mb-1">
                        {n.title}
                      </h4>
                    )}
                    <p className="text-xs font-bold leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {n.type !== 'loading' && (
                    <button 
                      onClick={() => dismiss(n.id)}
                      className="flex-shrink-0 p-1 hover:bg-black/10 rounded-lg transition-colors cursor-pointer"
                      title="Cerrar notificación"
                    >
                      <X size={16} className="opacity-50 hover:opacity-100" />
                    </button>
                  )}
                </div>

                {/* Optional Action Button (e.g. Descargar Voucher PDF) */}
                {n.action && (
                  <div className="mt-1 pt-2 border-t border-black/10 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        n.action?.onClick();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002D62] hover:bg-[#001D42] text-amber-300 hover:text-white text-[11px] font-black rounded-lg shadow-sm border border-[#001D42] transition-all cursor-pointer active:scale-95"
                    >
                      {n.action.icon || <FileDown size={14} className="text-amber-400" />}
                      <span>{n.action.label}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
