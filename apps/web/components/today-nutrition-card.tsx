'use client';

import { UtensilsCrossed, Scale, Plus } from 'lucide-react';
import type { DailySummary } from '../stores/nutrition-store';

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');

export function TodayNutritionCard({
  dailyNutrition, caloriesOut, isToday, onOpenDetail, onAddMeal,
}: {
  dailyNutrition: DailySummary | null;
  /** Estimated total expenditure for the day (basal + active). */
  caloriesOut: number;
  isToday: boolean;
  onOpenDetail: () => void;
  onAddMeal: () => void;
}) {
  const consumed = dailyNutrition?.totalCalories ?? 0;
  const target = dailyNutrition?.caloriesTarget ?? 0;
  const hasMeals = consumed > 0;
  const remaining = target - consumed;
  const balance = consumed - caloriesOut;

  return (
    <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Alimentación</p>
        <button
          type="button"
          onClick={onAddMeal}
          className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink active:scale-95 transition-transform"
        >
          <Plus size={12} strokeWidth={2.5} /> Comida
        </button>
      </div>

      {!hasMeals ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Sin comidas registradas</p>
          <p className="text-xs text-ink/60">
            {target > 0 ? `Objetivo del día: ${fmt(target)} kcal.` : 'Añade tu primera comida para ver el balance.'}
            {caloriesOut > 0 && ` Gasto estimado: ${fmt(caloriesOut)} kcal.`}
          </p>
        </div>
      ) : (
        <button type="button" onClick={onOpenDetail} className="grid w-full grid-cols-2 gap-5 text-left">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <UtensilsCrossed size={13} className="flex-shrink-0 self-center text-ink/50" />
              <span className="text-lg font-bold text-ink">{fmt(consumed)}</span>
              <span className="text-xs text-ink/60">kcal</span>
            </div>
            <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${remaining < 0 ? 'bg-ember' : 'bg-moss'}`}
                style={{ width: `${Math.min(dailyNutrition?.caloriesProgressPercent ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink/50">de {fmt(target)} de objetivo</p>
          </div>

          {isToday ? (
            <div className="space-y-1.5">
              <p className={`text-lg font-bold ${remaining < 0 ? 'text-ember' : 'text-ink'}`}>
                {fmt(Math.abs(remaining))} <span className="text-xs font-normal text-ink/60">kcal</span>
              </p>
              <p className="text-xs text-ink/70">{remaining < 0 ? 'Por encima del objetivo' : 'Te quedan'}</p>
              {caloriesOut > 0 && <p className="text-[11px] text-ink/50">Gasto estimado {fmt(caloriesOut)} kcal</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-1">
                <Scale size={13} className="flex-shrink-0 self-center text-ink/50" />
                <span className={`text-lg font-bold ${balance > 0 ? 'text-ember' : 'text-moss'}`}>
                  {balance > 0 ? '+' : ''}{fmt(balance)}
                </span>
                <span className="text-xs text-ink/60">kcal</span>
              </div>
              <p className="text-xs text-ink/70">Balance del día</p>
              <p className="text-[11px] text-ink/50">Gasto estimado {fmt(caloriesOut)} kcal</p>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
