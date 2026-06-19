'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { TrendItem } from '../lib/progress-metrics';

export function ProgressTrends({ trends }: { trends: TrendItem[] }) {
  if (trends.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">Insights</p>
      <div className="rounded-4xl bg-white shadow-card overflow-hidden divide-y divide-ink/5">
        {trends.map((trend) => {
          const isPositive = trend.direction === 'positive';
          const isNegative = trend.direction === 'negative';
          const Icon  = isPositive ? TrendingDown : isNegative ? TrendingUp : Minus;
          const color = isPositive ? 'text-moss' : isNegative ? 'text-red-500' : 'text-ink/30';
          return (
            <div key={trend.key} className="flex gap-3 px-5 py-4 items-start">
              <Icon size={15} className={`${color} flex-shrink-0 mt-0.5`} />
              <p className="text-sm text-ink leading-snug">{trend.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
