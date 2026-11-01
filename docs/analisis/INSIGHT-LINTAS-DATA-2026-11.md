# Insight lintas data: logbook Pusdalops × sistem Centurisk97

Disusun 1 November 2026, diperbarui hari yang sama setelah arsip 2021, 2024, 2025, dan 2026 masuk.
Sumber utama: logbook harian Pusdalops BNPB 2011–2026 (56.685 kejadian; tahun dasar = tahun yang tiap
bulannya punya minimal 25 hari tercatat: 2014–2020, 2024, 2025, sembilan tahun), disilangkan dengan titik api FIRMS, InaRISK (risiko dan indeks ketahanan daerah),
DIBI, SK status darurat, dan korpus riset direktori (14.869 makalah bertanda wilayah dan jenis bencana).
Angka korban dari logbook tidak dipakai, karena satu bencana bisa tercatat beberapa kali.

## 1. Yang paling penting

1. **Bencana di Indonesia sangat berulang di tempat yang sama.** 78 kab/kota terkena banjir, 62 cuaca
   ekstrem, dan 49 longsor di setiap tahun dasar (9 dari 9 tahun), di bulan yang hampir sama. Kepastian
   musiman ini lebih bisa diandalkan daripada prakiraan harian: aturan banjir dari hujan gagal di empat
   tahun uji 2022–2025 (ETS gabungan 0,011; sekitar 98 dari 100 alarm Waspada salah), bahkan dengan hujan
   yang diketahui sempurna.
2. **BNPB tidak tahu sebagian besar kejadian.** Kebakaran lahan di Jawa hanya terlapor pada 1–5% hari
   ada titik api. Situbondo dan Wonogiri punya titik api sama banyak pada 2015 dan 2018, tetapi laporannya
   naik dari 0 menjadi 20-an. Provinsi di Papua mencatat 0,3–1 kejadian per kab per tahun.
3. **Peta risiko tidak menangkap daerah langganan.** Peringkat risiko InaRISK hampir tidak berhubungan
   dengan seringnya kejadian tercatat (korelasi peringkat banjir 0,08, longsor 0,10, karhutla 0,09;
   gempa 0,48). Kab. Bogor, Magelang, Cilacap, dan Kota Semarang mencatat 200-an longsor tetapi berada di
   bawah median indeks risiko longsor. Sebagian disebabkan bias pelaporan Jawa dan perbedaan ukuran
   (InaRISK menilai bahaya dan keparahan, logbook menghitung frekuensi), tetapi untuk perencanaan
   kesiapsiagaan tahunan, frekuensi nyata lebih berguna.
4. **Kendala lapangan berulang dan bisa disiapkan sebelumnya.** Dari 5.558 entri kendala 2011–2026:
   akses jalan (2.000 entri), air bersih atau sumber air (1.479), logistik/BBM (1.377), sinyal dan
   komunikasi (963), personel (927), alat berat (495), gambut (363). Daftar desa terisolir berulang kini
   2.151 desa (`data/pusdalops/desa_terisolir.csv`).
5. **Riset belum menyentuh semua daerah langganan, dan arah riset tidak sejalan dengan kejadian.**

## 1a. Tahun 2025 melonjak, dan lonjakannya nyata

Logbook 2025 mencatat 5.906 kejadian, tertinggi sejak 2011 (tahun lain 3.000–4.800). Kenaikan terbesar di
Jawa Barat (sekitar 590 menjadi 1.074 kejadian; Kab. Bogor 250 menjadi 335) dan Sumatera Utara (sekitar
150 menjadi 388), tersebar sepanjang tahun, bukan satu kejadian besar. DIBI, yang dicatat terpisah,
menunjukkan lonjakan yang sama: banjir 1.457 (2024) menjadi 2.991, cuaca ekstrem 756 menjadi 2.432, longsor
219 menjadi 1.171. Jadi ini bukan sekadar perubahan cara mencatat di logbook, walau DIBI dan logbook
sebagian bersumber dari laporan BPBD yang sama. Penyebab fisiknya (mis. tahun basah) belum dikaji.

## 1b. Uji model terhadap logbook (2022–2025)

| Model | Hasil | Bacaan |
| ----- | ----- | ------ |
| Aturan banjir dari hujan, kab/hari | ETS 0,011 [0,008–0,014], tidak lulus; kalah dari persisten | Belum layak jadi peringatan harian |
| Skor longsor hujan 3 hari × bahaya | AUC 0,65; ETS tidak mengalahkan klimatologi | Sinyal peringkat lemah, tidak lebih dari musim |
| Titik api FIRMS vs laporan karhutla | Lift A 2,23 (2014–2022), 1,95 (2023–2025) | Titik api memang menandai hari laporan, sekitar dua kali acak |

Catatan kejujuran: aturan banjir diterima lewat uji 2022–2025 pada label DIBI, dan 41 kab sampel dipilih
memakai kejadian sampai 2025, jadi skor banjir/longsor optimistis; vonis gagal tetap berlaku. Rincian di
`scripts/banjir/RISET-LOGBOOK*.md` dan `scripts/data/RISET-LOGBOOK-KARHUTLA.md`.

## 2. Pola musim per daerah

| Pola | Daerah | Implikasi |
| ---- | ------ | --------- |
| Banjir dan longsor memuncak Juni–Agustus | Maluku (56% kejadian di Jun–Agu, 9 tahun dasar), Maluku Utara (46%), Sulawesi Tenggara (45%), Sulawesi Tengah (34%) | SOP siaga "musim hujan November–Maret" tidak cocok; siaga di sana justru pertengahan tahun |
| Karhutla di musim hujan | Aceh (88 dari 226 kejadian di Des–Mar), Riau (56 dari 97) | Siaga karhutla Februari–Maret, kemarau kedua |
| Kebakaran permukiman Juli–September | Lima kota Jakarta (300–500 kejadian masing-masing 2014–2020), Kota Semarang | Kampanye listrik aman sebelum kemarau |
| Rantai banjir → longsor | 15,8% banjir diikuti longsor di kab yang sama dalam 3 hari | Banjir memicu siaga longsor otomatis |

## 3. Kejanggalan yang perlu ditindaklanjuti

| Kejanggalan | Bukti | Bacaan |
| ----------- | ----- | ------ |
| Karhutla Jawa "naik" 2018–2019 | Laporan per hari-titik api Jawa naik dari ±1% (2014–2016) ke 5% (2018); titik apinya tidak naik sebesar itu | Perubahan kebiasaan lapor, bukan api baru; kebakaran lahan Jawa sebagian besar tak terlapor |
| Kebakaran permukiman hilang dari logbook | Kota Serang, Bandung, Cilacap, Lebak nol mulai 2017–2018; 2022 hanya 121 kejadian dalam 272 hari | Kemungkinan cara pencatatan berubah (belum dipastikan) |
| Lonjakan mendadak | Bogor 93 kejadian cuaca ekstrem 2020 (median 21); Banjarnegara 52 longsor 2017 (median 12); Sumedang 48 longsor 2020 (median 4–5) | Kandidat kajian pascakejadian |
| Laporan berhenti di laporan pertama | Median satu kejadian hanya dilaporkan sekali | Kondisi akhir dan korban akhir jarang tercatat |
| SK status darurat lewat batas | 232 dari 453 SK kabupaten 2025 lewat batas 14 hari; jeda median 13 hari | Perlu pemantauan masa berlaku SK |

## 4. Daerah prioritas: langganan dan kapasitas rendah

30 kab/kota langganan banjir atau longsor (7 dari 7 tahun) berkapasitas rendah menurut indeks ketahanan
daerah InaRISK. Teratas: Kab. Aceh Selatan (banjir dan longsor), Aceh Tenggara, Agam (longsor),
Rokan Hulu, Wajo, Aceh Barat, Aceh Utara, Aceh Singkil, Langkat, Pidie, Barito Utara, Aceh Timur.
Aceh mendominasi. Ini kandidat pertama stok penyangga dan pendampingan BPBD.

## 5. Riset: yang sudah ada dan celahnya

Pencocokan 14.869 makalah (OpenAlex dan sumber nasional di direktori) dengan daerah langganan:

| Jenis | Kab langganan | Tanpa satu pun makalah | Celah teratas (kejadian 2014–2020) |
| ----- | ------------- | ---------------------- | --------------------------------- |
| Banjir | 85 | 7 | Kota Batu (44), Sampang (32), Kebumen (27), Barito Utara (27), Jepara (25), Toli-Toli (21), Dompu (15) |
| Longsor | 52 | 3 | **Brebes (94)**, Kota Batu (77), Pamekasan (20) |
| Karhutla (yang dilaporkan) | — | — | Situbondo (94 kejadian, 0 makalah), Sidoarjo (40, 0), Sragen (32, 0); riset karhutla menumpuk di Riau dan Kalimantan |

Contoh daerah yang sudah punya bahan riset untuk langsung dipakai:
- Kab. Bogor longsor: 51 makalah, termasuk jalur evakuasi longsor dan sosialisasi mitigasi di Citeureup.
- Kab. Magelang longsor: 23 makalah, termasuk pemetaan rawan longsor kabupaten dan risiko di Windusari.
- Kab. Banyumas longsor: 25 makalah, termasuk investigasi bidang gelincir dengan geolistrik.
- Kab. Cilacap: 207 longsor tetapi hanya 3 makalah longsor (geolistrik, kestabilan lereng Ciwuni).

Ketidakseimbangan per provinsi (porsi makalah dibanding porsi kejadian tercatat): Jawa Timur 0,24 dan
Jawa Tengah 0,25 paling kurang diteliti; Bengkulu, Sumatera Barat, Lampung, Riau, Jambi, Sulawesi Tengah,
dan DI Yogyakarta 3–4,6 kali lebih banyak diteliti daripada porsi kejadiannya. Catatan: porsi kejadian
Jawa juga terdongkrak bias pelaporan.

Agenda riset yang diusulkan ke kampus: longsor Brebes dan Kota Batu, banjir Kebumen/Jepara/Sampang,
kebakaran lahan Jawa Timur (Situbondo, Nganjuk, Ponorogo, Mojokerto), dan pelaporan rendah Papua.

## 6. Daerah senyap hari ini

134 kab/kota dengan titik api ≥10 dalam 3 hari tanpa episode karhutla di laporan harian (acuan
27 Oktober 2026), antara lain Kutai Kartanegara (744 titik), Mappi (198), Dogiyai (78), Mojokerto (22).
Ini daftar telepon Pusdalops. Batasan: laporan warga/BPBD di D1 belum terbaca pipeline, dan laporan
harian terbit dengan jeda 1–2 hari.

## 7. Implikasi untuk strategi

| Temuan | Tindakan |
| ------ | -------- |
| Musim sangat pasti di daerah langganan | Siapkan stok, alat berat, dan SIPPA sebulan sebelum musim, tanpa menunggu prakiraan |
| Mayoritas kejadian tak terlapor | Pelapor desa via WA + daftar senyap harian + sensor |
| Laporan berhenti di laporan pertama | Pengingat lanjutan H+1 dan H+3 dari form logbook baku |
| Peta risiko tidak menangkap frekuensi | Tambahkan lapisan "frekuensi nyata" ke perencanaan, bukan menggantikan InaRISK |
| Celah riset | Agenda riset bersama kampus untuk daerah langganan tanpa riset |
| Kendala akses dan sinyal | Peta desa terisolir + radio mesh/satelit di desa itu |

## Keterbatasan

- Logbook mencatat yang dilaporkan, bukan seluruh kejadian; bias kuat ke Jawa.
- 2011–2012 sebagian besar berkas rusak dari sumbernya; Februari 2013 rusak; 2021, 2022, 2023 punya bulan
  dengan kurang dari 25 hari tercatat; 2026 sampai 1 November.
- Bagian 3 (kejanggalan), 4 (daerah prioritas), dan 5 (celah riset) masih dihitung dari basis 2014–2020
  dan belum dihitung ulang dengan sembilan tahun dasar.
- Pencocokan riset memakai tanda wilayah dan jenis di korpus; makalah tanpa tanda kab tidak terhitung.
- "Langganan" dihitung dari minimal satu kejadian per tahun, bukan besar dampaknya.
