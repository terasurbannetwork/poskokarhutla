/* Worker modul: unduh dan urai /data/kluster.json (6-7 MB) dan hotspot24.json di luar utas utama; hanya kompleks aktif dan kolom yang dipakai model
   yang dikirim balik, berikut jumlah lintasan satelit yang melihat tiap kompleks (hotspot24 hilang -> tanpa kolom lintasan, model memakai cadangan). */
import {lintasanKompleks} from "./model.js";
self.onmessage = async e => {
  try {
    const [d, h] = await Promise.all([fetch(e.data).then(r => r.json()), fetch("/data/hotspot24.json").then(r => r.ok ? r.json() : null).catch(() => null)]);
    const P = (d.features || []).map(f => f.properties).filter(p => p.frp24 > 0), L = h?.baris ? lintasanKompleks(P, h.baris) : {};
    self.postMessage(P.map(p => ({id: p.id, lat: p.lat, lon: p.lon, frp24: p.frp24, gambut: !!p.gambut, luas: p.luas, akhir: p.akhir, lintasan: L[p.id], kab: p.kab, prov: p.prov})));
  } catch (err) { self.postMessage(null); }
};
