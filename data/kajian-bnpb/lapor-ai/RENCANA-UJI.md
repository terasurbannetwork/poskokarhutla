# RENCANA-UJI: Lapor Bencana BNPB

Semua uji jalan tanpa jaringan dan tanpa kunci API kecuali disebut. Perintah bukti di akhir tiap baris.

## 1. Uji mesin murni (`tests/lapor/mesin.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Identitas: nomor baru ditanya peran, nama, (BPBD) kab dan jabatan; cerita pertama tertunda dan dipakai sesudahnya | `node --test tests/lapor` |
| Pilihan BPBD sendiri = `bpbd_klaim`; `bpbd` hanya dari `lapor_izin` | idem |
| Angka tanpa kutipan di pesan dibuang; "dua belas" dikenali 12 | idem |
| Kosong tidak pernah jadi 0; "tidak ada" = nihil satu kelompok; dua kali tak dijawab = belum didata | idem |
| Urutan isian: wajib awal dulu, lalu kelompok menurut spek; isian sistem tidak pernah ditanya | idem |
| `kirim` sebelum wajib lengkap ditolak dengan daftar kurang | idem |
| Transisi tiket: semua pasangan di A8 sah, lainnya ditolak | idem |
| Keluaran model palsu yang menyebut isian tak dikenal, angka di luar rentang, atau pertanyaan berangka karangan ditolak | idem |

## 2. Uji percakapan emas (`tests/lapor/emas/*.json`)

Paling sedikit 12 skenario dari kalimat laporan nyata di laphar (`04-landasan-formulir/isian.json`, contoh tulisan saja), satu per jenis di `src/lapor_spek.js` (10 jenis) ditambah subjenis banjir bandang dan banjir rob ditambah pelapor yang menjawab "belum tahu" terus dan pelapor yang mengoreksi angka. Tiap skenario memuat pesan berurutan, keluaran model rekaman (tanpa jaringan), dan isian akhir yang diharapkan. Bukti: `node --test tests/lapor`.

Satu set yang sama dijalankan dengan model sungguhan sebelum F0 dibuka (`LAPOR_UJI_NYATA=1`, butuh kunci): isian akhir cocok paling sedikit 95 persen isian, nol angka karangan.

## 3. Uji rute dengan D1 lokal (`tests/lapor/rute.test.mjs`, pola `tests/warga`)

| Kriteria | Bukti |
| --- | --- |
| Migrasi 0155 idempoten (jalan dua kali) | `npm run uji:warga` |
| Pesan dari nomor tanpa izin pada F0 ditolak; sesi orang lain 404 | idem |
| Kirim laporan menulis versi, nomor, tiket, riwayat, antrean PDF dalam satu batch | idem |
| Foto WA tanpa lokasi = lencana `tanpa`; dengan lokasi WA 20 menit sebelumnya = `wa`; Dokumen dengan EXIF 6 km jauhnya = tolak | idem |
| Rute foto lama `src/foto.js` tetap lulus uji lamanya sesudah `periksaFotoLokasi` dipisah | idem |
| Monitoring tanpa sesi staf 403, jawaban `private, no-store` | idem |
| Batas laju per nomor bekerja | idem |

## 4. Uji lapangan F0 (pengguna uji pertama)

Dicatat per laporan di monitoring; ditinjau pemilik sesudah 2 minggu atau 10 laporan:

- waktu dari pesan pertama sampai terkirim (target median 5 menit);
- jumlah balasan pelapor sampai terkirim (target paling banyak 8 untuk laporan awal);
- persen lengkap saat terkirim;
- isian yang dikoreksi pemilik sesudah dibaca (target nol angka karangan);
- foto dengan lencana GPS perangkat, EXIF, atau lokasi WA lawan tanpa lokasi;
- PDF jadi dan terkirim (target semua, paling lama 2 menit sesudah terkirim).

## 5. Layar

- `inp-reviewer`: kirim pesan, ganti tab Peta/Daftar/Foto, filter, buka rincian tidak membekukan layar.
- `selera-angka`: format angka Indonesia di ringkasan, PDF, dan monitoring.
- `gerbang-token-warna`, `gerbang-kartu-std`, `gerbang-tanpa-kesimpulan`: halaman `public/lapor/**` masuk daftarnya.
- Tinjau pemilik di `http://localhost:8800/lapor`, `/lapor/meja`, dan PDF satu laporan; layar 360 px dan 1440 px.
