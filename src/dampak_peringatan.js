/* Status prakiraan dan dampak peringatan BMKG (DP-09; data/kajian-bnpb/dampak-peringatan/DESAIN-TEKNIS.md, KEAMANAN-PRIVASI.md).
   R2 `dampak_peringatan/{ringkas,status}.json` (publik, tingkat kab ke atas) dan `dampak_peringatan/desa/<kab4>.json` (staf) ditulis workflow.
   Tanpa D1. Objek hilang atau rusak = {belum_terukur: true}, tidak pernah nol. Publik disaring lagi dari kunci tingkat desa (D18, pertahanan berlapis). */
import {gagal, cacheTepi} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {stafOK, dalamWilayahStaf} from "./staf.js";

const AWALAN = "dampak_peringatan/", PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS = 2_000_000, CACHE_DETIK = 120;
const JSONH = {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff"};
const NO_STORE = {"cache-control": "no-store"};

/* Daftar putih rekursif untuk berkas publik (skema: ALGORITMA 7; keluaran nyata: scripts/siklus/dampak_peringatan.py tulis_keluaran,
   scripts/prediksi/status_prakiraan.py hitung). Kunci di luar daftar dibuang di mana pun; kunci kab harus ^\d{4}$. Penyaring: nilai -> bersih | undefined. */
const P = v => (v === null || ["string", "number", "boolean"].includes(typeof v)) ? v : undefined;
const N = v => (v === null || typeof v === "number") ? v : undefined;
const BOOL = v => (v === null || typeof v === "boolean") ? v : undefined;
const larik = f => v => Array.isArray(v) ? v.map(f).filter(x => x !== undefined) : undefined;
const sarang = (v, d = 0) => typeof v === "number" ? v : Array.isArray(v) && d < 6 ? v.map(x => sarang(x, d + 1)).filter(x => x !== undefined) : undefined;
const obj = spek => v => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    const f = spek[k] ?? Object.entries(spek).find(([pola]) => pola[0] === "^" && new RegExp(pola).test(k))?.[1];
    const y = f && f(x); if (y !== undefined) o[k] = y;
  }
  return o;
};
const peta = (pola, f) => obj({[pola]: f});
const KODE = "^[A-Z]{3}$", HITUNG = peta("^[a-z_]{1,40}$", N);   // hitungan per sumber/kelas: angka atau null, tidak pernah nama
const STATUS = obj({s: N, nama: P, pemicu: P, sebagian: BOOL, hari: larik(N), hipotesis: BOOL, segar: BOOL, r_bmkg: N});
const BAHAYA = obj({r_bmkg: N, penduduk_area_peringatan: HITUNG, jiwa_kelas: HITUNG, kelas_sampel: v => P(v) ?? HITUNG(v), alasan: P});
const KAB = peta("^\\d{4}$", obj({nama: P, terliput: BOOL, segar: BOOL, sebagian: BOOL, pemicu: P, hari: larik(N), hipotesis: BOOL, catatan: P,
  status: peta(KODE, STATUS), bahaya: peta(KODE, BAHAYA), penduduk_area_peringatan: HITUNG, jiwa_kelas: HITUNG, fasilitas: HITUNG}));
const PERINGATAN = larik(obj({id: P, bahaya: P, event: P, severity: P, tingkat_bmkg: N, wilayah: P, mulai: P, sampai: P, berlaku_sampai: P, web: P, sumber_url: P, poligon: sarang, kab: larik(P)}));
const SPEK = {
  ringkas: obj({v: P, versi: P, belum_terukur: BOOL, alasan: P, dibuat: P, umpan_cap: P, umpan: P, teks: P, catatan: P, peringatan: PERINGATAN,
    tak_dipetakan: obj({n: N, nama: larik(P)}), kab: KAB, nasional: obj({jiwa_worldpop: N, kab_siaga_awas: N})}),
  status: obj({v: P, versi: P, dibuat: P, boleh_tampil: BOOL, hipotesis: BOOL, boleh_per_bahaya: peta(KODE, BOOL), sumber: obj({prediksi: P, umpan_bmkg: P, kelas_kab: BOOL}),
    kab: peta("^\\d{4}$", peta(KODE, STATUS))}),
};
const belum = alasan => new Response(JSON.stringify({v: 1, belum_terukur: true, alasan}), {headers: {...JSONH, "cache-control": "no-store", "x-jangan-simpan": "1"}});

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
    const o = d && SPEK[nama](d);
    return o ? new Response(JSON.stringify(o), {headers: JSONH}) : belum("keluaran belum terbit atau tidak terbaca");
  });
};

async function desa(env, req, url) {
  if (!(await stafOK(env, req, PERAN))) return gagal(401, "perlu masuk sebagai staf", NO_STORE);
  const kab = url.searchParams.get("kab") ?? "";
  if (!/^\d{4}$/.test(kab)) return gagal(400, "kab harus empat digit", NO_STORE);
  if (!dalamWilayahStaf(req, [kab.slice(0, 2)])) return gagal(403, "di luar wilayah akun", NO_STORE);
  const d = await baca(env, `desa/${kab}.json`);
  const h = new Headers(JSONH); h.set("cache-control", "no-store");
  return new Response(JSON.stringify(d && typeof d === "object" ? d : {v: 1, belum_terukur: true, alasan: "keluaran kab ini belum terbit"}), {headers: h});
}

export const RUTE_DAMPAK_PERINGATAN = {
  "GET /api/dampak-peringatan/ringkas": publik("ringkas"),
  "GET /api/dampak-peringatan/status": publik("status"),
  "GET /api/dampak-peringatan/desa": desa,
};
