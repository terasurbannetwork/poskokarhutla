# ALUR: Pembiayaan risiko per kejadian

## A1. Kejadian masuk lingkup

1. Kejadian `KJ-` di Buku Besar mendapat paling sedikit satu permohonan DSP di meja atau satu entri Jitupasna (Q5).
2. Halaman pembiayaan kejadian itu terbentuk; semua kartu bertanda "belum diisi" sampai ada data.

## A2. Sisi kerugian

1. Jitupasna selesai sebagian atau penuh: kartu Kerugian membaca `nilaiKerusakan` dan `nilaiKerugian` dari `/siklus`, termasuk status menunggu dan tingkat keyakinan harga.
2. Sebelum Jitupasna: kartu menampilkan "belum ada angka resmi". Kartu Perkiraan awal hanya muncul bila model lulus (ALGORITMA 2).

## A3. Sisi dana

1. Realisasi DSP otomatis dari meja DSP per kejadian.
2. Staf pembiayaan memasukkan saldo DSP/PFB dengan nilai, tanggal data, dan sumber. Tiap isian menambah riwayat.
3. Isian lewat dari jadwal (Q1) tampil dengan tanda basi, nilainya tidak diubah.

## A4. Pembandingan

1. Kerugian (resmi atau perkiraan) di baris atas, dana di baris bawah, selisih dan keyakinan kedua sisi di sampingnya.
2. Bila salah satu sisi menunggu atau belum diisi, selisih tidak dihitung dan alasannya ditulis.

## A5. Parametrik

1. Staf mencatat skema (D6). Tanpa catatan, bagian ini tidak tampil.
2. Dengan catatan: pemantau membandingkan data kejadian (mis. magnitudo, curah hujan) dengan pemicu yang tertulis dan menampilkan "terpenuhi", "belum", atau "tidak dapat dinilai" beserta data yang dibaca. Sistem tidak menyatakan klaim cair; itu urusan penerbit polis.
