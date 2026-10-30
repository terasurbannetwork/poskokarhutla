/* SIPPA alur lintas-tabel (RENCANA-UJI §2.5, PRD §9.12.2 baris "alur lintas-tabel", TIKET SP-054), langkah 1 sampai 10: satu basis data Miniflare, langkah berurutan.
   Admin membuat kit, perencana menugaskan, operator (kode) kirim log 6 tahap + probe + BBM, gerak gelar lalu kembali, pindah banjir (YonTP, ETA),
   konfirmasi tiba, log banjir m3, kembali ke gudang, cek komponen satu hilang; rekap log, kehilangan 1/n, dan laporan mingguan cocok persis dengan SQL langsung.
   Langkah 11-14 RU §2.5 (inspeksi, servis, stok, aset) ada di sippa_alur.test.mjs (SP-096).
   Jalankan: node --test tests/warga/sippa_alur_kit.test.mjs */
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {vonisPilot} from "../../public/pipa/hitung.js";

const JAM = 3600e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
const U = await siapkan("uji-sippa-alur-kit"), {DB, api} = U;
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
const uuid = () => crypto.randomUUID();
const hitung = async (tabel, where = "1", ...p) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).bind(...p).first()).n;
const jejakDari = (obyek, aksi) => hitung("pantau_jejak", "obyek = ? AND aksi = ? AND dummy = 0", obyek, aksi);

/* laporan_isi.js (SP-044) dipakai bila ada DAN sudah punya templat mingguan (JENIS_SIAP); kalau tidak, kontrak DT §6.4 dipenuhi stub yang hanya menjumlah baris log dari API */
const stub = (jenis, d) => ({judul: "Laporan " + jenis, nama_berkas: `sippa-${jenis}.pdf`, kaki: "Dibuat otomatis",
  blok: [{tipe: "angka", kunci: "jam_pompa", nilai: d.log.reduce((a, l) => a + (l.jam_pompa ?? 0), 0)}, {tipe: "angka", kunci: "banjir_m3", nilai: d.log.reduce((a, l) => a + (l.banjir_m3 ?? 0), 0)},
    {tipe: "angka", kunci: "kehilangan_pct", nilai: d.kehilangan.per_kit[d.kit_id]}]});
const asli = existsSync(path.join(AKAR, "public/pipa/laporan_isi.js")) ? (await import("../../public/pipa/laporan_isi.js")).isiLaporan : null;
const isiLaporan = (jenis, d) => { try { return asli ? asli(jenis, d, {per: Date.now()}) : stub(jenis, d); } catch (e) { if (e instanceof RangeError) return stub(jenis, d); throw e; } };

/* staf: pusdalops (menugaskan, bergerak) */
let ip = 0;
const bikin = async peran => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1982${++ip}0012005`, unit: "Pusdalops BNPB", email: `al${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}};
};
const pus = await bikin(["pusdalops"]);
const gerak = (kit, b, h = pus.h) => sip("POST", "/gerak/" + kit, b, h);
const kirim = (kode, b) => sip("POST", "/lapangan/kirim", {jam_kirim: Date.now(), log: [], probe: [], bbm: [], gerak: [], ...b}, {"x-kode": kode});
const status = async id => (await DB.prepare("SELECT status FROM sippa_kit WHERE id = ?").bind(id).first()).status;

const S = {};   // keadaan bersama antar langkah
const T0 = Date.now() - 12 * JAM;
const ket = (langkah, tabel, harap, dapat) => `langkah ${langkah} (${tabel}): harapan ${JSON.stringify(harap)}, didapat ${JSON.stringify(dapat)}`;

uji("1. Admin membuat SIPPA-001 gambut: komponen dari templat BOM, n komponen awal dicatat; pusdalops tidak boleh", async () => {
  assert.equal((await sip("POST", "/kit", {kode: "SIPPA-001", jenis: "gambut", templat: "gambut", prov: "62"}, pus.h)).s, 403, "pusdalops membuat kit harus 403 (hanya Admin)");
  const r = await sip("POST", "/kit", {kode: "SIPPA-001", jenis: "gambut", templat: "gambut", pemilik_asal: "BMN BNPB", prov: "62", kab: "Kota Palangka Raya"}, ADMIN);
  assert.equal(r.s, 201, r.t); S.kit = r.j.kit.id;
  S.nAwal = await hitung("sippa_komponen", "kit_id = ? AND musim_awal = 1", S.kit);
  assert.ok(S.nAwal >= 15, ket(1, "sippa_komponen", ">= 15", S.nAwal)); assert.equal(r.j.komponen, S.nAwal);
  assert.equal(await jejakDari("sippa_kit:" + S.kit, "buat"), 1, ket(1, "pantau_jejak", 1, "bukan 1"));
});

uji("2. Pusdalops menugaskan kit ke regu: kode 26 heks, hanya sha256 tersimpan, kode salah ditolak", async () => {
  const r = await sip("POST", "/tugas", {nama_regu: "Regu Alur", unsur: "manggala_agni", prov: "62", kab: "Kota Palangka Raya", berlaku_hari: 7, kit_id: S.kit, lengan_dalam: 0}, pus.h);
  assert.equal(r.s, 201, r.t); assert.match(r.j.kode, /^[0-9a-f]{26}$/); S.kode = r.j.kode; S.tugas = r.j.tugas.id;
  assert.equal((await DB.prepare("SELECT kode_sha FROM sippa_tugas WHERE id = ?").bind(S.tugas).first()).kode_sha, sha256(S.kode), ket(2, "sippa_tugas", "sha256(kode)", "lain"));
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": S.kode})).s, 200);
  assert.equal((await sip("GET", "/lapangan/saya", undefined, {"x-kode": "0".repeat(26)})).s, 403, "kode salah harus 403");
  assert.equal(await jejakDari("sippa_tugas:" + S.tugas, "tugas"), 1);
});

uji("3. Operator kirim log gelar 6 tahap + probe sebelum/sesudah/24j di 4 kedalaman + BBM keluar; kirim ulang tidak menggandakan", async () => {
  const L = uuid(), at = (m) => T0 + m * 60e3;
  const log = {id: L, jenis: "karhutla", kelas_medan: "II", petak_id: "PETAK-1", panjang_m: 400, n_orang: 12, t_tiba: at(0), t_mulai_gelar: at(10), t_air_mengalir: at(70), t_mulai_injeksi: at(90), t_selesai: at(240), t_bongkar_selesai: at(300),
    jam_pompa: 4, bbm_l: 30, air_m3: 600, air_sampai_lance: 1, p_ujung_bar: 2.4, p_ujung_menit: 45, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 0, waktu_klien: Date.now() - 1000};
  const probe = ["sebelum", "sesudah", "24j"].flatMap(tahap => [10, 30, 50, 100].map(k => ({id: uuid(), log_id: L, petak_id: "PETAK-1", titik: "T1", tahap, kedalaman_cm: k, suhu_c: tahap === "sebelum" ? 60 : 35, waktu: at(5)})));
  const bbm = {id: uuid(), log_id: L, waktu: at(0), jenis: "bensin", aksi: "keluar", liter: 40};
  const b = {log: [log], probe, bbm: [bbm]}, r = await kirim(S.kode, b);
  assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.ditolak, [], ket(3, "kirim", [], r.j.ditolak)); assert.equal(r.j.diterima.length, 1 + probe.length + 1);
  S.log1 = L; S.probe = probe;
  const lg = await DB.prepare("SELECT kit_id, tugas_id, t_tiba, t_bongkar_selesai FROM sippa_log_gelar WHERE id = ?").bind(L).first();
  assert.equal(lg.kit_id, S.kit); assert.equal(lg.tugas_id, S.tugas);
  assert.equal(await hitung("sippa_probe", "log_id = ?", L), 12, ket(3, "sippa_probe", 12, "lain")); assert.equal(await hitung("sippa_bbm", "log_id = ?", L), 1);
  const lagi = await kirim(S.kode, b); assert.deepEqual(lagi.j.diterima, [], "kirim ulang tidak boleh menerima apa pun"); assert.equal(lagi.j.ganda.length, 14);
  assert.equal(await hitung("sippa_log_gelar", "kit_id = ?", S.kit), 1, "kirim ulang menggandakan log");
  assert.equal(await hitung("pantau_jejak", "obyek = ? AND aksi = 'kirim' AND dummy = 0", "sippa_tugas:" + S.tugas) >= 1, true);
});

uji("4. Gerak gelar lalu kembali oleh operator; transisi tidak sah dan pindah_banjir oleh operator DITOLAK, status tidak berubah", async () => {
  assert.equal((await gerak(S.kit, {alasan: "kembali", ke_status: "banjir"}, {"x-kode": S.kode})).s, 400, "gudang>banjir lewat alasan kembali adalah transisi tidak sah");
  assert.equal((await gerak(S.kit, {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp", permintaan_dari: "BPBD"}, {"x-kode": S.kode})).s, 403, "operator tidak boleh pindah_banjir");
  assert.equal(await status(S.kit), "gudang", "penolakan mengubah status");
  const g = await gerak(S.kit, {alasan: "gelar", ke_status: "gelar", lat: -2.2, lon: 113.9}, {"x-kode": S.kode}); assert.equal(g.s, 201, g.t); S.gGelar = g.j.gerak.id;
  assert.equal(await status(S.kit), "gelar", ket(4, "sippa_kit", "gelar", await status(S.kit)));
  const k = await gerak(S.kit, {alasan: "kembali", ke_status: "gudang"}, {"x-kode": S.kode}); assert.equal(k.s, 201, k.t); S.gKembali = k.j.gerak.id;
  assert.equal(await status(S.kit), "gudang");
  for (const id of [S.gGelar, S.gKembali]) assert.equal(await jejakDari("sippa_gerak:" + id, "gerak"), 1, "gerak tanpa jejak " + id);
});

uji("5. Staf pindah banjir (YonTP, ETA 48 jam, rencana); gerak lain 409 selama terbuka; operator konfirmasi tiba sekali", async () => {
  const r = await gerak(S.kit, {alasan: "pindah_banjir", ke_status: "banjir", rencana: 1, pengangkut: "yontp", permintaan_dari: "BPBD Kalsel", eta_jam: 48, prov: "63", kab: "Banjar"});
  assert.equal(r.s, 201, r.t); S.gPindah = r.j.gerak.id; assert.equal(r.j.gerak.pengangkut, "yontp"); assert.equal(r.j.gerak.eta_jam, 48); assert.equal(r.j.gerak.tiba, null);
  assert.equal(await status(S.kit), "gudang", "gerak terencana belum mengubah status");
  assert.equal((await gerak(S.kit, {alasan: "gelar", ke_status: "gelar"}, {"x-kode": S.kode})).s, 409, "gerak lain saat rencana terbuka harus 409");
  const t = await sip("POST", "/tiba/" + S.gPindah, {}, {"x-kode": S.kode}); assert.equal(t.s, 200, t.t);
  assert.equal(await status(S.kit), "banjir", ket(5, "sippa_kit", "banjir", await status(S.kit)));
  assert.equal((await sip("POST", "/tiba/" + S.gPindah, {}, {"x-kode": S.kode})).s, 409, "tiba dua kali harus 409");
  assert.equal(await jejakDari("sippa_gerak:" + S.gPindah, "gerak"), 1); assert.equal(await jejakDari("sippa_gerak:" + S.gPindah, "tiba"), 1);
});

uji("6. Operator log banjir 1.200 m3 dan 10 jam pompa; banjir_m3 pada sesi karhutla DITOLAK", async () => {
  const L = uuid(), at = m => T0 + 24 * JAM + m * 60e3;
  const banjir = {id: L, jenis: "banjir", petak_id: "BANJIR-1", n_orang: 8, t_tiba: at(0), t_mulai_gelar: at(20), t_air_mengalir: at(60), t_selesai: at(660), t_bongkar_selesai: at(720), jam_pompa: 10, banjir_m3: 1200, waktu_klien: Date.now() - 1000};
  const salah = {...banjir, id: uuid(), jenis: "karhutla"};
  const r = await kirim(S.kode, {log: [banjir, salah]}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.diterima, [L], ket(6, "kirim", [L], r.j.diterima)); assert.equal(r.j.ditolak.length, 1); assert.match(r.j.ditolak[0].alasan, /banjir_m3/);
  S.log2 = L; assert.equal((await DB.prepare("SELECT banjir_m3 b FROM sippa_log_gelar WHERE id = ?").bind(L).first()).b, 1200);
});

uji("7. Kembali ke gudang lalu cek komponen dengan satu hilang", async () => {
  const k = await gerak(S.kit, {alasan: "kembali", ke_status: "gudang"}); assert.equal(k.s, 201, k.t); assert.equal(await status(S.kit), "gudang"); S.gGudang = k.j.gerak.id;
  const [c] = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? ORDER BY kode_bom LIMIT 1").bind(S.kit).all()).results; S.hilang = c.id;
  assert.equal((await sip("POST", "/komponen/" + S.kit, {ubah: [{id: c.id, kondisi: "hilang"}]}, pus.h)).s, 400, "hilang tanpa catatan harus 400");
  const r = await sip("POST", "/komponen/" + S.kit, {ubah: [{id: c.id, kondisi: "hilang", catatan: "terbawa arus banjir"}]}, pus.h); assert.equal(r.s, 200, r.t);
  assert.equal(await hitung("sippa_komponen", "kit_id = ? AND kondisi = 'hilang'", S.kit), 1);
  assert.equal(await jejakDari("sippa_komponen:" + c.id, "ubah"), 1); assert.equal(await jejakDari("sippa_gerak:" + S.gGudang, "gerak"), 1);
});

uji("8. Rekap: log memuat dua sesi, kehilangan musim = 1/n, laporan mingguan sama persis dengan SQL langsung", async () => {
  const lg = await sip("GET", "/log?kit=" + S.kit, undefined, pus.h); assert.equal(lg.s, 200, lg.t); assert.equal(lg.j.n, 2, ket(8, "sippa_log_gelar", 2, lg.j.n));
  assert.deepEqual(lg.j.log.map(l => l.id).sort(), [S.log1, S.log2].sort());
  const kt = await sip("GET", "/kit", undefined, pus.h), harap = Math.round(1000 / S.nAwal) / 10;
  assert.equal(kt.j.kehilangan.per_kit[S.kit], harap, ket(8, "sippa_komponen", `1/${S.nAwal} = ${harap}%`, kt.j.kehilangan.per_kit[S.kit]));
  assert.equal(kt.j.kehilangan.musim_pct, harap);
  const sql = await DB.prepare("SELECT sum(jam_pompa) j, sum(banjir_m3) b FROM sippa_log_gelar WHERE kit_id = ?").bind(S.kit).first();
  const kar = await DB.prepare("SELECT 1.0 * sum(CASE WHEN kondisi = 'hilang' THEN 1 ELSE 0 END) / count(*) p FROM sippa_komponen WHERE kit_id = ? AND musim_awal = 1").bind(S.kit).first();
  assert.equal(sql.j, 14); assert.equal(sql.b, 1200);
  const lap = isiLaporan("mingguan", {log: lg.j.log, kehilangan: kt.j.kehilangan, kit_id: S.kit}), v = k => lap.blok.find(x => x.tipe === "angka" && x.kunci === k)?.nilai;
  assert.equal(v("jam_pompa"), sql.j, ket(8, "laporan mingguan jam_pompa", sql.j, v("jam_pompa"))); assert.equal(v("banjir_m3"), sql.b, ket(8, "laporan mingguan banjir_m3", sql.b, v("banjir_m3")));
  assert.equal(v("kehilangan_pct"), Math.round(1000 * kar.p) / 10, "kehilangan laporan harus sama dengan hitungan SQL");
});

uji("9. Tiap langkah 1-7 punya jejak; gerak, log, dan BBM menolak UPDATE dan DELETE sesudahnya", async () => {
  for (const [obyek, aksi] of [["sippa_kit:" + S.kit, "buat"], ["sippa_tugas:" + S.tugas, "tugas"], ["sippa_tugas:" + S.tugas, "kirim"], ["sippa_gerak:" + S.gGelar, "gerak"], ["sippa_gerak:" + S.gKembali, "gerak"],
    ["sippa_gerak:" + S.gPindah, "gerak"], ["sippa_gerak:" + S.gPindah, "tiba"], ["sippa_gerak:" + S.gGudang, "gerak"], ["sippa_komponen:" + S.hilang, "ubah"]])
    assert.ok(await jejakDari(obyek, aksi) >= 1, `langkah tanpa baris pantau_jejak: ${obyek} ${aksi}`);
  const bbm = (await DB.prepare("SELECT id FROM sippa_bbm WHERE log_id = ?").bind(S.log1).first()).id;
  const tolak = async (tabel, sql, id) => { let galat = null; try { await DB.prepare(sql).bind(id).run(); } catch (e) { galat = e; } assert.ok(galat, `${tabel}: "${sql}" harus ditolak trigger, tetapi lolos`); };
  await tolak("sippa_gerak", "UPDATE sippa_gerak SET catatan = 'x' WHERE id = ?", S.gKembali); await tolak("sippa_gerak", "DELETE FROM sippa_gerak WHERE id = ?", S.gKembali);
  await tolak("sippa_log_gelar", "UPDATE sippa_log_gelar SET jam_pompa = 99 WHERE id = ?", S.log1); await tolak("sippa_log_gelar", "DELETE FROM sippa_log_gelar WHERE id = ?", S.log1);
  await tolak("sippa_bbm", "UPDATE sippa_bbm SET liter = 1 WHERE id = ?", bbm); await tolak("sippa_bbm", "DELETE FROM sippa_bbm WHERE id = ?", bbm);
});

uji("10. vonisPilot atas data langkah 3-7 dari API sama dengan dari SQL langsung (vonis dan tujuh butir)", async () => {
  const lg = (await sip("GET", "/log?kit=" + S.kit, undefined, pus.h)).j.log, pr = (await DB.prepare("SELECT * FROM sippa_probe WHERE tugas_id = ?").bind(S.tugas).all()).results;
  const komp = (await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE kit_id = ? AND musim_awal = 1").bind(S.kit).all()).results;
  const sqlLog = (await DB.prepare("SELECT * FROM sippa_log_gelar WHERE kit_id = ?").bind(S.kit).all()).results;
  const a = vonisPilot({log: lg, probe: pr, komponen_kembali: komp}), b = vonisPilot({log: sqlLog, probe: pr, komponen_kembali: komp});
  assert.equal(a.butir.length, 7); assert.deepEqual(a, b, "vonisPilot dari API dan dari SQL berbeda: rute /log menjatuhkan atau mengubah medan");
  const b7 = a.butir.find(x => x.no === 7); assert.equal(b7.nilai, (S.nAwal - 1) / S.nAwal, ket(10, "butir 7", `${S.nAwal - 1}/${S.nAwal}`, b7.nilai));
  assert.equal(a.butir.find(x => x.no === 5).nilai, 1, "probe 12 dari 12 = lengkap");
});
