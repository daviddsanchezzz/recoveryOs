import { addDays, todayIso } from './date';

const today = todayIso();

export const recoveryMockData = {
  profile: {
    name: 'David',
    activeGoals: ['Reducir dolor', 'Mantener fuerza', 'Ser constante con rehab'],
    preferences: {
      primaryFocus: 'recuperacion',
    },
  },
  injuries: [
    {
      id: 'injury-tibial-posterior',
      name: 'Tibial posterior',
      description: 'Tendinopatia en recuperacion',
      bodyPart: 'Tobillo derecho',
      startDate: addDays(today, -21),
      status: 'active' as const,
    },
  ],
  weightEntries: [
    { id: 'w-1', date: addDays(today, -6), weightKg: 78.6 },
    { id: 'w-2', date: addDays(today, -3), weightKg: 78.4 },
  ],
  activities: [
    { id: 'a-1', date: addDays(today, -4), type: 'gym' as const, durationMinutes: 55, notes: 'pierna ligera' },
    { id: 'a-2', date: addDays(today, -2), type: 'bike' as const, durationMinutes: 35, notes: 'suave' },
    { id: 'a-3', date: addDays(today, -1), type: 'rehab' as const, durationMinutes: 20, notes: 'bandas' },
  ],
  injuryLogs: [
    {
      id: 'il-1',
      injuryId: 'injury-tibial-posterior',
      date: addDays(today, -6),
      painLevel: 4,
      didRehab: true,
      notes: 'mejor por la tarde',
    },
    {
      id: 'il-2',
      injuryId: 'injury-tibial-posterior',
      date: addDays(today, -2),
      painLevel: 3,
      didRehab: true,
      notes: 'estable',
    },
  ],
  checkIns: [
    {
      id: 'c-1',
      date: addDays(today, -2),
      weightKg: 78.4,
      activities: [
        { id: 'a-2', date: addDays(today, -2), type: 'bike' as const, durationMinutes: 35, notes: 'suave' },
      ],
      injuryLogs: [
        {
          id: 'il-2',
          injuryId: 'injury-tibial-posterior',
          date: addDays(today, -2),
          painLevel: 3,
          didRehab: true,
          notes: 'estable',
        },
      ],
      habits: {
        rehab: true,
        mobility: true,
        stretching: false,
        goodNutrition: true,
        enoughProtein: true,
      },
      notes: 'buen dia general',
    },
  ],
};
