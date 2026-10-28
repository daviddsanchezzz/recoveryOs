import type { ActivityEntry, DailyCheckIn, InjuryLog } from '../stores/recovery-store';
import type { ActivityPlanEntry, PlanEntry } from '../stores/plan-store';

export function isSessionEntry(entry: PlanEntry): entry is ActivityPlanEntry {
  return entry.kind !== 'task';
}

function matchesPlanEntry(entry: ActivityPlanEntry, activity: ActivityEntry): boolean {
  return activity.type === entry.type;
}

/** Pairs each planned session with a logged activity of the same type (each activity used once). */
export function getPlannedActivityMatches(entries: ActivityPlanEntry[], activities: ActivityEntry[]) {
  const usedIds = new Set<string>();

  return entries.map((entry) => {
    // Rehab entries never match a logged Activity — completion comes from the day's
    // InjuryLog.didRehab / check-in, not from the Activities list.
    const matchedActivity = entry.type === 'rehab' ? null : activities.find((activity) => {
      if (usedIds.has(activity.id)) return false;
      return matchesPlanEntry(entry, activity);
    }) ?? null;

    if (matchedActivity) usedIds.add(matchedActivity.id);

    return { entry, matchedActivity };
  });
}

export function didRehabOn(date: string, checkIns: DailyCheckIn[], injuryLogs: InjuryLog[]): boolean {
  return checkIns.some((c) => c.date === date && c.habits.rehab) || injuryLogs.some((l) => l.date === date && l.didRehab);
}

export type PlanDayStatus = 'free' | 'done' | 'pending' | 'missed';

export type PlanDaySummary = {
  status: PlanDayStatus;
  sessionsTotal: number;
  sessionsDone: number;
  tasksTotal: number;
  tasksDone: number;
};

export function summarizePlanDay(input: {
  entries: PlanEntry[];
  activities: ActivityEntry[];
  rehabDone: boolean;
  date: string;
  today: string;
}): PlanDaySummary {
  const { entries, activities, rehabDone, date, today } = input;
  const sessions = entries.filter(isSessionEntry);
  const matches = getPlannedActivityMatches(sessions, activities.filter((a) => a.date === date));
  const sessionsDone = matches.filter(({ entry, matchedActivity }) => (entry.type === 'rehab' ? rehabDone : !!matchedActivity)).length;
  const tasks = entries.filter((e) => e.kind === 'task');
  const tasksDone = tasks.filter((e) => e.kind === 'task' && e.completed).length;

  let status: PlanDayStatus;
  if (sessions.length === 0) status = 'free';
  else if (sessionsDone === sessions.length) status = 'done';
  else status = date < today ? 'missed' : 'pending';

  return { status, sessionsTotal: sessions.length, sessionsDone, tasksTotal: tasks.length, tasksDone };
}
