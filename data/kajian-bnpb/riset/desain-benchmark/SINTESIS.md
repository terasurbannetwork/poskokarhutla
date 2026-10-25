# Sintesis laporan kelas dunia untuk desain dua kajian BNPB

Disusun 23 Oktober 2026 dari bedah visual 22 laporan dalam empat keluarga: World Bank, ADB,
dan IMF; konsultan (McKinsey, BCG, Deloitte); PBB dan OECD; pemerintah dan rujukan
visualisasi data. Pemilik meminta: *"Tiru style mereka dan implementasikan untuk
sempurnakan system kita."* Berkas ini menyimpan bukti dan vonisnya. Aturan yang lahir dari
sini ditulis di Buku Pegangan bab "Selera laporan (DOCX/PDF) dan visualisasi data"
(`docs/buku-pegangan/pantau-bencana.md`) dan diterapkan di `data/kajian-bnpb/PEDOMAN-DESAIN.md`
§B (kode asal SIN di tabel keterlacakan §E).

Cara membaca:

- Path bukti relatif terhadap `data/kajian-bnpb/riset/desain-benchmark/`. Bila satu pola
  punya beberapa bukti di folder yang sama, path pertama ditulis lengkap dan sisanya nama
  berkas tanpa `.png` (h092 = `h092.png` di folder yang sama).
- Vonis: **Tiru** (dipakai seperti aslinya, dengan token BNPB), **Tiru dengan penyesuaian**
  (strukturnya dipakai, unsur yang bentrok dengan selera pemilik diganti), **Jangan** (tidak
  dipakai, alasannya ditulis).
- Bila pola dunia bentrok dengan aturan pemilik yang tertulis (Buku Pegangan,
  `KEPUTUSAN.md`, `PEDOMAN-DESAIN.md`), aturan pemilik menang. Bentroknya dikumpulkan di §12.
- Nomor pola P1 sampai P109 dan nomor pilih grafik G1 sampai G25 dipakai sebagai rujukan dari
  Buku Pegangan dan PEDOMAN.

## Laporan yang dibedah

| Kode | Laporan | Penerbit, tahun | Folder bukti |
| --- | --- | --- | --- |
| CCDR | Indonesia Country Climate and Development Report | World Bank Group, 2023 | `world-bank-adb-imf/wb-indonesia-ccdr-2023/` |
| WS45 | Indonesia Vision 2045: Toward Water Security | World Bank dan Bappenas, 2021 | `world-bank-adb-imf/wb-indonesia-water-security-2045/` |
| ATLAS | Atlas of Sustainable Development Goals 2018 | World Bank, 2018 | `world-bank-adb-imf/wb-atlas-sdg-2018/` |
| ADB | Asia-Pacific Climate Report 2024 | Asian Development Bank, 2024 | `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/` |
| WEO | World Economic Outlook, Oktober 2020 | IMF, 2020 | `world-bank-adb-imf/imf-weo-2020-oct/` |
| WDR | World Development Report 2024 | World Bank, 2024 | `world-bank-adb-imf/wb-wdr-2024/` |
| MGI | Climate risk and response: Physical hazards and socioeconomic impacts | McKinsey Global Institute, 2020 | `konsultan/mgi-2020/` |
| MGIA | Climate risk and response in Asia | McKinsey Global Institute, 2020 | `konsultan/mgi-asia-2020/` |
| CWF | Charting Our Water Future | 2030 Water Resources Group (McKinsey, IFC), 2009 | `konsultan/mck-air-2009/` |
| BCG | From Risk to Reward | BCG, GRP, USAID, 2023 | `konsultan/bcg-2023/` |
| DEL | Update to the economic costs of natural disasters in Australia | Deloitte Access Economics, 2021 | `konsultan/deloitte-2021/` |
| IPCC | AR6 WGII Summary for Policymakers | IPCC, 2022 | `pbb-oecd/ipcc/` |
| GAR | Global Assessment Report on Disaster Risk Reduction 2025 | UNDRR, 2025 | `pbb-oecd/undrr/` |
| WMO | State of the Climate in Asia 2024 | WMO, 2025 | `pbb-oecd/wmo/` |
| OECD | Global Drought Outlook | OECD, 2025 | `pbb-oecd/oecd/` |
| UNICEF | The Climate Crisis is a Child Rights Crisis | UNICEF, 2021 | `pbb-oecd/unicef/` |
| JWP | White Paper on Disaster Management in Japan 2025 | Cabinet Office Jepang, 2025 | `pemerintah-dataviz/jepang-whitepaper/` |
| NANKAI | Nankai Trough: laporan WG dan perkiraan kerusakan | Central Disaster Management Council Jepang, 2025 | `pemerintah-dataviz/jepang-nankai/` |
| NRR | National Risk Register 2026 | HM Government (Inggris), 2026 | `pemerintah-dataviz/uk-nrr/` |
| DELTA | Nationaal Deltaprogramma 2026 | Kementerian I&W dan Deltacommissaris (Belanda), 2025 | `pemerintah-dataviz/delta/` |
| OWID | Natural Disasters | Our World in Data (data EM-DAT), 2026 | `pemerintah-dataviz/owid/` |
| FTVV | Visual Vocabulary | Financial Times, 2016–2019 | `pemerintah-dataviz/ft-economist/` |

Tiga laporan paling layak ditiru per keluarga: CCDR, WS45, ATLAS (World Bank); MGI, MGIA,
CWF (konsultan); WMO, IPCC, GAR dan OECD (PBB/OECD); NRR, DELTA, NANKAI dan JWP (pemerintah).
Rujukan pilih grafik: FTVV.

## 1. Struktur dokumen

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P1 | Ringkasan bertingkat: pesan kunci 1 hlm, infografik sekilas 1 hlm, ringkasan eksekutif, lalu bab | MGI `konsultan/mgi-2020/h010.png`, h011; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h016.png`, h019 | Tiru dengan penyesuaian | DOCX: halaman pertama Ringkasan Eksekutif = Pesan Kunci (P16); lapis infografik sekilas = PDF ringkas hlm 3 (kartu angka dan peta utama), sesudah Pesan Kunci dan pita keputusan di hlm 2 (PEDOMAN §A3.1). Infografik berlatar putih |
| P2 | Halaman kerangka satu halaman: pilar, sasaran, program bernomor; nomor program dipakai ulang di bab, matriks, dan daftar isi | BCG `konsultan/bcg-2023/h006.png`, h002, h008 | Tiru dengan penyesuaian | "Kerangka Grand Design" di awal Bab Grand Design dan PDF ringkas hlm 8; kode program dipakai ulang di matriks fase × jenis, matriks rekomendasi, tabel indikator. Latar putih, bukan foto gelap |
| P3 | Pilar, lalu aksi bernomor, lalu kotak "dampak bila tidak ditangani" berangka, lalu aksi cepat dengan instansi penanggung jawab | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h016.png`, h021, h124 | Tiru | Kerangka Bab Grand Design kajian air: pilar → aksi → kotak dampak (P58) → aksi 100 hari berlembaga |
| P4 | Satu ancaman satu templat halaman dengan kepala tetap (skenario, asumsi, variasi, kebutuhan kapasitas per aktor, pemulihan, kelompok rentan) | NRR `pemerintah-dataviz/uk-nrr/h160.png`, h161 | Tiru | Bab per jenis bencana kajian mitigasi; sudah menjadi kartu skenario PEDOMAN §B5.11 |
| P5 | Dasbor wilayah bertemplat identik 1–2 hlm, hanya nama wilayah dan angka yang berganti | MGIA `konsultan/mgi-asia-2020/h086.png`, h087, h094 | Tiru | Lampiran "Dasbor provinsi" untuk 6 provinsi Jawa (kajian air) dan "Dasbor bahaya" (kajian mitigasi). Di lampiran supaya tidak memakan batas halaman isi |
| P6 | Pembuka bab berisi kotak pesan kunci bab 3–5 butir berangka | WDR `world-bank-adb-imf/wb-wdr-2024/h065.png`; DEL `konsultan/deloitte-2021/h014.png`, h018 | Tiru dengan penyesuaian (≤ 3 butir) | Sudah ada sebagai kotak ringkasan bab (PEDOMAN §B5.3); paling banyak 3 butir Temuan, wajib berangka |
| P7 | Pembuka bab halaman penuh berwarna atau foto | GAR `pbb-oecd/undrr/h017.png`; OECD `pbb-oecd/oecd/h017.png`; WEO `world-bank-adb-imf/imf-weo-2020-oct/h104.png`; DELTA `pemerintah-dataviz/delta/h011.png`; NRR `pemerintah-dataviz/uk-nrr/h012.png` | Jangan (DOCX) | Memakan batas halaman (K3) dan PEDOMAN §B5.2 sudah memutus pembatas bab bukan halaman penuh. Halaman gelap hanya sampul dan pembatas Lampiran; di deck, layout GELAP untuk pembatas |
| P8 | Daftar isi berubin bergambar, atau tanpa titik penuntun | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h004.png`; GAR `pbb-oecd/undrr/h005.png`; BCG `konsultan/bcg-2023/h002.png` | Tiru dengan penyesuaian | Entri bab Bold navy dari GAR sudah sama dengan TOC1 PEDOMAN §B2; ubin dan halaman biru tidak dipakai; titik penuntun tetap (SPESIFIKASI §5) |
| P9 | Lampiran katalog langkah dengan asumsi dan sumber tiap angka; lampiran per wilayah; lampiran rujukan kerangka | CWF `konsultan/mck-air-2009/h157.png`; BCG `konsultan/bcg-2023/h046.png` | Tiru | Lampiran katalog program (status P7 KEPUTUSAN, dampak terukur, sumber), lampiran per kab/kota, lampiran rujukan kerangka (Sendai, RPJMN, IRBI, Perban) |
| P10 | Nomor objek per bagian: ringkasan, bab, lampiran | MGI `konsultan/mgi-2020/h023.png`, h030; JWP `pemerintah-dataviz/jepang-whitepaper/h008.png` | Tiru dengan penyesuaian | Caption Word: "Gambar 5.2" di bab, "Gambar RE.1" di Ringkasan Eksekutif, "Tabel A.1" di lampiran. Gambar ringkasan yang menyalin gambar bab menyebut "(sama dengan Gambar 5.2)" |
| P11 | Peta bernomor sendiri ("Map 12") dengan Daftar Peta | GAR `pbb-oecd/undrr/h065.png`; UNICEF `pbb-oecd/unicef/h016.png` | Tiru dengan penyesuaian, belum diputus | Bawaan: peta tetap seri Gambar (satu seri, gerbang D-7 sederhana); seri Peta dipasang hanya bila pemilik memintanya (§13) |
| P12 | Grid asimetris dengan kolom samping untuk catatan kaki, kartu angka, dan keterangan | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h017.png`; MGI `konsultan/mgi-2020/h014.png`; WMO `pbb-oecd/wmo/h006.png`, h015 | Tiru dengan penyesuaian | Diambil prinsipnya saja: gambar dan tabel selebar isi penuh. Kolom samping tidak dipakai: satu kolom (SPESIFIKASI §1), dan sidenote di Word rapuh serta merusak Caption |
| P13 | Isi dua kolom atau halaman A4 lanskap | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h125.png`; WEO `world-bank-adb-imf/imf-weo-2020-oct/h016.png`; GAR `pbb-oecd/undrr/h020.png`; UNICEF `pbb-oecd/unicef/h012.png`; NRR `pemerintah-dataviz/uk-nrr/h018.png` | Jangan | K2 A4 tegak; satu kolom rata kiri-kanan. Lanskap hanya di lampiran untuk tabel lebar |
| P14 | Rujukan silang berwarna yang bisa diklik "(See Exhibit 2.)" | BCG `konsultan/bcg-2023/h008.png` | Tiru dengan penyesuaian | Cross-reference Word ke Caption: "(lihat Gambar 5.2)"; warna tetap teks isi |
| P15 | Kata pengantar bertanda tangan pimpinan | CWF `konsultan/mck-air-2009/h009.png` | Tiru dengan penyesuaian | Kata Pengantar draf satu halaman untuk Kepala BNPB (KEPUTUSAN T7), satu tanda tangan |
| P104 | Tipologi wilayah: wilayah dikelompokkan per tipe dengan pita grup, lalu profil dan rekomendasi per tipe | MGIA `konsultan/mgi-asia-2020/h054.png`; NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h006.png`; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h084.png` | Tiru dengan penyesuaian | Kab/kota Jawa per tipe (defisit kronis, defisit musiman, surplus; pesisir amblas, DAS hulu, lumbung irigasi); tipe ditandai pita grup `#E6EAF0` di tabel, tanpa warna per tipe; bila perlu di peta, kelas ramp netral berlabel tipe |
| P105 | Diagram struktur indeks dan pohon indikator | UNICEF `pbb-oecd/unicef/h075.png`, h106 | Tiru dengan penyesuaian | Bab dan lampiran metode IRBI dan indeks platform: kotak native (induk `navy`, bahaya tint api, kerentanan dan kapasitas tint air) atau tabel berjenjang indikator, sumber, tahun, bobot, ≥ 8 pt |

## 2. Ringkasan eksekutif

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P16 | Halaman pesan kunci: 6–10 temuan, tiap temuan ikon putih dalam lingkaran solid dan satu temuan berangka 2–4 baris | WMO `pbb-oecd/wmo/h004.png` (ikon putih dalam lingkaran); ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h016.png` (butir kotak dengan kalimat tebal, tanpa ikon) | Tiru dengan penyesuaian | Halaman pertama Ringkasan Eksekutif DOCX dan PDF ringkas hlm 2: kalimat tesis, lalu 6–8 temuan bernomor (P18), tiap temuan ≤ 3 baris, lingkaran `navy`, angka kunci di depan |
| P17 | Tiap paragraf dibuka satu kalimat temuan tebal, lalu bukti berangka; pembaca bisa membaca kalimat tebal saja | OECD `pbb-oecd/oecd/h011.png`; CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h017.png`, h036; DEL `konsultan/deloitte-2021/h007.png`; MGI `konsultan/mgi-2020/h010.png` | Tiru | Ringkasan Eksekutif dan paragraf temuan bab analisis; kalimat tebal memakai gaya Penekanan (Bold navy), memuat angka, tempat, dan tahun, paling banyak 2 baris |
| P18 | Temuan bernomor berkelompok (A.1, B.2.3) ditutup tingkat keyakinan dan rujukan bab | IPCC `pbb-oecd/ipcc/h009.png` (B.1, B.1.1 sampai B.1.3, tiap butir ditutup tingkat keyakinan dan rujukan bab) | Tiru dengan penyesuaian | Huruf kelompok = pertanyaan pimpinan PEDOMAN §A2 (A, B, C), selalu ditulis lengkap "Temuan A.1" supaya tidak tertukar dengan "Tabel A.1" di lampiran; tiap temuan ≤ 3 baris, ditutup label keyakinan (§C6.2) dan rujukan "(Bab 5.2)". Matriks rekomendasi merujuk kode temuan |
| P19 | Ringkasan berbentuk pertanyaan lalu jawaban per bagian | WDR `world-bank-adb-imf/wb-wdr-2024/h023.png` | Tiru dengan penyesuaian | Tiga pertanyaan pimpinan menjadi kepala kelompok temuan A, B, C |
| P20 | Infografik sekilas: angka sekarang, proyeksi, pendorong, kontribusi per bahaya, peta per wilayah; peta mini per bahaya berpasangan dengan satu kalimat berangka | DEL `konsultan/deloitte-2021/h006.png`; MGIA `konsultan/mgi-asia-2020/h010.png`; MGI `konsultan/mgi-2020/h011.png`; UNICEF `pbb-oecd/unicef/h012.png` | Tiru dengan penyesuaian | PDF ringkas hlm 3 (kartu angka gaya rumah bersama peta utama) dan halaman sebaran per bahaya (kajian air hlm 4–5, kajian mitigasi hlm 5): peta mini + satu kalimat per bahaya. Latar putih (pemilik: tanpa latar gelap); venn dan ilustrasi anak dibuang |
| P21 | Ringkasan prosa tanpa angka sorotan, atau paragraf meta "Bab 1 membahas" | WEO `world-bank-adb-imf/imf-weo-2020-oct/h016.png`; GAR `pbb-oecd/undrr/h011.png` | Jangan | Kepala BNPB butuh angka kunci di halaman pertama; paragraf meta tidak membawa temuan |
| P109 | Kartu angka: nilai besar berwarna makna, label pendek, kadang pangsa terhadap total | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h022.png`; MGIA `konsultan/mgi-asia-2020/h018.png` | Tiru dengan penyesuaian | Kartu angka gaya rumah (PEDOMAN §B5.4); pangsa ditulis "Jawa menanggung X% …"; pita climate stripes dibuang |

## 3. Judul dan narasi

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P22 | Judul gambar = satu kalimat temuan, sering berangka ("judul aksi") | MGI `konsultan/mgi-2020/h033.png`; WDR `world-bank-adb-imf/wb-wdr-2024/h037.png`, h039; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h007.png`; CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h015.png` | Tiru dengan penyesuaian, belum diputus | Bawaan (PEDOMAN T14): keterangan "Gambar 5.2" berupa judul deskriptif stabil berisi besaran, tempat, periode, dan satuan, karena vonis pemilik 23 Okt soal judul deskriptif lebih baru daripada "judul = fakta + angka + sumber" dan Daftar Gambar harus stabil. Kalimat temuan berangka pindah ke kalimat pembuka tebal paragraf yang merujuk gambar (P17). Judul aksi dipakai hanya bila pemilik memilihnya (§13); tanpa kontras "X bukan Y" (WDR "not just") |
| P23 | Judul berantai antarpanel ("…so its concentration is also growing") | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h064.png` | Tiru dengan penyesuaian | Boleh di satu halaman, tetapi tiap judul tetap bermakna sendiri karena masuk Daftar Gambar; tanpa elipsis |
| P24 | Judul studi kasus berupa hasil berangka | BCG `konsultan/bcg-2023/h014.png` | Tiru | Bentuk: "Embung desa menambah {n} m³ tampungan di {kab}, {tahun}–{tahun}"; slot diisi dari data, tidak dari contoh |
| P25 | Judul atau halaman bergaya slogan ("pays off", "There is no time to waste", kutipan besar) | WMO `pbb-oecd/wmo/h024.png`; BCG `konsultan/bcg-2023/h012.png`, h042 | Jangan | Pemilik melarang slogan dan kalimat penutup bergaya |
| P26 | Anotasi langsung di grafik: label seri di ujung garis, panah lengkung ke titik yang dijelaskan | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h064.png`, h065, h036; OWID `pemerintah-dataviz/owid/jumlah-kejadian.png` | Tiru | Mengganti kotak legenda dan paragraf penjelas; paling banyak 3 anotasi per grafik, ≥ 8 pt |
| P27 | Garis tegak tipis berlabel kejadian di deret waktu | WEO `world-bank-adb-imf/imf-weo-2020-oct/h039.png`; JWP `pemerintah-dataviz/jepang-whitepaper/h177.png` | Tiru | Tren kejadian DIBI dan curah hujan: El Niño 2015, 2019, 2023; UU 17/2019; gempa Palu 2018 |
| P28 | Catatan bias pelaporan di bawah grafik jumlah kejadian | OWID `pemerintah-dataviz/owid/jumlah-kejadian.png` | Tiru | DIBI: pencatatan melonjak sesudah 2000 dan sesudah BPBD terbentuk 2008; ditulis di baris Catatan supaya tidak dibaca "bencana naik sepuluh kali" |
| P29 | Normalisasi per 100.000 penduduk dan per PDB di samping angka mutlak; rata-rata per dekade | OWID `pemerintah-dataviz/owid/kematian-per-dekade.png`, kerugian-pdb, kematian-indonesia | Tiru | Sudah ada di PEDOMAN §C4 (dinormalkan, angka mutlak di kurung); rata-rata per dekade untuk DIBI 1815–2025 di ringkasan |
| P30 | Kutipan tarik yang mengulang kalimat isi; kotak teks di atas foto | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h015.png`, h085, h089 | Jangan | Teks yang tidak membawa informasi baru dibuang (pemilik); kotak di atas foto rapuh di Word |
| P31 | Bahasa keyakinan terkalibrasi di tiap kalimat dan rujukan bab di akhir paragraf | IPCC `pbb-oecd/ipcc/h016.png` | Tiru dengan penyesuaian | Empat label keyakinan PEDOMAN §C6.2 di tabel dan kartu; di prosa cukup rujukan "(Bab 4.2; Lampiran C)" |
| P107 | Diagram konsep bertahap: dua kurva dengan fase bertanda garis putus dan label fase | WDR `world-bank-adb-imf/wb-wdr-2024/h039.png` | Tiru | Pergeseran dari respons darurat ke pengurangan risiko selama 2026–2030; dua warna rumah, label langsung di garis |

## 4. Anatomi gambar (exhibit)

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P32 | Urutan tetap: label nomor, judul temuan, pil kanan atas (skenario, sasaran), grafik, lalu catatan dan sumber | MGI `konsultan/mgi-2020/h023.png`, h033; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h007.png`, h036; CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h015.png` | Tiru dengan penyesuaian | Keterangan di atas (PEDOMAN §B2), pil kanan atas berisi label keyakinan, skenario, atau sasaran ("Sasaran Sendai B"), lalu "Sumber:" tepat di bawah objek dan "Catatan:" sesudahnya (urutan dibalik dari MGI supaya gerbang D-7 membaca Sumber sebagai paragraf pertama sesudah objek; legenda tabel karena itu ditaruh di baris terakhir tabel, PEDOMAN §B5.7) |
| P33 | Baris subjudul berisi nama indikator, satuan, dan periode di bawah judul | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h015.png`; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h007.png`; WEO `world-bank-adb-imf/imf-weo-2020-oct/h039.png`; OECD `pbb-oecd/oecd/h020.png`; CWF `konsultan/mck-air-2009/h016.png` | Jangan | Kartu Insight adalah aturan layar situs; di kertas kepala grafik pola grafik batang pemilik (nama besaran kiri, perubahan neto kanan) boleh menjadi satu-satunya baris di atas grafik, tanpa satuan dan periode (PEDOMAN §B5.10). Baris subjudul indikator, satuan, atau periode tidak dipakai; satuan dan periode dilebur ke akhir keterangan dalam kurung atau ke legenda: "… di Pulau Jawa, 2015–2025 (jiwa)" |
| P34 | Legenda di atas grafik, atau label seri langsung di area grafik | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h015.png`; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h065.png` | Tiru | Label langsung bila seri ≤ 4; legenda di atas grafik bila lebih |
| P35 | Sumbu Y dan garis kisi di semua grafik | GAR `pbb-oecd/undrr/h020.png`; WMO `pbb-oecd/wmo/h007.png`; DEL `konsultan/deloitte-2021/h015.png`; OWID `pemerintah-dataviz/owid/kematian-tahunan.png` | Jangan (batang) | Selera pemilik: batang tanpa sumbu Y, nilai di atas. Seri panjang diringkas per dekade (P29) atau dibuat garis dengan paling banyak 3 garis acuan nilai berlabel |
| P36 | Panel berganda berlabel (a)(b)(c) dengan satu legenda dan skala sama | WMO `pbb-oecd/wmo/h007.png`, h020; OECD `pbb-oecd/oecd/h021.png`; IPCC `pbb-oecd/ipcc/h010.png` | Tiru | Satu legenda bersama di kaki; label panel 9 pt Bold |
| P37 | Paragraf "cara membaca gambar" untuk grafik yang tidak lazim | OECD `pbb-oecd/oecd/h021.png` | Tiru dengan penyesuaian | Ditulis di baris "Catatan:" di bawah Sumber, bukan sebagai subjudul (P33); paling banyak satu baris dan 120 karakter, hanya cara baca atau bias data (PEDOMAN D-32) |
| P38 | Pil sasaran di pojok grafik yang menunjuk target yang diukur ("SDG 4.2") | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h007.png`, h036 | Tiru dengan penyesuaian | Pil kanan atas berisi sasaran yang diukur: "Sasaran Sendai B", "RPJMN 2025–2029", kode program kerangka (P2) |
| P39 | Grafik dan peta pihak ketiga ditempel apa adanya | OECD `pbb-oecd/oecd/h036.png`; WMO `pbb-oecd/wmo/h006.png`, h016 | Jangan | Merusak satu sumber data satu set gambar (PEDOMAN §A5); digambar ulang dari data dengan token, atau angkanya dikutip di tabel. Yang ditiru dari WMO hanya kebiasaan menulis asal peta dan tanggal akses |
| P40 | Teks grafik 5,9–7 pt, sumber 6 pt abu sangat terang | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h017.png`; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h021.png`; DEL `konsultan/deloitte-2021/h011.png` | Jangan | Batas laporan 8 pt (PEDOMAN §B2); sumber 8,5 pt `#6B7280` |
| P41 | Tiga jenis label objek (Figure, Chart, Table) | DEL `konsultan/deloitte-2021/h014.png`, h015 | Jangan | Gambar dan Tabel saja |
| P106 | Tabel peringkat dengan nilai dan titik warna kelas, kepala kolom berpita kelas | UNICEF `pbb-oecd/unicef/h081.png` | Tiru dengan penyesuaian | Nomor peringkat dalam bulatan `navy`, nilai rata kanan diikuti titik kelas, kolom jiwa terpapar wajib; satu blok per halaman |

## 5. Pemilihan grafik menurut pesan

Disusun dari kamus sembilan hubungan data FTVV (`pemerintah-dataviz/ft-economist/h001-poster.png`,
h001-bagian1, h001-bagian2, h001-bagian3) dan contoh nyata di laporan lain, disaring dengan
selera grafik pemilik.

| No | Pesan | Jenis grafik | Contoh laporan (bukti) | Cocok untuk kajian BNPB? |
| --- | --- | --- | --- | --- |
| G1 | Perubahan waktu, ≤ 24 periode | Batang tegak ujung membulat, nilai di atas, tanpa sumbu Y; periode yang ditekankan pekat | WDR `world-bank-adb-imf/wb-wdr-2024/h037.png` (hanya nilai di atas batang; WDR bersumbu Y 0–80 dan batangnya bersudut tegak); ujung membulat, tanpa sumbu Y, dan periode pekat dari gaya rumah d3/d5 | Ya. Selera batang pemilik; kejadian per tahun 2015–2025 |
| G2 | Perubahan waktu, seri panjang | Rata-rata per dekade sebagai batang (≤ 24 batang), atau garis dengan label ujung, anotasi kejadian, dan paling banyak 3 garis acuan nilai | OWID `pemerintah-dataviz/owid/kematian-per-dekade.png`; JWP `pemerintah-dataviz/jepang-whitepaper/h177.png`; WEO `world-bank-adb-imf/imf-weo-2020-oct/h039.png` | Ya, dengan penyesuaian: DIBI 1815–2025, curah hujan harian; tabel data tahunan di lampiran |
| G3 | Musim berjalan lawan normal | Kurva tahun berjalan pekat di atas pita median historis | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h051.png` (hanya pita persentil; aslinya pita model 2000–2100, bukan musim berjalan); kurva musim lawan median dari gaya rumah | Ya. Sudah pola kurva musim pemilik |
| G4 | Peringkat | Batang horizontal terurut, nilai di ujung, nomor peringkat dalam bulatan `navy` | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h021.png` (hanya urutan; aslinya dot plot dan dumbbell tanpa batang dan tanpa nomor); batang dan bulatan nomor dari gaya rumah d5 | Ya. Provinsi dan kab/kota berisiko, dengan kolom jiwa terpapar |
| G5 | Peringkat seluruh wilayah sekaligus | Satu deret batang terurut panjang, nama hanya untuk wilayah yang disorot, kantong perbesaran | CWF `konsultan/mck-air-2009/h059.png` | Ya. 119 kab/kota Jawa menurut defisit; nama tidak boleh bertumpuk |
| G6 | Perubahan antara dua titik per wilayah (2025 lawan 2030, sebelum lawan sesudah) | Dumbbell terurut: titik awal `#DCE1E7`, titik akhir warna makna, selisih ditulis | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h021.png` | Ya. Jiwa terpapar 2025 lawan 2030 per provinsi; kondisi sebelum lawan sesudah tindakan per kab/kota |
| G7 | Deviasi dari nol (surplus atau defisit, anomali) | Batang divergen dari garis nol berlabel kata | FTVV `pemerintah-dataviz/ft-economist/h001-bagian1.png` | Ya, dengan penyesuaian. Neraca air per wilayah sungai dan anomali curah hujan di kajian air memakai batang `teks-2` lawan `#DCE1E7` dengan kata "surplus"/"defisit", bukan warna arah, supaya surplus tidak terbaca oranye (PEDOMAN §B1.5) |
| G8 | Komposisi (bagian dari keseluruhan) | Batang bertumpuk 100%, paling banyak 4 kategori + "lainnya", nilai tiap segmen tertulis; pangsa tunggal = batang 100% satu baris | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h036.png`; BCG `konsultan/bcg-2023/h025.png` | Ya, dengan penyesuaian. Pangsa air lawan pangsa penduduk per pulau sebagai pasangan batang 100% (pengganti tetesan WS45 h043; angkanya dari data). Pai dan donat tidak dipakai (G25) |
| G9 | Komposisi menurut skenario atau tahun | Batang bertumpuk per skenario: dasar dan 2030 (horizon KEPUTUSAN P4); nilai di segmen, total di atas | GAR `pbb-oecd/undrr/h144.png`; DEL `konsultan/deloitte-2021/h015.png` | Ya. Kebutuhan air per sektor per skenario |
| G10 | Kesenjangan kebutuhan lawan pasokan | Waterfall: kebutuhan per sektor, pasokan andal, pil selisih; atau baji kebutuhan lawan pasokan sampai 2030 dengan kurung porsi yang ditutup tiap langkah | CWF `konsultan/mck-air-2009/h016.png`, h017 | Ya. Neraca air Jawa dalam m³; tidak dalam rupiah (KEPUTUSAN P5) |
| G11 | Proyeksi dengan rentang | Pita (fan) melebar ke depan, garis tengah `navy`, angka rentang tertulis, pil "belum diuji balik" | FTVV `pemerintah-dataviz/ft-economist/h001-bagian2.png`; WEO `world-bank-adb-imf/imf-weo-2020-oct/h114.png` | Ya, dengan penyesuaian. Paling banyak 2 pita per grafik |
| G12 | Rentang per wilayah atau skenario | Batang rentang mengambang rendah–tinggi dengan garis median, median ditulis di ujung | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h054.png`; MGI `konsultan/mgi-2020/h096.png` | Ya. Jiwa terpapar per provinsi per skenario |
| G13 | Skenario lawan dasar | Small multiples yang memplot selisih dari skenario dasar | WEO `world-bank-adb-imf/imf-weo-2020-oct/h047.png` | Ya, dengan penyesuaian. Warna mengikuti arah (PEDOMAN §B1.5); di kajian air batang `teks-2` lawan `#DCE1E7` dengan kata "membaik"/"memburuk" |
| G14 | Efek tindakan (sebelum lawan sesudah) | Pasangan batang + label "turun 70%" dengan ikon arah vektor | NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h009.png` | Ya, dengan penyesuaian. Arah turun biru, bukan panah merah |
| G15 | Kerugian bila diam lawan manfaat bila bertindak | Batang kupu-kupu dua sisi, label ancaman dan aksi di poros tengah | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h014.png` | Ya, dengan penyesuaian. 2 skenario, satuan fisik (jiwa, ha) atau rupiah bersumber; nilai di ujung batang |
| G16 | Wilayah × kategori dalam satu halaman | Matriks titik (warna = kelas, isi titik = keyakinan) atau tabel peta panas kelas diskret dengan angka tertulis | IPCC `pbb-oecd/ipcc/h010.png`; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h029.png`; MGI `konsultan/mgi-2020/h038.png` | Ya. Kab/kota × jenis bahaya; kab/kota × 5 komponen air |
| G17 | Kemungkinan × dampak | Matriks 5×5 tint netral seragam, nomor risiko dalam bulatan, daftar bernomor di samping | NRR `pemerintah-dataviz/uk-nrr/h018.png` (nomor polos tanpa bulatan, sampai 11 kode per sel); bulatan `navy` dari gaya rumah d5, angka Bold polos bila sel memuat lebih dari 3 nomor | Ya. Profil ancaman kajian mitigasi |
| G18 | Prioritas (horizon × dampak; urgensi = horizon peta jalan) | Kisi 3×3 berisi kode rekomendasi saja dalam pil `navy`, nama di daftar samping | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h098.png` | Ya, dengan penyesuaian. Gelembung bertumpuk CCDR diganti kisi; tanpa tint bertingkat; hanya bila rekomendasi lebih dari 9 (PEDOMAN §B5.28) |
| G19 | Sebaran geografis rasio atau indeks | Koroplet kelas diskret 5 kelas, satu ramp per keluarga | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h075.png`; FTVV `pemerintah-dataviz/ft-economist/h001-bagian3.png` | Ya. Koroplet hanya untuk rasio dan indeks, tidak untuk total. Pengecualian: kelas IRBI memakai ramp api untuk semua bahaya (KEPUTUSAN T8); ramp keluarga hanya untuk indeks platform |
| G20 | Sebaran geografis total | Simbol proporsional berlegenda tiga ukuran | FTVV `pemerintah-dataviz/ft-economist/h001-bagian3.png`; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h075.png` | Ya. Jumlah kejadian per kab/kota, tanpa bulatan bertumpuk |
| G21 | Aliran (dana, air, tanggung jawab) | Sankey ≤ 3 tingkat untuk aliran fisik bersumber; diagram aliran berikon tanpa lebar sebanding untuk dana dan tanggung jawab | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h120.png`; WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h021.png`; MGI `konsultan/mgi-2020/h032.png` | Ya, dengan penyesuaian. Aliran dana: diagram aliran berikon tanpa lebar sebanding (PEDOMAN §B5.21, §B5.23), karena lebar pita Sankey adalah besaran dan nominal dilarang (KEPUTUSAN P5, K6). Sankey hanya untuk aliran fisik bersumber (m³ air per sektor); rantai layanan air |
| G22 | Capaian lawan target | Bullet chart atau tabel status lawan target | FTVV `pemerintah-dataviz/ft-economist/h001-bagian2.png`; JWP `pemerintah-dataviz/jepang-whitepaper/h101.png` | Ya. Indikator Grand Design: baseline 2025, target 2030 |
| G23 | Kapan dan berapa lama | Tabel tahap × horizon dengan sel tahap berlabel; kronologi dua sisi untuk regulasi | DELTA `pemerintah-dataviz/delta/h087.png`; CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h038.png` | Ya, dengan penyesuaian. Bawaan: kolom WAKTU berpil horizon di matriks rekomendasi; tabel tahap × tahun hanya bila pemilik menyetujui, DOCX saja (§13); kronologi UU 24/2007 sampai Perban 1/2025 |
| G24 | Perbandingan respons antar-kejadian | Garis dengan sumbu "hari sejak kejadian", label langsung di ujung garis | JWP `pemerintah-dataviz/jepang-whitepaper/h053.png` | Ya. Pengungsi, logistik, atau relawan per hari: Palu 2018 lawan Cianjur 2022 |
| G25 | (Dilarang) | Pai lebih dari satu pangsa, donat, sumbu ganda, radar, chord, streamgraph, violin, Voronoi, area bertumpuk > 4 kategori, 3D, lingkaran konsentris, ikon dekoratif sebagai grafik, kurva biaya | JWP `pemerintah-dataviz/jepang-whitepaper/h009.png`, h183; UNICEF `pbb-oecd/unicef/h013.png`; WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h043.png`; DELTA `pemerintah-dataviz/delta/h082.png`; CWF `konsultan/mck-air-2009/h022.png` | Tidak. Sulit dibaca Kepala BNPB, luas menyesatkan, atau bentrok P5 (tanpa biaya proyek) |

Hubungan dua besaran (sebar beranotasi, ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h066.png`)
dan Marimekko (penduduk × indeks, ATLAS h064) hanya di bab analisis DOCX, tidak di PDF
ringkas, dan tanpa kata kerja sebab-akibat (PEDOMAN §C8).

## 6. Peta

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P42 | Daratan abu, satu warna sorot untuk kategori yang dibahas, laut putih, legenda, skala dan utara | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h027.png`, h028 | Tiru | Sorot oranye (api) atau biru (air), bukan merah; sudah sesuai aturan peta pemilik. Pengecualian: kelas IRBI memakai ramp api (KEPUTUSAN T8); ramp keluarga hanya untuk indeks platform |
| P43 | Peta kecil berganda per tahun atau skenario, satu legenda, kelas sama di semua panel | MGI `konsultan/mgi-2020/h023.png`, h030, h080; OECD `pbb-oecd/oecd/h021.png`; NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h006.png`; DEL `konsultan/deloitte-2021/h018.png`; WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h045.png` | Tiru | 2026/2030 atau skenario rendah/sedang/tinggi; lima komponen air Jawa sebagai 2×3; Jawa yang memanjang disusun bertumpuk |
| P44 | Peta indeks studi kasus: bulatan bernomor di peta, tabel nomor dan judul di bawahnya | MGI `konsultan/mgi-2020/h074.png`, h026; MGIA `konsultan/mgi-asia-2020/h060.png` | Tiru | Pembuka bab studi kasus dan bab preseden; nomor sama di peta dan tabel; judul berupa temuan |
| P45 | Koroplet dan tabel peringkat berdampingan; kurung kelas di samping tabel sekaligus menjadi legenda dan hitungan | JWP `pemerintah-dataviz/jepang-whitepaper/h101.png` | Tiru | 6 provinsi atau 119 kab/kota Jawa; warna kelas di tabel = warna di peta |
| P46 | Koroplet hanya untuk rasio atau laju; simbol proporsional untuk total | FTVV `pemerintah-dataviz/ft-economist/h001-bagian3.png` | Tiru | Mencegah koroplet jumlah korban yang hanya menggambar sebaran penduduk |
| P47 | Inset perbesaran bergaris abu untuk kawasan padat | OECD `pbb-oecd/oecd/h087.png`; WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h016.png` | Tiru | Jabodetabek dan pesisir Semarang–Demak di peta Jawa |
| P48 | Label wilayah dengan angka dan garis penunjuk ("22% of GDP WS Ciliwung-Cisadane"); hanya wilayah terbesar yang diwarnai dan dilabel | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h016.png`; DEL `konsultan/deloitte-2021/h019.png` | Tiru dengan penyesuaian | Pil putih bergaris abu ("Jember 19"), angka tegak, tanpa tumpuk |
| P49 | Legenda berupa pil warna per wilayah dengan satu kalimat arah strategi | DELTA `pemerintah-dataviz/delta/h052.png` (delapan warna wilayah termasuk ungu, merah muda, dan hijau; paragraf 2–5 baris per pil) | Tiru dengan penyesuaian | Per wilayah sungai Jawa (Citarum, Ciliwung-Cisadane, Pemali-Comal, Bengawan Solo, Brantas): nomor putih dalam bulatan `navy` dan batas 1 pt `teks-2`, tanpa isi warna; legenda berupa pil nama 2–3 kata; kalimat arah 2030 pindah ke tabel tepat di bawah peta (No, Wilayah sungai, Arah 2030). Warna per wilayah tidak dipakai (PEDOMAN §B1.3, §B1.6, D-9) |
| P50 | Peta bahaya disandingkan peta keterpaparan; elips tipis menandai kawasan padat dengan angka besar | MGIA `konsultan/mgi-asia-2020/h027.png` | Tiru dengan penyesuaian | Inti kajian risiko; anotasi berupa pil putih, elips tidak menutupi data |
| P51 | Peta pesan utama: peta pucat dengan 4–5 lokasi berketerangan pendek | DELTA `pemerintah-dataviz/delta/h012.png` | Jangan | Gaya kampanye: judul slogan, lingkaran ilustrasi, latar peta hijau. Sesudah slogan, ilustrasi, dan latar dibuang (P25, P100), strukturnya sudah tercakup P44 (peta indeks bernomor) |
| P52 | Laut biru, bayangan relief, skala pelangi atau ungu, pai di atas peta, legenda 30 warna | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h045.png`; UNICEF `pbb-oecd/unicef/h016.png`; WMO `pbb-oecd/wmo/h006.png`, h016; GAR `pbb-oecd/undrr/h065.png` | Jangan | Pemilik: *"petanya belakangnya jangan biru"*; ungu terlarang (PEDOMAN §B1.6); pai di atas peta bertumpuk (gerbang D-8) |
| P53 | Legenda gradien kontinu | BCG `konsultan/bcg-2023/h011.png`; GAR `pbb-oecd/undrr/h143.png` | Jangan | Kelas diskret 5 tingkat berlabel kata lebih terbaca di cetak; tanpa data diarsir |

## 7. Ketidakpastian dan skenario

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P54 | Pita persentil 25–75 dengan median tebal dan garis tegak tahun sekarang | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h051.png` | Tiru dengan penyesuaian | Garis per model dibuang; tahun 2026 dan 2030 ditandai |
| P55 | Batang rentang rendah–tinggi dengan median; batang gelap nilai tinggi, muda nilai rendah | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h054.png`; MGI `konsultan/mgi-2020/h033.png`, h096; BCG `konsultan/bcg-2023/h016.png` | Tiru | Rentang ditulis dengan en dash dan format id-ID ("1.200–4.800 jiwa"); rasio dari literatur luar negeri yang dipakai untuk Indonesia diberi pil "Asumsi kebijakan", rasio hasil model diberi pil "Estimasi model, belum diuji balik" (PEDOMAN §C6.2) |
| P56 | Garis solid untuk data, titik-titik untuk proyeksi, arsir untuk estimasi atau data tidak lengkap | ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h065.png`, h036 | Tiru dengan penyesuaian | Data `navy`, proyeksi garis putus, estimasi arsir, ditambah pil "Estimasi model, belum diuji balik" |
| P57 | Kotak skenario: asumsi tiap skenario dan small multiples deviasi dari dasar | WEO `world-bank-adb-imf/imf-weo-2020-oct/h047.png` | Tiru dengan penyesuaian | Skenario dasar, bila aksi berjalan, bila tidak; warna mengikuti arah (PEDOMAN §B1.5), di kajian air batang `teks-2` berlabel "membaik"/"memburuk" |
| P58 | Kotak "dampak bila tidak ditangani" berisi butir dengan angka tebal | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h016.png`, h021 | Tiru dengan penyesuaian | Panel berpita tint keluarga, bukan garis putus-putus |
| P59 | Tabel perkiraan lama lawan baru: rentang "sekitar", asumsi tertulis, stempel skenario | NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h005.png` | Tiru | IRBI/RENAS lama lawan kajian ini; neraca air dokumen lama lawan hitungan baru; kolom kajian ini Bold |
| P60 | Tabel skenario: kolom = skenario, sel digabung bila nilainya sama di semua skenario | NANKAI `pemerintah-dataviz/jepang-nankai/saidai/h017.png` | Tiru | Kemarau normal, El Niño, La Niña; megathrust siang lawan malam; bagian yang tidak bergantung skenario terlihat dari sel gabung |
| P61 | Efek tindakan: pasangan batang kondisi sekarang lawan bila target tercapai | NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h009.png` | Tiru dengan penyesuaian | Angka kebijakan kartu skenario (PEDOMAN §B5.11 butir 5) digambar sebagai G14; turun biru, pil "belum diuji balik" bila dari model |
| P62 | Matriks kemungkinan × dampak satu warna dan kartu mini per ancaman dengan garis silang rentang keyakinan | NRR `pemerintah-dataviz/uk-nrr/h018.png` (nomor polos, sampai 11 per sel), h160, h017 | Tiru | Matriks risiko nasional di bab profil risiko; kartu mini di tiap kartu skenario; tint `#E6EAF0`; nomor dalam bulatan `navy` (gaya rumah d5), angka Bold polos bila sel memuat lebih dari 3 nomor |
| P63 | Bara risiko per skenario respons dengan titik keyakinan tiap transisi | IPCC `pbb-oecd/ipcc/h016.png`, h017 | Tiru dengan penyesuaian | Kelas risiko menurut skenario respons atau horizon; 5 kelas ramp berlabel teks, pil "Penilaian pakar" (PEDOMAN §C6.2) |
| P64 | Strip kelas per skenario × tahun dengan penanda tahun sekarang | GAR `pbb-oecd/undrr/h143.png` | Tiru dengan penyesuaian | Kelas defisit air dan laju penurunan muka tanah; 5 kelas diskret, ilustrasi dibuang |
| P65 | Banyak sumber digambar bersama sebagai tampilan ketidakpastian | WMO `pbb-oecd/wmo/h006.png` | Tiru dengan penyesuaian | BMKG, CHIRPS, ERA5: seri utama pekat, sumber lain garis tipis abu; rentang antarsumber ditulis |
| P66 | Tabel nilai "± ketidakpastian" dengan baris pembanding bertint | WMO `pbb-oecd/wmo/h015.png` | Tiru dengan penyesuaian | Baris Jawa atau nasional bertint `#E6EAF0`, angka rata kanan, kepala tegak |
| P67 | Kolom proyeksi berlatar tint dibedakan dari kolom aktual | WEO `world-bank-adb-imf/imf-weo-2020-oct/h028.png` | Tiru dengan penyesuaian | Kolom target dan proyeksi berlatar `#F3F5F8` di tabel indikator dan tabel skenario |

## 8. Kotak pesan kunci dan studi kasus

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P68 | Kotak temuan bernomor dengan kalimat temuan di baris pertama | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h051.png`, h068 | Tiru dengan penyesuaian | Kotak temuan kunci PEDOMAN §B5.5, label "Kotak 5.1" lewat Caption, satu kolom |
| P69 | Studi kasus satu halaman bertint dengan empat pertanyaan tetap: masalah apa, siapa yang mengerjakan, bagaimana, apa hasilnya | DELTA `pemerintah-dataviz/delta/h033.png` | Tiru | Templat studi kasus kedua kajian (Waduk Jatigede, sumur resapan, Destana); pil "STUDI KASUS", tint `#F3F5F8`, foto Commons |
| P70 | Kotak studi kasus berisi grafik dan sumber di dalam kotak | GAR `pbb-oecd/undrr/h144.png`; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h092.png`; WMO `pbb-oecd/wmo/h024.png` | Tiru dengan penyesuaian | Tint netral, bukan warna bab; kalimat temuan Bold di baris pertama |
| P71 | Kotak perbandingan dengan kajian sebelumnya | DEL `konsultan/deloitte-2021/h011.png` | Tiru dengan penyesuaian | "Perbandingan dengan kajian sebelumnya" (IRBI lama, kajian air terdahulu) sebagai kotak Catatan bertint muda, bukan panel gelap |
| P72 | Grafik di kiri dan kolom pesan kunci 3–4 butir di kanan dalam satu blok | GAR `pbb-oecd/undrr/h165.png` | Tiru dengan penyesuaian (PDF ringkas saja) | Hanya di PDF ringkas (HTML): satu topik satu kontainer, paling banyak 3 butir berangka, latar putih. Di DOCX ketiga pesan ditulis sebagai kalimat pembuka tebal paragraf di bawah gambar, karena kolom samping di Word rapuh (P12) dan butir yang mengulang angka grafik termasuk teks tanpa informasi baru (P30). Dua pai di bukti GAR tidak ditiru (G25) |
| P73 | Kotak metode bergaris tipis; daftar pertanyaan pemangku kepentingan sebagai pengganti rekomendasi | MGI `konsultan/mgi-2020/h048.png` | Tiru dengan penyesuaian (metode); Jangan (pertanyaan) | Kotak metode jadi kotak Catatan yang merujuk Lampiran Metode; rekomendasi tetap matriks berlembaga |
| P74 | Foto pimpinan dan kotak kata pimpinan di halaman pesan kunci; kolom testimoni dan sidebar kisah personal (JWP hlm 40 dan 48, UNICEF "Youth perspectives", tanpa PNG bukti) | WMO `pbb-oecd/wmo/h004.png` | Jangan | Teks tanpa angka dibuang; register formal (K13); foto pejabat bukan foto Commons |
| P108 | Tabel preseden: kejadian besar sebagai kolom, besaran yang sama sebagai baris, kolom yang sedang dikaji diberi tint | JWP `pemerintah-dataviz/jepang-whitepaper/h009.png` | Tiru | Bab preseden: Aceh 2004, Yogyakarta 2006, Palu 2018, Cianjur 2022; kekeringan Jawa 2015, 2019, 2023; kolom yang dikaji `#FDF1E8`, kepala berikon jenis |

## 9. Rekomendasi berlembaga

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P75 | Kartu rekomendasi berkode: masalah singkat di kiri, kalimat aksi tebal dan rincian abu di kanan, penilaian urgensi dan dampak | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h090.png`, h092 | Tiru dengan penyesuaian | Matriks rekomendasi PEDOMAN §B5.13; ditambah pemimpin, pendukung, tahun (tidak ada di CCDR); urgensi dibaca dari pil horizon di kolom WAKTU (urgensi = horizon peta jalan), bukan tiga kotak mini dan bukan pil urgensi terpisah |
| P76 | Matriks rekomendasi dengan penanggung jawab, tenggat, dan target per pilar | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h125.png`, h133 | Tiru dengan penyesuaian | Matriks tegak: Kode, Aksi, Pemimpin, Pendukung, Tahun, Indikator; halaman diputar dan sel sempit rata kiri-kanan tidak ditiru |
| P77 | Matriks prioritas urgensi × dampak satu halaman, didahului kunci penilaian | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h098.png`, h089 | Tiru dengan penyesuaian | Kisi 3×3 horizon × dampak berisi kode saja dalam pil `navy`, daftar nama di samping, tanpa tint bertingkat (oranye berarti api dan naik); hanya bila rekomendasi lebih dari 9 (G18; PEDOMAN §B5.28) |
| P78 | Tabel pemrograman: kode, pengelola, proyek, lalu kolom tahun dengan sel huruf tahap berwarna dan legenda | DELTA `pemerintah-dataviz/delta/h087.png` | Tiru dengan penyesuaian, belum diputus | Bawaan: tidak dibuat; waktu ditulis sebagai kolom WAKTU berpil horizon di matriks rekomendasi, mengikuti satu-satunya sinyal pemilik (Gantt dibuang dari slide rekomendasi d5). Bila pemilik menyetujui: hanya DOCX bab Peta Jalan, program × tahun × tahap (Kajian, Perencanaan, Pelaksanaan, Evaluasi), tabel native (§13) |
| P79 | Rekomendasi per aktor: paragraf diawali nama aktor | NRR `pemerintah-dataviz/uk-nrr/h161.png` | Tiru dengan penyesuaian | Nama aktor menjadi chip berikon (BNPB dan K/L, Pemda dan BPBD, dunia usaha, masyarakat), 1–2 butir aksi per chip |
| P80 | Matriks strategi tahap × pilar berisi butir aksi; dial jarum untuk prioritas | WDR `world-bank-adb-imf/wb-wdr-2024/h059.png`, h039 | Tiru dengan penyesuaian (matriks); Jangan (dial) | Horizon peta jalan × pilar; dial berupa gambar dan tidak bisa disunting, diganti pil native |
| P81 | Matriks langkah × jenis bahaya, sel skala 4 tingkat, huruf merujuk studi kasus | MGIA `konsultan/mgi-asia-2020/h030.png` | Tiru dengan penyesuaian | Tulang punggung matriks fase × jenis kajian mitigasi; kode program bernomor, tint rumah berlegenda |
| P82 | Halaman daftar aksi bernomor sebagai pembuka bab rekomendasi | GAR `pbb-oecd/undrr/h014.png` | Tiru dengan penyesuaian | Ikon garis dalam lingkaran, bukan ilustrasi stok; tiap aksi merujuk nomor matriks dan lembaga pemimpin |
| P83 | Tabel status sekarang lawan target bertenggat | JWP `pemerintah-dataviz/jepang-whitepaper/h101.png` | Tiru | Tabel indikator PEDOMAN §B5.19 |
| P84 | Matriks kelayakan opsi: opsi × dimensi kelayakan, ukuran titik dan keyakinan | IPCC `pbb-oecd/ipcc/h022.png` | Tiru dengan penyesuaian | Perbandingan opsi kebijakan: regulasi, kelembagaan, teknis, sosial, data; tanpa biaya; tegak |
| P85 | Kronologi kebijakan dua sisi dengan tahun tebal dan kode jenis regulasi | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h038.png` | Tiru | Tabel 3 kolom native: UU 24/2007, PP 21/2008, UU 17/2019, Perpres 87/2020, Perban 1/2025 |
| P86 | Bagan kelembagaan bertingkat; diagram siapa menanggung risiko | WS45 `world-bank-adb-imf/wb-indonesia-water-security-2045/h039.png`; MGI `konsultan/mgi-2020/h032.png` | Tiru dengan penyesuaian | Kotak native atau diagram vektor PEDOMAN §B5.23; lembaga sebagai chip berikon, panah tidak bersilang |
| P87 | Rekomendasi berupa prosa tanpa kode, penanggung jawab, atau tahun | ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h109.png`; DEL `konsultan/deloitte-2021/h023.png` | Jangan | Tidak bisa ditindaklanjuti; tabel LANGKAH, RINCIAN, PENANGGUNG JAWAB milik pemilik tetap dipakai |
| P88 | Kurva biaya langkah (lebar = volume, tinggi = biaya per satuan) dan neraca dana kebutuhan lawan anggaran dalam rupiah | CWF `konsultan/mck-air-2009/h022.png`, h025, h101, h105; MGIA `konsultan/mgi-asia-2020/h119.png`; DELTA `pemerintah-dataviz/delta/h080.png` | Jangan (nominal); struktur neraca dipakai untuk air | KEPUTUSAN P5 dan K6: tanpa pagu dan biaya proyek. Struktur kebutuhan, ketersediaan, selisih, dan rentang dipakai untuk neraca air dalam m³ (G10) |

## 10. Tipografi dan warna

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P89 | Satu keluarga huruf sans di seluruh laporan; GAR terutama Roboto (pdffonts juga menunjukkan Calibri, Gill Sans MT, Myriad Pro, Times, serta Roboto Light dan Black yang ditolak P96), WDR memakai Roboto di grafik | GAR `pbb-oecd/undrr/h020.png`; WDR `world-bank-adb-imf/wb-wdr-2024/h037.png`; JWP `pemerintah-dataviz/jepang-whitepaper/h008.png` | Tiru | Bukti bahwa Roboto saja (K2) cukup untuk laporan kelas dunia; Roboto Black tidak dipakai di DOCX karena belum tentu terpasang, pakai Bold |
| P90 | Hierarki dari bobot dan warna; huruf terbesar halaman isi 12–13 pt | IPCC `pbb-oecd/ipcc/h010.png`, h008 | Tiru | Sudah PEDOMAN §B2 |
| P91 | Navy + satu aksen + abu pembanding; navy McKinsey `#051C2C` identik dengan navy rumah BNPB | WDR `world-bank-adb-imf/wb-wdr-2024/h037.png`; MGIA `konsultan/mgi-asia-2020/h030.png`; ATLAS `world-bank-adb-imf/wb-atlas-sdg-2018/h021.png` | Tiru | Aksen cyan McKinsey diganti oranye `#D9600B` (angka kunci, api) atau biru `#2F86D1` (air); pembanding `#DCE1E7` |
| P92 | Isi satu kolom 10–10,5 pt rata kiri-kanan, penomoran bertingkat polos | JWP `pemerintah-dataviz/jepang-whitepaper/h008.png`; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h029.png` | Tiru | Sudah SPESIFIKASI §1 dan PEDOMAN §B2 |
| P93 | Kapital berspasi untuk kepala kolom, legenda, dan kaki berjalan; judul bagian kapital | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h036.png`; WMO `pbb-oecd/wmo/h006.png` | Tiru dengan penyesuaian | Kapital berspasi hanya pil bagian, kepala kolom, label pita (pemilik); judul bab mengikuti KEPUTUSAN T1 |
| P94 | Kode warna per bab yang mengalir ke subjudul, grafik, dan kotak | GAR `pbb-oecd/undrr/h005.png`, h017 | Jangan | Di kajian warna = makna (keluarga bencana, arah); oranye tidak boleh berarti "bab 5" di satu halaman dan "api" di halaman lain |
| P95 | Palet banyak warna, pita climate stripes, hijau ADB, merah murni dan biru bawaan Office | CCDR `world-bank-adb-imf/wb-indonesia-ccdr-2023/h022.png`; ADB `world-bank-adb-imf/adb-asia-pacific-climate-report-2024/h027.png`; NANKAI `pemerintah-dataviz/jepang-nankai/setumei/h005.png` | Jangan | Palet BNPB final; merah `#C8102E` hanya bahaya dan perlu perhatian |
| P96 | Huruf Light tipis untuk isi; serif untuk judul | NRR `pemerintah-dataviz/uk-nrr/h160.png`; MGI `konsultan/mgi-2020/h014.png`; DELTA `pemerintah-dataviz/delta/h032.png` | Jangan | Roboto Regular dan Bold saja; Light tipis kurang terbaca saat dicetak |

## 11. Ikon dan foto

| No | Pola | Laporan dan bukti | Vonis | Penerapan di kajian BNPB |
| --- | --- | --- | --- | --- |
| P97 | Ikon putih dalam lingkaran solid sebagai penanda temuan | WMO `pbb-oecd/wmo/h004.png` | Tiru | Halaman Pesan Kunci (P16); registri ikon PEDOMAN §B5.14 |
| P98 | Daftar berikon bernomor: lingkaran ikon, lencana nomor, judul pendek, contoh berangka | BCG `konsultan/bcg-2023/h009.png` | Tiru | Sama dengan daftar status pemilik; contoh berangka wajib bersumber |
| P99 | Kepala kolom atau kepala grup baris berupa ikon di ubin atau lingkaran | IPCC `pbb-oecd/ipcc/h010.png`; BCG `konsultan/bcg-2023/h011.png` | Tiru | Kepala matriks titik dan tabel ringkasan berikon dalam lingkaran |
| P100 | Ilustrasi stok, ikon isometrik, kiasan, tulisan melengkung, ilustrasi lanskap | GAR `pbb-oecd/undrr/h014.png`; DEL `konsultan/deloitte-2021/h022.png`; IPCC `pbb-oecd/ipcc/h030.png`; DELTA `pemerintah-dataviz/delta/h032.png`, h040 | Jangan | Gambar hanya foto, peta, logo, ikon garis datar; ilustrasi AI dilarang (K5) |
| P101 | Foto beratribusi dengan keterangan tempat dan waktu, satu foto membawa informasi | MGI `konsultan/mgi-2020/h051.png`; BCG `konsultan/bcg-2023/h014.png` | Tiru dengan penyesuaian | Foto Wikimedia Commons beratribusi lisensi (PEDOMAN §B5.15), paling banyak satu per subbab |
| P102 | Foto anak atau korban, potret pejabat di halaman isi | UNICEF `pbb-oecd/unicef/h001.png`; WMO `pbb-oecd/wmo/h004.png` | Jangan | Etika kemanusiaan dan UU 27/2022; PEDOMAN §B5.15 |
| P103 | Sampul foto di atas dan blok warna berisi judul di bawah | OECD `pbb-oecd/oecd/h001.png`; WMO `pbb-oecd/wmo/h001.png` | Tiru | Sama dengan PEDOMAN §B5.1 (foto Commons atas, blok navy bawah); ikon tema di sampul tidak perlu |

## 12. Bentrok dengan aturan pemilik (aturan pemilik menang)

| Pola dunia | Laporan | Aturan yang menang | Sumber aturan |
| --- | --- | --- | --- |
| Baris subjudul indikator dan satuan di bawah judul | CCDR, ATLAS, WEO, MGI, OECD, CWF | Satuan dan periode dilebur ke keterangan atau legenda. Kartu Insight adalah aturan layar situs; di kertas kepala grafik pola pemilik (nama besaran, perubahan neto) satu baris tanpa satuan dan periode, dan "Catatan:" paling banyak satu baris | Buku Pegangan, Kartu Insight dan Komponen (kepala grafik); PEDOMAN §B5.10 |
| Sumbu Y dan garis kisi | hampir semua | Batang tanpa sumbu Y, nilai di atas; seri panjang diringkas atau dibuat garis | Buku Pegangan, grafik batang harian; PEDOMAN §B5.10 |
| Judul aksi berangka di setiap objek | MGI, WDR, ATLAS | Belum diputus (§13). Bawaan: keterangan gambar dan tabel deskriptif stabil, temuan berangka di kalimat pembuka tebal paragraf (PEDOMAN §C2, T14), karena vonis pemilik 23 Okt soal judul deskriptif lebih baru dan tidak dibatasi ke deck. Di deck: aturan judul per jenis deck pemilik | Buku Pegangan, Riwayat 23 Okt dan bab Selera presentasi, Judul; PEDOMAN §0.1 (vonis lebih baru menang) |
| Panah merah untuk pengurangan, sorot merah di peta, merah sebagai warna umum | NANKAI, CCDR, ATLAS | Turun biru `#2F86D1`; sorot oranye atau biru; merah hanya bahaya dan perlu perhatian | Buku Pegangan, Tipografi dan warna |
| Warna valensi (membaik biru, memburuk oranye) | WEO | Warna mengikuti arah; besaran baik-buruk di kajian air (surplus/defisit, membaik/memburuk) memakai batang `teks-2` lawan `#DCE1E7` berlabel kata | PEDOMAN §B1.5 |
| Warna per wilayah dan paragraf di legenda | DELTA | Nomor dalam bulatan `navy` tanpa warna baru; legenda pil nama; kalimat arah di tabel | PEDOMAN §B1.3, §B1.6, §B5.9, D-9; Buku Pegangan, Pakai label bukan kalimat |
| Huruf grafik 5,9–7 pt | CCDR, ATLAS, MGI, DEL | ≥ 8 pt di laporan | SPESIFIKASI §12; PEDOMAN §B2 |
| Latar gelap untuk infografik dan exhibit | MGI, BCG, DEL | Latar putih, tanpa panel gelap | Buku Pegangan, Satu topik satu kontainer; Lebar dan ruang |
| Laut biru, relief, skala pelangi atau ungu | WS45, UNICEF, WMO | Latar putih, tanpa laut biru, legenda wajib | Buku Pegangan, Peta deck berlatar putih |
| Serif, dua kolom, Light, A4 lanskap | IMF, WS45, WDR, CWF, MGI, NRR, UNICEF | Roboto saja, satu kolom, A4 tegak | K2; Buku Pegangan, Hanya Roboto |
| Kontras "X, not just Y" di judul | WDR | Tanpa kontras retoris | Buku Pegangan, Bahasa lugas (19 Okt) |
| Halaman kutipan besar, kesimpulan bergaya | BCG | Tanpa slogan dan kalimat penutup bergaya | Buku Pegangan, Bahasa lugas |
| Kurva biaya dan neraca anggaran rupiah | CWF, MGIA, DELTA | Tanpa pagu dan biaya proyek | KEPUTUSAN P5; PEDOMAN K6 |
| Gantt atau tabel tahap × tahun | DELTA | Tidak di deck dan PDF ringkas; di DOCX hanya bila pemilik menyetujui (§13) | Buku Pegangan, penghapusan pemilik di d5 |
| Baris sumber di bawah grafik | semua | Di DOCX dan PDF tetap wajib ("Sumber:"); di deck dibuang sesuai keputusan pemilik | Buku Pegangan, Keterangan jadi label (deck); PEDOMAN D-7 (laporan) |
| Kode warna per bab | GAR | Warna = makna, bukan bab | PEDOMAN §B1.8 |
| Pai banyak irisan, sumbu ganda | JWP | Batang terurut berangka; dua grafik kecil | Selera batang pemilik |

## 13. Belum diputus, dengan bawaan yang dipakai

Pemilik meminta tidak ada pertanyaan lagi (`KEPUTUSAN.md`), jadi tiap butir di bawah sudah
berbawaan dan bisa dibalik pemilik.

| No | Pertanyaan | Bawaan yang dipakai | Bila dibalik |
| --- | --- | --- | --- |
| 1 | Peta bernomor sendiri dengan Daftar Peta (P11) | Peta tetap seri Gambar | Tambah SEQ "Peta" dan bidang Daftar Peta; D-7 menghitung dua seri |
| 2 | Tabel tahap × tahun pola Delta (P78) | Tidak dibuat; kolom WAKTU berpil horizon di matriks rekomendasi saja, mengikuti satu-satunya sinyal pemilik (Gantt dibuang dari slide d5) | Dipakai hanya di DOCX bab Peta Jalan, sel tahap berupa pil native (Kajian, Perencanaan, Pelaksanaan, Evaluasi); tidak di deck dan PDF ringkas |
| 3 | Kelas IRBI banjir dan kekeringan di kajian air ikut oranye (ramp api, KEPUTUSAN T8), sementara G19 dan P42 memakai warna keluarga untuk indeks platform | T8 apa adanya: semua kelas IRBI ramp api | `skala.irbi.ramp` di `tema.json` diganti per keluarga |
| 4 | Keterangan gambar: judul aksi berangka (P22) atau deskriptif | Deskriptif stabil (besaran, tempat, periode, satuan); temuan berangka di kalimat pembuka tebal (P17) | Kalimat temuan berangka ≤ 2 baris; kutipan pemilik dicatat di Riwayat PEDOMAN |
| 5 | Judul slide deck kajian (tabel Judul Buku Pegangan belum punya barisnya) | Kalimat temuan ≤ 2 baris, angka oranye, seperti Paparan Presiden lampiran | Judul topik deskriptif seperti deck wilayah |

## 14. Sepuluh pola paling berpengaruh

1. **Ringkasan bertingkat dengan halaman Pesan Kunci** (P1, P16, P18): tesis, lalu 6–8
   temuan bernomor "Temuan A.1" sampai "Temuan C.n" berikon dalam lingkaran, satu temuan per
   butir, angka di depan. WMO h004 (ikon), IPCC h009 (kode bertingkat dengan keyakinan), MGI h010.
2. **Kalimat pembuka tebal di tiap paragraf temuan** (P17): Kepala BNPB bisa membaca bab hanya
   lewat kalimat tebal. OECD h011, CCDR h017.
3. **Keterangan gambar deskriptif yang stabil, satuan dilebur, tanpa baris subjudul; temuan
   berangka di kalimat pembuka tebal** (P22, P33, P17; bawaan PEDOMAN T14): MGI h033, ATLAS h007.
4. **Anatomi exhibit tetap dengan pil kanan atas** untuk label keyakinan, skenario, atau
   sasaran (P32, P38): MGI h023, ATLAS h036.
5. **Kamus pilih grafik menurut pesan** (G1–G25): FTVV ditambah contoh nyata; pai, donat,
   sumbu ganda, dan area bertumpuk lebih dari 4 kategori ditolak.
6. **Peta kecil berganda satu legenda** untuk tahun, skenario, dan komponen (P43), plus
   koroplet untuk rasio dan simbol untuk total (P46): MGI h023, OECD h021, NANKAI h006.
7. **Ketidakpastian ditulis sebagai rentang**: pita persentil, batang rentang, fan chart,
   garis putus untuk proyeksi, tabel lama lawan baru (P54–P56, P59): ADB h051 dan h054,
   NANKAI h005.
8. **Matriks kemungkinan × dampak dan kartu per ancaman** (P4, P62): NRR h018, h160.
9. **Matriks rekomendasi berkode dengan pemimpin, pendukung, tahun, dan dasar temuan**
   (P75, P76, P77): CCDR h090 dan h098, WS45 h125.
10. **Studi kasus satu halaman empat pertanyaan tetap dan grafik efek tindakan** (P69, P61):
    DELTA h033, NANKAI h009.

## 15. Catatan sumber

- Atlas SDG 2023 hanya terbit sebagai situs interaktif tanpa PDF; edisi cetak 2018 yang
  dibedah.
- imf.org, undrr.org, oecd.org, dan library.wmo.int menolak unduhan otomatis atau memasang
  tantangan anti-bot; tantangan itu tidak dilewati. WEO diambil dari IMF eLibrary resmi,
  GAR2025 dari repositori ICIMOD, WMO Asia 2024 dari GHHIN, OECD dari developmentaid.org
  (nama berkas asli `d492583a-en.pdf`). Tiga PDF McKinsey diambil sebagai salinan byte URL
  resmi lewat web.archive.org; BCG dari situs ko-penerbit GRP.
- Deltaprogramma 2026 versi Inggris lengkap belum terbit; dipakai edisi Belanda resmi.
- Panduan grafik The Economist tidak bisa diunduh (halaman JavaScript, arsip 503), jadi
  tidak dinilai.
- Folder ini 397 MB (dicek 23 Okt), termasuk `deck/`, dan seluruh `data/kajian-bnpb/` belum
  dilacak git. `git check-ignore` tidak menahan PDF maupun PNG di sini, jadi satu
  `git add data/kajian-bnpb` akan memasukkan semua PDF, termasuk tiga salinan McKinsey dari
  web.archive.org. PNG halaman WEO bertanda "©International Monetary Fund. Not for
  Redistribution". Gerbang yang dibutuhkan, belum dipasang: `data/kajian-bnpb/riset/desain-benchmark/**/*.pdf`
  di `.gitignore`; bila repo publik, PNG folder `world-bank-adb-imf/imf-weo-2020-oct/` juga
  ditahan atau diganti potongan yang lebih kecil. Sampai gerbang itu ada, PDF di sini tidak
  di-commit.
- `pbb-oecd/ipcc/h009.png` dirender dari halaman 9 PDF SPM (60 dpi, sama dengan PNG IPCC lain)
  pada tinjauan 23 Okt, karena h008 dan h016 tidak memuat temuan bernomor B.1 dan B.1.1 yang
  menjadi bukti P18.
- Kolom bukti hanya menyebut yang tampak di PNG. Unsur yang berasal dari deck pemilik ditandai
  "gaya rumah d3/d5" (kode deck di Buku Pegangan bab Selera presentasi), bukan dari laporan dunia.
- Deck di luar cakupan berkas ini. Folder `deck/` (enam deck McKinsey, BCG, dan Bain di `mbb/`,
  empat deck Deloitte dan KPMG di `big4/`, 137 PNG) sudah diunduh tetapi belum dibedah. Sampai ada
  sintesis deck tersendiri di folder itu, deck kajian mengikuti Buku Pegangan bab Selera presentasi
  (`KEPUTUSAN.md` P14), dengan judul slide berbawaan PEDOMAN T15 (§13 butir 5).
