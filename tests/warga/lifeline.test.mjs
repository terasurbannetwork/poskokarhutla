/* Status Lifeline LF-01..LF-04 (data/kajian-bnpb/lifeline/RENCANA-UJI.md T1, T3, T5, T6, T7, T8, T10, T11, T12, T13) di workerd (Miniflare) dengan D1 sungguhan,
   migrasi apa adanya. Jalankan: node --test tests/warga/lifeline.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import {Galat, pelakuLfBaca, pelakuLfTulis, lfKisi, lfSel, lfTetapkan, lfBacaIsyarat, lfHitungUsulan, LF_SQL, LF_LAYANAN} from "../../src/hak.js";
import {usulan} from "../../src/lifeline_usulan.js";

const {DB} = await siapkan("uji-lifeline"), env = {DB}, JAM = 36e5;
const KINI = Date.parse("2026-11-15T12:00:00Z"), MULAI = "2026-11-14";   // 14 Nov 00:00 WIB = 13 Nov 17:00 UTC
const KJ1 = "KJ-2026-0000000A", KJ2 = "KJ-2026-0000000B", KJ3 = "KJ-2026-0000000C";
const hex = c => c.repeat(64);
let nId = 0;

const kejadian = async (id, kabs) => {
  await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir uji', ?, ?, ?, 'manual', ?, ?, 'uji')").bind(id, kabs[0], MULAI, KINI, KINI, KINI).run();
  for (const k of kabs) await DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, ?, ?, ?)").bind(id, k, MULAI, KINI).run();
};
const lapor = async (jenis, sub, ipKode, prov, kab, dibuat = KINI - 2 * JAM) => {
  const id = "lp" + String(++nId).padStart(6, "0");
  await DB.prepare("INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash) VALUES (?, ?, ?, 'umum', -6.6, 106.8, ?, ?, ?, ?)").bind(id, jenis, sub, dibuat, dibuat + 24 * JAM, hex(ipKode), hex("f")).run();
  await DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES (?, ?, ?, 'masuk')").bind(id, prov, kab).run();
};
const usul = async (kj, kab4, layanan) => { const r = await DB.prepare("SELECT warna, alasan, isyarat FROM lf_usulan WHERE kejadian_id = ? AND kab4 = ? AND layanan = ?").bind(kj, kab4, layanan).first(); return r && {...r, isyarat: JSON.parse(r.isyarat)}; };
const n = async (t, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;
const galat = async (f, status, _ket) => { try { await f(); } catch (e) { assert.ok(e instanceof Galat, String(e)); assert.equal(e.status, status); return; } assert.fail("seharusnya Galat " + status); };

await kejadian(KJ1, ["3201", "3202", "3203"]);

uji("T1 kejadian baru: semua sel abu untuk tiap kab, delapan layanan", async () => {
  const k = await lfKisi(env, pelakuLfBaca, KJ1);
  assert.deepEqual(k.map(x => x.kab4), ["3201", "3202", "3203"]);
  for (const x of k) { assert.deepEqual(Object.keys(x.layanan), LF_LAYANAN); for (const s of Object.values(x.layanan)) { assert.equal(s.warna, "abu"); assert.equal(s.usulan, null); } }
  assert.deepEqual(await lfKisi(env, pelakuLfBaca, "KJ-2026-ZZZZZZZZ"), []);
});

uji("T3 tetapkan menulis status + riwayat dalam satu batch; riwayat append-only; bukti atau catatan wajib selain abu", async () => {
  const dasar = {kejadianId: KJ1, kab4: "3201", layanan: "listrik", oleh: "staf:1"};
  await galat(() => lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "kuning"}, KINI), 400);
  await galat(() => lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "kuning", catatan: "terlalu pendek"}, KINI), 400);
  await galat(() => lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "ungu", catatan: "x".repeat(30)}, KINI), 400);
  await galat(() => lfTetapkan(env, pelakuLfBaca, {...dasar, warna: "abu"}, KINI), 403);
  assert.equal(await n("lf_riwayat"), 0, "penolakan tidak menulis apa pun");
  assert.equal(await lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "kuning", bukti: [{sumber: "lapor_warga", kode: "listrik:padam", jumlah: 3, waktu: KINI, ip_hash: hex("a"), nama: "Budi", label: "palsu dari klien"}], oleh: "staf:1"}, KINI), true);
  assert.equal(await lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "hijau", catatan: "PLN melaporkan jaringan sudah menyala kembali", oleh: "staf:2"}, KINI + JAM), true);
  assert.equal(await lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "abu"}, KINI + 2 * JAM), true, "abu tanpa bukti sah");
  assert.equal(await n("lf_status"), 1); assert.equal(await n("lf_riwayat"), 3);
  const sel = await lfSel(env, pelakuLfBaca, KJ1, "3201", "listrik");
  assert.deepEqual(sel.riwayat.map(r => r.warna), ["abu", "hijau", "kuning"]);
  assert.deepEqual(sel.riwayat[2].bukti, [{sumber: "lapor_warga", kode: "listrik:padam", jumlah: 3, waktu: KINI, label: "isyarat kab, tidak khusus kejadian"}], "kunci di luar daftar putih dibuang, label dari server");
  assert.equal(sel.status.warna, "abu");
  assert.equal((await lfKisi(env, pelakuLfBaca, KJ1)).find(x => x.kab4 === "3201").layanan.listrik.warna, "abu");
  await galat(() => lfTetapkan(env, pelakuLfTulis, {...dasar, warna: "kuning", bukti: [{sumber: "klien", kode: "apa saja"}]}, KINI), 400);
  for (const sql of ["UPDATE lf_riwayat SET warna = 'merah'", "DELETE FROM lf_riwayat"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
  assert.equal(await lfTetapkan(env, pelakuLfTulis, {...dasar, kab4: "3299", warna: "abu"}, KINI), false, "kab di luar kejadian");
  assert.equal(await lfSel(env, pelakuLfBaca, KJ1, "3299", "listrik"), null);
  assert.equal(await n("lf_riwayat"), 3);
  await assert.rejects(() => DB.prepare("INSERT INTO lf_riwayat (kejadian_id, kab4, layanan, warna, oleh, dibuat) VALUES (?, '3201', 'air', 'merah', 'x', 1)").bind(KJ1).run(), /CHECK/, "DB sendiri menolak status tanpa bukti");
  await DB.prepare("DELETE FROM lf_status").run();   // bersihkan untuk uji berikutnya (riwayat tidak bisa dihapus, sengaja)
});

uji("T5 usulan listrik dari Lapor Warga per ip_hash; 24 jam; sesudah mulai; nama kab tak terpetakan dilewati", async () => {
  for (const ip of ["a", "b", "c"]) await lapor("listrik", "padam", ip, "32", "Bogor");                 // 3201: 3 ip berbeda = kuning
  for (const ip of ["a", "b"]) await lapor("listrik", "padam", ip, "32", "Sukabumi");                    // 3202: 2 ip = abu
  await lapor("listrik", "padam", "c", "32", "Sukabumi", KINI - 30 * JAM);                              //   lewat 24 jam
  await lapor("listrik", "padam", "d", "32", "Sukabumi", Date.parse("2026-11-13T10:00:00Z"));           //   sebelum mulai kejadian
  for (let i = 0; i < 5; i++) await lapor("listrik", "padam", "e", "32", "Cianjur", KINI - (i + 1) * JAM); // 3203: satu ip 5 laporan = abu
  for (const ip of ["a", "b", "c"]) await lapor("listrik", "padam", ip, "32", "Kampung Antah");         // tak terpetakan
  const h = await lfHitungUsulan(env, pelakuLfTulis, KJ1, KINI);
  assert.equal(h.sel, 24); assert.equal(h.tak_terpetakan.lapor_warga, 3);
  const u1 = await usul(KJ1, "3201", "listrik"); assert.equal(u1.warna, "kuning"); assert.equal(u1.isyarat[0].jumlah, 3);
  assert.equal((await usul(KJ1, "3202", "listrik")).warna, "abu");
  const u3 = await usul(KJ1, "3203", "listrik"); assert.equal(u3.warna, "abu"); assert.equal(u3.isyarat.length, 0);
  for (const l of LF_LAYANAN) if (l !== "listrik") assert.equal((await usul(KJ1, "3201", l)).warna, "abu", l);
});

uji("T6 usulan tidak mengubah status resmi", async () => {
  assert.equal(await n("lf_status"), 0);
  await lfTetapkan(env, pelakuLfTulis, {kejadianId: KJ1, kab4: "3202", layanan: "listrik", warna: "hijau", catatan: "dikonfirmasi PLN wilayah, sudah menyala", oleh: "staf:1"}, KINI);
  await lfHitungUsulan(env, pelakuLfTulis, KJ1, KINI + JAM);
  assert.equal((await DB.prepare("SELECT warna FROM lf_status WHERE kab4 = '3202' AND layanan = 'listrik'").first()).warna, "hijau");
  assert.equal(await n("lf_status"), 1); assert.equal((await usul(KJ1, "3201", "listrik")).warna, "kuning");
  const k = (await lfKisi(env, pelakuLfBaca, KJ1)).find(x => x.kab4 === "3201").layanan.listrik;
  assert.equal(k.warna, "abu"); assert.equal(k.usulan.warna, "kuning");
});

uji("T13 dua kejadian di kab yang sama menerima isyarat kab yang sama, berlabel", async () => {
  await kejadian(KJ2, ["3201"]);
  await lfHitungUsulan(env, pelakuLfTulis, KJ2, KINI);
  const a = await usul(KJ1, "3201", "listrik"), b = await usul(KJ2, "3201", "listrik");
  assert.deepEqual(b.isyarat, a.isyarat); assert.ok(b.isyarat.length && b.isyarat.every(x => /isyarat kab/.test(x.label)));
});

uji("sinyal hijau/merah, logbook, meja dampak, meja pengungsi dibaca per kab", async () => {
  await kejadian(KJ3, ["3204", "3205"]);   // Bandung, Garut
  for (const ip of ["a", "b", "c", "d", "e"]) await lapor("sinyal", "tidak_ada", ip, "32", "Bandung");   // 5 dari 5 = merah
  for (const ip of ["a", "b", "c"]) await lapor("sinyal", "lancar", ip, "32", "Garut");                     // hijau
  const lg = "lg00000000000001", ent = "le00000000000001";
  await DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?, 'banjir', '32', 'Garut', ?, ?, ?, ?)").bind(lg, MULAI, KINI, KINI, KINI).run();
  await DB.prepare("INSERT INTO logbook_entri (id, kejadian_id, waktu, kendala, kebutuhan, dibuat) VALUES (?, ?, ?, '[\"listrik\",\"cuaca\"]', '[\"air_bersih\"]', ?)").bind(ent, lg, KINI - JAM, KINI).run();
  const meja = (id, meja, kab, data, status) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, ?, '32', ?, ?, ?, ?, ?)").bind(id, meja, kab, JSON.stringify(data), status, KINI - 5 * JAM, KINI - JAM).run();
  await meja("md00000000000001", "dampak", "Bandung", {telekom_unit: 2, faskes_rb: 1, jalan_km: 1.5}, "dilaporkan");
  await meja("mp00000000000001", "pengungsi", "Bandung", {nama_tempat: "Aula A", tgl_data: "2026-11-15", keb_air: "tidak", keb_pangan: "ada"}, "tercatat");
  await meja("mp00000000000002", "pengungsi", "Bandung", {nama_tempat: "Aula B", tgl_data: "2026-11-15", keb_air: "ada", keb_pangan: "ada"}, "tercatat");
  await meja("mp00000000000003", "pengungsi", "Garut", {nama_tempat: "Masjid C", tgl_data: "2026-11-14", keb_air: "ada", keb_pangan: "ada"}, "tercatat");     // basi (> 3 hari lalu terbaru 11-14: tidak basi)
  await meja("mp00000000000004", "pengungsi", "Garut", {nama_tempat: "Masjid C", tgl_data: "2026-11-15", keb_air: "ada", keb_pangan: "ada", tgl_tutup: "2026-11-15"}, "tercatat");   // tutup: tidak terbuka
  await meja("mp00000000000005", "pengungsi", "Garut", {nama_tempat: "Balai D", tgl_data: "2026-11-10", keb_air: "ada", keb_pangan: "tidak"}, "tercatat");                       // basi 5 hari
  await lfHitungUsulan(env, pelakuLfTulis, KJ3, KINI);
  const w = async (k, l) => (await usul(KJ3, k, l));
  assert.equal((await w("3204", "sinyal")).warna, "merah");
  assert.equal((await w("3205", "sinyal")).warna, "hijau");
  assert.equal((await w("3205", "listrik")).warna, "kuning", "logbook kendala listrik");
  assert.equal((await w("3205", "air")).warna, "kuning", "logbook kebutuhan air_bersih");
  assert.equal((await w("3204", "faskes")).warna, "kuning"); assert.equal((await w("3204", "jalan")).warna, "kuning");
  assert.equal((await w("3204", "air")).warna, "kuning", "1 dari 2 titik tidak punya air, bukan lebih dari separuh");
  assert.equal((await w("3204", "pangan")).warna, "hijau"); assert.equal((await w("3204", "pengungsian")).warna, "hijau");
  assert.equal((await w("3205", "pengungsian")).warna, "merah", "1 titik terbuka basi dari 1 = 100%"); assert.equal((await w("3205", "pangan")).warna, "merah");
});

uji("T8 isyarat tanpa nama, koordinat, nomor, atau ip_hash", async () => {
  const {isyarat} = await lfBacaIsyarat(env, pelakuLfBaca, [{kab4: "3201", mulai: MULAI}], KINI), t = JSON.stringify(isyarat);
  assert.ok(!/ip_hash|"lat"|"lon"|nama|wa"|aaaa|bbbb/i.test(t), t);
  const semua = (await DB.prepare("SELECT isyarat, alasan FROM lf_usulan").all()).results.map(r => r.isyarat + r.alasan).join();
  assert.ok(!/ip_hash|"lat"|"lon"|[a-f0-9]{16}|Budi/.test(semua));
  assert.ok(isyarat["3201"].listrik.warga.total >= 3);
});

uji("T10 tiap kueri isyarat terlayani indeks (EXPLAIN tanpa SCAN tabel besar)", async () => {
  const binds = {warga: [KINI], logbook: ["32", KINI], dampak: ["32", KINI], pengungsi: ["32", KINI]};
  for (const [k, b] of Object.entries(binds)) {
    const plan = (await DB.prepare("EXPLAIN QUERY PLAN " + LF_SQL[k]).bind(...b).all()).results.map(r => r.detail);
    const scan = plan.filter(d => /^SCAN/.test(d) && !/json_each|\(subquery|\bj\b/i.test(d));
    assert.deepEqual(scan, [], `${k}: ${plan.join(" | ")}`);
    assert.ok(plan.some(d => /SEARCH/.test(d)), `${k} tanpa SEARCH: ${plan.join(" | ")}`);
  }
  const tanpa = (await DB.prepare("EXPLAIN QUERY PLAN " + LF_SQL.warga.replace("INDEXED BY laporan_jenis_dibuat ", "")).bind(KINI).all()).results.map(r => r.detail).join(" | ");
  assert.match(tanpa, /laporan_aktif/, "tanpa INDEXED BY planner memilih laporan_aktif: INDEXED BY harus dipertahankan"); assert.doesNotMatch(tanpa, /laporan_jenis_dibuat/);
  const indeks = JSON.stringify(await Promise.all(["warga", "dampak", "pengungsi"].map(async k => (await DB.prepare("EXPLAIN QUERY PLAN " + LF_SQL[k]).bind(...binds[k]).all()).results.map(r => r.detail))));
  assert.match(indeks, /laporan_jenis_dibuat/); assert.match(indeks, /meja_catatan_prov_diubah \(meja=\? AND prov=\? AND diubah>\?\)/);
});

uji("T11 ketiga tabel lf_* bertaut ke sk_kejadian lewat FK", async () => {
  for (const t of ["lf_status", "lf_riwayat", "lf_usulan"]) {
    const fk = (await DB.prepare(`PRAGMA foreign_key_list(${t})`).all()).results;
    assert.ok(fk.some(f => f.table === "sk_kejadian" && f.from === "kejadian_id" && f.to === "id"), t);
  }
  await assert.rejects(() => DB.prepare("INSERT INTO lf_usulan (kejadian_id, kab4, layanan, warna, alasan, dihitung) VALUES ('KJ-2026-ZZZZZZZZ', '3201', 'air', 'abu', 'x', 1)").run(), /FOREIGN KEY/);
});

uji("T12 jalan hijau, faskes hijau, faskes merah tidak pernah diusulkan; IODA tidak dipakai (T7)", () => {
  const isi = [0, 1, 2, 3, 5, 9], bentuk = [];
  for (const a of isi) for (const b of isi) for (const m of [0, 4]) for (const lbN of [0, 2])
    bentuk.push({warga: {total: 10, n: {putus: a, tertimbun: b, tergenang: a, faskes_penuh: a + b, hidup: 9, tersedia: 9}, pulih: 9, t: 1}, logbook: {n: lbN, t: 1}, meja: {n: m, t: 1}, titik: {terbuka: 3, tidak: 0, basi: 0, t: 1}, ioda: {padam: true}});
  for (const i of bentuk) {
    assert.notEqual(usulan({...i, layanan: "jalan"}).warna, "hijau"); assert.notEqual(usulan({...i, layanan: "faskes"}).warna, "hijau"); assert.notEqual(usulan({...i, layanan: "faskes"}).warna, "merah");
  }
  assert.equal(usulan({layanan: "jalan", warga: {total: 3, n: {putus: 3}}}).warna, "merah");
  assert.equal(usulan({layanan: "listrik", ioda: {padam: true}, provinsi: {padam_internet: 1}}).warna, "abu", "isyarat provinsi diabaikan");
  assert.equal(usulan({layanan: "air"}).warna, "abu"); assert.equal(usulan(null).warna, "abu");
  const sumber = readFileSync(path.join(AKAR, "src/lifeline_usulan.js"), "utf8") + readFileSync(path.join(AKAR, "src/hak.js"), "utf8").split("Status Lifeline (LF-02")[1];
  assert.ok(!/internet_padam|ioda\.|lampu_malam/i.test(sumber), "kode Lifeline tidak membaca IODA atau lampu malam");
});

uji("bbm dan elpiji dari satu ip_hash = satu pelapor; BBM merah butuh habis >= 5 pelapor; alasan memuat hipotesis", async () => {
  const KJ4 = "KJ-2026-0000000D"; await kejadian(KJ4, ["3206", "3207"]);   // Tasikmalaya, Ciamis
  await lapor("bbm", "habis", "a", "32", "Tasikmalaya"); await lapor("elpiji", "habis", "a", "32", "Tasikmalaya");
  for (const ip of ["b", "c"]) await lapor("elpiji", "habis", ip, "32", "Tasikmalaya");
  const {isyarat} = await lfBacaIsyarat(env, pelakuLfBaca, [{kab4: "3206", mulai: MULAI}], KINI);
  assert.equal(isyarat["3206"].bbm.warga.total, 3); assert.equal(isyarat["3206"].bbm.warga.n.habis, 3);
  for (const ip of ["d", "e", "h"]) await lapor("bbm", "habis", ip, "32", "Ciamis");
  await lfHitungUsulan(env, pelakuLfTulis, KJ4, KINI);
  const u = await usul(KJ4, "3206", "bbm"); assert.equal(u.warna, "kuning"); assert.match(u.alasan, /hipotesis/);
  assert.equal((await usul(KJ4, "3207", "bbm")).warna, "kuning", "3 pelapor habis: kuning, belum merah");
  await lapor("bbm", "habis", "f", "32", "Tasikmalaya"); await lapor("bbm", "habis", "g", "32", "Tasikmalaya");
  await lfHitungUsulan(env, pelakuLfTulis, KJ4, KINI); assert.equal((await usul(KJ4, "3206", "bbm")).warna, "merah", "5 pelapor habis");
});

uji("hijau air dan pangan butuh kesegaran; titik dikenali lewat titik_id lebih dulu dari nama", async () => {
  const KJ5 = "KJ-2026-0000000E"; await kejadian(KJ5, ["3208"]);   // Kuningan
  const meja = (id, data) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'pengungsi', '32', 'Kuningan', ?, 'tercatat', ?, ?)").bind(id, JSON.stringify(data), KINI - 5 * JAM, KINI - JAM).run();
  await meja("mq00000000000001", {titik_id: "TP-AAAAAAAA", nama_tempat: "Aula lama", tgl_data: "2026-11-10", keb_air: "ada", keb_pangan: "ada"});
  await meja("mq00000000000002", {titik_id: "TP-AAAAAAAA", nama_tempat: "Aula Baru", tgl_data: "2026-11-14", keb_air: "ada", keb_pangan: "ada"});   // titik sama, nama beda
  await lfHitungUsulan(env, pelakuLfTulis, KJ5, KINI);
  const {isyarat} = await lfBacaIsyarat(env, pelakuLfBaca, [{kab4: "3208", mulai: MULAI}], KINI);
  assert.equal(isyarat["3208"].air.titik.terbuka, 1, "dua catatan satu titik_id = satu titik");
  assert.equal((await usul(KJ5, "3208", "air")).warna, "hijau"); assert.equal((await usul(KJ5, "3208", "pangan")).warna, "hijau");
  await meja("mq00000000000003", {nama_tempat: "Balai Tua", tgl_data: "2026-11-09", keb_air: "ada", keb_pangan: "ada"});   // basi 6 hari
  await lfHitungUsulan(env, pelakuLfTulis, KJ5, KINI);
  for (const l of ["air", "pangan"]) { const u = await usul(KJ5, "3208", l); assert.equal(u.warna, "abu", l); assert.match(u.alasan, /tidak cukup segar/); }
  assert.equal((await usul(KJ5, "3208", "pengungsian")).warna, "merah", "1 dari 2 titik basi = separuh");
});

uji("bukti sah dari usulan() semuanya ada di BUKTI_SAH", async () => {
  const {BUKTI_SAH} = await import("../../src/lifeline_usulan.js"), sah = new Set(Object.entries(BUKTI_SAH).flatMap(([s, ks]) => ks.map(k => s + "|" + k)));
  const w = {total: 9, n: {padam: 9, tidak_ada: 9, habis: 9, putus: 9, tergenang: 9, faskes_penuh: 9, lemah: 9, terbatas: 9, hidup: 9}, pulih: 9, t: 1};
  for (const l of LF_LAYANAN) for (const [warga, lb, mj, titik] of [[w, 0, 0, {terbuka: 4, tidak: 4, basi: 4, t: 1}], [{...w, n: {}}, 3, 0, {terbuka: 4, tidak: 1, basi: 1, t: 1}], [{...w, n: {padam: 3, tidak_ada: 3, habis: 3, tergenang: 3, faskes_penuh: 3}, pulih: 0}, 0, 2, {terbuka: 4, tidak: 0, basi: 0, t: 1}], [{...w, n: {}}, 0, 0, {terbuka: 4, tidak: 0, basi: 0, t: 1}], [{...w, n: {}}, 0, 0, {terbuka: 2, tidak: 0, basi: 1, t: 1}]])
      for (const b of usulan({layanan: l, warga, logbook: {n: lb, t: 1}, meja: {n: mj, t: 1}, titik}).isyarat) assert.ok(sah.has(b.sumber + "|" + b.kode), `${l}: ${b.sumber}|${b.kode}`);
});
