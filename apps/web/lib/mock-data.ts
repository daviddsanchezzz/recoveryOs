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

  // 14 days of activities — mix of gym, bike, rehab, walk
  activities: [
    { id: 'a-14', date: d(-14), type: 'gym'    as const, durationMinutes: 60, notes: 'Pecho y tríceps' },
    { id: 'a-13', date: d(-13), type: 'walk'   as const, durationMinutes: 30 },
    { id: 'a-12', date: d(-12), type: 'bike'   as const, durationMinutes: 40, notes: 'Zona plana' },
    { id: 'a-11', date: d(-11), type: 'gym'    as const, durationMinutes: 55, notes: 'Espalda y bíceps' },
    { id: 'a-10', date: d(-10), type: 'rehab'  as const, durationMinutes: 20, notes: 'Bandas de tobillo' },
    // day -9: rest
    { id: 'a-8a', date: d(-8),  type: 'bike'   as const, durationMinutes: 45, notes: '45 min ruta suave' },
    { id: 'a-7',  date: d(-7),  type: 'gym'    as const, durationMinutes: 60, notes: 'Pierna modificada' },
    { id: 'a-6',  date: d(-6),  type: 'walk'   as const, durationMinutes: 35 },
    { id: 'a-5a', date: d(-5),  type: 'bike'   as const, durationMinutes: 50, notes: 'Tramos planos' },
    { id: 'a-4',  date: d(-4),  type: 'gym'    as const, durationMinutes: 55, notes: 'Hombros y core' },
    { id: 'a-3a', date: d(-3),  type: 'rehab'  as const, durationMinutes: 25, notes: 'Ejercicios de tobillo' },
    { id: 'a-3b', date: d(-3),  type: 'bike'   as const, durationMinutes: 40 },
    { id: 'a-2',  date: d(-2),  type: 'gym'    as const, durationMinutes: 50, notes: 'Pecho y core' },
    { id: 'a-1',  date: d(-1),  type: 'bike'   as const, durationMinutes: 35, notes: 'Suave, revisando tobillo' },
  ],

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
      activities: [{ id: 'a-7', date: d(-7), type: 'gym' as const, durationMinutes: 60, notes: 'Pierna modificada' }],
      injuryLogs: [{ id: 'il-7', injuryId: INJURY_ID, date: d(-7), painLevel: 3, didRehab: false }],
      habits: habits(false, false, true, true),
      notes: 'Pierna bien, tobillo aguanta',
    },
    {
      id: 'c-6',
      date: d(-6),
      weightKg: 78.3,
      activities: [{ id: 'a-6', date: d(-6), type: 'walk' as const, durationMinutes: 35 }],
      injuryLogs: [{ id: 'il-6', injuryId: INJURY_ID, date: d(-6), painLevel: 2, didRehab: true }],
      habits: habits(true, false, true, true),
    },
    {
      id: 'c-5',
      date: d(-5),
      weightKg: 78.2,
      activities: [{ id: 'a-5a', date: d(-5), type: 'bike' as const, durationMinutes: 50, notes: 'Tramos planos' }],
      injuryLogs: [{ id: 'il-5', injuryId: INJURY_ID, date: d(-5), painLevel: 2, didRehab: false }],
      habits: habits(false, false, true, false),
    },
    {
      id: 'c-4',
      date: d(-4),
      weightKg: 78.2,
      activities: [{ id: 'a-4', date: d(-4), type: 'gym' as const, durationMinutes: 55, notes: 'Hombros y core' }],
      injuryLogs: [{ id: 'il-4', injuryId: INJURY_ID, date: d(-4), painLevel: 2, didRehab: true }],
      habits: habits(true, true, true, true),
    },
    {
      id: 'c-3',
      date: d(-3),
      weightKg: 78.1,
      activities: [
        { id: 'a-3a', date: d(-3), type: 'rehab' as const, durationMinutes: 25, notes: 'Ejercicios de tobillo' },
        { id: 'a-3b', date: d(-3), type: 'bike'  as const, durationMinutes: 40 },
      ],
      injuryLogs: [{ id: 'il-3', injuryId: INJURY_ID, date: d(-3), painLevel: 2, didRehab: true }],
      habits: habits(true, true, true, true),
    },
    {
      id: 'c-2',
      date: d(-2),
      weightKg: 78.0,
      activities: [{ id: 'a-2', date: d(-2), type: 'gym' as const, durationMinutes: 50, notes: 'Pecho y core' }],
      injuryLogs: [{ id: 'il-2', injuryId: INJURY_ID, date: d(-2), painLevel: 2, didRehab: true }],
      habits: habits(true, false, true, true),
      notes: 'Buen día',
    },
    {
      id: 'c-1',
      date: d(-1),
      weightKg: 78.0,
      activities: [{ id: 'a-1', date: d(-1), type: 'bike' as const, durationMinutes: 35, notes: 'Suave, revisando tobillo' }],
      injuryLogs: [{ id: 'il-1', injuryId: INJURY_ID, date: d(-1), painLevel: 3, didRehab: true }],
      habits: habits(true, false, true, true),
    },
  ],
};
