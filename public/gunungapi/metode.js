"use strict";
/* Metode dan data gunung api: dari mana angkanya, arti tiap level resmi (kalimat PVMBG apa adanya), dan apa yang sengaja tidak ditampilkan. */
const Metode = {
  /* arti level: kutipan halaman Tingkat Aktivitas MAGMA Indonesia, 16 Okt 2026 */
  ARTI: {4: "Hasil pengamatan visual dan instrumental teramati mengalami peningkatan aktivitas yang semakin nyata atau gunung api mengalami erupsi",
    3: "Hasil pengamatan visual dan instrumental memperlihatkan peningkatan aktivitas yang semakin nyata atau gunung api mengalami erupsi",
    2: "Hasil pengamatan visual dan instrumental mulai memperlihatkan peningkatan aktivitas. Pada beberapa gunung api dapat terjadi erupsi",
    1: "Hasil pengamatan visual dan instrumental fluktuatif, tetapi tidak memperlihatkan peningkatan aktivitas yang signifikan"},
  daftar: (judul, baris, sumber, ey) => Kartu.ex(judul, "", "", `<ul class="mt">${baris.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join("")}</ul>`, sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`),
  render() {
    $("#metode").innerHTML = [
      this.daftar("Level gunung api memakai status resmi PVMBG tanpa diubah", [4, 3, 2, 1].map(l => [pilLv(l), esc(this.ARTI[l])]), "Sumber: MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)", "Level"),
      this.daftar("Angka dan peta diambil dari halaman publik MAGMA Indonesia", [
        ["Level dan nama gunung", "Halaman Tingkat Aktivitas Gunung Api, dibaca ulang tiap kali data diperbarui. Level tampil persis seperti yang diterbitkan PVMBG."],
        ["Radius rekomendasi", "Angka kilometer pada kalimat radius di laporan aktivitas harian gunung berstatus Level II ke atas. Jarak sektor (aliran awan panas dan lahar) dicatat terpisah dan tidak digambar sebagai lingkaran."],
        ["Erupsi terbaru", "Halaman Informasi Letusan MAGMA: waktu, gunung, dan tinggi kolom abu bila disebut."],
        ["Perubahan level", "Pantau Bencana membandingkan level tiap pembaruan dengan pembaruan sebelumnya. Catatannya dimulai sejak halaman ini berjalan, bukan riwayat PVMBG."],
        ["Jiwa dalam radius", "Penduduk WorldPop 2026 (kisi 25 km) dikalikan bagian luas tiap sel yang masuk lingkaran radius. Kisinya jauh lebih kasar daripada radius, jadi angkanya perkiraan orde besar, bukan hitungan per desa."]], "Sumber: MAGMA Indonesia, WorldPop", "Sumber data"),
      this.daftar("Yang sengaja tidak ditampilkan", [
        ["Kawasan Rawan Bencana (KRB)", "Peta KRB PVMBG hanya tersedia sebagai gambar unduhan tanpa lisensi data yang jelas, jadi tidak dipetakan di sini."],
        ["Prakiraan letusan", "Pantau Bencana tidak meramal letusan dan tidak menentukan level sendiri. Untuk keputusan, ikuti rekomendasi PVMBG dan BPBD setempat; Level I Normal bukan jaminan tidak ada bahaya."],
        ["Sebaran abu untuk penerbangan", "Informasi abu vulkanik penerbangan (VONA, VAAC) tetap bersumber dari PVMBG dan BMKG."]], "Sumber: PVMBG, Badan Geologi", "Batas"),
    ].join(""); },
};
