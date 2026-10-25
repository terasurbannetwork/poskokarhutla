# Lapis (c) penyunting bahasa: mitigasi bab 12 (Kelembagaan, Pembiayaan, dan Peta Jalan)

Berkas: `data/kajian-bnpb/naskah/mitigasi/bab-12.md`. Tanggal: 25 Oktober 2026.

## Vonis

- `qa/slop.py --final`: **LOLOS, skor 0** (4.991 kata, kata kosong 0,0 per 1.000), nol temuan di semua tingkat. Sebelum sunting LOLOS skor 1 (4.964 kata) dengan dua temuan: S-11 sedang ("Luar Biasa", baris 89) dan S-18 rendah (tiga-serangkai, baris 112). Dua temuan S-30 (kalimat lebih dari 45 kata) yang muncul akibat pengejaan singkatan di ringkasan bab juga sudah dibereskan.
- Keutuhan: 143 token `{{angka:...}}`, 84 kutipan `[@...]`, dan 67 rujukan silang (`@rek`, `@tbl`, `@gbr`, `@sub`) sama persis dengan versi sebelum sunting. Jumlah baris tetap 299. Tanpa em dash dan tanpa " · ". Satu-satunya tanda petik baru adalah istilah "kejadian luar biasa", bukan kutipan sumber.
- Simulasi T-9 di Markdown (singkatan glosarium dieja pada kemunculan pertama di prosa bab): nol kekurangan; sebelum sunting ada 12.

## Suntingan

| Jenis | Lokasi | Perubahan |
| --- | --- | --- |
| Singkatan dieja pada kemunculan pertama (L66, T-9) | ringkasan bab | TPA, BNPB, Renas PB, Kemenko PMK, R3P, Kemendagri, Kementerian PKP, Kemenkeu, dan Bappenas dieja di butir ringkasan, tempat semuanya pertama kali muncul |
| Ejaan ganda dibuang | §Matriks Mandat, §Usulan Penugasan, §Yang Berubah, §Profil Kerugian | kepanjangan BNPB, TPA, Kemendagri, Kemenko PMK, Kementerian PKP, R3P, dan Kemenkeu yang kini sudah dieja di ringkasan dihapus dari tubuh bab |
| Singkatan yang belum pernah dieja | §Forum, §Yang Berubah, §Profil Kerugian, §Instrumen Hukum | Renstra, Renja, IRBI, Progsun, CCRIF, dan ARC diberi kepanjangan |
| S-11 bahasa promosi (salah tangkap istilah) | §Usulan Penugasan | "Kejadian Luar Biasa (KLB)" menjadi status "kejadian luar biasa" (KLB), sama dengan bentuk di bab 8 |
| S-18 tiga-serangkai | §Yang Berubah | tafsiran target, alat ukur, dan lokus ditulis sebagai satu klausa tentang target beserta alat ukurnya, lalu klausa terpisah untuk daftar lokus; isi tafsirannya tetap |
| Pengulangan penghubung "karena itu" (tujuh kali di tengah kalimat) dan "sehingga" (17 kali) | seluruh bab | divariasikan menjadi "Karena itu," di awal kalimat, "Akibatnya,", "Oleh sebab itu,", "Dengan demikian,", "Artinya,", titik koma, atau kalimat dipecah; "karena itu" yang mubazir di paragraf bukti pembiayaan dihapus |
| S-30 kalimat panjang | ringkasan bab | butir temuan mandat dipecah dua; butir @rek:r-m17 dipadatkan ("sebagai dasar ... permohonan" menjadi "untuk"), cakupan Dana Bersama pascabencana tetap |
| Kalimat kabur | §Matriks Mandat | "Celah utamanya karena itu akuntabilitas" (kalimat tanpa predikat) menjadi "celah utama terletak pada akuntabilitas" |

## Yang diperiksa dan dibiarkan

- L16: semua paragraf temuan dibuka kalimat tebal yang memuat angka, pasal, atau jumlah. Paragraf klaster nasional dan paragraf Bank Dunia pendek, tetapi masing-masing satu gagasan.
- L60: judul subbab sudah deskriptif; tidak ada subbab templat (M-8).
- M-1: pasif yang tersisa ("ditulis berdampingan", "dipetakan penyusun") menyebut atau jelas pelakunya; pasif yang menyangkut lembaga menyebut lembaganya.
- M-10 "X, bukan Y": setiap kontras berlandaskan definisi atau data (stimulan bukan kerugian ekonomi, pengajuan pemda bukan hasil verifikasi, rasio pembanding bukan capaian, Pooling Fund Bencana bukan DSP BNPB).
- Label bukti: tidak ada program yang disebut terbukti; CCRIF dan ARC berbukti sedang, FEMA rujukan tata kelola tanpa angka tercatat Indonesia, rehabilitasi Lombok berbukti lemah, Delta Programme berbukti lemah.
- Kewenangan: peringatan dini per wilayah sungai tetap pada pengelola SDA (PP 30/2024 Pasal 96; UU 17/2019 Pasal 35); pengawasan keselamatan migas dan industri tetap pada kementerian sektor, BNPB tidak disebut regulator.
- Angka bertentangan (Yogyakarta 2006 PARB lawan Bappenas; DSP Perban 4/2020 lawan PP 22/2008) tetap ditulis berdampingan.
- "Kementerian PUPR" di §Forum didahului "nama lama", jadi lolos varian konteks glosarium. Singkatan di tabel dan metadata kartu (IKP, IKS, NSPK, Pusdatinkom) tidak termasuk prosa T-9 dan tidak diubah.

## Di luar lapis ini

- `bangun/kontrak/naskah.py` gagal membaca bab ini, baik versi sebelum maupun sesudah sunting, karena kunci `lembaga.peran.ancaman_tanpa_tertulis` tidak ada di `data/angka.json`. Ini masalah data angka yang sudah ada sebelum sunting, bukan masalah bahasa. Pemilik pipeline angka perlu memeriksanya sebelum DOCX dibangun.
- T-9 dan T-10 (`qa/periksa.py`) membaca DOCX; belum dijalankan karena DOCX bab ini belum dibangun ulang.
