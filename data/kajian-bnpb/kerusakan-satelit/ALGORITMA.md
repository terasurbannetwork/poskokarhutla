# ALGORITMA: Perkiraan kerusakan satelit

Konvensi sama dengan ALGORITMA Siklus: label keyakinan (`estimasi-model` untuk keluaran, `hipotesis` untuk parameter yang belum teruji), data tidak ada ditulis `null` dan tampil "menunggu", kunci wilayah BPS 4 digit, angka antarsumber tidak dijumlah.

## 1. Banjir: bangunan terendam

Masukan: Sentinel-1 RTC VV dan VH sebelum dan sesudah (pola `citra_banjir.py`), bangunan Open Buildings halus 110 m.
1. Air = piksel yang gelap baru: turun lebih dari ambang dB terhadap rerata beberapa adegan sebelum (`gelap_baru`), dikurangi air permanen (peta air tetap) dan lereng curam (kemiripan bayangan radar).
2. Bangunan terendam = bangunan yang pusatnya jatuh di piksel air. Perangkap: bangunan di kawasan padat memantulkan ganda (dihilangkan atau naik), jadi radar meremehkan genangan di permukiman; ini ditulis di keluaran sebagai batas bawah, label `estimasi-model`.
3. Keluaran per kab dan kecamatan: bangunan terendam (batas bawah), bangunan di kotak terliput, bagian terliput.

## 2. Karhutla: bangunan di area terbakar

Uji karhutla belum layak dijalankan. Dua sebab: (a) area terbakar dari titik panas kita (D8) lawan pembanding naif kedekatan titik panas bersifat melingkar, karena keduanya memakai isyarat yang sama; (b) DIBI "rumah terbakar" kebanyakan kebakaran permukiman, bukan karhutla, jadi bukan kebenaran yang sah. Target mandiri yang sah (survei BNPB atau BPBD bangunan terdampak karhutla, atau peta bakar Sentinel-2 mandiri dari indeks bakar, bukan dari titik panas) belum ditemukan; ini Q9. Sampai ada, vonis karhutla = menunggu uji dan tidak ada angka.

## 3. Uji balik terkunci (per bahaya)

Dikunci sebelum satu piksel dihitung, di `scripts/siklus/kerusakan_kriteria.json` (pola `lab_kerusakan.json`), sidik SHA tertulis di vonis.

Satuan uji dan n. Kebenaran DIBI hanya per kabupaten. Satuan uji = pasangan (kabupaten, kejadian banjir); n = jumlah pasangan. Kecamatan atau sel tidak dipakai kecuali ada kebenaran lebih rinci. Kriteria ini berlaku untuk "lulus terbatas".
- Daftar kejadian uji dikunci di berkas kriteria SEBELUM citra dilihat (cegah bias pemilihan), dengan aturan pemilihan tertulis (semua kejadian banjir DIBI sejak 2017 yang punya adegan Sentinel-1 sah sebelum dan sesudah, tanpa memilih sesudah melihat hasil). **[BAWAAN SEMENTARA]**
- Pemisahan: kalibrasi ambang air (dB) pada separuh pasangan, diacak dengan benih terkunci dan blok per kejadian; uji pada separuh lain. Ambang tidak disetel di separuh uji.
- n uji paling sedikit 30 pasangan (kabupaten, kejadian). **[BAWAAN SEMENTARA, HIPOTESIS]**
- Bias kebenaran: DIBI kurang mencatat kejadian kecil, jadi kebenaran bias ke kejadian besar; kecil dan nol tercatat tidak berarti nol rusak. Uji memakai hanya pasangan dengan catatan DIBI berisi (rumah terendam lebih dari nol) dan melaporkan sensitivitas dengan sampel tanpa catatan sebagai deskriptif; vonis tidak boleh dibaca sebagai berlaku untuk kejadian kecil.
- Pembanding naif: yang TERKUAT di antara beberapa (wajib_kalahkan, pola `lab_kerusakan.json`): jumlah bangunan kabupaten, luas kabupaten, kedalaman hujan (curah hujan maksimum beberapa hari), dan kombinasi bangunan kali hujan. Plasebo (adegan pra-kejadian) wajib juga.
- Lulus (kab, bukan kecamatan): rho Spearman uji paling sedikit 0,3 (sama dengan lab, karena kebenaran kasar); mengalahkan plasebo dan naif terkuat dengan selisih paling sedikit 0,05; CI90 bootstrap berblok per kejadian batas bawah selisih di atas nol; n uji terpenuhi. **[BAWAAN SEMENTARA, HIPOTESIS]** Dengan kebenaran sekasar ini, "lulus" sebenarnya hanya "lulus terbatas".
- Lulus penuh (angka per kecamatan boleh tampil) syaratnya kriteria TERPISAH di tingkat kecamatan: kebenaran lebih rinci dari DIBI per kabupaten (mis. data kecamatan dari BPBD), n sel atau kecamatan uji paling sedikit 40, rho paling sedikit 0,5 dan kriteria selisih sama. Tanpa kebenaran itu vonis maksimal lulus terbatas. Q5.
- Selain itu gagal. Kriteria tidak diubah sesudah hasil dilihat; perubahan = berkas baru, sidik baru, uji ulang. Vonis tidak pernah dilonggarkan untuk meloloskan fitur.

## 4. Gempa

Vonis gagal (Cianjur 2022, `kerusakan_ringkas.md`). Tidak ada keluaran angka. Pembukaan ulang hanya lewat Q2 dengan kriteria baru terkunci.

## 5. Tampil dan terima

- Angka tampil bila vonis bahaya lulus atau lulus terbatas; label tetap `estimasi-model`, tidak pernah `terverifikasi` sebelum staf mengisi.
- Kontras dengan Siklus PRD F3-08 (KA 11): model gagal uji untuk bahaya lain tampil dengan pil hipotesis. Untuk kerusakan bangunan, D2 yang menang (tanpa angka sama sekali); lihat Q10.
- Terima ke isian: jumlah yang ditulis staf (boleh dikoreksi dari angka perkiraan). Tingkat ditetapkan staf (D9). Invarian: baris terima tidak dijumlah dengan `rekap_rumah_rusak` untuk tingkat yang sama; rekap menampilkan keduanya berdampingan dengan selisih.
- Kasus uji: vonis gagal berarti tidak ada angka di keluaran API; citra tidak ada berarti `null`; perkiraan baru tidak mengubah baris terima.
