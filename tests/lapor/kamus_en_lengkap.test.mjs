// Bahasa Inggris harus lengkap: tiap teks layar /lapor (dikumpulkan tr_kumpul.mjs, termasuk kebijakan privasi di lapor.js) punya padanan di public/lapor/tr/en.json.
// Gagal berarti ada teks Indonesia baru: tambahkan ke en.json (atau jalankan scripts/lapor/tr_buat.mjs en).
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {kumpul} from "../../scripts/lapor/tr_kumpul.mjs";

test("en.json memuat semua teks layar Lapor", () => {
  const en = JSON.parse(fs.readFileSync(new URL("../../public/lapor/tr/en.json", import.meta.url), "utf8"));
  const hilang = [...kumpul().keys()].filter(k => !en[k]);
  assert.equal(hilang.length, 0, `${hilang.length} teks belum ada di en.json, mis.: ${hilang.slice(0, 5).map(k => JSON.stringify(k.slice(0, 60))).join(", ")}`);
});
