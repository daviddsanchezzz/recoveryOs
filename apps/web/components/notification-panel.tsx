'use client';

import { Bell, Scale, Flame, FileText, CheckCircle2, X } from 'lucide-react';

type Notification = {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  time: string;
  read: boolean;
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: Scale,
    iconBg: 'bg-ember-light',
    iconColor: 'text-ember',
    title: 'No has registrado peso hoy',
    time: 'Hace 2h',
    read: false,
  },
  {
    id: '2',
    icon: Flame,
    iconBg: 'bg-moss-light',
    iconColor: 'text-moss',
    title: '¡10 días seguidos de rehab! Sigue así.',
    time: 'Ayer',
    read: false,
  },
  {
    id: '3',
    icon: FileText,
    iconBg: 'bg-sand-light',
    iconColor: 'text-ink/60',
    title: 'Resumen semanal disponible',
    time: 'Lun',
    read: true,
  },
  {
    id: '4',
    icon: CheckCircle2,
    iconBg: 'bg-moss-light',
    iconColor: 'text-moss',
    title: 'Rehab completada ayer. ¡Excelente!',
    time: 'Ayer',
    read: true,
  },
];

export function NotificationPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div
          className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-hidden"
          style={{ maxHeight: '80vh' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-ink" />
              <p className="text-base font-bold text-ink">Notificaciones</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center"
            >
              <X size={15} className="text-ink/60" />
            </button>
          </div>

          <div className="overflow-y-auto pb-8 px-4 space-y-2">
            {MOCK_NOTIFICATIONS.map((notif) => {
              const Icon = notif.icon;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl ${
                    notif.read ? 'bg-canvas-light/60' : 'bg-white shadow-card'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${notif.iconBg}`}
                  >
                    <Icon size={16} className={notif.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        notif.read ? 'text-ink/50' : 'text-ink font-medium'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-ink/30 mt-0.5">{notif.time}</p>
                  </div>
                  {!notif.read && (
                    <div className="flex-shrink-0 h-2 w-2 rounded-full bg-ember mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
