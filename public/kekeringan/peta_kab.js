/* peta_kab.js: adaptor kekeringan untuk mesin bersama /inti/peta_kab.js (PB-81.3, F-41).
   Angka per kab/kota = seri kab di /data/kekeringan_laporan.json (sumber yang sama dengan laporan harian). Berjalan hanya bila registri menyalakan kemampuan.layar.peta_kab. Dimuat sesudah peta.js. */
(() => {
if (typeof PetaKabInti === "undefined") return;
/* metrik yang bergantung pada ambang HTH 31 hari: pil hipotesis selama uji balik belum lolos (AMBANG_PIL di app.js) */
const BERAMBANG = new Set(["jiwa31", "hth_maks", "kab31"]);
PetaKabInti.pasang({id: "kekeringan", url: "/data/kekeringan_laporan.json", peta: () => peta, host: () => document.getElementById("lapis"), legenda: () => document.getElementById("legenda"), hipotesis: k => { const t = typeof AMBANG_PIL === "function" ? AMBANG_PIL() : ""; return BERAMBANG.has(k) && /hipotesis/i.test(t) ? t : ""; }});
})();
