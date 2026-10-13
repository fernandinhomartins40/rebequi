export function fulfillmentScheduleEvent(previous: Date | null, next: string | null) {
  if (!previous) return 'DETAILS_CONFIRMED';
  if (!next) return 'SCHEDULE_CLEARED';
  return previous.getTime() === new Date(next).getTime() ? 'DETAILS_CONFIRMED' : 'RESCHEDULED';
}
