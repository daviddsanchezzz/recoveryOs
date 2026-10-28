'use client';

import { Footprints, Flame } from 'lucide-react';

function GoalMeter({
  icon, iconClass, value, unit, goal, onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: number;
  unit: string;
  goal: number;
  onClick: () => void;
}) {
  const pct = Math.round((value / goal) * 100);
  const reached = pct >= 100;
  return (
    <button type="button" onClick={onClick} className="space-y-1.5 text-left">
      <div className="flex items-baseline gap-1">
        <span className={`flex-shrink-0 self-center ${iconClass}`}>{icon}</span>
        <span className="text-lg font-bold text-ink">{value.toLocaleString('es-ES')}</span>
        <span className="text-xs text-ink/60">{unit}</span>
      </div>
      <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
        <div className="bg-moss h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink/50">de {goal.toLocaleString('es-ES')}</span>
        <span className={`text-[11px] ${reached ? 'font-bold text-moss' : 'text-ink/50'}`}>
          {reached && pct > 100 ? `${pct}% · superado` : `${pct}%`}
        </span>
      </div>
    </button>
  );
}

export function TodayMovementCard({
  steps, stepsGoal, activeCalories, caloriesGoal, onOpenSteps, onOpenCalories,
}: {
  steps: number;
  stepsGoal: number;
  activeCalories: number;
  caloriesGoal: number;
  onOpenSteps: () => void;
  onOpenCalories: () => void;
}) {
  return (
    <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Movimiento</p>
      <div className="grid grid-cols-2 gap-5">
        <GoalMeter icon={<Footprints size={13} />} iconClass="text-ink/50" value={steps} unit="pasos" goal={stepsGoal} onClick={onOpenSteps} />
        <GoalMeter icon={<Flame size={13} />} iconClass="text-ember" value={activeCalories} unit="kcal activas" goal={caloriesGoal} onClick={onOpenCalories} />
      </div>
    </div>
  );
}
