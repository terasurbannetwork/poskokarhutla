/* peta_kab.js: adaptor cuaca untuk mesin bersama /inti/peta_kab.js (PB-81.3, F-41).
   Angka per kab/kota = seri kab di /banjir/data/cuaca_laporan.json (sumber yang sama dengan laporan harian). Berjalan hanya bila registri menyalakan kemampuan.layar.peta_kab. Dimuat sesudah peta.js. */
(() => {
if (typeof PetaKabInti === "undefined") return;
/* status kecamatan Siaga dan Awas bergantung pada ambang hipotesis Centurisk97 (AMBANG_PIL di cuaca.js) */
const BERAMBANG = new Set(["kec"]);
PetaKabInti.pasang({id: "cuaca", url: "/banjir/data/cuaca_laporan.json", peta: () => peta, host: () => document.getElementById("lapis"), legenda: () => document.getElementById("legenda"), hipotesis: k => { const t = typeof AMBANG_PIL === "function" ? AMBANG_PIL() : ""; return BERAMBANG.has(k) && /hipotesis/i.test(t) ? t : ""; }});
})();
