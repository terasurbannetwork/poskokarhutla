# Lapor Warga (warga bantu warga) + titik panas 3 jam

Peta laporan warga di tab **Informasi** pada halaman karhutla dan banjir: listrik, sinyal, BBM, LPG, minta/tawar
bantuan, pesan, plus jenis khusus per bencana (karhutla: api/asap, kualitas udara, kesehatan, ruang udara bersih,
sumber air pemadaman, bantuan pemadaman, sekolah libur, satwa; banjir: tinggi air; longsor; rob; umum: akses jalan,
evakuasi). Tanpa akun. Foto **tidak** didukung di v1 (risiko moderasi: wajah, data pribadi, konten tak pantas).

Worker yang sama juga mengambil titik panas FIRMS NRT tiap 3 jam (`/api/titik`) dan halaman karhutla menggabungkannya
ke data harian.

## Berkas

| Berkas | Isi |
| --- | --- |
| `src/worker.js` | API `/api/warga*`, `/api/titik`, cron; selain itu diteruskan ke aset statis (`ASSETS`) |
| `src/titik.js` | ambil + urai CSV FIRMS, wilayah, simpan ke D1 |
| `migrations/0001_warga.sql`, `0002_titik.sql`, `0003_moderasi.sql` | skema D1 dengan CHECK enum/rentang, trigger hitungan suara & sembunyi otomatis, jejak audit moderasi (hanya tambah) |
| `public/informasi_jenis.js` | katalog jenis/sub/isian/ikon — **satu sumber** untuk worker, halaman, dan uji |
| `public/informasi.js`, `public/informasi.css` | modul tab Informasi (skrip klasik, `data-halaman`) |
| `public/titik_live.js` | penggabung titik 3 jam di halaman karhutla |
| `public/warga/index.html` | tampilan layar penuh yang bisa dibagikan (saat ini dikecualikan `.assetsignore`, lihat bawah) |
| `scripts/warga/splice_informasi.py` | memasang tab + tag skrip ke kedua `index.html` (tiap jangkar harus cocok tepat sekali) |
| `scripts/warga/titik24.py` | `public/data/titik24.json`: titik panas 24 jam ringkas untuk lencana "terkonfirmasi satelit" |
| `wrangler.warga.jsonc` | usulan konfigurasi Worker + D1 + cron (database_id masih placeholder) |
| `tests/warga/` | gerbang cakupan, uji skema (node:sqlite), uji rute (Miniflare + D1 lokal) |

## Memasang tab di kedua halaman

```bash
python3 scripts/warga/splice_informasi.py --cek   # periksa jangkar dulu
python3 scripts/warga/splice_informasi.py         # tulis public/index.html dan public/banjir/index.html
```

Yang dipasang: entri `["informasi", "Informasi"]` di `TABS` (setelah Peta), `<section class="page" id="p-informasi">`,
kait `if (id === "informasi") window.Informasi?.render();` (pakai `window.…?.` supaya tab yang dibuka sebelum skrip
termuat tidak melempar galat; modul juga merender dirinya sendiri bila tab sudah aktif), `<link informasi.css>`,
`<script informasi.js data-halaman>`, `titik_live.js` (karhutla saja), dan tautan "Lapor Warga" di menu bencana.
Kalau salah satu jangkar cocok 0 atau >1 kali, tidak ada berkas yang ditulis.

Tab memakai pemilih bencana bawaan halaman (karhutla → Karhutla, banjir → Banjir; bisa diganti ke Longsor/Rob/Umum).
URL bisa dibagikan: `?jam=6|24|72|168` dan `?laporan=<id>`.

## Jalankan lokal

```bash
npm install                                   # wrangler 3.114.17 + miniflare (dev saja)
cp .dev.vars.example .dev.vars                # isi IP_SALT dan ADMIN_TOKEN acak
npx wrangler d1 migrations apply poskowarga --local -c wrangler.warga.jsonc
npm run dev:warga                             # http://localhost:8787  (aset + API + D1 lokal)
curl "localhost:8787/__scheduled?cron=15+*/3+*+*+*"   # butuh --test-scheduled dan FIRMS_MAP_KEY di .dev.vars
```

## Uji (standar pemilik: integrasi sungguhan, berhenti di galat pertama)

```bash
npm run uji:warga
```

1. `gerbang.test.mjs` (tanpa DB): tiap rute di `src/worker.js` dan tiap tabel/trigger di `migrations/` wajib ada di
   `tests/warga/cakupan.json` sebagai `diuji` (menunjuk nama uji yang benar-benar ada) atau `dikecualikan` (dengan
   alasan). `antre` hanya boleh menyusut.
2. `skema.test.mjs` (npm-free, `node:sqlite`): migrasi dijalankan apa adanya; runner membungkus tiap uji dengan
   `BEGIN … ROLLBACK`. Mencoba **semua** pasangan jenis:sub katalog (harus diterima) dan semua pasangan silang (harus
   ditolak), koordinat/teks/detail/jumlah/kedaluwarsa salah, kontak hanya untuk bantuan, trigger suara & 3 aduan.
   Uji ini sudah menemukan dua celah NULL di CHECK (`json_extract` kosong lolos) yang kini ditutup dengan `coalesce`.
3. `api.test.mjs` (Miniflare, D1 lokal sungguhan): masukan salah ditolak tanpa menulis apa pun, batas laju 10/jam,
   tautan & nomor HP dibuang, kontak tidak pernah bocor di GET, endpoint kontak 5/jam dan kedaluwarsa 72 jam, 3 aduan
   menyembunyikan, laporan lanjutan + durasi padam dari timestamp tersimpan (≈108 jam), induk tidak ada/tersembunyi
   ditolak, token selesai, cron kedaluwarsa/kontak/jejak, lencana titik panas, admin, origin lain, tanpa IP_SALT → 503,
   dan cron FIRMS dengan CSV fixture (baris rusak dibuang, ambang keyakinan BRIN, kembar dihapus, laut dibuang, 8
   putaran disimpan).

Tidak dijalankan di tiap push. Bila ingin CI: jalankan saat `src/`, `migrations/`, `public/informasi*` atau
`tests/warga/` berubah, atau `workflow_dispatch`.

## Deploy (yang harus dilakukan pemilik)

Token Cloudflare kini punya D1:Edit. Langkah:

```bash
npx wrangler@3 d1 create poskowarga                     # salin database_id yang keluar
# tempel database_id ke wrangler.warga.jsonc, lalu salin isinya ke wrangler.jsonc
npx wrangler@3 d1 migrations apply poskowarga --remote
openssl rand -hex 32 | npx wrangler@3 secret put IP_SALT     # WAJIB: tanpa ini semua POST dijawab 503
openssl rand -hex 24 | npx wrangler@3 secret put ADMIN_TOKEN # simpan nilainya untuk moderasi
npx wrangler@3 secret put FIRMS_MAP_KEY                      # kunci yang sama dengan pipeline harian
# opsional Turnstile: buat widget di dasbor, lalu
npx wrangler@3 secret put TURNSTILE_SECRET                   # dan isi vars.TURNSTILE_SITEKEY di wrangler.jsonc
python3 scripts/warga/splice_informasi.py
npx wrangler@3 deploy
```

- Token butuh juga **Workers Scripts:Edit** (deploy skrip, cron) — sudah dipakai untuk deploy aset.
- **Turnstile** (Lapor Warga + kotak pesan) aktif hanya bila KEDUANYA diset; satu saja = tidak ada perubahan perilaku.
  1) Dasbor Cloudflare > Turnstile > Add widget: mode *Managed*, hostname `poskokarhutla.terasurbannetwork.workers.dev`
  (dan domain sendiri bila ada). 2) `npx wrangler@3 secret put TURNSTILE_SECRET` (secret key). 3) Isi
  `vars.TURNSTILE_SITEKEY` di wrangler.jsonc dengan site key, commit ke main (terbit.yml men-deploy). Peramban membaca
  sitekey dari `/api/warga/konfig` lalu merender widget; Worker memverifikasi token ke siteverify. Uji:
  `tests/warga/tepi.test.mjs`. Mematikan: kosongkan sitekey (rahasia boleh tetap ada).
- Urutan penting: migrasi sebelum deploy pertama; kalau terbalik, `/api/warga` menjawab 500 sampai migrasi jalan
  (situs statis tidak terpengaruh).
- Workflow `data.yml`/`banjir.yml` men-deploy dengan `wrangler.jsonc` — setelah langkah di atas, deploy otomatis ikut
  membawa Worker. Tambahkan langkah ini ke `data.yml` setelah `harian.py` agar lencana satelit segar:
  `python3 scripts/warga/titik24.py`.
- `public/.assetsignore` saat ini mengecualikan `warga/` (halaman layar penuh). Tab tidak bergantung padanya
  (katalog ada di `public/informasi_jenis.js`). Hapus baris `warga/` bila halaman `/warga/` mau dibuka.
- Cron FIRMS mengurai ~20 rb baris + poligon provinsi per putaran: di paket **Workers Free** (10 ms CPU) ini bisa
  melewati batas; di paket berbayar aman. Bila gagal, `/api/titik` tetap menyajikan putaran terakhir.

## Moderasi

```bash
H="x-admin-token: $ADMIN_TOKEN"; U=https://<domain>/api/warga
curl -H "$H" "$U/admin?tersembunyi=1"                       # yang disembunyikan / pernah diadukan (tanpa nomor WA)
curl -H "$H" -X POST "$U/<id>/admin" -d '{"aksi":"sembunyikan"}'
curl -H "$H" -X POST "$U/<id>/admin" -d '{"aksi":"tampilkan"}'       # hapus aduan + tampilkan lagi
curl -H "$H" -X POST "$U/<id>/admin" -d '{"aksi":"hapus","alasan":"spam"}'  # soft-delete: tersembunyi + kontak dibuang; pulihkan = tampilkan
curl -H "$H" -X POST "$U/<id>/admin" -d '{"aksi":"hapus_pengirim"}'  # 409: jumlah + contoh laporan dari hash IP yang sama, TIDAK mengubah apa pun
curl -H "$H" -X POST "$U/<id>/admin" -d '{"aksi":"hapus_pengirim","konfirmasi":<jumlah dari 409>}'  # baru dijalankan
curl -H "$H" "$U/admin?audit=1"                                     # jejak audit: waktu, moderator (12 hex hash token), aksi, id
# ADMIN_TOKEN boleh berisi beberapa token dipisah koma (satu per moderator) supaya kolom moderator di audit berarti.
# Hash IP bisa milik banyak warga di balik CGNAT seluler: periksa contoh di jawaban 409 sebelum hapus_pengirim.
```

Otomatis: 3 aduan dari 3 IP berbeda → disembunyikan (trigger DB). "Sudah tidak" ≥ 3 dan lebih banyak dari "masih
benar" → keluar dari peta. Kata kasar ditolak; tautan dan nomor HP di teks publik diganti `[tautan dihapus]` /
`[nomor dihapus]`; tagar dibiarkan.

## Privasi

- IP mentah tidak pernah disimpan: `SHA-256(IP_SALT | ip)`; jejak laju dihapus setelah 2 hari.
- Nomor WA hanya untuk jenis bantuan (minta, tawar, kesehatan, pemadaman, evakuasi), di tabel terpisah, tidak pernah
  ikut di daftar/rincian/admin; dibuka lewat `POST /api/warga/:id/kontak` (5/jam, 15/hari per IP), dihapus cron setelah
  72 jam atau saat laporan selesai/disembunyikan. Formulir menjelaskan bahwa nomor terlihat oleh penolong.
- Lokasi satwa dibulatkan 0,01° (~1 km) dan dijaga CHECK di DB.
- "Tandai selesai" memakai token acak yang disimpan di perangkat pelapor (hash-nya di DB).

## Batas

| Hal | Nilai |
| --- | --- |
| Laporan | 10/jam, 30/hari per IP; 600/jam global; kembar ≤200 m dalam 30 menit ditolak |
| Konfirmasi / aduan | 60/jam / 20/jam per IP; satu suara per IP per laporan (bisa diganti) |
| Teks | 280 karakter; body 4 KB |
| Masa berlaku | status 24 jam (pudar setelah 12 jam), api/asap 12 jam, sumber air 7 hari, bantuan s.d. selesai/7 hari |
| Laporan lanjutan | listrik/sinyal/BBM/LPG ≤150 m tersambung otomatis; peta menampilkan status terbaru; buruk→baik menghitung durasi |
| GET daftar | maks 1000 fitur per bbox (`terpotong: true` bila lebih) |
| Penyimpanan | laporan dihapus 7 hari setelah kedaluwarsa; tersembunyi 30 hari |

Batas yang disengaja (ponytail): wilayah ringkasan = pusat kecamatan terdekat (perkiraan, bukan poligon);
`/api/titik` ~1 MB JSON (gzip ~200 KB) dikirim utuh — tambahkan `?sejak=` bila terasa berat.

## Jeda kedatangan data satelit (src/satelit.js, migrations/0075_satelit_granul.sql)

Tiap putaran titik (`perbaruiTitik`, menit 15 tiap 3 jam UTC) mencatat granul FIRMS yang sudah diurai, SESUDAH alarm SIPPA: satu baris `satelit_granul` per (sensor `M`/`N`/`N20`/`N21`,
menit akuisisi) dengan jumlah deteksi `n` dan `terlihat` = waktu putaran yang PERTAMA melihatnya (`INSERT OR IGNORE`, tidak pernah ditimpa). Jeda terukur = `terlihat - akuisisi`,
yaitu sampai titik itu muncul di `/api/titik`. Tanpa panggilan FIRMS baru dan tanpa SELECT di putaran; sensor galat tidak menulis. `CHECK (terlihat >= akuisisi)`: granul yang jam
satelitnya masih di depan jam Worker dilewati dan tercatat di putaran berikutnya. Tabel belum ada = satu `console.warn`, putaran tetap sah. Dipangkas 400 hari sekali sehari (jam 04 UTC,
cron bersih-bersih menit 17). Perkiraan: ~100-250 granul baru per hari. Kolom `sumber` ('worker' | 'pipeline') dicadangkan untuk fase 2 (titik.yml ikut menulis); penulis 'pipeline' BELUM ADA, semua baris kini 'worker'.

Arti jeda: latensi FIRMS + tunggu putaran Worker berikutnya (±3 jam) = "sampai tampil di aplikasi", BUKAN latensi FIRMS murni. Jendela urai CSV Worker (24 jam, `JENDELA_URAI_JAM`) membatasi
jeda yang bisa tercatat: granul yang baru muncul sesudahnya tidak pernah tercatat, jadi respons memuat `batas_jeda_menit` (1440).

Ringkasan harian: endpoint TIDAK menghitung dari granul per permintaan (miss cache tepi terjadi per pusat data, tiap miss membaca ribuan baris). Cron menit 19 (`ringkasGranul`, invokasi
sendiri) menghitung ringkasan 30 hari sekali sehari pada jam 13 UTC (sebelum `tle.py`, data.yml 14.20 UTC), atau bila barisnya belum ada sama sekali (deploy pertama), atau bila lebih tua dari
25 jam (13.19 gagal), lalu UPSERT ke satu baris `satelit_ringkas` (id = 1, isi = teks JSON respons). Jam lain dengan ringkasan segar hanya membaca satu baris.

`GET /api/satelit/jeda` (publik, GET/HEAD, tanpa parameter, cache tepi 6 jam) meneruskan baris `satelit_ringkas` itu: jendela 30 hari, per sensor `n` (granul), `lintasan` (gugus granul berurutan
dengan celah > 45 menit), `hari_ada` (tanggal WIB berbeda), `median_menit`, `p90_menit` (nearest-rank), dan rincian `siang` (akuisisi WIB 06.00-17.59) / `malam` (juga `n`, `lintasan`, median, p90).
`mulai_catat` = putaran pertama tabel; granul dengan akuisisi sebelum itu tidak dihitung (putaran pertama melihat 24 jam data lama sekaligus). Kunci `harian` (paling akhir di respons):
tanggal WIB (`"2026-10-28"`) -> kode sensor (`N20`/`N21`/`M`/`N`) -> `{n, lintasan, median_menit, p90_menit, maks_menit}`, 30 hari WIB terakhir (hari ini sebagian + 29 hari penuh), dihitung dalam
lintasan loop yang sama dengan ringkasan 30 hari (tanpa kueri D1 tambahan; aturan sama: sebelum `mulai_catat` dikecualikan, jeda = terlihat - akuisisi). Hari dikelompokkan dari akuisisi dalam WIB
(granul 16.59 UTC dan 17.00 UTC jatuh di dua hari berbeda); `lintasan` dihitung per hari (gugus yang melintasi 00.00 WIB terhitung satu di tiap hari, jadi jumlah harian bisa melebihi `lintasan`
30 hari). Sensor tanpa granul hari itu tidak ditulis; hari tanpa granul sama sekali tidak ada; tabel kosong = `{}`. Kira-kira 10 KB untuk 30 hari x 4 sensor. Tabel atau baris belum ada = 503 `{"galat":"data belum tersedia"}`
(tanpa cache, detail hanya ke log). Pemakai: `scripts/data/tle.py` (jeda_data_menit terukur) dan kartu "Satelit berikutnya". Uji: `tests/warga/satelit_granul.test.mjs`.

## Statistik, admin, dan kotak pesan

```bash
npx wrangler@3 d1 migrations apply poskowarga --remote          # 0004_statistik.sql + 0005_pesan.sql
openssl rand -hex 32 | npx wrangler@3 secret put SESI_KUNCI      # tanda HMAC cookie sesi admin (12 jam)
# notifikasi email pesan baru (opsional; tanpa ini pesan tetap tersimpan, admin melihat spanduk):
npx wrangler@3 secret put EMAIL_API_KEY   # kunci API Resend (resend.com), domain pengirim harus diverifikasi di Resend (SPF/DKIM DNS)
npx wrangler@3 secret put EMAIL_FROM      # mis. "Pantau Bencana <pesan@domain-anda>" (domain yang sudah diverifikasi)
npx wrangler@3 secret put EMAIL_TO        # kotak masuk pemilik; boleh beberapa, dipisah koma
```

- Masuk: `/admin/masuk` (token = salah satu ADMIN_TOKEN). Dasbor `/admin/statistik`, kotak pesan `/admin/pesan`.
  Skrip tetap bisa memakai `Authorization: Bearer <ADMIN_TOKEN>` atau `x-admin-token`.
- Statistik publik `/statistik` (manusia vs AI vs perayap) dihitung dari hit HTML. `wrangler.jsonc` memakai
  `assets.html_handling: "none"` supaya hanya rute di `HTML_RUTE` (src/worker.js) memanggil Worker; JS/CSS/JSON/gambar tetap statis.
- Anggaran gratis: ±1 pemanggilan Worker per tampilan HTML + ±1 kiriman analitik per kunjungan berpersetujuan (maks 3 per
  muat halaman). Di atas ±40–50 rb kunjungan/hari kuota 100 rb permintaan/hari Workers Free habis dan permintaan berikutnya
  ditolak Cloudflare (galat 1027) sampai kuota direset; pindah ke Workers Paid bila itu terjadi. Tulisan D1 sudah disampel
  otomatis (pSampel/pHit di src/statistik.js), angkanya ditandai "perkiraan (sampel)".
- Pasang ulang skrip di halaman: `python3 scripts/statistik/splice_jejak.py` (idempoten, jangkar harus cocok tepat sekali).

## Foto & video lapangan

Warga mengirim foto/video dari lokasinya (tab **Foto Lapangan** + lapisan "Foto warga" di Peta); admin menyetujui di
`/admin/foto` sebelum tayang. Server: `src/foto.js` (rute `/api/foto*`, `/f/<id>` untuk tautan bagikan), skema
`migrations/0007_foto.sql`, klien `public/foto.js` + `foto.css`, admin `public/admin/foto.js` + `foto.css`, uji
`tests/warga/foto.test.mjs` (D1 + R2 lokal sungguhan).

- Lokasi = GPS perangkat saat unggah (akurasi ≤ 1 km, dibaca ≤ 10 menit lalu); pengguna tidak bisa memilih titik. GPS/waktu
  EXIF (bila masih ada) wajib ≤ 5 km dan ≤ 48 jam. Durasi video dibaca dari kotak `mvhd` MP4/MOV (maks 60 detik, 30 MB).
  Foto dikompres di peramban (WebP/JPEG 1600 px) + thumbnail 480 px. Wilayah (prov/kab/kec) dihitung Worker.
- Komentar langsung tayang (filter kata kasar, tautan & nomor HP dibuang); 3 aduan = komentar disembunyikan, foto kembali ke
  antrean. Publik tidak pernah melihat email, hash IP, atau data dummy (🧪/🧹 di `/admin/foto`).
- Tanpa binding R2 `MEDIA` tab & lapisan disembunyikan otomatis dan unggah menjawab 503.

Mengaktifkan (pemilik):

```bash
# 1) Dasbor Cloudflare > R2 > aktifkan R2 (paket gratis 10 GB; butuh metode pembayaran di akun)
npx wrangler@3 r2 bucket create poskokarhutla-foto
npx wrangler@3 d1 migrations apply poskowarga --remote      # 0007_foto.sql
# 2) tambahkan ke wrangler.jsonc lalu push ke main (terbit.yml men-deploy):
#    "r2_buckets": [{ "binding": "MEDIA", "bucket_name": "poskokarhutla-foto" }],
```

## Ruang Posko: peran dan secret

- `SUPER_ADMIN` (secret, boleh kosong): daftar awalan akun dipisah koma yang boleh memakai dummy 🧪/🧹 di /admin/posko. Awalan = 12 hex pertama sha256 entri `ADMIN_TOKEN` akun itu
  (`printf '%s' 'email:sandi' | shasum -a 256 | cut -c1-12`). Kosong = dummy tertutup untuk semua (aman bawaan).
- Akun gerbang situs (`AKUN_SITUS`) adalah admin biasa tetapi tidak bisa membaca/mengubah Kontak PT dan tidak bisa mengirim email/WA/telepon ke perusahaan.
- `/lapangan` publik (regu masuk dengan kode); satu-satunya pengecualian gerbang centurisk97.id, tercatat di `PUBLIK_TANPA_SESI` (src/worker.js). Halaman baru otomatis terkunci di sana.
- Tebakan kode regu dan token admin lewat header dihitung per IP bergaram di `laju_posko` (migrasi 0019): 300 gagal per jam = 429/403 dari IP itu.
- Keterbatasan: EXIF dibuang server hanya untuk JPEG; WebP tidak dibersihkan.

## Akun Instansi dan Tugas Api (src/instansi.js, migrations/0029_instansi.sql)

Pemda, polisi, dan TNI (pemprov, pemkab, pemkot, polda, polres, kodam, kodim) mengerjakan tugas api per kompleks lewat `/instansi`; admin mengelolanya di `/admin/instansi`.

- **Terapkan migrasi 0029 ke D1 produksi lebih dulu** (`wrangler d1 migrations apply`); tanpa itu rute instansi menjawab 500 dan cron `bersihkanInstansi`/`buatTugas` mencatat galat tanpa menjatuhkan cron lain.
- Akun dibuat massal dari halaman admin (bertahap 100 per permintaan, idempoten). Sandi acak tampil SEKALI dan masuk CSV yang diunduh di peramban; yang disimpan hanya sha256(garam akun + sandi). Sandi CSV (dan hasil reset admin) hanya sandi AWAL: akun aktif WAJIB menekan "Buat sandi baru" (`POST /api/instansi/gantisandi`), server membangkitkan sandi acak baru yang tampil sekali ke pengguna, sandi awal hangus, sesi lain dicabut. Tanpa itu sesi hanya boleh ke saya, gantisandi, keluar.
- Login memverifikasi sandi DULU (sandi benar selalu masuk); 429 hanya di jalur salah: 8 per jam per (username + IP), 200 per username, 30 per IP.
- Kiriman bersesi instansi wajib header `x-pb: 1` (dikirim halaman /instansi); rute admin memakai token/cookie admin. Jejak audit aksi admin dan ganti sandi ada di tabel append-only `instansi_jejak`, tampil di rincian akun.
- Cron: menit 18 tiap 3 jam UTC membaca `public/data/tugas_kompleks.json` (berkas lebih dari 6 jam atau tak ada = dilewati) dan menggabung kompleks dalam 2 km dari tugas terbuka di kabupaten yang sama. Tanpa migrasi 0029 cron mengembalikan `{lewat}` dan rute menjawab 503 jelas.
- Tenggat: konfirmasi 6 jam sejak tugas dibuat, kabar tiap 24 jam sejak isian terakhir. Terlambat dihitung saat dibaca. Tagih = tautan wa.me di admin, tidak ada kiriman otomatis. Di luar wilayah dan tidak ada sama-sama 404.
- Media (1 sampai 10 foto atau video per isian) memakai aturan `src/foto.js`, kecuali bacaan GPS boleh sampai 6 jam (antrean luring). Metadata dibuang dengan pembersih ketat `src/media_bersih.js` (JPEG, WebP, MP4/MOV; WebM tidak) untuk berkas dan thumbnail. R2 `instansi/media/<id>`. Hitungan orang (Workers AI `AI`, `@cf/facebook/detr-resnet-50`, skor 0,5): foto dari thumbnail JPEG yang DISIMPAN server, video dari bingkai kiriman peramban (ditandai `bingkai_klien`); per akun 120 per jam, global 5.000 per hari. Tanpa binding hitungannya kosong dan isian tetap tersimpan.
- Dokumen verifikasi di R2 `instansi/dok/<akun>/surat|kartu`, hanya lewat rute admin (moderator ke atas): `private, no-store`, CSP sandbox, PDF diunduh (attachment).
- `personelProvinsi(env, "YYYY-MM-DD")` (diekspor dari `src/instansi.js`) menjumlah personel per unsur, regu, dan alat dari kabar terakhir tiap tugas per provinsi, untuk laporan harian berikutnya.
- Halaman `/instansi` ada di daftar putih `PUBLIK_TANPA_SESI` (keputusan pemilik 21 Okt 2026): pemda, polisi, dan TNI memakai akun instansi sendiri; sesi, status aktif, dan cakupan wilayah dicek di tiap panggilan API.

## Penugasan, pelacak GPS, verifikasi padam (src/penugasan.js, migrations/0035_penugasan.sql)

Akun instansi aktif menugaskan orang (driver, ketua regu, anggota) ke tugas api dari panel tugas di `/instansi`; penerima membuka `/lacak/<token>` di ponsel tanpa login.

- **Terapkan 0029 (kolom baru `akses`, `padam_verif`, EXIF media) dan 0035 ke D1 produksi lebih dulu.** Tanpa 0035 semua rute penugasan menjawab 503 yang jelas; tugas, isian, dan cron lain tetap jalan. 0029 belum pernah diterapkan di produksi saat paket ini ditulis, jadi kolomnya dimasukkan ke 0029 di tempat (bukan migrasi baru). **DB yang pernah menerapkan 0029 versi lama (lokal atau staging) harus dibuat ulang** (hapus persist `.wrangler/...`), karena `IF NOT EXISTS` tidak menambah kolom.
- Token 18 byte acak (36 hex) tampil SEKALI ke akun yang menugaskan; yang disimpan sha256-nya. API penerima membawa token di header `x-lacak` (bukan di URL, supaya tidak masuk log); tautan berbentuk `/lacak#<token>`: token di fragmen (tidak ikut ke server, log, atau Referer) dibaca `lacak.js`; halaman statis `/lacak` (CSP ketat, no-store) dan manifest PWA dibuat klien sebagai blob. WA orang yang ditugaskan, cabut, dan terbit ulang hanya untuk akun pembuat penugasan; koordinat EXIF hanya untuk pengunggah, admin, dan staf. Dicabut, selesai, atau kedaluwarsa = 410; tak dikenal = 404.
- Posisi: ditolak sebelum "Mulai berangkat" (409), kotak Indonesia dan bukan 0,0, akurasi 0 sampai 5000 (selain itu null), 4 per menit per token dan 300 per menit per IP. Tabel append-only, retensi 30 hari di cron bersih-bersih (lewat `bersihkanInstansi`). Tiba otomatis bila dalam 300 m dari api dengan akurasi 300 m atau lebih baik. ETA kasar = garis lurus x 1,3 pada 30 km per jam, bukan routing jalan.
- Privasi: posisi hanya untuk akun pemilik tugas (wilayah), moderator, dan staf pusdalops/verifikator wilayah itu; nomor WA orang yang ditugaskan hanya untuk akun pemilik. Posisi berhenti dikirim saat Selesai atau tautan dicabut.
- Checklist persiapan disusun Worker dari `rekomendasi.kebutuhan`, kunci `akses` (disalin cron `buatTugas` dari `tugas_kompleks.json`, JSON paling banyak 1.500 huruf), dan daftar baku (air minum 4 liter per orang per hari, perkiraan). Butir yang dicentang tersimpan dengan stempel waktu; "Mulai berangkat" memberi peringatan (tidak memblokir) bila butir wajib belum dicentang.
- "Sudah padam belum?": status tugas tetap `padam`; kolom `padam_verif` menandai hasil pemeriksaan titik panas FIRMS di D1 (`titik_terbaru`) dalam radius 2 km sesudah laporan padam, dijalankan di awal cron menit 18 (`verifikasiPadam`). Tanpa titik baru selama 48 jam (dan putaran titik terbaru sudah mencakup 48 jam itu) = `padam_terverifikasi`, dengan label jujur bahwa bara bawah permukaan tetap mungkin. Titik baru = `muncul_lagi`: tugas dibuka kembali, jendela kabar 24 jam mulai lagi, dan muncul sebagai butir Meja Pantau `api_muncul_lagi` (`butirApiMunculLagi` di `src/instansi.js`). Melaporkan padam wajib minimal satu foto atau video; "Cek ulang lapangan" meminta foto kedua (`POST /api/instansi/cekulang/:id`).
- Metadata foto: peramban membaca EXIF dari berkas ASLI sebelum kompres (waktu, GPS, tanda kamera) dan mengirimnya bersama unggahan; server menyimpan `exif_waktu`, `exif_lat`, `exif_lon`, `exif_jarak`, `kamera`, `exif_api_km`. Aturan sama dengan `src/foto.js`: GPS EXIF lebih dari 5 km dari GPS perangkat atau waktu lebih dari 48 jam = ditolak; GPS EXIF lebih dari 5 km dari titik api = ditandai curiga untuk admin. Berkas yang disimpan tetap tanpa EXIF (`src/media_bersih.js`).
- Uji: `tests/warga/penugasan.test.mjs` (token, 410, laju, geofence, privasi, retensi, checklist, dummy, 503, halaman, klien `lacak.js` dan pop-up di `node:vm`) dan tambahan di `tests/warga/instansi.test.mjs` (akses dari cron, alur padam, EXIF).

### Lapor dari lokasi lewat tautan petugas (migrations/0062_isian_lapangan.sql, `laporPetugas` di src/instansi.js, `public/lacak_lapor.js`)

- **Terapkan 0062 ke D1 produksi** (`wrangler d1 migrations apply ... --remote`). Tanpa 0062: kartu lapor di `/lacak` tidak tampil (`info.lapor` null), `POST /api/lacak/media|lapor` 503, jalur akun berjalan seperti dulu (alasan bukan api tidak diminta).
- Petugas bertoken mengirim foto (`POST /api/lacak/media`, aturan sama dengan `/api/instansi/media`) lalu laporan (`POST /api/lacak/lapor {klien_id, langkah, kondisi, alasan_bukan_api?, bekas_terbakar_baru?, catatan?, media}`). Langkah ditentukan keadaan tugas (konfirmasi, kabar selama api ada, cek ulang sesudah padam); salah langkah = 409 dengan `langkah` yang diminta. Hanya tugas karhutla.
- Isian tercatat atas akun yang menugaskan (lingkup, SLA, retensi tetap) dengan PIC = orang di tautan (nama dan peran dari penugasan; WA = WA akun yang menugaskan, WA pribadi petugas tidak disalin ke isian) dan baris `isian_lapangan.penugasan_id`. Berkas tautan (foto saja, tanpa video) dicatat di `media_petugas`: hanya penugasan pengunggahnya yang bisa merujuknya. Laju 40 unggahan dan 20 isian per jam per tautan.
- Tautan bisa diteruskan orang: laporan tautan yang menutup tugas (bukan api, sudah padam, kabar padam) ditolak 409 bila fotonya lebih dari 5 km dari titik api. Di ponsel, draf dan antrean tautan dihapus saat tautan mati (410) atau Selesai.
- "Bukan api" karhutla wajib `alasan_bukan_api` (`tidak_ada_bekas`, `bekas_lama`, `sumber_panas_lain`) di jalur token dan akun. Riwayat tugas (akun dan admin) menampilkan `petugas {nama, peran}` dan alasannya; `/api/pipa/lapangan` membawa `status`, `hasil`, `konfirmasi_pada`, `alasan_bukan_api`, `sumber_konfirmasi` (`instansi`/`petugas`), `isian_petugas` (tanpa nama).
- Klien: foto dikompres saat dipilih dan disimpan sebagai draf di IndexedDB `pb_lacak`; Kirim memasukkan laporan ke antrean IndexedDB dulu lalu mengirimnya (ulang saat online, saat halaman terlihat, tiap 60 detik dengan jeda bertambah sampai 30 menit; `klien_id` tetap = idempoten). Selesai ditahan selama antrean belum kosong. Uji: `tests/warga/lacak_lapor.test.mjs`.
- Laporan berfoto dari lokasi (paling jauh 5 km) mencatat `penugasan.tiba_pada` dalam batch yang sama dengan isiannya (`stmtTiba`), jadi petugas bisa menekan Selesai tanpa Mulai berangkat.
- **Rincian ala laporan Daops** (migrations/0063_isian_rinci.sql, `bacaRinci` di src/instansi.js): `rinci {desa, kawasan, tipe_kebakaran, vegetasi[], kedalaman_gambut_cm, padam_baru_ha}`, semua opsional, di konfirmasi dan kabar (tautan dan akun), ditambah `luas_ha` dan `lahan_teramati` dari tautan. `padam_baru_ha` = dipadamkan sejak laporan terakhir; server menjumlahkannya ke `tugas_isian.padam_ha` (total terakhir tugas + tambahan, dibulatkan 0,01 ha), jadi total tidak diketik orang. `padam_ha` dan `padam_baru_ha` sekaligus = 400. Riwayat akun dan admin membawa `rinci`; `info.lapor.rinci` membawa pilihan dan total sejauh ini. Tanpa 0063 rincian diabaikan dan laporannya tetap masuk; `/lacak` tidak menampilkan blok rincian. Terapkan 0063 bersama 0062.
- **Penahan "bukan api" di pembuat tugas** (`TAHAN_BUKAN_API` di src/instansi.js): tugas `bukan_api` menahan tugas baru dalam 2 km atau insiden yang sama 14 hari bila tanpa alasan (isian lama) atau alasannya `sumber_panas_lain`; alasan `tidak_ada_bekas` dan `bekas_lama` hanya 3 hari. Pemilihan sampel kontrol uji lapangan tetap 14 hari untuk semua (`KOLAM_TAHAN_HARI` di src/uji_lapangan.js, tidak diubah dari commit 94dab845 tanggal 23 Okt, dikunci uji di sisi 5, 10, dan 15 hari), supaya strata kontrol sebanding dengan data sebelum aturan ini; akibatnya lokasi "bukan api" beralasan sesaat berumur 3 sampai 14 hari bisa dikunjungi ulang sebagai tugas tetapi belum bisa terpilih sebagai kontrol. Tanggal mulai berlakunya disimpan migrasi 0062 di `tugas_meta.tahan_bukan_api_sejak` dan disebut di catatan Kinerja dan uji lapangan selama 180 hari (retensi): sesudah tanggal itu satu lokasi alarm palsu bisa menjadi beberapa tugas dan beberapa baris Q1, jadi persentase "bukan api" dan keterlambatan tidak sebanding langsung dengan masa sebelumnya. Rincian Q1 `aturan_tahan` menyebut jumlah kunjungan level 2 ke atas sesudah tanggal itu. Alasan diisi regu tanpa verifikasi dan menentukan lama tahan, jadi ikut menentukan jumlah baris Q1. Versi pra-registrasi Q1 (`uji-lapangan/1`) tidak dinaikkan: itu keputusan pemilik.
- **`/instansi` di ponsel bersama**: antrean IndexedDB `pb_instansi` (tetap versi 1: tab lama yang terbuka saat rilis tidak gagal) diberi id akun; draf di database terpisah `pb_instansi_draf`; tiap akun hanya mengirim dan melihat isiannya sendiri (isian akun lain tampil sebagai jumlah saja). Draf form (isian + berkas) disimpan per (akun, tugas), tahan muat ulang, dibuang sesudah terkirim atau 3 hari; antrean dibuang sesudah 7 hari (dibersihkan saat halaman dimuat, tanpa menunggu masuk). Semua panggilan bersesi dari `/instansi` dan modulnya membawa header `x-akun`; `akunMasuk` menjawab 401 bila sesi milik akun lain (tab basi, ganti akun) sebelum cek status, dan `/keluar` tidak mencabut sesi akun lain. Klien keluar dari tampilan basi dan menunda antrean. Keluar, sesi habis, atau akun lain masuk mengosongkan form, berkas, daftar, banner, dan draf di memori; keluar tanpa sinyal ditolak terus terang (sesi di server belum dicabut). PIC yang diingat (`pb_pic:`) per akun.
- **Uji banding firespot** (`scripts/data/ujibanding_firespot.py lapangan`): `bukan_api` negatif apa pun alasannya (sama dengan Q1); `sudah_padam` positif bila `bekas_terbakar_baru = ya`, atau untuk isian lama tanpa medan itu bila luas > 0; keluaran memuat `per_sumber` (instansi atau petugas, alasan negatif; sel < 5 disembunyikan) dan `n_lokasi` (lokasi unik).

## API terbuka untuk mitra dan server MCP (src/api_v1.js, src/mcp.js, migrations/0040_kunci_api.sql)

Dokumentasi untuk pihak luar: `/api` (public/api.html). Data publik: `GET /api/v1/data/<nama>` tanpa kunci (daftar putih `DATA` di src/api_v1.js; tiap nama harus berkas
yang ada di public/). Data yang di situs wajib login (rumah rusak, bangunan, laporan BNPB) dibuka HANYA-BACA lewat `/api/v1/*` dengan header `X-API-Key`
(kunci di query string diabaikan). Kunci tidak membuka rute lama dan tidak butuh cookie. `/api/v1/*` dan `POST /mcp` ditangani di `fetch()` sebelum gerbang
centurisk97.id, jadi terjangkau di semua host dan tidak dicatat sebagai halaman pemirsa. CORS `*` tanpa credentials. Halaman dokumentasi `/api` di centurisk97.id hanya untuk admin yang masuk (pemilik 23 Okt 2026); di *.workers.dev tetap terbuka.

**Menerbitkan kunci:** buka `/admin/kunci-api` (admin), isi nama pemegang dan centang cakupan (`rumah_rusak`, `bangunan`, `laporan_bnpb`), lalu salin kunci `pb_...` yang
tampil SEKALI. D1 hanya menyimpan sha256-nya, jadi kunci yang hilang tidak bisa dilihat ulang: cabut dan terbitkan baru. **Mencabut:** tombol Cabut di halaman yang sama
(berlaku seketika). Lewat curl: `POST /api/kunci-api/admin/buat {nama, cakupan}`, `GET /api/kunci-api/admin/daftar`, `POST /api/kunci-api/admin/cabut/<id>` dengan `x-admin-token`.
Batas: 1.000 permintaan per jam per kunci; kunci salah > 300 per jam per hash IP = 429 (tabel `laju_bnpb`, aksi `api.kunci_gagal` dan `api.v1`).

**Migrasi 0040 ke D1 remote (pemilik):** `npx wrangler d1 execute poskowarga --remote --file migrations/0040_kunci_api.sql`. Idempoten. Sebelum diterapkan, endpoint
berkunci menjawab 503 dan halaman admin menampilkan pesan "migrasi belum diterapkan"; data publik tetap jalan.

**MCP:** `POST /mcp` (Streamable HTTP, stateless, tanpa SDK). Tool publik tanpa kunci; tool berkunci (`rumah_rusak`, `rumah_rusak_rekap`, `bangunan_terpapar`, `laporan_bnpb`)
muncul di `tools/list` hanya bila `X-API-Key` sah dan bercakupan cocok. claude.ai Connectors belum bisa mengirim header (tanpa OAuth), jadi di sana hanya tool publik.
Uji: `node --test tests/warga/api_v1.test.mjs tests/warga/mcp.test.mjs`.

## Uji lapangan karhutla (src/uji_lapangan.js, migrations/0055_uji_lapangan.sql, halaman /uji-lapangan)

Protokol + pengumpulan data + hasil supaya klasifikasi dan prediksi platform bisa disebut teruji. Lima pertanyaan (Q1 presisi deteksi, Q2 api terlewat, Q3 membesar 72 jam, Q4 luas, Q5 padam) dengan metrik dan ambang lolos yang DIBEKUKAN di `PRAREGISTRASI` (satu-satunya sumber; halaman membacanya dari API). Mengubah ambang = ganti `versi` dan umumkan.

- **Medan baru** ada di tabel samping `uji_isian` (1:1 dengan `tugas_isian`, CASCADE). Dikirim sebagai objek `uji` di badan konfirmasi/kabar/cekulang: `tutupan`, `metode_luas`, `n_titik_jalur` (3-150; jalur GPS TIDAK disimpan: klien menghitung luas dari jalur dan hanya mengirim luas_ha + metode_luas keliling_gps + jumlah titik, server menolak kunci jalur_gps; minimisasi data UU PDP), `arah_jalar_deg`, `tepi_aktif`, `tinggi_nyala`, `angin_lokal`, `dugaan_penyebab`, `bekas_terbakar_baru`. Gambut teramati memakai `lahan_teramati` yang sudah ada. Tanpa `uji` = perilaku lama; dengan `uji` dan luas terisi, tutupan + metode_luas wajib. Migrasi belum jalan dan kiriman membawa `uji` = 503 (tidak dibuang diam-diam).
- **Sampel kontrol**: cron menit 20 tiap jam (`jalankanUji`, tanpa jadwal baru) memilih sampai 5 kandidat per provinsi per minggu ISO (benih `<minggu>|<prov>`, hash deterministik) dari `public/data/uji_kandidat.json` (disiapkan pipeline; belum ada) dan butir `tugas_kompleks.json` yang bukan tugas otomatis. Kandidat: level 0-1 atau firespot "mungkin", teramati <= 24 jam, `akses.kaki_km` <= 3, bukan dalam 2 km tugas terbuka. Dicatat di `uji_sampel` (n_kandidat, n_dipilih; bobot = kebalikan peluang). Tugasnya berlabel "Sampel uji (bukan api prioritas)"; tak dikunjungi 3 hari = dibuang dan dihitung.
- **Strata tugas otomatis** dicatat sekali di `uji_tugas` saat tugas dibuat (level, firespot, luas platform, `p_lolos` bila pipeline mengirimnya).
- **Q2** dinilai cron dari `lapangan` (menyala/bara, tak curiga, tak ditahan) terhadap `tugas_lapangan` dan `titik_terbaru` (-3 .. +24 jam, 2 km); hasil di `uji_terlewat`.
- **GET /api/uji-lapangan** dan halaman `/uji-lapangan`: admin ATAU pemirsa di SEMUA host. Urutan izin, laju 20/menit per IP, cache 60 dtk (private). Agregat saja (tanpa nama, WA, atau koordinat); sel rincian dengan n < 5 ditahan (null + `ditahan:true`, halaman menulis "<5"), headline tidak berubah. Sampel kontrol tidak dihitung sebagai api terkonfirmasi di draf Laporan Karhutla. Uji: `tests/warga/uji_lapangan.test.mjs`.

## Uji lapangan banjir (src/uji_banjir.js, migrations/0064_push_banjir.sql dan 0065_uji_banjir.sql)

- `POST /api/instansi/uji-banjir` (akun instansi aktif, header `x-pb: 1`, 60/jam per akun) menyimpan sampel `genangan` atau `kontrol`; status peta dibaca server dari `status.json`. `GET /api/instansi/uji-banjir/kec` memberi daftar kecamatan wilayah akun. `GET /api/uji-lapangan/banjir` agregat untuk admin atau pemirsa: bila satu sel per status < 5, semua sel per status ditahan.
- `foto_id` opsional harus foto non-dummy yang diunggah dari IP yang sama (`foto.ip_hash`) dalam 30 menit terakhir. BATAS: tabel `foto` tidak mencatat akun instansi, jadi pengikatan ke akun yang sama tidak mungkin tanpa migrasi; yang diikat hanya perangkat/IP dan waktu.
- Formulir mengunggah foto hanya bila kotak "Foto dan lokasinya boleh tayang publik" dicentang; koordinat foto dibulatkan 4 desimal. Unggahan tanpa token Turnstile ditolak bila produksi mewajibkannya.
- Retensi: baris `uji_banjir` lebih tua dari 12 bulan dihapus cron bersih-bersih (menit 17, `bersihkanUjiBanjir`).
- Push banjir naik: `push_banjir` menyimpan level terakhir per akun dan kabupaten; putaran pertama sebuah akun hanya mencatat garis dasar.
