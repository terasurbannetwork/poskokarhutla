# Penyuntingan bahasa: kajian mitigasi, Bab 5

Berkas: `naskah/mitigasi/bab-05.md` (Profil Risiko Nasional)
Lapis: (c) penyunting bahasa, 25 Okt 2026

## Hasil detektor

| Pemindaian | Sebelum | Sesudah |
| --- | --- | --- |
| `qa/slop.py --final` | LOLOS, skor 0, 9 temuan S-18 (rendah) | LOLOS, skor 0, nol temuan |
| `qa/slop.py --ambang` (gerbang T-8) | 9 pelanggaran, vonis GAGAL BERAT | 0 pelanggaran, vonis LULUS |

Token `{{angka:...}}` (387) dan rujukan `[@...]` (68) identik dengan versi sebelum suntingan
(diperiksa dengan diff berbasis regex); kutipan dalam petik (16) tidak berubah. Rujukan silang
bertambah satu (`@tbl:kelas-dampak`, suntingan no. 13). Tidak ada angka, kutipan, atau makna yang
diubah. Tanpa em dash dan tanpa " · ".

## Suntingan

| No | Lokasi | Masalah | Suntingan |
| --- | --- | --- | --- |
| 1 | baris 34 | Renstra tanpa kepanjangan pada kemunculan pertama di prosa | `Rencana Strategis (Renstra) BNPB 2025–2029` |
| 2 | baris 57, kalimat pembuka tebal | S-18 (deret "Jawa, sedangkan korban meninggal dan hilang"); subjek kalimat pembuka tidak jelas | "Jawa mencatat penurunan IRB terbesar, tetapi rerata korbannya pada 2020–2024, ... jiwa meninggal dan hilang per tahun, tidak lebih rendah daripada ..." |
| 3 | baris 65, kotak temuan | Renas PB tanpa kepanjangan pada kemunculan pertama | `Rencana Nasional Penanggulangan Bencana (Renas PB)` |
| 4 | baris 117 | S-18; dua klausa berpola sejajar dipisah titik koma | dipecah: "Sumatra memuat kab/kota Tinggi terbanyak menurut jumlah. Menurut porsi, yang tertinggi adalah Maluku dan Papua." |
| 5 | baris 218 | RPJMN tanpa kepanjangan pada kemunculan pertama di prosa | `Rencana Pembangunan Jangka Menengah Nasional (RPJMN) 2025–2029` |
| 6 | baris 226 | S-18 ("dan lima provinsi di Pulau Papua") | "dan Pulau Papua di luar Provinsi Papua (lima provinsi)" |
| 7 | baris 273 | S-18 (deret tiga bahaya) | "Gempa bumi dan kekeringan memapar praktis seluruh penduduk, begitu pula kategori COVID-19 dan epidemi, karena angka ketiganya ..." |
| 8 | baris 302 | S-18; dua "dan" beruntun menyambung daftar lima aspek dengan klausa lampiran | dipecah menjadi dua kalimat ("... dan layanan sipil. Lampirannya menyebut ...") |
| 9 | baris 306 | S-18 ("gabungan gempa, tsunami, dan likuefaksi"); satu kalimat memuat dua kejadian | "angka gabungan gempa bumi beserta tsunami dan likuefaksi yang menyertainya." Yogyakarta 2006 menjadi kalimat sendiri |
| 10 | baris 308 | S-18; deret lima jenis mengulang daftar paragraf sebelumnya | "kelima jenis berfatalitas kelas lima berada di kelas yang sama" |
| 11 | baris 308 | WHO tanpa kepanjangan | `World Health Organization (WHO)` |
| 12 | tabel kelas dampak | TPA tanpa kepanjangan | `Kebakaran tempat pemrosesan akhir (TPA)` |
| 13 | baris 339, kalimat pembuka tebal | S-18 (deret empat jenis); frasa "dinilai, kemungkinan tidak dinilai" janggal | "Dua belas jenis masuk panel yang dampaknya dinilai tetapi kemungkinannya tidak, termasuk empat jenis yang pada @tbl:kelas-dampak hanya punya peluang fase iklim." Nama keempat jenis tetap terbaca di tabel |
| 14 | baris 339 | "ber-ONI" bukan bentuk baku; ONI tanpa kepanjangan | `bernilai *Oceanic Niño Index* (ONI)` |
| 15 | baris 339 | S-18 ("El Niño kuat, korban terbesar karhutla dan kekeringan") | "Korban terbesar karhutla dan kekeringan masing-masing hanya terjadi pada satu dari tiga musim El Niño kuat." |

## Singkatan (glosarium `data/glosarium.json`)

Dieja pada kemunculan pertama di bab: IRBI, DIBI, IRB, LKIP, IKD, KRB, Bappenas (ringkasan);
Renstra, Renas PB, BPS, Kemenko PMK, RPJMN, IKU, NRR, BRR, WHO, PuSGeN, TPA, ONI (prosa atau
tabel). Perka, Perban, dan Kepka berbentuk rujukan peraturan (glosarium: `periksa: false`). "DI"
hanya muncul sebagai DI Yogyakarta. Tidak ada istilah terlarang glosarium (temuan "anda" adalah
potongan kata "penanda").

## Daftar periksa M-1 sampai M-14

| Kode | Hasil |
| --- | --- |
| M-1 | Pasif dipakai untuk pelaku yang tidak relevan ("ditulis berdampingan", "tidak dikutip"); pelaku diketahui disebut (Renstra, LKIP, Kemenko PMK, penyusun). Lolos |
| M-2 | Istilah konsisten: "meninggal dan hilang", "daftar perhatian", "status" (IRBI 2025) dan "kelas" (IRBI 2023, KRB) dipakai sesuai sumbernya. Lolos |
| M-3 | Tidak ada kalimat pertama yang hanya mengulang judul subbab; tiap pembuka subbab berangka. Lolos |
| M-4 | Tidak ada alternatif palsu; dua pilihan penyebut kapasitas di kotak keputusan adalah pilihan nyata dengan angka masing-masing. Lolos |
| M-5 | Semua angka data berupa token. Angka yang diketik (tahun, nomor pasal, "dua belas", "lima provinsi", "empat jenis") adalah rujukan atau hitungan yang terlihat di tabel. Lolos |
| M-6 | Klaim sebab dijaga: pola satu pengali "mendukung, tetapi tidak membuktikan" peran kapasitas; korelasi IRBI-DIBI dijelaskan dengan penduduk; sebab ketiga ditandai penilaian penyusun. Lolos |
| M-7 | Paragraf Sulawesi Tengah dan Yogyakarta (baris 306) dipecah kalimatnya (no. 9); paragraf lain satu gagasan. Lolos |
| M-8 | Tidak ada subbab templat. Lolos |
| M-9 | Tiga rekomendasi di ringkasan menyebut status, unit, mitra, dan tenggat. Lolos |
| M-10 | Kontras "X, bukan Y" dilandasi data atau definisi ("menjelaskan, bukan membantah" disertai korelasi penduduk; "posisi, bukan peringkat" disertai alasan dasar kemungkinan berbeda). Lolos |
| M-11 | Register formal sepanjang bab; tanpa sapaan. Lolos |
| M-12 | Tebal hanya di kalimat pembuka temuan dan label ringkasan/temuan. Lolos |
| M-13 | Tidak ada aforisme; kalimat pendek ("Dua sebab bersumber data.") berfungsi sebagai pengantar daftar sebab. Lolos |
| M-14 | Isi spesifik BNPB (IRBI, DIBI, KRB, Manual IKU, LKIP 2025). Lolos |

## Kepatuhan pelajaran wajib (dicek, tidak diubah)

- Tidak ada program yang disebut terbukti; capaian IRB dinyatakan "bukan bukti penurunan korban".
- Lantai skenario: "skenario terburuk tetap memakai lantai kejadian tercatat, bukan status IRB saja"; titik megathrust memakai lantai Pangandaran 2006.
- Angka model (WHO, Koplitz dkk., guncangan analog magnitudo maksimum) disandingkan angka tercatat dan berlabel estimasi-model; tidak menentukan kelas.
- Angka bertentangan ditulis berdampingan: BRR Aceh 2004 (naratif dan infografik), IRB 2024 seri Renstra dan hitungan ulang LKIP, provinsi terendah Renas PB dan Renstra, kapasitas daerah menurut alat ukur dan unit.
- Kalimat pembuka tebal berangka (L16) ada di semua paragraf temuan; judul subbab deskriptif (L60).

## Catatan di luar lingkup penyunting

`bangun/kontrak/naskah.py` dari CLI gagal pada kunci `irbi.kab.tinggi.2025` yang tidak ada di
`data/angka.json`. Versi sebelum suntingan gagal di kunci yang sama, jadi galat itu bukan akibat
suntingan ini; registri angka kajian mitigasi perlu dicek pemilik pipeline bangun.
