/* Worker: unduh dan urai /data/kluster.json (6-7 MB) di luar utas utama; hanya kompleks aktif dan kolom yang dipakai model yang dikirim balik. */
self.onmessage = async e => {
  try {
    const d = await (await fetch(e.data)).json();
    self.postMessage((d.features || []).map(f => f.properties).filter(p => p.frp24 > 0).map(p => ({id: p.id, lat: p.lat, lon: p.lon, frp24: p.frp24, gambut: !!p.gambut, luas: p.luas, kab: p.kab, prov: p.prov})));
  } catch (err) { self.postMessage(null); }
};
