"use strict";
/* ================================================================ saran sekolah dan warga per kategori ISPU prakiraan 24 jam (PKH-20)
   Sekolah: SE Mendikdasmen No. 20/2026. Warga: Kemenkes (26 Agustus 2026). Kalimat DIPARAFRASEKAN dari rujukan pembanding, bukan salinan teks SE;
   keputusan moda belajar tetap di dinas pendidikan menurut ISPU harian resmi. Kategori Baik tidak punya saran khusus: blok dibuang (A18).
   Kategori dari PM2,5 prakiraan kota (kat() di app.js, P.14/2020) dan bisa meleset satu kategori. Skor ketepatan tampil hanya bila skor di nilai_prakiraan.json tidak null. */
const SARAN = [null,
  {sekolah: "belajar tatap muka seperti biasa; kegiatan di luar ruangan dibatasi.",
   warga: "orang dengan asma atau penyakit jantung dan paru sebaiknya mengurangi aktivitas berat di luar rumah."},
  {sekolah: "tatap muka dibatasi; PAUD, SD kelas 1 sampai 3, SLB, dan murid dengan penyakit penyerta belajar dari rumah.",
   warga: "kurangi waktu di luar rumah dan pakai masker respirator (N95 atau KN95) bila harus keluar; anak, lansia, ibu hamil, dan penderita penyakit penyerta sebaiknya berada di dalam ruangan."},
  {sekolah: "tatap muka dibatasi atau dihentikan; ikuti keputusan dinas pendidikan setempat.",
   warga: "tetap di dalam ruangan dengan pintu dan jendela tertutup, pakai penyaring udara bila ada, pakai masker N95 atau KN95 saat keluar; segera ke fasilitas kesehatan bila sesak napas."},
  {sekolah: "kegiatan tatap muka dihentikan dan murid belajar dari rumah (bukan libur).",
   warga: "hindari keluar rumah, tetap di ruangan tertutup dengan penyaring udara; bila sesak napas, datangi Rumah Oksigen atau puskesmas terdekat."}];
const SUMBER_SARAN = "Saran sekolah: SE Mendikdasmen No. 20/2026. Saran warga: Kemenkes, 26 Agustus 2026. Info: Halo Kemenkes 1500-567.";
const Saran = {
  NP: null,   /* nilai_prakiraan.json; hilang = tanpa skor */
  async muat() { this.NP = await fetch("/udara/data/nilai_prakiraan.json").then(r => r.ok ? r.json() : null).catch(() => null); },
  /* skor lead 1 hanya bila tidak null; selain itu jalurnya diam */
  skor() { const sk = this.NP?.lead?.["1"]?.skor; if (!sk || sk.tepat == null) return "";
    const p = sk.persistensi ? `; sebagai pembanding, memakai angka kemarin saja: tepat ${Murni.persen(sk.persistensi.tepat_persistensi)}` : "";
    return `<p class="fnd">Cek terhadap stasiun ISPU (${fmt(this.NP.lead["1"].n)} pasang): kategori tepat ${Murni.persen(sk.tepat)}, meleset paling banyak satu kategori ${Murni.persen(sk.meleset_paling_banyak_1)}${p}.</p>`; },
  /* v = PM2,5 rata-rata 24 jam prakiraan hari terpilih (µg/m³); null atau kategori Baik = tanpa blok */
  blok(v) { if (v == null || !isFinite(v)) return ""; const c = kat(v), s = SARAN[c]; if (!s) return "";
    return `<div class="saran" title="${esc(SUMBER_SARAN)}"><p class="fnd"><b>Saran 24 jam ke depan, kategori ${esc(KAT[c].n)}</b></p>
      <p class="fnd"><b>Sekolah:</b> ${esc(s.sekolah)}</p><p class="fnd"><b>Warga:</b> ${esc(s.warga)}</p>
      <p class="fnd">Kategori dari prakiraan model dan bisa meleset satu kategori. Keputusan belajar ditetapkan dinas pendidikan menurut ISPU harian resmi (KLH, BMKG).</p>${this.skor()}</div>`; },
};
