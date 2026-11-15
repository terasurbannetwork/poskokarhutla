/* Keterpaduan KP-03: GET /api/siklus/ingest/modul (Bearer PIPA_TOKEN). Kontrak mirip ingest/jendela: dari, sampai (maks 120 hari), lanjut; ditambah sumber.
   Satu panggilan = satu tabel lewat indeks kursornya (SQL di bagian Keterpaduan src/hak.js). Hanya kolom pencocok; tanpa nama, WA, PIC, isi laporan. Koordinat lp_tugas dibulatkan 3 desimal (~110 m): pencocok hanya butuh kab.
   Dipasang lewat RUTE_SIKLUS di src/siklus.js (izin "sistem"). Rancangan: data/kajian-bnpb/keterpaduan/ALGORITMA.md 1. */
import {json} from "./worker.js";
import {tolak, tglSah} from "./pusdalops_umum.js";
import {gerbangIngest, masukan, JENIS_SAH} from "./siklus_kejadian.js";
import {hariAntara} from "./siklus_hitung.js";
import * as H from "./hak.js";

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

export const RUTE_TAUTAN = {
  "GET /api/siklus/ingest/modul": {izin: ["sistem"], f: ingestModul},
};
