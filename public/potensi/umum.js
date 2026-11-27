/* Bahan bersama modul tab /potensi: penunda klik, ambil JSON, bbox, dan satu cache geo kab (dipakai status, iklim). */
/** Tunda kerja berat sesudah paint. Jaring 120 ms bila rAF tertahan (tab latar); f jalan sekali. */
export const nanti = (f) => {
  let s = 0, t = 0;
  const go = () => { if (s) return; s = 1; clearTimeout(t); f(); };
  t = setTimeout(go, 120);
  requestAnimationFrame(() => setTimeout(go, 0));
};
// batas 20 detik: satu API yang menggantung tidak boleh membuat semua tab Peringatan macet di "Memuat"
export const ambil = (u) => fetch(u, { credentials: "same-origin", signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const GEO = new Map();
/** Geometri kab per provinsi (dua digit), sekali ambil untuk semua modul. */
export const geoKab = (p) => (GEO.has(p) ? GEO.get(p) : GEO.set(p, ambil(`/geo/kabupaten/${p}.json`)).get(p));
export function bbox(koor) {
  let a = 180, b = 90, c = -180, d = -90;
  (function jalan(x) { if (typeof x[0] === "number") { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); } else for (const y of x) jalan(y); })(koor);
  return [[a, b], [c, d]];
}
