/* Worker lapisan konteks: mengunduh dan menguraikan sekolah.json (7 MB) + fasilitas.json di luar thread utama, lalu menyusun satu GeoJSON
   (sekolah Dapodik/EMIS + RS & faskes OSM, sama dengan lapisan fasilitas karhutla) dan mengirimkannya sebagai teks.
   Pemanggil: inti/peta/konteks.js. Properti pendek: t jenis, g jenjang, n nama, j jenjang asli, st status, sw siswa, w wilayah. */
const grup = j => /^(TK|KB|SPS|TPA|PAUD|RA|BA|KOBER)/i.test(j) ? "dini" : /^(SD|MI)$/i.test(j) ? "sd" : /^(SMP|MTS)$/i.test(j) ? "smp" : /^(SMA|SMK|MA|MAK)$/i.test(j) ? "sma" : "lain";
const titik = (lon, lat, properties) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties});
onmessage = async ({data: {fasilitas, sekolah}}) => {
  try {
    const [f, s] = await Promise.all([fetch(fasilitas).then(r => r.json()), fetch(sekolah).then(r => r.json())]);
    const fitur = f.filter(x => x.t !== "sekolah").map(x => titik(x.lon, x.lat, {t: x.t, n: x.nama}));
    for (const [nama, j, st, , sw, , kab, kec, , lat, lon] of s.baris)
      fitur.push(titik(lon, lat, {t: "sekolah", g: grup(j), n: nama, j, st, sw, w: [kec, kab].filter(Boolean).join(", ")}));
    postMessage({teks: JSON.stringify({type: "FeatureCollection", features: fitur}), n: fitur.length});
  } catch (e) { postMessage({galat: String(e)}); }
};
