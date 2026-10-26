/* SIPPA: teks "Batas pemakaian alat" (PRD §9.4.8, G22 dan G23). Satu sumber untuk layar Data (SP-031) dan Lampiran L buku (SP-073);
   jangan salin ke berkas lain. Hanya teks, tanpa angka yang dihitung: angka rumus ada di hitung.js. */

export const BATAS_ALAT = [
  "Simulator tidak membuktikan efektivitas. Hasilnya perencanaan dan perbandingan skenario; efikasi lance dan kit baru dinilai dari pilot dan uji A/B (gerbang G4), dan berlabel hipotesis sampai evaluator independen menandatangani.",
  "Manfaat bawaan 0 di semua skenario. NPV dan BCR hanya berarti bila kamu mengisi manfaat sendiri dengan sumber yang bisa ditelusuri.",
  "Skor tidak meluluskan NO-GO. Satu gerbang keras cukup membuat vonis NO-GO, berapa pun skor dan biayanya; vonis kalkulator dan Studio hanya NO-GO, HOLD, atau KONDISIONAL.",
  "Pompa dinilai dengan rating pabrikan (dua sampai tiga titik datasheet), bukan kurva Q-H terukur. Kurva terukur baru ada sesudah bench test G2, dan sebelum itu angka tekanan ujung berlabel estimasi-model.",
  "Serapan lance dihitung tetap 40 L/min per lance. Debit pompa di atas serapan total dinyatakan tidak terserap (H-SERAP), karena air tanpa tempat keluar bukan hasil yang bisa dipakai.",
  "Kedalaman injeksi 0 sampai batas atas keputusan 50; kedalaman 3 m ke atas hanya untuk lengan uji kedua dan berpil lengan uji. Kebutuhan air dihitung per meter kubik gambut yang membara, bukan per hektare seluruh lapisan.",
  "Jam pompa dan hari regu tahunan di Studio dianggap terjadi tiap tahun, sedangkan kajian dasar memakai 40% tahun kering. Selisih ini membuat OPEX Studio lebih tinggi dari yang akan dibayar pada tahun basah.",
  "Mesin Studio dipakai apa adanya dengan satu lapisan gerbang tambahan yang hanya menambah hambatan. Angka mesin dan angka kalkulator hidraulika boleh berbeda; halaman Data menjelaskan sebabnya."
];
