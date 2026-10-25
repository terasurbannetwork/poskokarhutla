# QA lapis (b) penyunting substansi: kajian mitigasi Bab 9

Berkas: `naskah/mitigasi/bab-09.md`. Pembanding: `naskah/mitigasi/bukti/bab-09.md`, `bab-09.angka.json`,
`bab-09.pustaka.json`, `data/angka.json`, teks Perban BNPB 5/2018 di `data/raw/hukum/teks`, KERANGKA §1 (M01, M08),
§2 prinsip 9 dan 10 (V09), §5 Bab 9, register rekomendasi di `bab-13.md`. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 84 pasangan token unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/*/bukti/bab-*.angka.json` (bab-09 menang) dan pustaka gabungan. Semua kunci ada, nilai cocok dengan tabel
  registri berkas bukti, label sah. `baca()` atas bab utuh dengan `status: final` lulus sebelum dan sesudah suntingan.
- Sepuluh jenis ancaman Perban BNPB 5/2018 Pasal 3 ayat (2) huruf a dan syarat kumulatif ayat (1) dicocokkan langsung ke
  teks korpus: benar (butir 10 menggabungkan wabah, epidemi, kegagalan teknologi, ledakan nuklir, kejadian antariksa).
- `qa/slop.py --final`: LOLOS, skor 1 (hanya S-30 rendah pada butir rekomendasi ringkasan). Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan, butir r-m03 | Daftar K/L tidak memuat Kementerian Sosial, padahal blok `rek` r-m03 di `bab-13.md` memuatnya | Ditambah Kementerian Sosial |
| 2 | 9.3 paragraf 3 | "dibantah sumber kepolisian" menyiratkan sumber primer; bukti PK3 T7: Polres via RRI, sekunder | "keterangan kepolisian setempat yang hanya terbaca dari pemberitaan" |
| 3 | Kartu 9.1 blok mandat | "(PP 2/2015 Pasal 21 dan Pasal 97)" menempelkan Pasal 97 (koordinasi Mendagri) ke tugas Mensos | Pasal dipisah per lembaga |
| 4 | Kartu 9.1 blok pemulihan | "dua jalur yang ditulis berdampingan" adalah meta-komentar | "kedua jalur belum diselaraskan" (bukti PK4 T10) |
| 5 | 9.3 paragraf kepekaan | Baris kepekaan tanpa analog terbesar (Poso) dapat terbaca sebagai lantai baru di bawah angka tercatat | Ditegaskan lantai kartu tetap Maluku; Poso hanya ukuran ketergantungan pada satu analog (prinsip 9, V09) |
| 6 | 9.4 paragraf Perban 5/2018 | "BNPB menyusun perubahan Perban 5/2018" ditulis sebagai fakta, tanpa bukti penyusunan berjalan | Ketiadaan di Progsun ditulis sebagai urutan waktu; perubahan hanya dapat lewat izin prakarsa (@rek:r-m02) |
| 7 | Temuan syarat fiskal, Bukti | Token `|satuan` terbaca "3 kab berkategori rendah" | "3 di antaranya berkategori rendah" |
| 8 | Temuan syarat fiskal, Dampak | "nyaris di mana saja" tanpa angka | Diganti angka: 24 provinsi dan 351 kab/kota lolos syarat fiskal |

## Diperiksa dan tidak diubah

- Lantai: Kartu 9.1 memakai Maluku 1999–2002 (sedikitnya 5.000 meninggal, hampir 700.000 pengungsi, terverifikasi) dan
  rujukan pengungsi serentak nasional lebih dari 1 juta (2001), sehingga tidak ada angka di bawah angka tercatat terburuk.
  Kemungkinan "tidak dinilai" dengan alasan; tanpa perkalian; sel luas dan kerugian "–" beralasan (celah 28).
- Tidak ada angka model; label terverifikasi dan resmi sesuai registri.
- Angka bertentangan berdampingan: Wamena 2019 DIBI 36 lawan Presiden 33, dengan kedua penggolongan; Wamena 2019 kasus
  batas, bukan analog lantai. DAK (UU 7/2012 Pasal 57) lawan dana transfer ke daerah (PP 2/2015 Pasal 91).
- "Terbukti": satu-satunya pemakaian menyatakan tidak ada program konflik yang disebut terbukti (P6).
- Kewenangan: status keadaan konflik pada kepala daerah atau Presiden, penghentian kekerasan pada Polri, koordinasi
  Mendagri, pengungsi Mensos; koreksi KERANGKA "pengungsi bersama Kemensos" ada di kotak koreksi (satu per bab).
- Pertanyaan kunci 1 sampai 4 terjawab; PK2 dijawab dengan jenis antarkelompok masyarakat, semua jenis sebagai konteks.
  Komponen KERANGKA ada: Gambar 9.1 (peta), Kartu 9.1, tabel batas mandat; tambahan Tabel jenis, Tabel syarat keadaan
  tertentu, kotak DIBI.

## Sisa untuk orkestrator (di luar berkas ini)

1. `bab-13.md` blok r-m03 berstatus `dikembangkan`, dan `bab-08.md` ringkasan menulis "Sudah ada, perlu dikembangkan";
   KERANGKA §1 M08 dan berkas bukti menetapkan Usulan baru (sama dengan `bab-09.md` dan `bab-12.md`). Register perlu
   diselaraskan.
2. `bab-13.md` r-m08: indikatornya hanya memuat baris nonalam; baris konflik sosial (celah 2020 sampai 2024, entri ganda
   Maluku Tengah, pembeda konflik dari unjuk rasa) serta permintaan Podes per kab/kota ke BPS dan status SNPK ke Kemenko PMK,
   yang dirujuk Bab 9 lewat r-m08, belum tertulis di sana.
3. Perpres 90/2025 (pembagian fungsi Polhukam) disebut di 9.4 tanpa entri pustaka; sumber bukti hanya `lembaga/celah.csv`
   C10. Perlu entri primer atau kalimatnya dirujuk ke Perpres 144/2024 saja.
4. Direktori `gambar/mitigasi/` belum ada: Gambar 9.1 (`bab09-peta-perkelahian-antarkelompok-2024.png`) belum dibuat.
5. Dari berkas bukti: `peristiwa.csv` kolom `lingkup` Wamena 2019 perlu diubah menjadi kasus batas; `data/angka.json`
   `sosial.kerusuhan2025.meninggal_komnas` berlabel resmi padahal sumbernya berita; kunci usulan `bab-09.angka.json` belum
   digabung ke registri utama.
