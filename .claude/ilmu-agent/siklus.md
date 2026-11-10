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
