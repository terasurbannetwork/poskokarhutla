# Lapis (c) penyunting bahasa: mitigasi bab 11 (Grand Design Mitigasi 2026–2030)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-11.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (6.201 kata), nol temuan.
- Sesudah sunting: LOLOS, skor 0 (6.217 kata), nol temuan, kata kosong 0,0 per 1.000.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-11.md`.
- Satu S-21 tinggi sempat muncul di tengah sunting (baris 136, "Dengan demikian, ..." sebagai penutup paragraf); penghubungnya dibuang dan temuan hilang pada putaran berikutnya.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| sub:gd-sasaran, par. 2 | "Artinya bagi keputusan: target "Menurun" dari tahun biasa gagal bila ..." | "Target "Menurun" yang diukur dari tahun biasa akan gagal bila ..." | meta-komentar (M-13), prosa padat |
| sub:gd-sasaran, par. 3 | "penyebut SUPAS 2025" | "penyebut Survei Penduduk Antar Sensus (SUPAS) 2025" | singkatan dieja pada kemunculan pertama |
| sub:gd-alur, par. pemicu khusus | "konsultasi pimpinan DPRD" | "konsultasi dengan pimpinan dewan perwakilan rakyat daerah" | singkatan sekali pakai, tidak ada di glosarium; ditulis lengkap |
| sub:gd-alur, par. Sumatra 2025 | "Tenggat yang paling perlu ditambah karena itu berada ..." | "Tenggat yang paling perlu ditambah berada ..." | pengulangan "karena itu" (6 kali di bab) |
| sub:gd-musiman, par. 1 | "berhenti pada April karena itu melewatkan" | "berhenti pada April akan melewatkan" | pengulangan penghubung |
| sub:gd-musiman, par. 2 | "Rencana kontinjensi karhutla Sumatera karena itu disiapkan ..." | "Atas dasar itu, rencana kontinjensi karhutla Sumatera disiapkan ..." | variasi penghubung |
| sub:gd-rencana-aksi, par. 2 | "Pusat Prediksi Iklim NOAA" | "Pusat Prediksi Iklim Badan Kelautan dan Atmosfer Nasional Amerika Serikat (*National Oceanic and Atmospheric Administration*, NOAA)" | singkatan dieja; istilah asing dimiringkan |
| sub:gd-rencana-aksi, par. 2 | "BPBD yang sama karena itu harus beralih" | "badan penanggulangan bencana daerah (BPBD) yang sama harus beralih" | kemunculan pertama BPBD di prosa (glosarium); pengulangan penghubung |
| Kesiapan Kemarau 2027 | "Rencana kontinjensi karhutla Sumatera disiapkan sebelum Februari karena puncak kedua di awal tahun." | dihapus | pengulangan antarsubbab: isi yang sama sudah di sub:gd-musiman par. 2 dan @tbl:gd-musiman |
| sub:gd-respons, par. pembanding pra-2008 | "penilaian awal Bappenas" | "penilaian awal Badan Perencanaan Pembangunan Nasional (Bappenas)" | singkatan dieja (glosarium) |
| sub:gd-respons, par. stok | "**Buffer stock logistik ditetapkan ...**" | "**Stok penyangga (*buffer stock*) logistik ditetapkan ...**" | istilah Indonesia, konsisten dengan "stok penyangga" di paragraf yang sama (M-2) |
| sub:gd-pemulihan, par. 1 | "indeks JDIH" | "indeks Jaringan Dokumentasi dan Informasi Hukum (JDIH) BNPB" | singkatan dieja (glosarium) |
| sub:gd-pemulihan, par. 1 | "Pergeseran itu ditulis sebagai pilihan desain antara kecepatan dan peran daerah, bukan sebagai kelemahan." | "Pergeseran itu merupakan pilihan desain antara kecepatan penyaluran dan peran daerah." | meta-komentar dan kontras tanpa dasar data (M-10, M-4) |

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; pasif yang ada menyebut pelaku menurut pasal.
- M-2 sinonim berputar: "buffer stock" diseragamkan ke "stok penyangga".
- M-3 pembuka yang mengulang judul: tidak ditemukan.
- M-4 keberatan yang tak diajukan: satu dibuang (DTH Juklak 15/2025).
- M-5 angka ketik tangan: semua angka bertoken. Frasa "sekitar empat ratus ribu pengungsi serentak" di sub:gd-respons par. 1 dibiarkan (pembulatan dari token lantai, bukan angka baru); penulis bab dapat menggantinya dengan token bila diinginkan.
- M-6 sebab-akibat dari korelasi: OMC sudah diberi batas eksplisit ("belum membuktikan sebab-akibat").
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada; judul subbab deskriptif (L60).
- M-9 rekomendasi lengkap: tiap kartu rek memuat unit, waktu, indikator, dasar.
- M-10 kontras "X, bukan Y": sisa kontras berdasar definisi (stok vs kumulatif, besaran vs cara hitung, celah aturan vs kegagalan komando); satu tanpa dasar dibuang.
- M-11 register: formal ilmiah sepanjang bab.
- M-12 tebal sebagai penekanan: tebal hanya di kalimat pembuka temuan (L16) dan label studi kasus.
- M-13 kalimat bijak kosong: satu meta-komentar dibuang.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

## Tidak diubah

Angka, token `{{angka:...}}`, kutipan, rujukan silang, label keyakinan, isi tabel, dan makna. Label "terbukti" tidak diberikan kepada program dalam negeri mana pun; posisi bukti Destana, SPAB, InaTEWS, PAMSIMAS tetap seperti naskah.
