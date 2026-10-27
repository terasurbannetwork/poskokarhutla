# PRD SIPPA: Sistem Pipa Portabel Karhutla dan Banjir

Dokumen arah tunggal untuk dua keluaran: (a) buku kajian formal DOCX/PDF berikut deck PPTX/PDF, dan (b) aplikasi web khusus staf BNPB di `/pipa` pada repo Pantau Bencana. Versi 1.2, 26 Oktober 2026 (penggabungan Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses ke SIPPA menurut keputusan 55, dan perluasan web ke air tanah, akses, dan pemeliharaan menurut keputusan 56; rincian di `PENYELARASAN.md` bagian 26 Okt 2026), disusun dari `KEPUTUSAN-SIPPA.md` (keputusan pemilik 1–50, §H 51–53, dan 54–56, menang atas semua), bahan kajian `rehab` (`kajian/rehab/KERANGKA.md`, `rehab/KEPUTUSAN-AWAL.md` Q1–Q20 sejauh tidak bertentangan dengan keputusan SIPPA 1–56, `rehab/riset/A`–`F`, `kajian/naskah/rehab/` beserta bukti dan kunci `rehab.*`), `KRITIK-DAN-KEPUTUSAN.md` (disingkat KD), `baca-A.md`, `baca-B.md`, `baca-C.md` (28 celah G01–G28), data yang sudah ditarik di `pipa/data/`, serta aturan repo (`AGENTS.md`, `docs/buku-pegangan/pantau-bencana.md`, `~/.claude/TEST.md`, `KERANGKA.md`, `bangun/NASKAH-SPEK.md`).

Konvensi berkas ini:

- Path relatif ke akar repo kecuali disebut lain. Path `data/kajian-bnpb/...` disingkat `kajian/...`.
- Label keyakinan mengikuti KD: **[resmi]**, **[terverifikasi]**, **[estimasi-model]**, **[asumsi-kebijakan]**. Angka yang belum ada ditulis sebagai slot `{{angka:sippa.<kunci>}}` beserta cara memperolehnya.
- "Kit" = satu kit relay portabel SIPPA (definisi §6.1). "Modul banjir" = modul pompa debit besar head rendah yang menempel pada kit (§6.3).
- "Pemilik" = pemilik repo dan program (staf ahli BNPB). "Sesi induk" = sesi Claude utama yang memegang kontrak, commit, dan deploy.
- Tanggal sidang: Sabtu 25 Oktober 2026. Batas data buku: 23 Oktober 2026 pukul 23.59 WIB (keputusan 28).
- Kode: buku memakai kode kajian `sippa` (naskah `kajian/naskah/sippa/`, paket data `kajian/data/sippa/`, kunci angka `sippa.*`, keluaran `kajian/keluaran/sippa*`, bendera QA `--kajian sippa`); web memakai halaman `/pipa`, API `/api/sippa/*`, tabel `sippa_*`, pipeline `scripts/data/sippa/` dan `data/sippa/keluaran/`. Awalan `/api/pipa/*` milik `src/pipa.js`.
- Dokumen turunan (urutan otoritas AGENTS.md §2.1): `DESIGN-SYSTEM.md` (tampilan), `DESAIN-TEKNIS.md` (SQL, rute, rumus lengkap), `KERANGKA-BUKU.md` (buku dan deck rinci), `RENCANA-UJI.md` (kriteria terima), `TIKET.md` (urutan kerja). PRD ini sudah diselaraskan dengan keenamnya pada 25 Okt 2026; tabel teknis dan §8 di sini adalah ringkasan yang isinya sama dengan DESAIN-TEKNIS dan KERANGKA-BUKU. Bila kelak ditemukan beda baru, pengerja berhenti dan bertanya (AGENTS.md §2.1), tidak memilih sendiri.

Daftar isi

1. Ringkasan, tujuan, ukuran keberhasilan, non-tujuan, larangan
2. Keputusan terkunci dan pertanyaan terbuka
3. Pengguna, peran, RACI per tahap
4. Lini masa 2026–2030 dan gerbang G0–G5 terkalibrasi
5. Lingkup operasional
6. Lingkup teknis kit
7. Data
8. Buku kajian dan deck
9. Aplikasi web `/pipa`
10. Rencana kerja eksekusi
11. Anggaran ringkas, risiko, asumsi, glosarium
12. Keterlacakan (28 celah dan 53 keputusan)

---

## 1. Ringkasan, tujuan, ukuran keberhasilan, non-tujuan, larangan

### 1.1 Ringkasan

SIPPA adalah sistem kit pompa, selang layflat, manifold, dan lance injeksi dangkal yang disimpan di gudang, dipindahkan ke lokasi yang sudah bisa ditebak dari riwayat api, dan dipakai untuk membasahi bara gambut dari bawah permukaan (0–1,5 m, lengan uji 3–5 m), lalu dipindah ke daerah banjir pada musim hujan dengan modul pompa banjir terpisah. Kit bukan jaringan permanen. Argumen dasarnya tiga, semuanya dari data repo [terverifikasi, KD §1]: api Kalteng episodik dalam waktu tetapi berulang dalam ruang (85% deteksi 2023 jatuh di sel 2,2 km yang sudah terbakar 3 tahun atau lebih sebelumnya); air jarang jadi kendala utama (63% kompleks 2026 dalam 2 km dari sungai atau kanal besar; median 1,02 km bila parit dan kanal kecil OSM ikut dihitung, §5.1); bara berada di 0,3–0,5 m, bukan 5–15 m.

Sejak keputusan 55 (26 Okt 2026) SIPPA adalah **satu grand design terintegrasi**, satu dari tiga grand design BNPB (Air Jawa, Mitigasi, SIPPA terintegrasi). Di samping kit pipa bergerak untuk karhutla, banjir, dan irigasi dari sumber lain, cakupannya ditambah tiga bagian: (a) air pascabencana, yaitu peralihan perpipaan dari darurat ke permanen dan pemanfaatan akuifer dalam batas penetapan cekungan air tanah dan zona konservasi Badan Geologi; (b) rehabilitasi dan rekonstruksi akses, yaitu jembatan menurut pemilik programnya (Satgas Pembangunan Jembatan TNI AD atau Jembatan Garuda, Jembatan Merah Putih Presisi Polri, jembatan gantung Kementerian PU, dan jembatan bailey DSP BNPB); dan (c) model pemeliharaan aset terpadu untuk kit, pipa, sumur, pompa, dan jembatan (§6.10). Kajian `rehab` menjadi bahan bukti; berkas finalnya tidak dihapus dan tidak diserahkan sebagai grand design terpisah. Keputusan 56 menaruh air tanah, akses, dan jadwal pemeliharaan juga di web `/pipa` (§9.4.9–§9.4.12).

Keluaran PRD ini dua, dikerjakan paralel setelah PRD disetujui (keputusan 46):

| Keluaran | Bentuk | Pembaca | Berkas akhir |
| --- | --- | --- | --- |
| Buku Grand Design SIPPA Terintegrasi 2026–2030 (judul usulan, T-L) | DOCX A4 + PDF, tanpa batas halaman (keputusan 11), 22 bab; deck 18 slide isi PPTX + PDF (keputusan 19, T-M) | Kepala BNPB (keputusan 3) | `kajian/keluaran/sippa.docx`, `sippa.pdf`, `sippa-deck.pptx`, `sippa-deck.pdf` |
| Aplikasi web `/pipa` | Halaman staf di balik login admin Pantau Bencana (keputusan 31, 32), Bahasa Indonesia, mode gelap, desktop untuk perencanaan dan ponsel untuk lapangan | Staf BNPB, Satgas, operator lapangan | `public/pipa/**`, `src/sippa.js`, `migrations/0056_sippa_inti.sql` s.d. `0059_sippa_aset_pelihara.sql`, `data/sippa/keluaran/*.json` (diunggah ke R2 `sippa/`, dibaca hanya lewat rute berlogin, §9.7) |

### 1.2 Tujuan

1. Memberi Kepala BNPB satu dokumen keputusan yang menyatakan arah desain SIPPA langsung (tanpa bab kritik gagasan awal, keputusan 20), dengan RAB yang dihitung ulang (keputusan 13), NPV, BCR, dan Monte Carlo (keputusan 15), matriks respons FRP dan luas (keputusan 16), gambar teknik tingkat konstruksi dengan blok pengesahan insinyur berlisensi yang kosong (keputusan 12), dan label keyakinan pada semua angka (keputusan 29).
2. Menjalankan pilot Oktober 2026 di Kalteng dengan peralatan yang sudah ada di lapangan (pompa dan selang Manggala Agni/BPBD) ditambah lance sederhana dan termometer gambut, memisahkan dua vonis: "dapat dipakai" dan "lebih baik dari cara konvensional". Bila "dapat dipakai", kit dipakai untuk banjir November–Desember 2026 (keputusan 4).
3. Menyediakan alat kerja staf BNPB di `/pipa` yang menjawab pertanyaan perencanaan (lokasi kit, hidraulika, sarana, pemicu pra-posisi) dan pertanyaan operasi (log gelar, inventaris, lacak kit antar-daerah, dashboard A/B), dengan kerangka telemetri yang siap menerima data sensor (keputusan 38) dan laporan PDF otomatis (keputusan 39).
4. Menyiapkan ekstrapolasi nasional 18 provinsi dan 81 kit sebagai rencana bersyarat 2027–2030 yang hanya dieksekusi setelah gerbang (§4.3), bukan pembelian massal (keputusan 50).
5. Menyatakan arah rehabilitasi dan rekonstruksi air dan akses dalam buku yang sama (keputusan 55): waktu pulih layanan air dan akses sebagai ukuran keberhasilan, air tanah dalam batas Badan Geologi, program jembatan ditulis menurut pemiliknya dan diikat ke R3P, dan jalur dana aset desa (Perban BNPB 4/2024 Pasal 5 huruf e).
6. Menetapkan model pemeliharaan aset terpadu (§6.10) dengan data kondisi yang dicatat di `/pipa` sejak pilot, supaya kit, sumur, pompa, dan jembatan darurat tidak menjadi aset tanpa pemelihara.

### 1.3 Ukuran keberhasilan (terukur)

| Kode | Ukuran | Target | Cara ukur | Kapan |
| --- | --- | --- | --- | --- |
| U1 | Buku dan deck lolos QA lima lapis dan gerbang mekanis `qa/periksa.py --ketat` | 0 gerbang gagal, semua bab LULUS anti-slop | `kajian/keluaran/qa/*.md` | serah buku |
| U2 | Tiap angka di buku dan deck punya kunci `angka.json` berlabel keyakinan | 100% token, 0 angka ketikan (gerbang D-22) | manifest DOCX/PPTX | serah buku |
| U3 | Pilot Oktober 2026: vonis "dapat dipakai" ditetapkan dari formulir lapangan dengan tujuh butir keputusan 53 | formulir G3-lite terisi untuk tiap sesi gelar; probe suhu 4 kedalaman per petak pada tahap sebelum, sesudah injeksi, dan 24 jam; `vonisPilot` (DESAIN-TEKNIS §5.5.2) memberi DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, atau BELUM DAPAT DIPAKAI | `/pipa/log`, `/pipa/laporan` templat pilot, `sippa_log_gelar`, `sippa_probe` | 1 Nov 2026 |
| U4 | Pilot: perbandingan "lebih baik" bila ada api | selisih ha dingin terverifikasi per regu-hari dan nyala ulang 7 hari antara petak lance dan petak konvensional, dengan n petak dicatat; bila n < 8 per lengan, dilaporkan "belum bisa diputus" | `/pipa/ab` | 15 Nov 2026 |
| U5 | Web `/pipa` jalan di produksi | semua layar §9 tersedia, `npm run uji:warga` dan `uji:agen` hijau, uji route `tests/warga/sippa*.test.mjs` hijau | CI dan log deploy sesi induk | lihat §10 |
| U6 | Waktu gelar terukur | p50 dan p90 tiba-sampai-air-mengalir per kelas medan, minimal 5 ulangan per kelas sebelum G3 diputus | `/pipa/log` | musim 2027 |
| U7 | Efikasi | ha dingin terverifikasi 30 hari per regu-hari naik ≥ 30%, atau nyala ulang 30 hari turun ≥ 30%, 95% CI tidak memotong nol, n ≥ 8 petak per lengan; biaya per ha terverifikasi ≤ 1,2 kali konvensional | `/pipa/ab` dan evaluator independen | akhir musim 2027–2028 |
| U8 | Keutuhan aset | kehilangan komponen < 5% per musim per kit | `sippa_komponen` dan jejak | tiap musim |
| U9 | Pemakaian ganda banjir | tiap kit yang dipindah ke banjir punya catatan waktu pindah, lokasi, jam pompa, m3 terpompa | `sippa_gerak`, `sippa_log_gelar` | Des 2026 |
| U10 | INP layar | tidak ada interaksi > 200 ms di `/pipa` pada laptop uji; kerja berat lewat `nanti()` | `inp-reviewer` | tiap rilis |
| U11 | Inspeksi tepat waktu (keputusan 55, 56) | ≥ 90% butir pemeliharaan terjadwal per musim tercatat di `sippa_inspeksi` paling lambat 30 hari sesudah jatuh tempo | `/pipa/pelihara`, `GET /api/sippa/pelihara` | tiap musim mulai 2027 |
| U12 | Kit laik gelar saat pemicu | saat kabupaten naik ke PRA-POSISI, kit yang dipra-posisikan tidak punya komponen kritis (kelas K1–K3 §6.10) berskor kondisi ≥ 2 | `/pipa/pelihara`, `sippa_komponen` | tiap pemicu mulai 2027 |

### 1.4 Non-tujuan

- Bukan DED, dokumen pengadaan, atau izin operasi. Gambar teknik tingkat konstruksi tetap wajib diverifikasi dan disahkan insinyur berlisensi sebelum dibangun (keputusan 12). Blok pengesahan dibiarkan kosong.
- Bukan jaringan pipa tetap dalam bentuk apa pun: tanpa koridor semi-permanen dan tanpa backbone permanen (keputusan 60); SIPPA hanya kit portabel.
- Bukan pengganti keputusan OMC (BMKG/Kemenhut) atau keputusan heli water bombing; keduanya tetap untuk front yang tidak dicapai regu darat dalam 6 jam (`jam_tiba`).
- Tidak membangun bab dasar hukum TNI (keputusan 22). Peran YonTP ditulis sebagai gudang, tenaga gelar, dan transport antar-daerah dengan komando di Satgas dan operator inti Manggala Agni (keputusan 21).
- Web bukan halaman publik; tidak ada lapisan SIPPA di peta publik `/`.
- BNPB tidak membangun jembatan atau SPAM permanen sendiri di luar pemilik aset, dan buku tidak memerintah program jembatan dan sumur K/L (rehab Q8). Untuk akses dan air tanah, buku memuat biaya satuan berlabel sebagai pembanding, tanpa pagu, total program, NPV, atau BCR (rehab Q4; RAB, NPV, BCR, dan Monte Carlo keputusan 13 dan 15 berlaku untuk kit dan model pemeliharaan; T-N).
- Peta air tanah dan akses tidak terbit sebagai halaman publik `public/kajian/rehab/` (rehab T3); semuanya di `/pipa` berlogin (keputusan 32, 56; T-O).
- Kajian mitigasi ditunda sampai PRD dan buku SIPPA selesai (keputusan 47); PRD ini tidak menyentuhnya.

### 1.5 Yang TIDAK boleh ada (keputusan 50)

| Larangan | Penegakan di buku | Penegakan di web |
| --- | --- | --- |
| Klaim "terbukti" tanpa uji | kata "terbukti" hanya untuk sekat kanal/rewetting (BRGM/KLHK) dan hanya dengan kutipan; glosarium `varian_terlarang` memuat "terbukti efektif" tanpa rujukan; T-9/T-10 | pil "hipotesis" atau "belum diuji" pada semua angka efikasi; teks "terbukti" tidak pernah dihasilkan dari templat laporan PDF |
| Angka tanpa sumber | token `{{angka}}` wajib (D-22), kolom sumber di tabel, pil keyakinan (S15) | tiap kartu angka menulis `Sumber:` dan `data per`; `selera-angka` memeriksa |
| Jaringan pipa tetap (keputusan 50, 60) | tidak ada skenario jaringan tetap; koridor semi-permanen dan backbone disebut hanya sebagai pilihan yang ditutup | simulator selalu menolak preset `semi` dan `backbone`; gerbang keras "jaringan_permanen" |
| Pembelian massal sebelum pilot | peta jalan menaruh pengadaan 81 kit hanya setelah G5; tabel anggaran bertingkat gerbang | layar kit nasional berlabel "rencana bersyarat, bukan pengadaan" |
| Injeksi > 5 m | doktrin 0–1,5 m, lengan uji 3–5 m; kalkulator menolak kedalaman > 5 m | input kedalaman lance dibatasi 0–5 m dengan pesan tolak |
| Nama/logo pihak lain selain BNPB | penerbit BNPB saja (KEPUTUSAN kajian P1); logo lain tidak ada di sampul, kepala, kaki, deck; spesifikasi alat ditulis sebagai kelas kinerja "atau setara" (mis. "pompa portabel 1.500 L/min pada 10 bar"), merek dan model hanya muncul di kolom sumber atau pustaka sebagai rujukan datasheet; nama perusahaan konsesi tidak ditulis | laporan PDF hanya logo BNPB; tidak ada logo mitra; daftar komponen menampilkan kelas kinerja, merek hanya di kolom "rujukan datasheet" |

---

## 2. Keputusan terkunci dan pertanyaan terbuka

### 2.1 Keputusan terkunci

Nomor mengacu `KEPUTUSAN-SIPPA.md`. Kolom "bagian PRD" adalah tempat keputusan itu dieksekusi; tabel keterlacakan lengkap ada di §12.2.

| No | Keputusan | Bagian PRD |
| --- | --- | --- |
| 1 | Nama SIPPA | semua |
| 2 | Pemilik program BNPB | §3 |
| 3 | Pembaca buku Kepala BNPB | §8.1 |
| 4 | Pilot Oktober 2026 minggu ini; bila berhasil, kit untuk banjir Nov–Des 2026 | §4.1, §5.6 |
| 5 | Horizon 2026–2030 | §4 |
| 6 | Provinsi lain dibahas penuh | §5.2, §8.2 Bab 6 |
| 7 | Pemakaian ganda banjir masuk biaya-manfaat | §5.6, §6.3, §11.1 |
| 8 | Irigasi masuk, air dari sumber lain | §5.7 |
| 9 | Injeksi 1,5 m pilot; 3–5 m lengan uji kedua | §5.3, §6.5 |
| 10 | Surfaktan bebas PFAS sebagai lengan uji | §5.3, §6.7 |
| 11 | Tanpa batas halaman | §8 |
| 12 | Gambar teknik tingkat konstruksi, blok pengesahan insinyur kosong | §6.9 |
| 13 | RAB dihitung ulang | §11.1 |
| 14 | Harga heli angka BNPB, menyusul | §2.2, §7.4 |
| 15 | NPV, BCR, Monte Carlo | §8.2 Bab 18, §9.5 |
| 16, 17 | Matriks respons FRP dan luas | §5.4 |
| 18 | Simulasi Three.js di web, pola `sim_*` | §9.6 |
| 19 | Deck sekitar 15 slide (18 slide isi sesudah keputusan 55, T-M) | §8.5 |
| 20 | Tanpa bab kritik | §8.2 |
| 21 | YonTP gudang, tenaga gelar, transport; komando Satgas; operator inti Manggala Agni | §3.3, §5.5 |
| 22 | Tanpa dasar hukum TNI | §1.4 |
| 23 | Aset BMN BNPB, pinjam pakai | §3.3, §5.5 |
| 24 | Matriks RACI per tahap | §3.3 |
| 25 | Swasta/konsesi opsi kebijakan | §3.4 |
| 26 | Semua data terbuka ditarik | §7 |
| 27 | Draf surat permintaan data sebagai lampiran | §7.5, §8.2 Lampiran I |
| 28 | Batas data 23 Okt 2026 23.59 WIB | §7, §8.6 |
| 29 | Label keyakinan di semua angka | §1.5, §8 |
| 30 | Ambang zona air 2,5 km, jalan 5 km | §5.1 (pembanding ketat, keputusan 51) |
| 31 | Halaman `/pipa` | §9.1 |
| 32 | Hanya staf BNPB | §9.1, §9.8 |
| 33 | Daftar fitur web | §9.3–9.7 |
| 34 | Dashboard pemilik dibangun ulang, mesin dan gerbang dipertahankan | §9.5 |
| 35 | Lacak kit antar-daerah | §9.4 layar Kit |
| 36 | Pola admin worker | §9.8 |
| 37 | Form lapangan luring | §9.9 |
| 38 | Telemetri sensor kerangka siap | §9.11 |
| 39 | Laporan PDF otomatis | §9.10 |
| 40 | Bahasa Indonesia saja | §9.2 |
| 41 | Gaya Pantau Bencana | §9.2 |
| 42 | Desktop perencanaan, ponsel lapangan | §9.2 |
| 43 | Simulator membandingkan semua skenario | §9.5 |
| 44 | Peta per kompleks dan per sel 2,2 km dengan sakelar | §9.4 layar Peta |
| 45 | Mode gelap | §9.2 |
| 46 | PRD dulu, lalu buku dan web paralel | §10 |
| 47 | Kajian mitigasi ditunda | §1.4 |
| 48 | Maksimal 60% kuota minggu ini untuk pipa | §10.5 |
| 49 | Deploy setelah lolos uji, dari sesi induk | §10.6 |
| 50 | Enam larangan | §1.5 |
| 51 | Ambang zona memakai "<"; jarak tepat 2,50 atau 5,00 km = jauh | §5.1, §9.3, §9.12.2 |
| 52 | Warna zona buku dan deck biru dan emas dengan huruf A–D dan pola sama dengan web; web palet PRD + huruf + pola wajib | §8.1, §9.4.2, §9.13 |
| 53 | Definisi vonis pilot "dapat dipakai" tujuh butir | §1.3 U3, §4.1 minggu 44, §9.10, §11.3 |
| 54 | T-B dan T-C memakai bawaan §2.2 (pilot 28 Okt–1 Nov 2026, AOI mudah Palangka Raya) | §2.2, §4.1, §10.1 |
| 55 | GD SIPPA menyerap GD Rehabilitasi dan Rekonstruksi Air dan Akses: pipa + air tanah + akses jembatan + model pemeliharaan; tiga GD BNPB; Q1–Q20 rehab berlaku untuk air tanah dan akses kecuali bertentangan dengan 1–54 | §1.1, §1.2, §6.10, §8, §12.2 |
| 56 | Air tanah dan akses juga di web `/pipa` (bukan buku saja); layar jadwal pemeliharaan untuk kit, pipa, sumur, pompa, dan jembatan | §9.1.1, §9.4.9–§9.4.12, §9.7, §9.12, §9.14, §10.2 |

### 2.2 Pertanyaan terbuka dengan pemilik

Tidak menghalangi mulai kerja; tiap butir punya nilai bawaan yang dipakai sampai dijawab.

| Kode | Pertanyaan | Bawaan sementara | Dampak bila berubah |
| --- | --- | --- | --- |
| T-A | Harga helikopter water bombing (kontrak BNPB per jam dan per sorti) | slot `{{angka:sippa.heli.biaya_jam}}` kosong; perbandingan biaya memakai hanya pernyataan BNPB Sept 2023 "> Rp200 juta per sorti satu jam" [resmi, pernyataan] | tabel pembanding Bab 18 dan slide E1 |
| T-B | Lokasi dan tanggal pasti pilot minggu ini, siapa yang membawa pompa, dan jumlah lance yang tersedia | AOI mudah Palangka Raya (Bukit Batu/Jekan Raya) atau kompleks aktif terdekat Daops Palangka Raya; 2 lance pipa SS atau galvanis, 2 termometer tusuk | §4.1 minggu 44 |
| T-C | Apakah kit pilot Oktober memakai pompa Manggala Agni atau BPBD, dan siapa menandatangani pinjam pakai sementara | catat pemilik alat di `sippa_komponen.pemilik_asal`; tanpa dokumen formal untuk pilot | §5.5 |
| T-D | Daftar provinsi dan kabupaten banjir Nov–Des 2026 yang akan menerima kit | belum ada; layar Kit menyediakan tujuan bebas | §5.6 |
| T-E | Angka OPEX regu konvensional dari log Manggala Agni Kalteng 2026 (orang, jam, liter) | koefisien `bara_regu` 0,5–2,8 ha/regu/hari dari `operasi.json` | garis dasar A/B |
| T-F | Nilai manfaat (kerugian terhindar per ha) untuk NPV/BCR | manfaat 0 sebagai bawaan (seperti Studio pemilik), lalu dua skenario berlabel asumsi-kebijakan: biaya regu konvensional terhindar, dan biaya heli-hari terhindar | Bab 18 |
| T-G | Nama tanda tangan Kata Pengantar (Kepala BNPB) dan kolofon | sama dengan deck BNPB 21 Okt 2026 (KEPUTUSAN kajian T7), draf berpenanda periksa pemilik | bagian depan |
| T-H | Apakah `/pipa` dibuka juga untuk akun instansi (BPBD, Manggala Agni) atau hanya sesi admin dan staf | hanya admin dan staf BNPB (keputusan 32); form lapangan memakai kode regu ala `/lapangan` yang dibuat staf | §9.8 |
| T-I | Keluaran Deep Research ChatGPT pemilik (G27) | tidak diaudit; tidak dirujuk | tidak ada |
| T-J | Setuju telemetri disimpan satu baris per pesan (larik bacaan), bukan satu baris per bacaan, karena kuota tulis D1 gratis 100 rb baris per hari dipakai bersama seluruh situs (DESAIN-TEKNIS ADR-07) | satu baris per pesan, gateway mengirim tiap 60 detik (1.440 tulisan per kit per hari) | §9.11; skema 0058 |
| T-K | Paket D1 berbayar atau interval kirim 5 menit sebelum telemetri terpasang di lebih dari 30 kit (81 kit x 1.440 = 117 rb tulisan per hari) | diputus 2027 sebelum kit ke-31 dipasang sensor | §9.11, §11.1 baris Platform web |
| T-L | Judul buku gabungan | **Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030**, subjudul *Kit Pipa Bergerak, Air Pascabencana, Akses Jembatan, dan Pemeliharaan Aset*; nama SIPPA tetap (keputusan 1); berkas serah "Kajian SIPPA Terintegrasi {DDMMYY}" | sampul, kolofon, `tema.json` |
| T-M | Deck 18 slide isi (pipa, air, akses, pemeliharaan) melebihi "sekitar 15" keputusan 19 | 18 slide isi; gerbang deck 17–19 | KERANGKA-BUKU §11, RENCANA-UJI §5.3 |
| T-N | RAB, NPV, BCR untuk air tanah dan akses (keputusan 13 dan 15) atau hanya biaya satuan (rehab Q4) | hanya biaya satuan berlabel untuk air tanah dan akses; RAB, NPV, BCR, Monte Carlo untuk kit dan model pemeliharaan | Bab 18 |
| T-O | Peta publik `public/kajian/rehab/` (rehab T3) dicabut | dicabut; semua peta air tanah dan akses di `/pipa` berlogin | §9.4.10, §9.4.11 |
| T-P | Kit dengan komponen kritis berskor ≥ 2 atau inspeksi terlambat diblokir dari gerak `depot`/`gelar` | tidak diblokir; pil peringatan "tidak laik gelar" dan butir ringkas (pilot memakai alat pinjam; blokir dibuka lagi 2027 bila U12 gagal) | §6.10.4, §9.4.12 |
| T-Q | Jadwal: buku 22 bab tetap serah minggu 49, web R4 (air, akses, pemeliharaan) 7–20 Des 2026 | ya | §10, TIKET Sprint 4 |

Kode T-A sampai T-Q dipakai identik di semua dokumen SIPPA. Butir teknis yang diputus sesi induk memakai kode BT (DESAIN-TEKNIS §9.2) atau O (KERANGKA-BUKU §10), bukan T.

---

## 3. Pengguna, peran, RACI per tahap

### 3.1 Pengguna web dan padanan peran yang sudah ada

Repo sudah punya sistem staf (`src/staf.js` PERAN: verifikator, pusdalops, analis_konsesi, udara, tmc, koordalops, pimpinan) dan sesi admin (`adminOK`). SIPPA tidak membuat sistem akun baru; empat peran SIPPA dipetakan ke peran yang ada lewat satu tabel `HALAMAN_STAF.pipa` dan kolom `peran` di `src/sippa.js`.

| Peran SIPPA | Siapa | Peran repo yang dipetakan | Boleh |
| --- | --- | --- | --- |
| Admin SIPPA | pemilik, Super Admin | sesi admin (`adminOK`) | semua, termasuk membuat kit, menghapus data dummy, mengunduh semua CSV |
| Perencana | analis BNPB Pusdalops dan Direktorat terkait | `pusdalops`, `koordalops` | peta kelayakan, kalkulator, saran sarana, pemicu, simulator, 3D, laporan PDF; menulis skenario tersimpan; membaca semua log |
| Operator lapangan | petugas yang menggelar kit (Manggala Agni, BPBD, YonTP di bawah Satgas) | kode penugasan SIPPA (header `x-kode`, pola `x-kode-regu` di `/lapangan`), dibuat perencana per penugasan kit | form log time-motion dan probe (luring), mencatat pindah kit, foto |
| Pemantau | pimpinan, evaluator independen | akun staf berperan `pimpinan`; evaluator independen diberi akun staf berperan `pimpinan` oleh Super Admin (akun pemirsa tidak dipakai, karena daftar tabnya dikunci trigger `pemirsa_tab_sah` di 0036 untuk tab situs publik) | hanya baca dashboard A/B, inventaris, laporan PDF |

Operator lapangan tidak punya akun; ia memakai kode penugasan 26 heksadesimal (pola `kodeBaru` di `src/bnpb.js`, hanya sha256-nya disimpan) yang ditampilkan SEKALI sebagai tautan `/pipa/lapangan#k=<kode>` dan QR saat perencana menugaskan kit di layar Kit, pola yang sama dengan `public/lapangan.js` dan `sw-lapangan.js` (§9.9).

### 3.2 Pemangku di luar web

BNPB (pemilik program dan BMN), Satgas Karhutla provinsi (komando operasi), Manggala Agni/Brigdalkarhutla Kemenhut (operator inti bersertifikat, Permen LHK P.32/2016), BPBD provinsi dan kabupaten (regu, pompa, lokasi pilot, data kejadian), YonTP TNI (gudang, tenaga gelar, transport antar-daerah), BRGM (sekat kanal, TMA, KHG), Kemenhut (SiPongi, Daops, KHG walidata), pemegang konsesi dan masyarakat pemegang hak lahan (izin trase, persetujuan), BWS Kalimantan II (debit dan izin pengambilan air), BIG (DEMNAS), BMKG (prakiraan musim, FWI), LKPP (e-katalog).

### 3.3 Matriks RACI per tahap (keputusan 24)

R = bertanggung jawab mengerjakan, A = akuntabel memutus, C = dikonsultasikan, I = diberi tahu. Satu A per baris. Matriks ini masuk buku Bab 17.2 sebagai `matriks-lembaga` dan deck slide 15 (D3).

| Tahap | BNPB | Satgas prov | Manggala Agni | BPBD | YonTP | BRGM | Kemenhut | Konsesi/pemegang hak | BWS/BIG/BMKG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pilot Okt 2026 (alat yang ada) | A | R | R | R | I | I | I | C (bila di konsesi) | I |
| Pemakaian banjir Nov–Des 2026 | A | C | I | R | R (transport, gelar) | I | I | I | I |
| Pemilihan AOI dan survei tapak (G0, G1) | A, R | C | C | R | I | C (TMA, KHG) | C | C (persetujuan tertulis) | R (data) |
| Izin pengambilan air | I | C | I | C | I | I | I | I | A (BWS) |
| Pengadaan 3 kit pilot | A, R | I | C (spek) | C | C (gudang) | I | I | I | I |
| MoU pinjam pakai BMN | A | C | C | C | R (penerima) | I | C | I | I |
| Bench test (G2) | A | I | R | C | C | I | I | I | I |
| Pelatihan dan sertifikasi | A | C | R (kurikulum, sertifikasi) | R | R (peserta) | C | A untuk sertifikasi teknis | I | I |
| Pra-posisi dan gelar musim kemarau | I | A | R (operator inti) | R | R (gelar, transport) | I | I | C | I |
| Injeksi, verifikasi dingin, A/B | I | A | R | R | C | C | I | I | I |
| Pindah ke banjir (musim hujan) | A | C | I | R | R | I | I | I | I |
| Sekat kanal dan rewetting di sel inti | I | I | C | C | C | A, R | C | C | I |
| Evaluasi independen G4/G5 | A | C | C | C | I | C | C | I | I |
| Keputusan skala 2029+ | A | C | C | C | C | C | C | C | I |

Catatan: baris sekat kanal dipegang BRGM/KLHK sesuai prosedur yang ada (KD K-12); SIPPA hanya menumpang sebagai lengan pembanding.

### 3.4 Peran swasta dan konsesi (keputusan 25)

Ditulis sebagai opsi kebijakan di buku Bab 17.5, bukan bagian desain: (a) konsesi menyediakan akses trase, air kanal, dan tenaga MPA di wilayahnya dengan kit milik BNPB; (b) konsesi membeli kit sendiri mengikuti spesifikasi SIPPA dan mendaftarkannya ke inventaris; (c) konsesi menanggung OPEX bila kit dipakai di konsesinya. Tiap opsi diberi syarat: persetujuan tertulis sebelum survei, tidak ada kewajiban hukum baru yang diklaim, dan tidak ada nama/logo perusahaan di keluaran BNPB (keputusan 50).

---

## 4. Lini masa 2026–2030 dan gerbang

### 4.1 Minggu demi minggu, Oktober–Desember 2026

Minggu ISO. Hari ke-0 = 25 Oktober 2026 (PRD). Pekerjaan repo (buku, web) dicatat di §10; di sini yang dicatat adalah tonggak program dan lapangan.

| Minggu | Tanggal | Program dan lapangan | Keluaran repo yang harus siap |
| --- | --- | --- | --- |
| 43 | 24–25 Okt | PRD disetujui pemilik; T-B dan T-C dijawab | `PRD.md` |
| 44 | 26 Okt–1 Nov | **Pilot lapangan Okt 2026**: 2–3 sesi gelar di AOI mudah dengan pompa dan selang Manggala Agni/BPBD yang ada, 2 lance sederhana, termometer tusuk 0,1/0,3/0,5/1,0 m. Tiap sesi: catat tiba, mulai gelar, air mengalir, bongkar; petak probe sebelum dan 24 jam sesudah. Bila ada api aktif: 1 petak lance, 1 petak konvensional berdampingan. Vonis "dapat dipakai" pada 1 Nov menurut tujuh butir keputusan 53 (air sampai ujung lance ≥ 2 sesi di ≥ 2 petak; tiba-sampai-air ≤ 4 jam dengan lima waktu lengkap; tekanan ujung ≥ 2 bar ≥ 30 menit; tanpa gerbang keras; probe ≥ 90% lengkap; nol kecelakaan dan tanpa henti bocor > 30 menit; ≥ 95% komponen kembali berfungsi) | `/pipa/log` form luring dan `sippa_log_gelar` jalan (prioritas P0 §10.1); formulir kertas cadangan `kajian/pipa/formulir/G3-lite.pdf` |
| 45 | 2–8 Nov | Keputusan pemilik: lanjut ke banjir atau tidak. Bila ya: daftar tujuan banjir (T-D), pinjam pakai modul pompa banjir dari BPBD (pompa debit besar yang sudah ada), kit dicatat di inventaris | `/pipa/kit` inventaris dan gerak; `/pipa/ab` menampilkan hasil pilot dengan label "n kecil" |
| 46 | 9–15 Nov | Laporan pilot Okt (PDF otomatis dari `/pipa/laporan`) ke pimpinan; nota putusan: setuju studi + pilot 2027, tolak pembelian massal (KD §6 no 1) | `/pipa/laporan` templat "Laporan pilot"; buku Bab 16 draf |
| 47 | 16–22 Nov | Surat permintaan data terkirim (BIG, BWS Kalimantan II, walidata KHG/BRGM, BMKG, BPBD Kalteng, Manggala Agni, LKPP) memakai draf Lampiran I | `kajian/pipa/surat/*.md` |
| 48 | 23–29 Nov | Kit (alat pinjam) mulai dipindah ke daerah banjir sesuai T-D; YonTP transport dicatat | `/pipa/kit` status `banjir`, `sippa_gerak` |
| 49 | 30 Nov–6 Des | Operasi banjir pertama: log jam pompa, m3, lokasi; **buku kajian versi serah** (semua bab, QA lima lapis) | `sippa.docx/pdf`, `sippa-deck.pptx/pdf` |
| 50 | 7–13 Des | Pemilihan 3 AOI pilot 2027 dari lapisan kelayakan (G0 bagian data); daftar pemegang hak lahan untuk persetujuan | `data/sippa/keluaran/kelayakan_*.json`, `aoi_calon.json` |
| 51 | 14–20 Des | KAK pilot 2027 dan protokol A/B pra-registrasi draf (4 lengan: konvensional, kit + lance, kit + surfaktan, sekat kanal/rewetting) | `kajian/pipa/protokol-ab.md` |
| 52 | 21–27 Des | Operasi banjir berlanjut; laporan mingguan PDF | laporan PDF |
| 53 | 28 Des–3 Jan | Rekap 2026: jam pompa, m3, kehilangan komponen, pelajaran; pembaruan `angka.json` dan errata buku bila perlu | `kajian/pipa/rekap-2026.md` |

### 4.2 Bulan demi bulan 2027

| Bulan | Tonggak | Gerbang |
| --- | --- | --- |
| Jan | Operasi banjir berlanjut (kit pinjam); KAK dan protokol A/B final; evaluator independen ditunjuk | G0 tahap dokumen: AOI, persetujuan pemegang hak, izin air diajukan |
| Feb | Survei tapak 3 AOI: GNSS/drone, bor gambut, piezometer dipasang; bench test pompa-layflat-lance dimulai (kurva Q-H terukur, head loss 1 km, lance 15–40 L/min pada 2–4 bar, uji 1,5 kali tekanan kerja) | G2 mulai |
| Mar | FEED ringan kit: P&ID, BOM, gambar kit, titik kerja; RAB e-katalog + 3 penawaran; kit pinjam kembali dari banjir, inspeksi, catatan kehilangan | G2 selesai; harga asumsi diganti RFQ |
| Apr | Debit kemarau belum terukur (kemarau mulai Mei–Jun); piezometer berjalan; SOP 6 keluarga disahkan Satgas; MoU pinjam pakai BMN YonTP ditandatangani | G1 sebagian (piezometer) |
| Mei | Pengadaan 3 kit pilot (bila nota putusan dan RAB disetujui); pelatihan operator inti Manggala Agni 58 jam (kurikulum A2 sebagai rujukan, disesuaikan) | pengadaan hanya 3 kit |
| Jun | Latihan basah gabungan tanpa membakar di AOI mudah; pengukuran debit kemarau awal; pemicu pra-posisi dari `iklim_outlook` dan `fwi_ansambel` mulai dipantau | G1: debit ≥ 1,5 kali debit operasi atau tampungan ≥ 1 shift |
| Jul–Okt | **Musim pilot 1**: pra-posisi ke depot depan saat pemicu; time-motion ≥ 5 ulangan per kelas medan; A/B 4 lengan; cek ulang 24 jam, 72 jam, 7, 30, 90 hari | G3 (waktu gelar) dan G4 awal |
| Nov | Kit pindah ke banjir dengan modul banjir yang dibeli (bila G2 modul banjir lolos) | pemakaian ganda musim 2 |
| Des | Laporan antara; penempatan kit tambahan dari pemakaian musim pilot | penempatan kit |

### 4.3 Tahun demi tahun 2028–2030

| Tahun | Tonggak | Gerbang |
| --- | --- | --- |
| 2028 | Musim pilot 2 Jul–Nov di Kalteng dengan 3 kit + bila disetujui 2 kit tambahan untuk uji di provinsi mineral/sabana (NTT atau Papua Selatan, dipilih dari zona D terbanyak); musim hujan: kit ke banjir | G4 akhir musim 2; G5 bila ≥ 30 hari kebakaran aktif di AOI sudah terjadi dalam salah satu musim |
| 2029 | Evaluasi independen G4/G5 (Des 2028–Mar 2029); bila lulus: rencana skala Kalteng 20 kit dan 7 depot (KD §4.2, keputusan 60), lalu rencana nasional 81 kit bertahap mulai provinsi gambut terbesar (Sumsel 15, Kalteng 14, Kalsel 8); bila tidak lulus: kit dilebur ke inventaris pompa biasa | G5 |
| 2030 | Tahun pertama skala bertahap (bila G5 lulus): paling banyak 25 kit tambahan (gambut dulu), latihan tahunan di tiap provinsi penerima; evaluasi akhir horizon dan masukan Renas PB | evaluasi horizon |

### 4.4 Gerbang G0–G5 terkalibrasi

Dasarnya KD §1.3; perubahan mengikuti baca-C (G03, G20, G24) dan keputusan pemilik.

| Gerbang | Kapan | Lulus bila | Perubahan dari KD | Gagal berarti |
| --- | --- | --- | --- | --- |
| G0 Lokasi dan izin | Des 2026–Jan 2027 | 3 AOI dari lapisan kelayakan: sel 2,2 km aktif ≥ 7 dari 14 tahun (2012–2025), gambut, sumber air permanen < 2,5 km (permanen menurut survei tapak; GSW "tidak terdeteksi" tidak menggugurkan tetapi wajib dicek di lapangan), jalur akses kemarau dan hujan (jalan `track` OSM terverifikasi lapangan), persetujuan tertulis pemegang hak, **izin pengambilan air BWS diajukan** | ambang air 2 km menjadi 2,5 km (keputusan 30); izin air ditambahkan (G20) | ganti AOI |
| G1 Air | Feb–Jun 2027 | debit kemarau terukur ≥ 1,5 kali debit operasi (mis. ≥ 7,5 L/s untuk debit bawaan kit 5 L/s; ≥ 15 L/s bila relay dijalankan 10 L/s dengan selang serang) atau tampungan ≥ 1 shift; penurunan muka air tanah di piezometer 100 m dari intake < 10 cm setelah 24 jam pompa; izin pengambilan air terbit atau surat BWS tidak keberatan | izin air masuk | lokasi dicoret; jangan beli pompa |
| G2 Bench | Feb–Mar 2027 | kurva Q-H terukur; head loss layflat 1 km dalam ±15% model; lance 15–40 L/min pada 2–4 bar; tidak bocor pada 1,5 kali tekanan kerja; tutup katup lambat tanpa lonjakan melewati rating; NPSH dan surge dihitung; **modul banjir**: debit ≥ nilai rating pabrikan pada head 3–5 m, 8 jam tanpa henti | memasukkan G4-peralatan pemilik (Q-H, NPSH, surge, uji tekanan, kompatibilitas kimia surfaktan) sesuai G24; modul banjir ditambahkan (keputusan 7) | revisi diameter/pompa; hentikan lance bila tersumbat terus |
| G3 Waktu gelar | Jul–Okt 2027 | tiba-sampai-air-mengalir untuk relay layflat 1 km, ≥ 5 ulangan per kelas medan: **Kelas I** (jalan 4x4, gambut dangkal) p50 ≤ 4 jam, p90 ≤ 6 jam; **Kelas II** (darat + sungai, gambut sedang) p50 ≤ 8 jam, p90 ≤ 12 jam; **Kelas III** (perahu/portage, gambut dalam) p50 ≤ 24 jam, p90 ≤ 36 jam. Semua ambang [asumsi-kebijakan]; hipotesis atas dari mesin Studio pemilik 22–27 jam (I), 43–55 jam (II), 74 jam (III) dicatat sebagai batas yang harus dikalahkan | per kelas medan (G03); nilai Studio jadi hipotesis pembanding | kelas yang gagal: kit hanya untuk kebakaran multi-hari di kelas itu |
| G4 Efikasi | akhir musim 1 dan 2 | lengan kit + lance memberi ≥ 30% lebih banyak ha "dingin terverifikasi" per regu-hari, atau ≥ 30% lebih sedikit nyala ulang **30 hari**, 95% CI tidak memotong nol, n ≥ 8 petak per lengan; biaya per ha terverifikasi ≤ 1,2 kali konvensional; titik cek 7, 30, **90 hari** dicatat | 90 hari ditambahkan (G24) sebagai pencatatan, 30 hari tetap penentu | NO-GO skala; kit dilebur ke inventaris pompa biasa |
| G5 Skala | setelah musim 2 | G4 lulus, evaluasi independen, minimal satu musim dengan ≥ 30 hari kebakaran aktif di AOI | tetap | perpanjang pilot satu musim, jangan beli |
| G6 Kesiapsiagaan (ringan) | tiap tahun mulai 2027 | latihan basah gabungan tanpa membakar ≥ 1 kali per lokasi per tahun, after-action review tertulis, log BBM dan pemeliharaan lengkap, kehilangan komponen < 5% | baru (G08) | kit tidak dipindah ke depot depan sampai latihan dilakukan |

"Dingin terverifikasi" = semua probe pada 0,1/0,3/0,5/1,0 m di petak < 50 °C pada cek 24 jam dan 72 jam, dan tidak ada nyala ulang pada cek 7 hari (ambang 50 °C dari A2 [17], berlabel usulan, bukan standar pemerintah).

---

## 5. Lingkup operasional

### 5.1 Zona kelayakan A–D dan doktrin per zona

Zona dihitung per kompleks api dengan ambang pemilik air 2,5 km dan jalan 5 km (keputusan 30) dan pembanding ketat "<" (keputusan 51): jarak tepat 2,50 km atau 5,00 km masuk kelas "jauh". Kompleks tanpa data jalan (`jalan_km` null) dihitung "jauh". Rumusnya:

```
A  bila air_km <  2,5 dan jalan_km <  5
B  bila air_km <  2,5 dan (jalan_km >= 5 atau null)
C  bila air_km >= 2,5 dan jalan_km <  5
D  bila air_km >= 2,5 dan (jalan_km >= 5 atau null)
```

Tiga versi zona ditampilkan berdampingan, karena hasilnya bergantung pada jalan dan air mana yang dihitung (`pipa/data/matriks_jarak.md` dan `osm_jarak.csv`, tarikan OSM 24–25 Okt 2026, dihitung ulang 25 Okt 2026) [terverifikasi, OSM ODbL, jarak garis lurus ke garis OSM terdekat, dipadatkan 150 m, batas 16 km]:

| Zona | Versi `kendala.json` (label "Konservatif"): air dan jalan `kendala.json` | Versi jalan utama OSM: jalan tersier ke atas x semua air OSM | Versi semua jalan OSM (label "Optimistis"): semua jalan kendaraan termasuk `track` x semua air (sungai, kanal, parit, drain, tepi badan air) |
| --- | ---: | ---: | ---: |
| A | 188 (21,7%) | 198 (22,9%) | 469 (54,2%) |
| B | 418 (48,3%) | 429 (49,6%) | 158 (18,3%) |
| C | 89 (10,3%) | 81 (9,4%) | 167 (19,3%) |
| D | 170 (19,7%) | 157 (18,2%) | 71 (8,2%) |

Pergeseran dari versi `kendala.json` ke versi semua jalan OSM hampir seluruhnya berasal dari jalan `track` OSM: 263 kompleks pindah dari B ke A dan 83 dari D ke C. Jalan `track` belum tentu dapat dilalui pickup pada musim hujan dan kelengkapan OSM di gambut tidak seragam, jadi buku dan web menulis versi `kendala.json` sebagai angka perencanaan, versi semua jalan OSM sebagai batas atas, versi jalan utama OSM sebagai pembanding tengah, dan **mewajibkan verifikasi lapangan per `track` sebelum sebuah kompleks dinaikkan ke zona A atau C** (formulir survei trase di Lampiran G buku; versi "Terverifikasi" di web memakai zona semua jalan OSM hanya untuk kompleks yang cek jalannya lolos musim hujan, `sippa_jalan_cek`). Angka pendukung [terverifikasi]: median jarak ke jalan kendaraan 2,27 km (p90 11,74 km), 44 kompleks tanpa jalan kendaraan OSM dalam 16 km (versi `kendala.json`: 134 tanpa data jalan); median jarak ke air semua 1,02 km (p90 5,79 km), ke air kecil saja 1,67 km. Pada 9 provinsi yang sering mengalami karhutla (versi `kendala.json`): D 34%; Papua Selatan D 53%. Semua angka masuk `angka.json` sebagai `sippa.zona.kalteng.<konservatif|utama|optimistis>.<zona>.n` dan dihitung ulang oleh `scripts/data/sippa/zona.py` dari `osm_jarak.csv` dan `kendala.json`, bukan diketik.

Tiga temuan data tambahan yang mengubah doktrin (semua [terverifikasi] dengan keterbatasan tertulis di `pipa/data/README.md`):

- **Air umumnya lebih rendah dari kompleks** (median beda elevasi -3,9 m, Copernicus GLO-30 DSM yang masih memuat kanopi): pompa hampir selalu mendorong ke atas; profil trase wajib dari DEM di tiap AOI, dan head statis beberapa meter masuk kalkulator sebagai nilai awal.
- **Air terdekat sering tidak terlihat satelit**: JRC GSW di titik air terdekat 120 permanen, 103 musiman, 642 tidak terdeteksi (parit dan kanal kecil di bawah kanopi). "Tidak terdeteksi" bukan berarti kering, tetapi berarti debit kemarau tidak bisa ditebak dari peta; G1 (debit terukur) tidak dapat dilewati.
- **Berulang dalam ruang**: 300 kompleks terbakar pada 3 tahun atau lebih dalam 2001–2025 (MODIS MCD64A1, jendela 2,3 km); tahun Jul–Okt terkering CHIRPS: 2006, 2015, 2002, 2019.

| Zona | Arti | Doktrin | Sarana inti | Yang tidak dilakukan |
| --- | --- | --- | --- | --- |
| A | air dekat, jalan dekat | kit relay dibawa pickup; gelar layflat 0,5–1,5 km; injeksi dangkal; verifikasi probe | kit SIPPA lengkap, pickup 4x4 pinjam BPBD/Daops | heli, kecuali front > 6 jam tiba |
| B | air dekat, jalan jauh | kit dibawa perahu lewat kanal/sungai; sekat kanal di sel inti sebagai pencegahan; depot depan di tepi kanal | kit SIPPA (gulungan ≤ 30 kg per orang untuk portage), perahu serbaguna pinjam, sekat kanal BRGM | pipa HDPE panjang; kendaraan berat di gambut |
| C | air jauh, jalan dekat | sumur bor dangkal pra-posisi (Rp1,5–6 juta per titik, sekitar 3 jam per titik) sebagai sumber; tanker sebagai cadangan; kit dipakai dari sumur ke bara | pompa jinjing, sumur dangkal, mobil tangki pinjam | sumur dalam 50–100 m sebagai default |
| D | air jauh, jalan jauh | pencegahan (rewetting, sekat kanal, patroli), deteksi (satelit, drone termal), heli hanya darurat untuk menahan front; kit tidak dipra-posisikan | drone termal, pemantauan, heli bila `jam_tiba` > 6 | kit relay; klaim kit menggantikan heli |

Zona D 34% di sembilan provinsi dan 53% di Papua Selatan berarti kit tidak menjawab sepertiga sampai separuh kompleks; buku menulis angka ini di muka (Bab 5) supaya tidak ada klaim cakupan berlebih.

### 5.2 Lingkup nasional 18 provinsi dan 81 kit

Jumlah kit per provinsi = luas terbakar puncak SiPongi (maksimum 2019 atau 2023, `public/data/luas_resmi.json`) dibagi sekitar 22.700 ha per kit [asumsi-kebijakan: satu kit melayani 1 musim puncak dengan beban yang masih bisa ditangani; angka ini wajib ditulis sebagai asumsi dan diuji kepekaannya ±50% di Bab 18.7]. Pembulatan ke bilangan bulat terdekat, minimal 1 bila provinsi memakai gambut atau sabana dengan luas puncak ≥ 10.000 ha.

| Kelompok | Provinsi dan kit | Jumlah |
| --- | --- | --- |
| Gambut | Sumsel 15, Kalteng 14, Kalsel 8, Kalbar 7, Riau 4, Kaltim 3, Jambi 3, Lampung 2 | 56 |
| Mineral/sabana | Papua Selatan 7, NTT 6, NTB 3, Jatim 2, Maluku 2, Sultra 1, Sulsel 1, Sulteng 1, Jabar 1, Jateng 1 | 25 |
| Total | 18 provinsi | 81 |

Kit mineral/sabana memakai 75% biaya kit gambut (tanpa lance dan node suhu gambut, selang lebih pendek, lebih banyak nozzle) [asumsi-kebijakan]. Skrip `scripts/data/sippa/nasional.py` menghitung ulang tabel ini dari `luas_resmi.json` sehingga perubahan data SiPongi mengubah angka buku lewat token, bukan ketikan.

Pemakaian: ekstrapolasi nasional ditulis sebagai rencana bersyarat (hanya setelah G5) dengan tabel per provinsi berisi zona A–D (bila `kendala.json` mencakup provinsi itu; 9 provinsi), luas puncak, jumlah kit, depot yang diusulkan di Daops/BPBD, dan musim banjir pasangan.

### 5.3 Doktrin injeksi dan verifikasi

- Kedalaman doktrin 0–1,5 m (keputusan 9) dengan probe suhu pada 0,1/0,3/0,5/1,0 m. Lengan uji kedua 3–5 m hanya di petak yang probe 1,0 m masih > 50 °C setelah injeksi 1,5 m, dan hanya di pilot 2027–2028. Tidak pernah > 5 m (keputusan 50).
- Kebutuhan air dinyatakan per m3 gambut yang membara (hasil probe), bukan per ha seluruh lapisan (KD K-08). Nilai awal untuk perencanaan: 72 m3/ha [terverifikasi, Santoso dkk. 2021 di `operasi.json` `air_bara` lo], 200 m3/ha tengah, 500 m3/ha atas [asumsi platform]; diukur dengan flowmeter totalizer per petak.
- Surfaktan Class A bebas PFAS 0,1–0,3% sebagai lengan uji (keputusan 10): lembar data ekotoksisitas wajib, larangan dalam radius yang ditetapkan dari intake air minum dan perairan ikan (radius diisi dari kajian lingkungan Fase 0, slot `{{angka:sippa.surfaktan.radius_larangan_m}}`), sampel air hilir sebelum dan sesudah.
- Protokol perimeter-inti-verifikasi: pemetaan perimeter (drone RGB/termal, hanya permukaan), grid probe inti, injeksi, cek 24 jam, 72 jam, 7, 30, 90 hari. Drone termal tidak pernah dipakai sendiri untuk menyatakan padam.

### 5.4 Matriks respons FRP dan luas (keputusan 16)

FRP hanya penanda api menyala di permukaan, bukan kedalaman bara (G17). Matriks memakai koefisien `operasi.json` (`bara_regu` 0,5–2,8 ha/regu/hari, `orang_regu` 15, `jam_tiba`, `air_bara`) dan zona §5.1. Tiga sumbu: FRP maksimum 24 jam di kompleks (MW, dari VIIRS), luas bara terindikasi (ha, dari piksel 24 jam di gambut), dan zona. Keluaran: regu, hari, sarana, dan pemicu heli.

| Tingkat | FRP maks 24 jam | Luas bara (ha) | Regu (15 orang) | Hari kerja (tengah `bara_regu` dibaca dari `operasi.json`, saat ini 1,0 ha/regu/hari) | Sarana | Heli |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | < 10 MW | ≤ 2 | 1 | ≤ 2 | pompa jinjing + selang 500 m + 2 lance; sumur dangkal bila zona C | tidak |
| 2 | 10–30 MW | 2–10 | 2 | 1–5 | 1 kit relay; 8 lance; flowmeter; probe | tidak, kecuali `jam_tiba` > 6 |
| 3 | 30–100 MW | 10–50 | 3–4 | 3–12 | 1–2 kit; sekat basah; drone termal | menahan front bila `jam_tiba` > 6 |
| 4 | > 100 MW atau luas > 50 ha | > 50 | ≥ 5 | > 10 | 2 kit + regu garis; evakuasi asap | ya untuk front; kit hanya di sisi yang sudah tertahan |

Angka regu dan hari dihitung oleh fungsi murni `matriksRespons(frp, luasHa, zona, koef)` di `public/pipa/hitung.js` dan Python kembarnya `scripts/data/sippa/respons.py`; ambang FRP [asumsi-kebijakan] dan wajib diuji terhadap log 2026 (`/api/pipa/lapangan` yang sudah ada di `src/pipa.js`) sebelum buku final; bila log menunjukkan ambang lain, tabel diganti dari data.

### 5.5 Daftar SOP

Enam keluarga SOP, ditulis di buku Bab 10 dan Lampiran G sebagai prosedur bernomor, bukan narasi. Tiap SOP memuat: tujuan, pelaku (RACI), prasyarat, langkah bernomor, titik berhenti (stop-work), formulir yang dipakai, dan rujukan.

| Kode | SOP | Titik berhenti wajib |
| --- | --- | --- |
| SOP-01 Gelar dan bongkar relay | survei trase cepat, distribusi gulungan, gelar layflat, kopling, uji tekanan per seksi, air mengalir, bongkar dan gulung | tidak ada rute aman atau jembatan tidak kuat; tekanan uji melewati rating |
| SOP-02 Injeksi dangkal dan verifikasi dingin | grid probe, lance 0–1,5 m, totalizer, cek ulang 24 jam/72 jam/7/30/90 hari | probe menunjukkan rongga (burn-through); lance tersumbat berulang |
| SOP-03 K3 | gas CO/PM2.5, APD, larangan masuk gambut tak tertopang, jalur lolos, medik, komunikasi | CO melewati ambang; api memotong jalur lolos; tanpa kontak radio |
| SOP-04 BBM | penerimaan, penyaluran, pengisian mesin mati dan dingin, spill kit, log append-only (pola `inventori_bbm.py`), cadangan 1,25 kali | wadah tanpa penampung sekunder |
| SOP-05 Pompa dan katup | start, prime, NPSH, tutup katup lambat, relief, dry-run interlock, pemeliharaan per shift/mingguan/bulanan/triwulan/tahunan | dry-run; tekanan > 88% PN terkoreksi suhu |
| SOP-06 Pindah ke banjir dan kembali | inspeksi pasca-musim, pencatatan kehilangan, pasang modul banjir, transport YonTP, log jam pompa dan m3, kembali ke gudang, dekontaminasi | komponen hilang > 5% tanpa laporan; modul banjir dipasang di kanal gambut (de-watering) |

### 5.6 Logistik antar-daerah dan gudang YonTP

- Gudang induk: gudang YonTP terdekat Daops (pinjam pakai BMN, keputusan 23), dengan kontainer terkunci untuk kit, tangki BBM berdinding ganda, rak gulungan, bin ber-QR. Ukuran rujukan dari dokumen pemilik 24 x 12 x 5 m [asumsi pemilik, A1]; ukuran final dari jumlah kit per depot (Lampiran D buku: 1 kit = sekitar 12 m3 volume simpan [asumsi, dihitung dari BOM]).
- Depot depan: kontainer 20 kaki di tepi jalan/kanal AOI, diisi saat pemicu pra-posisi, dikosongkan tiap akhir musim.
- Siklus tahunan satu kit: Mei–Okt karhutla (depot depan saat pemicu), Nov–Apr banjir (pindah ke kabupaten banjir dengan modul banjir), Mar–Apr inspeksi dan servis. Pelacakan di `/pipa/kit` dengan status `gudang`, `depot`, `gelar`, `banjir`, `servis`, `hilang`.
- Yang dibagi antara karhutla dan banjir: layflat besar DN100/DN150, truk/pickup, perahu, gudang, kru YonTP, sistem gudang. Yang tidak dibagi: pompa api (head tinggi) dan modul banjir (head rendah), lance, probe.
- Transport antar-daerah: YonTP (keputusan 21) dengan permintaan tertulis Satgas/BPBD penerima; ETA p50/p90 dicatat di log gerak; kendaraan dan perahu diasumsikan pinjam dari BPBD/Daops/YonTP (G06); bila harus dibeli, item masuk RAB sebagai baris terpisah.

### 5.7 Irigasi (keputusan 8)

Irigasi masuk sebagai pemakaian musim peralihan dengan syarat keras yang sama dengan dashboard pemilik: tidak boleh menurunkan muka air gambut, tidak boleh menambah drainase gambut, dan air berasal dari sumber lain (sungai besar, embung, waduk di luar kubah gambut), bukan air yang dipakai pemadaman atau kanal gambut. Bentuknya: pompa banjir dan layflat dipinjamkan ke kelompok tani di luar KHG pada Maret–April, dengan biaya BBM ditanggung peminjam. Manfaatnya dihitung di Bab 11 dan Bab 18 sebagai skenario BCR tersendiri berlabel asumsi-kebijakan (BCR inti, BCR + banjir, BCR + banjir + irigasi ditampilkan berdampingan), karena KD K-14 dan Studio pemilik keduanya menandai risiko de-watering; bila syarat keras irigasi tidak terpenuhi di satu kabupaten, manfaat irigasinya nol.

### 5.8 Pelatihan dan latihan tahunan

- Operator inti Manggala Agni dan BPBD: kurikulum 58 jam rujukan A2 (ekologi 4, FWI/GIS 6, pompa/hidraulika 8, pipa/selang 6, injeksi/probing 8, drone 4, HSE 6, lapangan terpadu 8, malam 4, asesmen 4), disesuaikan setelah G2; sertifikasi teknis oleh Kemenhut.
- YonTP: modul gelar, transport, gudang, K3 (8 jam teori + 12 jam latihan, rujukan A3); rotasi personel diatasi dengan latihan ulang tiap tahun dan operator inti bukan TNI.
- Latihan tahunan (G6): latihan basah gabungan tanpa membakar sebelum musim kemarau, simulasi pindah ke banjir sebelum musim hujan, after-action review. Biaya Rp52–95 juta per lokasi per tahun [asumsi, Studio pemilik] masuk OPEX.

---

## 6. Lingkup teknis kit

### 6.1 Definisi kit relay portabel SIPPA (konfigurasi gambut)

Satu kit melayani satu kompleks dengan sumber air 300 m sampai 2,5 km dari bara, debit operasi bawaan 300 L/min (5 L/s) untuk 8 lance (serapan 8 x 40 = 320 L/min); relay DN100 sanggup 10 L/s, tetapi debit di atas serapan lance hanya sah bila ada pemakai lain yang tercatat (selang serang, perimeter) lewat `serap_lain_lpm`, dan jumlah lance per kit dikonfirmasi bench G2 (keputusan sesi induk 25 Okt 2026, PENYELARASAN butir 6), ditarik dari KD §3.1 dan K-09, dengan tambahan dari baca-C (kendaraan dan perahu dipinjam, telemetri, keamanan). Struktur BOM mengikuti kode P-/E-/H-/C-/G-/V-/ST-/SF-/FT-/PT-/LT-/T-/GWT-/M-/I-/U-/S-/B-/Q- dari paket pemilik (baca-B §2 BOM) supaya RFQ bisa dicocokkan.

| Kode | Komponen | Jumlah | Spesifikasi titik kerja | Keyakinan harga |
| --- | --- | --- | --- | --- |
| P-101/102 | Pompa portabel kelas Tohatsu VE1500W atau setara, bensin RON ≥ 91 | 2 (N+1 saat relay) | 1.500 L/min pada 1,0 MPa, 2.050 L/min pada 0,6 MPa, 44 kW, 22 L/jam pada rating [terverifikasi, pabrikan]; FAT kurva Q-H sebelum bayar | terverifikasi (listing Rp190,78 juta termasuk PPN) |
| H-101 | Layflat DN100 bersertifikat, lapis nitril, panjang gulung 100 m | 1.000 m (10 gulung) | tekanan kerja ≥ 12 bar, uji 1,5 kali; ID aktual dari datasheet (tidak diasumsikan 0,96 OD) | asumsi (Rp275 ribu/m) |
| H-201 | Layflat DN65 | 500 m (5 gulung) | tekanan kerja ≥ 16 bar | asumsi (Rp165 ribu/m) |
| H-301 | Selang serang 38 mm + nozzle variabel | 4 set, 6 nozzle | 25–40 bar rating | asumsi |
| I-101 | Lance injeksi SS316 1,5 m, ball valve, ujung berlubang; versi teleskopik 3–5 m untuk lengan uji | 8 (+2 teleskopik di pilot 2027) | 15–40 L/min pada 2–4 bar; diameter lubang ditetapkan dari bench G2, bukan sebelum uji | asumsi (Rp4,2 juta) |
| M-101 | Manifold DN100 ke 4 x DN65 dengan katup bola per outlet | 2 | PN16 | asumsi (Rp25 juta) |
| C-101 | Kopling Storz DN100/DN65 dan adaptor ke pompa | 20 | gasket EPDM; tanpa baut (Storz) | asumsi (Rp2,4 juta) |
| ST-101 | Selang hisap + foot valve + strainer kasar 5 mm | 2 | NPSHA > NPSHR + margin | asumsi (Rp28 juta) |
| SF-101 | Filter servis + bypass | 2 | mesh ditetapkan dari uji sumbat G2 (jangan paksa 200 mesh) | asumsi (Rp19 juta) |
| V-101 | Katup isolasi, cek, pelepas udara; relief set ≤ 88% PN | 2 set | tutup lambat | asumsi (Rp13,5 juta) |
| FT-101 | Flowmeter totalizer | 2 | ±1–2% | asumsi (Rp18 juta) |
| PT-101/102/201 | Sensor tekanan hisap, buang, distal | 4 | 0–16/0–25 bar, ±0,5% FS | asumsi (Rp8,5 juta) |
| T-101 | Node suhu gambut 4 kedalaman + TMA | 8 | 0,1/0,3/0,5/1,0 m; sampling 1–10 menit | asumsi (Rp12 juta) |
| GWT-101 | Piezometer/logger | 2 per kit (12 per pilot) | 10–30 menit | asumsi |
| U-102 | Gateway LoRa/satelit + logger tepi | 1 | pola JSON §9.11 | asumsi (Rp25 juta) |
| Q-101 | APD 20 orang, gas monitor CO, P3K | 1 paket | Nomex atau setara, respirator P100 | asumsi (Rp140 juta) |
| S-104 | Kontainer terkunci, tangki BBM dinding ganda, radio | 1 per depot, bukan per kit | | asumsi |
| B-101 | Baut/mur/washer | 0 sampai gambar OEM | "jangan estimasi baut sebelum detail flensa" (baca-B) | tidak dihitung |

Kit mineral/sabana: tanpa I-101, T-101, GWT-101; H-101 800 m; nozzle 10; 75% biaya kit gambut.

### 6.2 Titik kerja pompa api

Spesifikasi ditulis sebagai tekanan di **ujung** (manifold) 2–4 bar pada debit operasi, dipilih dari kurva Q-H pabrikan, bukan "10 bar di pompa" (KD K-01). Contoh perencanaan yang masuk kalkulator dan buku:

- Relay DN100 1 km, 10 L/s, C = 130 (layflat berlapis, asumsi sampai bench), ID 100 mm: head gesek 19,06 m/km [estimasi-model, kasus acuan H4 DESAIN-TEKNIS §5.8]; dengan elevasi +2 m, minor K = 5, sisa 3 bar di manifold, 3,5 m hisap: TDH 55,6 m, tekanan pompa 5,45 bar, daya poros 8,4 kW pada efisiensi 0,65, jauh di bawah kemampuan VE1500. Pada debit bawaan 5 L/s head gesek turun ke 5,28 m/km. Booster tidak diperlukan untuk 1 km; untuk 2 km atau elevasi > 10 m dihitung dari profil DEMNAS, bukan "tiap 1 km" (K-04).
- Uji invarian wajib di kalkulator, tanda hisap ditulis eksplisit: HDPE OD160 SDR11, 2.000 L/min, 2 km, +10 m, sisa 2 bar, C 130, tanpa 3,5 m hisap harus NO-GO tekanan (ID 130,9 mm, head gesek 95,45 m, 12,49 bar > 88% x 16 bar x derating 35 °C 0,79 = 11,12 bar; dengan hisap 12,84 bar) (G04). OD200 pada kondisi sama lolos (6,20 bar tanpa hisap; 6,54 bar dengan hisap).

### 6.3 Modul banjir (keputusan 7)

Pompa api head tinggi debit kecil tidak cocok untuk genangan (KD K-13: 1 ha x 0,5 m = 5.000 m3, pada 30 L/s sekitar 46 jam). Modul banjir adalah pompa debit besar head rendah terpisah yang memakai layflat DN150 dan kru yang sama:

| Komponen | Spesifikasi awal | Keyakinan |
| --- | --- | --- |
| Pompa banjir portabel (submersible atau self-priming diesel) | ≥ 100 L/s pada head 3–5 m, 8 jam tanpa henti; angka final dari RFQ dan G2 | asumsi (Studio pemilik Rp250 juta per unit) |
| Layflat DN150 | 300 m per modul; 1 ha genangan 0,5 m pada 100 L/s sekitar 14 jam [estimasi-model] | asumsi |
| Pelampung dan jangkar intake | mencegah hisap lumpur | asumsi |
| Katup cek dan selang buang | ke saluran penerima; tidak ke kanal gambut | asumsi |

Satu modul banjir per kit gambut di provinsi yang punya musim banjir pasangan (Kalteng, Kalsel, Kalbar, Sumsel, Riau, Jambi, Kaltim, Lampung); untuk provinsi sabana modul banjir ditimbang per kasus (NTT banjir bandang; Papua Selatan banjir dataran rendah).

### 6.4 Hidraulika

Rumus yang dipakai kalkulator, simulator, dan buku, dengan fungsi murni kembar JS (`public/pipa/hitung.js`) dan Python (`scripts/data/sippa/hidraulika.py`) yang diuji terhadap nilai acuan tabel A4 hlm 31 dan jalan-ulang Studio (baca-C C1.4):

| Besaran | Rumus | Catatan |
| --- | --- | --- |
| ID HDPE | ID = OD x (1 - 2/SDR) | OD200 SDR11 = 163,6 mm; OD160 SDR11 = 130,9 mm |
| ID layflat | dari datasheet; bila kosong, 0,96 x DN dengan pil asumsi | Studio memakai 0,96 OD |
| Head gesek | Hazen-Williams SI: h_f = 10,67 L Q^1,852 / (C^1,852 D^4,871) | C: HDPE 135–140, layflat 120–130; nilai C ditampilkan dan bisa diubah |
| Head minor | h_m = K v^2 / (2g), K bawaan 5 | |
| TDH | Δz + h_f + h_m + tekanan sisa (bar x 10,197 m) + 3,5 m hisap/filter | |
| Daya poros | P = ρ g Q TDH / η, η bawaan 0,65 (batas 0,35–0,9) | HP = kW / 0,7457 |
| BBM bensin | 22 L/jam per VE1500 pada rating [terverifikasi] | dikalikan jam pompa |
| BBM solar | L/jam = kW poros x 0,25 / 0,84 | BSFC 0,25 kg/kWh, solar 0,84 kg/L [asumsi] |
| Derating suhu HDPE | f = 1 - 0,014 (T - 20), batas 0,58–1 | 35 °C = 0,79; penyaringan, bukan datasheet (G05) |
| Gerbang tekanan | NO-GO bila tekanan hitung > 0,88 x PN x f | PN16 SDR11, PN10 SDR17 |
| Kecepatan | peringatan bila v > 3 m/s (water hammer); ideal 0,9–2 m/s | |
| Tekanan sisa | NO-GO bila < 1 bar; peringatan bila < 2 bar | |
| Lonjakan Joukowsky | ΔP = ρ a Δv, a = 300 m/s HDPE (asumsi), layflat lebih rendah | tutup katup lambat |
| Volume isi dan waktu tiba | V = π D^2/4 x L; t = V/Q | DN100 1 km: 7,85 m3, 13 menit pada 10 L/s |
| Serap lance vs debit | NO-GO bila Q pompa > n_lance x 40 L/min (debit tidak terserap) | K-09, G22 |
| CO2 BBM | bensin 2,31 kg/L, solar 2,68 kg/L | hanya BBM (G25) |
| Neraca air sumber | stok_t+1 = stok_t + max(0, Q95 - Q_eko) x 86,4 - Q_api x 86,4 - evap; NO-GO bila negatif | per hari, m3; faktor 1,5 untuk G1 |

### 6.5 Lance

Lance 1,5 m SS316 (atau galvanis untuk pilot Okt 2026 dengan catatan korosi), pipa 1,5 inci, ball valve, ujung kerucut berlubang. Diameter dan jumlah lubang ditetapkan dari bench (orifis ideal 8 lubang 2 mm pada 2 bar sekitar 19 L/min; 2,5 mm sekitar 29 L/min, A2). Versi teleskopik 3–5 m hanya untuk lengan uji kedua. Gambar teknik G-04 (§6.9). Kriteria terima: debit 15–40 L/min pada 2–4 bar tanpa tersumbat selama 30 menit di air kanal gambut TSS lokasi.

### 6.6 Sensor dan telemetri lapangan

Dari sheet SENSOR pemilik, dipilih yang menentukan G1–G4: PT hisap/buang/distal 0,5–5 detik; FT 1–5 detik; termistor gambut 4 kedalaman 1–10 menit; piezometer 10–30 menit; level intake 1–5 menit; CO/PM2.5 1–30 detik (K3); level BBM dan RPM 5–30 detik. Format pesan dan rute ingest di §9.11. Pada pilot Okt 2026 semua dicatat manual lewat form luring; sensor dipasang mulai 2027.

### 6.7 Surfaktan

Lihat §5.3. Kriteria terima lengan: produk bebas fluor/PFAS, lembar data keselamatan dan ekotoksisitas, dosis 0,1–0,3% lewat eductor, zona larangan, sampel air hilir sebelum dan 24 jam sesudah, pencatatan liter per petak. Klaim "3–5 kali lebih cepat" (A1) tidak dipakai; kecepatan penetrasi diukur dari probe.

### 6.8 Material dan trase yang ditutup

Ditulis satu subbab pendek (G12, G28): baja berlapis (sekitar 2,7 kali harga HDPE OD200) dan pipa tertanam NO-GO untuk kit portabel (mahal, merusak hidrologi gambut), berlaku hanya untuk spool logam ujung panas; HDPE tidak dipakai (koridor dicabut, keputusan 60); umur desain HDPE 50 tahun berlaku pada kondisi standar, tidak di gambut terbakar.

### 6.9 Daftar gambar teknik (keputusan 12) dan kriteria terima

Tingkat konstruksi dengan blok judul standar: nomor gambar, revisi, skala, satuan, tanggal, "digambar", "diperiksa", dan blok **Pengesahan insinyur berlisensi: nama, nomor STRA/SKA, tanda tangan, tanggal** dikosongkan. Semua gambar bertanda "Wajib verifikasi dan pengesahan insinyur berlisensi sebelum dibangun". Dirender SVG dari `kajian/bangun/visual/teknik/*.mjs` (Node stdlib, pola `bangun/visual`) ke PNG 300 dpi untuk DOCX dan PDF A3 lipat untuk Lampiran F.

| Nomor | Gambar | Isi minimum | Kriteria terima |
| --- | --- | --- | --- |
| SIPPA-G-01 | Susunan kit relay (GA) | pompa, selang hisap, filter, DN100, manifold, DN65, lance, flowmeter, sensor; dimensi gulungan dan berat | tiap komponen BOM §6.1 muncul dengan kode; berat per gulungan ≤ batas angkat 2 orang |
| SIPPA-G-02 | P&ID kit relay | PT/FT/LT/T tag, katup, relief, bypass filter, arah aliran, interlock dry-run | tag identik dengan skema telemetri §9.11; relief ≤ 88% PN |
| SIPPA-G-03 | Detail lance 1,5 m dan teleskopik 3–5 m | potongan, ulir, ball valve, pola lubang (nilai bench), material | dimensi lengkap; catatan "lubang ditetapkan dari bench G2" |
| SIPPA-G-04 | Manifold DN100 ke 4 x DN65 | flensa/Storz, katup, tekanan rating, pengelasan | PN16; tanpa baut yang tidak terdefinisi |
| SIPPA-G-05 | Depot depan (kontainer 20 kaki) | rak gulungan, bin QR, tangki BBM dinding ganda, ventilasi, kunci | kapasitas 1–2 kit; jarak BBM dari pompa |
| SIPPA-G-06 | Gudang induk YonTP | denah, lantai 3 ton/m2 (asumsi A1, diverifikasi), zona servis, dekontaminasi | menampung kit per depot sesuai §5.2 |
| SIPPA-G-07 | dicabut (keputusan 60; rumah pompa panggung hanya untuk koridor) | – | – |
| SIPPA-G-08 | Profil trase relay contoh dari DEMNAS | elevasi per 5–20 m, titik booster bila ada, tekanan sepanjang trase | dari elevasi nyata AOI, bukan sintetis: DEMNAS bila sudah diterima dari BIG, sebelumnya Copernicus GLO-30 berlabel "DSM berkanopi" dan diganti saat DEMNAS tiba (KERANGKA-BUKU §7.3, O7) |
| SIPPA-G-09 | Modul banjir GA dan P&ID | pompa, intake terapung, DN150, katup cek | debit dan head rating |
| SIPPA-G-10 | Skema telemetri dan daya (PV, baterai, gateway) | | tag sama dengan G-02 |
| SIPPA-G-11 | Diagram zona A–D dan alur keputusan sarana | | identik dengan aturan `saranSarana` |
| SIPPA-G-12 | Peta tata letak petak A/B dan grid probe | | sesuai protokol A/B |

### 6.10 Model pemeliharaan aset terpadu (keputusan 55, 56)

Satu model untuk semua aset yang dipegang atau dicatat SIPPA: kit dan komponennya, sumur bor dan pompanya, perpipaan sementara pascabencana, serta jembatan darurat dan jembatan permanen yang dipantau. Model ini menggantikan "interval pemeliharaan per shift, mingguan, bulanan, triwulan, tahunan" yang dulu ada di Bab 8.6 buku. Semua interval, laju, dan persen di bawah berlabel **[asumsi-kebijakan]** sampai diganti interval lembar data pabrikan, pedoman pemilik aset (Bina Marga untuk jembatan, Cipta Karya untuk SPAM, Badan Geologi untuk sumur), atau data musim 2027 dari `sippa_inspeksi` dan `sippa_stok_gerak`; kecuali disebut lain. Konstanta tinggal di satu modul murni `public/pipa/pelihara.js` (diimpor layar, worker, dan pembangun buku lewat `data/sippa/pelihara.csv` yang dibangkitkan dari modul itu; DESAIN-TEKNIS §5.10).

#### 6.10.1 Sepuluh kelas aset

| Kelas | Aset | Sumber data di `/pipa` | Pemilik aset | Pemelihara tingkat 1 (rutin) | Pemelihara tingkat 2 (bengkel, uji) |
| --- | --- | --- | --- | --- | --- |
| K1 | Pompa api, pompa banjir, booster (kode BOM `P-`, `E-`) | `sippa_komponen` + jam pompa dari `sippa_log_gelar` | BNPB (BMN) | operator Manggala Agni/BPBD saat gelar; YonTP di gudang | penyedia servis kontrak BNPB; FAT kurva Q-H |
| K2 | Selang layflat, selang serang, selang hisap (`H-`, `ST-`) | `sippa_komponen` | BNPB (BMN) | operator (bilas, kering, gulung) | YonTP atau penyedia (uji tekanan 1,5 kali) |
| K3 | Manifold, kopling, katup, filter, lance (`M-`, `C-`, `V-`, `SF-`, `I-`, `G-`) | `sippa_komponen` | BNPB (BMN) | operator | YonTP atau penyedia (uji relief, uji debit lance) |
| K4 | Sensor dan telemetri (`FT-`, `PT-`, `LT-`, `T-`, `GWT-`, `U-`) | `sippa_komponen`, `sippa_perangkat`, alarm `diam` | BNPB (BMN) | operator (baterai, bersih) | penyedia kalibrasi |
| K5 | APD, gas monitor, kontainer depot, tangki BBM, baut (`Q-`, `S-`, `B-`) | `sippa_komponen` | BNPB (BMN) | YonTP | penyedia kalibrasi gas monitor |
| K7 | Sumur bor darurat atau produksi beserta pompa sumur dan panel | `sippa_aset` kelas `sumur_bor`, `pompa_sumur` | pelaksana sampai serah terima (BNPB/BPBD, Badan Geologi, Kementerian PU, TNI AD, Polri), lalu pemda, desa, atau PDAM | pengelola setempat | Badan Geologi (rekomendasi teknis, muka air), dinas kesehatan atau laboratorium (mutu air) |
| K8 | Perpipaan sementara, tandon, hidran umum pascabencana | `sippa_aset` kelas `pipa_sementara`, `tandon_hidran` | BPBD, PDAM, atau Kementerian PU (Cipta Karya) | PDAM atau BPBD | Cipta Karya |
| K9 | Jembatan darurat bailey atau rangka baja DSP BNPB, terpasang atau di gudang | `sippa_aset` kelas `jembatan_darurat` | penerima hibah barang DSP sesudah serah terima (pemda); stok gudang BNPB | penerima (pemda/BPBD) | Kementerian PU (Bina Marga) atau TNI (Zeni) |
| K10 | Jembatan permanen dan jembatan gantung yang dipantau (program Kementerian PU, Satgas Pembangunan Jembatan TNI AD, Jembatan Merah Putih Presisi Polri, pemda, desa) | `sippa_aset` kelas `jembatan_permanen` | pemilik program lalu pemda atau desa | pemilik aset | pemilik aset; **BNPB hanya mencatat kondisi dari sumber pemilik dan cek cepat pascabencana bersama BPBD** |

Pemetaan awalan kode BOM ke kelas K1–K5 dikunci di `pelihara.js` `KELAS_BOM`; uji menolak awalan `TEMPLAT_BOM` yang tidak berkelas atau berkelas ganda (RENCANA-UJI §2.3 Pemeliharaan).

#### 6.10.2 Siklus inspeksi

| Kelas | Tiap pakai | Berkala | Pra-musim (April karhutla, Oktober banjir) | Tahunan dan sesudah kejadian |
| --- | --- | --- | --- | --- |
| K1 | pra-gelar dan pasca-gelar (oli, bahan bakar, kebocoran, nyala) | nyala uji 15 menit tiap 30 hari di gudang; servis oli, filter, busi tiap 50 jam operasi atau 180 hari, mana lebih dulu | uji kurva Q-H tiga titik terhadap FAT | overhaul tiap 500 jam operasi |
| K2 | pasca-gelar: bilas, kering, periksa lecet, catat tambalan | | | uji tekanan 1,5 kali tekanan kerja tiap 12 bulan dan sesudah tiap tambalan; afkir bila lebih dari 3 tambalan per gulung 100 m atau gagal uji |
| K3 | pasca-gelar: filter dibersihkan, gasket kopling diperiksa | | gasket kopling diganti; uji debit lance 15–40 L/min pada 2–4 bar (§6.5) | uji set relief ≤ 88% PN |
| K4 | pasca-gelar: bersih, kering | baterai tiap pra-musim | uji fungsi dan alarm | kalibrasi (FT ±1–2%, PT ±0,5% FS) |
| K5 | | gas monitor CO kalibrasi tiap 6 bulan; tangki BBM dan kontainer periksa bocor tiap 6 bulan | APD diperiksa masa pakai | inventaris |
| K7 | | ukur muka air statis dan debit tiap 6 bulan; pompa sumur servis tiap 250 jam atau 6 bulan | | uji mutu air (E. coli, arsen, salinitas di pesisir) saat serah terima, hari ke-30, lalu tiap 6 bulan selama dikelola BPBD; evaluasi fungsi 12 bulan sesudah serah terima |
| K8 | harian selama tanggap darurat (bocor, klorin sisa), mingguan sesudahnya | | | titik serah ke PDAM atau pemda dicatat |
| K9 | inspeksi sesudah pasang | bulanan selama musim hujan; sesudah tiap banjir | | inventaris panel dan baut stok gudang tiap tahun (rekomendasi rehab R-RR-06) |
| K10 | | | | inspeksi tahunan oleh pemilik dicatat sebagai sumber; cek cepat pascabencana bersama BPBD |

Jadwal **dihitung, tidak disimpan**: jatuh tempo = waktu inspeksi terakhir + interval kelas, atau jam operasi sejak servis terakhir ≥ batas jam (`SippaPelihara.jadwal()`). Status butir: **aman** (> 14 hari sebelum jatuh tempo), **segera** (≤ 14 hari), **terlambat** (lewat jatuh tempo), **belum pernah** (tanpa inspeksi tercatat).

#### 6.10.3 Skor kondisi

Satu skala 0–3 untuk semua kelas, sama dengan enum `sippa_komponen.kondisi` yang sudah ada sehingga tidak ada kolom baru di 0056:

| Skor | `kondisi` | Arti | Tindakan |
| --- | --- | --- | --- |
| 0 | `baik` | laik pakai | tidak ada |
| 1 | `rusak_ringan` | laik pakai dengan catatan | perbaikan dijadwalkan ≤ 30 hari |
| 2 | `rusak_berat` | tidak laik pakai | keluar dari kit atau aset ditandai; kit dengan komponen kritis K1–K3 berskor 2 berpil "tidak laik gelar" dan dipindah ke `servis` oleh staf |
| 3 | `hilang` | hilang atau afkir | masuk hitungan kehilangan (U8, < 5% per musim); ganti dari stok |

Padanan untuk kelas lain [asumsi-kebijakan, dicek ke pedoman pemilik sebelum buku `final`]: jembatan memakai nilai kondisi pemilik bila ada (skala 0–5 Bina Marga dipetakan 0–1 ke 0, 2 ke 1, 3–4 ke 2, 5 ke 3); sumur yang gagal uji mutu air minum (E. coli > 0 CFU/100 ml menurut Permenkes 2/2023) berskor 2 "tidak laik minum" walau fisiknya baik.

#### 6.10.4 Ambang tindakan dan peringatan

- Kit dengan ≥ 1 komponen kritis (K1–K3) berskor 2, atau dengan butir K1 "terlambat", tampil dengan pil **tidak laik gelar** di layar Kit, Pemicu, dan Pemeliharaan. Bawaan T-P: peringatan, bukan blokir gerak.
- Butir terlambat > 30 hari masuk hitungan U11.
- Sumur berskor 2 karena mutu air tampil dengan pil **tidak laik minum** di layar Air tanah sampai uji ulang lolos.
- Jembatan darurat terpasang tanpa `pemilik_aset` tidak bisa dibuat (NOT NULL); tanpa `rencana_ganti` tampil berpil **tanpa jadwal ganti** (rehab A3, R-RR-04).

#### 6.10.5 Stok suku cadang

Stok dicatat sebagai buku besar tambah-saja per gudang (`sippa_stok_gerak`, saldo = jumlah delta; saldo negatif ditolak trigger). Stok minimum per gudang per musim:

`stok_min(kode) = ceil(laju_pakai(kode) x n_satuan_dilayani x (1 + waktu_tunggu_hari / 180))`, waktu tunggu bawaan 60 hari (e-katalog).

| Suku cadang | Laju pakai bawaan per musim |
| --- | --- |
| gasket kopling Storz | 1 set per 10 kopling |
| elemen filter servis | 2 per pompa |
| oli, filter oli, busi | 2 servis per pompa |
| impeller | 1 per 4 pompa |
| layflat cadangan | 10% panjang per kit (DN100 100 m, DN65 50 m) |
| lance | 1 per 4 lance |
| baterai sensor | 1 set per node |
| respirator P100 | 2 per orang (20 orang per kit) |
| baut dan pelat lantai bailey | menurut daftar komponen panel per bentang terpasang (menunggu data DSP, R-RR-06) |

Laju pakai dikalibrasi dari gerak `pakai` musim 2027. Saldo di bawah stok minimum berpil **di bawah minimum** di layar Pemeliharaan.

#### 6.10.6 Siapa memelihara dan baris anggarannya

| Pelaku | Memelihara | Baris anggaran |
| --- | --- | --- |
| BNPB, Direktorat Pengelolaan Logistik dan Peralatan | pemilik BMN kit (K1–K5); stok suku cadang; kontrak servis tingkat 2; data kondisi | belanja pemeliharaan APBN BNPB (kode akun dicek Biro Keuangan) |
| YonTP (TNI AD) lewat MoU pinjam pakai BMN | gudang, nyala uji bulanan, servis ringan, gulung dan simpan | biaya BBM, oli, dan suku cadang dari BNPB menurut MoU [asumsi-kebijakan] |
| Manggala Agni dan BPBD (operator) | inspeksi pra-gelar dan pasca-gelar lewat `/pipa/lapangan` | dalam biaya operasi gelar |
| BPBD | sumur darurat sampai serah terima; jembatan bailey yang diterima sebagai hibah barang DSP | APBD, BTT |
| Kementerian PU | jembatan nasional (Bina Marga), SPAM (Cipta Karya), air baku (SDA) | APBN K/L |
| Pemda dan PDAM | jalan, jembatan, SPAM daerah; sumur sesudah serah terima | APBD; tarif PDAM |
| Desa | jembatan desa, sumur desa | APBDes; Padat Karya Tunai Desa |
| Badan Geologi | rekomendasi teknis sumur, pemantauan muka air tanah | APBN Kementerian ESDM |

Celah yang dinyatakan buku: hibah RR tidak dapat membiayai biaya operasional dan pemeliharaan (Perban BNPB 4/2024 Pasal 5 huruf b) dan aset rusak milik pemerintah desa (huruf e), sehingga pemeliharaan sesudah RR selalu jatuh ke APBN K/L, APBD, atau APBDes (kunci `rehab.hukum.hibah_rr_larangan_pembiayaan_huruf`; naskah rehab Bab 9 dan 11).

#### 6.10.7 Biaya pemeliharaan per tahun

`B_tahun = Σ_kelas (NG_kelas x r_kelas) + Σ_pompa (jam_pompa x c_jam) + n_inspeksi_lab x c_lab`

NG = nilai ganti dari `harga.csv`; c_jam = biaya servis 50 jam dibagi 50 (dari RFQ); c_lab = biaya satu sampel uji mutu air. Laju r bawaan: K1 8%, K2 6%, K3 5%, K4 8%, K5 10%, K7 3% nilai bangun, K9 2% nilai komponen terpasang; K8 dan K10 bukan beban BNPB (r = 0, hanya dicatat). Rata-rata tertimbang satu kit gambut dengan laju ini sekitar 7% dari CAPEX kit (hitungan dari BOM §6.1, estimasi-model), di dalam rentang "servis 5–8% CAPEX" §11.1; self-check `sippa_keuangan.py` gagal bila rata-rata tertimbang kit keluar dari 5–8%. Hasilnya masuk OPEX tahun kering dan tahun basah Bab 18 dan kunci `sippa.pelihara.biaya_tahun.*`.

#### 6.10.8 Data kondisi di `/pipa`

| Data | Tempat | Siapa mencatat |
| --- | --- | --- |
| kondisi dan waktu cek komponen kit | `sippa_komponen.kondisi`, `dicek` (diisi trigger dari `sippa_inspeksi`) | staf (W) atau operator kit tugasnya (K) |
| riwayat inspeksi semua kelas, termasuk uji mutu air dan uji tekanan | `sippa_inspeksi` (tambah-saja) | staf (W); operator hanya pra-gelar dan pasca-gelar kit tugasnya |
| aset bukan kit (sumur, pompa sumur, pipa sementara, tandon, jembatan) | `sippa_aset` | staf (W) |
| jam operasi pompa | `sippa_log_gelar.jam_pompa` sejak inspeksi `servis` terakhir | otomatis |
| status kit | `sippa_kit.status` (`servis` sudah ada di 0056) | staf lewat `sippa_gerak` |
| stok suku cadang | `sippa_stok_gerak` | staf (W) |

---

## 7. Data

### 7.1 Inventaris dataset

| Dataset | Status | Berkas | Keyakinan | Sumber dan lisensi | Penyegaran |
| --- | --- | --- | --- | --- | --- |
| Kompleks api 2026 dan koefisien operasi | ada | `public/data/operasi.json`, `kendala.json` | terverifikasi (OSM), resmi (BNPB harian) | pipeline repo; OSM ODbL | harian `data.yml` |
| 865 kompleks Kalteng dengan jarak air dan jalan | ada | `kajian/pipa/data/kompleks.csv` | terverifikasi | `pipa_data.py dasar` | saat `kendala.json` berubah |
| Tutupan lahan WorldCover 2021 per kompleks | ada | `pipa/data/worldcover.csv` | terverifikasi | ESA WorldCover v200, CC BY 4.0 | tetap |
| CHIRPS Jul–Okt 2001–2025 per kompleks dan provinsi | ada | `pipa/data/chirps_*.csv` | terverifikasi | CHIRPS v2/v3 UCSB | tahunan |
| Riwayat api MODIS 24 tahun sel 0,1° | ada | `public/data/riwayat_grid.json` | terverifikasi | NASA FIRMS | tahunan |
| VIIRS 2012–2026 titik mentah | ada | `data/raw/firms/viirs*.csv` | terverifikasi | NASA FIRMS | 3 jam (`titik.yml`) |
| Kekerapan sel 2,2 km (14 tahun) | **harus dihitung** | `data/sippa/keluaran/sel22.json` | terverifikasi | turunan VIIRS | tahunan |
| Luas terbakar resmi per provinsi | ada | `public/data/luas_resmi.json` | resmi | SiPongi KLHK | bulanan |
| Konsesi dan status lahan | ada | `kompleks_konsesi.json`, `konsesi2026/` | terverifikasi | pipeline | saat berubah |
| Posko, Daops | ada | `posko.json`, `daops.json` | resmi | Kemenhut, BNPB | |
| Pemicu kemarau | ada | `fwi.json`, `fwi_ansambel.json`, `iklim_outlook.json`, `musim.json` | estimasi-model | Open-Meteo, BMKG | harian |
| Waktu tempuh posko ke kompleks | sebagian (185 nasional, 71 Kalteng) | `akses.json` | estimasi-model | OSRM/OSM | **harus dilengkapi** |
| KHG dan prioritas | ada | `khg_prioritas.json` | resmi | Kemenhut | |
| OSM jalan (kendaraan, utama, setapak) dan air (semua, kecil) per kompleks, titik terdekat | ada (Overpass, 24–25 Okt) | `pipa/data/osm_jarak.csv` | terverifikasi | OSM ODbL; relasi multipolygon danau tidak ikut; batas 16 km | tahunan atau saat AOI baru |
| Matriks zona A–D dua versi | ada | `pipa/data/matriks_jarak.md` | terverifikasi | turunan OSM | mengikuti osm_jarak |
| Elevasi kompleks, titik air, titik jalan, beda | ada | `pipa/data/dem_elevasi.csv` | terverifikasi | Copernicus GLO-30 (DSM, bias kanopi) | tetap |
| Air permukaan di titik air terdekat (permanen/musiman/tidak terdeteksi) | ada | `pipa/data/gsw_air_terdekat.csv` | terverifikasi | JRC GSW v1.4, CC BY 4.0 | tetap |
| Jumlah tahun terbakar 2001–2025 (jendela 2,3 km dan 5 km) | ada | `pipa/data/area_terbakar.csv` | terverifikasi | MODIS MCD64A1 v061 | tahunan |
| GloFAS debit model | **tidak ditarik**: butuh akun CDS dan `CDSAPI_KEY` dari pemilik; resolusi 0,05° hanya untuk sungai besar | README | | Copernicus CEMS | bila pemilik mendaftar |
| Matriks jarak kompleks ke Daops/gudang | **harus dihitung** | `pipa/data/matriks_gudang.csv` | estimasi-model | turunan `daops.json`, `posko.json` | saat gudang berubah |
| DEMNAS 0,27" | **harus diminta/ditarik** | permintaan BIG + ImageServer | resmi | BIG | tetap |
| Debit kemarau sungai/kanal dan izin intake | **harus diminta** | surat BWS Kalimantan II | resmi | BWS | tahunan |
| Ketebalan gambut, TMA | **harus diminta** | walidata KHG, BRGM | resmi | | |
| Log operasi Manggala Agni/BPBD per insiden | **harus diminta**; sebagian ada di `/api/pipa/lapangan` | surat Manggala Agni/BPBD | resmi | | |
| Harga e-katalog dan 3 penawaran | **harus diminta** | LKPP, OEM | resmi | | saat RFQ |
| Harga heli BNPB | **menunggu pemilik** (T-A) | | resmi | BNPB | |
| Kurva Q-H pompa, datasheet layflat | **harus diminta OEM** | | terverifikasi | pabrikan | |
| Pilot Okt 2026 dan banjir 2026 | **dikumpulkan** | D1 `sippa_*` | terverifikasi | lapangan | langsung |

### 7.2 Garis keturunan (lineage)

Semua turunan dihitung oleh skrip Python stdlib (ditambah GDAL hanya di `pipa_data.py` yang dijalankan lokal, bukan di Actions) dengan self-check `__main__`:

```
kendala.json + operasi.json ──pipa_data.py dasar──> kompleks.csv
Overpass OSM ──pipa_data.py osm_tarik, osm──> osm_jarak.csv ──pipa_data.py matriks──> matriks_jarak.md
GLO-30 / GSW / MCD64A1 / CHIRPS / WorldCover ──pipa_data.py dem, gsw, mcd_olah, chirps, wc──> dem_elevasi.csv, gsw_air_terdekat.csv, area_terbakar.csv, chirps_*.csv, worldcover.csv
viirs*.csv ──scripts/data/sippa/sel22.py──> data/sippa/keluaran/sel22.json (kekerapan 2012-2025 per sel 2,2 km)
kompleks.csv + osm_jarak.csv + dem_elevasi.csv + gsw + area_terbakar + sel22.json + khg + konsesi + akses.json ──sippa/zona.py──> data/sippa/keluaran/kelayakan_kompleks.json (dua versi zona, jalan_terverifikasi), zona.json
sel22.json + kanal.json + jalan.geojson + gambut ──sippa/zona.py --sel──> data/sippa/keluaran/kelayakan_sel.json
luas_resmi.json ──sippa/nasional.py──> data/sippa/keluaran/kit_nasional.json
fwi_ansambel.json + iklim_outlook.json + kelayakan_kompleks.json ──sippa/pemicu.py──> data/sippa/keluaran/pemicu.json (harian di data.yml)
semua di atas ──kajian/bangun/sippa_angka.py──> kajian/data/angka.json (kunci pipa.*)
```

Tiap JSON keluaran menulis `dibuat` sebagai kunci pertama (syarat `/api/status`), `per` (tanggal data), `ambang`, dan `catatan` sumber, pola `kendala.json`.

Letak keluaran: `data/sippa/keluaran/*.json` di-commit (garis keturunan buku) lalu diunggah ke R2 `poskokarhutla-foto/sippa/` dengan langkah `wrangler r2 object put` di `data.yml`, pola persis `risiko/` (`src/risiko7.js`). Tidak ada salinan di `public/`, karena seluruh isi `public/` terbit sebagai aset statis yang terbaca tanpa login, sedangkan keputusan 32 membatasi `/pipa` untuk staf BNPB. Worker membaca R2 hanya lewat `GET /api/sippa/data/:nama` yang memeriksa sesi lebih dulu (§9.7).

### 7.3 Jadwal penyegaran

`pemicu.json` harian (dirantai di `data.yml` setelah `fwi.py`); `kelayakan_*` dan `sel22.json` tahunan (Januari) atau manual saat VIIRS tahun penuh masuk; `kit_nasional.json` saat `luas_resmi.json` berubah (bulanan); `zona.json` saat `kendala.json` berubah (harian, murah). Workflow baru tidak dibuat; langkah ditambahkan ke `data.yml` oleh `mekanik-mesin`.

### 7.4 Label keyakinan

Empat label KD/kajian dipakai di JSON (`keyakinan` per medan), di `angka.json`, di layar (pil), dan di buku (pil S15). Slot kosong berlabel `menunggu` (mis. heli) tampil sebagai "–" dengan alasan, tidak pernah angka tebakan.

### 7.5 Daftar surat permintaan data (keputusan 27)

Templat dari paket pemilik (sheet FORM dan Lamp E-2) diadaptasi ke kop BNPB; satu surat per instansi, ID data D01–D36 pemilik dipertahankan untuk kecocokan. Draf di `kajian/pipa/surat/<instansi>.md`, lampiran C buku.

| Instansi | Data (ID pemilik) | Format |
| --- | --- | --- |
| BIG | DEMNAS AOI (D01), RBI jalan/sungai (D02), LiDAR bila ada (D03) | GeoTIFF, GPKG, EPSG 4326 + datum vertikal |
| BWS Kalimantan II | debit kemarau dan penampang (D09), batas izin intake (D10), kualitas air (D11), AWLR Agustus–Oktober 2015/2019/2023/2026 | CSV |
| Walidata KHG / BRGM | KHG (D04), ketebalan gambut (D05), TMA (D06), sekat kanal yang ada (D25) | GPKG, CSV |
| BMKG PTSP | hujan/RH/angin 20 tahun stasiun Kalteng (D14), FWI (D17) | CSV |
| BPBD Kalteng dan kabupaten pilot | kejadian karhutla 2015–2026: titik, waktu, personel, pompa, biaya, luas padam (P06); daftar pompa dan selang yang ada; daftar lokasi banjir 2024–2026 | CSV |
| Manggala Agni / Brigdalkarhutla | log time-motion dan operasi per insiden, SOP, BBM, volume air (P12) | CSV |
| Badan Geologi | CAT/akuifer (D12) hanya untuk zona C pengecualian | peta |
| ATR/BPN, pemda, pemegang izin | batas hak dan izin lintas (D27) | GPKG |
| LKPP / OEM / distributor | e-katalog dan RFQ 3 vendor (D30, D31, D32) | penawaran tertulis |
| BNPB internal | harga heli per jam dan per sorti (T-A), rekap water bombing 2019–2026 | surat internal |

---

## 8. Buku kajian dan deck

### 8.1 Posisi dan pembaca

Judul usulan: **Grand Design Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) Terintegrasi 2026–2030** (T-L; subjudul dan identitas lengkap di KERANGKA-BUKU §1). Buku ini adalah satu dari tiga grand design BNPB (keputusan 55) dan menyerap kajian `rehab` sebagai bahan bukti. Penerbit BNPB saja, pembaca Kepala BNPB, A4 tegak Roboto, logo BNPB, foto Commons beratribusi, tanpa ilustrasi AI (KEPUTUSAN kajian P1, P12). Bentuk buku keputusan: BLUF (L59), pita keputusan KD-1 sampai KD-12 di Pesan Kunci (pita ringkas KD-1, KD-2, KD-3, KD-8), Bab 22, dan deck. Tanpa batas halaman (keputusan 11). Warna zona di buku dan deck biru dan emas dengan huruf A–D dan pola arsiran yang sama dengan web (keputusan 52; DESIGN-SYSTEM §2.1.3). Roboto hanya untuk buku, deck, dan PDF; layar web memakai Inter dan Plus Jakarta Sans (DESIGN-SYSTEM §2.2).

Rincian urutan bab, pertanyaan kunci, angka wajib dan kuncinya, objek bernomor, lampiran, register rekomendasi, deck, dan urutan produksi ada di KERANGKA-BUKU.md; bagian 8.2–8.6 di bawah adalah ringkasan yang isinya sama (22 bab, Lampiran A–S, kode `sippa`; kode `rehab` dan berkas bangunnya tetap ada sebagai sumber saja).

### 8.2 Kerangka bab (ringkasan KERANGKA-BUKU §4 dan §5)

Tanpa bab kritik (keputusan 20): temuan KD §2 dilebur ke "dasar desain" tiap bab. Tiap bab memakai dialek `NASKAH-SPEK.md` dengan front matter `kajian: sippa`, token `{{angka:sippa.*}}`, pustaka APA 7. Berkas bukti `kajian/naskah/sippa/bukti/bab-NN.md` ditulis dulu (L56, L57).

| Bab | Judul | Rincian | Bahan `rehab` yang dipakai ulang |
| --- | --- | --- | --- |
| 1 | Pendahuluan | KERANGKA §4 BAB 1 | Bab 1, 2 |
| 2 | Bara Gambut dan Cara Memadamkannya | BAB 2 | |
| 3 | Pola Api: Kapan dan Di Mana | BAB 3 | |
| 4 | Beban Pascabencana: Jembatan, Air, dan Rumah 2015–2025 (baru) | BAB 4 | Bab 3, 4, 8 |
| 5 | Kelayakan Kit di Kalimantan Tengah (tiga versi zona, §5.1) | BAB 5 | |
| 6 | Kebutuhan Kit 18 Provinsi (81 kit "rencana bersyarat, bukan pengadaan") | BAB 6 | |
| 7 | Desain SIPPA Terintegrasi | BAB 7 | Bab 2.1, 10.1–10.4 |
| 8 | Hidraulika dan Titik Kerja (debit bawaan 300 L/min, kasus ajar 600 L/min NO-GO) | BAB 8 | |
| 9 | Spesifikasi Komponen dan Gambar Teknik | BAB 9 | |
| 10 | Operasi: Pemicu, Respons, SOP, K3, Logistik, dan Pelatihan | BAB 10 | |
| 11 | Pemakaian Ganda: Banjir dan Irigasi | BAB 11 | |
| 12 | Air Pascabencana: Perpipaan dari Darurat ke Permanen (baru) | BAB 12 | Bab 6, 10.6, 10.8 |
| 13 | Air Tanah Pascabencana dalam Batas Badan Geologi (baru) | BAB 13 | Bab 7, 9.5, 10.7 |
| 14 | Akses Pascabencana: Jembatan menurut Pemilik Program (baru) | BAB 14 | Bab 5, 9.1, 9.2, 10.5 |
| 15 | Model Pemeliharaan Aset Terpadu (baru, §6.10) | BAB 15 | Bab 9.4, 11.5 |
| 16 | Pilot 2026 dan Program Uji 2027–2028 (vonis keputusan 53; agenda bukti air dan akses) | BAB 16 | Bab 10.10 |
| 17 | Kelembagaan dan Tata Kelola Aset (RACI §3.3, opsi konsesi §3.4, mandat air dan akses) | BAB 17 | Bab 9.2, 9.7, 11.1–11.4, 11.6 |
| 18 | Anggaran, Pembiayaan, NPV, BCR, dan Monte Carlo | BAB 18 | Bab 3.5, 11.5 |
| 19 | Risiko dan Mitigasi | BAB 19 | Bab 9 |
| 20 | Sistem Data dan Pemantauan (web `/pipa`, telemetri, data kondisi) | BAB 20 | Bab 9.3 |
| 21 | Peta Jalan 2026–2030 | BAB 21 | Bab 10.9, 11.7–11.9 |
| 22 | Kesimpulan dan Keputusan yang Diminta | BAB 22 | Bab 12 |

Lampiran A–S (KERANGKA §5): A Metode, Data, dan Rekonsiliasi; B Kelayakan per Kompleks Kalteng; C Dasbor 18 Provinsi; D Daftar Bahan sampai Baut dan Kriteria Terima; E RAB Rinci; F Gambar Teknik SIPPA-G-01 sampai G-12; G SOP dan Formulir; H Protokol Pilot dan Uji A/B; I Draf Surat Permintaan Data; J Rumus dan Uji Invarian Hidraulika; K Rujukan Praktik dan Katalog Program menurut Posisi Bukti; L Batas Pemakaian Alat `/pipa`; M Beban Pascabencana per Provinsi dan Kab/Kota, Kartu Skenario, dan Daftar Perhatian; N Program Jembatan per Pemilik dan Sumur Bor per Kejadian; O Biaya Satuan Berlabel Air, Air Tanah, dan Jembatan; P Kronologi Regulasi RR, Penyelarasan Dokumen BNPB, dan Irisan Register; Q Jadwal Pemeliharaan Rinci dan Kartu Inspeksi; R Glosarium; S Atribusi Foto.

### 8.3 Aturan angka dan sumber di buku

- Semua angka lewat `{{angka:sippa.*}}` dari `kajian/data/angka.json` yang dibangun `kajian/bangun/sippa_angka.py` dari paket `kajian/data/sippa/` (salinan beku keluaran §7.2) dan ekspor D1 pilot. Tidak ada angka ketikan (D-22).
- Pustaka (`kajian/pustaka.json`) minimal 50 sumber, separuh resmi atau primer, 8 per bab (L65), `tema.json` `qa.pustaka.kajian_min.sippa = 50`; daftar sumber wajib di KERANGKA §8.1 M8. Sumber berita hanya di naskah `draf`; naskah `final` menolak sekunder.
- Tanpa kata "terbukti" untuk SIPPA; tanpa bab kritik; alasan desain ditulis positif.

### 8.4 Pipeline bangun buku

Urutan produksi S1–S14, perubahan mesin M1–M19, dan QA lima lapis ada di KERANGKA §8 dan §9. Perintah inti (dari `data/kajian-bnpb/`): `.venv/bin/python bangun/docx/bangun.py sippa` (keluaran `keluaran/sippa.docx`, `sippa.pdf`, `sippa.manifest.json`); `.venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf`; `python3 qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf --pptx keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --visual bangun/visual/keluaran --kajian sippa --ketat`; `python3 qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md naskah/sippa/*.md`. Naskah ditulis agent `penulis-kajian` (TIKET SP-085) lewat workflow `naskah-kajian.js` dan `rakit-kajian.js` cabang `sippa` (TIKET SP-005).

### 8.5 Deck 18 slide isi (keputusan 19, T-M)

Spek `kajian/naskah/sippa/deck.json`, 18 slide isi (T-M) ditambah sampul, penutup, dan lampiran L1–L7 (KERANGKA §11). Semua judul slide isi berbentuk temuan berangka kecuali slide 1 Pesan Kunci (navigasi); bagian A Pola api dan beban, B Kelayakan dan desain kit, C Air dan akses pascabencana, D Pemeliharaan dan lembaga, E Biaya dan jalan; pil CUT OFF `23 Okt 2026, 23.59 WIB`; angka deck = angka DOCX lewat token yang sama.

### 8.6 Nama berkas dan lokasi

Berkas `kajian/naskah/rehab/**`, `kajian/rehab/**`, `kajian/keluaran/rehab*`, `bangun/rehab_angka.py`, `bangun/visual/spek-rehab/**`, dan kunci `rehab.*` di `angka.json` tetap di tempatnya sebagai **sumber**: naskah `sippa` memakai token `{{angka:rehab.*}}` dan kunci pustaka rehab apa adanya (tidak disalin ke `sippa.*`), dan berkas bukti `naskah/sippa/bukti/bab-NN.md` untuk bab yang memakai ulang bahan rehab memuat rujukan baris ke `naskah/rehab/bukti/bab-NN.md` ditambah delta, bukan salinan.

| Berkas | Isi |
| --- | --- |
| `kajian/naskah/sippa/bukti/bab-NN.md` (+ `.angka.json`, `.pustaka.json`) | berkas bukti |
| `kajian/naskah/sippa/00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `bab-01.md` s.d. `bab-22.md`, `90-lampiran-a.md` s.d. `90-lampiran-q.md`, `deck.json` | naskah (satu front matter per berkas; `bangun/docx/bangun.py:430` mengurutkan dari front matter; Lampiran R dan S dibangkitkan pembangun) |
| `kajian/data/sippa/` | paket data buku (KERANGKA §8.2 M10) |
| `kajian/bangun/sippa_angka.py`, `sippa_keuangan.py`, `sippa_pilot.py`, `sippa_formulir.py` | registri angka `sippa.*`, RAB dan NPV, impor ekspor D1 pilot, pembangkit formulir kertas |
| `kajian/bangun/visual/spek-sippa/*.json`, `kajian/bangun/visual/teknik/*.mjs` | spek peta dan grafik, gambar teknik |
| `kajian/gambar/sippa/*.png`, `kajian/gambar/sippa/teknik/*.pdf` | render |
| `kajian/keluaran/sippa.docx`, `sippa.pdf`, `sippa.manifest.json`, `sippa-deck.pptx`, `sippa-deck.pdf`, `sippa-deck.manifest.json` | keluaran |
| `kajian/keluaran/qa/slop-sippa.md`, `sippa.md`, `sippa-deck.md` | QA |
| `kajian/pipa/surat/*.md`, `kajian/pipa/protokol-ab.md`, `kajian/pipa/formulir/*.pdf`, `kajian/pipa/rekap-2026.md` | dokumen program |

---

## 9. Aplikasi web `/pipa`

Satu aplikasi staf, vanilla JS tanpa build step (pola repo), dengan cangkang HTML yang dilayani worker setelah sesi diperiksa, skrip dan gaya di `public/pipa/`, data dari rute berlogin `/api/sippa/*` dan R2 `sippa/`. Tidak ada data di dalam berkas `public/pipa/**`: berkas itu terbit sebagai aset statis yang terbaca siapa pun, jadi isinya hanya kode dan teks antarmuka.

Penamaan: rute halaman memakai `/pipa` (keputusan 31), rute API memakai `/api/sippa/*`. Awalan `/api/pipa/*` sudah dipakai `src/pipa.js` untuk rute pipeline Python bertoken `PIPA_TOKEN` (`/api/pipa/lapangan`, `/api/pipa/jejak`) dan tidak boleh disentuh atau dicampur.

### 9.1 Arsitektur informasi, akses, dan navigasi

#### 9.1.1 Peta layar

| Rute | Layar | Pertanyaan yang dijawab | Peran yang membuka | Perangkat utama | Fitur keputusan 33 |
| --- | --- | --- | --- | --- | --- |
| `/pipa` | Ringkas | Apa status kit, pemicu, pilot, dan data hari ini? | semua peran SIPPA | desktop dan ponsel | ringkasan semua fitur |
| `/pipa/peta` | Peta kelayakan dan saran sarana | Di kompleks atau sel mana kit layak, dan sarana apa yang disarankan? | perencana, pemantau (baca) | desktop | peta kelayakan kit, saran sarana |
| `/pipa/hitung` | Kalkulator hidraulika | Pompa, selang, dan BBM apa yang cukup untuk satu trase? | perencana, pemantau (baca) | desktop, ponsel cukup | kalkulator hidraulika |
| `/pipa/pemicu` | Pemicu pra-posisi | Depot dan kabupaten mana yang harus diisi kit minggu ini? | perencana, pemantau | desktop | pemicu pra-posisi |
| `/pipa/kit`, `/pipa/kit/:id` | Inventaris dan lacak kit | Di mana tiap kit, apa isinya, dan ke mana ia bergerak antara karhutla dan banjir? | perencana (tulis), pemantau (baca), Admin (buat kit) | desktop dan ponsel | inventaris dan lacak kit |
| `/pipa/log` | Rekap time-motion | Berapa p50/p90 tiba-sampai-air-mengalir per kelas medan? | perencana, pemantau | desktop | log time-motion |
| `/pipa/lapangan` | Form lapangan luring | Mencatat gelar, probe, BBM, dan pindah kit tanpa sinyal | operator (kode penugasan) | ponsel | log time-motion, lacak kit |
| `/pipa/ab` | Dashboard A/B | Apakah lengan kit lebih baik dari konvensional, dengan 95% CI dan biaya per ha? | perencana (unggah), pemantau | desktop | dashboard A/B |
| `/pipa/studio` | Simulator keputusan | Bagaimana semua skenario dibandingkan, gerbang mana yang gagal, berapa NPV/BCR? | perencana, pemantau | desktop | simulator keputusan |
| `/pipa/3d` | Simulasi 3D | Seperti apa susunan kit, jalur air, dan injeksi? | semua peran staf | desktop | simulasi Three.js |
| `/pipa/telemetri` | Telemetri | Perangkat mana yang hidup dan alarm apa yang menyala? | perencana, Admin (daftar perangkat) | desktop | telemetri (keputusan 38) |
| `/pipa/laporan` | Laporan PDF | Laporan pilot, kejadian, mingguan, musim, skenario | perencana (buat), pemantau (unduh) | desktop | laporan PDF (keputusan 39) |
| `/pipa/data` | Data dan metode | Dari mana angka berasal, kapan ditarik, keyakinannya, dan batas alat | semua peran staf | desktop dan ponsel | Lampiran L buku |
| `/pipa/pelihara` | Pemeliharaan (keputusan 56) | Butir mana jatuh tempo atau terlambat, kit mana tidak laik gelar, stok mana di bawah minimum, berapa biaya pemeliharaan per tahun? | perencana (tulis inspeksi, stok), pemantau (baca) | desktop dan ponsel | model pemeliharaan §6.10 |
| `/pipa/air` | Air tanah pascabencana (keputusan 56) | Di CAT dan zona mana sumur aman dibangun, sumur mana belum diuji mutu atau belum diserahkan? | perencana (tulis aset), pemantau | desktop | Bab 12–13 buku |
| `/pipa/akses` | Akses pascabencana (keputusan 56) | Berapa jembatan rusak per provinsi, program jembatan mana milik siapa, jembatan darurat mana tanpa pemilik aset atau jadwal ganti? | perencana (tulis aset), pemantau | desktop | Bab 4, 14 buku |
| `/pipa/aset/:id` | Rincian aset | Riwayat inspeksi, kondisi, mutu air, dan serah terima satu sumur, pipa, atau jembatan | perencana, pemantau | desktop dan ponsel | model pemeliharaan §6.10 |

#### 9.1.2 Cara halaman dilayani

- Worker melayani satu cangkang `halamanSippa(ctx)` (fungsi baru di `src/admin_halaman.js`, pola `halaman()` yang ada) untuk `GET /pipa` dan `GET /pipa/:layar`, dengan `:layar` dari daftar tetap `LAYAR_SIPPA = ["peta","hitung","pemicu","kit","log","ab","studio","3d","telemetri","laporan","data","pelihara","air","akses"]` (tiga terakhir dari keputusan 56), `GET /pipa/kit/:id`, dan `GET /pipa/aset/:id` (`:id` 16 heks). Jalur lain di bawah `/pipa/` dijawab 404.
- Router klien `public/pipa/app.js` memakai History API; tiap layar adalah modul `public/pipa/layar_<nama>.js` yang dimuat malas (dynamic `import()`), jadi membuka Ringkas tidak memuat MapLibre atau Three.js.
- Gerbang host terkunci di `src/worker.js` (`halamanTerkunci`) hanya mengenal `adminOK`, sehingga staf bersesi `sesi_staf` akan dipantulkan ke halaman masuk. Karena itu regex pengecualian diperluas dari `^/(api|admin|ews|ubin)(\/|$)` menjadi `^/(api|admin|ews|ubin|pipa)(\/|$)`, dan rute `/pipa*` memeriksa sesinya sendiri: tamu 303 ke `/admin/pantau?ke=<jalur>` (layar masuk staf di Meja Pantau; `/admin/masuk` hanya menerima akun admin; `public/admin/pantau.js` meneruskan `ke` yang cocok `^/pipa(/|$)` sesudah masuk, DESAIN-TEKNIS §1.4 dan ADR-05); sesi sah tanpa peran SIPPA dijawab 403 halaman polos "Akunmu tidak punya akses SIPPA" tanpa pengalihan (mencegah pantulan tanpa akhir seperti yang diperbaiki commit `c24a3c2a`).
- `/pipa/lapangan` adalah satu-satunya halaman tanpa sesi. `PUBLIK_TANPA_SESI` tidak diubah, karena seluruh `/pipa*` sudah dikecualikan dari gerbang host dan tiap rute `/pipa*` menjaga dirinya sendiri; kode penugasan dicek di tiap panggilan API (keputusan pemilik 24 Okt 2026, T-H). Cangkangnya tidak memuat data apa pun.
- `GET /admin/pipa` menjawab 303 ke `/pipa`, supaya entri `HAL.pipa = ["💧", "SIPPA"]` dan `HALAMAN_STAF.pipa` di nav staf bekerja seperti halaman staf lain.

#### 9.1.3 Navigasi

| Lebar | Bentuk | Isi |
| --- | --- | --- |
| ≥ 1280 px | header `ad-top` (pola admin) + rel kiri 232 px berlabel | empat kelompok: **Rencana** (Peta, Hitung, Pemicu, Studio, 3D), **Operasi** (Kit, Pemeliharaan, Log, A/B, Telemetri), **Pascabencana** (Air tanah, Akses), **Keluaran** (Laporan, Data); Ringkas di atas rel |
| 768–1279 px | rel kiri menyusut ke ikon 64 px, label di tooltip `rapikanTip` | sama |
| < 768 px | bilah bawah lima tombol 56 px: Ringkas, Peta, Kit, Log, Lainnya; "Lainnya" membuka lembar bawah berisi sisanya, termasuk Pemeliharaan, Air tanah, Akses | form lapangan tidak memakai bilah ini (layar penuh) |

Bilah konteks di bawah header memuat dua kontrol yang berlaku di semua layar: **Provinsi** (`PilihCantik`, bawaan 62 Kalteng; staf berwilayah hanya melihat provinsinya) dan **Versi zona** (segmen tiga pilihan: Konservatif = versi `kendala.json`, Optimistis = semua jalan OSM, Terverifikasi; versi jalan utama OSM tampil sebagai kolom pembanding di ringkasan zona; §5.1, §9.4.2). Keduanya ditulis ke query (`?prov=62&zona=k`) supaya tautan bisa dibagikan, dan diingat di `localStorage` dalam `try/catch` (halaman tetap benar bila penyimpanan kosong). Bilah konteks menampilkan pil batas data "Data per 23 Okt 2026, 23.59 WIB" untuk data buku, dan "per <waktu>" untuk data harian.

### 9.2 Gaya, bahasa, tema, perangkat

- **Gaya Pantau Bencana (keputusan 41).** Token warna dan huruf dari `public/inti/tema.css` dan `public/admin/admin.css`; kartu bergaya Insight (pil kategori, judul satu kalimat temuan dengan angka di depan, kaki `Sumber: …` miring, tanpa subjudul dan tanpa kotak KPI berkepala navy); tabel kepala gelap, bisa diurutkan, dipaginasi `paginasi()`; `<select>` diganti `PilihCantik`; tooltip `rapikanTip`; ikon SVG garis (`public/pipa/ikon.js`, satu berkas sprite). Komponen bersama dipakai dari `public/inti/` (`format.js`, `tabel.js`, `pilih.js`, `tip.js`, `nanti.js`, `kartu.js`), tidak disalin.
- **Bahasa Indonesia saja (keputusan 40).** Teks antarmuka berupa konstanta di modul layar, tanpa kunci i18n. Sapaan "kamu". Tanpa em dash, tanpa titik tengah (U+00B7), en dash hanya untuk rentang. Label = kata benda polos; judul kartu = fakta + angka + sumber. "Titik panas" untuk data satelit.
- **Angka.** `fmt` id-ID dari `public/inti/format.js`: titik ribuan, koma desimal, paling banyak 1 desimal, "–" bila kosong; `toFixed` mentah dilarang di teks tampil. Satuan selalu tertulis; rupiah besar dalam miliar ("Rp5,2 miliar"); "rb/jt" hanya di label sempit. Tiap angka membawa sumber dan waktu. Pil keyakinan: **resmi**, **terverifikasi**, **estimasi-model**, **asumsi-kebijakan**, **menunggu** (slot kosong, tampil "–" dengan alasan), dan **hipotesis** untuk semua angka efikasi yang belum lulus G4. Probabilitas tampil sebagai kelas kasar (rendah/sedang/tinggi) atau dibulatkan kasar; tidak pernah "100%".
- **Mode gelap (keputusan 45).** Token gelap `tema.css`/`admin.css` (`prefers-color-scheme` dan `data-theme`); tombol tema di header menulis `data-theme` ke `<html>` dan `localStorage`. Peta memakai gaya basemap gelap saat tema gelap (ganti gaya dengan `setStyle(..., {diff:false})` lalu pasang ulang lapisan sesudah `style.load`, aturan buku pegangan). Grafik SVG memakai `currentColor` dan variabel CSS, bukan warna tertanam. Adegan 3D membaca `--paper` dan `--ink` untuk latar dan label.
- **Desktop untuk perencanaan, ponsel untuk lapangan (keputusan 42).** Desktop: rel + konten dua kolom (peta/visual 60%, panel 40%). Ponsel: satu kolom, panel jadi lembar bawah yang bisa ditarik, tabel jadi daftar kartu, target sentuh ≥ 44 px (form lapangan ≥ 56 px). Layar perencanaan (Studio, 3D, Peta) tetap bisa dibuka di ponsel dengan pita "Layar ini dirancang untuk laptop".

#### 9.2.1 Keadaan standar tiap layar

Satu modul `public/pipa/keadaan.js` (fungsi murni yang mengembalikan elemen) dipakai semua layar supaya kalimatnya seragam:

| Keadaan | Kapan | Tampilan |
| --- | --- | --- |
| Memuat | permintaan berjalan | kerangka abu (skeleton) seukuran kartu; tanpa spinner bila < 300 ms |
| Kosong | 0 baris | kalimat apa yang kosong dan cara mengisinya ("Belum ada log gelar. Log masuk dari form lapangan `/pipa/lapangan`."); Super Admin melihat tombol 🧪 (§9.14) |
| Galat | HTTP ≥ 400 atau jaringan | pesan dari server, kode HTTP, tombol "Coba lagi"; 403 = "Akunmu tidak punya akses ke data ini"; 503 tabel belum ada = "Migrasi SIPPA belum diterapkan di basis data" |
| Luring | `navigator.onLine === false` atau fetch gagal jaringan | pita kuning "Luring. Menampilkan data terakhir per <waktu>." dari simpanan; tombol tulis dinonaktifkan kecuali di form lapangan |
| Basi | data JSON `per` lebih tua dari 48 jam (harian) atau dari jadwal penyegarannya | kartu diredupkan + pil "basi, per <tanggal>" |
| Menunggu | slot angka belum ada (mis. harga heli) | "–" + pil "menunggu" + alasan satu baris |

### 9.3 Fungsi hitung bersama

Semua rumus tinggal di fungsi murni, satu sumber untuk kalkulator, peta, simulator, 3D, laporan, dan buku. Berkas `public/pipa/hitung.js` ditulis sebagai ES module tanpa DOM yang juga mengisi `globalThis.SippaHitung` di baris akhir (diimpor layar, Web Worker, worker, dan uji Node; DESAIN-TEKNIS §5.1), dengan kembar Python di `scripts/data/sippa/` (pemilik `pipa-data`) yang dipakai pipeline dan `kajian/bangun/sippa_angka.py`. Kesamaan keduanya dijaga uji `tests/sippa/kembar.test.mjs` terhadap berkas acuan `tests/sippa/fixtures/acuan.json`.

| Fungsi | Masukan | Keluaran | Rumus dan aturan |
| --- | --- | --- | --- |
| `idHdpe(od, sdr)` | OD mm, SDR 11/17 | ID mm | ID = OD x (1 - 2/SDR) |
| `idLayflat(dn, idDatasheet)` | DN mm, ID datasheet atau null | `{id, asumsi}` | ID datasheet bila ada; bila null 0,96 x DN dengan `asumsi: true` (pil asumsi di layar) |
| `hfHW(L, Q, C, D)` | m, m3/s, -, m | m | h_f = 10,67 L Q^1,852 / (C^1,852 D^4,871) |
| `hidraulika(p)` | lihat §9.4.3 | `{id_mm, v, hf, hm, tdh, p_pompa_bar, p_ujung_bar, kw, hp, bbm_l_jam, v_isi_m3, t_tiba_menit, serap_lance_lpm, co2_kg_jam, gerbang[], vonis}` | §6.4; TDH = Δz + h_f + K v^2/2g + sisa x 10,197 + (3,5 bila `hisap: true`); P = ρ g Q TDH/η; tekanan pompa = TDH/10,197; bila pompa dipilih, tekanan ujung = sisa + tekanan tersedia dari rating − tekanan perlu (DESAIN-TEKNIS §5.3.1, ADR-10) |
| `gerbangHidraulika(p, h)` | masukan dan hasil | larik `{kode, tingkat, pesan}`; `tingkat` ∈ keras/syarat/catatan | lihat tabel gerbang di bawah |
| `vonis(gerbang)` | larik | NO-GO / HOLD / KONDISIONAL | ada keras = NO-GO; ada syarat = HOLD; selain itu KONDISIONAL. Tidak ada status "GO" (pola Studio, baca-C C1.3) |
| `bbm(kw, jenis, jam, nPompa)` | | liter | bensin kelas 1.500 L/min: 22 L/jam per pompa pada rating [terverifikasi, datasheet]; solar: kW x BSFC / 0,84, BSFC bawaan 0,25 kg/kWh (dapat diubah 0,22–0,30) |
| `co2(liter, jenis)` | | kg | bensin 2,31 kg/L, solar 2,68 kg/L; hanya BBM (G25) |
| `neracaAir(p)` | stok awal m3, Q95 L/s, Q ekologi L/s, Q api L/s, evaporasi m3/hari, hari | seri harian + NO-GO bila stok < 0 | stok(t+1) = stok(t) + max(0, Q95 - Q_eko) x 86,4 - Q_api x 86,4 - evap; syarat G1: Q95 ≥ 1,5 x Q_api |
| `joukowsky(dv, a)` | m/s, m/s | bar | ΔP = ρ a Δv / 1e5; a bawaan 300 m/s HDPE, 150 m/s layflat [asumsi] |
| `zona(airKm, jalanKm, ambang)` | km, km atau null | A/B/C/D | §5.1; pembanding ketat `<` (keputusan 51); ambang bawaan `{air: 2.5, jalan: 5}`; null = jauh |
| `zonaTerverifikasi(k, cek)` | kompleks, hasil cek jalan | A/B/C/D | `zona_o` (semua jalan OSM) hanya bila cek jalan terbaru musim hujan berstatus `lolos`; selain itu `zona_k` (versi `kendala.json`) |
| `saranSarana(k, versi, apiAktif)` | kompleks, versi zona `k`/`u`/`o`/`v`, ada titik panas 24 jam | `{aturan, kit, heli, sarana, alasan[], tautan_hitung}` | tabel aturan §9.4.2 |
| `matriksRespons(frp, luasHa, zona, koef, jamTiba)` | MW, ha, zona, koef `operasi.json`, jam | `{tingkat, regu, hari, sarana, heli}` | §5.4; `bara_regu` tengah dibaca dari `operasi.json` (saat ini 1,0), tidak tertanam |
| `kuantil(xs, p)` | angka, 0–1 | angka | interpolasi linear tipe 7 (sama dengan `numpy.percentile` bawaan); n < 5 = hasil berlabel "n kecil" |
| `bandingRerata(a, b)` | dua larik | `{selisih, ci95:[lo,hi], df, n_a, n_b}` | Welch: se = sqrt(s_a²/n_a + s_b²/n_b); df Welch-Satterthwaite; t kritis dari tabel df 1–30 lalu 1,96; n < 8 per lengan = "belum bisa diputus" |
| `bandingProporsi(xa, na, xb, nb)` | | `{selisih, ci95}` | Agresti-Caffo (tambah 1 sukses dan 1 gagal per lengan), untuk nyala ulang 7/30/90 hari |
| `crf(r, n)` | | | r / (1 - (1+r)^-n) |
| `biayaPerHa(p)` | CAPEX, umur, r, OPEX musim, biaya regu, ha terverifikasi | Rp/ha | (CAPEX x crf + OPEX + regu) / ha dingin terverifikasi 30 hari (definisi KD §4.4, CAPEX masuk) |
| `npv(p)`, `bcr(p)`, `impas(p)` | CAPEX, OPEX/th, manfaat/th, r, H | | NPV = Σ_{t=1..H} (B_t - O_t)/(1+r)^t - CAPEX; BCR = PV(B) / (CAPEX + PV(O)); impas B* = O + CAPEX / AF, AF = (1 - (1+r)^-H)/r; r bawaan 8%, H bawaan 5 tahun (dapat diubah 1–15) |

Fungsi pemeliharaan dan aset (keputusan 56) tinggal di modul murni kedua `public/pipa/pelihara.js` (ES module tanpa DOM, juga mengisi `globalThis.SippaPelihara`, diimpor worker untuk validasi seperti `formulir.js`; DESAIN-TEKNIS §5.10): `kelasDari(kodeBom)`, `skorKeKondisi(skor)`, `jadwal(butir, inspeksiTerakhir, jamSejakServis, kini)` → `{jatuh_tempo, status, alasan}`, `laikGelar(komponen[])`, `stokMin(kode, nSatuan, waktuTungguHari)`, `biayaTahun(aset[], harga, param)`, `cekAset(kelas, atribut)` → larik galat (sumur di zona `kritis` atau `rusak` tanpa `rekomendasi_bg` = galat, rehab Q10). Konstanta interval, laju, dan stok §6.10 hanya di modul ini.

Gerbang kalkulator (G04, G05, G22), semuanya juga dijalankan Studio sebagai lapisan tambahan (§9.5):

| Kode | Syarat | Tingkat | Pesan layar |
| --- | --- | --- | --- |
| H-TEKANAN | tekanan pompa > 0,88 x PN x f_suhu (HDPE: PN16 untuk SDR11, PN10 untuk SDR17; f_suhu = 1 - 0,014 (T - 20), dibatasi 0,58–1); layflat: > 0,88 x tekanan kerja datasheet | keras | "Tekanan 12,5 bar melewati batas kerja 11,1 bar (88% x PN16 x 0,79 pada 35 °C)" |
| H-SISA | tekanan ujung < 1 bar | keras | "Tekanan di manifold kurang dari 1 bar; lance tidak bekerja" |
| H-SISA2 | 1 ≤ tekanan ujung < 2 bar | syarat | "Tekanan ujung di bawah 2 bar; lance 15–40 L/min butuh 2–4 bar" |
| H-SERAP | debit pompa > n_lance x 40 L/min + debit pemakai lain | keras | "Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)" |
| H-RATING | pompa dipilih dan debit di luar titik rating datasheet | keras | "Debit 2.400 L/min di luar rating pompa terpilih (paling banyak 2.050 L/min)" |
| H-DAYA | daya poros > rating pompa terpilih x 0,85 | keras | "Daya poros melewati kemampuan pompa terpilih" |
| H-KECEPATAN | v > 3 m/s | syarat | "Kecepatan 3,4 m/s; risiko lonjakan saat katup ditutup" |
| H-PANAS | bahan HDPE dan "ujung di perimeter aktif" dicentang | keras | "HDPE tidak boleh berada di perimeter api aktif (K-16)" |
| H-DALAM | kedalaman lance > 5 m | ditolak di masukan | "Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)" |
| H-AIR | neraca air negatif atau Q95 < 1,5 x Q_api | keras (negatif) / syarat (< 1,5 x) | "Sumber habis pada hari ke-2" |
| H-DSM | Δz diambil dari `dem_elevasi.csv` | catatan | "Beda elevasi dari DSM berkanopi (Copernicus GLO-30); ukur ulang dengan DEMNAS atau GNSS" |

Nilai acuan wajib di `acuan.json` (dicocokkan JS dan Python, toleransi 1%; daftar lengkap H1–H8, Z1–Z5, V1–V3 dan lainnya di DESAIN-TEKNIS §5.8), tanda `hisap` selalu ditulis eksplisit: (1) HDPE OD160 SDR11, 2.000 L/min, 2 km, +10 m, sisa 2 bar, K = 5, C = 130, `hisap: false`: ID 130,9 mm, h_f 95,45 m, TDH 127,41 m, tekanan 12,49 bar (12,84 bar bila `hisap: true`), vonis NO-GO (H-TEKANAN pada 35 °C, batas 11,12 bar); (2) OD200 kondisi sama: ID 163,6 mm, 6,20 bar tanpa hisap (6,54 bar dengan hisap), tanpa gerbang keras tekanan; (3) contoh G-2 paket pemilik: D 0,16 m, C = 130, 2.000 L/min, 2 km, +10 m, K = 5, sisa 2 bar, η 0,65, `hisap: false`: h_f 35,91 m, TDH 67,01 m, 6,57 bar, 45,2 HP, solar 10,03 L/jam; (4) relay DN100 ID 100 mm, 10 L/s, 1 km, C = 130: h_f 19,06 m; (5) volume isi DN100 1 km 7,85 m3, 13,09 menit pada 10 L/s; (6) bawaan kalkulator 300 L/min dengan 8 lance: KONDISIONAL; (7) kasus ajar 600 L/min dengan 8 lance: NO-GO H-SERAP.

### 9.4 Layar demi layar

#### 9.4.1 Ringkas (`/pipa`)

- **Tujuan:** satu layar status untuk pimpinan dan perencana.
- **Tata letak desktop:** baris kartu Insight 4 kolom: (1) "Kit: 3 siap di gudang, 1 di lapangan, 0 hilang" dari `GET /api/sippa/kit`; (2) "Pemicu: 2 kabupaten di level PRA-POSISI" dari `pemicu.json`; (3) "Pilot Okt 2026: 3 sesi gelar, p50 tiba-sampai-air-mengalir 3,4 jam (n kecil)" dari `GET /api/sippa/log`; (4) "Zona A Kalteng: 188 kompleks (versi `kendala.json`), 469 (semua jalan OSM)" dari `zona.json`. Di bawahnya: daftar 10 gerak kit terakhir (tabel), alarm telemetri aktif, dan pita "Data per …". Ponsel: kartu satu kolom, urutan Kit, Pemicu, Pilot, Zona.
- **Interaksi:** kartu = tautan ke layarnya. Tidak ada kontrol berat.
- **Keadaan:** tiap kartu memuat sendiri; satu kartu galat tidak menghentikan kartu lain.

#### 9.4.2 Peta kelayakan dan saran sarana (`/pipa/peta`)

- **Tujuan:** keputusan 44 (per kompleks dan per sel 2,2 km dengan sakelar), keputusan 30 dan 51 (ambang 2,5/5 km, pembanding `<`), tiga versi zona (§5.1) ditambah versi Terverifikasi, saran sarana per kompleks.
- **Data:** `kelayakan_kompleks.json`, `kelayakan_sel.json`, `zona.json` (R2 lewat `/api/sippa/data/:nama`); cek jalan dari `GET /api/sippa/jalan-cek`; koefisien dari `public/data/operasi.json` (publik, sudah ada).
- **Tata letak desktop:** peta MapLibre (berkas lokal `public/vendor/maplibre/`, basemap `tiles.openfreemap.org` seperti peta publik) 60% kiri; panel kanan 40% berisi kartu judul, ringkasan zona, filter, dan rincian kompleks terpilih. Ponsel: peta penuh, panel jadi lembar bawah tiga tinggi (intip, setengah, penuh).
- **Kontrol (semua di bilah atas peta):**
  - Segmen **Satuan**: Per kompleks | Per sel 2,2 km (keputusan 44).
  - Segmen **Versi zona** (dari bilah konteks): Konservatif (versi `kendala.json`: air dan jalan `kendala.json`), Optimistis (semua jalan kendaraan OSM termasuk `track` x semua air OSM), Terverifikasi (optimistis hanya untuk kompleks yang jalannya sudah dicek lolos musim hujan, sisanya konservatif). Versi jalan utama OSM (tersier ke atas x semua air) tidak menjadi pilihan peta, tetapi tampil sebagai kolom di ringkasan zona.
  - Pil zona A, B, C, D (toggle tampil), pil "terbakar ≥ 3 tahun (MCD64A1)", pil GSW (permanen, musiman, tidak terdeteksi), `PilihCantik` kabupaten, kotak cari kompleks (id atau nama kab).
- **Kartu judul (contoh bentuk):** "188 dari 865 kompleks Kalteng di zona A (versi `kendala.json`); 469 bila semua jalan OSM termasuk `track` dihitung" + kaki "Sumber: OSM (ODbL) via Overpass 24–25 Okt 2026, jarak garis lurus; kompleks api `kendala.json`". Angka diambil dari `zona.json`, tidak dihitung ulang di klien.
- **Ringkasan zona:** tabel empat baris A–D x empat kolom (versi `kendala.json`, jalan utama OSM, semua jalan OSM, Terverifikasi), dengan pil persen; baris "Tanpa jalan kendaraan dalam 16 km: 44"; baris median jarak air 1,02 km dan jalan 2,27 km.
- **Lapisan:** kompleks sebagai lingkaran berwarna zona (A hijau `--ok`, B biru `--info`, C kuning `--warn`, D merah `--bad`), dan karena uji buta warna (keputusan 52) tiap simbol WAJIB juga memuat huruf A–D dan pola isi (A penuh, B cincin, C setengah, D silang); buku dan deck memakai biru dan emas dengan huruf dan pola yang sama dengan ukuran menurut jumlah tahun terbakar; sel 2,2 km sebagai poligon kisi berwarna kekerapan 0–14 tahun dengan garis tepi zona. Satu sumber GeoJSON per satuan, dibuat sekali; sakelar hanya mengubah `setLayoutProperty(visibility)` dan `setFilter`, tidak membuat ulang sumber (INP).
- **Rincian kompleks (klik titik atau baris daftar):** id kompleks, kabupaten, gambut ya/tidak, zona tiga versi, jarak air (lama, semua, kecil) dan jalan (utama, semua, setapak, tanda `_terpotong` 16 km), beda elevasi air terhadap kompleks (pil catatan DSM), kelas GSW, jumlah tahun terbakar MCD64A1 (jendela 2,3 dan 5 km), kekerapan sel VIIRS 2,2 km (0–14), CHIRPS anomali Jul–Okt tahun terakhir, status lahan (`lain`/`konsesi`/`konservasi`, tanpa nama perusahaan), KHG, waktu tempuh `akses.json` bila ada ("belum dihitung" bila tidak), dan **saran sarana**.
- **Aturan saran sarana (`saranSarana`)**, urutan dicek dari atas, berhenti di aturan pertama yang cocok, semua [asumsi-kebijakan] mengikuti doktrin §5.1:

| No | Syarat | Saran | Heli |
| --- | --- | --- | --- |
| 1 | `jam_tiba` > 6 jam dan api aktif (titik panas 24 jam di kompleks) | tahan front dari udara, regu darat menyusul; kit hanya di sisi yang sudah tertahan | ya |
| 2 | zona D | pencegahan (rewetting, sekat kanal, patroli), drone termal untuk deteksi; kit tidak dipra-posisikan | hanya bila aturan 1 |
| 3 | zona C | sumur bor dangkal pra-posisi + pompa jinjing; mobil tangki cadangan; kit dari sumur ke bara bila sumur ≥ 1,5 x debit operasi | tidak |
| 4 | zona B | kit lewat perahu dan portage (gulungan ≤ 30 kg per orang); depot depan di tepi kanal; sekat kanal di sel inti | tidak |
| 5 | zona A, air ≤ 0,5 km | pompa jinjing + selang 500 m + 2 lance cukup; kit relay tidak perlu | tidak |
| 6 | zona A, 0,5 < air < 2,5 km | kit relay SIPPA (layflat DN100 0,5–1,5 km, 8 lance, probe) | tidak |

  Tiap saran membawa `alasan[]` berangka ("air 1,4 km, jalan 3,2 km, zona A konservatif") dan tautan "Hitung hidraulika untuk kompleks ini", yang membuka `/pipa/hitung?kompleks=<id>` dengan L = jarak air x 1,2 (faktor liku trase [asumsi-kebijakan], bisa diubah) dan Δz = -(beda elevasi) dari DSM berlabel catatan.
- **Aksi perencana di panel:** "Catat cek jalan" (form kecil: musim kemarau/hujan, lolos/gagal, catatan ≤ 500 huruf, foto opsional → `POST /api/sippa/jalan-cek`); "Usulkan sebagai calon AOI" (menulis ke `sippa_aoi_usul`, ditampilkan di layar Laporan untuk G0).
- **Daftar alternatif peta:** tombol "Daftar" menampilkan tabel kompleks (paginasi 50, urut zona lalu tahun terbakar) yang bisa dipakai penuh dengan papan ketik; ini juga alternatif aksesibel peta.
- **Keadaan khusus:** R2 belum berisi berkas = kosong "Data kelayakan belum diunggah pipeline (`data.yml`)"; berkas basi (lebih tua dari 400 hari) = pil basi.

#### 9.4.3 Kalkulator hidraulika (`/pipa/hitung`)

- **Tujuan:** G04, G05, G22, §6.2, §6.4. Dipakai juga oleh operator berpengalaman di ponsel untuk cek cepat.
- **Tata letak desktop:** kolom kiri formulir (masukan dikelompokkan: Trase, Pipa/selang, Pompa, Lance, Sumber air, Lingkungan); kolom kanan hasil: kartu vonis besar (NO-GO merah, HOLD kuning, KONDISIONAL hijau, dengan daftar gerbang), lalu kartu angka (tekanan pompa, tekanan ujung, TDH, kecepatan, daya, BBM per jam dan per insiden, CO2, volume isi, waktu air tiba), lalu grafik tekanan sepanjang trase (garis tekanan per 50 m dari pompa sampai manifold, garis batas 88% x PN x f, garis 2 bar), lalu grafik head loss per diameter (DN65, DN100, DN150, OD110, OD160, OD200 pada debit terpilih) sebagai pembanding. Ponsel: masukan dalam akordeon, hasil vonis menempel di atas layar.
- **Masukan dan batas (divalidasi klien dan sama dengan fungsi murni):**

| Masukan | Satuan | Bawaan | Rentang | Catatan |
| --- | --- | --- | --- | --- |
| Bahan | - | layflat | layflat, HDPE | baja dan tertanam tidak ditawarkan untuk kit (G12, §6.8) |
| DN layflat / OD HDPE | mm | DN100 | DN65/100/150; OD110/160/200/250 | |
| SDR (HDPE) | - | 11 | 11, 17 | PN16, PN10 |
| ID datasheet | mm | kosong | 40–260 | bila kosong pakai 0,96 x DN (pil asumsi) |
| Tekanan kerja layflat datasheet | bar | 12 | 6–25 | |
| Panjang trase | m | 1.000 | 10–5.000 | |
| Debit | L/min | 300 | 50–3.000 | 300 L/min = 5 L/s, terserap 8 lance (320 L/min); 600 L/min dengan 8 lance adalah kasus ajar NO-GO H-SERAP; jumlah lance dikonfirmasi bench G2 |
| C Hazen-Williams | - | 130 | 100–150 | layflat 120–130, HDPE 135–140 |
| Beda elevasi Δz | m | dari kompleks atau 2 | -20 s.d. +50 | positif = naik |
| ΣK minor | - | 5 | 0–30 | |
| Tekanan sisa di manifold | bar | 3 | 0,5–6 | |
| Efisiensi pompa η | - | 0,65 | 0,35–0,90 | |
| Suhu pipa | °C | 35 | 20–60 | untuk derating HDPE |
| Pompa | - | kelas 1.500 L/min @ 10 bar bensin | kelas pompa dari daftar `KELAS_POMPA` | rating daya per kelas tertulis dengan sumber |
| Jumlah pompa | - | 1 | 1–4 | |
| Jumlah lance aktif | - | 8 | 0–24 | |
| Debit pemakai lain | L/min | 0 | 0–3.000 | selang serang atau perimeter yang tercatat; ditambahkan ke serapan untuk H-SERAP |
| Kedalaman lance | m | 1,5 | 0–5 | > 5 ditolak (keputusan 50); 3–5 diberi pil "lengan uji" |
| Jam pompa per insiden | jam | 24 | 1–720 | |
| Sumber: Q95, Q ekologi, stok, hari | L/s, L/s, m3, hari | kosong | ≥ 0 | neraca air dihitung bila Q95 diisi |
| Ujung di perimeter aktif | ya/tidak | tidak | | untuk H-PANAS |

- **Interaksi:** hitung ulang langsung saat masukan berubah (fungsi murni < 1 ms), grafik digambar ulang lewat `nanti()`. Tombol "Simpan sebagai skenario Studio" (perencana) menulis state ke `sippa_skenario`; tombol "Salin tautan" menulis semua masukan ke query.
- **Keluaran untuk buku:** tombol "Ekspor acuan" (Admin) mengunduh JSON masukan + hasil, yang bisa ditambahkan ke `acuan.json` sebagai uji baru.

#### 9.4.4 Pemicu pra-posisi (`/pipa/pemicu`)

- **Tujuan:** menjawab "kit dipindah ke depot depan sekarang atau belum" dari `fwi_ansambel.json` dan `iklim_outlook.json` (KD §3.1 lapis 2).
- **Data:** `pemicu.json` dibuat harian oleh `scripts/data/sippa/pemicu.py` (dirantai di `data.yml` setelah `ansambel.py`), unit = kabupaten yang memuat ≥ 1 kompleks zona A atau B (versi konservatif) atau ≥ 1 sel 2,2 km aktif ≥ 7 dari 14 tahun.
- **Aturan tingkat** (semua [asumsi-kebijakan], pil "belum diuji balik" sampai uji balik musim 2027 selesai):

| Tingkat | Syarat | Tindakan yang disarankan |
| --- | --- | --- |
| NORMAL | tidak ada syarat di bawah | kit di gudang induk; servis |
| SIAGA | `iklim_outlook.prakiraan` musim berjalan atau berikutnya untuk wilayah kabupaten (Kalteng = `kalbar_kalteng`) `anom_pct` ≤ -20% | cek kesiapan kit, latihan G6, isi BBM gudang |
| PRA-POSISI | SIAGA dan `fwi_ansambel` sel 0,5° yang memuat kompleks kabupaten itu punya `ps` (P(FWI ≥ 14)) ≥ 0,5 pada ≥ 3 dari 7 hari | pindah kit ke depot depan (YonTP), tugaskan operator, buat kode penugasan |
| GELAR | PRA-POSISI dan ada titik panas VIIRS 24 jam (`titik24.json`) di kompleks zona A/B yang terbakar ≥ 3 tahun (MCD64A1) | gelar kit sesuai saran sarana |

- **Tata letak:** kartu judul ("2 kabupaten di PRA-POSISI, 5 di SIAGA; prakiraan Kalbar-Kalteng SON 2026 -29,5% dari normal"); tabel kabupaten (kolom: tingkat sebagai pil, anomali hujan p50 dan rentang p10–p90, hari dengan P(FWI ≥ 14) ≥ 0,5, titik panas 24 jam di zona A/B, kit terdekat dan jaraknya dari `sippa_kit`, depot); grafik 7 hari P(FWI ≥ 14) per kabupaten terpilih. Ponsel: daftar kartu per kabupaten.
- **Aksi:** "Buat rencana pra-posisi" (perencana) membuka form gerak kit berstatus `rencana` (`POST /api/sippa/gerak/:id` dengan `rencana: 1`, tujuan depot, ETA; konfirmasi tiba `POST /api/sippa/tiba/:id`), yang tampil di layar Kit sebagai gerak terencana sampai dikonfirmasi tiba.
- **Basi:** `fwi_ansambel.json` lebih tua dari 36 jam = pil basi dan tingkat PRA-POSISI/GELAR tidak dihitung (tampil "–, data ansambel basi").

#### 9.4.5 Inventaris dan lacak kit (`/pipa/kit`, `/pipa/kit/:id`)

- **Tujuan:** keputusan 35 (lacak kit dan logistik antar-daerah karhutla ke banjir), U8 (kehilangan < 5%), U9 (catatan pemakaian banjir), K-15 (QR, gudang terkunci).
- **Daftar (`/pipa/kit`):** kartu judul ("3 kit: 2 di gudang Palangka Raya, 1 di banjir Kapuas; kehilangan komponen musim ini 1,2%"); peta kecil lokasi kit terakhir (titik per kit, garis gerak 30 hari); tabel kit (kolom: kode, jenis gambut/mineral/banjir/pinjam pilot, status sebagai pil, lokasi, provinsi, sejak, komponen lengkap/kurang, jam pompa musim ini, m3 banjir musim ini, pemilik asal). Filter status dan jenis. Ponsel: daftar kartu dengan tombol "Pindai QR".
- **Status kit dan transisi sah** (pasangan sah ditegakkan CHECK `sippa_gerak` di migrasi 0056; siapa boleh per transisi, yaitu staf tulis, operator kit tugasnya, atau moderator admin untuk `hilang`, `ditemukan`, `pensiun`, `koreksi`, ditegakkan `src/sippa.js`; tabel mengikat di DESAIN-TEKNIS §6.2):

| Dari \ ke | gudang | depot | gelar | banjir | servis | hilang | pensiun |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gudang | | ya | ya | ya | ya | ya | ya (Admin) |
| depot | ya | | ya | ya | ya | ya | |
| gelar | ya | ya | | ya | ya | ya | |
| banjir | ya | ya | ya | | ya | ya | |
| servis | ya | | | | | ya | ya (Admin) |
| hilang | ya (ditemukan, Admin) | | | | | | ya (Admin) |

- **Rincian (`/pipa/kit/:id`):** kepala kit (kode besar, QR untuk dicetak, status, lokasi, pemilik asal: BMN BNPB atau pinjam Manggala Agni/BPBD untuk pilot 2026, T-C); tab **Komponen** (tabel BOM per kode §6.1: kode, nama kelas kinerja, jumlah, satuan, nomor seri, kondisi, dicek terakhir; tombol "Cek komponen" mengubah kondisi per baris, hasil ke jejak); tab **Gerak** (garis waktu gerak: dari, ke, alasan, pengangkut YonTP/BPBD/Daops, ETA rencana, tiba, durasi; peta jejak lokasi); tab **Pemakaian** (log gelar dan log banjir yang memakai kit ini: jam pompa, m3, BBM); tab **BBM** (buku BBM append-only); tab **Penugasan** (kode penugasan aktif dan riwayat, tombol "Tugaskan" dan "Cabut").
- **QR:** QR berisi teks `SIPPA:<kode kit>` (bukan rahasia, hanya pengenal), digambar di klien dengan pustaka kecil yang divendor `public/vendor/qrcode/qrcode.min.js` (qrcode-generator, lisensi MIT; pemilik `layar-peta` karena `public/vendor/**`), dicetak sebagai label A6 per kit dan label kecil per bin komponen (`SIPPA:<kode kit>:<kode BOM>`). Pindai di ponsel memakai `BarcodeDetector` bila tersedia; bila tidak, kotak isian kode manual. Hasil pindai membuka rincian kit atau, di form lapangan, mengisi kit pada isian gerak.
- **Tugaskan kit:** form (nama regu, unsur Manggala Agni/BPBD/YonTP/MPA/lain, provinsi, kabupaten, kompleks tujuan opsional, berlaku sampai, maks 30 hari). Hasil: kode 26 heks ditampilkan SEKALI sebagai tautan `/pipa/lapangan#k=<kode>` dan QR untuk dipindai operator; hanya sha256 kode yang disimpan. Peringatan tertulis: "Simpan atau kirim tautan ini sekarang; tautan tidak bisa ditampilkan lagi."
- **Kehilangan:** status `hilang` per komponen atau per kit wajib catatan; persen kehilangan musim = Σ komponen hilang / Σ komponen awal musim (per kit dan total), dibandingkan ambang 5% (U8) dan 20% (K-15: pengamanan kit ditinjau sebelum gelar berikut).

#### 9.4.6 Rekap time-motion (`/pipa/log`)

- **Tujuan:** G3 per kelas medan, U6.
- **Data:** `GET /api/sippa/log` (log gelar dari form lapangan dan entri staf).
- **Ukuran yang dihitung (`kuantil`):** durasi tiba-sampai-air-mengalir (t_air_mengalir - t_tiba), durasi gelar (t_air_mengalir - t_mulai_gelar), durasi bongkar, laju gelar m/jam (panjang / durasi gelar), orang-jam per 100 m.
- **Tata letak:** kartu judul per kelas ("Kelas I: p50 3,4 jam, p90 5,1 jam dari 6 ulangan; ambang G3 p50 ≤ 4 jam, p90 ≤ 6 jam"); grafik titik per ulangan (sumbu y jam, garis ambang G3 kelas itu, garis hipotesis Studio 22–27 jam untuk Kelas I sebagai batas yang harus dikalahkan); tabel log (tanggal, kit, regu, kelas, jenis, panjang, orang, durasi tiap tahap, jam pompa, BBM, air m3, sumber isian lapangan/staf). Filter jenis (karhutla, banjir, latihan) dan rentang tanggal. Unduh CSV.
- **Aturan tampil:** n < 5 per kelas = pil "n kecil, belum bisa memutus G3"; isian dummy tidak pernah masuk rekap staf nyata. Butir bertanda `jam_klien_meleset` tampil dengan penanda dan bisa disaring terpisah (§9.9).
- **Koreksi:** staf tidak menyunting baris log; koreksi = baris baru dengan `koreksi_dari` (jejak utuh).

#### 9.4.7 Dashboard A/B (`/pipa/ab`)

- **Tujuan:** G4, U4, U7; protokol A/B 4 lengan (konvensional, kit + lance, kit + surfaktan, sekat kanal/rewetting) dan lengan uji `lance_dalam` (3–5 m, keputusan 9).
- **Masukan:** unggah CSV petak (perencana) atau baris petak dari form lapangan (probe dan air per petak). Kolom CSV wajib, satu baris per petak per tahap pengamatan:

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `petak_id` | teks 3–40 | unik per AOI |
| `aoi` | teks | |
| `lengan` | enum | konvensional, lance, lance_surfaktan, sekat_rewetting, lance_dalam |
| `pasangan_id` | teks atau kosong | untuk desain berpasangan |
| `tanggal_perlakuan` | YYYY-MM-DD | ≤ hari ini |
| `luas_m2` | angka | 1–100.000 |
| `regu_hari` | angka | 0–1.000 |
| `air_m3` | angka | 0–100.000 (totalizer) |
| `surfaktan_l` | angka | 0 bila bukan lengan surfaktan; > 0 hanya untuk lance_surfaktan |
| `biaya_rp` | bilangan bulat | ≥ 0 |
| `dingin_24j`, `dingin_72j` | 0/1/kosong | semua probe < 50 °C |
| `nyala_7h`, `nyala_30h`, `nyala_90h` | 0/1/kosong | |
| `catatan` | teks ≤ 500 | |

  Batas: berkas ≤ 1 MB, ≤ 2.000 baris, UTF-8, pemisah koma atau titik koma (dikenali dari baris kepala). Satu baris salah = seluruh berkas ditolak dengan daftar nomor baris dan kolomnya; tidak ada penyimpanan sebagian.
- **Keluaran:** per lengan dibanding konvensional: ha dingin terverifikasi 30 hari per regu-hari (selisih rerata dan 95% CI Welch), nyala ulang 7/30/90 hari (selisih proporsi, 95% CI Agresti-Caffo), air m3 per ha, biaya per ha dingin terverifikasi (dengan dan tanpa CAPEX teramortisasi, KD §4.4 dan Studio, G09), n petak per lengan. Kartu vonis G4 per lengan: **LULUS** (≥ 30% lebih baik pada salah satu ukuran, CI tidak memotong nol, n ≥ 8 per lengan, biaya per ha ≤ 1,2 x konvensional), **TIDAK LULUS**, atau **BELUM BISA DIPUTUS** (n < 8 atau CI memotong nol). Semua angka efikasi berpil "hipotesis" sampai evaluator independen menandatangani (status di `sippa_ab_unggah.status`).
- **Grafik:** titik per petak per lengan dengan garis rerata dan bilah CI; grafik batang nyala ulang 7/30/90 hari per lengan.
- **Batas tampil:** hasil pilot Okt 2026 tampil dengan pil "pilot, n kecil" dan tidak pernah dipakai untuk vonis G4. Vonis pilot "dapat dipakai" (keputusan 53, `vonisPilot`) tampil sebagai kartu terpisah dengan tujuh butir dan tiga nilai (DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, BELUM DAPAT DIPAKAI), dan juga di templat Laporan pilot §9.10.

#### 9.4.8 Data dan metode (`/pipa/data`)

Daftar tiap dataset §7.1 (nama, berkas, sumber dan lisensi, tanggal tarik, batas data, keterbatasan, keyakinan), tabel rumus §9.3, daftar gerbang, dan "Batas pemakaian alat" (G22, G23): simulator tidak membuktikan efektivitas; manfaat bawaan 0; skor tidak meluluskan NO-GO; pompa dinilai dengan rating, bukan kurva Q-H terukur sebelum G2; jam pompa dan hari regu tahunan di Studio dianggap terjadi tiap tahun, sedangkan KD memakai 40% tahun kering. Teksnya sama dengan Lampiran L buku dan dibaca dari satu berkas `public/pipa/batas.js` supaya tidak bercabang.

#### 9.4.9 Pemeliharaan (`/pipa/pelihara`, keputusan 56)

- **Tujuan:** jadwal pemeliharaan semua kelas aset §6.10 dalam satu tempat, dari data `sippa_komponen`, `sippa_aset`, `sippa_inspeksi`, `sippa_log_gelar`, dan `sippa_stok_gerak`.
- **Isi desktop:** kartu Insight "12 butir terlambat, 3 kit tidak laik gelar, 2 suku cadang di bawah minimum" (`Sumber: SIPPA D1, per <waktu>`); chip kelas K1–K10 dan chip status (terlambat, segera, aman, belum pernah); tabel jadwal (aset atau komponen, kelas, kit atau lokasi, inspeksi terakhir, skor, jatuh tempo, status, pemelihara, tombol "Catat inspeksi"); kalender 12 bulan yang menumpangkan jatuh tempo pra-musim pada pita musim karhutla dan banjir; panel stok (gudang, kode, saldo, stok minimum, pil "di bawah minimum", tombol "Catat stok"); kartu biaya per tahun per kelas dengan pil **asumsi-kebijakan** dan rumus §6.10.7; tombol unduh `pelihara.csv` untuk penyusunan anggaran.
- **Ponsel:** daftar kartu butir terurut status (terlambat dulu), tombol "Catat inspeksi" 56 px; dialog inspeksi berisi skor 0–3 sebagai segmen berlabel kata, jam operasi (K1), temuan, tindakan, hasil uji (mutu air untuk K7, tekanan untuk K2), foto opsional.
- **Aturan:** jadwal dihitung klien dengan `SippaPelihara.jadwal()`; inspeksi komponen kit memperbarui `sippa_komponen.kondisi` dan `dicek` lewat trigger, jadi layar Kit langsung sama; pil "tidak laik gelar" mengikuti §6.10.4 (peringatan, T-P).

#### 9.4.10 Air tanah pascabencana (`/pipa/air`, keputusan 56)

- **Tujuan:** daftar bersama sumur darurat dan produksi semua pelaksana (rehab R-RR-11) dengan batas Badan Geologi (rehab Q10) dan rantai lokasi, uji mutu, serah terima, pengelola.
- **Isi:** kartu "421 CAT ditetapkan; 38 sumur darurat tercatat, 9 belum diuji mutu" (angka dari `cat.json` dan `sippa_aset`); peta provinsi berwarna status zona konservasi CAT (tabel provinsi bila poligon belum diterima dari Badan Geologi; T2 tidak dipakai karena bukan data naik-turun) dengan titik sumur berpil status; tabel sumur (kode, pelaksana, kejadian, kedalaman, debit, CAT, zona, rekomendasi Badan Geologi, uji mutu terakhir, status serah terima, pengelola); tombol "Catat sumur" dan "Catat uji mutu".
- **Aturan:** sumur di zona `kritis` atau `rusak` tanpa nomor rekomendasi teknis Badan Geologi ditolak (rute 400 dan CHECK); sumur gagal uji mutu berpil "tidak laik minum"; kawasan penurunan muka tanah pesisir utara Jawa ditandai kehati-hatian (rehab prinsip 6); data sumur dari TNI AD, Polri, dan Kementerian PU dicatat dengan `sumber` dan `rujukan`, label keyakinan sesuai sumbernya.

#### 9.4.11 Akses pascabencana (`/pipa/akses`, keputusan 56)

- **Tujuan:** beban kerusakan jembatan, program jembatan menurut pemiliknya (rehab R2), dan jembatan darurat yang harus diganti permanen.
- **Isi:** kartu "3.833 jembatan rusak 2018–2025, 1.088 pada 2025" dari `jembatan_dibi.json` (DIBI, resmi); grafik batang per tahun dan peta bulatan per provinsi (per kab/kota setelah tarikan DIBI per kab tersedia); tabel program per pemilik dari `program_jembatan.json` (Satgas Pembangunan Jembatan TNI AD, Jembatan Merah Putih Presisi Polri, jembatan gantung Kementerian PU, bailey DSP BNPB: jumlah, selesai, di wilayah bencana, biaya satuan bila diumumkan, sumber, tanggal); tabel jembatan tercatat (`sippa_aset` kelas `jembatan_darurat` dan `jembatan_permanen`: kode, nama, sumber program, pemilik aset, status, rencana ganti, inspeksi terakhir) dengan pil "tanpa jadwal ganti"; tombol "Catat jembatan".
- **Aturan:** nama "Jembatan Merah Putih" selalu bersama pemiliknya; tidak ada nama program tanpa sumber; BNPB tidak menyunting kondisi jembatan milik pihak lain tanpa `rujukan` sumber pemilik; angka sekunder (media) tidak tampil (rehab Q16).

#### 9.4.12 Rincian aset (`/pipa/aset/:id`)

Pola rincian kit (§9.4.5): kepala aset (kode `AS-####`, kelas, status, pemilik aset, pemelihara, lokasi), kartu angka (skor terakhir, hari sejak inspeksi, jatuh tempo), tab Inspeksi (lini masa tambah-saja), Mutu air (K7), Serah terima, Peta kecil. Ubah status dan pemelihara oleh perencana; jejak di `pantau_jejak`.

### 9.5 Simulator keputusan (`/pipa/studio`)

Dibangun ulang dari `Karhutla_Decision_Dashboard.html` pemilik ("Karhutla Decision Studio v1.0", baca-C C1) dengan gaya Pantau Bencana; **mesin hitung dan gerbangnya dipertahankan** (keputusan 34), semua skenario dibandingkan berdampingan (keputusan 43), NPV/BCR/Monte Carlo dengan manfaat bawaan 0 (keputusan 15, T-F).

#### 9.5.1 Mesin

- `public/pipa/studio_mesin.js` = salinan bagian mesin berkas pemilik (konstanta `G`, `BASES`, `PIPE`, `COST`, `QBASE`, `N`; fungsi `defaultState`, `getBase`, `buildBoQ`, `assess`, `compare`, `drawRiskMC`; objek `KarhutlaEngine`), **angka dan rumus tidak diubah**. Perubahan hanya tiga jenis, masing-masing ditandai komentar `SIPPA:` di berkas:
  1. Pembungkus modul (mengisi `globalThis.KarhutlaEngine` dan bisa dimuat `vm` di Node), tanpa `localStorage` (penyimpanan pindah ke D1).
  2. Lapisan gerbang tambahan `gerbangSippa(state, hasil)` yang dijalankan sesudah `assess` dan hanya bisa **menambah** hambatan, tidak pernah menghapus: H-SERAP (G22: debit pompa > lance x 40 L/min), H-DALAM (kedalaman > 5 m), `jaringan_permanen` (arsitektur semi-permanen atau backbone, keputusan 50 dan 60), dan H-AIR versi faktor 1,5 (G1). Gerbang mesin asli (88% x PN x derating, panas + termoplastik, ujung HDPE di bara, daya > rating, air bersih < debit, izin air, hak lahan, lingkungan, rewetting saja saat api aktif) tetap utuh.
  3. Perbaikan cacat G23 yang tidak mengubah angka: teks "30 dimensi/93 pilihan" menjadi hitungan nyata dari skema (32/100), nama item `ELEC` dan `GEN` diisi, harga heli placeholder Rp130 juta/jam (G13) diganti slot `sippa.heli.biaya_jam` berstatus **menunggu** (T-A) dengan pembanding resmi "> Rp200 juta per sorti satu jam" (BNPB, Sept 2023) yang ditampilkan berdampingan, tidak dicampur ke TCO sampai angka BNPB diserahkan.
- Status keputusan tetap tiga (NO-GO, HOLD/VALIDASI, KONDISIONAL); tidak ada "GO". Skor berbobot tidak pernah meluluskan NO-GO (G11).
- Monte Carlo tetap 800 sampel dengan benih deterministik dari hash keadaan (FNV-1a + xorshift, seperti aslinya), sehingga hasil sama untuk keadaan yang sama dan bisa diuji. Dijalankan di Web Worker `public/pipa/studio_pekerja.js` supaya geser slider tidak membekukan layar.
- Uji wajib `tests/sippa/studio_mesin.test.mjs` mereproduksi angka jalan-ulang baca-C C1.4 dari `defaultState` dan tiga preset: CAPEX S1 Rp5,23 M, S2 Rp9,69 M, S3 Rp19,77 M; OPEX Rp745 juta, Rp768 juta, Rp1,152 M; TCO 5 tahun Rp8,96 M, Rp13,53 M, Rp25,54 M; tekanan semi 5,39 bar; impas semi Rp3,19 M per tahun; Monte Carlo semi P10/P50/P90 Rp12,06/14,10/16,07 M; uji silang OD160 SDR11 2.000 L/min 2 km +10 m NO-GO tekanan, OD200 lolos. Toleransi 0,5%. Uji kedua memastikan `gerbangSippa` tidak pernah mengurangi jumlah hambatan keras mesin asli (properti: untuk 200 keadaan acak berbenih, keras_sesudah ≥ keras_sebelum).

#### 9.5.2 Skenario yang dibandingkan

| Kode | Skenario | Asal |
| --- | --- | --- |
| S0 | Kit SIPPA relay: layflat DN100 1.000 m + DN65 500 m, 2 pompa bensin kelas 1.500 L/min, 8 lance, probe, di atas tanah, kendaraan dan perahu dipinjam (G06) | preset baru dari BOM §6.1 |
| S0B | S0 + modul banjir (pompa ≥ 100 L/s head 3–5 m, layflat DN150 300 m), fungsi banjir "pompa terpisah" | preset baru (keputusan 7) |
| S1 | Portable | preset pemilik |
| S2 | Semi-permanen | preset pemilik; pembanding saja, selalu NO-GO `jaringan_permanen` (keputusan 60) |
| S3 | Backbone permanen | preset pemilik; pembanding saja, selalu NO-GO `jaringan_permanen` (keputusan 60) |
| U1–U6 | skenario tersimpan pengguna | `sippa_skenario` |

#### 9.5.3 Tata letak dan interaksi

- **Desktop:** sidebar kiri 340 px berisi 8 kelompok pemilik (Wilayah & kelayakan, Sumber air & hidrologi, Arsitektur, Pompa & tenaga, Pemantauan & respon, Multi-guna & ekologi, Logistik & pemeliharaan, Anggaran & horizon) sebagai akordeon; 32 dimensi kategorikal sebagai segmen atau `PilihCantik`, 36 parameter numerik sebagai slider + kotak angka dengan satuan dan teks bantuan asli. Panel kanan berisi tab: **Bandingkan semua** (bawaan), Ringkasan, Hidraulika, Biaya & BOQ, Risiko & gerbang, Simulasi & sensitivitas, Matriks 100 pilihan, Batas alat.
- **Tab "Bandingkan semua":** matriks kolom = S0, S0B, S1, S2, S3, dan skenario tersimpan yang dicentang (paling banyak 6 tambahan); baris: status keputusan (pil), jumlah hambatan keras/bersyarat/catatan, CAPEX dengan kontingensi, OPEX per tahun, TCO 5 tahun nominal, TCO terdiskonto 8%, manfaat impas per tahun, NPV dan BCR pada tiga skenario manfaat (0; regu konvensional terhindar; heli-hari terhindar, yang terakhir "menunggu" sampai T-A), NPV/BCR + banjir (keputusan 7), NPV/BCR + banjir + irigasi (keputusan 8), Monte Carlo TCO P10/P50/P90, tekanan pompa, daya poros, jam gelar, waktu siap, risiko screening, kesiapan, CO2 BBM per tahun, biaya per ha terverifikasi (versi Studio: OPEX saja; versi KD: CAPEX teramortisasi masuk, G09). Nilai terbaik per baris disorot hanya di antara kolom yang bukan NO-GO. Kolom NO-GO tetap tampil dengan alasan kerasnya di kepala kolom.
- **Manfaat (T-F):** bawaan 0 di semua skenario. Tiga sumber manfaat bisa dinyalakan, masing-masing berpil asumsi-kebijakan dan menampilkan rumusnya: (a) regu konvensional terhindar = Δ regu-hari per tahun x Rp2,25–3,75 juta per regu-hari (KD §4.3); (b) heli-hari terhindar = n heli-hari x slot harga BNPB (menunggu); (c) pemakaian banjir = jam pompa banjir per musim x tarif sewa pompa setara per jam [asumsi, slot `sippa.banjir.sewa_jam` diisi dari RFQ atau data BPBD]; (d) irigasi = ha x nilai per ha [asumsi, slot `sippa.irigasi.nilai_ha`], dan nol otomatis bila syarat keras irigasi (§5.7) tidak dicentang.
- **Ponsel:** hanya tab "Bandingkan semua" sebagai daftar kartu skenario dan tab Ringkasan; sidebar jadi lembar penuh. Pita "Simulator dirancang untuk laptop".
- **Simpan, impor, ekspor:** "Simpan skenario" (perencana, nama 3–80 huruf) ke `sippa_skenario`; "Impor JSON" menerima berkas ekspor Studio lama (`karhutla-decision-v1`) dan skenario SIPPA; "Ekspor JSON", "BOQ CSV", "Matriks 100 opsi CSV" seperti aslinya; "Cetak" membuka templat laporan "Skenario" (§9.10). Tombol "Atur ulang" mengembalikan `defaultState`.
- **Keadaan:** mesin gagal dimuat = galat dengan nama berkas; Web Worker tidak tersedia = Monte Carlo dijalankan di utas utama lewat `nanti()` dengan pita "lambat di peramban ini".

### 9.6 Simulasi 3D (`/pipa/3d`)

Keputusan 18: Three.js, mengikuti pola simulasi karhutla yang ada (`public/sim_adegan.js`): bagian atas berkas = logika murni tanpa DOM/WebGL (diekspor, diuji di Node), bagian bawah = runtime peramban yang dimuat malas.

- **Pustaka:** three 0.169.0 (versi yang sama dengan `sim_adegan.js`) **divendor** ke `public/vendor/three/` (`three.module.min.js`, `addons/controls/OrbitControls.js` dengan impor `"three"` ditulis ulang menjadi jalur relatif `../../three.module.min.js`, berkas `LICENSE`, dan `README` yang mencatat versi dan langkah tulis ulang). Alasannya: CSP halaman staf (`script-src 'self'`) menolak CDN dan menolak import map sebaris. Pemilik vendor: `layar-peta`.
- **Berkas:** `public/pipa/adegan.js` (logika murni + runtime), `public/pipa/adegan.css`.
- **Tiga adegan (segmen di atas kanvas):**
  1. **Susunan kit:** sumber air dengan selang hisap, foot valve dan strainer, pompa, filter servis + bypass, flowmeter, sensor tekanan, layflat DN100 tergulung lalu terbentang, manifold DN100 ke 4 x DN65, lance, node suhu, kontainer depot. Klik komponen = kartu info (kode BOM §6.1, kelas kinerja, titik kerja, kriteria terima, gambar teknik terkait SIPPA-G-xx).
  2. **Jalur air:** trase dari sumber ke manifold mengikuti profil elevasi (tiga titik `dem_elevasi.csv` untuk kompleks terpilih, diinterpolasi linear, berpil "DSM berkanopi, ilustrasi"; DEMNAS menggantikan setelah tersedia), partikel bergerak dengan kecepatan proporsional v, warna sepanjang selang = tekanan per segmen 50 m dari `hidraulika()` (skala sama dengan grafik kalkulator), penanda merah bila segmen melewati batas H-TEKANAN atau di bawah 2 bar. Waktu air tiba dianimasikan sesuai `t_tiba_menit`.
  3. **Injeksi:** penampang gambut 0–2 m (diperpanjang ke 5 m bila kedalaman lengan uji dipilih) dengan muka air tanah, zona bara 0,3–0,5 m, lance yang menembus, dan front basah yang membesar menurut r(t) = sqrt(Q t / (π h n_e)) (h = panjang lubang lance, n_e porositas efektif bawaan 0,5 [asumsi, ilustrasi]); probe 0,1/0,3/0,5/1,0 m menampilkan suhu yang turun secara ilustratif. Label tetap di sudut: "Ilustrasi, bukan model panas terkalibrasi (model M04 belum dikalibrasi)".
- **Kontrol:** debit, DN, panjang trase, Δz, jumlah lance, kedalaman lance (0–5 m, batas keras), kompleks (dari peta). Semua angka berasal dari `SippaHitung.hidraulika`, sama persis dengan kalkulator; panel teks di samping kanvas menampilkan angka yang sama (juga alternatif aksesibel).
- **Kinerja:** render hanya saat ada perubahan atau animasi aktif; `pixelRatio` ≤ 1,5; ponsel: partikel dikurangi 4 kali dan bayangan mati; `prefers-reduced-motion` menghentikan animasi partikel; kanvas dibuang saat pindah layar (`dispose` geometri dan tekstur).
- **Tanpa WebGL:** diagram SVG 2D statis dari logika murni yang sama (susunan kit dan profil tekanan), dengan pita "Peramban ini tidak mendukung WebGL".
- **Uji:** `tests/sippa/adegan_logika.test.mjs` (posisi komponen tidak saling tumpuk, profil tekanan sama dengan `hidraulika()`, front basah monoton naik, kedalaman > 5 ditolak).

### 9.7 Data, skema D1, dan rute worker

#### 9.7.1 Berkas data turunan (R2 `sippa/`)

Dibuat skrip `scripts/data/sippa/*.py` (Python 3.12 stdlib, self-check `python3 <skrip>.py uji`, pemilik `pipa-data`), di-commit ke `data/sippa/keluaran/`, diunggah ke R2 `poskokarhutla-foto/sippa/<nama>.json` di `data.yml` (pola `risiko/`), dibaca lewat `GET /api/sippa/data/<nama>`. Batas ukuran 8 MB per berkas. Medan, tipe, satuan, dan keyakinan per medan mengikat di DESAIN-TEKNIS §3.1.

| Berkas | Isi utama | Medan pokok | Penyegaran |
| --- | --- | --- | --- |
| `kelayakan_kompleks.json` | 865 kompleks Kalteng | `id, prov, kab, lat, lon, gambut, air_km_lama, air_km_semua, air_km_kecil, air_jenis, jalan_km_lama, jalan_km_utama, jalan_km_semua, jalan_km_setapak, terpotong, zona_k, zona_u, zona_o, elev_kompleks_m, elev_air_m, beda_air_m, gsw, terbakar_n_2km, terbakar_n_5km, terbakar_akhir, kekerapan_sel22, chirps_anom_akhir_pct, kaw, khg, jam_tiba` + `kolom_keyakinan` | tahunan + saat AOI baru |
| `kelayakan_sel.json` | sel 2,2 km Kalteng dengan ≥ 1 deteksi VIIRS 2012–2025 (kolomar) | `sel, lat, lon, tahun_aktif, deteksi, gambut, zona_k_terdekat, kompleks_terdekat, kompleks_km` (jarak per sel menunggu BT-03) | tahunan (Januari) |
| `zona.json` | ringkasan zona per provinsi, kabupaten, dan versi | `prov, kab, versi (k/u/o), A, B, C, D, n, median_air_km, median_jalan_km, tanpa_jalan_16km` | mengikuti `kelayakan_kompleks.json` |
| `sel22.json` | kekerapan sel 2,2 km untuk buku | `sel, tahun_aktif, per_tahun[14]` + ringkasan ≥ 3/5/7/10 | tahunan |
| `kit_nasional.json` | 18 provinsi dan jumlah kit | `prov, kelompok, luas_puncak_ha, tahun_puncak, kit, musim_banjir_pasangan` + `ha_per_kit` 22.700 berlabel asumsi | saat `luas_resmi.json` berubah |
| `pemicu.json` | tingkat pemicu per kabupaten | `prov, kab, tingkat, wilayah_iklim, musim, anom_pct, anom_p10, anom_p90, hari_ps50, titik_panas_zona_ab, alasan[]` | harian |
| `aoi_calon.json` | calon AOI G0 dari saringan KD §3.2 dan usulan staf (`aoi.py`) | `id, kab, kec, lat, lon, kekerapan, median_air_km, zona, kaw, catatan` | saat diminta |
| `cat.json` (keputusan 56) | cekungan air tanah dan status zona konservasi per CAT dan per provinsi, dari Badan Geologi (lampiran Permen ESDM 2/2017 dan surat Lampiran I) | `cat_kode, nama, prov[], zona_status (aman/rawan/kritis/rusak/belum_ditetapkan), penurunan_tanah (bool), sumber, tarik` | saat data Badan Geologi diterima |
| `jembatan_dibi.json` (keputusan 56) | jembatan rusak DIBI per provinsi per tahun 2018–2025 (per kab/kota setelah ditarik) dan per jenis bencana | `prov, kab|null, tahun, jenis, jembatan_rusak` + ringkasan nasional | tahunan + saat DIBI per kab ditarik |
| `program_jembatan.json` (keputusan 56) | program jembatan per pemilik dari rilis resmi dan daftar per titik bila diterima | `pemilik, program, tanggal, titik, selesai, wilayah_bencana, biaya_satuan|null, keyakinan, rujukan` | saat rilis atau surat diterima |

#### 9.7.2 Skema D1

Empat migrasi baru (0056–0058, ditambah 0059 dari keputusan 56), bernomor urut sesudah `0055_uji_lapangan.sql`, idempoten (`IF NOT EXISTS` untuk tabel, indeks, trigger; tanpa `ALTER`/`DROP`), tidak pernah disunting setelah diterapkan di produksi (dicatat ke `tests/warga/migrasi_beku.json`). Semua tabel `sippa_*` punya kolom `dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))`, termasuk `sippa_telemetri` dan `sippa_telemetri_harian`. Jejak memakai `pantau_jejak` lewat `jejakStmt` (`src/staf.js`). Waktu = milidetik epoch UTC. **SQL lengkap yang mengikat ada di DESAIN-TEKNIS §3.2–§3.4 dan §3.6**; ringkasannya:

| Migrasi | Tabel | Pokok aturan |
| --- | --- | --- |
| `0056_sippa_inti.sql` (pilot minggu ini) | `sippa_kit`, `sippa_komponen`, `sippa_gerak`, `sippa_tugas`, `sippa_log_gelar`, `sippa_probe`, `sippa_bbm`, `sippa_foto`, `sippa_jalan_cek`, `sippa_aoi_usul` | kode kit `SIPPA-###` (900–999 khusus dummy); pasangan transisi status sah sebagai CHECK di `sippa_gerak`, trigger konkurensi optimistis dan append-only; tugas ≤ 30 hari, hanya `kode_sha`; log gelar append-only (koreksi = baris baru `koreksi_dari`), trigger urutan waktu, medan vonis pilot keputusan 53 (`petak_id`, `air_sampai_lance`, `p_ujung_bar`, `p_ujung_menit`, `p_ujung_sumber`, `kecelakaan`, `bocor_henti_menit`, `konfigurasi`), `jam_klien_meleset`; probe tahap `sebelum`, `sesudah`, `24j`, `72j`, `7h`, `30h`, `90h`, kedalaman hanya 10/30/50/100/150/300/400/500 cm (keputusan 50); foto lewat `sippa_foto` (JPEG/WebP saja, kunci R2 dari server); kolom `prov` diisi server untuk saring wilayah |
| `0057_sippa_ab_skenario.sql` | `sippa_ab_unggah`, `sippa_petak`, `sippa_skenario`, `sippa_laporan` | `sha` unggahan UNIQUE (409); lima lengan; surfaktan > 0 hanya lengan surfaktan; `UNIQUE (aoi, petak_id)`; state skenario JSON objek ≤ 32 KB; arsip laporan dengan `ada_berkas`, kunci R2 `sippa-laporan/<id>.pdf` dari server |
| `0058_sippa_telemetri.sql` | `sippa_perangkat`, `sippa_telemetri`, `sippa_telemetri_harian`, `sippa_alarm` | telemetri **satu baris per pesan** (larik bacaan JSON, id = 32 heks sha256 token + badan; T-J); token hanya sha256; satu alarm terbuka per (perangkat, kode) |
| `0059_sippa_aset_pelihara.sql` (keputusan 56) | `sippa_aset`, `sippa_inspeksi`, `sippa_stok_gerak` | aset bukan kit tujuh kelas (`sumur_bor`, `pompa_sumur`, `pipa_sementara`, `tandon_hidran`, `pipa_koridor` (dicabut keputusan 60, CHECK tidak disunting), `jembatan_darurat`, `jembatan_permanen`), kode `AS-####` (9000–9999 khusus dummy), `pemilik_aset` wajib, atribut per kelas sebagai objek JSON ≤ 4 KB, CHECK sumur zona kritis/rusak wajib `rekomendasi_bg`; inspeksi tambah-saja dengan skor 0–3, uji mutu air wajib `e_coli_cfu`, trigger mengisi `sippa_komponen.kondisi` dan `dicek`; stok buku besar tambah-saja, saldo negatif ditolak trigger |

#### 9.7.3 Rute worker (`src/sippa.js`, `RUTE_SIPPA` digabung ke `RUTE` di `src/worker.js`)

Router worker hanya mengenali `:id` 16 heks di ujung jalur, jadi aksi ditulis sebelum id (`/api/sippa/gerak/:id`, bukan `/api/sippa/kit/:id/gerak`; DESAIN-TEKNIS ADR-04). Lambang hak: **T** tamu; **B** baca (admin, atau staf `pusdalops`, `koordalops`, `pimpinan`); **W** tulis (admin, atau staf `pusdalops`, `koordalops`; kiriman staf wajib header `x-pb: 1`); **M** moderator admin (`modOK`); **SA** Super Admin; **K** kode penugasan di header `x-kode` (26 heks, `pemegangKode`); **D** token perangkat `Authorization: Bearer`. Batas laju hanya pada rute tulis dan kegagalan autentikasi (tiap panggilan `laju()` = satu tulisan D1; ADR-06); GET staf tidak dibatasi. Penyimpanan butir memakai `INSERT ... ON CONFLICT(id) DO NOTHING`, bukan `INSERT OR IGNORE` yang menelan pelanggaran CHECK (ADR-08). Validasi, bentuk badan, dan jawaban per rute mengikat di DESAIN-TEKNIS §4.3.

| Metode dan jalur | Hak | Laju per jam |
| --- | --- | --- |
| `GET /pipa`, `GET /pipa/<layar>` (`LAYAR_SIPPA`), `GET /pipa/kit/:id`, `GET /pipa/aset/:id` | B; tamu 303 ke `/admin/pantau?ke=<jalur>`; sesi lain 403 polos | tidak |
| `GET /pipa/lapangan` | T | tidak |
| `GET /admin/pipa` | B (303 ke `/pipa`) | tidak |
| `GET /api/sippa/data/<nama>` (10 nama tetap §9.7.1) | B; hak dicek sebelum R2, tamu 401 identik untuk nama ada dan tidak ada | tidak |
| `GET /api/sippa/ringkas`, `GET /api/sippa/kit`, `GET /api/sippa/kit/:id` | B | tidak |
| `POST /api/sippa/kit` | M | 60 |
| `POST /api/sippa/kit/:id` (lokasi, catatan) | W | 600 |
| `POST /api/sippa/komponen/:id` (id = kit) | W | 600 |
| `POST /api/sippa/gerak/:id` (id = kit) | W; K untuk kit tugasnya dengan alasan gelar, bongkar, kembali; `hilang`/`pensiun`/`ditemukan` hanya M | W 600, K 120 |
| `POST /api/sippa/tiba/:id` (id = gerak) | W; K untuk kit tugasnya | 120 |
| `POST /api/sippa/tugas`, `POST /api/sippa/tugas-cabut/:id` | W | 60, 120 |
| `GET /api/sippa/lapangan/saya` | K | tidak (tebakan salah dihitung `pemegangKode`, > 300 per jam per hash IP = 429) |
| `POST /api/sippa/lapangan/kirim` | K | 120 per tugas |
| `POST /api/sippa/lapangan/foto` | K | 60 per tugas |
| `GET /api/sippa/foto/:id` | B (wilayah dari `sippa_foto.prov`) | tidak |
| `GET /api/sippa/log`; `GET /api/sippa/log.csv`; `GET /api/sippa/probe.csv`; `POST /api/sippa/log` | B; B; B; W | tidak; 60; 60; 600 |
| `GET /api/sippa/jalan-cek`; `POST /api/sippa/jalan-cek`; `POST /api/sippa/aoi` | B; W; W | tidak; 600; 120 |
| `GET /api/sippa/ab`; `POST /api/sippa/ab/unggah`; `POST /api/sippa/ab-status/:id`; `GET /api/sippa/ab.csv` | B; W; M; B | tidak; 20; 20; 60 |
| `GET /api/sippa/skenario`; `POST /api/sippa/skenario`; `POST /api/sippa/skenario-hapus/:id` | B; W; W pembuat atau M | tidak; 120; 120 |
| `GET /api/sippa/laporan`; `POST /api/sippa/laporan`; `GET /api/sippa/laporan-berkas/:id` | B; W; B | tidak; 30; tidak |
| `POST /api/sippa/telemetri` | D | 120 pesan per pengirim (dihitung dari baris `sippa_telemetri`, tanpa tulisan tambahan) |
| `GET /api/sippa/telemetri`, `GET /api/sippa/perangkat`, `GET /api/sippa/alarm` | B | tidak |
| `POST /api/sippa/perangkat`; `POST /api/sippa/perangkat-cabut/:id`; `POST /api/sippa/alarm-tutup/:id` | M; M; W | 60; 60; 600 |
| `GET /api/sippa/aset`, `GET /api/sippa/aset/:id` (keputusan 56) | B (saring wilayah dari `prov`) | tidak |
| `POST /api/sippa/aset`; `POST /api/sippa/aset/:id` (status, pemelihara, atribut, rujukan) | W | 120; 600 |
| `POST /api/sippa/inspeksi` | W; K hanya lewat `lapangan/kirim` butir `inspeksi` jenis pra-gelar/pasca-gelar untuk komponen kit tugasnya | 600 |
| `GET /api/sippa/pelihara`; `GET /api/sippa/pelihara.csv` | B | tidak; 60 |
| `GET /api/sippa/stok`; `POST /api/sippa/stok` | B; W | tidak; 600 |
| `POST /api/sippa/dummy/isi`, `POST /api/sippa/dummy/hapus` | SA | 30 |

Tabel 0056–0059 belum ada = semua rute `/api/sippa/*` yang memakainya menjawab 503 sopan "Migrasi SIPPA belum diterapkan di basis data" (`bungkusSippa`), dan rute lain repo tidak terganggu. Semua jawaban galat memakai `gagal(status, pesan)`.

### 9.8 Akses, peran, keamanan, privasi

- **Pola admin yang ada (keputusan 36).** Tidak ada sistem akun baru. `src/admin_halaman.js`: `HAL.pipa = ["💧", "SIPPA"]`, `HALAMAN_STAF.pipa = ["pusdalops", "koordalops", "pimpinan"]`. `src/sippa.js`: `P_SIPPA_BACA = ["pusdalops", "koordalops", "pimpinan"]`, `P_SIPPA_TULIS = ["pusdalops", "koordalops"]`, dicek dengan `stafOK(env, req, peran)` (admin atau sesi staf berperan). `tests/warga/staf_halaman.test.mjs` menjaga kesamaan `HALAMAN_STAF.pipa` dengan `P_SIPPA_BACA`.
- **Hanya staf BNPB (keputusan 32).** Cangkang, data R2, dan semua API di balik sesi. Satu-satunya pintu tanpa akun adalah kode penugasan operator, yang hanya bisa menulis log, probe, BBM, foto, dan gerak terbatas untuk kit tugasnya, dan hanya membaca tugasnya sendiri. Kode kedaluwarsa paling lama 30 hari dan bisa dicabut kapan saja.
- **CSP.** `CSP_SIPPA` = `CSP_ADMIN` dengan `img-src 'self' data: blob: https://*.openfreemap.org`, `connect-src 'self' https://*.openfreemap.org`, ditambah `worker-src 'self' blob:` (MapLibre dan Web Worker Studio); tanpa `'unsafe-inline'`. `/pipa/lapangan` memakai `CSP_LAPANGAN` yang sama dengan `/lapangan` (diekspor dari `src/posko.js`); `/api/sippa/lapangan/*` sama asal. Cangkang tidak berupa berkas `.html` di `public/` (DESAIN-TEKNIS ADR-12). Tidak ada skrip CDN; Three.js, MapLibre, jsPDF, dan QR dari `public/vendor/`.
- **Masukan dan keluaran.** Semua teks dari data disisipkan lewat `textContent` atau `esc()`, tidak pernah `innerHTML` dengan data; CSV keluaran diberi awalan `'` untuk sel berawalan `= + - @`; unggahan CSV diurai sebagai teks, tanpa evaluasi; kunci R2 selalu dibuat server; SQL selalu `bind`.
- **Privasi.** Tidak menyimpan NIK, nomor WA, atau nama perorangan operator: yang disimpan nama regu dan unsur. Foto dibersihkan EXIF-nya (`bersihMedia`). Koordinat log disimpan presisi penuh karena hanya terbaca staf; CSV ekspor untuk pihak luar (evaluator) membulatkan koordinat ke 0,01 derajat (sekitar 1 km), pola `/api/pipa/lapangan`. Nama perusahaan konsesi tidak pernah tampil di layar maupun laporan (keputusan 50), cukup status lahan `konsesi`. Token perangkat dan kode penugasan hanya disimpan sha256-nya. Data SIPPA tidak ikut `/api/v1` mitra dan tidak masuk `llms.txt`.
- **Pengulas wajib:** `guard-api` (metode, hak, validasi, batas laju tiap rute di tabel §9.7.3) dan `security-reviewer` (kode penugasan, unggah foto dan CSV, token perangkat, CSP, XSS, privasi).

### 9.9 Form lapangan luring (`/pipa/lapangan`)

Keputusan 37: form bekerja tanpa sinyal dan mengirim saat ada sinyal. Pola `public/lapangan.js` + `public/sw-lapangan.js` dipakai ulang, bukan ditulis ulang.

- **Service worker.** `public/sw-lapangan.js` (sudah didaftarkan untuk scope `/lapangan` dan `/lacak`) didaftarkan sekali lagi untuk scope `/pipa/lapangan`; `JALUR_API` dan `KUNCI_KREDENSIAL` ditambah `"/api/sippa/lapangan/saya": "x-kode"`, `HALAMAN` ditambah `/pipa/lapangan`, `VERSI` naik ke 3, dan penentuan halaman dari scope diganti peta jalur (scope `/pipa/lapangan` juga berakhiran `/lapangan`, sehingga kode lama akan memasang cangkang form regu Posko; DESAIN-TEKNIS §6.1.1). Kiriman (POST) tetap tidak disentuh service worker.
- **Antrean.** IndexedDB `sippa-antre` (satu store butir teks, satu store foto sebagai Blob), dengan pembungkus kecil di `public/pipa/antre.js`; bila IndexedDB gagal, butir teks jatuh ke `localStorage` (foto tidak diantre, pesan "foto tidak bisa disimpan luring di peramban ini"). Kirim otomatis saat halaman dibuka, saat peristiwa `online`, dan tiap 60 detik selama halaman terbuka; tombol "Kirim sekarang". Background Sync tidak diandalkan karena tidak tersedia di semua ponsel.
- **Masuk.** Operator membuka tautan `#k=<kode>` atau memindai QR; kode disimpan di `localStorage` per perangkat dan dihapus fragmennya dari alamat. Tombol "Keluar dari tugas" menghapus kode dan antrean yang sudah terkirim.
- **Alur layar (ponsel, satu tangan, tombol ≥ 56 px, kontras tinggi untuk siang terik):**
  1. **Tugas:** nama regu, kit (kode), kompleks tujuan, berlaku sampai; status antrean ("3 isian menunggu sinyal"); tombol besar "Mulai sesi gelar", "Catat probe", "Catat BBM", "Pindah kit", "Pindai QR".
  2. **Sesi gelar:** pilih jenis (Karhutla, Banjir, Latihan) dan kelas medan (I jalan 4x4 + gambut dangkal; II darat + sungai + gambut sedang; III perahu/portage + gambut dalam, dengan satu kalimat penjelasan per kelas). Enam tombol stopwatch berurutan: **Tiba**, **Mulai gelar**, **Air mengalir**, **Mulai injeksi**, **Selesai**, **Bongkar selesai**. Tiap ketukan menyimpan waktu perangkat dan, bila diizinkan, posisi GPS; tombol berikutnya baru aktif setelah yang sebelumnya; waktu bisa dikoreksi dengan alasan wajib (tercatat sebagai `koreksi`).
  3. **Angka sesi:** kode petak, air sampai ujung lance (ya/tidak), tekanan ujung (bar) dan lama bertahan ≥ 2 bar (menit) dengan sumber gauge atau operator, kecelakaan (ya/tidak), lama henti karena bocor (menit) (medan vonis keputusan 53); panjang trase (m), jumlah orang, jam pompa (terisi otomatis dari air mengalir sampai selesai, bisa diubah), BBM (L), totalizer awal dan akhir (m3, selisih jadi `air_m3`), untuk banjir: m3 terpompa; catatan; foto opsional.
  4. **Probe:** kode petak, kode titik, tahap (sebelum, sesudah injeksi, 24 jam, 72 jam, 7, 30, 90 hari), suhu per kedalaman 10/30/50/100 cm (150, 300, 400, 500 cm hanya muncul bila tugas `lengan_dalam = 1`), papan angka besar; nilai > 50 °C diberi tanda "belum dingin" (ambang usulan A2, bukan standar pemerintah).
  5. **BBM:** terima, keluar, kembali, koreksi; liter; tiket (pola `inventori_bbm.py`, input manusia, tidak otomatis).
  6. **Pindah kit:** pilih alasan (gelar, bongkar, kembali), lokasi otomatis dari GPS atau ketik; untuk pindah ke daerah banjir, staf yang mencatat (W), operator hanya mengonfirmasi tiba.
- **Validasi klien = validasi server.** Satu daftar medan dan batas di `public/pipa/formulir.js` (ES module tanpa DOM) dipakai form, diimpor langsung oleh `src/sippa.js` untuk rute `POST /api/sippa/lapangan/kirim` (pola `worker.js` mengimpor `../public/informasi_jenis.js`; tidak ada salinan `src/sippa_formulir.js`, DESAIN-TEKNIS ADR-03), dan dibaca pembangkit formulir kertas G3-lite `kajian/bangun/sippa_formulir.py` (`kajian/pipa/formulir/G3-lite.pdf`), sehingga kertas dan layar tidak pernah berbeda.
- **Konflik dan ganda.** ID butir dibuat klien (UUID v4); server `INSERT ... ON CONFLICT(id) DO NOTHING` (pelanggaran CHECK menjadi `ditolak`, tidak hilang diam-diam); jawaban server memberi `diterima`, `ganda`, `ditolak`, `jam_server`; butir ditolak tetap di antrean dengan alasan dan tombol "Perbaiki". Foto hanya JPEG atau WebP (PNG ditolak dengan pesan jelas, DESAIN-TEKNIS ADR-09).
- **Selisih jam.** Klien mengirim `jam_kirim` (jam perangkat saat kirim). Server mengisi kolom `jam_klien_meleset = 1` untuk semua butir kiriman itu bila |`jam_kirim` − jam server| > 10 menit, dan untuk butir mana pun yang `waktu_klien`-nya lebih dari 10 menit di depan jam server; butir tetap diterima dan rekap time-motion menampilkannya terpisah. Butir yang lama mengantre luring (waktu jauh di belakang) bukan meleset (DESAIN-TEKNIS §6.1.5).

### 9.10 Laporan PDF otomatis (`/pipa/laporan`)

Keputusan 39. PDF dibuat di peramban dengan jsPDF yang sudah divendor (`public/vendor/jspdf/`) dan huruf Roboto (`public/inti/roboto.js`; Roboto hanya untuk PDF, layar tetap Inter dan Plus Jakarta Sans), pola `public/laporan_karhutla_deck.js` (bukan `public/laporan_bnpb.js`, yang memuat jsPDF dari CDN dan ditolak CSP staf; DESAIN-TEKNIS §6.4). "Otomatis" berarti isi laporan disusun dari data tanpa diketik: staf memilih jenis dan rentang, lalu satu tombol menghasilkan PDF, dan arsipnya tersimpan di R2 lewat `POST /api/sippa/laporan`. Pengingat mingguan adalah butir terhitung `sippa_mingguan` di Meja Pantau (tanpa tabel baru; tabel `pengingat` 0028 punya CHECK jenis tertutup, DESAIN-TEKNIS ADR-11): muncul Senin sejak 07.40 WIB bila ada kit berstatus `banjir` atau `gelar` dan belum ada laporan jenis `mingguan` dalam 7 hari terakhir.

| Templat | Rentang | Isi minimum |
| --- | --- | --- |
| Laporan pilot | pilot Okt 2026 | vonis "dapat dipakai" dari `vonisPilot` dengan tujuh butir keputusan 53 beserta nilai dan alasan tiap butir, dipisah dari vonis "lebih baik" (tidak diputus dari pilot, n < 8 per lengan), sesi gelar dan durasi per tahap, probe sebelum dan 24 jam per petak, air dan BBM, foto terpilih, kendala, keputusan yang diminta (lanjut banjir atau tidak), pil "pilot, n kecil" |
| Laporan kejadian | satu sesi gelar atau satu tugas | lokasi (kab, kompleks), kit, regu, garis waktu tahap, angka sesi, probe, BBM, CO2 BBM, foto |
| Laporan mingguan | 7 hari | gerak kit, jam pompa dan m3 banjir per kit dan kabupaten, BBM, kehilangan komponen, alarm telemetri, tugas aktif |
| Laporan musim | satu musim per provinsi | jumlah gelar per kelas medan dan p50/p90, ringkasan A/B per lengan (pil hipotesis), pemakaian ganda banjir (U9), kehilangan (U8), latihan G6, pelajaran, status gerbang G0–G6 |
| Laporan skenario | satu atau beberapa skenario Studio | matriks banding, gerbang, BOQ ringkas, NPV/BCR tiga skenario manfaat, Monte Carlo, batas alat (G22, G23) |

Aturan isi (dijaga `tests/sippa/laporan_isi.test.mjs` pada fungsi murni `isiLaporan(jenis, data)` yang mengembalikan blok terstruktur sebelum dirender): hanya logo BNPB; tiap angka dengan sumber dan waktu; pil keyakinan; tanpa kata "terbukti", tanpa em dash, tanpa titik tengah (U+00B7); nama berkas `sippa-<jenis>-<prov>-<YYYYMMDD>.pdf`; kaki halaman "Dibuat otomatis dari data SIPPA per <waktu WIB>. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang."

### 9.11 Telemetri

Keputusan 38: kerangka siap menerima data sensor sekarang, walau sensor baru dipasang 2027 (§6.6). Tag perangkat identik dengan P&ID SIPPA-G-02 dan BOM §6.1.

**Tabel (`0058_sippa_telemetri.sql`, SQL mengikat di DESAIN-TEKNIS §3.4):**

| Tabel | Kolom pokok |
| --- | --- |
| `sippa_perangkat` | `id`; `kit_id`; `tag` (PT-101, PT-102, PT-201, FT-101, LT-101, T-101 s.d. T-108, GWT-101, CO-101, PM-101, BBM-101, RPM-101, GPS-101); `tag_datar` (kunci bentuk datar paket pemilik); `jenis` (`gateway`, `tekanan`, `debit`, `level`, `suhu_gambut`, `muka_air_tanah`, `co`, `pm25`, `bbm`, `rpm`, `posisi`); `satuan`; `kedalaman_cm`; `min_sah`, `maks_sah`; `interval_s`; `token_sha` (wajib untuk gateway, boleh null untuk sensor di belakang gateway); `aktif`; `dibuat`; `dummy`; `UNIQUE (kit_id, tag)` |
| `sippa_telemetri` | satu baris per pesan: `id` (32 heks sha256 token + badan; kirim ulang = diabaikan), `pengirim_id`, `kit_id`, `diterima`, `t_awal`, `t_akhir`, `n` (1–500), `n_mutu2`, `bacaan` (larik JSON `[tag, t_ms, nilai, mutu, kedalaman_cm]`; mutu 0 baik, 1 diragukan, 2 di luar rentang sah), `dummy` |
| `sippa_telemetri_harian` | `perangkat_id`, `hari` (YYYY-MM-DD WIB), `n`, `min`, `maks`, `rerata`, `n_mutu2`, `dummy`; `PRIMARY KEY (perangkat_id, hari)` |
| `sippa_alarm` | `id`; `perangkat_id`; `kit_id`; `kode` (`hisap_rendah`, `debit_rendah`, `dry_run`, `tekanan_lebih`, `belum_dingin`, `co_tinggi`, `bbm_rendah`, `diam`); `nilai`; `ambang`; `mulai`; `ditutup`; `ditutup_oleh`; `dummy`; satu alarm terbuka per (perangkat, kode) |

**Pesan masuk** (`POST /api/sippa/telemetri`, satu perangkat atau gateway per token):

```
{"kit": "SIPPA-001", "dikirim": "2026-10-28T03:15:00Z", "sumber": "gateway",
 "bacaan": [{"tag": "PT-102", "waktu": "2026-10-28T03:14:55Z", "nilai": 4.8, "satuan": "bar"},
            {"tag": "T-103", "waktu": "2026-10-28T03:10:00Z", "nilai": 61.2, "satuan": "C", "kedalaman_cm": 50}]}
```

Bentuk datar paket pemilik (`{site_id, utc_time, PT102_bar, FT101_m3h, GWT01_m, T03_50cm_C, sensor_quality, source}`, baca-B 3d) diterjemahkan di gateway atau oleh fungsi `dariDatar()` di `src/sippa.js`, tidak disimpan dalam dua bentuk; kunci datar tanpa padanan `tag_datar` ditandai `tag_asing`. Validasi: token sah dan aktif (salah = 401; > 300 kegagalan per jam per hash IP = 429); paling banyak 120 pesan per jam per pengirim; tiap `tag` milik kit perangkat itu; `waktu` tidak lebih dari 5 menit di depan server dan tidak lebih tua dari 30 hari; satuan cocok; ≤ 500 bacaan dan ≤ 64 KB per pesan; nilai di luar `min_sah`–`maks_sah` disimpan dengan `mutu = 2`, bukan dibuang; pesan yang sama dikirim ulang dihitung `ganda`. Jawaban 202 `{diterima, ditandai, ganda}`.

**Alarm** (aturan dari sheet SENSOR pemilik, baca-B §2, semua ambang [asumsi-kebijakan] sampai G2): tekanan hisap di bawah batas NPSH kit; debit < 20% debit operasi selama pompa hidup (RPM > 0) lebih dari 2 menit; dry-run (debit 0 dan RPM > 0 selama 30 detik); tekanan buang > 0,88 x PN x f_suhu; suhu gambut > 50 °C pada tahap 24 jam atau sesudahnya; CO > 35 ppm rata-rata 15 menit [asumsi, ambang K3 ditetapkan SOP-03]; BBM < 20%; perangkat diam > 3 x interval sampling. Alarm dibuka saat syarat terpenuhi dan ditutup otomatis saat pulih atau manual oleh staf; alarm aktif juga menjadi butir Meja Pantau `sippa_alarm` (detektor di `src/pantau.js`), bukan push baru.

**Penyimpanan dan kuota D1.** Satu tulisan per pesan (T-J): gateway bawaan mengirim tiap 60 detik, jadi 1.440 tulisan per kit per hari ditambah alarm; PT/FT 0,5–5 detik diringkas di gateway menjadi min/maks/rerata per menit [asumsi, ditinjau ulang sesudah G2]. Kuota tulis D1 akun gratis 100 rb baris per hari dipakai bersama seluruh situs; 81 kit bertelemetri = 117 rb tulisan per hari, sehingga sebelum lebih dari 30 kit terpasang sensor harus dipilih paket D1 berbayar atau interval 5 menit (T-K). Pesan mentah disimpan 30 hari, lalu diringkas ke `sippa_telemetri_harian` dan dihapus oleh tugas bersih-bersih cron menit 17 yang sudah ada (tanpa jadwal cron baru; batas 5 jadwal akun Free).

**Layar (`/pipa/telemetri`):** tabel perangkat (tag, kit, jenis, terakhir terlihat, nilai terakhir, mutu), grafik garis 24 jam per tag terpilih (dengan garis ambang), daftar alarm aktif dan riwayat. Sebelum ada sensor: keadaan kosong "Belum ada perangkat terdaftar. Telemetri dipasang mulai 2027 (§6.6)."

### 9.12 Pemilik berkas, pengulas, dan uji

#### 9.12.1 Pemilik berkas (AGENTS.md §2) dan agent baru

`node scripts/agents/ilmu.mjs pemilik public/pipa/index.html` menjawab "tanpa pemilik", dan kerja `public/pipa/**` akan berulang sampai 2030. Sesuai AGENTS.md §1.5 (berkas tanpa pemilik + kelas kerja berulang), diusulkan agent baru **`sippa`** lewat satu entri di `scripts/agents/roster.json` (`kelas: "pengerja"`, `model: "sonnet"`, `milik: ["public/pipa/**", "tests/sippa/**"]` (tanpa `docs/sippa/**`, YAGNI), `larangan`: tidak menyentuh worker/D1, tidak deploy, tidak commit, tidak melonggarkan gerbang), lalu `npm run agents:build`, lalu `.claude/ilmu-agent/sippa.md` diisi dari kode nyata, baris baru di AGENTS.md §2 (modul "SIPPA `/pipa`"). Entri roster dan AGENTS.md dikerjakan `mekanik-mesin` (TIKET SP-003; entri persis di DESAIN-TEKNIS §2.2). Penulisan naskah buku sudah berulang kali jatuh ke `general-purpose`, jadi dengan otoritas yang sama dibuat juga agent **`penulis-kajian`** (`milik: ["data/kajian-bnpb/naskah/**"]`, glob paling spesifik menang atas `data/**` milik `pipa-data`; DESAIN-TEKNIS §2.3, TIKET SP-085).

| Berkas | Pemilik | Pengulas wajib |
| --- | --- | --- |
| `src/sippa.js`, perubahan `src/worker.js`, `src/admin_halaman.js`, `src/posko.js` (ekspor `CSP_LAPANGAN`), `src/pantau.js`, `public/admin/pantau.js` | `warga-api` | `guard-api`, `security-reviewer` |
| `migrations/0056_sippa_inti.sql`, `0057_sippa_ab_skenario.sql`, `0058_sippa_telemetri.sql`, `0059_sippa_aset_pelihara.sql` | `warga-api` | `migrasi-idempoten` |
| `tests/warga/sippa*.test.mjs`, `tests/warga/cakupan.json`, `migrasi_beku.json` | `warga-api` | `penulis-gerbang` (bentuk uji) |
| `public/pipa/**` (app, layar, hitung, pelihara, studio_mesin, studio_pekerja, adegan, antre, formulir, keadaan, batas, ikon, css) | `sippa` (baru) | `inp-reviewer`, `selera-angka`, `security-reviewer` (penyisipan HTML) |
| `public/sw-lapangan.js` (tambahan scope) | `layar-peta` | `inp-reviewer`, `security-reviewer` |
| `public/vendor/three/**`, `public/vendor/qrcode/**` | `layar-peta` | `higiene-repo` (lisensi, ukuran) |
| `scripts/data/sippa/*.py` (termasuk `cat.py`, `jembatan.py` dari keputusan 56), `data/sippa/keluaran/*.json`, `data/kajian-bnpb/**` kecuali naskah | `pipa-data` | `validasi-model` (zona, pemicu, respons, angka jembatan dan CAT) |
| `data/kajian-bnpb/naskah/**` (bukti, naskah, depan, lampiran tertulis, `deck.json`) | `penulis-kajian` (baru) | penyunting agent lain, `validasi-model`, `selera-angka` |
| langkah `data.yml` (skrip SIPPA, unggah R2) | `mekanik-mesin` | `higiene-repo` |
| `tests/sippa/**` | `sippa` (baru) | `penulis-gerbang` |
| `scripts/agents/roster.json`, AGENTS.md, `.github/workflows/terbit.yml` (langkah `uji:sippa`) | `mekanik-mesin` | `higiene-repo` |

#### 9.12.2 Uji per lapisan (TEST.md: letak logika menentukan lapisan)

| Logika di | Uji | Berkas | Yang dibuktikan (termasuk yang salah DITOLAK) |
| --- | --- | --- | --- |
| fungsi murni JS | unit `node:test` + `vm` | `tests/sippa/hitung.test.mjs` | nilai acuan §9.3 dan DESAIN-TEKNIS §5.8 (tanda `hisap` eksplisit); gerbang: OD160 NO-GO, sisa < 1 bar NO-GO, 600 L/min dengan 8 lance NO-GO H-SERAP dan bawaan 300 L/min lolos, kedalaman 5,1 m ditolak; zona tepat di ambang (2,5 km atau 5,0 km = jauh, aturan "<", keputusan 51); `vonisPilot` tiga kasus V1–V3; `saranSarana` enam aturan; `matriksRespons` empat tingkat; `kuantil` sama dengan nilai numpy; `bandingRerata` cocok dengan contoh hitung tangan; n < 8 = belum bisa diputus; NPV/BCR/impas cocok dengan baca-C (impas semi Rp3,19 M) |
| fungsi pemeliharaan JS (keputusan 56) | unit `node:test` | `tests/sippa/pelihara.test.mjs` | tiap awalan `TEMPLAT_BOM` tepat satu kelas; `jadwal` memberi terlambat, segera, aman, belum pernah pada batas hari dan batas 50 jam; `skorKeKondisi` sama dengan enum CHECK 0056 (dibaca dari berkas SQL); `cekAset` menolak sumur zona `kritis` tanpa `rekomendasi_bg` dan menerima zona `aman`; `stokMin` contoh hitung tangan; rata-rata tertimbang laju kit dalam 5–8% |
| mesin Studio | unit | `tests/sippa/studio_mesin.test.mjs` | angka jalan-ulang baca-C C1.4 (toleransi 0,5%); `gerbangSippa` tidak pernah mengurangi hambatan keras; MC deterministik untuk keadaan sama |
| logika 3D, laporan, formulir | unit | `tests/sippa/adegan_logika.test.mjs`, `laporan_isi.test.mjs`, `formulir.test.mjs` | §9.6, §9.10; batas medan `formulir.js` = CHECK migrasi 0056 (dibaca dari berkas SQL) dan = medan kertas G3-lite |
| kembar JS–Python | unit (memanggil `python3 -I`) | `tests/sippa/kembar.test.mjs` | `hitung.js` dan `scripts/data/sippa/*.py` memberi hasil sama (toleransi 1%) untuk semua kasus `acuan.json` |
| skrip Python | self-check `__main__` | `scripts/data/sippa/zona.py`, `pemicu.py`, `nasional.py`, `respons.py`, `hidraulika.py`, `sel22.py` | `zona.py` mereproduksi tiga versi dengan `<`: A188/B418/C89/D170 (`kendala.json`), A198/B429/C81/D157 (jalan utama OSM), A469/B158/C167/D71 (semua jalan OSM) (invarian: jumlah zona = 865, tiap kompleks tepat satu zona per versi); `pemicu.py`: tingkat tidak naik bila data ansambel basi; `nasional.py`: total 81 dan 56 gambut dari `luas_resmi.json` saat ini, porsi tiap provinsi ≥ 0 |
| skema D1 (CHECK, trigger) | SQL langsung di `node:sqlite` dengan migrasi apa adanya, tiap uji dibungkus `BEGIN … ROLLBACK` oleh runner (RENCANA-UJI §1.2, §3); rute tetap di Miniflare | `tests/warga/sippa_skema.test.mjs` | migrasi dijalankan dua kali tanpa galat (idempoten); CHECK 0059 menolak kelas aset liar, aset tanpa `pemilik_aset`, sumur zona `rusak` tanpa `rekomendasi_bg`, skor 4, uji `mutu_air` tanpa `e_coli_cfu`, delta stok 0; trigger 0059 menolak UPDATE/DELETE `sippa_inspeksi` dan `sippa_stok_gerak` nyata dan saldo stok negatif, dan mengisi `sippa_komponen.kondisi`; CHECK menolak status kit liar, kedalaman probe 600 cm, suhu 1.000 °C, surfaktan > 0 di lengan bukan surfaktan, state skenario bukan JSON, berakhir tugas > 30 hari; trigger menolak UPDATE/DELETE `sippa_gerak`, `sippa_log_gelar`, `sippa_bbm` (kecuali hapus dummy), transisi status tidak sah, gerak saat rencana masih terbuka, dan urutan waktu log terbalik; id pesan telemetri ganda diabaikan |
| rute dan hak | integrasi rute (panggil handler worker di Miniflare, bukan mock klien) | `tests/warga/sippa.test.mjs` | matriks hak: tamu 303 ke `/admin/pantau?ke=` di halaman dan 401 di API; staf `verifikator` 403; `pimpinan` POST 403; perencana tulis 201; kode penugasan salah 403 dan dihitung, > 300/jam 429, dicabut 403, kedaluwarsa 403; kode hanya bisa menggerakkan kit tugasnya; `/api/sippa/data/<nama>` tamu tidak tahu berkas ada (401 identik untuk ada dan tidak ada); kirim lapangan dua kali = satu baris; badan 300 KB = 413; CSV satu baris salah = 400 dengan nomor baris dan 0 baris tersimpan; sha berkas sama = 409; telemetri token salah 401, nilai di luar rentang tersimpan mutu 2, waktu 6 menit di depan ditolak, pesan ke-121 dalam sejam 429; laju hanya di rute tulis; staf berwilayah 61 tidak melihat kit 62; staf nyata tidak melihat dummy; tanpa migrasi = 503 sopan |
| alur lintas-tabel | satu uji ujung ke ujung | `tests/warga/sippa_alur.test.mjs` | Admin membuat kit → perencana menugaskan (kode) → operator kirim log gelar luring (sesi lengkap 6 tahap) + probe sebelum dan 24 jam + BBM → gerak `gelar` lalu `kembali` → staf memindah kit `pindah_banjir` (YonTP, ETA) → operator konfirmasi tiba → log banjir dengan m3 → kembali ke gudang → cek komponen dengan satu hilang → rekap log memuat sesi itu, kehilangan musim = 1/n, laporan mingguan `isiLaporan` memuat jam pompa, m3 banjir, dan kehilangan yang sama persis dengan tabel; tiap langkah tercatat di `pantau_jejak` |
| registri cakupan | gerbang tanpa basis data | `tests/warga/cakupan.json` (sudah ada) | tiap rute baru §9.7.3 dan tiap tabel/trigger 0056–0058 ada di `diuji` atau `dikecualikan` (dengan alasan); `antre` tidak bertambah |
| gerbang SIPPA | gerbang tanpa basis data | `tests/sippa/gerbang-sippa.test.mjs` | (1) tidak ada "terbukti" di `public/pipa/**` dan templat laporan; (2) tidak ada em dash atau titik tengah (U+00B7) di teks antarmuka; (3) batas kedalaman 5 m tertulis di satu konstanta dan dipakai kalkulator, Studio, 3D, formulir; (4) tidak ada `toFixed(` di teks tampil `public/pipa/**` (pakai `fmt`); (5) tidak ada URL CDN di `public/pipa/**`; (6) tiap handler `click`/`input` di `public/pipa/layar_*.js` yang memanggil fungsi gambar berat terdaftar memanggilnya lewat `nanti(` (daftar fungsi berat di gerbang, diperiksa per handler, bukan per berkas, sesuai INP.md) |

Perintah bukti: `npm run uji:warga` (memuat `tests/warga/sippa*.test.mjs`), `node --test tests/sippa/*.test.mjs` (skrip baru `"uji:sippa"` di `package.json` oleh `mekanik-mesin`, dirangkai ke `npm run uji`), `npm run uji:agen`, `python3 scripts/data/sippa/<skrip>.py uji` (self-check). Gerbang lengkap dan kriteria terima per fitur di RENCANA-UJI. Uji yang menyentuh D1 sungguhan jalan di `uji:warga` seperti uji worker lain; tidak ada workflow CI baru tiap push (TEST.md butir 4).

### 9.13 INP dan aksesibilitas

- **INP (`~/.claude/INP.md`, buku pegangan "Interaksi").** Chrome kontrol (pil aktif, `aria-pressed`, `aria-selected`, `aria-expanded`) diubah langsung di handler; kerja berat (gambar ulang grafik, filter peta, tabel besar, Monte Carlo) lewat `nanti()` dari `public/inti/nanti.js` atau Web Worker. Sakelar peta hanya `setLayoutProperty`/`setFilter`, tidak membuat ulang sumber. Tabel dipaginasi 50 baris. Modul layar dimuat malas. Target: tidak ada interaksi > 200 ms di laptop uji (U10), form lapangan < 100 ms di ponsel kelas menengah (halaman bertoken adalah wilayah paling ketat menurut INP.md). Pengulas `inp-reviewer` untuk tiap perubahan handler.
- **Aksesibilitas (WCAG 2.2 AA).** `lang="id"`; kontras dari token tema (diperiksa terang dan gelap); fokus terlihat; semua kontrol bisa dipakai papan ketik (segmen sebagai `role="radiogroup"`, akordeon dengan `aria-expanded`, tab dengan `role="tablist"`); peta punya daftar alternatif yang lengkap; adegan 3D punya panel teks berisi angka yang sama; warna zona selalu disertai pola dan huruf A–D; isian form punya `<label>` dan pesan galat dihubungkan `aria-describedby`; target sentuh ≥ 44 px (form lapangan ≥ 56 px); `prefers-reduced-motion` dihormati; pesan status antrean memakai `aria-live="polite"`.

### 9.14 Data dummy

Mengikuti `~/.claude/DUMMY.md`: dua ikon Super Admin di tempat yang sama di tiap layar `/pipa` (🧪 isi untuk layar yang sedang dibuka, 🧹 hapus seluruh dummy SIPPA), rantai pengisi sebagai tabel keputusan di `src/sippa.js` (`RANTAI_DUMMY[layar] = [pengisi hulu ke hilir]`), semua baris `dummy = 1`, muat ulang penuh sesudah isi dan hapus.

| Layar | Rantai pengisi (hulu ke hilir) | Catatan agar layar tidak kosong atau nol palsu |
| --- | --- | --- |
| Ringkas | kit → gerak → log → alarm | semua kartu berangka |
| Peta | jalan_cek → aoi_usul | data kelayakan sendiri dari R2 (bukan dummy); cek jalan dibuat untuk 10 kompleks B sehingga versi Terverifikasi berbeda dari Konservatif |
| Kit | kit (`SIPPA-901` s.d. `SIPPA-907`, satu per status `gudang`, `depot`, `gelar`, `banjir`, `servis`, `hilang`, `pensiun`; kode 900–999 dijaga CHECK hanya untuk dummy) → komponen → tugas → gerak (termasuk satu rencana belum tiba, satu antar-provinsi) → bbm | satu komponen hilang agar persen kehilangan bukan nol |
| Log | kit → tugas → log (≥ 6 per kelas I, 3 kelas II, 1 kelas III; jenis karhutla, banjir, latihan) → probe | durasi berbeda-beda; satu log `jam_klien_meleset` |
| A/B | ab_unggah → petak (lengan dengan n dan hasil berbeda: lance n = 10 lebih baik, surfaktan n = 6, sekat n = 8 setara) | KELAS B DUMMY.md: lengan tidak pernah disamakan, sehingga ketiga vonis (LULUS, TIDAK LULUS, BELUM BISA DIPUTUS) muncul |
| Studio | skenario (3) | |
| Telemetri | kit → perangkat (PT-102, FT-101, T-103) → telemetri 24 jam → harian → alarm (satu aktif, satu ditutup) | |
| Laporan | semua di atas → laporan (arsip 2) | |
| Pemeliharaan (keputusan 56) | kit → komponen → log (jam pompa) → aset → inspeksi (butir terlambat, segera, aman, belum pernah; satu komponen K1 skor 2) → stok_gerak (satu kode di bawah minimum) | keempat status jadwal dan pil "tidak laik gelar" muncul; biaya per tahun bukan nol |
| Air tanah | aset `sumur_bor` (AS-9001 s.d. AS-9006: zona aman, rawan, kritis dengan rekomendasi Badan Geologi) → inspeksi `mutu_air` (satu lolos, satu gagal E. coli, satu belum diuji) | pil "tidak laik minum" dan "belum diuji" muncul; `cat.json` dari R2, bukan dummy |
| Akses | aset `jembatan_darurat` (satu dengan rencana ganti, satu tanpa) dan `jembatan_permanen` (dua sumber program berbeda) → inspeksi | pil "tanpa jadwal ganti" muncul; `jembatan_dibi.json` dan `program_jembatan.json` dari R2, bukan dummy |

Uji `tests/warga/sippa.test.mjs` memanggil `POST /api/sippa/dummy/isi?layar=<tiap layar>` lalu endpoint yang menyuapi layar itu dan memastikan tiap kolom angka bukan nol; `hapus` lalu memastikan nol baris dummy tersisa dan baris nyata tidak tersentuh.

---

## 10. Rencana kerja eksekusi

Hari ke-0 = Minggu 25 Oktober 2026. Buku dan web dikerjakan paralel setelah PRD disetujui (keputusan 46). Prioritas minggu ini adalah apa pun yang dibutuhkan pilot lapangan 28 Oktober–1 November; sisanya mengalir sesudahnya. Tiap tugas dibuka dengan gerbang konteks AGENTS.md §0 (`ilmu.mjs pemilik`, `ilmu.mjs baca`) dan kontrak CAKUPAN, DI LUAR, BUKTI SIAP.

### 10.1 Tugas prioritas P0: siap pilot (25–27 Okt)

| ID | Tugas | Pengerja | Model | Bergantung pada | Paralel dengan | Selesai bila (definisi selesai) | Bukti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Persetujuan PRD, jawaban T-B (lokasi, tanggal, alat) dan T-C (pemilik pompa) | pemilik | | | | pemilik menyetujui di sesi | catatan sesi |
| P0-02 | Kontrak kerja dan rakitan armada untuk P0 (siapa mengerjakan, siapa memeriksa) | sesi induk | opus | P0-01 | | rakitan tertulis di `ilmu.mjs kasus orkestrator` | `node scripts/agents/ilmu.mjs baca orkestrator` |
| P0-03 | Agent baru `sippa`: entri roster, `agents:build`, ilmu awal, baris AGENTS.md §2, skrip `uji:sippa` di `package.json` dan di `terbit.yml` | `mekanik-mesin` | sonnet | P0-02 | P0-04, P0-06 | katalog segar, tiap berkas `public/pipa/**` dan `tests/sippa/**` punya tepat satu pemilik | `npm run uji:agen` |
| P0-04 | `migrations/0056_sippa_inti.sql` + `tests/warga/sippa_skema.test.mjs` + entri `cakupan.json` | `warga-api` | sonnet | P0-02 | P0-03, P0-06 | semua CHECK/trigger §9.7.2 terbukti menolak yang salah; migrasi dijalankan dua kali tanpa galat | `node --test tests/warga/sippa_skema.test.mjs` |
| P0-05 | `src/sippa.js` P0: cangkang `/pipa` dan `/pipa/lapangan`, gerbang host (`pipa` di regex pengecualian; `PUBLIK_TANPA_SESI` tidak diubah), pengalihan tamu ke `/admin/pantau?ke=`, `/admin/pipa`, `HAL.pipa`, `HALAMAN_STAF.pipa`, rute kit, komponen, gerak, tugas, lapangan saya/kirim/foto, log GET/POST/CSV, dummy isi/hapus untuk Kit dan Log; `tests/warga/sippa.test.mjs` bagian P0 | `warga-api` | sonnet | P0-04 | P0-07 | matriks hak §9.12.2 bagian P0 hijau; kirim ulang idempoten; 503 sopan tanpa migrasi | `npm run uji:warga` |
| P0-06 | Formulir kertas G3-lite dan probe (PDF A4, medan sama dengan `formulir.js`), cadangan bila web terlambat | `pipa-data` | sonnet | P0-01 | P0-03, P0-04 | PDF tercetak satu halaman per sesi dan satu per petak probe; medan identik dengan daftar §9.9 | `kajian/pipa/formulir/G3-lite.pdf` diperiksa sesi induk |
| P0-07 | `public/pipa/` P0: `app.js`, `keadaan.js`, `formulir.js`, `antre.js`, `hitung.js` (kuantil, zona, hidraulika dasar), layar Lapangan, Kit (daftar, rincian, tugaskan, QR), Log (rekap p50/p90); vendor QR; tambahan scope `sw-lapangan.js`; `tests/sippa/hitung.test.mjs`, `formulir.test.mjs` | `sippa` (+ `layar-peta` untuk `sw-lapangan.js` dan vendor) | sonnet | P0-03, kontrak rute P0-05 | P0-05 | form lapangan jalan luring di ponsel uji (mode pesawat → isi → online → terkirim satu kali); QR terbaca `BarcodeDetector`; semua keadaan §9.2.1 tampil | `node --test tests/sippa/*.test.mjs`; uji tangan lewat `preview_start` mode ponsel |
| P0-08 | Tinjauan P0 paralel: `guard-api`, `migrasi-idempoten`, `selera-angka` (haiku); `security-reviewer`, `inp-reviewer` (sonnet). Pengulas melapor, pengerja membetulkan | pengulas | haiku/sonnet | P0-05, P0-07 | satu sama lain | nol temuan kritis terbuka | laporan pengulas |
| P0-09 | Deploy P0 (§10.6) dan uji asap produksi; buat kit `SIPPA-001` jenis `pinjam_pilot` dan kode penugasan untuk regu pilot | sesi induk | opus | P0-08 | | `/pipa/lapangan` terbuka di ponsel regu; satu kiriman uji tercatat lalu dihapus (dummy) | log deploy, `GET /api/sippa/log` |
| P0-10 | Pilot lapangan 2–3 sesi gelar (program) | Satgas, Manggala Agni, BPBD | | P0-06 (wajib), P0-09 (bila siap) | | formulir G3-lite atau web terisi untuk tiap sesi; vonis "dapat dipakai" 1 Nov | `/pipa/log`, kertas dipindai |

Bila P0-09 belum lolos uji pada 27 Okt malam, pilot memakai kertas (P0-06) dan isian dimasukkan staf lewat `POST /api/sippa/log` setelah deploy. Deploy tidak dipaksa demi jadwal (keputusan 49).

### 10.2 Tugas web P1–P3 (28 Okt–6 Des 2026)

| ID | Tugas | Pengerja | Model | Bergantung pada | Selesai bila | Bukti |
| --- | --- | --- | --- | --- | --- | --- |
| W-01 | Skrip `scripts/data/sippa/zona.py`, `sel22.py`, `nasional.py`, `respons.py`, `hidraulika.py`, `pemicu.py` + `data/sippa/keluaran/*.json` | `pipa-data` | sonnet | P0-02 | self-check mereproduksi A188/B418/C89/D170 dan A469/B158/C167/D71, 81 kit, nilai acuan | `python3 scripts/data/sippa/zona.py` (dan skrip lain) |
| W-02 | Tinjauan zona, pemicu, matriks respons | `validasi-model` | sonnet | W-01 | ambang berlabel, tidak ada klaim "diuji" | laporan |
| W-03 | Langkah `data.yml`: jalankan skrip SIPPA, unggah R2 `sippa/` | `mekanik-mesin` | sonnet | W-01 | berkas muncul di R2 setelah satu jalan manual (`workflow_dispatch`) | log Actions |
| W-04 | Rute `/api/sippa/data/:nama`, `jalan-cek`, `aoi`, `ringkas` | `warga-api` | sonnet | P0-05, W-03 | tamu tidak tahu berkas ada; cakupan terdaftar | `npm run uji:warga` |
| W-05 | Layar Ringkas, Peta (dua satuan, tiga versi zona, saran sarana, daftar alternatif), Hitung, Data | `sippa` | sonnet | W-04 | §9.4.1–9.4.3, §9.4.8; INP < 200 ms | `node --test tests/sippa/*.test.mjs`; `inp-reviewer` |
| W-06 | `0057_sippa_ab_skenario.sql` + rute A/B, skenario, laporan + uji | `warga-api` | sonnet | P0-04 | §9.7.2, §9.7.3; CSV satu baris salah = tolak semua | `npm run uji:warga` |
| W-07 | Layar A/B dan Laporan (templat pilot dulu, lalu kejadian, mingguan) | `sippa` | sonnet | W-06 | laporan pilot Okt terbit dari data nyata pada minggu 46 | `tests/sippa/laporan_isi.test.mjs` |
| W-08 | Studio: port mesin, `gerbangSippa`, Web Worker, tab Bandingkan semua, simpan D1 | `sippa` | sonnet | W-06 | angka jalan-ulang baca-C cocok 0,5%; gerbang hanya menambah | `node --test tests/sippa/studio_mesin.test.mjs` |
| W-09 | Pemicu (layar) dan rencana pra-posisi | `sippa` | sonnet | W-03, P0-05 | §9.4.4 | uji fungsi + tangan |
| W-10 | Vendor three 0.169.0 + layar 3D + uji logika | `layar-peta` (vendor), `sippa` (layar) | sonnet | W-05 | tiga adegan; tanpa WebGL jatuh ke SVG | `node --test tests/sippa/adegan_logika.test.mjs` |
| W-11 | `0058_sippa_telemetri.sql`, rute ingest, alarm, ringkas harian di cron menit 17, layar Telemetri | `warga-api`, `sippa` | sonnet | P0-04 | §9.11; token salah 401; mutu 2 tersimpan | `npm run uji:warga` |
| W-12 | Dummy semua layar + uji tiap kolom bukan nol | `warga-api` | sonnet | W-04–W-11 | §9.14 | `npm run uji:warga` |
| W-13 | Uji alur lintas-tabel `sippa_alur.test.mjs` dan gerbang `gerbang-sippa.test.mjs` | `penulis-gerbang` (bentuk), `warga-api`, `sippa` | sonnet | W-11 | §9.12.2 dua baris terakhir | `npm run uji` |
| W-14 | Sapuan tinjauan penuh sebelum rilis lengkap: `guard-api`, `migrasi-idempoten`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer` (sonnet) | pengulas | haiku/sonnet | W-13 | nol temuan kritis | laporan |
| W-15 | Deploy rilis lengkap | sesi induk | opus | W-14 | semua layar §9.1.1 tersedia di produksi (U5) | log deploy |

| W-16 | Skrip `scripts/data/sippa/cat.py`, `jembatan.py` + `cat.json`, `jembatan_dibi.json`, `program_jembatan.json`; unggah R2 di langkah `data.yml` yang ada (keputusan 56) | `pipa-data`, `mekanik-mesin` (langkah) | sonnet | W-03 | self-check: jembatan 2018–2025 = 3.833 dan 2025 = 1.088 dari `dibi/rekap_*` (sama dengan `rehab.dibi.*`); CAT tanpa angka tebakan | `python3 scripts/data/sippa/jembatan.py uji` |
| W-17 | `0059_sippa_aset_pelihara.sql` + uji skema | `warga-api` | sonnet | P0-04, W-11 | §9.7.2 baris 0059; CHECK dan trigger menolak yang salah | `npm run uji:warga` |
| W-18 | `public/pipa/pelihara.js` + `tests/sippa/pelihara.test.mjs` | `sippa` | sonnet | P0-07 | §6.10, §9.3; konstanta hanya di modul ini | `npm run uji:sippa` |
| W-19 | Rute aset, inspeksi, pelihara, stok, butir `inspeksi` di `lapangan/kirim`, 3 nama data baru, dummy tiga layar | `warga-api` | sonnet | W-17, W-18 | §9.7.3; wilayah, hak, laju; rantai dummy §9.14 | `npm run uji:warga` |
| W-20 | Layar Pemeliharaan, Air tanah, Akses, rincian aset | `sippa` | sonnet | W-16, W-19 | §9.4.9–§9.4.12; INP < 200 ms | `npm run uji:sippa`; `inp-reviewer` |
| W-21 | Tinjauan dan deploy R4 | pengulas, sesi induk | haiku/sonnet, opus | W-20 | nol temuan kritis; uji asap tiga layar baru | log deploy |

Urutan rilis: P1 (W-01–W-05) target 8 Nov; P2 (W-06–W-09) target 22 Nov; P3 (W-10–W-15) target 6 Des; R4 (W-16–W-21, keputusan 56) target 20 Des 2026 (T-Q). Rilis bertahap boleh dideploy tiap kali uji hijau.

### 10.3 Tugas buku dan deck (28 Okt–6 Des 2026)

Pipeline §8.4. Semua berkas di `data/kajian-bnpb/**` dimiliki `pipa-data`; tugas menulis dikerjakan sub-agent penulis dengan pengulas berbeda (AGENTS.md §3.2).

| ID | Tugas | Pengerja | Model | Bergantung pada | Paralel dengan | Selesai bila | Bukti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B-00 | Agent baru `penulis-kajian` (roster, `agents:build`, ilmu awal) sebelum naskah pertama | `mekanik-mesin` | sonnet | P0-02 | B-01 | `ilmu.mjs pemilik data/kajian-bnpb/naskah/sippa/bab-01.md` menjawab `penulis-kajian` | `npm run uji:agen` |
| B-01 | `tema.json` entri `kajian.sippa` (judul T-L, lampiran A–S, pustaka minimum 50; entri `kajian.rehab` tetap sebagai sumber), daftar kajian sah di `bangun/kontrak/naskah.py`, `bangun/docx/bangun.py`, `qa/periksa.py` dibaca dari `tema.json` (KERANGKA §8.1 M1–M5) | `pipa-data` | sonnet | P0-01 | P0 web | kontrak naskah menerima `kajian: sippa`; QA kajian lain tetap hijau | `cd data/kajian-bnpb/bangun/kontrak && python3 tema.py && python3 naskah.py`; `cd data/kajian-bnpb && .venv/bin/python qa/uji.py` |
| B-02 | Berkas bukti `naskah/sippa/bukti/bab-01..22.md` (empat kelompok paralel: bab 1–6, 7–11, 12–15 dari bahan `rehab`, 16–22) | `penulis-kajian` | sonnet | B-00, B-01 | B-03, B-04 | tiap bab punya Inti, Temuan bersumber, Inferensi, Celah, `.angka.json`, `.pustaka.json` | QA lapis 1 |
| B-03 | Paket data `kajian/data/sippa/` dan registri angka `kajian/bangun/sippa_angka.py` kunci `sippa.*` (tiga versi zona, jarak, DEM, GSW, MCD64A1, CHIRPS, VIIRS, kit, hidraulika) | `pipa-data` | sonnet | W-01 | B-02 | tiap angka berlabel keyakinan dan sumber; self-check | `.venv/bin/python bangun/pipa_data.py paket`; `.venv/bin/python bangun/sippa_angka.py uji` |
| B-04 | Pustaka: sumber KERANGKA §8.1 M8 dicek ke naskah asli dan ditambah ke `pustaka.json`; sumber berita ditandai | penulis riset (`penulis-kajian`) | sonnet | B-01 | B-02, B-03 | ≥ 50 sumber, separuh resmi/primer | `qa/periksa.py --kajian sippa` bagian pustaka |
| B-05 | Peta dan grafik buku: spek `bangun/visual/spek-sippa/sippa-01` s.d. `sippa-18` dan `sippa-p-<kode>` (KERANGKA §7.2), zona biru dan emas dengan huruf dan pola (keputusan 52) | `pipa-data` | sonnet | B-03 | B-06 | PNG 300 dpi di `kajian/gambar/sippa/` | render manifest; `qa/periksa.py --visual` |
| B-06 | Gambar teknik SIPPA-G-01 s.d. G-12 (`bangun/visual/teknik/*.mjs`, SVG ke PNG dan PDF A3) dengan blok pengesahan insinyur kosong | `pipa-data` | sonnet | P0-01 | B-02–B-05 | tiap gambar memenuhi kriteria terima §6.9 dan gerbang T-12 | daftar periksa §6.9 diisi pengulas |
| B-07 | Naskah bab 1–22, bagian depan, lampiran tertulis A–Q (paling banyak empat penulis paralel; bab 4, 12–15 dan Lampiran M–Q mengadaptasi naskah final `rehab`) | `penulis-kajian` | sonnet | B-02, B-03, B-04 | B-05, B-06 | dialek `NASKAH-SPEK.md`, token angka saja | `python3 bangun/kontrak/naskah.py naskah/sippa/*.md`; `qa/slop.py --ambang --laporan` per bab |
| B-08 | Sunting substansi (angka ke `angka.json`, klaim ke sumber) | penyunting (agent baru per bab, bukan penulisnya) | sonnet | B-07 | antar bab | nol angka ketikan | QA lapis 2 |
| B-09 | Sunting bahasa dan anti-slop sampai LULUS | penyunting bahasa (agent baru) | sonnet (tulis ulang), haiku (pindai) | B-08 | antar bab | semua bab LULUS, laporan `keluaran/qa/slop-sippa.md` | `qa/slop.py --ambang --laporan` |
| B-10 | Bab 16.3 hasil pilot dari ekspor D1 (`/api/sippa/log.csv`, `/api/sippa/probe.csv`) lewat `bangun/sippa_pilot.py` | `penulis-kajian` + `pipa-data` (kunci) | sonnet | P0-10, W-07 | B-07 | angka pilot lewat `angka.json`, pil "pilot, n kecil", vonis keputusan 53 | QA lapis 2 |
| B-11 | Lampiran I surat permintaan data (13 surat: 10 semula + Kementerian PU, TNI AD, Polri untuk data jembatan, sumur, dan SPAM) | `penulis-kajian` | sonnet | B-01 | B-02 | siap kirim minggu 47 | `kajian/pipa/surat/*.md` |
| B-12 | Bangun DOCX/PDF | `pipa-data` | sonnet | B-09, B-05, B-06 | | `qa/periksa.py --ketat` nol gagal | `cd data/kajian-bnpb && .venv/bin/python bangun/docx/bangun.py sippa` lalu `qa/periksa.py --docx --pdf --visual --kajian sippa --ketat` |
| B-13 | Deck: spek `naskah/sippa/deck.json` (18 slide isi, judul temuan, T-M), bangun PPTX/PDF | `penulis-kajian` (spek), `pipa-data` (bangun) | sonnet | B-03, B-05 | B-12 | S1–S39 lolos, stem berbeda dari DOCX | `.venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf` lalu `qa/periksa.py --pptx --pptx-pdf --kajian sippa --ketat` |
| B-14 | QA lima lapis akhir (pemindai, substansi, bahasa, proofread render, gerbang mekanis) | pengulas berbeda | sonnet/haiku | B-12, B-13 | | U1, U2 terpenuhi | `keluaran/qa/sippa.md`, `keluaran/qa/sippa-deck.md` |
| B-15 | Serah buku dan deck versi serah (minggu 49) | sesi induk | opus | B-14 | | berkas di `kajian/keluaran/` | manifest |
| B-16 | Protokol A/B pra-registrasi dan KAK pilot 2027 (minggu 51) | `penulis-kajian` | sonnet | B-15 | | `kajian/pipa/protokol-ab.md` | QA lapis 1–3 |

### 10.4 Ketergantungan dan jalur paralel

```
P0-01 ─> P0-02 ─┬─> P0-03 ───────────────┐
                ├─> P0-04 ─> P0-05 ──────┼─> P0-08 ─> P0-09 ─> (pilot P0-10)
                ├─> P0-06 (kertas) ──────┼──────────────────────> P0-10
                └─> P0-07 (klien) ───────┘
P0-02 ─> W-01 ─┬─> W-03 ─> W-04 ─> W-05 ─┐
               ├─> B-03 ─> B-05          │
               └─> W-02                  ├─> W-12 ─> W-13 ─> W-14 ─> W-15
P0-04 ─> W-06 ─> W-07, W-08 ─────────────┤
W-03 ─> W-09;  W-05 ─> W-10;  P0-04 ─> W-11 ┘
B-00, B-01 ─> B-02, B-04, B-11 ─> B-07 ─> B-08 ─> B-09 ─> B-12 ─┐
B-03, B-05, B-06 ────────────────────────────────────────┼─> B-14 ─> B-15 ─> B-16
P0-10 + W-07 ─> B-10 ─> B-07                              └─ B-13
```

Paling banyak 4–5 agent berjalan bersamaan (AGENTS.md §1.5). Fan-out yang menulis memakai `isolation: "worktree"` (AGENTS.md §3.3) karena checkout utama dipakai beberapa sesi; fan-out yang hanya membaca boleh di tree yang sama. Satu rakitan = 1 pengerja + 1–3 pemeriksa, pemeriksa tidak pernah pengerja yang sama.

### 10.5 Anggaran kuota (keputusan 48)

Minggu 26 Okt–1 Nov paling banyak 60% kuota untuk SIPPA, sisanya kajian mitigasi (keputusan 47 menunda mitigasi sampai PRD dan buku pipa selesai; kuota sisa dipakai untuk persiapannya). Urutan pemakaian bila kuota menipis: P0 (pilot) > W-01/B-03 (angka) > B-02/B-07 (naskah) > layar perencanaan > 3D dan telemetri. Sesi induk mencatat pemakaian per hari; bila mendekati 60% sebelum P0 selesai, tugas non-P0 ditunda ke minggu berikutnya, bukan P0 yang dipangkas. Model murah dipakai sesuai AGENTS.md §1.3: pemindaian berpola (`guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka`, pindai slop) di haiku; semua pengerja di sonnet; opus hanya sesi induk (rancangan, kontrak, keputusan deploy).

### 10.6 Langkah deploy (keputusan 49; sesi induk saja)

Subagent tidak pernah deploy, commit, atau push (AGENTS.md §9). Jalur terbit repo adalah `.github/workflows/terbit.yml`, bukan `wrangler deploy` dari laptop (komentar kepala workflow: data harian diambil dari cache jalan terakhir sehingga tidak mundur). Sesi induk menjalankan, berurutan, berhenti di langkah pertama yang gagal:

1. `git status` dan `git diff --stat` untuk berkas yang akan dikirim; tidak ada berkas `* 2.*`, secret, atau berkas besar (`higiene-repo`).
2. `npm run uji` (agen, warga termasuk `sippa*`, banjir, udara) dan `npm run uji:sippa`; self-check `python3 scripts/data/sippa/<skrip>.py uji` yang berubah.
3. Laporan pengulas wajib §9.12.1 untuk permukaan yang berubah tanpa temuan kritis terbuka.
4. Migrasi D1 baru: `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote` (hanya migrasi baru; tidak pernah menyunting yang sudah jalan), lalu catat ke `tests/warga/migrasi_beku.json` di commit berikutnya.
5. Push ke cabang `staging`: terbit.yml menjalankan `uji:agen`, `uji:warga`, `uji:sippa`, lalu `wrangler versions upload --preview-alias staging` (pratinjau, tidak dipromosikan). Staging memakai D1/R2 produksi yang sama, jadi tulisan uji asap memakai baris dummy dan diakhiri `POST /api/sippa/dummy/hapus`.
6. Uji asap di URL pratinjau (RENCANA-UJI §8.3), lalu merge ke `main`: terbit.yml menguji ulang dan menjalankan `wrangler deploy` (worker `centurisk97`). **Merge ke `main` sama dengan tayang**: terbit.yml menerbitkan dalam hitungan menit, dan `main` juga di-deploy ulang otomatis oleh `titik.yml` (tiap 3 jam), `banjir.yml` (07.20 WIB), dan `data.yml` (21.20 WIB), jadi kode di `main` tayang paling lambat 21.20 WIB hari itu walau terbit.yml gagal.
7. Uji asap produksi: `/pipa` tanpa sesi = 303 ke `/admin/pantau?ke=%2Fpipa`; dengan sesi staf pusdalops = 200; `/pipa/lapangan` = 200 tanpa sesi; `GET /api/sippa/kit` tanpa sesi = 401; `/api/sippa/data/zona` dengan sesi = 200 atau 404 (belum diunggah); satu kiriman lapangan dummy lalu `dummy/hapus`.
8. Bila asap gagal: `npx --yes wrangler@4.42.0 rollback` ke versi sebelumnya LALU revert commit di `main` (tanpa revert, deploy terjadwal berikutnya menayangkan ulang kode rusak); buka tiket di jejak; migrasi tidak dibalik (tabel baru tidak mengganggu rute lain).

### 10.7 Aturan commit

- Commit dari sesi induk saja, dengan path spesifik: `git commit -m "<pesan>" -- <berkas1> <berkas2> …`; tidak pernah `git add -A` atau `git add .` (index dipakai bersama beberapa sesi, AGENTS.md §3.3).
- Satu commit per tugas ID (mis. "SIPPA P0-04: migrasi 0056 sippa inti + uji skema"), pesan Bahasa Indonesia, diakhiri baris atribusi yang berlaku di sesi.
- Berkas data turunan (`data/sippa/keluaran/*.json`) di-commit terpisah dari kode.
- Berkas `* 2.*` hasil sinkron iCloud tidak pernah di-commit atau disunting; dihapus setelah dipastikan salinan.
- Tidak ada secret di berkas terlacak; token perangkat dan kode penugasan hanya tampil sekali di layar.
- Push mengikuti aturan repo (operasi git jaringan dibungkus batas waktu); deploy hanya setelah commit yang sama lolos uji.

---

## 11. Anggaran ringkas, risiko dan mitigasi, asumsi, glosarium

### 11.1 Anggaran ringkas: cara hitung ulang (keputusan 13)

RAB buku dihitung ulang oleh skrip `kajian/bangun/sippa_keuangan.py` (pemilik `pipa-data`, Python stdlib, self-check) dari satu tabel harga `kajian/data/sippa/harga.csv` (kolom: `kode, uraian, satuan, harga_rp, sumber, tanggal, keyakinan, rentang_rendah, rentang_tinggi, per` dengan `per` ∈ kit/lokasi/depot/program). Angka keluar ke `angka.json` sebagai `sippa.rab.*` dan ke Studio sebagai preset S0/S0B. Angka di bawah adalah **titik awal dari KD §4 dan baca-C**, berlabel, untuk memeriksa urutan besaran; bukan RAB final.

**Aturan hitung:**

1. Satu item satu baris, dengan satu satuan alokasi (per kit, per lokasi, per depot, atau per program); item yang sama tidak boleh muncul di dua satuan (mis. APD 20 orang dihitung per kit di BOM §6.1, maka tidak lagi di "CAPEX bersama").
2. Harga bersumber dipakai apa adanya dengan label [terverifikasi] (pompa kelas 1.500 L/min Rp190,78 juta termasuk PPN; HDPE OD200 PN16 Rp1.162.050/m; drone termal kelas 640x512 Rp111,217 juta); sisanya [asumsi-kebijakan] dengan rentang ±30% sampai RFQ e-katalog + 3 penawaran (K-19, D30).
3. Kontingensi 25% (KD) untuk item asumsi; 10% untuk item bersumber [asumsi-kebijakan]. Studio memakai 20% seragam; keduanya ditampilkan di tabel pembanding agar selisihnya terbaca (G02).
4. PPN tidak ditambah terpisah untuk harga listing yang sudah termasuk PPN (pola paket pemilik, PPN penyesuaian 0).
5. OPEX dibedakan tahun kering dan tahun basah (KD: 40% tahun kering [asumsi-kebijakan]); jam pompa dan hari regu tidak dianggap terjadi tiap tahun (G22).
6. TCO nominal dan terdiskonto 8% (G09); NPV/BCR tiga skenario manfaat (0, regu terhindar, heli-hari terhindar) ditambah varian + banjir (keputusan 7) dan + banjir + irigasi (keputusan 8); Monte Carlo P10/P50/P90 dengan pengali seragam Studio (CAPEX 0,78–1,28; BBM 0,65–1,40; upah 0,70–1,45; operasi lain 0,75–1,35) (G10).
7. Kepekaan wajib: ha per kit 22.700 ±50% (§5.2), harga layflat ±30%, jam pompa ±50%, porsi tahun kering 20–60%.
8. Harga heli: slot `sippa.heli.biaya_jam` dan `sippa.heli.biaya_sorti` berstatus **menunggu** angka BNPB (keputusan 14, T-A); sampai diisi, tabel pembanding hanya memuat "> Rp200 juta per sorti satu jam" [resmi, pernyataan BNPB Sept 2023]; angka Studio Rp130 juta/jam tidak dipakai (G13).

**Tingkat anggaran bertingkat gerbang** (tidak ada tingkat yang dieksekusi sebelum gerbangnya lulus; keputusan 50 tidak ada pembelian massal sebelum pilot):

| Tingkat | Isi | Gerbang pembuka | Titik awal angka | Label |
| --- | --- | --- | --- | --- |
| T0 Pilot Okt 2026 | alat yang ada (pinjam Manggala Agni/BPBD), 2 lance sederhana galvanis, 2–4 termometer tusuk, BBM, insentif regu, transport | keputusan pemilik minggu ini | slot `sippa.rab.pilot2026` diisi dari realisasi (kuitansi) setelah 1 Nov | terverifikasi setelah realisasi |
| T0B Banjir Nov–Des 2026 | pompa banjir pinjam BPBD, layflat yang ada, transport YonTP, BBM | vonis "dapat dipakai" + daftar tujuan (T-D) | slot `sippa.rab.banjir2026` dari realisasi | terverifikasi setelah realisasi |
| T1 Fase 0 2027 | survei tapak 3 AOI, bench test, kajian lingkungan dan izin, time-motion, protokol A/B + evaluator | nota putusan pimpinan | Rp1,1–2,1 M (KD §4.1) | asumsi-kebijakan |
| T2 Pilot 2027–2028 | 3 kit gambut (BOM §6.1), drone termal, kontainer + tangki BBM + radio, instrumentasi A/B, 6 sekat kanal, 30 sumur dangkal, 3 modul banjir, OPEX 2 musim | G0, G1, G2 | CAPEX Rp6,1–6,6 M + OPEX 2 musim Rp3,3–6,0 M (KD) = Rp10,5–14,7 M termasuk Fase 0; tambahan baca-C di bawah | campuran |
| T3 Skala Kalteng 2029+ | 20 kit (14 + 6 dari dana koridor, keputusan 60), 7 depot, 60 sekat, 300 sumur, pelatihan 300 personel | G4, G5 | CAPEX Rp37,4–43,1 M; TCO 5 tahun Rp64–90 M (KD §4.2) | asumsi-kebijakan |
| T4 Nasional 2030+ | 81 kit di 18 provinsi (56 gambut, 25 mineral/sabana pada 75% biaya kit gambut) bertahap, paling banyak 25 kit tambahan di 2030 (§4.3) | G5 + evaluasi Kalteng | dihitung `sippa_keuangan.py` dari per-kit T2 dan `kit_nasional.json`; tidak memakai Rp364 M dokumen awal (G16) | asumsi-kebijakan |

**Baris tambahan dari baca-C yang wajib ada di T2 dan seterusnya** (G06, G07, G08, G21, keputusan 7 dan 8):

| Baris | Satuan | Titik awal | Sumber | Aturan |
| --- | --- | --- | --- | --- |
| Pickup 4x4 | per lokasi | Rp440 juta | Studio, asumsi | bawaan **pinjam** BPBD/Daops/YonTP (Rp0); dibeli hanya bila surat pinjam tidak tersedia; dua skenario ditampilkan |
| Perahu serbaguna | per lokasi (zona B) | Rp230 juta | Studio, asumsi | sama; pickup + perahu bila dibeli +Rp0,67 M per lokasi, sekitar Rp2,0 M untuk 3 lokasi (G06) |
| Paket keamanan (kunci, tag, CCTV gudang depan) | per lokasi | Rp110 juta CAPEX + Rp65 juta/tahun | Studio, asumsi | K-15; target kehilangan < 5% |
| Patroli drone termal | per lokasi | Rp85 juta/tahun | Studio, asumsi | hanya bila drone dipakai rutin di luar kejadian |
| Telemetri | per kit | CAPEX gateway Rp25 juta + panel PV/baterai Rp30 juta; OPEX Rp34 juta/tahun | Studio/BOM pemilik, asumsi | sensor PT/FT/T sudah di BOM kit; OPEX mencakup pulsa/satelit dan servis |
| Logistik antar-daerah | per kit per pindah | Rp40–160 juta/tahun | Studio, asumsi | dibedakan pindah karhutla ke banjir dan kembali; YonTP memakai anggaran yang ada bila MoU mengatur |
| Latihan tahunan G6 | per lokasi | Rp52 juta/tahun (tahunan) s.d. Rp95 juta/tahun (triwulan) | Studio, asumsi | 3 lokasi: Rp156–285 juta/tahun (G08) |
| Servis/pemeliharaan | per kit | 5–8% CAPEX/tahun | KD | Studio 4,2% tidak ditambahkan lagi (hindari hitung ganda) |
| Modul banjir | per kit gambut di provinsi berpasangan banjir | pompa ≥ 100 L/s Rp250 juta + layflat DN150 300 m (harga slot `sippa.harga.layflat150_m`, RFQ) + intake terapung dan katup cek (slot) | Studio, asumsi | keputusan 7; manfaat banjir masuk varian BCR + banjir |
| Irigasi dengan air dari sumber lain | per kabupaten peminjam | paket pilot irigasi Rp140 juta | Studio, asumsi | keputusan 8; memakai pompa banjir dan layflat yang menganggur Mar–Apr; BBM ditanggung peminjam; manfaat nol bila syarat keras §5.7 tidak terpenuhi |
| Platform web `/pipa` | program | Rp0 tambahan bila dikerjakan di repo ini dan tetap di akun Cloudflare yang ada; Rp0,2–0,5 M bila dikontrakkan (KD) | asumsi | batas kuota D1 dan R2 akun yang berlaku dicek sebelum telemetri aktif; telemetri dibatasi sampling §9.11 |
| Heli (pembanding, bukan biaya SIPPA) | per jam / per sorti | menunggu BNPB | BNPB | keputusan 14 |

**Contoh hitung kasar T2** (memeriksa urutan besaran, bukan RAB; dihitung ulang skrip): KD Rp10,5–14,7 M; ditambah pickup dan perahu bila dibeli Rp2,0 M x 1,25 = Rp2,5 M; keamanan CAPEX 3 x Rp110 juta x 1,25 = Rp0,41 M; telemetri CAPEX 3 x Rp55 juta x 1,25 = Rp0,21 M; modul banjir 3 x Rp250 juta x 1,25 = Rp0,94 M (belum termasuk layflat DN150); OPEX tambahan per lokasi per tahun (drone Rp85 juta + telemetri Rp34 juta + keamanan Rp65 juta + logistik Rp40–160 juta + latihan Rp52–95 juta) = Rp276–439 juta, untuk 3 lokasi x 2 tahun Rp1,66–2,63 M. Hasil: sekitar Rp13,7–18,9 M bila kendaraan dan perahu dipinjam, sekitar Rp16,2–21,4 M bila dibeli [asumsi-kebijakan]. Kedua angka masuk buku hanya lewat `sippa_keuangan.py`, dengan rentang dan label, tidak diketik.

**CO2 BBM** (G25): pilot 3 kit, 6 pompa x 240 jam x 22 L = 31.680 L bensin x 2,31 kg/L sekitar 73 ton CO2 per musim [estimasi-model, hanya BBM, tanpa emisi gambut yang dihindari].

### 11.2 Risiko dan mitigasi

Skala kemungkinan (K) dan dampak (D) 1–5; skor = K x D. Register lengkap masuk buku Bab 19 (gabungan KD §7.2, FMEA pemilik A2, risiko web, dan risiko air dan akses R21–R26 dari keputusan 55).

| No | Risiko | K | D | Skor | Pemilik | Mitigasi | Pemicu pantau |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | Musim pilot basah (La Niña), terlalu sedikit api untuk A/B | 3 | 4 | 12 | BNPB | kit boleh dipakai di kebakaran mana pun di Kalteng; siapkan musim ke-3; tidak menyalakan gambut | `iklim_outlook` anomali > 0 untuk JAS/ASO |
| R02 | Pilot Okt 2026 tanpa api aktif di AOI | 4 | 2 | 8 | Satgas | vonis "dapat dipakai" tetap dari latihan basah dan time-motion; vonis "lebih baik" ditunda | titik panas 24 jam AOI |
| R03 | Hasil A/B nol atau kecil | 3 | 3 | 9 | evaluator | hasil sah; berhenti dan hemat anggaran skala; kit dilebur ke inventaris pompa biasa | G4 |
| R04 | Tekanan politik membeli besar sebelum hasil | 3 | 5 | 15 | BNPB | nota putusan dengan gerbang tertulis; layar kit nasional berlabel "rencana bersyarat, bukan pengadaan"; simulator menolak semi-permanen dan backbone | permintaan pengadaan di luar T2 |
| R05 | Sumber air gagal di puncak kemarau | 3 | 4 | 12 | Satgas/BWS | G1 diukur di kemarau; sumur dangkal cadangan; GSW "tidak terdeteksi" tidak dianggap air | neraca air H-AIR |
| R06 | Kecelakaan: ambles di gambut, CO, selang pecah | 2 | 5 | 10 | Satgas | SOP-03, monitor gas, uji tekanan per seksi, katup tutup lambat, larangan masuk gambut tak tertopang | alarm CO, H-TEKANAN |
| R07 | Pencurian atau kehilangan komponen | 3 | 3 | 9 | YonTP/BNPB | gudang terkunci, QR per bin, cek komponen tiap pindah, kembali ke gudang tiap selesai | kehilangan > 5% (U8) |
| R08 | Rotasi personel TNI menghapus keterampilan | 4 | 2 | 8 | Manggala Agni | operator inti Manggala Agni; YonTP tenaga gelar; latihan G6 tiap tahun | jumlah operator bersertifikat |
| R09 | Konflik izin lahan konsesi/adat | 3 | 4 | 12 | BNPB/BPBD | AOI non-konsesi dulu; persetujuan tertulis sebelum survei | status `kaw` AOI |
| R10 | Surfaktan mencemari air gambut | 2 | 4 | 8 | Satgas | bebas PFAS, lembar data, zona larangan, sampel hilir | hasil sampel |
| R11 | Angka pembanding biaya (heli, OMC) dipersoalkan | 4 | 2 | 8 | BNPB | hanya angka bersumber; harga heli dari BNPB (T-A) | |
| R12 | Jalan `track` OSM tidak bisa dilalui di musim hujan | 4 | 3 | 12 | BPBD | versi konservatif sebagai angka perencanaan; cek jalan per kompleks sebelum dinaikkan zonanya (versi Terverifikasi) | `sippa_jalan_cek` |
| R13 | De-watering gambut oleh modul banjir atau irigasi | 2 | 4 | 8 | BNPB/BRGM | modul banjir tidak dipakai di kanal gambut; irigasi hanya dari sumber di luar kubah; syarat keras Studio | SOP-06 titik berhenti |
| R14 | Data staf bocor (log, lokasi kit) | 2 | 3 | 6 | `warga-api` | semua di balik sesi; R2 lewat rute berlogin; tidak ada salinan di `public/`; `security-reviewer` | uji hak §9.12.2 |
| R15 | Kiriman luring hilang atau ganda | 3 | 3 | 9 | `sippa` | IndexedDB + UUID + `ON CONFLICT(id) DO NOTHING` (butir rusak menjadi `ditolak`, tidak hilang); kertas G3-lite cadangan | antrean > 24 jam |
| R16 | Web P0 tidak siap untuk pilot | 3 | 2 | 6 | sesi induk | kertas G3-lite (P0-06) wajib siap 26 Okt; input staf setelah deploy | status P0-09 |
| R17 | Kuota minggu ini habis sebelum P0 dan angka buku | 3 | 3 | 9 | sesi induk | urutan prioritas §10.5; model murah untuk pemindaian | pemakaian harian |
| R18 | Batas akun Cloudflare Free (D1, cron) terlampaui oleh telemetri | 2 | 3 | 6 | `warga-api` | sampling 1/menit, ringkas harian, simpan mentah 30 hari, tanpa cron baru | ukuran D1 |
| R19 | Mesin Studio dipakai menyimpulkan kelayakan jaringan | 3 | 4 | 12 | BNPB | gerbang H-SERAP, batas alat G22/G23 di layar dan Lampiran L, manfaat bawaan 0 | |
| R20 | Sesi Claude paralel bertabrakan di index git | 3 | 2 | 6 | sesi induk | worktree untuk fan-out menulis; commit path spesifik | `git status` asing |
| R21 | Jembatan darurat menjadi aset tanpa pemilik dan tanpa jadwal ganti (keputusan 55) | 3 | 4 | 12 | BNPB/Kementerian PU | `pemilik_aset` wajib di `sippa_aset`; pil "tanpa jadwal ganti"; rekomendasi SR-24 | jumlah jembatan darurat tanpa `rencana_ganti` |
| R22 | Sumur darurat tanpa uji mutu dan pengelola sesudah status berakhir | 3 | 4 | 12 | BPBD/Badan Geologi | uji mutu wajib saat serah terima (K7); daftar bersama `/pipa/air`; SR-30, SR-31 | sumur tanpa `mutu_air` > 30 hari |
| R23 | Pengambilan air tanah memperparah zona kritis atau penurunan muka tanah | 2 | 4 | 8 | Badan Geologi | CHECK dan rute menolak sumur zona kritis/rusak tanpa rekomendasi; air permukaan diutamakan di pesisir utara Jawa | sumur baru di zona rawan |
| R24 | Angka program jembatan dan sumur K/L hanya ada di media | 4 | 2 | 8 | BNPB | angka sekunder hanya Lampiran A (gerbang D-40); surat Lampiran I | kunci `rehab.sekunder.*` di badan teks |
| R25 | Pemeliharaan tidak berdana karena hibah RR menutup operasi dan pemeliharaan (Perban 4/2024 Pasal 5 huruf b) | 4 | 3 | 12 | BNPB/pemda | baris anggaran per pelaku §6.10.6; SR-38 | butir terlambat (U11) |
| R26 | Data kondisi tidak diisi sehingga jadwal tidak dipercaya | 3 | 3 | 9 | `sippa`/Satgas | inspeksi pra/pasca-gelar di form lapangan; status "belum pernah" terlihat | U11 < 90% |

### 11.3 Asumsi

| Kode | Asumsi | Label | Diuji atau diganti oleh |
| --- | --- | --- | --- |
| AS-01 | Satu kit melayani sekitar 22.700 ha luas terbakar puncak provinsi | asumsi-kebijakan | kepekaan ±50% Bab 18.7; data pemakaian kit 2027–2028 |
| AS-02 | Kit mineral/sabana = 75% biaya kit gambut | asumsi-kebijakan | RFQ 2027 |
| AS-03 | Kendaraan dan perahu dipinjam dari BPBD/Daops/YonTP | asumsi-kebijakan | surat pinjam per AOI |
| AS-04 | 40% tahun kering dalam horizon | asumsi-kebijakan | CHIRPS 2001–2025 (empat tahun terkering 2006, 2015, 2002, 2019) dan prakiraan |
| AS-05 | Ambang G3 per kelas medan (4/8/24 jam p50) | asumsi-kebijakan | time-motion 2027 |
| AS-06 | Ambang dingin 50 °C pada semua kedalaman | asumsi (usulan A2 [17]) | pembanding probe 2027 |
| AS-07 | Ambang pemicu (anomali ≤ -20%, P(FWI ≥ 14) ≥ 0,5 pada ≥ 3 dari 7 hari) | asumsi-kebijakan | uji balik musim 2027 |
| AS-08 | Ambang FRP matriks respons (10/30/100 MW) | asumsi-kebijakan | log 2026 (`/api/pipa/lapangan`) |
| AS-09 | Faktor liku trase 1,2 x jarak garis lurus | asumsi-kebijakan | survei trase AOI |
| AS-10 | C Hazen-Williams layflat 130, HDPE 135–140; ID layflat 0,96 DN bila datasheet kosong | asumsi | bench G2 (head loss ±15%) |
| AS-11 | Kecepatan gelombang lonjakan 300 m/s HDPE, 150 m/s layflat | asumsi | bench G2 |
| AS-12 | Porositas efektif 0,5 di adegan injeksi 3D | asumsi, ilustrasi | tidak dipakai untuk keputusan |
| AS-13 | Batas zona memakai "<" (jarak tepat 2,50 km atau 5,00 km masuk kelas jauh), sama dengan `matriks_jarak.md` dan pipa_data.py | keputusan pemilik 51 (bukan lagi asumsi) | self-check `zona.py` mereproduksi tiga versi |
| AS-14 | Harga satuan selain empat harga bersumber, ±30% | asumsi-kebijakan | RFQ e-katalog + 3 penawaran |
| AS-15 | Kontingensi 25% (asumsi) dan 10% (bersumber) | asumsi-kebijakan | |
| AS-16 | Manfaat bawaan 0 | asumsi-kebijakan (T-F) | data pilot dan angka BNPB |
| AS-17 | Beda elevasi dari DSM berkanopi cukup untuk nilai awal kalkulator | asumsi | DEMNAS/GNSS per AOI |
| AS-18 | Sampling telemetri 1 per menit cukup untuk alarm | asumsi | G2 dan musim 2027 |

### 11.4 Glosarium

| Istilah | Arti di dokumen ini |
| --- | --- |
| AOI | area of interest: lokasi pilot terpilih |
| A/B | perbandingan petak berpasangan antara lengan perlakuan dan konvensional |
| BCR | rasio manfaat-biaya, PV manfaat dibagi (CAPEX + PV OPEX) |
| BMN | barang milik negara; kit SIPPA adalah BMN BNPB yang dipinjampakaikan |
| BOM | daftar komponen kit berkode (P-, H-, I-, M-, C-, ST-, SF-, V-, FT-, PT-, T-, GWT-, U-, Q-, S-) |
| CAPEX, OPEX, TCO | belanja modal, belanja operasi tahunan, total biaya kepemilikan selama horizon |
| CHIRPS | data hujan satelit-stasiun 0,05° (UCSB) |
| Dingin terverifikasi | semua probe 0,1/0,3/0,5/1,0 m < 50 °C pada cek 24 dan 72 jam dan tanpa nyala ulang 7 hari |
| DSM | model permukaan digital (memuat kanopi), mis. Copernicus GLO-30 |
| DEMNAS | model elevasi nasional BIG 0,27" |
| FRP | fire radiative power (MW), penanda api menyala di permukaan, bukan kedalaman bara |
| FWI | Fire Weather Index; `fwi_ansambel.json` memberi peluang FWI ≥ 7 (`pt`) dan ≥ 14 (`ps`) dari 51 anggota ECMWF |
| G0–G6 | gerbang program §4.4 |
| GSW | JRC Global Surface Water: permanen, musiman, tidak terdeteksi |
| Hazen-Williams | rumus head gesek §6.4 |
| Kelas medan I/II/III | kelompok medan untuk G3 (§4.4) |
| Kit | satu kit relay portabel SIPPA (§6.1) |
| Kode penugasan | kode 26 heks untuk operator tanpa akun, berlaku ≤ 30 hari |
| Kompleks | kelompok titik panas yang dianggap satu kejadian di `kendala.json`/`operasi.json` |
| Lance | pipa injeksi berlubang 1,5 m (lengan uji teleskopik 3–5 m) |
| Layflat | selang pipih yang digulung, DN65/DN100/DN150 |
| MCD64A1 | produk area terbakar bulanan MODIS 463 m |
| Modul banjir | pompa debit besar head rendah terpisah dari pompa api (§6.3) |
| NO-GO, HOLD, KONDISIONAL | tiga status keputusan simulator; tidak ada status GO |
| NPV | nilai sekarang bersih, r 8% bawaan |
| p50, p90 | median dan persentil 90 |
| PN, SDR | tekanan nominal dan rasio diameter terhadap tebal dinding HDPE |
| Pra-posisi | memindah kit ke depot depan sebelum api, berdasarkan pemicu |
| Sel 2,2 km | kisi analisis kekerapan VIIRS 14 tahun |
| SIPPA | Sistem Pipa Portabel Karhutla dan Banjir |
| Studio | simulator keputusan pemilik (Karhutla Decision Studio) yang dibangun ulang di `/pipa/studio` |
| TDH | total dynamic head (m) |
| Telemetri | kiriman data sensor kit ke `/api/sippa/telemetri` |
| Time-motion | pengukuran waktu tiap tahap gelar |
| Versi zona | Konservatif = versi `kendala.json` (air dan jalan `kendala.json`); jalan utama OSM (tersier ke atas x semua air OSM, pembanding); Optimistis = semua jalan OSM termasuk `track` x semua air OSM; Terverifikasi (optimistis hanya bila jalan dicek lolos musim hujan) |
| YonTP | batalyon TP TNI (Yonif TP; rujukan Kemhan 19 Okt 2026 di paket pemilik): gudang, tenaga gelar, transport antar-daerah, di bawah komando Satgas |
| Zona A–D | kelas kelayakan dari jarak air (< 2,5 km) dan jalan (< 5 km), keputusan 30 dan 51 |

---

## 12. Keterlacakan (28 celah dan 53 keputusan)

### 12.1 Celah baca-C G01–G28

| Celah | Isi singkat | Ditangani di | Cara |
| --- | --- | --- | --- |
| G01 | Studio pemilik punya mesin keputusan yang berjalan | §9.5 | mesin dipertahankan dan dibangun ulang di `/pipa/studio` |
| G02 | Dua set CAPEX pemilik (Excel vs Studio) | §11.1 aturan 3, §9.5.3 | kedua versi ditampilkan dengan nama versinya; RAB buku dihitung ulang `sippa_keuangan.py` |
| G03 | Waktu gelar mesin pemilik jauh di atas 3–4 jam | §4.4 G3, §9.4.6 | ambang per kelas medan; angka Studio sebagai hipotesis pembanding di grafik log |
| G04 | Gerbang keras otomatis | §6.4, §9.3 tabel gerbang, §9.5.1 | gerbang di kalkulator dan Studio; uji invarian OD160 NO-GO |
| G05 | Derating suhu HDPE | §6.4, §9.3 H-TEKANAN | f = 1 - 0,014 (T - 20), batas 0,58–1, berlabel penyaringan |
| G06 | Aset pendukung (kendaraan, perahu, gudang, keamanan) | §5.6, §11.1 baris tambahan | bawaan pinjam; skenario beli +Rp0,67 M per lokasi ditampilkan |
| G07 | OPEX berulang (drone, telemetri, keamanan, logistik, latihan, servis) | §11.1 baris tambahan | baris per lokasi/kit; servis tidak dihitung ganda |
| G08 | Latihan tahunan dan G6 | §4.4 G6, §5.8, §11.1 | gerbang G6 dan Rp52–95 juta per lokasi per tahun |
| G09 | NPV/BCR/impas dan definisi biaya per ha | §9.3, §9.4.7, §9.5.3, §11.1 aturan 6 | dua definisi (Studio OPEX saja, KD dengan CAPEX) berdampingan; TCO terdiskonto 8% |
| G10 | Monte Carlo dan sensitivitas | §9.5.1, §11.1 aturan 6–7 | 800 sampel berbenih; kepekaan wajib |
| G11 | Tiga set bobot skor | §9.5.1 | skor tidak meluluskan NO-GO; gerbang dulu |
| G12 | Bahan dan trase yang tidak dibahas (baja, tertanam, SDR17) | §6.8, §9.4.3 masukan Bahan | baja/tertanam tidak ditawarkan untuk kit; SDR17/PN10 ada di kalkulator |
| G13 | Harga heli Studio Rp130 juta/jam | §9.5.1 butir 3, §11.1 aturan 8 | diganti slot menunggu BNPB; pembanding resmi > Rp200 juta per sorti |
| G14 | Pemilik minta bobot lebih besar untuk banjir, pertanian, YonTP | §5.6, §5.7, §6.3, §8.2 Bab 11 dan 17, §11.1 | keputusan 7 dan 8 dieksekusi dengan syarat keras anti de-watering; bab tersendiri |
| G15 | Bentuk keluaran: buku besar, gambar teknik, RAB, Three.js, dashboard | §8, §6.9, §9.5, §9.6 | keputusan 11, 12, 13, 18, 34 menang atas saran KD; gambar tetap wajib pengesahan insinyur |
| G16 | Cakupan nasional | §5.2, §11.1 T4 | 81 kit bersyarat G5; tidak memakai Rp364 M |
| G17 | Matriks respons FRP dan luas | §5.4, §9.3 `matriksRespons` | FRP hanya penanda permukaan |
| G18 | Benchmark luar negeri | §8.2 Lampiran K | label "belum diverifikasi" sampai dikutip dari aslinya |
| G19 | Pertanyaan rinci (SDM per ha, APD, T/lurus, nozzle, filter, valve, gudang) | §6.1, §6.9, §6.10, §8.2 Bab 9, Bab 15, Lampiran D dan Q | BOM berkode dengan kriteria terima; interval pemeliharaan di model §6.10 |
| G20 | Izin pengambilan air | §4.4 G0/G1, §7.5 | syarat tertulis BWS di G0 dan G1 |
| G21 | Sensor, IoT, kode, drone, deteksi dini | §6.6, §9.11 | kerangka telemetri dibangun sekarang (keputusan 38), sensor 2027; probe multi-kedalaman tetap wajib G4 |
| G22 | Hal yang Studio tidak modelkan (serap lance, utilisasi, kedalaman, air per ha) | §9.3 H-SERAP/H-DALAM, §9.5.1 `gerbangSippa`, §9.4.8, §11.1 aturan 5 | gerbang tambahan; batas alat di layar dan Lampiran L |
| G23 | Cacat kecil Studio | §9.5.1 butir 3 | teks 32/100, nama ELEC/GEN, harga heli; tetap tanpa status GO |
| G24 | Gerbang G0–G6 pemilik vs KD | §4.4 | G4-peralatan dilebur ke G2, titik 90 hari dicatat, G6 ditambah |
| G25 | CO2 BBM | §6.4, §9.3 `co2`, §11.1 | sekitar 73 ton CO2 per musim pilot, hanya BBM |
| G26 | Portal data yang disebut Studio | §7.5, §9.4.8 | portal masuk daftar data dan surat |
| G27 | Hasil Deep Research tidak ada | §2.2 T-I | tidak dirujuk sampai pemilik mengirim |
| G28 | Rekomendasi pipa hibrida dan umur HDPE 50 tahun | §6.8 | umur desain kondisi standar, tidak berlaku di gambut terbakar; HDPE hanya di luar perimeter |

Tidak ada celah tanpa tempat.

### 12.2 Keputusan pemilik 1–56

| No | Keputusan | Ditangani di |
| --- | --- | --- |
| 1 | Nama SIPPA | judul, §1.1, semua layar dan berkas (`sippa_*`, `/pipa`) |
| 2 | Pemilik program BNPB | §3.2, §3.3 RACI kolom BNPB (A) |
| 3 | Pembaca buku Kepala BNPB | §8.1 |
| 4 | Pilot Okt 2026 minggu ini; berhasil = banjir Nov–Des | §4.1, §10.1 P0, §11.1 T0/T0B, §9.10 templat pilot |
| 5 | Horizon 2026–2030 | §4.1–4.3, §8.2 Bab 21 |
| 6 | Provinsi lain dibahas penuh | §5.1 (9 provinsi), §5.2, §8.2 Bab 6, §11.1 T4 |
| 7 | Pemakaian ganda banjir masuk biaya-manfaat | §5.6, §6.3, §8.2 Bab 11 dan 18, §9.5.2 S0B, §9.5.3 varian BCR + banjir, §11.1 modul banjir |
| 8 | Irigasi masuk, air dari tempat lain | §5.7, §8.2 Bab 11, §9.5.3 manfaat (d), §11.1 baris irigasi |
| 9 | Injeksi 1,5 m pilot; 3–5 m lengan uji kedua | §5.3, §6.5, §9.4.7 lengan `lance_dalam`, §9.9 probe 150–500 cm hanya `lengan_dalam` |
| 10 | Surfaktan bebas PFAS sebagai lengan uji | §5.3, §6.7, §9.4.7 lengan `lance_surfaktan`, CHECK `surfaktan_l` §9.7.2 |
| 11 | Tanpa batas halaman | §8.1 |
| 12 | Gambar teknik tingkat konstruksi + pengesahan insinyur | §6.9, §10.3 B-06 |
| 13 | RAB dihitung ulang | §11.1 |
| 14 | Harga heli angka BNPB menyusul | §2.2 T-A, §9.5.1, §11.1 aturan 8 |
| 15 | NPV, BCR, Monte Carlo | §8.2 Bab 18, §9.3, §9.5, §11.1 |
| 16, 17 | Matriks respons FRP dan luas | §5.4, §9.3 |
| 18 | Simulasi Three.js pola simulasi karhutla | §9.6 |
| 19 | Deck sekitar 15 slide (18 sesudah keputusan 55, T-M) | §8.5, §10.3 B-13 |
| 20 | Tanpa bab kritik | §8.2 |
| 21 | YonTP gudang, tenaga gelar, transport; komando Satgas; operator inti Manggala Agni | §3.3, §5.6, §5.8, §9.7.2 `pengangkut` |
| 22 | Tanpa dasar hukum TNI | §1.4 |
| 23 | Aset BMN BNPB, pinjam pakai | §3.3, §5.6, §9.4.5 `pemilik_asal` |
| 24 | Matriks RACI per tahap | §3.3 |
| 25 | Swasta/konsesi opsi kebijakan | §3.4 |
| 26 | Semua data terbuka ditarik | §7.1 (termasuk OSM, GLO-30, GSW, MCD64A1, CHIRPS, WorldCover; GloFAS menunggu akun CDS) |
| 27 | Draf surat permintaan data sebagai lampiran | §7.5, §8.2 Lampiran I, §10.3 B-11 |
| 28 | Batas data 23 Okt 2026 23.59 WIB | §1 konvensi, §8.5 pil CUT OFF, §9.1.3 pil batas data |
| 29 | Label keyakinan di semua angka | §1.5, §7.4, §9.2 pil, §8.3 |
| 30 | Ambang zona air 2,5 km, jalan 5 km | §5.1, §9.3 `zona`, §11.3 AS-13 |
| 31 | Halaman `/pipa` | §9.1 |
| 32 | Hanya staf BNPB | §7.2 letak keluaran, §9.1.2, §9.8 |
| 33 | Daftar fitur web | §9.1.1 kolom fitur, §9.4, §9.5, §9.6 |
| 34 | Dashboard pemilik dibangun ulang, mesin dan gerbang dipertahankan | §9.5.1 |
| 35 | Lacak kit antar-daerah | §9.4.5, §9.7.2 `sippa_gerak` |
| 36 | Pola admin worker | §9.1.2, §9.8 |
| 37 | Form lapangan luring | §9.9 |
| 38 | Telemetri kerangka siap | §9.11 |
| 39 | Laporan PDF otomatis | §9.10 |
| 40 | Bahasa Indonesia saja | §9.2 |
| 41 | Gaya Pantau Bencana | §9.2 |
| 42 | Desktop perencanaan, ponsel lapangan | §9.1.3, §9.2 |
| 43 | Simulator membandingkan semua skenario | §9.5.2, §9.5.3 |
| 44 | Peta per kompleks dan per sel 2,2 km dengan sakelar | §9.4.2 |
| 45 | Mode gelap | §9.2 |
| 46 | PRD dulu, lalu buku dan web paralel | §10 |
| 47 | Kajian mitigasi ditunda | §1.4, §10.5 |
| 48 | Maksimal 60% kuota minggu ini untuk pipa | §10.5 |
| 49 | Deploy setelah lolos uji, dari sesi induk | §10.6 |
| 50 | Enam larangan | §1.5, §12.3 |
| 51 | Ambang zona "<" | §5.1, §9.3 `zona`, §9.12.2, §11.3 AS-13 |
| 52 | Warna zona buku/deck biru dan emas; web palet + huruf + pola | §8.1, §9.4.2 lapisan, §9.13 |
| 53 | Vonis pilot "dapat dipakai" tujuh butir | §1.3 U3, §4.1 minggu 44, §9.4.7, §9.9 medan sesi, §9.10 templat pilot |
| 54 | T-B dan T-C memakai bawaan | §2.1, §2.2, §10.1 |
| 55 | GD SIPPA terintegrasi (pipa + air tanah + akses + pemeliharaan) | §1.1, §1.2 butir 5–6, §1.3 U11–U12, §1.4, §6.10, §8, §11.2 R21–R26 |
| 56 | Air tanah, akses, dan jadwal pemeliharaan di web `/pipa` | §9.1.1, §9.1.2, §9.3, §9.4.9–§9.4.12, §9.7, §9.12, §9.14, §10.2 W-16–W-21 |

Tidak ada keputusan tanpa tempat (1–56).

### 12.3 Daftar periksa serah

**Harus ada** (diperiksa sesi induk sebelum serah buku dan sebelum rilis web lengkap):

- [ ] Buku DOCX + PDF dan deck PPTX + PDF di `kajian/keluaran/` dengan manifest; `qa/periksa.py --ketat` nol gagal; semua bab LULUS anti-slop (U1).
- [ ] Tiap angka buku dan deck lewat `{{angka:sippa.*}}` berlabel keyakinan (U2); slot kosong tampil "menunggu" dengan alasan.
- [ ] Tiga versi zona Kalteng di buku dan web dengan pembanding `<`: versi `kendala.json` A188/B418/C89/D170, jalan utama OSM A198/B429/C81/D157, semua jalan OSM A469/B158/C167/D71, dengan syarat verifikasi `track` di musim hujan; warna zona buku/deck biru dan emas, semua media dengan huruf A–D dan pola.
- [ ] Median jarak air 1,02 km dan jalan 2,27 km, 44 kompleks tanpa jalan kendaraan dalam 16 km, beda elevasi median -3,9 m (DSM berkanopi), GSW 120/103/642, MCD64A1 300 kompleks ≥ 3 tahun, empat tahun Jul–Okt terkering 2006, 2015, 2002, 2019, catatan GloFAS belum ditarik.
- [ ] Gambar teknik SIPPA-G-01 s.d. G-12 dengan blok pengesahan insinyur berlisensi kosong dan catatan wajib verifikasi.
- [ ] RAB bertingkat gerbang dengan baris tambahan baca-C, modul banjir, irigasi, dan slot harga heli menunggu BNPB.
- [ ] NPV, BCR, Monte Carlo dengan manfaat bawaan 0 dan varian + banjir, + banjir + irigasi.
- [ ] Matriks respons FRP x luas x zona; matriks RACI per tahap; opsi konsesi sebagai kebijakan.
- [ ] Draf surat permintaan data (Lampiran I) dan protokol A/B pra-registrasi.
- [ ] Vonis pilot keputusan 53 tercatat dari data (tujuh butir) dan terpisah dari vonis "lebih baik".
- [ ] Web: semua layar §9.1.1 di produksi; `npm run uji`, `npm run uji:sippa` hijau; cakupan terdaftar; pengulas wajib tanpa temuan kritis (U5).
- [ ] Form lapangan bekerja luring dan kirim ulang tidak menggandakan; formulir kertas G3-lite identik.
- [ ] Studio mereproduksi angka jalan-ulang baca-C dan membandingkan S0, S0B, S1, S2, S3, dan skenario tersimpan berdampingan.
- [ ] Kit bisa dilacak dari gudang ke lapangan ke daerah banjir dan kembali, dengan QR, kehilangan komponen, jam pompa, dan m3 banjir.
- [ ] Telemetri menerima pesan uji dan menandai nilai di luar rentang.
- [ ] Laporan PDF lima templat dari data, logo BNPB saja.
- [ ] Mode gelap, Bahasa Indonesia, ponsel untuk lapangan, INP < 200 ms, aksesibilitas §9.13.
- [ ] Agent `sippa` dan `penulis-kajian` terdaftar dan tiap berkas baru punya tepat satu pemilik.

**Tidak boleh ada** (keputusan 50 dan aturan repo; dijaga gerbang di §9.12.2 dan QA buku):

- [ ] Klaim "terbukti" untuk SIPPA atau kata "terbukti" tanpa uji dan rujukan.
- [ ] Angka tanpa sumber, tanpa waktu, atau tanpa label keyakinan; angka ketikan di buku.
- [ ] Jaringan pipa tetap (koridor semi-permanen atau backbone) sebagai rekomendasi.
- [ ] Pembelian massal sebelum pilot dan sebelum G5; tabel nasional tanpa label "rencana bersyarat, bukan pengadaan".
- [ ] Injeksi lebih dari 5 m di masukan mana pun (kalkulator, Studio, 3D, form, D1).
- [ ] Nama atau logo pihak lain selain BNPB di sampul, kepala, kaki, deck, laporan PDF; nama perusahaan konsesi di layar atau laporan; merek alat di luar kolom sumber/pustaka.
- [ ] Bab kritik gagasan awal; bab dasar hukum TNI.
- [ ] Data SIPPA di `public/` atau di rute tanpa sesi; secret atau token di berkas terlacak.
- [ ] Em dash, titik tengah (U+00B7), "titik api" untuk data satelit, `toFixed` mentah di teks tampil.
- [ ] Manfaat banjir atau irigasi yang dihitung tanpa syarat keras anti de-watering.
- [ ] Pernyataan padam dari drone termal saja.
- [ ] Deploy, commit, atau push dari subagent; `git add -A`; penyuntingan migrasi yang sudah jalan; penyuntingan berkas `* 2.*`.
