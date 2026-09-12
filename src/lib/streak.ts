export function weekProgress(dates: Date[], now = new Date()) {
  // A week is Monday–Sunday in UTC, consistently across browser and server.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monday = new Date(today); monday.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  const days = new Set(dates.filter(d => d >= monday && d <= today).map(d => d.toISOString().slice(0, 10)));
  const count = days.size;
  return { count, mascot: count >= 5 ? '🔥' : count >= 3 ? '😃' : count >= 1 ? '🙂' : '😴', days: Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday); day.setUTCDate(day.getUTCDate() + i); return days.has(day.toISOString().slice(0, 10));
  }) };
}
