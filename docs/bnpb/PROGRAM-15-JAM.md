# Program 15 jam: dari sistem jadi ke api padam di lapangan (22 Okt 2026)

## Diagnosis

Sistemnya sudah lengkap di kode (insiden, Kartu Api, tugas, push, SLA, rute, verifikasi padam),
tapi produksi belum memakainya. Per 22 Okt 2026 pukul 19.00 WIB, D1 produksi `poskowarga`:

| Ukuran | Nilai |
|---|---|
| Migrasi terakhir yang diterapkan | 0035 (0036 sampai 0048 belum) |
| Akun instansi | 0 |
| Tugas api | 0 |
| Isian lapangan, media | 0, 0 |

Uji kering: skema produksi diekspor (`wrangler d1 export --no-data`), lalu 0036 sampai 0048 dijalankan
berurutan di salinannya. Ketigabelasnya lolos. Tidak ada penghalang teknis.

Kesimpulan: yang paling memperlambat api padam sekarang bukan model atau fitur. Daerah belum
menerima apa pun dari sistem ini. Tiap jam kerja diarahkan ke tiga hal, urut dampak:

1. **Sampai ke daerah tanpa menunggu adopsi akun**: kabar api harus bisa diteruskan hari ini juga.
2. **Aktivasi semurah mungkin bagi pemilik**: satu perintah, sudah diuji, dengan jalan mundur.
3. **Akurasi yang menentukan regu tiba lebih cepat**: rute dan sumber air untuk semua insiden prioritas.

## Blok kerja

| Blok | Jam | Isi | Bukti selesai |
|---|---|---|---|
| A | 1,5 | **Paket aktivasi.** Skrip `scripts/bnpb/aktivasi.sh`: ekspor skema produksi, uji kering migrasi tertunda di salinan, cetak perintah terapan dan cek setelahnya. Satu halaman `AKTIVASI.md` urut: migrasi, secret, domain email. | Skrip jalan hijau di skema produksi hari ini |
| B | 3 | **Kabar api tanpa login.** Halaman publik per kabupaten (pola `/presiden`: tanpa login, data dari JSON pipeline) berisi insiden level 3 dan 2 bersyarat, Kartu Api ringkas, teks WA siap teruskan, tautan arah ke titik masuk. Pusdalops cukup meneruskan satu tautan ke grup WA BPBD. | Halaman tampil untuk 3 kabupaten dengan api aktif; teks WA cocok dengan Kartu Api di `/instansi` |
| C | 2 | **Daftar undangan akun.** Kabupaten rawan diurutkan dari riwayat titik dan insiden musim ini; berkas CSV impor akun (sandi acak dibuat saat impor, tidak disimpan di repo) dan teks undangan WA per akun. Impor ke produksi dilakukan pemilik. | CSV lolos validasi skema `instansi_akun` di salinan D1 |
| D | 3 | **Rute dan air untuk semua insiden prioritas** (Fase 3.1, 3.2): graf jalan dan kanal diperluas dari 183 kompleks ke semua insiden level 3 dan 2 bersyarat tiap putaran; embung dan sungai kecil OSM masuk sumber air. | Cakupan rute dilaporkan di `_meta`; uji balik waktu tempuh tidak memburuk |
| E | 2 | **Latensi terukur.** Per putaran: waktu satelit lewat, data terbit, insiden terbentuk, kabar terkirim. Tampil di dashboard kinerja sebagai median dan p90, supaya klaim "lebih cepat" ada angkanya. | Angka muncul dari data produksi, bukan contoh |
| F | 2 | **Simulasi satu siklus insiden ujung ke ujung** di D1 lokal: akun, tugas, konfirmasi foto GPS, kabar, padam, verifikasi. Semua langkah berjalan tanpa campur tangan manual. | Satu uji integrasi baru hijau di `npm run uji:warga` |
| G | 1,5 | **Ulasan dan laporan.** Pemeriksa konteks bersih per permukaan (AGENTS.md §6), perbaikan oleh pengerja pemilik, laporan ke pemilik. | Semua gerbang hijau; terbit sukses; aset tayang dicek di centurisk97.id |

## Yang hanya bisa dilakukan pemilik

Tidak berubah dari `RENCANA-LANJUT.md` §3. Yang paling menentukan adalah butir 1, migrasi 0036 sampai 0048:
tanpa itu blok C, E, dan F tidak hidup di produksi. Blok B tetap jalan tanpa migrasi.

## Yang tidak dikerjakan

- Model risiko atau ramalan baru. Ramalan "akan membesar" tetap disembunyikan sampai gerbang prospektif lolos.
- Kiriman WA otomatis. Tetap lewat tautan wa.me (keputusan 21 Okt).
- Penerapan migrasi, pembuatan akun, atau deploy ke produksi oleh agent.
