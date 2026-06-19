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

export type SleepEntry = {
  id: string;
  date: string;
  durationH: number;
  quality: 1 | 2 | 3 | 4 | 5;
};

export type MuscleGroup =
  | 'pecho' | 'espalda' | 'biceps' | 'triceps'
  | 'hombro' | 'core' | 'pierna' | 'gluteo';

export type ActivityEntry = {
  id: string;
  date: string;
  type: ActivityType;
  durationMinutes?: number;
  notes?: string;

  // Common metrics
  kcal?: number;
  avgHeartRateBpm?: number;
  maxHeartRateBpm?: number;

  // Distance activities (run, walk, bike)
  distanceKm?: number;
  elevationGainM?: number;

  // Run / Walk
  avgPaceSecPerKm?: number;   // display as mm:ss/km
  avgCadenceSpm?: number;     // steps per minute

  // Bike
  avgSpeedKmh?: number;
  avgPowerW?: number;
  avgCadenceRpm?: number;
  kilojoules?: number;

  // Swim
  distanceM?: number;
  avgPacePer100mSec?: number;

  // Gym
  muscleGroups?: MuscleGroup[];
  totalVolumeKg?: number;

  // Strava integration
  stravaId?: number;
  stravaName?: string;
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
  activities: Array<Omit<ActivityEntry, 'id' | 'date'>>;
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

type ActivitiesMeta = {
  loaded: boolean;
  hasMore: boolean;
  nextCursor: string | null;
};

type RecoveryState = {
  profile: ProfileState;
  injuries: Injury[];
  injuryLogs: InjuryLog[];
  weightEntries: WeightEntry[];
  activities: ActivityEntry[];
  activitiesMeta: ActivitiesMeta;
  checkIns: DailyCheckIn[];
  sleepEntries: SleepEntry[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  saveSleep: (input: Omit<SleepEntry, 'id'>) => void;
  saveDailyCheckIn: (input: CheckInInput) => void;
  addInjury: (input: Omit<Injury, 'id'>) => void;
  updateInjury: (injuryId: string, input: Partial<Omit<Injury, 'id'>>) => void;
  saveWeight: (weightKg: number, date?: string) => void;
  addActivity: (input: ActivityEntry) => void;
  removeActivity: (id: string) => void;
  logInjuryPain: (input: Omit<InjuryLog, 'id'>) => void;
  setProfile: (input: Partial<ProfileState>) => void;
  seedWeightFromServer: (entries: WeightEntry[]) => void;
  seedTodayActivities: (entries: ActivityEntry[]) => void;
  appendActivities: (entries: ActivityEntry[], hasMore: boolean, nextCursor: string | null, replace?: boolean) => void;
  clearAllData: () => void;
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function replaceByDate<T extends { date: string }>(entries: T[], date: string, nextEntries: T[]) {
  return [...entries.filter((entry) => !sameDay(entry.date, date)), ...nextEntries];
}

const INITIAL_ACTIVITIES_META: ActivitiesMeta = { loaded: false, hasMore: true, nextCursor: null };

export const useRecoveryStore = create<RecoveryState>()(
  persist(
    (set) => ({
      profile: recoveryMockData.profile,
      injuries: recoveryMockData.injuries,
      injuryLogs: recoveryMockData.injuryLogs,
      weightEntries: recoveryMockData.weightEntries,
      activities: recoveryMockData.activities,
      activitiesMeta: INITIAL_ACTIVITIES_META,
      checkIns: recoveryMockData.checkIns,
      sleepEntries: recoveryMockData.sleepEntries,
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
              ...activity,
              id: createId('activity'),
              date: input.date,
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
      removeActivity: (id) =>
        set((state) => ({ activities: state.activities.filter((a) => a.id !== id) })),
      addActivity: (input) =>
        set((state) => ({
          activities: [
            input,
            ...state.activities.filter((a) => a.id !== input.id),
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
      seedTodayActivities: (entries) =>
        set((state) => {
          const existingIds = new Set(state.activities.map((a) => a.id));
          const fresh = entries.filter((e) => !existingIds.has(e.id));
          return { activities: [...fresh, ...state.activities] };
        }),
      appendActivities: (entries, hasMore, nextCursor, replace = false) =>
        set((state) => {
          if (replace) {
            return { activities: entries, activitiesMeta: { loaded: true, hasMore, nextCursor } };
          }
          const existingIds = new Set(state.activities.map((a) => a.id));
          const fresh = entries.filter((e) => !existingIds.has(e.id));
          return {
            activities: [...state.activities, ...fresh],
            activitiesMeta: { loaded: true, hasMore, nextCursor },
          };
        }),
      saveSleep: (input) =>
        set((state) => ({
          sleepEntries: [
            ...state.sleepEntries.filter((e) => !sameDay(e.date, input.date)),
            { ...input, id: createId('sleep') },
          ],
        })),
      clearAllData: () =>
        set({ activities: [], weightEntries: [], checkIns: [], injuryLogs: [], injuries: [], sleepEntries: [], activitiesMeta: INITIAL_ACTIVITIES_META }),
    }),
    {
      name: 'recoveryos-v1-store',
      version: 2,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { activitiesMeta: _meta, ...rest } = state;
        return rest as RecoveryState;
      },
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Record<string, unknown>;
        if (fromVersion < 2) {
          // Remove mock activities (IDs like a-14, a-13, a-8a, a-3b …)
          const isMockId = (id: string) => /^a-\d+[a-z]?$/.test(id);
          const acts = (state.activities as ActivityEntry[] | undefined) ?? [];
          state.activities = acts.filter((a) => !isMockId(a.id));
          // Also scrub them from embedded checkIn.activities arrays
          const cis = (state.checkIns as DailyCheckIn[] | undefined) ?? [];
          state.checkIns = cis.map((ci) => ({
            ...ci,
            activities: (ci.activities ?? []).filter((a) => !isMockId(a.id)),
          }));
        }
        return state as RecoveryState;
      },
    },
  ),
);


