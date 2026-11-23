/* peta_kab.js: adaptor gempa untuk mesin bersama /inti/peta_kab.js (PB-81.3, F-41).
   Angka per kab/kota = seri kab di /gempa/data/laporan.json (sumber yang sama dengan laporan harian). Berjalan hanya bila registri menyalakan kemampuan.layar.peta_kab. Dimuat sesudah peta.js. */
(() => {
if (typeof PetaKabInti === "undefined") return;

PetaKabInti.pasang({id: "gempa", url: "/gempa/data/laporan.json", peta: () => peta, host: () => document.getElementById("lapis"), legenda: () => document.getElementById("legenda")});
})();
