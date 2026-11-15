# RISET: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`. Riset ini memetakan kode yang bisa dipakai ulang, praktik penanganan, data publik, dan celah per bencana. Dibaca 15 Nov 2026 di HEAD 504ed9ba4. Nomor baris bisa bergeser; cek ulang sebelum dipakai di tiket.

Label kepercayaan mengikuti `docs/multi-bencana/PRAKTIK-PENANGANAN.md`: **[korpus]** dibaca dari `data/hukum/peta_peraturan.json`, **[repo]** ada di dokumen atau kode repo, **[ingatan]** belum dicek ke naskah, **[perlu cek]** nomor, pasal, atau angka yang ragu dan tidak boleh dikutip ke dokumen resmi sebelum dicek ke penerbitnya. Tidak ada angka ambang dari [ingatan] yang dipakai di layar (Q9).

## 1. Kode repo yang dipakai ulang per alur kerja

Prinsip D1: dibangun sekali, dipasang ke semua bencana lewat `public/bencana.json`. Kolom "Perlu diubah" adalah celah yang menutup paritas.

### W1 Operasi dan renlap generik (G01, G02, G03, G10, A22, A23)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `src/operasi_lapangan.js:21-52` | konstanta `JENIS_SUMBER`, `PRIORITAS`, `STATUS_PATROLI`, `TRANSISI`, `BATAS`, `SELANG`, `POMPA` | jenis sumber dan sarana bergantung bencana (perahu, heli evakuasi, tenda, terpal) |
| `src/operasi_lapangan.js:161-163` | `bencanaTugas` memakai `bencanaPer`; `infoKluster` menolak selain karhutla | penolakan di baris 163 benar untuk kluster api, tetapi jalur operasi lain tidak boleh ikut menolak (audit banjir G02) |
| `src/operasi_lapangan.js:363,599` | percabangan `bc === "karhutla"` untuk teks riwayat dan label | label dari registri, bukan percabangan |
| `src/operasi_udara.js:12,282` | `PERAN_BACA`, tabel `RUTE_OPERASI`, pembungkus `bungkus` | rute baru untuk jenis non-udara tanpa menyalin |
| `src/operasi_isian.js:12,206` | `PERAN_TULIS = ["pusdalops"]`, `RUTE_ISIAN`, isian manual berjejak | Q3: tambah akun instansi BPBD wilayah sendiri |
| `src/operasi_hasil.js:10-60` | `GUNA_PERAN`, `nilaiAksi`, `lengkapi`: hasil aksi dan api muncul lagi | padanan "hasil tindakan" untuk operasi darat |
| `src/operasi_nilai.js:33-74` | nilai M1-M11 | metrik generik |
| `src/sippa.js:23-38` | `P_SIPPA_BACA`, `LAYAR_SIPPA`, kit, templat, `pindah_banjir` | sarana non-pipa (G03) |
| `src/sippa.js:1904` | `RENLAP_BERLAKU_MS` (14 hari) dan `kedaluwarsaRenlap` | pola masa berlaku renlap |
| `scripts/operasi/renlap.py` (35 KB), `renlap_banjir.py` (`buat` baris 278, `daftar` 317, `peta_pdf` 346), `renlap_pdf.py` | skor target, PDF per base, KML, GPX, TXT WA, JSON | `renlap_banjir.py` masih CLI tanpa versi, R2, atau layar (audit banjir G10); satu mesin renlap, bukan salinan |
| `scripts/operasi/sumber_air.py`, `bobot_renlap.json` | sumber air, bobot HIPOTESIS | bobot per bencana ditandai hipotesis |
| `public/operasi.js`, `operasi_laporan.js`, `operasi_peta.js`, `operasi.css` | layar `/operasi` model A | seksi per jenis dari registri |
| `scripts/umum/tugas.py:18,159` | tugas kekeringan, gunung api, cuaca (`adaptor_cuaca`); jadwal `lintas.yml:293` | alur khusus per jenis (alat berat longsor, SAR runtuhan) |
| `src/penugasan.js:42-47` | daftar periksa per jenis (banjir, gempa, gunung api, kekeringan, udara) | pesisir dan longsor belum |
| `src/instansi.js:335` | `bencanaPer` memetakan tugas ke bencana | jenis pesisir tidak ada (audit pesisir G01) |

### W2 Pembuat dokumen (G04, G08, G11)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `scripts/umum/laporan_kejadian.py:33-68,168,230` | tabel `MODUL` per bencana (banjir, cuaca, udara, kekeringan, ...), `ukur`, `satu`, kronologi per KIB | modul longsor, pesisir, gunung api (`:13` belum memicu), gempa lengkap |
| `scripts/umum/laporan.py`, `laphar_arsip.py` | laporan harian dan arsip | sitrep dan renops per jenis |
| `data/laporan-bnpb/generator/harian.py`, `penanganan_banjir.py`, `situasi_banjir.py`, `harian_prediksi.py`, `harian_lampiran.py` | deck harian dan penanganan; mesin deck lewat skill `ppt-konsultan` | deck Penanganan per bencana; bot WA `scripts/wa/otomatis.mjs:42` |
| `src/laporan_bencana.js`, `public/laporan_bencana_spek.js`, `laporan_bencana_wa.js` | laporan multi-bahaya | memuat semua jenis |
| `src/laporan_berkala.js`, `scripts/berkala/` | **tidak ada di repo**; hanya paket `data/kajian-bnpb/laporan-berkala/` | dibangun satu kali (D9); paket ini memastikan tiap bencana menyediakan angka |
| `public/siklus/renkon.js`, `gladi.js`, `kejadian.js`, `kaji.js`, `pulih.js`; `scripts/siklus/` | renkon, gladi, Buku Besar Kejadian, Jitupasna ke R3P | kejadian per bencana dipetakan, bukan buku baru (D10) |
| `public/gempa/laporan.html`, `public/kekeringan/laporan.html`, `public/cuaca/laporan.html`, `public/gunungapi/laporan.html` | laporan harian per bencana (kontrak v1) | digabung ke perakit generik |

### W3 Peringatan dini dan tangga tindakan (G09, G05)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `src/ews.js:194-214` (banjir, longsor, rob), `:200-207` (cuaca), `:221-230` (gempa dan tsunami) | penilaian tiap jam atau menit, kesegaran data `:360` | aturan gunung api, kekeringan, udara, gelombang dan abrasi |
| `src/peringatan.js:37-40,74-84,90-108,186` | peringatan terpadu: gempa Waspada dan Siaga, nowcast Severe jadi Siaga, banjir, daftar jenis | jenis baru masuk daftar `:186` |
| `src/ews_email.js`, `src/push.js:151-202`, `src/berantai.js` | email, push naik status, peringatan berantai | ikut otomatis bila jenis terdaftar |
| `public/ews_tindakan.js:19,93` | `BENCANA` (karhutla, banjir, longsor, cuaca, gempa, tsunami, rob), `tindakanUntuk` | tambah gunung api, kekeringan, udara, pesisir |
| `public/inti/peringatan.js`, `peringatan-berita.js` | pop-up peringatan terpadu | jenis baru |
| `src/dalops.js:28-33`, `public/bnpb/dalops.js:21-29`, `scripts/data/dalops_kabar.py:23-31`, `dalops_banjir.py:36`, `src/dalops_tindak.js` | Pantau Dalops: jenis, saringan, cek kabar luar, tindak lanjut | jenis udara (`src/dalops.js:31` tanpa udara), gunung api (`dalops_kabar.py:23` `AMBANG` tanpa gunung api), pesisir rob |
| `scripts/prediksi/tangga.py:224`, `catat.py:16-20`, `kalender.py:9` | tangga skala dan kalender ancaman | ambang tangga (Q9) |
| `docs/multi-bencana/PERINGATAN-DINI.md` | aturan pemicu yang berlaku | rujukan, tidak diulang |

### W4 Dashboard pimpinan dan papan status darurat (C21, A30, C19)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `public/inti/dasbor.css` (22,5 KB), `dasbor.js`, `dasbor_admin.js`, `jam_aturan.js` | dashboard model A | muatan per jenis |
| `tests/agen/gerbang-dasbor.test.mjs:12-26` | daftar `LAYAR` dan `MODEL_A` | tiap layar dashboard baru masuk daftar di commit yang sama |
| `public/inti/kartu.css`, `kartu.js` | kartu standar `.ex.ex-std` (AGENTS.md 3.5) | kepala = nama seksi |
| `src/logbook.js:372-403`, tabel `logbook_sk` (migrasi 0094) | SK status darurat per kejadian: tingkat, wilayah, nomor, `tmt_mulai`, `tmt_selesai`, `perpanjangan_ke`; SK provinsi didahulukan | papan per wilayah dan hitung mundur; Q5 bawaan memakai tabel ini |
| `scripts/umum/status_darurat.py` (39 KB), `saran_status.py` | pengenal dan saran status | pengenal gunung api, udara, kekeringan |
| `public/bnpb/kinerja.html`, `sitrep.html`, `rapor-sumber.html` | layar dashboard yang sudah model A | pola yang ditiru |

### W5 Keputusan ekonomi, pencegahan, prioritas (A24, A25, A14)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `scripts/umum/harga_pangan.py` | harga pangan (Panel Harga Pangan) | koefisien logistik (Q6) |
| `scripts/umum/bangunan.py`, `paparan_bangunan.py`, `lab_kerusakan.py` | paparan bangunan dan kerusakan | koefisien harga bangunan dari IHPB atau IKK BPS |
| `scripts/umum/kalender_ancaman.py` | kalender ancaman per daerah | prioritas wilayah |
| `scripts/umum/profil_wilayah.py`, `public/inti/profil_wilayah.js` | profil wilayah | prioritas dan pencegahan |
| `scripts/bnpb/kebutuhan.py` | perkiraan kebutuhan | basis angka |
| `scripts/gunungapi/risiko.py` | prioritas gunung api sudah ADA (A14) | contoh untuk bencana lain |

### W6 Bukti model (B03, B04, B05, B06, C16, B01, B02)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `scripts/prediksi/catat.py:16-20`, `nilai.py:7-8,37`, `dasar.py:27` | prakiraan +1..+3 hari dinilai prospektif: kode LSR, ASP, ROB, CEX, HJN, API, BNJ | gunung api dan kekeringan tidak ada di `prediksi.json`; gempa tanpa prakiraan harian |
| `scripts/umum/dibi_kejadian.py`, `scripts/longsor/**` | label kejadian DIBI longsor | uji balik gagal (AUC 0,70 lawan klimatologi 0,78) |
| `scripts/umum/iklim_outlook.py`, `outlook12.py`, `rapor_belajar.py` | tren dan rapor belajar | tren jangka panjang |
| `public/siklus/kejadian.js`, `scripts/siklus/arsip_kejadian.py` | arsip kejadian untuk kasus historis | kasus per bencana |
| `public/inti/cerita.js`, `tren.css` | cerita dan tren | cerita C16 (ADA hanya gunung api dan kekeringan) |
| `scripts/kekeringan/hindcast.py`, `ambang2.py` | uji balik kekeringan | pil hipotesis tetap sampai lolos |

### W7 Data publik dan mesin mutu (E, F)

| Berkas | Isi yang dipakai ulang | Perlu diubah |
| --- | --- | --- |
| `scripts/umum/jaring.py`, `berita.py`, `citra_terbuka.py`, `reliefweb.py`, `sirup.py`, `nisar_katalog.py` | pola skrip panen dengan `uji` | tiap data baru satu skrip dengan self-check |
| `.github/workflows/*.yml` | jadwal; K7 sudah membereskan gempa, udara, banjir, gunung api, pesisir | `abrasi.py` dan `pop_grid.py` harus terjadwal dan terverifikasi jalan |
| `public/i18n.js`, `public/inti/format.js` | i18n | EN lengkap (Q8) |
| `tests/agen/**` | gerbang | skrip ber-`uji` masuk CI |

## 2. Praktik penanganan dan dokumen wajib per bencana

Ringkasan dari `docs/multi-bencana/PRAKTIK-PENANGANAN.md`. Hanya rujukan bernama; semua [ingatan] tetap bertanda [perlu cek] sampai naskahnya dibaca.

### 2.1 Dokumen lintas bencana

| Dokumen | Kapan | Dasar | Label |
| --- | --- | --- | --- |
| Rencana kontingensi (renkon) | prabencana | Perban BNPB 2/2023; Perban 9/2025 (uji coba) | [korpus] |
| Rencana operasi darurat (renops) | mulai siaga atau tanggap darurat | Perka BNPB 24/2010 | [korpus], isi lampiran [perlu cek] |
| Renlap (rencana lapangan harian) | tiap hari operasi | praktik repo; bukan istilah baku peraturan | [repo] |
| Kaji cepat dan penilaian awal | 0 sampai 24 jam | Juklak 3/2022, 4/2023; perkembangan Juklak 6/2023 | [korpus] |
| Sitrep | berkala | format nasional terpisah tidak ditemukan; Juklak 6/2023 | format [perlu cek] |
| Laporan kepada Presiden | awal dan berkala | tidak ada dasar mengikat di korpus (Q10) | [perlu cek] |
| Jitupasna, lalu R3P | akhir tanggap darurat, maksimal 90 hari | Perka 15/2011; Perban 5/2017 dan 6/2017 | [korpus] |
| Laporan pertanggungjawaban logistik | berkala dan akhir | Perka 25/2014 dan 20/2014; Perban 7/2018 | [korpus] |

Sistem komando: Perka BNPB 3/2016 dan Juklak 10/2023 berlaku; Perka 10/2008 dan 14/2010 tidak berlaku, jangan dirujuk [korpus]. Peringatan dini: Perban 2/2024, Perban 4/2022, Juklak 4/2024, Juklak 6/2024 [korpus]. SAR: Perka 13/2010 dan Juklak 6/2026 [korpus]. Pengungsi: Perban 3/2018, Juklak 9/2023 [korpus]. Logistik: Perban 6/2022, Juklak 16/2025 [korpus]. Standar internasional yang dirujuk: Sendai Framework, Sphere Handbook, Core Humanitarian Standard, INSARAG Guidelines, WMO Multi-Hazard Early Warning Systems checklist, CAP v1.2 OASIS, PDNA [ingatan], tahun edisi [perlu cek].

### 2.2 Rujukan khas dan dokumen khas per bencana

| Bencana | Rujukan khas | Dokumen dan fitur khas dari riset | Label |
| --- | --- | --- | --- |
| Banjir dan rob | UU 17/2019 SDA, PP 38/2011 Sungai; tangga Siaga 4 sampai 1 per pos duga; BMKG hujan lebat, sangat lebat, ekstrem; peringatan banjir pesisir | tangga per pos duga, waktu tempuh hulu ke hilir, peta genangan dan estimasi terdampak, pengungsi terpilah, kurva surut dan peringatan penyakit pascabanjir; rob dari pasut purnama dan perigean | [ingatan] [perlu cek] angka; Perban 3/2018, Perban 2/2023 [korpus] |
| Longsor | Badan Geologi: zona kerentanan gerakan tanah dan prakiraan bulanan; Permen PU 22/2007; ambang hujan Caine (1980), Guzzetti dkk (2008), NASA LHASA; Intrieri dkk (2013) | ambang hujan kumulatif per kecamatan, daftar lereng kritis berfoto, papan SAR timbunan (waktu emas 72 jam), status zona merah dari rekomendasi Badan Geologi, peringatan hujan ke desa tangguh | [ingatan] [perlu cek] angka |
| Gempa dan tsunami | BMKG InaTEWS (tingkat Awas, Siaga, Waspada); UU 31/2009; UNESCO-IOC Tsunami Ready; INSARAG 2020; USGS PAGER dan ShakeMap | hitung mundur tsunami dan perintah evakuasi per pantai, jalur dan tempat evakuasi berkapasitas, papan SAR runtuhan, estimasi korban dari PAGER, tagging bangunan hijau, kuning, merah | [ingatan] [perlu cek] angka waktu; Perka 13/2010, Juklak 6/2026 [korpus] |
| Gunung api | PVMBG empat level (Normal, Waspada, Siaga, Awas) dengan rekomendasi; KRB I-III; MAGMA; VONA; Kepmen ESDM 15/2011; IVHHN dan ICAO IAVW | rekomendasi PVMBG per level sebagai checklist, barak per KRB, peta abu dan VONA, lahar hujan, status jalur penerbangan; Perka 6/2012 sudah tidak berlaku [korpus] | [ingatan] [perlu cek] radius per gunung |
| Cuaca ekstrem | BMKG peringatan tiga tingkat berbasis dampak; kategori hujan harian; angin di atas 25 knot; WMO impact-based forecast (2015) | distribusi terpal dan atap darurat, pembersihan jalan (K5), peringatan impact-based per kab atau kota | [ingatan] [perlu cek] angka dan tahun |
| Kekeringan | BMKG hari tanpa hujan berturut-turut (kategori sangat pendek sampai ekstrem lebih dari 60 hari); SPI WMO-No. 1090 (2012); Kementan, PUPR, Badan Pangan; Juklak Teknis 1/2024 (banjir, analogi kekeringan [perlu cek]) | peta desa dan jiwa tanpa air per bulan, jadwal tangki, peringatan puso, kaitan ke karhutla, neraca air waduk; status berasal dari penetapan kepala daerah | [ingatan] [perlu cek]; Juklak 1/2024 [korpus] |
| Kualitas udara dan asap | Permen LHK P.14/2020 ISPU (baik, sedang, tidak sehat, sangat tidak sehat, berbahaya); PP 22/2021; WHO AQG 2021; Kemenkes ISPA; ASEAN Haze Agreement dan ASMC | peta asap lintas batas, ISPU dan jarak pandang satu papan, peta ruang bebas asap, ISPA terhubung ke ISPU, pemicu libur sekolah dan penerbangan; distribusi masker dan ruang udara bersih (K5) | [ingatan] [perlu cek] nomor dan angka |
| Pesisir (gelombang, rob, abrasi) | UU 27/2007 jo UU 1/2014; Perpres 51/2016 sempadan pantai; Perpres 121/2012; BMKG gelombang tinggi; IPCC AR6 SROCC | peringatan gelombang per pelabuhan, transek abrasi kritis dan rumah terancam, status mangrove dan pemecah gelombang, gabungan pasut dan gelombang dan banjir pesisir, kaitan relokasi | [ingatan] [perlu cek] angka |
| Karhutla (acuan) | UU 32/2009 pasal 69 dan 108, UU 39/2014, PP 71/2014 jo PP 57/2016 gambut, Permen LHK P.32/2016 | tingkat siaga dan tanggap darurat; turunan "P.9/2018" belum dibaca naskahnya | P.32/2016 [web]; sisanya [perlu cek] |

### 2.3 Celah lintas bencana dari riset praktik (usulan, bukan keputusan)

Papan status darurat per wilayah (dasar UU 24/2007 dan PP 21/2008 [ingatan], pasal [perlu cek]); tangga tindakan per tingkat peringatan; papan komando SKPDB; pembangkit sitrep dan renops dari data; peta fasilitas sasaran (tempat evakuasi, faskes, sekolah, gudang, helipad, sumber air); gladi terjadwal dengan hasil terukur. Papan komando SKPDB dan gladi terjadwal belum masuk W1-W7 di KEPUTUSAN (lihat PRD bagian 5).

## 3. Data publik pendukung per alur kerja

Sumber: `docs/multi-bencana/DATA-PUBLIK.md`, bagian A (99 baru) dan B (45 sebagian). Hanya baris dengan nilai Tinggi dipasang lebih dulu (D7). Nomor mengikuti kolom "No" di berkas itu; URL bertanda [perlu cek] di sana tetap [perlu cek] di sini. Semua angka tumpang tindih sudah diuji 15 Nov 2026 terhadap kode.

| Alur kerja | Data (No di DATA-PUBLIK.md bagian A, nilai Tinggi) | Dipakai untuk |
| --- | --- | --- |
| W1 operasi dan renlap | 12 Peta KRB gunung api (PVMBG); 14 WorldPop per umur dan jenis kelamin; 8 BATNAS (kedalaman perairan, rob dan tsunami); 9 GRanD (bendungan) | target renlap dan sarana: barak per KRB, kerentanan kelompok, kedalaman untuk perahu, bendungan sebagai sumber air |
| W2 pembuat dokumen | 14 WorldPop; 12 KRB | angka terdampak dan paparan di sitrep, laporan KIB |
| W3 peringatan dini | 1 ISPU KLHK (jalur proxy atau No 132 pengganti; baris menyebut host tidak terjangkau dari CI `scripts/udara/kualitas.py:9`); 4 ERA5 pressure levels (lintasan asap); 15 katalog tsunami NCEI; 2 USGS Ground Failure (longsor dan likuefaksi akibat gempa) | pemicu EWS udara, asap, tsunami, longsor akibat gempa |
| W4 dashboard | tidak butuh data baru; memakai keluaran W1-W3 | ringkasan per jenis |
| W5 ekonomi, pencegahan, prioritas | 14 WorldPop; 13 Global Mangrove Watch (pesisir, rehab); 9 GRanD; data IHPB, IKK, PIHPS per Q6 | koefisien harga dan prioritas |
| W6 bukti model | 6 SPEI Global Database (uji balik kekeringan); 5 Slab2 (sumber megathrust); 10 mekanisme fokus USGS; 11 Vs30 (amplifikasi tapak); 15 katalog tsunami NCEI; 3 NDVI MOD13Q1 (setara No 148) | uji balik dan model |
| W7 data dan mutu | 7 emisi kebakaran GFAS (karhutla dan udara); 13; 3 | pemasangan per D7 |

Data bagian B (45 baris sebagian: sudah dipakai untuk satu bencana, belum untuk yang lain) dipakai sebagai daftar perluasan di F2 per bencana, bukan pemasangan baru. Pemasangan tiap data satu tiket: satu skrip panen dengan `uji`, satu langkah workflow, satu baris di `DATA-PUBLIK.md` yang berubah menjadi Dipakai. Data gugur uji guna (110 baris, lampiran) tidak dipasang.

## 4. Celah per bencana dari audit 15 Nov 2026

Hitungan dari `docs/multi-bencana/PARITAS-2026-11-15.md` terhadap 113 komponen. Catatan: K5 mengubah G02, G03, G10 di gempa, cuaca, udara dari "tidak berlaku" menjadi berlaku; baris di `bencana/{gempa,cuaca,udara}.md` sudah menulisnya sebagai BELUM, tetapi tabel hitungan di dokumen audit tidak diberi tahu apakah sudah menghitungnya. Tiket pertama menghitung ulang dengan skrip.

| Bencana | ADA | Sebagian | Belum | Jumlah berlaku | Celah teratas (bukti) |
| --- | --- | --- | --- | --- | --- |
| Longsor | 33 | 63 | 12 | 108 | uji balik gagal AUC 0,70 lawan klimatologi 0,78 (B01, B02); P95 hujan baru 515 dari 948 sel (A08); tanpa layar, menu, kejadian sendiri (tab di `/banjir/`); G02, G03, G10 belum |
| Pesisir | 37 | 48 | 24 | 109 | `abrasi.py` tidak terjadwal; tidak ada kejadian P walau registri menamainya; tanpa Dampak dan paparan; G01 belum karena `src/instansi.js:335` tanpa jenis pesisir |
| Kualitas udara | 69 | 22 | 16 | 107 | ISPU KLHK tidak terjangkau dan koreksi bias mati; PM2,5 dan asap tidak di EWS dan CAP (G09); Dalops tanpa jenis udara (G05, `src/dalops.js:31`); skor METAR turun (hit 35,1%, FAR 34,8%) |
| Kekeringan | 64 | 31 | 9 | 104 | EWS dan CAP tanpa kekeringan (`public/ews_tindakan.js`, `src/peringatan.js:186`); zona hujan buatan belum (A23); kejadian D tidak digambar; prospektif `kekeringan_prospektif.json` kosong dan bukan +1..+3 hari |
| Cuaca ekstrem | 69 | 27 | 11 | 107 | uji balik hujan 50 mm ke atas POD 6,5% FAR 59%, prospektif n=0; tanpa prioritas, risiko 0-100, keputusan ekonomi; posko kosong; G02, G03, G10 belum |
| Gempa dan tsunami | 67 | 29 | 7 | 103 | SIPPA dan laporan berkala belum; berita, riwayat M5, dan meta basi sejak 16 Okt; `model_guncangan.json` dan `prospektif_guncangan.json` 18 Okt; prospektif PAGER tidak menumpuk; hanya 25 dari 113 baris dibuka ulang |
| Gunung api | 78 | 21 | 8 | 107 | kenaikan level tidak memicu EWS (`public/ews_tindakan.js` tanpa gunung api; `src/peringatan.js:186`); G02, G10 belum; cek kabar Dalops tanpa gunung api (`dalops_kabar.py:23`); grid penduduk 39 gunung (`pop_grid.py`) tanpa workflow, uji `tests/gunungapi/sim_tanggap.test.mjs:70` gagal |
| Banjir | 75 | 31 | 4 | 110 | G08 laporan berkala; G10 renlap hanya CLI `renlap_banjir.py` tanpa versi, R2, layar; G02 sumbernya `src/operasi_lapangan.js` tidak menyentuh banjir; `validasi.json` 13 Okt; `scripts/wa/peringatan_banjir.mjs` mati sampai `PENERIMA_PERINGATAN_BANJIR` diisi |

Celah lintas bencana (sebagian atau belum di enam bencana atau lebih): G08, A24, A25, A30, C21, A34 (tidak dikerjakan, Q7), A33 dan C17 berita, C29 dan E08 i18n EN, C32 mobile 375 px, F04 kredit dan lisensi, A14, A22, B04, C19, A05, A21, A32, A40, B03, B05, B06, B10 dan F03 dokumen riset, C12, C16, C22, C36. Kode G dan A, B, C, E, F merujuk `docs/multi-bencana/PAKET-FITUR.md`.

Temuan rusak atau basi yang belum dibereskan K7, diperiksa ulang 15 Nov 2026 (butir yang sudah beres dihapus dari daftar): sisa dummy di `public/img/dummy/*`, `src/instansi.js:1618,1637`, dan `public/admin/foto.js:1,21` (grep ulang di tiket PB-66 sebelum dikerjakan); `src/foto.js:113` bukan dummy dan baris dummy di `src/foto.js:11,23,79` adalah rute API tanpa tombol, bukan sisa tombol; kepala kartu kalimat temuan di `public/banjir/longsor.js:31,46,54` (cek ulang; kartu cuaca dan udara insight sudah dirapikan); salinan `* 2.json` nyasar (tidak dilacak git). Sudah beres per 15 Nov dan tidak dikerjakan lagi: teks basi berita diperbarui tangan di halaman metode cuaca dan udara sudah hilang, dan `.claude/ilmu-agent/cuaca-udara.md` 39.389 byte, di bawah plafon 40 KB.

## 5. Pertanyaan yang tidak dijawab di sini

Q1 sampai Q10 di `KEPUTUSAN-PARITAS.md` tetap terbuka dengan bawaan sementaranya. Riset ini tidak menambah jawaban. Tiga hal yang riset ini temukan sebagai bahan Q, bukan jawaban: dasar mengikat laporan Presiden tidak ditemukan (Q10); naskah turunan karhutla "P.9/2018", peraturan kekeringan, kesehatan udara, dan pesisir belum dibaca; ambang angka dari [ingatan] harus dicek ke penerbit (Q9).
