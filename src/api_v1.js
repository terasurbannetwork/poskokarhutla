/* API terbuka v1 untuk mitra (/api/v1/*, dokumentasi /api = public/api.html). Skema kunci: migrations/0040_kunci_api.sql.
   - /api/v1/data/<nama>: berkas data publik (daftar putih DATA), tanpa kunci.
   - Data yang di situs wajib login (rumah rusak, bangunan, laporan BNPB): HANYA-BACA, perlu header X-API-Key dari kunci bercakupan yang diterbitkan admin.
   - Kunci hanya berlaku di /api/v1/*; tidak membuka rute lama, tidak butuh cookie/ADMIN_TOKEN. Kunci di query string tidak dibaca (tidak bocor ke log).
   - Hanya sha256 kunci disimpan. Kegagalan dihitung per hash IP (laju_bnpb, aksi api.kunci_gagal: laju_posko punya CHECK aksi tetap), pemakaian per kunci dibatasi.
   - CORS terbuka (Allow-Origin: *), TANPA Allow-Credentials. Ditangani di fetch() worker.js sebelum gerbang centurisk97.id, jadi terbuka di semua host. */
import {json, gagal, acak, sha, bacaBody, ipHash} from "./worker.js";
import {tx, modOK, superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {bacaDaftar, bacaRekap, KOLOM_V1} from "./rumah_rusak.js";
import {kirim, PROV} from "./bangunan.js";
import {bacaLaporan} from "./laporan_bnpb.js";

const JAM = 3600e3, BATAS_KUNCI = [[JAM, 1000]], MAKS_GAGAL = 300, RE_KUNCI = /^pb_[0-9a-f]{64}$/;
export const CAKUPAN = ["rumah_rusak", "bangunan", "laporan_bnpb", "konsesi"];
/* nama stabil -> berkas aset. Daftar putih: path bebas tidak pernah dipakai. */
export const DATA = {
  titik24: "/data/titik24.json", hotspot24: "/data/hotspot24.json", hotspot72: "/data/hotspot72.json", laporan: "/data/laporan.json",
  peta_karhutla: "/data/peta_karhutla.json", peta_karhutla_kab: "/data/peta_karhutla_kab.json", wilayah: "/data/wilayah.json", kumulatif: "/data/kumulatif.json",
  musim_harian: "/data/musim_harian.json", fwi: "/data/fwi.json", peringatan: "/data/peringatan.json", udara_kualitas: "/data/udara_kualitas.json", meta: "/data/meta.json",
};
export const CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "X-API-Key", "access-control-allow-methods": "GET, OPTIONS", "access-control-max-age": "86400"};
const BERKUNCI = {   // sisa jalur -> [cakupan, pembaca(env, url, kini)]
  "/rumah-rusak": ["rumah_rusak", async (env, url) => {
    const d = await bacaDaftar(env, url.searchParams, {sah: true, kolom: KOLOM_V1}); if (d instanceof Response) return d;
    return json({jumlah: d.baris.length, laporan: d.baris});
  }],
  "/rumah-rusak/rekap": ["rumah_rusak", (env, url, kini) => bacaRekap(env, url, kini, 1000)],
  "/bangunan/terpapar": ["bangunan", env => kirim(env, "bangunan/terpapar.json")],
  "/bangunan/kec": ["bangunan", env => kirim(env, "bangunan/kec.json")],
  "/bangunan/grid": ["bangunan", (env, url) => { const p = url.searchParams.get("prov"); return PROV.has(p) ? kirim(env, `bangunan/grid_${p}.json`) : gagal(400, "prov harus kode provinsi 2 digit"); }],
  "/konsesi": ["konsesi", (env, url) => konsesi(env, url)],
  "/laporan-bnpb": ["laporan_bnpb", (env, url) => bacaLaporan(env, url, true)],   // tanpa nama moderator (oleh)
};
/* Konsesi perusahaan per provinsi (public/data/konsesi2026/<prov>.json, 2-3 MB). prov wajib dan dicocokkan ke index.json (bukan jalur dari pengguna);
   nama = saring PT (potongan nama, tanpa beda besar-kecil) supaya mitra tidak menarik seluruh provinsi. Tanpa prov = daftar provinsi yang tersedia. */
async function aset(env, url, jalur) { const r = await env.ASSETS.fetch(new Request(new URL(jalur, url))); if (!r.ok) { r.body?.cancel(); return null; } return r; }
export async function konsesi(env, url, ringkas = false) {   // ringkas = selalu <prov>.ringkas.json (dipakai MCP)
  const idx = await aset(env, url, "/data/konsesi2026/index.json"); if (!idx) return gagal(404, "data konsesi belum tersedia");
  const ix = await idx.json(), prov = url.searchParams.get("prov");
  if (prov === null) return json({dibuat: ix.dibuat, sampai: ix.sampai, sumber_titik: ix.sumber_titik, sumber_konsesi: ix.sumber_konsesi, provinsi: ix.prov.map(p => ({kode: p.kode, nama: p.nama, perusahaan: p.perusahaan}))});
  if (!/^\d{2}$/.test(prov) || !ix.prov.some(p => p.kode === prov)) return gagal(400, "prov harus kode provinsi 2 digit yang tersedia: " + ix.prov.map(p => p.kode).join(", "));
  const nama = url.searchParams.get("nama")?.trim().toLowerCase();
  if (nama !== undefined && (nama.length < 2 || nama.length > 80)) return gagal(400, "nama harus 2 sampai 80 huruf");
  /* dengan nama (dan untuk MCP): baca <prov>.ringkas.json (~65 KB), bukan berkas penuh 2-3 MB yang terlalu mahal diurai di batas CPU Workers */
  ringkas ||= nama !== undefined;
  const r = await aset(env, url, `/data/konsesi2026/${prov}${ringkas ? ".ringkas" : ""}.json`); if (!r) return gagal(404, "berkas provinsi belum tersedia");
  if (!ringkas) return new Response(r.body, {headers: {"content-type": "application/json; charset=utf-8"}});
  const d = await r.json().catch(() => null); if (!d) return gagal(404, "berkas provinsi belum tersedia");
  return json(nama === undefined ? d : {...d, perusahaan: d.perusahaan.filter(x => String(x.nama).toLowerCase().includes(nama))});
}
const tabelBelum = e => /no such table: kunci_api/i.test(String(e?.message || e));

/* kunci sah -> {id, cakupan: [...]}; selain itu Response galat. Urutan: kunci ada -> hitungan gagal per IP -> cari hash -> batas per kunci.
   Dipakai juga /mcp (src/mcp.js). */
export async function kunciSah(env, req, ctx, kini) {
  const kunci = (req.headers.get("x-api-key") || "").trim();
  if (!kunci) return gagal(401, "butuh kunci API di header X-API-Key");
  if (!env.IP_SALT) { console.error("api v1: IP_SALT belum diset"); return gagal(503, "layanan belum tersedia"); }
  const ip = await ipHash(env, req), aksi = "api.kunci_gagal";
  try {
    const n = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(ip, aksi, kini - JAM).first()).n;
    if (n >= MAKS_GAGAL) return gagal(429, "terlalu banyak kunci salah dari jaringan ini; coba lagi nanti", {"retry-after": "3600"});
    const r = RE_KUNCI.test(kunci) ? await env.DB.prepare("SELECT id, cakupan, dicabut, terakhir FROM kunci_api WHERE kunci_sha = ?").bind(await sha(kunci)).first() : null;
    if (!r || r.dicabut) {
      await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(ip, aksi, kini).run();
      return gagal(401, "kunci API tidak berlaku (salah atau sudah dicabut)");
    }
    const g = await laju(env, "api:" + r.id, "api.v1", BATAS_KUNCI, kini); if (g) return g;
    if (r.terakhir == null || kini - r.terakhir > JAM)   // paling sering sekali per jam
      ctx?.waitUntil?.(env.DB.prepare("UPDATE kunci_api SET terakhir = ? WHERE id = ?").bind(kini, r.id).run().catch(e => console.error("kunci terakhir", e?.message)));
    return {id: r.id, cakupan: JSON.parse(r.cakupan)};
  } catch (e) { if (tabelBelum(e)) { console.error("api v1: migrasi 0040_kunci_api belum diterapkan"); return gagal(503, "layanan belum tersedia"); } throw e; }
}
async function periksaKunci(env, req, ctx, perlu, kini) {
  const k = await kunciSah(env, req, ctx, kini); if (k instanceof Response) return k;
  return k.cakupan.includes(perlu) ? null : gagal(403, `kunci ini tidak mencakup ${perlu}`);
}

const INDEKS = {
  versi: 1, dokumentasi: "/api", autentikasi: "header X-API-Key (hanya untuk endpoint berkunci)",
  endpoint: [
    ...Object.keys(DATA).map(n => ({jalur: `/api/v1/data/${n}`, kunci: false, cakupan: null})),
    {jalur: "/api/v1/riwayat", kunci: false, cakupan: null},
    ...Object.entries(BERKUNCI).map(([j, [c]]) => ({jalur: "/api/v1" + j, kunci: true, cakupan: c})),
  ],
};

async function dataPublik(env, url, nama) {
  const jalur = Object.hasOwn(DATA, nama) ? DATA[nama] : null;
  if (!jalur) return json({galat: "nama data tidak dikenal", nama_sah: Object.keys(DATA)}, 404);
  const r = await env.ASSETS.fetch(new Request(new URL(jalur, url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "berkas data belum tersedia"); }
  return new Response(r.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600", "x-content-type-options": "nosniff"}});
}

/* Riwayat titik VIIRS 2012-sekarang per sel 0,05 derajat (public/data/riwayat_sel/<tx>_<ty>.json, scripts/data/riwayat_sel.py). Rumus kunci = public/riwayat_sel.js kunci().
   Publik tanpa kunci (berkas statis yang sama dengan layar), disimpan cache 5 menit seperti /data/*. Sel tanpa catatan = data null, bukan 404. */
const ANGKA = /^-?\d{1,3}(\.\d+)?$/, BBOX_ID = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
export function kunciSel(lat, lon) {
  const ix = Math.trunc((lon - BBOX_ID.lonMin) / 0.05), iy = Math.trunc((BBOX_ID.latMaks - lat) / 0.05);
  return {ubin: `${Math.trunc(ix * 0.05)}_${Math.trunc(iy * 0.05)}`, sel: `${ix}_${iy}`};
}
export async function riwayatSel(env, url, p) {
  const a = p.get("lat"), o = p.get("lon");
  if (!ANGKA.test(a ?? "") || !ANGKA.test(o ?? "")) return gagal(400, "lat dan lon wajib berupa angka desimal, mis. lat=-2.21&lon=113.92");
  const lat = +a, lon = +o;
  if (lat < BBOX_ID.latMin || lat > BBOX_ID.latMaks || lon < BBOX_ID.lonMin || lon > BBOX_ID.lonMaks) return gagal(400, `koordinat di luar Indonesia (lat ${BBOX_ID.latMin} sampai ${BBOX_ID.latMaks}, lon ${BBOX_ID.lonMin} sampai ${BBOX_ID.lonMaks})`);
  const k = kunciSel(lat, lon), r = await env.ASSETS.fetch(new Request(new URL(`/data/riwayat_sel/${k.ubin}.json`, url)));
  let t = null; if (r.ok) t = await r.json().catch(() => null); else r.body?.cancel();
  const rec = t?.c && Object.hasOwn(t.c, k.sel) ? t.c[k.sel] : null;
  return json({sumber: t?.sumber ?? null, th0: t?.th0 ?? null, sd: t?.sd ?? null, sel: k.sel, data: rec,
    ...(rec ? {} : {catatan: t ? "sel ini tidak punya riwayat titik VIIRS sejak 2012 (kurang dari 20 titik dalam sekitar 16 km): kebakaran di sini tidak biasa" : "ubin riwayat untuk lokasi ini belum tersedia"})}, 200, {"cache-control": "public, max-age=300, stale-while-revalidate=3600"});
}

async function dalam(req, env, ctx, url) {
  const kini = Date.now(), sisa = url.pathname.replace(/\/+$/, "").slice("/api/v1".length);
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET", {allow: "GET, HEAD, OPTIONS"});
  if (sisa === "") return json(INDEKS, 200, {"cache-control": "public, max-age=300"});
  if (sisa === "/riwayat") {   // laju per hash IP; di sini, bukan di riwayatSel, supaya tool MCP (yang punya laju mcp.ip sendiri) tidak terhitung dua kali
    if (!env.IP_SALT) { console.error("api v1: IP_SALT belum diset"); return gagal(503, "layanan belum tersedia"); }
    const g = await laju(env, await ipHash(env, req), "riwayat.ip", [[JAM, 600]], kini); if (g) return g;
    return riwayatSel(env, url, url.searchParams);
  }
  if (sisa.startsWith("/data/")) return dataPublik(env, url, sisa.slice(6));
  const b = Object.hasOwn(BERKUNCI, sisa) ? BERKUNCI[sisa] : null;
  if (!b) return json({galat: "rute tidak ada", petunjuk: "daftar endpoint di /api/v1, dokumentasi di /api"}, 404);
  const g = await periksaKunci(env, req, ctx, b[0], kini); if (g) return g;
  return b[1](env, url, kini);
}

/* dipanggil fetch() untuk /api/v1 dan /api/v1/*: semua jawaban (juga galat) membawa CORS; berkunci = private, no-store */
export async function layaniApiV1(req, env, ctx, url) {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
  let r;
  try { r = await dalam(req, env, ctx, url); } catch (e) { console.error("api v1", url.pathname, e); r = gagal(500, "galat server"); }
  const h = new Headers(r.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  h.delete("access-control-allow-credentials");
  if (Object.hasOwn(BERKUNCI, url.pathname.replace(/\/+$/, "").slice("/api/v1".length))) h.set("cache-control", "private, no-store");
  return new Response(req.method === "HEAD" ? null : r.body, {status: r.status, headers: h});
}

/* ================================================================ penerbitan oleh admin */
const KOLOM = "id, nama, cakupan, dibuat, oleh, dicabut, dicabut_oleh, terakhir";
const bentuk = r => r && {...r, cakupan: JSON.parse(r.cakupan)};
const cekCakupan = v => Array.isArray(v) && v.length >= 1 && v.every(x => CAKUPAN.includes(x)) && new Set(v).size === v.length ? v : null;
async function buat(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "menerbitkan kunci API hanya untuk Super Admin (secret SUPER_ADMIN harus berisi akun Anda)");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = tx(b.o.nama, 80), cakupan = cekCakupan(b.o.cakupan);
  if (!nama || nama.length < 3) return gagal(400, "nama wajib diisi, 3 sampai 80 karakter");
  if (!cakupan) return gagal(400, `cakupan harus larik tak kosong dari: ${CAKUPAN.join(", ")}`);
  const kunci = "pb_" + acak(32), id = acak(8);
  await env.DB.prepare("INSERT INTO kunci_api (id, nama, kunci_sha, cakupan, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?)").bind(id, nama, await sha(kunci), JSON.stringify(cakupan), kini, mod).run();
  return json({id, nama, cakupan, dibuat: kini, oleh: mod, kunci}, 201);   // kunci tampil SEKALI; yang tersimpan hanya hash-nya
}
async function daftar(env, req) {
  if (!await modOK(env, req)) return gagal(403, "daftar kunci API hanya untuk moderator ke atas (bukan akun gerbang situs)");
  return json({kunci: (await env.DB.prepare(`SELECT ${KOLOM} FROM kunci_api ORDER BY dibuat DESC LIMIT 500`).all()).results.map(bentuk), cakupan: CAKUPAN, bisa_buat: !!await superOK(env, req)});
}
async function cabut(env, req, id, kini) {
  const mod = await modOK(env, req); if (!mod) return gagal(403, "mencabut kunci API hanya untuk moderator ke atas (bukan akun gerbang situs)");
  const r = await env.DB.prepare("UPDATE kunci_api SET dicabut = ?, dicabut_oleh = ? WHERE id = ? AND dicabut IS NULL").bind(kini, mod, id).run();
  if (r.meta.changes) return json({id, dicabut: kini});
  return await env.DB.prepare("SELECT 1 FROM kunci_api WHERE id = ?").bind(id).first() ? gagal(409, "kunci sudah dicabut") : gagal(404, "kunci tidak ada");
}
const bungkus = f => async (...a) => { try { return await f(...a); } catch (e) { if (tabelBelum(e)) { console.error("kunci-api admin: migrasi 0040_kunci_api belum diterapkan"); return gagal(503, "layanan belum tersedia"); } throw e; } };
/* halaman /admin/kunci-api dipasang di worker.js (butuh halamanAdmin) */
export const RUTE_KUNCI_API = {
  "POST /api/kunci-api/admin/buat": bungkus((env, req, url, kini) => buat(env, req, kini)),
  "GET /api/kunci-api/admin/daftar": bungkus((env, req) => daftar(env, req)),
  "POST /api/kunci-api/admin/cabut/:id": bungkus((env, req, url, kini, ctx, id) => cabut(env, req, id, kini)),
};
