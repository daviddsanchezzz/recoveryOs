'use client';

import { TrendingDown, TrendingUp, CheckCircle2, Target } from 'lucide-react';
import type { TrendItem } from '../lib/progress-metrics';

const ICON_MAP: Record<string, React.ElementType> = {
  dolor:    TrendingDown,
  rehab:    CheckCircle2,
  actividad:TrendingUp,
  peso:     Target,
  default:  TrendingUp,
};

export function ProgressTrends({ trends }: { trends: TrendItem[] }) {
  if (trends.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Tendencias</p>
      <div className="space-y-2">
        {trends.map((trend) => {
          const Icon = ICON_MAP[trend.key] ?? ICON_MAP.default;
          return (
            <div
              key={trend.key}
              className="flex gap-3 rounded-3xl bg-moss-light border-l-4 border-moss p-4 items-start"
            >
              <Icon size={16} className="text-moss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ink leading-snug">{trend.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
