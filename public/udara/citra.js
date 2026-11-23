/* citra.js: adaptor kualitas udara untuk mesin bersama /inti/banding.js dan /inti/timelapse.js (PB-85, F-41).
   Lapisan citra (NASA GIBS, harian): warna asli VIIRS/MODIS dan kedalaman optik aerosol MODIS (MODIS_Combined_Value_Added_AOD, definisi sama dengan
   data/lapisan_tambahan.json gibs_aod). AOD = kolom aerosol dari satelit, hanya jalur yang tidak berawan; BUKAN PM2,5 permukaan dan bukan ISPU.
   Hari tanpa citra tampil kosong, bukan diisi. Awal data AOD 2017-04-19. Berjalan hanya bila registri menyalakan kemampuan.layar.citra. Dimuat sesudah peta.js. */
(() => {
if (typeof BandingInti === "undefined" || typeof TimelapseInti === "undefined") return;
const adaptor = {id: "udara", peta: () => peta, wadah: () => document.getElementById("p-peta"), host: () => document.getElementById("tools"),
  lapisan: [
    {k: "sat", nama: "Citra satelit warna asli", pendek: "Warna asli", lap: t => t < "2018-03-01" ? "MODIS_Terra_CorrectedReflectance_TrueColor" : "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
      fmt: "jpg", lv: 9, mz: 9, atr: "VIIRS NOAA-20 / MODIS Terra", dari: "2000-02-24"},
    {k: "aod", nama: "Kabut asap, kedalaman optik aerosol (MODIS)", pendek: "Asap (AOD)", lap: "MODIS_Combined_Value_Added_AOD", fmt: "png", lv: 6, mz: 6,
      atr: "NASA GIBS / MODIS Combined Value-Added AOD, bukan PM2,5 permukaan", dari: "2017-04-19", dasar: true}]};
BandingInti.pasang(adaptor); TimelapseInti.pasang(adaptor);
window.CitraUdara = {adaptor};
})();
