"use strict";
/* Tab Metode (tidak di menu, A24): cara status dihitung dan batasnya, ditulis dari angka berkas data supaya tidak basi. */
const Metode = {
  render() {
    const M = S.meta, sp = M.spi, N = M.nasional;
    const tabel = (h, r, n = "") => `<div class="tw"><table class="kl-tb"><thead><tr>${h.map((x, i) => `<th class="${i ? n : ""}">${x}</th>`).join("")}</tr></thead><tbody>${r.map(c => `<tr>${c.map((x, i) => `<td class="${i ? n : ""}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const kartu = (ey, judul, isi, sumber) => Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`);
    $("#metode").innerHTML =
      kartu("Status", `Status wilayah dihitung sendiri: ${Kartu.hl("Deteksi Pantau Bencana")}`, tabel(["Tingkat", "SPI-3", "Kelembapan tanah (persentil)"],
        [[pill(1), "≤ −1", "≤ 20"], [pill(2), "≤ −1,5", "≤ 10"], [pill(3), "≤ −2 dan (tanah ≤ 10 atau SPI-6 ≤ −1,5)", "≤ 5"]], "n num"), "ambang Pantau Bencana, belum diuji balik") +
      kartu("Hujan", `SPI-3 dari hujan bulanan 1991–2020${sp ? `, sampai ${bulanPanjang(sp.bulan)} di ${fmt(sp.sel)} sel` : ""}`, tabel(["Bahan", "Keterangan"],
        [["Hujan", "NASA POWER (MERRA-2), jumlah tiga bulan dibanding sebaran gamma 1991–2020"], ["Jeda data", "sekitar enam minggu; bulan terakhir yang terisi di hampir semua sel"], ["Dibuang", "sel yang rata-rata tiga bulannya di bawah 50 mm (SPI tak bermakna)"]]), "NASA POWER; McKee 1993; BMKG hanya menerbitkan peta gambar") +
      kartu("Tanah", `Kelembapan tanah 7–28 cm: ${Kartu.hl(fmt(M.tanah.sel))} sel sudah berpersentil`, tabel(["Bahan", "Keterangan"],
        [["Persentil", "dibanding ERA5-Land 2015–2025 pada dasarian yang sama"], ["Aturan", "tanah boleh menaikkan satu tingkat dari SPI; tanah sendirian paling tinggi Siaga; Awas butuh tanah ≤ 10 atau SPI-6 ≤ −1,5, tanpa itu paling tinggi Siaga"], ["Sel baru", "klimatologi sel bertambah tiap hari, jadi lapisan ini makin penuh"]]), "ECMWF IFS (Open-Meteo), ERA5-Land") +
      kartu("Kode DC", "Kode kekeringan (DC) hanya lapisan peta, tidak ikut menentukan status", tabel(["Kelas DC", "Nilai"],
        [["Rendah", "< 80"], ["Sedang", "80–189"], ["Tinggi", "190–299"], ["Sangat tinggi", "300–424"], ["Ekstrem", "≥ 425"]], "n num"), "Canadian Forest Fire Danger Rating System") +
      kartu("Wilayah", `Kabupaten/kota naik tingkat bila ${Kartu.hl("30%")} penduduknya di kecamatan bertingkat itu`, tabel(["Bahan", "Keterangan"],
        [["Kecamatan", "tingkat sel 0,5° terdekat dari titik tengah kecamatan"], ["Jiwa", `WorldPop, ${rb(N.total)} jiwa`], ["Status resmi", "tidak ada; BMKG tidak menerbitkan data terstruktur"]]), "WorldPop; BMKG");
 },
};
