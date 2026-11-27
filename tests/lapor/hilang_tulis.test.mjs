/* OH-04 bendera OH_TULIS: sebelum migrasi 0188 diterapkan di produksi, kiriman cari orang tetap 200 dan lapor_cari tersimpan; tidak ada baris oh_*.
   Juga rute saya/* dan cron aman tanpa tabel oh_*. Jalankan: node --test tests/lapor/hilang_tulis.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {siapkan} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";
import {bersihOrangHilang} from "../../src/orang_hilang.js";

const MESIN_H = {authorization: "Bearer mesin-rahasia"}, WA = "6281200000091";
async function kirimCari(U, nama, akhir = ["1", "1", "1", "1"], awal = null) {
  const kirimP = b => U.api("POST", "/api/lapor/pesan", {wa: WA, ...b}, MESIN_H);
  assert.equal((await U.api("POST", "/api/lapor/izin", {wa: WA}, MESIN_H)).s, 200);
  let r;
  if (awal) { r = await kirimP({teks: awal}); await new Promise(f => setTimeout(f, 20)); }   // pesan laporan biasa sebelum masuk mode cari
  for (const t of ["orang hilang", "1", "1", "Rina Wati"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); }
  r = await kirimP({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12}}); assert.equal(r.s, 200, r.t.slice(0, 200));
  if (/Benar/.test(r.t)) r = await kirimP({teks: "1"});
  await U.DB.prepare("DELETE FROM laju_bnpb").run();
  for (const t of [nama, "Jojo", "4", "Tidak tahu", "Tidak tahu", "Tidak tahu", "Tidak tahu", "Kaus merah", "tidak ada", "Lewati", "1", "1", "Pakai nomor saya", "Posko SDN 1 Paledang, Jl. Paledang"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 200)); }
  assert.match(r.t, /Hilang karena kejadian apa/);
  for (const t of akhir.slice(0, -1)) r = await kirimP({teks: t});   // belum terdaftar, setuju
  r = await kirimP({teks: akhir.at(-1)}); assert.equal(r.s, 200, r.t.slice(0, 300));
  if (akhir.length === 4) assert.match(r.t, /Laporan orang dicari diterima/);
  return r;
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

test("saran 4: bukan bencana atau tidak setuju: tidak ada lapor_cari, pesan arsip disamarkan, rincian sesi kosong", async () => {
  for (const [akhir, nama] of [[["2"], "Joko"], [["1", "2"], "Budi"]]) {
    const U = await siapkan("uji-oh-batal-" + nama, {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}});
    const r = await kirimCari(U, nama, akhir); assert.match(r.t, /112/);
    assert.equal(await U.n("lapor_cari"), 0, "tidak disimpan");
    const pesan = (await U.DB.prepare("SELECT teks FROM lapor_pesan").all()).results.map(x => x.teks).filter(Boolean);
    assert.ok(pesan.length > 0 && pesan.every(t => t.startsWith("[dihapus")), "semua teks arsip disamarkan: " + pesan.slice(0, 2));
    const kerja = (await U.DB.prepare("SELECT kerja, status FROM lapor_sesi").first()); assert.equal(kerja.status, "batal"); assert.ok(!kerja.kerja.includes(nama) && !kerja.kerja.includes("Kaus"), "rincian tidak tertinggal");
  }
});

test("saran 5: pesan sebelum masuk mode cari tidak ikut disamarkan saat ditutup tanpa simpan", async () => {
  const U = await siapkan("uji-oh-batas-pesan", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}});
  await kirimCari(U, "Joko", ["2"], "halo, ada banjir di desa saya");
  const pesan = (await U.DB.prepare("SELECT teks FROM lapor_pesan ORDER BY waktu, id").all()).results.map(x => x.teks);
  assert.ok(pesan.some(t => /banjir di desa saya/.test(t ?? "")), "pesan laporan biasa tetap utuh: " + JSON.stringify(pesan.slice(0, 3)));
  assert.ok(pesan.filter(t => /^\[dihapus/.test(t ?? "")).length >= 3, "pesan mode cari disamarkan");
  assert.ok(!pesan.some(t => /Joko|Kaus/.test(t ?? "")));
});
