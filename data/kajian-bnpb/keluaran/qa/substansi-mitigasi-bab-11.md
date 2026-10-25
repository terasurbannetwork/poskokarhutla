# QA lapis (b) penyunting substansi: kajian mitigasi Bab 11

Berkas: `naskah/mitigasi/bab-11.md`. Pembanding: `naskah/mitigasi/bukti/bab-11.md`, `bab-11.angka.json`,
`bab-11.pustaka.json`, `data/angka.json`, `pustaka.json`, `data/program-terbukti/kompendium_program.csv`, KERANGKA §5 Bab 11,
blok `rek` di `bab-13.md`. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 238 pasangan token unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/*/bukti/bab-*.angka.json` (bab-11 menang) dan pustaka gabungan. Semua kunci ada; nilai dan label cocok dengan
  berkas bukti (T1.3 sampai T5.9, studi kasus). `baca()` atas bab utuh dengan `status: final` lulus sebelum dan sesudah suntingan.
- Hitungan turunan dicek ulang: beras, air minum, dan jamban per baris Tabel kebutuhan respons sama dengan rumus Perka BNPB 7/2008
  (0,4 kg; 2,5 l; 1 per 20); sel matriks 28 + 8 + 2 + 1 = 39; posisi program di matriks sama dengan kolom `posisi` kompendium.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | 11.7 paragraf lantai; teks r-m16 | "Ketiga lantai berada di kisaran 425.233 sampai 954.305": 425.233 adalah baris kepekaan Wilayah II tanpa Kota Bekasi, bukan lantai | Kisaran lantai 464.120 sampai 954.305; kepekaan Bekasi ditulis terpisah sebagai batas bawah 425.233 (bukti I5.1) |
| 2 | Ringkasan, temuan 3 | "Lantai ... tercatat" padahal lantai Wilayah III olahan rumah × 3,9 (asumsi kebijakan) | "dari catatan DIBI 2008–2025 ... (dari rumah rusak tercatat)" |
| 3 | 11.6 Kesiapan Kemarau 2027 | Luas karhutla 2015 dikutip dengan pustaka DIBI saja; kuncinya bersumber SiPongi | Ditambah [@kemenhut-sipongi]; sumber Tabel operasi musiman ditambah DIBI dan SiPongi |
| 4 | Tabel kebutuhan respons | Komponen KERANGKA dan bukti meminta baris pembanding pra-2008 dan model; hanya ada di prosa | Ditambah baris D Yogyakarta 2006 (resmi) dan baris M Mentawai M8,8 (estimasi-model), kebutuhan harian "–"; catatan dan sumber tabel diperluas; definisi baris kepekaan Wilayah I jadi "A, Aceh C" (bukti T5.8) |
| 5 | 11.2 paragraf 1.b | 4.148 per 100.000 tanpa penyebut | "dengan penyebut SUPAS 2025" (bukti T1.4) |
| 6 | 11.6 paragraf kemarau berjalan | Inferensi tim ditulis sebagai fakta ("BPBD yang sama ... beralih") | "Di provinsi berstatus Awas, BPBD yang sama ... harus beralih" |
| 7 | 11.9 Sumatra 2025 | "Kemenko PMK akan mengoordinasikan" dari siaran Maret 2026, ditulis sebagai rencana berjalan | "menyatakan akan mengoordinasikan" |

## Diperiksa dan tidak diubah

- Lantai skenario: musim hujan 2026/2027 memakai lantai 1.692 (musim 2025/2026); tiga musim pasca-El Niño hanya ekspektasi;
  Kesiapan Kemarau 2027 tidak di bawah 7.798.763 terdampak (2018) dan 2.611.411 ha (2015). Tidak ada angka di bawah lantai.
- Angka model selalu berlabel dan disandingkan angka tercatat: pita 400–950 jiwa lawan 1.692 (rasio sekitar 1,8 kali);
  Mentawai sekitar 490.000 lawan 464.120; Mw 9,1 diarahkan ke status nasional, bukan stok direktorat.
- Angka bertentangan berdampingan: DIBI Aceh 954.305 (jumlah per laporan) lawan Buletin 356.655 (stok); 1.043.740 semusim lawan
  981.483 puncak 30 hari; Renstra 67%, RPJMN 62%, KRB 38,0%; Phailin 44 lawan 38; Renas 1.c lawan IKP Renstra.
- "Terbukti": hanya untuk paket Bangladesh (P19) dan P16; Destana dan SPAB "belum terbukti" dengan definisi penelusuran;
  InaTEWS dan PAMSIMAS sedang; Odisha sedang, program dengan syarat. Sesuai kompendium.
- Kewenangan: status oleh Presiden, gubernur, bupati/wali kota; peringatan dini oleh K/L teknis; OMC di BMKG (Perpres 12/2024),
  BNPB penanggung jawab Renas 1.2.1.h; KLB oleh kepala daerah atau Menkes; BNPB bukan regulator keselamatan industri; SPAB di
  Kemendikdasmen dan Kemenag dengan BNPB kontributor.
- Pertanyaan kunci 1 sampai 5 terjawab di 11.2, 11.3, 11.4, 11.5 sampai 11.6, dan 11.7. Komponen KERANGKA ada: kerangka program,
  Tabel indikator, Gambar alur, Tabel alur, Tabel matriks, Gambar kalender pulau, Tabel operasi musiman, Tabel kalender Rencana Aksi
  (G23 tabel native), Tabel kebutuhan respons, Tabel agenda bukti, dua studi kasus.
- Blok `rek` r-a01, r-m16, r-a15 cocok dengan `bab-13.md` (status, unit, K/L, waktu); butir ringkasan r-a04, r-a18, r-m19 cocok.

## Sisa untuk orkestrator (di luar berkas ini)

1. `gambar/mitigasi/bab11-g21-alur-langkah.png` dan `bab11-g16-kalender-pulau.png` belum ada.
2. r-a18: `langkah` di `bab-11.md` "Terbitkan kalender kesiapan musiman per pulau", di `bab-13.md` "... berpemicu ENSO". Satu register,
   dua rumusan; perlu diselaraskan (isi bab-11 lebih dekat ke bukti I4.3).
3. Tsunami 2004 (635.384, @brr-2009-nias): berkas bukti mensyaratkan halaman Tabel 1.1 dicek langsung ke buku sebelum isi utama;
   pemeriksaan itu belum terjadi. Angka bukan lantai, tetapi cek halaman perlu ditutup sebelum terbit.
4. Rekomendasi KERANGKA untuk Direktorat Sistem PB (menautkan lantai ke rencana kontinjensi provinsi, bukti I5.3) tidak punya blok `rek`.
5. Kunci `bab-11.angka.json` belum digabung ke `data/angka.json`; `bukti.bangladesh_siklon.kematian_1970` (500.000) lawan
   `bukti.p19.kematian_1970` (500.300) masih ganda di registri.
