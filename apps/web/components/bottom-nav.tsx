'use client';

import { CalendarDays, Map, Activity, TrendingUp, MessageCircle } from 'lucide-react';

export type TabId = 'hoy' | 'plan' | 'actividades' | 'progreso' | 'chat';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'hoy',         label: 'Hoy',         icon: CalendarDays  },
  { id: 'plan',        label: 'Plan',        icon: Map           },
  { id: 'actividades', label: 'Actividades', icon: Activity      },
  { id: 'progreso',    label: 'Progreso',    icon: TrendingUp    },
  { id: 'chat',        label: 'Chat',        icon: MessageCircle },
];

export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-canvas-light/95 backdrop-blur-md shadow-bottom-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center gap-1 py-3 px-2 min-w-[44px]"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-ink' : 'bg-transparent'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? 'text-white' : 'text-ink/40'}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                  isActive ? 'text-ink' : 'text-ink/40'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
