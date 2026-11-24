// PB-42 (cuaca b): kriteria RENCANA-UJI paritas-bencana baris PB-42: tingkat dari CAP severity (Moderate = 2, Severe dan Extreme = 3);
// POD hujan 50 mm belum lolos berarti pil hipotesis pada skor. Ditambah: tangga cuaca menyala di registri hanya bila kamusnya bersumber.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {BENCANA, tindakanUntuk} from "../../public/ews_tindakan.js";

const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const REG = JSON.parse(baca("public/bencana.json")).bencana.find(b => b.id === "cuaca");

test("email: tingkat cuaca ikut TINGKAT_CAP (KI-02), Moderate = 1, Severe = 2, Extreme = 3, lainnya 1", () => {
  assert.match(baca("src/ews.js"), /const CUACA_TINGKAT = \{Moderate: 1, Severe: 2, Extreme: 3\};/);
  assert.match(baca("src/ews.js"), /CUACA_TINGKAT\[p\.severity\] \|\| 1/);
});

test("peringatan terpadu: hanya Severe dan Extreme BMKG yang masuk, sebagai Siaga dan Awas (tingkat resmi tidak dinaikkan)", () => {
  assert.match(baca("src/peringatan.js"), /const TINGKAT_CAP = \{Severe: "Siaga", Extreme: "Awas"\};/);
  for (const t of [1, 2, 3]) assert.ok(tindakanUntuk("cuaca", t).length, `tingkat ${t}`);
});

test("skor renlap cuaca berlabel hipotesis selama uji balik hujan 50 mm belum lolos", () => {
  const r = baca("scripts/umum/renlap.py");
  assert.match(r, /uji balik hujan 50 mm belum lolos/);
  assert.match(r, /tingkat %d dari 3 \(model, hipotesis\), hujan %s/);
});

test("registri: tangga cuaca menyala hanya bila tiap butir punya rujukan; papan SK dan ringkas cuaca tetap menyala", () => {
  const c = BENCANA.cuaca, bersumber = Object.entries(c.tindakan).every(([t, d]) => c.rujukan?.[t]?.length === d.length);
  assert.equal(REG.kemampuan.ews.tangga, bersumber);
  if (bersumber) assert.deepEqual(REG.kemampuan.ews.kunci, ["cuaca"]);
  assert.equal(REG.kemampuan.dasbor.papan_sk, true); assert.equal(REG.kemampuan.dasbor.ringkas, "cuaca");
  for (const r of Object.values(c.rujukan ?? {}).flat()) assert.match(r, /^BNPB, Buku Saku Tanggap Tangkas Tangguh \(2012\), hlm\. \d+$/);
});
