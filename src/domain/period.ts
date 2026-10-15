export type PeriodMode = 'day' | 'week' | 'month' | 'custom';

export type PeriodSelection = {
  mode: PeriodMode;
  anchor: string;
  customStart: string;
  customEnd: string;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fromDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

export function createPeriodSelection(mode: PeriodMode, anchor: string): PeriodSelection {
  return { mode, anchor, customStart: anchor, customEnd: anchor };
}

export function resolvePeriodRange(selection: PeriodSelection): DateRange {
  const anchor = datePattern.test(selection.anchor) ? fromDateString(selection.anchor) : new Date();
  if (selection.mode === 'day') {
    const date = toDateString(anchor);
    return { startDate: date, endDate: date };
  }
  if (selection.mode === 'week') {
    const mondayOffset = (anchor.getDay() + 6) % 7;
    const start = addDays(anchor, -mondayOffset);
    return { startDate: toDateString(start), endDate: toDateString(addDays(start, 6)) };
  }
  if (selection.mode === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
    return { startDate: toDateString(start), endDate: toDateString(end) };
  }
  if (datePattern.test(selection.customStart) && datePattern.test(selection.customEnd) && selection.customStart <= selection.customEnd) {
    return { startDate: selection.customStart, endDate: selection.customEnd };
  }
  const date = toDateString(anchor);
  return { startDate: date, endDate: date };
}

export function shiftPeriod(selection: PeriodSelection, direction: -1 | 1): PeriodSelection {
  const anchor = fromDateString(selection.anchor);
  if (selection.mode === 'day') anchor.setDate(anchor.getDate() + direction);
  if (selection.mode === 'week') anchor.setDate(anchor.getDate() + direction * 7);
  if (selection.mode === 'month') anchor.setMonth(anchor.getMonth() + direction);
  return { ...selection, anchor: toDateString(anchor) };
}

export function formatPeriodLabel(selection: PeriodSelection, locale: string): string {
  const range = resolvePeriodRange(selection);
  const start = fromDateString(range.startDate);
  const end = fromDateString(range.endDate);
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  if (range.startDate === range.endDate) return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(start);
  if (selection.mode === 'month') return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(start);
  return `${short.format(start)} – ${short.format(end)}`;
}

export function enumerateDays(range: DateRange): string[] {
  const days: string[] = [];
  let current = fromDateString(range.startDate);
  const end = fromDateString(range.endDate);
  while (current <= end && days.length < 370) {
    days.push(toDateString(current));
    current = addDays(current, 1);
  }
  return days;
}
