import { test } from "node:test";
import assert from "node:assert/strict";
import { agendaDateAfter, agendaWeekStart } from "../src/lib/meal-calendar";
test("Monday weeks cross year boundaries without changing local dates", () => {
  assert.equal(agendaWeekStart("2026-01-01"), "2025-12-29");
  assert.equal(agendaWeekStart("2026-10-11"), "2026-10-05");
  assert.equal(agendaWeekStart("2026-10-05"), "2026-10-05");
});
test("Leap days and daylight-saving Sundays are selectable", () => {
  assert.equal(agendaDateAfter("2028-02-28", 1), "2028-02-29");
  assert.equal(agendaDateAfter("2028-02-29", 1), "2028-03-01");
  assert.equal(agendaDateAfter("2026-03-28", 1), "2026-03-29");
  assert.equal(agendaDateAfter("2026-10-24", 1), "2026-10-25");
});
test("Moving weeks preserves the selected weekday", () => {
  assert.equal(agendaDateAfter("2026-10-09", 7), "2026-10-16");
  assert.equal(agendaDateAfter("2026-10-09", -7), "2026-10-02");
});
