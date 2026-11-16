/* citra.js: adaptor cuaca untuk mesin bersama /inti/banding.js dan /inti/timelapse.js (PB-81.1, F-41).
   Lapisan citra (NASA GIBS, harian): warna asli VIIRS/MODIS dan suhu kecerahan infra merah VIIRS (puncak awan dingin = awan konvektif tinggi).
   Infra merah VIIRS yang dipakai adalah citra siang hari; hari tanpa citra tampil kosong, bukan diisi.
   Berjalan hanya bila registri menyalakan kemampuan.layar.citra. Dimuat sesudah peta.js. */
(() => {
if (typeof BandingInti === "undefined" || typeof TimelapseInti === "undefined") return;
const adaptor = {id: "cuaca", peta: () => peta, wadah: () => document.getElementById("p-peta"), host: () => document.getElementById("tools"),
  lapisan: [
    {k: "sat", nama: "Citra satelit warna asli", pendek: "Warna asli", lap: t => t < "2018-03-01" ? "MODIS_Terra_CorrectedReflectance_TrueColor" : "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
      fmt: "jpg", lv: 9, mz: 9, atr: "VIIRS NOAA-20 / MODIS Terra", dari: "2000-02-24"},
    {k: "ir", nama: "Infra merah awan (suhu kecerahan VIIRS)", pendek: "Infra merah", lap: "VIIRS_NOAA20_Brightness_Temp_BandI5_Day", fmt: "png", lv: 9, mz: 9, atr: "VIIRS NOAA-20 Band I5 (siang)", dari: "2018-01-05", dasar: true}]};
BandingInti.pasang(adaptor); TimelapseInti.pasang(adaptor);
window.CitraCuaca = {adaptor};
})();
