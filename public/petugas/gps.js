/* GPS peramban: satu titik, atau n sampel berjeda (jumlah dan jeda dari konst.gps). Hanya posisi; tidak disimpan. */
import {pesanGps} from "./murni.js";

export function satuTitik({tinggi = true, usiaMs = 0, batasMs = 15000} = {}) {
  return new Promise((ok, gagal) => {
    if (!navigator.geolocation) return gagal(new Error(pesanGps(2)));
    navigator.geolocation.getCurrentPosition(
      p => ok({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, waktu: p.timestamp}),
      e => gagal(Object.assign(new Error(pesanGps(e.code)), {kode: e.code})),
      {enableHighAccuracy: tinggi, maximumAge: usiaMs, timeout: batasMs});
  });
}

/* n sampel berurutan dengan jeda; onSampel(ke, daftar) tiap sampel masuk. Sampel yang gagal dilewati; galat dilempar bila TIDAK ada sampel sama sekali. */
export async function sampelGps(konst, onSampel) {
  const hasil = []; let galat = null;
  for (let i = 0; i < konst.gps.sampel; i++) {
    if (i) await new Promise(r => setTimeout(r, konst.gps.jedaMs));
    try { hasil.push(await satuTitik()); onSampel?.(hasil.length, hasil); } catch (e) { galat = e; if (e.kode === 1) break; }
  }
  if (!hasil.length) throw galat || new Error(pesanGps(2));
  return hasil;
}
