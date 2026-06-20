'use client';

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useToastStore, type Toast } from '../stores/toast-store';

const CONFIG = {
  error:   { Icon: AlertCircle, text: 'text-red-500',  bg: 'bg-white',       bar: 'bg-red-400'  },
  success: { Icon: CheckCircle, text: 'text-moss',     bg: 'bg-white',       bar: 'bg-moss'     },
  info:    { Icon: Info,        text: 'text-ink/50',   bg: 'bg-white',       bar: 'bg-ink/30'   },
} as const;

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  const { Icon, text, bg, bar } = CONFIG[t.type];
  return (
    <div className={`flex items-center gap-3 ${bg} rounded-2xl shadow-card-lg px-4 py-3.5 animate-slide-up overflow-hidden relative`}>
      {/* Colored left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${bar}`} />
      <Icon size={16} className={`flex-shrink-0 ml-2 ${text}`} />
      <p className="flex-1 text-sm font-medium text-ink leading-snug">{t.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-ink/5 transition-colors"
      >
        <X size={12} className="text-ink/30" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-[88px] left-0 right-0 z-[100] px-4 flex flex-col gap-2 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto max-w-md mx-auto w-full">
          <ToastItem t={t} onDismiss={() => remove(t.id)} />
        </div>
      ))}
    </div>
  );
}
