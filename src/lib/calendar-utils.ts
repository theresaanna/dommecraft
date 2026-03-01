import { RRule } from "rrule";

export type ExpandedEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  calendarId: string;
  isAllDay: boolean;
  sourceType: string;
  sourceTaskId: string | null;
  originalEventId: string;
};

type CalendarEventInput = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  isAllDay: boolean;
  color: string | null;
  recurrenceRule: string | null;
  sourceType: string;
  sourceTaskId: string | null;
};

export function formatForScheduleX(date: Date, isAllDay: boolean): string {
  if (isAllDay) {
    return date.toISOString().split("T")[0];
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function expandEvents(
  events: CalendarEventInput[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEvent[] {
  const expanded: ExpandedEvent[] = [];

  for (const event of events) {
    const calendarId = event.sourceType.toLowerCase();

    if (event.recurrenceRule) {
      const rule = RRule.fromString(event.recurrenceRule);
      const occurrences = rule.between(rangeStart, rangeEnd, true);
      const duration = event.endAt
        ? event.endAt.getTime() - event.startAt.getTime()
        : 60 * 60 * 1000;

      for (const occurrence of occurrences) {
        const endDate = new Date(occurrence.getTime() + duration);
        expanded.push({
          id: `${event.id}_${occurrence.toISOString()}`,
          title: event.title,
          description: event.description,
          start: formatForScheduleX(occurrence, event.isAllDay),
          end: formatForScheduleX(endDate, event.isAllDay),
          calendarId,
          isAllDay: event.isAllDay,
          sourceType: event.sourceType,
          sourceTaskId: event.sourceTaskId,
          originalEventId: event.id,
        });
      }
    } else {
      const endAt =
        event.endAt || new Date(event.startAt.getTime() + 60 * 60 * 1000);
      if (event.startAt <= rangeEnd && endAt >= rangeStart) {
        expanded.push({
          id: event.id,
          title: event.title,
          description: event.description,
          start: formatForScheduleX(event.startAt, event.isAllDay),
          end: formatForScheduleX(endAt, event.isAllDay),
          calendarId,
          isAllDay: event.isAllDay,
          sourceType: event.sourceType,
          sourceTaskId: event.sourceTaskId,
          originalEventId: event.id,
        });
      }
    }
  }

  return expanded;
}
