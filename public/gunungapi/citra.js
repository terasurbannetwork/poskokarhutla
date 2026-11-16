/* citra.js: adaptor gunung api untuk mesin bersama /inti/banding.js dan /inti/timelapse.js (PB-81.1, F-41).
   Lapisan citra (NASA GIBS, harian): warna asli VIIRS/MODIS untuk melihat kolom abu dan awan erupsi, dan indeks SO2 AIRS untuk gas erupsi.
   Indeks SO2 AIRS memiliki celah data (mis. 17 Des 2025 sampai 22 Jun 2026); hari tanpa citra tampil kosong, bukan diisi.
   Berjalan hanya bila registri menyalakan kemampuan.layar.citra. Dimuat sesudah peta.js. */
(() => {
if (typeof BandingInti === "undefined" || typeof TimelapseInti === "undefined") return;
const adaptor = {id: "gunungapi", peta: () => peta, wadah: () => document.getElementById("p-peta"), host: () => document.getElementById("tools"),
  lapisan: [
    {k: "sat", nama: "Citra satelit warna asli", pendek: "Warna asli", lap: t => t < "2018-03-01" ? "MODIS_Terra_CorrectedReflectance_TrueColor" : "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
      fmt: "jpg", lv: 9, mz: 9, atr: "VIIRS NOAA-20 / MODIS Terra", dari: "2000-02-24"},
    {k: "so2", nama: "Gas SO2 erupsi (indeks AIRS)", pendek: "Gas SO2", lap: "AIRS_Prata_SO2_Index_Day", fmt: "png", lv: 6, mz: 6, atr: "AIRS Prata SO2 Index", dari: "2012-05-08", dasar: true}]};
BandingInti.pasang(adaptor); TimelapseInti.pasang(adaptor);
window.CitraGunungapi = {adaptor};
})();
