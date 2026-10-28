'use client';

import { Plus } from 'lucide-react';

export type QuickLogItem = { key: string; label: string; onClick: () => void; missing: boolean };

/** One-tap shortcuts to register what is still missing for the day. */
export function TodayQuickLog({ items, title }: { items: QuickLogItem[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50 px-1">{title}</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold active:scale-95 transition-transform ${
              item.missing ? 'bg-ember/10 text-ember' : 'bg-white text-ink shadow-card'
            }`}
          >
            <Plus size={14} strokeWidth={2.5} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
