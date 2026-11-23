/* peta_kab.js: adaptor kualitas udara untuk mesin bersama /inti/peta_kab.js (PB-85, F-41).
   Angka per kab/kota = seri kab di /udara/data/laporan.json (sumber yang sama dengan laporan harian, tidak dihitung ulang). Semua metrik di berkas itu berasal dari
   prakiraan model CAMS, belum dikoreksi ke alat ukur, jadi tiap lapisan diberi pil hipotesis (D6); pengukuran stasiun BMKG tidak ikut lapisan ini.
   Berjalan hanya bila registri menyalakan kemampuan.layar.peta_kab. Dimuat sesudah peta.js. */
(() => {
if (typeof PetaKabInti === "undefined") return;
const HIPOTESIS = "perkiraan model CAMS (hipotesis), belum dikoreksi ke alat ukur, bukan ISPU resmi";
PetaKabInti.pasang({id: "udara", url: "/udara/data/laporan.json", peta: () => peta, host: () => document.getElementById("lapis"), legenda: () => document.getElementById("legenda"), hipotesis: () => HIPOTESIS});
})();
