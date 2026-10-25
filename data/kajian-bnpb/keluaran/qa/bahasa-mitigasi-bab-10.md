# Lapis (c) penyunting bahasa: mitigasi bab 10 (Analisis Kesenjangan Sistem Penanggulangan Bencana)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-10.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (5.182 kata), nol temuan. Namun 23 singkatan glosarium muncul pertama kali di prosa bab tanpa kepanjangan (emulasi gerbang T-9 pada naskah: tabel, metadata direktif, dan judul dikecualikan, sama seperti `periksa.py` membaca DOCX).
- Sunting antara: dua temuan baru akibat ejaan lengkap, S-30 (r-m12, 47 kata) dan S-18 ("sarana dan prasarana" di 10.2 paragraf Basarnas). Keduanya diperbaiki.
- Sesudah sunting: LOLOS, skor 0 (5.312 kata), nol temuan dalam bentuk apa pun, kata kosong 0,0 per 1.000. Emulasi T-9: nol singkatan tanpa kepanjangan.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-10.md`.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, temuan 2 | Renstra BNPB; Renas PB | Rencana Strategis (Renstra) Badan Nasional Penanggulangan Bencana (BNPB); Rencana Nasional Penanggulangan Bencana (Renas PB) | T-9, kemunculan pertama di bab |
| Ringkasan, r-m06 | Kemenko PMK | Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan (Kemenko PMK) | T-9 |
| Ringkasan, r-m12 | BMKG, Kementerian PU, dan Kementerian ESDM | Badan Meteorologi, Klimatologi, dan Geofisika (BMKG), Kementerian Pekerjaan Umum, dan Kementerian Energi dan Sumber Daya Mineral | T-9; singkatan PU dan ESDM tidak diberi kurung agar kalimat tetap 45 kata (S-30); bentuk "Kementerian PU" di badan bab tetap terbaca karena kepanjangannya sudah muncul |
| Ringkasan, r-m13 | Kemendagri untuk SPM | Kementerian Dalam Negeri (Kemendagri) untuk SPM | T-9 |
| 10.1, paragraf Perpres 46/2026 | penetapan KLB | penetapan status "kejadian luar biasa" (KLB) | T-9; petik istilah mengikuti bab 8 (S-11 menandai "luar biasa" tanpa petik) |
| 10.1, paragraf Inpres 3/2020 | Kepala LAPAN, Kepala BPPT; dilebur ke BRIN | nama lengkap LAPAN, BPPT, dan Badan Riset dan Inovasi Nasional (BRIN) | T-9 (BRIN); LAPAN dan BPPT belum di glosarium, dieja untuk T-10 |
| 10.1, paragraf peringatan dini | Tata Kerja BPBD | Tata Kerja Badan Penanggulangan Bencana Daerah (BPBD) | T-9 |
| 10.2, paragraf Perban 11/2025 | sistem komando dalam Perka BNPB 3/2016 | Sistem Komando Penanganan Darurat Bencana dalam Perka BNPB 3/2016 | T-9 untuk SKPDB: kutipan Renas memakai "Kedaruratan", tidak cocok dengan glosarium, dan kutipan tidak boleh diubah; kepanjangan glosarium ditaruh pada judul Perka 3/2016 |
| 10.2, paragraf kelemahan komando | Indeks JDIH lokal | Indeks Jaringan Dokumentasi dan Informasi Hukum (JDIH) lokal | T-9 |
| 10.2, paragraf tiga Kemenko | kesiapan sarana pencarian dan pertolongan Basarnas; Kemenko IPK | kesiapan sarana Badan Nasional Pencarian dan Pertolongan (Basarnas); Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan (Kemenko IPK) | T-9; "pencarian dan pertolongan" tidak diulang dua kali |
| Kartu temuan 10.2, Pembuka | Kemendikdasmen | Kementerian Pendidikan Dasar dan Menengah (Kemendikdasmen) | T-9 |
| 10.3, paragraf IKP | RPJMN KP 08.04.02 | Rencana Pembangunan Jangka Menengah Nasional (RPJMN) KP 08.04.02 | T-9 |
| 10.3, paragraf DIBI | Terminal BBM Plumpang; kebakaran TPA | Terminal Bahan Bakar Minyak (BBM) Plumpang; kebakaran tempat pemrosesan akhir (TPA) | T-9 (TPA); BBM dieja seperti bab 8 |
| 10.3, paragraf Perban 1/2023 | KLH untuk TPA | Kementerian Lingkungan Hidup (KLH) untuk TPA | singkatan belum dieja |
| 10.4, paragraf PDB | kehilangan PDB | kehilangan produk domestik bruto (PDB) | singkatan belum dieja |
| 10.4, paragraf PDB | SDM ...; penyusun R3P; akuntabilitas BTT | sumber daya manusia (SDM); Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P); belanja tidak terduga (BTT) | T-9 (R3P, BTT di prosa; BTT di tabel tidak dihitung) |
| 10.4, paragraf instrumen daerah | RKPD | rencana kerja pemerintah daerah (RKPD) | singkatan belum dieja |
| 10.6, paragraf pertama | penggunaan DSP | penggunaan dana siap pakai (DSP) | T-9 |
| 10.8, paragraf pertama | InaTEWS ..., dan PAMSIMAS | *Indonesia Tsunami Early Warning System* (InaTEWS) ..., serta Penyediaan Air Minum dan Sanitasi Berbasis Masyarakat (PAMSIMAS) | T-9; "serta" memisahkan dua pasangan agar tidak ada "dan" ganda |
| 10.8, paragraf InaTEWS | posisinya program berjalan | posisinya adalah program berjalan | predikat eksplisit |
| Kartu temuan 10.8, Pembuka | KLH/BPLH | Kementerian Lingkungan Hidup/Badan Pengendalian Lingkungan Hidup (KLH/BPLH) | T-9 |

Token `{{angka:...}}`, rujukan pustaka, rujukan silang `@rek/@tbl/@gbr/@sub`, jangkar `{#...}`, dan kutipan langsung tidak berubah (dicek mesin: himpunan sebelum dan sesudah sama). Satu-satunya petik baru adalah istilah "kejadian luar biasa". Makna tidak diubah. Tabel dan metadata direktif tidak disentuh.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; pencatat (BPK, MK, Renstra, Renas, Kemendagri) dan penetap (Kepala BNPB, kepala daerah, Presiden) tersebut.
- M-2 sinonim berputar: istilah konsisten (lantai tercatat, keadaan tertentu, penduduk tercakup, program berbukti kuat/sedang/lemah).
- M-3 kalimat pertama mengulang judul: tidak ada; tiap subbab dibuka temuan berangka atau berperaturan.
- M-4 keberatan fiktif: tidak ada. Bantahan tertulis (PAMSIMAS, argumen tandingan tabel dipertahankan) bersumber.
- M-5 angka ketik tangan: angka data bertoken; "dua belas", "tiga belas", "delapan", "tiga keadaan", "empat kelemahan" adalah hitungan teks dari sumber atau struktur tabel, bukan angka data kajian.
- M-6 sebab dari korelasi: Aceh dan Sumatera Barat ditulis sebagai urutan waktu tanpa sebab-akibat; selisih cakupan peringatan dini dinilai selisih definisi dengan label penilaian.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada; "Yang Sudah Berjalan dan Tidak Boleh Dikorbankan" berisi instrumen dan argumen tandingan, bukan prospek.
- M-9 rekomendasi: kelima rekomendasi ringkasan berstatus, berlembaga, dan bertenggat.
- M-10 kontras "X, bukan Y": berlandas ("selisih waktu, bukan kelalaian" dari urutan tanggal terbit; "contoh, bukan daftar lengkap" dari IHPS).
- M-11 register: formal ilmiah sepanjang bab.
- M-12 tebal sebagai penekanan: tebal hanya pada kalimat pembuka temuan (L16) dan label ringkasan dan kartu.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

## Catatan untuk sesi induk

- `bangun/kontrak/naskah.py` menolak bab ini dengan `kunci angka "mk.putusan261_2025.indikator_minimal" tidak ada di data/angka.json` (baris 15). Galat yang sama muncul pada salinan sebelum sunting; token tidak disentuh. Kuncinya perlu ditambahkan pemilik paket angka.
- LAPAN, BPPT, KLH, SDM, PDB, RKPD, BBM, INALOGPAL, InaRISK, Kemenko IPK, Pusdalops, Progsun, dan Jitupasna belum terdaftar (atau tidak berentri lepas) di `data/glosarium.json`. Yang dipakai dieja di bab ini; INALOGPAL dan InaRISK nama sistem tanpa kepanjangan di sumber dan dibiarkan. Glosarium di luar cakupan lapis ini.
- SKPDB: glosarium memakai "Penanganan Darurat", kutipan Renas memakai "Penanganan Kedaruratan". Bila nama resmi di Renas yang benar, tambahkan `kepanjangan_lain` di glosarium.
