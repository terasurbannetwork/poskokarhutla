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
        <li><b>Penduduk</b>: WorldPop 2026, kotak 1 km dijumlahkan ke kotak 0,25 derajat (CC BY 4.0).</li>
        <li><b>Riwayat (Tren)</b>: hari lampau dari analisis CAMS lewat Open-Meteo, sesudahnya satu titik per hari dari prakiraan pagi harinya; bukan alat ukur.</li>
        <li><b>Sekolah dan fasilitas kesehatan (Dampak)</b>: Dapodik/EMIS dan OpenStreetMap, dihitung di kecamatan yang PM2,5 24 jamnya di atas 55,4 µg/m³; hanya yang tercatat dan cocok nama atau titiknya.</li>
        <li><b>Berita</b>: Google News RSS, judul dan cuplikan; diperbarui tangan, jam panen tertulis di kartu.</li></ul>`],
      ["Cara menghitung", `<ol class="mt-daftar">
        <li>Tiap kotak 1 derajat diberi kategori dari PM2,5 rata-rata 24 jam.</li>
        <li>Penduduk di tiap kotak 0,25 derajat ikut kategori kotak 1 derajat yang memuatnya.</li>
        <li>Jiwa dijumlahkan per provinsi. Untuk kabupaten/kota, tiap kotak penduduk dimasukkan ke kecamatan terdekat di provinsi yang sama.</li>
        <li>Rata-rata provinsi dan kabupaten dihitung dengan bobot jumlah penduduk.</li></ol>`],
      ["Batasan", `<ul class="mt-daftar">
        <li>Model global beresolusi sekitar 40 km: asap karhutla tertangkap, tetapi polusi kota dan kejadian sempit bisa meleset. Di kota besar model sering membaca lebih tinggi daripada alat ukur di tanah.</li>
        <li>${S.prak?.koreksi?.status === "terkoreksi" ? `Angka PM2,5 kota dikoreksi dengan ${fmt(S.prak.koreksi.n_stasiun)} stasiun, tetapi di luar kota yang punya stasiun tetap keluaran CAMS.` : "Angka PM2,5 CAMS belum dikoreksi dengan alat ukur di tanah karena belum ada data stasiun yang bisa kami pakai."} Uji terhadap alat ukur terbatas; uji yang ada adalah terhadap jarak pandang METAR di bandara (lihat Prakiraan 72 jam), dan uji itu memakai analisis hari lampau, bukan prakiraan. Di kota besar di Jawa angkanya cenderung terlalu tinggi, jadi jumlah jiwa dibulatkan dan hanya perkiraan kasar. Asap karhutla tidak otomatis penyebab angka kota.</li>
        <li>Data ISPU resmi KLHK tidak bisa kami jangkau, jadi tidak ditampilkan di sini. Untuk keputusan kesehatan, ikuti pengumuman BMKG dan dinas lingkungan hidup setempat.</li>
        <li>Jarak pandang bandara dipengaruhi kabut dan hujan, tidak hanya asap, dan hanya mewakili sekitar bandara.</li></ul>`],
      ...this.prakiraan(),
    ];
  },
  /* bab prakiraan 72 jam, lintasan, atribusi, dampak rentan, simulasi; hanya bila datanya ada. Asumsi dibaca dari berkas, bukan ditulis ulang di sini. */
  prakiraan() { const out = [], P = S.prak, K = P?.koreksi, G = P?.galat, asum = a => a?.length ? `<div class="tw"><table><thead><tr><th>Asumsi</th><th>Nilai</th><th>Sumber</th></tr></thead><tbody>${a.map(x => `<tr><td>${esc(x.nama)}</td><td>${esc(x.nilai)}</td><td>${esc(x.sumber)}</td></tr>`).join("")}</tbody></table></div>` : "";
    if (P) out.push(["Prakiraan 72 jam per kota", `<ul class="mt-daftar">
      <li><b>Status kota</b>: rata-rata PM2,5 24 jam, dengan titik potong yang sama dengan tabel kategori di atas: Normal (Baik atau Sedang) sampai 55,4; Waspada (Tidak sehat) sampai 150,4; Siaga (Sangat tidak sehat) sampai 250,4; Awas (Berbahaya) di atasnya. Provinsi memakai kategori ISPU saja. Pilihan jam memakai rata-rata 24 jam yang berakhir di jam itu.</li>
      <li><b>Koreksi bias</b>: ${K?.status === "terkoreksi" ? `PM2,5 CAMS dikalikan faktor koreksi per kota dari ${fmt(K.n_stasiun)} stasiun pemantau (faktor median ${Murni.desimal(K.faktor_median, 1)}); ${esc(K.metode || "")}.` : "belum ada. Stasiun pemantau belum tersedia, jadi angka kota adalah keluaran CAMS apa adanya dan selalu berlabel perkiraan model."} Rumus: PM2,5 terkoreksi = PM2,5 CAMS × faktor.</li>
      <li><b>Uji terhadap METAR (analisis, bukan prakiraan)</b>${G?.metar ? `: ${esc(G.metar.definisi || "")}. Yang diuji adalah analisis CAMS hari lampau (hindcast) terhadap laporan bandara, bukan prakiraan 24 sampai 72 jam ke depan. Hit = bagian kejadian asap yang tertangkap; FAR = bagian peringatan yang keliru; CSI = benar dibagi (benar + terlewat + keliru). Hasil: hit ${Murni.persen(G.metar.hit)}, FAR ${Murni.persen(G.metar.far)}, CSI ${Murni.persen(G.metar.csi)} dari ${fmt(G.metar.n)} hari-bandara${G.metar.n_bandara ? ` di ${fmt(G.metar.n_bandara)} bandara` : ""}.` : " belum tersedia."} ${G && G.metar_prakiraan == null ? "Uji prakiraan 24 sampai 72 jam sedang mengumpulkan data; sampai selesai, ketepatan prakiraan ke depan belum terbukti." : ""}</li>
      <li><b>Stasiun</b>${G?.stasiun ? `: bias ${Murni.desimal(G.stasiun.bias, 1)} µg/m³, RMSE ${Murni.desimal(G.stasiun.rmse, 1)} µg/m³, kategori tepat ${Murni.persen(G.stasiun.tepat_kategori)} dari ${fmt(G.stasiun.n)} stasiun.` : ": belum ada uji ke stasiun karena belum ada data stasiun."}</li></ul>`]);
    if (S.lin?.kompleks?.length) out.push(["Lintasan asap", `<p>Dari tiap kompleks api, parsel udara dibawa mengikuti angin Open-Meteo pada tiga lapis (10 m, 925 hPa, 850 hPa) sampai 72 jam, langkah 3 jam: posisi baru = posisi lama + angin × waktu. Garis putus-putus di peta adalah lapis yang kamu pilih; jam di tautan kota adalah perkiraan kedatangan. Ini perkiraan kasar dari angin grid 1 derajat, bukan model dispersi penuh.</p>`]);
    if (S.atr?.kota?.length) out.push(["Sumber asap per kota", `<p>PM2,5 satu kota dibagi menjadi bagian dari tiap kompleks api (lewat lintasan dan daya radiasi api), PLTU batu bara di sekitarnya, dan latar. Pembagian ini untuk besok. Persen ditulis berikut rentang rendah sampai tinggi dari 1.458 kombinasi anggapan (sebaran, emisi, normalisasi), jadi rentangnya lebar. Bila model sumber jauh di atas CAMS, kota itu tidak dibagi dan ditulis "porsi tak dihitung". Nama yang tampil adalah badan usaha pemegang konsesi di lokasi api dan nama kompleks api (wilayah dan kode), tanpa nama orang; keberadaan badan usaha di sana di sana bukan tuduhan bahwa pihak itu yang membakar.</p>${asum(S.atr.asumsi)}`]);
    if (S.ren) out.push(["Dampak kelompok rentan", `<ul class="mt-daftar"><li><b>Balita dan lansia</b>: penduduk kelompok umur itu di wilayah yang rata-rata PM2,5 24 jamnya di atas 55,4 µg/m³.</li><li><b>Kasus ISPA</b>: tambahan kasus per hari = penduduk × insidensi dasar harian × (RR<sup>(PM2,5 − 15)/10</sup> − 1). RR per 10 µg/m³ berasal dari studi rawat inap penyakit pernapasan (WHO HRAPIE) dan dipakai sebagai proksi untuk kasus ISPA, yang lebih luas dari rawat inap. Pada konsentrasi asap yang jauh di atas rentang studi hasilnya ekstrapolasi dan tidak teruji. Rentang rendah sampai tinggi mengikuti selang kepercayaan 95% RR, sehingga batas bawah bisa nol. Dihitung hanya untuk kab/kota-hari berstatus waspada atau lebih, dan kenaikan PM2,5 dibatasi 100 µg/m³ di atas 15.</li><li><b>Sekolah</b>: sekolah di kota berstatus siaga atau awas besok; maksimal 300 yang terburuk.</li><li><b>Bandara</b>: jarak pandang METAR sekarang, lalu prakiraan dari PM2,5 model lewat rumus Koschmieder. Prakiraan jarak pandang ini belum diuji terhadap METAR. Jarak pandang juga dipengaruhi kabut dan hujan, tidak hanya asap.</li></ul>${asum(S.ren.asumsi)}`]);
    out.push(["Simulasi", `<p>Tab Simulasi memakai angin dan prakiraan yang sama untuk mencoba skenario. Hasilnya cara berpikir, bukan prakiraan resmi.${window.SimUdara?.BATAS ? " " + esc(window.SimUdara.BATAS) : ""}</p>`]);
    return out; },
  render() {
    if ($("#metode").dataset.sudah) return; $("#metode").dataset.sudah = 1;
    $("#metode").innerHTML = `<div class="mt-kisi">${this.bagian().map(([j, h]) => `<section class="card pad mt-bag"><h3>${j}</h3>${h}</section>`).join("")}</div>`;
  },
};
