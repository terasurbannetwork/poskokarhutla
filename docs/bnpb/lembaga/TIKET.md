# TIKET: Direktori Lembaga Mitra dan Analisa Kemitraan

Turunan dari `PRD.md` (30 Okt 2026). Ambil satu tiket dan kerjakan hanya cakupannya. Tiket yang tidak bergantung satu sama lain boleh jalan paralel. Kolom "Bukti siap" adalah perintah atau pemeriksaan yang membuktikan tiket selesai.

Aturan bersama semua tiket:

- Data lembaga dan hasil panen tidak boleh masuk repo atau `public/`. Hasil panen ditaruh di scratchpad atau `~/Documents/akademisi-lembaga/`, dan hasil akhirnya di R2 `akademisi/*.json`.
- Panen dilakukan pelan, dengan User-Agent jujur. Diblokir atau bertemu CAPTCHA berarti berhenti dan lapor.
- Tiap kontak wajib punya URL sumber. Tidak ada nomor karangan.
- Subagent tidak commit, tidak push, dan tidak deploy.

## Fase 0: fondasi

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| L00 | Skema `lembaga.json` (PRD §4) sebagai validator Node `scripts/akademisi/lembaga_cek.mjs`. Validator menolak: kategori atau bidang di luar daftar, `prov` bukan kode BPS, kontak tanpa sumber, URL bukan https, dan telepon gagal dinormalkan E.164. | penulis-gerbang | — | `node scripts/akademisi/lembaga_cek.mjs contoh.json` menolak 6 contoh rusak dan meloloskan 1 contoh sah (uji di `tests/agen/`) |
| L01 | Daftar benih nasional, sekitar 150 lembaga untuk kategori 1, 2, 4 sampai 12: nama, singkatan, kategori, situs resmi. Disusun tangan dari pengetahuan umum lalu diperiksa situsnya hidup. | sesi induk | L00 | berkas benih lolos validator, dan semua situs menjawab 200/30x |

## Fase 1: panen (paralel, satu agen per baris)

| Tiket | Isi | Sumber | Bukti siap |
| --- | --- | --- | --- |
| L10 | BPBD 38 provinsi dan kab/kota: alamat, telepon kantor, pusdalops 24 jam, email, situs, kepala pelaksana | laman BNPB, situs pemda dan BPBD | cakupan per provinsi dilaporkan, minimal 1 BPBD bertelepon di tiap provinsi |
| L11 | Basarnas (kantor SAR), UPT BMKG, pos pengamatan PVMBG, Daops Manggala Agni | basarnas.go.id, bmkg.go.id, MAGMA, laman KLHK | jumlah per jenis cocok dengan daftar resmi masing-masing, selisihnya dijelaskan |
| L12 | PMI pusat, provinsi, dan kab/kota yang punya laman; Tagana | pmi.or.id, laman PMI daerah | 38 PMI provinsi terisi |
| L13 | BAZNAS, LAZ berizin (SK, masa berlaku), filantropi, platform donasi, status izin PUB | baznas.go.id, Filantropi Indonesia, Kemensos | tiap LAZ punya `izin.nomor` dan sumber, ACT tercatat `dicabut` |
| L14 | Kerelawanan dan keagamaan nasional beserta cabang yang tercantum (MDMC, LPBI NU, Caritas, Tzu Chi, YEU, Wahana Visi, BSMI, MER-C, SAR MTA, dan lain-lain) | laman resmi | daftar benih kategori 1 dan 7 terisi kontak |
| L15 | Jejaring PRB: Planas, Forum PRB daerah, MPBI, HFI, IABI, FPT PRB | laman resmi, media sosial resmi forum | forum PRB provinsi yang ditemukan dilaporkan per provinsi |
| L16 | Internasional di Indonesia dan mitra donor: UN, IFRC, ICRC, INGO, AHA Centre, ASEAN, JICA, KOICA, DFAT, GIZ, KfW, Bank Dunia, ADB, AIIB, IsDB | ReliefWeb API, laman kantor negara | tiap lembaga punya kontak kantor Indonesia, atau ditandai "kantor regional" |
| L17 | Dunia usaha, komunikasi darurat, asosiasi profesi, kesehatan darurat, riset non-kampus, penerbit jurnal swasta | laman resmi | daftar benih kategori 8 sampai 12 terisi kontak, dan 19 penerbit jurnal yatim punya entri |
| L1S | Pemilik sensor dan inovasi (kategori 13): BRIN eks LAPAN, BMKG, BIG, PVMBG, BBWS, Pushidrosal, kampus pembuat EWS, perusahaan drone dan IoT, startup kebencanaan, dengan field `sensor` dan `inovasi_produk`. Ditambah `sensor.json` berisi titik stasiun dari sumber terbuka. | laman resmi, IOC Sea Level Monitoring, FDSN (GEOFON, IRIS), portal data terbuka | tiap pemilik jaringan punya ringkasan sensor bersumber, dan jumlah titik per jenis dilaporkan |
| L1W | Swasta yang berpotensi membantu (PRD §3.1, sub-kategori dunia usaha) dengan `potensi_bantuan` bersumber | laman resmi, laporan keberlanjutan, rilis BNPB/BPBD, berita | tiap perusahaan punya kontak atau situs bersumber, dan minimal separuhnya punya `potensi_bantuan` bersumber |
| L1I | Direktori inovasi (PRD §6.7): `inovasi.json` | BRIN, katalog inovasi Kemendiktisaintek, Business Innovation Center (100+ Inovasi Indonesia), jurnal, berita, PDKI (paten), laman pembuat | tiap inovasi punya pembuat, status, dan sumber, ditambah daftar penerapan per provinsi |
| L1D | Direktori sistem data (PRD §6.8): `sistem_data.json`, dengan akses diuji dan `dipakai_pantau` dicocokkan ke domain pipeline repo | laman resmi tiap sistem, portal Satu Data, dokumentasi API | tiap sistem punya pemilik, akses, URL, dan status hidup; daftar "bisa diambil, belum dipakai" dilaporkan |
| L18 | 3W: proyek aktif donor dan INGO di Indonesia per provinsi | IATI Datastore API, HDX | `lembaga_3w.json` lolos validator, dan jumlah proyek per donor dilaporkan |
| L19 | Aset riset: layanan lab dan alat BRIN, ditambah lab pusat studi kampus | ELSA BRIN (katalog publik), laman lab dari `pusat_studi.json` | `aset_riset.json` lolos validator, jumlah per jenis alat dilaporkan |

Setiap tiket panen menyerahkan:

- berkas JSON hasil;
- log URL yang dibuka;
- daftar yang gagal atau diblokir.

## Fase 2: gabung dan unggah

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| L20 | Gabung, buang duplikat (nama, singkatan, domain situs), dan tautkan `induk` (cabang ke pusat). Lengkapi koordinat: alamat, lalu kota, lalu provinsi, dan simpan `lokasi_sumber`-nya. | sesi induk | L10–L19 | `lembaga_cek.mjs` lolos, dan laporan jumlah per kategori, per provinsi, serta persen berkontak |
| L23 | Logo lembaga: dari halaman depan situs resmi tiap lembaga ambil apple-touch-icon, ikon terbesar, atau og:image persegi, lalu simpan URL-nya di `logo` (https saja, lewat `urlAman`) | sesi induk | L20 | persen lembaga berlogo dilaporkan, dan 20 logo acak tampil benar |
| L21 | Cek acak 30 kontak dengan membuka ulang laman sumbernya. Dikerjakan subagent bersih tanpa riwayat panen. | verifier (konteks bersih) | L20 | nol kontak tanpa sumber, minimal 90% cocok, temuan salah diperbaiki |
| L22 | Unggah ke R2: `akademisi/lembaga.json`, `lembaga_3w.json`, `aset_riset.json`, dengan cadangan versi lama di `akademisi/cadangan/` | sesi induk | L21 | `npx wrangler r2 object get ... --remote` mengembalikan berkas yang sama (sha256) |

## Fase 3: worker

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| L30 | Tambah `lembaga`, `lembaga_3w`, `aset_riset` ke `DATA_AKADEMISI` (`src/akademisi.js`) | warga-api | — | uji integrasi: 401 tanpa sesi, 200 dengan sesi staf |
| L31 | `GET /api/akademisi/lembaga/terdekat?lat&lon&kategori&n`: haversine dengan cache isolate, pola `terdekat()` | warga-api | L30 | uji integrasi: 400 untuk lat di luar Indonesia, kategori asing, dan n > 20; urutan jarak benar pada data uji |
| L32 | `POST /api/akademisi/ringkasan {rumpun, prov}`: 30 riset teratas, Workers AI, skema JSON, cache R2 30 hari, batas laju per sesi | warga-api | — | uji integrasi: 401, 400, 429; panggilan kedua dilayani dari cache tanpa AI |
| L33 | Review rute L30 sampai L32 | guard-api + security-reviewer | L30–L32 | laporan tanpa temuan terbuka |

## Fase 4: layar

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| L4P | Peta berlogo (PRD §6.1a), tampilan pertama tab Lembaga: pin logo dengan decluttering, lapisan Lembaga/Kampus/Pusat studi, pita wilayah berangka, mode choropleth kab/kota dengan panel kiri, peringkat dan legenda, panel profil kanan saat diklik | layar-peta | L30 | uji browser: klik pin membuka profil, pita terbang ke provinsi, choropleth menampilkan tooltip, dan tidak ada pembekuan saat geser/zoom |
| L40 | Tab Lembaga: daftar, cari, chip kategori berangka, provinsi, skala, bidang, paginasi, kartu dengan kontak bersumber dan pil izin/Mitra BNPB | layar-peta | L30 | uji browser 1.024 px dan 375 px, dan klik saring tidak membekukan layar (INP) |
| L41 | Dialog profil lembaga: kontak lengkap dan sumbernya, pimpinan, cabang, proyek 3W, jurnal terbitannya (memakai `jurnalKampus`/`kartuJur`) | layar-peta | L40 | jurnal IAGI, HAGI, dan AHA Centre tampil di profil lembaganya |
| L42 | Analisa: peta sebaran di atas indeks risiko provinsi, tabel kesenjangan wilayah, matriks provinsi x bidang, grafik komposisi; semuanya interaktif dengan tooltip | layar-peta | L40 | angka analisa sama dengan hitungan ulang dari `lembaga.json` (skrip cek) |
| L43 | Proyek mitra (3W): tabel dengan saringan provinsi, donor, sektor, dan label keterbatasan IATI | layar-peta | L22 | jumlah dan nilai total sama dengan berkas |
| L4I | Tab Inovasi (PRD §6.7): ringkasan dan grafik, saringan, kartu, peta penerapan, tautan ke profil pembuat | layar-peta | L30 | uji browser: saringan rumpun dan status jalan, klik titik penerapan membuka kartu |
| L4D | Tab Sistem data (PRD §6.8): ringkasan, saringan, kartu, pil "Sudah dipakai Centurisk97", tautan ke profil pemilik | layar-peta | L30 | uji browser: saringan akses dan rumpun jalan |
| L44 | Lembaga terdekat di pop-up kejadian, di samping pakar terdekat | layar-peta | L31 | pop-up kejadian karhutla Riau menampilkan BPBD, Manggala Agni, dan PMI terdekat |
| L45 | Tombol "Ringkas temuan" di Riset daerah, dengan tautan per temuan dan label ringkasan otomatis | layar-peta | L32 | ringkasan banjir Jawa Tengah tampil, dan tiap temuan bertaut karya |
| L46 | Aset riset di tab Pusat studi | layar-peta | L22 | saringan jenis dan provinsi jalan |
| L47 | Daftar pendek dan unduh lembaga (XLSX, DOCX, PDF), memakai mesin ekspor daftar pendek pakar | layar-peta | L40 | tiga format terunduh dan kolom kontak beserta sumber ada |
| L48 | Hak koreksi di kartu lembaga | layar-peta + warga-api | L40 | laporan koreksi masuk antrean admin yang sudah ada |
| L49 | Tombol dummy (DUMMY.md) untuk tab Lembaga, Analisa, Proyek mitra, dan Aset riset | layar-peta | L40–L46 | `gerbang-dummy` dan `gerbang-dummy-layar` hijau |
| L4R | Review layar | selera-angka + inp-reviewer | L40–L49 | laporan tanpa temuan terbuka |

## Fase 5: isian mandiri dan pemutakhiran

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| L50 | Target unit baru "Aset riset kampus" dan "Lembaga mitra" di /pendataan (Fase 1), dengan hasil ditandai "dilaporkan sendiri" | warga-api | L22 | uji integrasi isian /pendataan untuk dua target baru |
| L51 | Pemutakhiran bulanan: skrip panen ulang lembaga yang `diperiksa` lebih dari 6 bulan, plus laporan perubahan kontak | mekanik-mesin | L22 | satu putaran kering menghasilkan laporan perubahan |
| L52 | Uji integrasi tercatat di `tests/e2e/cakupan.json` untuk L30 sampai L32 dan L50 | penulis-gerbang | L30–L50 | `gerbang-test-integrasi` hijau |

## Urutan cepat (one shot)

1. L00 dan L01, lalu L10 sampai L19 paralel (paling banyak 5 agen bersamaan), sekaligus L30 sampai L32 paralel di sisi worker.
2. L20 dan L21, lalu L22.
3. L40, lalu L41 sampai L47 paralel, lalu L48 dan L49.
4. Review: L33, L4R, dan review bersih seluruh diff.
5. L50 sampai L52.
6. Commit dengan path spesifik.
7. `terbit.yml` hijau, lalu periksa aset tayang dan `/api/status`.

## Fase 6: pengayaan strategis (PRD §6.19–6.21)

- [ ] E1 BPBD: kelas, Pusdalops, TRC, armada, dokumen KRB/RPB/Renkon, Destana, DIBI 5 tahun, piket → `bpbd_kapasitas.json`
- [ ] E2 Relawan/donasi/LSM + CSR: bidang, jangkauan, kerahan, sertifikasi, respons, klaster; bantuan, aset pinjam, fasilitas, kontak CSR → `kapasitas_lembaga.json`
- [ ] E3 Pakar + tokoh: bisa_untuk, lapangan, bahasa, karya kunci; keterlibatan, jangkauan, isu, catatan reputasi → `pengayaan_orang.json`
- [ ] E4 Inovasi + sistem data + pendanaan: TRL, harga, paten/SNI/e-katalog; akses/frekuensi/cakupan; siklus/tenggat/plafon/syarat/focal point → `pengayaan_produk.json`
- [ ] E5 Pustaka ringkasan + wilayah celah (hitung) → `pengayaan_pustaka.json`, `wilayah_celah.json`
- [ ] E6 hubung.mjs: gabung E1–E5, sisi `mendanai/melaksanakan/memakai` bersumber, skor kapasitas + celah → graf.json, kuadran.json (uji di tests/agen/hubung.test.mjs)
- [ ] E7 Layar: lembar per entitas menampilkan butir baru; tab/ panel Kuadran; layar Jaringan dukungan
- [ ] E8 Pengulas bersih (angka, INP, keamanan), cek acak 30 butir baru ≥90% cocok, unggah R2 (izin pemilik), commit, tayang
