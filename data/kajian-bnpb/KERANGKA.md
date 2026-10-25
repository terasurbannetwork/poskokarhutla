# Kerangka dokumen dua kajian BNPB

Versi 3 (grand design final), 23 Oktober 2026; diperbarui 24 Oktober 2026 dengan putusan uji verifikasi atas v3
(§1.2) dan hasil pembukaan dokumen primer (`riset/E-dokumen-primer.md`, §8). Menggantikan versi 2, yang disimpan di
`riset/KERANGKA-v2.md`. Disusun dari keputusan pemilik dan bawaan orkestrator (`KEPUTUSAN.md`), Buku Pegangan
(`docs/buku-pegangan/pantau-bencana.md`), riset A–E (`riset/`), README delapan paket data (`data/*/README.md`), korpus
JDIH lokal (`data/raw/hukum/teks`, indeks `data/raw/hukum/indeks.json`), dan uji adversarial atas versi 2 (133 temuan,
§1.1).

Urutan otoritas tetap: `KEPUTUSAN.md` dan Buku Pegangan, lalu berkas ini, lalu `PEDOMAN-DESAIN.md`. Bila berkas ini mengubah isi
yang juga ditulis PEDOMAN (§A2, §A3, §A6, §B5.11, §B5.26, §B7.4, §B7.5), berkas ini berlaku untuk isi; daftar
penyesuaian yang wajib dibawa ke PEDOMAN dan paket data ada di §10.

**Konvensi.** Path relatif ke `data/kajian-bnpb/`. Halaman = isi utama di luar bagian depan, Daftar Pustaka, dan
lampiran (T5, T9); angka halaman adalah batas atas, bukan target yang diisi paksa. Kode komponen B5.x dan pilihan
grafik G1–G25 mengikuti PEDOMAN §B5 dan tabel pilih grafik §B5.10. Angka di berkas ini sudah dibaca dari paket data
atau korpus pada 23 Oktober 2026. Angka berlabel sekunder hanya pembanding dan tidak masuk naskah final sebelum
sumber primernya dibuka (§8). Slot `{a}`, `{b}` diisi token `{{angka:<kunci>}}` saat naskah dibangun (PEDOMAN §B7.3).

---

## 0. Perubahan utama dari versi 2

1. **Skenario terburuk berlantai kejadian nyata.** Skenario terburuk tidak boleh lebih ringan daripada korban
   tercatat terbesar dalam seri DIBI untuk wilayah yang sama. Musim hujan 2025/2026 (1.506 meninggal, 186 hilang)
   menjadi lantai nasional, di atas batas atas model musim analog La Niña (1.204). Nama "La Niña" keluar dari judul.
2. **Musim 2026/2027 punya tempat.** Rencana Aksi Musim Hujan 2026/2027 dan Kesiapan Musim Kemarau 2027 menjadi
   subbab bernama di kedua kajian, dengan hari ke-0 = tanggal penetapan Kepala BNPB dan daftar keputusan 14 hari.
   Kajian mitigasi mendapat subbab Operasi Musiman (kemarau dan musim hujan).
3. **Kuantifikasi jujur per jenis.** Kartu skenario mengikuti format Perban BNPB 2/2023 (karakteristik ancaman,
   skenario kejadian, asumsi dampak lima aspek) dengan matriks ketersediaan kuantifikasi. DALY dan luka dihapus.
   Korban tsunami tidak dikuantifikasi sampai genangan InaRISK dipakai. Nonalam dan sosial memakai kartu analog
   berangka tanpa perkalian. Tiga besaran kerugian dipisah.
4. **Batas mandat ditulis eksplisit.** UU 17/2019 Pasal 35 menjadi jangkar batas rezim air dan rezim PB. Pola dan
   Rencana PSDA dirujuk, rekomendasi per wilayah sungai turun ke BBWS dan daerah irigasi kewenangan pusat. Kerusuhan
   sosial didefinisikan menurut UU 24/2007 Pasal 1 angka 4 dan UU 7/2012 Pasal 1 angka 1. UU 6/2018 diganti UU 17/2023.
5. **IRBI tanpa peringkat, DIBI berpatahan.** Kab/kota masuk "daftar perhatian" lewat aturan syarat, bukan indeks.
   Tren IRB hanya 2015–2024. Sasaran utama memakai indikator korban Renas PB 1.a dan 1.b yang terukur dari DIBI.
6. **Program bertingkat bukti.** Lima posisi paket `program-terbukti` ditambah kategori "aksi wajib menurut
   peraturan". Program luar negeri tidak diberi status Indonesia. Agenda bukti 2026–2030 ditambahkan.
7. **Rekomendasi berperan dan berjalur.** Tiap rekomendasi memuat pemimpin, peran BNPB (K/P/R/I), forum koordinasi,
   instrumen dan pelaksana daerah. Matriks lembaga dipisah menjadi mandat tertulis dan usulan penugasan. Satu
   register rekomendasi untuk dua kajian.
8. **Keputusan di depan.** Pesan Kunci DOCX dan slide 1 memuat 2–3 keputusan yang diminta beserta akibat tiap
   pilihan. Ringkasan Eksekutif dibuat dua lapis; letaknya mengikuti Buku Pegangan L6 (sesudah Daftar Singkatan).
9. **Sasaran 2029 resmi, arah 2030 berlabel.** Kajian menjadi masukan resmi peninjauan Renas PB 2025–2029
   (Perban BNPB 1/2025 Pasal 7) lewat hasil pemantauan dan evaluasi tahunan 2026 atau evaluasi paruh waktu 2027.
   Tabel "yang berubah dari Renas PB" ditambahkan dengan kolom jalur berkala dan jalur bencana.
10. **Deck.** Deck mitigasi mendapat peta Indonesia; judul slide geologi dan kemarau memakai metrik yang ada dan boleh
    dikutip; slide Rencana Aksi Musim Hujan masuk di kedua deck. Blok PDF ringkas dihapus (P13).
11. **Pembaruan 24 Oktober 2026.** Kartu skenario per jenis bencana untuk 15 jenis `tema.json` dengan lantai dan
    baris kepekaan masing-masing; kartu musim menjadi agregat operasional. Angka korban utama Kajian 2 memakai
    kategori alam. Jalur peninjauan Renas PB dibaca lengkap (berkala paling lambat 2027, bencana paling lambat 2028).
    Rekomendasi teknis air per komponen dan musim kembali ke Bab 8 Kajian 1. Kata Pengantar kembali berstatus draf
    (T7). Bagian depan dan Pesan Kunci mengikuti Buku Pegangan L6 dan L14. Mmaks resmi PuSGeN 2024, Pola/RPSDA 10 WS
    Jawa, RPJMN, Dewan SDA Nasional, rezim keselamatan industri, dan Koplitz dkk. sudah dibuka (§8).

---

## 1. Keputusan atas temuan uji

### 1.1 Uji adversarial atas versi 2

Baris yang putusannya diubah oleh §1.2 atau oleh dokumen primer §8 diberi catatan "Diperbarui" atau "Dibalik" di
kolom alasan; isi yang berlaku adalah isi sesudah pembaruan.

Uji adversarial memberi 133 temuan dari enam lensa: pimpinan (P, 25), mandat (M, 18), data (D, 22), relevansi
(R, 22), kelengkapan (K, 22), benchmark (B, 24). **Putusan: 100 diterima, 33 diterima sebagian, 0 ditolak utuh.**
Bagian yang ditolak di dalam temuan "terima sebagian" disebut di kolom alasan. Tidak ada putusan yang melanggar
`KEPUTUSAN.md`; satu-satunya singgungan (T7) ditangani di K18. Klaim regulasi yang diterima sudah dicek ke teks
korpus atau paket `lembaga`: Perban 1/2025 Pasal 7, Perpres 46/2026 Pasal 3 ayat (4), Perban 5/2018, Kepka
327/2025, Perban 3/2026 Pasal 2, Perban 2/2023 Pasal 7 ayat (5), Perban 4/2020 Pasal 20, UU 17/2019 Pasal 35 dan 65
(tidak diubah UU 6/2023), UU 18/2008 Pasal 9 dan 44, UU 24/2007 Pasal 7 ayat (3).

| ID | Lensa | Temuan ringkas | Putusan | Alasan |
| --- | --- | --- | --- | --- |
| P01 | pimpinan | Skenario musim hujan terburuk lebih ringan dari 2025/26; berlabel La Niña | Terima sebagian | Lantai = meninggal+hilang tercatat terbesar dalam seri DIBI 2008/09–2025/26 untuk wilayah sama (nasional 2025/26: 1.692; Jawa 2008/09: 270). Jawa tidak memakai 2019/20 karena pilihan itu bergantung pada rekaman Kota Bekasi berstatus tidak terbukti. La Niña keluar dari judul; model rasio menjadi pembanding "musim berat tipikal"; kartu 2026/2027 ditambah |
| P02 | pimpinan | Celah korban gempa merujuk skenario resmi yang tidak ada; judul deck memakai angka terlarang | Terima | README `skenario-geologi` §1: tidak ada angka resmi per skenario. Baris celah ditulis ulang; judul C1 dan B2 memakai paparan dan metrik resmi |
| P03 | pimpinan | Rencana Aksi Musim Hujan tanpa bab; 100 hari tanpa hari ke-0 | Terima | Subbab 8.8 (Kajian 1) dan 11.6 (Kajian 2), ringkasan di RE dan slide E2; hari ke-0 = penetapan Kepala BNPB; keputusan 14 hari pertama |
| P04 | pimpinan | Latar memakai kabar baik IRB, korban 2025 diabaikan | Terima | 2025: 2.030 meninggal dan 246 hilang (DIBI), sekitar 0,8 per 100.000 lawan 0,22 pada Renas 1.a; IRB 2024 pindah ke Bab 5 sebagai capaian Diperbarui V06: angka utama memakai kategori alam 2025 (1.735 meninggal, 221 hilang; sekitar 0,7 per 100.000); 2.030 hanya versi semua klasifikasi. |
| P05 | pimpinan | Tidak ada "yang berubah dari Renas"; nol "Sudah ada"; program luar negeri diberi status | Terima | Perban 1/2025 Pasal 7 ayat (1)–(2) diverifikasi; Tabel 12.3 dan RE; kategori Sudah ada diisi; program luar negeri ditulis "padanan di Indonesia" |
| P06 | pimpinan | Kepekaan peringatan dini memakai target Renas, bukan Renstra | Terima | Dua lintasan dengan rumus sama (faktor 0,603 lawan sekitar 0,998) dan catatan penyebut; penyelarasan menjadi keputusan KD-2 Diperbarui V02: faktor 0,998 hanya di kartu dan grafik berpil Asumsi kebijakan, tidak di pita keputusan. |
| P07 | pimpinan | Sasaran IRB 1,2% dan kapasitas 90% tidak terukur konsisten | Terima | Skala IRBI patah 2025; kapasitas 67%/38%. Sasaran utama berbasis korban DIBI; baseline IRBI 2025 rekomendasi 100 hari; alat ukur kapasitas keputusan KD-3 |
| P08 | pimpinan | Tidak ada metode sah memilih kab/kota prioritas | Terima | Aturan syarat (bukan indeks) di Bab 3 dengan uji kepekaan; nama "daftar perhatian"; per WS turun ke BBWS dan DI pusat |
| P09 | pimpinan | Longsor (53% korban Jawa) tidak tersentuh | Terima | Bab 6 Kajian 1 dibuka tabel korban per bahaya; longsor subbab utama; ukuran keberhasilan kemarau dinyatakan |
| P10 | pimpinan | Prinsip 9 biner menurunkan Destana dan SPAB | Terima | Lima posisi rubrik paket ditambah "aksi wajib menurut peraturan". P6 tetap: hanya bukti kuat atau sedang yang diusulkan diperluas sebagai program |
| P11 | pimpinan | Benchmark tidak selaras dengan kompendium | Terima | Benchmark program hanya baris kompendium; Bangladesh dan Odisha masuk; Filipina pelajaran; Singapura dan Murray–Darling satu kalimat |
| P12 | pimpinan | UU 6/2018 sudah dicabut | Terima | Metadata BPK: dicabut UU 17/2023 (C09); dua rezim status epidemi diuraikan di Bab 8 |
| P13 | pimpinan | Tanggul Laut Pantura dan BOP Pantura Jawa tidak disebut | Terima | Subbab 8.6 posisi risiko tanpa biaya; nomenklatur Perpres 77/2025; pelajaran Korea untuk evaluasi independen |
| P14 | pimpinan | "Ketika kemarau/banjir apa" tak punya bagian di Kajian 2 | Terima | Subbab 11.5 Operasi Musiman |
| P15 | pimpinan | Pita keputusan hilang dari depan | Terima | Pesan Kunci DOCX dan slide 1 memuat keputusan; diulang di Kesimpulan |
| P16 | pimpinan | RE terlalu belakang dan panjang | Terima | Urutan depan baru, RE dua lapis. KEPUTUSAN tidak mengatur urutan; KERANGKA di atas PEDOMAN Dibalik V12: Buku Pegangan berada di atas KERANGKA; urutan mengikuti L6. |
| P17 | pimpinan | Bahan berbicara dengan suara pihak luar | Terima | Aturan suara (prinsip 1); lampiran Penyelarasan dokumen BNPB; frasa dugaan dilarang di naskah |
| P18 | pimpinan | Proyek K/L lain dipetakan ke direktorat BNPB tanpa kode peran | Terima | Kolom pemimpin dan peran BNPB K/P/R/I di tiap program dan rekomendasi |
| P19 | pimpinan | Matriks lembaga mencampur mandat dan tafsiran | Terima | Matriks mandat tertulis berpasal; usulan penugasan terpisah berinstrumen |
| P20 | pimpinan | Strategi dan lembaga ditulis tiga kali | Terima | Bab per jenis berhenti di kartu, kesenjangan, implikasi; strategi hanya di bab grand design; Bab 2 ≤ 8 hlm |
| P21 | pimpinan | Tidak ada aturan hubungan rekomendasi antarkajian | Terima | Satu register rekomendasi ber-ID tunggal (§6) |
| P22 | pimpinan | Tidak ada indikator air milik BNPB | Terima | Irisan Jawa Renas 1.a–1.c dan target proses RTD terintegrasi renkon; target PU hanya konteks |
| P23 | pimpinan | Celah kab/kota lima komponen tidak tercatat | Terima | Tabel celah ditambah; Lampiran A berkolom tingkat data |
| P24 | pimpinan | Bahan kerusuhan berisiko politis | Terima | Podes dan analog antarkelompok; Agustus 2025 hanya celah pencatatan (lihat M01) |
| P25 | pimpinan | Blok PDF ringkas masih ada | Terima | Dihapus (P13) |
| M01 | mandat | "Kerusuhan" tanpa definisi; analog memuat unjuk rasa dan Mei 1998 | Terima | UU 24/2007 Pasal 1 angka 4, UU 7/2012 Pasal 1 angka 1. Unjuk rasa melawan aparat di luar lingkup. Mei 1998 dan Agustus 2025 keluar dari analog; metrik perkosaan dihapus; peran BNPB tiga hal |
| M02 | mandat | Rekomendasi per WS tanpa Pola/RPSDA menandingi PU | Terima | Kepmen Pola/RPSDA WS Jawa masuk dokumen primer wajib; bila tidak terambil, per WS dibatasi instrumen BNPB/BPBD dan catatan risiko lewat wadah koordinasi WS (P3) Diperbarui §8 (E6): Pola/RPSDA 10 WS Jawa terbuka; batasan instrumen BNPB/BPBD tinggal untuk Pemali-Comal. |
| M03 | mandat | Norma jembatan UU 17/2019 Pasal 35 tidak dipakai | Terima | Ayat (2), (5), (6) dan Penjelasan ayat (3) huruf i dicek; UU 6/2023 tidak mengubah Pasal 35. Air tanah dan penurunan muka tanah ke lintas K/L |
| M04 | mandat | Unit BNPB dipetakan ke program K/L lain tanpa beda peran | Terima | Kolom pemimpin (PJ Renas) dan peran BNPB; program non-BNPB hanya di lintas K/L. Gerbang mesin paket dicatat di §10 |
| M05 | mandat | Delta Programme diusulkan sebagai usulan baru BNPB | Terima sebagian | Dana air dan komisaris dihapus; objek bergeser ke Dewan SDA Nasional dan wadah koordinasi WS (UU 17/2019 Pasal 65, 11 huruf h) dipimpin PU dan Bappenas. Status "Sudah ada, perlu dikembangkan" ditolak sampai keberadaan wadah itu diverifikasi Diperbarui §8 (E13): Dewan SDA Nasional (Perpres 53/2022, Keppres 18/2024) dan TKPSDA WS (Permen PU 2/2024) berlaku; Kepala BNPB anggota Dewan; ketua Dewan menko, ketua harian Menteri PU. |
| M06 | mandat | Kebakaran industri disimpulkan tanpa pemimpin tanpa membaca rezim sektoral | Terima sebagian | Rezim keselamatan migas ESDM, UU 3/2014, UU 1/1970 wajib dibuka sebelum Bab 8. Isi rezim itu tidak disimpulkan sebelum dibaca; C14 ditulis "belum ditemukan di sumber yang dibaca" Diperbarui §8 (E12): rezim sektoral dibaca; C14 ditulis dari mandat tertulis Menteri ESDM, Menteri Perindustrian, Menaker. |
| M07 | mandat | UU 6/2018 dan Keppres 12/2020 masih dirujuk | Terima | Sama dengan P12; ketiadaan norma pengait masuk kesenjangan Bab 10 |
| M08 | mandat | Pedoman Perpres 46/2026 Pasal 3 ayat (4) belum ada | Terima | Perban 5/2018 melaksanakan Perpres 17/2018 dan tidak memuat kondisi pascakonflik; Kepka 327/2025 tidak memuat perubahannya; instrumen Usulan baru |
| M09 | mandat | Perpres status dan tingkatan bencana tidak dibahas | Terima sebagian | Pasal 7 ayat (3) dicek; keberadaan Perpres pelaksana diverifikasi di JDIH Setneg sebelum ditulis sebagai kesenjangan. Status RUU di Prolegnas di luar bahan, tidak dijadikan klaim Diperbarui §8 (E14): Perpres belum terbit menurut JDIH BPK; JDIH Setneg tidak dapat dicari (log QA). |
| M10 | mandat | Progsun Perban 2026 tidak di tabel silang | Terima | Kepka 327/2025 dicek (butir 3, 9, 11); kolom kelima tabel silang |
| M11 | mandat | Tanpa jalur Menko dan jalur adopsi | Terima | Kemenko PMK, IPK, Pangan, Perekonomian, BOP Pantura Jawa, PJT I/II masuk matriks; forum per rekomendasi |
| M12 | mandat | Rekomendasi kab/kota tanpa instrumen daerah | Terima | Perban 3/2026 Pasal 2 ayat (1) dan Juklak 4–7/2026 dicek; kolom instrumen dan pelaksana daerah |
| M13 | mandat | Kebakaran TPA dibingkai sebagai kapasitas BNPB | Terima | UU 18/2008 Pasal 9 ayat (1) huruf f dan Pasal 44 ayat (2) dicek; pemimpin KLH/BPLH dan pemda |
| M14 | mandat | Keluaran platform di luar jalur Walidata | Terima sebagian | Pernyataan produsen dan usulan serah lampiran data ke Pusdatinkom (Perban 1/2023 Pasal 28). T3 tetap: peta web dibangun lokal di situs Pantau Bencana |
| M15 | mandat | Jangkar posisi dan pembiayaan dari kutipan tangan kedua | Terima | PP 21/2008, PP 22/2008, Perpres 87/2020, 75/2021, 12/2025 masuk dokumen primer wajib; DSP dibatasi tiga keadaan |
| M16 | mandat | Istilah fase dan "komando insiden" tak sesuai UU | Terima | T10; aksi per fase dari UU 24/2007 Pasal 35, 44–48, 57–59; SKPDB |
| M17 | mandat | Sasaran "2030" padahal target resmi 2029 | Terima | "Target 2029 (resmi)" dan "arah 2030" berlabel Asumsi kebijakan (P4 tetap) |
| M18 | mandat | Nama K/L kompendium belum diselaraskan | Terima | Naskah memakai `lembaga/lembaga.csv`; kolom kode lembaga jadi tugas paket (§10) |
| D01 | data | Kartu geologi bertumpu skenario resmi yang tidak ada | Terima sebagian | Badan teks memakai paparan KRB dan korban historis; korban tsunami tidak dikuantifikasi. Usul menghapus sesar darat dan likuefaksi dari kartu ditolak: keduanya tetap berkartu analog berangka tanpa proyeksi (selaras K03, R12) |
| D02 | data | Kartu kemarau berjangkar 2015 dengan metrik tak layak | Terima | Kartu "kemarau 2026 berlanjut hingga awal 2027"; metrik resmi; korban jiwa "tidak berlaku"; puso model di lampiran |
| D03 | data | Korban model melampaui korban tercatat musim analog | Terima | Tercatat menjadi jangkar; model berdampingan berlabel; uji kepekaan pemilihan analog dengan dan tanpa rekaman Bekasi Diperbarui V05/V08: lantai juga per jenis. |
| D04 | data | Kartu musim pasca El Niño belum ada | Terima | Kartu 6.2 (Kajian 1) dan 7.2 (Kajian 2) analog 2009/10, 2015/16, 2023/24; La Niña jadi baris kepekaan fase ENSO |
| D05 | data | Dua "kerugian" bertentangan tanpa definisi | Terima | Tiga besaran berlabel tetap; pita > 1 orde tidak ke judul atau RE; seri CKAN R3P 2015–2024 ditarik |
| D06 | data | Tabel kerusakan Nankai tak bisa diisi | Terima | Matriks ketersediaan kuantifikasi; luka dan DALY dihapus; pengungsi tercatat; kolom luas dinamai per konsep |
| D07 | data | IRBI patah, kapasitas bertentangan; tren 2015–2025 | Terima | Tren 2015–2024; potret 2025 terpisah; provinsi memakai kelas resmi 2023 |
| D08 | data | Indikator air tanpa baseline resmi | Terima | Sasaran berangka hanya yang berbaseline; lainnya sasaran pembentukan baseline bertenggat |
| D09 | data | Neraca dan rekomendasi per WS tanpa data | Terima | Peta neraca per WS dihapus; Lampiran C profil kewenangan |
| D10 | data | Tidak ada metode kab prioritas | Terima | Sama dengan P08; templat tesis PEDOMAN §A2 diganti |
| D11 | data | Basis program terbukti tak cukup untuk matriks | Terima | Kategori sel aksi wajib menurut peraturan dan uji coba terukur; penelusuran bukti terarah; jumlah sel per kategori dilaporkan |
| D12 | data | Lima komponen tak merata; indikator air minum jenuh | Terima sebagian | Matriks resolusi dan baris sekunder terpisah. Indikator sumber air minum (leding/sumur) hanya tingkat provinsi dengan label tabel tidak sejajar; per kab di luar Jawa Tengah jadi permintaan data |
| D13 | data | Peta GNSS dan zona rob tanpa data | Terima sebagian | GNSS Susilo dkk. (2023) ditarik bila terjangkau; bila tidak, peta diganti nama dan diberi keterangan "belum diukur" Diperbarui §8 (E17): GNSS CPKL Pekalongan ditarik dari Susilo dkk. (2023). |
| D14 | data | IRBI dan DIBI tidak sejalan tanpa penjelasan | Terima | Spearman 0,18 / 0,19 / 0,20 dihitung ulang dari `air-jawa/kab_jawa.csv`; 15 dari 23 kab tanpa IRBI longsor berkejadian longsor |
| D15 | data | Angka penentu hanya sekunder | Terima | Daftar dokumen primer wajib dibuka (§8) |
| D16 | data | Patahan kategori DIBI tampil sebagai tren palsu | Terima | Kelompok gabungan atau penanda patahan; DIBI konflik tidak dipakai sebagai seri |
| D17 | data | Empat angka cakupan peringatan dini belum direkonsiliasi | Terima | Tabel rekonsiliasi Bab 3; R = 8 Asumsi kebijakan |
| D18 | data | Definisi kemungkinan NRR tidak diambil | Terima | Kemungkinan = peluang skenario 2026–2030 per jenis; tanpa dasar "tidak dinilai" |
| D19 | data | UU 6/2018 | Terima | Sama dengan P12 |
| D20 | data | Dokumen tabel silang tak dibuka; Renstra memakai OTK lama | Terima | Perpres 87/2020 dan lampiran Perpres 12/2025 dibuka sebelum status ditandai; unit OTK berlaku; padanan ditandai |
| D21 | data | WorldPop sebagai penyebut resmi | Terima sebagian | Penyebut resmi = penduduk KRB InaRISK per kab (resmi, sudah di paket) sampai proyeksi BPS kab ditarik; WorldPop hanya untuk sebaran dalam kab |
| D22 | data | Kejadian banjir besar tanpa angka resmi | Terima | Jakarta 2007, 2013, 2020, Demak 2024 dipertahankan; Bengawan Solo 2007 kualitatif |
| R01 | relevansi | Musim hujan lebih ringan dari 2025/26 | Terima sebagian | Lantai diterima; Jawa memakai meninggal+hilang tercatat terbesar, bukan 2019/20 (lihat P01) |
| R02 | relevansi | IRBI dan DIBI kekeringan tak menangkap pengalaman BPBD | Terima | Indikator operasional disandingkan; paragraf beda peta IRBI dengan lapangan; uji DIBI 2015 diganti daftar perhatian |
| R03 | relevansi | Operasi kemarau tidak ada | Terima sebagian | Subbab 5.6. Kebutuhan air darurat (Perka BNPB 7/2008: 15 l/orang/hari) dihitung hanya bila data desa terdampak dari BPBD diperoleh; angka Jatim 815 desa berlabel sekunder Diperbarui §8 (E18) dan V10: standar 7 l per orang per hari tiga hari pertama lalu 15 l; angka Jatim tidak dikutip. |
| R04 | relevansi | Perencanaan satu musim; kalender tanam tidak ada | Terima sebagian | Rencana Aksi 2026/2027, Kesiapan Kemarau 2027, kalender pemicu ENSO 2028–2030; Katam di Bab 5. Perluasan Juknis BNPB 1/2024 (DSP puso banjir) ke kekeringan ditolak: puso kekeringan diarahkan ke asuransi pertanian (Renas 2.5.1.c, PJ Kementan) dan DSP terbatas tiga keadaan |
| R05 | relevansi | Fase tak terhubung ke rezim status darurat | Terima | Kolom pemicu status di matriks; siaga darurat sebagai tuas aksi dini (Perban 4/2020) |
| R06 | relevansi | Tanpa jalur ke daerah; BTT dan dana desa absen | Terima | Kolom instrumen dan pelaksana daerah; BTT dan dana desa di lapisan pembiayaan |
| R07 | relevansi | Desa, sekolah, relawan hilang | Terima | Subbab 8.7 dan 11.8; evaluasi Destana dengan tingkat ketangguhan Perban 7/2025 |
| R08 | relevansi | Longsor dominan korban Jawa | Terima | Sama dengan P09; kepekaan peringatan dini per jenis, longsor tidak dihitung |
| R09 | relevansi | Wadah koordinasi SDA dilewatkan | Terima sebagian | Masuk matriks dan forum; status "Sudah ada" menunggu verifikasi keberadaan (lihat M05) Diperbarui §8 (E13): forum berlaku; status P7 forum "Sudah ada". |
| R10 | relevansi | Kartu dari pola luar negeri, bukan Perban 2/2023 | Terima | Tiga blok Perban 2/2023 Pasal 7 dan lima aspek; baris kebutuhan sumber daya |
| R11 | relevansi | DALY dijanjikan tanpa data | Terima | Dihapus; YLL di lampiran; pengungsi-hari |
| R12 | relevansi | Gempa sesar darat tanpa jalur data | Terima sebagian | Kartu analog Yogyakarta 2006 dan Cianjur 2022; kartu skenario kota menunggu Mmaks PuSGeN |
| R13 | relevansi | Kab prioritas tanpa aturan | Terima | Sama dengan P08 |
| R14 | relevansi | Benchmark condong luar negeri | Terima | Benchmark dibatasi; pelajaran domestik berlabel |
| R15 | relevansi | OMC tidak dibahas | Terima | Sudah ada (BMKG), bukti dampak belum terukur; protokol evaluasi `scripts/omc/nilai.py` |
| R16 | relevansi | Peringatan dini diukur sebagai alat | Terima | Definisi cakupan berfungsi; pemeliharaan lewat SPM dan Dana Bersama |
| R17 | relevansi | Air minum layak menyesatkan | Terima sebagian | Sama dengan D12 |
| R18 | relevansi | Kebakaran TPA tak di profil kemarau Jawa | Terima | Subbab 5.5 Kajian 1 |
| R19 | relevansi | Pascabencana konseptual | Terima | Subbab 11.9 per instrumen; Sumatra 2025 kasus berjalan |
| R20 | relevansi | UU 6/2018 | Terima | Sama dengan P12 |
| R21 | relevansi | Sasaran IRB tanpa baseline baru | Terima | Sama dengan P07 |
| R22 | relevansi | Kebakaran permukiman tidak disebut | Terima | Rekap Bab 4 dan paragraf lingkup (P11 tetap) |
| K01 | kelengkapan | Nonalam dan sosial tidak dikuantifikasi | Terima sebagian | Tabel empat besaran dari analog tanpa perkalian (P10); KRB nonalam sebagai rujukan resmi. Mei 1998 dan Agustus 2025 tidak dipakai (M01) |
| K02 | kelengkapan | Rencana operasi musiman nasional tidak ada | Terima | Subbab 11.5–11.6 dan slide E2 |
| K03 | kelengkapan | Kartu geologi tidak lengkap | Terima sebagian | Kartu analog sesar darat dan likuefaksi (Sulteng 2018); varian Mmaks tetap "kepekaan magnitudo" sampai dokumen PuSGeN 2024 dibuka Diperbarui §8 (E1): Mmaks resmi PuSGeN 2024 terbuka; kartu kepekaan magnitudo diganti kartu Mmaks resmi. |
| K04 | kelengkapan | Deck mitigasi tanpa peta | Terima | Slide B1 peta Indonesia; lampiran deck L10–L11 |
| K05 | kelengkapan | "Langkahnya bagaimana" tidak tertampung | Terima | Subbab 11.3 alur langkah berpasal |
| K06 | kelengkapan | Program kosong untuk banyak jenis | Terima | Penelusuran bukti domestik hanya dari dokumen yang dibuka; sel kosong jadi uji coba terukur |
| K07 | kelengkapan | Unit respons tak menerima beban skenario | Terima sebagian | Kebutuhan respons per Direktorat PD Wilayah. Dasar hitung pengungsi tercatat atau penghuni rumah RB+RS; "pengungsi hari ke-7" ditolak karena tidak ada di data |
| K08 | kelengkapan | Kajian BNPB terdahulu tidak ditinjau | Terima | Subbab 2.3 (Kajian 1) dan 2.2 (Kajian 2) |
| K09 | kelengkapan | Pengelolaan air musiman tak diuraikan | Terima | Subbab 5.6 dan 6.7 Kajian 1 |
| K10 | kelengkapan | Tiga komponen tidak sampai kab/kota | Terima sebagian | Celah dicatat; unduh manual Susenas kab dicoba di produksi; bila gagal, permintaan data |
| K11 | kelengkapan | Bab 8 tak terikat lima komponen | Terima sebagian | Matriks komponen × musim × fase. "Air minum layak" ditolak sebagai indikator 2030: sudah 95,73–99,98% di semua provinsi Jawa |
| K12 | kelengkapan | Kriteria prioritas tidak ada | Terima | Sama dengan P08 |
| K13 | kelengkapan | Daftar lembaga tidak lengkap | Terima sebagian | Lembaga `lembaga.csv` ditambahkan. Kemenperin dan Kemnaker masuk hanya setelah mandat tertulisnya dibaca; Perka 5/2008 dan 12/2014 sebagai instrumen |
| K14 | kelengkapan | Patahan IRBI di sebaran provinsi dan sasaran | Terima | Sama dengan D07 dan P07 |
| K15 | kelengkapan | Histori tanpa nonalam dan sosial | Terima sebagian | Jendela 1996 untuk sosial; Mei 1998 dan Agustus 2025 tidak dimuat (M01) |
| K16 | kelengkapan | UU 6/2018 | Terima | Sama dengan P12 |
| K17 | kelengkapan | Benchmark nonalam/sosial tidak ada | Terima sebagian | JEE/IHR (skor Indonesia 2023 di paket) dipakai; Seveso III dan Malino hanya bila sumber primer dibuka |
| K18 | kelengkapan | T7 menandai Kata Pengantar untuk pemilik | Terima sebagian | Pemilik meminta final tanpa pemeriksaan pemilik. Kata Pengantar siap tanda tangan, kolofon berstatus final, penanda pemeriksaan pindah ke log QA. T7 tetap: ia tidak menentukan letak penanda Dibalik V11: Kata Pengantar draf berpenanda periksa pemilik (T7); KEPUTUSAN tidak mencatat permintaan final tanpa pemeriksaan. |
| K19 | kelengkapan | Situ Gintung 2009 terlewat | Terima sebagian | Dimuat hanya bila tanggal di mentah DIBI cocok (27 Maret 2009) |
| K20 | kelengkapan | Peta GNSS tanpa data | Terima sebagian | Sama dengan D13 Diperbarui §8 (E17): sama dengan D13. |
| K21 | kelengkapan | Pengecualian kebakaran permukiman tak dijelaskan | Terima | Paragraf lingkup Bab 1 Kajian 2 |
| K22 | kelengkapan | Status "Sudah ada" kosong | Terima | Dana Bersama, InaRISK/IRBI, Satu Data Bencana, rencana kontingensi bila diteruskan tanpa ubah desain |
| B01 | benchmark | Aturan RWCS menyisihkan tahun terburuk | Terima | Lantai = terburuk tercatat dalam periode acuan; yang disisihkan hanya peluang lima tahun < 0,2% beralasan; gerbang mesin (§10) |
| B02 | benchmark | Bab 6 menjanjikan kartu yang tidak ada | Terima sebagian | Metrik utama tsunami paparan; judul C1 paparan. Mmaks sekunder hanya kepekaan, tidak di judul atau RE, karena naskah final menolak sumber sekunder Diperbarui §8 (E1): Mmaks resmi boleh di badan teks; judul C1 tetap paparan (V17). |
| B03 | benchmark | Tidak ada penilaian risiko terbanding | Terima sebagian | Subbab 5.8 dan slide B2. Jenis tanpa dasar peluang di panel "dampak dinilai, kemungkinan tidak dinilai", tanpa posisi kemungkinan (selaras D18) |
| B04 | benchmark | Skala dampak tidak didefinisikan | Terima | Tabel skala dampak 1–5 per aspek Perban 2/2023; kelas = aspek terberat |
| B05 | benchmark | Baris tabel kerusakan tak bisa diisi | Terima | Lima aspek; imateriil seragam YLL dan pengungsi-hari |
| B06 | benchmark | Prioritas tanpa aturan | Terima | Sama dengan P08; provinsi utama dua kriteria tertulis |
| B07 | benchmark | Preskripsi per WS tanpa Pola/RPSDA | Terima | Tiga lapis per BBWS; celah dicatat Diperbarui §8 (E6): Pola/RPSDA 10 WS terbuka; Pemali-Comal tetap tanpa Pola/RPSDA. |
| B08 | benchmark | Kartu kemarau tanpa metrik layak | Terima | Sama dengan D02; produksi padi BPS dan puso Kementan sebagai permintaan data |
| B09 | benchmark | Bencana sosial kualitatif | Terima sebagian | Kartu analog berangka (Maluku, Poso, Sampit, Sambas) dan Podes; tanpa Mei 1998 (M01) |
| B10 | benchmark | Tidak ada kalender aksi musiman | Terima | Sama dengan P14 dan K02 |
| B11 | benchmark | Deck mitigasi tanpa peta | Terima | Sama dengan K04 |
| B12 | benchmark | Sasaran 2030 tanpa resmi | Terima | Sama dengan M17; satu kunci `angka.json` untuk naskah dan deck |
| B13 | benchmark | Tidak ada agenda bukti | Terima | Subbab 8.10 dan 11.10 |
| B14 | benchmark | Beban kesehatan asap tidak ada | Terima sebagian | Baris beban kesehatan hanya bila Koplitz dkk. (2016) dibuka; bila tidak, "kematian akibat asap belum dihitung" Diperbarui §8 (E15): Koplitz dkk. dibuka; 91.600 kematian berlebih (95%: 24.000–159.200). |
| B15 | benchmark | Tuas kepekaan bukan tuas air | Terima sebagian | Tuas penurunan muka tanah dari laju terverifikasi; aturan koefisien asosiasi diterima. Tuas tampungan bila sedimentasi dikendalikan ditolak: laju sedimentasi hanya ada untuk bendungan BBWS Pemali-Juana |
| B16 | benchmark | Risiko kronis tidak dipisah | Terima | Subbab 6.5 Kajian 1 |
| B17 | benchmark | Tidak ada skenario majemuk | Terima sebagian | Kajian 1 digabung ke Kartu 6.2; Kajian 2 Kartu 6.5 Sulteng 2018; Seroja saat status COVID-19 hanya narasi |
| B18 | benchmark | Studi kasus tidak dialokasikan | Terima | 3–4 hlm per kajian, kekuatan bukti ≥ sedang ditambah satu pelajaran negatif |
| B19 | benchmark | Pembiayaan tanpa profil kerugian | Terima sebagian | Profil kerugian batas bawah dari rumah rusak DIBI × stimulan. Lapisan ekstrem memakai kejadian analog, bukan pita model Mmaks yang lebarnya lebih dari satu orde |
| B20 | benchmark | Pemantauan dan pelaporan tidak ada | Terima | Subbab 9.8 dan 12.9 |
| B21 | benchmark | UU 6/2018 | Terima | Sama dengan P12 |
| B22 | benchmark | Tren IRB 2015–2025 | Terima | Sama dengan D07 |
| B23 | benchmark | Peta ketersediaan data air tidak ada | Terima | Tabel 3.1 Kajian 1, lampiran deck L9, daftar permintaan data |
| B24 | benchmark | PDF ringkas | Terima | Sama dengan P25 |

### 1.2 Uji verifikasi atas versi 3 (24 Oktober 2026)

Uji verifikasi memberi 17 temuan berderajat kritis (3) dan tinggi (14). Empat pasang menyasar masalah yang sama dan
diputus bersama (V01 dan V15, V04 dan V10, V05 dan V08, V06 dan V16), sehingga ada 13 putusan. **Putusan: 11
diterima, 2 diterima sebagian (V02; V05 dan V08), 0 ditolak utuh.** Tiap bukti dicek ulang ke paket data atau korpus
sebelum diputus; bagian yang ditolak disebut di kolom alasan. Tidak ada putusan yang melanggar `KEPUTUSAN.md`: V11
mengembalikan KERANGKA ke T7, V03 menegakkan T11, V05 dan V08 menegakkan P10, V04 dan V10 tetap dalam P3, P5, dan P6.

| ID | Derajat | Lokasi | Temuan ringkas | Putusan | Alasan dan tindakan |
| --- | --- | --- | --- | --- | --- |
| V01 | tinggi | §6 KD-1; prinsip 1; Bab 12.4 K2 | Tenggat dan jalur perubahan Renas PB salah; syarat monev tidak disebut | Terima | Lampiran Perban 1/2025 hlm. 124–125 dicek: perubahan karena peninjauan berkala paling lambat tahun ketiga (2027); karena bencana paling lambat tahun keempat (2028) dan hanya untuk program dan kegiatan rencana aksi; rekomendasi kedua jalur wajib termuat di hasil pemantauan dan evaluasi tahunan atau evaluasi paruh waktu (tahun ketiga). KD-1, prinsip 1, Bab 9.3, 12.3, 12.4, Tabel 12.3 (kolom jalur berkala dan jalur bencana), dan keputusan 14 hari diubah. Unit pemasuk rekomendasi ke monev: Direktorat Pengembangan Strategi Penanggulangan Bencana (Perban 6/2025 Pasal 50; pemetaan penyusun) bersama Biro Perencanaan (Pasal 24) |
| V02 | tinggi | §6 KD-2; §3; prinsip 10; Bab 6 K1 | Faktor 0,998 diklaim tanpa baris di paket; efek R = 8 tampil di Pesan Kunci | Terima sebagian | Klaim bahwa `kepekaan_peringatan_dini.csv` tidak memuat lintasan Renstra ditolak: berkas memuat baris `renstra_ikp_2025` (c0 0,061, c1 0,0632, faktor 0,998) untuk tiap skenario dan wilayah, dibaca 24 Okt 2026. Pelanggaran prinsip 10 diterima: 0,2% keluar dari akibat KD-2 di Pesan Kunci, slide 1, Bab 10 dan 13; akibat KD-2 ditulis dengan besaran target (6,32% lawan 52.000 per 100.000) dan catatan penyebut. Faktor tetap di Gambar 6.6 K1 dan 7.3 K2 berpil Asumsi kebijakan |
| V03 | tinggi | Deck K1 slide 2, 4, 5, 6; K2 slide 2, 7 | Enam judul temuan melampaui dua baris pada 19 pt | Terima | T11 dan Buku Pegangan bab Judul. Judul ditulis ulang satu klaim, paling banyak sekitar 110 karakter setelah slot terisi; klausa kedua pindah ke kartu angka atau panel (S8). Judul C1 ikut ditulis ulang (V17). Pemeriksaan panjang judul terukur masuk §10 untuk `bangun/pptx/periksa.py` |
| V04, V10 | tinggi, kritis | Bab 8.3–8.4, 10.5 K1; Bab 11 K2 | Rekomendasi teknis air hilang; program air kompendium tidak disebut | Terima | Bab 8.3 K1 menjadi "Strategi dan Rekomendasi Teknis per Komponen, Musim, dan Fase" dua lapis: (1) teknis dalam mandat BNPB/BPBD; (2) masukan teknis berbasis risiko ke K/L lewat Dewan SDA Nasional dan TKPSDA WS, berlabel lintas K/L, berkategori bukti, tanpa biaya (P3, P5). P10, P11, P12, P14, P15 berposisi "Program berjalan, wajib evaluasi dampak", jadi yang direkomendasikan evaluasi dampaknya, bukan perluasan (P6). Relokasi longsor dan normalisasi lawan naturalisasi memakai argumen tandingan L63. Embung, polder, sumur resapan, dan sodetan Ciliwung masuk Tabel 8.6 K1. Larangan di 10.5 dipersempit ke preskripsi yang menandingi Pola/RPSDA dan ke WS Pemali-Comal (Pola/RPSDA 10 WS lain terbuka, E6). Standar Perka BNPB 7/2008 dicek di korpus: 7 liter pada tiga hari pertama, lalu 15 liter per orang per hari |
| V05, V08 | tinggi, kritis | Kartu Bab 5–6 K1; Bab 6–7 K2; prinsip 9 | Skenario terburuk dilebur per musim, bukan per jenis | Terima sebagian | P10 dan L20 mengikat. Kartu per jenis untuk 15 jenis `tema.json` (Kartu 5.2, 6.4–6.6 K1; 6.6, 7.3, 7.5–7.8 K2), masing-masing dengan lantai kejadian tunggal dan tahun tercatat terburuk untuk jenis dan wilayah itu (turunan baru, §10), empat besaran P10, dan baris kepekaan. Matriks kemungkinan × dampak (Gambar 5.6, slide B2) diisi per jenis. Ditolak: (a) kartu musim tidak dipindah ke Bab 8 dan 11; tetap di bab per jenis sebagai kartu agregat operasional (prinsip 17) dan dirujuk Bab 8.8 dan 11.6; (b) banjir bandang tidak berkartu terpisah karena `tema.json` menyatukannya dengan banjir; kartunya memuat baris lantai banjir bandang sendiri |
| V06, V16 | tinggi | Tesis K2; Bab 1, 4 K2; slide A1 | 2.030 meninggal 2025 mencampur kategori di luar lingkup dan seri berpatahan | Terima | `dibi/rekap_nasional_tahunan.csv` dihitung ulang 24 Okt 2026: 2025 cakupan bencana alam 1.735 meninggal dan 221 hilang; 2.030 memuat nonalam 242 (kebakaran permukiman 145, gagal teknologi 69, epidemi 28), lainnya 45, sosial 8. Seri alam: tertinggi sejak 2018 (5.477) tetap benar. Tesis, judul A1, Bab 1, Bab 4, dan kunci `tesis` memakai alam; 2.030 hanya versi semua klasifikasi dengan catatan patahan 2024. Rasio menjadi sekitar 0,7 per 100.000 |
| V07 | tinggi | Tesis K1; Bab 8.2; celah 24 | Ukuran kemarau di tesis tidak berindikator; jumlah kab mengukur pelaporan | Terima | Tabel 8.1 ditambah sasaran pembentukan baseline kemarau bertenggat 2027 (desa terdampak dan liter air darurat tersalur per kab dari BPBD; puso kekeringan per kab dari Kementan; kab berstatus siaga atau tanggap darurat dari SK). Tesis menjanjikan pembentukan baseline itu. Jumlah kab pencatat kekeringan diganti terdampak tercatat terbesar (2018: 4.924.057) dengan catatan pelaporan; judul B2 ikut diganti |
| V09 | kritis | Prinsip 9–10; Bab 7–9 K2 | Kepekaan hanya untuk empat tuas | Terima | Prinsip 10 ditambah kepekaan tanpa perkalian per jenis: pilihan analog (dengan dan tanpa analog terbesar), versi angka resmi lawan terverifikasi, durasi status, kemarau tahun kedua, luas karhutla dan kematian asap, tuas evakuasi gunung api. Jenis yang kepekaannya kualitatif ditulis di matriks ketersediaan kuantifikasi beserta alasannya |
| V11 | tinggi | §1.1 K18; §3 | Kata Pengantar dinyatakan final, bertentangan dengan T7 | Terima | T7 berada di atas KERANGKA; KEPUTUSAN hanya mencatat "pemilik meminta tidak ada pertanyaan lagi", dan PEDOMAN K18 menyebut penyerahan tanpa tinjauan sebagai bawaan. Kata Pengantar kembali draf berpenanda periksa pemilik; K18 dibalik; §10 diubah |
| V12 | tinggi | §3; §1.1 P16 | Urutan depan dan jumlah temuan Pesan Kunci bertentangan dengan Buku Pegangan | Terima | KEPUTUSAN baris 3–4 menaruh Buku Pegangan di atas KERANGKA. Urutan depan mengikuti L6; Pesan Kunci 6–8 temuan (L14) ditambah pita keputusan; slide 1 deck 4–6 temuan (S1). P16 dibalik |
| V13 | tinggi | Prinsip 9; Bab 4, 6 K2 | Kartu megathrust dan tsunami tanpa lantai; Pangandaran 2006 tidak disebut | Terima | Periode acuan geologi 30 tahun (1996–2025), sama dengan nonalam dan sosial. Lantai Kartu 6.1 = Pangandaran 2006 (665 meninggal, USGS impact-text, Terverifikasi; `skenario-geologi/README.md` §4.2); Kartu 6.2 = Mentawai 2010 (447 meninggal, 56 hilang; DIBI, Resmi). Keduanya lantai tercatat, bukan proyeksi; korban model platform tetap tidak dikutip |
| V14 | tinggi | Bab 9 K2; prinsip 15 | Rekonsiliasi pascakonflik ditulis tanpa peran BNPB; jalur DSP UU 7/2012 absen | Terima | Teks dicek di `lembaga/mentah/teks`: UU 24/2007 Pasal 58 ayat (1) huruf f; UU 7/2012 Pasal 37 ayat (2), Pasal 49 ayat (2) huruf l, Pasal 55 ayat (1). Peran rekonsiliasi ditulis sebagai mandat tertulis dalam batas fungsi pascabencana dan keadaan tertentu Perpres 46/2026; Pasal 55 masuk lapisan pembiayaan dan Tabel 9.1. Peringatan dini konflik (Pasal 6, 10) tetap tidak dipetakan ke unit BNPB |
| V15 | tinggi | Prinsip 1; §6 KD-1, KD-2; Bab 12.4 | Jalur peninjauan Renas dibaca tidak lengkap | Terima | Digabung dengan V01 |
| V17 | tinggi | Deck C1; Bab 6 K2 | Judul C1 memakai angka Estimasi model berproksi bolong; MMI M8,5 dijadikan temuan | Terima | Judul C1 hanya paparan resmi KRB; jiwa pesisir rendah pindah ke badan slide berpil Estimasi model dengan daftar kab terlewat (18 kab pada skenario Jawa M8,5). Kalimat MMI M8,5 keluar dari temuan Bab 6 dan menjadi keterbatasan model di Bab 3. Kartu 6.1 kini memakai Mmaks resmi 9,1 (E1) |

---

## 2. Prinsip yang mengikat kedua kajian

1. **Posisi dan suara BNPB.** Kedua kajian menajamkan RIPB 2020–2044 (Perpres 87/2020) dan Renas PB 2025–2029
   (Perban BNPB 1/2025) dan diposisikan sebagai masukan resmi peninjauan Renas PB, dan sekaligus peninjauan RIPB
   (Perpres 87/2020 Pasal 7: berkala lima tahunan atau sewaktu-waktu; monev tahunan dilaporkan ke Presiden melalui
   Menko PMK, Pasal 6). Renas PB punya dua jalur (Pasal 7; Lampiran hlm. 124–125; PP 21/2008 Pasal 6: rencana PB
   ditinjau tiap dua tahun):
   - **Jalur berkala** (ayat (1); dua tahun sejak penetapan 6 Januari 2025, sekitar Januari 2027, tafsiran penyusun):
     perubahan kebijakan, strategi, program, kegiatan, termasuk target dan indikator, **paling lambat tahun ketiga
     (2027)**. Usulan perubahan target dan alat ukur (KD-2, KD-3, KD-4) hanya lewat jalur ini.
   - **Jalur bencana** (ayat (2); pemicu banjir dan longsor Sumatra November 2025): **paling lambat tahun keempat
     (2028)** dan hanya untuk program dan kegiatan dalam rencana aksi.
   - **Syarat kedua jalur:** rekomendasi peninjauan wajib termuat dalam hasil pemantauan dan evaluasi tahunan atau
     evaluasi paruh waktu (dilakukan pada tahun ketiga, hlm. 124). Langkah wajib kajian: rekomendasinya dimasukkan ke
     laporan evaluasi tahunan Renas PB 2026 dan, bila terlewat, ke evaluasi paruh waktu 2027, oleh Direktorat
     Pengembangan Strategi Penanggulangan Bencana (Perban 6/2025 Pasal 50; pemetaan penyusun) bersama Biro
     Perencanaan (Pasal 24).

   Status dokumen: kajian rekomendasi; jalur adopsi lewat monev Renas PB di atas, Unsur Pengarah BNPB, dan rakor
   Kemenko PMK. Inkonsistensi dokumen internal BNPB (salah salin Renstra, pasal OTK
   yang tertinggal, metode IRBI 2025 yang belum terdokumentasi) dimuat sebagai aksi perbaikan berpenanggung jawab di
   lampiran Penyelarasan dokumen BNPB, dengan suara BNPB ("BNPB menyelaraskan …"). Frasa "BNPB tampaknya", "dugaan
   salah salin", dan sejenisnya dilarang di naskah, dan butir ini tidak masuk RE.
2. **Batas mandat rezim air.** Pencegahan daya rusak air berada di Pola PSDA dan dipimpin Kementerian PU (UU
   17/2019 Pasal 35 ayat (2)); penanggulangan daya rusak air yang dinyatakan sebagai bencana tunduk pada UU 24/2007
   (ayat (5)); tindakan darurat menjadi kewenangan gubernur dan bupati/wali kota (ayat (6)). Tanah ambles termasuk
   daya rusak air (Penjelasan ayat (3) huruf i). Pola dan Rencana PSDA dirujuk, tidak ditandingi (P3). Air tanah dan
   penurunan muka tanah masuk rekomendasi lintas K/L dengan pemimpin Kementerian ESDM, Kementerian PU, dan KLH/BPLH
   (Renas 2.4.4.a: PJ KLH); peran BNPB terbatas pada KRB banjir dan rob, rencana kontingensi, data, dan usul menjadi
   kontributor 2.4.4.a pada peninjauan Renas. Usul itu bertumpu pada keanggotaan yang sudah tertulis: Kepala BNPB
   anggota Dewan SDA Nasional (Perpres 53/2022 Pasal 7 ayat (1) huruf d angka 14; Keppres 18/2024).
3. **Taksonomi dan definisi operasional.** Bencana alam, nonalam (epidemi dan wabah; gagal teknologi termasuk
   kebakaran industri; kebakaran TPA sebagai kategori kajian, berlabel tafsiran penyusun), dan sosial (UU 24/2007
   Pasal 1 angka 2–4). **Kerusuhan sosial** dalam kajian ini hanya kerusuhan berbentuk konflik antarkelompok atau
   antarkomunitas masyarakat (UU 24/2007 Pasal 1 angka 4; UU 7/2012 Pasal 1 angka 1). Unjuk rasa yang berhadapan
   dengan aparat atau negara di luar lingkup karena merupakan urusan keamanan dan ketertiban masyarakat (Polri, UU
   2/2002 Pasal 13) dan, untuk dugaan pelanggaran HAM, Komnas HAM. **Mitigasi** dalam judul Kajian 2 dipakai dalam arti
   luas pengurangan risiko lintas tiga tahap (UU 24/2007 Pasal 1 angka 9, Pasal 33, Pasal 44). Kebakaran gedung dan
   permukiman di luar lingkup P11 (urusan pemadam kebakaran kab/kota, UU 23/2014 Lampiran E); angka DIBI-nya hanya
   konteks. Teror dan gagal modernisasi tidak dikaji (PEDOMAN §A6).
4. **Tahapan dan istilah.** "Prabencana", "tanggap darurat", "pascabencana" (T10). Aksi tiap tahap disusun dari
   pasal: prabencana Pasal 35 dan 44–47, tanggap darurat Pasal 48, pascabencana Pasal 57–59. Komando memakai Sistem
   Komando Penanganan Darurat Bencana (Perka BNPB 3/2016; Juklak 10/2023), bukan istilah ICS. Status keadaan darurat:
   siaga darurat, tanggap darurat, transisi darurat ke pemulihan (Perban 4/2020). Istilah "subsiden" ditulis
   "penurunan muka tanah"; "Bali–Nusa Tenggara" ditulis "Bali dan Nusa Tenggara".
5. **Hierarki bukti dan dokumen primer.** Angka utama dari sumber resmi (DIBI, IRBI/InaRISK, KRB 2022–2026, BMKG,
   PVMBG, BPS, PDNA, peraturan). Tidak ada skenario korban resmi PuSGeN atau BMKG yang terbuka (PuSGeN 2024 memuat
   bahaya, bukan korban; dikonfirmasi saat dibuka, §8); kalimat yang menyiratkan sebaliknya dilarang. Angka sekunder tidak masuk naskah final; dokumen primer yang wajib dibuka didaftar
   di §8, dan butir yang sumber primernya tidak terbuka dikeluarkan dari badan teks.
6. **Label keyakinan lima.** Resmi, Terverifikasi (sumber primer non-resmi), Estimasi model (belum diuji balik),
   Asumsi kebijakan, Penilaian pakar. Label di tiap tabel, kartu angka, dan chip slide, sama dengan `keyakinan` di
   `data/angka.json`.
7. **IRBI dan DIBI.** IRBI rujukan utama (P9), tetapi tidak dipakai memeringkat (nilai kembar; skala 2025 bilangan
   bulat). IRBI 2025 tidak dibandingkan dengan 2015–2024; tren hanya 2015–2024 (`irbi/README.md` §4). Kelas per
   bahaya tidak ada; peta per bahaya memakai 5 kelas nilai (G19). DIBI berpatahan seri 2024 dan patahan kategori
   2018 dan 2024; tren memakai kategori alam 101–109 atau kelompok gabungan dengan penanda patahan. IRBI (risiko
   termodelkan) dan DIBI (kejadian tercatat) tidak saling memvalidasi; keduanya disajikan berdampingan dengan
   korelasinya, sel IRBI kosong ditulis "tidak dinilai". Jumlah kejadian kekeringan DIBI mengukur intensitas
   pelaporan, bukan keparahan.
8. **Daftar perhatian, bukan peringkat.** Kab/kota masuk daftar perhatian per bahaya bila memenuhi paling sedikit
   dua syarat yang ditetapkan di Bab 3 (§4 dan §5), dengan uji kepekaan bila ambang digeser satu tingkat dan label
   Asumsi kebijakan. Nilai kembar di batas ikut masuk. Rekomendasi per wilayah sungai merujuk kegiatan Pola/RPSDA 10
   WS Jawa yang sudah terbuka (§8, E6), terutama kegiatan pengendalian daya rusak air yang menyebut BPBD/BNPB sebagai
   pelaksana, tanpa menandinginya; WS Pemali-Comal (Pola/RPSDA tidak ditemukan) dibatasi instrumen BNPB/BPBD. Peta per
   WS menunggu poligon WS; sampai itu, tabel per BBWS dan daerah irigasi kewenangan pusat.
9. **Skenario terburuk yang masuk akal.**
   - Definisi NRR: versi terburuk yang masuk akal setelah ekstrem yang sangat tidak mungkin disisihkan. **Lantai:**
     skenario tidak boleh lebih ringan daripada kejadian atau musim tercatat terburuk dalam periode acuan untuk jenis
     dan wilayah yang sama. Yang boleh disisihkan hanya kejadian berpeluang lima tahun < 0,2% (pita 1), dengan alasan
     tertulis. Perban 2/2023 (Lampiran hlm. 14) juga membuka pertimbangan sejarah kejadian terburuk. **Periode acuan:**
     hidrometeorologi DIBI 2008–2025 (musim 2008/09–2025/26); geologi, nonalam, dan sosial 30 tahun (1996–2025), dengan
     sumber terbuka per kejadian (DIBI, USGS impact-text, dokumen resmi). Lantai geologi: megathrust selatan Jawa =
     Pangandaran 2006 (665 meninggal, Terverifikasi); Mentawai–Enggano = Mentawai 2010 (447 meninggal, 56 hilang,
     Resmi); tsunami per wilayah dari kejadian yang sama ditambah Selat Sunda 2018 (437 meninggal, 16 hilang). Aceh 2004
     menjadi lantai tsunami nasional hanya dengan sumber buku resmi BRR (§8, E4).
   - **Satu jenis satu kartu (P10, L20).** Tiap jenis dalam `tema.json` `kosakata.jenis_bencana` (15 jenis) punya
     kartu sendiri dengan lantai kejadian tunggal tercatat terburuk dan tahun tercatat terburuk untuk jenis dan
     wilayah itu, empat besaran P10 (korban jiwa, luas terdampak, kerugian materiil, kerugian imateriil), dan baris
     kepekaan (prinsip 10). Angka lantai per jenis diambil dari turunan `skenario-hidromet/lantai_jenis.csv` (§10) dan
     tidak diketik di naskah sebelum turunan itu ada. Kartu musim hujan dan kemarau adalah **kartu agregat operasional**
     di bab yang sama, dipakai Rencana Aksi Musim Hujan dan Kesiapan Kemarau, dan tidak menggantikan kartu per jenis.
     Nomor kartu di berkas ini adalah ID perencanaan; nomor di naskah mengikuti urutan tampil.
   - **Kemungkinan** = peluang terjadinya skenario itu dalam 2026–2030 pada pita NRR, dengan sumber per jenis (ONI
     untuk fase ENSO; periode ulang PuSGeN 2024 untuk megathrust; laju Poisson gempa platform untuk sumber lain).
     Megathrust Jawa: periode ulang 600 tahun (Mw 9,1 gabungan) dan 400 tahun (Mw 8,9 per segmen) memberi peluang
     lima tahun 0,83% dan 1,24% (turunan penyusun dengan asumsi Poisson, bukan angka PuSGeN), di atas ambang 0,2%,
     sehingga Mw 9,1 tidak boleh disisihkan. Jenis tanpa dasar peluang ditulis "tidak dinilai" dan tidak diberi
     posisi kemungkinan.
   - **Dampak** = kelas 1–5 per aspek Perban 2/2023 Pasal 7 ayat (5) (lingkungan, kependudukan, ekonomi,
     infrastruktur/fisik, layanan sipil); kelas skenario = aspek terberat. Ambang ditetapkan di Bab 3 dari sebaran
     DIBI 2008–2025 sebelum angka skenario diisi.
   - **Format kartu:** tiga blok Perban 2/2023 Pasal 7 (karakteristik ancaman, skenario kejadian, asumsi dampak lima
     aspek), ditambah baris **kebutuhan respons** (standar Perka BNPB 7/2008 dan Perban 3/2018) supaya kartu dapat
     disalin ke rencana kontingensi.
   - **Matriks ketersediaan kuantifikasi** (jenis × metrik, kode Resmi / Turunan / Estimasi model / Tidak
     dikuantifikasi, alasan satu kalimat) adalah kontrak isi semua kartu. Luka dan "pengungsi hari ke-7" tidak
     dipakai (tidak ada di DIBI). Pengungsi = pengungsi tercatat puncak tanggap darurat (hidrometeorologi) atau
     penghuni rumah RB+RS (gempa). Kolom luas dinamai sesuai konsep per jenis dan tidak dibandingkan antarjenis.
   - **Kerugian materiil**, tiga besaran berlabel tetap: (a) nilai aset terpapar KRB (resmi, batas atas, tidak
     dijumlah antarbahaya); (b) kerugian kejadian analog (DaLA, PDNA, Bank Dunia); (c) kebutuhan stimulan rumah,
     hanya untuk gempa, longsor, banjir bandang, tidak disebut kerugian materiil untuk banjir genangan.
   - **Kerugian imateriil** dalam satuan fisik: meninggal dan hilang, pengungsi dan pengungsi-hari (rentang durasi),
     YLL dengan asumsi sisa umur di lampiran metode. DALY tidak dihitung karena data luka dan bobot disabilitas tidak
     ada. Rupiah imateriil hanya di lampiran metode.
   - **Nonalam dan sosial:** kartu analog berangka (korban, luas, kerugian bila ada, durasi, sumber, label) tanpa
     perkalian dan tanpa proyeksi per wilayah; skenario terburuk = analog terbesar dalam 30 tahun terakhir beserta
     alasan analog yang disisihkan.
   - **Larangan tampil:** angka model tidak masuk judul bila melampaui angka tercatat musim yang sama tanpa
     penjelasan; pita yang lebarnya lebih dari satu orde tidak masuk judul, kartu angka, atau RE; korban tsunami
     platform tidak dikutip sampai genangan InaRISK `Inun_*` × penduduk dipakai.
10. **Analisis kepekaan.** Tiap kartu per jenis memuat paling sedikit satu baris kepekaan.
    - **Tuas berkalkulasi:** porsi evakuasi segera (faktor atas paparan tsunami ×1 / ×0,600 / ×0,437 dari Cabinet
      Office Jepang 2025, kasus getaran sisi darat, tsunami kasus 1, musim dingin tengah malam: survei warga 2023 dan evakuasi segera tinggi
      terhadap evakuasi rendah; label Asumsi kebijakan; rentang antarkasus 0,077–0,437 di lampiran metode, ×0,437
      yang paling konservatif); kepatuhan bangunan; cakupan peringatan dini; dan untuk kajian air laju penurunan muka
      tanah bila pengambilan air tanah dihentikan dengan pasokan pengganti. Peringatan dini disajikan dalam dua
      lintasan berdampingan, Renstra IKP 6,10% ke 6,32% (RPJMN KP 08.04.02, baseline 6,00) dan Renas 1.c 11.060 ke
      52.000 per 100.000, dengan rumus sama dan catatan penyebut berbeda; dipecah per jenis; longsor tidak dihitung.
    - **Tanpa perkalian (P10 untuk jenis tanpa model):** pandemi (161.870 kematian resmi lawan 806.815–1.343.849
      kematian berlebih model WHO); kebakaran industri (Plumpang 2023: 17 meninggal resmi hari ke-2 lawan 29 BPBD DKI;
      dengan dan tanpa Morowali 2023 yang sekunder); kebakaran TPA (durasi status 10 hari Jatiwaringin 2026 lawan 21
      hari kabupaten ditambah 14 hari provinsi Sarimukti 2023); konflik sosial (Maluku 1999–2002 sedikitnya 5.000 lawan
      mungkin 10.000 meninggal; dengan dan tanpa analog terbesar, sehingga tanpa Maluku lantai turun ke Poso); kekeringan (kemarau
      berakhir Desember 2026 lawan varian kemarau tahun kedua 2027); karhutla (luas 2015 lawan 2019; kematian berlebih
      asap 2015 91.600 dengan selang 24.000–159.200, Koplitz dkk. 2016); gunung api (tuas evakuasi: sekitar 90.000 jiwa
      di area sapuan tanpa evakuasi, Estimasi model, lawan 386 meninggal tercatat Merapi 2010; Surono dkk. 2012
      memperkirakan 10.000–20.000 jiwa terselamatkan); cuaca ekstrem dan gelombang (pilihan analog tahun terburuk
      dengan dan tanpa tahun berpatahan kategori 2018 dan 2024).
    - Jenis yang kepekaannya hanya kualitatif ditulis di matriks ketersediaan kuantifikasi beserta alasan satu kalimat.
    - Efek dari koefisien asosiasi (R = 8) hanya tampil di kartu dan grafik berpil Asumsi kebijakan, tidak di tesis,
      Pesan Kunci, pita keputusan, atau judul temuan.
11. **Horizon, musim, dan peta jalan.** Horizon 2026–2030 (P4). Target ditulis "Target 2029 (resmi, sumber)"; 2030
    hanya "arah 2030" berlabel Asumsi kebijakan dengan rumus tertulis. Peta jalan: hari ke-0 = tanggal penetapan
    Kepala BNPB; keputusan 14 hari pertama; 100 hari (bila hari ke-0 jatuh November 2026, hari ke-100 jatuh di puncak
    musim hujan Desember 2026–Februari 2027); 2026–2027; 2028–2030. Kedua kajian memuat Rencana Aksi Musim Hujan
    2026/2027 dan Kesiapan Musim Kemarau 2027; 2028–2030 memakai kalender berpemicu ENSO.
12. **Program dan bukti.** Posisi program mengikuti rubrik paket `program-terbukti`: Program (bukti kuat); Program
    dengan syarat (bukti sedang); Program berjalan, wajib evaluasi dampak; Uji coba terukur; Rujukan tata kelola atau
    Pelajaran, bukan teladan. Ditambah kategori sel **aksi wajib menurut peraturan** (berpasal). Sesuai P6, hanya
    posisi kuat dan sedang yang diusulkan untuk diperluas sebagai program; program berjalan tanpa evaluasi mendapat
    rekomendasi evaluasi dampak, bukan klaim keberhasilan. "Belum terbukti" berarti bukti tidak ditemukan, bukan
    program tidak bermanfaat. Program luar negeri tidak diberi status Indonesia; ditulis "Padanan di Indonesia:
    <program>" beserta status padanannya. Bab grand design melaporkan jumlah sel per kategori bukti.
13. **Status usulan (P7).** Tabel silang lima dokumen: RIPB, Renas PB, Renstra BNPB, RPJMN, dan Program Penyusunan
    Peraturan BNPB 2026 (Kepka BNPB 327/2025). Tiap usulan instrumen menyebut peraturan yang diubah atau dibentuk dan
    posisinya di Progsun. Kategori "Sudah ada" diisi untuk instrumen berjalan yang diteruskan tanpa ubah desain.
    Status RIPB dan RPJMN ditandai dari teks Perpres 87/2020 dan Lampiran I–III Perpres 12/2025 yang sudah dibuka (§8,
    E11); sumber kutipan ditulis di kolom status. RPJMN memuat enam indikator BNPB di Lampiran III hlm. 913 (PP 08.04
    penurunan IRB 1,2% dengan baseline 1,54 pada 2023; kapasitas minimal sedang 62% pada 2023 ke 67% pada 2025 dan
    90% pada 2029; peringatan dini 6,00 ke 6,32; status darurat sesuai standar 75 ke 100; daerah pascabencana masif
    100; desa berketahanan 10,31 ke 11,74) dan tidak menyebut nama RIPB di Lampiran I dan II.
14. **Peran, lembaga, dan jalur.** Tiap program dan rekomendasi memuat: pemimpin (PJ Renas bila ada); peran BNPB
    dari kosakata tertutup (koordinasi, NSPK, monev, data/KRB, pendanaan Dana Bersama, komando darurat) dengan pasal
    dasar (Perpres 1/2019 Pasal 18–20; Perban 6/2025 jo. 11/2025); kode peran K/P/R/I; unit OTK berlaku (padanan unit
    Renstra lama ditandai "padanan penyusun"); forum koordinasi (rakor Kemenko PMK; Dewan SDA Nasional, Perpres 53/2022,
    dengan Kepala BNPB sebagai anggota; TKPSDA WS, Permen PU 2/2024; Dewan Pengarah BOP Pantura Jawa); instrumen dan pelaksana daerah (RPBD Perban 3/2026, RPKB Perban 9/2025, renkon
    Perban 2/2023, SPM PP 2/2018 dan Juklak 4–7/2026, Dana Bersama; BPBD, dinas teknis, PDAM). Rekomendasi tanpa jalur
    daerah ditandai "hanya pusat". Program yang pemimpinnya bukan BNPB hanya boleh muncul di rekomendasi lintas K/L.
    Matriks lembaga dipisah: **mandat tertulis** (jenis_bukti = tertulis, berpasal) sebagai matriks utama dan
    **usulan penugasan** (pemetaan penyusun) dengan instrumen yang diperlukan untuk menetapkannya. Nomenklatur dari
    `lembaga/lembaga.csv` (Perpres 90/2025); "Kementerian ESDM (Badan Geologi)".
15. **Tanpa pagu dan biaya proyek (P5).** Pembiayaan = arsitektur sumber dana. DSP hanya pada status keadaan darurat,
    keadaan tertentu, dan risiko berdampak luas yang ditetapkan Kepala BNPB (Perban 4/2020 Pasal 20 ayat (1)).
    Mitigasi prabencana diarahkan ke Dana Bersama jendela prabencana (Perpres 75/2021 Pasal 6 ayat (2) dan Pasal 8:
    permohonan tertulis pemda atau K/L kepada BNPB, telaah BNPB setelah koordinasi dengan Kemenko PMK dan pertimbangan
    Kemenkeu, Bappenas, Kemendagri, lalu rekomendasi Kepala BNPB kepada Menteri Keuangan; Perban 1/2026; Juklak
    2/2026), dana kontinjensi bencana APBN untuk kesiapsiagaan prabencana (PP 22/2008 Pasal 6 ayat (1)), APBN K/L,
    APBD, dan dana desa; BTT APBD dan DSP di anggaran BPBD (PP 22/2008 Pasal 6 ayat (3)) untuk darurat daerah. Untuk
    konflik sosial, pendanaan penghentian konflik dan rekonsiliasi pascakonflik diambil dari DSP APBN dan BTT APBD oleh
    unsur Satgas Penyelesaian Konflik Sosial (UU 7/2012 Pasal 55 ayat (1)), yang di sisi BNPB berjalan pada keadaan
    tertentu (Perpres 46/2026 Pasal 3 ayat (2) huruf c). Profil kerugian tahunan batas bawah (rumah rusak DIBI × stimulan)
    boleh tampil sebagai dasar lapisan, berlabel Asumsi kebijakan.
16. **Satu register rekomendasi.** Rekomendasi kedua kajian ditarik dari satu register ber-ID tunggal (§6). Kajian 1
    memuat irisan Jawa dan air. Satu daftar 100 hari dan satu daftar keputusan yang diminta.
17. **Tanpa pengulangan.** Bab per jenis bencana berhenti di bahaya dan histori, status resmi, sebaran, kartu skenario,
    kesenjangan spesifik, dan implikasi. Strategi hanya di bab grand design (matriks fase × jenis), lembaga hanya di
    bab kelembagaan, rekomendasi hanya di bab kesimpulan. Bab tinjauan pustaka ≤ 8 hlm; benchmark dipakai di kartu
    program tempat ia dipakai.
18. **Wajib di tiap kajian:** rekonsiliasi angka; arsitektur pembiayaan; instrumen hukum; indikator kinerja; peta
    jalan; matriks mandat tertulis dan usulan penugasan; pemantauan dan pelaporan; tabel yang berubah dari Renas PB;
    keputusan yang diminta; agenda bukti; yang sengaja tidak direkomendasikan; yang belum diketahui.
19. **Silsilah, produsen, dan Walidata.** Tiap angka di lampiran punya sumber, tanggal tarik, dan skrip reproduksi;
    data dibekukan per tanggal batas. Keluaran simulasi platform Pantau Bencana bukan Data Bencana menurut Perban
    1/2023 (Pasal 1 angka 3 dan 6); tiap gambar dan tabel model memuat pernyataan produsen di samping label "Estimasi
    model". Lampiran data per kab/kota diusulkan diserahkan ke Pusdatinkom (Walidata) untuk portal Satu Data Bencana;
    peta web tetap dibangun lokal di situs Pantau Bencana (T3).
20. **Tiga keluaran satu sumber.** Peta dan grafik dibangun dari satu set data, tampil di peta web, dirender PNG untuk
    DOCX dan PDF; angka identik di ketiganya dan di deck.

---

## 3. Bagian depan (sama di kedua kajian)

Urutan (Buku Pegangan L6): Sampul → Kolofon (halaman keterangan terbitan, L70) → Kata Pengantar Kepala BNPB (1–2 hlm)
→ Daftar Isi → Daftar Tabel → Daftar Gambar → Daftar Lampiran → Daftar Singkatan → **Ringkasan Eksekutif** → BAB 1.
Nomor romawi kecil. Kata Pengantar ditulis sebagai draf untuk ditandatangani Kepala BNPB (nama dan gelar sesuai deck
BNPB 21 Oktober 2026) dan ditandai untuk diperiksa pemilik (T7): penanda periksa pemilik terpasang di halaman Kata
Pengantar DOCX dan tercatat di log QA, dan dilepas hanya setelah pemilik memeriksanya.

Ringkasan Eksekutif dua lapis:

- **Lapis keputusan (2 hlm, dapat dibaca terpisah).** Halaman Pesan Kunci (B5.26, L14): tesis, lalu 6–8 temuan
  bernomor (satu temuan berangka paling banyak 3 baris), lalu pita ringkas 2–3 keputusan yang diminta (kode KD dan
  satu baris pilihan). Halaman kedua: keputusan yang diminta beserta akibat tiap pilihan (pita B5.25), 4–6 kartu
  angka (kartu pertama: jumlah kab/kota di daftar perhatian), rekomendasi 100 hari berlembaga.
- **Lapis rincian (4–6 hlm).** Temuan bernomor lengkap bergaya Isi Temuan, satu peta, tiga risiko teratas dan tiga
  kapasitas yang sudah ada, ringkasan Rencana Aksi Musim Hujan 2026/2027 (1 hlm), ringkasan tabel yang berubah dari
  Renas PB, yang belum diketahui.

---

## 4. Kajian 1

**Grand Design Ketahanan Air Pulau Jawa 2026–2030**
*Pengelolaan Air pada Musim Kemarau dan Musim Hujan untuk Pengurangan Risiko Bencana*

**Lingkup.** Enam provinsi, 119 kab/kota. Lima komponen: air baku dan air minum, irigasi, waduk dan bendungan, air
tanah, penurunan muka tanah (termasuk pesisir utara). Ancaman: kekeringan (krisis air bersih, karhutla Jawa,
kebakaran TPA saat kemarau), banjir dan banjir bandang, tanah longsor, cuaca ekstrem, gelombang ekstrem, abrasi, dan
rob. Analisis sampai kab/kota **bila datanya tersedia**; tingkat data tiap komponen dinyatakan di Tabel 3.1. Isi
≤ 110 hlm: alokasi 108 hlm, cadangan 2 hlm.

**Pesan inti (hipotesis kerja; dikunci setelah Bab 4–6 dan disimpan di `angka-kunci.json` kunci `tesis`):**
"Pada 2015–2026, tanah longsor dan banjir mencatat 1.412 dari 1.738 korban meninggal bencana hidrometeorologi di
Pulau Jawa, sedangkan kekeringan tidak mencatat korban jiwa tetapi berdampak pada 4.924.057 jiwa dalam satu tahun
(2018, DIBI); Grand Design 2026–2030 memakai korban jiwa sebagai ukuran keberhasilan musim hujan dan membentuk baseline
gangguan air bersih dan pangan per kab/kota paling lambat 2027 sebagai ukuran keberhasilan musim kemarau."
Sumber: `dibi/README.md` (Jawa hidromet 2015–2026: longsor 924, banjir 488, total 1.738, kekeringan 0);
`air-jawa/dibi_kab_tahun.csv` (terdampak kekeringan Jawa terbesar 2018: 4.924.057; terdampak juga bergantung pada
pelaporan, catatannya di Bab 5). Ukuran kemarau di tesis dijanjikan lewat sasaran pembentukan baseline Tabel 8.1 (V07).
Label Resmi.

**Keputusan yang diminta di Pesan Kunci:** KD-1, KD-2, KD-5 (§6).

### BAB 1 PENDAHULUAN (7 hlm)

- **Subbab:** 1.1 Latar Belakang; 1.2 Batas Mandat BNPB dalam Pengelolaan Air; 1.3 Tujuan; 1.4 Lingkup dan
  Resolusi Data; 1.5 Keterkaitan dengan RIPB, Renas PB, Renstra BNPB, RPJMN, dan Pola PSDA; 1.6 Status Dokumen dan
  Jalur Adopsi; 1.7 Sistematika.
- **Tujuan bab:** menjelaskan mengapa Grand Design dibutuhkan sebelum musim hujan 2026/2027, di mana batas mandat
  BNPB dalam rezim air, dan data apa yang benar-benar tersedia.
- **Pertanyaan kunci:**
  1. Mengapa kemarau 2026 dan musim hujan 2026/2027 menuntut tindakan dalam 100 hari pertama?
  2. Bagian mana dari pengelolaan air yang menjadi kewenangan BNPB/BPBD, kepala daerah, dan Kementerian PU menurut
     UU 17/2019 Pasal 35?
  3. Komponen air mana yang dapat dianalisis sampai kab/kota?
  4. Bagaimana kajian ini masuk ke peninjauan Renas PB?
- **Temuan kunci yang diharapkan:**
  - Jawa menampung 56,10% penduduk nasional (151,59 juta, SP2020, BRS BPS No. 7/01/Th. XXIV; Resmi) di sekitar 7%
    luas wilayah, dengan 6,3% air permukaan nasional (Estimasi model, BPS 2020 mengutip Radhika dkk.). Penyebut per
    kab tetap penduduk KRB InaRISK (152.402.534 dari 271.680.290, juga 56,10%) sampai proyeksi BPS provinsi ditarik.
    `air-jawa/kab_jawa.csv` (`penduduk_krb_inarisk`), `air-jawa/neraca_jawa.csv`.
  - El Niño sangat kuat: indeks ENSO JAS +2,63, anomali Niño3.4 akhir Agustus +2,83, IOD Agustus +0,376; awal musim
    hujan mundur di 529 ZOM (61,08% daratan). Jawa: awal sebagian November dan sebagian besar Desember 2026; puncak
    sebagian Januari dan sebagian besar Februari 2027. Hari tanpa hujan lebih dari 60 hari di banyak pos di 25
    provinsi, terpanjang 131 hari di Bantul (siaran pers BMKG 22 September 2026, Resmi; subtotal ZOM dikutip per
    kategori, tidak dijumlah). ONI JAS 2026 = 2,16, di atas JAS 2015 (1,73) dan JAS 1997 (1,79)
    (`riset/mentah/oni_cpc.txt`).
  - Tanah longsor 924 dan banjir 488 dari 1.738 korban meninggal hidrometeorologi Jawa 2015–2026 (`dibi/README.md`).
  - Tiga jangkar Pasal 35 (prinsip 2), teks di `lembaga/mentah/teks/uu-17-2019.json.gz`.
- **Komponen:** Kotak 1.1 tiga jangkar batas mandat UU 17/2019 Pasal 35 (B5.5); Gambar 1.1 garis waktu prakiraan
  musim 2026/2027 di Jawa: kemarau, awal hujan, puncak (G23, B5.23; data BMKG); Tabel 1.1 keterkaitan dokumen
  perencanaan (B5.7); Tabel 1.2 ringkasan resolusi data per komponen (rinci di Tabel 3.1).
- **Status data:** ada (DIBI, KRB, teks UU 17/2019, siaran BMKG 22 September 2026, BRS SP2020); celah (rilis BMKG 2
  Oktober 2026 dan tabel per ZOM tidak ditemukan, §8; proyeksi penduduk kab/kota BPS provinsi belum ditarik).
- **Halaman:** 7.

### BAB 2 TINJAUAN PUSTAKA DAN KERANGKA KONSEPTUAL (8 hlm)

- **Subbab:** 2.1 Risiko Hidrometeorologi dan Ketahanan Air; 2.2 Iklim Pulau Jawa: Monsun, ENSO, dan IOD; 2.3 Kajian
  BNPB Terdahulu; 2.4 Regulasi dan Kelembagaan Air; 2.5 Dokumen Sektor yang Dirujuk; 2.6 Praktik Pembanding dan
  Pelajaran.
- **Tujuan bab:** menempatkan kajian di atas yang sudah ditetapkan BNPB dan sektor air, dan memilih praktik
  pembanding yang terbukti dan dapat dialihkan.
- **Pertanyaan kunci:**
  1. Apa yang sudah dikuantifikasi KRB 2022–2026, IRBI, Buku RBI 2023, dan NAR 2023 untuk Jawa, dan apa yang
     ditambahkan kajian ini?
  2. Regulasi mana yang berlaku per Oktober 2026 untuk tiap komponen air, termasuk bagian UU 23/2014 yang dicabut UU
     17/2019 Pasal 77?
  3. Dokumen sektor mana yang dirujuk tanpa ditandingi?
  4. Praktik mana yang terbukti dan dapat dialihkan ke Jawa, dan mana yang tidak?
- **Temuan kunci yang diharapkan:**
  - KRB 2022–2026 untuk Jawa: kekeringan 152.356.122 jiwa terpapar, bahaya tinggi 2.877.406 ha, potensi kerugian
    Rp450,08 T; banjir 63.189.232 jiwa, Rp406,46 T; longsor 13.054.323 jiwa, Rp351,72 T (nilai aset terpapar, tidak
    dijumlah antarbahaya). `skenario-hidromet/kartu_skenario.csv`.
  - Satu-satunya program air berbukti kuat: pengendalian pengambilan air tanah dengan pasokan air pengganti, zonasi,
    dan tarif (Tokyo, Osaka, Bangkok; P16). PAMSIMAS berbukti sedang (P13). Room for the River sedang tetapi
    berposisi uji coba (P18). Delta Programme rujukan tata kelola (P17, lemah). Empat Sungai Korea pelajaran negatif
    tanpa pasangan domestik berdokumen (laporan Bappenas tentang tanggul Pekalongan 2019 tidak ditemukan, §8); tanggul
    Pekalongan 2019 yang dilaporkan tenggelam pada 2022 hanya disebut lewat baris P15 (Terverifikasi). Singapura dan Murray–Darling satu
    kalimat "tidak dapat dialihkan" (pasar hak air belum dimungkinkan UU 17/2019). `program-terbukti/kompendium_program.csv`,
    `riset/C-benchmark.md` §4.
  - Regulasi berlaku: UU 17/2019 jo. UU 6/2023; PP 30/2024; PP 37/2010; PP 122/2015; Permen PUPR 14/PRT/M/2015
    (ambang irigasi); Perpres 77/2025 (BOP Pantura Jawa); UU 18/2008; status PP 43/2008 dan penerbit izin air tanah
    "belum pasti" (`lembaga/README.md` §4.3, C16).
  - Dokumen sektor: Pola dan RPSDA 10 WS Jawa dengan nomor Kepmen (antara lain Pola Bengawan Solo Kepmen PUPR
    605/KPTS/M/2023, RPSDA Brantas Kepmen PUPR 904/KPTS/M/2021, Pola Jratunseluna Kepmen PUPR 1294/KPTS/M/2022 dan
    RPSDA 2024, Pola Ciliwung-Cisadane Kepmen PU 26/KPTS/M/2015; Pemali-Comal tidak ditemukan; daftar lengkap
    `riset/E-dokumen-primer.md` E6); NCICD (data per 17 Juli 2025); Giant Sea Wall Pantai Utara Jawa sebagai PSN
    Swasembada Air baru (RPJMN Lampiran I hlm. 73; Resmi); Citarum Harum; 19 bendungan PSN di Jawa (Permenko
    Perekonomian 16/2025 Lampiran bagian G, masih berlaku setelah Permenko 4/2026).
- **Komponen:** Tabel 2.1 kajian BNPB terdahulu × temuan pokok × yang ditambahkan (B5.7); Tabel 2.2 kronologi
  regulasi air (B5.31); Gambar 2.1 ONI 2008–2026 dengan musim El Niño kuat dan La Niña (G2, `riset/mentah/oni_cpc.txt`);
  Tabel 2.3 praktik pembanding: kekuatan bukti, posisi, padanan di Indonesia, yang tidak dapat dialihkan (B5.7;
  baris kompendium saja); Halaman studi kasus 2.1 Tokyo dan Bangkok (B5.30) dengan Gambar 2.2 laju penurunan muka
  tanah sebelum dan sesudah pengendalian (G14, `program-terbukti/bukti_dampak.csv` P16).
- **Status data:** ada (KRB, kompendium, lembaga, Pola/RPSDA 10 WS, daftar PSN, RPJMN); sebagian (Pola/RPSDA
  Pemali-Comal tidak ditemukan; nomor Kepmen RPSDA selain Brantas dan Jratunseluna 2016 tidak terbaca; NCICD kedaluwarsa
  sekitar 15 bulan).
- **Halaman:** 8 (termasuk 1 hlm studi kasus).

### BAB 3 METODOLOGI DAN DATA (9 hlm)

- **Subbab:** 3.1 Kerangka Analisis; 3.2 Unit Analisis dan Resolusi Data per Komponen; 3.3 Sumber, Produsen Data,
  dan Label Keyakinan; 3.4 IRBI dan DIBI Dibaca Berdampingan; 3.5 Aturan Daftar Perhatian Kab/Kota; 3.6 Skenario
  Terburuk yang Masuk Akal; 3.7 Kerugian Materiil dan Imateriil; 3.8 Analisis Kepekaan; 3.9 Rekonsiliasi Angka;
  3.10 Keterbatasan dan Indikator yang Belum Dapat Ditarget.
- **Tujuan bab:** membuat setiap angka dan setiap daftar kab/kota dapat diperiksa ulang oleh BPBD dan K/L.
- **Pertanyaan kunci:**
  1. Komponen dan indikator mana yang tersedia per kab/kota, provinsi, BBWS, titik, atau tidak ada?
  2. Bagaimana kab/kota masuk daftar perhatian tanpa memeringkat IRBI dan tanpa indeks buatan sendiri?
  3. Bagaimana skenario terburuk, lantai, kemungkinan, dan skala dampak didefinisikan?
  4. Angka mana yang berbeda versi, dan versi mana yang dipakai?
- **Aturan daftar perhatian (ditulis di 3.5):** kab/kota masuk daftar perhatian bahaya X bila memenuhi paling sedikit
  dua dari: (a) nilai IRBI 2025 bahaya X di kelas nilai teratas dari 5 kelas G19 untuk 119 kab Jawa (nilai kembar di
  batas ikut); (b) kejadian DIBI bahaya X tercatat pada ≥ 3 dari 11 tahun 2015–2025 (`n_baris`); (c) meninggal dan
  hilang atau mengungsi DIBI 2015–2025 di kuartil atas Jawa; (d, komponen air) kondisi struktural terverifikasi: kota
  dengan laju penurunan muka tanah terverifikasi atau daerah irigasi kewenangan pusat (CAT rusak tidak dipakai: artikel
  Badan Geologi 22 Januari 2024 tidak memuat kategori, kriteria, atau tanggal penetapan status, §8); (e, bila data
  diperoleh) status siaga atau tanggap darurat berulang (SK kepala daerah). Uji
  kepekaan: jumlah kab yang berubah bila ambang (b) digeser ±1 tahun dan (a) digeser satu kelas. Label Asumsi kebijakan.
- **Temuan kunci yang diharapkan:**
  - Resolusi: irigasi per kab dari OCR Permen PUPR 14/2015 (baseline 2015; 96 dari 175 subtotal cocok penuh dengan
    baris DI); air minum per kab hanya Jawa Tengah (35 kab); 37 bendungan dalam paket (18 resmi BBWS Pemali-Juana, 19
    sekunder); penurunan muka tanah per kota (27 baris, tidak sebanding antarbaris); air tanah per kab tidak ada; IPA
    per WS tidak ada; kab ke WS resmi hanya kategori C (`air-jawa/README.md` §3, §6).
  - IRBI 2025 kekeringan Jawa hanya 15 nilai unik untuk 119 kab, median 10; status total 118 Sedang, 1 Tinggi
    (`air-jawa/irbi_kab_2015_2025.csv`).
  - Spearman IRBI 2025 lawan kejadian DIBI 2015–2025: 0,18 (kekeringan), 0,19 (banjir), 0,20 (longsor); IRBI longsor
    kosong di 23 kab, 15 di antaranya punya kejadian longsor DIBI (`air-jawa/kab_jawa.csv`, dihitung 23 Okt 2026).
  - DIBI kekeringan Jawa 2015 hanya 5 kejadian di 3 kab, sedangkan 2018 90 kejadian dan 4.924.057 terdampak
    (`air-jawa/dibi_kab_tahun.csv`): jumlah kejadian mengukur intensitas pelaporan.
  - Rekonsiliasi: Jatiluhur 3.000 lawan 2.440 juta m³; Cirata 2.165 lawan 1.900; penurunan muka tanah Pekalongan tujuh
    baris ditambah GNSS CPKL −107,0 mm/tahun 2010–2021 (Susilo dkk. 2023, satu titik); Semarang: GNSS CSEM −0,8
    mm/tahun lawan 2–10 cm/tahun Badan Geologi 2018 yang dikutip RPSDA Jratunseluna 2024 Tabel 5.83 (satu stasiun tidak
    mewakili kota); DI Jatiluhur bagian Bekasi 52.728 ha (bukan 82.728); NCICD dua versi; penduduk WorldPop lawan KRB
    (Kota Yogyakarta 42%, Kep. Seribu 19%); penduduk Jawa BRS SP2020 151,59 juta lawan KRB 152.402.534; empat angka
    cakupan peringatan dini.
- **Komponen:** Tabel 3.1 matriks resolusi data: komponen × tingkat × status (ada resmi, ada sekunder, tidak ada) ×
  label × lembaga pemegang data (B5.7); Gambar 3.1 rantai metode (B5.23, G21); Tabel 3.2 korelasi IRBI dan DIBI per
  bahaya (B5.7); Tabel 3.3 aturan daftar perhatian dan uji kepekaan (B5.7); Tabel 3.4 skala dampak 1–5 per aspek
  Perban 2/2023 (B5.7); Tabel 3.5 matriks ketersediaan kuantifikasi per jenis × metrik, termasuk baris kepekaan dan
  alasan bila kepekaan hanya kualitatif (G16); Tabel 3.6 tiga besaran kerugian (B5.7); Tabel 3.7 rekonsiliasi angka
  (B5.7); Tabel 3.8 indikator yang belum dapat ditarget dan lembaga pemegang datanya (B5.7).
- **Status data:** ada; celah dicatat di §7 (Pola/RPSDA Pemali-Comal, air tanah, debit sungai Jawa: 0 titik GloFAS).
- **Halaman:** 9.

### BAB 4 KONDISI SUMBER DAYA AIR PULAU JAWA (14 hlm)

- **Subbab:** 4.1 Ketersediaan dan Pemakaian Air; 4.2 Air Baku dan Air Minum; 4.3 Irigasi; 4.4 Waduk dan Bendungan;
  4.5 Air Tanah; 4.6 Penurunan Muka Tanah dan Pesisir Utara; 4.7 DAS dan Tutupan Lahan Hulu.
- **Tujuan bab:** menggambarkan lima komponen pada tingkat data yang ada; komponen tanpa data ditulis sebagai celah
  dan permintaan data, bukan peta kosong.
- **Pertanyaan kunci:**
  1. Berapa porsi rumah tangga tiap provinsi yang bersumber air minum leding lawan sumur dan mata air, yaitu sumber
     yang rentan saat kemarau?
  2. Berapa luas irigasi per kab/kota dan kewenangan, dan di mana daerah irigasi kewenangan pusat?
  3. Bendungan mana yang kehilangan tampungan dan instrumen keamanannya rusak menurut dokumen resmi?
  4. Kota mana yang punya laju penurunan muka tanah terverifikasi, dan CAT mana yang dinyatakan rusak?
- **Temuan kunci yang diharapkan:**
  - IPA Jawa 2010 54% (kritis sedang), 42% tanpa aliran pemeliharaan (Estimasi model; konteks pulau saja).
    `air-jawa/ipa_pulau_2010.csv`. Proyeksi per kapita 2030 (sumber tersier, terbit 2017) tidak dipakai di judul.
  - Neraca dan defisit air baku per WS dikutip dari RPSDA 10 WS tanpa ditandingi, misalnya Jratunseluna 2024: rata-rata
    defisit air baku 41,60 m³/detik, terutama Grobogan, Pati, Demak, Blora, Kota Semarang (hlm. 27–28; Resmi, dokumen
    Kementerian PU). Pemali-Comal ditulis "Pola/RPSDA tidak ditemukan".
  - Air minum layak 2025 95,73–99,98% di semua provinsi, sehingga tidak membedakan risiko kemarau; leding 2023 DKI
    7,64%, Banten 2,18% dengan catatan tabel tidak sejajar (`air-jawa/air_minum.csv`). "Layak" tidak berarti tersedia
    saat kemarau; leding (Susenas) bukan cakupan jaringan perpipaan PU.
  - Irigasi Jawa 3.135.123 ha (34,3% nasional), permukaan 3.001.332 ha; 94 DI pusat, 457 DI provinsi
    (`air-jawa/irigasi_kab.csv`, `irigasi_di_pusat_provinsi.csv`, `irigasi_rekonsiliasi.csv`). Persentase jaringan
    rusak per provinsi tidak ditemukan (permintaan data e-PAKSI).
  - Cacaban 90 ke 45,13 juta m³ (2021), sekitar 50% tampungan hilang; Kedung Ombo 5,5%; piezometer rusak Kedung Ombo
    3 dari 58, Penjalin 12 dari 51, Jatibarang 11 dari 39 (BBWS Pemali-Juana 2021; Resmi). `air-jawa/bendungan.csv`,
    `bendungan_angka.csv`.
  - Penurunan muka tanah terverifikasi: Pekalongan 10–19 cm per tahun (Widodo dkk. 2024) dan GNSS CPKL −107,0 ± 0,2
    mm/tahun 2010–2021 (Susilo dkk. 2023, divalidasi patok Badan Geologi; satu titik, bukan nilai kota); Semarang maks
    10–12 cm per tahun (Aditiya dan Ito 2023). `air-jawa/subsiden_kota.csv` (hanya baris terverifikasi; sekunder di
    lampiran). RPJMN Lampiran I hlm. 29 menulis penurunan tanah Jakarta dan Semarang 1–15 cm per tahun (Resmi, rentang).
  - CAT rusak: artikel situs resmi Badan Geologi (22 Januari 2024) menyebut antara lain Jakarta, Karawang-Bekasi,
    Semarang, Bandung-Soreang, Bogor, Serang-Tangerang (dan Palangkaraya di luar Jawa); label pernyataan instansi resmi
    tanpa dokumen penetapan status; tidak dipakai sebagai syarat daftar perhatian (`air-jawa/cat_air_tanah_rusak.csv`).
- **Komponen:** Gambar 4.1 diagram hulu ke hilir lima komponen dan pelakunya (B5.23); Tabel 4.1 profil 6 provinsi:
  penduduk KRB, sumber air minum, irigasi per kewenangan, bendungan dalam paket, kota dengan penurunan muka tanah
  terverifikasi (B5.7, `air-jawa/provinsi.csv`); Gambar 4.2 koroplet luas irigasi permukaan per kab/kota 2015 (G19,
  `air-jawa/peta_kab.geojson`); Gambar 4.3 irigasi per provinsi dan kewenangan (G8); Gambar 4.4 titik bendungan dalam
  paket, simbol sebanding kapasitas, atribut "PSN (Permenko 16/2025)", pita "data sedimentasi hanya BBWS Pemali-Juana"
  (G20, `air-jawa/peta_bendungan.geojson`); Tabel 4.4 neraca dan defisit air baku per WS dari RPSDA (B5.7, 10 WS); Tabel 4.2 bendungan BBWS Pemali-Juana: tampungan desain lawan terukur dan
  instrumen rusak (B5.7, resmi saja); Gambar 4.5 rentang laju penurunan muka tanah terverifikasi per kota (G12);
  Tabel 4.3 CAT rusak dan permintaan rilis Badan Geologi (B5.7).
- **Status data:** ada (irigasi, inventaris BBWS Pemali-Juana, penurunan muka tanah terverifikasi, GNSS Pekalongan dari
  Tabel 2 Susilo dkk., neraca RPSDA 10 WS, PSN); sebagian (air minum per kab hanya Jawa Tengah; bendungan bukan
  inventaris lengkap; deret waktu GNSS di Zenodo belum ditarik); celah (air tanah per kab, zona konservasi dan penetapan
  status CAT, debit sungai, IPA per WS di luar RPSDA, kondisi jaringan irigasi): permintaan data ke BPS provinsi,
  Kementerian PU, Kementerian ESDM (Badan Geologi).
- **Halaman:** 14.

### BAB 5 PROFIL RISIKO MUSIM KEMARAU (14 hlm)

- **Subbab:** 5.1 Kemarau 2026 dan Prakiraan BMKG; 5.2 Riwayat Kekeringan dan Krisis Air Bersih; 5.3 Sebaran Risiko
  Kekeringan per Kab/Kota; 5.4 Dampak pada Air Bersih, Pangan, dan Kesehatan; 5.5 Karhutla dan Kebakaran TPA di Jawa;
  5.6 Pengelolaan Air Saat Kemarau: Siapa Mengerjakan Apa; 5.7 Kartu Skenario per Jenis: Kekeringan dan Karhutla.
- **Tujuan bab:** menyatakan risiko kemarau Jawa dengan ukuran yang dipakai BPBD (gangguan air bersih dan pangan),
  menjelaskan perbedaan peta resmi dengan pengalaman lapangan, dan menyiapkan kemarau 2027.
- **Pertanyaan kunci:**
  1. Kab/kota mana yang memenuhi syarat daftar perhatian kekeringan, dan mengapa peta IRBI berbeda dengan pengalaman
     BPBD (contoh Gunungkidul)?
  2. Berapa kab/kota yang mencatat kekeringan pada tahun El Niño dan pada 2026, dengan catatan intensitas pelaporan?
  3. Siapa menetapkan status, menyalurkan air bersih, dan menyediakan sumber air darurat?
  4. Seperti apa kemarau terburuk yang masuk akal untuk 2026–2027, dan apa ukurannya bila korban jiwa tidak berlaku?
- **Temuan kunci yang diharapkan:**
  - IRBI kekeringan 2025 tertinggi Sukabumi (19); Temanggung, Kota Semarang, Karawang, Jombang, Jepara (18); Gunungkidul
    5; Wonogiri, Pacitan, Grobogan, Blora 8; median 10 (`air-jawa/irbi_kab_2015_2025.csv`). Paragraf penjelas: IRBI
    kekeringan dibedakan terutama oleh paparan karena luas bahaya kekeringan KRB mencakup hampir seluruh daratan.
  - Kab/kota mencatat kekeringan (DIBI): 2015: 3 (5 kejadian); 2019: 76; 2023: 43; 2026 sampai 23 Oktober: 55 kab dan
    1.300.190 terdampak (sementara); terdampak terbesar 2018: 4.924.057 (`air-jawa/dibi_kab_tahun.csv`). Jumlah kab dan
    terdampak bergantung pada pelaporan (prinsip 7); keduanya selalu tampil dengan catatan itu dan tidak dipakai di
    tesis atau judul tanpa catatan.
  - Kekeringan Jawa 2015–2026 tidak mencatat korban jiwa (`dibi/README.md`).
  - TPA terbakar 2023–2026 di Jawa: Sarimukti, Kopi Luhur, Putri Cempo, Rawa Kucing, Jalupang, Jatibarang, Jatiwaringin
    (2026; Keputusan Bupati Tangerang 609/2026) (`nonalam-sosial/peristiwa.csv`).
  - Kematian karhutla di Jawa adalah kebakaran hutan dan gunung setempat (2015: Magetan 7, Ponorogo 5), bukan korban
    asap (`skenario-hidromet/README.md`).
  - Penyedia peringatan dini kekeringan hidrologis tidak ditemukan (C17); SPAM bersifat khusus untuk bencana dan
    kekeringan (PP 122/2015) (`lembaga/celah.csv`, `lembaga/README.md` §4.2).
- **Komponen:** Gambar 5.1 ONI dan musim kemarau El Niño kuat 2008–2026 (G2); Gambar 5.2 koroplet IRBI kekeringan 2025,
  5 kelas nilai, legenda nilai (G19, `air-jawa/peta_kab.geojson`); Gambar 5.3 jumlah tahun tercatat kekeringan DIBI
  2015–2025 per kab/kota (G19); Gambar 5.4 kab/kota mencatat kekeringan per tahun 2008–2026 dengan catatan pelaporan
  (G1); Kotak 5.1 IRBI dan pengalaman lapangan (B5.5); Tabel 5.1 daftar perhatian kekeringan dan syarat yang dipenuhi
  (B5.7; turunan baru, Lampiran G); Tabel 5.2 siapa mengerjakan apa saat kemarau: penetap status, pelaksana distribusi
  air, sumber air, pembiayaan (B5.7, `lembaga/peran.csv`); Kartu 5.1 dan 5.2 (B5.11). Kebakaran TPA Jawa tidak
  berkartu sendiri di Kajian 1; Kartu 8.3 Kajian 2 memuat baris Jawa dan dirujuk di 5.5 (prinsip 17).
- **Kartu 5.1 Kekeringan: kemarau El Niño 2026 berlanjut hingga awal 2027 (kartu per jenis, sekaligus agregat musim
  kemarau).** Karakteristik ancaman: ENSO JAS +2,63 dan IOD Agustus +0,376; HTH terpanjang 131 hari di Bantul (BMKG 22
  September 2026). Skenario kejadian: kemarau berlanjut sampai awal musim hujan Desember 2026 di sebagian besar Jawa,
  dengan kemarau tahun kedua 2027 sebagai varian kepekaan bila El Niño bertahan (Asumsi kebijakan; rilis BMKG 2
  Oktober 2026 yang semula dirujuk tidak ditemukan, §8). Kemungkinan: El Niño kuat (ONI ≥ 1,5) tercatat
  pada 3 dari 18 musim 2008–2025 dan sedang berlangsung; pita peluang tidak dinilai. Asumsi dampak: kependudukan
  (terdampak tercatat terbesar 2018 sebagai lantai: 4.924.057; 2026 sementara 1.300.190; korban jiwa "tidak berlaku"
  dengan alasan); lingkungan (bahaya tinggi kekeringan KRB 2.877.406 ha; luas karhutla Jawa SiPongi per provinsi);
  ekonomi (nilai aset terpapar KRB Rp450,08 T berlabel "bukan kerugian"; produksi padi BPS provinsi tahun El Niño
  lawan tren; puso Kementan per kab sebagai permintaan data); infrastruktur (tampungan waduk dari PJT dan BBWS,
  permintaan data); layanan sipil (kab berstatus siaga atau tanggap darurat 2026 dari SK). Kebutuhan respons: kebutuhan
  air darurat = penduduk desa terdampak × (7 l per orang per hari pada tiga hari pertama, lalu 15 l; Perka BNPB
  7/2008) × lama status, dihitung hanya bila data desa terdampak dari BPBD diperoleh (angka Jatim 815 desa dan sekitar
  410 ribu KK tidak dikutip: sumber primer tidak ditemukan, §8). Kepekaan: kemarau berakhir Desember 2026 lawan varian
  tahun kedua 2027. Puso model dan jiwa sel krisis air tidak tampil; keluaran mesin neraca hanya di Lampiran I.
- **Kartu 5.2 Karhutla Jawa (ringkas, per jenis).** Lantai: kejadian tunggal dan tahun tercatat terburuk karhutla
  Jawa dari `lantai_jenis.csv` (DIBI; Jawa 2015–2026 mencatat 32 meninggal karhutla, antara lain 2015 Magetan 7 dan
  Ponorogo 5 akibat kebakaran hutan dan gunung setempat) dan luas terbakar Jawa per provinsi dari SiPongi. Asap karhutla Jawa tidak dikuantifikasi sebagai
  korban; kematian berlebih asap nasional (Koplitz dkk.) hanya di Kartu 7.5 Kajian 2. Kepekaan: luas tahun El Niño
  2015 lawan 2019 dan 2023.
- **Status data:** ada (IRBI, DIBI, KRB, ONI, siaran BMKG 22 September 2026); sebagian (HTH per pos dan prakiraan per
  ZOM tidak ditemukan, §8; HTH platform tidak dipakai karena berbeda dengan BMKG; SK status dari berita); celah (distribusi air per kab, puso per kab, kasus penyakit,
  tampungan waduk harian, Katam Kementan): permintaan data ke Pusdalops, Direktorat Kesiapsiagaan, enam BPBD
  provinsi, Kementan, Kemenkes, PJT dan BBWS, masuk peta jalan 100 hari.
- **Halaman:** 14.

### BAB 6 PROFIL RISIKO MUSIM HUJAN (17 hlm)

- **Subbab:** 6.1 Korban per Bahaya di Jawa 2015–2026; 6.2 Tanah Longsor; 6.3 Banjir, Banjir Bandang, dan Cuaca
  Ekstrem; 6.4 Kejadian Besar dan Pelajarannya; 6.5 Rob, Penurunan Muka Tanah, dan Risiko Kronis; 6.6 Keamanan
  Bendungan dan Tanggul saat Hujan Ekstrem; 6.7 Pengelolaan Air Saat Musim Hujan: Siapa Mengerjakan Apa; 6.8 Kartu
  Skenario per Jenis dan Agregat Musim Hujan; 6.9 Kepekaan Peringatan Dini.
- **Tujuan bab:** menunjukkan bahaya musim hujan yang paling mematikan, menetapkan lantai skenario dari korban
  tercatat, dan menyiapkan musim 2026/2027 setelah El Niño kuat.
- **Pertanyaan kunci:**
  1. Bahaya apa yang mencatat korban terbanyak di Jawa, dan kab/kota mana yang berulang?
  2. Seberapa berat musim hujan tercatat terburuk, dan apa yang diharapkan pada musim 2026/2027?
  3. Di mana penurunan muka tanah memperbesar genangan rob dan banjir sampai 2030?
  4. Bendungan dan tanggul mana yang punya RTD dan terhubung ke rencana kontingensi BPBD?
  5. Seberapa jauh peringatan dini dapat menurunkan korban, dan untuk bahaya apa angka itu tidak dihitung?
- **Temuan kunci yang diharapkan:**
  - Meninggal hidrometeorologi Jawa 2015–2026: longsor 924 (53%), banjir 488, cuaca ekstrem 207, banjir dan longsor 71,
    karhutla 32, banjir bandang 11, gelombang dan abrasi 5 (`dibi/README.md`).
  - Lantai: meninggal+hilang tercatat terbesar dalam 18 musim 2008/09–2025/26 adalah 2008/09 (173 + 97 = 270); dalam
    10 musim terakhir 2025/26 (216 + 21 = 237) (`skenario-hidromet/musim_hujan.csv`). Pilihan "musim terberat" menurut
    gabungan lima metrik (2019/20) bergantung pada satu rekaman Kota Bekasi 366.274 mengungsi (84,5% dari 433.628,
    status tidak terbukti); uji kepekaan pemilihan analog dengan dan tanpa rekaman itu (`dibi/README.md`,
    `dibi/rekonsiliasi.csv`). Model rasio 2020/21 (254–547) dan 2019/20 (205–447) tampil berdampingan sebagai "musim
    berat tipikal" berlabel Estimasi model, dengan kalimat bahwa metode ini tidak menangkap kejadian katastrofik.
  - Musim setelah El Niño kuat di Jawa: 2009/10 (153 + 16), 2015/16 (62 + 6), 2023/24 (84 + 6; memuat jebolnya tanggul
    Sungai Wulan Demak–Kudus Maret 2024) (`musim_hujan.csv`, `dibi/kejadian_besar.csv`).
  - Kejadian besar berangka resmi: banjir Jabodetabek 2007 kerusakan dan kerugian Rp5.184,43 M (DaLA Bappenas Tabel
    III.1); Jakarta 2013 dan 2020 (DIBI); Demak 2024 (DIBI). Situ Gintung 2009 dimuat bila tanggal di mentah DIBI cocok
    (Kab. Tangerang 2009: 100 meninggal, 93 hilang, `air-jawa/dibi_kab_tahun.csv`). Bengawan Solo 2007 kualitatif.
  - Tambahan penurunan muka tanah 2026–2030 = laju terverifikasi × 4 tahun (Pekalongan 10–19 cm per tahun memberi
    40–76 cm; asumsi laju tetap; Asumsi kebijakan). Rentang Tokyo dan Bangkok (dari ±24 dan > 10 cm ke ±1 cm per
    tahun, sekunder) sebagai tuas bila pengambilan air tanah dihentikan dengan pasokan pengganti.
  - Sistem peringatan dini pada setiap WS (PP 30/2024 Pasal 96) belum dihubungkan ke Perban 2/2024 (C17); RTD bendungan
    disusun pembangun, ditetapkan pemilik, dikonsultasikan ke bupati dan gubernur, dengan BPBD diikutsertakan (PP
    37/2010 Pasal 52–54).
  - Kepekaan peringatan dini, hanya di Gambar 6.6 dan kartu berpil Asumsi kebijakan (prinsip 10): lintasan Renas 1.c
    memberi faktor 0,603; lintasan Renstra IKP (baris `renstra_ikp_2025`, c0 0,061 ke c1 0,0632) memberi 0,998;
    longsor tidak dihitung karena koefisien lintas negara tidak berlaku dan validasi status longsor platform lemah (POD
    0,151) (`skenario-hidromet/kepekaan_peringatan_dini.csv`). Faktor ini tidak masuk pita keputusan KD-2.
- **Komponen:** Tabel 6.1 korban per bahaya di Jawa 2015–2026 (B5.7, `dibi/jawa_kab_hidromet.csv`); Gambar 6.1 peta
  kecil berganda IRBI 2025 banjir, longsor, abrasi (G19); Gambar 6.2 jumlah tahun tercatat longsor per kab/kota dengan
  pita "IRBI longsor tidak dinilai di 23 kab" (G19); Tabel 6.2 daftar perhatian banjir dan longsor (B5.7); Gambar 6.3
  meninggal+hilang per musim hujan Jawa 2008/09–2025/26 dengan penanda La Niña dan musim setelah El Niño kuat (G1,
  `musim_hujan.csv`); Tabel 6.3 kejadian besar dan pelajarannya (B5.7); Gambar 6.4 rantai risiko kronis: pengambilan air
  tanah, penurunan muka tanah, genangan rob dan banjir (B5.23); Gambar 6.5 tambahan penurunan muka tanah 2026–2030 per
  kota terverifikasi (G12, Asumsi kebijakan); Tabel 6.4 siapa mengerjakan apa saat musim hujan (B5.7); kartu per jenis
  6.4, 6.5, 6.6, 6.3 dan kartu agregat musim 6.1, 6.2 (B5.11); Gambar 6.6 kepekaan peringatan dini dua lintasan (G14,
  pil Asumsi kebijakan).
- **Kartu 6.4 Tanah longsor Jawa (per jenis).** Lantai: kejadian tunggal dan tahun tercatat terburuk longsor Jawa dari
  `lantai_jenis.csv` (DIBI 2008–2025); konteks 924 meninggal 2015–2026. Empat besaran: korban jiwa (meninggal dan
  hilang), luas (bahaya tinggi longsor KRB 3.244.158 ha), kerugian materiil (nilai aset terpapar KRB Rp351,72 T
  berlabel bukan kerugian; kebutuhan stimulan rumah RB/RS DIBI), kerugian imateriil (pengungsi dan pengungsi-hari).
  Kepekaan: tahun terburuk dengan dan tanpa patahan kategori 2018 dan 2024 (tanah longsor 2024 hanya 219 kejadian);
  peringatan dini tidak dihitung untuk longsor.
- **Kartu 6.5 Banjir dan banjir bandang Jawa (per jenis).** Lantai banjir dan lantai banjir bandang ditulis sebagai
  dua baris dari `lantai_jenis.csv` (banjir bandang baru menjadi kategori DIBI sejak 2018); kejadian besar berangka
  resmi (Jabodetabek 2007 DaLA, Jakarta 2013 dan 2020, Demak 2024) sebagai pembanding. Empat besaran: korban jiwa,
  luas (bahaya tinggi banjir KRB 1.526.491 ha), kerugian materiil (nilai aset terpapar KRB Rp406,46 T; DaLA 2007;
  stimulan rumah hanya untuk banjir bandang), imateriil (pengungsi tercatat puncak, dengan dan tanpa rekaman Bekasi
  Januari 2020). Kepekaan: rekaman Bekasi; dua lintasan peringatan dini (Asumsi kebijakan).
- **Kartu 6.6 Cuaca ekstrem Jawa (ringkas, per jenis).** Lantai kejadian tunggal dan tahun tercatat terburuk dari
  `lantai_jenis.csv`; konteks 207 meninggal 2015–2026 dan 7.266,67 kejadian (terbanyak di antara jenis hidrometeorologi
  Jawa). Luas tidak dikuantifikasi (tidak ada peta bahaya luas cuaca ekstrem yang sebanding). Kepekaan: pilihan tahun
  analog dengan dan tanpa tahun berpatahan kategori.
- **Kartu 6.1 Musim hujan tercatat terburuk di Jawa (agregat operasional).** Lantai korban 270 meninggal dan hilang (2008/09); baris
  tercatat musim 2025/26 (237) dan 2019/20 (127) berdampingan; aspek lima: kependudukan (meninggal, hilang, mengungsi
  dengan dan tanpa rekaman Bekasi), fisik (rumah RB/RS/RR DIBI; luas bahaya tinggi banjir KRB 1.526.491 ha, longsor
  3.244.158 ha), ekonomi (nilai aset terpapar KRB; kebutuhan stimulan rumah hanya untuk longsor dan banjir bandang;
  DaLA 2007 sebagai pembanding kejadian), layanan sipil (fasilitas rusak DIBI), lingkungan (bila ada). Model rasio
  sebagai pembanding berlabel.
- **Kartu 6.2 Musim hujan 2026/2027 setelah El Niño kuat (agregat operasional dan skenario majemuk transisi).** Analog
  2009/10, 2015/16, 2023/24 dengan angka DIBI resmi per musim; prakiraan BMKG 22 September 2026 (awal mundur di 61,08%
  daratan, musim lebih pendek di 482 ZOM; Jawa: puncak sebagian Januari dan sebagian besar Februari 2027); ancaman sesuai fisiknya: hujan lebat di atas tanah kering pascakemarau, banjir bandang, kegagalan
  tanggul (Demak 2024), longsor awal musim. La Niña (7 dari 18 musim dalam seri) menjadi baris kepekaan fase ENSO untuk
  2027–2030, bukan judul.
- **Kartu 6.3 Gelombang ekstrem, abrasi, dan rob pesisir utara (ringkas, per jenis).** Korban tercatat (1 meninggal,
  kartu Jawa), terpapar KRB gelombang, kab berkejadian rob DIBI 2015–2025, titik peringatan rob BMKG; luas rawan rob
  hanya untuk WS Jratunseluna, 22.897 ha dari simulasi pasang 1,8 m (RPSDA Jratunseluna 2024 hlm. 27–28 dan Tabel 5.86;
  Estimasi model, dokumen resmi Kementerian PU); WS lain "tidak dikuantifikasi" (model rob platform tidak layak, riset
  D §1.4). Kepekaan: tambahan penurunan muka tanah 2026–2030 dengan laju tetap lawan laju bila pengambilan air tanah
  dihentikan.
- **Status data:** ada (DIBI, IRBI, KRB, musim, GNSS Pekalongan, rawan rob Jratunseluna); sebagian (status RTD per
  bendungan; Situ Gintung menunggu cek tanggal; lantai per jenis menunggu turunan `lantai_jenis.csv`); celah (luas
  genangan rob teramati; debit sungai Jawa; kedalaman genangan teruji): ditulis di §7.
- **Halaman:** 17.

### BAB 7 ANALISIS KESENJANGAN (8 hlm)

- **Subbab:** 7.1 Kewenangan dan Batas Mandat; 7.2 Data dan Peringatan Dini yang Berfungsi; 7.3 Infrastruktur, Operasi,
  dan Keamanan Bendungan; 7.4 Tata Ruang dan Pengendalian Air Tanah; 7.5 Pembiayaan; 7.6 Kapasitas BPBD dan Instrumen
  Daerah; 7.7 Kesenjangan Bukti Program; 7.8 Yang Sudah Berjalan dan Tidak Boleh Dikorbankan.
- **Tujuan bab:** menamai yang menahan, dengan bukti, dan yang harus dipertahankan.
- **Pertanyaan kunci:**
  1. Di titik mana kewenangan air tumpang tindih atau kosong?
  2. Apa yang membuat peringatan dini tidak sampai ke warga?
  3. Komponen dan musim mana yang tidak punya program terbukti?
  4. Apa yang sudah berjalan dan tidak boleh dikorbankan?
- **Temuan kunci yang diharapkan:**
  - Celah kewenangan air: C05 irigasi tiga tingkat ditambah jaringan tersier Kementan; C06 penurunan muka tanah dua
    rezim (PP 43/2008 dan PP 30/2024) dan BNPB serta Kementerian ESDM tidak duduk di Dewan Pengarah BOP Pantura Jawa;
    C07 dasar spasial air tanah berbeda; C13 tiga pelaku tanggul pesisir Jakarta; C17 penyedia peringatan dini
    kekeringan hidrologis tidak ditemukan (`lembaga/celah.csv`).
  - Peringatan dini: perbedaan tafsir antartingkat dan pemeliharaan sarana yang bergantung pada APBD (Renstra BNPB,
    Ancaman 9–10, korpus `perban-nomor-5-tahun-2025` hlm. 76); cakupan "berfungsi" didefinisikan: alat terpelihara,
    pesan sampai warga, gladi tahunan (Juklak 4/2026 gladi, Juklak 7/2026 KIE).
  - Kapasitas: 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, dan 79 belum menyusun
    IKD 2024 (pernyataan Kemendagri dalam siaran Kemenko PMK 12 September 2025; Resmi, data September 2025); BTT dan
    DSP belum sinkron (Renas, C02).
  - Bukti: irigasi dan keamanan serta sedimentasi bendungan tidak punya program di kompendium; program air dalam negeri
    di kompendium (P10 embung, P11 sumur resapan, P12 Citarum Harum, P14 sodetan dan bendungan kering Ciliwung, P15
    polder dan pompa) berposisi "Program berjalan, wajib evaluasi dampak"; jumlah sel komponen × musim × fase tanpa
    program terbukti dilaporkan.
  - Tidak boleh dikorbankan: InaRISK/IRBI, Satu Data Bencana (Perban 1/2023), Dana Bersama PB (Perban 1/2026),
    rencana kontingensi (Perban 2/2023), PAMSIMAS.
- **Komponen:** Kartu temuan 7.1–7.6 (bukti, dampak, lembaga pembuka; B5.6); Tabel 7.1 tumpang tindih dan celah
  kewenangan air (B5.7); Gambar 7.1 sel komponen × musim × fase menurut kategori bukti (G16); Kotak 7.1 yang tidak
  boleh dikorbankan (B5.5).
- **Status data:** ada; isi temuan BPK belum dibaca dan tidak diklaim.
- **Halaman:** 8.

### BAB 8 GRAND DESIGN DAN STRATEGI (18 hlm)

- **Subbab:** 8.1 Kerangka Program; 8.2 Sasaran 2029 dan Arah 2030; 8.3 Strategi dan Rekomendasi Teknis per Komponen,
  Musim, dan Fase; 8.4
  Rekomendasi per BBWS dan Daerah Irigasi Kewenangan Pusat; 8.5 Daftar Perhatian Kab/Kota dan Instrumen Daerah; 8.6
  Posisi Risiko BNPB terhadap Tanggul Laut Pantura; 8.7 Desa, Sekolah, dan Relawan; 8.8 Rencana Aksi Musim Hujan
  2026/2027; 8.9 Kesiapan Musim Kemarau 2027; 8.10 Agenda Bukti 2026–2030.
- **Tujuan bab:** menyusun sasaran, strategi, dan aksi yang dapat dijalankan dengan instrumen yang berlaku, dimulai
  sebelum puncak musim hujan 2026/2027.
- **Pertanyaan kunci:**
  1. Sasaran 2029 apa yang punya baseline resmi untuk Jawa, dan baseline apa yang harus dibentuk?
  2. Aksi apa per komponen, musim, dan fase, siapa pemimpinnya, dan apa peran BNPB?
  3. Apa yang harus selesai sebelum puncak musim hujan di Jawa (sebagian Januari, sebagian besar Februari 2027)?
  4. Aksi teknis apa per komponen dan musim yang berada dalam mandat BNPB/BPBD, dan masukan teknis apa yang dibawa
     ke K/L pemimpin tanpa menandingi Pola/RPSDA?
  5. Apa posisi BNPB terhadap Tanggul Laut Pantura?
  6. Bagaimana program berjalan tanpa evaluasi dampak dibuktikan sampai 2030?
- **Temuan kunci yang diharapkan:**
  - Sasaran: irisan Jawa Renas 1.a dan 1.b (dari DIBI) dan 1.c (cakupan peringatan dini kab/kota Jawa; baseline
    diminta ke Direktorat Peringatan Dini); target proses: persentase bendungan di hulu permukiman yang RTD-nya
    terintegrasi dengan rencana kontingensi BPBD (baseline dibentuk 2027); sasaran pembentukan baseline bertenggat:
    laju penurunan muka tanah terukur GNSS/InSAR kota pesisir utara (2027; titik awal CPKL Pekalongan), kondisi jaringan
    irigasi e-PAKSI (2027), neraca air per WS dikutip dari RPSDA 10 WS. Sasaran pembentukan baseline kemarau bertenggat
    2027 (V07): (i) desa terdampak kekeringan dan liter air darurat tersalur per kab/kota per musim, diukur terhadap
    standar Perka BNPB 7/2008 (pemegang data BPBD; pengumpul Pusdatinkom; pengguna Direktorat Kesiapsiagaan); (ii) puso
    kekeringan per kab/kota (Kementan); (iii) kab/kota berstatus siaga atau tanggap darurat kekeringan per tahun dari SK
    kepala daerah (BPBD, Pusdalops). Target tampungan Kementerian PU hanya konteks.
  - Matriks komponen × musim × fase: tiap sel berisi aksi bernomor dengan kategori bukti (prinsip 12) atau "tidak
    berlaku" beralasan.
  - **Rekomendasi teknis per komponen dan musim (8.3, Tabel 8.7), dua lapis.** Tiap baris memuat aksi, posisi bukti,
    pemimpin K/L, peran BNPB (K/P/R/I), status P7, dan dasar; tanpa biaya (P5); program berposisi "Program berjalan,
    wajib evaluasi dampak" direkomendasikan untuk dievaluasi, bukan diperluas (P6).
    - *Lapis 1, dalam mandat BNPB/BPBD.* Air baku saat kemarau: standar distribusi air darurat Perka BNPB 7/2008 (7 l
      per orang per hari pada tiga hari pertama, lalu 15 l), sumber air darurat (sumur bor darurat, penampungan air
      hujan, mobil tangki) lewat status siaga darurat dan DSP (Perban 4/2020), pencatatan liter tersalur per desa.
      Bendungan: RTD dan sistem peringatan hilir terintegrasi dengan renkon BPBD (PP 37/2010 Pasal 52–54). Banjir dan
      longsor: sistem peringatan dini pada setiap WS (PP 30/2024 Pasal 96) dihubungkan ke Perban 2/2024; renkon banjir
      dan longsor (Perban 2/2023). Pesisir: KRB rob, renkon kegagalan tanggul dan polder. Penurunan muka tanah: data
      dan KRB, pemantauan GNSS/InSAR bersama BIG dan Badan Geologi. Longsor: relokasi berbasis KRB dan jalur bahaya
      dengan argumen tandingan (L63): padanan domestik R3P Cianjur 2022 yang mengosongkan sembilan desa di jalur Sesar
      Cugenang (gempa, bukan longsor); bukti kegagalan relokasi ditulis dari sumber yang dibuka, atau "belum ditemukan
      di sumber yang dibaca".
    - *Lapis 2, masukan teknis berbasis risiko ke K/L pemimpin* lewat Dewan SDA Nasional dan TKPSDA WS (Kepala BNPB
      anggota Dewan; peran BNPB data/KRB dan koordinasi), berlabel lintas K/L. Air tanah: pengendalian pengambilan
      dengan pasokan pengganti, zonasi, dan tarif (P16, Program bukti kuat; PJ KLH Renas 2.4.4.a, Kementerian ESDM,
      Kementerian PU). Pesisir: polder dan pompa (P15, berjalan wajib evaluasi dampak) hanya dengan RTD dan prasyarat
      P16, karena tanggul Pekalongan 2019 dilaporkan tenggelam pada 2022. Banjir perkotaan: sodetan dan bendungan
      kering Ciliwung (P14, berjalan wajib evaluasi; pengukuran luas dan lama genangan pascaoperasi), sumur resapan
      (P11, lemah; pelengkap, bukan pengendali banjir). Air baku perdesaan: embung dan panen air hujan (P10, berjalan
      wajib evaluasi; inventaris volume dan fungsi). DAS: Citarum Harum (P12, berjalan wajib evaluasi; deret IKA resmi).
      Irigasi: prioritas rehabilitasi jaringan DI kewenangan pusat dari e-PAKSI (permintaan data). Waduk: pemantauan
      sedimentasi di luar BBWS Pemali-Juana. Sungai: normalisasi lawan naturalisasi dengan argumen tandingan (L63):
      Room for the River (P18, uji coba) dan Empat Sungai Korea (pelajaran negatif), lalu posisi kajian.
    - Per WS, rekomendasi lapis 2 merujuk kegiatan RPSDA yang sudah menyebut BPBD/BNPB sebagai pelaksana (misalnya
      RPSDA Ciliwung-Cisadane 2019: kajian peringatan dini banjir, tindak darurat, posko) dan berstatus "Sudah ada".
  - Per BBWS, tiga lapis: (a) sinyal risiko kab/kota yang tertaut resmi; (b) program di Pola/RPSDA atau PSN dikutip
    "Sudah ada" bila dokumennya dibuka; (c) permintaan BNPB yang bersandar mandat tertulis: RTD bendungan (PP 37/2010
    Pasal 52–54) dan sistem peringatan dini pada setiap WS (PP 30/2024 Pasal 96). Lapis (b) kini dapat diisi untuk 10
    WS dari Pola/RPSDA yang terbuka (§8, E6) dan 19 bendungan PSN (Permenko 16/2025); WS Pemali-Comal tanpa Pola/RPSDA
    dibatasi lapis (a) dan (c). `air-jawa/ws.csv`, `irigasi_di_pusat_provinsi.csv`, `bendungan.csv`.
  - Tanggul Laut Pantura (tanpa biaya): prasyarat berbukti kuat berupa pengendalian pengambilan air tanah dengan pasokan
    pengganti (P16); RTD kegagalan tanggul dan polder terintegrasi dengan renkon BPBD pesisir; telaah risiko bencana
    lewat Kemenko PMK di tata kelola BOP Pantura Jawa (Menko PMK Wakil Ketua Dewan Pengarah, C06); Empat Sungai Korea
    sebagai alasan evaluasi independen (argumen tandingan L63). Giant Sea Wall Pantai Utara Jawa tercatat sebagai PSN
    Swasembada Air baru di RPJMN Lampiran I hlm. 73 (Resmi).
  - Rencana Aksi Musim Hujan 2026/2027 (3 hlm): kalender bulanan November 2026–April 2027; hanya instrumen berlaku
    (renkon Perban 2/2023, sistem peringatan dini Perban 2/2024, status siaga darurat dan DSP Perban 4/2020, SKPDB
    Juklak 10/2023); unit: Direktorat Peringatan Dini, Direktorat Kesiapsiagaan, Direktorat Koordinasi Pengendalian
    Operasi Darurat, Direktorat Penanganan Darurat Wilayah I (Jawa Tengah, DIY), II (DKJ, Banten, Jawa Barat), III
    (Jawa Timur), Deputi Bidang Logistik dan Peralatan; BBWS, PJT I dan II, BPBD; awal musim per ZOM BMKG ditumpangkan ke
    kab/kota bila tabel per ZOM diperoleh (bila tidak, tingkat provinsi dari siaran 22 September 2026); kartu agregat 6.1
    dan 6.2 sebagai dasar skenario; hari ke-0 dan hari ke-100 ditandai; keputusan 14 hari pertama.
  - Kesiapan Musim Kemarau 2027 (1,5 hlm): pemicu prakiraan musim dan PDKM BMKG; status tampungan waduk (PJT, BBWS);
    cadangan air baku; prioritas distribusi air; kalender tanam (Katam Kementan); asuransi pertanian (Renas 2.5.1.c, PJ
    Kementan, 278.806 ke 1.250.000 ha).
  - OMC: Sudah ada (BMKG), bukti dampak belum terukur; rekomendasi pencatatan sortie terbuka dan protokol evaluasi
    selisih-dalam-selisih (`public/udara/data/omc_hasil.json`, `scripts/omc/nilai.py`).
  - Destana di desa rawan kekeringan dan longsor Jawa: Program berjalan, wajib evaluasi dampak; garis dasar tingkat
    ketangguhan Perban 7/2025 (utama, madya, pratama).
- **Komponen:** Halaman kerangka 8.1: pilar, sasaran, program berkode (B5.12); Tabel 8.1 indikator: baseline, Target
  2029 resmi, arah 2030 berlabel, sumber, lembaga (B5.19, G22); Tabel 8.2 matriks komponen × musim × fase (B5.22 dengan
  baris komponen); Tabel 8.7 rekomendasi teknis per komponen × musim, dua lapis (B5.7); Gambar 8.1 garis waktu tiga fase
  per musim (B5.12); Tabel 8.3 rekomendasi per BBWS dengan kolom kegiatan RPSDA (B5.7); Tabel 8.4
  daftar perhatian kab/kota × instrumen daerah (B5.7); Kotak 8.1 posisi Tanggul Laut Pantura (B5.5); Gambar 8.2
  kalender Rencana Aksi Musim Hujan 2026/2027 per bulan × unit (G23, tabel native); Tabel 8.5 keputusan 14 hari pertama
  (B5.7); Tabel 8.6 agenda bukti: program, garis dasar, pembanding, ukuran hasil, unit, tahun hasil, dengan baris
  embung (P10), sumur resapan (P11), Citarum Harum (P12), sodetan dan bendungan kering Ciliwung (P14), polder dan pompa
  (P15), Destana, OMC (B5.7); Halaman studi kasus 8.1 PAMSIMAS (B5.30, bukti sedang).
- **Status data:** ada (Pola/RPSDA 10 WS; Dewan SDA Nasional dan TKPSDA WS berlaku, Perpres 53/2022 dan Permen PU
  2/2024); sebagian (Pola/RPSDA Pemali-Comal; baseline 1.c per kab Jawa; data ZOM BMKG per kab; pemetaan jabatan ketua
  Dewan SDA Nasional ke nomenklatur kabinet 2024–2029).
- **Halaman:** 18.

### BAB 9 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN (9 hlm)

- **Subbab:** 9.1 Matriks Mandat Tertulis; 9.2 Usulan Penugasan dan Instrumen Penetapannya; 9.3 Forum Koordinasi dan
  Jalur Adopsi; 9.4 Arsitektur Pembiayaan; 9.5 Instrumen Hukum; 9.6 Peta Jalan; 9.7 Indikator Kinerja; 9.8 Pemantauan
  dan Pelaporan.
- **Tujuan bab:** memastikan tiap rekomendasi punya pemilik bermandat, forum, sumber dana, instrumen, dan jadwal.
- **Pertanyaan kunci:**
  1. Lembaga mana punya mandat tertulis per komponen dan fase, dan peran mana yang baru usulan?
  2. Lewat forum apa tiap rekomendasi lintas K/L dibawa?
  3. Sumber dana apa membiayai tiap fase tanpa nominal proyek?
  4. Instrumen hukum apa yang diusulkan, dan apakah sudah masuk Progsun BNPB 2026?
- **Temuan kunci yang diharapkan:**
  - Mandat: 74 dari 127 baris peran dan 23 dari 31 baris kewenangan air berjenis tertulis; sisanya pemetaan penyusun
    (`lembaga/README.md` §1).
  - Lembaga: BNPB, BPBD, Kementerian PU (BBWS), PJT I, PJT II, Kementerian ESDM (Badan Geologi), BMKG, KLH/BPLH,
    Kemenhut, Kementan, Kemenkes, Kemendagri, Kemenkeu, Kementerian PPN/Bappenas, ATR/BPN, KKP, Kementerian PKP, BRIN,
    BIG, BOP Pantura Jawa, BUMD SPAM, pemda; Kemenko PMK, Kemenko IPK, Kemenko Pangan, Kemenko Perekonomian sebagai forum
    (`lembaga/lembaga.csv`).
  - Forum: Dewan SDA Nasional (UU 17/2019 Pasal 65; Perpres 53/2022: ketua menko, wakil Menko Perekonomian, ketua
    harian Menteri PU, Kepala BNPB anggota; keanggotaan Keppres 18/2024) dan TKPSDA WS (UU 17/2019 Pasal 11 huruf h,
    64–66; Permen PU 2/2024, yang tidak menyebut BNPB atau BPBD), keduanya berlaku dan berstatus P7 "Sudah ada"; Dewan
    Pengarah BOP Pantura Jawa; rakor Kemenko PMK (Perpres 1/2019 Pasal 6).
  - Jalur adopsi (prinsip 1): rekomendasi masuk evaluasi tahunan Renas PB 2026 atau evaluasi paruh waktu 2027 lewat
    Direktorat Pengembangan Strategi Penanggulangan Bencana dan Biro Perencanaan; perubahan target paling lambat 2027,
    perubahan program dan kegiatan karena bencana paling lambat 2028.
  - Pembiayaan: DSP tiga keadaan (Perban 4/2020 Pasal 20); Dana Bersama jendela prabencana lewat permohonan tertulis
    ke BNPB dan rekomendasi Kepala BNPB ke Menteri Keuangan (Perpres 75/2021 Pasal 8; Perban 1/2026, Juklak 2/2026);
    dana kontinjensi bencana APBN untuk kesiapsiagaan (PP 22/2008 Pasal 6 ayat (1)); APBN K/L, termasuk KP 08.04.05
    Kementerian PU infrastruktur berketahanan bencana (RPJMN, 19 ke 100); APBD, BTT, dan DSP BPBD (PP 22/2008 Pasal 6
    ayat (3)); dana desa; asuransi pertanian (Renas 2.5.1.c); asuransi BMN (Renas 4.6.3.a).
  - Instrumen: kolom posisi di Progsun Kepka 327/2025 (butir 3 analisis risiko bencana pada kegiatan pembangunan
    berisiko tinggi; butir 9 penelaahan Dana Bersama; butir 11 monev RIPB).
  - Peta jalan: hari ke-0, 14 hari, 100 hari, 2026–2027, 2028–2030; jalur adopsi lewat monev Renas PB 2026 dan
    evaluasi paruh waktu 2027 sebagai butir 2026–2027.
- **Komponen:** Tabel 9.1 matriks mandat tertulis lembaga × komponen × fase dengan kode peran dan pasal (B5.7,
  `lembaga/matriks_air.csv`, `peran.csv`); Tabel 9.2 usulan penugasan dan instrumen yang diperlukan (B5.7); Gambar 9.1
  forum koordinasi dan aliran rekomendasi (B5.23, G21); Gambar 9.2 lapisan pembiayaan (B5.21); Tabel 9.3 instrumen
  hukum dengan kolom Progsun (B5.20); Tabel 9.4 peta jalan per horizon (B5.13 kolom WAKTU); Tabel 9.5 indikator
  (B5.19); Gambar 9.3 tata kelola dan pelaporan tiga lapis (B5.23).
- **Status data:** ada (lembaga, korpus, Perpres 53/2022, Permen PU 2/2024, PP 21/2008, PP 22/2008, Perpres 75/2021);
  sebagian (pemetaan jabatan ketua Dewan SDA Nasional ke kabinet 2024–2029).
- **Halaman:** 9.

### BAB 10 KESIMPULAN DAN REKOMENDASI (4 hlm)

- **Subbab:** 10.1 Kesimpulan; 10.2 Keputusan yang Diminta dari Kepala BNPB; 10.3 Rekomendasi Internal BNPB; 10.4
  Rekomendasi Lintas K/L; 10.5 Yang Sengaja Tidak Direkomendasikan; 10.6 Yang Belum Diketahui.
- **Tujuan bab:** menutup dengan keputusan dan rekomendasi yang sama persis dengan Pesan Kunci dan deck.
- **Pertanyaan kunci:**
  1. Delapan kesimpulan berangka apa yang menopang tesis?
  2. Keputusan apa yang hanya dapat diambil Kepala BNPB, dan apa akibat tiap pilihan?
  3. Rekomendasi apa per horizon dan per unit?
- **Temuan kunci yang diharapkan:** rekomendasi bernomor dari register bersama (irisan Jawa dan air), masing-masing
  dengan langkah, unit pemimpin dan pendukung, peran BNPB, pemimpin K/L, instrumen dan pelaksana daerah, waktu,
  indikator selesai, dasar (kode temuan dan regulasi), status P7. Rekomendasi teknis Tabel 8.7 masuk register dengan
  label lapis. Yang tidak direkomendasikan: indeks risiko gabungan buatan sendiri; preskripsi teknis yang menandingi
  Pola/RPSDA, dan preskripsi teknis apa pun untuk WS Pemali-Comal sampai Pola/RPSDA-nya diperoleh; perluasan program
  berjalan tanpa evaluasi dampak (embung, polder, sumur resapan) sebagai program terbukti; dana air Jawa dan komisaris;
  perluasan DSP ke puso kekeringan.
- **Komponen:** kisi kesimpulan 4 × 2 dan pita keputusan (B5.25); matriks rekomendasi (B5.13); kisi prioritas bila
  rekomendasi lebih dari 9 (B5.28).
- **Halaman:** 4.

**Jumlah:** 7 + 8 + 9 + 14 + 14 + 17 + 8 + 18 + 9 + 4 = 108 hlm; cadangan 2 hlm sampai batas 110.

### Deck kajian air (13 slide isi, PEDOMAN §B7, Buku Pegangan S1–S39)

Bagian: A Kondisi air, B Musim kemarau, C Musim hujan dan pesisir, D Kesenjangan, E Grand design. Urutan `jenis`:
navigasi, tabel, peta, kartu-skenario, peta, kartu-skenario, peta, matriks, grafik, tabel, matriks, rekomendasi,
navigasi (tidak ada dua jenis sama berurutan).

| No | Kode dan judul | Pesan | Jenis; medan judul | Visual dan sumber |
| --- | --- | --- | --- | --- |
| – | Grand Design Ketahanan Air Pulau Jawa 2026–2030 | Sampul | sampul | Sampul d9, subjudul kajian, foto Commons beratribusi (`pustaka.json`) |
| 1 | Pesan Kunci | Tesis, 2–3 keputusan yang diminta beserta akibat tiap pilihan, 4–6 temuan penopang, satu per bagian (S1) | navigasi; deskriptif | Tesis 1–2 baris; pita keputusan (KD-1, KD-2, KD-5) tanpa angka keluaran R (prinsip 10); kartu temuan berchip "Temuan A.1" (S1, S2); `angka-kunci.json`, naskah Bab 10 |
| 2 | A1. Jawa menampung {a}% penduduk nasional dengan 6,3% air permukaan nasional | Tekanan air struktural dan sebaran korban per provinsi | tabel; temuan | {a} dari BRS SP2020 (Resmi). Tabel profil 6 provinsi (penduduk KRB, korban per bahaya, rerata IRBI banjir dan kekeringan berlabel Asumsi kebijakan, sumber air minum 2023, irigasi) dan 3 kartu angka, satu di antaranya korban hidrometeorologi 2015–2025 terbanyak per provinsi (S26, S8); `air-jawa/provinsi.csv`, `kab_jawa.csv`, `neraca_jawa.csv`, `dibi/jawa_kab_hidromet.csv` |
| 3 | B1. {a} kab/kota memenuhi syarat daftar perhatian kekeringan; kejadian DIBI dan IRBI kekeringan berkorelasi lemah (ρ = 0,18) | Daftar disusun dengan syarat; peta resmi dan lapangan berbeda | peta; temuan | Peta IRBI kekeringan 2025, 5 kelas nilai (G19), kab daftar perhatian bernomor (G4), pil "IRBI tidak untuk peringkat"; `air-jawa/irbi_kab_2015_2025.csv`, `dibi_kab_tahun.csv`, `peta_kab.geojson` |
| 4 | B2. Kemarau 2026: {a} jiwa terdampak kekeringan tercatat di Jawa sampai 23 Oktober (sementara) | Kartu kekeringan terburuk yang masuk akal dengan metrik resmi | kartu-skenario; temuan | Kartu angka HTH terpanjang 131 hari di Bantul (BMKG 22 September 2026, Resmi). Kab tercatat per tahun El Niño (2015, 2019, 2023, 2026; G1) berchip Resmi dan catatan pelaporan; lantai terdampak 2018; bahaya tinggi KRB 2.877.406 ha; baris korban "tidak berlaku"; pita aksi sebelum kemarau 2027; `air-jawa/dibi_kab_tahun.csv`, `skenario-hidromet/kartu_skenario.csv`, BMKG (kunci baru) |
| 5 | C1. Tanah longsor mencatat 924 dari 1.738 korban meninggal hidrometeorologi Jawa 2015–2026 | Bahaya musim hujan dengan korban terbanyak | peta; temuan | Peta kecil berganda IRBI banjir, longsor, abrasi (G19); kab dengan IRBI longsor 2025 tertinggi ditandai di peta; batang korban per bahaya dan lantai Kartu 6.4 di panel; `air-jawa/irbi_kab_2015_2025.csv`, `dibi/jawa_kab_hidromet.csv` |
| 6 | C2. Musim hujan Jawa terberat tercatat: {a} meninggal dan hilang ({musim}) | Lantai skenario dan kartu operasional 2026/2027 | kartu-skenario; temuan | Kiri tabel lima aspek, tercatat Resmi dan model berdampingan berlabel; panel prakiraan 2026/2027 (Jawa: awal sebagian besar Desember, puncak sebagian besar Februari 2027; BMKG 22 September 2026); kanan kepekaan peringatan dini dua lintasan (G14, pil Asumsi kebijakan, longsor tidak dihitung); `skenario-hidromet/musim_hujan.csv`, `kartu_skenario.csv`, `kepekaan_peringatan_dini.csv` |
| 7 | C3. Penurunan muka tanah terverifikasi di {a} kota pesisir utara, tertinggi {b}–{c} cm per tahun di {K} | Risiko kronis pesisir memperbesar rob | peta; temuan | Garis pantai berlatar putih, titik kota bernomor, titik stasiun GNSS berlabel "satu titik GNSS" (CPKL −107,0 mm/tahun), batang rentang (G12), baris "Data yang belum ada", chip prasyarat Tanggul Laut Pantura; pil Terverifikasi; `air-jawa/subsiden_kota.csv`, `peta_subsiden.geojson` |
| 8 | D1. Lima komponen air terbagi ke {a} lembaga; {b} tumpang tindih dan celah kewenangan tercatat dalam peraturan | Kesenjangan kewenangan dan tiga jangkar Pasal 35 | matriks; temuan | Grid komponen × tingkat, chip lembaga, sel tertulis lawan pemetaan penyusun ditandai (S20); `lembaga/matriks_air.csv`, `celah.csv` |
| 9 | E1. Kerangka Program Grand Design 2026–2030 per Fase dan Musim | Program berkode dengan kategori bukti; pita Kondisi 2025 ke Target 2029 | grafik (rantai tahap, G21); deskriptif | `program-terbukti/kompendium_program.csv`, `renstra_bnpb_2025_2029.csv`, naskah Bab 8; baris Sumber dan pil CUT OFF dipasang |
| 10 | E2. Rencana Aksi Musim Hujan 2026/2027 dan Kesiapan Kemarau 2027 | Aksi bulanan November 2026–April 2027 dan pemicu kemarau 2027 | tabel; deskriptif | Tabel bulanan × unit (G23), hari ke-0 dan hari ke-100 ditandai; naskah Bab 8.8–8.9 |
| 11 | E3. Tugas per fase untuk {a} lembaga pada ancaman air; {b} peran tertulis dalam peraturan | Siapa mengerjakan apa per fase; mandat dipisah dari usulan | matriks; temuan | Matriks lembaga × fase, kode K/P/R/I, ≤ 12 baris (S22, S23); `lembaga/peran.csv`, `matriks_bencana.csv`, `lembaga.csv` |
| 12 | E4. Rekomendasi dan Peta Jalan 2026–2030 | {a} rekomendasi berlembaga, {b} dalam 100 hari, {c} pada 2026–2027, {d} pada 2028–2030 | rekomendasi; deskriptif | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB, pil status, pita horizon (S28, S29); register bersama |
| 13 | Kesimpulan | 8 kesimpulan; pita ARAHAN berisi keputusan yang sama dengan slide 1 | navigasi; deskriptif | Kisi 4 × 2 (S32); angka sama persis dengan slide 2–12 |
| – | Terima kasih; Lampiran | Penutup dan pembatas | layout GELAP | – |

Lampiran deck: L1 Indikator 119 kab/kota dengan kolom tingkat data (lanjutan per 24 baris); L2 Profil 24 wilayah
sungai (kewenangan, tanpa neraca); L3 Bendungan dalam paket data, baris resmi dan sekunder terpisah; L4 Irigasi per
provinsi dan kewenangan, rekonsiliasi; L5 Kisi kekuatan bukti × status program air; L6 Arsitektur pembiayaan; L7 Tata
kelola, pelaporan, matriks mandat lengkap; L8 Instrumen hukum (kolom Progsun); L9 Metode, label, rekonsiliasi, data yang
belum ada (Tabel 3.1); L10 Daftar singkatan.

### Lampiran DOCX Kajian 1

A Tabel indikator 119 kab/kota dengan kolom tingkat data per komponen (juga `.xlsx`); B Profil 6 provinsi; C Profil
24 wilayah sungai: kategori, pengelola, BBWS, bendungan dalam paket (tanpa neraca); D Bendungan dalam paket data (bukan
inventaris lengkap), resmi dan sekunder terpisah; E Matriks dan kronologi regulasi; F Metode, asumsi, matriks
ketersediaan kuantifikasi, skala dampak, rekonsiliasi; G Daftar perhatian kab/kota per bahaya, syarat yang dipenuhi,
uji kepekaan; H Register rekomendasi bersama dan tabel silang dengan Kajian 2; I Keluaran model berlabel (mesin neraca
dan padi kekeringan 2015, replay banjir Maret 2025, beserta galatnya); J Penyelarasan dokumen BNPB; K Glosarium;
L Atribusi foto. Tiap lampiran data memuat pernyataan produsen (prinsip 19).

### Peta Kajian 1 (web dan PNG)

IRBI kekeringan 2025 per kab/kota; jumlah tahun tercatat kekeringan DIBI; daftar perhatian kekeringan; IRBI 2025
banjir, longsor, abrasi (peta kecil berganda); jumlah tahun tercatat longsor; daftar perhatian banjir dan longsor; luas
irigasi permukaan per kab/kota; titik bendungan dalam paket; kota dengan penurunan muka tanah terverifikasi dan titik
pantau rob BMKG dan stasiun GNSS Susilo dkk. (2023) berlabel "satu titik GNSS"; awal musim hujan 2026/2027 per ZOM ditumpangkan ke kab/kota (bila data
BMKG diperoleh). Dihapus dari v2: neraca per wilayah sungai, prioritas intervensi (diganti daftar perhatian).

---

## 5. Kajian 2

**Grand Design Mitigasi Bencana Indonesia 2026–2030**
*Strategi Prabencana, Tanggap Darurat, dan Pascabencana*

**Lingkup.** 38 provinsi, 514 kab/kota. Alam: gempa bumi, tsunami, gunung api, banjir dan banjir bandang, tanah
longsor, cuaca ekstrem, gelombang ekstrem dan abrasi, kekeringan, karhutla. Nonalam: epidemi dan pandemi, kebakaran
industri dan kegagalan teknologi, kebakaran TPA. Sosial: konflik dan kerusuhan sosial antarkelompok (definisi prinsip
3). Isi ≤ 150 hlm: alokasi 141 hlm, cadangan 9 hlm.

**Pesan inti (hipotesis kerja; dikunci setelah Bab 4–7):**
"Pada 2025 DIBI mencatat 1.735 korban meninggal dan 221 hilang akibat bencana alam, tertinggi sejak 2018, dengan
1.202 meninggal dan 140 hilang dalam satu rangkaian banjir dan longsor di Aceh, Sumatera Utara, dan Sumatera Barat pada
akhir November 2025; Grand Design 2026–2030 menetapkan indikator korban Renas PB 1.a dan 1.b, yang langsung terukur dari
DIBI, sebagai sasaran utama sampai baseline IRBI 2025 skala baru diterbitkan."
Sumber: `dibi/rekap_nasional_tahunan.csv` (2025, cakupan bencana, klasifikasi alam 101–109; dihitung ulang 24 Oktober
2026); `skenario-hidromet/kartu_skenario.csv` (`kasus_sumatra_nov2025`); Renas PB Tabel 2.8. Angka semua klasifikasi
(2.030 meninggal, 246 hilang) memuat kebakaran permukiman yang di luar lingkup, kategori lainnya, dan nonalam yang baru
tercatat sejak 2024, sehingga hanya tampil sebagai versi semua klasifikasi dengan catatan patahan 2024 (V06). Label
Resmi.

**Keputusan yang diminta di Pesan Kunci:** KD-1, KD-2, KD-3 (§6); KD-4 sebagai rekomendasi 100 hari.

### BAB 1 PENDAHULUAN (7 hlm)

- **Subbab:** 1.1 Latar Belakang; 1.2 Posisi terhadap RIPB dan Renas PB; 1.3 Tujuan; 1.4 Lingkup, Taksonomi, dan
  Definisi Operasional; 1.5 Status Dokumen dan Jalur Adopsi; 1.6 Sistematika.
- **Tujuan bab:** menjelaskan mengapa Grand Design dibutuhkan sekarang dan apa yang dicakup.
- **Pertanyaan kunci:**
  1. Mengapa korban bencana 2025 menuntut Grand Design sekarang, meskipun nilai IRB 2024 turun?
  2. Bagaimana kajian ini menjadi masukan peninjauan Renas PB 2025–2029?
  3. Jenis bencana apa yang dicakup, dan apa arti kerusuhan sosial dan mitigasi dalam kajian ini?
- **Temuan kunci yang diharapkan:**
  - 2025, bencana alam: 1.735 meninggal dan 221 hilang, tertinggi sejak 2018 (5.477 meninggal); sekitar 0,7 meninggal
    dan hilang per 100.000 penduduk (dihitung dari DIBI dan penduduk BPS 2026, 287.198.383) lawan 0,22 pada indikator
    Renas 1.a. Versi semua klasifikasi 2.030 meninggal dan 246 hilang memuat nonalam 242 (kebakaran permukiman 145,
    gagal teknologi 69, epidemi 28), lainnya 45, dan sosial 8, dan tidak dibandingkan dengan tahun sebelum 2024
    (`dibi/rekap_nasional_tahunan.csv`; `dibi/README.md`; `air-jawa/README.md` §2).
  - Sumatra November 2025: 1.202 meninggal, 140 hilang, 970.876 mengungsi, 63.019 rumah rusak berat (DIBI 15 November–31
    Desember 2025).
  - IRB 2024 128,52, turun 10,76% dari 2019, target Renstra tercapai; dibahas di Bab 5 sebagai capaian dengan catatan
    korban tidak ikut turun (NAR 2023: kejadian turun tiga tahun, korban naik). WorldRiskReport 2025 (peringkat 3)
    hanya pembanding.
  - Perban 1/2025 Pasal 7 ayat (1)–(2) dan hlm. 125 (prinsip 1).
  - Definisi operasional kerusuhan sosial dan mitigasi (prinsip 3); kebakaran gedung dan permukiman di luar lingkup
    (DIBI 2025: 881 kejadian, 149 meninggal, konteks).
- **Komponen:** Gambar 1.1 meninggal dan hilang akibat bencana alam 2015–2025 dengan anotasi 2018 dan 2025 dan
  penanda patahan 2024 (G1, `dibi/rekap_nasional_tahunan.csv`); Kotak 1.1 definisi operasional (B5.5); Tabel 1.1 taksonomi dan lingkup (B5.7).
- **Status data:** ada.
- **Halaman:** 7.

### BAB 2 TINJAUAN PUSTAKA DAN KERANGKA KONSEPTUAL (8 hlm)

- **Subbab:** 2.1 Risiko, Ketangguhan, dan Kerangka Sendai; 2.2 Kajian BNPB Terdahulu; 2.3 Regulasi Penanggulangan
  Bencana; 2.4 Kelembagaan; 2.5 Praktik Pembanding; 2.6 Metode Kerugian.
- **Tujuan bab:** menempatkan kajian di atas dokumen BNPB yang ada, dengan regulasi berlaku dan pembanding terbukti.
- **Pertanyaan kunci:**
  1. Apa yang sudah ditetapkan KRB 2022–2026, IRBI, Buku RBI 2023, NAR 2023, RIPB, Renas, dan Renstra, dan apa yang
     ditambahkan kajian ini?
  2. Regulasi apa yang berlaku untuk tiap jenis dan fase per Oktober 2026?
  3. Praktik negara lain mana yang terbukti dan dapat dialihkan?
  4. Metode kerugian apa yang dipakai, dan apa yang tidak?
- **Temuan kunci yang diharapkan:**
  - KRB 2022–2026: paparan dan potensi kerugian per bahaya; kapasitas kab rendah 315, sedang 190, tinggi 3 dari 508;
    potensi kerugian multibahaya Rp4.082,56 T adalah penjumlahan lintas bahaya dan tidak dipakai sebagai satu angka
    (riset A §1.4).
  - Regulasi: UU 24/2007; PP 21/2008, PP 22/2008 (teks primer dibuka); Perpres 87/2020; Perpres 75/2021; Perpres 1/2019
    jo. 29/2021; Perpres 17/2018 jo. 46/2026; UU 17/2023 (KLB dan wabah); UU 7/2012 dan PP 2/2015; UU 18/2008; Perban
    1/2023, 2/2023, 2/2024, 4/2020, 7/2025, 9/2025, 1/2026, 3/2026; SPM (PP 2/2018, Permendagri 101/2018, Juklak
    4–7/2026). Riwayat dicabut: UU 6/2018, Keppres 7/2020, Keppres 12/2020, Perpres 82/2020.
  - Pembanding (baris kompendium): Bangladesh CPP (kuat; yang terbukti paket intervensinya); Odisha OSDMA (sedang);
    Kamaishi (sedang); kode bangunan Chile NCh433 (sedang; butir penegakan kode); CCRIF dan ARC (sedang); hibah mitigasi
    FEMA dengan syarat analisis manfaat-biaya (rujukan tata kelola); Filipina (pelajaran, bukan teladan). Sebagai
    rujukan metode, bukan program: NRR Inggris (RWCS, pita kemungkinan, skala dampak) dan perkiraan kerusakan Nankai
    (tabel baku, kepekaan evakuasi). Selandia Baru hanya untuk struktur tiga prioritas. JEE dan IHR WHO sebagai rujukan
    tata kelola epidemi (skor Indonesia 2023 di `nonalam-sosial/indikator.csv`).
  - Metode kerugian: Jitupasna (Perka BNPB 15/2011), PDNA, DaLA; YLL dan pengungsi-hari; DALY tidak dihitung.
- **Komponen:** Tabel 2.1 kajian BNPB terdahulu × temuan pokok × yang ditambahkan (B5.7); Tabel 2.2 kronologi regulasi
  (B5.31); Tabel 2.3 praktik pembanding dan padanan di Indonesia (B5.7); Tabel 2.4 target Sendai dan indikator Renas
  (B5.7).
- **Status data:** ada (teks PP 21/2008, PP 22/2008, Perpres 87/2020, 75/2021, 12/2025 dibuka dari JDIH BPK, §8).
- **Halaman:** 8.

### BAB 3 METODOLOGI (9 hlm)

- **Subbab:** 3.1 Data, Produsen, dan Label Keyakinan; 3.2 IRBI: Patahan Skala 2025 dan Aturan Pakai; 3.3 DIBI:
  Cakupan, Patahan Seri, dan Batas Tafsir; 3.4 Skenario Terburuk yang Masuk Akal; 3.5 Kemungkinan dan Skala Dampak; 3.6
  Tabel Kerusakan dan Matriks Ketersediaan Kuantifikasi; 3.7 Kerugian Materiil dan Imateriil; 3.8 Aturan Daftar
  Perhatian dan Provinsi Utama; 3.9 Rekonsiliasi Angka; 3.10 Keterbatasan.
- **Tujuan bab:** menetapkan aturan yang membuat kartu skenario, daftar perhatian, dan sasaran dapat diperiksa.
- **Pertanyaan kunci:**
  1. Bagaimana IRBI dan DIBI dibaca tanpa membandingkan skala yang patah?
  2. Bagaimana skenario terburuk, lantai, kemungkinan, dan dampak didefinisikan untuk semua jenis?
  3. Metrik apa yang dapat dikuantifikasi per jenis, dan dengan label apa?
  4. Angka mana yang berbeda versi?
- **Aturan daftar perhatian (3.8):** per kelompok bahaya. Hidrometeorologi: syarat (a) IRBI 2025 bahaya itu di kelas
  nilai teratas nasional, (b) kejadian tercatat ≥ 3 dari 11 tahun 2015–2025 (turunan baru per kab per tahun dari
  `riset/mentah/dibi_hidromet.json`), (c) meninggal dan hilang atau mengungsi di kuartil atas; masuk bila ≥ 2 syarat.
  Geologi: (a) IRBI 2025 di kelas nilai teratas, (b) paparan KRB atau jiwa pesisir rendah tiba ≤ 30 menit (Estimasi
  model) di kuartil atas, (c) kejadian berkorban sejak 2008 (DIBI gempa per kab, ditarik); masuk bila ≥ 2 syarat.
  Provinsi utama = provinsi dengan jumlah kab daftar perhatian terbanyak atau meninggal dan hilang DIBI 2015–2025
  tertinggi; kedua kriteria ditulis. Uji kepekaan ambang; label Asumsi kebijakan.
- **Temuan kunci yang diharapkan:**
  - IRBI 2025 tidak sebanding dengan 2015–2024: nilai per bahaya bilangan bulat; total sama dengan jumlah kolom bahaya
    di 0% kab; rerata naik 19,43; Spearman peringkat 0,589; rerata nasional 2025 (147,95) belum pernah diterbitkan
    (`irbi/README.md` §4).
  - DIBI: `is_bencana` baru dipakai sejak 2024; nonalam dan sosial praktis tercatat sejak 2024; banjir bandang, banjir
    dan longsor, rob, puting beliung baru muncul 2018 dan kosong 2024; tanah longsor 2024 hanya 219 kejadian
    (`dibi/README.md`, `skenario-hidromet/README.md`).
  - Lantai nasional agregat musim: musim hujan 2025/26 1.692 meninggal dan hilang tercatat, di atas batas atas model
    musim analog 2020/21 (1.204). Lantai per jenis dari `lantai_jenis.csv`; periode acuan per kelompok (prinsip 9).
  - Kemungkinan: fase ENSO dari ONI (La Niña 7 dari 18 musim; El Niño kuat 3 dari 18); megathrust dari periode ulang
    PuSGeN 2024 (Jawa: peluang lima tahun 0,83% untuk Mw 9,1 dan 1,24% untuk Mw 8,9 per segmen, turunan penyusun
    asumsi Poisson; Sumba tanpa periode ulang); gempa lain dari laju Poisson M6+ platform (layak dengan catatan, riset D
    §6); jenis lain tidak dinilai.
  - Rekonsiliasi: kejadian 2024 (2.107 / 3.472 / 3.548 / 3.636 / 5.593); jiwa terpapar (271.130.365 / 258.071.714);
    kapasitas (62% baseline RPJMN 2023 / 67% target 2025 yang dipakai Renstra sebagai titik awal / 38% KRB); segmen
    megathrust (13 / 14 / 15 / 16; naskah memakai 14 dari PuSGeN 2024) dan sesar aktif (295 di Renstra lawan 273 PuSGeN
    2017 dan 401 PuSGeN 2024; selisih ke lampiran Penyelarasan dokumen BNPB); cakupan peringatan dini (6% / 6,00
    baseline RPJMN / 6,10% / 11,06% / 52%); korban kejadian besar (Sulteng, Merapi, Lombok, Jabodetabek 2020,
    Plumpang, Cianjur: DIBI 602 meninggal lawan R3P 334 meninggal per data BPBD 7 Desember 2022; rumah rusak DIBI
    56.278 lawan 114.315 menurut SK Bupati tahap II di R3P) (`dibi/rekonsiliasi.csv`, riset A §8, riset E).
  - Keterbatasan model (3.10): skenario ilustratif megathrust Jawa M8,5 tidak menghasilkan MMI ≥ VII di pusat
    kecamatan mana pun; ini artefak magnitudo ilustratif dan GMPE yang belum diuji (`skenario-geologi/README.md` §6
    butir 1), tidak dibawa ke kartu atau temuan. Proksi pesisir rendah melewatkan 18 kab pada skenario Jawa M8,5,
    termasuk pantai selatan Jawa Barat, Lebak, Pandeglang, dan Banyuwangi (§6 butir 4).
- **Komponen:** Tabel 3.1 sumber, produsen, dan label (B5.7); Tabel 3.2 bukti patahan skala IRBI 2025 (B5.7,
  `irbi/irbi_bukti_skala_tahunan.csv`); Tabel 3.3 skala dampak 1–5 per aspek (B5.7); Tabel 3.4 dasar kemungkinan per
  jenis (B5.7); Tabel 3.5 matriks ketersediaan kuantifikasi jenis × metrik (G16); Tabel 3.6 tiga besaran kerugian
  (B5.7); Tabel 3.7 aturan daftar perhatian dan uji kepekaan (B5.7); Tabel 3.8 rekonsiliasi angka (B5.7); Gambar 3.1
  rantai metode (B5.23).
- **Status data:** ada; turunan baru: DIBI hidrometeorologi per kab per tahun, DIBI gempa per kab.
- **Halaman:** 9.

### BAB 4 HISTORI BENCANA INDONESIA (11 hlm)

- **Subbab:** 4.1 Kejadian dan Dampak 2015–2026; 4.2 Kejadian Besar 1996–2025; 4.3 Pola Korban: Kejadian dan Korban
  Bergerak Berbeda; 4.4 Bencana Nonalam dan Sosial dalam Catatan; 4.5 Pelajaran dari Kejadian Besar.
- **Tujuan bab:** memberi histori yang jujur terhadap patahan seri dan menyediakan analog skenario per jenis.
- **Pertanyaan kunci:**
  1. Bagaimana kejadian dan korban berubah 2015–2025 bila patahan seri diperhitungkan?
  2. Kejadian besar apa yang menjadi analog skenario terburuk per jenis?
  3. Pelajaran apa yang konsisten muncul dari kejadian besar?
- **Temuan kunci yang diharapkan:**
  - Kejadian alam 101–109 2015–2025 dan korban alam: puncak 2018 (5.477 meninggal, 763 hilang) dan 2025 (1.735
    meninggal, 221 hilang); patahan 2024 ditandai (`dibi/README.md` Angka kunci, `rekap_nasional_tahunan.csv`).
  - Kejadian besar berangka: Pangandaran 2006 (665 meninggal, USGS impact-text, Terverifikasi), Merapi 2010 (DIBI 386;
    Surono dkk. 2012: hampir 400 meninggal dan sekitar sepertiga juta mengungsi), Mentawai 2010 (447 + 56), Lombok 2018
    (564; total kebutuhan R3P Rp11,44 T menurut Kemenko PMK 20 Mei 2024), Sulteng 2018 (4.140 + 705), Selat Sunda 2018
    (437 + 16), Jabodetabek 2020, Seroja 2021 (184 + 47), Semeru 2021 (64 + 9), Cianjur 2022 (602 DIBI; R3P: kerusakan
    dan kerugian Rp4,55 T, kebutuhan R3P Rp5,05 T untuk 2023–2025), Sumatra 2025 (1.202 + 140), karhutla 2015 dan 2019,
    COVID-19 (161.870), Plumpang 2023, Sarimukti 2023, Sambas 1996–1997 dan 1999, Maluku 1999–2002, Poso, Sampit 2001,
    Yogyakarta 2006 (USGS, Terverifikasi). Aceh 2004 (127.720 meninggal, 93.285 hilang) dan Nias 2005 (966 meninggal)
    dari buku resmi BRR NAD–Nias (2009), berlabel Resmi sebagai bawaan yang dicatat untuk pemilik dan dapat dibalik:
    BRR lembaga pemerintah pelaksana RR, sedangkan Buku Utama Rencana Induk tetap tidak ditemukan (§8, E4)
    (`dibi/kejadian_besar.csv`, `nonalam-sosial/peristiwa.csv`).
  - DIBI tidak mencatat COVID-19, Plumpang, Balongan, Morowali; kerusuhan Agustus 2025 tidak tercatat sebagai konflik
    sosial; ketiadaan ini menjadi rekomendasi data Pusdatinkom (Juklak 7/2023).
  - Kebakaran gedung dan permukiman: 83 kejadian (2024) dan 881 (2025), konteks lingkup.
- **Komponen:** Gambar 4.1 kejadian per tahun bertumpuk kelompok geologi, hidrometeorologi, nonalam dan sosial dengan
  penanda patahan 2024 (G9, `dibi/rekap_nasional_tahunan.csv`); Gambar 4.2 meninggal dan hilang per tahun (G1); Tabel
  4.1 kejadian besar dan pelajarannya (B5.7); Tabel 4.2 rekonsiliasi korban kejadian besar (B5.7,
  `dibi/rekonsiliasi.csv`); Halaman studi kasus 4.1 peringatan dini dan evakuasi Merapi 2010 (B5.30; Surono dkk. 2012,
  Terverifikasi: prakiraan besaran tiap fase oleh PVMBG yang menurut penulis menyelamatkan 10.000–20.000 jiwa, angka
  perkiraan penulis, bukan angka resmi; badan artikel belum dibaca, jadi rincian teknik pemantauan dan radius tidak
  dikutip), dengan InaTEWS dan tsunami Palu 2018 sebagai kotak pembanding.
- **Status data:** ada; sebagian (Aceh 2004 dan Nias 2005 dari buku BRR, bawaan; R3P Sulteng tidak ditemukan; COVID-19
  di luar DIBI).
- **Halaman:** 11.

### BAB 5 PROFIL RISIKO NASIONAL (15 hlm)

- **Subbab:** 5.1 Capaian IRB 2015–2024; 5.2 Potret IRBI 2025 per Bahaya; 5.3 Sebaran per Pulau; 5.4 Sebaran per
  Provinsi dan Provinsi Utama; 5.5 Daftar Perhatian Kab/Kota; 5.6 Kapasitas Daerah: Dua Ukuran; 5.7 Keterpaparan
  Penduduk dan Aset; 5.8 Penilaian Risiko Nasional Terbanding.
- **Tujuan bab:** menunjukkan di mana risiko terkonsentrasi dari pulau sampai kab/kota, dan jenis bencana mana yang
  berada di kelas dampak tertinggi.
- **Pertanyaan kunci:**
  1. Di pulau, provinsi, dan kab/kota mana risiko terkonsentrasi menurut IRBI dan DIBI?
  2. Mengapa capaian IRB tidak diikuti penurunan korban?
  3. Berapa daerah berkapasitas minimal sedang menurut dua ukuran resmi?
  4. Jenis bencana apa yang berada di kelas dampak tertinggi, dan untuk jenis mana kemungkinan dapat dinilai?
- **Temuan kunci yang diharapkan:**
  - IRB nasional 2019–2024: 144,02 ke 128,52, turun 10,76% (Resmi); 2015–2018 Asumsi kebijakan; turunan
    (`irbi/irbi_tren_2015_2024.csv`).
  - IRBI 2025: 169 Tinggi, 345 Sedang (Resmi, kolom status API); agregat pulau dan provinsi 2025 berlabel Asumsi
    kebijakan; kelas provinsi resmi 2023: 13 Tinggi, tertinggi Sulawesi Barat, Maluku, Kepulauan Bangka Belitung
    (`irbi/irbi_kab_2025.csv`, `irbi_agregat_provinsi.csv`).
  - Kapasitas: baseline resmi 62% (2023) dengan target 67% (2025) dan 90% (2029) menurut RPJMN KP 08.04.01 (Lampiran
    III hlm. 913); Renstra memakai 67% sebagai titik awal; KRB 2022–2026 memberi 38% (193 dari 508). Ketiganya
    berdampingan sampai KD-3 diputus.
  - Keterpaparan KRB per bahaya: gempa praktis seluruh penduduk; banjir 113,8 juta; longsor 25,3 juta; likuefaksi 86,7
    juta; tsunami 5,3 juta; gunung api 5,9 juta (riset A §1.4).
  - Spearman IRBI 2025 lawan kejadian DIBI untuk 514 kab dihitung dan dilaporkan.
  - Matriks terbanding per jenis (15 jenis `tema.json`, satu titik per kartu per jenis Bab 6–9): jenis berdasar
    peluang diposisikan (megathrust dari periode ulang PuSGeN 2024, fase ENSO dari ONI); pandemi, kebakaran industri,
    kebakaran TPA, konflik, dan jenis lain tanpa dasar peluang di panel "dampak dinilai, kemungkinan tidak dinilai"
    dengan kelas dampak dari lantai dan analog kartu per jenis (COVID-19 kelas tertinggi pada aspek kependudukan).
- **Komponen:** Gambar 5.1 tren IRB nasional dan per pulau 2015–2024 (G2); Gambar 5.2 peta Indonesia status IRBI 2025
  per kab/kota (G19, ramp T8); Gambar 5.3 peta kecil berganda IRBI 2025 per bahaya (G19); Tabel 5.1 peta panas bahaya ×
  pulau, rerata IRBI 2025 berlabel Asumsi kebijakan (G16, `irbi/irbi_agregat_pulau.csv`); Gambar 5.4 kelas provinsi 2023
  resmi (G19); Tabel 5.2 provinsi utama menurut dua kriteria (B5.7); Tabel 5.3 ringkasan daftar perhatian per bahaya
  (B5.7; rinci Lampiran A); Gambar 5.5 kapasitas kab KRB (G19) dan Tabel 5.4 dua ukuran kapasitas; Gambar 5.6 matriks
  kemungkinan × dampak per jenis (G17, B5.27) dengan panel jenis tanpa dasar peluang.
- **Status data:** ada; sebagian (indeks provinsi 2025 tanpa metode resmi; IKD per kab tidak ada di paket).
- **Halaman:** 15.

### BAB 6 BENCANA GEOLOGI (15 hlm)

- **Subbab:** 6.1 Gempa Bumi Megathrust; 6.2 Gempa Bumi Sesar Darat Dekat Permukiman; 6.3 Tsunami; 6.4 Gunung Api; 6.5
  Gempa, Tsunami, dan Likuefaksi Majemuk; 6.6 Kesenjangan Spesifik dan Implikasi. Tiap jenis: bahaya dan histori,
  status resmi lembaga dan indeks, sebaran, kartu.
- **Tujuan bab:** menyatakan apa yang dapat dan tidak dapat dikuantifikasi untuk skenario terburuk geologi, dengan
  paparan resmi dan kejadian analog sebagai angka utama.
- **Pertanyaan kunci:**
  1. Berapa penduduk terpapar resmi per bahaya geologi, dan di mana?
  2. Apa yang dapat dan tidak dapat dikuantifikasi untuk megathrust dan tsunami?
  3. Berapa korban dan kerusakan pada kejadian analog sesar darat, erupsi, dan gempa majemuk?
  4. Tuas apa yang paling menekan korban menurut data yang ada?
- **Temuan kunci yang diharapkan:**
  - KRB: gempa 272.405.410 terpapar (praktis seluruh penduduk), potensi kerugian Rp1.111,32 T; tsunami 5.341.282, Rp42,98
    T; gunung api 5.864.711, Rp12,05 T; likuefaksi 86.689.779, Rp351,88 T (riset A §1.4).
  - Tidak ada skenario korban resmi PuSGeN atau BMKG yang terbuka; Peta Sumber dan Bahaya Gempa 2024 memuat bahaya,
    bukan korban; renkon megathrust nasional tidak ditemukan.
  - Sumber gempa resmi (PuSGeN 2024, Resmi): 14 segmen megathrust dan 401 sesar aktif, 82 di antaranya di Jawa (hlm.
    xxxi–xxxii). Mmaks megathrust Jawa: segmen gabungan 9,1 (1.120 km, periode ulang 600 tahun), Jawa barat 8,9 dan Jawa
    timur 8,9 (400 tahun); Mentawai-Siberut, Mentawai-Pagai, dan Enggano masing-masing 8,9 (Tabel 6.2 hlm. 342–343).
  - Megathrust selatan Jawa (Kartu 6.1, Mw 9,1 resmi): 69 juta jiwa pada MMI ≥ VII (pita 30–110 juta, Estimasi model;
    GMPE belum diuji) dan korban guncangan analog 11.000–140.000 (Estimasi model; rasio dari gempa kerak dan slab, belum
    diuji untuk megathrust; pita lebih dari satu orde, sehingga hanya di badan kartu dan lampiran, tidak di kartu angka,
    judul, atau RE) (`skenario-geologi/README.md` §5–6). Lantai korban tercatat: Pangandaran 2006 (665 meninggal, USGS
    impact-text, Terverifikasi). Peluang lima tahun 0,83% (turunan penyusun), tidak disisihkan.
  - Tsunami: tinggi tsunami skenario terburuk sekitar 20 m di pantai selatan Jawa Barat dan sekitar 12 m di Jawa Timur,
    rata-rata maksimum 4,5 m sepanjang pantai selatan Jawa (Widiyantoro dkk. 2020, Terverifikasi); paparan resmi KRB
    5.341.282 jiwa; jiwa pesisir rendah tiba ≤ 30 menit 2,9 juta (Jawa M8,5) dan 3,4 juta (M9,1) berlabel Estimasi
    model dengan daftar kab yang terlewat proksi; korban tidak dikuantifikasi sampai `Inun_*` × penduduk; faktor
    evakuasi ×1 / ×0,600 / ×0,437 (Cabinet Office 2025) diterapkan pada paparan (`tsunami_kab.csv`, `kepekaan.csv`).
  - Sesar darat (kartu analog dengan Mmaks resmi): Mmaks Lembang 6,6, Cimandiri 6,3–6,8, Baribis 6,4, Semarang Front
    6,9, Opak 6,9 (PuSGeN 2024 Tabel 6.9, Resmi); Yogyakarta 2006 5.749 meninggal (USGS, Terverifikasi); Cianjur 2022
    602 meninggal, 114.683 mengungsi, 56.278 rumah rusak (DIBI, Resmi), dengan R3P Cianjur sebagai pembanding: kerusakan
    Rp3,98 T, kerugian Rp0,57 T, rumah rusak 114.315 unit menurut SK Bupati tahap II hasil reviu BNPB (Resmi, berkas
    berstatus contoh dokumen di portal BNPB tanpa nomor penetapan).
  - Gunung api: Merapi 2010 DIBI 386 meninggal, 447.982 mengungsi; model sapuan sekitar 90.000 jiwa tanpa evakuasi
    (Estimasi model) sebagai tuas evakuasi; Surono dkk. (2012) memperkirakan 10.000–20.000 jiwa terselamatkan oleh
    prakiraan PVMBG (Terverifikasi); KRB 30 gunung: KRB III 86.615 jiwa (`merapi2010_kab.csv`, `gunungapi_krb_kab.csv`).
  - Majemuk: Sulteng 2018 DIBI 4.140 meninggal, 705 hilang, 212.719 mengungsi, 110.214 rumah rusak; kerusakan dan
    kerugian sementara Rp13,82 T (BNPB 20 Oktober 2018, Resmi).
  - Megathrust Sumba: Mmaks resmi 8,5 tetapi periode ulang "No Data" di PuSGeN 2024; kartu tidak dibuat sampai ada
    dasar kemungkinan, dan dicatat di matriks ketersediaan kuantifikasi.
  - Lantai Kartu 6.2: Mentawai 2010 (447 meninggal, 56 hilang; DIBI, Resmi). Kartu 6.6 tsunami: lantai per wilayah
    (selatan Jawa Pangandaran 2006; Mentawai 2010; Selat Sunda 2018, 437 meninggal dan 16 hilang; nasional Aceh 2004
    dari buku BRR, bawaan §8).
- **Komponen:** Gambar 6.1 peta jiwa pesisir rendah tiba ≤ 30 menit dan panjang pantai, berlabel paparan (G20,
  `skenario-geologi/tsunami_kab.csv`, `jejak.geojson`); Gambar 6.2 peta kab terpapar MMI (G19,
  `gempa_kab.csv`, pada Mmaks resmi 9,1); Kartu 6.1 megathrust selatan Jawa (B5.11 varian a, Mmaks resmi 9,1; lantai Pangandaran 2006;
  kepekaan Mw 8,9 per segmen dan kepatuhan bangunan); Kartu 6.2 megathrust Mentawai–Enggano (Mmaks resmi 8,9; lantai
  Mentawai 2010); Kartu 6.3 sesar darat dekat permukiman (analog dan Mmaks resmi; kepekaan Cianjur versi DIBI lawan
  R3P); Kartu 6.4 erupsi gunung api (analog Merapi 2010 dan KRB; kepekaan tuas evakuasi); Kartu 6.5 gempa, tsunami, dan
  likuefaksi (analog Sulteng 2018 dan KRB likuefaksi; kepekaan angka sementara lawan angka akhir bila R3P ditemukan);
  Kartu 6.6 tsunami (per jenis: paparan KRB, tinggi Widiyantoro dkk., lantai per wilayah, korban tidak dikuantifikasi,
  kepekaan faktor evakuasi atas paparan); Gambar 6.3 tuas evakuasi atas paparan dan tuas kepatuhan bangunan (G14,
  `kepekaan.csv`); Tabel 6.1 rasio analog guncangan dan tsunami (B5.7, `analog.csv`);
  Tabel 6.2 pembanding kerugian kejadian (B5.7, `pembanding_pdna.csv`, baris sekunder ditandai).
- **Status data:** ada (Mmaks megathrust dan sesar darat resmi PuSGeN 2024; tinggi tsunami Widiyantoro dkk.; R3P
  Cianjur); sebagian (`Inun_*` belum dipakai; bangunan tidak ada, rumah = jiwa / 3,9; sekolah dan faskes hanya 9
  provinsi, tidak satu pun di Jawa); celah (R3P Lombok dan Sulteng tidak ditemukan; Lombok hanya total kebutuhan R3P
  dari Kemenko PMK).
- **Halaman:** 15.

### BAB 7 BENCANA HIDROMETEOROLOGI (19 hlm)

- **Subbab:** 7.1 Banjir dan Banjir Bandang; 7.2 Tanah Longsor; 7.3 Cuaca Ekstrem; 7.4 Gelombang Ekstrem, Abrasi, dan
  Rob; 7.5 Kekeringan; 7.6 Kebakaran Hutan dan Lahan; 7.7 Kartu Agregat Musim Hujan; 7.8 Kartu Agregat Musim
  Kemarau; 7.9 Kepekaan Peringatan Dini; 7.10 Kesenjangan Spesifik dan Implikasi. Tiap subbab jenis 7.1–7.6 ditutup
  kartu per jenis.
- **Tujuan bab:** menetapkan lantai skenario hidrometeorologi dari kejadian nyata dan menyiapkan 2026/2027.
- **Pertanyaan kunci:**
  1. Seberapa berat musim hujan tercatat terburuk dan kejadian tunggal terburuk?
  2. Apa yang diharapkan pada musim 2026/2027 dan kemarau 2027?
  3. Berapa korban dapat ditekan dengan cakupan peringatan dini menurut target Renstra dan target Renas?
  4. Apa beban karhutla yang dapat dinyatakan dengan data yang ada?
- **Temuan kunci yang diharapkan:**
  - Kartu 7.1: musim 2025/26 1.506 meninggal, 186 hilang, 1.043.740 mengungsi, rumah RB 65.929, RS 57.141, RR 131.235
    (Resmi); kasus Sumatra November 2025 1.202 + 140, 970.876 mengungsi, RB 63.019; model rasio sebagai pembanding
    (2025/26: 396–954; 2020/21: 525–1.204) dengan kalimat bahwa metode ini tidak menangkap kejadian katastrofik.
  - Kartu 7.2: musim setelah El Niño kuat, nasional 2009/10 (322 + 51), 2015/16 (144 + 55), 2023/24 (212 + 34); kenaikan
    jumlah kejadian pada musim berikutnya (2016/17, 2024/25) berlabel "pola tercatat" dan dipengaruhi patahan kategori.
  - Kekeringan (Kartu 7.3): terdampak terbesar 2018 (7.798.763, DIBI) sebagai lantai; KRB bahaya tinggi 30.002.273 ha;
    korban jiwa tidak berlaku; kepekaan kemarau tahun kedua 2027.
  - Karhutla (Kartu 7.5): 2015: 2.611.411 ha (SiPongi), US$16,1 miliar atau 1,9% PDB (Bank Dunia), ISPA 450.431 (BNPB),
    meninggal DIBI di provinsi asap 12; 2019: 1.649.258 ha, US$5,2 miliar, ISPA 919.516
    (`skenario-hidromet/karhutla_provinsi.csv`). Beban kesehatan asap 2015: 91.600 kematian berlebih di Indonesia (95%:
    24.000–159.200; Koplitz dkk. 2016, Terverifikasi), kematian berlebih jangka pendek-menengah dari model GEOS-Chem,
    bukan korban tercatat DIBI; lebar pita 6,6 kali, di bawah satu orde, jadi boleh di kartu.
  - Banjir dan banjir bandang (Kartu 7.6), tanah longsor (Kartu 7.7), cuaca ekstrem (Kartu 7.8): lantai kejadian tunggal
    dan tahun tercatat terburuk nasional per jenis dari `lantai_jenis.csv` (banjir bandang baris sendiri sejak kategori
    2018); rangkaian Sumatra November 2025 (1.202 + 140) dicatat di kartu banjir dan longsor sebagai kejadian majemuk;
    kepekaan patahan kategori 2018 dan 2024 (tanah longsor 2024 hanya 219 kejadian).
  - Gelombang dan rob nasional: 4 meninggal tercatat pada musim analog; KRB terpapar gelombang 4.129.597.
  - Kepekaan peringatan dini dua lintasan per jenis; longsor tidak dihitung.
- **Komponen:** Gambar 7.1 peta kecil berganda IRBI 2025 banjir, longsor, kekeringan, karhutla (G19); Gambar 7.2
  meninggal dan hilang per musim hujan nasional 2008/09–2025/26 dengan penanda La Niña dan setelah El Niño kuat (G1,
  `musim_hujan.csv`); kartu per jenis: Kartu 7.6 banjir dan banjir bandang, 7.7 tanah longsor, 7.8 cuaca ekstrem, 7.4
  gelombang ekstrem, abrasi, rob (ringkas), 7.3 kekeringan, 7.5 karhutla (B5.11); kartu agregat operasional: Kartu 7.1
  musim hujan tercatat terburuk nasional dan 7.2 musim hujan 2026/2027 setelah El Niño kuat (B5.11), dirujuk Bab 11.6;
  Gambar 7.3 kepekaan peringatan dini dua lintasan per jenis (G14, pil Asumsi kebijakan); Tabel 7.1 luas, kerugian,
  ISPA karhutla per provinsi asap 2015 dan 2019 (B5.7).
- **Status data:** ada (termasuk Koplitz dkk. 2016); sebagian (lantai per jenis menunggu `lantai_jenis.csv`); celah
  (luas genangan rob di luar WS Jratunseluna; puso; debit sungai).
- **Halaman:** 19.

### BAB 8 BENCANA NONALAM (9 hlm)

- **Subbab:** 8.1 Epidemi dan Pandemi; 8.2 Kebakaran Industri dan Kegagalan Teknologi; 8.3 Kebakaran Tempat Pemrosesan
  Akhir Sampah; 8.4 Kesenjangan Spesifik dan Implikasi.
- **Tujuan bab:** mengkuantifikasi analog terburuk tiap jenis nonalam dan menyatakan rezim penanggung jawabnya.
- **Pertanyaan kunci:**
  1. Siapa menetapkan status epidemi menurut UU 17/2023, dan kapan status darurat bencana berlaku?
  2. Berapa korban, luas, dan kerugian pada analog terburuk tiap jenis?
  3. Rezim keselamatan sektoral apa yang mengatur kebakaran industri, dan di mana peran BNPB?
  4. Mengapa kebakaran TPA berulang pada musim kemarau, dan instrumen apa yang menjadi lini pertama?
- **Temuan kunci yang diharapkan:**
  - COVID-19: 6.811.945 kasus dan 161.870 meninggal (Kemenkes 2024 via Renstra, Resmi); kematian berlebih 2020–2021
    806.815–1.343.849 (model WHO, Estimasi model, selalu rentang); status bencana nasional 1.165 hari; DTP3 85% ke 67%
    (2019–2021); JEE 2023 (`nonalam-sosial/covid19_nasional.csv`, `indikator.csv`).
  - Dua rezim status: KLB dan wabah (UU 17/2023: KLB oleh bupati/wali kota, gubernur, atau Menteri; daerah terjangkit
    wabah oleh Menteri) dan darurat bencana (UU 24/2007; Perpres 17/2018); norma pengait belum ada (C09).
  - Gagal teknologi: KRB 186.940 ha, 713.784 jiwa terpapar, Rp584.288 juta (Resmi); Plumpang 2023: 17 meninggal (hari
    ke-2, Resmi), 29 (BPBD DKI, sekunder), 1.085 pengungsi; Balongan 2021: 912–932 pengungsi; Morowali 2023: 19–20
    meninggal (sekunder) (`peristiwa.csv`, `krb_nonalam_nasional.csv`).
  - Rezim sektoral (dibuka, §8 E12): pengawasan keselamatan migas termasuk depo penyimpanan dan niaga oleh Menteri
    ESDM melalui Dirjen Migas dan Kepala Inspeksi (PP 11/1979 Pasal 2; Permen ESDM 32/2021 Pasal 3); keselamatan alat,
    proses, penyimpanan, dan pengangkutan industri oleh Menteri Perindustrian (UU 3/2014 Pasal 117 ayat (3) huruf j);
    K3 dan pencegahan kebakaran di tempat kerja di bawah Menteri Ketenagakerjaan (UU 1/1970 Pasal 3 dan 5). Tidak satu
    pun menyebut BNPB; peran BNPB berasal dari UU 24/2007 bila kejadian dinyatakan bencana nonalam. C14 ditulis dari
    mandat tertulis ini; Kemenperin dan Kemnaker masuk matriks mandat tertulis. Permen ESDM 32/2021 menetapkan Daerah
    Terbatas dan Daerah Terlarang hanya untuk instalasi lepas pantai; zona larangan darat sekitar depo ditulis sebagai
    fakta, bukan simpulan kesenjangan, sampai peraturan tata ruang dibaca. Instrumen BNPB: Perka 5/2008 (analisis risiko pembangunan berisiko tinggi) dan Perka 12/2014 (peran serta lembaga
    usaha).
  - Kebakaran TPA: 16 TPA terbakar bersamaan 2023 (BNPB); Sarimukti 80% lahan, 3.000 KK terdampak asap, status 21 hari
    kabupaten dan 14 hari provinsi; Jatiwaringin 2026 15 ha, 10 hari (BNPB); KLH: 485 TPA, sekitar 369 belum berhenti
    pembuangan terbuka akhir 2025. Pencegahan = kepatuhan UU 18/2008 Pasal 44 ayat (2) (tutup paling lama 5 tahun);
    lini pertama = sistem tanggap darurat pengelolaan sampah kab/kota (Pasal 9 ayat (1) huruf f); BNPB mendukung bila
    status keadaan darurat ditetapkan.
- **Komponen:** Kartu 8.1 pandemi; Kartu 8.2 kebakaran industri dan kegagalan teknologi; Kartu 8.3 kebakaran TPA (B5.11,
  tabel empat besaran: korban jiwa, luas terdampak, kerugian materiil, kerugian imateriil, sel kosong "–" beralasan;
  baris kepekaan tanpa perkalian per prinsip 10: versi resmi lawan model atau terverifikasi, dengan dan tanpa analog
  terbesar, durasi status);
  Gambar 8.1 kematian COVID-19 terlapor per pekan dan rentang kematian berlebih (G11); Gambar 8.2 garis waktu status
  epidemi dua rezim (B5.31); Tabel 8.1 KRB nonalam nasional (B5.7); Tabel 8.2 TPA terbakar 2023–2026 dan statusnya
  (B5.7).
- **Status data:** ada (COVID-19, KRB, TPA, rezim keselamatan sektoral); sebagian (industri sekunder; SK status TPA dari
  berita; teks konsolidasi UU 3/2014 pascaperubahan Cipta Kerja belum diperiksa); celah (kerugian rupiah dan imateriil
  nonalam; sebaran kab epidemi selain COVID-19).
- **Halaman:** 9.

### BAB 9 BENCANA SOSIAL (7 hlm)

- **Subbab:** 9.1 Definisi Operasional dan Batas Mandat; 9.2 Sebaran Konflik Antarkelompok; 9.3 Kejadian Analog; 9.4
  Instrumen yang Belum Ada; 9.5 Implikasi.
- **Tujuan bab:** mengkuantifikasi konflik sosial antarkelompok dalam batas mandat BNPB.
- **Pertanyaan kunci:**
  1. Konflik apa yang masuk bencana sosial menurut UU 24/2007 dan UU 7/2012?
  2. Di provinsi mana perkelahian massal antarkelompok paling sering?
  3. Berapa korban dan pengungsi pada analog terburuk?
  4. Apa peran BNPB, dan instrumen apa yang belum ada untuk Perpres 46/2026?
- **Temuan kunci yang diharapkan:**
  - Podes 2024: 2.031 desa (2,41%) dengan perkelahian massal, naik dari 1.553 (1,85%) pada 2021; 150 desa dengan korban
    meninggal; tertinggi DKI 18,73%, Maluku 11,41%, Maluku Utara 11,33% (`nonalam-sosial/konflik_podes_provinsi.csv`).
  - Analog: Maluku 1999–2002 sedikitnya 5.000 meninggal dan sekitar 700.000 mengungsi (ICG); Poso sekitar 1.000 dan
    > 100.000 (HRW); Sampit sekitar 500 dan 108.000 (ICG); Sambas 1996–1997 dan 1999; pengungsi tercatat resmi > 1 juta
    pada 2001; Wamena 2019 dengan catatan pernyataan Presiden bahwa kejadian itu bukan konflik etnis.
  - Seri DIBI konflik tidak dipakai (baris Jayawijaya 7 Mei 2026 kemungkinan memuat korban jembatan; dugaan entri ganda
    Maluku Tengah). Kerusuhan Agustus 2025 disebut hanya sebagai celah pencatatan DIBI, tanpa atribusi sebab.
  - Peran BNPB (mandat tertulis): unsur Satgas Penyelesaian Konflik Sosial nasional (UU 7/2012 Pasal 49 ayat (2) huruf
    l); rekonsiliasi dan resolusi konflik sebagai kegiatan rehabilitasi pascabencana (UU 24/2007 Pasal 58 ayat (1) huruf
    f) yang dapat dilakukan lewat Satgas (UU 7/2012 Pasal 37 ayat (2)); pengungsi bersama Kemensos (PP 2/2015); keadaan
    tertentu bagi daerah dalam proses rekonsiliasi pascakonflik (Perpres 46/2026 Pasal 3 ayat (2) huruf c). Batasnya:
    fungsi pascabencana dan keadaan tertentu; penghentian konflik tetap di Polri dan Satgas. Pendanaan penghentian konflik
    dan rekonsiliasi pascakonflik dari DSP APBN dan BTT APBD oleh unsur Satgas (UU 7/2012 Pasal 55 ayat (1)).
    Peringatan dini konflik (Pasal 6, 10) tidak dipetakan ke unit BNPB. Kepekaan Kartu 9.1: Maluku sedikitnya 5.000
    lawan mungkin 10.000 meninggal; dengan dan tanpa Maluku sebagai analog terbesar. Pedoman Kepala BNPB menurut Pasal 3 ayat (4) belum ada: Perban 5/2018 tidak
    memuat faktor sosial dan kondisi pascakonflik, dan Kepka 327/2025 tidak memuat perubahannya.
- **Komponen:** Gambar 9.1 peta persen desa berkonflik per provinsi 2024 (G19); Kartu 9.1 konflik sosial antarkelompok
  (B5.11, analog berangka, kemungkinan "tidak dinilai", baris kepekaan); Tabel 9.1 batas mandat dan sumber dana per fase,
  termasuk UU 7/2012 Pasal 55 dan UU 24/2007 Pasal 58 ayat (1) huruf f (B5.7, `nonalam-sosial/regulasi.csv`,
  `lembaga/peran.csv`).
- **Status data:** ada (Podes, analog terverifikasi); celah (kerugian rupiah; seri DIBI konflik tidak andal).
- **Halaman:** 7.

### BAB 10 ANALISIS KESENJANGAN SISTEM PENANGGULANGAN BENCANA (9 hlm)

- **Subbab:** 10.1 Regulasi; 10.2 Kelembagaan dan Komando; 10.3 Data dan Peringatan Dini; 10.4 Kapasitas BPBD dan
  SPM; 10.5 Logistik; 10.6 Pembiayaan; 10.7 Rehabilitasi dan Rekonstruksi; 10.8 Kesenjangan Bukti; 10.9 Yang Sudah
  Berjalan dan Tidak Boleh Dikorbankan.
- **Tujuan bab:** menamai kesenjangan yang paling menahan, dengan bukti dan lembaga pembukanya.
- **Pertanyaan kunci:**
  1. Norma apa yang belum ada atau tidak saling terhubung?
  2. Di mana rantai komando dan klaster berubah atau usang?
  3. Mengapa cakupan peringatan dini berbeda antara Renstra dan Renas?
  4. Apa hambatan daerah?
  5. Berapa sel matriks fase × jenis tanpa program terbukti?
- **Temuan kunci yang diharapkan:**
  - Regulasi: Perpres status dan tingkatan bencana (UU 24/2007 Pasal 7 ayat (3)) belum terbit menurut penelusuran JDIH
    BPK dan tulisan hukum BPK Perwakilan Jawa Barat 3 Februari 2025, ditulis sebagai kesenjangan berpasal dan dikaitkan
    dengan Penjelasan Pasal 21 ayat (1) huruf b PP 21/2008 (penentuan status termasuk penentuan tingkatan); JDIH Setneg
    tidak dapat dicari dan catatannya di log QA; dua rezim status epidemi tanpa norma pengait (C09); Perban 5/2018 belum
    melaksanakan Perpres 46/2026; Inpres 3/2020 menyebut lembaga yang sudah tidak ada (C04); Unsur Pengarah dan Perban
    6/2018 memakai nomenklatur lama (C12).
  - Komando: klaster 8 menjadi 6 (Kepka 173 lawan 308/2024; C08); SKPDB lemah (Renas, C02); rantai peringatan dini lintas
    tiga Kemenko (C15).
  - Data: lubang DIBI nonalam; patahan 2024; jalur Walidata (Perban 1/2023).
  - Peringatan dini: IKP Renstra 6,10% ke 6,32% (RPJMN KP 08.04.02, baseline 6,00) lawan Renas 1.c 11.060 ke 52.000
    per 100.000 (penyebut berbeda).
  - BPBD: kapasitas kab rendah 315 dari 508; SPM; BTT dan DSP belum sinkron.
  - RR: hambatan Renstra (SDM Jitupasna dan R3P di daerah, komitmen anggaran pascabencana, ketidaksinkronan
    Permendagri); dokumen R3P Lombok dan Sulteng tidak ditemukan di sumber terbuka, sedangkan R3P Cianjur diunggah BNPB
    sebagai contoh tanpa nomor penetapan (kesenjangan keterbukaan dokumen R3P).
  - Bukti: dua program berbukti kuat, keduanya luar negeri; tidak ada program untuk epidemi, kebakaran industri,
    kebakaran TPA, konflik (`program-terbukti/README.md` §4).
- **Komponen:** Kartu temuan 10.1–10.8 (B5.6); Tabel 10.1 celah kewenangan (B5.7, `lembaga/celah.csv`); Tabel 10.2
  klaster dua versi (B5.7, `lembaga/klaster.csv`); Tabel 10.3 empat angka cakupan peringatan dini (B5.7); Gambar 10.1
  sel matriks per kategori bukti (G16); Kotak 10.1 yang tidak boleh dikorbankan (B5.5).
- **Status data:** ada; isi temuan BPK belum dibaca dan tidak diklaim.
- **Halaman:** 9.

### BAB 11 GRAND DESIGN MITIGASI 2026–2030 (17 hlm)

- **Subbab:** 11.1 Kerangka Program; 11.2 Sasaran 2029 dan Arah 2030; 11.3 Alur Langkah Penanggulangan; 11.4 Matriks
  Strategi Fase × Jenis Bencana; 11.5 Operasi Musiman: Kemarau dan Musim Hujan; 11.6 Rencana Aksi Musim Hujan 2026/2027
  Tingkat Nasional dan Kesiapan Kemarau 2027; 11.7 Kebutuhan Respons dan Logistik per Wilayah; 11.8 Desa, Sekolah, dan
  Relawan; 11.9 Pemulihan per Instrumen; 11.10 Agenda Bukti 2026–2030.
- **Tujuan bab:** menyusun strategi tiga tahap yang berpasal, berpemicu, dan berbukti, dimulai musim 2026/2027.
- **Pertanyaan kunci:**
  1. Sasaran apa yang terukur dengan data sekarang?
  2. Langkah apa dari peringatan dini sampai R3P, siapa memutus, dan pada pemicu apa?
  3. Apa aksi per fase untuk tiap jenis, dengan kategori bukti?
  4. Apa yang dikerjakan BNPB saat kemarau dan saat musim hujan, termasuk 2026/2027?
  5. Berapa kebutuhan respons skenario terburuk per Direktorat Penanganan Darurat Wilayah?
- **Temuan kunci yang diharapkan:**
  - Sasaran utama: Renas 1.a dan 1.b dari DIBI; 1.c dalam dua lintasan sampai KD-2 diputus; IRB turun 1,2% per tahun
    (IKS RPJMN dan Renstra) diukur terhadap baseline IRBI 2025 skala baru setelah diterbitkan (KD-4); kapasitas 90%
    dengan alat ukur hasil KD-3; arah 2030 berlabel.
  - Alur langkah: peringatan dini (Perban 2/2024) → siaga darurat (Perban 4/2020) → tanggap darurat: SKPDB (Perka
    3/2016, Juklak 10/2023), kaji cepat (Juklak 3/2022), penilaian awal (Juklak 4/2023), penilaian perkembangan (Juklak
    6/2023), DSP → transisi darurat → Jitupasna (Perka 15/2011) → R3P (Perban 5/2017) → RR (Perban 6/2017; hibah Perban
    4/2024). Pemicu khusus per jenis: level aktivitas gunung api PVMBG, peringatan dini tsunami BMKG, siaga darurat
    kekeringan dan karhutla, penetapan KLB atau wabah (UU 17/2023), status keadaan konflik (UU 7/2012). Status ditetapkan
    Presiden, gubernur, atau bupati/wali kota menurut tingkatnya (Perpres 17/2018 Pasal 2).
  - Matriks fase × jenis: baris aksi menurut UU 24/2007 Pasal 35, 44–47, 48, 57–59; kolom pemicu status dan instrumen
    yang terbuka pada status itu; kategori bukti per sel; jumlah sel per kategori dilaporkan.
  - Operasi musiman (4 hlm bersama 11.6): kalender bahaya bulanan per pulau dari DIBI (kemarau: kekeringan, karhutla,
    kebakaran TPA, kebakaran permukiman sebagai konteks; musim hujan: banjir, banjir bandang, longsor, cuaca ekstrem,
    gelombang); pemicu (prakiraan musim BMKG per ZOM, status ENSO dan IOD, PDKM, siaga darurat); aksi per tahap; unit
    BNPB dan K/L.
  - Rencana Aksi Musim Hujan 2026/2027 nasional: provinsi dengan awal musim November–Desember 2026 (siaran BMKG 22
    September 2026: awal November 185 ZOM, Desember 266 ZOM; tingkat provinsi bila tabel per ZOM tidak diperoleh); dasar
    skenario kartu agregat 7.1 dan 7.2; unit sama dengan Kajian 1 ditambah Direktorat PD Wilayah sesuai provinsi;
    Kesiapan Kemarau 2027.
  - Kebutuhan respons: pengungsi tercatat puncak (hidrometeorologi) atau penghuni rumah RB+RS (gempa) × standar Perka
    7/2008 dan Perban 3/2018, dibagi ke Direktorat PD Wilayah I–III menurut provinsi (`program-terbukti/organisasi_bnpb.csv`);
    rekomendasi untuk Deputi Bidang Logistik dan Peralatan, Pusdiklat PB (latihan berbasis skenario), Direktorat Sistem
    PB.
  - Desa dan sekolah: Destana 2.234 ke 7.234 desa (Renas 4.5.1.a) dari 53.000 desa di daerah rawan; evaluasi dampak
    dengan garis dasar tingkat ketangguhan Perban 7/2025; SPAB dilaksanakan kementerian pendidikan dengan BNPB sebagai
    kontributor (Renas 2.1.2.a); relawan dan kearifan lokal hanya berdokumen primer.
  - Pemulihan per instrumen: Dana Tunggu Hunian (Juklak 1/2023; Juklak 15/2025 untuk Aceh, Sumatera Utara, Sumatera
    Barat), hunian sementara (Juklak 3/2023), stimulan rumah DSP (Juklak 5/2024), hibah RR (Perban 4/2024), R3P (Perban
    5/2017); pemulihan Sumatra 2025 sebagai kasus berjalan; sinkronisasi nomenklatur RR dengan Kemendagri.
  - Agenda bukti: Destana, SPAB, InaTEWS, OMC. Embung dan polder pindah ke agenda bukti Kajian 1 (Tabel 8.6) dan
    tercatat di register bersama berkajian air.
- **Komponen:** Halaman kerangka 11.1 (B5.12); Tabel 11.1 indikator dengan Target 2029 resmi dan arah 2030 (B5.19,
  G22); Gambar 11.1 alur langkah berpemicu (B5.23, G21); Tabel 11.2 matriks fase × jenis dengan kolom pemicu (B5.22);
  Gambar 11.2 kalender bahaya bulanan per pulau (G16, turunan baru dari `riset/mentah/dibi_hidromet.json`); Tabel 11.3
  operasi musiman: pemicu, aksi, unit (B5.7); Gambar 11.3 kalender Rencana Aksi Musim Hujan 2026/2027 (G23); Tabel 11.4
  kebutuhan respons per Direktorat PD Wilayah (B5.7); Tabel 11.5 agenda bukti (B5.7); Halaman studi kasus 11.1
  kesiapsiagaan siklon Bangladesh (B5.30, bukti kuat) dan 11.2 Odisha (B5.30, bukti sedang).
- **Status data:** sebagian (kalender bulanan dan baseline 1.c per provinsi perlu turunan atau permintaan data).
- **Halaman:** 17.

### BAB 12 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN (11 hlm)

- **Subbab:** 12.1 Matriks Mandat Tertulis per Jenis dan Fase; 12.2 Usulan Penugasan dan Instrumen Penetapannya; 12.3
  Forum Koordinasi dan Jalur Adopsi; 12.4 Yang Berubah dari Renas PB 2025–2029; 12.5 Profil Kerugian dan Arsitektur
  Pembiayaan; 12.6 Instrumen Hukum; 12.7 Peta Jalan; 12.8 Indikator Kinerja; 12.9 Pemantauan dan Pelaporan.
- **Tujuan bab:** memberi tiap rekomendasi pemilik bermandat, forum, sumber dana, instrumen, dan jadwal, dan
  menyatakan apa yang diusulkan berubah dari Renas PB.
- **Pertanyaan kunci:**
  1. Mandat tertulis siapa per jenis dan fase, dan mana yang baru usulan?
  2. Apa yang diusulkan berubah dari Renas PB (target, lokus, unit, instrumen), dan lewat jalur mana: berkala untuk
     target dan indikator paling lambat 2027, atau bencana untuk program dan kegiatan rencana aksi paling lambat 2028?
  3. Lapisan dana mana untuk kejadian sering, berat, dan ekstrem?
  4. Instrumen hukum apa, oleh siapa, dan di Progsun mana?
  5. Bagaimana kemajuan dilaporkan?
- **Temuan kunci yang diharapkan:**
  - Mandat: 127 baris peran, 74 tertulis (`lembaga/peran.csv`); klaster Kepka 308/2024.
  - Forum: rakor Kemenko PMK (Perpres 1/2019 Pasal 6; Deputi Bidang Koordinasi PB dan Konflik Sosial, Perpres 144/2024);
    Unsur Pengarah BNPB (Perpres 1/2019 Pasal 10–13); peninjauan Renas PB lewat monev tahunan 2026 atau evaluasi paruh
    waktu 2027 (prinsip 1); peninjauan RIPB (Perpres 87/2020 Pasal 7) dengan pelaporan monev melalui Menko PMK (Pasal 6).
  - Yang berubah dari Renas: tabel berkolom kode program Renas, perubahan yang diusulkan, jalur berkala (target dan
    indikator, paling lambat 2027) atau jalur bencana (program dan kegiatan rencana aksi, paling lambat 2028), dokumen
    monev tempat rekomendasi dimuat, status, bukti (`program-terbukti/renas_pb_2025_2029.csv`, `renas_aksi_terkait.csv`).
    KD-2, KD-3, KD-4 hanya berjalur berkala.
  - Profil kerugian tahunan batas bawah 2015–2025: rumah rusak DIBI × stimulan Rp60/30/15 juta (skema lama 50/25/10),
    lapisan sering (median), berat (persentil 90), ekstrem (kejadian analog: Sulteng 2018, Sumatra 2025); Asumsi
    kebijakan; indikator Renas 2.a (identik dengan Sasaran Utama PN 8 RPJMN indikator 4: baseline 0,140% PDB pada 2022,
    target 0,137 pada 2025 dan 0,135 pada 2029) menunggu seri CKAN kerusakan dan kerugian R3P.
  - Pembiayaan: DSP tiga keadaan; Dana Bersama (Perpres 75/2021 Pasal 8: permohonan tertulis dan rekomendasi Kepala
    BNPB kepada Menteri Keuangan; Perban 1/2026 tidak mensyaratkan analisis manfaat-biaya); dana kontinjensi bencana
    APBN untuk kesiapsiagaan (PP 22/2008 Pasal 6 ayat (1)); DSP konflik sosial (UU 7/2012 Pasal 55 ayat (1)); asuransi
    BMN (Renas 4.6.3.a); DAK; APBD, BTT, dan DSP BPBD (PP 22/2008 Pasal 6 ayat (3)); dana desa; sinkronisasi BTT dan DSP.
  - Instrumen usulan: perubahan Perban 5/2018 untuk melaksanakan Perpres 46/2026 Pasal 3 ayat (4) (Usulan baru;
    Deputi Bidang Penanganan Darurat dan Biro Hukum, Organisasi, dan Kerja Sama; rakor Kemenko PMK sebagai syarat
    Pasal 3 ayat (1)); Perpres status dan tingkatan bencana (belum terbit menurut JDIH BPK; BNPB lewat Kemenko PMK;
    indikator UU 24/2007 Pasal 7 ayat (2) dikuantifikasi dari DIBI tanpa ambang rekaan); norma pengait status KLB dan
    darurat bencana (pemrakarsa Kemenkes bersama BNPB); Perban analisis risiko bencana pada kegiatan pembangunan berisiko
    tinggi (Sudah ada, perlu dikembangkan: Perka 5/2008 dan Progsun butir 3); syarat analisis manfaat-biaya Dana
    Bersama lewat perubahan Perban 1/2026 (rujukan FEMA P24).
- **Komponen:** Tabel 12.1 matriks mandat tertulis lembaga × fase dengan kode K/P/R/I dan pasal (B5.7,
  `lembaga/matriks_ringkas.csv`); Tabel 12.2 usulan penugasan dan instrumen (B5.7); Gambar 12.1 forum dan jalur adopsi
  (B5.23); Tabel 12.3 yang berubah dari Renas PB dengan kolom jalur berkala dan jalur bencana (B5.7); Gambar 12.2 profil
  kerugian tahunan batas bawah 2015–2025 (G1);
  Gambar 12.3 lapisan pembiayaan (B5.21); Tabel 12.4 instrumen hukum dengan kolom Progsun (B5.20); Tabel 12.5 peta jalan
  (B5.13 kolom WAKTU); Tabel 12.6 indikator (B5.19); Gambar 12.4 tata kelola dan pelaporan tiga lapis (B5.23).
- **Status data:** ada (lembaga, korpus, Renas, RPJMN, PP 21/2008, PP 22/2008, Perpres 75/2021, Perpres 87/2020);
  sebagian (seri CKAN R3P belum ditarik).
- **Halaman:** 11.

### BAB 13 KESIMPULAN DAN REKOMENDASI (4 hlm)

- **Subbab:** 13.1 Kesimpulan; 13.2 Keputusan yang Diminta dari Kepala BNPB; 13.3 Rekomendasi Internal BNPB; 13.4
  Rekomendasi Lintas K/L; 13.5 Yang Sengaja Tidak Direkomendasikan; 13.6 Yang Belum Diketahui.
- **Tujuan, pertanyaan, komponen:** sama dengan Bab 10 Kajian 1. Yang tidak direkomendasikan: indeks risiko gabungan
  buatan sendiri; DSP untuk mitigasi prabencana; angka korban titik dari model gempa platform; proyeksi korban konflik;
  perubahan target Renas lewat jalur bencana.
- **Halaman:** 4.

**Jumlah:** 7 + 8 + 9 + 11 + 15 + 15 + 19 + 9 + 7 + 9 + 17 + 11 + 4 = 141 hlm; cadangan 9 hlm sampai batas 150.

### Deck kajian mitigasi (13 slide isi)

Bagian: A Histori, B Profil risiko, C Skenario terburuk, D Kesenjangan, E Grand design. Slide C1–C3 satu seri berchip
GEOLOGI, HIDROMETEOROLOGI, NONALAM DAN SOSIAL (S12). Urutan `jenis`: navigasi, grafik, peta, matriks, tabel, tabel,
grafik, panel, grafik, tabel, matriks, rekomendasi, navigasi (5–6 berurutan sebagai seri berchip, pengecualian S35).

| No | Kode dan judul | Pesan | Jenis; medan judul | Visual dan sumber |
| --- | --- | --- | --- | --- |
| – | Grand Design Mitigasi Bencana Indonesia 2026–2030 | Sampul | sampul | Subjudul "Strategi Prabencana, Tanggap Darurat, dan Pascabencana" (T10) |
| 1 | Pesan Kunci | Tesis, 2–3 keputusan beserta akibat, 4–6 temuan penopang, satu per bagian (S1) | navigasi; deskriptif | Pita keputusan KD-1, KD-2, KD-3 tanpa angka keluaran R (prinsip 10); kartu temuan berchip (S1, S2) |
| 2 | A1. Bencana alam 2025 menelan {a} jiwa meninggal dan hilang, tertinggi sejak 2018 | Korban naik meskipun indeks turun | grafik; temuan | {a} = 1.735 meninggal + 221 hilang, kategori alam (V06). Batang meninggal+hilang alam 2015–2025 (G1) dan kejadian alam bertumpuk kelompok (G9) dengan penanda patahan 2024; 3 kartu angka, satu di antaranya Sumatra November 2025 (1.202 + 140), satu versi semua klasifikasi 2.030 dengan catatan komposisi; `dibi/rekap_nasional_tahunan.csv`, `skenario-hidromet/kartu_skenario.csv` |
| 3 | B1. {a} dari 514 kab/kota berstatus Tinggi pada IRBI 2025, terbanyak di {pulau} ({b}) | Sebaran risiko dari pulau ke kab/kota | peta; temuan | Peta Indonesia status IRBI 2025 per kab/kota (G19, ramp T8), pil pulau dan 5–8 provinsi native, catatan skala 2025; `irbi/irbi_kab_2025.csv`, `irbi_agregat_pulau.csv` |
| 4 | B2. {a} dari {n} jenis bencana berada di kelas dampak tertinggi; peluang lima tahun dapat dinilai untuk {m} jenis | Penilaian terbanding semua jenis | matriks; temuan | {n} = 15 jenis `tema.json`, satu titik per kartu per jenis. Matriks kemungkinan × dampak (G17, B5.27); panel "dampak dinilai, kemungkinan tidak dinilai"; pil Penilaian pakar bila posisi dari analog; `skenario-geologi`, `skenario-hidromet`, `nonalam-sosial/skenario_terburuk.csv`, `riset/mentah/oni_cpc.txt` |
| 5 | C1. Penduduk terpapar tsunami mencapai {a} jiwa menurut KRB 2022–2026 | Skenario geologi dinyatakan dengan paparan; korban tsunami belum dapat dihitung | tabel; temuan | Chip GEOLOGI. Tabel paparan resmi, Mmaks resmi megathrust Jawa 9,1, tinggi tsunami sekitar 20 m dan 12 m (Terverifikasi), lantai tercatat Pangandaran 2006 dan Mentawai 2010; jiwa pesisir rendah tiba ≤ 30 menit di badan slide berpil Estimasi model dengan daftar kab yang terlewat proksi; faktor evakuasi ×1 / ×0,600 / ×0,437 atas paparan; baris analog Cianjur 2022 dan Sulteng 2018; `skenario-geologi/ringkasan.csv`, `tsunami_kab.csv`, `kepekaan.csv`, `pembanding_resmi.csv` |
| 6 | C2. Musim hujan 2025/2026 mencatat {a} meninggal dan hilang, lantai skenario terburuk hidrometeorologi nasional | Lantai dari kejadian nyata; kartu 2026/2027 | tabel; temuan | Chip HIDROMETEOROLOGI. Kolom musim tercatat terburuk, kasus Sumatra 2025, musim 2026/2027 setelah El Niño kuat, kemarau; model rasio berdampingan berlabel; `skenario-hidromet/kartu_skenario.csv`, `musim_hujan.csv` |
| 7 | C3. COVID-19 menjadi analog nonalam terburuk dengan {a} kematian tercatat resmi | Nonalam dan sosial dikuantifikasi dari analog tanpa perkalian | grafik; temuan | Chip NONALAM DAN SOSIAL. Batang analog per jenis dengan rentang (G12) dan label keyakinan; panel kepekaan: kematian berlebih model WHO {b}–{c}, konflik Maluku 1999–2002 sedikitnya {d} meninggal, Plumpang 17 lawan 29, durasi status TPA; `nonalam-sosial/covid19_nasional.csv`, `peristiwa.csv`, `skenario_terburuk.csv` |
| 8 | D1. Target cakupan peringatan dini 2029: Renstra {a}% lawan Renas {b} per 100.000; {c} tumpang tindih dan celah kewenangan tercatat | Kesenjangan yang menuntut keputusan | panel; temuan | Tiga panel kartu temuan; pita Kondisi 2025 ke Target 2029 dengan dua lintasan dan catatan penyebut (S24); `program-terbukti/renstra_bnpb_2025_2029.csv`, `lembaga/celah.csv` |
| 9 | E1. Alur Langkah dan Kerangka Program 2026–2030 | Rantai pemicu dan program berkode per kelompok bencana | grafik (rantai tahap, G21); deskriptif | Naskah Bab 11.1 dan 11.3; pita sasaran 2029 resmi; baris Sumber dan pil CUT OFF |
| 10 | E2. Operasi Musiman dan Rencana Aksi Musim Hujan 2026/2027 | Apa yang dikerjakan saat kemarau dan saat musim hujan | tabel; deskriptif | Kalender bahaya, pemicu, unit; baris 2026/2027 dan kemarau 2027; naskah Bab 11.5–11.6 |
| 11 | E3. Tugas per fase untuk {a} lembaga pada {n} ancaman; BNPB koordinator tanggap darurat pada {b} ancaman | Siapa mengerjakan apa per fase | matriks; temuan | Matriks mandat tertulis lembaga × fase, kode K/P/R/I, ≤ 12 baris (S22, S23); `lembaga/peran.csv`, `matriks_ringkas.csv`, `matriks_bencana.csv` |
| 12 | E4. Rekomendasi dan Peta Jalan 2026–2030 | {a} rekomendasi, {b} dalam 100 hari | rekomendasi; deskriptif | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB (S28, S29); register bersama |
| 13 | Kesimpulan | 8 kesimpulan dan pita ARAHAN | navigasi; deskriptif | Kisi 4 × 2 (S32) |
| – | Terima kasih; Lampiran | Penutup dan pembatas | layout GELAP | – |

Lampiran deck: L1 Tren IRB per pulau 2015–2024; L2 Nilai IRBI 2025 per bahaya untuk kab/kota berstatus Tinggi; L3 Kartu
skenario per jenis; L4 Rekap DIBI dan rekonsiliasi kejadian 2024; L5 Kisi kekuatan bukti × status program; L6 Profil
kerugian dan arsitektur pembiayaan; L7 Tata kelola, pelaporan, matriks mandat lengkap; L8 Instrumen hukum dan yang
berubah dari Renas PB; L9 Metode, label keyakinan, data yang belum ada; L10 Peta kapasitas daerah dua ukuran; L11 Peta
paparan skenario geologi; L12 Daftar singkatan.

### Lampiran DOCX Kajian 2

A IRBI 2025 514 kab/kota per bahaya, status resmi, dan daftar perhatian dengan syarat (juga `.xlsx`); B Profil 38
provinsi; C Kartu skenario lengkap per jenis untuk 15 jenis (termasuk kepekaan Mw 8,9 per segmen dan keluaran model
berlabel); D Rekap DIBI dan
rekonsiliasi; E Matriks dan kronologi regulasi; F Metode simulasi, asumsi, matriks ketersediaan kuantifikasi, skala
dampak, dasar kemungkinan; G Rekonsiliasi angka; H Katalog program per posisi dan kekuatan bukti; I Register
rekomendasi bersama dan tabel silang dengan Kajian 1; J Penyelarasan dokumen BNPB; K Glosarium; L Atribusi foto.

### Peta Kajian 2 (web dan PNG)

Status IRBI 2025 per kab/kota (Indonesia); IRBI 2025 per bahaya (peta kecil berganda); kelas provinsi 2023 resmi;
kapasitas kab (KRB 2022–2026); paparan tsunami (jiwa pesisir rendah tiba ≤ 30 menit, KRB) dan jejak skenario; KRB 30
gunung api; jumlah tahun tercatat kejadian hidrometeorologi per kab; persen desa berkonflik per provinsi (Podes 2024);
daftar perhatian per kelompok bahaya.

---

## 6. Register rekomendasi bersama dan keputusan yang diminta

**Register.** Satu berkas register (kunci baru di `data/angka.json` atau `data/rekomendasi.json`, dibangun bersama
naskah) memuat tiap rekomendasi dengan ID tunggal `R-nn` dan kolom: langkah (≤ 8 kata); rincian; kajian (air, mitigasi,
keduanya); unit BNPB pemimpin dan pendukung (OTK berlaku); peran BNPB (kosakata prinsip 14) dan kode K/P/R/I; pemimpin
K/L (PJ Renas bila ada); forum koordinasi; instrumen dan pelaksana daerah atau "hanya pusat"; waktu (hari ke-0 sampai
14 hari, 100 hari, 2026–2027, 2028–2030); indikator selesai; dasar (kode temuan dan regulasi); status P7 dan sumber
status; posisi bukti. Kajian 1 menampilkan baris berkajian air atau keduanya; tabel silang di Lampiran H (Kajian 1)
dan I (Kajian 2). Daftar 100 hari dan daftar keputusan yang diminta hanya satu.

**Keputusan yang diminta dari Kepala BNPB (kandidat; dikunci di Bab 10 dan Bab 13):**

| Kode | Keputusan | Pilihan dan akibat | Kajian |
| --- | --- | --- | --- |
| KD-1 | Menetapkan kajian sebagai masukan peninjauan Renas PB 2025–2029 dan menetapkan hari ke-0 peta jalan | (a) Tetapkan November 2026: Rencana Aksi Musim Hujan berjalan sebelum awal musim di sebagian besar Jawa (Desember); rekomendasi perubahan target dan indikator (KD-2, KD-3, KD-4) dimuat di hasil evaluasi tahunan Renas PB 2026 sehingga perubahan lewat jalur berkala selesai paling lambat 2027, tahun terakhir jalur itu. (b) Tunda: hari ke-100 melewati puncak musim; bila rekomendasi tidak termuat di evaluasi tahunan 2026 atau evaluasi paruh waktu 2027, perubahan target dan indikator tertutup setelah 2027, dan yang tersisa hanya perubahan program dan kegiatan rencana aksi lewat jalur bencana paling lambat 2028 | keduanya |
| KD-2 | Menyelaraskan target cakupan peringatan dini (jalur berkala, paling lambat 2027) | (a) Revisi IKP Renstra mendekati lintasan Renas 1.c: target unit naik dari 6,32% dan butuh baseline per daerah. (b) Pertahankan IKP Renstra dan nyatakan Renas 1.c sebagai target lintas K/L: target unit BNPB 2029 tetap 6,32% (RPJMN KP 08.04.02, baseline 6,00), sementara Renas 1.c menargetkan 52.000 per 100.000 penduduk di daerah berisiko; penyebut kedua indikator berbeda, sehingga selisihnya tidak dibaca sebagai kekurangan tanpa catatan penyebut | keduanya |
| KD-3 | Memilih alat ukur kapasitas daerah untuk IKS 90% pada 2029 (jalur berkala, paling lambat 2027) | (a) IKD (Perka BNPB 3/2012; baseline resmi RPJMN 62% pada 2023, target 67% pada 2025 yang dipakai Renstra sebagai titik awal). (b) Kapasitas KRB 2022–2026 (baseline 38%). Akibat: besar kesenjangan menuju 90% dan unit pengukur berbeda | mitigasi |
| KD-4 | Menerbitkan catatan metode dan baseline IRBI 2025 skala baru (rekomendasi 100 hari, Direktorat Pemetaan dan Evaluasi Risiko Bencana) | (a) Terbitkan: IKS penurunan 1,2% per tahun dapat diukur 2026–2029. (b) Tidak: capaian 2025–2029 tidak sebanding dengan seri 2015–2024 | mitigasi |
| KD-5 | Menyampaikan posisi risiko BNPB terhadap Tanggul Laut Pantura dan penurunan muka tanah | (a) Usulkan lewat Kemenko PMK agar telaah risiko bencana masuk tata kelola BOP Pantura Jawa dan BNPB menjadi kontributor Renas 2.4.4.a pada peninjauan Renas. (b) Tidak: RTD kegagalan tanggul dan polder tidak terhubung ke renkon BPBD pesisir | air |

**Keputusan 14 hari pertama (kandidat, hanya instrumen berlaku):** (1) penetapan hari ke-0 dan penugasan unit Rencana
Aksi Musim Hujan 2026/2027; (2) penyampaian prakiraan awal musim per ZOM BMKG ke BPBD dengan permintaan pemutakhiran
rencana kontingensi banjir dan longsor (Perban 2/2023) dan uji rantai peringatan dini (Perban 2/2024), oleh Direktorat
Kesiapsiagaan dan Direktorat Peringatan Dini; (3) permintaan data operasional kemarau 2026 (status, distribusi air, desa
terdampak) ke BPBD provinsi dan Pusdalops, oleh Pusdatinkom; (4) inventarisasi cadangan logistik dan peralatan per
Direktorat PD Wilayah terhadap kebutuhan respons skenario, oleh Deputi Bidang Logistik dan Peralatan; (5) surat ke
Kemenko PMK untuk rakor peninjauan Renas PB, oleh Biro Perencanaan dan Deputi Bidang Sistem dan Strategi; (6) penugasan
catatan metode IRBI 2025 (KD-4); (7) penugasan Direktorat Pengembangan Strategi Penanggulangan Bencana dan Biro
Perencanaan untuk memuat rekomendasi kedua kajian, dipisah jalur berkala dan jalur bencana, ke dalam evaluasi tahunan
Renas PB 2026 (prinsip 1).

---

## 7. Celah data yang diakui dan cara penyajiannya

| No | Celah | Kajian/bab | Penyajian tanpa mengarang |
| --- | --- | --- | --- |
| 1 | Tidak ada skenario korban resmi PuSGeN atau BMKG yang terbuka; renkon megathrust nasional tidak ditemukan | K2 Bab 6 | Angka utama = paparan KRB 2022–2026 dan korban kejadian analog; keluaran platform di kartu dan lampiran berlabel |
| 2 | Mmaks Peta Gempa 2024 hanya dari sumber sekunder. **Tertutup (§8, E1)** | K2 Bab 6 | Mmaks resmi PuSGeN 2024 (megathrust Jawa 9,1 gabungan, 8,9 barat dan timur) di badan teks berlabel Resmi; kartu kepekaan magnitudo diganti kartu Mmaks resmi |
| 3 | Genangan tsunami InaRISK `Inun_*` belum dipakai; proksi pesisir rendah melewatkan pantai selatan Jawa Barat | K2 Bab 6 | Korban tsunami "tidak dikuantifikasi"; paparan, tinggi tsunami Widiyantoro dkk. (Terverifikasi, §8 E2), dan waktu tiba ditulis dengan daftar kab yang terlewat; lantai tercatat per wilayah (prinsip 9) |
| 4 | Mmaks sesar darat (Lembang, Cimandiri, Opak) tidak bersumber. **Tertutup (§8, E1)** | K2 Bab 6 | Mmaks resmi PuSGeN 2024 Tabel 6.9 (Lembang 6,6; Cimandiri 6,3–6,8; Opak 6,9); korban tetap dari kartu analog Yogyakarta 2006 dan Cianjur 2022 |
| 5 | Likuefaksi tanpa skenario | K2 Bab 6 | Kartu analog Sulteng 2018 dan paparan KRB likuefaksi 86.689.779 jiwa |
| 6 | Model korban gempa galat LOO ±5,3 kali; GMPE belum diuji; rasio analog dari gempa kerak | K2 Bab 3, 6 | Pita di kartu dan lampiran dengan galat tertulis; Bab 3 menyatakan keterbatasan |
| 7 | Luka-luka tidak tercatat di DIBI dan tidak dimodelkan | keduanya | Baris luka dihapus dari kartu |
| 8 | Data bangunan hanya Kalimantan Tengah; sekolah dan faskes hanya 9 provinsi | K2 Bab 6 | "Rumah (perkiraan dari penduduk / 3,9)"; sekolah dan faskes "tidak tercakup" di provinsi lain |
| 9 | PDNA dan R3P final Lombok dan Sulteng tidak ditemukan; seri CKAN kerusakan dan kerugian R3P belum ditarik. R3P Cianjur terbuka (§8, E5) | K2 Bab 6, 12 | Cianjur memakai R3P (Resmi, catatan status contoh dokumen) berdampingan dengan DIBI; Lombok total kebutuhan R3P dari Kemenko PMK; Sulteng angka sementara resmi; seri CKAN ditarik |
| 10 | Kerugian ekonomi langsung untuk Renas 2.a tidak tersedia | K2 Bab 12 | Ditulis sebagai permintaan data; profil kerugian batas bawah berlabel |
| 11 | DALY tidak dapat dihitung | keduanya | "Tidak dihitung"; YLL di lampiran, pengungsi-hari di kartu |
| 12 | IRBI 2025 skala patah; indeks provinsi 2025 tanpa metode resmi | keduanya | Tren 2015–2024; potret 2025 terpisah; kelas provinsi resmi 2023 |
| 13 | Kapasitas daerah tiga angka (62% baseline RPJMN 2023 / 67% target 2025 di Renstra / 38% KRB) | K2 Bab 5 | Ditampilkan berdampingan; KD-3 |
| 14 | DIBI berpatahan 2024 dan kategori; tidak mencatat COVID-19, Plumpang, Balongan, Morowali; baris konflik diragukan; TPA tanpa jenis | keduanya | Penanda patahan; seri konflik tidak dipakai; ketiadaan baris jadi rekomendasi data Pusdatinkom |
| 15 | Rekaman Kota Bekasi Januari 2020 (84,5% pengungsi Jabodetabek) tidak terbukti | keduanya | Uji kepekaan pemilihan analog dengan dan tanpa rekaman itu; DKI saja untuk pembanding Renstra |
| 16 | Air tanah per kab dan zona konservasi CAT tidak ada; CAT rusak hanya artikel instansi tanpa dokumen penetapan (§8, E7) | K1 Bab 4 | Celah dan permintaan data ke Kementerian ESDM (Badan Geologi); CAT rusak berlabel pernyataan instansi resmi dan tidak dipakai sebagai syarat daftar perhatian |
| 17 | Penurunan muka tanah per kota dari literatur; GNSS hanya satu titik per kota (§8, E17) | K1 Bab 4, 6 | Baris terverifikasi dan stasiun GNSS berlabel "satu titik GNSS"; "kota tanpa titik = belum diukur"; deret waktu Zenodo ditarik bila diperlukan |
| 18 | Air minum per kab hanya Jawa Tengah; tabel leding 2023 tidak sejajar | K1 Bab 4 | Tingkat provinsi berlabel; per kab lain permintaan data ke BPS provinsi |
| 19 | Bendungan bukan inventaris lengkap; sedimentasi hanya BBWS Pemali-Juana; Jatiluhur dan Cirata bertentangan | K1 Bab 4 | Titik berpita; baris sekunder terpisah; permintaan inventaris ke BBWS dan PJT |
| 20 | Irigasi baseline 2015; kondisi jaringan per provinsi tidak ada | K1 Bab 4 | Baseline 2015 berlabel; permintaan e-PAKSI |
| 21 | Neraca dan IPA per WS tersedia di RPSDA 10 WS (§8, E6); Pola/RPSDA Pemali-Comal dan batas WS vektor tidak ada; kab ke WS resmi hanya kategori C | K1 Bab 4, 8 | Neraca RPSDA dikutip tanpa ditandingi; rekomendasi per BBWS dan per WS merujuk kegiatan RPSDA; Pemali-Comal dibatasi instrumen BNPB/BPBD |
| 22 | Debit sungai Jawa (0 titik GloFAS) | K1 Bab 4, 6 | Celah dan permintaan data |
| 23 | Luas genangan rob teramati tidak ada; model rob platform tidak layak | keduanya | Luas rawan rob hanya WS Jratunseluna 22.897 ha (simulasi RPSDA 2024, Estimasi model); WS lain "tidak dikuantifikasi"; kab berkejadian rob DIBI dan titik peringatan BMKG |
| 24 | Kekeringan: distribusi air, puso per kab, status darurat SK, kasus penyakit tidak ada; mesin neraca dan padi belum diuji balik | K1 Bab 5, 8; K2 Bab 7 | Indikator resmi saja; sasaran pembentukan baseline kemarau bertenggat 2027 di Tabel 8.1 (V07); keluaran mesin di Lampiran I K1; permintaan data masuk 100 hari |
| 25 | Penduduk BPS per kab belum ditarik (proyeksi kab/kota 2020–2035 terbit per BPS provinsi, §8 E10); WorldPop meleset di beberapa kota | keduanya | Penyebut resmi penduduk KRB InaRISK; porsi Jawa dari BRS SP2020; WorldPop hanya sebaran dalam kab |
| 26 | Beban kesehatan asap karhutla. **Tertutup (§8, E15)** | K2 Bab 7 | Koplitz dkk. (2016): 91.600 kematian berlebih Indonesia 2015 (95%: 24.000–159.200), Terverifikasi, di Kartu 7.5 |
| 27 | Rezim keselamatan sektoral kebakaran industri. **Tertutup (§8, E12)** | K2 Bab 8 | C14 ditulis dari mandat tertulis Menteri ESDM, Menteri Perindustrian, Menaker; BNPB tidak disebut di rezim sektoral |
| 28 | Skenario pandemi resmi tidak ada; kerugian rupiah nonalam dan sosial tidak ada | K2 Bab 8, 9 | Analog berangka; sel kerugian "–" beralasan |
| 29 | Teks Perpres 87/2020, 75/2021, 12/2025 (lampiran), PP 21/2008, PP 22/2008. **Tertutup (§8, E11)** | keduanya | Dikutip dari JDIH BPK; status RIPB dan RPJMN dan arsitektur pembiayaan ditulis berpasal |
| 30 | Teks Kepka BNPB 308/2024 dan 173 tidak dibuka | K2 Bab 10 | Dua versi klaster berdampingan berlabel sumber |
| 31 | Isi temuan BPK belum dibaca; rasio anggaran PB terhadap APBD tidak ditemukan | keduanya | Tidak diklaim |
| 32 | Perpres status dan tingkatan bencana belum terbit (JDIH BPK); Dewan SDA Nasional dan TKPSDA WS berlaku (§8, E13, E14); status PP 43/2008 dan penerbit izin air tanah belum pasti | keduanya | Kesenjangan Perpres ditulis berpasal; forum air berstatus "Sudah ada"; JDIH Setneg di log QA; PP 43/2008 dan izin air tanah ditulis "belum dapat dipastikan" |
| 33 | Baseline cakupan peringatan dini (Renas 1.c) per provinsi dan kab tidak ada | keduanya | Permintaan data ke Direktorat Peringatan Dini; sasaran nasional saja sampai tersedia |
| 34 | Kalender tanam (Katam) dan produksi padi BPS per provinsi belum ditarik | K1 Bab 5, 8 | Ditarik; bila gagal, permintaan data |
| 35 | Awal musim per ZOM BMKG belum ditumpangkan ke kab/kota; tabel per ZOM dan rilis 2 Oktober 2026 tidak ditemukan (§8, E9) | keduanya | Tingkat provinsi dan pulau dari siaran 22 September 2026; subtotal ZOM dikutip per kategori, tidak dijumlah |
| 36 | Nomenklatur K/L di kompendium belum terpetakan ke `lembaga.csv` | keduanya | Naskah memakai `lembaga.csv`; pemetaan di paket (§10) |

---

## 8. Dokumen primer: status pembukaan (23 Oktober 2026)

Hasil pembukaan dan URL sumber ada di `riset/E-dokumen-primer.md` (E1–E19; pustaka `riset/E-pustaka.json`). Status:
**Terbuka** (teks dibaca), **Terbuka sebagian** (sebagian dokumen atau pengganti resmi), **Tidak ditemukan** (isinya
tidak ditulis). Kolom terakhir menyatakan aturan yang berlaku sesudah pembukaan; aturan "bila tidak terbuka" lama hanya
berlaku untuk bagian yang tetap tidak ditemukan.

| Dokumen | Status | Fakta yang mengubah kerangka | Aturan yang berlaku |
| --- | --- | --- | --- |
| Peta Sumber dan Bahaya Gempa Indonesia 2024 (PuSGeN) | Terbuka (E1) | Mmaks megathrust Jawa 9,1 gabungan (600 tahun), 8,9 barat dan timur (400 tahun); Mentawai dan Enggano 8,9; Sumba 8,5 tanpa periode ulang; sesar darat Lembang 6,6, Cimandiri 6,3–6,8, Opak 6,9; 14 segmen dan 401 sesar aktif; tidak memuat skenario korban | Mmaks Resmi di badan teks K2 Bab 6; kartu kepekaan magnitudo diganti kartu Mmaks resmi; peluang lima tahun 0,83% dan 1,24% (turunan penyusun) di atas 0,2%; celah 2 dan 4 tertutup; angka 295 sesar di Renstra ke lampiran Penyelarasan |
| Widiyantoro dkk. (2020), *Scientific Reports* 10:15274 | Terbuka (E2) | Tinggi tsunami sekitar 20 m (selatan Jawa Barat), sekitar 12 m (Jawa Timur), rata-rata maksimum 4,5 m | Tinggi tsunami boleh dikutip berlabel Terverifikasi; korban tsunami tetap tidak dikuantifikasi |
| Cabinet Office Jepang, perkiraan kerusakan Nankai (Maret 2025) | Terbuka (E3) | ×0,437 terkonfirmasi; ×0,662 tidak ada di tabel primer; pengganti ×0,600 (survei 2023); rentang antarkasus 0,077–0,437 | Tuas ×1 / ×0,600 / ×0,437, Asumsi kebijakan, rujukan primer menggantikan label "Nankai sekunder" (prinsip 10) |
| Rencana Induk RR Aceh–Nias | Terbuka sebagian (E4) | Batang tubuh Perpres 30/2005 terbuka; Buku Utama tidak ditemukan; buku resmi BRR NAD–Nias (2009) memuat Aceh dan Nias 127.720 meninggal dan 93.285 hilang, Nias 2005 966 meninggal | Bawaan: buku BRR dipakai berlabel Resmi (BRR lembaga pemerintah pelaksana RR), dicatat untuk pemilik dan dapat dibalik; bila dibalik, Aceh 2004 dan Nias 2005 keluar dari badan teks |
| Dokumen R3P Lombok, Sulteng, Cianjur | Terbuka sebagian (E5) | R3P Cianjur terbuka (kerusakan dan kerugian Rp4,55 T, rumah rusak 114.315, 334 meninggal per data BPBD 7 Desember 2022, kebutuhan Rp5,05 T); R3P Lombok dan Sulteng tidak ditemukan; total kebutuhan R3P Lombok Rp11,44 T dari Kemenko PMK | Cianjur Resmi dengan catatan status contoh dokumen dan rekonsiliasi dengan DIBI; Lombok total kebutuhan saja; Sulteng angka sementara resmi |
| Kepmen PU tentang Pola dan RPSDA WS di Jawa | Terbuka untuk 10 WS (E6); Pemali-Comal tidak ditemukan | Neraca per WS, defisit air baku (Jratunseluna 41,60 m³/detik), luas rawan rob simulasi (Jratunseluna 22.897 ha); RPSDA menyebut BPBD/BNPB sebagai pelaksana kegiatan daya rusak air | Rekomendasi per WS merujuk kegiatan RPSDA tanpa menandingi (prinsip 8); Pemali-Comal dibatasi instrumen BNPB/BPBD; celah 21 dan 23 sebagian tertutup |
| Rilis Badan Geologi tentang status CAT | Terbuka sebagian (E7) | Artikel situs resmi 22 Januari 2024 menyebut CAT rusak; tidak ada dokumen penetapan status, kategori, atau kriteria | Label pernyataan instansi resmi; tidak dipakai sebagai syarat daftar perhatian |
| Daftar PSN bendungan | Terbuka (E8) | 48 bendungan dan 9 proyek irigasi PSN (Permenko Perekonomian 16/2025, berlaku setelah Permenko 4/2026); 19 bendungan di Jawa; Giant Sea Wall Pantai Utara Jawa PSN baru di RPJMN | PSN disebut per bendungan; atribut PSN di peta dan tabel bendungan |
| Rilis BMKG 22 September dan 2 Oktober 2026; HTH dan prakiraan per ZOM | Terbuka sebagian (E9) | Siaran 22 September terbuka (ENSO JAS +2,63; mundur di 529 ZOM; Jawa puncak sebagian besar Februari 2027; HTH terpanjang 131 hari di Bantul); rilis 2 Oktober, tabel per ZOM, dan HTH per pos tidak ditemukan | Angka siaran 22 September Resmi; atribusi "BMKG 2 Oktober 2026" dihapus; prakiraan tingkat provinsi dan pulau (celah 35) |
| BPS SP2020 dan proyeksi penduduk kab/kota | Terbuka sebagian (E10) | Jawa 151,59 juta (56,10%) di sekitar 7% luas; proyeksi kab/kota terbit per BPS provinsi, tabel belum dibuka | Porsi Jawa dari BRS (Resmi); penyebut kab tetap KRB InaRISK (celah 25) |
| Perpres 87/2020; Lampiran Perpres 12/2025; Perpres 75/2021; PP 21/2008; PP 22/2008 | Terbuka (E11) | RIPB ditinjau lima tahunan atau sewaktu-waktu, monev lewat Menko PMK; enam indikator BNPB RPJMN (kapasitas baseline 62% pada 2023, peringatan dini 6,00 ke 6,32); Renas 2.a = PN 8 indikator 4; Dana Bersama lewat permohonan tertulis dan rekomendasi Kepala BNPB; dana kontinjensi bencana APBN; rencana PB ditinjau tiap dua tahun; penentuan status termasuk tingkatan | Prinsip 1, 13, 15 dan KD-2, KD-3 ditulis dari teks primer; celah 29 tertutup |
| UU 1/1970; UU 3/2014; PP 11/1979; Permen ESDM 32/2021 | Terbuka (E12) | Mandat tertulis keselamatan: Menteri ESDM (Dirjen Migas, Kepala Inspeksi), Menteri Perindustrian, Menaker; BNPB tidak disebut | C14 ditulis; Kemenperin dan Kemnaker masuk matriks mandat tertulis; celah 27 tertutup; teks konsolidasi UU 3/2014 belum diperiksa |
| Perpres Dewan SDA Nasional dan dasar wadah koordinasi WS | Terbuka (E13) | Perpres 53/2022 dan Keppres 18/2024 berlaku, Kepala BNPB anggota Dewan; TKPSDA WS diatur Permen PU 2/2024 tanpa menyebut BNPB atau BPBD | Forum berstatus "Sudah ada"; usul BNPB kontributor bertumpu pada keanggotaan; pemetaan jabatan ketua ke kabinet 2024–2029 belum dapat dipastikan |
| Penelusuran Perpres penetapan status dan tingkatan bencana | Ditelusuri, tidak ada (E14) | Perpres amanat UU 24/2007 Pasal 7 ayat (3) belum terbit (JDIH BPK; tulisan hukum BPK 3 Februari 2025); JDIH Setneg tidak dapat dicari | Ditulis sebagai kesenjangan berpasal di K2 Bab 10 dan 12; verifikasi JDIH Setneg di log QA |
| Koplitz dkk. (2016), *Environmental Research Letters* 11:094023 | Terbuka (E15) | 91.600 kematian berlebih di Indonesia akibat asap 2015 (95%: 24.000–159.200) | Masuk Kartu 7.5 berlabel Terverifikasi; celah 26 tertutup |
| Surono dkk. (2012), *J. Volcanol. Geotherm. Res.* 241–242 | Terbuka sebagian (E16) | Abstrak dan pendahuluan: hampir 400 meninggal, sekitar sepertiga juta mengungsi, 10.000–20.000 jiwa terselamatkan (perkiraan penulis) | Studi kasus 4.1 Merapi 2010 berlabel Terverifikasi, hanya isi yang dibaca; InaTEWS Palu 2018 menjadi kotak pembanding |
| Data GNSS Susilo dkk. (2023), *Scientific Data* | Terbuka (E17) | CPKL Pekalongan −107,0 mm/tahun (2010–2021); CSEM Semarang −0,8 mm/tahun; deret waktu di Zenodo belum ditarik | Baris terverifikasi GNSS berlabel "satu titik GNSS"; celah 17 sebagian tertutup |
| Data BPBD Jawa Timur (815 desa, sekitar 410 ribu KK); data Kemenko PMK tentang SPM dan KRB | Terbuka sebagian (E18) | Angka BPBD Jatim hanya di media untuk musim 2025, sumber primer tidak ditemukan; siaran Kemenko PMK 12 September 2025 terbuka (63 SPM, 87 KRB, 79 IKD 2024) | Angka Jatim tidak dikutip; angka Kemendagri dalam siaran Kemenko PMK berlabel Resmi, tanggal data September 2025 |
| Laporan Bappenas tentang tanggul Pekalongan 2019 | Tidak ditemukan (E19) | Hanya pernyataan pejabat di media (2024) dan studi akademik | Pelajaran Empat Sungai Korea tanpa pasangan domestik berdokumen |

**Yang tetap tidak ditemukan:** Buku Utama Rencana Induk Aceh–Nias; R3P Lombok dan Sulteng; Pola/RPSDA Pemali-Comal;
dokumen penetapan status CAT; rilis BMKG 2 Oktober 2026 dan tabel per ZOM; tabel proyeksi penduduk kab/kota BPS
provinsi; dokumen BPBD Jatim untuk 815 desa; laporan Bappenas tanggul Pekalongan 2019; verifikasi JDIH Setneg untuk
Perpres status dan tingkatan bencana; teks konsolidasi UU 3/2014 pascaperubahan Cipta Kerja. Butir-butir ini tetap
mengikuti aturan "bila tidak terbuka" di kolom terakhir dan di §7.

---

## 9. Keluaran (8 berkas)

Per kajian: DOCX lengkap, PDF dari DOCX (halaman sama dengan DOCX), PPTX deck, PDF dari PPTX (slide sama dengan PPTX)
(P13). Deck mengikuti gaya rumah BNPB di Buku Pegangan bab Selera presentasi, 13 slide isi ditambah lampiran (P14).
Tidak ada PDF ringkas.

---

## 10. Penyesuaian yang wajib dibawa ke PEDOMAN-DESAIN dan paket data

Berkas ini tidak menyunting berkas lain; pemiliknya yang menyunting.

- **PEDOMAN §A2:** templat tesis kajian air (kelas tinggi kekeringan dan banjir sekaligus) tidak ada di data; diganti
  tesis §4. Templat mitigasi diganti tesis §5.
- **PEDOMAN §A3.2, §A3.3:** alokasi halaman dan komponen wajib per bab mengikuti §4 dan §5; urutan subbab bab per jenis
  (6–9) tanpa strategi dan lembaga (prinsip 17).
- **PEDOMAN §A3.4:** urutan bagian depan mengikuti Buku Pegangan L6 dan RE dua lapis dengan Pesan Kunci 6–8 temuan
  (L14) (§3); Kata Pengantar draf berpenanda periksa pemilik di DOCX dan di log QA (T7).
- **PEDOMAN §A6:** baris "Simulasi pandemi … kartu kualitatif" diganti kartu analog berangka tanpa perkalian; baris
  kebakaran gedung dan permukiman ditambah; baris neraca per WS dan peta zona air tanah tetap.
- **PEDOMAN §B5.11:** tabel kerusakan diganti lima aspek Perban 2/2023 dan baris kebutuhan respons; DALY dan luka
  dihapus; varian (c) menjadi kartu analog berangka; aturan lantai dengan periode acuan per kelompok; satu kartu per
  jenis `tema.json` dan baris kepekaan wajib; varian ringkas untuk kartu per jenis; kartu musim berlabel agregat
  operasional.
- **PEDOMAN §B5.26, §B5.25:** Pesan Kunci memuat keputusan yang diminta.
- **PEDOMAN §B5.27, §B5.28:** skala dampak 1–5 (Bab 3) dan kunci dampak kisi prioritas.
- **PEDOMAN §B7.4, §B7.5:** alur slide mengikuti tabel deck §4 dan §5 (judul temuan satu klaim, paling banyak dua baris
  pada 19 pt; slide 1 4–6 temuan).
- **`bangun/pptx/periksa.py` (pemilik gerbang, `penulis-gerbang`):** pemeriksaan panjang judul terukur, yaitu judul
  setelah slot `{{angka:…}}` terisi diukur dengan metrik Roboto Bold pada lebar kotak judul dan ditolak bila lebih dari
  dua baris pada 19 pt (T11); disertai uji yang membuktikan judul tiga baris ditolak.
- **`qa/periksa.py`:** pemeriksaan bahwa angka keluaran R = 8 (faktor peringatan dini) tidak muncul di Pesan Kunci,
  pita keputusan, tesis, atau judul temuan (prinsip 10), dan bahwa Pesan Kunci DOCX memuat 6–8 temuan (L14).
- **`tema.json`:** kosakata skala dampak 1–5; kosakata peran BNPB; label keyakinan lima.
- **`data/angka.json` dan `angka-kunci.json`:** kunci `tesis` kedua kajian sesuai §4 dan §5 (Kajian 2 memakai alam
  2025: 1.735 meninggal, 221 hilang; kunci terpisah untuk versi semua klasifikasi 2.030 dan 246 berlabel patahan 2024),
  kunci lantai skenario per jenis, kunci dua lintasan peringatan dini (menggantikan `cakupan_awal=renstra_2025`;
  baseline RPJMN 6,00), kunci kapasitas tiga angka (62/67/38), label `irbi.nasional.2015` menjadi Asumsi kebijakan;
  turunan.
- **Paket `program-terbukti`:** kolom pemimpin (PJ Renas), peran_bnpb, kode lembaga (`lembaga.csv`); P17 diubah sesuai
  M05; program luar negeri tanpa status Indonesia dengan kolom padanan; gerbang penolakan baris yang unit BNPB-nya
  berbeda peran dengan PJ Renas tanpa catatan.
- **Paket `skenario-hidromet`:** kartu lantai (meninggal+hilang tercatat terbesar per wilayah), kartu musim setelah El
  Niño kuat, uji kepekaan rekaman Bekasi, gerbang "skenario tinggi ≥ tercatat terbesar dalam periode acuan"; turunan
  baru `lantai_jenis.csv`: kejadian tunggal dan tahun tercatat terburuk (meninggal+hilang) per jenis hidrometeorologi
  (banjir, banjir bandang sebagai baris sendiri, longsor, cuaca ekstrem, gelombang dan abrasi, rob, kekeringan, karhutla)
  untuk Jawa dan nasional dari DIBI 2008–2025, dengan penanda patahan kategori 2018 dan 2024; baris kepekaan kemarau
  tahun kedua 2027.
- **Paket `skenario-geologi`:** `kepekaan.csv` mengganti ×0,662 dengan ×0,600 (Cabinet Office 2025) dan mencatat
  rentang antarkasus 0,077–0,437; skenario Mmaks resmi PuSGeN 2024 (Jawa 9,1 gabungan, 8,9 per segmen; Mentawai dan
  Enggano 8,9) menggantikan label "kepekaan magnitudo"; baris lantai Pangandaran 2006 dan Mentawai 2010; periode ulang
  resmi sebagai dasar kemungkinan.
- **Paket `nonalam-sosial`:** baris `mei1998` dan `kerusuhan2025` diberi tanda di luar lingkup dan tidak dipakai di
  kartu; metrik perkosaan tidak dipakai; baris kepekaan per jenis (prinsip 10): COVID-19 resmi lawan kematian berlebih,
  Plumpang 17 lawan 29, Maluku 5.000 lawan 10.000, durasi status TPA.
- **Paket `lembaga`:** C14 ditulis dari mandat tertulis (PP 11/1979, Permen ESDM 32/2021, UU 3/2014 Pasal 117, UU 1/1970
  Pasal 5); Kemenperin dan Kemnaker masuk `peran.csv` berjenis tertulis; Kemenag, OJK, BPDLH bila mandat tertulisnya ada;
  baris Dewan SDA Nasional (Perpres 53/2022, Keppres 18/2024) dan TKPSDA WS (Permen PU 2/2024); baris rekonsiliasi
  pascakonflik (UU 24/2007 Pasal 58 ayat (1) huruf f; UU 7/2012 Pasal 37, 49, 55); teks Perpres 53/2022, Permen PU
  2/2024, PP 21/2008, PP 22/2008, Perpres 75/2021, Perpres 87/2020 masuk `lembaga/mentah/teks`.
- **Paket `air-jawa`:** label CAT rusak menjadi pernyataan instansi resmi (artikel Badan Geologi 22 Januari 2024); baris
  GNSS Susilo dkk. (CPKL, CSEM) dengan penanda satu titik; atribut PSN per bendungan (Permenko 16/2025); neraca dan
  defisit air baku per WS dari RPSDA 10 WS; luas rawan rob Jratunseluna berlabel Estimasi model.
- **Lampiran Penyelarasan dokumen BNPB:** angka sesar aktif Renstra (295) lawan PuSGeN 2017 (273) dan 2024 (401);
  baseline kapasitas Renstra (67%) lawan RPJMN (62% pada 2023).
- **Turunan baru:** DIBI hidrometeorologi per kab per tahun nasional, DIBI gempa per kab, kalender bahaya bulanan per
  pulau, daftar perhatian kedua kajian, profil kerugian tahunan batas bawah, lantai per jenis (`lantai_jenis.csv`),
  rekap meninggal dan hilang per klasifikasi per tahun (alam lawan semua klasifikasi) untuk kunci `tesis`.
