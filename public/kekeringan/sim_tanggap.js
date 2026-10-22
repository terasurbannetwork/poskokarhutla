"use strict";
/* Lapis tanggap simulasi kekeringan: pangkalan (BPBD kabupaten dari posko_kekeringan.json), waktu tempuh truk tangki, kapasitas angkut,
   biaya kandidat perlakuan, dan peringkat. Fungsi murni; bisa dimuat node (require) untuk uji. Hitungan neraca air ada di simulasi.js. */
(() => {
/* Parameter jalan dan air bersih sama dengan scripts/kekeringan/posko.py (kelok 1,4; 40 km/jam; 15 L/orang/hari Sphere; tangki 5.000 L).
   Sisanya ASUMSI perencanaan Pantau Bencana, bukan harga satuan resmi: ganti bila ada e-katalog/DIPA. */
const ASUMSI = {
  liter_orang_hari: 15, kap_tangki_l: 5000, kelok: 1.4, laju_kmj: 40, jam_kerja: 10, jam_isi: 1, pangkalan_n: 3, jarak_dalam_sel_km: 20,
  sewa_tangki_hari: 1.5e6,          /* Rp per truk per hari: sewa + sopir + BBM */
  sumur_modal: 200e6, sumur_ls: 2, sumur_jam: 12, sumur_ha: 10, sumur_kap_mm: 600,   /* Rp per titik; debit L/detik; jam pompa/hari; ha irigasi per titik; air tersedia mm */
  pompa_modal: 30e6, pompa_ha: 10, pompa_kap_mm: 150, pompa_bbm_hari: 0.3e6,         /* pompa sungai/embung: sumber terbatas */
  awal_ha: 0.4e6,                   /* Rp per ha: benih, penyuluhan, pengolahan dipercepat */
  omc_hari: 5, omc_rp_hari: 220e6,  /* hari operasi; Rp/hari = keputusan.json biaya_omc_hari (Kemenhut 2026) */
  laju_irigasi: 6,                  /* mm/hari saat pompa jalan */
  porsi_rentan: 0.2,                /* ASUMSI: porsi penduduk yang bergantung sumber air musiman (sumur gali, mata air, hujan, permukaan); pengganti Susenas per provinsi sampai public/kekeringan/data/air_minum.json ada */
  hari_kering: 14,                  /* ASUMSI: hari berturut-turut tanah stres (atau SPI-3 teramati <= -1,5 dan tanah masih stres) sebelum sumber musiman dianggap habis */
  ambang_jiwa: 1000                 /* ASUMSI: hari dengan jiwa rentan di bawah ini tidak dihitung hari krisis */
};

const rad = d => d * Math.PI / 180;
function jarakKm(la1, lo1, la2, lo2) {
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
const tempuhJam = (km, p = ASUMSI) => km * p.kelok / p.laju_kmj;
/* rit per hari: satu putaran = pergi + pulang + isi/bongkar; hanya putaran utuh yang dihitung */
const ritPerHari = (tJam, p = ASUMSI) => Math.max(0, Math.floor(p.jam_kerja / (2 * tJam + p.jam_isi)));

/* n pangkalan terdekat ke titik (lat, lon); pangkalan = [{nama, lat, lon}]. km minimal jarak_dalam_sel_km: tujuan tersebar di dalam sel */
function pangkalanTerdekat(lat, lon, daftar, n = ASUMSI.pangkalan_n, p = ASUMSI) {
  return daftar.map(b => { const km = Math.max(p.jarak_dalam_sel_km, jarakKm(lat, lon, b.lat, b.lon)); return {...b, km, tJam: tempuhJam(km, p), rit: 0}; })
    .sort((a, b) => a.km - b.km).slice(0, n).map(b => ({...b, rit: ritPerHari(b.tJam, p)}));
}
/* liter/hari yang bisa diantar: tiap pangkalan memegang `unit` truk */
const kapasitasTangki = (pangkalan, unit, p = ASUMSI) => pangkalan.reduce((s, b) => s + unit * p.kap_tangki_l * b.rit, 0);
/* kebutuhan (L/hari) dari jiwa tanpa air bersih; jiwa terlayani dibatasi kapasitas */
const kebutuhanL = (jiwa, p = ASUMSI) => jiwa * p.liter_orang_hari;
const jiwaTerlayani = (jiwa, kapL, p = ASUMSI) => Math.min(jiwa, Math.floor(kapL / p.liter_orang_hari));
/* sumur bor: liter/hari per titik */
const sumurL = (p = ASUMSI) => p.sumur_ls * 3600 * p.sumur_jam;

/* persentil linear pada deret tak terurut */
function persentil(arr, q) {
  const a = Array.from(arr).sort((x, y) => x - y); if (!a.length) return 0;
  const r = (a.length - 1) * q, i = Math.floor(r), f = r - i; return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * f;
}

/* urutkan kandidat menurut kunci: "padi" (ha), "jiwa", "biaya" (murah dulu). Seri: biaya lebih murah (ha dan jiwa beda satuan, tak dijumlahkan). */
function urutkan(kand, kunci) {
  const nilai = {padi: k => -k.padiHa, jiwa: k => -k.jiwa, biaya: k => k.biaya}[kunci] || (k => -k.padiHa);
  return kand.slice().sort((a, b) => nilai(a) - nilai(b) || a.biaya - b.biaya);   /* seri: yang lebih murah; ha dan jiwa tidak dijumlahkan */
}
const perUnit = (biaya, manfaat) => manfaat > 0 ? biaya / manfaat : null;

const api = {ASUMSI, jarakKm, tempuhJam, ritPerHari, pangkalanTerdekat, kapasitasTangki, kebutuhanL, jiwaTerlayani, sumurL, persentil, urutkan, perUnit};
if (typeof module !== "undefined") module.exports = api; else window.Tanggap = api;
})();
