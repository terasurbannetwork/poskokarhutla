# QA lapis (b) penyunting substansi: kajian air Bab 4

Berkas: `naskah/air/bab-04.md`. Pembanding: `naskah/air/bukti/bab-04.md`, `bab-04.angka.json`, `bab-04.pustaka.json`,
`data/angka.json`, teks UU 17/2019 (`data/lembaga/mentah/teks/uu-17-2019.json.gz`), KERANGKA §2 butir 17 dan §4 Bab 4,
`naskah/air/bab-10.md`. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 182 token angka unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json` dan pustaka gabungan: semua kunci ada, nilai cocok dengan berkas bukti, label sah.
  `baca()` atas Bab 4 bersama Bab 10 lulus setelah suntingan (rujukan `@rek:r-a03` dan `@rek:r-a14` terdefinisi di Bab 10).
- `qa/slop.py --final`: LOLOS, skor 0. Em dash, titik tengah, dan kata "terbukti": nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Paragraf pembuka bab | Pasal 35 ayat (2) UU 17/2019 tidak menyebut Pola "dipimpin Kementerian PU"; ayat (5) tidak menyebut UU 24/2007, hanya "ketentuan peraturan perundang-undangan" | Ditulis ulang sesuai teks: pencegahan diutamakan lewat Pola, yang disusun Pemerintah Pusat dan pemerintah daerah sesuai kewenangan (Pasal 39 ayat (1)); ayat (5) menyerahkan ke peraturan perundang-undangan, yaitu UU 24/2007; ayat (6) dikutip lengkap "dan/atau" serta "keadaan yang membahayakan". Singkatan PU dipindah ke penyebutan pertama di 4.1 |
| 2 | Akhir bab: `matriks-rekomendasi` enam `rek` | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan. Bab 10 sudah memuat permintaan data yang sama (r-a03 distribusi air kemarau; r-a14 bendungan, irigasi, air tanah, penurunan muka tanah; dua sisanya "belum ada pemilik di BNPB") sehingga ada ID paralel | Matriks diganti `tabel` celah data (`@tbl:celah-air`, tujuh baris: yang belum tersedia, pemegang, tindak lanjut ke ID Bab 10). Celah dan permintaan data tetap ada sesuai tujuan bab KERANGKA §4. Ringkasan dan Pembuka temuan merujuk `@rek:r-a03`, `@rek:r-a14` |
| 3 | 4.1 paragraf RPSDA | "Pola dan RPSDA terbuka untuk sepuluh WS ... dan dirujuk tanpa ditandingi": bukti menyatakan sembilan WS lain belum dibaca, jadi tidak dirujuk | "sembilan WS lain di Jawa terbuka tetapi belum dibaca untuk bab ini" |
| 4 | 4.6 patok Pekalongan | Pembuka tebal "searah dengan CPKL tetapi lebih lambat" membandingkan, padahal kalimat berikutnya (dan Susilo dkk. 2023) menyatakan tidak dapat dibandingkan satu lawan satu | "tetapi lebih lambat" dibuang; hanya kesamaan arah |
| 5 | Temuan Grobogan, Pembuka | Merujuk data kemarau 2023 dan 2026 dan ID lama; r-a03 hanya mencakup 2026 | Diselaraskan dengan indikator r-a03 |
| 6 | 4.2 paragraf 1 | Kalimat urutan provinsi mengulang rentang di pembuka tebal | Diganti rujukan ke tabel |
| 7 | 4.2 akses layak | "Data per kab/kota baru ditarik untuk Jawa Tengah" diulang di paragraf celah sesudahnya | Dipadatkan |
| 8 | Ringkasan butir 3 | "luas DI kewenangan pusat" tanpa cakupan, sedangkan angkanya porsi Jawa | "di Jawa" |

## Diperiksa dan tidak diubah

- Lantai skenario: bab tidak memuat skenario (bukti, catatan lingkup).
- Angka model berlabel dan bersanding angka tercatat: IPA (estimasi model, belum diuji balik) dengan deret DIBI berikut
  catatan intensitas pelaporan; World Bank 24/128 WS; defisit Jratunseluna dengan akses layak Grobogan.
- Angka bertentangan berdampingan: kondisi irigasi 46% teks lawan 32,2% dan 43,6% Gambar 33; penurunan muka tanah per
  metode dan periode (GNSS, InSAR, Badan Geologi) tanpa peringkat; Kedungombo persen lawan volume; sedimentasi Pemali-Juana
  persen dan volume di Tabel 4.2. Angka sekunder (Jatiluhur 20 juta m³/th, Cirata, Sutami, Pekalongan BRIN/Bappenas) tidak
  masuk badan teks, sesuai konvensi bukti.
- Kewenangan: BNPB tidak disebut regulator air atau keselamatan bendungan; RTD dan Komisi Keamanan Bendungan ditulis
  sebagai data yang diminta dari Kementerian PU; CAT rusak ditulis pernyataan instansi tanpa penetapan dan tidak dipakai
  sebagai syarat daftar perhatian.
- Pemetaan kolom 5 dan 7 tabel BPS diterima (alasan bukti P1 temuan 3); angka terlindung tetap ditulis sebagai batas bawah.
- Pertanyaan kunci 1 sampai 4 terjawab. Komponen ada: Gambar 4.1 (hulu-hilir), 4.2 (peta irigasi kab), 4.3 (irigasi per
  kewenangan), Tabel sumber air minum, Tabel bendungan Pemali-Juana, peta bendungan Pemali-Juana, Gambar penurunan muka
  tanah, Tabel CAT rusak.

## Sisa untuk orkestrator (di luar berkas ini)

1. KERANGKA §4 Bab 4 merencanakan Tabel 4.4 neraca dan defisit per WS dari RPSDA 10 WS; bukti hanya membaca Jratunseluna,
   jadi tabel itu tidak ada. Perlu RPSDA sembilan WS lain dibaca, atau KERANGKA diselaraskan.
2. Gambar 4.4 menurut KERANGKA adalah titik semua bendungan paket dengan atribut PSN; naskah memakai peta Pemali-Juana saja
   (37 titik, 19 sekunder). Atribut PSN tidak ada (daftar PSN belum dibuka, bukti P3 Celah).
3. Tabel 4.1 profil enam provinsi menurut KERANGKA memuat penduduk KRB, irigasi, bendungan, dan kota penurunan tanah;
   naskah hanya memuat sumber air minum dan layak.
4. Empat kunci `bab-04.angka.json` bertabrakan dengan `data/angka.json` (n_paket, ipa_2010_persen,
   ipa_2010_tanpa_pemeliharaan_persen, n_subtotal_kab); nilai sama, label IPA di bukti lebih lengkap ("belum diuji
   balik"). Saat digabung, label bukti harus menang.
5. `bab-*.pustaka.json` bab lain memuat entri author tanpa `family`/`literal` yang membuat `_akhiran_tahun` galat saat
   digabung; periksa sebelum pustaka disatukan.
6. Satu entri `kunci` di bab-10.md r-a14 menulis "ha" di luar token (`{{angka:airjawa.jawa.irigasi_total_ha}} ha`); bukan
   lingkup berkas ini.
