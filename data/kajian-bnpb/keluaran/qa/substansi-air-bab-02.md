# QA lapis (b) penyunting substansi: kajian air Bab 2

Berkas: `naskah/air/bab-02.md`. Pembanding: `naskah/air/bukti/bab-02.md`, `bab-02.angka.json`, `bab-01.angka.json`,
`data/angka.json`, `bab-02.pustaka.json`, `data/program-terbukti/kompendium_program.csv`, `naskah/air/bab-10.md` (blok rek),
KERANGKA §2, §4, PEDOMAN §B5.30, Buku Pegangan L16, L60, L61. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 98 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai tampil cocok dengan berkas bukti §7, label keyakinan sah.
  `baca()` atas bab utuh lulus tanpa galat setelah suntingan; 37 pustaka dikutip, tidak satu pun sekunder.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 3; subbab 2.6 paragraf program dalam negeri | "Praktik dalam negeri belum memiliki evaluasi dampak berpembanding" dan "tidak satu pun ... disebut terbukti, karena belum ada evaluasi" mengabaikan PAMSIMAS yang berbukti sedang (T4.1, T4.6) | Ditulis: tidak ada program dalam negeri berbukti kuat; PAMSIMAS berbukti sedang; program lain belum dievaluasi berpembanding |
| 2 | 2.3 paragraf paparan kekeringan | Kalimat pembuka tebal memakai 99,97% sehingga artefak definisi terbaca sebagai temuan; T1.4 membatasi angka itu untuk menjelaskan artefak | Kalimat tebal diganti ukuran pembeda (luas bahaya kelas tinggi 2,9 juta ha, 22,1%); 99,97% pindah ke badan paragraf sebagai penjelasan artefak |
| 3 | 2.3 paragraf yang sama | "korban meninggal ... sebanyak 0 jiwa" | "tanpa korban meninggal akibat kekeringan sepanjang 2015–2026" |
| 4 | 2.3 paragraf IRBI | "Pada periode yang sama DIBI mencatat 1.738": IRBI 2015–2024, DIBI 2015–2026, jadi periodenya tidak sama | "Sepanjang 2015–2026 DIBI mencatat ..." |
| 5 | 2.3 paragraf IRBI | "Korelasi antarkeduanya" padahal tidak ada korelasi yang disajikan | "Kedua deret dibaca berdampingan, dan hubungan keduanya tidak dibaca sebagai sebab" |
| 6 | 2.3 paragraf IRBI | "berdiri sendiri" disimpulkan dari jumlah kab berstatus Tinggi (logika keliru); kesimpulan skala berubah berlabel asumsi-kebijakan (T1.10) tetapi ditulis sebagai fakta | Disebut "menurut analisis penyusun"; berdiri sendiri karena skala berbeda, jumlah status Tinggi dipisah |
| 7 | 2.3 paragraf Buku RBI | Singkatan NAR tidak diperkenalkan | "National Assessment Report (NAR) 2023" |
| 8 | 2.4 pengantar tiga titik | "Ketiganya ditindaklanjuti di register rekomendasi Bab 10": titik ketiga (penerbit persetujuan air tanah) tidak punya rekomendasi di Bab 10 | Dua titik ke register; titik ketiga dirujuk ke @sub:kewenangan (Bab 7) |
| 9 | 2.5 paragraf Pola PSDA | Tidak menyebut bahwa Pola/RPSDA belum diperoleh (T3.1, C3.1) dan daftar PSN bendungan tidak ditemukan (T3.6, C3.2); PK3 menuntut keduanya | Ditambah di kalimat tebal (10 WS kewenangan pusat) dan satu kalimat PSN bendungan |
| 10 | 2.6 paragraf Tokyo | Laju Aditiya dan Ito ditulis "laju 10–12 cm per tahun" padahal sumbernya laju maksimum (T4.5 b) | "laju maksimum" |
| 11 | Tabel 2.3 baris FEMA | Kolom keyakinan "estimasi-model"; bukti T4.12 memberi FEMA terverifikasi | "terverifikasi" |

## Diperiksa dan tidak diubah

- Lantai skenario: bab ini tidak memuat angka skenario; paragraf "enam hal" menyatakan skenario berlantai kejadian tercatat
  terburuk (KERANGKA §2 butir 9).
- "Terbukti": hanya P16 berbukti kuat, ditulis bertumpu pada Tokyo; Bangkok dikeluarkan (T4.3). Korea dan tanggul
  Pekalongan tidak ada di naskah final (C4.1, C4.2). Murray-Darling dipersempit ke komponen pasar dan pembelian kembali.
- Angka model dan tercatat: proyeksi per kapita, air permukaan, dan IPA berlabel model dengan pernyataan tidak ada
  pembanding ukur; EIRR PAMSIMAS disandingkan dengan temuan lapangan DFAT; 35 cm Room for the River disandingkan dengan
  pembanding kualitatif ENW; platform kekeringan disebut gagal uji balik.
- Angka bertentangan ditulis berdampingan: ONI NOAA lawan indeks ENSO BMKG; porsi air Jawa BPS 6,3% lawan Bank Dunia 5,9%;
  tiga EIRR; KRB 271,1 juta lawan Buku RBI 258,1 juta; tiga gambaran DKI Jakarta.
- Kewenangan: UU 17/2019 Pasal 35 ayat (1), (2), (5), (6) dikutip benar; BNPB sebagai kontributor (bukan penanggung jawab)
  Renas 2.4.4.a dengan KLH penanggung jawab (T2.9); tidak ada klaim BNPB regulator air; penerbit persetujuan air tanah
  ditulis belum dapat dipastikan.
- Rekomendasi ringkasan bab (r-a12, r-a06, r-a22) cocok dengan unit, mitra K/L, status, dan horizon di blok rek Bab 10.
- Pertanyaan kunci KERANGKA §4 Bab 2 (PK1 sampai PK4) terjawab di 2.3, 2.4, 2.5, 2.6. Komponen: Tabel 2.1
  (`tbl:kajian-bnpb`), Tabel 2.2 (`tbl:regulasi`), Gambar 2.1 (`gbr:oni`), Tabel 2.3 (`tbl:praktik`, 12 baris sesuai
  sebaran 1/3/5/3), studi kasus Tokyo dengan empat label B5.30, Gambar 2.2 (`gbr:tokyo`). Kartu angka sengaja tidak ada (§6
  berkas bukti).
- Ejaan "kontinjensi" dipertahankan karena seragam dengan bab lain.

## Sisa untuk orkestrator (di luar berkas ini)

1. `bps-2020-slhi` berstatus `verifikasi: sekunder` di `bab-01.pustaka.json` tetapi `primer` di `bab-02` dan
   `bab-03.pustaka.json`. Bila registri digabung dengan urutan bab-01 lebih dulu, `baca()` Bab 2 gagal di baris 40
   (pustaka sekunder di naskah final). Pemilik pustaka harus memilih satu status sebelum bangun DOCX.
2. Registri belum digabung: kunci Bab 2 hanya ada di `naskah/air/bukti/bab-02.angka.json` dan `bab-01.angka.json`;
   `pustaka.json` gabungan juga masih memuat entri penulis tanpa `family` (galat `KeyError: 'family'`, sama dengan catatan QA
   Bab 10).
3. Bab 10 baris 283 menulis "Pengendalian serupa di Tokyo, Osaka, dan Bangkok adalah satu-satunya program berbukti kuat";
   berkas bukti Bab 2 (T4.3, C4.3, C4.7) menyatakan kekuatan itu bertumpu pada Tokyo, Bangkok sekunder, Osaka tidak dikutip.
4. C4.7 dan C4.8 berkas bukti: `bukti_dampak.csv` B101, `renas_aksi_terkait.csv` 2.4.4.a, dan `kompendium_program.csv` P16
   masih memuat kekeliruan yang dicatat; tinjauan kekuatan "kuat" P16 tanpa Bangkok menunggu pemilik paket.
