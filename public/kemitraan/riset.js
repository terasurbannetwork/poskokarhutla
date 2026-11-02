/* Kemitraan Kampus, tampilan Riset (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.riset, null, "Agenda terbuka"], [IK.waktu, null, "Hibah berjalan"], [IK.buku, null, "Proposal diajukan"], [IK.aktifkan, null, "Inovasi"]];
  KM.tampilan.riset = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Riset", "Tampilan ini belum diisi."); },
    angka,
  };
})();
