/* OH-04 bendera OH_TULIS: sebelum migrasi 0188 diterapkan di produksi, kiriman cari orang tetap 200 dan lapor_cari tersimpan; tidak ada baris oh_*.
   Juga rute saya/* dan cron aman tanpa tabel oh_*. Jalankan: node --test tests/lapor/hilang_tulis.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {siapkan} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";
import {bersihOrangHilang} from "../../src/orang_hilang.js";

const MESIN_H = {authorization: "Bearer mesin-rahasia"}, WA = "6281200000091";
async function kirimCari(U, nama) {
  const kirimP = b => U.api("POST", "/api/lapor/pesan", {wa: WA, ...b}, MESIN_H);
  assert.equal((await U.api("POST", "/api/lapor/izin", {wa: WA}, MESIN_H)).s, 200);
  let r;
  for (const t of ["orang hilang", "1", "1", "Rina Wati"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); }
  r = await kirimP({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12}}); assert.equal(r.s, 200, r.t.slice(0, 200));
  if (/Benar/.test(r.t)) r = await kirimP({teks: "1"});
  await U.DB.prepare("DELETE FROM laju_bnpb").run();
  for (const t of [nama, "Jojo", "4", "Tidak tahu", "Tidak tahu", "Tidak tahu", "Tidak tahu", "Kaus merah", "tidak ada", "Lewati", "1", "1", "Pakai nomor saya", "Posko SDN 1 Paledang, Jl. Paledang"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); }
  assert.match(r.t, /Hilang karena kejadian apa/);
  for (const t of ["1", "1"]) r = await kirimP({teks: t});   // belum terdaftar, setuju
  r = await kirimP({teks: "1"}); assert.equal(r.s, 200, r.t.slice(0, 300)); assert.match(r.t, /Laporan orang dicari diterima/);
}
test("OH_TULIS mati dan tabel oh_* tidak ada: kiriman cari orang tetap tersimpan; saya/* dan cron tidak galat", async () => {
  const U = await siapkan("uji-oh-tulis", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}});
  for (const t of ["oh_riwayat", "oh_info", "oh_cari_foto", "oh_temu_foto", "oh_temu", "oh_publik"]) await U.DB.prepare(`DROP TABLE ${t}`).run();   // D1 produksi sebelum 0188
  await kirimCari(U, "Joko");
  assert.equal(await U.n("lapor_cari", "nama_dicari = 'Joko'"), 1, "laporan tersimpan");
  const env = {DB: U.DB, MEDIA: await U.mf.getR2Bucket("MEDIA")};
  assert.deepEqual(await bersihOrangHilang(env, Date.now()), {turun: 0}, "cron melewati tabel yang belum ada");
  await bersihkanLapor(env, Date.now());
  const g = await U.api("GET", `/api/lapor/hilang/saya?wa=${WA}`, undefined, MESIN_H); assert.equal(g.s, 200, g.t); assert.deepEqual(g.j.profil, []);
  assert.equal((await U.api("POST", "/api/lapor/hilang/saya/cabut", {id: "1".repeat(16), wa: WA}, MESIN_H)).s, 404);
});
test("OH_TULIS mati dengan tabel ada: laporan tersimpan, tidak ada baris oh_publik; OH_TULIS=1 menulisnya", async () => {
  const A = await siapkan("uji-oh-tulis-mati", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}});
  await kirimCari(A, "Joko"); assert.equal(await A.n("lapor_cari", "nama_dicari = 'Joko'"), 1); assert.equal(await A.n("oh_publik"), 0); assert.equal(await A.n("oh_riwayat"), 0);
  const B = await siapkan("uji-oh-tulis-hidup", {r2: true, ikat: {WA_MESIN: "mesin-rahasia", OH_TULIS: "1"}});
  await kirimCari(B, "Joko"); assert.equal(await B.n("oh_publik", "status = 'menunggu'"), 1);
});
