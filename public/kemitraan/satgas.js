/* Kemitraan Kampus, tampilan Satgas (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.satgas, null, "Kampus bersatgas"], [IK.orang, null, "Anggota siap"], [IK.waktu, null, "Pakar piket minggu ini"], [IK.aktifkan, null, "Aktivasi berjalan"]];
  KM.tampilan.satgas = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Satgas", "Tampilan ini belum diisi."); },
    angka,
  };
})();
