/* Keadaan awal Docs sedini mungkin, dimuat di kepala: penanda "js" (CSS menyembunyikan daftar halaman modul yang tidak aktif
   hanya bila skrip jalan) dan tema terang bawaan. Pilihan tema tersimpan dipasang halaman_statis.js. Pemilih sudut pembaca sudah
   dihapus (K6, K8); nama berkas dipertahankan agar tautan lama tidak patah. Tanpa skrip inline. */
(function () {
  var de = document.documentElement;
  de.classList.add("js");
  if (!de.dataset.theme) de.dataset.theme = "light";
})();
