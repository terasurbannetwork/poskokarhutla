# PEDOMAN-DESAIN: bagian yang berlaku untuk deck

> Salinan kata demi kata dari `data/kajian-bnpb/PEDOMAN-DESAIN.md` (bagian 0.1, 0.2, A4, A5, A6, B1, B2, B5.4, B5.6, B5.7, B5.9 sampai B5.16, B5.25 sampai B5.28, B7, C, D; bagian khusus DOCX seperti A1 sampai A3, B3, B4, B5.1 sampai B5.3, B5.17 sampai B5.24, B5.29 sampai B5.31, B6, E tidak disalin), diambil 26 Okt 2026 untuk skill deck-bnpb. Jalur repo di dalam teks (mis. `data/kajian-bnpb/...`, `bangun/pptx/...`, `qa/periksa.py`) dipetakan ke skill di `references/peta-jalur.md`. Aturan tidak diringkas; bila ada yang bertentangan, urutan otoritas di `keputusan-pemilik.md` berlaku.

## Daftar isi

- 0. Status, otoritas, keputusan
  - 0.1 Urutan otoritas
  - 0.2 Keputusan pemilik
  - A4. Alur argumen
  - A5. Satu sumber data, satu set gambar
  - A6. Yang sengaja tidak dibuat
- B. Design system
  - B1. Warna
    - B1.1 Token inti dan aksen
    - B1.2 Tint tema (latar panel, pita kepala, kartu)
    - B1.3 Kategori bencana: enam keluarga warna
    - B1.4 Skala kelas dan koroplet
    - B1.5 Arah perubahan
    - B1.6 Warna terlarang
    - B1.7 Kode kajian air
    - B1.8 Satu hex satu arti per halaman
  - B2. Tipografi (A4, Roboto saja, termasuk font tema DOCX)
    - B5.4 Kartu angka
    - B5.6 Panel berpita
    - B5.7 Tabel
    - B5.9 Peta
    - B5.10 Grafik
    - B5.11 Kartu skenario terburuk (satu halaman)
    - B5.12 Garis waktu prabencana, tanggap darurat, pascabencana
    - B5.13 Matriks rekomendasi
    - B5.14 Ikon
    - B5.15 Foto Commons beratribusi
    - B5.16 Catatan kaki
    - B5.25 Kisi kesimpulan dan pita keputusan
    - B5.26 Halaman Pesan Kunci
    - B5.27 Matriks risiko kemungkinan × dampak
    - B5.28 Kisi prioritas rekomendasi
  - B7. Deck kajian
    - B7.1 Struktur
    - B7.2 Anatomi slide
    - B7.3 Aturan bersama kedua alur
    - B7.4 Alur deck kajian air
    - B7.5 Alur deck kajian mitigasi
- C. Bahasa, angka, integritas data
  - C1. Suara dan register
  - C2. Judul dan kapitalisasi
  - C3. Istilah baku
  - C4. Angka dan satuan
  - C5. Tanggal dan waktu
  - C6. Integritas sumber
    - C6.1 Hierarki bukti
    - C6.2 Label tingkat keyakinan
    - C6.3 Aturan model dan simulasi
    - C6.4 Pola bab/lampiran metode
    - C6.5 Sumber dan lisensi
  - C7. Konsistensi angka
  - C8. Larangan klaim
  - C9. Alur naskah dan aturan penulis
- D. Gerbang QA sebelum kirim
  - D1. Gerbang mekanis
  - D2. Gerbang visual (manusia/agent membaca)
  - D3. Proses kerja
  - D4. QA lima lapis dan pemeriksaan naskah

## Pedoman desain kajian BNPB (pembuka)

Pedoman induk (grand design dan design system) untuk dua kajian yang diterbitkan
Badan Nasional Penanggulangan Bencana:

1. **Grand Design Ketahanan Air Pulau Jawa 2026–2030** (selanjutnya "kajian air").
2. **Grand Design Mitigasi Bencana Indonesia 2026–2030** (selanjutnya "kajian mitigasi").

Versi 1.3, 23 Oktober 2026. Berkas ini satu-satunya sumber aturan tampilan, bahasa,
angka, dan QA untuk kedua kajian. Isi bab ada di `KERANGKA.md`; ukuran terukur tata
letak acuan ada di `SPESIFIKASI-GAYA.md`; bahan isi ada di `riset/A`–`D`. Pedoman ini
mengikat atas `SPESIFIKASI-GAYA.md` dan `KERANGKA.md` untuk tampilan dan proses;
`KERANGKA.md` mengikat untuk isi bab. Terhadap Buku Pegangan Pantau Bencana, pedoman ini
hanya boleh berbeda bila perbedaannya dicatat di §0.3 berikut alasannya (§0.1). Jangan
membuat salinan aturan ketiga.

---


## 0. Status, otoritas, keputusan

### 0.1 Urutan otoritas

1. Kata pemilik di percakapan (dicatat di §0.3 Riwayat).
2. Buku Pegangan Pantau Bencana (`docs/buku-pegangan/pantau-bencana.md`): kanon proyek; dan
   `KEPUTUSAN.md`: keputusan pemilik P1–P17 serta keputusan bawaan orkestrator T1–T13 yang
   berlaku sampai pemilik membaliknya. Bila pedoman ini bertentangan dengan `KEPUTUSAN.md`,
   `KEPUTUSAN.md` yang berlaku.
3. Pedoman ini. Pedoman boleh berbeda dari Buku Pegangan hanya bila perbedaannya dicatat
   di §0.3 berikut alasannya; perbedaan yang tidak dicatat batal dan Buku Pegangan yang
   berlaku.
4. `SPESIFIKASI-GAYA.md`: ukuran terukur tata letak JAPFA REPORT sebagai acuan. Kolom
   "Kajian BNPB" di berkas itu digantikan §A–§B pedoman ini.
5. Buku pegangan proyek lain (Utama, MBG, Gemah Ripah, Betutu Sambe, Worth It) hanya
   sebagai prinsip; palet, font, dan istilah proyek lain tidak dibawa.

Bila dua aturan bertabrakan, yang dibandingkan adalah tanggal vonis pemilik (kutipan
bertanggal di §0.3 atau di Riwayat Buku Pegangan), bukan tanggal berkas disunting. Vonis
yang lebih baru menang. Aturan tanpa vonis pemilik tunduk pada urutan di atas. Contoh:
Rencana Multi-Bencana (vonis 15–16 Okt) membolehkan titik tengah sebagai pemisah; vonis
pemilik 20 Okt (dicatat di Buku Pegangan) melarangnya. Yang berlaku: dilarang.

### 0.2 Keputusan pemilik

**Diputus** (tidak dibuka lagi tanpa pemilik):

| No | Keputusan | Tanggal |
| --- | --- | --- |
| K1 | Penerbit BNPB saja; tanpa halaman tim penyusun, tanpa ucapan terima kasih bernama | 23 Okt 2026 |
| K2 | Keluaran utama DOCX A4 tegak, huruf Roboto saja | 23 Okt 2026 |
| K3 | DOCX paling banyak 150 halaman di luar lampiran (bagian depan berangka romawi tidak dihitung) | 23 Okt 2026 |
| K4 | PDF ringkas paling banyak 10 halaman per kajian. **Dicabut** 23 Okt 2026 (tersirat dari `KEPUTUSAN.md` P13: delapan berkas tanpa PDF ringkas; K17): PDF mengikuti dokumen asalnya | 23 Okt 2026 |
| K5 | Foto dari Wikimedia Commons berlisensi bebas beratribusi (CC BY, CC BY-SA, CC0, PD; tanpa NC/ND); ilustrasi buatan AI tidak dipakai | 23 Okt 2026 |
| K6 | Kajian air sampai kab/kota, lima komponen: air baku, irigasi, waduk, air tanah, penurunan muka tanah. Proyek boleh disebut, tanpa angka biaya | 23 Okt 2026 |
| K7 | Skenario terburuk dikelompokkan per jenis bencana, dengan korban jiwa, luas terdampak, kerugian materiil dan imateriil dari simulasi platform | 23 Okt 2026 |
| K8 | IRBI BNPB sebagai indeks utama; indeks platform sebagai pendukung | 23 Okt 2026 |
| K9 | Bencana nonalam: pandemi, kebakaran TPA, kebakaran industri. Kerusuhan sosial dibahas di bab bencana sosial (taksonomi UU 24/2007) | 23 Okt 2026 |
| K10 | Strategi dibagi pra bencana, saat bencana, pascabencana (kata pemilik; ejaan dan nama fase di keluaran mengikuti T10) | 23 Okt 2026 |
| K11 | Rekomendasi untuk internal BNPB dan lintas K/L, dengan lembaga teknis dan tugasnya | 23 Okt 2026 |
| K12 | Peta disimulasikan di web lalu dirender ke dokumen | 23 Okt 2026 |
| K13 | Bahasa formal ilmiah, tanpa kalimat bergaya dan tanpa yang dibuat-buat | 23 Okt 2026 |
| K14 | Kedua kajian tidak harus meniru JAPFA REPORT, tetapi wajib punya grand design dan design system | 23 Okt 2026 |
| K15 | Pola laporan kelas dunia yang divonis cocok di `riset/desain-benchmark/SINTESIS.md` diterapkan di §A–§B dan dicatat di Buku Pegangan bab Selera laporan (DOCX/PDF); aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16) | 23 Okt 2026 |
| K16 | Pola deck konsultan kelas dunia (McKinsey, BCG, Big Four) yang divonis cocok di `riset/desain-benchmark/deck/SINTESIS-DECK.md` diterapkan di §B7 dan dicatat di Buku Pegangan bab Selera presentasi (subbab Pola deck konsultan kelas dunia, S1–S33; S34–S39 berasal dari penilaian skill `alfatehan-pptx-rules` di `TAMBAHAN-PPTX-RULES.md`, bukan P16); aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16) | 23 Okt 2026 |
| K17 | Keluaran 8 berkas: per kajian DOCX dan PDF-nya, PPTX dan PDF-nya; jumlah halaman PDF sama dengan dokumen asal (`KEPUTUSAN.md` P13). Menggantikan K4 | 23 Okt 2026 |

**Diputus sebagai keputusan bawaan** (`KEPUTUSAN.md`, 23 Okt 2026; pemilik meminta tidak ada
pertanyaan lagi, jadi bawaan ini berlaku sampai pemilik membaliknya):

| No | Keputusan | Akibat di pedoman |
| --- | --- | --- |
| T1 | Judul bab KAPITAL ("BAB 1 PENDAHULUAN"); subbab ke bawah huruf judul ("1.1 Latar Belakang") | §B2, §C2; D-11 mengecualikan Heading 1 dan judul bagian depan |
| T2 | Oranye naik, biru turun, juga di peta web kajian | §B1.5, §B6 |
| T3 | Peta web di situs Pantau Bencana, `public/kajian/`, dibangun lokal; terbit hanya bila pemilik mendorong | §B6 |
| T4 | Kaki halaman: "Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120" dan "Call Center 117, www.bnpb.go.id" | §B4 (catatan soal pil batas data PDF ringkas: v1.2, dicabut K17) |
| T5 | Kajian air batas atas ±110 hlm isi; kajian mitigasi ±150 | §A3.2, §A3.3, D-12 |
| T6 | Palet tambal enam keluarga (ΔE CIEDE2000 terkecil 17,6) | §B1.3 |
| T7 | Kata Pengantar ditulis sebagai draf untuk ditandatangani Kepala BNPB, ditandai untuk diperiksa pemilik | §A3.4, §D3; Kata Pengantar satu-satunya bagian yang ditandai untuk pemilik, karena bagian lain diserahkan tanpa putaran tinjauan pemilik (K18) |
| T8 | Kelas IRBI memakai skala oranye rumah BNPB (ramp api, kelas 1, 3, 5) dengan nama kelas resmi Rendah, Sedang, Tinggi dan legenda; merah hanya bahaya | §B1.4; ramp keluarga hanya untuk indeks platform |
| T9 | Daftar Pustaka tidak dihitung dalam batas halaman, sama seperti lampiran | §A3.2, §A3.3, §B5.17, D-12 |
| T10 | "prabencana", "tanggap darurat", "pascabencana" sesuai UU 24/2007; subjudul kajian mitigasi "Strategi Prabencana, Tanggap Darurat, dan Pascabencana" | §A4, §B5.12, §B5.14, §B5.22, §C3 |
| T11 | Judul slide deck kajian: slide temuan memakai kalimat temuan berangka paling banyak 2 baris (pola lampiran Presiden d9); sampul, pembatas, dan slide rekomendasi memakai judul deskriptif | §B7.1; Buku Pegangan S7. Menyimpang dari vonis pemilik "Judul deskriptif menang atas judul data", yang tidak dibatasi ke deck tertentu; dicatat di Buku Pegangan Keputusan pemilik, Belum diputus, dan berlaku sampai pemilik memutus. Menjawab pertanyaan T15 pedoman v1.2 |
| T12 | Pelacak bagian di deck: kode bagian berwarna sorot di depan judul ("A1.", "B2."); pola kode lampiran d9 dipakai ulang untuk bagian, ditambah nomor bagian berwarna sorot Deloitte-NEMA; tanpa unsur baru di pojok | §B7.1; Buku Pegangan S10; kode lampiran deck jadi "L1." (U5). Huruf bagian A–E tidak sama artinya dengan huruf pertanyaan pimpinan A–C di "Temuan A.1" DOCX, jadi kode DOCX selalu ditulis lengkap sebagai chip di kartu Pesan Kunci (§B7.4); tercatat di Buku Pegangan Belum diputus |
| T13 | Warna pembatas bab di deck: GELAP 051C2C, sama dengan pembatas Lampiran dan penutup | §B7.1; deck ±12 slide isi tidak memakai pembatas bab (S10), jadi T13 berlaku bila pembatas dipakai |
| K18 | Tanpa pertanyaan lagi ke pemilik; pertanyaan terbuka diputus sebagai bawaan (`KEPUTUSAN.md` T1–T13). `KEPUTUSAN.md` hanya mencatat "pemilik meminta tidak ada pertanyaan lagi", jadi hasil yang diserahkan tanpa putaran tinjauan pemilik adalah bawaan orkestrator, bukan vonis pemilik, dan bisa dibalik | §C9, §D3, §D4; T7 tetap berlaku untuk Kata Pengantar |

**Belum diputus** (berbawaan; tiap bawaan bisa dibalik pemilik). Nomor U1–U4 dulu T11–T14 di
pedoman v1.2; diganti karena `KEPUTUSAN.md` kini memakai T11–T13 untuk deck. Rujukan lama "PEDOMAN
T14" dan "PEDOMAN T15" di `riset/desain-benchmark/SINTESIS.md` dibaca sebagai U4 dan T11, dan "T15" di
`riset/desain-benchmark/deck/SINTESIS-DECK.md` juga dibaca sebagai T11.

| No | Pertanyaan | Bawaan yang dipakai | Bila dibalik |
| --- | --- | --- | --- |
| U1 | Peta bernomor sendiri ("Peta 4.1") dengan Daftar Peta, pola GAR dan UNICEF (SINTESIS P11)? | Peta tetap seri Gambar, satu seri Caption | SEQ "Peta" dan bidang Daftar Peta ditambah; D-7 menghitung dua seri |
| U2 | Tabel tahap × tahun pola Deltaprogramma (SINTESIS P78) di DOCX, padahal pemilik membuang Gantt dari slide rekomendasi d5? | Kolom WAKTU berpil horizon di matriks rekomendasi (§B5.13) saja, mengikuti satu-satunya sinyal pemilik; tabel §B5.29 tidak dibuat | Tabel §B5.29 dipasang di DOCX bab Peta Jalan saja, sel tahap berupa pil native; tidak di deck |
| U3 | Kelas IRBI banjir, longsor, dan kekeringan di kajian air ikut berwarna oranye (ramp api, T8), padahal kategori basah biru dan kering emas. Dikehendaki? | T8 apa adanya: semua kelas IRBI ramp api, legenda "Kelas IRBI BNPB" | `skala.irbi.ramp` di `tema.json` diganti per keluarga (air, emas, netral); ambang IRBI ΔE ≥ 20 tetap berlaku |
| U4 | Keterangan gambar dan tabel: judul aksi berangka (MGI, WDR; SINTESIS P22) atau deskriptif? Vonis pemilik 23 Okt ("judul memakai bentuk deskriptif", Riwayat Buku Pegangan; "Judul deskriptif menang atas judul data", bab Selera presentasi) lebih baru daripada "judul = fakta + angka + sumber", dan tidak ada kata pemilik yang membatasinya ke deck | Deskriptif stabil berisi besaran, tempat, periode, dan satuan ("Gambar 5.2 Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)"); kalimat temuan berangka ditulis di kalimat pembuka tebal paragraf yang merujuk gambar (§B2, §C2) | Keterangan berupa kalimat temuan berangka ≤ 2 baris; kutipan pemilik dicatat di §0.3; Daftar Gambar berubah tiap pembaruan data |
| U5 | Kode lampiran deck kajian, karena pola d9 ("A1.") kini dipakai kode bagian (T12)? | "L1." sampai "L10."; di prosa ditulis "lampiran deck L1" supaya tidak terbaca sebagai aturan L1–L72 Buku Pegangan | Pemilik memilih kode lain, mis. bagian bernomor "1. " dan lampiran kembali "A1." pola d9; §B7.4, §B7.5, dan Buku Pegangan S10 dan S33 ikut diganti |
| U6 | Nama berkas deck: `tema.json` `kajian.<k>.nama_berkas` memberi PPTX dan DOCX nama dasar yang sama, sehingga PDF deck dan PDF DOCX sama-sama `<judul pendek> DDMMYY.pdf` | Deck memakai pola Buku Pegangan `<Judul deck> DDMMYY`: "Paparan Kajian Ketahanan Air Pulau Jawa DDMMYY" dan "Paparan Kajian Mitigasi Bencana Indonesia DDMMYY" (`.pptx` dan `.pdf`) | Pemilik memilih nama lain; `tema.json` dan `bangun/pptx/deck.py` mengikuti |
| U7 | Judul subbab tingkat 3 berangka (skill `deep-research`, `TAMBAHAN-RISET.md` butir 6), padahal vonis pemilik "Judul deskriptif menang atas judul data" tidak dibatasi ke deck dan Daftar Isi memuat tingkat 1.1.1? | Tingkat 1–3 deskriptif stabil (§C2), supaya Daftar Isi stabil dengan alasan yang sama dengan U4; temuan berangka di kalimat pembuka tebal (§B2) dan di judul kotak temuan (§B5.5), yang tidak masuk Daftar Isi. Bawaan awal v1.3 (tingkat 3 berangka) dibalik pada tinjauan silang 23 Okt karena aturan skill tidak boleh mengalahkan vonis pemilik | Tingkat 3 berupa temuan berangka (token), ≤ 2 baris; Daftar Isi berubah tiap pembaruan data; kutipan pemilik dicatat di §0.3 |


### A4. Alur argumen

Satu alur untuk kedua kajian, dari luas ke sempit, dari masalah ke tindakan:

1. **Masalah**: pertanyaan pimpinan dan mengapa sekarang (Bab 1).
2. **Kerangka**: konsep, regulasi, praktik negara lain, yang ditiru dan yang tidak
   cocok (Bab 2).
3. **Bukti**: metode dan data berlabel keyakinan, rekonsiliasi angka yang berbeda
   versi (Bab 3), kondisi dan histori (Bab 4), sebaran risiko nasional → pulau →
   provinsi → kab/kota (Bab 5).
4. **Skenario**: skenario terburuk yang masuk akal per jenis bencana atau per musim,
   tabel kerusakan, angka kebijakan (mis. korban bila evakuasi cepat vs lambat).
5. **Kesenjangan**: apa yang menahan, dengan bukti; apa yang sudah berjalan dan tidak
   boleh dikorbankan.
6. **Strategi**: pilar, sasaran terukur, aksi prabencana, tanggap darurat, pascabencana (T10).
7. **Rekomendasi berlembaga**: bernomor, satu daftar berurut prioritas (yang lain
   kategori), tiap butir dengan lembaga pemimpin, pendukung, waktu, indikator selesai,
   dasar; dipisah internal BNPB dan lintas K/L; keputusan yang hanya bisa diambil Kepala
   BNPB disebut terpisah beserta akibat tiap pilihan.
8. **Penutup**: yang sengaja tidak direkomendasikan dan alasannya; yang belum diketahui
   dan data yang diminta dari K/L pemegangnya.

Tiap bab dibuka 2–3 pertanyaan yang dijawabnya dan kotak ringkasan bab (§B5.2, §B5.3), dan
ditutup implikasinya bagi BNPB. Rekomendasi besar yang diperdebatkan menampilkan argumen tandingan
sebelum posisi kajian (§C9).

### A5. Satu sumber data, satu set gambar

```
sumber resmi + keluaran platform
        │  (skrip tarik, dicatat URL, tanggal tarik, lisensi, status [OK]/[BV])
        ▼
data/kajian-bnpb/data/*.json        ← satu-satunya tempat angka
        │
        ├─► peta web  public/kajian/<kajian>/  (turunan public/bnpb/risiko.html)
        ├─► render PNG  data/kajian-bnpb/gambar/*.png  (pola peta.mjs: GeoJSON → SVG
        │       → Chromium headless, skala 2; satu PNG = satu gambar bernomor)
        ├─► angka naskah  disuntik dari JSON saat build (templat), tidak diketik tangan (D-22)
        │
        ├─► generator python-docx → lengkap.docx → UNO perbarui indeks → soffice → PDF
        └─► bangun/pptx/deck.py (tema.json, angka.json, PNG peta dasar tanpa label) → PPTX → soffice → PDF
```

Aturan:

- Angka di judul, kartu angka, tabel, peta, dan teks dibaca dari JSON yang sama. Baris
  Jumlah dihitung dari angka yang tampil. Subtotal menjumlah ke total.
- Satu PNG dipakai di DOCX dan PDF-nya; deck memakai PNG peta dasar dari render yang sama dengan lapisan
  label dan legenda dimatikan, sedangkan pil, legenda, dan grafik deck dibangun native dari data dan token
  yang sama (§B7.2); peta web memakai JSON dan legenda yang sama.
  Prioritas yang disorot dan bernomor di web sama jumlahnya dengan di dokumen.
- Tiap gambar dan tabel punya berkas data di balik layar yang ikut diserahkan (lampiran
  atau `.xlsx`).
- Semua skrip dan perintah build disimpan di `data/kajian-bnpb/` dengan bagian "Cara
  membuat ulang" di README-nya. Hasil disimpan sebagai versi baru, bukan menimpa.
- Skenario dijalankan dengan mesin peramban yang dipanggil dari node (pola
  `scripts/gunungapi/cek_merapi2010.mjs`), hasilnya disimpan sebagai JSON, bukan dihitung
  ulang di tiap keluaran.
- Urutan kerja: data dan gambar → DOCX dan PDF → peta web. Dokumen didahulukan.

### A6. Yang sengaja tidak dibuat

| Tidak dibuat | Alasan |
| --- | --- |
| Halaman tim penyusun, ucapan terima kasih bernama | K1 |
| Angka biaya proyek | K6; pembiayaan ditulis sebagai sumber dan lapisan, bukan nominal proyek |
| Indeks risiko gabungan buatan sendiri sebagai peringkat utama | Uji balik komponen statis gagal (`risiko_ujibalik.json.vonis.lulus` = false); IRBI utama (K8) |
| Angka korban titik dari model gempa platform | Galat LOO ±5,3 kali; hanya pita berlabel |
| Kerugian imateriil rupiah di angka utama | Pilihan kebijakan (VSL); di lampiran metode, angka utama satuan fisik |
| Status kekeringan platform | Bertentangan dengan PDKM BMKG; status BMKG yang dipakai |
| Debit sungai Jawa, air tanah, penurunan muka tanah terukur | Data tidak ada di platform; ditulis sebagai celah dan permintaan data |
| Neraca air dan indeks kekritisan per wilayah sungai, bila Pola/RPSDA BBWS tidak terambil | `riset/B` §1.4 menandainya [TIDAK DITEMUKAN] (§C8); diganti IPA per pulau, ketersediaan per kapita, dan IRBI per kab/kota (§A3.1) |
| Peta zona air tanah | Data Badan Geologi tidak tersedia (`KERANGKA.md` tabel celah); ditulis sebagai celah dan permintaan data |
| Simulasi pandemi, kebakaran industri, kebakaran TPA, dan kerusuhan; perkalian analog ke wilayah lain, proyeksi korban per wilayah, dan pita peluang untuk nonalam dan sosial | Platform tidak punya simulasinya (`riset/D` §1 hanya bahaya alam, udara, abrasi, penurunan muka tanah). Nonalam dan sosial memakai kartu analog berangka empat besaran (korban jiwa, luas terdampak, kerugian materiil, kerugian imateriil) tanpa perkalian; skenario terburuk = analog terbesar dalam 30 tahun terakhir beserta alasan analog yang disisihkan; kemungkinan "tidak dinilai" (B5.11, `KERANGKA.md` prinsip 9). Mei 1998 dan kerusuhan Agustus 2025 tidak dipakai sebagai analog (M01) |
| Kajian kebakaran gedung dan permukiman | Di luar lingkup P11: urusan pemadam kebakaran kab/kota (UU 23/2014 Lampiran E); angka DIBI-nya hanya konteks lingkup di Bab 1 dan rekap Bab 4 kajian mitigasi (`KERANGKA.md` prinsip 3) |
| Luka, pengungsi hari ke-7, dan DALY di kartu skenario | Tidak ada di DIBI dan tidak dimodelkan; pengungsi = pengungsi tercatat puncak atau penghuni rumah RB+RS; YLL hanya di lampiran metode (`KERANGKA.md` prinsip 9) |
| Bencana akibat teror | UU 24/2007 Pasal 1 angka 4 memasukkannya ke bencana sosial; kewenangan BNPT dan Polri |
| Bencana akibat gagal modernisasi | UU 24/2007 Pasal 1 angka 3 memasukkannya ke bencana nonalam; belum ada definisi operasional dan data |
| Logo BNPB versi putih buatan sendiri | Mengubah lambang resmi (§C6.5); logo berwarna di bidang putih (B5.1) |
| Mode gelap di PDF/DOCX | Dokumen cetak; mode gelap hanya untuk peta web |
| Emoji, ilustrasi AI, foto stok | K5, K13 |
| Kotak "Coming soon"/placeholder | Bagian tanpa data ditulis sebagai keterbatasan atau dibuang |

---


## B. Design system

Semua token hidup di satu berkas `data/kajian-bnpb/tema.json` yang dibaca generator DOCX,
perender peta dan grafik, pembangun deck, dan peta web. Konstanta warna tidak disalin ke
kode.


### B1. Warna

Token warna di `tema.json` dipisah dalam empat peran: `inti` (teks, identitas, garis,
latar), `aksen` (sorot dan arah), `kategori` (keluarga bencana, §B1.3), dan `skala` (kelas
dan koroplet, §B1.4). Satu hex boleh tercatat di lebih dari satu peran, tetapi pada satu
halaman satu hex hanya membawa satu arti (§B1.8, gerbang D-24). Kepala, kaki, dan sampul
adalah bingkai templat dan tidak dihitung sebagai arti data.

#### B1.1 Token inti dan aksen

| Token | Peran | Hex | Dipakai untuk |
| --- | --- | --- | --- |
| `teks` | inti | `#1A1A1A` | teks isi, teks di atas semua tint |
| `teks-2` | inti | `#2E3440` | judul tingkat 3, teks tabel sekunder, "Sumber:" di dalam kotak bertint, ikon arah di halaman berkategori api atau basah |
| `teks-3` | inti | `#6B7280` | "Sumber:" dan keterangan di latar putih, kepala kolom di latar putih, nilai 0% |
| `navy` | inti | `#051C2C` | identitas solid: kepala tabel, baris total, pil data, nomor peringkat, judul bab, label bab, label Tabel dan Gambar, sampul |
| `garis` | inti | `#BFC5CC` | garis panel 0,75 pt, garis baris tabel 0,5 pt |
| `garis-kuat` | inti | `#1A1A1A` | garis header 0,75 pt |
| `pembanding` | inti | `#DCE1E7` | batang pembanding |
| `tanpa-data` | inti | `#F1F3F6` + arsir diagonal `#A9B4C2` | wilayah/sel tanpa data |
| `wilayah` | inti | `#D3DBE5` | daratan bernilai netral di peta simbol; tidak dipakai di peta koroplet (§B1.4) |
| `batas` | inti | `#A9B4C2` | batas provinsi 0,6 pt, garis pantai peta koroplet 0,4 pt |
| `kertas` | inti | `#FFFFFF` | latar semua halaman isi |
| `oranye` | aksen | `#D9600B` | naik; angka kunci di judul ≥ 14 pt Bold; garis tegak header dan garis aksen (bingkai) |
| `biru` | aksen | `#2F86D1` | turun |
| `merah` | aksen | `#C8102E` | hanya bahaya/perlu perhatian: garis sorot wilayah prioritas yang ditetapkan, pil bagian perlu perhatian dan preseden. Tidak untuk fase, koreksi, atau kelas indeks |
| `slate` | aksen | `#5B7A99` | pil Terverifikasi, pil bagian peringatan BMKG, garis kiri kotak Catatan dan Koreksi |
| `biru-abu` | aksen | `#3F5F80` | ukuran kedua (pil kolom luas, seri kedua grafik) |
| `biru-lembaga` | aksen | `#00499D` | nama tempat yang disorot di judul PDF |
| `emas-teks` | aksen | `#8A6A2E` | teks bernada kekeringan |
| `sumber` | aksen | `#4A9BE0` | bilah 3 pt di kiri catatan kaki slide deck (Buku Pegangan bab Selera presentasi, Komponen, Catatan kaki); tanda grafis saja, tidak di DOCX. Pemakaian di PDF ringkas: v1.2, dicabut K17 |

Kontras: teks di latar putih ≥ 4,5:1. `oranye` (3,73:1), `biru` (3,85:1), kering
`#B08A3E` (3,21:1), dan `sumber` (2,98:1) hanya dipakai untuk tanda grafis (ikon, garis,
batang, simbol peta) atau teks ≥ 14 pt Bold; teks lebih kecil memakai `navy` atau
`emas-teks` (5,02:1). Tanda grafis ≥ 3:1 terhadap latarnya; bilah `sumber` hiasan dan
dikecualikan. `teks-3` di atas `#F3F5F8` hanya 4,43:1, maka teks di dalam kotak bertint
memakai `teks` atau `teks-2` (11,4:1). Pil kecil berteks putih hanya di `navy`, `merah`,
dan `biru-abu`; pil `slate` (4,48:1) dibuat bergaris dengan teks `teks`.

#### B1.2 Tint tema (latar panel, pita kepala, kartu)

| Tema | Pita kepala | Latar muda |
| --- | --- | --- |
| Netral/data, sosial | `#E6EAF0` | `#F3F5F8` |
| Api/aksi | `#FBE7D6` | `#FDF4EC` |
| Bahaya | `#F8DDE0` | `#FCF1F2` |
| Air/musim hujan (keluarga basah) | `#DCEBF8` | `#EEF5FC` |
| Kering/musim kemarau | `#F4ECDC` | `#FBF8F2` |
| Geologi | `#F1E2D6` | – |
| Nonalam | `#E3EDE8` | – |
| Luas/BMKG | `#E3EAF1` | – |
| Wilayah fokus di tabel | `#FDF1E8` | – |

Teks di atas tint selalu `teks` (≥ 13:1). Pita bawah data dan latar peta memakai
`#F3F5F8` atau putih. Warna pekat hanya untuk pita identitas (kepala tabel, baris total),
pil kecil, nilai angka, dan garis tipis. Permukaan berwarna lain memakai tint di atas. Tanpa
gradien. Tanpa latar abu tua di bawah teks. Kartu angka putih; nadanya hanya di angka.

#### B1.3 Kategori bencana: enam keluarga warna

Warna menandai keluarga bencana, bukan jenis; jenis di dalam satu keluarga dibedakan ikon
dan label. Satu halaman menampilkan paling banyak enam warna kategori, ditambah `merah` bila
ada sorot bahaya. Warna tidak pernah satu-satunya pembawa makna: selalu bersama ikon dan
label. Sama di PDF, DOCX, dan web.

| Keluarga | Hex | Asal | Tint pita | Jenis dan ikon |
| --- | --- | --- | --- | --- |
| Geologi | `#8A4B2A` | deck (gunung api) | `#F1E2D6` | gempa bumi `activity` (path `gempa` deck); tsunami: glif khusus gelombang menggulung; gunung api `mountain`; likuefaksi: glif khusus bangunan miring di tanah bergelombang |
| Hidrometeorologi basah | `#2F86D1` | kanon (air, musim hujan) | `#DCEBF8` | banjir dan banjir bandang `waves` (path `banjir` deck); longsor: glif khusus lereng runtuh; cuaca ekstrem `cloud-lightning`; gelombang ekstrem dan abrasi: glif khusus garis pantai tergerus; rob: glif khusus bangunan tergenang air laut |
| Kering | `#B08A3E` | deck (emas kekeringan) | `#F4ECDC` | kekeringan `sun` |
| Api | `#D9600B` | deck (oranye, api) | `#FBE7D6` | kebakaran hutan dan lahan `flame` (path `api` deck) |
| Nonalam | `#3D6B5A` | turunan | `#E3EDE8` | epidemi/pandemi `virus`; kebakaran industri `factory`; kebakaran TPA `trash-2` (path `sampah` deck) |
| Sosial | `#4B4F58` | turunan | `#E6EAF0` | kerusuhan dan konflik sosial: glif khusus dua orang berhadapan (`users` sudah berarti jiwa) |

Validator (T6) berlaku untuk semua pasangan warna bermakna yang tampil bersama di satu
halaman, termasuk warna asal deck, `merah`, dan `navy`: CIEDE2000 ΔE ≥ 15, tanda grafis
≥ 3:1 terhadap putih. Warna bermakna = warna tanpa teks di dalamnya (kategori, kelas skala,
simbol peta, seri grafik); pil berteks dikecualikan. Hasil hitung enam keluarga ditambah
`merah` dan `navy`: ΔE terkecil 17,6 (geologi–`merah`); kontras grafis terendah 3,21:1
(kering).

Pita kepala kartu skenario dan panel memakai tint keluarga dengan teks `teks`. Teks putih di
atas warna keluarga hanya ≥ 14 pt Bold (ambang 3:1 teks besar; keenam keluarga lolos).

Glif khusus digambar sekali bergaya Lucide (viewBox 24, stroke 2, ujung dan sambungan
bulat), disimpan di registri ikon `tema.json` bersama path Lucide, dan diwarnai dari token
saat render (§B5.14).

#### B1.4 Skala kelas dan koroplet

Indeks platform memakai satu ramp per keluarga bahaya; kelas IRBI memakai ramp api untuk semua
bahaya (T8). Lima kelas dari terang ke pekat:

| Ramp | Dipakai untuk | Kelas 1 → 5 |
| --- | --- | --- |
| Api | karhutla; kelas IRBI semua bahaya (T8) | `#FBE7D6`, `#F4C3A0`, `#E8894A`, `#D9600B`, `#8F3F07` |
| Air | indeks platform banjir, longsor, cuaca ekstrem, gelombang, rob | `#DCEBF8`, `#A4CAEE`, `#68A8E0`, `#2F86D1`, `#1B5A93` |
| Emas | indeks platform kekeringan | `#F4ECDC`, `#DCC79C`, `#C4A262`, `#A07A32`, `#6E5424` |
| Netral | indeks platform multi-bahaya, kapasitas, geologi, nonalam | `#DCE3EB`, `#AEBBCB`, `#7F93AA`, `#4F6A88`, `#24384F` |

- **Kelas IRBI (Rendah/Sedang/Tinggi)** memakai kelas 1, 3, dan 5 ramp api (`#FBE7D6` /
  `#E8894A` / `#8F3F07`) untuk semua bahaya, dengan nama kelas resmi dan legenda "Kelas IRBI
  BNPB" (T8; `skala.irbi` di `tema.json`). Ramp keluarga air, emas, dan netral hanya untuk indeks
  platform. Hex kategori (`#D9600B`, `#2F86D1`) tidak pernah menjadi kelas IRBI. Peta IRBI banjir
  di kajian air ikut oranye; apakah pemilik menghendakinya masih terbuka (U3).
- Validator ramp: kelas bersebelahan ΔE ≥ 10 (hasil terkecil 10,5), kelas 1 ΔE ≥ 7
  terhadap putih (terkecil 7,5), kelas IRBI 1–3–5 ΔE ≥ 20 (terkecil 22,0).
- Peta koroplet tidak memakai `wilayah` untuk daratan (kelas 1 ramp netral hanya ΔE 2,0
  darinya); daratan di luar cakupan putih bergaris `batas`, garis pantai `batas` 0,4 pt
  supaya kelas 1 tidak hilang di laut putih.
- Panel di halaman berpeta koroplet memakai tint netral, karena kelas 1 tiap ramp sama
  dengan tint pita keluarganya.
- Simbol di atas koroplet memakai `navy` atau putih bergaris, bukan warna keluarga ramp itu.
- Merah tidak dipakai untuk kelas indeks; merah hanya garis sorot wilayah prioritas
  (1,5 pt `merah`) bila memang ditetapkan prioritas.
- **Tanpa data:** `#F1F3F6` berarsir diagonal, entri legenda "Belum terdata". Tidak
  pernah diwarnai sebagai nilai rendah.
- **Status resmi lembaga** (level PVMBG, peringatan BMKG, PDKM BMKG, intensitas MMI) memakai
  warna dan kata asli lembaganya, tidak dipetakan ulang ke skala di atas.

#### B1.5 Arah perubahan

Arah ditulis sebagai ikon vektor segitiga dari registri ikon (SVG di PNG dan HTML, gambar
sebaris di DOCX), sewarna token, atau sebagai kata "naik"/"turun". Karakter ▲ (U+25B2),
▼ (U+25BC), dan → (U+2192) tidak ada di Roboto, sehingga Word dan LibreOffice mengambilnya
dari font cadangan; karakter itu tidak dipakai di keluaran (D-23). Warna: naik `oranye`,
turun `biru`, 0% `teks-3`, "baru" bila pembandingnya 0. Di atas latar navy: naik
`#F2A35E`, turun `#8EC5F5`. Di halaman yang menampilkan keluarga atau ramp api atau basah,
ikon arah memakai `teks-2` dan kata naik/turun ditulis (§B1.8).

Warna mengikuti arah, bukan baik-buruk: indikator yang naiknya baik (cakupan air minum,
kapasitas) tetap oranye saat naik. Besaran yang dibaca sebagai baik-buruk di kajian air, yaitu
surplus/defisit neraca air (G7) dan membaik/memburuk terhadap skenario dasar (G13), tidak memakai
warna arah: batang `teks-2` lawan pembanding `#DCE1E7`, dengan kata "surplus"/"defisit" atau
"membaik"/"memburuk" tertulis di label. Satu aturan ini berlaku di PEDOMAN, SINTESIS, dan Buku
Pegangan; pasangan valensi "membaik biru, memburuk oranye" tidak dipakai.

#### B1.6 Warna terlarang

`#D9650B`, `#0F1E2D`, `#0B4EA2`, `#A88A3C`, `#FBEBDD`, `#D5D9DE` (palet generator lama);
warna versi 1 pedoman ini yang gagal validator atau kembar (`#2F6FB5`, `#4F6D8C`,
`#2E7D8C`, `#6B4A2B`, `#7A2E1E`, `#A23B2A`, `#F7F8FA`); navy-emas MBG (`#0B2545`,
`#C9A227`), hijau-emas Gemah Ripah, marun Betutu Sambe; ungu, violet, fuchsia, lime, indigo,
cyan (hue 175–200°); gradien ungu. Gerbang D-9 berupa daftar putih: tiap hex di DOCX, SVG,
HTML, CSS, dan JSON gaya keluaran wajib ada di `tema.json`; daftar di atas menjadi fixture
negatif D-9.

#### B1.7 Kode kajian air

Komponen bukan bahaya, jadi tidak diberi warna kategori: lingkaran `navy` berikon putih,
atau ikon `navy` di lingkaran tint netral, dibedakan ikon dan label. Ancaman memakai
keluarga §B1.3. Musim ditandai pita tint dan label, tanpa ikon sendiri.

| Kode | Unsur | Ikon | Warna dan tint |
| --- | --- | --- | --- |
| Komponen | Air baku dan air minum | `droplet` (satu arti dengan tetes air bersih, §B5.14) | `navy` / `#E6EAF0` |
| Komponen | Irigasi | `sprout` | `navy` / `#E6EAF0` |
| Komponen | Waduk dan bendungan | glif khusus tubuh bendungan | `navy` / `#E6EAF0` |
| Komponen | Air tanah | glif khusus sumur | `navy` / `#E6EAF0` |
| Komponen | Penurunan muka tanah | glif khusus patok GNSS dengan tanah turun | `navy` / `#E6EAF0` |
| Ancaman | Kekeringan | `sun` | kering `#B08A3E` / `#F4ECDC` |
| Ancaman | Banjir dan longsor | `waves`, glif lereng runtuh | basah `#2F86D1` / `#DCEBF8` |
| Ancaman | Rob | glif khusus bangunan tergenang air laut | basah `#2F86D1` / `#DCEBF8` |
| Musim | Musim kemarau | – | pita `#F4ECDC`, label "Musim kemarau" |
| Musim | Musim hujan | – | pita `#DCEBF8`, label "Musim hujan" |

Tidak ada warna baru: tiga ancaman memakai dua keluarga yang sudah lolos validator §B1.3.
Banjir dan rob sekeluarga, dibedakan ikon dan bentuk simbol peta.

#### B1.8 Satu hex satu arti per halaman

| Hex | Arti yang sah | Aturan bila berbagi halaman |
| --- | --- | --- |
| `#D9600B` | kategori api; ramp api kelas 4; naik; angka kunci judul | Bila kategori atau ramp api tampil, arah memakai `teks-2` + kata dan angka kunci judul `navy` |
| `#2F86D1` | kategori basah; ramp air kelas 4; turun | Bila kategori atau ramp air tampil, arah memakai `teks-2` + kata |
| `#FBE7D6`, `#DCEBF8`, `#F4ECDC` | tint pita keluarga; ramp kelas 1 | Halaman berpeta koroplet memakai tint netral untuk panel |
| `#B08A3E` | kategori kering | Tidak untuk teks < 14 pt (pakai `emas-teks`) |
| `#C8102E` | bahaya/perlu perhatian | Satu arti di semua halaman |
| `#5B7A99` | pil berteks (Terverifikasi, peringatan BMKG), garis kotak Catatan dan Koreksi | Bukan warna kategori atau seri |
| `#3F5F80` | ukuran kedua | Bukan warna kategori |
| `#051C2C` | identitas | Tidak menjadi kelas skala atau kategori |

Generator menulis `manifest.json` berisi halaman, objek, hex, dan peran tiap objek yang
digambarnya; gerbang D-24 menolak hex yang tercatat dalam dua peran pada satu halaman.


### B2. Tipografi (A4, Roboto saja, termasuk font tema DOCX)

| Unsur | Ukuran | Bobot | Warna | Catatan |
| --- | --- | --- | --- | --- |
| Judul sampul | 32 pt | Bold | putih di navy | paling banyak 3 baris |
| Subjudul sampul | 14 pt | Regular | putih | |
| Label bab ("BAB 4") | 9 pt kapital, spasi huruf 100 | Bold | `navy` | label pita; diturunkan dari penomoran Heading 1, tidak diketik (§B4); garis aksen `oranye` 2 pt × 12 mm di atasnya |
| Judul bab | 20 pt | Bold | `navy` | frasa deskriptif, KAPITAL ditulis literal ("PENDAHULUAN" di bawah label "BAB 1"; T1, §C2), selalu halaman baru, ≤ 2 baris |
| Subbab 1.1 | 13 pt | Bold | `navy` | nomor menggantung; huruf judul ("1.1 Latar Belakang"; T1) |
| Sub-subbab 1.1.1 | 11,5 pt | Bold | `teks-2` | |
| Tingkat 4 (a., 1)) | 10,5 pt | Bold | `teks` | tidak masuk daftar isi |
| Isi | 10,5 pt, spasi 1,15, 6 pt sesudah paragraf | Regular | `teks` | rata kiri-kanan; istilah asing miring |
| Penekanan | 10,5 pt | Bold | `navy` | hemat; tanpa garis bawah dekoratif |
| Isi Temuan (gaya paragraf) | 10,5 pt, spasi seperti Isi | Regular; run pertama Bold | `teks`; run pertama `navy` | turunan gaya Isi. Run pertama = kalimat pembuka ≤ 2 baris bergaya Penekanan yang memuat angka, tempat, dan tahun (OECD, CCDR; SINTESIS P17; D-26). Wajib untuk paragraf temuan Ringkasan Eksekutif dan semua paragraf isi Bab 4–7 kajian air dan Bab 4–10 kajian mitigasi; paragraf keputusan yang diminta dan yang belum diketahui di Ringkasan Eksekutif memakai gaya Isi |
| Keterangan Tabel/Gambar | 9 pt | label Bold, judul Regular | label `navy`, judul `teks` | judul deskriptif stabil (§C2, U4); di atas objek, rata tengah, ≤ 2 baris; label dan judul dipisah satu spasi ("Tabel 4.2 Judul"), tanpa titik dua atau titik |
| "Sumber:" dan catatan | 8,5 pt | "Sumber:" Bold | `teks-3` di latar putih, `teks-2` di dalam kotak bertint | di bawah objek, rata kiri sejajar objek; "Catatan:" sesudah "Sumber:", paling banyak satu baris dan 120 karakter (§B5.10, D-32) |
| Isi tabel | 9 pt (≥ 8 pt) | Regular, angka tabular | `teks` | |
| Teks grafik dan peta | label nilai 8,5 pt; kategori, legenda, anotasi 8 pt; label panel (a)(b)(c) 9 pt, pada ukuran cetak | nilai dan label panel Bold, lainnya Regular | `teks`; anotasi dan garis kejadian `teks-2` | ≥ 8 pt; label 5,9–7 pt di CCDR, Atlas, dan MGI tidak ditiru (SINTESIS P40) |
| Kepala kolom tabel | 8,5 pt, kata label kapital, satuan huruf asli ("LUAS (ha)"), spasi huruf 80 | Bold | putih di navy; `teks-3` di latar putih (tabel lampiran) | ≤ 3 baris |
| Nilai kartu angka | 18 pt, sama di PDF dan DOCX | Bold | warna makna | |
| Label kartu angka | 8,5 pt | Regular, huruf kecil | `teks-3` | |
| Pil bagian | 8 pt kapital, spasi 80 | Bold | putih di `navy`/`merah`; `teks` pada pil garis `slate` | nama bagian saja (§B5.4) |
| Catatan kaki | 8 pt | Regular | `teks` | bernomor per bab |
| Header | 8 pt | baris 1 Bold, baris 2 Regular | `teks` | |
| Footer | 8 pt; nomor halaman 9 pt Bold | | `teks-3`; nomor `teks` | |
| Daftar Isi tingkat 1 (TOC1) | 10,5 pt | Bold | `navy` | huruf seperti Heading (T1); titik penuntun; nomor halaman rata kanan |
| Daftar Isi tingkat 2 (TOC2) | 10,5 pt | Regular | `teks` | inden 7 mm; titik penuntun; nomor rata kanan |
| Daftar Isi tingkat 3 (TOC3) | 10,5 pt | Regular | `teks-2` | inden 14 mm; titik penuntun; nomor rata kanan |
| Entri Daftar Tabel/Gambar/Lampiran | 10,5 pt | label Bold, judul Regular | `teks` | "Tabel 4.2 Judul", titik penuntun, nomor rata kanan |

Batas bawah huruf yang dibaca: **8 pt** di semua keluaran cetak. Bila tidak muat, baris
dikurangi, dikelompokkan, atau tabel dipindah ke lampiran/halaman lanskap; huruf tidak
diciutkan. Hierarki dibangun dari bobot dan warna, bukan judul raksasa. Kapital berspasi
hanya untuk pil bagian, kepala kolom, dan label pita; singkatan resmi (BNPB, BMKG,
BPBD, PVMBG) tetap kapital karena itu nama. Angka memakai digit tabular Roboto
(`tnum`) di tabel dan kartu.

Ejaan dan pemenggalan (skill `book-production-rules`, `TAMBAHAN-BUKU.md` butir 3–4): isi rata
kiri-kanan butuh pemenggalan supaya tidak ada celah antarkata yang lebar. Semua gaya DOCX diberi
bahasa `id-ID` dan `w:autoHyphenation` aktif di `settings.xml`. LibreOffice di mesin ini tidak membawa
pola pemenggalan Indonesia, jadi `hyph_id_ID` dari repositori kamus LibreOffice dipasang ke profil
LibreOffice khusus ekspor (`-env:UserInstallation` ke `bangun/docx/keluaran/.lo-profil`), bukan profil pemilik, sebelum ekspor PDF. Ejaan diperiksa dengan kamus `id_ID` lewat
pustaka Python `spylls` di venv; kata yang tidak dikenal dan bukan istilah `glosarium.json` atau nama
diri dilaporkan per bab dan wajib nol sebelum serah (§D4, gerbang T-10). Kamus dan pola disalin ke
`bangun/kamus/id` dan dikunci SHA-256 di `bangun/docx/bangun.py`; uji diri pembangun DOCX memeriksa gaya
ber-`id-ID`, pemenggalan aktif, pola terpasang di profil ekspor, dan kata terpenggal di PDF.

Kapital pada label ditulis sebagai teks literal pada kata labelnya; `w:caps` tidak dipakai
pada run yang memuat satuan, supaya "ha", "mm", "m³/detik", dan "µg/m³" tetap huruf
aslinya. Butir tingkat 1 memakai "•" (U+2022) berfont Roboto, tingkat 2 bernomor huruf
("a."); butir bawaan Word berfont Symbol atau Wingdings, ◦, ▪, dan ✓ tidak dipakai karena
tidak ada di Roboto (D-23).


#### B5.4 Kartu angka

Putih, garis `#BFC5CC` 0,75 pt, radius 2 mm (sudut tegak di DOCX, §B3). Kiri atas
lingkaran tint 9 mm berisi ikon garis 5 mm sewarna nilai; nilai 18 pt Bold berwarna makna;
satuan lebih kecil di belakang nilai; label huruf kecil di bawah (≤ 24 huruf), boleh memuat
pembanding singkat ("naik 39% dari 2024"). Kartu tidak memuat baris sumber atau pil
keyakinan sendiri: sumber dan label keyakinan ditulis satu baris kaki per grup kartu
("Sumber: …; Resmi"). Kartu dikelompokkan dalam grup bertint dengan pil bagian, 3–4 kartu
per baris, bukan satu deret datar. Warna pil bagian: `navy` untuk data (mis. "DATA RESMI",
"SIMULASI"), `merah` untuk perlu perhatian dan preseden, pil garis `slate` untuk peringatan
BMKG. Kartu tanpa data dihapus, bukan diisi "–". Di Ringkasan Eksekutif kalimat tesis datang
lebih dulu (halaman Pesan Kunci); di Ringkasan Eksekutif, kartu pertama berisi hitungan
wilayah yang perlu ditindak, didampingi total singkat.


#### B5.6 Panel berpita

Panel putih bergaris `garis`; pita kepala 9 mm bertint tema (B1.2) berisi lingkaran
ikon, judul Bold, hitungan rata kanan. Isi: daftar status (lingkaran ikon, nama tempat
Bold + ", lokasi" Regular, pil status kanan; diurutkan terbesar dulu; status ≤ 4
kategori), atau 3–4 kolom dipisah garis 0,75 pt (pita bawah aksi; latar `#FDF4EC` aksi,
`#EEF5FC` musim hujan, `#F3F5F8` data; tiap kolom ≤ 2 baris).

#### B5.7 Tabel

**Aturan umum (semua tabel):**
- Keterangan di atas ("**Tabel 5.2** Judul deskriptif", bentuknya §C2 dan U4), sumber
  di bawah ("**Sumber:** …; data per 22 Okt 2026"). Judul tabel ≤ 2 baris.
- Kepala `navy` teks putih Bold 8,5 pt, kata label kapital dan satuan huruf aslinya, rata
  tengah, ≤ 3 baris, diulang tiap halaman. Satuan di kepala dalam kurung ("LUAS (ha)",
  "CURAH HUJAN (mm)"), bintang merujuk catatan sumber. Pengecualian: tabel lampiran (di
  bawah). Kolom label baris (kiri) tanpa isi warna, teks Bold `teks`.
- Kolom No paling kiri, sesempit isinya, rata tengah. Teks rata kiri. Angka rata kanan,
  tabular, desimal seragam per kolom. Persen dan panah rata kiri di kolomnya. Rp rata kiri
  dengan angka rata kanan.
- Garis bawah antarbaris 0,5 pt `garis`; tanpa garis vertikal; tanpa pita selang-seling;
  tanpa progress bar.
- Baris total `navy` teks putih Bold di kaki; subtotal per kelompok `#E6EAF0` Bold hanya
  bila kelompok berisi lebih dari satu baris; baris grup tanpa cacah.
- Satu baris per sel untuk angka, kode, nama wilayah; kolom keterangan bebas boleh
  melipat. Tanpa "…" terpotong. Dua potong informasi = dua kolom (Jumlah | Satuan).
- Nilai yang sama di tiap baris naik ke kalimat pengantar di atas tabel, tidak jadi kolom.
- Paling banyak 8 kolom di A4 tegak; kolom sekunder ke lampiran atau `.xlsx`.
- Wilayah diurutkan barat ke timur (Sumatra, Jawa, Bali dan Nusa Tenggara, Kalimantan,
  Sulawesi, Maluku, Papua) kecuali tabel peringkat; kota dan kabupaten dalam satu urutan
  kode Kemendagri.
- Sel kosong: nilai, atau nilai tingkat lain bila sah (ditandai), atau "–" dengan alasan
  di catatan ("tidak dipublikasikan", "belum ada", "menunggu data K/L", "belum dicari").
  Tidak diisi 0. Kolom yang seluruhnya kosong dibuang. "–" adalah satu-satunya notasi data
  kosong di seluruh dokumen, termasuk lampiran.
- Tabel berisi warna/ikon/pil ditutup legenda di baris terakhir tabel itu sendiri: sel digabung
  selebar tabel, tanpa isi warna, 8 pt. Dengan begitu "Sumber:" tetap paragraf pertama sesudah
  objek (D-7). Legenda grafik dan peta dibakar ke PNG.
- Label keyakinan per tabel di baris sumber, atau per baris bila campuran.
- Sel gabungan rata tengah vertikal.
- Data berperiode (harian, bulanan, tahunan) dalam satu tabel dengan periode sebagai kolom,
  bukan satu tabel per periode; label periode berupa rentang tanggal ("1–7 Okt"), bukan
  nomor minggu.

**Jenis tabel:**
- **Tabel data**: aturan umum.
- **Tabel peringkat**: nomor peringkat dalam bulatan `navy` angka putih; wilayah fokus
  diblok `#FDF1E8` dan tetap memakai nomor aslinya; kolom jumlah absolut (jiwa terpapar)
  selalu ada di samping indeks/persen; dasar urutan disebut di judul. Nilai indeks boleh diikuti
  titik kelas ramp §B1.4 (kelas IRBI: ramp api, T8) (UNICEF; SINTESIS P106).
- **Tabel perbandingan** (benchmark, opsi kebijakan): kolom Praktik | Negara/lembaga |
  Yang ditiru | Yang tidak cocok | Penyesuaian Indonesia; kolom vonis berupa pil dengan
  kosakata tetap.
- **Matriks lembaga**: baris lembaga (BNPB, BPBD, K/L, pemda, BUMD), kolom fase
  prabencana, tanggap darurat, pascabencana; sel berisi tugas ≤ 2 baris; lembaga pemimpin ditandai pil `navy`
  "Pemimpin", pendukung pil garis "Pendukung"; lembaga sebagai chip berikon, bukan logo.
- **Tabel lampiran** (B5.8), pengecualian aturan kepala navy: kepala Bold `teks-3` tanpa
  isi dengan garis bawah 1 pt, baris 0,5 pt `garis`, 8–9 pt; data belum ada "–" dijelaskan
  di catatan.
- **Tabel rekonsiliasi angka**: Besaran | Versi | Nilai | Sumber | Tanggal | Yang dipakai
  dan alasannya. Wajib untuk angka yang berbeda antar sumber.
- **Tabel skenario** (Nankai; SINTESIS P60): kolom = skenario, baris = besaran; sel digabung bila
  nilainya sama di semua skenario, supaya bagian yang tidak bergantung skenario langsung terlihat;
  asumsi tiap skenario ditulis di baris kepala kedua.
- **Tabel perkiraan lama lawan baru** (Nankai; SINTESIS P59): kolom dokumen lama dan kajian ini,
  kolom kajian ini Bold; nilai berupa rentang "sekitar", asumsi ditulis di bawah nilai, stempel
  skenario di baris sumber.
- **Tabel peta panas** (ADB, MGI; SINTESIS G16): sel diwarnai kelas diskret ramp §B1.4 (kelas IRBI:
  ramp api, T8), angka tetap tertulis, legenda kelas di baris terakhir tabel; kepala tidak diputar
  bila muat.
- **Tabel preseden** (White Paper Jepang; SINTESIS P108): kejadian besar sebagai kolom berikon
  jenis, besaran yang sama sebagai baris (waktu, magnitudo atau luas, korban, rumah rusak); kolom
  yang sedang dikaji berlatar `#FDF1E8`.
- **Tabel tipologi wilayah** (MGIA, Nankai; SINTESIS P104): baris dikelompokkan per tipe wilayah
  dengan pita grup `#E6EAF0` berlabel tipe dan cacah; profil tipe 2–3 label pendek; rekomendasi
  merujuk tipe. Tipe tidak diberi warna sendiri; bila perlu di peta, tipe digambar sebagai kelas
  ramp netral berlabel.
- **Kolom proyeksi dan target** (IMF; SINTESIS P67): berlatar `#F3F5F8` di tabel indikator,
  skenario, dan proyeksi; ini pembeda kolom, bukan pita selang-seling. Nilai berketidakpastian
  ditulis "X ± Y" atau rentang "a–b"; baris pembanding (Pulau Jawa, nasional) Bold tanpa isi
  warna di atas baris total (WMO; P66).


#### B5.9 Peta

- Latar putih atau `#F3F5F8`; laut putih, tidak biru. Daratan tanpa nilai `#F1F3F6`
  berarsir, daratan netral `#D3DBE5` (peta simbol saja, §B1.4), batas wilayah putih 0,4 pt,
  batas provinsi `#A9B4C2` 0,6 pt.
- **Koroplet kab/kota** untuk indeks per wilayah (B1.4). Untuk perbandingan antar 38
  provinsi, peta kisi (satu kotak sama besar per provinsi, disusun mengikuti geografi)
  mendampingi koroplet supaya luas wilayah tidak menyesatkan.
- **Simbol**: bulatan luas sebanding nilai, bergaris putih, yang kecil di atas yang besar;
  jenis objek dibedakan bentuk (lingkaran kejadian, segitiga gunung api, persegi
  bendungan), satu warna per jenis.
- Label pil putih bergaris abu, nama provinsi cukup besar (≥ 8 pt pada ukuran cetak);
  nomor prioritas 1–n di sisi bulatan yang kosong. Tidak ada label, bulatan, atau badge
  yang bertumpuk (gerbang D-8).
- **Legenda wajib** di kaki peta, rata tengah, entrinya diturunkan dari yang tergambar:
  arti tiap warna, ukuran bulatan (3 contoh), bentuk, "Belum terdata", sumber dan tanggal.
  Penanda di legenda sebentuk persis dengan yang tercetak; label 2–3 kata.
- Peta dibuat sebesar mungkin dalam lebar isi; skala batang dan arah utara kecil di pojok
  kanan bawah untuk peta pulau/provinsi.
- **Unsur peta resmi**: kaki peta memuat "Sumber batas: BIG/Kemendagri {tahun}; SRGI2013"
  atau sistem referensi dan proyeksi yang dipakai (mis. WGS84 geografis); peta pulau dan
  provinsi memakai inset lokasi; peta nasional mengikuti Peta NKRI BIG, termasuk penamaan
  laut (Laut Natuna Utara) dan pulau terluar lengkap; bila batas yang dipakai bukan rujukan
  resmi, catatan "Batas wilayah bukan rujukan resmi" tertulis di kaki. Perender menulis
  sumber batas, sistem referensi, proyeksi, inset, dan catatan ke manifest; D-8
  memeriksanya.
- **Koroplet hanya untuk rasio dan indeks** (per 100.000 jiwa, per km², kelas indeks); total dan
  jumlah digambar sebagai simbol sebanding (FT; SINTESIS P46). Manifest peta mencatat `besaran`;
  D-28 menolak koroplet untuk total.
- **Peta kecil berganda** untuk tahun, skenario, atau komponen (MGI, OECD, Nankai; SINTESIS P43):
  skala dan batas sama, satu legenda bersama, kelas sama di semua panel (D-29), label panel (a)(b)(c)
  atau nama skenario dalam pil. Pulau Jawa yang memanjang disusun bertumpuk.
- **Peta indeks studi kasus** (MGI; SINTESIS P44): bulatan `navy` bernomor putih di lokasi; tabel
  nomor, lokasi, dan judul temuan tepat di bawah peta; nomor sama di peta dan tabel.
- **Koroplet bersanding tabel peringkat** (White Paper Jepang; SINTESIS P45): warna kelas di tabel
  sama dengan di peta; kurung kelas di samping tabel menyebut cacah wilayah per kelas.
- **Inset perbesaran** bergaris `batas` untuk kawasan padat, mis. Jabodetabek dan Semarang–Demak
  (OECD; SINTESIS P47).
- **Sorot satu kategori** di atas daratan netral memakai warna keluarga yang dibahas (§B1.3), tidak
  `merah` (CCDR; SINTESIS P42). Pengecualian: kelas IRBI memakai ramp api di semua peta (T8); ramp
  keluarga hanya untuk kategori dan indeks platform. Bahaya disandingkan keterpaparan (penduduk, aset) sebagai dua peta
  sama skala (MGIA; P50).
- **Peta strategi per wilayah sungai** (Deltaprogramma; SINTESIS P49, disesuaikan): wilayah sungai
  dibedakan nomor putih dalam bulatan `navy` dan batas 1 pt `teks-2`, tanpa isi warna; legenda
  berupa pil nama 2–3 kata; kalimat arah 2030 pindah ke tabel tepat di bawah peta (No, Wilayah
  sungai, Arah 2030). Tidak ada warna baru per wilayah (§B1.3, §B1.6, D-9).
- Peta di dokumen sama isinya dengan peta web: prioritas yang disorot dan bernomor sama,
  jumlahnya sama.
- Koordinat titik dari sumber luar divalidasi; titik ragu tidak digambar tetapi tetap ada
  di tabel.
- Status resmi lembaga digambar dengan warna dan kata aslinya, berlabel lembaga dan waktu
  terbit.

#### B5.10 Grafik

- **Pesan dulu, grafik kemudian**: jenis grafik dipilih dari tabel pilih grafik di bawah (FT Visual
  Vocabulary dan contoh laporan kelas dunia; SINTESIS §5). Grafik di luar tabel butuh alasan satu
  kalimat di manifest (D-28).
- **Batang**: ujung atas membulat di atas garis dasar `garis`; tanpa sumbu Y; nilai Bold di atas tiap
  batang termasuk nilai kecil; batang pembanding `#DCE1E7`; periode lama tint, periode yang
  ditekankan pekat (ditetapkan di judul, mis. tiga tahun terakhir); garis rata-rata berpil `navy`
  "rata-rata"; kepala grafik pola grafik batang pemilik: nama besaran kiri, perubahan neto kanan
  berwarna arah dengan ikon vektor (§B1.5), satu baris tanpa satuan dan periode (lihat Anatomi). Batang bertumpuk paling banyak 4 kategori ditambah "lainnya", nilai tiap segmen dan
  total di atas batang tertulis.
- **Seri panjang** (lebih dari 24 periode): diringkas menjadi rata-rata per dekade sebagai batang
  (OWID; SINTESIS P29), atau digambar sebagai garis berlabel di ujung dengan paling banyak 3 garis
  acuan nilai berlabel (0,5 pt `garis`); tabel data tahunan ke lampiran. Batang tidak pernah diberi
  sumbu Y.
- **Garis/kurva musim**: seri tahun berjalan pekat di atas pita median historis
  (mis. 2019–2025) berwarna tint; tahun analog (2015) garis putus.
- **Anatomi** (MGI, Atlas, CCDR; SINTESIS P32–P38): dari atas keterangan (§B2), pil kanan atas paling
  banyak satu (label keyakinan §C6.2, skenario, atau sasaran yang diukur, mis. "Sasaran Sendai B"),
  grafik, "Sumber:", lalu "Catatan:" bila ada. Kartu Insight Buku Pegangan adalah aturan layar
  situs; di kertas berlaku dua hal: (1) kepala grafik pola grafik batang pemilik (nama besaran kiri,
  perubahan neto kanan) menjadi satu-satunya baris di atas grafik, tanpa satuan dan periode; baris
  subjudul indikator, satuan, atau periode tidak dipakai, satuan dan periode dilebur ke akhir
  keterangan dalam kurung atau ke legenda; (2) "Catatan:" paling banyak satu baris dan 120
  karakter, hanya untuk cara baca atau bias data (D-32). Label seri langsung di ujung garis
  atau batang bila seri paling banyak 4, selebihnya legenda di atas grafik. Paling banyak 3 anotasi
  per grafik; kejadian pada deret waktu ditandai garis tegak tipis `teks-2` berlabel (El Niño 2015,
  2019, 2023; UU 17/2019) (IMF, Atlas; P26, P27). Panel berganda berlabel (a), (b), (c), skala sama,
  satu legenda di kaki (P36). Di deck grafik boleh satu blok dengan kolom temuan di panel yang sama
  (GAR; P72; Buku Pegangan S13); di DOCX pesannya ditulis sebagai kalimat pembuka tebal paragraf di
  bawah gambar, karena kolom samping di Word rapuh (P12). Teks grafik ≥ 8 pt pada ukuran
  cetak (§B2).
- **Rentang ketidakpastian**: batang galat atau pita (p10–p90, rendah–tinggi) dengan titik
  tengah; angka rentang ditulis di label ("1.200–4.800 jiwa"); judul menyebut sumber
  rentang. Presisi tidak melebihi data. Bentuk yang dipakai (SINTESIS §7): pita persentil dengan
  median tebal dan garis tegak tahun sekarang (ADB; P54); batang rentang mengambang dengan median
  (ADB, MGI; P55); pita melebar untuk proyeksi dengan garis tengah `navy` (FT, IMF; G11); data garis
  solid, proyeksi garis putus, estimasi arsir (Atlas; P56); small multiples selisih dari skenario
  dasar (IMF; P57); bara risiko dan strip kelas per skenario dengan 5 kelas ramp berlabel dan pil
  "Penilaian pakar" (§C6.2) (IPCC, GAR; P63, P64); beberapa sumber sekaligus dengan seri utama pekat dan sumber lain
  garis tipis `teks-3` (WMO; P65). Paling banyak 2 pita per grafik; garis per anggota ansambel tidak
  digambar.
- Palet grafik dari token B1; warna per seri tetap di seluruh dokumen.
- Grafik cetak tidak punya tooltip, jadi semua angka yang dibaca tertulis.
- Legenda wajib untuk tiap seri, warna, dan pita (D-21); grafik yang tidak lazim diberi satu baris
  cara baca dan definisi besarannya di baris "Catatan:" di bawah "Sumber:" (OECD; P37), bukan di bawah
  judul. Seri yang bias pelaporannya mengubah cara baca diberi Catatan satu baris, mis. DIBI sebelum
  dan sesudah BPBD terbentuk 2008 (OWID; P28).

**Pilih grafik menurut pesan** (kode sama dengan SINTESIS §5 dan Buku Pegangan bab Selera laporan):

| Kode | Pesan | Grafik | Asal |
| --- | --- | --- | --- |
| G1 | Perubahan waktu, ≤ 24 periode | Batang tegak sesuai butir Batang | gaya rumah d3/d5; WDR 2024 hanya untuk nilai di atas batang |
| G2 | Perubahan waktu, seri panjang | Rata-rata per dekade sebagai batang, atau garis sesuai butir Seri panjang | OWID, White Paper Jepang, IMF |
| G3 | Musim berjalan lawan normal | Kurva musim di atas pita median | gaya rumah (kurva musim pemilik); ADB 2024 hanya untuk pita persentil |
| G4 | Peringkat | Batang horizontal terurut, nomor dalam bulatan `navy`, kolom jiwa terpapar | gaya rumah d5 (batang, bulatan nomor); Atlas SDG hanya untuk urutan |
| G5 | Peringkat seluruh wilayah | Satu deret batang terurut, nama hanya untuk yang disorot | Charting Our Water Future |
| G6 | Dua titik waktu per wilayah | Dumbbell terurut, titik awal `#DCE1E7`, titik akhir warna makna, selisih ditulis | Atlas SDG |
| G7 | Surplus atau defisit, anomali | Batang divergen dari nol berlabel kata; di kajian air `teks-2` lawan `#DCE1E7`, di luar itu warna arah (§B1.5) | FT |
| G8 | Komposisi | Batang bertumpuk 100%, ≤ 4 kategori + "lainnya"; pangsa tunggal batang 100% satu baris | Atlas SDG, BCG |
| G9 | Komposisi per skenario atau tahun | Batang bertumpuk per skenario, total di atas | GAR 2025, Deloitte |
| G10 | Kesenjangan kebutuhan lawan pasokan | Waterfall atau baji dalam satuan fisik (m³), pil selisih; tidak dalam rupiah (K6) | Charting Our Water Future |
| G11 | Proyeksi dengan rentang | Pita melebar, garis tengah `navy`, angka rentang tertulis, pil keyakinan | FT, IMF |
| G12 | Rentang per wilayah atau skenario | Batang rentang mengambang dengan median | ADB 2024, MGI |
| G13 | Skenario lawan dasar | Small multiples selisih dari skenario dasar; di kajian air `teks-2` lawan `#DCE1E7` berlabel "membaik"/"memburuk" (§B1.5) | IMF |
| G14 | Efek tindakan | Pasangan batang sebelum dan sesudah, label "turun …%" dan ikon arah | Nankai |
| G15 | Rugi bila diam lawan manfaat bertindak | Batang kupu-kupu, 2 skenario, satuan fisik atau rupiah bersumber | WS45 |
| G16 | Wilayah × kategori | Matriks titik (warna kelas, isi titik keyakinan) atau tabel peta panas (§B5.7) | IPCC, ADB 2024, MGI |
| G17 | Kemungkinan × dampak | Matriks risiko §B5.27 | NRR (nomor polos); bulatan `navy` gaya rumah d5 |
| G18 | Prioritas | Kisi prioritas §B5.28 | CCDR |
| G19 | Sebaran rasio atau indeks | Koroplet 5 kelas diskret (§B5.9) | Atlas SDG, FT |
| G20 | Sebaran total | Simbol sebanding berlegenda tiga ukuran | FT, Atlas SDG |
| G21 | Aliran | Aliran fisik bersumber (m³ air per sektor): Sankey ≤ 3 tingkat. Aliran dana dan tanggung jawab: diagram aliran berikon tanpa lebar sebanding (§B5.21, §B5.23); Sankey dana tanpa nominal tidak jujur dan nominal dilarang (K6) | ADB 2024, WS45, MGI |
| G22 | Capaian lawan target | Bullet chart atau tabel indikator §B5.19 | FT, White Paper Jepang |
| G23 | Kapan dan berapa lama | Kolom WAKTU berpil horizon di matriks rekomendasi §B5.13 (tabel tahap × tahun §B5.29 hanya bila pemilik menyetujui, U2); kronologi regulasi §B5.31 | Deltaprogramma, CCDR |
| G24 | Respons antar-kejadian | Garis bersumbu "hari sejak kejadian", label di ujung garis | White Paper Jepang |
| G25 | Dilarang | Pai lebih dari satu pangsa, donat, sumbu ganda, radar, chord, streamgraph, violin, Voronoi, area bertumpuk > 4 kategori, 3D, lingkaran konsentris, ikon dekoratif sebagai grafik, kurva biaya (K6) | – |

Sebar beranotasi (hubungan dua besaran) dan Marimekko (penduduk × indeks) hanya di bab analisis
DOCX, tidak di deck, dan tanpa kata kerja sebab-akibat (§C8).

#### B5.11 Kartu skenario terburuk (satu halaman)

Format tiga blok Perban BNPB 2/2023 Pasal 7 (karakteristik ancaman, skenario kejadian, asumsi dampak lima
aspek) ditambah baris kebutuhan respons, supaya kartu dapat disalin ke rencana kontingensi (`KERANGKA.md`
prinsip 9, R10). Pola satu halaman per risiko dari UK NRR tetap dipakai untuk tata letak. Satu kartu per
jenis bencana (kajian mitigasi) atau per musim/komponen (kajian air). Angka yang tidak ada tidak dikarang;
kontrak isinya adalah matriks ketersediaan kuantifikasi Bab 3 (jenis × metrik, kode Resmi / Turunan /
Estimasi model / Tidak dikuantifikasi, alasan satu kalimat).

**Aturan lantai.** Skenario terburuk tidak boleh lebih ringan daripada kejadian atau musim tercatat
terburuk dalam periode acuan untuk jenis dan wilayah yang sama (lantai = meninggal+hilang tercatat terbesar
dalam seri DIBI; nasional musim 2025/26, Jawa musim 2008/09; registri `hidromet.<wilayah>.lantai.*`). Yang
boleh disisihkan hanya kejadian berpeluang lima tahun < 0,2% dengan alasan tertulis. Keluaran model yang
batas tingginya di bawah lantai tampil berdampingan sebagai "pembanding musim berat tipikal", bukan
skenario terburuk; gerbang paket `skenario-hidromet` menolak skenario tinggi di bawah lantai tanpa penanda
itu.

**Varian (a), bencana alam yang dimodelkan atau berparameter** (cakupan `riset/D` §1):

1. **Kepala**: pita tint keluarga (§B1.3) dengan ikon, nama jenis, dan judul skenario, teks `teks`.
2. **Karakteristik ancaman dan skenario kejadian**: sumber parameter (PuSGeN, PVMBG, BMKG, DIBI), definisi
   "skenario terburuk yang masuk akal" (ekstrem yang sangat tidak mungkin disisihkan), dan lantai tercatat.
3. **Kemungkinan**: peluang skenario dalam 2026–2030 pada pita 5 tahun gaya NRR (1 = < 0,2%; 2 = 0,2–1%;
   3 = 1–5%; 4 = 5–25%; 5 = > 25%) atau periode ulang, bersumber per jenis (ONI untuk fase ENSO, laju
   Poisson gempa atau PuSGeN); tidak pernah "100%"; nilai kecil "< 1%". Jenis tanpa dasar peluang ditulis
   "tidak dinilai" dan tidak diberi posisi. Posisi kartu ditandai di matriks mini kemungkinan × dampak
   (§B5.27).
4. **Tabel asumsi dampak** (kolom: Besaran | Rendah | Tinggi | Label keyakinan | Sumber), baris per aspek
   Perban 2/2023 Pasal 7 ayat (5) (`tema.json` `kosakata.besaran_skenario_alam`), boleh beberapa baris per
   aspek:
   - Kependudukan: meninggal dan hilang, pengungsi tercatat puncak tanggap darurat (hidrometeorologi) atau
     penghuni rumah RB+RS (gempa), pengungsi-hari dengan rentang durasi;
   - Infrastruktur/fisik: rumah rusak berat, sedang, ringan (DIBI atau kejadian analog), fasilitas;
   - Ekonomi: tiga besaran berlabel tetap, tidak dijumlah: (a) nilai aset terpapar KRB (batas atas, "bukan
     kerugian"), (b) kerugian kejadian analog (DaLA, PDNA, Bank Dunia), (c) kebutuhan stimulan rumah, hanya
     untuk gempa, longsor, dan banjir bandang;
   - Lingkungan: luas sesuai konsep per jenis (zona bahaya tinggi KRB, luas terbakar), tidak dibandingkan
     antarjenis;
   - Layanan sipil: fasilitas pendidikan, kesehatan, dan layanan dasar terganggu bila tercatat;
   - **Kebutuhan respons**: kebutuhan minimum dari standar Perka BNPB 7/2008 dan Perban 3/2018 (mis. air
     15 l per orang per hari × lama status) atas dasar hitung pengungsi tercatat.

   Luka, pengungsi hari ke-7, dan DALY tidak dipakai karena tidak ada di DIBI (`kosakata.besaran_skenario_terlarang`;
   pembaca naskah menolaknya). Kerugian imateriil dalam satuan fisik; YLL dan rupiah imateriil hanya di
   lampiran metode, tidak dijumlah ke materiil. Baris yang tidak bisa dihitung ditulis "–" beralasan.
5. **Angka kebijakan**: satu baris pembanding yang mengubah angka jadi keputusan (mis. korban bila evakuasi
   segera ×1 / ×0,662 / ×0,437 atas paparan; cakupan peringatan dini dua lintasan Renstra dan Renas),
   digambar sebagai pasangan batang berlabel "turun …%" dengan ikon arah `biru` (Nankai; SINTESIS P61);
   efek dari koefisien asosiasi berpil Asumsi kebijakan.
6. **Peta kecil** jejak skenario dengan legenda.
7. **Kemampuan respons** dan **kebutuhan pemulihan**, 3–4 butir.
8. **Lembaga** pemimpin dan pendukung (chip berikon).
9. **Kaki**: pernyataan produsen "Simulasi skenario Pantau Bencana, belum divalidasi" bila dari model, galat
   tercatat, cut-off data.

**Varian (b), bencana nonalam** (pandemi, kebakaran industri, kebakaran TPA), dan **varian (c), bencana
sosial** (konflik sosial antarkelompok menurut UU 24/2007 Pasal 1 angka 4 dan UU 7/2012 Pasal 1 angka 1):
kartu analog berangka tanpa perkalian dan tanpa proyeksi per wilayah. Skenario terburuk = analog terbesar
dalam 30 tahun terakhir beserta alasan analog yang disisihkan: COVID-19 untuk pandemi, Plumpang 2023 untuk
kebakaran industri, Sarimukti 2023 untuk kebakaran TPA, Maluku 1999–2002 untuk konflik (Poso, Sampit,
Sambas sebagai pembanding). Mei 1998 dan kerusuhan Agustus 2025 tidak dipakai (M01); metrik perkosaan tidak
dipakai. Tabel empat besaran (`tema.json` `kosakata.indikator_skenario_nonalam`):

| Besaran | Isi | Sel kosong |
| --- | --- | --- |
| Korban jiwa | meninggal (dan hilang) tercatat analog | "–" beralasan |
| Luas terdampak | luas atau radius sesuai konsep jenis | "–" beralasan |
| Kerugian materiil | kerugian kejadian analog bila ada penilaian resmi | "–" beralasan |
| Kerugian imateriil | pengungsi, durasi status, hari layanan terganggu | "–" beralasan |

Kemungkinan ditulis "tidak dinilai: <alasan>" karena tidak ada model peluang yang dapat diuji balik.
Varian (c) menambah blok batas mandat (UU 7/2012; peran BNPB tiga hal: unsur Satgas nasional, pengungsi
bersama Kemensos, keadaan tertentu Perpres 46/2026 Pasal 3 ayat (2) huruf c). Kepala, lembaga, respons,
pemulihan, dan kaki sama dengan varian (a).

#### B5.12 Garis waktu prabencana, tanggap darurat, pascabencana

Tiga kolom sama lebar dipisah garis 0,75 pt, ketiganya bertint netral `#E6EAF0` dan
dibedakan ikon fase dan label (§B5.14): Prabencana, Tanggap darurat, Pascabencana (T10). Fase tidak
diberi warna tema supaya tidak bertabrakan dengan keluarga bencana (§B1.3); merah tetap
hanya untuk bahaya, dan kanon tidak memerahkan yang sedang ditangani. Tiap kolom: ikon fase,
3–5 aksi bernomor (nomor merujuk matriks rekomendasi), lembaga pemimpin. Di bawahnya pita
horizon tiga tingkat dengan legenda tetap: 100 hari, 2026–2027, 2028–2030 (`KEPUTUSAN.md` P4;
`kosakata.horizon` di `tema.json`, divalidasi generator).

Bab Grand Design dibuka satu halaman kerangka (BCG; SINTESIS P2): pilar, sasaran terukur, dan program
berkode dalam satu halaman berlatar putih. Kode program dipakai ulang di §B5.13, §B5.19, §B5.22, dan
§B5.29. Kajian air menurunkan tiap pilar menjadi aksi bernomor yang dibuka kotak "Dampak bila tidak
ditangani" (§B5.5) dan ditutup aksi 100 hari berlembaga (WS45; SINTESIS P3).

#### B5.13 Matriks rekomendasi

Dua baris per butir, supaya sel prosa tidak melipat 4–6 baris pada 9 pt di lebar 165 mm:

- Baris 1: No (lingkaran `navy` angka putih) | LANGKAH (judul tindakan ≤ 8 kata, ikon jenis
  aksi di depannya; D-31) | LEMBAGA (pemimpin pil `navy`, pendukung pil garis, chip berikon) |
  WAKTU (pil horizon: 100 hari, 2026–2027, 2028–2030).
- Baris 2, digabung selebar tabel: RINCIAN (satu kalimat rata kiri-kanan ±110 karakter:
  keadaan sekarang, yang kurang, mengapa penting), lalu INDIKATOR SELESAI (terukur) dan
  DASAR (data/regulasi) sebagai label Bold sebaris.

Jenis aksi (regulasi, data, infrastruktur, kapasitas, pembiayaan) dibedakan ikon (§B5.14),
bukan warna baru. Relasi antar butir ditulis "Butuh 03", "Membuka 05, 07". Dua kelompok:
internal BNPB dan lintas K/L. Satu daftar berurut prioritas; yang lain kategori dan disebut
begitu. Tiga rekomendasi teratas diberi sketsa langkah dan satu paragraf "Risiko
pelaksanaan".

Kolom DASAR memuat kode temuan lengkap dari halaman Pesan Kunci (§B5.26, mis. "Temuan B.2", selalu
dengan kata "Temuan") dan regulasi (D-27). Urgensi = horizon peta jalan: dibaca dari pil horizon di
kolom WAKTU (100 hari paling mendesak), tidak ditulis sebagai pil terpisah dan bukan kotak penilaian
bergambar (CCDR; SINTESIS P75). Matriks tegak, tidak diputar lanskap (WS45;
P76). Bila rekomendasi lebih dari 9, matriks didahului kisi prioritas §B5.28. Rincian per aktor
memakai chip aktor berikon diikuti 1–2 butir, bukan paragraf (NRR; P79). Rekomendasi berupa prosa
atau daftar pertanyaan tanpa penanggung jawab tidak dipakai (ADB, Deloitte, MGI; P87).

#### B5.14 Ikon

Satu sumber: SVG garis gaya Lucide (stroke 2, viewBox 24, ujung bulat) di registri ikon
`tema.json`, diwarnai ulang dari token saat render; PNG, gambar DOCX, dan HTML dibangkitkan
dari registri itu. Path set deck (`data/laporan-bnpb/harian-2026-10-23/ikon.mjs`: gempa,
api, banjir, tenda, rumah, orang, hati, kalender, sampah) dipakai ulang sebagai sumber SVG.
PNG `ik/*.png` deck tidak dipakai langsung: hanya lima warna (tanpa emas dan coklat) dan
tanpa glif gunung api, tsunami, longsor, kekeringan, virus, pabrik, atau tetes.

Ikon selalu di dalam lingkaran: ikon putih di lingkaran solid atau ikon berwarna di
lingkaran tint; ukuran ikon 55–62% diameter. Wajib di kepala panel, kartu angka, chip
lembaga, kepala tabel ringkasan.

Satu registri konsep → ikon, satu ikon satu arti (gerbang D-25):
- Jenis bencana §B1.3; komponen kajian air §B1.7.
- Orang/jiwa `users` (path `orang` deck); rumah/KK `house` (path `rumah` deck); tetes untuk
  air bersih dan air minum saja `droplet`; pengungsi path `tenda` deck.
- Fase: prabencana `shield-check`, tanggap darurat `siren`, pascabencana `hammer` (T10).
- Jenis aksi: regulasi `scale`, data `database`, infrastruktur `construction`, kapasitas
  `graduation-cap`, pembiayaan `banknote`.
- Arah naik/turun: segitiga vektor (§B1.5).

Ikon harfiah (air, api, gunung) sah karena itu domainnya; kiasan (tangga kolam renang,
kerang), gestur tangan, makhluk imut, emoji dilarang. `triangle-alert` hanya berarti
peringatan, tidak dipakai untuk jenis bencana. Lembaga ditampilkan dengan ikon, bukan logo;
logo hanya BNPB di header dan sampul. Baris total dampak kekeringan berikon rumah (KK),
orang (jiwa), tetes (liter dan tangki).

#### B5.15 Foto Commons beratribusi

Hanya foto nyata dari Wikimedia Commons (kandidat di `kandidat-foto-commons.csv`: lebar
≥ 1.000 px, CC/PD, tanpa NC/ND). Tanpa nomor urut di foto; keterangan foto berupa label
kategori dan waktu ("Banjir Demak, Maret 2024"). Atribusi di bawah foto: "Sumber:
Wikimedia Commons, <Pengarang>, <Lisensi>". Pemotongan dicatat di Lampiran Atribusi. Foto
hanya dipakai bila membawa informasi (lokasi, jenis kerusakan), paling banyak satu per
subbab. Foto tidak memuat korban yang wajahnya dapat dikenali, anak, jenazah, atau orang
terluka (etika kemanusiaan; UU 27/2022 tentang Pelindungan Data Pribadi); yang diutamakan
lanskap, infrastruktur, dan kegiatan.

#### B5.16 Catatan kaki

Bernomor per bab, 8 pt, untuk sumber angka di prosa yang tidak punya tabel/gambar, dan
untuk penjelasan "–". Sumber visual memakai baris "Sumber:", bukan catatan kaki.


#### B5.25 Kisi kesimpulan dan pita keputusan

Mengikuti pola kesimpulan dan pita arahan Paparan Presiden. Kisi 4 × 2 kotak putih bergaris, tiap
kotak satu kesimpulan berangka berikon, dipakai di Bab Kesimpulan; slide Kesimpulan deck memakai
pola yang sama (Buku Pegangan S32). Pita keputusan selebar isi bertint api/aksi berlabel "KEPUTUSAN
YANG DIMINTA", berisi 2–3 keputusan Kepala BNPB (kode KD-n dari register `KERANGKA.md` §6) beserta
akibat tiap pilihan. Pita yang sama dipasang dua kali dengan isi identik: di halaman Pesan Kunci
(§B5.26) sesudah tesis, dan di Bab Kesimpulan di bawah kisi (`KERANGKA.md` P15). Di deck isinya
menjadi pita keputusan slide Pesan Kunci dan pita ARAHAN slide Kesimpulan.

#### B5.26 Halaman Pesan Kunci

Halaman pertama Ringkasan Eksekutif DOCX; slide Pesan Kunci deck memakai tesis yang sama dan 4–6
temuan yang dipilih dari sini (Buku Pegangan S1, §B7.1) (WMO untuk ikon dalam lingkaran,
IPCC untuk kode bertingkat; SINTESIS P16, P18, P97). Isi berurutan: kalimat tesis (§A2) 12 pt Bold
`navy`; pita keputusan (§B5.25) berisi 2–3 keputusan yang diminta beserta akibat tiap pilihan (air:
KD-1, KD-2, KD-5; mitigasi: KD-1, KD-2, KD-3); lalu 4–6 temuan bernomor yang menopang keputusan itu
(D-30). Tiap temuan: lingkaran `navy` 9 mm berikon putih dari registri (§B5.14),
kode temuan Bold, satu temuan berangka paling banyak 3 baris dengan angka di depan, ditutup rujukan
"(Bab 5.2)" dan label keyakinan (§C6.2). Kode huruf = pertanyaan pimpinan §A2 (A, B, C), nomor urut
di dalamnya, selalu ditulis lengkap "Temuan A.1", "Temuan A.2"; bentuk telanjang "A.1" tidak dipakai
karena sama dengan nomor "Tabel A.1" di lampiran. Kode yang sama dipakai di kotak ringkasan bab,
kolom DASAR §B5.13, dan subbab yang dirujuk (D-27). Di DOCX disusun sebagai tabel tak bergaris dua kolom,
bersudut tegak (§B3).

#### B5.27 Matriks risiko kemungkinan × dampak

Pola NRR (SINTESIS P62, G17), untuk profil ancaman kajian mitigasi. Kisi 5×5: kolom kemungkinan memakai
pita peluang 5 tahun §B5.11 (< 0,2%, 0,2–1%, 1–5%, 5–25%, > 25%), baris dampak 1–5 berlabel kata
(Ringan, Terbatas, Sedang, Berat, Sangat berat; `tema.json` `kosakata.skala_dampak`). Skala dampak
didefinisikan di Bab 3 (kajian air Tabel 3.4, kajian mitigasi Tabel 3.3) per aspek Perban 2/2023 Pasal 7
ayat (5) (`kosakata.aspek_dampak`), dengan ambang tiap kelas ditetapkan dari sebaran DIBI 2008–2025
sebelum angka skenario diisi; kelas skenario = aspek terberat (`KERANGKA.md` prinsip 9, B04). Jenis tanpa
dasar peluang (pandemi, kebakaran industri, kebakaran TPA, konflik) tidak diberi posisi kolom: jenis itu
didaftar di panel samping "dampak dinilai, kemungkinan tidak dinilai" dengan kelas dampaknya dari analog
(`KERANGKA.md` D18, B03). Semua sel bertint
`#E6EAF0` seragam, tanpa gradasi hijau-kuning-merah, supaya merah tetap hanya bahaya. Isi sel: nomor
ancaman dalam bulatan `navy` angka putih (gaya rumah d5), atau angka Bold polos dipisah koma bila
sel memuat lebih dari 3 nomor (NRR menulis nomor polos, sampai 11 per sel); daftar bernomor di samping dikelompokkan per keluarga
bencana berikon (§B1.3). Versi mini di tiap kartu skenario: satu titik posisi dengan garis silang
rentang kemungkinan dan dampak (rendah–tinggi). Posisi dibaca dari rumus Metodologi; posisi dari
penilaian pakar berpil "Penilaian pakar" (§C6.2).

#### B5.28 Kisi prioritas rekomendasi

Pola CCDR (SINTESIS P77, G18), dipakai bila rekomendasi lebih dari 9 (§B5.13). Kisi 3×3: kolom
horizon peta jalan (100 hari, 2026–2027, 2028–2030; urgensi = horizon), baris dampak (sedang, tinggi,
sangat tinggi). Kunci dampak (`tema.json` `kosakata.dampak_prioritas`, label Asumsi kebijakan): dampak
rekomendasi = kelas skala dampak tertinggi (§B5.27) di antara jenis atau aspek yang disasarnya; kelas 1–3
= sedang, 4 = tinggi, 5 = sangat tinggi. Kunci ini ditulis di baris terakhir kisi. Sel berisi kode rekomendasi saja dalam pil `navy`, tanpa tint bertingkat; nama
rekomendasi di daftar samping urut kode; kunci penilaian di baris terakhir kisi (§B5.7). Tanpa gelembung berukuran dan tanpa
label bertumpuk (D-8).


### B7. Deck kajian

Deck PPTX per kajian (`KEPUTUSAN.md` P13–P14) memakai gaya rumah BNPB di Buku Pegangan bab Selera
presentasi (PPT): kerangka halaman, judul per jenis deck, palet, komponen, dan larangannya. Pola deck
konsultan kelas dunia (K16) tinggal di subbab Buku Pegangan "Pola deck konsultan kelas dunia
(McKinsey, BCG, Big Four)" dengan kode S1–S39. Bagian ini hanya memuat struktur, anatomi, dan alur
slide yang khusus dua kajian, dan merujuk kode S tanpa menyalin aturannya (kepala pedoman: tanpa
salinan aturan ketiga). Bukti dan vonis per pola ada di `riset/desain-benchmark/deck/SINTESIS-DECK.md`;
penilaian skill pemilik `alfatehan-pptx-rules` ada di `TAMBAHAN-PPTX-RULES.md`.

#### B7.1 Struktur

- Seperti Paparan Presiden (`KERANGKA.md` bagian Keluaran): sampul, Pesan Kunci, slide temuan,
  Kesimpulan, Terima kasih, pembatas Lampiran, lampiran. Slide Pesan Kunci sesudah sampul berasal dari
  pedoman ini (§B5.26), bukan vonis pemilik (S1). Tiga belas slide isi (Pesan Kunci, 11 slide bagian,
  Kesimpulan), dalam batas "±12 slide isi" P14. Sampul dan penutup tanpa footer dan nomor halaman.
  PDF deck memuat slide sebanyak PPTX (P13, gerbang T-2).
- Lima bagian per kajian, berurut dari masalah ke tindakan (S3), satu temuan Pesan Kunci per bagian
  (S2). Kode bagian D9600B di depan judul: huruf bagian lalu nomor slide di bagian itu ("A1. ",
  "B2. "; T12, S10). Lampiran berkode "L1. " (U5, S33); di prosa ditulis "lampiran deck L1" supaya tidak
  terbaca sebagai aturan L1–L72 Buku Pegangan.
- Judul (T11, S7; menyimpang dari vonis pemilik "Judul deskriptif menang atas judul data", tercatat di
  Buku Pegangan Belum diputus): slide temuan berupa kalimat temuan berangka paling banyak 2 baris,
  19–22 pt bold, angka D9600B, tempat 00499D. Slide temuan = slide bagian A sampai D dan matriks
  lembaga × fase. Slide usulan di bagian Grand design (kerangka program, prioritas program, rekomendasi
  dan peta jalan), sampul, pembatas, Pesan Kunci, dan Kesimpulan berjudul deskriptif; hitungan slide
  usulan pindah ke badan slide. Spek tiap slide memuat medan `judul: temuan` atau `judul: deskriptif`.
- Jenis judul tidak menentukan kaki dan pil. Slide usulan yang memuat angka (kerangka program dengan
  Target 2029, prioritas program) tetap memasang baris Sumber, catatan kaki, dan pil CUT OFF (S14, S16).
  Hanya slide baris LANGKAH, RINCIAN, PENANGGUNG JAWAB (E3 kedua kajian) yang tanpa kaki dan tanpa pil,
  mengikuti d5.
- Tanpa slide agenda, slide pelacak, atau pembatas bab (S10, S11). Bila deck yang lebih panjang memakai
  pembatas bab, layout-nya GELAP 051C2C (T13). Seri slide sejenis memakai chip seri (S12).
- Sebelum render, spek deck memuat satu kalimat `pesan_kunci` serta judul, medan `judul`, `jenis` dari
  daftar tertutup S35, pesan, dan visual tiap slide (S34). Di spek, medan S35 ditulis `jenis_slide` dan medan
  S7 `judul_bentuk`, karena `jenis` (tata letak) dan `judul` (teks) sudah dipakai; `bangun/pptx/deck.py` menolak
  spek tanpa `pesan_kunci`, slide tanpa `pesan`, `jenis_slide` di luar daftar, dan jenis berurutan sama di luar
  seri (`bangun/NASKAH-SPEK.md` bagian Spek deck). Tabel §B7.4 dan §B7.5 adalah garis besar itu dan dibaca berurutan sebelum membangun
  (S6).

#### B7.2 Anatomi slide

| Unsur | Aturan di deck kajian | Rujukan |
| --- | --- | --- |
| Blok | Satu pesan per slide dalam 3–4 blok: satu bukti utama, 2–3 kartu angka, pita bawah bila ada aksi; 180–290 kata | S13, S17 |
| Grafik | Dipilih dari tabel pilih grafik §B5.10 dan tabel pilih grafik slide di Buku Pegangan; dibangun native dari data dan token yang sama dengan DOCX, bukan PNG | S37, §A5 |
| Peta | PNG peta dasar dari render yang sama dengan DOCX, dengan lapisan label dan legenda dimatikan; pil wilayah berangka, nomor, dan legenda dibangun native dari koordinat manifest peta (D-8); berlatar putih, legenda wajib. Periksa: PNG peta di slide tidak memuat teks (SVG sumbernya tanpa elemen `text`) | S27, S37, §A5 |
| Catatan kaki dan sumber | Zona kaki y≈485–507,6: paling banyak satu baris "Sumber:" 7,5 pt ditambah 2 baris catatan 6 pt, tinggi kotak ≤ 22,6 pt; di semua slide berangka termasuk slide usulan, kecuali slide baris rekomendasi; tanpa baris sumber di bawah grafik | S14 |
| Label keyakinan | Pil panel atau chip per baris, sama dengan `keyakinan` di `angka.json`; menggantikan stempel konsultan | S15 |
| Pil CUT OFF DATA | Satu batas data kajian bertanggal dan berjam (mis. `23 Okt 2026, 23.59 WIB`) dari satu kunci di semua slide data, termasuk Pesan Kunci, Kesimpulan, dan slide usulan berangka; tidak di slide baris rekomendasi; menggantikan batas data di baris "Sumber:" | S16 |
| Warna | Satu warna sorot per grafik, satu warna per keluarga bencana sepanjang deck, sorot dengan bingkai, label langsung bila paling banyak 4 seri | S18–S21 |
| Daftar dan variasi | Paling banyak 6 butir per daftar; tiap slide isi selain navigasi memuat grafik native, tabel native, atau gambar peta; `jenis` dari daftar tertutup S35 dan dua slide berurutan tidak berjenis sama kecuali pengecualian S35 | S35, S36, S38 |
| Matriks dan tabel | Matriks lembaga × fase, tabel penanggung jawab, kondisi kini ke target 2029, tabel skenario, profil wilayah bertemplat sama; matriks risiko §B5.27, kisi prioritas §B5.28, dan kartu skenario mini §B5.11 boleh tampil sebagai slide utuh | S22–S26 |
| Rekomendasi | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB bernomor dalam lingkaran navy, pil status usulan, pita grup horizon tanpa Gantt; slide baris ini tanpa pil CUT OFF, catatan kaki, dan pita kepala panel. Slide usulan lain (kerangka program, prioritas program) tetap berkaki dan berpil | S14, S16, S28, S29 |
| Penutup dan lampiran | Kesimpulan 8 kartu 4×2 dan pita ARAHAN; penutup tanpa nama orang; lampiran tabel native paling banyak 24 baris, dipecah rata | S32, S33 |
| Huruf | Batas 6 pt Buku Pegangan, bukan 8 pt laporan; 5,2–5,8 pt hanya untuk persen tabel padat dan chip | S17 |
| QA | Laporan QA per deck (font, ikon, tata letak, anti-AI) ditulis `bangun/pptx/periksa.py` ke `keluaran/qa/deck-<nama>.md` tiap `deck.py --pdf` dan `periksa.py --serah`; kosakata LOLOS dan GAGAL; build gagal bila laporan GAGAL | S39, §D4 |

Yang tidak dibawa dari laporan ke deck, karena keputusan pemilik untuk slide: baris sumber di bawah
grafik (dibuang di d5, "Keterangan jadi label"), Gantt dan tabel tahap × tahun §B5.29 (dibuang dari
slide rekomendasi d5), dan batas huruf 8 pt.

#### B7.3 Aturan bersama kedua alur

- **Angka tidak diketik.** `{a}`, `{b}`, dan seterusnya di tabel alur adalah slot yang diisi token
  `{{angka:<kunci>}}` (`bangun/NASKAH-SPEK.md`, gerbang D-22). Kolom Sumber menyebut kuncinya:
  `angka:` untuk kunci yang sudah ada di `data/angka.json`, "kunci baru" untuk yang didaftarkan saat
  naskah dibangun. Path data relatif ke `data/kajian-bnpb/data/`. Templat judul sekitar 110 karakter
  sesudah angka diisi, supaya muat 2 baris di lebar 644 pt.
- **Kata arah dari tanda angka.** "Naik" atau "turun" di judul dipilih dari tanda nilainya, bukan
  ditulis tetap. Judul tanpa kata kerja sebab-akibat (§A2).
- **Kelas IRBI.** Peta kelas IRBI memakai ramp oranye (T8). Nama kelas resmi Rendah, Sedang, Tinggi
  hanya ada untuk indeks total; kelas per bahaya tidak ada di data (`irbi/README.md` bagian Kelas),
  dan kelas total IRBI 2025 di Jawa nyaris seragam (118 Sedang, 1 Tinggi). Peta dan judul per bahaya
  memakai nilai indeks dalam 5 kelas nilai (G19), bukan "kelas Tinggi".
- **Keyakinan.** Keluaran model selalu "Estimasi model, belum diuji balik". Korban jiwa skenario
  hidrometeorologi hanya ada sebagai rentang (kolom `rendah` dan `tinggi`, `nilai` kosong), jadi
  judulnya memakai dua slot.
- **Sampul**: judul resmi 2 baris, subjudul kajian, "Badan Nasional Penanggulangan Bencana" 00499D,
  pil tanggal paparan navy, foto Wikimedia Commons beratribusi (K5). Tanpa nama penyaji (bawaan; P1 hanya
  melarang tim penyusun).
- **Tesis dan glosarium**: tesis di `data/angka.json` kunci `tesis.air` dan `tesis.mitigasi` (§A2);
  singkatan dan istilah di `data/glosarium.json` (§B5.18). Slide Pesan Kunci dan lampiran singkatan
  membaca keduanya.

#### B7.4 Alur deck kajian air

Alur slide mengikuti tabel deck `KERANGKA.md` §4 v3 dan disalin di bawah supaya pembangun deck punya satu garis
besar (S34); bila berbeda, KERANGKA yang berlaku untuk isi. Bagian (label sama di Pesan Kunci dan kode bagian
slide isi): A Kondisi air, B Musim kemarau, C Musim hujan dan pesisir, D Kesenjangan, E Grand design.

Urutan `jenis` slide isi (S35): 1 navigasi, 2 tabel (profil wilayah, S26), 3 peta, 4 kartu-skenario, 5 peta,
6 kartu-skenario, 7 peta, 8 matriks, 9 grafik (rantai tahap), 10 tabel, 11 matriks, 12 rekomendasi,
13 navigasi; tidak ada dua jenis sama berurutan. Medan `judul`: slide 2–8 dan 11 `temuan`; 1, 9, 10, 12,
dan 13 `deskriptif`. Slot `{a}`, `{b}` diisi token `{{angka:…}}` (§B7.3); "kunci baru" didaftarkan di
`data/angka.json` saat spek deck dibangun. Di spek, kolom "Jenis; medan judul" ditulis `jenis_slide` dan
`judul_bentuk`; `bangun/pptx/deck.py` menolak slide tanpa `pesan` atau dengan nilai di luar daftar S35 dan S7.

| No | Kode dan judul | Pesan | Jenis; medan judul | Visual dan sumber |
| --- | --- | --- | --- | --- |
| – | Grand Design Ketahanan Air Pulau Jawa 2026–2030 | Sampul | sampul | Sampul d9, subjudul kajian, foto Commons beratribusi (`pustaka.json`) |
| 1 | Pesan Kunci | Tesis, 2–3 keputusan yang diminta beserta akibat tiap pilihan, 3–4 temuan penopang | navigasi; deskriptif | Tesis 1–2 baris; pita keputusan (KD-1, KD-2, KD-5); kartu temuan berchip "Temuan A.1" (S1, S2); `angka:tesis.air`, naskah Bab 10 |
| 2 | A1. Jawa menampung {a}% penduduk nasional dengan 6,3% air permukaan nasional; korban hidrometeorologi 2015–2025 terbanyak di {P} ({b} jiwa) | Tekanan air struktural dan sebaran korban per provinsi | tabel; temuan | Tabel profil 6 provinsi (penduduk KRB, korban per bahaya, rerata IRBI banjir dan kekeringan berlabel Asumsi kebijakan, sumber air minum 2023, irigasi) dan 3 kartu angka (S26, S8); `air-jawa/provinsi.csv`, `kab_jawa.csv`, `neraca_jawa.csv`, `dibi/jawa_kab_hidromet.csv` |
| 3 | B1. {a} kab/kota memenuhi syarat daftar perhatian kekeringan; kejadian DIBI dan IRBI kekeringan berkorelasi lemah (ρ = 0,18) | Daftar disusun dengan syarat; peta resmi dan lapangan berbeda | peta; temuan | Peta IRBI kekeringan 2025, 5 kelas nilai (G19), kab daftar perhatian bernomor (G4), pil "IRBI tidak untuk peringkat"; `air-jawa/irbi_kab_2015_2025.csv`, `dibi_kab_tahun.csv`, `peta_kab.geojson` |
| 4 | B2. Kemarau 2026: {a} kab/kota Jawa mencatat kekeringan sampai 23 Oktober (sementara); hari tanpa hujan terpanjang {b} hari di {L} | Kartu kemarau terburuk yang masuk akal dengan metrik resmi | kartu-skenario; temuan | Kab tercatat per tahun El Niño (2015, 2019, 2023, 2026; G1) berchip Resmi dan catatan pelaporan; bahaya tinggi KRB 2.877.406 ha; baris korban "tidak berlaku"; pita aksi sebelum kemarau 2027; `air-jawa/dibi_kab_tahun.csv`, `skenario-hidromet/kartu_skenario.csv`, BMKG (kunci baru) |
| 5 | C1. Tanah longsor mencatat 924 dari 1.738 korban meninggal hidrometeorologi Jawa 2015–2026; IRBI longsor 2025 tertinggi di {B} | Bahaya musim hujan dengan korban terbanyak | peta; temuan | Peta kecil berganda IRBI banjir, longsor, abrasi (G19); batang korban per bahaya di panel; `air-jawa/irbi_kab_2015_2025.csv`, `dibi/jawa_kab_hidromet.csv` |
| 6 | C2. Musim hujan Jawa dengan korban tercatat terbesar: {a} meninggal dan hilang ({musim}); musim 2026/2027 diprakirakan mulai Desember dengan puncak Desember–Februari | Lantai skenario dan kartu operasional 2026/2027 | kartu-skenario; temuan | Kiri tabel lima aspek, tercatat Resmi dan model berdampingan berlabel; kanan kepekaan peringatan dini dua lintasan (G14, pil Asumsi kebijakan, longsor tidak dihitung); `skenario-hidromet/musim_hujan.csv`, `kartu_skenario.csv`, `kepekaan_peringatan_dini.csv` |
| 7 | C3. Penurunan muka tanah terverifikasi di {a} kota pesisir utara, tertinggi {b}–{c} cm per tahun di {K} | Risiko kronis pesisir memperbesar rob | peta; temuan | Garis pantai berlatar putih, titik kota bernomor, batang rentang (G12), baris "Data yang belum ada", chip prasyarat Tanggul Laut Pantura; pil Terverifikasi; `air-jawa/subsiden_kota.csv`, `peta_subsiden.geojson` |
| 8 | D1. Lima komponen air terbagi ke {a} lembaga; {b} tumpang tindih dan celah kewenangan tercatat dalam peraturan | Kesenjangan kewenangan dan tiga jangkar Pasal 35 | matriks; temuan | Grid komponen × tingkat, chip lembaga, sel tertulis lawan pemetaan penyusun ditandai (S20); `lembaga/matriks_air.csv`, `celah.csv` |
| 9 | E1. Kerangka Program Grand Design 2026–2030 per Fase dan Musim | Program berkode dengan kategori bukti; pita Kondisi 2025 ke Target 2029 | grafik (rantai tahap, G21); deskriptif | `program-terbukti/kompendium_program.csv`, `renstra_bnpb_2025_2029.csv`, naskah Bab 8; baris Sumber dan pil CUT OFF dipasang |
| 10 | E2. Rencana Aksi Musim Hujan 2026/2027 dan Kesiapan Kemarau 2027 | Aksi bulanan November 2026–April 2027 dan pemicu kemarau 2027 | tabel; deskriptif | Tabel bulanan × unit (G23), hari ke-0 dan hari ke-100 ditandai; naskah Bab 8.8–8.9 |
| 11 | E3. Tugas per fase untuk {a} lembaga pada ancaman air; {b} peran tertulis dalam peraturan | Siapa mengerjakan apa per fase; mandat dipisah dari usulan | matriks; temuan | Matriks lembaga × fase, kode K/P/R/I, ≤ 12 baris (S22, S23); `lembaga/peran.csv`, `matriks_bencana.csv`, `lembaga.csv` |
| 12 | E4. Rekomendasi dan Peta Jalan 2026–2030 | {a} rekomendasi berlembaga, {b} dalam 100 hari, {c} pada 2026–2027, {d} pada 2028–2030 | rekomendasi; deskriptif | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB, pil status, pita horizon (S28, S29); register bersama |
| 13 | Kesimpulan | 8 kesimpulan; pita ARAHAN berisi keputusan yang sama dengan slide 1 | navigasi; deskriptif | Kisi 4 × 2 (S32); angka sama persis dengan slide 2–12 |
| – | Terima kasih; Lampiran | Penutup dan pembatas | layout GELAP | – |

Lampiran deck (kode "L1. ", U5): L1 Indikator 119 kab/kota dengan kolom tingkat data (lanjutan per 24 baris); L2 Profil 24 wilayah
sungai (kewenangan, tanpa neraca); L3 Bendungan dalam paket data, baris resmi dan sekunder terpisah; L4 Irigasi per
provinsi dan kewenangan, rekonsiliasi; L5 Kisi kekuatan bukti × status program air; L6 Arsitektur pembiayaan; L7 Tata
kelola, pelaporan, matriks mandat lengkap; L8 Instrumen hukum (kolom Progsun); L9 Metode, label, rekonsiliasi, data yang
belum ada (Tabel 3.1); L10 Daftar singkatan.

#### B7.5 Alur deck kajian mitigasi

Alur slide mengikuti tabel deck `KERANGKA.md` §5 v3. Bagian: A Histori, B Profil risiko, C Skenario terburuk,
D Kesenjangan, E Grand design. Slide C1–C3 satu seri dengan chip GEOLOGI, HIDROMETEOROLOGI, NONALAM DAN SOSIAL
(S12).

Urutan `jenis` slide isi (S35): 1 navigasi, 2 grafik, 3 peta, 4 matriks, 5–7 seri berchip (S12: tabel, tabel,
grafik; 5–6 berurutan sebagai seri berchip, pengecualian S35), 8 panel, 9 grafik (rantai tahap), 10 tabel,
11 matriks, 12 rekomendasi, 13 navigasi. Medan `judul`: slide 2–8 dan 11 `temuan`; 1, 9, 10, 12, dan 13
`deskriptif`.

| No | Kode dan judul | Pesan | Jenis; medan judul | Visual dan sumber |
| --- | --- | --- | --- | --- |
| – | Grand Design Mitigasi Bencana Indonesia 2026–2030 | Sampul | sampul | Subjudul "Strategi Prabencana, Tanggap Darurat, dan Pascabencana" (T10) |
| 1 | Pesan Kunci | Tesis, 2–3 keputusan beserta akibat, temuan penopang | navigasi; deskriptif | Pita keputusan KD-1, KD-2, KD-3; kartu temuan berchip (S1, S2) |
| 2 | A1. Korban meninggal dan hilang 2025 mencapai {a} jiwa, tertinggi sejak 2018; {b} di antaranya dari banjir dan longsor Sumatra November 2025 | Korban naik meskipun indeks turun | grafik; temuan | Batang meninggal+hilang 2015–2025 (G1) dan kejadian alam bertumpuk kelompok (G9) dengan penanda patahan 2024; 3 kartu angka; `dibi/rekap_nasional_tahunan.csv`, `skenario-hidromet/kartu_skenario.csv` |
| 3 | B1. {a} dari 514 kab/kota berstatus Tinggi pada IRBI 2025, terbanyak di {pulau} ({b}) | Sebaran risiko dari pulau ke kab/kota | peta; temuan | Peta Indonesia status IRBI 2025 per kab/kota (G19, ramp T8), pil pulau dan 5–8 provinsi native, catatan skala 2025; `irbi/irbi_kab_2025.csv`, `irbi_agregat_pulau.csv` |
| 4 | B2. {a} dari {n} jenis bencana berada di kelas dampak tertinggi; peluang lima tahun dapat dinilai untuk {m} jenis | Penilaian terbanding semua jenis | matriks; temuan | Matriks kemungkinan × dampak (G17, B5.27); panel "dampak dinilai, kemungkinan tidak dinilai"; pil Penilaian pakar bila posisi dari analog; `skenario-geologi`, `skenario-hidromet`, `nonalam-sosial/skenario_terburuk.csv`, `riset/mentah/oni_cpc.txt` |
| 5 | C1. Penduduk terpapar tsunami {a} jiwa (KRB); {b} jiwa pesisir rendah dicapai gelombang ≤ 30 menit pada skenario selatan Jawa | Skenario geologi dinyatakan dengan paparan; korban tsunami belum dapat dihitung | tabel; temuan | Chip GEOLOGI. Tabel paparan resmi, jiwa pesisir rendah (Estimasi model), faktor evakuasi atas paparan; baris analog Cianjur 2022 dan Sulteng 2018; `skenario-geologi/ringkasan.csv`, `tsunami_kab.csv`, `kepekaan.csv`, `pembanding_resmi.csv` |
| 6 | C2. Musim hujan 2025/2026 mencatat {a} meninggal dan hilang, lantai skenario terburuk hidrometeorologi nasional | Lantai dari kejadian nyata; kartu 2026/2027 | tabel; temuan | Chip HIDROMETEOROLOGI. Kolom musim tercatat terburuk, kasus Sumatra 2025, musim 2026/2027 setelah El Niño kuat, kemarau; model rasio berdampingan berlabel; `skenario-hidromet/kartu_skenario.csv`, `musim_hujan.csv` |
| 7 | C3. Analog terburuk: COVID-19 {a} meninggal (resmi; {b}–{c} kematian berlebih menurut model WHO); konflik Maluku 1999–2002 sedikitnya {d} meninggal | Nonalam dan sosial dikuantifikasi dari analog tanpa perkalian | grafik; temuan | Chip NONALAM DAN SOSIAL. Batang analog per jenis dengan rentang (G12) dan label keyakinan; `nonalam-sosial/covid19_nasional.csv`, `peristiwa.csv`, `skenario_terburuk.csv` |
| 8 | D1. Target cakupan peringatan dini 2029: Renstra {a}% lawan Renas {b} per 100.000; {c} tumpang tindih dan celah kewenangan tercatat | Kesenjangan yang menuntut keputusan | panel; temuan | Tiga panel kartu temuan; pita Kondisi 2025 ke Target 2029 dengan dua lintasan dan catatan penyebut (S24); `program-terbukti/renstra_bnpb_2025_2029.csv`, `lembaga/celah.csv` |
| 9 | E1. Alur Langkah dan Kerangka Program 2026–2030 | Rantai pemicu dan program berkode per kelompok bencana | grafik (rantai tahap, G21); deskriptif | Naskah Bab 11.1 dan 11.3; pita sasaran 2029 resmi; baris Sumber dan pil CUT OFF |
| 10 | E2. Operasi Musiman dan Rencana Aksi Musim Hujan 2026/2027 | Apa yang dikerjakan saat kemarau dan saat musim hujan | tabel; deskriptif | Kalender bahaya, pemicu, unit; baris 2026/2027 dan kemarau 2027; naskah Bab 11.5–11.6 |
| 11 | E3. Tugas per fase untuk {a} lembaga pada {n} ancaman; BNPB koordinator tanggap darurat pada {b} ancaman | Siapa mengerjakan apa per fase | matriks; temuan | Matriks mandat tertulis lembaga × fase, kode K/P/R/I, ≤ 12 baris (S22, S23); `lembaga/peran.csv`, `matriks_ringkas.csv`, `matriks_bencana.csv` |
| 12 | E4. Rekomendasi dan Peta Jalan 2026–2030 | {a} rekomendasi, {b} dalam 100 hari | rekomendasi; deskriptif | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB (S28, S29); register bersama |
| 13 | Kesimpulan | 8 kesimpulan dan pita ARAHAN | navigasi; deskriptif | Kisi 4 × 2 (S32) |
| – | Terima kasih; Lampiran | Penutup dan pembatas | layout GELAP | – |

Lampiran deck (kode "L1. ", U5): L1 Tren IRB per pulau 2015–2024; L2 Nilai IRBI 2025 per bahaya untuk kab/kota berstatus Tinggi; L3 Kartu
skenario per jenis; L4 Rekap DIBI dan rekonsiliasi kejadian 2024; L5 Kisi kekuatan bukti × status program; L6 Profil
kerugian dan arsitektur pembiayaan; L7 Tata kelola, pelaporan, matriks mandat lengkap; L8 Instrumen hukum dan yang
berubah dari Renas PB; L9 Metode, label keyakinan, data yang belum ada; L10 Peta kapasitas daerah dua ukuran; L11 Peta
paparan skenario geologi; L12 Daftar singkatan.

---


## C. Bahasa, angka, integritas data

### C1. Suara dan register

- Bahasa Indonesia baku formal ilmiah, satu register per dokumen. Tidak menyapa pembaca
  (tanpa "kamu", "Anda"); kalimat tanpa kata ganti bila tidak perlu.
- Lugas: satu kalimat satu gagasan, angka kunci di depan. Paragraf analisis di DOCX boleh
  panjang, tetapi kalimat kunci tiap subbab tetap berangka di depan.
- Dilarang: personifikasi, slogan, kontras retoris "X bukan Y", "mulai besok",
  tiga-serangkai, kalimat penutup bergaya, kata pengisi (padanan "elevate", "seamless",
  "transformatif", "holistik", "sinergi" tanpa isi), kalimat yang terdengar seperti model
  berusaha bijak, basa-basi "ini peluang, bukan kepastian".
- Dampak ditulis sebagai skenario konkret: siapa, di mana, kapan, apa yang gagal.
- Kotak ringkasan dan slide deck ditulis berkerangka label (Temuan, Rekomendasi, Aksi),
  bukan blok paragraf. Paragraf isi DOCX tetap prosa padat (§C9).
- Data K/L lain diposisikan sebagai data lembaga itu, bukan posisi BNPB. Rincian teknis
  yang menjadi kewenangan K/L lain dirujuk, tidak diambil alih.
- Bila anggapan umum keliru, koreksi di awal bagian dengan dasar (kotak B5.5).
- Kalimat templat yang bertentangan dengan data dihapus.
- Tanpa emoji; tanpa em dash; tanpa titik tengah.

### C2. Judul dan kapitalisasi

| Unsur | Bentuk | Huruf |
| --- | --- | --- |
| Judul bab | frasa deskriptif yang stabil, tanpa angka yang berubah tiap pembaruan data, supaya Daftar Isi stabil ("PROFIL RISIKO MUSIM KEMARAU") | KAPITAL (T1) |
| Subbab (tingkat 2) | frasa deskriptif yang stabil ("5.1 Sebaran Risiko Kekeringan") | kapital tiap kata menurut PUEBI (T1) |
| Sub-subbab (tingkat 3) | frasa deskriptif yang stabil ("4.3.2 Sedimentasi Waduk"), tanpa angka yang berubah tiap pembaruan data, supaya Daftar Isi (sampai tingkat 1.1.1, §B4) stabil; bawaan U7. Temuan berangka skill `deep-research` (`TAMBAHAN-RISET.md` butir 6), mis. "Kedung Ombo kehilangan 5,5% tampungan", ditulis di kalimat pembuka tebal subbab (§B2) | kapital tiap kata menurut PUEBI (T1) |
| Judul kotak temuan (§B5.5) | kalimat temuan berangka, formal, ≤ 2 baris; angkanya token (D-22); tidak masuk Daftar Isi | huruf kalimat |
| Keterangan tabel dan gambar | bawaan U4: frasa deskriptif yang stabil berisi besaran, tempat, periode, dan satuan dalam kurung ("Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)"), tanpa angka hasil yang berubah tiap pembaruan data, supaya Daftar Tabel dan Daftar Gambar stabil; memuat tahun atau periode (D-31) | huruf kalimat |
| Kalimat pertama subbab dan paragraf yang merujuk objek | kalimat temuan berangka dari objek itu (angka, satuan, tempat, waktu), sebagai kalimat pembuka tebal bergaya Isi Temuan (§B2) | huruf kalimat |
| Label, pil, kolom, legenda | kata benda polos | huruf kalimat; kapital berspasi hanya pil bagian, kepala kolom, label pita (§B2); singkatan resmi tetap kapital |

- Angka kunci di judul PDF ≥ 14 pt boleh disorot `oranye` dan nama tempat `biru-lembaga`;
  di DOCX dan di teks < 14 pt cukup Bold.
- Judul deskriptif menang atas judul data mentah. Judul blok/kotak = nama bloknya
  (≤ 32 karakter), tanpa titik dua lalu keterangan.
- Judul paling banyak dua baris; bila tidak muat, perpendek, bukan turun baris ketiga dan
  bukan mengecilkan huruf, karena ukuran gaya Heading seragam (perbedaan dengan kanon
  dicatat di §0.3).
- Tanpa tanggal tempelan di judul blok bila periode sudah ditulis sekali di atas.

### C3. Istilah baku

Satu konsep satu istilah di seluruh teks (judul, kolom, legenda, isi, label peta). Istilah,
padanan terlarang, dan definisi hidup di `glosarium.json` (§B5.18).

| Pakai | Jangan |
| --- | --- |
| titik panas (deteksi satelit) | titik api; jumlah titik panas tidak sama dengan jumlah kebakaran |
| hitungan satelit (luas dari satelit), diberi catatan "Bukan luas resmi." | perkiraan satelit |
| provinsi yang sering mengalami {bencana} | N provinsi prioritas (kecuali status resmi BNPB yang memang bernama demikian, dikutip dengan sumbernya) |
| titik panas berada di dalam areal konsesi | tuduhan pembakar; nomor izin, kasus sanksi tidak ditulis; WALHI tidak dipakai sebagai kolom, angka, atau sumber |
| musim hujan | hujan pertama |
| prabencana, tanggap darurat, pascabencana (T10, UU 24/2007) | pra bencana, pra-bencana, "saat bencana" sebagai nama fase, campuran tanpa aturan |
| terpapar (penduduk di zona bahaya tanpa evakuasi) | korban (untuk angka paparan) |
| bahaya, keterpaparan, kerentanan, kapasitas, risiko | dipertukarkan |
| penurunan muka tanah | amblesan, subsiden, dicampur (istilah asing miring sekali di glosarium) |
| skenario terburuk yang masuk akal | skenario kiamat, worst case tanpa definisi |
| kab/kota (tabel), kabupaten/kota (kalimat) | campuran |
| Bali dan Nusa Tenggara | Bali–Nusa Tenggara (en dash hanya untuk rentang) |
| nama provinsi dan kab/kota menurut Kepmendagri kode wilayah terbaru (Sumatera Utara); nama pulau satu ejaan (Sumatra) | ejaan pulau dan provinsi dicampur |

Kosakata padanan per bencana (satuan deteksi, indeks bahaya, tingkat resmi, lembaga
lapangan, dampak, musim) mengikuti tabel padanan `docs/multi-bencana/COPYWRITING.md` §5
(salinan di repo dari Rencana Multi-Bencana, terbaca generator dan QA); pola kalimat
tetap, kolom padanannya yang diganti. Istilah dan ambang resmi (kelas HTH, SPI, level
gunung api, status peringatan) dicocokkan ke halaman lembaga sebelum dipakai. Besaran
berbeda definisi (sumber daya vs cadangan, bahaya vs risiko vs kejadian) tidak dijumlah
atau dibandingkan; dasar hitung selalu ditulis.

### C4. Angka dan satuan

- Format id-ID lewat satu fungsi: titik ribuan, koma desimal, paling banyak 1 desimal
  (koordinat dan kinerja model boleh lebih bila sumbernya begitu; data resmi lembaga apa
  adanya sesuai presisi sumber); persen ribuan bertitik (+1.244%); persen paling banyak
  1 desimal, desimal seragam per kolom tabel; kolom persen yang harus berjumlah 100
  dibulatkan metode sisa terbesar; penyebut nol = sel kosong, bukan "0%"; tidak pernah "-0".
- Satuan selalu tertulis (jiwa, KK, ha, km², m³, m³/detik, liter/orang/hari, mm, mm/hari,
  hari tanpa hujan, °C, µg/m³, magnitudo "M 8,5" (atau Mw bila sumbernya begitu), MMI,
  cm/tahun). Satuan seragam naik ke kepala kolom;
  satuan campur jadi kolom Satuan.
- Kalimat memakai "ribu/juta/miliar/triliun"; "rb/jt" hanya di label sempit, dipisah
  spasi ("2,6 jt"); angka di tabel dan kartu ditulis penuh. Miliar dan triliun selalu
  ditulis kata, termasuk di label; bentuk ringkas "M" dan "T" dilarang karena "M" berarti
  magnitudo. Rupiah besar dalam miliar atau
  triliun lewat satu fungsi format. Cacah kecil di awal kalimat dieja.
- Simbol: arah dengan ikon vektor atau kata (§B1.5), ± ketidakpastian, ≤/≥ ambang, "<"
  berspasi, × rasio; tiap simbol harus ada di cmap Roboto (D-23). En dash hanya
  untuk rentang ("2015–2025", "1.200–4.800 jiwa") dan sel kosong ("–").
- Pembulatan sekali, setengah ke atas, di akhir hitungan. Satu aturan pembulatan per
  jenis sumber, ditulis di Bab Metodologi:

| Jenis angka | Aturan |
| --- | --- |
| Data resmi lembaga | apa adanya, sesuai presisi sumber |
| Hitungan titik panas, kejadian | persis, tanpa ± |
| Luas dari satelit | dibulatkan sesuai resolusi piksel, tanpa ± |
| Estimasi model/simulasi | rentang rendah–tinggi, dibulatkan 2 angka bermakna, diawali "sekitar" bila satu angka |
| Peluang | kelas atau dibulatkan kasar; nilai kecil "< 1%"; tidak pernah "100%" |
| Kinerja model (POD, FAR, CSI) | dibaca dari JSON uji, tidak diketik tangan |

- Perbandingan antar wilayah dinormalkan (per 100.000 penduduk atau per km²) dengan angka
  mutlak di kurung; pembaginya satu untuk seluruh dokumen.
- Skor gabungan tidak tampil telanjang: komponen dan bobotnya ada di tabel yang sama atau
  lampiran yang dirujuk. Bahaya ekstrem tunggal (zona megathrust, KRB III) menentukan
  kelas minimum dan tidak boleh tertutup rata-rata.
- Selain yang terburuk, sorot yang paling cepat memburuk dan yang paling membaik.
- Ketidakpastian dinyatakan eksplisit dengan besarnya dan sebabnya (di metode dan catatan
  tabel, bukan di kartu angka).

### C5. Tanggal dan waktu

- Judul dan kalimat: bulan penuh ("22 Oktober 2026"), karena dokumen formal (K13). Bentuk
  singkat ("22 Okt 2026") hanya di tabel, grafik, label, dan pil; tahun dua digit hanya di
  tabel lampiran yang sangat padat. Rentang dengan en dash ("15–22 Oktober", "15–22 Okt").
- Jam dengan titik dan zona: "23.00 WIB"; jam kejadian lokal di luar WIB boleh memakai
  zonanya (WITA, WIT). Agregasi harian nasional memakai hari kalender WIB penuh
  (00.00–23.59 WIB), tidak dijumlah lintas hari; cut-off ditulis apa adanya.
- Tanpa tanggal ISO mentah. Tanggal di sampul = tanggal terbit; tanggal di kolom/sumber =
  tanggal data. Tiap dataset menyebut cut-off sendiri; dua cap waktu bila sumbernya berbeda.
- Data hari berjalan diberi tanda "sementara" beserta jam tarik. Data basi diberi label
  umurnya, tidak ditampilkan seolah segar. Tahun berbeda tidak dicampur dalam satu
  indikator.

### C6. Integritas sumber

#### C6.1 Hierarki bukti

1. Status dan angka resmi lembaga (IRBI/InaRISK, DIBI, BMKG, PVMBG, PuSGeN, Badan
   Geologi, Kementerian PU, BPS, dokumen PDNA/R3P) ditampilkan lebih dulu, apa adanya,
   berlabel lembaga dan waktu terbit.
2. Sumber primer non-resmi terverifikasi (jurnal, data terbuka internasional).
3. Keluaran platform Pantau Bencana: pendukung, selalu berlabel, tidak pernah menimpa
   status resmi, diberi nama berbeda dari indeks resmi.
4. Sumber sekunder (media, ringkasan): hanya di draf dengan catatan "perlu verifikasi";
   tidak masuk naskah final sebelum dicocokkan ke dokumen primernya (aturan riset C).

Pengecualian karhutla (vonis pemilik 23 Okt: *"Karhutla udah pasti pakai data kita"*):
titik panas dan luas hitungan satelit dari Pantau Bencana (FIRMS) menjadi sumber utama,
berdampingan dengan luas resmi Kemenhut (SiPongi) berlabel Resmi; luas platform selalu
diberi catatan "Bukan luas resmi.". Fakta lapangan (status, korban, operasi) dari laporan
BPBD atau Koordalops.

#### C6.2 Label tingkat keyakinan

Wajib di tiap tabel (baris sumber atau per baris), kartu angka, dan kartu skenario.

| Label | Arti | Tampilan |
| --- | --- | --- |
| Resmi | Diterbitkan lembaga pemerintah berwenang | pil `navy` teks putih |
| Terverifikasi | Sumber primer non-resmi, dibaca langsung | pil garis `slate`, teks `teks` |
| Estimasi model | Keluaran model/simulasi; ditambah "belum diuji balik" atau "uji balik gagal" bila begitu | pil garis `oranye`, teks `teks` |
| Asumsi kebijakan | Nilai pilihan (VSL, biaya pengungsi per hari, stimulan sebagai batas bawah) | pil garis `teks-3` |
| Penilaian pakar | Posisi atau kelas hasil penilaian analis atau pakar, bukan rumus atau model (posisi matriks risiko §B5.27, bara risiko §B5.10) | pil garis `teks-3`, dibedakan dari Asumsi kebijakan oleh teksnya |

`KERANGKA.md` v3 prinsip 6 memakai lima label yang sama; `kosakata.keyakinan` di `tema.json` memuat
`penilaian-pakar`, dan pembangun deck mengurutkannya paling lemah (posisi hasil penilaian, bukan rumus atau model).

Tambahan di teks: kalimat bertanda "fakta" (diverifikasi langsung) atau "penilaian"
(pendapat analis yang bisa dibantah) di kotak temuan. Angka ilustrasi/contoh berlabel
"contoh" dan tidak dicampur dengan data observasi.

#### C6.3 Aturan model dan simulasi

- Vonis model wajib mengalahkan semua pembanding bermakna (acak, persistensi, peta bahaya
  statis, jumlah penduduk/bangunan) pada seri yang dipecah netral per waktu. Kalah = label
  "belum lulus", bukan disembunyikan.
- Kinerja tercatat dikutip apa adanya termasuk yang gagal, dibaca dari berkas ujinya saat
  build dan tidak diketik, baik di naskah maupun di pedoman ini:
  `public/data/kekeringan_ujibalik.json` (uji ambang SPI dan uji kejadian DIBI),
  `public/banjir/data/validasi.json` (banjir dan longsor),
  `public/banjir/data/risiko_ujibalik.json`, berkas uji gempa yang dirujuk `riset/D`, dan
  tabel Kinerja yang tercatat di Buku Pegangan (replay banjir, indeks kebakaran permukiman
  DKI, peluang "akan membesar" yang disembunyikan).
- Kekeringan punya dua uji dengan angka berbeda. Tabel rekonsiliasi Bab Metodologi wajib
  memuat baris "kinerja kekeringan: uji ambang SPI vs uji kejadian" dengan kedua angka,
  periode, dan pembandingnya.
- Udara: "perkiraan model CAMS, belum dikoreksi". Kekeringan Awas butuh dua bukti. OMC
  dievaluasi dengan kontrol dan plasebo, bukan klaim sebab-akibat. Peringatan dari berita
  "dari berita, belum diverifikasi"; peringatan ke depan wajib sumber resmi.
- Klasifikasi risiko hanya dari rumus tertulis di Metodologi; tidak ada tingkat yang tidak
  bisa dijelaskan rumusnya.
- Wilayah dengan kelengkapan data di bawah ambang tertulis tidak diberi skor; ditandai
  "data tidak cukup" (arsir), tidak dibaca sebagai risiko rendah.
- Angka model bahasa: model AI hanya menulis narasi; semua angka dari skrip deterministik
  yang bisa diulang.

#### C6.4 Pola bab/lampiran metode

Singkatnya (tanpa jargon, diakhiri catatan jujur) → Alurnya (Langkah 1…n) → Contoh dengan
data nyata → Rincian teknis → Batasan. Batasan model hanya di sini, tidak di kartu angka.

#### C6.5 Sumber dan lisensi

- Tiap sumber data dicatat sebelum dipakai: URL, format, frekuensi, lisensi/izin tayang
  ulang, status [OK]/[AUTH]/[BLOK]/[BV]. Yang [BV] tidak dibangun sebelum diambil sekali.
- Lisensi pihak ketiga tampil bila dipakai; lapisan berlisensi tertutup tidak tayang.
  InaRISK: "Sumber: InaRISK BNPB".
- Baris "Sumber:" menyebut lembaga/sistem dan periode, tanpa path internal
  (contoh: "Sumber: Pengolahan data Pantau Bencana dari IRBI BNPB 2025").
- Lambang dan logo resmi tidak digambar ulang.
- Konflik angka antar sumber ditampilkan berdampingan di tabel rekonsiliasi, bukan dipilih
  diam-diam.
- Klaim penyusunan yang terbantah selama kerja dicatat di Lampiran Metode (catatan revisi),
  tidak dihapus.

### C7. Konsistensi angka

Angka yang sama tampil sama di judul, kartu, tabel, peta, teks, PDF, DOCX, dan web, karena
dibaca dari satu JSON. Hitungan di judul = jumlah baris daftar = jumlah penanda di peta.
Kohort tidak dicampur dengan total. Gerbang D-6 memeriksa.

### C8. Larangan klaim

- Tidak ada angka tanpa sumber dan tahun. Baris tanpa sumber tidak tampil.
- Tidak ada klaim yang sumber primernya [TIDAK DITEMUKAN] (mis. "US$1 pencegahan hemat
  US$15").
- Tidak ada presisi palsu: estimasi model ditulis rentang.
- Tidak ada angka kerugian penuh per kab bila PDRB/aset per kab belum ada; yang ada ditulis
  sebagai batas bawah.
- Tidak menurunkan angka per kab dari kutipan per kota (penurunan muka tanah).
- Tidak menyebut biaya proyek (K6).
- Tidak menyatakan sebab-akibat dari korelasi.

### C9. Alur naskah dan aturan penulis

Arsitektur tahap naskah dari skill pemilik `deep-research` (`TAMBAHAN-RISET.md`; Buku Pegangan L56–L64).
Hasil diserahkan tanpa putaran tinjauan pemilik (K18, bawaan), jadi pemisahan peran di bawah adalah
pengganti pemeriksaannya.

**Urutan kerja per bab**

1. **Berkas bukti per bab disusun sebelum naskah.** Peneliti menyusun `naskah/<kajian>/bukti/bab-NN.md` dari riset A–D,
   `data/*`, dan sumber tambahan sebelum bab ditulis. Penulis bab tidak meriset sendiri: ia menulis
   hanya dari berkas bukti dan `data/angka.json` (angka sebagai token, §A5, D-22).
2. **Naskah** `naskah/<kajian>/bab-NN.md` mengikuti `bangun/NASKAH-SPEK.md`, §B, dan §C.
3. **QA lima lapis** (§D4): penulis, penyunting substansi, penyunting bahasa, proofread render,
   gerbang mekanis. Penyunting substansi menolak klaim naskah yang tidak ada di berkas bukti.

**Struktur berkas bukti.** Per pertanyaan kunci bab (pertanyaan pimpinan §A2 dan pertanyaan pembatas
bab §B5.2), empat bagian wajib:

| Bagian | Isi |
| --- | --- |
| Inti | Jawaban satu sampai tiga kalimat atas pertanyaan itu |
| Temuan bersumber | Tiap butir bersumber (pustaka, kunci `angka.json`, atau berkas data) dan berlabel keyakinan §C6.2; temuan yang membantah ditulis sebagai "dibantah oleh" |
| Inferensi | Analisis tim yang ditarik dari temuan, ditandai sebagai penilaian |
| Celah | Yang dicari dan tidak ditemukan, berikut data yang diminta dari lembaga pemegangnya |

Berkas tanpa empat bagian ditolak (§D4).

**Evaluasi sumber.** Fakta dipisah dari spekulasi dan sumber asli dari agregator. Berita hanya dipakai
bila sumber resmi tidak ada dan ditandai (§C6.1 butir 4); agregator diganti sumber aslinya; konflik
angka ditulis berdampingan di tabel rekonsiliasi (§C6.5).

**Aturan penulis**

- **Kalimat faktual tanpa sumber dipindah ke Celah atau dihapus.** "Diperkirakan" tidak dipakai untuk menutupi ketiadaan sumber (§C8).
- **BLUF.** Ringkasan Eksekutif dan kotak ringkasan bab (§B5.3) dibuka temuan terpenting berangka,
  lalu arti dan dampaknya bagi BNPB.
- **Temuan berangka di kalimat pembuka tebal dan judul kotak temuan.** Judul bab tetap baku dan
  kapital (T1); judul subbab tingkat 2 dan 3 deskriptif stabil (§C2, U7).
- **Prosa padat.** Paragraf isi berbentuk prosa; daftar butir hanya untuk enumerasi sejajar (lembaga,
  langkah), dan rasio butir terhadap paragraf per bab dilaporkan (§D4). Angka kunci ditebalkan lewat
  kalimat pembuka tebal gaya Isi Temuan (§B2); tebal tambahan di tengah paragraf tidak dipakai
  (`ANTI-SLOP.md` M-12). Rujukan ditaruh pada klaim besar, angka, dan dokumen.
- **Tiap angka utama disertai pembanding dan artinya bagi keputusan.** Pembandingnya target RPJMN,
  tahun lalu, provinsi lain, atau standar internasional.
- **Argumen tandingan.** Rekomendasi besar yang diperdebatkan (tanggul laut, normalisasi lawan
  naturalisasi sungai, relokasi) menampilkan argumen tandingan dan bukti kegagalan, misalnya pola
  Empat Sungai Korea, lalu posisi kajian. Ketidakpastian dinyatakan dengan besar dan sebabnya (§C4).
- **Kesimpulan tanpa ulangan.** Bab Kesimpulan dan Rekomendasi berisi keputusan dan implikasi, tidak
  mengulang paragraf bab sebelumnya; detektor pengulangan kalimat lintas bab memeriksanya (§D4).

Tidak dipakai dari skill: batas 15 panggilan alat per peneliti (penelusuran per bab perlu lebih
dalam), laporan tanpa daftar butir sama sekali (dokumen kebijakan butuh enumerasi lembaga dan langkah;
dibatasi, bukan dilarang), judul bab naratif (T1), dan judul subbab tingkat 3 berangka (U7).

---


## D. Gerbang QA sebelum kirim

Aturan tanpa gerbang mekanis dianggap belum jadi. Gerbang dibangun sebelum naskah ditulis
(`data/kajian-bnpb/qa/periksa.py`; pemiliknya `pipa-data` menurut `ilmu.mjs pemilik`,
atau `penulis-gerbang` bila ujinya ditaruh di `tests/agen/`), dijalankan pada tiap build,
dan berhenti pada temuan pertama. Satu butir gagal = belum selesai.

Status 23 Okt 2026 (v1.3): `qa/periksa.py`, `qa/uji.py`, dan `qa/cakupan.json` sudah ada. Menurut
`qa/cakupan.json`, 22 kode diuji dengan fixture negatif, 10 masih `antre` (D-8, D-18, D-21, D-24
sampai D-30), "D-12 PDF ringkas" dikecualikan karena P13, dan gerbang tambahan T-1 sampai T-4 (sisa
sintaks naskah, jumlah halaman PDF sama dengan dokumen asal, tautan gambar, anti-slop) ikut diuji.
`qa/uji.py` menolak kode D di tabel D1 yang tidak terdaftar di `qa/cakupan.json`, jadi kode D baru
hanya ditambahkan bersama gerbang dan fixture-nya (atau alasan pengecualian); pemeriksaan baru di §D4
belum berkode karena itu. Kode yang `antre` dan pemeriksaan §D4 berstatus belum jadi menurut standar
uji pemilik.

Standar uji pemilik berlaku:
- **Fixture negatif per gerbang**: `qa/fixtures/` berisi satu berkas gagal per kode (DOCX,
  SVG, atau HTML kecil yang sengaja melanggar). Gerbang yang tidak menolak fixture-nya
  dianggap rusak. Pola yang punya pengecualian (D-16) membawa fixture positif dan negatif.
- **Registri cakupan** `qa/cakupan.json` dengan tiga daftar: `diuji`, `dikecualikan`
  (berikut alasan), `antre`. Aturan baru di pedoman masuk salah satu dari dua yang pertama;
  `antre` hanya boleh menyusut.
- **Pesan gagal** menyebut kode, berkas, lokasi (halaman, paragraf, atau objek), nilai yang
  ditemukan, ambang, dan sebab teknisnya, mis. `D-5 lengkap.docx p.412: w:sz=14 (7 pt) < 16
  (8 pt), gaya "Catatan tabel"`.
- **Cakupan berkas**: D-1, D-2, D-3, D-10, dan D-16 dijalankan pada `word/document.xml`,
  footnotes, headers, `pdftotext`, SVG sumber tiap PNG (label, legenda, judul), `ppt/slides/*.xml`
  deck, serta HTML dan JSON peta web.

### D1. Gerbang mekanis

| Kode | Pemeriksaan | Cara |
| --- | --- | --- |
| D-1 | Em dash nol | hitung U+2014 = 0 pada semua berkas cakupan |
| D-2 | Titik tengah nol | idem untuk U+00B7 (dengan atau tanpa spasi), termasuk `<title>` HTML |
| D-3 | Emoji nol | regex rentang emoji Unicode = 0 |
| D-4 | Font hanya Roboto | `w:rFonts`, `theme1.xml`, `numbering.xml` (font butir), `pdffonts`, dan `font-family`/`@font-face` CSS: hanya keluarga Roboto; tanpa URL font CDN |
| D-5 | Huruf terkecil ≥ 8 pt | semua `w:sz` ≥ 16 (half-point); ukuran teks di PNG dicek dari SVG sumber |
| D-6 | Angka silang | angka kunci dan kalimat `tesis.<kajian>` di `data/angka.json` dicari di teks DOCX, PDF, PPTX, dan JSON web; semua sama; tesis identik di kalimat pertama Ringkasan Eksekutif, Bab Kesimpulan, dan slide Pesan Kunci deck; baris Jumlah = jumlah baris tampil; subtotal = total; hitungan judul = jumlah baris |
| D-7 | Tiap Gambar dan Tabel bernomor, berurutan, tanpa nomor ganda atau loncat, punya baris "Sumber:" sebagai paragraf pertama sesudah objek, masuk Daftar Tabel/Gambar; legenda tabel berada di baris terakhir tabel (§B5.7) | parse Caption + paragraf sesudah objek; fixture tabel berlegenda di baris terakhir (lolos) dan tabel dengan paragraf legenda di antara tabel dan "Sumber:" (gagal) |
| D-8 | Peta: legenda ada (manifest render `legenda: true`), tidak ada irisan kotak label/bulatan/badge, nama provinsi ≥ 8 pt, unsur peta resmi tercatat (sumber batas, sistem referensi, proyeksi, inset untuk peta pulau/provinsi, catatan batas tidak resmi bila berlaku) | perender peta menulis bounding box dan unsur peta ke manifest; uji irisan dan kelengkapan |
| D-9 | Hex di luar `tema.json` nol | daftar putih: tiap hex di DOCX, SVG, HTML, CSS, dan JSON gaya ada di `tema.json`; §B1.6 jadi fixture negatif |
| D-10 | Istilah terlarang nol | daftar dari `glosarium.json`: "titik api", "perkiraan satelit", "provinsi prioritas" (kecuali kutipan resmi bertanda), "hujan pertama", "kamu", "Anda", "100%" pada peluang, "pra bencana", "pra-bencana", "subsiden", "amblesan", "Bali–Nusa Tenggara", "[SEKUNDER]", "TIDAK DITEMUKAN" |
| D-11 | Kapital penuh | paragraf bergaya Heading 2 ke bawah dan isi tanpa kapital penuh, kecuali daftar singkatan resmi dan gaya yang dikecualikan (kepala kolom, pil, label pita, Heading 1, judul bagian depan; T1) |
| D-12 | Panjang | halaman isi DOCX hasil soffice dari Bab 1 sampai sebelum judul Daftar Pustaka (T9): kajian air ≤ 104 (110 dikurangi 5% untuk beda paginasi Word), kajian mitigasi ≤ 142 (150 dikurangi 5%). PDF ringkas dicabut (K17; dikecualikan di `qa/cakupan.json`); jumlah halaman PDF sama dengan dokumen asal diperiksa T-2 |
| D-13 | Penomoran | sampul tanpa nomor; romawi di bagian depan; Bab 1 = 1; bidang TOC, Daftar Tabel/Gambar/Lampiran, dan Caption ada dan hasilnya terisi (indeks diperbarui lewat UNO, §B4); `w:updateFields` aktif |
| D-14 | Label keyakinan | tiap tabel dan kartu skenario punya salah satu dari lima label §C6.2 (Resmi, Terverifikasi, Estimasi model, Asumsi kebijakan, Penilaian pakar); pil di luar daftar itu ditolak |
| D-15 | Atribusi foto | tiap gambar foto punya baris "Wikimedia Commons, pengarang, lisensi" dan entri di Lampiran Atribusi; lisensi bukan NC/ND |
| D-16 | Format angka | tolak `\d,\d{3}\b`, `\d\.\d{1,2}\b`, tanggal ISO, dan jam bertitik dua. Dikecualikan: gaya Heading, Caption, dan TOC; pola `(Tabel\|Gambar\|Bab\|Lampiran) \d+(\.\d+)*`; nomor subbab di awal paragraf; jam `\b\d{2}\.\d{2} (WIB\|WITA\|WIT)\b`; angka kinerja model yang tercatat di manifest injeksi. Tiap pola dan pengecualian punya fixture |
| D-17 | Judul ≤ 2 baris, tanpa "…" terpotong | ukur dari render PDF (pdfplumber) |
| D-18 | Invarian wilayah | jumlah kab per provinsi sesuai katalog; dua digit pertama kode kab = kode provinsi; 38 provinsi, 514 kab/kota, 119 kab/kota Jawa lengkap di lampiran |
| D-19 | Pustaka | tiap entri dikutip di teks dan sebaliknya; tanpa path internal |
| D-20 | Standar tabel | tiap tabel data: `w:tblHeader` di baris kepala, isi kepala `navy` (tabel lampiran: tanpa isi, garis bawah 1 pt), angka rata kanan, tanpa garis vertikal, tanpa pita selang-seling; parse `w:tbl` |
| D-21 | Legenda grafik | tiap PNG grafik punya manifest `legenda: true` dan entri legenda = seri dan warna yang tergambar |
| D-22 | Angka ketikan nol | tiap angka di `document.xml` ada di manifest injeksi, kecuali tahun, nomor bab/tabel/gambar/lampiran, nomor halaman, dan nomor regulasi |
| D-23 | Glif di luar Roboto nol | tiap karakter di `document.xml`, footnotes, headers, SVG, dan HTML ada di cmap berkas Roboto yang dipakai (▲ U+25B2, ▼ U+25BC, → U+2192, ◦, ▪, ✓ tidak ada) |
| D-24 | Satu hex satu arti per halaman | tidak ada hex yang tercatat dalam dua peran (kategori, skala, aksen, permukaan) pada satu halaman; dibaca dari `manifest.json` generator (§B1.8) |
| D-25 | Satu ikon satu arti | tiap konsep di registri ikon `tema.json` punya glif unik; tiap ikon di keluaran berasal dari registri |
| D-26 | Kalimat pembuka tebal | tiap paragraf bergaya "Isi Temuan" (§B2) dibuka run Bold yang memuat angka; kalimat Bold itu ≤ 2 baris pada render; semua paragraf isi Bab 4–7 kajian air dan Bab 4–10 kajian mitigasi bergaya Isi Temuan, sehingga gerbang tidak bisa dihindari dengan memakai gaya Isi | parse `w:p` per bagian; panjang baris dari pdfplumber |
| D-27 | Temuan dan rekomendasi bertaut | token `Temuan [A-C]\.\d+` dibaca dari semua paragraf kecuali gaya Caption dan Judul Lampiran; tiap kode di halaman Pesan Kunci muncul lagi di paragraf Ringkasan Eksekutif sesudah halaman Pesan Kunci dan di subbab yang dirujuknya ("Bab x.y"); tiap baris rekomendasi §B5.13 memuat "Dasar:" dengan ≥ 1 kode temuan yang ada; tidak ada kode temuan yatim; fixture berisi "Tabel A.1" dan "Gambar B.2" di lampiran harus lolos tanpa dihitung sebagai temuan | parse teks DOCX |
| D-28 | Pilih grafik | manifest tiap PNG grafik mencatat `pesan` (G1–G24) dan `jenis`, atau alasan bila di luar tabel; pasangan `pesan` dan `jenis` dicocokkan ke kolom Grafik tabel pilih grafik §B5.10 (G1 batang tegak, G2 batang per dekade atau garis, G4 dan G5 batang horizontal, G6 dumbbell, G19 koroplet, G20 simbol sebanding, dan seterusnya) dan pasangan lain ditolak; manifest peta mencatat `besaran` (rasio, indeks, total) dan koroplet untuk total ditolak; `anotasi` ≤ 3; jenis G25 ditolak; batang lebih dari 24 tanpa diringkas ditolak; batang bertumpuk lebih dari 5 segmen ditolak; sumbu Y pada batang ditolak; pil kanan atas ≤ 1 | manifest render grafik |
| D-29 | Peta kecil berganda | panel dalam satu kelompok berbagi `kelas`, `skala`, dan satu `legenda` yang identik | manifest render peta |
| D-30 | Pesan Kunci dan studi kasus | halaman Pesan Kunci memuat 6–8 temuan, tiap temuan ≤ 3 baris pada render; tiap halaman studi kasus memuat tepat empat label Masalah, Pelaksana, Cara, Hasil | parse DOCX; panjang baris dari pdfplumber |
| D-31 | Rekomendasi dan keterangan | kolom LANGKAH matriks rekomendasi ≤ 8 kata; tiap keterangan Gambar dan Tabel memuat tahun atau periode (`\d{4}`) | parse tabel §B5.13 dan paragraf Caption |
| D-32 | Catatan grafik | paragraf "Catatan:" sesudah "Sumber:" paling banyak satu baris pada render dan 120 karakter | parse paragraf sesudah objek; panjang baris dari pdfplumber |

### D2. Gerbang visual (manusia/agent membaca)

1. Render: DOCX dengan `soffice --headless --convert-to pdf` sesudah indeks diperbarui,
   deck dengan `bangun/pptx/deck.py --pdf` (soffice), lalu `pdftoppm -r 110 -png`.
2. Baca setiap PNG halaman, bukan sampel. Laporan "sudah rapi" tanpa melihat PNG tidak
   dihitung sebagai bukti.
3. Daftar periksa per halaman: tidak ada teks turun baris tak sengaja, tumpang tindih,
   isi menempel ke tepi panel, garis footer pendek, ruang putih menganga, tabel lanjutan
   yang hanya berisi sisa sedikit baris, penunjuk halaman lampiran salah, data basi tanpa
   tanda, setiap warna berlegenda.
4. Per bab, kalimat Bold pembuka paragraf dibaca berurutan tanpa isi lainnya; bila alur bab tidak
   terbaca dari kalimat itu saja, kalimat pembukanya ditulis ulang (SINTESIS P17).
5. Peta web dibuka di 1440 dan 390 px dan dibandingkan dengan PNG.
6. Judul slide deck dibaca berurutan sebagai ringkasan (Buku Pegangan S6), lalu tiap slide dibaca
   pada render. Proofread lapis (d) §D4 dilakukan di sini, pada render halaman utuh, bukan pada
   Markdown.

### D3. Proses kerja

- Pemilik meminta tidak ada pertanyaan lagi; hasil diserahkan tanpa putaran tinjauan pemilik (K18,
  bawaan). Pedoman sebelum v1.3 meminta grand design dan halaman contoh (satu halaman per komponen B5)
  disetujui pemilik dulu; persetujuan itu kini diganti pemeriksaan penyunting independen berkonteks
  bersih sebagai bawaan yang bisa dibalik pemilik, lalu produksi mengikuti contoh itu. Kata Pengantar
  satu-satunya bagian yang ditandai untuk diperiksa pemilik (T7). Pertanyaan terbuka memakai bawaan
  `KEPUTUSAN.md` T1–T13 atau U1–U7 di §0.2.
- Opus merencanakan dan memegang kontrak (pedoman ini, kerangka, tesis); Sonnet menulis bab
  dan membangun generator; Haiku menjalankan pemeriksaan pola. Pemeriksa adalah subagent
  baru berkonteks bersih, bukan penulis babnya; hasil agent dibaca sendiri, laporan agent
  bukan bukti.
- Perubahan pada satu kembaran (PDF/DOCX/web, atau kajian air/mitigasi) ikut ke semua
  kembarannya.
- Pedoman ini bila diterbitkan sebagai artifact diterbitkan ulang ke URL yang sama.
- Subagent tidak commit, push, atau deploy; pengiriman ke Kepala BNPB diputuskan pemilik.
- Definisi selesai: semua D1 lolos, D2 dibaca seluruhnya, lima lapis §D4 selesai dengan
  laporannya, semua bab LULUS ambang anti-AI (T-8), laporan QA per deck LOLOS (S39), angka kunci diverifikasi
  oleh pemeriksa terpisah, dan laporan akhir menyebut apa yang belum.

### D4. QA lima lapis dan pemeriksaan naskah

Dari skill pemilik `book-production-rules` (lapis dan produksi, `TAMBAHAN-BUKU.md`), `anti-ai-checker`
(ambang, `TAMBAHAN-ANTI-AI.md`), `deep-research` (berkas bukti, `TAMBAHAN-RISET.md`), dan
`alfatehan-pptx-rules` (laporan per deck, `TAMBAHAN-PPTX-RULES.md`). Karena hasil diserahkan tanpa
putaran tinjauan pemilik (K18, bawaan), fungsi pembaca beta dijalankan penyunting independen di lapis
(b) sampai (d).

**Lima lapis, berurutan.** Laporan tiap lapis ditulis ke `keluaran/qa/`.

| Lapis | Pelaku | Yang diperiksa | Padanan `ANTI-SLOP.md` §6.1 |
| --- | --- | --- | --- |
| (a) Penulis | penulis bab | memeriksa sendiri terhadap berkas bukti, `angka.json`, dan daftar M `ANTI-SLOP.md` | tahap 1 |
| (b) Penyunting substansi | subagent berkonteks bersih, bukan penulis | cek fakta tiap angka ke `angka.json` dan sumbernya; klaim yang tidak ada di berkas bukti ditolak; paragraf tanpa angka, sumber, atau keputusan dipotong; data ditafsirkan dan argumen tandingan ada (§C9) | tahap 2 |
| (c) Penyunting bahasa | subagent berkonteks bersih, bukan (a) atau (b) | KBBI, PUEBI, glosarium, anti-slop dan ambang anti-AI di bawah, BLUF, judul subbab deskriptif dan temuan berangka di kalimat pembuka (§C2) | tahap 2 |
| (d) Proofread render | mata baru, bukan (a) sampai (c) | PDF hasil render halaman utuh, bukan Markdown (§D2 butir 3, 4, dan 6) | – |
| (e) Gerbang mekanis | `qa/periksa.py` | §D1 dan gerbang T-1 sampai T-4 | tahap 3 |

**Ambang anti-AI per bab** (skill `anti-ai-checker`; Buku Pegangan bab Angka & copy). Dibaca `qa/slop.py`
(S-1, S-17, S-18 per kemunculan, S-40 titik dua, S-41 hedging, S-42 pembuka klise, S-43 kata terlarang khas AI;
`AMBANG_KODE`) dan ditegakkan gerbang `qa/periksa.py` T-8 (terdaftar di `qa/cakupan.json` bersama fixture).

| Cek | Ambang | Catatan |
| --- | --- | --- |
| Em dash | 0 di teks tampil | D-1; skill membolehkan 3 per 1.000 kata, aturan pemilik lebih ketat |
| Titik dua | ≤ 20 per 1.500 kata di paragraf isi | Label tabel, keterangan gambar ("Gambar 3.1"), dan "Sumber:" tidak dihitung |
| Pembuka klise | nol di 50 kata pertama tiap bab dan tiap subbab | "Di era", "Dalam lanskap", "Seiring perkembangan zaman", "Tidak dapat dipungkiri", "Pada hakikatnya", "Sebagaimana kita ketahui", "Dalam rangka", "Perlu diketahui" |
| Hedging | ≤ 2 per 1.500 kata | "perlu dicatat bahwa", "patut dicatat", "penting untuk diperhatikan", "dapat dikatakan bahwa", "tampaknya", "cenderung" tanpa data |
| Tiga-serangkai | 0 (gaya) | Skill membolehkan 5 per 1.000 kata; Buku Pegangan melarang (Bahasa lugas, 19 Okt). Di DOCX daftar tiga yang faktual (nama diri atau angka) tidak dihitung; di deck tanpa pengecualian (`ANTI-SLOP.md`) |
| Kata terlarang khas AI | nol | `riset/anti-slop/banned-ai-words.txt` (182 baris) untuk teks Inggris; padanan Indonesia baru sebagian di `ANTI-SLOP.md` S-12 (mulus, menavigasi, mendalami, menyelami, memulai perjalanan, memupuk, mendayagunakan, dan kokoh belum masuk) |

Vonis per bab: nol pelanggaran LULUS; 1–2 GAGAL RINGAN, ditulis ulang penyunting; 3 atau lebih GAGAL
BERAT, bab dikembalikan ke penulis, ditulis ulang, dan dipindai ulang. Semua bab wajib LULUS sebelum
serah (aturan proses orkestrator; K18 bawaan). Laporan per bab memakai format skill (berkas, jumlah kata, status,
jumlah pelanggaran, kata terlarang berikut lokasi paragraf, rasio em dash dan titik dua, pembuka, usulan tulis
ulang, vonis): `python3 qa/slop.py --ambang --laporan keluaran/qa/slop-<kajian>.md <docx>`; pembangun DOCX
menulisnya sendiri tiap build. S-18 kini menghitung tiap tiga-serangkai gaya; daftar faktual (nama diri atau
angka) di DOCX dan set istilah resmi (tahap PB menurut UU 24/2007, komponen IRBI) tidak dihitung.

**Pemeriksaan naskah dan produksi.** Yang sudah bergerbang berkode T (gerbang tambahan `qa/periksa.py`, terdaftar
di `qa/cakupan.json` dengan fixture negatif dan positif); sisanya belum bergerbang.

| Pemeriksaan | Ambang | Cara | Asal |
| --- | --- | --- | --- |
| Berkas bukti | tiap `naskah/<kajian>/bukti/bab-NN.md` memuat Inti, Temuan bersumber, Inferensi, dan Celah per pertanyaan kunci | parse Markdown | §C9, skill `deep-research` |
| Klaim tanpa rujukan | paragraf isi tanpa rujukan atau token angka dihitung dan dilaporkan per bab | parse naskah | §C9 |
| Rasio butir | rasio butir terhadap paragraf per bab dilaporkan | parse naskah | §C9 |
| Pengulangan lintas bab | kalimat Bab Kesimpulan yang mengulang kalimat bab lain ditolak | detektor pengulangan kalimat | §C9 |
| Kepadatan pustaka | kajian mitigasi ≥ 80 dan kajian air ≥ 50 sumber dirujuk; ≥ 50% resmi atau primer; ≥ 8 sumber berbeda per bab | T-11: blok `pustaka` manifest DOCX (kunci `pustaka.json` per bab, ditulis `bangun/docx`); ambang `tema.json` `qa.pustaka` berlaku untuk naskah berstatus final, draf hanya diperiksa keutuhan kuncinya | §B5.17, skill `book-production-rules` |
| Singkatan dan varian terlarang | singkatan tanpa kepanjangan pada kemunculan pertama per bab dan varian terlarang `glosarium.json` berjumlah nol | T-9 (prosa tiap BAB) dan D-10 (`terlarang`, seluruh teks tampil) | §B5.18 |
| Ejaan | kata tak dikenal yang bukan istilah glosarium atau nama diri berjumlah nol per bab | T-10: kamus `id_ID` (`bangun/kamus/id`) lewat `spylls` di venv | §B2 |
| Pemenggalan | tidak ada baris rata kiri-kanan dengan celah antarkata lebih dari 3 kali normal | ukur dari PDF | §B2 |
| Metadata | properti inti DOCX, PDF, dan PPTX terisi (judul, penerbit BNPB, subjek, kata kunci, bahasa id-ID); outline PDF memuat judul bab dan subbab | uji diri `bangun/docx/uji.py` (properti DOCX, metadata dan `/Lang` PDF, bookmark bab dan subbab) dan `bangun/pptx/deck.py` (properti PPTX) | §B4 |
| Laporan QA per deck | font, ikon, tata letak, dan anti-AI masing-masing LOLOS | `bangun/pptx/periksa.py` `laporan()` ke `keluaran/qa/deck-<nama>.md`, kosakata LOLOS dan GAGAL seperti `qa/periksa.py`; uji diri menuntut contoh LOLOS dan fixture em dash GAGAL | Buku Pegangan S39 |
| Pemeriksaan deck kajian | judul berurutan, kode bagian, label keyakinan, satu warna sorot, spek berisi `pesan_kunci` dan `pesan`, variasi jenis slide, raster dari daftar izin, paling banyak 6 butir | `deck.py` menolak saat membangun (S7, S34, S35, S38); laporan QA deck memeriksa S6, S35, S36, S37, S38 dari berkas jadi; kode bagian, warna sorot, dan S8 masih manual | S1–S39 |

---
