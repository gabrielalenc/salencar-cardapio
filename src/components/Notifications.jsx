import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const NotificationsContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

function Toast({ notice, onDismiss }) {
  const Icon = ICONS[notice.type] || Info;
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notice.id), notice.duration || 4200);
    return () => window.clearTimeout(timer);
  }, [notice.id, notice.duration, onDismiss]);
  const colors = notice.type === 'error' ? 'border-rose-200 bg-white text-rose-900' : notice.type === 'success' ? 'border-emerald-200 bg-white text-stone-900' : 'border-primary/15 bg-white text-stone-900';
  const iconColor = notice.type === 'error' ? 'text-rose-600' : notice.type === 'success' ? 'text-emerald-600' : 'text-primary';
  return <div role={notice.type === 'error' ? 'alert' : 'status'} className={`notification-enter pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-elevated sm:p-4 ${colors}`}>
    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
    <div className="min-w-0 flex-1"><p className="text-sm font-bold">{notice.title}</p>{notice.message && <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{notice.message}</p>}</div>
    <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Fechar notificação" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"><X className="h-4 w-4" /></button>
  </div>;
}

export function NotificationProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const notify = useCallback((options) => {
    const notice = typeof options === 'string' ? { title: options } : options;
    const id = `${Date.now()}-${Math.random()}`;
    setNotices((previous) => [...previous.slice(-2), { id, type: 'info', ...notice }]);
    return id;
  }, []);
  const dismiss = useCallback((id) => setNotices((previous) => previous.filter((notice) => notice.id !== id)), []);
  const confirm = useCallback((options) => new Promise((resolve) => {
    setConfirmation((previous) => {
      previous?.resolve(false);
      return { title: 'Confirme esta ação', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', ...options, resolve };
    });
  }), []);
  const finishConfirmation = (accepted) => {
    confirmation?.resolve(accepted);
    setConfirmation(null);
  };

  useEffect(() => {
    if (!confirmation) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') finishConfirmation(false); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmation]);

  return <NotificationsContext.Provider value={{ notify, confirm }}>
    {children}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-[140] mx-auto flex max-w-md flex-col gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-full">{notices.map((notice) => <Toast key={notice.id} notice={notice} onDismiss={dismiss} />)}</div>
    {confirmation && <div className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-950/45 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) finishConfirmation(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" className="notification-enter w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-elevated sm:p-6">
        <h2 id="confirmation-title" className="text-base font-bold text-stone-900">{confirmation.title}</h2>
        {confirmation.message && <p className="mt-2 text-sm leading-relaxed text-stone-600">{confirmation.message}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => finishConfirmation(false)} className="min-h-11 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">{confirmation.cancelLabel}</button>
          <button type="button" autoFocus onClick={() => finishConfirmation(true)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white transition ${confirmation.destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary-hover'}`}>{confirmation.confirmLabel}</button>
        </div>
      </section>
    </div>}
  </NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  return context;
}
