# Ilmu ruang-bnpb

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/ruang-bnpb.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca ruang-bnpb`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus ruang-bnpb "..."`.

## Peta berkas & tabel

Ruang Koordinasi BNPB lahir 19 Okt 2026 dari permintaan pemilik (staf ahli BNPB). Rencana dan
alasan per sistem: `docs/bnpb/RENCANA-12-JAM.md`. Kontrak teknis bersama: `docs/bnpb/ARSITEKTUR.md`.

| Berkas | Isi |
| --- | --- |
| `public/bnpb/bnpb.css` | gaya bersama halaman publik; `@import` admin.css (token, header, tabel, pil) + kelas `bn-*` (kartu, formulir, pil, alur status) |
| `public/bnpb/<halaman>.{html,js,css}` | satu halaman = tiga berkas; dilayani worker lewat `halamanBnpbPublik` (`src/bnpb.js`) dengan CSP ketat |
| `scripts/bnpb/*.py` | pipeline Python 3.12 stdlib (indeks risiko kecamatan, perkiraan kebutuhan musim) → `public/data/bnpb/*.json` |
| `public/data/bnpb/*.json` | keluaran pipeline yang dibaca layar |

Sumber yang dibaca (bukan milik agent ini): `public/data/inarisk.json` (indeks bahaya karhutla InaRISK per kompleks),
`public/data/bpbd.json` (kantor BPBD + nomor Pusdalops), `public/data/bnpb.json` (rekap harian BNPB per provinsi),
`public/geo/kecamatan/<prov>.json`, `public/geo/kabupaten/<prov>.json`, data modul bencana di `public/data`, `public/banjir/data`,
`public/gempa`, `public/gunungapi`, `public/kekeringan`.

Rute worker yang menyuapi layar (milik `warga-api`): `src/relawan.js`, `src/alun.js`, `src/riset.js`, `src/meja.js`.
Tabel D1: `laju_bnpb` (0022), lalu 0023 relawan, 0024 alun-alun, 0025 riset, 0026 meja kerja.

## Aturan & invarian

- Halaman publik TANPA skrip/gaya inline dan tanpa atribut `on*=`: CSP `script-src 'self'; style-src 'self'`. Semua teks dari data lewat
  `textContent` atau `esc()`; tidak pernah `innerHTML` dengan string mentah dari API.
- Data pribadi relawan (WA, email, kontak darurat) tidak pernah dirender di halaman publik. Halaman berkode (`/relawan/saya`, kampus,
  mitra, meja) membaca lewat header `x-kode` dari fragmen `#k=`, lalu menghapus fragmen dari bilah alamat.
- Indeks komposit buatan sendiri diberi pil "belum diuji balik" sampai ada uji balik terhadap kejadian nyata (DIBI). Angka InaRISK disebut sumbernya.
- Pintu `/bnpb` tidak dimasukkan ke nav utama situs (keputusan pemilik 19 Okt 2026).
- Gaya pemilik A1–A25 (memori `aturan-berulang`): data + label saja, pil berikon, kartu Insight, tabel standar, sapaan "kamu", tanpa em dash, angka format Indonesia.
- Klik tidak membekukan layar: daftar panjang dirender bertahap; chrome tombol bereaksi seketika.

## Ranjau yang pernah meledak

- Commit "gas" pemilik menyapu working tree dan push ke produksi beberapa kali per jam: berkas setengah jadi bisa tayang. Selesaikan satu
  halaman sampai bisa dipakai sebelum membuka berkas berikutnya; jangan tinggalkan tautan ke halaman yang belum ada.
- Berkas statis baru menambah aturan `_headers` lewat `scripts/terbit/versi.py`; batas Cloudflare 100 aturan. Lebih dari belasan berkas baru: cek hitungannya.
- Migrasi D1 produksi diterapkan manual; rute membalas 503 saat tabel belum ada. Layar harus menampilkan keadaan itu dengan rapi, bukan layar kosong.

## Gerbang yang menghakimi

- `npm run uji:warga` (rute dan D1 yang menyuapi layar), `npm run uji:agen` (pemilik berkas, katalog segar).
- Self-check `assert` di tiap `scripts/bnpb/*.py` (`python3 scripts/bnpb/<x>.py --cek`).
- Pemeriksaan layar di peramban 1440 dan 390, konsol tanpa galat; pengulas `selera-angka` dan `inp-reviewer`.

## Kasus
- 2026-10-19 · Halaman /bnpb dilayani dengan CSP script-src 'self' dan tanpa vendor lokal: MapLibre dari cdnjs akan diblokir, jadi peta koroplet digambar sebagai SVG sendiri (path per kecamatan, kelas CSS k0-k3). Gaya lewat atribut style di markup juga diblokir; setProperty lewat JS dan elemen meter boleh. Uji dengan server node yang menambahkan header CSP dari src/bnpb.js lalu Chrome headless lewat CDP: konsol harus kosong selain favicon.
- 2026-10-19 · Data lokal repo bisa tertinggal dari produksi (fwi.json dan hotspot.json commit 12-13 Okt, hari kerja 19 Okt). risiko.py membuang sumber harian lebih tua dari 7 hari (null) dan mencatat umur_hari per sumber di JSON; jangan baca 'tanpa titik panas' sebagai nol bila berkasnya basi. Fasilitas (sekolah.json, fasilitas.json) hanya mencakup 9 provinsi prioritas, jadi tidak boleh masuk skor nasional.
- 2026-10-19 · 2026-10-19 · Sitrep tidak menghitung ulang: tiap bencana punya laporan.json v1 (karhutla format lama: prov[].level, tanpa metrik; gunungapi dari gunungapi_status.json). Tingkat respons dibaca dari level karhutla, sorot tertinggi (banjir, cuaca, kekeringan), level gunung; gempa dan udara tanpa tingkat karena tangga registry berbeda. Pintu /bnpb membaca ringkasan risiko dari 200 KB awal berkas 900 KB (stream), cukup pindah ke berkas ringkas kecil bila pipeline menyediakan. Headless Chrome minimal 500 px: uji 390 pakai Emulation.setDeviceMetricsOverride (cdp.mjs).
- 2026-10-19 · 2026-10-19 · kebutuhan.py: kluster.json memuat 12.683 kluster median 2 titik (banyak noise), jadi titik per kompleks dan koefisien regu diambil dari kompleks operasi.json (4.696) saja; provinsi dengan < 5 kompleks di sana (Riau, Aceh, Papua, dst) diberi null, bukan dikarang. Penduduk terdampak asap dibatasi kecamatan berkompleks lv >= 2: tanpa itu masker (Rp15rb x 2 per orang) menguasai 80% total karena Jawa punya jutaan penduduk di kecamatan berklaster 1 titik. Uji cetak A4 Gakkum: Chrome CDP Emulation.setEmulatedMedia print + Page.printToPDF; body harus putih saat print (latar halaman admin ikut tercetak abu-abu bila tidak).
- 2026-10-20 · 2026-10-20 · Uji balik indeks risiko (ujibalik_risiko.py): kejadian nyata di repo hanya DIBI per KABUPATEN (kejadian.json kejadian_dibi, 3 tahun) dan gempa USGS, bukan per kecamatan; skor kabupaten = kecamatan tertinggi, lalu bendera Tinggi+ menjangkau ~90% kabupaten dan presence DIBI jenuh (base rate 0,9), jadi vonis memakai seperempat teratas dan sasaran seperempat kabupaten terbanyak laporan. Hasil: gempa mengalahkan baseline penduduk (POD 0,42 vs 0,10), banjir/longsor KALAH (0,46 vs 0,59: bias pelaporan DIBI ikut penduduk); hit rate naik monoton per kelas. Indeks harian tak punya riwayat: uji prospektif lewat arsip potret di risiko_ujibalik.json, angka baru muncul setelah 30 potret berjendela tertutup. Kapasitas dinamis hanya menaikkan (kab tak ada di agregat tidak dihukum). /api/meja/ringkas publik hanya per provinsi, tak dipakai di skor.
- 2026-10-20 · 2026-10-20 · Uji balik: skor bahaya InaRISK banjir jenuh (440 dari 515 kabupaten bernilai 100), jadi top-N dengan pemecah seri kode wilayah memberi POD artefak. Seri kini dipecah hash berbenih (bukan abjad), sasaran DIBI mengambil semua yang seri di ambang, dan pembanding yang separuh lebih benderanya ditentukan seri tidak ditampilkan. Vonis per kelompok wajib mengalahkan penduduk, bahaya saja, dan riwayat paruh A: gempa menang dari penduduk (POD 0,43 vs 0,10) tetapi kalah dari bahaya saja (0,52); banjir kalah dari penduduk (0,45 vs 0,57). Kapasitas dinamis butuh siap>=10 dan jam30>0; prioritas.py memakai kap_statis. Tes batas tie-break: assert pilihan bukan 100 kode abjad pertama.
- 2026-10-20 · Layar admin yang butuh fungsi dari halaman publik: halamanBnpb hanya memuat bersama.js + <k>.js, jadi muat berkas bersama (public/bnpb/ringkas_bencana.js, window.RingkasBencana) lewat script dinamis dari <k>.js; CSP admin script-src self mengizinkan. Dummy modul saling bertabrakan: dummy alun-alun (rantai Teruskan) menulis meja_catatan dummy=1 sehingga dummy meja 409 bila dijalankan sesudahnya; urutan isi di pimpinan.js: relawan, meja, alun, riset. fetch 404 ke endpoint yang belum ada selalu tercatat di konsol (tak bisa disenyapkan).
- 2026-10-21 · Layar kebakaran (kebakaran.html) dilayani sebagai aset statis /bnpb/kebakaran.html, bukan rute worker; geo kelurahan dari pipeline berisi cincin genap-ganjil, gambar satu path per kelurahan dengan fill-rule evenodd. Uji CDP: klik dialog.close() memicu event close asinkron yang memanggil tandai(-1); jangan baca kelas pilih sebelum event itu lewat.
- 2026-10-22 · Manifest Gakkum: hash dihitung atas JSON kanonik (kunci terurut, tanpa spasi) dan berkas unduhan memuat byte yang SAMA; waktu cetak dan akun pencetak sengaja di luar hash agar bukti sama menghasilkan hash sama. sha256 media hanya dari API (diisi saat unggah); jangan hitung dari gambar yang diunduh ulang. Uji: mock fetch /api/ops/bukti di peramban dan bandingkan hash layar dengan createHash Node atas byte Blob unduhan.
- 2026-10-22 · 2026-10-22 Menambah bencana ke R.BENCANA: letakkan di AKHIR (ujibalik_risiko.potret menyimpan digit per BENCANA berurutan di arsip; potret lama 6 digit tetap valid) dan beri toleransi kolom h_<b> yang hilang di berkas risiko_kecamatan.json lama (prioritas.lengkapi, potret), sebab berkas terbitan tertinggal dari kode sampai workflow jalan. Kategori PM2,5 Sedang bukan bahaya (=0), kalau tidak udara jadi bahaya utama di 1467 kecamatan. Kekeringan di pemicu harian prioritas harus menaikkan skor/kelas yang tampil ke skor harian, kalau tidak kelas < Tinggi lolos. Kebutuhan musim non-karhutla data-limited: posko_kekeringan hanya deteksi hari ini (Sphere 15 L), banjir Perka 7/2008 hanya di RISET-PARAMETER.md tanpa proyeksi jiwa musiman.
- 2026-10-22 · 2026-10-22 max(dict, key=get) atas set membuat 'utama' tak deterministik saat nilai diskret seri (PYTHONHASHSEED mengubah hipotesis 47-48): selalu urutkan lewat R.utama_dari dan uji dengan itertools.permutations.
- 2026-10-22 · hukum.py: (1) filter kepala/kaki berulang menormalkan angka jadi '#', sehingga 'Pasal #' di tiap halaman ikut terbuang dan semua Pasal hilang; kecualikan baris Pasal/BAB/Bagian. (2) pdftotext tanpa -layout menaruh teks Menimbang SESUDAH label Mengingat; pisahkan menurut isi ('bahwa' = menimbang), bukan posisi. (3) nomor halaman menempel di baris pertama ('-2Pasal 1', '-6(2)'). (4) verba mencabut/mengganti/mengubah hanya dibaca di segmen menimbang/menetapkan/pasal dan untuk sasaran sederajat, kalau tidak judul 'Perubahan atas' dari peraturan yang dikutip jadi relasi palsu. Uji: python3 scripts/bnpb/hukum.py --cek
- 2026-10-22 · hukum.py: pdftotext TANPA -layout membuang penanda ayat '(1)','(2)' (kolom terpisah) dari teks pasal; pakai -layout lalu rapatkan spasi per baris. Label 'Menimbang : a. bahwa' kini satu baris dengan isi, jadi buang label lalu pisah menimbang/mengingat menurut isi. teks --paksa memakai ulang OCR lama (field 'o' per halaman) agar tidak mengulang tesseract. Invarian --cek: >=90% pasal PERBAN/PERKA bersitasi 'ayat (2)' memuat (1)/(2) di awal baris; sisa ~7% adalah pasal yang hanya MENGUTIP ayat pasal lain.
- 2026-10-23 · hukum.py: penanda ayat hilang di halaman OCR karena tesseract psm 3 memindah '(1)' margin kiri jadi blok sendiri; pakai --psm 4 (ocr dicache dengan field psm). Sumber cadangan wajib divalidasi isinya: BPK menyimpan Peraturan Basarnas 8/2018 dengan slug 'peraturan-bnpb-no-8-tahun-2018' (nomor+tahun cocok, instansi bukan BNPB) dan file perka-19-2011 berbunyi NOMOR 19 TAHUN 2010. Validasi = instansi di 8 halaman pertama + nomor/tahun halaman 1 tak boleh bertentangan. juknis-7-2023 dan juknis-9-2023 berlabel 'Petunjuk Pelaksanaan' di sumbernya; id tidak diubah.
- 2026-10-26 · 2026-10-26 pendataan.js: h() menolak false/null tapi Element.append/replaceChildren menelanjang 'false'/'undefined' jadi teks; jangan pakai 'kondisi && node' di append langsung, spread ke larik. 401 dari GET /api/pendataan/saya saat belum masuk tercatat Chrome sebagai log jaringan (kontrak, tak bisa disenyapkan), disaring di uji. Uji tutup-dengan-perubahan memunculkan dialog konfirmasi kedua: klik tombol utama dialog terakhir.
- 2026-10-29 · 2026-10-29 Panen #28-34 (R=HxV/C): IRBI per jenis di data/kajian-bnpb/data/irbi BERUBAH tiap tahun dan sudah memuat V dan C (ia indeks risiko), jadi BUKAN H dan tidak boleh jadi fitur H; H dipakai dari raster InaRISK (bahaya.json, inarisk_gempa.json, +cuplik karhutla/cuaca). Kapasitas C terbuka hanya raster layer_peta_kapasitas (konstan per kab, 310/200/4 kelas vs resmi 315/190/3), nilai IKD resmi tak terbit. DIBI korban jiwa per kejadian: 14% baris y>0, top-10 baris = 67% jiwa latih (Palu 2018 gempa 4194 sendirian = 48%), alpha NB ~10; M2(H+V+C) vs M1(H) selisih skor-log -0,0027 CI [-0,0071; 0,0009] = GAGAL, koef H dan V malah negatif (bias pelaporan DIBI ikut penduduk). Uji: python3 scripts/bnpb/risiko_hvc.py --cek (termasuk uji sintetik: penjaga harus LOLOS pada sinyal nyata dan GAGAL pada derau). Host yankes.kemkes.go.id tak resolve dan djpk.kemenkeu.go.id TLS timeout dari lingkungan kerja: jangan tulis pengurai HTML tebakan.
