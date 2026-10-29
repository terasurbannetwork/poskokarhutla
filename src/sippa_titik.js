/* SP-103: sesudah putaran FIRMS (titik.js perbaruiTitik) bandingkan titik panas BARU dengan kompleks SIPPA zona A atau B (zona_k, versi konservatif) dalam radius 2 km.
   Satu baris sippa_titik_dekat per kompleks; tidak ada baris baru bila kompleks yang sama sudah beralarm dalam 24 jam. Meja Pantau membacanya sebagai butir sippa_titik (src/pantau.js).
   R2 sippa/kelayakan_kompleks.json dibaca SEKALI per putaran, dan hanya bila ada titik baru. Titik baru = tidak ada di putaran sebelumnya (kunci lat|lon|menit|sensor). */
const JAM = 3600e3, HARI = 24 * JAM, RADIUS_KM = 2, SIMPAN_HARI = 30, DERAJAT = 2.2 / 111;   // 2,2 km dalam derajat lintang: saringan kasar sebelum haversine
export const haversineKm = (a, b, c, d) => { const r = Math.PI / 180, p = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(p)); };
const kunci = (lat, lon, t, s) => `${lat}|${lon}|${Math.round(t / 60e3)}|${s}`;
const dariIsi = teks => { try { const i = JSON.parse(teks), ac = Date.parse(i.acuan); return Number.isFinite(ac) && Array.isArray(i.baris) ? i.baris.map(b => ({lat: b[0], lon: b[1], t: ac + b[2] * JAM, s: b[3]})) : null; } catch (e) { return null; } };

/* titik: [{lat, lon, t, s}] putaran ini; sebelumnya: teks isi putaran sebelumnya (atau null). Kembalian {baru, dekat, lewat?} */
export async function alarmTitikSippa(env, titik, sebelumnya, kini = Date.now()) {
  const lama = sebelumnya ? dariIsi(sebelumnya) : null, ada = lama && new Set(lama.map(p => kunci(p.lat, p.lon, p.t, p.s)));
  const baru = titik.filter(p => ada ? !ada.has(kunci(p.lat, p.lon, p.t, p.s)) : p.t > kini - 3 * JAM);   // tanpa putaran sebelumnya: hanya yang terdeteksi 3 jam terakhir
  if (!baru.length) return {baru: 0, dekat: 0};
  if (!env.MEDIA) return {baru: baru.length, dekat: 0, lewat: "R2 MEDIA tidak ada"};
  const o = await env.MEDIA.get("sippa/kelayakan_kompleks.json");
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return {baru: baru.length, dekat: 0, lewat: "kelayakan_kompleks belum diunggah"}; }
  let K; try { K = (await o.json()).kompleks; } catch (e) { return {baru: baru.length, dekat: 0, lewat: "kelayakan_kompleks tak terbaca"}; }
  if (!Array.isArray(K)) return {baru: baru.length, dekat: 0, lewat: "kelayakan_kompleks tak terbaca"};
  const terdekat = new Map();
  for (const k of K) {
    if ((k.zona_k !== "A" && k.zona_k !== "B") || !/^K\d{1,10}$/.test(k.id) || !/^\d{2}$/.test(k.prov) || !Number.isFinite(k.lat) || !Number.isFinite(k.lon)) continue;
    for (const p of baru) {
      if (Math.abs(p.lat - k.lat) > DERAJAT) continue;
      const d = haversineKm(k.lat, k.lon, p.lat, p.lon);
      if (d <= RADIUS_KM && d < (terdekat.get(k.id)?.d ?? 9)) terdekat.set(k.id, {k, p, d});
    }
  }
  const sudah = new Set((await env.DB.prepare("SELECT DISTINCT kompleks_id FROM sippa_titik_dekat WHERE dibuat > ?").bind(kini - HARI).all()).results.map(r => r.kompleks_id));
  const tulis = [...terdekat.values()].filter(x => !sudah.has(x.k.id));
  await env.DB.batch([...tulis.map(({k, p, d}) => env.DB.prepare("INSERT INTO sippa_titik_dekat (kompleks_id, prov, kab, zona, jarak_km, lat, lon, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(k.id, k.prov, k.kab ?? null, k.zona_k, Math.round(d * 100) / 100, p.lat, p.lon, kini)),
    env.DB.prepare("DELETE FROM sippa_titik_dekat WHERE dibuat < ?").bind(kini - SIMPAN_HARI * HARI)]);
  return {baru: baru.length, dekat: tulis.length};
}
