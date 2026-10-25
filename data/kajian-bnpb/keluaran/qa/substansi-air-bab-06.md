# QA lapis (b) penyunting substansi: kajian air Bab 6

Berkas: `naskah/air/bab-06.md`. Pembanding: `naskah/air/bukti/bab-06.md`, `bab-06.angka.json`, `data/angka.json`,
`bab-01` sampai `bab-08.angka.json`, `data/program-terbukti/kompendium_program.csv`, KERANGKA §2 dan §4 (V05, D18),
Buku Pegangan L16 dan L60. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 255 pasangan token (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json`
  + `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai cocok dengan berkas bukti, label keyakinan sah (angka
  model berlabel estimasi-model, proyeksi penurunan muka tanah berlabel asumsi-kebijakan). `baca()` atas bab utuh lulus.
- Aritmetika dicek: 1.494 = 924 + 488 + 71 + 11 (86% dari 1.738); 193/270 = 71,5%; 179/237 = 75,5%; 10,7 × 4 = 42,8 cm;
  manfaat peringatan dini tanpa longsor 35% dan 9,7% konsisten dengan faktor 0,603; kemungkinan kelas 4 (5–25%) sesuai
  1 − (17/18)^5 ≈ 25%.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.
- Hanya 21 kunci yang dipakai ada di `data/angka.json`; sisanya baru ada di `naskah/air/bukti/bab-*.angka.json`. Bab ini
  gagal dibangun sampai registri digabung.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Subbab Korban per Bahaya, paragraf ukuran | Kalimat penutup meta ("ditulis berdampingan agar ...") | Diganti keputusan: Bab 8 memakai ketiga ukuran |
| 2 | Subbab Kejadian Besar, paragraf tabel | Kalimat pembuka tebal tanpa angka (L16) | Pembuka memuat 433.628 (DIBI) lawan 11.569 (Renstra); kalimat ulang di tengah diganti sebab selisih, rekaman Kota Bekasi 366.274 berstatus tidak terbukti |
| 3 | Subbab Rob, tuas P16 | "Polder dan pompa berposisi belum terbukti" mencampur kolom `kekuatan` dan `posisi` (P15: kekuatan belum-terbukti, posisi program berjalan wajib evaluasi dampak) | Ditulis terpisah sesuai kompendium |
| 4 | R-A13 | Kesalahan yang sama | "kekuatan bukti polder serta pompa ... adalah belum terbukti" |
| 5 | Subbab Rob, paragraf ruas Pekalongan sampai Demak | Garis bukti ketiga (luas genangan rob simulasi WS Jratunseluna) tidak mencakup Pekalongan (WS Pemali-Comal; dokumennya tidak ditemukan); "resmi" tanpa tanda simulasi | Ditambah batas cakupan dan "simulasi resmi"; kalimat Jakarta tanpa angka atau keputusan dibuang (angka laju Jakarta tetap di paragraf proyeksi) |
| 6 | Subbab Siapa Mengerjakan Apa | "Teks Permen PU 2/2024 itu ditetapkan Menteri" keliru: yang ditetapkan Menteri adalah Tim Koordinasi PSDA WS (bukti P4 butir 12) | Diperbaiki |
| 7 | Subbab Kepekaan, paragraf longsor tidak dihitung | Rujukan internal "paket skenario ... padahal kerangka kajian meminta" | Ditulis sebagai versi pembanding dengan alasan teknis (koefisien lintas negara tidak berlaku untuk bahaya berwaktu tunggu pendek) |
| 8 | R-A08 | Batas bawah memakai pita 2019/2020 (200) padahal kartu memakai pita La Niña (250–550) | Diganti `hidromet.jawa.lanina.korban_jiwa|rendah` (250) agar sama dengan kartu |

## Diperiksa dan tidak diubah

- Lantai skenario: kartu agregat, R-A04, R-A08, tabel analog El Niño tidak memakai skenario di bawah lantai per metrik
  (270 meninggal dan hilang; 525.861 mengungsi dengan 532.321 berdampingan; 6.905 rumah rusak berat). Pita model La Niña
  dan 2019/2020 tampil berlabel estimasi model, belum diuji balik, di samping angka tercatat (156 dan 127), batas bawah
  dinaikkan ke lantai. Kepekaan tanpa baris 27 Maret 2009 (237) adalah tuas, bukan lantai baru.
- "Terbukti": hanya P16 (luar negeri) disebut berbukti kuat, dengan batas "di dalam rubrik kompendium, bukan evaluasi
  kausal" dan syarat Tokyo; Bangkok tidak dipakai karena kutipan tidak langsung.
- Angka bertentangan berdampingan: Jabodetabek 2020 empat versi; Pekalongan 42,8 cm (GNSS) dan 40–76 cm (kutipan latar);
  abstrak Susilo dkk. lawan Tabel 2; Badan Geologi 2018 di samping InSAR.
- Kewenangan: UU 17/2019 Pasal 35 ayat (2), (5), (6); RTD menurut PP 37/2010 Pasal 52–57; gerakan tanah pada Badan
  Geologi (UU 23/2014 Lampiran CC); BNPB tidak ditulis sebagai regulator bendungan atau air.
- Situ Gintung ditulis sebagai kecocokan tanggal, bukan sebab (DIBI mencatat banjir Kab. Tangerang). Tanggul Demak 2024
  tidak dimuat karena hanya ada di media.
- Pertanyaan kunci frontmatter terjawab: longsor bahaya paling mematikan (53,2%) dengan 18 kab/kota berulang; musim
  terburuk 2008/2009 (270); 2026/2027 tidak lebih mematikan menurut tiga analog, lantai tetap berlaku, rencana aksi tidak
  ditutup 30 April; penurunan muka tanah, RTD bendungan, dan kepekaan peringatan dini dibahas dengan angka.
- Komponen bukti hadir: Tabel 6.1, Gambar 6.1 sampai 6.6, tabel daftar perhatian (dipecah banjir dan longsor), tabel
  kejadian besar, tabel siapa mengerjakan apa, kartu agregat, analog El Niño, bahan pesisir, matriks enam rekomendasi.

## Sisa untuk orkestrator (di luar berkas ini)

1. Kartu per jenis (longsor; banjir dan banjir bandang; cuaca ekstrem; gelombang, abrasi, dan rob) yang diwajibkan
   KERANGKA V05 belum ada; naskah menulisnya terus terang di kotak catatan. Menunggu turunan
   `skenario-hidromet/lantai_jenis.csv`; tanpa itu bab belum memenuhi V05 dan matriks kemungkinan × dampak per jenis.
2. Gabungkan `naskah/air/bukti/bab-*.angka.json` dan `bab-*.pustaka.json` ke registri sebelum bangun DOCX.
3. Catatan gambar memuat angka ketik (lantai 270; 23, 58, 1 kab/kota tidak dinilai). Nilainya cocok dengan registri,
   tetapi tidak ikut berubah bila data diperbarui.
4. Gambar 6.7 (kalender bulanan) usulan opsional di bukti, tidak dibuat; porsi 19,8% Mei–September sudah ada di teks.
