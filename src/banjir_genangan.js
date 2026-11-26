/* Genangan radar per kejadian, versi publik (GS-14, KEPUTUSAN-GENANGAN K4; Q13 pemilik 25 Nov 2026: "R2 aja").
   R2 `banjir/genangan/<KJ>.json` (satu kejadian) dan `banjir/genangan/<KJ>/v<n>/<kab4>_*` ditulis scripts/banjir/genangan_terbit.py unggah
   (siklus.yml job genangan). Isi JSON sudah daftar putih (tanpa kecamatan, sidik, akun); rute ini hanya merangkai dan menyajikan.
   GET/HEAD /api/banjir/genangan                       -> {v, bahaya, sumber, yakin, kejadian:[...]} terbaru dulu; belum ada = 404
   GET/HEAD /api/banjir/genangan/<KJ>/v<n>/<nama>      -> berkas, hanya bila JSON kejadian itu (versi yang sama) merujuknya */
import {gagal, cacheTepi} from "./worker.js";

const AWALAN = "banjir/genangan/", MAKS_KEJADIAN = 60, MAKS_JSON = 200_000;
const KJ = "KJ-\\d{4}-[0-9A-HJKMNP-TV-Z]{8}", NAMA = "\\d{4}_(?:sel\\.geojson|(?:radar|asli|swir)_(?:pra|pasca)\\.png)";
const RE_BERKAS = new RegExp(`^/api/banjir/genangan/(${KJ})/v([1-9]\\d{0,3})/(${NAMA})$`), RE_KJ_JSON = new RegExp(`^${AWALAN}(${KJ})\\.json$`);
const BATAS = {geojson: 300_000, png: 120_000}, TIPE = {geojson: "application/geo+json", png: "image/png"};
const JSONH = {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"};

async function bacaJson(env, kunci) {
  const o = await env.MEDIA.get(kunci); if (!o) return null;
  if (o.size > MAKS_JSON) { o.body?.cancel?.(); return null; }
  try { return await o.json(); } catch { return null; }
}

/* nama berkas yang dirujuk JSON kejadian (sel dan citra.*.berkas) */
export function dirujuk(k, nama) {
  return (k?.kab || []).some(x => x?.sel === nama || Object.values(x?.citra || {}).some(c => c?.berkas === nama));
}

/* 404 ikut di-cache tepi 60 dtk (cacheTepi hanya menyimpan 200; pola riwayatPos src/sihka.js): KJ atau nama acak berformat benar tidak menembus R2 berulang */
function tak(kunci, ctx, pesan) {
  const t = gagal(404, pesan, {"cache-control": "public, max-age=60"});
  const c = globalThis.caches?.default; if (c) ctx?.waitUntil?.(c.put(kunci, t.clone()).catch(() => {}));
  return t;
}

async function daftar(env, kunci, ctx) {
  const r = await env.MEDIA.list({prefix: AWALAN, delimiter: "/"});
  const daftarKunci = r.objects.map(o => o.key).filter(k => RE_KJ_JSON.test(k)).sort().reverse().slice(0, MAKS_KEJADIAN);   // nomor KJ memuat tahun: terbaru dulu sebelum dipotong; ponytail: list satu halaman (1.000 kunci), indeks berkas bila kejadian sebanyak itu
  const kej = (await Promise.all(daftarKunci.map(k => bacaJson(env, k)))).filter(k => k && RE_KJ_JSON.test(`${AWALAN}${k.kj}.json`));
  if (!kej.length) return tak(kunci, ctx, "belum ada genangan radar terbit");
  kej.sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)) || String(b.kj).localeCompare(String(a.kj)));
  const dibuat = kej.map(k => k.dibuat || "").sort().at(-1) || null;
  return new Response(JSON.stringify({v: 1, dibuat, bahaya: "banjir", sumber: "Copernicus GFM", yakin: "estimasi-model", kejadian: kej}), {headers: JSONH});
}

async function berkas(env, kj, versi, nama, kunci, ctx) {
  const k = await bacaJson(env, `${AWALAN}${kj}.json`);
  if (!k || k.versi !== versi || !dirujuk(k, nama)) return tak(kunci, ctx, "berkas tidak terbit");
  const jenis = nama.endsWith(".geojson") ? "geojson" : "png";
  const o = await env.MEDIA.get(`${AWALAN}${kj}/v${versi}/${nama}`); if (!o) return tak(kunci, ctx, "berkas tidak ada");
  if (o.size > BATAS[jenis]) { o.body?.cancel?.(); return gagal(413, "berkas melebihi batas"); }
  return new Response(o.body, {headers: {"content-type": TIPE[jenis], "x-content-type-options": "nosniff"}});
}

/* null bila bukan jalur genangan (rute /api/banjir/* lain lanjut ke src/sihka.js) */
export async function ruteGenangan(req, env, ctx, url) {
  const jalur = url.pathname.replace(/\/+$/, "");
  const m = RE_BERKAS.exec(jalur);
  if (jalur !== "/api/banjir/genangan" && !m && !jalur.startsWith("/api/banjir/genangan/")) return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  if (jalur !== "/api/banjir/genangan" && !m) return gagal(404, "jalur tidak dikenal");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum terpasang");
  const kunci = new Request(url.origin + jalur);
  const r = await cacheTepi(kunci, ctx, 600, () => m ? berkas(env, m[1], Number(m[2]), m[3], kunci, ctx) : daftar(env, kunci, ctx));
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
