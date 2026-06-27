'use client';

import { create } from 'zustand';

// Types
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'extra';
export type Quality = 'low' | 'medium' | 'high';
export type Confidence = 'low' | 'medium' | 'high';
export type MealSource = 'manual' | 'ai' | 'template';

export interface MealEntry {
  id: string;
  userId: string;
  date: string;           // YYYY-MM-DD
  mealType: MealType;
  description: string | null;
  rawText: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  quality: Quality;
  confidence: Confidence;
  source: MealSource;
}

export interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesTarget: number;
  proteinTarget: number;
  mealsCount: number;
  mealsByType: Partial<Record<MealType, MealEntry[]>>;
  missingMealTypes: MealType[];
  proteinProgressPercent: number;
  caloriesProgressPercent: number;
}

export interface ParsedMealProposal {
  mealType: MealType;
  description: string;
  rawText: string;
  caloriesEstimate: number;
  proteinEstimate: number;
  carbsEstimate: number;
  fatEstimate: number;
  quality: Quality;
  confidence: Confidence;
  explanation: string;
}

export interface WeeklyNutrition {
  avgCalories: number;
  avgProtein: number;
  proteinTarget: number;
  daysHittingProtein: number;
  dailyData: Array<{ date: string; calories: number; protein: number }>;
}

export interface NutritionTemplate {
  id: string;
  name: string;
  mealType: MealType;
  description: string;
  caloriesEstimate: number;
  proteinEstimate: number;
}

// Store state
interface NutritionState {
  // Daily data (keyed by YYYY-MM-DD)
  mealsByDate: Record<string, MealEntry[]>;
  summaryByDate: Record<string, DailySummary>;

  // Weekly progress
  weeklyNutrition: WeeklyNutrition | null;

  // Templates
  templates: NutritionTemplate[];

  // Actions
  setMealsForDate(date: string, meals: MealEntry[]): void;
  setSummaryForDate(date: string, summary: DailySummary): void;
  addMeal(meal: MealEntry): void;
  removeMeal(id: string, date: string): void;
  updateMeal(id: string, date: string, updates: Partial<MealEntry>): void;
  setWeeklyNutrition(data: WeeklyNutrition): void;
  setTemplates(templates: NutritionTemplate[]): void;
}

export const useNutritionStore = create<NutritionState>()((set) => ({
  mealsByDate: {},
  summaryByDate: {},
  weeklyNutrition: null,
  templates: [],

  setMealsForDate(date, meals) {
    set((state) => ({
      mealsByDate: { ...state.mealsByDate, [date]: meals },
    }));
  },

  setSummaryForDate(date, summary) {
    set((state) => ({
      summaryByDate: { ...state.summaryByDate, [date]: summary },
    }));
  },

  addMeal(meal) {
    set((state) => {
      const date = meal.date;
      const existing = state.mealsByDate[date] ?? [];
      const updated = [...existing, meal];
      return {
        mealsByDate: { ...state.mealsByDate, [date]: updated },
      };
    });
  },

  removeMeal(id, date) {
    set((state) => {
      const existing = state.mealsByDate[date] ?? [];
      const updated = existing.filter((meal) => meal.id !== id);
      return {
        mealsByDate: { ...state.mealsByDate, [date]: updated },
      };
    });
  },

  updateMeal(id, date, updates) {
    set((state) => {
      const existing = state.mealsByDate[date] ?? [];
      const updated = existing.map((meal) =>
        meal.id === id ? { ...meal, ...updates } : meal,
      );
      return {
        mealsByDate: { ...state.mealsByDate, [date]: updated },
      };
    });
  },

  setWeeklyNutrition(data) {
    set({ weeklyNutrition: data });
  },

  setTemplates(templates) {
    set({ templates });
  },
}));
