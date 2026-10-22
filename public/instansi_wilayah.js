/* SATU tabel nama wilayah untuk tampilan: provinsi (kode BPS -> nama resmi) dan ejaan resmi kab/kota. Data wilayah di repo memakai ejaan BPS ("Kota Palangkaraya"); layar menampilkan ejaan resmi
   ("Kota Palangka Raya"). Hanya untuk TAMPILAN: nilai yang dikirim ke server dan dipakai sebagai kunci tetap ejaan data. Dimuat /instansi dan halaman admin sebelum skrip halaman.
   Daftar PROV sama dengan PROV di src/instansi.js (dijaga tests/warga/staf_halaman.test.mjs). */
window.Wilayah = (() => {
  const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau",
    "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat",
    "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo",
    "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
  /* ejaan data -> ejaan resmi; berlaku untuk potongan kata, jadi "Kota Palangkaraya" dan kalimat yang memuatnya ikut benar */
  const EJAAN = {Palangkaraya: "Palangka Raya"};
  const teks = s => Object.entries(EJAAN).reduce((t, [a, b]) => t.replaceAll(a, b), String(s ?? ""));
  return {PROV, EJAAN, teks, kab: teks, prov: k => PROV[k] ?? k};
})();
