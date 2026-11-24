// scripts/agents/uji_ulang.mjs (21 Nov 2026): hanya crash runtime workerd yang boleh diulang; kegagalan asersi tidak pernah dianggap crash.
import {test} from "node:test";
import assert from "node:assert/strict";
import {kegagalan} from "../../scripts/agents/uji_ulang.mjs";

const blok = (n, err) => `not ok ${n} - uji ${n}\n  ---\n  error: '${err}'\n  ...\n`;
test("sidik crash dan rantainya dikenali; asersi tidak", () => {
  const k = kegagalan(blok(1, "fetch failed") + blok(2, "Attempted to use poisoned stub.") + blok(3, 'tidak dijalankan: "a" gagal lebih dulu') + "ok 4 - lulus\n");
  assert.deepEqual(k.map(x => x.infra), [true, true, true]);
  assert.deepEqual(kegagalan(blok(1, "fetch failed") + blok(2, "Expected values to be strictly equal")).map(x => x.infra), [true, false], "satu asersi = berkas tidak diulang");
  assert.deepEqual(kegagalan(blok(1, "x") + "  failureType: 'subtestsFailed'\n"), [], "induk yang gagal karena anaknya tidak dihitung");
});
