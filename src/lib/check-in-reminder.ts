export function reminderDue(
  time: string,
  quietStart: string,
  quietEnd: string,
  timezone: string,
  now = new Date(),
) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const quiet =
    quietStart === quietEnd
      ? false
      : quietStart < quietEnd
        ? parts >= quietStart && parts < quietEnd
        : parts >= quietStart || parts < quietEnd;
  return parts >= time && !quiet;
}
