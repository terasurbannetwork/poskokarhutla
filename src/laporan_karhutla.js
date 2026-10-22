/* Laporan Karhutla otomatis. Skema: migrations/0032_laporan_karhutla.sql. Alur dan hak: docs/laporan-karhutla/SOP.md. Spek bersama peramban dan Worker: public/laporan_karhutla_spek.js.
   Aturan:
   - Satu data, satu kali diinput, oleh pemilik datanya. Operator provinsi = akun instansi pemprov AKTIF, hanya provinsinya (provinsi lain 404, bukan 403, supaya keberadaannya tak bocor).
     Udara, OMC, dan Dit. Koordalops = staf berperan udara, tmc, koordalops (atau moderator). Verifikator = staf verifikator/pusdalops atau moderator. Pimpinan dan staf lain: baca.
   - Peramban tidak dipercaya: kirim memvalidasi ulang dengan spek yang sama, menghitung cek merah/kuning, lalu menulis versi baru. Simpan memakai penguncian optimistis (versi_dasar, 409 + versi_terakhir)
     dan klien_id (kiriman ulang tidak menggandakan).
   - Merah tidak menahan KIRIM (supaya verifikator melihatnya) tetapi menahan SETUJUI dan KUNCI. Kuning cukup dibaca.
   - Kunci = satu fungsi agregasi (agregasi() di spek) membaca kiriman DISETUJUI, hasilnya dibekukan di lk_snapshot beserta sha256. Sumber wajib belum disetujui = ditolak, kecuali "lanjut tanpa X" beralasan yang tercetak.
     Koreksi sesudah kunci = ralat (snapshot baru, lama utuh).
   - Rute baca snapshot: GET /api/laporan-karhutla/snapshot/:tanggal (stabil, lihat docs/laporan-karhutla/API-SNAPSHOT.md). Teks WA dihitung dari snapshot saat dibaca (deterministik).
   - Tanpa migrasi 0032 semua rute menjawab 503 sopan. Tidak ada kiriman keluar otomatis; tagih = tautan wa.me yang ditekan manusia.
   ponytail: ambil laporan.json (118 KB) tiap draf/kunci; bila lambat, cache per isolat. Hotspot per provinsi hanya total (keyakinan tinggi/sedang tidak ada di umpan harian). */
import {json, gagal, sha, bacaBody} from "./worker.js";
import {wib, superOK, modOK} from "./posko.js";
import {akunAktif, personelProvinsi, jsonAman, durasi} from "./instansi.js";
import {inventarisProvinsi} from "./inventaris.js";
import {korbanHari} from "./korban.js";
import {sortieHari} from "./omc.js";
import {stafSesi, PERAN} from "./staf.js";
import {halamanLaporanKarhutla, HALAMAN_STAF} from "./admin_halaman.js";
import {halamanAdmin} from "./statistik.js";
import * as S from "../public/laporan_karhutla_spek.js";
import {teksWA} from "../public/laporan_karhutla_wa.js";

const JAM = 3600e3, HARI = 24 * JAM, BATAS_WIB_JAM = 9;
const P_VERIF = ["verifikator", "pusdalops"], P_SUMBER = {udara: "udara", omc: "tmc", koordalops: "koordalops"};
const tanpaTabel = e => /no such table: lk_/i.test(String(e?.message || e));
export const tanpa0032 = e => tanpaTabel(e);
const lewat503 = f => async (...a) => { try { return await f(...a); } catch (e) { if (tanpaTabel(e)) return gagal(503, "Laporan Karhutla belum diaktifkan (migrasi 0032_laporan_karhutla belum diterapkan)"); throw e; } };
const topeng = o => !o ? "sistem" : o.startsWith("staf:") ? "staf" : o.startsWith("instansi:") ? "instansi" : o === "sistem" ? "sistem" : "admin";
const batasMs = tanggal => Date.parse(tanggal + `T0${BATAS_WIB_JAM}:00:00+07:00`);
const jsonDari = s => { try { return JSON.parse(s); } catch (e) { return null; } };

/* ================================================================ pelaku */
/* {tipe: admin|staf|pemprov, oleh, peran[], mod, dummy, cakupan[]} atau Response galat */
async function pelaku(env, req, kini) {
  const mod = await modOK(env, req);
  if (mod) return {tipe: "admin", oleh: mod, peran: Object.keys(PERAN), mod: true, dummy: 0, superDummy: !!await superOK(env, req), cakupan: []};
  const s = await stafSesi(env, req, kini);
  if (s) return {tipe: "staf", oleh: "staf:" + s.id, peran: s.peran, mod: false, dummy: s.dummy ? 1 : 0, cakupan: []};
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (a.jenis !== "pemprov" || a.tingkat !== "prov") return gagal(403, "laporan harian hanya untuk akun Pemerintah Provinsi");
  if (req.method === "POST" && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1");
  return {tipe: "pemprov", oleh: "instansi:" + a.id, peran: [], mod: false, dummy: a.dummy ? 1 : 0, cakupan: jsonAman(a.cakupan) || [], akun: a};
}
const verifikator = p => p.mod || p.peran.some(x => P_VERIF.includes(x));
const bolehTulis = (p, sumber) => {
  const k = S.kodeDariSumber(sumber);
  if (p.tipe === "pemprov") return !!k && p.cakupan.includes(k);
  return !k && (p.mod || p.peran.includes(P_SUMBER[sumber]));
};
const tulisanDari = (p, sumbers) => sumbers.filter(s => bolehTulis(p, s));
const adaTanggal = (t, kini) => S.tglSah(t) && t <= S.geserHari(wib(kini), 1);

/* ================================================================ data dasar */
async function ambilHari(env, tanggal) { return env.DB.prepare("SELECT * FROM lk_hari WHERE tanggal_laporan = ?").bind(tanggal).first(); }
/* hari nyata SELALU dummy = 0: hari dummy hanya lahir dari jalur dummy Super Admin (dummyIsi, TANGGAL_DUMMY), tidak pernah dari aktor biasa */
async function pastikanHari(env, tanggal, kini) {
  await env.DB.prepare("INSERT OR IGNORE INTO lk_hari (tanggal_laporan, prioritas, dibuat, dummy) VALUES (?, ?, ?, 0)").bind(tanggal, JSON.stringify(S.PRIORITAS_BAWAAN), kini).run();
  return ambilHari(env, tanggal);
}
/* isolasi dummy untuk TULIS: aktor dummy hanya di hari dummy (hari nyata atau yang belum ada = 404, tak boleh membuat hari); aktor nyata di hari dummy = 409 (Super Admin boleh, itu pemiliknya) */
const gerbangDummy = (p, hari) => {
  const dum = !!hari && !hari.maya && hari.dummy === 1;
  if (p.dummy && !dum) return gagal(404, "tidak ditemukan");
  if (!p.dummy && dum && !p.superDummy) return gagal(409, "hari ini berisi data contoh; Super Admin perlu menghapusnya (🧹) dulu");
  return null;
};
const hariMaya = tanggal => ({tanggal_laporan: tanggal, status: "terbuka", prioritas: JSON.stringify(S.PRIORITAS_BAWAAN), pengecualian: "[]", ralat: 0, hash: null, dikunci_oleh: null, dikunci_pada: null, dibuat: null, dummy: 0, maya: true});
const kirimanHari = async (env, tanggal) => Object.fromEntries((await env.DB.prepare("SELECT * FROM lk_kiriman WHERE tanggal_laporan = ?").bind(tanggal).all()).results.map(r => [r.sumber, r]));
async function satelit(env) {
  try { const r = await env.ASSETS.fetch(new Request("http://aset.lokal/data/laporan.json")); if (!r.ok) { r.body?.cancel(); return null; } return await r.json(); } catch (e) { return null; }
}
/* data terakhir sebelum tanggal: kiriman terkirim/disetujui sumber ini; prov juga membawa FS dari lk_fs */
async function kemarinDari(env, tanggal, sumber, dummy) {
  const prev = await env.DB.prepare("SELECT tanggal_laporan t, isi FROM lk_kiriman WHERE sumber = ? AND tanggal_laporan < ? AND status IN ('terkirim', 'disetujui') AND dummy = ? ORDER BY tanggal_laporan DESC LIMIT 1").bind(sumber, tanggal, dummy).first();
  if (!prev) return null;
  const isi = jsonDari(prev.isi) || {}, kode = S.kodeDariSumber(sumber);
  const fs = kode ? (await env.DB.prepare("SELECT fs_id, tugas_id, kab, kec, lat, lon, kawasan, target_ha, padam_ha, sisa_ha, status, kumulatif FROM lk_fs WHERE prov = ? AND tanggal_laporan = ? AND dummy = ? ORDER BY fs_id").bind(kode, prev.t, dummy).all()).results : [];
  return {tanggal: prev.t, isi, fs, personel: isi.personel, hotspot: isi.hotspot, total: isi.total};
}

/* ================================================================ draf otomatis (SOP §7.3 langkah 1) */
const WIB_07 = tanggal => Date.parse(tanggal + "T07:00:00+07:00");
const PETA_UNSUR = {bpbd: "bpbd", tni: "tni", polri: "polri", manggala_agni: "manggala_agni", mpa: "mpa", damkar: "pemda", swasta: "swasta", relawan: "relawan", lainnya: "pemda"};   // lainnya + damkar -> pemda
async function drafProvinsi(env, tanggal, kode, dummy) {
  const td = S.tanggalData(tanggal), sumber = "prov:" + kode, kem = await kemarinDari(env, tanggal, sumber, dummy);
  const fs = (kem?.fs ?? []).filter(f => f.sisa_ha > 0.01).map(f => ({fs_id: f.fs_id, tugas_id: f.tugas_id, kab: f.kab, kec: f.kec, lat: f.lat, lon: f.lon, kawasan: f.kawasan, target_ha: f.target_ha,
    padam_darat_ha: null, padam_udara_ha: null, status: f.status, kumulatif: !!f.kumulatif, kemarin: {target_ha: f.target_ha, padam_ha: f.padam_ha}}));
  let baru = 0;
  try {   // FS baru: tugas api yang dikonfirmasi api_ada pada jendela cut-off 24 jam sebelum 07.00 WIB hari laporan, belum tertaut ke FS mana pun
    const mulai = WIB_07(tanggal) - HARI, akhir = WIB_07(tanggal);
    const T = (await env.DB.prepare(`SELECT t.id, t.kab, t.kec, t.lat, t.lon, t.luas_ha,
        (SELECT x.luas_ha FROM tugas_isian x WHERE x.tugas_id = t.id AND x.langkah = 'tindakan' ORDER BY x.dibuat DESC LIMIT 1) luas_kabar,
        (SELECT x.padam_ha FROM tugas_isian x WHERE x.tugas_id = t.id AND x.langkah = 'tindakan' ORDER BY x.dibuat DESC LIMIT 1) padam_kabar,
        (SELECT x.status_api FROM tugas_isian x WHERE x.tugas_id = t.id AND x.langkah = 'tindakan' ORDER BY x.dibuat DESC LIMIT 1) status_kabar
      FROM tugas_api t JOIN tugas_isian i ON i.tugas_id = t.id AND i.langkah = 'konfirmasi' AND i.hasil = 'api_ada'
      WHERE t.prov = ?1 AND t.dummy = ?2 AND i.dibuat >= ?3 AND i.dibuat < ?4 AND NOT EXISTS (SELECT 1 FROM lk_fs f WHERE f.tugas_id = t.id) ORDER BY i.dibuat LIMIT 200`).bind(kode, dummy, mulai, akhir).all()).results;
    const ada = new Set(fs.map(f => f.fs_id)); let n = 0;
    for (const t of T) {
      let id; do { n++; id = `FS-${kode}-${td.replace(/-/g, "")}-${String(n).padStart(3, "0")}`; } while (ada.has(id));
      fs.push({fs_id: id, tugas_id: t.id, kab: t.kab, kec: t.kec, lat: t.lat, lon: t.lon, kawasan: null, target_ha: t.luas_kabar ?? t.luas_ha ?? null, padam_darat_ha: t.padam_kabar ?? null, padam_udara_ha: null,
        status: t.status_kabar ?? "menyala", kumulatif: false, kemarin: null}); baru++;
    }
  } catch (e) { if (!/no such table: (tugas_|lk_)/i.test(String(e?.message || e))) throw e; }
  const sat = await satelit(env), idx = sat?.hari?.indexOf(td) ?? -1, titik = idx >= 0 ? sat.prov?.[kode]?.titik?.[idx] : null;
  let personel = kem?.personel ? {...kem.personel, diperbarui: false} : null;
  if (!personel) {
    try {
      const p = (await personelProvinsi(env, td)).provinsi.find(x => x.prov === kode);
      if (p && p.personel_total > 0) {
        const unsur = {}; for (const [k, v] of Object.entries(p.unsur)) if (v) unsur[PETA_UNSUR[k]] = (unsur[PETA_UNSUR[k]] ?? 0) + v;
        personel = {total: p.personel_total, unsur: p.tanpa_unsur ? {} : unsur, diperbarui: false};
      }
    } catch (e) { /* tabel tugas belum ada */ }
  }
  let peralatan = [];
  try { const p = (await inventarisProvinsi(env)).provinsi.find(x => x.prov === kode); if (p) peralatan = Object.entries(p.siap).filter(([, n]) => n > 0).map(([kategori, n]) => ({kategori, stok: n, tambahan: 0})); } catch (e) { /* inventaris belum ada */ }
  const mentah = {fs, hotspot: titik != null ? {total: titik} : undefined, personel: personel ?? {total: null},
    peralatan, darurat: kem?.isi?.darurat ?? undefined, kondisi: [], hambatan: {pilihan: []}, upaya: {pilihan: []}};
  return {isi: S.normalisasiProvinsi(mentah, {kode, tanggal_laporan: tanggal}, false).isi, kemarin: kem, fs_baru: baru, fs_kemarin: fs.length - baru};
}
async function drafPusat(env, tanggal, sumber, dummy, prioritas) {
  if (sumber === "udara") {
    const kem = await kemarinDari(env, tanggal, "udara", dummy);
    return {isi: S.normalisasiUdara({armada: kem?.isi?.armada ?? [], sortie: []}, {tanggal_laporan: tanggal}, false).isi, kemarin: kem};
  }
  /* OMC: sortie hari data dari catatan TMC (src/omc.js, migrasi 0033); tanpa 0033 kembaliannya [] dan draf kosong seperti semula. Udara: belum ada tabel sortie serupa, jadi tetap dari armada kemarin. */
  if (sumber === "omc") return {isi: S.normalisasiOmc({sortie: await sortieHari(env, S.tanggalData(tanggal), !!dummy), hasil: []}, {tanggal_laporan: tanggal}, false).isi, kemarin: null};
  /* koordalops: kejadian karhutla di luar provinsi prioritas dari laporan_bnpb harian (bila ada); selainnya diisi manual */
  let kejadian = [], dari = false;
  try {
    const r = await env.DB.prepare("SELECT isi FROM laporan_bnpb WHERE jenis = 'harian' AND tanggal = ?").bind(tanggal).first(), k = jsonDari(r?.isi)?.kejadian;
    if (Array.isArray(k)) {
      const dalam = new Set(prioritas.flatMap(c => [c, S.namaProv(c).toLowerCase()]));
      kejadian = k.filter(x => /karhutla|kebakaran/i.test(String(x?.jenis ?? "")) && !dalam.has(String(x?.prov ?? "").toLowerCase()) && x?.prov)
        .map(x => ({prov: String(x.prov), kab: x.lokasi ?? null, jenis: "karhutla", luas_ha: null, keterangan: [x.utama, x.kedua].filter(Boolean).join(", ") || null})); dari = kejadian.length > 0;
    }
  } catch (e) { /* laporan_bnpb (0023) belum ada */ }
  return {isi: S.normalisasiKoordalops({kejadian, dari_laporan_bnpb: dari}, {tanggal_laporan: tanggal}, false).isi, kemarin: null};
}
async function drafUntuk(env, tanggal, sumber, hari) {
  const kode = S.kodeDariSumber(sumber);
  return kode ? drafProvinsi(env, tanggal, kode, hari.dummy) : drafPusat(env, tanggal, sumber, hari.dummy, jsonDari(hari.prioritas) || []);
}
/* cron 07.00 WIB: hari + draf semua sumber wajib dan koordalops; idempoten (INSERT OR IGNORE). Dijalankan menit 1 dan 31 jam 00 UTC (ulang bila gagal). */
export async function buatDrafLaporanKarhutla(env, kini = Date.now()) {
  try {
    const tanggal = wib(kini), hari = await pastikanHari(env, tanggal, kini);
    if (hari.dummy) return {tanggal, lewat: "hari berisi data contoh (dummy): dilewati, bukan ditimpa; butir Meja Pantau mengingatkan Super Admin"};
    if (hari.status !== "terbuka") return {tanggal, lewat: "sudah dikunci"};
    const ada = await kirimanHari(env, tanggal), pr = jsonDari(hari.prioritas) || [], dibuat = [];
    for (const sumber of [...S.sumberWajib(pr), "koordalops"]) {
      if (ada[sumber]) continue;
      const {isi, kemarin} = await drafUntuk(env, tanggal, sumber, hari), tIsi = JSON.stringify(isi), tCek = JSON.stringify(S.cek(sumber, isi, kemarin));
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO lk_kiriman (tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dummy) VALUES (?1, ?2, 'draf', 1, ?3, ?4, 'sistem', ?5, ?6)").bind(tanggal, sumber, tIsi, tCek, kini, hari.dummy),
        env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, dummy) SELECT ?1, ?2, 1, 'draf_otomatis', 'draf', ?3, ?4, 'sistem', ?5, ?6 WHERE changes() > 0").bind(tanggal, sumber, tIsi, tCek, kini, hari.dummy)]);
      dibuat.push(sumber);
    }
    return {tanggal, dibuat};
  } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0032 belum diterapkan"}; throw e; }
}

/* ================================================================ tulis kiriman (draf/kirim) */
function barisFs(isi, kode, tanggal, dummy) {
  return isi.fs.map(f => ({fs_id: f.fs_id, tugas_id: f.tugas_id, kab: f.kab, kec: f.kec, lat: f.lat, lon: f.lon, kawasan: f.kawasan, target_ha: f.target_ha ?? 0, padam_ha: Math.round(((f.padam_darat_ha ?? 0) + (f.padam_udara_ha ?? 0)) * 100) / 100,
    sisa_ha: f.sisa_ha, status: f.status ?? "menyala", kumulatif: f.kumulatif ? 1 : 0, prov: kode, tanggal, dummy}));
}
/* tulisan FS hanya berlaku bila kiriman hari itu benar-benar versi yang baru kita tulis (penulis yang kalah balapan tidak menyentuh lk_fs): g = {tanggal, sumber, versi, kini, oleh} */
const SYARAT_FS = "EXISTS (SELECT 1 FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ? AND versi = ? AND diubah = ? AND pengirim = ?)";
const stmtFs = (env, rows, kode, tanggal, g) => { const ikat = [g.tanggal, g.sumber, g.versi, g.kini, g.oleh];
  return [env.DB.prepare(`DELETE FROM lk_fs WHERE prov = ? AND tanggal_laporan = ? AND ${SYARAT_FS}`).bind(kode, tanggal, ...ikat),
    ...rows.map(r => env.DB.prepare(`INSERT INTO lk_fs (fs_id, tanggal_laporan, prov, tugas_id, kab, kec, lat, lon, kawasan, target_ha, padam_ha, sisa_ha, status, kumulatif, dummy) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15 WHERE ${SYARAT_FS}`)
      .bind(r.fs_id, r.tanggal, r.prov, r.tugas_id, r.kab, r.kec, r.lat, r.lon, r.kawasan, r.target_ha, r.padam_ha, r.sisa_ha, r.status, r.kumulatif, r.dummy, ...ikat))]; };
async function tulisKiriman(env, o) {
  const {tanggal, sumber, isi, cek, status, aksi, oleh, kini, klien, dasar, dummy, fs} = o;
  if (klien) {
    const u = await env.DB.prepare("SELECT versi, status FROM lk_versi WHERE tanggal_laporan = ? AND sumber = ? AND klien_id = ?").bind(tanggal, sumber, klien).first();
    if (u) return {ulang: true, versi: u.versi, status: u.status};
  }
  const ada = await env.DB.prepare("SELECT versi, status, catatan FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(tanggal, sumber).first(), skrg = ada?.versi ?? 0;
  if (skrg !== dasar) return {konflik: true, versi_terakhir: skrg, status: ada?.status ?? null};
  const baru = skrg + 1, tIsi = JSON.stringify(isi), tCek = JSON.stringify(cek), kirim = aksi === "kirim";
  if (tIsi.length > 250000) return {galat: "isian terlalu besar (maksimal sekitar 250 KB); kurangi jumlah baris", s: 413};
  const st = [ada
    ? env.DB.prepare("UPDATE lk_kiriman SET status = ?1, versi = ?2, isi = ?3, cek = ?4, pengirim = ?5, diubah = ?6, dikirim = ?7, catatan = ?8, verif_oleh = NULL, verif_pada = NULL WHERE tanggal_laporan = ?9 AND sumber = ?10 AND versi = ?11")
      .bind(status, baru, tIsi, tCek, oleh, kini, kirim ? kini : null, kirim ? null : ada.catatan, tanggal, sumber, skrg)
    : env.DB.prepare("INSERT INTO lk_kiriman (tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)").bind(tanggal, sumber, status, baru, tIsi, tCek, oleh, kini, kirim ? kini : null, dummy),
    env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, klien_id, dummy) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11 WHERE changes() > 0").bind(tanggal, sumber, baru, aksi, status, tIsi, tCek, oleh, kini, klien ?? null, dummy)];
  if (fs) st.push(...stmtFs(env, fs, S.kodeDariSumber(sumber), tanggal, {tanggal, sumber, versi: baru, kini, oleh}));
  const kalah = async () => { const n = await env.DB.prepare("SELECT versi, status FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(tanggal, sumber).first(); return {konflik: true, versi_terakhir: n?.versi ?? 0, status: n?.status ?? null}; };
  let r;
  try { r = await env.DB.batch(st); }
  catch (e) {
    const m = String(e?.message || e);
    if (/lk_fs/.test(m) && /UNIQUE/i.test(m)) return {galat: "satu tugas api hanya boleh tertaut ke satu fire spot dalam sehari"};
    if (/CHECK constraint/i.test(m)) { const besar = /length\(isi\)/i.test(m); return {galat: besar ? "isian melebihi batas ukuran (262144 karakter)" : "isian melanggar batas skema: " + m.replace(/^.*CHECK constraint failed:?/i, "").slice(0, 120).trim(), s: besar ? 413 : 400}; }
    if (/UNIQUE|constraint/i.test(m)) { const n = await env.DB.prepare("SELECT versi, status FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(tanggal, sumber).first(); return {konflik: true, versi_terakhir: n?.versi ?? 0, status: n?.status ?? null}; }
    throw e;
  }
  if (!r[0].meta.changes) return kalah();   // UPDATE kalah balapan (versi sudah bergeser): tak ada versi, tak ada FS yang tertulis
  return {versi: baru, status};
}
const tolakKonflik = r => gagal(409, `kiriman sudah berubah (versi terakhir ${r.versi_terakhir}${r.status ? ", status " + r.status : ""}); muat ulang sebelum menyimpan`, {"x-versi": String(r.versi_terakhir)});

async function tugasSah(env, kode, isi) {
  const ids = isi.fs.map(f => f.tugas_id).filter(Boolean); if (!ids.length) return null;
  try {
    const ok = new Set((await env.DB.prepare("SELECT id FROM tugas_api WHERE prov = ? AND id IN (SELECT value FROM json_each(?))").bind(kode, JSON.stringify(ids)).all()).results.map(r => r.id));
    const buruk = ids.find(i => !ok.has(i)); return buruk ? `tugas_id ${buruk} tidak ditemukan di provinsi ini` : null;
  } catch (e) { if (/no such table: tugas_/i.test(String(e?.message || e))) return null; throw e; }
}

/* ================================================================ rute: simpan draf, kirim */
async function parameterKiriman(env, req, kini, p) {
  const b = await bacaBody(req, 300 * 1024); if (b.galat) return {r: gagal(b.status || 400, b.galat)};
  const {tanggal, sumber, isi, klien_id, versi_dasar} = b.o;
  if (typeof tanggal !== "string" || !adaTanggal(tanggal, kini)) return {r: gagal(400, "tanggal harus YYYY-MM-DD yang sah dan tidak lebih dari besok")};
  if (!S.sumberSah(sumber)) return {r: gagal(400, "sumber harus prov:<kode>, udara, omc, atau koordalops")};
  if (p.tipe === "pemprov" && !bolehTulis(p, sumber)) return {r: gagal(404, "kiriman tidak ditemukan")};   // provinsi lain: 404 sama dengan "tidak ada"
  if (!bolehTulis(p, sumber)) return {r: gagal(403, "peran Anda tidak mengisi sumber ini")};
  if (klien_id != null && !(typeof klien_id === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(klien_id))) return {r: gagal(400, "klien_id harus 8-40 huruf/angka")};
  if (!Number.isInteger(versi_dasar) || versi_dasar < 0) return {r: gagal(400, "versi_dasar wajib (0 bila belum ada kiriman)")};
  const hari = (await ambilHari(env, tanggal)) ?? hariMaya(tanggal);
  const gd = gerbangDummy(p, hari); if (gd) return {r: gd};
  if (hari.status !== "terbuka") return {r: gagal(409, "laporan hari itu sudah dikunci; koreksi lewat ralat oleh verifikator")};
  const kode = S.kodeDariSumber(sumber);
  if (kode && !(jsonDari(hari.prioritas) || []).includes(kode)) return {r: gagal(409, "provinsi ini bukan provinsi prioritas pada hari itu")};
  return {tanggal, sumber, isi, klien: klien_id ?? null, dasar: versi_dasar, hari, kode};
}
const galatBentuk = g => json({galat: `isian tidak sah, ${S.galatManusia(g[0])}`, rincian: g.slice(0, 50)}, 400);
async function simpanDraf(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  const a = await parameterKiriman(env, req, kini, p); if (a.r) return a.r;
  const {isi, galat} = S.normalisasi(a.sumber, a.isi, a.tanggal, false); if (galat.length) return galatBentuk(galat);
  const kem = a.kode ? await kemarinDari(env, a.tanggal, a.sumber, a.hari.dummy) : null;
  if (a.hari.maya) await pastikanHari(env, a.tanggal, kini);
  const r = await tulisKiriman(env, {...a, isi, cek: S.cek(a.sumber, isi, kem), status: "draf", aksi: "draf", oleh: p.oleh, kini, dummy: a.hari.dummy});
  if (r.konflik) return tolakKonflik(r); if (r.galat) return gagal(r.s ?? 400, r.galat);
  return json({ok: true, versi: r.versi, status: r.status, ulang: !!r.ulang, cek: S.cek(a.sumber, isi, kem), hitung: S.hitungCek(S.cek(a.sumber, isi, kem))}, r.ulang ? 200 : 201);
}
async function kirimKiriman(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  const a = await parameterKiriman(env, req, kini, p); if (a.r) return a.r;
  let mentah = a.isi;
  if (mentah == null) { const k = await env.DB.prepare("SELECT isi FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(a.tanggal, a.sumber).first(); mentah = jsonDari(k?.isi); if (!mentah) return gagal(400, "belum ada draf untuk dikirim; sertakan isi"); }
  const {isi, galat} = S.normalisasi(a.sumber, mentah, a.tanggal, true); if (galat.length) return galatBentuk(galat);
  if (a.kode) { const g = await tugasSah(env, a.kode, isi); if (g) return gagal(400, g); }
  const kem = a.kode ? await kemarinDari(env, a.tanggal, a.sumber, a.hari.dummy) : null, cek = S.cek(a.sumber, isi, kem);
  if (a.hari.maya) await pastikanHari(env, a.tanggal, kini);
  const dummy = a.hari.dummy;
  const r = await tulisKiriman(env, {...a, isi, cek, status: "terkirim", aksi: "kirim", oleh: p.oleh, kini, dummy, fs: a.kode ? barisFs(isi, a.kode, a.tanggal, dummy) : null});
  if (r.konflik) return tolakKonflik(r); if (r.galat) return gagal(r.s ?? 400, r.galat);
  return json({ok: true, versi: r.versi, status: r.status, ulang: !!r.ulang, cek, hitung: S.hitungCek(cek)}, r.ulang ? 200 : 201);
}

/* ================================================================ baca: hari, kiriman */
async function tautanTagih(env, tanggal, kode, dummy) {
  const a = await env.DB.prepare("SELECT wa, wilayah FROM instansi_akun WHERE jenis = 'pemprov' AND tingkat = 'prov' AND status = 'aktif' AND dummy = ? AND EXISTS (SELECT 1 FROM json_each(cakupan) WHERE value = ?) ORDER BY dibuat LIMIT 1").bind(dummy, kode).first().catch(() => null);
  if (!a?.wa || !/^\d{8,15}$/.test(a.wa)) return null;
  const teks = `Pusdalops BNPB: laporan harian karhutla ${tanggal} untuk ${S.namaProv(kode)} belum terkirim (batas 09.00 WIB). Mohon dikirim lewat /instansi, tab Laporan harian.`;
  return {untuk: a.wilayah, tautan: `https://wa.me/${a.wa}?text=${encodeURIComponent(teks)}`};
}
async function bacaHari(env, req, url, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (p.tipe === "pemprov") return gagal(403, "kelengkapan laporan hanya untuk staf dan admin");
  const tanggal = url.searchParams.get("tanggal");
  if (tanggal == null) {
    const R = (await env.DB.prepare("SELECT tanggal_laporan, status, ralat, dummy FROM lk_hari ORDER BY tanggal_laporan DESC LIMIT 40").all()).results;
    return json({kini, hari: R});
  }
  if (!S.tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
  const row = await ambilHari(env, tanggal), hari = row ?? hariMaya(tanggal), pr = jsonDari(hari.prioritas) || [], kir = await kirimanHari(env, tanggal), wajib = S.sumberWajib(pr);
  const baris = [...wajib, ...(wajib.includes("koordalops") ? [] : ["koordalops"])].map(s => { const k = kir[s], cek = jsonDari(k?.cek) || [];
    return {sumber: s, label: S.labelSumber(s), wajib: wajib.includes(s), status: k?.status ?? "belum", versi: k?.versi ?? 0, diubah: k?.diubah ?? null, dikirim: k?.dikirim ?? null, pengirim: k ? topeng(k.pengirim) : null,
      catatan: k?.catatan ?? null, cek: S.hitungCek(cek), merah: cek.filter(x => x.t === "merah").length}; });
  const batas = batasMs(tanggal), tagihOK = verifikator(p), tagih = [];
  if (tagihOK && hari.status === "terbuka") for (const s of wajib) { const k = S.kodeDariSumber(s); if (!k || ["terkirim", "disetujui"].includes(kir[s]?.status)) continue; const t = await tautanTagih(env, tanggal, k, hari.dummy); if (t) tagih.push({sumber: s, ...t}); }
  return json({kini, tanggal, tanggal_data: S.tanggalData(tanggal), tersimpan: !!row, dummy: hari.dummy, status: S.statusHari({status: hari.status, prioritas: pr, kiriman: kir}), status_tersimpan: hari.status, prioritas: pr,
    wajib, batas_wib: batas, lewat_batas: kini > batas, ralat: hari.ralat, hash: hari.hash, dikunci_pada: hari.dikunci_pada, pengecualian: jsonDari(hari.pengecualian) || [], kiriman: baris, tagih,
    boleh: {tulis: tulisanDari(p, [...wajib, "koordalops"]), verifikasi: verifikator(p), super: !!await superOK(env, req)}, nama_prov: S.NAMA_PROV});
}
async function bacaKiriman(env, req, url, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  const tanggal = url.searchParams.get("tanggal"), sumber = url.searchParams.get("sumber");
  if (!S.tglSah(tanggal || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (!S.sumberSah(sumber)) return gagal(400, "sumber tidak sah");
  if (p.tipe === "pemprov" && !p.cakupan.includes(S.kodeDariSumber(sumber) ?? "")) return gagal(404, "kiriman tidak ditemukan");
  const row = await ambilHari(env, tanggal), hari = row ?? hariMaya(tanggal), kode = S.kodeDariSumber(sumber);
  const k = await env.DB.prepare("SELECT * FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(tanggal, sumber).first();
  const kem = kode ? await kemarinDari(env, tanggal, sumber, hari.dummy) : null;
  let isi, otomatis = false, meta = {};
  if (k) isi = jsonDari(k.isi);
  else { const d = await drafUntuk(env, tanggal, sumber, hari); isi = d.isi; otomatis = true; meta = {fs_baru: d.fs_baru ?? 0, fs_kemarin: d.fs_kemarin ?? 0}; }
  const riwayat = k ? (await env.DB.prepare("SELECT versi, aksi, status, oleh, waktu, catatan FROM lk_versi WHERE tanggal_laporan = ? AND sumber = ? ORDER BY id DESC LIMIT 30").bind(tanggal, sumber).all()).results.map(r => ({...r, oleh: topeng(r.oleh)})) : [];
  const cek = S.cek(sumber, isi, kem);
  return json({kini, tanggal, sumber, label: S.labelSumber(sumber), ada: !!k, draf_otomatis: otomatis, ...meta, versi: k?.versi ?? 0, status: k?.status ?? "draf", catatan: k?.catatan ?? null, diubah: k?.diubah ?? null, dikirim: k?.dikirim ?? null,
    terkunci: hari.status !== "terbuka", wajib: (jsonDari(hari.prioritas) || []).includes(kode ?? "") || ["udara", "omc"].includes(sumber), isi, cek, hitung: S.hitungCek(cek),
    kemarin: kem ? {tanggal: kem.tanggal, fs: kem.fs, personel: kem.personel ?? null, hotspot: kem.hotspot ?? null, total: kem.total ?? null} : null, riwayat,
    boleh_tulis: bolehTulis(p, sumber) && hari.status === "terbuka", boleh_verifikasi: verifikator(p)});
}

/* ================================================================ verifikasi */
async function verifikasi(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, p.tipe === "pemprov" ? "tidak ditemukan" : "hanya verifikator, pusdalops, atau moderator yang memverifikasi");
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const {tanggal, sumber, aksi, versi} = b.o, catatan = typeof b.o.catatan === "string" ? S.ringkas(b.o.catatan).slice(0, 500) : "";
  if (!S.tglSah(tanggal || "") || !S.sumberSah(sumber)) return gagal(400, "tanggal dan sumber wajib");
  if (!["setujui", "kembalikan"].includes(aksi)) return gagal(400, "aksi harus setujui atau kembalikan");
  if (aksi === "kembalikan" && catatan.length < 3) return gagal(400, "catatan pengembalian wajib (minimal 3 huruf)");
  if (!Number.isInteger(versi)) return gagal(400, "versi kiriman wajib");
  const hari = await ambilHari(env, tanggal); if (!hari) return gagal(404, "belum ada laporan hari itu");
  const gd = gerbangDummy(p, hari); if (gd) return gd;
  if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; koreksi lewat ralat");
  const k = await env.DB.prepare("SELECT * FROM lk_kiriman WHERE tanggal_laporan = ? AND sumber = ?").bind(tanggal, sumber).first();
  if (!k) return gagal(404, "kiriman belum ada");
  if (k.versi !== versi) return gagal(409, `versi sudah berubah (terakhir ${k.versi})`, {"x-versi": String(k.versi)});
  if (k.status !== "terkirim") return gagal(409, `hanya kiriman berstatus terkirim yang diverifikasi (sekarang ${k.status})`);
  if (aksi === "setujui") {
    const kode = S.kodeDariSumber(sumber), cek = S.cek(sumber, jsonDari(k.isi), kode ? await kemarinDari(env, tanggal, sumber, hari.dummy) : null);
    if (S.adaMerah(cek)) return json({galat: "cek merah menahan persetujuan; kembalikan ke pengirim", merah: cek.filter(x => x.t === "merah")}, 422);
  }
  const status = aksi === "setujui" ? "disetujui" : "dikembalikan", oleh = p.oleh;
  const r = await env.DB.batch([
    env.DB.prepare("UPDATE lk_kiriman SET status = ?1, verif_oleh = ?2, verif_pada = ?3, catatan = ?4 WHERE tanggal_laporan = ?5 AND sumber = ?6 AND versi = ?7 AND status = 'terkirim'").bind(status, oleh, kini, catatan || null, tanggal, sumber, versi),
    env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, catatan, dummy) SELECT tanggal_laporan, sumber, versi, ?1, status, isi, cek, ?2, ?3, catatan, dummy FROM lk_kiriman WHERE tanggal_laporan = ?4 AND sumber = ?5 AND changes() > 0")
      .bind(aksi === "setujui" ? "setujui" : "kembalikan", oleh, kini, tanggal, sumber)]);
  if (!r[0].meta.changes) return gagal(409, "kiriman berubah saat diverifikasi; muat ulang");
  return json({ok: true, status, versi});
}
async function ubahPrioritas(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator yang menetapkan provinsi prioritas");
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const {tanggal, provinsi} = b.o;
  if (!adaTanggal(tanggal, kini)) return gagal(400, "tanggal tidak sah");
  if (!Array.isArray(provinsi) || provinsi.length < 1 || provinsi.length > 12 || !provinsi.every(k => typeof k === "string" && Object.hasOwn(S.NAMA_PROV, k)) || new Set(provinsi).size !== provinsi.length) return gagal(400, "provinsi: 1-12 kode unik dari daftar karhutla");
  let hari = (await ambilHari(env, tanggal)) ?? hariMaya(tanggal);
  const gd = gerbangDummy(p, hari); if (gd) return gd;
  if (hari.maya) hari = await pastikanHari(env, tanggal, kini);
  if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; prioritas beku");
  await env.DB.prepare("UPDATE lk_hari SET prioritas = ? WHERE tanggal_laporan = ? AND status = 'terbuka'").bind(JSON.stringify(provinsi), tanggal).run();
  return json({ok: true, prioritas: provinsi});
}

/* ================================================================ kunci dan ralat */
async function snapshotSebelum(env, tanggal, dummy) {
  const R = (await env.DB.prepare("SELECT s.isi FROM lk_snapshot s WHERE s.tanggal_laporan < ?1 AND s.dummy = ?2 AND s.ralat = (SELECT max(ralat) FROM lk_snapshot WHERE tanggal_laporan = s.tanggal_laporan) ORDER BY s.tanggal_laporan DESC LIMIT 3").bind(tanggal, dummy).all()).results;
  return R.map(r => jsonDari(r.isi)).filter(x => x?.nasional?.fs_ha).reverse();   // baris tak berbentuk snapshot dilewati, bukan menjatuhkan kunci
}
/* kiriman yang dipakai agregasi: disetujui; yang dikecualikan memakai data terakhir (terkirim/disetujui) sebelum tanggal, tercetak dengan tanggalnya */
async function susunKiriman(env, tanggal, hari, kir, pengecualian, ganti = {}) {
  const out = {}, tanpa = new Set(pengecualian.map(x => x.sumber));
  for (const [s, k] of Object.entries(kir)) if (k.status === "disetujui" && !tanpa.has(s)) out[s] = {isi: jsonDari(k.isi)};
  for (const [s, isi] of Object.entries(ganti)) out[s] = {isi};
  for (const x of pengecualian) {
    const prev = await env.DB.prepare("SELECT tanggal_laporan t, isi FROM lk_kiriman WHERE sumber = ? AND tanggal_laporan < ? AND status IN ('terkirim', 'disetujui') AND dummy = ? ORDER BY tanggal_laporan DESC LIMIT 1").bind(x.sumber, tanggal, hari.dummy).first();
    out[x.sumber] = prev ? {isi: jsonDari(prev.isi), data_terakhir: prev.t} : {isi: null, data_terakhir: null};
  }
  return out;
}
async function bangunSnapshot(env, hari, tanggal, kir, pengecualian, ralat, alasan, oleh, kini, ganti, dampak = null) {
  const kiriman = await susunKiriman(env, tanggal, hari, kir, pengecualian, ganti);
  return S.agregasi({tanggal_laporan: tanggal, prioritas: jsonDari(hari.prioritas) || [], pengecualian, kiriman, sebelumnya: await snapshotSebelum(env, tanggal, hari.dummy), satelit: await satelit(env),
    ralat, alasan, dikunci_oleh: topeng(oleh), dikunci_pada: kini, dampak});
}
/* dampak korban jiwa hari data (angka saja, tanpa nama; src/korban.js). Dibekukan di snapshot saat kunci; ralat memakai dampak snapshot sebelumnya supaya tidak bergeser diam-diam. Tanpa laporan atau tanpa 0034: null, snapshot persis seperti semula. */
const dampakHari = async (env, tanggal, dummy) => { const k = await korbanHari(env, S.tanggalData(tanggal), {dummy: !!dummy}); return k.laporan > 0 ? k : null; };
async function kunci(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator, pusdalops, atau moderator yang mengunci");
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const tanggal = b.o.tanggal; if (!S.tglSah(tanggal || "")) return gagal(400, "tanggal tidak sah");
  if (tanggal > wib(kini)) return gagal(400, "tanggal belum tiba; laporan hanya bisa dikunci pada hari itu atau sesudahnya");
  let hari = (await ambilHari(env, tanggal)) ?? hariMaya(tanggal);
  const gd = gerbangDummy(p, hari); if (gd) return gd;
  if (hari.maya) hari = await pastikanHari(env, tanggal, kini);
  if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; koreksi lewat ralat");
  const pr = jsonDari(hari.prioritas) || [], wajib = S.sumberWajib(pr), kir = await kirimanHari(env, tanggal);
  const lanjut = b.o.lanjut_tanpa ?? [];
  if (!Array.isArray(lanjut) || lanjut.length > 12) return gagal(400, "lanjut_tanpa harus daftar");
  const pengecualian = [];
  for (const x of lanjut) {
    const alasan = typeof x?.alasan === "string" ? S.ringkas(x.alasan) : "";
    if (!wajib.includes(x?.sumber)) return gagal(400, `lanjut tanpa hanya untuk sumber wajib hari itu (${wajib.join(", ")})`);
    if (alasan.length < 10 || alasan.length > 300) return gagal(400, `alasan lanjut tanpa ${x.sumber} wajib 10-300 huruf`);
    if (pengecualian.some(y => y.sumber === x.sumber)) return gagal(400, "sumber berulang di lanjut_tanpa");
    pengecualian.push({sumber: x.sumber, alasan});
  }
  if (pengecualian.length && tanggal === wib(kini) && kini < batasMs(tanggal)) return gagal(409, "lanjut tanpa baru boleh dipakai untuk hari ini sesudah 09.00 WIB (batas daerah); tunggu atau minta sumbernya mengirim");
  const tanpa = new Set(pengecualian.map(x => x.sumber)), belum = wajib.filter(s => !tanpa.has(s) && kir[s]?.status !== "disetujui").map(s => ({sumber: s, label: S.labelSumber(s), status: kir[s]?.status ?? "belum"}));
  if (belum.length) return json({galat: `laporan belum bisa dikunci: ${belum.length} sumber wajib belum disetujui (${belum.map(x => x.label).join(", ")})`, belum}, 409);
  for (const s of wajib) if (!tanpa.has(s)) {
    const kode = S.kodeDariSumber(s), cek = S.cek(s, jsonDari(kir[s].isi), kode ? await kemarinDari(env, tanggal, s, hari.dummy) : null);
    if (S.adaMerah(cek)) return json({galat: `cek merah menahan kunci pada ${S.labelSumber(s)}`, sumber: s, merah: cek.filter(x => x.t === "merah")}, 422);
  }
  const snap = await bangunSnapshot(env, hari, tanggal, kir, pengecualian.map(x => x), 0, null, p.oleh, kini, undefined, await dampakHari(env, tanggal, hari.dummy));
  snap.pengecualian = snap.pengecualian.map(x => x);   // data_terakhir sudah tercetak oleh agregasi
  const teks = JSON.stringify(snap), hash = await sha(teks), status = pengecualian.length ? "dikunci_pengecualian" : "dikunci";
  const simpanPeng = JSON.stringify(snap.pengecualian);
  try {
    const r = await env.DB.batch([
      env.DB.prepare("INSERT INTO lk_snapshot (tanggal_laporan, ralat, hash, isi, oleh, waktu, dummy) VALUES (?1, 0, ?2, ?3, ?4, ?5, ?6)").bind(tanggal, hash, teks, p.oleh, kini, hari.dummy),
      env.DB.prepare("UPDATE lk_hari SET status = ?1, pengecualian = ?2, ralat = 0, hash = ?3, dikunci_oleh = ?4, dikunci_pada = ?5 WHERE tanggal_laporan = ?6 AND status = 'terbuka'").bind(status, simpanPeng, hash, p.oleh, kini, tanggal)]);
    if (!r[1].meta.changes) return gagal(409, "laporan sudah dikunci oleh orang lain");
  } catch (e) { const m = String(e?.message); if (/CHECK constraint/i.test(m)) return gagal(/length\(isi\)/i.test(m) ? 413 : 400, "snapshot melanggar batas skema: " + m.slice(0, 160)); if (/UNIQUE|constraint/i.test(m)) return gagal(409, "laporan sudah dikunci oleh orang lain"); throw e; }
  return json({ok: true, tanggal, status, ralat: 0, hash, pengecualian: snap.pengecualian}, 201);
}
async function ralat(env, req, kini) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator, pusdalops, atau moderator yang membuat ralat");
  const b = await bacaBody(req, 300 * 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const {tanggal, ganti} = b.o, alasan = typeof b.o.alasan === "string" ? S.ringkas(b.o.alasan) : "";
  if (!S.tglSah(tanggal || "")) return gagal(400, "tanggal tidak sah");
  if (tanggal > wib(kini)) return gagal(400, "tanggal belum tiba");
  if (alasan.length < 10 || alasan.length > 500) return gagal(400, "alasan ralat wajib 10-500 huruf");
  if (!ganti || typeof ganti !== "object" || Array.isArray(ganti) || !Object.keys(ganti).length || Object.keys(ganti).length > 12) return gagal(400, "ganti: objek sumber -> isi yang dikoreksi (1-12 sumber)");
  const hari = await ambilHari(env, tanggal); if (!hari) return gagal(404, "belum ada laporan hari itu");
  const gd = gerbangDummy(p, hari); if (gd) return gd;
  if (hari.status === "terbuka") return gagal(409, "laporan belum dikunci; ubah lewat kiriman biasa");
  const pr = jsonDari(hari.prioritas) || [], sahSumber = new Set([...S.sumberWajib(pr), "koordalops"]), kir = await kirimanHari(env, tanggal), lamaTeks = await env.DB.prepare("SELECT isi FROM lk_snapshot WHERE tanggal_laporan = ? AND ralat = ?").bind(tanggal, hari.ralat).first();
  const bersih = {}, st = [];
  for (const [s, mentah] of Object.entries(ganti)) {
    if (!sahSumber.has(s)) return gagal(400, `sumber ${s} bukan sumber hari itu`);
    const {isi, galat} = S.normalisasi(s, mentah, tanggal, true); if (galat.length) return galatBentuk(galat);
    bersih[s] = isi;
  }
  /* pengecualian = yang tercetak di snapshot ralat TERAKHIR (bukan lk_hari, yang beku di kunci pertama) dikurangi sumber yang kini diganti: ralat #2 tidak membatalkan ralat #1 */
  const lama = jsonDari(lamaTeks?.isi), asal = Array.isArray(lama?.pengecualian) ? lama.pengecualian : (jsonDari(hari.pengecualian) || []);
  const pengecualian = asal.filter(x => !Object.hasOwn(bersih, x.sumber)).map(x => ({sumber: x.sumber, alasan: x.alasan}));
  const kirBaru = {...kir};
  for (const [s, isi] of Object.entries(bersih)) {
    const kode = S.kodeDariSumber(s), cek = S.cek(s, isi, kode ? await kemarinDari(env, tanggal, s, hari.dummy) : null), ada = kir[s], baru = (ada?.versi ?? 0) + 1, tIsi = JSON.stringify(isi), tCek = JSON.stringify(cek);
    if (S.adaMerah(cek)) return json({galat: `cek merah menahan ralat pada ${S.labelSumber(s)}; betulkan angkanya dulu`, sumber: s, merah: cek.filter(x => x.t === "merah")}, 422);
    kirBaru[s] = {...(ada ?? {}), status: "disetujui", isi: tIsi};
    st.push(ada
      ? env.DB.prepare("UPDATE lk_kiriman SET status = 'disetujui', versi = ?1, isi = ?2, cek = ?3, pengirim = ?4, diubah = ?5, verif_oleh = ?4, verif_pada = ?5, catatan = ?6 WHERE tanggal_laporan = ?7 AND sumber = ?8 AND versi = ?9").bind(baru, tIsi, tCek, p.oleh, kini, "ralat: " + alasan.slice(0, 300), tanggal, s, ada.versi)
      : env.DB.prepare("INSERT INTO lk_kiriman (tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, catatan, verif_oleh, verif_pada, dummy) VALUES (?1, ?2, 'disetujui', ?3, ?4, ?5, ?6, ?7, ?7, ?8, ?6, ?7, ?9)").bind(tanggal, s, baru, tIsi, tCek, p.oleh, kini, "ralat: " + alasan.slice(0, 300), hari.dummy));
    st.push(env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, catatan, dummy) VALUES (?1, ?2, ?3, 'ralat', 'disetujui', ?4, ?5, ?6, ?7, ?8, ?9)").bind(tanggal, s, baru, tIsi, tCek, p.oleh, kini, alasan.slice(0, 500), hari.dummy));
    if (kode) st.push(...stmtFs(env, barisFs(isi, kode, tanggal, hari.dummy), kode, tanggal, {tanggal, sumber: s, versi: baru, kini, oleh: p.oleh}));
  }
  const n = hari.ralat + 1, snap = await bangunSnapshot(env, hari, tanggal, kirBaru, pengecualian, n, alasan, p.oleh, kini, undefined, lama?.dampak ?? null);
  const perubahan = bedaAman(lama, snap);
  if (!perubahan.length) return gagal(400, "koreksi tidak mengubah angka apa pun di snapshot");
  const teks = JSON.stringify(snap), hash = await sha(teks);
  st.push(env.DB.prepare("INSERT INTO lk_snapshot (tanggal_laporan, ralat, hash, isi, alasan, perubahan, oleh, waktu, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)").bind(tanggal, n, hash, teks, alasan, JSON.stringify(perubahan), p.oleh, kini, hari.dummy),
    env.DB.prepare("UPDATE lk_hari SET ralat = ?1, hash = ?2 WHERE tanggal_laporan = ?3 AND ralat = ?4").bind(n, hash, tanggal, hari.ralat));
  try { await env.DB.batch(st); } catch (e) { const m = String(e?.message); if (/CHECK constraint/i.test(m)) return gagal(/length\(isi\)/i.test(m) ? 413 : 400, "ralat melanggar batas skema: " + m.slice(0, 160)); if (/UNIQUE|constraint/i.test(m)) return gagal(409, "ralat bersamaan dari orang lain; muat ulang"); throw e; }
  return json({ok: true, tanggal, ralat: n, hash, perubahan}, 201);
}
const bedaAman = (lama, baru) => lama ? S.bedaSnapshot(lama, baru) : [];

/* ================================================================ baca snapshot (stabil) */
async function bacaSnapshot(env, req, url, kini, ctx, tanggal) {
  const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
  if (p.tipe === "pemprov") return gagal(403, "snapshot hanya untuk staf dan admin");
  if (!S.tglSah(tanggal || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
  const hari = await ambilHari(env, tanggal); if (!hari || hari.status === "terbuka") return gagal(404, "laporan hari itu belum dikunci");
  const q = url.searchParams.get("ralat"); if (q != null && !/^\d{1,3}$/.test(q)) return gagal(400, "ralat harus nomor");
  const n = q == null ? hari.ralat : Number(q);
  const r = await env.DB.prepare("SELECT ralat, hash, isi, alasan, perubahan, waktu FROM lk_snapshot WHERE tanggal_laporan = ? AND ralat = ?").bind(tanggal, n).first();
  if (!r) return gagal(404, "nomor ralat tidak ada");
  const daftar = (await env.DB.prepare("SELECT ralat, hash, alasan, waktu, json_array_length(perubahan) berubah FROM lk_snapshot WHERE tanggal_laporan = ? ORDER BY ralat").bind(tanggal).all()).results;
  const snap = JSON.parse(r.isi), utuh = (await sha(r.isi)) === r.hash;
  return json({tanggal, ralat: r.ralat, terbaru: r.ralat === hari.ralat, hash: r.hash, utuh, dikunci_pada: snap.dikunci_pada, alasan_ralat: r.alasan, perubahan: JSON.parse(r.perubahan), ralat_tersedia: daftar, snapshot: snap, teks_wa: teksWA(snap)});
}

/* ================================================================ dummy: satu hari penuh dari laporan 21 Okt 2026 (data per provinsi 20 Okt, angka nyata; tanpa angka karangan) */
export const TANGGAL_DUMMY = "2026-10-21";
export const DATA_DUMMY = {
  "62": {total: {fs: 98, fs_padam: 38, target_ha: 431.66, padam_ha: 110.31}, blok: [{kawasan: "Di luar TNTP", fs: 46, fs_padam: 33, target_ha: 74.77, padam_ha: 58.31}, {kawasan: "TNTP", fs: 52, fs_padam: 5, target_ha: 356.89, padam_ha: 52}],
    hotspot: 2083, personel: {total: 16387, shift: "2 shift + standby", keterangan: "Termasuk 2 shift dan standby"}},
  "63": {total: {fs: 32, fs_padam: 28, target_ha: 61.14, padam_ha: 57.42}, hotspot: 896, personel: {total: 7927}},
  "61": {total: {fs: 6, fs_padam: 5, target_ha: 16.79, padam_ha: 14.6}, hotspot: 14, personel: {total: 14458}},
  "16": {total: {fs: 96, fs_padam: 84, target_ha: 375.25, padam_ha: 291.25}, hotspot: 1055, personel: {total: 12285}},
  "15": {total: {fs: 29, fs_padam: 18, target_ha: 98.5, padam_ha: 28.5}, hotspot: 77, personel: {total: 5984}},
  "14": {total: {fs: 0, fs_padam: 0, target_ha: 0, padam_ha: 0}, hotspot: 4, personel: {total: 14837}},
};
async function dummyIsi(env, req, kini, oleh) {
  if (await ambilHari(env, TANGGAL_DUMMY)) return gagal(409, `tanggal ${TANGGAL_DUMMY} sudah punya laporan (dummy atau nyata); hapus dummy dulu bila itu dummy`);
  const st = [env.DB.prepare("INSERT INTO lk_hari (tanggal_laporan, prioritas, dibuat, dummy) VALUES (?, ?, ?, 1)").bind(TANGGAL_DUMMY, JSON.stringify(S.PRIORITAS_BAWAAN), kini)], isiAll = {};
  for (const [kode, d] of Object.entries(DATA_DUMMY)) {
    const {isi, galat} = S.normalisasiProvinsi({fs: [], total: d.total, blok: d.blok ?? [], hotspot: {total: d.hotspot}, personel: d.personel}, {kode, tanggal_laporan: TANGGAL_DUMMY}, true);
    if (galat.length) throw new Error("dummy provinsi tidak sah: " + JSON.stringify(galat[0])); isiAll["prov:" + kode] = isi;
  }
  isiAll.udara = S.normalisasiUdara({armada: [], sortie: [], alasan_kosong: "Contoh: rincian operasi udara tidak ada di data sumber laporan 21 Okt 2026", catatan: "DUMMY"}, {tanggal_laporan: TANGGAL_DUMMY}, true).isi;
  isiAll.omc = S.normalisasiOmc({sortie: [], hasil: [], alasan_kosong: "Contoh: rincian OMC tidak ada di data sumber laporan 21 Okt 2026", catatan: "DUMMY"}, {tanggal_laporan: TANGGAL_DUMMY}, true).isi;
  isiAll.koordalops = S.normalisasiKoordalops({kejadian: [], hotspot_nasional: {total: 4129, tinggi: 281, sedang: 3848}, alasan_kosong: "Contoh: kejadian di luar provinsi prioritas tidak ada di data sumber", catatan: "DUMMY"}, {tanggal_laporan: TANGGAL_DUMMY}, true).isi;
  for (const [sumber, isi] of Object.entries(isiAll)) {
    const tIsi = JSON.stringify(isi), tCek = JSON.stringify(S.cek(sumber, isi, null));
    st.push(env.DB.prepare("INSERT INTO lk_kiriman (tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, verif_oleh, verif_pada, dummy) VALUES (?1, ?2, 'disetujui', 1, ?3, ?4, ?5, ?6, ?6, ?5, ?6, 1)").bind(TANGGAL_DUMMY, sumber, tIsi, tCek, oleh, kini),
      env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, dummy) VALUES (?1, ?2, 1, 'kirim', 'terkirim', ?3, ?4, ?5, ?6, 1)").bind(TANGGAL_DUMMY, sumber, tIsi, tCek, oleh, kini),
      env.DB.prepare("INSERT INTO lk_versi (tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, dummy) VALUES (?1, ?2, 1, 'setujui', 'disetujui', ?3, ?4, ?5, ?6, 1)").bind(TANGGAL_DUMMY, sumber, tIsi, tCek, oleh, kini));
  }
  await env.DB.batch(st);
  return json({ok: true, tanggal: TANGGAL_DUMMY, kiriman: Object.keys(isiAll).length}, 201);
}
async function dummyHapus(env) {
  const n = (await env.DB.prepare("SELECT (SELECT count(*) FROM lk_hari WHERE dummy = 1) hari, (SELECT count(*) FROM lk_kiriman WHERE dummy = 1) kiriman, (SELECT count(*) FROM lk_snapshot WHERE dummy = 1) snapshot").first());
  await env.DB.batch(["lk_snapshot", "lk_versi", "lk_fs", "lk_kiriman", "lk_hari"].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`)));
  return json({ok: true, ...n});
}
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, req, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ pengait Meja Pantau: provinsi wajib belum kirim lewat 09.00 WIB (src/pantau.js laporanHarianProvinsi) */
export async function butirLaporanKarhutla(env, kini, bolehDummy) {
  const dari = wib(kini - 7 * HARI), sampai = wib(kini), out = [];
  /* hari ini berisi dummy: cron tidak membuat draf nyata di atasnya, jadi laporan nyata hari ini tidak akan terisi sampai dummy dihapus. Terlihat oleh semua peran pusdalops (butir nyata, bukan dummy). */
  const dm = await env.DB.prepare("SELECT tanggal_laporan FROM lk_hari WHERE dummy = 1 AND tanggal_laporan = ?").bind(sampai).first();
  if (dm) out.push({id: `lk-dummy:${sampai}`, jenis: "laporan_harian", judul: `Hari laporan ${sampai} berisi data contoh (dummy), jadi draf harian tidak dibuat`, rincian: "Super Admin perlu menghapus dummy (🧹 di Laporan Karhutla) agar laporan nyata hari ini bisa dibuat",
    provs: [], kab: null, dibuat: batasMs(sampai), tenggat: batasMs(sampai), prioritas: 1, dummy: 0});
  const H = (await env.DB.prepare(`SELECT tanggal_laporan, prioritas, dummy FROM lk_hari WHERE status = 'terbuka' AND tanggal_laporan >= ? AND tanggal_laporan <= ? ${bolehDummy ? "" : "AND dummy = 0"}`).bind(dari, sampai).all()).results;
  for (const h of H) {
    const batas = batasMs(h.tanggal_laporan); if (kini <= batas) continue;
    const kir = await kirimanHari(env, h.tanggal_laporan);
    for (const kode of jsonDari(h.prioritas) || []) {
      if (["terkirim", "disetujui"].includes(kir["prov:" + kode]?.status)) continue;
      const lama = durasi(kini - batas);
      out.push({id: `lk-belum:${h.tanggal_laporan}:${kode}`, jenis: "laporan_harian", judul: `${S.namaProv(kode)} belum mengirim laporan harian karhutla ${h.tanggal_laporan}, lewat ${lama} dari batas 09.00 WIB`,
        rincian: "Tagih operator provinsi lewat Laporan Karhutla (tombol tagih WA)", provs: [kode], kab: null, dibuat: batas, tenggat: batas, prioritas: kini - batas > HARI / 24 ? 1 : 2, dummy: h.dummy});
    }
  }
  return out;
}

/* ================================================================ halaman dan tabel rute */
/* rute digabung ke RUTE di src/worker.js. Hak diperiksa di tiap handler (pelaku): admin/moderator, sesi staf berperan, atau sesi akun instansi pemprov. */
export const RUTE_LAPORAN_KARHUTLA = Object.fromEntries(Object.entries({
  "GET /admin/laporan-karhutla": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanLaporanKarhutla, Object.keys(PERAN)),   // staf tanpa peran untuk halaman ini ke Meja Pantau, anonim ke login admin
  "GET /api/laporan-karhutla/hari": (env, req, url, kini) => bacaHari(env, req, url, kini),
  "GET /api/laporan-karhutla/kiriman": (env, req, url, kini) => bacaKiriman(env, req, url, kini),
  "POST /api/laporan-karhutla/draf": (env, req, url, kini) => simpanDraf(env, req, kini),
  "POST /api/laporan-karhutla/kirim": (env, req, url, kini) => kirimKiriman(env, req, kini),
  "POST /api/laporan-karhutla/verifikasi": (env, req, url, kini) => verifikasi(env, req, kini),
  "POST /api/laporan-karhutla/prioritas": (env, req, url, kini) => ubahPrioritas(env, req, kini),
  "POST /api/laporan-karhutla/kunci": (env, req, url, kini) => kunci(env, req, kini),
  "POST /api/laporan-karhutla/ralat": (env, req, url, kini) => ralat(env, req, kini),
  "GET /api/laporan-karhutla/snapshot/:tanggal": (env, req, url, kini, ctx, tanggal) => bacaSnapshot(env, req, url, kini, ctx, tanggal),
  "POST /api/laporan-karhutla/dummy": (env, req, url, kini) => dummy(env, req, kini),
  /* alias untuk operator provinsi: cookie sesi_instansi hanya dikirim peramban ke /instansi dan /api/instansi (Path), jadi halaman /instansi memakai tiga jalur ini; handler sama, hak sama */
  "GET /api/instansi/laporan/kiriman": (env, req, url, kini) => bacaKiriman(env, req, url, kini),
  "POST /api/instansi/laporan/draf": (env, req, url, kini) => simpanDraf(env, req, kini),
  "POST /api/instansi/laporan/kirim": (env, req, url, kini) => kirimKiriman(env, req, kini),
}).map(([k, f]) => [k, k.startsWith("GET /admin") ? f : lewat503(f)]));
