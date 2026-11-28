/* Potensi Bencana Hidromet (PH-07; data/kajian-bnpb/potensi-hidromet/DESAIN-TEKNIS.md Rute, KEPUTUSAN-POTENSI.md D10, D11).
   /api/potensi/analisis (publik, R2), /api/potensi/rekomendasi (staf, katalog), /api/bmkg/desa (publik, prakiraan BMKG per desa). Tanpa D1 baru. */
import {gagal, cacheTepi} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {stafOK, stafSesiSemua} from "./staf.js";
import {rekomendasi} from "./rekomendasi_katalog.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS = 2_000_000;
const JSONH = {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"};
const NO_STORE = {"cache-control": "no-store"};

/* ---- analisis: daftar izin kolom, tidak ada kunci lain yang lolos ---- */
const IZIN = ["matriks", "hujan", "hth", "gelombang", "debit", "desa_tinggi", "dibuat", "sumber"];
const analisis = (env, req, url, kini, ctx) => cacheTepi(new Request(url.origin + url.pathname), ctx, 300, async () => {
  const lj = await lajuIP(env, req, "potensi_analisis", [[60e3, 60]]); if (lj) return lj;
  const o = await env.MEDIA?.get("dampak_peringatan/analisis.json");
  if (!o || o.size > MAKS) { o?.body?.cancel?.(); return gagal(404, "analisis belum terbit"); }
  let d; try { d = await o.json(); } catch { return gagal(404, "analisis belum terbit"); }
  const out = {}; for (const k of IZIN) if (d && k in d) out[k] = d[k];
  return new Response(JSON.stringify(out), {headers: JSONH});
});

/* ---- rekomendasi: staf saja; 401 tanpa sesi, 403 sesi berperan lain ---- */
async function rekom(env, req, url) {
  if (!(await stafOK(env, req, PERAN))) return (await stafSesiSemua(env, req)) ? gagal(403, "peran tidak diizinkan", NO_STORE) : gagal(401, "perlu masuk sebagai staf", NO_STORE);
  const s = url.searchParams.get("status") ?? "";
  const r = /^[0-3]$/.test(s) ? rekomendasi(url.searchParams.get("bahaya") ?? "", Number(s)) : null;
  if (!r) return gagal(400, "bahaya atau status tidak sah", NO_STORE);
  return new Response(JSON.stringify({bahaya: url.searchParams.get("bahaya"), status: Number(s), ...r}), {headers: {...JSONH, ...NO_STORE}});
}

/* ---- BMKG per desa ---- */
const HAL = 50, JATAH_MENIT = 50, JATAH_PER_PERMINTAAN = 25, CACHE_DETIK = 3 * 3600;
const BMKG = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=";
let jendela = {m: 0, n: 0};   // ponytail: penghitung di memori isolat, bukan global antar isolat; pakai DO bila batas BMKG perlu dijaga ketat
const ambilJatah = () => { const m = Math.floor(Date.now() / 6e4); if (jendela.m !== m) jendela = {m, n: 0}; return jendela.n < JATAH_MENIT && ++jendela.n; };

let NAMA = null;   // Promise {kab: {"11.01": nama}, desa: Map kd -> [nama, kec]}; dari data/desa_cari.json (sumber nama yang sama dengan layar)
const muatNama = env => NAMA ||= env.ASSETS.fetch(new Request("https://aset.lokal/data/desa_cari.json")).then(async r => {
  if (!r.ok) throw new Error("desa_cari " + r.status);
  const d = await r.json(); return {kab: d.kab, desa: new Map(d.baris.map(([kd, n, kec]) => [kd, [n, kec]]))};
}).catch(e => { NAMA = null; throw e; });

/* respons BMKG -> per hari: hujan dijumlah (mm), suhu min/maks, angin maks (km/jam), kode cuaca terbanyak; tanpa nilai = null, bukan 0 */
export function ringkasBmkg(d) {
  const langkah = (d?.data?.[0]?.cuaca ?? []).flat().filter(x => typeof x?.local_datetime === "string");
  if (!langkah.length) return null;
  const per = new Map();
  for (const x of langkah) {
    const t = x.local_datetime.slice(0, 10), h = per.get(t) ?? {hujan: [], suhu: [], angin: [], kode: new Map()};
    for (const [k, v] of [["hujan", x.tp], ["suhu", x.t], ["angin", x.ws]]) if (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))) h[k].push(Number(v));
    if (x.weather !== null && x.weather !== undefined) h.kode.set(x.weather, (h.kode.get(x.weather) ?? 0) + 1);
    per.set(t, h);
  }
  return [...per].sort(([a], [b]) => a < b ? -1 : 1).map(([tgl, h]) => ({tgl,
    hujan_mm: h.hujan.length ? Math.round(h.hujan.reduce((a, b) => a + b) * 10) / 10 : null,
    t_min: h.suhu.length ? Math.min(...h.suhu) : null, t_maks: h.suhu.length ? Math.max(...h.suhu) : null,
    angin_maks_kmj: h.angin.length ? Math.max(...h.angin) : null,
    kode_cuaca: h.kode.size ? [...h.kode].sort((a, b) => b[1] - a[1])[0][0] : null}));
}

async function ambilDesa(kd, boleh) {
  const c = globalThis.caches?.default, kunci = new Request("https://bmkg.aset.lokal/desa/" + kd);
  const ada = c && await c.match(kunci); if (ada) return {hari: await ada.json()};
  if (!boleh()) return {antre: true};
  try {
    const r = await fetch(BMKG + encodeURIComponent(kd), {headers: {"user-agent": "Mozilla/5.0 (compatible; centurisk97)", accept: "application/json"}, signal: AbortSignal.timeout(5000)});
    if (!r.ok) { r.body?.cancel(); return {galat: "data BMKG tidak tersedia"}; }
    const t = await r.text(); if (t.length > MAKS) return {galat: "data BMKG tidak tersedia"};
    const hari = ringkasBmkg(JSON.parse(t)); if (!hari) return {galat: "data BMKG tidak tersedia"};
    if (c) await c.put(kunci, new Response(JSON.stringify(hari), {headers: {"cache-control": `public, max-age=${CACHE_DETIK}`}})).catch(() => {});
    return {hari};
  } catch { return {galat: "data BMKG tidak tersedia"}; }
}

async function bmkgDesa(env, req, url) {
  const kab = url.searchParams.get("kab") ?? "", hal = Number(url.searchParams.get("hal") ?? 1);
  if (!/^\d{4}$/.test(kab)) return gagal(400, "kab harus empat digit", NO_STORE);
  if (!Number.isInteger(hal) || hal < 1 || hal > 1000) return gagal(400, "hal tidak sah", NO_STORE);
  const lj = await lajuIP(env, req, "potensi_bmkg_desa", [[60e3, 20]]); if (lj) return lj;
  let N; try { N = await muatNama(env); } catch { return gagal(503, "daftar wilayah belum terbaca", NO_STORE); }
  const k = kab.slice(0, 2) + "." + kab.slice(2);
  if (!N.kab[k]) return gagal(400, "kab tidak dikenal", NO_STORE);
  let fc; try { const r = await env.ASSETS.fetch(new Request(`https://aset.lokal/geo/desa/${k}.json`)); if (!r.ok) { r.body?.cancel(); throw 0; } fc = await r.json(); } catch { return gagal(503, "geometri desa belum terbaca", NO_STORE); }
  const semua = fc.features.map(f => f.properties.kd).sort(), kds = semua.slice((hal - 1) * HAL, hal * HAL);
  let sisa = JATAH_PER_PERMINTAAN;
  const boleh = () => sisa > 0 && ambilJatah() && !!sisa--;
  const hasil = await Promise.all(kds.map(async kd => ({kd, nama: N.desa.get(kd)?.[0] ?? null, kec: N.desa.get(kd)?.[1] ?? null, ...(await ambilDesa(kd, boleh))})));
  const antre = hasil.filter(x => x.antre).length;
  return new Response(JSON.stringify({kab, nama: N.kab[k], hal, total: semua.length, antre, desa: hasil, sumber: "BMKG, prakiraan cuaca per desa"}), {headers: {...JSONH, ...NO_STORE}});
}

export const RUTE_POTENSI = {
  "GET /api/potensi/analisis": analisis,
  "GET /api/potensi/rekomendasi": rekom,
  "GET /api/bmkg/desa": bmkgDesa,
};
