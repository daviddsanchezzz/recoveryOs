export function formatDayLabel(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'short',
  });
}

export function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfWeekIso(baseDate = new Date()) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekDates(baseDate = new Date()) {
  const start = startOfWeekIso(baseDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function sameDay(left: string, right: string) {
  return left.slice(0, 10) === right.slice(0, 10);
}

