/* Kemitraan Kampus, tampilan Daerah (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.daerah, null, "Kab/kota berprofil"], [IK.masalah, null, "Masalah P1"], [IK.cek, null, "Tervalidasi"], [IK.waktu, null, "Kunjungan bulan ini"]];
  KM.tampilan.daerah = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Daerah", "Tampilan ini belum diisi."); },
    angka,
  };
})();
