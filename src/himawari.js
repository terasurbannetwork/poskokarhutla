/* Hotspot Himawari-9 (JAXA) dari R2 data/himawari.json + penanda "api baru": api yang Himawari lihat sebelum NASA FIRMS.
   Dipakai peta (/api/himawari) dan peringatan dini email (src/ews.js). Satu sumber kebenaran: tandaiBaru. */
import {km, wilayah, cariWilayah} from "./titik.js";

const MENIT = 60e3, JAM = 60 * MENIT;
export const BARU_N_MIN = 2;          // terdeteksi >= 2 pindaian 10 menit pada jendela 3 jam = bertahan >= 10 menit (bukan kilatan/derau satu pindaian)
export const BARU_U_MAKS = 60;        // menit: deteksi terakhir <= 60 menit sebelum acuan, jadi masih menyala di jam terakhir data
export const BARU_LEVEL_MIN = 2;      // level 2 (membara) atau 3 (menyala); level 1 (dingin) terlalu sering sisa api/panas permukaan
export const BARU_ACUAN_MAKS = 3 * JAM;   // acuan lebih tua dari ini = data basi, tidak ada yang "baru"
export const BARU_KM = 4;             // geolokasi Himawari +-2 km + piksel VIIRS 375 m: titik FIRMS (sensor/keyakinan apa pun) dalam 4 km = sudah terlihat NASA
export const FIRMS_UMUR = 24 * JAM;   // sama dengan TITIK_UMUR ews.js: hanya titik FIRMS <= 24 jam yang menutup status baru
const SEL = 0.1;                      // derajat (>= 11 km) > BARU_KM, jadi 3x3 sel cukup
const GRID = new WeakMap();

export async function muatHimawari(env) {
  try { const o = await env.MEDIA?.get("data/himawari.json"); return o ? JSON.parse(await new Response(o.body).text()) : null; } catch (e) { return null; }
}

/* waktu data (kunci `acuan`, selalu kunci pertama) tanpa mengurai berkas: baca 300 byte awal dari R2. null = objek/kunci tidak ada. Dipakai /api/status. */
export async function himawariDibuat(env) {
  try { const o = await env.MEDIA?.get("data/himawari.json", {range: {offset: 0, length: 300}}); const t = o ? await new Response(o.body).text() : "", w = Date.parse(t.match(/"acuan"\s*:\s*"([^"]+)"/)?.[1]); return Number.isNaN(w) ? null : w; } catch (e) { return null; }
}

/* hw = {acuan, baris}; firms = {acuan, baris: [[lat, lon, jam(negatif, jam sebelum acuan), ...]]} atau null. Mengembalikan baris
   [lat, lon, u, frp, level, rel, qf, n, u0, baru]; baris lama 7 kolom: n = 1, u0 = u. diIndonesia(lat, lon): FIRMS di D1 membuang titik negara tetangga,
   jadi tanpa saringan ini api di Malaysia/Timor Leste/PNG selalu tampak "baru". */
export function tandaiBaru(hw, firms, kini, diIndonesia = () => true) {
  const segar = hw?.acuan && kini - Date.parse(hw.acuan) <= BARU_ACUAN_MAKS;
  let g = null;
  if (segar && firms?.baris) {
    g = GRID.get(firms);
    if (!g) {
      g = new Map(); const ac = Date.parse(firms.acuan);
      for (const p of firms.baris) {
        if (!(ac + p[2] * JAM >= kini - FIRMS_UMUR)) continue;
        const k = Math.floor(p[0] / SEL) + "," + Math.floor(p[1] / SEL); (g.get(k) || g.set(k, []).get(k)).push(p);
      }
      GRID.set(firms, g);
    }
  }
  const dekat = (lat, lon) => {
    if (!g) return false;
    const a = Math.floor(lat / SEL), b = Math.floor(lon / SEL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of g.get((a + i) + "," + (b + j)) || []) if (km(lat, lon, p[0], p[1]) <= BARU_KM) return true;
    return false;
  };
  return (hw?.baris || []).map(r => {
    const [lat, lon, u, frp, level, rel, qf] = r, n = r[7] ?? 1, u0 = r[8] ?? u;
    const baru = segar && n >= BARU_N_MIN && u <= BARU_U_MAKS && level >= BARU_LEVEL_MIN && !dekat(lat, lon) && diIndonesia(lat, lon) ? 1 : 0;
    return [lat, lon, u, frp, level, rel, qf, n, u0, baru];
  });
}

/* wilayah gagal dimuat = jangan tandai apa pun (lebih baik diam daripada alarm di negara tetangga) */
export async function saringIndonesia(env) {
  try { const W = await wilayah(env); return (lat, lon) => !!cariWilayah(W, lat, lon); } catch (e) { return () => false; }
}

/* isi /api/himawari: objek R2 + kolom `baru` dan `w` + n_baru, hanya titik di wilayah Indonesia (layar menggambar semuanya sebagai "Api baru"; pemilik, 22 Okt 2026).
   Objek hilang = kosong (bukan 500). */
export async function himawariRespons(env, kini = Date.now()) {
  const hw = await muatHimawari(env);
  if (!hw) return {acuan: null, baris: [], n_baru: 0};
  let firms = null;
  try { const r = await env.DB?.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first(); firms = r && JSON.parse(r.isi); } catch (e) {}
  /* kolom w = indeks ke `wilayah` (kunci "prov|kab|kec"), untuk indikator Api baru per wilayah di panel layar; wilayah gagal dimuat = kosong */
  let W = null; try { W = await wilayah(env); } catch (e) {}
  const kunci = (lat, lon) => W ? cariWilayah(W, lat, lon) : null, daftar = [], idx = new Map();
  const baris = tandaiBaru(hw, firms, kini, (lat, lon) => !!kunci(lat, lon)).flatMap(r => { const k = kunci(r[0], r[1]); if (!k) return [];
    if (!idx.has(k)) { idx.set(k, daftar.length); daftar.push(k); } return [[...r, idx.get(k)]]; });
  return {...hw, kolom: [...(hw.kolom || ["lat", "lon", "u", "frp_mw", "level", "rel", "qf"]).slice(0, 7), "n", "u0", "baru", "w"], wilayah: daftar, baris, n_baru: baris.reduce((s, r) => s + r[9], 0)};
}
