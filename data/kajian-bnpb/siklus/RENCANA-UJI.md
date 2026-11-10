# RENCANA-UJI: Siklus Bencana

Dokumen kesembilan dalam urutan otoritas (KEPUTUSAN-AWAL > PRD > ALUR > ALGORITMA > DESIGN-SYSTEM > DESAIN-TEKNIS > KEAMANAN-PRIVASI > berkas ini > TIKET). Menang atas `TIKET.md`. Tidak menambah fitur; menetapkan perintah apa yang harus keluar 0. Versi 1.0, 10 Nov 2026.

Singkatan: KA = `KEPUTUSAN-AWAL.md`; ALG = `ALGORITMA.md`; DT = `DESAIN-TEKNIS.md`; KP = `KEAMANAN-PRIVASI.md`; DS = `DESIGN-SYSTEM.md`. Peran: WG tamu, BP akun instansi, PD pusdalops, KO koordalops, PM pimpinan, SA Super Admin, SIS pipeline Bearer.

## 0. Definisi selesai dan aturan bukti

**Selesai** = (a) semua perintah di kolom Bukti tiket keluar 0, (b) pemeriksa berkonteks bersih (AGENTS.md §3.2) melapor tanpa temuan tinggi, (c) status diubah `selesai` oleh sesi induk saat commit. Pengerja tidak memverifikasi kerjanya sendiri.

1. **Logika di luar JS murni diuji dengan menjalankannya** (`~/.claude/TEST.md`). CHECK, trigger, UNIQUE, indeks parsial `sk_*`: migrasi apa adanya di Miniflare lewat `tests/warga/_bnpb.mjs` `siapkan()`, SQL langsung, bukan mock D1. Rute: panggil `worker.js` utuh. Alur lintas tabel: satu uji ujung ke ujung. Uji unit bermock BUKAN bukti untuk SQL, rute, atau R2.
2. **Self-check Python**: tiap skrip `scripts/siklus/<x>.py` punya subperintah `uji` tanpa jaringan (fixture di `tests/siklus/fixtures/`), dijalankan `python3 -I`. Pesan gagal menyebut angka dan sebab.
3. **Uji yang salah DITOLAK** wajib untuk tiap CHECK, trigger, gerbang peran, batas ukuran, dan anggaran: nilai sah lolos, nilai salah gagal dengan pesan yang diperiksa (`sk_fase: ...`, 403, 404 seragam, 409, 413, 429).
4. **Paritas Py dan JS**: fungsi murni yang ada di dua bahasa (`konst`, `kunci`, `pasang`, hitung Jitupasna dan renkon) memakai satu `tests/siklus/fixtures/acuan.json`. Pecahan selisih paling besar 1e-9; bilangan bulat dan teks sama persis.
5. **Invarian lintas fitur** (diuji di tiap gelombang, bukan sekali):

| Kode | Invarian | Cara uji |
| --- | --- | --- |
| INV-1 | Tidak ada kunci `total`, `jumlah_gabungan`, `rata` pada keluaran antarsumber | pemindai skema atas fixture `saji` dan jawaban rute; fixture dengan kunci itu DITOLAK |
| INV-2 | Data tidak ada = `null` tampil "tidak ada" atau "menunggu", tidak pernah 0 | tiap fungsi hitung diberi masukan kosong; hasil `null`; layar tidak memuat teks "0" untuk sel itu |
| INV-3 | Tiap angka bawa label dari enam nilai (KA 8), sumber, waktu | pemindai atas jawaban rute: angka tanpa `y`/`s`/`t` gagal |
| INV-4 | Tiap tulis D1 = satu baris `sk_jejak` dalam batch yang sama | uji: tulis tanpa jejak DITOLAK; hitung baris sebelum dan sesudah |
| INV-5 | Staf nyata tidak melihat `dummy = 1`; dummy tidak masuk ingest, ringkasan publik, R2 | baris dummy disemai, jawaban staf dan publik tidak memuatnya |
| INV-6 | Tanpa NIK, KK, KTP, nama korban, koordinat rumah di `sk_*`, R2 `siklus/`, `public/siklus/**` | pemindai gerbang `siklus_publik` (surel, telepon, koordinat lebih dari 3 desimal) |
| INV-7 | Titik panas, firespot, luas, belum padam, dan terdampak karhutla hanya dari sistem kita; `terdampak` karhutla dari sumber lain bernilai `null` dan tidak tampil | uji: fixture berisi angka Koordalops, DIBI, atau Logbook untuk jenis karhutla tidak pernah terbawa ke keluaran `saji` dan jawaban rute; `terdampak` = `null`, bukan 0 |
| INV-8 | Teks tampil tanpa titik tengah (U+00B7) dan em dash; kata terlarang tidak muncul | pemindai statis atas `public/siklus/**` dan `kamus.json` |
| INV-9 | Pembangunan ulang dari nol memberi ID `KJ-` yang sama | jalankan `pasang.py` dua kali dan dengan urutan masuk teracak |

## 1. Lapisan dan perintah

| Logika | Uji | Perintah |
| --- | --- | --- |
| Fungsi murni Python | `uji` per skrip | `python3 -I scripts/siklus/<x>.py uji` |
| Paritas Py dan JS | `acuan.json` | `node --test tests/siklus/paritas.test.mjs` |
| Fungsi murni JS | node:test | `node --test tests/siklus/hitung.test.mjs` |
| CHECK, trigger, UNIQUE | SQL di Miniflare | `node --test tests/warga/siklus_skema.test.mjs` |
| Rute dan peran | `worker.js` utuh | `node --test tests/warga/siklus_*.test.mjs` |
| Alur ujung ke ujung | satu uji panjang | `node --test tests/warga/siklus_alur.test.mjs` |
| Layar | Chrome CDP 1440 dan 390 | `node --test tests/siklus/layar_*.test.mjs` |
| Gerbang statis | registri, berkas publik, XSS statis | `node --test tests/siklus/gerbang_*.test.mjs` |
| Agen | paket, kartu standar, peta data | `npm run uji:agen` |
| Seluruh program | skrip `uji:siklus` | `npm run uji:siklus` (DT 10) |

`npm run uji:siklus` menjalankan semua `uji` Python di DT 10, lalu `node --test --test-concurrency=1 tests/siklus/*.test.mjs tests/warga/siklus_*.test.mjs`. Berhenti di galat pertama per berkas. `npm run uji:warga` hijau wajib sebelum tiap rilis gelombang (cakupan.json, migrasi_beku.json).

## 2. G0: lapis gudang data

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus dari ALG |
| --- | --- | --- | --- | --- |
| UJ-G0-01 | registri: tiap sumber punya pemilik, pemakai, jadwal, lisensi, jeda; sumber `gagal` tidak diambil | `python3 -I scripts/siklus/registri.py uji`; `node --test tests/siklus/gerbang_registri.test.mjs` | Py + gerbang | sumber tanpa pemakai DITOLAK; `sumber.json` rusak gagal |
| UJ-G0-02 | sidik isi SHA-256 kanonik | `python3 -I scripts/siklus/gudang.py uji`; paritas | Py + paritas | sidik `abc` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`; `{"b":1,"a":2}` dan `{"a":2,"b":1}` sama |
| UJ-G0-03 | anggaran ukuran | `gudang.py uji` | Py | a = 100 MB, t = 90 MB: baru 15 MB tolak (kelebihan 5 MB); baru 10 MB terima; timpa 8 MB dengan 12 MB terima (94); laporan tolak memuat `{lapis, berkas, u, t_L, a_L, kelebihan}` |
| UJ-G0-04 | tiga lapis tidak saling menimpa: mentah hanya tambah; unggah isi sama dilewati `tak_berubah` | `gudang.py uji` (folder `--lokal`) | Py | sidik sama: tidak ada berkas baru; beda: berkas bertanggal baru |
| UJ-G0-05 | panen sopan: jeda, 3 kali coba, 429 `Retry-After`, UA proyek, tanpa CAPTCHA; gagal total mempertahankan `saji` lama dan memberi `menunggu` | `python3 -I scripts/siklus/panen.py uji` (server tiruan) | Py | tiga kegagalan beruntun: saji lama utuh, nilai bukan 0; keluar non-nol hanya bila `uji` gagal |
| UJ-G0-06 | kunci wilayah tunggal | `python3 -I scripts/siklus/kunci.py uji` | Py | `32\|Bogor`, `3201`, `32.01` jadi `3201`; pemekaran; tak terpetakan dihitung `kab_tak_terpetakan`, bukan dibuang diam-diam |
| UJ-G0-07 | pembersihan DIBI | `python3 -I scripts/siklus/bersih_dibi.py uji` | Py | masuk = tersisa + dibuang; tiap alasan dihitung |
| UJ-G0-08 | pembersihan Logbook | `python3 -I scripts/siklus/bersih_logbook.py uji` | Py | 10 baris: 2 tanggal kosong, 1 tahun 2923, 1 duplikat persis, 1 kab tak terpetakan, 1 jenis lain, 4 biasa: masuk 10, bersih 6, dibuang `{tanggal_kosong 2, tanggal_mustahil 1, duplikat_persis 1}`, ditandai `{wilayah_belum_terpetakan 1, jenis_tak_dibandingkan 1}`; 6 + 4 = 10; tanpa kolom teks bebas di `bersih` |
| UJ-G0-09 | saring teks luar (KP 6.1): NFKC, buang bidi dan kontrol, buang `<` `>`, potong | `python3 -I scripts/siklus/bersih_logbook.py uji` | Py | `<img onerror=x>` jadi `img onerror=x`; U+202E dibuang; 5.000 huruf dipotong ke batas kolom; nama OSM bernomor telepon tidak menggagalkan batch |
| UJ-G0-10 | `saji.py`: manifest, laporan_bersih, registri; ukuran di bawah batas DT 5.2; kunci `total` ditolak | `python3 -I scripts/siklus/saji.py uji` | Py | berkas melebihi batas gagal; fixture berkunci `total` gagal (INV-1) |
| UJ-G0-11 | jumlah berkas `public/` baru | `node --test tests/siklus/gerbang_publik.test.mjs` | gerbang | `git ls-files public/siklus` paling banyak 40 (DT 5.3); janji KA 28 paling banyak 200 |
| UJ-G0-12 | data baru punya pemakai dan jadwal | `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa` | gerbang agen | sumber siklus tanpa pemakai atau jadwal gagal; utang peta tidak bertambah |
| UJ-G0-13 | `rollback.sql` memuat DROP urut terbalik untuk semua tabel `sk_*` (empat gelombang) | `python3 -I scripts/siklus/unggah_riwayat.py uji` (daftar DT 3); `node --test tests/warga/siklus_skema.test.mjs` (setelah migrasi G1 ada) | Py + integrasi | tiap tabel `sk_*` di migrasi ada di `rollback.sql`; jalan di Miniflare mengosongkan skema |
| UJ-G0-14 | unggah hanya berkas berubah dan lewat manifest | `python3 -I scripts/siklus/gudang.py uji` | Py | manifest memuat sidik; berkas sama tidak diunggah; urutan manifest terakhir; tanpa perintah daftar objek |

## 3. F1: Buku Besar Kejadian

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F1-01 | CHECK `sk_kejadian` dan `sk_kejadian_kab`: format `KJ-` (16 karakter, alfabet Crockford), rentang koordinat, `fase` termasuk `digabung` hanya bersama `ke`, `asal`, `publik` hanya dengan ringkasan dan fase bukan `terdeteksi`/`dibatalkan`/`digabung` | `node --test tests/warga/siklus_skema.test.mjs` | integrasi Miniflare | tiap nilai salah ditolak; `dummy` ada di semua tabel `sk_*`; migrasi dijalankan dua kali tanpa galat |
| UJ-F1-02 | trigger `sk_kejadian_fase`: hanya maju atau mundur satu langkah, `dibatalkan` hanya dari `terdeteksi`; `sk_kejadian_publik` menolak `publik=1` saat `dibatalkan` | idem | integrasi | lompat `terdeteksi` ke `pemulihan` ditolak dengan `sk_fase:`; langkah sah lolos |
| UJ-F1-03 | UNIQUE `(sumber, kode, dummy)` dan CHECK `terpasang` = `kejadian_id` terisi | idem | integrasi | ingest kode sama dua kali: baris kedua tidak menimpa; `terpasang` tanpa `kejadian_id` ditolak |
| UJ-F1-04 | ID `KJ-` deterministik | `python3 -I scripts/siklus/pasang.py uji`; `node --test tests/siklus/paritas.test.mjs` | Py + paritas | `banjir\|3201\|2026-03-02` = `KJ-2026-9A2WGN3G`; `banjir+longsor\|3201\|2026-03-02` = `KJ-2026-MT5Z0ZVT`; sama untuk tiap permutasi urutan masuk (INV-9); tabrakan hash ulang `kunci\|2` = `KJ-2026-8N57ZZ0Y` (dan `KJ-2026-K3JQG02Y` untuk kunci gabungan), panjang tetap 16, tanpa sufiks; ID `digabung`/`dibatalkan` tidak dipakai ulang; hasil Py dan JS sama persis |
| UJ-F1-05 | karhutla `K####` tidak jadi kunci | `pasang.py uji` | Py | kluster (-2,505; 114,003) hari 1 `K0003`, hari 2 `K0011`, kab 6211: `sel:-126:5700` sama, tetap satu `KJ-` |
| UJ-F1-06 | jendela 3 hari dan tiga hasil pemasangan | `pasang.py uji` | Py | A banjir 3201 mulai 2026-03-02: logbook 03-04 (selisih 2) tambah; logbook 03-09 (selisih 7) `KJ-` baru; dengan B mulai 03-05 dan logbook 03-03: selisih 1 dan 2, ambigu, masuk antrean, tidak ditebak |
| UJ-F1-07 | multi-kabupaten | `pasang.py uji` | Py | rekaman `kab[]` satu `KJ-` dengan `kab_utama` terkecil, entri indeks per kab; DIBI satu-kab yang cocok lewat salah satu kab menambah entri |
| UJ-F1-08 | gabung, penyintas, alias, koreksi manual | `node --test tests/warga/siklus_kejadian.test.mjs` | rute + D1 | A (03-02) dan B (03-05) gabung: B fase `digabung`, `ke` = A, tak ada di daftar; A gabung ke C (03-01): resolusi(B) = B->A->C; koreksi manual memindahkan satu baris sumber ke `KJ-` lain atau baru dan menulis `sk_jejak` (`asal_id` terisi); tidak ada rute pecah; rantai lebih dari 32 langkah gagal keras; fase berbeda 409; `publik` turun ke 0 dalam batch yang sama saat fase kembali ke `terdeteksi` atau `dibatalkan` |
| UJ-F1-09 | selisih antarsumber | `node --test tests/siklus/hitung.test.mjs`; paritas | Py + JS | meninggal DIBI 12, Logbook 15, sistem null: n = 2, selisih 3, persen 20, "Logbook lebih tinggi 3"; sumber ketiga 9: selisih 6, persen 40; DIBI 0 dan Logbook null: n = 1 tanpa selisih (INV-1, INV-2) |
| UJ-F1-10 | fase otomatis terbatas | `pasang.py uji` | Py | DIBI saja `terdeteksi`; plus Logbook tanda `siap_verifikasi`, fase tetap; `terakhir` 03-02 hari ini 03-06 basi (tampilan saja) |
| UJ-F1-11 | arsip beku deterministik | `python3 -I scripts/siklus/arsip_kejadian.py uji` | Py | id stabil antar jalan dan sama dengan hasil `pasang.py` untuk kunci yang sama (satu skema, tanpa pembeda arsip dan D1); `selisih` hanya bila dua sumber melapor; tanpa kunci `total`; baris tanpa wilayah ada di `tanpa_wilayah`, bukan di `k<kab4>.json` |
| UJ-F1-12 | promosi arsip ke D1 | `node --test tests/warga/siklus_kejadian.test.mjs` | rute + R2 | body `{tahun,kab4}`: id arsip dipromosikan satu kali (baris `sk_kejadian` + `sk_kejadian_kab`), kedua kali 200 tanpa baris baru; id tidak di berkas itu 404; baris tanpa wilayah tidak bisa dipromosikan (400); `GET :id` mencari D1 dulu, lalu R2 hanya bila `tahun` dan `kab4` ada; berkas arsip `k<kab4>.json` di atas 128 KB tidak di-parse |
| UJ-F1-13 | ingest Bearer `PIPA_TOKEN`; `ingest/jendela` dan `ingest/sumber` dipaginasi | `node --test tests/warga/siklus_ingest.test.mjs` | rute + D1 | tanpa Bearer 401 (waktu-tetap); halaman kedua lewat `lanjut`, tanpa baris hilang atau ganda; cookie sesi pada ingest 400; batch 201 ditolak 413; kiriman dummy 400; dua kali kirim sama: `duplikat`, nol baris baru; satu batch + jejak `sistem:ingest` |
| UJ-F1-14 | publik tidak bocor | `node --test tests/warga/siklus_kejadian.test.mjs` | rute | `publik/kejadian/:id`: hanya `publik=1,dummy=0`; id tidak ada, id `digabung`, dan `publik=0` memberi 404 yang sama byte demi byte; header `s-maxage=300`; ringkasan berisi telepon atau surel ditolak; angka di bawah 5 tampil "di bawah 5" |
| UJ-F1-15 | pembersihan XSS rute | `node --test tests/warga/siklus_xss.test.mjs` | rute + layar | nama `<img onerror>`, `javascript:`, bidi, 5.000 huruf tampil sebagai teks terpotong; tautan keluar dari templat host tetap |
| UJ-F1-16 | layar daftar dan detail | `node --test tests/siklus/layar_kejadian.test.mjs` | CDP 1440 dan 390 | dengan dummy: dampak per sumber berdampingan, kolom selisih ada, tiada kolom "total"; ID alias mengarah ke penyintas; kosong tampil kata, bukan 0 |

## 4. F2: Peta Paparan per Bangunan

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F2-01 | kelas InaRISK per sel | `python3 -I scripts/siklus/bahaya_kelas.py uji` | Py | n = 10, 20, 30, 40 dengan H = 0,20; 0,33; 0,66; 0,70: rendah 10, sedang 50, tinggi 40 (jumlah 100); H = 0,661 tinggi; nodata/gagal = kelas `null` bukan rendah; konstanta batas sama dengan `terpapar.py` |
| UJ-F2-02 | agregasi sel ke desa dan kecamatan | `python3 -I scripts/siklus/paparan.py uji` | Py | provinsi tanpa grid `terliput:false`, `kab` kosong, tidak pernah `n:0`; desa tanpa poligon lewat titik pusat terdekat dalam kecamatan sama |
| UJ-F2-03 | silang zona dan galat posisi | `paparan.py uji` | Py | radius karhutla kumulatif 1, 3, 5 km; sel yang menyilang batas zona tidak dibagi; rob `tersedia:false`; galat tertulis +-0,8 km (kasar) dan +-0,08 km (halus) di keluaran |
| UJ-F2-04 | tiga sumber jiwa berdampingan | `paparan.py uji` | Py | WorldPop 12.000 jiwa, 4.000 bangunan, 1.000 terpapar: 3.000; Dukcapil 1.875 + 857,14 + 300 = 3.032,14; GHSL 2.700; tampil "WorldPop 3.000, Dukcapil 3.032, GHSL 2.700, selisih 332"; tiada rerata (INV-1) |
| UJ-F2-05 | fasilitas vital | `python3 -I scripts/siklus/fasilitas.py uji` | Py | 5 sekolah Dapodik dan 3 OSM: "Dapodik 5, OSM 3, selisih 2" bukan 8; ruas jalan 4 km + 2,5 km di zona, satu di luar: 6,5 km; berkas dengan kategori berkoordinat `obvitnas`, `bandara`, `pelabuhan` GAGAL (KP 12.1) |
| UJ-F2-06 | kontrak lama tidak berubah | `node --test tests/warga/siklus_kontrak_lama.test.mjs`; `npm run uji:warga` | integrasi | hash `terpapar.json`, `kec.json`, `grid_<prov>.json`; tiga rute `/api/bangunan/*` lulus uji lamanya; `bangunan/*` tidak dipindah |
| UJ-F2-07 | rute paparan dan peran | `node --test tests/warga/siklus_peran.test.mjs` | rute | `rinci` tanpa sesi 403 sebelum R2 disentuh; `rinci` dicatat `baca_rinci` di `sk_jejak`; ke-301 dalam sejam 429; BP kabupaten luar lingkup 404 seragam; PM `rinci` 403 |
| UJ-F2-08 | skema berkas saji | `python3 -I scripts/siklus/saji.py uji` | Py | `paparan/<prov>.json` kurang dari 6 MB, `kab` 1 MB, `rinci` 1 MB, `fasilitas` 500 KB; `rinci` satuan terkecil sel 110 m, koordinat bangunan tunggal tidak ada |
| UJ-F2-09 | layar `/siklus/paparan` | `node --test tests/siklus/layar_paparan.test.mjs` | CDP | label keterbatasan (ambang 0,70, +-0,8 km, kelas InaRISK tidak resmi) tampil; `terliput:false` tampil "tidak terliput"; panel peta bisa ditarik; pilihan penuh lebar |
| UJ-F2-10 | perluasan 38 provinsi terukur | dispatch `bangunan.yml`, laporan lama dan ukuran | manual [induk] | catat lama, ukuran cache, daftar `grid_*.json`; provinsi gagal tetap `terliput:false` dan harian tidak merah |

## 5. F3: Kaji Cepat Otomatis

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F3-01 | CHECK `sk_kaji` | `node --test tests/warga/siklus_skema.test.mjs` | integrasi | `yakin` selain `estimasi-model` ditolak (KA 9); `ditarik` tanpa `alasan_tarik` ditolak dan sebaliknya; UNIQUE `(kejadian_id, model, versi, dummy)` |
| UJ-F3-02 | kematian gempa | `python3 -I scripts/siklus/kaji_gempa.py uji`; paritas | Py | `per = {6: 1.000.000; 7: 500.000; 8: 200.000}`: v_P(6) = 7,549e-8, v_P(7) = 1,1714e-5, v_P(8) = 4,1256e-4; K_P = 88,44; v_I(6) = 5,051e-5, v_I(7) = 2,119e-4, v_I(8) = 8,889e-4; K_I = 334,2; rentang `[22,1; 353,8]`; kelas PAGER kuning; MMI 7,5 jadi 8; MMI 3,4 tidak dihitung |
| UJ-F3-03 | rentang selalu larik dua, rumah rusak gempa `menunggu` bukan 0 | `kaji_gempa.py uji` | Py | gagal ambil grid: `status:"menunggu_data"`, `korban:null`; `faktor_loo` 5,341 tampil dan tidak melebarkan rentang |
| UJ-F3-04 | banjir jam pertama | `python3 -I scripts/siklus/kaji_banjir.py uji` | Py | rentang `[jiwa_terpapar, batas_atas_jam1]`; tanpa kedalaman keluar "kedalaman belum tersedia", JRC tidak jalan |
| UJ-F3-05 | kurva JRC | `kaji_banjir.py uji` | Py | hunian d = 0,75 m: f = 0,41; luas 50 m2: 0,41 x 111 x 50 = 2.275,5 euro (harga 2010); d = 7 m f = 1; d <= 0 f = 0; tanpa kurs dan faktor harga, rupiah `menunggu` |
| UJ-F3-06 | karhutla dan gunung api hanya paparan | `kaji_banjir.py uji` | Py | sel berjarak 0,9; 2,5; 4,9; 6 km dengan n 100, 200, 300, 400: radius 1 km = 100, 3 km = 300, 5 km = 600 (kumulatif); sel 6 km tidak dihitung; luas karhutla tidak pernah dari Koordalops (INV-7) |
| UJ-F3-07 | uji balik | `python3 -I scripts/siklus/kaji_gempa.py uji` | Py | (m, o): (555; 5.700), (149; 104), (105; 20): bias -0,1038, faktor 5,279, cakupan 1/3; m atau o nol dicatat `tak_dihitung`; label tetap `estimasi-model` |
| UJ-F3-08 | rute kaji | `node --test tests/warga/siklus_kaji.test.mjs` | rute + D1 | ingest membuat versi baru, tidak menimpa; `ditarik` wajib alasan; `kejadian_id` tidak ada 404; BP luar lingkup 404; berkas `kaji/<KJ>.json` kurang dari 100 KB |
| UJ-F3-09 | layar kaji | `node --test tests/siklus/layar_kaji.test.mjs` | CDP | rentang, pil `estimasi-model`, galat kalibrasi, peringatan faktor 5,341 melebihi pita 4; isian petugas meja berdampingan |

## 6. F4: Jitupasna ke R3P

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F4-01 | CHECK dan trigger | `node --test tests/warga/siklus_skema.test.mjs` | integrasi | `sk_r3p`: `disetujui_*` terisi hanya untuk status `disetujui_pm` ke atas; `ditetapkan_resmi` tanpa `no_keputusan`/`tgl_keputusan` ditolak; `sk_jitupasna_final` menolak ubah baris; `jenis='rusak'` wajib `tingkat` dan `unit`; UNIQUE `(jitupasna_id, klien_id)`; `harga_rp` di luar rentang ditolak |
| UJ-F4-02 | klasifikasi kerusakan | `hitung.test.mjs`; paritas | JS + Py | p = 70 RS; 70,01 RB; 30 RS; 29,99 RR; hancur total isian terpisah |
| UJ-F4-03 | nilai kerusakan dan indeks harga | `hitung.test.mjs` | JS | RB 10 x 100 juta, RS 20 x 50 juta, RR 30 x 20 juta = Rp2.600 juta; IKK 95/100 = 2.470 juta; IHPB 118,0/112,0 = Rp2.602,32 juta; `h_RS` 120 juta > `h_RB` 100 juta bendera monoton; harga kosong `menunggu` bukan 0; melintasi patahan dasar IHPB `menunggu` |
| UJ-F4-04 | kerugian dan tiga penanda | `hitung.test.mjs` | JS | `air_minum` di permukiman dan infrastruktur: bendera hitung ganda; sektor ekonomi tanpa baris: bendera kosong; kewajaran gagal bila `V_s` melebihi semua unit dihargai hancur |
| UJ-F4-05 | peta ke lima sektor | `hitung.test.mjs` | JS | invarian: lima sektor + `belum_terpeta` = total Jitupasna; subsektor di luar tabel masuk `belum_terpeta` |
| UJ-F4-06 | stimulan dan DTH | `hitung.test.mjs` | JS | 10 RB, 20 RS, 30 RR = 600 + 600 + 450 = Rp1.650 juta (`asumsi-kebijakan`); 100 KK x 600.000 x 3 = Rp180 juta; tarif 50/25/10 tidak dipakai |
| UJ-F4-07 | batas 90 hari dan PDNA | `hitung.test.mjs` | JS | tanggap mulai 2026-08-01, hari ini 2026-09-15: berlalu 45, sisa 45; sisa nol atau minus "lewat batas", bukan penolakan; darurat berakhir 2026-09-30: PDNA BNPB 2026-09-16, BPBD 2026-09-23 |
| UJ-F4-08 | persen realisasi dan macet | `hitung.test.mjs` | JS | A 800 juta target 100 realisasi 50, B 200 juta target 10 realisasi 10: 50 dan 100, total tertimbang 60; target kosong "menunggu"; realisasi lebih dari target anomali tampil maks 100; `usulan` masuk 2026-08-01 dibaca 2026-10-05 (65 hari) macet, dibaca 2026-09-30 (60 hari) belum |
| UJ-F4-09 | rute Jitupasna dan R3P | `node --test tests/warga/siklus_pulih.test.mjs` | rute + D1 | R3P hanya dari Jitupasna `final` (409); `setuju` hanya PM dan hanya dari `diusulkan`; KO tak bisa menyetujui drafnya sendiri (403); `nilai_cair` melebihi `nilai_disetujui` ditolak; baris idempoten via `klien_id`; kejadian belum `tanggap`/`transisi` 409 |
| UJ-F4-10 | tidak ada tabel rumah rusak kedua | `node --test tests/warga/siklus_skema.test.mjs` | integrasi | skema tidak memuat kolom nama, NIK, koordinat rumah; `rekap_rumah_rusak` hanya hitungan per tingkat dari `bacaRekap` |
| UJ-F4-11 | alur ujung ke ujung | `node --test tests/warga/siklus_alur.test.mjs` | integrasi lintas tabel | ingest, kejadian, fase `tanggap`, Jitupasna, baris, hitung, `final`, R3P, `setuju` PM, `ditetapkan_resmi`, kegiatan terhubung `pemulihan`; tiap langkah menambah satu baris jejak |
| UJ-F4-13 | laporan Jitupasna lima bagian (PRD F4-08) | `node --test tests/siklus/layar_pulih.test.mjs` | CDP | unduhan staf memuat gambaran bencana, akibat dan dampak, kebutuhan R3, perkiraan biaya, penutup; nilai tanpa pil `asumsi-kebijakan` gagal |
| UJ-F4-12 | draf bukan dokumen resmi | `node --test tests/siklus/layar_pulih.test.mjs` | CDP | unduhan bertanda "DRAF, bukan dokumen resmi" sampai `ditetapkan_resmi`; angka tanpa pil `asumsi-kebijakan` gagal; formulir luring idempoten (kirim dua kali, satu baris) |

## 7. F5: Renkon Hidup dan Gladi

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F5-01 | CHECK renkon dan gladi | `node --test tests/warga/siklus_skema.test.mjs` | integrasi | status `ditetapkan`/`berlaku` tanpa `tgl_sah`, `berlaku_sampai`, `no_penetapan` ditolak; gladi `selesai` tanpa `rekomendasi` ditolak; `kedaluwarsa` bukan nilai `status` (ADR-09) |
| UJ-F5-02 | kebutuhan dasar Perka 7/2008 | `hitung.test.mjs`; paritas | JS + Py | J = 1.000, h = 5: 3.000 m2; beras 2.000 kg; makan 10.000; air bersih 51.000 liter; air minum 12.500 liter; jamban 50; sabun mandi 250 kg, cuci 200 kg; Sphere 3.500 m2 dan 75.000 liter berdampingan; KK kosong: tempat sampah `menunggu` |
| UJ-F5-03 | kesenjangan stok dan personel | `hitung.test.mjs`; `node --test tests/warga/siklus_renkon.test.mjs` | JS + rute | beras K 2.000, S baik 1.200, rusak 100: gap 800; air minum K 12.500 S 15.000: gap 0 surplus 2.500; tenda "tidak punya padanan"; terigu tanpa baris "stok belum tercatat" bukan 0; target personel kosong "target menunggu" |
| UJ-F5-04 | kesegaran renkon | `hitung.test.mjs` | JS | `tgl_sah` 2024-02-29: berlaku sampai 2027-02-28; hari ini 2026-12-15 sisa 75 `segera_habis`; 2027-03-01 sisa -1 `kedaluwarsa`; `tgl_sah` 2025-01-10, hari ini 2025-07-11: `perlu_reviu`; `tgl_sah` kosong `menunggu`; sama dengan `statusEfektif("renkon")` |
| UJ-F5-05 | skor kesiapan | `hitung.test.mjs` | JS | K1 = 1, K2 = 0,8, K3 = 0,8, K4 lewat: 86,67 "3 dari 4 komponen"; komponen tersedia kurang dari 2: `menunggu` |
| UJ-F5-06 | pemutaran ulang; gladi hanya untuk kejadian terpromosi | `hitung.test.mjs`; `siklus_renkon.test.mjs` | JS + rute | entri 03-01 08:00, 11:30, 03-02 08:00: T = 0; 3,5; 24 jam, c = 2: 0; 1,75; 12; replay Maret 2025 hanya satu kejadian itu, berpil "Model sederhana, bukan prakiraan"; kejadian tak ada 404; kejadian masih di arsip R2 409 "promosikan dulu" |
| UJ-F5-07 | peran | `node --test tests/warga/siklus_peran.test.mjs` | rute | PD hanya `catatan` gladi dan isi renkon; `status` renkon dan gladi KO; BP baca renkon wilayahnya |
| UJ-F5-08 | layar renkon dan gladi | `node --test tests/siklus/layar_renkon.test.mjs` | CDP | renkon kedaluwarsa tampil sebagai ember dummy; asumsi usulan sistem tidak menimpa tanpa persetujuan staf |

## 8. F6: Risiko Masa Depan

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F6-01 | median dan rentang antarmodel; hanya tiga indeks (Rx1day, Rx5day, CDD) | `python3 -I scripts/siklus/iklim_lab.py uji` | Py | delta -2; 0; 3; 5; 10: median 3, p17 = -0,64, p83 = 6,6, positif 3/5; satu model Rx1day 80, 100, 120, 100: P = 100, B = 90, delta 10 mm, relatif 11,1 persen; B = 0 relatif `null` |
| UJ-F6-02 | indeks harian | `iklim_lab.py uji` | Py | Rx5day tidak melintasi tahun; CDD dengan RR < 1 mm; kalender tiap model diperiksa; kabupaten tanpa sel memakai sel terdekat centroid dan tercatat |
| UJ-F6-03 | pertumbuhan bangunan | `python3 -I scripts/siklus/ghsl_lab.py uji` | Py | B_Z 40.000 ke 46.000: CAGR 2,83 persen; B_k 400.000 ke 420.000, A_Z/A_k = 0,10: indeks 3,0; `B_Z(e1) = 0` tanpa CAGR; GHSL belum diunduh "menunggu" |
| UJ-F6-04 | label dan muka laut | `iklim_lab.py uji`; `siklus_pintu.test.mjs` | Py + rute | semua keluaran `hipotesis`; 2050 ssp245 0,20 (0,17 sampai 0,26) m; 2021-2040 `menunggu`; penurunan tanah tertulis tidak dihitung; label `yakin` kemitraan terpeta ke enam nilai (tinggi, sedang ke `terverifikasi`; rendah ke `estimasi-model`; tidak ke `hipotesis`) |
| UJ-F6-05 | berkas per provinsi | `python3 -I scripts/siklus/saji.py uji` | Py | satu berkas per provinsi di R2, `masa_depan/<prov>.json` kurang dari 2 MB; tidak ada 514 berkas di `public/` (INV batas) |
| UJ-F6-06 | layar masa depan | `node --test tests/siklus/layar_masadepan.test.mjs` | CDP | pil `hipotesis` di tiap angka; dua horizon; rentang antarmodel; kalimat "bukan ramalan kejadian" |

## 9. F7: Pintu Tunggal

| Kode | Apa yang diuji | Perintah | Lapisan | Kasus |
| --- | --- | --- | --- | --- |
| UJ-F7-01 | urutan prioritas | `hitung.test.mjs`; `siklus_pintu.test.mjs` | JS + rute | W, peran KO: kejadian tanggap hari ke-2, R3P sisa 12 hari, renkon `segera_habis` sisa 40 hari, F6: urutan kejadian, R3P, renkon, F6; WG di W sama: kejadian lalu F6 |
| UJ-F7-02 | peran menyaring kartu | `node --test tests/warga/siklus_pintu.test.mjs` | rute | tamu hanya kartu publik; kartu ke layar yang belum hidup tidak tampil; BP hanya wilayahnya |
| UJ-F7-03 | peringatan PDNA tanpa pindai cron | `node --test tests/warga/siklus_rencana_kueri.test.mjs` | integrasi | `EXPLAIN QUERY PLAN` tiap kueri `sk_*` tidak `SCAN` kecuali tabel kecil terdaftar; kueri pintu memakai indeks parsial `sk_kej_fase` LIMIT 50 |
| UJ-F7-04 | alat MCP publik | `node --test tests/warga/siklus_pintu.test.mjs` | rute | hanya ringkasan resmi; tidak membuka paparan; jawaban asisten menyebut label |
| UJ-F7-05 | layar pintu, registri, dan pembuka profil wilayah | `node --test tests/siklus/layar_pintu.test.mjs` | CDP | empat fase menurut peran; kartu ke layar yang belum hidup tidak tampil; layar registri; `ProfilWilayah.buka(kode4)` terbuka dari kartu wilayah |

## 10. Peran dan keamanan (KP 14)

Berkas `tests/warga/siklus_peran.test.mjs` memuat satu uji per baris matriks KP 1, dijalankan di dua awalan (`/api/siklus/*` dan `/api/instansi/siklus/*`) bila BP berhak.

| Kode | Apa yang diuji | Hasil yang diharapkan |
| --- | --- | --- |
| UJ-KP-01 | peran salah tiap baris matriks: WG ke rute staf, PD ke fase selain awal, PM ke `rinci`, PM ke tulis selain `setuju`, BP ke fase atau gabung, selain SA ke `dummy` dan `registri` | 403; tamu 401 atau 303 untuk halaman |
| UJ-KP-02 | gerbang peran lebih dulu dari validasi dan R2 | rinci tanpa sesi 403 sebelum berkas R2 dibaca (pencacah baca R2 = 0) |
| UJ-KP-03 | id tidak ada dan di luar lingkup | 404 yang sama byte demi byte |
| UJ-KP-04 | `x-pb: 1` hilang pada POST/PATCH/DELETE | 403 |
| UJ-KP-05 | Origin lain atau kosong tanpa `Sec-Fetch-Site: same-origin` | 403 (`tolakOrigin`) |
| UJ-KP-06 | cookie sesi pada `ingest/*`; Bearer salah | 400; 401 |
| UJ-KP-07 | `disetujui_*` hanya PM | KO menulis langsung via SQL dan rute ditolak (CHECK, trigger, rute) |
| UJ-KP-08 | tulis tanpa `sk_jejak` | ditolak (INV-4) |
| UJ-KP-09 | koordinat kategori terlarang di `fasilitas/` | `fasilitas.py uji` gagal |
| UJ-KP-10 | aset berkunci | tanpa sesi `/siklus/*.js`, `.css`, JSON staf ditolak; daftar putih publik (`publik.js`, `publik.css`, `data/atribusi.json`, `kamus.json`, `masa_depan_ringkas.json`) terbuka; `SIKLUS_MATI=1` memberi 503 |
| UJ-KP-11 | laju | batas tiap rute DT 4 menghasilkan 429 `retry-after`; GET tidak menulis `laju_bnpb` |
| UJ-KP-12 | repo publik | `gerbang_publik` memindai `public/siklus/**` untuk surel, telepon, koordinat berdesimal lebih dari 3 angka, `innerHTML` berdata mentah, atribut `on*`, U+00B7, em dash |
| UJ-KP-13 | dummy | bukan SA 403; sudah ada N baris 409; hapus anak sebelum induk; staf nyata tidak melihat; `ingest` menolak (INV-5) |
| UJ-KP-14 | draf tidak publik | tidak ada rute atau berkas draf Jitupasna dan R3P di `public/` atau tembolok tepi |

## 11. Layar dan INP

Uji layar di peramban pratinjau dengan dummy terisi (muat ulang penuh sesudah dummy), lebar 1440 dan 390:

1. Tiap layar punya empat keadaan DS 2.9: memuat, kosong, galat, menunggu. Kosong tidak menulis 0 (INV-2).
2. Tiap bagian laporan satu kartu `.ex.ex-std` tanpa kaki sumber; layar baru terdaftar di `LAYAR` gerbang `tests/agen/gerbang-kartu-std.test.mjs`.
3. Paragraf rata kanan-kiri; tabel kepala tengah; deretan pilihan penuh lebar berikon; ikon tanpa garis; grafik bertooltip; panel peta bisa ditarik.
4. Dummy dua ikon, SA saja, tampil di tiap halaman; klik isi lalu hapus bekerja; isinya ditentukan halaman yang dibuka.
5. INP: klik tab, urut, halaman, saring tidak membekukan layar. Chrome kontrol segera, subtree berat ditunda. Handler tidak mem-parse berkas besar sinkron. 
6. Kepala situs navy bersama, token Centurisk97, tanpa palet lokal, kata merek dan sapaan sesuai KA 23 sampai 25.

## 12. Batas ukuran

| Kode | Batas | Uji |
| --- | --- | --- |
| UJ-UK-01 | `siklus/` paling besar 4 GB; per lapis menurut `anggaran.json` | `gudang.py uji` menolak lewat batas |
| UJ-UK-02 | berkas `public/siklus/**` paling banyak 40 (gerbang), baru program paling banyak 200 | `gerbang_publik` memakai `git ls-files` |
| UJ-UK-03 | berkas saji: `arsip` 4 MB, `paparan` 6 MB, `kab` dan `rinci` 1 MB, `fasilitas` 500 KB, `kaji` 100 KB, `masa_depan` 2 MB | `saji.py uji` |
| UJ-UK-04 | Worker mem-parse paling besar 128 KB, selebihnya dialirkan | uji rute: berkas 129 KB tidak lewat `JSON.parse` (pencacah) |
| UJ-UK-05 | badan POST 16 KB (ingest dan baris Jitupasna 256 KB) | 413 pada 16 KB + 1 byte |
| UJ-UK-06 | aset per versi Worker di bawah 20.000 (kini sekitar 12.100) | hitung `git ls-files public` di laporan rilis gelombang |
| UJ-UK-07 | tidak ada kueri pindai D1 di cron; jatah D1 Siklus 500.000 baca dan 10.000 tulis per hari | `siklus_rencana_kueri.test.mjs`; tidak ada cron Worker baru di `wrangler.jsonc` |

## 13. Pengulas wajib (AGENTS.md §6)

| Permukaan berubah | Pengulas |
| --- | --- |
| Model, indeks risiko, uji balik (F3, F6, skor F5) | `validasi-model` |
| Rute Worker, ingest, secret, header | `guard-api`, `security-reviewer` |
| Migrasi D1 `sk_*` | `migrasi-idempoten` |
| Kartu, pop-up, angka di layar | `selera-angka` |
| Handler klik, tab, geser peta | `inp-reviewer` |
| Commit besar atau rilis gelombang | `higiene-repo` |
| Gerbang, `cakupan.json`, peta data | `penulis-gerbang` memeriksa pengerja lain; pengerja gerbang tidak memeriksa dirinya |

Pengulas melapor, tidak memperbaiki. Pengerja pemiliknya yang membetulkan. Tidak ada gerbang atau plafon yang dilemahkan untuk meloloskan kerja sendiri.

## 14. Rilis gelombang

Tiap gelombang ditutup tiket [induk] urutan DT 11: `uji:siklus` dan `uji:warga` hijau, `migrasi-idempoten` dan `guard-api`, sha256 ke `migrasi_beku.json`, pemilik menerapkan migrasi, deploy, `siklus.yml` aktif, ingest `dry-run`. Sesudah push tunggu `terbit.yml` hijau dan periksa aset tayang dan `/api/status`. Tidak ada `wrangler deploy` dari subagent.
