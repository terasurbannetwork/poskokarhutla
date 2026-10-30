/* Kemitraan Kampus, tampilan Dana (KM-A10: kerangka). Isi tampilan menyusul di tiket tampilannya; sekarang hanya mendaftar dan menampilkan kosongHtml(). */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  /* 4 butir pita (DS §3); nilai null tampil en dash, bukan nol, sampai datanya ada */
  const angka = () => [[IK.dana, null, "Donor siap"], [IK.riset, null, "Panggilan buka"], [IK.waktu, null, "Tenggat ≤ 30 hari"], [IK.cek, null, "Dana lolos (Rp)"]];
  KM.tampilan.dana = {
    bangun(el) { el.innerHTML = KM.kosongHtml("Dana", "Tampilan ini belum diisi."); },
    angka,
  };
})();
