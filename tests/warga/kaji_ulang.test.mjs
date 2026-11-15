/* Kaji ulang KU-01/KU-02 (data/kajian-bnpb/kaji-ulang/RENCANA-UJI.md T8, T9, T12, T15) di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/kaji_ulang.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {siapkan} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import {Galat, pelakuKuTulis, pelakuKuBaca, pelakuSistem, kuBaca, kuPotret, kuMulai, kuTambahPelajaran, kuUbahPelajaran, kuTambahRekomendasi, kuUbahStatus, kuRiwayat, kuDaftarRekomendasi, kuRentang, KU_SQL} from "../../src/hak.js";

const {DB} = await siapkan("uji-kaji-ulang"), env = {DB}, KINI = Date.parse("2026-11-15T12:00:00Z"), MENIT = 6e4;
const KJ1 = "KJ-2026-0000000A", KJ2 = "KJ-2026-0000000B", KJ3 = "KJ-2026-0000000C";
const n = async (t, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;
const galat = async (f, status) => { try { await f(); } catch (e) { assert.ok(e instanceof Galat, String(e)); assert.equal(e.status, status, e.message); return; } assert.fail("seharusnya Galat " + status); };
const kejadian = id => DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir uji', '3201', '2026-11-01', ?, 'manual', ?, ?, 'uji')").bind(id, KINI, KINI, KINI).run();
const sahkan = (kj, versi = 1, potret = '{"linimasa":[]}') => DB.prepare("UPDATE ku_kaji SET status = 'disahkan', versi = ?, disahkan_oleh = 'staf:9', disahkan_pada = ?, potret = ?, diubah = ? WHERE kejadian_id = ?").bind(versi, KINI, potret, KINI, kj).run();
const S = pelakuKuTulis;
for (const k of [KJ1, KJ2, KJ3]) await kejadian(k);

uji("T15 keempat tabel ku_* bertaut ke sk_kejadian lewat FK; kejadian tak ada ditolak", async () => {
  for (const t of ["ku_kaji", "ku_potret", "ku_pelajaran", "ku_rekomendasi"]) {
    const fk = (await DB.prepare(`PRAGMA foreign_key_list(${t})`).all()).results;
    assert.ok(fk.some(f => f.table === "sk_kejadian" && f.from === "kejadian_id" && f.to === "id"), t);
  }
  await assert.rejects(() => DB.prepare("INSERT INTO ku_kaji (kejadian_id, mulai_oleh, dibuat, diubah) VALUES ('KJ-2026-ZZZZZZZZ', 'x', 1, 1)").run(), /FOREIGN KEY/);
});

uji("T9 tiap kueri baca terlayani indeks (EXPLAIN tanpa SCAN tabel tanpa indeks)", async () => {
  const [a, b] = kuRentang(KJ1), bind = {kaji: [KJ1], potret: [KJ1], potretLama: [KJ1, 1], pelajaran: [KJ1], rekomendasi: [KJ1], rekomendasiNomor: [KJ1, 1], nomorBerikut: [KJ1], tindak: [a, b], lintas: []};
  for (const [k, sql] of Object.entries(KU_SQL)) {
    const plan = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...bind[k]).all()).results.map(r => r.detail);
    assert.deepEqual(plan.filter(d => /^SCAN/.test(d) && !/USING (COVERING )?INDEX/.test(d)), [], `${k}: ${plan.join(" | ")}`);
    if (k === "tindak") assert.ok(plan.some(d => /SEARCH dl_tindak USING (COVERING )?INDEX sqlite_autoindex_dl_tindak_1 \(kunci>\? AND kunci<\?\)/.test(d)), plan.join(" | "));
  }
});

uji("kuMulai: draf sekali, jejak sk_jejak hanya bila tertulis; kejadian tak ada tidak menulis apa pun; hak", async () => {
  await galat(() => kuMulai(env, pelakuKuBaca, {kejadianId: KJ1, oleh: "staf:1"}, KINI), 403);
  await galat(() => kuMulai(env, pelakuSistem, {kejadianId: KJ1, oleh: "staf:1"}, KINI), 403);
  await galat(() => kuMulai(env, S, {kejadianId: "bukan-kj", oleh: "staf:1"}, KINI), 400);
  assert.equal(await kuMulai(env, S, {kejadianId: KJ1, oleh: "staf:1"}, KINI), true);
  assert.equal(await kuMulai(env, S, {kejadianId: KJ1, oleh: "staf:2"}, KINI + MENIT), false);
  assert.equal(await kuMulai(env, S, {kejadianId: "KJ-2026-ZZZZZZZZ", oleh: "staf:1"}, KINI), false);
  assert.equal(await n("ku_kaji"), 1); assert.equal(await n("sk_jejak", "obyek = 'kaji_ulang'"), 1);
  const k = (await kuBaca(env, S, KJ1)).kaji; assert.deepEqual([k.status, k.versi, k.mulai_oleh], ["draf", 0, "staf:1"]);
  assert.equal(await kuBaca(env, S, KJ2), null, "belum dimulai");
  assert.equal(await kuPotret(env, S, KJ1), null);
});

uji("CHECK ku_kaji: draf tanpa potret/versi 0; disahkan wajib potret JSON, pengesah, versi >= 1; potret <= 100000", async () => {
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET versi = 1 WHERE kejadian_id = ?").bind(KJ1).run(), /CHECK/);
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET status = 'disahkan', versi = 1 WHERE kejadian_id = ?").bind(KJ1).run(), /CHECK/, "disahkan tanpa potret");
  await assert.rejects(() => sahkan(KJ1, 1, "bukan json"), /CHECK/);
  await assert.rejects(() => sahkan(KJ1, 1, JSON.stringify({x: "a".repeat(100001)})), /CHECK/);
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET status = 'ditolak' WHERE kejadian_id = ?").bind(KJ1).run(), /CHECK/);
  assert.equal((await kuBaca(env, S, KJ1)).kaji.status, "draf");
});

uji("pelajaran: tambah (versi_tambah 0 saat draf), validasi, ubah saat draf; kontak dan kontrol ditolak; kaji belum dimulai 404", async () => {
  const dasar = {kejadianId: KJ1, kategori: "perbaiki", teks: "Koordinasi sinyal pusat dan daerah terlambat", oleh: "staf:1"};
  await galat(() => kuTambahPelajaran(env, S, {...dasar, kejadianId: KJ2}, KINI), 404);
  await galat(() => kuTambahPelajaran(env, pelakuKuBaca, dasar, KINI), 403);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, kategori: "salah"}, KINI), 400);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, teks: "pendek"}, KINI), 400);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, teks: "Hubungi 081234567890 untuk rincian pelajaran ini"}, KINI), 400);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, teks: "Kirim ke budi@contoh.id untuk pelajaran ini"}, KINI), 400);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, teks: "Teks dengan kontrol \u0007 di dalamnya"}, KINI), 400);
  await galat(() => kuTambahPelajaran(env, S, {...dasar, rujuk: "bukan larik"}, KINI), 400);
  for (const rujuk of [[{peristiwa: "hubungi 081234567890"}], [{peristiwa: "ke budi@contoh.id"}], [{peristiwa: "padam", nama: "Budi"}], [{peristiwa: "a\u200bb"}], ["teks"], [[1]], [{peristiwa: {x: 1}}], [{peristiwa: "x".repeat(401)}]])
    await galat(() => kuTambahPelajaran(env, S, {...dasar, rujuk}, KINI), 400);
  for (const asalOpsId of ["ops 1", "ops/1", "x".repeat(41), ""]) await galat(() => kuTambahPelajaran(env, S, {...dasar, asalOpsId}, KINI), 400);
  for (const teks of ["Teks dengan \u0085 C1 di dalamnya", "Teks dengan \u202e bidi di dalamnya", "Teks dengan \u200b nol lebar di dalamnya", "Teks dengan \u2066 isolat di dalamnya"]) await galat(() => kuTambahPelajaran(env, S, {...dasar, teks}, KINI), 400);
  assert.equal(await n("ku_pelajaran"), 0, "penolakan tidak menulis apa pun");
  const id = await kuTambahPelajaran(env, S, {...dasar, rujuk: [{peristiwa: "padam", waktu: KINI}], asalOpsId: "ops-1"}, KINI);
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(await kuUbahPelajaran(env, S, {id, kategori: "baik", teks: "Koordinasi sinyal sudah cepat sesudah perbaikan"}, KINI), true);
  const p = (await kuBaca(env, S, KJ1)).pelajaran[0];
  assert.deepEqual([p.kategori, p.versi_tambah, p.asal_ops_id, p.rujuk], ["baik", 0, "ops-1", [{peristiwa: "padam", waktu: KINI}]]);
  assert.equal(await kuUbahPelajaran(env, S, {id: "0".repeat(16), kategori: "baik", teks: "Teks yang cukup panjang ya"}, KINI), false);
});

uji("T8 rekomendasi: satu baris ku_rekomendasi + dl_tindak (belum) + dl_tindak_log (langkah = teks), atomik; gagal salah satu membatalkan semua", async () => {
  const dasar = {kejadianId: KJ1, teks: "Pasang sirene peringatan di tiga kecamatan", unit: "Direktorat Sistem Penanggulangan", tenggat: "2027-01-15", oleh: "staf:1"};
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, kejadianId: KJ2}, KINI), 404);
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, tenggat: undefined}, KINI), 400);
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, tenggat: "2027-02-30"}, KINI), 400);
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, unit: "x"}, KINI), 400);
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, pelajaranId: "ab".repeat(8)}, KINI), 400);   // pelajaran tak ada: tidak ada yang tertulis
  assert.deepEqual([await n("ku_rekomendasi"), await n("dl_tindak", "kunci LIKE 'kaji|%'"), await n("dl_tindak_log", "kunci LIKE 'kaji|%'")], [0, 0, 0]);
  const pel = (await kuBaca(env, S, KJ1)).pelajaran[0].id;
  await kuMulai(env, S, {kejadianId: KJ3, oleh: "staf:1"}, KINI);
  await galat(() => kuTambahRekomendasi(env, S, {...dasar, kejadianId: KJ3, pelajaranId: pel}, KINI), 400);   // pelajaran milik KJ1, bukan KJ3
  assert.deepEqual([await n("ku_rekomendasi"), await n("dl_tindak", "kunci LIKE 'kaji|%'"), await n("dl_tindak_log", "kunci LIKE 'kaji|%'")], [0, 0, 0], "lintas kejadian tidak menulis apa pun");
  const a = await kuTambahRekomendasi(env, S, {...dasar, pelajaranId: pel}, KINI), b = await kuTambahRekomendasi(env, S, {...dasar, teks: "Latih ulang regu komunikasi tiap triwulan"}, KINI + MENIT);
  assert.deepEqual([a.nomor, b.nomor, a.kunci], [1, 2, `kaji|${KJ1}|01`]);
  assert.deepEqual([await n("ku_rekomendasi"), await n("dl_tindak", "kunci LIKE 'kaji|%'"), await n("dl_tindak_log", "kunci LIKE 'kaji|%'")], [2, 2, 2]);
  const log = await DB.prepare("SELECT status, langkah, catatan FROM dl_tindak_log WHERE kunci = ?").bind(a.kunci).first();
  assert.deepEqual([log.status, log.langkah, log.catatan], ["belum", dasar.teks, null]);
  await assert.rejects(() => DB.prepare("INSERT INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES (lower(hex(randomblob(8))), ?, 3, 'kaji|salah|03', 'teks yang cukup', 'unit', '2027-01-01', 'x', 1)").bind(KJ1).run(), /CHECK/, "kunci harus kaji|KJ|nn");
  await assert.rejects(() => DB.prepare("INSERT INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES (lower(hex(randomblob(8))), ?, 1, ?, 'teks yang cukup', 'unit', '2027-01-01', 'x', 1)").bind(KJ1, a.kunci).run(), /UNIQUE|ditimpa/);
  await assert.rejects(() => DB.prepare("INSERT INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES (lower(hex(randomblob(8))), ?, 4, ?, 'teks yang cukup', 'unit', 'besok', 'x', 1)").bind(KJ1, kuRentang(KJ1)[0] + "04").run(), /CHECK/, "tenggat wajib berbentuk tanggal");
});

uji("status rekomendasi: selesai wajib catatan 20..300; tidak dilanjutkan wajib selesai; riwayat; hak", async () => {
  const dasar = {kejadianId: KJ1, nomor: 1, oleh: "staf:2"};
  await galat(() => kuUbahStatus(env, S, {...dasar, status: "selesai"}, KINI), 400);
  await galat(() => kuUbahStatus(env, S, {...dasar, status: "selesai", catatan: "terlalu pendek"}, KINI), 400);
  await galat(() => kuUbahStatus(env, S, {...dasar, status: "proses", tidakDilanjutkan: true}, KINI), 400);
  await galat(() => kuUbahStatus(env, S, {...dasar, status: "ditolak"}, KINI), 400);
  await galat(() => kuUbahStatus(env, pelakuKuBaca, {...dasar, status: "proses"}, KINI), 403);
  assert.equal(await kuUbahStatus(env, S, {...dasar, nomor: 9, status: "proses"}, KINI), null);
  assert.equal((await kuUbahStatus(env, S, {...dasar, status: "proses"}, KINI + MENIT)).kunci, `kaji|${KJ1}|01`);
  await kuUbahStatus(env, S, {...dasar, status: "selesai", catatan: "Sirene terpasang dan diuji bersama BPBD", tidakDilanjutkan: false}, KINI + 2 * MENIT);
  const r = await kuRiwayat(env, S, KJ1, 1); assert.deepEqual(r.map(x => x.status), ["selesai", "proses", "belum"]);
  assert.ok(r.every(x => x.langkah === "Pasang sirene peringatan di tiga kecamatan"));
  assert.equal(await kuRiwayat(env, S, KJ1, 9), null);
  const baca = await kuBaca(env, S, KJ1); assert.deepEqual(baca.rekomendasi.map(x => x.status.status), ["selesai", "belum"]);
});

uji("rentang kunci: hanya kaji|KJ| milik kejadian itu; kunci banjir dan kejadian lain tidak ikut; F-7 lintas kejadian", async () => {
  await kuMulai(env, S, {kejadianId: KJ2, oleh: "staf:1"}, KINI);
  const r2 = await kuTambahRekomendasi(env, S, {kejadianId: KJ2, teks: "Sediakan genset cadangan di faskes", unit: "BPBD Provinsi", tenggat: "2026-12-01", oleh: "staf:1"}, KINI);
  await DB.prepare("INSERT INTO dl_tindak (kunci, status, oleh, waktu) VALUES (?, 'belum', 'x', ?)").bind(`banjir|${KJ1}|01`, KINI).run();
  const k1 = await kuBaca(env, S, KJ1), k2 = await kuBaca(env, S, KJ2);
  assert.deepEqual(k1.rekomendasi.map(x => x.kunci), [`kaji|${KJ1}|01`, `kaji|${KJ1}|02`]); assert.deepEqual(k2.rekomendasi.map(x => x.kunci), [r2.kunci]);
  const semua = await kuDaftarRekomendasi(env, S);
  assert.deepEqual(semua.map(x => [x.kejadian_id, x.nomor]), [[KJ2, 1], [KJ1, 1], [KJ1, 2]], "urut tenggat");
  assert.equal(semua[0].status, "belum");
  await galat(() => kuDaftarRekomendasi(env, {peran: "lain"}), 403);
  assert.equal((await kuBaca(env, pelakuKuBaca, KJ1)).kaji.status, "draf", "ku_baca boleh membaca");
});

uji("T12 sesudah disahkan: ubah/hapus pelajaran dan rekomendasi ditolak pemicu, tambah baru diterima, kembali ke draf ditolak, sahkan ulang mengarsipkan versi lama", async () => {
  await sahkan(KJ1, 1, '{"v":1}');
  await assert.rejects(() => DB.prepare("UPDATE ku_pelajaran SET teks = 'diubah diam-diam oleh siapa saja' WHERE kejadian_id = ?").bind(KJ1).run(), /tidak boleh diubah/);
  await assert.rejects(() => DB.prepare("DELETE FROM ku_pelajaran WHERE kejadian_id = ?").bind(KJ1).run(), /tidak boleh dihapus/);
  await assert.rejects(() => DB.prepare("UPDATE ku_rekomendasi SET unit = 'unit lain' WHERE kejadian_id = ?").bind(KJ1).run(), /tidak boleh diubah/);
  await assert.rejects(() => DB.prepare("UPDATE ku_rekomendasi SET tidak_dilanjutkan = 1, teks = 'teks berubah juga ya' WHERE kejadian_id = ?").bind(KJ1).run(), /tidak boleh diubah/, "penanda tidak boleh disertai ubahan lain");
  await assert.rejects(() => DB.prepare("DELETE FROM ku_rekomendasi WHERE kejadian_id = ?").bind(KJ1).run(), /tidak boleh dihapus/);
  const pid = (await DB.prepare("SELECT id FROM ku_pelajaran").first()).id;
  await galat(() => kuUbahPelajaran(env, S, {id: pid, kategori: "baik", teks: "Teks baru yang cukup panjang"}, KINI), 409);
  const baru = await kuTambahPelajaran(env, S, {kejadianId: KJ1, kategori: "baik", teks: "Posko gabungan bekerja baik sejak hari ketiga", oleh: "staf:1"}, KINI + 5 * MENIT);
  assert.equal((await DB.prepare("SELECT versi_tambah v FROM ku_pelajaran WHERE id = ?").bind(baru).first()).v, 1, "butir tambahan sesudah versi 1");
  const rk = await kuTambahRekomendasi(env, S, {kejadianId: KJ1, teks: "Tambah satu pos komando di hulu sungai", unit: "Pusdalops BNPB", tenggat: "2027-03-01", oleh: "staf:1"}, KINI + 6 * MENIT);
  assert.equal(rk.nomor, 3);
  await kuUbahStatus(env, S, {kejadianId: KJ1, nomor: 3, status: "selesai", catatan: "Tidak dikerjakan karena lokasi rawan longsor", tidakDilanjutkan: true, oleh: "staf:2"}, KINI + 7 * MENIT);
  assert.equal((await DB.prepare("SELECT tidak_dilanjutkan t FROM ku_rekomendasi WHERE nomor = 3 AND kejadian_id = ?").bind(KJ1).first()).t, 1, "penanda tidak dilanjutkan tetap bisa sesudah disahkan");
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET status = 'draf', versi = 0, disahkan_oleh = NULL, disahkan_pada = NULL, potret = NULL WHERE kejadian_id = ?").bind(KJ1).run(), /tidak kembali ke draf/);
  await assert.rejects(() => DB.prepare("UPDATE ku_kaji SET versi = 0 WHERE kejadian_id = ?").bind(KJ1).run(), /CHECK|tidak kembali/);
  assert.equal(await n("ku_potret"), 0);
  await sahkan(KJ1, 2, '{"v":2}');
  const lama = await kuPotret(env, S, KJ1, 1), baruP = await kuPotret(env, S, KJ1);
  assert.deepEqual([lama.versi, lama.potret, baruP.versi, baruP.potret], [1, {v: 1}, 2, {v: 2}]);
  assert.deepEqual(await kuPotret(env, S, KJ1, 7), null);
  for (const sql of ["UPDATE ku_potret SET potret = '{}'", "DELETE FROM ku_potret"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
});

uji("bypass beku: REPLACE/DELETE/ganti potret tanpa naik versi ditolak; INSERT normal lolos", async () => {
  const KJ = "KJ-2026-0000000F"; await kejadian(KJ); await kuMulai(env, S, {kejadianId: KJ, oleh: "staf:1"}, KINI);
  const pid = await kuTambahPelajaran(env, S, {kejadianId: KJ, kategori: "baik", teks: "Pelajaran sebelum disahkan ya", oleh: "staf:1"}, KINI);
  const rk = await kuTambahRekomendasi(env, S, {kejadianId: KJ, teks: "Rekomendasi sebelum disahkan ya", unit: "Unit uji", tenggat: "2027-02-01", oleh: "staf:1"}, KINI);
  await sahkan(KJ, 1, '{"v":1}');
  const tolak = (sql, ...b) => assert.rejects(() => DB.prepare(sql).bind(...b).run(), /tidak boleh|sudah ada|hanya berubah lewat sahkan ulang/, sql.slice(0, 60));
  await tolak("INSERT OR REPLACE INTO ku_kaji (kejadian_id, status, versi, mulai_oleh, dibuat, diubah) VALUES (?, 'draf', 0, 'x', 1, 1)", KJ);
  await tolak("DELETE FROM ku_kaji WHERE kejadian_id = ?", KJ);
  await tolak("INSERT OR REPLACE INTO ku_pelajaran (id, kejadian_id, kategori, teks, oleh, dibuat) VALUES (?, ?, 'baik', 'pelajaran pengganti yang licik', 'x', 1)", pid, KJ);
  await tolak("INSERT OR REPLACE INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES ('ffffffffffffffff', ?1, 1, ?2, 'rekomendasi pengganti licik', 'unit', '2027-01-01', 'x', 1)", KJ, rk.kunci);
  await tolak("INSERT OR REPLACE INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES (?1, ?2, 5, ?3, 'rekomendasi pengganti licik', 'unit', '2027-01-01', 'x', 1)", rk.id, KJ, kuRentang(KJ)[0] + "05");
  for (const set of ["potret = '{\"v\":\"palsu\"}'", "disahkan_oleh = 'orang lain'", "disahkan_pada = 1"]) await tolak(`UPDATE ku_kaji SET ${set} WHERE kejadian_id = ?`, KJ);
  await DB.prepare("INSERT INTO ku_potret (kejadian_id, versi, potret, disahkan_oleh, disahkan_pada) VALUES (?, 5, '{}', 'x', 1)").bind(KJ).run();
  await tolak("INSERT OR REPLACE INTO ku_potret (kejadian_id, versi, potret, disahkan_oleh, disahkan_pada) VALUES (?, 5, '{\"palsu\":1}', 'x', 1)", KJ);
  assert.deepEqual((await kuPotret(env, S, KJ)).potret, {v: 1});
  await sahkan(KJ, 2, '{"v":2}');   // sahkan ulang yang sah tetap lolos
  assert.equal((await kuPotret(env, S, KJ, 1)).potret.v, 1);
  await assert.rejects(() => DB.prepare("UPDATE ku_rekomendasi SET tenggat = '2027-02-30' WHERE id = ?").bind(rk.id).run(), /CHECK|tidak boleh/);
  await galat(() => kuTambahRekomendasi(env, S, {kejadianId: KJ, teks: "Rekomendasi tanggal mustahil", unit: "Unit uji", tenggat: "2027-02-30", oleh: "staf:1"}, KINI), 400);
  await assert.rejects(() => DB.prepare("INSERT INTO ku_rekomendasi (id, kejadian_id, nomor, kunci, teks, unit, tenggat, oleh, dibuat) VALUES (lower(hex(randomblob(8))), ?1, 7, ?2, 'rekomendasi tanggal mustahil', 'unit', '2027-02-30', 'x', 1)").bind(KJ, kuRentang(KJ)[0] + "07").run(), /CHECK/);
});

uji("dl_tindak_log append-only: UPDATE dan DELETE ditolak pemicu", async () => {
  assert.ok(await n("dl_tindak_log") > 0);
  for (const sql of ["UPDATE dl_tindak_log SET catatan = 'x'", "DELETE FROM dl_tindak_log"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
});

uji("kaji ulang yang masih draf di kejadian lain tidak ikut beku", async () => {
  await kuMulai(env, S, {kejadianId: KJ3, oleh: "staf:1"}, KINI);
  const id = await kuTambahPelajaran(env, S, {kejadianId: KJ3, kategori: "perbaiki", teks: "Pelajaran draf yang masih boleh diubah", oleh: "staf:1"}, KINI);
  assert.equal(await kuUbahPelajaran(env, S, {id, kategori: "baik", teks: "Pelajaran draf yang sudah diubah"}, KINI), true);
  await DB.prepare("DELETE FROM ku_pelajaran WHERE id = ?").bind(id).run();
  assert.equal(await n("ku_pelajaran", `kejadian_id = '${KJ3}'`), 0);
});
