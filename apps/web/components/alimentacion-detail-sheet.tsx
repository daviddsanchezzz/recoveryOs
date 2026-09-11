'use client';

import { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Portal } from './portal';
import { useNutritionStore } from '../stores/nutrition-store';
import { NutritionService } from '../lib/services';
import type { DailySummary } from '../stores/nutrition-store';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno', lunch: 'Comida', snack: 'Snacks', dinner: 'Cena', extra: 'Extra',
};

export function AlimentacionDetailSheet({
  isOpen,
  onClose,
  onAddMeal,
  dailyNutrition,
  activeCalories,
  selectedDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: () => void;
  dailyNutrition: DailySummary;
  activeCalories: number;
  selectedDate: string;
}) {
  const meals = useNutritionStore((s) => s.mealsByDate[selectedDate]);

  useEffect(() => {
    if (isOpen) void NutritionService.fetchMealsForDate(selectedDate);
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const balance = dailyNutrition.totalCalories - activeCalories;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pt-2 pb-8 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Alimentación hoy</p>
                <p className="text-xl font-bold text-ink mt-0.5">
                  {dailyNutrition.totalCalories.toLocaleString('es-ES')} / {dailyNutrition.caloriesTarget.toLocaleString('es-ES')} kcal
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={onAddMeal}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-canvas-light text-xs font-semibold text-ink/60 active:scale-95 transition-transform">
                  <Plus size={11} />
                  Añadir
                </button>
                <button type="button" onClick={onClose}
                  className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                  <X size={15} className="text-ink/60" />
                </button>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-white overflow-hidden">
              <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${Math.min(dailyNutrition.caloriesProgressPercent, 100)}%` }} />
            </div>
            <p className="text-xs text-ink/40">{dailyNutrition.caloriesProgressPercent}% del objetivo</p>

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Consumidas</span>
                <span className="text-sm font-semibold text-ink">{dailyNutrition.totalCalories.toLocaleString('es-ES')} kcal</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Calorías activas</span>
                <span className="text-sm font-semibold text-ink">{activeCalories.toLocaleString('es-ES')} kcal</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Balance</span>
                <span className={`text-sm font-semibold ${balance >= 0 ? 'text-ember' : 'text-moss'}`}>
                  {balance >= 0 ? '+' : ''}{balance} kcal
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Comidas</p>
              <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
                {(meals ?? []).length === 0 ? (
                  <p className="py-3 text-sm text-ink/30">Sin comidas registradas</p>
                ) : (
                  (meals ?? []).map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between py-3">
                      <span className="text-sm text-ink/70">{MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}</span>
                      <span className="text-sm font-semibold text-ink">{meal.calories} kcal</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Macros</p>
              <div className="rounded-3xl bg-white shadow-card px-4 py-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink/70">Proteína</span>
                    <span className="text-sm font-semibold text-ink">
                      {dailyNutrition.totalProtein} / {dailyNutrition.proteinTarget} g
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                    <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${Math.min(dailyNutrition.proteinProgressPercent, 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">Carbohidratos</span>
                  <span className="text-sm font-semibold text-ink">{dailyNutrition.totalCarbs} g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">Grasas</span>
                  <span className="text-sm font-semibold text-ink">{dailyNutrition.totalFat} g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
