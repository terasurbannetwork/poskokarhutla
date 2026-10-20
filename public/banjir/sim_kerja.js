"use strict";
/* sim_kerja.js: Web Worker tab Simulasi genangan. Unduh DEM, siapkan area, hitung genangan di luar utas utama supaya klik tidak beku.
   Pesan masuk {id, jenis: "dem", lat, lon, sisi, n} | {id, jenis: "siap", dem} | {id, jenis: "lahan", K} | {id, jenis: "jalan", cfg};
   keluar {id, kabar} lalu {id, ok, ...} | {id, ok: false, galat}. Larik besar dikirim sebagai transferable. */
importScripts("sim_genangan.js", "sim_longsor.js", "sim_lahan.js");
const larik = o => Object.values(o).filter(v => ArrayBuffer.isView(v)).map(v => v.buffer);
self.onmessage = async e => {
  const {id, jenis} = e.data;
  try {
    if (jenis === "dem") { const d = await SimGenangan.ambilDEM(e.data.lat, e.data.lon, e.data.sisi, e.data.n); self.postMessage({id, ok: true, dem: d}, [d.z.buffer]); }
    else if (jenis === "siap") { const p = SimGenangan.siapkanArea(e.data.dem, SimLongsor.lereng); self.postMessage({id, ok: true, prep: p}, larik(p)); }
    else if (jenis === "lahan") { const l = await SimLahan.kisiLahan(e.data.K); self.postMessage({id, ok: true, lahan: l}, l ? larik(l) : []); }
    else if (jenis === "jalan") { let akhir = 0;
      const r = SimGenangan.jalankan(e.data.cfg, p => { const s = Date.now(); if (s - akhir > 150) { akhir = s; self.postMessage({id, kabar: p}); } });
      self.postMessage({id, ok: true, hasil: r}, [r.kedalaman.buffer, r.hmaks.buffer]); }
    else throw new Error("jenis pesan tidak dikenal: " + jenis);
  } catch (err) { self.postMessage({id, ok: false, galat: String(err && err.message || err)}); }
};
