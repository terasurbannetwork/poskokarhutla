"use strict";
/* ================================================================ metode (versi awam): sumber, kategori, cara hitung, batasan.
   Angka batas diambil dari KAT/BATAS di app.js supaya satu sumber dengan peta dan kartu. */
const Metode = {
  bagian() {
    const kolKat = KAT.map((k, i) => `<tr><td>${pilKat(i)}</td><td class="n">${k.r}</td><td class="n">${["0 sampai 50", "51 sampai 100", "101 sampai 200", "201 sampai 300", "di atas 300"][i]}</td>
      <td>${["Boleh beraktivitas di luar seperti biasa", "Kelompok sensitif kurangi aktivitas berat di luar", "Pakai masker, kurangi aktivitas di luar", "Tetap di dalam ruangan, pakai masker rapat", "Hindari aktivitas luar, cari ruang udara bersih"][i]}</td></tr>`).join("");
    return [
      ["Tentang", `<p>Halaman ini menunjukkan perkiraan PM2,5 empat hari ke depan, jarak pandang di bandara, dan berapa banyak orang yang menghirup udara tidak sehat. Angkanya perkiraan model, bukan ISPU resmi KLHK.</p>`],
      ["Kategori udara", `<div class="tw"><table><thead><tr><th>Kategori</th><th class="n">PM2,5 24 jam <span style="text-transform:none">(µg/m³)</span></th><th class="n">ISPU</th><th>Yang disarankan</th></tr></thead><tbody>${kolKat}</tbody></table></div>
        <p class="kecil">Titik potong mengikuti Permen LHK P.14/2020 untuk rata-rata 24 jam. Nilai per jam disebut PM2,5 per jam, bukan kategori.</p>`],
      ["Dari mana datanya", `<ul class="mt-daftar">
        <li><b>PM2,5 dan PM10</b>: Copernicus CAMS (ECMWF) lewat Open-Meteo, satu titik per kotak 1 derajat, empat hari. Diperbarui tiap hari.</li>
        <li><b>Jarak pandang bandara</b>: laporan METAR dari NOAA Aviation Weather. Laporan yang lebih tua dari ${MAKS_JAM_METAR} jam tidak ditampilkan.</li>
        <li><b>Penduduk</b>: WorldPop 2026, kotak 1 km dijumlahkan ke kotak 0,25 derajat (CC BY 4.0).</li></ul>`],
      ["Cara menghitung", `<ol class="mt-daftar">
        <li>Tiap kotak 1 derajat diberi kategori dari PM2,5 rata-rata 24 jam.</li>
        <li>Penduduk di tiap kotak 0,25 derajat ikut kategori kotak 1 derajat yang memuatnya.</li>
        <li>Jiwa dijumlahkan per provinsi. Untuk kabupaten/kota, tiap kotak penduduk dimasukkan ke kecamatan terdekat di provinsi yang sama.</li>
        <li>Rata-rata provinsi dan kabupaten dihitung dengan bobot jumlah penduduk.</li></ol>`],
      ["Batasan", `<ul class="mt-daftar">
        <li>Model global beresolusi sekitar 40 km: asap karhutla tertangkap, tetapi polusi kota dan kejadian sempit bisa meleset. Di kota besar model sering membaca lebih tinggi daripada alat ukur di tanah.</li>
        <li>Data ISPU resmi KLHK tidak bisa kami jangkau, jadi tidak ditampilkan di sini. Untuk keputusan kesehatan, ikuti pengumuman BMKG dan dinas lingkungan hidup setempat.</li>
        <li>Jarak pandang bandara dipengaruhi kabut dan hujan, tidak hanya asap, dan hanya mewakili sekitar bandara.</li></ul>`],
    ];
  },
  render() {
    if ($("#metode").dataset.sudah) return; $("#metode").dataset.sudah = 1;
    $("#metode").innerHTML = `<div class="mt-kisi">${this.bagian().map(([j, h]) => `<section class="card pad mt-bag"><h3>${j}</h3>${h}</section>`).join("")}</div>`;
  },
};
