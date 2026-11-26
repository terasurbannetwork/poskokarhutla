/* Status prakiraan dan dampak peringatan BMKG (DP-09; data/kajian-bnpb/dampak-peringatan/DESAIN-TEKNIS.md, KEAMANAN-PRIVASI.md).
   R2 `dampak_peringatan/{ringkas,status}.json` (publik, tingkat kab ke atas) dan `dampak_peringatan/desa/<kab4>.json` (staf) ditulis workflow.
   Tanpa D1. Objek hilang atau rusak = {belum_terukur: true}, tidak pernah nol. Publik disaring lagi dari kunci tingkat desa (D18, pertahanan berlapis). */
import {gagal, cacheTepi} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {stafOK} from "./staf.js";

const AWALAN = "dampak_peringatan/", PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS = 2_000_000, CACHE_DETIK = 120;
const JSONH = {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"};
const TERLARANG = new Set(["desa", "desa_nama", "kd", "titik", "lat", "lon", "koordinat", "nama_fasilitas"]);

const saring = x => Array.isArray(x) ? x.map(saring) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([k]) => !TERLARANG.has(k)).map(([k, v]) => [k, saring(v)])) : x;
const belum = alasan => new Response(JSON.stringify({v: 1, belum_terukur: true, alasan}), {headers: JSONH});

async function baca(env, kunci) {
  if (!env.MEDIA) return null;
  const o = await env.MEDIA.get(AWALAN + kunci); if (!o) return null;
  if (o.size > MAKS) { o.body?.cancel?.(); return null; }
  try { return await o.json(); } catch { return null; }
}

const publik = nama => async (env, req, url, kini, ctx) => {
  const kunci = new Request(url.origin + url.pathname);
  return cacheTepi(kunci, ctx, CACHE_DETIK, async () => {
    const lj = await lajuIP(env, req, "dampak_peringatan", [[60e3, 60]]); if (lj) return lj;
    const d = await baca(env, nama + ".json");
    return d && typeof d === "object" ? new Response(JSON.stringify(saring(d)), {headers: JSONH}) : belum("keluaran belum terbit atau tidak terbaca");
  });
};

async function desa(env, req, url) {
  if (!(await stafOK(env, req, PERAN))) return gagal(401, "perlu masuk sebagai staf");
  const kab = url.searchParams.get("kab") ?? "";
  if (!/^\d{4}$/.test(kab)) return gagal(400, "kab harus empat digit");
  const d = await baca(env, `desa/${kab}.json`);
  const h = new Headers(JSONH); h.set("cache-control", "no-store");
  return new Response(JSON.stringify(d && typeof d === "object" ? d : {v: 1, belum_terukur: true, alasan: "keluaran kab ini belum terbit"}), {headers: h});
}

export const RUTE_DAMPAK_PERINGATAN = {
  "GET /api/dampak-peringatan/ringkas": publik("ringkas"),
  "GET /api/dampak-peringatan/status": publik("status"),
  "GET /api/dampak-peringatan/desa": desa,
};
