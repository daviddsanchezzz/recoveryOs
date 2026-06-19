'use client';

import { Heart, Activity, Scale, Flame } from 'lucide-react';
import type { StreakItem } from '../lib/progress-metrics';

const ICON_MAP = {
  heart:    Heart,
  activity: Activity,
  weight:   Scale,
  flame:    Flame,
} as const;

const COLOR_MAP = {
  heart:    'text-moss',
  activity: 'text-ember',
  weight:   'text-ink/60',
  flame:    'text-ember',
} as const;

export function ProgressStreaks({ streaks }: { streaks: StreakItem[] }) {
  const active = streaks.filter((s) => s.value > 0);
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Rachas</p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {active.map((streak) => {
          const Icon  = ICON_MAP[streak.iconName];
          const color = COLOR_MAP[streak.iconName];
          return (
            <div
              key={streak.key}
              className="flex-shrink-0 rounded-3xl bg-white shadow-card p-4 min-w-[112px] space-y-2"
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-2xl font-bold text-ink leading-tight">{streak.value}</p>
                <p className="text-[11px] text-ink/40 font-medium leading-tight">{streak.unit}</p>
              </div>
              <p className="text-xs font-semibold text-ink/50">{streak.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
