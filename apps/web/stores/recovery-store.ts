'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { recoveryMockData } from '../lib/mock-data';
import { sameDay, todayIso } from '../lib/date';

export type ActivityType =
  | 'gym'
  | 'bike'
  | 'walk'
  | 'swim'
  | 'run'
  | 'mobility'
  | 'rehab'
  | 'other';

export type InjuryStatus = 'active' | 'recovering' | 'resolved';

export type Injury = {
  id: string;
  name: string;
  description?: string;
  bodyPart?: string;
  startDate: string;
  status: InjuryStatus;
};

export type InjuryLog = {
  id: string;
  injuryId: string;
  date: string;
  painLevel: number;
  didRehab: boolean;
  notes?: string;
};

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

export type ActivityEntry = {
  id: string;
  date: string;
  type: ActivityType;
  durationMinutes?: number;
  notes?: string;
};

export type DailyHabits = {
  rehab: boolean;
  mobility: boolean;
  stretching: boolean;
  goodNutrition: boolean;
  enoughProtein: boolean;
};

export type DailyCheckIn = {
  id: string;
  date: string;
  weightKg?: number;
  activities: ActivityEntry[];
  injuryLogs: InjuryLog[];
  habits: DailyHabits;
  notes?: string;
};

type CheckInInput = {
  date: string;
  weightKg?: number;
  activities: Array<{
    type: ActivityType;
    durationMinutes?: number;
    notes?: string;
  }>;
  injuryLogs: Array<{
    injuryId: string;
    painLevel: number;
    didRehab: boolean;
    notes?: string;
  }>;
  habits: DailyHabits;
  notes?: string;
};

type ProfileState = {
  name: string;
  activeGoals: string[];
  preferences: {
    primaryFocus: string;
  };
};

type RecoveryState = {
  profile: ProfileState;
  injuries: Injury[];
  injuryLogs: InjuryLog[];
  weightEntries: WeightEntry[];
  activities: ActivityEntry[];
  checkIns: DailyCheckIn[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  saveDailyCheckIn: (input: CheckInInput) => void;
  addInjury: (input: Omit<Injury, 'id'>) => void;
  updateInjury: (injuryId: string, input: Partial<Omit<Injury, 'id'>>) => void;
  saveWeight: (weightKg: number, date?: string) => void;
  addActivity: (input: Omit<ActivityEntry, 'id'>) => void;
  logInjuryPain: (input: Omit<InjuryLog, 'id'>) => void;
  setProfile: (input: Partial<ProfileState>) => void;
  seedWeightFromServer: (entries: WeightEntry[]) => void;
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function replaceByDate<T extends { date: string }>(entries: T[], date: string, nextEntries: T[]) {
  return [...entries.filter((entry) => !sameDay(entry.date, date)), ...nextEntries];
}

export const useRecoveryStore = create<RecoveryState>()(
  persist(
    (set) => ({
      profile: recoveryMockData.profile,
      injuries: recoveryMockData.injuries,
      injuryLogs: recoveryMockData.injuryLogs,
      weightEntries: recoveryMockData.weightEntries,
      activities: recoveryMockData.activities,
      checkIns: recoveryMockData.checkIns,
      selectedDate: todayIso(),
      setSelectedDate: (date) => set({ selectedDate: date }),
      saveDailyCheckIn: (input) =>
        set((state) => {
          const weightEntries =
            input.weightKg !== undefined
              ? replaceByDate(state.weightEntries, input.date, [
                  {
                    id: createId('weight'),
                    date: input.date,
                    weightKg: input.weightKg,
                  },
                ])
              : state.weightEntries.filter((entry) => !sameDay(entry.date, input.date));

          const activities = replaceByDate(
            state.activities,
            input.date,
            input.activities.map((activity) => ({
              id: createId('activity'),
              date: input.date,
              type: activity.type,
              durationMinutes: activity.durationMinutes,
              notes: activity.notes,
            })),
          );

          const injuryLogs = [
            ...state.injuryLogs.filter((log) => !sameDay(log.date, input.date)),
            ...input.injuryLogs.map((injuryLog) => ({
              id: createId('injury-log'),
              injuryId: injuryLog.injuryId,
              date: input.date,
              painLevel: injuryLog.painLevel,
              didRehab: injuryLog.didRehab,
              notes: injuryLog.notes,
            })),
          ];

          const todaysActivities = activities.filter((activity) => sameDay(activity.date, input.date));
          const todaysInjuryLogs = injuryLogs.filter((log) => sameDay(log.date, input.date));

          const checkIn: DailyCheckIn = {
            id: createId('checkin'),
            date: input.date,
            weightKg: input.weightKg,
            activities: todaysActivities,
            injuryLogs: todaysInjuryLogs,
            habits: input.habits,
            notes: input.notes,
          };

          const checkIns = [...state.checkIns.filter((entry) => !sameDay(entry.date, input.date)), checkIn];

          return {
            weightEntries,
            activities,
            injuryLogs,
            checkIns,
            selectedDate: input.date,
          };
        }),
      addInjury: (input) =>
        set((state) => ({
          injuries: [...state.injuries, { ...input, id: createId('injury') }],
        })),
      updateInjury: (injuryId, input) =>
        set((state) => ({
          injuries: state.injuries.map((injury) =>
            injury.id === injuryId ? { ...injury, ...input } : injury,
          ),
        })),
      saveWeight: (weightKg, date = todayIso()) =>
        set((state) => ({
          weightEntries: replaceByDate(state.weightEntries, date, [
            { id: createId('weight'), date, weightKg },
          ]),
        })),
      addActivity: (input) =>
        set((state) => ({
          activities: [
            ...state.activities.filter(
              (activity) =>
                !(
                  sameDay(activity.date, input.date) &&
                  activity.type === input.type &&
                  activity.notes === input.notes
                ),
            ),
            { ...input, id: createId('activity') },
          ],
        })),
      logInjuryPain: (input) =>
        set((state) => ({
          injuryLogs: [
            ...state.injuryLogs.filter(
              (log) => !(sameDay(log.date, input.date) && log.injuryId === input.injuryId),
            ),
            { ...input, id: createId('injury-log') },
          ],
        })),
      setProfile: (input) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...input,
            preferences: {
              ...state.profile.preferences,
              ...input.preferences,
            },
          },
        })),
      seedWeightFromServer: (entries) => set({ weightEntries: entries }),
    }),
    { name: 'recoveryos-v1-store' },
  ),
);

