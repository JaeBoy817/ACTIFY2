import { format } from "date-fns";

export type ResidentBirthdaySource = {
  residentId: string;
  residentName: string;
  birthDate: string;
};

export type ResidentBirthdayEvent = {
  residentId: string;
  residentName: string;
  birthMonth: number;
  birthDay: number;
  dateForDisplay: string;
  type: "birthday";
};

function toIsoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseBirthMonthDay(birthDate: string) {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate()
  };
}

export function getResidentBirthdaysForDate(input: {
  residents: ResidentBirthdaySource[];
  date: Date;
}) {
  const year = input.date.getFullYear();
  const month = input.date.getMonth() + 1;
  const day = input.date.getDate();

  const matches: ResidentBirthdayEvent[] = [];
  for (const resident of input.residents) {
    const monthDay = parseBirthMonthDay(resident.birthDate);
    if (!monthDay) continue;
    if (monthDay.month !== month || monthDay.day !== day) continue;

    matches.push({
      residentId: resident.residentId,
      residentName: resident.residentName,
      birthMonth: monthDay.month,
      birthDay: monthDay.day,
      dateForDisplay: toIsoDate(year, month, day),
      type: "birthday"
    });
  }

  return matches.sort((a, b) => a.residentName.localeCompare(b.residentName));
}

export function getResidentBirthdaysForMonth(input: {
  residents: ResidentBirthdaySource[];
  year: number;
  month: number;
}) {
  const monthStart = new Date(input.year, input.month - 1, 1);
  const nextMonthStart = new Date(input.year, input.month, 1);
  const daysInMonth = Math.max(1, Math.round((nextMonthStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

  const events: ResidentBirthdayEvent[] = [];
  for (let index = 0; index < daysInMonth; index += 1) {
    const date = new Date(input.year, input.month - 1, index + 1);
    events.push(...getResidentBirthdaysForDate({ residents: input.residents, date }));
  }
  return events;
}

export function buildResidentBirthdayLookup(input: {
  residents: ResidentBirthdaySource[];
  years: number[];
}) {
  const lookup = new Map<string, ResidentBirthdayEvent[]>();
  const uniqueYears = Array.from(new Set(input.years)).sort((a, b) => a - b);

  for (const year of uniqueYears) {
    for (let month = 1; month <= 12; month += 1) {
      const events = getResidentBirthdaysForMonth({
        residents: input.residents,
        year,
        month
      });

      for (const event of events) {
        const current = lookup.get(event.dateForDisplay);
        if (current) {
          current.push(event);
        } else {
          lookup.set(event.dateForDisplay, [event]);
        }
      }
    }
  }

  lookup.forEach((items, key) => {
    lookup.set(
      key,
      [...items].sort((a, b) => {
        if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth;
        if (a.birthDay !== b.birthDay) return a.birthDay - b.birthDay;
        return a.residentName.localeCompare(b.residentName);
      })
    );
  });

  return lookup;
}

export function getBirthdayBadgeForDate(dateISO: string, lookup: Map<string, ResidentBirthdayEvent[]>) {
  const entries = lookup.get(dateISO) ?? [];
  return entries.map((entry) => ({
    ...entry,
    label: `${entry.residentName} Birthday`,
    shortLabel: `Birthday: ${entry.residentName}`,
    key: `birthday-${entry.residentId}-${dateISO}`,
    dateLabel: format(new Date(`${dateISO}T00:00:00`), "MMMM d")
  }));
}
