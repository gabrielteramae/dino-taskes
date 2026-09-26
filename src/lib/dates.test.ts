import assert from "node:assert/strict";
import test from "node:test";
import { calendarDay, formatRange, noonUtc, spanDays } from "./dates.ts";

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
