/* Kemitraan Kampus, tampilan Dasbor (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.dasbor, null, "Indikator tercapai /14"], [IK.kampus, null, "Kampus pasif"], [IK.dana, null, "Dana mitra per Rp1"], [IK.daerah, null, "Celah daerah"]];
  KM.tampilan.dasbor = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Dasbor", "Tampilan ini belum diisi."); },
    angka,
  };
})();
