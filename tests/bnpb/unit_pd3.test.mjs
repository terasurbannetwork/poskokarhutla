/* RU-051 PD-3: pesanStandar enam baris Pasal 20 ayat 2; konteks kosong memberi "belum ada data"; tanpa titik tengah; tanpa fungsi kirim. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BENCANA, pesanStandar} from "../../public/ews_tindakan.js";
import * as modul from "../../public/ews_tindakan.js";

const ctx = {turunan: "banjir bandang", kelas_bahaya: "tinggi", jiwa_terpapar: 12345, sumber_daya: "stok 3 gudang, 2 desa terisolir"};
const baris = t => t.split("\n");

test("semua jenis x tingkat memberi 6 baris tak kosong", () => {
  for (const jenis of Object.keys(BENCANA)) for (const tingkat of [1, 2, 3, "Waspada", "Siaga", "Awas"]) {
    const t = pesanStandar({jenis, tingkat, kab: "Kab X", dibuat: "2026-11-26T00:00:00Z", berlaku_hingga: "2026-11-27T00:00:00Z"}, ctx);
    assert.equal(baris(t).length, 6);
    for (const b of baris(t)) assert.ok(b.split(": ")[1]?.trim(), b);
    assert.doesNotMatch(t, /belum ada data/);
  }
});

test("konteks kosong memberi belum ada data di baris 3, 4, 6", () => {
  const t = baris(pesanStandar({jenis: "banjir", tingkat: 2, dibuat: "2026-11-26T00:00:00Z", berlaku_hingga: "2026-11-27T00:00:00Z"}, {}));
  for (const i of [2, 3, 5]) assert.match(t[i], /belum ada data$/);
  assert.equal(t.length, 6);
});

test("masukan kosong tidak melempar, tetap 6 baris", () => {
  assert.equal(baris(pesanStandar()).length, 6);
  assert.equal(baris(pesanStandar(null, null)).length, 6);
});

test("jiwa terpapar nol tertulis 0, bukan belum ada data", () => {
  assert.match(baris(pesanStandar({jenis: "banjir", tingkat: 1}, {jiwa_terpapar: 0}))[3], /0 jiwa/);
});

test("tanpa titik tengah, tanpa kata aman, tanpa fungsi kirim", () => {
  const t = pesanStandar({jenis: "gempa", tingkat: 3, kab: "Kab Y", dibuat: "2026-11-26T00:00:00Z", berlaku_hingga: "2026-11-27T00:00:00Z"}, ctx);
  assert.ok(!t.includes("·"));
  assert.doesNotMatch(t, /\baman\b/i);
  assert.ok(!Object.keys(modul).some(k => /kirim|send|fetch/i.test(k)));
  assert.doesNotMatch(readFileSync(new URL("../../public/ews_tindakan.js", import.meta.url), "utf8"), /fetch\(|XMLHttpRequest/);
});
