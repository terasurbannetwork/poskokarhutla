# Pemeriksaan substansi rehab bab-01 (25 Okt 2026)

Berkas: `data/kajian-bnpb/naskah/rehab/bab-01.md`. Dibandingkan dengan `bukti/bab-01.md`, `bukti/bab-01.angka.json`, `data/kajian-bnpb/data/angka.json`, dan KERANGKA rehab bab 1.

## Lolos
- Semua token angka (49 kunci) ada: 39 di `bab-01.angka.json`, 10 kunci lama di `data/angka.json`. Nilai dan label sesuai bukti, semua berlabel resmi, tidak ada angka media di badan teks.
- Jumlah Tabel 1.1 (3.419 + 246 + 52 + 51 + 37 + 28 + 0) sama dengan 3.833.
- Pertanyaan kunci 1, 2, 3 terjawab. Komponen Gambar 1.1, Kotak 1.1, Tabel 1.1, dan Kotak 1.2 ada.
- Tidak ada klaim "terbukti", tidak ada skenario (tidak ada lantai yang dilanggar), tidak ada em dash atau " · ".
- Angka bertentangan ditulis berdampingan dengan cakupan: jembatan (744, 1.181, 14), SPAM (176 dan 178), rumah (DIBI dan DPR). Pola nasional lawan daerah dibatasi pada jalan dan jembatan, dan diberi label analisis kajian.
- Kewenangan mengikuti pasal (UU 24/2007, PP 21/2008, Perban); BNPB ditulis sebagai koordinator, bukan regulator air. UU 17/2019 Pasal 35 tidak relevan di bab ini dan tidak ditambahkan.

## Disunting
1. PP 21/2008: Pasal 57 ayat (1) diperbaiki. Ayat itu mengatur rehabilitasi (Pemerintah dan/atau pemda), bukan rekonstruksi. Rekonstruksi dipisah ke Pasal 76 ayat (1).
2. Rekomendasi r-rr-15 tercantum di ringkasan bab tetapi tidak didukung isi bab. Ditambahkan tiga ketidakselarasan yang bersumber di bukti P2 butir 15 dan butir 8 (Pasal 9 ayat (1) Perban 6/2017, katalog JDIH Perka 17/2010, nomenklatur Perka 12/2010).
3. "R3P berjalan sampai sekitar akhir 2028" tidak ditopang: Perban 5/2017 tidak mengatur kapan masa R3P mulai berlaku (bukti, Celah P3). Diubah menjadi "sekitar 2028 atau awal 2029" disertai catatan bahwa tanggal penetapan R3P belum diketahui.

## Perlu tindak lanjut (di luar bab ini)
- Berkas gambar `gambar/rehab/bab01-jembatan-rusak-tahunan.png` belum ada (folder `data/kajian-bnpb/gambar/` baru berisi air, foto, mitigasi). Pembangun akan gagal atau memuat gambar kosong sampai gambar dibuat.
- Pasal PP 21/2008 dikutip dari pembacaan riset A atas PDF JDIH BPK, tidak ada di korpus lokal. Cek ulang string pasal sebelum terbit.
- Perban 4/2020 hanya berupa teks OCR; cek ke PDF resmi untuk kutipan definisi status.
- Tafsir Perban 4/2024 Pasal 5 huruf b dan e sudah ditulis sebagai tafsir belum dikonfirmasi; konfirmasi ke Biro Hukum, Organisasi, dan Kerja Sama tetap diperlukan.
- Berkas `bab-01.angka.json` belum digabung ke `data/angka.json` (catatan berkas itu sendiri); pembaca yang hanya membaca registri utama akan menemukan 39 kunci hilang.
