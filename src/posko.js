/* Ruang Posko: regu lapangan berkode -> laporan regu -> neraca harian; antrean panggilan perusahaan dari titik api di konsesi; templat paparan.
   Skema: migrations/0018_posko.sql. Aturan pemilik (19 Okt 2026):
   - Regu tanpa akun: admin membuat regu, sistem memberi KODE acak (26 hex); hanya sha256 kode disimpan, bisa dicabut.
   - Alert titik api di konsesi hanya MASUK ANTREAN (buatAntrean, cron). Admin yang menekan kirim (email Resend / tautan wa.me).
     TIDAK ada kiriman otomatis ke perusahaan. Batas respons = dipanggil + 2 jam.
   - Kontak perusahaan diinput admin; tidak pernah ada di rute publik (publik hanya /api/neraca dan /api/paparan/templat).
   ponytail: buatAntrean mengurai konsesi2026/<prov>.json (~2,5 MB) per provinsi bertitik; di Workers Free (CPU 10 ms) bisa tak muat,
   karena itu ia jalan di invokasi cron SENDIRI (menit 16). Bila terpotong: pecah per provinsi atau indeks bbox statis. */
import {json, gagal, acak, sha, adminOK, bacaBody, bacaBytes, cacheTepi, normalWA, dekatApi, ipHash, gagalSudahBanyak, catatGagal} from "./worker.js";
import {wilayah, cariWilayah, dalam} from "./titik.js";
import {jenisBerkas} from "./foto.js";
import {nilaiGps} from "./gps.js";
import {halamanAdmin} from "./statistik.js";
import {halamanPosko, HALAMAN_STAF} from "./admin_halaman.js";
import {modAtauStaf, stafPeran, dalamWilayahStaf, dariStaf, stafNyata, P_KONSESI} from "./staf.js";   // peran analis_konsesi = jalur tambahan untuk kontak PT dan panggilan (staf.js)

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, BATAS_RESPONS = 2 * JAM;
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
/* daftar tetap: sama dengan CHECK/trigger di 0018 dan public/lapangan.js (dijaga posko.test.mjs) */
export const UNSUR = ["BPBD", "Manggala Agni", "TNI", "Polri", "MPA", "Damkar", "Perusahaan", "Relawan", "Lainnya"];
export const STATUS_LAP = ["menyala", "bara", "padam", "tidak_ditemukan"];
export const KENDALA = {air_jauh: "Air jauh", akses_sulit_rawa: "Akses sulit di rawa", roda_empat_sulit: "Roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup",
  asap_tebal: "Asap tebal", angin_kencang: "Angin kencang"};
export const SUMBER_AIR = ["sungai", "kanal", "embung", "sumur_bor", "hidran", "mobil_tangki", "tidak_ada", "lainnya"];
export const STATUS_PANGGILAN = ["baru", "dipanggil", "direspons", "dicek", "tindak_lanjut", "selesai", "abaikan"];
const MAKS_FOTO = 1.5 * 1048576, MAKS_HA = 5000, LAJU_KAB = 300, MAKS_GAGAL_KODE = 300, LAJU_FOTO = 30, RETENSI_NERACA_HARI = 400, MAKS_CSV = 65536, MAKS_TEMPLAT = 65536, LAJU_REGU = 60;   // laporan per regu per jam

export const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
export const KONTROL = /[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
/* teks bersih (NFC, tanpa karakter kontrol/bidi, dipangkas); null bila kosong, undefined bila lewat batas */
export const tx = (v, maks) => { if (v == null) return null; if (typeof v !== "string") return undefined; const s = v.normalize("NFC").replace(KONTROL, "").trim(); return s.length > maks ? undefined : s || null; };
/* angka: kosong -> null, bukan angka/di luar rentang -> NaN */
export const num = (v, min, maks, bulat) => { if (v == null || v === "") return null; const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= maks && (!bulat || Number.isInteger(n)) ? n : NaN; };
export const RE_PROV = /^\d{2}$/, RE_TGL = /^\d{4}-[01]\d-[0-3]\d$/, RE_PID = /^[A-Za-z0-9._-]{3,80}$/;
export const tglSah = t => RE_TGL.test(t) && !Number.isNaN(Date.parse(t + "T00:00:00Z")) && new Date(t + "T00:00:00Z").toISOString().slice(0, 10) === t;
const kendalaSah = k => Array.isArray(k) && k.length <= 6 && k.every(x => typeof x === "string" && Object.hasOwn(KENDALA, x)) && new Set(k).size === k.length;
const adm = async (env, req) => (await adminOK(env, req)) || null;
/* peran: adminOK mengembalikan 12 hex awal sha256 entri ADMIN_TOKEN/AKUN_SITUS yang cocok. Akun gerbang situs (AKUN_SITUS) boleh admin biasa,
   tapi bukan kontak PT / kirim ke perusahaan (modOK). Super Admin = awalan yang tercantum di secret SUPER_ADMIN (koma); kosong = dummy tertutup. */
export const awalan = async d => new Set((await Promise.all(String(d || "").split(",").map(x => x.trim()).filter(Boolean).map(sha))).map(a => a.slice(0, 12)));
export const modOK = async (env, req) => {
  const m = await adminOK(env, req); if (!m) return null;
  return (await awalan(env.AKUN_SITUS)).has(m) && !(await awalan(env.ADMIN_TOKEN)).has(m) ? null : m;
};
export const superOK = async (env, req) => {
  const m = await modOK(env, req); if (!m) return null;
  return new Set(String(env.SUPER_ADMIN || "").split(",").map(x => x.trim().toLowerCase()).filter(x => /^[0-9a-f]{12}$/.test(x))).has(m) ? m : null;
};
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas (bukan akun gerbang situs)");
const tolakAdmin = () => gagal(403, "akses ditolak");

/* ================================================================ regu (kode) */
/* kembalikan baris regu, atau Response galat. Tebakan kode dihitung per IP (hash bergaram) SEBELUM lookup D1: > MAKS_GAGAL_KODE per jam = 429. */
export async function reguDari(env, req, kini = Date.now()) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const ip = await ipHash(env, req);
  if (await gagalSudahBanyak(env, ip, "kode_gagal", MAKS_GAGAL_KODE, kini)) return gagal(429, "terlalu banyak kode salah dari jaringan ini; coba lagi nanti", {"retry-after": "3600"});
  const k = (req.headers.get("x-kode-regu") || "").trim().toLowerCase();
  const r = /^[0-9a-f]{26}$/.test(k) ? await env.DB.prepare("SELECT id, nama, unsur, prov, kab, perusahaan_id, dicabut FROM regu WHERE kode_sha = ?").bind(await sha(k)).first() : null;
  if (r && !r.dicabut) return r;
  await catatGagal(env, ip, "kode_gagal", kini);
  return kodeTolak();   // tidak dikenal dan dicabut dijawab sama: tidak membocorkan kode mana yang pernah sah
}
const kodeTolak = () => gagal(403, "kode regu tidak berlaku (salah atau sudah dicabut); minta tautan baru dari posko");

async function buatRegu(env, req, url, kini) {
  const mod = await adm(env, req); if (!mod) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = tx(b.o.nama, 80), kab = tx(b.o.kab, 60), pid = tx(b.o.perusahaan_id, 80);
  if (!nama || nama.length < 2) return gagal(400, "nama regu 2-80 karakter");
  if (!UNSUR.includes(b.o.unsur)) return gagal(400, `unsur harus salah satu dari ${UNSUR.join(", ")}`);
  if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  if (!kab || kab.length < 2) return gagal(400, "kabupaten/kota 2-60 karakter");
  if (pid != null && !RE_PID.test(pid)) return gagal(400, "perusahaan_id tidak sah (3-80 huruf, angka, titik, garis)");
  const id = acak(8), kode = acak(13);
  await env.DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, perusahaan_id, kode_sha, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, nama, b.o.unsur, b.o.prov, kab, pid, await sha(kode), kini, mod).run();
  /* kode hanya ditampilkan SEKALI di sini; di fragmen (#k=) supaya tidak masuk log server */
  return json({regu: {id, nama, unsur: b.o.unsur, prov: b.o.prov, kab, perusahaan_id: pid, dibuat: kini, dicabut: null}, kode, tautan: `${url.origin}/lapangan#k=${kode}`}, 201);
}
async function daftarRegu(env, req) {
  if (!await adm(env, req)) return tolakAdmin();
  return json({regu: (await env.DB.prepare(`SELECT r.id, r.nama, r.unsur, r.prov, r.kab, r.perusahaan_id, r.dibuat, r.dicabut, r.dummy,
    (SELECT count(*) FROM lapangan l WHERE l.regu_id = r.id) laporan, (SELECT max(l.dibuat) FROM lapangan l WHERE l.regu_id = r.id) terakhir
    FROM regu r ORDER BY r.dibuat DESC LIMIT 300`).all()).results, unsur: UNSUR});
}
async function cabutRegu(env, req, id, kini) {
  if (!await adm(env, req)) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "cabut") return gagal(400, "aksi harus cabut");
  const r = await env.DB.prepare("UPDATE regu SET dicabut = ? WHERE id = ? AND dicabut IS NULL").bind(kini, id).run();
  if (r.meta.changes) return json({id, dicabut: kini});
  return await env.DB.prepare("SELECT 1 FROM regu WHERE id = ?").bind(id).first() ? gagal(409, "kode regu ini sudah dicabut") : gagal(404, "regu tidak ada");
}

/* ================================================================ neraca (agregat regu dihitung ulang tiap laporan; rakor menang) */
/* kabupaten yang punya laporan ASLI hanya menghitung yang asli (dummy tidak boleh mengotori angka sungguhan); tanpa itu baru dummy yang dihitung.
   satu laporan terbaru per (regu, sel ~1 km: lintang/bujur 2 desimal): laporan susulan di titik yang sama mengganti, bukan menambah. personel = maks per regu, dijumlah antarregu.
   fs = laporan selain tidak_ditemukan. HAVING: tanpa laporan tidak ada baris. */
const SAH = "id NOT IN (SELECT lapangan_id FROM lapangan_tahan WHERE putusan = 'tahan')";   // laporan ditahan tidak ikut neraca
const SQL_AGREGAT = `WITH u AS (SELECT *, row_number() OVER (PARTITION BY regu_id, round(lat, 2), round(lon, 2) ORDER BY waktu DESC, dibuat DESC) rn
    FROM lapangan WHERE tgl = ?1 AND prov = ?2 AND kab = ?3 AND ${SAH}
      AND dummy = (SELECT min(dummy) FROM lapangan WHERE tgl = ?1 AND prov = ?2 AND kab = ?3 AND ${SAH})),
  l AS (SELECT * FROM u WHERE rn = 1),
  p AS (SELECT sum(n) n FROM (SELECT max(personel) n FROM l GROUP BY regu_id))
INSERT INTO neraca_harian (tgl, prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala, diubah, dummy)
SELECT ?1, ?2, ?3, 'regu', sum(status != 'tidak_ditemukan'), round(coalesce(sum(luas_ha), 0), 2), round(coalesce(sum(padam_ha), 0), 2),
  round(round(coalesce(sum(luas_ha), 0), 2) - round(coalesce(sum(padam_ha), 0), 2), 2), coalesce((SELECT n FROM p), 0),
  (SELECT coalesce(json_group_array(v), '[]') FROM (SELECT DISTINCT j.value v FROM l, json_each(l.kendala) j ORDER BY v)), ?4, min(dummy)
FROM l WHERE 1 HAVING count(*) > 0
ON CONFLICT (tgl, prov, kab, sumber) DO UPDATE SET fs = excluded.fs, luas_ha = excluded.luas_ha, padam_ha = excluded.padam_ha, sisa_ha = excluded.sisa_ha,
  personel = excluded.personel, kendala = excluded.kendala, diubah = excluded.diubah, dummy = excluded.dummy`;
const agregat = (env, tgl, prov, kab, kini) => env.DB.prepare(SQL_AGREGAT).bind(tgl, prov, kab, kini);

const KOLOM_NERACA = "kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala";
const barisNeraca = r => ({...r, kendala: JSON.parse(r.kendala)});
function jumlahNeraca(baris) {
  const t = {fs: 0, luas_ha: 0, padam_ha: 0, sisa_ha: 0, personel: 0}, kd = new Set();
  for (const r of baris) { for (const k of Object.keys(t)) t[k] += r[k]; r.kendala.forEach(x => kd.add(x)); }
  for (const k of ["luas_ha", "padam_ha", "sisa_ha"]) t[k] = Math.round(t[k] * 100) / 100;
  return {...t, kendala: Object.keys(KENDALA).filter(k => kd.has(k))};
}
/* publik: angka agregat per kabupaten saja (tanpa regu, tanpa catatan). Dummy hanya tampak untuk admin dengan ?dummy=1. */
async function neracaPublik(env, req, url, kini, ctx) {
  const prov = url.searchParams.get("prov") || "", tgl = url.searchParams.get("tgl") || wib(kini), dummy = url.searchParams.get("dummy") === "1" && !!await adm(env, req);
  if (!RE_PROV.test(prov)) return gagal(400, "prov wajib: kode provinsi 2 digit, mis. ?prov=62");
  if (!tglSah(tgl) || tgl < wib(kini - RETENSI_NERACA_HARI * HARI) || tgl > wib(kini + HARI)) return gagal(400, `tgl harus YYYY-MM-DD dalam jendela ${RETENSI_NERACA_HARI} hari terakhir (sama dengan retensi)`);
  const ambil = async () => {
    const baris = (await env.DB.prepare(`SELECT ${KOLOM_NERACA} FROM neraca_harian n WHERE tgl = ?1 AND prov = ?2 ${dummy ? "" : "AND dummy = 0"}
      AND (sumber = 'rakor' OR NOT EXISTS (SELECT 1 FROM neraca_harian r WHERE r.tgl = n.tgl AND r.prov = n.prov AND r.kab = n.kab AND r.sumber = 'rakor' ${dummy ? "" : "AND r.dummy = 0"}))
      ORDER BY kab`).bind(tgl, prov).all()).results.map(barisNeraca);
    return json({tgl, prov, kab: baris, total: jumlahNeraca(baris), kendala_nama: KENDALA});
  };
  if (dummy) return ambil();
  /* kunci cache hanya prov+tgl: parameter lain tidak memecah cache */
  return cacheTepi(new Request(new URL(`/api/neraca?prov=${prov}&tgl=${tgl}`, url), {method: "GET"}), ctx, 30, ambil);
}
async function neracaAdmin(env, req, url, kini) {
  if (!await adm(env, req)) return tolakAdmin();
  const tgl = url.searchParams.get("tgl") || wib(kini); if (!tglSah(tgl)) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  const baris = (await env.DB.prepare("SELECT prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala, catatan, diubah, oleh, dummy FROM neraca_harian WHERE tgl = ? ORDER BY prov, kab, sumber").bind(tgl).all()).results;
  return json({tgl, baris: baris.map(r => ({...r, kendala: JSON.parse(r.kendala)})), kendala_nama: KENDALA});
}
async function simpanRakor(env, req, kini) {
  const mod = await adm(env, req); if (!mod) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, kab0 = tx(o.kab, 60), catatan = tx(o.catatan, 500);
  if (typeof o.tgl !== "string" || !tglSah(o.tgl)) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return gagal(400, "prov harus kode provinsi 2 digit");
  if (!kab0 || kab0.length < 2) return gagal(400, "kabupaten/kota 2-60 karakter");
  if (catatan === undefined) return gagal(400, "catatan maksimal 500 karakter");
  const fs = num(o.fs, 0, 100000, true), luas = num(o.luas_ha, 0, 1e6), padam = num(o.padam_ha, 0, 1e6), personel = num(o.personel, 0, 100000, true);
  let sisa = num(o.sisa_ha, 0, 1e6);
  if ([fs, luas, padam, personel, sisa].some(Number.isNaN)) return gagal(400, "fs/personel bilangan bulat >= 0 dan luas/padam/sisa angka >= 0 (masuk akal)");
  const L = luas ?? 0, P = padam ?? 0;
  if (P > L) return gagal(400, `dipadamkan ${P} ha melebihi luas ${L} ha`);
  if (sisa == null) sisa = Math.round((L - P) * 100) / 100;
  else if (Math.abs(L - P - sisa) > 1) return gagal(400, `sisa ${sisa} ha tidak cocok dengan luas ${L} - dipadamkan ${P} (selisih maksimal 1 ha)`);
  const kendala = o.kendala ?? [];
  if (!kendalaSah(kendala)) return gagal(400, `kendala harus larik dari: ${Object.keys(KENDALA).join(", ")}`);
  /* ejaan kabupaten mengikuti agregat regu hari itu (tanpa beda huruf besar/kecil), supaya rakor benar-benar menimpa baris regu yang sama */
  const ada = await env.DB.prepare("SELECT kab FROM neraca_harian WHERE tgl = ? AND prov = ? AND lower(kab) = lower(?) LIMIT 1").bind(o.tgl, o.prov, kab0).first(), kab = ada?.kab ?? kab0;
  await env.DB.prepare(`INSERT INTO neraca_harian (tgl, prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala, catatan, diubah, oleh) VALUES (?, ?, ?, 'rakor', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (tgl, prov, kab, sumber) DO UPDATE SET fs = excluded.fs, luas_ha = excluded.luas_ha, padam_ha = excluded.padam_ha, sisa_ha = excluded.sisa_ha, personel = excluded.personel,
      kendala = excluded.kendala, catatan = excluded.catatan, diubah = excluded.diubah, oleh = excluded.oleh, dummy = 0`)
    .bind(o.tgl, o.prov, kab, fs ?? 0, L, P, sisa, personel ?? 0, JSON.stringify(kendala), catatan, kini, mod).run();
  return json({ok: true, tgl: o.tgl, prov: o.prov, kab, sumber: "rakor"}, 201);
}
async function hapusRakor(env, req) {
  if (!await adm(env, req)) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.tgl !== "string" || !tglSah(b.o.tgl) || typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov) || typeof b.o.kab !== "string") return gagal(400, "tgl, prov, kab wajib");
  const r = await env.DB.prepare("DELETE FROM neraca_harian WHERE tgl = ? AND prov = ? AND kab = ? AND sumber = 'rakor'").bind(b.o.tgl, b.o.prov, b.o.kab).run();
  return r.meta.changes ? json({ok: true}) : gagal(404, "isian rakor tidak ada");
}

/* ================================================================ laporan regu */
const kunciIdem = s => typeof s === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(s);
async function lapor(env, req, url, kini) {
  const regu = await reguDari(env, req); if (regu instanceof Response) return regu;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!kunciIdem(o.klien_id)) return gagal(400, "klien_id wajib: 8-40 huruf/angka/garis (kunci kirim ulang draf)");
  const ulang = async () => { const x = await env.DB.prepare("SELECT id FROM lapangan WHERE regu_id = ? AND klien_id = ?").bind(regu.id, o.klien_id).first(); return x && json({id: x.id, ulang: true}); };
  { const u = await ulang(); if (u) return u; }
  if (!STATUS_LAP.includes(o.status)) return gagal(400, `status harus ${STATUS_LAP.join("/")}`);
  const lat = num(o.lat, BBOX.latMin, BBOX.latMaks), lon = num(o.lon, BBOX.lonMin, BBOX.lonMaks), akurasi = num(o.akurasi, 0, 1000), waktu = num(o.waktu_gps, kini - 6 * JAM, kini + MENIT);
  if (lat == null || lon == null || akurasi == null || waktu == null || [lat, lon, akurasi, waktu].some(Number.isNaN))
    return gagal(400, "lokasi GPS wajib di dalam Indonesia: lat, lon, akurasi <= 1000 m, waktu_gps maksimal 6 jam lalu");
  const luas = num(o.luas_ha, 0, MAKS_HA), padam = num(o.padam_ha, 0, MAKS_HA), personel = num(o.personel, 0, 1000, true);
  if ([luas, padam, personel].some(Number.isNaN)) return gagal(400, `luas_ha/padam_ha 0-${MAKS_HA} ha per laporan, personel bilangan bulat 0-1000`);
  if (padam != null && (luas == null || padam > luas)) return gagal(400, "dipadamkan wajib disertai luas dan tidak boleh melebihi luas");
  const kendala = o.kendala ?? [];
  if (!kendalaSah(kendala)) return gagal(400, `kendala harus larik dari: ${Object.keys(KENDALA).join(", ")}`);
  if (o.sumber_air != null && o.sumber_air !== "" && !SUMBER_AIR.includes(o.sumber_air)) return gagal(400, `sumber_air harus ${SUMBER_AIR.join("/")}`);
  const catatan = tx(o.catatan, 500); if (catatan === undefined) return gagal(400, "catatan maksimal 500 karakter");
  const sebelum = await env.DB.prepare("SELECT lat, lon, dibuat FROM lapangan WHERE regu_id = ? AND dibuat > ? AND dummy = 0 ORDER BY dibuat DESC LIMIT 1").bind(regu.id, kini - HARI).first();
  const sampel = Array.isArray(o.sampel) ? JSON.stringify(o.sampel) : o.sampel;
  const gps = nilaiGps({negara: req.cf?.country, lat, lon, waktuGps: waktu, sampel, sebelum, kini});   // pola anti-palsu yang sama dengan foto warga
  if (gps.tolak) return gagal(400, gps.tolak);
  const k = cariWilayah(await wilayah(env), lat, lon), [prov, kab] = k ? k.split("|") : [regu.prov, regu.kab];   // di laut/perbatasan: wilayah regu
  /* pencilan: luas > 10x median laporan kabupaten ini 7 hari (lantai 50 ha), atau > 1000 ha bila belum ada pembanding -> ditahan dari neraca sampai admin setuju */
  let tahan = null;
  if (luas != null) {
    const ls = (await env.DB.prepare(`SELECT luas_ha FROM lapangan WHERE prov = ? AND kab = ? AND waktu > ? AND luas_ha IS NOT NULL AND dummy = 0 AND ${SAH} ORDER BY luas_ha LIMIT 500`).bind(prov, kab, kini - 7 * HARI).all()).results.map(x => x.luas_ha);
    const med = ls.length ? (ls[(ls.length - 1) >> 1] + ls[ls.length >> 1]) / 2 : null, batas = med == null ? 1000 : Math.max(10 * med, 50);
    if (luas > batas) tahan = `luas ${luas} ha melebihi ${Math.round(batas)} ha (${med == null ? "belum ada pembanding" : "10x median 7 hari"})`;
  }
  const {laci} = await dekatApi(env, url, lat, lon, kini).catch(() => ({laci: null}));
  const id = acak(8), tgl = wib(waktu), la = Math.round(lat * 1e5) / 1e5, lo = Math.round(lon * 1e5) / 1e5;
  /* batas laju ATOMIK: INSERT..SELECT..WHERE hitungan < batas dalam satu pernyataan (cek-lalu-sisip bisa dilompati kiriman serentak) */
  let hasil;
  try {
    hasil = await env.DB.batch([env.DB.prepare(`INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, akurasi, status, luas_ha, padam_ha, personel, kendala, sumber_air,
      catatan, prov, kab, kompleks_id, gps_curiga) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT count(*) FROM lapangan WHERE regu_id = ?21 AND dibuat > ?22) < ?23 AND (SELECT count(*) FROM lapangan WHERE tgl = ?4 AND prov = ?17 AND kab = ?18) < ?24`)
      .bind(id, regu.id, o.klien_id, tgl, waktu, kini, la, lo, Math.round(akurasi), o.status, luas, padam, personel, JSON.stringify(kendala), o.sumber_air || null, catatan, prov, kab, laci ?? null,
        gps.curiga.length ? gps.curiga.join(" · ").slice(0, 600) : null, regu.id, kini - JAM, LAJU_REGU, LAJU_KAB),
      ...(tahan ? [env.DB.prepare("INSERT INTO lapangan_tahan (lapangan_id, alasan, putusan, waktu) SELECT ?1, ?2, 'tahan', ?3 WHERE EXISTS (SELECT 1 FROM lapangan WHERE id = ?1)").bind(id, tahan, kini)] : []),
      agregat(env, tgl, prov, kab, kini)]);
  } catch (e) { if (/UNIQUE/i.test(String(e.message || e))) { const u = await ulang(); if (u) return u; } throw e; }   // dua kiriman serentak dengan klien_id sama
  if (!hasil[0].meta.changes) return gagal(429, `batas laporan tercapai: ${LAJU_REGU} per jam untuk satu regu atau ${LAJU_KAB} per kabupaten per hari`, {"retry-after": "600"});
  return json({id, prov, kab, kompleks_id: laci ?? null, ditahan: !!tahan}, 201);
}
/* JPEG: buang segmen APP1 (EXIF/XMP, memuat GPS dan perangkat) dan APP13 sebelum SOS. Struktur janggal = berkas apa adanya. */
export function buangExif(b) {
  const out = [b.subarray(0, 2)]; let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b;
    const m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (m === 0xd8 || len < 2) return b;
    if (m === 0xda) { out.push(b.subarray(i)); i = b.length; break; }   // SOS: sisanya data gambar
    if (i + 2 + len > b.length) return b;
    if (m !== 0xe1 && m !== 0xed) out.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  if (i < b.length) out.push(b.subarray(i));
  const r = new Uint8Array(out.reduce((a, x) => a + x.length, 0)); let p = 0; for (const x of out) { r.set(x, p); p += x.length; }
  return r;
}
async function fotoLapor(env, req, id, kini) {
  const regu = await reguDari(env, req); if (regu instanceof Response) return regu;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum aktif (R2 MEDIA); laporan tetap tersimpan tanpa foto");
  const r = await env.DB.prepare("SELECT foto FROM lapangan WHERE id = ? AND regu_id = ?").bind(id, regu.id).first();
  if (!r) return gagal(404, "laporan tidak ada");
  if (r.foto) return gagal(409, "laporan ini sudah punya foto");
  const u = await bacaBytes(req, MAKS_FOTO); if (u.galat) return gagal(u.status || 400, u.galat);   // dihitung per byte: chunked tanpa Content-Length pun terkena 413
  let b = u.b;
  const mime = jenisBerkas(b); if (mime !== "image/jpeg" && mime !== "image/webp") return gagal(400, "berkas harus foto JPEG atau WebP");
  const q = await env.DB.prepare("INSERT INTO laju_posko (kunci, aksi, waktu) SELECT ?1, 'foto', ?2 WHERE (SELECT count(*) FROM laju_posko WHERE kunci = ?1 AND aksi = 'foto' AND waktu > ?3) < ?4").bind(regu.id, kini, kini - JAM, LAJU_FOTO).run();
  if (!q.meta.changes) return gagal(429, `batas ${LAJU_FOTO} foto per jam untuk satu regu tercapai`, {"retry-after": "900"});
  if (mime === "image/jpeg") b = buangExif(b);   // WebP: metadata tidak dibuang (keterbatasan; klien mengecilkan lewat canvas yang membuangnya)
  await env.MEDIA.put(`lapangan/${id}`, b, {httpMetadata: {contentType: mime}});
  try { await env.DB.prepare("UPDATE lapangan SET foto = 1 WHERE id = ?").bind(id).run(); }
  catch (e) { await env.MEDIA.delete(`lapangan/${id}`); throw e; }   // baris gagal = berkas jangan yatim
  return json({id, foto: true});
}
async function fotoAdmin(env, req, id) {
  if (!await adm(env, req)) return tolakAdmin();
  const r = await env.DB.prepare("SELECT foto FROM lapangan WHERE id = ?").bind(id).first();
  const o = r?.foto && env.MEDIA ? await env.MEDIA.get(`lapangan/${id}`) : null;
  return o ? new Response(o.body, {headers: {"content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff"}}) : gagal(404, "foto tidak ada");
}
async function daftarLapangan(env, req, url, kini) {
  if (!await adm(env, req)) return tolakAdmin();
  const tgl = url.searchParams.get("tgl") || wib(kini); if (!tglSah(tgl)) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  return json({tgl, laporan: (await env.DB.prepare(`SELECT l.id, l.tgl, l.waktu, l.dibuat, l.lat, l.lon, l.akurasi, l.status, l.luas_ha, l.padam_ha, l.personel, l.kendala, l.sumber_air, l.catatan, l.foto,
    l.prov, l.kab, l.kompleks_id, l.gps_curiga, l.dummy, r.nama regu, r.unsur, (SELECT putusan FROM lapangan_tahan WHERE lapangan_id = l.id) putusan, (SELECT alasan FROM lapangan_tahan WHERE lapangan_id = l.id) alasan_tahan FROM lapangan l JOIN regu r ON r.id = l.regu_id WHERE l.tgl = ? ORDER BY l.waktu DESC LIMIT 500`).bind(tgl).all())
    .results.map(x => ({...x, kendala: JSON.parse(x.kendala)})), kendala_nama: KENDALA});
}

/* admin memutuskan laporan pencilan: setuju = ikut neraca, tahan = dikeluarkan; neraca regu kabupaten itu dihitung ulang */
async function putusLapangan(env, req, id, kini) {
  const mod = await adm(env, req); if (!mod) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "setuju" && b.o.aksi !== "tahan") return gagal(400, "aksi harus setuju atau tahan");
  const l = await env.DB.prepare("SELECT tgl, prov, kab FROM lapangan WHERE id = ?").bind(id).first(); if (!l) return gagal(404, "laporan tidak ada");
  await env.DB.batch([env.DB.prepare(`INSERT INTO lapangan_tahan (lapangan_id, alasan, putusan, waktu, oleh) VALUES (?1, 'diputuskan admin', ?2, ?3, ?4)
      ON CONFLICT (lapangan_id) DO UPDATE SET putusan = excluded.putusan, waktu = excluded.waktu, oleh = excluded.oleh`).bind(id, b.o.aksi, kini, mod),
    env.DB.prepare("DELETE FROM neraca_harian WHERE tgl = ? AND prov = ? AND kab = ? AND sumber = 'regu'").bind(l.tgl, l.prov, l.kab), agregat(env, l.tgl, l.prov, l.kab, kini)]);
  return json({id, putusan: b.o.aksi});
}

/* ================================================================ kontak perusahaan (hanya admin) */
export const RE_EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
export function cekKontak(o) {
  const v = {perusahaan_id: tx(o.perusahaan_id, 80), nama_pt: tx(o.nama_pt, 120), kontak: tx(o.kontak, 80), email: tx(o.email, 254)?.toLowerCase() ?? null, wa: null, telepon: tx(o.telepon, 20), catatan: tx(o.catatan, 300)};
  if (!v.perusahaan_id || !RE_PID.test(v.perusahaan_id)) return {galat: "perusahaan_id wajib (3-80 huruf, angka, titik, garis; id dari konsesi2026)"};
  if (!v.nama_pt || v.nama_pt.length < 2) return {galat: "nama_pt wajib (2-120 karakter)"};
  if ([v.kontak, v.email, v.telepon, v.catatan].includes(undefined)) return {galat: "kontak maks 80, email maks 254, telepon maks 20, catatan maks 300 karakter"};
  if (v.email && !RE_EMAIL.test(v.email)) return {galat: `email '${v.email}' tidak sah`};
  const wa = tx(o.wa, 30); if (wa === undefined) return {galat: "wa terlalu panjang"};
  if (wa) { v.wa = normalWA(wa); if (!v.wa) return {galat: `nomor WhatsApp '${wa}' tidak sah (contoh 0812xxxxxxx)`}; }
  if (v.telepon && !/^[0-9+ -]{5,20}$/.test(v.telepon)) return {galat: `telepon '${v.telepon}' tidak sah (angka, +, spasi, garis; 5-20 karakter)`};
  if (!v.email && !v.wa && !v.telepon) return {galat: "isi minimal satu: email, wa, atau telepon"};
  return {v};
}
const SQL_KONTAK = `INSERT INTO kontak_pt (id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, diubah, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (perusahaan_id) DO UPDATE SET nama_pt = excluded.nama_pt, kontak = excluded.kontak, email = excluded.email, wa = excluded.wa, telepon = excluded.telepon,
    catatan = excluded.catatan, diubah = excluded.diubah, oleh = excluded.oleh, dummy = 0`;
export const simpanKontak = (env, v, kini, mod) => env.DB.prepare(SQL_KONTAK).bind(acak(8), v.perusahaan_id, v.nama_pt, v.kontak, v.email, v.wa, v.telepon, v.catatan, kini, mod);
/* staf berwilayah hanya menyentuh kontak perusahaan yang punya panggilan di provinsi wilayahnya; modOK dan staf nasional: semua */
async function perusahaanDalamWilayah(env, req, pid) {
  const provs = (await env.DB.prepare("SELECT DISTINCT prov FROM panggilan WHERE perusahaan_id = ?").bind(pid).all()).results.map(r => r.prov);
  return dalamWilayahStaf(req, provs);
}
async function tambahKontak(env, req, kini) {
  const mod = await modAtauStaf(env, req, P_KONSESI); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekKontak(b.o); if (c.galat) return gagal(400, c.galat);
  if (!await perusahaanDalamWilayah(env, req, c.v.perusahaan_id)) return gagal(404, "perusahaan tidak ada di wilayah Anda");
  await simpanKontak(env, c.v, kini, mod).run();
  return json({kontak: await env.DB.prepare("SELECT id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, diubah, dummy FROM kontak_pt WHERE perusahaan_id = ?").bind(c.v.perusahaan_id).first()}, 201);
}
/* CSV: baris pertama = kepala (wajib perusahaan_id dan nama_pt; opsional kontak,email,wa,telepon,catatan), pemisah , atau ;, kutip ganda untuk isi bertanda baca */
export function uraiCsvKontak(teks) {
  const baris = []; let b = [], f = "", q = false;
  const s = String(teks).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";") { b.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; b.push(f); f = ""; if (b.some(x => x.trim())) baris.push(b); b = []; }
    else f += c;
  }
  b.push(f); if (b.some(x => x.trim())) baris.push(b);
  return baris;
}
async function imporKontak(env, req, kini) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req, MAKS_CSV + 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.csv !== "string" || !b.o.csv.trim()) return gagal(400, "csv wajib (teks CSV dengan baris kepala)");
  if (b.o.csv.length > MAKS_CSV) return gagal(413, `csv ${b.o.csv.length} karakter, maksimal ${MAKS_CSV}`);
  const [kepala, ...isi] = uraiCsvKontak(b.o.csv), kol = (kepala || []).map(x => x.trim().toLowerCase());
  if (!kol.includes("perusahaan_id") || !kol.includes("nama_pt")) return gagal(400, "baris kepala wajib memuat perusahaan_id dan nama_pt");
  const dikenal = ["perusahaan_id", "nama_pt", "kontak", "email", "wa", "telepon", "catatan"], asing = kol.filter(k => !dikenal.includes(k));
  if (asing.length) return gagal(400, `kolom tidak dikenal: ${asing.join(", ")} (boleh: ${dikenal.join(", ")})`);
  if (!isi.length) return gagal(400, "csv tidak punya baris data");
  if (isi.length > 300) return gagal(400, `${isi.length} baris; maksimal 300 per impor`);
  const galat = [], ok = [], lihat = new Set();
  isi.forEach((r, i) => {
    const c = cekKontak(Object.fromEntries(kol.map((k, j) => [k, r[j] ?? ""])));
    if (c.galat) galat.push(`baris ${i + 2}: ${c.galat}`); else if (lihat.has(c.v.perusahaan_id)) galat.push(`baris ${i + 2}: perusahaan_id ${c.v.perusahaan_id} berulang`);
    else { lihat.add(c.v.perusahaan_id); ok.push(c.v); }
  });
  if (galat.length) return json({galat: `${galat.length} baris salah; tidak ada yang diimpor`, rincian: galat.slice(0, 20)}, 400);   // semua-atau-tidak-sama-sekali
  for (let i = 0; i < ok.length; i += 50) await env.DB.batch(ok.slice(i, i + 50).map(v => simpanKontak(env, v, kini, mod)));
  return json({diimpor: ok.length}, 201);
}
async function daftarKontak(env, req) {
  if (!await modAtauStaf(env, req, P_KONSESI)) return tolakMod();
  const prov = new Map();
  for (const r of (await env.DB.prepare("SELECT DISTINCT perusahaan_id, prov FROM panggilan").all()).results) (prov.get(r.perusahaan_id) || prov.set(r.perusahaan_id, []).get(r.perusahaan_id)).push(r.prov);
  return json({kontak: (await env.DB.prepare("SELECT id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, diubah, dummy FROM kontak_pt ORDER BY nama_pt LIMIT 1000").all()).results
    .filter(k => dalamWilayahStaf(req, prov.get(k.perusahaan_id) || []) && !(stafNyata(req) && k.dummy))});
}
async function hapusKontak(env, req, id) {
  if (!await modOK(env, req)) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "hapus") return gagal(400, "aksi harus hapus");
  const r = await env.DB.prepare("DELETE FROM kontak_pt WHERE id = ?").bind(id).run();
  return r.meta.changes ? json({ok: true}) : gagal(404, "kontak tidak ada");
}

/* ================================================================ panggilan (admin menekan kirim; tidak ada kiriman otomatis) */
const emailSiap = env => !!(env.EMAIL_API_KEY && env.EMAIL_FROM);
const jamWIB = t => new Date(t).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}) + " WIB";
export function pesanPanggilan(p, batas, tambahan = "") {
  const lokasi = p.lat != null ? ` (sekitar ${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)})` : "";
  const isi = `Yth. Bapak/Ibu pengelola ${p.nama_pt}. Posko Karhutla mendeteksi ${p.titik_n} titik panas (satelit NASA FIRMS) di dalam area konsesi ${p.nama_pt}, ${p.kab}, tanggal ${p.tanggal}${lokasi}. ` +
    `Mohon segera mengonfirmasi penanganan dan mengirim tim ke lokasi. Batas respons: ${jamWIB(batas)} (2 jam sejak pesan ini). Terima kasih.`;
  const teks = tambahan ? `${isi}\n\n${tambahan}` : isi;
  return {subject: `[Posko Karhutla] ${p.titik_n} titik panas di konsesi ${p.nama_pt} (${p.tanggal})`, teks,
    html: `<p style="font:14px/1.55 Arial,sans-serif;color:#1d2733">${esc(isi)}</p>${tambahan ? `<p style="font:14px/1.55 Arial,sans-serif;color:#1d2733">${esc(tambahan)}</p>` : ""}`};
}
export async function kirimEmail(env, ke, m) {   // ke = satu alamat atau larik (pengingat.js mengirim ke EMAIL_TO)
  const reply = (env.EMAIL_TO || "").split(",").map(s => s.trim()).filter(Boolean)[0];
  const r = await fetch("https://api.resend.com/emails", {method: "POST", signal: AbortSignal.timeout(8000), headers: {authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json"},
    body: JSON.stringify({from: env.EMAIL_FROM, to: [].concat(ke), ...(reply ? {reply_to: reply} : {}), subject: m.subject, text: m.teks, html: m.html})});
  if (!r.ok) { r.body?.cancel(); throw new Error(`Resend HTTP ${r.status}`); }   // isi balasan tidak ikut log/respons
}
const KOLOM_PANGGILAN = `p.id, p.tanggal, p.perusahaan_id, p.nama_pt, p.prov, p.kab, p.titik_n, p.terdeteksi, p.lat, p.lon, p.status, p.dipanggil_pada, p.batas, p.direspons_pada, p.dicek_pada,
  p.saluran, p.hasil, p.catatan, p.oleh, p.dibuat, p.dummy`;
async function daftarPanggilan(env, req, url, kini) {
  if (!await adm(env, req) && !await stafPeran(env, req, P_KONSESI)) return tolakAdmin();
  const semua = url.searchParams.get("semua") === "1";
  const baris = (await env.DB.prepare(`SELECT ${KOLOM_PANGGILAN}, k.email IS NOT NULL ada_email, k.wa IS NOT NULL ada_wa, k.telepon IS NOT NULL ada_telepon,
    (SELECT count(*) FROM lapangan l WHERE l.tgl = p.tanggal AND l.prov = p.prov AND l.kab = p.kab) lapangan_n
    FROM panggilan p LEFT JOIN kontak_pt k ON k.perusahaan_id = p.perusahaan_id ${semua ? "" : "WHERE p.status NOT IN ('selesai', 'abaikan')"}
    ORDER BY (p.status = 'baru') DESC, p.batas IS NULL, p.batas, p.terdeteksi DESC LIMIT 500`).all()).results;
  return json({kini, batas_respons_ms: BATAS_RESPONS, email_siap: emailSiap(env), status: STATUS_PANGGILAN,
    panggilan: baris.filter(r => dalamWilayahStaf(req, [r.prov]) && !(stafNyata(req) && r.dummy)).map(r => ({...r, ada_email: !!r.ada_email, ada_wa: !!r.ada_wa, ada_telepon: !!r.ada_telepon, terlambat: !!r.batas && r.batas < kini && ["dipanggil"].includes(r.status)}))});
}
const SALURAN_AKSI = {wa: "wa", email: "email", telepon: "telepon"};
async function ubahPanggilan(env, req, id, kini) {
  const mod = await adm(env, req) || await stafPeran(env, req, P_KONSESI); if (!mod) return tolakAdmin();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.aksi === "string" && Object.hasOwn(SALURAN_AKSI, b.o.aksi) && !dariStaf(mod) && !await modOK(env, req)) return tolakMod();   // kirim email/WA/telepon ke perusahaan (staf analis_konsesi boleh)
  const aksi = b.o.aksi, hasil = tx(b.o.hasil, 300), catatan = tx(b.o.catatan, 500), tambahan = tx(b.o.pesan, 300);
  if ([hasil, catatan, tambahan].includes(undefined)) return gagal(400, "hasil maks 300, catatan maks 500, pesan maks 300 karakter");
  const p = await env.DB.prepare(`SELECT ${KOLOM_PANGGILAN}, k.email, k.wa FROM panggilan p LEFT JOIN kontak_pt k ON k.perusahaan_id = p.perusahaan_id WHERE p.id = ?`).bind(id).first();
  if (!p || !dalamWilayahStaf(req, [p.prov])) return gagal(404, "panggilan tidak ada");
  const tandaiPanggil = saluran => env.DB.prepare("UPDATE panggilan SET status = 'dipanggil', dipanggil_pada = ?1, batas = ?1 + ?2, saluran = ?3, oleh = ?4 WHERE id = ?5 AND status = 'baru'").bind(kini, BATAS_RESPONS, saluran, mod, id);
  const catat = () => env.DB.prepare("UPDATE panggilan SET hasil = coalesce(?, hasil), catatan = coalesce(?, catatan), oleh = ? WHERE id = ?").bind(hasil, catatan, mod, id);
  const segar = async extra => json({panggilan: await env.DB.prepare(`SELECT ${KOLOM_PANGGILAN} FROM panggilan p WHERE p.id = ?`).bind(id).first(), ...extra});
  if (typeof aksi === "string" && Object.hasOwn(SALURAN_AKSI, aksi)) {
    const batas = p.dipanggil_pada ? p.batas : kini + BATAS_RESPONS;   // kirim ulang tidak menggeser batas
    if (p.status === "selesai" || p.status === "abaikan") return gagal(409, `panggilan sudah ${p.status}`);
    if (aksi === "wa") {
      if (!p.wa) return gagal(409, "perusahaan ini belum punya nomor WhatsApp di Kontak PT");
      await env.DB.batch([tandaiPanggil("wa"), catat()]);
      return segar({tautan: `https://wa.me/${p.wa}?text=${encodeURIComponent(pesanPanggilan(p, batas, tambahan || "").teks)}`});
    }
    if (aksi === "email") {
      if (!p.email) return gagal(409, "perusahaan ini belum punya email di Kontak PT");
      if (!emailSiap(env)) return gagal(503, "email belum siap: EMAIL_API_KEY dan EMAIL_FROM (Resend) belum diset");
      try { await kirimEmail(env, p.email, pesanPanggilan(p, batas, tambahan || "")); }
      catch (e) { console.error("panggilan email", e?.message); return gagal(502, "email gagal terkirim (" + String(e?.message || e).slice(0, 120) + "); status tidak diubah"); }
      await env.DB.batch([tandaiPanggil("email"), catat()]);   // ditandai SESUDAH terkirim: gagal kirim tidak memulai hitung mundur
      return segar({terkirim: true});
    }
    await env.DB.batch([tandaiPanggil("telepon"), catat()]);
    return segar({});
  }
  if (aksi === "catat") { if (hasil == null && catatan == null) return gagal(400, "isi hasil atau catatan"); await catat().run(); return segar({}); }
  if (aksi === "abaikan") { await env.DB.batch([env.DB.prepare("UPDATE panggilan SET status = 'abaikan', oleh = ? WHERE id = ?").bind(mod, id), catat()]); return segar({}); }
  if (aksi === "buka") {
    if (p.status !== "abaikan") return gagal(409, "hanya panggilan berstatus abaikan yang bisa dibuka lagi");
    await env.DB.batch([env.DB.prepare("UPDATE panggilan SET status = CASE WHEN dipanggil_pada IS NULL THEN 'baru' ELSE 'dipanggil' END, oleh = ? WHERE id = ?").bind(mod, id), catat()]);
    return segar({});
  }
  if (aksi === "tarik") {
    if (p.status !== "dipanggil") return gagal(409, "hanya panggilan berstatus dipanggil yang bisa ditarik");
    await env.DB.batch([env.DB.prepare("UPDATE panggilan SET status = 'baru', dipanggil_pada = NULL, batas = NULL, saluran = NULL, direspons_pada = NULL, dicek_pada = NULL, oleh = ? WHERE id = ?").bind(mod, id), catat()]);
    return segar({});
  }
  if (["direspons", "dicek", "tindak_lanjut", "selesai"].includes(aksi)) {
    if (!p.dipanggil_pada) return gagal(409, `panggil perusahaan dulu (kirim email / WhatsApp / telepon) sebelum status ${aksi}`);
    await env.DB.batch([env.DB.prepare(`UPDATE panggilan SET status = ?1, oleh = ?2,
      direspons_pada = CASE WHEN ?1 = 'direspons' AND direspons_pada IS NULL THEN ?3 ELSE direspons_pada END,
      dicek_pada = CASE WHEN ?1 = 'dicek' AND dicek_pada IS NULL THEN ?3 ELSE dicek_pada END WHERE id = ?4`).bind(aksi, mod, kini, id), catat()]);
    return segar({});
  }
  return gagal(400, "aksi harus wa/email/telepon/direspons/dicek/tindak_lanjut/selesai/abaikan/buka/tarik/catat");
}

/* ================================================================ templat paparan */
const RE_IDT = /^[a-z0-9_-]{1,40}$/;
/* murni: skema {versi:1, slide:[{id,aktif,urutan}], tambahan:[{id,judul,sub?,isi[],gambar_url?,setelah}]}; kunci asing ditolak; teks tanpa < dan > */
export function cekTemplat(o) {
  const pol = (v, maks, nama, wajib) => { const s = tx(v, maks); if (s === undefined || (typeof v !== "string" && v != null)) return {g: `${nama}: teks maksimal ${maks} karakter`};
    if (/[<>]/.test(s || "")) return {g: `${nama}: tanda < dan > tidak boleh`}; if (wajib && !s) return {g: `${nama} wajib`}; return {s}; };
  const kunci = (x, boleh, nama) => { const a = Object.keys(x).filter(k => !boleh.includes(k)); return a.length ? `${nama}: kunci tidak dikenal ${a.join(", ")}` : null; };
  if (!o || typeof o !== "object" || Array.isArray(o)) return {galat: "templat harus objek JSON"};
  { const g = kunci(o, ["versi", "slide", "tambahan"], "templat"); if (g) return {galat: g}; }
  if (o.versi !== 1) return {galat: "versi harus 1"};
  const slide = o.slide ?? [], tambahan = o.tambahan ?? [];
  if (!Array.isArray(slide) || slide.length > 60) return {galat: "slide harus larik maksimal 60"};
  if (!Array.isArray(tambahan) || tambahan.length > 30) return {galat: "tambahan harus larik maksimal 30"};
  const ids = new Set(), S = [], T = [];
  for (const [i, s] of slide.entries()) {
    if (!s || typeof s !== "object" || Array.isArray(s)) return {galat: `slide[${i}] harus objek`};
    const g = kunci(s, ["id", "aktif", "urutan"], `slide[${i}]`); if (g) return {galat: g};
    if (typeof s.id !== "string" || !RE_IDT.test(s.id)) return {galat: `slide[${i}].id harus [a-z0-9_-] 1-40 karakter`};
    if (typeof s.aktif !== "boolean") return {galat: `slide[${i}].aktif harus true/false`};
    if (!Number.isInteger(s.urutan) || s.urutan < 0 || s.urutan > 999) return {galat: `slide[${i}].urutan harus bilangan bulat 0-999`};
    if (ids.has("s:" + s.id)) return {galat: `slide id '${s.id}' berulang`};
    ids.add("s:" + s.id); S.push({id: s.id, aktif: s.aktif, urutan: s.urutan});
  }
  for (const [i, t] of tambahan.entries()) {
    const n = `tambahan[${i}]`;
    if (!t || typeof t !== "object" || Array.isArray(t)) return {galat: `${n} harus objek`};
    const g = kunci(t, ["id", "judul", "sub", "isi", "gambar_url", "setelah"], n); if (g) return {galat: g};
    if (typeof t.id !== "string" || !RE_IDT.test(t.id)) return {galat: `${n}.id harus [a-z0-9_-] 1-40 karakter`};
    if (ids.has("t:" + t.id)) return {galat: `tambahan id '${t.id}' berulang`};
    ids.add("t:" + t.id);
    const judul = pol(t.judul, 120, `${n}.judul`, true); if (judul.g) return {galat: judul.g};
    const sub = pol(t.sub, 200, `${n}.sub`); if (sub.g) return {galat: sub.g};
    if (!Array.isArray(t.isi ?? []) || (t.isi ?? []).length > 20) return {galat: `${n}.isi harus larik maksimal 20 baris`};
    const isi = []; for (const [j, v] of (t.isi ?? []).entries()) { const r = pol(v, 300, `${n}.isi[${j}]`); if (r.g) return {galat: r.g}; if (typeof v !== "string") return {galat: `${n}.isi[${j}] harus teks`}; isi.push(r.s ?? ""); }
    if (typeof t.setelah !== "string" || !RE_IDT.test(t.setelah)) return {galat: `${n}.setelah harus id slide/tambahan ([a-z0-9_-])`};
    const o2 = {id: t.id, judul: judul.s, ...(sub.s ? {sub: sub.s} : {}), isi, setelah: t.setelah};
    if (t.gambar_url != null && t.gambar_url !== "") {
      const u = typeof t.gambar_url === "string" ? t.gambar_url.trim() : "";
      if (!/^\/(?!\/)[\w\-./%]{1,300}$/.test(u)) return {galat: `${n}.gambar_url harus jalur satu situs yang diawali / (mis. /img/foto.jpg); tautan luar tidak diizinkan`};   // sama dengan urlAman di klien paparan
      o2.gambar_url = u;
    }
    T.push(o2);
  }
  const isi = {versi: 1, slide: S, tambahan: T};
  return JSON.stringify(isi).length > MAKS_TEMPLAT ? {galat: `templat lebih dari ${MAKS_TEMPLAT / 1024} KB`} : {isi};
}
const TEMPLAT_KOSONG = {versi: 1, slide: [], tambahan: []};
async function bacaTemplat(env) {
  const r = await env.DB.prepare("SELECT isi, diubah FROM paparan_templat WHERE id = 1").first();
  return r ? {templat: JSON.parse(r.isi), diubah: r.diubah} : {templat: TEMPLAT_KOSONG, diubah: null};
}
async function simpanTemplat(env, req, kini) {
  const mod = await adm(env, req); if (!mod) return tolakAdmin();
  const b = await bacaBody(req, MAKS_TEMPLAT + 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekTemplat(b.o); if (c.galat) return gagal(400, c.galat);
  await env.DB.prepare("INSERT INTO paparan_templat (id, isi, diubah, oleh) VALUES (1, ?1, ?2, ?3) ON CONFLICT (id) DO UPDATE SET isi = ?1, diubah = ?2, oleh = ?3").bind(JSON.stringify(c.isi), kini, mod).run();
  return json({ok: true, ukuran: JSON.stringify(c.isi).length}, 201);
}

/* ================================================================ antrean otomatis (cron): titik FIRMS terbaru x konsesi2026/<prov>.json */
function kotakCincin(c) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of c) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }
/* murni: perusahaan[] (konsesi2026 <prov>.json) x titik[{lat,lon}] -> Map(indeks perusahaan -> indeks titik[]). geom = Polygon/MultiPolygon GeoJSON; cincin dalam = lubang (genap-ganjil). */
export function titikDalamKonsesi(perusahaan, titik) {
  const hasil = new Map(), urut = titik.map((t, i) => i).sort((a, b) => titik[a].lat - titik[b].lat);   // urut lintang: tiap poligon hanya memindai pita lintangnya
  const awal = y => { let lo = 0, hi = urut.length; while (lo < hi) { const m = (lo + hi) >> 1; if (titik[urut[m]].lat < y) lo = m + 1; else hi = m; } return lo; };
  perusahaan.forEach((p, pi) => {
    for (const g of p.geom || []) {
      for (const cincin of g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []) {
        if (!cincin?.[0]?.length) continue;
        const [x0, y0, x1, y1] = kotakCincin(cincin[0]);
        for (let k = awal(y0); k < urut.length && titik[urut[k]].lat <= y1; k++) {
          const t = titik[urut[k]];
          if (t.lon >= x0 && t.lon <= x1 && dalam(t.lon, t.lat, cincin)) (hasil.get(pi) || hasil.set(pi, new Set()).get(pi)).add(urut[k]);
        }
      }
    }
  });
  return hasil;
}
const SQL_ANTREAN = `INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, lat, lon, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (tanggal, perusahaan_id) DO UPDATE SET titik_n = max(titik_n, excluded.titik_n), terdeteksi = min(terdeteksi, excluded.terdeteksi), lat = excluded.lat, lon = excluded.lon`;
/* Putaran titik terbaru (D1, hasil perbaruiTitik) -> satu baris panggilan per perusahaan per hari WIB. Tanpa API luar, tanpa kiriman.
   titik_n = max(lama, hitungan jendela 24 jam ini): putaran 3-jam saling tumpang, jadi menambah akan menghitung ganda. Hanya keyakinan nominal/tinggi. */
export async function buatAntrean(env, kini = Date.now()) {
  const r = await env.DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first();
  if (!r) return {lewat: "belum ada putaran titik"};
  const d = JSON.parse(r.isi), acuan = Date.parse(d.acuan);
  if (!(kini - Date.parse(d.dibuat) < 6 * JAM)) return {lewat: "putaran titik lebih dari 6 jam"};
  const perProv = new Map();
  for (const [lat, lon, jam, , , c, wi] of d.baris) {
    const w = d.wilayah[wi]; if (c < 1 || !w) continue;
    const [prov, kab] = w.split("|"); (perProv.get(prov) || perProv.set(prov, []).get(prov)).push({lat, lon, t: Math.round(acuan + jam * JAM), kab});
  }
  const grup = new Map(); let provDibaca = 0;
  for (const [prov, titik] of [...perProv].sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    let berkas; try { const f = await env.ASSETS.fetch(new Request(`https://aset.lokal/data/konsesi2026/${prov}.json`)); if (!f.ok) { f.body?.cancel(); continue; } berkas = await f.json(); } catch (e) { continue; }
    provDibaca++;
    const P = berkas.perusahaan || [];
    for (const [pi, set] of titikDalamKonsesi(P, titik)) for (const ti of set) {
      const t = titik[ti], key = wib(t.t) + "|" + P[pi].id, nama = tx(String(P[pi].nama || P[pi].id), 120);
      if (typeof P[pi].id !== "string" || !RE_PID.test(P[pi].id) || !nama || nama.length < 2 || !t.kab || t.kab.length < 2 || t.kab.length > 60) continue;   // satu baris buruk tidak boleh menggagalkan batch
      const g = grup.get(key) || grup.set(key, {tanggal: wib(t.t), id: P[pi].id, nama, prov, n: 0, la: 0, lo: 0, t0: t.t, kab: {}}).get(key);
      g.n++; g.la += t.lat; g.lo += t.lon; g.t0 = Math.min(g.t0, t.t); g.kab[t.kab] = (g.kab[t.kab] || 0) + 1;
    }
  }
  const st = [...grup.values()].slice(0, 300).map(g => env.DB.prepare(SQL_ANTREAN).bind(acak(8), g.tanggal, g.id, g.nama, g.prov, Object.entries(g.kab).sort((a, b) => b[1] - a[1])[0][0],
    g.n, g.t0, Math.round(g.la / g.n * 1e4) / 1e4, Math.round(g.lo / g.n * 1e4) / 1e4, kini));
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return {prov: provDibaca, panggilan: st.length};
}

/* retensi (cron menit 17): laporan regu dan panggilan 180 hari; foto R2 laporan ikut dibuang */
export async function bersihkanPosko(env, kini = Date.now()) {
  const lama = kini - 180 * HARI;
  const foto = (await env.DB.prepare("SELECT id FROM lapangan WHERE dibuat <= ? AND foto = 1 LIMIT 200").bind(lama).all()).results;
  if (foto.length && env.MEDIA) await env.MEDIA.delete(foto.map(x => `lapangan/${x.id}`));
  const r = await env.DB.batch([env.DB.prepare("DELETE FROM lapangan WHERE dibuat <= ?").bind(lama), env.DB.prepare("DELETE FROM panggilan WHERE dibuat <= ?").bind(lama),
    env.DB.prepare("DELETE FROM neraca_harian WHERE tgl < ?").bind(wib(kini - RETENSI_NERACA_HARI * HARI)), env.DB.prepare("DELETE FROM laju_posko WHERE waktu <= ?").bind(kini - 2 * HARI)]);
  return {lapangan: r[0].meta.changes, panggilan: r[1].meta.changes};
}

/* ================================================================ dummy (DUMMY.md): satu halaman /admin/posko = seluruh rantainya, hulu ke hilir:
   kontak -> regu -> laporan regu -> neraca (lewat agregat SUNGGUHAN) + rakor -> antrean panggilan (tiap ember status terisi).
   Selisih sengaja: dipadamkan < luas di sebagian besar (sisa > 0), = luas di yang berstatus padam; rakor beda dari agregat regu.
   Templat paparan tidak diisi (konfigurasi tunggal tanpa kolom dummy). */
const DUMMY_KAB = 6;
async function titikPusat(env) {
  const W = await wilayah(env), semua = [];
  for (const a of W.grid.values()) for (const [la, lo, k] of a) semua.push([la, lo, ...k.split("|")]);
  semua.sort((a, b) => (a[2] + a[3] + a[4] < b[2] + b[3] + b[4] ? -1 : 1));
  const ambil = prov => { const per = new Map(); for (const [la, lo, p, kab] of semua) if (p === prov) (per.get(kab) || per.set(kab, []).get(kab)).push({lat: la, lon: lo, prov: p, kab}); return [...per.values()]; };
  let kab = ambil("62"); if (kab.length < DUMMY_KAB) kab = ambil([...new Set(semua.map(x => x[2]))][0]);
  return kab.slice(0, DUMMY_KAB);
}
async function dummyIsi(env, kini, mod, tglMinta) {
  /* periode yang TERPAMPANG di layar (DUMMY.md #1): admin yang sedang melihat tanggal lain mengisi tanggal itu; waktu acuan hari lampau = 20:00 WIB hari itu */
  if (tglMinta != null && (typeof tglMinta !== "string" || !tglSah(tglMinta) || tglMinta > wib(kini) || tglMinta < wib(kini - 60 * HARI))) return gagal(400, "tgl dummy harus YYYY-MM-DD dalam 60 hari terakhir sampai hari ini");
  const hari = tglMinta || wib(kini), mulai = Date.parse(hari + "T00:00:00+07:00"), ref = hari === wib(kini) ? kini : mulai + 13 * JAM;
  const ada = (await env.DB.prepare("SELECT (SELECT count(*) FROM lapangan WHERE dummy = 1 AND tgl = ?1) + (SELECT count(*) FROM panggilan WHERE dummy = 1 AND tanggal = ?1) n").bind(hari).first()).n;
  if (ada) return gagal(409, `data dummy hari ini sudah ada (${ada} baris hidup); hapus dulu dengan 🧹`);
  const K = await titikPusat(env); if (K.length < 3) return gagal(503, "pusat kecamatan tidak terbaca dari aset; dummy tidak bisa dibuat");
  const st = [], NAMA = [["BPBD", "Regu BPBD"], ["Manggala Agni", "Daops Manggala Agni"], ["TNI", "Satgas Kodim"], ["MPA", "MPA Desa"]];
  /* kontak (hulu panggilan): email saja, WA saja, keduanya, telepon saja */
  const PT = Array.from({length: 9}, (_, i) => `dummy-pt-${i + 1}`);
  const kontak = [{email: "pic1@contoh.invalid"}, {wa: "628120000002"}, {email: "pic3@contoh.invalid", wa: "628120000003"}, {telepon: "0536 300004"}, {wa: "628120000005"}, {email: "pic6@contoh.invalid"}];
  kontak.forEach((k, i) => st.push(env.DB.prepare(`INSERT INTO kontak_pt (id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT (perusahaan_id) DO NOTHING`).bind(acak(8), PT[i], `[DUMMY] PT Perkebunan Contoh ${i + 1}`, `PIC Contoh ${i + 1}`, k.email ?? null, k.wa ?? null, k.telepon ?? null, "Data contoh, bukan kontak asli", kini, mod)));
  /* regu: pakai yang dummy kalau ada (kode acak tak pernah ditampilkan: tak bisa dipakai masuk) */
  let regu = (await env.DB.prepare("SELECT id, kab FROM regu WHERE dummy = 1 ORDER BY id LIMIT 4").all()).results;
  if (regu.length < 4) {
    regu = NAMA.map(([unsur, nama], j) => ({id: acak(8), kab: K[j % K.length][0].kab, unsur, nama: `[DUMMY] ${nama} ${K[j % K.length][0].kab}`}));
    for (const g of regu) st.push(env.DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(g.id, g.nama, g.unsur, K[0][0].prov, g.kab, "0".repeat(64 - 16) + acak(8), kini, mod));
  }
  const STAT = ["menyala", "bara", "padam", "tidak_ditemukan", "menyala", "bara", "padam", "menyala"], KEYS = Object.keys(KENDALA), kunci = new Map();
  for (let i = 0; i < 24; i++) {
    const k = K[i % K.length], t = k[Math.floor(i / K.length) % k.length], kemarin = i >= 16, j = kemarin ? i - 16 : i;
    const waktu = kemarin ? mulai - 2 * JAM - j * 25 * MENIT : Math.max(mulai + (j + 1) * MENIT, ref - j * 7 * MENIT), tgl = wib(waktu), s = STAT[i % STAT.length];
    const luas = s === "tidak_ditemukan" ? null : 2 + (i * 7) % 38, padam = luas == null ? null : s === "padam" ? luas : s === "bara" ? Math.round(luas * 0.6 * 10) / 10 : i % 3 ? Math.round(luas * 0.25 * 10) / 10 : null;
    const kd = [KEYS[i % 6], ...(i % 3 === 0 ? [KEYS[(i + 2) % 6]] : [])];
    st.push(env.DB.prepare(`INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, akurasi, status, luas_ha, padam_ha, personel, kendala, sumber_air, catatan, prov, kab, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(acak(8), regu[i % regu.length].id, `dummy${i}-${acak(4)}`, tgl, waktu, waktu, t.lat + (i % 5 - 2) * 0.003, t.lon + (i % 3 - 1) * 0.003,
      8 + (i * 13) % 80, s, luas, padam, 4 + (i * 3) % 14, JSON.stringify(kd), SUMBER_AIR[i % SUMBER_AIR.length], `[Contoh] ${s.replace("_", " ")} di ${t.kab}`, t.prov, t.kab));
    kunci.set(`${tgl}|${t.prov}|${t.kab}`, [tgl, t.prov, t.kab]);
  }
  /* agregat lewat statement asli, dijalankan SESUDAH laporan masuk (batch berurutan, satu transaksi) */
  for (const [tgl, prov, kab] of kunci.values()) st.push(agregat(env, tgl, prov, kab, kini));
  /* rakor menimpa agregat regu di dua kabupaten + satu kabupaten tanpa laporan regu */
  const rk = (kab, x) => st.push(env.DB.prepare(`INSERT INTO neraca_harian (tgl, prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala, catatan, diubah, oleh, dummy) VALUES (?, ?, ?, 'rakor', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT (tgl, prov, kab, sumber) DO NOTHING`).bind(hari, K[0][0].prov, kab, x.fs, x.luas, x.padam, Math.round((x.luas - x.padam) * 10) / 10, x.personel, JSON.stringify(x.kendala), "[Contoh] isian rakor", kini, mod));
  rk(K[0][0].kab, {fs: 14, luas: 96.5, padam: 61, personel: 58, kendala: ["air_jauh", "asap_tebal"]});
  rk(K[1][0].kab, {fs: 9, luas: 40, padam: 40, personel: 31, kendala: []});
  rk(K[K.length - 1][0].kab + " (rakor)", {fs: 5, luas: 22.4, padam: 3.2, personel: 17, kendala: ["akses_sulit_rawa", "roda_empat_sulit", "angin_kencang", "air_tidak_cukup"]});
  /* antrean: tiap ember status terisi; batas = dipanggil + 2 jam persis (CHECK) */
  const S = ["baru", "baru", "dipanggil", "dipanggil", "direspons", "dicek", "tindak_lanjut", "selesai", "abaikan"], BASE = [0, 0, 75 * MENIT, 3 * JAM, 150 * MENIT, 5 * JAM, 7 * JAM, 9 * JAM, 0];
  S.forEach((s, i) => {
    const k = K[i % K.length][0], dp = s === "baru" || s === "abaikan" ? null : ref - BASE[i], saluran = dp == null ? null : ["email", "wa", "telepon"][i % 3];
    st.push(env.DB.prepare(`INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, lat, lon, status, dipanggil_pada, batas, direspons_pada, dicek_pada, saluran, hasil, catatan, oleh, dibuat, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT (tanggal, perusahaan_id) DO NOTHING`).bind(acak(8), hari, PT[i], `[DUMMY] PT Perkebunan Contoh ${i + 1}`, k.prov, k.kab, 1 + (i * 5) % 14,
      Math.max(mulai, ref - 8 * JAM + i * 40 * MENIT), k.lat, k.lon, s, dp, dp == null ? null : dp + BATAS_RESPONS, ["direspons", "dicek", "tindak_lanjut", "selesai"].includes(s) ? dp + 20 * MENIT : null,
      ["dicek", "tindak_lanjut", "selesai"].includes(s) ? dp + 70 * MENIT : null, saluran, s === "selesai" ? "Api padam, tim perusahaan di lokasi" : null, "[Contoh] data dummy", dp == null ? null : mod, kini));
  });
  await env.DB.batch(st);
  return json({ok: true, kontak: kontak.length, regu: regu.length, lapangan: 24, neraca: kunci.size + 3, panggilan: S.length}, 201);
}
async function dummyHapus(env) {
  const kunci = (await env.DB.prepare("SELECT DISTINCT tgl, prov, kab FROM lapangan WHERE dummy = 1").all()).results, kini = Date.now();
  const hitung = async t => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n;
  const n = {regu: await hitung("regu"), lapangan: await hitung("lapangan"), neraca: await hitung("neraca_harian"), panggilan: await hitung("panggilan"), kontak: await hitung("kontak_pt")};
  await env.DB.batch([
    env.DB.prepare("DELETE FROM lapangan WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM neraca_harian WHERE dummy = 1"),
    ...kunci.map(k => env.DB.prepare("DELETE FROM neraca_harian WHERE tgl = ? AND prov = ? AND kab = ? AND sumber = 'regu'").bind(k.tgl, k.prov, k.kab)),
    ...kunci.map(k => agregat(env, k.tgl, k.prov, k.kab, kini)),   // laporan asli yang tersisa di kabupaten itu dihitung ulang
    env.DB.prepare("DELETE FROM panggilan WHERE dummy = 1"), env.DB.prepare("DELETE FROM kontak_pt WHERE dummy = 1"), env.DB.prepare("DELETE FROM regu WHERE dummy = 1"),
  ]);
  return json({ok: true, ...n});
}
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, mod, b.o.tgl);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ halaman regu + rute */
const CSP_LAPANGAN = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://*.openfreemap.org; worker-src blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
async function halamanLapangan(env, url) {
  const r = await env.ASSETS.fetch(new Request(new URL("/lapangan.html", url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman lapangan tidak ada"); }
  return new Response(r.body, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP_LAPANGAN}});
}
/* rute: digabung ke RUTE di src/worker.js (gerbang uji membaca kunci tabel ini). Tanpa auth = publik; "admin" = adminOK; "kode" = x-kode-regu. */
export const RUTE_POSKO = {
  "GET /lapangan": (env, req, url) => halamanLapangan(env, url),
  "GET /admin/posko": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanPosko, HALAMAN_STAF.posko),
  "GET /api/neraca": (env, req, url, kini, ctx) => neracaPublik(env, req, url, kini, ctx),
  "GET /api/paparan/templat": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/paparan/templat", url), {method: "GET"}), ctx, 60, async () => json((await bacaTemplat(env)).templat)),
  "GET /api/lapangan/saya": async (env, req) => { const g = await reguDari(env, req); return !(g instanceof Response) ? json({regu: {nama: g.nama, unsur: g.unsur, prov: g.prov, kab: g.kab}}) : g; },
  "POST /api/lapangan": (env, req, url, kini) => lapor(env, req, url, kini),
  "POST /api/lapangan/foto/:id": (env, req, url, kini, ctx, id) => fotoLapor(env, req, id, kini),
  "GET /api/posko/regu": (env, req) => daftarRegu(env, req),
  "POST /api/posko/regu": (env, req, url, kini) => buatRegu(env, req, url, kini),
  "POST /api/posko/regu/:id": (env, req, url, kini, ctx, id) => cabutRegu(env, req, id, kini),
  "GET /api/posko/lapangan": (env, req, url, kini) => daftarLapangan(env, req, url, kini),
  "POST /api/posko/lapangan/:id": (env, req, url, kini, ctx, id) => putusLapangan(env, req, id, kini),
  "GET /api/posko/foto/:id": (env, req, url, kini, ctx, id) => fotoAdmin(env, req, id),
  "GET /api/posko/neraca": (env, req, url, kini) => neracaAdmin(env, req, url, kini),
  "POST /api/posko/neraca": (env, req, url, kini) => simpanRakor(env, req, kini),
  "POST /api/posko/neraca/hapus": (env, req) => hapusRakor(env, req),
  "GET /api/posko/kontak": (env, req) => daftarKontak(env, req),
  "POST /api/posko/kontak": (env, req, url, kini) => tambahKontak(env, req, kini),
  "POST /api/posko/kontak/impor": (env, req, url, kini) => imporKontak(env, req, kini),
  "POST /api/posko/kontak/:id": (env, req, url, kini, ctx, id) => hapusKontak(env, req, id),
  "GET /api/posko/panggilan": (env, req, url, kini) => daftarPanggilan(env, req, url, kini),
  "POST /api/posko/panggilan/:id": (env, req, url, kini, ctx, id) => ubahPanggilan(env, req, id, kini),
  "GET /api/posko/templat": async (env, req) => await adm(env, req) ? json(await bacaTemplat(env)) : tolakAdmin(),
  "POST /api/posko/templat": (env, req, url, kini) => simpanTemplat(env, req, kini),
  "POST /api/posko/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
