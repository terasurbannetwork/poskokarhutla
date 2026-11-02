/* Kemitraan Kampus, tampilan Masalah (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.masalah, null, "Diajukan"], [IK.tanya, null, "Ditelaah"], [IK.cek, null, "Tervalidasi"], [IK.aktifkan, null, "Diambil"]];
  KM.tampilan.masalah = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Masalah", "Tampilan ini belum diisi."); },
    angka,
  };
})();
