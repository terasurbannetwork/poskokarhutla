/* Worker simulasi gunung api: abu (AbuModel: jalankan + jejak terjauh + endapan kisi/desa) dan lahar (Lahar.simulasi).
   Dua instans dari berkas ini dijalankan sim.js (satu per pekerjaan) supaya klik tidak menunggu hitungan. DEM dikirim SEKALI (tipe "dem", buffer dipindah);
   pesan lahar berikutnya hanya membawa V dan hl. Pesan balik selalu membawa seq yang sama supaya hasil basi dibuang di sisi halaman. */
importScripts("abu_model.js", "sim_lahar.js");
let DEM = null;

function abu(m) {
  const t0 = Date.now();
  const h = AbuModel.jalankan({lat: m.lat, lon: m.lon, puncak_m: m.puncak, kolom_m: m.kolom_m, durasi_jam: m.durasi, angin: m.angin, jam: 72, n: 2000, seed: 1});
  const maks = AbuModel.jejakMaks(h), akhir = h.snap[h.snap.length - 1];
  let w = 1e9, e = -1e9, so = 1e9, n = -1e9;
  for (let i = 0; i < akhir.lon.length; i++) if (akhir.aktif[i] || akhir.darat[i]) { w = Math.min(w, akhir.lon[i]); e = Math.max(e, akhir.lon[i]); so = Math.min(so, akhir.lat[i]); n = Math.max(n, akhir.lat[i]); }
  let kisi = null, desaAbu = [];
  const titik = [], K = 32;
  if (w <= e) {
    const mg = 0.15, c = 1.4; /* kisi dibatasi ~150 km dari kawah: lebih jauh dari itu abu terlalu tipis untuk dibedakan */
    w = Math.max(w - mg, m.lon - c); e = Math.min(e + mg, m.lon + c); so = Math.max(so - mg, m.lat - c); n = Math.min(n + mg, m.lat + c);
    const dw = (e - w) / K, dn = (n - so) / K;
    for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) titik.push({lon: w + (i + .5) * dw, lat: so + (j + .5) * dn});
    const rad = Math.max(1, Math.min(8, Math.hypot(dw * 111 * Math.cos(m.lat * Math.PI / 180), dn * 111) * .7)), nK = titik.length;
    m.desa.forEach(d => titik.push({lat: d.lat, lon: d.lon}));
    const rel = AbuModel.endapan(h, {titik, radius_km: rad});
    kisi = {w, so, dw, dn, K, rel: Array.from(rel.slice(0, nK), v => Math.round(v * 1e4) / 1e4)}; desaAbu = rel.slice(nK);
  }
  return {hasil: h, maks, kisi, desaAbu, ms: Date.now() - t0};
}

self.onmessage = e => {
  const m = e.data;
  try {
    if (m.tipe === "dem") DEM = {dem: m.dem, n: m.n, m: m.n, z: m.z, lat: m.lat, pusat: m.pusat};
    else if (m.tipe === "abu") self.postMessage({ok: true, seq: m.seq, r: abu(m)});
    else if (m.tipe === "lahar") { if (!DEM) throw new Error("DEM belum diterima"); self.postMessage({ok: true, seq: m.seq, r: Lahar.simulasi({...DEM, V: m.V, hl: m.hl})}); }
  } catch (err) { self.postMessage({ok: false, seq: m.seq, galat: String(err && err.message || err)}); }
};
