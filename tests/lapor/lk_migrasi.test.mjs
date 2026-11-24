/* LK-03 (paket data/kajian-bnpb/lapor-kejadian/, RENCANA-UJI U4): migrasi 0170 lk_tarik dan lk_usulan. Skema dibangun dari semua migrasi repo di SQLite
   sungguhan (pola tests/lapor/lanjut_migrasi.test.mjs), 0170 diterapkan sekali lagi (idempoten), CHECK dan UNIQUE diuji dengan sisipan benar dan salah,
   lalu fungsi SQL di src/hak.js dijalankan lewat pembungkus D1 tipis di atas SQLite yang sama, termasuk penolakan matriks hak.
   Jalan: node --test tests/lapor/lk_migrasi.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import * as H from "../../src/hak.js";
import {terverifikasiBpbd} from "../../src/lapor_kejadian.js";

const DIR = new URL("../../migrations/", import.meta.url);
const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON");
for (const f of readdirSync(DIR).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
const k = Date.now();
/* pembungkus D1 secukupnya untuk fungsi hak.js: prepare().bind().run/all/first */
const env = {DB: {prepare: sql => ({bind: (...a) => {
  const s = db.prepare(sql);
  return {run: async () => ({meta: {changes: s.run(...a).changes}}), all: async () => ({results: s.all(...a)}), first: async () => s.get(...a) ?? null};
}})}};
const STAF = H.pelakuLpStaf, PUBLIK = H.pelakuLpPublik, HARI = H.pelakuLpHari, PELAPOR = H.pelakuLpPelapor;

uji("lk_tarik dan lk_usulan: 0170 idempoten, tanpa trigger, indeks ada", () => {
  db.exec(readFileSync(new URL("0170_lk_tarik_usulan.sql", DIR), "utf8"));
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('lk_tarik', 'lk_usulan') ORDER BY name").all().map(r => r.name);
  assert.deepEqual(t, ["lk_tarik", "lk_usulan"]);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type = 'trigger' AND tbl_name IN ('lk_tarik', 'lk_usulan')").get().n, 0);
  const ix = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'lk_%' ORDER BY name").all().map(r => r.name);
  for (const n of ["lk_tarik_kode", "lk_usulan_kejadian", "lk_usulan_waktu"]) assert.ok(ix.includes(n), n);
});

uji("lk_tarik: kode hanya GL- atau LA-, aktif 0 atau 1, alasan paling panjang 300", () => {
  const isi = (kode, aktif = 1, alasan = null, oleh = "Staf A") => db.prepare("INSERT INTO lk_tarik (kode, aktif, alasan, oleh, waktu) VALUES (?, ?, ?, ?, ?)").run(kode, aktif, alasan, oleh, k);
  isi("GL-231126-01"); isi("LA-231126-07", 0, "salah verifikasi");
  assert.throws(() => isi("KJ-231126-01"), "kode kejadian resmi atau K66 ditolak");
  assert.throws(() => isi("GL-2311-01"));
  assert.throws(() => isi("GL-231126-01", 2));
  assert.throws(() => isi("GL-231126-01", 1, "x".repeat(301)));
  assert.throws(() => isi("GL-231126-01", 1, null, ""));
  assert.throws(() => isi("GL-231126-01x"), "akhiran bukan angka");
  assert.throws(() => isi("LA-231126-07 "), "spasi di ujung");
  isi("GL-231126-100");   // lebih dari 99 gugus sehari tetap sah
});

uji("lk_usulan: kode LU-, satu usulan per kejadian laporan dan putaran, anggota larik 1 sampai 200, kab4 empat angka", () => {
  const isi = (kode, kej, anggota = '["LA-231126-01"]', kab4 = "3175", jenis = "banjir") =>
    db.prepare("INSERT INTO lk_usulan (kode, kejadian_laporan, anggota, jenis, kab4, oleh, waktu) VALUES (?, ?, ?, ?, ?, ?, ?)").run(kode, kej, anggota, jenis, kab4, "Staf A", k);
  isi("LU-231126-01", "GL-231126-01");
  assert.throws(() => isi("LU-231126-02", "GL-231126-01"), "kejadian laporan yang sama kedua kali (409 di rute)");
  assert.throws(() => isi("LU-231126-01", "GL-231126-02"), "kode usulan ganda");
  assert.throws(() => isi("KJ-231126-03", "GL-231126-03"));
  assert.throws(() => isi("LU-231126-04", "KJ-231126-04"));
  assert.throws(() => isi("LU-231126-05", "GL-231126-05", "[]"));
  assert.throws(() => isi("LU-231126-06", "GL-231126-06", "bukan json"));
  assert.throws(() => isi("LU-231126-07", "GL-231126-07", '{"a":1}'));
  assert.throws(() => isi("LU-231126-08", "GL-231126-08", JSON.stringify(Array.from({length: 201}, (_, i) => `LA-231126-${i}`))));
  assert.throws(() => isi("LU-231126-09", "GL-231126-09", undefined, "31.75"));
  assert.throws(() => isi("LU-231126-10", "GL-231126-10", undefined, "3175", ""));
  assert.throws(() => isi("LU-231126-11x", "GL-231126-11"));
  assert.throws(() => isi("LU-231126-12", "GL-231126-12 "));
  const ulang = (kode, putaran) => db.prepare("INSERT INTO lk_usulan (kode, kejadian_laporan, putaran, anggota, jenis, kab4, oleh, waktu) VALUES (?, 'GL-231126-01', ?, '[\"LA-231126-01\"]', 'banjir', '3175', 'Staf A', ?)").run(kode, putaran, k);
  ulang("LU-231126-13", 2);   // usulan ulang sesudah ditolak: putaran berikut
  assert.throws(() => ulang("LU-231126-14", 2), "putaran sama dua kali");
  assert.throws(() => ulang("LU-231126-15", 0));
});

uji("lk_tarik lewat hak.js: staf menulis, rute hari ini membaca, baris terakhir menentukan, cabut = baris baru", async () => {
  const kode = "GL-241126-01";
  await H.lpStmtTarik(env, STAF, kode, true, "bocor nama", "Staf B", k + 1).run();
  await H.lpStmtTarik(env, STAF, kode, false, null, "Staf B", k + 2).run();
  const r = await H.lpTarikKode(env, HARI, [kode]);
  assert.deepEqual(r.map(x => x.aktif), [1, 0]);
  const lap = {status: "terkirim", wilayah: {provKode: "31", kabKode: "31.75", kab: "Jakarta Timur"}};
  const cek = [{id: 1, hasil: "valid", waktu: k, akun: {jenis: "bpbd", tingkat: "prov", prov: "31"}}];
  assert.equal(terverifikasiBpbd(lap, cek, [], r), true, "tarikan dicabut: tayang lagi");
  await H.lpStmtTarik(env, STAF, kode, true, null, "Staf B", k + 3).run();
  assert.equal(terverifikasiBpbd(lap, cek, [], await H.lpTarikKode(env, HARI, [kode])), false, "tarikan terakhir aktif: turun");
  assert.deepEqual(await H.lpTarikKode(env, HARI, []), []);
  await assert.rejects(H.lpTarikKode(env, PUBLIK, [kode]), /tidak berhak baca lk_tarik/, "pelaku publik umum tidak membaca tarikan");
});

uji("lk_usulan lewat hak.js: staf menulis dan membaca, usulan kedua gagal UNIQUE", async () => {
  const u = {kode: "LU-241126-01", kejadian_laporan: "GL-241126-01", anggota: ["LA-241126-01", "LA-241126-02"], jenis: "banjir", kab4: "3175", oleh: "Staf A", waktu: k};
  await H.lpStmtUsulan(env, STAF, u).run();
  await assert.rejects(H.lpStmtUsulan(env, STAF, {...u, kode: "LU-241126-02"}).run(), /UNIQUE/);
  const [r] = await H.lpUsulanKejadian(env, STAF, ["GL-241126-01", "GL-999999-01"]);
  assert.equal(r.kode, "LU-241126-01"); assert.equal(r.putaran, 1);
  assert.deepEqual(JSON.parse(r.anggota), u.anggota);
});

uji("lk_*: matriks hak menolak ubah, hapus, dan pelaku yang tidak berhak (append-only)", () => {
  for (const t of ["lk_tarik", "lk_usulan"]) for (const a of ["ubah", "hapus"]) for (const p of [STAF, PUBLIK, HARI, PELAPOR, H.pelakuLpMesin, H.pelakuSistem, H.pelakuAdmin])
    assert.equal(H.boleh(p, t, a), false, `${p.peran} ${a} ${t}`);
  assert.equal(H.boleh(PUBLIK, "lk_tarik", "tambah"), false);
  assert.equal(H.boleh(PUBLIK, "lk_usulan", "baca"), false, "usulan tidak dibaca publik");
  assert.equal(H.boleh(PELAPOR, "lk_tarik", "baca"), false);
  assert.throws(() => H.lpStmtTarik(env, PUBLIK, "GL-241126-01", true, null, "x", k), /tidak berhak tambah lk_tarik/);
  assert.throws(() => H.lpStmtUsulan(env, PELAPOR, {}), /tidak berhak tambah lk_usulan/);
});

uji("lp_hari hanya membaca tabel halaman hari ini; pelaku publik umum tidak membaca pengecekan (tinjauan keamanan LK-05)", async () => {
  for (const t of ["lapor_periksa", "lk_periksa_akun", "lk_tarik", "lapor_versi"]) assert.equal(H.boleh(HARI, t, "baca"), true, t);
  for (const t of ["lapor_periksa", "lk_periksa_akun", "lk_tarik", "lapor_versi"]) for (const a of ["tambah", "ubah", "hapus"]) assert.equal(H.boleh(HARI, t, a), false, `${a} ${t}`);
  for (const t of ["lapor_periksa", "lk_periksa_akun", "lk_tarik", "lk_usulan"]) assert.equal(H.boleh(PUBLIK, t, "baca"), false, t);
  for (const t of ["lapor_tiket_riwayat", "lapor_pelapor", "lapor_balasan", "lapor_pesan", "lk_usulan"]) assert.equal(H.boleh(HARI, t, "baca"), false, t);
  await assert.rejects(H.lpPeriksaDaftar(env, PUBLIK, "LA-231126-01"), /tidak berhak baca lapor_periksa/, "catatan dan oleh pengecekan tidak terbaca lewat pelaku publik");
});
