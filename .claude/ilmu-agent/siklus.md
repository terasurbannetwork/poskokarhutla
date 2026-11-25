# Ilmu siklus

> Kelas: pengerja, Model: sonnet, Definisi: `.claude/agents/siklus.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca siklus`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus siklus "..."`.

## Peta berkas & tabel

Program Siklus Bencana lahir 10 Nov 2026. Dokumen rancangan urut otoritas ada di
`data/kajian-bnpb/siklus/`, dimulai `KEPUTUSAN-AWAL.md`. Kode tiket `SK-NNN`.

| Berkas | Isi |
| --- | --- |
| `scripts/siklus/sumber.json` | registri sumber data publik: lisensi, jadwal, fitur, status uji |
| `scripts/siklus/**` | pipeline Python 3.12 stdlib, self-check `uji` |
| `public/siklus/**` | layar vanilla JS tanpa build step |
| `tests/siklus/**` | uji `npm run uji:siklus` |

Bukan milikku: `src/siklus*.js`, migrasi `sk_*` (warga-api); `.github/workflows/siklus.yml` (mekanik-mesin).

## Aturan & invarian

- Pakai ulang `scripts/bnpb/kunci_kejadian.py` (kunci jenis, kabupaten, tanggal), `scripts/umum/kejadian.py`, `scripts/bnpb/rekonsiliasi_dalops_dibi.py`, `scripts/umum/bangunan.py`, `scripts/umum/paparan_bangunan.py`, `src/bangunan.js`, `src/rumah_rusak.js`, `src/pemulihan.js`, `src/meja.js`. Tidak membuat tabel rumah rusak kedua, kunci wilayah kedua, atau pipeline bangunan kedua.
- Paparan bangunan rinci hanya di R2 awalan `bangunan/` atau `siklus/`, dibaca setelah sesi; tidak pernah di `public/`.
- Angka antarsumber (DIBI, Logbook Pusdalops, sistem kita) tampil berdampingan dengan selisih tertulis. Tidak dijumlah atau dirata-rata.
- Tiap angka punya label keyakinan: resmi, terverifikasi, estimasi-model, asumsi-kebijakan, hipotesis, menunggu. Tidak ada data ditulis tidak ada, bukan nol.
- Titik panas, firespot, luas, belum padam, dan terdampak karhutla hanya dari sistem kita, tidak dari Koordalops walau ditempel pemilik.
- Tanpa registri pengungsi per orang (dicoret pemilik 19 Okt) dan tanpa NIK.
- Merek Centurisk97; BNPB dan BPBD ditulis sebagai kita. Tanpa titik tengah dan em dash di teks tampil.

## Ranjau yang pernah meledak

- 28 Okt: kueri pindai D1 di cron menghabiskan kuota baca 5 juta per hari dan menjatuhkan situs. Program ini tidak menambah kueri pindai di cron; agregat dibaca dari R2.
- Batas 20.000 berkas aset per versi Worker di paket Free, sekarang sekitar 12.100. Program ini paling banyak menambah 200 berkas di `public/`.
- Berkas turunan besar yang di-commit membuat `.git` 5,7 GB. Keluaran besar ke R2.
- Berkas `* 2.*` salinan nyasar sinkronisasi; jangan dipakai.
- Checkout dipakai banyak sesi; commit dengan path spesifik.

## Gerbang yang menghakimi

- `tests/agen/gerbang-paket-modul.test.mjs`: paket dokumen lengkap.
- `tests/agen/gerbang-peta-data.test.mjs`: data baru wajib punya pemakai dan jadwal.
- `tests/agen/gerbang-kartu-std.test.mjs`: kartu laporan standar.
- `npm run uji:siklus`: pipeline dan layar; `npm run uji:warga`: rute dan migrasi.

## Kasus
- 2026-11-10 · Migrasi 0119 sudah dipakai meja_dampak (belum ter-commit): nomor sk_* diambil saat tiket, paling cepat 0120. Cookie akun instansi berpath /api/instansi, jadi BP lewat /api/instansi/siklus/* (pola LogPal). Enum yang bisa tumbuh jangan di-CHECK (pelajaran meja_catatan). Tulis D1 riwayat 57 ribu baris melampaui jatah tulis harian 100 ribu: arsip di R2, D1 hanya kejadian hidup.
- 2026-11-10 · Tinjauan 1 diterapkan 10 Nov: ID KJ- = 8 Crockford base32 dari SHA-256 kunci pendiri (tabrakan: hash kunci|n), tanpa pecah, SQL sk_* wajib fungsi di src/hak.js (gerbang-d1), pipeline Bearer PIPA_TOKEN, grup siklus-kaji dan siklus-batch, tiket 111 berurut topologis; skrip cek ketergantungan ditulis sekali jalan di scratchpad
- 2026-11-10 · python3 di mesin ini 3.9.6: skrip tanpa sintaks 3.10 ke atas. python3 -I tidak menaruh folder skrip di sys.path, muat sesama skrip lewat importlib. Manifest dan anggaran adalah berkas pengelola: gudang.rencana melewatinya dan menulisnya paling akhir. DT 5.2.8 menulis maks_byte 4294967296 tetapi ALG G0.3 menetapkan 4.000.000.000; kode memakai ALG. Heredoc shell mengubah escape unicode jadi karakter asli: periksa U+00B7 dengan grep -F.
- 2026-11-10 · SK-010: id_kab_bps DIBI valid tetapi tak di daftar hvc_dasar (Kutai Timur 6404, 753 baris) -> bps4 gagal; bersih_dibi memakai cadangan nama+provinsi. Karhutla: terdampak (DIBI) dan ha (logbook) dinullkan di bersih menurut KA 6, bukan disimpan. dibi_harian belum punya entri sumber.json (adapter lokal, tidak lewat panen CLI).
- 2026-11-10 · kab4 = Kemendagri (kota.json), id_kab_bps DIBI = BPS beda di 164 kab: petakan lewat nama+provinsi, fungsi kunci.kab4 menolak angka 4 digit kecuali kemendagri=True. ID riwayat dijaga lewat pemetaan (sumber,kode)->KJ di data/raw/siklus/pemetaan (di luar siklus/ agar tak diunggah). Irisan DIBI/Logbook 59,8/60,4 (2013-2021, 2023-2026).
- 2026-11-10 · SK-026..039: skrip klasik inti (esc, fmt, PilihCantik) adalah const global, bukan properti window: modul memakainya dengan nama telanjang dan tidak boleh mendeklarasikan ulang. CSP halaman Siklus melarang style inline dan skrip CDN: DOM lewat h() tanpa markup mentah, MapLibre dari /vendor lewat inti/maplibre.js, warna peta dari token via canvas. innerText mengikuti text-transform, jadi uji teks memakai /i. Uji layar: tests/siklus/_layar.mjs (server statis + API palsu + Chrome CDP); run pertama Chrome dingin bisa 60 detik.
- 2026-11-10 · CLI massal bahaya_kelas/fasilitas 'semua' melewati provinsi tanpa data/terkunci/bangunan/halus_<prov>.json (gitignored, tak ada di runner CI) dengan catatan, bukan nol: job bulanan harus menyediakan grid dulu (R2 bangunan/) atau akan mencetak kab 0.
- 2026-11-11 · Modul layar tak boleh memanggil h() di tingkat modul: uji Node mengimpor pulih.js tanpa DOM (buat elemen lazy). petaLimaSektor server mengisi 0 untuk sektor kosong: layar dan unduhan memakai penanda.kosong supaya tampil menunggu, bukan Rp0. Ikon inti.js terbatas (rumah, uang, unduh, info tidak ada, jatuh ke lain).
- 2026-11-11 · Layar F5-F7: server renkon menimpa seluruh kolom asumsi (coalesce), jadi isian satu aspek dikirim bersama aspek lain (gabungAsumsi). .append(x ? y : null) mencetak kata null: pakai ...(x ? [y] : []) atau h(). Tes selektor tabel pertama: first-of-type tidak membatasi, pakai querySelector('.ex-tabel').querySelectorAll. innerText mengikuti text-transform huruf kapital judul wadah: regex /i. fmt hanya 1 desimal, muka laut ditampilkan dalam cm.
- 2026-11-11 · Program Siklus G1-G4 tutup 11 Nov 2026. Pelajaran: (1) checkout bersama: pull --autostash sesi lain menyapu suntingan belum di-commit dua kali; commit tiap potongan begitu uji hijau, jangan menahan pohon kerja; (2) terbit di grup concurrency data dibuang saat pending bila pipeline masuk antre; terbit_antre kini memicu ulang; (3) kode kab BPS lawan Kemendagri merusak pemasangan (46,5% -> 60%); kab4 selalu Kemendagri; (4) uji bergantung tanggal (fixture gempa 720 jam) dan id hex acak (0812) memblokir push; (5) unggah R2 produksi dan migrasi produksi dijalankan pemilik, siapkan perintah satu baris.
- 2026-11-15 · KP-10: PbAntre menaruh klien_id di badan dan butir lama pindah lewat pindahDari(petakan); jp_id disimpan di data butir dan dibuang saat kirim per Jitupasna (pengirim). Kegagalan Chrome layar_* lain adalah innerText memecah baris, bukan antrean.
- 2026-11-15 · TW-08/LF-08: IODA tidak lewat Worker (uji lifeline.test melarang); layar membaca /data/internet_padam.json langsung, periodenya setahun dan tak bertaut kejadian, jadi dilabel konteks. Judul kartu yang diuji Chrome: pakai innerText per baris, bukan satu kalimat.
- 2026-11-15 · KS-01: riwayat DIBI harian (data/raw/bnpb/dibi_harian) TIDAK punya kolom rumah_terendam; sumber kebenaran terendam hanya dibi_peristiwa.json (jabodetabek2020, seroja2021) dan public/dibi_kejadian.json (setahun bergulir, jadi pasangan dibekukan ke kriteria). Hash JS vs Python beda untuk float (-17 vs -17.0): sidik dihitung atas byte berkas, bukan re-serialisasi.
- 2026-11-15 · KS-02: python3 mesin 3.9, tanpa numpy/GDAL: naif HAND (fitur_banjir.raster_kab) tak bisa jalan di sini, fungsi naif_hand mengembalikan menunggu, bukan nol. Pasangan dengan sesudah di luar 0-6 hari (mis. indeks 205 Kota Pekalongan 2026-01-17, adegan terdekat +8) dikeluarkan mekanis; halus_<prov>.json hanya ada untuk 13,33,63 secara lokal, provinsi lain butuh bangunan.py dulu. Unduh S1 satu pasangan 6-9 MB.
- 2026-11-15 · KS-02 v2: classifier izin menolak agent menulis ulang berkas kunci kriteria walau pemilik setuju lewat koordinator; sesi induk yang menjalankan skrip pembangun. Pipeline v2 asap (--asap-tanpa-jangkar, hanya kalibrasi, sidik tetap dicek). Level 0 10 m: 36-118 MB per pasangan, 25-130 dtk; hasil v2 untuk 209/212/218 tetap kecil dan tidak jelas melebihi plasebo (212: 8 lawan 76).
- 2026-11-24 · 2026-11-24 SK-113: logbook_kejadian.csv tanpa nama desa; nama desa hanya di data/raw/logbook/arsip/*/baris.csv (lokal). Kejadian multi-desa tidak diberi titik; 34% kejadian cocok_desa. saji.py uji gagal (hardcode 38 sumber, registri sudah 47) dan layar_kejadian selisih innerText gagal sebelum perubahan ini.
- 2026-11-24 · GS-02: metadata GFM nasional (142 ribu item, 85.928 lintasan ber-ensemble di 102 ubin) ditarik STAC 4 thread butuh 68 menit, bukan menit; cache per bulan di data/raw/banjir/gfm_nasional/layak. Layak metadata 9.666 dari 10.009 kab-hari DIBI (kalibrasi 5.906, uji 3.760) hampir semuanya, jadi layak bukan sah: cakupan >=10 persen baru dari raster, riwayat 10 sah dari 21. Dengan jendela 6 hari syarat pra < tanggal DIBI otomatis terpenuhi (pra <= lintasan-8).
- 2026-11-24 · 2026-11-24 GS-06: bangunan.py tidak punya fungsi indeks sel halus; kisinya inline floor((lat-LAT0)*HALUS), floor((lon-LON0)*HALUS) (juga di genangan_nasional.hitung_bangunan), jadi _sel_halus di paparan.py meniru itu. zona_gfm membaca zona_bawah dari genangan_kriteria.json; zona sel tak diberi kunci GHSL sehingga hitung_kab sudah menulis ghsl None. Golden zona poligon direkam SEBELUM edit di tests/siklus/fixtures/paparan_golden_poligon.json.
- 2026-11-24 · SK-114: import src/inarisk.js langsung di uji gagal (siklik dengan worker.js, RUTE_INARISK belum terinisialisasi): import worker.js dulu. Uji Chrome layar kaji/kejadian/masadepan dan registri skrip gagal sebelum kerja ini (bukan dari paparan.js).
- 2026-11-24 · 2026-11-24 LJ-14: pasang.py belum punya mekanisme 'usulan fase' sama sekali (hanya tambah/baru/ambigu); usulan dibuat sebagai fungsi murni usulan_fase_tutup. Sumber yang tak boleh mendirikan kejadian (lapor_ai) masuk TAUTAN_SAJA: lewati tanpa keputusan, jangan kirim aksi baru/ambigu/tanpa_wilayah (enum rute). gerbang_cakupan gagal sebelum kerja ini (genangan_kriteria/kerusakan/titik_desa .py belum di cakupan.json).
- 2026-11-24 · 2026-11-24 GS-07: banjir_gfm di kaji_banjir.py (rentang WorldPop dari zona gfm_bawah/atas, jiwa_kab_sah hanya kab sah ber-angka, kab_dikeluarkan tercatat), perakit genangan_kaji.py menulis ke data/raw/siklus/kaji/siklus/saji/... (akar saji lokal). kaji_gempa.periksa menolak model banjir_gfm dan hasil_r2 berversi, jadi periksa_gfm terpisah di kaji_banjir.py; GS-08 harus menyamakan sisi Worker. Aceh (prov 11) tanpa halus_11: paparan_kab melempar OSError -> penduduk 'data bangunan belum tersedia', rentang ringkas null (muatan tak dikirim). sel geojson Aceh Tamiang 110 m >300 KB, digabung 330 m jadi 158 KB. Golden banjir_jam1 di tests/siklus/fixtures/banjir_jam1_golden.json direkam sebelum edit. saji.py uji sudah gagal sebelumnya (hardcode 38 sumber).
- 2026-11-24 · 2026-11-24 GS-11: gerbang-kartu-std memindai SEMUA fungsi bernama kartu*( dengan >=4 argumen sebagai 'sumber' (kartuCitra(a,b,c,d) gagal): beri nama lain atau <=3 argumen. 'Sumber: ' di teks juga kena. Teks data pipeline (catatan) memuat kata terlarang 'terdampak' sebagai negasi: jangan ditampilkan apa adanya, tulis kalimat sendiri. Headless Chrome tanpa WebGL melempar pengecualian dari new maplibregl.Map: bungkus try/catch. Isi <details> tertutup tidak masuk innerText, pakai textContent di uji. Kelas lahan 0,03 persen jangan dibulatkan ke 0 (fmtPersenKelas). Uji Chrome paralel antar berkas bisa macet: jalankan sendiri.
- 2026-11-25 · 2026-11-25 · GS-03: sel_geojson dulu berhenti di 330 m; Aceh Utara (1108) 387 KB di 330 m. Kini bertingkat 110/330/550/1100, di atas batas pada 1100 m ada 'catatan' di berkas + MASALAH di rakit. Ubah aturan sel harus menaikkan SEL_TINGKAT (masuk sidik_masukan), kalau tidak rakit menjawab 'lintasan tak berubah' dan berkas tidak ditulis ulang. macOS sed -i butuh '' ; zsh tidak memecah $K, pakai array.
