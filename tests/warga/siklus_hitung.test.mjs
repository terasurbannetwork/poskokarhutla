/* Siklus Bencana F1: fungsi murni src/siklus_hitung.js. UJ-F1-04 (bagian JS), UJ-F1-08 (resolusi alias), UJ-F1-09 (selisih), F1.8 (basi).
   Vektor ID dibaca dari tests/siklus/fixtures/acuan.json (dihitung hashlib); tidak disunting di sini. Jalankan: node --test tests/warga/siklus_hitung.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {idKejadian, idBebas, kunciPendiri, selisihAntarsumber, selisihDampak, resolusiAlias, basi, faseSah, angkaPublik, RE_KJ, FASE} from "../../src/siklus_hitung.js";

const ACUAN = JSON.parse(readFileSync(path.join(AKAR, "tests/siklus/fixtures/acuan.json"), "utf8"));

uji("UJ-F1-04: idKejadian sama persis dengan vektor acuan.json (hashlib), panjang 16, format KJ-", async () => {
  assert.ok(ACUAN.id_kejadian.length >= 4);
  for (const v of ACUAN.id_kejadian) {
    const [kunci, n] = v.masukan.split("|").length === 4 ? [v.masukan.split("|").slice(0, 3).join("|"), Number(v.masukan.split("|")[3])] : [v.masukan, 1];
    const id = await idKejadian(kunci, n);
    assert.equal(id, v.id, v.masukan);
    assert.equal(id.length, 16);
    assert.match(id, RE_KJ);
    assert.equal(id.slice(3, 7), String(v.tahun));
  }
});

uji("UJ-F1-04: kunci pendiri urut jenis tak bergantung urutan masuk (INV-9) dan kab terkecil", async () => {
  assert.equal(kunciPendiri(["longsor", "banjir"], "3201", "2026-03-02"), "banjir+longsor|3201|2026-03-02");
  assert.equal(kunciPendiri(["banjir", "longsor"], ["3202", "3201"], "2026-03-02"), "banjir+longsor|3201|2026-03-02");
  assert.equal(await idKejadian(kunciPendiri(["longsor", "banjir"], "3201", "2026-03-02")), "KJ-2026-MT5Z0ZVT");
  assert.equal(await idKejadian(kunciPendiri("banjir", "3201", "2026-03-02")), "KJ-2026-9A2WGN3G");
});

uji("idKejadian menolak kunci rusak dan n tak sah; idBebas menghash ulang saat tabrakan", async () => {
  await assert.rejects(() => idKejadian("banjir|3201"));
  await assert.rejects(() => idKejadian("banjir|3201|2026-3-2"));
  await assert.rejects(() => idKejadian("banjir|3201|2026-03-02", 0));
  const terpakai = new Set(["KJ-2026-9A2WGN3G"]);
  assert.equal(await idBebas("banjir|3201|2026-03-02", async id => terpakai.has(id)), "KJ-2026-8N57ZZ0Y");
  terpakai.add("KJ-2026-8N57ZZ0Y");
  assert.equal(await idBebas("banjir|3201|2026-03-02", async id => terpakai.has(id)), await idKejadian("banjir|3201|2026-03-02", 3));
  await assert.rejects(() => idBebas("banjir|3201|2026-03-02", async () => true), /50 percobaan/);
});

uji("UJ-F1-09: selisih antarsumber cocok dengan acuan.json; null bukan nol; tanpa total", () => {
  for (const k of ACUAN.selisih) {
    const r = selisihAntarsumber(k.nilai);
    assert.equal(r.n, k.n); assert.equal(r.selisih, k.selisih); assert.deepEqual(r.arah, k.arah); assert.equal(r.persen, k.persen);
    assert.ok(!("total" in r) && !("rata" in r));
  }
  assert.deepEqual(selisihAntarsumber({dibi: 0, logbook: 5}), {n: 2, selisih: 5, arah: {maks: "logbook", min: "dibi"}, persen: 100}, "nol yang dilaporkan adalah angka");
  assert.equal(selisihAntarsumber({dibi: 0, logbook: 0}).persen, null, "persen hanya bila maks > 0");
  assert.equal(selisihAntarsumber(undefined).n, 0);
  assert.equal(selisihAntarsumber({a: NaN, b: "3"}).n, 0);
});

uji("selisihDampak: metrik yang dilaporkan sumber mana pun, per sumber berdampingan", () => {
  const r = selisihDampak({dibi: {meninggal: {n: 12}, luka: {n: 4}}, logbook: {meninggal: {n: 15}}, sistem: {}});
  assert.deepEqual(r.map(x => x.metrik), ["luka", "meninggal"]);
  assert.equal(r.find(x => x.metrik === "meninggal").selisih, 3);
  assert.equal(r.find(x => x.metrik === "luka").selisih, null, "satu sumber saja: tanpa selisih");
  assert.deepEqual(selisihDampak(null), []);
});

uji("UJ-F1-08: resolusi alias B->A->C, batas 32 langkah gagal keras, putaran dan rantai putus gagal", async () => {
  const peta = {B: {fase: "digabung", ke: "A"}, A: {fase: "digabung", ke: "C"}, C: {fase: "tanggap", ke: null}, X: {fase: "tanggap"}};
  assert.equal(await resolusiAlias("B", async id => peta[id] ?? null), "C");
  assert.equal(await resolusiAlias("C", async id => peta[id] ?? null), "C");
  const rantai = {}; for (let i = 0; i < 40; i++) rantai["n" + i] = {fase: "digabung", ke: "n" + (i + 1)}; rantai.n40 = {fase: "selesai"};
  await assert.rejects(() => resolusiAlias("n0", async id => rantai[id] ?? null), /lebih dari 32/);
  assert.equal(await resolusiAlias("n9", async id => rantai[id] ?? null), "n40", "31 langkah masih lolos");
  await assert.rejects(() => resolusiAlias("P", async id => ({P: {fase: "digabung", ke: "Q"}, Q: {fase: "digabung", ke: "P"}})[id] ?? null), /berputar/);
  await assert.rejects(() => resolusiAlias("Z", async () => null), /putus/);
  await assert.rejects(() => resolusiAlias("Y", async () => ({fase: "digabung", ke: null})), /tanpa ke/);
});

uji("F1.8: basi hanya tampilan, ambang BASI_HARI = 3 (acuan.json)", () => {
  assert.equal(ACUAN.konstanta.BASI_HARI, 3);
  assert.equal(basi("2026-03-02", "2026-03-06"), true, "4 > 3");
  assert.equal(basi("2026-03-02", "2026-03-05"), false, "3 tidak lebih dari 3");
});

uji("faseSah mencerminkan trigger sk_kejadian_fase; angkaPublik k-anonim", () => {
  assert.equal(faseSah("terdeteksi", "terverifikasi"), true);
  assert.equal(faseSah("terdeteksi", "dibatalkan"), true);
  assert.equal(faseSah("tanggap", "dibatalkan"), false);
  assert.equal(faseSah("terdeteksi", "pemulihan"), false);
  assert.equal(faseSah("selesai", "pemulihan"), true);
  assert.equal(faseSah("dibatalkan", "terdeteksi"), false);
  assert.equal(faseSah("digabung", "terdeteksi"), false);
  for (const f of FASE) assert.equal(faseSah(f, "digabung"), true);
  assert.equal(angkaPublik(4), "di bawah 5"); assert.equal(angkaPublik(5), 5); assert.equal(angkaPublik(0), "di bawah 5"); assert.equal(angkaPublik(null), null);
});
