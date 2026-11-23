/* PB-03: golden perilaku karhutla SEBELUM refaktor PB-07 (teks BENCANA, bencanaId, bencanaPer).
   awalPeriode dan infoKluster tidak diekspor, jadi dibekukan lewat rute RUTE_OPS di Worker nyata (Miniflare, D1 sungguhan, migrasi apa adanya):
   GET /api/ops/periode (kolom `awal`), POST /api/ops/periode (nilai awal terpakai), GET /api/ops/tugas/:id (kluster, angin), GET /api/ops/linimasa/:id (penyusun riwayat).
   Semua waktu tetap (tanpa Date.now() di golden; hanya kedaluwarsa penugasan jauh ke depan). Jenis selain karhutla: kluster dan angin tetap null.
   Membekukan ulang (HANYA bila perubahan teks karhutla disengaja dan disetujui pemilik): BEKUKAN=1 node --test tests/warga/pb_karhutla_tetap.test.mjs
   Jalankan: node --test tests/warga/pb_karhutla_tetap.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, writeFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
import {denganProfil} from "./_profil.mjs";

const JAM = 3600e3, MENIT = 60e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, DASAR = Date.UTC(2026, 9, 1, 0, 0, 0);   // 1 Okt 2026 00:00 UTC, tetap
const GOLDEN = path.join(AKAR, "tests/warga/fixtures/pb_karhutla_golden.json");
const FIX = {
  "/data/tugas_kompleks.json": {dibuat: "2026-10-01T00:00:00Z", kompleks: [{id: "K7001", lat: -2.552, lon: 112.001, prov: "62", kab: "Kab Satu", kec: "Kec Uji", level: 3}]},
  "/data/kluster_geo.json": {K7001: [{type: "Polygon", coordinates: [[[111.995, -2.555], [112.01, -2.555], [112.01, -2.545], [111.995, -2.545], [111.995, -2.555]]]}, [[112.0, -2.55]]]},
  "/data/kluster_awal.json": {type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [112.001, -2.552]}, properties: {id: "K7001", lat: -2.552, lon: 112.001, ws: 12.5, wd: 135, rh: 50}}]},
};
const aset = async req => { const p = new URL(req.url).pathname; return FIX[p] ? Response.json(FIX[p]) : new Response("tidak ada", {status: 404}); };
const U = await siapkan("uji-pb-karhutla", {asetKu: aset});
const {DB, api} = U;
let n = 0; const id16 = () => (++n).toString(16).padStart(16, "0");   // deterministik
const REK = {cara: [{metode: "Sekat kanal", alasan: "gambut"}], alat: ["Pompa portabel", "Selang 1,5 inci"]};

async function akun() {
  const garam = "g".repeat(32), id = id16(), SANDI = "SandiUji23456789";
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, 'pbuji1', 'pemkab', 'kab', 'Pemerintah Kab Satu', 'uji|pbuji1', '["62"]', '62', 'Kab Satu', ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`).bind(id, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username: "pbuji1", sandi: SANDI}, {...PB, "cf-connecting-ip": "198.51.100.7"}); assert.equal(r.s, 200, r.t);
  return {id, h: {...(await denganProfil(DB, id, {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0]})), ...PB}};   // akun BPBD: sesi profil (paket profil-bpbd)
}
async function tugas(lat, lon, {rek = REK, status = "buka", bencana, extra = {}} = {}) {
  const id = id16(), x = {padam_verif: null, padam_pada: null, verif_pada: null, cek_ulang_pada: null, ...extra};
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, rekomendasi, padam_verif, padam_pada, verif_pada, cek_ulang_pada, dummy) VALUES (?, '62', 'Kab Satu', 'Kec Uji', ?, ?, 3, 10, 50, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
    .bind(id, lat, lon, DASAR, DASAR, status, DASAR + 10 * MENIT, DASAR, rek && JSON.stringify(rek), x.padam_verif, x.padam_pada, x.verif_pada, x.cek_ulang_pada).run();
  if (bencana) await DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bencana).run();
  return id;
}
async function regu(akunId, tid) {
  await DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, orang, token_sha, status, dibuat, kedaluwarsa, berangkat_pada, tiba_pada, selesai_pada) VALUES (?, ?, ?, 'Hendra', 'ketua_regu', 4, ?, 'aktif', ?, 4102444800000, ?, ?, NULL)")
    .bind(id16(), tid, akunId, sha256("tok" + tid), DASAR + 20 * MENIT, DASAR + 30 * MENIT, DASAR + 60 * MENIT).run();
}
async function isian(akunId, tid, langkah, hasil, statusApi, waktu) {
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api, hasil, pic_nama, pic_jabatan, pic_wa, lat, lon, waktu_gps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PIC Uji', 'Kalak', '628111222333', -2.55, 112.0, ?)")
    .bind(id16(), tid, akunId, "klien-" + id16(), langkah, waktu, statusApi, hasil, waktu).run();
}
const bersih = j => { const {kini, ...x} = j; return x; };   // `kini` = jam dinding

test("PB-03: teks dan kolom karhutla beku (awal periode, kluster, angin, riwayat) dan jenis lain tanpa kluster", async () => {
  const A = await akun(), G = {};
  /* K: karhutla dekat kluster K7001, padam terverifikasi, lengkap dengan regu, isian, riwayat */
  const K = await tugas(-2.55, 112.0, {status: "padam", extra: {padam_verif: "padam_terverifikasi", padam_pada: DASAR + 180 * MENIT, verif_pada: DASAR + 230 * MENIT, cek_ulang_pada: DASAR + 250 * MENIT}});
  await regu(A.id, K);
  await isian(A.id, K, "konfirmasi", "api_ada", "bara", DASAR + 15 * MENIT);
  await isian(A.id, K, "tindakan", null, "padam", DASAR + 175 * MENIT);
  G.karhutla_awal = bersih((await api("GET", `/api/ops/periode?tugas_id=${K}`, undefined, A.h)).j).awal;
  const pt = await api("GET", `/api/ops/tugas/${K}`, undefined, A.h); assert.equal(pt.s, 200, pt.t);
  G.karhutla_kluster = {tugas_bencana: pt.j.tugas.bencana, bencana_nama: pt.j.tugas.bencana_nama, kluster: pt.j.kluster, angin: pt.j.angin};
  const li = await api("GET", `/api/ops/linimasa/${K}`, undefined, A.h); assert.equal(li.s, 200, li.t);
  G.karhutla_linimasa = li.j.linimasa.map(x => [x.waktu, x.jenis, x.ket]); G.karhutla_respons = li.j.respons;
  const bp = await api("POST", "/api/ops/periode", {tugas_id: K, mulai: Date.now(), selesai: Date.now() + 12 * JAM}, A.h); assert.equal(bp.s, 201, bp.t);
  G.karhutla_periode_dibuat = {sasaran: bp.j.periode.sasaran, pj: bp.j.periode.pj, alat: bp.j.periode.alat, cuaca: bp.j.periode.cuaca, keselamatan: bp.j.periode.keselamatan, regu: bp.j.periode.regu, status: bp.j.periode.status};
  /* karhutla jauh dari kompleks mana pun, tanpa rekomendasi: tanpa kluster, angin, cuaca; arah angin belum diketahui */
  const J = await tugas(-2.7, 112.7, {rek: null}); await regu(A.id, J);
  G.karhutla_tanpa_kluster = {awal: (await api("GET", `/api/ops/periode?tugas_id=${J}`, undefined, A.h)).j.awal, kluster: (await api("GET", `/api/ops/tugas/${J}`, undefined, A.h)).j};
  G.karhutla_tanpa_kluster.kluster = {kluster: G.karhutla_tanpa_kluster.kluster.kluster, angin: G.karhutla_tanpa_kluster.kluster.angin};
  /* jenis lain di lokasi yang SAMA dengan kluster api: tidak boleh menempel pada api terdekat */
  for (const bc of ["banjir", "gempa"]) {
    const T = await tugas(-2.55, 112.0, {bencana: bc, rek: null}); await regu(A.id, T);
    await isian(A.id, T, "konfirmasi", "api_ada", "bara", DASAR + 15 * MENIT);
    const p = (await api("GET", `/api/ops/tugas/${T}`, undefined, A.h)).j;
    assert.equal(p.kluster, null, `${bc}: tanpa kluster api`); assert.equal(p.angin, null, `${bc}: tanpa angin api`);
    const aw = (await api("GET", `/api/ops/periode?tugas_id=${T}`, undefined, A.h)).j.awal;
    assert.equal(aw.cuaca, null, `${bc}: tanpa cuaca dari kluster`);
    const l = (await api("GET", `/api/ops/linimasa/${T}`, undefined, A.h)).j.linimasa;
    G[`${bc}_lain`] = {bencana: p.tugas.bencana, bencana_nama: p.tugas.bencana_nama, kluster: p.kluster, angin: p.angin, awal: aw, deteksi: l[0].ket};
  }
  /* tabel tugas_bencana: baris karhutla eksplisit sama dengan tanpa baris */
  const E = await tugas(-2.55, 112.0, {bencana: "karhutla"}); const e = (await api("GET", `/api/ops/tugas/${E}`, undefined, A.h)).j;
  assert.equal(e.tugas.bencana, "karhutla"); assert.equal(e.kluster?.id, "K7001");
  /* kabar tindakan non-karhutla memakai kosakata api untuk karhutla */
  G.karhutla_isian_kabar = G.karhutla_linimasa.filter(x => x[1] === "isian_kabar" || x[1] === "isian_konfirmasi");
  if (process.env.BEKUKAN === "1") { writeFileSync(GOLDEN, JSON.stringify(G, null, 2) + "\n"); return; }
  assert.ok(existsSync(GOLDEN), "golden tidak ada: tests/warga/fixtures/pb_karhutla_golden.json hilang; bekukan hanya dari kode karhutla yang benar dengan BEKUKAN=1");
  assert.deepEqual(JSON.parse(JSON.stringify(G)), JSON.parse(readFileSync(GOLDEN, "utf8")), "keluaran karhutla/jenis lain berubah dari golden PB-03");
});
