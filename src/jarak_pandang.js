/* Jarak pandang BMKG/METAR: bot Mac mini (IP Indonesia; BMKG Aviation menolak IP GitHub Actions) POST ke sini, disimpan apa adanya di R2.
   GET publik (data cuaca publik): R2, atau berkas statis NOAA dari workflow bila R2 kosong/basi > 3 jam (cadangan: true). Tanpa D1. */
import {json, gagal, bacaBytes, sha, cacheTepi} from "./worker.js";

const KUNCI = "udara/jarak_pandang.json", ASET = "/udara/data/jarak_pandang.json", BASI_MS = 3 * 3600e3, MAKS = 1024 * 1024;
const bacaMesin = async (env, req) => { const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1]; return !!(env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN)); };
const iso = s => typeof s === "string" && s.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(s) && !isNaN(Date.parse(s));
const dalam = (x, a, b) => typeof x === "number" && x >= a && x <= b;   // NaN/Infinity gugur
const teks = (x, n) => x == null || (typeof x === "string" && x.length <= n);

/* null = sah, selain itu pesan galat */
export function periksa(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return "body harus objek JSON";
  if (!iso(d.dibuat)) return "dibuat harus waktu ISO";
  if (!Array.isArray(d.stasiun) || d.stasiun.length < 1 || d.stasiun.length > 400) return "stasiun harus larik 1..400";
  for (const s of d.stasiun) {
    if (!s || typeof s !== "object") return "stasiun harus objek";
    if (typeof s.icao !== "string" || !/^[A-Z]{4}$/.test(s.icao)) return "icao harus 4 huruf kapital";
    if (!dalam(s.lat, -11.5, 6.5) || !dalam(s.lon, 94, 142)) return `koordinat ${s.icao} di luar Indonesia`;
    if (!teks(s.nama, 120) || !teks(s.prov, 80)) return `nama/prov ${s.icao} terlalu panjang`;
    if (!Array.isArray(s.jam) || s.jam.length > 48) return `jam ${s.icao} harus larik maks 48`;
    for (const j of s.jam) {
      if (!j || !iso(j.t)) return `t ${s.icao} harus waktu ISO`;
      if (j.vis_m !== null && !dalam(j.vis_m, 0, 99999)) return `vis_m ${s.icao} harus 0..99999 atau null`;
      if (!teks(j.wx, 40)) return `wx ${s.icao} terlalu panjang`;
    }
  }
  return null;
}

async function simpan(env, req) {
  if (!await bacaMesin(env, req)) return gagal(403, "perlu kunci mesin");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const b = await bacaBytes(req, MAKS); if (b.galat) return gagal(b.status, b.galat);
  let d; try { d = JSON.parse(new TextDecoder().decode(b.b)); } catch { return gagal(400, "JSON tidak terbaca"); }
  const g = periksa(d); if (g) return gagal(400, g);
  await env.MEDIA.put(KUNCI, b.b, {httpMetadata: {contentType: "application/json"}, customMetadata: {dibuat: d.dibuat}});
  return json({ok: true, stasiun: d.stasiun.length}, 201);
}

async function dariAset(env, url) {
  try { const r = await env.ASSETS.fetch(new Request(new URL(ASET, url))); return r.ok ? await r.json() : null; } catch { return null; }
}

async function baca(env, url, kini) {
  let d = null;
  if (env.MEDIA) { try { const o = await env.MEDIA.get(KUNCI); d = o ? await o.json() : null; } catch { d = null; } }
  let cadangan = false;
  if (!d || !(kini - Date.parse(d.dibuat) <= BASI_MS)) {   // juga menangkap dibuat tak terbaca
    const a = await dariAset(env, url);
    if (a) { d = a; cadangan = true; }
  }
  if (!d) return gagal(503, "data jarak pandang belum tersedia");
  const umur = Math.max(0, Math.round((kini - Date.parse(d.dibuat)) / 6e4));
  return json({...d, umur_menit: Number.isFinite(umur) ? umur : null, ...(cadangan ? {cadangan: true} : {})});
}

export const RUTE_JARAK_PANDANG = {
  "POST /api/jarak-pandang": (env, req) => simpan(env, req),
  "GET /api/jarak-pandang": (env, req, url, kini, ctx) => cacheTepi(req, ctx, 300, () => baca(env, url, kini), true),
};
