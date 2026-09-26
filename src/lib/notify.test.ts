import assert from "node:assert/strict";
import test from "node:test";
import { noonUtc } from "./dates.ts";
import { tasksForFilters } from "./notify.ts";

const today = "2026-09-26";

test("o filtro de hoje não inclui atraso nem o que ainda não começou", () => {
  const tasks = [
    { id: "1", text: "hoje", done: false, dueAt: noonUtc("2026-09-26"), endsAt: noonUtc("2026-09-26") },
    { id: "2", text: "atrasada", done: false, dueAt: noonUtc("2026-09-20"), endsAt: noonUtc("2026-09-21") },
    { id: "3", text: "depois", done: false, dueAt: noonUtc("2026-10-02"), endsAt: noonUtc("2026-10-02") },
  ];
  const names = tasksForFilters(tasks, { today: true, late: false }, today).map((task) => task.text);
  assert.deepEqual(names, ["hoje"]);
});

test("o filtro de atraso fica separado do de hoje", () => {
  const tasks = [
    { id: "1", text: "hoje", done: false, dueAt: noonUtc("2026-09-26"), endsAt: noonUtc("2026-09-28") },
    { id: "2", text: "atrasada", done: false, dueAt: noonUtc("2026-09-01"), endsAt: noonUtc("2026-09-02") },
  ];
  const names = tasksForFilters(tasks, { today: false, late: true }, today).map((task) => task.text);
  assert.deepEqual(names, ["atrasada"]);
});

test("filtro desligado não devolve tarefa", () => {
  const tasks = [{ id: "1", text: "hoje", done: false, dueAt: noonUtc(today), endsAt: noonUtc(today) }];
  assert.equal(tasksForFilters(tasks, { today: false, late: false }, today).length, 0);
});
