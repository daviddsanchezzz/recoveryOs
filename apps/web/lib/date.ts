function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return localIso(new Date());
}

export function formatDayLabel(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
  });
}

export function formatShortDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function startOfWeekIso(baseDate: Date | string = new Date()): string {
  const date = typeof baseDate === 'string'
    ? new Date(baseDate + 'T12:00:00')
    : new Date(baseDate);
  const day  = date.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  date.setDate(date.getDate() + diff);
  return localIso(date);
}

export function addDays(isoDate: string, days: number): string {
  // Parse as local date (append T12:00 to avoid UTC-shift on bare YYYY-MM-DD)
  const date = new Date(isoDate + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return localIso(date);
}

export function weekDates(baseDate: Date | string = new Date()): string[] {
  const start = startOfWeekIso(baseDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sameDay(left: string, right: string) {
  return left.slice(0, 10) === right.slice(0, 10);
}
