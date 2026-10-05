const MS_DAY = 86_400_000;

export function getYearProgress(date = new Date()) {
  const year = date.getFullYear();
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  const today = Date.UTC(year, date.getMonth(), date.getDate());
  const daysInYear = Math.round((next - start) / MS_DAY);
  const dayOfYear = Math.round((today - start) / MS_DAY) + 1;

  return {
    year,
    dayOfYear,
    daysInYear,
    progress: dayOfYear / daysInYear,
  };
}

export function monthMarkers(year: number, daysInYear: number) {
  return Array.from({ length: 12 }, (_, month) => {
    const start = Date.UTC(year, 0, 1);
    const monthStart = Date.UTC(year, month, 1);
    const day = Math.round((monthStart - start) / MS_DAY);
    return {
      month,
      left: (day / daysInYear) * 100,
    };
  });
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateFromDayOfYear(year: number, day: number) {
  return new Date(year, 0, day);
}

export function dayFromClick(ratio: number, daysInYear: number) {
  return Math.min(daysInYear, Math.max(1, Math.round(ratio * daysInYear)));
}

export function leftForDay(dayOfYear: number, daysInYear: number) {
  return (dayOfYear / daysInYear) * 100;
}

export function daysBetween(from: Date, to: Date) {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / MS_DAY);
}

export function previousYmd(value: string) {
  const date = parseYmd(value);
  date.setDate(date.getDate() - 1);
  return toYmd(date);
}
