import assert from "node:assert/strict";
import test from "node:test";
import { googleAgendaUrl, icsFor } from "./agenda.ts";
import { calendarDay, clockOf, formatRange, noonUtc, spanDays, withClock } from "./dates.ts";

test("o dia escolhido não recua por causa do fuso", () => {
  const stored = noonUtc("2026-10-02");
  assert.equal(calendarDay(stored), "2026-10-02");
  assert.equal(calendarDay("2026-10-02 00:00:00+00"), "2026-10-02");
});

test("o período lista cada dia, inclusive o último", () => {
  const days = spanDays(noonUtc("2026-10-02"), noonUtc("2026-10-04"));
  assert.deepEqual(days, ["2026-10-02", "2026-10-03", "2026-10-04"]);
});

test("um dia só não vira intervalo", () => {
  const label = formatRange(noonUtc("2026-10-02"), noonUtc("2026-10-02"));
  assert.match(label ?? "", /02/);
  assert.equal(label?.includes("–"), false);
});

test("a hora fica no mesmo dia e o dia inteiro não vira meio-dia", () => {
  assert.equal(clockOf(noonUtc("2026-10-02")), "");
  assert.equal(clockOf(withClock("2026-10-02", "14:30")), "14:30");
  assert.equal(calendarDay(withClock("2026-10-02", "14:30")), "2026-10-02");
});

test("o Google Agenda recebe o período, com o último dia incluído", () => {
  const url = googleAgendaUrl({
    id: "11111111-1111-1111-1111-111111111111",
    text: "estudar",
    dueAt: noonUtc("2026-10-02"),
    endsAt: noonUtc("2026-10-04"),
  });
  assert.match(url ?? "", /calendar\.google\.com/);
  assert.match(url ?? "", /20261002%2F20261005/);
  const ics = icsFor({
    id: "11111111-1111-1111-1111-111111111111",
    text: "estudar",
    dueAt: withClock("2026-10-02", "09:00"),
    endsAt: withClock("2026-10-02", "10:00"),
  });
  assert.match(ics ?? "", /DTSTART:20261002T090000/);
  assert.match(ics ?? "", /DTEND:20261002T100000/);
});
