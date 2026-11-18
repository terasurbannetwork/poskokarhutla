/* Kaji ulang pasca-kejadian KU-04..06: rute kandidat dan baca draf, tulis pelajaran/rekomendasi/status, sahkan. Kontrak: data/kajian-bnpb/kaji-ulang/DESAIN-TEKNIS.md Rute, KEAMANAN-PRIVASI, KEPUTUSAN Q1-Q8.
   TIDAK menyentuh env.DB: SQL ada di bagian Kaji ulang src/hak.js. Digabung ke RUTE_SIKLUS (src/siklus.js); BPBD lewat /api/instansi/siklus/...
   `oleh` selalu dari sesi (c.h.oleh, staf:<16 heks> atau admin:<12 heks>, muat batas 40 dl_tindak), tidak pernah dari badan.
   Pemetaan pelaku: Super Admin, Pusdalops, Koordalops = ku_tulis (melihat nama pengisi); Pimpinan, moderator biasa, BP = ku_baca (tanpa kolom oleh).
   BP hanya kab wilayahnya dan hanya kaji ulang yang disahkan, tanpa potret (potret memuat semua kab); di luar itu 404 sama dengan tidak ada.
   Impor: tests harus mengimpor src/worker.js SEBELUM modul ini (siklus.js dan worker.js melingkar lewat sla.js). */
import {json, gagal} from "./worker.js";
import {tolak} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {rakitKajiUlang, KU_MAKS_POTRET} from "./kaji_ulang_rakit.js";
import {kab4Dari} from "./siklus_kab.js";
import {NO, bodi, masukan, lihat, lihatTulis, dalamBP, ujiLaju, polos} from "./siklus_kejadian.js";

const HARI = 864e5, MAKS_LAJU = 120, JENDELA_LAJU = 10 * 60e3, MIN_TENGGAT = 7, MAKS_TENGGAT = 365, MIN_SISA_POTRET = 5000;
const MIGRASI = "Kaji ulang belum diaktifkan (migrasi belum diterapkan)";
const aman = async f => { try { return await f(); } catch (e) { if (/no such (table|index): (main\.)?(ku_|dl_tindak)/i.test(String(e?.message || e))) return gagal(503, MIGRASI); throw e; } };
const tglWib = kini => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
const tulisLevel = h => !!(h.sa || h.pd || h.ko);
const pelaku = c => c.h.tipe !== "bp" && tulisLevel(c.h) ? H.pelakuKuTulis : H.pelakuKuBaca;

/* kolom pengisi: ku_tulis melihat nama (<kolom>_nama; staf dari akunnya, selain itu "Moderator"), pelaku lain tidak melihat kolomnya sama sekali */
const OLEH = ["oleh", "mulai_oleh", "disahkan_oleh"];
const jalan = (x, f) => Array.isArray(x) ? x.map(v => jalan(v, f)) : x && typeof x === "object"
  ? Object.fromEntries(Object.entries(x).flatMap(([k, v]) => OLEH.includes(k) ? f(k, v) : [[k, jalan(v, f)]])) : x;
async function namai(c, x) {
  if (!tulisLevel(c.h) || c.h.tipe === "bp") return jalan(x, () => []);
  const ids = new Set(); jalan(x, (k, v) => { if (typeof v === "string" && v.startsWith("staf:")) ids.add(v.slice(5)); return []; });
  const nama = await H.dlNamaStaf(c.env, [...ids]);
  return jalan(x, (k, v) => [[k + "_nama", v == null ? null : v.startsWith("staf:") ? nama.get(v.slice(5)) || "Staf" : "Moderator"]]);
}

async function kejadian(c, tulis = false) {
  const k = await H.skKejadianRingkas(c.env, c.h.pelaku, c.p.id);
  return (tulis ? lihatTulis : lihat)(c, k) ? k : null;
}
/* laju tulis: 120 per 10 menit per pengisi, dihitung dari dl_tindak_log (sama dengan Dalops); tulis tanpa baris log memakai ujiLaju per jam */
const lajuLog = async c => (await H.dlTindakLaju(c.env, c.h.oleh, c.kini - JENDELA_LAJU)) + 1 > MAKS_LAJU ? gagal(429, `terlalu cepat: maksimal ${MAKS_LAJU} perubahan per 10 menit`) : null;
const nomorSah = v => { if (!Number.isInteger(v) || v < 1 || v > H.KU_MAKS_REKOMENDASI) tolak(`nomor 1-${H.KU_MAKS_REKOMENDASI}`); return v; };
/* tenggat wajib, 7..365 hari dari hari ini WIB (Q4; hari ini dipakai juga saat draf karena tanggal sahkan belum ada) */
function tenggatSah(v, kini) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + "T00:00:00Z").toISOString().slice(0, 10) !== v) tolak("tenggat wajib, bentuk YYYY-MM-DD");
  const sisa = Math.round((Date.parse(v + "T00:00:00Z") - Date.parse(tglWib(kini) + "T00:00:00Z")) / HARI);
  if (sisa < MIN_TENGGAT || sisa > MAKS_TENGGAT) tolak(`tenggat ${MIN_TENGGAT}-${MAKS_TENGGAT} hari dari hari ini`);
  return v;
}

/* ================================================================ baca */
async function kandidat(c) {
  return aman(async () => {
    const {baris, lifeline} = await H.kuKandidatBaris(c.env, pelaku(c), c.h.dummyOk);
    const hari = d => Date.parse(d + "T00:00:00Z") / HARI;
    const butir = [];
    for (const r of baris) {
      const alasan = [], dilewati = [];
      if (r.nkab >= 3) alasan.push("tiga_kab");
      if (!lifeline) dilewati.push("lifeline_belum_aktif"); else if (r.merah) alasan.push("lifeline_merah");
      if (!r.tanggap_mulai || !r.tanggap_akhir) dilewati.push("tanggap_tanpa_tanggal"); else if (hari(r.tanggap_akhir) - hari(r.tanggap_mulai) > 7) alasan.push("tanggap_lebih_7_hari");
      if (r.kaji_status) alasan.push("dimulai_staf");
      if (alasan.length) butir.push({id: r.id, jenis: r.jenis, nama: r.nama, fase: r.fase, mulai: r.mulai, kab: r.nkab, alasan, dilewati, kaji: r.kaji_status ? {status: r.kaji_status, versi: r.kaji_versi} : {status: "belum"}});
    }
    return json({dasar: "kriteria Q1 adalah hipotesis; alasan ditampilkan sebagai daftar, bukan skor", baris: butir, terpotong: baris.length >= H.KU_MAKS_KANDIDAT});
  });
}

async function lihatKaji(c) {
  const k = await kejadian(c); if (!k) return NO();
  const id = c.p.id, kabs = await H.skKejadianKab(c.env, c.h.pelaku, id);
  if (!dalamBP(c, kabs)) return NO();
  return aman(async () => {
    const p = pelaku(c), q = c.url.searchParams;
    const d = await H.kuBaca(c.env, p, id);
    if (c.h.tipe === "bp") return d?.kaji.status === "disahkan" ? json(await namai(c, {kejadian_id: id, ...d, boleh: {tulis: false, sahkan: false}})) : NO();
    const v = q.get("versi");
    if (v != null) {   // versi beku (potret), bukan draf hidup
      const n = Number(v); masukan(() => { if (!Number.isInteger(n) || n < 1 || n > 999) tolak("versi 1-999"); });
      const pt = d?.kaji.status === "disahkan" ? await H.kuPotret(c.env, p, id, n) : null;
      return pt ? json(await namai(c, {kejadian_id: id, ...d, potret: pt})) : NO();
    }
    const mentah = await H.kuMuatDraf(c.env, p, id); if (!mentah) return NO();
    let belum = null;
    const awal = Date.parse(`${k.mulai}T00:00:00+07:00`), provs = [...new Set(kabs.map(x => x.slice(0, 2)))];
    if (provs.length) {
      const t = await H.kuTugasBelumBertaut(c.env, p, awal, awal + HARI, provs), n = (t ?? []).filter(x => kabs.includes(kab4Dari(x.prov, x.kab))).length;
      if (n) belum = {n, ket: "tugas serupa di kab dan tanggal kejadian ini belum bertaut ke kejadian, belum masuk linimasa"};
    }
    return json(await namai(c, {kejadian_id: id, kaji: d?.kaji ?? null, pelajaran: d?.pelajaran ?? [], rekomendasi: d?.rekomendasi ?? [], draf: rakitKajiUlang(mentah), belum_bertaut: belum,
      boleh: {tulis: tulisLevel(c.h), sahkan: !!(c.h.sa || c.h.ko)}}));
  });
}

async function riwayat(c) {
  if (!(await kejadian(c))) return NO();
  const n = Number(c.url.searchParams.get("nomor")); masukan(() => nomorSah(n));
  return aman(async () => { const r = await H.kuRiwayat(c.env, pelaku(c), c.p.id, n); return r ? json(await namai(c, r)) : NO(); });
}

/* F-7: semua rekomendasi lintas kejadian; lewat tenggat = belum selesai dan tenggat sebelum hari ini WIB, status tidak berubah sendiri */
async function daftar(c) {
  return aman(async () => {
    const hari = tglWib(c.kini), rows = await H.kuDaftarRekomendasi(c.env, pelaku(c));
    const baris = rows.map(r => { const status = r.status ?? "belum", tertutup = status === "selesai"; return {kejadian_id: r.kejadian_id, nomor: r.nomor, teks: r.teks, unit: r.unit, tenggat: r.tenggat, status, tidak_dilanjutkan: !!r.tidak_dilanjutkan, tertutup, lewat_tenggat: !tertutup && r.tenggat < hari}; });
    const tertutup = baris.filter(b => b.tertutup).length, lewat = baris.filter(b => b.lewat_tenggat).length;
    return json({hari, ringkas: {total: baris.length, terbuka: baris.length - tertutup, lewat_tenggat: lewat, tertutup}, baris, terpotong: rows.length >= 2000});
  });
}

/* ================================================================ tulis */
async function mulaiKaji(c) {
  const k = await kejadian(c, true); if (!k) return NO();
  if (k.fase === "dibatalkan" || k.fase === "digabung") return gagal(409, "kejadian dibatalkan atau digabung tidak dikaji ulang");
  const lj = await ujiLaju(c, "ku.tulis", MAKS_LAJU); if (lj) return lj;
  return aman(async () => {
    if (await H.kuBaca(c.env, H.pelakuKuTulis, c.p.id)) return gagal(409, "kaji ulang sudah dimulai");
    const ok = await H.kuMulai(c.env, H.pelakuKuTulis, {kejadianId: c.p.id, oleh: c.h.oleh}, c.kini);
    return ok ? json({ok: true, kejadian_id: c.p.id, status: "draf"}, 201) : gagal(409, "kaji ulang sudah dimulai");   // kejadian sudah dipastikan ada, jadi false = balapan
  });
}

async function tambahPelajaran(c) {
  const b = await bodi(c, 8192);
  if (!(await kejadian(c, true))) return NO();
  masukan(() => { if (!polos(b)) tolak("badan harus objek"); });
  const lj = await ujiLaju(c, "ku.tulis", MAKS_LAJU); if (lj) return lj;
  return aman(async () => {
    const id = await H.kuTambahPelajaran(c.env, H.pelakuKuTulis, {kejadianId: c.p.id, kategori: b.kategori, teks: b.teks, rujuk: b.rujuk ?? [], asalOpsId: b.asal_ops_id ?? null, oleh: c.h.oleh}, c.kini);
    return json({ok: true, id}, 201);
  });
}

async function ubahPelajaran(c) {
  const b = await bodi(c, 8192);
  if (!(await kejadian(c, true))) return NO();
  masukan(() => { if (!polos(b)) tolak("badan harus objek"); });
  const lj = await ujiLaju(c, "ku.tulis", MAKS_LAJU); if (lj) return lj;
  return aman(async () => {
    const d = await H.kuBaca(c.env, H.pelakuKuTulis, c.p.id);
    if (!d?.pelajaran.some(x => x.id === c.p.sid)) return NO();
    return (await H.kuUbahPelajaran(c.env, H.pelakuKuTulis, {id: c.p.sid, kategori: b.kategori, teks: b.teks}, c.kini)) ? json({ok: true}) : NO();
  });
}

async function tambahRekomendasi(c) {
  const b = await bodi(c, 4096);
  if (!(await kejadian(c, true))) return NO();
  masukan(() => { if (!polos(b)) tolak("badan harus objek"); tenggatSah(b.tenggat, c.kini); });
  return aman(async () => {
    const lj = await lajuLog(c); if (lj) return lj;
    const r = await H.kuTambahRekomendasi(c.env, H.pelakuKuTulis, {kejadianId: c.p.id, teks: b.teks, unit: b.unit, tenggat: b.tenggat, pelajaranId: b.pelajaran_id ?? null, oleh: c.h.oleh}, c.kini);
    return json({ok: true, ...r}, 201);
  });
}

async function ubahStatus(c) {
  const b = await bodi(c, 4096);
  if (!(await kejadian(c, true))) return NO();
  masukan(() => {
    if (!polos(b)) tolak("badan harus objek");
    nomorSah(b.nomor);
    if (b.catatan != null && typeof b.catatan !== "string") tolak("catatan harus teks");
    if (b.tidak_dilanjutkan != null && typeof b.tidak_dilanjutkan !== "boolean") tolak("tidak_dilanjutkan harus true atau false");
  });
  return aman(async () => {
    const lj = await lajuLog(c); if (lj) return lj;
    const r = await H.kuUbahStatus(c.env, H.pelakuKuTulis, {kejadianId: c.p.id, nomor: b.nomor, status: b.status, catatan: b.catatan ?? null, tidakDilanjutkan: b.tidak_dilanjutkan === true, oleh: c.h.oleh}, c.kini);
    return r ? json({ok: true, nomor: b.nomor, status: r.status}, 201) : NO();
  });
}

/* sahkan dan sahkan ulang: potret beku dirakit di server dari data sistem + isi staf; versi naik satu; hanya sesudah fase selesai (ALUR A1) */
async function sahkan(c) {
  const k = await kejadian(c, true); if (!k) return NO();
  if (k.fase !== "selesai") return gagal(409, "kaji ulang hanya disahkan sesudah kejadian berfase selesai");
  const lj = await ujiLaju(c, "ku.sahkan", 20); if (lj) return lj;
  return aman(async () => {
    const p = H.pelakuKuTulis, d = await H.kuBaca(c.env, p, c.p.id);
    if (!d) return gagal(404, "kaji ulang belum dimulai");
    if (!c.h.sa) {   // Q3: penulis tunggal tidak mengesahkan bila ada Koordalops lain
      const pen = await H.kuPenulis(c.env, p, c.p.id);
      if (pen.length && pen.every(o => o === c.h.oleh) && await H.kuKoordalopsLain(c.env, p, c.h.oleh.slice(5))) return gagal(403, "seluruh isi ditulis olehmu sendiri; minta Koordalops lain mengesahkan");
    }
    const mentah = await H.kuMuatDraf(c.env, p, c.p.id); if (!mentah) return NO();
    const versi = d.kaji.versi + 1;
    const isi = {versi, disahkan_pada: c.kini,   // tanpa `oleh`: potret tidak membawa nama
      pelajaran: d.pelajaran.map(({id, kategori, teks, rujuk, asal_ops_id, versi_tambah, dibuat}) => ({id, kategori, teks, rujuk, asal_ops_id, versi_tambah, dibuat})),
      rekomendasi: d.rekomendasi.map(({nomor, teks, unit, tenggat, pelajaran_id, tidak_dilanjutkan, dibuat}) => ({nomor, teks, unit, tenggat, pelajaran_id, tidak_dilanjutkan, dibuat}))};
    const sisa = KU_MAKS_POTRET - JSON.stringify({...isi, draf: null}).length - 64;
    if (sisa < MIN_SISA_POTRET) return gagal(409, "pelajaran dan rekomendasi terlalu panjang untuk satu potret");
    const potret = JSON.stringify({...isi, draf: rakitKajiUlang(mentah, {maksPotret: sisa})});
    if (potret.length > KU_MAKS_POTRET) return gagal(409, "potret melebihi batas; kurangi isian");
    if (!(await H.kuSahkan(c.env, p, {kejadianId: c.p.id, versiLama: d.kaji.versi, potret, oleh: c.h.oleh}, c.kini))) return gagal(409, "kaji ulang berubah bersamaan; muat ulang lalu ulangi");
    return json({ok: true, versi}, 201);
  });
}

const K = "/api/siklus/kejadian/:id/kaji-ulang";
export const RUTE_KAJI_ULANG = {
  "GET /api/siklus/kaji-ulang/kandidat": {izin: ["STAF"], f: kandidat},
  "GET /api/siklus/kaji-ulang/rekomendasi": {izin: ["STAF"], f: daftar},
  [`GET ${K}`]: {izin: ["STAF", "BP"], f: lihatKaji},
  [`POST ${K}`]: {izin: ["PDKO"], f: mulaiKaji},
  [`POST ${K}/pelajaran`]: {izin: ["PDKO"], f: tambahPelajaran},
  [`POST ${K}/pelajaran/:sid`]: {izin: ["PDKO"], f: ubahPelajaran},
  [`POST ${K}/rekomendasi`]: {izin: ["PDKO"], f: tambahRekomendasi},
  [`POST ${K}/rekomendasi/status`]: {izin: ["PDKO"], f: ubahStatus},
  [`GET ${K}/rekomendasi/riwayat`]: {izin: ["STAF"], f: riwayat},
  [`POST ${K}/sahkan`]: {izin: ["KO"], f: sahkan},
};
