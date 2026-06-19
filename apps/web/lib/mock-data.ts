import type { ActivityEntry, SleepEntry } from '../stores/recovery-store';
import { addDays, todayIso } from './date';

const today = todayIso();

function d(n: number) {
  return addDays(today, n);
}

const INJURY_ID = 'injury-tibial-posterior';

// Default habits object for convenience
function habits(
  rehab: boolean,
  mobility = false,
  nutrition = true,
  protein = true,
): {
  rehab: boolean;
  mobility: boolean;
  stretching: boolean;
  goodNutrition: boolean;
  enoughProtein: boolean;
} {
  return { rehab, mobility, stretching: false, goodNutrition: nutrition, enoughProtein: protein };
}

export const recoveryMockData = {
  profile: {
    name: 'David',
    activeGoals: ['Reducir dolor', 'Mantener fuerza', 'Constancia en rehab'],
    preferences: { primaryFocus: 'recuperacion' },
  },

  injuries: [
    {
      id: INJURY_ID,
      name: 'Tibial posterior',
      description: 'Tendinopatía del tibial posterior',
      bodyPart: 'Tobillo derecho',
      startDate: d(-45),
      status: 'active' as const,
    },
  ],

  // 14 days of weight — slight downtrend 78.8 → 78.0
  weightEntries: [
    { id: 'w-14', date: d(-14), weightKg: 78.8 },
    { id: 'w-13', date: d(-13), weightKg: 78.7 },
    { id: 'w-12', date: d(-12), weightKg: 78.7 },
    { id: 'w-11', date: d(-11), weightKg: 78.6 },
    { id: 'w-10', date: d(-10), weightKg: 78.5 },
    { id: 'w-9',  date: d(-9),  weightKg: 78.5 },
    // day -8: rest day, no weight
    { id: 'w-7',  date: d(-7),  weightKg: 78.4 },
    { id: 'w-6',  date: d(-6),  weightKg: 78.3 },
    { id: 'w-5',  date: d(-5),  weightKg: 78.2 },
    { id: 'w-4',  date: d(-4),  weightKg: 78.2 },
    { id: 'w-3',  date: d(-3),  weightKg: 78.1 },
    { id: 'w-2',  date: d(-2),  weightKg: 78.0 },
    { id: 'w-1',  date: d(-1),  weightKg: 78.0 },
  ],

  activities: generateActivities(),

  // Injury logs — improving pain trend 5 → 2-3
  injuryLogs: [
    { id: 'il-14', injuryId: INJURY_ID, date: d(-14), painLevel: 5, didRehab: false },
    { id: 'il-13', injuryId: INJURY_ID, date: d(-13), painLevel: 5, didRehab: true  },
    { id: 'il-12', injuryId: INJURY_ID, date: d(-12), painLevel: 4, didRehab: true  },
    { id: 'il-11', injuryId: INJURY_ID, date: d(-11), painLevel: 4, didRehab: false },
    { id: 'il-10', injuryId: INJURY_ID, date: d(-10), painLevel: 3, didRehab: true  },
    { id: 'il-9',  injuryId: INJURY_ID, date: d(-9),  painLevel: 4, didRehab: false },
    { id: 'il-8',  injuryId: INJURY_ID, date: d(-8),  painLevel: 3, didRehab: true  },
    { id: 'il-7',  injuryId: INJURY_ID, date: d(-7),  painLevel: 3, didRehab: false },
    { id: 'il-6',  injuryId: INJURY_ID, date: d(-6),  painLevel: 2, didRehab: true  },
    { id: 'il-5',  injuryId: INJURY_ID, date: d(-5),  painLevel: 2, didRehab: false },
    { id: 'il-4',  injuryId: INJURY_ID, date: d(-4),  painLevel: 2, didRehab: true  },
    { id: 'il-3',  injuryId: INJURY_ID, date: d(-3),  painLevel: 2, didRehab: true  },
    { id: 'il-2',  injuryId: INJURY_ID, date: d(-2),  painLevel: 2, didRehab: true  },
    { id: 'il-1',  injuryId: INJURY_ID, date: d(-1),  painLevel: 3, didRehab: true  },
  ],

  // Check-ins for the past 7 days (key for streak + rehab adherence)
  checkIns: [
    {
      id: 'c-7',
      date: d(-7),
      weightKg: 78.4,
      activities: [],
      injuryLogs: [{ id: 'il-7', injuryId: INJURY_ID, date: d(-7), painLevel: 3, didRehab: false }],
      habits: habits(false, false, true, true),
      notes: 'Pierna bien, tobillo aguanta',
    },
    {
      id: 'c-6',
      date: d(-6),
      weightKg: 78.3,
      activities: [],
      injuryLogs: [{ id: 'il-6', injuryId: INJURY_ID, date: d(-6), painLevel: 2, didRehab: true }],
      habits: habits(true, false, true, true),
    },
    {
      id: 'c-5',
      date: d(-5),
      weightKg: 78.2,
      activities: [],
      injuryLogs: [{ id: 'il-5', injuryId: INJURY_ID, date: d(-5), painLevel: 2, didRehab: false }],
      habits: habits(false, false, true, false),
    },
    {
      id: 'c-4',
      date: d(-4),
      weightKg: 78.2,
      activities: [],
      injuryLogs: [{ id: 'il-4', injuryId: INJURY_ID, date: d(-4), painLevel: 2, didRehab: true }],
      habits: habits(true, true, true, true),
    },
    {
      id: 'c-3',
      date: d(-3),
      weightKg: 78.1,
      activities: [],
      injuryLogs: [{ id: 'il-3', injuryId: INJURY_ID, date: d(-3), painLevel: 2, didRehab: true }],
      habits: habits(true, true, true, true),
    },
    {
      id: 'c-2',
      date: d(-2),
      weightKg: 78.0,
      activities: [],
      injuryLogs: [{ id: 'il-2', injuryId: INJURY_ID, date: d(-2), painLevel: 2, didRehab: true }],
      habits: habits(true, false, true, true),
      notes: 'Buen día',
    },
    {
      id: 'c-1',
      date: d(-1),
      weightKg: 78.0,
      activities: [],
      injuryLogs: [{ id: 'il-1', injuryId: INJURY_ID, date: d(-1), painLevel: 3, didRehab: true }],
      habits: habits(true, false, true, true),
    },
  ],

  sleepEntries: generateSleepEntries(),
};

// ── Generators ─────────────────────────────────────────────────────────────

function generateActivities(): ActivityEntry[] {
  const acts: ActivityEntry[] = [];
  let n = 1;

  const gymDur  = [45, 55, 60, 50];
  const gymVol  = [9500, 12000, 8500, 11000];
  const bikeDur = [50, 90, 60, 75];
  const bikeDist= [22, 38, 28, 32];
  const walkDur = [30, 45, 35, 40];
  const walkDist= [3.2, 5.1, 3.8, 4.5];

  for (let w = 11; w >= 0; w--) {
    const wEnd   = d(-(w * 7));
    const wStart = addDays(wEnd, -6);
    const m      = (11 - w) % 4;

    const push = (offset: number, entry: Omit<ActivityEntry, 'id' | 'date'>) => {
      const date = addDays(wStart, offset);
      if (date <= d(0)) acts.push({ id: `m-act-${n++}`, date, ...entry });
    };

    // Gym: Mon / Wed / Fri
    push(0, { type: 'gym', durationMinutes: gymDur[m],           totalVolumeKg: gymVol[m]            });
    push(2, { type: 'gym', durationMinutes: gymDur[(m+1)%4],     totalVolumeKg: gymVol[(m+1)%4]      });
    push(4, { type: 'gym', durationMinutes: gymDur[(m+2)%4],     totalVolumeKg: gymVol[(m+2)%4]      });

    // Bike: Tue (skip every 3rd week)
    if (w % 3 !== 2) push(1, { type: 'bike', durationMinutes: bikeDur[m], distanceKm: bikeDist[m], avgHeartRateBpm: 138 + m * 4 });

    // Walk: Thu, and Sat on even weeks
    push(3, { type: 'walk', durationMinutes: walkDur[m],         distanceKm: walkDist[m]             });
    if (w % 2 === 0) push(5, { type: 'walk', durationMinutes: walkDur[(m+2)%4], distanceKm: walkDist[(m+2)%4] });
  }

  return acts;
}

function generateSleepEntries(): SleepEntry[] {
  const entries: SleepEntry[] = [];
  const durations: number[] = [7.5, 8.0, 6.5, 7.0, 8.5, 7.5, 7.0];
  const qualities: (1 | 2 | 3 | 4 | 5)[] = [3, 4, 3, 4, 5, 4, 3];
  let n = 1;
  for (let i = 83; i >= 1; i--) {
    if (i % 7 === 3) continue; // ~1 skipped night per week
    const idx = i % 7;
    entries.push({ id: `m-sleep-${n++}`, date: d(-i), durationH: durations[idx], quality: qualities[idx] });
  }
  return entries;
}
