/* Operasi lapangan (src/operasi_lapangan.js, migrations/0042_operasi_lapangan.sql, L4-L13) di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock klien DB).
   Dibuktikan: auth (akun lain dan wilayah lain 404, tanpa x-pb 403, gerbang situs 401, staf lain wilayah 404), validasi, transisi status, panjang/luas garis pada angka tangan, pompa estafet pada angka tangan,
   hasil drop dengan titik FIRMS/Himawari fixture, linimasa urut, CSV drone/TMAT liar ditolak, dummy isi dan hapus bersih, migrasi 0042 idempoten.
   Jalankan: node --test tests/warga/operasi_lapangan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {JENIS_GARIS, JENIS_SUMBER, KONDISI_SUMBER, STATUS_PERIODE, PRIORITAS, ALASAN_PATROLI, STATUS_PATROLI, TRANSISI, hitungEstafet, susutBar100m, luasHa, panjangKm, douglasPeucker, uraiCsv, nilaiSatuDrop} from "../../src/operasi_lapangan.js";
import {BARANG} from "../../src/meja_spek.js";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM, PB = {"x-pb": "1"};
const uji = berantai();
const dekat = (a, b, tol, pesan) => assert.ok(Math.abs(a - b) <= tol, `${pesan ?? ""} ${a} bukan ${b} +- ${tol}`);
/* fixture aset: kompleks/kluster kecil buatan sendiri (deterministik); berkas lain dari public/ */
const FIX = {
  "/data/tugas_kompleks.json": {dibuat: new Date().toISOString(), kompleks: [{id: "K7000", lat: -2.9, lon: 112.9}, {id: "K7001", lat: -2.552, lon: 112.001, prov: "62", kab: "Kab Satu", kec: "Kec Uji", level: 3}, {id: "K7002", lat: -2.5, lon: 112.4}]},
  "/data/kluster_geo.json": {K7000: [null, []], K7001: [{type: "Polygon", coordinates: [[[111.995, -2.555], [112.01, -2.555], [112.01, -2.545], [111.995, -2.545], [111.995, -2.555]]]}, [[112.0, -2.55], [112.001, -2.551]]], K7002: [null, []]},
  "/data/kluster_awal.json": {type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [112.9, -2.9]}, properties: {id: "K7000", ws: 1, wd: 1}},
    {type: "Feature", geometry: {type: "Point", coordinates: [112.001, -2.552]}, properties: {id: "K7001", lat: -2.552, lon: 112.001, ws: 12.5, wd: 135, rh: 50}}, {type: "Feature", geometry: {type: "Point", coordinates: [112.4, -2.5]}, properties: {id: "K7002", ws: 3, wd: 3}}]},
  "/data/kanal.json": {sumber: "fixture", sel: 0.02, kolom: ["lat", "lon", "km"], grid: [[-2.6, 112.0, 3.1], [-2.31, 112.2, 1.4]]},
};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (FIX[p]) return Response.json(FIX[p]);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-ops", {r2: true, asetKu: aset});
const {mf, DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---- akun aktif lewat SQL (jalur verifikasi penuh diuji di instansi.test.mjs), masuk lewat rute sungguhan ---- */
const SANDI = "SandiUji23456789";
async function akun(username, {jenis = "pemkab", tingkat = "kab", prov = "62", kab = "Kab Satu", cakupan = ["62"], dummy = 0} = {}) {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, ?)`)
    .bind(id, username, jenis, tingkat, tingkat === "kab" ? `Pemerintah ${kab}` : `Provinsi ${prov}`, `uji|${username}`, JSON.stringify(cakupan), tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, garam, sha256(garam + SANDI), dummy).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  const cookie = r.h.get("set-cookie").split(",")[0].split(";")[0];
  return {id, h: {cookie, ...PB}, hg: {cookie}};
}
let nipN = 0;
const bikinStaf = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19800${++nipN}0012005`, unit: "Pusdalops BNPB", email: `s${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0], g = await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB}); assert.equal(g.s, 200, g.t);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const REK = {cara: [{metode: "Sekat kanal", alasan: "gambut"}], alat: ["Pompa portabel", "Selang 1,5 inci"]};
async function tugas(kab, {lat = -2.55, lon = 112.0, status = "buka", rekomendasi = REK, dummy = 0, dibuat = Date.now() - JAM, extra = {}} = {}) {
  const id = id16(), x = {konfirmasi_pada: dibuat, padam_verif: null, padam_pada: null, verif_pada: null, cek_ulang_pada: null, ...extra};
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, rekomendasi, padam_verif, padam_pada, verif_pada, cek_ulang_pada, dummy) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 10, 50, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, kab, lat, lon, dibuat, dibuat, status, x.konfirmasi_pada, dibuat, rekomendasi && JSON.stringify(rekomendasi), x.padam_verif, x.padam_pada, x.verif_pada, x.cek_ulang_pada, dummy).run();
  return id;
}
async function penugasan(akunId, tugasId, {nama = "Hendra", peran = "ketua_regu", orang = 4, dibuat = Date.now() - 2 * HARI, berangkat = null, tiba = null, selesai = null, status = "aktif"} = {}) {
  const id = id16();
  await DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, orang, token_sha, status, dibuat, kedaluwarsa, berangkat_pada, tiba_pada, selesai_pada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, tugasId, akunId, nama, peran, orang, sha256(id16() + id16()), status, dibuat, Date.now() + 2 * HARI, berangkat, tiba, selesai).run();
  return id;
}
const posisi = (pid, baris) => DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) SELECT ?, json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]') FROM json_each(?)").bind(pid, JSON.stringify(baris)).run();
const titikPanas = (acuan, baris) => DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(Date.now(), JSON.stringify({acuan: new Date(acuan).toISOString(), baris})).run();
const csvDrone = (baris, kepala = "lat,lon,suhu_c,waktu") => [kepala, ...baris.map(b => b.join(","))].join("\n");
const sekarangIso = () => new Date().toISOString();

let A, B, C, E, T1, T2, T3, P1, S1, S2, SKERING, H1, H2, L1, PER1;
const SQL = teks("migrations/0042_operasi_lapangan.sql");
const TABEL = ["ops_garis", "ops_sumber_air", "ops_periode", "ops_serah", "ops_permintaan", "ops_drop", "ops_jejak", "ops_pelajaran", "ops_patroli", "ops_kunjungan", "ops_drone_unggah", "ops_drone", "ops_tmat"];

uji("ops: migrasi 0042 idempoten, tabel lengkap, CHECK menahan data buruk, daftar tetap sama dengan kode", async () => {
  for (const s of pecah(SQL)) await DB.prepare(s).run();   // jalankan ulang: IF NOT EXISTS, tanpa galat
  for (const t of TABEL) assert.equal(await n(t), 0, t);
  const daftar = [...SQL.matchAll(/IN \(([^)]+)\)/g)].map(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const ada = (nama, isi) => assert.ok(daftar.some(d => d.length === isi.length && d.every((v, i) => v === isi[i])), `${nama} di 0042 harus persis ${JSON.stringify(isi)}`);
  ada("jenis garis", JENIS_GARIS); ada("jenis sumber", JENIS_SUMBER); ada("kondisi sumber", KONDISI_SUMBER); ada("status periode", STATUS_PERIODE); ada("prioritas", PRIORITAS); ada("alasan patroli", ALASAN_PATROLI); ada("status patroli", STATUS_PATROLI);
  const semuaStatus = [...new Set(Object.values(TRANSISI).flatMap(x => [...Object.keys(x), ...Object.values(x).flatMap(Object.keys)]))].sort();
  const sqlStatus = daftar.find(d => d.includes("dijadwalkan") && d.includes("dikirim")); assert.deepEqual([...sqlStatus].sort(), semuaStatus, "status permintaan = semua simpul TRANSISI");
  for (const t of TABEL) assert.match(SQL, new RegExp(`CREATE TABLE IF NOT EXISTS ${t} \\(`), t);
  assert.equal((SQL.match(/dummy INTEGER NOT NULL DEFAULT 0 CHECK \(dummy IN \(0, 1\)\)/g) || []).length, TABEL.length, "tiap tabel punya kolom dummy");
  assert.ok(BARANG.includes("air_mineral"), "daftar barang meja logistik");
  A = await akun("pemkabsatu"); B = await akun("pemkabdua", {kab: "Kab Dua"}); C = await akun("pemprovuji", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null}); E = await akun("pemkabtiga", {kab: "Kab Satu"});
  T1 = await tugas("Kab Satu"); T2 = await tugas("Kab Dua"); T3 = await tugas("Kab Satu", {lat: -2.3, lon: 112.2});
  const gar = o => DB.prepare("INSERT INTO ops_garis (id, tugas_id, jenis, koordinat, n_titik, panjang_km, tertutup, sumber, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, 0, 'kirim', 'uji', 1)")
    .bind(id16(), T1, o.jenis ?? "garis_api", o.koordinat ?? "[[112,-2],[112.1,-2]]", 2, 1);
  await assert.rejects(gar({jenis: "x"}).run(), /CHECK|constraint/i, "jenis garis tetap"); await assert.rejects(gar({koordinat: "[[112,-2]]"}).run(), /CHECK|constraint/i, "garis butuh 2 titik");
  await assert.rejects(gar({koordinat: "bukan json"}).run(), /CHECK|constraint|malformed/i);
  const sa = (j, k, lat = -2, lon = 112) => DB.prepare("INSERT INTO ops_sumber_air (id, prov, jenis, kondisi, lat, lon, oleh, dibuat, diubah) VALUES (?, '62', ?, ?, ?, ?, 'uji', 1, 1)").bind(id16(), j, k, lat, lon);
  await assert.rejects(sa("danau", "ada_air").run(), /CHECK|constraint/i); await assert.rejects(sa("sungai", "basah").run(), /CHECK|constraint/i); await assert.rejects(sa("sungai", "ada_air", 0, 0).run(), /CHECK|constraint/i, "titik 0,0");
  const pm = (jenis, status, ekstra = "") => DB.prepare(`INSERT INTO ops_permintaan (id, tugas_id, jenis, status, lat, lon, oleh, dibuat, diubah${ekstra ? ", barang, jumlah, satuan" : ""}) VALUES (?, ?, ?, ?, -2.5, 112, 'uji', 1, 1${ekstra ? ", 'beras', 1, 'kg'" : ""})`).bind(id16(), T1, jenis, status);
  await assert.rejects(pm("logistik", "diminta").run(), /CHECK|constraint/i, "logistik wajib barang"); await assert.rejects(pm("heli", "diterima").run(), /CHECK|constraint/i, "heli tidak punya status diterima");
  await assert.rejects(pm("logistik", "dijadwalkan", "x").run(), /CHECK|constraint/i, "logistik tidak punya status dijadwalkan");
  await assert.rejects(DB.prepare("INSERT INTO ops_periode (id, tugas_id, mulai, selesai, oleh, dibuat, diubah) VALUES (?, ?, 10, 10, 'uji', 1, 1)").bind(id16(), T1).run(), /CHECK|constraint/i, "selesai sesudah mulai");
  await assert.rejects(DB.prepare("INSERT INTO ops_tmat (stasiun, waktu, lat, lon, tmat_cm, sumber, diunggah, oleh) VALUES ('ST1', 1, -2, 112, 999, 'x1', 1, 'uji')").run(), /CHECK|constraint/i, "tmat_cm -500..300");
  await assert.rejects(DB.prepare("INSERT INTO ops_patroli (id, prov, kab, kec, alasan, jadwal, oleh, dibuat) VALUES (?, '62', 'Kab Satu', 'K', 'iseng', 1, 'uji', 1)").bind(id16()).run(), /CHECK|constraint/i, "alasan patroli tetap");
  await assert.rejects(DB.prepare("INSERT INTO ops_drop (id, permintaan_id, tugas_id, lat, lon, liter, pada, oleh, dibuat) VALUES (?, ?, ?, -2, 112, 0, 1, 'uji', 1)").bind(id16(), id16(), T1).run(), /CHECK|constraint|FOREIGN/i, "liter >= 1");
  /* retensi: tugas dibuang = isi menempel ikut terbuang */
  const tmp = await tugas("Kab Satu"); await DB.prepare("INSERT INTO ops_pelajaran (id, tugas_id, catatan, oleh, dibuat) VALUES (?, ?, 'catatan uji cascade', 'uji', 1)").bind(id16(), tmp).run();
  await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(tmp).run(); assert.equal(await n("ops_pelajaran"), 0, "ON DELETE CASCADE");
});

uji("ops: rumus murni: panjang, luas, Douglas-Peucker, susut selang pada angka tangan", () => {
  /* kotak 0,01 derajat di khatulistiwa: sisi = 0,01 x pi/180 x 6371 = 1,111949 km, luas 1,236426 km2 = 123,6426 ha, keliling 4,447797 km */
  const kotak = [[110, 0], [110.01, 0], [110.01, 0.01], [110, 0.01], [110, 0]];
  dekat(panjangKm(kotak), 4.447797, 0.001, "keliling"); dekat(luasHa(kotak), 123.6426, 0.05, "luas");
  /* DP: titik tengah yang hampir segaris (0,0001 derajat = 11 m) dibuang pada eps 20 m, dipertahankan pada eps 5 m */
  const jalan = [[112, -2.5], [112.0001, -2.4995], [112, -2.499]];
  assert.equal(douglasPeucker(jalan, 20).length, 2); assert.equal(douglasPeucker(jalan, 5).length, 3);
  /* hitung tangan: 378,541 L/menit = 100 gpm, C 24 -> 24 psi/100 ft = 5,429 bar/100 m (docstring taktik.py) */
  dekat(susutBar100m(378.541, 24), 5.4290, 0.001, "100 gpm");
  /* 265 L/menit = 70,006 gpm: 24 x 0,70006^2 = 11,762 psi/100 ft x 3,28084 = 38,591 psi/100 m / 14,5038 = 2,6608 bar/100 m */
  dekat(susutBar100m(265, 24), 2.6608, 0.001, "Mark-3");
  const h = hitungEstafet({jarakLurusKm: 1}), selang = 1000 * 1.2 * 2.66079 / 100;   // 31,929 bar
  dekat(h.susut_total_bar, selang, 0.01); assert.equal(h.pompa, Math.ceil(selang / 8.3), "ceil(31,93 / (10,3 - 2)) = 4"); assert.equal(h.pompa, 4);
  assert.equal(hitungEstafet({jarakLurusKm: 0}).pompa, 1, "paling sedikit satu pompa di sumber");
  assert.ok(hitungEstafet({jarakLurusKm: 1, sisaBar: 12}).galat, "tekanan sisa melebihi tekanan kerja");
  /* uraiCsv ketat */
  const k = ["a", "b"], cek = s => /^\d+$/.test(s[0]) ? {v: s} : {g: "angka"};
  assert.ok(uraiCsv("a,b\n1,2\n3,4", k, 5, cek).baris.length === 2); assert.match(uraiCsv("b,a\n1,2", k, 5, cek).galat, /header/); assert.match(uraiCsv("a,b\n1,2,3", k, 5, cek).galat, /baris 2/);
  assert.match(uraiCsv("a,b\n1,2\n\n3,4", k, 5, cek).galat, /baris 3/, "baris kosong di tengah"); assert.match(uraiCsv("a,b\nx,2", k, 5, cek).galat, /angka/);
  assert.match(uraiCsv("a,b\n1,2\n1,2\n1,2", k, 2, cek).galat, /lebih dari 2/); assert.match(uraiCsv("a,b\n1,é", k, 5, cek).galat, /ASCII/); assert.match(uraiCsv("a,b\n1,2\u0000", k, 5, cek).galat, /ASCII/);
});

uji("ops: auth: tanpa sesi 401, akun lain dan wilayah lain 404, tanpa x-pb 403, gerbang situs 401, staf berperan dan wilayahnya", async () => {
  const tanpa = await api("GET", `/api/ops/tugas/${T1}`); assert.equal(tanpa.s, 401);
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, A.hg)).s, 200, "akun pemegang wilayah baca tanpa x-pb (GET)");
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, B.hg)).s, 404, "kabupaten lain: sama dengan tidak ada");
  assert.equal((await api("GET", `/api/ops/tugas/${T2}`, undefined, A.hg)).s, 404);
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, C.hg)).s, 200, "akun provinsi mencakup tugas kabupaten");
  assert.equal((await api("GET", `/api/ops/tugas/${id16()}`, undefined, A.hg)).s, 404); assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, GERBANG)).s, 401, "akun gerbang situs bukan moderator");
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, ADMIN)).s, 200); assert.equal((await api("GET", `/api/ops/tugas/${T2}`, undefined, MOD2)).s, 200);
  const sem = {tugas_id: T1, jenis: "sungai", kondisi: "ada_air", lat: -2.5455, lon: 112.0};
  assert.equal((await api("POST", "/api/ops/sumber_air", sem, A.hg)).s, 403, "POST akun tanpa x-pb"); assert.equal((await api("POST", "/api/ops/sumber_air", sem)).s, 401);
  assert.equal((await api("POST", "/api/ops/sumber_air", sem, B.h)).s, 404, "akun kabupaten lain menulis ke tugas ini"); assert.equal((await api("POST", "/api/ops/sumber_air", {...sem, tugas_id: "xyz"}, A.h)).s, 400);
  assert.equal(await n("ops_sumber_air"), 0, "semua penolakan tidak menulis");
  const sp = await bikinStaf("Staf Pusdalops", ["pusdalops"], ["62"]), sl = await bikinStaf("Staf Lain Wilayah", ["pusdalops"], ["13"]), st = await bikinStaf("Staf TMC", ["tmc"], []), sv = await bikinStaf("Staf Pimpinan", ["pimpinan"], []);
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, sp.h)).s, 200); assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, sl.h)).s, 404, "staf wilayah lain");
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, st.h)).s, 401, "peran tmc bukan pembaca operasi"); assert.equal((await api("GET", `/api/ops/tugas/${T1}`, undefined, sv.h)).s, 200, "pimpinan boleh baca");
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: T1, catatan: "pimpinan hanya membaca"}, sv.hp)).s, 401, "pimpinan tidak boleh menulis");
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: T1, catatan: "staf tanpa x-pb ditolak"}, sp.h)).s, 401, "sesi staf tanpa x-pb tidak dikenali");
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: T1, catatan: "staf pusdalops menulis"}, sp.hp)).s, 201); assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: T2, catatan: "staf luar wilayahnya"}, sl.hp)).s, 404);
  await DB.prepare("DELETE FROM ops_pelajaran").run();
});

uji("ops: garis dari koordinat: panjang dan luas pada angka tangan, validasi, hapus", async () => {
  const TQ = await tugas("Kab Satu", {lat: 0.005, lon: 110.005});
  const kotak = [[0, 110], [0, 110.01], [0.01, 110.01], [0.01, 110], [0, 110]];
  const r = await api("POST", "/api/ops/garis", {tugas_id: TQ, jenis: "sektor_aktif", titik: kotak}, A.h); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.garis.tertutup, true); assert.equal(r.j.garis.sumber, "kirim"); assert.equal(r.j.garis.n_titik, 5);
  dekat(r.j.garis.panjang_km, 4.4478, 0.002, "keliling"); dekat(r.j.garis.luas_ha, 123.64, 0.1, "luas ha");
  assert.deepEqual(r.j.garis.koordinat[1], [110.01, 0], "urutan GeoJSON [lon, lat]");
  const g = await api("POST", "/api/ops/garis", {tugas_id: TQ, jenis: "garis_api", titik: [[0, 110], [0, 110.01], [0.01, 110.01]]}, A.h); assert.equal(g.s, 201, g.t);
  assert.equal(g.j.garis.tertutup, false); assert.equal(g.j.garis.luas_ha, null); dekat(g.j.garis.panjang_km, 2 * 1.111949, 0.002);
  const ujungDekat = [[0, 110], [0, 110.01], [0.01, 110.01], [0.01, 110], [0.0001, 110.0001]];   // ujung 15 m dari awal: dianggap tertutup
  const t2 = await api("POST", "/api/ops/garis", {tugas_id: TQ, jenis: "padam", titik: ujungDekat}, A.h); assert.equal(t2.j.garis.tertutup, true); assert.deepEqual(t2.j.garis.koordinat.at(-1), t2.j.garis.koordinat[0], "cincin ditutup persis");
  for (const [b, pesan] of [[{jenis: "x", titik: kotak}, /jenis/], [{jenis: "padam", titik: [[0, 110]]}, /2 sampai 500/], [{jenis: "padam", titik: [[0, 110], [0, 0]]}, /Indonesia/], [{jenis: "padam", titik: [[0, 110], ["a", 110]]}, /Indonesia/],
    [{jenis: "padam", titik: [[0, 110], [0.5, 110]]}, /15 km/], [{jenis: "padam", titik: kotak, penugasan_id: id16()}, /dua-duanya/], [{jenis: "padam"}, /titik atau penugasan_id/], [{jenis: "padam", titik: Array(501).fill([0, 110])}, /2 sampai 500/]]) {
    const x = await api("POST", "/api/ops/garis", {tugas_id: TQ, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b).slice(0, 80)); assert.match(x.j.galat, pesan);
  }
  const dsn = await api("POST", "/api/ops/garis", {tugas_id: TQ, jenis: "padam", titik: Array.from({length: 500}, (_, i) => [0.0001 * Math.sin(i), 110 + i * 1e-5])}, A.h); assert.equal(dsn.s, 201, "tepat 500 titik diterima");
  assert.equal(await n("ops_garis", `tugas_id = '${TQ}'`), 4);
  assert.equal((await api("POST", `/api/ops/garis/${r.j.garis.id}`, {aksi: "hapus"}, E.h)).s, 403, "akun lain di wilayah sama bukan pembuat"); assert.equal((await api("POST", `/api/ops/garis/${r.j.garis.id}`, {aksi: "hapus"}, B.h)).s, 404);
  assert.equal((await api("POST", `/api/ops/garis/${r.j.garis.id}`, {aksi: "ubah"}, A.h)).s, 400);
  assert.equal((await api("POST", `/api/ops/garis/${r.j.garis.id}`, {aksi: "hapus"}, A.h)).s, 200); assert.equal((await api("POST", `/api/ops/garis/${r.j.garis.id}`, {aksi: "hapus"}, ADMIN)).s, 404);
  const adm = await api("POST", `/api/ops/garis/${g.j.garis.id}`, {aksi: "hapus"}, ADMIN); assert.equal(adm.s, 200, "moderator boleh menghapus garis siapa pun");
});

uji("ops: garis rekam jalan dari penugasan_posisi: rentang waktu, akurasi, DP di atas 500 titik, penugasan lain", async () => {
  const t0 = Date.now() - 3 * HARI;
  P1 = await penugasan(A.id, T1, {nama: "Hendra", peran: "ketua_regu", dibuat: t0 - 1000, berangkat: t0, selesai: t0 + 700e3});
  const lurus = Array.from({length: 700}, (_, i) => [-2.55 + i * (0.01 / 699), 112.0, 10, t0 + i * 1000]);   // 700 posisi segaris lurus 1,11 km
  await posisi(P1, [...lurus, [-2.4, 112.3, 500, t0 + 350e3], [-2.3, 112.0, 10, t0 - 3600e3], [-2.2, 112.0, 10, t0 + 800e3]]);   // akurasi 500 m, sebelum mulai, sesudah selesai: semuanya dibuang
  const r = await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: P1, jenis: "garis_api"}, A.h); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.garis.sumber, "rekam"); assert.equal(r.j.garis.penugasan_id, P1); assert.equal(r.j.garis.n_titik, 2, "700 titik segaris disederhanakan DP"); dekat(r.j.garis.panjang_km, 1.1119, 0.003, "panjang rekam");
  assert.equal(r.j.garis.mulai, t0); assert.equal(r.j.garis.selesai, t0 + 700e3);
  const s = await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: P1, jenis: "padam", mulai: t0 + 100e3, selesai: t0 + 200e3}, A.h); assert.equal(s.s, 201, s.t); assert.equal(s.j.garis.mulai, t0 + 100e3);
  assert.equal((await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: P1, jenis: "padam", mulai: t0 + 10e3, selesai: t0 + 10500}, A.h)).s, 409, "kurang dari 2 posisi di rentang");
  assert.equal((await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: P1, jenis: "padam", mulai: t0 + 20e3, selesai: t0 + 10e3}, A.h)).s, 400, "mulai >= selesai");
  assert.equal((await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: P1, jenis: "padam", mulai: t0, selesai: t0 + 9 * HARI}, A.h)).s, 400, "rentang > 7 hari");
  const lain = await penugasan(B.id, T2, {}); assert.equal((await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: lain, jenis: "padam"}, A.h)).s, 404, "penugasan milik tugas lain");
  assert.equal((await api("POST", "/api/ops/garis", {tugas_id: T1, penugasan_id: "nonhex", jenis: "padam"}, A.h)).s, 400);
  /* zigzag lebar (>> 2 m) 600 titik: DP menyisakan <= 500 titik dan bentuk besar tetap */
  const P2 = await penugasan(A.id, T3, {dibuat: t0 - 1000, berangkat: t0, selesai: t0 + 700e3});
  await posisi(P2, Array.from({length: 600}, (_, i) => [-2.3 + (i % 2 ? 0.0003 : 0), 112.2 + i * 1e-4, 10, t0 + i * 1000]));
  const z = await api("POST", "/api/ops/garis", {tugas_id: T3, penugasan_id: P2, jenis: "garis_api"}, A.h); assert.equal(z.s, 201, z.t); assert.ok(z.j.garis.n_titik <= 500 && z.j.garis.n_titik >= 2, `n_titik ${z.j.garis.n_titik}`);
});

uji("ops: sumber air: tambah, validasi, daftar dalam 5 km, ubah kondisi", async () => {
  const r = await api("POST", "/api/ops/sumber_air", {tugas_id: T1, jenis: "sungai", kondisi: "ada_air", lat: -2.5455, lon: 112.0, catatan: "Sungai Seruyan, bisa disedot"}, A.h); assert.equal(r.s, 201, r.t); S1 = r.j.sumber.id;
  dekat(r.j.sumber.jarak_km, 0.5, 0.01, "jarak"); assert.equal(r.j.sumber.dummy, 0);
  S2 = (await api("POST", "/api/ops/sumber_air", {tugas_id: T1, jenis: "embung", kondisi: "tidak_tahu", lat: -2.55, lon: 112.03}, A.h)).j.sumber.id;
  SKERING = (await api("POST", "/api/ops/sumber_air", {tugas_id: T1, jenis: "sumur_bor", kondisi: "kering", lat: -2.5495, lon: 112.0}, A.h)).j.sumber.id;
  const jauh = await api("POST", "/api/ops/sumber_air", {tugas_id: T1, jenis: "kanal", kondisi: "ada_air", lat: -2.5, lon: 112.0}, A.h); assert.equal(jauh.s, 201, "5,5 km: boleh dicatat, di luar daftar 5 km");
  for (const [b, pesan] of [[{jenis: "danau"}, /jenis/], [{kondisi: "basah"}, /kondisi/], [{lat: 0, lon: 0}, /Indonesia/], [{lat: "x"}, /Indonesia/], [{lat: -2.0, lon: 112.0}, /25 km/], [{catatan: "x".repeat(301)}, /300/]]) {
    const x = await api("POST", "/api/ops/sumber_air", {tugas_id: T1, jenis: "sungai", kondisi: "ada_air", lat: -2.5455, lon: 112.0, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b)); assert.match(x.j.galat, pesan);
  }
  const d = await api("GET", `/api/ops/sumber_air?tugas_id=${T1}`, undefined, A.hg); assert.equal(d.s, 200);
  assert.deepEqual(d.j.sumber_air.map(x => x.id), [SKERING, S1, S2], "urut jarak, di dalam 5 km saja"); assert.equal((await api("GET", `/api/ops/sumber_air?tugas_id=${T1}`, undefined, B.hg)).s, 404);
  assert.equal((await api("GET", "/api/ops/sumber_air", undefined, A.hg)).s, 400);
  assert.equal((await api("POST", `/api/ops/sumber_air/${S2}`, {kondisi: "kering"}, B.h)).s, 404, "akun wilayah lain"); assert.equal((await api("POST", `/api/ops/sumber_air/${S2}`, {kondisi: "basah"}, A.h)).s, 400);
  const u = await api("POST", `/api/ops/sumber_air/${S2}`, {kondisi: "ada_air", catatan: "sudah dicek regu"}, E.h); assert.equal(u.s, 200, "akun lain di wilayah sama boleh memperbarui kondisi"); assert.equal(u.j.sumber.kondisi, "ada_air"); assert.equal(u.j.sumber.catatan, "sudah dicek regu");
  assert.equal((await api("POST", `/api/ops/sumber_air/${id16()}`, {kondisi: "ada_air"}, A.h)).s, 404);
});

uji("ops: selang dan pompa estafet pada angka tangan (jarak x 1,2, susut per 100 m, beda tinggi, ukuran selang)", async () => {
  await DB.prepare("UPDATE ops_sumber_air SET lat = -2.541, lon = 112.0 WHERE id = ?").bind(S2).run();   // 0,009 derajat = 1,000752 km garis lurus dari tugas (-2,55, 112,0)
  const q = (x = "") => api("GET", `/api/ops/selang?tugas_id=${T1}&sumber_id=${S2}${x}`, undefined, A.hg);
  const r = await q(); assert.equal(r.s, 200, r.t);
  dekat(r.j.jarak_lurus_km, 1.000752, 0.0005); assert.equal(r.j.jarak_selang_m, 1201, "1,000752 x 1000 x 1,2"); dekat(r.j.susut_bar_per_100m, 2.6608, 0.001); dekat(r.j.susut_total_bar, 31.95, 0.05);
  assert.equal(r.j.pompa, 4, "ceil(31,95 / 8,3) = 4"); assert.equal(r.j.pompa_kelas, "tekanan_tinggi"); assert.equal(r.j.selang, "1_5"); assert.equal(r.j.pembanding_lapangan.pompa, 5, "ceil(1201 / 300)");
  assert.match(r.j.beda_tinggi.keterangan, /tidak tersedia/); assert.equal(r.j.beda_tinggi.m, 0); assert.equal(r.j.peringatan, null);
  assert.match(r.j.sumber_konstanta.gesek_c.sumber, /taktik\.py/); assert.equal(r.j.sumber_konstanta.gesek_c.nilai, 24); assert.equal(r.j.sumber_konstanta.faktor_jarak_selang.nilai, 1.2);
  const b50 = await q("&beda_tinggi_m=50"); dekat(b50.j.tekanan_naik_bar, 4.905, 0.001); assert.equal(b50.j.pompa, 5, "(31,95 + 4,905) / 8,3 = 4,44"); assert.match(b50.j.beda_tinggi.keterangan, /kiriman/);
  assert.equal((await q("&sisa_bar=9.5")).j.pompa, 40, "anggaran 0,8 bar: 31,95 / 0,8 = 39,9");
  assert.equal((await q("&selang=2_5")).j.pompa, 1, "selang 2,5 inci C 2: 2,66 x 2/24 bar per 100 m");
  const jin = await q("&pompa=jinjing_ringan"); dekat(jin.j.susut_bar_per_100m, 0.9577, 0.002); assert.equal(jin.j.pompa, 9, "0,9577 x 12,009 = 11,50 / (3,4 - 2) = 8,2");
  assert.equal((await q("&debit_lpm=378.541&selang=1_5")).j.susut_bar_per_100m > 5.4, true, "debit kiriman");
  for (const x of ["&pompa=besar", "&selang=9", "&beda_tinggi_m=abc", "&sisa_bar=0", "&debit_lpm=5", "&sisa_bar=12"]) assert.equal((await q(x)).s, 400, x);
  assert.equal((await api("GET", `/api/ops/selang?tugas_id=${T1}`, undefined, A.hg)).s, 400, "sumber_id wajib"); assert.equal((await api("GET", `/api/ops/selang?tugas_id=${T1}&sumber_id=${id16()}`, undefined, A.hg)).s, 404);
  assert.equal((await api("GET", `/api/ops/selang?tugas_id=${T1}&sumber_id=${S2}`, undefined, B.hg)).s, 404, "wilayah lain");
  await DB.prepare("UPDATE ops_sumber_air SET kondisi = 'kering' WHERE id = ?").bind(S2).run(); assert.match((await q()).j.peringatan, /kering/); await DB.prepare("UPDATE ops_sumber_air SET kondisi = 'ada_air', lat = -2.55, lon = 112.03 WHERE id = ?").bind(S2).run();
});

uji("ops: rencana aksi periode: nilai awal otomatis, transisi draf-terbit-selesai, serah terima, cetak", async () => {
  const sk = await bikinStaf("Staf Pusdalops Dua", ["pusdalops"], ["62"]);
  const mulai = Date.now(), selesai = mulai + 12 * JAM;
  const cek = await api("GET", `/api/ops/periode?tugas_id=${T1}`, undefined, A.hg); assert.equal(cek.s, 200);
  assert.match(cek.j.awal.sasaran, /Kec Uji, Kab Satu.*Sekat kanal/); assert.equal(cek.j.awal.pj, "Hendra"); assert.deepEqual(cek.j.awal.regu, ["Hendra (ketua_regu)"]); assert.equal(cek.j.awal.alat, "Pompa portabel, Selang 1,5 inci");
  assert.equal(cek.j.awal.cuaca, "Angin 12.5 km/jam dari tenggara", "wd 135 = tenggara, dari kluster K7001 (1 jarak 0,3 km)"); assert.match(cek.j.awal.keselamatan, /tenggara/);
  const r = await api("POST", "/api/ops/periode", {tugas_id: T1, mulai, selesai, komunikasi: "Radio kanal 3, grup WA Karhutla Seruyan"}, A.h); assert.equal(r.s, 201, r.t); PER1 = r.j.periode.id;
  assert.equal(r.j.periode.status, "draf"); assert.equal(r.j.periode.pj, "Hendra"); assert.equal(r.j.periode.komunikasi, "Radio kanal 3, grup WA Karhutla Seruyan"); assert.match(r.j.periode.cuaca, /tenggara/);
  for (const [b, pesan] of [[{selesai: mulai}, /rentang/], [{selesai: mulai + 100 * JAM}, /rentang/], [{mulai: "kemarin"}, /rentang/], [{sektor: "timur"}, /sektor/], [{regu: Array(41).fill("x")}, /regu/], [{sasaran: "x".repeat(501)}, /sasaran/]]) {
    const x = await api("POST", "/api/ops/periode", {tugas_id: T1, mulai, selesai, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b).slice(0, 60)); assert.match(x.j.galat, pesan);
  }
  assert.equal((await api("POST", "/api/ops/periode", {tugas_id: T1, mulai, selesai}, B.h)).s, 404);
  const u = await api("POST", `/api/ops/periode/${PER1}`, {aksi: "ubah", sasaran: "Padamkan sektor timur", sektor: ["Sektor timur", "Sektor selatan"], regu: ["Regu A", "Regu B"]}, E.h); assert.equal(u.s, 200, u.t);
  assert.deepEqual(u.j.periode.sektor, ["Sektor timur", "Sektor selatan"]); assert.equal(u.j.periode.sasaran, "Padamkan sektor timur"); assert.equal(u.j.periode.pj, "Hendra", "kolom yang tak dikirim tetap");
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "serah", dari: "Regu A", ke: "Regu B"}, A.h)).s, 409, "serah terima sebelum terbit");
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "selesai"}, A.h)).s, 409, "draf tidak langsung selesai");
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "hapus"}, A.h)).s, 400); assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "terbit"}, B.h)).s, 404);
  const tb = await api("POST", `/api/ops/periode/${PER1}`, {aksi: "terbit"}, sk.hp); assert.equal(tb.s, 200, tb.t); assert.equal(tb.j.periode.status, "terbit");
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "terbit"}, A.h)).s, 409, "terbit dua kali"); assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "ubah", sasaran: "ganti"}, A.h)).s, 409, "sesudah terbit tidak diubah");
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "serah", dari: "R", ke: "Regu B"}, A.h)).s, 400, "dari minimal 2 karakter");
  const sr = await api("POST", `/api/ops/periode/${PER1}`, {aksi: "serah", dari: "Regu A", ke: "Regu B", catatan: "sektor timur masih bara"}, A.h); assert.equal(sr.s, 200, sr.t); assert.equal(sr.j.serah.length, 1); assert.equal(sr.j.serah[0].ke, "Regu B");
  const cetak = await api("GET", `/api/ops/periode/${PER1}`, undefined, A.hg); assert.equal(cetak.s, 200); assert.equal(cetak.j.serah[0].catatan, "sektor timur masih bara"); assert.equal(cetak.j.tugas.kab, "Kab Satu"); assert.equal(cetak.j.periode.regu.length, 2);
  assert.equal((await api("GET", `/api/ops/periode/${PER1}`, undefined, B.hg)).s, 404);
  const sel = await api("POST", `/api/ops/periode/${PER1}`, {aksi: "selesai"}, A.h); assert.equal(sel.j.periode.status, "selesai"); assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "selesai"}, A.h)).s, 409);
  assert.equal((await api("POST", `/api/ops/periode/${PER1}`, {aksi: "serah", dari: "Regu B", ke: "Regu C"}, A.h)).s, 409, "periode selesai tidak menerima serah");
  const TK = await tugas("Kab Satu"), kosong = await api("POST", "/api/ops/periode", {tugas_id: TK, mulai, selesai}, A.h); assert.equal(kosong.j.periode.pj, null); assert.equal((await api("POST", `/api/ops/periode/${kosong.j.periode.id}`, {aksi: "terbit"}, A.h)).s, 409, "terbit butuh penanggung jawab");
  assert.equal(await n("ops_jejak", `ref_id = '${PER1}'`), 3, "terbit, serah, selesai tercatat di jejak");
});

uji("ops: permintaan heli: sumber air terdekat (L5 lalu kanal.json), validasi, transisi sah dan peran penyetuju", async () => {
  const r = await api("POST", "/api/ops/permintaan", {tugas_id: T1, jenis: "heli", lat: -2.55, lon: 112.0, luas_ha: 25, prioritas: "tinggi", catatan: "api di gambut kering"}, A.h); assert.equal(r.s, 201, r.t); H1 = r.j.permintaan.id;
  assert.equal(r.j.permintaan.status, "diminta"); assert.equal(r.j.permintaan.sumber.dari, "sumber_air"); assert.equal(r.j.permintaan.sumber.id, S1, "S1 0,5 km ada_air; sumur kering diabaikan walau lebih dekat"); dekat(r.j.permintaan.sumber.jarak_km, 0.5, 0.01);
  const k = await api("POST", "/api/ops/permintaan", {tugas_id: T3, jenis: "heli", lat: -2.3, lon: 112.2}, A.h); assert.equal(k.s, 201, k.t); H2 = k.j.permintaan.id;
  assert.equal(k.j.permintaan.sumber.dari, "kanal"); assert.equal(k.j.permintaan.sumber.id, null); dekat(k.j.permintaan.sumber.jarak_km, 1.11, 0.02, "kanal.json sel -2.31,112.2"); assert.equal(k.j.permintaan.prioritas, "sedang");
  for (const [b, pesan] of [[{lat: undefined}, /sasaran/], [{lat: 0, lon: 0}, /Indonesia/], [{lat: -2.0, lon: 112}, /15 km/], [{prioritas: "mendesak"}, /prioritas/], [{luas_ha: -1}, /luas_ha/], [{jenis: "kapal"}, /heli\/logistik/], [{catatan: "x".repeat(501)}, /catatan/]]) {
    const x = await api("POST", "/api/ops/permintaan", {tugas_id: T1, jenis: "heli", lat: -2.55, lon: 112.0, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b)); assert.match(x.j.galat, pesan);
  }
  assert.equal((await api("POST", "/api/ops/permintaan", {tugas_id: T1, jenis: "heli", lat: -2.55, lon: 112.0}, B.h)).s, 404);
  const st = (id, ke, h, catatan) => api("POST", `/api/ops/permintaan/${id}`, {aksi: "status", ke, catatan}, h);
  assert.equal((await st(H1, "disetujui", A.h)).s, 403, "akun instansi mengajukan, tidak menyetujui"); assert.equal((await st(H1, "selesai", A.h)).s, 409, "diminta ke selesai tidak sah"); assert.equal((await st(H1, "dikirim", ADMIN)).s, 409, "dikirim hanya untuk logistik");
  assert.equal((await st(H1, "disetujui", B.h)).s, 404, "akun wilayah lain"); assert.equal((await st(H1, "ditolak", ADMIN)).s, 400, "penolakan wajib beralasan");
  const sp = await bikinStaf("Staf Udara", ["udara"], ["62"]), sl = await bikinStaf("Staf Udara Lain", ["udara"], ["13"]);
  assert.equal((await st(H1, "disetujui", sl.hp)).s, 404, "staf wilayah lain"); const ok = await st(H1, "disetujui", sp.hp); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.permintaan.status, "disetujui");
  assert.equal((await st(H1, "selesai", ADMIN)).s, 409, "disetujui belum dijadwalkan"); assert.equal((await st(H1, "dijadwalkan", A.h)).s, 403);
  assert.equal((await st(H1, "dijadwalkan", MOD2, "Heli Bell 412 pukul 14.00")).s, 200);
  assert.equal(await n("ops_jejak", `ref_id = '${H1}'`), 2, "tiap perpindahan status tercatat");
  const tolak = await st(H2, "ditolak", ADMIN, "heli tidak tersedia"); assert.equal(tolak.s, 200); assert.equal((await st(H2, "disetujui", ADMIN)).s, 409, "ditolak bersifat akhir");
  const l = await api("GET", `/api/ops/permintaan?tugas_id=${T1}`, undefined, A.hg); assert.equal(l.j.permintaan.length, 1); assert.equal(l.j.permintaan[0].status, "dijadwalkan");
  assert.equal((await api("GET", "/api/ops/permintaan", undefined, A.hg)).s, 400, "akun wajib tugas_id"); assert.equal((await api("GET", "/api/ops/permintaan?status=aneh", undefined, ADMIN)).s, 400);
  const sem = await api("GET", "/api/ops/permintaan?status=dijadwalkan&jenis=heli", undefined, ADMIN); assert.ok(sem.j.permintaan.some(x => x.id === H1), "antrean lintas tugas untuk moderator"); assert.equal((await api("GET", "/api/ops/permintaan?status=dijadwalkan", undefined, sl.h)).j.permintaan.length, 0, "staf wilayah lain tidak melihat");
});

uji("ops: log drop dan hasil otomatis dari titik FIRMS (1 km) dan Himawari (2 km) dalam 6 jam", async () => {
  const kini = Date.now(), R2 = await mf.getR2Bucket("MEDIA");
  assert.equal((await api("POST", "/api/ops/drop", {permintaan_id: H2, lat: -2.3, lon: 112.2, liter: 5000}, A.h)).s, 409, "permintaan ditolak");
  const awal = await api("POST", "/api/ops/permintaan", {tugas_id: T1, jenis: "heli", lat: -2.55, lon: 112.0}, A.h);
  assert.equal((await api("POST", "/api/ops/drop", {permintaan_id: awal.j.permintaan.id, lat: -2.55, lon: 112.0, liter: 5000}, A.h)).s, 409, "belum dijadwalkan");
  const bd = {permintaan_id: H1, lat: -2.55, lon: 112.0, liter: 5000};
  for (const [b, pesan] of [[{lat: 0, lon: 0}, /Indonesia/], [{lat: -2.4}, /5 km/], [{liter: 0}, /liter/], [{liter: 1.5}, /liter/], [{liter: 30001}, /liter/], [{pada: kini + HARI}, /pada/], [{pada: kini - 8 * HARI}, /pada/], [{permintaan_id: "x"}, /permintaan_id/]]) {
    const x = await api("POST", "/api/ops/drop", {...bd, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b)); assert.match(x.j.galat, pesan);
  }
  assert.equal((await api("POST", "/api/ops/drop", bd, B.h)).s, 404);
  const d1 = await api("POST", "/api/ops/drop", {...bd, pada: kini - 30 * MENIT}, A.h); assert.equal(d1.s, 201, d1.t); assert.equal(d1.j.drop.hasil, "menunggu", "belum ada putaran titik panas");
  /* fixture titik: FIRMS 0,33 km dari drop, 10 menit lalu (acuan sekarang, jam -0,1667): di dalam jendela */
  await titikPanas(kini, [[-2.547, 112.0, -0.1667, 30, "n"]]);
  const peta = await api("GET", `/api/ops/tugas/${T1}`, undefined, A.hg); const dd = peta.j.drop.find(x => x.id === d1.j.drop.id);
  assert.equal(dd.hasil, "ada_titik"); assert.equal(dd.hasil_n, 1); assert.equal((await DB.prepare("SELECT hasil, hasil_n FROM ops_drop WHERE id = ?").bind(d1.j.drop.id).first()).hasil, "ada_titik", "putusan disimpan");
  /* titik 3 km dari drop (di luar 1 km) tidak menghitung; jendela belum penuh -> menunggu */
  const d2 = await api("POST", "/api/ops/drop", {...bd, lat: -2.5, lon: 112.0, pada: kini - 20 * MENIT, permintaan_id: H1}, A.h); assert.equal(d2.s, 400, "drop 5,5 km dari sasaran ditolak");
  const ins = (pada, lat, lon) => { const id = id16(); return DB.prepare("INSERT INTO ops_drop (id, permintaan_id, tugas_id, lat, lon, liter, pada, oleh, dibuat) VALUES (?, ?, ?, ?, ?, 3000, ?, 'uji', ?)").bind(id, H1, T1, lat, lon, pada, kini).run().then(() => id); };
  const jauh = await ins(kini - 30 * MENIT, -2.52, 112.0), lama = await ins(kini - 7 * JAM, -2.56, 112.0), basi = await ins(kini - 31 * JAM, -2.56, 112.01);
  await titikPanas(kini, [[-2.547, 112.0, -0.1667, 30, "n"]]);   // acuan sekarang >= pada + 6 jam untuk drop 7 jam lalu
  const p2 = (await api("GET", `/api/ops/permintaan?tugas_id=${T1}`, undefined, A.hg)).j.permintaan.find(x => x.id === H1).drop, h = id => p2.find(x => x.id === id).hasil;
  assert.equal(h(jauh), "menunggu", "titik > 1 km tidak dihitung dan jendela 6 jam belum penuh"); assert.equal(h(lama), "tanpa_titik", "7 jam lalu, data mencakup jendela, tidak ada titik dalam 1 km"); assert.equal(h(basi), "tak_dinilai", "31 jam tanpa data pada jendelanya");
  /* Himawari: 1,5 km dari drop (di luar 1 km FIRMS, di dalam 2 km), u = 20 menit sebelum acuan */
  await R2.put("data/himawari.json", JSON.stringify({acuan: new Date(kini).toISOString(), baris: [[-2.5755, 112.0, 20, 50, 3, 1, 1, 3, 20]]}));
  const hw = await ins(kini - 2 * JAM, -2.56, 112.0); const p3 = (await api("GET", `/api/ops/permintaan?tugas_id=${T1}`, undefined, A.hg)).j.permintaan.find(x => x.id === H1).drop;
  assert.equal(p3.find(x => x.id === hw).hasil, "ada_titik", "Himawari dalam 2 km"); await R2.delete("data/himawari.json");
  /* murni */
  const B0 = {f: [{lat: -2.5, lon: 112, t: 1000 + 3 * JAM}], af: 1000 + 7 * JAM, h: [], ah: null}, d = {pada: 1000, lat: -2.5, lon: 112};
  assert.equal(nilaiSatuDrop(d, B0, 1000 + 8 * JAM).hasil, "ada_titik"); assert.equal(nilaiSatuDrop({...d, lat: -2.45}, B0, 1000 + 8 * JAM).hasil, "tanpa_titik"); assert.equal(nilaiSatuDrop({...d, lat: -2.45}, {...B0, af: 1000 + 2 * JAM}, 1000 + 8 * JAM), null);
  /* sebelum drop atau sesudah 6 jam tidak dihitung */
  assert.equal(nilaiSatuDrop(d, {...B0, f: [{lat: -2.5, lon: 112, t: 900}]}, 1000 + 8 * JAM).hasil, "tanpa_titik"); assert.equal(nilaiSatuDrop(d, {...B0, f: [{lat: -2.5, lon: 112, t: 1000 + 7 * JAM}]}, 1000 + 8 * JAM).hasil, "tanpa_titik");
  /* selesai: dijadwalkan -> selesai oleh akun lapangan */
  assert.equal((await api("POST", `/api/ops/permintaan/${H1}`, {aksi: "status", ke: "selesai"}, A.h)).s, 200, "akun lapangan menutup heli"); assert.equal((await api("POST", "/api/ops/drop", {...bd, pada: kini - 5 * MENIT}, A.h)).s, 201, "drop susulan masih boleh sesudah selesai");
});

uji("ops: logistik regu: barang dari daftar meja Logistik, transisi sampai diterima, teruskan ke Meja logistik", async () => {
  const dasar = {tugas_id: T1, jenis: "logistik", barang: "air_mineral", jumlah: 20, satuan: "dus"};
  const r = await api("POST", "/api/ops/permintaan", dasar, A.h); assert.equal(r.s, 201, r.t); L1 = r.j.permintaan.id; assert.equal(r.j.permintaan.status, "diminta"); assert.equal(r.j.permintaan.barang, "air_mineral"); assert.equal(r.j.permintaan.sumber, null);
  for (const [b, pesan] of [[{barang: "bbm"}, /daftar meja Logistik/], [{barang: "lainnya"}, /barang_ket/], [{jumlah: "20"}, /jumlah/], [{jumlah: 0}, /jumlah/], [{jumlah: 2e7}, /jumlah/], [{satuan: ""}, /satuan/], [{satuan: "x".repeat(21)}, /satuan/]]) {
    const x = await api("POST", "/api/ops/permintaan", {...dasar, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b)); assert.match(x.j.galat, pesan);
  }
  const bbm = await api("POST", "/api/ops/permintaan", {...dasar, barang: "lainnya", barang_ket: "BBM bensin campur 50:1", jumlah: 60, satuan: "liter"}, A.h); assert.equal(bbm.s, 201); assert.equal(bbm.j.permintaan.barang_ket, "BBM bensin campur 50:1");
  const st = (id, ke, h) => api("POST", `/api/ops/permintaan/${id}`, {aksi: "status", ke}, h);
  assert.equal((await st(L1, "dikirim", ADMIN)).s, 409, "diminta belum disetujui"); assert.equal((await st(L1, "dijadwalkan", ADMIN)).s, 409, "dijadwalkan khusus heli"); assert.equal((await st(L1, "disetujui", A.h)).s, 403);
  assert.equal((await api("POST", `/api/ops/permintaan/${L1}`, {aksi: "teruskan"}, A.h)).s, 403, "teruskan hanya admin/staf");
  const ter = await api("POST", `/api/ops/permintaan/${L1}`, {aksi: "teruskan"}, ADMIN); assert.equal(ter.s, 200, ter.t); assert.match(ter.j.meja_id, /^[0-9a-f]{16}$/);
  const m = await DB.prepare("SELECT meja, prov, kab, status, data, dummy FROM meja_catatan WHERE id = ?").bind(ter.j.meja_id).first(); assert.equal(m.meja, "logistik"); assert.equal(m.prov, "62"); assert.equal(m.kab, "Kab Satu"); assert.equal(m.status, "diminta");
  const dm = JSON.parse(m.data); assert.equal(dm.barang, "air_mineral"); assert.equal(dm.jumlah_diminta, 20); assert.equal(dm.satuan, "dus"); assert.equal(dm.posko, "Titik api Kec Uji, Kab Satu"); assert.equal(dm.kebutuhan_untuk, 4, "jumlah orang penugasan aktif");
  assert.equal((await api("POST", `/api/ops/permintaan/${L1}`, {aksi: "teruskan"}, ADMIN)).s, 409, "sudah diteruskan"); assert.equal((await api("POST", `/api/ops/permintaan/${H1}`, {aksi: "teruskan"}, ADMIN)).s, 409, "heli tidak diteruskan");
  assert.equal((await st(L1, "disetujui", ADMIN)).s, 200); assert.equal((await st(L1, "diterima", A.h)).s, 409, "belum dikirim"); assert.equal((await st(L1, "dikirim", A.h)).s, 403); assert.equal((await st(L1, "dikirim", ADMIN)).s, 200);
  assert.equal((await st(L1, "diterima", B.h)).s, 404, "akun wilayah lain"); const dit = await st(L1, "diterima", A.h); assert.equal(dit.s, 200, "regu menutup permintaan sendiri"); assert.equal(dit.j.permintaan.status, "diterima"); assert.equal((await st(L1, "ditolak", ADMIN)).s, 409, "diterima akhir");
  assert.equal((await api("POST", `/api/ops/permintaan/${bbm.j.permintaan.id}`, {aksi: "teruskan"}, MOD2)).s, 200, "barang lainnya lolos validasi meja");
  assert.equal((await api("POST", `/api/ops/permintaan/${L1}`, {aksi: "lain"}, ADMIN)).s, 400);
});

uji("ops: drone termal: CSV ketat, batas 2000 titik per tugas, CSV liar ditolak, batas laju", async () => {
  const ok = [[-2.55, 112.0, 120.5, sekarangIso()], [-2.5501, 112.0001, 310, sekarangIso()], [-2.5502, 112.0002, 85, Date.now()]];
  const r = await api("POST", "/api/ops/drone", {tugas_id: T1, alat: "DJI Mavic 3T", catatan: "sortie pagi", csv: csvDrone(ok)}, A.h); assert.equal(r.s, 201, r.t); assert.equal(r.j.unggah.n, 3); assert.equal(await n("ops_drone", `tugas_id = '${T1}'`), 3);
  const baris = await DB.prepare("SELECT lat, lon, suhu_c, waktu FROM ops_drone WHERE tugas_id = ? ORDER BY suhu_c").bind(T1).all(); assert.deepEqual(baris.results.map(x => x.suhu_c), [85, 120.5, 310]);
  const base = (csv, o = {}) => api("POST", "/api/ops/drone", {tugas_id: T1, alat: "DJI Mavic 3T", csv, ...o}, A.h);
  const iso = sekarangIso();
  for (const [csv, pesan, nama] of [[csvDrone(ok, "lat,lon,suhu,waktu"), /header/, "header salah"], ["lat,lon,suhu_c,waktu,x\n-2.55,112,100,2026-10-22T01:00:00Z,1", /header/, "kolom lebih"], [csvDrone([[-2.55, 112.0, 100, iso, 5]]), /4 kolom/, "kolom data lebih"],
    ["lat,lon,suhu_c,waktu\n-2.55,112.0,=1+1," + iso, /suhu_c/, "rumus"], ["lat,lon,suhu_c,waktu\n\"-2.55\",112.0,100," + iso, /lat\/lon/, "tanda kutip"], ["lat,lon,suhu_c,waktu\n-2.55,112.0,100,2026-10-22T01:00:00", /waktu/, "tanpa zona"],
    [csvDrone([[-2.55, 112.0, 100, new Date(Date.now() + 3 * JAM).toISOString()]]), /waktu/, "masa depan"], [csvDrone([[-2.55, 112.0, 100, new Date(Date.now() - 9 * HARI).toISOString()]]), /waktu/, "terlalu lama"],
    [csvDrone([[0, 0, 100, iso]]), /lat\/lon/, "di luar Indonesia"], [csvDrone([[-2.0, 112.0, 100, iso]]), /5 km/, "jauh dari tugas"], [csvDrone([[-2.55, 112.0, 5000, iso]]), /suhu_c/, "suhu 5000"], [csvDrone([[-2.55, 112.0, -41, iso]]), /suhu_c/, "suhu -41"],
    ["lat,lon,suhu_c,waktu\n-2.55,112.0,100," + iso + "é", /ASCII/, "non-ASCII"], ["lat,lon,suhu_c,waktu\n-2.55,112.0,100," + iso + "\u0000", /ASCII/, "NUL"], ["lat,lon,suhu_c,waktu", /tanpa baris data/, "tanpa data"], ["   ", /kosong/, "kosong"],
    [csvDrone(Array(2001).fill([-2.55, 112.0, 100, iso])), /lebih dari 2000 baris/, "2001 baris"]]) {
    const x = await base(csv); assert.equal(x.s, 400, nama); assert.match(x.j.galat, pesan, nama);
  }
  assert.equal((await base(42)).s, 400, "csv bukan teks"); assert.equal((await base(csvDrone(ok), {alat: ""})).s, 400); assert.equal((await base(csvDrone(ok), {catatan: "x".repeat(301)})).s, 400);
  assert.equal((await api("POST", "/api/ops/drone", {tugas_id: T1, alat: "x", csv: csvDrone(ok)}, A.h)).s, 400, "alat minimal 2 karakter");
  assert.equal((await api("POST", "/api/ops/drone", {tugas_id: T1, alat: "DJI Mavic 3T", csv: csvDrone(ok)}, B.h)).s, 404); assert.equal((await api("POST", "/api/ops/drone", {tugas_id: T1, alat: "DJI Mavic 3T", csv: csvDrone(ok)}, A.hg)).s, 403);
  assert.equal(await n("ops_drone", `tugas_id = '${T1}'`), 3, "semua penolakan tidak menulis sebagian");
  const besar = (k) => csvDrone(Array.from({length: k}, (_, i) => [(-2.55 + (i % 40) * 1e-4).toFixed(5), (112.0 + Math.floor(i / 40) * 1e-4).toFixed(5), 100 + (i % 200), iso]));
  const b1 = await base(besar(1990)); assert.equal(b1.s, 201, b1.t); assert.equal(b1.j.total_tugas, 1993);
  const lebih = await base(besar(10)); assert.equal(lebih.s, 409); assert.match(lebih.j.galat, /maksimal 2000/); assert.equal((await base(besar(7))).s, 201); assert.equal(await n("ops_drone", `tugas_id = '${T1}'`), 2000);
  assert.equal((await base(besar(1))).s, 409, "penuh");
  /* batas laju: 20 unggahan CSV per jam per pelaku */
  for (let i = 0; i < 20; i++) assert.equal((await api("POST", "/api/ops/drone", {tugas_id: T3, alat: "Drone uji " + i, csv: csvDrone([[-2.3, 112.2, 100, iso]])}, E.h)).s, 201, "unggahan " + i);
  const l = await api("POST", "/api/ops/drone", {tugas_id: T3, alat: "Drone uji 21", csv: csvDrone([[-2.3, 112.2, 100, iso]])}, E.h); assert.equal(l.s, 429); assert.ok(l.h.get("retry-after"));
});

uji("ops: peta operasi L4: satu panggilan memuat tugas, poligon kluster, posisi dan jejak, garis, sektor, sumber air, permintaan + drop, drone, angin", async () => {
  const r = await api("GET", `/api/ops/tugas/${T1}`, undefined, A.hg); assert.equal(r.s, 200, r.t); const j = r.j;
  assert.equal(j.tugas.id, T1); assert.equal(j.tugas.lat, -2.55); assert.equal(j.tugas.status, "buka"); assert.equal(j.tugas.level, 3); assert.equal(j.tugas.dummy, 0);
  assert.equal(j.kluster.id, "K7001", "kompleks terdekat <= 3 km (K7000 dan K7002 jauh)"); assert.ok(j.kluster.jarak_km < 0.4); assert.equal(j.kluster.poligon.type, "Polygon"); assert.equal(j.kluster.poligon.coordinates[0].length, 5);
  assert.equal(j.angin.ws_kmj, 12.5); assert.equal(j.angin.wd_derajat, 135); assert.equal(j.angin.dari, "tenggara");
  assert.equal(j.penugasan.length, 1); const p = j.penugasan[0]; assert.equal(p.id, P1); assert.equal(p.nama, "Hendra"); assert.ok(p.jejak.length <= 200 && p.jejak.length === 200, "jejak dipotong 200 titik terakhir");
  assert.deepEqual(p.jejak.map(x => x[2]), [...p.jejak.map(x => x[2])].sort((a, b) => a - b), "jejak urut waktu naik"); assert.equal(p.posisi.pada, p.jejak.at(-1)[2], "posisi terakhir = titik jejak terakhir"); assert.equal(p.wa, undefined, "WhatsApp tidak keluar");
  assert.deepEqual(j.garis.map(x => x.jenis).sort(), ["garis_api", "padam"]); assert.equal(j.sektor.length, 0);
  assert.deepEqual(j.sumber_air.map(x => x.id).sort(), [S1, S2, SKERING].sort(), "sumber air dalam 5 km"); assert.ok(j.sumber_air.every(x => x.jarak_km <= 5));
  const h1 = j.permintaan.find(x => x.id === H1); assert.equal(h1.sumber.id, S1); assert.ok(h1.drop.length >= 3, "drop menempel pada permintaan"); assert.equal(j.drop.length, h1.drop.length);
  assert.equal(j.permintaan.find(x => x.id === L1).status, "diterima"); assert.equal(j.drone.titik.length, 2000); assert.equal(j.drone.titik[0].length, 4); assert.equal(j.drone.unggah.length, 3);
  assert.equal(j.periode.length, 1); assert.equal(j.periode[0].id, PER1); assert.equal(j.batas.jejak, 200);
  assert.ok(!JSON.stringify(j).includes("token"), "tidak ada token"); assert.ok(!/"oleh"/.test(JSON.stringify(j)), "identitas pembuat tidak keluar");
  const far = await tugas("Kab Satu", {lat: -2.7, lon: 112.7}); const f = await api("GET", `/api/ops/tugas/${far}`, undefined, A.hg); assert.equal(f.j.kluster, null, "tanpa kompleks <= 3 km"); assert.equal(f.j.angin, null); assert.equal(f.j.penugasan.length, 0); assert.equal(f.j.drone.titik.length, 0);
  const pa = (await api("GET", `/api/ops/tugas/${T2}`, undefined, ADMIN)).j; assert.equal(pa.tugas.kab, "Kab Dua");
  /* posisi orang tidak ada di rute publik */
  assert.equal((await api("GET", `/api/ops/tugas/${T1}`)).s, 401);
});

uji("ops: linimasa urut waktu, waktu respons, status padam dan muncul lagi, catatan pelajaran", async () => {
  const dasar = Date.now() - 10 * JAM;
  const TL = await tugas("Kab Satu", {dibuat: dasar, status: "padam", extra: {konfirmasi_pada: dasar + 10 * MENIT, padam_verif: "padam_terverifikasi", padam_pada: dasar + 180 * MENIT, verif_pada: dasar + 230 * MENIT, cek_ulang_pada: dasar + 250 * MENIT}});
  await penugasan(A.id, TL, {nama: "Rina", peran: "driver", dibuat: dasar + 20 * MENIT, berangkat: dasar + 30 * MENIT, tiba: dasar + 60 * MENIT, selesai: dasar + 150 * MENIT, status: "selesai"});
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api, tindakan) VALUES (?, ?, ?, 'klien-uji-01', 'tindakan', ?, 'padam', 'Penyiraman selesai')").bind(id16(), TL, A.id, dasar + 175 * MENIT).run();
  const adaMuncul = (await DB.prepare("SELECT 1 x FROM sqlite_master WHERE name = 'tugas_muncul'").first()) != null;
  if (adaMuncul) await DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber, jarak_km) VALUES (?, ?, 'himawari', 1.2)").bind(TL, dasar + 200 * MENIT).run();
  const g = await api("POST", "/api/ops/garis", {tugas_id: TL, jenis: "padam", titik: [[-2.55, 112.0], [-2.551, 112.001]]}, A.h); assert.equal(g.s, 201);
  const pm = await api("POST", "/api/ops/permintaan", {tugas_id: TL, jenis: "logistik", barang: "masker", jumlah: 100, satuan: "buah"}, A.h); assert.equal(pm.s, 201);
  await api("POST", `/api/ops/permintaan/${pm.j.permintaan.id}`, {aksi: "status", ke: "disetujui"}, ADMIN);
  const per = await api("POST", "/api/ops/periode", {tugas_id: TL, mulai: dasar, selesai: dasar + 12 * JAM, sasaran: "Pastikan padam", pj: "Rina"}, A.h); assert.equal(per.s, 201);
  const r = await api("GET", `/api/ops/linimasa/${TL}`, undefined, A.hg); assert.equal(r.s, 200, r.t);
  const L = r.j.linimasa, jenis = L.map(x => x.jenis); assert.deepEqual(L.map(x => x.waktu), [...L.map(x => x.waktu)].sort((a, b) => a - b), "urut waktu naik");
  assert.equal(L[0].jenis, "deteksi"); assert.equal(L[1].jenis, "konfirmasi");
  for (const k of ["penugasan", "berangkat", "tiba", "selesai_tugas", "isian_kabar", "padam", "terverifikasi", "cek_ulang", "garis", "permintaan", "permintaan_status", "periode"]) assert.ok(jenis.includes(k), k);
  if (adaMuncul) assert.ok(jenis.includes("muncul_lagi"));
  assert.ok(jenis.indexOf("tiba") < jenis.indexOf("padam") && jenis.indexOf("padam") < jenis.indexOf("terverifikasi"), "tiba < padam < terverifikasi");
  assert.deepEqual(r.j.respons, {deteksi: dasar, konfirmasi_menit: 10, tiba_menit: 60, padam_menit: 180, terverifikasi_menit: 230});
  assert.match(L.find(x => x.jenis === "garis").ket, /Garis padam dicatat, 0\.\d+ km|Garis padam dicatat, 0,\d+ km/); assert.equal(L.find(x => x.jenis === "tiba").ket, "Rina tiba di lokasi");
  assert.equal((await api("GET", `/api/ops/linimasa/${TL}`, undefined, B.hg)).s, 404); assert.equal((await api("GET", `/api/ops/linimasa/${id16()}`, undefined, A.hg)).s, 404);
  /* tugas belum padam: waktu respons yang belum terjadi = null */
  const baru = (await api("GET", `/api/ops/linimasa/${T1}`, undefined, A.hg)).j; assert.equal(baru.respons.padam_menit, null); assert.equal(baru.respons.terverifikasi_menit, null); assert.ok(!baru.linimasa.some(x => x.jenis === "padam"));
  assert.ok(baru.linimasa.some(x => x.jenis === "drop"), "drop masuk linimasa"); assert.ok(baru.linimasa.some(x => x.jenis === "serah"), "serah terima masuk linimasa");
  /* pelajaran */
  for (const [b, pesan] of [[{catatan: "abc"}, /5 sampai 1000/], [{catatan: "x".repeat(1001)}, /5 sampai 1000/], [{catatan: null}, /5 sampai 1000/]]) { const x = await api("POST", "/api/ops/pelajaran", {tugas_id: TL, ...b}, A.h); assert.equal(x.s, 400); assert.match(x.j.galat, pesan); }
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: TL, catatan: "Pompa kedua terlambat 2 jam"}, B.h)).s, 404);
  const p1 = await api("POST", "/api/ops/pelajaran", {tugas_id: TL, catatan: "Pompa kedua terlambat 2 jam; kirim estafet dari awal"}, A.h); assert.equal(p1.s, 201);
  assert.equal((await api("GET", `/api/ops/linimasa/${TL}`, undefined, A.hg)).j.pelajaran.at(-1).catatan, "Pompa kedua terlambat 2 jam; kirim estafet dari awal");
  for (let i = 1; i < 20; i++) assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: TL, catatan: "catatan ke " + i + " pasca operasi"}, A.h)).s, 201);
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: TL, catatan: "catatan ke 21 ditolak"}, A.h)).s, 409, "maksimal 20 catatan");
});

uji("ops: patroli pencegahan: jadwal, wilayah, penanggung jawab, kunjungan, terlewat", async () => {
  const jadwal = Date.now() + HARI, dasar = {kec: "Kec Uji", desa: "Desa Sebangau", alasan: "risiko", alasan_ket: "Indeks risiko harian tinggi di KHG", jadwal};
  const r = await api("POST", "/api/ops/patroli", dasar, A.h); assert.equal(r.s, 201, r.t); const pid = r.j.patroli.id;
  assert.equal(r.j.patroli.prov, "62"); assert.equal(r.j.patroli.kab, "Kab Satu", "wilayah akun kabupaten"); assert.equal(r.j.patroli.akun_id, A.id); assert.equal(r.j.patroli.status, "terjadwal");
  for (const [b, pesan] of [[{alasan: "lainnya", alasan_ket: ""}, /alasan_ket/], [{alasan: "iseng"}, /alasan/], [{kec: ""}, /kec/], [{jadwal: Date.now() - 5 * HARI}, /jadwal/], [{jadwal: Date.now() + 90 * HARI}, /jadwal/], [{jadwal: "besok"}, /jadwal/], [{alasan_ket: "x".repeat(301)}, /alasan_ket/]]) {
    const x = await api("POST", "/api/ops/patroli", {...dasar, ...b}, A.h); assert.equal(x.s, 400, JSON.stringify(b)); assert.match(x.j.galat, pesan);
  }
  assert.equal((await api("POST", "/api/ops/patroli", {...dasar, kab: "Kab Dua", prov: "62"}, A.h)).s, 403, "akun kabupaten tidak membuat untuk kabupaten lain");
  const c = await api("POST", "/api/ops/patroli", {...dasar, prov: "62", kab: "Kab Dua"}, C.h); assert.equal(c.s, 201, c.t); assert.equal(c.j.patroli.akun_id, C.id, "akun provinsi mencakup kabupaten itu");
  assert.equal((await api("POST", "/api/ops/patroli", {...dasar, prov: "13", kab: "Kab X"}, C.h)).s, 403, "provinsi di luar cakupan"); assert.equal((await api("POST", "/api/ops/patroli", {...dasar, prov: "99", kab: "Kab X"}, ADMIN)).s, 400);
  const adm = await api("POST", "/api/ops/patroli", {...dasar, prov: "62", kab: "Kab Satu", akun_id: A.id}, ADMIN); assert.equal(adm.s, 201); assert.equal(adm.j.patroli.akun_id, A.id);
  assert.equal((await api("POST", "/api/ops/patroli", {...dasar, prov: "62", kab: "Kab Satu", akun_id: B.id}, ADMIN)).s, 400, "penanggung jawab di luar wilayah patroli");
  const kj = (id, b, h) => api("POST", `/api/ops/patroli/${id}`, {aksi: "kunjungan", ...b}, h);
  assert.equal((await kj(pid, {lat: -2.55, lon: 112.0, catatan: "aman"}, B.h)).s, 404, "kabupaten lain"); assert.equal((await kj(pid, {lat: -2.55, lon: 112.0, catatan: "aman"}, C.h)).s, 403, "bukan penanggung jawab");
  assert.equal((await kj(pid, {lat: 0, lon: 0, catatan: "aman"}, A.h)).s, 400); assert.equal((await kj(pid, {lat: -2.55, lon: 112.0}, A.h)).s, 400, "titik GPS tanpa catatan atau foto");
  assert.equal((await kj(pid, {lat: -2.55, lon: 112.0, catatan: "aman", pada: Date.now() + HARI}, A.h)).s, 400); assert.equal((await kj(pid, {lat: -2.55, lon: 112.0, akurasi: 5000}, A.h)).s, 400);
  assert.equal((await api("POST", `/api/ops/patroli/${pid}`, {aksi: "hapus"}, A.h)).s, 400);
  const ok = await kj(pid, {lat: -2.55, lon: 112.0, akurasi: 8, catatan: "tidak ada asap, warga sudah diingatkan"}, A.h); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.patroli.status, "dikunjungi"); assert.equal(ok.j.patroli.kunjungan.length, 1);
  /* foto GPS lewat media instansi yang ada */
  const mid = id16(); await DB.prepare("INSERT INTO instansi_media (id, akun_id, tugas_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, waktu_gps, dibuat) VALUES (?, ?, ?, 'foto', 'image/jpeg', 1000, ?, 'gps', -2.5512, 112.0003, ?, ?)").bind(mid, A.id, T1, Date.now() - MENIT, Date.now() - MENIT, Date.now()).run();
  assert.equal((await kj(adm.j.patroli.id, {media_id: mid}, E.h)).s, 403, "E bukan penanggung jawab"); assert.equal((await kj(adm.j.patroli.id, {media_id: id16()}, A.h)).s, 404);
  const foto = await kj(adm.j.patroli.id, {media_id: mid}, A.h); assert.equal(foto.s, 201, foto.t); assert.equal(foto.j.patroli.kunjungan[0].media_id, mid); assert.equal(foto.j.patroli.kunjungan[0].lat, -2.5512, "koordinat dari foto GPS");
  assert.equal((await kj(adm.j.patroli.id, {media_id: mid}, E.h)).s, 403);
  /* terlewat: jadwal lampau lebih dari sehari tanpa kunjungan */
  const lewat = id16(); await DB.prepare("INSERT INTO ops_patroli (id, prov, kab, kec, alasan, jadwal, akun_id, oleh, dibuat) VALUES (?, '62', 'Kab Satu', 'Kec Uji', 'khg', ?, ?, 'uji', ?)").bind(lewat, Date.now() - 2 * HARI, A.id, Date.now() - 3 * HARI).run();
  const l = await api("GET", "/api/ops/patroli?status=terlewat", undefined, A.hg); assert.equal(l.s, 200); assert.deepEqual(l.j.patroli.map(x => x.id), [lewat]); assert.equal((await DB.prepare("SELECT status FROM ops_patroli WHERE id = ?").bind(lewat).first()).status, "terlewat");
  const tl = await kj(lewat, {lat: -2.55, lon: 112.0, catatan: "terlambat tapi dikunjungi"}, A.h); assert.equal(tl.j.patroli.status, "dikunjungi", "terlewat masih bisa dikunjungi");
  const semua = await api("GET", "/api/ops/patroli", undefined, A.hg); assert.ok(semua.j.patroli.every(x => x.kab === "Kab Satu")); assert.equal(semua.j.patroli.find(x => x.id === pid).kunjungan.length, 1);
  assert.equal((await api("GET", "/api/ops/patroli", undefined, B.hg)).j.patroli.every(x => x.kab === "Kab Dua"), true, "kabupaten lain tidak melihat patroli Kab Satu");
  const sl = await bikinStaf("Staf Lain Provinsi", ["pusdalops"], ["13"]); assert.equal((await api("GET", "/api/ops/patroli", undefined, sl.h)).j.patroli.length, 0); assert.ok((await api("GET", "/api/ops/patroli", undefined, ADMIN)).j.patroli.length >= 4);
  assert.equal((await api("GET", "/api/ops/patroli?status=x", undefined, ADMIN)).s, 400); assert.equal((await api("GET", "/api/ops/patroli", undefined, GERBANG)).s, 401);
});

uji("ops: TMAT: hanya moderator mengunggah, CSV liar ditolak, peta bbox memuat bacaan terbaru, ketentuan BRGM tertulis", async () => {
  const w1 = Date.now() - 5 * HARI, w2 = Date.now() - HARI, iso = t => new Date(t).toISOString();
  const csv = (baris, kepala = "id,lat,lon,tmat_cm,waktu,sumber") => [kepala, ...baris.map(b => b.join(","))].join("\n");
  const ok = csv([["PZ-001", -2.55, 112.0, -35.5, iso(w1), "BRGM SIMPEL"], ["PZ-001", -2.55, 112.0, -42, iso(w2), "BRGM SIMPEL"], ["PZ-002", -2.61, 112.1, 12, iso(w2), "BRGM SIMPEL"], ["PZ-003", -3.4, 114.5, -61, iso(w2), "Dinas LH Kalsel"]]);
  assert.equal((await api("POST", "/api/ops/tmat", {csv: ok}, A.h)).s, 403, "akun instansi bukan moderator"); assert.equal((await api("POST", "/api/ops/tmat", {csv: ok})).s, 401); assert.equal((await api("POST", "/api/ops/tmat", {csv: ok}, GERBANG)).s, 401);
  const st = await bikinStaf("Staf Pusdalops TMAT", ["pusdalops"], []); assert.equal((await api("POST", "/api/ops/tmat", {csv: ok}, st.hp)).s, 403, "staf pun bukan modOK");
  const r = await api("POST", "/api/ops/tmat", {csv: ok}, ADMIN); assert.equal(r.s, 201, r.t); assert.equal(r.j.n, 4); assert.equal(r.j.stasiun, 3); assert.match(r.j.keterangan, /BRGM.*menunggu akses resmi/); assert.equal(await n("ops_tmat"), 4);
  const bad = (c, pesan, nama) => api("POST", "/api/ops/tmat", {csv: c}, MOD2).then(x => { assert.equal(x.s, 400, nama); assert.match(x.j.galat, pesan, nama); });
  await bad(csv([["PZ 1", -2.55, 112, -10, iso(w2), "BRGM"]]), /id stasiun/, "id dengan spasi"); await bad(csv([["P", -2.55, 112, -10, iso(w2), "BRGM"]]), /id stasiun/, "id satu huruf");
  await bad(csv([["PZ-9", 0, 0, -10, iso(w2), "BRGM"]]), /lat\/lon/, "di luar Indonesia"); await bad(csv([["PZ-9", -2.55, 112, 999, iso(w2), "BRGM"]]), /tmat_cm/, "tmat 999"); await bad(csv([["PZ-9", -2.55, 112, -600, iso(w2), "BRGM"]]), /tmat_cm/, "tmat -600");
  await bad(csv([["PZ-9", -2.55, 112, "=1+1", iso(w2), "BRGM"]]), /tmat_cm/, "rumus"); await bad(csv([["PZ-9", -2.55, 112, -10, "2026-10-01T00:00:00", "BRGM"]]), /waktu/, "tanpa zona"); await bad(csv([["PZ-9", -2.55, 112, -10, iso(Date.now() + 5 * HARI), "BRGM"]]), /waktu/, "masa depan");
  await bad(csv([["PZ-9", -2.55, 112, -10, iso(w2), "BRGM, Jakarta"]]), /6 kolom/, "koma di sumber"); await bad(csv([["PZ-9", -2.55, 112, -10, iso(w2), "=cmd|' /C calc'!A0"]]), /sumber/, "sumber berisi rumus"); await bad(csv([["PZ-9", -2.55, 112, -10, iso(w2), "x"]]), /sumber/, "sumber satu huruf");
  await bad(csv([["PZ-9", -2.55, 112, -10, iso(w2), "BRGM"]], "id,lat,lon,tmat,waktu,sumber"), /header/, "header salah"); await bad(csv([["PZ-9", -2.55, 112, -10, iso(w2), "BRGM é"]]), /ASCII/, "non-ASCII");
  await bad(csv(Array(3001).fill(["PZ-9", -2.55, 112, -10, iso(w2), "BRGM"])), /lebih dari 3000/, "3001 baris");
  assert.equal(await n("ops_tmat"), 4, "penolakan tidak menulis");
  /* unggah ulang pembacaan yang sama menimpa, tidak menggandakan */
  assert.equal((await api("POST", "/api/ops/tmat", {csv: csv([["PZ-002", -2.61, 112.1, -20, iso(w2), "BRGM SIMPEL"]])}, ADMIN)).s, 201); assert.equal(await n("ops_tmat"), 4); assert.equal((await DB.prepare("SELECT tmat_cm FROM ops_tmat WHERE stasiun = 'PZ-002'").first()).tmat_cm, -20);
  const g = await api("GET", "/api/ops/tmat?bbox=111.5,-3,113,-2", undefined, A.hg); assert.equal(g.s, 200, g.t);
  assert.deepEqual(g.j.stasiun.map(x => [x.stasiun, x.tmat_cm]), [["PZ-001", -42], ["PZ-002", -20]], "bacaan terbaru per stasiun, di dalam bbox saja"); assert.match(g.j.keterangan, /BRGM/);
  assert.equal((await api("GET", "/api/ops/tmat?bbox=111.5,-3,113,-2", undefined, B.hg)).s, 200, "baca untuk semua akun instansi aktif"); assert.equal((await api("GET", "/api/ops/tmat")).s, 401);
  assert.equal((await api("GET", "/api/ops/tmat", undefined, ADMIN)).j.stasiun.length, 3, "tanpa bbox = seluruh Indonesia");
  for (const b of ["a,b,c,d", "113,-3,111.5,-2", "111,-3,112", "1,2,3,4,5"]) assert.equal((await api("GET", "/api/ops/tmat?bbox=" + b, undefined, ADMIN)).s, 400, b);
  assert.equal((await api("GET", "/api/ops/tmat?bbox=100,-1,101,0", undefined, ADMIN)).j.stasiun.length, 0);
});

uji("ops: dummy: hanya Super Admin, mengisi semua tabel, tampak hanya untuk akun dummy, hapus membersihkan tanpa menyentuh data nyata", async () => {
  const nyata = {}; for (const t of TABEL) nyata[t] = await n(t);
  assert.equal((await api("POST", "/api/ops/dummy", {aksi: "isi"})).s, 403); assert.equal((await api("POST", "/api/ops/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator biasa bukan Super Admin"); assert.equal((await api("POST", "/api/ops/dummy", {aksi: "isi"}, GERBANG)).s, 403);
  assert.equal((await api("POST", "/api/ops/dummy", {aksi: "isi"}, A.h)).s, 403); assert.equal((await api("POST", "/api/ops/dummy", {aksi: "lain"}, ADMIN)).s, 400);
  const r = await api("POST", "/api/ops/dummy", {aksi: "isi"}, ADMIN); assert.equal(r.s, 201, r.t); const tid = r.j.tugas_id;
  for (const t of TABEL) assert.ok(await n(t, "dummy = 1") > 0, `${t} terisi dummy`);
  for (const t of TABEL) assert.equal(await n(t, "dummy = 0"), nyata[t], `${t}: data nyata tak berubah`);
  assert.equal((await DB.prepare("SELECT dummy FROM tugas_api WHERE id = ?").bind(tid).first()).dummy, 1);
  const jum = {}; for (const t of TABEL) jum[t] = await n(t, "dummy = 1");
  assert.equal((await api("POST", "/api/ops/dummy", {aksi: "isi"}, ADMIN)).s, 201); for (const t of TABEL) assert.equal(await n(t, "dummy = 1"), jum[t], `${t}: isi dua kali = idempoten`);
  /* akun nyata tidak melihat tugas dummy; akun dummy dan admin melihat */
  assert.equal((await api("GET", `/api/ops/tugas/${tid}`, undefined, A.hg)).s, 404, "akun nyata"); assert.equal((await api("GET", `/api/ops/tugas/${tid}`, undefined, ADMIN)).s, 200);
  const D = await akun("pemkabdummy", {kab: "Seruyan", dummy: 1}); const dp = await api("GET", `/api/ops/tugas/${tid}`, undefined, D.hg); assert.equal(dp.s, 200, dp.t);
  assert.equal(dp.j.tugas.dummy, 1); assert.equal(dp.j.sumber_air.length, 3); assert.equal(dp.j.garis.length, 2); assert.equal(dp.j.sektor.length, 1); assert.equal(dp.j.sektor[0].tertutup, true); assert.ok(dp.j.sektor[0].luas_ha > 0);
  assert.equal(dp.j.permintaan.length, 2); assert.equal(dp.j.drop.length, 1); assert.equal(dp.j.drone.titik.length, 40); assert.equal(dp.j.periode.length, 1);
  assert.equal((await api("GET", `/api/ops/linimasa/${tid}`, undefined, D.hg)).j.pelajaran.length, 1); assert.ok((await api("GET", "/api/ops/patroli", undefined, D.hg)).j.patroli.length >= 2); assert.equal((await api("GET", "/api/ops/patroli", undefined, A.hg)).j.patroli.every(x => !x.dummy), true);
  assert.equal((await api("GET", "/api/ops/tmat", undefined, A.hg)).j.stasiun.every(x => !x.dummy), true, "TMAT dummy tidak tampak bagi akun nyata"); assert.equal((await api("GET", "/api/ops/tmat", undefined, D.hg)).j.stasiun.filter(x => x.dummy).length, 4);
  assert.equal((await api("GET", `/api/ops/sumber_air?tugas_id=${tid}`, undefined, D.hg)).j.sumber_air.length, 3);
  const h = await api("POST", "/api/ops/dummy", {aksi: "hapus"}, ADMIN); assert.equal(h.s, 200, h.t);
  for (const t of TABEL) assert.equal(await n(t, "dummy = 1"), 0, `${t} bersih`);
  for (const t of TABEL) assert.equal(await n(t, "dummy = 0"), nyata[t], `${t}: data nyata tetap`);
  assert.equal(await n("tugas_api", `id = '${tid}'`), 0, "tugas dummy buatan modul ini ikut dihapus");
  assert.equal((await api("POST", "/api/ops/dummy", {aksi: "hapus"}, ADMIN)).s, 200, "hapus kosong tidak galat");
  /* bila sudah ada tugas dummy dari modul Instansi, dipakai tanpa dibuat baru */
  const td = await tugas("Seruyan", {dummy: 1}); const r2 = await api("POST", "/api/ops/dummy", {aksi: "isi"}, ADMIN); assert.equal(r2.j.tugas_id, td); await api("POST", "/api/ops/dummy", {aksi: "hapus"}, ADMIN); assert.equal(await n("tugas_api", `id = '${td}'`), 1, "tugas dummy milik modul lain tidak dihapus"); await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(td).run();
});

uji("ops: tanpa tabel 0042 semua rute menjawab 503 sopan, bukan 500", async () => {
  await DB.prepare("DROP TABLE ops_kunjungan").run(); await DB.prepare("DROP TABLE ops_patroli").run(); await DB.prepare("DROP TABLE ops_sumber_air").run();
  const r = await api("GET", `/api/ops/sumber_air?tugas_id=${T1}`, undefined, A.hg); assert.equal(r.s, 503); assert.match(r.j.galat, /0042/);
  assert.equal((await api("GET", "/api/ops/patroli", undefined, A.hg)).s, 503);
  const p = await api("GET", `/api/ops/permintaan?tugas_id=${T1}`, undefined, A.hg); assert.equal(p.s, 200, "tabel lain tetap jalan");
  for (const s of pecah(SQL)) await DB.prepare(s).run();   // pulihkan
  assert.equal((await api("GET", `/api/ops/sumber_air?tugas_id=${T1}`, undefined, A.hg)).s, 200);
});
