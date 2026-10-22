/* Uji replay banjir (scripts/banjir/replay.mjs): swa-uji tanpa jaringan + bentuk masukan kejadian. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {uji} from "../../scripts/banjir/replay.mjs";

test("swa-uji replay: PNG, MVT, gedung+jalan, hidrograf, biner, ERA5, ambilDEM lewat vm", async () => { await uji(); });

test("replay_kejadian.json: sumber tiap angka, jendela stasiun, laporan berkoordinat", () => {
  const k = JSON.parse(fs.readFileSync(new URL("../../scripts/banjir/replay_kejadian.json", import.meta.url), "utf8"));
  for (const s of k.stasiun) { assert.ok(s.url && s.mm > 0, `stasiun ${s.nama} tanpa url/mm`); assert.ok(Date.parse(s.akhir) > Date.parse(s.mulai), `jendela ${s.nama}`); }
  assert.ok(k.laporan.length >= 40 && k.laporan.every(l => Number.isFinite(l.lat) && Number.isFinite(l.lon) && l.url));
  for (const s of k.sungai) assert.ok((s.das.kalibrasi && s.das.kalibrasi.sumber) || (s.hulu_terukur && s.hulu_terukur.sumber) || (s.tma_terukur && s.tma_terukur.sumber), `DAS ${s.id} tanpa sumber kalibrasi/hulu`);
  assert.ok(k.pengali_maks > 0 && k.drainase_mm_jam.terbangun >= k.drainase_mm_jam.lainnya, "pengali maks dan drainase");
});
