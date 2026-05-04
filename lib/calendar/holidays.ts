import type { CalendarItem } from "@/components/calendar/types";
import { CALENDAR_GROUP_IDS, toDateKey } from "@/lib/calendar/shared";

type HolidayRecord = {
  date: string;
  name: string;
};

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "신정" },
  { month: 3, day: 1, name: "삼일절" },
  { month: 5, day: 1, name: "노동절" },
  { month: 5, day: 5, name: "어린이날" },
  { month: 6, day: 6, name: "현충일" },
  { month: 8, day: 15, name: "광복절" },
  { month: 10, day: 3, name: "개천절" },
  { month: 10, day: 9, name: "한글날" },
  { month: 12, day: 25, name: "성탄절" },
] as const;

const SPECIAL_HOLIDAYS_BY_YEAR: Record<number, HolidayRecord[]> = {
  2026: [
    { date: "2026-02-16", name: "설날 연휴" },
    { date: "2026-02-17", name: "설날" },
    { date: "2026-02-18", name: "설날 연휴" },
    { date: "2026-05-24", name: "부처님오신날" },
    { date: "2026-09-24", name: "추석 연휴" },
    { date: "2026-09-25", name: "추석" },
    { date: "2026-09-26", name: "추석 연휴" },
  ],
};

function buildHolidayItem(record: HolidayRecord): CalendarItem {
  return {
    id: `holiday-${record.date}`,
    title: record.name,
    startDate: record.date,
    endDate: record.date,
    allDay: true,
    color: "#dcfce7",
    textColor: "#2A8C50",
    groupId: CALENDAR_GROUP_IDS.holiday,
    groupType: "company",
    source: "holiday",
    readOnly: true,
  };
}

export function getHolidayItemsInRange(start: Date, end: Date) {
  const results = new Map<string, CalendarItem>();
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= last) {
    const dateKey = toDateKey(current);
    const fixedHoliday = FIXED_HOLIDAYS.find(
      (holiday) =>
        holiday.month === current.getMonth() + 1 && holiday.day === current.getDate()
    );

    if (fixedHoliday) {
      results.set(dateKey, buildHolidayItem({ date: dateKey, name: fixedHoliday.name }));
    }

    const specialHoliday = SPECIAL_HOLIDAYS_BY_YEAR[current.getFullYear()]?.find(
      (holiday) => holiday.date === dateKey
    );

    if (specialHoliday) {
      results.set(dateKey, buildHolidayItem(specialHoliday));
    }

    current.setDate(current.getDate() + 1);
  }

  return Array.from(results.values());
}
