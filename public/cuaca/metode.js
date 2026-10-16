"use strict";
/* ================================================================ metode: sumber, ambang, batasan (tab tersembunyi dari menu, A24) */
const Metode = {
  tabel: (kep, baris) => `<div class="tw"><table><thead><tr>${kep.map(k => `<th>${k}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
  render() {
    const A = S.meta.ambang, sumber = this.tabel(["Data", "Sumber", "Cara tampil"], [
      ["Peringatan nowcast", "BMKG (CAP)", "Apa adanya, berlabel BMKG dan jam terbit; hilang saat masa berlakunya lewat"],
      ["Peringatan gelombang", "BMKG Maritim", "Kelas dan perairan dari BMKG, digabung per provinsi"],
      ["Hujan dan embusan", "Open-Meteo, kisi 0,25 derajat", "Prakiraan per sel, 10 hari"],
      ["Peluang hujan lebat", "ECMWF IFS 51 anggota via Open-Meteo", "Satu titik per kotak 1 derajat"]]);
    const ambang = this.tabel(["Bahaya", "Tingkat 1", "Tingkat 2", "Tingkat 3"], [
      ["Hujan harian (mm)", ...A.hujan.map((v, i) => `${v} ${["lebat", "sangat lebat", "ekstrem"][i]}`)],
      ["Embusan (km/jam)", ...A.angin_kmj.map((v, i) => `${v} ${["waspada", "siaga", "awas"][i]}`)]]);
    const batas = `<ul class="mt"><li>Deteksi Pantau Bencana dari prakiraan model, bukan pengukuran; sel model 0,25 derajat lebih luas dari puting beliung dan sel badai.</li><li>Ambang adalah hipotesis awal dan belum dikunci uji balik.</li><li>Badai guntur tidak ditampilkan: indeks angkat tidak ada di sumber.</li><li>Peringatan BMKG tidak dipetakan ulang ke tingkat Pantau Bencana.</li></ul>`;
    $("#metode").innerHTML = [["Sumber data", sumber, "Sumber: BMKG, Open-Meteo, ECMWF"], ["Ambang", ambang, "Sumber: kelas hujan BMKG"], ["Batasan", batas, "Sumber: BMKG, Open-Meteo, ECMWF"]]
      .map(([j, isi, s]) => `<div data-ex="${j}">${Kartu.ex(j, "", "", isi, s).replace('<span class="ex-ey"></span>', "")}</div>`).join("");
  },
};
