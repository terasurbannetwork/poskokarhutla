/* Uji lapangan karhutla (src/uji_lapangan.js, migrasi 0055, GET /api/uji-lapangan, halaman /uji-lapangan, medan baru di form Ruang Instansi).
   Statistik dan pemilihan sampel diuji sebagai fungsi murni; skema, rute isian, cron, dan API diuji di workerd (Miniflare) dengan D1 + R2 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/uji_lapangan.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan uji_lapangan.js saling impor
import {PRAREGISTRASI, KOLAM_TAHAN_HARI, METODE_TERUKUR, wilson, proporsi, hitungQ1, hitungQ2, hitungQ3, hitungQ4, hitungQ5, selangMedian, persen, hash53, mingguISO, layakKontrol, pilihKontrol, kunciKandidat, bacaUji,
  TUTUPAN, METODE_LUAS, YA_TIDAK, TINGGI_NYALA, ANGIN_LOKAL, PENYEBAB, BEKAS_BARU} from "../../src/uji_lapangan.js";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM;
const ADMIN = {"x-admin-token": "rahasia-admin"};
const BASE = Date.UTC(2026, 9, 21, 3, 20);   // menit 20: cron uji lapangan
const sha256 = s => createHash("sha256").update(s).digest("hex");

/* ---- fixture aset: berkas tugas/kandidat bisa diganti per uji; selebihnya berkas nyata dari public/ ---- */
let TUGAS = null, KANDIDAT = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json") return TUGAS == null ? new Response("tidak ada", {status: 404}) : Response.json(TUGAS);
  if (p === "/data/uji_kandidat.json") return KANDIDAT == null ? new Response("tidak ada", {status: 404}) : Response.json(KANDIDAT);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-lapangan"}, r2Buckets: {MEDIA: "uji-lapangan"}, cf: {country: "ID", colo: "CGK"},
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SESI_KUNCI: "kunci-sesi-uji"},
    serviceBindings: {ASSETS: aset}, outboundService: async () => new Response("diblok di uji", {status: 599}), cache: false});
  const asli = await mf.getD1Database("DB");
  DB = {prepare: s => asli.prepare(s), batch: l => asli.batch(l), exec: async q => { for (const s of q.split(";").map(x => x.trim()).filter(Boolean)) await asli.prepare(s).run(); }};   // exec: satu pernyataan per panggilan
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(async () => { await mf?.dispose(); });
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ipUrut = 0;
const api = async (metode, j, body, h = {}, host = "pantau.lokal") => {
  const isi = body === undefined ? undefined : JSON.stringify(body);
  if (j.startsWith("/api/uji-lapangan") && metode === "GET" && !("x-admin-token" in h)) h = {...ADMIN, ...h};   // evaluasi internal: admin default; kosongkan x-admin-token untuk tamu
  h = {"cf-connecting-ip": `203.0.113.${++ipUrut % 250}`, ...h};   // batas laju 20/menit per IP: tiap panggilan IP berbeda
  const r = await mf.dispatchFetch(`http://${host}${j}`, {method: metode, redirect: "manual", headers: {...(metode === "POST" ? {"x-pb": "1", "content-length": String(new TextEncoder().encode(isi ?? "").length)} : {}), ...(isi !== undefined ? {"content-type": "application/json"} : {}), ...h}, body: isi});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const n = async (tabel, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${w}`).first()).n;
const sql = async (...ss) => { for (const s of ss) await DB.prepare(s).run(); };   // D1 exec per baris tidak dipakai: satu pernyataan per panggilan
const cron = async jam => (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: jam});
const hex16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---- akun aktif + sesi lewat SQL (jalur masuk penuh diuji di instansi.test.mjs) ---- */
let COOKIE = null, AKUN = null;
const siapkanAkun = async () => {
  AKUN = hex16(); const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, 'pemprovkalteng', 'pemprov', 'prov', 'Kalimantan Tengah', 'kalteng', '["62"]', '62', ?, ?, 'aktif', 'Budi Santoso', '198001012005011001', 'Kepala BPBD', 'BPBD Provinsi', 'budi@kalteng.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(AKUN, "a".repeat(32), "b".repeat(64), BASE).run();
  await DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), AKUN, Date.now(), Date.now() + 30 * HARI).run();
  COOKIE = {cookie: `sesi_instansi=${token}`};
};
const tugasBaru = async (o = {}) => {
  const id = hex16(), dibuat = o.dibuat ?? Date.now() - JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, padam_verif, padam_pada, dummy) VALUES (?, ?, ?, 'Kec Uji', ?, ?, ?, 10, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.prov ?? "62", o.kab ?? "seruyan", o.lat ?? -2.55, o.lon ?? 112.0, o.level ?? 3, o.luas ?? 50, dibuat, dibuat, o.status ?? "buka", o.konfirmasi_pada ?? null, null, o.padam_verif ?? null, o.padam_pada ?? null, o.dummy ?? 0).run();
  return id;
};
let kl = 0;
const mediaBaru = async (tugasId, o = {}) => {
  const id = hex16(), kini = Date.now();
  await DB.prepare("INSERT INTO instansi_media (id, akun_id, tugas_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, akurasi, waktu_gps, jarak_km, dibuat) VALUES (?, ?, ?, 'foto', 'image/jpeg', 1000, ?, 'gps', ?, ?, 10, ?, 0.1, ?)")
    .bind(id, AKUN, tugasId, kini - MENIT, o.lat ?? -2.55, o.lon ?? 112.0, kini - MENIT, kini).run();
  return id;
};
const KONF = (media, o = {}) => ({klien_id: `uji-klien-${++kl}-${Date.now()}`, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", media: [media], ...o});
const KABAR = (media, o = {}) => ({klien_id: `uji-klien-${++kl}-${Date.now()}`, tindakan: "Pemadaman darat dengan pompa", status_api: "bara", kendala: [], bantuan: [], media: media ? [media] : [], ...o});

/* ================================================================ statistik murni */
uji("uji lapangan: Wilson, proporsi tertimbang, dan selang median", () => {
  const [lo, hi] = wilson(40, 50); assert.ok(Math.abs(lo - 0.670) < 0.005 && Math.abs(hi - 0.888) < 0.005, `Wilson 40/50 = ${lo},${hi}`);
  assert.deepEqual(wilson(0, 0), null);
  const [l0, h0] = wilson(0, 10); assert.ok(l0 < 1e-9 && l0 >= 0); assert.ok(h0 > 0.2 && h0 < 0.33);
  /* tertimbang: 4 positif bobot 1, 1 negatif bobot 4 -> p = 4/8 = 0,5; n efektif Kish = 64 / 20 = 3,2 (< 5 kunjungan mentah) */
  const p = proporsi([{ya: 1, w: 1, n: 4}, {ya: 0, w: 4, n: 1}]);
  assert.equal(p.n, 5); assert.equal(p.nilai, 0.5); assert.equal(p.n_efektif, 3.2);
  const sama = proporsi([{ya: 1, w: 1, n: 30}, {ya: 0, w: 1, n: 10}]); assert.equal(sama.nilai, 0.75); assert.equal(sama.n_efektif, 40, "bobot sama: n efektif = n");
  assert.equal(proporsi([]).nilai, null);
  const u = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; assert.deepEqual(selangMedian(u), [6, 15]); assert.equal(selangMedian([1, 2, 3]), null);
  assert.equal(persen([1, 2, 3, 4], 0.5), 2.5); assert.equal(persen([], 0.5), null);
});
uji("uji lapangan: Q1 vonis lolos, gagal, belum cukup data; per level, firespot, dan strata; bobot kontrol", () => {
  const baris = (sampel, level, firespot, ya, bobot, nn) => ({sampel, level, firespot, ya, bobot, n: nn});
  /* lolos: level >= 2 = 50 kunjungan, 41 api (0,82) */
  const lolos = hitungQ1([baris("tugas", 3, "ya", 1, 1, 30), baris("tugas", 3, "ya", 0, 1, 5), baris("tugas", 2, "ya", 1, 1, 11), baris("tugas", 2, "mungkin", 0, 1, 4)]);
  assert.equal(lolos.n, 50); assert.equal(lolos.nilai, 0.82); assert.equal(lolos.vonis, "lolos"); assert.ok(lolos.selang[0] < 0.82 && lolos.selang[1] > 0.82); assert.equal(lolos.batas_bawah, lolos.selang[0]);
  assert.equal(lolos.batas_bawah_memenuhi, false, "titik 0,82 lolos tetapi batas bawah Wilson < 0,80: dilaporkan jujur");
  /* gagal: 50 kunjungan, 30 api (0,6) */
  assert.equal(hitungQ1([baris("tugas", 3, null, 1, 1, 30), baris("tugas", 3, null, 0, 1, 20)]).vonis, "gagal");
  /* tepat di ambang: 40/50 = 0,80 lolos (>=) */
  assert.equal(hitungQ1([baris("tugas", 2, null, 1, 1, 40), baris("tugas", 2, null, 0, 1, 10)]).vonis, "lolos");
  /* belum cukup data: 49 kunjungan walau 100% api */
  const sedikit = hitungQ1([baris("tugas", 3, null, 1, 1, 49)]); assert.equal(sedikit.vonis, "belum_cukup_data"); assert.equal(sedikit.nilai, 1);
  assert.equal(hitungQ1([]).vonis, "belum_cukup_data"); assert.equal(hitungQ1([]).nilai, null);
  /* level 0-1 tidak ikut vonis, tetapi dilaporkan; kontrol ditimbang kebalikan peluang: 20 kandidat, 5 dipilih -> bobot 4 */
  const campur = hitungQ1([baris("tugas", 3, "ya", 1, 1, 50), baris("tugas", 1, "mungkin", 1, 1, 2), baris("kontrol", 1, "mungkin", 1, 4, 1), baris("kontrol", 1, "mungkin", 0, 4, 4), baris("kontrol", 0, null, 0, 6, 5)]);
  assert.equal(campur.vonis, "lolos"); assert.equal(campur.nilai, 1);
  const l1 = campur.rincian.per_level.find(x => x.level === 1), l0 = campur.rincian.per_level.find(x => x.level === 0);
  assert.equal(l1.n, 7); assert.equal(l1.nilai, bulatan((2 + 4) / (2 + 20)), "level 1: (2*1 + 1*4) / (2 + 5*4) tertimbang, bukan 3/7 mentah");
  assert.equal(l0.nilai, 0); assert.equal(campur.rincian.per_level.find(x => x.level === 3).n, 50);
  assert.equal(campur.rincian.per_firespot.find(x => x.firespot === "mungkin").n, 7); assert.equal(campur.rincian.per_firespot.find(x => x.firespot === "ya").n, 50); assert.equal(campur.rincian.per_firespot.find(x => x.firespot === "tak_tercatat").n, 5);
  const mentah = Object.fromEntries(campur.rincian.per_sampel.map(x => [x.sampel, x])); assert.equal(mentah.tugas.n, 52); assert.equal(mentah.kontrol.n, 10); assert.equal(mentah.kontrol.ya, 1);
  assert.equal(PRAREGISTRASI.q1.ambang.presisi_min, 0.8); assert.equal(PRAREGISTRASI.q1.ambang.n_min, 50);
});
const bulatan = x => Math.round(x * 1000) / 1000;
uji("uji lapangan: Q2 deskriptif, Q3 BSS, Q4 median rasio + MAPE tanpa taksiran, Q5 padam", () => {
  const q2 = hitungQ2(20, 5); assert.equal(q2.n, 25); assert.equal(q2.nilai, 0.2); assert.equal(q2.pod, 0.8); assert.equal(q2.vonis, "belum_cukup_data");
  const q2b = hitungQ2(25, 5); assert.equal(q2b.vonis, null, "n >= 30: deskriptif, tanpa lolos/gagal"); assert.equal(q2b.deskriptif, true); assert.ok(q2b.selang[0] < q2b.nilai && q2b.nilai < q2b.selang[1]);
  /* Q3: peluang yang tajam dan benar -> BSS > 0 lolos; peluang konstan = frekuensi -> BSS 0 gagal; terbalik -> BSS < 0 gagal */
  const bagus = Array.from({length: 40}, (_, i) => i < 10 ? {p: 0.8, y: 1} : {p: 0.05, y: 0}), q3 = hitungQ3(bagus);
  assert.equal(q3.n, 40); assert.ok(q3.nilai > 0.7, String(q3.nilai)); assert.equal(q3.vonis, "lolos"); assert.ok(q3.selang && q3.selang[0] > 0 && q3.selang[1] <= 1, JSON.stringify(q3.selang));
  assert.deepEqual(hitungQ3(bagus), q3, "bootstrap berbenih tetap: hasil sama untuk data sama");
  assert.equal(hitungQ3(Array.from({length: 40}, (_, i) => ({p: 0.25, y: i < 10 ? 1 : 0}))).vonis, "gagal", "BSS = 0 bukan > 0");
  assert.equal(hitungQ3(Array.from({length: 40}, (_, i) => i < 10 ? {p: 0.05, y: 1} : {p: 0.8, y: 0})).vonis, "gagal");
  assert.equal(hitungQ3(bagus.slice(0, 29)).vonis, "belum_cukup_data"); assert.equal(hitungQ3([]).vonis, "belum_cukup_data");
  /* Q4: median rasio lapangan/platform 0,7-1,4 lolos; di luar gagal; MAPE dihitung terhadap luas lapangan */
  const rasio = r => Array.from({length: 31}, () => ({lap: 100 * r, plat: 100}));
  const q4 = hitungQ4(rasio(1.0)); assert.equal(q4.n, 31); assert.equal(q4.nilai, 1); assert.equal(q4.vonis, "lolos"); assert.equal(q4.mape, 0);
  assert.equal(hitungQ4(rasio(0.7)).vonis, "lolos"); assert.equal(hitungQ4(rasio(1.4)).vonis, "lolos"); assert.equal(hitungQ4(rasio(0.69)).vonis, "gagal"); assert.equal(hitungQ4(rasio(1.41)).vonis, "gagal");
  const q4m = hitungQ4(Array.from({length: 30}, () => ({lap: 50, plat: 100})), 7); assert.equal(q4m.nilai, 0.5); assert.equal(q4m.mape, 1, "|100-50|/50"); assert.equal(q4m.rincian.taksiran_tidak_dihitung, 7);
  assert.equal(hitungQ4(rasio(1).slice(0, 29)).vonis, "belum_cukup_data"); assert.equal(hitungQ4([{lap: 5, plat: 0}]).n, 0, "platform 0 tidak membentuk rasio");
  assert.deepEqual(METODE_TERUKUR, ["keliling_gps", "jalan_keliling", "drone"], "taksiran bukan metode terukur");
  /* Q5 */
  assert.equal(hitungQ5(26, 4).nilai, bulatan(26 / 30)); assert.equal(hitungQ5(26, 4).vonis, "lolos");
  assert.equal(hitungQ5(25, 5).vonis, "gagal", "25/30 = 0,833 < 0,85"); assert.equal(hitungQ5(20, 0).vonis, "belum_cukup_data"); assert.equal(hitungQ5(0, 0).nilai, null);
});
uji("uji lapangan: pra-registrasi beku (objek tidak bisa diubah)", () => {
  assert.ok(Object.isFrozen(PRAREGISTRASI) && Object.isFrozen(PRAREGISTRASI.q1) && Object.isFrozen(PRAREGISTRASI.q1.ambang));
  assert.throws(() => { "use strict"; PRAREGISTRASI.q1.ambang.presisi_min = 0.5; }, TypeError);
  assert.deepEqual(PRAREGISTRASI.q3.ambang, {bss_min: 0, n_min: 30, luas_lolos_ha: 140, jeda_jam: 72}); assert.deepEqual(PRAREGISTRASI.q4.ambang, {rasio_min: 0.7, rasio_maks: 1.4, n_min: 30});
  assert.deepEqual(PRAREGISTRASI.q5.ambang, {porsi_min: 0.85, n_min: 30, jendela_hari: 7}); assert.equal(PRAREGISTRASI.kontrol.per_minggu_per_provinsi, 5);
});

/* ================================================================ pemilihan sampel kontrol */
const kand = (i, o = {}) => ({id: `K${i}`, lat: -2 - i * 0.01, lon: 112 + i * 0.01, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 1, n24: 1, jam_sejak: 3, luas: 2, otomatis: false, firespot: "mungkin", akses: {kaki_km: 1.2, dari: []}, ...o});
uji("uji lapangan: mingguISO, layakKontrol, dan pilihKontrol deterministik (benih = minggu + provinsi)", () => {
  assert.equal(mingguISO(Date.UTC(2026, 9, 23)), "2026-W43"); assert.equal(mingguISO(Date.UTC(2026, 0, 1)), "2026-W01"); assert.equal(mingguISO(Date.UTC(2021, 0, 3)), "2020-W53"); assert.equal(mingguISO(Date.UTC(2026, 11, 31)), "2026-W53");
  assert.equal(mingguISO(Date.UTC(2026, 9, 19, 0, 0)), "2026-W43", "Senin 00:00 UTC membuka minggu baru"); assert.equal(mingguISO(Date.UTC(2026, 9, 18, 23, 59)), "2026-W42");
  assert.ok(layakKontrol(kand(1))); assert.ok(layakKontrol(kand(2, {level: 0, firespot: null})));
  assert.ok(layakKontrol(kand(3, {level: 2, firespot: "mungkin"})), "firespot mungkin walau level 2");
  for (const [nama, k] of Object.entries({"level 3": kand(4, {level: 3, firespot: null}), "level 2 bukan mungkin": kand(5, {level: 2, firespot: "ya"}), otomatis: kand(6, {otomatis: true}), "teramati > 24 jam": kand(7, {jam_sejak: 25}),
    "jauh dari akses": kand(8, {akses: {kaki_km: 3.1}}), "tanpa akses": kand(9, {akses: undefined}), "provinsi rusak": kand(10, {prov: "6"}), "di luar Indonesia": kand(11, {lat: 40}), "kab terlalu pendek": kand(12, {kab: "x"})}))
    assert.ok(!layakKontrol(k), nama);
  const pool = Array.from({length: 23}, (_, i) => kand(i));
  const a = pilihKontrol(pool, "2026-W43", "62"), b = pilihKontrol([...pool].reverse(), "2026-W43", "62");
  assert.equal(a.dipilih.length, 5); assert.equal(a.n_kandidat, 23); assert.equal(a.benih, "2026-W43|62");
  assert.deepEqual(a.dipilih.map(kunciKandidat), b.dipilih.map(kunciKandidat), "urutan masukan tidak mengubah pilihan");
  assert.deepEqual(pilihKontrol(pool, "2026-W43", "62"), a, "dipanggil ulang: sama persis");
  const lain = pilihKontrol(pool, "2026-W44", "62"), lain2 = pilihKontrol(pool, "2026-W43", "63");
  assert.notDeepEqual(lain.dipilih.map(kunciKandidat), a.dipilih.map(kunciKandidat), "minggu berbeda: undian berbeda"); assert.notDeepEqual(lain2.dipilih.map(kunciKandidat), a.dipilih.map(kunciKandidat), "provinsi berbeda: undian berbeda");
  assert.equal(pilihKontrol(pool.slice(0, 3), "2026-W43", "62").dipilih.length, 3, "kandidat < 5: semuanya"); assert.equal(pilihKontrol([], "2026-W43", "62").dipilih.length, 0);
  assert.equal(pilihKontrol([kand(1), kand(1)], "2026-W43", "62").n_kandidat, 1, "koordinat sama = satu kandidat");
  /* tidak bias ke indeks: dari 40 minggu, tiap kandidat terpilih kira-kira 5/23 = 22% */
  const hitung = new Map(); for (let w = 1; w <= 40; w++) for (const k of pilihKontrol(pool, `2026-W${String(w).padStart(2, "0")}`, "62").dipilih) hitung.set(k.id, (hitung.get(k.id) || 0) + 1);
  assert.ok(hitung.size >= 18, `semua kandidat punya peluang: ${hitung.size} dari 23 terpilih sekali atau lebih`); assert.ok(Math.max(...hitung.values()) <= 20, "tidak ada kandidat yang hampir selalu terpilih");
  assert.equal(hash53("abc"), hash53("abc")); assert.notEqual(hash53("abc"), hash53("abd"));
});

/* ================================================================ medan isian */
uji("uji lapangan: bacaUji validasi ketat (enum, batas, kunci asing, wajib bila luas diisi)", () => {
  assert.deepEqual(bacaUji(undefined, true), {v: null}, "klien lama tanpa uji: perilaku lama, tidak wajib"); assert.deepEqual(bacaUji({}, false), {v: null});
  assert.match(bacaUji("x", false).g, /objek/); assert.match(bacaUji([], false).g, /objek/);
  assert.match(bacaUji({tutupan: "gambut", metode_luas: "drone", rahasia: 1}, false).g, /tidak dikenal/);
  assert.match(bacaUji({tutupan: "gambut"}, true).g, /wajib/); assert.match(bacaUji({metode_luas: "drone"}, true).g, /wajib/); assert.match(bacaUji({tepi_aktif: "ya"}, true).g, /wajib/);
  const lengkap = {tutupan: "kebun_sawit", metode_luas: "keliling_gps", n_titik_jalur: 3, arah_jalar_deg: 90, tepi_aktif: "ya", tinggi_nyala: "05_15", angin_lokal: "sedang", dugaan_penyebab: "pembukaan_lahan", bekas_terbakar_baru: "tak_tahu"};
  const ok = bacaUji(lengkap, true); assert.equal(ok.g, undefined); assert.equal(ok.v.tutupan, "kebun_sawit"); assert.equal(ok.v.arah_jalar_deg, 90); assert.equal(ok.v.n_titik_jalur, 3); assert.ok(!("jalur_gps" in ok.v), "jalur tidak pernah disimpan");
  for (const [k, v] of Object.entries({tutupan: "sawit", metode_luas: "mata", tepi_aktif: "mungkin", tinggi_nyala: "tinggi", angin_lokal: "badai", dugaan_penyebab: "iseng", bekas_terbakar_baru: "ya!"})) assert.match(bacaUji({...lengkap, [k]: v}, true).g, new RegExp(k), k);
  for (const a of [360, -1, 12.5, "90", NaN]) assert.match(bacaUji({...lengkap, arah_jalar_deg: a}, true).g, /arah_jalar_deg/, String(a));
  assert.equal(bacaUji({...lengkap, arah_jalar_deg: 0}, true).v.arah_jalar_deg, 0, "0 derajat (utara) sah");
  assert.match(bacaUji({...lengkap, jalur_gps: [[-2.5, 112], [-2.6, 112], [-2.6, 112.1]]}, true).g, /jalur tidak disimpan/, "jalur mentah ditolak (minimisasi data)");
  for (const nn of [2, 151, 3.5, "3", NaN]) assert.match(bacaUji({...lengkap, n_titik_jalur: nn}, true).g, /n_titik_jalur/, String(nn));
  assert.equal(bacaUji({...lengkap, n_titik_jalur: 150}, true).g, undefined); assert.match(bacaUji({...lengkap, metode_luas: "drone"}, true).g, /keliling_gps/, "jumlah titik hanya untuk keliling_gps");
  assert.equal(bacaUji({tutupan: "hutan"}, false).v.metode_luas, null, "luas tidak diisi: tutupan saja boleh"); assert.equal(bacaUji({tutupan: "", tepi_aktif: null}, false).v, null, "kosong = tidak diisi");
});
uji("uji lapangan: daftar kode klien (instansi_uji.js) = server = CHECK migrasi 0055", () => {
  const ctx = {window: {}, document: {addEventListener() {}, getElementById() { return null; }}, navigator: {}}; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(AKAR, "public/instansi_uji.js"), "utf8"), ctx, {filename: "instansi_uji.js"});
  const D = ctx.window.UjiLapangan.DAFTAR, kunci = o => Object.keys(o);
  assert.deepEqual(kunci(D.TUTUPAN), TUTUPAN); assert.deepEqual(kunci(D.METODE_LUAS), METODE_LUAS); assert.deepEqual(kunci(D.YA_TIDAK), YA_TIDAK); assert.deepEqual(kunci(D.TINGGI_NYALA), TINGGI_NYALA);
  assert.deepEqual(kunci(D.ANGIN_LOKAL), ANGIN_LOKAL); assert.deepEqual(kunci(D.PENYEBAB), PENYEBAB); assert.deepEqual(kunci(D.BEKAS_BARU), BEKAS_BARU);
  const sql = readFileSync(path.join(AKAR, "migrations/0055_uji_lapangan.sql"), "utf8"), daftar = [...sql.matchAll(/IN \(([^)]+)\)/g)].map(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const ada = (nama, isi) => assert.ok(daftar.some(d => d.length === isi.length && d.every((v, i) => v === isi[i])), `${nama} di 0055 harus persis ${JSON.stringify(isi)}`);
  ada("tutupan", TUTUPAN); ada("metode_luas", METODE_LUAS); ada("tinggi_nyala", TINGGI_NYALA); ada("angin_lokal", ANGIN_LOKAL); ada("dugaan_penyebab", PENYEBAB); ada("bekas_terbakar_baru", BEKAS_BARU); ada("ya/tidak", YA_TIDAK);
  /* semua arah di select klien sah di server */
  const html = ctx.window.UjiLapangan.bidang("t".repeat(16), true); for (const m of html.matchAll(/<option value="(\d+)">/g)) assert.ok(Number(m[1]) >= 0 && Number(m[1]) <= 359);
  assert.doesNotMatch(html, /on[a-z]+="/i, "tanpa handler inline (CSP)"); assert.match(ctx.window.UjiLapangan.bidangCek(), /ujiBekas/);
});

/* ================================================================ skema */
uji("uji lapangan: migrasi 0055 idempoten; CHECK strata, enum, jalur, sampel, dan POD", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0055_uji_lapangan.sql"), "utf8");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // diulang: IF NOT EXISTS, tanpa galat
  for (const t of ["uji_tugas", "uji_isian", "uji_sampel", "uji_terlewat"]) assert.equal(await n(t), 0, t);
  await siapkanAkun();
  const t1 = await tugasBaru(), kini = Date.now();
  const tugas = (id, o = {}) => DB.prepare("INSERT INTO uji_tugas (tugas_id, sampel, level, firespot, prov, luas_platform_ha, p_lolos, minggu, dibuat) VALUES (?, ?, ?, ?, '62', ?, ?, ?, ?)").bind(id, o.sampel ?? "tugas", o.level ?? 3, o.firespot ?? null, o.luas ?? 10, o.p ?? null, o.minggu ?? null, kini).run();
  await assert.rejects(tugas(t1, {sampel: "kontrol"}), /CHECK|constraint/i, "kontrol wajib bermingu"); await assert.rejects(tugas(t1, {sampel: "tugas", minggu: "2026-W43"}), /CHECK|constraint/i, "tugas tanpa minggu");
  await assert.rejects(tugas(t1, {sampel: "acak"}), /CHECK|constraint/i); await assert.rejects(tugas(t1, {firespot: "pasti"}), /CHECK|constraint/i); await assert.rejects(tugas(t1, {p: 1.2}), /CHECK|constraint/i, "peluang 0-1");
  await assert.rejects(tugas(t1, {minggu: "2026-43"}), /CHECK|constraint/i); await assert.rejects(tugas(t1, {level: 12}), /CHECK|constraint/i);
  await tugas(t1, {p: 0.4}); assert.equal(await n("uji_tugas"), 1);
  /* uji_isian: butuh isian induk (FK) */
  const media = await mediaBaru(t1), r = await api("POST", `/api/instansi/konfirmasi/${t1}`, KONF(media), COOKIE); assert.equal(r.s, 201, r.t);
  const iid = r.j.id, ib = (k, v) => DB.prepare(`INSERT INTO uji_isian (isian_id, tugas_id, dibuat, ${k}) VALUES (?, ?, ?, ?)`).bind(iid, t1, kini, v).run();
  for (const [k, v] of [["tutupan", "sawit"], ["metode_luas", "mata"], ["tepi_aktif", "kadang"], ["tinggi_nyala", "tinggi"], ["angin_lokal", "badai"], ["dugaan_penyebab", "iseng"], ["bekas_terbakar_baru", "mungkin"], ["arah_jalar_deg", 360], ["arah_jalar_deg", -1], ["n_titik_jalur", 151], ["n_titik_jalur", -1]])
    await assert.rejects(ib(k, v), /CHECK|constraint/i, `${k}=${v}`);
  await assert.rejects(DB.prepare("INSERT INTO uji_isian (isian_id, tugas_id, dibuat, jalur_gps) VALUES (?, ?, ?, '[]')").bind(iid, t1, kini).run(), /jalur_gps/i, "kolom jalur_gps tidak ada: jalur tidak disimpan");
  await assert.rejects(DB.prepare("INSERT INTO uji_isian (isian_id, tugas_id, dibuat, tutupan) VALUES (?, ?, ?, 'hutan')").bind(hex16(), t1, kini).run(), /FOREIGN KEY|constraint/i, "isian induk wajib ada");
  await ib("tutupan", "hutan"); assert.equal(await n("uji_isian"), 1);
  await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(t1).run();   // retensi: tugas dibuang -> isian dan medan uji ikut (CASCADE)
  assert.equal(await n("uji_isian"), 0); assert.equal(await n("uji_tugas"), 0);
  /* uji_sampel dan uji_terlewat */
  const sam = (...a) => DB.prepare("INSERT INTO uji_sampel (minggu, prov, benih, n_kandidat, n_dipilih, dibuat) VALUES (?, ?, ?, ?, ?, ?)").bind(...a).run();
  await assert.rejects(sam("2026-W43", "62", "2026-W43|62", 3, 4, kini), /CHECK|constraint/i, "dipilih <= kandidat"); await assert.rejects(sam("2026-W43", "62", "2026-W43|62", 9, 6, kini), /CHECK|constraint/i, "maks 5");
  await assert.rejects(sam("minggu-ini", "62", "2026-W43|62", 9, 5, kini), /CHECK|constraint/i); await sam("2026-W43", "62", "2026-W43|62", 9, 5, kini);
  await assert.rejects(sam("2026-W43", "62", "2026-W43|62", 9, 5, kini), /UNIQUE|constraint/i, "satu baris per (minggu, provinsi)"); await DB.prepare("DELETE FROM uji_sampel").run();
  await assert.rejects(DB.prepare("INSERT INTO uji_terlewat (lapangan_id, waktu, prov, status, hasil, dinilai) VALUES (?, 1, '62', 'padam', 'terlewat', 1)").bind(hex16()).run(), /CHECK|constraint/i, "hanya menyala/bara");
  await assert.rejects(DB.prepare("INSERT INTO uji_terlewat (lapangan_id, waktu, prov, status, hasil, dinilai) VALUES (?, 1, '62', 'bara', 'mungkin', 1)").bind(hex16()).run(), /CHECK|constraint/i);
  await DB.prepare("DELETE FROM tugas_isian").run(); await DB.prepare("DELETE FROM tugas_api").run();
});

/* ================================================================ isian: rute worker */
uji("uji lapangan: konfirmasi menerima medan baru; luas tanpa tutupan + metode ditolak; klien lama tanpa uji tetap jalan", async () => {
  const t = await tugasBaru({luas: 80});
  const tolak = async (uji, kata, o = {}) => { const m = await mediaBaru(t); const r = await api("POST", `/api/instansi/konfirmasi/${t}`, KONF(m, {uji, ...o}), COOKIE); assert.equal(r.s, 400, `${JSON.stringify(uji)} -> ${r.t}`); assert.match(r.j.galat, kata); await DB.prepare("DELETE FROM instansi_media WHERE id = ?").bind(m).run(); };
  await tolak({tutupan: "gambut"}, /wajib/, {luas_ha: 12}); await tolak({metode_luas: "drone"}, /wajib/, {luas_ha: 12}); await tolak({tutupan: "sawit", metode_luas: "drone"}, /tutupan/, {luas_ha: 12});
  await tolak({tutupan: "gambut", metode_luas: "drone", ekstra: 1}, /tidak dikenal/, {luas_ha: 12}); await tolak("gambut", /objek/); await tolak({arah_jalar_deg: 400}, /arah_jalar_deg/);
  await tolak({tutupan: "gambut", metode_luas: "keliling_gps", jalur_gps: [[-2.5, 112], [-2.6, 112], [-2.6, 112.1]]}, /jalur_gps/, {luas_ha: 5}); await tolak({tutupan: "gambut", metode_luas: "keliling_gps", n_titik_jalur: 2}, /n_titik_jalur/, {luas_ha: 5});
  assert.equal(await n("tugas_isian", `tugas_id = '${t}'`), 0, "penolakan tidak meninggalkan isian"); assert.equal(await n("uji_isian"), 0);
  const m = await mediaBaru(t);
  const ok = await api("POST", `/api/instansi/konfirmasi/${t}`, KONF(m, {luas_ha: 12.5, uji: {tutupan: "kebun_sawit", metode_luas: "keliling_gps", n_titik_jalur: 3, arah_jalar_deg: 135, tepi_aktif: "ya", tinggi_nyala: "lt05", angin_lokal: "lemah", dugaan_penyebab: "pembukaan_lahan"}}), COOKIE);
  assert.equal(ok.s, 201, ok.t);
  const baris = await DB.prepare("SELECT * FROM uji_isian WHERE isian_id = ?").bind(ok.j.id).first();
  assert.equal(baris.tutupan, "kebun_sawit"); assert.equal(baris.metode_luas, "keliling_gps"); assert.equal(baris.n_titik_jalur, 3); assert.ok(!("jalur_gps" in baris), "kolom jalur tidak ada"); assert.equal(baris.arah_jalar_deg, 135); assert.equal(baris.tepi_aktif, "ya");
  assert.equal(baris.tinggi_nyala, "lt05"); assert.equal(baris.angin_lokal, "lemah"); assert.equal(baris.dugaan_penyebab, "pembukaan_lahan"); assert.equal(baris.bekas_terbakar_baru, null); assert.equal(baris.tugas_id, t);
  assert.equal((await DB.prepare("SELECT luas_ha FROM tugas_isian WHERE id = ?").bind(ok.j.id).first()).luas_ha, 12.5);
  /* kirim ulang (idempoten): tidak menggandakan */
  const ulang = await api("POST", `/api/instansi/konfirmasi/${t}`, {...KONF(m, {luas_ha: 12.5}), klien_id: (await DB.prepare("SELECT klien_id FROM tugas_isian WHERE id = ?").bind(ok.j.id).first()).klien_id}, COOKIE);
  assert.equal(ulang.s, 200); assert.equal(ulang.j.ulang, true); assert.equal(await n("uji_isian"), 1);
  /* kabar tindakan: tanpa luas boleh tanpa tutupan; dengan luas wajib */
  const k0 = await mediaBaru(t); let r = await api("POST", `/api/instansi/kabar/${t}`, KABAR(null, {luas_ha: 30, uji: {tutupan: "hutan"}}), COOKIE); assert.equal(r.s, 400); assert.match(r.j.galat, /wajib/);
  r = await api("POST", `/api/instansi/kabar/${t}`, KABAR(null, {uji: {angin_lokal: "kencang", tinggi_nyala: "gt15"}}), COOKIE); assert.equal(r.s, 201, r.t);
  assert.equal((await DB.prepare("SELECT angin_lokal FROM uji_isian WHERE isian_id = ?").bind(r.j.id).first()).angin_lokal, "kencang");
  r = await api("POST", `/api/instansi/kabar/${t}`, KABAR(null, {luas_ha: 60, uji: {tutupan: "hutan", metode_luas: "jalan_keliling"}}), COOKIE); assert.equal(r.s, 201, r.t);
  assert.equal((await DB.prepare("SELECT metode_luas FROM uji_isian WHERE isian_id = ?").bind(r.j.id).first()).metode_luas, "jalan_keliling");
  /* klien lama (tanpa `uji`) dengan luas: perilaku lama, 201, tanpa baris uji */
  r = await api("POST", `/api/instansi/kabar/${t}`, KABAR(null, {luas_ha: 70}), COOKIE); assert.equal(r.s, 201, r.t); assert.equal(await n("uji_isian", `isian_id = '${r.j.id}'`), 0);
  await DB.prepare("DELETE FROM instansi_media WHERE id = ?").bind(k0).run();
  /* tanpa sesi: 401, tidak membocorkan validasi */
  assert.equal((await api("POST", `/api/instansi/kabar/${t}`, KABAR(null, {uji: {tutupan: "x"}}))).s, 401);
});
uji("uji lapangan: cek ulang menerima bekas terbakar baru; 503 bila migrasi 0055 belum diterapkan (tanpa uji tetap jalan)", async () => {
  const t = await tugasBaru({status: "padam", konfirmasi_pada: Date.now() - 30 * JAM, padam_verif: "padam_dilaporkan", padam_pada: Date.now() - 26 * JAM});
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, akurasi, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, status_api) VALUES (?, ?, ?, 'awal-uji-01', 'konfirmasi', ?, -2.55, 112, 10, ?, 'api_ada', 'A B', 'Kades', '6281211112222', 'padam')")
    .bind(hex16(), t, AKUN, Date.now() - 30 * JAM, Date.now() - 30 * JAM).run();
  let m = await mediaBaru(t), r = await api("POST", `/api/instansi/cekulang/${t}`, {klien_id: "cek-uji-0003", media: [m], uji: {bekas_terbakar_baru: "mungkin"}}, COOKIE);
  assert.equal(r.s, 400, r.t); assert.match(r.j.galat, /bekas_terbakar_baru/);
  r = await api("POST", `/api/instansi/cekulang/${t}`, {klien_id: "cek-uji-0001", media: [m], uji: {bekas_terbakar_baru: "ya", tutupan: "gambut"}}, COOKIE);
  assert.equal(r.s, 201, r.t); assert.equal((await DB.prepare("SELECT bekas_terbakar_baru FROM uji_isian WHERE isian_id = ?").bind(r.j.id).first()).bekas_terbakar_baru, "ya");
  /* migrasi belum jalan: kiriman yang membawa `uji` ditolak 503 (bukan membuang medannya diam-diam); kiriman tanpa uji tetap diterima */
  const t2 = await tugasBaru(), sql0 = readFileSync(path.join(AKAR, "migrations/0055_uji_lapangan.sql"), "utf8");
  await sql("DROP TABLE uji_isian");
  try {
    m = await mediaBaru(t2); r = await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF(m, {luas_ha: 5, uji: {tutupan: "hutan", metode_luas: "drone"}}), COOKIE); assert.equal(r.s, 503, r.t); assert.match(r.j.galat, /0055/);
    assert.equal(await n("tugas_isian", `tugas_id = '${t2}'`), 0, "ditolak sebelum menulis apa pun");
    r = await api("POST", `/api/instansi/konfirmasi/${t2}`, KONF(m, {luas_ha: 5}), COOKIE); assert.equal(r.s, 201, r.t);
    assert.equal((await api("GET", "/api/uji-lapangan")).s, 503, "API: uji lapangan belum aktif");
    await cron(BASE + 7 * HARI);   // cron tidak jatuh walau tabel hilang
  } finally { for (const s of pecah(sql0)) await DB.prepare(s).run(); }
  assert.equal(await n("uji_isian"), 0, "tabel dibangun ulang kosong");
});

/* ================================================================ tugas otomatis + sampel kontrol (cron) */
uji("uji lapangan: tugas otomatis baru mencatat strata 'tugas' (level, firespot, luas platform, peluang prospektif)", async () => {
  await sql("DELETE FROM tugas_api", "DELETE FROM tugas_meta");
  const dibuat = new Date(BASE - JAM).toISOString();
  TUGAS = {dibuat, kompleks: [
    {id: "K0001", lat: -2.55, lon: 112.0, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 3, n24: 9, jam_sejak: 2, luas: 120, firespot: "ya", p_lolos: 0.42, otomatis: true, konsesi: []},
    {id: "K0002", lat: -1.9, lon: 113.4, prov: "62", kab: "Katingan", kec: "Kamipang", level: 2, n24: 5, jam_sejak: 3, luas: 33, firespot: "mungkin", otomatis: true, syarat: ["permukiman"], jenis: "verifikasi", konsesi: []},
    {id: "K0003", lat: -2.0, lon: 113.9, prov: "62", kab: "Katingan", kec: "Kamipang", level: 3, n24: 4, jam_sejak: 3, luas: 20, firespot: "bukan-kelas", p_lolos: 7, otomatis: true, konsesi: []}]};
  KANDIDAT = null; await cron(BASE);
  const U = (await DB.prepare("SELECT u.*, t.lat FROM uji_tugas u JOIN tugas_api t ON t.id = u.tugas_id ORDER BY u.luas_platform_ha DESC").all()).results;
  assert.equal(U.length, 3); assert.ok(U.every(x => x.sampel === "tugas" && x.minggu === null && x.prov === "62"));
  assert.deepEqual(U.map(x => [x.level, x.firespot, x.luas_platform_ha, x.p_lolos]), [[3, "ya", 120, 0.42], [2, "mungkin", 33, null], [3, null, 20, null]], "kelas firespot dan peluang di luar rentang dibuang, bukan dipaksakan");
  /* digabung ke tugas yang sudah ada: tidak membuat strata baru dan tidak menimpa potret awal */
  TUGAS = {...TUGAS, dibuat: new Date(BASE + 3 * HARI - JAM).toISOString(), kompleks: [{...TUGAS.kompleks[0], level: 3, luas: 900, firespot: "mungkin"}]};
  await cron(BASE + 3 * HARI - 2 * MENIT); assert.equal(await n("uji_tugas"), 3); assert.equal((await DB.prepare("SELECT luas_platform_ha FROM uji_tugas WHERE firespot = 'ya'").first()).luas_platform_ha, 120);
  TUGAS = null;
});
uji("uji lapangan: cron memilih sampel kontrol sekali per minggu per provinsi, sama dengan pilihKontrol, berlabel, dan tak membuat ulang", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM tugas_meta; DELETE FROM uji_sampel;");
  const kini = BASE + 14 * HARI, minggu = mingguISO(kini);
  const pool62 = Array.from({length: 12}, (_, i) => kand(i)), pool63 = Array.from({length: 7}, (_, i) => kand(100 + i, {prov: "63", kab: "Barito Utara", lat: -1.0 - i * 0.02, lon: 115 + i * 0.02, level: 0, firespot: null}));
  const tidak = [kand(200, {level: 3, firespot: null}), kand(201, {akses: {kaki_km: 9}}), kand(202, {jam_sejak: 30}), kand(203, {otomatis: true}), kand(204, {prov: "64", akses: {kaki_km: 8}})];
  KANDIDAT = {dibuat: new Date(kini - JAM).toISOString(), kompleks: [...pool62, ...pool63, ...tidak]};
  const harapan62 = pilihKontrol(pool62, minggu, "62").dipilih.map(kunciKandidat).sort(), harapan63 = pilihKontrol(pool63, minggu, "63");
  await cron(kini);
  const T = (await DB.prepare("SELECT t.lat, t.lon, t.prov, t.level, t.kab, t.status, u.sampel, u.minggu, u.firespot, u.luas_platform_ha FROM uji_tugas u JOIN tugas_api t ON t.id = u.tugas_id").all()).results;
  assert.equal(T.length, 10, "5 per provinsi; provinsi 64 tanpa kandidat sah tidak dapat sampel"); assert.ok(T.every(x => x.sampel === "kontrol" && x.minggu === minggu && x.status === "buka"));
  const kunci = x => `${x.lat.toFixed(4)},${x.lon.toFixed(4)}`;
  assert.deepEqual(T.filter(x => x.prov === "62").map(kunci).sort(), harapan62, "tepat hasil pilihKontrol (benih minggu + provinsi)"); assert.deepEqual(T.filter(x => x.prov === "63").map(kunci).sort(), harapan63.dipilih.map(kunciKandidat).sort());
  const S = (await DB.prepare("SELECT * FROM uji_sampel ORDER BY prov").all()).results;
  assert.deepEqual(S.map(s => [s.minggu, s.prov, s.benih, s.n_kandidat, s.n_dipilih]), [[minggu, "62", `${minggu}|62`, 12, 5], [minggu, "63", `${minggu}|63`, 7, 5]]);
  assert.equal(await n("tugas_kartu", "json_extract(kartu, '$.jenis') = 'verifikasi'"), 10, "tugas kontrol berjenis verifikasi (cek lapangan)");
  /* cron lagi (jam berikutnya, minggu sama): tidak membuat tugas baru */
  await cron(kini + JAM); await cron(kini + 2 * JAM); assert.equal(await n("uji_tugas"), 10); assert.equal(await n("uji_sampel"), 2);
  /* berkas kandidat versi baru, minggu sama, provinsi sama: sudah diklaim, tidak diundi ulang */
  KANDIDAT = {dibuat: new Date(kini + 2 * JAM).toISOString(), kompleks: [...pool62.slice(0, 3), kand(300), kand(301)]}; await cron(kini + 3 * JAM); assert.equal(await n("uji_tugas"), 10);
  /* label di layar akun: judul, arahan, dan penanda; tugas otomatis tidak berlabel */
  const t = await api("GET", "/api/instansi/tugas", undefined, COOKIE); assert.equal(t.s, 200, t.t);
  const kontrol = t.j.tugas.filter(x => x.uji === "kontrol"); assert.equal(kontrol.length, 5, "akun Kalteng (62) melihat 5 sampel provinsinya, bukan provinsi 63");
  for (const x of kontrol) { assert.equal(x.judul, "Sampel uji (bukan api prioritas)"); assert.match(x.arahan, /bukan karena api prioritas/); assert.equal(x.kartu.uji, "kontrol"); }
  const rin = await api("GET", `/api/instansi/tugas/${(await DB.prepare("SELECT t.id FROM tugas_api t JOIN uji_tugas u ON u.tugas_id = t.id WHERE t.prov = '62' LIMIT 1").first()).id}`, undefined, COOKIE); assert.equal(rin.j.tugas.judul, "Sampel uji (bukan api prioritas)");
  /* bergeser ke minggu berikutnya: undian baru dengan benih baru */
  const kini2 = kini + 7 * HARI, poolB = Array.from({length: 8}, (_, i) => kand(50 + i, {lat: -1.0 - i * 0.1, lon: 111 + i * 0.1}));   // berjauhan: tidak dekat tugas minggu lalu
  KANDIDAT = {dibuat: new Date(kini2 - JAM).toISOString(), kompleks: poolB}; await cron(kini2);
  assert.equal(await n("uji_sampel", "prov = '62'"), 2); assert.equal(await n("uji_tugas", `minggu = '${mingguISO(kini2)}'`), 5);
  assert.equal(await n("uji_sampel", `benih = '${mingguISO(kini2)}|62'`), 1);
});
uji("uji lapangan: kandidat dekat tugas terbuka tidak ikut kolam; kontrol tak dikunjungi dibuang setelah 3 hari dan dicatat; yang dikunjungi tetap", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM tugas_meta; DELETE FROM uji_sampel;");
  const kini = BASE + 28 * HARI, minggu = mingguISO(kini), dekat = await tugasBaru({prov: "62", kab: "Seruyan", lat: -2.0, lon: 112.0, dibuat: kini - HARI});
  const pool = [kand(0, {lat: -2.0, lon: 112.0 + 0.009}), ...Array.from({length: 6}, (_, i) => kand(i + 1, {lat: -2.5 - i * 0.05, lon: 112.5}))];   // kandidat 0 berjarak ~1 km dari tugas terbuka
  KANDIDAT = {dibuat: new Date(kini - JAM).toISOString(), kompleks: pool}; await cron(kini);
  const S = await DB.prepare("SELECT * FROM uji_sampel").first(); assert.equal(S.n_kandidat, 6, "kandidat 0 menyatu dengan tugas terbuka (bukan tugas baru)"); assert.equal(S.n_dipilih, 5);
  assert.equal(await n("uji_tugas", "sampel = 'kontrol'"), 5); void dekat;
  const U = (await DB.prepare("SELECT tugas_id FROM uji_tugas ORDER BY tugas_id").all()).results.map(x => x.tugas_id), dikunjungi = U[0];
  await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = ?, status = 'bukan_api' WHERE id = ?").bind(kini + HARI, dikunjungi).run();
  await DB.prepare("UPDATE uji_tugas SET sampel = sampel WHERE tugas_id = ?").bind(dikunjungi).run();
  /* 2 hari kemudian: belum kedaluwarsa */
  await cron(kini + 2 * HARI); assert.equal(await n("uji_tugas", "sampel = 'kontrol'"), 5);
  /* 3 hari lebih: 4 tak dikunjungi dibuang, satu yang dikunjungi tetap; hitungan tercatat */
  await cron(kini + 3 * HARI + JAM); const sisa = await n("uji_tugas", "sampel = 'kontrol'");
  assert.equal(sisa, 1, "hanya yang dikunjungi bertahan"); assert.equal((await DB.prepare("SELECT n_tak_dikunjungi FROM uji_sampel WHERE minggu = ?").bind(minggu).first()).n_tak_dikunjungi, 4);
  assert.equal(await n("tugas_api", `id = '${dikunjungi}'`), 1); await DB.exec("DELETE FROM tugas_api; DELETE FROM uji_sampel;"); KANDIDAT = null;
});
uji("uji lapangan: kolam kontrol menahan KOLAM_TAHAN_HARI (14) apa pun alasan bukan api (pembuat tugas melepas alasan sesaat sesudah 3 hari); catatan dan rincian Q1 menyebut tanggal aturan", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM tugas_meta; DELETE FROM uji_sampel;");
  assert.equal(KOLAM_TAHAN_HARI, 14);
  const kini = BASE + 56 * HARI;
  const bukanApi = async (lat, umurHari, alasan) => {
    const id = await tugasBaru({prov: "62", kab: "Seruyan", lat, lon: 112.0, dibuat: kini - (umurHari + 1) * HARI, status: "bukan_api", konfirmasi_pada: kini - umurHari * HARI}), iid = hex16();
    await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, hasil, pic_nama, pic_jabatan, pic_wa, lat, lon, waktu_gps, dibuat) VALUES (?, ?, ?, ?, 'konfirmasi', 'bukan_api', 'Budi', 'Kepala BPBD', '6281234567890', ?5, 112.0, ?6, ?6)")
      .bind(iid, id, AKUN, `klien-kolam-${iid}`, lat, kini - umurHari * HARI).run();
    if (alasan) await DB.prepare("INSERT INTO isian_lapangan (isian_id, alasan_bukan_api) VALUES (?, ?)").bind(iid, alasan).run();
  };
  /* tiap bukan api berjarak > 20 km dari yang lain; kandidat dekatnya ~1 km ke timur */
  const kasus = [[-2.0, 5, "tidak_ada_bekas"], [-2.2, 5, "bekas_lama"], [-2.4, 10, null], [-2.6, 13, "tidak_ada_bekas"], [-2.8, 15, null], [-3.0, 15, "bekas_lama"]];
  for (const [lat, umur, alasan] of kasus) await bukanApi(lat, umur, alasan);
  const pool = [...kasus.map(([lat], i) => kand(i, {lat, lon: 112.0 + 0.009})), ...Array.from({length: 6}, (_, i) => kand(i + 10, {lat: -2.5 - i * 0.05, lon: 112.5}))];
  KANDIDAT = {dibuat: new Date(kini - JAM).toISOString(), kompleks: pool}; await cron(kini);
  assert.equal((await DB.prepare("SELECT n_kandidat FROM uji_sampel").first()).n_kandidat, 8, "6 jauh + 2 dekat bukan api 15 hari; yang 5, 10, dan 13 hari tetap keluar kolam walau alasannya sesaat");
  const tanpa = await api("GET", "/api/uji-lapangan"); assert.equal(tanpa.s, 200, tanpa.t);
  assert.ok(!tanpa.j.catatan.some(c => /^Sejak /.test(c)), "tanpa penanda 0062 tidak ada catatan aturan"); assert.equal(tanpa.j.pertanyaan[0].rincian.aturan_tahan, undefined);
  /* penanda 6 hari lalu: dua kunjungan (umur 5) sesudahnya; tambah lima kunjungan level 3 lagi supaya hitungannya lolos penahan sel kecil */
  const sejak = new Date(kini - 6 * HARI).toISOString();
  await DB.prepare("INSERT INTO tugas_meta (kunci, nilai) VALUES ('tahan_bukan_api_sejak', ?)").bind(sejak).run();
  for (let i = 0; i < 5; i++) await bukanApi(-4.0 - i * 0.3, 1, null);
  const ada = await api("GET", "/api/uji-lapangan");
  assert.ok(ada.j.catatan.some(c => /^Sejak \d+ \S+ \d{4}, .*menahan lokasinya 3 hari, bukan 14.*Alasan diisi regu tanpa verifikasi.*Kolam sampel kontrol tetap menahan 14 hari/.test(c)), JSON.stringify(ada.j.catatan));
  assert.deepEqual(ada.j.pertanyaan[0].rincian.aturan_tahan, {sejak, n_sesudah: 7}, "2 kunjungan umur 5 hari + 5 umur 1 hari; yang 10-15 hari sebelum penanda");
  await DB.prepare("UPDATE tugas_meta SET nilai = ? WHERE kunci = 'tahan_bukan_api_sejak'").bind(new Date(Date.now() - 181 * HARI).toISOString()).run();
  assert.ok(!(await api("GET", "/api/uji-lapangan")).j.catatan.some(c => /^Sejak /.test(c)), "lewat retensi 180 hari: catatan hilang");
  await DB.exec("DELETE FROM tugas_api; DELETE FROM tugas_meta; DELETE FROM uji_sampel;"); KANDIDAT = null;
});

/* ================================================================ Q2: api terlewat */
uji("uji lapangan: Q2 menilai laporan regu menyala/bara terhadap tugas dan titik FIRMS (-3 jam .. +24 jam, 2 km); yang tak tercakup tidak dihitung", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM uji_terlewat; DELETE FROM lapangan; DELETE FROM titik_terbaru; DELETE FROM regu;");
  const kini = BASE, T = kini - 25 * JAM, regu = hex16();
  await DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES (?, 'Regu Uji', 'BPBD', '62', 'Seruyan', ?, ?)").bind(regu, "c".repeat(64), T).run();
  const lap = async (lat, lon, waktu, status = "menyala", curiga = null) => {
    const id = hex16();
    await DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, akurasi, status, prov, kab, gps_curiga) VALUES (?, ?, ?, '2026-10-20', ?, ?, ?, ?, 10, ?, '62', 'Seruyan', ?)").bind(id, regu, "kl-" + id, waktu, waktu, lat, lon, status, curiga).run(); return id;
  };
  const acuan = new Date(T + 24.5 * JAM).toISOString();
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(T + 24.5 * JAM, JSON.stringify({acuan, baris: [[-2.5, 112.0, -10, "N", 20, 1], [-1.0, 114.0, -2, "N", 20, 1]]})).run();
  const terdeteksi = await lap(-2.505, 112.005, T), terlewat = await lap(-2.7, 112.3, T + 10 * MENIT), tertaut = await lap(-1.9, 113.4, T + 20 * MENIT), curiga = await lap(-2.8, 112.4, T, "menyala", "GPS curiga"), padam = await lap(-2.9, 112.4, T, "padam");
  const lama = await lap(-2.6, 112.1, T - 5 * JAM), baru = await lap(-2.55, 112.0, kini - 2 * JAM);
  const tugas = await tugasBaru({lat: -1.9, lon: 113.4}); await DB.prepare("INSERT INTO tugas_lapangan (tugas_id, lapangan_id, jarak_km, status, dibuat) VALUES (?, ?, 0.5, 'menyala', ?)").bind(tugas, tertaut, T).run();
  await cron(kini);
  const H = Object.fromEntries((await DB.prepare("SELECT lapangan_id, hasil FROM uji_terlewat").all()).results.map(x => [x.lapangan_id, x.hasil]));
  assert.equal(H[terdeteksi], "terdeteksi", "titik FIRMS 0,7 km, 10 jam sebelum acuan = dalam jendela"); assert.equal(H[terlewat], "terlewat", "tanpa tugas dan tanpa titik dalam 2 km"); assert.equal(H[tertaut], "terdeteksi", "punya tugas api dalam 2 km");
  assert.equal(H[lama], "tak_dinilai", "putaran terlalu jauh dari batas jendela: tidak dihitung"); assert.ok(!(curiga in H) && !(padam in H), "GPS curiga dan status padam tidak dinilai"); assert.ok(!(baru in H), "belum 24 jam: ditunda");
  assert.equal(Object.keys(H).length, 4);
  await cron(kini + JAM); assert.equal(await n("uji_terlewat"), 4, "idempoten: tidak dinilai dua kali");
  await DB.exec("DELETE FROM tugas_api; DELETE FROM lapangan; DELETE FROM titik_terbaru; DELETE FROM regu;");
});

/* ================================================================ GET /api/uji-lapangan */
const SEED = {pic: "Rahasia Pelapor", wa: "6281299990000", lat: -2.5512345, lon: 112.0198765};
let seedUrut = 0;
/* satu tugas + satu isian konfirmasi (+ medan uji) langsung ke D1, mewakili kunjungan lapangan */
const seed = async (o = {}) => {
  const id = hex16(), iid = hex16(), kini = o.waktu ?? Date.now() - 10 * HARI, dummy = o.dummy ?? 0;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, padam_verif, padam_pada, dummy) VALUES (?, ?, 'seruyan', ?, ?, ?, 5, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.prov ?? "62", SEED.lat, SEED.lon, o.level ?? 3, o.luasPlatform ?? null, kini, kini, o.status ?? "buka", kini + 1, o.padam_verif ?? null, o.padam_pada ?? null, dummy).run();
  if (o.sampel) await DB.prepare("INSERT INTO uji_tugas (tugas_id, sampel, level, firespot, prov, luas_platform_ha, p_lolos, minggu, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, o.sampel, o.level ?? 3, o.firespot ?? null, o.prov ?? "62", o.luasPlatform ?? null, o.p ?? null, o.sampel === "kontrol" ? (o.minggu ?? "2026-W40") : null, kini).run();
  if (o.hasil !== null) {
    await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, akurasi, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, luas_ha, dummy) VALUES (?, ?, ?, ?, 'konfirmasi', ?, ?, ?, 10, ?, ?, ?, 'Kades', ?, ?, ?)")
      .bind(iid, id, AKUN, `seed-${++seedUrut}-${Date.now()}`, kini + 1, SEED.lat, SEED.lon, kini, o.hasil ?? "api_ada", SEED.pic, SEED.wa, o.luas ?? null, dummy).run();
    if (o.metode || o.bekas) await DB.prepare("INSERT INTO uji_isian (isian_id, tugas_id, dibuat, tutupan, metode_luas, bekas_terbakar_baru) VALUES (?, ?, ?, 'gambut', ?, ?)").bind(iid, id, kini, o.metode ?? null, o.bekas ?? null).run();
  }
  return id;
};
const tindak = (tugasId, dibuat, luas) => DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api, luas_ha) VALUES (?, ?, ?, ?, 'tindakan', ?, 'bara', ?)").bind(hex16(), tugasId, AKUN, `kabar-${++seedUrut}-${Date.now()}`, dibuat, luas).run();
const Q = (j, id) => j.pertanyaan.find(q => q.id === id);
uji("uji lapangan: GET /api/uji-lapangan tanpa data: kelima pertanyaan belum_cukup_data, ambang beku ikut dalam jawaban", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM uji_terlewat; DELETE FROM uji_sampel;");
  const r = await api("GET", "/api/uji-lapangan"); assert.equal(r.s, 200, r.t); assert.equal(r.h.get("cache-control"), "private, max-age=60"); assert.match(r.h.get("vary"), /cookie/i);
  assert.deepEqual(r.j.pertanyaan.map(q => q.id), ["Q1", "Q2", "Q3", "Q4", "Q5"]);
  for (const q of r.j.pertanyaan) { assert.equal(q.vonis, "belum_cukup_data", q.id); assert.equal(q.n, 0, q.id); assert.ok(q.judul && q.metrik && q.aturan && q.ambang && q.n_min >= 30, q.id); }
  assert.deepEqual(r.j.praregistrasi, JSON.parse(JSON.stringify(PRAREGISTRASI))); assert.equal(r.j.versi, "uji-lapangan/1"); assert.ok(r.j.catatan.length >= 4); assert.ok(Math.abs(r.j.diperbarui - Date.now()) < 60e3);
  assert.deepEqual(r.j.kontrol, {minggu_provinsi_tercatat: 0, dipilih: 0, tak_dikunjungi: 0, kandidat: 0, dikunjungi: 0});
});
uji("uji lapangan: API menghitung Q1-Q5 dari data sintetis di D1 (kontrol ditimbang, taksiran dan dummy tidak dihitung)", async () => {
  await DB.exec("DELETE FROM tugas_api; DELETE FROM uji_terlewat; DELETE FROM uji_sampel;");
  /* Q1: 50 kunjungan level >= 2: 41 api (26 + 14 api_ada, 1 bekas terbakar baru) = 0,82; tugas lama tanpa baris uji_tugas jatuh ke level tugas_api */
  for (let i = 0; i < 30; i++) await seed({level: 3, sampel: "tugas", firespot: "ya", hasil: i < 26 ? "api_ada" : "bukan_api"});
  for (let i = 0; i < 18; i++) await seed({level: 2, hasil: i < 14 ? "api_ada" : "bukan_api"});
  await seed({level: 3, hasil: "sudah_padam", bekas: "ya"}); await seed({level: 3, hasil: "sudah_padam", bekas: "tidak"});   // bekas terbakar baru = positif
  await seed({level: 3, dummy: 1, hasil: "bukan_api"}); await seed({level: 3, hasil: null});   // dummy dan tugas tanpa kunjungan tidak dihitung
  /* sampel kontrol: minggu W40 provinsi 62: 20 kandidat, 5 dipilih (bobot 4); 5 dikunjungi, 1 api; level 1 dan 0 */
  await DB.prepare("INSERT INTO uji_sampel (minggu, prov, benih, n_kandidat, n_dipilih, dibuat) VALUES ('2026-W40', '62', '2026-W40|62', 20, 5, ?)").bind(Date.now()).run();
  for (let i = 0; i < 5; i++) await seed({level: i < 3 ? 1 : 0, sampel: "kontrol", firespot: i < 3 ? "mungkin" : null, hasil: i === 0 ? "api_ada" : "bukan_api", minggu: "2026-W40"});
  let r = (await api("GET", "/api/uji-lapangan")).j, q1 = Q(r, "Q1");
  assert.equal(q1.n, 50); assert.equal(q1.nilai, 0.82); assert.equal(q1.vonis, "lolos"); assert.ok(q1.selang[0] > 0.65 && q1.selang[0] < 0.82 && q1.batas_bawah === q1.selang[0]);
  const lv = Object.fromEntries(q1.rincian.per_level.map(x => [x.level, x]));
  assert.equal(lv[3].n, 32); assert.equal(lv[2].n, 18);
  for (const l of [1, 0]) { assert.equal(lv[l].ditahan, true, "level " + l + ": n < 5 ditahan"); assert.deepEqual([lv[l].n, lv[l].ya, lv[l].nilai, lv[l].selang], [null, null, null, null]); }
  const fs = Object.fromEntries(q1.rincian.per_firespot.map(x => [x.firespot, x])); assert.equal(fs.ya.n, 30); assert.equal(fs.mungkin.ditahan, true); assert.equal(fs.mungkin.n, null);
  const st = Object.fromEntries(q1.rincian.per_sampel.map(x => [x.sampel, x])); assert.equal(st.kontrol.n, 5); assert.equal(st.kontrol.ya, 1); assert.equal(st.tugas.n, 50);
  assert.equal(r.kontrol.dipilih, 5); assert.equal(r.kontrol.kandidat, 20); assert.equal(r.kontrol.dikunjungi, 5);
  /* Q4: 30 kejadian terukur, rasio lapangan/platform 0,9 -> lolos; taksiran dan platform 0 tidak ikut; hanya isian PERTAMA yang terukur per tugas */
  for (let i = 0; i < 30; i++) await seed({sampel: "tugas", luasPlatform: 100, luas: 90, metode: i % 3 === 0 ? "drone" : i % 3 === 1 ? "keliling_gps" : "jalan_keliling"});
  for (let i = 0; i < 6; i++) await seed({sampel: "tugas", luasPlatform: 100, luas: 400, metode: "taksiran"});
  await seed({sampel: "tugas", luasPlatform: 0, luas: 10, metode: "drone"});
  r = (await api("GET", "/api/uji-lapangan")).j; let q4 = Q(r, "Q4");
  assert.equal(q4.n, 30); assert.equal(q4.nilai, 0.9); assert.equal(q4.vonis, "lolos"); assert.equal(q4.rincian.taksiran_tidak_dihitung, 6); assert.equal(q4.mape, bulatan(10 / 90));
  /* Q3: 30 tugas dengan peluang prospektif; luas kunjungan pertama dan kabar >= 72 jam; hasil lolos (>= 140 ha) sesuai peluang tinggi */
  for (let i = 0; i < 30; i++) {
    const lolosnya = i < 9, t = await seed({sampel: "tugas", level: 3, luasPlatform: 50, p: lolosnya ? 0.8 : 0.05, hasil: "api_ada", luas: 60, metode: "drone"});
    const t0 = (await DB.prepare("SELECT dibuat FROM tugas_isian WHERE tugas_id = ?").bind(t).first()).dibuat;
    await tindak(t, t0 + 30 * JAM, 80);   // < 72 jam: bukan pasangan akhir
    await tindak(t, t0 + 75 * JAM, lolosnya ? 300 : 90);
  }
  r = (await api("GET", "/api/uji-lapangan")).j; const q3 = Q(r, "Q3");
  assert.equal(q3.n, 30); assert.equal(q3.vonis, "lolos"); assert.ok(q3.nilai > 0.8, String(q3.nilai)); assert.equal(q3.rincian.frekuensi_lolos, 0.3);
  /* kini 60 kejadian Q4 terukur */
  assert.equal(Q(r, "Q4").n, 60, "30 awal + 30 pasangan Q3 (metode drone)");
  /* Q5: 33 tugas dengan jendela 7 hari selesai: 30 padam_terverifikasi tanpa muncul, 3 salah (muncul_lagi atau muncul <= 7 hari); yang baru (jendela belum selesai) tidak dihitung */
  const lalu = Date.now() - 20 * HARI;
  for (let i = 0; i < 30; i++) await seed({hasil: null, status: "padam", padam_verif: "padam_terverifikasi", padam_pada: lalu});
  await seed({hasil: null, status: "buka", padam_verif: "muncul_lagi", padam_pada: lalu});
  const m1 = await seed({hasil: null, status: "padam", padam_verif: "padam_terverifikasi", padam_pada: lalu}), m2 = await seed({hasil: null, status: "padam", padam_verif: "padam_terverifikasi", padam_pada: lalu});
  for (const [t, jarak] of [[m1, 2 * HARI], [m2, 6 * HARI]]) await DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, ?, 'firms')").bind(t, lalu + jarak).run();
  const m3 = await seed({hasil: null, status: "padam", padam_verif: "padam_terverifikasi", padam_pada: lalu}); await DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber) VALUES (?, ?, 'regu')").bind(m3, lalu + 9 * HARI).run();   // di luar 7 hari: tidak menggagalkan
  await seed({hasil: null, status: "padam", padam_verif: "padam_terverifikasi", padam_pada: Date.now() - 2 * HARI});   // jendela belum selesai
  r = (await api("GET", "/api/uji-lapangan")).j; const q5 = Q(r, "Q5");
  assert.equal(q5.benar, 31); assert.equal(q5.salah, 3); assert.equal(q5.n, 34); assert.equal(q5.nilai, bulatan(31 / 34)); assert.equal(q5.vonis, "lolos");
  /* Q2 deskriptif dari uji_terlewat */
  assert.equal(Q(r, "Q2").vonis, "belum_cukup_data");
  const rows = [...Array.from({length: 20}, (_, i) => ["terdeteksi", i]), ...Array.from({length: 11}, (_, i) => ["terlewat", i]), ["tak_dinilai", 0], ["tak_dinilai", 1]];
  for (const [h, i] of rows) await DB.prepare("INSERT INTO uji_terlewat (lapangan_id, waktu, prov, status, hasil, dinilai) VALUES (?, ?, '62', 'menyala', ?, ?)").bind(hex16(), Date.now() - 5 * HARI - i, h, Date.now()).run();
  r = (await api("GET", "/api/uji-lapangan")).j; const q2 = Q(r, "Q2");
  assert.equal(q2.n, 31); assert.equal(q2.terlewat, 11); assert.equal(q2.nilai, bulatan(11 / 31)); assert.equal(q2.pod, bulatan(20 / 31)); assert.equal(q2.vonis, null); assert.equal(q2.deskriptif, true); assert.equal(q2.rincian.tak_dinilai_tidak_dihitung, null, "2 < 5: ditahan");
  /* gagal: tambahkan 40 kunjungan level 3 yang semuanya bukan api -> presisi turun di bawah 0,80 */
  for (let i = 0; i < 40; i++) await seed({level: 3, sampel: "tugas", hasil: "bukan_api"});
  r = (await api("GET", "/api/uji-lapangan")).j; assert.equal(Q(r, "Q1").vonis, "gagal"); assert.ok(Q(r, "Q1").nilai < 0.8);
});
uji("uji lapangan: API tidak membocorkan PIC, WhatsApp, nama, atau koordinat; kunci JSON aman; di centurisk97.id wajib masuk", async () => {
  const r = await api("GET", "/api/uji-lapangan"); assert.equal(r.s, 200);
  for (const rahasia of [SEED.pic, SEED.wa, "Kades", "Budi Santoso", "198001012005011001", "pemprovkalteng", "81299990000", String(SEED.lat), String(SEED.lon), "-2.55", "112.019", "seed-"]) assert.ok(!r.t.includes(rahasia), `bocor: ${rahasia}`);
  const kunci = []; (function jalan(x) { if (Array.isArray(x)) x.forEach(jalan); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { kunci.push(k); jalan(v); } })(r.j);
  assert.deepEqual(kunci.filter(k => /(^|_)(lat|lon|lng|koordinat|wa|pic|nama|nip|username|akun|email|telepon|ip)(_|$)/i.test(k)), [], "tidak ada kunci yang menunjuk orang atau titik");
  assert.deepEqual([...r.t.matchAll(/-?\d+\.\d{4,}/g)].map(m => m[0]), [], "tidak ada angka berpresisi koordinat (>= 4 desimal) di jawaban");
  /* gerbang situs terkunci */
  /* admin ATAU pemirsa di SEMUA host (evaluasi internal): tamu dan token salah ditolak di host terkunci maupun workers.dev */
  for (const host of ["centurisk97.id", "pantau.lokal"]) {
    const tamu = await api("GET", "/api/uji-lapangan", undefined, {"x-admin-token": ""}, host); assert.equal(tamu.s, 403, host); assert.ok(!tamu.t.includes("pertanyaan"));
    assert.equal((await api("GET", "/api/uji-lapangan", undefined, {"x-admin-token": "salah-salah"}, host)).s, 403, host);
    const ok = await api("GET", "/api/uji-lapangan", undefined, ADMIN, host); assert.equal(ok.s, 200, host); assert.equal(ok.h.get("cache-control"), "private, max-age=60"); assert.match(ok.h.get("vary"), /cookie/i);
  }
  /* pemirsa: sesi sah membaca API dan halaman (tidak dialihkan ke tab pertamanya); sesi dicabut ditolak */
  const pid = hex16(), tok = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
  await DB.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES (?, 'pemirsauji', 'Pemirsa Uji', '[\"peta\"]', ?, ?, ?)").bind(pid, "a".repeat(32), "b".repeat(64), Date.now()).run();
  await DB.prepare("INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(tok), pid, Date.now(), Date.now() + HARI).run();
  const kue = {cookie: `sesi_pemirsa=${tok}`, "x-admin-token": ""};
  for (const host of ["centurisk97.id", "pantau.lokal"]) {
    assert.equal((await api("GET", "/api/uji-lapangan", undefined, kue, host)).s, 200, "pemirsa API " + host);
    const hal = await api("GET", "/uji-lapangan", undefined, kue, host); assert.equal(hal.s, 200, "pemirsa halaman " + host); assert.match(hal.t, /A\. Protokol/); assert.match(hal.h.get("cache-control"), /private, no-store/);
  }
  await DB.prepare("DELETE FROM pemirsa_sesi").run(); assert.equal((await api("GET", "/api/uji-lapangan", undefined, kue)).s, 403, "sesi dicabut");
  /* izin diperiksa SEBELUM cache dan laju: tamu tak menyentuh penghitung laju; admin dari satu IP kena 429 sesudah 20 per menit */
  const lajuAwal = await n("laju_bnpb", "aksi = 'uji.baca'");
  for (let i = 0; i < 3; i++) await api("GET", "/api/uji-lapangan", undefined, {"x-admin-token": ""}); assert.equal(await n("laju_bnpb", "aksi = 'uji.baca'"), lajuAwal, "tamu ditolak sebelum laju");
  const sama = {...ADMIN, "cf-connecting-ip": "198.51.100.77"}; let terakhir;
  for (let i = 0; i < 21; i++) terakhir = await mf.dispatchFetch("http://pantau.lokal/api/uji-lapangan", {headers: sama});
  assert.equal(terakhir.status, 429, "21 permintaan per menit dari satu IP"); await terakhir.text();
  assert.equal((await api("POST", "/api/uji-lapangan", {})).s, 405, "hanya GET");
});
uji("uji lapangan: halaman /uji-lapangan dilayani (protokol, hasil, catatan jujur), terkunci di centurisk97.id, berkas .html langsung dialihkan", async () => {
  const h = await api("GET", "/uji-lapangan", undefined, ADMIN); assert.equal(h.s, 200); assert.match(h.t, /A\. Protokol/); assert.match(h.t, /B\. Hasil/); assert.match(h.t, /C\. Catatan jujur/);
  for (const kata of ["24 jam", "H\\+1", "H\\+3", "H\\+7", "gambut", "keliling GPS", "taksiran", "drone", "Foto 4 arah", "Keselamatan", "Sampel uji \\(bukan api prioritas\\)", "bias|Karena itu ada sampel kontrol"]) assert.match(h.t, new RegExp(kata, "i"), kata);
  assert.doesNotMatch(h.t, /<script(?![^>]*\bsrc=)/i, "tanpa skrip inline"); assert.doesNotMatch(h.t, /\son[a-z]+=/i, "tanpa handler inline");
  assert.equal((await api("GET", "/uji-lapangan/", undefined, ADMIN)).s, 200);
  for (const host of ["centurisk97.id", "pantau.lokal"]) { const kunci = await api("GET", "/uji-lapangan", undefined, {"x-admin-token": ""}, host); assert.equal(kunci.s, 303, host); assert.match(kunci.h.get("location"), /\/admin\/masuk/); }
  assert.equal((await api("GET", "/uji-lapangan", undefined, ADMIN, "centurisk97.id")).s, 200);
  const langsung = await api("GET", "/instansi_uji.html"); assert.equal(langsung.s, 303); assert.equal(langsung.h.get("location"), "/uji-lapangan");
  const js = readFileSync(path.join(AKAR, "public/instansi_uji_halaman.js"), "utf8"); assert.doesNotMatch(js, /innerHTML/, "data API ditulis dengan textContent");
  for (const f of ["public/instansi_uji.js", "public/instansi_uji_halaman.js"]) assert.doesNotMatch(readFileSync(path.join(AKAR, f), "utf8"), /\beval\(|new Function\(/);
});
