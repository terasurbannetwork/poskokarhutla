# RENCANA-UJI: Silang Sumber

Perintah hanya dijalankan setelah tiketnya dikerjakan; sampai itu, berkas belum ada. Uji memakai berkas nyata di repo bila ada dan fixture tulisan tangan untuk kasus tepi.

## Perintah bukti

| Fitur | Perintah | Membuktikan |
| --- | --- | --- |
| F1 | `python3 -I scripts/bnpb/silang/rapor_sumber.py uji` | Rumus POD, FAR, CSI, ETS cocok dengan contoh tulisan tangan; bagi nol menghasilkan null; n_kejadian < 30 tanpa persen; arsip kurang dari 30 hari menghasilkan "belum_cukup"; baris dengan tanggal beku sesudah periode target dibuang; jalan ulang tidak menimpa arsip. |
| F1 | `node --test tests/bnpb/silang_rapor.test.mjs` | `rapor_sumber.json` ada, tiap sel punya a, b, c, d, n; status sesuai gerbang; tidak ada kata "aman" dan "Pantau Bencana"; angka B1 dan B2 (RISET) terbaca ulang dari `cuaca_verifikasi.json` dan `cuaca_verif_synop.json` bila sumbernya masuk. |
| F2 | `python3 -I scripts/gempa/tsunami_zona.py uji` | 60 zona unik dari `inatews_tsunami.json` masing-masing berstatus dipetakan atau tercatat di `belum_dipetakan`; "KOTA-BITUNG" dan "MANGGARAI BAGIAN UTARA" menghasilkan kabupaten sesuai kamus; tingkat tertinggi, bukan rata-rata; tinggi 0,94 m terbaca. |
| F2 | `node --test tests/gempa/silang_tsunami.test.mjs` | Pemutar menghasilkan keadaan berbeda per buletin; kejadian 15 Agu 2026 berubah dari 2 ke 22 zona; label "latihan" ada; peta BMKG memuat sumber. |
| F3 | `python3 -I scripts/bnpb/silang/beda_sumber.py uji` | Beda dua peringkat menyalakan "perlu_dicek"; sumber hilang menghasilkan "tidak_dibandingkan"; rasio gelombang memakai lantai; tidak ada field yang menyebut sumber benar. |
| F3 | `node --test tests/bnpb/silang_beda.test.mjs` | Skema `beda_sumber.json`; kartu di `silang.js` tampil dengan kedua lembaga. |
| F5 | `python3 -I scripts/gempa/beruntun.py uji` | Mc dari katalog sintetis dengan Mc diketahui kembali ke nilai itu; Poisson dikoreksi jumlah sasaran; sasaran dengan n di atas Mc < 50 berstatus data_kurang. |
| F5 | `node --test tests/gempa/silang_beruntun.test.mjs` | Label "Deteksi Centurisk97" dan `bukan_prediksi: true`; tidak ada kata "prediksi gempa" sebagai klaim; tidak ada kata "aman". |
| F6 | `python3 -I scripts/umum/kalender_ancaman.py uji` | Nama kabupaten dicocokkan lewat nama (kode iklim tidak dipakai); bulan tanpa narasi menghasilkan null; tanpa skor gabungan. |
| F6 | `node --test tests/bnpb/silang_kalender.test.mjs` | Kabupaten di `kalender_ancaman.json` konsisten dengan `kalender_risiko.json` untuk p dan n. |
| Gerbang | `node --test tests/agen/gerbang-silang.test.mjs` | Tidak ada berkas Silang yang menulis ke `public/prediksi` atau `scripts/prediksi`; tidak ada "aman" atau "Pantau Bencana" di keluaran dan layar; arsip append-only. |
| Semua | `npm run uji:agen && npm run uji:layar` | Gerbang agen dan layar tetap hijau. |
| Pratinjau | browser 1440 dan 390 px | Tidak ada galat konsol; pemilih bahaya dan tenggang tidak membekukan layar. |

## Uji balik (sebelum hasil turunan boleh tampil sebagai peringatan)

Berlaku untuk F3 dan F5 (K3). F1 sendiri adalah uji balik sumber lain; F2 dan F6 tidak membuat peringatan baru.

1. **Beku.** Keluaran harian ditambahkan ke arsip sebelum kejadian dinilai; tidak diisi mundur.
2. **F3.** Pertanyaan: pada hari "perlu_dicek", seberapa sering kejadian nyata tercatat di tempat itu dibandingkan hari yang selaras? Tanda dianggap berguna hanya bila ada beda terukur terhadap hari tanpa tanda, dengan selang kepercayaan blok per hari.
3. **F5.** Pertanyaan: setelah tanda menyala di sasaran, seberapa sering gempa M besar atau erupsi tercatat dalam jendela tindak lanjut, dibandingkan sasaran tanpa tanda pada Mc yang sama. Sampel gempa besar kecil; bila belum ada 30 kejadian sasaran, layar menulis "belum teruji" dan label tetap analisis.
4. **Syarat klaim.** Paling sedikit 90 hari arsip dan 30 kejadian penilaian per bahaya. Di bawah itu tidak ada klaim ketepatan dan tidak ada persen.
5. **Pembanding.** Persistensi dan klimatologi, seperti rapor yang ada. Tanpa pembanding tidak ada kata "lebih baik".
6. Hasil dicatat di berkas terpisah; tidak mengubah kriteria terkunci model lain.
