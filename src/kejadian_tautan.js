/* Keterpaduan KP-03: GET /api/siklus/ingest/modul (Bearer PIPA_TOKEN). Kontrak mirip ingest/jendela: dari, sampai (maks 120 hari), lanjut; ditambah sumber.
   Satu panggilan = satu tabel lewat indeks kursornya (SQL di bagian Keterpaduan src/hak.js). Hanya kolom pencocok; tanpa nama, WA, PIC, isi laporan. Koordinat lp_tugas dibulatkan 3 desimal (~110 m): pencocok hanya butuh kab.
   Dipasang lewat RUTE_SIKLUS di src/siklus.js (izin "sistem"). Rancangan: data/kajian-bnpb/keterpaduan/ALGORITMA.md 1. */
import {json} from "./worker.js";
import {tolak, tglSah} from "./pusdalops_umum.js";
import {gerbangIngest, masukan, JENIS_SAH} from "./siklus_kejadian.js";
import {hariAntara} from "./siklus_hitung.js";
import * as H from "./hak.js";
import {lingkupKab4, NAMA_KAB4} from "./siklus_kab.js";
import {JENIS_BUKU_BESAR} from "./lapor_kejadian.js";   // jenis tiket Lapor -> jenis kejadian, satu sumber dengan usulan LK-09

const BATAS = 500, WIB = 7 * 36e5;   // WIB = UTC+7 (ms)
const PETA = {gempabumi: "gempa", gelombang_pasang: "gelombang"};
const bulat = v => Math.round(v * 1e3) / 1e3;   // lat/lon tugas lapangan ~110 m
const tgl = ms => new Date(ms + WIB).toISOString().slice(0, 10);
const awalHari = t => Date.parse(t + "T00:00:00+07:00");

function param(c) {
  const q = c.url.searchParams;
  return masukan(() => {
    const sumber = q.get("sumber"); if (!H.KT_SUMBER.includes(sumber)) tolak(`sumber harus salah satu dari ${H.KT_SUMBER.join(", ")}`);
    const dari = q.get("dari"), sampai = q.get("sampai");
    if (!tglSah(dari) || !tglSah(sampai)) tolak("dari dan sampai wajib YYYY-MM-DD yang sah");
    if (dari > sampai) tolak("dari tidak boleh sesudah sampai");
    if (hariAntara(dari, sampai) > 120) tolak("rentang paling lama 120 hari");
    const lo = awalHari(dari), hi = awalHari(sampai) + 864e5, l = q.get("lanjut");
    let w = lo - 1, id = "";
    if (l) { const m = /^(\d{1,15})\|([0-9A-Za-z:_-]{1,40})$/.exec(l); if (!m) tolak("lanjut bukan penanda halaman yang sah"); w = Number(m[1]); id = m[2]; }
    return {sumber, lo, hi, w, id, batas: BATAS};
  });
}

/* jenis modul -> jenis kejadian; null = tidak dikirim (di luar JENIS_SAH, atau latihan) */
const jenisSah = (sumber, r) => {
  let j = sumber === "gempa_d1" ? "gempa" : sumber === "sippa" ? (r.jenis === "banjir" ? "banjir" : "karhutla") : (PETA[r.jenis] ?? r.jenis);
  return JENIS_SAH.includes(j) ? j : null;
};
function item(sumber, r) {
  if (sumber === "lapor_ai") {   // kab "32.71" (tiket) atau "3271" (usulan) -> prov "32" dan nama kab (pasang.py memetakan nama + prov ke kab4; bolak-balik diuji untuk 514 kab)
    const k4 = String(r.kab ?? "").replace(".", ""), usulan = r.usulan === 1;
    r = {...r, jenis: usulan ? r.jenis : JENIS_BUKU_BESAR[r.jenis] ?? r.jenis, prov: k4.slice(0, 2) || null, kab: Object.hasOwn(NAMA_KAB4, k4) ? NAMA_KAB4[k4] : null};
    if (!usulan && r.kab == null) return null;   // tiket kab tak dikenal: tidak dikirim (tiket hanya menempel)
    const jenis = jenisSah(sumber, r); if (!jenis) return null;
    const o = {sumber, kode: r.kode, jenis};
    if (r.prov != null) o.prov = r.prov;
    if (r.kab != null) o.kab = r.kab;   // usulan kab tak dikenal: dikirim tanpa kab supaya pasang.py menjawab tanpa_wilayah (LK-10)
    o.mulai = tgl(usulan ? r.mulai ?? r.w : r.w);
    if (usulan) o.usulan_staf = true;
    return o;
  }
  const jenis = jenisSah(sumber, r); if (!jenis) return null;
  const o = {sumber, kode: r.kode, jenis};
  if (r.prov != null) o.prov = r.prov;
  if (r.kab != null) o.kab = r.kab; else { o.lat = bulat(r.lat); o.lon = bulat(r.lon); }
  o.mulai = typeof r.mulai === "string" ? r.mulai.slice(0, 10) : tgl(r.w);
  if (sumber === "gempa_d1") o.utama_id = r.utama_id;
  return o;
}

async function ingestModul(c) {
  const t = await gerbangIngest(c); if (t) return t;
  const f = param(c), b = await H.ktBaris(c.env, f.sumber, f);
  return json({baris: b.slice(0, f.batas).map(r => item(f.sumber, r)).filter(Boolean), lanjut: b.length > f.batas ? `${b[f.batas - 1].w}|${b[f.batas - 1].cid}` : null});
}

/* KP-06: GET /api/siklus/kejadian/tautan?k=sumber:kode (sampai 50) atau ?sumber=&kode=. Staf (PD/KO/PM, SA, moderator) melihat semua; BP hanya kejadian yang kab4-nya di lingkup,
   selebihnya "belum" tanpa kejadian_id (sama dengan baris tidak ada). Petugas (x-kode) belum dipasang: ponytail, butuh pemetaan tugas lapangan ke kode sumber. */
const kandidatDari = t => { try { const a = JSON.parse(t || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };   // kandidat rusak tidak menjatuhkan seluruh panggilan
const MAKS_PASANG = 50, TERLIHAT = ["tugas_api", "logbook_d1", "sippa", "lapangan", "gempa_d1", "lapsus"];
async function tautan(c) {
  const q = c.url.searchParams;
  const ps = masukan(() => {
    const mentah = q.getAll("k");
    const qs = q.get("sumber"), qk = q.get("kode");
    if ((qs == null) !== (qk == null)) tolak("sumber dan kode harus diberi bersama");
    if (qs != null) mentah.push(`${qs}:${qk}`);
    if (!mentah.length) tolak("beri k=sumber:kode atau sumber dan kode");
    if (mentah.length > MAKS_PASANG) tolak(`paling banyak ${MAKS_PASANG} pasangan sekali panggil`);
    return mentah.map(m => { const i = m.indexOf(":"), s = m.slice(0, i), k = m.slice(i + 1);
      if (!TERLIHAT.includes(s)) tolak(`sumber harus salah satu dari ${TERLIHAT.join(", ")}`);
      if (i < 1 || k.length < 1 || k.length > 120) tolak("kode 1-120 karakter"); return [s, k]; });
  });
  const baris = await H.ktTautan(c.env, c.h.pelaku, ps, c.h.dummyOk);
  const bp = c.h.tipe === "bp";
  const kab = new Map();   // kejadian_id -> kab4 (BP saja)
  if (bp) {
    const ids = [...new Set(baris.flatMap(r => r ? [r.kejadian_id, ...kandidatDari(r.kandidat)] : []).filter(Boolean))];
    for (const r of await H.ktKab(c.env, c.h.pelaku, ids)) (kab.get(r.kejadian_id) ?? kab.set(r.kejadian_id, []).get(r.kejadian_id)).push(r.kab4);
  }
  const dalam = id => (kab.get(id) ?? []).some(k => lingkupKab4(c.h.akun, k));
  return json({tautan: ps.map(([sumber, kode], i) => {
    const r = baris[i], belum = {sumber, kode, status: "belum", kejadian_id: null, kandidat: null};
    if (!r) return belum;
    // BP: baris harus di lingkupnya, dan kejadian yang ditunjuk juga harus menyentuh lingkupnya (bukan kejadian kab lain)
    if (bp && !(r.kejadian_id ? dalam(r.kejadian_id) : (r.kab4 && lingkupKab4(c.h.akun, r.kab4)))) return belum;
    const kand = r.status === "ambigu" ? kandidatDari(r.kandidat).filter(id => !bp || dalam(id)) : null;
    return {sumber, kode, status: r.status, kejadian_id: r.kejadian_id, kandidat: kand};
  })});
}

export const RUTE_TAUTAN = {
  "GET /api/siklus/kejadian/tautan": {izin: ["STAF", "BP"], f: tautan},
  "GET /api/siklus/ingest/modul": {izin: ["sistem"], f: ingestModul},
};
