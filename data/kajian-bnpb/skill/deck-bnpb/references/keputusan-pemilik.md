# Keputusan pemilik yang mengikat deck BNPB

> Salinan kata demi kata dari `data/kajian-bnpb/KEPUTUSAN.md`, bab "Keputusan pemilik" dan butir Riwayat bertopik deck dari `docs/buku-pegangan/pantau-bencana.md`, diambil 26 Okt 2026 untuk skill deck-bnpb. Jalur repo di dalam teks (mis. `data/kajian-bnpb/...`, `bangun/pptx/...`, `qa/periksa.py`) dipetakan ke skill di `references/peta-jalur.md`. Aturan tidak diringkas; bila ada yang bertentangan, urutan otoritas di `keputusan-pemilik.md` berlaku.

## Urutan otoritas

1. Kata pemilik terbaru di percakapan.
2. Buku Pegangan bab Keputusan pemilik dan bab Selera presentasi (`selera-presentasi.md`, `pola-konsultan.md`, `angka-dan-copy.md`).
3. `KEPUTUSAN.md` (di bawah).
4. `pedoman-desain-deck.md` (PEDOMAN-DESAIN.md), lalu SPESIFIKASI-GAYA.md.
5. Aturan skill pihak lain (alfatehan-pptx-rules, anti-ai-checker, ppt-format-meti) hanya bila tidak bentrok.

## KEPUTUSAN.md: keputusan untuk kajian BNPB

Satu tempat untuk semua keputusan yang mengikat produksi. Urutan otoritas: keputusan
pemilik di sini dan di Buku Pegangan, lalu KERANGKA.md, lalu PEDOMAN-DESAIN.md, lalu
SPESIFIKASI-GAYA.md. Bila berkas lain bertentangan dengan berkas ini, berkas ini yang
berlaku.

## Keputusan pemilik (23 Oktober 2026)

| No | Keputusan |
| --- | --- |
| P1 | Penerbit BNPB saja; tanpa tim penyusun; tanpa memo Presiden; pembaca utama Kepala BNPB |
| P2 | Judul: Grand Design Ketahanan Air Pulau Jawa 2026–2030; Grand Design Mitigasi Bencana Indonesia 2026–2030 |
| P3 | Kajian air memakai lensa risiko BNPB; Pola dan Rencana PSDA Kementerian PU dirujuk, tidak ditandingi |
| P4 | Horizon 5 tahun 2026–2030; peta jalan 100 hari, 2026–2027, 2028–2030 |
| P5 | Tanpa pagu dan tanpa biaya proyek; pembiayaan cukup arsitektur sumber dana |
| P6 | Program hanya yang terbukti, disertai dampak terukur dan sumbernya |
| P7 | Status usulan: Sudah ada / Sudah ada, perlu dikembangkan / Usulan baru |
| P8 | Rekomendasi dipetakan ke unit BNPB dari korpus JDIH lokal dan ke K/L bernomenklatur terkini |
| P9 | IRBI BNPB rujukan utama; indeks dan simulasi platform pendukung, berlabel |
| P10 | Skenario terburuk per jenis bencana: korban jiwa, luas terdampak, kerugian materiil dan imateriil, dengan analisis kepekaan |
| P11 | Nonalam: pandemi, kebakaran industri, kebakaran TPA. Sosial: kerusuhan dan konflik |
| P12 | DOCX A4 tegak, Roboto, logo BNPB, foto Wikimedia Commons beratribusi, tanpa ilustrasi AI |
| P13 | Keluaran 8 berkas: per kajian DOCX + PDF-nya, PPTX + PDF-nya; jumlah halaman PDF = dokumen asal |
| P14 | Deck PPTX: gaya rumah BNPB (Buku Pegangan bab Selera presentasi), ±12 slide isi + lampiran |
| P15 | Peta disimulasikan di web lalu dirender untuk dokumen |
| P16 | Gaya laporan dan deck meniru laporan dan deck kelas dunia (World Bank, McKinsey, BCG, Big Four, PBB), dicatat di Buku Pegangan; keputusan pemilik yang tertulis tetap menang |
| P17 | Tanpa tata naskah dinas khusus, tanpa simulasi tanya-jawab, tanpa lembar persiapan, tanpa paket telaah K/L |

## Keputusan bawaan orkestrator (pemilik meminta tidak ada pertanyaan lagi)

| No | Pertanyaan terbuka di pedoman | Keputusan | Alasan |
| --- | --- | --- | --- |
| T1 | Judul bab kapital atau huruf judul | Judul bab KAPITAL ("BAB 1 PENDAHULUAN"); subbab dan seterusnya huruf judul ("1.1 Latar Belakang") | Lazim di laporan pemerintah dan sesuai JAPFA untuk bab; subbab kapital melelahkan dibaca 145 halaman |
| T2 | Arah naik/turun di peta web | Oranye naik, biru turun (pasangan slide Buku Pegangan) | Peta kajian satu keluarga dengan deck, bukan tooltip situs |
| T3 | Peta web di situs atau artifact | Di situs Pantau Bencana, `public/kajian/`, dibangun lokal; terbit hanya bila pemilik mendorong | Satu sumber data dengan platform; tanpa push dari sesi ini |
| T4 | Isi kaki halaman | Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120; Call Center 117, www.bnpb.go.id | Sama dengan slide penutup deck BNPB |
| T5 | Panjang kajian air | Batas atas ±110 halaman isi; kajian mitigasi ±150 | Isi yang berbobot, tanpa ganjalan (dibahas dengan pemilik) |
| T6 | Warna turunan enam jenis bencana | Pakai palet hasil tambal (ΔE CIEDE2000 terkecil 17,6) | Sudah diuji beda warna |
| T7 | Kata Pengantar | Ditulis sebagai draf untuk ditandatangani Kepala BNPB (nama dan gelar sesuai deck BNPB 21 Okt 2026), ditandai untuk diperiksa pemilik | Bagian depan wajib |
| T8 | Warna kelas IRBI | Skala oranye rumah BNPB dengan nama kelas resmi (Rendah, Sedang, Tinggi) dan legenda | Merah hanya untuk bahaya/perlu perhatian |
| T9 | Daftar Pustaka dihitung dalam batas halaman | Tidak; sama seperti lampiran | Batas halaman = isi utama |
| T10 | Ejaan fase | "prabencana", "tanggap darurat", "pascabencana" sesuai UU 24/2007; subjudul kajian mitigasi: "Strategi Prabencana, Tanggap Darurat, dan Pascabencana" | Istilah undang-undang |
| T11 | Judul slide deck kajian: judul aksi (MBB) atau deskriptif | Slide temuan memakai kalimat temuan berangka maks 2 baris (pola lampiran Presiden d9); sampul, pembatas, dan slide rekomendasi memakai judul deskriptif | Deck kajian adalah deck temuan; judul deskriptif tetap untuk deck wilayah |
| T12 | Letak pelacak bagian di deck | Kode bagian berwarna sorot di depan judul ("A1.", "B2.") seperti d9 dan Deloitte-NEMA; tanpa unsur baru di pojok yang bisa menabrak logo atau pil CUT OFF | Nol unsur tambahan, pola sudah dipakai pemilik |
| T13 | Warna pembatas bab di deck | GELAP 051C2C, sama dengan pembatas Lampiran dan penutup | Kerangka rumah BNPB |
| T14 | Angka Aceh 2004 dan Nias 2005 dari buku BRR 2009 | Diterima sebagai sumber resmi: BRR NAD-Nias adalah badan pemerintah yang dibentuk Perpres 30/2005, jadi terbitannya berlabel resmi dan boleh di isi utama | Penerbitnya lembaga negara; tanpa angka ini histori kehilangan kejadian terbesar |
| P18 | Batas halaman | Dicabut pemilik 24 Okt 2026 ("Tidak ada batas"): T5 tidak berlaku lagi; gerbang D-12 tidak membatasi halaman isi; foto boleh ditambah sebanyak yang relevan | Kata pemilik |


## Buku Pegangan: Keputusan pemilik

### Diputus

| Keputusan | Tanggal | Bunyinya |
| --- | --- | --- |
| Cut off laporan harian 12.00, laporan karhutla 15.00 | 24 Okt 2026 | Laporan Kejadian Bencana Harian dipotong pukul 12.00 WIB dan Laporan Penanganan Pengendalian Karhutla pukul 15.00 WIB; kolom terakhir = hari laporan itu sendiri, angka sementara sampai jam cut off. Data lapangan ditempel apa adanya dari WA, generator `data/laporan-bnpb/generator/` yang mengurai |
| Laporan harian 4 slide lagi | 24 Okt 2026 | Sampul dan penutup dipasang kembali (*"tetap kasih cover dan penutup"*); batang status cukup selesai dan belum selesai |
| Status karhutla ikut sisa website | 24 Okt 2026 | 0 ha selesai; ≥10 ha dalam penanganan walau BPBD melapor padam; <10 ha selesai kecuali BPBD melapor belum padam |
| Perlu perhatian semua jenis | 24 Okt 2026 | Karhutla sisa ≥100 ha atau BPBD belum padam, ditambah kejadian lain yang dilapor belum tertangani; daftar panel status hanya yang perlu perhatian |
| Tally sama di seluruh deck | 24 Okt 2026 | Batang status per jenis (selesai, karhutla, lainnya); angka karhutla di batang = judul = tabel |
| Provinsi Prioritas website wajib masuk laporan harian | 24 Okt 2026 | Provinsi dengan cluster level 3 ditambahkan bila tidak ada di laporan Koordalops |
| Ruang kosong di dalam kontainer dipadatkan | 24 Okt 2026 | Panel setinggi isinya; berlaku di semua deck |
| Catatan kaki slide hanya kalimat standar | 24 Okt 2026 | "*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS)." tanpa tambahan |
| Istilah cluster | 24 Okt 2026 | Di slide ditulis "cluster" seperti aplikasi, bukan "kompleks"; label cluster tanpa "24 jam"; grafik tanpa label "data satelit" |
| Cut off hari berjalan | 24 Okt 2026 | Bila pemilik memberi jam cut off, hari itu masuk sebagai angka sementara sampai jam tersebut |
| Tanpa pertanyaan lagi ke pemilik untuk dua kajian | 23 Okt 2026 | Pertanyaan terbuka diputus sebagai bawaan orkestrator (`KEPUTUSAN.md` T1–T13) sampai pemilik membaliknya (`KEPUTUSAN.md`, kepala tabel bawaan). Bawaannya tercatat di [Belum diputus](#belum-diputus) |
| Deck meniru deck konsultan kelas dunia | 23 Okt 2026 | Pola yang divonis cocok di `data/kajian-bnpb/riset/desain-benchmark/deck/SINTESIS-DECK.md` dipakai di deck kajian; aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16). Vonis per pola adalah hasil bedah, bukan kata pemilik |
| Penerbit dan pembaca kajian | 23 Okt 2026 | Penerbit BNPB saja; tanpa tim penyusun dan tanpa memo Presiden; pembaca utama Kepala BNPB (`KEPUTUSAN.md` P1) |
| Judul dua kajian | 23 Okt 2026 | Grand Design Ketahanan Air Pulau Jawa 2026–2030; Grand Design Mitigasi Bencana Indonesia 2026–2030 (`KEPUTUSAN.md` P2) |
| Kajian air berlensa risiko BNPB | 23 Okt 2026 | Pola dan Rencana PSDA Kementerian PU dirujuk, tidak ditandingi (`KEPUTUSAN.md` P3) |
| Horizon kajian 2026–2030 | 23 Okt 2026 | Lima tahun; peta jalan 100 hari, 2026–2027, 2028–2030 (`KEPUTUSAN.md` P4) |
| Kajian tanpa pagu dan biaya proyek | 23 Okt 2026 | Pembiayaan cukup arsitektur sumber dana (`KEPUTUSAN.md` P5) |
| Program kajian hanya yang terbukti | 23 Okt 2026 | Tiap program disertai dampak terukur dan sumbernya (`KEPUTUSAN.md` P6) |
| Status usulan tiga kelas | 23 Okt 2026 | Sudah ada; Sudah ada, perlu dikembangkan; Usulan baru (`KEPUTUSAN.md` P7) |
| Rekomendasi kajian berlembaga | 23 Okt 2026 | Dipetakan ke unit BNPB dari korpus JDIH lokal dan ke K/L bernomenklatur terkini (`KEPUTUSAN.md` P8) |
| IRBI rujukan utama kajian | 23 Okt 2026 | Indeks dan simulasi platform pendukung, berlabel (`KEPUTUSAN.md` P9) |
| Skenario terburuk per jenis bencana | 23 Okt 2026 | Korban jiwa, luas terdampak, kerugian materiil dan imateriil, dengan analisis kepekaan (`KEPUTUSAN.md` P10) |
| Cakupan nonalam dan sosial | 23 Okt 2026 | Nonalam: pandemi, kebakaran industri, kebakaran TPA. Sosial: kerusuhan dan konflik (`KEPUTUSAN.md` P11) |
| DOCX kajian | 23 Okt 2026 | A4 tegak, Roboto, logo BNPB, foto Wikimedia Commons beratribusi, tanpa ilustrasi AI (`KEPUTUSAN.md` P12) |
| Keluaran kajian 8 berkas | 23 Okt 2026 | Per kajian DOCX dan PDF-nya, PPTX dan PDF-nya; jumlah halaman PDF sama dengan dokumen asal (`KEPUTUSAN.md` P13). PDF ringkas tidak dibuat lagi (tersirat dari P13: delapan berkas tanpa PDF ringkas) |
| Deck kajian ±12 slide isi | 23 Okt 2026 | Gaya rumah BNPB bab Selera presentasi, ditambah lampiran (`KEPUTUSAN.md` P14) |
| Peta kajian dari simulasi web | 23 Okt 2026 | Disimulasikan di web lalu dirender untuk dokumen (`KEPUTUSAN.md` P15) |
| Kajian tanpa perlengkapan paparan tambahan | 23 Okt 2026 | Tanpa tata naskah dinas khusus, simulasi tanya-jawab, lembar persiapan, dan paket telaah K/L (`KEPUTUSAN.md` P17) |
| Laporan meniru laporan kelas dunia | 23 Okt 2026 | Pola yang divonis cocok di `data/kajian-bnpb/riset/desain-benchmark/SINTESIS.md` dipakai di DOCX dan PDF kajian; aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16) |
| Laporan harian 2 slide | 23 Okt 2026 | Tanpa sampul dan tanpa penutup; nomor halaman 1 dan 2; dikirim PPTX dan PDF |
| Karhutla sisa 0 ha = selesai | 23 Okt 2026 | Sisa belum padam website 0 ha memindahkan karhutla ke selesai walau laporan lapangan belum menutupnya |
| Perlu perhatian = sisa ≥100 ha atau BPBD belum padam | 23 Okt 2026 | Kartu PERLU PERHATIAN, tanda ! peta, dan garis merah provinsi memakai satu aturan; sisa kecil tetap dalam penanganan tanpa tanda ! |
| Bencana lainnya per jenis berikon | 23 Okt 2026 | Slide 3 laporan harian memasang satu bagian per jenis (gempa bumi, kebakaran TPA, banjir, dan seterusnya) dengan ikon dan warna berbeda; tabel kekeringan ditutup baris TOTAL berikon |
| Format laporan harian = deck 221026 | 23 Okt 2026 | 4 slide mengikuti deck 221026 (periode 21–22 Okt), menggantikan acuan 18–19 Okt dari 21 Okt; deck 18–19 Okt jadi penunjuk data yang boleh masuk dan pola panel Bencana lainnya |
| Satu gaya rumah deck | 23 Okt 2026 | Kerangka BNPB (Roboto, PUTIH/GELAP, garis, logo, footer) di semua deck; deck lain hanya sumber isi |
| Data karhutla di deck dari website | 23 Okt 2026 | Hotspot dari tabel Real Time, luas terbakar dan belum padam dari lapisan peta website; fakta lapangan dari laporan BPBD atau Koordalops |
| Judul slide paling banyak dua baris | 23 Okt 2026 | Huruf dikecilkan, tidak dibungkus ke baris ketiga |
| Pil CUT OFF DATA di slide data | 23 Okt 2026 | Navy di kanan atas, tanggal dan jam WIB tarikan data |
| Peta deck berlatar putih | 23 Okt 2026 | Tanpa laut biru, tanpa label atau bulatan bertumpuk, legenda wajib, jumlah sama dengan app |
| Grafik batang harian model laporan harian | 23 Okt 2026 | Nilai di atas, tanggal dan % di bawah, naik ▲ oranye D9600B, turun ▼ biru 2F86D1, batang pertama abu, tiga terakhir pekat |
| Satu topik satu kontainer | 23 Okt 2026 | Tanpa panel gelap di samping; isinya digabung ke panel putih |
| Ikon, bukan logo lembaga | 23 Okt 2026 | Kepala tabel, kartu angka, dan chip penanggung jawab berikon garis |
| Keterangan jadi label | 23 Okt 2026 | Chip pendek, bukan kalimat; teks hiasan dan baris sumber di bawah grafik dibuang |
| Tugas api otomatis | 22 Okt 2026 | Level 3 dan level 2 bersyarat (permukiman, konsesi, tumbuh); insiden Himawari ke Posko pusat saja sampai VIIRS mengonfirmasi |
| Server rute berbayar boleh | 22 Okt 2026 | Bila graf jalan sendiri tidak cukup |
| Surat akses data | 22 Okt 2026 | Surat ke BRGM (TMAT), SiPongi, Daops jalan; draf `docs/bnpb/SURAT-AKSES-DATA.md` |
| Program lanjut api padam | 22 Okt 2026 | Disetujui, termasuk dashboard kinerja/SLA dan email di samping push |
| Pengembangan karhutla ke semua bencana | 22 Okt 2026 | Tugas, kartu, operasi, push, SLA, laporan harian, paparan berlaku per bencana |
| Panel presiden publik | 22 Okt 2026 | Tanpa sesi, agregat saja, boleh di-iframe; nama perusahaan boleh, WALHI tidak; kartu basi diredupkan; tanpa widget peringatan BMKG |
| Domain centurisk97.id | 22 Okt 2026 | pantau.terasurban.com sengaja dilepas; canonical/og meta tidak diganti sampai pemilik bilang |
| "perkiraan satelit" dilarang | 22 Okt 2026 | Slide memakai "hitungan satelit"; pop-up kab "Bukan luas resmi." |
| The TreeMap 2024 di laporan konsesi | 22 Okt 2026 | Boleh terbit dengan atribusi dan lisensi CC BY-NC tampil |
| Lampu malam ditahan | 22 Okt 2026 | Tidak dilanjutkan walau token Earthdata ada; berkasnya boleh tinggal karena tidak dipanggil siapa pun |
| Ruang Instansi wajib lengkap | 21 Okt 2026 | Sepuluh butir di memori `ruang-instansi` dicocokkan sebelum menyatakan selesai; migrasi produksi tetap oleh pemilik |
| Titik tengah dilarang | 20 Okt 2026 | Tidak ada titik tengah (U+00B7) di teks tampil, slide, pil, laporan. Koma, label sendiri, atau baris baru |
| Semua bencana di menu | 20 Okt 2026 | Label "Soon" dicabut; ketujuh bencana bisa dipilih |
| Bahasa lugas | 19 Okt 2026 | Judul = fakta + angka + sumber; tanpa personifikasi, slogan, kontras retoris, tiga-serangkai |
| Kekeringan tampil berpil hipotesis | 19 Okt 2026 | Angka jiwa dan posko tidak disembunyikan; pil dicabut hanya bila uji balik berbagi waktu lulus |
| Ruang Koordinasi di balik `/bnpb` | 19 Okt 2026 | Tidak ditautkan dari nav utama; di admin satu menu "Ruang Koordinasi" |
| M8 pengungsi dicoret | 19 Okt 2026 | Tidak dibangun; rancangannya di `docs/bnpb/RENCANA-12-JAM.md` §S7 |
| Situs Centurisk97 terpisah merek | 19 Okt 2026 | centurisk97.id dan workers.dev: merek Centurisk97, login wajib, tanpa Tentang, tanpa kata WALHI |
| Spanduk persetujuan nyala | 19 Okt 2026 | Supaya statistik per bencana terisi |
| Produksi = worker `centurisk97` | 17 Okt 2026 | Domain tidak pernah dipindah ke `poskokarhutla` |
| Hanya branch main, tanpa worktree, tanpa staging | 17 Okt 2026 | Agent bekerja langsung di main, satu per satu bila berkasnya bersinggungan |
| Nama perusahaan konsesi tampil | 17 Okt 2026 | Nama dan grup tampil; nomor izin dan kasus sanksi tetap tidak |
| WALHI tidak tampil | 17 Okt 2026 | Tanpa kolom, angka, atau sumber WALHI di layar; data mentah tetap di JSON |
| Modul bencana lain meniru kode karhutla (plug and play) | 17 Okt 2026 | Bagian yang sudah ada dipakai ulang lewat registry, tidak disalin; tambahan khas bencana boleh dengan alasan |
| Bencana dibuka bertahap | 17 Okt 2026 | uji = halaman jadi; aktif = lolos audit paritas + cek data |
| Sapaan pembaca "kamu" | 16 Okt 2026 | Semua teks yang menyapa memakai "kamu" |
| Em dash dilarang di teks tampil | 16 Okt 2026 | En dash tetap untuk rentang dan angka kosong |
| Ikon SVG garis | 16 Okt 2026 | Seragam dengan karhutla, bukan emoji dalam lingkaran |
| Peta sesar Pusgen 2017 boleh dipakai | 16 Okt 2026 | Lapisan sesar aktif masuk peta gempa |
| Notifikasi peringatan dini lewat email | 16 Okt 2026 | Bukan Web Push; langganan email per wilayah dengan konfirmasi dan berhenti langganan |
| Bencana yang selesai langsung dibuka | 16 Okt 2026 | "Segera" hilang dari menu, halaman bisa diakses publik |
| Kendali mutu | 16 Okt 2026 | Diff agent dibaca sendiri, layar dicek 1440 dan 390, gerbang dijalankan, verifier konteks bersih untuk perubahan berarti |
| Semua bencana meniru karhutla | 15 Okt 2026 | Tiap bencana dinilai dengan paket 113 komponen karhutla |
| Satu situs, satu registry | 15 Okt 2026 | `public/bencana.json` sumber tunggal; karhutla tetap di `/` |
| Kartu Insight di semua halaman | 13 Okt 2026 | Pil kategori + satu kalimat temuan berangka merah + kontrol segmen, grafik, kaki legenda + "Sumber:" |
| Disembunyikan, bukan dihapus | 14 Okt 2026 | Tiap "hilangkan" dicatat berikut berkas dan cara memulihkannya |
| Konsesi netral | 14 Okt 2026 | Tidak ada tuduhan pembakar |
| Foto: label di dalam foto | 15 Okt 2026 | Ikon kategori dan waktu relatif di dalam foto; tanpa nomor urut |
| Upvote, bukan love | 15 Okt 2026 | Dukungan foto warga = tombol Upvote |
| Bahasa bawaan Indonesia | 15 Okt 2026 | Pilihan bahasa di `sessionStorage`; kunjungan baru selalu ID |
| Lapisan Foto mulai mati, Angin mulai nyala | 14 sampai 15 Okt 2026 | Foto tidak diingat di `localStorage` |
| Data dummy di tiap website | aturan global | Dua ikon, Super Admin saja, isinya ditentukan halaman yang sedang dibuka (`~/.claude/DUMMY.md`) |
| Armada agent sejak hari pertama | aturan global | Roster, model tertulis, ilmu per agent, `AGENTS.md` (`~/.claude/AGEN.md`) |

### Belum diputus

| Pertanyaan | Usulan | Rujukan |
| --- | --- | --- |
| `/kabar` dibuka publik | Tambah ke `PUBLIK_TANPA_SESI` bila disetujui; kini di balik login | `docs/bnpb/PROGRAM-15-JAM.md` |
| `/data/tugas_kompleks.json` publik dan memuat nama pemegang konsesi | Dibatasi atau dibiarkan | memori `program-15-jam` |
| Angka kebijakan tugas lintas bencana | `JIWA_MIN` 1000, `UMUR_KAJI_CEPAT_JAM` 72, `LAPORAN_MUNDUR_HARI` 14 | `scripts/umum/tugas.py`, `src/tugas_bencana.js` |
| Radius permukiman tugas dan nama perusahaan di tugas | Bawaan 5 km dan tampil | `RANCANGAN-API-PADAM.md` |
| Target SLA | Kini vonis hanya konfirmasi 6 jam dan kabar 24 jam | `RENCANA-LANJUT.md` |
| CSP dan daftar iframe panel presiden | Belum diputus | `docs/presiden/KONTRAK.md` |
| Kapan `/bnpb` masuk nav utama | Sesudah migrasi 0022 sampai 0028 diterapkan dan uji layar hijau di produksi | `docs/bnpb/STATUS.md` |
| Daftar 21 Kodam untuk akun instansi | Dicek pemilik sebelum akun massal dibagikan | memori `ruang-instansi` |
| Nama jenis bencana gaya DIBI di ekspor Meja | Dicocokkan pemilik ke istilah DIBI resmi | `/api/meja/ekspor` |
| Turnstile relawan dan alun-alun | Isi sitekey begitu form mulai diserbu spam | `wrangler.jsonc` |
| Ambang kekeringan baru | Opus merancang, `gunungapi-kering` mengerjakan, `validasi-model` memeriksa | `RENCANA-20-JAM-2.md` blok B3b |
| Keputusan arsitektur multi-bencana yang menunggu | Daftarnya di akhir `ARSITEKTUR.md` | `docs/multi-bencana/ARSITEKTUR.md` |
| Bawaan orkestrator kajian BNPB (T1–T13, U1–U7) | Berlaku sampai dibalik pemilik: judul bab kapital (T1), arah peta web (T2), peta web di `public/kajian/` (T3), kaki halaman (T4), batas halaman (T5), palet enam keluarga (T6), Kata Pengantar (T7), kelas IRBI oranye (T8), Daftar Pustaka di luar batas halaman (T9), ejaan fase (T10), judul slide (T11), kode bagian (T12), pembatas GELAP (T13), dan U1–U7 | `data/kajian-bnpb/KEPUTUSAN.md`, `PEDOMAN-DESAIN.md` §0.2 |
| T11 menyimpang dari vonis "Judul deskriptif menang atas judul data" | Slide temuan deck kajian berjudul kalimat temuan berangka; berlaku sampai pemilik memutus. Bila dibalik: judul deskriptif, angka pindah ke kartu angka (S8) | `KEPUTUSAN.md` T11, [S7](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four) |
| Kode bagian deck berhuruf (T12) dan kode lampiran "L1." (U5) | Huruf bagian A–E berbeda arti dengan "Temuan A.1" DOCX (pertanyaan pimpinan A–C), dan "L1." bisa terbaca sebagai aturan L1 buku ini. Bawaan: tetap huruf, kode DOCX selalu ditulis lengkap "Temuan A.1". Alternatif: bagian bernomor "1. ", "2. " dan lampiran kembali "A1. " pola d9 | `KEPUTUSAN.md` T12, `PEDOMAN-DESAIN.md` U5, S10, S33 |
| Isi pil CUT OFF deck kajian | Keputusan 23 Okt: tanggal dan jam WIB tarikan data. Bawaan S16: satu batas data lintas paket bertanggal dan berjam dari satu kunci; tanggal tarik per paket di lampiran metode | S16 |
| Tanpa putaran tinjauan pemilik (`PEDOMAN-DESAIN.md` K18) | Bawaan dari "tidak ada pertanyaan lagi"; penyunting independen menggantikan persetujuan pemilik atas grand design dan halaman contoh. Kata Pengantar satu-satunya bagian yang ditandai untuk pemilik (T7) | `PEDOMAN-DESAIN.md` K18, §D3 |


## Buku Pegangan: butir Riwayat perubahan yang menyangkut deck

1. 25 Okt 2026
   - **Skill PPT METI dan PNRE dinilai terhadap bab Selera presentasi.** Palet, font Poppins dan Arial, stabilo kuning, dan kotak keypoint tidak dipakai karena hanya ada satu gaya rumah. Pemilik memutuskan dua unsur METI boleh masuk: *"peta 3D, dan slot foto untuk slide bisa dimasukkan"*, dengan peta yang *"betul dimiringin"*. Aturannya di [Komponen](#komponen), butir Peta dan Slot foto.

1. 24 Okt 2026
   - **Jam cut off ditetapkan dan generator dibuat**: *"tiap laporan harian bencana di jam 12 cut off nya dan laporan harian karhutla cut off jam 15"*. Kolom terakhir = hari laporan itu sendiri, angka sementara sampai jam cut off; teks WA Koordalops, BMKG, dan laporan operasi ditempel apa adanya lalu diurai generator `data/laporan-bnpb/generator/`.
   - **Laporan harian 241026 dirombak bersama pemilik.** Status karhutla ikut sisa website (Kaltim, Luwu Timur, Arjuno kembali dalam penanganan walau BPBD melapor padam), perlu perhatian mencakup semua jenis (13: 12 karhutla dan TPA Supit Urang), daftar panel status hanya yang perlu perhatian, batang status `4 selesai | 15 karhutla ditangani | 3 lainnya` supaya tally sama dengan tabel, panel kekeringan dan bencana lainnya dipadatkan, pita aksi tanpa rujukan BMKG.
   - **Deck Penanganan 231026 dibuat dua kali**: cut off 23 Okt 07.00 dari data website, lalu *"Buat cut off 15.00 WIB"* dengan hari 23 Okt sementara dari FIRMS mentah (website belum menerbitkan luas hari berjalan). Slide operasi diisi ringkasan WA Koordalops; baris PEMILIK yang berupa perkiraan dibuang.
   - **Paparan Karhutla Provinsi Lampung** dibuat dari pola paparan Jatim: *"pakai data yang hari ini"* (per 24 Okt 06.44 WIB), catatan kaki hanya kalimat standar (*"Hilangkan"*), label "data satelit" di grafik dibuang, "24 jam" dibuang dari label cluster, "kompleks" ditulis "cluster" seperti aplikasi, tiap status berikon berbeda (*"Dikirim bedain dong iconnya"*), semua pil berikon, grafik harian selebar pitanya (*"Bagusin"*).

2. 23 Okt 2026
   - **Deck kajian meniru konsultan kelas dunia, empat skill pemilik diadopsi, tanpa pertanyaan lagi ke pemilik.** Bedah 10 deck McKinsey, BCG, Bain, Deloitte, dan KPMG dicatat jadi subbab [Pola deck konsultan kelas dunia (McKinsey, BCG, Big Four)](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four): *"ppt mckinsey bcg dan konsultan big four management juga ditiru ya"*. Yang dipakai antara lain Pesan Kunci sebagai peta deck, judul temuan yang dibuktikan angka di slide yang sama, kode bagian di depan judul, satu warna sorot, matriks lembaga × fase, dan tabel penanggung jawab berikon. Empat skill pemilik dinilai lalu diadopsi sebagian: `alfatehan-pptx-rules` (garis besar per slide sebelum membangun, variasi tata letak, grafik native, laporan QA per deck), `anti-ai-checker` (ambang terukur dan vonis tiga tingkat di [Angka & copy](#angka--copy)), `book-production-rules` (kepadatan pustaka, glosarium, ejaan dan pemenggalan id-ID, QA lima lapis, metadata), dan `deep-research` (berkas bukti per bab, klaim tanpa sumber dibuang, BLUF). Pemilik meminta tidak ada pertanyaan lagi (`KEPUTUSAN.md`, kepala tabel bawaan), jadi pertanyaan terbuka diputus sebagai bawaan orkestrator (`KEPUTUSAN.md` T1–T13, menunggu koreksi pemilik; daftarnya di [Belum diputus](#belum-diputus)). Syarat LULUS pindaian anti-AI per bab adalah aturan proses orkestrator, bukan kata pemilik. Aturan pemilik menang saat bentrok: ukuran huruf skill, garis di bawah judul, Garamond, halaman pembatas bab penuh, panel gelap, Gantt, biaya proyek, merah, dan huruf di bawah 6 pt. Keputusan pemilik P1–P17 untuk dua kajian masuk tabel [Diputus](#diputus).
   - **Selera presentasi dicatat** jadi bab [Selera presentasi (PPT)](#selera-presentasi-ppt), diukur dari 9 deck tanggal 18 sampai 23 Okt. Laporan harian kini mengikuti deck 221026: *"Ini format terakhirnya yang kemarin"*. Deck 23 Okt yang dibuat Claude dengan generator `/laporan-bnpb` masih bergaya lama (palet D9650B/0F1E2D, tanpa ikon, teks terpotong "…"), jadi deck yang ditunjuk pemilik yang disalin, bukan generatornya.
   - **Paparan Karhutla Jawa Timur dirombak berulang**: *"Bagusin. Sumpah jelek banget"*. Gaya rumah BNPB dipertahankan, deck Kalteng dipakai untuk isi saja. Perubahannya:
     - pil CUT OFF DATA ditambahkan;
     - grup DATA SATELIT dan PERLU PERHATIAN dipasang;
     - panel diberi pita kepala berikon;
     - peringkat diberi nomor dan penanda peta diberi nama;
     - keterangan diganti chip, dan chip lembaga memakai ikon, bukan logo.
   - **Peta dan grafik deck**:
     - latar peta tidak biru (*"petanya belakangnya jangan biru"*), label tidak tumpang tindih (*"Ini situbondo tumpang tindih"*), setiap bulatan dan warna punya legenda;
     - grafik batang meniru laporan harian: nilai di atas, tanggal dan persen di bawah, naik oranye, turun biru, batang pertama abu, tiga terakhir pekat.
   - **Satu topik, satu kontainer, tanpa panel gelap di samping**: *"JANGAN DIPISAHIN DONG CONTAINERNYA KAN SAMA"*. Isi tidak menempel ke tepi bawah, rincian rekomendasi rata kiri-kanan. Banyak teks hiasan dibuang, termasuk satu slide utuh (*"Slide 5 buang"*).
   - **Data karhutla di deck = data website** (*"Karhutla udah pasti pakai data kita"*): hotspot dari tabel Real Time, luas terbakar dan belum padam dari lapisan peta. Fakta lapangan dari laporan BPBD atau Koordalops.
   - **Bencana lainnya di laporan harian dipisah per jenis dengan ikon berbeda**, mengikuti laporan 18–19 Okt: *"Dipisahin dong ... jadi orang tau mana gempa bumi mana bla bla bla coba cek yang laporan harian 18-19"*. Baris TOTAL kekeringan kini berikon rumah, orang, dan tetes air (*"Buat icon"*). Pembangun deck 231026 disimpan di `data/laporan-bnpb/harian-2026-10-23/` setelah scratchpad sempat terhapus dan pembangun Jatim hilang.
   - **Status di laporan harian mengikuti sisa belum padam website.** Kota Tidore (sisa 0 ha) dipindah ke selesai: *"Bro ini Maluku Utara udah nol ya masuk selesai dong"*. Kartu PERLU PERHATIAN tidak lagi menyalin jumlah dalam penanganan (*"Emang semua perlu perhatian ya?"*). Pemilik memilih yang serius saja: sisa ≥100 ha atau dilapor BPBD belum padam, jadi 8 dari 10. Penunjuk "Lampiran (data rinci) mulai halaman 13" di penutup dibuang (*"Hilangkan"*), lalu sampul dan penutup sekalian dibuang: *"Hilangkan cover dan terimakasih kirim ppt dan pdf"*. Laporan harian kini 2 slide, dikirim sebagai PPTX dan PDF.

3. 22 Okt 2026 (lanjutan)
   - **Semua pengembangan karhutla dibawa ke bencana lain** (`3169c015`): *"semua pengembangan karhutla, lakukan juga di bencana lain"*. Tugas lapangan, Ruang Instansi, operasi, laporan harian, WA, deck, dan paparan kini per bencana (migrasi 0047 sampai 0049).
   - **"perkiraan satelit" tidak pernah ditulis** di judul, tooltip, legenda, pop-up, grafik, dan slide (`944bffc5`). Tab Posko (Ajuan) benar-benar tersembunyi; tab Replay banjir keluar dari menu (validasi 26%).

6. 20 Okt 2026
   - **Titik tengah dilarang**: *"Gw ga pernah suka dipisahin titik gini. Catet."* (paparan Presiden). Tiap teks tampil, kartu, pil, slide, dan judul laporan tanpa titik tengah (U+00B7). Pakai koma, label sendiri, atau baris baru. Angka kunci di depan.

7. 19 Okt 2026
   - **Bahasa lugas**: deck Kepala BNPB ditolak keras karena kalimat bergaya (personifikasi, slogan, kontras "X bukan Y", "mulai besok"). Judul = fakta + angka + sumber; label = kata benda polos.

8. 18 Okt 2026
   - **Cari pabrik/konsesi** dengan buffer 10/25/50 km, slider banding, timelapse GIF, persen harian di pop-up.
   - **Laporan konsesi** (`/laporan-konsesi`, hanya Centurisk97) dan **laporan harian generik** (mesin `public/inti/laporan.js`, kontrak v1).
   - **Cuaca ekstrem**: prediksi kecamatan 72 jam, siklon, gelombang, verifikasi, simulasi, laporan harian.

9. 17 Okt 2026
   - **Laporan harian karhutla** (`/laporan`): titik panas dan luas terdampak per provinsi dan kab/kota, perbandingan harian, cut-off dan sumber, cetak PDF berkop provinsi, kurva musim lintas tahun dengan latar median 2019 sampai 2025.

10. 16 Okt 2026
   - **Tiga keputusan copy diputus**: sapaan "kamu", em dash dilarang di teks tampil, ikon tetap SVG garis.
