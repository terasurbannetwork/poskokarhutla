# RENCANA-UJI: Lapor tanpa sinyal

Aturan rumah: perilaku yang tinggal di luar TypeScript (rute, D1, SW, IndexedDB) wajib punya uji yang benar-benar menjalankannya; mock saja tidak cukup. Semua uji jalan tanpa jaringan luar dan tanpa kunci API. Perintah bukti di kolom kanan.

## 1. Uji murni (`tests/lapor/luring_murni.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Spek luring: empat isian wajib; kosong ditolak dengan daftar yang kurang; kosong tidak jadi nol | `node --test tests/lapor` |
| `bentukLuring`: jenis tak dikenal, waktu di luar daftar, korban di luar daftar, ringkasan 501 huruf, koordinat di luar Indonesia ditolak | idem |
| Waktu: `waktu_klien` melewati terima plus 5 menit ditolak; lebih tua 14 hari ditolak; koreksi selisih jam dihitung benar; selisih lebih dari 10 menit memberi tanda | idem |
| Foto: tanpa Make/Model ditolak; selisih waktu EXIF lawan `waktu_klien` lebih dari 7 menit ditolak; jarak GPS lawan EXIF di atas 5 km ditolak; foto sah memberi lencana `gps_luring` | idem |
| Ringkasan bebas tidak menghasilkan angka isian; semua angka tetap kosong | idem |
| Pita darurat hanya untuk "sedang berlangsung" dan selisih 2 jam (batas 2 jam dan 2 jam 1 detik) | idem |
| Spek bersama dimuat identik di klien dan Worker (hash isi `luring_spek.js` dibandingkan) | idem |

## 2. Uji antrean tanpa jaringan (`tests/inti/antre_lapor_luring.test.mjs`, pola `tests/inti/antre.test.mjs`)

Memakai penyimpan memori dan `fetch` yang melempar `TypeError` lalu pulih.

| Kriteria | Bukti |
| --- | --- |
| Simpan saat fetch gagal: butir `menunggu`, tidak hilang; urutan foto lalu laporan | `node --test tests/inti` |
| Fetch pulih: terkirim sekali; butir dan blob dihapus | idem |
| Server menjawab 200 tetapi koneksi putus sebelum diterima: kirim ulang menghasilkan satu laporan (idempoten) | idem |
| 401 menahan butir; 403 nomor tak cocok menahan butir berlabel "perlu masuk" | idem |
| 4xx menandai `ditolak` dan tidak mengirim ulang otomatis; butir foto yang ditolak tidak menahan laporan | idem |
| Butir lebih dari 14 hari dibuang oleh `bersihkan` termasuk yang ditolak | idem |
| Data berisi `token`, `kode`, atau `authorization` ditolak saat `masukkan` | idem |
| Kunci pertama `data` adalah `label` dan tidak memuat lokasi atau nomor (gerbang pita) | idem |

## 3. Uji rute dengan D1 lokal (`tests/lapor/luring_rute.test.mjs`, pola `tests/lapor/rute.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Tanpa identitas: 401 sebelum badan dibaca; badan lebih dari 16 KB ditolak | `node --test tests/lapor` |
| Butir sah menerbitkan sesi terkirim versi 1, tiket, antre PDF, dan baris `lapor_luring` | idem |
| Kirim ulang `klien_id` sama: 200, nomor sama, satu baris sesi | idem |
| Kuota: lewat batas 429 dan butir tetap bisa dikirim ulang nanti | idem |
| Laporan di meja bertanda "Dikirim dari luring" dengan dua waktu | idem |
| Pita darurat tidak menyala untuk butir terlambat (Q3) | idem |
| Foto luring: R2 tersimpan tanpa EXIF, `lapor_foto_luring` terisi; nomor foto tidak dikenal diabaikan | idem |
| Hapus data pelapor ikut menghapus baris luring | idem |

## 4. Uji peramban sungguhan (`tests/lapor/luring_peramban.test.mjs`, Playwright, server tinjau lokal)

Memakai `context.setOffline(true)`, kamera palsu bawaan Playwright, dan geolokasi buatan. Inilah bukti bahwa SW, IndexedDB, dan kirim ulang benar-benar berjalan.

| Kriteria | Bukti |
| --- | --- |
| Setelah Siapkan, memuat ulang `/lapor/` dalam mode luring tetap menampilkan cangkang dan nomor penting | `node --test tests/lapor/luring_peramban.test.mjs` |
| Formulir luring disimpan dengan jenis, lokasi, waktu, korban, dan satu foto; pita menyebut "Belum terkirim: 1" | idem |
| Menutup dan membuka ulang halaman dalam mode luring: butir masih ada | idem |
| `setOffline(false)`: butir terkirim, pita hilang, tiket tampil; satu laporan di D1 | idem |
| Warga belum Siap tidak melihat formulir luring tetapi melihat 112 dan ajakan Siapkan | idem |
| Penyimpanan penuh (kuota dikecilkan lewat DevTools protocol) menampilkan pesan dan tidak menyimpan setengah | idem |

## 5. Gerbang (`tests/agen/gerbang-lapor-luring.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| `public/sw-lapor.js` ada, hanya menangani GET, tidak menyimpan POST dan tidak menyimpan `/api/lapor/*` selain nomor penting | `npm run uji:agen` |
| Hanya `public/inti/antre.js` yang memanggil `indexedDB.open` di `public/lapor/**` dan `sw-lapor.js` | idem |
| Daftar rute `/api/lapor/luring*` ada di Worker dan di `scripts/lapor/lokal.mjs` | idem |
| Tidak ada literal warna baru di `luring.css`; tidak ada huruf kapital semua; tidak ada kata "aman" di teks luring | idem |
| Cangkang SW memuat semua berkas yang dimuat `index.html` (daftar dibandingkan) | idem |
| Daftar rujukan `AGENTS.md` memuat bagian paket ini dan tiap berkas baru punya satu pemilik | `npm run uji:agen` |

## 6. Uji perangkat nyata (manual, lembar centang di folder ini, ditutup pemilik)

Tidak dapat digantikan emulator, khususnya karena fakta platform yang belum terverifikasi (RISET 2).

| Perangkat | Langkah | Kriteria |
| --- | --- | --- |
| Android Chrome | Siapkan; mode pesawat; lapor dengan foto kamera; matikan mode pesawat dengan halaman terbuka; ulangi dengan halaman ditutup lalu dibuka | Terkirim dalam satu menit setelah halaman terbuka dan sinyal ada |
| iOS Safari (tab) | Idem | Tidak bergantung pada Background Sync; terkirim saat halaman dibuka |
| iOS layar utama | Siapkan, pasang ke layar utama, simpan butir, biarkan 8 hari tanpa dibuka, buka | Dicatat: butir ada atau tidak (menjawab 7 hari Safari) |
| Dua perangkat sama, GPS dalam mode pesawat | Buka di tempat terbuka lalu dalam gedung | Dicatat waktu dan akurasi titik pertama (menjawab RISET 2 GPS) |
| HP penyimpanan hampir penuh | Simpan foto | Pesan jelas, tidak ada simpan setengah |

## 7. Tinjau (AGENTS 3.8)

Tiap tiket layar ditutup dengan tautan `http://localhost:8800/lapor/` dan pemilik meninjau lewat pita "Tanpa sinyal" (peramban: DevTools Offline).
