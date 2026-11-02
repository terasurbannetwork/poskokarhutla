/* Kemitraan Kampus, tampilan Talenta (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.talenta, null, "Magang berjalan"], [IK.orang, null, "Alumni mentor"], [IK.daerah, null, "Desa binaan"], [IK.cek, null, "Kab dampingan"]];
  KM.tampilan.talenta = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Talenta", "Tampilan ini belum diisi."); },
    angka,
  };
})();
