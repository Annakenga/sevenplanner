import assert from "node:assert/strict";
import test from "node:test";

import { dateKeysForWeek, migrateLegacyWeeks } from "../app/taskCalendar.ts";

test("the same calendar week changes from next to current after Monday starts", () => {
  const sunday = new Date(2026, 7, 2, 12);
  const monday = new Date(2026, 7, 3, 12);

  assert.deepEqual(dateKeysForWeek(sunday, 1), dateKeysForWeek(monday, 0));
  assert.equal(dateKeysForWeek(monday, 0)[0], "2026-08-03");
});

test("storage upgrade preserves the dates visible in the legacy tabs", () => {
  const task = { id: 1, title: "Задача на 10 августа" };
  const emptyWeek = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  const legacyWeeks = {
    current: { ...emptyWeek },
    next: { ...emptyWeek, mon: [task] },
  };

  const migrated = migrateLegacyWeeks(JSON.stringify(legacyWeeks), new Date(2026, 7, 3, 12));

  assert.deepEqual(migrated?.["2026-08-10"], [task]);
  assert.equal(migrated?.["2026-08-03"], undefined);
});
