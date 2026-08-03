export const dayIds = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type CalendarDayId = (typeof dayIds)[number];
export type LegacyWeek<T> = Record<CalendarDayId, T[]>;
export type LegacyWeeks<T> = Record<"current" | "next", LegacyWeek<T>>;
export type TaskCalendar<T> = Record<string, T[]>;

export function startOfLocalWeek(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateKeysForWeek(date: Date, weekOffset = 0) {
  const monday = startOfLocalWeek(date);
  monday.setDate(monday.getDate() + weekOffset * 7);

  return dayIds.map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return localDateKey(day);
  });
}

export function storedTaskCalendar<T>(value: string | null): TaskCalendar<T> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return Object.fromEntries(
      Object.entries(parsed).filter(([date, tasks]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(tasks)),
    ) as TaskCalendar<T>;
  } catch {
    return null;
  }
}

export function migrateLegacyWeeks<T>(value: string | null, date: Date): TaskCalendar<T> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<Record<"current" | "next", Partial<LegacyWeek<T>>>>;
    if (!parsed || typeof parsed !== "object") return null;

    const calendar: TaskCalendar<T> = {};
    // In the old version the buckets never rolled over. At the first migration
    // the old "next" bucket is therefore the newly started current week.
    const legacyOffsets = { current: -1, next: 0 } as const;

    for (const legacyWeekId of ["current", "next"] as const) {
      const dates = dateKeysForWeek(date, legacyOffsets[legacyWeekId]);
      dayIds.forEach((dayId, index) => {
        const tasks = parsed[legacyWeekId]?.[dayId];
        if (Array.isArray(tasks) && tasks.length) calendar[dates[index]] = tasks;
      });
    }

    return calendar;
  } catch {
    return null;
  }
}
