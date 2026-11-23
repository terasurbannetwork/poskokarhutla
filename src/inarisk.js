/* Proksi InaRISK untuk /bnpb/inarisk (data/kajian-bnpb/inarisk/DESAIN-TEKNIS.md): daftar izin ketat, parameter disaring,
   nama petugas dibuang, galat hulu jadi 502 tanpa badan hulu. Tanpa kunci; batas laju lewat laju_bnpb.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), dihitung hanya saat cache luput. */
import {json, gagal, bacaBytes} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {samarkan} from "./samarkan.js";

const API = "https://inarisk.bnpb.go.id/apiv4/", GIS = "https://gis.bnpb.go.id/server/rest/services/inarisk/";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const BAHAYA = ["banjir", "banjir_bandang", "gempabumi", "kekeringan", "letusan_gunungapi", "tanah_longsor", "likuefaksi", "tsunami", "gelombang_ekstrim_dan_abrasi", "kebakaran_hutan_dan_lahan", "cuaca_ekstrim", "multi"];
export const LAPISAN = new Set([...BAHAYA.map(b => "layer_bahaya_" + b), ...BAHAYA.filter(b => b !== "tanah_longsor").map(b => "layer_risiko_" + b),
  ...BAHAYA.filter(b => b !== "banjir").map(b => "layer_kerentanan_" + b), "layer_peta_kapasitas", "batas_administrasi"]);
const PROP_AMAN = ["Kegiatan", "Lokasi", "Deskripsi", "Tgl", "Foto", "Pcode", "Organisasi"], HOST_FOTO = new Set(["inarisk.bnpb.go.id", "inarisk2.bnpb.go.id"]);
const MAKS_BADAN = 64 * 1024, MAKS_TITIK = 2000, EPSG3857 = 20037509;

const hulu = async (url, init, ms) => {
  /* redirect tidak diikuti (Workers tidak mendukung "error"): balasan 3xx bukan ok, jadi jadi 502; host hulu hanya yang tertulis di sini */
  try { return await fetch(url, {...init, redirect: "manual", headers: {"user-agent": UA, ...init?.headers}, signal: AbortSignal.timeout(ms)}); } catch { return null; }
};
const galatHulu = () => gagal(502, "InaRISK sedang tidak menjawab, coba lagi nanti");
/* foto lama InaRISK ditulis http://; host yang diizinkan dinaikkan ke https (diuji 23 Nov 2026: 200 image/jpeg), host lain dibuang */
const fotoAman = f => { if (typeof f !== "string" || !URL.canParse(f)) return null; const u = new URL(f); if (!/^https?:$/.test(u.protocol) || !HOST_FOTO.has(u.hostname) || u.username || u.password || u.port) return null; u.protocol = "https:"; return u.href; };

/* saring query: nama -> pemeriksa (string -> bool) */
const SARING_UNDUHAN = {page: s => /^\d{1,5}$/.test(s), per_page: s => /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 50, search: s => s.length <= 80,
  category: s => /^[\w .,&-]{1,60}$/.test(s), file_format: s => /^[\w.-]{1,20}$/.test(s), sort: s => /^[\w.,:-]{1,40}$/.test(s), region: s => /^\d{1,10}$/.test(s)};
function paramUnduhan(url) {
  const o = new URLSearchParams();
  for (const [k, ok] of Object.entries(SARING_UNDUHAN)) { const v = url.searchParams.get(k); if (v !== null && ok(v)) o.set(k, v); }
  return o;
}

/* GET berkas cache: kunci sintetis, hanya 200 disimpan */
async function lewatCache(env, req, kunci, ttl, batas, aksi, ambil) {
  const c = globalThis.caches?.default, kc = new Request("https://cache.lokal/inarisk/" + kunci);
  const ada = await c?.match(kc).catch(() => null);
  if (ada) return ada;
  const lj = await lajuIP(env, req, aksi, batas); if (lj) return lj;
  const r = await ambil(); if (!r || r.status !== 200) return r;
  const h = new Headers(r.headers); h.set("cache-control", "public, max-age=" + ttl);
  const hasil = new Response(r.body, {status: 200, headers: h});
  if (c) await c.put(kc, hasil.clone()).catch(() => {});
  return hasil;
}
const JSON_H = {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"};

const unduhan = (jalur) => (env, req, url) => {
  const q = paramUnduhan(url);
  return lewatCache(env, req, jalur + "?" + q, 3600, [[60e3, 60]], "inarisk", async () => {
    const r = await hulu(API + jalur + (q.size ? "?" + q : ""), {headers: {accept: "application/json"}}, 20000);
    if (!r || !r.ok) { r?.body?.cancel(); return galatHulu(); }
    let d; try { d = await r.json(); } catch { return galatHulu(); }
    return new Response(JSON.stringify(rapikanUnduhan(d)), {headers: JSON_H});
  });
};
/* hanya kolom yang dipakai layar; kolom baru di hulu (mis. nama pengunggah) tidak ikut keluar */
const KOLOM_BERKAS = ["id", "title", "description", "category", "file_format", "file_size", "file_url", "published_at"];
export function rapikanUnduhan(d) {
  const x = d?.data;
  if (!x || typeof x !== "object") return {data: null};
  if (Array.isArray(x.rows)) return {data: {pagination: x.pagination ?? null, rows: x.rows.map(r => Object.fromEntries(KOLOM_BERKAS.map(k => [k, r?.[k] ?? null])))}};
  const daftar = a => Array.isArray(a) ? a.map(v => ({name: v?.name ?? null, count: v?.count ?? null})) : [];
  return {data: {categories: daftar(x.categories), formats: daftar(x.formats)}};
}

const angka = (x, a, b) => typeof x === "number" && Number.isFinite(x) && x >= a && x <= b;
/* badan dampak bersih {jalur, badan} atau string galat */
export function dampakBersih(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return "badan harus objek";
  if (b.type === "polygon") {
    const g = b.geometry, r = g?.type === "Polygon" && Array.isArray(g.coordinates) ? g.coordinates : null;
    if (!r || !r.length || r.length > 20) return "geometry harus Polygon";
    let n = 0;
    for (const cincin of r) {
      if (!Array.isArray(cincin) || cincin.length < 4) return "cincin poligon minimal 4 titik";
      n += cincin.length; if (n > MAKS_TITIK) return `poligon maksimal ${MAKS_TITIK} titik`;
      for (const p of cincin) if (!Array.isArray(p) || p.length < 2 || !angka(p[0], -180, 180) || !angka(p[1], -90, 90)) return "koordinat poligon tidak valid";
    }
    return {jalur: "dashboards/dashboard-jakarta/spatial-query/0", badan: {type: "polygon", crs: "EPSG:4326", geometry: {type: "Polygon", coordinates: r.map(c => c.map(p => [p[0], p[1]]))}}};
  }
  if (b.type !== "circle" && b.type !== "point") return "type harus circle, point, atau polygon";
  const c = b.center, p = b.geometry?.coordinates;
  if (!c || !angka(c.lat, -90, 90) || !angka(c.lng, -180, 180)) return "center tidak valid";
  if (b.geometry?.type !== "Point" || !Array.isArray(p) || !angka(p[0], -180, 180) || !angka(p[1], -90, 90)) return "geometry harus Point";
  const badan = {type: b.type, crs: "EPSG:4326", center: {lat: c.lat, lng: c.lng}, geometry: {type: "Point", coordinates: [p[0], p[1]]}};
  if (b.type === "circle" || b.radius_meter !== undefined) { if (!angka(b.radius_meter, 1, 50000)) return "radius_meter harus 1 sampai 50000"; badan.radius_meter = b.radius_meter; }
  return {jalur: "dashboards/dashboard-jakarta/spatial-query/1", badan};
}
async function dampak(env, req) {
  /* badan dibaca berbatas (tidak pernah menampung badan raksasa), divalidasi, lalu hasil dicache 1 hari per badan bersih:
     kartu gunung api Dalops meminta radius yang sama tiap muat halaman. Batas laju dihitung saat cache luput (lewatCache). */
  const bb = await bacaBytes(req, MAKS_BADAN); if (bb.galat) return gagal(bb.status, "badan terlalu besar");
  let b; try { b = JSON.parse(new TextDecoder().decode(bb.b)); } catch { return gagal(400, "JSON tidak valid"); }
  const d = dampakBersih(b); if (typeof d === "string") return gagal(400, d);
  const badan = JSON.stringify(d.badan);
  const sidik = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(d.jalur + badan)))].map(x => x.toString(16).padStart(2, "0")).join("");
  return lewatCache(env, req, "dampak/" + sidik, 86400, [[60e3, 60]], "inarisk", async () => {
    const r = await hulu(API + d.jalur, {method: "POST", headers: {"content-type": "application/json", accept: "application/json"}, body: badan}, 20000);
    if (!r || !r.ok) { r?.body?.cancel(); return galatHulu(); }
    let j; try { j = await r.json(); } catch { return galatHulu(); }
    return json(j?.data?.result ?? j?.result ?? null);   // hulu membungkus: {success, data: {query, result}}
  });
}

/* bersihkan GeoJSON kegiatan: hanya properti daftar-putih, foto hanya dari host InaRISK */
export function bersihKegiatan(g) {
  const fitur = Array.isArray(g?.features) ? g.features : [];
  return {type: "FeatureCollection", features: fitur.map(f => {
    const p = {}; for (const k of PROP_AMAN) if (f?.properties && k in f.properties) p[k] = f.properties[k];
    /* teks bebas petugas: nomor HP, email, NIK disamarkan (nama orang di teks bebas tidak bisa dikenali mesin; KEPUTUSAN Q5) */
    for (const k of ["Deskripsi", "Lokasi", "Organisasi"]) if (typeof p[k] === "string") p[k] = samarkan(p[k]);
    if ("Foto" in p) p.Foto = Array.isArray(p.Foto) ? p.Foto.map(fotoAman).filter(Boolean) : fotoAman(p.Foto);
    return {type: "Feature", geometry: f?.geometry ?? null, properties: p};
  })};
}
/* titik kegiatan: jalur unduh posgagah (jalur peta hanya memuat id); filter tanggal tidak dipakai hulu, layar menyaring kolom Tgl */
function kegiatan(env, req, url) {
  const m = url.pathname.match(/^\/api\/inarisk\/kegiatan\/(\d{1,10})\/(\d{2,10})\/?$/); if (!m) return gagal(404, "tidak ada");
  return lewatCache(env, req, `kegiatan/${m[1]}/${m[2]}`, 3600, [[60e3, 60]], "inarisk", async () => {
    const r = await hulu(`${API}posgagah/download-kegiatan-geojson/${m[1]}/${m[2]}`, {headers: {accept: "application/json"}}, 30000);
    if (!r || !r.ok) { r?.body?.cancel(); return galatHulu(); }
    let d; try { d = await r.json(); } catch { return galatHulu(); }
    return new Response(JSON.stringify(bersihKegiatan(d)), {headers: JSON_H});
  });
}

function ubin(env, req, url) {
  const nama = url.pathname.split("/")[4] || "", bb = (url.searchParams.get("bbox") || "").split(",");   // nama lapisan hanya [a-z_], tidak perlu didekode
  if (!LAPISAN.has(nama)) return gagal(404, "lapisan tidak ada");
  const v = bb.length === 4 && bb.every(s => /^-?\d+(\.\d+)?(e-?\d{1,3})?$/i.test(s)) ? bb.map(Number) : null;
  if (!v || !v.every(x => Number.isFinite(x) && Math.abs(x) <= EPSG3857) || v[0] >= v[2] || v[1] >= v[3]) return gagal(400, "bbox harus xmin,ymin,xmax,ymax EPSG:3857");
  const kotak = v.join(",");
  return lewatCache(env, req, `ubin/${nama}?${kotak}`, 7 * 86400, [[60e3, 600]], "inarisk.ubin", async () => {
    const dasar = nama === "batas_administrasi" ? `${GIS.replace(/inarisk\/$/, "")}Basemap/batas_administrasi/MapServer/export?bbox=${kotak}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`
      : `${GIS}${nama}/ImageServer/exportImage?bbox=${kotak}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`;
    const r = await hulu(dasar, {}, 60000);
    if (!r || !r.ok || !(r.headers.get("content-type") || "").startsWith("image/png")) { r?.body?.cancel(); return galatHulu(); }
    return new Response(r.body, {headers: {"content-type": "image/png", "x-content-type-options": "nosniff"}});
  });
}

export const RUTE_INARISK = {
  "GET /api/inarisk/unduhan": unduhan("downloads"),
  "GET /api/inarisk/unduhan/ringkas": unduhan("downloads/summary"),
  "POST /api/inarisk/dampak": (env, req) => dampak(env, req),
  "GET /api/inarisk/kegiatan/:x": (env, req, url) => kegiatan(env, req, url),
  "GET /api/inarisk/ubin/:x": (env, req, url) => ubin(env, req, url),
};
