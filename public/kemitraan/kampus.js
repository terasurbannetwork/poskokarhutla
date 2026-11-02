/* Kemitraan Kampus, tampilan Kampus (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.kampus, null, "Kampus mitra"], [IK.orang, null, "Simpul"], [IK.waktu, null, "Menunggu persetujuan"], [IK.riset, null, "MoU segera habis"]];
  KM.tampilan.kampus = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Kampus", "Tampilan ini belum diisi."); },
    angka,
  };
})();
