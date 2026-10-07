/** Local calendar dates deliberately use noon UTC, independent of DST and device timezone. */
export function agendaDateAfter(date: string, n: number) {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function agendaWeekStart(date: string) {
  const weekday = new Date(date + "T12:00Z").getUTCDay();
  return agendaDateAfter(date, -((weekday + 6) % 7));
}
